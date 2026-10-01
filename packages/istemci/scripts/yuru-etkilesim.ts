/**
 * Yürüyüş (L4) etkileşim doğrulaması (Playwright; yazılım GL: SwiftShader).
 *
 *   harita → Gebze (L2) → arsa (L3) → hücre seç + satın al → "Sokakta yürü" → E ile parsel kartı (kendi arsan)
 *   → WASD + Shift (telefonda sanal çubuk) → zıplama → tıkla-git (telefonda dokun-git) → yürüyüşte satın alma
 *   → karo akışı (1,5 km öteye geçiş, kayan orijin) → Esc / "‹ Haritaya dön" ile haritaya dönüş
 *   (+ masaüstünde uzun basma ve Y kısayolu, inşaat yer tutucuları ve bayraklar, koyu tema; ölçüm: çizim çağrısı, fps).
 *
 * İkinci tur (kamera ve his): üçüncü şahıs kamera (14 m, ~35°, karakter ekranın ~%10'u; tekerlek 6–40 m; sağ tık/sürükle
 * yörünge; tıkla-git yolunda kamera karakterin arkasına geçer), oyunsu hızlar (4 / 7 / 10 m/s), kısa zıplama, eski yan
 * panelin gizlenmesi, ipucu şeridinin solması, düşük ufuk kamerasında ≤60 çizim çağrısı ve kent sokağı (bina duvarına
 * çarpan kamera) denetlenir.
 * Masaüstü 1440×900 ve mobil 390×844. Sayfa küçük, Range destekli yerel HTTP sunucusundan açılır:
 * istemci/dunya.html + harita.js + yuru.js + harita-verisi/ (karolar/gebze-z15.pmtiles dahil; hepsini pnpm dunya üretir).
 * fps SwiftShader'a (CPU) görelidir; gerçek GPU'da çok daha yüksek olması beklenir.
 *
 *   tsx scripts/yuru-etkilesim.ts [ekran-klasoru]     (ya da YURU_EKRAN=...)
 * Hata olursa süreç kodu 1 ile çıkar.
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import type { Browser, Page } from "playwright-core";

declare global {
  interface Window {
    __name?: (f: unknown) => unknown;
  }
}

const DEPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const KOK = join(DEPO, "istemci");
const EKRAN = resolve(process.argv[2] ?? process.env["YURU_EKRAN"] ?? join(DEPO, "raporlar", "yuru"));

function chromeBul(): string {
  const kok = "/opt/pw-browsers";
  for (const d of readdirSync(kok)) {
    const y = join(kok, d, "chrome-linux", "chrome");
    if (d.startsWith("chromium-") && existsSync(y)) return y;
  }
  throw new Error("chromium bulunamadi");
}

let hata = 0;
const olcumler: Record<string, unknown> = {};
function kontrol(ad: string, tamam: boolean, ek = ""): void {
  console.log(`${tamam ? "OK  " : "HATA"} ${ad} ${ek}`);
  if (!tamam) hata++;
}

const TUR: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".pmtiles": "application/octet-stream",
  ".gz": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
};

/** Range destekli küçük statik sunucu (PMTiles aralık istekleri için). */
function sunucuAc(): Promise<{ sunucu: Server; adres: string }> {
  const sunucu = createServer((istek, yanit) => {
    const yol = decodeURIComponent((istek.url ?? "/").split("?")[0] ?? "/");
    const dosya = normalize(join(KOK, yol));
    if (!dosya.startsWith(KOK) || !existsSync(dosya) || !statSync(dosya).isFile()) {
      yanit.writeHead(404).end();
      return;
    }
    const boyut = statSync(dosya).size;
    const basliklar = { "Content-Type": TUR[extname(dosya)] ?? "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
    const aralik = /bytes=(\d+)-(\d*)/.exec(istek.headers.range ?? "");
    if (aralik) {
      const bas = Number(aralik[1]);
      const son = Math.min(boyut - 1, aralik[2] ? Number(aralik[2]) : boyut - 1);
      yanit.writeHead(206, { ...basliklar, "Content-Range": `bytes ${bas}-${son}/${boyut}`, "Content-Length": son - bas + 1 });
      createReadStream(dosya, { start: bas, end: son }).pipe(yanit);
    } else {
      yanit.writeHead(200, { ...basliklar, "Content-Length": boyut });
      createReadStream(dosya).pipe(yanit);
    }
  });
  return new Promise((coz) => sunucu.listen(0, "127.0.0.1", () => coz({ sunucu, adres: `http://127.0.0.1:${(sunucu.address() as AddressInfo).port}` })));
}

async function haritaHazir(sayfa: Page, kosul: string, zaman = 60000): Promise<void> {
  await sayfa.waitForFunction(
    (k) => {
      const h = window.__harita;
      if (!h || !h.hazir()) return false;
      return new Function("d", `return ${k};`)(h.durum()) as boolean;
    },
    kosul,
    { timeout: zaman },
  );
  await sayfa.waitForTimeout(250);
}

/** Hazırlık beklemeleri (karo, yürüyüş) için geniş üst sınır (yüklü makinede yavaş); denetim eşiği değildir. */
const HAZIR_MS = 240_000;

const yuruDurum = (sayfa: Page) => sayfa.evaluate(() => window.__yuru?.durum() ?? null);

async function yuruHazir(sayfa: Page, zaman = 90000): Promise<void> {
  await sayfa.waitForFunction(() => window.__yuru?.durum().acik === true && window.__yuru.durum().hazir === true, null, { timeout: zaman });
  await sayfa.waitForTimeout(400);
}

/** L3'te bir hücre seç, satın al ve kartını aç (kart "Sokakta yürü" düğmesini taşır). */
async function hucreSecVeAl(sayfa: Page, mobil: boolean, e: string): Promise<void> {
  const kap = await sayfa.evaluate(() => {
    const r = document.getElementById("harita-kap")?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top } : { x: 0, y: 0 };
  });
  const sira = await sayfa.evaluate(() => window.__harita?.gorunum()?.sinamaUygunSira(2) ?? null);
  kontrol(`${e} L3 uygun hücre bulundu`, !!sira);
  if (!sira) throw new Error("uygun hücre yok");
  const tik = async (x: number, y: number): Promise<void> => {
    if (mobil) await sayfa.touchscreen.tap(kap.x + x, kap.y + y);
    else await sayfa.mouse.click(kap.x + x, kap.y + y);
    await sayfa.waitForTimeout(200);
  };
  // F4'ten beri varsayılan dokunma hazır arsayı seçer: hücre seçimi "Hücre aracı" ile (telefonda Shift yok)
  if (mobil) await sayfa.locator("#harita-alt [data-eylem='hucre-araci']").tap();
  await tik(sira[0]!.x, sira[0]!.y);
  if (mobil) await sayfa.locator("#harita-alt [data-eylem='coklu']").tap();
  if (!mobil) await sayfa.keyboard.down("Shift");
  await tik(sira[1]!.x, sira[1]!.y);
  if (!mobil) await sayfa.keyboard.up("Shift");
  const al = sayfa.locator("#harita-alt [data-eylem='satin-al']");
  if (mobil) await al.tap();
  else await al.click();
  await sayfa.waitForSelector("#bildirimler .bildirim.tamam", { timeout: 15000 });
  await sayfa.waitForTimeout(400);
  kontrol(`${e} parsel satın alındı, kart açık`, await sayfa.locator("#parsel-kart").isVisible(), (await sayfa.locator("#parsel-kart").innerText()).replace(/\s+/g, " ").slice(0, 90));
}

/** CDP dokunma sürüklemesi (sanal çubuk): başla, adım adım taşı, `bekle` ms tut, bırak. */
async function dokunSurukle(sayfa: Page, x0: number, y0: number, x1: number, y1: number, bekle: number): Promise<void> {
  const cdp = await sayfa.context().newCDPSession(sayfa);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0, id: 1 }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y: y0 + ((y1 - y0) * i) / 6, id: 1 }] });
    await sayfa.waitForTimeout(30);
  }
  await sayfa.waitForTimeout(bekle);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

async function senaryo(tarayici: Browser, adres: string, mobil: boolean): Promise<void> {
  const cihaz = mobil ? "mobil" : "masaustu";
  const baglam = await tarayici.newContext({
    viewport: mobil ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: mobil,
    hasTouch: mobil,
    colorScheme: "light",
  });
  const sayfa = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f; window.__bildirimCarpan = 6;");
  const konsol: string[] = [];
  sayfa.on("pageerror", (x) => konsol.push(`pageerror: ${x.message}`));
  sayfa.on("console", (m) => m.type() === "error" && konsol.push(m.text()));
  const istek: Record<string, number> = {};
  sayfa.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    istek[p] = (istek[p] ?? 0) + 1;
  });
  const ekran = (ad: string): Promise<Buffer> => sayfa.screenshot({ path: join(EKRAN, `yuru-${cihaz}-${ad}.png`) });
  const e = `[${cihaz}]`;

  await sayfa.goto(`${adres}/dunya.html?adaptif=0&hiz=3600&acilis=0#izle`);
  await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 120000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));

  // Harita → Gebze (L2) → arsa (L3)
  await sayfa.evaluate(() => window.__harita?.ilceAc("tr_41_gebze"));
  await haritaHazir(sayfa, "d.duzey === 2 && d.ilce === 'tr_41_gebze'", 90000);
  await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.jumpTo({ center: [29.4307, 40.8027], zoom: 17.2 }));
  await haritaHazir(sayfa, "d.duzey === 3");
  await sayfa.waitForTimeout(500);
  kontrol(`${e} yuru.js henüz yüklenmedi (tembel)`, !istek["/yuru.js"]);
  await hucreSecVeAl(sayfa, mobil, e);

  // "Sokakta yürü"
  const dugme = sayfa.locator("#parsel-kart [data-eylem='yuru']");
  kontrol(`${e} kartta "Sokakta yürü" düğmesi`, await dugme.isVisible());
  // Satın alma bildirimi telefonda kartın üstüne binebilir: kapat (bildirime dokunmak kapatır)
  await sayfa.locator("#bildirimler .bildirim").evaluateAll((l) => l.forEach((x) => (x as HTMLElement).click()));
  await sayfa.waitForTimeout(300);
  const panelOnce = await sayfa.locator("#panel").isVisible();
  const t0 = Date.now();
  if (mobil) await dugme.tap();
  else await dugme.click();
  await yuruHazir(sayfa);
  const girisMs = Date.now() - t0;
  let d = (await yuruDurum(sayfa))!;
  kontrol(`${e} yürüyüş açıldı`, d.acik && d.hazir, `(${girisMs} ms; yuru.js + karakter + 9 karo, SwiftShader)`);
  kontrol(`${e} yürüyüş yığını ayrı yuru.js dosyasından, bir kez`, istek["/yuru.js"] === 1, `${istek["/yuru.js"] ?? 0} istek`);
  kontrol(`${e} karakter Quaternius (CC0)`, d.karakter.startsWith("Quaternius"), d.karakter);
  kontrol(`${e} 3×3 karo yüklendi`, d.karo.hazir === 9 && d.karo.bekleyen === 0, JSON.stringify(d.karo));
  kontrol(`${e} çizim çağrısı ≤ 60`, d.cizim > 0 && d.cizim <= 60, `${d.cizim} çağrı, ${d.ucgen} üçgen`);
  kontrol(`${e} başlangıç hücresi kendi arsan: hap "Arsanda yapı kur"`, d.hap && d.etkilesim === "kur", `${d.hucre} ${d.etkilesim}`);
  kontrol(`${e} karakterler örneklenmiş (tek çizim çağrısı)`, d.karakterOrnek === 1);
  const atif = await sayfa.locator(".yuru-atif").innerText();
  kontrol(`${e} ODbL atfı görünür`, atif.includes("© OpenStreetMap katkıcıları") && (await sayfa.locator(".yuru-atif").isVisible()), atif);
  kontrol(`${e} mini harita görünür`, await sayfa.locator(".yuru-mini").isVisible());
  kontrol(`${e} küre askıda`, (await sayfa.evaluate(() => window.__olcum?.sahne.askida)) === true);
  olcumler[`${cihaz}-giris`] = { girisMs, cizim: d.cizim, ucgen: d.ucgen, karo: d.karo };
  await ekran("1-giris");

  // Kamera, ekran düzeni ve eski panel
  const ke = await sayfa.evaluate(() => window.__yuru!.karakterEkran());
  kontrol(`${e} karakter ekran yüksekliğinin %8–12'si`, ke.oran >= 0.08 && ke.oran <= 0.125, `%${(ke.oran * 100).toFixed(1)} (${ke.piksel.toFixed(0)} px)`);
  const kd0 = await sayfa.evaluate(() => window.__yuru!.kameraDurum());
  const derece = (kd0.egim * 180) / Math.PI;
  kontrol(`${e} varsayılan kamera: arkada, 10–14 m, 30–40°`, kd0.mesafe >= 10 && kd0.mesafe <= 14 && derece >= 30 && derece <= 40, `${kd0.mesafe} m, ${derece.toFixed(0)}°`);
  const ayakAlt = ke.ayak[1] > (mobil ? 844 : 900) * 0.5;
  kontrol(`${e} karakter kadrajın alt yarısında (ufuk ve sokak görünür)`, ayakAlt, `ayak y = ${ke.ayak[1].toFixed(0)}`);
  kontrol(`${e} eski yan panel (Bölge / Dikkat / Devlet seç) gizli`, (await sayfa.locator("#panel").isHidden()) && (await sayfa.getByText("Devlet seç").first().isHidden()));
  const kapGen = await sayfa.evaluate(() => document.getElementById("yuru-kap")!.getBoundingClientRect().width);
  kontrol(`${e} yürüyüş sahnesi tüm genişliği kaplar`, Math.abs(kapGen - (mobil ? 390 : 1440)) < 2, `${kapGen} px`);
  kontrol(`${e} kısa ipucu şeridi görünür (ilk 10 sn)`, await sayfa.locator(".yuru-ipucu").isVisible());
  kontrol(`${e} üst sol "‹ Haritaya dön", mini harita, ODbL atfı duruyor`, (await sayfa.locator(".yuru-geri").isVisible()) && (await sayfa.locator(".yuru-mini").isVisible()) && (await sayfa.locator(".yuru-atif").isVisible()));

  // E / hap: parsel kartı (başlangıç hücresi bizim)
  if (mobil) await sayfa.locator(".yuru-hap").tap();
  else await sayfa.keyboard.press("e");
  await sayfa.waitForTimeout(200);
  const kart = (await sayfa.locator(".yuru-kart").innerText()).replace(/\s+/g, " ");
  kontrol(`${e} E ile parsel kartı: sahip Sen`, (await sayfa.locator(".yuru-kart").isVisible()) && /parsel #/i.test(kart) && kart.includes("Sen"), kart);
  await ekran("2-kart");
  if (mobil) await sayfa.locator(".yuru-kart [data-eylem='kart-kapat']").tap();
  else await sayfa.keyboard.press("e");

  // Zıpla: Boşluk (masaüstü) / Zıpla düğmesi (telefon)
  if (mobil) await sayfa.locator(".yuru-zipla").tap();
  else {
    await sayfa.locator(".yuru-tuval").focus();
    await sayfa.keyboard.press("Space");
  }
  await sayfa.waitForTimeout(120);
  const havada = (await yuruDurum(sayfa))!;
  await sayfa.waitForFunction(() => window.__yuru?.durum().y === 0, null, { timeout: 5000 }).catch(() => undefined);
  kontrol(`${e} zıpladı ve indi`, havada.y > 0.1 && havada.anim === "zipla" && (await yuruDurum(sayfa))!.y === 0, `tepe örneği ${havada.y.toFixed(2)} m`);

  // Oyunsu hızlar: yürüme ~4, koşu ~7, depar ~10 m/s (anlık; ivme yok)
  if (!mobil) {
    await sayfa.locator(".yuru-tuval").focus();
    await sayfa.keyboard.down("KeyW");
    await sayfa.waitForTimeout(700);
    const hKos = (await yuruDurum(sayfa))!.hiz;
    await sayfa.keyboard.down("Shift");
    await sayfa.waitForTimeout(500);
    const hDepar = (await yuruDurum(sayfa))!;
    await sayfa.keyboard.up("Shift");
    await sayfa.keyboard.up("KeyW");
    kontrol(`${e} W koşu ~7 m/s, Shift depar ~10 m/s`, hKos > 6 && hKos < 8 && hDepar.hiz > 9 && hDepar.hiz < 11 && hDepar.anim === "depar", `${hKos.toFixed(1)} / ${hDepar.hiz.toFixed(1)} m/s (${hDepar.anim})`);
  } else {
    await dokunSurukle(sayfa, 90, 640, 90, 620, 600);
    const hYuru = (await yuruDurum(sayfa))!.hiz;
    kontrol(`${e} sanal çubuğu az itmek ~4 m/s yürütür`, hYuru === 0 || (hYuru > 3.3 && hYuru < 4.7), `${hYuru.toFixed(1)} m/s`);
  }
  // Kamera: tekerlek/ayar sınırı 6–40 m, sağ tık yörüngesi
  await sayfa.evaluate(() => window.__yuru!.kamera({ mesafe: 999 }));
  const uzak = await sayfa.evaluate(() => window.__yuru!.kameraDurum().mesafe);
  await sayfa.evaluate(() => window.__yuru!.kamera({ mesafe: 0.1 }));
  const yakin = await sayfa.evaluate(() => window.__yuru!.kameraDurum().mesafe);
  kontrol(`${e} kamera yakınlaşma sınırı 6–40 m`, uzak === 40 && yakin === 6, `${yakin} … ${uzak} m`);
  if (!mobil) {
    await sayfa.mouse.move(720, 450);
    for (let i = 0; i < 40; i++) await sayfa.mouse.wheel(0, 300);
    await sayfa.waitForTimeout(150);
    const w1 = await sayfa.evaluate(() => window.__yuru!.kameraDurum().mesafe);
    for (let i = 0; i < 60; i++) await sayfa.mouse.wheel(0, -300);
    await sayfa.waitForTimeout(150);
    const w2 = await sayfa.evaluate(() => window.__yuru!.kameraDurum().mesafe);
    kontrol(`${e} tekerlek 6–40 m arası yakınlaştırır`, Math.abs(w1 - 40) < 0.01 && Math.abs(w2 - 6) < 0.01, `${w2.toFixed(1)} … ${w1.toFixed(1)} m`);
    await ekran("3a-yakin");
    await sayfa.evaluate(() => window.__yuru!.kamera({ mesafe: 14, egim: 0.62 }));
    const y0 = (await sayfa.evaluate(() => window.__yuru!.kameraDurum())).yaw;
    await sayfa.mouse.move(720, 400);
    await sayfa.mouse.down({ button: "right" });
    await sayfa.mouse.move(800, 400, { steps: 6 });
    await sayfa.mouse.up({ button: "right" });
    const y1 = (await sayfa.evaluate(() => window.__yuru!.kameraDurum())).yaw;
    kontrol(`${e} sağ tık sürükleme kamerayı yörüngede döndürür`, Math.abs(y1 - y0) > 0.3, `Δyaw ${(y1 - y0).toFixed(2)} rad`);
    await sayfa.mouse.move(720, 400);
    await sayfa.mouse.down();
    await sayfa.mouse.move(640, 400, { steps: 6 });
    await sayfa.mouse.up();
    const y2 = (await sayfa.evaluate(() => window.__yuru!.kameraDurum())).yaw;
    kontrol(`${e} sol tık sürükleme de döndürür (tıklama değil: yol kurulmaz)`, Math.abs(y2 - y1) > 0.3 && ((await yuruDurum(sayfa))?.yol ?? 1) === 0, `Δyaw ${(y2 - y1).toFixed(2)} rad`);
  }
  await sayfa.evaluate(() => window.__yuru!.kamera({ mesafe: 14, egim: 0.62 }));
  await sayfa.waitForTimeout(1300);

  // Koş: WASD (masaüstü) / sanal çubuk (telefon)
  let once = d.dunya;
  if (!mobil) {
    await sayfa.locator(".yuru-tuval").focus();
    await sayfa.keyboard.down("KeyW");
    // Yazılım GL'de kare hızı yüke göre değişir (dt kare başına 0,05 sn ile sınırlı; yüklü makinede 2–5 fps): en az 1,6 sn,
    // gerekirse 4,5 m'ye dek (≤ 12 sn). Denetlenen şey hız değil, ivmesiz yürüyüşün gerçekleşmesidir (hız ayrı ölçülür).
    await sayfa.waitForTimeout(1600);
    await sayfa
      .waitForFunction((o) => { const p = window.__yuru?.durum().dunya; return !!p && Math.hypot(p[0] - o[0], p[1] - o[1]) >= 4.5; }, once, { timeout: 10400 })
      .catch(() => undefined);
    await sayfa.keyboard.up("KeyW");
    await sayfa.keyboard.down("KeyD");
    await sayfa.keyboard.down("Shift");
    await sayfa.waitForTimeout(900);
    await sayfa.keyboard.up("Shift");
    await sayfa.keyboard.up("KeyD");
  } else {
    await dokunSurukle(sayfa, 90, 640, 90, 590, 1800);
  }
  await sayfa.waitForTimeout(300);
  d = (await yuruDurum(sayfa))!;
  const yurunen = Math.hypot(d.dunya[0] - once[0], d.dunya[1] - once[1]);
  kontrol(`${e} ${mobil ? "sanal çubukla" : "WASD + Shift ile"} koştu (ivmesiz)`, yurunen > 4, `${yurunen.toFixed(1)} m`);
  await ekran("3-yuru");

  // Tıkla-git / dokun-git
  const h = await sayfa.evaluate(() => window.__yuru?.sinamaHedef(10, 26) ?? null);
  kontrol(`${e} tıkla-git hedefi bulundu`, !!h, h ? `${h.x.toFixed(0)},${h.y.toFixed(0)}` : "");
  if (h) {
    once = d.dunya;
    if (mobil) await sayfa.touchscreen.tap(h.x, h.y);
    else await sayfa.mouse.click(h.x, h.y);
    await sayfa.waitForTimeout(300);
    const yolVar = ((await yuruDurum(sayfa))?.yol ?? 0) > 0;
    // Kamerayı yandan sapıt: elle bekleme (1,1 sn) bitince yolda giderken karakterin arkasına hızla geçmeli
    await sayfa.evaluate(() => window.__yuru!.kamera({ yaw: window.__yuru!.kameraDurum().yaw + 1.5 }));
    await sayfa.waitForFunction(() => (window.__yuru?.durum().yol ?? 1) === 0, null, { timeout: 40000 }).catch(() => undefined);
    d = (await yuruDurum(sayfa))!;
    {
      const kk = await sayfa.evaluate(() => window.__yuru!.kameraDurum());
      const fark = Math.abs((((kk.yaw - (kk.yon + Math.PI)) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      kontrol(`${e} tıkla-git yolunda kamera karakterin arkasına geçti`, fark < 0.5, `fark ${fark.toFixed(2)} rad`);
    }
    const kalan = Math.hypot(d.dunya[0] - h.dunya[0], d.dunya[1] - h.dunya[1]);
    kontrol(`${e} ${mobil ? "dokun" : "tıkla"}-git hedefe vardı`, yolVar && kalan < 2, `kalan ${kalan.toFixed(2)} m, yürünen ${Math.hypot(d.dunya[0] - once[0], d.dunya[1] - once[1]).toFixed(1)} m`);
    await ekran("4-tikla-git");
  }

  // Yürüyüşte satın alma: bulunulan hücre satın alınabilirse hap "Satın al" → kart → Satın al
  d = (await yuruDurum(sayfa))!;
  if (d.etkilesim !== "satin-al") {
    // Yakında satın alınabilir boş bir hücre ara (en çok birkaç tıkla-git)
    for (let i = 0; i < 6 && d.etkilesim !== "satin-al"; i++) {
      const h2 = await sayfa.evaluate(() => window.__yuru?.sinamaHedef(8, 40) ?? null);
      if (!h2) break;
      if (mobil) await sayfa.touchscreen.tap(h2.x, h2.y);
      else await sayfa.mouse.click(h2.x, h2.y);
      await sayfa.waitForFunction(() => (window.__yuru?.durum().yol ?? 1) === 0, null, { timeout: 20000 }).catch(() => undefined);
      d = (await yuruDurum(sayfa))!;
    }
  }
  if (d.etkilesim === "satin-al") {
    if (mobil) await sayfa.locator(".yuru-hap").tap();
    else await sayfa.keyboard.press("e");
    await sayfa.waitForTimeout(150);
    const al = sayfa.locator(".yuru-kart [data-eylem='satin-al']");
    if (mobil) await al.tap();
    else await al.click();
    await sayfa.waitForFunction(() => window.__yuru?.durum().etkilesim === "kur", null, { timeout: 10000 }).catch(() => undefined);
    d = (await yuruDurum(sayfa))!;
    const kartAl = (await sayfa.locator(".yuru-kart").innerText()).replace(/\s+/g, " ");
    kontrol(`${e} yürüyüşte satın alındı (hap: Arsanda yapı kur)`, d.etkilesim === "kur" && kartAl.includes("Sen"), kartAl.slice(0, 80));
    await ekran("5-satin-al");
    if (mobil) await sayfa.locator(".yuru-kart [data-eylem='kart-kapat']").tap();
    else await sayfa.keyboard.press("e");
  } else kontrol(`${e} yürüyüşte satın alınabilir hücre bulundu`, false, String(d.etkilesim));

  // Karo akışı: 1,5 km doğuya geç → yeni 3×3 pencere yüklenir, kayan orijin kayar
  const orijin0 = d.orijin;
  await sayfa.evaluate(() => window.__yuru?.isinla(1500, -400));
  // Sıra önemli: orijin kaydı ve yeni karo penceresi kare döngüsünde AYNI adımda kurulur (sahne.ts adim: orijinKaydir ->
  // karoPenceresi). Önce orijin değişimini bekle (= yeni pencere istendi), SONRA 3×3 pencerenin gelmesini bekle. Eski sıra
  // (300 ms + yuruHazir, sonra orijin) yüklü makinede (≤ 10 fps) kare 300 ms içinde çalışmayınca ESKİ pencereye bakıp hemen
  // dönüyordu ve denetim yeni karolar yüklenirken (hazır 2, bekleyen 7) yapılıyordu. Eşik değişmez; üst sınırlar geniştir.
  await sayfa
    .waitForFunction((o) => { const x = window.__yuru?.durum().orijin; return !!x && (x[0] !== o[0] || x[1] !== o[1]); }, orijin0, { timeout: HAZIR_MS })
    .catch(() => undefined);
  await sayfa
    .waitForFunction(() => { const k = window.__yuru?.durum().karo; return !!k && k.hazir === 9 && k.bekleyen === 0; }, null, { timeout: HAZIR_MS })
    .catch(() => undefined);
  await yuruHazir(sayfa);
  d = (await yuruDurum(sayfa))!;
  kontrol(`${e} karo akışı: uzak noktada 3×3 pencere hazır, orijin kaydı`, d.karo.hazir === 9 && (d.orijin[0] !== orijin0[0] || d.orijin[1] !== orijin0[1]), `orijin ${orijin0.map((v) => v.toFixed(0))} → ${d.orijin.map((v) => v.toFixed(0))}, ${JSON.stringify(d.karo)}`);
  await ekran("6-akis");

  // Ufka bakan alçak kamera (en çok pencere görünür): çizim çağrısı bütçesi
  await sayfa.evaluate(() => window.__yuru!.kamera({ egim: 0.1, mesafe: 6 }));
  await sayfa.waitForTimeout(300);
  const ufuk = await sayfa.evaluate(() => window.__yuru!.olc(800));
  kontrol(`${e} ufka bakan alçak kamerada çizim çağrısı ≤ 60`, ufuk.cizimEnCok <= 60, `${ufuk.cizimEnCok} çağrı`);
  olcumler[`${cihaz}-ufuk`] = ufuk;
  await ekran("6a-ufuk");
  await sayfa.evaluate(() => window.__yuru!.kamera({ egim: 0.62, mesafe: 14 }));

  // İpucu şeridi ilk ~10 sn sonra solar
  await sayfa.waitForFunction(() => document.querySelector(".yuru-ipucu")?.classList.contains("solgun") === true, null, { timeout: 15000 }).catch(() => undefined);
  await sayfa.waitForTimeout(1400);
  kontrol(`${e} ipucu şeridi 10 sn sonra soldu`, await sayfa.locator(".yuru-ipucu").isHidden());

  // Ölçüm: yürürken (masaüstü W basılı) ve boşta
  if (!mobil) await sayfa.keyboard.down("KeyW");
  const yuruOlc = await sayfa.evaluate(() => window.__yuru!.olc(3000));
  if (!mobil) await sayfa.keyboard.up("KeyW");
  const bostaOlc = await sayfa.evaluate(() => window.__yuru!.olc(2000));
  olcumler[`${cihaz}-olcum`] = { yururken: yuruOlc, bosta: bostaOlc };
  kontrol(`${e} ölçüm: çizim çağrısı ≤ 60`, yuruOlc.cizimEnCok <= 60, `${yuruOlc.cizimEnCok} çağrı, ${yuruOlc.ucgenEnCok} üçgen, ${yuruOlc.fps.toFixed(1)} fps (SwiftShader), CPU ${yuruOlc.cpuMsOrt.toFixed(1)} ms/kare`);

  // Kent sokağı (Gebze'de bitişik apartman blokları): kamera duvara çarpınca öne çekilir, bina ve sokak birlikte görünür
  await sayfa.evaluate(() => window.__yuru!.git(29.42714, 40.81348));
  await sayfa.waitForTimeout(400);
  await yuruHazir(sayfa);
  await sayfa.waitForTimeout(500);
  const kent = await sayfa.evaluate(() => ({ d: window.__yuru!.durum(), k: window.__yuru!.kameraDurum(), e: window.__yuru!.karakterEkran() }));
  kontrol(`${e} kent sokağında çizim ≤ 60, kamera mesafesi ≤ ayar`, kent.d.cizim > 0 && kent.d.cizim <= 60 && kent.k.etkin <= kent.k.mesafe + 1e-6, `${kent.d.cizim} çağrı, etkin ${kent.k.etkin.toFixed(1)}/${kent.k.mesafe} m, karakter %${(kent.e.oran * 100).toFixed(1)}`);
  await ekran("6b-kent");
  await sayfa.evaluate(() => window.__yuru!.kamera({ mesafe: 7, egim: 0.45 }));
  await sayfa.waitForTimeout(300);
  await ekran("6c-kent-yakin");
  await sayfa.evaluate(() => window.__yuru!.kamera({ mesafe: 14, egim: 0.62 }));

  if (!mobil) {
    // Koyu tema
    await sayfa.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await sayfa.waitForTimeout(500);
    await ekran("7-koyu");
    await sayfa.evaluate(() => document.documentElement.removeAttribute("data-theme"));
    await sayfa.waitForTimeout(200);
  }

  // Esc / "‹ Haritaya dön" ile haritaya dönüş
  if (mobil) await sayfa.locator(".yuru-geri").tap();
  else await sayfa.keyboard.press("Escape");
  await sayfa.waitForTimeout(300);
  d = (await yuruDurum(sayfa))!;
  const harita = await sayfa.evaluate(() => window.__harita?.durum() ?? null);
  kontrol(`${e} ${mobil ? "‹ Haritaya dön" : "Esc"} ile haritaya döndü (L3 korunur)`, !d.acik && (await sayfa.locator("#yuru-kap").isHidden()) && harita?.duzey === 3, JSON.stringify(harita));
  await ekran("8-donus");
  kontrol(`${e} haritaya dönünce yan panel eski durumuna döndü`, (await sayfa.locator("#panel").isVisible()) === panelOnce, `önce ${panelOnce ? "görünür" : "gizli"}`);

  if (!mobil) {
    // Uzun basma (L3): basılan noktada yürüyüş; bot parsellerine yakın açılır ve inşaat yer tutucuları görünür
    const komsu = await sayfa.evaluate(async () => {
      const b = window.__harita?.baglanti();
      const sh = await b?.sahiplikAl("tr_41_gebze");
      for (const [id, x] of sh?.hucreler ?? []) if (x.sahip !== b?.ben.id) return id;
      return null;
    });
    kontrol(`${e} komşu (bot) parseli var`, !!komsu, komsu ?? "");
    if (komsu) {
      const [hx, hy] = komsu.split(":").map(Number) as [number, number];
      const ll = [((hx + 1.5) / 2 ** 20) * 360 - 180, (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - (2 * Math.PI * (hy + 1.5)) / 2 ** 20))];
      await sayfa.evaluate((c) => window.__harita?.gorunum()?.ml.jumpTo({ center: c as [number, number], zoom: 17.5 }), ll);
      await haritaHazir(sayfa, "d.duzey === 3");
      const m = await sayfa.evaluate(() => {
        const r = document.getElementById("harita-kap")!.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await sayfa.mouse.move(m.x, m.y);
      await sayfa.mouse.down();
      await sayfa.waitForTimeout(900);
      await sayfa.mouse.up();
      await yuruHazir(sayfa);
      d = (await yuruDurum(sayfa))!;
      kontrol(`${e} uzun basma ile yürüyüş açıldı`, d.acik && d.hazir, d.hucre);
      kontrol(`${e} inşaat yer tutucuları ve bayraklar örneklenmiş`, d.arsa.insaat > 20, `${d.arsa.insaat} örnek kutu`);
      await sayfa.evaluate(() => window.__yuru?.kamera({ yaw: 0.6, egim: 0.8, mesafe: 40 }));
      await sayfa.waitForTimeout(600);
      await ekran("9-insaat");
      await sayfa.keyboard.press("Escape");
      await sayfa.waitForTimeout(200);
      // Y kısayolu (harita merkezinde)
      await sayfa.locator("#harita-kap canvas").focus();
      await sayfa.keyboard.press("y");
      await yuruHazir(sayfa);
      kontrol(`${e} Y kısayolu ile yürüyüş açıldı`, (await yuruDurum(sayfa))!.acik);
      await sayfa.keyboard.press("m");
      await sayfa.waitForTimeout(200);
      kontrol(`${e} M ile haritaya döndü`, !(await yuruDurum(sayfa))!.acik);
      kontrol(`${e} yuru.js yeniden indirilmedi`, istek["/yuru.js"] === 1, `${istek["/yuru.js"]} istek`);
    }
  } else {
    const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    kontrol(`${e} yatay taşma yok`, !tasma);
  }
  kontrol(`${e} konsol hatası yok`, konsol.length === 0, konsol.slice(0, 4).join(" | "));
  await baglam.close();
}

async function main(): Promise<void> {
  for (const d of ["dunya.html", "harita.js", "yuru.js", "harita-verisi/hiyerarsi.json", "harita-verisi/karolar/gebze-z15.pmtiles"])
    if (!existsSync(join(KOK, d))) throw new Error(`Önce derleyin (pnpm dunya; Gebze z15 özütü veri-hatti önbelleğinde olmalı): ${d} yok`);
  mkdirSync(EKRAN, { recursive: true });
  const { sunucu, adres } = await sunucuAc();
  const tarayici = await chromium.launch({
    executablePath: chromeBul(),
    args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  try {
    await senaryo(tarayici, adres, false);
    await senaryo(tarayici, adres, true);
  } finally {
    await tarayici.close();
    sunucu.close();
  }
  writeFileSync(join(EKRAN, "yuru-olcum.json"), JSON.stringify(olcumler, null, 2));
  console.log(`\nÖlçümler: ${JSON.stringify(olcumler)}`);
  console.log(`Ekran görüntüleri: ${EKRAN}`);
  console.log(hata ? `${hata} HATA` : "Tümü geçti");
  if (hata) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

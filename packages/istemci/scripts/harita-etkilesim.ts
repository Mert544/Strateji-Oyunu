/**
 * Harita etkileşim doğrulaması (S8, Playwright; yazılım GL: SwiftShader).
 *
 *   küre (L0) -> Kocaeli (L1) -> Gebze (L2) -> arsa ızgarası (L3) -> hücre seç -> satın al -> sahiplik merceği
 *
 * Masaüstü (1440×900; gerçek çift tık ve Shift+tık/sürükle) ve mobil (390×844; il çipi, "Çoklu seç" ve dokunma).
 * Harita verisi fetch ile geldiğinden sayfa file:// değil küçük bir yerel HTTP sunucusundan (Range destekli) açılır:
 * istemci/dunya.html (kabuk + küre, tek dosya) + istemci/harita.js (MapLibre yığını, ayrı dosya) + istemci/harita-verisi/
 * (hepsini pnpm dunya üretir). İsteğe bağlı Protomaps altlığı varsa
 * (packages/veri-hatti/.onbellek/karolar/gebze-z15.pmtiles) masaüstünde ayrıca altlıklı bir ekran görüntüsü alınır.
 *
 *   tsx scripts/harita-etkilesim.ts [ekran-klasoru]       (ya da HARITA_EKRAN=...)
 * Hata olursa süreç kodu 1 ile çıkar.
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
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
const ALTLIK = join(DEPO, "packages", "veri-hatti", ".onbellek", "karolar", "gebze-z15.pmtiles");
const EKRAN = resolve(process.argv[2] ?? process.env["HARITA_EKRAN"] ?? join(DEPO, "raporlar", "harita"));

function chromeBul(): string {
  const kok = "/opt/pw-browsers";
  for (const d of readdirSync(kok)) {
    const y = join(kok, d, "chrome-linux", "chrome");
    if (d.startsWith("chromium-") && existsSync(y)) return y;
  }
  throw new Error("chromium bulunamadi");
}

let hata = 0;
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
    const dosya = yol.startsWith("/altlik/") ? ALTLIK : normalize(join(KOK, yol));
    if (!dosya.startsWith(KOK) && dosya !== ALTLIK) {
      yanit.writeHead(403).end();
      return;
    }
    if (!existsSync(dosya) || !statSync(dosya).isFile()) {
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
      const d = h.durum();
      return new Function("d", `return ${k};`)(d) as boolean;
    },
    kosul,
    { timeout: zaman },
  );
  await sayfa.waitForTimeout(250);
}

/** Kırıntı yolu "Dünya › Bölge › İl › İlçe" (ayraç CSS ile çizilir; burada parçalar birleştirilir). */
const kirinti = (sayfa: Page): Promise<string> =>
  sayfa.locator("#harita-kirinti li").allInnerTexts().then((l) => l.map((t) => t.replace(/[›\s]+/g, " ").trim()).join(" › "));

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
  sayfa.on("pageerror", (e) => konsol.push(`pageerror: ${e.message}`));
  sayfa.on("console", (m) => m.type() === "error" && konsol.push(m.text()));
  let haritaJs = 0;
  sayfa.on("request", (r) => {
    if (new URL(r.url()).pathname === "/harita.js") haritaJs++;
  });
  const ekran = (ad: string): Promise<Buffer> => sayfa.screenshot({ path: join(EKRAN, `harita-${cihaz}-${ad}.png`) });
  const e = `[${cihaz}]`;

  await sayfa.goto(`${adres}/dunya.html?adaptif=0&hiz=3600&acilis=0#izle`);
  await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 120000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  kontrol(`${e} L0 kırıntı`, (await kirinti(sayfa)) === "Dünya", await kirinti(sayfa));

  // L0: bölge seç (küre tıkı ile aynı yol) ve bölgeye uç
  await sayfa.evaluate(() => window.__olcum?.bolgeSec(window.__olcum.bolgeIndeksi("izmit"), true));
  await sayfa.waitForFunction(() => window.__olcum?.sahne.kontrol.ucuyorMu() === false, null, { timeout: 60000 });
  await sayfa.waitForSelector("#harita-cipler:not([hidden]) [data-il='tr_41']", { timeout: 30000 });
  kontrol(`${e} L0 bölge kırıntısı`, (await kirinti(sayfa)) === "Dünya › İzmit Körfezi", await kirinti(sayfa));
  await ekran("0-kure");

  const t0 = Date.now();
  if (!mobil) {
    // Gerçek çift tık: Kocaeli merkezinin ekran konumu (bölge seçiliyken çift tık ile ine)
    const p = await sayfa.evaluate(() => {
      const r = Math.PI / 180;
      const [b, en] = [29.94 * r, 40.77 * r];
      const v: [number, number, number] = [Math.cos(en) * Math.sin(b), Math.sin(en), Math.cos(en) * Math.cos(b)];
      const q = window.__olcum?.sahne.kontrol.ekranaProje(v);
      const c = document.getElementById("sahne")?.getBoundingClientRect();
      return q && c ? { x: q.x + c.left, y: q.y + c.top } : null;
    });
    kontrol(`${e} Kocaeli ekranda`, !!p);
    if (p) await sayfa.mouse.dblclick(p.x, p.y);
  } else {
    await sayfa.locator("#harita-cipler [data-il='tr_41']").tap();
  }
  await haritaHazir(sayfa, "d.duzey === 1 && d.il === 'tr_41'", 90000);
  const acilisMs = Date.now() - t0;
  kontrol(`${e} L1 Kocaeli açıldı`, true, `(${acilisMs} ms, MapLibre tembel yükleme dahil)`);
  kontrol(`${e} MapLibre yığını ayrı harita.js dosyasından yüklendi`, haritaJs === 1, `${haritaJs} istek`);
  kontrol(`${e} L1 kırıntı`, (await kirinti(sayfa)).startsWith("Dünya › İzmit Körfezi › Kocaeli"), await kirinti(sayfa));
  const gl = await sayfa.evaluate(() => {
    const ml = window.__harita?.gorunum()?.ml;
    if (!ml) return null;
    const c = ml.getCanvas();
    const g = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    const dbg = g?.getExtension("WEBGL_debug_renderer_info");
    return {
      surum: g ? g.getParameter(g.VERSION) as string : "",
      cizici: g && dbg ? (g.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) : "",
      ilce: ml.queryRenderedFeatures({ layers: ["sinir-ilce"] }).length,
    };
  });
  kontrol(`${e} MapLibre yazılım GL'de çiziyor`, !!gl && gl.ilce > 0, JSON.stringify(gl));
  const atif = await sayfa.locator(".maplibregl-ctrl-attrib").innerText();
  kontrol(`${e} ODbL atfı haritada görünür`, atif.includes("OpenStreetMap katkıcıları") && (await sayfa.locator(".maplibregl-ctrl-attrib").isVisible()), atif.trim());
  await ekran("1-il");

  // L1 -> L2: Gebze'ye tıkla
  const gebze = await sayfa.evaluate(() => {
    const ml = window.__harita?.gorunum()?.ml;
    const c = ml?.getContainer().getBoundingClientRect();
    const p = ml?.project([29.47, 40.84]);
    return p && c ? { x: p.x + c.left, y: p.y + c.top } : null;
  });
  if (gebze) {
    if (mobil) await sayfa.touchscreen.tap(gebze.x, gebze.y);
    else await sayfa.mouse.click(gebze.x, gebze.y);
  }
  await haritaHazir(sayfa, "d.duzey === 2 && d.ilce === 'tr_41_gebze'");
  kontrol(`${e} L2 kırıntı`, (await kirinti(sayfa)).endsWith("Kocaeli › Gebze"), await kirinti(sayfa));
  kontrol(`${e} L2 mercek düğmeleri`, await sayfa.locator("#harita-mercek").isVisible());
  await ekran("2-ilce");

  // L2 -> L3: seçili ilçede tık arsa düzeyine iner (ızgaralı ilçe)
  const ic = await sayfa.evaluate(() => {
    const ml = window.__harita?.gorunum()?.ml;
    const c = ml?.getContainer().getBoundingClientRect();
    const p = ml?.project([29.4307, 40.8027]);
    return p && c ? { x: p.x + c.left, y: p.y + c.top } : null;
  });
  if (ic) {
    if (mobil) await sayfa.touchscreen.tap(ic.x, ic.y);
    else await sayfa.mouse.click(ic.x, ic.y);
  }
  await haritaHazir(sayfa, "d.duzey === 3");
  await sayfa.waitForTimeout(600);
  kontrol(`${e} L3 kırıntı`, (await kirinti(sayfa)).endsWith("Gebze › Arsa"), await kirinti(sayfa));
  const serit = await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.queryRenderedFeatures({ layers: ["serit-dolgu"] }).length ?? 0);
  kontrol(`${e} L3 arsa ızgarası (PMTiles şeritleri) çizildi`, serit > 0, `${serit} şerit`);
  kontrol(`${e} L3 satın alma alt çubuğu`, await sayfa.locator("#harita-alt").isVisible());

  const kap = await sayfa.evaluate(() => {
    const r = document.getElementById("harita-kap")?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top } : { x: 0, y: 0 };
  });
  const dokun = async (x: number, y: number, shift = false): Promise<void> => {
    if (mobil) await sayfa.touchscreen.tap(kap.x + x, kap.y + y);
    else {
      if (shift) await sayfa.keyboard.down("Shift");
      await sayfa.mouse.click(kap.x + x, kap.y + y);
      if (shift) await sayfa.keyboard.up("Shift");
    }
    await sayfa.waitForTimeout(150);
  };

  // Uygunsuz hücre: seçilemez ve nedeni ipucunda
  const engel = await sayfa.evaluate(() => window.__harita?.gorunum()?.sinamaEngelli() ?? null);
  kontrol(`${e} uygunsuz hücre bulundu`, !!engel, engel?.neden ?? "");
  if (engel) {
    await dokun(engel.x, engel.y);
    const ip = await sayfa.locator("#harita-ipucu").innerText();
    kontrol(`${e} uygunsuz hücre seçilemez, neden ipucunda`, ip.includes("Seçilemez") && ip.includes(engel.neden), ip);
    const n = await sayfa.evaluate(() => window.__harita?.gorunum()?.seciliHucreler().length ?? -1);
    kontrol(`${e} uygunsuz hücre seçime girmedi`, n === 0);
  }

  // F4: varsayılan akış hazır arsadır; hücre ızgarası yalnız ileri düzey araçtır (masaüstünde Shift, mobilde "Hücre aracı").
  // Hücre seçimi: Shift+tık / "Hücre aracı"; çoklu seçim Shift+tık ya da "Çoklu seç"
  const sira = await sayfa.evaluate(() => window.__harita?.gorunum()?.sinamaUygunSira(3) ?? null);
  kontrol(`${e} 3 bitişik uygun hücre bulundu`, !!sira && sira.length === 3);
  if (!sira) throw new Error("uygun hücre yok");
  if (mobil) {
    kontrol(`${e} "Hücre aracı" düğmesi (ileri düzey) görünür`, await sayfa.locator("#harita-alt [data-eylem='hucre-araci']").isVisible());
    await sayfa.locator("#harita-alt [data-eylem='hucre-araci']").tap();
  }
  await dokun(sira[0]!.x, sira[0]!.y, true);
  kontrol(`${e} Shift+tık / Hücre aracı ile tek hücre`, (await sayfa.evaluate(() => window.__harita?.gorunum()?.seciliHucreler().length)) === 1);
  kontrol(`${e} parsel kartı açıldı`, await sayfa.locator("#parsel-kart").isVisible(), (await sayfa.locator("#parsel-kart").innerText()).replace(/\s+/g, " "));
  if (mobil) await sayfa.locator("#harita-alt [data-eylem='coklu']").tap();
  await dokun(sira[1]!.x, sira[1]!.y, true);
  await dokun(sira[2]!.x, sira[2]!.y, true);
  const secili = await sayfa.evaluate(() => window.__harita?.gorunum()?.seciliHucreler() ?? []);
  kontrol(`${e} çoklu seçim 3 hücre`, secili.length === 3, secili.join(" "));
  const alt = (await sayfa.locator("#harita-alt").innerText()).replace(/\s+/g, " ");
  kontrol(`${e} alt çubuk: sayı, sınıf, ₺ toplam`, /3 hücre/.test(alt) && /(Kırsal|Kasaba|Şehir)/.test(alt) && /\d{1,3}(\.\d{3})* ₺/.test(alt), alt);
  const dugme = sayfa.locator("#harita-alt [data-eylem='satin-al']");
  kontrol(`${e} Satın al etkin`, await dugme.isEnabled());
  await ekran("3-secim");

  // Satın al -> bildirim -> sahiplik merceği
  if (mobil) await dugme.tap();
  else await dugme.click();
  await sayfa.waitForSelector("#bildirimler .bildirim.tamam", { timeout: 15000 });
  const toast = await sayfa.locator("#bildirimler .bildirim.tamam").last().innerText();
  kontrol(`${e} satın alma bildirimi`, toast.includes("Parsel satın alındı") && toast.includes("₺"), toast.replace(/\s+/g, " "));
  const mercek = sayfa.locator("#harita-mercek [data-mercek='sahiplik']");
  if (mobil) await mercek.tap();
  else await mercek.click();
  await sayfa.waitForTimeout(800);
  const sahip = await sayfa.evaluate(async (hucreler) => {
    const g = window.__harita?.gorunum();
    const b = window.__harita?.baglanti();
    const sh = await b?.sahiplikAl("tr_41_gebze");
    const benim = hucreler.filter((h) => sh?.hucreler.get(h.id)?.sahip === b?.ben.id).length;
    const cizilen = hucreler.filter((h) => (g?.ml.queryRenderedFeatures([h.x, h.y], { layers: ["sahiplik-dolgu"] }) ?? []).some((f) => f.properties["ben"] === 1)).length;
    return { benim, cizilen, mercek: g?.sahiplikMercegi ?? false };
  }, sira);
  kontrol(`${e} sahiplik: 3 hücre benim (sahte sunucu)`, sahip.benim === 3);
  kontrol(`${e} sahiplik merceğinde oyuncu renginde çiziliyor`, sahip.mercek && sahip.cizilen === 3, JSON.stringify(sahip));
  const kart = (await sayfa.locator("#parsel-kart").innerText()).replace(/\s+/g, " ");
  kontrol(`${e} parsel kartı: sahip Sen, değer ₺`, kart.includes("Sen") && kart.includes("₺"), kart);
  await sayfa.waitForTimeout(300);
  await ekran("4-sahiplik");

  if (!mobil) {
    // Shift + sürükle: dikdörtgen seçim; Esc seçimi temizler
    const s2 = await sayfa.evaluate(() => window.__harita?.gorunum()?.sinamaUygunSira(4) ?? null);
    if (s2) {
      await sayfa.keyboard.down("Shift");
      await sayfa.mouse.move(kap.x + s2[0]!.x, kap.y + s2[0]!.y);
      await sayfa.mouse.down();
      await sayfa.mouse.move(kap.x + s2[3]!.x, kap.y + s2[3]!.y, { steps: 6 });
      await sayfa.mouse.up();
      await sayfa.keyboard.up("Shift");
      await sayfa.waitForTimeout(200);
      const n = await sayfa.evaluate(() => window.__harita?.gorunum()?.seciliHucreler().length ?? 0);
      kontrol(`${e} Shift+sürükle dikdörtgen seçim`, n >= 4, `${n} hücre`);
      await sayfa.keyboard.press("Escape");
      kontrol(`${e} Esc seçimi temizler`, (await sayfa.evaluate(() => window.__harita?.gorunum()?.seciliHucreler().length)) === 0);
    }
    // Arama: aksan duyarsız
    await sayfa.locator("#harita-ara").fill("kadikoy");
    await sayfa.waitForSelector("#harita-ara-sonuc:not([hidden])");
    const sonuc = await sayfa.locator("#harita-ara-sonuc").innerText();
    kontrol(`${e} arama "kadikoy" -> Kadıköy`, sonuc.includes("Kadıköy"), sonuc.replace(/\s+/g, " ").slice(0, 80));
    await sayfa.locator("#harita-ara").fill("istanbul");
    await sayfa.waitForTimeout(100);
    const ilk = await sayfa.locator("#harita-ara-sonuc button").first().innerText();
    kontrol(`${e} arama "istanbul" -> İstanbul`, ilk.startsWith("İstanbul"), ilk.replace(/\s+/g, " "));
    await sayfa.locator("#harita-ara").fill("gebze");
    await sayfa.waitForTimeout(100);
    const mulk = await sayfa.locator("#harita-ara-sonuc").innerText();
    kontrol(`${e} arama "Mülklerim" grubu`, mulk.includes("Mülklerim"), mulk.replace(/\s+/g, " ").slice(0, 120));
    await ekran("5-arama");
    await sayfa.locator("#harita-ara").press("Escape");

    // Esc ile düzey düzey yukarı: L3 -> L2 -> L1 -> L0
    await sayfa.locator("#harita-kap canvas").focus();
    await sayfa.keyboard.press("Escape");
    await haritaHazir(sayfa, "d.duzey === 2");
    kontrol(`${e} Esc: L3 -> L2`, true, await kirinti(sayfa));
    await sayfa.keyboard.press("Escape");
    await haritaHazir(sayfa, "d.duzey === 1");
    kontrol(`${e} Esc: L2 -> L1`, true, await kirinti(sayfa));
    // Tarayıcının geri tuşu da bir üst düzeye çıkar (L1 -> L0)
    await sayfa.goBack();
    await sayfa.waitForFunction(() => window.__harita?.durum().duzey === 0, null, { timeout: 15000 });
    kontrol(`${e} geri tuşu: L1 -> L0, harita gizli`, await sayfa.locator("#harita-kap").isHidden(), await kirinti(sayfa));
    kontrol(`${e} küre çizimi sürdü`, (await sayfa.evaluate(() => window.__olcum?.sahne.askida)) === false);
  } else {
    // Mobil: kısa geri düğmesi "‹ Gebze" ile bir üst düzey
    const geri = sayfa.locator("#harita-geri");
    kontrol(`${e} geri düğmesi`, (await geri.innerText()).startsWith("‹"), await geri.innerText());
    await geri.tap();
    await haritaHazir(sayfa, "d.duzey === 2");
    kontrol(`${e} ‹ geri: L3 -> L2`, true, await kirinti(sayfa));
    const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    kontrol(`${e} yatay taşma yok`, !tasma);
  }
  kontrol(`${e} konsol hatası yok`, konsol.length === 0, konsol.slice(0, 4).join(" | "));
  await baglam.close();
}

/** İsteğe bağlı: Protomaps altlığıyla Gebze L3 ekran görüntüsü (yalnız yerelde özüt varsa). */
async function altlikli(tarayici: Browser, adres: string): Promise<void> {
  if (!existsSync(ALTLIK)) {
    console.log("altlık yok (gebze-z15.pmtiles), atlandı");
    return;
  }
  const baglam = await tarayici.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
  const sayfa = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f;");
  const konsol: string[] = [];
  sayfa.on("pageerror", (e) => konsol.push(e.message));
  await sayfa.goto(`${adres}/dunya.html?adaptif=0&acilis=0&altlik=/altlik/gebze-z15.pmtiles#izle`);
  await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 120000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  await sayfa.evaluate(() => window.__harita?.ilceAc("tr_41_gebze"));
  await haritaHazir(sayfa, "d.duzey === 2");
  await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.jumpTo({ center: [29.4307, 40.8027], zoom: 16.4 }));
  await haritaHazir(sayfa, "d.duzey === 3");
  await sayfa.waitForTimeout(800);
  const n = await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.queryRenderedFeatures({ layers: ["altlik-yol-minor_road", "altlik-yol-medium_road", "altlik-yol-major_road", "altlik-yol-highway"] }).length ?? 0);
  kontrol("[altlık] Protomaps yolları çizildi (koyu tema)", n > 0, `${n} yol`);
  await sayfa.screenshot({ path: join(EKRAN, "harita-masaustu-altlik-koyu.png") });
  kontrol("[altlık] konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
  await baglam.close();
}

async function main(): Promise<void> {
  for (const d of ["dunya.html", "harita.js", "harita-verisi/hiyerarsi.json"]) if (!existsSync(join(KOK, d))) throw new Error(`Önce derleyin (pnpm dunya): ${d} yok`);
  mkdirSync(EKRAN, { recursive: true });
  const { sunucu, adres } = await sunucuAc();
  const tarayici = await chromium.launch({
    executablePath: chromeBul(),
    args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  try {
    await senaryo(tarayici, adres, false);
    await senaryo(tarayici, adres, true);
    await altlikli(tarayici, adres);
  } finally {
    await tarayici.close();
    sunucu.close();
  }
  console.log(`\nEkran görüntüleri: ${EKRAN}`);
  console.log(hata ? `${hata} HATA` : "Tümü geçti");
  if (hata) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

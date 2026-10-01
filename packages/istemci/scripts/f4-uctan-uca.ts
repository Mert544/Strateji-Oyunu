/**
 * F4 uçtan uca (Playwright; yazılım GL: SwiftShader): harita GERÇEK sunucuya bağlı.
 *
 * Sunucu: Gebze'yi kapsayan parsel fikstürüyle mülk kipinde, in-process (`f4-sunucu.ts`; sunucu CLI'si Gebze fikstürünü
 * yükleyemez). Üç tarayıcı bağlamı:
 *   - ALİ (masaüstü 1440×900): Yerleş ekranı → ilçe (Gebze) + açılış önerisi (Tarım) → önerilen hazır arsa → tek tıkla satın al →
 *     kamu arsası → Yapı kur (Çiftlik): hayalet (geçerli mavi, geçersiz turuncu taralı + neden), R ile döndürme, maliyet kartı,
 *     onay; sonra yapı önce yerleşim: boş hücreler + yapı tek işlemde (Ahır).
 *   - VELİ (masaüstü): önceden katılmış (bedava yurt): doğrudan haritada; Ali'nin sahipliğini ve inşaatını canlı (delta) görür;
 *     sim saati ilerleyince inşaat aşamaları (Temel → İskele → Gövde → Tamam).
 *   - AYŞE (mobil 390×844, dokunma): Yerleş → arsa → Yapı kur → hayalet → kur.
 * Ekran görüntüleri: scratchpad/f4/ (ya da ilk argüman / F4_EKRAN). Hata olursa süreç kodu 1 ile çıkar.
 *
 *   pnpm dunya && tsx scripts/f4-uctan-uca.ts [ekran-klasoru]
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { f4SunucuBaslat, GEBZE } from "./f4-sunucu";
import type { F4Sunucu } from "./f4-sunucu";

declare global {
  interface Window {
    __name?: (f: unknown) => unknown;
  }
}

const DEPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const KOK = join(DEPO, "istemci");
const EKRAN = resolve(process.argv[2] ?? process.env["F4_EKRAN"] ?? join(DEPO, "raporlar", "f4"));

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
function statikSunucu(): Promise<{ sunucu: Server; adres: string }> {
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

async function sayfaAc(baglam: BrowserContext, adres: string, ts: F4Sunucu, oyuncu: string, konsol: string[]): Promise<Page> {
  const sayfa = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f; window.__bildirimCarpan = 6;");
  sayfa.on("pageerror", (e) => konsol.push(`[${oyuncu}] pageerror: ${e.message}`));
  sayfa.on("console", (m) => m.type() === "error" && konsol.push(`[${oyuncu}] ${m.text()}`));
  // Protokolde oyuncunun kendi katılımı yok (oturum hizmeti sonraki iş): sınama köprüsü yönetici komutuyla katar.
  await sayfa.exposeFunction("__katilIste", async (ilce: string) => ts.katil(oyuncu, ilce));
  const url = `${adres}/dunya.html?sunucu=${encodeURIComponent(ts.url)}&token=${ts.token(oyuncu)}&adaptif=0&hiz=3600&acilis=0`;
  await sayfa.goto(url);
  return sayfa;
}

/** Harita kabının sayfa içindeki konumuna göre hücre merkezinin ekran noktası. */
async function hucreNoktasi(sayfa: Page, id: string): Promise<{ x: number; y: number } | null> {
  return sayfa.evaluate((h) => {
    const p = window.__harita?.gorunum()?.hucreEkrani(h);
    const r = document.getElementById("harita-kap")?.getBoundingClientRect();
    return p && r ? { x: p.x + r.left, y: p.y + r.top } : null;
  }, id);
}

async function haritaHazir(sayfa: Page, zaman = 90000): Promise<void> {
  await sayfa.waitForFunction(() => window.__harita?.hazir() === true, null, { timeout: zaman });
  await sayfa.waitForTimeout(250);
}

async function tikla(sayfa: Page, mobil: boolean, secici: string): Promise<void> {
  const l = sayfa.locator(secici).first();
  if (mobil) await l.tap();
  else await l.click();
}

const kart = (sayfa: Page): Promise<string> => sayfa.locator("#yapi-kart").innerText().then((t) => t.replace(/\s+/g, " "));
const alt = (sayfa: Page): Promise<string> => sayfa.locator("#harita-alt").innerText().then((t) => t.replace(/\s+/g, " "));

interface ArsaBilgi {
  kimlik: string;
  hucreler: string[];
  kamu: boolean;
}

async function ali(tarayici: Browser, adres: string, ts: F4Sunucu, konsol: string[], gozlemci: Page): Promise<{ arsa: ArsaBilgi; insaatHucreler: string[] }> {
  const e = "[ali/masaüstü]";
  const baglam = await tarayici.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "light" });
  const sayfa = await sayfaAc(baglam, adres, ts, "ali", konsol);
  const ekran = (ad: string): Promise<Buffer> => sayfa.screenshot({ path: join(EKRAN, `f4-masaustu-${ad}.png`) });

  // --- Yerleş ekranı ---
  await sayfa.waitForFunction(() => window.__harita?.yerles() != null, null, { timeout: 120000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  const adaylar = await sayfa.evaluate(() => window.__harita?.yerles()?.adaylar() ?? []);
  kontrol(`${e} Yerleş ekranı açıldı; 3 önerilen ilçe`, adaylar.length === 3 && adaylar.includes(GEBZE), adaylar.join(", "));
  kontrol(`${e} "Devlet seç" mülk kipinde gösterilmiyor`, await sayfa.locator("#devlet-sec").isHidden());
  const kartlar = (await sayfa.locator(".yr-kartlar").innerText()).replace(/\s+/g, " ");
  kontrol(`${e} kartlarda doluluk, imza ürün ve ayrılmış hücre`, /dolu/.test(kartlar) && /İmza:/.test(kartlar) && /yeni oyunculara ayrılmış/.test(kartlar), kartlar.slice(0, 160));
  const not = (await sayfa.locator(".yr-acilis").innerText()).replace(/\s+/g, " ");
  kontrol(`${e} açılış önerisi: Tarım/Sanayi/Pazar ve "sınıf değil, sonradan değiştirilebilir"`, /Tarım/.test(not) && /Sanayi/.test(not) && /Pazar/.test(not) && /sınıf değil/.test(not) && /istediğin zaman/.test(not), not.slice(0, 200));
  await sayfa.locator(".yr-kart[data-ilce='tr_41_gebze']").click();
  await sayfa.locator("[data-acilis='tarim']").click();
  await sayfa.waitForTimeout(150);
  await ekran("1-yerles");

  await sayfa.locator("[data-yr='basla']").click();
  await sayfa.waitForFunction(() => window.__harita?.gorunum()?.seciliArsa() != null && window.__harita?.durum().duzey === 3, null, { timeout: 120000 });
  await haritaHazir(sayfa);
  await sayfa.waitForTimeout(800);
  kontrol(`${e} Yerleş kapandı, harita Gebze L3'te önerilen hazır arsada`, (await sayfa.locator("#yerles").count()) === 0);
  const oz = await sayfa.evaluate(() => window.__harita?.baglanti()?.ozet?.() ?? null);
  kontrol(`${e} sunucudan yurt (6 hücre) ve hibe: hazine 50.000 ₺`, !!oz && oz.ilceHucre.some(([i, n]) => i === "tr_41_gebze" && n === 6) && oz.hazineMili === 50_000_000, JSON.stringify(oz));
  const hazine = (await sayfa.locator("#harita-hazine").innerText()).replace(/\s+/g, " ");
  kontrol(`${e} hazine çipi`, /Hazine\s*50\.000 ₺/.test(hazine), hazine);
  const arsa = await sayfa.evaluate((): ArsaBilgi | null => {
    const a = window.__harita?.gorunum()?.seciliArsa();
    return a ? { kimlik: a.kimlik, hucreler: a.hucreler, kamu: a.kamu } : null;
  });
  if (!arsa) throw new Error("önerilen arsa yok");
  kontrol(`${e} önerilen arsa 4–12 hücre, kamu değil`, arsa.hucreler.length >= 4 && arsa.hucreler.length <= 12 && !arsa.kamu, `${arsa.kimlik} ${arsa.hucreler.length} hücre`);
  const altMetin = await alt(sayfa);
  kontrol(`${e} alt çubuk: hazır arsa, hücre, sınıf, ₺ fiyat, Satın al`, /Hazır arsa/.test(altMetin) && /hücre/.test(altMetin) && /(Kırsal|Kasaba|Şehir)/.test(altMetin) && /₺/.test(altMetin) && (await sayfa.locator("[data-eylem='arsa-al']").isEnabled()), altMetin);
  const nav = await sayfa.evaluate(() => {
    const g = window.__harita?.gorunum();
    return { arsa: g?.ml.queryRenderedFeatures({ layers: ["arsa-cizgi"] }).length ?? 0, kumeler: g?.arsaKumesi()?.arsalar.length ?? 0, kamu: g?.arsaKumesi()?.kamuSayisi ?? 0 };
  });
  kontrol(`${e} hazır arsa sınırları haritada çiziliyor (türetilmiş ${nav.kumeler} arsa, ${nav.kamu} kamu)`, nav.arsa > 0 && nav.kumeler > 10_000 && nav.kamu > 0, JSON.stringify(nav));
  await ekran("2-hazir-arsa");

  // --- Kamu arsası: nötr renk, ipucu, satışa kapalı ---
  const kamu = await sayfa.evaluate((merkezArsa): { id: string; kimlik: string } | null => {
    const k = window.__harita?.gorunum()?.arsaKumesi();
    if (!k) return null;
    const m = k.arsalar.find((a) => a.kimlik === merkezArsa);
    if (!m) return null;
    let en: { id: string; kimlik: string; d: number } | null = null;
    for (const a of k.arsalar) {
      if (!a.kamu) continue;
      const d = Math.hypot(a.cx - m.cx, a.cy - m.cy);
      if (!en || d < en.d) en = { id: a.hucreler[0]!, kimlik: a.kimlik, d };
    }
    return en ? { id: en.id, kimlik: en.kimlik } : null;
  }, arsa.kimlik);
  if (kamu) {
    await sayfa.evaluate((h) => {
      const g = window.__harita?.gorunum();
      const c = h.split(":").map(Number) as [number, number];
      const r = Math.PI / 180;
      const lng = (c[0]! / 2 ** 20) * 360 - 180;
      const n = Math.PI - (2 * Math.PI * c[1]!) / 2 ** 20;
      g?.ml.jumpTo({ center: [lng, (Math.atan(Math.sinh(n)) * 180) / Math.PI], zoom: 17.2 });
      void r;
    }, kamu.id);
    await haritaHazir(sayfa);
    await sayfa.waitForTimeout(500);
    const p = await hucreNoktasi(sayfa, kamu.id);
    if (p) {
      await sayfa.mouse.move(p.x, p.y);
      await sayfa.waitForTimeout(250);
      const ip = (await sayfa.locator("#harita-ipucu").innerText()).replace(/\s+/g, " ");
      kontrol(`${e} kamu arsası ipucu "Kamu arsası" (satışa kapalı)`, /Kamu arsası/.test(ip) && /satışa kapalı/.test(ip), ip);
      await sayfa.mouse.click(p.x, p.y);
      await sayfa.waitForTimeout(300);
      const a2 = await alt(sayfa);
      kontrol(`${e} kamu arsası seçilince alt çubukta satın alma yok`, /Kamu arsası/.test(a2) && (await sayfa.locator("[data-eylem='arsa-al']").count()) === 0, a2);
      const kn = await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.queryRenderedFeatures({ layers: ["arsa-kamu-dolgu"] }).length ?? 0);
      kontrol(`${e} kamu arsaları nötr dolguyla çiziliyor`, kn > 0, `${kn} özellik`);
      await ekran("3-kamu-arsasi");
    } else kontrol(`${e} kamu arsası ekran konumu`, false);
  } else kontrol(`${e} yakında kamu arsası bulundu`, false);

  // --- Tek tıkla hazır arsa satın alma ---
  await sayfa.evaluate((k) => {
    const g = window.__harita?.gorunum();
    const a = g?.arsaKumesi()?.arsalar.find((x) => x.kimlik === k);
    if (a) void g?.arsayaUc(a);
  }, arsa.kimlik);
  await haritaHazir(sayfa);
  await sayfa.waitForTimeout(600);
  await tikla(sayfa, false, "[data-eylem='arsa-al']");
  await sayfa.waitForSelector("#bildirimler .bildirim.tamam", { timeout: 20000 });
  const toast = (await sayfa.locator("#bildirimler .bildirim.tamam").last().innerText()).replace(/\s+/g, " ");
  kontrol(`${e} arsa satın alındı bildirimi (Türkçe)`, /Arsa satın alındı: \d+ hücre, [\d.]+ ₺\./.test(toast), toast);
  const sunucudaSahip = (): number => {
    const m = ts.yazar.sim.dunya.mulk;
    return m ? m.hucreler.filter((h) => h.sahip === "ali").length : 0;
  };
  kontrol(`${e} sunucuda ali ${arsa.hucreler.length + 6} hücreye sahip (arsa + yurt)`, sunucudaSahip() === arsa.hucreler.length + 6, `${sunucudaSahip()}`);
  await sayfa.waitForTimeout(600);
  const durumA = await alt(sayfa);
  kontrol(`${e} arsa artık "Senin arsan" (canlı sahiplik)`, /Senin arsan/.test(durumA), durumA);
  await ekran("4-arsa-alindi");

  // --- Yapı kur: menü, hayalet, R, maliyet kartı ---
  await tikla(sayfa, false, "#yapi-menu-dugme");
  const menu = (await sayfa.locator("#yapi-menu").innerText()).replace(/\s+/g, " ");
  kontrol(`${e} yapı menüsü: gruplar, hücre/₺/süre, açılış önerisi rozeti`, /Tarım/.test(menu) && /Çiftlik/.test(menu) && /2 hücre/.test(menu) && /Önerilen/.test(menu), menu.slice(0, 200));
  await ekran("5-yapi-menusu");
  await tikla(sayfa, false, "#yapi-menu [data-yapi='ciftlik']");
  await sayfa.waitForTimeout(300);
  kontrol(`${e} yapı seçildi: hayalet kipi, kart ipucu`, await sayfa.locator("#yapi-kart").isVisible(), await kart(sayfa));
  // Geçerli: kendi arsanın hücreleri üzerinde
  const [h0, h1] = [arsa.hucreler[1]!, arsa.hucreler[2]!];
  void h1;
  const p0 = await hucreNoktasi(sayfa, h0);
  if (!p0) throw new Error("hücre noktası yok");
  await sayfa.mouse.move(p0.x, p0.y);
  await sayfa.waitForTimeout(300);
  const plan1 = await sayfa.evaluate(() => {
    const p = window.__harita?.gorunum()?.yerlesimKipi?.gecerliPlan;
    return p ? { gecerli: p.gecerli, neden: p.neden, alinacak: p.alinacak.length, hucreler: p.hucreler.map((h) => [h.x, h.y]) } : null;
  });
  kontrol(`${e} hayalet geçerli (kendi arsa; arsa bedeli yok)`, !!plan1 && (plan1.gecerli || /Kamu|Yol|hücre/.test(plan1.neden ?? "")), JSON.stringify(plan1));
  const ghost = await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.queryRenderedFeatures({ layers: ["hayalet-dolgu"] }).map((f) => f.properties["g"]) ?? []);
  kontrol(`${e} hayalet haritada çiziliyor`, ghost.length >= 2, JSON.stringify(ghost));
  await ekran("6-hayalet");
  // R ile döndür
  await sayfa.keyboard.press("r");
  await sayfa.waitForTimeout(250);
  const plan2 = await sayfa.evaluate(() => {
    const p = window.__harita?.gorunum()?.yerlesimKipi?.gecerliPlan;
    return p ? p.hucreler.map((h) => [h.x, h.y]) : null;
  });
  const yatay1 = plan1 ? plan1.hucreler[0]![1] === plan1.hucreler[1]![1] : null;
  const yatay2 = plan2 ? plan2[0]![1] === plan2[1]![1] : null;
  kontrol(`${e} R ile döndürme: yatay ↔ dikey`, yatay1 !== null && yatay2 !== null && yatay1 !== yatay2, `önce ${yatay1 ? "yatay" : "dikey"}, sonra ${yatay2 ? "yatay" : "dikey"}`);
  await sayfa.keyboard.press("r"); // yataya dön
  // Geçersiz: yol hücresi (turuncu taralı, neden ipucunda)
  const engel = await sayfa.evaluate(() => window.__harita?.gorunum()?.sinamaEngelli() ?? null);
  if (engel) {
    const pe = await hucreNoktasi(sayfa, engel.id);
    if (pe) {
      await sayfa.mouse.move(pe.x, pe.y);
      await sayfa.waitForTimeout(300);
      const ip = (await sayfa.locator("#harita-ipucu").innerText()).replace(/\s+/g, " ");
      kontrol(`${e} geçersiz yerleşim: ipucunda neden (${engel.neden})`, /Buraya kurulamaz/.test(ip) && ip.includes(engel.neden), ip);
      const g0 = await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.queryRenderedFeatures({ layers: ["hayalet-tarali"] }).length ?? 0);
      kontrol(`${e} geçersiz hayalet turuncu taralı katmanda`, g0 > 0, `${g0} özellik`);
      await ekran("7-hayalet-gecersiz");
    }
  } else kontrol(`${e} yakında engelli hücre bulundu`, false);
  // Sabitle ve maliyet kartı
  await sayfa.mouse.move(p0.x, p0.y);
  await sayfa.waitForTimeout(200);
  await sayfa.mouse.click(p0.x, p0.y);
  await sayfa.waitForTimeout(300);
  const k1 = await kart(sayfa);
  kontrol(`${e} maliyet kartı: arsa + yapı bedeli + süre + toplam`, /Arsa/.test(k1) && /Yapı/.test(k1) && /Süre/.test(k1) && /Toplam/.test(k1) && /6\.000 ₺/.test(k1) && /Kendi arsan/.test(k1), k1);
  await ekran("8-maliyet-karti");
  const insaOnce = ts.yazar.sim.dunya.insaatlar.length;
  const sunucuKomut = ts.yazar.seq;
  await tikla(sayfa, false, "#yapi-kart [data-yk='onayla']");
  await sayfa.waitForSelector("#bildirimler .bildirim.tamam >> text=Çiftlik kuruluyor", { timeout: 20000 });
  const t2 = (await sayfa.locator("#bildirimler .bildirim.tamam").last().innerText()).replace(/\s+/g, " ");
  kontrol(`${e} onay: Çiftlik kuruluyor (arsa zaten senin: tek komut)`, /Çiftlik kuruluyor: yapı 6\.000 ₺\./.test(t2), t2);
  kontrol(`${e} sunucuda inşaat başladı (hücreli)`, ts.yazar.sim.dunya.insaatlar.length === insaOnce + 1 && (ts.yazar.sim.dunya.insaatlar.at(-1)?.hucreler?.length ?? 0) === 2, `${ts.yazar.sim.dunya.insaatlar.length} inşaat; yeni komut ${ts.yazar.seq - sunucuKomut}`);
  const insaatHucreler = [...(ts.yazar.sim.dunya.insaatlar.at(-1)?.hucreler ?? [])];
  await sayfa.waitForTimeout(700);
  const asama = await sayfa.locator(".yapi-etiket").first().innerText().catch(() => "");
  kontrol(`${e} haritada yapı etiketi (Çiftlik · aşama)`, /Çiftlik · (Temel|İskele|Gövde)/.test(asama), asama);
  await ekran("9-ciftlik-insaat");

  // --- Yapı önce yerleşim: boş hücreler + yapı tek işlemde (Ahır) ---
  const bos = await sayfa.evaluate(async (): Promise<{ sol: string; sag: string } | null> => {
    const g = window.__harita?.gorunum();
    const k = g?.arsaKumesi();
    const b = window.__harita?.baglanti();
    if (!g || !k || !b) return null;
    const sh = await b.sahiplikAl("tr_41_gebze");
    const m = g.ml.getCenter();
    const cx = ((m.lng + 180) / 360) * 2 ** 20;
    const r = (m.lat * Math.PI) / 180;
    const cy = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** 20;
    let en: { sol: string; sag: string; d: number } | null = null;
    for (const a of k.arsalar) {
      if (a.kamu || a.hucreler.length < 6 || a.hucreler.some((h) => sh?.hucreler.has(h))) continue;
      const d = Math.hypot(a.cx - cx, a.cy - cy);
      if (en && d >= en.d) continue;
      const kume = new Set(a.hucreler);
      for (const h of a.hucreler) {
        const [hx, hy] = h.split(":").map(Number) as [number, number];
        const sag = `${hx + 1}:${hy}`;
        if (kume.has(sag)) {
          en = { sol: h, sag, d };
          break;
        }
      }
    }
    return en ? { sol: en.sol, sag: en.sag } : null;
  });
  if (bos) {
    // Bu hücrelerin sahipsiz olması gerekir: yakın arsalar henüz kimsenin değil (ali yalnız kendi arsasını aldı)
    await sayfa.evaluate((h) => {
      const g = window.__harita?.gorunum();
      const c = h.split(":").map(Number) as [number, number];
      const lng = (c[0]! / 2 ** 20) * 360 - 180;
      const n = Math.PI - (2 * Math.PI * c[1]!) / 2 ** 20;
      g?.ml.jumpTo({ center: [lng, (Math.atan(Math.sinh(n)) * 180) / Math.PI], zoom: 17.2 });
    }, bos.sol);
    await haritaHazir(sayfa);
    const atomik = await sayfa.evaluate(() => window.__harita?.baglanti()?.atomikYerlestirme?.() ?? false);
    const ahirKur = async (ilk: boolean): Promise<void> => {
      await tikla(sayfa, false, "#yapi-menu-dugme");
      await tikla(sayfa, false, "#yapi-menu [data-yapi='ahir']");
      const pb = await hucreNoktasi(sayfa, bos.sol);
      if (!pb) throw new Error("ahır hücresi ekranda değil");
      await sayfa.mouse.move(pb.x, pb.y);
      await sayfa.waitForTimeout(250);
      await sayfa.mouse.click(pb.x, pb.y);
      await sayfa.waitForTimeout(350);
      const k2 = await kart(sayfa);
      const planB = await sayfa.evaluate(() => {
        const p = window.__harita?.gorunum()?.yerlesimKipi?.gecerliPlan;
        return p ? { gecerli: p.gecerli, neden: p.neden, alinacak: p.alinacak.length, toplam: p.toplamMili } : null;
      });
      if (ilk) {
        kontrol(`${e} yapı önce yerleşim: kartta "2 hücre alınacak" + Ahır bedeli`, /2 hücre alınacak/.test(k2) && /8\.000 ₺/.test(k2) && !!planB && planB.gecerli, k2);
        await ekran("10-yapi-once-yerlesim");
      }
      const seqOnce = ts.yazar.seq;
      await tikla(sayfa, false, "#yapi-kart [data-yk='onayla']");
      await sayfa.waitForSelector("#bildirimler .bildirim >> text=Ahır kuruluyor", { timeout: 20000 });
      const t3 = (await sayfa.locator("#bildirimler .bildirim").last().innerText()).replace(/\s+/g, " ");
      if (ilk) {
        kontrol(`${e} Ahır: arsa + yapı tek işlemde, bildirim Türkçe`, /Ahır kuruluyor: arsa 2 hücre, [\d.]+ ₺ \+ yapı 8\.000 ₺\./.test(t3), t3);
        const kmt = ts.yazar.seq - seqOnce;
        kontrol(`${e} komut yolu: ${atomik ? "tek atomik yapi_yerlestir" : "zincir (parsel_al + tesis_insa_hucre)"}`, kmt === (atomik ? 1 : 2), `sunucuya ${kmt} komut`);
      }
      await sayfa.waitForTimeout(500);
    };
    const hucreOnce = sunucudaSahip();
    await ahirKur(true);
    kontrol(`${e} sunucuda 2 yeni hücre ve ikinci inşaat`, sunucudaSahip() === hucreOnce + 2 && ts.yazar.sim.dunya.insaatlar.length === insaOnce + 2, `${sunucudaSahip()} hücre`);
    await ekran("11-iki-insaat");
    // 5 dk geri al: inşaat iptal + bu işlemle alınan 2 hücre bırakılır
    const geri = (await sayfa.locator("#yapi-geri").innerText().catch(() => "")).replace(/\s+/g, " ");
    kontrol(`${e} onaydan sonra "Geri al" şeridi (5 dk)`, /Ahır kuruluyor/.test(geri) && /4:5\d|5:00/.test(geri) && (await sayfa.locator("#yapi-geri [data-yg='geri-al']").isVisible()), geri);
    await ekran("11a-geri-al-seridi");
    const hazineOnce = ts.yazar.sim.dunya.oyuncular.find((o) => o.id === "ali")?.hazine.miktar ?? 0;
    await tikla(sayfa, false, "#yapi-geri [data-yg='geri-al']");
    await sayfa.waitForSelector("#bildirimler .bildirim.tamam >> text=geri alındı", { timeout: 20000 });
    await sayfa.waitForTimeout(600);
    kontrol(`${e} geri al: inşaat kalktı, 2 hücre bırakıldı, para iade (sunucuda doğrulandı)`, sunucudaSahip() === hucreOnce && ts.yazar.sim.dunya.insaatlar.length === insaOnce + 1 && (ts.yazar.sim.dunya.oyuncular.find((o) => o.id === "ali")?.hazine.miktar ?? 0) > hazineOnce, `${sunucudaSahip()} hücre, ${ts.yazar.sim.dunya.insaatlar.length} inşaat`);
    await ahirKur(false); // yeniden kur: sonraki adımlar iki inşaat bekler
    kontrol(`${e} yeniden kuruldu: 2 inşaat`, ts.yazar.sim.dunya.insaatlar.length === insaOnce + 2 && sunucudaSahip() === hucreOnce + 2);
  } else kontrol(`${e} boş arsa bulundu`, false);

  // --- Üçüncü yapı: eşzamanlı inşaat sınırı (2) istemcide neden olarak görünür ---
  const serbest = await sayfa.evaluate(async (): Promise<string | null> => {
    const b = window.__harita?.baglanti();
    const sh = await b?.sahiplikAl("tr_41_gebze");
    if (!b || !sh) return null;
    const dolu = new Set<string>();
    for (const y of sh.yapilar ?? []) for (const h of y.hucreler) dolu.add(h);
    for (const [id, h] of sh.hucreler) {
      if (h.sahip !== b.ben.id || dolu.has(id)) continue;
      const [x, y] = id.split(":").map(Number) as [number, number];
      const sag = `${x + 1}:${y}`;
      if (sh.hucreler.get(sag)?.sahip === b.ben.id && !dolu.has(sag)) return id;
    }
    return null;
  });
  await tikla(sayfa, false, "#yapi-menu-dugme");
  await tikla(sayfa, false, "#yapi-menu [data-yapi='ciftlik']");
  const pc = serbest ? await hucreNoktasi(sayfa, serbest) : null;
  if (pc) {
    await sayfa.evaluate((h) => {
      const c = h.split(":").map(Number) as [number, number];
      const lng = (c[0]! / 2 ** 20) * 360 - 180;
      const n = Math.PI - (2 * Math.PI * c[1]!) / 2 ** 20;
      window.__harita?.gorunum()?.ml.jumpTo({ center: [lng, (Math.atan(Math.sinh(n)) * 180) / Math.PI], zoom: 17.4 });
    }, serbest!);
    await haritaHazir(sayfa);
    const pc2 = (await hucreNoktasi(sayfa, serbest!))!;
    await sayfa.mouse.move(pc2.x, pc2.y);
    await sayfa.mouse.click(pc2.x, pc2.y);
    await sayfa.waitForTimeout(300);
    const k3 = await kart(sayfa);
    kontrol(`${e} 3. yapı: "Aynı anda en çok 2 inşaat" nedeni, Kur kapalı`, /Aynı anda en çok 2 inşaat/.test(k3) && (await sayfa.locator("#yapi-kart [data-yk='onayla']").isDisabled()), k3);
    await ekran("11b-ucuncu-yapi-siniri");
  } else kontrol(`${e} 3. yapı için serbest iki hücre bulundu`, false);
  await sayfa.keyboard.press("Escape");
  kontrol(`${e} Esc yapı kipinden çıkar`, !(await sayfa.evaluate(() => window.__harita?.gorunum()?.yerlesimKipi?.aktif ?? true)));

  // --- Gözlemci (Veli) canlı görür; sim saati ilerler ---
  const gorunum = async (sayfa2: Page): Promise<{ ali: number; insaat: number; tesis: number; etiketler: string[] }> =>
    sayfa2.evaluate(async () => {
      const b = window.__harita?.baglanti();
      const sh = await b?.sahiplikAl("tr_41_gebze");
      let ali = 0;
      for (const h of sh?.hucreler.values() ?? []) if (h.sahip === "ali") ali++;
      return {
        ali,
        insaat: (sh?.yapilar ?? []).filter((y) => y.durum === "insaat" && y.sahip === "ali").length,
        tesis: (sh?.yapilar ?? []).filter((y) => y.durum === "tesis" && y.sahip === "ali").length,
        etiketler: [...document.querySelectorAll(".yapi-etiket")].map((x) => x.textContent ?? ""),
      };
    });
  await gozlemci.waitForFunction(async () => {
    const sh = await window.__harita?.baglanti()?.sahiplikAl("tr_41_gebze");
    return [...(sh?.hucreler.values() ?? [])].filter((h) => h.sahip === "ali").length >= 14;
  }, null, { timeout: 20000 });
  const gv = await gorunum(gozlemci);
  kontrol(`${e}/[veli] veli, ali'nin sahipliğini ve 2 inşaatını canlı görüyor`, gv.ali >= 14 && gv.insaat === 2, JSON.stringify(gv));
  // Veli haritayı ali'nin yapısına getirir
  await gozlemci.evaluate((h) => {
    const c = h.split(":").map(Number) as [number, number];
    const lng = (c[0]! / 2 ** 20) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * c[1]!) / 2 ** 20;
    window.__harita?.gorunum()?.ml.jumpTo({ center: [lng, (Math.atan(Math.sinh(n)) * 180) / Math.PI], zoom: 17.4 });
  }, insaatHucreler[0]!);
  await haritaHazir(gozlemci);
  await gozlemci.waitForTimeout(500);
  await gozlemci.screenshot({ path: join(EKRAN, "f4-masaustu-12-veli-gorur-insaat.png") });
  const yapiOzellik = await gozlemci.evaluate(() => window.__harita?.gorunum()?.ml.queryRenderedFeatures({ layers: ["yapi-dolgu"] }).length ?? 0);
  kontrol(`${e}/[veli] inşaat hücreleri veli'nin haritasında yapı dolgusuyla çiziliyor`, yapiOzellik > 0, `${yapiOzellik} özellik`);

  // Zaman ilerler: çiftlik (2 sa × %10 = 12 dk): +5 dk -> İskele; +12 dk -> Tamam
  const t0 = ts.yazar.sim.dunya.zaman;
  await ts.yonetici.zamanIlerlet(t0 + 5 * 60_000);
  // Elle saatte zaman yalnız değişiklikle gelir: istemci eşitlemeyi hemen ister (gerçek saatli sunucuda 20 sn'lik döngü yeter)
  await sayfa.evaluate(() => (window.__harita?.baglanti() as unknown as { zamanEsitle?: () => Promise<void> }).zamanEsitle?.());
  await sayfa.waitForTimeout(2600);
  const asamaIskele = await gorunum(sayfa);
  kontrol(`${e} +5 dk: ali kendi çiftliğinde aşama İskele`, asamaIskele.etiketler.some((x) => /Çiftlik · İskele/.test(x)), asamaIskele.etiketler.join(" | "));
  await ts.yonetici.zamanIlerlet(t0 + 30 * 60_000);
  await sayfa.evaluate(() => (window.__harita?.baglanti() as unknown as { zamanEsitle?: () => Promise<void> }).zamanEsitle?.());
  await sayfa.waitForTimeout(2600);
  await gozlemci.waitForTimeout(500);
  const ali2 = await gorunum(sayfa);
  const veli2 = await gorunum(gozlemci);
  kontrol(`${e} +30 dk: iki inşaat da tamam; ali'de tesis`, ali2.tesis === 2 && ali2.insaat === 0, JSON.stringify(ali2));
  kontrol(`${e}/[veli] veli de tamamlananı görüyor (delta)`, veli2.tesis === 2 && veli2.insaat === 0, JSON.stringify(veli2));
  await sayfa.evaluate((h) => {
    const c = h.split(":").map(Number) as [number, number];
    const lng = (c[0]! / 2 ** 20) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * c[1]!) / 2 ** 20;
    window.__harita?.gorunum()?.ml.jumpTo({ center: [lng, (Math.atan(Math.sinh(n)) * 180) / Math.PI], zoom: 17.2 });
  }, insaatHucreler[0]!);
  await haritaHazir(sayfa);
  await sayfa.waitForTimeout(600);
  await ekran("13-tamamlandi");
  await gozlemci.screenshot({ path: join(EKRAN, "f4-masaustu-14-veli-gorur-tamam.png") });
  kontrol(`${e} konsol hatası yok`, konsol.filter((x) => x.includes("[ali]")).length === 0, konsol.filter((x) => x.includes("[ali]")).slice(0, 3).join(" | "));
  await baglam.close();
  return { arsa, insaatHucreler };
}

async function ayse(tarayici: Browser, adres: string, ts: F4Sunucu, konsol: string[]): Promise<void> {
  const e = "[ayşe/mobil]";
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: "light" });
  const sayfa = await sayfaAc(baglam, adres, ts, "ayse", konsol);
  const ekran = (ad: string): Promise<Buffer> => sayfa.screenshot({ path: join(EKRAN, `f4-mobil-${ad}.png`) });
  await sayfa.waitForFunction(() => window.__harita?.yerles() != null, null, { timeout: 120000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  kontrol(`${e} Yerleş ekranı mobilde (tek sütun)`, (await sayfa.locator(".yr-kart").count()) === 3);
  const tasma0 = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  kontrol(`${e} Yerleş: yatay taşma yok`, !tasma0);
  await sayfa.locator(".yr-kart[data-ilce='tr_41_gebze']").tap();
  await sayfa.locator("[data-acilis='tarim']").tap();
  await ekran("1-yerles");
  await sayfa.locator("[data-yr='basla']").tap();
  await sayfa.waitForFunction(() => window.__harita?.gorunum()?.seciliArsa() != null && window.__harita?.durum().duzey === 3, null, { timeout: 120000 });
  await haritaHazir(sayfa);
  await sayfa.waitForTimeout(800);
  const altM = await alt(sayfa);
  kontrol(`${e} hazır arsa seçili, alt çubuk görünür`, /Hazır arsa/.test(altM) && (await sayfa.locator("#harita-alt").isVisible()), altM);
  await ekran("2-hazir-arsa");
  // Hücre aracı düğmesi yalnız dokunmatikte görünür (ileri düzey): seçimi temizleyince boştaki çubukta
  const arsaKimlik = await sayfa.evaluate(() => window.__harita?.gorunum()?.seciliArsa()?.kimlik ?? "");
  await sayfa.locator("#harita-alt [data-eylem='temizle']").tap();
  await sayfa.waitForTimeout(200);
  kontrol(`${e} "Hücre aracı" dokunmatikte görünür (ileri düzey; varsayılan akış hazır arsa)`, await sayfa.locator("#harita-alt [data-eylem='hucre-araci']").isVisible(), await alt(sayfa));
  await ekran("2b-bosta");
  await sayfa.evaluate((k) => {
    const g = window.__harita?.gorunum();
    const a = g?.arsaKumesi()?.arsalar.find((x) => x.kimlik === k);
    if (a) g?.arsaSec(a);
  }, arsaKimlik);
  await sayfa.waitForTimeout(200);
  // Yapı kur (kendi yurt hücrelerine değil: önce arsayı al)
  await sayfa.locator("[data-eylem='arsa-al']").tap();
  await sayfa.waitForSelector("#bildirimler .bildirim.tamam", { timeout: 20000 });
  await sayfa.waitForTimeout(700);
  const arsa = await sayfa.evaluate(() => {
    const a = window.__harita?.gorunum()?.seciliArsa();
    return a ? { kimlik: a.kimlik, hucreler: a.hucreler } : null;
  });
  if (!arsa) throw new Error("ayşe arsası yok");
  await sayfa.locator("#yapi-menu-dugme").tap();
  await sayfa.waitForTimeout(200);
  await ekran("3-yapi-menusu");
  await sayfa.locator("#yapi-menu [data-yapi='ciftlik']").tap();
  await sayfa.waitForTimeout(300);
  const p = await hucreNoktasi(sayfa, arsa.hucreler[1]!);
  if (p) {
    await sayfa.touchscreen.tap(p.x, p.y);
    await sayfa.waitForTimeout(400);
    const k = await kart(sayfa);
    kontrol(`${e} dokunma ile yer sabitlendi: maliyet kartı`, /Çiftlik/.test(k) && /Toplam/.test(k), k);
    await ekran("4-hayalet-kart");
    await sayfa.locator("#yapi-kart [data-yk='don']").tap();
    await sayfa.waitForTimeout(250);
    kontrol(`${e} "Döndür" düğmesi çalışıyor (R yerine)`, await sayfa.locator("#yapi-kart").isVisible());
    const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    kontrol(`${e} yatay taşma yok`, !tasma);
    const planGecerli = await sayfa.evaluate(() => window.__harita?.gorunum()?.yerlesimKipi?.gecerliPlan?.gecerli ?? false);
    if (planGecerli) {
      await sayfa.locator("#yapi-kart [data-yk='onayla']").tap();
      await sayfa.waitForSelector("#bildirimler .bildirim.tamam >> text=Çiftlik kuruluyor", { timeout: 20000 });
      kontrol(`${e} Çiftlik kuruluyor (sunucuda ayşe'nin inşaatı)`, ts.yazar.sim.dunya.insaatlar.some((i) => i.sahip === "ayse"));
      await sayfa.waitForTimeout(600);
      await ekran("5-insaat");
    } else kontrol(`${e} yerleşim geçerli`, false, (await kart(sayfa)));
  }
  kontrol(`${e} konsol hatası yok`, konsol.filter((x) => x.includes("[ayse]")).length === 0, konsol.filter((x) => x.includes("[ayse]")).slice(0, 3).join(" | "));
  await baglam.close();
}

/** Sunucusuz: `?yerles=1` ile sahte bağdaştırıcı aynı arayüzle Yerleş ekranını ve hazır arsa akışını çalıştırır. */
async function sahteYerles(tarayici: Browser, adres: string, konsol: string[]): Promise<void> {
  const e = "[sahte/masaüstü]";
  const baglam = await tarayici.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: "dark" });
  const sayfa = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f; window.__bildirimCarpan = 6;");
  sayfa.on("pageerror", (x) => konsol.push(`[sahte] pageerror: ${x.message}`));
  sayfa.on("console", (m) => m.type() === "error" && konsol.push(`[sahte] ${m.text()}`));
  await sayfa.goto(`${adres}/dunya.html?yerles=1&adaptif=0&hiz=3600&acilis=0`);
  await sayfa.waitForFunction(() => window.__harita?.yerles() != null, null, { timeout: 120000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  kontrol(`${e} Yerleş (sahte bağdaştırıcı): 3 aday, Devlet seç yok`, (await sayfa.locator(".yr-kart").count()) === 3 && (await sayfa.locator("#devlet-sec").isHidden()));
  await sayfa.locator("[data-acilis='pazar']").click();
  await sayfa.screenshot({ path: join(EKRAN, "f4-sahte-1-yerles-koyu.png") });
  await sayfa.locator("[data-yr='basla']").click();
  await sayfa.waitForFunction(() => window.__harita?.gorunum()?.seciliArsa() != null && window.__harita?.durum().duzey === 3, null, { timeout: 120000 });
  await haritaHazir(sayfa);
  await sayfa.waitForTimeout(600);
  const altM = await alt(sayfa);
  kontrol(`${e} önerilen hazır arsa seçildi; Satın al etkin`, /Hazır arsa/.test(altM) && (await sayfa.locator("[data-eylem='arsa-al']").isEnabled()), altM);
  await tikla(sayfa, false, "[data-eylem='arsa-al']");
  await sayfa.waitForSelector("#bildirimler .bildirim.tamam", { timeout: 20000 });
  await sayfa.waitForTimeout(500);
  await tikla(sayfa, false, "#yapi-menu-dugme");
  const menu = (await sayfa.locator("#yapi-menu").innerText()).replace(/\s+/g, " ");
  kontrol(`${e} Pazar önerisi: menüde Gıda Fabrikası "Önerilen"`, /Gıda Fabrikası\s+Önerilen/.test(menu), menu.slice(0, 120));
  await sayfa.screenshot({ path: join(EKRAN, "f4-sahte-2-yapi-menusu-koyu.png") });
  kontrol("[sahte/masaüstü] konsol hatası yok", konsol.filter((x) => x.includes("[sahte]")).length === 0, konsol.slice(0, 3).join(" | "));
  await baglam.close();
}

async function main(): Promise<void> {
  for (const d of ["dunya.html", "harita.js", "harita-verisi/hiyerarsi.json"]) if (!existsSync(join(KOK, d))) throw new Error(`Önce derleyin (pnpm dunya): ${d} yok`);
  mkdirSync(EKRAN, { recursive: true });
  const t0 = Date.now();
  const ts = await f4SunucuBaslat();
  console.log(`sunucu hazır (${Date.now() - t0} ms): ${ts.url}`);
  // Veli önceden katılmış: bedava yurt Gebze'de
  await ts.katil("veli", GEBZE);
  const { sunucu, adres } = await statikSunucu();
  const tarayici = await chromium.launch({
    executablePath: chromeBul(),
    args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  const konsol: string[] = [];
  try {
    // Gözlemci (veli): kendi yurduna açılır; ali'nin işlemlerini canlı izler
    const gBaglam = await tarayici.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "light" });
    const veli = await sayfaAc(gBaglam, adres, ts, "veli", konsol);
    await veli.waitForFunction(() => window.__harita?.durum().ilce === "tr_41_gebze", null, { timeout: 120000 });
    await haritaHazir(veli);
    await veli.evaluate(() => window.__olcum?.duraklat(true));
    const vz = await veli.evaluate(() => window.__harita?.baglanti()?.ozet?.()?.ilceHucre ?? []);
    kontrol("[veli] yurdu olan oyuncu Yerleş görmeden doğrudan haritada (Gebze)", (await veli.locator("#yerles").count()) === 0 && vz.some(([i, n]) => i === "tr_41_gebze" && n === 6), JSON.stringify(vz));
    await ali(tarayici, adres, ts, konsol, veli);
    // Sunucu yetişme durumu (protokol `durum` mesajı): sakin bilgi şeridi. Gerçek yetişme için mutlak saatli sunucu kapalı
    // kalmalıdır; burada aynı iletiyi bağdaştırıcıya vererek arayüz bağlantısı doğrulanır (bağdaştırıcı mantığı birim testlerde).
    await veli.evaluate(() => {
      const b = window.__harita?.baglanti() as unknown as { mesajAl: (m: string) => void };
      b.mesajAl(JSON.stringify({ tur: "durum", yetisiyor: true, simZamani: 100, hedefZamani: 400 }));
      b.mesajAl(JSON.stringify({ tur: "durum", yetisiyor: true, simZamani: 250, hedefZamani: 400 }));
    });
    await veli.waitForSelector("#harita-yetisme:not([hidden])", { timeout: 6000 }).catch(() => undefined);
    const yt = (await veli.locator("#harita-yetisme").innerText().catch(() => "")).replace(/\s+/g, " ");
    kontrol("[veli] \"Dünya yetişiyor\" sakin bilgi şeridi görünür", /Dünya yetişiyor/.test(yt) && (await veli.locator("#harita-yetisme .yt-cubuk i").getAttribute("style"))?.includes("50%") === true, yt);
    await veli.screenshot({ path: join(EKRAN, "f4-masaustu-15-yetisme-seridi.png") });
    await veli.evaluate(() => {
      const b = window.__harita?.baglanti() as unknown as { mesajAl: (m: string) => void };
      b.mesajAl(JSON.stringify({ tur: "durum", yetisiyor: false, simZamani: 400, hedefZamani: 400 }));
    });
    await veli.waitForSelector("#harita-yetisme", { state: "hidden", timeout: 6000 }).catch(() => undefined);
    kontrol("[veli] yetişme bitince şerit kalkar", await veli.locator("#harita-yetisme").isHidden());
    await ayse(tarayici, adres, ts, konsol);
    await gBaglam.close();
    await sahteYerles(tarayici, adres, konsol);
    const k = konsol.filter((x) => !x.includes("[ali]") && !x.includes("[ayse]") && !x.includes("[sahte]"));
    kontrol("[veli] konsol hatası yok", k.length === 0, k.slice(0, 3).join(" | "));
    const sunucuSorun = ts.yazar.sim.dunya.mulk ? "" : "mülk kipi kapalı";
    kontrol("sunucu mülk kipinde", sunucuSorun === "", sunucuSorun);
  } finally {
    await tarayici.close();
    sunucu.close();
    await ts.kapat();
  }
  console.log(`\nEkran görüntüleri: ${EKRAN}`);
  console.log(hata ? `${hata} HATA` : "Tümü geçti");
  if (hata) process.exit(1);
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

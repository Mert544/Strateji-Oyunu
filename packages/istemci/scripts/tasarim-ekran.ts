/**
 * Tasarım önce/sonra ekran görüntüleri (Playwright; SwiftShader): aynı noktalardan, açık ve koyu tema, masaüstü ve mobil.
 *   küre genel · Dikkat paneli · il · ilçe · arsa (L3) · Yerleş · seçili hazır arsa · yapı menüsü · maliyet kartı ·
 *   sokak yakın · sokak kent
 * Sayfa yerel HTTP sunucusundan açılır (harita verisi ve yazı tipi fetch ile gelir). Önce `pnpm dunya`.
 *
 *   tsx scripts/tasarim-ekran.ts <kok-klasoru (dunya.html'in olduğu)> <cikti-klasoru> <onek>
 * Adımlardan biri başarısız olursa not düşülür ve sürdürülür; çıkış kodu başarısız adım varsa 1.
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
const KOK = resolve(process.argv[2] ?? join(DEPO, "istemci"));
const CIKTI = resolve(process.argv[3] ?? join(DEPO, "raporlar", "tasarim"));
const ONEK = process.argv[4] ?? "sonra";

function chromeBul(): string {
  const kok = "/opt/pw-browsers";
  for (const d of readdirSync(kok)) {
    const y = join(kok, d, "chrome-linux", "chrome");
    if (d.startsWith("chromium-") && existsSync(y)) return y;
  }
  throw new Error("chromium bulunamadi");
}

const TUR: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function sunucuAc(): Promise<{ sunucu: Server; adres: string }> {
  const sunucu = createServer((istek, yanit) => {
    const yol = decodeURIComponent((istek.url ?? "/").split("?")[0] ?? "/");
    const dosya = normalize(join(KOK, yol));
    if (!dosya.startsWith(KOK) || !existsSync(dosya) || !statSync(dosya).isFile()) {
      yanit.writeHead(404).end();
      return;
    }
    const boyut = statSync(dosya).size;
    const b = { "Content-Type": TUR[extname(dosya)] ?? "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
    const aralik = /bytes=(\d+)-(\d*)/.exec(istek.headers.range ?? "");
    if (aralik) {
      const bas = Number(aralik[1]);
      const son = Math.min(boyut - 1, aralik[2] ? Number(aralik[2]) : boyut - 1);
      yanit.writeHead(206, { ...b, "Content-Range": `bytes ${bas}-${son}/${boyut}`, "Content-Length": son - bas + 1 });
      createReadStream(dosya, { start: bas, end: son }).pipe(yanit);
    } else {
      yanit.writeHead(200, { ...b, "Content-Length": boyut });
      createReadStream(dosya).pipe(yanit);
    }
  });
  return new Promise((coz) => sunucu.listen(0, "127.0.0.1", () => coz({ sunucu, adres: `http://127.0.0.1:${(sunucu.address() as AddressInfo).port}` })));
}

let basarisiz = 0;
const olcum: string[] = [];

async function adim(ad: string, f: () => Promise<void>): Promise<void> {
  try {
    await f();
  } catch (e) {
    basarisiz++;
    console.log(`  BAŞARISIZ ${ad}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
  }
}

async function haritaHazir(sayfa: Page, zaman = 90000): Promise<void> {
  await sayfa.waitForFunction(() => window.__harita?.hazir() === true, null, { timeout: zaman });
  await sayfa.waitForTimeout(700);
}

async function yuruHazir(sayfa: Page): Promise<void> {
  await sayfa.waitForFunction(() => window.__yuru?.durum().acik === true && window.__yuru.durum().hazir === true, null, { timeout: 90000 });
  await sayfa.waitForTimeout(900);
}

async function kureVeHarita(tarayici: Browser, adres: string, mobil: boolean, tema: "light" | "dark"): Promise<void> {
  const cihaz = mobil ? "mobil" : "masaustu";
  const t = tema === "light" ? "acik" : "koyu";
  const baglam = await tarayici.newContext({ viewport: mobil ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: mobil, hasTouch: mobil, colorScheme: tema });
  const sayfa = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f; window.__bildirimCarpan = 6;");
  const ekran = (ad: string): Promise<Buffer> => sayfa.screenshot({ path: join(CIKTI, `${ONEK}-${cihaz}-${t}-${ad}.png`) });
  const konsol: string[] = [];
  sayfa.on("pageerror", (e) => konsol.push(e.message));
  sayfa.on("console", (m) => m.type() === "error" && konsol.push(m.text()));
  await sayfa.goto(`${adres}/dunya.html?adaptif=0&hiz=21600#korvan`);
  await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 240000 });
  await sayfa.waitForFunction(() => (window.__olcum?.simSaat() ?? 0) >= 40, null, { timeout: 240000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  await sayfa.waitForFunction(() => window.__olcum?.sahne.kontrol.ucuyorMu() === false, null, { timeout: 60000 });
  await sayfa.waitForTimeout(1200);
  await adim("küre genel", async () => {
    await ekran("01-kure-genel");
    olcum.push(`${cihaz} ${t} küre çizim çağrısı: ${await sayfa.evaluate(() => window.__olcum?.bilgi().cizimCagrisi)}`);
  });
  await adim("dikkat", async () => {
    if (mobil && (await sayfa.locator("#panel.kapali").count())) await sayfa.locator("#panel-tutamac").click();
    await sayfa.evaluate(() => window.__olcum?.sekme("dikkat"));
    await sayfa.waitForTimeout(700);
    await ekran("02-dikkat");
    if (mobil && !(await sayfa.locator("#panel.kapali").count())) await sayfa.locator("#panel-tutamac").click();
  });
  await adim("il", async () => {
    await sayfa.evaluate(() => window.__harita?.ilAc("tr_41"));
    await haritaHazir(sayfa);
    await ekran("03-il");
  });
  await adim("ilçe", async () => {
    await sayfa.evaluate(() => window.__harita?.ilceAc("tr_41_gebze"));
    await haritaHazir(sayfa);
    await ekran("04-ilce");
  });
  await adim("arsa", async () => {
    await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.jumpTo({ center: [29.4307, 40.8027], zoom: 16.4 }));
    await haritaHazir(sayfa);
    await sayfa.evaluate(() => window.__harita?.gorunum()?.arsalarHazir());
    await sayfa.waitForTimeout(800);
    await ekran("05-arsa");
  });
  await adim("sokak", async () => {
    await sayfa.evaluate(() => window.__harita?.gorunum()?.ml.jumpTo({ center: [29.4307, 40.8027], zoom: 17.2 }));
    await haritaHazir(sayfa);
    const kap = await sayfa.evaluate(() => {
      const r = document.getElementById("harita-kap")?.getBoundingClientRect();
      return r ? { x: r.left, y: r.top } : { x: 0, y: 0 };
    });
    const sira = await sayfa.evaluate(() => window.__harita?.gorunum()?.sinamaUygunSira(1) ?? null);
    if (!sira) throw new Error("uygun hücre yok");
    // Hücre aracı (Shift + tık) ile tek hücre seçip al; kartta "Sokakta yürü"
    if (mobil) {
      await sayfa.locator("#harita-alt [data-eylem='hucre-araci']").tap();
      await sayfa.touchscreen.tap(kap.x + sira[0]!.x, kap.y + sira[0]!.y);
    } else {
      await sayfa.keyboard.down("Shift");
      await sayfa.mouse.click(kap.x + sira[0]!.x, kap.y + sira[0]!.y);
      await sayfa.keyboard.up("Shift");
    }
    await sayfa.waitForTimeout(300);
    await sayfa.locator("#harita-alt [data-eylem='satin-al']").click();
    await sayfa.waitForSelector("#bildirimler .bildirim.tamam", { timeout: 15000 });
    await sayfa.locator("#bildirimler .bildirim").evaluateAll((l) => l.forEach((x) => (x as HTMLElement).click()));
    await sayfa.waitForTimeout(300);
    await sayfa.locator("#parsel-kart [data-eylem='yuru']").click();
    await yuruHazir(sayfa);
    await sayfa.evaluate(() => window.__yuru!.kamera({ mesafe: 9, egim: 0.5 }));
    await sayfa.waitForTimeout(1500);
    await ekran("10-sokak-yakin");
    const d = await sayfa.evaluate(() => window.__yuru!.durum());
    olcum.push(`${cihaz} ${t} sokak yakın: ${d.cizim} çizim, ${d.ucgen} üçgen`);
    await sayfa.evaluate(() => window.__yuru!.git(29.42714, 40.81348));
    await sayfa.waitForTimeout(400);
    await yuruHazir(sayfa);
    await sayfa.evaluate(() => window.__yuru!.kamera({ mesafe: 14, egim: 0.62 }));
    await sayfa.waitForTimeout(1500);
    await ekran("11-sokak-kent");
    const d2 = await sayfa.evaluate(() => ({ d: window.__yuru!.durum(), e: window.__yuru!.karakterEkran() }));
    olcum.push(`${cihaz} ${t} sokak kent: ${d2.d.cizim} çizim, ${d2.d.ucgen} üçgen, karakter %${(d2.e.oran * 100).toFixed(1)}`);
  });
  if (konsol.length) olcum.push(`${cihaz} ${t} konsol: ${konsol.slice(0, 3).join(" | ")}`);
  await baglam.close();
}

async function yerles(tarayici: Browser, adres: string, mobil: boolean, tema: "light" | "dark"): Promise<void> {
  const cihaz = mobil ? "mobil" : "masaustu";
  const t = tema === "light" ? "acik" : "koyu";
  const baglam = await tarayici.newContext({ viewport: mobil ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: mobil, hasTouch: mobil, colorScheme: tema });
  const sayfa = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f; window.__bildirimCarpan = 6;");
  const ekran = (ad: string): Promise<Buffer> => sayfa.screenshot({ path: join(CIKTI, `${ONEK}-${cihaz}-${t}-${ad}.png`) });
  const tikla = async (s: string): Promise<void> => {
    const l = sayfa.locator(s).first();
    if (mobil) await l.tap();
    else await l.click();
  };
  await sayfa.goto(`${adres}/dunya.html?yerles=1&adaptif=0&hiz=3600&acilis=0`);
  await sayfa.waitForFunction(() => window.__harita?.yerles() != null, null, { timeout: 120000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  await sayfa.waitForTimeout(800);
  await adim("yerleş", () => ekran("06-yerles").then(() => undefined));
  await adim("seçili arsa", async () => {
    await tikla("[data-yr='basla']");
    await sayfa.waitForFunction(() => window.__harita?.gorunum()?.seciliArsa() != null && window.__harita?.durum().duzey === 3, null, { timeout: 120000 });
    await haritaHazir(sayfa);
    await ekran("07-arsa-secili");
  });
  await adim("yapı menüsü + maliyet kartı", async () => {
    const hucreler = await sayfa.evaluate(() => window.__harita?.gorunum()?.seciliArsa()?.hucreler ?? []);
    await tikla("[data-eylem='arsa-al']");
    await sayfa.waitForSelector("#bildirimler .bildirim.tamam", { timeout: 20000 });
    await sayfa.locator("#bildirimler .bildirim").evaluateAll((l) => l.forEach((x) => (x as HTMLElement).click()));
    await sayfa.waitForTimeout(500);
    await tikla("#yapi-menu-dugme");
    await sayfa.waitForTimeout(300);
    await ekran("08-yapi-menusu");
    await tikla("#yapi-menu [data-yapi='ciftlik']");
    await sayfa.waitForTimeout(300);
    const p = await sayfa.evaluate((h) => {
      const q = window.__harita?.gorunum()?.hucreEkrani(h);
      const r = document.getElementById("harita-kap")?.getBoundingClientRect();
      return q && r ? { x: q.x + r.left, y: q.y + r.top } : null;
    }, hucreler[1] ?? hucreler[0] ?? "");
    if (!p) throw new Error("hücre noktası yok");
    if (mobil) await sayfa.touchscreen.tap(p.x, p.y);
    else {
      await sayfa.mouse.move(p.x, p.y);
      await sayfa.waitForTimeout(200);
      await sayfa.mouse.click(p.x, p.y);
    }
    await sayfa.waitForTimeout(500);
    await ekran("09-maliyet-karti");
  });
  await baglam.close();
}

async function main(): Promise<void> {
  if (!existsSync(join(KOK, "dunya.html"))) throw new Error(`dunya.html yok: ${KOK} (önce pnpm dunya)`);
  mkdirSync(CIKTI, { recursive: true });
  const { sunucu, adres } = await sunucuAc();
  const tarayici = await chromium.launch({
    executablePath: chromeBul(),
    args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  try {
    // TASARIM_KIP=masaustu-acik gibi bir süzgeç yalnız o birleşimi çalıştırır (hızlı ayar turları için)
    const kip = process.env["TASARIM_KIP"];
    for (const mobil of [false, true])
      for (const tema of ["light", "dark"] as const) {
        if (kip && kip !== `${mobil ? "mobil" : "masaustu"}-${tema === "light" ? "acik" : "koyu"}`) continue;
        console.log(`${mobil ? "mobil" : "masaüstü"} ${tema}`);
        await adim("küre ve harita", () => kureVeHarita(tarayici, adres, mobil, tema));
        await adim("yerleş", () => yerles(tarayici, adres, mobil, tema));
      }
  } finally {
    await tarayici.close();
    sunucu.close();
  }
  console.log(olcum.join("\n"));
  console.log(`ekran görüntüleri: ${CIKTI} (${basarisiz} başarısız adım)`);
  process.exit(basarisiz ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

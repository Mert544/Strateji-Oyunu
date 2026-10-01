/**
 * F0 sakin görsel ekran görüntüleri (Playwright): masaüstü/mobil × açık/koyu × (genel, bölge seçili, Dikkat).
 * Oyuncu kipinde (#korvan) açılır; dünya duraklatılır. Çizim çağrısı ve konsol hataları da raporlanır.
 *   tsx scripts/sakin-ekran.ts [dunya.html] [cikti-klasoru]     (dosyalar: sakin-<cihaz>-<tema>-<ad>.png)
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

declare global {
  interface Window {
    __name?: (f: unknown) => unknown;
  }
}

const DEPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function chromeBul(): string {
  const kok = "/opt/pw-browsers";
  for (const d of readdirSync(kok)) {
    const y = join(kok, d, "chrome-linux", "chrome");
    if (d.startsWith("chromium-") && existsSync(y)) return y;
  }
  throw new Error("chromium bulunamadi");
}

async function main(): Promise<void> {
  const html = resolve(process.argv[2] ?? join(DEPO, "istemci", "dunya.html"));
  const cikti = resolve(process.argv[3] ?? join(DEPO, "raporlar", "dunya"));
  mkdirSync(cikti, { recursive: true });
  const tarayici = await chromium.launch({
    executablePath: chromeBul(),
    args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  let enCokCizim = 0;
  let hata = 0;
  for (const mobil of [false, true]) {
    for (const tema of ["light", "dark"] as const) {
      const cihaz = mobil ? "mobil" : "masaustu";
      const ad = (x: string): string => join(cikti, `sakin-${cihaz}-${tema === "light" ? "acik" : "koyu"}-${x}.png`);
      const baglam = await tarayici.newContext({ viewport: mobil ? { width: 390, height: 844 } : { width: 1440, height: 900 }, colorScheme: tema, deviceScaleFactor: 1, isMobile: mobil, hasTouch: mobil });
      const sayfa = await baglam.newPage();
      await sayfa.addInitScript("window.__name = (f) => f;");
      const konsol: string[] = [];
      sayfa.on("pageerror", (e) => konsol.push(e.message));
      sayfa.on("console", (m) => m.type() === "error" && konsol.push(m.text()));
      await sayfa.goto(`file://${html}?adaptif=0&hiz=21600#korvan`);
      await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 240000 });
      await sayfa.waitForFunction(() => (window.__olcum?.simSaat() ?? 0) >= 40, null, { timeout: 240000 });
      await sayfa.evaluate(() => window.__olcum?.duraklat(true));
      await sayfa.waitForFunction(() => window.__olcum?.sahne.kontrol.ucuyorMu() === false, null, { timeout: 60000 });
      await sayfa.waitForTimeout(1200);
      const cizim = async (): Promise<number> => {
        const c = (await sayfa.evaluate(() => window.__olcum?.bilgi().cizimCagrisi)) ?? 0;
        enCokCizim = Math.max(enCokCizim, c);
        return c;
      };
      // 1. Genel (panel mobilde kapalı)
      await sayfa.screenshot({ path: ad("genel") });
      const c1 = await cizim();
      // 2. Bölge seçili (Varna) + bölge paneli
      await sayfa.evaluate(() => window.__olcum?.bolgeSec(window.__olcum.bolgeIndeksi("varna"), true));
      await sayfa.waitForFunction(() => window.__olcum?.sahne.kontrol.ucuyorMu() === false, null, { timeout: 60000 });
      if (mobil && (await sayfa.locator("#panel.kapali").count())) await sayfa.locator("#panel-tutamac").click();
      await sayfa.waitForTimeout(900);
      await sayfa.screenshot({ path: ad("bolge") });
      const c2 = await cizim();
      // 3. Dikkat sekmesi
      await sayfa.evaluate(() => window.__olcum?.sekme("dikkat"));
      await sayfa.waitForTimeout(600);
      await sayfa.screenshot({ path: ad("dikkat") });
      // 4. Görünüm menüsü açık (yalnız masaüstü açık tema)
      if (!mobil && tema === "light") {
        await sayfa.locator("#mercek-dugme").click();
        await sayfa.waitForTimeout(300);
        await sayfa.screenshot({ path: ad("mercek") });
        await sayfa.locator('#mercek-menu [data-mercek="sanayi"]').click();
        await sayfa.waitForTimeout(600);
        await sayfa.screenshot({ path: ad("sanayi") });
      }
      const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      console.log(`${cihaz} ${tema}: çizim çağrısı ${c1}/${c2}; yatay taşma ${tasma ? "VAR" : "yok"}; konsol hatası ${konsol.length}`);
      if (tasma || konsol.length) {
        hata++;
        if (konsol.length) console.log("  " + konsol.join(" | "));
      }
      await baglam.close();
    }
  }
  await tarayici.close();
  console.log(`en çok çizim çağrısı: ${enCokCizim}`);
  if (hata > 0 || enCokCizim > 12) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

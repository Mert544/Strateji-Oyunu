/**
 * Playwright doğrulaması (yazılım GL: SwiftShader; gerçek GPU'dan çok daha yavaştır).
 *   pnpm --filter @bolge/istemci olcum [--html <yol>] [--cikti <klasor>] [--sure 10] [--sim-bekle 60]
 * Masaüstü (1440x900) ve mobil (390x844) için açık + koyu ekran görüntüleri; 10 sn rAF ile ortalama fps ve çizim çağrısı.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import type { Page } from "playwright-core";

declare global {
  interface Window {
    __name?: (f: unknown) => unknown;
  }
}

const DEPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function arg(ad: string, vars: string): string {
  const i = process.argv.indexOf(`--${ad}`);
  return i >= 0 ? (process.argv[i + 1] ?? vars) : vars;
}

function chromeBul(): string {
  const kok = "/opt/pw-browsers";
  for (const d of readdirSync(kok)) {
    const y = join(kok, d, "chrome-linux", "chrome");
    if (d.startsWith("chromium-") && existsSync(y)) return y;
  }
  throw new Error("chromium bulunamadi");
}

interface Senaryo {
  ad: string;
  genislik: number;
  yukseklik: number;
  tema: "light" | "dark";
  mobil: boolean;
}

const SENARYOLAR: Senaryo[] = [
  { ad: "masaustu-acik", genislik: 1440, yukseklik: 900, tema: "light", mobil: false },
  { ad: "masaustu-koyu", genislik: 1440, yukseklik: 900, tema: "dark", mobil: false },
  { ad: "mobil-acik", genislik: 390, yukseklik: 844, tema: "light", mobil: true },
  { ad: "mobil-koyu", genislik: 390, yukseklik: 844, tema: "dark", mobil: true },
];

async function bekle(sayfa: Page, ms: number): Promise<void> {
  await sayfa.waitForTimeout(ms);
}

async function main(): Promise<void> {
  const html = resolve(arg("html", join(DEPO, "istemci", "dunya.html")));
  const cikti = resolve(arg("cikti", join(DEPO, "raporlar", "dunya")));
  const sure = Number(arg("sure", "10"));
  const simBekle = Number(arg("sim-bekle", "72"));
  const hizSecimi = arg("hiz", "21600");
  const sadece = arg("sadece", "");
  mkdirSync(cikti, { recursive: true });
  const tarayici = await chromium.launch({
    executablePath: chromeBul(),
    args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--no-sandbox"],
  });
  const sonuc: Record<string, unknown> = {};
  for (const s of SENARYOLAR) {
    if (sadece && !s.ad.includes(sadece)) continue;
    const baglam = await tarayici.newContext({
      viewport: { width: s.genislik, height: s.yukseklik },
      colorScheme: s.tema,
      deviceScaleFactor: s.mobil ? 2 : 1,
      isMobile: s.mobil,
      hasTouch: s.mobil,
    });
    const sayfa = await baglam.newPage();
    // tsx (esbuild keepNames) sayfa içi işlevlere __name ekler; sayfada tanımla.
    await sayfa.addInitScript("window.__name = (f) => f;");
    const konsol: string[] = [];
    sayfa.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") konsol.push(`${m.type()}: ${m.text()}`);
    });
    sayfa.on("pageerror", (e) => konsol.push(`pageerror: ${e.message}`));
    const t0 = Date.now();
    await sayfa.goto(`file://${html}?adaptif=0&hiz=${hizSecimi}#izle`);
    await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 60000 });
    const ilkKareMs = Date.now() - t0;
    // Simülasyon ilerlesin (akışlar/kapsam oluşsun): sim saatine göre bekle.
    await sayfa.waitForFunction((hedef) => (window.__olcum?.simSaat() ?? 0) >= hedef, simBekle, { timeout: 120000 });
    await sayfa.evaluate(() => window.__olcum?.duraklat(true));
    await bekle(sayfa, 800);
    await sayfa.screenshot({ path: join(cikti, `dunya-${s.ad}-genel.png`) });

    // Mal seçimi + bölge seçimi + uçuş
    await sayfa.evaluate(() => {
      const o = window.__olcum;
      if (!o) return;
      o.malSec(1);
    });
    await bekle(sayfa, 500);
    await sayfa.screenshot({ path: join(cikti, `dunya-${s.ad}-mal.png`) });
    await sayfa.evaluate(() => {
      const o = window.__olcum;
      if (!o) return;
      o.malSec(-1);
      o.bolgeSec(10, true);
    });
    await bekle(sayfa, 3200);
    await sayfa.screenshot({ path: join(cikti, `dunya-${s.ad}-bolge.png`) });

    // fps + çizim çağrısı: simülasyonu sürdür, genel görünüme dön ve 10 sn ölç
    await sayfa.evaluate(() => {
      const o = window.__olcum;
      if (!o) return;
      o.duraklat(false);
      o.bolgeSec(-1);
      o.sahne.noktayaUc(33, 41, 1.0);
    });
    await bekle(sayfa, 2500);
    const olcum = await sayfa.evaluate(
      (sn) =>
        new Promise<{ fps: number; minCagri: number; maxCagri: number; ortCagri: number; ucgen: number; kare: number; pikselOrani: number; cpuMs: number }>((coz) => {
          const t0 = performance.now();
          let n = 0;
          let min = 1e9, max = 0, top = 0, say = 0, ucgen = 0;
          const d = (): void => {
            n++;
            const b = window.__olcum?.bilgi();
            if (b) {
              min = Math.min(min, b.cizimCagrisi);
              max = Math.max(max, b.cizimCagrisi);
              top += b.cizimCagrisi;
              say++;
              ucgen = b.ucgen;
            }
            if (performance.now() - t0 < sn * 1000) requestAnimationFrame(d);
            else coz({ fps: n / ((performance.now() - t0) / 1000), minCagri: min, maxCagri: max, ortCagri: top / Math.max(1, say), ucgen, kare: n, pikselOrani: window.__olcum?.bilgi().pikselOrani ?? 0, cpuMs: window.__olcum?.bilgi().cpuMs ?? 0 });
          };
          requestAnimationFrame(d);
        }),
      sure,
    );
    await sayfa.screenshot({ path: join(cikti, `dunya-${s.ad}-sonra.png`) });
    sonuc[s.ad] = { ...olcum, ilkKareMs, konsol };
    console.log(s.ad, JSON.stringify({ ...olcum, ilkKareMs }), konsol.length ? `KONSOL: ${konsol.slice(0, 5).join(" | ")}` : "");
    await baglam.close();
  }
  await tarayici.close();
  writeFileSync(join(cikti, "olcum.json"), JSON.stringify(sonuc, null, 2));
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

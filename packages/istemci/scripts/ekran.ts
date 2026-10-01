/**
 * Özel ekran görüntüsü aracı (hata ayıklama): belirli bir görünüm kurup PNG alır.
 *   tsx scripts/ekran.ts --tema dark --boyut 1440x900 --ucus 33,43,0.7 --mal 1 --bolge 10 --sim 60 --ad x --cikti <klasor>
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
const arg = (ad: string, vars: string): string => {
  const i = process.argv.indexOf(`--${ad}`);
  return i >= 0 ? (process.argv[i + 1] ?? vars) : vars;
};

function chromeBul(): string {
  const kok = "/opt/pw-browsers";
  for (const d of readdirSync(kok)) {
    const y = join(kok, d, "chrome-linux", "chrome");
    if (d.startsWith("chromium-") && existsSync(y)) return y;
  }
  throw new Error("chromium bulunamadi");
}

async function main(): Promise<void> {
  const [w, h] = arg("boyut", "1440x900").split("x").map(Number) as [number, number];
  const mobil = w < 600;
  const tema = arg("tema", "dark") as "light" | "dark";
  const cikti = resolve(arg("cikti", join(DEPO, "raporlar", "dunya")));
  mkdirSync(cikti, { recursive: true });
  const tarayici = await chromium.launch({
    executablePath: chromeBul(),
    args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  const baglam = await tarayici.newContext({ viewport: { width: w, height: h }, colorScheme: tema, deviceScaleFactor: mobil ? 2 : 1, isMobile: mobil, hasTouch: mobil });
  const sayfa = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f;");
  sayfa.on("console", (m) => (m.type() === "error" || m.type() === "warning") && console.log("konsol:", m.text()));
  sayfa.on("pageerror", (e) => console.log("pageerror:", e.message));
  await sayfa.goto(`file://${resolve(arg("html", join(DEPO, "istemci", "dunya.html")))}?adaptif=0&hiz=${arg("hiz", "21600")}`);
  await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 60000 });
  await sayfa.waitForFunction((hedef) => (window.__olcum?.simSaat() ?? 0) >= hedef, Number(arg("sim", "48")), { timeout: 180000 });
  const sekme = arg("sekme", "");
  const mal = arg("mal", "");
  const bolge = arg("bolge", "");
  const ucus = arg("ucus", "");
  await sayfa.evaluate(
    ([sekme2, mal2, bolge2, ucus2]) => {
      const o = window.__olcum;
      if (!o) return;
      o.duraklat(true);
      if (mal2) o.malSec(Number(mal2));
      if (bolge2) o.bolgeSec(Number(bolge2), false);
      if (sekme2) o.sekme(sekme2);
      if (ucus2) {
        const [b, e, d] = ucus2.split(",").map(Number) as [number, number, number];
        o.sahne.noktayaUc(b, e, d);
      }
    },
    [sekme, mal, bolge, ucus],
  );
  await sayfa.waitForTimeout(Number(arg("bekle", "4500")));
  await sayfa.screenshot({ path: join(cikti, `${arg("ad", "ekran")}.png`) });
  console.log(JSON.stringify(await sayfa.evaluate(() => window.__olcum?.bilgi())));
  await tarayici.close();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

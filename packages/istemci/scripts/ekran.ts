/**
 * Özel ekran görüntüsü aracı (hata ayıklama): belirli bir görünüm kurup PNG alır.
 *   tsx scripts/ekran.ts --tema dark --boyut 1440x900 --ucus 33,43,0.7 --mal 1 --bolge 10 --sim 60 --ad x --cikti <klasor>
 * İklim/tarım için: --ileri <sim-saat> (işçi ilk kareden önce eşzamanlı ileri sarar), --tarim 1 (Tarım görünümü),
 * --js "<kod>" (duraklatıldıktan sonra sayfada çalıştırılır; ör. sahte kare ile görünüm denemesi),
 * --klip x,y,g,y (ekranın bir bölümü) ve --olcek 2 (cihaz piksel oranı) ile ayrıntı görüntüsü alınır.
 * --olay aktif|uyari (böyle bir olay görününceye kadar bekleyip duraklatır), --olay-uc <uzaklık> (olay merkezine uçar).
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
  const baglam = await tarayici.newContext({ viewport: { width: w, height: h }, colorScheme: tema, deviceScaleFactor: Number(arg("olcek", mobil ? "2" : "1")), isMobile: mobil, hasTouch: mobil });
  const sayfa = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f;");
  sayfa.on("console", (m) => (m.type() === "error" || m.type() === "warning") && console.log("konsol:", m.text()));
  sayfa.on("pageerror", (e) => console.log("pageerror:", e.message));
  await sayfa.goto(`file://${resolve(arg("html", join(DEPO, "istemci", "dunya.html")))}?adaptif=0&hiz=${arg("hiz", "21600")}&ileri=${arg("ileri", "0")}`);
  await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 240000 });
  await sayfa.waitForFunction((hedef) => (window.__olcum?.simSaat() ?? 0) >= hedef, Number(arg("sim", "48")), { timeout: 240000 });
  const olay = arg("olay", "");
  if (olay) {
    // İstenen evrede bir olay görününceye kadar bekle (kare 400 ms'de bir gelir; saat duraklatılmadığı için ilerler).
    await sayfa.waitForFunction(
      (evre) => {
        const k = window.__olcum?.kare();
        if (!k?.iklim) return false;
        return k.iklim.olaylar.some((o) => (evre === "aktif" ? k.saat >= o.baslangic && k.saat < o.bitis : k.saat < o.baslangic));
      },
      olay,
      { timeout: 600000, polling: 200 },
    );
  }
  const sekme = arg("sekme", "");
  const mal = arg("mal", "");
  const bolge = arg("bolge", "");
  const ucus = arg("ucus", "");
  const tarim = arg("tarim", "") === "1";
  const olayUc = arg("olay-uc", "");
  await sayfa.evaluate(
    ([sekme2, mal2, bolge2, ucus2, tarim2, olayUc2]) => {
      const o = window.__olcum;
      if (!o) return;
      o.duraklat(true);
      if (tarim2) o.tarim(true);
      if (olayUc2) {
        const ol = o.kare()?.iklim?.olaylar[0];
        const m = ol ? o.sahne.merkezler[ol.merkez] : undefined;
        if (m) o.sahne.kontrol.ucusYap({ p: m, dist: Number(olayUc2) });
      }
      if (mal2) o.malSec(Number(mal2));
      if (bolge2) o.bolgeSec(Number(bolge2), false);
      if (sekme2) o.sekme(sekme2);
      if (ucus2) {
        const [b, e, d] = ucus2.split(",").map(Number) as [number, number, number];
        o.sahne.noktayaUc(b, e, d);
      }
    },
    [sekme, mal, bolge, ucus, tarim ? "1" : "", olayUc],
  );
  const js = arg("js", "");
  if (js) await sayfa.waitForTimeout(1500); // işçiden uçuşan son kare gelsin, sahte karenin üzerine yazmasın
  if (js) await sayfa.evaluate(js);
  await sayfa.waitForTimeout(Number(arg("bekle", "4500")));
  const klip = arg("klip", "");
  const [kx, ky, kw, kh] = klip ? (klip.split(",").map(Number) as [number, number, number, number]) : [0, 0, 0, 0];
  await sayfa.screenshot({ path: join(cikti, `${arg("ad", "ekran")}.png`), ...(klip ? { clip: { x: kx, y: ky, width: kw, height: kh } } : {}) });
  console.log(JSON.stringify(await sayfa.evaluate(() => window.__olcum?.bilgi())));
  await tarayici.close();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

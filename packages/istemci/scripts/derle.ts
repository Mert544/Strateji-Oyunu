/**
 * İstemci derlemesi:
 *   1) dist/           : normal çok dosyalı çıktı (vite build; harita tembel bir parça)
 *   2) ../../istemci/dunya.html : TEK DOSYA HTML (vite-plugin-singlefile; kabuk + küre: JS, CSS, veri ve işçi satır içi)
 *   3) ../../istemci/harita.js  : harita yığını (MapLibre + pmtiles + görünüm; tek ES modülü), HTML'in yanında
 *      ve ../../istemci/harita-verisi/ (ODbL harita verisi). Karar 1 Ekim (seçenek A): tek dosya ≤400 KB gzip;
 *      harita yığını ayrı ölçülür ve yazdırılır (bütçe testi yok).
 *   5) ../../istemci/yazi/      : Inter alt kümesi (woff2, OFL) ve lisanslar; tek dosyaya gömülmez (bütçe), HTTP'de yüklenir.
 *   6) ../../istemci/giris.js   : giriş yığını (e-posta girişi ekranları + giris.css `?inline`), HTML'in yanında; YALNIZ e-posta kipinde yüklenir
 *      (giris/yukle.ts). `?token=` geliştirme yolu ve sahte bağdaştırıcı hiç yüklemez; kabuk paketine girmez (bütçe).
 *   4) ../../istemci/yuru.js    : L4 yürüyüş yığını (sahne + karo işçisi + karakter), HTML'in yanında. three.js
 *      yeniden paketlenmez: "three" içe aktarımları kabuğun koyduğu köprü nesnesinden okunur (src/yuru/three-kopru.ts).
 *      Protomaps z15 özütü varsa (veri-hatti önbelleği, gitignore'lu) harita-verisi/karolar/ altına kopyalanır.
 * Ardından boyut özeti yazdırılır.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import type { Plugin } from "vite";

const AYRI = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEPO = resolve(AYRI, "..", "..");

const kb = (b: number): string => (b / 1024).toFixed(1) + " KB";

/** yuru.js derlemesinde `three` → kabuğun köprü nesnesi (three-kopru.ts); three yeniden paketlenmez. */
async function threeKoprusu(): Promise<Plugin> {
  const { THREE_KOPRU, KOPRU_ADI } = await import("../src/yuru/three-kopru");
  const adlar = Object.keys(THREE_KOPRU);
  const kimlik = "\0three-kopru";
  return {
    name: "three-kopru",
    enforce: "pre",
    resolveId: (k) => (k === "three" ? kimlik : null),
    load: (k) =>
      k === kimlik
        ? `const T = globalThis[${JSON.stringify(KOPRU_ADI)}];\nif (!T) throw new Error("three köprüsü yok (yuru.js kabuktan yüklenmeli)");\n` + adlar.map((a) => `export const ${a} = T.${a};`).join("\n")
        : null,
  };
}

async function main(): Promise<void> {
  console.log("vite build: dist/");
  await build({ root: AYRI, configFile: join(AYRI, "vite.config.ts"), mode: "uretim", logLevel: "warn" });
  console.log("vite build: tek dosya");
  await build({ root: AYRI, configFile: join(AYRI, "vite.config.ts"), mode: "tek", logLevel: "warn" });
  console.log("vite build: harita.js");
  await build({
    root: AYRI,
    configFile: false,
    logLevel: "warn",
    mode: "tek",
    build: {
      outDir: join(AYRI, "dist-tek", "harita-yigini"),
      emptyOutDir: true,
      target: "es2022",
      minify: true,
      sourcemap: false,
      // lib kipi değil: ES biçiminde boşlukları küçültmüyor. Düz derleme + dışa aktarımları koruyan tek giriş.
      rollupOptions: {
        input: join(AYRI, "src", "harita", "gorunum.ts"),
        preserveEntrySignatures: "strict",
        output: { format: "es", entryFileNames: "harita.js", inlineDynamicImports: true },
      },
    },
  });

  console.log("vite build: giris.js");
  await build({
    root: AYRI,
    configFile: false,
    logLevel: "warn",
    mode: "tek",
    build: {
      outDir: join(AYRI, "dist-tek", "giris-yigini"),
      emptyOutDir: true,
      target: "es2022",
      minify: true,
      sourcemap: false,
      // Giriş ekranları ve giris.css (`?inline`) kabuktan ayrı: yalnız e-posta kipinde yüklenir (giris/yukle.ts)
      rollupOptions: {
        input: join(AYRI, "src", "giris", "baslat.ts"),
        preserveEntrySignatures: "strict",
        output: { format: "es", entryFileNames: "giris.js", inlineDynamicImports: true },
      },
    },
  });

  console.log("vite build: yuru.js");
  await build({
    root: AYRI,
    configFile: false,
    logLevel: "warn",
    mode: "tek",
    plugins: [await threeKoprusu()],
    worker: { format: "iife" },
    build: {
      outDir: join(AYRI, "dist-tek", "yuru-yigini"),
      emptyOutDir: true,
      target: "es2022",
      minify: true,
      sourcemap: false,
      // Karakter dosyası (~275 KB) satır içi: yığın tek dosya kalır
      assetsInlineLimit: 100_000_000,
      rollupOptions: {
        input: join(AYRI, "src", "yuru", "sahne.ts"),
        preserveEntrySignatures: "strict",
        output: { format: "es", entryFileNames: "yuru.js", inlineDynamicImports: true },
      },
    },
  });

  const hedefKlasor = join(DEPO, "istemci");
  mkdirSync(hedefKlasor, { recursive: true });
  const hedef = join(hedefKlasor, "dunya.html");
  copyFileSync(join(AYRI, "dist-tek", "index.html"), hedef);
  const haritaJs = join(hedefKlasor, "harita.js");
  copyFileSync(join(AYRI, "dist-tek", "harita-yigini", "harita.js"), haritaJs);
  const girisJs = join(hedefKlasor, "giris.js");
  copyFileSync(join(AYRI, "dist-tek", "giris-yigini", "giris.js"), girisJs);
  const yuruJs = join(hedefKlasor, "yuru.js");
  copyFileSync(join(AYRI, "dist-tek", "yuru-yigini", "yuru.js"), yuruJs);
  // Yazı tipi (Inter alt kümesi, OFL; tek dosyaya gömülmez: bütçe) ve simge lisansı sayfanın yanına
  cpSync(join(AYRI, "public", "yazi"), join(hedefKlasor, "yazi"), { recursive: true });
  copyFileSync(join(AYRI, "src", "tasarim", "LUCIDE-LISANS.txt"), join(hedefKlasor, "yazi", "LUCIDE-LISANS.txt"));
  // Yürüyüş karoları (Protomaps z15 özütü, ODbL; repo dışı önbellek): varsa sayfanın yanına
  const ozut = join(DEPO, "packages", "veri-hatti", ".onbellek", "karolar", "gebze-z15.pmtiles");
  if (existsSync(ozut))
    for (const kok of [join(AYRI, "dist", "harita-verisi"), join(hedefKlasor, "harita-verisi")]) {
      mkdirSync(join(kok, "karolar"), { recursive: true });
      copyFileSync(ozut, join(kok, "karolar", "gebze-z15.pmtiles"));
    }
  else console.warn("  uyarı: gebze-z15.pmtiles yok; yürüyüş karoları için ?yuru-karo=<url> verin");
  // Harita verisi (ODbL; il/ilçe sınırları, arsa ızgarası örneği) sayfanın yanına: harita/veri.ts fetch eder.
  const odbl = join(DEPO, "packages", "veri", "haritalar", "odbl");
  const haritaDosyalari = ["hiyerarsi.json", "iller.topo.json", "ilceler", "ornek/gebze-seritler.pmtiles", "ornek/gebze-hucreler.bhi.gz", "ornek/LISANS.txt"];
  for (const kok of [join(AYRI, "dist", "harita-verisi"), join(hedefKlasor, "harita-verisi")])
    for (const d of haritaDosyalari) cpSync(join(odbl, d), join(kok, d), { recursive: true });

  console.log("\nBoyutlar (ham / gzip):");
  const varlik = join(AYRI, "dist", "assets");
  let jsGz = 0;
  for (const d of readdirSync(varlik)) {
    const tam = join(varlik, d);
    const b = readFileSync(tam);
    const gz = gzipSync(b, { level: 9 }).length;
    if (d.endsWith(".js")) jsGz += gz;
    console.log(`  dist/assets/${d}: ${kb(b.length)} / ${kb(gz)}`);
  }
  const htmlB = readFileSync(hedef);
  console.log(`  toplam JS gzip (dist): ${kb(jsGz)}`);
  const htmlGz = gzipSync(htmlB, { level: 9 }).length;
  console.log(`  ${hedef}: ${kb(statSync(hedef).size)} / gzip ${kb(htmlGz)} (bütçe 400 KB: ${htmlGz <= 400 * 1024 ? "tamam" : "AŞILDI"})`);
  const hjs = readFileSync(haritaJs);
  console.log(`  ${haritaJs} (harita yığını, ayrı; yalnız harita açılınca): ${kb(hjs.length)} / gzip ${kb(gzipSync(hjs, { level: 9 }).length)}`);
  const gjs = readFileSync(girisJs);
  console.log(`  ${girisJs} (giriş yığını, ayrı; yalnız e-posta girişinde): ${kb(gjs.length)} / gzip ${kb(gzipSync(gjs, { level: 9 }).length)}`);
  const yazi = readFileSync(join(hedefKlasor, "yazi", "inter-tr.woff2"));
  console.log(`  ${join(hedefKlasor, "yazi", "inter-tr.woff2")} (yazı tipi, ayrı; yalnız HTTP'de yüklenir): ${kb(yazi.length)}`);
  const yjs = readFileSync(yuruJs);
  console.log(`  ${yuruJs} (yürüyüş yığını, ayrı; yalnız sokakta yürürken): ${kb(yjs.length)} / gzip ${kb(gzipSync(yjs, { level: 9 }).length)}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

/**
 * İstemci derlemesi:
 *   1) dist/           : normal çok dosyalı çıktı (vite build)
 *   2) ../../istemci/dunya.html : TEK DOSYA HTML (vite-plugin-singlefile; JS, CSS, veri ve işçi satır içi)
 * Ardından boyut özeti yazdırılır.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const AYRI = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEPO = resolve(AYRI, "..", "..");

const kb = (b: number): string => (b / 1024).toFixed(1) + " KB";

async function main(): Promise<void> {
  console.log("vite build: dist/");
  await build({ root: AYRI, configFile: join(AYRI, "vite.config.ts"), mode: "uretim", logLevel: "warn" });
  console.log("vite build: tek dosya");
  await build({ root: AYRI, configFile: join(AYRI, "vite.config.ts"), mode: "tek", logLevel: "warn" });

  const hedefKlasor = join(DEPO, "istemci");
  mkdirSync(hedefKlasor, { recursive: true });
  const hedef = join(hedefKlasor, "dunya.html");
  copyFileSync(join(AYRI, "dist-tek", "index.html"), hedef);

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
  console.log(`  ${hedef}: ${kb(statSync(hedef).size)} / gzip ${kb(gzipSync(htmlB, { level: 9 }).length)}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

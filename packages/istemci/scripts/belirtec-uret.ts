/**
 * Tasarım belirteçleri: src/tasarim/belirtec.ts (OKLCH kaynak) → src/tasarim/tema.css (yalnız hex). `pnpm --filter @bolge/istemci tasarim`
 * `--denetle`: dosya güncel değilse 1 ile çıkar (yazmaz).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { temaCss, yuruTemaCss } from "../src/tasarim/uret-css";

const kok = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const dosyalar: [string, string][] = [
  [join(kok, "tasarim", "tema.css"), temaCss()],
  [join(kok, "yuru", "yuru-tema.css"), yuruTemaCss()],
];
let eski = 0;
for (const [hedef, yeni] of dosyalar) {
  if (process.argv.includes("--denetle")) {
    if (readFileSync(hedef, "utf8") !== yeni) {
      console.error(`${hedef} güncel değil: pnpm --filter @bolge/istemci tasarim`);
      eski++;
    }
  } else {
    writeFileSync(hedef, yeni);
    console.log(`yazıldı: ${hedef} (${yeni.length} bayt)`);
  }
}
if (eski) process.exit(1);

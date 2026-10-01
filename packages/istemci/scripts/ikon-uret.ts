/**
 * Lucide simge sprite'ı: lucide-static paketinin `icons/` klasöründen src/tasarim/ikon.ts'deki IKONLAR listesini okur ve
 * src/tasarim/ikon-veri.ts'i yazar (yalnız kullanılan simgeler). Paket bağımlılık değildir: `npm pack lucide-static@1.49.0`
 * ile indirilip açılır, klasör yolu verilir.
 *   tsx scripts/ikon-uret.ts <lucide-static/icons klasoru>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IKONLAR } from "../src/tasarim/ikon";

const kaynak = process.argv[2];
if (!kaynak) throw new Error("kullanım: tsx scripts/ikon-uret.ts <lucide-static/icons>");
const semboller = IKONLAR.map((ad) => {
  const svg = readFileSync(join(kaynak, `${ad}.svg`), "utf8");
  const ic = svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "")
    .replace(/\s*\n\s*/g, "")
    .replace(/\s+\/>/g, "/>");
  return `<symbol id="i-${ad}" viewBox="0 0 24 24">${ic}</symbol>`;
});
const hedef = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "tasarim", "ikon-veri.ts");
const metin = `/**
 * ÜRETİLDİ: scripts/ikon-uret.ts (Lucide, lucide-static 1.49.0; ISC, Feather türevleri MIT — LUCIDE-LISANS.txt). Elle düzenlemeyin.
 * Yalnız kabuk (main.ts) içe aktarır: sprite sayfaya bir kez eklenir; harita.js / yuru.js \`ikon()\` ile <use> kullanır.
 */
const SEMBOLLER = ${JSON.stringify(semboller.join(""))};

/** Sprite'ı belgeye bir kez ekler. */
export function ikonlariKur(): void {
  if (document.getElementById("ikon-sprite")) return;
  const k = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  k.id = "ikon-sprite";
  k.setAttribute("aria-hidden", "true");
  k.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
  k.innerHTML = SEMBOLLER;
  document.body.prepend(k);
}
`;
writeFileSync(hedef, metin);
console.log(`yazıldı: ${hedef} (${semboller.length} simge, ${metin.length} bayt)`);

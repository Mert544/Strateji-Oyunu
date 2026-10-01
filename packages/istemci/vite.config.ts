import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const AYRI = dirname(fileURLToPath(import.meta.url));
const DEPO = resolve(AYRI, "..", "..");
const HARITALAR = resolve(DEPO, "packages", "veri", "haritalar");
const GERCEK = resolve(HARITALAR, "gercek-karadeniz.json");
const YEDEK_HARITA = resolve(HARITALAR, "sentetik-50.json");
const YEDEK_SINIR = resolve(AYRI, "src", "veri", "gecici-bolgeler.topo.json");

/**
 * `virtual:harita-verisi`: gerçek Karadeniz haritası (packages/veri/haritalar/gercek-karadeniz.json ve harita
 * dosyasındaki `sinirDosyasi` TopoJSON'u) varsa onu, yoksa geçici katmanı (sentetik-50 + Natural Earth illeri) içe aktarır.
 * Dosya sonradan eklenirse geliştirme sunucusu yeniden yüklenir; derleme her seferinde yeniden değerlendirir.
 */
function haritaVerisi(): Plugin {
  const kimlik = "virtual:harita-verisi";
  const cozulmus = "\0" + kimlik;
  return {
    name: "harita-verisi",
    resolveId(kaynak) {
      return kaynak === kimlik ? cozulmus : null;
    },
    load(kimligi) {
      if (kimligi !== cozulmus) return null;
      // BOLGE_HARITA=gecici: gerçek dosya olsa bile geçici katmanı zorla (yedek yolunu sınamak için).
      if (process.env["BOLGE_HARITA"] !== "gecici" && existsSync(GERCEK)) {
        this.addWatchFile(GERCEK);
        const harita = JSON.parse(readFileSync(GERCEK, "utf8")) as { sinirDosyasi?: string };
        const sinir = harita.sinirDosyasi ? resolve(HARITALAR, harita.sinirDosyasi) : null;
        if (sinir && existsSync(sinir)) {
          this.addWatchFile(sinir);
          return `import harita from ${JSON.stringify(GERCEK)};\nimport sinir from ${JSON.stringify(sinir)};\nexport const gercek = { harita, sinir };\nexport const yedek = null;\n`;
        }
        this.warn("gercek-karadeniz.json var ama sinirDosyasi bulunamadi; gecici katmana dusuluyor");
      } else {
        this.addWatchFile(HARITALAR);
      }
      return `import harita from ${JSON.stringify(YEDEK_HARITA)};\nimport sinir from ${JSON.stringify(YEDEK_SINIR)};\nexport const gercek = null;\nexport const yedek = { harita, sinir };\n`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const tek = mode === "tek";
  return {
    root: AYRI,
    base: "./",
    plugins: [haritaVerisi(), ...(tek ? [viteSingleFile()] : [])],
    worker: { format: "iife" as const },
    server: { fs: { allow: [DEPO] } },
    build: {
      outDir: tek ? "dist-tek" : "dist",
      emptyOutDir: true,
      target: "es2022",
      chunkSizeWarningLimit: 2500,
      cssCodeSplit: false,
      sourcemap: false,
      assetsInlineLimit: tek ? 100_000_000 : 4096,
    },
  };
});

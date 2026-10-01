/**
 * Izgara hattının dış araçları: tippecanoe (şerit/hücre vektör katmanı) ve go-pmtiles (`pmtiles extract`).
 * İkilileri .onbellek/araclar altındadır (git'e girmez); yoksa çağıran açık hata alır, hat uydurmaz.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { ONBELLEK } from "../yollar";

export const TIPPECANOE = resolve(ONBELLEK, "araclar/tippecanoe");
export const PMTILES = resolve(ONBELLEK, "araclar/pmtiles");

/** Düşük öncelikli çalıştırır (paylaşılan makine); Windows'ta `nice` yoktur, doğrudan çalışır. */
function dusukOncelik(komut: string, bagimsiz: string[]): [string, string[]] {
  return process.platform === "win32" ? [komut, bagimsiz] : ["nice", ["-n", "10", komut, ...bagimsiz]];
}

/**
 * GeoJSONSeq -> tek düzeyli (z15) PMTiles. Araç yoksa false (çağıran karar verir).
 * tippecanoe komut satırını ve dosya adlarını PMTiles üst verisine yazar (`generator_options`, `name`);
 * çıktının yerden ve makineden bağımsız (bayt bayt aynı) olması için araç PATH'ten adıyla, çıktı dizininde ve
 * göreli dosya adlarıyla çalıştırılır; mutlak yol üst veriye girmez.
 */
export function tippecanoe(girdi: string, cikti: string, katman: string): boolean {
  if (!existsSync(TIPPECANOE)) return false;
  rmSync(cikti, { force: true });
  const dizin = dirname(cikti);
  const [k, a] = dusukOncelik("tippecanoe", [
    "-q", "--force", "-o", basename(cikti), "-l", katman, "-n", katman,
    "-Z15", "-z15", "--no-feature-limit", "--no-tile-size-limit", "--no-tiny-polygon-reduction",
    "--no-line-simplification", relative(dizin, girdi),
  ]);
  const ayrac = process.platform === "win32" ? ";" : ":";
  execFileSync(k, a, { stdio: "inherit", cwd: dizin, env: { ...process.env, PATH: `${dirname(TIPPECANOE)}${ayrac}${process.env["PATH"] ?? ""}` } });
  return true;
}

/** Protomaps yapısından z15'e kadar bbox özütü. Kaynak URL sabitlenmiş yapıdır; ağ gerekir. */
export function karoOzutle(kaynakUrl: string, hedef: string, bbox: readonly [number, number, number, number]): void {
  if (!existsSync(PMTILES)) throw new Error(`pmtiles araci yok: ${PMTILES} (docs/arastirma/karo-ve-izgara-denemesi.md §7)`);
  rmSync(hedef, { force: true });
  const [k, a] = dusukOncelik(PMTILES, ["extract", kaynakUrl, hedef, `--bbox=${bbox.join(",")}`, "--maxzoom=15"]);
  try {
    // İlerleme çubuğu günlüğü şişirir: çıktı yutulur, hata olursa stderr'in sonu gösterilir.
    execFileSync(k, a, { stdio: ["ignore", "ignore", "pipe"], maxBuffer: 64 << 20 });
  } catch (e) {
    const err = (e as { stderr?: Buffer }).stderr?.toString("utf8").split(/[\r\n]+/).filter((l) => l.includes("rror") || l.includes("fatal")).slice(-5).join(" | ");
    throw new Error(`pmtiles extract basarisiz (${kaynakUrl}): ${err ?? String(e)}`);
  }
}

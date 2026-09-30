/**
 * Ölçüm raporu (packages/olcum JSON çıktısı) okuyucu. Şema değişikliklerine dayanıklıdır:
 * eksik alanlar atlanır, tanınmayan biçimde null döner.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { RaporHipotezi, RaporOzeti } from "./tipler";

type Ham = Record<string, unknown>;

function nesne(x: unknown): Ham | null {
  return typeof x === "object" && x !== null && !Array.isArray(x) ? (x as Ham) : null;
}
function metin(x: unknown, yedek = ""): string {
  return typeof x === "string" ? x : yedek;
}
function sayi(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/** Ham JSON'dan görüntülenecek özeti çıkarır; hipotez listesi yoksa null. */
export function raporOzetle(ham: unknown, kaynak: string): RaporOzeti | null {
  const r = nesne(ham);
  const liste = r && Array.isArray(r["hipotezler"]) ? (r["hipotezler"] as unknown[]) : null;
  if (!r || !liste) return null;
  const hipotezler: RaporHipotezi[] = [];
  for (const x of liste) {
    const h = nesne(x);
    if (!h) continue;
    const olcum = nesne(h["olcum"]);
    const esik = nesne(h["esik"]);
    const tohumlar = Array.isArray(h["tohumBasina"]) ? (h["tohumBasina"] as unknown[]) : [];
    hipotezler.push({
      kimlik: metin(h["kimlik"], "?"),
      hipotez: metin(h["hipotez"]),
      olcumAd: metin(olcum?.["ad"]),
      deger: sayi(olcum?.["deger"]),
      birim: metin(olcum?.["birim"]),
      esik: metin(esik?.["aciklama"]),
      verdict: metin(h["verdict"], "belirsiz"),
      tohumBasariOrani: sayi(h["tohumBasariOrani"]) ?? 0,
      tohumBasina: tohumlar.flatMap((t) => {
        const o = nesne(t);
        const th = sayi(o?.["tohum"]);
        return o && th !== null ? [{ tohum: th, olcum: sayi(o["olcum"]), verdict: metin(o["verdict"], "belirsiz") }] : [];
      }),
    });
  }
  if (hipotezler.length === 0) return null;
  const tohumlar = Array.isArray(r["tohumlar"]) ? (r["tohumlar"] as unknown[]).flatMap((t) => (sayi(t) === null ? [] : [t as number])) : [];
  return { tohumlar, hizli: r["hizli"] === true, hipotezler, kaynak };
}

/** Dosyadan okur; dosya yoksa veya bozuksa null döner (bölüm gizlenir). */
export function raporOku(yol: string): RaporOzeti | null {
  try {
    return raporOzetle(JSON.parse(readFileSync(yol, "utf8")) as unknown, basename(yol));
  } catch {
    return null;
  }
}

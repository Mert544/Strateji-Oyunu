/**
 * Parsel fikstürlerini diskten yükleme (Node). Sözleşme ve doğrulama parsel.ts'dedir; üretici uretici/parsel-fikstur.ts.
 * Not: node:fs kullanır; tarayıcı paketine girmez.
 */
import { readFileSync } from "node:fs";
import { dogrulaParselFiksturu, type ParselFiksturu } from "./parsel";
import type { HaritaDosyasi } from "./tipler";

function oku(goreliYol: string): unknown {
  const url = new URL(`../${goreliYol}`, import.meta.url);
  try {
    return JSON.parse(readFileSync(url, "utf8")) as unknown;
  } catch (e) {
    throw new Error(`Parsel dosyasi okunamadi (${goreliYol}): ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * haritalar/parsel/<ad>.parsel.json fikstürünü okur ve kaynak bölge haritasıyla (haritalar/<ad>.json) birlikte doğrular.
 * Geçersizse ayrıntılı hata fırlatır. Her çağrıda yeni kopya döner. `ad`: "mini-6" | "sentetik-50" (ya da üretilmiş başka ad).
 */
export function parselFiksturuYukle(ad: string): ParselFiksturu {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(ad)) throw new Error(`Gecersiz parsel fiksturu adi: "${ad}"`);
  const ham = oku(`haritalar/parsel/${ad}.parsel.json`);
  const harita = oku(`haritalar/${ad}.json`) as HaritaDosyasi;
  const s = dogrulaParselFiksturu(ham, { harita });
  if (!s.gecerli) throw new Error(`Parsel fiksturu gecersiz (${ad}):\n - ${s.hatalar.join("\n - ")}`);
  return ham as ParselFiksturu;
}

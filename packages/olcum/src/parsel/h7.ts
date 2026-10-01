/**
 * H7 (parsel dünyası) — Ayarla-unut ne çöker ne eşitlenir (docs/11 §8.1; bot: kur-unut). Bölge kipiyle aynı ifade,
 * SAHİP düzeyinde: aynı tohumla iki koşu; odak SAHİBİN (tüm işletme düğümleri) 24/48/72. saatte son 24 saatlik brüt üretim
 * değeri (sabit taban fiyat), kur-unut / aktif oranı. Üç noktada da [%50, %85] içindeyse geçti.
 */
import type { Verdict } from "../tipler";
import { oranPpm, tamsayiDenetle } from "./ortak";

export const PARSEL_H7_ALT_PPM = 500_000;
export const PARSEL_H7_UST_PPM = 850_000;
export const PARSEL_H7_NOKTALAR_SAAT: readonly number[] = [24, 48, 72];

export interface UretimNoktasi {
  saat: number;
  /** Pencere üretim değeri (tamsayı, ör. mili-₺). */
  kurUnut: number;
  aktif: number;
}

export interface AyarlaUnutSonucu {
  verdict: Verdict;
  /** Saat -> oran ppm (aktif üretim 0 ise null). */
  oranlar: Record<number, number | null>;
  /** Aralık dışı noktaların yönü: "esitlenme" (> %85) ya da "cokus" (< %50). */
  sapmalar: Record<number, "esitlenme" | "cokus">;
}

export function ayarlaUnutOrani(noktalar: readonly UretimNoktasi[]): AyarlaUnutSonucu {
  const oranlar: Record<number, number | null> = {};
  const sapmalar: Record<number, "esitlenme" | "cokus"> = {};
  let olculemedi = false;
  for (const n of noktalar) {
    tamsayiDenetle(n.kurUnut, "kurUnut");
    tamsayiDenetle(n.aktif, "aktif");
    if (n.aktif <= 0) {
      oranlar[n.saat] = null;
      olculemedi = true;
      continue;
    }
    const o = oranPpm(Math.max(0, n.kurUnut), n.aktif);
    oranlar[n.saat] = o;
    if (o > PARSEL_H7_UST_PPM) sapmalar[n.saat] = "esitlenme";
    else if (o < PARSEL_H7_ALT_PPM) sapmalar[n.saat] = "cokus";
  }
  const verdict: Verdict = Object.keys(sapmalar).length > 0 ? "kaldi" : olculemedi || noktalar.length === 0 ? "belirsiz" : "gecti";
  return { verdict, oranlar, sapmalar };
}

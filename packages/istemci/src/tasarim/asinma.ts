/**
 * Tesis aşınması görünümü (saf): kare `ozel.tesisAsinma: [tesis, asinmaPpm]` (asinmaPpm 0..1.000.000; yalnız sahibine, yalnız
 * aşınması > 0 olan tesisler). Üç kademe; eşikler TEK sabittedir (yürüyüş ve harita aynı kademeyi kullanır):
 *   0 yok (< %10), 1 hafif (%10 .. < %40), 2 belirgin (>= %40).
 * Not (A3 §5.10 / A2 öneri C): verim kaybı = aşınma × `asinmaVerimKaybiTavaniPpm` (öneri %25 tavan); yani aşınma %40'ta
 * verim kaybı en çok %10, %100'de %25'tir. Kademe eşikleri aşınma payı üzerinedir (oyuncunun bakımda gördüğü sayı), tavandan
 * bağımsızdır; tavan değişirse eşikler değişmez.
 */
export const PPM = 1_000_000;
export const ASINMA_ESIKLERI = { hafifPpm: 100_000, belirginPpm: 400_000 } as const;

export type AsinmaKademesi = 0 | 1 | 2;

/** Aşınma (ppm) -> kademe; tanımsız, NaN ve < eşik 0'dır. */
export function asinmaKademesi(asinmaPpm: number | undefined): AsinmaKademesi {
  if (asinmaPpm === undefined || !(asinmaPpm >= ASINMA_ESIKLERI.hafifPpm)) return 0;
  return asinmaPpm >= ASINMA_ESIKLERI.belirginPpm ? 2 : 1;
}

/** Yürüyüşte malzeme renginin soluk hedefe karışım payı (kademe 0: yok). */
export const ASINMA_SOLMA = [0, 0.18, 0.4] as const;

/** L3 yapı dolgu/kenar opaklığının kademe çarpanı (özellik `w`; yok ya da 0: 1). */
export const ASINMA_OPAKLIK = [1, 0.8, 0.6] as const;

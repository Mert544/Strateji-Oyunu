/**
 * Parsel dünyası metriklerinin ortak yardımcıları (S9; docs/olcum/h1-h9-parsel-tanimlari.md).
 *
 * Bu klasördeki işlevler SAFTIR: çekirdeğe (Simulasyon) bağlanmaz, girdi olarak düz veri (kayıt dizileri) alır, girdiyi
 * değiştirmez. Oranlar tamsayı ppm (1_000_000 = %100), aşağı yuvarlanır; ara çarpımlar BigInt ile taşmasız yapılır.
 * Yalnız bilgi göstergesi olan entropi kayan noktayla hesaplanıp ppm'e yuvarlanır (karara girmez).
 */
import type { Verdict } from "../tipler";

export const PPM = 1_000_000;
export const SAAT_MS = 3_600_000;
export const GUN_MS = 24 * SAAT_MS;

/** Güvenli tamsayı denetimi (ölçüm girdileri tamsayı olmalı: mili-₺, hücre, ms). */
export function tamsayiDenetle(x: number, ad: string): void {
  if (!Number.isSafeInteger(x)) throw new Error(`parsel olcum: ${ad} tamsayi olmali (bulunan ${String(x)})`);
}

/** pay / payda, ppm, aşağı yuvarlı (BigInt; taşma yok). payda > 0, pay >= 0 olmalı. */
export function oranPpm(pay: number, payda: number): number {
  tamsayiDenetle(pay, "pay");
  tamsayiDenetle(payda, "payda");
  if (payda <= 0) throw new Error(`parsel olcum: payda pozitif olmali (bulunan ${payda})`);
  if (pay < 0) throw new Error(`parsel olcum: pay negatif olamaz (bulunan ${pay})`);
  return Number((BigInt(pay) * BigInt(PPM)) / BigInt(payda));
}

/** Göreli değişim |yeni − temel| / |temel|, ppm (aşağı yuvarlı). temel = 0 ise tanımsız (null). */
export function goreliDegisimPpm(temel: number, yeni: number): number | null {
  tamsayiDenetle(temel, "temel");
  tamsayiDenetle(yeni, "yeni");
  if (temel === 0) return null;
  const fark = BigInt(yeni) - BigInt(temel);
  const mutlak = fark < 0n ? -fark : fark;
  const t = BigInt(temel < 0 ? -temel : temel);
  return Number((mutlak * BigInt(PPM)) / t);
}

/** Medyanın İKİ KATI (kesirden kaçınmak için): tek uzunlukta 2·orta, çift uzunlukta iki ortanın toplamı. Boşsa null. */
export function medyanIkiKat(dizi: readonly number[]): number | null {
  if (dizi.length === 0) return null;
  const s = [...dizi].sort((a, b) => a - b);
  const o = s.length >> 1;
  return s.length % 2 === 1 ? 2 * (s[o] as number) : (s[o - 1] as number) + (s[o] as number);
}

/** Tamsayı medyan (çift uzunlukta iki ortanın ortalaması, aşağı yuvarlı). Boşsa null. */
export function tamsayiMedyan(dizi: readonly number[]): number | null {
  const m2 = medyanIkiKat(dizi);
  return m2 === null ? null : Math.floor(m2 / 2);
}

/** Koşullardan birleşik karar: biri false -> kaldı; biri null (ölçülemedi) -> belirsiz; hepsi true -> geçti. */
export function kosullardanVerdict(kosullar: ReadonlyArray<boolean | null>): Verdict {
  if (kosullar.some((k) => k === false)) return "kaldi";
  if (kosullar.some((k) => k === null)) return "belirsiz";
  return "gecti";
}

/** Dizge karşılaştırıcısı (yerel ayardan bağımsız; eşitlikte 0). */
export function dizgeSirala(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

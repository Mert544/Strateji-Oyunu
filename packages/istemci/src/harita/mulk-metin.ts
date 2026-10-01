/**
 * İşletmem "yeni oyuncu hakların" bloğu metinleri (T1 tablosu `mulk.koruma.*`; A6: telefonda tek özet satırı). Yer tutucu `{ad}`; yüzde
 * ve süre çağıranın değeridir (sabit yazılmaz: indirim yüzdesi parametreden). Büyük harf yalnız cümle başında.
 */
export const MULK_METIN = {
  "mulk.koruma.ozet": "Yeni oyuncu hakların · {n}",
  "mulk.koruma.kalkan": "Yeni oyuncu kalkanı · {sure} kaldı",
  "mulk.koruma.kalkan_ayrinti": "Pazarla ticarette vergi ve komisyon ödemezsin.",
  "mulk.koruma.ayrilmis": "Ayrılmış hücre hakkı · {sure} kaldı",
  "mulk.koruma.ayrilmis_ayrinti": "{yer} ilçesinde, ilk {gun} gün boyunca yeni oyunculara ayrılmış hücreleri taban fiyattan alabilirsin.",
  "mulk.koruma.ayrilmis_ayrinti_yersiz": "Katılım ilçende, ilk {gun} gün boyunca yeni oyunculara ayrılmış hücreleri taban fiyattan alabilirsin.",
  "mulk.koruma.indirim": "İlk yapı indirimi {yuzde} · {n} yapı daha",
  /** Yüzde bilinmiyorsa (parametre yok): yer tutucusuz biçim. */
  "mulk.koruma.indirim_yuzdesiz": "İlk yapı indirimi · {n} yapı daha",
} as const;

export type MulkMetinAnahtari = keyof typeof MULK_METIN;

/** `{ad}` yer tutucularını doldurur (HTML kaçışı çağıranındır). */
export function mulkMetni(anahtar: MulkMetinAnahtari, yer: Readonly<Record<string, string | number>> = {}): string {
  return MULK_METIN[anahtar].replace(/\{([a-z_]+)\}/g, (tum, ad: string) => (ad in yer ? String(yer[ad]) : tum));
}

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
  /** Dikkat maddesi: biten yapı ("Gebze: Çiftlik hazır."); K1 mulk-panel.ts:116, dikkat.ts:135, gelen-kutusu.ts:53 literal "inşaatı bitti" yerine bunu kullanır (sahip eki yok: ad çekimsiz). */
  "dikkat.insaat_bitti": "{ilce}: {ad} hazır.",
  /** Yapı maliyet kartı süre değeri, yeni oyuncu hızı uygulanıyorken (yapi-sure.ts; hız yoksa yalnız süre yazılır). Yer tutucular `sureMetni` çıktısıdır. */
  "yapi.satir_sure_hizli": "{sure} (yeni oyuncu hızı; normalde {normal})",
  /** Harita alt çubuğu ilçe hücre sınırı (gorunum.ts:940/961/976 "Bu ilçede hücre sınırın 6 / 72" yerine): 72 sınırdır, toplam değil. */
  "harita.hint.hucre_siniri": "Bu ilçede {n} hücren var; en çok {tavan}.",
} as const;

export type MulkMetinAnahtari = keyof typeof MULK_METIN;

/** `{ad}` yer tutucularını doldurur (HTML kaçışı çağıranındır). */
export function mulkMetni(anahtar: MulkMetinAnahtari, yer: Readonly<Record<string, string | number>> = {}): string {
  return MULK_METIN[anahtar].replace(/\{([a-z_]+)\}/g, (tum, ad: string) => (ad in yer ? String(yer[ad]) : tum));
}

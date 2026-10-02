/**
 * Harita görünürlük kararları (saf; DOM ve harita yok; test/harita-gorunurluk.test.ts).
 *
 * Düzeyler: 0 küre, 1 il (ilçe seçili değil), 2 ilçe, 3 arsa (L3). Yapı çizimi ve "Geri al" şeridi yalnız ilgili ilçe ya da
 * arsa düzeyinde görünür; il ve küre düzeyinde ilçe adlarının üstüne binmez.
 */

export interface YapiCizimi {
  /** Yapıların hücre dolgusu (yapı kaynağı). */
  dolgu: boolean;
  /** "Çiftlik · Gövde" etiketleri (yalnız arsa düzeyi). */
  etiket: boolean;
}

/** İlçe seçili değilken (il, küre) hiçbir şey çizilmez; ilçede dolgu, arsa düzeyinde etiket de çizilir. */
export function yapiCizimi(ilce: string | null, duzey: number): YapiCizimi {
  if (!ilce || duzey < 2) return { dolgu: false, etiket: false };
  return { dolgu: true, etiket: duzey >= 3 };
}

/**
 * Onaydan sonraki "Geri al" şeridi görünür mü? Süre dolmadıysa (`kalanMs` > 0), harita ilçe ya da arsa düzeyindeyse ve
 * açık ilçe işlemin ilçesiyse. Gizliyken sayaç sürer: 5 dakika dolmadan ilçeye dönülünce şerit yeniden görünür.
 */
export function geriSeridiGorunur(duzey: number, simdikiIlce: string | null, islemIlcesi: string, kalanMs: number): boolean {
  return kalanMs > 0 && duzey >= 2 && simdikiIlce !== null && simdikiIlce === islemIlcesi;
}

/**
 * Yapının inşaatı bitti mi (hepsi tesis, hiçbiri süren inşaat)? Bitince "Geri al" şeridi kapanır (geri alınacak inşaat kalmadı); hücre bilgisi yoksa false (şerit süresini sürdürür).
 * `hucre`: hücre kimliği → `{ tesis?, insaat? }` (sahiplik hücreleri).
 */
export function yapiBittiMi(hucre: (id: string) => { tesis?: number; insaat?: number } | undefined, hucreler: readonly string[]): boolean {
  if (hucreler.length === 0) return false;
  return hucreler.every((id) => {
    const h = hucre(id);
    return h !== undefined && h.tesis !== undefined && h.insaat === undefined;
  });
}

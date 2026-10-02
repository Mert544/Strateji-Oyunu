/**
 * Yerleş ekranı çerçeve metinleri (T1 metin tablosu "Yerleş ekranı ve ilçe kartı", sözleşme "H. Ek"; anahtarlar `yerles.*`).
 * İlçeye özgü metin (neden, bilinen yanı, açılış cümlesi) `tasarim/ilce-metin.ts` sözlüğünden gelir; burası yalnız çerçevedir.
 * YALNIZ harita yığınından içe aktarılır (yerles-ekrani.ts). Yer tutucu `{ad}` biçimindedir; sayı ve para yoktur (ayrılmış hücre sayısı
 * gösterilmez). Büyük harf yalnız cümle başında.
 */

export const YERLES_METIN = {
  "yerles.baslik": "Nerede başlamak istersin?",
  "yerles.hazirlaniyor": "Yerleşim yerleri hazırlanıyor…",
  "yerles.alt": "Mahallende ya da seçtiğin yerde başla. Sana üç ilçe önerdik.",
  "yerles.kart.doluluk": "{yuzde} dolu",
  "yerles.kart.doluluk_yok": "Doluluk bilinmiyor",
  "yerles.kart.ayrilmis_bol": "Yeni oyunculara ayrılmış arsa bol",
  "yerles.kart.ayrilmis_var": "Yeni oyunculara ayrılmış arsa var",
  "yerles.kart.ayrilmis_az": "Yeni oyunculara ayrılmış arsa az",
  "yerles.kart.ayrilmis_yok": "Yeni oyunculara ayrılmış arsa kalmadı",
  "yerles.kart.acilis": "Açılış önerisi: {ad}",
  "yerles.kart.hazir": "Hazır arsalar var",
  "yerles.kart.izgara_yakinda": "Arsa ızgarası yakında: yalnız gezebilirsin",
  "yerles.kart.sunucuda_yok": "Bu ilçe henüz açık değil",
  "yerles.kart.nufus": "Nüfus: {n}",
  "yerles.acilis.tarim": "Tarım",
  "yerles.acilis.sanayi": "Sanayi",
  "yerles.acilis.pazar": "Pazar",
  "yerles.acilis.baslik": "Açılış önerisi",
  "yerles.acilis.not": "Bu yalnız bir öneri; istediğin zaman başka yöne dönebilirsin.",
  "yerles.dugme.basla": "Burada başla",
  "yerles.dugme.izgara": "İlçeyi gez",
  "yerles.dugme.hazirlaniyor": "Hazırlanıyor…",
  "yerles.dugme.baska": "Başka ilçe öner",
  "yerles.dugme.atla": "Şimdilik atla",
} as const;

export type YerlesMetinAnahtari = keyof typeof YERLES_METIN;

/** `{ad}` yer tutucularını doldurur (HTML kaçışı çağıranındır). Bilinmeyen anahtar anahtarın kendisi. */
export function yerlesMetni(anahtar: YerlesMetinAnahtari, yer: Readonly<Record<string, string | number>> = {}): string {
  return YERLES_METIN[anahtar].replace(/\{([a-z_]+)\}/g, (tum, ad: string) => (ad in yer ? String(yer[ad]) : tum));
}

/**
 * Yer tutucuları HTML ile doldurur: metnin kendi parçaları kaçışlanır, `yer` değerleri ZATEN güvenli HTML olarak verilir (ör. kalın ad).
 * Kaçışı kendi uyguladığımız için çağıran `esc` yapmaz.
 */
export function yerlesMetniHtml(anahtar: YerlesMetinAnahtari, yer: Readonly<Record<string, string>>): string {
  const esc = (t: string): string => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
  return YERLES_METIN[anahtar]
    .split(/(\{[a-z_]+\})/)
    .map((p) => {
      const m = /^\{([a-z_]+)\}$/.exec(p);
      return m && m[1] !== undefined && m[1] in yer ? yer[m[1]]! : esc(p);
    })
    .join("");
}

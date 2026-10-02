/**
 * Yöntem seçici, "Yöntemi değiştir" ve şebeke gideri metin tablosu (kaynak: SP/takim/a1/yontem-secici-metin.md, A1 anahtarları birebir; Tasarım onaylı kararlar). Yer tutucu adları
 * ASCII'dir (`{yapi}`, `{yontem}`, `{girdi}`, `{cikti}`, `{gider}`, `{n}`, `{eski}`, `{yeni}`); değerleri çağıran doldurur: para `paraMili(…, "yukari")` çıktısıdır (şablonda ₺ yazılmaz),
 * "/sa" birimi bitişik. Büyük harf yalnız cümle başında (testle korunur). Çekirdek ret iletisi -> anahtar eşlemesi `YONTEM_RET_KALIPLARI`'dadır (`hata-mulk.ts` kullanır).
 * A1 tablosunda olmayıp bu dosyada ek olan anahtarlar `(ek)` ile işaretlidir (T1 L. Ek yüzey eşlemesinin gerektirdiği: seçili işareti, kart özeti, bedel notu); A1/T1 onayı bekler.
 */
export const YONTEM_METIN = {
  "yontem.secici.baslik": "{yapi} ne yapsın?",
  "yontem.secici.alt": "Seçimi sonradan değiştirebilirsin; ücret yok.",
  "yontem.secici.satir": "{yontem} · saatte {girdi} → {cikti}",
  /** (ek) Kart özet satırı: yöntem adı `.ym-ad`'da ayrı durur, özet `satir`'ın adsız hâlidir. */
  "yontem.secici.ozet": "saatte {girdi} → {cikti}",
  "yontem.secici.girdisiz": "girdi istemez",
  "yontem.secici.degisir": "Toprağa ve iklime göre değişir.",
  "yontem.secici.gider": "Şebeke gideri ≈ {gider}/sa",
  "yontem.secici.sebeke_not": "Elektrik ve yakıt şebekeden gelir; santral kurman gerekmez.",
  "yontem.secici.zincir_not": "Ekmek için bir değirmen ve bir fırın gerekir; ikisi ayrı fabrikadır.",
  "yontem.secici.teknoloji": "Teknolojisini açman gerekir.",
  "yontem.secici.sec": "Bir yöntem seç.",
  /** (ek) Seçili yöntemin girdisi depoda yok (T-3, T3 tesis-rol-metin.md): `{mal}` mal adı (küçük harf). */
  "yontem.secici.stok_yok": "Depoda {mal} yok.",
  /** (ek) `.ym-isaret` (renk dışı işaret): seçili kartta. */
  "yontem.secici.secili": "Seçili",
  "yontem.etiket": "{yapi} · {yontem}",
  "yontem.ret.yalniz_tesis": "Bu yapıya yöntem seçilmez.",
  "yontem.degistir.dugme": "Yöntemi değiştir",
  "yontem.degistir.dugme_etiket": "{yapi} yöntemini değiştir",
  "yontem.degistir.insaatta": "İnşa bitince yöntemi değiştirebilirsin.",
  "yontem.degistir.baslik": "{yapi}: yöntemi değiştir",
  "yontem.degistir.simdiki": "Şimdiki yöntem: {yontem}",
  /** Tasarım düzeltmesi: onay sorusu yalnız soru; sonuç ve bedel `ozet` ile `bedel_yok` satırlarındadır. */
  "yontem.degistir.onay": "Yöntemi değiştirmek istiyor musun?",
  /** (ek) `.ym-onay-ozet`: "{eski} → {yeni}". */
  "yontem.degistir.ozet": "{eski} → {yeni}",
  /** (ek) Onayın sonucu satırı (A1 onay metninin ikinci cümlesi). */
  "yontem.degistir.bedel_yok": "Ücret yok; stoğun kalır.",
  "yontem.degistir.dugme_onay": "Değiştir",
  "yontem.degistir.vazgec": "Vazgeç",
  "yontem.degistir.tamam": "Yöntem değişti: {yontem}.",
  "yontem.ret.tesis_yok": "Bu yapı artık yok.",
  "yontem.ret.bilinmiyor": "Bu yöntem bulunamadı.",
  "yontem.ret.turde_yok": "Bu yapıda bu yöntem kullanılamaz.",
  "yontem.ret.kapali": "Bu yöntem için teknolojiyi açman gerekir.",
  "yontem.ret.sahip_degil": "Bu yapı senin değil.",
  "sebeke.baslik": "Şebeke gideri",
  "sebeke.satir_elektrik": "Elektrik · {n} birim/sa · {gider}/sa",
  "sebeke.satir_yakit": "Yakıt · {n} birim/sa · {gider}/sa",
  /** (ek) Elektrik ve yakıt dışındaki şebeke malı (veri `mulk.sebeke.mallar` genişlerse): mal adı sözlükten. */
  "sebeke.satir_mal": "{mal} · {n} birim/sa · {gider}/sa",
  "sebeke.toplam": "Toplam ≈ {gider}/sa",
  "sebeke.not": "Elektrik ve yakıt şebekeden gelir; santral kurman gerekmez.",
  "sebeke.yok": "Şebekeden alım yok.",
} as const;

export type YontemMetinAnahtari = keyof typeof YONTEM_METIN;

/**
 * Çekirdek ret iletisi (küçük harfli ASCII; ekranda gösterilmez) -> metin anahtarı. Kalıp ileti ön ekidir; `hata-mulk.ts` bu listeyi genel kurallardan ÖNCE dener.
 * `bolgede boyle bir tesis yok` ölçek büyütme kuralıyla aynı iletidir ("Bu tesis artık yok."): yöntem bağlamında da aynı anlam.
 */
export const YONTEM_RET_KALIPLARI: ReadonlyArray<readonly [RegExp, YontemMetinAnahtari]> = [
  [/^yontem yalniz tesis turunde verilebilir/, "yontem.ret.yalniz_tesis"],
  [/^bilinmeyen yontem/, "yontem.ret.bilinmiyor"],
  [/^yontem bu tesis turunde yok/, "yontem.ret.turde_yok"],
  [/^yontem acik degil/, "yontem.ret.kapali"],
  [/^bolgede boyle bir tesis yok/, "yontem.ret.tesis_yok"],
  [/^bolge oyuncunun degil|^bilinmeyen bolge/, "yontem.ret.sahip_degil"],
];

const YER_TUTUCU = /\{([a-z_]+)\}/g;

/** `{ad}` yer tutucularını doldurur (HTML kaçışı çağıranındır; verilmeyen yer tutucu olduğu gibi kalır). */
export function yontemMetni(anahtar: YontemMetinAnahtari, yer: Readonly<Record<string, string | number>> = {}): string {
  return YONTEM_METIN[anahtar].replace(YER_TUTUCU, (tum, ad: string) => (ad in yer ? String(yer[ad]) : tum));
}

/**
 * "Pazar'da sat" (Mal sekmesi, ihracat emri) metin tablosu. Kaynak: SP/takim/a1/pazarda-sat-metin.md (A1 anahtarları birebir, Tasarım düzeltmeleri dahil; T1 onayı bekler).
 * Yer tutucu adları ASCII (`{mal}`, `{n}`, `{g}`, `{fiyat}`, `{net}`, `{gelir}`, `{odul}`); para değerleri çağıranın `paraMili(…, "asagi")` çıktısıdır (şablonda ₺ yazılmaz), "/sa" bitişik.
 * Büyük harf yalnız cümle başında. Emir SÜREKLİ saatlik emirdir: metin "saatte N birim" der, tek seferlik satış ima etmez; "Satışı bırak" = oran 0.
 * Çekirdek ret iletisi (küçük harfli ASCII; ekranda gösterilmez) -> anahtar eşlemesi `PAZAR_RET_KALIPLARI`'dadır (`hata-mulk.ts` `pazarHatasiTurkce`).
 */
export const PAZAR_METIN = {
  "pazar.sat.dugme": "Pazar'da sat",
  "pazar.sat.dugme_etiket": "{mal} için Pazar'da sat",
  "pazar.sat.dugme_degistir": "Satışı değiştir",
  "pazar.sat.baslik": "{mal}: Pazar'da sat",
  "pazar.sat.alt": "Saatte kaç birim satılsın? Satış sen bırakana kadar sürer.",
  "pazar.sat.alan": "Saatte (birim)",
  "pazar.sat.oran_uretim": "Üretimin kadar: {n} birim/sa",
  "pazar.sat.oran_stok": "Depodaki kadar: {n} birim/sa",
  "pazar.sat.fiyat": "Piyasa fiyatı: {fiyat}",
  "pazar.sat.fiyat_yaklasik": "Piyasa fiyatı ≈ {fiyat} (veri henüz gelmedi)",
  "pazar.sat.net": "Eline geçen ≈ {net}/birim",
  "pazar.sat.gelir": "Eline geçen en çok ≈ {gelir}/sa",
  "pazar.sat.dugme_ver": "Satış emri ver",
  "pazar.sat.dugme_guncelle": "Emri güncelle",
  "pazar.sat.dugme_kaldir": "Satışı bırak",
  "pazar.sat.vazgec": "Vazgeç",
  "pazar.sat.oran_gerekli": "Saatte en az 1 birim yaz.",
  "pazar.sat.tamam": "{mal} satışa çıktı: saatte {n} birim.",
  "pazar.sat.guncellendi": "{mal} satış oranı: saatte {n} birim.",
  "pazar.sat.kaldirildi": "{mal} satışı bırakıldı.",
  "pazar.sat.durum": "Satışta: saatte {n} birim · şu an {g} birim/sa",
  "pazar.sat.durum_bos": "Satışta: saatte {n} birim · şu an satılacak mal yok",
  "pazar.sat.bekliyor": "Satış saat başında yapılır · ilk gelir ≈ {sure} sonra",
  "pazar.sat.gida_not": "Başlangıç gıdan ilk dükkânının rafı için gerekebilir.",
  "pazar.sat.defter_not": "İlk satışın saat başında Defterine işlenir; ödülün {odul}.",
  "pazar.ret.oran": "Saatte 1 ile {n} arasında bir sayı yaz.",
  "pazar.ret.mal_yok": "Bu mal bulunamadı.",
  "pazar.ret.depolanamaz": "Bu mal depolanamadığı için satılamaz.",
  "pazar.ret.yuva": "Satış ve alış emri yuvaların dolu ({n}). Bir emri bırak ya da Ticaret ofisi kur.",
  "pazar.ret.sahip_degil": "Bu işletme senin değil.",
  "pazar.ret.liman": "Bu bölgede Pazar'a satış yapılamaz.",
  "pazar.ret.genel": "Satış emri verilemedi; yeniden dene.",
} as const;

export type PazarMetinAnahtari = keyof typeof PAZAR_METIN;

/** Çekirdek `ticaret_emri` ret iletisi -> metin anahtarı (kalıp ileti ön ekidir). `{n}` iletiden gelir (yuva sayısı); oran sınırı sabit 1.000.000 birim/sa. */
export const PAZAR_RET_KALIPLARI: ReadonlyArray<readonly [RegExp, PazarMetinAnahtari]> = [
  [/^gecersiz oran/, "pazar.ret.oran"],
  [/^bilinmeyen mal/, "pazar.ret.mal_yok"],
  [/^depolanamaz mal ticarete konu olamaz/, "pazar.ret.depolanamaz"],
  [/^ticaret emri yuvasi dolu/, "pazar.ret.yuva"],
  [/^bolge oyuncunun degil|^bilinmeyen bolge/, "pazar.ret.sahip_degil"],
  [/^bolge liman degil/, "pazar.ret.liman"],
  [/^gecersiz yon/, "pazar.ret.genel"],
];

/** Çekirdeğin en çok ticaret oranı (`EN_COK_TICARET_ORANI`, mili-birim/sa) birim/sa olarak: sayı alanının üst sınırı. */
export const PAZAR_EN_COK_BIRIM_SAAT = 1_000_000;

const YER_TUTUCU = /\{([a-z_]+)\}/g;

/** `{ad}` yer tutucularını doldurur (HTML kaçışı çağıranındır; verilmeyen yer tutucu olduğu gibi kalır). */
export function pazarMetni(anahtar: PazarMetinAnahtari, yer: Readonly<Record<string, string | number>> = {}): string {
  return PAZAR_METIN[anahtar].replace(YER_TUTUCU, (tum, ad: string) => (ad in yer ? String(yer[ad]) : tum));
}

/** Ret iletisinden Türkçe metin; tanınmayan ileti `null` (çağıran genel eşlemeye düşer). `{n}` yuva sayısı iletiden (`(4)`) ya da oran sınırından. */
export function pazarRetMetni(ham: string): string | null {
  for (const [re, a] of PAZAR_RET_KALIPLARI) {
    if (!re.test(ham)) continue;
    const yuva = /\((\d+)\)/.exec(ham)?.[1];
    return pazarMetni(a, { n: a === "pazar.ret.yuva" ? (yuva ?? "") : PAZAR_EN_COK_BIRIM_SAAT.toLocaleString("tr-TR") });
  }
  return null;
}

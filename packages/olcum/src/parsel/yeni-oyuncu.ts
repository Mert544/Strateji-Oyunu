/**
 * Yeni oyuncu ölçütleri Y1–Y10 (docs/arastirma/baslangic-ve-ustalik.md §8.2) — çekirdek durumundan ve komut günlüğünden
 * TÜRETİLEBİLEN kısım saf işlev olarak; türetilemeyenler "ölçülemez" işaretiyle (`olculemez`) ve `Y_OLCUTLERI` tablosunda.
 *
 * Kurallar (parsel ölçümüyle aynı): saf işlev (çekirdeğe bağlanmaz), tamsayı (ms, mili-₺), oranlar ppm (aşağı yuvarlı, BigInt),
 * girdiyi değiştirmez. Eşikler önerilerdir (kapı değil, hipotez; kalibre edilmedi).
 *
 * "Botlar eğlenceyi ölçmez" (docs/00 R5): Y1–Y4, Y6, Y8–Y10 için İNSAN testi şarttır; bu işlevler bot koşusundan sayı üretse
 * de sonuç "bot gözlemi"dir ve insan ölçümünün yerine geçmez. Y5 ve Y7 bot + insan karmadır.
 */
import { PPM, SAAT_MS, oranPpm, tamsayiDenetle, tamsayiMedyan } from "./ortak";

export const DAKIKA_MS = 60_000;
export const Y1_ESIK_MS = 10 * DAKIKA_MS;
export const Y1_HEDEF_PPM = 750_000;
export const Y2_ESIK_60_MS = 60 * DAKIKA_MS;
export const Y2_ESIK_10_MS = 10 * DAKIKA_MS;
export const Y2_HEDEF_60_PPM = 700_000;
export const Y2_HEDEF_10_PPM = 500_000;
export const Y3_ESIK_MS = 24 * SAAT_MS;
export const Y3_HEDEF_PPM = 500_000;
/** Y5: hiçbir katman bu paydan büyük olamaz. */
export const Y5_KATMAN_TAVANI_PPM = 600_000;
/** Y5: ikinci yapı bu süre içinde sayılır (ilk 24 saat). */
export const Y5_PENCERE_MS = 24 * SAAT_MS;
export const Y6_PENCERE_MS = 7 * 24 * SAAT_MS;
export const Y6_HEDEF_PPM = 100_000;
/** Y7: hedef oyuncunun kendi ilçe medyanının en az bu payına ulaşması; oyuncuların en az `Y7_OYUNCU_HEDEF_PPM`'i. */
export const Y7_MEDYAN_PAYI_PPM = 500_000;
export const Y7_OYUNCU_HEDEF_PPM = 500_000;
/** Y7 pencere: katılımdan 14 gün sonraki son 7 gün. */
export const Y7_PENCERE_GUN = 7;

export type YKaynak = "bot" | "insan" | "karma";

/** Y ölçütü tanım satırı: kod, kaynak ve çekirdek durumundan türetilebilirlik. */
export interface YOlcutTanimi {
  kod: string;
  ad: string;
  hedef: string;
  kaynak: YKaynak;
  /** Çekirdek durumu / komut günlüğünden saf işlevle türetilebiliyor mu (bot koşusu sayı üretir). */
  turetilebilir: boolean;
  /** İnsan testi gerektirir (bot sayısı yalnız gözlemdir). */
  insanTesti: boolean;
  not: string;
}

export const Y_OLCUTLERI: readonly YOlcutTanimi[] = [
  { kod: "Y1", ad: "İlk yapı ≤ 10 dk", hedef: "≥ %75", kaynak: "insan", turetilebilir: true, insanTesti: true, not: "Komut günlüğünden (katılım → ilk kabul edilen yapı komutu). Bot katılımda anında kurar: anlamlı değil, insan testi şart." },
  { kod: "Y2", ad: "İlk saatte ilk satış", hedef: "≥ %70 (60 dk), ≥ %50 (10 dk)", kaynak: "insan", turetilebilir: true, insanTesti: true, not: "Emir gerçekleşmesinden (gözlem ızgarası çözünürlüğüyle; +10 dk ve +60 dk ek gözlemleriyle eşikler tam)." },
  { kod: "Y3", ad: "İlk sözleşme ≤ 24 sa", hedef: "≥ %50", kaynak: "insan", turetilebilir: false, insanTesti: true, not: "OLÇÜLEMEZ: çekirdekte sözleşme/sipariş komutu (siparis_teslim; A6) yok." },
  { kod: "Y4", ad: "D1 / D7 geri dönüş", hedef: "D1 ≥ %35; D7 ≥ %15 (gözlem)", kaynak: "insan", turetilebilir: false, insanTesti: true, not: "OLÇÜLEMEZ: oturum telemetrisi gerekir (sunucu; R-Ü16); çekirdek durumunda yok." },
  { kod: "Y5", ad: "Açılış çeşitliliği", hedef: "hiçbir katman > %60", kaynak: "karma", turetilebilir: true, insanTesti: false, not: "İlk 24 saatte ikinci yapının katmanı; hibrit portföy oranı." },
  { kod: "Y6", ad: "Yön değiştirme maliyetsizliği", hedef: "≥ %10 yön değiştirir; D7 farkı ≥ −5 puan", kaynak: "insan", turetilebilir: true, insanTesti: true, not: "Yalnız oran (parsel_birak / insaat_iptal, ilk 7 gün) türetilir; D7 farkı oturum verisi ister (ölçülemez)." },
  { kod: "Y7", ad: "14. gün net üretim geliri", hedef: "oyuncuların ≥ %50'si ilçe medyanının ≥ %50'sinde", kaynak: "karma", turetilebilir: true, insanTesti: false, not: "H6'nın BİRİNCİL ölçüsü (hibeden bağımsız): son 7 günün net üretim geliri (sermaye harcaması hariç hazine akışı)." },
  { kod: "Y8", ad: "Defter etkileşimi", hedef: "Atla ≤ %30", kaynak: "insan", turetilebilir: false, insanTesti: true, not: "OLÇÜLEMEZ: Esnaf Defteri istemci telemetrisi." },
  { kod: "Y9", ad: "Rehberlik (Alfa-1)", hedef: "≥ %20; Rehberli D7 ≥ +5 puan", kaynak: "insan", turetilebilir: false, insanTesti: true, not: "OLÇÜLEMEZ: Rehberlik (A16) yok." },
  { kod: "Y10", ad: "Takılma", hedef: "≤ 1 / oyuncu", kaynak: "insan", turetilebilir: false, insanTesti: true, not: "OLÇÜLEMEZ: gerçek oyuncunun komutsuz bekleme anları; bot karar aralığı sabit olduğundan anlamsız." },
];

/** Ölçülemez işareti: neden açıkça yazılır (sessizce 0 ya da boş sonuç üretilmez). */
export interface Olculemez {
  olculebilir: false;
  neden: string;
}

export function olculemez(neden: string): Olculemez {
  return { olculebilir: false, neden };
}

function ayrikSure(baslangic: number, bitis: number, ad: string): number {
  tamsayiDenetle(baslangic, `${ad}.baslangic`);
  tamsayiDenetle(bitis, `${ad}.bitis`);
  if (bitis < baslangic) throw new Error(`${ad}: bitis (${bitis}) baslangictan (${baslangic}) once`);
  return bitis - baslangic;
}

// --- Y1 / Y2: ilk yapı ve ilk satış süresi ---------------------------------------------------------------------------

/** İlk olay zamanı kaydı: `ilkMs` null = gözlem boyunca olay olmadı. `gozlemSonuMs` gözlemin bittiği an. */
export interface IlkOlayKaydi {
  katilmaMs: number;
  ilkMs: number | null;
  gozlemSonuMs: number;
}

export interface IlkOlaySonucu {
  olculebilir: true;
  /** Eşik süre içinde olayı gerçekleştiren oyuncu / ölçülebilen oyuncu, ppm. */
  oranPpm: number;
  esikiGecen: number;
  /** Eşik süre gözlenebildi mi: olay oldu ya da gözlem en az eşik kadar sürdü. */
  olculenOyuncu: number;
  /** Gözlemi eşikten kısa olup olay görülmeyen (ölçüm dışı) oyuncu sayısı. */
  olcumDisi: number;
  /** Olayı yaşayan oyuncuların süre medyanı (ms); yoksa null. */
  medyanSureMs: number | null;
}

/** Katılımdan `esikMs` içinde ilk olayı gerçekleştirenlerin oranı (Y1: ilk yapı, Y2: ilk satış). */
export function ilkOlayOrani(kayitlar: readonly IlkOlayKaydi[], esikMs: number): IlkOlaySonucu | Olculemez {
  tamsayiDenetle(esikMs, "esikMs");
  let gecen = 0;
  let olculen = 0;
  let disi = 0;
  const sureler: number[] = [];
  for (const k of kayitlar) {
    if (k.ilkMs === null) {
      const gozlenen = ayrikSure(k.katilmaMs, k.gozlemSonuMs, "ilkOlay");
      if (gozlenen >= esikMs) olculen++;
      else disi++;
      continue;
    }
    const sure = ayrikSure(k.katilmaMs, k.ilkMs, "ilkOlay");
    sureler.push(sure);
    olculen++;
    if (sure <= esikMs) gecen++;
  }
  if (olculen === 0) return olculemez(kayitlar.length === 0 ? "oyuncu yok" : "hicbir oyuncu esik suresi kadar gozlenmedi");
  return { olculebilir: true, oranPpm: oranPpm(gecen, olculen), esikiGecen: gecen, olculenOyuncu: olculen, olcumDisi: disi, medyanSureMs: tamsayiMedyan(sureler) };
}

export interface Y1Sonucu {
  sonuc: IlkOlaySonucu | Olculemez;
  /** Hedef (≥ %75) tuttu mu; ölçülemezse null. */
  hedefGecti: boolean | null;
}

/** Y1: ilk yapı ≤ 10 dk. `ilkMs` = katılımdan sonra ilk KABUL EDİLEN yapı komutunun zamanı. */
export function y1IlkYapi(kayitlar: readonly IlkOlayKaydi[]): Y1Sonucu {
  const sonuc = ilkOlayOrani(kayitlar, Y1_ESIK_MS);
  return { sonuc, hedefGecti: sonuc.olculebilir ? sonuc.oranPpm >= Y1_HEDEF_PPM : null };
}

export interface Y2Sonucu {
  dk60: IlkOlaySonucu | Olculemez;
  dk10: IlkOlaySonucu | Olculemez;
  hedef60Gecti: boolean | null;
  hedef10Gecti: boolean | null;
}

/** Y2: ilk satış ≤ 60 dk (ve ≤ 10 dk). `ilkMs` = ilk gerçekleşen ihracat/satışın gözlendiği an (ızgara çözünürlüğü kadar geç olabilir). */
export function y2IlkSatis(kayitlar: readonly IlkOlayKaydi[]): Y2Sonucu {
  const d60 = ilkOlayOrani(kayitlar, Y2_ESIK_60_MS);
  const d10 = ilkOlayOrani(kayitlar, Y2_ESIK_10_MS);
  return {
    dk60: d60,
    dk10: d10,
    hedef60Gecti: d60.olculebilir ? d60.oranPpm >= Y2_HEDEF_60_PPM : null,
    hedef10Gecti: d10.olculebilir ? d10.oranPpm >= Y2_HEDEF_10_PPM : null,
  };
}

/** Y3: ilk sözleşme ≤ 24 sa. Çekirdekte sözleşme/sipariş komutu yoksa (kayıt verilmezse) ölçülemez. */
export function y3IlkSozlesme(kayitlar: readonly IlkOlayKaydi[] | null): { sonuc: IlkOlaySonucu | Olculemez; hedefGecti: boolean | null } {
  if (kayitlar === null) return { sonuc: olculemez("cekirdekte sozlesme/siparis komutu yok (siparis_teslim; A6)"), hedefGecti: null };
  const sonuc = ilkOlayOrani(kayitlar, Y3_ESIK_MS);
  return { sonuc, hedefGecti: sonuc.olculebilir ? sonuc.oranPpm >= Y3_HEDEF_PPM : null };
}

// --- Y5: açılış çeşitliliği --------------------------------------------------------------------------------------------

export type YapiKatmani = "tarim" | "hammadde" | "sanayi" | "enerji" | "hizmet" | "diger";
export const YAPI_KATMANLARI: readonly YapiKatmani[] = ["tarim", "hammadde", "sanayi", "enerji", "hizmet", "diger"];

const KATMAN: Readonly<Record<string, YapiKatmani>> = {
  ciftlik: "tarim",
  ahir: "tarim",
  mera: "tarim",
  sulama_kanali: "tarim",
  cevher_madeni: "hammadde",
  komur_ocagi: "hammadde",
  bakir_madeni: "hammadde",
  silis_ocagi: "hammadde",
  petrol_kuyusu: "hammadde",
  gida_fabrikasi: "sanayi",
  celikhane: "sanayi",
  parca_fabrikasi: "sanayi",
  elektronik_fabrikasi: "sanayi",
  rafineri: "sanayi",
  muhimmat_fabrikasi: "sanayi",
  gubre_fabrikasi: "sanayi",
  santral: "enerji",
  hidro_santrali: "enerji",
  ambar: "hizmet",
  ticaret_ofisi: "hizmet",
  muhtarlik: "hizmet",
  konut: "hizmet",
  garaj: "hizmet",
  atolye_lab: "hizmet",
};

/** Yapı türünün katmanı (bilinmeyen tür "diger"). */
export function yapiKatmani(tur: string): YapiKatmani {
  return KATMAN[tur] ?? "diger";
}

/** Oyuncunun yapıları, başlatılma sırasıyla: `{ tur, zamanMs }`; katılım zamanıyla birlikte. */
export interface AcilisKaydi {
  katilmaMs: number;
  yapilar: ReadonlyArray<{ tur: string; zamanMs: number }>;
}

export interface Y5Sonucu {
  olculebilir: true;
  /** Katman -> ikinci yapısı o katmanda olan oyuncu payı (ppm; yalnız ikinci yapısı olanlar üzerinden). */
  katmanPaylariPpm: Partial<Record<YapiKatmani, number>>;
  enBuyukKatman: YapiKatmani;
  enBuyukPayPpm: number;
  /** İlk iki yapısı farklı katmanlarda olan oyuncu / ikinci yapısı olan oyuncu, ppm (hibrit portföy). */
  hibritPayPpm: number;
  /** İlk 24 saatte ikinci yapısı olan oyuncu sayısı. */
  ikinciYapili: number;
  oyuncuSayisi: number;
  hedefGecti: boolean;
}

/** Y5: 24. saatte 2. yapının katmanı dağılımı. İlk 24 saatte ikinci yapısı olan yoksa ölçülemez. */
export function y5AcilisCesitliligi(kayitlar: readonly AcilisKaydi[]): Y5Sonucu | Olculemez {
  const sayac = new Map<YapiKatmani, number>();
  let ikinciYapili = 0;
  let hibrit = 0;
  for (const k of kayitlar) {
    tamsayiDenetle(k.katilmaMs, "katilmaMs");
    const yapilar = [...k.yapilar].sort((a, b) => a.zamanMs - b.zamanMs).filter((y) => y.zamanMs - k.katilmaMs <= Y5_PENCERE_MS);
    if (yapilar.length < 2) continue;
    ikinciYapili++;
    const a = yapiKatmani((yapilar[0] as { tur: string }).tur);
    const b = yapiKatmani((yapilar[1] as { tur: string }).tur);
    sayac.set(b, (sayac.get(b) ?? 0) + 1);
    if (a !== b) hibrit++;
  }
  if (ikinciYapili === 0) return olculemez("ilk 24 saatte ikinci yapisi olan oyuncu yok");
  const paylar: Partial<Record<YapiKatmani, number>> = {};
  let en: YapiKatmani = "diger";
  let enSayi = -1;
  for (const k of YAPI_KATMANLARI) {
    const n = sayac.get(k) ?? 0;
    if (n > 0) paylar[k] = oranPpm(n, ikinciYapili);
    if (n > enSayi) {
      en = k;
      enSayi = n;
    }
  }
  const enPay = oranPpm(Math.max(0, enSayi), ikinciYapili);
  return { olculebilir: true, katmanPaylariPpm: paylar, enBuyukKatman: en, enBuyukPayPpm: enPay, hibritPayPpm: oranPpm(hibrit, ikinciYapili), ikinciYapili, oyuncuSayisi: kayitlar.length, hedefGecti: enPay <= Y5_KATMAN_TAVANI_PPM };
}

// --- Y6: yön değiştirme ------------------------------------------------------------------------------------------------

export interface YonKaydi {
  katilmaMs: number;
  /** Kabul edilen yön değiştirme komutlarının zamanı (parsel_birak, insaat_iptal; ilçe değiştirme ilk yapıdan sonra yeni ilçeye yapı). */
  yonKomutlariMs: readonly number[];
  gozlemSonuMs: number;
}

export interface Y6Sonucu {
  olculebilir: true;
  /** İlk 7 günde en az bir yön değiştiren oyuncu payı, ppm (7 gün gözlenebilenler üzerinden). */
  oranPpm: number;
  yonDegistiren: number;
  olculenOyuncu: number;
  hedefGecti: boolean;
  /** D7 farkı oturum verisi ister (insan testi); burada ölçülemez. */
  d7Farki: Olculemez;
}

export function y6YonDegistirme(kayitlar: readonly YonKaydi[]): Y6Sonucu | Olculemez {
  let olculen = 0;
  let degisti = 0;
  for (const k of kayitlar) {
    const gozlenen = ayrikSure(k.katilmaMs, k.gozlemSonuMs, "yon");
    const var_ = k.yonKomutlariMs.some((t) => t >= k.katilmaMs && t - k.katilmaMs <= Y6_PENCERE_MS);
    if (!var_ && gozlenen < Y6_PENCERE_MS) continue;
    olculen++;
    if (var_) degisti++;
  }
  if (olculen === 0) return olculemez("hicbir oyuncu 7 gun gozlenmedi");
  const oran = oranPpm(degisti, olculen);
  return { olculebilir: true, oranPpm: oran, yonDegistiren: degisti, olculenOyuncu: olculen, hedefGecti: oran >= Y6_HEDEF_PPM, d7Farki: olculemez("D7 geri donus farki oturum verisi ister (insan testi)") };
}

// --- Y7: hibeden bağımsız 14. gün net üretim geliri --------------------------------------------------------------------

/**
 * Bir oyuncunun son 7 günlük net üretim geliri (mili-₺; negatif olabilir) ve aynı penceredeki ilçe emsallerinin gelirleri.
 * Net üretim geliri = hazine akışı − sermaye harcaması (arsa + yapı bedeli): satış − girdi/ithalat − bakım − işçilik − arazi vergisi.
 * Hibe ve başlangıç kiti sermaye/stok olduğundan bu akışa girmez (hibeden bağımsız).
 */
export interface UretimGeliriOlgusu {
  gelir: number;
  ilceGelirleri: readonly number[];
}

export interface Y7Sonucu {
  olculebilir: true;
  /** Emsal medyanının ≥ %50'sine ulaşan oyuncu / ölçülebilir oyuncu, ppm. */
  oyuncuPayiPpm: number;
  ulasan: number;
  olculebilirOyuncu: number;
  /** Emsal medyanı ≤ 0 ya da emsal yok: oran tanımsız (ölçülemez) oyuncu sayısı. */
  olcumDisi: number;
  olguSayisi: number;
  hedefGecti: boolean;
}

/**
 * Y7: oyuncunun geliri, ilçe emsallerinin medyanının ≥ %50'sine ulaştı mı (kesirsiz: 2·gelir·PPM ≥ 2·medyan·pay).
 * Emsal yoksa ya da medyan ≤ 0 ise (pozitif gelirli emsal yok) o olgu ölçülemez. Hiçbiri ölçülemezse sonuç ölçülemez.
 */
export function y7UretimGeliri(olgular: readonly UretimGeliriOlgusu[]): Y7Sonucu | Olculemez {
  let ulasan = 0;
  let olculen = 0;
  let disi = 0;
  for (const o of olgular) {
    tamsayiDenetle(o.gelir, "gelir");
    for (const e of o.ilceGelirleri) tamsayiDenetle(e, "emsalGelir");
    const s = [...o.ilceGelirleri].sort((a, b) => a - b);
    if (s.length === 0) {
      disi++;
      continue;
    }
    const orta = s.length >> 1;
    const m2 = s.length % 2 === 1 ? 2 * (s[orta] as number) : (s[orta - 1] as number) + (s[orta] as number);
    if (m2 <= 0) {
      disi++;
      continue;
    }
    olculen++;
    // gelir >= medyan × pay  <=>  2·gelir·PPM >= m2·pay (m2 = 2·medyan; BigInt)
    if (BigInt(2 * o.gelir) * BigInt(PPM) >= BigInt(m2) * BigInt(Y7_MEDYAN_PAYI_PPM)) ulasan++;
  }
  if (olculen === 0) return olculemez("ilce emsali yok ya da emsal medyani pozitif degil");
  const pay = oranPpm(ulasan, olculen);
  return { olculebilir: true, oyuncuPayiPpm: pay, ulasan, olculebilirOyuncu: olculen, olcumDisi: disi, olguSayisi: olgular.length, hedefGecti: pay >= Y7_OYUNCU_HEDEF_PPM };
}

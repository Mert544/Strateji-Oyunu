/**
 * H6 (parsel dünyası) — Geç katılan işe yarar (docs/11 §7.9, §8.1; bot: geç katılan).
 *
 * KARAR (lider kararı, 1 Ekim): BİRİNCİL ölçü Y7 türü akış (hibeden bağımsız net üretim geliri; yeni-oyuncu.ts `y7UretimGeliri`) +
 * AÇILIŞ KOŞULU (h6-acilis.ts: karara katılımda taban fiyatlı hücre ≥ ayak izi girer; 14 günde açılış yapısı bilgidir, insan testi gerekli; docs/12 §13). Eski "ucuz hücre
 * payı ≥ %20" koşulu KALKTI; bilgi olarak raporlanır (`eskiUcuzHedef`). Servet tabanlı ulaşma (aşağıdaki 1.) İKİNCİL olarak raporlanır;
 * `h6ParselIkiBicim` ikisini ayırır.
 *
 * Servet tanımı (ikincil) ve ucuz hücre:
 *  1. 60. günde katılan oyuncu, katılımdan 14 gün sonra İLÇESİNİN medyan servetine (aynı ilçedeki diğer sahipler; geç
 *     katılan hariç) ulaşır; ulaşan olgu (koşu × geç katılan) oranı ≥ %50.
 *  2. (ESKİ TANIM, yalnız bilgi) Katılım anında uygun hücrelerin ≥ %20'si ≤ 2× taban fiyatla alınabilir: satılmamış VE ilçe fiyat
 *     çarpanı (1 + 2·satılmış pay) ≤ 2 olan hücreler / tüm uygun hücreler.
 */
import type { Verdict } from "../tipler";
import { PPM, kosullardanVerdict, medyanIkiKat, oranPpm, tamsayiDenetle } from "./ortak";
import { h6AcilisKosulu } from "./h6-acilis";
import type { AcilisKosuluSonucu, H6AcilisSonucu } from "./h6-acilis";
import { y7UretimGeliri } from "./yeni-oyuncu";
import type { Olculemez, UretimGeliriOlgusu, Y7Sonucu } from "./yeni-oyuncu";

export const PARSEL_H6_BASARI_ESIK_PPM = 500_000;
export const PARSEL_H6_UCUZ_HUCRE_ESIK_PPM = 200_000;
export const PARSEL_H6_KATILIM_GUNU = 60;
export const PARSEL_H6_OLCUM_SURESI_GUN = 14;
/** "Ucuz" hücre: fiyat çarpanı ≤ 2 (ppm). */
export const PARSEL_H6_FIYAT_CARPANI_TAVANI_PPM = 2 * PPM;

/** Servet ilçe medyanına ulaştı mı (servet ≥ medyan; tamsayı, kesirsiz). İlçede başka sahip yoksa null (ölçülemez). */
export function medyanaUlastiMi(servet: number, ilceServetleri: readonly number[]): boolean | null {
  tamsayiDenetle(servet, "servet");
  const m2 = medyanIkiKat(ilceServetleri);
  return m2 === null ? null : 2 * servet >= m2;
}

export interface GecKatilanOlgusu {
  /** Katılımdan 14 gün sonra geç katılanın serveti (mili-₺: hazine + stok + arazi taban değeri + yapılar). */
  servet: number;
  /** Aynı anda ilçedeki diğer sahiplerin servetleri. */
  ilceServetleri: readonly number[];
}

export interface GecKatilanSonucu {
  /** KARAR: ulaşan olgu oranı, ppm (ölçülebilir olgular üzerinden). Hiç ölçülebilir olgu yoksa null. */
  basariPpm: number | null;
  ulasan: number;
  olculebilir: number;
  olguSayisi: number;
}

export function gecKatilanBasarisi(olgular: readonly GecKatilanOlgusu[]): GecKatilanSonucu {
  let ulasan = 0;
  let olculebilir = 0;
  for (const o of olgular) {
    const u = medyanaUlastiMi(o.servet, o.ilceServetleri);
    if (u === null) continue;
    olculebilir++;
    if (u) ulasan++;
  }
  return { basariPpm: olculebilir === 0 ? null : oranPpm(ulasan, olculebilir), ulasan, olculebilir, olguSayisi: olgular.length };
}

/** İlçe fiyat çarpanı (ppm): 1 + 2 · satılmış / uygun (aşağı yuvarlı). docs/11 §7.2. */
export function hucreFiyatCarpaniPpm(uygunHucre: number, satilmisHucre: number): number {
  tamsayiDenetle(uygunHucre, "uygunHucre");
  tamsayiDenetle(satilmisHucre, "satilmisHucre");
  if (satilmisHucre < 0 || satilmisHucre > uygunHucre) throw new Error(`hucreFiyatCarpaniPpm: satilmis ${satilmisHucre} / uygun ${uygunHucre} tutarsiz`);
  return PPM + oranPpm(2 * satilmisHucre, uygunHucre);
}

export interface IlceDolulugu {
  uygunHucre: number;
  satilmisHucre: number;
  /**
   * Satılmış hücrelerden AYRILMIŞ olanlar (`IlceDurumu.ayrilmisSatilmis`; docs/06 §15.7): ayrılmış hücre taban fiyattan satılır ve kıtlık
   * eğrisinden muaftır, yani fiyat çarpanı yalnız `satilmisHucre − ayrilmisSatilmis` üzerinden ilerler. Tanımsız = 0 (eski davranış).
   */
  ayrilmisSatilmis?: number;
  /**
   * Henüz satılmamış ayrılmış hücre. Verilirse bu hücreler (yeni oyuncu için taban fiyatlı) ilçe çarpanından bağımsız ÜCUZ sayılır;
   * tanımsızsa ucuz hücre yalnız çarpanı ≤ 2 olan ilçelerin satılmamış hücreleridir (eski davranış).
   */
  ayrilmisBos?: number;
}

export interface UcuzHucreSonucu {
  /** KARAR: ≤ 2× taban fiyatla alınabilir hücre payı, ppm. */
  payPpm: number;
  ucuzHucre: number;
  uygunHucre: number;
}

export function ucuzHucrePayi(ilceler: readonly IlceDolulugu[]): UcuzHucreSonucu {
  let ucuz = 0;
  let uygun = 0;
  for (const c of ilceler) {
    uygun += c.uygunHucre;
    const ayr = c.ayrilmisSatilmis ?? 0;
    tamsayiDenetle(ayr, "ayrilmisSatilmis");
    if (ayr < 0 || ayr > c.satilmisHucre) throw new Error(`ucuzHucrePayi: ayrilmisSatilmis ${ayr} tutarsiz (satilmis ${c.satilmisHucre})`);
    const normalSatilmis = c.satilmisHucre - ayr;
    if (c.uygunHucre > 0 && hucreFiyatCarpaniPpm(c.uygunHucre, normalSatilmis) <= PARSEL_H6_FIYAT_CARPANI_TAVANI_PPM) {
      ucuz += c.uygunHucre - c.satilmisHucre;
    } else if (c.ayrilmisBos !== undefined) {
      ucuz += c.ayrilmisBos; // ayrılmış hücre çarpandan muaf: taban fiyat
    }
  }
  return { payPpm: uygun === 0 ? 0 : oranPpm(ucuz, uygun), ucuzHucre: ucuz, uygunHucre: uygun };
}

export interface H6ParselSonucu {
  verdict: Verdict;
  gecKatilan: GecKatilanSonucu;
  ucuzHucre: UcuzHucreSonucu;
}

export function h6ParselDegerlendir(gecKatilan: GecKatilanSonucu, ucuzHucre: UcuzHucreSonucu): H6ParselSonucu {
  const verdict = kosullardanVerdict([
    gecKatilan.basariPpm === null ? null : gecKatilan.basariPpm >= PARSEL_H6_BASARI_ESIK_PPM,
    ucuzHucre.uygunHucre === 0 ? null : ucuzHucre.payPpm >= PARSEL_H6_UCUZ_HUCRE_ESIK_PPM,
  ]);
  return { verdict, gecKatilan, ucuzHucre };
}

// ---------------------------------------------------------------------------
// İki biçim: HAM servet ve hibe/kit'ten ARINDIRILMIŞ ölçüm (docs/arastirma/baslangic-ve-ustalik.md §8.1, T12 "hibe şişkinliği")
// ---------------------------------------------------------------------------
//
// Yeni oyuncu paketi (docs/06 §15.1) çekirdekte şöyle okunur; servet tanımı buna göre yazıldı:
//  - Hibe (₺50.000) hazineye, başlangıç kiti (çelik/parça/gıda) işletme stoğuna ANINDA girer: ham servete girer.
//  - Bedava yurt hücresinin `degerMili`'si 0'dır: arazi taban değerine (ödenen bedel) girmez; yani ham servet yurdu saymaz.
//  - İlk 5 yapı %30 indirimlidir: yapı değeri = ÖDENEN tutar (indirimli para + indirimli malzeme, taban fiyatla); tam bedel değil.
//  - Ayrılmış hücre (ilçenin %20'si, ilk 14 gün) yalnız YENİ oyuncuya satılır: geç katılan 14. günde de alım hakkına sahiptir,
//    ama ayrılmış hücreler önceki yeni oyuncular tarafından tüketilmiş olabilir (`ucuzHucreAyrintisi`).
//
// İKİ ARINDIRMA vardır ve ikisi AYNI DEĞİLDİR:
//  1. ARINDIRILMIŞ SERVET = ham servet − (hibe + kit değeri), geç katılan ve emsallerinde aynı ofset. Medyana ULAŞMA karşılaştırması
//     (servet ≥ medyan) ortak bir ofsete göre DEĞİŞMEZDİR: (s − h) ≥ (m − h) ⇔ s ≥ m. Bu yüzden bu biçim ham kararla aynı kararı
//     verir; yalnız ORANI (servet / medyan) değiştirir (paket servetin ne kadarıdır, `hibePayiPpm`). Bu bir bulgudur: "servet
//     medyanına ulaşma" ölçütü hibeyi ne şişirir ne söndürür; şişkinlik göreli (oran) okumalarda görünür.
//  2. HİBEDEN BAĞIMSIZ GELİR (Y7): son 7 günün net üretim geliri (hazine akışı − sermaye harcaması) emsal medyanına oranlanır; paket
//     (hibe/kit) hazine akışına girmediği için tanım gereği hibeden bağımsızdır. Asıl "arındırılmış" karar budur (`y7UretimGeliri`).

/** Servetin bileşenleri (mili-₺; hepsi tamsayı). */
export interface ServetBilesenleri {
  hazine: number;
  /** Tüm işletme düğümlerindeki stok (taban fiyatla). */
  stok: number;
  /** Hücrelerin satın alma bedeli toplamı (`degerMili`; yurt 0). */
  arazi: number;
  /** Yapıların ÖDENEN inşa bedeli (indirimli ilk 5 yapı dahil; süren inşaatlar ödenen tutarla). */
  yapi: number;
}

/** Ham servet = hazine + stok + arazi + yapı. */
export function servetToplami(b: ServetBilesenleri): number {
  for (const [ad, x] of Object.entries(b)) tamsayiDenetle(x, `servet.${ad}`);
  return b.hazine + b.stok + b.arazi + b.yapi;
}

/** Hibe ve kit değerinden arındırılmış servet (negatif olabilir: paket harcanıp kaybedilmişse). */
export function hibeArindir(hamServet: number, hibe: number, kitDegeri: number): number {
  tamsayiDenetle(hamServet, "hamServet");
  tamsayiDenetle(hibe, "hibe");
  tamsayiDenetle(kitDegeri, "kitDegeri");
  return hamServet - hibe - kitDegeri;
}

export interface GecKatilanOlgusuIki {
  /** HAM servet (hibe ve kit dahil). */
  servet: number;
  /** Aynı anda ilçedeki yerleşik sahiplerin HAM servetleri. */
  ilceServetleri: readonly number[];
  /** Hibe + kit değeri (mili-₺): her oyuncuya aynı. Arındırma her iki tarafta da bu değeri çıkarır. */
  hibeKitDegeri: number;
}

/** Olgu başına göreli okuma: servet / emsal medyanı (ppm; medyan ≤ 0 ya da emsal yoksa null) ve paketin servetteki payı. */
export interface ServetOrani {
  hamPpm: number | null;
  arindirilmisPpm: number | null;
  /** (hibe + kit) / ham servet, ppm (ham servet ≤ 0 ise null). */
  hibePayiPpm: number | null;
}

export function servetOrani(o: GecKatilanOlgusuIki): ServetOrani {
  tamsayiDenetle(o.servet, "servet");
  tamsayiDenetle(o.hibeKitDegeri, "hibeKitDegeri");
  const m2 = medyanIkiKat(o.ilceServetleri);
  const oran = (servet: number, medyan2: number | null): number | null => {
    if (medyan2 === null || medyan2 <= 0 || servet < 0) return null;
    return Number((BigInt(2 * servet) * BigInt(PPM)) / BigInt(medyan2));
  };
  return {
    hamPpm: oran(o.servet, m2),
    // Arınd. medyan2 = m2 − 2·ofset (ortak ofset iki ortanın toplamına iki kez girer)
    arindirilmisPpm: oran(o.servet - o.hibeKitDegeri, m2 === null ? null : m2 - 2 * o.hibeKitDegeri),
    hibePayiPpm: o.servet <= 0 ? null : oranPpm(Math.min(o.hibeKitDegeri, o.servet), o.servet),
  };
}

export interface H6IkiBicimSonucu {
  ham: GecKatilanSonucu;
  /** Arındırılmış SERVET ile ulaşma: ortak ofset altında ham sonuçla aynıdır (değişmezlik; yukarıdaki not). */
  arindirilmis: GecKatilanSonucu;
  oranlar: ServetOrani[];
}

/** Aynı olgular için ham ve hibe/kit'ten arındırılmış servetle medyana ulaşma oranları. */
export function gecKatilanIkiBicim(olgular: readonly GecKatilanOlgusuIki[]): H6IkiBicimSonucu {
  const ham = gecKatilanBasarisi(olgular.map((o) => ({ servet: o.servet, ilceServetleri: o.ilceServetleri })));
  const arindirilmis = gecKatilanBasarisi(
    olgular.map((o) => ({
      servet: o.servet - o.hibeKitDegeri,
      ilceServetleri: o.ilceServetleri.map((s) => s - o.hibeKitDegeri),
    })),
  );
  return { ham, arindirilmis, oranlar: olgular.map(servetOrani) };
}

/** Ucuz hücre ayrıntısı: hücreler ayrılmış (yalnız yeni oyuncuya; taban fiyatlı, çarpandan muaf) ve genel (herkese; çarpanı ≤ 2 ilçelerde) olarak ayrılır. */
export interface IlceAyrilmisDolulugu extends IlceDolulugu {
  /** Henüz satılmamış ayrılmış hücre sayısı (ilçe başına; yalnız yeni oyuncu alabilir). */
  ayrilmisBos: number;
}

export interface UcuzHucreAyrintisi extends UcuzHucreSonucu {
  /** Ucuz hücrelerden yalnız YENİ oyuncunun alabildiği (ayrılmış) olanlar. */
  ayrilmisUcuz: number;
  /** Eski oyuncunun da alabildiği (genel) ucuz hücreler. */
  genelUcuz: number;
  /** Eski oyuncu için ucuz hücre payı (ayrılmış hücreler hariç), ppm. */
  genelPayPpm: number;
}

export function ucuzHucreAyrintisi(ilceler: readonly IlceAyrilmisDolulugu[]): UcuzHucreAyrintisi {
  let ayrilmis = 0;
  for (const c of ilceler) {
    tamsayiDenetle(c.ayrilmisBos, "ayrilmisBos");
    if (c.ayrilmisBos < 0 || c.ayrilmisBos > c.uygunHucre - c.satilmisHucre) throw new Error(`ucuzHucreAyrintisi: ayrilmisBos ${c.ayrilmisBos} tutarsiz`);
    ayrilmis += c.ayrilmisBos; // ayrılmış hücre taban fiyatlı ve çarpandan muaf: yeni oyuncu için HER ZAMAN ucuz
  }
  const t = ucuzHucrePayi(ilceler);
  const genel = t.ucuzHucre - ayrilmis;
  return { ...t, ayrilmisUcuz: ayrilmis, genelUcuz: genel, genelPayPpm: t.uygunHucre === 0 ? 0 : oranPpm(genel, t.uygunHucre) };
}

export interface H6Birincil {
  /** HİPOTEZ KARARI (Y7 + açılış koşulu): biri tutmazsa KALDI; biri ölçülemezse BELİRSİZ. */
  verdict: Verdict;
  /** Karar kaynağı: hibeden bağımsız üretim geliri (Y7) ve açılış koşulu (docs/12 §13); servet ve ESKİ ucuz hücre ölçütü karara GİRMEZ. */
  kaynak: "y7_gelir+acilis_kosulu";
  y7: Y7Sonucu | Olculemez;
  /** İkinci koşul: katılımda taban fiyatlı hücre ayak izine yeter (karar); 14 günde açılış yapısı bilgidir (h6-acilis.ts). */
  acilis: H6AcilisSonucu | Olculemez;
  /** ESKİ TANIM (bilgi; karara girmez): ucuz hücre payı ≥ %20 mi; ölçülemezse null. */
  eskiUcuzHedef: boolean | null;
}

export interface H6IkincilServet {
  /** Ham servetle medyana ulaşma (hibe + kit dahil; eski tanım) ve ucuz hücre: BİLGİ, hipotez kararı değil. */
  ham: H6ParselSonucu;
  /** Hibe + kit çıkarılmış servetle: ham ile aynı karar (ortak ofset altında değişmezlik); oranlar farklıdır. */
  arindirilmisServet: H6ParselSonucu;
  /** Olgu başına servet/medyan oranları ve paketin servetteki payı. */
  oranlar: ServetOrani[];
}

export interface H6IkiBicimKarari {
  /** BİRİNCİL: hibeden bağımsız üretim geliri (Y7) + ucuz hücre. Hipotez kararı buradan gelir. */
  birincil: H6Birincil;
  /** İKİNCİL: servet tabanlı okuma (ham ve arındırılmış). Yalnız raporlanır. */
  ikincil: H6IkincilServet;
}

/**
 * H6 kararı: BİRİNCİL ölçü Y7 türü akış (hibeden bağımsız net üretim geliri; `y7UretimGeliri`) + AÇILIŞ KOŞULU (`h6AcilisKosulu`);
 * servet tabanlı ulaşma ikincil, eski ucuz hücre ölçütü bilgi olarak raporlanır (docs/olcum/h1-h9-parsel-tanimlari.md §4 H6,
 * lider kararı 1 Ekim, docs/12 §13). `y7Olgulari`: geç katılan başına son 7 günlük net üretim geliri ve emsal gelirleri;
 * `acilisOlgulari`: geç katılan başına açılış koşulu sonucu (`acilisKosuluOlgusu`).
 */
export function h6ParselIkiBicim(
  olgular: readonly GecKatilanOlgusuIki[],
  ucuz: UcuzHucreSonucu,
  y7Olgulari: readonly UretimGeliriOlgusu[],
  acilisOlgulari: readonly AcilisKosuluSonucu[],
): H6IkiBicimKarari {
  const iki = gecKatilanIkiBicim(olgular);
  const y7 = y7UretimGeliri(y7Olgulari);
  const acilis = h6AcilisKosulu(acilisOlgulari);
  const eskiUcuzHedef = ucuz.uygunHucre === 0 ? null : ucuz.payPpm >= PARSEL_H6_UCUZ_HUCRE_ESIK_PPM;
  return {
    birincil: {
      verdict: kosullardanVerdict([y7.olculebilir ? y7.hedefGecti : null, acilis.olculebilir ? acilis.hedefGecti : null]),
      kaynak: "y7_gelir+acilis_kosulu",
      y7,
      acilis,
      eskiUcuzHedef,
    },
    ikincil: { ham: h6ParselDegerlendir(iki.ham, ucuz), arindirilmisServet: h6ParselDegerlendir(iki.arindirilmis, ucuz), oranlar: iki.oranlar },
  };
}

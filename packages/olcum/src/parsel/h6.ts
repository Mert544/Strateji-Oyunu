/**
 * H6 (parsel dünyası) — Geç katılan işe yarar (docs/11 §7.9, §8.1; bot: geç katılan).
 *
 * İki koşul:
 *  1. 60. günde katılan oyuncu, katılımdan 14 gün sonra İLÇESİNİN medyan servetine (aynı ilçedeki diğer sahipler; geç
 *     katılan hariç) ulaşır; ulaşan olgu (koşu × geç katılan) oranı ≥ %50.
 *  2. Katılım anında uygun hücrelerin ≥ %20'si ≤ 2× taban fiyatla alınabilir: satılmamış VE ilçe fiyat çarpanı
 *     (1 + 2·satılmış pay) ≤ 2 olan hücreler / tüm uygun hücreler.
 */
import type { Verdict } from "../tipler";
import { PPM, kosullardanVerdict, medyanIkiKat, oranPpm, tamsayiDenetle } from "./ortak";

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
    if (c.uygunHucre > 0 && hucreFiyatCarpaniPpm(c.uygunHucre, c.satilmisHucre) <= PARSEL_H6_FIYAT_CARPANI_TAVANI_PPM) {
      ucuz += c.uygunHucre - c.satilmisHucre;
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

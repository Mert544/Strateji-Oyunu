/**
 * H9 (parsel dünyası, yeni) — Oyuncu piyasası ve yönetişim canlı (docs/11 §7.6, §7.10, §8.1; botlar: tüccar, yönetici).
 *
 * İki koşul:
 *  1. Emir dolum oranı ≥ %80: 1k oyuncuda NPC derinliği çekilirken (NPC derinliği = max(0, hedef − kayan oyuncu hacmi))
 *     verilen emirlerin 1 saat içinde TAMAMEN dolanların payı. Payda: 1 saat dolmadan oyuncunun iptal ettiği emirler ve
 *     1 saatlik penceresi gözlem sonunu aşan (dolmamış) emirler hariç tüm emirler.
 *  2. Oy katılımı ≥ %30: seçimlerde oy kullanan / uygun seçmen (son 7 günün en az 3'ünde aktif parsel sahibi), seçimler
 *     üzerinden toplam oran.
 */
import type { Verdict } from "../tipler";
import { SAAT_MS, kosullardanVerdict, oranPpm, tamsayiDenetle } from "./ortak";

export const PARSEL_H9_DOLUM_ESIK_PPM = 800_000;
export const PARSEL_H9_DOLUM_SURESI_MS = SAAT_MS;
export const PARSEL_H9_OY_ESIK_PPM = 300_000;
/** Uygun seçmen: son `PARSEL_H9_AKTIF_PENCERE_GUN` günün en az `PARSEL_H9_AKTIF_GUN_ESIGI`'inde aktif parsel sahibi. */
export const PARSEL_H9_AKTIF_PENCERE_GUN = 7;
export const PARSEL_H9_AKTIF_GUN_ESIGI = 3;

export interface EmirKaydi {
  /** Emrin verildiği an (ms). */
  verilme: number;
  /** Tamamen dolduğu an (ms); dolmadıysa null. */
  dolum: number | null;
  /** Oyuncunun iptal ettiği an (ms); iptal yoksa null/undefined. */
  iptal?: number | null;
}

export interface EmirDolumSonucu {
  /** KARAR: 1 saatte dolan / payda, ppm. Payda 0 ise null. */
  oranPpm: number | null;
  dolan: number;
  payda: number;
  /** Süre dolmadan iptal edildiği için hariç tutulan. */
  iptalHaric: number;
  /** Penceresi gözlem sonunu aştığı için hariç tutulan (dolmamış). */
  gozlemDisi: number;
}

export function emirDolumOrani(emirler: readonly EmirKaydi[], secenek: { gozlemSonu?: number; sureMs?: number } = {}): EmirDolumSonucu {
  const sure = secenek.sureMs ?? PARSEL_H9_DOLUM_SURESI_MS;
  let dolan = 0;
  let payda = 0;
  let iptalHaric = 0;
  let gozlemDisi = 0;
  for (const e of emirler) {
    tamsayiDenetle(e.verilme, "verilme");
    const sinir = e.verilme + sure;
    const zamaninda = e.dolum !== null && e.dolum >= e.verilme && e.dolum <= sinir;
    if (zamaninda) {
      dolan++;
      payda++;
      continue;
    }
    if (e.iptal !== undefined && e.iptal !== null && e.iptal < sinir) {
      iptalHaric++;
      continue;
    }
    if (secenek.gozlemSonu !== undefined && sinir > secenek.gozlemSonu) {
      gozlemDisi++;
      continue;
    }
    payda++;
  }
  return { oranPpm: payda === 0 ? null : oranPpm(dolan, payda), dolan, payda, iptalHaric, gozlemDisi };
}

/**
 * Uygun seçmen mi: parsel sahibi VE [secimGunu − 7, secimGunu − 1] günlerinden en az 3 farklı günde aktif.
 * Günler 1 tabanlı tamsayı gün numaralarıdır.
 */
export function uygunSecmenMi(aktifGunler: readonly number[], secimGunu: number, parselSahibi: boolean): boolean {
  if (!parselSahibi) return false;
  const gunler = new Set(aktifGunler.filter((g) => g >= secimGunu - PARSEL_H9_AKTIF_PENCERE_GUN && g < secimGunu));
  return gunler.size >= PARSEL_H9_AKTIF_GUN_ESIGI;
}

export interface SecimKaydi {
  uygunSecmen: number;
  oyKullanan: number;
}

export interface OyKatilimiSonucu {
  /** KARAR: Σ oy / Σ uygun seçmen, ppm. Uygun seçmen yoksa null. */
  oranPpm: number | null;
  /** Bilgi: en düşük seçim katılımı, ppm. */
  enDusukPpm: number | null;
  secimSayisi: number;
}

export function oyKatilimi(secimler: readonly SecimKaydi[]): OyKatilimiSonucu {
  let oy = 0;
  let uygun = 0;
  let enDusuk: number | null = null;
  for (const s of secimler) {
    tamsayiDenetle(s.uygunSecmen, "uygunSecmen");
    tamsayiDenetle(s.oyKullanan, "oyKullanan");
    if (s.oyKullanan < 0 || s.oyKullanan > s.uygunSecmen) throw new Error(`oyKatilimi: oy ${s.oyKullanan} / uygun ${s.uygunSecmen} tutarsiz`);
    oy += s.oyKullanan;
    uygun += s.uygunSecmen;
    if (s.uygunSecmen > 0) {
      const o = oranPpm(s.oyKullanan, s.uygunSecmen);
      if (enDusuk === null || o < enDusuk) enDusuk = o;
    }
  }
  return { oranPpm: uygun === 0 ? null : oranPpm(oy, uygun), enDusukPpm: enDusuk, secimSayisi: secimler.length };
}

export interface H9Sonucu {
  verdict: Verdict;
  emir: EmirDolumSonucu;
  oy: OyKatilimiSonucu;
}

/** H9 kararı. Alfa-0'da seçim yoktur (NPC vali): `oy` null verilirse oy koşulu belirsiz kalır. */
export function h9Degerlendir(emir: EmirDolumSonucu, oy: OyKatilimiSonucu | null): H9Sonucu {
  const o: OyKatilimiSonucu = oy ?? { oranPpm: null, enDusukPpm: null, secimSayisi: 0 };
  const verdict = kosullardanVerdict([
    emir.oranPpm === null ? null : emir.oranPpm >= PARSEL_H9_DOLUM_ESIK_PPM,
    o.oranPpm === null ? null : o.oranPpm >= PARSEL_H9_OY_ESIK_PPM,
  ]);
  return { verdict, emir, oy: o };
}

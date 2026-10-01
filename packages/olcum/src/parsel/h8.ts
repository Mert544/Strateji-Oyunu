/**
 * H8 (parsel dünyası, yeni) — Arazi yoğunlaşması sınırlı kalır (docs/11 §7.2, §8.1; bot: spekülatör).
 *
 * Üç koşul (hepsi tutmalı):
 *  1. Arazi Gini ≤ 0,6: oyuncuların taban fiyat ağırlıklı arazi varlığı (Σ hücre × sınıf taban fiyatı) üzerinden Gini;
 *     nüfus = ölçülen TÜM oyuncular (hiç hücresi olmayanlar 0 olarak dahil). İkincil: hücre sayısı Gini'si, yalnız sahipler.
 *  2. Tek oyuncu bir ilçenin uygun hücrelerinin ≤ %25'ine sahip (ve ≤ 72 hücre; ikincisi ayrıca sayılır).
 *  3. Yeniden satış fiyatı ≤ 10 haftalık arazi geliri (satışların medyanı); yüksekse arazi vergisi düşük demektir.
 */
import type { ArsaSinifi } from "@bolge/veri";
import type { Verdict } from "../tipler";
import { PPM, dizgeSirala, kosullardanVerdict, oranPpm, tamsayiDenetle, tamsayiMedyan } from "./ortak";

export const PARSEL_H8_GINI_ESIK_PPM = 600_000;
export const PARSEL_H8_ILCE_PAYI_ESIK_PPM = 250_000;
export const PARSEL_H8_ILCE_HUCRE_TAVANI = 72;
/** Yeniden satış eşiği: 10 hafta, mili-hafta biriminde. */
export const PARSEL_H8_YENIDEN_SATIS_ESIK_MILI_HAFTA = 10_000;
/** Ağırlık: hücre başına taban fiyat (₺; docs/11 §7.2). Fiyat çarpanı ağırlığa girmez (alış anından bağımsız). */
export const ARSA_TABAN_FIYATI_TL: Readonly<Record<ArsaSinifi, number>> = { kirsal: 1_000, kasaba: 2_500, sehir: 6_500 };

/** Sahibi olan hücre kaydı (sahipsiz hücreler listeye girmez). */
export interface SahipliHucre {
  id: string;
  ilce: string;
  sinif: ArsaSinifi;
  sahip: string;
}

/**
 * Gini katsayısı, ppm (aşağı yuvarlı; BigInt): G = (2·Σ i·x_(i) − (n+1)·Σx) / (n·Σx), x artan sıralı, i = 1..n.
 * Negatif olmayan tamsayılar. n ≤ 1 ya da Σx = 0 -> 0 (tam eşitlik).
 */
export function giniPpm(degerler: readonly number[]): number {
  for (const x of degerler) {
    tamsayiDenetle(x, "gini degeri");
    if (x < 0) throw new Error(`gini: negatif deger ${x}`);
  }
  const n = degerler.length;
  if (n <= 1) return 0;
  const s = [...degerler].sort((a, b) => a - b);
  let toplam = 0n;
  let agirlikli = 0n;
  s.forEach((x, i) => {
    toplam += BigInt(x);
    agirlikli += BigInt(i + 1) * BigInt(x);
  });
  if (toplam === 0n) return 0;
  const pay = 2n * agirlikli - BigInt(n + 1) * toplam;
  return Number((pay * BigInt(PPM)) / (BigInt(n) * toplam));
}

export interface AraziGiniSonucu {
  /** KARAR: tüm oyuncular, taban fiyat ağırlıklı. */
  degerGiniPpm: number;
  /** İkincil: tüm oyuncular, hücre sayısı. */
  hucreGiniPpm: number;
  /** İkincil: yalnız en az 1 hücresi olanlar, taban fiyat ağırlıklı. */
  sahiplerDegerGiniPpm: number;
  oyuncuSayisi: number;
  sahipSayisi: number;
}

/** Arazi Gini'si. `oyuncular`: ölçülen nüfus (hücresi olmayanlar dahil); listede olmayan sahipler de eklenir. */
export function araziGini(hucreler: readonly SahipliHucre[], oyuncular: readonly string[]): AraziGiniSonucu {
  const deger = new Map<string, number>();
  const sayi = new Map<string, number>();
  for (const o of oyuncular) {
    deger.set(o, 0);
    sayi.set(o, 0);
  }
  for (const h of hucreler) {
    deger.set(h.sahip, (deger.get(h.sahip) ?? 0) + ARSA_TABAN_FIYATI_TL[h.sinif]);
    sayi.set(h.sahip, (sayi.get(h.sahip) ?? 0) + 1);
  }
  const sahipler = [...deger.values()].filter((x) => x > 0);
  return {
    degerGiniPpm: giniPpm([...deger.values()]),
    hucreGiniPpm: giniPpm([...sayi.values()]),
    sahiplerDegerGiniPpm: giniPpm(sahipler),
    oyuncuSayisi: deger.size,
    sahipSayisi: sahipler.length,
  };
}

export interface IlceYogunlasmasiSonucu {
  /** KARAR: en büyük (ilçe, oyuncu) payı = sahip olunan hücre / ilçenin uygun hücresi, ppm. Hiç sahiplik yoksa 0. */
  enBuyukPayPpm: number;
  enBuyuk: { ilce: string; oyuncu: string; hucre: number } | null;
  /** Payı %25'i aşan (ilçe, oyuncu) çifti sayısı. */
  payAsanCift: number;
  /** 72 hücreyi aşan (ilçe, oyuncu) çifti sayısı. */
  tavanAsanCift: number;
}

/** Tek oyuncunun ilçe payı. `ilceUygunHucre`: ilçe -> uygun hücre sayısı (fikstürdeki `uygunHucre`). */
export function ilceYogunlasmasi(hucreler: readonly SahipliHucre[], ilceUygunHucre: Readonly<Record<string, number>>): IlceYogunlasmasiSonucu {
  const sayac = new Map<string, Map<string, number>>();
  for (const h of hucreler) {
    const m = sayac.get(h.ilce) ?? new Map<string, number>();
    m.set(h.sahip, (m.get(h.sahip) ?? 0) + 1);
    sayac.set(h.ilce, m);
  }
  let enBuyukPayPpm = 0;
  let enBuyuk: IlceYogunlasmasiSonucu["enBuyuk"] = null;
  let payAsanCift = 0;
  let tavanAsanCift = 0;
  for (const ilce of [...sayac.keys()].sort(dizgeSirala)) {
    const uygun = ilceUygunHucre[ilce];
    if (uygun === undefined || uygun <= 0) throw new Error(`ilceYogunlasmasi: ilce "${ilce}" icin uygun hucre sayisi yok`);
    const m = sayac.get(ilce) as Map<string, number>;
    for (const oyuncu of [...m.keys()].sort(dizgeSirala)) {
      const hucre = m.get(oyuncu) as number;
      const pay = oranPpm(hucre, uygun);
      if (pay > PARSEL_H8_ILCE_PAYI_ESIK_PPM) payAsanCift++;
      if (hucre > PARSEL_H8_ILCE_HUCRE_TAVANI) tavanAsanCift++;
      if (pay > enBuyukPayPpm) {
        enBuyukPayPpm = pay;
        enBuyuk = { ilce, oyuncu, hucre };
      }
    }
  }
  return { enBuyukPayPpm, enBuyuk, payAsanCift, tavanAsanCift };
}

/** Bir yeniden satış: satış fiyatı ve o arsanın haftalık arazi geliri (aynı para birimi, ör. mili-₺). */
export interface YenidenSatis {
  fiyat: number;
  /** Arsanın son 7 günlük net üretim geliri (satış − girdi − bakım − arazi vergisi). ≤ 0 ise oran sonsuz sayılır. */
  haftalikAraziGeliri: number;
}

export interface YenidenSatisSonucu {
  /** KARAR: fiyat / haftalık gelir oranlarının medyanı, mili-hafta (10_000 = 10 hafta). Satış yoksa null. */
  medyanMiliHafta: number | null;
  /** Oranı 10 haftayı aşan satış payı (ppm; gelir ≤ 0 olanlar dahil). Satış yoksa 0. */
  esikAsanPpm: number;
  satisSayisi: number;
  /** Geliri ≤ 0 olan (üretmeyen arsa) satış sayısı. */
  gelirsizSatis: number;
}

export function yenidenSatisOrani(satislar: readonly YenidenSatis[]): YenidenSatisSonucu {
  const oranlar: number[] = [];
  let gelirsiz = 0;
  for (const s of satislar) {
    tamsayiDenetle(s.fiyat, "fiyat");
    tamsayiDenetle(s.haftalikAraziGeliri, "haftalikAraziGeliri");
    if (s.haftalikAraziGeliri <= 0) {
      gelirsiz++;
      oranlar.push(Number.MAX_SAFE_INTEGER);
    } else oranlar.push(Number((BigInt(Math.max(0, s.fiyat)) * 1000n) / BigInt(s.haftalikAraziGeliri)));
  }
  const asan = oranlar.filter((x) => x > PARSEL_H8_YENIDEN_SATIS_ESIK_MILI_HAFTA).length;
  return {
    medyanMiliHafta: tamsayiMedyan(oranlar),
    esikAsanPpm: oranlar.length === 0 ? 0 : oranPpm(asan, oranlar.length),
    satisSayisi: oranlar.length,
    gelirsizSatis: gelirsiz,
  };
}

export interface H8Sonucu {
  verdict: Verdict;
  gini: AraziGiniSonucu;
  ilce: IlceYogunlasmasiSonucu;
  yenidenSatis: YenidenSatisSonucu;
}

/** H8 kararı: üç koşul; yeniden satış hiç olmadıysa o koşul ölçülemez (belirsiz, diğerleri tutuyorsa). */
export function h8Degerlendir(gini: AraziGiniSonucu, ilce: IlceYogunlasmasiSonucu, yenidenSatis: YenidenSatisSonucu): H8Sonucu {
  const verdict = kosullardanVerdict([
    gini.degerGiniPpm <= PARSEL_H8_GINI_ESIK_PPM,
    ilce.enBuyukPayPpm <= PARSEL_H8_ILCE_PAYI_ESIK_PPM,
    yenidenSatis.medyanMiliHafta === null ? null : yenidenSatis.medyanMiliHafta <= PARSEL_H8_YENIDEN_SATIS_ESIK_MILI_HAFTA,
  ]);
  return { verdict, gini, ilce, yenidenSatis };
}

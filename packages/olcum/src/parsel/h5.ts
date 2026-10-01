/**
 * H5 (parsel dünyası) — 48 saat çevrimdışı kalan oyuncunun kaybı sınırlı (docs/11 §7.7, §8.1; botlar: akıncı, pasif).
 *
 * İki koşul:
 *  1. Parsel kaybı = 0: pencere başında çevrimdışı oyuncuya ait olup sonunda ona ait olmayan hücre sayısı.
 *     ("Parsel asla el değiştirmez"; 90 günlük hareketsizlik açık artırması 48 saatlik pencereye düşmez.)
 *  2. Depo kaybı oranı ≤ %25: her baskın penceresinde yağma kaybı / pencere içi en yüksek depo stoku (değer, taban
 *     fiyat; bölge kipi H5 ile aynı payda), pencereler içinde en büyüğü.
 */
import type { Verdict } from "../tipler";
import { kosullardanVerdict, oranPpm, tamsayiDenetle } from "./ortak";

export const PARSEL_H5_DEPO_KAYBI_ESIK_PPM = 250_000;
export const PARSEL_H5_PARSEL_KAYBI_ESIGI = 0;
/** Çevrimdışı süre (saat). */
export const PARSEL_H5_CEVRIMDISI_SAAT = 48;

export interface HucreSahipligi {
  id: string;
  sahip: string | null;
}

export interface ParselKaybiSonucu {
  /** KARAR: kaybedilen hücre sayısı. */
  kayip: number;
  /** Kaybedilen hücre kimlikleri (artan sıralı). */
  kaybedilenler: string[];
  /** Pencere başında oyuncunun hücre sayısı. */
  baslangicHucre: number;
}

/** Pencere başı ve sonu sahiplik anlık görüntülerinden oyuncunun parsel kaybı. */
export function parselKaybi(baslangic: readonly HucreSahipligi[], bitis: readonly HucreSahipligi[], oyuncu: string): ParselKaybiSonucu {
  const son = new Map<string, string | null>();
  for (const h of bitis) son.set(h.id, h.sahip);
  const kaybedilenler: string[] = [];
  let baslangicHucre = 0;
  for (const h of baslangic) {
    if (h.sahip !== oyuncu) continue;
    baslangicHucre++;
    if (son.get(h.id) !== oyuncu) kaybedilenler.push(h.id);
  }
  kaybedilenler.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { kayip: kaybedilenler.length, kaybedilenler, baslangicHucre };
}

/** Bir baskın penceresi: yağma kaybı ve pencere içi en yüksek depo stoku (aynı birim, ör. taban fiyatla mili-₺). */
export interface DepoPenceresi {
  kayip: number;
  enYuksekStok: number;
}

export interface DepoKaybiSonucu {
  /** KARAR: pencereler içinde en büyük kayıp oranı, ppm. Ölçülebilir pencere yoksa null. */
  enBuyukPpm: number | null;
  /** Oranı %25'i aşan pencere sayısı. */
  esikAsanPencere: number;
  pencereSayisi: number;
  /** Stoku 0 olduğu için oran hesaplanamayan pencereler (kayıp da 0 olmalı). */
  bosPencere: number;
}

export function depoKaybiOrani(pencereler: readonly DepoPenceresi[]): DepoKaybiSonucu {
  let enBuyuk: number | null = null;
  let asan = 0;
  let bos = 0;
  for (const p of pencereler) {
    tamsayiDenetle(p.kayip, "kayip");
    tamsayiDenetle(p.enYuksekStok, "enYuksekStok");
    if (p.enYuksekStok <= 0) {
      if (p.kayip > 0) throw new Error("depoKaybiOrani: stok 0 iken kayip > 0 (tutarsiz kayit)");
      bos++;
      continue;
    }
    const o = oranPpm(p.kayip, p.enYuksekStok);
    if (o > PARSEL_H5_DEPO_KAYBI_ESIK_PPM) asan++;
    if (enBuyuk === null || o > enBuyuk) enBuyuk = o;
  }
  return { enBuyukPpm: enBuyuk, esikAsanPencere: asan, pencereSayisi: pencereler.length, bosPencere: bos };
}

export interface H5ParselSonucu {
  verdict: Verdict;
  parsel: ParselKaybiSonucu;
  depo: DepoKaybiSonucu;
}

/** H5 kararı: parsel kaybı > 0 -> kaldı; depo oranı > %25 -> kaldı; hiç yağma penceresi yoksa depo koşulu belirsiz. */
export function h5ParselDegerlendir(parsel: ParselKaybiSonucu, depo: DepoKaybiSonucu): H5ParselSonucu {
  const verdict = kosullardanVerdict([
    parsel.kayip <= PARSEL_H5_PARSEL_KAYBI_ESIGI,
    depo.enBuyukPpm === null ? null : depo.enBuyukPpm <= PARSEL_H5_DEPO_KAYBI_ESIK_PPM,
  ]);
  return { verdict, parsel, depo };
}

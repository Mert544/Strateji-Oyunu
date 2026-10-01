/**
 * Büyüyebilen düğüm kümesi (S3, docs/11 §4.3): harita bölgeleri derlemede sabittir (`ic.bolgeIndeks`, `ic.komsuKenarlar`);
 * mülk kipinde çalışma anında eklenen işletme düğümleri ise yalnız dünyada yaşar. Bölge kimliği / komşuluk aramaları bu
 * modülden yapılır: önce derlenmiş harita dizini, sonra dünyanın işletme kayıtları. Bölge kipinde sonuç derlenmiş
 * dizinlerle birebir aynıdır.
 */
import { isletmeBul } from "./mulk/durum";
import type { BolgeDurumu, DerlenmisIcerik, Dunya, OyuncuId } from "./tipler";

/** Bölge kimliğinden indeks: harita bölgesi ya da (mülk kipinde) `<il>#<oyuncu>` işletme düğümü. Yoksa undefined. */
export function bolgeIndeksiBul(d: Dunya, ic: DerlenmisIcerik, id: string): number | undefined {
  const bi = ic.bolgeIndeks[id];
  if (bi !== undefined) return bi;
  if (d.mulk === undefined || typeof id !== "string") return undefined;
  const ayrac = id.indexOf("#");
  if (ayrac <= 0) return undefined;
  const isl = isletmeBul(d, id.slice(ayrac + 1), id.slice(0, ayrac));
  return isl?.bolgeIndeksi;
}

/** Düğümün harita tanımının indeksi: işletme düğümünde merkez bölge, harita bölgesinde kendisi. */
export function haritaIndeksi(b: BolgeDurumu): number {
  return b.merkez ?? b.indeks;
}

/**
 * Oyuncu -> sahip olduğu düğümler (artan indeks), tek geçişte. Oyuncu başına `d.bolgeler` taraması (O(oyuncu × düğüm))
 * yerine kullanılır: mülk kipinde düğüm sayısı oyuncu sayısıyla büyür. Sıra, filtreli taramayla aynıdır.
 */
export function oyuncuDugumleri(d: Dunya): Map<OyuncuId, number[]> {
  const m = new Map<OyuncuId, number[]>();
  const bolgeler = d.bolgeler;
  for (let r = 0; r < bolgeler.length; r++) {
    const sahip = (bolgeler[r] as BolgeDurumu).sahip;
    if (sahip === null) continue;
    let l = m.get(sahip);
    if (l === undefined) {
      l = [];
      m.set(sahip, l);
    }
    l.push(r);
  }
  return m;
}

/** Boş düğüm listesi (salt okunur paylaşılan). */
export const BOS_DUGUMLER: readonly number[] = Object.freeze([]);

/** Düğümün komşu kenarları: harita bölgesinde derlenmiş liste; işletme düğümünün kendi kenarı yoktur (merkeze örtük bağlı). */
export function komsuKenarlariBul(ic: DerlenmisIcerik, r: number): readonly number[] {
  return ic.komsuKenarlar[r] ?? [];
}

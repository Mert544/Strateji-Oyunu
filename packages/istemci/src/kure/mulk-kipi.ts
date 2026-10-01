/**
 * Mülk kipinde küre (saf): arka plandaki bölge simülasyonu görünmez. Bölge dolguları tek nötr kâğıt tonunda; devlet
 * renkleri, durum rozetleri ve iklim olayları yok. Oyuncunun ilçeleri ya da arsaları yalnız `sen` (çini) renginde tek bir
 * nokta işaretiyle gösterilir (simge katmanında, ek çizim çağrısı olmadan).
 */
import type { BolgeRenkTamponu, Palet, RGB } from "../veri/renkler";
import { karistir } from "../veri/renkler";
import { birim, topla } from "./matematik";
import type { Vek3 } from "./matematik";

/** Mülk işaretlerinin ekran uzayında birleştirildiği uzaklık (CSS px). */
export const KUME_ESIGI_PX = 18;

/** Bir küre işareti: yüzey birim vektörü ve temsil ettiği ilçe sayısı (1: tek nokta). */
export interface MulkIsareti {
  p: Vek3;
  sayi: number;
}

/**
 * Ekran uzayında kümeleme (saf; açgözlü, sıra deterministik): birbirine `esik` pikselden yakın görünür noktalar tek işarette
 * birleşir (konum: üyelerin ortalama yönü). Görünmeyen (kürenin arka yüzü) noktalar kümelenmez. Yakınlaşınca noktalar
 * ekranda açılır, kümeler kendiliğinden çözülür.
 * `ekran`: nokta -> [x, y] piksel ya da null (görünmüyor).
 */
export function isaretleriKumele(noktalar: readonly Vek3[], ekran: (p: Vek3) => readonly [number, number] | null, esik = KUME_ESIGI_PX): MulkIsareti[] {
  const e = noktalar.map(ekran);
  const alindi = new Array<boolean>(noktalar.length).fill(false);
  const cikti: MulkIsareti[] = [];
  for (let i = 0; i < noktalar.length; i++) {
    if (alindi[i]) continue;
    alindi[i] = true;
    const a = e[i];
    let toplam: Vek3 = noktalar[i] as Vek3;
    let sayi = 1;
    if (a) {
      for (let j = i + 1; j < noktalar.length; j++) {
        const b = e[j];
        if (alindi[j] || !b || Math.hypot(a[0] - b[0], a[1] - b[1]) >= esik) continue;
        alindi[j] = true;
        toplam = topla(toplam, noktalar[j] as Vek3);
        sayi++;
      }
    }
    cikti.push({ p: sayi > 1 ? birim(toplam) : toplam, sayi });
  }
  return cikti;
}

/** Bölge dolgusu: kara ile kâğıt arasında, kara zemininden belli belirsiz ayrılan sakin ton. */
export const MULK_DOLGU_PAYI = 0.55;

const aciklik = (c: RGB): number => c[0] + c[1] + c[2];

/**
 * Kâğıt tonu: nötr dolgu ile panel (yüzey) renginden açık olan. Kâğıda doğru açılan dolgu, kara ile su arasındaki ayrımı
 * korur (açık temada ΔE_OK ≥ 10, koyu temada ≥ 6; test/g1-gorsel.test.ts).
 */
export function mulkDolguRengi(palet: Palet, kara: RGB, panel: RGB): RGB {
  return karistir(kara, aciklik(palet.notr) >= aciklik(panel) ? palet.notr : panel, MULK_DOLGU_PAYI);
}

/** Tüm bölgeleri tek nötr tonla boyar (desen ve glif yok). */
export function mulkRenkleri(nb: number, palet: Palet, kara: RGB, panel: RGB, cikti: BolgeRenkTamponu): void {
  const r = mulkDolguRengi(palet, kara, panel);
  for (let i = 0; i < nb; i++) {
    cikti.renk[3 * i] = r[0];
    cikti.renk[3 * i + 1] = r[1];
    cikti.renk[3 * i + 2] = r[2];
    cikti.desen[i] = 0;
    cikti.glif[i] = -1;
  }
}

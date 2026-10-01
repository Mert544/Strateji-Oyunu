/**
 * Mülk kipinde küre (saf): arka plandaki bölge simülasyonu görünmez. Bölge dolguları tek nötr kâğıt tonunda; devlet
 * renkleri, durum rozetleri ve iklim olayları yok. Oyuncunun ilçeleri ya da arsaları yalnız `sen` (çini) renginde tek bir
 * nokta işaretiyle gösterilir (simge katmanında, ek çizim çağrısı olmadan).
 */
import type { BolgeRenkTamponu, Palet, RGB } from "../veri/renkler";
import { karistir } from "../veri/renkler";

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

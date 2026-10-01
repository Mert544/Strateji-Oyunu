/**
 * Tembel arazi vergisi (S3, docs/11 §7.2): yalnız ARAZİ değerine (satın alma bedelleri toplamı), yapılara değil; haftalık
 * `araziVergisiHaftalikPpm` (%1). Ayrı olay yoktur: vergi, lojistik çözümünde hazinenin saatlik oranına gider olarak
 * yazılır (mevcut tembel stok mantığı). Arazi değeri yalnız komutla (parsel_al) değişir ve her komut aynı anda çözüm
 * planlar; bu yüzden oran her an günceldir. Ödenen vergi oyuncunun `araziVergisi` stoğunda (kümülatif) tahakkuk eder.
 * Hazine 0'da kelepçelenir: hazine boşken vergi tahakkuk eder ama tahsil edilemez (borç modeli sonraki iş).
 */
import { carpBol } from "../sabit";
import { stokUzlastirYerel } from "../stok";
import { PPM } from "../tipler";
import type { DerlenmisIcerik, Dunya, Mili, OyuncuId } from "../tipler";
import { mulkOyuncuBul } from "./durum";

/** Bir haftadaki saat sayısı. */
const HAFTA_SAAT = 168;

/** Oyuncunun saatlik arazi vergisi (mili-para/saat): floor(değer × haftalıkPpm / (PPM × 168)). Mülk kapalıysa 0. */
export function araziVergisiSaat(d: Dunya, ic: DerlenmisIcerik, oyuncu: OyuncuId): Mili {
  const mk = ic.mulk;
  if (mk === undefined || d.mulk === undefined) return 0;
  const mo = mulkOyuncuBul(d, oyuncu);
  if (mo === undefined || mo.araziDegeriMili <= 0) return 0;
  return carpBol(mo.araziDegeriMili, mk.p.araziVergisiHaftalikPpm, PPM * HAFTA_SAAT);
}

/** Vergi tahakkuk stoğunu d.zaman'a uzlaştırır ve oranı günceller (lojistik çözümünün 6. adımı). */
export function araziVergisiOranAyarla(d: Dunya, ic: DerlenmisIcerik, oyuncu: OyuncuId): void {
  const mo = mulkOyuncuBul(d, oyuncu);
  if (mo === undefined) return;
  const oran = araziVergisiSaat(d, ic, oyuncu);
  if (mo.araziVergisi.yerelOran === oran) return;
  stokUzlastirYerel(mo.araziVergisi, d.zaman);
  mo.araziVergisi.yerelOran = oran;
  mo.araziVergisi.surum++;
}

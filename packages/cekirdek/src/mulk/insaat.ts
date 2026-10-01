/**
 * Hücreli inşaat aşamaları (S3, docs/11 §7.3): Temel → İskele → Gövde → Tamam. Aşama SAKLANMAZ ve ek olay planlanmaz;
 * `(şimdi − baslangic) / (bitis − baslangic)` oranından türetilir (sunucu ve istemci aynı işlevi kullanır).
 */
import { tabanBol } from "../sabit";
import type { InsaatDurumu, Ms } from "../tipler";

export const INSAAT_ASAMALARI = ["Temel", "İskele", "Gövde", "Tamam"] as const;
export type InsaatAsamasi = 0 | 1 | 2 | 3;

/**
 * İnşaatın t anındaki aşaması: 0 Temel, 1 İskele, 2 Gövde (sürenin üçte birlik dilimleri), 3 Tamam (t >= bitis).
 * `baslangic` yoksa (bölge kipi inşaatı) yalnız bitişe göre 0 ya da 3.
 */
export function insaatAsamasi(ins: Pick<InsaatDurumu, "baslangic" | "bitis">, t: Ms): InsaatAsamasi {
  if (t >= ins.bitis) return 3;
  const bas = ins.baslangic;
  if (bas === undefined || ins.bitis <= bas || t <= bas) return 0;
  const a = tabanBol((t - bas) * 3, ins.bitis - bas);
  return (a >= 2 ? 2 : a) as InsaatAsamasi;
}

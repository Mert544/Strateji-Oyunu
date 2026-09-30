/**
 * Bot genel sözleşmesi. Botlar dünyayı yalnızca `sim` üzerinden okur; ileriye bakış gerekiyorsa
 * `sim.klonla()` kullanabilir, asıl simülasyonu ASLA ilerletmez ve değiştirmez.
 */
import type { OyuncuId, Komut, Simulasyon } from "@bolge/cekirdek";
import { arketipBotu } from "./arketipler";

export type ArketipAdi = "sanayici" | "tuccar" | "lojistikci" | "militarist" | "kur_ve_unut" | "pasif";

export const ARKETIPLER: readonly ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist", "kur_ve_unut", "pasif"];

export interface Bot {
  readonly oyuncu: OyuncuId;
  readonly arketip: ArketipAdi;
  /** O anki dünya durumuna göre (sim.dunya.zaman) komut listesi üretir; durum değişikliği yapmaz. */
  karar(sim: Simulasyon): Komut[];
}

/** Arketipten bot üretir. `tohum` yalnızca eşit faydalı adaylar arasındaki küçük sapmayı belirler. */
export function botOlustur(arketip: ArketipAdi, oyuncu: OyuncuId, tohum = 0): Bot {
  return arketipBotu(arketip, oyuncu, tohum);
}

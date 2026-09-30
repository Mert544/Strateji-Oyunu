/**
 * Askeri alt sistem (spesifikasyon §6). Motor yalnızca bu dosyadaki fonksiyonları çağırır.
 * - uretim.ts: birlik üretimi, parti bitişi, ikmal talebi
 * - savas.ts: savunma emri, savaş ilanı, pencere, otomatik çözüm, yağma ve kayıp tavanı
 */
import type { Baglam, Dunya, Komut, KomutSonucu, OyuncuId } from "../tipler";
import { savasIlan, savunmaEmri } from "./savas";
import { birlikUret } from "./uretim";

export { savasPencereAc, savasPencereKapa } from "./savas";
export { partiBitti, ikmalTalebi } from "./uretim";

/** Askeri komutlar: birlik_uret, savas_ilan, savunma_emri. */
export function askeriKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: Komut): KomutSonucu {
  switch (k.tur) {
    case "birlik_uret":
      return birlikUret(d, ctx, oyuncu, k);
    case "savas_ilan":
      return savasIlan(d, ctx, oyuncu, k);
    case "savunma_emri":
      return savunmaEmri(d, ctx, oyuncu, k);
    default:
      return { tamam: false, hata: `askeri alt sistem bu komutu bilmiyor: ${k.tur}` };
  }
}

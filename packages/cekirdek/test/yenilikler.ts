/**
 * v0.1 yeniliklerini (erken oyun hızlandırması, para lavaboları, teknoloji yayılımı) kapatan test yardımcısı.
 * Eski testler çekirdek mekaniklerini özgün (hızlandırılmamış, gidersiz) süre ve sayılarla doğrular;
 * yeniliklerin kendi testleri yenilikler.test.ts içindedir.
 */
import type { VeriPaketi } from "@bolge/veri";

/** Paketi yerinde değiştirir ve aynı paketi döndürür. */
export function yenilikleriKapat(veri: VeriPaketi): VeriPaketi {
  veri.param.erkenOyun.baslangicCarpaniPpm = 1_000_000;
  veri.param.ekonomi.tesisIsletmeParasiSaat = 0;
  veri.param.askeri.birlikMaasiSaat = 0;
  veri.param.teknoloji.yayilimIndirimiPpm = 0;
  return veri;
}

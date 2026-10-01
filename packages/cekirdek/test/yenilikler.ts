/**
 * v0.1 yeniliklerini (erken oyun hızlandırması, para lavaboları, teknoloji yayılımı) ve tarım katmanını (B1:
 * iklim takvimi, toprak, olaylar, gübre) kapatan test yardımcısı.
 * Eski testler çekirdek mekaniklerini özgün (hızlandırılmamış, gidersiz) süre ve sayılarla doğrular;
 * yeniliklerin kendi testleri yenilikler.test.ts içindedir.
 */
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";

/** Paketi yerinde değiştirir ve aynı paketi döndürür. */
export function yenilikleriKapat(veri: VeriPaketi): VeriPaketi {
  veri.param.erkenOyun.baslangicCarpaniPpm = 1_000_000;
  veri.param.ekonomi.tesisIsletmeParasiSaat = 0;
  veri.param.askeri.birlikMaasiSaat = 0;
  veri.param.teknoloji.yayilimIndirimiPpm = 0;
  // Tarım kapalı: parametreler yoksa çekirdek v0.2 davranışını birebir verir (harita/içerik alanları etkisiz kalır).
  delete veri.param.iklim;
  delete veri.param.tarim;
  return veri;
}

/**
 * Tarım katmanını (B1) açar: varsayılan parametrelerdeki `iklim` ve `tarim` bloklarını pakete kopyalar
 * (varsayılan oyun artık tarımlıdır; `yenilikleriKapat` bunları siler). Paketi yerinde değiştirir ve döndürür.
 * Harita mini-6 (tarım alanlı bölgeler) ve içerik varsayılan içeriktir.
 */
export function tarimAc(veri: VeriPaketi): VeriPaketi {
  const varsayilan = varsayilanVeriyiYukle().param;
  veri.param.iklim = structuredClone(varsayilan.iklim);
  veri.param.tarim = structuredClone(varsayilan.tarim);
  return veri;
}

/** Tüm olay türleri ve iklim tipleri için olasılık çarpanını yükseltir (testte olayların sık oluşması için). */
export function olaylariSiklastir(veri: VeriPaketi, carpanPpm = 50_000_000): VeriPaketi {
  const iklim = veri.param.iklim;
  if (iklim === undefined) throw new Error("olaylariSiklastir: tarim kapali");
  for (const tur of Object.keys(iklim.tipOlasilikCarpaniPpm) as Array<keyof typeof iklim.tipOlasilikCarpaniPpm>) {
    const satir = iklim.tipOlasilikCarpaniPpm[tur];
    for (const tip of Object.keys(satir) as Array<keyof typeof satir>) satir[tip] = carpanPpm;
  }
  return veri;
}

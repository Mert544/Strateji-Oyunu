/**
 * v0.1 yeniliklerini (erken oyun hızlandırması, para lavaboları, teknoloji yayılımı), tarım katmanını (B1:
 * iklim takvimi, toprak, olaylar, gübre), sanayi katmanını (B2: elektrik, ölçek, aşınma, kirlilik, damar) ve pazar katmanını
 * (B3: liman primi, komisyon, kıtlık, NPC likidite ölçeği) kapatan test yardımcısı (`pazarAc`: pazar-yardimci.ts).
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
  // Sanayi kapalı: parametre yoksa çekirdek Tarım v1 davranışını birebir verir (elektrik girdileri ve santral çıktısı yok sayılır).
  delete veri.param.sanayi;
  // Pazar v1 kapalı (B3): B3 alanları yoksa liman primi, komisyon, kıtlık cezası ve NPC likidite ölçeği yoktur; eski makas çarpanları geçerlidir.
  for (const a of ["makasPpm", "anlasmaMakasPpm", "yaptirimMakasPpm", "limanPrimPpmSaat", "limanPrimTavaniPpm", "islemKomisyonuPpm", "npcLikiditeTabanOyuncu", "kitlik", "tarife"] as const) {
    delete veri.param.pazar[a];
  }
  // Başlangıç santralleri (mini-6, varsayılan oyun sanayili) kapalı modda anlamsızdır: eski tesis listeleri korunur.
  for (const b of veri.harita.bolgeler) b.tesisler = b.tesisler.filter((t) => t !== "santral" && t !== "hidro_santrali");
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

/**
 * Sanayi katmanını (B2) açar: varsayılan parametrelerdeki `sanayi` bloğunu pakete kopyalar (`yenilikleriKapat` siler).
 * Harita mini-6 ve içerik varsayılan içeriktir. Paketi yerinde değiştirir ve döndürür.
 */
export function sanayiAc(veri: VeriPaketi): VeriPaketi {
  const varsayilan = varsayilanVeriyiYukle().param;
  veri.param.sanayi = structuredClone(varsayilan.sanayi);
  return veri;
}

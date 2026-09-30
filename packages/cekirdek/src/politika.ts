/**
 * SAPLAMA (stub) — Faz 2'de "askeri + teknoloji + politika" ajanı uygular.
 */
import type { Baglam, Dunya, Komut, KomutSonucu, OyuncuId } from "./tipler";

/** Komutlar: anlasma_teklif, anlasma_feshet, yaptirim. */
export function politikaKomutu(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId, _k: Komut): KomutSonucu {
  return { tamam: false, hata: "uygulanmadı" };
}

/**
 * Oyuncu bu kenarı lojistikte kullanabilir mi? Kural: kenarın iki ucu da oyuncunun
 * ya da "ortak_altyapi" anlaşmalı bir ortağın bölgesi olmalı.
 */
export function kenarKullanilabilirMi(d: Dunya, _ctx: Baglam, oyuncu: OyuncuId, kenar: number): boolean {
  const k = d.kenarlar[kenar];
  if (!k) return false;
  return d.bolgeler[k.a]?.sahip === oyuncu && d.bolgeler[k.b]?.sahip === oyuncu;
}

/** Oyuncunun dünya pazarı fiyat çarpanları (ppm): anlaşma ve yaptırımlara göre. */
export function pazarCarpanlari(
  _d: Dunya,
  ctx: Baglam,
  _oyuncu: OyuncuId,
): { ithalatPpm: number; ihracatPpm: number } {
  return {
    ithalatPpm: ctx.ic.param.pazar.ithalatCarpaniPpm,
    ihracatPpm: ctx.ic.param.pazar.ihracatCarpaniPpm,
  };
}

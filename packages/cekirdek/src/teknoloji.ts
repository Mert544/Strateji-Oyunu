/**
 * SAPLAMA (stub) — Faz 2'de "askeri + teknoloji + politika" ajanı uygular.
 */
import type { Baglam, Dunya, Komut, KomutSonucu, OyuncuId } from "./tipler";

/** Komut: arastir. Maliyeti hazineden düşer, bitişte arastirma_bitti olayı planlanır. */
export function teknolojiKomutu(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId, _k: Komut): KomutSonucu {
  return { tamam: false, hata: "uygulanmadı" };
}

export function arastirmaBitti(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId): void {}

/** Oyuncu için yöntem açık mı (gerekliTeknoloji yoksa her zaman açık). */
export function yontemAcikMi(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId | null, _yontem: number): boolean {
  return true;
}

export function tesisTuruAcikMi(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId, _tur: number): boolean {
  return true;
}

export function birlikAcikMi(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId, _birlik: number): boolean {
  return true;
}

/**
 * SAPLAMA (stub) — Faz 2'de "askeri + teknoloji + politika" ajanı uygular.
 */
import type { Baglam, Dunya, Komut, KomutSonucu, Mili, OyuncuId } from "../tipler";

/** Askeri komutlar: birlik_uret, savas_ilan, savunma_emri. */
export function askeriKomutu(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId, _k: Komut): KomutSonucu {
  return { tamam: false, hata: "uygulanmadı" };
}

export function partiBitti(_d: Dunya, _ctx: Baglam, _partiId: number): void {}
export function savasPencereAc(_d: Dunya, _ctx: Baglam, _savasId: number): void {}
export function savasPencereKapa(_d: Dunya, _ctx: Baglam, _savasId: number): void {}

/**
 * Lojistik kancası: bölgedeki birliklerin saatlik ikmal talebi (mal indeksine göre, mili-birim/saat).
 * Uzunluk = mal sayısı.
 */
export function ikmalTalebi(d: Dunya, _ctx: Baglam, _bolge: number): Mili[] {
  return new Array<number>(d.pazar.fiyat.length).fill(0);
}

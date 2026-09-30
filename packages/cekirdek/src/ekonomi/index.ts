/**
 * SAPLAMA (stub) — Faz 2'de "ekonomi + lojistik" ajanı uygular.
 * Motor bu fonksiyonları çağırır; imzalar sözleşmedir.
 */
import type { Baglam, Dunya, Komut, KomutSonucu, OyuncuId } from "../tipler";

/** Saatlik tık: fiyatlar, nüfus, bozulma, rezerv tükenmesi, vergi geliri; sonunda ctx.kirlet(). */
export function saatlikTik(_d: Dunya, _ctx: Baglam): void {}

/** Ekonomi komutları: tesis_insa, yontem_degistir, tesis_durum, ticaret_emri, vergi_ayarla. */
export function ekonomiKomutu(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId, _k: Komut): KomutSonucu {
  return { tamam: false, hata: "uygulanmadı" };
}

/** Bir inşaat bittiğinde (tesis veya kenar geliştirme). */
export function insaatBitti(_d: Dunya, _ctx: Baglam, _insaatId: number): void {}

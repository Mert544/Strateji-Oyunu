/**
 * SAPLAMA (stub) — Faz 2'de "ekonomi + lojistik" ajanı uygular.
 */
import type { Baglam, Dunya, Komut, KomutSonucu, OyuncuId } from "../tipler";

/**
 * Tam yeniden çözüm (cozum olayında çağrılır):
 * 1) Bölge bazında yerel üretim/tüketim oranlarını hesapla (tesis verimi, istihdam,
 *    nüfus tüketimi, ordu ikmali, ticaret emirleri, bakım).
 * 2) Sahip ağı başına, mal başına (lojistikSirasi) min-maliyet akışıyla fazlayı açığa taşı;
 *    kenar kapasitesi mallar arasında paylaşılır.
 * 3) Stok yerel oranlarını ayarla; akış değişimlerini hedefte t+süre'de oran_delta olarak planla.
 * 4) Kapsam (nerede açık, neden) hesapla.
 */
export function lojistikCoz(_d: Dunya, _ctx: Baglam): void {}

/** Lojistik komutları: kenar_gelistir, askeri_rezerv. */
export function lojistikKomutu(_d: Dunya, _ctx: Baglam, _oyuncu: OyuncuId, _k: Komut): KomutSonucu {
  return { tamam: false, hata: "uygulanmadı" };
}

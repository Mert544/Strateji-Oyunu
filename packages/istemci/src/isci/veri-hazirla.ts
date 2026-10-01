/**
 * İşçiye gelen veri paketinin hazırlanması (saf; test edilebilir): tarım alanı JSON'da yoksa Node'daki yükleyiciyle
 * (`@bolge/veri` paketYukle) aynı kuralla türetilir, ardından paket aynı doğrulayıcıdan geçer. Böylece tarayıcı
 * simülasyonu Node simülasyonuyla aynı tarım davranışını gösterir.
 */
import { dogrulaVeriPaketi, tarimAlanlariniTamamla } from "@bolge/veri/saf";
import type { VeriPaketi } from "@bolge/veri/saf";

export type VeriHazirlamaSonucu = { tamam: true; doldurulan: number } | { tamam: false; hatalar: string[] };

/** Paketi YERİNDE tamamlar (işçiye kopyalanarak geldiği için güvenlidir) ve doğrular. */
export function veriPaketiniHazirla(paket: VeriPaketi): VeriHazirlamaSonucu {
  const doldurulan = tarimAlanlariniTamamla(paket);
  const sonuc = dogrulaVeriPaketi(paket);
  return sonuc.gecerli ? { tamam: true, doldurulan } : { tamam: false, hatalar: sonuc.hatalar };
}

/** Doğrulama hatalarını arayüzde gösterilecek kısa metne çevirir (en çok `en` satır). */
export function hataMetni(hatalar: readonly string[], en = 12): string {
  return `Veri paketi doğrulanamadı (${hatalar.length} hata):\n` + hatalar.slice(0, en).join("\n") + (hatalar.length > en ? `\n… ve ${hatalar.length - en} hata daha` : "");
}

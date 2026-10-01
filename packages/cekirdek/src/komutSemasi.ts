/**
 * Komut alan sözlüğü (para güvenliği, docs/06 §15.7): `Komut` birliğinin HER alanı bir türe ayrılır ve her komutun YOLU (oyuncu ya da yalnız
 * "sistem") bildirilir. Türleme derleme zamanında tamdır: `Komut`a tür ya da alan eklenince bu dosya derlenmez, yazar alanı sınıflamak zorundadır.
 *
 * İLKE: "para ya da miktar taşıyan sistem komutu YOK". Sistem yolundaki bir komut yalnız kimlik, seçim ve bayrak alanı taşıyabilir
 * (`miktar`, `oran`, `adet` alanı taşıyamaz); ödüller bu yüzden tutarsızdır: `sistem_odul {oyuncu, kavram}` tutarı çekirdek ödül tablosundan
 * (`param.odul`) alır. Oyuncunun KENDİ ekonomisini yöneten komutlar (ticaret emri oranı, vergi oranı, birlik adedi...) oyuncu yolundadır ve
 * serbesttir; oyuncu yolu yalnız oyuncunun kendi hazine, stok ve kapasitesiyle sınırlıdır (çekirdek denetler). Ajan yolu da bu tabloya bağlıdır:
 * ajan komutları "sistem" yoludur ve para alanı taşıyamaz.
 */
import type { Komut, KomutTuru } from "./tipler";

/** Alan türü: kimlik (bölge/mal/oyuncu/hücre...), seçim (sıralı seçenek, indeks, kademe), bayrak, miktar (para/mal tutarı ya da hızı), oran (ppm), adet (sayı). */
export type AlanTuru = "kimlik" | "secim" | "bayrak" | "miktar" | "oran" | "adet";

/** Sistem yolundaki bir komutta bulunabilecek alan türleri (para/miktar taşımayanlar). */
export const SISTEM_ALAN_TURLERI: readonly AlanTuru[] = ["kimlik", "secim", "bayrak"];

type KomutAlanlari<K extends KomutTuru> = Exclude<keyof Extract<Komut, { tur: K }>, "tur">;

export interface KomutBilgisi<K extends KomutTuru> {
  /** "sistem": yalnız sistem oyuncusu (sunucu damgası) verebilir; "oyuncu": kayıtlı oyuncu. */
  yol: "oyuncu" | "sistem";
  alanlar: { [F in KomutAlanlari<K>]-?: AlanTuru };
}

export const KOMUT_SEMASI: { [K in KomutTuru]: KomutBilgisi<K> } = {
  // Ekonomi
  tesis_insa: { yol: "oyuncu", alanlar: { bolge: "kimlik", tesisTuru: "kimlik" } },
  yontem_degistir: { yol: "oyuncu", alanlar: { bolge: "kimlik", tesis: "kimlik", yontem: "kimlik" } },
  tesis_durum: { yol: "oyuncu", alanlar: { bolge: "kimlik", tesis: "kimlik", aktif: "bayrak" } },
  ticaret_emri: { yol: "oyuncu", alanlar: { bolge: "kimlik", mal: "kimlik", yon: "secim", oranSaat: "miktar" } },
  vergi_ayarla: { yol: "oyuncu", alanlar: { oranPpm: "oran" } },
  // Tarım
  ekim_plani: { yol: "oyuncu", alanlar: { bolge: "kimlik", ekimPpm: "oran" } },
  gubre_dozu: { yol: "oyuncu", alanlar: { bolge: "kimlik", doz: "secim" } },
  // Sanayi
  tesis_olcek_yukselt: { yol: "oyuncu", alanlar: { bolge: "kimlik", tesis: "kimlik", olcek: "secim" } },
  genel_onarim: { yol: "oyuncu", alanlar: { bolge: "kimlik" } },
  bakim_duzeyi: { yol: "oyuncu", alanlar: { duzey: "secim" } },
  arama_sondaji: { yol: "oyuncu", alanlar: { bolge: "kimlik", mal: "kimlik" } },
  // Lojistik
  kenar_gelistir: { yol: "oyuncu", alanlar: { kenar: "kimlik" } },
  askeri_rezerv: { yol: "oyuncu", alanlar: { oranPpm: "oran" } },
  // Askeri
  birlik_uret: { yol: "oyuncu", alanlar: { bolge: "kimlik", birlik: "kimlik", adet: "adet" } },
  savas_ilan: { yol: "oyuncu", alanlar: { saldiranBolge: "kimlik", hedefBolge: "kimlik" } },
  savunma_emri: { yol: "oyuncu", alanlar: { bolge: "kimlik", durus: "secim" } },
  // Teknoloji
  arastir: { yol: "oyuncu", alanlar: { teknoloji: "kimlik" } },
  // Politika
  anlasma_teklif: { yol: "oyuncu", alanlar: { karsi: "kimlik", anlasma: "secim" } },
  anlasma_feshet: { yol: "oyuncu", alanlar: { karsi: "kimlik", anlasma: "secim" } },
  yaptirim: { yol: "oyuncu", alanlar: { hedef: "kimlik", aktif: "bayrak" } },
  // Sistem
  oyuncu_katil: { yol: "sistem", alanlar: { oyuncu: "kimlik", bolgeler: "kimlik", ilce: "kimlik" } },
  sistem_odul: { yol: "sistem", alanlar: { oyuncu: "kimlik", kavram: "kimlik" } },
  // Mülk kipi
  parsel_al: { yol: "oyuncu", alanlar: { ilce: "kimlik", hucreler: "kimlik", sinif: "secim" } },
  tesis_insa_hucre: { yol: "oyuncu", alanlar: { ilce: "kimlik", tesisTuru: "kimlik", hucreler: "kimlik" } },
  insaat_iptal: { yol: "oyuncu", alanlar: { insaat: "kimlik" } },
  yapi_yerlestir: { yol: "oyuncu", alanlar: { ilce: "kimlik", tesisTuru: "kimlik", hucreler: "kimlik", sinif: "secim" } },
  parsel_birak: { yol: "oyuncu", alanlar: { ilce: "kimlik", hucreler: "kimlik" } },
};

/** Komut yalnız sistem yolundan mı verilir? */
export function sistemKomutuMu(tur: KomutTuru): boolean {
  return KOMUT_SEMASI[tur].yol === "sistem";
}

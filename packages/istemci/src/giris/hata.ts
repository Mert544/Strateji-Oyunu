/**
 * Giriş hata sunumu (G9-a; saf): sunucu/istemci hata kodu → metin anahtarı, eylem ve bekleme süresi.
 * Metinler G9-b'nin metin tablosundadır (A1: `giris.G6.<kod>`); burada YALNIZ anahtar ve eylem vardır. Sunucunun `mesaj` alanı
 * gösterilmez. Hesabın var olup olmadığı, e-posta başına sınır ve posta sonucu hiçbir hatadan ima edilmez (`hiz_siniri` yalnız IP
 * ve genel sınırdır; e-posta başına sınır yanıtı değiştirmez, bu yüzden istemci sayacı vardır: `akis.ts`).
 */
import type { IstemciHataKodu } from "./api";

export type GirisEkraniAdi = "g1" | "g2" | "g3" | "g4" | "g7";

/** Ekranın hata için yapacağı şey (T1 sözleşmesi G-6 "Eylem" sütunu). */
export type HataEylemi =
  /** Alanda kal, düzeltip yeniden gönder (g1). */
  | "alanda-kal"
  /** Düğme kapalı, canlı geri sayım (`beklemeSn` → dakika). */
  | "bekle"
  /** Sayfayı yenile (köken/gövde sorunu). */
  | "yenile"
  /** Aynı işlemi yeniden dene (ağ/geçici sunucu hatası). */
  | "yeniden-dene"
  /** G-1'e dön ve yeni bağlantı iste. */
  | "yeni-baglanti-iste"
  /** G-7: oturum doldu, yeniden giriş. */
  | "giris";

/** `giris.G6.<kod>` anahtarı; sunucu kodu olmayan ya da metni başka bir kodla aynı olanlar eşlenir. */
export function hataAnahtari(kod: IstemciHataKodu): string {
  switch (kod) {
    // 405, 404 ve bozuk/beklenmeyen yanıt: "Giriş şu an yapılamıyor. Biraz sonra yeniden dene."
    case "yontem":
    case "bulunamadi":
    case "yanit":
      return "giris.G6.ic_hata";
    default:
      return `giris.G6.${kod}`;
  }
}

/** Ekrana göre eylem. */
export function hataEylemi(kod: IstemciHataKodu, ekran: GirisEkraniAdi): HataEylemi {
  switch (kod) {
    case "gecersiz_eposta":
      return "alanda-kal";
    case "gecici_eposta":
      // g1: alanda kal; g3: onayda çıkabilir (liste istekten sonra güncellenmiş) → G-1'e dön, kalıcı adresle iste
      return ekran === "g3" ? "yeni-baglanti-iste" : "alanda-kal";
    case "hiz_siniri":
      return "bekle";
    case "origin":
    case "gecersiz_istek":
      return "yenile";
    case "baglanti_gecersiz":
    case "tarayici_uyumsuz":
      return "yeni-baglanti-iste";
    case "oturum_yok":
      return "giris";
    default:
      // ag_hatasi, zaman_asimi, ic_hata, yontem, bulunamadi, yanit
      return "yeniden-dene";
  }
}

/** `giris.G6.hiz_siniri` {n}: `beklemeSn` → YUKARI yuvarlı dakika (en az 1). Bilinmiyorsa 1. */
export function hizSiniriDakika(beklemeSn: number | undefined): number {
  if (beklemeSn === undefined || !Number.isFinite(beklemeSn) || beklemeSn <= 0) return 1;
  return Math.max(1, Math.ceil(beklemeSn / 60));
}

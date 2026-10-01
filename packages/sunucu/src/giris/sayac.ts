/** Giriş sayaçları ve günlük kancası: YALNIZ toplu sayılar ve maskelenmiş/anonim alanlar (belirteç, tam adres ve IP yok). */
export type GirisGunlugu = (olay: string, veri?: Record<string, string | number | boolean>) => void;

/** Metriklerde her zaman görünen olaylar (sıfır dahil): panolar boş seriyle kalmasın. */
export const BILINEN_GIRIS_OLAYLARI = [
  "istek.kabul",
  "istek.gecersiz_eposta",
  "istek.gecici_eposta",
  "istek.hiz_siniri",
  "istek.eposta_siniri",
  "posta.gonderildi",
  "posta.hata",
  "onay.tamam",
  "onay.yeni_hesap",
  "onay.baglanti_gecersiz",
  "onay.tarayici_uyumsuz",
  "onay.hiz_siniri",
  "bilet.verildi",
  "bilet.reddedildi_imza",
  "bilet.reddedildi_sure",
  "bilet.reddedildi_tekrar",
  "bilet.reddedildi_iptal",
  "bilet.hiz_siniri",
  "http.origin_reddi",
  "oturum.kapatildi",
] as const;

export class GirisSayaclari {
  private readonly d = new Map<string, number>(BILINEN_GIRIS_OLAYLARI.map((o) => [o, 0]));

  artir(olay: string, n = 1): void {
    this.d.set(olay, (this.d.get(olay) ?? 0) + n);
  }

  al(olay: string): number {
    return this.d.get(olay) ?? 0;
  }

  hepsi(): Record<string, number> {
    return Object.fromEntries([...this.d.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  }
}

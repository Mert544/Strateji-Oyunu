/** Komut kaydı ve hata çevirisi için ortak tipler (saf; DOM yok). */
import type { Komut, KomutTuru } from "@bolge/cekirdek";
import type { Dizin, Kare, OyuncuKaresi } from "../veri/kare-tipleri";
import type { Icerik } from "./tablo";

export type { Komut, KomutTuru };

/** Ad çözümleme için gereken en az bağlam (işçide de kurulabilir). */
export interface OzetBaglami {
  ic: Icerik;
  dizin: Dizin;
  /** Bölge indeksinden görünen ad. */
  bolgeAd: (i: number) => string;
}

/** Bir formun çizildiği andaki oyun durumu. `bolge` seçili bölge indeksidir (-1: yok). */
export interface Baglam extends OzetBaglami {
  kare: Kare;
  ben: OyuncuKaresi;
  bolge: number;
}

const bolgeIdOnbellek = new WeakMap<Dizin, Map<string, number>>();

/** Bölge kimliğinden indeks (bilinmiyorsa -1). */
export function bolgeIndeksi(d: Dizin, id: string): number {
  let m = bolgeIdOnbellek.get(d);
  if (!m) {
    m = new Map(d.bolgeler.map((b, i) => [b.id, i]));
    bolgeIdOnbellek.set(d, m);
  }
  return m.get(id) ?? -1;
}

export function bolgeAdiId(o: OzetBaglami, id: string): string {
  const i = bolgeIndeksi(o.dizin, id);
  return i < 0 ? id : o.bolgeAd(i);
}

/** Form alanı (metin değerli). */
export type Alan =
  | { tip: "secim"; ad: string; etiket: string; secenekler: Secenek[] }
  | { tip: "sayi"; ad: string; etiket: string; min: number; max: number; adim: number; birim?: string }
  /** Toplamı `toplam` olan paylar; alan adları `${ad}.${i}`. */
  | { tip: "paylar"; ad: string; etiket: string; kalemler: string[]; toplam: number };

export interface Secenek {
  deger: string;
  etiket: string;
  /** Doluysa seçenek seçilemez ve metin nedenini açıklar. */
  devre?: string;
}

export type Girdi = Record<string, string>;

/** Önizleme satırı; `durum` renk/işaret verir. */
export interface OnizlemeSatiri {
  metin: string;
  durum?: "iyi" | "kotu" | "uyari";
}

/**
 * Komut formu tanımı: yeni bir çekirdek komutu eklenince KOMUT_KAYDI'na bir kayıt eklemek yeter
 * (form, doğrulama, özet ve hata çevirisi aynı yerden gelir).
 */
export interface KomutTanimi {
  /** Form kimliği (genelde komut türü). */
  id: string;
  tur: KomutTuru;
  ad: string;
  kapsam: "bolge" | "devlet";
  /** Kısa açıklama (formun başında). */
  aciklama: string;
  /** Gönder düğmesi etiketi. */
  gonder: string;
  /** null: uygun; metin: bu bağlamda neden uygun değil. */
  uygun(b: Baglam): string | null;
  alanlar(b: Baglam, g: Girdi): Alan[];
  varsayilan(b: Baglam): Girdi;
  /** Girdiden komut üretir; hata metni döndürürse gönderilmez. */
  komut(b: Baglam, g: Girdi): Komut | string;
  onizleme?(b: Baglam, g: Girdi): OnizlemeSatiri[];
  /** Başarılı komutu Türkçe tek cümleye döker (bildirim metni; geçmiş zaman). */
  ozet(k: Komut, o: OzetBaglami): string;
  /** Önerilen eylem metni (emir kipi: "Çiftlik kur"); yoksa `ozet` kullanılır. */
  eylem?(k: Komut, o: OzetBaglami): string;
}

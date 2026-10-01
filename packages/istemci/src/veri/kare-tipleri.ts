/**
 * Anlık görüntü (Kare) ve dizin tipleri. Biçim, packages/izleyici/src/tipler.ts ile AYNIDIR; istemci paketi
 * izleyiciye (node bağımlılıkları) bağlanmamak için tipleri burada yineler. Miktarlar "birim", oranlar birim/saat.
 */

/** Kapsam neden kodları (AciklikNedeni sırasıyla). */
export const NEDEN_KODLARI = ["yok", "kapasite", "girdi_eksik", "mesafe", "erisim_yok"] as const;
export type NedenKodu = (typeof NEDEN_KODLARI)[number];

export interface DizinDevlet {
  id: string;
  ad: string;
  blok: string;
}

export interface DizinMal {
  id: string;
  ad: string;
  kategori: string;
  taban: number;
}

export interface DizinBolge {
  id: string;
  ad: string;
  /** Devlet indeksi (DizinDevlet). */
  devlet: number;
  etiketler: string[];
  x: number;
  y: number;
  nufus0: number;
}

export interface DizinKenar {
  a: number;
  b: number;
  tur: "kara" | "deniz" | "hava";
  /** Taşıma süresi (saat). */
  sure: number;
}

export interface DizinOyuncu {
  id: string;
  devlet: number;
  arketip: string;
}

export interface DizinTesisTuru {
  id: string;
  ad: string;
}

export interface DizinYontem {
  id: string;
  ad: string;
}

export interface DizinBirlik {
  id: string;
  ad: string;
}

export interface Dizin {
  devletler: DizinDevlet[];
  mallar: DizinMal[];
  bolgeler: DizinBolge[];
  kenarlar: DizinKenar[];
  oyuncular: DizinOyuncu[];
  tesisTurleri: DizinTesisTuru[];
  yontemler: DizinYontem[];
  birlikler: DizinBirlik[];
}

/** tesis: [tesisTuruIndeksi, yontemIndeksi, aktif(0/1), verim%, isci%]; ordu: [[birlikIndeksi, adet], ...] */
export interface BolgeKaresi {
  /** Sahip oyuncu indeksi; sahipsiz = -1. */
  sahip: number;
  nufus: number;
  gida: number;
  ikmal: number;
  stok: number[];
  uretim: number[];
  tesis: Array<[number, number, number, number, number]>;
  ordu: Array<[number, number]>;
  /** 0 normal, 1 savunma, 2 geri çekil. */
  durus: number;
}

/** [kapasite, kullanılan, askeri kullanılan] (birim/saat). */
export type KenarKaresi = [number, number, number];

/** [mal, oran (birim/saat), kaynak bölge, hedef bölge, yol (kenar indeksleri), sahip oyuncu] */
export type AkisKaresi = [number, number, number, number, number[], number];

/** [bölge, mal, karşılanma %, neden kodu, en yakın kaynağa süre (saat, -1 = yok)] */
export type KapsamKaresi = [number, number, number, number, number];

export interface SavasKaresi {
  id: number;
  saldiran: number;
  savunan: number;
  saldiranBolge: number;
  hedefBolge: number;
  evre: "hazirlik" | "pencere" | "bitti";
  ilan: number;
  pencereBitis: number;
  sonuc: null | { kazanan: number; saldiranGuc: number; savunanGuc: number; kayipYuzde: number };
}

export interface Kare {
  /** Sim-saat. */
  saat: number;
  bolgeler: BolgeKaresi[];
  kenarlar: KenarKaresi[];
  akislar: AkisKaresi[];
  kapsam: KapsamKaresi[];
  /** Mal indeksine göre fiyat / taban fiyat (binde). */
  fiyat: number[];
  savaslar: SavasKaresi[];
  hazine: number[];
  hazineOrani: number[];
}

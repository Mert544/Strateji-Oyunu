/**
 * İzleyici veri şeması: simülasyon koşusundan çıkarılan, küçük ve JSON'a serileştirilebilir anlık görüntüler.
 *
 * Boyut kuralları: miktarlar "birim" (mili-birim / 1000), oranlar birim/saat (tek ondalık), yüzdeler tamsayı;
 * yalnızca sıfır olmayan akışlar ve yalnızca tam karşılanmayan kapsam hücreleri yazılır.
 * Dizilerdeki konumlar (bölge, mal, kenar, oyuncu indeksleri) `Dizin`deki statik listelere göre yorumlanır.
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
  /** Taban fiyat (para/birim). */
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
  /** Başlangıç nüfusu. */
  nufus0: number;
}

export interface DizinKenar {
  /** Bölge indeksleri. */
  a: number;
  b: number;
  tur: "kara" | "deniz" | "hava";
  /** Taşıma süresi (saat). */
  sure: number;
}

export interface DizinOyuncu {
  id: string;
  /** Oyuncunun ilk bölgelerinin devleti (DizinDevlet indeksi). */
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

/**
 * Bölgenin anlık durumu.
 * tesis: [tesisTuruIndeksi, yontemIndeksi, aktif(0/1), verim%, isci%]
 * ordu: [[birlikIndeksi, adet], ...] (yalnızca sıfırdan büyük)
 */
export interface BolgeKaresi {
  /** Sahip oyuncu indeksi; sahipsiz = -1. */
  sahip: number;
  nufus: number;
  /** Gıda karşılanma yüzdesi (0-100). */
  gida: number;
  /** Ordu ikmali karşılanma yüzdesi (0-100). */
  ikmal: number;
  /** Mal indeksine göre stok (birim, tamsayı). */
  stok: number[];
  /** Mal indeksine göre brüt üretim (birim/saat, tek ondalık). */
  uretim: number[];
  tesis: Array<[number, number, number, number, number]>;
  ordu: Array<[number, number]>;
  /** Savunma duruşu kodu: 0 normal, 1 savunma, 2 geri çekil. */
  durus: number;
}

/** [kapasite, kullanılan, askeri kullanılan] (birim/saat, tek ondalık). */
export type KenarKaresi = [number, number, number];

/** [mal indeksi, oran (birim/saat), kaynak bölge, hedef bölge, yol (kenar indeksleri), sahip oyuncu indeksi] */
export type AkisKaresi = [number, number, number, number, number[], number];

/** [bölge indeksi, mal indeksi, karşılanma %, neden kodu, en yakın kaynağa süre (saat, -1 = yok)] */
export type KapsamKaresi = [number, number, number, number, number];

export interface SavasKaresi {
  id: number;
  saldiran: number;
  savunan: number;
  saldiranBolge: number;
  hedefBolge: number;
  evre: "hazirlik" | "pencere" | "bitti";
  /** İlan anı (sim-saat). */
  ilan: number;
  /** Pencere bitişi (sim-saat). */
  pencereBitis: number;
  sonuc: null | {
    kazanan: number;
    saldiranGuc: number;
    savunanGuc: number;
    /** Kaybedenin değer bazlı stok kaybı (%). */
    kayipYuzde: number;
  };
}

export interface Kare {
  /** Sim-saat (t / SAAT). */
  saat: number;
  bolgeler: BolgeKaresi[];
  kenarlar: KenarKaresi[];
  akislar: AkisKaresi[];
  /** Yalnızca karşılanması %100 olmayan hücreler (sahipli bölgeler). */
  kapsam: KapsamKaresi[];
  /** Mal indeksine göre fiyat / taban fiyat (binde, tamsayı). */
  fiyat: number[];
  savaslar: SavasKaresi[];
  /** Oyuncu indeksine göre hazine (para, tamsayı). */
  hazine: number[];
  /** Oyuncu indeksine göre hazine net oranı (para/saat, tamsayı). */
  hazineOrani: number[];
}

export interface KosuVerisi {
  surum: 1;
  harita: string;
  tohum: number;
  gun: number;
  /** Kareler arası sim-saat. */
  aralikSaat: number;
  dizin: Dizin;
  kareler: Kare[];
  /** Koşunun duvar saati süresi (ms); yalnızca bilgi. */
  kosuSureMs: number;
}

export interface RaporHipotezi {
  kimlik: string;
  hipotez: string;
  olcumAd: string;
  deger: number | null;
  birim: string;
  esik: string;
  verdict: string;
  tohumBasariOrani: number;
  tohumBasina: Array<{ tohum: number; olcum: number | null; verdict: string }>;
}

export interface RaporOzeti {
  tohumlar: number[];
  hizli: boolean;
  hipotezler: RaporHipotezi[];
  /** Kaynak dosya adı (yalnızca görüntü için). */
  kaynak: string;
}

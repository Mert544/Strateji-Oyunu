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

/** Bölgenin sabit tarım tanımı (harita + türetme): iklim tipi indeksi, toprak tabanı (binde), tesis tavanı, sulanabilir pay (%). */
export type DizinBolgeTarim = [iklimTipi: number, tabanBinde: number, tesisTavani: number, sulanabilirYuzde: number];

/** Tarım katmanının sabit tanımı (içerik + parametrelerden; tarım kapalıysa dizinde yoktur). */
export interface DizinTarim {
  /** Dünya t=0 anının takvim günü (0 = 1 Ocak). */
  baslangicGunu: number;
  /** Takvim hız çarpanı (sim günü başına takvim günü). */
  gunCarpani: number;
  /** 12 ayın gün sayıları (toplam 365). */
  ayGunleri: number[];
  /** Olay uyarı süresi (saat). */
  uyariSaat: number;
  /** Ürün grupları (ekim payı sırasıyla). */
  urunler: Array<{ id: string; ad: string }>;
  /** Olay türü kimlikleri (OlayKaresi.tur bu indekstir). */
  olayTurleri: string[];
  /** İklim tipi kimlikleri (DizinBolgeTarim[0] bu indekstir). */
  iklimTipleri: string[];
  /** 12 ay: tarım bölgelerinin ortalama hasat oranı (binde; 1000 = yıllık ortalama). */
  hasatAylik: number[];
  /** İklim tipine göre (iklimTipleri sırasıyla) 12 aylık hasat oranı (binde). */
  hasatTipleri: number[][];
  /** `gubre` malının indeksi. */
  gubreMal: number;
  azamiGubreDozu: number;
  /** Bölge indeksine göre tarım tanımı; tarım dışı bölge null. */
  bolgeler: Array<DizinBolgeTarim | null>;
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
  /** Tarım katmanı (B1); kapalıysa tanımsız. */
  tarim?: DizinTarim;
}

/**
 * Bölge tarım durumu: [toprak (binde), iklim hasat oranı (binde; 1000 = yıllık ortalama), olay kaybı (binde),
 * gübre dozu, gübre karşılanma (%), ekim payları (%, ürün sırasıyla)].
 */
export type TarimKaresi = [toprak: number, iklim: number, olayKaybi: number, gubreDozu: number, gubreKarsilanma: number, ekim: number[]];

/** Etkin veya uyarıdaki iklim olayı. Zamanlar sim-saat; etki: [bölge, şiddet %]. */
export interface OlayKaresi {
  id: number;
  /** DizinTarim.olayTurleri indeksi. */
  tur: number;
  merkez: number;
  uyari: number;
  baslangic: number;
  bitis: number;
  /** Merkez şiddeti (%). */
  siddet: number;
  etki: Array<[number, number]>;
}

export interface IklimKaresi {
  olaylar: OlayKaresi[];
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
  /** Tarım durumu (B1); tarım kapalıysa veya bölge tarım dışıysa tanımsız. */
  tarim?: TarimKaresi;
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
  /** İklim olayları (B1); tarım kapalıysa tanımsız. */
  iklim?: IklimKaresi;
}

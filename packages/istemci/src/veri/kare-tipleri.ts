/**
 * Anlık görüntü (Kare) ve dizin tipleri. Biçim, packages/izleyici/src/tipler.ts'nin bir ALT KÜMESİDİR: istemci
 * lojistik ağını (kenar doluluğu, akışlar) göstermez, bu yüzden `kenarlar`/`akislar` karede yoktur (F0 sakin görsel;
 * lojistik arka planda otomatik). İstemci paketi izleyiciye (node bağımlılıkları) bağlanmamak için tipleri burada
 * yineler. Miktarlar "birim", oranlar birim/saat.
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

/** Bölgeler arası komşuluk (kara/deniz/hava yolu). Yalnız komşuluk için tutulur (ör. savaş hedefleri); haritada çizilmez. */
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
  /** Tarım tesisi mi ("Sanayi" merceği tarım dışı tesisleri sayar); tarım kapalıysa false. */
  tarim?: boolean;
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
  /** Savaş penceresinin açılışı (sim-saat). İzleyici biçiminde yoktur; yalnızca istemci kullanır. */
  pencereBasi?: number;
  pencereBitis: number;
  sonuc: null | { kazanan: number; saldiranGuc: number; savunanGuc: number; kayipYuzde: number };
}

/** Oyuncunun bir tesisi (komutlar tesisi kimliğiyle ister; BolgeKaresi.tesis bunu taşımaz). */
export interface OyuncuTesisKaresi {
  id: number;
  /** DizinTesisTuru indeksi. */
  tur: number;
  /** DizinYontem indeksi. */
  yontem: number;
  aktif: boolean;
  /** Ölçek kademesi 0 = S, 1 = M, 2 = L; sanayi kapalıysa tanımsız. */
  olcek?: number;
  /** Aşınma (%); sanayi kapalıysa tanımsız. */
  asinma?: number;
  /** Genel onarım durmasının bitişi (sim-saat); yoksa tanımsız. */
  onarimBitis?: number;
}

/** Oyuncunun kendi bölgesinin komutlar için gereken ek durumu. */
export interface OyuncuBolgeKaresi {
  tesisler: OyuncuTesisKaresi[];
  /** Mal indeksine göre kalan rezerv (birim). */
  rezerv: number[];
  /** Mal indeksine göre başlangıç rezervi (birim; sondaj için damar var mı). */
  rezervIlk: number[];
  /** Mal indeksine göre kullanılmış keşif hakkı; sanayi kapalıysa boş. */
  kesif: number[];
  /** Ticaret emirleri: [mal, yön (0 ihracat, 1 ithalat), istenen oran (birim/sa), gerçekleşen oran (birim/sa)]. */
  emirler: Array<[number, number, number, number]>;
  /** Tarım tesisi sayısı (kurulu + inşaatı süren); tarım dışı bölgede 0. */
  tarimTesisi: number;
}

export interface OyuncuInsaatKaresi {
  id: number;
  tur: "tesis" | "kenar" | "olcek" | "onarim";
  bolge: number;
  /** Tesis türü indeksi (tesis), kenar indeksi (kenar), tesis kimliği (olcek) veya -1 (onarim). */
  hedef: number;
  /** Bitiş (sim-saat, iki ondalık). */
  bitis: number;
  olcek?: number;
}

export interface OyuncuAnlasmaKaresi {
  tur: "ticaret" | "ortak_altyapi";
  /** Karşı oyuncunun indeksi. */
  karsi: number;
  benTeklif: boolean;
  karsiTeklif: boolean;
  aktif: boolean;
}

/**
 * Komutla yönetilen oyuncunun durumu (yalnız oyuncu kipinde, işçi tarafından eklenir; izleyici biçiminde yoktur).
 * Zamanlar sim-saattir. Komut formları ve "önerilen eylemler" yalnızca bu alandan beslenir.
 */
export interface OyuncuKaresi {
  /** Oyuncu indeksi (= devlet indeksi). */
  idx: number;
  vergiPpm: number;
  askeriRezervPpm: number;
  /** Bakım düzeyi 0..2; sanayi kapalıysa tanımsız. */
  bakim?: number;
  /** Açık teknolojilerin indeksleri. */
  teknolojiler: number[];
  arastirma: { teknoloji: number; bitis: number } | null;
  /** Açık karar kimlikleri (ör. deniz_kenar_gelistir). */
  kararlar: string[];
  /** Oyuncu indeksine göre yeni oyuncu korumasının bitişi (sim-saat); koruma yoksa 0. */
  koruma: number[];
  /** Erken oyun süre çarpanı (binde; 100 = %10 süre). */
  sureCarpani: number;
  /** Teknoloji indeksine göre maliyet/süre çarpanı (binde; yayılım indirimi). */
  yayilim: number[];
  insaatlar: OyuncuInsaatKaresi[];
  partiler: Array<{ bolge: number; birlik: number; adet: number; bitis: number }>;
  anlasmalar: OyuncuAnlasmaKaresi[];
  /** Benim yaptırım uyguladığım ve bana yaptırım uygulayan oyuncu indeksleri. */
  yaptirimBen: number[];
  yaptirimBana: number[];
  /** Bölge indeksine göre (yalnız sahip olunanlar). */
  bolgeler: Record<number, OyuncuBolgeKaresi>;
}

export interface Kare {
  /** Sim-saat. */
  saat: number;
  bolgeler: BolgeKaresi[];
  /** Tam karşılanmayan (bölge, mal) tedarik hücreleri; panelde "tedarik" satırı ve rozetler için. */
  kapsam: KapsamKaresi[];
  /** Mal indeksine göre fiyat / taban fiyat (binde). */
  fiyat: number[];
  savaslar: SavasKaresi[];
  hazine: number[];
  hazineOrani: number[];
  /** İklim olayları (B1); tarım kapalıysa tanımsız. */
  iklim?: IklimKaresi;
  /** Komutla yönetilen oyuncunun durumu; yalnızca oyuncu kipinde. */
  oyuncu?: OyuncuKaresi;
}

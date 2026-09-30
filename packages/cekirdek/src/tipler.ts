/**
 * Çekirdek simülasyon sözleşmesi: dünya durumu, komutlar, olaylar ve bağlam.
 *
 * Kurallar:
 * - Dünya durumu (Dunya) SADECE düz veridir: sınıf, fonksiyon, Map/Set yok.
 *   Böylece structuredClone ile kopyalanır ve kanonik olarak özetlenir (hash).
 * - Tüm sayılar tamsayıdır (bkz. @bolge/veri/tipler birim kuralları).
 * - Mallar, bölgeler, kenarlar, birlikler dizilerde İNDEKS ile tutulur.
 *   İndeksler içerik/harita dosyasındaki sıradır.
 * - Oyuncular dizisi oyuncu kimliğine göre sıralıdır.
 *
 * Bu dosya ortak sözleşmedir; değişiklik yalnızca takım lideri onayıyla yapılır.
 */
import type {
  AnlasmaTuru,
  BirlikTanimi,
  Etiket,
  HaritaDosyasi,
  IcerikDosyasi,
  KenarTuru,
  MalTanimi,
  Parametreler,
  TeknolojiTanimi,
  TesisTuruTanimi,
  YontemTanimi,
} from "@bolge/veri";

export type Ms = number;
export type Mili = number;
export type OyuncuId = string;

export const MILI = 1000;
export const PPM = 1_000_000;
export const DAKIKA: Ms = 60_000;
export const SAAT: Ms = 3_600_000;
export const GUN: Ms = 86_400_000;

// ---------------------------------------------------------------------------
// Derlenmiş içerik (başlangıçta bir kez üretilir, dünya durumuna girmez)
// ---------------------------------------------------------------------------

/** Kimlik -> indeks eşlemeleri ve indekslenmiş tanımlar. Salt okunur. */
export interface DerlenmisIcerik {
  harita: HaritaDosyasi;
  icerik: IcerikDosyasi;
  param: Parametreler;
  mallar: MalTanimi[];
  malIndeks: Record<string, number>;
  yontemler: YontemTanimi[];
  yontemIndeks: Record<string, number>;
  tesisTurleri: TesisTuruTanimi[];
  tesisTuruIndeks: Record<string, number>;
  teknolojiler: TeknolojiTanimi[];
  teknolojiIndeks: Record<string, number>;
  birlikler: BirlikTanimi[];
  birlikIndeks: Record<string, number>;
  bolgeIndeks: Record<string, number>;
  /** Mal indeksleri, lojistik önceliğine göre sıralı (eşitlikte indeks). */
  lojistikSirasi: number[];
  /** Bölge komşulukları: bolge -> kenar indeksleri (artan sırada). */
  komsuKenarlar: number[][];
}

// ---------------------------------------------------------------------------
// Dünya durumu
// ---------------------------------------------------------------------------

/**
 * Tembel birikimli stok: anlık miktar = miktar + oran × (t − t0) / SAAT.
 * oran = yerelOran + gelenOran.
 * - yerelOran: bölgedeki üretim − tüketim − giden akış (her çözümde yeniden hesaplanır).
 * - gelenOran: yoldan gelen akış; taşıma gecikmeli "oran_delta" olaylarıyla değişir.
 * - artik: floor bölmesinden kalan (mili-birim × ms), kayıpsız birikim için.
 * - surum: her oran değişiminde artar; eski eşik olaylarını geçersiz kılar.
 */
export interface Stok {
  miktar: Mili;
  yerelOran: Mili;
  gelenOran: Mili;
  t0: Ms;
  artik: number;
  kapasite: Mili;
  surum: number;
}

export interface TesisDurumu {
  id: number;
  /** tesisTurleri indeksi */
  tur: number;
  /** yontemler indeksi */
  yontem: number;
  aktif: boolean;
  /** Son çözümdeki girdi yeterliliğine göre çalışma oranı (ppm). */
  verimPpm: number;
  /** İstihdam oranı (ppm). */
  isciPpm: number;
}

export type TicaretYonu = "ihracat" | "ithalat";

/** Sürekli (dakikalık oranlı) ticaret emri; yalnızca liman bölgelerinde. */
export interface TicaretEmri {
  mal: number;
  yon: TicaretYonu;
  /** İstenen oran (mili-birim/saat). */
  oranSaat: Mili;
  /** Son çözümde gerçekleşen oran (pazar hacmi ve stokla sınırlı). */
  gerceklesenSaat: Mili;
}

export type SavunmaDurusu = "normal" | "savunma" | "geri_cekil";

export interface SavunmaEmri {
  durus: SavunmaDurusu;
}

export interface BolgeDurumu {
  indeks: number;
  id: string;
  devlet: string;
  etiketler: Etiket[];
  sahip: OyuncuId | null;
  nufus: number;
  /** mal indeksine göre */
  stoklar: Stok[];
  /** mal indeksine göre kümülatif israf (depo taşması + bozulma), mili-birim */
  israf: Mili[];
  /** mal indeksine göre kümülatif üretim, mili-birim (ölçüm için) */
  uretimToplam: Mili[];
  /** mal indeksine göre rezerv (yoksa 0) */
  rezervIlk: Mili[];
  rezervKalan: Mili[];
  tesisler: TesisDurumu[];
  ticaretEmirleri: TicaretEmri[];
  /** birlik indeksine göre adet */
  birlikler: number[];
  savunma: SavunmaEmri;
  /** Nüfusun gıda karşılanma oranı (ppm), son çözümden */
  gidaKarsilanmaPpm: number;
  /** Ordunun ikmal karşılanma oranı (ppm), son çözümden */
  ikmalKarsilanmaPpm: number;
}

export interface KenarDurumu {
  indeks: number;
  a: number;
  b: number;
  tur: KenarTuru;
  kapasiteSaat: Mili;
  sureMs: Ms;
  /** Son çözümde kullanılan toplam kapasite (mili-birim/saat) */
  kullanilanSaat: Mili;
  /** Bunun askeri mallara giden kısmı */
  askeriKullanilanSaat: Mili;
}

export interface ArastirmaDurumu {
  teknoloji: number;
  bitis: Ms;
}

export interface OyuncuDurumu {
  id: OyuncuId;
  /** Hazine: para için tembel birikimli stok (mili-para). kapasite çok büyük. */
  hazine: Stok;
  vergiPpm: number;
  /** Açılmış teknoloji indeksleri (artan sırada) */
  teknolojiler: number[];
  arastirma: ArastirmaDurumu | null;
  /** Lojistik kapasitesinin askeri mallara ayrılan önceliği (ppm). */
  askeriRezervPpm: number;
  katilmaZamani: Ms;
  korumaBitis: Ms;
  /** Açılmış karar kimlikleri (teknolojilerden), sıralı */
  kararlar: string[];
}

export interface PazarDurumu {
  /** mal indeksine göre güncel fiyat (mili-para/birim) */
  fiyat: number[];
  /** Son saatlik oyuncu talebi (ithalat) ve arzı (ihracat), mili-birim/saat */
  oyuncuTalebi: Mili[];
  oyuncuArzi: Mili[];
}

export type SavasEvresi = "hazirlik" | "pencere" | "bitti";

export interface SavasSonucu {
  kazanan: OyuncuId;
  saldiranGuc: number;
  savunanGuc: number;
  /** mal indeksine göre kaybedenin kaybettiği miktar */
  stokKaybi: Mili[];
  /** Kaybedenin toplam stok değerine göre kayıp oranı (ppm) */
  kayipOraniPpm: number;
  saldiranBirlikKaybi: number[];
  savunanBirlikKaybi: number[];
}

export interface SavasDurumu {
  id: number;
  saldiran: OyuncuId;
  savunan: OyuncuId;
  saldiranBolge: number;
  hedefBolge: number;
  ilan: Ms;
  pencereBaslangic: Ms;
  pencereBitis: Ms;
  evre: SavasEvresi;
  sonuc: SavasSonucu | null;
}

export interface AnlasmaDurumu {
  tur: AnlasmaTuru;
  /** Sıralı iki oyuncu */
  taraflar: [OyuncuId, OyuncuId];
  /** Teklif edenler; iki taraf da teklif edince aktif olur */
  teklifler: OyuncuId[];
  aktif: boolean;
}

export interface YaptirimDurumu {
  uygulayan: OyuncuId;
  hedef: OyuncuId;
}

export type InsaatTuru = "tesis" | "kenar";

export interface InsaatDurumu {
  id: number;
  tur: InsaatTuru;
  sahip: OyuncuId;
  bolge: number;
  /** tesis türü indeksi veya kenar indeksi */
  hedef: number;
  bitis: Ms;
}

export interface UretimPartisi {
  id: number;
  sahip: OyuncuId;
  bolge: number;
  birlik: number;
  adet: number;
  bitis: Ms;
}

/** Bir lojistik çözümün ürettiği parça-sabit akış. */
export interface Akis {
  sahip: OyuncuId;
  mal: number;
  kaynak: number;
  hedef: number;
  /** Kullanılan kenar indeksleri, kaynaktan hedefe sırayla */
  yol: number[];
  oranSaat: Mili;
  /** Yol boyunca toplam taşıma süresi */
  sureMs: Ms;
}

/** Kapsam görünümü: "nerede açık, neden". Bölge × mal. */
export type AciklikNedeni =
  | "yok"
  | "kapasite"
  | "girdi_eksik"
  | "mesafe"
  | "erisim_yok";

export interface KapsamHucresi {
  /** Talebin karşılanma oranı (ppm) */
  karsilanmaPpm: number;
  /** En yakın kaynağa taşıma süresi (ms), ulaşılamıyorsa -1 */
  enYakinKaynakMs: Ms;
  neden: AciklikNedeni;
}

export interface LojistikDurumu {
  akislar: Akis[];
  /** Çözüm gerekiyor mu (bir değişim oldu) */
  kirli: boolean;
  /** Kuyrukta bekleyen bir "cozum" olayı var mı */
  cozumPlanli: boolean;
  sonCozum: Ms;
  cozumSayisi: number;
  /** bolge indeksi -> mal indeksi -> hücre */
  kapsam: KapsamHucresi[][];
}

// ---------------------------------------------------------------------------
// Olaylar
// ---------------------------------------------------------------------------

/**
 * Aynı zaman damgasında öncelik sırası (küçük önce). Eşitlikte ekleme sırası.
 * Komutlar olay kuyruğuna girmez; uygula() içinde anında işlenir ve ardından
 * gerekirse aynı t'ye bir "cozum" olayı planlanır.
 */
export const OLAY_ONCELIGI = {
  oran_delta: 1,
  esik: 2,
  insaat_bitti: 3,
  parti_bitti: 3,
  arastirma_bitti: 3,
  savas_pencere_ac: 4,
  savas_pencere_kapa: 4,
  saatlik_tik: 5,
  cozum: 9,
} as const;

export type OlayVerisi =
  | { tur: "oran_delta"; bolge: number; mal: number; delta: Mili }
  | { tur: "esik"; bolge: number; mal: number; surum: number }
  | { tur: "insaat_bitti"; insaat: number }
  | { tur: "parti_bitti"; parti: number }
  | { tur: "arastirma_bitti"; oyuncu: OyuncuId }
  | { tur: "savas_pencere_ac"; savas: number }
  | { tur: "savas_pencere_kapa"; savas: number }
  | { tur: "saatlik_tik" }
  | { tur: "cozum" };

export type OlayTuru = OlayVerisi["tur"];

export interface Olay {
  t: Ms;
  oncelik: number;
  sira: number;
  veri: OlayVerisi;
}

// ---------------------------------------------------------------------------
// Dünya
// ---------------------------------------------------------------------------

/** sfc32 durumu: dört adet 32-bit işaretsiz tamsayı */
export type PrngDurumu = [number, number, number, number];

/** Alt sistem rastgelelik akışları; her biri ana tohumdan türetilir. */
export type PrngAkisi = "ekonomi" | "pazar" | "savas" | "olay";

export interface Dunya {
  zaman: Ms;
  tohum: number;
  bolgeler: BolgeDurumu[];
  kenarlar: KenarDurumu[];
  oyuncular: OyuncuDurumu[];
  pazar: PazarDurumu;
  savaslar: SavasDurumu[];
  anlasmalar: AnlasmaDurumu[];
  yaptirimlar: YaptirimDurumu[];
  insaatlar: InsaatDurumu[];
  partiler: UretimPartisi[];
  lojistik: LojistikDurumu;
  rng: Record<PrngAkisi, PrngDurumu>;
  /** Kimlik ve olay sıra sayaçları */
  sayac: { olay: number; kimlik: number };
  /** İkili yığın dizisi olarak olay kuyruğu */
  kuyruk: Olay[];
}

// ---------------------------------------------------------------------------
// Komutlar (olay kaynaklı günlük: aynı tohum + aynı günlük = aynı dünya)
// ---------------------------------------------------------------------------

export type Komut =
  // Ekonomi
  | { tur: "tesis_insa"; bolge: string; tesisTuru: string }
  | { tur: "yontem_degistir"; bolge: string; tesis: number; yontem: string }
  | { tur: "tesis_durum"; bolge: string; tesis: number; aktif: boolean }
  | { tur: "ticaret_emri"; bolge: string; mal: string; yon: TicaretYonu; oranSaat: Mili }
  | { tur: "vergi_ayarla"; oranPpm: number }
  // Lojistik
  | { tur: "kenar_gelistir"; kenar: number }
  | { tur: "askeri_rezerv"; oranPpm: number }
  // Askeri
  | { tur: "birlik_uret"; bolge: string; birlik: string; adet: number }
  | { tur: "savas_ilan"; saldiranBolge: string; hedefBolge: string }
  | { tur: "savunma_emri"; bolge: string; durus: SavunmaDurusu }
  // Teknoloji
  | { tur: "arastir"; teknoloji: string }
  // Politika
  | { tur: "anlasma_teklif"; karsi: OyuncuId; anlasma: AnlasmaTuru }
  | { tur: "anlasma_feshet"; karsi: OyuncuId; anlasma: AnlasmaTuru }
  | { tur: "yaptirim"; hedef: OyuncuId; aktif: boolean }
  // Sistem (oyuncu kaydı; oyuncu kimliği "sistem" ile verilir)
  | { tur: "oyuncu_katil"; oyuncu: OyuncuId; bolgeler: string[] };

export type KomutTuru = Komut["tur"];

export interface DamgaliKomut {
  t: Ms;
  oyuncu: OyuncuId;
  komut: Komut;
}

export type KomutSonucu = { tamam: true } | { tamam: false; hata: string };

// ---------------------------------------------------------------------------
// Bağlam: alt sistemlere motor tarafından verilir
// ---------------------------------------------------------------------------

export interface Baglam {
  readonly ic: DerlenmisIcerik;
  /** Olay planla (t >= dunya.zaman olmalı). */
  planla(d: Dunya, t: Ms, veri: OlayVerisi): void;
  /** Lojistiği kirli işaretle ve (gerekirse) aynı t'ye çözüm planla. */
  kirlet(d: Dunya): void;
  /** Alt sistem akışından [0, 2^32) tamsayı çek. */
  rastgele(d: Dunya, akis: PrngAkisi): number;
  /** Alt sistem akışından [0, n) tamsayı çek. */
  rastgeleAralik(d: Dunya, akis: PrngAkisi, n: number): number;
  /** Yeni benzersiz kimlik. */
  yeniKimlik(d: Dunya): number;
}

/** Botların ve ölçüm takımının okuduğu salt-okunur anlık görünüm. */
export interface DunyaGorunumu {
  zaman: Ms;
  dunya: Readonly<Dunya>;
  ic: DerlenmisIcerik;
}

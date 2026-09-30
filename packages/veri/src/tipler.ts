/**
 * Veri sözleşmesi: harita, içerik ve parametre dosyalarının TypeScript tipleri.
 *
 * BİRİM KURALLARI (tüm proje için geçerli):
 * - Miktar: mili-birim (1 birim = 1000). "Birim" soyut bir tondur.
 * - Oran: mili-birim / saat.
 * - Para: mili-para (1 para = 1000). Fiyat: mili-para / birim.
 * - Süre: veri dosyalarında saat veya gün (tamsayı); çekirdek içinde ms.
 * - Oranlar (yüzde): ppm, 1_000_000 = %100.
 * Tüm sayılar tamsayıdır. Ondalık sayı veri dosyalarında yasaktır.
 *
 * Bu dosya ortak sözleşmedir; değişiklik yalnızca takım lideri onayıyla yapılır.
 */

export type MalId = string;
export type BolgeId = string;
export type DevletId = string;

/** Bölge coğrafi etiketleri. */
export type Etiket = "kiyi" | "dag" | "ova" | "liman" | "dar_gecit";
export const ETIKETLER: readonly Etiket[] = ["kiyi", "dag", "ova", "liman", "dar_gecit"];

export type KenarTuru = "kara" | "deniz" | "hava";

export interface DevletTanimi {
  id: DevletId;
  ad: string;
  /** Oyun içi blok (ittifak) kimliği. Gerçek ülkeler değil. */
  blok: string;
}

export interface BolgeTanimi {
  id: BolgeId;
  ad: string;
  devlet: DevletId;
  etiketler: Etiket[];
  /** Başlangıç nüfusu (kişi). */
  nufus: number;
  /** Ham mal rezervleri: mal kimliği -> mili-birim. Yalnızca "ham" kategorideki mallar. */
  rezervler: Record<MalId, number>;
  /** Başlangıçta kurulu tesis türleri (varsayılan yöntemle). */
  tesisler: string[];
  /** 2D çizim ve mesafe için koordinat (soyut birim, 0-1000). */
  x: number;
  y: number;
}

export interface KenarTanimi {
  a: BolgeId;
  b: BolgeId;
  tur: KenarTuru;
  /** Taşıma kapasitesi: mili-birim / saat (tüm mallar ve iki yön toplamı). */
  kapasiteSaat: number;
  /** Taşıma süresi (saat, tamsayı, >= 1). */
  sureSaat: number;
}

export interface HaritaDosyasi {
  surum: 1;
  ad: string;
  devletler: DevletTanimi[];
  bolgeler: BolgeTanimi[];
  kenarlar: KenarTanimi[];
}

export type MalKategorisi = "ham" | "ara" | "tuketim" | "askeri";

export interface MalTanimi {
  id: MalId;
  ad: string;
  kategori: MalKategorisi;
  /** Dünya pazarı taban fiyatı: mili-para / birim. */
  tabanFiyat: number;
  /** Lojistik çözüm sırası: küçük olan önce çözülür (askeri ikmal ve gıda önce). */
  lojistikOnceligi: number;
  /** Depoda doğal bozulma: ppm / gün. */
  bozulmaPpmGun: number;
}

/** Bir tesisin çalışma biçimi (Victoria 3 "üretim yöntemi" benzeri). */
export interface YontemTanimi {
  id: string;
  ad: string;
  /** Tam kadro ve tam verimde girdi tüketimi: mal -> mili-birim/saat. */
  girdiler: Record<MalId, number>;
  /** Tam kadro ve tam verimde çıktı: mal -> mili-birim/saat. */
  ciktilar: Record<MalId, number>;
  /** Tam kadro için gereken işçi (kişi). */
  isci: number;
  /** Bakım gideri (batma): mal -> mili-birim/saat, tesis çalışsa da çalışmasa da. */
  bakim: Record<MalId, number>;
  /** Bu yöntemi açan teknoloji (yoksa baştan açık). */
  gerekliTeknoloji?: string;
  /** Ham çıkarım yöntemleri için tükettiği rezerv (mal kimliği). */
  rezerv?: MalId;
}

export interface TesisTuruTanimi {
  id: string;
  ad: string;
  /** İnşa maliyeti: mal -> mili-birim (inşa başında bölge stoğundan düşülür). */
  insaMaliyeti: Record<MalId, number>;
  /** İnşa para maliyeti: mili-para. */
  insaParasi: number;
  insaSuresiSaat: number;
  /** Bu tesis türünde kullanılabilen yöntemler; ilki varsayılandır. */
  yontemler: string[];
  /** İnşa için bölgede gereken etiket veya rezerv (yoksa her yerde). */
  gerekliEtiket?: Etiket;
  gerekliRezerv?: MalId;
  gerekliTeknoloji?: string;
}

export interface TeknolojiTanimi {
  id: string;
  ad: string;
  aciklama: string;
  /** Araştırma maliyeti: mili-para. */
  maliyet: number;
  sureGun: number;
  onKosullar: string[];
  /** Teknoloji yüzde artış VERMEZ; yalnızca yeni yöntem, tesis veya karar açar. */
  acar: {
    yontemler?: string[];
    tesisTurleri?: string[];
    kararlar?: string[];
  };
}

export interface BirlikTanimi {
  id: string;
  ad: string;
  /** Birim başına üretim maliyeti: mal -> mili-birim. */
  maliyet: Record<MalId, number>;
  partiSuresiSaat: number;
  /** Savaş gücü (birim başına, tamsayı). */
  guc: number;
  /** Birim başına ikmal ihtiyacı: mal -> mili-birim/saat. */
  ikmal: Record<MalId, number>;
  gerekliTeknoloji?: string;
}

export type AnlasmaTuru = "ticaret" | "ortak_altyapi";

export interface IcerikDosyasi {
  surum: 1;
  mallar: MalTanimi[];
  yontemler: YontemTanimi[];
  tesisTurleri: TesisTuruTanimi[];
  teknolojiler: TeknolojiTanimi[];
  birlikler: BirlikTanimi[];
}

/**
 * Ayarlanabilir parametreler. PDF'deki süre aralıkları başlangıç varsayımıdır;
 * simülasyonda bu dosyadan okunur.
 */
export interface Parametreler {
  surum: 1;
  /** Dünya hızı yalnızca duvar saati -> sim zamanı eşlemesidir (1, 6, 24). */
  dunyaHizi: number;
  baslangic: {
    /** Her bölgenin başlangıç stoğu: mal -> mili-birim. */
    stok: Record<MalId, number>;
    /** Oyuncu başlangıç hazinesi (mili-para). */
    hazine: number;
    /** Oyuncu başına başlangıç birlikleri: birlik -> adet (sahip olunan ilk bölgeye). */
    birlikler: Record<string, number>;
  };
  /**
   * PDF zaman kuralı 2: "Erken oyun hızlı, sonra yavaşlar." Oyuncunun katılımından itibaren
   * inşa, kenar geliştirme, birlik partisi ve araştırma süreleri bu çarpanla kısalır.
   * Geç katılan oyuncu da aynı hızlandırmayı alır (yetişme yardımı, H6).
   */
  erkenOyun: {
    /** Katılım anındaki süre çarpanı (ppm), ör. 100000 = süreler %10. */
    baslangicCarpaniPpm: number;
    /** Katılımdan sonra bu kadar saat çarpan sabit kalır. */
    sabitSaat: number;
    /** Bu saatte çarpan doğrusal olarak PPM'e (%100) ulaşır. */
    bitisSaat: number;
  };
  nufus: {
    /** Nüfusun çalışabilir oranı (ppm). */
    isgucuPpm: number;
    /** 1000 kişi başına saatlik tüketim: mal -> mili-birim/saat. */
    tuketim1000Saat: Record<MalId, number>;
    /** Gıda karşılanınca günlük büyüme (ppm/gün). */
    buyumePpmGun: number;
    /** Gıda karşılanmayınca günlük küçülme (ppm/gün). */
    kuculmePpmGun: number;
  };
  ekonomi: {
    /** Bölge başına mal başına depo kapasitesi (mili-birim). Üstü israf olur. */
    depoKapasitesi: number;
    /** Kişi başı saatlik vergi tabanı (mili-para), vergi oranıyla çarpılır. */
    vergiTabani1000Saat: number;
    varsayilanVergiPpm: number;
    /** Yüksek vergi büyümeyi azaltır: bu eşiğin üstü büyümeyi keser (ppm). */
    vergiBuyumeEsigiPpm: number;
    /** Para lavabosu: aktif tesis başına işletme gideri (mili-para/saat). */
    tesisIsletmeParasiSaat: number;
  };
  pazar: {
    /** Vic3 benzeri fiyat esnekliği (ppm, 750000 = 0.75). */
    fiyatEsnekligiPpm: number;
    /** Dünya pazarının saatlik emebileceği hacim: mal -> mili-birim/saat. */
    emilimSaat: Record<MalId, number>;
    /** Dünya pazarının saatlik sağlayabileceği hacim: mal -> mili-birim/saat. */
    arzSaat: Record<MalId, number>;
    ithalatCarpaniPpm: number;
    ihracatCarpaniPpm: number;
    yaptirimIthalatCarpaniPpm: number;
    yaptirimIhracatCarpaniPpm: number;
    anlasmaIthalatCarpaniPpm: number;
    anlasmaIhracatCarpaniPpm: number;
  };
  lojistik: {
    /** Eşik tetikli yeniden çözümler arasında en az süre (dakika). */
    enAzCozumAraligiDakika: number;
    /** Kaynak bölgede tutulacak tampon (saat cinsinden yerel tüketim). */
    tamponSaat: number;
    /** Kenar kapasite geliştirme: +kapasite (ppm), maliyet ve süre. */
    gelistirmeArtisPpm: number;
    gelistirmeMaliyeti: Record<MalId, number>;
    gelistirmeParasi: number;
    gelistirmeSuresiSaat: number;
  };
  askeri: {
    ilanHazirlikSaatMin: number;
    ilanHazirlikSaatMax: number;
    pencereSaat: number;
    /** Tek pencerede kaybedilebilecek stok üst sınırı (ppm, 250000 = %25). */
    kayipTavaniPpm: number;
    /** Kazanan tarafın ele geçirdiği stok oranı (tavan uygulanmadan önce, ppm). */
    yagmaOraniPpm: number;
    yeniOyuncuKorumasiGun: number;
    /** Arazi savunma çarpanları (ppm). */
    araziSavunmaPpm: Record<Etiket, number>;
    savunmaDurusuCarpaniPpm: number;
    /** Para lavabosu: birlik başına maaş (mili-para/saat). */
    birlikMaasiSaat: number;
  };
  teknoloji: {
    /**
     * Teknoloji yayılımı (yetişme yardımı): bir teknolojiyi bilen diğer oyuncuların payı p ise
     * maliyet ve süre p × yayilimIndirimiPpm kadar azalır.
     */
    yayilimIndirimiPpm: number;
  };
}

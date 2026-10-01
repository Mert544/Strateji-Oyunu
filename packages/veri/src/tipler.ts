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

/** Altı katman (docs/08): yeni mekanikler ilgili katmana bağlanır. */
export type KatmanId = "tarim" | "sanayi" | "lojistik" | "teknoloji" | "pazar" | "devlet";

/** Bölge iklim tipi (docs/08 §1.3 T2): 12 aylık hasat oranı eğrisi tipe göre seçilir. */
export type IklimTipi = "akdeniz" | "karasal" | "karadeniz" | "balkan_kita" | "kurak" | "dag_yayla";
export const IKLIM_TIPLERI: readonly IklimTipi[] = ["akdeniz", "karasal", "karadeniz", "balkan_kita", "kurak", "dag_yayla"];

/** Yayılan iklim olayı türleri (docs/08 §1.3 T3). B1'de tarımı kuraklik/don/sel etkiler; kis_firtinasi Lojistik (B5) içindir. */
export type IklimOlayTuru = "kuraklik" | "don" | "sel" | "kis_firtinasi";
export const IKLIM_OLAY_TURLERI: readonly IklimOlayTuru[] = ["kuraklik", "don", "sel", "kis_firtinasi"];

/**
 * Bölgenin tarım alanı (opsiyonel). Yoksa bölge tarım dışıdır: toprak, iklim ve olay çarpanı uygulanmaz
 * (yükleyici `tarimAlanlariniTamamla` ile etiket ve konumdan makul bir varsayılan türetebilir).
 */
export interface BolgeTarimTanimi {
  /** GAEZ uygunluğundan türetilir: 300_000..1_200_000; 1_000_000 = referans ova. */
  toprakTabanPpm: number;
  iklimTipi: IklimTipi;
  /** Çiftlik + ahır + mera toplam tesis tavanı (inşa edilen + devam eden). */
  tarimTesisTavani: number;
  /** Sulanabilir alan payı (ppm). */
  sulanabilirPpm: number;
}

/**
 * Bölgenin liman tanımı (B3 Pazar, opsiyonel; yalnızca "liman" etiketli bölgelerde). Yoksa yükleyici
 * (`limanlariTamamla`) deniz kenarları grafından türetebilir; türetilmemişse (ör. özel test haritası) prim 0 sayılır.
 */
export interface LimanTanimi {
  /** Dünya kapısı ise liman primi 0 (haritada 2-4 liman). */
  dunyaKapisi: boolean;
  /** En yakın dünya kapısına deniz yolu ile saat (deniz kenarları üzerinde Dijkstra). Kapıda 0. */
  dunyaMesafeSaat: number;
  /** Liman büyüklük sınıfı 1..4 (v1.5 elleçleme kapasitesi için; v1'de okunmaz). */
  kapasiteSinifi: number;
}

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
  /**
   * Gerçek dünya haritalarında bölge merkezinin coğrafi konumu (mikro derece: derece × 1_000_000, tamsayı).
   * Sentetik haritalarda yoktur. 3D istemci küre üzerine yerleştirmek için kullanır.
   */
  konum?: { enlemMikro: number; boylamMikro: number };
  /** Tarım alanı (B1, opsiyonel). Yoksa bölge tarım dışıdır. */
  tarim?: BolgeTarimTanimi;
  /** Liman tanımı (B3, opsiyonel; yalnız "liman" etiketli bölgelerde): dünya kapısı ve mesafe. */
  liman?: LimanTanimi;
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
  /**
   * Gerçek dünya haritalarında bölge sınır çokgenlerinin dosyası (harita dosyasına göre göreli yol,
   * TopoJSON; nesne adı "bolgeler", her geometrinin `properties.id` = bölge kimliği).
   */
  sinirDosyasi?: string;
  /** Veri kaynakları ve atıf satırları (ör. "Made with Natural Earth"). */
  atif?: string[];
}

export type MalKategorisi = "ham" | "ara" | "tuketim" | "askeri" | "enerji";

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
  /**
   * Sanayi (B2): false ise mal depolanamaz ve taşınamaz (elektrik): bölge içi anlık denge; stok tutulmaz, lojistikten ve
   * pazardan geçmez, ticaret emrine konu olamaz. Varsayılan true.
   */
  depolanabilir?: boolean;
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
  /**
   * Tarımsal yöntem (B1): tarım açıkken çıktı, bölgenin toprak x iklim x olay x gübre çarpanıyla çarpılır ve rezerv
   * verimi/tükenmesi uygulanmaz. Rezervli (ekili ürün) tarımsal yöntemde ekim karışımı da çarpılır.
   */
  tarimsal?: boolean;
  /** Sulama yöntemi (B1): bölgede çalışırken hasat dipleri yumuşar ve kuraklık şiddeti azalır; çıktısı olmayabilir. */
  sulama?: boolean;
  /**
   * Sanayi (B2): bölge kirliliğine saatlik emisyon (ppm, tam verim ve S ölçekte); verim ve ölçek çıktısıyla çarpılır.
   * Elektrik girdisi `girdiler["elektrik"]`, santral çıktısı `ciktilar["elektrik"]` olarak yazılır (depolanamaz mal).
   */
  kirlilikPpmSaat?: number;
  /** Sanayi (B2): hidro santral yöntemi; elektrik çıktısı `sanayi.hidro.akarsuEgrisiPpm` (12 ay, iklim takvimi) ile çarpılır. */
  hidro?: boolean;
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
  /** Tarım tesisi (çiftlik, ahır, mera): bölgenin `tarimTesisTavani` sayımına girer. */
  tarimTesisi?: boolean;
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

/** Ekim karışımındaki ürün grubu (B1; bugday, baklagil, nadas). Sıra, `ekim_plani` paylarının sırasıdır. */
export interface TarimUrunTanimi {
  id: string;
  ad: string;
  /** Tesis çıktısına çarpan (ppm). */
  ciktiPpm: number;
  /** Günlük toprak değişimi (ppm/gün; negatif = tüketir). */
  toprakDegisimPpmGun: number;
  /** Olay şiddetine duyarlılık (ppm; 1_000_000 = tam). */
  olayDuyarliligiPpm: number;
}

export interface IcerikDosyasi {
  surum: 1;
  mallar: MalTanimi[];
  yontemler: YontemTanimi[];
  tesisTurleri: TesisTuruTanimi[];
  teknolojiler: TeknolojiTanimi[];
  birlikler: BirlikTanimi[];
  /** Tarım ürün grupları (B1, opsiyonel; en az 1). `parametreler.tarim` ile birlikte verilince tarım mekanikleri açılır. */
  tarimUrunleri?: TarimUrunTanimi[];
}

/** Bir iklim olayı türünün profili (docs/08 §1.3 T3). */
export interface IklimOlayProfili {
  sureGunMin: number;
  sureGunMax: number;
  siddetMinPpm: number;
  siddetMaxPpm: number;
  /** Yayılım menzili: kara kenarı sayısı. */
  menzilKenar: number;
  /** Her kenarda kalan şiddet payı (ppm; 500_000 = yarıya iner). */
  yayilimPpm: number;
  /** 12 ay: ppm/gün/bölge (Ocak..Aralık). */
  olasilikPpmGun: number[];
}

/** İklim takvimi ve olay parametreleri (B1, opsiyonel; `tarim` ile birlikte verilir). */
export interface IklimParametreleri {
  /** Dünya t = 0 anının takvim günü (0 = 1 Ocak); 273 = 1 Ekim. */
  baslangicGunu: number;
  /** Takvim hız çarpanı: sim zamanının 1 günü = gunCarpani takvim günü. Gerçek takvim = 1 (ölçüm için 12). */
  gunCarpani: number;
  /** 12 ay, her biri >= 1, toplam 365. */
  ayGunleri: number[];
  /** Olay uyarı süresi (saat); uyarı ilan anı ile etki başlangıcı arası. */
  uyariSaat: number;
  /** İklim tipi -> 12 aylık hasat oranı (ppm). Her satırın toplamı tam 12 x 1_000_000. */
  hasatEgrisiPpm: Record<IklimTipi, number[]>;
  olaylar: Record<IklimOlayTuru, IklimOlayProfili>;
  /** Olay türü -> iklim tipi -> olasılık çarpanı (ppm; 1_000_000 = x1). */
  tipOlasilikCarpaniPpm: Record<IklimOlayTuru, Record<IklimTipi, number>>;
  /** Sulama, kuraklık şiddetini bu oran x sulanabilirPpm kadar azaltır (ppm). */
  sulamaKuraklikKorumaPpm: number;
  /** Sulama, hasat oranının 1'in altındaki dipleri bu oran x sulanabilirPpm kadar yumuşatır (ppm). */
  sulamaDipPpm: number;
}

/** Tarım katmanı parametreleri (B1, opsiyonel; `iklim` ile birlikte verilir). */
export interface TarimParametreleri {
  /** Toprak durumunun alt sınırı (ppm); toprak bunun altına inmez. */
  toprakTabaniPpm: number;
  /** Gübre dozu başına tarımsal tesis başına saatlik girdi (mili-birim/saat). */
  gubreTuketimiSaat: number;
  /** Doz başına günlük toprak kazancı (ppm/gün; gübre karşılandıkça). */
  gubreToprakPpmGun: number;
  /** Doz başına çıktı eki (ppm; gübre karşılandıkça). */
  gubreCiktiEkiPpm: number;
  azamiGubreDozu: number;
}

/** Tesis ölçek kademesi (S, M, L; docs/08 §2.3 S2). Çıktı, girdi ve elektrik `ciktiPpm` ile ölçeklenir. */
export interface OlcekKademesiTanimi {
  ciktiPpm: number;
  isciPpm: number;
  /** Bakım girdisi ve işletme gideri çarpanı. */
  bakimPpm: number;
  /** İnşa maliyeti çarpanı (para + mal); yükseltme maliyeti = hedef kademe - mevcut kademe. */
  insaPpm: number;
  /** Bu kademeye yükseltmek için gereken teknoloji (yoksa null). */
  gerekliTeknoloji: string | null;
}

/** Bakım düzeyi (oyuncu düzeyinde; docs/08 §2.3 S3). Sıra: asgari, normal, yuksek. */
export interface BakimDuzeyiTanimi {
  id: "asgari" | "normal" | "yuksek";
  /** Bakım girdisi ve işletme gideri çarpanı (ppm). */
  girdiPpm: number;
  /** Günlük aşınma değişimi (ppm/gün; negatif = iyileşir). */
  asinmaPpmGun: number;
}

/**
 * Sanayi katmanı parametreleri (B2, opsiyonel). Tanımlıysa elektrik/brownout, ölçek, bakım ve aşınma, kirlilik, damar
 * tükenmesi ve keşif sondajı açılır; yoksa çekirdek v0.2 + Tarım v1 davranışını birebir verir.
 */
export interface SanayiParametreleri {
  /** Elektrik iletim kaybı (ppm): arz x (PPM - kayıp) dağıtılır. */
  iletimKaybiPpm: number;
  /** Aşınma x istikrar x kıtlık cezalarının birleşik tabanı (ppm). */
  uretimTabaniPpm: number;
  /** true: elektrik açığında önce hane karşılanır (D4 enerji önceliği yasasının B2 karşılığı), kalan sanayiye dağılır. */
  haneOnceligi: boolean;
  /** Santrallerin planlanan yükü (yakıt talebi): önceki çözümdeki yük + bu marj (ppm), en çok PPM. */
  yukPlanMarjiPpm: number;
  /**
   * Santral (elektrik üreten tesis) işletme gideri çarpanı (ppm): `ekonomi.tesisIsletmeParasiSaat` bu oranla ödenir.
   * Her bölgede zorunlu santral, para lavabosunu iki katına çıkarıp ayarla-unut oyuncusunu (H7) boğmasın diye < PPM.
   */
  santralIsletmePpm: number;
  /** [S, M, L] */
  olcekKademeleri: OlcekKademesiTanimi[];
  /** Ölçek yükseltme süresi = tür inşa süresi x bu oran. */
  olcekYukseltmeSureCarpaniPpm: number;
  hidro: { akarsuEgrisiPpm: number[] };
  bakim: {
    /** [asgari, normal, yuksek] */
    duzeyler: BakimDuzeyiTanimi[];
    /** Aşınmanın en çok neden olduğu verim kaybı (ppm). */
    asinmaVerimKaybiTavaniPpm: number;
    /** Genel onarım maliyeti: inşa maliyetinin bu oranı (para + mal). */
    genelOnarimMaliyetPpm: number;
    genelOnarimDurusSaat: number;
    /**
     * Bakım girdisi karşılanma oranı bu eşiğin altındaysa günlük aşınma en az `kitlikAsinmaPpmGun` x (1 - karşılanma) olur
     * (tam kıtlıkta kitlikAsinmaPpmGun, eşik üstünde ek aşınma yok).
     */
    kitlikEsigiPpm: number;
    kitlikAsinmaPpmGun: number;
  };
  kirlilik: {
    /** Günlük doğal azalma: mevcut kirliliğin bu oranı (ppm). */
    azalmaPpmGun: number;
    /** Günlük kara komşularına geçen oran (ppm). */
    komsuYayilimPpmGun: number;
    /** Tarımsal çıktı kaybı katsayısı: çıktı x (PPM - kirlilik x katsayı). */
    tarimKatsayiPpm: number;
    /** Devlet istikrar hedefi cezası katsayısı (B4 için hazır; B2'de okunmaz). */
    istikrarKatsayiPpm: number;
  };
  damar: {
    /** Çekirdeğin kurulumda rezervlere uyguladığı ek ölçek (ppm; harita zaten ölçekliyse 1_000_000). */
    rezervOlcegiPpm: number;
    /** Rezerv verimi tabanı: damar tükenince verim sıfıra değil bu orana iner. */
    rezervVerimTabaniPpm: number;
    kesifMaliyetPara: number;
    kesifMaliyetMal: Record<MalId, number>;
    kesifSureSaat: number;
    /** Keşfin başarı olasılığı (ppm). */
    kesifOlasilikPpm: number;
    /** Yeni damar boyutu: rezervIlk x U(min, max) (ppm). */
    kesifEkiMinPpm: number;
    kesifEkiMaxPpm: number;
    /** Bölge x mal başına en çok keşif sayısı. */
    kesifHakkiBolgeMal: number;
  };
}

/** Kıtlık cezası (B3, docs/08 §5.3 P4): temel ihtiyaç karşılanması düştükçe kademeli üretim cezası. */
export interface KitlikParametreleri {
  /** Kademe 1, 2, 3 için üst eşikler (ppm; karşılanma >= esik[0] ise kademe 0); azalan sırada. */
  esikPpm: [number, number, number];
  /** Kademe 1, 2, 3 üretim çarpanı cezası (ppm; en çok 300 000 = %30); azalmayan sırada. */
  cezaPpm: [number, number, number];
  /** Kademe iyileşirken her bu kadar saatte bir kademe düşer (toparlanma ataleti). */
  toparlanmaSaat: number;
}

/**
 * Pazar v1 ek alanları (B3, docs/08 §5.5). Hepsi birlikte verilirse (ya hiçbiri ya hepsi) pazar yenilikleri açılır:
 * liman primi (P1), açık NPC makası (P2), komisyon ve tarife alanları (P3), kıtlık cezası (P4) ve NPC likidite ölçeği.
 * Yoksa çekirdek Sanayi v1 davranışını birebir verir. Açıkken eski ithalat/ihracat, anlaşma ve yaptırım çarpan alanları
 * (`ithalatCarpaniPpm` vb.) makasla TUTARLI olmalıdır (doğrulayıcı denetler): ithalat = PPM + makas/2, ihracat = PPM - makas/2.
 */
export interface PazarEkAlanlari {
  /** Dünya piyasa yapıcısının toplam alış-satış farkı (ppm); ithalat +makas/2, ihracat -makas/2 (200 000 = ±%10). */
  makasPpm: number;
  /** Aktif ticaret anlaşmasında makas (100 000 = ±%5). */
  anlasmaMakasPpm: number;
  /** Yaptırım altında makas (600 000 = ±%30). */
  yaptirimMakasPpm: number;
  /** Dünya kapısına uzaklığın saat başına primi (ppm/saat). */
  limanPrimPpmSaat: number;
  /** Liman priminin tavanı (ppm). */
  limanPrimTavaniPpm: number;
  /** Her işlem değeri üzerinden sisteme giden komisyon (ppm; para lavabosu). */
  islemKomisyonuPpm: number;
  /** NPC likiditesi bu oyuncu sayısının üstünde orantılı büyür (emilim/arz x max(taban, oyuncu) / taban). */
  npcLikiditeTabanOyuncu: number;
  kitlik: KitlikParametreleri;
  /** Oyuncu düzeyinde seçilebilecek tarife kademeleri (B4 Devlet komutu; B3'te kademe 0 varsayılandır). */
  tarife: { ithalatPpm: number[]; ihracatVergisiPpm: number[] };
}

/** `Parametreler.pazar` içindeki özgün (B3 öncesi) alanlar. */
export interface PazarTemelParametreleri {
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
}

/** Pazar parametreleri: özgün alanlar + (opsiyonel) B3 ek alanları. */
export type PazarParametreleri = PazarTemelParametreleri & Partial<PazarEkAlanlari>;

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
  pazar: PazarParametreleri;
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
  /**
   * Tarım katmanı (B1). `iklim` ve `tarim` birlikte verilirse tarım mekanikleri açılır (toprak, ekim planı,
   * iklim takvimi ve olaylar, gübre); ikisi de yoksa kapalıdır ve çekirdek v0.2 davranışını birebir verir.
   */
  iklim?: IklimParametreleri;
  tarim?: TarimParametreleri;
  /**
   * Sanayi katmanı (B2). Tanımlıysa sanayi mekanikleri açılır (elektrik, ölçek, bakım/aşınma, kirlilik, damar/keşif);
   * yoksa kapalıdır ve çekirdek davranışı Tarım v1 ile birebir aynıdır. Elektrik için `nufus.tuketim1000Saat["elektrik"]` kullanılır.
   */
  sanayi?: SanayiParametreleri;
  /**
   * Mülk kipi (S3, docs/11 §7.2–§7.9): paylaşılan parsel dünyası. Tanımlıysa VE veri paketiyle bir parsel fikstürü
   * (`parsel`) verilmişse çekirdek mülk kipinde çalışır (hücre mülkiyeti, işletme düğümleri, parsel komutları); aksi halde
   * kullanılmaz ve bölge kipi birebir aynı kalır. Değerler başlangıç önerisidir, kalibre edilmedi.
   */
  mulk?: MulkParametreleri;
}

/** Mülk kipi parametreleri (S3). Para alanları mili-para (1 ₺ = 1000), oranlar ppm. */
export interface MulkParametreleri {
  /** Hücre başına taban fiyat (mili-para), arsa sınıfına göre. */
  hucreFiyati: { kirsal: number; kasaba: number; sehir: number };
  /** Fiyat çarpanı = 1 + satisPayiCarpaniPpm/PPM × (ilçede satılmış hücre / uygun hücre); 2 000 000 = "× (1 + 2·pay)". */
  satisPayiCarpaniPpm: number;
  /** Oyuncu başına ilçede en çok hücre. */
  ilceHucreTavani: number;
  /** Oyuncu başına ilçenin uygun hücrelerinin en çok payı (ppm). */
  ilcePayTavaniPpm: number;
  /** Arazi vergisi: arazi değerinin haftalık payı (ppm; 10 000 = %1). Tembel: hazinenin saatlik oranına işlenir. */
  araziVergisiHaftalikPpm: number;
  /** İnşaat iptalinde ödenen para ve malzemenin iade payı (ppm). */
  insaatIptalIadePpm: number;
  /** Oyuncu başına aynı anda süren en çok hücreli inşaat. */
  esZamanliInsaat: number;
  /** Tesis türü -> kapladığı hücre sayısı (yuva, 1..3). Listede olmayan tür mülk kipinde inşa edilemez. */
  yapiYuva: Record<string, number>;
  /** İsteğe bağlı tesis türü -> inşa süresi (saat); yoksa içerikteki `insaSuresiSaat`. */
  yapiInsaSaati?: Record<string, number>;
  /** Yeni oyuncu (H6). Bugün yalnız `hibe` ve `baslangicStok` uygulanır; diğerleri parametre yeridir. */
  yeniOyuncu: {
    /** Katılım hibesi (mili-para): mülk kipinde başlangıç hazinesi. */
    hibe: number;
    /** İlk işletme düğümünün başlangıç stoğu (mal -> mili-birim; başlangıç kiti, kalibre edilmedi). */
    baslangicStok: Record<MalId, number>;
    /** Bedava yurt hücresi sayısı (henüz uygulanmıyor). */
    yurtHucre: number;
    /** İlk yapılarda inşa indirimi (ppm) ve kaç yapıda (henüz uygulanmıyor). */
    ilkYapiIndirimPpm: number;
    indirimliYapiSayisi: number;
    /** İlçede yeni oyunculara ayrılmış hücre payı (ppm; henüz uygulanmıyor). */
    ayrilmisHucrePpm: number;
    /** Yeni oyuncu kalkanı (gün; henüz uygulanmıyor). */
    kalkanGun: number;
  };
  /** Hareketsizlik merdiveni (docs/11 §7.8): yalnız veri yeri; kurallar sonraki iş. */
  hareketsizlik: {
    uykuGun: number;
    curumeGun: number;
    curumePpmGun: number;
    acikArtirmaGun: number;
    tatilGunYillik: number;
  };
}

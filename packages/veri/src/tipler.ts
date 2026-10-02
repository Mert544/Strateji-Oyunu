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
  /**
   * Yalnız MÜLK kipinde seçilebilir (parsel dünyası + `param.mulk`; docs/arastirma/p4-p5-sartname.md §4.1). Bölge kipinde `icerikDerle` bu yöntemi tür
   * listelerinden süzer (bölge botları ve komutları görmez; indeksler ve kimlik tablosu sabit kalır). Tür varsayılanı (`yontemler[0]`) olamaz,
   * `gerekliTeknoloji` taşıyamaz (kilitsizlik).
   */
  mulkKipi?: true;
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
  /**
   * Ödül tablosu (para güvenliği, docs/06 §15.7): `sistem_odul {oyuncu, kavram}` komutu TUTAR TAŞIMAZ; para, mal, tavan ve "kavram başına bir kez"
   * kuralı buradan okunur. Tablo kural sürümüne girer (sürümlü). Yoksa `sistem_odul` reddedilir. Yalnız para ya da mal taşıyan kavramlar buraya
   * girer; yalnız kozmetik/bilgi veren kavramlar çekirdeğe GİRMEZ (profilde tutulur).
   */
  odul?: OdulTablosu;
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
    /** Yalnız mülk işletme düğümlerinde birlik ikmali çarpanı (ppm); yoksa 1x. */
    ikmalCarpaniPpm?: number;
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

/** Ödül kavramı: para (mili-para) ve/ya mal (mal -> mili-birim; oyuncunun ilk işletme düğümünün stoğuna). En az biri > 0 olmalıdır. */
export interface OdulKavramTanimi {
  para?: number;
  mal?: Record<MalId, number>;
}

/** Sürümlü çekirdek ödül tablosu. `tavanMili`: oyuncu başına toplam ödül DEĞERİ (para + mal x `tabanFiyat`) tavanı (docs: ₺8.000 = 8 000 000). */
export interface OdulTablosu {
  surum: 1;
  tavanMili: number;
  kavramlar: Record<string, OdulKavramTanimi>;
}

/**
 * Kamu kasası parametreleri (para güvenliği, docs/06 §15.7; araştırma kamu-ve-kamu-arazileri §4). Kasalar yalnız ZATEN YANAN paradan beslenir:
 * arazi vergisi dağılımı ve ithalat makası/komisyonu payı; İHRACAT tarafı ASLA kaynak değildir. Tanımsızsa kasa ve para defteri kapalıdır.
 */
export interface MulkKasaParametreleri {
  /** Arazi vergisi dağılımı (ppm; toplamı ≤ PPM, kalanı yanar): mahalle, ilçe, il. Varsayılan %20 / %40 / %15 / %25 yanar. */
  vergiPayi: { mahallePpm: number; ilcePpm: number; ilPpm: number };
  /** İthalat makasının (ref × (ithalatMakasi) − ref) ilçe kasasına giden payı (ppm). Varsayılan %20. */
  ithalatMakasiIlcePpm: number;
  /** İthalat işlem komisyonunun ilçe kasasına giden payı (ppm). Varsayılan %50. */
  ithalatKomisyonuIlcePpm: number;
  /** Kayan pencere (gün): oyuncu payı ve haftalık bütçe bu pencereden hesaplanır. Varsayılan 28. */
  pencereGun: number;
  /** Kasanın oyuncuya akan payı tavanı: pencere girişinin en çok bu kadarı (ppm). Varsayılan %50. */
  oyuncuPayiTavaniPpm: number;
  /** Tek alım tavanı: kullanılabilir bakiyenin en çok bu kadarı (ppm). Varsayılan %40. */
  tekAlimTavaniPpm: number;
  /** Haftalık bütçe: pencere girişinin haftalık bu payı (ppm; son 7 günde harcanan + rezerv bunu aşamaz). Varsayılan %25. */
  haftalikButcePpm: number;
}

/** Ek yapı tanımı (mülk kipi). Para mili-para, malzeme mili-birim, oranlar ppm. Etki alanları yoksa yapı etkisizdir (yer tutucu). */
export interface MulkEkYapiTanimi {
  ad: string;
  /** Kapladığı hücre sayısı (1..3). */
  yuva: number;
  /** İnşa süresi (saat; erken oyun çarpanı uygulanır). */
  insaSaati: number;
  /** İnşa bedeli: para (mili-para) ve malzeme (stoktan düşer). */
  insaParasi: number;
  insaMaliyeti: Record<MalId, number>;
  /** İşletme (oyuncu, il) başına en çok bu kadar (biten + süren); yoksa sınırsız. */
  enFazlaIlBasina?: number;
  /** Ambar: biten her yapı, işletmenin her depolanabilir malının stok kapasitesine bu kadar (mili-birim) ekler. */
  depoKapasiteEkiMili?: number;
  /** Ticaret ofisi: işlem komisyonunu (ppm, göreli) ve pazar makasını (ppm; makasın PPM'e doğru kapanan payı) azaltır; toplamlar PPM ile sınırlı. */
  komisyonIndirimPpm?: number;
  makasIndirimPpm?: number;
  /** Ticaret ofisi: işletmenin ticaret emri yuvasına eklenir (`temelEmirYuvasi` ile birlikte). */
  emirYuvasi?: number;
  /** Biten her yapı başına birlik kapasitesi; kuyruktaki üretim de kapasiteyi kullanır. */
  birlikKapasitesi?: number;
  /**
   * Ölçeğe göre kapladığı hücre sayısı `[S, M, L]` (yalnız `dukkan` kullanır; sartname §4.2): `[0] = yuva`, `[1] >= [0]`, `[2] >= [1]`, hepsi en çok 5.
   * Yoksa ek yapı ölçeklenmez (mevcut davranış).
   */
  olcekHucre?: [number, number, number];
}

/** Dükkân ölçeği sabitleri (`MulkPerakendeParametreleri.olcekler[o]`; indeks 0 = S, 1 = M, 2 = L). */
export interface DukkanOlcegi {
  /** Raf yuvası sayısı. */
  rafYuvasi: number;
  /** Kasa kapasitesi, mili-birim/saat, TÜM mallar toplamı. */
  kasaMiliSaat: number;
  /** İşletme gideri, mili-₺/saat (para-yalnız gider; lavabo `isletme`). */
  giderMiliSaat: number;
  /** Çekim çarpanı (ppm). Alfa-0'da yalnız S kullanılır (PPM = etkisiz). */
  cekimCarpaniPpm: number;
}

/** Dükkân türü (`kimlik-listesi.json` `dukkanTurleri` üyesi; mal kimlikleriyle kesişmez). */
export interface DukkanTuruTanimi {
  id: string;
  ad: string;
  /** Rafa konabilen mallar (mal kimlikleri). */
  mallar: string[];
  /** Çeşit paydası: tam çeşit için gereken dolu yuva (1 <= tamCesit <= mallar.length). */
  tamCesit: number;
  /** Bu türün geçerli ölçekleri (0 = S, 1 = M, 2 = L). */
  olcekAraligi: (0 | 1 | 2)[];
}

/** Toplam-sabit bayram dalgası: bayramdan `oncesiGun` gün önce talep x oncesiPpm; bayram günü dahil sonraki `sonrasiGun` gün x sonrasiPpm. */
export interface BayramDalgasi {
  oncesiGun: number;
  oncesiPpm: number;
  sonrasiGun: number;
  sonrasiPpm: number;
}

/** Yerel NPC hane talebi (G7a). Nüfus verisi ve ilçe seviyesi YOKTUR; sınıf = ilçenin baskın hücre sınıfı. */
export interface YerelTalepParametreleri {
  /** Talebi ilçe büyüklüğüne çeviren ölçek (kalibre DEĞİL). */
  yerelOlcek: number;
  /** İlçe sınıfı başına nüfus eşdeğeri. */
  ilceSinifiNufus: { kirsal: number; kasaba: number; sehir: number };
  /** Mal -> talep, mili-birim / 1000 nüfus / saat. Rafa girebilen her mal için satır zorunlu. */
  talep1000Saat: Record<MalId, number>;
  /** Talep grubu: her mal TAM BİR grupta. Grup iklim takvimini ve (varsa) bayram dalgasını taşır. */
  gruplar: Record<string, { mallar: MalId[]; takvimPpm: number[]; bayram?: BayramDalgasi }>;
  /** Bayram günleri (sim günü indeksi; kesin artan; bayramın ilk günü); boş olabilir. */
  bayramGunleri: number[];
}

/**
 * Perakende (dükkân) kuralları ve yerel pazar (sartname docs/arastirma/p4-p5-sartname.md §4.3). Blok YOKSA dükkân kuralları kapalıdır (davranış bugünküyle aynı);
 * şemada seviye/teknoloji/önkoşul alanı bulunmaz (A0-17 kilitsizlik; `.strict()`).
 */
export interface MulkPerakendeParametreleri {
  surum: 1;
  /** Dünyaya AÇIK dükkân ölçekleri (0 = S, 1 = M, 2 = L); boş olamaz. Alfa-0: [0]. Oyuncu kilidi değil, özelliğin dünyaya açılış zamanlaması. */
  acikOlcekler: (0 | 1 | 2)[];
  /** Oyuncu başına ilçede en çok dükkân (biten + süren). */
  ilceBasinaEnFazla: number;
  /** Fiyat bandı (R çarpanı, ppm) [alt, üst]: kademeler ve esnaf fiyatı bu aralıkta olmalı. */
  fiyatBandiPpm: [number, number];
  /** Fiyat kademeleri: dükkân fiyatı = R x kademe (ppm). Kesin artan, hepsi bant içinde, en az 3. SAYI VE SIRA KALICI. */
  fiyatKademeleriPpm: number[];
  /** Yeni rafın / yeni malın varsayılan kademesi (indeks). */
  varsayilanFiyatKademesi: number;
  /** Kampanya kademesinin indeksi (0 olmalı). Tanımsız = kampanya kademesi yok. */
  kampanyaKademesi?: number;
  /** Kampanya: dükkân başına günde en çok saat [0, 24]. Tanımsız ya da 0 = kampanya KAPALI. */
  kampanyaGunlukEnFazlaSaat?: number;
  /** Kampanya: dükkân başına sim haftasında en çok gün [0, 7]. Tanımsız ya da 0 = kampanya KAPALI. */
  kampanyaHaftalikEnFazlaGun?: number;
  /** Aynı yuvada iki fiyat/mal değişimi arası en az saat (hız sınırı). 0 = sınır yok. */
  fiyatDegisimEnAzSaat: number;
  /** Çeşit çarpanı katsayısı (ppm): w x (PPM + cesitKatsayiPpm x cesit / PPM). */
  cesitKatsayiPpm: number;
  /** Esnaf (NPC arka plan dükkân): fiyat R'nin katı ve oyuncu havuzunun tabanı (ppm). */
  esnaf: { fiyatPpm: number; tabanPayPpm: number };
  /** Ölçeğe göre dükkân sabitleri; indeks 0 = S, 1 = M, 2 = L. */
  olcekler: [DukkanOlcegi, DukkanOlcegi, DukkanOlcegi];
  /** Dükkân türleri. */
  dukkanTurleri: DukkanTuruTanimi[];
  /** Yerel NPC hane talebi. */
  talep: YerelTalepParametreleri;
  /** Marka kuralları (ad uzunluğu ve izinli küme parametre DEĞİL: çekirdek sabiti `AD_KURALI`). */
  marka: { hesapBasinaEnFazla: number; simgeSayisi: number; renkSayisi: number };
}

/** Şebekeden otomatik alınan bir mal (`MulkSebekeParametreleri.mallar[]`). */
export interface SebekeMali {
  /**
   * Mal kimliği. "elektrik" (depolanamaz) anlık denge yoluyla, diğer depolanabilir mallar (örn. yakıt) stoksuz tüketim anı yoluyla çözülür
   * (çekirdek yolu G6-2'de; bu şema yalnız veridir).
   */
  mal: string;
  /**
   * Birim fiyatın kamu fiyat tavanına oranı (ppm); 0 < değer <= 1 000 000: şebeke ASLA tavanın üstünde satmaz. Fiyat TABANA bağlıdır
   * (`tabanFiyat x kamuIthalatCarpaniPpm x tavanOraniPpm`); canlı pazar fiyatı yolu yoktur.
   */
  tavanOraniPpm: number;
}

/**
 * Mülk kipinde şebeke tedariki (sartname §4.7, §5.2): santralsiz tesis elektriği (ve listedeki diğer malları) şebekeden alır; bedel kamu kasasına ve
 * lavaboya gider. BLOK YOKSA şebeke yoktur ve çekirdek davranışı bugünküyle bayt bayt aynıdır (bayrak = bloğun varlığı).
 */
export interface MulkSebekeParametreleri {
  surum: 1;
  /** Şebekeden otomatik alınan mallar (içerik mal kimliği; boş olamaz; tekil). Sıra anlamsızdır; çekirdek mal indeksine göre sıralar. */
  mallar: SebekeMali[];
  /** Toplam bedelin ilçe kamu kasasına giden payı (ppm); kalanı lavaboda yanar. Tamsayı: kasa = floor(ödeme x pay / 1e6), lavabo = ödeme - kasa. */
  kasaPayiPpm: number;
}

/**
 * Yöntem çıktısı için yedek geçersiz kılma (sartname §4.8, §5.9; varsayılan KAPALI): mülk kipinde yöntemin çıktısı `ciktiPpm / 1e6` ile çarpılır
 * (girdiye dokunulmaz). `ciktiPpm = 1 000 000` ve blok yok: davranış bugünküyle aynı.
 */
export type MulkYontemGecersizKilmaParametreleri = Record<string, { ciktiPpm: number }>;

/**
 * Mülk kipine özel bakım ayarı (sartname §5.10): her alan bağımsız ve isteğe bağlıdır; yoksa `sanayi.bakim` aynen geçerlidir. YALNIZ mülk kipinde ve işletme
 * düğümünde etkindir; bölge kipi (ve bölge kipi altınları) etkilenmez. Boş blok `{}` ve kimlik değerleri no-op'tur.
 */
export interface MulkBakimParametreleri {
  /** Düzey `asinmaPpmGun` ve `kitlikAsinmaPpmGun` çarpanı (ppm; 0 < değer <= 2 000 000). 1 000 000 = kimlik. Öneri: 500 000. */
  asinmaHizCarpaniPpm?: number;
  /** Aşınmanın çıktı kaybı tavanı (ppm; 0 <= değer <= 1 000 000); `sanayi.bakim.asinmaVerimKaybiTavaniPpm` yerine geçer. Aynı değer = kimlik. Öneri: 250 000. */
  asinmaVerimKaybiTavaniPpm?: number;
  /** Yöntem kimliği -> bakım parçası (`YontemTanimi.bakim`) çarpanı (ppm; 0 < değer <= 2 000 000). 1 000 000 = kimlik. Yalnız bakım girdisini ölçekler. */
  yontemParcaPpm?: Record<string, number>;
}

/**
 * Kamu arsası parametreleri (docs/12 §10, docs/06 §15.6). Tanımlıysa çekirdek mülk dünyasını KURARKEN her ilçenin kamu kümesini
 * hesaplar ve dünya durumuna DONDURUR (satılmaz; sonradan parametre değişse de kayma olmaz). Tanımsızsa kamu kuralı yoktur
 * (eski dünyalar ve testler). Değerler baş liderin kararıdır (docs/12 §10), kalibre edilmedi.
 */
export interface MulkKamuParametreleri {
  /**
   * Mahalle paketi: mahalle başına SABİT hücre; sırayla yerleştirilir (ilki mahalle merkezine en yakın). Varsayılan:
   * meydan 5 + pazar 7 + park 8 = 20 hücre.
   */
  mahallePaketi: { tur: "meydan" | "pazar" | "park" | "hizmet" | "kiyi" | "sanayi_rezervi" | "hazine"; hucre: number }[];
  /** Mahalle verisi YOKSA: ilçe başına kümelenecek mahalle sayısı = max(1, yuvarlama(uygun / bu değer)). */
  mahalleHucreHedefi: number;
  /** Hazine rezervi: ilçenin uygun hücrelerinin bu payı (ppm; aşağı yuvarlanır); dikdörtgen adalar olarak (kenar-bitişik, bütünlüklü). */
  hazineRezerviPpm: number;
  /** Hazine rezervi adalarının hedef boyutu (hücre); ada sayısı = min(ceil(rezerv / hazineAdaHucre), hazineEnFazlaAda). */
  hazineAdaHucre: number;
  /** Hazine rezervi ada sayısı tavanı (birkaç büyük dikdörtgen ada; küçük ilçede tek ada olur). */
  hazineEnFazlaAda: number;
  /** İlçe merkezi alanı (hücre, 8–12): ilçe merkezine (yurt seçimindeki tanım) en yakın kenar-bitişik küme. */
  ilceMerkeziHucre: number;
  /** Kıyı şeridi derinliği (hücre): su (`engel: "su"`) hücresine bu uzaklıktaki (Manhattan) uygun hücreler. 0 = kıyı şeridi yok. */
  kiyiDerinlik: number;
  /** Kıyı ilçesi sayılmak için ilçede en az bu kadar su hücresi (küçük göletler kıyı sayılmaz). */
  kiyiIlceMinSuHucre: number;
  /** Mülk kipinde oyuncuya KAPALI ek yapı kimlikleri (kamu yapısı; ör. "muhtarlik"). */
  oyuncuyaKapaliYapilar: string[];
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
  /** `parsel_birak` iadesi: bırakılan hücrelerin satın alma bedelinin payı (ppm). Yoksa 700 000 (%70). */
  parselBirakIadePpm?: number;
  /** Oyuncu başına aynı anda süren en çok hücreli inşaat. */
  esZamanliInsaat: number;
  /** Tesis türü -> kapladığı hücre sayısı (yuva, 1..3). Listede olmayan tür mülk kipinde inşa edilemez. */
  yapiYuva: Record<string, number>;
  /** İsteğe bağlı tesis türü -> inşa süresi (saat); yoksa içerikteki `insaSuresiSaat`. */
  yapiInsaSaati?: Record<string, number>;
  /**
   * Tesis türü -> ölçeğe göre kapladığı hücre sayısı `[S, M, L]` (docs/06 §15.10): S = `yapiYuva`, M >= S, L >= M, en çok 5. Her `yapiYuva` türü için tanımlıdır.
   * Doğrudan kurulumda `hucreler` listesi o ölçeğin ayak izidir; yerinde yükseltmede aradaki fark kadar ek bitişik hücre gerekir.
   */
  olcekHucre: Record<string, [number, number, number]>;
  /** Doğrudan kurulum süresi çarpanı `[S, M, L]` (ppm; S 1000000, azalmayan): süre = `yapiInsaSaati` × çarpan (docs/06 §15.10). */
  olcekInsaSureCarpaniPpm: [number, number, number];
  /** Yeni oyuncu (H6). Bugün yalnız `hibe` ve `baslangicStok` uygulanır; diğerleri parametre yeridir. */
  yeniOyuncu: {
    /** Katılım hibesi (mili-para): mülk kipinde başlangıç hazinesi. */
    hibe: number;
    /** İlk işletme düğümünün başlangıç stoğu (mal -> mili-birim; başlangıç kiti, kalibre edilmedi). */
    baslangicStok: Record<MalId, number>;
    /**
     * Bedava yurt hücresi sayısı: ilk katılımda (`oyuncu_katil`) doluluğu en düşük ilçede (ya da komutta verilen ilçede)
     * komşu boş uygun hücrelerden ücretsiz verilir; 0 = yurt yok.
     */
    yurtHucre: number;
    /** İlk yapılarda inşa indirimi (ppm; hem para hem malzeme) ve kaç yapıda (`tesis_insa_hucre`, ek yapılar dahil). */
    ilkYapiIndirimPpm: number;
    indirimliYapiSayisi: number;
    /**
     * Her ilçenin uygun hücrelerinin bu kadarı (ppm; aşağı yuvarlanır) yalnız katılımının ilk `ayrilmisGun` gününde olan
     * oyunculara satılır (hücre kimliği karmasıyla deterministik seçilir).
     */
    ayrilmisHucrePpm: number;
    /** Ayrılmış hücrelerin satın alınabildiği süre (gün, katılımdan itibaren). Yoksa 14. */
    ayrilmisGun?: number;
    /**
     * Hesap başına en çok bu kadar AYRILMIŞ hücre (sahip olunan; yurt dahil). Ayrılmış hücreler satış payı çarpanından muaftır ve ilçenin
     * TABAN (sınıf) fiyatından satılır. Yoksa sınır yoktur.
     */
    ayrilmisHucreHesapTavani?: number;
    /**
     * Çok hesaplı alıcıya karşı (docs/06 §15.1): true ise ayrılmış hücre yalnız hesabın KATILIM ilçesinde satılır (yurt ilçesi; yurtsuz katılımda
     * `oyuncu_katil.ilce`; ikisi de yoksa ayrılmış hücre alınamaz). Yoksa/false: ilçe kısıtı yok (eski davranış, yeni alan yazılmaz).
     */
    ayrilmisYalnizKatilimIlcesi?: boolean;
    /**
     * İlçe başına GÜNLÜK ayrılmış satış tavanı: ilçenin ayrılmış stokunun (derlemedeki toplam ayrılmış hücre sayısı) bu kadarı (ppm; aşağı yuvarlanır),
     * en az `ayrilmisIlceGunlukEnAz` hücre. Gün = sim günü (`floor(zaman / GUN)`, TRT gece yarısına hizalı sim saati). Yoksa tavan yok.
     */
    ayrilmisIlceGunlukPpm?: number;
    /** `ayrilmisIlceGunlukPpm` açıkken günlük tavanın alt sınırı (hücre). Yoksa 0. */
    ayrilmisIlceGunlukEnAz?: number;
    /**
     * Bedava yurt önce AYRILMIŞ DIŞINDAN seçilir (ayrılmış havuz geç gelenler içindir): true ise yurt kümesi önce ayrılmış olmayan uygun hücrelerden kurulur
     * (merkeze en yakın, kenar-bitişik, `yurtHucre` kadar); bağlı küme başka türlü kurulamıyorsa ayrılmış hücreler YEDEK olarak dahil edilir. Kamu hücreleri
     * her durumda dışarıdadır. Yoksa/false: eski davranış (ayrılmış hücreler de verilebilir).
     */
    yurtAyrilmisSonra?: boolean;
    /** Yeni oyuncu kalkanı (gün): mülk kipinde `korumaBitis` bu değerden okunur (bölge kipi `askeri.yeniOyuncuKorumasiGun`). */
    kalkanGun: number;
  };
  /**
   * Ek yapılar (docs/11 §7.3; `icerik.json`'da tesis türü OLMAYAN yapılar: Ambar, Ticaret ofisi, Muhtarlık, Konut, Garaj,
   * Atölye-Lab). Yalnız mülk kipinde `tesis_insa_hucre {tesisTuru: <kimlik>}` ile inşa edilir; bölge kipinde ve içerikte yoktur
   * (bu yüzden bölge kipinin durum özeti etkilenmez). Kimlikler tesis türü kimliklerinden farklı olmalıdır.
   */
  ekYapilar?: Record<string, MulkEkYapiTanimi>;
  /** Perakende ve yerel pazar (sartname §4.3); yoksa dükkân kuralları kapalıdır (`dukkan_*` komutları reddedilir, çözümde iş yapılmaz). */
  perakende?: MulkPerakendeParametreleri;
  /** İşletme (oyuncu, il) başına temel ticaret emri yuvası; Ticaret ofisi `emirYuvasi` ekler. Yoksa emir sayısı sınırsızdır. */
  temelEmirYuvasi?: number;
  /** Şebeke tedariki (sartname §4.7); yoksa şebeke yoktur (eski dünyalar ve bölge kipi). */
  sebeke?: MulkSebekeParametreleri;
  /** Yöntem çıktısı yedek geçersiz kılma (sartname §4.8); yoksa yok. Varsayılan KAPALI (`ciktiPpm: 1000000`). */
  yontemGecersizKilma?: MulkYontemGecersizKilmaParametreleri;
  /** Mülk kipine özel bakım ayarı (sartname §5.10); yoksa `sanayi.bakim` aynen (bölge kipi her durumda). */
  bakim?: MulkBakimParametreleri;
  /** Kamu arsası (docs/06 §15.6); yoksa kamu kuralı kapalıdır (dünya `mulk.kamu` taşımaz). */
  kamu?: MulkKamuParametreleri;
  /** Kamu kasaları ve para defteri (docs/06 §15.7); yoksa kapalıdır (dünya `mulk.para` taşımaz). */
  kasa?: MulkKasaParametreleri;
  /** Hareketsizlik merdiveni (docs/11 §7.8): yalnız veri yeri; kurallar sonraki iş. */
  hareketsizlik: {
    uykuGun: number;
    curumeGun: number;
    curumePpmGun: number;
    acikArtirmaGun: number;
    tatilGunYillik: number;
  };
}

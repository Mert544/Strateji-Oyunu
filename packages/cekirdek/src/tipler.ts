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
  IklimOlayTuru,
  KenarTuru,
  MalTanimi,
  MulkParametreleri,
  Parametreler,
  ParselFiksturu,
  ParselHucreTanimi,
  ParselIlceTanimi,
  TeknolojiTanimi,
  TesisTuruTanimi,
  VeriPaketi,
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
  /**
   * Bölge komşulukları: bolge -> kenar indeksleri (artan sırada). Yalnız haritanın (merkez) bölgelerini kapsar; mülk
   * kipinde çalışma anında eklenen işletme düğümleri için `dugum.ts` (`komsuKenarlariBul`) kullanılır.
   */
  komsuKenarlar: number[][];
  /** Mülk kipi (S3): `param.mulk` + parsel fikstürü birlikte verilmişse derlenmiş mülk verisi; aksi halde TANIMSIZ. */
  mulk?: DerlenmisMulk;
}

/** Veri paketi + isteğe bağlı parsel fikstürü (mülk kipi). Bölge kipinde `parsel` verilmez. */
export type CekirdekVeriPaketi = VeriPaketi & { parsel?: ParselFiksturu };

/** Derlenmiş mülk verisi (S3): parametreler ve parsel fikstüründen; dünya durumuna girmez. */
export interface DerlenmisMulk {
  p: MulkParametreleri;
  fikstur: ParselFiksturu;
  /** il kimliği -> merkez bölge indeksi */
  ilMerkezi: Map<string, number>;
  /** ilçe kimliği -> ilçe tanımı */
  ilceler: Map<string, ParselIlceTanimi>;
  /** hücre kimliği -> (ilçe kimliği, hücre tanımı) */
  hucreler: Map<HucreId, { ilce: string; hucre: ParselHucreTanimi }>;
  /** tesis türü indeksi -> yuva (0 = mülk kipinde inşa edilemez) */
  yuva: number[];
  /** tesis türü indeksi -> inşa süresi (saat) */
  insaSaati: number[];
  /** Yeni oyuncunun ilk işletme stoğu (mal indeksi -> mili-birim). */
  baslangicStok: number[];
  /** Ek yapılar (kimliğe göre sıralı; `icerik.json`'da olmayan yapılar, yalnız mülk kipinde). */
  ekYapilar: DerlenmisEkYapi[];
  /** Ek yapı kimliği -> `ekYapilar` indeksi. */
  ekYapiIndeks: Map<string, number>;
  /** Yeni oyunculara ayrılmış hücreler (ilçe başına hücre kimliği karmasıyla seçilmiş; durum değil, türetilmiş). */
  ayrilmis: Set<HucreId>;
  /** Ayrılmış hücrelerin satıldığı süre (ms, katılımdan itibaren). */
  ayrilmisSureMs: Ms;
}

/** Derlenmiş ek yapı tanımı (`MulkEkYapiTanimi`; maliyet mal indeksine çevrilmiş, sıralı). */
export interface DerlenmisEkYapi {
  id: string;
  ad: string;
  yuva: number;
  insaSaati: number;
  insaParasi: Mili;
  insaMaliyeti: [number, Mili][];
  enFazlaIlBasina: number;
  depoKapasiteEkiMili: Mili;
  komisyonIndirimPpm: number;
  makasIndirimPpm: number;
  emirYuvasi: number;
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
  /** Sanayi (B2): ölçek kademesi 0 = S, 1 = M, 2 = L. Sanayi kapalıysa TANIMSIZDIR (özet değişmez). */
  olcek?: 0 | 1 | 2;
  /** Sanayi (B2): aşınma (0..PPM); verim kaybı = aşınma x asinmaVerimKaybiTavaniPpm. Sanayi kapalıysa tanımsızdır. */
  asinmaPpm?: number;
  /** Sanayi (B2): genel onarım durması bitişi (ms); bu ana kadar tesis çalışmaz. Onarım yoksa tanımsızdır. */
  onarimBitis?: Ms;
  /** Mülk kipi (S3): tesisin kapladığı hücreler (1–3, kimliğe göre sıralı). Bölge kipinde TANIMSIZDIR. */
  hucreler?: HucreId[];
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

/**
 * Bölgenin tarım durumu (B1). Düz veri; tarım kapalıysa veya bölge tarım dışıysa `BolgeDurumu.tarim` tanımsızdır.
 * Tüm alanlar tamsayıdır.
 */
export interface BolgeTarimDurumu {
  /** Toprak durumu (toprakTabaniPpm..PPM; başlangıç PPM). */
  toprakPpm: number;
  /** Ürün payları (icerik.tarimUrunleri sırasıyla, toplam PPM). */
  ekimPpm: number[];
  /** Gübre dozu (0..azamiGubreDozu). */
  gubreDozu: number;
  /** Son günlük tikte hesaplanan iklim hasat oranı (ppm; sulama dahil; yıllık ortalama PPM). */
  iklimPpm: number;
  /**
   * Son günlük tikte hesaplanan birleşik olay şiddeti (ppm, 0..PPM): bölgeyi etkileyen etkin kuraklik/don/sel
   * olaylarının (sulama koruması düşülmüş) çarpımsal birleşimi. Çıktı kaybı, ürünün olay duyarlılığıyla çarpılır.
   */
  olayKaybiPpm: number;
  /** Son lojistik çözümde gübre girdisinin karşılanma oranı (ppm); gübre talebi yoksa 0. */
  gubreKarsilanmaPpm: number;
}

/**
 * Bölgenin elektrik dengesi (B2): depolanamaz, taşınamaz, anlık denge. Her lojistik çözümde yeniden yazılır.
 * Sanayi kapalıysa `BolgeDurumu.elektrik` tanımsızdır.
 */
export interface BolgeElektrikDurumu {
  /** Son çözümde santrallerin teslim ettiği elektrik (mili-birim/saat, iletim kaybı öncesi brüt çıktı). */
  uretimMili: Mili;
  /** Toplam talep: tesisler + hane (mili-birim/saat). */
  talepMili: Mili;
  /** Tesislerin karşılanma oranı (ppm); elektrik girdili tesislerin verimi bununla çarpılır. */
  karsilanmaPpm: number;
  /** Hanenin karşılanma oranı (ppm). */
  haneKarsilanmaPpm: number;
  /** Santrallerin yükü (ppm): talebi izler; yakıt tüketimi ve kirlilik bununla ölçeklenir. */
  yukPpm: number;
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
  /** mal indeksine göre güncel brüt üretim oranı (mili-birim/saat); çözümde ayarlanır */
  uretimOrani: Mili[];
  /** uretimToplam'ın en son uretimOrani ile güncellendiği an; oran değişmeden önce biriktirilir */
  uretimT0: Ms;
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
  /** Tarım durumu (B1). Tarım kapalıysa veya bölge tarım dışıysa TANIMSIZDIR (özet v0.2 ile birebir kalır). */
  tarim?: BolgeTarimDurumu;
  /** Elektrik dengesi (B2). Sanayi kapalıysa TANIMSIZDIR. */
  elektrik?: BolgeElektrikDurumu;
  /** Kirlilik (B2, 0..PPM): tarım verimini düşürür; B4'te istikrar hedefini düşürecek. Sanayi kapalıysa tanımsızdır. */
  kirlilikPpm?: number;
  /** Kullanılan keşif hakkı (B2), mal indeksine göre. Sanayi kapalıysa tanımsızdır. */
  kesifSayisi?: number[];
  /** Son çözümde bakım girdisinin karşılanma oranı (ppm, B2): düşükse aşınma hızlanır. Sanayi kapalıysa tanımsızdır. */
  bakimKarsilanmaPpm?: number;
  /**
   * Kıtlık kademesi (B3, docs/08 §5.3 P4): 0 = yok, 1..3 = üretim çarpanı cezası kademesi (en çok %30). Saatlik tıkta
   * `temelKarsilanmaPpm`'e göre güncellenir (kötüleşme anında, iyileşme `toparlanmaSaat`'te bir kademe). Pazar v1 kapalıysa
   * TANIMSIZDIR (özet değişmez).
   */
  kitlikKademesi?: 0 | 1 | 2 | 3;
  /** Son kademe değişiminin anı (B3, toparlanma ataleti için). Pazar v1 kapalıysa tanımsızdır. */
  kitlikT?: Ms;
  /**
   * Temel ihtiyaç karşılanması (ppm, B3): min(gıda, yakıt, hane elektriği); son çözümden. Hane elektriği yalnız bölgede aktif
   * santral varsa sayılır (şebekesiz bölge elektrik kıtlığı yaşamaz). Pazar v1 kapalıysa tanımsızdır.
   */
  temelKarsilanmaPpm?: number;
  /**
   * Mülk kipi (S3): bu düğüm bir İŞLETME düğümüdür ve bu indeksteki merkez (harita) bölgesine sıfır süreli bağlıdır.
   * Harita tanımları (tarım, iklim tipi, liman) merkezden okunur. Harita bölgelerinde ve bölge kipinde TANIMSIZDIR.
   */
  merkez?: number;
  /**
   * Mülk kipi: biten ek yapılar (Ambar, Ticaret ofisi...; `mulk.ekYapilar`). İlk yapı bitince oluşur; yalnız işletme
   * düğümlerinde ve mülk kipinde bulunur, aksi halde TANIMSIZDIR.
   */
  ekYapilar?: EkYapiDurumu[];
}

/** Biten bir ek yapı (mülk kipi): kimlik dünya genelinde benzersizdir ve kapladığı hücrelerin `tesis` alanına yazılır. */
export interface EkYapiDurumu {
  id: number;
  /** `mulk.ekYapilar` kimliği. */
  tur: string;
  hucreler: HucreId[];
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

/**
 * Oyuncunun ticaret rejimi (B3, docs/08 §5.3 P3): oyuncu düzeyinde ithalat tarifesi ve ihracat vergisi. Komutu B4 Devlet'te
 * gelir (`tarife_ayarla`); B3'te varsayılan 0'dır. Yeni oyuncu koruması süresince etkisizdir (komisyon ile birlikte).
 */
export interface TicaretRejimi {
  ithalatTarifePpm: number;
  ihracatVergisiPpm: number;
}

/** Ticaret değer kalemleri (mili-para veya mili-para/saat). Hepsi ref. fiyat değeri ve ondan ayrışan kesintilerdir. */
export interface TicaretKalemleri {
  /** İhracatın dünya referans fiyatıyla değeri. */
  brutIhracat: Mili;
  /** İthalatın dünya referans fiyatıyla değeri. */
  brutIthalat: Mili;
  /** NPC piyasa yapıcının makas geliri (alış-satış farkı; iki yön). */
  makas: Mili;
  /** Liman primi (taşıma bedeli; iki yön). */
  prim: Mili;
  /** İşlem komisyonu (sisteme giden para lavabosu; iki yön). */
  komisyon: Mili;
  /** İthalat tarifesi (devlet geliri). */
  ithalatTarifesi: Mili;
  /** İhracat vergisi (devlet geliri). */
  ihracatVergisi: Mili;
}

/**
 * Oyuncunun ticaret defteri (B3): `toplam` kümülatif (mili-para), `oran` son çözümdeki saatlik kalemler, `t0` oranın başlangıcı.
 * Muhasebe, oran değişmeden önce `oran x (t - t0)` kadar toplama işler (uretimMuhasebesi gibi). Hazine korunumu:
 * hazineye etki = ihracat - ithalat + (tarife ve ihracat vergisi hazineye geri yazılır, net 0): B3'te tek hazine vardır;
 * B4 devlet bütçesi özel kesimden ayrılınca bu kalemler gerçek bir gelir/bedel olur.
 */
export interface TicaretDefteri {
  toplam: TicaretKalemleri;
  oran: TicaretKalemleri;
  t0: Ms;
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
  /** Bakım düzeyi (B2): 0 asgari, 1 normal, 2 yüksek. Sanayi kapalıysa TANIMSIZDIR. */
  bakimDuzeyi?: 0 | 1 | 2;
  /** Ticaret rejimi (B3): tarife ve ihracat vergisi. Pazar v1 kapalıysa TANIMSIZDIR. */
  ticaretRejimi?: TicaretRejimi;
  /** Ticaret defteri (B3): komisyon, makas, prim, tarife muhasebesi. Pazar v1 kapalıysa TANIMSIZDIR. */
  ticaretDefteri?: TicaretDefteri;
}

/** Yayılan bir iklim olayı (B1): yaratılırken bir kez hesaplanır, deterministik. */
export interface IklimOlayi {
  id: number;
  tur: IklimOlayTuru;
  /** Merkez bölge indeksi. */
  merkez: number;
  /** Uyarının ilan anı. */
  uyari: Ms;
  /** Etki başlangıcı: uyari + uyariSaat (takvim hızına göre). */
  etkiBaslangic: Ms;
  bitis: Ms;
  /** Merkezdeki şiddet (ppm). */
  siddetPpm: number;
  /** Yayılma: olay yaratılırken hesaplanmış (bölge indeksi artan sırada); şiddet mesafeyle azalır. */
  etki: Array<{ bolge: number; siddetPpm: number }>;
}

/** İklim durumu (B1). Tarım kapalıysa `Dunya.iklim` tanımsızdır. */
export interface IklimDurumu {
  /** Uyarıda veya etkide olan olaylar (süresi bitenler silinir). */
  olaylar: IklimOlayi[];
  /** Son işlenen takvim günü (mutlak gün sayısı: baslangicGunu + işlenen gün; takvim günü = sonGun mod 365). */
  sonGun: number;
}

export interface PazarDurumu {
  /**
   * Fiyatı kimin belirlediği (B3, docs/08 §5.3 P2): "npc" = Dünya Piyasa Yapıcısı (NPC; formülle çalışır, kâr peşinde değil).
   * Arayüz etiketi "Dünya Piyasa Yapıcısı (NPC)". Pazar v1 kapalıysa TANIMSIZDIR (özet değişmez).
   */
  kaynak?: "npc";
  /** mal indeksine göre güncel fiyat (mili-para/birim): dünya referans fiyatı (makas ve liman primi öncesi) */
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

/** "olcek": tesis ölçek yükseltmesi, "onarim": genel onarım durması (B2; yalnız sanayi açıkken). */
export type InsaatTuru = "tesis" | "kenar" | "olcek" | "onarim";

export interface InsaatDurumu {
  id: number;
  tur: InsaatTuru;
  sahip: OyuncuId;
  bolge: number;
  /** tesis türü indeksi (tesis), kenar indeksi (kenar), tesis kimliği (olcek) veya -1 (onarim, bölge düzeyinde) */
  hedef: number;
  bitis: Ms;
  /** Ölçek yükseltmesinde hedef kademe (1 = M, 2 = L); diğer türlerde tanımsız. */
  olcek?: 1 | 2;
  /** Mülk kipi (S3): hücreli inşaatın hücreleri (sıralı). Aşama `(şimdi − baslangic) / (bitis − baslangic)`'tan türetilir. */
  hucreler?: HucreId[];
  /** Mülk kipi (S3): inşaatın başlangıç anı (aşama hesabı için). */
  baslangic?: Ms;
  /** Mülk kipi (S3): ödenen para (mili-para) ve malzeme ([mal, miktar] çiftleri); iptal iadesinin tabanı. */
  odenenPara?: Mili;
  odenenMal?: [number, Mili][];
  /** Mülk kipi: ek yapı kimliği (`mulk.ekYapilar`); `tur` "tesis" ve `hedef` -1 iken. Tanımlıysa tamamlanınca `EkYapiDurumu` oluşur. */
  ekYapi?: string;
  /** Mülk kipi: inşaat ilk-yapı indirimiyle ödendi (iptalde indirim hakkı geri verilir). */
  indirimli?: true;
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
  iklim_gunluk: 5,
  sondaj_bitti: 3,
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
  | { tur: "iklim_gunluk" }
  | { tur: "sondaj_bitti"; bolge: number; mal: number }
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
  /** İklim takvimi ve olaylar (B1). Tarım kapalıysa TANIMSIZDIR. */
  iklim?: IklimDurumu;
  /** Mülk kipi (S3): hücreler, ilçeler, işletme düğümleri ve oyuncu mülk kayıtları. Bölge kipinde TANIMSIZDIR. */
  mulk?: MulkDurumu;
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
  // Tarım (B1)
  | { tur: "ekim_plani"; bolge: string; ekimPpm: number[] }
  | { tur: "gubre_dozu"; bolge: string; doz: number }
  // Sanayi (B2)
  | { tur: "tesis_olcek_yukselt"; bolge: string; tesis: number; olcek: 1 | 2 }
  | { tur: "genel_onarim"; bolge: string }
  | { tur: "bakim_duzeyi"; duzey: 0 | 1 | 2 }
  | { tur: "arama_sondaji"; bolge: string; mal: string }
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
  // Sistem (oyuncu kaydı; oyuncu kimliği "sistem" ile verilir). Mülk kipinde `bolgeler` boş olmalıdır.
  // Mülk kipinde `ilce` (isteğe bağlı): bedava yurdun verileceği ilçe; yoksa doluluğu en düşük uygun ilçe seçilir.
  | { tur: "oyuncu_katil"; oyuncu: OyuncuId; bolgeler: string[]; ilce?: string }
  // Mülk kipi (S3)
  | MulkKomutu;

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

// ---------------------------------------------------------------------------
// Mülk sözleşmesi (S1 taslağı, S3'te bağlandı; docs/11 §4.3, §7). `parametreler.mulk` + parsel fikstürü verilmedikçe
// hiçbir alan tanımlanmaz ve mülk komutları reddedilir; bölge kipinin durum özeti birebir aynı kalır.
// ---------------------------------------------------------------------------

/** z20 kare hücre kimliği: "x:y" (Web Mercator z20 karo koordinatı, ~30 m). */
export type HucreId = string;

/** Arsa sınıfı; taban fiyatı ve izinli yapıları belirler. */
export type ArsaSinifi = "kirsal" | "kasaba" | "sehir";

/** İlçe gelişim seviyesi: Köy → Kasaba → Merkez → Şehir. */
export type IlceSeviyesi = 0 | 1 | 2 | 3;

/** Tek bir hücrenin mülkiyet kaydı. Parsel asla zorla el değiştirmez (yalnız hareketsizlik açık artırması). */
export interface HucreDurumu {
  id: HucreId;
  ilce: string;
  sinif: ArsaSinifi;
  sahip: OyuncuId;
  /** Satın alma bedeli (mili-₺); arazi vergisinin tabanı. */
  degerMili: Mili;
  /** Üzerindeki tesisin kimliği; boşsa tanımsız. */
  tesis?: number;
  /** Üzerinde süren hücreli inşaatın kimliği; yoksa tanımsız. */
  insaat?: number;
  alinma: Ms;
}

/** Oyuncu-il işletme düğümü: (oyuncu, il) başına bir `BolgeDurumu`, il merkezine sıfır süreli (örtük) bağlı. */
export interface IsletmeDugumu {
  oyuncu: OyuncuId;
  il: string;
  /** Bağlı olduğu lojistik/pazar merkezi (harita bölgelerinden biri). */
  merkezBolge: string;
  /** Bu düğümün `bolgeler` dizisindeki indeksi. */
  bolgeIndeksi: number;
}

/** İlçe düzeyi paylaşılan durum. */
export interface IlceDurumu {
  id: string;
  il: string;
  seviye: IlceSeviyesi;
  /** Toplam uygun hücre sayısı (veri hattından). */
  uygunHucre: number;
  /** Satılmış hücre sayısı; fiyat çarpanı (1 + 2·pay) bundan türetilir. */
  satilmisHucre: number;
}

/** Oyuncunun mülk kaydı: arazi değeri, ilçe başına hücre sayısı, tembel arazi vergisi ve hareketsizlik verisi. */
export interface MulkOyuncuDurumu {
  id: OyuncuId;
  /** Sahip olunan hücrelerin satın alma bedelleri toplamı (mili-para). */
  araziDegeriMili: Mili;
  /** İlçe başına hücre sayısı (ilçe kimliğine göre sıralı; sıfır olan yazılmaz). */
  ilceHucre: { ilce: string; hucre: number }[];
  /**
   * Tahakkuk eden arazi vergisi (tembel stok): `miktar` kümülatif vergi (mili-para), `yerelOran` saatlik oran. Vergi
   * hazinenin saatlik oranına gider olarak işlenir; bu stok yalnız muhasebe içindir.
   */
  araziVergisi: Stok;
  /** Son başarılı komutun anı (hareketsizlik merdiveni için; kurallar sonraki iş). */
  sonEtkinlik: Ms;
  /** İlk-yapı indirimiyle başlatılmış (ve iptal edilmemiş) yapı sayısı; yalnız >0 iken yazılır. */
  indirimliYapi?: number;
}

/** Dünyanın mülk durumu. Diziler deterministik sıralıdır. */
export interface MulkDurumu {
  /** Kimliğe göre (JS dize sırası) sıralı. */
  hucreler: HucreDurumu[];
  /** Kimliğe göre sıralı (fikstür ilçelerinin tamamı). */
  ilceler: IlceDurumu[];
  /** (oyuncu, il) sırasıyla. */
  isletmeler: IsletmeDugumu[];
  /** Oyuncu kimliğine göre sıralı. */
  oyuncular: MulkOyuncuDurumu[];
}

/** Tesisin kapladığı hücreler (1–3). */
export interface TesisMulkAlanlari {
  hucreler?: HucreId[];
}

/** Mülk komutları. Coğrafi geçerliliği (hücre ilçede mi, uygun mu) sunucu doğrular; çekirdek fikstürdeki listeyi de denetler. */
export type MulkKomutu =
  | { tur: "parsel_al"; ilce: string; hucreler: HucreId[]; sinif: ArsaSinifi }
  | { tur: "tesis_insa_hucre"; ilce: string; tesisTuru: string; hucreler: HucreId[] }
  | { tur: "insaat_iptal"; insaat: number }
  // Atomik "yapı önce yerleşim": `hucreler` yapının TÜM hücreleri (kenar-bitişik, yuva sayısınca); oyuncunun olmayan (sahipsiz) hücreler
  // `sinif` sınıfında satın alınır ve inşaat başlar; herhangi bir denetim başarısızsa hiçbir şey değişmez.
  | { tur: "yapi_yerlestir"; ilce: string; tesisTuru: string; hucreler: HucreId[]; sinif: ArsaSinifi }
  // Üzerinde yapı/inşaat olmayan kendi hücrelerini bırakır; hücre bedelinin `parselBirakIadePpm`'i (%70) iade edilir.
  | { tur: "parsel_birak"; ilce: string; hucreler: HucreId[] };

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
  MulkKamuParametreleri,
  MulkParametreleri,
  Parametreler,
  ParselFiksturu,
  ParselIlceTanimi,
  ParselIzgaraGirdisi,
  TeknolojiTanimi,
  TesisTuruTanimi,
  VeriPaketi,
  YontemTanimi,
} from "@bolge/veri";
import type { AyrilmisKumesi, HucreDizini, HucreHaritasi } from "./mulk/hucreDizini";
import type { DerlenmisPerakende } from "./perakende/derle";

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
export type CekirdekVeriPaketi = VeriPaketi & {
  parsel?: ParselFiksturu;
  /**
   * Mülk kipi için JSON fikstürüne ALTERNATİF girdi: BHI1 ızgaraları (docs/06 §15.11). `parsel` ile birlikte verilemez; ikisi de aynı kompakt hücre dizinini
   * (`DerlenmisMulk.dizin`) kurar ve aynı dünyayı verir.
   */
  parselIzgara?: ParselIzgaraGirdisi;
};

/** Derlenmiş mülk verisi (S3): parametreler ve parsel fikstüründen; dünya durumuna girmez. */
export interface DerlenmisMulk {
  p: MulkParametreleri;
  fikstur: ParselFiksturu;
  /** il kimliği -> merkez bölge indeksi */
  ilMerkezi: Map<string, number>;
  /** ilçe kimliği -> ilçe tanımı */
  ilceler: Map<string, ParselIlceTanimi>;
  /**
   * Kompakt hücre dizini (docs/06 §15.11): hücre tanımları ilçe başına tek durum düzleminde; sıcak yol API'si (`hucreDurum`, `gez`, `ilceHucreleri`,
   * `ayrilmisListe`) burada.
   */
  dizin: HucreDizini;
  /** hücre kimliği -> (ilçe kimliği, hücre tanımı): eski `Map` yüzü (uyum katmanı; `dizin` üzerinde, hücre başına depolama yok). */
  hucreler: HucreHaritasi;
  /** tesis türü indeksi -> yuva (0 = mülk kipinde inşa edilemez) */
  yuva: number[];
  /** tesis türü indeksi -> ölçeğe göre ayak izi `[S, M, L]` (`mulk.olcekHucre`; S = yuva); inşa edilemeyen türde boş dizi. */
  olcekHucre: number[][];
  /** tesis türü indeksi -> inşa süresi (saat) */
  insaSaati: number[];
  /** Yeni oyuncunun ilk işletme stoğu (mal indeksi -> mili-birim). */
  baslangicStok: number[];
  /** Ek yapılar (kimliğe göre sıralı; `icerik.json`'da olmayan yapılar, yalnız mülk kipinde). */
  ekYapilar: DerlenmisEkYapi[];
  /** Ek yapı kimliği -> `ekYapilar` indeksi. */
  ekYapiIndeks: Map<string, number>;
  /** Yeni oyunculara ayrılmış hücreler (ilçe başına hücre kimliği karmasıyla seçilmiş; durum değil, türetilmiş). Kamu hücreleri girmez. */
  ayrilmis: AyrilmisKumesi;
  /** İlçe kimliği -> ayrılmış hücre sayısı (ayrılmış STOK; günlük ilçe tavanının tabanı). Ayrılmışı olmayan ilçe yazılmaz. */
  ayrilmisIlceSayisi: Map<string, number>;
  /** Kamu arsası (`p.kamu` tanımlıysa): ilçe kimliği -> türetilmiş kamu kümesi (dünya kurulurken donduruluyor); aksi halde tanımsız. */
  kamu?: Map<string, KamuKumesi>;
  /** Ayrılmış hücrelerin satıldığı süre (ms, katılımdan itibaren). */
  ayrilmisSureMs: Ms;
  /**
   * Kamuya satış fiyat tavanının çarpanı (ppm): oyunda ulaşılabilecek EN DÜŞÜK NPC ithalat nakit çarpanı (anlaşma makası ve en iyi Ticaret ofisi
   * indirimi dahil); derleme zamanında içerik ve parametrelerden bir kez hesaplanır, oyuncu durumuna bakmaz (docs/06 §15.7).
   */
  kamuIthalatCarpaniPpm: number;
  /**
   * Yöntem indeksi -> çıktı çarpanı (ppm; `mulk.yontemGecersizKilma`, sartname §5.9). YALNIZ `ciktiPpm !== PPM` olan yöntemler tablolanır; hiç yoksa ya da blok yoksa alan
   * OLUŞMAZ (çıktı yolu atlanır). Yalnız mülk kipinde ve işletme düğümünde (`b.merkez`) uygulanır; çıktıya uygulanır, girdiye değil (G6-2).
   */
  yontemCiktiPpm?: Record<number, number>;
  /**
   * Mülk bakımı C (`mulk.bakim`, sartname §5.10): derlemede YALNIZ etkin satırlardan kurulur; hiç etkin satır yoksa ya da blok yoksa alan OLUŞMAZ (bakım yolu atlanır).
   * Yalnız mülk kipinde ve işletme düğümünde (`b.merkez`) uygulanır; bölge kipi ve bölge kipi altınları etkilenmez.
   */
  bakim?: DerlenmisMulkBakim;
  /** Şebeke tedariki (`mulk.sebeke` tanımlıysa; sartname §4.6, §5.2): derlemede kurulur, yoksa alan OLUŞMAZ (şebeke yolu atlanır). */
  sebeke?: DerlenmisSebeke;
  /** Perakende / dükkân (`mulk.perakende` tanımlıysa; sartname §4.6): `perakende/derle.ts` kurar; yoksa alan OLUŞMAZ (G7 yolları atlanır). */
  perakende?: DerlenmisPerakende;
}

/** Derlenmiş mülk bakım ayarı (`mulk.bakim`, sartname §5.10.3): her alan yalnız etkinse (kimlikten farklıysa) vardır. */
export interface DerlenmisMulkBakim {
  /** Düzey (0 asgari, 1 normal, 2 yüksek) -> günlük aşınma değişimi (ppm), `asinmaHizCarpaniPpm` uygulanmış. Yalnız çarpan !== PPM iken; `kitlikAsinmaPpmGun` ile birlikte oluşur. */
  duzeyAsinmaPpmGun?: readonly [number, number, number];
  /** `sanayi.bakim.kitlikAsinmaPpmGun` x çarpan. */
  kitlikAsinmaPpmGun?: number;
  /** Etkin çıktı kaybı tavanı; yalnız `sanayi.bakim` değerinden FARKLIYSA. */
  tavanPpm?: number;
  /** Yöntem indeksi -> bakım parçası çarpanı (ppm); YALNIZ !== PPM olan yöntemler. */
  yontemParcaPpm?: Record<number, number>;
}

/** Derlenmiş şebeke: birim fiyatlar derleme zamanında TABANDAN sabitlenir (`tabanFiyat x kamuIthalatCarpaniPpm x tavanOraniPpm`); canlı pazar fiyatı yolu YOKTUR. */
export interface DerlenmisSebeke {
  /** Elektrik kaydı (anlık denge yolu; depolanamaz) ya da tanımsız (listede yok). `birimFiyatMili`: mili-para / (mili-birim = 1000'e bölünür; bkz. `carpBol(mili, fiyat, MILI)`). */
  elektrik?: { mal: number; birimFiyatMili: number };
  /** Stoksuz tüketim anı yolu: depolanabilir mallar (mal indeksine göre sıralı). */
  stoksuz: { mal: number; birimFiyatMili: number; stokOncelikli?: boolean }[];
  /** Mal indeksi -> `stoksuz` kaydının indeksi ya da -1. */
  stoksuzIndeks: number[];
  /** Toplam bedelin ilçe kasasına giden payı (ppm). */
  kasaPayiPpm: number;
}

/** Türetilmiş (derleme zamanı) ilçe kamu kümesi: kompakt gruplar ve toplam hücre sayısı. */
export interface KamuKumesi {
  gruplar: KamuGrubuDurumu[];
  /** Toplam kamu hücresi. */
  sayi: number;
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
  birlikKapasitesi: number;
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
  /**
   * Mülk kipi şebeke (G6, sartname §5.2): kendi santralden karşılanamayan ve şebekeden teslim edilen elektrik (mili-birim/saat; kayıpsız). YALNIZ `> 0` iken yazılır
   * (şebeke bloğu yokken ve açık yokken alan hiç oluşmaz).
   */
  sebekeMili?: Mili;
}

/** Son çözümdeki gerçek sanayi yakıtı: fiziksel depo/tedarik ve şebeke payları. */
export interface YakitTedariki {
  mal: string;
  tuketimMiliSaat: Mili;
  stokMiliSaat: Mili;
  sebekeMiliSaat: Mili;
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
  /** İlk yağmada başlayan sabit pencere; yalnız mülk işletmesinde ve kullanıldığında yazılır. */
  yagmaPenceresi?: { baslangic: Ms; kullanilanPpm: number };
  savunma: SavunmaEmri;
  /** Nüfusun gıda karşılanma oranı (ppm), son çözümden */
  gidaKarsilanmaPpm: number;
  /** Ordunun ikmal karşılanma oranı (ppm), son çözümden */
  ikmalKarsilanmaPpm: number;
  /** Tarım durumu (B1). Tarım kapalıysa veya bölge tarım dışıysa TANIMSIZDIR (özet v0.2 ile birebir kalır). */
  tarim?: BolgeTarimDurumu;
  /** Elektrik dengesi (B2). Sanayi kapalıysa TANIMSIZDIR. */
  elektrik?: BolgeElektrikDurumu;
  /**
   * Mülk kipi şebeke stoksuz tedarik (G6, sartname §5.2.2b): şebekeden alınan depolanabilir malların (Alfa-0: yakıt) son çözümdeki gerçek tüketimi, MAL KİMLİĞİ -> mili-birim/saat
   * (yalnız `> 0` olanlar; hiç yoksa alan yazılmaz). Kimlik anahtarlıdır: `dunyaYenidenIndeksle` kapsamına girmez.
   */
  sebekeTuketim?: Record<string, Mili>;
  /** L2 açıkken sıfır tüketim dahil bilinen sanayi tahsisi; eski/kapalı kuralda yok. */
  yakitTedariki?: YakitTedariki;
  /** L3 son çözümde bu işletmeden sevk edilen akışların toplam hizmet bedeli; açık kuralda 0 bilinir. */
  tasimaBedeliMiliSaat?: Mili;
  /**
   * Mülk kipi yerel pazar (G7-2, sartname §6.3 g): düğümün dükkân satış isteğinin karşılanma oranı = min(frD[m]) (dükkân isteği olan mallar). YALNIZ dükkân isteği varken
   * ve `< PPM` iken yazılır (`gidaKarsilanmaPpm` örüntüsü); aksi halde alan silinir/oluşmaz. "Neden satmıyor" bilgisini panele taşır.
   */
  yerelKarsilanmaPpm?: number;
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
  /** Yalnız `tur === "dukkan"` iken (G7-2, sartname §7.1). Dükkân olmayan ek yapıda alan YASAKTIR. */
  dukkan?: DukkanDurumu;
}

/** Perakende dükkânı durumu (mülk kipi; yalnız kullanılınca yazılır). Tutar taşımaz: fiyat bir KADEME indeksidir (R x kademe çekirdekte türetilir). */
export interface DukkanDurumu {
  /** `mulk.perakende.dukkanTurleri[].id` (dize; dizi indeksi DEĞİL). */
  tur: string;
  /** 0 = S, 1 = M, 2 = L (Alfa-0'da yalnız 0). */
  olcek: 0 | 1 | 2;
  /** `MulkOyuncuDurumu.markalar` indeksi; yoksa markasız. */
  marka?: number;
  /** Uzunluk = `perakende.olcekler[olcek].rafYuvasi`; boş yuva `mal` taşımaz. */
  raf: RafYuvasi[];
  /** Kampanya sayaçları (§7.5b); yalnız bir kampanya başlatılınca yazılır. */
  kampanya?: KampanyaDurumu;
  /** Yapı komutunun verildiği an (`InsaatDurumu.baslangic`'ten kopyalanır). */
  baslangic: Ms;
  /** Tamamlanma anı (sim zamanı, ms): `ekYapiTamamla`'da `d.zaman` olarak BİR KEZ yazılır, bir daha değişmez (A2 izleme K2-8). */
  kurulus: Ms;
}

/** Kampanya penceresi sayaçları (§7.5b). */
export interface KampanyaDurumu {
  /** Sayaçların ait olduğu sim haftası (`floor(gun / 7)`). */
  hafta: number;
  /** Bu haftada en az bir kampanya saati olan gün sayısı. */
  gunSayisi: number;
  /** En son kampanya kullanılan sim günü ve o gün kullanılan saat. */
  gun: number;
  saat: number;
  /** Etkin kampanyanın bitişi (ms; tam saat sınırı). `bitis > d.zaman` iken kampanya etkindir. */
  bitis: Ms;
}

/** Dükkân raf yuvası. */
export interface RafYuvasi {
  /** Mal KİMLİĞİ (dize; `dunyaYenidenIndeksle` kapsamına girmez). Tanımsız = boş yuva. */
  mal?: string;
  /** `perakende.fiyatKademeleriPpm` indeksi (tutar DEĞİL). Boş yuvada da varsayılan değerdedir. Kampanya kademesi seçiliyse ETKİN kademe kampanya penceresine göre belirlenir. */
  fiyat: number;
  /** Son fiyat/mal DEĞİŞİMİ (ms; hız sınırı için). Yuvanın İLK doldurulması yazmaz (muaf); boşaltma SİLMEZ (fiyat -> boşalt -> doldur döngüsü sınırı atlayamaz); `fiyatT` tanımlıyken boş yuvaya doldurma da bir değişimdir. */
  fiyatT?: Ms;
  /** Kümülatif SATILAN MİKTAR (mili-birim; kayıpsız `ParaSayaci {n, a}`; para DEĞİL). İlk satış birikiminde doğar; mal değişince SIFIRLANMAZ (§7.1b). */
  satis?: ParaSayaci;
  /** Son çözümde yazılan gerçekleşen satış ORANI (mili-birim/saat; `satis`'i tembel biriktirmek için). `> 0` iken yazılır, 0 olunca alan silinir. */
  satisOran?: Mili;
}

/** Oyuncu markası (adın kanonik küçük harf biçimi saklanır; sartname §7.7). */
export interface OyuncuMarka {
  ad: string;
  simge: number;
  renk: number;
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
  /**
   * Alınmış ödül kavramları (docs/06 §15.7; `sistem_odul`): kimliğe göre sıralı, tekil. "Kavram başına bir kez" kuralı ve ödül tavanı bundan
   * hesaplanır. Yalnız bir ödül alınınca yazılır (eski anlık görüntüler ve ödülsüz dünyalar etkilenmez).
   */
  alinanOdul?: string[];
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
  /**
   * Ölçek yükseltmesinde hedef kademe (1 = M, 2 = L); mülk kipinde M/L DOĞRUDAN KURULAN `tesis` inşaatında da bu kademe (tamamlanınca `TesisDurumu.olcek`).
   * S kurulumda ve diğer türlerde tanımsızdır.
   */
  olcek?: 1 | 2;
  /**
   * Mülk kipi (S3): hücreli inşaatın hücreleri (sıralı). Aşama `(şimdi − baslangic) / (bitis − baslangic)`'tan türetilir.
   * `olcek` türünde (yerinde yükseltme, docs/06 §15.10) yalnız yükseltmeyle EKLENECEK hücrelerdir (boş olabilir); tamamlanınca tesisin `hucreler`ine katılır.
   */
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
  /**
   * Mülk kipi (G6; sartname §5.8): tesis inşasında seçilen yöntemin KİMLİĞİ (dize; indeks değil: `dunyaYenidenIndeksle` kapsamına girmez). Yalnız komutta `yontem` verilince
   * yazılır; yoksa tür varsayılanı (`yontemler[0]`) ile kurulur. Tamamlanınca tesis bu yöntemle başlar.
   */
  yontem?: string;
  /**
   * Mülk kipi perakende (G7; sartname §7.2): `ekYapi === "dukkan"` inşaatında seçilen dükkân türünün KİMLİĞİ (`mulk.perakende.dukkanTurleri[].id`; dize). Tamamlanınca `DukkanDurumu.tur` olur.
   * Yalnız dükkân inşaatında yazılır (komut yolu G7-3).
   */
  dukkanTuru?: string;
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
  /** L3 gerçek sevk hizmet bedeli; çözüm fiyatı/rotasıyla sabitlenmiş, açık kuralda 0 dahil. */
  tasimaBedeliMiliSaat?: Mili;
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
  tasima_hazine_esik: 2,
  insaat_bitti: 3,
  parti_bitti: 3,
  arastirma_bitti: 3,
  savas_pencere_ac: 4,
  savas_pencere_kapa: 4,
  eskiya_duyuru: 4,
  eskiya_pencere_ac: 4,
  eskiya_pencere_kapa: 4,
  eskiya_toparlanma: 3,
  eskiya_gunluk: 5,
  saatlik_tik: 5,
  iklim_gunluk: 5,
  sondaj_bitti: 3,
  cozum: 9,
} as const;

export type OlayVerisi =
  | { tur: "eskiya_gunluk" }
  | { tur: "eskiya_duyuru"; baskin: number }
  | { tur: "eskiya_pencere_ac"; baskin: number }
  | { tur: "eskiya_pencere_kapa"; baskin: number }
  | { tur: "eskiya_toparlanma"; baskin: number }
  | { tur: "oran_delta"; bolge: number; mal: number; delta: Mili }
  | { tur: "esik"; bolge: number; mal: number; surum: number }
  | { tur: "tasima_hazine_esik"; oyuncu: OyuncuId; surum: number }
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
  /** PvE kayıtları yalnız özellik açıldığında doğar; sonuçlar yeniden ödeme kaynağı değildir. */
  baskinlar?: BaskinDurumu[];
  eskiyaTakvim?: { sonGun: number; etkin: boolean };
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

export interface EskiyaGenelGorunumu {
  id: number;
  il: string;
  ilce: string;
  evre: "duyuru" | "pencere" | "bitti" | "iptal";
  duyuruZamani: Ms;
  pencereBaslangic: Ms;
  pencereBitis: Ms;
  tahminAltGuc: number;
  tahminUstGuc: number;
  sonuc?: { kazandi: boolean; baskinGucu: number; savunmaGucu: number };
}

export interface EskiyaOyuncuSonucu {
  baskin: number;
  il: string;
  ilce: string;
  dugum: string;
  zaman: Ms;
  kazandi: boolean;
  katkiGuc: number;
  birlikKaybi: [birlik: string, adet: number][];
  malKaybi: [mal: string, miktarMili: Mili][];
  ganimet: [mal: string, miktarMili: Mili][];
  ganimetTasma: [mal: string, miktarMili: Mili][];
  onarim: [tesis: number, bitis: Ms][];
}

export interface EskiyaRevirGorunumu {
  baskin: number;
  dugum: string;
  donusZamani: Ms;
  birlikler: [birlik: string, adet: number][];
  evre: "bekliyor" | "dondu" | "iptal";
}

export interface EskiyaIlceGorunumu { etkin: boolean; olaylar: EskiyaGenelGorunumu[] }
export interface EskiyaOyuncuGorunumu extends EskiyaIlceGorunumu { sonuclar: EskiyaOyuncuSonucu[]; revir: EskiyaRevirGorunumu[] }

export interface BaskinDurumu {
  id: number;
  il: string;
  ilce: string;
  boy: number;
  gb: number;
  bant: number;
  duyuruZamani: Ms;
  pencereBaslangic: Ms;
  pencereBitis: Ms;
  tahminAltGuc: number;
  tahminUstGuc: number;
  evre: "planli" | "duyuru" | "pencere" | "bitti" | "iptal";
  /** Duyuru öncesi iptal edilen plan sonraki karelerde de gizli kalır. */
  duyuruldu: boolean;
  katilimcilar: { oyuncu: string; dugum: string; guc: number; birlikler: [string, number][] }[];
  hedefler: { oyuncu: string; dugum: string; payPpm: number; tesisler: [number, number][] }[];
  sonuc: null | {
    kazandi: boolean;
    baskinGucu: number;
    savunmaGucu: number;
    kamuGucu: number;
    /** Verildiği andaki taban fiyatlarla gerçek ganimet değeri; hafta bütçesi tekrar fiyatlanmaz. */
    ganimetDegeriMili: Mili;
    oyuncular: { oyuncu: string; kayit: EskiyaOyuncuSonucu; revir?: EskiyaRevirGorunumu }[];
  };
}

// ---------------------------------------------------------------------------
// Komutlar (olay kaynaklı günlük: aynı tohum + aynı günlük = aynı dünya)
// ---------------------------------------------------------------------------

export type Komut =
  // Ekonomi
  | { tur: "tesis_insa"; bolge: string; tesisTuru: string }
  | { tur: "yontem_degistir"; bolge: string; tesis: number; yontem: string; oncekiYontem?: string }
  | { tur: "tesis_durum"; bolge: string; tesis: number; aktif: boolean }
  | { tur: "ticaret_emri"; bolge: string; mal: string; yon: TicaretYonu; oranSaat: Mili }
  | { tur: "vergi_ayarla"; oranPpm: number }
  | { tur: "meclis_katil"; ilce: string; oncekiIlce: string | null }
  | { tur: "kamu_teslim"; siparis: string; bolge: string; bedelMili: number; teslimSirasi: number }
  // Tarım (B1)
  | { tur: "ekim_plani"; bolge: string; ekimPpm: number[] }
  | { tur: "gubre_dozu"; bolge: string; doz: number }
  // Sanayi (B2)
  // Mülk kipinde (docs/06 §15.10) ayak izi büyür: `ekHucreler` yükseltmenin gerektirdiği EK bitişik hücrelerdir (oyuncunun boş hücresi ya da sahipsiz hücre:
  // sahipsizler `sinif` sınıfında atomik satın alınır); bölge kipinde ikisi de verilemez.
  | { tur: "tesis_olcek_yukselt"; bolge: string; tesis: number; olcek: 1 | 2; ekHucreler?: HucreId[]; sinif?: ArsaSinifi }
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
  | { tur: "arastir"; teknoloji: string; maliyetMili?: Mili }
  // Politika
  | { tur: "anlasma_teklif"; karsi: OyuncuId; anlasma: AnlasmaTuru }
  | { tur: "anlasma_feshet"; karsi: OyuncuId; anlasma: AnlasmaTuru }
  | { tur: "yaptirim"; hedef: OyuncuId; aktif: boolean }
  // Sistem (oyuncu kaydı; oyuncu kimliği "sistem" ile verilir). Mülk kipinde `bolgeler` boş olmalıdır.
  // Mülk kipinde `ilce` (isteğe bağlı): bedava yurdun verileceği ilçe; yoksa doluluğu en düşük uygun ilçe seçilir.
  | { tur: "oyuncu_katil"; oyuncu: OyuncuId; bolgeler: string[]; ilce?: string }
  // Ödül (para güvenliği, docs/06 §15.7): TUTAR TAŞIMAZ; tutar, mal, tavan ve "bir kez" kuralı çekirdek ödül tablosundan (`param.odul`). Yalnız "sistem".
  | { tur: "sistem_odul"; oyuncu: OyuncuId; kavram: string }
  // Marka sıfırlama (moderasyon; G7, sartname §9.1): adı sabit yer tutucuya çevirir. Yalnız "sistem"; tutar taşımaz.
  | { tur: "marka_sifirla"; oyuncu: OyuncuId; marka: number }
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
  /** Lojistiği kirli işaretle; `aninda` yakıt sınırı gibi kesin olaylarda çözüm gecikmesini kaldırır. */
  kirlet(d: Dunya, aninda?: boolean): void;
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
  /**
   * `satilmisHucre`nin, AYRILMIŞ hücre olarak (taban fiyatla, satış payı çarpanından muaf) satılan kısmı. Fiyat çarpanı
   * `satilmisHucre − ayrilmisSatilmis`'a bağlıdır (docs/06 §15.7). Yalnız > 0 iken yazılır.
   */
  ayrilmisSatilmis?: number;
  /**
   * İlçe başına GÜNLÜK ayrılmış satış sayacı (docs/06 §15.1): `gun` = sim günü (`floor(zaman / GUN)`), `adet` o gün satılan ayrılmış hücre; gün
   * dönünce sıfırlanır (bir sonraki ayrılmış satışta `{ gun, adet }` yeniden yazılır). Yalnız `mulk.yeniOyuncu.ayrilmisIlceGunlukPpm` açıkken ve
   * ayrılmış satış olunca yazılır.
   */
  ayrilmisGunluk?: { gun: number; adet: number };
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
  /** Tek siyasi ilçe ve başarılı komut günleri; oy/makam/kasa yetkisi değildir. */
  meclis?: MeclisKatilimi;
  /** İlk-yapı indirimiyle başlatılmış (ve iptal edilmemiş) yapı sayısı; yalnız >0 iken yazılır. */
  indirimliYapi?: number;
  /** Para defteri (docs/06 §15.7): son lojistik çözümde yazılan saatlik para akışları. `mulk.para` açıkken ilk çözümde oluşur. */
  paraAkisi?: ParaAkisi;
  /** Sahip olunan AYRILMIŞ hücre sayısı (yurt dahil; hesap başına sınır `yeniOyuncu.ayrilmisHucreHesapTavani`); yalnız > 0 iken yazılır. */
  ayrilmisHucre?: number;
  /**
   * KATILIM ilçesi (docs/06 §15.1): yurt ilçesi; yurtsuz katılımda `oyuncu_katil.ilce`. Yalnız `mulk.yeniOyuncu.ayrilmisYalnizKatilimIlcesi` açıkken ve
   * ilçe belirlenebildiğinde yazılır (ayrılmış hücre yalnız burada satılır).
   */
  katilimIlcesi?: string;
  /** Oyuncu markaları (G7; en çok `perakende.marka.hesapBasinaEnFazla`); ilk marka tanımlanınca yazılır. */
  markalar?: OyuncuMarka[];
  /** Kümülatif NPC dükkân geliri (mili-₺; kayıpsız sayaç); ilk gelirde yazılır (`musluk.yerelNpc` ile aynı oran ve süre). */
  dukkanGeliri?: ParaSayaci;
  /** Yerel satış oranının ilk kez > 0 olduğu an (`paraAkisiYaz`: `akis.yerel > 0` iken `??= d.zaman`); A0-11 "ilk satış" zamanı. */
  ilkSatisT?: Ms;
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
  /**
   * Kamu arsası (docs/06 §15.6): her ilçenin DONDURULMUŞ kamu kümesi (ilçe kimliğine göre sıralı; fikstürün her ilçesi için bir kayıt).
   * Dünya kurulurken `mulk.kamu` parametresiyle bir kez hesaplanır ve sonra DEĞİŞMEZ (parametre değişse de kayma olmaz).
   * Kamu hücreleri hiçbir zaman `hucreler`e girmez (satılmaz). `mulk.kamu` parametresi olmadan kurulmuş dünyada TANIMSIZDIR
   * (kural kapalı; özet eskisiyle aynı).
   */
  kamu?: KamuIlceDurumu[];
  /** Kamu kümesini dondururken kullanılan parametreler (`mulk.kamu`; denetim için; değişmez). `kamu` ile birlikte yazılır. */
  kamuParametre?: MulkKamuParametreleri;
  /** Kamu kümesini üreten algoritmanın sürümü (şimdi 1). `kamu` ile birlikte yazılır. */
  kamuSurumu?: number;
  /**
   * Para defteri ve kamu kasaları (docs/06 §15.7). `mulk.kasa` parametresiyle kurulan dünyada vardır; yoksa TANIMSIZDIR (eski dünyalar ve
   * mülksüz kip özeti eskisiyle aynı).
   */
  para?: ParaDurumu;
  /** İlçe başına güncel/son bütçeli gıda siparişi; kural kapalı eski dünyada yoktur. */
  kamuSiparis?: KamuSiparisDurumu;
}

// ---------------------------------------------------------------------------
// Para güvenliği (docs/06 §15.7): musluk ve lavabo sayaçları, kamu kasaları
// ---------------------------------------------------------------------------

/**
 * Kayıpsız birikimli tamsayı sayaç: gerçek değer = `n + a / SAAT` (mili-para); `a` ∈ [0, SAAT) saatlik oranların ms ile çarpımından kalan
 * kesir (mili-para × ms). Anlık (komut kaynaklı) kalemler `n`'ye tamsayı eklenir. Böylece tembel (oranlı) akışlar da KESİN toplanır ve para
 * korunumu eşitliği tamsayıda (SAAT ile ölçeklenmiş) tam tutar.
 */
export interface ParaSayaci {
  n: Mili;
  a: number;
}

/** Para MUSLUKLARI (oyunculara giren yeni para): hibe, ödül, iade (önceden yanan paranın geri verilmesi), NPC ihracat ödemeleri, nüfus vergisi geliri, kelepçe (silinen borç), diğer. */
export type MuslukKalemi = "hibe" | "odul" | "iade" | "ihracatNpc" | "nufusGeliri" | "borcSilme" | "diger";
export const MUSLUK_KALEMLERI: readonly MuslukKalemi[] = ["borcSilme", "diger", "hibe", "ihracatNpc", "iade", "nufusGeliri", "odul"];

/**
 * İsteğe bağlı musluk kalemi (G7-2; sartname §12.1): NPC hane talebinin (yerel pazar) dükkân gelirleri. Tembel: kalem YALNIZ ilk yerel gelir birikiminde doğar (`paraDurumuKur`
 * yaratmaz; zorunlu `MUSLUK_KALEMLERI` değişmez, böylece mevcut mülk dünyalarının özeti ve eski görüntüler aynı kalır).
 */
export const MUSLUK_ISTEGE_BAGLI: readonly "yerelNpc"[] = ["yerelNpc"];

/** Para LAVABOLARI (yanan para): arsa alımı, yapı/üretim harcaması, araştırma, NPC ithalat tahsilatı (kasa payı hariç), işletme gideri ve birlik maaşı, arazi vergisinin yanan kısmı, kasanın NPC'ye harcaması. */
export type LavaboKalemi = "arsa" | "harcama" | "arastirma" | "ithalatNpc" | "isletme" | "araziVergisi" | "kamuNpc";
export const LAVABO_KALEMLERI: readonly LavaboKalemi[] = ["araziVergisi", "arastirma", "arsa", "harcama", "isletme", "ithalatNpc", "kamuNpc"];

/**
 * İsteğe bağlı lavabo kalemi (G6; sartname §5.2.5, §11.1): şebeke bedelinin kasa payı dışında kalan (yanan) kısmı. Tembel: kalem YALNIZ ilk birikimde doğar (`paraDurumuKur`
 * yaratmaz; zorunlu `LAVABO_KALEMLERI` değişmez, böylece mevcut mülk dünyalarının özeti ve eski görüntüler aynı kalır).
 */
export const LAVABO_ISTEGE_BAGLI: readonly ("sebeke" | "tasima")[] = ["sebeke", "tasima"];

/** Kasa girişi kalemleri (§4.1): arazi vergisi payı, ithalat makası payı, ithalat komisyonu payı. İHRACAT kaynağı YOKTUR. */
export type KasaGirisZorunluKalemi = "vergi" | "ithalatMakas" | "ithalatKomisyon";
export const KASA_GIRIS_KALEMLERI: readonly KasaGirisZorunluKalemi[] = ["ithalatKomisyon", "ithalatMakas", "vergi"];
/** İsteğe bağlı kasa girişi kalemi (G6): şebeke bedelinin ilçe kasasına giden payı (`mulk.sebeke.kasaPayiPpm`); tembel (ilk birikimde doğar). */
export const KASA_GIRIS_ISTEGE_BAGLI: readonly "sebeke"[] = ["sebeke"];
export type KasaGirisKalemi = KasaGirisZorunluKalemi | "sebeke";

/** Para defteri: kalem bazında kümülatif sayaçlar (açık defter; kayıt kayıt değil) ve kasalar. */
export interface ParaDurumu {
  surum: 1;
  musluk: Record<MuslukKalemi, ParaSayaci> & { yerelNpc?: ParaSayaci };
  lavabo: Record<LavaboKalemi, ParaSayaci> & { sebeke?: ParaSayaci; tasima?: ParaSayaci };
  /** Sahip kimliğine göre sıralı; ilk gelire kadar yazılmaz. */
  kasalar: KasaDurumu[];
}

/** Kamu kasası (`k:mahalle:*`, `k:ilce:*`, `k:il:*`; Y-39: Muhtar, İlçe Başkanı, Vali; yöneticisiz hâlde NPC Kaymakam). */
export interface KasaDurumu {
  sahip: string;
  giris: Record<KasaGirisZorunluKalemi, ParaSayaci> & { sebeke?: ParaSayaci };
  /** Kümülatif çıkış (mili-para): oyuncuya ve NPC'ye. */
  cikisOyuncu: Mili;
  cikisNpc: Mili;
  /** Ödenek rezervi (bloke; henüz ödenmemiş): oyuncuya ve NPC'ye. */
  rezervOyuncu: Mili;
  rezervNpc: Mili;
  /** Kayan pencere günleri (gün sırasıyla, en çok `pencereGun` gün): o gün girişi, oyuncuya ve NPC'ye ÖDENEN. */
  gunler: KasaGunu[];
}

export interface KasaGunu {
  gun: number;
  giris: Mili;
  oyuncu: Mili;
  npc: Mili;
}

/** Oyuncunun son lojistik çözümde yazılan saatlik para akışları (mili-para/saat); tembel birikim `t0`'dan beri işlenmemiştir. */
export interface ParaAkisi {
  t0: Ms;
  /** NPC ihracat nakit geliri (musluk) ve nüfus vergisi geliri (musluk). */
  ihracat: Mili;
  nufus: Mili;
  /** NPC ithalat nakit gideri (lavabo; kasa payı dahil) ve işletme gideri + birlik maaşı (lavabo). */
  ithalat: Mili;
  isletme: Mili;
  /** Arazi vergisi (lavabo; kasa payı dahil). */
  vergi: Mili;
  /** Şebeke bedeli (G6; lavabo + kasa payı): YALNIZ `> 0` iken yazılır (alan yoksa şebeke yok). */
  sebeke?: Mili;
  /** L3 taşıyıcı hizmeti (lavabo, kasa payı yok); yalnız >0 iken yazılır. */
  tasima?: Mili;
  /** Yerel pazar (dükkân) satış geliri (G7-2; musluk `yerelNpc`): YALNIZ `> 0` iken yazılır (alan yoksa yerel satış yok). */
  yerel?: Mili;
  /** Kasalara giden paylar (sahip, kalem sırasıyla): ithalat ve vergi içindeki payı; kalanı yanar. */
  kasa: { sahip: string; kalem: KasaGirisKalemi; oran: Mili }[];
}

/** Kamu NPC alıcısı görünümü (kasa kaynaklı; sipariş kancaları için). */
export interface NpcAlici {
  tur: "kamu";
  /** Kaynak kasa (sahip kimliği). */
  kaynak: string;
  /** Haftalık bütçe (mili-para): pencere girişinin haftalık payı. */
  haftalikButce: Mili;
  /** Son 7 günde harcanan + bekleyen rezerv. */
  haftalikKullanilan: Mili;
  /** Kullanılabilir bakiye (giriş − çıkış − rezerv). */
  bakiye: Mili;
  /** Pencere (gün) toplamları: giriş, oyuncuya ve NPC'ye ödenen. */
  pencereGiris: Mili;
  pencereOyuncu: Mili;
  pencereNpc: Mili;
}

/** Kamu sahibi kimliği önekleri: `k:mahalle:<id>`, `k:ilce:<id>`, `k:il:<id>`; oyuncu kimlikleri `k:` ile başlayamaz. */
export const KAMU_SAHIP_ONEKI = "k:";

/** Kamu türü (docs/06 §15.6): tür kodları veridir. */
export type KamuTuru = "meydan" | "pazar" | "park" | "hizmet" | "kiyi" | "sanayi_rezervi" | "hazine";

/** Bir ilçenin dondurulmuş kamu kümesi (dünya durumu; kompakt, kanonik). */
export interface KamuIlceDurumu {
  ilce: string;
  /** (sahip, tür) sırasıyla (JS dize sırası), tekil çift. Kamusuz ilçede boş. */
  gruplar: KamuGrubuDurumu[];
}

/**
 * Aynı sahibe ve türe ait kamu hücreleri, DİKDÖRTGEN blok listesi olarak saklanır: `dikdortgenler` düz dörtlü listesidir
 * `[x0, y0, x1, y1, x0, y0, x1, y1, ...]` (kapsayıcı köşeler; satırlarda x0 ≤ x1, y0 ≤ y1). Dikdörtgenler YALNIZ UYGUN kamu hücrelerini
 * içerir (yol, su gibi uygunsuz hücre bloğun içine girmez; blok sayısı hücre sayısıyla değil geometriyle ölçeklenir). Kanonik: (y0, x0)
 * ile kesin artan; gruplar içinde ve arasında ayrık. Kodlayıcının kuralı: ızgara satır satır taranır, aynı (sahip, tür) ve aynı [x0, x1]
 * aralıklı ardışık satırlar tek dikdörtgende birleştirilir. Okuma API'si (`kamuHucreleri`, `kamuBilgisi`, `kamuHucreMi`,
 * `kamuBloklari`) kodlamayı gizler; tüketiciler bu alana bağlanmamalıdır.
 */
export interface KamuGrubuDurumu {
  /** `k:mahalle:<id>` (meydan, pazar, park) ya da `k:ilce:<id>` (ilçe merkezi, kıyı, hazine); ileride `k:il:<id>`. */
  sahip: string;
  tur: KamuTuru;
  dikdortgenler: number[];
}

/** Okuma API'si: bir kamu bloğu (kapsayıcı dikdörtgen; yalnız uygun hücreleri kapsar). */
export interface KamuBlok {
  sahip: string;
  tur: KamuTuru;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Okuma API'sinin döndürdüğü açık biçim: aynı sahip ve türdeki hücre kimlikleri (JS dize sırasıyla sıralı). */
export interface KamuGrubu {
  sahip: string;
  tur: KamuTuru;
  hucreler: HucreId[];
}

/** Tesisin kapladığı hücreler (1–3). */
export interface TesisMulkAlanlari {
  hucreler?: HucreId[];
}

/** Mülk komutları. Coğrafi geçerliliği (hücre ilçede mi, uygun mu) sunucu doğrular; çekirdek fikstürdeki listeyi de denetler. */
export type MulkKomutu =
  | { tur: "parsel_al"; ilce: string; hucreler: HucreId[]; sinif: ArsaSinifi }
  // `olcek` (0 = S, 1 = M, 2 = L; yoksa S): `hucreler` o ölçeğin ayak izidir (`mulk.olcekHucre`), en çok 5 hücre (docs/06 §15.10).
  // `yontem` (isteğe bağlı yöntem kimliği; sartname §5.8): yalnız TESİS türü inşasında; `yontem_degistir` ile aynı denetimler ve iletiler; inşa bitince tesis o yöntemle başlar.
  | { tur: "tesis_insa_hucre"; ilce: string; tesisTuru: string; hucreler: HucreId[]; olcek?: 0 | 1 | 2; dukkanTuru?: string; yontem?: string }
  | { tur: "insaat_iptal"; insaat: number }
  // Atomik "yapı önce yerleşim": `hucreler` yapının TÜM hücreleri (kenar-bitişik, yuva sayısınca); oyuncunun olmayan (sahipsiz) hücreler
  // `sinif` sınıfında satın alınır ve inşaat başlar; herhangi bir denetim başarısızsa hiçbir şey değişmez. İsteğe bağlı `siniflar`
  // (`hucreler` ile aynı uzunluk) verilirse her hücre kendi sınıfında denetlenir ve fiyatlanır (iki sınıfa düşen yapı tek komutta alınır).
  | { tur: "yapi_yerlestir"; ilce: string; tesisTuru: string; hucreler: HucreId[]; sinif: ArsaSinifi; siniflar?: ArsaSinifi[]; olcek?: 0 | 1 | 2; dukkanTuru?: string; yontem?: string }
  // Üzerinde yapı/inşaat olmayan kendi hücrelerini bırakır; hücre bedelinin `parselBirakIadePpm`'i (%70) iade edilir.
  | { tur: "parsel_birak"; ilce: string; hucreler: HucreId[] }
  // Perakende / dükkân (G7; sartname §9.1): TUTAR, MİKTAR, ORAN, ADET alanı YOKTUR (`fiyat` bir KADEME indeksidir: secim). `dukkan` = `EkYapiDurumu.id`. Çekirdek yolu G7-3'tedir.
  | { tur: "dukkan_raf"; dukkan: number; yuva: number; mal: string | null }
  | { tur: "dukkan_fiyat"; dukkan: number; yuva: number; fiyat: number }
  | { tur: "marka_tanimla"; marka: number; ad: string; simge: number; renk: number }
  | { tur: "dukkan_marka"; dukkan: number; marka: number }
  | { tur: "dukkan_yik"; dukkan: number };

/** Kamu gıda siparişinin dondurulmuş koşulları ve kendi ödenek defteri. */
export type KamuSiparisEvre = "acik" | "tamamlandi" | "suresi_doldu" | "iptal";
export interface KamuSiparisi {
  id: string;
  ilce: string;
  mal: string;
  paketMili: number;
  hedefPaket: number;
  kalanPaket: number;
  teslimSirasi: number;
  ilanBirimFiyatMili: number;
  ilanPaketBedeliMili: number;
  fiyatPpm: number;
  acilisZamani: number;
  bitis: number;
  tekrarMs: number;
  kapanisZamani?: number;
  durum: KamuSiparisEvre;
  rezervMili: number;
  odenenMili: number;
  serbestMili: number;
}
export interface KamuSiparisIlcesi {
  ilce: string;
  siparis: KamuSiparisi;
  toplamTeslimMili: number;
  toplamOdemeMili: number;
}
export interface KamuSiparisDurumu {
  sonDenemeSaati: number;
  ilceler: KamuSiparisIlcesi[];
}
export interface KamuSiparisGorunumu {
  id: string;
  ilce: string;
  mal: string;
  paketMili: number;
  hedefPaket: number;
  kalanPaket: number;
  teslimSirasi: number;
  ilanBirimFiyatMili: number;
  ilanPaketBedeliMili: number;
  guncelPaketBedeliMili: number;
  acilisZamani: number;
  bitis: number;
  kapanisZamani?: number;
  durum: KamuSiparisEvre;
  rezervMili: number;
  odenenMili: number;
  serbestMili: number;
}
export interface IlceKamuSiparisGorunumu {
  etkin: boolean;
  siparis?: KamuSiparisGorunumu;
  toplamTeslimMili: number;
  toplamOdemeMili: number;
}
export interface KamuTeslimGorunumu {
  siparis: string;
  bolge: string;
  stokMili: number;
  paketMili: number;
  bedelMili: number;
  teslimSirasi: number;
  uygun: boolean;
  engel?: string;
}

export interface MeclisKatilimi {
  ilce: string;
  kayitZamani: Ms;
  /** Artan, eşsiz, en fazla yedi simülasyon günü; yalnız başarılı oyuncu komutuyla yazılır. */
  etkinGunler: number[];
}
export interface MeclisGorunumu {
  ilce: string;
  kayitliIlce?: string;
  kayitZamani?: Ms;
  etkinGunSayisi: number;
  gerekliGun: 3;
  pencereGun: 7;
  kayitliIlcedeArsa: boolean;
  buIlcedeArsa: boolean;
  katilimKosulu: boolean;
  kayitUygun: boolean;
  engel?: string;
}

/** Genel fiziksel kenar ve yalnız sahibinin son plandaki bütün mal/iki yön yükü. */
export interface LojistikKenarGorunumu {
  indeks: number;
  a: string;
  b: string;
  tur: KenarTuru;
  sureMs: Ms;
  kapasiteMiliSaat: Mili;
  kendiYukMiliSaat: Mili;
}
/** Saf sahip toplamı; akış indeksleri yalnız core snapshot eşleşmesidir, wire'a çıkmaz. */
export interface LojistikYolGorunumu {
  guncellemeBekliyor: boolean;
  akislar: { indeks: number; yol?: number[] }[];
  kenarlar: LojistikKenarGorunumu[];
}

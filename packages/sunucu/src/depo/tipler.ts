/**
 * Kalıcılık bağdaştırıcı arayüzleri: yalnız eklenen komut günlüğü + periyodik anlık görüntü (docs/11 §10).
 *
 * Günlük imleci `seq`'tir (t değil): aynı sim anında birden çok komut olabilir; `seq` uygulama sırasının tek tam
 * sıralamasıdır, boşluksuz ve 1'den başlayarak artar. Uygulamalar `ekle`'yi ancak kayıtlar KALICI olduğunda
 * (dosyada fsync, Postgres'te commit) çözmelidir: sunucu onayı ve yayını bundan sonra yapar.
 */
import type { Komut, Ms, OyuncuId } from "@bolge/cekirdek";

/** Günlük kaydı biçim sürümü (komut şeması değişirse artar; eski kayıtlar için yükseltici gerekir). */
export const SEMA_SURUMU = 1;

export interface GunlukKaydi {
  /** 1'den başlayan, boşluksuz artan sıra numarası. */
  seq: number;
  /** Sunucunun bastığı sim zamanı (ms). */
  t: Ms;
  /** Token'dan çözülen oyuncu (yönetici komutlarında "sistem"). */
  oyuncu: OyuncuId;
  komut: Komut;
  /** İdempotans kapsamı: istemci kimliği + anahtar (bot ve sistem komutlarında sunucu üretir). */
  istemci: string;
  anahtar: string;
  kuralSurumu: string;
  semaSurumu: number;
}

/** Sunucunun anlık görüntüye eklediği üst veri (çekirdek zarfının dışında). */
export interface GoruntuEki {
  /** Dünyanın oluşturulduğu tohum (yalnız bilgi; dünya zaten PRNG durumunu taşır). */
  tohum: number;
  /**
   * Dünyanın duvar saati epoch'u (epoch ms; bir Türkiye gece yarısı): mutlak saatte `t = duvar − dunyaEpochMs`.
   * Dünyayla birlikte saklanır; yoksa (eski görüntü ya da elle saatle kurulmuş dünya) ilk mutlak saatli açılışta
   * "şimdi = dünyanın şimdiki zamanı" olacak biçimde bağlanır ve hemen yeni görüntüye yazılır.
   */
  dunyaEpochMs?: number;
  /** İdempotans tablosunun bu görüntüdeki kopyası (seq ≤ görüntü seq'i olan girdiler). */
  idempotans: IdempotansGirdisi[];
}

export interface IdempotansGirdisi {
  /** Kapsam: (oyuncu, istemci, anahtar). Ayrı alanlar: jsonb `\u0000` taşıyamaz, birleşik dize ayırıcı sorunu doğurur. */
  oyuncu: OyuncuId;
  istemci: string;
  anahtar: string;
  seq: number;
  t: Ms;
  komut: Komut;
  tamam: boolean;
  hata?: string;
}

export interface AnlikGoruntuKaydi {
  /** Görüntüye dahil son günlük kaydının seq'i (0 = hiç komut yok). */
  seq: number;
  simZamani: Ms;
  kuralSurumu: string;
  semaSurumu: number;
  durumOzeti: string;
  /** `anlikGoruntuOlustur` çıktısı (kanonik JSON zarf). */
  metin: string;
  ek: GoruntuEki;
  /**
   * İsteğe bağlı: `metin`in gzip'i (görüntü işçisi ana döngüyü tutmadan üretir). Yalnız deponun `sikistirma = "gzip"` demesi
   * halinde yazar doldurur; depo yoksa kendisi sıkıştırır. `sonuncu()` bu alanı DÖNDÜRMEZ.
   */
  gzip?: Uint8Array;
}

export interface GunlukDeposu {
  /** Kayıtları sırayla ve kalıcı olarak ekler (toplu commit). seq sürekliliğini bozan ekleme reddedilir. */
  ekle(toplu: readonly GunlukKaydi[]): Promise<void>;
  /** `seq > seqSonrasi` olan kayıtlar, seq sırasıyla; `enCok` verilirse yalnız ilk `enCok` kayıt (büyük günlüğü parça parça okumak için: `--dok`). */
  oku(seqSonrasi: number, enCok?: number): Promise<GunlukKaydi[]>;
  kapat(): Promise<void>;
}

export interface GoruntuDeposu {
  /** Depo görüntü gövdesini gzip ile saklıyorsa "gzip": yazar sıkıştırmayı işçide yapıp `AnlikGoruntuKaydi.gzip` ile verir. */
  readonly sikistirma?: "gzip";
  kaydet(g: AnlikGoruntuKaydi): Promise<void>;
  /** En büyük seq'li (eşitlikte en son kaydedilen) geçerli görüntü; yoksa null. */
  sonuncu(): Promise<AnlikGoruntuKaydi | null>;
  /**
   * İsteğe bağlı (içerik göçü için ZORUNLU): `g` görüntüsünü (şu an `sonuncu()`) `etiket` adıyla AYRI ve KALICI bir yere
   * kopyalar (fsync); üzerine yazılmaz, `sonuncu()`a girmez, saklama sınırından etkilenmez. Göç yeni görüntüyü eskisiyle AYNI
   * seq ve sim zamanında yazar; yedek alınmadan üzerine yazılmaz. Dönen dize yedeğin yeri/etiketidir. Başarısızsa fırlatır.
   */
  yedekle?(g: AnlikGoruntuKaydi, etiket: string): Promise<string>;
  kapat(): Promise<void>;
}

/**
 * Oyuncunun çıkış çapası ("sen yokken" net sonuç kıyası, docs/arastirma/donus-deneyimi.md §5.1): hazine, ticaret defteri kümülatif
 * toplamları, stok ve üretim kümülatif özeti. Hepsi ham çekirdek birimi tamsayılarıdır (mili-para / mili-birim); mal kimliğine
 * göre anahtarlıdır (içerik göçünde indeks kaymasından etkilenmez).
 */
export interface SonGorulen {
  /** Çapanın alındığı sim zamanı. */
  t: Ms;
  hazine: number;
  /** Ticaret defteri kümülatif toplamları (şimdilik ihracat, ithalat, komisyon, liman primi). */
  defter: { brutIhracat: number; brutIthalat: number; komisyon: number; prim: number };
  /** Mal kimliği -> oyuncunun bölgelerindeki stok toplamı. */
  stok: Record<string, number>;
  /** Mal kimliği -> oyuncunun bölgelerindeki kümülatif üretim. */
  uretim: Record<string, number>;
}

/** Oyuncu profil çapaları: ikisi de çekirdek dışıdır (çekirdek durumuna, `durumOzeti`ne girmez). */
export interface Capa {
  sonGorulen?: SonGorulen;
  /** Özetin gösterildiği/onaylandığı an (sim ms). */
  ozetOkunduT?: Ms;
}

/**
 * Oyuncu özet kaydı (D3): yalnız OLGU tutar (KVKK: ad ya da metin yok). `t` = olayın sim zamanı (yazılma zamanı değil).
 * İdempotans anahtarı `(oyuncu, tur, t, sira)`: `sira` varlık sırasıdır (ör. inşaat kimliği); adım taneciğine ve günlük
 * seq'ine bağlı değildir, bu yüzden canlı koşu, yetişme ve kurtarma yeniden oynatması aynı kaydı aynı anahtarla üretir.
 */
export interface OzetKaydi {
  t: Ms;
  tur: "insaat_bitti" | "siparis_geldi" | "satis_toplami";
  /** İlçe (mülk kipi) ya da bölge kimliği; yoksa "". */
  ilce: string;
  degerler: (string | number)[];
  /** Eylemi yapan taraf için gizlenmiş başvuru (şimdilik kullanılmaz; ad ASLA yazılmaz). */
  aktorRef?: string;
  sira: number;
}

/**
 * Esnaf Defteri damgası: oyuncunun bir kavramı ilk kez kazandığı an. Yalnız OLGU (kavram, sim zamanı, kaynak); metin YOKTUR (KVKK).
 * `kaynak`: "odul" = çekirdek `sistem_odul` komutu uygulandı (para/mal ödülü; tutar çekirdek tablosundadır, burada yazılmaz);
 * "damga" = para/mal taşımayan bilgi/kozmetik kavram (yalnız profilde). Anahtar `(oyuncu, kavram)`: ilk yazım kazanır (idempotans).
 */
export interface Damga {
  kavram: string;
  t: Ms;
  kaynak: "odul" | "damga";
}

export function damgaSirasi(a: Damga, b: Damga): number {
  return a.t - b.t || (a.kavram < b.kavram ? -1 : a.kavram > b.kavram ? 1 : 0);
}

/** Oyuncu başına en çok özet kaydı (halka) ve saklama süresi (sim ms): docs/arastirma/donus-deneyimi.md §5.3. */
export const OZET_KAYIT_TAVANI = 200;
export const OZET_KAYIT_OMRU_MS = 30 * 24 * 3_600_000;

export function ozetKaydiAnahtari(k: Pick<OzetKaydi, "tur" | "t" | "sira">): string {
  return `${k.tur}|${k.t}|${k.sira}`;
}

/**
 * Oyuncu profili ve özet kayıtları (çekirdek dışı, yan kanal). `kayitEkle` idempotenttir (aynı anahtar bir kez), oyuncu başına
 * halka `OZET_KAYIT_TAVANI`, ömür `OZET_KAYIT_OMRU_MS` (`simdi`'ye göre; daha eski kayıtlar atılır). Bellek, dosya ve pg depolarında aynı sözleşme (test/profil-sozlesmesi.ts).
 */
export interface ProfilDeposu {
  capaOku(oyuncu: string): Promise<Capa | null>;
  /** Verilen alanları üzerine yazar (diğerleri korunur). */
  capaYaz(oyuncu: string, kismi: Capa): Promise<void>;
  /** Eklenen (yeni) kayıt sayısını döndürür. */
  kayitEkle(oyuncu: string, kayitlar: readonly OzetKaydi[], simdi: Ms): Promise<number>;
  /** `t`'ye göre artan, sonra (tur, sira) sıralı. */
  kayitOku(oyuncu: string): Promise<OzetKaydi[]>;
  /** Damgaları ekler (idempotent: `(oyuncu, kavram)` bir kez, ilk yazım kazanır); yeni eklenen sayısını döndürür. */
  damgaEkle(oyuncu: string, damgalar: readonly Damga[]): Promise<number>;
  /** `t`'ye göre artan, sonra kavram sıralı. */
  damgaOku(oyuncu: string): Promise<Damga[]>;
  /** Yazılanları kalıcılaştırır (fsync); anlık görüntüden ÖNCE çağrılır. */
  esitle(): Promise<void>;
  kapat(): Promise<void>;
}

/**
 * Hesap, oturum ve giriş bağlantısı kayıtları (G5; KIMLIK.md §5–§7). Kişisel veri YALNIZ e-postadır: IP, tarayıcı bilgisi, ad yoktur.
 * Hesap ile oyuncu AYRIDIR: `oyuncu` sunucu üretimli ve opaktır (e-postadan türetilmez), çekirdeğe yalnız o girer.
 * Zamanlar duvar saati epoch ms'dir (sim zamanı değil). Hesap tabloları DÜNYADAN BAĞIMSIZDIR (pg'de `dunya` sütunu yoktur).
 */
export interface HesapKaydi {
  /** Opak hesap kimliği. */
  id: string;
  /** Posta gönderilen adres (küçük harf). */
  eposta: string;
  /** Normalleştirilmiş benzersizlik anahtarı (Gmail noktaları, `+takma` atılmış). Hesap başına bir oyuncu bu anahtarla sağlanır. */
  anahtar: string;
  /** Hesabın TEK oyuncusu: `hesap_oyuncu(hesap_id PK, oyuncu_id UNIQUE)`. */
  oyuncu: string;
  olusturma: number;
}

/** Tek kullanımlık giriş bağlantısı: açık belirteç ASLA tutulmaz, yalnız SHA-256 özeti. Süre dolunca ya da kullanılınca silinir. */
export interface BaglantiKaydi {
  /** Belirtecin SHA-256 özeti (base64url). */
  ozet: string;
  eposta: string;
  anahtar: string;
  bitis: number;
  /** İsteği yapan tarayıcı çerezinin SHA-256 özeti; yoksa (tarayıcıya bağlı değilse) null. */
  tarayiciOzeti: string | null;
  olusturma: number;
}

/** Oturum: çerezdeki belirteç `<id>.<gizli>`; depoda yalnız `gizli`nin SHA-256 özeti. */
export interface OturumKaydi {
  id: string;
  hesap: string;
  gizliOzet: string;
  olusturma: number;
  sonKullanim: number;
  /** Kayan bitiş (her uzatmada `min(şimdi + kayan süre, mutlakBitis)`). */
  bitis: number;
  /** Mutlak üst sınır (açılıştan itibaren; uzatmayla aşılmaz). */
  mutlakBitis: number;
}

export type BaglantiTuketimi =
  | { durum: "tamam"; kayit: BaglantiKaydi }
  /** Yok, süresi dolmuş ya da zaten kullanılmış. */
  | { durum: "yok" }
  /** Bağlantı geçerli ama başka bir tarayıcıda açıldı; TÜKETİLMEDİ. */
  | { durum: "tarayici" };

/** `hesapOlustur` oyuncu kimliği başka bir hesaba aitse fırlatılır (çağıran yeni kimlik üretip yeniden dener). */
export class OyuncuCakismasi extends Error {
  constructor(oyuncu: string) {
    super(`oyuncu kimligi zaten kullanimda: ${oyuncu}`);
    this.name = "OyuncuCakismasi";
  }
}

/**
 * Hesap deposu (bellek, dosya ve pg: AYNI sözleşme, test/hesap-sozlesmesi.ts). Tüm işlemler atomiktir ve yanıt, kayıt KALICI olduktan
 * sonra döner (dosyada fdatasync, pg'de commit): tüketilen bağlantı çökmeden sonra yeniden canlanmaz.
 */
export interface HesapDeposu {
  /** Anahtar zaten varsa mevcut hesabı döndürür (`yeni: false`; verilen `oyuncu` yok sayılır). Oyuncu kimliği çakışırsa `OyuncuCakismasi`. */
  hesapOlustur(h: HesapKaydi): Promise<{ hesap: HesapKaydi; yeni: boolean }>;
  hesapBulAnahtar(anahtar: string): Promise<HesapKaydi | null>;
  hesapBulId(id: string): Promise<HesapKaydi | null>;
  /** Hesabı, oyuncu eşlemesini, oturumlarını ve bekleyen bağlantılarını siler (KVKK silme). Silinen oturum kimliklerini döndürür; yoksa null. */
  hesapSil(id: string): Promise<string[] | null>;
  /** Aynı adresin (anahtar) önceki bekleyen bağlantıları DÜŞER, yenisi eklenir (tek işlem). */
  baglantiEkle(k: BaglantiKaydi): Promise<void>;
  /** Geçerli (`bitis > simdi`) ve tarayıcı uyumluysa kaydı siler ve döndürür (tek kullanım). Uyumsuzsa tüketmez. */
  baglantiTuket(ozet: string, simdi: number, tarayiciOzeti: string | null): Promise<BaglantiTuketimi>;
  oturumEkle(o: OturumKaydi): Promise<void>;
  oturumBul(id: string): Promise<OturumKaydi | null>;
  oturumUzat(id: string, sonKullanim: number, bitis: number): Promise<void>;
  oturumSil(id: string): Promise<boolean>;
  /** Hesabın bütün oturumlarını siler; silinen oturum kimliklerini döndürür. */
  hesabinOturumlariniSil(hesap: string): Promise<string[]>;
  /** Süresi dolmuş bağlantıları ve oturumları (`bitis <= simdi` ya da `mutlakBitis <= simdi`) siler. */
  sureGecmisleriSil(simdi: number): Promise<{ baglanti: number; oturum: number }>;
  /** Yalnız toplu sayılar (metrik/tanı; kişisel veri yok). */
  sayilar(): Promise<{ hesap: number; oturum: number; baglanti: number }>;
  /** Yazılanları kalıcılaştırır. */
  esitle(): Promise<void>;
  kapat(): Promise<void>;
}

/**
 * OYUN BAĞLANTISI oturumu (insan testi İ2; giriş/kimlik oturumu DEĞİLDİR: o çerezle açılan hesap oturumudur, bu oyuncunun ws bağlantısı süresidir).
 * YALNIZ zaman ve opak oyuncu kimliği tutulur: IP, cihaz, tarayıcı, e-posta YOKTUR. `profil_capa`'ya yazılmaz. Zamanlar duvar saati epoch ms.
 * Kopup yeniden bağlanma (`boşluk eşiği` içinde) AYNI oturumdur (`OturumKaydedici`).
 */
export interface OyunOturumu {
  id: number;
  oyuncu: string;
  acilis: number;
  /** Açıksa (oyuncunun bağlantısı sürüyor ya da süreç ani öldü) null. */
  kapanis: number | null;
}

/** 90 günden eski oturumların gün düzeyinde TOPLU sayıları (ayrıntı satırı silinir; kişi başına iz kalmaz). `gun` = UTC gün başlangıcı (epoch ms). */
export interface GunlukOturumSayisi {
  gun: number;
  oturum: number;
  /** O gün oturumu olan farklı oyuncu sayısı. */
  oyuncu: number;
  /** Kapanmış oturumların toplam süresi (ms). */
  sureMs: number;
}

export const OTURUM_GUN_MS = 86_400_000;
/** Ayrıntı satırlarının ömrü; sonrası yalnız toplu sayılar. */
export const OYUN_OTURUM_OMRU_MS = 90 * OTURUM_GUN_MS;

/** Oyun oturumu deposu (bellek, dosya ve pg: AYNI sözleşme, test/oyun-oturum-sozlesmesi.ts). Dünya başınadır. */
export interface OyunOturumDeposu {
  /** Yeni açık oturum ekler. */
  ac(oyuncu: string, acilis: number): Promise<OyunOturumu>;
  /** Oyuncunun en yeni (acilis'e göre) oturumu; yoksa null. */
  sonOturum(oyuncu: string): Promise<OyunOturumu | null>;
  /** Kapanışı yazar (null = yeniden açıldı). */
  kapanisYaz(id: number, kapanis: number | null): Promise<void>;
  /** Ayrıntı satırları, acilis sırasıyla (`oyuncu` verilirse yalnız onun). */
  oku(oyuncu?: string): Promise<OyunOturumu[]>;
  /** Günün başlangıcına yuvarlanmış `simdi - omur` kesiminden ESKİ ayrıntı satırlarını gün düzeyinde toplu sayıya çevirir ve siler. Silinen satır sayısı. */
  toplulastir(simdi: number, omurMs?: number): Promise<number>;
  gunlukSayilar(): Promise<GunlukOturumSayisi[]>;
  /** Dünyanın bütün oturum satırlarını ve toplu sayılarını siler (test dünyası silme; İ3). Silinen satır sayısı. */
  dunyayiSil(): Promise<{ oturum: number; gunluk: number }>;
  esitle(): Promise<void>;
  kapat(): Promise<void>;
}

/** Depo boyutu (bayt): metrik için; pahalı olabilir, çağıran önbellekler. */
export interface DepoBoyutu {
  gunlukBayt: number;
  goruntuBayt: number;
}

export interface Depo {
  gunluk: GunlukDeposu;
  goruntu: GoruntuDeposu;
  /** İsteğe bağlı: depo boyutu (günlük ve görüntü). pg'de günlük boyutu tüm dünyaların `log` tablosudur. */
  boyut?(): Promise<DepoBoyutu>;
  /** İsteğe bağlı: yoksa (özel/eski bir depo) "sen yokken" özeti ve özet kayıtları kapalıdır. */
  profil?: ProfilDeposu;
  /**
   * İsteğe bağlı: depodan ASENKRON gelen ölümcül altyapı hatası (örn. pg'de boştaki ya da dünya kilidini tutan bağlantı koptu). Hiçbir isteğe
   * bağlı olmayan bu hata dinlenmezse süreç işlenmemiş `error` olayıyla çöker; `DunyaYazari` bunu dinler ve ölümcül olur (günlük yazılamaz
   * demektir; fail-stop). Dinleyici eklenmeden önce oluşmuş hata, dinleyici eklenince bir kez iletilir. Depo kapatıldıktan sonraki hatalar yok sayılır.
   */
  hataDinle?(f: (e: Error) => void): void;
  /** İsteğe bağlı: yoksa e-posta bağlantısıyla giriş kapalıdır (geliştirme kimliği kullanılır). */
  hesap?: HesapDeposu;
  /** İsteğe bağlı: oyun bağlantısı oturum olayı kaydı (İ2; `BOLGE_OTURUM_KAYDI=1`). */
  oyunOturumu?: OyunOturumDeposu;
}

/** Ekleme öncesi ortak süreklilik denetimi: toplu içinde ve son seq'e göre +1 artış. */
export function seqSurekliligiDenetle(sonSeq: number, toplu: readonly GunlukKaydi[]): void {
  let beklenen = sonSeq + 1;
  for (const k of toplu) {
    if (k.seq !== beklenen) throw new Error(`gunluk seq surekliligi bozuk: beklenen ${beklenen}, gelen ${k.seq}`);
    beklenen++;
  }
}

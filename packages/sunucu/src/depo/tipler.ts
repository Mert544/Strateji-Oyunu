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
  /** `seq > seqSonrasi` olan kayıtlar, seq sırasıyla. */
  oku(seqSonrasi: number): Promise<GunlukKaydi[]>;
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
  /** Yazılanları kalıcılaştırır (fsync); anlık görüntüden ÖNCE çağrılır. */
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
}

/** Ekleme öncesi ortak süreklilik denetimi: toplu içinde ve son seq'e göre +1 artış. */
export function seqSurekliligiDenetle(sonSeq: number, toplu: readonly GunlukKaydi[]): void {
  let beklenen = sonSeq + 1;
  for (const k of toplu) {
    if (k.seq !== beklenen) throw new Error(`gunluk seq surekliligi bozuk: beklenen ${beklenen}, gelen ${k.seq}`);
    beklenen++;
  }
}

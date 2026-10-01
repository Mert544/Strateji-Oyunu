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
}

export interface GunlukDeposu {
  /** Kayıtları sırayla ve kalıcı olarak ekler (toplu commit). seq sürekliliğini bozan ekleme reddedilir. */
  ekle(toplu: readonly GunlukKaydi[]): Promise<void>;
  /** `seq > seqSonrasi` olan kayıtlar, seq sırasıyla. */
  oku(seqSonrasi: number): Promise<GunlukKaydi[]>;
  kapat(): Promise<void>;
}

export interface GoruntuDeposu {
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

export interface Depo {
  gunluk: GunlukDeposu;
  goruntu: GoruntuDeposu;
}

/** Ekleme öncesi ortak süreklilik denetimi: toplu içinde ve son seq'e göre +1 artış. */
export function seqSurekliligiDenetle(sonSeq: number, toplu: readonly GunlukKaydi[]): void {
  let beklenen = sonSeq + 1;
  for (const k of toplu) {
    if (k.seq !== beklenen) throw new Error(`gunluk seq surekliligi bozuk: beklenen ${beklenen}, gelen ${k.seq}`);
    beklenen++;
  }
}

import type { VeriPaketi } from "@bolge/veri";

/** Hipotez koşucularının ortak sonuç şeması. JSON'a serileştirilebilir, duvar saati alanı yalnızca `sureMs`tir. */
export type Verdict = "gecti" | "kaldi" | "belirsiz";
export type HipotezKimligi = "H1" | "H2" | "H3" | "H5" | "H6" | "H7";
export const TUM_HIPOTEZLER: readonly HipotezKimligi[] = ["H1", "H2", "H3", "H5", "H6", "H7"];

export interface TohumSonucu {
  tohum: number;
  /** Bu tohum için ana ölçüm değeri (null = ölçülemedi). */
  olcum: number | null;
  verdict: Verdict;
  /** Bu tohumdaki koşu(lar)ın durumOzeti izi (determinizm kanıtı). */
  durumOzeti: string;
  /** Tohuma özgü ayrıntılar (hipoteze göre). */
  ozet: Record<string, unknown>;
}

export interface HipotezSonucu {
  kimlik: HipotezKimligi;
  hipotez: string;
  olcum: {
    ad: string;
    /** Tohumlar üzerinden ortalama ana ölçüm (null = ölçülemedi). */
    deger: number | null;
    birim: string;
    aciklama: string;
  };
  esik: { aciklama: string; deger: number | null };
  verdict: Verdict;
  /** Tohumların "gecti" oranı [0,1]. */
  tohumBasariOrani: number;
  tohumBasina: TohumSonucu[];
  ayrinti: Record<string, unknown>;
  parametreler: Record<string, unknown>;
  /** Duvar saati (ms); yalnızca raporlama, determinizm karşılaştırmasında yok sayılır. */
  sureMs: number;
}

/** Ölçüm haritası: "sentetik" (sentetik-50, vars.) veya "gercek" (gercek-karadeniz). */
export type HaritaAdi = "sentetik" | "gercek";
export const TUM_HARITALAR: readonly HaritaAdi[] = ["sentetik", "gercek"];
/**
 * İklim takvimi ölçüm modu (yalnız tarım açıkken etkili): "hizli" = gunCarpani 12 (30 günlük koşu ~1 yıl görür),
 * "gercek" = param'ın gunCarpani'si (gerçek takvim, 30 günlük koşu tek ay görür). İki modda da başlangıç günü tohumla döner.
 */
export type IklimModu = "gercek" | "hizli";
export const TUM_IKLIM_MODLARI: readonly IklimModu[] = ["gercek", "hizli"];

/** Ortak koşucu seçenekleri. */
export interface HipotezSecenek {
  tohumlar: number[];
  /** Ölçüm haritası (vars. "sentetik"); `veri` verilmişse yok sayılır (yalnız etiket). */
  harita?: HaritaAdi;
  /** İklim takvimi modu (undefined = param olduğu gibi; CLI vars. "hizli"). Tarım kapalıysa sessizce etkisiz. */
  iklim?: IklimModu;
  /** Hazır veri paketi (test/üst katman); verilmezse `harita`ya göre yüklenir. */
  veri?: VeriPaketi;
  /** Hızlı mod: küçültülmüş boyutlar (yalnızca süre için). */
  hizli?: boolean;
  /** Örnekleme yapan koşucuların (H1) bölge sayısı (devlet başına eşit dağıtılır); `tam` bunu geçersiz kılar. */
  bolgeSayisi?: number;
  /** Tam boyut: hipotezin örnekleme yapan koşucuları (H1) tüm birimleri koşturur (yavaş). */
  tam?: boolean;
  /** H1 odak kurulumu: "bolge_liman" (vars.; odak bölge + en yakın liman) veya "bolge" (yalnız odak bölge). */
  odak?: "bolge" | "bolge_liman";
  /** H1 anlamlı fark oranı: pasif referansın mutlak net değerinin bu oranı (vars. 0.03; docs/07 Ö1a). */
  anlamliOran?: number;
  /** H1 koşu süresi, gün (vars. 7). Arka plandaki militarist ilk savaşını ~7. günde ilan ettiği için askeri etkiyi görmek için 14 önerilir. */
  h1Gun?: number;
  /** H1 birincil skor penceresinin başlangıcı: bu günün sonundan koşu sonuna (vars. 3 = 4-7. gün). */
  pencereBasGun?: number;
  /** Test için ek küçültme (kısa sürüm); hızlı moddan da küçük olabilir. */
  kisa?: boolean;
  /** İlerleme mesajı geri çağrısı (CLI). */
  ilerleme?: (mesaj: string) => void;
}

/** Tohum başına verdict'lerden genel verdict: hepsi aynıysa o, değilse belirsiz. */
export function genelVerdict(v: readonly Verdict[]): Verdict {
  if (v.length === 0) return "belirsiz";
  const ilk = v[0] as Verdict;
  return v.every((x) => x === ilk) ? ilk : "belirsiz";
}

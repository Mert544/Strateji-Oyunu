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

/** Ortak koşucu seçenekleri. */
export interface HipotezSecenek {
  tohumlar: number[];
  /** Hızlı mod: küçültülmüş boyutlar (yalnızca süre için). */
  hizli?: boolean;
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

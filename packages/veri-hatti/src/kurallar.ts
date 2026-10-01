/**
 * Oyun kuralı sabitleri: gerçek coğrafyadan oyun sayılarına dönüşümün tüm katsayıları tek yerde.
 * Aralıklar sentetik-50 haritasıyla uyumludur (kapasite mili-birim/saat, süre saat).
 */
import type { Etiket } from "@bolge/veri";

/** Kara arazi sınıfı: bir uçta "dar_gecit" varsa geçit, bir uçta "dag" varsa dağ, yoksa ova. */
export type KaraSinifi = "ova" | "dag" | "gecit";

export interface KaraKurali {
  /** Yolun ortalama hızı (km/saat). */
  hizKmSaat: number;
  sureMin: number;
  sureMaks: number;
  /** Kapasite aralığı (mili-birim/saat): ortak sınır uzunluğu doygunluğa ulaşınca üst değer. */
  kapasiteMin: number;
  kapasiteMaks: number;
}

export const KARA_KURALLARI: Readonly<Record<KaraSinifi, KaraKurali>> = {
  ova: { hizKmSaat: 70, sureMin: 1, sureMaks: 10, kapasiteMin: 520_000, kapasiteMaks: 760_000 },
  dag: { hizKmSaat: 35, sureMin: 5, sureMaks: 10, kapasiteMin: 140_000, kapasiteMaks: 220_000 },
  gecit: { hizKmSaat: 50, sureMin: 3, sureMaks: 6, kapasiteMin: 280_000, kapasiteMaks: 360_000 },
};

/** Merkezler arası kuş uçuşu mesafenin yol uzunluğuna çevrilmesi (kıvrım çarpanı). */
export const YOL_EGRILIK_CARPANI = 1.25;
/** Ortak sınır uzunluğu bu değerde kapasite tam üst değere ulaşır (km). */
export const SINIR_DOYGUNLUK_KM = 250;
/** Bundan kısa ortak sınır (nokta teması/şerit) komşuluk sayılmaz (km). */
export const EN_AZ_ORTAK_SINIR_KM = 8;

export const DENIZ = {
  /** Yük gemisi ortalama hızı (km/saat, ~13.5 knot). */
  hizKmSaat: 25,
  sureMin: 3,
  sureMaks: 72,
  kapasiteMin: 1_600_000,
  kapasiteMaks: 2_350_000,
  kapasiteAdim: 50_000,
  /** Her liman bölgesi en yakın bu kadar (havza ortak) komşuya bağlanır; sonra bağlılık tamamlanır. */
  enYakinKomsu: 2,
  /** Liman noktası denize bu kadar km'den uzaksa (nehir limanı) liman sayılmaz. */
  limanDenizeAzamiKm: 80,
  /** Kara maskesi ızgara adımı (derece) ve boğaz açma yarıçapı (hücre). */
  izgaraAdimi: 0.02,
  bogazYaricapi: 1,
} as const;

export const HAVA = {
  hizKmSaat: 500,
  yerIslemSaat: 2,
  sureMin: 3,
  kapasiteMin: 30_000,
  kapasiteMaks: 55_000,
  kapasiteAdim: 5_000,
} as const;

/** Oyun nüfusu aralığı (kişi); gerçek nüfustan logaritmik (geometrik) ölçekleme. */
export const NUFUS = { min: 50_000, maks: 800_000, yuvarlama: 1_000 } as const;

/** Rezerv tablosu birimi: bin birim -> mili-birim. */
export const REZERV_CARPANI = 1_000_000;

/** Ham mal -> başlangıç tesis türü. */
export const MAL_TESIS: Readonly<Record<string, string>> = {
  tahil: "ciftlik",
  cevher: "cevher_madeni",
  komur: "komur_ocagi",
  bakir: "bakir_madeni",
  silis: "silis_ocagi",
  petrol: "petrol_kuyusu",
};
/** Başlangıçta bölge başına en çok tesis (rezerv tesisleri en çok 2, geri kalanı sanayi). */
export const EN_COK_TESIS = 3;
export const EN_COK_REZERV_TESISI = 2;

/** x/y (0-1000) projeksiyonu: kenar boşluğu. */
export const XY_KENAR_BOSLUGU = 40;

export const ETIKET_SIRASI: readonly Etiket[] = ["kiyi", "liman", "dag", "ova", "dar_gecit"];

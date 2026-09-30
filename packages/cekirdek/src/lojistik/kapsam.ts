/**
 * Kapsam ("nerede açık, neden") yardımcıları (SAF: Dunya'ya bağımlı değildir).
 *
 * - `cokKaynakliDijkstra`: çok kaynaklı en kısa süre (maliyet = süre, ms).
 * - `aciklikNedeni`: açık nedeni sınıflandırması.
 * - `karsilanmaPpm`: tamsayı karşılanma oranı (ppm).
 *
 * Determinizm: eşit mesafede düşük düğüm indeksi önce kesinleşir; eşit mesafeli alternatif
 * kenarlarda düşük kenar indeksi (ilk bulunan) kalır.
 */
import type { AciklikNedeni } from "../tipler";
import { komsulukKur, type GrafKenari } from "./graf";

export interface DijkstraSecenek {
  /** false dönen kenar yok sayılır (ör. kalan kapasitesi 0 olan kenarlar). */
  kapasiteliMi?: (kenarIndeks: number) => boolean;
}

export interface DijkstraSonucu {
  /** En yakın kaynağa süre (ms); ulaşılamıyorsa -1. Kaynaklar 0. */
  mesafe: number[];
  /** Düğüme en kısa yolda gelen kenar indeksi; kaynak/ulaşılamaz için -1. */
  onceki: number[];
}

/**
 * Çok kaynaklı Dijkstra. Her düğüm için en yakın kaynağa olan süreyi döndürür (yönsüz kenarlar).
 * Aralık dışı kaynaklar yok sayılır. Karmaşıklık O(V² + E) (V ≤ ~60 için yeterli, yığınsız ve deterministik).
 */
export function cokKaynakliDijkstra(
  dugumSayisi: number,
  kenarlar: readonly GrafKenari[],
  kaynaklar: readonly number[],
  secenek?: DijkstraSecenek,
): DijkstraSonucu {
  const kom = komsulukKur(dugumSayisi, kenarlar);
  const uygun = secenek?.kapasiteliMi;
  const SONSUZ = Number.MAX_SAFE_INTEGER;
  const uzak: number[] = new Array<number>(dugumSayisi).fill(SONSUZ);
  const onceki: number[] = new Array<number>(dugumSayisi).fill(-1);
  const kesin: boolean[] = new Array<boolean>(dugumSayisi).fill(false);
  for (const s of kaynaklar) {
    if (Number.isInteger(s) && s >= 0 && s < dugumSayisi) uzak[s] = 0;
  }
  for (;;) {
    let x = -1;
    let en = SONSUZ;
    for (let i = 0; i < dugumSayisi; i++) {
      if (!kesin[i] && uzak[i]! < en) { en = uzak[i]!; x = i; } // kesin < : eşitlikte düşük indeks
    }
    if (x < 0) break;
    kesin[x] = true;
    for (const { kenar, dugum } of kom[x]!) {
      if (uygun && !uygun(kenar)) continue;
      const nd = en + kenarlar[kenar]!.maliyet;
      if (nd < uzak[dugum]!) {
        uzak[dugum] = nd;
        onceki[dugum] = kenar;
      }
    }
  }
  const mesafe = uzak.map((d) => (d === SONSUZ ? -1 : d));
  return { mesafe, onceki };
}

/** Bir bölge × mal için açıklık nedeni girdisi. */
export interface AciklikGirdisi {
  /** Talep (mili-birim); <= 0 ise karşılanıyor sayılır. */
  talep: number;
  /** Akışla karşılanan miktar (mili-birim). */
  karsilanan: number;
  /** Bu mal için ağda (aynı lojistik ağında) herhangi bir yerde fazla/arz var mı. */
  arzVarMi: boolean;
  /** En yakın kaynağa süre, kapasite YOK SAYILARAK (ms); ulaşılamıyorsa -1. */
  mesafe: number;
  /**
   * En yakın kaynağa süre, yalnızca kalan kapasitesi olan kenarlarla (ms); ulaşılamıyorsa -1.
   * Kararda kullanılmaz (kapasite nedeni zaten "aksi halde" kuralıdır); sınıflandırmanın
   * tam girdisini taşımak ve ileride ayrıntı için saklanır.
   */
  mesafeKapasiteliKenarlarla: number;
  /** Bu süreden uzak kaynak "mesafe" nedeni sayılır (ms); spesifikasyon: 72 saat. */
  mesafeEsigiMs: number;
}

/** Karşılanma yüzde eşiği: >= %99 ise "yok". */
export const KARSILANMA_ESIGI_YUZDE = 99;

/**
 * Tamsayı karşılanma oranı (ppm), [0, 1_000_000]. `talep <= 0` ise 1_000_000.
 * Taşmaya karşı BigInt kullanır; aşağı yuvarlar.
 */
export function karsilanmaPpm(talep: number, karsilanan: number): number {
  if (talep <= 0) return 1_000_000;
  if (karsilanan <= 0) return 0;
  if (karsilanan >= talep) return 1_000_000;
  return Number((BigInt(karsilanan) * 1_000_000n) / BigInt(talep));
}

/**
 * Açıklık nedeni kuralları (sırayla, ilk eşleşen):
 *  1. karşılanma >= %99 (veya talep <= 0)      -> "yok"
 *  2. ağda hiç arz yok (`arzVarMi` false)       -> "girdi_eksik"
 *  3. en yakın kaynağa ulaşılamaz (mesafe < 0,
 *     kapasite yok sayılarak)                   -> "erisim_yok"
 *  4. mesafe > mesafeEsigiMs                    -> "mesafe"
 *  5. aksi halde (yol var, yakın, ama kenarlar
 *     dolu)                                     -> "kapasite"
 */
export function aciklikNedeni(g: AciklikGirdisi): AciklikNedeni {
  if (karsilanmaPpm(g.talep, g.karsilanan) >= KARSILANMA_ESIGI_YUZDE * 10_000) return "yok";
  if (!g.arzVarMi) return "girdi_eksik";
  if (g.mesafe < 0) return "erisim_yok";
  if (g.mesafe > g.mesafeEsigiMs) return "mesafe";
  return "kapasite";
}

/**
 * Kapsam (tedarik: neresi açık ve neden) türetmeleri: izleyici/istemci/istemci.js'deki `turet` ve `hucre`
 * mantığının tipli, saf hali. Bir Kare'den bölge x mal hücre durumları çıkarılır. Lojistik akışları istemcide
 * yoktur; bir mal bölgede stok ya da üretim varsa "ilgili" sayılır.
 */
import { NEDEN_KODLARI } from "./kare-tipleri";
import type { Kare, KapsamKaresi } from "./kare-tipleri";

export type KapsamDurumu = "karsilanan" | "kismi" | "acik" | "engelli" | "ilgisiz" | "sahipsiz";

export const DURUM_KODU: Record<KapsamDurumu, number> = {
  karsilanan: 0,
  kismi: 1,
  acik: 2,
  engelli: 3,
  ilgisiz: 4,
  sahipsiz: 5,
};

export interface Hucre {
  d: KapsamDurumu;
  pct: number;
  neden: (typeof NEDEN_KODLARI)[number];
  /** En yakın kaynağa süre (saat); -1 = yok. */
  sure: number;
}

/** Bir kareden bir kez hesaplanan arama tabloları. */
export interface KareTuretimi {
  nm: number;
  kap: Map<number, KapsamKaresi>;
  sahipSayisi: number[];
}

const onbellek = new WeakMap<Kare, KareTuretimi>();

export function kareTuret(kare: Kare, oyuncuSayisi: number): KareTuretimi {
  const var_ = onbellek.get(kare);
  if (var_) return var_;
  const nm = kare.fiyat.length;
  const kap = new Map<number, KapsamKaresi>();
  for (const c of kare.kapsam) kap.set(c[0] * nm + c[1], c);
  const sahipSayisi = new Array<number>(oyuncuSayisi).fill(0);
  for (const b of kare.bolgeler) if (b.sahip >= 0) sahipSayisi[b.sahip] = (sahipSayisi[b.sahip] ?? 0) + 1;
  const t: KareTuretimi = { nm, kap, sahipSayisi };
  onbellek.set(kare, t);
  return t;
}

/** Bölge x mal kapsam hücresi (izleyicideki eşiklerle: >=95 karşılanan, <50 açık, kapasite/erişim engelli). */
export function hucre(kare: Kare, t: KareTuretimi, b: number, m: number): Hucre {
  const bk = kare.bolgeler[b];
  if (!bk || bk.sahip < 0) return { d: "sahipsiz", pct: 0, neden: "yok", sure: -1 };
  const c = t.kap.get(b * t.nm + m);
  if (!c) {
    const ilgili = (bk.stok[m] ?? 0) > 0 || (bk.uretim[m] ?? 0) > 0;
    return { d: ilgili ? "karsilanan" : "ilgisiz", pct: 100, neden: "yok", sure: -1 };
  }
  const neden = NEDEN_KODLARI[c[3]] ?? "yok";
  let d: KapsamDurumu;
  if (c[2] >= 95) d = "karsilanan";
  else if (neden === "kapasite" || neden === "erisim_yok") d = "engelli";
  else if (c[2] < 50) d = "acik";
  else d = "kismi";
  return { d, pct: c[2], neden, sure: c[4] };
}

/** Bölgenin genel tedarik durumu: ilgili mallarda ortalama karşılanma ve en kötü hücre (seçili bölge "tedarik" satırı). */
export interface TedarikOzeti {
  /** İlgili malların ortalama karşılanma yüzdesi (0-100); ilgili mal yoksa 100. */
  yuzde: number;
  /** İlgili mal sayısı. */
  ilgili: number;
  /** En düşük karşılanan mal (tam karşılanıyorsa null). */
  enKotu: { mal: number; hucre: Hucre } | null;
}

export function tedarikOzeti(kare: Kare, t: KareTuretimi, b: number): TedarikOzeti | null {
  const bk = kare.bolgeler[b];
  if (!bk || bk.sahip < 0) return null;
  let top = 0, n = 0;
  let enKotu: TedarikOzeti["enKotu"] = null;
  for (let m = 0; m < t.nm; m++) {
    const h = hucre(kare, t, b, m);
    if (h.d === "ilgisiz" || h.d === "sahipsiz") continue;
    n++;
    top += h.pct;
    if (h.d !== "karsilanan" && (!enKotu || h.pct < enKotu.hucre.pct)) enKotu = { mal: m, hucre: h };
  }
  return { yuzde: n ? Math.round(top / n) : 100, ilgili: n, enKotu };
}

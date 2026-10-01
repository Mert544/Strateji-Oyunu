/**
 * Kapsam (neresi açık ve neden) türetmeleri: izleyici/istemci/istemci.js'deki `turet` ve `hucre` mantığının
 * tipli, saf hali. Bir Kare'den bölge x mal hücre durumları çıkarılır.
 */
import { NEDEN_KODLARI } from "./kare-tipleri";
import type { Kare, AkisKaresi, KapsamKaresi } from "./kare-tipleri";

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
  /** dokunan[mal] = akışa dahil bölge kümesi. */
  dokunan: Array<Set<number>>;
  gelen: AkisKaresi[][];
  giden: AkisKaresi[][];
  sahipSayisi: number[];
}

const onbellek = new WeakMap<Kare, KareTuretimi>();

export function kareTuret(kare: Kare, oyuncuSayisi: number): KareTuretimi {
  const var_ = onbellek.get(kare);
  if (var_) return var_;
  const nb = kare.bolgeler.length;
  const nm = kare.fiyat.length;
  const kap = new Map<number, KapsamKaresi>();
  for (const c of kare.kapsam) kap.set(c[0] * nm + c[1], c);
  const dokunan: Array<Set<number>> = Array.from({ length: nm }, () => new Set<number>());
  const gelen: AkisKaresi[][] = Array.from({ length: nb }, () => []);
  const giden: AkisKaresi[][] = Array.from({ length: nb }, () => []);
  for (const a of kare.akislar) {
    dokunan[a[0]]?.add(a[2]);
    dokunan[a[0]]?.add(a[3]);
    giden[a[2]]?.push(a);
    gelen[a[3]]?.push(a);
  }
  const sahipSayisi = new Array<number>(oyuncuSayisi).fill(0);
  for (const b of kare.bolgeler) if (b.sahip >= 0) sahipSayisi[b.sahip] = (sahipSayisi[b.sahip] ?? 0) + 1;
  const t: KareTuretimi = { nm, kap, dokunan, gelen, giden, sahipSayisi };
  onbellek.set(kare, t);
  return t;
}

/** Bölge x mal kapsam hücresi (izleyicideki eşiklerle: >=95 karşılanan, <50 açık, kapasite/erişim engelli). */
export function hucre(kare: Kare, t: KareTuretimi, b: number, m: number): Hucre {
  const bk = kare.bolgeler[b];
  if (!bk || bk.sahip < 0) return { d: "sahipsiz", pct: 0, neden: "yok", sure: -1 };
  const c = t.kap.get(b * t.nm + m);
  if (!c) {
    const ilgili = (bk.stok[m] ?? 0) > 0 || (bk.uretim[m] ?? 0) > 0 || t.dokunan[m]?.has(b) === true;
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

/** Kenar doluluk oranı (0-1+). */
export function kenarKullanimi(kenar: [number, number, number]): number {
  return kenar[0] > 0 ? kenar[1] / kenar[0] : 0;
}

export interface Darbogaz {
  kenar: number;
  kullanim: number;
  kapasite: number;
}

/** Doluluğu eşik ve üstü olan kenarlar, doluluğa göre azalan. */
export function darbogazlar(kare: Kare, esik = 0.9): Darbogaz[] {
  const s: Darbogaz[] = [];
  kare.kenarlar.forEach((k, i) => {
    const u = kenarKullanimi(k);
    if (u >= esik) s.push({ kenar: i, kullanim: u, kapasite: k[0] });
  });
  return s.sort((a, b) => b.kullanim - a.kullanim || b.kapasite - a.kapasite);
}

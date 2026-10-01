/**
 * Renk yardımcıları (saf): palet, viridis benzeri kullanım rampası, mal renkleri ve
 * anlık görüntü -> bölge renk/desen tamponu.
 */
import type { Dizin, Kare } from "./kare-tipleri";
import { hucre, kareTuret } from "./kapsam";
import type { KapsamDurumu } from "./kapsam";

export type RGB = [number, number, number];

export interface Palet {
  /** Devlet renkleri (Okabe-Ito). */
  devlet: RGB[];
  sahipsiz: RGB;
  durum: Record<KapsamDurumu, RGB>;
  /** Kenar kullanım rampası: 5 durak (düşük -> yüksek). */
  kullanim: RGB[];
}

/** "#rrggbb" / "#rgb" / "rgb(r,g,b)" -> 0-1 RGB. */
export function hexRgb(girdi: string): RGB {
  let h = (girdi ?? "").trim();
  if (h.startsWith("#")) {
    if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    const n = parseInt(h.slice(1, 7), 16);
    if (Number.isNaN(n)) return [0.5, 0.5, 0.5];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = /rgba?\(([^)]+)\)/.exec(h);
  if (m) {
    const p = (m[1] as string).split(",").map((x) => parseFloat(x));
    return [(p[0] ?? 128) / 255, (p[1] ?? 128) / 255, (p[2] ?? 128) / 255];
  }
  return [0.5, 0.5, 0.5];
}

/** Doğrusal renk karışımı. */
export function karistir(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Kullanım (0-1) -> rampa rengi (5 duraklı parçalı doğrusal). */
export function kullanimRengi(u: number, rampa: readonly RGB[]): RGB {
  const t = Math.min(1, Math.max(0, u)) * (rampa.length - 1);
  const i = Math.min(rampa.length - 2, Math.floor(t));
  return karistir(rampa[i] as RGB, rampa[i + 1] as RGB, t - i);
}

/** Mal renkleri (izleyici ile aynı). Bilinmeyen mal kimliği için kimlikten türetilen renk. */
export const MAL_RENK_HEX: Record<string, string> = {
  tahil: "#e0b000",
  gida: "#7cb518",
  cevher: "#b5542b",
  komur: "#7a5c48",
  celik: "#5b8db8",
  bakir: "#ee7d31",
  silis: "#b59f5f",
  parca: "#8b72c9",
  elektronik: "#19b3c9",
  petrol: "#4f5d9a",
  yakit: "#e5484d",
  muhimmat: "#c2388f",
  gubre: "#3f8f5a",
};

export function malRengiHex(id: string): string {
  const h = MAL_RENK_HEX[id];
  if (h) return h;
  let x = 0;
  for (let i = 0; i < id.length; i++) x = (x * 31 + id.charCodeAt(i)) >>> 0;
  return hslHex(x % 360);
}

function hslHex(h: number): string {
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return 0.5 - 0.275 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const c = (v: number): string => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${c(f(0))}${c(f(8))}${c(f(4))}`;
}

/** Kategori -> şekil kodu (parçacık/glif ikinci kanalı): 0 daire, 1 eşkenar dörtgen, 2 kare, 3 üçgen. */
export function sekilKodu(kategori: string): number {
  switch (kategori) {
    case "ara":
      return 1;
    case "tuketim":
      return 2;
    case "askeri":
      return 3;
    default:
      return 0;
  }
}

export interface BolgeRenkTamponu {
  /** Bölge başına r,g,b (0-1). */
  renk: Float32Array;
  /** Bölge başına desen kodu (0 düz, 1 noktalı=kısmi, 2 çizgili=açık, 3 çapraz=engelli). */
  desen: Float32Array;
  /** Bölge başına neden glif kodu (-1 yok; 2 kapasite, 3 girdi, 4 mesafe, 5 erişim). */
  glif: Int8Array;
}

export function bolgeTamponuOlustur(nb: number): BolgeRenkTamponu {
  return { renk: new Float32Array(nb * 3), desen: new Float32Array(nb), glif: new Int8Array(nb).fill(-1) };
}

const NEDEN_GLIF: Record<string, number> = { kapasite: 2, girdi_eksik: 3, mesafe: 4, erisim_yok: 5 };

/**
 * Anlık görüntüden bölge renklerini hesaplar. mal < 0: sahip devlet rengi; mal >= 0: seçili malın kapsam
 * durumu (karşılanan / kısmi / açık / engelli, ikinci kanal olarak desen + neden glifi).
 * kare null ise (henüz görüntü yok) bölgenin asıl devlet rengi kullanılır.
 */
export function bolgeRenkleriniHesapla(kare: Kare | null, dizin: Dizin, mal: number, palet: Palet, cikti: BolgeRenkTamponu): void {
  const nb = dizin.bolgeler.length;
  const turev = kare ? kareTuret(kare, dizin.oyuncular.length) : null;
  for (let i = 0; i < nb; i++) {
    const b = dizin.bolgeler[i];
    if (!b) continue;
    let renk: RGB;
    let desen = 0;
    let glif = -1;
    const bk = kare?.bolgeler[i];
    const sahipDevlet = bk ? (bk.sahip >= 0 ? (dizin.oyuncular[bk.sahip]?.devlet ?? -1) : -1) : b.devlet;
    if (mal < 0 || !kare || !turev) {
      renk = sahipDevlet < 0 ? palet.sahipsiz : (palet.devlet[sahipDevlet % palet.devlet.length] as RGB);
    } else {
      const h = hucre(kare, turev, i, mal);
      renk = palet.durum[h.d];
      if (h.d === "kismi") desen = 1;
      else if (h.d === "acik") desen = 2;
      else if (h.d === "engelli") desen = 3;
      if (desen > 0) glif = NEDEN_GLIF[h.neden] ?? -1;
    }
    cikti.renk[3 * i] = renk[0];
    cikti.renk[3 * i + 1] = renk[1];
    cikti.renk[3 * i + 2] = renk[2];
    cikti.desen[i] = desen;
    cikti.glif[i] = glif;
  }
}

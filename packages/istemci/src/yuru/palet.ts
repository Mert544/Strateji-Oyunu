/**
 * Yürüyüş sahnesi paleti: sakin, düşük doygunluklu, düz renkler (açık: kum/zeytin; koyu: arduvaz/koyu turkuaz).
 * Doygun renk yalnız oyuncunun mülkü için (harita ile aynı `--harita-ben` belirteci). Sınıf sırası karo-geometri.ts `S`.
 */
import { S, SINIF_SAYISI } from "./karo-geometri";

export type Rgb = [number, number, number];

const hex = (h: string): Rgb => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  const v = m ? parseInt(m[1]!, 16) : 0x888888;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

interface TemaRenkleri {
  gok: string;
  sinif: Record<number, string>;
  izgara: string;
  izgaraAlfa: number;
  govde: string;
  insaat: [string, string, string, string];
  golge: string;
}

const ACIK: TemaRenkleri = {
  gok: "#dfe4e6",
  sinif: {
    [S.DENIZ]: "#a7bfca",
    [S.KARA]: "#e3e0d6",
    [S.YESIL]: "#cbd5b6",
    [S.ORMAN]: "#b5c4a1",
    [S.TARLA]: "#dfdabd",
    [S.SANAYI_ALAN]: "#d9d7d2",
    [S.KONUT_ALAN]: "#e2ddd2",
    [S.KURUM]: "#e1d8cc",
    [S.YAYA]: "#ebe7df",
    [S.KUM]: "#ece3c9",
    [S.SU]: "#a7bfca",
    [S.OTOYOL]: "#b9bbbd",
    [S.ANA_YOL]: "#c4c6c7",
    [S.TALI_YOL]: "#cfd0d0",
    [S.PATIKA]: "#e6dccb",
    [S.RAY]: "#a9a49c",
    [S.BINA]: "#e6dfd2",
    [S.BINA_CATI]: "#c7a796",
    [S.SANAYI_BINA]: "#d9dde0",
    [S.SANAYI_CATI]: "#a9b4bc",
    [S.KALDIRIM]: "#f1eee8",
    [S.KENAR]: "#8b8478",
  },
  izgara: "#3a4652",
  izgaraAlfa: 0.13,
  govde: "#ece9e2",
  insaat: ["#b9b5ad", "#a08a6a", "#d4cec3", "#e6dfd2"],
  golge: "#3a4048",
};

const KOYU: TemaRenkleri = {
  gok: "#121a21",
  sinif: {
    [S.DENIZ]: "#1a3340",
    [S.KARA]: "#1f262b",
    [S.YESIL]: "#21302a",
    [S.ORMAN]: "#1d2b25",
    [S.TARLA]: "#292b23",
    [S.SANAYI_ALAN]: "#25292d",
    [S.KONUT_ALAN]: "#24292c",
    [S.KURUM]: "#29292b",
    [S.YAYA]: "#2a2f33",
    [S.KUM]: "#2e2d27",
    [S.SU]: "#1a3340",
    [S.OTOYOL]: "#2a2f33",
    [S.ANA_YOL]: "#2d3236",
    [S.TALI_YOL]: "#30353a",
    [S.PATIKA]: "#2f3337",
    [S.RAY]: "#474a4e",
    [S.BINA]: "#4b545d",
    [S.BINA_CATI]: "#6d5a52",
    [S.SANAYI_BINA]: "#48515a",
    [S.SANAYI_CATI]: "#53606c",
    [S.KALDIRIM]: "#3a4046",
    [S.KENAR]: "#161b21",
  },
  izgara: "#c8d6e4",
  izgaraAlfa: 0.11,
  govde: "#c4c9cf",
  insaat: ["#5b5f63", "#7a6a52", "#6b7178", "#858c94"],
  golge: "#000000",
};

export interface YuruPaleti {
  koyu: boolean;
  gok: Rgb;
  /** SINIF_SAYISI × 3 (tekdüze dizi). */
  sinif: Float32Array;
  izgara: Rgb;
  izgaraAlfa: number;
  ben: Rgb;
  baskasi: Rgb;
  govde: Rgb;
  insaat: [Rgb, Rgb, Rgb, Rgb];
  golge: Rgb;
}

export function koyuMu(): boolean {
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function paletOku(): YuruPaleti {
  const koyu = koyuMu();
  const t = koyu ? KOYU : ACIK;
  const cs = getComputedStyle(document.documentElement);
  const tok = (ad: string, yedek: string): Rgb => hex(cs.getPropertyValue(ad).trim() || yedek);
  const sinif = new Float32Array(SINIF_SAYISI * 3);
  for (let i = 0; i < SINIF_SAYISI; i++) sinif.set(hex(t.sinif[i] ?? "#888888"), i * 3);
  return {
    koyu,
    gok: hex(t.gok),
    sinif,
    izgara: hex(t.izgara),
    izgaraAlfa: t.izgaraAlfa,
    ben: tok("--harita-ben", koyu ? "#6aa6ff" : "#1f5fbf"),
    baskasi: tok("--harita-baskasi", koyu ? "#8d96a0" : "#7d8792"),
    govde: hex(t.govde),
    insaat: t.insaat.map(hex) as YuruPaleti["insaat"],
    golge: hex(t.golge),
  };
}

export const rgbCss = (c: Rgb, a = 1): string => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

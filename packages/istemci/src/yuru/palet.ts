/**
 * Yürüyüş sahnesi paleti: tema belirteçlerinden (src/tasarim/belirtec.ts → tema.css `--yuru-*`, yalnız hex) okunur;
 * sahne ve harita aynı kaynaktan beslenir (L3 → L4 geçişinde zemin rengi sıçramaz). Doygun renk yalnız oyuncunun
 * mülkü ve karakter vurgusu içindir (`--sen`). Sınıf sırası karo-geometri.ts `S`.
 */
import { MARKA_RENK_SAYISI, markaRenkBelirteci } from "../tasarim/marka";
import { S, SINIF_SAYISI } from "./karo-geometri";

export type Rgb = [number, number, number];

const hex = (h: string): Rgb => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  const v = m ? parseInt(m[1]!, 16) : 0x888888;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

/** Sınıf → belirteç (yer, bina, çizgi). */
const SINIF_BELIRTEC: Record<number, string> = {
  [S.DENIZ]: "--yuru-su",
  [S.KARA]: "--yuru-zemin-kara",
  [S.YESIL]: "--yuru-cim",
  [S.ORMAN]: "--yuru-orman",
  [S.TARLA]: "--yuru-tarla",
  [S.SANAYI_ALAN]: "--yuru-sanayi-alan",
  [S.KONUT_ALAN]: "--yuru-konut-alan",
  [S.KURUM]: "--yuru-kurum",
  [S.YAYA]: "--yuru-yaya-yolu",
  [S.KUM]: "--yuru-kum",
  [S.SU]: "--yuru-su",
  [S.OTOYOL]: "--yuru-asfalt-otoyol",
  [S.ANA_YOL]: "--yuru-asfalt-ana",
  [S.TALI_YOL]: "--yuru-asfalt",
  [S.PATIKA]: "--yuru-patika",
  [S.RAY]: "--yuru-ray",
  [S.BINA]: "--yuru-fasad-krem",
  [S.BINA_CATI]: "--yuru-cati-duz-beton",
  [S.SANAYI_BINA]: "--yuru-sanayi-govde",
  [S.SANAYI_CATI]: "--yuru-sanayi-cati",
  [S.KALDIRIM]: "--yuru-kaldirim",
  [S.KENAR]: "--yuru-kenar",
  [S.KERB]: "--yuru-kerb-cizgi",
  [S.CATI_KIREMIT]: "--yuru-cati-kiremit",
  [S.CATI_KOYU_KIREMIT]: "--yuru-cati-koyu-kiremit",
  [S.CATI_ARDUVAZ]: "--yuru-cati-arduvaz",
};

const FASAD = ["--yuru-fasad-krem", "--yuru-fasad-badana", "--yuru-fasad-pembe", "--yuru-fasad-gri", "--yuru-fasad-seftali", "--yuru-fasad-ten"];
const TENTE = ["--yuru-tente", "--yuru-tente-2", "--yuru-tente-3", "--katman-pazar"];

export interface YuruPaleti {
  koyu: boolean;
  gok: Rgb;
  /** SINIF_SAYISI × 3 (tekdüze dizi). */
  sinif: Float32Array;
  /** Altı cephe tonu × 3 (bina tohumuyla seçilir; "mahalle dokusu"). */
  fasad: Float32Array;
  /** Dört tente rengi × 3 (giriş katı vitrini). */
  tente: Float32Array;
  cam: Rgb;
  /** Akşam (koyu tema) yanan pencere ışığı. */
  camIsik: Rgb;
  /** Yanan pencere oranı (açık temada 0). */
  isikOran: number;
  vitrin: Rgb;
  izgara: Rgb;
  izgaraAlfa: number;
  ben: Rgb;
  baskasi: Rgb;
  /** Karakter giysisi: üst (oyuncu rengiyle karışır), alt, ten. */
  govde: Rgb;
  giysiAlt: Rgb;
  ten: Rgb;
  insaat: [Rgb, Rgb, Rgb, Rgb];
  /** Marka renkleri (oyuncu paleti, MARKA_RENK_SAYISI × 3; dükkân tabelası ve şeridi). */
  marka: Float32Array;
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
  const cs = getComputedStyle(document.documentElement);
  const tok = (ad: string): Rgb => hex(cs.getPropertyValue(ad).trim() || "#888888");
  const sinif = new Float32Array(SINIF_SAYISI * 3);
  for (let i = 0; i < SINIF_SAYISI; i++) sinif.set(tok(SINIF_BELIRTEC[i] ?? "--yuru-zemin-kara"), i * 3);
  const fasad = new Float32Array(FASAD.length * 3);
  FASAD.forEach((ad, i) => fasad.set(tok(ad), i * 3));
  const tente = new Float32Array(TENTE.length * 3);
  TENTE.forEach((ad, i) => tente.set(tok(ad), i * 3));
  return {
    koyu,
    gok: tok("--yuru-gok"),
    sinif,
    fasad,
    tente,
    cam: tok("--yuru-cam"),
    camIsik: tok("--yuru-cam-aksam"),
    isikOran: koyu ? 0.34 : 0,
    vitrin: tok("--yuru-vitrin"),
    izgara: tok("--murekkep-2"),
    izgaraAlfa: koyu ? 0.12 : 0.13,
    ben: tok("--sen"),
    baskasi: tok("--murekkep-3"),
    govde: tok("--yuru-giysi-ust"),
    giysiAlt: tok("--yuru-giysi-alt"),
    ten: tok("--yuru-ten"),
    insaat: [tok("--yuru-insaat-0"), tok("--yuru-insaat-1"), tok("--yuru-insaat-2"), tok("--yuru-insaat-3")],
    marka: Float32Array.from({ length: MARKA_RENK_SAYISI * 3 }, (_, i) => tok(markaRenkBelirteci(Math.floor(i / 3)))[i % 3]!),
    golge: tok("--yuru-golge"),
  };
}

export const rgbCss = (c: Rgb, a = 1): string => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

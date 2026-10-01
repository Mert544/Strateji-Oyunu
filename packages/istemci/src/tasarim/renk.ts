/**
 * Renk matematiği (saf; yalnız üretim betiği ve testlerde kullanılır, çalışma zamanı paketine girmez):
 * OKLCH → sRGB (gamut eşlemeli: sabit L ve H'de kroma ikili aramayla düşürülür), onaltılık biçim,
 * WCAG 2.x kontrast oranı, Oklab uzaklığı (ΔE_OK × 100) ve renk körlüğü benzetimi (Machado, Oliveira, Fernandes 2009,
 * şiddet 1,0; doğrusal RGB'de).
 */

/** OKLCH üçlüsü: L (0–1), C (≥0), H (derece). */
export type Oklch = readonly [number, number, number];
/** Doğrusal olmayan sRGB, 0–1. */
export type Srgb = readonly [number, number, number];

const sinirla = (x: number): number => Math.min(1, Math.max(0, x));

function gammaKodla(x: number): number {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

function gammaCoz(x: number): number {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** OKLCH → doğrusal sRGB (gamut dışı olabilir). */
function oklchDogrusal([L, C, H]: Oklch): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const gamutta = (c: readonly number[]): boolean => c.every((x) => x >= -1e-6 && x <= 1 + 1e-6);

/** OKLCH → sRGB (0–1); gamut dışındaysa kroma sabit L ve H'de düşürülür. */
export function oklchSrgb(r: Oklch): Srgb {
  let d = oklchDogrusal(r);
  if (!gamutta(d)) {
    let alt = 0;
    let ust = r[1];
    for (let i = 0; i < 40; i++) {
      const orta = (alt + ust) / 2;
      if (gamutta(oklchDogrusal([r[0], orta, r[2]]))) alt = orta;
      else ust = orta;
    }
    d = oklchDogrusal([r[0], alt, r[2]]);
  }
  return [sinirla(gammaKodla(sinirla(d[0]))), sinirla(gammaKodla(sinirla(d[1]))), sinirla(gammaKodla(sinirla(d[2])))];
}

/** sRGB (0–1) → "#rrggbb" (küçük harf). */
export function srgbHex(c: Srgb): string {
  return "#" + c.map((x) => Math.round(sinirla(x) * 255).toString(16).padStart(2, "0")).join("");
}

/** "#rrggbb" → sRGB (0–1). */
export function hexSrgb(h: string): Srgb {
  const m = /^#([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) throw new Error(`geçersiz hex: ${h}`);
  const n = parseInt(m[1] as string, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const oklchHex = (r: Oklch): string => srgbHex(oklchSrgb(r));

/** sRGB → Oklab [L, a, b]. */
export function srgbOklab(c: Srgb): [number, number, number] {
  const [r, g, b] = c.map(gammaCoz) as [number, number, number];
  return dogrusalOklab([r, g, b]);
}

function dogrusalOklab([r, g, b]: readonly [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** sRGB → OKLCH (H derece, 0–360). */
export function srgbOklch(c: Srgb): Oklch {
  const [L, a, b] = srgbOklab(c);
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, C < 1e-4 ? 0 : H];
}

/** WCAG 2.x göreli parlaklık. */
export function parlaklik(c: Srgb): number {
  const [r, g, b] = c.map(gammaCoz) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x kontrast oranı (1–21). */
export function kontrast(a: string, b: string): number {
  const la = parlaklik(hexSrgb(a));
  const lb = parlaklik(hexSrgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type GormeTuru = "normal" | "protan" | "deutan" | "tritan";

/** Machado 2009, şiddet 1,0 (doğrusal RGB). */
const MACHADO: Record<Exclude<GormeTuru, "normal">, readonly number[]> = {
  protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

/** Renk körlüğü benzetimi sonrası Oklab. */
export function gormeOklab(hex: string, tur: GormeTuru): [number, number, number] {
  const [r, g, b] = hexSrgb(hex).map(gammaCoz) as [number, number, number];
  if (tur === "normal") return dogrusalOklab([r, g, b]);
  const m = MACHADO[tur];
  const s = (i: number): number => sinirla((m[i] as number) * r + (m[i + 1] as number) * g + (m[i + 2] as number) * b);
  return dogrusalOklab([s(0), s(3), s(6)]);
}

/** ΔE_OK × 100 (Oklab Öklid uzaklığı), isteğe bağlı renk körlüğü benzetimiyle. */
export function deltaE(a: string, b: string, tur: GormeTuru = "normal"): number {
  const x = gormeOklab(a, tur);
  const y = gormeOklab(b, tur);
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** Bir renk kümesinde çift bazında en küçük ΔE_OK. */
export function enKucukAyrim(renkler: readonly string[], tur: GormeTuru = "normal"): { deger: number; cift: [number, number] } {
  let deger = Infinity;
  let cift: [number, number] = [0, 0];
  for (let i = 0; i < renkler.length; i++)
    for (let j = i + 1; j < renkler.length; j++) {
      const d = deltaE(renkler[i] as string, renkler[j] as string, tur);
      if (d < deger) {
        deger = d;
        cift = [i, j];
      }
    }
  return { deger, cift };
}

/** "#rrggbb" + alfa → "rgba(r, g, b, a)". */
export function hexRgba(hex: string, a: number): string {
  const [r, g, b] = hexSrgb(hex).map((x) => Math.round(x * 255));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

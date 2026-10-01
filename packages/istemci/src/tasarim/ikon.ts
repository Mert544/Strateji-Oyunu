/**
 * Simgeler: Lucide (lucide-static 1.49.0, ISC; Feather türevleri MIT — src/tasarim/LUCIDE-LISANS.txt). Emoji ve Unicode glif
 * simgelerin yerine tek çizgi dili: 24 px ızgara, çizgi 1,75 (CSS `.ikon`). Semboller sayfaya bir kez `<symbol>` olarak
 * eklenir (ikon-veri.ts, yalnız kabuk paketinde); harita.js ve yuru.js yalnız bu küçük işlevi kullanır (`<use href>`).
 */
export const IKONLAR = [
  "arrow-down-right",
  "arrow-left",
  "arrow-up-right",
  "bell",
  "building",
  "check",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "circle",
  "circle-alert",
  "circle-check",
  "cloud-sun-rain",
  "coins",
  "compass",
  "construction",
  "eye",
  "factory",
  "flask-conical",
  "footprints",
  "globe",
  "hammer",
  "hourglass",
  "house",
  "info",
  "landmark",
  "layers",
  "map",
  "map-pin",
  "moon",
  "package",
  "pause",
  "play",
  "refresh-cw",
  "rotate-cw",
  "search",
  "settings",
  "shield",
  "sparkles",
  "sprout",
  "store",
  "sun",
  "sun-moon",
  "swords",
  "trees",
  "triangle",
  "triangle-alert",
  "truck",
  "undo-2",
  "wallet",
  "wheat",
  "wifi-off",
  "x",
] as const;

export type IkonAdi = (typeof IKONLAR)[number];

/** Satır içi SVG simge (sprite'a başvurur): `ikon("bell", 18)`. Dekoratif: aria-hidden. */
export function ikon(ad: IkonAdi, boy = 18, sinif = ""): string {
  return `<svg class="ikon${sinif ? " " + sinif : ""}" width="${boy}" height="${boy}" aria-hidden="true" focusable="false"><use href="#i-${ad}"></use></svg>`;
}

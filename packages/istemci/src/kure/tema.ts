/** Tema: CSS özel özelliklerinden (token) sahne paletini okur; açık/koyu tema değişince yeniden okunur. */
import { hexRgb } from "../veri/renkler";
import type { Palet, RGB } from "../veri/renkler";

export interface SahnePaleti {
  okyanus: RGB;
  okyanusDerin: RGB;
  kara: RGB;
  kara2: RGB;
  kutup: RGB;
  sinir: [number, number, number, number];
  kiyi: [number, number, number, number];
  bolgeCizgi: [number, number, number, number];
  secimCizgi: [number, number, number, number];
  atmosfer: RGB;
  atmosferGuc: number;
  yildizAlfa: number;
  gece: number;
  geceBolge: number;
  aksam: number;
  kenarIsik: RGB;
  desen: RGB;
  panel: RGB;
  murekkep: RGB;
  savas: RGB;
  kontur: RGB;
  seritKontur: RGB;
  zemin: string;
  palet: Palet;
}

function rgba(v: string): [number, number, number, number] {
  const m = /rgba?\(([^)]+)\)/.exec(v);
  if (m) {
    const p = (m[1] as string).split(",").map((x) => parseFloat(x));
    return [(p[0] ?? 0) / 255, (p[1] ?? 0) / 255, (p[2] ?? 0) / 255, p[3] ?? 1];
  }
  const c = hexRgb(v);
  return [c[0], c[1], c[2], 1];
}

export function paletiOku(): SahnePaleti {
  const cs = getComputedStyle(document.documentElement);
  const t = (n: string): string => cs.getPropertyValue(n).trim();
  const num = (n: string, vars: number): number => {
    const x = parseFloat(t(n));
    return Number.isNaN(x) ? vars : x;
  };
  const palet: Palet = {
    devlet: ["--d0", "--d1", "--d2", "--d3"].map((n) => hexRgb(t(n))),
    sahipsiz: hexRgb(t("--sahipsiz")),
    durum: {
      karsilanan: hexRgb(t("--k-karsilanan")),
      kismi: hexRgb(t("--k-kismi")),
      acik: hexRgb(t("--k-acik")),
      engelli: hexRgb(t("--k-engelli")),
      ilgisiz: hexRgb(t("--k-ilgisiz")),
      sahipsiz: hexRgb(t("--sahipsiz")),
    },
    kullanim: ["--u0", "--u1", "--u2", "--u3", "--u4"].map((n) => hexRgb(t(n))),
  };
  return {
    okyanus: hexRgb(t("--sahne-okyanus")),
    okyanusDerin: hexRgb(t("--sahne-okyanus-derin")),
    kara: hexRgb(t("--sahne-kara")),
    kara2: hexRgb(t("--sahne-kara2")),
    kutup: hexRgb(t("--sahne-kutup")),
    sinir: rgba(t("--sahne-sinir")),
    kiyi: rgba(t("--sahne-kiyi")),
    bolgeCizgi: rgba(t("--sahne-bolge-cizgi")),
    secimCizgi: rgba(t("--sahne-secim")),
    atmosfer: hexRgb(t("--sahne-atmosfer")),
    atmosferGuc: num("--sahne-atmosfer-guc", 0.6),
    yildizAlfa: num("--sahne-yildiz", 1),
    gece: num("--sahne-gece", 0.3),
    geceBolge: num("--sahne-gece-bolge", 0.6),
    aksam: num("--sahne-aksam", 1),
    kenarIsik: hexRgb(t("--sahne-kenar-isik")),
    desen: hexRgb(t("--desen-rgb")),
    panel: hexRgb(t("--panel")),
    murekkep: hexRgb(t("--ink")),
    savas: hexRgb(t("--savas")),
    kontur: hexRgb(t("--kontur")),
    seritKontur: hexRgb(t("--sahne-serit-kontur")),
    zemin: t("--sahne-zemin"),
    palet,
  };
}

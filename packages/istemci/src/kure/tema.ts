/** Tema: CSS özel özelliklerinden (token) sahne paletini okur; açık/koyu tema değişince yeniden okunur. */
import { hexRgb } from "../veri/renkler";
import type { Palet, RGB } from "../veri/renkler";
import type { RozetTuru } from "../veri/rozet";
import { OLAY_SIMGELERI } from "../veri/tarim";
import type { TarimPaleti } from "../veri/tarim";

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
  /** Durum rozeti renkleri (Okabe-Ito; şekil ayrıca anlam taşır). */
  rozet: Record<RozetTuru, RGB>;
  zemin: string;
  palet: Palet;
  /** Tarım görünümü: toprak verimliliği paleti. */
  tarim: TarimPaleti;
  /** Olay türü -> renk (tema belirteçlerinden; bilinmeyen türler `olayDiger`). */
  olay: Record<string, RGB>;
  olayDiger: RGB;
}


export function paletiOku(): SahnePaleti {
  const cs = getComputedStyle(document.documentElement);
  const t = (n: string): string => cs.getPropertyValue(n).trim();
  const num = (n: string, vars: number): number => {
    const x = parseFloat(t(n));
    return Number.isNaN(x) ? vars : x;
  };
  /** Belirteçler yalnız hex; saydamlık ayrı `-alfa` sayısıdır (tasarim/belirtec.ts). */
  const rgba = (n: string): [number, number, number, number] => {
    const c = hexRgb(t(n));
    return [c[0], c[1], c[2], num(`${n}-alfa`, 1)];
  };
  const palet: Palet = {
    devlet: ["--d0", "--d1", "--d2", "--d3"].map((n) => hexRgb(t(n))),
    sahipsiz: hexRgb(t("--sahipsiz")),
    sen: hexRgb(t("--sen")),
    durum: {
      karsilanan: hexRgb(t("--k-karsilanan")),
      kismi: hexRgb(t("--k-kismi")),
      acik: hexRgb(t("--k-acik")),
      engelli: hexRgb(t("--k-engelli")),
      ilgisiz: hexRgb(t("--k-ilgisiz")),
      sahipsiz: hexRgb(t("--sahipsiz")),
    },
    notr: hexRgb(t("--genel-notr")),
    sanayi: ["--s0", "--s1", "--s2", "--s3", "--s4"].map((n) => hexRgb(t(n))),
    pazar: ["--p0", "--p1", "--p2", "--p3", "--p4"].map((n) => hexRgb(t(n))),
  };
  const olay: Record<string, RGB> = {};
  for (const [tur, sim] of Object.entries(OLAY_SIMGELERI)) olay[tur] = hexRgb(t(sim.renkDegiskeni));
  return {
    olay,
    olayDiger: hexRgb(t("--olay-diger")),
    tarim: { toprak: ["--t0", "--t1", "--t2", "--t3", "--t4"].map((n) => hexRgb(t(n))), tarimDisi: hexRgb(t("--tarim-disi")) },
    okyanus: hexRgb(t("--sahne-okyanus")),
    okyanusDerin: hexRgb(t("--sahne-okyanus-derin")),
    kara: hexRgb(t("--sahne-kara")),
    kara2: hexRgb(t("--sahne-kara-2")),
    kutup: hexRgb(t("--sahne-kutup")),
    sinir: rgba("--sahne-sinir"),
    kiyi: rgba("--sahne-kiyi"),
    bolgeCizgi: rgba("--sahne-bolge-cizgi"),
    secimCizgi: rgba("--sahne-secim"),
    atmosfer: hexRgb(t("--sahne-atmosfer")),
    atmosferGuc: num("--sahne-atmosfer-guc", 0.6),
    yildizAlfa: num("--sahne-yildiz", 1),
    gece: num("--sahne-gece", 0.3),
    geceBolge: num("--sahne-gece-bolge", 0.6),
    aksam: num("--sahne-aksam", 1),
    kenarIsik: hexRgb(t("--sahne-kenar-isik")),
    desen: hexRgb(t("--desen-rgb")),
    panel: hexRgb(t("--yuzey")),
    murekkep: hexRgb(t("--murekkep")),
    rozet: { savas: hexRgb(t("--rozet-savas")), eksik: hexRgb(t("--rozet-eksik")), bosta: hexRgb(t("--rozet-bosta")), bitti: hexRgb(t("--rozet-bitti")) },
    zemin: t("--sahne-uzay"),
    palet,
  };
}

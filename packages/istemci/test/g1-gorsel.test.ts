/**
 * G1 görsel: mülk kipi küresi (nötr dolgu), yürüyüşte arsa köşe kazıkları ve L3 sahiplik dolgusunun yakında sönmesi.
 * DOM/GL yok: saf işlevler ve katman geometrisi.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Scene, ShaderMaterial } from "three";
import type { IlceSahipligi } from "../src/harita/baglanti";
import { sahiplikBoyasi } from "../src/harita/stil";
import { mulkDolguRengi, mulkRenkleri } from "../src/kure/mulk-kipi";
import { deltaE, hexSrgb, srgbHex } from "../src/tasarim/renk";
import { ArsaKatmani } from "../src/yuru/arsa";
import type { YuruPaleti } from "../src/yuru/palet";
import { bolgeTamponuOlustur } from "../src/veri/renkler";
import type { Palet, RGB } from "../src/veri/renkler";

const palet: Palet = {
  devlet: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0]],
  sahipsiz: [0.5, 0.5, 0.5],
  sen: [0, 0.47, 0.51],
  durum: { karsilanan: [0, 1, 0], kismi: [1, 1, 0], acik: [1, 0, 0], engelli: [0, 0, 0], ilgisiz: [0.5, 0.5, 0.5], sahipsiz: [0.5, 0.5, 0.5] },
  notr: [0.9, 0.88, 0.85],
  sanayi: [],
  pazar: [],
};

describe("mülk kipi küresi", () => {
  it("bütün bölgeler tek nötr tonda; desen ve glif yok; devlet ya da Sen rengi karışmaz", () => {
    const kara: RGB = [0.95, 0.94, 0.9];
    const t = bolgeTamponuOlustur(7);
    t.desen.fill(3);
    t.glif.fill(5);
    const panel: RGB = [0.99, 0.98, 0.96];
    mulkRenkleri(7, palet, kara, panel, t);
    const beklenen = mulkDolguRengi(palet, kara, panel);
    for (let i = 0; i < 7; i++) {
      for (let c = 0; c < 3; c++) expect(t.renk[3 * i + c]).toBeCloseTo(beklenen[c] as number, 5);
      expect(t.desen[i]).toBe(0);
      expect(t.glif[i]).toBe(-1);
    }
    for (const d of [...palet.devlet, palet.sen as RGB]) expect(beklenen).not.toEqual(d);
  });
});

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "tasarim", "tema.css"), "utf8");
/** tema.css'ten bir temanın belirteçleri (açık: ilk `:root` bloğu; koyu: `:root[data-theme="dark"]` bloğu). */
function belirtecler(koyu: boolean): (ad: string) => string {
  const bas = koyu ? CSS.indexOf(':root[data-theme="dark"] {') : CSS.indexOf(":root {");
  const blok = CSS.slice(bas, CSS.indexOf("\n}", bas));
  return (ad) => new RegExp(`--${ad}: (#[0-9a-f]{6});`).exec(blok)?.[1] ?? "";
}
const hexRgb = (h: string): RGB => hexSrgb(h) as unknown as RGB;

describe("mülk kipi küresi: tema ayrımı", () => {
  for (const [ad, koyu] of [["açık", false], ["koyu", true]] as const) {
    it(`${ad}: nötr dolgu su'dan ayrışır (açık ≥ 10, koyu ≥ 6); Sen işareti dolgudan belirgin (≥ 30)`, () => {
      const t = belirtecler(koyu);
      const p: Palet = { ...palet, notr: hexRgb(t("genel-notr")) };
      const dolgu = srgbHex(mulkDolguRengi(p, hexRgb(t("sahne-kara")), hexRgb(t("yuzey"))));
      expect(deltaE(dolgu, t("sahne-okyanus"))).toBeGreaterThanOrEqual(koyu ? 6 : 10);
      expect(deltaE(t("sen"), dolgu)).toBeGreaterThanOrEqual(30);
    });
  }
});

function sahiplik(hucreler: string[], sahip = "ben"): IlceSahipligi {
  return { ilce: "x", uygun: 1000, satilmis: hucreler.length, hucreler: new Map(hucreler.map((id) => [id, { sahip, sinif: "kirsal" as const, degerMili: 1, alinma: 0 }])) };
}

const yuruPaleti = {
  koyu: false,
  ben: [0, 0.47, 0.51],
  baskasi: [0.5, 0.5, 0.5],
  sinif: new Float32Array(120),
  insaat: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]],
  izgara: [0.5, 0.5, 0.5],
  izgaraAlfa: 0.1,
} as unknown as YuruPaleti;

function katman(s: IlceSahipligi): ArsaKatmani {
  const m = (): ShaderMaterial => new ShaderMaterial();
  const k = new ArsaKatmani(new Scene(), { X0: 0, Y0: 0, k: 29 }, yuruPaleti, { izgara: m(), dolgu: m(), kenar: m(), kutu: m() });
  k.veriAyarla(s, "ben", []);
  return k;
}

describe("yürüyüş: arsa köşe kazıkları", () => {
  it("tek hücre: dört köşe", () => {
    expect(katman(sahiplik(["10:10"])).arsaKoseleri()).toHaveLength(4);
  });
  it("düz kenar ortası ve iç nokta kazık almaz: 1x3 şerit 4 köşe, 3x3 blok 4 köşe", () => {
    expect(katman(sahiplik(["10:10", "11:10", "12:10"])).arsaKoseleri()).toHaveLength(4);
    const blok: string[] = [];
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) blok.push(`${10 + x}:${10 + y}`);
    expect(katman(sahiplik(blok)).arsaKoseleri()).toHaveLength(4);
  });
  it("L biçimi altı köşe (beşi dışbükey, biri içbükey); çapraz iki hücre yedi köşe", () => {
    expect(katman(sahiplik(["10:10", "11:10", "10:11"])).arsaKoseleri()).toHaveLength(6);
    expect(katman(sahiplik(["10:10", "11:11"])).arsaKoseleri()).toHaveLength(7);
  });
  it("başkasının hücresi ve sahipsiz yer kazık almaz; sıra deterministik", () => {
    expect(katman(sahiplik(["10:10"], "bot")).arsaKoseleri()).toEqual([]);
    const a = katman(sahiplik(["11:10", "10:10", "10:11"])).arsaKoseleri();
    expect(katman(sahiplik(["10:11", "10:10", "11:10"])).arsaKoseleri()).toEqual(a);
  });
});

describe("L3 sahiplik boyası", () => {
  const r = (): string => "#017783";
  it("varsayılan görünümde Sen dolgusu yakınlaşınca söner; Sahiplik merceğinde sabit", () => {
    const v = sahiplikBoyasi(r, false).dolgu["fill-opacity"] as unknown[];
    expect(v[0]).toBe("interpolate");
    expect(JSON.stringify(v)).toContain("0.14");
    expect(sahiplikBoyasi(r, true).dolgu["fill-opacity"]).toEqual(["case", ["==", ["get", "ben"], 1], 0.5, 0.5]);
  });
});

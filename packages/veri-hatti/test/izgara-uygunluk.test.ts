/**
 * Uygunluk kırpma: sentetik Protomaps v4 karosu (vt-pbf ile kodlanır) -> hücre durum baytları.
 * Karo 32x32 hücre, extent 4096 -> hücre = 128 birim, alt örnek aralığı 16 birim (ORNEK=8).
 */
import { createRequire } from "node:module";
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { describe, expect, it } from "vitest";
import { noktadanHucre } from "../src/osm/izgara-geometri";
import {
  Bit,
  KATMAN_SAYISI,
  Sinif,
  VARSAYILAN_SECENEKLER,
  durumSinifi,
  hucreDurumu,
  karoyuOrnekle,
  metrePerBirim,
  satinAlinabilir,
  sekilleriAyikla,
} from "../src/osm/izgara-uygunluk";

type Koord = [number, number];
interface SahteOzellik {
  type: 1 | 2 | 3;
  geometry: Koord[][];
  tags: Record<string, string | number | boolean>;
}
const vtpbf = createRequire(import.meta.url)("vt-pbf") as {
  fromGeojsonVt: (k: Record<string, { features: SahteOzellik[] }>, s?: { version?: number; extent?: number }) => Uint8Array;
};

const TY = noktadanHucre(29.43, 40.8).y >>> 5; // Gebze z15 satırı
const MPB = metrePerBirim(TY, 4096);

const cizgi = (kind: string, noktalar: Koord[], ek: Record<string, string | boolean> = {}): SahteOzellik => ({
  type: 2,
  geometry: [noktalar],
  tags: { kind, ...ek },
});
const dortgen = (kind: string, x0: number, y0: number, x1: number, y1: number): SahteOzellik => ({
  type: 3,
  geometry: [
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
      [x0, y0],
    ],
  ],
  tags: { kind },
});

function karo(katmanlar: Record<string, SahteOzellik[]>): VectorTile {
  const giris = Object.fromEntries(Object.entries(katmanlar).map(([k, f]) => [k, { features: f }]));
  return new VectorTile(new PbfReader(vtpbf.fromGeojsonVt(giris, { version: 2, extent: 4096 })));
}

/** 32x32 durum baytı ve bina yüzdesi. */
function isle(katmanlar: Record<string, SahteOzellik[]>): { durum: number[][]; bina: number[][]; sayac: Uint8Array } {
  const sayac = karoyuOrnekle(sekilleriAyikla(karo(katmanlar)), 4096, MPB);
  const durum: number[][] = [];
  const bina: number[][] = [];
  for (let hy = 0; hy < 32; hy++) {
    durum.push([]);
    bina.push([]);
    for (let hx = 0; hx < 32; hx++) {
      const h = hucreDurumu(sayac, (hy * 32 + hx) * KATMAN_SAYISI);
      durum[hy]!.push(h.durum);
      bina[hy]!.push(h.binaYuzde);
    }
  }
  return { durum, bina, sayac };
}

const bitli = (d: number[][], bit: number): string[] => {
  const s: string[] = [];
  d.forEach((satir, y) => satir.forEach((v, x) => v & bit && s.push(`${x},${y}`)));
  return s;
};

describe("uygunluk kirpma", () => {
  it("metre/birim Gebze'de ~0,226 (12 m ~ 53 birim, 6 m ~ 27 birim)", () => {
    expect(MPB).toBeGreaterThan(0.22);
    expect(MPB).toBeLessThan(0.232);
  });

  it("yatay ana yol hucre sinirinda: yalniz iki komsu satir engellenir", () => {
    const { durum } = isle({ roads: [cizgi("major_road", [[-64, 2048], [4160, 2048]])] });
    const yol = bitli(durum, Bit.YOL);
    expect(yol).toHaveLength(64);
    expect(yol.every((k) => ["15", "16"].includes(k.split(",")[1]!))).toBe(true);
    expect(satinAlinabilir(durum[14]![0]!)).toBe(true);
    expect(satinAlinabilir(durum[15]![0]!)).toBe(false);
  });

  it("tunel, patika ve feribot engel degil", () => {
    const { durum } = isle({
      roads: [
        cizgi("major_road", [[0, 1000], [4096, 1000]], { is_tunnel: true }),
        cizgi("path", [[0, 2000], [4096, 2000]], { kind_detail: "footway" }),
        cizgi("ferry", [[0, 3000], [4096, 3000]]),
      ],
    });
    expect(bitli(durum, Bit.YOL)).toEqual([]);
  });

  it("tampon genisligi: ana yol (12 m) komsu sutuna tasar, diger yol (6 m) tasmaz", () => {
    // Çizgi x=148: sütun 0'ın son alt örneği x=120 -> 28 birim (~6,3 m) uzakta
    const dikey = (kind: string): SahteOzellik => cizgi(kind, [[148, -64], [148, 4160]]);
    const diger = isle({ roads: [dikey("minor_road")] }).durum;
    const ana = isle({ roads: [dikey("highway")] }).durum;
    expect(new Set(bitli(diger, Bit.YOL).map((k) => k.split(",")[0]))).toEqual(new Set(["1"]));
    expect(new Set(bitli(ana, Bit.YOL).map((k) => k.split(",")[0]))).toEqual(new Set(["0", "1"]));
  });

  it("su poligonu kapsadigi hucreleri isaretler; havuz isaretlemez", () => {
    const { durum } = isle({ water: [dortgen("ocean", 0, 0, 512, 512), dortgen("swimming_pool", 2048, 2048, 2200, 2200)] });
    const su = bitli(durum, Bit.SU);
    expect(su).toHaveLength(16);
    expect(su).toContain("3,3");
    expect(su).not.toContain("4,0");
  });

  it("delikli poligon: ic halka kapsanmaz", () => {
    const f: SahteOzellik = {
      type: 3,
      geometry: [
        [[2048, 2048], [2560, 2048], [2560, 2560], [2048, 2560], [2048, 2048]],
        [[2176, 2176], [2176, 2432], [2432, 2432], [2432, 2176], [2176, 2176]],
      ],
      tags: { kind: "water" },
    };
    const su = bitli(isle({ water: [f] }).durum, Bit.SU);
    expect(su).toHaveLength(12);
    expect(su).not.toContain("17,17");
    expect(su).toContain("16,16");
  });

  it("askeri alan: hucre icindeki kucuk poligon yalniz o hucreyi engeller", () => {
    const { durum } = isle({ landuse: [dortgen("military", 5 * 128 + 40, 5 * 128 + 40, 5 * 128 + 80, 5 * 128 + 80)] });
    expect(bitli(durum, Bit.ASKERI)).toEqual(["5,5"]);
    expect(satinAlinabilir(durum[5]![5]!)).toBe(false);
  });

  it("arazi sinifi: baskin sinif >= %30, aksi halde bina >= %10 ise yapili, yoksa diger", () => {
    const x = 10 * 128;
    const y = 10 * 128;
    const { durum, bina } = isle({
      landuse: [
        dortgen("farmland", x, y, x + 64, y + 128), // hücre (10,10): %50 tarla
        dortgen("farmland", x + 128, y, x + 128 + 16, y + 128), // (11,10): %12,5 tarla
        dortgen("industrial", x + 256, y, x + 384, y + 128), // (12,10): tam sanayi
        dortgen("residential", x + 256, y, x + 256 + 64, y + 128), // (12,10): %50 konut (sanayi baskın)
        dortgen("wood", x + 384, y, x + 512, y + 128), // (13,10): orman
      ],
      buildings: [dortgen("building", x + 128 + 64, y, x + 128 + 96, y + 128)], // (11,10): %25 bina
    });
    expect(durumSinifi(durum[10]![10]!)).toBe(Sinif.TARLA);
    expect(durumSinifi(durum[10]![11]!)).toBe(Sinif.YAPILI);
    expect(bina[10]![11]).toBe(25);
    expect(durum[10]![11]! & Bit.BINA).toBeTruthy();
    expect(satinAlinabilir(durum[10]![11]!)).toBe(true); // bina bilgi amaçlı, engel değil
    expect(durumSinifi(durum[10]![12]!)).toBe(Sinif.SANAYI);
    expect(durumSinifi(durum[10]![13]!)).toBe(Sinif.ORMAN);
    expect(durumSinifi(durum[0]![0]!)).toBe(Sinif.DIGER);
    expect(durum[0]![0]).toBe(Bit.ICERIDE);
  });

  it("esik secenegi: kapsama esigi kesisimden gevsek", () => {
    const sayac = karoyuOrnekle(sekilleriAyikla(karo({ roads: [cizgi("minor_road", [[0, 2048], [4096, 2048]])] })), 4096, MPB);
    const of = (15 * 32) * KATMAN_SAYISI;
    expect(hucreDurumu(sayac, of).durum & Bit.YOL).toBeTruthy();
    const gevsek = { ...VARSAYILAN_SECENEKLER, yolEsik: 32 };
    expect(hucreDurumu(sayac, of, gevsek).durum & Bit.YOL).toBe(0);
  });

  it("deterministik ve ozellik sirasindan bagimsiz", () => {
    const ozellikler = [
      cizgi("major_road", [[0, 0], [4096, 4096]]),
      cizgi("minor_road", [[4096, 0], [0, 4096]]),
      cizgi("rail", [[1000, 0], [1000, 4096]]),
    ];
    const a = isle({ roads: ozellikler, water: [dortgen("lake", 3000, 100, 3500, 900)] }).sayac;
    const b = isle({ roads: ozellikler, water: [dortgen("lake", 3000, 100, 3500, 900)] }).sayac;
    const c = isle({ water: [dortgen("lake", 3000, 100, 3500, 900)], roads: [...ozellikler].reverse() }).sayac;
    expect(Buffer.from(b).equals(Buffer.from(a))).toBe(true);
    expect(Buffer.from(c).equals(Buffer.from(a))).toBe(true);
  });
});

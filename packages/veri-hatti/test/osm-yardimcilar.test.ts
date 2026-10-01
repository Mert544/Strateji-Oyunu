/**
 * OSM alt hattının saf yardımcıları: ASCII kimlik, halka kurma, iç halka eşleme, küresel alan, yapılandırma.
 * Ağ veya önbellek gerektirmez.
 */
import { describe, expect, it } from "vitest";
import { cokgenAlaniKm2, halkalariKur, halkaAlaniKm2, iliskiGeometrisi, type OsmVeri } from "../src/osm/halka";
import { asciiKimlik, KIMLIK_BICIMI, latinAd, mikro } from "../src/osm/ortak";
import { osmYapilandirmaOku, overpassSorgusu } from "../src/osm/yapilandirma";
import { yapilandirmaOku } from "../src/yapilandirma";
import type { Nokta } from "../src/cografya";

describe("ASCII kimlik ve harf cevirisi", () => {
  it("Turkce, Rumence, Bulgarca ve Yunanca adlar", () => {
    expect(asciiKimlik("Kadıköy")).toBe("kadikoy");
    expect(asciiKimlik("İstanbul")).toBe("istanbul");
    expect(asciiKimlik("Şanlıurfa")).toBe("sanliurfa");
    expect(asciiKimlik("Çağlayancerit")).toBe("caglayancerit");
    expect(asciiKimlik("Constanța")).toBe("constanta");
    expect(asciiKimlik("Велико Търново")).toBe("veliko_tarnovo");
    expect(asciiKimlik("Θεσσαλονίκη")).toBe("thessaloniki");
    expect(asciiKimlik("Βόρειο Αιγαίο")).toBe("voreio_aigaio");
    expect(asciiKimlik("!!!")).toBe("x");
    for (const s of ["Kadıköy", "Велико Търново", "Θεσσαλονίκη", "Iași"]) expect(`tr_${asciiKimlik(s)}`).toMatch(KIMLIK_BICIMI);
    expect(latinAd("Велико Търново")).toBe("Veliko Tarnovo");
  });
  it("mikro derece tamsayi", () => {
    expect(mikro(41.0082376)).toBe(41008238);
    expect(mikro(-0.0000004)).toBe(-0);
  });
});

describe("halka kurma", () => {
  it("ters yonlu parcalari birlestirir, acik zinciri sayar", () => {
    const r = halkalariKur([
      [1, 2, 3],
      [5, 4, 3], // ters yönlü
      [5, 6, 1],
      [10, 11, 12], // kapanmaz
      [20, 21, 22, 20], // kapalı yol
    ]);
    expect(r.halkalar).toEqual([[20, 21, 22, 20], [1, 2, 3, 4, 5, 6, 1]]);
    expect(r.acikZincir).toBe(1);
  });

  it("ic halkayi kapsayan dis halkaya delik olarak ekler", () => {
    const dugumler = new Map<number, Nokta>([
      [1, [0, 0]], [2, [4, 0]], [3, [4, 4]], [4, [0, 4]],
      [11, [1, 1]], [12, [2, 1]], [13, [2, 2]], [14, [1, 2]],
      [21, [10, 10]], [22, [11, 10]], [23, [11, 11]],
    ]);
    const veri: OsmVeri = {
      dugumler,
      yollar: new Map([
        [100, [1, 2, 3]],
        [101, [3, 4, 1]],
        [102, [11, 12, 13, 14, 11]],
        [103, [21, 22, 23, 21]],
      ]),
      iliskiler: new Map(),
    };
    const g = iliskiGeometrisi(
      {
        id: 1,
        tags: {},
        members: [
          { type: "way", ref: 100, role: "outer" },
          { type: "way", ref: 101, role: "" },
          { type: "way", ref: 102, role: "inner" },
          { type: "way", ref: 103, role: "outer" },
          { type: "way", ref: 999, role: "outer" },
          { type: "node", ref: 1, role: "admin_centre" },
        ],
      },
      veri,
    );
    expect(g.cokgenler.length).toBe(2);
    expect(g.cokgenler[0]?.length).toBe(2); // büyük dış halka + delik
    expect(g.cokgenler[1]?.length).toBe(1);
    expect(g.sorunlar).toEqual(["1 uye yol veride yok"]);
    expect(g.alanKm2).toBeCloseTo(cokgenAlaniKm2(g.cokgenler[0]!) + cokgenAlaniKm2(g.cokgenler[1]!), 6);
  });

  it("kuresel alan: ekvatorda 1x1 derece ~12 364 km2", () => {
    const kare: Nokta[] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    expect(Math.abs(halkaAlaniKm2(kare))).toBeGreaterThan(12_300);
    expect(Math.abs(halkaAlaniKm2(kare))).toBeLessThan(12_400);
  });
});

describe("OSM yapilandirmasi", () => {
  const osm = osmYapilandirmaOku();
  it("gecerli ve Turkiye il=4, ilce=6", () => {
    const tr = osm.ulkeler.find((u) => u.kod === "tr");
    expect(tr?.ilSeviyesi).toBe(4);
    expect(tr?.ilceSeviyesi).toBe(6);
    expect(overpassSorgusu(tr!)).toContain('"admin_level"~"^(4|6)$"');
    expect(overpassSorgusu(tr!)).toContain("area(id:3600174737)");
  });
  it("elle il -> bolge duzeltmeleri bilinen bolgelere isaret eder", () => {
    const bolgeler = new Set(yapilandirmaOku().bolgeler.map((b) => b.id));
    for (const [il, b] of Object.entries(osm.ilBolgeDuzeltmeleri)) {
      expect(il).toMatch(KIMLIK_BICIMI);
      expect(bolgeler.has(b), `${il} -> ${b}`).toBe(true);
    }
  });
});

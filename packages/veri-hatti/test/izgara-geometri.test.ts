/**
 * z20 hücre geometrisi: koordinat dönüşümleri, sınırlar, boyut, kimlik/quadkey gidiş-dönüş ve
 * idari sınırdan içerde maskesi.
 */
import { describe, expect, it } from "vitest";
import {
  boylamdanX,
  enlemdenY,
  hucreKenariMetre,
  hucreKimligi,
  hucreMerkezi,
  hucreSiniri,
  kimliktenHucre,
  noktadanHucre,
  quadkey,
  quadkeyCoz,
  xtenBoylam,
  ytenEnlem,
  z15Ebeveyn,
} from "../src/osm/izgara-geometri";
import { icerdeMaskesi, yollariHalkalaraBirlestir, type Halka } from "../src/osm/izgara-sinir";

describe("z20 hucre geometrisi", () => {
  it("nokta kendi hucresinin sinirlari icinde, merkez geri ayni hucreye duser", () => {
    for (const [lon, lat] of [
      [29.4318, 40.8007], // Gebze merkezi
      [29.9408, 40.7654], // İzmit
      [-0.0001, -0.0001],
      [179.99, 84.9],
    ] as const) {
      const h = noktadanHucre(lon, lat);
      const [b, g, d, k] = hucreSiniri(h.x, h.y);
      expect(lon).toBeGreaterThanOrEqual(b);
      expect(lon).toBeLessThan(d);
      expect(lat).toBeGreaterThan(g);
      expect(lat).toBeLessThanOrEqual(k);
      const [mlon, mlat] = hucreMerkezi(h.x, h.y);
      expect(noktadanHucre(mlon, mlat)).toEqual(h);
    }
  });

  it("komsu hucreler kenar paylasir (bosluk/bindirme yok)", () => {
    const { x, y } = noktadanHucre(29.43, 40.8);
    expect(hucreSiniri(x, y)[2]).toBe(hucreSiniri(x + 1, y)[0]);
    expect(hucreSiniri(x, y)[1]).toBe(hucreSiniri(x, y + 1)[3]);
  });

  it("donusumler birbirinin tersi", () => {
    for (const v of [0, 1, 123456.75, 2 ** 20 - 1]) {
      expect(boylamdanX(xtenBoylam(v))).toBeCloseTo(v, 6);
      expect(enlemdenY(ytenEnlem(v))).toBeCloseTo(v, 6);
    }
  });

  it("hucre kenari ekvatorda ~38,2 m, Gebze'de ~28,9 m; kare (D-B = K-G metre)", () => {
    expect(hucreKenariMetre(2 ** 19)).toBeCloseTo(38.22, 1);
    const { x, y } = noktadanHucre(29.43, 40.8);
    const m = hucreKenariMetre(y);
    expect(m).toBeGreaterThan(28.5);
    expect(m).toBeLessThan(29.3);
    // Küresel yaklaşımla kenar uzunlukları
    const [b, g, d, k] = hucreSiniri(x, y);
    const R = 6_378_137;
    const rad = Math.PI / 180;
    const db = (d - b) * rad * R * Math.cos(((g + k) / 2) * rad);
    const kg = (k - g) * rad * R;
    expect(Math.abs(db - kg) / m).toBeLessThan(0.001);
    expect(Math.abs(db - m) / m).toBeLessThan(0.001);
  });

  it("quadkey: bilinen deger ve gidis-donus", () => {
    // Bing örneği: z3 x=3 y=5 -> "213"
    expect(quadkey(3, 5, 3)).toBe("213");
    expect(quadkeyCoz("213")).toEqual({ x: 3, y: 5, z: 3 });
    const { x, y } = noktadanHucre(29.43, 40.8);
    const q = quadkey(x, y);
    expect(q).toHaveLength(20);
    expect(quadkeyCoz(q)).toEqual({ x, y, z: 20 });
  });

  it("hucre kimligi: gidis-donus, quadkey ile ayni sira, z15 ebeveyn = kimlik / 1024", () => {
    const ornekler = [
      [0, 0],
      [2 ** 20 - 1, 2 ** 20 - 1],
      [610_123, 393_877],
      [noktadanHucre(29.43, 40.8).x, noktadanHucre(29.43, 40.8).y],
    ] as [number, number][];
    for (const [x, y] of ornekler) {
      const k = hucreKimligi(x, y);
      expect(Number.isSafeInteger(k)).toBe(true);
      expect(kimliktenHucre(k)).toEqual({ x, y });
      expect(k).toBe(parseInt(quadkey(x, y), 4));
      const e = z15Ebeveyn(x, y);
      expect(Math.floor(k / 1024)).toBe(parseInt(quadkey(e.x, e.y, 15), 4));
    }
    expect(hucreKimligi(2 ** 20 - 1, 2 ** 20 - 1)).toBe(2 ** 40 - 1);
    expect(() => kimliktenHucre(2 ** 40)).toThrow();
  });
});

describe("idari sinir -> icerde maskesi", () => {
  // Hücre köşelerine hizalı kare: x 1000..1010, y 2000..2005 (z20) -> 10x5 = 50 hücre
  const kose = (x: number, y: number): [number, number] => [xtenBoylam(x), ytenEnlem(y)];
  const kare: Halka = [kose(1000, 2000), kose(1010, 2000), kose(1010, 2005), kose(1000, 2005), kose(1000, 2000)];

  it("hizali karenin hucre sayisi tam", () => {
    const m = icerdeMaskesi([kare]);
    expect(m.sayi).toBe(50);
    expect(m.x0).toBe(1000);
    expect(m.y0).toBe(2000);
  });

  it("delik (ic halka) cikarilir", () => {
    const delik: Halka = [kose(1002, 2001), kose(1004, 2001), kose(1004, 2003), kose(1002, 2003), kose(1002, 2001)];
    expect(icerdeMaskesi([kare, delik]).sayi).toBe(50 - 4);
  });

  it("parcali yollar sira/yon farketmeksizin ayni halkaya birlesir", () => {
    const yollar = [kare.slice(0, 2), kare.slice(1, 4), kare.slice(3)];
    const a = yollariHalkalaraBirlestir(yollar);
    const b = yollariHalkalaraBirlestir([[...yollar[2]!].reverse(), yollar[0]!, [...yollar[1]!].reverse()]);
    expect(a).toHaveLength(1);
    expect(b).toEqual(a);
    expect(icerdeMaskesi(a).sayi).toBe(50);
    expect(() => yollariHalkalaraBirlestir([kare.slice(0, 3)])).toThrow(/kapanmiyor/);
  });

  it("merkez kurali: yarim hucre kaydirilmis kenar yalniz merkezi icerde kalanlari alir", () => {
    const m = icerdeMaskesi([[kose(0.4, 0.4), kose(3.6, 0.4), kose(3.6, 1.6), kose(0.4, 1.6), kose(0.4, 0.4)]]);
    // Merkezler 0.5..3.5 x 0.5..1.5 -> x 0..3, y 0..1
    expect(m.sayi).toBe(8);
  });
});

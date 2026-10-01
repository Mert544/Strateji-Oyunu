import { describe, expect, it } from "vitest";
import { hucreKenariMetre, hucreMerkezi, noktadanHucre } from "../src/harita/hucre";
import {
  cerceveKur,
  dunyaHucre,
  dunyaKaro,
  dunyaLl,
  hucreDunya,
  KARO_HUCRE,
  karoKenari,
  karoKokeni,
  karoPenceresi,
  llDunya,
  orijinGerekli,
  orijinKaydir,
  yerel,
} from "../src/yuru/koordinat";

// Gebze merkezi (Kocaeli)
const GEBZE: [number, number] = [29.4307, 40.8027];

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6_371_008.8;
  const r = Math.PI / 180;
  const dl = (b[1] - a[1]) * r;
  const dg = (b[0] - a[0]) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

describe("yürüyüş: yerel metre çerçevesi", () => {
  const c = cerceveKur(...GEBZE);

  it("orijin giriş noktasının z20 hücresidir ve ölçek hücre kenarıdır", () => {
    const h = noktadanHucre(...GEBZE);
    expect(c.X0).toBe(h.x);
    expect(c.Y0).toBe(h.y);
    expect(c.k).toBeGreaterThan(28);
    expect(c.k).toBeLessThan(30);
    expect(Math.abs(c.k - hucreKenariMetre(c.Y0)) / c.k).toBeLessThan(1e-5);
  });

  it("boylam/enlem ↔ dünya metresi gidiş-dönüş", () => {
    for (const [dx, dy] of [
      [0, 0],
      [0.01, -0.007],
      [-0.013, 0.009],
    ] as const) {
      const p: [number, number] = [GEBZE[0] + dx, GEBZE[1] + dy];
      const [x, z] = llDunya(c, ...p);
      const [lon, lat] = dunyaLl(c, x, z);
      expect(lon).toBeCloseTo(p[0], 10);
      expect(lat).toBeCloseTo(p[1], 10);
    }
  });

  it("eksenler: doğu +x, güney +z; uzaklık 2 km içinde %0,2'den iyi", () => {
    const [x1, z1] = llDunya(c, GEBZE[0] + 0.01, GEBZE[1]);
    expect(x1).toBeGreaterThan(0);
    const [x2, z2] = llDunya(c, GEBZE[0], GEBZE[1] - 0.01);
    expect(z2).toBeGreaterThan(0);
    expect(Math.abs(x2 - llDunya(c, ...GEBZE)[0])).toBeLessThan(1e-6);
    const a = llDunya(c, ...GEBZE);
    const b: [number, number] = [GEBZE[0] + 0.012, GEBZE[1] - 0.009];
    const bm = llDunya(c, ...b);
    const olcum = Math.hypot(bm[0] - a[0], bm[1] - a[1]);
    const gercek = haversine(GEBZE, b);
    expect(gercek).toBeGreaterThan(1200);
    // Fark çoğunlukla küre yarıçapı seçiminden: Web Mercator 6.378.137 m, haversine ortalama 6.371.009 m (%0,11).
    expect(Math.abs(olcum - gercek) / gercek).toBeLessThan(2e-3);
    void z1;
  });

  it("hücre ve karo dönüşümleri tutarlı", () => {
    const h = noktadanHucre(...GEBZE);
    const [hx, hz] = hucreDunya(c, h.x, h.y);
    expect(hx).toBe(0);
    expect(hz).toBe(0);
    const m = llDunya(c, ...hucreMerkezi(h.x + 3, h.y - 2));
    expect(dunyaHucre(c, m[0], m[1])).toEqual({ x: h.x + 3, y: h.y - 2 });
    expect(m[0]).toBeCloseTo(3.5 * c.k, 6);
    const k = dunyaKaro(c, 0, 0);
    expect(k).toEqual({ x: Math.floor(h.x / KARO_HUCRE), y: Math.floor(h.y / KARO_HUCRE) });
    expect(karoKokeni(c, k.x, k.y)).toEqual(hucreDunya(c, k.x * KARO_HUCRE, k.y * KARO_HUCRE));
    expect(karoKenari(c)).toBeCloseTo(32 * c.k, 9);
    expect(karoKenari(c)).toBeGreaterThan(900);
    expect(karoKenari(c)).toBeLessThan(950);
  });

  it("karo penceresi: 3×3, merkez önce", () => {
    const p = karoPenceresi({ x: 10, y: 20 });
    expect(p).toHaveLength(9);
    expect(p[0]).toEqual({ x: 10, y: 20 });
    expect(new Set(p.map((k) => `${k.x}/${k.y}`)).size).toBe(9);
  });
});

describe("yürüyüş: kayan orijin", () => {
  it("orijin kafes katına oturur ve yerel koordinatı küçük tutar", () => {
    const adim = 926.4;
    let o = { x: 0, z: 0 };
    expect(orijinGerekli(o, 300, -200, adim)).toBe(false);
    // Karakter 5 km doğuya ve 3 km güneye yürüdü
    const x = 5003.7;
    const z = 3001.2;
    expect(orijinGerekli(o, x, z, adim)).toBe(true);
    o = orijinKaydir(x, z, adim);
    expect(o.x / adim).toBe(Math.round(o.x / adim));
    expect(o.z / adim).toBe(Math.round(o.z / adim));
    const [lx, lz] = yerel(o, x, z);
    expect(Math.abs(lx)).toBeLessThanOrEqual(adim / 2);
    expect(Math.abs(lz)).toBeLessThanOrEqual(adim / 2);
    expect(orijinGerekli(o, x, z, adim)).toBe(false);
  });

  it("float32 hassasiyeti: dünya metresi yerine yerel değer milimetre altında kalır", () => {
    // Mutlak Mercator metresi (~3,3e7 m) float32'de ~2 m adımla yuvarlanır; yerel değer (< 1 km) ~0,06 mm.
    const c = cerceveKur(...GEBZE);
    const mutlakX = c.X0 * c.k + 1234.5678;
    expect(Math.abs(Math.fround(mutlakX) - mutlakX)).toBeGreaterThan(0.05);
    const dunyaX = 41_234.5678; // oturum orijininden 41 km uzakta
    const o = orijinKaydir(dunyaX, 0, karoKenari(c));
    const [lx] = yerel(o, dunyaX, 0);
    expect(Math.abs(Math.fround(lx) - lx)).toBeLessThan(1e-4);
    // İki komşu nokta (1 cm ayrık) yerel çerçevede ayırt edilir
    const [l2] = yerel(o, dunyaX + 0.01, 0);
    expect(Math.fround(l2) - Math.fround(lx)).toBeCloseTo(0.01, 4);
  });
});

import { describe, expect, it } from "vitest";
import { aci, buyukDaireYayi, carpim, isinKureKesisimi, llVek, nokta, slerp, uzunluk, vekLl, yayParcaSayisi, yayYuksekligi } from "../src/kure/matematik";
import type { Vek3 } from "../src/kure/matematik";

describe("enlem/boylam <-> küre koordinatı", () => {
  it("ana noktalar doğru eksenlere düşer", () => {
    const [x0, y0, z0] = llVek(0, 0);
    expect([x0, y0, z0].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([0, 0, 1]);
    const [x1, y1, z1] = llVek(90, 0);
    expect([x1, y1, z1].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([1, 0, 0]);
    const k = llVek(123, 90);
    expect(k[1]).toBeCloseTo(1, 9);
  });

  it("yarıçap uygulanır ve birim küre üzerinde uzunluk 1'dir", () => {
    expect(uzunluk(llVek(35, 41))).toBeCloseTo(1, 12);
    expect(uzunluk(llVek(35, 41, 1.5))).toBeCloseTo(1.5, 12);
  });

  it("vekLl llVek'in tersidir", () => {
    for (const [b, e] of [[0, 0], [29, 41], [-120, -33], [179.5, 60], [-60, -89]] as const) {
      const [b2, e2] = vekLl(llVek(b, e, 1.7));
      expect(b2).toBeCloseTo(b, 6);
      expect(e2).toBeCloseTo(e, 6);
    }
  });
});

describe("büyük daire yayı", () => {
  const a = llVek(28.97, 41.01); // İstanbul
  const b = llVek(32.86, 39.93); // Ankara

  it("n+1 nokta üretir; uçlar yüzeyde, orta nokta yükseltilmiş", () => {
    const n = 10;
    const p = buyukDaireYayi(a, b, n);
    expect(p.length).toBe((n + 1) * 3);
    const yr = (i: number): number => Math.hypot(p[3 * i] as number, p[3 * i + 1] as number, p[3 * i + 2] as number);
    expect(yr(0)).toBeCloseTo(1, 9);
    expect(yr(n)).toBeCloseTo(1, 9);
    expect(yr(n / 2)).toBeGreaterThan(1.001);
    expect(yr(n / 2)).toBeCloseTo(1 + yayYuksekligi(aci(a, b)), 9);
  });

  it("tüm noktalar iki uç ve merkezin oluşturduğu düzlemde (büyük daire)", () => {
    const normal = carpim(a, b);
    const p = buyukDaireYayi(a, b, 12, 0);
    for (let i = 0; i <= 12; i++) {
      const v: Vek3 = [p[3 * i] as number, p[3 * i + 1] as number, p[3 * i + 2] as number];
      expect(Math.abs(nokta(v, normal))).toBeLessThan(1e-12);
      expect(uzunluk(v)).toBeCloseTo(1, 12);
    }
  });

  it("slerp eşit aralıklı açılar verir", () => {
    const toplam = aci(a, b);
    for (const t of [0.25, 0.5, 0.75]) expect(aci(a, slerp(a, b, t))).toBeCloseTo(toplam * t, 9);
  });

  it("uzun yollar daha yüksek ve daha çok parçalı", () => {
    expect(yayYuksekligi(0.5)).toBeGreaterThan(yayYuksekligi(0.05));
    expect(yayParcaSayisi(1.0)).toBeGreaterThan(yayParcaSayisi(0.1));
    expect(yayParcaSayisi(0.001)).toBeGreaterThanOrEqual(6);
    expect(yayParcaSayisi(10)).toBeLessThanOrEqual(28);
  });
});

describe("ışın-küre kesişimi", () => {
  it("ön yüze çarpar; ıska geçen ışın null döner", () => {
    const o: Vek3 = [0, 0, 3];
    const p = isinKureKesisimi(o, [0, 0, -1]);
    expect(p).not.toBeNull();
    expect((p as Vek3)[2]).toBeCloseTo(1, 12);
    expect(isinKureKesisimi(o, [0, 1, 0])).toBeNull();
    expect(isinKureKesisimi(o, [1, 0, 0.0001])).toBeNull();
  });
});

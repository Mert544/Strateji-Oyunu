import { describe, expect, it } from "vitest";
import { aciYaklas, animasyonSec, cubukDegeri, hareketYonu, HIZ, ileriSag, kameraKonumu, kameraSinirla, yerKesisimi, yonAcisi, ziplaAdimi } from "../src/yuru/kontrol";

describe("yürüyüş: kamera ve kontrol matematiği", () => {
  it("yaw = 0: kamera güneyde, ileri kuzey (−z), sağ doğu (+x)", () => {
    const k = kameraKonumu([0, 1, 0], { yaw: 0, egim: 0, mesafe: 10 });
    expect(k[0]).toBeCloseTo(0);
    expect(k[1]).toBeCloseTo(1);
    expect(k[2]).toBeCloseTo(10);
    const { ileri, sag } = ileriSag(0);
    expect(ileri[0]).toBeCloseTo(0);
    expect(ileri[1]).toBeCloseTo(-1);
    expect(sag[0]).toBeCloseTo(1);
    expect(sag[1]).toBeCloseTo(0);
  });

  it("ileri yön her yaw için kameradan hedefe bakar", () => {
    for (const yaw of [0.3, 1.7, -2.4]) {
      const k = kameraKonumu([5, 0, -3], { yaw, egim: 0.4, mesafe: 12 });
      const [fx, fz] = hareketYonu(1, 0, yaw);
      const bx = 5 - k[0];
      const bz = -3 - k[2];
      const L = Math.hypot(bx, bz);
      expect(fx).toBeCloseTo(bx / L, 9);
      expect(fz).toBeCloseTo(bz / L, 9);
    }
  });

  it("çapraz tuş girdisi normalleşir", () => {
    const [x, z] = hareketYonu(1, 1, 0);
    expect(Math.hypot(x, z)).toBeCloseTo(1, 9);
    expect(hareketYonu(0, 0, 1)).toEqual([0, 0]);
  });

  it("bakış açısı ve açı yaklaştırma en kısa yoldan", () => {
    expect(yonAcisi(0, 1)).toBeCloseTo(0);
    expect(yonAcisi(1, 0)).toBeCloseTo(Math.PI / 2);
    expect(aciYaklas(3.0, -3.0, 0.1)).toBeCloseTo(3.1, 9); // +π sınırından geçer
    expect(aciYaklas(0, 1, 5)).toBeCloseTo(1, 9);
  });

  it("kamera sınırları", () => {
    const d = kameraSinirla({ yaw: 9, egim: 3, mesafe: 1000 });
    expect(d.egim).toBeLessThan(1.5);
    expect(d.mesafe).toBe(70);
    expect(d.yaw).toBe(9);
  });

  it("sanal çubuk: ölü bölge, yukarı ileri, büyüklük ≤ 1", () => {
    expect(cubukDegeri(2, 2, 50)).toEqual([0, 0]);
    const [i, s] = cubukDegeri(0, -50, 50);
    expect(i).toBeCloseTo(1);
    expect(s).toBeCloseTo(0);
    const [a, b] = cubukDegeri(100, 100, 50);
    expect(Math.hypot(a, b)).toBeCloseTo(1, 9);
  });

  it("yer düzlemi kesişimi", () => {
    expect(yerKesisimi([0, 10, 0], [0, -1, 0])).toEqual([0, 0]);
    const p = yerKesisimi([0, 10, 0], [Math.SQRT1_2, -Math.SQRT1_2, 0])!;
    expect(p[0]).toBeCloseTo(10);
    expect(yerKesisimi([0, 10, 0], [1, 0, 0])).toBeNull();
  });

  it("animasyon hıza göre seçilir; koşu ve depar belirgin", () => {
    expect(animasyonSec(0, false)).toBe("dur");
    expect(animasyonSec(HIZ.yuru, false)).toBe("yuru");
    expect(animasyonSec(HIZ.kos, false)).toBe("kos");
    expect(animasyonSec(HIZ.depar, false)).toBe("depar");
    expect(animasyonSec(HIZ.kos, true)).toBe("zipla");
    expect(HIZ.depar / HIZ.kos).toBeGreaterThan(1.5);
  });

  it("zıplama: yükselir, tepe ~0,85 m, ~0,65 s sonra yere iner", () => {
    let y = 0;
    let vy = 5.2;
    let tepe = 0;
    let t = 0;
    const dt = 1 / 60;
    do {
      [y, vy] = ziplaAdimi(y, vy, dt);
      tepe = Math.max(tepe, y);
      t += dt;
    } while (y > 0 && t < 3);
    expect(tepe).toBeGreaterThan(0.7);
    expect(tepe).toBeLessThan(1);
    expect(t).toBeGreaterThan(0.5);
    expect(t).toBeLessThan(0.8);
    expect(vy).toBe(0);
  });
});

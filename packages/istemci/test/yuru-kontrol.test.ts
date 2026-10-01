import { describe, expect, it } from "vitest";
import { aciYaklas, animasyonSec, arkaYaw, bakisNoktasi, cubukDegeri, ekranOrani, hareketYonu, HIZ, ileriSag, KAMERA_GORUS, KAMERA_SINIR, kameraKonumu, kameraSinirla, VARSAYILAN_KAMERA, yawTakip, yerKesisimi, yonAcisi, ZIPLA, ziplaAdimi } from "../src/yuru/kontrol";

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
    expect(d.mesafe).toBe(40);
    expect(kameraSinirla({ yaw: 0, egim: 0, mesafe: 1 }).mesafe).toBe(6);
    expect(d.yaw).toBe(9);
  });

  it("varsayılan kamera: arkada ve hafif üstte (10–14 m, 30–40°), karakter ekranın ~%8–12'si", () => {
    const k = VARSAYILAN_KAMERA;
    expect(k.mesafe).toBeGreaterThanOrEqual(10);
    expect(k.mesafe).toBeLessThanOrEqual(14);
    const derece = (k.egim * 180) / Math.PI;
    expect(derece).toBeGreaterThanOrEqual(30);
    expect(derece).toBeLessThanOrEqual(40);
    const oran = ekranOrani(1.8, k.mesafe);
    expect(oran).toBeGreaterThan(0.08);
    expect(oran).toBeLessThan(0.12);
    expect(KAMERA_SINIR.mesafeMin).toBe(6);
    expect(KAMERA_SINIR.mesafeMax).toBe(40);
    // Karakter kameranın önünde: kamera hedefin gerisinde (yaw = 0 → +z) ve yukarıda
    const c = kameraKonumu([0, 1.3, 0], k);
    expect(c[2]).toBeGreaterThan(8);
    expect(c[1]).toBeGreaterThan(1.3 + 4);
  });

  it("bakış noktası karakterin önündedir (kamera yönünde) ve alçaktır: ufuk kadrajda kalır", () => {
    const b = bakisNoktasi([0, 1.3, 0], { yaw: 0, egim: 0.62, mesafe: 14 });
    expect(b[2]).toBeLessThan(-4); // yaw 0: ileri = −z
    expect(b[1]).toBeLessThan(1.3);
    const b2 = bakisNoktasi([0, 1.3, 0], { yaw: Math.PI / 2, egim: 0.62, mesafe: 14 });
    expect(b2[0]).toBeLessThan(-4);
  });

  it("kamera yaw'ı karakterin arkasına hızla geçer; el bekleyişinde ve durunca değişmez", () => {
    const yon = 1.0;
    const hedef = arkaYaw(yon);
    expect(arkaYaw(yon)).toBeCloseTo(yon + Math.PI, 12);
    let yaw = hedef + 2;
    yaw = yawTakip(yaw, yon, 1 / 60, true, false);
    expect(Math.abs(yaw - (hedef + 2))).toBeCloseTo(KAMERA_GORUS.takipHizi / 60, 9);
    expect(yawTakip(yaw, yon, 1 / 60, false, false)).toBe(yaw);
    expect(yawTakip(yaw, yon, 1 / 60, true, true)).toBe(yaw);
    // 0,6 sn içinde yarım turu (π) kapatır: "hızlı" ama sabit hız
    let y = hedef + Math.PI;
    for (let i = 0; i < 40; i++) y = yawTakip(y, yon, 1 / 60, true, false);
    expect(Math.abs(y - hedef)).toBeLessThan(0.01);
  });

  it("oyunsu hızlar: yürüme ~4, koşu ~7, depar ~10 m/s; dönüş anında", () => {
    expect(HIZ.yuru).toBeCloseTo(4, 0);
    expect(HIZ.kos).toBeCloseTo(7, 0);
    expect(HIZ.depar).toBeCloseTo(10, 0);
    // yarım tur ≤ 0,1 sn
    expect(Math.PI / HIZ.donus).toBeLessThan(0.1);
    expect(animasyonSec(HIZ.kos * 0.97, false)).toBe("kos");
    expect(animasyonSec(HIZ.depar * 0.97, false)).toBe("depar");
    expect(animasyonSec(HIZ.yuru * 0.97, false)).toBe("yuru");
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
    expect(HIZ.depar / HIZ.kos).toBeGreaterThan(1.4);
    expect(HIZ.kos / HIZ.yuru).toBeGreaterThan(1.6);
  });

  it("zıplama kısa: tepe ~0,4–0,5 m, ~0,35–0,4 s sonra yere iner", () => {
    let y = 0;
    let vy: number = ZIPLA.hiz;
    let tepe = 0;
    let t = 0;
    const dt = 1 / 60;
    do {
      [y, vy] = ziplaAdimi(y, vy, dt);
      tepe = Math.max(tepe, y);
      t += dt;
    } while (y > 0 && t < 3);
    expect(tepe).toBeGreaterThan(0.35);
    expect(tepe).toBeLessThan(0.55);
    expect(t).toBeGreaterThan(0.3);
    expect(t).toBeLessThan(0.45);
    expect(vy).toBe(0);
  });
});

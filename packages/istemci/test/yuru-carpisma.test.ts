import { describe, expect, it } from "vitest";
import { daireyiCoz, EngelDunyasi, gorusVar, ilerle, kameraEngeli, karoEngeli, ortenVar } from "../src/yuru/carpisma";
import type { AyakIzleri } from "../src/yuru/karo-geometri";
import { VARSAYILAN_YOL, yolBul } from "../src/yuru/yol-bulma";
import type { YolSorgusu } from "../src/yuru/yol-bulma";

/** Halkalar (dış halka saat yönü, y aşağı) → ayak izleri; her halka ayrı bina, delik için `bina` aynı verilir. */
function izler(halkalar: { h: number[]; bina: number; ust?: number }[]): AyakIzleri {
  const nokta: number[] = [];
  const bas = [0];
  for (const { h } of halkalar) {
    nokta.push(...h);
    bas.push(nokta.length / 2);
  }
  return {
    nokta: Float32Array.from(nokta),
    halkaBas: Uint32Array.from(bas),
    bina: Uint32Array.from(halkalar.map((h) => h.bina)),
    ust: Float32Array.from(halkalar.map((h) => h.ust ?? 10)),
  };
}

const kare = (x0: number, z0: number, x1: number, z1: number): number[] => [x0, z0, x1, z0, x1, z1, x0, z1];
const delik = (x0: number, z0: number, x1: number, z1: number): number[] => [x0, z0, x0, z1, x1, z1, x1, z0];

function dunya(halkalar: { h: number[]; bina: number; ust?: number }[], kok: [number, number] = [0, 0], kenar = 1000): EngelDunyasi {
  const d = new EngelDunyasi();
  d.ekle("k", karoEngeli(izler(halkalar), kok[0], kok[1], kenar));
  return d;
}

const R = 0.4;

describe("yürüyüş: 2B çarpışma ve kayma", () => {
  // 10×10 m bina, karo içinde (100..110)
  const d = dunya([{ h: kare(100, 100, 110, 110), bina: 0 }]);

  it("duvara dik yürüyüş duvarın önünde durur", () => {
    const r = ilerle(d, 95, 105, 10, 0, R);
    expect(r.carpti).toBe(true);
    expect(r.x).toBeCloseTo(100 - R, 3);
    expect(r.z).toBeCloseTo(105, 3);
  });

  it("çapraz yürüyüş duvar boyunca kayar", () => {
    const r = ilerle(d, 99, 102, 4, 4, R);
    expect(r.x).toBeCloseTo(100 - R, 3);
    expect(r.z).toBeCloseTo(106, 3);
  });

  it("büyük tek adımda bile duvardan geçilmez (alt adımlar)", () => {
    const r = ilerle(d, 95, 105, 30, 0, R);
    expect(r.x).toBeLessThan(100);
  });

  it("köşede dışarı itilir", () => {
    const r = daireyiCoz(d, 99.9, 99.9, R);
    expect(Math.hypot(r.x - 100, r.z - 100)).toBeCloseTo(R, 3);
  });

  it("engelsiz hareket aynen uygulanır", () => {
    const r = ilerle(d, 0, 0, 3, -4, R);
    expect(r.carpti).toBe(false);
    expect(r.x).toBeCloseTo(3, 9);
    expect(r.z).toBeCloseTo(-4, 9);
  });

  it("içeride testi: avlulu bina", () => {
    const e = dunya([
      { h: kare(0, 0, 30, 30), bina: 0, ust: 12 },
      { h: delik(10, 10, 20, 20), bina: 0, ust: 12 },
    ]);
    expect(e.icinde(5, 5)).toBe(12);
    expect(e.icinde(15, 15)).toBeNull();
    expect(e.icinde(-5, 5)).toBeNull();
  });

  it("karo sınırındaki kırpma kenarları çarpışmaz", () => {
    // Bina karonun doğu kenarında kesilmiş: x = 1000 kenarı kırpma kenarıdır
    const e = dunya([{ h: kare(990, 100, 1000, 110), bina: 0 }]);
    let n = 0;
    e.kenarlar(0, 0, 2000, 2000, (ax, _az, bx) => {
      n++;
      expect(ax === 1000 && bx === 1000).toBe(false);
    });
    expect(n).toBe(3);
  });

  it("karo silinince engel kalkar", () => {
    const e = dunya([{ h: kare(100, 100, 110, 110), bina: 0 }]);
    e.sil("k");
    expect(ilerle(e, 95, 105, 10, 0, R).carpti).toBe(false);
  });

  it("görüş ve örtme", () => {
    expect(gorusVar(d, 95, 105, 115, 105, R)).toBe(false);
    expect(gorusVar(d, 95, 95, 115, 95, R)).toBe(true);
    // Kamera binanın arkasında 20 m yüksekte değil, 5 m'de: 10 m'lik bina örter
    expect(ortenVar(d, 120, 5, 105, 95, 1, 105)).toBe(true);
    // Kamera 40 m yüksekte ve karakter binaya yakın değil: hat bina üstünden geçer
    expect(ortenVar(d, 140, 60, 105, 90, 1, 105)).toBe(false);
  });

  it("kamera çarpışması: karakter başından kameraya ilk duvarın oranı", () => {
    // Karakter x = 95, kamera 20 m doğuda (x = 115) ve 5 m yüksekte; duvar (bina x 100..110, üst 10 m) araya girer.
    const t = kameraEngeli(d, 95, 1.5, 105, 115, 5, 105);
    expect(t).toBeCloseTo(5 / 20, 5); // ilk kesişim x = 100
    // Kamera binanın üstünden geçecek kadar yüksekse engel yok
    expect(kameraEngeli(d, 95, 1.5, 105, 115, 60, 105)).toBe(1);
    // Bina yok yönde engel yok
    expect(kameraEngeli(d, 95, 1.5, 105, 75, 5, 105)).toBe(1);
    // Karakterin hemen yanındaki duvar (%3 içinde) yok sayılır
    const ince = dunya([{ h: kare(100, 100, 100.5, 110), bina: 0 }]);
    expect(kameraEngeli(ince, 99.99, 1.5, 105, 120, 5, 105)).toBe(1);
  });
});

describe("yürüyüş: yol bulma", () => {
  // Kuzey-güney uzanan duvar (x 50..52, z 0..100), z 100'ün güneyinde açıklık; ikinci duvar z 104..200
  const d = dunya([
    { h: kare(50, 0, 52, 100), bina: 0 },
    { h: kare(50, 104, 52, 200), bina: 1 },
  ]);
  const s: YolSorgusu = {
    engelli: (x, z) => d.icinde(x, z) !== null || daireyiCoz(d, x, z, R).carpti,
    gorus: (ax, az, bx, bz) => gorusVar(d, ax, az, bx, bz, R),
  };

  it("açık alanda tek düz hat", () => {
    expect(yolBul(s, 0, 0, 30, 40)).toEqual([[30, 40]]);
  });

  it("duvarın arkasına açıklıktan geçer ve her ara hat serbesttir", () => {
    const y = yolBul(s, 40, 50, 60, 50);
    expect(y.length).toBeGreaterThan(1);
    expect(y[y.length - 1]).toEqual([60, 50]);
    let [px, pz] = [40, 50];
    for (const [x, z] of y) {
      expect(gorusVar(d, px, pz, x, z, R)).toBe(true);
      [px, pz] = [x, z];
    }
    // Açıklık z 100..104 arasında
    expect(y.some(([, z]) => z > 99 && z < 105)).toBe(true);
  });

  it("hedef bina içindeyse binanın kenarında durur", () => {
    const e = dunya([{ h: kare(100, 100, 120, 120), bina: 0 }]);
    const se: YolSorgusu = { engelli: (x, z) => e.icinde(x, z) !== null || daireyiCoz(e, x, z, R).carpti, gorus: (ax, az, bx, bz) => gorusVar(e, ax, az, bx, bz, R) };
    const y = yolBul(se, 90, 110, 110, 110, VARSAYILAN_YOL);
    const [x, z] = y[y.length - 1]!;
    expect(e.icinde(x, z)).toBeNull();
    expect(Math.abs(x - 100)).toBeLessThan(3);
    expect(z).toBeCloseTo(110, 0);
  });

  it("deterministik", () => {
    expect(yolBul(s, 40, 50, 60, 50)).toEqual(yolBul(s, 40, 50, 60, 50));
  });
});

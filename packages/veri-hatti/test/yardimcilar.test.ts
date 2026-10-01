import { describe, expect, it } from "vitest";
import {
  Izgara, bolgeMerkezi, cizgiUzunlukKm, denizMesafeleri, haversineKm, noktaCokgenMesafeKm, noktaCokgende, type Cokgen,
} from "../src/cografya";
import { csvSatirlari } from "../src/mrds";
import { nufusOlcekle } from "../src/nufus";
import { denizKenarlariSec } from "../src/deniz";
import { admin1Esle } from "../src/birlestir";
import { yapilandirmaDogrula, type Yapilandirma } from "../src/yapilandirma";
import { NUFUS } from "../src/kurallar";

const kare = (b: number, e: number, w: number): Cokgen => [[[b, e], [b + w, e], [b + w, e + w], [b, e + w], [b, e]]];

describe("cografya yardimcilari", () => {
  it("haversine bilinen mesafeyi verir (Istanbul - Ankara ~ 350 km)", () => {
    const km = haversineKm(28.98, 41.01, 32.85, 39.93);
    expect(km).toBeGreaterThan(330);
    expect(km).toBeLessThan(370);
    expect(haversineKm(10, 10, 10, 10)).toBe(0);
  });

  it("noktaCokgende delikleri disarida sayar", () => {
    const c: Cokgen = [kare(0, 0, 10)[0] as never, [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] as unknown as Cokgen;
    expect(noktaCokgende(1, 1, c)).toBe(true);
    expect(noktaCokgende(5, 5, c)).toBe(false);
    expect(noktaCokgende(11, 5, c)).toBe(false);
  });

  it("noktaCokgenMesafeKm kenara yakin noktada kucuk mesafe verir", () => {
    const c = kare(10, 40, 1);
    expect(noktaCokgenMesafeKm(10.5, 40.5, c)).toBeGreaterThan(30);
    expect(noktaCokgenMesafeKm(9.99, 40.5, c)).toBeLessThan(2);
  });

  it("bolgeMerkezi icbukey/ada bolgede cokgenin icinde kalir", () => {
    // L biçimli bölge: ağırlık merkezi L'nin dışına düşer
    const l: Cokgen = [[[0, 0], [10, 0], [10, 1], [1, 1], [1, 10], [0, 10], [0, 0]]];
    const m = bolgeMerkezi([l]);
    expect(noktaCokgende(m.b, m.e, l)).toBe(true);
    expect(m.alanKm2).toBeGreaterThan(0);
  });

  it("cizgiUzunlukKm cok noktali cizgiyi toplar", () => {
    const a = haversineKm(0, 0, 1, 0);
    const b = haversineKm(1, 0, 1, 1);
    expect(cizgiUzunlukKm([[[0, 0], [1, 0], [1, 1]]])).toBeCloseTo(a + b, 6);
  });
});

describe("kara/deniz izgarasi", () => {
  const olcu = { minB: 0, maxB: 10, minE: 0, maxE: 4, adim: 0.1 };

  it("karaEkle tarama cizgisiyle kareyi isaretler, disi denizdir", () => {
    const g = new Izgara(olcu);
    g.karaEkle(kare(2, 1, 2)); // boylam 2-4, enlem 1-3
    const [i, j] = g.hucreBul(3, 2);
    expect(g.denizMi(i, j)).toBe(false);
    const [i2, j2] = g.hucreBul(6, 2);
    expect(g.denizMi(i2, j2)).toBe(true);
    const [i3, j3] = g.hucreBul(3, 3.5);
    expect(g.denizMi(i3, j3)).toBe(true);
  });

  it("denizMesafeleri kara engelini dolanir; bogaz acilinca mesafe kisalir", () => {
    const duvar: Cokgen = [[[4.95, 0], [5.05, 0], [5.05, 3.95], [4.95, 3.95], [4.95, 0]]]; // neredeyse tam duvar
    const g = new Izgara(olcu);
    g.karaEkle(duvar);
    const a = g.hucreBul(1, 2);
    const b = g.hucreBul(9, 2);
    const kaynak = [{ i: a[0], j: a[1] }];
    const once = (denizMesafeleri(g, kaynak)[g.indeks(b[0], b[1])] as number);
    expect(Number.isFinite(once)).toBe(true);
    // Duvar yukarıdan dolanılır: doğrudan yoldan (≈ 8 derece) belirgin uzun
    const dogrudan = haversineKm(1, 2, 9, 2);
    expect(once).toBeGreaterThan(dogrudan * 1.05);
    g.denizYoluAc([[4.9, 2], [5.1, 2]], 1);
    const sonra = denizMesafeleri(g, kaynak)[g.indeks(b[0], b[1])] as number;
    expect(sonra).toBeLessThan(once);
    expect(sonra).toBeLessThan(dogrudan * 1.03);
  });

  it("kapali golde kalan hucrelere ulasilamaz (Infinity)", () => {
    const g = new Izgara(olcu);
    g.karaEkle(kare(0, 0, 10)); // hepsi kara
    g.denizYoluAc([[1, 1], [1.2, 1]], 0);
    const a = g.hucreBul(1, 1);
    const uzak = denizMesafeleri(g, [{ i: a[0], j: a[1] }]);
    const b = g.hucreBul(8, 3);
    expect(uzak[g.indeks(b[0], b[1])]).toBe(Infinity);
  });
});

describe("csv ayristirici", () => {
  it("tirnakli alanlari, kacisi ve alan ici satir sonunu okur", () => {
    const satirlar: string[][] = [];
    csvSatirlari('a,b,c\n1,"x, y",3\n"q ""z""","l1\nl2",\n', (s) => satirlar.push(s));
    expect(satirlar).toEqual([
      ["a", "b", "c"],
      ["1", "x, y", "3"],
      ['q "z"', "l1\nl2", ""],
    ]);
  });
});

describe("nufus olcegi", () => {
  it("en kucuk 50 000, en buyuk 800 000; siralama korunur (logaritmik)", () => {
    const { nufus } = nufusOlcekle(new Map([["a", 100_000], ["b", 1_000_000], ["c", 15_000_000], ["d", 0]]));
    expect(nufus.get("a")).toBe(NUFUS.min);
    expect(nufus.get("c")).toBe(NUFUS.maks);
    expect(nufus.get("b") as number).toBeGreaterThan(nufus.get("a") as number);
    expect(nufus.get("b") as number).toBeLessThan(nufus.get("c") as number);
    expect(nufus.get("d")).toBe(NUFUS.min); // yerleşimsiz bölge Pmin/2 -> t=0'a kelepçelenir
  });
});

describe("deniz kenari secimi", () => {
  const mesafe = (a: Record<string, Record<string, number>>): Map<string, Map<string, number>> =>
    new Map(Object.entries(a).map(([k, v]) => [k, new Map(Object.entries(v))]));

  it("ortak havzali limanlari baglar, kara komsusu ciftine kenar koymaz, havzalar arasi yalniz kopru liman uzerinden olur", () => {
    const havzalar = new Map<string, string[]>([
      ["k1", ["karadeniz"]],
      ["k2", ["karadeniz"]],
      ["kopru", ["karadeniz", "ege"]],
      ["e1", ["ege"]],
      ["e2", ["ege"]],
    ]);
    const m = mesafe({
      k1: { k2: 100, kopru: 200, e1: 500, e2: 600 },
      k2: { k1: 100, kopru: 150, e1: 450, e2: 550 },
      kopru: { k1: 200, k2: 150, e1: 120, e2: 220 },
      e1: { k1: 500, k2: 450, kopru: 120, e2: 90 },
      e2: { k1: 600, k2: 550, kopru: 220, e1: 90 },
    });
    const kenarlar = denizKenarlariSec(havzalar, m, new Set(["k1|k2"]));
    const anahtarlar = kenarlar.map((k) => `${k.a}|${k.b}`);
    expect(anahtarlar).not.toContain("k1|k2");
    // Karadeniz <-> Ege dogrudan kenar yok
    for (const k of kenarlar) {
      const ortak = (havzalar.get(k.a) ?? []).some((h) => (havzalar.get(k.b) ?? []).includes(h));
      expect(ortak).toBe(true);
    }
    // Tum dugumler bagli
    const komsu = new Map<string, Set<string>>();
    for (const k of kenarlar) {
      (komsu.get(k.a) ?? komsu.set(k.a, new Set()).get(k.a))?.add(k.b);
      (komsu.get(k.b) ?? komsu.set(k.b, new Set()).get(k.b))?.add(k.a);
    }
    const goruldu = new Set<string>(["k1"]);
    const yigin = ["k1"];
    while (yigin.length > 0) {
      for (const v of komsu.get(yigin.pop() as string) ?? []) {
        if (goruldu.has(v)) continue;
        goruldu.add(v);
        yigin.push(v);
      }
    }
    expect(goruldu.size).toBe(5);
  });
});

describe("yapilandirma kurallari", () => {
  const temel: Yapilandirma = {
    surum: 1,
    ad: "x",
    devletler: [{ id: "d1", ad: "D1", blok: "b1" }],
    bolgeler: [
      { id: "r1", ad: "R1", devlet: "d1", kita: "avrupa", admin1: ["AAA-1 a"], etiketler: ["ova"], etiketEkle: [], etiketCikar: [], havzalar: [], sanayi: [], rezervler: { tahil: 100 }, mrdsMuaf: [], rezervKaynak: "t" },
    ],
    denizGecitleri: [],
    ekLimanlar: [],
    kaldirilanKaraKenarlari: [],
    eklenenKaraKenarlari: [],
    havaKenarlari: [],
  };

  it("gecerli yapilandirmada hata yok", () => {
    expect(yapilandirmaDogrula(temel)).toEqual([]);
  });

  it("tahil rezervi olup ova etiketi olmayan, dag+ova birlikte, ayni admin-1 iki bolgede hatalari yakalanir", () => {
    const kotu: Yapilandirma = JSON.parse(JSON.stringify(temel)) as Yapilandirma;
    const r1 = kotu.bolgeler[0]!;
    r1.etiketler = ["dag"];
    kotu.bolgeler.push({ ...r1, id: "r2", etiketler: ["dag", "ova"] });
    const hatalar = yapilandirmaDogrula(kotu).join("\n");
    expect(hatalar).toContain("ova\" etiketi yok");
    expect(hatalar).toContain("bir arada olamaz");
    expect(hatalar).toContain("zaten");
  });

  it("admin1Esle ULKE secicisini yalnizca baska bolgeye verilmemis kalanlara uygular", () => {
    const y: Yapilandirma = JSON.parse(JSON.stringify(temel)) as Yapilandirma;
    y.bolgeler = [
      { ...(y.bolgeler[0] as Yapilandirma["bolgeler"][number]), id: "a", admin1: ["XXX-1 bir"], rezervler: {} },
      { ...(y.bolgeler[0] as Yapilandirma["bolgeler"][number]), id: "b", admin1: ["ULKE:XXX"], rezervler: {}, etiketler: [] },
    ];
    const tumu = [
      { kod: "XXX-1", ad: "bir", ulke: "XXX", geometri: { type: "Polygon", coordinates: [] } },
      { kod: "XXX-2", ad: "iki", ulke: "XXX", geometri: { type: "Polygon", coordinates: [] } },
      { kod: "YYY-1", ad: "diger", ulke: "YYY", geometri: { type: "Polygon", coordinates: [] } },
    ];
    const s = admin1Esle(y, tumu);
    expect(s.get("XXX-1")).toBe("a");
    expect(s.get("XXX-2")).toBe("b");
    expect(s.has("YYY-1")).toBe(false);
  });
});

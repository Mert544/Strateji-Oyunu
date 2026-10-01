import { describe, expect, it } from "vitest";
import { cizgiParcalari, duzlemselAlan, kureyeYerlestir, poligonlariUcgenle, ucgenleriBol } from "../src/kure/ucgenle";
import type { Poligon } from "../src/kure/ucgenle";
import { acisalMesafeDer } from "../src/kure/matematik";

const kare = (x: number, y: number, k: number): number[][] => [[x, y], [x + k, y], [x + k, y + k], [x, y + k], [x, y]];

describe("çokgen üçgenleme", () => {
  it("bölmesiz kare: 2 üçgen, 4 köşe", () => {
    const ag = poligonlariUcgenle([[kare(0, 0, 10)]], 0);
    expect(ag.indeks.length / 3).toBe(2);
    expect(ag.ll.length / 2).toBe(4);
    expect(duzlemselAlan(ag)).toBeCloseTo(100, 9);
  });

  it("delikli çokgenin alanı korunur (delik çıkarılır)", () => {
    const p: Poligon = [kare(0, 0, 10), kare(3, 3, 4)];
    const ag = poligonlariUcgenle([p], 0);
    expect(duzlemselAlan(ag)).toBeCloseTo(100 - 16, 9);
  });

  it("bölme alanı korur, kenar uzunluğunu sınırlar, üçgen sayısı artar", () => {
    const duz = poligonlariUcgenle([[kare(0, 0, 10)]], 0);
    const ag = poligonlariUcgenle([[kare(0, 0, 10)]], 2.5);
    expect(ag.indeks.length).toBeGreaterThan(duz.indeks.length);
    expect(duzlemselAlan(ag)).toBeCloseTo(100, 6);
    for (let i = 0; i < ag.indeks.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const a = ag.indeks[i + k] as number, b = ag.indeks[i + ((k + 1) % 3)] as number;
        const d = acisalMesafeDer(ag.ll[2 * a] as number, ag.ll[2 * a + 1] as number, ag.ll[2 * b] as number, ag.ll[2 * b + 1] as number);
        expect(d).toBeLessThanOrEqual(2.5 + 1e-9);
      }
    }
  });

  it("çatlaksız: her kenar en çok iki üçgende ve T-kavşağı yok", () => {
    // L biçimli çokgen: farklı kenar uzunlukları komşu üçgenlerde farklı bölmeler ister.
    const L: Poligon = [[[0, 0], [9, 0], [9, 3], [3, 3], [3, 11], [0, 11], [0, 0]]];
    const ag = poligonlariUcgenle([L], 1.7);
    const kenar = new Map<string, number>();
    for (let i = 0; i < ag.indeks.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const a = ag.indeks[i + k] as number, b = ag.indeks[i + ((k + 1) % 3)] as number;
        const anahtar = a < b ? `${a},${b}` : `${b},${a}`;
        kenar.set(anahtar, (kenar.get(anahtar) ?? 0) + 1);
      }
    }
    for (const n of kenar.values()) expect(n).toBeLessThanOrEqual(2);
    // T-kavşağı: hiçbir köşe, bir kenarın (uç noktaları hariç) tam üstünde olmamalı
    const n = ag.ll.length / 2;
    for (const anahtar of kenar.keys()) {
      const [a, b] = anahtar.split(",").map(Number) as [number, number];
      const ax = ag.ll[2 * a] as number, ay = ag.ll[2 * a + 1] as number, bx = ag.ll[2 * b] as number, by = ag.ll[2 * b + 1] as number;
      for (let v = 0; v < n; v++) {
        if (v === a || v === b) continue;
        const px = ag.ll[2 * v] as number, py = ag.ll[2 * v + 1] as number;
        const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        if (Math.abs(cross) > 1e-9) continue;
        const t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2);
        expect(t <= 1e-9 || t >= 1 - 1e-9).toBe(true);
      }
    }
  });

  it("ucgenleriBol: bölünecek kenar yoksa girdiyi aynen döndürür", () => {
    const ll = [0, 0, 1, 0, 0, 1];
    expect(ucgenleriBol(ll, [0, 1, 2], 10)).toEqual([0, 1, 2]);
  });

  it("küreye yerleştirme: köşeler yarıçapta", () => {
    const ag = poligonlariUcgenle([[kare(20, 30, 5)]], 1);
    const k = kureyeYerlestir(ag, 1.004);
    for (let i = 0; i < k.length; i += 3) expect(Math.hypot(k[i] as number, k[i + 1] as number, k[i + 2] as number)).toBeCloseTo(1.004, 5);
  });
});

describe("çizgi parçaları", () => {
  it("uzun çizgiyi böler; her parça çifti bitişik", () => {
    const f = cizgiParcalari([[[0, 0], [10, 0]]], 2, 1);
    expect(f.length / 6).toBe(5);
    // bir parçanın sonu sonrakinin başı
    expect(f[3]).toBeCloseTo(f[6] as number, 9);
    expect(f[4]).toBeCloseTo(f[7] as number, 9);
  });
});

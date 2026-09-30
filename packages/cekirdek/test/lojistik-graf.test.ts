import { describe, expect, it } from "vitest";
import {
  kapasiteleriDegistir,
  kapasiteliKenarlar,
  kenarFiltrele,
  kenarlariDogrula,
  komsulukKur,
  oburUc,
  type GrafKenari,
} from "../src/lojistik/graf";

const kenarlar: GrafKenari[] = [
  { u: 0, v: 1, kapasite: 5, maliyet: 10 },
  { u: 1, v: 2, kapasite: 0, maliyet: 20 },
  { u: 2, v: 2, kapasite: 9, maliyet: 1 }, // kendi kendine döngü
  { u: 1, v: 0, kapasite: 3, maliyet: 15 }, // paralel kenar
];

describe("graf yardımcıları", () => {
  it("komşuluk listesi kenar indeksine göre artan sıralı; döngüler atlanır", () => {
    const l = komsulukKur(3, kenarlar);
    expect(l[0]).toEqual([{ kenar: 0, dugum: 1 }, { kenar: 3, dugum: 1 }]);
    expect(l[1]).toEqual([{ kenar: 0, dugum: 0 }, { kenar: 1, dugum: 2 }, { kenar: 3, dugum: 0 }]);
    expect(l[2]).toEqual([{ kenar: 1, dugum: 1 }]);
  });

  it("kenarFiltrele eski indeks eşlemesini korur ve girdiyi değiştirmez", () => {
    const f = kapasiteliKenarlar(kenarlar);
    expect(f.eskiIndeks).toEqual([0, 2, 3]);
    expect(f.kenarlar.map((k) => k.kapasite)).toEqual([5, 9, 3]);
    f.kenarlar[0]!.kapasite = 99;
    expect(kenarlar[0]!.kapasite).toBe(5);
    expect(kenarFiltrele(kenarlar, (i) => i === 1).eskiIndeks).toEqual([1]);
  });

  it("kapasiteleriDegistir yeni dizi döndürür, negatifleri 0'a kırpar", () => {
    const y = kapasiteleriDegistir(kenarlar, [1, -2, 3, 4]);
    expect(y.map((k) => k.kapasite)).toEqual([1, 0, 3, 4]);
    expect(kenarlar[0]!.kapasite).toBe(5);
  });

  it("oburUc ve doğrulama", () => {
    expect(oburUc(kenarlar[0]!, 0)).toBe(1);
    expect(oburUc(kenarlar[0]!, 1)).toBe(0);
    expect(oburUc(kenarlar[0]!, 2)).toBe(-1);
    expect(() => kenarlariDogrula(3, kenarlar)).not.toThrow();
    expect(() => kenarlariDogrula(2, kenarlar)).toThrow(RangeError);
    expect(() => kenarlariDogrula(3, [{ u: 0, v: 1, kapasite: 1.5, maliyet: 1 }])).toThrow(RangeError);
  });
});

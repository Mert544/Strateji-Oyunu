import { describe, expect, it } from "vitest";
import { goreliDegisimPpm, kosullardanVerdict, medyanIkiKat, oranPpm, tamsayiMedyan } from "../../src/parsel";
import { parsel } from "../../src";

describe("parsel olcum ortak", () => {
  it("oranPpm asagi yuvarlar, buyuk sayilarda tasmaz, tamsayi ister", () => {
    expect(oranPpm(1, 3)).toBe(333_333);
    expect(oranPpm(2, 3)).toBe(666_666);
    expect(oranPpm(0, 5)).toBe(0);
    expect(oranPpm(9_000_000_000_000, 9_000_000_000_000)).toBe(1_000_000);
    expect(() => oranPpm(1, 0)).toThrow(/payda/);
    expect(() => oranPpm(0.5, 2)).toThrow(/tamsayi/);
  });

  it("goreli degisim; temel 0 tanimsiz", () => {
    expect(goreliDegisimPpm(100, 110)).toBe(100_000);
    expect(goreliDegisimPpm(100, 89)).toBe(110_000);
    expect(goreliDegisimPpm(-200, -100)).toBe(500_000);
    expect(goreliDegisimPpm(0, 5)).toBeNull();
  });

  it("medyan: iki kat ve tamsayi", () => {
    expect(medyanIkiKat([])).toBeNull();
    expect(medyanIkiKat([5, 1, 3])).toBe(6);
    expect(medyanIkiKat([4, 1, 3, 2])).toBe(5);
    expect(tamsayiMedyan([4, 1, 3, 2])).toBe(2);
  });

  it("kosullardan verdict", () => {
    expect(kosullardanVerdict([true, true])).toBe("gecti");
    expect(kosullardanVerdict([true, null])).toBe("belirsiz");
    expect(kosullardanVerdict([null, false])).toBe("kaldi");
  });

  it("paket kokunden parsel ad alani olarak disa aktarilir", () => {
    expect(parsel.PARSEL_H8_GINI_ESIK_PPM).toBe(600_000);
    expect(typeof parsel.giniPpm).toBe("function");
  });
});

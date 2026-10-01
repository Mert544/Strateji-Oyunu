import { describe, expect, it } from "vitest";
import { ayrilmisGarantisi } from "../../src/parsel";

const GUN = 86_400_000;
const SURE = 14 * GUN;
const bos = { sahipli: false, alinmaMs: null, sahipKatilmaMs: null } as const;
const sat = (alinma: number, katilma: number) => ({ sahipli: true, alinmaMs: alinma, sahipKatilmaMs: katilma });

describe("ayrılmış hücre garantisi", () => {
  it("katılım anında (yurt) ve süre bitmeden alınan hücre ihlal değildir; tam 14. gün sınırı ihlaldir", () => {
    expect(ayrilmisGarantisi([sat(0, 0), sat(SURE - 1, 0)], SURE).ihlal).toBe(0);
    expect(ayrilmisGarantisi([sat(SURE, 0)], SURE).ihlal).toBe(1); // çekirdek: d.zaman < katılma + süre ise yeni oyuncu
    expect(ayrilmisGarantisi([sat(SURE + 5 * GUN, 5 * GUN)], SURE).ihlal).toBe(1);
    expect(ayrilmisGarantisi([sat(SURE + 5 * GUN - 1, 5 * GUN)], SURE).ihlal).toBe(0);
  });

  it("kalan pay (koruma): satılmamış / toplam, ppm; toplam 0 ise 0", () => {
    const g = ayrilmisGarantisi([bos, bos, bos, sat(0, 0)], SURE);
    expect(g).toMatchObject({ ayrilmisToplam: 4, satilan: 1, bos: 3, kalanPayPpm: 750_000, ihlal: 0, guvenceTuttu: true });
    expect(ayrilmisGarantisi([], SURE)).toMatchObject({ ayrilmisToplam: 0, kalanPayPpm: 0, guvenceTuttu: true });
    expect(ayrilmisGarantisi([sat(0, 0)], SURE).kalanPayPpm).toBe(0);
    expect(ayrilmisGarantisi([bos], SURE).kalanPayPpm).toBe(1_000_000);
  });

  it("ihlal güvenceyi bozar; geçersiz girdiler hata verir", () => {
    expect(ayrilmisGarantisi([sat(SURE, 0), bos], SURE)).toMatchObject({ ihlal: 1, guvenceTuttu: false });
    expect(() => ayrilmisGarantisi([], 0)).toThrow(/pozitif/);
    expect(() => ayrilmisGarantisi([{ sahipli: true, alinmaMs: null, sahipKatilmaMs: 0 }], SURE)).toThrow(/gerekli/);
    expect(() => ayrilmisGarantisi([sat(5, 10)], SURE)).toThrow(/once/);
    expect(() => ayrilmisGarantisi([sat(1.5, 0)], SURE)).toThrow(/tamsayi/);
  });
});

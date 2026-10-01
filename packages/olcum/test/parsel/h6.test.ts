import { describe, expect, it } from "vitest";
import { gecKatilanBasarisi, h6ParselDegerlendir, hucreFiyatCarpaniPpm, medyanaUlastiMi, ucuzHucrePayi } from "../../src/parsel";

describe("H6 parsel: gec katilan", () => {
  it("ilce medyanina ulasma (cift uzunlukta kesirsiz)", () => {
    expect(medyanaUlastiMi(5, [1, 5, 9])).toBe(true);
    expect(medyanaUlastiMi(4, [1, 5, 9])).toBe(false);
    expect(medyanaUlastiMi(3, [2, 5])).toBe(false); // medyan 3,5
    expect(medyanaUlastiMi(4, [2, 5])).toBe(true);
    expect(medyanaUlastiMi(4, [])).toBeNull();
  });

  it("basari orani olcululebilir olgular uzerinden", () => {
    const s = gecKatilanBasarisi([
      { servet: 10, ilceServetleri: [5, 20] },
      { servet: 30, ilceServetleri: [5, 20] },
      { servet: 1, ilceServetleri: [] },
    ]);
    expect(s).toEqual({ basariPpm: 500_000, ulasan: 1, olculebilir: 2, olguSayisi: 3 });
    expect(gecKatilanBasarisi([]).basariPpm).toBeNull();
  });

  it("fiyat carpani 1 + 2·satilmis pay; %25 satilmis -> 1,5", () => {
    expect(hucreFiyatCarpaniPpm(100, 0)).toBe(1_000_000);
    expect(hucreFiyatCarpaniPpm(100, 25)).toBe(1_500_000);
    expect(hucreFiyatCarpaniPpm(100, 50)).toBe(2_000_000);
    expect(() => hucreFiyatCarpaniPpm(10, 11)).toThrow(/tutarsiz/);
  });

  it("ucuz hucre payi: yalniz carpani <= 2 ilcelerin satilmamis hucreleri", () => {
    const s = ucuzHucrePayi([
      { uygunHucre: 100, satilmisHucre: 50 }, // çarpan 2 -> 50 ucuz
      { uygunHucre: 100, satilmisHucre: 51 }, // çarpan > 2 -> 0
      { uygunHucre: 0, satilmisHucre: 0 },
    ]);
    expect(s).toEqual({ payPpm: 250_000, ucuzHucre: 50, uygunHucre: 200 });
  });

  it("karar", () => {
    const iyi = gecKatilanBasarisi([{ servet: 10, ilceServetleri: [5] }]);
    const kotu = gecKatilanBasarisi([{ servet: 1, ilceServetleri: [5] }]);
    const ucuz = ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 0 }]);
    const pahali = ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 90 }]);
    expect(h6ParselDegerlendir(iyi, ucuz).verdict).toBe("gecti");
    expect(h6ParselDegerlendir(kotu, ucuz).verdict).toBe("kaldi");
    expect(h6ParselDegerlendir(iyi, pahali).verdict).toBe("kaldi");
    expect(h6ParselDegerlendir(gecKatilanBasarisi([]), ucuz).verdict).toBe("belirsiz");
  });
});

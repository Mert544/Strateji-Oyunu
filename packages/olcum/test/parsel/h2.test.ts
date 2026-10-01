import { describe, expect, it } from "vitest";
import { gunlukBaskinTur, haftalikYeniTurler, kararCesitliligi, kararTekrari } from "../../src/parsel";
import type { KararKaydi } from "../../src/parsel";

/** gün aralığında her gün tek karar (türü fonksiyonla). */
function gunler(bas: number, son: number, tur: (g: number) => string): KararKaydi[] {
  const k: KararKaydi[] = [];
  for (let g = bas; g <= son; g++) k.push({ gun: g, tur: tur(g) });
  return k;
}

describe("H2 parsel: karar tekrari ve yeni karar turu", () => {
  it("gunluk baskin tur: en sik; esitlikte anahtar sirasi", () => {
    const b = gunlukBaskinTur([
      { gun: 1, tur: "b" },
      { gun: 1, tur: "a" },
      { gun: 2, tur: "c" },
      { gun: 2, tur: "d" },
      { gun: 2, tur: "d" },
    ]);
    expect([...b.entries()]).toEqual([
      [1, "a"],
      [2, "d"],
    ]);
  });

  it("tekrar: 21-30. gun penceresi, kararsiz gunler paydadan cikar", () => {
    const hepAyni = kararTekrari(gunler(1, 30, () => "x"));
    expect(hepAyni).toEqual({ tekrarPpm: 1_000_000, ciftSayisi: 10, bosCift: 0 });
    const donusumlu = kararTekrari(gunler(1, 30, (g) => (g % 2 === 0 ? "x" : "y")));
    expect(donusumlu.tekrarPpm).toBe(0);
    // 25. gün kararsız: (24,25) ve (25,26) çiftleri boş.
    const bosluklu = kararTekrari(gunler(1, 30, () => "x").filter((k) => k.gun !== 25));
    expect(bosluklu).toEqual({ tekrarPpm: 1_000_000, ciftSayisi: 8, bosCift: 2 });
    expect(kararTekrari([]).tekrarPpm).toBeNull();
  });

  it("haftalik yeni turler: ilk gorulme haftasi; 45. gunden sonrasi sayilmaz", () => {
    const k = [...gunler(1, 45, () => "x"), ...gunler(1, 45, (g) => `t${Math.floor((g - 1) / 7)}`), { gun: 46, tur: "gec" }];
    expect(haftalikYeniTurler(k)).toEqual([2, 1, 1, 1, 1, 1, 1]);
    expect(haftalikYeniTurler([{ gun: 3, tur: "a" }, { gun: 1, tur: "a" }])).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it("karar: medyan tekrar ve her hafta yeni tur kullanan oyuncu payi", () => {
    const yenilikci = [...gunler(1, 45, (g) => (g % 2 === 0 ? "x" : "y")), ...gunler(1, 45, (g) => (g % 7 === 1 ? `t${g}` : "x")).filter((k) => k.tur !== "x")];
    const tekduze = gunler(1, 45, () => "x");
    const iyi = kararCesitliligi({ a: yenilikci, b: yenilikci, c: tekduze });
    expect(iyi.medyanTekrarPpm).toBe(0);
    expect(iyi.herHaftaYeniPayiPpm).toBe(666_666);
    expect(iyi.tekrarEsikAsanPpm).toBe(333_333);
    expect(iyi.verdict).toBe("gecti");
    const kotu = kararCesitliligi({ a: yenilikci, b: tekduze, c: tekduze });
    expect(kotu.medyanTekrarPpm).toBe(1_000_000);
    expect(kotu.verdict).toBe("kaldi");
    expect(kararCesitliligi({}).verdict).toBe("belirsiz");
  });
});

import { describe, expect, it } from "vitest";
import {
  ARSA_TABAN_FIYATI_TL,
  araziGini,
  giniPpm,
  h8Degerlendir,
  ilceYogunlasmasi,
  yenidenSatisOrani,
} from "../../src/parsel";
import type { SahipliHucre } from "../../src/parsel";

function hucreler(sahip: string, ilce: string, n: number, sinif: SahipliHucre["sinif"] = "kirsal", bas = 0): SahipliHucre[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${bas + i}:0`, ilce, sinif, sahip }));
}

describe("H8 parsel: arazi yogunlasmasi", () => {
  it("Gini: esitlik 0, tek sahip (n-1)/n, bilinen ornek", () => {
    expect(giniPpm([])).toBe(0);
    expect(giniPpm([7])).toBe(0);
    expect(giniPpm([5, 5, 5, 5])).toBe(0);
    expect(giniPpm([0, 0, 0, 0])).toBe(0);
    expect(giniPpm([0, 0, 0, 10])).toBe(750_000);
    expect(giniPpm([1, 2, 3, 4])).toBe(250_000);
    // Sıra bağımsız, ölçek bağımsız.
    expect(giniPpm([4, 1, 3, 2])).toBe(giniPpm([400, 100, 300, 200]));
    // Büyük değerlerde taşma yok.
    expect(giniPpm([0, 9_000_000_000_000_000])).toBe(500_000);
    expect(() => giniPpm([-1, 2])).toThrow(/negatif/);
    expect(() => giniPpm([1.5])).toThrow(/tamsayi/);
  });

  it("arazi Gini: hucresizler dahil, taban fiyat agirlikli; ikincil olcumler", () => {
    const h = [...hucreler("a", "i1", 2, "sehir"), ...hucreler("b", "i1", 2, "kirsal", 10)];
    const g = araziGini(h, ["a", "b", "c"]);
    expect(g.oyuncuSayisi).toBe(3);
    expect(g.sahipSayisi).toBe(2);
    // değerler: a = 2·6500, b = 2·1000, c = 0
    expect(g.degerGiniPpm).toBe(giniPpm([0, 2 * ARSA_TABAN_FIYATI_TL.kirsal, 2 * ARSA_TABAN_FIYATI_TL.sehir]));
    expect(g.hucreGiniPpm).toBe(giniPpm([0, 2, 2]));
    expect(g.sahiplerDegerGiniPpm).toBe(giniPpm([2_000, 13_000]));
    // Listede olmayan sahip de nüfusa eklenir.
    expect(araziGini(h, []).oyuncuSayisi).toBe(2);
  });

  it("ilce payi: en buyuk cift, %25 ve 72 hucre ihlalleri", () => {
    const h = [...hucreler("a", "i1", 26), ...hucreler("b", "i1", 10, "kirsal", 100), ...hucreler("a", "i2", 73, "kirsal", 200)];
    const s = ilceYogunlasmasi(h, { i1: 100, i2: 400 });
    expect(s.enBuyukPayPpm).toBe(260_000);
    expect(s.enBuyuk).toEqual({ ilce: "i1", oyuncu: "a", hucre: 26 });
    expect(s.payAsanCift).toBe(1);
    expect(s.tavanAsanCift).toBe(1);
    expect(ilceYogunlasmasi([], {}).enBuyukPayPpm).toBe(0);
    expect(() => ilceYogunlasmasi(h, { i1: 100 })).toThrow(/uygun hucre/);
  });

  it("yeniden satis: medyan mili-hafta, gelirsiz satislar sonsuz", () => {
    const s = yenidenSatisOrani([
      { fiyat: 50_000, haftalikAraziGeliri: 10_000 }, // 5 hafta
      { fiyat: 120_000, haftalikAraziGeliri: 10_000 }, // 12 hafta
      { fiyat: 80_000, haftalikAraziGeliri: 0 }, // sonsuz
    ]);
    expect(s.medyanMiliHafta).toBe(12_000);
    expect(s.esikAsanPpm).toBe(666_666);
    expect(s.gelirsizSatis).toBe(1);
    expect(yenidenSatisOrani([]).medyanMiliHafta).toBeNull();
  });

  it("karar: uc kosul; satis yoksa belirsiz", () => {
    const esit = araziGini([...hucreler("a", "i1", 5), ...hucreler("b", "i1", 5, "kirsal", 10)], ["a", "b"]);
    const ilce = ilceYogunlasmasi([...hucreler("a", "i1", 5), ...hucreler("b", "i1", 5, "kirsal", 10)], { i1: 100 });
    const ucuz = yenidenSatisOrani([{ fiyat: 9_000, haftalikAraziGeliri: 1_000 }]);
    expect(h8Degerlendir(esit, ilce, ucuz).verdict).toBe("gecti");
    expect(h8Degerlendir(esit, ilce, yenidenSatisOrani([])).verdict).toBe("belirsiz");
    const pahali = yenidenSatisOrani([{ fiyat: 11_000, haftalikAraziGeliri: 1_000 }]);
    expect(h8Degerlendir(esit, ilce, pahali).verdict).toBe("kaldi");
    const tekel = araziGini(hucreler("a", "i1", 10), ["a", "b", "c", "d", "e"]);
    expect(tekel.degerGiniPpm).toBe(800_000);
    expect(h8Degerlendir(tekel, ilce, ucuz).verdict).toBe("kaldi");
  });
});

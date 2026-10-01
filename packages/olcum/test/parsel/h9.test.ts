import { describe, expect, it } from "vitest";
import { SAAT_MS, emirDolumOrani, h9Degerlendir, oyKatilimi, uygunSecmenMi } from "../../src/parsel";

describe("H9 parsel: emir dolumu ve oy katilimi", () => {
  it("emir dolum: 1 saat siniri dahil; iptal ve gozlem disi haric", () => {
    const s = emirDolumOrani(
      [
        { verilme: 0, dolum: SAAT_MS }, // sınırda: dolmuş
        { verilme: 0, dolum: SAAT_MS + 1 }, // geç
        { verilme: 0, dolum: null }, // dolmadı
        { verilme: 0, dolum: null, iptal: 10 }, // erken iptal: hariç
        { verilme: 0, dolum: 5, iptal: 10 }, // iptalden önce dolmuş: sayılır
        { verilme: 9 * SAAT_MS, dolum: null }, // penceresi gözlem sonunu aşıyor: hariç
      ],
      { gozlemSonu: 9 * SAAT_MS + 10 },
    );
    expect(s).toEqual({ oranPpm: 500_000, dolan: 2, payda: 4, iptalHaric: 1, gozlemDisi: 1 });
    expect(emirDolumOrani([]).oranPpm).toBeNull();
  });

  it("uygun secmen: parsel sahibi ve son 7 gunun >= 3'unde aktif", () => {
    expect(uygunSecmenMi([7, 8, 13], 14, true)).toBe(true);
    expect(uygunSecmenMi([6, 8, 13], 14, true)).toBe(false); // 6. gün pencere dışı
    expect(uygunSecmenMi([8, 8, 13, 14], 14, true)).toBe(false); // tekrar ve seçim günü sayılmaz
    expect(uygunSecmenMi([8, 9, 10], 14, false)).toBe(false);
  });

  it("oy katilimi: toplam oran ve en dusuk secim", () => {
    const s = oyKatilimi([
      { uygunSecmen: 100, oyKullanan: 20 },
      { uygunSecmen: 100, oyKullanan: 50 },
      { uygunSecmen: 0, oyKullanan: 0 },
    ]);
    expect(s).toEqual({ oranPpm: 350_000, enDusukPpm: 200_000, secimSayisi: 3 });
    expect(() => oyKatilimi([{ uygunSecmen: 1, oyKullanan: 2 }])).toThrow(/tutarsiz/);
  });

  it("karar; Alfa-0'da secim yok -> belirsiz", () => {
    const iyi = emirDolumOrani([{ verilme: 0, dolum: 1 }]);
    const oy = oyKatilimi([{ uygunSecmen: 10, oyKullanan: 3 }]);
    expect(h9Degerlendir(iyi, oy).verdict).toBe("gecti");
    expect(h9Degerlendir(iyi, null).verdict).toBe("belirsiz");
    expect(h9Degerlendir(iyi, oyKatilimi([{ uygunSecmen: 10, oyKullanan: 2 }])).verdict).toBe("kaldi");
    expect(h9Degerlendir(emirDolumOrani([{ verilme: 0, dolum: null }]), oy).verdict).toBe("kaldi");
  });
});

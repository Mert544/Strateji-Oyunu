/** Haritadaki yapı etiketi metni (saf): ad, aşama, kalan süre; dükkân inşaatı D4.etiket_ad; tek terim "İnşa". */
import { describe, expect, it } from "vitest";
import { yapiEtiketMetni } from "../src/harita/yapi-etiket";

const DK = 60_000;

describe("yapiEtiketMetni", () => {
  it("biten yapıda yalnız ad (dükkânda marka/tür adı)", () => {
    expect(yapiEtiketMetni({ ad: "Çiftlik", asama: 3, yukseltme: false, dukkan: false })).toBe("Çiftlik");
    expect(yapiEtiketMetni({ ad: "bereket", asama: 3, yukseltme: false, dukkan: true })).toBe("bereket");
    expect(yapiEtiketMetni({ ad: "Bakkal", asama: 3, yukseltme: false, dukkan: true })).toBe("Bakkal");
  });

  it('inşaat: "Çiftlik · İskele · 7 dk"; dükkân inşaatı "Dükkân · İskele · 24 dk"', () => {
    expect(yapiEtiketMetni({ ad: "Çiftlik", asama: 1, yukseltme: false, dukkan: false, kalanMs: 7 * DK })).toBe("Çiftlik · İskele · 7 dk");
    expect(yapiEtiketMetni({ ad: "Dükkân", asama: 0, yukseltme: false, dukkan: true, kalanMs: 24 * DK })).toBe("Dükkân · Temel · 24 dk");
    expect(yapiEtiketMetni({ ad: "Bakkal", asama: 2, yukseltme: false, dukkan: true, kalanMs: 90 * DK })).toBe("Bakkal · Gövde · 1,5 sa");
  });

  it('başlangıç bilinmiyorsa "İnşa" (tek terim); büyütmede "Büyütme"; süre yoksa son parça yok', () => {
    expect(yapiEtiketMetni({ ad: "Çiftlik", asama: 1, yukseltme: false, dukkan: false, bitisBilinmiyor: true })).toBe("Çiftlik · İnşa");
    expect(yapiEtiketMetni({ ad: "Çiftlik", asama: 1, yukseltme: true, dukkan: false, kalanMs: 7 * DK })).toBe("Çiftlik · Büyütme · 7 dk");
    expect(yapiEtiketMetni({ ad: "Dükkân", asama: 1, yukseltme: false, dukkan: true })).toBe("Dükkân · İskele");
  });
});

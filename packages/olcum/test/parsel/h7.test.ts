import { describe, expect, it } from "vitest";
import { ayarlaUnutOrani } from "../../src/parsel";

describe("H7 parsel: ayarla-unut sahip duzeyinde", () => {
  it("uc noktada da [%50, %85] -> gecti; sinirlar dahil", () => {
    const s = ayarlaUnutOrani([
      { saat: 24, kurUnut: 50, aktif: 100 },
      { saat: 48, kurUnut: 85, aktif: 100 },
      { saat: 72, kurUnut: 70, aktif: 100 },
    ]);
    expect(s.verdict).toBe("gecti");
    expect(s.oranlar).toEqual({ 24: 500_000, 48: 850_000, 72: 700_000 });
  });

  it("sapma yonu ve olculemeyen nokta", () => {
    const s = ayarlaUnutOrani([
      { saat: 24, kurUnut: 90, aktif: 100 },
      { saat: 48, kurUnut: 40, aktif: 100 },
      { saat: 72, kurUnut: 1, aktif: 0 },
    ]);
    expect(s.verdict).toBe("kaldi");
    expect(s.sapmalar).toEqual({ 24: "esitlenme", 48: "cokus" });
    expect(ayarlaUnutOrani([{ saat: 24, kurUnut: 60, aktif: 0 }]).verdict).toBe("belirsiz");
  });
});

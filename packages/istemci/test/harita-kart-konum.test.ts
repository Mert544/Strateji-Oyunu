/** Yapı kartı konumu (saf): hedef hücre alt yarıdaysa "ust", üst yarıdaysa (ya da hedef yokken) varsayılan alt. */
import { describe, expect, it } from "vitest";
import { kartKonumu } from "../src/harita/kart-durum";

describe("kartKonumu", () => {
  it("alt yarı → ust", () => {
    expect(kartKonumu(600, 900)).toBe("ust");
    expect(kartKonumu(899, 900)).toBe("ust");
    expect(kartKonumu(451, 900)).toBe("ust");
  });

  it("üst yarı (orta çizgi dahil) → yok", () => {
    expect(kartKonumu(100, 900)).toBeNull();
    expect(kartKonumu(450, 900)).toBeNull();
    expect(kartKonumu(0, 900)).toBeNull();
  });

  it("hedef yok ya da kap yüksekliği bilinmiyor → yok", () => {
    expect(kartKonumu(null, 900)).toBeNull();
    expect(kartKonumu(600, 0)).toBeNull();
  });

  it("telefon (844): alt yarı üste alır", () => {
    expect(kartKonumu(500, 844)).toBe("ust");
    expect(kartKonumu(300, 844)).toBeNull();
  });
});

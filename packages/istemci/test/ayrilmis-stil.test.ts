/** B3: ayrılmış hücre katmanları (stil.ts): kaynak, süzgeç, belirteçler, kesikli kenar; belirteç tanımlı. */
import { describe, expect, it } from "vitest";
import { ayrilmisKatmanlari } from "../src/harita/stil";
import { renkTablosu } from "../src/tasarim/uret-css";

describe("ayrılmış hücre boyası (B3)", () => {
  it("iki katman: dolgu ve kesikli kenar; yalnız ayrilmis=1 özellikleri; belirteçler okunur", () => {
    const okunan: string[] = [];
    const k = ayrilmisKatmanlari((ad) => {
      okunan.push(ad);
      return "#123456";
    });
    expect(k.map((x) => x.id)).toEqual(["ayrilmis-dolgu", "ayrilmis-cizgi"]);
    for (const x of k) {
      expect((x as { source: string }).source).toBe("ayrilmis");
      expect((x as { filter: unknown }).filter).toEqual(["==", ["get", "ayrilmis"], 1]);
    }
    expect((k[1] as { paint: Record<string, unknown> }).paint["line-dasharray"]).toEqual([3, 2]);
    expect(okunan).toEqual(["--arsa-ayrilmis", "--arsa-ayrilmis-kenar"]);
  });

  it("belirteçler iki temada tanımlı hex", () => {
    for (const t of [0, 1] as const) {
      const m = renkTablosu(t);
      expect(m.get("arsa-ayrilmis")).toMatch(/^#[0-9a-f]{6}$/);
      expect(m.get("arsa-ayrilmis-kenar")).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

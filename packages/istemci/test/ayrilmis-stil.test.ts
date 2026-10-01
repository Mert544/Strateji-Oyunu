/** B3: ayrılmış hücre katmanları (stil.ts): kaynak, süzgeç, belirteçler, kesikli kenar; belirteç tanımlı. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ayrilmisKatmanlari, oyunKatmanlari } from "../src/harita/stil";
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

describe("ayrılmış hücre katmanları stil kurulumunda (B3)", () => {
  const renkA = (ad: string): string => `a:${ad}`;
  const renkB = (ad: string): string => `b:${ad}`;

  it("tema ya da stil yeniden kurulunca aynı katmanlar gelir (yalnız renk değişir)", () => {
    const a = ayrilmisKatmanlari(renkA);
    const b = ayrilmisKatmanlari(renkB);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).toContain("a:--arsa-ayrilmis");
    expect(JSON.stringify(b)).toContain("b:--arsa-ayrilmis-kenar");
  });

  it("oyun katmanlarıyla çakışmaz (kimlikler benzersiz); süzgeç ayrilmis == 1", () => {
    const ids = [...oyunKatmanlari(renkA, false), ...ayrilmisKatmanlari(renkA)].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of ayrilmisKatmanlari(renkA)) expect(JSON.stringify((x as { filter: unknown }).filter)).toBe('["==",["get","ayrilmis"],1]');
  });

  it("gorunum.ts kaynağı stil `sources` içinde tanımlar ve katmanları `katmanlar()` içinde yayar (kaynak yokken katman eklenmez)", () => {
    const g = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "harita", "gorunum.ts"), "utf8");
    expect(g).toContain('ayrilmis: { type: "geojson", data: BOS },');
    expect(g).toContain("...ayrilmisKatmanlari(renk)");
    expect(g).toContain('if (!this.harita.getSource("ayrilmis"))'); // K1'in koşullu addSource satırı kalır
  });
});

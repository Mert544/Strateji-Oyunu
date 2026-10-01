import { describe, expect, it } from "vitest";
import type { IlceSahipligi } from "../src/harita/baglanti";
import { asamaKutulari, ornekInsaatlar, parselBayraklari } from "../src/yuru/arsa";

function sahiplik(h: [string, string][]): IlceSahipligi {
  return { ilce: "x", uygun: 1000, satilmis: h.length, hucreler: new Map(h.map(([id, sahip]) => [id, { sahip, sinif: "kirsal" as const, degerMili: 1, alinma: 0 }])) };
}

describe("yürüyüş: arsa katmanı", () => {
  it("bayrak: sahip başına bitişik parsel başına bir tane, deterministik", () => {
    const s = sahiplik([
      ["10:10", "ben"],
      ["11:10", "ben"],
      ["11:11", "ben"],
      ["20:20", "ben"], // ayrık ikinci parsel
      ["12:10", "bot"], // bitişik ama başka sahip
    ]);
    const b = parselBayraklari(s);
    expect(b).toEqual([
      { hucre: "10:10", sahip: "ben" },
      { hucre: "12:10", sahip: "bot" },
      { hucre: "20:20", sahip: "ben" },
    ]);
    expect(parselBayraklari(null)).toEqual([]);
  });

  it("örnek inşaatlar yalnız başkalarının parsellerinde; ilk parselde dört aşama yan yana", () => {
    const h: [string, string][] = [];
    for (const [o, x0] of [
      ["bot-a", 100],
      ["bot-b", 200],
      ["bot-c", 300],
    ] as const)
      for (let i = 0; i < 9; i++) h.push([`${x0 + (i % 3)}:${50 + Math.floor(i / 3)}`, o]);
    h.push(["5:5", "ben"]);
    const l = ornekInsaatlar(sahiplik(h), "ben");
    expect(l.filter((i) => Number(i.hucre.split(":")[0]) < 110).map((i) => [i.hucre, i.asama])).toEqual([
      ["100:50", 0],
      ["100:52", 1],
      ["102:50", 2],
      ["102:52", 3],
    ]);
    expect(l).toHaveLength(6);
    expect(l.every((i) => i.ornek && !i.hucre.startsWith("5:"))).toBe(true);
    expect(ornekInsaatlar(sahiplik(h), "ben")).toEqual(l);
  });

  it("aşama kutuları hücre içinde; dolu hacim aşamayla büyür", () => {
    const c = 29;
    let onceki = 0;
    for (const a of [0, 1, 2, 3] as const) {
      const k = asamaKutulari(a, c);
      const hacim = k.reduce((t, [, , , sx, sy, sz]) => t + sx * sy * sz, 0);
      expect(hacim).toBeGreaterThan(onceki);
      onceki = hacim;
      for (const [x, , z, sx, , sz] of k) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(z).toBeGreaterThanOrEqual(0);
        expect(x + sx).toBeLessThanOrEqual(c);
        expect(z + sz).toBeLessThanOrEqual(c);
      }
    }
  });
});

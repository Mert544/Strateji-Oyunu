/** Aşınma görünümü: kademe eşikleri, yürüyüş soluklaşması ve L3 `w` alanı; alan yokken görünüm birebir aynı. */
import { describe, expect, it } from "vitest";
import { Scene, ShaderMaterial } from "three";
import type { InstancedBufferGeometry } from "three";
import type { IlceSahipligi } from "../src/harita/baglanti";
import { asinmaOpakligi } from "../src/harita/stil";
import { ASINMA_ESIKLERI, ASINMA_OPAKLIK, ASINMA_SOLMA, asinmaKademesi } from "../src/tasarim/asinma";
import { ArsaKatmani } from "../src/yuru/arsa";
import type { InsaatBilgisi } from "../src/yuru/arsa";
import type { YuruPaleti } from "../src/yuru/palet";

describe("aşınma kademeleri", () => {
  it("< %10 yok, %10..<%40 hafif, >= %40 belirgin; tanımsız ve NaN yok", () => {
    expect([undefined, NaN, 0, 99_999].map(asinmaKademesi)).toEqual([0, 0, 0, 0]);
    expect([100_000, 399_999].map(asinmaKademesi)).toEqual([1, 1]);
    expect([400_000, 1_000_000].map(asinmaKademesi)).toEqual([2, 2]);
  });
  it("eşikler tek sabitte; kademe tabloları artan (soluklaşma artar, opaklık azalır)", () => {
    expect(ASINMA_ESIKLERI).toEqual({ hafifPpm: 100_000, belirginPpm: 400_000 });
    expect(ASINMA_SOLMA[0]).toBe(0);
    expect(ASINMA_SOLMA[1]).toBeLessThan(ASINMA_SOLMA[2]);
    expect(ASINMA_OPAKLIK[0]).toBe(1);
    expect(ASINMA_OPAKLIK[1]).toBeGreaterThan(ASINMA_OPAKLIK[2]);
  });
  it("A3 §5.10 uyumu: tavan %25 verim kaybıyla belirgin kademe (%40 aşınma) en çok %10 verim kaybı", () => {
    const tavan = 0.25;
    expect(ASINMA_ESIKLERI.belirginPpm / 1_000_000 * tavan).toBeCloseTo(0.1, 6);
  });
});

describe("yürüyüş: tesis soluklaşması", () => {
  const pal = {
    koyu: false, ben: [0, 0.47, 0.51], baskasi: [0.5, 0.5, 0.5], sinif: new Float32Array(120).fill(0.3), izgara: [0.5, 0.5, 0.5], izgaraAlfa: 0.1,
    insaat: [[0.5, 0.5, 0.5], [0.6, 0.5, 0.4], [0.9, 0.9, 0.9], [0.8, 0.7, 0.6]],
  } as unknown as YuruPaleti;
  const sahipl: IlceSahipligi = { ilce: "x", uygun: 1000, satilmis: 1, hucreler: new Map([["10:10", { sahip: "bot", sinif: "kirsal" as const, degerMili: 1, alinma: 0 }]]) };
  const m = (): ShaderMaterial => new ShaderMaterial();
  const kur = (i: InsaatBilgisi[]): { renk: number[]; ofset: number[]; sayi: number; nesne: number } => {
    const sahne = new Scene();
    const kat = new ArsaKatmani(sahne, { X0: 0, Y0: 0, k: 29 }, pal, { izgara: m(), dolgu: m(), kenar: m(), kutu: m() });
    kat.veriAyarla(sahipl, "ben", i);
    const g = kat.insaat.geometry as InstancedBufferGeometry;
    return { renk: [...(g.getAttribute("aRenk").array as Float32Array)], ofset: [...(g.getAttribute("aOfset").array as Float32Array)], sayi: g.instanceCount, nesne: sahne.children.length };
  };
  const taban = kur([{ hucre: "10:10", asama: 3 }]);
  it("alan yok, undefined, 0 ve %10 altı: renkler ve konumlar birebir aynı", () => {
    for (const a of [undefined, 0, 99_999]) {
      const k = kur([{ hucre: "10:10", asama: 3, ...(a === undefined ? {} : { asinmaPpm: a }) }]);
      expect(k.renk).toEqual(taban.renk);
      expect(k.ofset).toEqual(taban.ofset);
    }
  });
  it("hafif ve belirgin: renk açık betona doğru kademeyle soluklaşır; konum, kutu sayısı ve nesne sayısı değişmez (+0 çizim)", () => {
    const hafif = kur([{ hucre: "10:10", asama: 3, asinmaPpm: 150_000 }]);
    const belirgin = kur([{ hucre: "10:10", asama: 3, asinmaPpm: 700_000 }]);
    for (const k of [hafif, belirgin]) {
      expect(k.ofset).toEqual(taban.ofset);
      expect(k.sayi).toBe(taban.sayi);
      expect(k.nesne).toBe(4);
    }
    // gövde (renk 3 = [0.8,0.7,0.6]) açık beton [0.9,0.9,0.9] yönünde: mavi bileşen artar, kademe arttıkça daha çok
    const i = taban.renk.findIndex((v, j) => j % 3 === 0 && Math.abs(v - 0.8) < 1e-6 && Math.abs((taban.renk[j + 1] ?? 0) - 0.7) < 1e-6);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(hafif.renk[i + 2]!).toBeGreaterThan(taban.renk[i + 2]!);
    expect(belirgin.renk[i + 2]!).toBeGreaterThan(hafif.renk[i + 2]!);
  });
  it("inşaat sürerken (Tamam değil) aşınma görünmez", () => {
    const eksik = kur([{ hucre: "10:10", asama: 2, asinmaPpm: 900_000 }]);
    expect(eksik.renk).toEqual(kur([{ hucre: "10:10", asama: 2 }]).renk);
  });
});

/** Katı değerlendirici (case, has, get, match, *): olmayan alanı `get` ile okumak HATA. */
function degerle(e: unknown, o: Record<string, unknown>): unknown {
  if (!Array.isArray(e)) return e;
  const [op, ...a] = e as [string, ...unknown[]];
  switch (op) {
    case "get": {
      if (!((a[0] as string) in o)) throw new Error(`olmayan alan okundu: ${a[0] as string}`);
      return o[a[0] as string];
    }
    case "has": return (a[0] as string) in o;
    case "case": {
      for (let i = 0; i + 1 < a.length; i += 2) if (degerle(a[i], o)) return degerle(a[i + 1], o);
      return degerle(a[a.length - 1], o);
    }
    case "match": {
      const v = degerle(a[0], o);
      for (let i = 1; i + 1 < a.length; i += 2) if (a[i] === v) return a[i + 1];
      return a[a.length - 1];
    }
    case "*": return a.reduce<number>((t, x) => t * (degerle(x, o) as number), 1);
    default: throw new Error(`desteklenmeyen işlem: ${op}`);
  }
}

describe("L3: `w` alanı (sahte GeoJSON özellikleri)", () => {
  const dolgu = ["match", ["get", "a"], 0, 0.25, 1, 0.45, 2, 0.65, 0.92];
  const e = asinmaOpakligi(dolgu as never);
  it("w yokken değer eski ifadeyle birebir aynı (her aşamada) ve alan okunmaz", () => {
    for (const a of [0, 1, 2, 3]) expect(degerle(e, { a })).toBe(degerle(dolgu, { a }));
    expect(degerle(asinmaOpakligi(0.7), { a: 3 })).toBe(0.7);
  });
  it("w = 0 değişmez; 1 ve 2 kademeye göre soluk", () => {
    expect(degerle(e, { a: 3, w: 0 })).toBe(0.92);
    expect(degerle(e, { a: 3, w: 1 })).toBeCloseTo(0.92 * ASINMA_OPAKLIK[1], 10);
    expect(degerle(e, { a: 3, w: 2 })).toBeCloseTo(0.92 * ASINMA_OPAKLIK[2], 10);
    expect(degerle(asinmaOpakligi(0.7), { a: 3, w: 2 })).toBeCloseTo(0.7 * ASINMA_OPAKLIK[2], 10);
  });
});

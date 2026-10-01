/** G7 görsel: dükkân kutuları (yürüyüş), marka eşlemeleri ve örnek veri. DOM/GL yok. */
import { describe, expect, it } from "vitest";
import { Scene, ShaderMaterial } from "three";
import type { IlceSahipligi } from "../src/harita/baglanti";
import { dukkanSimgeKatmani, oyunKatmanlari, yapiDolguRengi } from "../src/harita/stil";
import { MARKA_RENK_SAYISI, MARKA_SIMGELERI, DUKKAN_SIMGELERI, dukkanSimgesi, markaRenkBelirteci } from "../src/tasarim/marka";
import { ArsaKatmani, asamaKutulari, dukkanKutulari, ornekInsaatlar } from "../src/yuru/arsa";
import type { InsaatBilgisi } from "../src/yuru/arsa";
import type { YuruPaleti } from "../src/yuru/palet";

describe("marka eşlemeleri", () => {
  it("renk belirteci oyuncu paletine eşit; sınır dışı ve negatif değer modülle döner", () => {
    expect(markaRenkBelirteci(0)).toBe("--oyuncu-0");
    expect(markaRenkBelirteci(11)).toBe("--oyuncu-11");
    expect(markaRenkBelirteci(12)).toBe("--oyuncu-0");
    expect(markaRenkBelirteci(-1)).toBe("--oyuncu-11");
    expect(MARKA_RENK_SAYISI).toBe(12);
  });
  it("8 marka simgesi, 5 dükkân türü simgesi; bilinmeyen tür genel dükkân simgesi", () => {
    expect(new Set(MARKA_SIMGELERI).size).toBe(8);
    expect(Object.keys(DUKKAN_SIMGELERI).sort()).toEqual(["bakkal", "firin", "sarkuteri", "sekerci", "yapi_market"]);
    expect(dukkanSimgesi("firin")).toBe("croissant");
    expect(dukkanSimgesi("yok")).toBe("store");
  });
});

describe("dükkân kutuları", () => {
  const c = 29;
  const k = dukkanKutulari(c);
  it("hepsi hücre içinde; gövde, çatı, marka şeridi, tabela ve üç raf var", () => {
    for (const [x, , z, sx, , sz] of k) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(z).toBeGreaterThanOrEqual(0);
      expect(x + sx).toBeLessThanOrEqual(c);
      expect(z + sz).toBeLessThanOrEqual(c);
    }
    const sayi = (r: number): number => k.filter((b) => b[6] === r).length;
    expect([sayi(3), sayi(4), sayi(5), sayi(6), sayi(7)]).toEqual([1, 1, 2, 1, 3]);
  });
  it("gövde ayak izi bitmiş yapıyla aynı (çarpışma değişmez); dükkân alçak", () => {
    const g = k.find((b) => b[6] === 3)!;
    const t = asamaKutulari(3, c).find((b) => b[6] === 3)!;
    expect([g[0], g[2], g[3], g[5]]).toEqual([t[0], t[2], t[3], t[5]]);
    expect(g[4]).toBeLessThan(t[4]);
  });
});

describe("örnek veri ve katman", () => {
  const sahiplik = (h: [string, string][]): IlceSahipligi => ({ ilce: "x", uygun: 1000, satilmis: h.length, hucreler: new Map(h.map(([id, sahip]) => [id, { sahip, sinif: "kirsal" as const, degerMili: 1, alinma: 0 }])) });
  const botlar = (): [string, string][] => {
    const h: [string, string][] = [["5:5", "ben"]];
    for (const [o, x0] of [["bot-a", 100], ["bot-b", 200], ["bot-c", 300], ["bot-d", 400], ["bot-e", 500]] as const) for (let i = 0; i < 9; i++) h.push([`${x0 + (i % 3)}:${50 + Math.floor(i / 3)}`, o]);
    return h;
  };
  it("örnek dükkân yalnız Tamam aşamasında; tür ve marka rengi geçerli; deterministik", () => {
    const l = ornekInsaatlar(sahiplik(botlar()), "ben");
    const dukkanli = l.filter((i) => i.dukkan);
    expect(dukkanli.length).toBeGreaterThan(0);
    for (const i of dukkanli) {
      expect(i.asama).toBe(3);
      expect(i.dukkan!.tur in DUKKAN_SIMGELERI).toBe(true);
      expect(i.dukkan!.markaRenk).toBeGreaterThanOrEqual(0);
      expect(i.dukkan!.markaRenk).toBeLessThan(MARKA_RENK_SAYISI);
    }
    expect(l.filter((i) => i.asama === 3 && !i.dukkan)).toEqual([]);
    expect(ornekInsaatlar(sahiplik(botlar()), "ben")).toEqual(l);
  });
  it("dükkân örnek sayısı: gövde yerine dükkân kutuları (marka rengi paletten); ek çizim nesnesi yok", () => {
    const pal = {
      koyu: false, ben: [0, 0.47, 0.51], baskasi: [0.5, 0.5, 0.5], sinif: new Float32Array(120), izgara: [0.5, 0.5, 0.5], izgaraAlfa: 0.1,
      insaat: [[0.5, 0.5, 0.5], [0.6, 0.5, 0.4], [0.7, 0.7, 0.7], [0.8, 0.8, 0.7]], marka: Float32Array.from({ length: 36 }, (_, i) => (i % 7) / 7),
    } as unknown as YuruPaleti;
    const m = (): ShaderMaterial => new ShaderMaterial();
    const sahne = new Scene();
    const kat = new ArsaKatmani(sahne, { X0: 0, Y0: 0, k: 29 }, pal, { izgara: m(), dolgu: m(), kenar: m(), kutu: m() });
    const sahipl = sahiplik([["10:10", "bot"]]);
    const say = (i: InsaatBilgisi[]): number => {
      kat.veriAyarla(sahipl, "ben", i);
      return (kat.insaat.geometry as unknown as { instanceCount: number }).instanceCount;
    };
    const duz = say([{ hucre: "10:10", asama: 3 }]);
    const dk = say([{ hucre: "10:10", asama: 3, dukkan: { tur: "bakkal", markaRenk: 4 } }]);
    const eksik = say([{ hucre: "10:10", asama: 2, dukkan: { tur: "bakkal", markaRenk: 4 } }]);
    expect(dk).toBeGreaterThan(duz);
    expect(eksik).toBe(say([{ hucre: "10:10", asama: 2 }])); // inşaat sürerken dükkân görünümü yok
    expect(sahne.children.length).toBe(4); // izgara, dolgu, kenar, kutu: dükkân ek nesne açmaz
    expect(kat.engelHalkalari()[0]!.ust).toBeLessThan(10);
  });
});

describe("L3 dükkân boyası", () => {
  const r = (ad: string): string => `#${ad.length.toString(16).padStart(2, "0")}0000`;
  it("yapı dolgusu: marka özelliği varsa oyuncu paleti (12 renk), yoksa yapının kendi rengi", () => {
    const e = yapiDolguRengi(r) as unknown as unknown[];
    expect(e[0]).toBe("case");
    expect(e[1]).toEqual(["has", "m"]);
    expect((e[2] as unknown[]).length).toBe(2 + 12 * 2 + 1);
    expect(e[3]).toEqual(["get", "c"]);
  });
  it("dükkân simge katmanı yalnız simgeler kayıtlıysa eklenir; yalnız bitmiş dükkânlarda", () => {
    expect(oyunKatmanlari(r, false).some((l) => l.id === "dukkan-simge")).toBe(false);
    expect(oyunKatmanlari(r, false, true).some((l) => l.id === "dukkan-simge")).toBe(true);
    const k = dukkanSimgeKatmani(r);
    expect(k.type).toBe("symbol");
    expect(JSON.stringify((k as { filter: unknown }).filter)).toContain('"has","d"');
  });
});

/** Kullanılan ifade alt kümesi için katı değerlendirici (case, has, get, match, all, >=, concat): olmayan alanı `get` ile okumak HATA. */
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
    case "all": return a.every((x) => degerle(x, o));
    case ">=": return (degerle(a[0], o) as number) >= (degerle(a[1], o) as number);
    case "concat": return a.map((x) => String(degerle(x, o))).join("");
    default: throw new Error(`desteklenmeyen işlem: ${op}`);
  }
}

describe("L3 dükkân ifadeleri sahte GeoJSON özellikleriyle", () => {
  const r = (ad: string): string => `renk${ad}`;
  const duz = { c: "#123456", a: 3 }; // dükkân olmayan yapı: d ve m alanları hiç yok
  const dukkan = { c: "#123456", a: 3, d: "bakkal", m: 4 };
  const insaatDukkan = { c: "#123456", a: 1, d: "firin", m: 2 };
  it("dolgu rengi: alan yokken hata vermez ve yapının rengi; marka varsa paletin ilgili rengi", () => {
    const e = yapiDolguRengi(r);
    expect(degerle(e, duz)).toBe("#123456");
    expect(degerle(e, dukkan)).toBe("renk--oyuncu-4");
    expect(degerle(e, { ...dukkan, m: 99 })).toBe("renk--murekkep-3");
  });
  it("simge katmanı: yalnız bitmiş dükkânda ve `dukkan-<tür>` görüntüsü; dükkân olmayan yapıda alan okunmaz", () => {
    const k = dukkanSimgeKatmani(r) as unknown as { filter: unknown; layout: Record<string, unknown> };
    expect(degerle(k.filter, duz)).toBe(false);
    expect(degerle(k.filter, insaatDukkan)).toBe(false);
    expect(degerle(k.filter, dukkan)).toBe(true);
    expect(degerle(k.layout["icon-image"], dukkan)).toBe("dukkan-bakkal");
  });
});

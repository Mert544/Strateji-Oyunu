/**
 * Harita (S8): aksan duyarsız il/ilçe araması (gerçek OSM hiyerarşisiyle) ve küçük geometri yardımcıları.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ara, dizinKur, katla } from "../src/harita/arama";
import { cerceve, noktaCokgende } from "../src/harita/geometri";
import { aramaKayitlari, hiyerarsiCoz } from "../src/harita/veri";

const ODBL = resolve(dirname(fileURLToPath(import.meta.url)), "../../veri/haritalar/odbl");
const hiyerarsi = hiyerarsiCoz(JSON.parse(readFileSync(resolve(ODBL, "hiyerarsi.json"), "utf8")));
const dizin = dizinKur(aramaKayitlari(hiyerarsi));

describe("katla", () => {
  it("Türkçe harfleri ve büyük harfi katlar", () => {
    expect(katla("İstanbul")).toBe("istanbul");
    expect(katla("ISTANBUL")).toBe("istanbul");
    expect(katla("Kadıköy")).toBe("kadikoy");
    expect(katla("GÖLCÜK")).toBe("golcuk");
    expect(katla("Çayırova")).toBe("cayirova");
    expect(katla("Şile")).toBe("sile");
    expect(katla("Ağrı")).toBe("agri");
    expect(katla("  Gebze ")).toBe("gebze");
    expect(katla("Târgu-Jiu")).toBe("targu jiu");
  });
});

describe("ara (gerçek hiyerarşi)", () => {
  it("istanbul -> İstanbul ili ilk sırada", () => {
    const s = ara(dizin, "istanbul");
    expect(s.il[0]?.ad).toBe("İstanbul");
  });

  it("kadikoy -> Kadıköy ilçesi (İstanbul)", () => {
    const s = ara(dizin, "kadikoy");
    expect(s.ilce[0]).toMatchObject({ ad: "Kadıköy", ust: "İstanbul" });
  });

  it("golcuk / gölcük / GÖLCÜK aynı sonucu verir", () => {
    const a = ara(dizin, "golcuk").ilce.map((k) => k.kimlik);
    expect(a).toContain("tr_41_golcuk");
    expect(ara(dizin, "gölcük").ilce.map((k) => k.kimlik)).toEqual(a);
    expect(ara(dizin, "GÖLCÜK").ilce.map((k) => k.kimlik)).toEqual(a);
  });

  it("gebze -> tr_41_gebze; kocaeli -> il", () => {
    expect(ara(dizin, "gebze").ilce[0]?.kimlik).toBe("tr_41_gebze");
    expect(ara(dizin, "kocaeli").il[0]?.kimlik).toBe("tr_41");
  });

  it("ad başı eşleşmesi içerdekinden önce gelir; grup başına sınır", () => {
    const s = ara(dizin, "kar", 5);
    expect(s.ilce.length).toBeLessThanOrEqual(5);
    for (const k of s.ilce) expect(katla(k.ad).startsWith("kar")).toBe(true);
    expect(ara(dizin, "").il).toEqual([]);
    expect(ara(dizin, "zzzqqq").ilce).toEqual([]);
  });

  it("hiyerarşi sayıları: 150 il, 3617 ilçe; Kocaeli İzmit Körfezi bölgesinde", () => {
    expect(hiyerarsi.iller.size).toBe(150);
    expect(hiyerarsi.ilceler.size).toBe(3617);
    const k = hiyerarsi.iller.get("tr_41");
    expect(k?.ilceler).toContain("tr_41_gebze");
    expect(hiyerarsi.bolgeler.get(k?.bolge ?? "")?.ad).toBe("İzmit Körfezi");
  });
});

describe("geometri", () => {
  const kare = { type: "Polygon" as const, coordinates: [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
    [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
  ] };
  it("çift-tek kuralı ve delik", () => {
    expect(noktaCokgende(1, 1, kare)).toBe(true);
    expect(noktaCokgende(5, 5, kare)).toBe(false);
    expect(noktaCokgende(11, 5, kare)).toBe(false);
    expect(cerceve(kare)).toEqual([0, 0, 10, 10]);
    const coklu = { type: "MultiPolygon" as const, coordinates: [kare.coordinates, [[[20, 20], [21, 20], [21, 21], [20, 20]]]] };
    expect(noktaCokgende(20.8, 20.5, coklu)).toBe(true);
    expect(cerceve(coklu)).toEqual([0, 0, 21, 21]);
  });
});

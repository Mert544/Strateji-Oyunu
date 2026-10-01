import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PMTiles } from "pmtiles";
import type { RangeResponse, Source } from "pmtiles";
import { describe, expect, it } from "vitest";
import { birlestir, GeometriYazici, parcaOzeti } from "../src/yuru/geometri-yazici";
import type { GeometriParcasi } from "../src/yuru/geometri-yazici";
import { bolumKirp, halkaKirp, ISTENEN_KATMANLAR, karoGeometrisi, S, varsayilanYukseklik, yolSinifi } from "../src/yuru/karo-geometri";
import { cokgenler, halkaAlani, mvtCoz } from "../src/yuru/mvt";
import { delik, kare, mvtYaz } from "./yuru-yardimci";

const OLCEK = 926 / 4096;

function ornekKaro(): Uint8Array {
  return mvtYaz({
    earth: [{ tur: 3, ozellik: { kind: "earth" }, parcalar: [kare(-80, -80, 4176, 4176)] }],
    landuse: [
      { tur: 3, ozellik: { kind: "park", sort_rank: 180 }, parcalar: [kare(100, 100, 900, 900)] },
      { tur: 3, ozellik: { kind: "bilinmeyen_tur" }, parcalar: [kare(1000, 100, 1200, 300)] },
    ],
    water: [{ tur: 3, ozellik: { kind: "water" }, parcalar: [kare(3000, 3000, 4200, 4200)] }],
    roads: [
      { tur: 2, ozellik: { kind: "major_road", kind_detail: "primary", sort_rank: 400 }, parcalar: [[0, 2000, 4096, 2000]] },
      { tur: 2, ozellik: { kind: "minor_road", sort_rank: 300 }, parcalar: [[2000, -50, 2000, 4150, 2500, 4150]] },
      { tur: 2, ozellik: { kind: "minor_road", is_tunnel: true }, parcalar: [[0, 0, 100, 100]] },
    ],
    buildings: [
      { tur: 3, ozellik: { kind: "building", height: 21.5, min_height: 3 }, parcalar: [kare(1500, 1500, 1600, 1600)] },
      { tur: 3, ozellik: { kind: "building" }, parcalar: [kare(1700, 1500, 1760, 1560), kare(2600, 2600, 2900, 2900), delik(2700, 2700, 2800, 2800)] },
      // Karo sınırını aşan bina (kırpılır)
      { tur: 3, ozellik: { kind: "building" }, parcalar: [kare(4050, 500, 4150, 560)] },
      { tur: 1, ozellik: { kind: "address" }, parcalar: [[10, 10]] },
    ],
    pois: [{ tur: 1, ozellik: { kind: "cafe" }, parcalar: [[5, 5]] }],
  });
}

function gecerli(p: GeometriParcasi): void {
  const n = p.sinif.length;
  expect(p.konum.length).toBe(n * 3);
  expect(p.golge.length).toBe(n);
  expect(p.indeks.length % 3).toBe(0);
  for (const i of p.indeks) expect(i).toBeLessThan(n);
  for (const v of p.konum) expect(Number.isFinite(v)).toBe(true);
}

describe("yürüyüş: MVT çözücü", () => {
  it("katmanları, nitelikleri ve geometriyi çözer; istenmeyen katmanı atlar", () => {
    const k = mvtCoz(ornekKaro(), ISTENEN_KATMANLAR);
    expect([...k.keys()].sort()).toEqual(["buildings", "earth", "landuse", "roads", "water"]);
    const b = k.get("buildings")!;
    expect(b.extent).toBe(4096);
    expect(b.ozellikler[0]!.ozellik).toEqual({ kind: "building", height: 21.5, min_height: 3 });
    expect(b.ozellikler[0]!.parcalar[0]).toEqual(kare(1500, 1500, 1600, 1600));
    const r = k.get("roads")!.ozellikler;
    expect(r[1]!.parcalar[0]).toEqual([2000, -50, 2000, 4150, 2500, 4150]);
    expect(r[2]!.ozellik["is_tunnel"]).toBe(true);
    // Avlulu bina: dış + delik tek çokgende
    const c = cokgenler(b.ozellikler[1]!.parcalar);
    expect(c.map((x) => x.length)).toEqual([1, 2]);
    expect(halkaAlani(c[1]![0]!)).toBeGreaterThan(0);
    expect(halkaAlani(c[1]![1]!)).toBeLessThan(0);
  });
});

describe("yürüyüş: kırpma ve sınıflar", () => {
  it("halka karo karesine kırpılır", () => {
    const h = halkaKirp(kare(-100, 1000, 500, 2000), 4096);
    expect(Math.abs(halkaAlani(h))).toBeCloseTo(500 * 1000, 6);
    expect(halkaKirp(kare(5000, 5000, 5100, 5100), 4096)).toEqual([]);
  });

  it("doğru parçası kırpılır", () => {
    expect(bolumKirp(-100, 50, 100, 50, 4096)).toEqual([0, 50, 100, 50]);
    expect(bolumKirp(-100, -50, -10, -5, 4096)).toBeNull();
  });

  it("yol genişlikleri sınıfa göre", () => {
    expect(yolSinifi({ kind: "highway" })).toEqual([S.OTOYOL, 16]);
    expect(yolSinifi({ kind: "major_road", kind_detail: "primary" })).toEqual([S.ANA_YOL, 12]);
    expect(yolSinifi({ kind: "minor_road", kind_detail: "service" })).toEqual([S.TALI_YOL, 4.5]);
    expect(yolSinifi({ kind: "path" })![1]).toBeLessThan(3);
    expect(yolSinifi({ kind: "minor_road", is_tunnel: true })).toBeNull();
    expect(yolSinifi({ kind: "ferry" })).toBeNull();
  });

  it("varsayılan bina yüksekliği alana göre makul ve deterministik", () => {
    expect(varsayilanYukseklik(15, 7)).toBeCloseTo(2.8);
    for (let t = 0; t < 20; t++) {
      const h = varsayilanYukseklik(300, t);
      expect(h).toBeGreaterThanOrEqual(6);
      expect(h).toBeLessThanOrEqual(15);
      expect(varsayilanYukseklik(5000, t)).toBeLessThanOrEqual(12);
    }
    expect(varsayilanYukseklik(300, 12345)).toBe(varsayilanYukseklik(300, 12345));
  });
});

describe("yürüyüş: karo → geometri", () => {
  const katmanlar = mvtCoz(ornekKaro(), ISTENEN_KATMANLAR);

  it("karo başına üç birleştirilmiş parça (yer + bina + kenar çizgisi) ve geçerli tamponlar", () => {
    const g = karoGeometrisi({ katmanlar, olcek: OLCEK });
    gecerli(g.yer);
    gecerli(g.bina);
    expect(g.istatistik.bina).toBe(4);
    expect(g.istatistik.yol).toBe(2); // tünel çizilmez
    expect(g.istatistik.arazi).toBe(1); // bilinmeyen tür çizilmez
    expect(g.istatistik.su).toBe(1);
    // Yer düz (y = 0), karo karesinin içinde
    for (let i = 0; i < g.yer.konum.length; i += 3) {
      expect(g.yer.konum[i + 1]).toBe(0);
      expect(g.yer.konum[i]).toBeGreaterThanOrEqual(-1e-3 - 8);
      expect(g.yer.konum[i]).toBeLessThanOrEqual(926 + 8);
    }
    // İlk üçgen taban (deniz), sonra kara
    expect(g.yer.sinif[0]).toBe(S.DENIZ);
    expect([...g.yer.sinif]).toContain(S.KARA);
    expect([...g.yer.sinif]).toContain(S.ANA_YOL);
    // Kaldırım asfalttan önce (altında) çizilir; çizgiler çift köşeli
    const sira = [...g.yer.sinif];
    expect(sira).toContain(S.KALDIRIM);
    expect(sira.lastIndexOf(S.KALDIRIM)).toBeLessThan(sira.indexOf(S.ANA_YOL));
    expect(g.cizgi.konum.length % 6).toBe(0);
    expect(g.cizgi.sinif.length).toBe(g.cizgi.konum.length / 3);
    expect(g.cizgi.konum.length).toBeGreaterThan(0);
  });

  it("bina yüksekliği: height/min_height ya da varsayılan; çatılar yukarı bakar", () => {
    const g = karoGeometrisi({ katmanlar, olcek: OLCEK });
    const yler = new Set<number>();
    for (let i = 1; i < g.bina.konum.length; i += 3) yler.add(Math.round(g.bina.konum[i]! * 100) / 100);
    expect(yler.has(21.5)).toBe(true);
    expect(yler.has(3)).toBe(true);
    // Çatı üçgenlerinin normali +y
    const p = g.bina.konum;
    for (let t = 0; t < g.bina.indeks.length; t += 3) {
      const [a, b, c] = [g.bina.indeks[t]!, g.bina.indeks[t + 1]!, g.bina.indeks[t + 2]!];
      if (g.bina.sinif[a] !== S.BINA_CATI && g.bina.sinif[a] !== S.SANAYI_CATI) continue;
      const ux = p[b * 3]! - p[a * 3]!;
      const uz = p[b * 3 + 2]! - p[a * 3 + 2]!;
      const vx = p[c * 3]! - p[a * 3]!;
      const vz = p[c * 3 + 2]! - p[a * 3 + 2]!;
      expect(uz * vx - ux * vz).toBeGreaterThanOrEqual(0);
    }
    // Ayak izleri: 4 bina, avlulu binada 2 halka
    expect(g.iz.halkaBas.length - 1).toBe(5);
    expect(Math.max(...g.iz.bina)).toBe(3);
  });

  it("duvar üçgenleri dışa bakar (sarım: (b−a)×(c−a) bina merkezinden uzağa)", () => {
    const k = mvtCoz(mvtYaz({ buildings: [{ tur: 3, ozellik: { kind: "building", height: 10 }, parcalar: [kare(1000, 1000, 1100, 1100)] }] }), ISTENEN_KATMANLAR);
    const g = karoGeometrisi({ katmanlar: k, olcek: 1 });
    const p = g.bina.konum;
    let duvar = 0;
    for (let t = 0; t < g.bina.indeks.length; t += 3) {
      const [a, b, c] = [g.bina.indeks[t]!, g.bina.indeks[t + 1]!, g.bina.indeks[t + 2]!];
      const v = (i: number): [number, number, number] => [p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!];
      const [A, B, C] = [v(a), v(b), v(c)];
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      const w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      const n = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
      const mx = (A[0] + B[0] + C[0]) / 3 - 1050;
      const mz = (A[2] + B[2] + C[2]) / 3 - 1050;
      if (Math.abs(n[1]!) > 1e-6) {
        expect(n[1]!).toBeGreaterThan(0); // çatı yukarı
        continue;
      }
      // Parapetin iç yüzü (çatı kotunun üstü) bilerek içe bakar: üstten bakınca çatı çukurda okunur
      if ((A[1] + B[1] + C[1]) / 3 >= 10) {
        expect(n[0]! * mx + n[2]! * mz).toBeLessThan(0);
        continue;
      }
      duvar++;
      expect(n[0]! * mx + n[2]! * mz).toBeGreaterThan(0);
    }
    expect(duvar).toBe(8);
  });

  it("karo sınırını aşan bina kırpılır; sınırdaki kırpma kenarına duvar yapılmaz", () => {
    const g = karoGeometrisi({ katmanlar, olcek: OLCEK });
    const sonHalka = g.iz.halkaBas.length - 2;
    const b = g.iz.halkaBas[sonHalka]!;
    const s = g.iz.halkaBas[sonHalka + 1]!;
    for (let i = b; i < s; i++) expect(g.iz.nokta[i * 2]!).toBeLessThanOrEqual(4096 * OLCEK + 1e-3);
    // Duvar köşelerinde x = karo kenarında duran dikey duvar yok
    const E = 4096 * OLCEK;
    for (let t = 0; t < g.bina.indeks.length; t += 3) {
      const ix = [g.bina.indeks[t]!, g.bina.indeks[t + 1]!, g.bina.indeks[t + 2]!];
      if (g.bina.sinif[ix[0]!] !== S.BINA) continue;
      const hepsiSinirda = ix.every((i) => Math.abs(g.bina.konum[i * 3]! - E) < 1e-3);
      expect(hepsiSinirda).toBe(false);
    }
  });

  it("deterministik: aynı girdi aynı baytlar", () => {
    const a = karoGeometrisi({ katmanlar, olcek: OLCEK });
    const b = karoGeometrisi({ katmanlar: mvtCoz(ornekKaro(), ISTENEN_KATMANLAR), olcek: OLCEK });
    expect(parcaOzeti(a.yer)).toBe(parcaOzeti(b.yer));
    expect(parcaOzeti(a.bina)).toBe(parcaOzeti(b.bina));
    expect(Buffer.from(a.iz.nokta.buffer).equals(Buffer.from(b.iz.nokta.buffer))).toBe(true);
    expect(Buffer.from(a.cizgi.konum.buffer).equals(Buffer.from(b.cizgi.konum.buffer))).toBe(true);
  });

  it("boş karo: düz kara zemini", () => {
    const g = karoGeometrisi({ katmanlar: new Map(), olcek: OLCEK, bos: true });
    expect(g.yer.indeks.length).toBe(6);
    expect([...g.yer.sinif].every((s) => s === S.KARA)).toBe(true);
    expect(g.bina.indeks.length).toBe(0);
  });
});

describe("yürüyüş: çizim çağrısı birleştirme", () => {
  it("parçalar indeks kaydırılarak tek parçada birleşir", () => {
    const y1 = new GeometriYazici();
    y1.uc(y1.nokta(0, 0, 0, 1), y1.nokta(1, 0, 0, 1), y1.nokta(0, 0, 1, 1));
    const y2 = new GeometriYazici();
    y2.uc(y2.nokta(5, 0, 5, 2), y2.nokta(6, 0, 5, 2), y2.nokta(5, 0, 6, 2));
    y2.uc(0, 2, 1);
    const p = birlestir([y1.bitir(), y2.bitir()]);
    expect(p.sinif.length).toBe(6);
    expect([...p.indeks]).toEqual([0, 1, 2, 3, 4, 5, 3, 5, 4]);
    expect([...p.sinif]).toEqual([1, 1, 1, 2, 2, 2]);
    expect(p.konum[9]).toBe(5);
  });

  it("çok özellikli karo yine 3 çizim çağrısı; 3×3 pencere bütçe içinde", () => {
    // 400 binalık yoğun karo
    const binalar = [];
    for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) binalar.push({ tur: 3 as const, ozellik: { kind: "building" }, parcalar: [kare(i * 200 + 10, j * 200 + 10, i * 200 + 150, j * 200 + 120)] });
    const g = karoGeometrisi({ katmanlar: mvtCoz(mvtYaz({ buildings: binalar }), ISTENEN_KATMANLAR), olcek: OLCEK });
    expect(g.istatistik.bina).toBe(400);
    const karoBasina = 3;
    const sabit = 8; // karakterler (örnekli), ızgara, sahiplik dolgu + kenar, inşaat/bayrak (örnekli), hedef, gölge
    expect(9 * karoBasina + sabit).toBeLessThanOrEqual(60);
    // Bina başına: 4 duvar × 2 + (parapet iç yüzü 4 × 2 + düz çatı 2 | kırma çatı 6): en çok 18 üçgen
    expect(g.bina.indeks.length / 3).toBeLessThanOrEqual(400 * 18);
    expect(g.bina.indeks.length / 3).toBeGreaterThanOrEqual(400 * 14);
    // Cephe verisi (pencere ritmi, kat çizgisi gölgelendiricide): köşe başına 4 sayı + üst kot
    expect(g.bina.cephe?.length).toBe((g.bina.konum.length / 3) * 4);
    expect(g.bina.ust?.length).toBe(g.bina.konum.length / 3);
  });
});

// --- Gerçek Gebze verisi (önbellek varsa) ---------------------------------------------------------------

const DEPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const GEBZE = join(DEPO, "packages", "veri-hatti", ".onbellek", "karolar", "gebze-z15.pmtiles");

class DosyaKaynagi implements Source {
  private b: Buffer;
  constructor(private yol: string) {
    this.b = readFileSync(yol);
  }
  getKey(): string {
    return this.yol;
  }
  async getBytes(ofset: number, uzunluk: number): Promise<RangeResponse> {
    const d = this.b.subarray(ofset, ofset + uzunluk);
    return { data: d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) as ArrayBuffer };
  }
}

describe.skipIf(!existsSync(GEBZE))("yürüyüş: gerçek Gebze z15 karosu", () => {
  it("merkez karo çözülür, geometri kurulur ve iki koşu aynıdır", async () => {
    const p = new PMTiles(new DosyaKaynagi(GEBZE));
    const r = await p.getZxy(15, 19062, 12309);
    expect(r).toBeDefined();
    const bayt = new Uint8Array(r!.data);
    const t0 = performance.now();
    const a = karoGeometrisi({ katmanlar: mvtCoz(bayt, ISTENEN_KATMANLAR), olcek: OLCEK });
    const sure = performance.now() - t0;
    const b = karoGeometrisi({ katmanlar: mvtCoz(bayt, ISTENEN_KATMANLAR), olcek: OLCEK });
    expect(parcaOzeti(a.yer)).toBe(parcaOzeti(b.yer));
    expect(parcaOzeti(a.bina)).toBe(parcaOzeti(b.bina));
    expect(a.istatistik.bina).toBeGreaterThan(100);
    expect(a.istatistik.yol).toBeGreaterThan(20);
    gecerli(a.yer);
    gecerli(a.bina);
    console.log(`Gebze 15/19062/12309: ${bayt.length} B MVT, ${JSON.stringify(a.istatistik)}, ${sure.toFixed(1)} ms`);
  });
});

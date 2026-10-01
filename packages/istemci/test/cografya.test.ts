import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bolgeleriCoz, noktaIcinde, poligonMerkezi, sinirKutusu, ulkeleriCoz } from "../src/veri/cografya";
import type { TopoVeri } from "../src/veri/cografya";
import { haritayiBirlestir } from "../src/veri/harita-birlestir";
import { duzlemselAlan, poligonlariUcgenle } from "../src/kure/ucgenle";
import type { Poligon } from "../src/kure/ucgenle";
import type { HaritaDosyasi } from "@bolge/veri";

const AYRI = dirname(fileURLToPath(import.meta.url));
const oku = (yol: string): unknown => JSON.parse(readFileSync(join(AYRI, yol), "utf8"));
const dunya = oku("../src/veri/dunya-ulkeler.topo.json") as TopoVeri;
const gecici = oku("../src/veri/gecici-bolgeler.topo.json") as TopoVeri;
const sentetik = oku("../../veri/haritalar/sentetik-50.json") as HaritaDosyasi;

/** Çokgenin düzlemsel alanı (dış - delikler), ayakkabı bağı formülü. */
function poligonAlani(p: Poligon): number {
  const halka = (h: number[][]): number => {
    let s = 0;
    for (let i = 0; i < h.length - 1; i++) s += (h[i]?.[0] as number) * (h[i + 1]?.[1] as number) - (h[i + 1]?.[0] as number) * (h[i]?.[1] as number);
    return Math.abs(s) / 2;
  };
  return p.reduce((a, h, i) => a + (i === 0 ? halka(h) : -halka(h)), 0);
}

describe("dünya ülkeleri TopoJSON'u (Natural Earth 50m, sadeleştirilmiş)", () => {
  const d = ulkeleriCoz(dunya);

  it("yüzlerce ülke poligonu, sınır ve kıyı çizgileri çözülür", () => {
    expect(d.poligonlar.length).toBeGreaterThan(150);
    expect(d.sinirlar.length).toBeGreaterThan(100);
    expect(d.kiyilar.length).toBeGreaterThan(100);
  });

  it("tüm koordinatlar geçerli boylam/enlem aralığında", () => {
    for (const p of d.poligonlar) {
      for (const h of p) {
        for (const n of h) {
          expect(n[0] as number).toBeGreaterThanOrEqual(-180.001);
          expect(n[0] as number).toBeLessThanOrEqual(180.001);
          expect(n[1] as number).toBeGreaterThanOrEqual(-90.001);
          expect(n[1] as number).toBeLessThanOrEqual(90.001);
        }
      }
    }
  });

  it("üçgenleme tüm karada alanı korur ve üçgen sayısı makul sınırlarda", () => {
    const ag = poligonlariUcgenle(d.poligonlar, 2.0);
    const beklenen = d.poligonlar.reduce((a, p) => a + poligonAlani(p), 0);
    expect(duzlemselAlan(ag)).toBeGreaterThan(beklenen * 0.9999);
    expect(duzlemselAlan(ag)).toBeLessThan(beklenen * 1.0001);
    const ucgen = ag.indeks.length / 3;
    expect(ucgen).toBeGreaterThan(5000);
    expect(ucgen).toBeLessThan(80000);
  });
});

describe("geçici bölge katmanı", () => {
  const bolgeler = bolgeleriCoz(gecici);

  it("sentetik-50'nin tüm bölge kimlikleri için çokgen var", () => {
    expect(bolgeler.length).toBe(sentetik.bolgeler.length);
    const idler = new Set(bolgeler.map((b) => b.id));
    for (const b of sentetik.bolgeler) expect(idler.has(b.id)).toBe(true);
  });

  it("her bölgenin üçgenlemesinde alan korunur ve üçgen sayısı pozitiftir", () => {
    for (const b of bolgeler) {
      const ag = poligonlariUcgenle(b.poligonlar, 0.4);
      const beklenen = b.poligonlar.reduce((a, p) => a + poligonAlani(p), 0);
      expect(ag.indeks.length).toBeGreaterThan(0);
      expect(duzlemselAlan(ag)).toBeGreaterThan(beklenen * 0.999);
      expect(duzlemselAlan(ag)).toBeLessThan(beklenen * 1.001);
    }
  });

  it("haritayiBirlestir: konum, ad ve çokgen her bölgede dolu; merkez çokgen kutusunda", () => {
    const h = haritayiBirlestir(sentetik, gecici, true);
    expect(h.gecici).toBe(true);
    expect(h.bolgeler.length).toBe(sentetik.bolgeler.length);
    h.bolgeler.forEach((b, i) => {
      const hb = h.harita.bolgeler[i];
      expect(hb?.konum).toBeDefined();
      expect(b.poligonlar.length).toBeGreaterThan(0);
      expect(b.merkez[0]).toBeGreaterThan(b.kutu[0] - 1);
      expect(b.merkez[0]).toBeLessThan(b.kutu[2] + 1);
      expect(noktaIcinde(b.poligonlar, b.merkez[0], b.merkez[1]) || b.kutu[2] - b.kutu[0] > 0).toBe(true);
    });
    expect(h.atif.some((a) => /Natural Earth/.test(a))).toBe(true);
  });

  it("çokgeni olmayan bölge için konumdan disk üretilir", () => {
    const tek: HaritaDosyasi = { ...sentetik, bolgeler: sentetik.bolgeler.slice(0, 1).map((b) => ({ ...b, id: "yok_bolge", konum: { enlemMikro: 41_000_000, boylamMikro: 29_000_000 } })) };
    const h = haritayiBirlestir(tek, gecici, false);
    expect(h.bolgeler[0]?.poligonlar[0]?.[0]?.length).toBe(9);
    expect(h.bolgeler[0]?.merkez).toEqual([29, 41]);
  });

  it("nokta-çokgen testi ve merkez/kutu yardımcıları", () => {
    const p: Poligon[] = [[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]]];
    expect(noktaIcinde(p, 1, 1)).toBe(true);
    expect(noktaIcinde(p, 5, 5)).toBe(false); // delik
    expect(noktaIcinde(p, 11, 5)).toBe(false);
    expect(sinirKutusu(p)).toEqual([0, 0, 10, 10]);
    const m = poligonMerkezi(p);
    expect(m[0]).toBeCloseTo(5, 6);
    expect(m[1]).toBeCloseTo(5, 6);
  });
});

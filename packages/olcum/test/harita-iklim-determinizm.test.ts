/**
 * Gerçek haritada H2, H5, H6, H7 ve determinizm denetimi (`harita-iklim.test.ts`'in bölünmüş parçası). Determinizm testi bu dosyadaki H2, H5, H6, H7
 * sonuçlarını (`ayri`) ikinci koşuyla karşılaştırdığından beş test aynı dosyada ve bu sırada kalır; ortak yardımcılar `harita-iklim-yardimci.ts`.
 */
import { describe, expect, it } from "vitest";
import { gercekVeriyiYukle } from "@bolge/veri";
import { h2Kos, h5Kos, h6Kos, h7Kos } from "../src";
import type { HipotezSonucu } from "../src";
import { baglamDogru, kararli, semaDogru } from "./harita-iklim-yardimci";

describe("gerçek haritada hipotez koşucuları (kısa sürüm)", () => {
  const tohumlar = [1];
  const gercek = { tohumlar, kisa: true, harita: "gercek", iklim: "hizli" } as const;
  const ayri: HipotezSonucu[] = [];

  it("H2: şemaya uygun, 4 devlet ve 3 gün", () => {
    const h = h2Kos(gercek);
    semaDogru(h, "H2", 1);
    baglamDogru(h, "gercek", 53, "hizli", 12);
    expect((h.ayrinti["tohumlar"] as Array<{ gunler: unknown[] }>)[0]!.gunler).toHaveLength(3);
    expect(h.parametreler["oyuncular"]).toEqual(["sanayici", "tuccar", "lojistikci", "militarist"]);
    ayri.push(h);
  }, 300_000);

  it("H5: sınır çifti gerçek haritadan türer; kayıp tavanı aşılmaz", () => {
    const h = h5Kos(gercek);
    semaDogru(h, "H5", 1);
    baglamDogru(h, "gercek", 53, "hizli", 12);
    const devletler = new Set(gercekVeriyiYukle().harita.devletler.map((d) => d.id));
    for (const c of h.parametreler["ciftler"] as string[]) {
      for (const d of c.split(/ -> |\+/)) expect(devletler.has(d)).toBe(true);
    }
    expect(h.verdict).not.toBe("kaldi");
    ayri.push(h);
  }, 300_000);

  it("H6: geç katılanlar gerçek haritanın bölgelerinden", () => {
    const h = h6Kos(gercek);
    semaDogru(h, "H6", 1);
    baglamDogru(h, "gercek", 53, "hizli", 12);
    const bolgeler = new Set(gercekVeriyiYukle().harita.bolgeler.map((b) => b.id));
    const gec = (h.ayrinti["tohumlar"] as Array<{ gecKatilanlar: Array<{ bolgeler: string[] }> }>)[0]!.gecKatilanlar;
    expect(gec.length).toBeGreaterThanOrEqual(8);
    for (const g of gec) for (const b of g.bolgeler) expect(bolgeler.has(b)).toBe(true);
    ayri.push(h);
  }, 300_000);

  it("H7: 24/48/72. saat oranları hesaplanır", () => {
    const h = h7Kos(gercek);
    semaDogru(h, "H7", 1);
    baglamDogru(h, "gercek", 53, "hizli", 12);
    const satirlar = h.tohumBasina[0]!.ozet["satirlar"] as Array<{ saat: number; oran: number }>;
    expect(satirlar.map((s) => s.saat)).toEqual([24, 48, 72]);
    for (const s of satirlar) expect(s.oran).toBeGreaterThan(0);
    ayri.push(h);
  }, 300_000);

  it("determinizm: aynı seçeneklerle ikinci koşu birebir aynı (H2, H5, H6, H7)", () => {
    const yeniler = [h2Kos(gercek), h5Kos(gercek), h6Kos(gercek), h7Kos(gercek)];
    expect(ayri).toHaveLength(4);
    yeniler.forEach((y, i) => expect(kararli(y)).toBe(kararli(ayri[i])));
  }, 600_000);
});

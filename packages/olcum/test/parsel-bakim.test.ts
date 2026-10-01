/**
 * Parsel bakım ve aşınma ölçümü (`--bakim-olc`): YALNIZ OKUMA. Ölçüm açıkken koşu sonucu (bakim alanı dışında) bayt bayt aynıdır;
 * ölçüm alanı yapısı, saatlik örnekleme toplamları ve özet raporu (yorumsuz, deterministik).
 */
import { describe, expect, it } from "vitest";
import { bakimOzetiUret, parselArgumanAyristir, parselTohumKos, yuzdelik } from "../src";
import type { ParselKosuSecenek } from "../src";

const KISA: ParselKosuSecenek = { tohumlar: [1], gecGun: 3, olcumGunu: 9, yerlesik: { ciftci: 2, sanayici: 1, tuccar: 1, pasif: 1 } };

describe("bakım ve aşınma ölçümü", () => {
  it("ölçüm açıkken koşu sonucu (bakim alanı hariç) ölçüm kapalıyla birebir aynıdır", () => {
    const kapali = parselTohumKos(KISA, 1);
    const acik = parselTohumKos({ ...KISA, bakimOlc: true }, 1);
    expect(kapali.bakim).toBeUndefined();
    expect(acik.bakim).toBeDefined();
    const { bakim: _b, ...gerisi } = acik;
    expect(JSON.stringify({ ...gerisi, sureMs: 0 })).toBe(JSON.stringify({ ...kapali, sureMs: 0 }));
  });

  it("ölçüm alanı: oyuncu başına iki dönem, ölçüm anları, eşikler, parça piyasası; deterministik", () => {
    const a = parselTohumKos({ ...KISA, bakimOlc: true }, 1).bakim!;
    const b = parselTohumKos({ ...KISA, bakimOlc: true }, 1).bakim!;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.olcumGunu).toBe(12);
    expect(a.pencereGun).toBe(7);
    expect(a.oyuncular.length).toBe(8);
    const ciftci = a.oyuncular.find((o) => o.id === "ciftci_1")!;
    // Pencere (7 gün) toplamın alt kümesi; 7 gün x 24 saat x tesis sayısı kadar tesis-saat
    expect(ciftci.pencere.tesisSaat).toBeGreaterThan(0);
    expect(ciftci.pencere.tesisSaat).toBeLessThanOrEqual(ciftci.toplam.tesisSaat);
    expect(ciftci.pencere.tesisSaat % (7 * 24)).toBe(0);
    expect(ciftci.pencere.akis.ihracat).toBeLessThanOrEqual(ciftci.toplam.akis.ihracat);
    // Ölçüm anları: 5, 10 ve ölçüm anı (12)
    expect(ciftci.anlar.map((x) => x.gun)).toEqual([5, 10, 12]);
    for (const an of ciftci.anlar) for (const t of an.tesisler) expect(t.length).toBe(4);
    // Geç katılan 3. günde katılır: ilk ölçüm anında (5. gün) tesisi olabilir; katılımdan önce kaydı yoktur
    expect(a.parcaPiyasasi.length).toBeGreaterThan(0);
    expect(a.parcaPiyasasi.every((x) => x.gun >= 1 && x.gun <= 30)).toBe(true);
    expect(a.turAdlari.length).toBeGreaterThan(0);
    expect(a.kitParca).toBeGreaterThan(0);
    for (const e of a.esikler) {
      expect(e.dogus).toBeGreaterThanOrEqual(0);
      if (e.saat50 !== null && e.saat100 !== null) expect(e.saat100).toBeGreaterThanOrEqual(e.saat50);
    }
    expect(a.oyuncular.every((o) => o.toplam.tesisSaat >= o.pencere.tesisSaat)).toBe(true);
  });

  it("özet raporu yorumsuz tablolar üretir ve deterministiktir", () => {
    const r = parselTohumKos({ ...KISA, bakimOlc: true }, 1);
    const json = { kip: "parsel", etiket: "deneme", tarimYonetimi: false, bakimYonetimi: false, tohumlar: [1], gun: 12, gecGun: 3, olcumGunu: 9, tohumBasina: [r] };
    const md = bakimOzetiUret([{ dosya: "parsel-deneme.json", json }], { etiket: "deneme", bulgular: "bakim-asinma-temel.md" });
    expect(md).toContain("## 3. Aşınma yörüngesi");
    expect(md).toContain("## 4. Son 7 günlük gelir kalemleri");
    expect(md).toContain("## 5. Bakım parçası piyasası");
    expect(md).toContain("Aşınma kaybı (TAHMİN)");
    expect(bakimOzetiUret([{ dosya: "parsel-deneme.json", json }], { etiket: "deneme", bulgular: "bakim-asinma-temel.md" })).toBe(md);
  });

  it("bayraklar ve yüzdelik", () => {
    expect(parselArgumanAyristir(["--bakim-olc"]).bakimOlc).toBe(true);
    expect(parselArgumanAyristir([]).bakimOlc).toBe(false);
    expect(parselArgumanAyristir(["--bakim-ozet", "a.json,b.json"]).bakimOzet).toEqual(["a.json", "b.json"]);
    expect(yuzdelik([], 50)).toBeNull();
    expect(yuzdelik([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(yuzdelik([5, 1, 3, 2, 4], 10)).toBe(1);
    expect(yuzdelik([5, 1, 3, 2, 4], 90)).toBe(5);
  });
});

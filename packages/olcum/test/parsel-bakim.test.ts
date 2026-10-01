/**
 * Parsel bakım ve aşınma ölçümü (`--bakim-olc`): YALNIZ OKUMA. Ölçüm açıkken koşu sonucu (bakim alanı dışında) bayt bayt aynıdır;
 * ölçüm alanı yapısı, saatlik örnekleme toplamları ve özet raporu (yorumsuz, deterministik).
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle } from "@bolge/veri";
import { bakimIzgarasiUret, bakimOzetiUret, parselArgumanAyristir, parselTohumKos, yuzdelik } from "../src";
import { paramAyarla } from "../src/parsel-kosu";
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

  it("paramAyarla: veri KOPYASINI değiştirir (girdi ve parametreler.json aynı kalır); dizi indeksi; geçersiz yol hata", () => {
    const veri = miniVeriyiYukle();
    const once = veri.param.sanayi!.bakim.kitlikAsinmaPpmGun;
    const yeni = paramAyarla(veri, { "sanayi.bakim.kitlikAsinmaPpmGun": 10_000, "sanayi.bakim.duzeyler.0.asinmaPpmGun": 10_000 });
    expect(yeni.param.sanayi!.bakim.kitlikAsinmaPpmGun).toBe(10_000);
    expect(yeni.param.sanayi!.bakim.duzeyler[0]!.asinmaPpmGun).toBe(10_000);
    expect(veri.param.sanayi!.bakim.kitlikAsinmaPpmGun).toBe(once); // girdi değişmedi
    expect(paramAyarla(veri, undefined)).toBe(veri);
    expect(paramAyarla(veri, {})).toBe(veri);
    expect(() => paramAyarla(veri, { "sanayi.bakim.yok": 1 })).toThrow(/sayi degil ya da yok/);
    expect(() => paramAyarla(veri, { "sanayi.yok.x": 1 })).toThrow(/yol param'da yok/);
    expect(() => paramAyarla(veri, { "sanayi.bakim.kitlikAsinmaPpmGun": 1.5 })).toThrow(/tamsayi/);
    expect(parselArgumanAyristir(["--param-ayar", "a.b=1,c.0.d=-2"]).paramAyar).toEqual({ "a.b": 1, "c.0.d": -2 });
    expect(() => parselArgumanAyristir(["--param-ayar", "a=x"])).toThrow(/param-ayar/);
  });

  it("paramAyar koşuya yansır: kıtlık aşınması düşünce aşınma azalır; ayar kapalıyken sonuç aynı", () => {
    const sec: ParselKosuSecenek = { tohumlar: [1], gecGun: 2, olcumGunu: 12, yerlesik: { ciftci: 1, pasif: 0 }, gecAcilislari: [], bakimOlc: true };
    const varsayilan = parselTohumKos(sec, 1);
    const yavas = parselTohumKos({ ...sec, paramAyar: { "sanayi.bakim.kitlikAsinmaPpmGun": 10_000 } }, 1);
    const asinma = (r: ReturnType<typeof parselTohumKos>): number => r.bakim!.oyuncular.find((o) => o.id === "ciftci_1")!.pencere.asinmaOrtPpm!;
    expect(asinma(yavas)).toBeLessThan(asinma(varsayilan));
    expect(JSON.stringify(parselTohumKos({ ...sec, paramAyar: {} }, 1).oyuncular)).toBe(JSON.stringify(varsayilan.oyuncular));
  });

  it("onarimYonetimi: parça ithalatı yok, eşikte genel onarım var; bakimYonetimi: ithalat var, onarım gerekmez", () => {
    const sec: ParselKosuSecenek = { tohumlar: [1], gecGun: 2, olcumGunu: 30, yerlesik: { ciftci: 1, pasif: 0 }, gecAcilislari: [], bakimOlc: true };
    const onarim = parselTohumKos({ ...sec, onarimYonetimi: true }, 1).bakim!.oyuncular.find((o) => o.id === "ciftci_1")!;
    const tam = parselTohumKos({ ...sec, bakimYonetimi: true }, 1).bakim!.oyuncular.find((o) => o.id === "ciftci_1")!;
    const yok = parselTohumKos(sec, 1).bakim!.oyuncular.find((o) => o.id === "ciftci_1")!;
    expect(yok.toplam.onarim.sayi).toBe(0);
    expect(onarim.toplam.onarim.sayi).toBeGreaterThan(0); // aşınma %40'ı geçince onarılır
    expect(onarim.toplam.akis.parcaIthalat).toBeLessThan(tam.toplam.akis.parcaIthalat); // süregiden parça ithalatı yok
    expect(tam.toplam.akis.parcaIthalat).toBeGreaterThan(0);
    expect(tam.toplam.onarim.sayi).toBe(0); // bakım karşılanır: aşınma eşiğe varmaz
    // günlük seri: her gün için [ithalat, stok]; toplam ithalat günlük toplamlara eşit
    expect(tam.gunluk).toHaveLength(32);
    expect(tam.gunluk.reduce((t, d) => t + d[0], 0)).toBe(tam.toplam.akis.parcaIthalat);
  });

  it("özet raporu: ithalat zamanlaması ve tesis türü başabaş bölümleri (yönetimli koşuda)", () => {
    const sec: ParselKosuSecenek = { tohumlar: [1], gecGun: 2, olcumGunu: 12, yerlesik: { ciftci: 1, sanayici: 1, tuccar: 1, pasif: 0 }, gecAcilislari: [], bakimOlc: true };
    const r = parselTohumKos({ ...sec, bakimYonetimi: true }, 1);
    const md = bakimOzetiUret([{ dosya: "p.json", json: { kip: "parsel", etiket: "e", bakimYonetimi: true, tohumlar: [1], gun: 14, gecGun: 2, olcumGunu: 12, tohumBasina: [r] } }], { etiket: "x", bulgular: "b.md" });
    expect(md).toContain("## 7. Bakım parçası ithalatının zamanlaması");
    expect(md).toContain("## 8. Tesis türü başına bakım başabaşı");
    expect(md).toContain("hidro_santrali");
    expect(md).toContain("R ≥ (1−T)/T");
  });

  it("duyarlılık ızgarası özeti: ayar başına bakımsız ve bakımlı koşu çifti; çiftçi, sanayici, tüccar ayrı sütun; deterministik", () => {
    const sec: ParselKosuSecenek = { tohumlar: [1], gecGun: 2, olcumGunu: 10, yerlesik: { ciftci: 1, sanayici: 1, tuccar: 1, pasif: 0 } };
    const json = (r: ReturnType<typeof parselTohumKos>, bakim: boolean, ayar?: Record<string, number>) => ({ kip: "parsel", etiket: "e", bakimYonetimi: bakim, ...(ayar !== undefined ? { paramAyar: ayar } : {}), tohumlar: [1], gun: 12, gecGun: 2, olcumGunu: 10, tohumBasina: [r] });
    const ayar = { "sanayi.bakim.kitlikAsinmaPpmGun": 10_000, "sanayi.bakim.asinmaVerimKaybiTavaniPpm": 250_000 };
    const girdiler = [
      { dosya: "a.json", json: json(parselTohumKos(sec, 1), false) },
      { dosya: "b.json", json: json(parselTohumKos({ ...sec, bakimYonetimi: true }, 1), true) },
      { dosya: "c.json", json: json(parselTohumKos({ ...sec, paramAyar: ayar }, 1), false, ayar) },
      { dosya: "d.json", json: json(parselTohumKos({ ...sec, bakimYonetimi: true, paramAyar: ayar }, 1), true, ayar) },
    ];
    const md = bakimIzgarasiUret(girdiler, { etiket: "izgara", bulgular: "b.md" });
    expect(md).toContain("## 1. Yerleşik oyuncu geliri");
    expect(md).toContain("| varsayılan | varsayılan |");
    expect(md).toContain("| 10000 | 250000 |");
    expect(bakimIzgarasiUret(girdiler, { etiket: "izgara", bulgular: "b.md" })).toBe(md);
    expect(parselArgumanAyristir(["--bakim-izgara", "a.json,b.json"]).bakimIzgara).toEqual(["a.json", "b.json"]);
  });
});

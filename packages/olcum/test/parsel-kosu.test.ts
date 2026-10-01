/**
 * Parsel kısa ölçüm koşusu (mini-6 parsel fikstürü): duman koşusu, determinizm, rapor ve komut satırı. Ağır koşu (H6 tanımındaki 60. gün
 * katılımı, tohum 1-10) `BOLGE_AGIR_TEST=1` arkasındadır.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GUN, Simulasyon, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import {
  PARSEL_AGIR_GEC_GUN,
  PARSEL_AGIR_TOHUM,
  ana,
  araziDegeriMili,
  hibeKitDegeri,
  parselAna,
  parselArgumanAyristir,
  parselDuzeni,
  parselOzetle,
  parselRaporUret,
  parselTohumKos,
  stokDegeriMili,
  tl,
  yuzde,
} from "../src";
import type { ParselKosuSecenek } from "../src";

const KISA: ParselKosuSecenek = { tohumlar: [1], gecGun: 2, olcumGunu: 4, yerlesik: { ciftci: 2, sanayici: 1, tuccar: 1, pasif: 1 } };

/** Duvar saati alanı hariç JSON (determinizm karşılaştırması). */
function sabit(r: ReturnType<typeof parselTohumKos>): string {
  return JSON.stringify({ ...r, sureMs: 0 });
}

const geciciler: string[] = [];
afterEach(() => {
  for (const d of geciciler.splice(0)) rmSync(d, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("parsel kısa koşu: düzen ve servet bileşenleri", () => {
  it("varsayılan düzen 8 yerleşik + 3 geç katılan = 11 bot (8–12 aralığında); kimlikler sabit", () => {
    const d = parselDuzeni(undefined, ["ciftci", "sanayici", "pazar"], 10);
    expect(d.oyuncular).toHaveLength(11);
    expect(d.oyuncular.map((o) => o.id)).toEqual(["ciftci_1", "ciftci_2", "ciftci_3", "sanayici_1", "sanayici_2", "tuccar_1", "tuccar_2", "pasif_1", "gec_ciftci", "gec_sanayici", "gec_pazar"]);
    expect(d.oyuncular.filter((o) => o.katilmaGun === 10).map((o) => o.id)).toEqual(["gec_ciftci", "gec_sanayici", "gec_pazar"]);
    expect(() => parselDuzeni({ ciftci: -1 }, [], 10)).toThrow(/gecersiz/);
  });

  it("taze katılımda servet = hibe + kit (stok), arazi 0 (yurt değeri 0); hibe/kit değeri çekirdek parametresinden", () => {
    const veri: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
    const s = Simulasyon.olustur(veri, 1);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_ova_merkez" } });
    const pk = hibeKitDegeri(s);
    expect(pk).toEqual({ hibe: 50_000_000, kit: 35_600_000, toplam: 85_600_000 });
    expect(stokDegeriMili(s, "a")).toBe(pk.kit);
    expect(araziDegeriMili(s, "a")).toBe(0); // 6 yurt hücresi: degerMili 0
    expect(s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a")).toHaveLength(6);
  });

  it("bölge kipi simülasyonunda hibe/kit değeri istenirse açık hata", () => {
    const s = Simulasyon.olustur(miniVeriyiYukle(), 1);
    expect(() => hibeKitDegeri(s)).toThrow(/mulk kipi kapali/);
  });
});

describe("parsel kısa koşu: duman koşusu", () => {
  const r = parselTohumKos(KISA, 1);

  it("tüm botlar katılır ve komut verir; reddedilen komut yok", () => {
    expect(r.oyuncular).toHaveLength(8);
    expect(r.sureGun).toBe(6);
    for (const o of r.oyuncular) {
      expect(o.hucre, o.id).toBeGreaterThanOrEqual(6);
      expect(o.komut, o.id).toBeGreaterThan(0);
      expect(o.basarisiz, o.id).toBe(0);
    }
    expect(r.basarisizNedenleri).toEqual({});
    expect(Object.keys(r.komutTurleri).sort()).toEqual(["ticaret_emri", "yapi_yerlestir"]);
  });

  it("H6: 3 geç katılan olgusu; iki servet biçimi AYNI karar (değişmezlik), arındırılmış karar Y7 + ucuz hücre", () => {
    expect(r.h6.olgular.map((o) => o.gec)).toEqual(["gec_ciftci", "gec_sanayici", "gec_pazar"]);
    for (const o of r.h6.olgular) {
      expect(o.emsal.length, o.gec).toBeGreaterThan(0);
      expect(o.servetArindirilmis).toBe(o.servetHam - r.hibeKitDegeri);
      expect(o.ulastiHam).toBe(o.ulastiArindirilmis);
      // servet = bileşenlerin toplamı
      expect(o.servetHam).toBe(o.servet.hazine + o.servet.stok + o.servet.arazi + o.servet.yapi);
      // emsal yalnız geç katılandan ÖNCE katılmış, ilçesinde hücresi olan oyuncular
      for (const e of o.emsal) expect(e.startsWith("gec_")).toBe(false);
    }
    expect(r.h6.karar.ikincil.ham.gecKatilan.olguSayisi).toBe(3);
    expect(r.h6.karar.ikincil.arindirilmisServet.verdict).toBe(r.h6.karar.ikincil.ham.verdict);
    expect(r.h6.karar.birincil.y7.olculebilir).toBe(true);
    // Karar kaynağı: birincil karar Y7 + ucuz hücreden türer (servetten değil)
    const y7 = r.h6.karar.birincil.y7;
    const beklenen = y7.olculebilir && y7.hedefGecti && r.h6.karar.birincil.ucuzHedef ? "gecti" : "kaldi";
    expect(r.h6.karar.birincil.verdict).toBe(beklenen);
    expect(r.h6.karar.birincil.kaynak).toBe("y7_gelir+ucuz_hucre");
  });

  it("ucuz hücre: katılımdan hemen ÖNCE ilçe doluluğu (geç katılanın yurdu hariç); ayrılmış hücreler ayrıdır", () => {
    expect(r.h6.ilceler).toHaveLength(12);
    const satilmis = r.h6.ilceler.reduce((t, c) => t + c.satilmisHucre, 0);
    // 5 yerleşik × (6 yurt + en fazla birkaç hücre); geç katılanların 3 × 6 yurdu henüz verilmedi
    expect(satilmis).toBeGreaterThanOrEqual(30);
    expect(satilmis).toBeLessThan(30 + 5 * 4);
    const ayrilmis = r.h6.ilceler.reduce((t, c) => t + c.ayrilmisBos, 0);
    expect(ayrilmis).toBeGreaterThan(150);
    expect(r.h6.ucuz.ayrilmisUcuz + r.h6.ucuz.genelUcuz).toBe(r.h6.ucuz.ucuzHucre);
    expect(r.h6.ucuz.uygunHucre).toBe(1015);
  });

  it("H8: Gini ve ilçe payı hesaplanır; yeniden satış yok → karar belirsiz", () => {
    expect(r.h8.gini.oyuncuSayisi).toBe(8);
    expect(r.h8.ilce.tavanAsanCift).toBe(0);
    expect(r.h8.yenidenSatis.satisSayisi).toBe(0);
    expect(r.h8.verdict).toBe("belirsiz");
  });

  it("Y ölçütleri: Y1 anında kurulum, Y2 ölçülür, Y3 ölçülemez (sözleşme yok), Y5 katmanlar, Y6 yön değiştirme yok", () => {
    expect(r.y.y1.sonuc.olculebilir && r.y.y1.sonuc.oranPpm).toBe(1_000_000);
    expect(r.y.y2.dk60.olculebilir).toBe(true);
    expect(r.y.y3.sonuc.olculebilir).toBe(false);
    expect(r.y.y3.hedefGecti).toBeNull();
    expect(r.y.y5.olculebilir).toBe(true);
    // Yeni oyuncu 2 günde ölçülür mü: 6 günlük koşuda 7 gün gözlenemez → Y6 ölçülemez
    expect(r.y.y6.olculebilir).toBe(false);
  });

  it("determinizm: aynı seçenek + tohum → birebir aynı sonuç (durum özeti dahil); farklı tohum farklı özet", () => {
    expect(sabit(parselTohumKos(KISA, 1))).toBe(sabit(r));
    expect(parselTohumKos(KISA, 2).durumOzeti).not.toBe(r.durumOzeti);
  });

  it("sermaye ve gelir tutarlılığı: net üretim geliri = hazine farkı + sermaye; yapı bedeli ödenen (indirimli) tutardır", () => {
    for (const o of r.h6.olgular) {
      expect(o.servet.yapi, o.gec).toBeGreaterThan(0);
      expect(Number.isSafeInteger(o.gelir)).toBe(true);
    }
    // Ciftlik 4.200 ₺ (6.000 × %70) + malzeme: yapı bedeli en az iki indirimli yapıdan büyük olmalı
    const c = r.h6.olgular.find((o) => o.gec === "gec_ciftci")!;
    expect(c.servet.yapi).toBeGreaterThan(2 * 4_200_000);
  });
});

describe("parsel kısa koşu: geç katılan yok ve sınır seçenekleri", () => {
  it("geç katılan yoksa H6 ölçülemez (belirsiz)", () => {
    const r = parselTohumKos({ ...KISA, gecAcilislari: [] }, 1);
    expect(r.h6.olgular).toEqual([]);
    expect(r.h6.karar.ikincil.ham.verdict).toBe("belirsiz");
    expect(r.h6.karar.birincil.verdict).toBe("belirsiz");
    expect(r.h6.y7.olculebilir).toBe(false);
  });

  it("gun < gecGun + olcumGunu reddedilir; gecGun/olcumGunu >= 1", () => {
    expect(() => parselTohumKos({ ...KISA, gun: 5 }, 1)).toThrow(/en az gecGun/);
    expect(() => parselTohumKos({ ...KISA, gecGun: 0 }, 1)).toThrow(/gecGun/);
    expect(() => parselTohumKos({ ...KISA, olcumGunu: 0 }, 1)).toThrow(/olcumGunu/);
  });

  it("7 gün gözlenen oyuncular için Y6 ölçülür (süre ≥ 7 gün)", () => {
    const r = parselTohumKos({ ...KISA, gun: 10, gecGun: 2, olcumGunu: 4 }, 1);
    expect(r.y.y6.olculebilir).toBe(true); // yerleşikler 10 gün gözlendi
  });
});

describe("parsel raporu", () => {
  const r = parselTohumKos(KISA, 1);
  const meta = { etiket: "test", tohumlar: [1], gun: 6, gecGun: 2, olcumGunu: 4, iklim: "hizli", agir: false, sureMs: 1234, bulgular: "parsel-test-bulgular.md", duzen: { yerlesik: { ciftci: 2, sanayici: 1, tuccar: 1, pasif: 1 }, gec: ["ciftci", "sanayici", "pazar"] as readonly string[] } };

  it("biçim yardımcıları: yüzde ve ₺", () => {
    expect(yuzde(333_333)).toBe("%33,3");
    expect(yuzde(1_000_000)).toBe("%100");
    expect(yuzde(null)).toBe("—");
    expect(tl(85_600_000)).toBe("85.600 ₺");
    expect(tl(-1_234_000)).toBe("-1.234 ₺");
    expect(tl(undefined)).toBe("—");
  });

  it("özet ve Markdown: tüm bölümler, ilk parsel ölçümü uyarısı, v0.3 karşılaştırma notu, insan testi işaretleri", () => {
    const oz = parselOzetle([r]);
    expect(["gecti", "kaldi", "belirsiz"]).toContain(oz.h6.verdict);
    expect(oz.h6.verdict).toBe(r.h6.karar.birincil.verdict); // özet kararı birincilden gelir
    const md = parselRaporUret([r], meta);
    for (const b of ["# Parsel dünyası ölçümü — test", "ilk parsel (mülk kipi) ölçümüdür", "## 1. Özet", "## 2. H6", "## 3. H8", "## 4. Y ölçütleri", "## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu", "v0.3-gercek-t1-3.md", "insan testi", "OLÇÜLEMEZ", "Karar kaynağı", "parsel-test-bulgular.md", "Tohum 1"]) {
      expect(md.toLowerCase(), b).toContain(b.toLowerCase());
    }
    for (const y of ["Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10"]) expect(md).toContain(`| ${y} |`);
  });

  it("rapor determinizmi: aynı sonuç → aynı metin; duvar saati metne girmez (süre değişse de aynı)", () => {
    expect(parselRaporUret([r], meta)).toBe(parselRaporUret([r], meta));
    expect(parselRaporUret([r], meta)).toBe(parselRaporUret([{ ...r, sureMs: 99_999 }], { ...meta, sureMs: 7 }));
  });
});

describe("parsel komut satırı", () => {
  it("argüman ayrıştırma: varsayılanlar, --agir, değerli ve =li biçimler, hatalar", () => {
    const v = parselArgumanAyristir([]);
    expect(v).toMatchObject({ tohum: "1-3", cikti: "raporlar", iklim: "hizli", agir: false, gec: undefined, gun: undefined });
    expect(parselArgumanAyristir(["--agir"]).tohum).toBe(PARSEL_AGIR_TOHUM);
    expect(parselArgumanAyristir(["--agir", "--tohum", "2"]).tohum).toBe("2");
    expect(PARSEL_AGIR_GEC_GUN).toBe(60);
    const a = parselArgumanAyristir(["--tohum=1,3", "--gun", "30", "--gec-gun=5", "--olcum-gunu", "10", "--bot", "ciftci=1,pasif=0", "--gec", "pazar", "--iklim=gercek", "--ad", "v0", "--cikti=x"]);
    expect(parselArgumanAyristir(["--bulgular", "x-bulgular.md"]).bulgular).toBe("x-bulgular.md");
    expect(() => parselArgumanAyristir(["--bulgular", "../x.md"])).toThrow(/--bulgular/);
    expect(a).toMatchObject({ tohum: "1,3", gun: 30, gecGun: 5, olcumGunu: 10, bot: { ciftci: 1, pasif: 0 }, gec: ["pazar"], iklim: "gercek", ad: "v0", cikti: "x" });
    expect(parselArgumanAyristir(["--gec", "yok"]).gec).toEqual([]);
    expect(() => parselArgumanAyristir(["--gun", "1"])).toThrow(/--gun/);
    expect(() => parselArgumanAyristir(["--bot", "ciftci3"])).toThrow(/--bot/);
    expect(() => parselArgumanAyristir(["--gec", "uzay"])).toThrow(/--gec/);
    expect(() => parselArgumanAyristir(["--iklim", "yok"])).toThrow(/--iklim/);
    expect(() => parselArgumanAyristir(["--ad", "a/b"])).toThrow(/--ad/);
    expect(() => parselArgumanAyristir(["--bilinmeyen"])).toThrow(/bilinmeyen/);
    expect(() => parselArgumanAyristir(["--tohum"])).toThrow(/deger/);
  });

  it("--kip: parsel yönlenir (yardım basar, koşu yapmaz); geçersiz kip hata; kip verilmezse bölge yolu (yardım)", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    ana(["--kip", "parsel", "--yardim"]);
    expect(log.mock.calls.join("\n")).toContain("Kisa parsel olcumu");
    log.mockClear();
    ana(["--yardim"]);
    expect(log.mock.calls.join("\n")).toContain("--hip");
    expect(() => ana(["--kip", "yok"])).toThrow(/--kip/);
    expect(() => ana(["--kip=yok"])).toThrow(/--kip/);
  });

  it("kısa koşu rapor dosyalarını yazar (parsel-<ad>.json/.md); gun < gec+olcum hata", () => {
    const dizin = mkdtempSync(join(tmpdir(), "parsel-olcum-"));
    geciciler.push(dizin);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    parselAna(["--tohum", "1", "--gec-gun", "2", "--olcum-gunu", "4", "--bot", "ciftci=2,sanayici=1,tuccar=1,pasif=1", "--cikti", dizin, "--ad", "duman"]);
    expect(log).toHaveBeenCalled();
    expect(existsSync(join(dizin, "parsel-duman.json"))).toBe(true);
    expect(existsSync(join(dizin, "parsel-duman.md"))).toBe(true);
    const j = JSON.parse(readFileSync(join(dizin, "parsel-duman.json"), "utf8")) as { kip: string; tohumBasina: unknown[]; gun: number; ozet: { h6: unknown } };
    expect(j.kip).toBe("parsel");
    expect(j.gun).toBe(6);
    expect(j.tohumBasina).toHaveLength(1);
    expect(j.ozet.h6).toBeDefined();
    expect(() => parselAna(["--gun", "3", "--gec-gun", "2", "--olcum-gunu", "4", "--cikti", dizin])).toThrow(/en az/);
  });
});

describe("parsel ağır koşu (BOLGE_AGIR_TEST=1)", () => {
  it.skipIf(process.env.BOLGE_AGIR_TEST !== "1")("H6 tanımındaki 60. gün katılımı: 74 gün, tohum 1-3; geç katılan olguları ölçülür", () => {
    for (const t of [1, 2, 3]) {
      const r = parselTohumKos({ tohumlar: [t], gecGun: 60, olcumGunu: 14 }, t);
      expect(r.sureGun).toBe(74);
      expect(r.h6.olgular).toHaveLength(3);
      expect(r.h6.karar.ikincil.ham.gecKatilan.olculebilir).toBeGreaterThan(0);
      expect(GUN).toBe(86_400_000);
    }
  }, 600_000);
});

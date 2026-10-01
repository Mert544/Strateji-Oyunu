/**
 * Tarım katmanı (B1) veri sözleşmesi: şema/doğrulama, kapalı mod uyumu, harita türetme ve gerçek harita yüklemesi.
 */
import { describe, expect, it } from "vitest";
import {
  dogrulaHarita,
  dogrulaIcerik,
  dogrulaParametreler,
  dogrulaVeriPaketi,
  gercekVeriyiYukle,
  miniVeriyiYukle,
  MINI_HARITA_SECENEKLERI,
  tarimAlanlariniTamamla,
  varsayilanTarimAlani,
  varsayilanVeriyiYukle,
} from "../src/index";
import type { BolgeTanimi, DogrulamaSonucu } from "../src/index";
import { uretSentetikHarita } from "../src/harita-uretici";

function hatalar(s: DogrulamaSonucu): string[] {
  return s.gecerli ? [] : s.hatalar;
}

describe("varsayılan içerik tarımlıdır", () => {
  it("parametrelerde iklim + tarim, içerikte tarimUrunleri ve gubre malı var; paket geçerli", () => {
    const v = varsayilanVeriyiYukle();
    expect(v.param.iklim).toBeDefined();
    expect(v.param.tarim).toBeDefined();
    expect(v.icerik.tarimUrunleri?.map((u) => u.id)).toEqual(["bugday", "baklagil", "nadas"]);
    expect(v.icerik.mallar.some((m) => m.id === "gubre")).toBe(true);
    expect(v.harita.surum).toBe(1);
    expect(v.icerik.surum).toBe(1);
    expect(v.param.surum).toBe(1);
    expect(dogrulaVeriPaketi(v)).toEqual({ gecerli: true });
  });

  it("iklim eğrileri: her tipin 12 aylık toplamı tam 12 x PPM; ay günleri 365", () => {
    const k = varsayilanVeriyiYukle().param.iklim!;
    for (const egri of Object.values(k.hasatEgrisiPpm)) expect(egri.reduce((t, x) => t + x, 0)).toBe(12_000_000);
    expect(k.ayGunleri.reduce((t, x) => t + x, 0)).toBe(365);
    expect(k.gunCarpani).toBe(1);
  });

  it("sentetik ve mini harita bölgeleri tarım alanı taşır; aralıklar geçerli; harita türetimi deterministik", () => {
    const v = varsayilanVeriyiYukle();
    const tarimli = v.harita.bolgeler.filter((b) => b.tarim !== undefined);
    expect(tarimli.length).toBeGreaterThan(30);
    for (const b of tarimli) {
      expect(b.tarim!.toprakTabanPpm).toBeGreaterThanOrEqual(300_000);
      expect(b.tarim!.toprakTabanPpm).toBeLessThanOrEqual(1_200_000);
      expect(b.tarim!.tarimTesisTavani).toBeGreaterThanOrEqual(b.tesisler.filter((t) => t === "ciftlik").length);
    }
    expect(new Set(tarimli.map((b) => b.tarim!.iklimTipi)).size).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(uretSentetikHarita())).toBe(JSON.stringify(v.harita));
    expect(miniVeriyiYukle().harita.bolgeler.filter((b) => b.tarim !== undefined)).toHaveLength(4);
  });
});

describe("tarım doğrulaması", () => {
  const temel = () => varsayilanVeriyiYukle();

  it("iklim ve tarim birlikte verilmeli; ikisi de yoksa geçerli (kapalı mod)", () => {
    const p = structuredClone(temel().param);
    delete p.iklim;
    expect(hatalar(dogrulaParametreler(p)).some((h) => h.includes("birlikte"))).toBe(true);
    delete p.tarim;
    expect(dogrulaParametreler(p)).toEqual({ gecerli: true });
  });

  it("hasat eğrisi toplamı 12 x PPM olmalı; ay günleri toplamı 365 olmalı", () => {
    const p = structuredClone(temel().param);
    p.iklim!.hasatEgrisiPpm.kurak[0] = 800_000;
    p.iklim!.ayGunleri[1] = 29;
    const h = hatalar(dogrulaParametreler(p));
    expect(h.some((x) => x.includes("hasatEgrisiPpm.kurak"))).toBe(true);
    expect(h.some((x) => x.includes("ayGunleri"))).toBe(true);
  });

  it("eksik iklim tipi, ondalık sayı, aralık dışı değer ve olay min > max reddedilir", () => {
    const p = structuredClone(temel().param);
    delete (p.iklim!.hasatEgrisiPpm as Record<string, unknown>)["kurak"];
    expect(dogrulaParametreler(p).gecerli).toBe(false);
    const q = structuredClone(temel().param);
    q.iklim!.olaylar.don.siddetMinPpm = 700_000;
    q.iklim!.olaylar.don.siddetMaxPpm = 300_000;
    q.iklim!.olaylar.sel.sureGunMin = 9;
    expect(hatalar(dogrulaParametreler(q)).some((x) => x.includes("siddetMinPpm"))).toBe(true);
    const r = structuredClone(temel().param);
    r.tarim!.gubreToprakPpmGun = 1.5;
    r.iklim!.gunCarpani = 0;
    r.iklim!.baslangicGunu = 365;
    const h = hatalar(dogrulaParametreler(r));
    expect(h.length).toBeGreaterThanOrEqual(3);
  });

  it("tarım açıkken içerikte gubre malı ve en az bir ürün gerekir", () => {
    const v = temel();
    const ic = structuredClone(v.icerik);
    delete ic.tarimUrunleri;
    expect(hatalar(dogrulaParametreler(v.param, ic)).some((x) => x.includes("tarimUrunleri"))).toBe(true);
    const ic2 = structuredClone(v.icerik);
    ic2.mallar = ic2.mallar.filter((m) => m.id !== "gubre");
    expect(hatalar(dogrulaParametreler(v.param, ic2)).some((x) => x.includes("gubre"))).toBe(true);
    ic2.tarimUrunleri = [];
    expect(hatalar(dogrulaIcerik(ic2)).some((x) => x.includes("tarimUrunleri"))).toBe(true);
  });

  it("bölge tarım alanı: toprak tabanı 300000..1200000, tavan >= başlangıç tarım tesisi sayısı", () => {
    const v = temel();
    const h = structuredClone(v.harita);
    const ova = h.bolgeler.find((b) => b.tarim !== undefined && b.tesisler.includes("ciftlik"))!;
    ova.tarim!.toprakTabanPpm = 200_000;
    expect(dogrulaHarita(h).gecerli).toBe(false);
    ova.tarim!.toprakTabanPpm = 1_000_000;
    ova.tarim!.tarimTesisTavani = 0;
    const p = { ...v, harita: h };
    expect(hatalar(dogrulaVeriPaketi(p)).some((x) => x.includes("tarimTesisTavani"))).toBe(true);
  });

  it("tanınmayan tarım alanı yazımı hata verir (strict)", () => {
    const h = structuredClone(varsayilanVeriyiYukle().harita) as unknown as { bolgeler: Array<{ tarim?: Record<string, unknown> }> };
    const b = h.bolgeler.find((x) => x.tarim !== undefined)!;
    b.tarim!["toprakTaban"] = 1;
    expect(dogrulaHarita(h).gecerli).toBe(false);
  });

  it("sulama yöntemi çıktısız olabilir; sulama olmayan yöntem çıktısız olamaz", () => {
    const ic = structuredClone(temel().icerik);
    expect(dogrulaIcerik(ic)).toEqual({ gecerli: true });
    ic.yontemler.find((y) => y.id === "standart_rafineri")!.ciktilar = {};
    expect(hatalar(dogrulaIcerik(ic)).some((x) => x.includes("en az bir cikti"))).toBe(true);
  });
});

describe("tarım alanı türetme (etiket ve konumdan)", () => {
  const bolge = (etiketler: BolgeTanimi["etiketler"], konum?: { enlemMikro: number; boylamMikro: number }, tesisler: string[] = []): BolgeTanimi => ({
    id: "x", ad: "X", devlet: "d", etiketler, nufus: 1000, rezervler: {}, tesisler, x: 0, y: 0, konum,
  });
  const mikro = (enlem: number, boylam: number) => ({ enlemMikro: enlem * 1_000_000, boylamMikro: boylam * 1_000_000 });

  it("tarım dışı: etiketsiz ve tarım tesisi yok", () => {
    expect(varsayilanTarimAlani(bolge([]))).toBeUndefined();
    expect(varsayilanTarimAlani(bolge(["dar_gecit"]))).toBeUndefined();
    expect(varsayilanTarimAlani(bolge([], undefined, ["ciftlik"]))).toBeDefined();
  });

  it("toprak: ova 1.0, kıyı 0.8, dağ 0.4; tavan ova 3, kıyı/dağ 2", () => {
    expect(varsayilanTarimAlani(bolge(["ova"]))).toMatchObject({ toprakTabanPpm: 1_000_000, tarimTesisTavani: 3, sulanabilirPpm: 600_000 });
    expect(varsayilanTarimAlani(bolge(["kiyi"]))).toMatchObject({ toprakTabanPpm: 800_000, tarimTesisTavani: 2 });
    expect(varsayilanTarimAlani(bolge(["dag"]))).toMatchObject({ toprakTabanPpm: 400_000, iklimTipi: "dag_yayla" });
  });

  it("iklim tipi: konuma göre Köppen benzeri kurallar", () => {
    expect(varsayilanTarimAlani(bolge(["kiyi"], mikro(41.0, 39.7)))!.iklimTipi).toBe("karadeniz"); // Trabzon
    expect(varsayilanTarimAlani(bolge(["kiyi", "liman"], mikro(43.2, 27.9)))!.iklimTipi).toBe("karadeniz"); // Varna
    expect(varsayilanTarimAlani(bolge(["kiyi"], mikro(38.4, 27.1)))!.iklimTipi).toBe("akdeniz"); // İzmir
    expect(varsayilanTarimAlani(bolge(["ova"], mikro(37.1, 38.8)))!.iklimTipi).toBe("kurak"); // Şanlıurfa
    expect(varsayilanTarimAlani(bolge(["ova"], mikro(39.9, 32.8)))!.iklimTipi).toBe("karasal"); // Ankara
    expect(varsayilanTarimAlani(bolge(["ova"], mikro(44.4, 26.1)))!.iklimTipi).toBe("balkan_kita"); // Bükreş
    expect(varsayilanTarimAlani(bolge(["dag"], mikro(39.9, 41.3)))!.iklimTipi).toBe("dag_yayla"); // Erzurum
    // kurak tipte toprak x0,7
    expect(varsayilanTarimAlani(bolge(["ova"], mikro(37.1, 38.8)))!.toprakTabanPpm).toBe(700_000);
  });

  it("tarimAlanlariniTamamla: yalnız tarım açıkken ve yalnız eksik bölgelere yazar; kapalıyken hiçbir şey yapmaz", () => {
    const v = miniVeriyiYukle();
    delete v.harita.bolgeler[0]!.tarim;
    delete v.harita.bolgeler[3]!.tarim;
    expect(tarimAlanlariniTamamla(v)).toBe(2);
    expect(v.harita.bolgeler[0]!.tarim).toBeDefined();
    expect(tarimAlanlariniTamamla(v)).toBe(0);
    delete v.param.iklim;
    delete v.param.tarim;
    delete v.harita.bolgeler[0]!.tarim;
    expect(tarimAlanlariniTamamla(v)).toBe(0);
    expect(v.harita.bolgeler[0]!.tarim).toBeUndefined();
    expect(dogrulaVeriPaketi(v, MINI_HARITA_SECENEKLERI)).toEqual({ gecerli: true });
  });

  it("gerçek harita yüklemesi tarım alanlarını türetir ve paket geçerli kalır", () => {
    const v = gercekVeriyiYukle();
    const tarimli = v.harita.bolgeler.filter((b) => b.tarim !== undefined);
    expect(tarimli.length).toBeGreaterThan(v.harita.bolgeler.length / 2);
    for (const b of v.harita.bolgeler) {
      if (b.tesisler.includes("ciftlik")) expect(b.tarim).toBeDefined();
    }
    expect(new Set(tarimli.map((b) => b.tarim!.iklimTipi)).size).toBeGreaterThanOrEqual(3);
  });
});

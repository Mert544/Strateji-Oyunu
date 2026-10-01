/**
 * Sanayi katmanı (B2) veri sözleşmesi: şema/doğrulama (depolanamaz mal, ölçek kademeleri, bakım düzeyleri, akarsu eğrisi),
 * kapalı mod uyumu (eski içerik yüklenir), santral içeriği, damar ölçeği ve gerçek harita.
 */
import { describe, expect, it } from "vitest";
import { dogrulaIcerik, dogrulaParametreler, dogrulaVeriPaketi, gercekVeriyiYukle, varsayilanVeriyiYukle } from "../src/index";
import type { DogrulamaSonucu } from "../src/index";
import { MADEN_REZERV_OLCEGI_PPM, uretSentetikHarita } from "../src/harita-uretici";

function hatalar(s: DogrulamaSonucu): string[] {
  return s.gecerli ? [] : s.hatalar;
}

const temel = () => varsayilanVeriyiYukle();

describe("varsayılan içerik sanayilidir", () => {
  it("parametrelerde sanayi, içerikte elektrik (enerji, depolanamaz), santral ve gübre fabrikası elektrik girdisi var", () => {
    const v = temel();
    expect(v.param.sanayi).toBeDefined();
    const e = v.icerik.mallar.find((m) => m.id === "elektrik")!;
    expect(e.kategori).toBe("enerji");
    expect(e.depolanabilir).toBe(false);
    expect(v.param.nufus.tuketim1000Saat["elektrik"]).toBe(150);
    expect(v.icerik.tesisTurleri.map((t) => t.id)).toEqual(expect.arrayContaining(["santral", "hidro_santrali", "gubre_fabrikasi"]));
    const yontem = (id: string) => v.icerik.yontemler.find((y) => y.id === id)!;
    expect(yontem("komur_santrali").ciktilar["elektrik"]).toBe(240_000);
    expect(yontem("hidro_santrali").hidro).toBe(true);
    expect(yontem("azotlu_gubre").girdiler["elektrik"]).toBe(15_000);
    expect(yontem("sulama_pompasi").girdiler["elektrik"]).toBe(8_000);
    expect(yontem("sulama_pompasi").girdiler["yakit"]).toBeUndefined();
    expect(yontem("elektrik_ark").ciktilar["celik"]).toBe(63_000);
    expect(v.harita.surum).toBe(1);
    expect(v.icerik.surum).toBe(1);
    expect(v.param.surum).toBe(1);
    expect(dogrulaVeriPaketi(v)).toEqual({ gecerli: true });
  });

  it("ölçek kademeleri S/M/L ve bakım düzeyleri docs/08 §2.4 değerlerinde", () => {
    const p = temel().param.sanayi!;
    expect(p.olcekKademeleri).toEqual([
      { ciktiPpm: 1_000_000, isciPpm: 1_000_000, bakimPpm: 1_000_000, insaPpm: 1_000_000, gerekliTeknoloji: null },
      { ciktiPpm: 2_200_000, isciPpm: 1_800_000, bakimPpm: 2_000_000, insaPpm: 2_500_000, gerekliTeknoloji: null },
      { ciktiPpm: 3_600_000, isciPpm: 2_600_000, bakimPpm: 3_200_000, insaPpm: 4_500_000, gerekliTeknoloji: "otomasyon" },
    ]);
    expect(p.bakim.duzeyler.map((d) => [d.id, d.girdiPpm, d.asinmaPpmGun])).toEqual([
      ["asgari", 500_000, 20_000],
      ["normal", 1_000_000, 0],
      ["yuksek", 1_500_000, -15_000],
    ]);
    expect(p.hidro.akarsuEgrisiPpm.reduce((t, x) => t + x, 0)).toBe(12_000_000);
    expect(p.damar.rezervVerimTabaniPpm).toBe(250_000);
    expect(p.kirlilik.azalmaPpmGun).toBe(30_000);
  });

  it("sentetik harita: maden rezervleri küçük (medyan 100-200 bin birim), her santral gerektiren bölgede başlangıç santrali", () => {
    const v = temel();
    const vals = v.harita.bolgeler.flatMap((b) => Object.entries(b.rezervler).filter(([m]) => m !== "tahil").map(([, x]) => x / 1_000_000)).sort((a, b) => a - b);
    const medyan = vals[Math.floor(vals.length / 2)]!;
    expect(medyan).toBeGreaterThanOrEqual(100);
    expect(medyan).toBeLessThanOrEqual(200);
    expect(MADEN_REZERV_OLCEGI_PPM).toBe(400_000);
    for (const b of v.harita.bolgeler) {
      const tuketici = b.tesisler.some((t) => !["ciftlik", "ahir", "mera", "santral", "hidro_santrali"].includes(t));
      const santral = b.tesisler.some((t) => t === "santral" || t === "hidro_santrali");
      if (tuketici) expect(santral).toBe(true);
      if (b.tesisler.includes("hidro_santrali")) expect(b.etiketler).toContain("dag");
    }
    expect(JSON.stringify(uretSentetikHarita())).toBe(JSON.stringify(v.harita));
  });

  it("gerçek harita yüklenir ve doğrulanır; maden rezervleri ölçeklidir", () => {
    const g = gercekVeriyiYukle();
    expect(dogrulaVeriPaketi(g)).toEqual({ gecerli: true });
    const vals = g.harita.bolgeler.flatMap((b) => Object.entries(b.rezervler).filter(([m]) => m !== "tahil").map(([, x]) => x / 1_000_000));
    // karadeniz.json: 100-1000 bin birim x 0,4
    expect(Math.max(...vals)).toBeLessThanOrEqual(400);
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(40);
  });
});

describe("eski içerik (sanayi yok) kapalı modda yüklenir", () => {
  it("sanayi parametresi ve elektrik malı olmadan içerik/parametre geçerlidir", () => {
    const v = temel();
    const param = structuredClone(v.param);
    delete param.sanayi;
    delete param.nufus.tuketim1000Saat["elektrik"];
    const icerik = structuredClone(v.icerik);
    icerik.mallar = icerik.mallar.filter((m) => m.id !== "elektrik");
    icerik.tesisTurleri = icerik.tesisTurleri.filter((t) => t.id !== "santral" && t.id !== "hidro_santrali");
    icerik.yontemler = icerik.yontemler.filter((y) => !["komur_santrali", "yakit_jeneratoru", "hidro_santrali"].includes(y.id));
    for (const y of icerik.yontemler) {
      delete y.girdiler["elektrik"];
      delete y.kirlilikPpmSaat;
    }
    expect(hatalar(dogrulaIcerik(icerik))).toEqual([]);
    expect(hatalar(dogrulaParametreler(param, icerik))).toEqual([]);
  });
});

describe("sanayi doğrulaması", () => {
  it("ölçek kademesi sayısı 3, S referans (tüm çarpanlar PPM), artan", () => {
    const p = temel().param;
    p.sanayi!.olcekKademeleri.pop();
    expect(hatalar(dogrulaParametreler(p)).some((h) => h.includes("3 kademe"))).toBe(true);
    const q = temel().param;
    q.sanayi!.olcekKademeleri[0]!.ciktiPpm = 900_000;
    expect(hatalar(dogrulaParametreler(q)).some((h) => h.includes("S kademesi"))).toBe(true);
    const r = temel().param;
    r.sanayi!.olcekKademeleri[2]!.ciktiPpm = 1_500_000;
    expect(hatalar(dogrulaParametreler(r)).some((h) => h.includes("onceki kademeden kucuk"))).toBe(true);
  });

  it("bakım düzeyleri sırası, akarsu eğrisi toplamı, keşif eki aralığı", () => {
    const p = temel().param;
    p.sanayi!.bakim.duzeyler.reverse();
    expect(hatalar(dogrulaParametreler(p)).some((h) => h.includes("asgari, normal, yuksek"))).toBe(true);
    const q = temel().param;
    q.sanayi!.hidro.akarsuEgrisiPpm[0] = 500_000;
    expect(hatalar(dogrulaParametreler(q)).some((h) => h.includes("12000000"))).toBe(true);
    const r = temel().param;
    r.sanayi!.damar.kesifEkiMinPpm = 700_000;
    expect(hatalar(dogrulaParametreler(r)).some((h) => h.includes("kesifEkiMinPpm"))).toBe(true);
  });

  it("şema: tanınmayan alan, ondalık sayı ve aralık dışı değer reddedilir", () => {
    const p = temel().param as unknown as Record<string, unknown>;
    const s = p["sanayi"] as Record<string, unknown>;
    s["bilinmeyen"] = 1;
    expect(hatalar(dogrulaParametreler(p)).some((h) => h.includes("taninmayan"))).toBe(true);
    const q = temel().param;
    q.sanayi!.iletimKaybiPpm = 0.5;
    expect(hatalar(dogrulaParametreler(q)).length).toBeGreaterThan(0);
    const r = temel().param;
    r.sanayi!.uretimTabaniPpm = 2_000_000;
    expect(hatalar(dogrulaParametreler(r)).length).toBeGreaterThan(0);
  });

  it("sanayi açıkken içerikte depolanamaz elektrik malı ve ölçek teknolojisi gerekir", () => {
    const v = temel();
    const icerik = structuredClone(v.icerik);
    icerik.mallar = icerik.mallar.filter((m) => m.id !== "elektrik");
    for (const y of icerik.yontemler) {
      delete y.girdiler["elektrik"];
      delete y.ciktilar["elektrik"];
    }
    icerik.yontemler = icerik.yontemler.filter((y) => y.ciktilar && Object.keys(y.ciktilar).length > 0 || y.sulama === true);
    expect(hatalar(dogrulaParametreler(v.param, icerik)).some((h) => h.includes('"elektrik"'))).toBe(true);
    const p = temel().param;
    p.sanayi!.olcekKademeleri[2]!.gerekliTeknoloji = "yok_teknoloji";
    expect(hatalar(dogrulaParametreler(p, v.icerik)).some((h) => h.includes("bilinmeyen teknoloji"))).toBe(true);
  });

  it("depolanamaz mal kuralları: enerji kategorisi, maliyet/bakım/başlangıç stoku/pazar alanında yasak, hidro girdi tüketemez", () => {
    const v = temel();
    const e1 = structuredClone(v.icerik);
    e1.mallar.find((m) => m.id === "elektrik")!.kategori = "ara";
    expect(hatalar(dogrulaIcerik(e1)).some((h) => h.includes('"enerji" kategorisinde'))).toBe(true);
    const e2 = structuredClone(v.icerik);
    e2.mallar.find((m) => m.id === "celik")!.kategori = "enerji";
    expect(hatalar(dogrulaIcerik(e2)).some((h) => h.includes("depolanabilir: false gerektirir"))).toBe(true);
    const e3 = structuredClone(v.icerik);
    e3.tesisTurleri.find((t) => t.id === "santral")!.insaMaliyeti["elektrik"] = 1000;
    expect(hatalar(dogrulaIcerik(e3)).some((h) => h.includes("depolanamaz mal; burada kullanilamaz"))).toBe(true);
    const e4 = structuredClone(v.icerik);
    e4.yontemler.find((y) => y.id === "silis_cikarim")!.bakim["elektrik"] = 10;
    expect(hatalar(dogrulaIcerik(e4)).some((h) => h.includes("depolanamaz"))).toBe(true);
    const e5 = structuredClone(v.icerik);
    e5.yontemler.find((y) => y.id === "hidro_santrali")!.girdiler["komur"] = 1000;
    expect(hatalar(dogrulaIcerik(e5)).some((h) => h.includes("girdi tuketemez"))).toBe(true);
    const p1 = temel().param;
    p1.baslangic.stok["elektrik"] = 1;
    expect(hatalar(dogrulaParametreler(p1, v.icerik)).some((h) => h.includes("baslangic.stok"))).toBe(true);
    const p2 = temel().param;
    p2.pazar.emilimSaat["elektrik"] = 1;
    expect(hatalar(dogrulaParametreler(p2, v.icerik)).some((h) => h.includes("pazar.emilimSaat"))).toBe(true);
    // pazar tablolarında elektrik için değer ZORUNLU değildir
    expect(v.param.pazar.emilimSaat["elektrik"]).toBeUndefined();
    expect(hatalar(dogrulaParametreler(v.param, v.icerik))).toEqual([]);
  });
});

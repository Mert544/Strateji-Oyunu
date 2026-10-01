import { describe, expect, it } from "vitest";
import { gercekVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import {
  argumanAyristir,
  botArketibi,
  devletKimlikleri,
  dosyaAdi,
  h1Kos,
  h2Kos,
  h3Kos,
  h5Kos,
  h6Kos,
  h7Kos,
  iklimBaslangicGunu,
  iklimEtkin,
  iklimUygula,
  olcumBaglami,
  raporUret,
  takvimAyAdi,
  veriYukle,
} from "../src";
import type { HipotezSonucu } from "../src";

/** Duvar saati alanlarını (sureMs) çıkararak serileştirir. */
function kararli(x: unknown): string {
  return JSON.stringify(x, (k, v) => (k === "sureMs" ? undefined : v));
}

function semaDogru(h: HipotezSonucu, kimlik: string, tohumSayisi: number): void {
  expect(h.kimlik).toBe(kimlik);
  expect(typeof h.hipotez).toBe("string");
  expect(["gecti", "kaldi", "belirsiz"]).toContain(h.verdict);
  expect(h.tohumBasina).toHaveLength(tohumSayisi);
  for (const t of h.tohumBasina) {
    expect(["gecti", "kaldi", "belirsiz"]).toContain(t.verdict);
    expect(t.durumOzeti).toMatch(/^[0-9a-f]{16}$/);
  }
  expect(h.olcum.ad.length).toBeGreaterThan(0);
  expect(h.esik.aciklama.length).toBeGreaterThan(0);
  expect(h.tohumBasariOrani).toBeGreaterThanOrEqual(0);
  expect(h.tohumBasariOrani).toBeLessThanOrEqual(1);
  expect(() => JSON.parse(JSON.stringify(h))).not.toThrow();
}

/** Parametreler bloğundaki harita ve iklim özeti beklenen gibi mi. */
function baglamDogru(h: HipotezSonucu, harita: string, bolge: number, iklim: string, gunCarpani: number): void {
  const p = h.parametreler as Record<string, unknown> & { iklim: Record<string, unknown> };
  expect(p["harita"]).toBe(harita);
  expect(p["haritaBolgeSayisi"]).toBe(bolge);
  expect(p["haritaDevletSayisi"]).toBe(4);
  expect(p.iklim["secenek"]).toBe(iklim);
  expect(p.iklim["etkin"]).toBe(true);
  expect(p.iklim["gunCarpani"]).toBe(gunCarpani);
}

describe("harita ve iklim: CLI seçenekleri", () => {
  it("--harita ve --iklim ayrıştırılır; varsayılan sentetik + hizli", () => {
    const v = argumanAyristir([]);
    expect(v.harita).toBe("sentetik");
    expect(v.iklim).toBe("hizli");
    const a = argumanAyristir(["--harita", "gercek", "--iklim", "gercek"]);
    expect(a.harita).toBe("gercek");
    expect(a.iklim).toBe("gercek");
    const b = argumanAyristir(["--harita=gercek", "--iklim=hizli"]);
    expect(b.harita).toBe("gercek");
    expect(b.iklim).toBe("hizli");
    expect(() => argumanAyristir(["--harita", "mini"])).toThrow(/--harita/);
    expect(() => argumanAyristir(["--iklim", "yok"])).toThrow(/--iklim/);
    expect(() => argumanAyristir(["--harita"])).toThrow();
  });

  it("dosya adı: gerçek haritada '-gercek', gerçek takvimde '-iklimgercek'; öncekiler değişmez", () => {
    expect(dosyaAdi(["H2", "H5"], [1], true)).toBe("olcum-H2H5-t1-hizli");
    expect(dosyaAdi(["H2"], [1, 2, 3], false, undefined, "sentetik", "hizli")).toBe("olcum-H2-t1-3");
    expect(dosyaAdi(["H2", "H5"], [1], true, undefined, "gercek", "hizli")).toBe("olcum-H2H5-t1-hizli-gercek");
    expect(dosyaAdi(["H2"], [1], false, "v1", "gercek", "gercek")).toBe("olcum-H2-t1-gercek-iklimgercek-v1");
  });

  it("rapor başlığı ve düzenek satırları harita adı ve iklim ayarını yazar", () => {
    const veri = gercekVeriyiYukle();
    const sonuc = {
      kimlik: "H2",
      hipotez: "x",
      olcum: { ad: "a", deger: 0.5, birim: "oran", aciklama: "" },
      esik: { aciklama: "e", deger: 0.6 },
      verdict: "gecti",
      tohumBasariOrani: 1,
      tohumBasina: [],
      ayrinti: {},
      parametreler: olcumBaglami({ harita: "gercek", iklim: "hizli" }, veri, [1, 2]),
      sureMs: 1,
    } as HipotezSonucu;
    const md = raporUret([sonuc], { tohumlar: [1, 2], hizli: true, sureMs: 1, secenekler: {} });
    const baslik = md.split("\n")[0] as string;
    expect(baslik).toContain("harita: gercek");
    expect(baslik).toContain("iklim: hizli");
    expect(md).toContain("**Harita**: gercek (");
    expect(md).toContain("53 bölge, 4 devlet");
    expect(md).toContain("**İklim ayarı**: hizli (gunCarpani=12");
    expect(md).toContain("t1=Ekim");
    expect(md).toContain("t2=Kasim");
  });
});

describe("iklim takvimi: param'a yansıma", () => {
  const veri = gercekVeriyiYukle();
  const taban = veri.param.iklim as NonNullable<typeof veri.param.iklim>;

  it("hizli: gunCarpani=12, başlangıç günü tohumla döner; girdi değişmez", () => {
    expect(taban.gunCarpani).toBe(1);
    const v1 = iklimUygula(veri, "hizli", 1);
    expect(v1.param.iklim?.gunCarpani).toBe(12);
    expect(v1.param.iklim?.baslangicGunu).toBe(taban.baslangicGunu); // tohum 1 kayma almaz
    const v2 = iklimUygula(veri, "hizli", 2);
    expect(v2.param.iklim?.baslangicGunu).toBe(iklimBaslangicGunu(taban.baslangicGunu, 2, taban.ayGunleri));
    expect(takvimAyAdi(v2.param.iklim?.baslangicGunu as number, taban.ayGunleri)).toBe("Kasim");
    expect(v2.param.iklim?.baslangicGunu).not.toBe(v1.param.iklim?.baslangicGunu);
    expect(taban.gunCarpani).toBe(1); // orijinal paket etkilenmez
    expect(veri.param.iklim).toBe(taban);
    expect(v2.harita).toBe(veri.harita); // yalnız param.iklim yeni nesne
    expect(v2.icerik).toBe(veri.icerik);
  });

  it("gercek: param'ın gunCarpani'si korunur, başlangıç günü yine döner", () => {
    const v = iklimUygula(veri, "gercek", 3);
    expect(v.param.iklim?.gunCarpani).toBe(taban.gunCarpani);
    expect(v.param.iklim?.baslangicGunu).toBe(iklimBaslangicGunu(taban.baslangicGunu, 3, taban.ayGunleri));
  });

  it("seçenek yoksa param olduğu gibi (aynı nesne)", () => {
    expect(iklimUygula(veri, undefined, 5)).toBe(veri);
    expect(iklimEtkin(veri, undefined)).toBe(false);
  });

  it("tarım veya iklim kapalıysa seçenek sessizce etkisiz kalır", () => {
    const tarimsiz = { ...veri, param: { ...veri.param } };
    delete tarimsiz.param.tarim;
    expect(iklimEtkin(tarimsiz, "hizli")).toBe(false);
    expect(iklimUygula(tarimsiz, "hizli", 2)).toBe(tarimsiz);
    const iklimsiz = { ...veri, param: { ...veri.param } };
    delete iklimsiz.param.iklim;
    expect(iklimUygula(iklimsiz, "hizli", 2)).toBe(iklimsiz);
    const b = olcumBaglami({ iklim: "hizli" }, iklimsiz, [1]) as { iklim: Record<string, unknown> };
    expect(b.iklim["etkin"]).toBe(false);
    expect(b.iklim["baslangicGunleri"]).toBeNull();
  });

  it("12 ardışık tohum 12 ayı kapsar; döngü 365 gün içinde kalır", () => {
    const aylar = new Set<string>();
    for (let t = 1; t <= 12; t++) {
      const g = iklimBaslangicGunu(taban.baslangicGunu, t, taban.ayGunleri);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThan(365);
      aylar.add(takvimAyAdi(g, taban.ayGunleri));
    }
    expect(aylar.size).toBe(12);
    expect(takvimAyAdi(taban.baslangicGunu, taban.ayGunleri)).toBe("Ekim");
    // 13. tohum başa döner; kısa aya sığmayan gün ayın sonuna kırpılır (31 Ekim -> Kasim 30)
    expect(iklimBaslangicGunu(taban.baslangicGunu, 13, taban.ayGunleri)).toBe(taban.baslangicGunu);
    expect(iklimBaslangicGunu(273 + 30, 2, taban.ayGunleri)).toBe(304 + 29);
  });

  it("olcumBaglami: harita ve iklim özeti", () => {
    const b = olcumBaglami({ harita: "gercek", iklim: "gercek" }, veri, [1, 4]) as Record<string, unknown> & { iklim: Record<string, unknown> };
    expect(b["harita"]).toBe("gercek");
    expect(b["haritaBolgeSayisi"]).toBe(53);
    expect(b.iklim["gunCarpani"]).toBe(1);
    expect(Object.keys(b.iklim["baslangicGunleri"] as object)).toEqual(["1", "4"]);
    expect((olcumBaglami({}, veri, [1]) as Record<string, unknown>)["harita"]).toBe("sentetik");
  });
});

describe("harita seçimi ve devlet türetmesi", () => {
  it("veriYukle: sentetik (vars.) ve gerçek; veri verilirse o", () => {
    expect(veriYukle({}).harita.bolgeler.length).toBe(varsayilanVeriyiYukle().harita.bolgeler.length);
    const g = veriYukle({ harita: "gercek" });
    expect(g.harita.bolgeler).toHaveLength(53);
    expect(g.harita.devletler.map((d) => d.id).sort()).toEqual(["isvend", "korvan", "talmera", "zephra"]);
    const ozel = varsayilanVeriyiYukle();
    expect(veriYukle({ harita: "gercek", veri: ozel })).toBe(ozel);
  });

  it("devletKimlikleri haritadan türetilir; botArketibi döngüseldir", () => {
    expect(devletKimlikleri(gercekVeriyiYukle().harita)).toEqual(gercekVeriyiYukle().harita.devletler.map((d) => d.id));
    expect(devletKimlikleri(varsayilanVeriyiYukle().harita)).toHaveLength(4);
    expect(botArketibi(0)).toBe("sanayici");
    expect(botArketibi(3)).toBe("militarist");
    expect(botArketibi(4)).toBe("sanayici");
  });
});

describe("gerçek haritada hipotez koşucuları (kısa sürüm)", () => {
  const tohumlar = [1];
  const gercek = { tohumlar, kisa: true, harita: "gercek", iklim: "hizli" } as const;
  const ayri: HipotezSonucu[] = [];

  it("H1: gerçek haritada devlet başına 1 bölge örneklenir", () => {
    const h = h1Kos(gercek);
    semaDogru(h, "H1", 1);
    baglamDogru(h, "gercek", 53, "hizli", 12);
    expect(h.parametreler["bolgeSayisi"]).toBe(4);
    expect(h.parametreler["tumBolgeSayisi"]).toBe(53);
    const ay = h.ayrinti as { odakKumeleri: Record<string, string[]> };
    const gercekBolgeler = new Set(gercekVeriyiYukle().harita.bolgeler.map((b) => b.id));
    for (const b of Object.keys(ay.odakKumeleri)) expect(gercekBolgeler.has(b)).toBe(true);
  }, 300_000);

  it("H2: şemaya uygun, 4 devlet ve 3 gün", () => {
    const h = h2Kos(gercek);
    semaDogru(h, "H2", 1);
    baglamDogru(h, "gercek", 53, "hizli", 12);
    expect((h.ayrinti["tohumlar"] as Array<{ gunler: unknown[] }>)[0]!.gunler).toHaveLength(3);
    expect(h.parametreler["oyuncular"]).toEqual(["sanayici", "tuccar", "lojistikci", "militarist"]);
    ayri.push(h);
  }, 300_000);

  it("H3: şemaya uygun; mal sayısı içerikten", () => {
    const h = h3Kos(gercek);
    semaDogru(h, "H3", 1);
    baglamDogru(h, "gercek", 53, "hizli", 12);
    expect(h.ayrinti["degisimTablosuIlkTohum"] as unknown[]).toHaveLength(gercekVeriyiYukle().icerik.mallar.length);
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

  it("iklim seçeneği koşuya yansır: gunCarpani=12 ile gerçek takvimin durum izi farklıdır", () => {
    const hizli = h2Kos(gercek);
    const takvim = h2Kos({ ...gercek, iklim: "gercek" });
    baglamDogru(takvim, "gercek", 53, "gercek", 1);
    expect(hizli.tohumBasina[0]!.durumOzeti).not.toBe(takvim.tohumBasina[0]!.durumOzeti);
  }, 300_000);

  it("sentetik harita (vars.): parametrelerde sentetik yazar", () => {
    const h = h6Kos({ tohumlar, kisa: true });
    semaDogru(h, "H6", 1);
    expect(h.parametreler["harita"]).toBe("sentetik");
    expect(h.parametreler["haritaBolgeSayisi"]).toBe(varsayilanVeriyiYukle().harita.bolgeler.length);
    expect((h.parametreler["iklim"] as Record<string, unknown>)["secenek"]).toBe("param");
  }, 300_000);
});

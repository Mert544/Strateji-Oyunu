import { describe, expect, it } from "vitest";
import {
  dogrulaHarita,
  dogrulaIcerik,
  dogrulaParametreler,
  dogrulaVeriPaketi,
  miniVeriyiYukle,
  MINI_HARITA_SECENEKLERI,
  varsayilanVeriyiYukle,
  type DogrulamaSonucu,
} from "../src/index";

function hatalar(s: DogrulamaSonucu): string[] {
  return s.gecerli ? [] : s.hatalar;
}

function kopya<T>(x: T): T {
  return structuredClone(x);
}

describe("varsayilan ve mini veri", () => {
  it("varsayilan veri paketi gecerli yuklenir", () => {
    const v = varsayilanVeriyiYukle();
    expect(v.harita.bolgeler).toHaveLength(50);
    expect(v.icerik.mallar).toHaveLength(12);
    expect(v.icerik.teknolojiler).toHaveLength(6);
    expect(dogrulaVeriPaketi(v)).toEqual({ gecerli: true });
  });

  it("mini veri paketi mini secenekleriyle gecerli, varsayilan secenekle reddedilir", () => {
    const v = miniVeriyiYukle();
    expect(v.harita.bolgeler).toHaveLength(6);
    expect(v.harita.devletler).toHaveLength(2);
    expect(dogrulaVeriPaketi(v, MINI_HARITA_SECENEKLERI)).toEqual({ gecerli: true });
    const h = hatalar(dogrulaHarita(v.harita));
    expect(h.some((x) => x.includes("bolge sayisi"))).toBe(true);
    expect(h.some((x) => x.includes("devlet sayisi"))).toBe(true);
  });

  it("yukleme her cagrida bagimsiz kopya doner", () => {
    const a = varsayilanVeriyiYukle();
    const b = varsayilanVeriyiYukle();
    a.harita.bolgeler[0]!.nufus = 1;
    expect(b.harita.bolgeler[0]!.nufus).not.toBe(1);
  });

  it("icerik sozlesmeye uygun: 12 mal, 12 tesis turu, ham mallarin rezerv yontemi var", () => {
    const { icerik } = varsayilanVeriyiYukle();
    const ham = icerik.mallar.filter((m) => m.kategori === "ham").map((m) => m.id).sort();
    expect(ham).toEqual(["bakir", "cevher", "komur", "petrol", "silis", "tahil"]);
    expect(icerik.tesisTurleri).toHaveLength(12);
    for (const m of ham) {
      expect(icerik.yontemler.some((y) => y.rezerv === m)).toBe(true);
    }
    // Teknolojiler yuzde artis vermez: her acilan yontem/tesis teknolojiye baglidir.
    for (const y of icerik.yontemler.filter((y) => y.gerekliTeknoloji !== undefined)) {
      const tk = icerik.teknolojiler.find((t) => t.id === y.gerekliTeknoloji);
      expect(tk?.acar.yontemler).toContain(y.id);
    }
  });

  it("sureler PDF araliklarina uygun: insa 2-12 saat, parti 6-24 saat, teknoloji 1-5 gun", () => {
    const { icerik } = varsayilanVeriyiYukle();
    for (const t of icerik.tesisTurleri) {
      expect(t.insaSuresiSaat).toBeGreaterThanOrEqual(2);
      expect(t.insaSuresiSaat).toBeLessThanOrEqual(12);
    }
    for (const b of icerik.birlikler) {
      expect(b.partiSuresiSaat).toBeGreaterThanOrEqual(6);
      expect(b.partiSuresiSaat).toBeLessThanOrEqual(24);
    }
    for (const t of icerik.teknolojiler) {
      expect(t.sureGun).toBeGreaterThanOrEqual(1);
      expect(t.sureGun).toBeLessThanOrEqual(5);
    }
  });
});

describe("bozuk harita reddedilir", () => {
  const temel = () => varsayilanVeriyiYukle().harita;

  it("baglanti kopuk graf", () => {
    const h = temel();
    // Adayi (hilal_adasi) baglayan tum kenarlari sil -> graf bagli degil
    h.kenarlar = h.kenarlar.filter((k) => k.a !== "hilal_adasi" && k.b !== "hilal_adasi");
    const r = hatalar(dogrulaHarita(h));
    expect(r.some((x) => x.includes("bagli degil") && x.includes("hilal_adasi"))).toBe(true);
  });

  it("eksik referans: kenar ucu ve bolge devleti", () => {
    const h = temel();
    h.kenarlar[0]!.b = "yok_boyle_bolge";
    h.bolgeler[1]!.devlet = "yok_devlet";
    const r = hatalar(dogrulaHarita(h));
    expect(r.some((x) => x.includes("kenarlar[0].b") && x.includes("yok_boyle_bolge"))).toBe(true);
    expect(r.some((x) => x.includes("bolgeler[1].devlet") && x.includes("yok_devlet"))).toBe(true);
  });

  it("ondalik sayi", () => {
    const h = temel();
    h.bolgeler[0]!.nufus = 1234.5;
    h.kenarlar[0]!.kapasiteSaat = 10.25;
    const r = hatalar(dogrulaHarita(h));
    expect(r.some((x) => x.startsWith("bolgeler[0].nufus") && x.includes("tamsayi"))).toBe(true);
    expect(r.some((x) => x.startsWith("kenarlar[0].kapasiteSaat") && x.includes("tamsayi"))).toBe(true);
  });

  it("negatif sayi, yanlis surum ve taninmayan alan", () => {
    const h = temel() as unknown as Record<string, unknown>;
    (h.bolgeler as Array<Record<string, unknown>>)[0]!.nufus = -5;
    (h.bolgeler as Array<Record<string, unknown>>)[0]!.fazla = 1;
    h.surum = 2;
    const r = hatalar(dogrulaHarita(h));
    expect(r.some((x) => x.startsWith("surum"))).toBe(true);
    expect(r.some((x) => x.includes("negatif"))).toBe(true);
    expect(r.some((x) => x.includes("taninmayan"))).toBe(true);
  });

  it("yinelenen kimlik, yinelenen kenar, kendine kenar", () => {
    const h = temel();
    h.bolgeler[10]!.id = h.bolgeler[11]!.id;
    h.kenarlar.push({ ...h.kenarlar[0]!, tur: "hava" });
    h.kenarlar.push({ a: "ak_ova", b: "ak_ova", tur: "kara", kapasiteSaat: 1, sureSaat: 1 });
    const r = hatalar(dogrulaHarita(h));
    expect(r.some((x) => x.includes("yinelenen kimlik"))).toBe(true);
    expect(r.some((x) => x.includes("yinelenen kenar"))).toBe(true);
    expect(r.some((x) => x.includes("kendine kenar"))).toBe(true);
  });

  it("liman kiyi degil ve deniz kenari kiyi olmayan bolgeler arasinda", () => {
    const h = temel();
    const liman = h.bolgeler.find((b) => b.id === "kopuk_limani")!;
    liman.etiketler = ["liman"];
    h.kenarlar.push({ a: "askan_kenti", b: "belora_kenti", tur: "deniz", kapasiteSaat: 100, sureSaat: 30 });
    const r = hatalar(dogrulaHarita(h));
    expect(r.some((x) => x.includes("kiyi") && x.includes("kopuk_limani"))).toBe(true);
    expect(r.some((x) => x.includes("deniz kenari") && x.includes("askan_kenti"))).toBe(true);
  });

  it("dar gecit ve liman sayisi yetersiz, bolge ve devlet sayisi aralik disi", () => {
    const h = temel();
    for (const b of h.bolgeler) b.etiketler = b.etiketler.filter((e) => e !== "dar_gecit" && e !== "liman");
    h.devletler.pop();
    h.devletler.pop();
    const r = hatalar(dogrulaHarita(h));
    expect(r.some((x) => x.includes("dar_gecit"))).toBe(true);
    expect(r.some((x) => x.includes("liman"))).toBe(true);
    expect(r.some((x) => x.includes("devlet sayisi"))).toBe(true);
    expect(hatalar(dogrulaHarita({ ...temel(), bolgeler: temel().bolgeler.slice(0, 5) })).some((x) => x.includes("bolge sayisi"))).toBe(true);
  });

  it("gecersiz rezerv anahtari bicimi", () => {
    const h = temel();
    h.bolgeler[0]!.rezervler = { "Demir Cevheri": 1000 };
    const r = hatalar(dogrulaHarita(h));
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.includes("kimlik"))).toBe(true);
  });

  it("bos ve saçma girdi atmaz, hata dondurur", () => {
    expect(dogrulaHarita(null).gecerli).toBe(false);
    expect(dogrulaHarita("x").gecerli).toBe(false);
    expect(dogrulaIcerik(undefined).gecerli).toBe(false);
    expect(dogrulaParametreler(42).gecerli).toBe(false);
  });
});

describe("bozuk icerik reddedilir", () => {
  const temel = () => varsayilanVeriyiYukle().icerik;

  it("eksik referanslar", () => {
    const c = temel();
    c.yontemler[2]!.girdiler = { olmayan_mal: 1000 };
    c.tesisTurleri[0]!.yontemler.push("olmayan_yontem");
    c.teknolojiler[1]!.onKosullar = ["olmayan_teknoloji"];
    c.birlikler[0]!.maliyet = { olmayan_mal: 1 };
    c.birlikler[1]!.gerekliTeknoloji = "olmayan_teknoloji";
    c.teknolojiler[0]!.acar = { yontemler: ["olmayan_yontem2"] };
    const r = hatalar(dogrulaIcerik(c));
    expect(r.some((x) => x.includes("olmayan_mal") && x.includes("girdiler"))).toBe(true);
    expect(r.some((x) => x.includes("olmayan_yontem\""))).toBe(true);
    expect(r.some((x) => x.includes("olmayan_teknoloji") && x.includes("onKosullar"))).toBe(true);
    expect(r.some((x) => x.includes("birlikler[0]") && x.includes("olmayan_mal"))).toBe(true);
    expect(r.some((x) => x.includes("birlikler[1]") && x.includes("gerekliTeknoloji"))).toBe(true);
    expect(r.some((x) => x.includes("olmayan_yontem2"))).toBe(true);
  });

  it("ondalik sayi", () => {
    const c = temel();
    c.yontemler[0]!.isci = 100.5;
    c.mallar[0]!.tabanFiyat = 30000.25;
    const r = hatalar(dogrulaIcerik(c));
    expect(r.filter((x) => x.includes("tamsayi")).length).toBeGreaterThanOrEqual(2);
  });

  it("dongulu teknoloji", () => {
    const c = temel();
    const a = c.teknolojiler.find((t) => t.id === "mekanize_tarim")!;
    a.onKosullar = ["konteyner_limani"]; // mekanize_tarim -> konteyner_limani -> otomasyon -> mekanize_tarim
    const r = hatalar(dogrulaIcerik(c));
    expect(r.some((x) => x.includes("dongusu"))).toBe(true);
  });

  it("kendi kendine on kosul", () => {
    const c = temel();
    c.teknolojiler[0]!.onKosullar = [c.teknolojiler[0]!.id];
    expect(hatalar(dogrulaIcerik(c)).some((x) => x.includes("kendisinin"))).toBe(true);
  });

  it("rezerv ham olmayan mala isaret eder", () => {
    const c = temel();
    c.yontemler.find((y) => y.id === "geleneksel_tarim")!.rezerv = "gida";
    const r = hatalar(dogrulaIcerik(c));
    expect(r.some((x) => x.includes("ham") && x.includes("gida"))).toBe(true);
  });

  it("varsayilan yontem teknoloji gerektiremez", () => {
    const c = temel();
    const ciftlik = c.tesisTurleri.find((t) => t.id === "ciftlik")!;
    ciftlik.yontemler = ["mekanize_tarim", "geleneksel_tarim"];
    expect(hatalar(dogrulaIcerik(c)).some((x) => x.includes("varsayilan yontem"))).toBe(true);
  });

  it("hicbir tesiste kullanilmayan yontem", () => {
    const c = temel();
    c.yontemler.push({ ...c.yontemler[2]!, id: "yetim_yontem" });
    expect(hatalar(dogrulaIcerik(c)).some((x) => x.includes("yetim_yontem"))).toBe(true);
  });
});

describe("parametreler ve paket capraz kontrolleri", () => {
  it("bilinmeyen mal ve birlik (icerik verilince)", () => {
    const v = varsayilanVeriyiYukle();
    const p = kopya(v.param);
    p.baslangic.stok["olmayan_mal"] = 5;
    p.baslangic.birlikler["olmayan_birlik"] = 1;
    delete p.pazar.emilimSaat["celik"];
    expect(dogrulaParametreler(p).gecerli).toBe(true); // icerik yoksa yalniz bicim
    const r = hatalar(dogrulaParametreler(p, v.icerik));
    expect(r.some((x) => x.includes("olmayan_mal"))).toBe(true);
    expect(r.some((x) => x.includes("olmayan_birlik"))).toBe(true);
    expect(r.some((x) => x.includes("emilimSaat") && x.includes("celik"))).toBe(true);
  });

  it("ondalik ve eksik alan", () => {
    const v = varsayilanVeriyiYukle();
    const p = kopya(v.param) as unknown as { ekonomi: { depoKapasitesi: number }; askeri: Record<string, unknown> };
    p.ekonomi.depoKapasitesi = 1.5;
    delete p.askeri["pencereSaat"];
    const r = hatalar(dogrulaParametreler(p));
    expect(r.some((x) => x.includes("depoKapasitesi") && x.includes("tamsayi"))).toBe(true);
    expect(r.some((x) => x.includes("pencereSaat") && x.includes("eksik"))).toBe(true);
  });

  it("v0.1 parametreleri: erken oyun, para lavaboları ve teknoloji yayilimi dogrulanir", () => {
    const v = varsayilanVeriyiYukle();
    // Varsayılan değerler geçerli ve beklenen alanlar var.
    expect(v.param.erkenOyun.baslangicCarpaniPpm).toBeGreaterThan(0);
    expect(v.param.ekonomi.tesisIsletmeParasiSaat).toBeGreaterThan(0);
    expect(v.param.askeri.birlikMaasiSaat).toBeGreaterThan(0);
    expect(v.param.teknoloji.yayilimIndirimiPpm).toBeGreaterThan(0);

    const p = kopya(v.param);
    p.erkenOyun.bitisSaat = p.erkenOyun.sabitSaat - 1;
    p.teknoloji.yayilimIndirimiPpm = 950_000;
    const r = hatalar(dogrulaParametreler(p));
    expect(r.some((x) => x.includes("erkenOyun.bitisSaat"))).toBe(true);
    expect(r.some((x) => x.includes("yayilimIndirimiPpm"))).toBe(true);

    const q = kopya(v.param);
    q.erkenOyun.baslangicCarpaniPpm = 0; // en az 1
    expect(hatalar(dogrulaParametreler(q)).some((x) => x.includes("baslangicCarpaniPpm"))).toBe(true);
    const e = kopya(v.param) as unknown as { erkenOyun: Record<string, unknown>; teknoloji: Record<string, unknown> };
    delete e.erkenOyun["sabitSaat"];
    delete e.teknoloji["yayilimIndirimiPpm"];
    const r2 = hatalar(dogrulaParametreler(e));
    expect(r2.some((x) => x.includes("sabitSaat") && x.includes("eksik"))).toBe(true);
    expect(r2.some((x) => x.includes("yayilimIndirimiPpm") && x.includes("eksik"))).toBe(true);
  });

  it("harita rezerv mali icerikte ham degil / tesis icin rezerv veya etiket yok", () => {
    const v = varsayilanVeriyiYukle();
    const paket = kopya(v);
    paket.harita.bolgeler[0]!.rezervler["celik"] = 1000;
    const siralama = paket.harita.bolgeler.find((b) => b.id === "kopuk_limani")!;
    siralama.tesisler.push("ciftlik"); // ne ova ne tahil rezervi var
    paket.harita.bolgeler.find((b) => b.id === "yelken_limani")!.tesisler.push("olmayan_tesis");
    const r = hatalar(dogrulaVeriPaketi(paket));
    expect(r.some((x) => x.includes("\"celik\"") && x.includes("ham"))).toBe(true);
    expect(r.some((x) => x.includes("kopuk_limani") && x.includes("ova"))).toBe(true);
    expect(r.some((x) => x.includes("kopuk_limani") && x.includes("tahil"))).toBe(true);
    expect(r.some((x) => x.includes("olmayan_tesis"))).toBe(true);
  });

  it("baslangic tesisi teknoloji gerektiremez", () => {
    const paket = kopya(varsayilanVeriyiYukle());
    paket.icerik.tesisTurleri.find((t) => t.id === "celikhane")!.gerekliTeknoloji = "otomasyon";
    paket.icerik.teknolojiler.find((t) => t.id === "otomasyon")!.acar.tesisTurleri = ["celikhane"];
    expect(hatalar(dogrulaVeriPaketi(paket)).some((x) => x.includes("baslangic tesisi teknoloji"))).toBe(true);
  });
});

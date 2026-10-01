import { describe, expect, it } from "vitest";
import {
  dogrulaHarita,
  dogrulaIcerik,
  dogrulaParametreler,
  dogrulaPerakende,
  dogrulaVeriPaketi,
  miniVeriyiYukle,
  MINI_HARITA_SECENEKLERI,
  MULK_ENCOK_AYAK_IZI,
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
    // v0.2: 12 mal, 6 teknoloji; B1 (Tarım): + gubre malı, + sulama_sistemi teknolojisi; B2 (Sanayi): + elektrik malı.
    // P3 (mal kimlik kilidi, docs/06 §15.8): + Alfa-0'ın 10 yeni malı (un, ekmek, cam, pencere, sut, sut_urunu, findik, findik_urunu, sekerleme, kepek) = 24 (eski değer 14).
    expect(v.icerik.mallar).toHaveLength(24);
    expect(v.icerik.teknolojiler).toHaveLength(7);
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

  it("icerik sozlesmeye uygun: 24 mal (eski 14 + P3'ün 10'u), 18 tesis turu, madenî/tarımsal ham mallarin rezerv yontemi var", () => {
    const { icerik } = varsayilanVeriyiYukle();
    const tumHam = icerik.mallar.filter((m) => m.kategori === "ham").map((m) => m.id).sort();
    // P3: sut ve findik "ham" kategoridedir ama rezerv (maden/petrol/toprak) değil çiftlik ve ahır üretimidir; yöntemleri P4/P5'te gelir.
    expect(tumHam).toEqual(["bakir", "cevher", "findik", "komur", "petrol", "silis", "sut", "tahil"]);
    const ham = tumHam.filter((m) => m !== "sut" && m !== "findik");
    expect(ham).toEqual(["bakir", "cevher", "komur", "petrol", "silis", "tahil"]);
    // v0.2: 12 tesis türü; B1: + ahir, mera, gubre_fabrikasi, sulama_kanali; B2: + santral, hidro_santrali.
    expect(icerik.tesisTurleri).toHaveLength(18);
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

// ---------------------------------------------------------------------------
// G6-1 şeması (sartname §4.1, §4.2, §4.7, §4.8): hepsi isteğe bağlı ve etkisiz; her alan için ret testi
// ---------------------------------------------------------------------------

describe("mulkKipi (YontemTanimi): kurallar", () => {
  /** Tür varsayılanı OLMAYAN, teknoloji şartı olmayan bir yöntem ve onu barındıran tür. */
  function aday(v: ReturnType<typeof varsayilanVeriyiYukle>): { yontem: string; tur: string } {
    for (const t of v.icerik.tesisTurleri) {
      for (const yId of t.yontemler.slice(1)) {
        const y = v.icerik.yontemler.find((k) => k.id === yId)!;
        if (y.gerekliTeknoloji === undefined) return { yontem: yId, tur: t.id };
      }
    }
    throw new Error("aday yontem yok");
  }

  it("varsayılan olmayan ve teknoloji şartsız yöntemde geçerli; alan yokken (eski içerik) aynen geçerli; bugünkü içerikte yalnız G6'nın dört yöntemi mulkKipi", () => {
    const v = kopya(varsayilanVeriyiYukle());
    expect(v.icerik.yontemler.filter((y) => y.mulkKipi === true).map((y) => y.id)).toEqual(["degirmen", "ekmek_firini", "kepek_gubresi", "sut_kepekli"]);
    expect(dogrulaIcerik(v.icerik)).toEqual({ gecerli: true });
    for (const y of v.icerik.yontemler) delete y.mulkKipi; // alan yokken (G6 öncesi içerik) geçerli
    expect(dogrulaIcerik(v.icerik)).toEqual({ gecerli: true });
    const { yontem } = aday(v);
    v.icerik.yontemler.find((y) => y.id === yontem)!.mulkKipi = true;
    expect(dogrulaIcerik(v.icerik)).toEqual({ gecerli: true });
  });

  it("mulkKipi yöntemi içerikte olmayan malı kullanırsa dogrulaIcerik ve dogrulaVeriPaketi REDDEDER (çekirdek ekonomi/tablo.ts'in dondurulmuş eski içerik için gösterdiği boş-satır toleransını gerçek yüklemede kapatır)", () => {
    const v = kopya(varsayilanVeriyiYukle());
    const y = v.icerik.yontemler[1]!; // içerikten bağımsız: herhangi bir yöntem mulkKipi yapılır
    y.mulkKipi = true;
    y.ciktilar["yok_mal"] = 1_000;
    expect(hatalar(dogrulaIcerik(v.icerik)).join("\n")).toContain(`ciktilar: bilinmeyen mal "yok_mal"`);
    expect(dogrulaVeriPaketi(v).gecerli).toBe(false);
    const w = kopya(varsayilanVeriyiYukle());
    const z = w.icerik.yontemler[2]!;
    z.mulkKipi = true;
    z.girdiler["yok_mal"] = 5;
    expect(hatalar(dogrulaIcerik(w.icerik)).join("\n")).toContain(`girdiler: bilinmeyen mal "yok_mal"`);
  });

  it("tür varsayılanı (yontemler[0]) olamaz", () => {
    const v = kopya(varsayilanVeriyiYukle());
    const t = v.icerik.tesisTurleri[0]!;
    v.icerik.yontemler.find((y) => y.id === t.yontemler[0])!.mulkKipi = true;
    expect(hatalar(dogrulaIcerik(v.icerik)).join("\n")).toContain(`yontemler: "${t.yontemler[0]}" mulkKipi yontemi tur varsayilani olamaz (${t.id})`);
  });

  it("teknoloji şartı taşıyamaz (kilitsizlik)", () => {
    const v = kopya(varsayilanVeriyiYukle());
    const kilitli = v.icerik.yontemler.find((y) => y.gerekliTeknoloji !== undefined)!;
    kilitli.mulkKipi = true;
    expect(hatalar(dogrulaIcerik(v.icerik)).join("\n")).toContain(`yontemler: "${kilitli.id}" mulkKipi yontemi teknoloji sarti tasiyamaz`);
  });

  it("yalnız literal true: false, dize ve sayı reddedilir (şema)", () => {
    const v = kopya(varsayilanVeriyiYukle());
    const y = v.icerik.yontemler.find((k) => k.id === aday(v).yontem) as unknown as Record<string, unknown>;
    for (const kotu of [false, "true", 1, null]) {
      y["mulkKipi"] = kotu;
      expect(dogrulaIcerik(v.icerik).gecerli, JSON.stringify(kotu)).toBe(false);
    }
  });
});

describe("mulk.sebeke ve mulk.yontemGecersizKilma (şema ve aralık)", () => {
  const sebeke = () => ({ surum: 1 as const, mallar: [{ mal: "elektrik", tavanOraniPpm: 1_000_000 }, { mal: "yakit", tavanOraniPpm: 1_000_000 }], kasaPayiPpm: 120_000 });
  const mulkParam = () => {
    const v = miniVeriyiYukle();
    return { v, p: kopya(v.param) };
  };

  it("alanlar yokken (G6 öncesi parametreler) geçerli; bugünkü parametrelerde sebeke ve gecersizKilma (T3 G6 yaması) var ve geçerli", () => {
    const { v, p } = mulkParam();
    expect(p.mulk?.sebeke).toEqual({ surum: 1, mallar: [{ mal: "elektrik", tavanOraniPpm: 1_000_000 }, { mal: "yakit", tavanOraniPpm: 1_000_000 }], kasaPayiPpm: 120_000 });
    expect(p.mulk?.yontemGecersizKilma).toEqual({ standart_gida_isleme: { ciktiPpm: 1_000_000 } });
    expect(dogrulaParametreler(p, v.icerik)).toEqual({ gecerli: true });
    delete p.mulk!.sebeke;
    delete p.mulk!.yontemGecersizKilma;
    expect(dogrulaParametreler(p, v.icerik)).toEqual({ gecerli: true }); // alanlar yokken
    p.mulk!.sebeke = sebeke();
    p.mulk!.yontemGecersizKilma = { standart_gida_isleme: { ciktiPpm: 1_000_000 } };
    expect(dogrulaParametreler(p, v.icerik)).toEqual({ gecerli: true });
  });

  it("sebeke: boş mallar, tekrarlı mal, tavan oranı 0 ve > 1 000 000, kasa payı aralığı, ek alan (.strict) reddedilir", () => {
    const { v, p } = mulkParam();
    const dene = (duzenle: (s: ReturnType<typeof sebeke>) => void): string => {
      const q = kopya(p);
      const s = sebeke();
      duzenle(s);
      q.mulk!.sebeke = s;
      return hatalar(dogrulaParametreler(q, v.icerik)).join("\n");
    };
    expect(dene((s) => (s.mallar = []))).toMatch(/sebeke\.mallar bos olamaz/);
    expect(dene((s) => s.mallar.push({ mal: "elektrik", tavanOraniPpm: 500_000 }))).toMatch(/mulk\.sebeke\.mallar: yinelenen kimlik/);
    expect(dene((s) => (s.mallar[0]!.tavanOraniPpm = 0))).toMatch(/tavanOraniPpm/);
    expect(dene((s) => (s.mallar[0]!.tavanOraniPpm = 1_000_001))).toMatch(/mulk\.sebeke\.mallar\[0\] \("elektrik"\)\.tavanOraniPpm: en fazla 1000000/);
    expect(dene((s) => (s.mallar[0]!.tavanOraniPpm = 1_000_000))).toBe("");
    expect(dene((s) => (s.kasaPayiPpm = 1_000_001))).toMatch(/kasaPayiPpm/);
    expect(dene((s) => (s.kasaPayiPpm = -1))).toMatch(/kasaPayiPpm/);
    expect(dene((s) => (s.kasaPayiPpm = 0))).toBe("");
    expect(dene((s) => ((s.mallar[0] as unknown as Record<string, unknown>)["fiyatKaynagi"] = "canli"))).not.toBe(""); // canlı fiyat yolu şemada yok
    expect(dene((s) => ((s as unknown as Record<string, unknown>)["elektrik"] = true))).not.toBe("");
    expect(dene((s) => ((s as unknown as Record<string, unknown>)["surum"] = 2))).not.toBe("");
  });

  it("yontemGecersizKilma: ciktiPpm 0, negatif, > 2 000 000, ondalık ve ek alan reddedilir; 2 000 000 ve 750 000 geçer", () => {
    const { v, p } = mulkParam();
    const dene = (ciktiPpm: unknown, ek?: Record<string, unknown>): string => {
      const q = kopya(p);
      q.mulk!.yontemGecersizKilma = { standart_gida_isleme: { ciktiPpm, ...ek } as { ciktiPpm: number } };
      return hatalar(dogrulaParametreler(q, v.icerik)).join("\n");
    };
    expect(dene(0)).toMatch(/ciktiPpm/);
    expect(dene(-5)).toMatch(/ciktiPpm/);
    expect(dene(2_000_001)).toMatch(/mulk\.yontemGecersizKilma\.standart_gida_isleme\.ciktiPpm: en fazla 2000000/);
    expect(dene(750_000.5)).toMatch(/ciktiPpm/);
    expect(dene("750000")).not.toBe("");
    expect(dene(2_000_000)).toBe("");
    expect(dene(750_000)).toBe("");
    expect(dene(1_000_000, { girdiPpm: 1 })).not.toBe(""); // yalnız çıktı ölçeklenir
  });
});

describe("mulk.ekYapilar.<yapı>.olcekHucre (G7 için isteğe bağlı, etkisiz)", () => {
  it("alan yokken geçerli; [yuva, M, L] kuralları: S = yuva, M >= S, L >= M, en çok 5; üç elemandan başka biçim reddedilir", () => {
    const v = miniVeriyiYukle();
    const ek = Object.keys(v.param.mulk!.ekYapilar!)[0]!;
    const yuva = v.param.mulk!.ekYapilar![ek]!.yuva;
    const dene = (o: unknown): string => {
      const q = kopya(v.param);
      (q.mulk!.ekYapilar![ek] as unknown as Record<string, unknown>)["olcekHucre"] = o;
      return hatalar(dogrulaParametreler(q, v.icerik)).join("\n");
    };
    expect(dogrulaParametreler(v.param, v.icerik)).toEqual({ gecerli: true });
    expect(dene([yuva, yuva + 1, yuva + 2])).toBe("");
    expect(dene([yuva + 1, yuva + 1, yuva + 2])).toMatch(/olcekHucre\[0\]: S ayak izi yuva degerine/);
    expect(dene([yuva, yuva + 2, yuva + 1])).toMatch(/olcekHucre\[2\]: L ayak izi M'den kucuk olamaz/);
    expect(dene([yuva, yuva - 1 > 0 ? yuva - 1 : 1, yuva + 1])).toMatch(yuva === 1 ? /^$/ : /olcekHucre\[1\]: M ayak izi S'den kucuk olamaz/);
    expect(dene([yuva, yuva + 1, MULK_ENCOK_AYAK_IZI + 1])).toMatch(new RegExp(`olcekHucre\\[2\\]: en cok ${MULK_ENCOK_AYAK_IZI} hucre`));
    expect(dene([yuva, yuva + 1])).not.toBe("");
    expect(dene([yuva, yuva + 1, yuva + 2, yuva + 3])).not.toBe("");
    expect(dene("1,2,3")).not.toBe("");
  });
});

describe("mulk.bakim (bakım C, sartname §5.10): V18 şema ve türev sınır, V19 içerik çaprazı", () => {
  const paket = (bakim: unknown) => {
    const v = miniVeriyiYukle();
    (v.param.mulk as { bakim?: unknown }).bakim = bakim;
    return v;
  };
  const prm = (bakim: unknown): string => {
    const v = paket(bakim);
    return hatalar(dogrulaParametreler(v.param, v.icerik)).join("\n");
  };
  const icerik = (bakim: unknown, duzenle?: (v: ReturnType<typeof miniVeriyiYukle>) => void): { hata: string; uyari: string } => {
    const v = paket(bakim);
    duzenle?.(v);
    const r = dogrulaPerakende(v);
    return { hata: r.gecerli ? "" : r.hatalar.join("\n"), uyari: r.uyarilar.join("\n") };
  };

  it("blok yok, boş blok ve kimlik değerleri geçerli (no-op)", () => {
    // G7-4: gerçek parametreler.json artık bakım değerlerini taşır (500 000 / 250 000 / yuzey_cevher + hidro_santrali 200 000); "blok yok" kurgusu testin kendisinde kurulur.
    const v = miniVeriyiYukle();
    expect(v.param.mulk?.bakim).toEqual({ asinmaHizCarpaniPpm: 500_000, asinmaVerimKaybiTavaniPpm: 250_000, yontemParcaPpm: { yuzey_cevher: 200_000, hidro_santrali: 200_000 } });
    expect(prm(v.param.mulk?.bakim)).toBe(""); // gerçek değerler V18/V19'dan geçer
    delete v.param.mulk!.bakim;
    expect(v.param.mulk?.bakim).toBeUndefined();
    expect(prm(undefined)).toBe("");
    expect(prm({})).toBe("");
    expect(prm({ asinmaHizCarpaniPpm: 1_000_000, asinmaVerimKaybiTavaniPpm: 400_000, yontemParcaPpm: {} })).toBe("");
    expect(icerik({}).hata).toBe("");
  });

  it("V18 aralıklar: çarpan (0, 2 000 000]; tavan [0, 1 000 000]; parça çarpanı (0, 2 000 000]; her ret için geçerli karşıt değer", () => {
    expect(prm({ asinmaHizCarpaniPpm: 500_000, asinmaVerimKaybiTavaniPpm: 250_000, yontemParcaPpm: { yuzey_cevher: 200_000 } })).toBe("");
    expect(prm({ asinmaHizCarpaniPpm: 2_000_000 })).toBe(""); // üst sınır dahil
    expect(prm({ asinmaVerimKaybiTavaniPpm: 0 })).toBe("");
    expect(prm({ asinmaVerimKaybiTavaniPpm: 1_000_000 })).toBe("");
    expect(prm({ asinmaHizCarpaniPpm: 0 })).not.toBe("");
    expect(prm({ asinmaHizCarpaniPpm: 2_000_001 })).toContain("en fazla 2000000");
    expect(prm({ asinmaVerimKaybiTavaniPpm: 1_000_001 })).not.toBe("");
    expect(prm({ asinmaVerimKaybiTavaniPpm: -1 })).not.toBe("");
    expect(prm({ yontemParcaPpm: { yuzey_cevher: 0 } })).not.toBe("");
    expect(prm({ yontemParcaPpm: { yuzey_cevher: 2_000_001 } })).toContain("en fazla 2000000");
    expect(prm({ asinmaHizCarpaniPpm: 0.5 })).toContain("tamsayi");
    expect(prm({ bilinmeyen: 1 })).not.toBe(""); // .strict()
  });

  it("V18 türev sınır: çarpılmış aşınma değeri sanayi şemasının sınırını aşamaz (sanayi.bakim değerleri bugünkü: +20000, 0, -15000; kıtlık 20000)", () => {
    expect(prm({ asinmaHizCarpaniPpm: 50_000_000 })).not.toBe(""); // şema üst sınırı (zaten)
    const v = paket({ asinmaHizCarpaniPpm: 2_000_000 });
    expect(hatalar(dogrulaParametreler(v.param, v.icerik))).toEqual([]); // 20000 x 2 = 40000: sınır içinde
    const w = paket({ asinmaHizCarpaniPpm: 2_000_000 });
    w.param.sanayi!.bakim.duzeyler[0]!.asinmaPpmGun = 900_000; // x2 = 1 800 000 > 1 000 000
    expect(hatalar(dogrulaParametreler(w.param, w.icerik)).join("\n")).toContain("mulk.bakim.asinmaHizCarpaniPpm: sanayi.bakim.duzeyler[0].asinmaPpmGun (900000) carpanla 1800000 olur");
    const z = paket({ asinmaHizCarpaniPpm: 1_000_000 });
    z.param.sanayi!.bakim.duzeyler[0]!.asinmaPpmGun = 900_000; // çarpan 1: aynı değer sınır içinde
    expect(hatalar(dogrulaParametreler(z.param, z.icerik))).toEqual([]);
  });

  it("V19: yontemParcaPpm anahtarı içerik yöntemi olmalı; bakım girdisi boş yöntem ölü ayar; miktar 0'a inmemeli (1000 x 0,2 = 200 ve 2000 x 0,2 = 400 geçer)", () => {
    expect(icerik({ yontemParcaPpm: { yuzey_cevher: 200_000, hidro_santrali: 200_000 } }).hata).toBe("");
    expect(icerik({ yontemParcaPpm: { olmayan_yontem: 200_000 } }).hata).toBe("mulk.bakim.yontemParcaPpm: bilinmeyen yontem: olmayan_yontem");
    // bakım girdisi boş yöntem (bellekte: bakim = {})
    expect(icerik({ yontemParcaPpm: { standart_gida_isleme: 200_000 } }, (v) => (v.icerik.yontemler.find((y) => y.id === "standart_gida_isleme")!.bakim = {})).hata).toBe("mulk.bakim.yontemParcaPpm: bakim bos: standart_gida_isleme");
    const bakimli = miniVeriyiYukle().icerik.yontemler.find((y) => Object.keys(y.bakim).length > 0)!;
    const en = Math.min(...Object.values(bakimli.bakim));
    const sinir = Math.ceil(1_000_000 / en); // en küçük miktar çarpandan sonra tam 1 kalır
    expect(icerik({ yontemParcaPpm: { [bakimli.id]: sinir } }).hata).toBe("");
    expect(icerik({ yontemParcaPpm: { [bakimli.id]: sinir - 1 } }).hata).toBe(`mulk.bakim.yontemParcaPpm: miktar 0'a iner: ${bakimli.id}`);
  });

  it("V19 uyarı: sanayi parametresi yoksa aşınma ayarları ölü ayardır (hata değil); yontemParcaPpm uyarı üretmez", () => {
    const v = paket({ asinmaHizCarpaniPpm: 500_000, asinmaVerimKaybiTavaniPpm: 250_000 });
    delete (v.param as { sanayi?: unknown }).sanayi;
    const r = dogrulaPerakende(v);
    expect(r.uyarilar.join("\n")).toContain("mulk.bakim: sanayi parametresi yok");
    const w = paket({ yontemParcaPpm: { yuzey_cevher: 200_000 } });
    delete (w.param as { sanayi?: unknown }).sanayi;
    expect(dogrulaPerakende(w).uyarilar.join("\n")).not.toContain("mulk.bakim: sanayi");
  });
});

describe("V20: mulk.hucreFiyati.{kirsal, kasaba, sehir} > 0 (para sızıntısı taraması B8)", () => {
  const sinifler = ["kirsal", "kasaba", "sehir"] as const;

  it("gerçek parametreler geçer; her sınıf için 0 ve negatif değer `mulk.hucreFiyati.<sinif>: 0'dan buyuk olmali` hatası verir; 1 (en küçük pozitif) geçer; kesirli ret", () => {
    const v = miniVeriyiYukle();
    expect(dogrulaParametreler(v.param, v.icerik)).toEqual({ gecerli: true });
    for (const s of sinifler) {
      for (const kotu of [0, -1, -1_000_000]) {
        const p = kopya(v.param);
        p.mulk!.hucreFiyati[s] = kotu;
        const r = hatalar(dogrulaParametreler(p, v.icerik));
        expect(r.some((x) => x.includes(`mulk.hucreFiyati.${s}`) && x.includes("0'dan buyuk olmali")), `${s}=${kotu}: ${r.join(" | ")}`).toBe(true);
      }
      const q = kopya(v.param);
      q.mulk!.hucreFiyati[s] = 1;
      expect(dogrulaParametreler(q, v.icerik)).toEqual({ gecerli: true }); // karşıt kontrol: pozitif geçer
      const k = kopya(v.param);
      k.mulk!.hucreFiyati[s] = 1.5;
      expect(dogrulaParametreler(k, v.icerik).gecerli).toBe(false);
    }
  });

  it("birleşik denetim: tüm sınıfları 0 yapan parametre üç ayrı hata verir (sıfır fiyat = bedava arsa)", () => {
    const v = miniVeriyiYukle();
    const p = kopya(v.param);
    p.mulk!.hucreFiyati = { kirsal: 0, kasaba: 0, sehir: 0 };
    const r = hatalar(dogrulaParametreler(p, v.icerik)).filter((x) => x.includes("hucreFiyati"));
    expect(r).toHaveLength(3);
  });
});

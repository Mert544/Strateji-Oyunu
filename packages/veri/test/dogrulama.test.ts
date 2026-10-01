import { describe, expect, it } from "vitest";
import {
  dogrulaHarita,
  dogrulaIcerik,
  dogrulaParametreler,
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

  it("varsayılan olmayan ve teknoloji şartsız yöntemde geçerli; alan yokken bugünkü içerik aynen geçerli", () => {
    const v = kopya(varsayilanVeriyiYukle());
    expect(v.icerik.yontemler.some((y) => y.mulkKipi !== undefined)).toBe(false);
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

  it("alanlar yokken bugünkü parametreler geçerli; sebeke ve gecersizKilma eklenince geçerli", () => {
    const { v, p } = mulkParam();
    expect(p.mulk?.sebeke).toBeUndefined();
    expect(p.mulk?.yontemGecersizKilma).toBeUndefined();
    expect(dogrulaParametreler(p, v.icerik)).toEqual({ gecerli: true });
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

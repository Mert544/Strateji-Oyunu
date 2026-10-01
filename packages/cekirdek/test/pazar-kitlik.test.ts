/**
 * Kıtlık cezası (B3, P4): temel ihtiyaç karşılanması (gıda, yakıt, hane elektriği) düşünce kademeli üretim cezası (en çok %30).
 * Kademe eşikleri, ceza çarpanı, toparlanma ataleti (24 saatte bir kademe), şebekesiz bölge muafiyeti, uykuda donma.
 */
import { describe, expect, it } from "vitest";
import { cezaCarpani } from "../src/sanayi/carpan";
import { sanayiTablosu } from "../src/sanayi/tablo";
import { kitlikCarpani, kitlikCezasiPpm, kitlikHedefKademesi, kitlikTik, pazarTablosu, temelKarsilanmaHesapla } from "../src/pazar";
import { PPM, SAAT } from "../src/tipler";
import { malNo, saatKos } from "./ekonomi-yardimci";
import { kurPazar, bolge } from "./pazar-yardimci";
import { sanayiAc } from "./yenilikler";
import { tesisEkle } from "./sanayi-yardimci";

const IZOLE = { oyuncular: { a: ["m_gecit"], b: ["m_col"] } };

describe("kademe eşikleri ve ceza (varsayılan: 900000 / 700000 / 500000 -> %0 / %5 / %15 / %30)", () => {
  const { s } = kurPazar();
  const k = pazarTablosu(s.ic)!.p.kitlik;

  it("karşılanma sınırlarında kademe", () => {
    const tablo: Array<[number, 0 | 1 | 2 | 3]> = [
      [1_000_000, 0], [900_000, 0], [899_999, 1], [700_000, 1], [699_999, 2], [500_000, 2], [499_999, 3], [0, 3],
    ];
    for (const [karsilanma, kademe] of tablo) expect(kitlikHedefKademesi(k, karsilanma)).toBe(kademe);
  });

  it("ceza kademe 0..3 için 0 / 50000 / 150000 / 300000; en çok %30", () => {
    expect([0, 1, 2, 3].map((x) => kitlikCezasiPpm(k, x as 0 | 1 | 2 | 3))).toEqual([0, 50_000, 150_000, 300_000]);
    expect(Math.max(...k.cezaPpm)).toBeLessThanOrEqual(300_000);
  });

  it("temel karşılanma = min(gıda, yakıt, hane elektriği); yakıt ve elektrik yoksa (null) sayılmaz", () => {
    expect(temelKarsilanmaHesapla(800_000, 600_000, 900_000)).toBe(600_000);
    expect(temelKarsilanmaHesapla(800_000, null, null)).toBe(800_000);
    expect(temelKarsilanmaHesapla(1_000_000, 1_000_000, 300_000)).toBe(300_000);
  });

  it("kıtlık çıktı çarpanı PPM - ceza; kademe 0 veya pazar kapalıyken PPM", () => {
    const { s: a } = kurPazar();
    const b = bolge(a, "m_gecit");
    for (const [kademe, beklenen] of [[0, PPM], [1, 950_000], [2, 850_000], [3, 700_000]] as const) {
      b.kitlikKademesi = kademe;
      expect(kitlikCarpani(a.ic, b)).toBe(beklenen);
    }
    const { s: kapali } = kurPazar({ duzenle: (v) => { for (const x of ["makasPpm"] as const) delete v.param.pazar[x]; } });
    const bk = bolge(kapali, "m_gecit");
    expect(bk.kitlikKademesi).toBeUndefined();
    expect(kitlikCarpani(kapali.ic, bk)).toBe(PPM);
  });
});

describe("toparlanma ataleti: kötüleşme anında, iyileşme 24 saatte bir kademe", () => {
  it("kademe 3'e anında çıkar; temel ihtiyaç düzelince 24 saatte bir kademe düşer (72 saatte 0)", () => {
    const { s } = kurPazar();
    const b = bolge(s, "m_ova"); // sahipli (a)
    const d = s.dunya;
    const gec = (saat: number): void => {
      d.zaman += saat * SAAT;
      kitlikTik(d, s.baglam);
    };
    d.zaman = 10 * SAAT;
    b.temelKarsilanmaPpm = 300_000;
    kitlikTik(d, s.baglam);
    expect(b.kitlikKademesi).toBe(3);
    expect(b.kitlikT).toBe(10 * SAAT);
    b.temelKarsilanmaPpm = PPM; // tamamen düzeldi
    gec(1);
    expect(b.kitlikKademesi).toBe(3); // 1 saat: henüz değil
    gec(22);
    expect(b.kitlikKademesi).toBe(3); // 23 saat
    gec(1); // 24. saat
    expect(b.kitlikKademesi).toBe(2);
    gec(23);
    expect(b.kitlikKademesi).toBe(2);
    gec(1);
    expect(b.kitlikKademesi).toBe(1);
    gec(24);
    expect(b.kitlikKademesi).toBe(0);
    gec(24);
    expect(b.kitlikKademesi).toBe(0);
  });

  it("iyileşme sürerken yeniden kötüleşirse anında yükselir ve sayaç sıfırlanır", () => {
    const { s } = kurPazar();
    const b = bolge(s, "m_ova");
    const d = s.dunya;
    d.zaman = 5 * SAAT;
    b.temelKarsilanmaPpm = 600_000; // kademe 2 (< 700000)
    kitlikTik(d, s.baglam);
    expect(b.kitlikKademesi).toBe(2);
    d.zaman += 30 * SAAT;
    b.temelKarsilanmaPpm = PPM;
    kitlikTik(d, s.baglam);
    expect(b.kitlikKademesi).toBe(1);
    d.zaman += 2 * SAAT;
    b.temelKarsilanmaPpm = 100_000;
    kitlikTik(d, s.baglam);
    expect(b.kitlikKademesi).toBe(3);
    expect(b.kitlikT).toBe(d.zaman);
  });

  it("kademe en çok 3'tür (karşılanma 0 olsa da)", () => {
    const { s } = kurPazar();
    const b = bolge(s, "m_ova");
    b.temelKarsilanmaPpm = 0;
    for (let i = 1; i <= 100; i++) {
      s.dunya.zaman = i * SAAT;
      kitlikTik(s.dunya, s.baglam);
      expect(b.kitlikKademesi).toBeLessThanOrEqual(3);
    }
    expect(b.kitlikKademesi).toBe(3);
  });

  it("sahipsiz (uykudaki) bölgede kademe ve sayaç donar", () => {
    const { s } = kurPazar(IZOLE);
    const sahipsiz = bolge(s, "m_ova");
    expect(sahipsiz.sahip).toBeNull();
    sahipsiz.temelKarsilanmaPpm = 0;
    s.dunya.zaman = 50 * SAAT;
    kitlikTik(s.dunya, s.baglam);
    expect(sahipsiz.kitlikKademesi).toBe(0);
    expect(sahipsiz.kitlikT).toBe(0);
  });
});

describe("kıtlık simülasyonda: gıda tükenince ceza ve üretim çarpanı", () => {
  /** Yalıtılmış m_gecit (kömür ocağı): gıda stoğu sıfır, hiçbir yerden gelmez -> gıda karşılanma 0. */
  function gidasiz(ceza: [number, number, number] | null) {
    const { s } = kurPazar({
      ...IZOLE,
      duzenle: (v) => {
        if (ceza !== null) v.param.pazar.kitlik!.cezaPpm = ceza;
        v.param.baslangic.stok["gida"] = 0;
      },
    });
    return s;
  }

  it("gıda 0 iken kademe 3'e çıkar ve kömür üretimi %70'e düşer; ceza kapalı dünyayla oran 0,70", () => {
    const ceza = gidasiz(null);
    const notr = gidasiz([0, 0, 0]);
    saatKos(ceza, 6);
    saatKos(notr, 6);
    const b = bolge(ceza, "m_gecit");
    expect(b.gidaKarsilanmaPpm).toBe(0);
    expect(b.temelKarsilanmaPpm).toBe(0);
    expect(b.kitlikKademesi).toBe(3);
    const komur = malNo(ceza, "komur");
    const oran = bolge(ceza, "m_gecit").uretimOrani[komur]!;
    const referans = bolge(notr, "m_gecit").uretimOrani[komur]!;
    expect(referans).toBeGreaterThan(0);
    expect(Math.abs(oran / referans - 0.7)).toBeLessThan(0.005);
  });

  it("kademe 1 ve 2 çıktıyı %95 ve %85'e düşürür (kademe elle kurulur, toparlanma 24 saate kadar tutar)", () => {
    const referans = gidasiz([0, 0, 0]);
    saatKos(referans, 3);
    const komur = malNo(referans, "komur");
    const r0 = bolge(referans, "m_gecit").uretimOrani[komur]!;
    for (const [kademe, beklenen] of [[0, 1], [1, 0.95], [2, 0.85], [3, 0.7]] as const) {
      const { s } = kurPazar({ ...IZOLE, duzenle: (v) => { v.param.baslangic.stok["gida"] = 10_000_000; } });
      const b = bolge(s, "m_gecit");
      b.kitlikKademesi = kademe;
      b.kitlikT = 0;
      saatKos(s, 3); // gıda bol: hedef 0 ama toparlanma 24 saat sürer
      expect(b.kitlikKademesi).toBe(kademe);
      const oran = b.uretimOrani[komur]!;
      expect(Math.abs(oran / r0 - beklenen)).toBeLessThan(0.01);
    }
  });

  it("gıda gelince (ithalat) kıtlık biter: kademe 72 saatte 0'a iner", () => {
    const { s } = kurPazar({ ...IZOLE });
    // Gıda stoğu eklenince (ithalat ya da üretim eşdeğeri) temel ihtiyaç karşılanır; kademe 24 saatte bir düşer.
    const b = bolge(s, "m_gecit");
    b.kitlikKademesi = 3;
    b.kitlikT = 0;
    const gida = malNo(s, "gida");
    b.stoklar[gida]!.miktar = 50_000_000 > b.stoklar[gida]!.kapasite ? b.stoklar[gida]!.kapasite : 50_000_000;
    saatKos(s, 80);
    expect(b.kitlikKademesi).toBe(0);
  });
});

describe("elektrik: şebekesiz bölge muaf, santrali olup elektriği kesilen bölge kıtlık yaşar", () => {
  function kurSanayiPazar(santral: boolean) {
    return kurPazar({
      ...IZOLE,
      duzenle: (v) => {
        sanayiAc(v);
        if (santral) tesisEkle(v, "m_gecit", "santral");
      },
    });
  }

  it("santrali olmayan bölgede hane elektriği 0 karşılansa da temel karşılanma 1 (muaf)", () => {
    const { s } = kurSanayiPazar(false);
    saatKos(s, 3);
    const b = bolge(s, "m_gecit");
    expect(b.elektrik!.haneKarsilanmaPpm).toBe(0);
    expect(b.temelKarsilanmaPpm).toBe(PPM);
    expect(b.kitlikKademesi).toBe(0);
  });

  it("santrali var ama yakıtı yok: hane elektriği kesilir, temel karşılanma 0, kademe 3", () => {
    const { s } = kurSanayiPazar(true);
    // Santralin yakıtı (kömür) kesilir: yöntem kömürlü; bölgede kömür ocağı var -> yakıt sorunu yok; ocağı ve stoğu kapat.
    const b = bolge(s, "m_gecit");
    for (const t of b.tesisler) if (s.ic.tesisTurleri[t.tur]!.id === "komur_ocagi") t.aktif = false;
    b.stoklar[malNo(s, "komur")]!.miktar = 0;
    saatKos(s, 6);
    expect(b.elektrik!.haneKarsilanmaPpm).toBe(0);
    expect(b.temelKarsilanmaPpm).toBe(0);
    expect(b.kitlikKademesi).toBe(3);
  });

  it("santral elektrik kapasitesi kıtlık cezasından etkilenmez (sarmal yok): ceza çarpanı yalnız aşınma uygular", () => {
    const { s } = kurSanayiPazar(true);
    const sn = sanayiTablosu(s.ic)!;
    const b = bolge(s, "m_gecit");
    const ts = b.tesisler.find((t) => s.ic.tesisTurleri[t.tur]!.id === "santral")!;
    ts.asinmaPpm = 500_000;
    expect(cezaCarpani(sn, ts)).toBe(PPM - 200_000); // aşınma %50 x %40 = %20
  });

  it("birleşik ceza tabanı: max(uretimTabani, aşınma x kıtlık)", () => {
    const { s } = kurSanayiPazar(true);
    const sn = sanayiTablosu(s.ic)!;
    const ts = bolge(s, "m_gecit").tesisler[0]!;
    ts.asinmaPpm = 1_000_000; // -%40 -> 600000
    expect(cezaCarpani(sn, ts, 700_000)).toBe(sn.p.uretimTabaniPpm > 420_000 ? sn.p.uretimTabaniPpm : 420_000);
    expect(cezaCarpani(sn, ts, 700_000)).toBeGreaterThanOrEqual(sn.p.uretimTabaniPpm);
  });
});

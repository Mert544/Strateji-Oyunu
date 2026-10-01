/**
 * Sanayi (B2) S1: elektrik malı, santral, brownout, hane önceliği; depolanamaz/taşınamaz invariantı;
 * gübre fabrikası ve sulama pompasının elektrik bağı.
 */
import { describe, expect, it } from "vitest";
import { elektrikDagit } from "../src/sanayi/elektrik";
import { akarsuCarpani, sanayiTablosu } from "../src/sanayi/tablo";
import { GUN, PPM, SAAT } from "../src/tipler";
import { bolge, malNo, saatKos, simdiyiIsle, stok, ver, verTamam } from "./ekonomi-yardimci";
import { kurSanayi, santralKapasitesi, tesisBul } from "./sanayi-yardimci";

describe("elektrikDagit (saf fonksiyon)", () => {
  it("arz talebi karşılıyorsa karşılanma PPM; santral yükü talebi izler", () => {
    // kapasite 100, iletim kaybı %5 -> teslim 95; talep: tesis 40 + hane 10 = 50
    const e = elektrikDagit(100_000, 40_000, 10_000, 50_000, false);
    expect(e.tesisKarsilanmaPpm).toBe(PPM);
    expect(e.haneKarsilanmaPpm).toBe(PPM);
    // yük = ceil(ceil(50 / 0,95) / 100)
    expect(e.yukPpm).toBeGreaterThanOrEqual(Math.floor((50_000 * PPM) / (95_000 * 1.0) * 0.9));
    expect(e.yukPpm).toBeLessThan(PPM);
    // üretilen, iletim kaybından sonra talebi tam karşılar (yuvarlama payı 1 mili-birim)
    expect(Math.floor((e.uretim * (PPM - 50_000)) / PPM)).toBeGreaterThanOrEqual(50_000 - 2);
  });

  it("talep arzı aşınca ortak oran: hane ve tesis aynı oranda yavaşlar; yük PPM", () => {
    const e = elektrikDagit(100_000, 120_000, 30_000, 50_000, false);
    // teslim 95 000, talep 150 000
    expect(e.tesisKarsilanmaPpm).toBe(Math.floor((95_000 * PPM) / 150_000));
    expect(e.haneKarsilanmaPpm).toBe(e.tesisKarsilanmaPpm);
    expect(e.yukPpm).toBe(PPM);
  });

  it("hane önceliği: önce hane tam karşılanır, kalan sanayiye dağılır", () => {
    const e = elektrikDagit(100_000, 120_000, 30_000, 50_000, true);
    expect(e.haneKarsilanmaPpm).toBe(PPM);
    // teslim 95 000 - hane 30 000 = 65 000; sanayi talebi 120 000
    expect(e.tesisKarsilanmaPpm).toBe(Math.floor((65_000 * PPM) / 120_000));
    // arz hanenin altına düşerse hane de oransal
    const f = elektrikDagit(20_000, 120_000, 30_000, 0, true);
    expect(f.haneKarsilanmaPpm).toBe(Math.floor((20_000 * PPM) / 30_000));
    expect(f.tesisKarsilanmaPpm).toBe(0);
  });

  it("santral yok (kapasite 0): talep varsa karşılanma 0, yük 0; talep yoksa karşılanma PPM", () => {
    const e = elektrikDagit(0, 50_000, 10_000, 50_000, false);
    expect(e.tesisKarsilanmaPpm).toBe(0);
    expect(e.yukPpm).toBe(0);
    expect(e.uretim).toBe(0);
    const f = elektrikDagit(100_000, 0, 0, 50_000, false);
    expect(f.tesisKarsilanmaPpm).toBe(PPM);
    expect(f.yukPpm).toBe(0);
  });
});

/** m_sehir: parça + elektronik + mühimmat fabrikası (elektrik girdili) ve bir kömür santrali. */
function sehirKur(opt: { kapasiteMili: number; hane?: boolean; haneOnceligi?: boolean }) {
  return kurSanayi({
    oyuncular: { a: ["m_sehir"], b: ["m_col"] },
    tesisler: { m_sehir: ["santral"] },
    duzenle: (v) => {
      santralKapasitesi(v, opt.kapasiteMili);
      if (opt.hane === false) v.param.nufus.tuketim1000Saat["elektrik"] = 0;
      if (opt.haneOnceligi === true) v.param.sanayi!.haneOnceligi = true;
      // yalnız elektrik kıtlığı: yakıt ve girdiler bol, para lavabosu yok
      v.param.baslangic.hazine = 5_000_000_000;
    },
  });
}

describe("brownout (bölge içi anlık denge)", () => {
  it("yeterli kapasite: karşılanma PPM, tüketici tesisler tam verimle çalışır, santral yükü talebi izler", () => {
    const { s } = sehirKur({ kapasiteMili: 240_000 });
    saatKos(s, 2);
    const b = bolge(s, "m_sehir");
    expect(b.elektrik!.karsilanmaPpm).toBe(PPM);
    expect(b.elektrik!.haneKarsilanmaPpm).toBe(PPM);
    const parca = tesisBul(s, "m_sehir", "parca_fabrikasi");
    expect(parca.verimPpm).toBe(PPM);
    // talep = tesisler (parça 12k + elektronik 30k + muhimmat 15k) + hane 250 x 150
    // hane nüfusu saatlik büyür: 250 000 kişi ile birkaç yüz kişi fark
    const hane = b.elektrik!.talepMili - (12_000 + 30_000 + 15_000);
    expect(hane).toBeGreaterThanOrEqual(250 * 150);
    expect(hane).toBeLessThan(260 * 150);
    expect(hane).toBe(Math.floor((b.nufus * 150) / 1000));
    const santral = tesisBul(s, "m_sehir", "santral");
    expect(santral.verimPpm).toBe(b.elektrik!.yukPpm);
    expect(b.elektrik!.yukPpm).toBeLessThan(PPM / 2);
  });

  it("talep arzı aşınca tüm elektrik girdili tesisler AYNI oranda yavaşlar (orantılı brownout)", () => {
    // kapasite 60 000 -> teslim 57 000; talep 94 500 -> karşılanma = floor(57 000 / 94 500)
    const { s } = sehirKur({ kapasiteMili: 60_000 });
    saatKos(s, 2);
    const b = bolge(s, "m_sehir");
    // teslim = 60 000 x %95; talep, hane nüfusu büyüdüğü için durumdan okunur
    const beklenen = Math.floor((57_000 * PPM) / b.elektrik!.talepMili);
    expect(b.elektrik!.talepMili).toBeGreaterThanOrEqual(94_500);
    expect(b.elektrik!.karsilanmaPpm).toBe(beklenen);
    expect(b.elektrik!.haneKarsilanmaPpm).toBe(beklenen);
    expect(b.elektrik!.yukPpm).toBe(PPM);
    for (const tur of ["parca_fabrikasi", "elektronik_fabrikasi", "muhimmat_fabrikasi"]) {
      expect(Math.abs(tesisBul(s, "m_sehir", tur).verimPpm - beklenen)).toBeLessThanOrEqual(1);
    }
    // çıktı da orantılı: parça üretimi tam verimin ~%60,3'ü (girdiler bol)
    const parca = malNo(s, "parca");
    expect(Math.abs(b.uretimOrani[parca]! - Math.floor((40_000 * beklenen) / PPM))).toBeLessThanOrEqual(2);
  });

  it("hane önceliği: hane tam karşılanır, sanayi kalanla orantılı yavaşlar", () => {
    const { s } = sehirKur({ kapasiteMili: 60_000, haneOnceligi: true });
    saatKos(s, 2);
    const b = bolge(s, "m_sehir");
    // teslim 57 000; hane (nüfus x 150 / 1000) tam; kalan sanayiye (talep 57 000)
    const hane = Math.floor((b.nufus * 150) / 1000);
    expect(b.elektrik!.haneKarsilanmaPpm).toBe(PPM);
    expect(Math.abs(b.elektrik!.karsilanmaPpm - Math.floor(((57_000 - hane) * PPM) / 57_000))).toBeLessThanOrEqual(2);
    expect(Math.abs(tesisBul(s, "m_sehir", "elektronik_fabrikasi").verimPpm - b.elektrik!.karsilanmaPpm)).toBeLessThanOrEqual(1);
  });

  it("santral olmayan bölgede elektrik girdili tesis durur; santral kurulunca çalışır", () => {
    const { s } = kurSanayi({ oyuncular: { a: ["m_sehir"], b: ["m_col"] }, duzenle: (v) => { v.param.baslangic.hazine = 5_000_000_000; } });
    saatKos(s, 2);
    expect(bolge(s, "m_sehir").elektrik!.karsilanmaPpm).toBe(0);
    expect(tesisBul(s, "m_sehir", "parca_fabrikasi").verimPpm).toBe(0);
    expect(bolge(s, "m_sehir").uretimOrani[malNo(s, "parca")]).toBe(0);
    verTamam(s, "a", { tur: "tesis_insa", bolge: "m_sehir", tesisTuru: "santral" });
    saatKos(s, 9); // 8 saatlik inşaat
    expect(bolge(s, "m_sehir").elektrik!.karsilanmaPpm).toBe(PPM);
    expect(tesisBul(s, "m_sehir", "parca_fabrikasi").verimPpm).toBe(PPM);
  });

  it("santral yakıtı bitince kapasite düşer: brownout yakıt kıtlığından da doğar", () => {
    const { s } = kurSanayi({
      oyuncular: { a: ["m_sehir"], b: ["m_col"] },
      tesisler: { m_sehir: ["santral"] },
      doldur: false,
      duzenle: (v) => {
        v.param.baslangic.hazine = 5_000_000_000;
        for (const m of ["celik", "yakit", "bakir", "silis", "parca"]) v.param.baslangic.stok[m] = 10_000_000;
        v.param.baslangic.stok["komur"] = 0; // santral yakıtsız
      },
    });
    saatKos(s, 3);
    const b = bolge(s, "m_sehir");
    expect(tesisBul(s, "m_sehir", "santral").verimPpm).toBe(0);
    expect(b.elektrik!.uretimMili).toBe(0);
    expect(b.elektrik!.karsilanmaPpm).toBe(0);
  });
});

describe("elektrik: depolanamaz ve taşınamaz (invariant)", () => {
  it("stok hiç birikmez, ticaret emri ve lojistik akışı olmaz, kümülatif üretim kaydı tutulmaz", () => {
    const { s } = kurSanayi({ tesisler: { m_sehir: ["santral"], m_dag: ["hidro_santrali"], m_liman: ["santral"] } });
    const e = malNo(s, "elektrik");
    for (let g = 1; g <= 3; g++) {
      s.calistirKadar(g * GUN);
      for (const b of s.dunya.bolgeler) {
        expect(stok(s, b.id, "elektrik")).toBe(0);
        expect(b.stoklar[e]!.yerelOran).toBe(0);
        expect(b.stoklar[e]!.gelenOran).toBe(0);
        expect(b.uretimToplam[e]).toBe(0);
        expect(b.israf[e]).toBe(0);
      }
      for (const a of s.dunya.lojistik.akislar) expect(a.mal).not.toBe(e);
    }
    const r = ver(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "elektrik", yon: "ihracat", oranSaat: 10_000 });
    expect(r.tamam).toBe(false);
    expect(ver(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "elektrik", yon: "ithalat", oranSaat: 10_000 }).tamam).toBe(false);
    // fiyat sabit (pazarda işlem görmez)
    expect(s.dunya.pazar.fiyat[e]).toBe(s.ic.mallar[e]!.tabanFiyat);
  });

  it("elektrik bölgeler arası geçmez: komşu bölgenin santrali diğer bölgeyi beslemez", () => {
    const { s } = kurSanayi({ oyuncular: { a: ["m_sehir", "m_dag"], b: ["m_col"] }, tesisler: { m_dag: ["santral"] } });
    saatKos(s, 3);
    expect(bolge(s, "m_dag").elektrik!.uretimMili).toBeGreaterThan(0);
    expect(bolge(s, "m_sehir").elektrik!.uretimMili).toBe(0);
    expect(bolge(s, "m_sehir").elektrik!.karsilanmaPpm).toBe(0);
  });
});

describe("hidro santral ve akarsu eğrisi", () => {
  /** Aşınma kapalı, hane talebi çok büyük (kapasite hep sınırlayıcı): üretim = 300 000 x akarsu. */
  function hidroKur(tarim: boolean) {
    return kurSanayi({
      oyuncular: { a: ["m_dag"], b: ["m_col"] },
      tesisler: { m_dag: ["hidro_santrali"] },
      tarim,
      duzenle: (v) => {
        v.param.nufus.tuketim1000Saat["elektrik"] = 5_000_000;
        v.param.baslangic.hazine = 5_000_000_000;
        v.param.sanayi!.bakim.kitlikAsinmaPpmGun = 0;
        v.param.sanayi!.bakim.duzeyler[0]!.asinmaPpmGun = 0;
      },
    });
  }

  it("tarım takvimi açıkken hidro üretimi akarsu eğrisini izler (bahar tepesi, güz dibi); kapalıyken mevsim yok", () => {
    const { s } = hidroKur(true);
    const sn = sanayiTablosu(s.ic)!;
    const olc = (t: number) => {
      s.calistirKadar(t);
      const u = bolge(s, "m_dag").elektrik!.uretimMili;
      expect(u).toBe(Math.floor((300_000 * akarsuCarpani(sn, s.ic, s.dunya.zaman)) / PPM));
      return u;
    };
    const ekim = olc(2 * GUN + 5 * SAAT);
    const mayis = olc(215 * GUN + 5 * SAAT);
    expect(ekim).toBeGreaterThan(100_000);
    expect(mayis).toBeGreaterThan(ekim * 3);
    const { s: k } = hidroKur(false);
    k.calistirKadar(2 * GUN + 5 * SAAT);
    const k1 = bolge(k, "m_dag").elektrik!.uretimMili;
    k.calistirKadar(215 * GUN + 5 * SAAT);
    expect(k1).toBe(300_000);
    expect(bolge(k, "m_dag").elektrik!.uretimMili).toBe(300_000);
  });

  it("akarsu günlük eğrisinin yıllık ortalaması tam PPM'dir", () => {
    const { s } = hidroKur(true);
    const sn = sanayiTablosu(s.ic)!;
    expect(sn.akarsuGunluk).toHaveLength(365);
    expect(sn.akarsuGunluk.reduce((t, x) => t + x, 0)).toBe(365 * PPM);
    expect(Math.max(...sn.akarsuGunluk)).toBeGreaterThan(2 * PPM);
    expect(Math.min(...sn.akarsuGunluk)).toBeLessThan(0.6 * PPM);
  });

  it("hidro yalnız dağ etiketli bölgede inşa edilir", () => {
    const { s } = kurSanayi();
    expect(ver(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "hidro_santrali" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_insa", bolge: "m_dag", tesisTuru: "hidro_santrali" }).tamam).toBe(true);
  });
});

describe("elektrik bağlı içerik (gübre fabrikası, sulama pompası)", () => {
  it("gübre fabrikası ve sulama pompası elektrik ister (içerik)", () => {
    const { s } = kurSanayi();
    const gubre = s.ic.yontemler[s.ic.yontemIndeks["azotlu_gubre"]!]!;
    expect(gubre.girdiler["elektrik"]).toBe(15_000);
    const pompa = s.ic.yontemler[s.ic.yontemIndeks["sulama_pompasi"]!]!;
    expect(pompa.girdiler["elektrik"]).toBe(8_000);
    expect(pompa.girdiler["yakit"]).toBeUndefined();
  });

  it("gübre üretimi elektrik karşılanmasıyla orantılıdır (santral yok: 0, santral var: tam)", () => {
    const duzen = (santral: boolean) =>
      kurSanayi({
        oyuncular: { a: ["m_liman"], b: ["m_col"] },
        tesisler: { m_liman: santral ? ["gubre_fabrikasi", "santral"] : ["gubre_fabrikasi"] },
        duzenle: (v) => {
          v.param.baslangic.hazine = 5_000_000_000;
          v.param.baslangic.stok["petrol"] = 10_000_000;
        },
      }).s;
    const yok = duzen(false);
    const var_ = duzen(true);
    yok.calistirKadar(3 * SAAT);
    var_.calistirKadar(3 * SAAT);
    const g = malNo(yok, "gubre");
    expect(bolge(yok, "m_liman").uretimOrani[g]).toBe(0);
    expect(bolge(var_, "m_liman").uretimOrani[g]).toBe(40_000);
  });

  it("sulama pompası elektrik yoksa çalışmaz: sulama düzeyi 0, kuraklık koruması yok", () => {
    const { s } = kurSanayi({
      oyuncular: { a: ["m_sehir"], b: ["m_col"] },
      tesisler: { m_sehir: ["sulama_kanali"] },
      tarim: true,
      duzenle: (v) => {
        v.param.baslangic.hazine = 5_000_000_000;
        // sulama_sistemi teknolojisi test için gerekli değil: tesis başlangıçta kurulu
        const t = v.icerik.tesisTurleri.find((x) => x.id === "sulama_kanali")!;
        delete t.gerekliTeknoloji;
        const tk = v.icerik.teknolojiler.find((x) => x.id === "sulama_sistemi")!;
        tk.acar.tesisTurleri = ["sulama_kanali"];
      },
    });
    s.calistirKadar(2 * GUN);
    expect(tesisBul(s, "m_sehir", "sulama_kanali").verimPpm).toBe(0);
    expect(bolge(s, "m_sehir").tarim!.iklimPpm).toBeLessThanOrEqual(1_300_000);
    simdiyiIsle(s);
  });
});


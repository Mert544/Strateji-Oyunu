import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { dunyaKur } from "../src/kurulum";
import { durumOzeti } from "../src/ozet";
import { prngOlustur } from "../src/prng";
import { SAAT } from "../src/tipler";
import { kucukVeri } from "./fikstur";

describe("icerikDerle", () => {
  it("indeks eslemelerini kurar", () => {
    const ic = icerikDerle(kucukVeri());
    expect(ic.malIndeks).toEqual({ tahil: 0, gida: 1, celik: 2 });
    expect(ic.bolgeIndeks).toEqual({ ova: 0, sehir: 1, dag: 2, gecit: 3 });
    expect(ic.yontemIndeks.gida_isleme).toBe(1);
    expect(ic.tesisTuruIndeks).toEqual({ ciftlik: 0, fabrika: 1 });
    expect(ic.teknolojiIndeks).toEqual({ teknik: 0 });
    expect(ic.birlikIndeks).toEqual({ piyade: 0, zirhli: 1 });
    expect(ic.mallar).toHaveLength(3);
    expect(ic.param.ekonomi.depoKapasitesi).toBe(100_000_000);
    expect(ic.harita.bolgeler).toHaveLength(4);
    expect(ic.icerik.mallar).toBe(ic.mallar);
  });

  it("bilinmeyen kimlikler prototip anahtarlarindan etkilenmez", () => {
    const ic = icerikDerle(kucukVeri());
    expect(ic.malIndeks["constructor"]).toBeUndefined();
    expect(ic.bolgeIndeks["toString"]).toBeUndefined();
  });

  it("lojistikSirasi: lojistikOnceligi artan, esitlikte indeks", () => {
    const ic = icerikDerle(kucukVeri());
    // tahil(2) gida(1) celik(2) -> gida, tahil, celik
    expect(ic.lojistikSirasi).toEqual([1, 0, 2]);
    const v = kucukVeri();
    v.icerik.mallar.forEach((m) => (m.lojistikOnceligi = 5));
    expect(icerikDerle(v).lojistikSirasi).toEqual([0, 1, 2]);
  });

  it("komsuKenarlar: bolge -> artan kenar indeksleri", () => {
    const ic = icerikDerle(kucukVeri());
    expect(ic.komsuKenarlar).toEqual([[0, 3], [0, 1], [1, 2, 3], [2]]);
  });

  it("yinelenen kimlik ve bilinmeyen kenar ucu hata verir", () => {
    const v1 = kucukVeri();
    v1.icerik.mallar.push({ ...v1.icerik.mallar[0]! });
    expect(() => icerikDerle(v1)).toThrow(/mal/);
    const v2 = kucukVeri();
    v2.harita.kenarlar[0]!.b = "yok";
    expect(() => icerikDerle(v2)).toThrow(/kenar/);
  });
});

describe("dunyaKur", () => {
  const ic = icerikDerle(kucukVeri());
  const d = dunyaKur(ic, 77);

  it("temel alanlar", () => {
    expect(d.zaman).toBe(0);
    expect(d.tohum).toBe(77);
    expect(d.kuyruk).toEqual([]);
    expect(d.oyuncular).toEqual([]);
    expect(d.savaslar).toEqual([]);
    expect(d.anlasmalar).toEqual([]);
    expect(d.yaptirimlar).toEqual([]);
    expect(d.insaatlar).toEqual([]);
    expect(d.partiler).toEqual([]);
    expect(d.sayac.olay).toBe(0);
    expect(d.bolgeler).toHaveLength(4);
    expect(d.kenarlar).toHaveLength(4);
  });

  it("bolgeler: stoklar, rezerv, tesisler, birlikler, savunma", () => {
    const ova = d.bolgeler[0]!;
    expect(ova).toMatchObject({
      indeks: 0,
      id: "ova",
      devlet: "d1",
      etiketler: ["ova"],
      sahip: null,
      nufus: 10_000,
      uretimT0: 0,
      savunma: { durus: "normal" },
      ticaretEmirleri: [],
      birlikler: [0, 0],
    });
    expect(ova.stoklar).toHaveLength(3);
    expect(ova.stoklar[0]).toEqual({
      miktar: 1_000_000, yerelOran: 0, gelenOran: 0, t0: 0, artik: 0, kapasite: 100_000_000, surum: 0,
    });
    expect(ova.stoklar.map((s) => s.miktar)).toEqual([1_000_000, 2_000_000, 0]);
    expect(ova.israf).toEqual([0, 0, 0]);
    expect(ova.uretimToplam).toEqual([0, 0, 0]);
    expect(ova.uretimOrani).toEqual([0, 0, 0]);
    expect(ova.rezervIlk).toEqual([500_000_000, 0, 0]);
    expect(ova.rezervKalan).toEqual([500_000_000, 0, 0]);
    expect(ova.rezervKalan).not.toBe(ova.rezervIlk);
    expect(d.bolgeler[2]!.tesisler).toEqual([]);
  });

  it("baslangic tesisleri: ilk yontem, aktif, verim/isci 0, benzersiz kimlik", () => {
    const ova = d.bolgeler[0]!;
    const sehir = d.bolgeler[1]!;
    expect(ova.tesisler).toEqual([{ id: 1, tur: 0, yontem: 0, aktif: true, verimPpm: 0, isciPpm: 0 }]);
    expect(sehir.tesisler).toEqual([{ id: 2, tur: 1, yontem: ic.yontemIndeks["gida_isleme"], aktif: true, verimPpm: 0, isciPpm: 0 }]);
    expect(d.sayac.kimlik).toBe(3);
  });

  it("kenarlar: sureMs = sureSaat * SAAT, bolge indeksleri", () => {
    expect(d.kenarlar[0]).toEqual({
      indeks: 0, a: 0, b: 1, tur: "kara", kapasiteSaat: 100_000, sureMs: 2 * SAAT, kullanilanSaat: 0, askeriKullanilanSaat: 0,
    });
    expect(d.kenarlar[3]).toMatchObject({ a: 0, b: 2, sureMs: 10 * SAAT });
  });

  it("pazar, lojistik ve kapsam", () => {
    expect(d.pazar.fiyat).toEqual([1000, 2000, 5000]);
    expect(d.pazar.oyuncuTalebi).toEqual([0, 0, 0]);
    expect(d.pazar.oyuncuArzi).toEqual([0, 0, 0]);
    expect(d.lojistik).toMatchObject({ akislar: [], kirli: false, cozumPlanli: false, sonCozum: 0, cozumSayisi: 0 });
    expect(d.lojistik.kapsam).toHaveLength(4);
    for (const satir of d.lojistik.kapsam) {
      expect(satir).toHaveLength(3);
      for (const h of satir) expect(h).toEqual({ karsilanmaPpm: 0, enYakinKaynakMs: -1, neden: "yok" });
    }
  });

  it("rng akislari tohumdan turetilir; farkli tohum farkli durum", () => {
    expect(d.rng.ekonomi).toEqual(prngOlustur(77, "ekonomi"));
    expect(d.rng.savas).toEqual(prngOlustur(77, "savas"));
    const d2 = dunyaKur(ic, 78);
    for (const akis of ["ekonomi", "pazar", "savas", "olay"] as const) {
      expect(d2.rng[akis]).not.toEqual(d.rng[akis]);
    }
    expect(d.rng.ekonomi).not.toEqual(d.rng.pazar);
  });

  it("ayni girdi ayni dunya; kurulan dunyalar birbirinden bagimsiz", () => {
    const a = dunyaKur(ic, 5);
    const b = dunyaKur(ic, 5);
    expect(durumOzeti(a)).toBe(durumOzeti(b));
    a.bolgeler[0]!.stoklar[0]!.miktar = 1;
    a.bolgeler[0]!.etiketler.push("kiyi");
    expect(b.bolgeler[0]!.stoklar[0]!.miktar).toBe(1_000_000);
    expect(ic.harita.bolgeler[0]!.etiketler).toEqual(["ova"]);
  });

  it("structuredClone ve JSON ile ayni ozet (duz veri)", () => {
    const x = dunyaKur(ic, 5);
    expect(durumOzeti(structuredClone(x))).toBe(durumOzeti(x));
    expect(durumOzeti(JSON.parse(JSON.stringify(x)))).toBe(durumOzeti(x));
  });

  it("baslangic stoku kapasiteye kelepcelenir; bilinmeyen mal hata verir", () => {
    const v = kucukVeri();
    v.param.ekonomi.depoKapasitesi = 500_000;
    const k = dunyaKur(icerikDerle(v), 1);
    expect(k.bolgeler[0]!.stoklar[1]!.miktar).toBe(500_000);
    const v2 = kucukVeri();
    v2.param.baslangic.stok["yok_mal"] = 5;
    expect(() => dunyaKur(icerikDerle(v2), 1)).toThrow(/yok_mal/);
    const v3 = kucukVeri();
    v3.harita.bolgeler[0]!.rezervler["yok_mal"] = 5;
    expect(() => dunyaKur(icerikDerle(v3), 1)).toThrow(/yok_mal/);
  });
});

/**
 * Sanayi (B2) S4: kirlilik: saatlik emisyon birikimi, günlük sönüm (%3) ve denge, kara komşularına yayılım (%10),
 * tarım çıktısına etki (en çok -%25), uyku (sahipsiz bölge) ve B4 için istikrar cezası alanı.
 */
import { describe, expect, it } from "vitest";
import { kirlilikIstikrarCezasi } from "../src/sanayi/carpan";
import { sanayiTablosu } from "../src/sanayi/tablo";
import { GUN, PPM, SAAT } from "../src/tipler";
import { bolge, malNo, simdiyiIsle } from "./ekonomi-yardimci";
import { hepsiniKapat, kurSanayi } from "./sanayi-yardimci";

/** m_dag: cevher madeni (yuzey_cevher 10 ppm/saat) + çelikhane (yüksek fırın 100) + hidro santral (0): sabit 110 ppm/saat. */
function dagKur(duzenle?: (v: ReturnType<typeof kurSanayi>["veri"]) => void) {
  return kurSanayi({
    oyuncular: { a: ["m_dag"], b: ["m_col"] },
    tesisler: { m_dag: ["hidro_santrali"] },
    duzenle: (v) => {
      const b = v.harita.bolgeler.find((x) => x.id === "m_dag")!;
      b.rezervler["cevher"] = 2_000_000_000_000;
      v.param.baslangic.hazine = 5_000_000_000;
      v.param.sanayi!.bakim.kitlikAsinmaPpmGun = 0;
      duzenle?.(v);
    },
  });
}

describe("emisyon birikimi", () => {
  it("saatlik emisyon = Σ kirlilikPpmSaat x verim x ölçek (23 saatte 23 x 110 ppm)", () => {
    const { s } = dagKur((v) => {
      v.param.sanayi!.kirlilik.azalmaPpmGun = 0;
      v.param.sanayi!.kirlilik.komsuYayilimPpmGun = 0;
    });
    s.calistirKadar(23 * SAAT);
    expect(bolge(s, "m_dag").kirlilikPpm).toBe(23 * 110);
  });

  it("ölçek emisyonu çarpar (M: x2,2)", () => {
    const { s } = dagKur((v) => {
      v.param.sanayi!.kirlilik.azalmaPpmGun = 0;
      v.param.sanayi!.kirlilik.komsuYayilimPpmGun = 0;
    });
    for (const t of bolge(s, "m_dag").tesisler) t.olcek = 1;
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(10 * SAAT);
    // ilk saat verim henüz yazılmamış olabilir: en az 9 emisyon saati, her biri 110 x 2,2 = 242
    expect(bolge(s, "m_dag").kirlilikPpm).toBeGreaterThanOrEqual(9 * 242);
    expect(bolge(s, "m_dag").kirlilikPpm).toBeLessThanOrEqual(10 * 242);
  });

  it("kirlilik PPM'i aşmaz", () => {
    const { s } = dagKur();
    bolge(s, "m_dag").kirlilikPpm = PPM - 50;
    s.calistirKadar(5 * SAAT);
    expect(bolge(s, "m_dag").kirlilikPpm).toBeLessThanOrEqual(PPM);
  });
});

describe("günlük sönüm ve denge", () => {
  it("emisyonsuz bölgede her gün kirliliğin %3'ü azalır (yukarı yuvarlanır)", () => {
    const { s } = dagKur((v) => {
      v.param.sanayi!.kirlilik.komsuYayilimPpmGun = 0;
    });
    hepsiniKapat(s);
    s.baglam.kirlet(s.dunya);
    bolge(s, "m_dag").kirlilikPpm = 500_000;
    let beklenen = 500_000;
    for (let g = 1; g <= 5; g++) {
      s.calistirKadar(g * GUN + SAAT);
      beklenen -= Math.ceil((beklenen * 30_000) / PPM);
      expect(bolge(s, "m_dag").kirlilikPpm).toBe(beklenen);
    }
  });

  it("denge: günlük emisyon e iken kirlilik ~ e / 0,03 değerine oturur", () => {
    // yalnız cevher madeni (10 ppm/saat) + hidro: girdisiz, 250 günde de sabit emisyon
    const { s } = dagKur((v) => {
      v.param.sanayi!.kirlilik.komsuYayilimPpmGun = 0;
      v.harita.bolgeler.find((x) => x.id === "m_dag")!.tesisler = ["cevher_madeni", "hidro_santrali"];
    });
    s.calistirKadar(250 * GUN);
    const e = 10 * 24;
    const denge = e / 0.03; // 8 000
    const k = bolge(s, "m_dag").kirlilikPpm!;
    expect(k).toBeGreaterThan(denge * 0.85);
    expect(k).toBeLessThan(denge * 1.05);
  });
});

describe("komşulara yayılım (kara komşuları, yalnız sahipli bölgeler)", () => {
  it("her gün kirliliğin %10'u sahipli kara komşularına eşit paylaşılır; sahipsiz bölge almaz", () => {
    const { s } = kurSanayi({ oyuncular: { a: ["m_gecit", "m_ova"], b: ["m_col"] } });
    hepsiniKapat(s);
    s.baglam.kirlet(s.dunya);
    bolge(s, "m_gecit").kirlilikPpm = 500_000;
    expect(bolge(s, "m_dag").sahip).toBeNull();
    s.calistirKadar(GUN + SAAT);
    // m_gecit kara komşuları: m_ova (sahipli) ve m_dag (sahipsiz): yalnız m_ova alır: 50 000
    expect(bolge(s, "m_ova").kirlilikPpm).toBe(50_000 - Math.ceil((50_000 * 30_000) / PPM));
    expect(bolge(s, "m_gecit").kirlilikPpm).toBe(450_000 - Math.ceil((450_000 * 30_000) / PPM));
    expect(bolge(s, "m_dag").kirlilikPpm).toBe(0);
  });

  it("iki sahipli komşu eşit pay alır (toplam korunur: yayılım kaybı yok, yalnız sönüm)", () => {
    const { s } = kurSanayi({ oyuncular: { a: ["m_gecit", "m_ova", "m_dag"], b: ["m_col"] } });
    hepsiniKapat(s);
    s.baglam.kirlet(s.dunya);
    bolge(s, "m_gecit").kirlilikPpm = 400_000;
    s.calistirKadar(GUN + SAAT);
    // 40 000 / 2 komşu = 20 000 her biri
    expect(bolge(s, "m_ova").kirlilikPpm).toBe(20_000 - Math.ceil((20_000 * 30_000) / PPM));
    expect(bolge(s, "m_dag").kirlilikPpm).toBe(20_000 - Math.ceil((20_000 * 30_000) / PPM));
  });
});

describe("kirlilik etkileri", () => {
  it("tarımsal çıktı x (1 - kirlilik x %25): %40 kirlilikte -%10", () => {
    const { s } = kurSanayi({
      oyuncular: { a: ["m_ova"], b: ["m_col"] },
      tesisler: { m_ova: ["santral"] },
      tarim: true,
    });
    s.calistirKadar(2 * SAAT);
    const tahil = malNo(s, "tahil");
    const taze = bolge(s, "m_ova").uretimOrani[tahil]!;
    expect(taze).toBeGreaterThan(0);
    bolge(s, "m_ova").kirlilikPpm = 400_000;
    s.baglam.kirlet(s.dunya);
    simdiyiIsle(s);
    const kirli = bolge(s, "m_ova").uretimOrani[tahil]!;
    expect(Math.abs(kirli - Math.floor((taze * 900_000) / PPM))).toBeLessThanOrEqual(5);
    bolge(s, "m_ova").kirlilikPpm = PPM;
    s.baglam.kirlet(s.dunya);
    simdiyiIsle(s);
    expect(Math.abs(bolge(s, "m_ova").uretimOrani[tahil]! - Math.floor((taze * 750_000) / PPM))).toBeLessThanOrEqual(5);
  });

  it("sanayi tarım dışı üretimi (madencilik) kirlilikten etkilenmez", () => {
    const { s } = dagKur();
    s.calistirKadar(2 * SAAT);
    const cevher = malNo(s, "cevher");
    const taze = bolge(s, "m_dag").uretimOrani[cevher]!;
    bolge(s, "m_dag").kirlilikPpm = PPM;
    s.baglam.kirlet(s.dunya);
    simdiyiIsle(s);
    expect(bolge(s, "m_dag").uretimOrani[cevher]).toBe(taze);
  });

  it("B4 için hazır alan: istikrar cezası = kirlilik x %40 (B2'de okunmaz)", () => {
    const { s } = dagKur();
    const sn = sanayiTablosu(s.ic)!;
    bolge(s, "m_dag").kirlilikPpm = 250_000;
    expect(kirlilikIstikrarCezasi(sn, bolge(s, "m_dag"))).toBe(100_000);
    bolge(s, "m_dag").kirlilikPpm = 0;
    expect(kirlilikIstikrarCezasi(sn, bolge(s, "m_dag"))).toBe(0);
  });

  it("sahipsiz bölgede kirlilik donar (uyku): emisyon, sönüm ve yayılım yok", () => {
    const { s } = kurSanayi({ oyuncular: { a: ["m_col"], b: ["m_ova"] } });
    expect(bolge(s, "m_dag").sahip).toBeNull();
    bolge(s, "m_dag").kirlilikPpm = 123_456;
    s.calistirKadar(4 * GUN);
    expect(bolge(s, "m_dag").kirlilikPpm).toBe(123_456);
  });
});

import { describe, expect, it } from "vitest";
import { aralik, prngOlustur } from "../src/prng";
import { Simulasyon } from "../src/motor";
import {
  anlikHazine,
  anlikMiktar,
  hazineEkle,
  hazineOranAyarla,
  hazineUzlastir,
  stokEkle,
  stokEsikMesafesi,
  stokGelenEkle,
  stokOranAyarla,
  stokUzlastir,
  stokUzlastirYerel,
} from "../src/stok";
import { SAAT } from "../src/tipler";
import type { Olay, Stok } from "../src/tipler";
import { kucukVeri } from "./fikstur";

function stok(ust: Partial<Stok> = {}): Stok {
  return { miktar: 1000, yerelOran: 0, gelenOran: 0, t0: 0, artik: 0, kapasite: 1_000_000, surum: 0, ...ust };
}

function yeniSim(): Simulasyon {
  return Simulasyon.olustur(kucukVeri(), 1);
}

/** Kuyruktaki esik olaylari, planlanma sirasina (sira) gore. */
function esikler(s: Simulasyon): Olay[] {
  return s.dunya.kuyruk.filter((o) => o.veri.tur === "esik").sort((a, b) => a.sira - b.sira);
}

/** t, stok icin "anlik ilk kez sinira ulasir" aninin (mutlak ms) ta kendisi olmali. */
function sinirAninda(s: Stok, t: number, sinir: number): void {
  expect(anlikMiktar(s, t)).toBe(sinir);
  expect(anlikMiktar(s, t - 1)).not.toBe(sinir);
}

describe("anlikMiktar", () => {
  it("oran x sure / SAAT kadar birikir ve stogu degistirmez", () => {
    const s = stok({ yerelOran: 3600, gelenOran: 0 });
    const kopya = structuredClone(s);
    expect(anlikMiktar(s, 0)).toBe(1000);
    expect(anlikMiktar(s, SAAT)).toBe(1000 + 3600);
    expect(anlikMiktar(s, SAAT / 2)).toBe(1000 + 1800);
    expect(s).toEqual(kopya);
  });

  it("yerel ve gelen oranlar toplanir", () => {
    const s = stok({ yerelOran: 2000, gelenOran: -500 });
    expect(anlikMiktar(s, 2 * SAAT)).toBe(1000 + 3000);
  });

  it("[0, kapasite] araligina kelepcelenir", () => {
    expect(anlikMiktar(stok({ yerelOran: 1_000_000, kapasite: 5000 }), SAAT)).toBe(5000);
    expect(anlikMiktar(stok({ yerelOran: -1_000_000 }), SAAT)).toBe(0);
  });

  it("negatif oranda floor (asagi) kullanir; artik dikkate alinir", () => {
    // -7 mili/saat, 1 dakika: -7 * 60000 / 3.6e6 = -0.1166 -> floor -1
    expect(anlikMiktar(stok({ yerelOran: -7 }), 60_000)).toBe(999);
    // artik 420000 ile: (-420000 + 420000) / SAAT = 0
    expect(anlikMiktar(stok({ yerelOran: -7, artik: 420_000 }), 60_000)).toBe(1000);
  });

  it("t < t0 iken mevcut miktar", () => {
    expect(anlikMiktar(stok({ t0: 1000, yerelOran: 100 }), 10)).toBe(1000);
  });

  it("cok buyuk oran x sure 2^53'u asinca BigInt ile dogru", () => {
    const s = stok({ miktar: 0, yerelOran: 10 ** 12, kapasite: Number.MAX_SAFE_INTEGER });
    const t = 1_000_000_000_000; // oran*t = 1e24
    expect(anlikMiktar(s, t)).toBe(Number.MAX_SAFE_INTEGER);
    const k = stok({ miktar: 0, yerelOran: 10 ** 9, kapasite: Number.MAX_SAFE_INTEGER });
    expect(anlikMiktar(k, 10 ** 9 * 3.6)).toBe(Number((10n ** 9n * 3_600_000_000n) / 3_600_000n));
  });
});

describe("stokUzlastir", () => {
  it("miktari isler, t0'i d.zaman yapar, artigi saklar", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const s = d.bolgeler[0]!.stoklar[0]!;
    s.miktar = 1000;
    s.yerelOran = 7;
    d.zaman = 60_000;
    stokUzlastir(d, 0, 0);
    expect(s.miktar).toBe(1000);
    expect(s.artik).toBe(420_000);
    expect(s.t0).toBe(60_000);
    d.zaman = 60_000 + 59 * 60_000; // toplam 1 saat
    stokUzlastir(d, 0, 0);
    expect(s.miktar).toBe(1007);
    expect(s.artik).toBe(0);
  });

  it("kapasite ustunu israfa yazar, alti 0'a kelepceler", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const b = d.bolgeler[0]!;
    const s = b.stoklar[0]!;
    s.kapasite = 5000;
    s.miktar = 4000;
    s.yerelOran = 2000;
    d.zaman = 2 * SAAT; // +4000 -> 8000 ham: 3000 israf
    stokUzlastir(d, 0, 0);
    expect(s.miktar).toBe(5000);
    expect(b.israf[0]).toBe(3000);
    // dolu stokta birikim tamamen israf
    d.zaman = 3 * SAAT;
    stokUzlastir(d, 0, 0);
    expect(s.miktar).toBe(5000);
    expect(b.israf[0]).toBe(5000);
    // bosalma: israf degil
    s.yerelOran = -10_000;
    d.zaman = 4 * SAAT;
    stokUzlastir(d, 0, 0);
    expect(s.miktar).toBe(0);
    expect(b.israf[0]).toBe(5000);
  });

  it("d.zaman degismemisse hicbir sey degismez", () => {
    const sim = yeniSim();
    const s = sim.dunya.bolgeler[0]!.stoklar[0]!;
    s.yerelOran = 123;
    const once = structuredClone(s);
    stokUzlastir(sim.dunya, 0, 0);
    expect(s).toEqual(once);
  });

  it("adim adim uzlastirma tek seferle AYNI sonucu verir (artik sayesinde)", () => {
    const rng = prngOlustur(99, "olay");
    for (let deneme = 0; deneme < 300; deneme++) {
      const oran = aralik(rng, 2_000_001) - 1_000_000;
      const miktar = aralik(rng, 500_000);
      const kapasite = 1 + aralik(rng, 2_000_000); // sinirlara da carpsin
      const artik0 = aralik(rng, SAAT);
      const toplam = 1 + aralik(rng, 5 * SAAT);
      const a = stok({ miktar: Math.min(miktar, kapasite), yerelOran: oran, kapasite, artik: artik0 });
      const b = structuredClone(a);
      const israfA = stokUzlastirYerel(a, toplam);
      let israfB = 0;
      let t = 0;
      while (t < toplam) {
        t = Math.min(toplam, t + 1 + aralik(rng, 400_000));
        israfB += stokUzlastirYerel(b, t);
      }
      expect(b).toEqual(a);
      expect(israfB).toBe(israfA);
    }
  });

  it("oran degisen parca-sabit zincirde de adim adim = tek parca (oran degismedikce)", () => {
    // Orani sabit tutup 1 ms adimlarla uzlastir
    const a = stok({ miktar: 0, yerelOran: 7, kapasite: 1_000_000 });
    const b = structuredClone(a);
    stokUzlastirYerel(a, 3_600_000);
    for (let t = 1; t <= 3_600_000; t += 1) stokUzlastirYerel(b, t);
    expect(b).toEqual(a);
    expect(a.miktar).toBe(7);
  });
});

describe("esik zamani", () => {
  it("bosalma: anlik ilk kez 0 olur (t0+dt'de 0, t0+dt-1'de > 0)", () => {
    const rng = prngOlustur(5, "olay");
    for (let i = 0; i < 300; i++) {
      const s = stok({
        miktar: 1 + aralik(rng, 100_000),
        yerelOran: -(1 + aralik(rng, 500_000)),
        gelenOran: aralik(rng, 50) === 0 ? aralik(rng, 1000) : 0,
        artik: aralik(rng, SAAT),
      });
      const dt = stokEsikMesafesi(s);
      if (s.yerelOran + s.gelenOran >= 0) {
        expect(dt).toBe(-1);
        continue;
      }
      expect(dt).toBeGreaterThanOrEqual(1);
      expect(anlikMiktar(s, dt)).toBe(0);
      expect(anlikMiktar(s, dt - 1)).toBeGreaterThan(0);
    }
  });

  it("dolma: anlik ilk kez kapasiteye esit olur", () => {
    const rng = prngOlustur(6, "olay");
    for (let i = 0; i < 300; i++) {
      const kapasite = 10 + aralik(rng, 1_000_000);
      const s = stok({
        kapasite,
        miktar: aralik(rng, kapasite),
        yerelOran: 1 + aralik(rng, 500_000),
        artik: aralik(rng, SAAT),
      });
      const dt = stokEsikMesafesi(s);
      expect(dt).toBeGreaterThanOrEqual(1);
      expect(anlikMiktar(s, dt)).toBe(kapasite);
      expect(anlikMiktar(s, dt - 1)).toBeLessThan(kapasite);
    }
  });

  it("esik yok: oran 0, bos stokta negatif oran, dolu stokta pozitif oran", () => {
    expect(stokEsikMesafesi(stok({ yerelOran: 0 }))).toBe(-1);
    expect(stokEsikMesafesi(stok({ miktar: 0, yerelOran: -5 }))).toBe(-1);
    expect(stokEsikMesafesi(stok({ miktar: 1_000_000, yerelOran: 5 }))).toBe(-1);
  });
});

describe("stokOranAyarla / stokGelenEkle / stokEkle", () => {
  it("stokOranAyarla: uzlastir -> ayarla -> surum++ -> esik planla", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const s = d.bolgeler[0]!.stoklar[0]!; // miktar 1_000_000
    d.zaman = 10_000;
    stokOranAyarla(d, sim.baglam, 0, 0, -1_000_000);
    expect(s.yerelOran).toBe(-1_000_000);
    expect(s.surum).toBe(1);
    expect(s.t0).toBe(10_000);
    const e = esikler(sim);
    expect(e).toHaveLength(1);
    // 1_000_000 mili, -1_000_000/saat -> ~1 saat (anlik'in ilk 0 oldugu an, 1 ms kadar once olabilir)
    expect(Math.abs(e[0]!.t - (10_000 + SAAT))).toBeLessThanOrEqual(10);
    sinirAninda(s, e[0]!.t, 0);
    expect(e[0]!.veri).toEqual({ tur: "esik", bolge: 0, mal: 0, surum: 1 });
    expect(e[0]!.oncelik).toBe(2);
    expect(anlikMiktar(s, e[0]!.t)).toBe(0);
  });

  it("oran degisince surum artar; eski esik eski surumle kuyrukta kalir", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const s = d.bolgeler[0]!.stoklar[0]!;
    stokOranAyarla(d, sim.baglam, 0, 0, -1_000_000);
    stokOranAyarla(d, sim.baglam, 0, 0, -500_000);
    expect(s.surum).toBe(2);
    const e = esikler(sim);
    expect(e.map((o) => (o.veri as { surum: number }).surum)).toEqual([1, 2]);
    expect(Math.abs(e[1]!.t - 2 * SAAT)).toBeLessThanOrEqual(10);
    sinirAninda(s, e[1]!.t, 0);
  });

  it("degismeyen oran/delta surumu artirmaz ve esik eklemez", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const s = d.bolgeler[0]!.stoklar[0]!;
    stokOranAyarla(d, sim.baglam, 0, 0, -1000);
    const n = sim.dunya.kuyruk.length;
    stokOranAyarla(d, sim.baglam, 0, 0, -1000);
    stokGelenEkle(d, sim.baglam, 0, 0, 0);
    expect(s.surum).toBe(1);
    expect(sim.dunya.kuyruk.length).toBe(n);
  });

  it("dolma esigi planlanir; kapasiteye sifirdan ulasan stokta israf baslar", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const b = d.bolgeler[0]!;
    const s = b.stoklar[0]!;
    s.kapasite = 2_000_000;
    stokOranAyarla(d, sim.baglam, 0, 0, 1_000_000); // 1_000_000 eksik -> 1 saat
    const e = esikler(sim);
    expect(e[0]!.t).toBe(SAAT);
    sinirAninda(s, e[0]!.t, 2_000_000);
    d.zaman = 3 * SAAT;
    stokUzlastir(d, 0, 0);
    expect(s.miktar).toBe(2_000_000);
    expect(b.israf[0]).toBe(2_000_000); // 3 saatte +3_000_000, 1_000_000 sigdi
  });

  it("stokGelenEkle: gelenOran += delta, surum++, esik (negatif toplam oran)", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const s = d.bolgeler[0]!.stoklar[0]!;
    s.miktar = 500;
    stokOranAyarla(d, sim.baglam, 0, 0, 1000);
    stokGelenEkle(d, sim.baglam, 0, 0, -3000);
    expect(s.gelenOran).toBe(-3000);
    expect(s.surum).toBe(2);
    const son = esikler(sim).pop()!;
    // toplam oran -2000/saat, miktar 500 -> ~0.25 saat
    expect(Math.abs(son.t - SAAT / 4)).toBeLessThanOrEqual(SAAT / 2000); // en fazla 1 mili-birim / oran
    sinirAninda(s, son.t, 0);
  });

  it("stokEkle: uygulanan miktari dondurur, sinirlari uygular", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const s = d.bolgeler[0]!.stoklar[1]!;
    s.miktar = 1000;
    s.kapasite = 5000;
    expect(stokEkle(d, sim.baglam, 0, 1, 2000)).toBe(2000);
    expect(s.miktar).toBe(3000);
    expect(stokEkle(d, sim.baglam, 0, 1, 9000)).toBe(2000); // 5000'e kadar
    expect(s.miktar).toBe(5000);
    expect(d.bolgeler[0]!.israf[1]).toBe(0);
    expect(stokEkle(d, sim.baglam, 0, 1, -7000)).toBe(-5000);
    expect(s.miktar).toBe(0);
    const surum = s.surum;
    expect(stokEkle(d, sim.baglam, 0, 1, -1)).toBe(0);
    expect(s.surum).toBe(surum);
  });

  it("stokEkle uzlastirir ve orani olan stokta esigi yeniden planlar", () => {
    const sim = yeniSim();
    const d = sim.dunya;
    const s = d.bolgeler[0]!.stoklar[0]!;
    s.miktar = 10_000;
    stokOranAyarla(d, sim.baglam, 0, 0, -10_000); // 1 saat
    d.zaman = SAAT / 2; // 5000 kaldi
    expect(stokEkle(d, sim.baglam, 0, 0, 5000)).toBe(5000);
    expect(s.miktar).toBe(10_000);
    expect(s.t0).toBe(SAAT / 2);
    const son = esikler(sim).pop()!;
    expect(Math.abs(son.t - (SAAT / 2 + SAAT))).toBeLessThanOrEqual(SAAT / 10_000);
    expect((son.veri as { surum: number }).surum).toBe(s.surum);
  });

  it("gecersiz bolge/mal hata verir", () => {
    const sim = yeniSim();
    expect(() => stokOranAyarla(sim.dunya, sim.baglam, 99, 0, 1)).toThrow();
    expect(() => stokUzlastir(sim.dunya, 0, 99)).toThrow();
  });
});

describe("hazine", () => {
  function simOyuncu(): Simulasyon {
    const sim = yeniSim();
    const r = sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "p1", bolgeler: ["ova"] } });
    expect(r.tamam).toBe(true);
    return sim;
  }

  it("anlikHazine baslangic hazinesi ve orandan birikim", () => {
    const sim = simOyuncu();
    const d = sim.dunya;
    expect(anlikHazine(d, "p1")).toBe(5_000_000);
    hazineOranAyarla(d, "p1", 3_600_000);
    d.zaman = SAAT;
    expect(anlikHazine(d, "p1")).toBe(5_000_000 + 3_600_000);
    hazineUzlastir(d, "p1");
    expect(d.oyuncular[0]!.hazine.miktar).toBe(8_600_000);
    expect(d.oyuncular[0]!.hazine.t0).toBe(SAAT);
  });

  it("hazineEkle: negatif sonuc olacaksa degistirmez ve false", () => {
    const sim = simOyuncu();
    const d = sim.dunya;
    const once = structuredClone(d.oyuncular[0]!.hazine);
    expect(hazineEkle(d, "p1", -5_000_001)).toBe(false);
    expect(d.oyuncular[0]!.hazine).toEqual(once);
    expect(hazineEkle(d, "p1", -5_000_000)).toBe(true);
    expect(anlikHazine(d, "p1")).toBe(0);
    expect(hazineEkle(d, "p1", 250)).toBe(true);
    expect(anlikHazine(d, "p1")).toBe(250);
  });

  it("negatif oranda hazine 0'da kalir; sonra oran duzelince 0'dan artar", () => {
    const sim = simOyuncu();
    const d = sim.dunya;
    hazineOranAyarla(d, "p1", -10_000_000); // 5_000_000 bir saatin yarisinda biter
    d.zaman = 10 * SAAT;
    expect(anlikHazine(d, "p1")).toBe(0);
    hazineOranAyarla(d, "p1", 3_600_000);
    expect(d.oyuncular[0]!.hazine.miktar).toBe(0);
    d.zaman = 11 * SAAT;
    expect(anlikHazine(d, "p1")).toBe(3_600_000);
  });

  it("hazineEkle birikmis geliri dikkate alir", () => {
    const sim = simOyuncu();
    const d = sim.dunya;
    hazineOranAyarla(d, "p1", 3_600_000);
    d.zaman = SAAT;
    expect(hazineEkle(d, "p1", -8_600_000)).toBe(true);
    expect(anlikHazine(d, "p1")).toBe(0);
  });

  it("bilinmeyen oyuncu: anlikHazine 0, hazineEkle false", () => {
    const sim = simOyuncu();
    expect(anlikHazine(sim.dunya, "yok")).toBe(0);
    expect(hazineEkle(sim.dunya, "yok", 1)).toBe(false);
    hazineOranAyarla(sim.dunya, "yok", 5);
    hazineUzlastir(sim.dunya, "yok");
  });

  it("hazine eşik olayi planlamaz", () => {
    const sim = simOyuncu();
    const n = sim.dunya.kuyruk.length;
    hazineOranAyarla(sim.dunya, "p1", -1_000_000);
    expect(sim.dunya.kuyruk.length).toBe(n);
  });
});

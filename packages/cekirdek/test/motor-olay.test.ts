/**
 * Motor olay dongusu testleri. Alt sistemler (ekonomi, lojistik, askeri, teknoloji, politika) sahte;
 * boylece Faz 2 uygulamalarindan bagimsiz, yalnizca motorun davranisi sinanir.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  saatlikTik: vi.fn(),
  insaatBitti: vi.fn(),
  ekonomiKomutu: vi.fn(),
  lojistikCoz: vi.fn(),
  lojistikKomutu: vi.fn(),
  askeriKomutu: vi.fn(),
  partiBitti: vi.fn(),
  savasPencereAc: vi.fn(),
  savasPencereKapa: vi.fn(),
  teknolojiKomutu: vi.fn(),
  arastirmaBitti: vi.fn(),
  politikaKomutu: vi.fn(),
}));

vi.mock("../src/ekonomi", () => ({
  saatlikTik: m.saatlikTik,
  insaatBitti: m.insaatBitti,
  ekonomiKomutu: m.ekonomiKomutu,
}));
vi.mock("../src/lojistik/cozum", () => ({ lojistikCoz: m.lojistikCoz, lojistikKomutu: m.lojistikKomutu }));
vi.mock("../src/askeri", () => ({
  askeriKomutu: m.askeriKomutu,
  partiBitti: m.partiBitti,
  savasPencereAc: m.savasPencereAc,
  savasPencereKapa: m.savasPencereKapa,
}));
vi.mock("../src/teknoloji", () => ({ teknolojiKomutu: m.teknolojiKomutu, arastirmaBitti: m.arastirmaBitti }));
vi.mock("../src/politika", () => ({ politikaKomutu: m.politikaKomutu }));

import { Simulasyon } from "../src/motor";
import { stokOranAyarla } from "../src/stok";
import { DAKIKA, SAAT } from "../src/tipler";
import type { Olay } from "../src/tipler";
import { kucukVeri } from "./fikstur";

function cozumler(s: Simulasyon): Olay[] {
  return s.dunya.kuyruk.filter((o) => o.veri.tur === "cozum");
}
function tikler(s: Simulasyon): Olay[] {
  return s.dunya.kuyruk.filter((o) => o.veri.tur === "saatlik_tik");
}

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  m.ekonomiKomutu.mockReturnValue({ tamam: true });
});

describe("olustur", () => {
  it("t=0'a saatlik tik ve cozum planlar, lojistigi kirli isaretler", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    expect(s.dunya.zaman).toBe(0);
    expect(tikler(s).map((o) => o.t)).toEqual([0]);
    expect(cozumler(s).map((o) => o.t)).toEqual([0]);
    expect(s.dunya.lojistik.kirli).toBe(true);
    expect(s.dunya.lojistik.cozumPlanli).toBe(true);
    expect(s.dunya.sayac.olay).toBe(2);
    expect(s.gunluk).toEqual([]);
  });

  it("calistirKadar(0): once tik (oncelik 5), sonra cozum (oncelik 9); sonraki tik 1 saatte", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(0);
    expect(m.saatlikTik).toHaveBeenCalledTimes(1);
    expect(m.lojistikCoz).toHaveBeenCalledTimes(1);
    expect(m.saatlikTik.mock.invocationCallOrder[0]!).toBeLessThan(m.lojistikCoz.mock.invocationCallOrder[0]!);
    const l = s.dunya.lojistik;
    expect(l).toMatchObject({ kirli: false, cozumPlanli: false, sonCozum: 0, cozumSayisi: 1 });
    expect(tikler(s).map((o) => o.t)).toEqual([SAAT]);
  });
});

describe("calistirKadar", () => {
  it("gecmise gitmeye calisinca hata; zaman t olur", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(1000);
    expect(s.dunya.zaman).toBe(1000);
    expect(() => s.calistirKadar(999)).toThrow();
    s.calistirKadar(1000); // esit serbest
    expect(s.dunya.zaman).toBe(1000);
  });

  it("saatlik tik her tam saatte calisir, zamani d.zaman = olay.t", () => {
    const zamanlar: number[] = [];
    m.saatlikTik.mockImplementation((d: { zaman: number }) => void zamanlar.push(d.zaman));
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(5 * SAAT + 30 * DAKIKA);
    expect(zamanlar).toEqual([0, SAAT, 2 * SAAT, 3 * SAAT, 4 * SAAT, 5 * SAAT]);
    expect(tikler(s).map((o) => o.t)).toEqual([6 * SAAT]);
    expect(s.dunya.zaman).toBe(5 * SAAT + 30 * DAKIKA);
  });

  it("sinira (t dahil) kadar isler: tam saatte olay ve sonraki saatte olmayan", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(SAAT - 1);
    expect(m.saatlikTik).toHaveBeenCalledTimes(1);
    s.calistirKadar(SAAT);
    expect(m.saatlikTik).toHaveBeenCalledTimes(2);
  });

  it("tik her saat kirletirse cozum sayisi saat basina 1 artar (aralik sinirina takilmadan)", () => {
    m.saatlikTik.mockImplementation((d, ctx) => ctx.kirlet(d));
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(3 * SAAT);
    expect(s.dunya.lojistik.cozumSayisi).toBe(4); // t = 0, 1, 2, 3 saat
    expect(s.dunya.lojistik.sonCozum).toBe(3 * SAAT);
    expect(m.lojistikCoz).toHaveBeenCalledTimes(4);
  });

  it("insaat, parti, arastirma ve savas olaylarini alt sistemlere yonlendirir", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const c = s.baglam;
    const d = s.dunya;
    c.planla(d, 10, { tur: "insaat_bitti", insaat: 7 });
    c.planla(d, 20, { tur: "parti_bitti", parti: 8 });
    c.planla(d, 30, { tur: "arastirma_bitti", oyuncu: "p1" });
    c.planla(d, 40, { tur: "savas_pencere_ac", savas: 9 });
    c.planla(d, 50, { tur: "savas_pencere_kapa", savas: 9 });
    s.calistirKadar(100);
    expect(m.insaatBitti).toHaveBeenCalledWith(d, c, 7);
    expect(m.partiBitti).toHaveBeenCalledWith(d, c, 8);
    expect(m.arastirmaBitti).toHaveBeenCalledWith(d, c, "p1");
    expect(m.savasPencereAc).toHaveBeenCalledWith(d, c, 9);
    expect(m.savasPencereKapa).toHaveBeenCalledWith(d, c, 9);
  });

  it("ayni t'de oncelik sirasi: oran_delta < esik < insaat < savas < tik < cozum", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const sira: string[] = [];
    m.insaatBitti.mockImplementation(() => void sira.push("insaat"));
    m.savasPencereAc.mockImplementation(() => void sira.push("savas"));
    m.saatlikTik.mockImplementation(() => void sira.push("tik"));
    m.lojistikCoz.mockImplementation(() => void sira.push("cozum"));
    const c = s.baglam;
    const d = s.dunya;
    // Ters sirada planla
    c.planla(d, 0, { tur: "savas_pencere_ac", savas: 1 });
    c.planla(d, 0, { tur: "insaat_bitti", insaat: 1 });
    s.calistirKadar(0);
    expect(sira).toEqual(["insaat", "savas", "tik", "cozum"]);
  });
});

describe("esik olaylari", () => {
  it("bosalma zamaninda esik islenir: stok uzlastirilir, kirlenir, cozum calisir", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const d = s.dunya;
    s.calistirKadar(0);
    const st = d.bolgeler[0]!.stoklar[0]!; // 1_000_000
    stokOranAyarla(d, s.baglam, 0, 0, -1_000_000);
    const esik = d.kuyruk.find((o) => o.veri.tur === "esik")!;
    expect(esik.t).toBeGreaterThan(SAAT - 10);
    s.calistirKadar(esik.t - 1);
    expect(st.t0).toBe(0);
    expect(st.miktar).toBe(1_000_000);
    expect(d.lojistik.cozumSayisi).toBe(1);
    s.calistirKadar(esik.t);
    expect(st.t0).toBe(esik.t);
    expect(st.miktar).toBe(0);
    expect(d.lojistik.cozumSayisi).toBe(2);
    expect(d.lojistik.sonCozum).toBe(esik.t);
  });

  it("surumu eslesmeyen (eski) esik yok sayilir: stok uzlastirilmaz, kirlenmez", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const d = s.dunya;
    s.calistirKadar(0);
    const st = d.bolgeler[0]!.stoklar[0]!;
    stokOranAyarla(d, s.baglam, 0, 0, -1_000_000); // esik ~1 saat, surum 1
    stokOranAyarla(d, s.baglam, 0, 0, -500_000); // esik ~2 saat, surum 2
    s.calistirKadar(SAAT + 1000);
    // tik 1 saatte calisti ama eski esik (surum 1) hicbir sey yapmadi
    expect(st.t0).toBe(0);
    expect(st.miktar).toBe(1_000_000);
    expect(d.lojistik.cozumSayisi).toBe(1);
    s.calistirKadar(2 * SAAT + 1000);
    expect(st.miktar).toBe(0);
    expect(d.lojistik.cozumSayisi).toBe(2);
  });

  it("dolma esigi: stok kapasiteye ulasir ve kirlenir", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const d = s.dunya;
    s.calistirKadar(0);
    const st = d.bolgeler[0]!.stoklar[0]!;
    st.kapasite = 2_000_000;
    stokOranAyarla(d, s.baglam, 0, 0, 1_000_000);
    s.calistirKadar(SAAT);
    expect(st.miktar).toBe(2_000_000);
    expect(d.lojistik.cozumSayisi).toBe(2);
  });
});

describe("kirlet (spesifikasyon §2)", () => {
  it("ayni t'de coklu kirlet tek cozum planlar ve tek cozum calisir", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(0);
    s.calistirKadar(5 * DAKIKA);
    const d = s.dunya;
    for (let i = 0; i < 5; i++) s.baglam.kirlet(d);
    expect(cozumler(s)).toHaveLength(1);
    expect(cozumler(s)[0]!.t).toBe(5 * DAKIKA);
    const once = d.lojistik.cozumSayisi;
    s.calistirKadar(5 * DAKIKA);
    expect(d.lojistik.cozumSayisi).toBe(once + 1);
    expect(m.lojistikCoz).toHaveBeenCalledTimes(once + 1);
    expect(d.lojistik.kirli).toBe(false);
    expect(d.lojistik.cozumPlanli).toBe(false);
  });

  it("ayni t'de coklu oran_delta (gecikmeli kaynak) tek cozum olur", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(0);
    const d = s.dunya;
    for (let mal = 0; mal < 3; mal++) s.baglam.planla(d, 1 * DAKIKA, { tur: "oran_delta", bolge: 0, mal, delta: 1000 });
    s.baglam.planla(d, 1 * DAKIKA, { tur: "oran_delta", bolge: 1, mal: 0, delta: -1000 });
    s.calistirKadar(1 * DAKIKA);
    expect(cozumler(s)).toHaveLength(1);
    s.calistirKadar(1 * DAKIKA + SAAT);
    // Tek cozum (10. dakikada) + saatlik tik kirletmedigi icin baska yok
    expect(d.lojistik.cozumSayisi).toBe(2);
  });

  it("oran_delta: gelenOran += delta, surum++, kirletme en erken sonCozum + aralik'ta", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const d = s.dunya;
    s.calistirKadar(0); // cozum 1, sonCozum = 0
    s.baglam.planla(d, 1 * DAKIKA, { tur: "oran_delta", bolge: 0, mal: 1, delta: 5000 });
    s.calistirKadar(1 * DAKIKA);
    const st = d.bolgeler[0]!.stoklar[1]!;
    expect(st.gelenOran).toBe(5000);
    expect(st.surum).toBe(1);
    expect(cozumler(s).map((o) => o.t)).toEqual([10 * DAKIKA]); // enAzCozumAraligiDakika = 10
    s.calistirKadar(10 * DAKIKA - 1);
    expect(d.lojistik.cozumSayisi).toBe(1);
    s.calistirKadar(10 * DAKIKA);
    expect(d.lojistik.cozumSayisi).toBe(2);
    expect(d.lojistik.sonCozum).toBe(10 * DAKIKA);
  });

  it("gecikmeli kaynak aralik dolmussa ayni t'de planlar", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const d = s.dunya;
    s.calistirKadar(0);
    s.baglam.planla(d, 30 * DAKIKA, { tur: "oran_delta", bolge: 0, mal: 1, delta: 5000 });
    s.calistirKadar(30 * DAKIKA);
    expect(d.lojistik.cozumSayisi).toBe(2);
    expect(d.lojistik.sonCozum).toBe(30 * DAKIKA);
  });

  it("komut (anlik) kaynakli kirletme, bekleyen gecikmeli cozume ragmen ayni t'ye cozum planlar", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const d = s.dunya;
    s.calistirKadar(0);
    s.baglam.planla(d, 1 * DAKIKA, { tur: "oran_delta", bolge: 0, mal: 1, delta: 5000 });
    s.calistirKadar(1 * DAKIKA);
    expect(cozumler(s).map((o) => o.t)).toEqual([10 * DAKIKA]);
    // Oyuncu komutu 2. dakikada: cozum aninda olmali
    s.uygula({ t: 2 * DAKIKA, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "p1", bolgeler: ["ova"] } });
    expect(cozumler(s).map((o) => o.t).sort((a, b) => a - b)).toEqual([2 * DAKIKA, 10 * DAKIKA]);
    // ayni t'de ikinci komut yeni cozum eklemez? (once calistirKadar ayni t cozumunu isler)
    s.calistirKadar(2 * DAKIKA);
    expect(d.lojistik.cozumSayisi).toBe(2);
    expect(d.lojistik.sonCozum).toBe(2 * DAKIKA);
    // 10. dakikadaki artik cozum kirli olmadigi icin yok sayilir
    s.calistirKadar(10 * DAKIKA);
    expect(d.lojistik.cozumSayisi).toBe(2);
    expect(cozumler(s)).toHaveLength(0);
  });

  it("ayni t'de iki anlik kirletme (bekleyen gecikmeli varken bile) tek ek cozum planlar", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const d = s.dunya;
    s.calistirKadar(0);
    s.baglam.planla(d, 1 * DAKIKA, { tur: "oran_delta", bolge: 0, mal: 1, delta: 5000 });
    s.calistirKadar(1 * DAKIKA); // gecikmeli cozum 10. dakikada bekliyor
    s.calistirKadar(2 * DAKIKA);
    s.baglam.kirlet(d);
    s.baglam.kirlet(d);
    s.baglam.kirlet(d);
    expect(cozumler(s).filter((o) => o.t === 2 * DAKIKA)).toHaveLength(1);
  });

  it("planla gecmise olay planlamayi reddeder ve sira sayaci artar", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(1000);
    expect(() => s.baglam.planla(s.dunya, 999, { tur: "cozum" })).toThrow();
    const once = s.dunya.sayac.olay;
    s.baglam.planla(s.dunya, 1000, { tur: "cozum" });
    expect(s.dunya.sayac.olay).toBe(once + 1);
  });

  it("rastgele/rastgeleAralik d.rng akisini ilerletir; yeniKimlik artar", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const d = s.dunya;
    const once = [...d.rng.savas];
    const x = s.baglam.rastgele(d, "savas");
    expect(Number.isInteger(x)).toBe(true);
    expect(d.rng.savas).not.toEqual(once);
    expect(d.rng.ekonomi).toEqual(Simulasyon.olustur(kucukVeri(), 1).dunya.rng.ekonomi);
    const y = s.baglam.rastgeleAralik(d, "pazar", 10);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(10);
    const k1 = s.baglam.yeniKimlik(d);
    const k2 = s.baglam.yeniKimlik(d);
    expect(k2).toBe(k1 + 1);
  });
});

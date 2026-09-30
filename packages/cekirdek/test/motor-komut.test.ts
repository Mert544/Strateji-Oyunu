/** Motor komut yonlendirme ve oyuncu kaydi testleri (alt sistemler sahte). */
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  ekonomiKomutu: vi.fn(),
  lojistikKomutu: vi.fn(),
  askeriKomutu: vi.fn(),
  teknolojiKomutu: vi.fn(),
  politikaKomutu: vi.fn(),
}));

vi.mock("../src/ekonomi", () => ({ saatlikTik: vi.fn(), insaatBitti: vi.fn(), ekonomiKomutu: m.ekonomiKomutu }));
vi.mock("../src/lojistik/cozum", () => ({ lojistikCoz: vi.fn(), lojistikKomutu: m.lojistikKomutu }));
vi.mock("../src/askeri", () => ({
  askeriKomutu: m.askeriKomutu,
  partiBitti: vi.fn(),
  savasPencereAc: vi.fn(),
  savasPencereKapa: vi.fn(),
}));
vi.mock("../src/teknoloji", () => ({ teknolojiKomutu: m.teknolojiKomutu, arastirmaBitti: vi.fn() }));
vi.mock("../src/politika", () => ({ politikaKomutu: m.politikaKomutu }));

import { Simulasyon } from "../src/motor";
import { anlikHazine } from "../src/stok";
import { DAKIKA, GUN, SAAT } from "../src/tipler";
import type { DamgaliKomut, Komut } from "../src/tipler";
import { kucukVeri } from "./fikstur";

function katil(s: Simulasyon, oyuncu: string, bolgeler: string[], t = s.dunya.zaman) {
  return s.uygula({ t, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu, bolgeler } });
}

function hazirSim(): Simulasyon {
  const s = Simulasyon.olustur(kucukVeri(), 1);
  s.calistirKadar(0);
  expect(katil(s, "p1", ["ova"]).tamam).toBe(true);
  return s;
}

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset().mockReturnValue({ tamam: true });
});

describe("komut yonlendirme", () => {
  const ornekler: { komut: Komut; alt: keyof typeof m }[] = [
    { komut: { tur: "tesis_insa", bolge: "ova", tesisTuru: "ciftlik" }, alt: "ekonomiKomutu" },
    { komut: { tur: "yontem_degistir", bolge: "ova", tesis: 1, yontem: "temel_tarim" }, alt: "ekonomiKomutu" },
    { komut: { tur: "tesis_durum", bolge: "ova", tesis: 1, aktif: false }, alt: "ekonomiKomutu" },
    { komut: { tur: "ticaret_emri", bolge: "sehir", mal: "gida", yon: "ihracat", oranSaat: 1000 }, alt: "ekonomiKomutu" },
    { komut: { tur: "vergi_ayarla", oranPpm: 100_000 }, alt: "ekonomiKomutu" },
    { komut: { tur: "kenar_gelistir", kenar: 0 }, alt: "lojistikKomutu" },
    { komut: { tur: "askeri_rezerv", oranPpm: 100_000 }, alt: "lojistikKomutu" },
    { komut: { tur: "birlik_uret", bolge: "ova", birlik: "piyade", adet: 2 }, alt: "askeriKomutu" },
    { komut: { tur: "savas_ilan", saldiranBolge: "ova", hedefBolge: "sehir" }, alt: "askeriKomutu" },
    { komut: { tur: "savunma_emri", bolge: "ova", durus: "savunma" }, alt: "askeriKomutu" },
    { komut: { tur: "arastir", teknoloji: "teknik" }, alt: "teknolojiKomutu" },
    { komut: { tur: "anlasma_teklif", karsi: "p2", anlasma: "ticaret" }, alt: "politikaKomutu" },
    { komut: { tur: "anlasma_feshet", karsi: "p2", anlasma: "ticaret" }, alt: "politikaKomutu" },
    { komut: { tur: "yaptirim", hedef: "p2", aktif: true }, alt: "politikaKomutu" },
  ];

  for (const { komut, alt } of ornekler) {
    it(`${komut.tur} -> ${alt}`, () => {
      const s = hazirSim();
      const r = s.uygula({ t: 10, oyuncu: "p1", komut });
      expect(r).toEqual({ tamam: true });
      for (const [ad, f] of Object.entries(m)) {
        if (ad === alt) {
          expect(f).toHaveBeenCalledTimes(1);
          expect(f).toHaveBeenCalledWith(s.dunya, s.baglam, "p1", komut);
        } else {
          expect(f).not.toHaveBeenCalled();
        }
      }
      expect(s.gunluk.at(-1)).toEqual({ t: 10, oyuncu: "p1", komut });
    });
  }

  it("uygula: once calistirKadar(k.t), sonra komut; basarida gunluk + ayni t'ye cozum", () => {
    const s = hazirSim();
    m.ekonomiKomutu.mockImplementation((d: { zaman: number }) => {
      expect(d.zaman).toBe(5 * DAKIKA); // komut calisirken zaman k.t
      return { tamam: true };
    });
    const r = s.uygula({ t: 5 * DAKIKA, oyuncu: "p1", komut: { tur: "vergi_ayarla", oranPpm: 1 } });
    expect(r.tamam).toBe(true);
    expect(s.dunya.zaman).toBe(5 * DAKIKA);
    const cozum = s.dunya.kuyruk.filter((o) => o.veri.tur === "cozum");
    expect(cozum.map((o) => o.t)).toEqual([5 * DAKIKA]);
    expect(s.dunya.lojistik.kirli).toBe(true);
  });

  it("basarisiz komut: sonuc aynen doner, gunluge girmez, kirletmez", () => {
    const s = hazirSim();
    s.calistirKadar(1 * DAKIKA);
    const kirliOnce = s.dunya.lojistik.kirli;
    m.ekonomiKomutu.mockReturnValue({ tamam: false, hata: "yetersiz hazine" });
    const n = s.gunluk.length;
    const r = s.uygula({ t: 2 * DAKIKA, oyuncu: "p1", komut: { tur: "vergi_ayarla", oranPpm: 1 } });
    expect(r).toEqual({ tamam: false, hata: "yetersiz hazine" });
    expect(s.gunluk.length).toBe(n);
    expect(s.dunya.lojistik.kirli).toBe(kirliOnce);
    expect(s.dunya.kuyruk.some((o) => o.veri.tur === "cozum")).toBe(false);
  });

  it("gecmis zamanli komut hata sonucu verir; zaman ve gunluk degismez", () => {
    const s = hazirSim();
    s.calistirKadar(1000);
    const r = s.uygula({ t: 999, oyuncu: "p1", komut: { tur: "vergi_ayarla", oranPpm: 1 } });
    expect(r.tamam).toBe(false);
    expect(s.dunya.zaman).toBe(1000);
    expect(m.ekonomiKomutu).not.toHaveBeenCalled();
  });

  it("bilinmeyen oyuncu ve 'sistem' (oyuncu_katil disinda) reddedilir", () => {
    const s = hazirSim();
    let r = s.uygula({ t: 0, oyuncu: "yok", komut: { tur: "vergi_ayarla", oranPpm: 1 } });
    expect(r).toMatchObject({ tamam: false });
    r = s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "vergi_ayarla", oranPpm: 1 } });
    expect(r).toMatchObject({ tamam: false });
    expect(m.ekonomiKomutu).not.toHaveBeenCalled();
  });
});

describe("oyuncu_katil", () => {
  it("oyuncuyu baslangic degerleriyle olusturur, bolgeyi atar, birlikleri ilk bolgeye ekler", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(SAAT);
    const r = katil(s, "p1", ["sehir", "ova"]);
    expect(r).toEqual({ tamam: true });
    const o = s.dunya.oyuncular[0]!;
    expect(o).toEqual({
      id: "p1",
      hazine: { miktar: 5_000_000, yerelOran: 0, gelenOran: 0, t0: SAAT, artik: 0, kapasite: Number.MAX_SAFE_INTEGER, surum: 0 },
      vergiPpm: 200_000,
      teknolojiler: [],
      arastirma: null,
      askeriRezervPpm: 0,
      katilmaZamani: SAAT,
      korumaBitis: SAAT + 3 * GUN,
      kararlar: [],
    });
    expect(s.dunya.bolgeler[0]!.sahip).toBe("p1");
    expect(s.dunya.bolgeler[1]!.sahip).toBe("p1");
    expect(s.dunya.bolgeler[2]!.sahip).toBeNull();
    // Ilk bolge = listedeki ilk ("sehir", indeks 1): piyade 3, zirhli 1
    expect(s.dunya.bolgeler[1]!.birlikler).toEqual([3, 1]);
    expect(s.dunya.bolgeler[0]!.birlikler).toEqual([0, 0]);
    expect(anlikHazine(s.dunya, "p1")).toBe(5_000_000);
    expect(s.gunluk).toHaveLength(1);
  });

  it("oyuncular id'ye gore sirali tutulur", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    expect(katil(s, "zeynep", ["ova"]).tamam).toBe(true);
    expect(katil(s, "ali", ["sehir"]).tamam).toBe(true);
    expect(katil(s, "mert", ["dag"]).tamam).toBe(true);
    expect(s.dunya.oyuncular.map((o) => o.id)).toEqual(["ali", "mert", "zeynep"]);
  });

  it("yalnizca 'sistem' oyuncusu ile verilebilir", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    const r = s.uygula({ t: 0, oyuncu: "p1", komut: { tur: "oyuncu_katil", oyuncu: "p1", bolgeler: ["ova"] } });
    expect(r.tamam).toBe(false);
    expect(s.dunya.oyuncular).toHaveLength(0);
    expect(s.gunluk).toHaveLength(0);
  });

  it("sahipli, bilinmeyen veya tekrarlanan bolge hata verir (atomik: hicbir degisiklik yok)", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    expect(katil(s, "p1", ["ova"]).tamam).toBe(true);
    s.calistirKadar(0); // bekleyen cozumu isle (basarisiz komutlar da zamani ilerletir/olaylari isler)
    const once = structuredClone(s.dunya);
    expect(katil(s, "p2", ["sehir", "ova"])).toMatchObject({ tamam: false });
    expect(katil(s, "p2", ["sehir", "yok"])).toMatchObject({ tamam: false });
    expect(katil(s, "p2", ["sehir", "sehir"])).toMatchObject({ tamam: false });
    expect(katil(s, "sistem", ["sehir"])).toMatchObject({ tamam: false });
    expect(katil(s, "", ["sehir"])).toMatchObject({ tamam: false });
    expect(s.dunya).toEqual(once);
    expect(s.gunluk).toHaveLength(1);
  });

  it("mevcut oyuncuya ek bolge verilebilir; hazine/birlikler yeniden verilmez", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    expect(katil(s, "p1", ["ova"]).tamam).toBe(true);
    expect(katil(s, "p1", ["dag"]).tamam).toBe(true);
    expect(s.dunya.oyuncular).toHaveLength(1);
    expect(s.dunya.bolgeler[2]!.sahip).toBe("p1");
    expect(s.dunya.bolgeler[2]!.birlikler).toEqual([0, 0]);
    expect(s.dunya.bolgeler[0]!.birlikler).toEqual([3, 1]);
    expect(anlikHazine(s.dunya, "p1")).toBe(5_000_000);
  });

  it("oyuncu_katil basarili olunca lojistigi kirletir", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    s.calistirKadar(0);
    expect(s.dunya.lojistik.kirli).toBe(false);
    katil(s, "p1", ["ova"]);
    expect(s.dunya.lojistik.kirli).toBe(true);
  });
});

describe("klonla", () => {
  it("bagimsiz kopya: biri degisince digeri etkilenmez", () => {
    const s = hazirSim();
    const k = s.klonla();
    expect(k.durumOzeti()).toBe(s.durumOzeti());
    expect(k.dunya).not.toBe(s.dunya);
    expect(k.gunluk).toEqual(s.gunluk);
    expect(k.gunluk).not.toBe(s.gunluk);
    k.calistirKadar(2 * SAAT);
    katil(k, "p9", ["sehir"]);
    expect(s.dunya.zaman).toBe(0);
    expect(s.dunya.oyuncular).toHaveLength(1);
    expect(s.gunluk).toHaveLength(1);
    expect(k.durumOzeti()).not.toBe(s.durumOzeti());
  });

  it("gorunum dunyanin kendisini, zamani ve icerigi dondurur", () => {
    const s = hazirSim();
    const g = s.gorunum();
    expect(g.dunya).toBe(s.dunya);
    expect(g.ic).toBe(s.ic);
    expect(g.zaman).toBe(s.dunya.zaman);
  });
});

describe("yenidenOynat", () => {
  it("gunlukteki komutlari uygular", () => {
    const s = hazirSim();
    s.uygula({ t: 100, oyuncu: "p1", komut: { tur: "vergi_ayarla", oranPpm: 5 } });
    const gunluk: DamgaliKomut[] = s.gunluk;
    const r = Simulasyon.yenidenOynat(kucukVeri(), 1, gunluk);
    expect(r.gunluk).toEqual(gunluk);
    expect(r.durumOzeti()).toBe(s.durumOzeti());
  });

  it("uygulanamayan gunluk komutunda hata firlatir", () => {
    m.ekonomiKomutu.mockReturnValue({ tamam: false, hata: "x" });
    expect(() =>
      Simulasyon.yenidenOynat(kucukVeri(), 1, [{ t: 0, oyuncu: "p1", komut: { tur: "vergi_ayarla", oranPpm: 1 } }]),
    ).toThrow(/yenidenOynat/);
  });
});

import { describe, expect, it } from "vitest";
import { GUN, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import {
  TUM_HIPOTEZLER,
  argumanAyristir,
  bolgeUretimDegeri,
  canliUretimToplami,
  h1Kos,
  h2Kos,
  h2Metrikleri,
  h3Kos,
  h5Kos,
  h6Kos,
  h7Kos,
  hipotezAyristir,
  kapsamOzeti,
  ortalamaSira,
  raporUret,
  stokDegeri,
  tohumAyristir,
  uretimDegeri,
} from "../src";
import type { HipotezSonucu } from "../src";

/** Duvar saati alanlarını (sureMs) çıkararak serileştirir. */
function kararli(x: unknown): string {
  return JSON.stringify(x, (k, v) => (k === "sureMs" ? undefined : v));
}

function semaDogru(h: HipotezSonucu, kimlik: string, tohumSayisi: number): void {
  expect(h.kimlik).toBe(kimlik);
  expect(typeof h.hipotez).toBe("string");
  expect(["gecti", "kaldi", "belirsiz"]).toContain(h.verdict);
  expect(h.tohumBasina).toHaveLength(tohumSayisi);
  for (const t of h.tohumBasina) {
    expect(["gecti", "kaldi", "belirsiz"]).toContain(t.verdict);
    expect(t.durumOzeti).toMatch(/^[0-9a-f]{16}$/);
    expect(typeof t.tohum).toBe("number");
  }
  expect(h.olcum.ad.length).toBeGreaterThan(0);
  expect(h.esik.aciklama.length).toBeGreaterThan(0);
  expect(h.tohumBasariOrani).toBeGreaterThanOrEqual(0);
  expect(h.tohumBasariOrani).toBeLessThanOrEqual(1);
  expect(typeof h.sureMs).toBe("number");
  // JSON'a serileştirilebilir ve geri okunabilir
  expect(() => JSON.parse(JSON.stringify(h))).not.toThrow();
}

describe("tohum ayrıştırıcı", () => {
  it("aralık, liste ve karışık biçimleri", () => {
    expect(tohumAyristir("1-3")).toEqual([1, 2, 3]);
    expect(tohumAyristir("1,2,5")).toEqual([1, 2, 5]);
    expect(tohumAyristir("1-3,7")).toEqual([1, 2, 3, 7]);
    expect(tohumAyristir("5,1-2,2")).toEqual([1, 2, 5]);
    expect(tohumAyristir(" 4 ")).toEqual([4]);
  });
  it("geçersiz girdide hata verir", () => {
    expect(() => tohumAyristir("")).toThrow();
    expect(() => tohumAyristir("a")).toThrow();
    expect(() => tohumAyristir("5-2")).toThrow();
    expect(() => tohumAyristir("1-")).toThrow();
  });
});

describe("hipotez ve argüman ayrıştırıcı", () => {
  it("hipotezleri sıralı ve tekrarsız döndürür", () => {
    expect(hipotezAyristir("H2,h1,H2")).toEqual(["H1", "H2"]);
    expect(hipotezAyristir("tumu")).toEqual([...TUM_HIPOTEZLER]);
    expect(() => hipotezAyristir("H4")).toThrow();
  });
  it("CLI argümanları", () => {
    const a = argumanAyristir(["--hip", "H1,H3", "--tohum=2-4", "--cikti", "x/", "--hizli"]);
    expect(a).toMatchObject({ hip: "H1,H3", tohum: "2-4", cikti: "x/", hizli: true });
    expect(argumanAyristir([])).toMatchObject({ tohum: "1-3", hizli: false });
    expect(() => argumanAyristir(["--bilinmeyen"])).toThrow();
  });
});

describe("metrikler", () => {
  it("üretim değeri t=0'da sıfır, sonra artar ve bölge toplamına eşittir", () => {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_sehir"] } });
    expect(uretimDegeri(sim)).toBe(0);
    sim.calistirKadar(2 * GUN);
    const toplam = uretimDegeri(sim);
    expect(toplam).toBeGreaterThan(0);
    const parcalar = sim.dunya.bolgeler.reduce((t, b) => t + bolgeUretimDegeri(sim, b.indeks), 0);
    expect(toplam).toBeCloseTo(parcalar, 6);
    expect(uretimDegeri(sim, ["m_ova"])).toBeCloseTo(bolgeUretimDegeri(sim, "m_ova"), 6);
    expect(uretimDegeri(sim, ["m_ova", "m_sehir"])).toBeLessThanOrEqual(toplam + 1e-6);
    expect(stokDegeri(sim, ["m_ova"])).toBeGreaterThan(0);
  });

  it("canlı üretim toplamı durumu değiştirmez ve monoton artar", () => {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    sim.calistirKadar(GUN);
    const b = sim.dunya.bolgeler[0]!;
    const ozet = sim.durumOzeti();
    const q1 = canliUretimToplami(sim, b).reduce((t, x) => t + x, 0);
    expect(sim.durumOzeti()).toBe(ozet);
    sim.calistirKadar(GUN + 3_600_000 * 5);
    const q2 = canliUretimToplami(sim, sim.dunya.bolgeler[0]!).reduce((t, x) => t + x, 0);
    expect(q2).toBeGreaterThanOrEqual(q1);
  });

  it("kapsam özeti [0,1] aralığındadır", () => {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman", "m_gecit"] } });
    sim.calistirKadar(GUN);
    const k = kapsamOzeti(sim);
    for (const v of Object.values(k.ortalama)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(k.hucreSayisi).toBe(3 * sim.ic.mallar.length);
  });
});

describe("yardımcılar", () => {
  it("ortalama sıra eşitlikte paylaşır", () => {
    expect(ortalamaSira([3, 1, 2])).toEqual([1, 3, 2]);
    expect(ortalamaSira([2, 2, 1])).toEqual([1.5, 1.5, 3]);
  });

  it("H2 metrikleri: tekrar endeksi ve tükenme serisi", () => {
    const g = (gun: number, enIyi: string, poz: number, anahtarlar: string[] = []): Parameters<typeof h2Metrikleri>[0][number] => ({
      gun,
      enIyi,
      enIyiBolge: "",
      marjinal: 1,
      pozitifSayisi: poz,
      adaySayisi: 5,
      pozitifAnahtarlar: anahtarlar,
      tumMarjinaller: [],
    });
    const m = h2Metrikleri([g(1, "a", 2, ["x"]), g(2, "a", 2, ["x"]), g(3, "b", 1, ["y"]), g(4, "hicbir_sey", 0), g(5, "hicbir_sey", 0)]);
    expect(m.tekrarEndeksi).toBeCloseTo(2 / 4, 6);
    expect(m.tukenmeSerisi).toEqual([2, 2, 1, 0, 0]);
    expect(m.ilkSifirGun).toBe(4);
    expect(m.sifirGunSayisi).toBe(2);
  });
});

describe("hipotez koşucuları (kısa sürüm)", () => {
  const sonuclar: HipotezSonucu[] = [];
  const tohumlar = [1];

  it("H1: 3 bölge × 3 önayar × 1 gün", () => {
    const h = h1Kos({ tohumlar, kisa: true });
    semaDogru(h, "H1", 1);
    expect(h.parametreler["bolgeSayisi"]).toBe(3);
    expect(h.parametreler["onayarSayisi"]).toBe(3);
    expect(kararli(h1Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
    sonuclar.push(h);
  });

  it("H2: 3 günlük kısa koşu şemaya uygundur ve determinizm", () => {
    const h = h2Kos({ tohumlar, kisa: true });
    semaDogru(h, "H2", 1);
    const gunler = (h.ayrinti["tohumlar"] as Array<{ gunler: unknown[] }>)[0]!.gunler;
    expect(gunler).toHaveLength(3);
    expect(kararli(h2Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
    sonuclar.push(h);
  });

  it("H3: müdahaleli ve temel koşu karşılaştırılır", () => {
    const h = h3Kos({ tohumlar, kisa: true });
    semaDogru(h, "H3", 1);
    const tablo = (h.ayrinti["degisimTablosuIlkTohum"] as unknown[]) ?? [];
    expect(tablo).toHaveLength(12);
    expect(kararli(h3Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
    sonuclar.push(h);
  });

  it("H5: pencere sonuçları ölçülür ve kayıp tavanı aşılmaz", () => {
    const h = h5Kos({ tohumlar, kisa: true });
    semaDogru(h, "H5", 1);
    expect(h.verdict).not.toBe("kaldi");
    expect(kararli(h5Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
    sonuclar.push(h);
  });

  it("H6: geç katılanlar ölçülür", () => {
    const h = h6Kos({ tohumlar, kisa: true });
    semaDogru(h, "H6", 1);
    const gec = (h.ayrinti["tohumlar"] as Array<{ gecKatilanlar: unknown[] }>)[0]!.gecKatilanlar;
    expect(gec.length).toBeGreaterThanOrEqual(8);
    expect(kararli(h6Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
    sonuclar.push(h);
  });

  it("H7: aktif ve kur_ve_unut oranı 24/48/72 saatte hesaplanır", () => {
    const h = h7Kos({ tohumlar, kisa: true });
    semaDogru(h, "H7", 1);
    const satirlar = (h.tohumBasina[0]!.ozet["satirlar"] as Array<{ saat: number; oran: number }>);
    expect(satirlar.map((s) => s.saat)).toEqual([24, 48, 72]);
    for (const s of satirlar) expect(s.oran).toBeGreaterThan(0);
    expect(kararli(h7Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
    sonuclar.push(h);
  });

  it("rapor Markdown üretir", () => {
    expect(sonuclar.length).toBe(6);
    const md = raporUret(sonuclar, { tohumlar, hizli: false, sureMs: 1234, secenekler: {} });
    expect(md).toContain("## Özet");
    expect(md).toContain("Determinizm izi");
    for (const h of sonuclar) expect(md).toContain(`## ${h.kimlik}`);
  });
});

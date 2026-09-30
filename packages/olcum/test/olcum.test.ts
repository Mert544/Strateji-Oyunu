import { describe, expect, it } from "vitest";
import { GUN, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import { miniVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import {
  TUM_HIPOTEZLER,
  BOLGE_TURLERI,
  argumanAyristir,
  bolgeOrnekle,
  bolgeTuru,
  bolgeUretimDegeri,
  dosyaAdi,
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
  karsilastir,
  kayanKayipOlc,
  ortalamaSira,
  raporUret,
  siralamaOzeti,
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
    expect(argumanAyristir([])).toMatchObject({ tohum: "1-3", hizli: false, tam: false, ad: undefined, karsilastir: undefined });
    expect(() => argumanAyristir(["--bilinmeyen"])).toThrow();
  });
  it("--ad, --karsilastir ve --tam", () => {
    const a = argumanAyristir(["--ad", "v0.1", "--karsilastir", "docs/olcum/v0-t1-3.json", "--tam"]);
    expect(a).toMatchObject({ ad: "v0.1", karsilastir: "docs/olcum/v0-t1-3.json", tam: true });
    expect(argumanAyristir(["--ad=v0.2", "--karsilastir=x.json", "--bolge", "24"])).toMatchObject({ ad: "v0.2", karsilastir: "x.json", bolge: 24 });
    expect(() => argumanAyristir(["--bolge", "0"])).toThrow();
    expect(() => argumanAyristir(["--ad"])).toThrow();
    expect(() => argumanAyristir(["--karsilastir"])).toThrow();
    expect(() => argumanAyristir(["--ad", "../kotu"])).toThrow();
  });
  it("dosya adı sonek alır", () => {
    expect(dosyaAdi(["H1"], [1], false)).toBe("olcum-H1-t1");
    expect(dosyaAdi(["H1"], [1], false, "v0.1")).toBe("olcum-H1-t1-v0.1");
    expect(dosyaAdi(["H1", "H2"], [1, 2, 3], true, "v0.1")).toBe("olcum-H1H2-t1-3-hizli-v0.1");
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
    expect(k.talepliHucreSayisi).toBeLessThanOrEqual(k.hucreSayisi);
    expect(k.talepliHucreSayisi).toBeGreaterThan(0);
  });
});

describe("H1 yardımcıları", () => {
  it("bölge örneği devlet başına eşittir ve harita sırasındadır", () => {
    const { harita } = varsayilanVeriyiYukle();
    const tum = harita.bolgeler.map((b) => b.id);
    expect(bolgeOrnekle(harita, 999)).toEqual(tum);
    const o = bolgeOrnekle(harita, 24);
    expect(o).toHaveLength(24);
    expect(new Set(o).size).toBe(24);
    expect(o).toEqual(tum.filter((b) => o.includes(b)));
    for (const d of harita.devletler) expect(o.filter((b) => harita.bolgeler.find((x) => x.id === b)!.devlet === d.id)).toHaveLength(6);
    expect(bolgeOrnekle(harita, 24)).toEqual(o);
    // küçük örnekte de türler karışık temsil edilir
    const turler = new Set(bolgeOrnekle(harita, 16).map((b) => bolgeTuru(harita.bolgeler.find((x) => x.id === b)!)));
    expect(turler.size).toBeGreaterThanOrEqual(5);
    expect(bolgeOrnekle(harita, 4)).toHaveLength(4);
  });

  it("bölge türü: kent, liman, baskın rezerv", () => {
    const { harita } = varsayilanVeriyiYukle();
    const tur = (id: string) => bolgeTuru(harita.bolgeler.find((b) => b.id === id)!);
    expect(tur("carvan_kenti")).toBe("baskent");
    expect(tur("yelken_limani")).toBe("liman");
    expect(tur("ak_ova")).toBe("ova_tarim");
    expect(tur("kum_burnu")).toBe("petrol");
    expect(tur("kara_zirve")).toBe("maden_dag");
    expect(tur("kuzey_burun")).toBe("maden_kiyi_col");
    for (const b of harita.bolgeler) expect(BOLGE_TURLERI).toContain(bolgeTuru(b));
  });

  it("sıralama özeti: ilk üç, eşitlikte paylaşılan en iyi ve referans", () => {
    // sütunlar: a, b, c, d sabit; 4. sütun (indeks 4) referans
    const skor = [
      [4, 3, 2, 1, 5],
      [1, 4, 3, 2, 0],
      [1, 1, 1, 1, 9],
    ];
    const o = siralamaOzeti(skor, [0, 1, 2, 3], 4);
    expect(o.top3[0]).toBeCloseTo(2 / 3, 6); // 1. bölgede sıra 1, 2. bölgede sıra 4, 3. bölgede eşit (sıra 2.5)
    expect(o.enIyiSayim.reduce((t, x) => t + x, 0)).toBeCloseTo(3, 6);
    expect(o.esitBolge).toBe(1);
    expect(o.referansEnIyiOrani).toBeCloseTo(2 / 3, 6);
    expect(o.referansTop3).toBeCloseTo(2 / 3, 6);
    expect(siralamaOzeti(skor, [0, 1, 2, 3], -1).referansTop3).toBeNull();
  });
});

describe("yardımcılar", () => {
  it("ortalama sıra eşitlikte paylaşır", () => {
    expect(ortalamaSira([3, 1, 2])).toEqual([1, 3, 2]);
    expect(ortalamaSira([2, 2, 1])).toEqual([1.5, 1.5, 3]);
  });

  it("karşılaştırıcı eşitlikte 0 döner", () => {
    expect(karsilastir("a", "a")).toBe(0);
    expect(karsilastir("a", "b")).toBe(-1);
    expect(karsilastir("b", "a")).toBe(1);
    expect(["b", "a", "b"].sort(karsilastir)).toEqual(["a", "b", "b"]);
  });

  it("H2 metrikleri: karar penceresi, tükenme geçişleri paydadan çıkar", () => {
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
    // geçişler: a>a (aynı), a>b, b>h, h>h (tükenme: çıkarılır) -> 1/3
    expect(m.tekrarEndeksiTumDonem).toBeCloseTo(1 / 3, 6);
    expect(m.tekrarEndeksi).toBeCloseTo(1 / 3, 6);
    expect(m.tukenmeGecisSayisi).toBe(1);
    expect(m.gecisSayisi).toBe(4);
    expect(m.pencereCiftSayisi).toBe(3);
    expect(m.tukenmeSerisi).toEqual([2, 2, 1, 0, 0]);
    expect(m.ilkSifirGun).toBe(4);
    expect(m.sifirGunSayisi).toBe(2);
    // karar penceresi yalnızca son 2 geçiş: b>h (aynı değil), h>h (çıkarılır) -> 0/1
    const p = h2Metrikleri([g(1, "a", 2), g(2, "a", 2), g(3, "b", 1), g(4, "hicbir_sey", 0), g(5, "hicbir_sey", 0)], 2);
    expect(p.tekrarEndeksi).toBe(0);
    expect(p.pencereGunleri).toEqual([4, 5]);
    expect(p.pencereTukenmeGecisSayisi).toBe(1);
    expect(p.tekrarEndeksiTumDonem).toBeCloseTo(1 / 3, 6);
    // pencerede yalnızca tükenme varsa RI tanımsızdır
    const t = h2Metrikleri([g(1, "a", 2), g(2, "hicbir_sey", 0), g(3, "hicbir_sey", 0), g(4, "hicbir_sey", 0)], 2);
    expect(t.tekrarEndeksi).toBeNull();
    expect(t.pencereCiftSayisi).toBe(0);
  });

  it("kayan 24 saatlik kayıp: paralel savaşların kayıpları toplanır, pencere dışı olmaz", () => {
    const SAAT_MS = 3_600_000;
    const mallar = ["x", "y"];
    const taban = [1, 2];
    const stok = (x: number, y: number): number[][] => [[x, y]];
    const anlikler = [0, 12, 24, 36].map((sa) => ({ t: sa * SAAT_MS, stok: stok(100_000, 100_000) }));
    // iki ayrı savaş, 10 saat arayla: her biri x'in %20'sini alır -> pencerede %40
    const olaylar = [
      { t: 2 * SAAT_MS, r: 0, kayip: [20_000, 0] },
      { t: 12 * SAAT_MS, r: 0, kayip: [20_000, 0] },
      { t: 40 * SAAT_MS, r: 0, kayip: [90_000, 0] }, // başlangıç 24 saatinden sonra: yalnız 36. saat penceresinde
    ];
    const k = kayanKayipOlc(anlikler, olaylar, ["b1"], mallar, taban, 0);
    expect(k.malPpm).toBe(900_000); // 36. saatte başlayan pencere: 90k/100k
    expect(k.bolge).toBe("b1");
    const k2 = kayanKayipOlc(anlikler.slice(0, 3), olaylar.slice(0, 2), ["b1"], mallar, taban, 0);
    expect(k2.malPpm).toBe(400_000);
    // değer: 40k x × 1 / (100k×1 + 100k×2) = 40/300
    expect(k2.degerPpm).toBe(Math.floor((40_000 * 1_000_000) / 300_000));
    expect(kayanKayipOlc(anlikler, [], ["b1"], mallar, taban, 0).malPpm).toBe(0);
    // üretim büyümesi: stok 100k -> 200k, tek yağma 50k (= anlık stokun %25'i): karar %25, başlangıç stokuna göre %50
    const buyuyen = [
      { t: 0, stok: stok(100_000, 100_000) },
      { t: 12 * SAAT_MS, stok: stok(150_000, 100_000) },
      { t: 20 * SAAT_MS - 1, stok: stok(200_000, 100_000) },
    ];
    const g = kayanKayipOlc(buyuyen, [{ t: 20 * SAAT_MS, r: 0, kayip: [50_000, 0] }], ["b1"], mallar, taban, 0);
    expect(g.malPpm).toBe(250_000);
    expect(g.baslangicMalPpm).toBe(500_000);
  });
});

describe("hipotez koşucuları (kısa sürüm)", () => {
  const sonuclar: HipotezSonucu[] = [];
  const tohumlar = [1];

  it("H1: rekabetli dünya, devlet başına 1 bölge × 3 sabit önayar (+ dengeli referans) × 1 gün", () => {
    const veri = varsayilanVeriyiYukle();
    const h = h1Kos({ tohumlar, kisa: true, veri });
    semaDogru(h, "H1", 1);
    expect(h.parametreler["bolgeSayisi"]).toBe(veri.harita.devletler.length);
    expect(h.parametreler["onayarSayisi"]).toBe(3);
    expect(h.parametreler["referansOnayar"]).toBe("dengeli");
    const ay = h.ayrinti as { onayarlar: Array<{ ad: string }>; referans: { ad: string }; turTablosu: unknown[]; bolgeTablosuIlkTohum: Array<{ skorlar: Record<string, number> }> };
    // dengeli sıralamada DEĞİL, yalnızca referans sütununda
    expect(ay.onayarlar.map((o) => o.ad)).not.toContain("dengeli");
    expect(ay.referans.ad).toBe("dengeli");
    expect(Object.keys(ay.bolgeTablosuIlkTohum[0]!.skorlar)).toContain("dengeli");
    expect(ay.turTablosu.length).toBeGreaterThan(0);
    const oz = h.tohumBasina[0]!.ozet as { top3Orani: Record<string, number>; enIyiOnayarPayi: Record<string, number> };
    expect(Object.keys(oz.top3Orani)).not.toContain("dengeli");
    expect(Object.values(oz.enIyiOnayarPayi).reduce((t, x) => t + x, 0)).toBeCloseTo(1, 3);
    expect(kararli(h1Kos({ tohumlar, kisa: true, veri }))).toBe(kararli(h));
    sonuclar.push(h);
  }, 120_000);

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

  it("H5: kayan pencere ölçülür, ilanlar paralel denenir ve kayıp tavanı aşılmaz", () => {
    const h = h5Kos({ tohumlar, kisa: true });
    semaDogru(h, "H5", 1);
    const v = (h.tohumBasina[0]!.ozet["varyantlar"] as Array<{ kabulEdilenIlan: number; reddedilenIlan: number; saldiranlar: string[]; enBuyukKayan24sDeger: number; enBuyukTekPencereDeger: number }>)[0]!;
    expect(v.kabulEdilenIlan).toBeGreaterThan(0);
    expect(v.reddedilenIlan).toBeGreaterThanOrEqual(0);
    expect(v.saldiranlar[0]).toBe("a");
    expect(v.enBuyukKayan24sDeger).toBeGreaterThanOrEqual(0);
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
    const satirlar = (h.tohumBasina[0]!.ozet["satirlar"] as Array<{ saat: number; oran: number; oranKumulatif: number; aktifPencereUretim: number; aktifUretim: number }>);
    expect(satirlar.map((s) => s.saat)).toEqual([24, 48, 72]);
    for (const s of satirlar) {
      expect(s.oran).toBeGreaterThan(0);
      expect(s.oranKumulatif).toBeGreaterThan(0);
      // pencere üretimi kümülatifi aşamaz (24. saatte 24 saatlik pencere = kümülatif)
      expect(s.aktifPencereUretim).toBeLessThanOrEqual(s.aktifUretim);
    }
    expect(h.parametreler["pencereSaat"]).toBe(24);
    expect(() => h7Kos({ tohumlar, kisa: true, pencereSaat: 0 })).toThrow();
    expect(kararli(h7Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
    sonuclar.push(h);
  });

  it("rapor Markdown üretir", () => {
    expect(sonuclar.length).toBe(6);
    const md = raporUret(sonuclar, { tohumlar, hizli: false, sureMs: 1234, secenekler: {} });
    expect(md).toContain("## Özet");
    expect(md).toContain("Determinizm izi");
    expect(md).toContain("**Sürüm/etiket**: (belirtilmedi)");
    expect(md).not.toContain("Önceki ölçüm");
    for (const h of sonuclar) expect(md).toContain(`## ${h.kimlik}`);
  });

  it("rapor: etiket ve önceki ölçümle karşılaştırma sütunları", () => {
    const md = raporUret(sonuclar, {
      tohumlar,
      hizli: false,
      sureMs: 1,
      etiket: "v0.1",
      secenekler: {},
      karsilastirma: {
        kaynak: "docs/olcum/v0-t1-3.json",
        hipotezler: [
          { kimlik: "H1", verdict: "kaldi", olcum: { ad: "Eski ölçüm adı", deger: 0.96, birim: "oran" } },
          { kimlik: "H2", verdict: "gecti", olcum: { ad: sonuclar[1]!.olcum.ad, deger: 0.425, birim: "oran" } },
        ],
      },
    });
    expect(md).toContain("**Sürüm/etiket**: v0.1");
    expect(md).toContain("| Önceki ölçüm | Önceki sonuç |");
    expect(md).toContain("%96.0 (önceki tanım: Eski ölçüm adı) | KALDI |");
    expect(md).toMatch(/%42\.5 \| GEÇTİ \|/);
    // önceki ölçümde olmayan hipotez için "—"
    expect(md).toMatch(/\| — \| — \|\n/);
  });
});

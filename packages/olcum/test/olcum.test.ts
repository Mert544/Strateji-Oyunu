import { describe, expect, it } from "vitest";
import { GUN, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import { miniVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import {
  TUM_HIPOTEZLER,
  BOLGE_TURLERI,
  H1_ISLETIMSEL_TANIM,
  anlamliEsik,
  anlamliSiralama,
  enYakinLiman,
  odakKumesi,
  regretHesapla,
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
  it("H1 v0.2 seçenekleri: --odak, --anlamli, --pencere-bas", () => {
    expect(argumanAyristir([])).toMatchObject({ odak: undefined, anlamli: undefined, pencereBas: undefined });
    expect(argumanAyristir(["--odak", "bolge", "--anlamli=0.05", "--pencere-bas", "4"])).toMatchObject({ odak: "bolge", anlamli: 0.05, pencereBas: 4 });
    expect(argumanAyristir(["--odak=bolge_liman"])).toMatchObject({ odak: "bolge_liman" });
    expect(() => argumanAyristir(["--odak", "liman"])).toThrow();
    expect(() => argumanAyristir(["--anlamli", "2"])).toThrow();
    expect(() => argumanAyristir(["--pencere-bas", "-1"])).toThrow();
    expect(argumanAyristir(["--h1-gun", "14"]).h1Gun).toBe(14);
    expect(() => argumanAyristir(["--h1-gun=1"])).toThrow();
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

  it("anlamlı fark eşiği: taban ve pasifin oranı", () => {
    expect(anlamliEsik(0)).toBe(10_000);
    expect(anlamliEsik(100_000)).toBe(10_000);
    expect(anlamliEsik(-1_000_000)).toBe(30_000);
    expect(anlamliEsik(-1_000_000, 0.05)).toBe(50_000);
  });

  it("anlamlı sıralama: pasife eşit ilk üçe girmez, eşit grup konum paylaşır", () => {
    const o = anlamliSiralama([100, 95, 50, 5, -20], 10);
    expect(o.anlamli).toEqual([true, true, true, false, false]);
    expect(o.sira.slice(0, 3)).toEqual([1.5, 1.5, 3]);
    expect(o.sira[3]).toBe(Infinity);
    expect(o.ilkUc).toEqual([true, true, true, false, false]);
    expect(o.enIyi).toEqual([0.5, 0.5, 0, 0, 0]);
    // hiçbiri anlamlı değil: kimse ilk üçte ve en iyi değil
    const h = anlamliSiralama([5, -3, 9.99], 10);
    expect(h.ilkUc.some(Boolean)).toBe(false);
    expect(h.enIyi.every((x) => x === 0)).toBe(true);
    // yalnız tek anlamlı önayar: tek başına birinci
    expect(anlamliSiralama([0, 40, 2], 10).enIyi).toEqual([0, 1, 0]);
  });

  it("anlamlı sıralama: eşitlik nedeniyle ilk üçe girenler kesin sıralamadan ayrılır; zincirleme kaymaz", () => {
    // beş önayar eşit grupta (konum 1-5, ortalama sıra 3): hepsi ilk üçe girer, kesin sıralamada yalnızca 3'ü
    const o = anlamliSiralama([100, 99, 98, 97, 96, 60], 10);
    expect(o.ilkUc).toEqual([true, true, true, true, true, false]);
    expect(o.kesinIlkUc).toEqual([true, true, true, false, false, false]);
    // altı kişilik grup: ortalama sıra 3.5 -> kimse ilk üçte değil
    const g = anlamliSiralama([100, 99, 98, 97, 96, 95], 10);
    expect(g.ilkUc.some(Boolean)).toBe(false);
    // grup en iyi üyeye göre kurulur: 100-92 eşit, 84 (100'den 16 geride) yeni grup
    const z = anlamliSiralama([100, 92, 84, 76], 10);
    expect(z.sira).toEqual([1.5, 1.5, 3.5, 3.5]);
    expect(z.ilkUc).toEqual([true, true, false, false]);
  });

  it("regret: en iyiye göre göreli kayıp, kırpma ve dışlama", () => {
    const r = regretHesapla([100, 50, -50], 10);
    expect(r.dahil).toBe(true);
    expect(r.regret).toEqual([0, 0.5, 1]);
    expect(r.regretKirpilmamis).toEqual([0, 0.5, 1.5]);
    expect(regretHesapla([5, -5], 10).dahil).toBe(false);
  });

  it("en yakın liman: taşıma süresine göre; limansa null; odak kümesi", () => {
    const mini = miniVeriyiYukle().harita;
    expect(enYakinLiman(mini, "m_liman")).toBeNull();
    expect(enYakinLiman(mini, "m_ova")).toBe("m_liman");
    // m_col: col -> şehir -> ova (hava) -> liman = 9 saat; şehirden denize 24 saat
    expect(enYakinLiman(mini, "m_col")).toBe("m_liman");
    expect(odakKumesi(mini, "m_gecit", "bolge_liman")).toEqual(["m_gecit", "m_liman"]);
    expect(odakKumesi(mini, "m_gecit", "bolge")).toEqual(["m_gecit"]);
    expect(odakKumesi(mini, "m_liman", "bolge_liman")).toEqual(["m_liman"]);
    const { harita } = varsayilanVeriyiYukle();
    for (const b of harita.bolgeler) {
      const l = enYakinLiman(harita, b.id);
      if (b.etiketler.includes("liman")) expect(l).toBeNull();
      else expect(harita.bolgeler.find((x) => x.id === l)?.etiketler).toContain("liman");
    }
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

  it("H1 v0.2: pasif referans, eklenen değer, bölge+liman odağı (devlet başına 1 bölge × 3 sabit önayar + dengeli × 1 gün)", () => {
    const veri = varsayilanVeriyiYukle();
    const h = h1Kos({ tohumlar, kisa: true, veri });
    semaDogru(h, "H1", 1);
    expect(h.parametreler["bolgeSayisi"]).toBe(veri.harita.devletler.length);
    expect(h.parametreler["onayarSayisi"]).toBe(3);
    expect(h.parametreler["referansOnayar"]).toBe("dengeli");
    expect(h.parametreler["odakKurulumu"]).toBe("bolge+liman");
    expect(String(h.parametreler["pasifReferans"])).toContain("evet");
    const ay = h.ayrinti as {
      onayarlar: Array<{ ad: string }>;
      referans: { ad: string };
      turTablosu: Array<{ hicbiriPayi: number }>;
      isletimselTanim: string[];
      bilgiGostergeleri: Record<string, { saglandi: boolean }>;
      bolgeTablosuIlkTohum: Array<{ bolge: string; kume: string[]; pasifSkor: number; esik: number; ekDegerler: Record<string, number>; bilesenler: Record<string, Record<string, number>>; referans: { ekDeger: number } | null }>;
    };
    expect(ay.isletimselTanim).toEqual([...H1_ISLETIMSEL_TANIM]);
    // dengeli sıralamada DEĞİL, yalnızca referans olarak
    expect(ay.onayarlar.map((o) => o.ad)).not.toContain("dengeli");
    expect(ay.referans.ad).toBe("dengeli");
    expect(ay.turTablosu.length).toBeGreaterThan(0);
    expect(Object.keys(ay.bilgiGostergeleri).sort()).toEqual(["normalizeEntropi", "regret", "turBasinaFarkliEnIyi"]);
    for (const b of ay.bolgeTablosuIlkTohum) {
      // odak kümesi: bölge (+ limansa yalnız o; değilse en yakın liman)
      const tan = veri.harita.bolgeler.find((x) => x.id === b.bolge)!;
      expect(b.kume[0]).toBe(b.bolge);
      expect(b.kume).toEqual(odakKumesi(veri.harita, b.bolge, "bolge_liman"));
      expect(b.kume.length).toBe(tan.etiketler.includes("liman") ? 1 : 2);
      expect(b.esik).toBeGreaterThanOrEqual(10_000);
      expect(Object.keys(b.ekDegerler)).not.toContain("dengeli");
      expect(b.referans).not.toBeNull();
      // eklenen değer = bileşenlerin toplamı (hazine + stok + yatırım)
      for (const [ad, bl] of Object.entries(b.bilesenler)) {
        expect(bl["skor"]).toBeCloseTo((bl["hazine"] as number) + (bl["stok"] as number) + (bl["yatirim"] as number), 0);
        expect(b.ekDegerler[ad]).toBeCloseTo(bl["skor"] as number, 0);
      }
    }
    const oz = h.tohumBasina[0]!.ozet as { anlamliIlkUcOrani: Record<string, number>; enIyiOnayarPayi: Record<string, number>; hicbiriAnlamliDegil: number; anlamliBolge: number };
    expect(Object.keys(oz.anlamliIlkUcOrani)).not.toContain("dengeli");
    expect(oz.anlamliBolge + oz.hicbiriAnlamliDegil).toBe(veri.harita.devletler.length);
    // en iyi payı: anlamlı bölge başına toplam 1
    expect(Object.values(oz.enIyiOnayarPayi).reduce((t, x) => t + x, 0)).toBeCloseTo(oz.anlamliBolge / veri.harita.devletler.length, 3);
    expect(kararli(h1Kos({ tohumlar, kisa: true, veri }))).toBe(kararli(h));
    sonuclar.push(h);
  }, 180_000);

  it("H1 v0.2: yalnız bölge odağı ve dengeli referanssız koşu", () => {
    const veri = varsayilanVeriyiYukle();
    const h = h1Kos({ tohumlar, kisa: true, veri, odak: "bolge", bolgeSayisi: 2, onayarlar: ["ihracatci"] });
    semaDogru(h, "H1", 1);
    expect(h.parametreler["odakKurulumu"]).toBe("bolge");
    expect(h.parametreler["referansOnayar"]).toBe("yok");
    const ay = h.ayrinti as { bolgeTablosuIlkTohum: Array<{ kume: string[] }> };
    for (const b of ay.bolgeTablosuIlkTohum) expect(b.kume).toHaveLength(1);
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
    // Satır sayısı = içerikteki mal sayısı (tarım katmanı gübreyi ekledi).
    expect(tablo).toHaveLength(varsayilanVeriyiYukle().icerik.mallar.length);
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
    // H1 v0.2 bölümleri
    expect(md).toContain("İşletimsel tanım (H1 düzeneği v0.2)");
    expect(md).toContain("Odak kurulumu: bolge+liman");
    expect(md).toContain("Ayrıştırma: eklenen değerin bileşenleri");
    expect(md).toContain("Regret: her sabit önayarın");
    expect(md).toContain("Bilgi göstergeleri (verdict'e KATILMAZ");
    expect(md).toContain("Eşitlik kuralının etkisi");
    expect(md).toContain("Bölge türüne göre en iyi önayar");
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

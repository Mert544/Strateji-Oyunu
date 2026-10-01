/**
 * Tarım ve iklim görselleştirme yardımcıları: takvim biçimlendirme, hasat ritmi, toprak paleti eşlemesi, ekim deseni,
 * olay simgesi eşlemesi ve panel içerik üreticileri. Takvim, çekirdekteki takvim işlevleriyle de karşılaştırılır.
 */
import { describe, expect, it } from "vitest";
import { SAAT, Simulasyon, takvimAyi, takvimGunu, tarimTablosu } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import {
  AY_ADLARI,
  OLAY_SIMGELERI,
  ekimDeseni,
  ekimMetni,
  hasatAylikHesapla,
  hasatMetni,
  iklimTipiAdi,
  kimlikAdi,
  olayEvresi,
  olaySimgesi,
  olaySonumu,
  olaylariSirala,
  sureMetni,
  takvimDurumu,
  takvimMetni,
  tarimOzeti,
  tarimRenkleriniHesapla,
  toprakRengi,
  toprakVerimi,
  verimKonumu,
} from "../src/veri/tarim";
import type { TarimPaleti } from "../src/veri/tarim";
import { bolgeTamponuOlustur } from "../src/veri/renkler";
import type { Dizin, DizinTarim, Kare, OlayKaresi } from "../src/veri/kare-tipleri";
import { bolgePaneli, malPaneli, nedenSatiri } from "../src/arayuz/govde";
import { bolgeTarimBolumu, hasatCubuklari, olayPaneli, olaySayisi, tarimLejanti, tarimNedenSatiri } from "../src/arayuz/tarim-govde";
import type { GovdeDurumu } from "../src/arayuz/govde";

const AY_GUNLERI = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const takvimP = { baslangicGunu: 273, gunCarpani: 1, ayGunleri: AY_GUNLERI };

describe("iklim takvimi", () => {
  it("t=0 başlangıç gününü verir (273 = 1 Ekim)", () => {
    const d = takvimDurumu(0, takvimP);
    expect(d).toMatchObject({ ay: 9, gunAy: 1, yil: 1, ayAdi: "Ekim", yilGunu: 273 });
    expect(takvimMetni(d)).toBe("1 Ekim");
  });

  it("gün ve ay sınırları, yıl dönümü", () => {
    expect(takvimMetni(takvimDurumu(23 * 1, takvimP))).toBe("1 Ekim"); // 23 saat: aynı gün
    expect(takvimMetni(takvimDurumu(24, takvimP))).toBe("2 Ekim");
    expect(takvimMetni(takvimDurumu(24 * 30, takvimP))).toBe("31 Ekim");
    expect(takvimMetni(takvimDurumu(24 * 31, takvimP))).toBe("1 Kasım");
    const yenilYil = takvimDurumu(24 * 92, takvimP); // 273 + 92 = 365
    expect(yenilYil).toMatchObject({ yil: 2, ay: 0, gunAy: 1 });
    expect(takvimMetni(takvimDurumu(24 * (92 + 59), takvimP))).toBe("1 Mart");
    expect(takvimMetni(takvimDurumu(24 * (92 + 58), takvimP))).toBe("28 Şubat");
  });

  it("takvim hız çarpanı sim gününü çarpar (12 => 1 sim günü = 12 takvim günü)", () => {
    const d = takvimDurumu(24, { ...takvimP, gunCarpani: 12 });
    expect(d.yilGunu).toBe(273 + 12);
    expect(d.ayAdi).toBe("Ekim");
    expect(takvimMetni(d)).toBe("13 Ekim");
  });

  it("çekirdekteki takvim işlevleriyle aynı gün ve ayı verir", () => {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
    const tb = tarimTablosu(sim.ic);
    expect(tb).not.toBeNull();
    if (!tb) return;
    const p = { baslangicGunu: tb.iklim.baslangicGunu, gunCarpani: tb.iklim.gunCarpani, ayGunleri: tb.iklim.ayGunleri };
    for (const saat of [0, 1, 23, 24, 100, 500, 1000, 2208, 2209, 4000, 9000, 8760 * 2 + 5]) {
      const t = saat * SAAT;
      const d = takvimDurumu(saat, p);
      expect(d.yilGunu).toBe(takvimGunu(sim.ic, t));
      expect(d.ay).toBe(takvimAyi(sim.ic, t));
    }
  });

  it("ay adları 12 adet ve Türkçe", () => {
    expect(AY_ADLARI).toHaveLength(12);
    expect(AY_ADLARI[0]).toBe("Ocak");
    expect(AY_ADLARI[7]).toBe("Ağustos");
  });
});

describe("hasat ritmi", () => {
  it("tarım bölgelerinin tipine göre aylık ortalama (binde)", () => {
    const egriler = {
      a: [2_000_000, ...new Array<number>(10).fill(1_000_000), 0],
      b: new Array<number>(12).fill(1_000_000),
    };
    const h = hasatAylikHesapla(egriler, ["a", "b"]);
    expect(h[0]).toBe(1500);
    expect(h[1]).toBe(1000);
    expect(h[11]).toBe(500);
    expect(hasatAylikHesapla(egriler, ["a"])[0]).toBe(2000);
  });

  it("tarım bölgesi veya eğri yoksa nötr 1000", () => {
    expect(hasatAylikHesapla({}, ["x"])).toEqual(new Array<number>(12).fill(1000));
    expect(hasatAylikHesapla({ a: new Array<number>(12).fill(1_000_000) }, [])).toEqual(new Array<number>(12).fill(1000));
  });

  it("hasat metni ve çubukları geçerli ayı vurgular", () => {
    expect(hasatMetni(940)).toBe("%94");
    const html = hasatCubuklari([500, 1000, 1500, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000], 2, true);
    expect(html.match(/hasat-sutun/g)).toHaveLength(12);
    expect((html.match(/su-an/g) ?? []).length).toBe(1);
    expect(html).toContain("Mart: hasat oranı %150");
  });
});

const palet: TarimPaleti = {
  toprak: [[0, 0, 0], [0.25, 0.25, 0.25], [0.5, 0.5, 0.5], [0.75, 0.75, 0.75], [1, 1, 1]],
  tarimDisi: [0.7, 0.7, 0.75],
};

describe("toprak verimliliği paleti", () => {
  it("verim konumu 0,2..1,2 aralığını 0..1'e sıkıştırır ve kırpar", () => {
    expect(verimKonumu(0.2)).toBeCloseTo(0, 9);
    expect(verimKonumu(0.7)).toBeCloseTo(0.5, 9);
    expect(verimKonumu(1.2)).toBeCloseTo(1, 9);
    expect(verimKonumu(0)).toBe(0);
    expect(verimKonumu(3)).toBe(1);
  });

  it("palet uç noktaları ve ara değer; verimlilik monoton artar (açıklık sıralı)", () => {
    expect(toprakRengi(0.2, palet)).toEqual([0, 0, 0]);
    expect(toprakRengi(1.2, palet)).toEqual([1, 1, 1]);
    expect(toprakRengi(0.45, palet)[0]).toBeCloseTo(0.25, 9);
    let onceki = -1;
    for (let v = 0.2; v <= 1.2; v += 0.05) {
      const r = toprakRengi(v, palet)[0];
      expect(r).toBeGreaterThanOrEqual(onceki);
      onceki = r;
    }
  });

  it("verimlilik = taban x toprak durumu (binde girdiler)", () => {
    expect(toprakVerimi(1000, 1000)).toBe(1);
    expect(toprakVerimi(800, 500)).toBeCloseTo(0.4, 9);
    expect(toprakVerimi(1200, 1000)).toBeCloseTo(1.2, 9);
  });
});

describe("ekim deseni", () => {
  it("baskın ürün (>= %70) kendi desenini alır", () => {
    expect(ekimDeseni([100, 0, 0])).toBe(0);
    expect(ekimDeseni([20, 80, 0])).toBe(1);
    expect(ekimDeseni([10, 10, 80])).toBe(2);
    expect(ekimDeseni([70, 30, 0])).toBe(0);
  });
  it("karışımda hiçbiri %70'e varmıyorsa karışık (çapraz = 3); ürün sayısı artarsa 3'e kırpılır", () => {
    expect(ekimDeseni([50, 25, 25])).toBe(3);
    expect(ekimDeseni([40, 30, 30])).toBe(3);
    expect(ekimDeseni([0, 0, 0, 100])).toBe(3);
  });
  it("boş karışım düz; metin sıfır payları atlar", () => {
    expect(ekimDeseni([])).toBe(0);
    expect(ekimDeseni([0, 0, 0])).toBe(0);
    expect(ekimMetni([50, 0, 50], [{ ad: "Buğday" }, { ad: "Baklagil" }, { ad: "Nadas" }])).toBe("Buğday %50 · Nadas %50");
    expect(ekimMetni([0, 0], [{ ad: "A" }, { ad: "B" }])).toBe("—");
  });
});

describe("olay simgeleri", () => {
  it("dört bilinen tür farklı glif kodu, farklı renk belirteci ve farklı simge çizimi alır", () => {
    const turler = ["kuraklik", "don", "sel", "kis_firtinasi"];
    const s = turler.map((t) => olaySimgesi(t));
    expect(new Set(s.map((x) => x.glif)).size).toBe(4);
    expect(new Set(s.map((x) => x.renkDegiskeni)).size).toBe(4);
    expect(new Set(s.map((x) => x.ikon)).size).toBe(4);
    expect(s.map((x) => x.glif)).toEqual([8, 9, 10, 11]);
    expect(s.map((x) => x.ad)).toEqual(["Kuraklık", "Don", "Sel", "Kış fırtınası"]);
    expect(Object.keys(OLAY_SIMGELERI)).toEqual(turler);
  });

  it("bilinmeyen tür genel simge alır, adı kimlikten türetilir (içerikte yeni olay eklenirse de görünür)", () => {
    const s = olaySimgesi("dolu_yagisi");
    expect(s.glif).toBe(12);
    expect(s.ad).toBe("Dolu yagisi");
    expect(s.renkDegiskeni).toBe("--olay-diger");
  });

  it("evre sınırları: başlangıçtan önce uyarı, [başlangıç, bitiş) etkin, sonra bitti", () => {
    const o = { baslangic: 100, bitis: 200 };
    expect(olayEvresi(o, 99)).toBe("uyari");
    expect(olayEvresi(o, 100)).toBe("aktif");
    expect(olayEvresi(o, 199)).toBe("aktif");
    expect(olayEvresi(o, 200)).toBe("bitti");
    expect(olaySonumu(o, 50)).toBe(1);
    expect(olaySonumu(o, 150)).toBeCloseTo(0.5, 9);
    expect(olaySonumu(o, 200)).toBe(0);
  });

  it("liste sırası: etkinler (erken biten önce), sonra uyarıdakiler (erken başlayan önce); biten atılır", () => {
    const mk = (id: number, baslangic: number, bitis: number): OlayKaresi => ({ id, tur: 0, merkez: 0, uyari: baslangic - 24, baslangic, bitis, siddet: 40, etki: [] });
    const l = olaylariSirala([mk(1, 500, 600), mk(2, 50, 400), mk(3, 10, 90), mk(4, 120, 300), mk(5, 300, 700)], 100);
    expect(l.map((x) => [x.olay.id, x.evre])).toEqual([[2, "aktif"], [4, "uyari"], [5, "uyari"], [1, "uyari"]]);
  });

  it("süre metni", () => {
    expect(sureMetni(5)).toBe("5 sa");
    expect(sureMetni(24)).toBe("1 gün");
    expect(sureMetni(50)).toBe("2 gün 2 sa");
    expect(sureMetni(-3)).toBe("0 sa");
  });

  it("ad yardımcıları", () => {
    expect(kimlikAdi("balkan_kita")).toBe("Balkan kita");
    expect(iklimTipiAdi("balkan_kita")).toBe("Balkan karasal");
    expect(iklimTipiAdi("yeni_tip")).toBe("Yeni tip");
  });
});

// ---------------------------------------------------------------------------------------------
// Tarım görünümü ve paneller
// ---------------------------------------------------------------------------------------------

const tarim: DizinTarim = {
  baslangicGunu: 273,
  gunCarpani: 1,
  ayGunleri: AY_GUNLERI,
  uyariSaat: 24,
  urunler: [{ id: "bugday", ad: "Buğday" }, { id: "baklagil", ad: "Baklagil" }, { id: "nadas", ad: "Nadas" }],
  olayTurleri: ["kuraklik", "don", "sel", "kis_firtinasi"],
  iklimTipleri: ["akdeniz", "kurak"],
  hasatAylik: [500, 600, 800, 1000, 1200, 1400, 1500, 1400, 1200, 900, 700, 600],
  hasatTipleri: [[500, 600, 800, 1000, 1200, 1400, 1500, 1400, 1200, 900, 700, 600], new Array<number>(12).fill(1000)],
  gubreMal: 2,
  azamiGubreDozu: 3,
  bolgeler: [[0, 1000, 3, 60], [1, 400, 2, 20], null, [0, 800, 2, 40]],
};

const dizin: Dizin = {
  devletler: [{ id: "a", ad: "A", blok: "x" }],
  mallar: [
    { id: "tahil", ad: "Tahıl", kategori: "ham", taban: 10 },
    { id: "gida", ad: "Gıda", kategori: "tuketim", taban: 20 },
    { id: "gubre", ad: "Gübre", kategori: "ara", taban: 14 },
  ],
  bolgeler: [0, 1, 2, 3].map((i) => ({ id: `b${i}`, ad: `Bölge${i}`, devlet: 0, etiketler: ["ova"], x: 0, y: 0, nufus0: 1000 })),
  kenarlar: [],
  oyuncular: [{ id: "o0", devlet: 0, arketip: "sanayici" }],
  tesisTurleri: [],
  yontemler: [],
  birlikler: [],
  tarim,
};

function bolge(tk?: NonNullable<Kare["bolgeler"][number]["tarim"]>): Kare["bolgeler"][number] {
  return { sahip: 0, nufus: 1000, gida: 100, ikmal: 100, stok: [0, 0, 0], uretim: [0, 0, 0], tesis: [], ordu: [], durus: 0, ...(tk ? { tarim: tk } : {}) };
}

const olay = (id: number, tur: number, merkez: number, uyari: number, baslangic: number, bitis: number, etki: Array<[number, number]>): OlayKaresi => ({ id, tur, merkez, uyari, baslangic, bitis, siddet: 40, etki });

const kare: Kare = {
  saat: 100,
  bolgeler: [
    bolge([1000, 1000, 0, 0, 0, [100, 0, 0]]), // verim 1,0; buğday monokültür
    bolge([500, 700, 250, 2, 60, [10, 80, 10]]), // verim 0,2; baklagil baskın; olay kaybı
    bolge(), // tarım dışı
    bolge([900, 1100, 0, 3, 100, [40, 30, 30]]), // verim 0,72; karışık
  ],
  kenarlar: [],
  akislar: [],
  kapsam: [],
  fiyat: [1000, 1000, 1000],
  savaslar: [],
  hazine: [0],
  hazineOrani: [0],
  iklim: { olaylar: [olay(1, 2, 1, 70, 90, 200, [[1, 40], [3, 20]]), olay(2, 0, 3, 90, 130, 400, [[3, 30]]), olay(3, 1, 0, 0, 10, 99, [[0, 50]])] },
};

const g = (extra: Partial<GovdeDurumu> = {}): GovdeDurumu => ({ kare, dizin, mal: -1, bolge: -1, bolgeAd: (i) => `Bölge${i}`, hazineGecmisi: [[0]], ...extra });

describe("Tarım görünümü bölge renkleri", () => {
  it("dolgu = toprak verimliliği, desen = ekim karışımı; tarım dışı nötr", () => {
    const t = bolgeTamponuOlustur(4);
    tarimRenkleriniHesapla(kare, dizin, palet, t);
    // b0: verim 1,0 -> konum 0,8 ; b1: verim 0,2 -> 0 ; b2 tarım dışı ; b3: 0,72 -> 0,52
    expect(t.renk[0]).toBeCloseTo(0.8, 6);
    expect(t.renk[3]).toBeCloseTo(0, 6);
    palet.tarimDisi.forEach((v, k) => expect(t.renk[6 + k]).toBeCloseTo(v, 6));
    expect(t.renk[9]).toBeCloseTo(0.52, 6);
    expect(Array.from(t.desen)).toEqual([0, 1, 0, 3]);
    expect(Array.from(t.glif)).toEqual([-1, -1, -1, -1]);
  });

  it("kare yoksa veya tarım kapalıysa her bölge tarım dışı boyanır", () => {
    const t = bolgeTamponuOlustur(4);
    tarimRenkleriniHesapla(null, dizin, palet, t);
    expect(t.renk[0]).toBeCloseTo(0.7, 6);
    const { tarim: _yok, ...tarimsiz } = dizin;
    tarimRenkleriniHesapla(kare, tarimsiz, palet, t);
    expect(Array.from(t.desen)).toEqual([0, 0, 0, 0]);
  });

  it("özet: tarım bölgesi sayısı, ortalama, en düşük ve en yüksek", () => {
    const o = tarimOzeti(kare, dizin);
    expect(o.tarimBolgesi).toBe(3);
    expect(o.ortVerim).toBeCloseTo((1 + 0.2 + 0.72) / 3, 6);
    expect(o.enDusuk).toEqual({ bolge: 1, verim: 0.2 });
    expect(o.enYuksek?.bolge).toBe(0);
  });
});

describe("tarım panelleri", () => {
  it("bölge paneli: toprak, ekim karışımı, gübre dozu ve karşılanma, iklim çarpanı, olay kaybı", () => {
    const h = bolgeTarimBolumu(g({ bolge: 1 }), 1);
    expect(h).toContain("Toprak durumu");
    expect(h).toContain("%50");
    expect(h).toContain("Ekim karışımı");
    expect(h).toContain("Buğday %10 · Baklagil %80 · Nadas %10");
    expect(h).toContain("2 / 3");
    expect(h).toContain("karşılanma %60");
    expect(h).toContain("İklim çarpanı");
    expect(h).toContain("%70");
    expect(h).toContain("−%25"); // olay kaybı
    expect(h).toContain("Kurak"); // iklim tipi
    expect(h).toContain("Sel"); // bu bölgeyi etkileyen olay
  });

  it("tarım dışı bölge ve kapalı tarım", () => {
    expect(bolgeTarimBolumu(g({ bolge: 2 }), 2)).toContain("tarım dışı");
    const { tarim: _t, ...tarimsiz } = dizin;
    expect(bolgeTarimBolumu(g({ dizin: tarimsiz }), 0)).toBe("");
  });

  it("bölge paneli tarım bölümünü ve kararları içerir; mal paneli tarım satırı ve lejant verir", () => {
    const bp = bolgePaneli(g({ bolge: 3 }));
    expect(bp).toContain("Tarım");
    expect(bp).toContain("Komutlar"); // izleme kipinde komut bölümü: devlet seçme çağrısı
    const mp = malPaneli(g());
    expect(mp).toContain('data-gorunum="tarim"');
    expect(mp).toContain("Gübre"); // yeni mal içerikten satır olarak gelir
    expect(malPaneli(g({ tarimGorunumu: true }))).toContain("İklim tipleri");
  });

  it("olaylar sekmesi: etkin ve uyarıdakiler ayrı listelenir, satır merkez bölgeye uçmak için data-bolge taşır", () => {
    const h = olayPaneli(g());
    expect(h).toContain("Etkin olaylar (1)");
    expect(h).toContain("Uyarıdakiler (1)");
    expect(h).toContain('data-bolge="1"'); // sel merkezi (etkin)
    expect(h).toContain('data-bolge="3"'); // kuraklık merkezi (uyarıda)
    expect(h).toContain("ETKİN");
    expect(h).toContain("UYARI");
    expect(h).not.toContain('data-bolge="0"'); // biten don listelenmez
    expect(h).toContain("kaldı");
    expect(h).toContain("sonra başlar");
    expect(olaySayisi(g())).toBe(2);
  });

  it("olay yoksa boş durum metni; tarım kapalıysa açıklama", () => {
    const bos: Kare = { ...kare, iklim: { olaylar: [] } };
    expect(olayPaneli(g({ kare: bos }))).toContain("etkin iklim olayı yok");
    const { tarim: _t, ...tarimsiz } = dizin;
    expect(olayPaneli(g({ dizin: tarimsiz }))).toContain("kapalı");
  });

  it("lejant: verimlilik rampası, desenler ve iklim tipleri bölge sayısıyla", () => {
    const h = tarimLejanti(g());
    expect(h).toContain("toprak verimliliği");
    expect(h).toContain("Buğday (düz)");
    expect(h).toContain("Baklagil (noktalı)");
    expect(h).toContain("Karışık (çapraz)");
    expect(h).toContain("Akdeniz");
    expect(h).toContain("2 bölge"); // akdeniz: b0, b3
    expect(h).toContain("Kurak");
  });

  it("neden şeridi: tarım görünümünde özet ve seçili bölge ayrıntısı; genel görünümde olay özeti", () => {
    const ozet = tarimNedenSatiri(g({ tarimGorunumu: true }));
    expect(ozet).toContain("3 tarım bölgesinde");
    expect(ozet).toContain("1 etkin olay, 1 uyarı");
    const sec = nedenSatiri(g({ tarimGorunumu: true, bolge: 1 }));
    expect(sec).toContain("toprak verimliliği %20");
    expect(sec).toContain("olay kaybı %25");
    expect(nedenSatiri(g())).toContain("İklim:");
  });
});

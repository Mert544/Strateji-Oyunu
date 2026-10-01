import { describe, expect, it } from "vitest";
import { bolgeRenkleriniHesapla, bolgeTamponuOlustur, hexRgb, karistir, kullanimRengi, malRengiHex, sekilKodu } from "../src/veri/renkler";
import type { Palet } from "../src/veri/renkler";
import { hucre, kareTuret, tedarikOzeti } from "../src/veri/kapsam";
import { IZLE_SOLUK_PAY, SOLUK_PAY, genelRenkleri, pazarRenkleri, sanayiRenkleri } from "../src/veri/mercek";
import type { Dizin, Kare } from "../src/veri/kare-tipleri";

const palet: Palet = {
  devlet: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0]],
  sahipsiz: [0.5, 0.5, 0.5],
  durum: { karsilanan: [0, 0.5, 1], kismi: [1, 0.75, 0], acik: [1, 0.25, 0], engelli: [0.5, 0, 0.625], ilgisiz: [0.9, 0.9, 0.9], sahipsiz: [0.5, 0.5, 0.5] },
  notr: [1, 1, 1],
  sanayi: [[0, 0, 0], [0.25, 0.25, 0.25], [0.5, 0.5, 0.5], [0.75, 0.75, 0.75], [1, 1, 1]],
  pazar: [[0, 0, 0], [0, 0, 0.25], [0, 0, 0.5], [0, 0, 0.75], [0, 0, 1]],
};

const dizin: Dizin = {
  devletler: [{ id: "a", ad: "A", blok: "x" }, { id: "b", ad: "B", blok: "x" }],
  mallar: [
    { id: "tahil", ad: "Tahıl", kategori: "ham", taban: 10 },
    { id: "celik", ad: "Çelik", kategori: "ara", taban: 20 },
  ],
  bolgeler: [0, 1, 2, 3, 4, 5].map((i) => ({ id: `b${i}`, ad: `B${i}`, devlet: i % 2, etiketler: [], x: 0, y: 0, nufus0: 1000 })),
  kenarlar: [{ a: 0, b: 1, tur: "kara", sure: 2 }, { a: 1, b: 2, tur: "deniz", sure: 3 }],
  oyuncular: [{ id: "o0", devlet: 0, arketip: "sanayici" }, { id: "o1", devlet: 1, arketip: "tuccar" }],
  tesisTurleri: [],
  yontemler: [],
  birlikler: [],
};

function bolge(sahip: number, stok: number[] = [0, 0], uretim: number[] = [0, 0]): Kare["bolgeler"][number] {
  return { sahip, nufus: 1000, gida: 100, ikmal: 100, stok, uretim, tesis: [], ordu: [], durus: 0 };
}

/** b0: o0'ın, karşılanan; b1: o1, kısmi; b2: o0 açık; b3: o1 engelli (kapasite); b4: sahipsiz; b5: o0 ilgisiz. */
const kare: Kare = {
  saat: 10,
  bolgeler: [bolge(0, [5, 0]), bolge(1, [5, 0]), bolge(0, [5, 0]), bolge(1, [5, 0]), bolge(-1), bolge(0)],
  kapsam: [
    [1, 0, 70, 3, 5], // kısmi, mesafe
    [2, 0, 20, 2, -1], // açık, girdi_eksik
    [3, 0, 60, 1, 4], // engelli, kapasite
  ],
  fiyat: [1000, 1000],
  savaslar: [],
  hazine: [100, 200],
  hazineOrani: [1, 2],
};

describe("renk yardımcıları", () => {
  it("hexRgb kısa ve uzun biçimleri çözer", () => {
    expect(hexRgb("#ff8000")).toEqual([1, 128 / 255, 0]);
    expect(hexRgb("#0f0")).toEqual([0, 1, 0]);
    expect(hexRgb("rgb(255, 0, 51)")[2]).toBeCloseTo(0.2, 6);
    expect(hexRgb("saçma")).toEqual([0.5, 0.5, 0.5]);
  });

  it("kullanım rampası uç noktaları ve ara değerleri", () => {
    expect(kullanimRengi(0, palet.sanayi)).toEqual([0, 0, 0]);
    expect(kullanimRengi(1, palet.sanayi)).toEqual([1, 1, 1]);
    expect(kullanimRengi(0.5, palet.sanayi)[0]).toBeCloseTo(0.5, 9);
    expect(kullanimRengi(0.125, palet.sanayi)[0]).toBeCloseTo(0.125, 9);
    expect(kullanimRengi(7, palet.sanayi)).toEqual([1, 1, 1]);
    expect(karistir([0, 0, 0], [1, 1, 1], 0.25)).toEqual([0.25, 0.25, 0.25]);
  });

  it("mal renkleri kararlı, şekil kategoriden", () => {
    expect(malRengiHex("celik")).toBe("#5b8db8");
    expect(malRengiHex("bilinmeyen")).toMatch(/^#[0-9a-f]{6}$/);
    expect(malRengiHex("bilinmeyen")).toBe(malRengiHex("bilinmeyen"));
    expect([sekilKodu("ham"), sekilKodu("ara"), sekilKodu("tuketim"), sekilKodu("askeri"), sekilKodu("?")]).toEqual([0, 1, 2, 3, 0]);
  });
});

describe("kapsam hücreleri", () => {
  const t = kareTuret(kare, 2);
  it("eşikler: >=95 karşılanan, <50 açık, kapasite engelli, kalan kısmi", () => {
    expect(hucre(kare, t, 1, 0).d).toBe("kismi");
    expect(hucre(kare, t, 2, 0).d).toBe("acik");
    expect(hucre(kare, t, 3, 0).d).toBe("engelli");
    expect(hucre(kare, t, 4, 0).d).toBe("sahipsiz");
    expect(hucre(kare, t, 0, 0).d).toBe("karsilanan");
    expect(hucre(kare, t, 5, 1).d).toBe("ilgisiz");
    expect(hucre(kare, t, 1, 0).neden).toBe("mesafe");
    expect(hucre(kare, t, 1, 0).sure).toBe(5);
  });
  it("stok/üretim yoksa ilgisiz; sahip sayıları", () => {
    expect(hucre(kare, t, 5, 0).d).toBe("ilgisiz");
    expect(t.sahipSayisi).toEqual([3, 2]);
  });
  it("tedarik özeti: ilgili malların ortalaması ve en kötü hücre; sahipsiz bölgede yok", () => {
    expect(tedarikOzeti(kare, t, 2)).toEqual({ yuzde: 20, ilgili: 1, enKotu: { mal: 0, hucre: hucre(kare, t, 2, 0) } });
    expect(tedarikOzeti(kare, t, 0)).toEqual({ yuzde: 100, ilgili: 1, enKotu: null });
    expect(tedarikOzeti(kare, t, 5)).toEqual({ yuzde: 100, ilgili: 0, enKotu: null });
    expect(tedarikOzeti(kare, t, 4)).toBeNull();
  });
});

describe("anlık görüntü -> renk tamponu", () => {
  it("mal seçili değilken sahip devlet rengi; sahipsiz nötr", () => {
    const tb = bolgeTamponuOlustur(6);
    bolgeRenkleriniHesapla(kare, dizin, -1, palet, tb);
    expect(Array.from(tb.renk.slice(0, 3))).toEqual([1, 0, 0]); // o0 -> devlet 0
    expect(Array.from(tb.renk.slice(3, 6))).toEqual([0, 1, 0]); // o1 -> devlet 1
    expect(Array.from(tb.renk.slice(12, 15))).toEqual([0.5, 0.5, 0.5]); // sahipsiz
    expect(Array.from(tb.desen)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("kare yokken bölgenin asıl devleti kullanılır", () => {
    const tb = bolgeTamponuOlustur(6);
    bolgeRenkleriniHesapla(null, dizin, -1, palet, tb);
    expect(Array.from(tb.renk.slice(3, 6))).toEqual([0, 1, 0]);
  });

  it("mal seçiliyken kapsam durum renkleri, desen kodları ve neden glifleri", () => {
    const tb = bolgeTamponuOlustur(6);
    bolgeRenkleriniHesapla(kare, dizin, 0, palet, tb);
    expect(Array.from(tb.renk.slice(0, 3))).toEqual(palet.durum.karsilanan);
    expect(Array.from(tb.renk.slice(3, 6))).toEqual(palet.durum.kismi);
    expect(Array.from(tb.renk.slice(6, 9))).toEqual(palet.durum.acik);
    expect(Array.from(tb.renk.slice(9, 12))).toEqual(palet.durum.engelli);
    expect(Array.from(tb.renk.slice(12, 15))).toEqual(palet.durum.sahipsiz);
    expect(Array.from(tb.desen)).toEqual([0, 1, 2, 3, 0, 0]);
    // glif: mesafe=4, girdi_eksik=3, kapasite=2; diğerleri -1
    expect(Array.from(tb.glif)).toEqual([-1, 4, 3, 2, -1, -1]);
  });
});

describe("mercekler", () => {
  const rgb = (tb: ReturnType<typeof bolgeTamponuOlustur>, i: number): number[] => Array.from(tb.renk.slice(3 * i, 3 * i + 3));
  it("Genel: oyuncunun bölgeleri doygun, başkalarınınki nötre soldurulur; izlemede hafif soluk", () => {
    const tb = bolgeTamponuOlustur(6);
    genelRenkleri(kare, dizin, 0, palet, tb);
    expect(rgb(tb, 0)).toEqual([1, 0, 0]); // benim (o0)
    const b1 = rgb(tb, 1); // o1: yeşil -> beyaza SOLUK_PAY kadar
    expect(b1[0]).toBeCloseTo(SOLUK_PAY, 5);
    expect(b1[1]).toBeCloseTo(1, 9);
    genelRenkleri(kare, dizin, -1, palet, tb);
    expect(rgb(tb, 0)[1]).toBeCloseTo(IZLE_SOLUK_PAY, 5); // izleme: kırmızı da soluk
    expect(Array.from(tb.desen)).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it("Sanayi: tarım dışı çalışan tesis verimi; Pazar: stok değeri; sıfır olan bölge nötr", () => {
    const d2: Dizin = { ...dizin, tesisTurleri: [{ id: "celikhane", ad: "Çelikhane", tarim: false }, { id: "ciftlik", ad: "Çiftlik", tarim: true }] };
    const k2: Kare = { ...kare, bolgeler: kare.bolgeler.map((b, i) => (i === 0 ? { ...b, tesis: [[0, 0, 1, 100, 100], [1, 0, 1, 100, 100]] } : i === 2 ? { ...b, tesis: [[1, 0, 1, 100, 100]] } : b)) };
    const tb = bolgeTamponuOlustur(6);
    sanayiRenkleri(k2, d2, palet, tb);
    expect(rgb(tb, 0)).toEqual([1, 1, 1]); // en yüksek -> rampanın sonu
    expect(rgb(tb, 2)).toEqual(palet.notr); // yalnız tarım tesisi
    pazarRenkleri(k2, d2, palet, tb);
    expect(rgb(tb, 0)).toEqual([0, 0, 1]); // stok 5 tahıl: en yüksek değer
    expect(rgb(tb, 5)).toEqual(palet.notr); // stok yok
  });
});

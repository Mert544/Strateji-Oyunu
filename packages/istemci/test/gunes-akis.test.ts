import { describe, expect, it } from "vitest";
import { altGunesNoktasi, gunesYonu, simSaatMetni } from "../src/kure/gunes";
import { uzunluk, vekLl } from "../src/kure/matematik";
import { akisGruplari, grupParcacikSayisi, malKenarlari } from "../src/akis/parcaciklar";
import { kenarGenisligi } from "../src/akis/seritler";
import { seritIndeksleri, seritKesiti } from "../src/akis/serit-geo";
import { llVek, nokta, carpim } from "../src/kure/matematik";
import { etiketSayisi } from "../src/arayuz/etiketler";
import { darbogazPaneli, malPaneli, nedenSatiri } from "../src/arayuz/govde";
import { esc, kisalt } from "../src/arayuz/bicim";
import type { Dizin, Kare } from "../src/veri/kare-tipleri";

describe("güneş ve sim saati", () => {
  it("sim saat 0 = 09:00 UTC: alt-güneş boylamı 45°D, ekinoksta enlem 0", () => {
    const n = altGunesNoktasi(0);
    expect(n.boylam).toBeCloseTo(45, 9);
    expect(n.enlem).toBeCloseTo(0, 9);
  });
  it("her saat 15° batıya kayar; 24 saatte aynı boylam", () => {
    expect(altGunesNoktasi(1).boylam).toBeCloseTo(30, 9);
    expect(altGunesNoktasi(24).boylam).toBeCloseTo(altGunesNoktasi(0).boylam, 9);
    expect(altGunesNoktasi(15).boylam).toBeCloseTo(180, 9); // 00:00 UTC: gece yarısı alt-güneş 180°
    expect(altGunesNoktasi(16).boylam).toBeCloseTo(165, 9);
  });
  it("deklinasyon mevsimle değişir, birim vektör", () => {
    const yaz = altGunesNoktasi(91.3 * 24);
    expect(yaz.enlem).toBeGreaterThan(23);
    const v = gunesYonu(123.4);
    expect(uzunluk(v)).toBeCloseTo(1, 12);
    const [b] = vekLl(v);
    expect(Math.abs(b - altGunesNoktasi(123.4).boylam) < 1e-6 || Math.abs(Math.abs(b - altGunesNoktasi(123.4).boylam) - 360) < 1e-6).toBe(true);
  });
  it("saat metni", () => {
    expect(simSaatMetni(0)).toBe("Gün 1 · 09:00");
    expect(simSaatMetni(24 * 3 + 5)).toBe("Gün 4 · 14:00");
  });
});

const dizin: Dizin = {
  devletler: [{ id: "a", ad: "A", blok: "x" }],
  mallar: [
    { id: "tahil", ad: "Tahıl", kategori: "ham", taban: 10 },
    { id: "celik", ad: "Çelik", kategori: "ara", taban: 20 },
  ],
  bolgeler: [0, 1, 2].map((i) => ({ id: `b${i}`, ad: `B${i}`, devlet: 0, etiketler: [], x: 0, y: 0, nufus0: 1 })),
  kenarlar: [{ a: 0, b: 1, tur: "kara", sure: 1 }, { a: 1, b: 2, tur: "deniz", sure: 2 }],
  oyuncular: [{ id: "o0", devlet: 0, arketip: "sanayici" }],
  tesisTurleri: [],
  yontemler: [],
  birlikler: [],
};
const kare: Kare = {
  saat: 1,
  bolgeler: [0, 1, 2].map(() => ({ sahip: 0, nufus: 1, gida: 100, ikmal: 100, stok: [1, 1], uretim: [0, 0], tesis: [], ordu: [], durus: 0 })),
  kenarlar: [[100, 92, 0], [50, 10, 0]],
  // tahıl 0 -> 2 (iki kenar, 90/sa); çelik 2 -> 0 (ters yön, 10/sa); tahıl 1 -> 2 (kenar 1, 30/sa)
  akislar: [[0, 90, 0, 2, [0, 1], 0], [1, 10, 2, 0, [1, 0], 0], [0, 30, 1, 2, [1], 0]],
  kapsam: [],
  fiyat: [1000, 1000],
  savaslar: [],
  hazine: [0],
  hazineOrani: [0],
};

describe("akış parçacıkları", () => {
  it("akışlar (kenar, yön, mal) gruplarına toplanır; ters yön ayrı grup", () => {
    const g = akisGruplari(kare, dizin.kenarlar);
    const bul = (k: number, y: number, m: number): number | undefined => g.find((x) => x.kenar === k && x.yon === y && x.mal === m)?.oran;
    expect(bul(0, 0, 0)).toBe(90);
    expect(bul(1, 0, 0)).toBe(120); // 90 + 30
    expect(bul(1, 1, 1)).toBe(10);
    expect(bul(0, 1, 1)).toBe(10);
    expect(g.length).toBe(4);
  });
  it("parçacık sayısı orana göre 1-4", () => {
    expect([grupParcacikSayisi(1), grupParcacikSayisi(45), grupParcacikSayisi(120), grupParcacikSayisi(9999)]).toEqual([1, 2, 3, 4]);
  });
  it("malKenarlari yalnızca seçili malın kenarlarını verir", () => {
    expect([...(malKenarlari(kare, 1) as Set<number>)].sort()).toEqual([0, 1]);
    expect(malKenarlari(kare, -1)).toBeNull();
    expect([...(malKenarlari(kare, 0) as Set<number>)].sort()).toEqual([0, 1]);
  });
});

describe("kenar şeritleri", () => {
  it("genişlik kapasiteyle artar; hava ince; doygun asgari", () => {
    expect(kenarGenisligi(100, 100, "kara", false)).toBeGreaterThan(kenarGenisligi(10, 100, "kara", false));
    expect(kenarGenisligi(100, 100, "hava", false)).toBeLessThan(kenarGenisligi(100, 100, "kara", false));
    expect(kenarGenisligi(0, 100, "kara", true)).toBeGreaterThanOrEqual(0.0058);
  });
  it("şerit kesiti: 2(n+1) köşe, yan vektörler yüzeye paralel ve birim, uçlar yüzeyde", () => {
    const a = llVek(28, 41), b = llVek(35, 40);
    const s = seritKesiti(a, b, 8);
    expect(s.merkez.length / 3).toBe(18);
    expect(s.yan.length / 3).toBe(18);
    expect(s.capraz).toEqual(Array.from({ length: 9 }, () => [1, -1]).flat());
    for (let i = 0; i < 18; i++) {
      const c: [number, number, number] = [s.merkez[3 * i] as number, s.merkez[3 * i + 1] as number, s.merkez[3 * i + 2] as number];
      const y: [number, number, number] = [s.yan[3 * i] as number, s.yan[3 * i + 1] as number, s.yan[3 * i + 2] as number];
      expect(uzunluk(y)).toBeCloseTo(1, 9);
      expect(Math.abs(nokta(c, y) / uzunluk(c))).toBeLessThan(1e-9);
    }
    expect(uzunluk([s.merkez[0] as number, s.merkez[1] as number, s.merkez[2] as number])).toBeCloseTo(1, 9);
    // yan vektör, yay teğetine dik
    const t = [(s.merkez[6] as number) - (s.merkez[0] as number), (s.merkez[7] as number) - (s.merkez[1] as number), (s.merkez[8] as number) - (s.merkez[2] as number)] as [number, number, number];
    const y0: [number, number, number] = [s.yan[0] as number, s.yan[1] as number, s.yan[2] as number];
    expect(Math.abs(nokta(t, y0))).toBeLessThan(0.02 * uzunluk(t));
    expect(uzunluk(carpim(y0, y0))).toBe(0);
    expect(seritIndeksleri(8, 0).length).toBe(48);
    expect(seritIndeksleri(2, 10)).toEqual([10, 11, 12, 11, 13, 12, 12, 13, 14, 13, 15, 14]);
  });
});

describe("arayüz yardımcıları", () => {
  it("etiket LOD: uzakta yok, yakında hepsi", () => {
    expect(etiketSayisi(3, 50)).toBe(0);
    expect(etiketSayisi(1.2, 50)).toBe(8);
    expect(etiketSayisi(0.8, 50)).toBe(18);
    expect(etiketSayisi(0.3, 50)).toBe(50);
    expect(etiketSayisi(0.3, 5)).toBe(5);
  });
  it("biçimleme ve kaçış", () => {
    expect(esc("<b>&\"'")).toBe("&lt;b&gt;&amp;&quot;&#39;");
    expect(kisalt(12_345)).toContain("B");
    expect(kisalt(2_500_000)).toContain("Mn");
  });
  it("panel içerikleri sahte verileri kaçışlı ve çökmeden üretir", () => {
    const g = { kare, dizin, mal: 0, bolge: 1, bolgeAd: (i: number) => (i === 1 ? "<script>" : `B${i}`), hazineGecmisi: [[1, 2, 3]] };
    expect(malPaneli(g)).toContain("Tahıl");
    const d = darbogazPaneli(g);
    expect(d).toContain("%92");
    expect(d).not.toContain("<script>");
    expect(nedenSatiri(g)).toContain("&lt;script&gt;");
    expect(nedenSatiri({ ...g, bolge: -1, mal: -1 })).toContain("tam karşılanmıyor");
  });
});

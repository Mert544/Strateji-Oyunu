import { describe, expect, it } from "vitest";
import { altGunesNoktasi, gunesYonu, simSaatMetni } from "../src/kure/gunes";
import { uzunluk, vekLl } from "../src/kure/matematik";
import { ETIKET_EN_COK, etiketSayisi } from "../src/arayuz/etiketler";
import { bolgePaneli, malPaneli, nedenSatiri } from "../src/arayuz/govde";
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
  kapsam: [[1, 1, 40, 1, 3]],
  fiyat: [1000, 1000],
  savaslar: [],
  hazine: [0],
  hazineOrani: [0],
};

describe("arayüz yardımcıları", () => {
  it("etiket LOD: uzakta yok, yaklaştıkça artar ama en çok ETIKET_EN_COK", () => {
    expect(etiketSayisi(3, 50)).toBe(0);
    expect(etiketSayisi(1.2, 50)).toBe(4);
    expect(etiketSayisi(0.8, 50)).toBe(8);
    expect(etiketSayisi(0.4, 50)).toBe(11);
    expect(etiketSayisi(0.1, 50)).toBe(ETIKET_EN_COK);
    expect(etiketSayisi(0.1, 5)).toBe(5);
    for (let d = 0.05; d < 3; d += 0.05) expect(etiketSayisi(d, 99)).toBeLessThanOrEqual(ETIKET_EN_COK);
  });
  it("biçimleme ve kaçış", () => {
    expect(esc("<b>&\"'")).toBe("&lt;b&gt;&amp;&quot;&#39;");
    expect(kisalt(12_345)).toContain("B");
    expect(kisalt(2_500_000)).toContain("Mn");
  });
  it("panel içerikleri sahte verileri kaçışlı ve çökmeden üretir; lojistik ağı yok, tedarik satırı var", () => {
    const g = { kare, dizin, mal: 0, mercek: "mal" as const, bolge: 1, bolgeAd: (i: number) => (i === 1 ? "<script>" : `B${i}`), hazineGecmisi: [[1, 2, 3]] };
    expect(malPaneli(g)).toContain("Tahıl");
    expect(malPaneli(g)).toContain('data-mercek="sanayi"');
    expect(nedenSatiri(g)).toContain("&lt;script&gt;");
    const bp = bolgePaneli(g);
    expect(bp).not.toContain("<script>");
    expect(bp).toContain("Tedarik");
    expect(bp).toContain("taşıma yetmiyor"); // çelik %40, kapasite
    expect(bp).not.toContain("Akışlar");
    // Genel mercek sakindir: olay yoksa şerit boş
    expect(nedenSatiri({ ...g, bolge: -1, mal: -1, mercek: "genel" })).toBe("");
    expect(nedenSatiri({ ...g, bolge: -1, mal: -1, mercek: "sanayi" })).toContain("Sanayi");
  });
});

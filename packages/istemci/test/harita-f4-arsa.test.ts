/**
 * Hazır arsalar (F4): ızgaradan türetilen 4–12 hücrelik satın alınabilir arsalar. Saf; DOM yok.
 * Gerçek Gebze ızgarası (packages/veri/haritalar/odbl/ornek) ile de sınanır.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ARSA_EN_AZ, ARSA_EN_COK, arsaKimligindenBul, arsalariTuret, arsaSinirlari, hucredenArsa, kamuHucreleri, onerilenArsa, sinifGruplari } from "../src/harita/arsa";
import { arsaSinifi } from "../src/harita/fiyat";
import { bhiCoz, Bit, durumAl, hucreId, idCoz, satinAlinabilir } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";

const KIRSAL = Bit.ICERIDE | (1 << 5);

function izgara(g: number, y: number, f: (x: number, y: number) => number = () => KIRSAL, x0 = 1000, y0 = 2000): Izgara {
  const durum = new Uint8Array(g * y);
  for (let j = 0; j < y; j++) for (let i = 0; i < g; i++) durum[j * g + i] = f(i, j);
  return { x0, y0, genislik: g, yukseklik: y, durum };
}

const komsuMu = (a: string, b: string): boolean => {
  const p = idCoz(a)!;
  const q = idCoz(b)!;
  return Math.abs(p.x - q.x) + Math.abs(p.y - q.y) === 1;
};

function baglantiliMi(hucreler: string[]): boolean {
  const kume = new Set(hucreler);
  const gor = new Set<string>([hucreler[0]!]);
  const st = [hucreler[0]!];
  while (st.length) {
    const c = idCoz(st.pop()!)!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const k = hucreId(c.x + dx, c.y + dy);
      if (kume.has(k) && !gor.has(k)) {
        gor.add(k);
        st.push(k);
      }
    }
  }
  return gor.size === kume.size;
}

describe("arsa türetme: küçük örnekler", () => {
  it("4-12 hücrelik ada tek arsadır; 3 hücrelik ada artıktır", () => {
    // 4×3 = 12 hücreli ada (x 0-3, y 0-2), sağında yol sütunu, onun yanında 3 hücrelik ada
    const iz = izgara(10, 3, (x) => (x === 4 ? KIRSAL | Bit.YOL : x >= 5 && x <= 7 && false ? 0 : x >= 8 ? 0 : KIRSAL));
    // (x 5-7 de kırsal; 3×3 = 9 hücre) -> iki ada: 12 ve 9
    const k = arsalariTuret(iz);
    expect(k.arsalar.map((a) => a.hucreler.length)).toEqual([12, 9]);
    expect(k.artik).toBe(0);
    const kucuk = arsalariTuret(izgara(3, 1));
    expect(kucuk.arsalar).toHaveLength(0);
    expect(kucuk.artik).toBe(3);
  });

  it("yol, su ve askerî hücre arsaya girmez; yollar adaları ayırır", () => {
    const iz = izgara(12, 5, (x, y) => (x === 6 ? KIRSAL | Bit.YOL : y === 0 && x === 2 ? Bit.ICERIDE | Bit.SU : KIRSAL));
    const k = arsalariTuret(iz);
    for (const a of k.arsalar) {
      const xs = a.hucreler.map((h) => idCoz(h)!.x - 1000);
      expect(xs.every((x) => x < 6) || xs.every((x) => x > 6)).toBe(true);
      for (const h of a.hucreler) {
        const c = idCoz(h)!;
        expect(satinAlinabilir(durumAl(iz, c.x, c.y))).toBe(true);
      }
    }
  });

  it("büyük alan 3×3 blok örgüsüyle 4–12 hücrelik arsalara bölünür; her hücre en çok bir arsada", () => {
    const k = arsalariTuret(izgara(30, 21));
    expect(k.arsalar.length).toBeGreaterThan(40);
    const gor = new Set<string>();
    for (const a of k.arsalar) {
      expect(a.hucreler.length).toBeGreaterThanOrEqual(ARSA_EN_AZ);
      expect(a.hucreler.length).toBeLessThanOrEqual(ARSA_EN_COK);
      expect(baglantiliMi(a.hucreler)).toBe(true);
      for (const h of a.hucreler) {
        expect(gor.has(h)).toBe(false);
        gor.add(h);
      }
    }
    expect(gor.size + k.artik).toBe(k.uygun);
    expect(k.artik).toBe(0);
  });

  it("küçük parçalar komşuya katılır: köşede 1-3 hücrelik artıklar arsa dışı kalmaz", () => {
    // Blok örgüsüne denk gelmeyen çerçeve (x0 mod 3 = 1): kenar blokları kısmi
    const k = arsalariTuret(izgara(31, 22, undefined, 1001, 2001));
    expect(k.artik).toBe(0);
    for (const a of k.arsalar) {
      expect(a.hucreler.length).toBeGreaterThanOrEqual(ARSA_EN_AZ);
      expect(a.hucreler.length).toBeLessThanOrEqual(ARSA_EN_COK);
    }
  });

  it("deterministik; kimlik = (y, x) sırasında ilk hücre; hucredenArsa ve kimlikten bul", () => {
    const iz = izgara(40, 24, (x, y) => ((x * 7 + y * 13) % 29 === 0 ? KIRSAL | Bit.YOL : KIRSAL));
    const a = arsalariTuret(iz);
    const b = arsalariTuret(izgara(40, 24, (x, y) => ((x * 7 + y * 13) % 29 === 0 ? KIRSAL | Bit.YOL : KIRSAL)));
    expect(a.arsalar.map((x) => x.kimlik)).toEqual(b.arsalar.map((x) => x.kimlik));
    expect(a.arsalar.map((x) => x.hucreler)).toEqual(b.arsalar.map((x) => x.hucreler));
    for (const ar of a.arsalar.slice(0, 20)) {
      const ilk = ar.hucreler[0]!;
      expect(ar.kimlik).toBe(`arsa:${ilk}`);
      const c = idCoz(ilk)!;
      expect(hucredenArsa(a, c.x, c.y)).toBe(ar);
      expect(arsaKimligindenBul(a, ar.kimlik)).toBe(ar);
    }
    expect(hucredenArsa(a, 5, 5)).toBeNull();
    expect(arsaKimligindenBul(a, "arsa:1:1")).toBeNull();
  });

  it("konuma bağlı: aynı mutlak hücreler farklı çerçevede aynı arsa kimliklerini verir", () => {
    const f = (x: number, y: number): number => ((x + y) % 11 === 0 ? KIRSAL | Bit.YOL : KIRSAL);
    // Büyük çerçeve (x0=1000) ile onun içinde kalan küçük çerçeve (x0=1030): ortadaki arsalar aynı olmalı
    const buyuk = arsalariTuret(izgara(90, 60, (x, y) => f(x + 1000, y + 2000), 1000, 2000));
    const kucuk = arsalariTuret(izgara(30, 30, (x, y) => f(x + 1030, y + 2020), 1030, 2020));
    const ortak = kucuk.arsalar.filter((a) => a.x0 > 1033 && a.x1 < 1057 && a.y0 > 2023 && a.y1 < 2047);
    expect(ortak.length).toBeGreaterThan(5);
    for (const a of ortak) {
      const c = idCoz(a.hucreler[0]!)!;
      const e = hucredenArsa(buyuk, c.x, c.y);
      expect(e?.hucreler).toEqual(a.hucreler);
    }
  });

  it("sınıf özeti, çoğunluk sınıfı ve sınıf grupları; sınırlar yalnız arsa kenarlarından geçer", () => {
    const iz = izgara(6, 2, (x) => (x < 3 ? KIRSAL : Bit.ICERIDE | (3 << 5))); // konut = şehir
    const k = arsalariTuret(iz);
    expect(k.arsalar).toHaveLength(1);
    const a = k.arsalar[0]!;
    expect(a.siniflar).toEqual({ kirsal: 6, sehir: 6 });
    expect(a.baskin).toBe("kirsal"); // eşitlikte ilk sınıf
    const g = sinifGruplari(a, (id) => arsaSinifi(durumAl(iz, idCoz(id)!.x, idCoz(id)!.y)));
    expect(g.map((x) => [x.sinif, x.hucreler.length])).toEqual([["kirsal", 6], ["sehir", 6]]);
    // 6×2 dikdörtgen: çevre = 2·(6+2) = 16 kenar
    expect(arsaSinirlari(k, 990, 1990, 1010, 2010)).toHaveLength(16);
  });
});

describe("gerçek Gebze ızgarası", () => {
  const iz = bhiCoz(new Uint8Array(gunzipSync(readFileSync(new URL("../../veri/haritalar/odbl/ornek/gebze-hucreler.bhi.gz", import.meta.url)))));
  const t0 = performance.now();
  const k = arsalariTuret(iz);
  const sure = performance.now() - t0;

  it("hızlı, tam kapsayıcı ve sınırlar içinde", () => {
    console.log(`Gebze arsa: ${k.arsalar.length} arsa, ${k.uygun} uygun hücre, artık ${k.artik}, ${sure.toFixed(0)} ms`);
    expect(sure).toBeLessThan(5000);
    expect(k.arsalar.length).toBeGreaterThan(10_000);
    let toplam = 0;
    for (const a of k.arsalar) {
      expect(a.hucreler.length).toBeGreaterThanOrEqual(ARSA_EN_AZ);
      expect(a.hucreler.length).toBeLessThanOrEqual(ARSA_EN_COK);
      toplam += a.hucreler.length;
    }
    expect(toplam + k.artik).toBe(k.uygun);
    // Hücrelerin çok büyük kısmı arsada (artık küçük adalar)
    expect(k.artik / k.uygun).toBeLessThan(0.02);
  });

  it("rastgele örnek arsalar bağlı, uygun ve sınıf grupları tam; deterministik yeniden üretim", () => {
    for (let i = 0; i < k.arsalar.length; i += 997) {
      const a = k.arsalar[i]!;
      expect(baglantiliMi(a.hucreler)).toBe(true);
      const gruplar = sinifGruplari(a, (id) => {
        const c = idCoz(id)!;
        return arsaSinifi(durumAl(iz, c.x, c.y));
      });
      expect(gruplar.reduce((t, g) => t + g.hucreler.length, 0)).toBe(a.hucreler.length);
      for (const h of a.hucreler) {
        const c = idCoz(h)!;
        expect(satinAlinabilir(durumAl(iz, c.x, c.y))).toBe(true);
      }
    }
    const k2 = arsalariTuret(iz);
    expect(k2.arsalar.length).toBe(k.arsalar.length);
    expect(k2.arsalar[1234]!.kimlik).toBe(k.arsalar[1234]!.kimlik);
    expect(k2.artik).toBe(k.artik);
  });

  it("görünür kutu için sınır parçaları üretilir; çok büyük kutuda boş döner", () => {
    const a = k.arsalar[5000]!;
    const kes = arsaSinirlari(k, a.x0 - 2, a.y0 - 2, a.x1 + 2, a.y1 + 2);
    expect(kes.length).toBeGreaterThanOrEqual(4);
    expect(arsaSinirlari(k, iz.x0, iz.y0, iz.x0 + iz.genislik, iz.y0 + iz.yukseklik)).toEqual([]);
    expect(komsuMu("1:1", "1:2")).toBe(true);
  });
});

describe("kamu arsaları (geçici istemci türetmesi; kural parametre)", () => {
  const iz = izgara(240, 150, (x, y) => (x % 60 === 59 ? KIRSAL | Bit.YOL : y % 50 === 49 ? KIRSAL | Bit.YOL : KIRSAL));

  it("varsayılan: ~%4, mahalle başına en az bir; yalnız yeterince arsalı mahallede; kamu arsası meydan = merkeze yakın", () => {
    const k = arsalariTuret(iz);
    const kamu = k.arsalar.filter((a) => a.kamu);
    expect(k.kamuSayisi).toBe(kamu.length);
    const oran = kamu.length / k.arsalar.length;
    expect(oran).toBeGreaterThan(0.02);
    expect(oran).toBeLessThan(0.07);
    // Mahalle (bileşen ∩ 48 hücrelik mutlak blok) başına ≥ 1 kamu arsası: her bileşenden en az bir
    const bilesenAnahtar = (a: { cx: number; cy: number }): string => `${Math.floor((a.cx - 1000) / 60)}:${Math.floor((a.cy - 2000) / 50)}`; // yollarla ayrılmış 60×50'lik adalar
    const adalar = new Map<string, { kamu: number; toplam: number }>();
    for (const a of k.arsalar) {
      const e = adalar.get(bilesenAnahtar(a)) ?? { kamu: 0, toplam: 0 };
      e.toplam++;
      if (a.kamu) e.kamu++;
      adalar.set(bilesenAnahtar(a), e);
    }
    for (const e of adalar.values()) expect(e.kamu).toBeGreaterThanOrEqual(1);
  });

  it("deterministik; kapalıyken sıfır; oran parametresi; küçük adada kamu yok; kamu arsası hücreleri döner", () => {
    const a = arsalariTuret(iz);
    const b = arsalariTuret(izgara(240, 150, (x, y) => (x % 60 === 59 ? KIRSAL | Bit.YOL : y % 50 === 49 ? KIRSAL | Bit.YOL : KIRSAL)));
    expect(a.arsalar.filter((x) => x.kamu).map((x) => x.kimlik)).toEqual(b.arsalar.filter((x) => x.kamu).map((x) => x.kimlik));
    expect(arsalariTuret(iz, { acik: false }).kamuSayisi).toBe(0);
    expect(arsalariTuret(iz, { oran: 0 }).kamuSayisi).toBe(0);
    expect(arsalariTuret(iz, { oran: 0.2 }).kamuSayisi).toBeGreaterThan(a.kamuSayisi * 3);
    // Tek arsalık küçük ada kamu olmaz (satışa kapanmasın)
    const kucuk = arsalariTuret(izgara(3, 3));
    expect(kucuk.kamuSayisi).toBe(0);
    const hucreler = kamuHucreleri(a, 1000, 2000, 1239, 2149);
    expect(hucreler.length).toBe(a.arsalar.filter((x) => x.kamu).reduce((t, x) => t + x.hucreler.length, 0));
    expect(kamuHucreleri(arsalariTuret(iz, { acik: false }), 1000, 2000, 1239, 2149)).toEqual([]);
  });

  it("Gebze: kamu payı ~%4 ve yalnız ≥6 arsalı mahallelerde; hazır arsa önerisi kamuyu atlar", () => {
    const gz = bhiCoz(new Uint8Array(gunzipSync(readFileSync(new URL("../../veri/haritalar/odbl/ornek/gebze-hucreler.bhi.gz", import.meta.url)))));
    const k = arsalariTuret(gz);
    const oran = k.kamuSayisi / k.arsalar.length;
    console.log(`Gebze kamu: ${k.kamuSayisi}/${k.arsalar.length} (%${(oran * 100).toFixed(2)})`);
    expect(oran).toBeGreaterThan(0.025);
    expect(oran).toBeLessThan(0.07);
    const merkez = k.arsalar.find((x) => x.kamu)!;
    const oneri = onerilenArsa(k, () => false, merkez.cx, merkez.cy, "sanayi");
    expect(oneri).not.toBeNull();
    expect(oneri!.kamu).toBe(false);
  });
});

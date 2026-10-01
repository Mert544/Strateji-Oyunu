/**
 * Risksiz arbitraj yoktur (B3, docs/08 §5.3 P1): aynı referans fiyattan A limanında al, B limanında sat -> her zaman kayıp.
 *
 * Özellik testi (40 tohum): rastgele fiyat, miktar, liman primleri, komisyon, tarife, vergi ve makas kümeleri için
 * ithalatın nakit bedeli >= brüt değer >= ihracatın nakit geliri; al-sat döngüsünün toplamı <= 0 (makas > 0 iken < 0).
 * Sim düzeyi: iki limanlı dünyada aynı malı bir limandan ithal edip diğerinden ihraç eden oyuncunun ticaret nakdi < 0.
 */
import { describe, expect, it } from "vitest";
import { prngOlustur, aralik } from "../src/prng";
import type { PrngDurumu } from "../src/tipler";
import { ihracatKirilimi, ithalatKirilimi } from "../src/pazar";
import type { TicaretCarpanlari } from "../src/pazar";
import { saatKos, verTamam } from "./ekonomi-yardimci";
import { kurPazar, korumayiBitir } from "./pazar-yardimci";

function rastgeleCarpanlar(d: PrngDurumu): TicaretCarpanlari {
  const makasSecimi = [0, 100_000, 200_000, 600_000] as const;
  const makas = makasSecimi[aralik(d, 4)] as number;
  return {
    ithalatMakasPpm: 1_000_000 + makas / 2,
    ihracatMakasPpm: 1_000_000 - makas / 2,
    primPpm: aralik(d, 150_001),
    komisyonPpm: aralik(d, 2) === 0 ? 0 : 10_000,
    tarifePpm: [0, 100_000, 200_000][aralik(d, 3)] as number,
    ihracatVergisiPpm: [0, 50_000, 100_000][aralik(d, 3)] as number,
  };
}

describe("arbitraj yok: özellik testi (40 tohum)", () => {
  it("A'dan al, B'ye sat: nakit bedel >= brüt >= nakit gelir; döngü toplamı <= 0", () => {
    for (let tohum = 1; tohum <= 40; tohum++) {
      const d = prngOlustur(tohum, "pazar");
      for (let i = 0; i < 200; i++) {
        // aynı referans fiyat ve miktar; A ve B limanlarının primleri ve oyuncunun rejimi rastgele
        const fiyat = 1 + aralik(d, 500_000); // mili-para/birim
        const miktar = 1 + aralik(d, 2_000_000); // mili-birim
        const brut = Math.floor((miktar * fiyat) / 1000);
        const cA = rastgeleCarpanlar(d);
        const cB = { ...cA, primPpm: aralik(d, 150_001) }; // aynı oyuncu: makas, komisyon, tarife aynı; yalnız liman primi farklı
        const al = ithalatKirilimi(brut, cA);
        const sat = ihracatKirilimi(brut, cB);
        expect(al.nakit).toBeGreaterThanOrEqual(brut);
        expect(sat.nakit).toBeLessThanOrEqual(brut);
        const dongu = sat.nakit - al.nakit;
        expect(dongu).toBeLessThanOrEqual(0);
        if (cA.ithalatMakasPpm > 1_000_000 && brut >= 100) expect(dongu).toBeLessThan(0);
      }
    }
  });

  it("makas 0, prim 0, komisyon 0 olsa bile kâr yoktur (döngü tam 0'dır, pozitif olamaz)", () => {
    for (let brut = 1; brut < 5000; brut += 7) {
      const c: TicaretCarpanlari = { ithalatMakasPpm: 1_000_000, ihracatMakasPpm: 1_000_000, primPpm: 0, komisyonPpm: 0, tarifePpm: 0, ihracatVergisiPpm: 0 };
      expect(ihracatKirilimi(brut, c).nakit - ithalatKirilimi(brut, c).nakit).toBe(0);
    }
  });

  it("farklı primli iki liman: uzak limandan al, yakın limana sat de, yakın limandan al, uzak limana sat de zarardır (zarar her iki yönde makas + primdir)", () => {
    const c0: TicaretCarpanlari = { ithalatMakasPpm: 1_100_000, ihracatMakasPpm: 900_000, primPpm: 0, komisyonPpm: 0, tarifePpm: 0, ihracatVergisiPpm: 0 };
    const brut = 1_000_000;
    const uzakAl = ithalatKirilimi(brut, { ...c0, primPpm: 150_000 }).nakit;
    const yakinSat = ihracatKirilimi(brut, { ...c0, primPpm: 0 }).nakit;
    const yakinAl = ithalatKirilimi(brut, { ...c0, primPpm: 0 }).nakit;
    const uzakSat = ihracatKirilimi(brut, { ...c0, primPpm: 150_000 }).nakit;
    expect(yakinSat - uzakAl).toBeLessThan(0);
    expect(uzakSat - yakinAl).toBeLessThan(0);
    // prim zararı büyütür: aynı limandan al-sat (yalnız makas) en küçük zarardır
    expect(uzakSat - yakinAl).toBeLessThan(yakinSat - yakinAl);
    expect(yakinSat - uzakAl).toBeLessThan(yakinSat - yakinAl);
  });
});

describe("arbitraj yok: sim düzeyi", () => {
  it("m_liman'dan ithal et, m_sehir'den ihraç et (ve tersi): ticaret nakdi her zaman negatif", () => {
    for (const [ithLiman, ihrLiman] of [["m_liman", "m_sehir"], ["m_sehir", "m_liman"]] as const) {
      const { s } = kurPazar();
      korumayiBitir(s, "a");
      verTamam(s, "a", { tur: "vergi_ayarla", oranPpm: 0 });
      // Aynı miktar ve ref. fiyat: yakıt (fiyat esnekliği iki emri de aynı fiyatta görür), hacimler pazar sınırının altında
      verTamam(s, "a", { tur: "ticaret_emri", bolge: ithLiman, mal: "yakit", yon: "ithalat", oranSaat: 20_000 });
      verTamam(s, "a", { tur: "ticaret_emri", bolge: ihrLiman, mal: "yakit", yon: "ihracat", oranSaat: 20_000 });
      saatKos(s, 48);
      const df = s.dunya.oyuncular.find((o) => o.id === "a")!.ticaretDefteri!;
      expect(df.toplam.brutIthalat).toBeGreaterThan(0);
      expect(df.toplam.brutIhracat).toBeGreaterThan(0);
      // Hazineye ticaret etkisi = brüt ihracat - brüt ithalat - (makas + prim + komisyon); aynı hacim ve fiyatla negatif
      const nakit = df.toplam.brutIhracat - df.toplam.brutIthalat - df.toplam.makas - df.toplam.prim - df.toplam.komisyon;
      expect(nakit).toBeLessThan(0);
    }
  });
});

/**
 * Pazar fiyat kırılımı (B3, P1 liman primi, P2 makas, P3 komisyon ve tarife): tamsayı doğruluğu, kalem toplamı, koruma muafiyeti,
 * NPC likidite ölçeği ve liman primi (dünya kapısına uzaklık x prim, tavanlı).
 */
import { describe, expect, it } from "vitest";
import { PPM } from "../src/tipler";
import { ihracatKirilimi, ithalatKirilimi, npcLikiditeOlcekPpm, pazarTablosu, ticaretCarpanlari, ticaretNakitCarpanlari } from "../src/pazar";
import type { TicaretCarpanlari } from "../src/pazar";
import { saatKos, verTamam } from "./ekonomi-yardimci";
import { bolge, kurPazar, korumayiBitir } from "./pazar-yardimci";

const C0: TicaretCarpanlari = { ithalatMakasPpm: 1_100_000, ihracatMakasPpm: 900_000, primPpm: 0, komisyonPpm: 0, tarifePpm: 0, ihracatVergisiPpm: 0 };

describe("liman primi (P1): dünya kapısına uzaklık x prim, tavanlı", () => {
  it("prim = min(tavan, mesafe x primPpmSaat): 24 saat -> 60000, 0 saat -> 0, 100 saat -> tavan 150000", () => {
    for (const [mesafe, beklenen] of [[0, 0], [1, 2500], [24, 60_000], [60, 150_000], [100, 150_000]] as const) {
      const { s } = kurPazar({ sehirMesafeSaat: mesafe === 0 ? 1 : mesafe });
      const pz = pazarTablosu(s.ic)!;
      expect(pz.limanPrimPpm[s.ic.bolgeIndeks["m_liman"] as number]).toBe(0); // dünya kapısı
      const sehir = pz.limanPrimPpm[s.ic.bolgeIndeks["m_sehir"] as number];
      expect(sehir).toBe(mesafe === 0 ? 2500 : beklenen);
    }
  });

  it("liman tanımı olmayan bölge ve limansız bölge prim 0 sayılır", () => {
    const { s } = kurPazar({ ikiLiman: false });
    const pz = pazarTablosu(s.ic)!;
    expect(pz.limanPrimPpm.every((x) => x === 0)).toBe(true);
  });

  it("örnek: 24 saat uzak liman: ithalat 1,1 x 1,06 = 1,166; ihracat 0,9 x 0,94 = 0,846 (komisyon ve tarife 0)", () => {
    const c = { ...C0, primPpm: 60_000 };
    const ith = ithalatKirilimi(1_000_000, c);
    const ihr = ihracatKirilimi(1_000_000, c);
    expect(ith.nakit).toBe(1_166_000);
    expect(ihr.nakit).toBe(846_000);
    expect(ith.makas).toBe(100_000);
    expect(ith.prim).toBe(66_000);
    expect(ihr.makas).toBe(100_000);
    expect(ihr.prim).toBe(54_000);
  });

  it("limandaki emir uzaklığa göre pahalı/ucuz: aynı malın ihracat geliri uzak limanda daha düşük (hazine oranı)", () => {
    // İki bağımsız dünya; yalnız ihracat limanı farklı (m_liman = kapı, m_sehir = 24 saat uzak). Yakıt stoğu iki limanda da bol.
    const yakitIhr = (liman: string): number => {
      const { s } = kurPazar();
      korumayiBitir(s, "a");
      verTamam(s, "a", { tur: "vergi_ayarla", oranPpm: 0 });
      verTamam(s, "a", { tur: "ticaret_emri", bolge: liman, mal: "yakit", yon: "ihracat", oranSaat: 20_000 });
      saatKos(s, 6);
      return s.dunya.oyuncular.find((o) => o.id === "a")!.ticaretDefteri!.oran.prim;
    };
    expect(yakitIhr("m_liman")).toBe(0);
    expect(yakitIhr("m_sehir")).toBeGreaterThan(0);
  });
});

describe("kırılım toplamı ve tamsayı doğruluğu", () => {
  const ornekler: TicaretCarpanlari[] = [
    C0,
    { ...C0, primPpm: 60_000 },
    { ...C0, primPpm: 150_000, komisyonPpm: 10_000 },
    { ...C0, primPpm: 37_500, komisyonPpm: 10_000, tarifePpm: 100_000, ihracatVergisiPpm: 50_000 },
    { ithalatMakasPpm: 1_300_000, ihracatMakasPpm: 700_000, primPpm: 12_500, komisyonPpm: 10_000, tarifePpm: 200_000, ihracatVergisiPpm: 100_000 },
  ];

  it("ihracat: brüt = nakit + makas + prim + komisyon (vergi nakite geri yazılı); ithalat: nakit = brüt + makas + prim + komisyon", () => {
    for (const c of ornekler) {
      for (const brut of [1, 7, 999, 1_000_000, 123_456_789, 9_007_199_254] as const) {
        const ihr = ihracatKirilimi(brut, c);
        expect(ihr.nakit + ihr.makas + ihr.prim + ihr.komisyon).toBe(brut);
        expect(ihr.makas).toBeGreaterThanOrEqual(0);
        expect(ihr.prim).toBeGreaterThanOrEqual(0);
        expect(ihr.komisyon).toBeGreaterThanOrEqual(0);
        expect(ihr.vergi).toBeGreaterThanOrEqual(0);
        const ith = ithalatKirilimi(brut, c);
        expect(ith.nakit).toBe(brut + ith.makas + ith.prim + ith.komisyon);
        expect(ith.makas).toBeGreaterThanOrEqual(0);
        expect(ith.prim).toBeGreaterThanOrEqual(0);
        expect(ith.komisyon).toBeGreaterThanOrEqual(0);
        expect(ith.vergi).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("prim, komisyon, tarife ve vergi 0 iken eski tek çarpımla (brüt x çarpan / PPM) birebir aynıdır", () => {
    for (const brut of [1, 3, 17, 1_234_567, 987_654_321]) {
      expect(ihracatKirilimi(brut, C0).nakit).toBe(Math.floor((brut * 900_000) / PPM));
      expect(ithalatKirilimi(brut, C0).nakit).toBe(Math.floor((brut * 1_100_000) / PPM));
    }
  });

  it("birim nakit çarpanları: ithalat >= PPM >= ihracat; etiket fiyatı tarife ve vergiyi içerir", () => {
    const { s } = kurPazar();
    korumayiBitir(s, "a");
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    o.ticaretRejimi = { ithalatTarifePpm: 100_000, ihracatVergisiPpm: 50_000 };
    const sehir = s.ic.bolgeIndeks["m_sehir"] as number;
    const k = ticaretNakitCarpanlari(s.dunya, s.baglam, o, sehir);
    expect(k.ithalatPpm).toBeGreaterThan(PPM);
    expect(k.ihracatPpm).toBeLessThan(PPM);
    // nakit çarpana tarife girmez (hazineye geri yazılır); etiket fiyatına girer
    expect(k.etiketIthalatPpm).toBeGreaterThan(k.ithalatPpm);
    expect(k.etiketIhracatPpm).toBeLessThan(k.ihracatPpm);
  });
});

describe("komisyon ve tarife: yeni oyuncu koruması muafiyeti (H6)", () => {
  it("koruma süresince komisyon, tarife ve ihracat vergisi 0; koruma bitince uygulanır", () => {
    const { s } = kurPazar();
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    o.ticaretRejimi = { ithalatTarifePpm: 100_000, ihracatVergisiPpm: 50_000 };
    const sehir = s.ic.bolgeIndeks["m_sehir"] as number;
    const korumali = ticaretCarpanlari(s.dunya, s.baglam, o, sehir);
    expect(korumali.komisyonPpm).toBe(0);
    expect(korumali.tarifePpm).toBe(0);
    expect(korumali.ihracatVergisiPpm).toBe(0);
    expect(korumali.primPpm).toBe(60_000); // prim korumadan etkilenmez (taşıma bedeli)
    korumayiBitir(s, "a");
    const sonra = ticaretCarpanlari(s.dunya, s.baglam, o, sehir);
    expect(sonra.komisyonPpm).toBe(10_000);
    expect(sonra.tarifePpm).toBe(100_000);
    expect(sonra.ihracatVergisiPpm).toBe(50_000);
  });
});

describe("NPC likidite ölçeği ve açık işaret (P2)", () => {
  it("fiyatı belirleyen NPC olarak işaretlidir", () => {
    const { s } = kurPazar();
    expect(s.dunya.pazar.kaynak).toBe("npc");
  });

  it("oyuncu sayısı tabana (4) kadar ölçek 1; üstünde orantılı büyür", () => {
    const { s } = kurPazar();
    const pz = pazarTablosu(s.ic)!;
    expect(npcLikiditeOlcekPpm(pz, 1)).toBe(PPM);
    expect(npcLikiditeOlcekPpm(pz, 4)).toBe(PPM);
    expect(npcLikiditeOlcekPpm(pz, 5)).toBe(1_250_000);
    expect(npcLikiditeOlcekPpm(pz, 8)).toBe(2_000_000);
    expect(npcLikiditeOlcekPpm(null, 50)).toBe(PPM); // pazar v1 kapalı: ölçek yok
  });

  it("5 oyuncuda dünya pazarının emilim hacmi 1,25 kat: gerçekleşen ihracat tavanı büyür", () => {
    const yakitTavani = (oyuncular: Record<string, string[]>): number => {
      const { s } = kurPazar({ oyuncular });
      verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 100_000_000 });
      saatKos(s, 2);
      return bolge(s, "m_liman").ticaretEmirleri[0]!.gerceklesenSaat;
    };
    const dort = yakitTavani({ a: ["m_ova", "m_liman", "m_gecit", "m_dag"], b: ["m_sehir"], c: ["m_col"] });
    const bes = yakitTavani({ a: ["m_ova", "m_liman", "m_gecit"], b: ["m_sehir"], c: ["m_col"], d: ["m_dag"], e: [] });
    expect(dort).toBe(300_000); // yakıt emilimi 300 birim/saat
    expect(bes).toBe(375_000);
  });
});

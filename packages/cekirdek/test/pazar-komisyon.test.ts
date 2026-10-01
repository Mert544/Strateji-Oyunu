/**
 * Komisyon, tarife ve ihracat vergisi muhasebesi (B3, P3): hazine korunumu. Kalemler: makas (NPC), liman primi (taşıma),
 * komisyon (sisteme); tarife ve ihracat vergisi hazineye geri yazılır (B3'te tek hazine; net 0, defterde ayrı kalem).
 *
 *   Δhazine = brütİhracat - brütİthalat - (makas + prim + komisyon) + vergi geliri - para lavaboları
 */
import { describe, expect, it } from "vitest";
import { anlikHazine } from "../src/stok";
import { saatKos, verTamam } from "./ekonomi-yardimci";
import { kurPazar, korumayiBitir } from "./pazar-yardimci";

/** Ticaret dışı tüm gelir/giderleri kapatır: vergi 0, lavabolar zaten kapalı (kur). */
function sadeceTicaret(s: ReturnType<typeof kurPazar>["s"]): void {
  verTamam(s, "a", { tur: "vergi_ayarla", oranPpm: 0 });
  verTamam(s, "b", { tur: "vergi_ayarla", oranPpm: 0 });
}

describe("hazine korunumu", () => {
  it("Δhazine = brüt ihracat - brüt ithalat - (makas + prim + komisyon); iki limanlı, çok mallı ticaret", () => {
    const { s } = kurPazar();
    korumayiBitir(s, "a");
    sadeceTicaret(s);
    const h0 = anlikHazine(s.dunya, "a");
    for (const [mal, yon, liman, oran] of [
      ["yakit", "ihracat", "m_liman", 25_000],
      ["yakit", "ihracat", "m_sehir", 10_000],
      ["petrol", "ithalat", "m_sehir", 15_000],
      ["gida", "ithalat", "m_liman", 30_000],
      ["parca", "ihracat", "m_sehir", 12_000],
    ] as const) {
      verTamam(s, "a", { tur: "ticaret_emri", bolge: liman, mal, yon, oranSaat: oran });
    }
    saatKos(s, 72);
    const df = s.dunya.oyuncular.find((o) => o.id === "a")!.ticaretDefteri!;
    const { toplam } = df;
    expect(toplam.brutIhracat).toBeGreaterThan(0);
    expect(toplam.brutIthalat).toBeGreaterThan(0);
    expect(toplam.prim).toBeGreaterThan(0);
    expect(toplam.komisyon).toBeGreaterThan(0);
    // Kalem kesintileri hazine hesabına işlenir; çözüm sıklığı kadar tamsayı yuvarlama farkı (kalem x çözüm sayısı) toleransıdır.
    const beklenen = toplam.brutIhracat - toplam.brutIthalat - toplam.makas - toplam.prim - toplam.komisyon;
    const gercek = anlikHazine(s.dunya, "a") - h0;
    const tolerans = s.dunya.lojistik.cozumSayisi * 8;
    expect(Math.abs(gercek - beklenen)).toBeLessThanOrEqual(tolerans);
  });

  it("komisyon sisteme gider: işlem değerinin %1'i (koruma bitince); koruma süresince 0", () => {
    const { s } = kurPazar();
    sadeceTicaret(s);
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 20_000 });
    saatKos(s, 24);
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    expect(o.ticaretDefteri!.toplam.komisyon).toBe(0); // 7 günlük koruma
    korumayiBitir(s, "a");
    saatKos(s, 24);
    expect(o.ticaretDefteri!.toplam.komisyon).toBeGreaterThan(0);
  });

  it("tarife ve ihracat vergisi hazineye geri yazılır: komisyon 0 iken hazine tarifesiz dünyayla birebir aynı; defterde ayrı kalem", () => {
    const kos = (tarife: number, vergi: number) => {
      const { s } = kurPazar({ duzenle: (v) => { v.param.pazar.islemKomisyonuPpm = 0; } });
      korumayiBitir(s, "a");
      sadeceTicaret(s);
      const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
      o.ticaretRejimi = { ithalatTarifePpm: tarife, ihracatVergisiPpm: vergi };
      verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_sehir", mal: "yakit", yon: "ihracat", oranSaat: 20_000 });
      verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "gida", yon: "ithalat", oranSaat: 20_000 });
      saatKos(s, 48);
      return { hazine: anlikHazine(s.dunya, "a"), toplam: o.ticaretDefteri!.toplam };
    };
    const yok = kos(0, 0);
    const var_ = kos(200_000, 100_000);
    expect(var_.toplam.ithalatTarifesi).toBeGreaterThan(0);
    expect(var_.toplam.ihracatVergisi).toBeGreaterThan(0);
    expect(yok.toplam.ithalatTarifesi).toBe(0);
    expect(yok.toplam.ihracatVergisi).toBe(0);
    expect(var_.hazine).toBe(yok.hazine);
  });

  it("vergi oranları: ihracat vergisi makas ve prim sonrası değerin %10'u; tarife makas ve prim sonrası bedelin %20'si (tek yönlü koşular)", () => {
    const tek = (yon: "ihracat" | "ithalat") => {
      const { s } = kurPazar({ duzenle: (v) => { v.param.pazar.islemKomisyonuPpm = 0; } });
      korumayiBitir(s, "a");
      sadeceTicaret(s);
      const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
      o.ticaretRejimi = { ithalatTarifePpm: 200_000, ihracatVergisiPpm: 100_000 };
      verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_sehir", mal: yon === "ihracat" ? "yakit" : "gida", yon, oranSaat: 20_000 });
      saatKos(s, 48);
      return o.ticaretDefteri!.toplam;
    };
    const ihr = tek("ihracat");
    expect(ihr.ihracatVergisi).toBeGreaterThan(0);
    expect(Math.abs(ihr.ihracatVergisi / (ihr.brutIhracat - ihr.makas - ihr.prim) - 0.1)).toBeLessThan(0.002);
    const ith = tek("ithalat");
    expect(ith.ithalatTarifesi).toBeGreaterThan(0);
    expect(Math.abs(ith.ithalatTarifesi / (ith.brutIthalat + ith.makas + ith.prim) - 0.2)).toBeLessThan(0.002);
  });

  it("koruma süresince tarife ve ihracat vergisi de uygulanmaz", () => {
    const { s } = kurPazar();
    sadeceTicaret(s);
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    o.ticaretRejimi = { ithalatTarifePpm: 200_000, ihracatVergisiPpm: 100_000 };
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_sehir", mal: "yakit", yon: "ihracat", oranSaat: 20_000 });
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "gida", yon: "ithalat", oranSaat: 20_000 });
    saatKos(s, 24);
    expect(o.ticaretDefteri!.toplam.ithalatTarifesi).toBe(0);
    expect(o.ticaretDefteri!.toplam.ihracatVergisi).toBe(0);
  });

  it("yeni oyuncunun ticaret rejimi varsayılan 0 (komutu B4'te); defter başlangıçta boş", () => {
    const { s } = kurPazar();
    const o = s.dunya.oyuncular.find((x) => x.id === "b")!;
    expect(o.ticaretRejimi).toEqual({ ithalatTarifePpm: 0, ihracatVergisiPpm: 0 });
    expect(Object.values(o.ticaretDefteri!.toplam).every((x) => x === 0)).toBe(true);
  });

  it("ticaret hiç yoksa defter kalemleri 0 kalır", () => {
    const { s } = kurPazar();
    saatKos(s, 24);
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    expect(Object.values(o.ticaretDefteri!.toplam).every((x) => x === 0)).toBe(true);
  });
});

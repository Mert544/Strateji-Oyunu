/**
 * Açık NPC makası (B3, P2): anlaşma ve yaptırım makası değiştirir; makas, eski ithalat/ihracat çarpanlarıyla eşdeğerdir
 * (makas 200 000 -> 1,1 / 0,9; anlaşma 100 000 -> 1,05 / 0,95; yaptırım 600 000 -> 1,3 / 0,7); makas geliri defterde görünür.
 */
import { describe, expect, it } from "vitest";
import { pazarCarpanlari } from "../src/politika";
import { oyuncuMakasPpm } from "../src/politika";
import { saatKos, verTamam } from "./ekonomi-yardimci";
import { kurPazar, korumayiBitir, pazarKapat } from "./pazar-yardimci";

function makasKumeleri(s: ReturnType<typeof kurPazar>["s"]) {
  const d = s.dunya;
  const ctx = s.baglam;
  const varsayilan = pazarCarpanlari(d, ctx, "a");
  verTamam(s, "a", { tur: "anlasma_teklif", karsi: "b", anlasma: "ticaret" });
  verTamam(s, "b", { tur: "anlasma_teklif", karsi: "a", anlasma: "ticaret" });
  const anlasma = pazarCarpanlari(d, ctx, "a");
  verTamam(s, "b", { tur: "yaptirim", hedef: "a", aktif: true });
  const yaptirim = pazarCarpanlari(d, ctx, "a");
  return { varsayilan, anlasma, yaptirim };
}

describe("makas ve eski çarpan eşdeğerliği", () => {
  it("pazar v1 açık: makastan türeyen çarpanlar eski alanlarla birebir aynıdır (varsayılan, anlaşma, yaptırım)", () => {
    const { s: acik } = kurPazar();
    const { s: kapali } = kurPazar({ duzenle: (v) => pazarKapat(v) });
    const a = makasKumeleri(acik);
    const k = makasKumeleri(kapali);
    expect(a.varsayilan).toEqual({ ithalatPpm: 1_100_000, ihracatPpm: 900_000 });
    expect(a.anlasma).toEqual({ ithalatPpm: 1_050_000, ihracatPpm: 950_000 });
    expect(a.yaptirim).toEqual({ ithalatPpm: 1_300_000, ihracatPpm: 700_000 });
    expect(a).toEqual(k);
  });

  it("makas = ithalat çarpanı - ihracat çarpanı: 200 000 / 100 000 / 600 000", () => {
    const { s } = kurPazar();
    expect(oyuncuMakasPpm(s.dunya, s.baglam, "a")).toBe(200_000);
    verTamam(s, "a", { tur: "anlasma_teklif", karsi: "b", anlasma: "ticaret" });
    verTamam(s, "b", { tur: "anlasma_teklif", karsi: "a", anlasma: "ticaret" });
    expect(oyuncuMakasPpm(s.dunya, s.baglam, "a")).toBe(100_000);
    verTamam(s, "b", { tur: "yaptirim", hedef: "a", aktif: true });
    expect(oyuncuMakasPpm(s.dunya, s.baglam, "a")).toBe(600_000);
    // yaptırım yalnız hedefi etkiler
    expect(oyuncuMakasPpm(s.dunya, s.baglam, "b")).toBe(100_000);
  });

  it("makas parametresi değişince çarpan değişir (eski alanlar yok sayılır): makas 400 000 -> 1,2 / 0,8", () => {
    const { s } = kurPazar({ duzenle: (v) => { v.param.pazar.makasPpm = 400_000; } });
    expect(pazarCarpanlari(s.dunya, s.baglam, "a")).toEqual({ ithalatPpm: 1_200_000, ihracatPpm: 800_000 });
  });

  it("ticaret anlaşması bozulunca ve yaptırım kalkınca makas varsayılana döner", () => {
    const { s } = kurPazar();
    verTamam(s, "b", { tur: "yaptirim", hedef: "a", aktif: true });
    expect(oyuncuMakasPpm(s.dunya, s.baglam, "a")).toBe(600_000);
    verTamam(s, "b", { tur: "yaptirim", hedef: "a", aktif: false });
    expect(oyuncuMakasPpm(s.dunya, s.baglam, "a")).toBe(200_000);
  });
});

describe("makas geliri (NPC) defterde", () => {
  /** Dünya kapısı limanından (prim 0) yalnız ihracat; koruma bitmiş (komisyon 0 değil) -> makas, prim ve komisyon ayrı kalem. */
  function ihracatKos(kumeKur?: (s: ReturnType<typeof kurPazar>["s"]) => void) {
    const { s } = kurPazar();
    korumayiBitir(s, "a");
    kumeKur?.(s);
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 20_000 });
    saatKos(s, 24);
    return s.dunya.oyuncular.find((o) => o.id === "a")!.ticaretDefteri!.toplam;
  }

  it("varsayılan makas: ihracatın brüt değerinin %10'u makas, %1'i komisyon; kapıda prim 0", () => {
    const t = ihracatKos();
    expect(t.brutIhracat).toBeGreaterThan(0);
    expect(t.prim).toBe(0);
    expect(Math.abs(t.makas / t.brutIhracat - 0.1)).toBeLessThan(0.002);
    // komisyon makas sonrası değerin %1'i
    expect(Math.abs(t.komisyon / (t.brutIhracat - t.makas) - 0.01)).toBeLessThan(0.002);
  });

  it("yaptırım altında makas %30; ticaret anlaşmasında %5 (anlaşma makası daraltır, yaptırım genişletir)", () => {
    const yaptirim = ihracatKos((s) => verTamam(s, "b", { tur: "yaptirim", hedef: "a", aktif: true }));
    expect(Math.abs(yaptirim.makas / yaptirim.brutIhracat - 0.3)).toBeLessThan(0.002);
    const anlasma = ihracatKos((s) => {
      verTamam(s, "a", { tur: "anlasma_teklif", karsi: "b", anlasma: "ticaret" });
      verTamam(s, "b", { tur: "anlasma_teklif", karsi: "a", anlasma: "ticaret" });
    });
    expect(Math.abs(anlasma.makas / anlasma.brutIhracat - 0.05)).toBeLessThan(0.002);
  });

  it("makas geliri iki yönde de birikir: ithalat makası ithalat brütünün %10'u", () => {
    const { s } = kurPazar();
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ithalat", oranSaat: 20_000 });
    saatKos(s, 24);
    const t = s.dunya.oyuncular.find((o) => o.id === "a")!.ticaretDefteri!.toplam;
    expect(t.brutIthalat).toBeGreaterThan(0);
    expect(Math.abs(t.makas / t.brutIthalat - 0.1)).toBeLessThan(0.002);
  });
});

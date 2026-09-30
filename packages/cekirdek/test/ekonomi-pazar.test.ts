/**
 * Dünya pazarı: ticaret emirleri, hacim sınırları, orantılı paylaşım, fiyat kelepçesi, hazine etkisi.
 */
import { describe, expect, it } from "vitest";
import { SAAT } from "../src/tipler";
import { bolge, hazine, kur, malNo, saatKos, verTamam } from "./ekonomi-yardimci";

/** m_sehir'e de liman etiketi ekler (iki oyuncunun da limanı olsun). */
const IKI_LIMAN = {
  oyuncular: { a: ["m_ova", "m_liman", "m_gecit", "m_dag"], b: ["m_sehir", "m_col"] },
  duzenle: (veri: { harita: { bolgeler: { id: string; etiketler: string[] }[] } }) => {
    veri.harita.bolgeler.find((b) => b.id === "m_sehir")!.etiketler.push("liman");
  },
};

describe("ihracat ve hazine", () => {
  it("ihracat emri hazineyi artirir ve gerceklesen ihracat pazar hacmiyle sinirlidir", () => {
    const { s } = kur();
    const { s: taban } = kur();
    const yakit = malNo(s, "yakit");
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 50_000 });
    saatKos(s, 48);
    saatKos(taban, 48);
    expect(hazine(s, "a")).toBeGreaterThan(hazine(taban, "a"));
    const emir = bolge(s, "m_liman").ticaretEmirleri[0]!;
    expect(emir.gerceklesenSaat).toBeGreaterThan(0);
    expect(emir.gerceklesenSaat).toBeLessThanOrEqual(50_000);
    expect(s.dunya.pazar.oyuncuArzi[yakit]).toBe(emir.gerceklesenSaat);

    // Aşırı emir: gerçekleşen, dünya pazarının emilim hacmini (yakıt 150000/saat) aşmaz
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 100_000_000 });
    saatKos(s, 2);
    expect(bolge(s, "m_liman").ticaretEmirleri[0]!.gerceklesenSaat).toBe(s.ic.param.pazar.emilimSaat["yakit"]);
  });

  it("ihracat fiyati dusurur, ithalat yukseltir", () => {
    const { s } = kur();
    const { s: ihr } = kur();
    const { s: ith } = kur();
    const yakit = malNo(s, "yakit");
    verTamam(ihr, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 100_000 });
    verTamam(ith, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ithalat", oranSaat: 100_000 });
    saatKos(s, 3);
    saatKos(ihr, 3);
    saatKos(ith, 3);
    expect(ihr.dunya.pazar.fiyat[yakit]!).toBeLessThan(s.dunya.pazar.fiyat[yakit]!);
    expect(ith.dunya.pazar.fiyat[yakit]!).toBeGreaterThan(s.dunya.pazar.fiyat[yakit]!);
  });

  it("stoksuz ve uretimsiz bolgenin ihracati 0 olur", () => {
    const { s } = kur();
    const muhimmat = malNo(s, "muhimmat");
    const st = bolge(s, "m_liman").stoklar[muhimmat]!;
    st.miktar = 0; // m_liman'da mühimmat üretimi ve ihtiyacı yok
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "muhimmat", yon: "ihracat", oranSaat: 10_000 });
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 10_000 });
    saatKos(s, 2);
    const emirler = bolge(s, "m_liman").ticaretEmirleri;
    expect(emirler.find((e) => e.mal === muhimmat)!.gerceklesenSaat).toBe(0);
    expect(emirler.find((e) => e.mal === malNo(s, "yakit"))!.gerceklesenSaat).toBe(10_000);
  });
});

describe("ithalat", () => {
  it("hazinesi 0 olan oyuncunun ithalati 0 olur; parasi olunca gerceklesir ve hazineyi azaltir", () => {
    const { s } = kur();
    const gida = malNo(s, "gida");
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    const vergiGelirsiz = { tur: "vergi_ayarla", oranPpm: 0 } as const;
    verTamam(s, "a", vergiGelirsiz);
    o.hazine.miktar = 0;
    o.hazine.yerelOran = 0;
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "gida", yon: "ithalat", oranSaat: 20_000 });
    saatKos(s, 2);
    expect(bolge(s, "m_liman").ticaretEmirleri[0]!.gerceklesenSaat).toBe(0);
    expect(s.dunya.pazar.oyuncuTalebi[gida]).toBe(0);

    o.hazine.miktar = 10_000_000;
    saatKos(s, 1);
    expect(bolge(s, "m_liman").ticaretEmirleri[0]!.gerceklesenSaat).toBe(20_000);
    const p = hazine(s, "a");
    saatKos(s, 1);
    expect(hazine(s, "a")).toBeLessThan(p); // ithalat gideri (vergi yok)
  });
});

describe("orantili paylasim", () => {
  it("toplam istek emilimi asinca emirler istenenle orantili kisilir", () => {
    const { s } = kur(IKI_LIMAN);
    const yakit = malNo(s, "yakit");
    const cap = s.ic.param.pazar.emilimSaat["yakit"]!;
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 300_000 });
    verTamam(s, "b", { tur: "ticaret_emri", bolge: "m_sehir", mal: "yakit", yon: "ihracat", oranSaat: 100_000 });
    saatKos(s, 2);
    const ga = bolge(s, "m_liman").ticaretEmirleri[0]!.gerceklesenSaat;
    const gb = bolge(s, "m_sehir").ticaretEmirleri[0]!.gerceklesenSaat;
    expect(ga + gb).toBe(cap);
    expect(ga).toBe(112_500);
    expect(gb).toBe(37_500);
    expect(s.dunya.pazar.oyuncuArzi[yakit]).toBe(cap);
  });

  it("tamsayi artan birimler sirayla ilk emirlere verilir; toplam tam emilime esit", () => {
    const { s } = kur(IKI_LIMAN);
    const cap = s.ic.param.pazar.emilimSaat["yakit"]!;
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 100_001 });
    verTamam(s, "b", { tur: "ticaret_emri", bolge: "m_sehir", mal: "yakit", yon: "ihracat", oranSaat: 200_000 });
    saatKos(s, 2);
    const ga = bolge(s, "m_liman").ticaretEmirleri[0]!.gerceklesenSaat;
    const gb = bolge(s, "m_sehir").ticaretEmirleri[0]!.gerceklesenSaat;
    expect(ga + gb).toBe(cap);
    expect(ga).toBe(50_001); // floor(100001 × 150000 / 300001) = 50000, artan 1 birim ilk emre
    expect(gb).toBe(99_999);
  });
});

describe("fiyat", () => {
  it("fiyat tabanin %25 ile %175'i arasinda kalir (asiri talep ve asiri arz)", () => {
    const yuksek = kur({
      duzenle: (v) => {
        v.param.pazar.emilimSaat["yakit"] = 1_000_000_000;
        v.param.pazar.arzSaat["yakit"] = 1;
      },
    });
    const dusuk = kur({
      duzenle: (v) => {
        v.param.pazar.emilimSaat["yakit"] = 1;
        v.param.pazar.arzSaat["yakit"] = 1_000_000_000;
      },
    });
    saatKos(yuksek.s, 2);
    saatKos(dusuk.s, 2);
    const y = malNo(yuksek.s, "yakit");
    const taban = yuksek.s.ic.mallar[y]!.tabanFiyat;
    expect(yuksek.s.dunya.pazar.fiyat[y]).toBe(taban + Math.floor((taban * 750_000) / 1_000_000));
    expect(dusuk.s.dunya.pazar.fiyat[y]).toBe(taban - Math.floor((taban * 750_000) / 1_000_000));
    expect(yuksek.s.dunya.pazar.fiyat[y]! / taban).toBeLessThanOrEqual(1.75);
    expect(dusuk.s.dunya.pazar.fiyat[y]! / taban).toBeGreaterThanOrEqual(0.25);
  });

  it("7 gunluk rastgele emirlerle her mal fiyati her saat araliktadir", () => {
    const { s } = kur(IKI_LIMAN);
    const mallar = s.ic.mallar.map((m) => m.id);
    mallar.forEach((mal, i) => {
      verTamam(s, i % 2 === 0 ? "a" : "b", {
        tur: "ticaret_emri",
        bolge: i % 2 === 0 ? "m_liman" : "m_sehir",
        mal,
        yon: i % 3 === 0 ? "ithalat" : "ihracat",
        oranSaat: 10_000 + i * 70_000,
      });
    });
    for (let h = 0; h < 7 * 24; h++) {
      s.calistirKadar((h + 1) * SAAT);
      s.dunya.pazar.fiyat.forEach((f, m) => {
        const taban = s.ic.mallar[m]!.tabanFiyat;
        expect(f).toBeGreaterThanOrEqual(Math.floor(taban / 4));
        expect(f).toBeLessThanOrEqual(Math.floor((taban * 7) / 4));
      });
    }
  });
});

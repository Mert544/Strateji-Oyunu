/**
 * Tarım katmanı (B1): gübre dozu (etki, maliyet, karşılanma), gübre malının kaynakları (gübre fabrikası, ahır).
 */
import { describe, expect, it } from "vitest";
import type { VeriPaketi } from "@bolge/veri";
import { GUN, PPM, SAAT } from "../src/tipler";
import { bolge, kur, malNo, simdiyiIsle, stok, ver, verTamam } from "./ekonomi-yardimci";
import { tarimAc } from "./yenilikler";

/** m_ova'da 10 000 birim gübre stoku (depo kapasitesi sınırı) ile tarım açık. */
function gubreliVeri(v: VeriPaketi): void {
  tarimAc(v);
  v.param.baslangic.stok["gubre"] = 10_000_000;
}

function iklimiSabitle(s: ReturnType<typeof kur>["s"]): void {
  bolge(s, "m_ova").tarim!.iklimPpm = PPM;
  s.baglam.kirlet(s.dunya);
  simdiyiIsle(s);
}

describe("gubre_dozu komutu", () => {
  it("doz 0..azamiGubreDozu tamsayı; yalnız sahip; tarım alanı olmayan bölge reddedilir", () => {
    const { s } = kur({ duzenle: tarimAc });
    expect(ver(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: -1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 4 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 1.5 }).tamam).toBe(false);
    expect(ver(s, "b", { tur: "gubre_dozu", bolge: "m_ova", doz: 1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "gubre_dozu", bolge: "m_gecit", doz: 1 }).tamam).toBe(false);
    expect(bolge(s, "m_ova").tarim!.gubreDozu).toBe(0);
    verTamam(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 3 });
    expect(bolge(s, "m_ova").tarim!.gubreDozu).toBe(3);
  });
});

describe("gübre etkisi ve maliyeti", () => {
  it("doz başına çıktı +%6 (doz 3: x1,18) ve maliyet doz x 4 birim/saat x çiftlik sayısı", () => {
    const { s } = kur({ duzenle: gubreliVeri });
    s.calistirKadar(SAAT);
    iklimiSabitle(s);
    const tahil = malNo(s, "tahil");
    const gubre = malNo(s, "gubre");
    const taban = bolge(s, "m_ova").uretimOrani[tahil]!;
    expect(taban).toBe(200_000);
    const yerel0 = bolge(s, "m_ova").stoklar[gubre]!.yerelOran;
    verTamam(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 3 });
    simdiyiIsle(s);
    expect(bolge(s, "m_ova").uretimOrani[tahil]!).toBe(Math.floor((taban * 1_180_000) / PPM));
    // Tüketim: 3 doz x 4 000 mili-birim/saat x 1 çiftlik = 12 000 mili-birim/saat (+ aynı bozulma)
    const yerel3 = bolge(s, "m_ova").stoklar[gubre]!.yerelOran;
    expect(yerel0 - yerel3).toBe(12_000);
    expect(bolge(s, "m_ova").tarim!.gubreKarsilanmaPpm).toBe(PPM);
  });

  it("gübre stoktan düşer: 10 saatte ~doz x 4 birim/saat x 10 (bozulma hariç)", () => {
    const { s } = kur({ duzenle: gubreliVeri });
    verTamam(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 2 });
    s.calistirKadar(SAAT);
    const once = stok(s, "m_ova", "gubre");
    s.calistirKadar(11 * SAAT);
    const sonra = stok(s, "m_ova", "gubre");
    const harcanan = once - sonra;
    // 2 doz x 4 000 x 10 saat = 80 000 mili-birim; bozulma 10M x %0,1/gün / 24 x 10 ~ 4 200
    expect(harcanan).toBeGreaterThan(80_000);
    expect(harcanan).toBeLessThan(80_000 + 6_000);
  });

  it("gübreli monokültür toprağı korur (doz 3: -9000 + 3 x 3000 = 0); gübresiz düşer", () => {
    const { s } = kur({ duzenle: gubreliVeri });
    verTamam(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 3 });
    s.calistirKadar(15 * GUN);
    expect(bolge(s, "m_ova").tarim!.toprakPpm).toBe(PPM);
    expect(bolge(s, "m_sehir").tarim!.toprakPpm).toBe(PPM - 15 * 9_000); // dozsuz çiftlik
    // Gübre stoku azaldı (gübre harcandı)
    expect(stok(s, "m_ova", "gubre")).toBeLessThan(10_000_000);
  });

  it("gübre yoksa etki de yok (karşılanma 0): çıktı x1,0, toprak düşer", () => {
    const { s } = kur({ duzenle: tarimAc }); // gübre stoku 0
    verTamam(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 3 });
    s.calistirKadar(SAAT);
    iklimiSabitle(s);
    expect(bolge(s, "m_ova").tarim!.gubreKarsilanmaPpm).toBe(0);
    expect(bolge(s, "m_ova").uretimOrani[malNo(s, "tahil")]!).toBe(200_000);
    s.calistirKadar(10 * GUN);
    expect(bolge(s, "m_ova").tarim!.toprakPpm).toBe(PPM - 10 * 9_000);
  });

  it("kısmi gübre: stok biterken karşılanma düşer ve etki orantılı azalır; gübre stoku negatife inmez", () => {
    // Bölge yalnız başına (komşu stokları gübre sağlamasın): 200 birim, 12 birim/saat -> ~16 saatte biter.
    const { s } = kur({ oyuncular: { a: ["m_ova"] }, duzenle: (v) => { tarimAc(v); v.param.baslangic.stok["gubre"] = 200_000; } });
    verTamam(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 3 });
    let enKucuk = PPM;
    for (let sa = 1; sa <= 48; sa++) {
      s.calistirKadar(sa * SAAT);
      expect(stok(s, "m_ova", "gubre")).toBeGreaterThanOrEqual(0);
      enKucuk = Math.min(enKucuk, bolge(s, "m_ova").tarim!.gubreKarsilanmaPpm);
    }
    expect(enKucuk).toBeLessThan(PPM);
    expect(stok(s, "m_ova", "gubre")).toBeLessThan(50_000);
  });
});

describe("gübre kaynakları (içerik)", () => {
  it("gübre fabrikası petrolden gübre üretir; ahır tahılı gıdaya + gübreye çevirir", () => {
    const { s } = kur({ duzenle: tarimAc });
    const ic = s.ic;
    const fab = ic.yontemler[ic.yontemIndeks["azotlu_gubre"]!]!;
    expect(fab.girdiler["petrol"]).toBe(50_000);
    expect(fab.ciktilar["gubre"]).toBe(40_000);
    const ahir = ic.yontemler[ic.yontemIndeks["ahir_besi"]!]!;
    expect(ahir.ciktilar["gubre"]).toBeGreaterThan(0);
    expect(ahir.ciktilar["gida"]).toBe(70_000);
    // Gübre malı: ara kategori, taban fiyat 140 para
    const m = ic.mallar[ic.malIndeks["gubre"]!]!;
    expect(m.kategori).toBe("ara");
    expect(m.tabanFiyat).toBe(140_000);
  });

  it("m_ova'da inşa edilen ahır gübre üretir ve aynı bölgedeki çiftliğe doz karşılığı akar", () => {
    const { s } = kur({
      duzenle: (v) => {
        tarimAc(v);
        v.harita.bolgeler.find((b) => b.id === "m_ova")!.tesisler.push("ahir");
      },
    });
    verTamam(s, "a", { tur: "gubre_dozu", bolge: "m_ova", doz: 1 });
    s.calistirKadar(48 * SAAT);
    const gubre = malNo(s, "gubre");
    expect(bolge(s, "m_ova").uretimToplam[gubre]!).toBeGreaterThan(0);
    // Ahır girdisi tahıldır: tahıl çiftlikten gelir
    expect(bolge(s, "m_ova").tarim!.gubreKarsilanmaPpm).toBeGreaterThan(0);
  });
});

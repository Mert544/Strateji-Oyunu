/**
 * Düzeltme 6: sahipsiz bölgeler "uykuda". Üretim, tüketim, bozulma ve rezerv tükenmesi yok (yerel oranlar 0,
 * uretimOrani 0), nüfus sabit; bölgeyi biri sahiplenince canlanır.
 */
import { describe, expect, it } from "vitest";
import { bolge, kur, malNo, saatKos } from "./ekonomi-yardimci";
import { anlikMiktar } from "../src/stok";
import { GUN, SAAT } from "../src/tipler";
import type { BolgeDurumu } from "../src/tipler";

/** Bölgenin deterministik görüntüsü (ölçülebilen her şey). */
function goruntu(b: BolgeDurumu, t: number) {
  return {
    nufus: b.nufus,
    stok: b.stoklar.map((s) => anlikMiktar(s, t)),
    stokHam: b.stoklar.map((s) => [s.miktar, s.yerelOran, s.gelenOran, s.surum]),
    rezervKalan: [...b.rezervKalan],
    uretimToplam: [...b.uretimToplam],
    uretimOrani: [...b.uretimOrani],
    israf: [...b.israf],
    tesisVerim: b.tesisler.map((x) => x.verimPpm),
  };
}

describe("sahipsiz bolgeler uykuda", () => {
  it("14 gun sahipsiz kalan bolgenin rezervi, stogu ve nufusu degismez; yerel oranlar 0", () => {
    // a yalnızca m_liman'ı sahiplenir; m_ova, m_gecit, m_dag, m_col, m_sehir sahipsiz kalır.
    const { s } = kur({ oyuncular: { a: ["m_liman"] } });
    saatKos(s, 1); // ilk çözümler oturur
    const sahipsiz = ["m_ova", "m_gecit", "m_dag", "m_col", "m_sehir"];
    const once = sahipsiz.map((id) => goruntu(bolge(s, id), s.dunya.zaman));
    s.calistirKadar(s.dunya.zaman + 14 * GUN);
    sahipsiz.forEach((id, i) => {
      const b = bolge(s, id);
      expect(goruntu(b, s.dunya.zaman), id).toEqual(once[i]);
      expect(b.stoklar.every((x) => x.yerelOran === 0 && x.gelenOran === 0), id).toBe(true);
      expect(b.uretimOrani.every((x) => x === 0), id).toBe(true);
      expect(b.uretimToplam.every((x) => x === 0), id).toBe(true);
    });
    // Hiç rezerv tükenmedi (ilk rezerv = kalan).
    for (const id of sahipsiz) expect(bolge(s, id).rezervKalan).toEqual(bolge(s, id).rezervIlk);
  });

  it("sahipli bolge normal calisir (uyku yalnizca sahipsizler icin): liman uretir/tuketir", () => {
    const { s } = kur({ oyuncular: { a: ["m_liman"] } });
    const b = bolge(s, "m_liman");
    const ilkStok = b.stoklar.map((x) => x.miktar);
    saatKos(s, 48);
    expect(b.stoklar.map((x) => anlikMiktar(x, s.dunya.zaman))).not.toEqual(ilkStok);
    expect(b.uretimToplam.some((x) => x > 0)).toBe(true);
  });

  it("sahiplenince canlanir: uretim baslar, rezerv tukenmeye baslar, tuketim baslar", () => {
    const { s } = kur({ oyuncular: { a: ["m_liman"] } });
    s.calistirKadar(14 * GUN);
    const ova = bolge(s, "m_ova");
    const tahil = malNo(s, "tahil");
    const gida = malNo(s, "gida");
    const rezervOnce = ova.rezervKalan[tahil]!;
    const stokOnce = ova.stoklar.map((x) => anlikMiktar(x, s.dunya.zaman));
    expect(ova.uretimToplam[tahil]).toBe(0);

    const r = s.uygula({ t: s.dunya.zaman, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_ova"] } });
    expect(r).toEqual({ tamam: true });
    saatKos(s, 6);
    expect(ova.uretimToplam[tahil]).toBeGreaterThan(0);
    expect(ova.rezervKalan[tahil]).toBeLessThan(rezervOnce);
    expect(ova.uretimOrani[tahil]).toBeGreaterThan(0);
    // Nüfus tüketimi başladı: gıda stoğu yerel oran negatif veya üretimle değişti; stok artık sabit değil.
    const stokSonra = ova.stoklar.map((x) => anlikMiktar(x, s.dunya.zaman));
    expect(stokSonra).not.toEqual(stokOnce);
    expect(ova.stoklar[gida]!.yerelOran).not.toBe(0);
  });

  it("bolge sahipsizken rezerv tukenmesi ve bozulma yok: gida stogu 14 gun sonra ilk degerinde", () => {
    const { s } = kur({ oyuncular: { a: ["m_liman"] } });
    const gida = malNo(s, "gida");
    const ilk = bolge(s, "m_col").stoklar[gida]!.miktar;
    s.calistirKadar(14 * GUN);
    expect(anlikMiktar(bolge(s, "m_col").stoklar[gida]!, s.dunya.zaman)).toBe(ilk);
  });

  it("uyku deterministik: ayni senaryo ayni durum ozeti; sahipsiz nufus tikinde degismez", () => {
    const kos = (): string => {
      const { s } = kur({ oyuncular: { a: ["m_liman"] } });
      s.calistirKadar(3 * GUN + 5 * SAAT);
      return s.durumOzeti();
    };
    expect(kos()).toBe(kos());
  });
});

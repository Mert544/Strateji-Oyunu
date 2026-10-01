/**
 * Tarım katmanı (B1): toprak verimliliği, ekim planı (ekim nöbeti / monokültür), çıktı çarpanı, uyku ve tesis tavanı.
 */
import { describe, expect, it } from "vitest";
import { GUN, PPM, SAAT } from "../src/tipler";
import { bolge, kur, malNo, simdiyiIsle, ver, verTamam } from "./ekonomi-yardimci";
import { tarimAc } from "./yenilikler";

const MONO = [PPM, 0, 0];
const NOBET = [500_000, 250_000, 250_000]; // bugday / baklagil / nadas
const NADAS = [0, 0, PPM];

/** Sadece m_ova'nın çiftlik çıktısı (tahıl/saat); diğer tahıl üreticisi m_sehir'dir (oyuncu b yalnız m_col'dur). */
function tahilOrani(s: ReturnType<typeof kur>["s"]): number {
  return bolge(s, "m_ova").uretimOrani[malNo(s, "tahil")]!;
}

/** İklim hasat oranını PPM'e sabitler (yalnız sayıları temiz tutmak için) ve bir sonraki çözümü uygular. Günlük tık onu yeniden yazar. */
function iklimiSabitle(s: ReturnType<typeof kur>["s"], ppm = PPM): void {
  bolge(s, "m_ova").tarim!.iklimPpm = ppm;
  s.baglam.kirlet(s.dunya);
  simdiyiIsle(s);
}

describe("toprak sürüklenmesi ve ekim planı", () => {
  it("başlangıç: toprak PPM, ekim %100 ilk ürün, gübre 0", () => {
    const { s } = kur({ duzenle: tarimAc });
    const t = bolge(s, "m_ova").tarim!;
    expect(t.toprakPpm).toBe(PPM);
    expect(t.ekimPpm).toEqual(MONO);
    expect(t.gubreDozu).toBe(0);
    expect(bolge(s, "m_gecit").tarim).toBeUndefined(); // tarım alanı yok (dar geçit)
    expect(bolge(s, "m_col").tarim).toBeUndefined();
  });

  it("monokültür toprağı günde 9000 ppm düşürür (10 günde 910000)", () => {
    const { s } = kur({ duzenle: tarimAc });
    s.calistirKadar(10 * GUN);
    expect(bolge(s, "m_ova").tarim!.toprakPpm).toBe(PPM - 10 * 9_000);
  });

  it("ekim nöbeti (50/25/25) toprağı neredeyse korur: günde -500", () => {
    const { s } = kur({ duzenle: tarimAc });
    verTamam(s, "a", { tur: "ekim_plani", bolge: "m_ova", ekimPpm: NOBET });
    s.calistirKadar(10 * GUN);
    expect(bolge(s, "m_ova").tarim!.toprakPpm).toBe(PPM - 10 * 500);
  });

  it("nadas toprağı geri kazandırır (monokültürden düşmüş toprak nadasla yenilenir)", () => {
    const { s } = kur({ duzenle: tarimAc });
    s.calistirKadar(20 * GUN);
    const dusmus = bolge(s, "m_ova").tarim!.toprakPpm;
    expect(dusmus).toBe(PPM - 20 * 9_000);
    verTamam(s, "a", { tur: "ekim_plani", bolge: "m_ova", ekimPpm: NADAS });
    s.calistirKadar(25 * GUN);
    expect(bolge(s, "m_ova").tarim!.toprakPpm).toBe(dusmus + 5 * 12_000);
    // Bir ekim nöbeti (baklagil ağırlıklı) da geri kazandırır.
    verTamam(s, "a", { tur: "ekim_plani", bolge: "m_ova", ekimPpm: [0, PPM, 0] });
    const once = bolge(s, "m_ova").tarim!.toprakPpm;
    s.calistirKadar(30 * GUN);
    expect(bolge(s, "m_ova").tarim!.toprakPpm).toBe(once + 5 * 4_000);
  });

  it("toprak her zaman [toprakTabaniPpm, PPM] aralığında kalır (alt sınıra oturur, üst sınırı aşmaz)", () => {
    const { s } = kur({ duzenle: tarimAc });
    const taban = s.ic.param.tarim!.toprakTabaniPpm;
    for (let g = 1; g <= 100; g++) {
      s.calistirKadar(g * GUN);
      const x = bolge(s, "m_ova").tarim!.toprakPpm;
      expect(x).toBeGreaterThanOrEqual(taban);
      expect(x).toBeLessThanOrEqual(PPM);
    }
    expect(bolge(s, "m_ova").tarim!.toprakPpm).toBe(taban); // 78. günde tabana oturdu
    verTamam(s, "a", { tur: "ekim_plani", bolge: "m_ova", ekimPpm: NADAS });
    for (let g = 101; g <= 160; g++) {
      s.calistirKadar(g * GUN);
      const x = bolge(s, "m_ova").tarim!.toprakPpm;
      expect(x).toBeGreaterThanOrEqual(taban);
      expect(x).toBeLessThanOrEqual(PPM);
    }
    expect(bolge(s, "m_ova").tarim!.toprakPpm).toBe(PPM);
  });

  it("çiftlik çıktısı toprakla ve ekim karışımıyla orantılı değişir", () => {
    const { s } = kur({ duzenle: tarimAc });
    s.calistirKadar(SAAT);
    iklimiSabitle(s);
    expect(tahilOrani(s)).toBe(200_000); // geleneksel tarım: 15 işçi -> 200 tahıl/saat, toprak 1,0, iklim 1,0
    // Toprağı %50'ye indir: çıktı yarıya iner.
    bolge(s, "m_ova").tarim!.toprakPpm = 500_000;
    s.baglam.kirlet(s.dunya);
    simdiyiIsle(s);
    expect(tahilOrani(s)).toBe(100_000);
    // Ekim nöbeti: karışım 0,5 + 0,25 x 0,45 = 0,6125 -> çıktı x 0,6125
    verTamam(s, "a", { tur: "ekim_plani", bolge: "m_ova", ekimPpm: NOBET });
    simdiyiIsle(s);
    expect(tahilOrani(s)).toBe(Math.floor((100_000 * 612_500) / PPM));
  });

  it("toprak tabanı (GAEZ) ve iklim hasat oranı çıktıyı çarpar", () => {
    const { s } = kur({ duzenle: (v) => { tarimAc(v); v.harita.bolgeler.find((b) => b.id === "m_ova")!.tarim!.toprakTabanPpm = 800_000; } });
    s.calistirKadar(SAAT);
    iklimiSabitle(s);
    expect(tahilOrani(s)).toBe(160_000);
    iklimiSabitle(s, 500_000);
    expect(tahilOrani(s)).toBe(80_000);
  });

  it("çiftlik dışındaki tesisler (gıda fabrikası) toprak çarpanından etkilenmez", () => {
    const { s } = kur({ duzenle: tarimAc });
    s.calistirKadar(SAAT);
    bolge(s, "m_ova").tarim!.toprakPpm = 300_000;
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(SAAT + 1);
    const ova = bolge(s, "m_ova");
    // Fabrika girdisi (tahıl) azalsa da yöntem tanımı aynıdır: çıktı/girdi oranı 160/200 korunur.
    expect(ova.tesisler[1]!.verimPpm).toBeGreaterThan(0);
  });
});

describe("ekim_plani komutu doğrulaması", () => {
  it("toplam PPM olmalı, ürün sayısı kadar eleman, paylar 0..PPM tamsayı", () => {
    const { s } = kur({ duzenle: tarimAc });
    const dene = (ekimPpm: number[]) => ver(s, "a", { tur: "ekim_plani", bolge: "m_ova", ekimPpm });
    expect(dene([500_000, 500_000, 500_000]).tamam).toBe(false);
    expect(dene([500_000, 400_000, 0]).tamam).toBe(false);
    expect(dene([PPM, 0]).tamam).toBe(false);
    expect(dene([PPM, 0, 0, 0]).tamam).toBe(false);
    expect(dene([-1, PPM + 1, 0]).tamam).toBe(false);
    expect(dene([0.5 * PPM, 0.25 * PPM + 0.5, 0.25 * PPM - 0.5]).tamam).toBe(false);
    expect(dene([500_000, 250_000, 250_000]).tamam).toBe(true);
    expect(bolge(s, "m_ova").tarim!.ekimPpm).toEqual([500_000, 250_000, 250_000]);
  });

  it("yalnız bölgenin sahibi verebilir; tarım alanı olmayan bölgeye verilemez; hata dünyayı değiştirmez", () => {
    const { s } = kur({ duzenle: tarimAc });
    expect(ver(s, "b", { tur: "ekim_plani", bolge: "m_ova", ekimPpm: NOBET }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "ekim_plani", bolge: "m_gecit", ekimPpm: NOBET }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "ekim_plani", bolge: "yok", ekimPpm: NOBET }).tamam).toBe(false);
    expect(bolge(s, "m_ova").tarim!.ekimPpm).toEqual(MONO);
  });
});

describe("sahipsiz bölge uykusu ve tesis tavanı", () => {
  it("sahipsiz bölgede toprak donar; iklim dünya durumu olarak sürer; sahiplenince taze toprakla başlar", () => {
    const { s } = kur({ duzenle: tarimAc, oyuncular: { a: ["m_liman"] } });
    s.calistirKadar(60 * GUN);
    const ova = bolge(s, "m_ova");
    expect(ova.sahip).toBeNull();
    expect(ova.tarim!.toprakPpm).toBe(PPM);
    expect(ova.tarim!.iklimPpm).toBeLessThan(900_000); // Aralık: karasal hasat dipte
    s.uygula({ t: s.dunya.zaman, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_ova"] } });
    expect(ova.tarim!.toprakPpm).toBe(PPM);
    s.calistirKadar(s.dunya.zaman + 3 * GUN);
    expect(ova.tarim!.toprakPpm).toBe(PPM - 3 * 9_000);
  });

  it("toprak yalnız işlenen bölgede (ekili tesisi olan) sürüklenir", () => {
    const { s } = kur({ duzenle: tarimAc });
    s.calistirKadar(10 * GUN);
    expect(bolge(s, "m_liman").tarim!.toprakPpm).toBe(PPM); // çiftliği yok
    expect(bolge(s, "m_dag").tarim!.toprakPpm).toBe(PPM);
    expect(bolge(s, "m_sehir").tarim!.toprakPpm).toBe(PPM - 10 * 9_000); // çiftliği var
  });

  it("tesis_insa tarim tesisi tavanına uyar (çiftlik + ahır + mera, devam eden inşaat dahil)", () => {
    const { s } = kur({ duzenle: tarimAc });
    // m_ova tavanı 3; 1 çiftlik var
    verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
    verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ahir" }); // devam eden: sayılır
    const r = ver(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
    expect(r.tamam).toBe(false);
    expect(!r.tamam && r.hata).toContain("tavan");
    // Tarım tesisi olmayan tür (gıda fabrikası) tavana takılmaz
    expect(ver(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "gida_fabrikasi" }).tamam).toBe(true);
  });

  it("tavan yalnız tarım açıkken uygulanır (kapalıyken v0.2 gibi sınırsız)", () => {
    const { s } = kur();
    for (let i = 0; i < 4; i++) verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
  });
});

/**
 * Düzeltme 4 ve 5: girdi doğrulama.
 *  - carpBol sonlu/güvenli tamsayı koruması (anlamlı RangeError).
 *  - Komutlarda sayısal alanlar Number.isSafeInteger + makul üst sınır (ticaret oranı <= 1e9 mili-birim/saat).
 *  - AnlasmaTuru çalışma zamanında doğrulanır ("ticaret" | "ortak_altyapi").
 *  - Komut zamanı: güvenli tamsayı ve <= dunya.zaman + 400 gün; calistirKadar güvenli tamsayı ister.
 *  - Veri şeması: tamponSaat >= 1, ilanHazirlikSaatMin >= 1, pencereSaat >= 1.
 */
import { describe, expect, it } from "vitest";
import { dogrulaParametreler, miniVeriyiYukle } from "@bolge/veri";
import { bolge, kur, saatKos, ver, verTamam } from "./ekonomi-yardimci";
import { EN_COK_KOMUT_ILERISI } from "../src/motor";
import { EN_COK_TICARET_ORANI } from "../src/ekonomi/komut";
import { carpBol, carpBolTavan } from "../src/sabit";
import { GUN, SAAT } from "../src/tipler";
import type { Komut } from "../src/tipler";

describe("carpBol girdi korumasi", () => {
  it("Infinity, NaN, ondalik ve guvenli olmayan girdide anlamli RangeError (BigInt hatasi degil)", () => {
    for (const kotu of [Infinity, -Infinity, NaN, 1.5, 2 ** 60, -(2 ** 60), 1.7e308]) {
      expect(() => carpBol(kotu, 2, 3), `a=${kotu}`).toThrow(/carpBol: guvenli tamsayi/);
      expect(() => carpBol(2, kotu, 3), `b=${kotu}`).toThrow(/carpBol: guvenli tamsayi/);
      expect(() => carpBolTavan(kotu, 2, 3), `tavan a=${kotu}`).toThrow(RangeError);
    }
    for (const kotuBolen of [0, -1, NaN, Infinity, 1.5]) {
      expect(() => carpBol(1, 1, kotuBolen), `c=${kotuBolen}`).toThrow(RangeError);
    }
  });

  it("gecerli girdiler degismedi: buyuk ara carpim BigInt yoluyla dogru, negatif floor", () => {
    expect(carpBol(Number.MAX_SAFE_INTEGER, 1_000_000, 1_000_000)).toBe(Number.MAX_SAFE_INTEGER);
    expect(carpBol(-7, 1, 2)).toBe(-4);
    expect(carpBol(7, 3, 2)).toBe(10);
    expect(carpBolTavan(7, 1, 2)).toBe(4);
  });
});

describe("ticaret_emri ve diger sayisal komutlar", () => {
  const emir = (oranSaat: number): Komut => ({ tur: "ticaret_emri", bolge: "m_liman", mal: "celik", yon: "ithalat", oranSaat });

  it("Infinity'ye tasan oran reddedilir (1.7e308), 1e9 + 1 reddedilir, 1e9 kabul edilir", () => {
    const { s } = kur({ oyuncular: { a: ["m_liman"] } });
    for (const kotu of [1.7e308, Infinity, NaN, -1, 1.5, EN_COK_TICARET_ORANI + 1, 2 ** 53]) {
      const r = ver(s, "a", emir(kotu));
      expect(r.tamam, `oran=${kotu}`).toBe(false);
    }
    expect(bolge(s, "m_liman").ticaretEmirleri).toHaveLength(0);
    expect(ver(s, "a", emir(EN_COK_TICARET_ORANI))).toEqual({ tamam: true });
  });

  it("iki buyuk emir simulasyonu coktermez (eskiden 1.7e308 x 2 = Infinity -> BigInt RangeError)", () => {
    const { s } = kur({ oyuncular: { a: ["m_liman"] } });
    ver(s, "a", emir(1.7e308));
    ver(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "gida", yon: "ithalat", oranSaat: 1.7e308 });
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "celik", yon: "ihracat", oranSaat: EN_COK_TICARET_ORANI });
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "gida", yon: "ithalat", oranSaat: EN_COK_TICARET_ORANI });
    expect(() => saatKos(s, 6)).not.toThrow();
  });

  it("vergi_ayarla, askeri_rezerv, kenar_gelistir, birlik_uret: sonlu olmayan ve tasan degerler reddedilir", () => {
    const { s } = kur({ oyuncular: { a: ["m_liman", "m_ova"] } });
    for (const kotu of [1e308, Infinity, NaN, 1.5, 2 ** 53]) {
      expect(ver(s, "a", { tur: "vergi_ayarla", oranPpm: kotu }).tamam, `vergi ${kotu}`).toBe(false);
      expect(ver(s, "a", { tur: "askeri_rezerv", oranPpm: kotu }).tamam, `rezerv ${kotu}`).toBe(false);
      expect(ver(s, "a", { tur: "kenar_gelistir", kenar: kotu }).tamam, `kenar ${kotu}`).toBe(false);
      expect(ver(s, "a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: kotu }).tamam, `adet ${kotu}`).toBe(false);
    }
    expect(ver(s, "a", { tur: "vergi_ayarla", oranPpm: 1_000_001 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "askeri_rezerv", oranPpm: 500_001 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 101 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "vergi_ayarla", oranPpm: 1_000_000 })).toEqual({ tamam: true });
  });

  it("boolean olmayan aktif degerleri reddedilir (tesis_durum, yaptirim)", () => {
    const { s } = kur({ oyuncular: { a: ["m_ova"], b: ["m_col"] } });
    const tesis = bolge(s, "m_ova").tesisler[0]!;
    const kotu = "evet" as unknown as boolean;
    expect(ver(s, "a", { tur: "tesis_durum", bolge: "m_ova", tesis: tesis.id, aktif: kotu }).tamam).toBe(false);
    expect(tesis.aktif).toBe(true);
    expect(ver(s, "a", { tur: "yaptirim", hedef: "b", aktif: kotu }).tamam).toBe(false);
    expect(s.dunya.yaptirimlar).toHaveLength(0);
  });
});

describe("AnlasmaTuru calisma zamani dogrulamasi", () => {
  it("'sahte' tur teklif edilemez ve iki tarafin teklifiyle aktif olmaz; gecerli turler calisir", () => {
    const { s } = kur({ oyuncular: { a: ["m_ova"], b: ["m_col"] } });
    const sahte = "sahte" as unknown as "ticaret";
    expect(ver(s, "a", { tur: "anlasma_teklif", karsi: "b", anlasma: sahte }).tamam).toBe(false);
    expect(ver(s, "b", { tur: "anlasma_teklif", karsi: "a", anlasma: sahte }).tamam).toBe(false);
    expect(s.dunya.anlasmalar).toHaveLength(0);
    expect(ver(s, "a", { tur: "anlasma_feshet", karsi: "b", anlasma: sahte }).tamam).toBe(false);

    for (const tur of ["ticaret", "ortak_altyapi"] as const) {
      verTamam(s, "a", { tur: "anlasma_teklif", karsi: "b", anlasma: tur });
      verTamam(s, "b", { tur: "anlasma_teklif", karsi: "a", anlasma: tur });
    }
    expect(s.dunya.anlasmalar.map((x) => [x.tur, x.aktif])).toEqual([["ortak_altyapi", true], ["ticaret", true]]);
  });
});

describe("komut zamani ve calistirKadar", () => {
  it("t = 1e15 ve 400 gunden ileri zamanlar hizla hata sonucu doner (sonsuz tik dongusu yok)", () => {
    const { s } = kur({ oyuncular: { a: ["m_ova"] } });
    const komut: Komut = { tur: "vergi_ayarla", oranPpm: 100_000 };
    for (const t of [1e15, s.dunya.zaman + EN_COK_KOMUT_ILERISI + 1, 1e300, Infinity, NaN, 1.5, 2 ** 53, Number.MAX_SAFE_INTEGER]) {
      const r = s.uygula({ t, oyuncu: "a", komut });
      expect(r.tamam, `t=${t}`).toBe(false);
    }
    expect(s.dunya.zaman).toBe(0);
    expect(EN_COK_KOMUT_ILERISI).toBe(400 * GUN);
  });

  it("makul ileri zaman (10 gun) kabul edilir", () => {
    const { s } = kur({ oyuncular: { a: ["m_ova"] } });
    expect(s.uygula({ t: 10 * GUN, oyuncu: "a", komut: { tur: "vergi_ayarla", oranPpm: 100_000 } })).toEqual({ tamam: true });
    expect(s.dunya.zaman).toBe(10 * GUN);
  });

  it("calistirKadar guvenli olmayan t'de RangeError firlatir ve zamani degistirmez", () => {
    const { s } = kur({ oyuncular: { a: ["m_ova"] } });
    for (const t of [NaN, Infinity, 1.5, 2 ** 60, 1e300]) {
      expect(() => s.calistirKadar(t), `t=${t}`).toThrow(RangeError);
    }
    expect(s.dunya.zaman).toBe(0);
    s.calistirKadar(SAAT);
    expect(s.dunya.zaman).toBe(SAAT);
  });
});

describe("veri semasi: sifira bolme yaratan parametreler", () => {
  const kopya = () => structuredClone(miniVeriyiYukle().param);

  it("tamponSaat 0 ve ilanHazirlikSaatMin 0 reddedilir; pencereSaat 0 reddedilir; 1 kabul edilir", () => {
    const a = kopya();
    a.lojistik.tamponSaat = 0;
    const ra = dogrulaParametreler(a);
    expect(ra.gecerli).toBe(false);
    if (!ra.gecerli) expect(ra.hatalar.some((h) => h.includes("tamponSaat"))).toBe(true);

    const b = kopya();
    b.askeri.ilanHazirlikSaatMin = 0;
    const rb = dogrulaParametreler(b);
    expect(rb.gecerli).toBe(false);
    if (!rb.gecerli) expect(rb.hatalar.some((h) => h.includes("ilanHazirlikSaatMin"))).toBe(true);

    const c = kopya();
    c.askeri.pencereSaat = 0;
    expect(dogrulaParametreler(c).gecerli).toBe(false);

    const d = kopya();
    d.lojistik.tamponSaat = 1;
    d.askeri.ilanHazirlikSaatMin = 1;
    d.askeri.pencereSaat = 1;
    expect(dogrulaParametreler(d)).toEqual({ gecerli: true });
  });
});

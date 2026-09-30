/**
 * Düzeltme 2: %25 kayıp tavanının paralel/ardışık savaşlarla aşılması.
 *
 * Kurallar (savas_ilan):
 *  (a) hedef bölgede bitmemiş (hazırlık/pencere) herhangi bir savaş varsa yeni ilan reddedilir;
 *  (b) bir bölge yağmalandıktan (saldıran kazandı, stok kaybı > 0) sonra pencereSaat boyunca yeni ilan reddedilir;
 *  (c) bir saldıran bölge aynı anda yalnızca bir bitmemiş savaşta saldıran olabilir.
 * Sonuç: herhangi pencereSaat'lik kayan pencerede bir bölgenin yağma kaybı <= kayipTavaniPpm.
 *
 * Ekonomi/lojistik sahte: stoklar savaş dışında değişmez (kayıp tam ölçülebilir).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/ekonomi", () => ({ saatlikTik: vi.fn(), insaatBitti: vi.fn(), ekonomiKomutu: vi.fn() }));
vi.mock("../src/lojistik/cozum", () => ({ lojistikCoz: vi.fn(), lojistikKomutu: vi.fn() }));

import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { ppmUygula } from "../src/sabit";
import { SAAT } from "../src/tipler";
import type { SavasDurumu } from "../src/tipler";

const TEMEL = miniVeriyiYukle();

/**
 * Mini haritada m_ova'nın komşuları: m_liman, m_gecit, m_sehir. Hedef m_ova (oyuncu "h", zayıf ordu, çok stok);
 * saldırganlar: a (m_liman), b (m_gecit), c (m_sehir), hepsi güçlü orduyla.
 */
function kur(tohum: number, duzenle?: (v: VeriPaketi) => void): Simulasyon {
  const veri = structuredClone(TEMEL);
  duzenle?.(veri);
  const s = Simulasyon.olustur(veri, tohum);
  const atamalar: [string, string][] = [["h", "m_ova"], ["a", "m_liman"], ["b", "m_gecit"], ["c", "m_sehir"]];
  for (const [o, b] of atamalar) {
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler: [b] } });
  }
  for (const o of s.dunya.oyuncular) o.korumaBitis = 0;
  const piyade = s.ic.birlikIndeks["piyade_tumeni"] as number;
  for (const [id, adet] of [["m_ova", 1], ["m_liman", 500], ["m_gecit", 500], ["m_sehir", 500]] as const) {
    s.dunya.bolgeler[s.ic.bolgeIndeks[id] as number]!.birlikler[piyade] = adet;
  }
  return s;
}

const ilan = (s: Simulasyon, t: number, oyuncu: string, saldiran: string, hedef: string) =>
  s.uygula({ t, oyuncu, komut: { tur: "savas_ilan", saldiranBolge: saldiran, hedefBolge: hedef } });

const hedefStok = (s: Simulasyon, bolge = "m_ova") => s.dunya.bolgeler[s.ic.bolgeIndeks[bolge] as number]!.stoklar.map((x) => x.miktar);

describe("(a) hedefte bitmemis savas varken yeni ilan reddedilir", () => {
  it("ayni hedefe ikinci komsudan (baska oyuncu) ilan reddedilir", () => {
    const s = kur(1);
    expect(ilan(s, 1, "a", "m_liman", "m_ova")).toEqual({ tamam: true });
    const r = ilan(s, 2 * SAAT, "b", "m_gecit", "m_ova");
    expect(r.tamam).toBe(false);
    expect(s.dunya.savaslar).toHaveLength(1);
  });

  it("pencere evresindeyken de reddedilir; savas bitince (savunan kazanirsa) yeniden ilan edilebilir", () => {
    const s = kur(2);
    // Savunan çok güçlü: saldıran kaybeder, yağma olmaz.
    const piyade = s.ic.birlikIndeks["piyade_tumeni"] as number;
    s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!.birlikler[piyade] = 100_000;
    expect(ilan(s, 1, "a", "m_liman", "m_ova")).toEqual({ tamam: true });
    const sv = s.dunya.savaslar[0]!;
    s.calistirKadar(sv.pencereBaslangic + SAAT);
    expect(sv.evre).toBe("pencere");
    expect(ilan(s, s.dunya.zaman, "b", "m_gecit", "m_ova").tamam).toBe(false);
    s.calistirKadar(sv.pencereBitis);
    expect(sv.evre).toBe("bitti");
    expect(sv.sonuc!.kazanan).toBe("h");
    expect(ilan(s, sv.pencereBitis, "b", "m_gecit", "m_ova")).toEqual({ tamam: true });
  });
});

describe("(b) yagmalanan bolgeye pencereSaat boyunca ilan reddedilir", () => {
  it("yagma sonrasi 24 saat reddedilir, sonra kabul edilir", () => {
    const s = kur(3);
    expect(ilan(s, 1, "a", "m_liman", "m_ova")).toEqual({ tamam: true });
    const sv = s.dunya.savaslar[0]!;
    s.calistirKadar(sv.pencereBitis);
    expect(sv.sonuc!.kazanan).toBe("a");
    expect(sv.sonuc!.stokKaybi.some((x) => x > 0)).toBe(true);
    const pencereMs = s.ic.param.askeri.pencereSaat * SAAT;
    expect(ilan(s, sv.pencereBitis, "b", "m_gecit", "m_ova").tamam).toBe(false);
    expect(ilan(s, sv.pencereBitis + pencereMs - 1, "b", "m_gecit", "m_ova").tamam).toBe(false);
    expect(ilan(s, sv.pencereBitis + pencereMs, "b", "m_gecit", "m_ova")).toEqual({ tamam: true });
  });

  it("yagma yapilmayan (savunan kazandi / sonucsuz) savastan sonra bekleme yok", () => {
    const s = kur(4);
    s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!.birlikler[s.ic.birlikIndeks["piyade_tumeni"] as number] = 100_000;
    expect(ilan(s, 1, "a", "m_liman", "m_ova")).toEqual({ tamam: true });
    const sv = s.dunya.savaslar[0]!;
    s.calistirKadar(sv.pencereBitis);
    expect(sv.sonuc!.kazanan).toBe("h");
    expect(ilan(s, sv.pencereBitis, "b", "m_gecit", "m_ova")).toEqual({ tamam: true });
  });

  it("hedefin stogu bos olan (kayip 0) zaferde de bekleme yok", () => {
    const s = kur(5);
    for (const st of s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!.stoklar) st.miktar = 0;
    expect(ilan(s, 1, "a", "m_liman", "m_ova")).toEqual({ tamam: true });
    const sv = s.dunya.savaslar[0]!;
    s.calistirKadar(sv.pencereBitis);
    expect(sv.sonuc!.kazanan).toBe("a");
    expect(sv.sonuc!.stokKaybi.every((x) => x === 0)).toBe(true);
    expect(ilan(s, sv.pencereBitis, "b", "m_gecit", "m_ova")).toEqual({ tamam: true });
  });
});

describe("(c) bir saldiran bolge ayni anda tek bitmemis savasta saldiran olur", () => {
  it("ayni bolgeden ikinci hedefe ilan reddedilir; ilk savas bitince kabul edilir", () => {
    const s = kur(6);
    // m_ova'yı (h) saldıran yap: komşuları m_liman (a) ve m_gecit (b).
    expect(ilan(s, 1, "h", "m_ova", "m_liman")).toEqual({ tamam: true });
    const r = ilan(s, 2, "h", "m_ova", "m_gecit");
    expect(r.tamam).toBe(false);
    const sv = s.dunya.savaslar[0]!;
    s.calistirKadar(sv.pencereBitis);
    expect(sv.evre).toBe("bitti");
    // h'nin ordusu kaybetti ama hala var olabilir; en az 1 birim garantisi için ekle.
    s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!.birlikler[s.ic.birlikIndeks["piyade_tumeni"] as number] = 5;
    expect(ilan(s, sv.pencereBitis, "h", "m_ova", "m_gecit")).toEqual({ tamam: true });
  });

  it("saldiran bolge baska (komsu, farkli) hedefe de ilan edemez; hata saldiran kuralini belirtir", () => {
    const s = kur(7);
    expect(ilan(s, 1, "a", "m_liman", "m_ova")).toEqual({ tamam: true });
    // m_liman, m_sehir ile de komşudur (deniz kenarı); hedefte savaş yok ama saldıran bölge meşgul.
    const r = ilan(s, 2, "a", "m_liman", "m_sehir");
    expect(r.tamam).toBe(false);
    if (!r.tamam) expect(r.hata).toContain("saldiran");
  });
});

// ---------------------------------------------------------------------------
// Özellik testi: rastgele çoklu saldıran senaryoları
// ---------------------------------------------------------------------------

/** Küçük, deterministik LCG (yalnızca testin kendi senaryo üretimi için). */
function lcg(tohum: number): (n: number) => number {
  let x = tohum >>> 0 || 1;
  return (n: number) => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return Math.floor((x / 4294967296) * n);
  };
}

interface YagmaOlayi {
  t: number;
  onceki: number[];
  kayip: number[];
}

describe("ozellik testi: herhangi pencereSaat'lik kayan pencerede kayip <= tavan", () => {
  it("rastgele coklu saldiran senaryolari (40 tohum, 120 saat): pencere basina kayip tavani asmaz", () => {
    const saldirganlar: [string, string][] = [["a", "m_liman"], ["b", "m_gecit"], ["c", "m_sehir"]];
    let toplamYagma = 0;
    let toplamRed = 0;
    let coklu = 0;
    for (let tohum = 1; tohum <= 40; tohum++) {
      const rnd = lcg(tohum * 7919);
      const s = kur(tohum, (v) => {
        // Kısa hazırlık: 48 saatlik ilan aralığında birden çok yağma oluşabilsin.
        v.param.askeri.ilanHazirlikSaatMin = 1;
        v.param.askeri.ilanHazirlikSaatMax = 6;
      });
      const pencereMs = s.ic.param.askeri.pencereSaat * SAAT;
      const tavanPpm = s.ic.param.askeri.kayipTavaniPpm;
      const yagmalar: YagmaOlayi[] = [];
      const islenen = new Set<number>();

      /** t'ye kadar ilerler; yağmalı çözümlerden hemen önceki stoğu kaydeder. */
      const ilerle = (t: number): void => {
        for (;;) {
          const bekleyen: SavasDurumu[] = s.dunya.savaslar.filter((x) => x.evre !== "bitti" && x.pencereBitis <= t);
          if (bekleyen.length === 0) break;
          const sv = bekleyen.reduce((en, x) => (x.pencereBitis < en.pencereBitis ? x : en));
          if (sv.pencereBitis - 1 > s.dunya.zaman) s.calistirKadar(sv.pencereBitis - 1);
          const onceki = hedefStok(s);
          s.calistirKadar(sv.pencereBitis);
          if (!islenen.has(sv.id)) {
            islenen.add(sv.id);
            if (sv.sonuc && sv.sonuc.kazanan === sv.saldiran && sv.sonuc.stokKaybi.some((x) => x > 0)) {
              yagmalar.push({ t: sv.pencereBitis, onceki, kayip: sv.sonuc.stokKaybi });
            }
          }
        }
        if (t > s.dunya.zaman) s.calistirKadar(t);
      };

      // 0..96 saat arası rastgele ilan denemeleri (hedef: m_ova; çoğunlukla üç saldırgan; bazen hedef saldırgan olur).
      const denemeler: { t: number; k: number }[] = [];
      const n = 10 + rnd(10);
      for (let i = 0; i < n; i++) denemeler.push({ t: 1 + rnd(96 * SAAT), k: rnd(saldirganlar.length) });
      denemeler.sort((x, y) => x.t - y.t);
      for (const d of denemeler) {
        ilerle(d.t);
        const [oyuncu, bolge] = saldirganlar[d.k]!;
        const r = ilan(s, d.t, oyuncu, bolge, "m_ova");
        if (!r.tamam) toplamRed++;
      }
      ilerle(120 * SAAT);
      expect(s.dunya.savaslar.every((x) => x.evre === "bitti")).toBe(true);

      // Kayan pencere: her yağmadan başlayan [t, t + pencereSaat) içindeki toplam kayıp, pencere başındaki stoğun tavanını aşmaz.
      toplamYagma += yagmalar.length;
      if (yagmalar.length > 1) coklu++;
      for (let i = 0; i < yagmalar.length; i++) {
        const y0 = yagmalar[i]!;
        const toplam = new Array<number>(y0.kayip.length).fill(0);
        for (const y of yagmalar) {
          if (y.t >= y0.t && y.t < y0.t + pencereMs) for (let m = 0; m < toplam.length; m++) toplam[m] = toplam[m]! + y.kayip[m]!;
        }
        for (let m = 0; m < toplam.length; m++) {
          expect(toplam[m], `tohum=${tohum} yagma=${i} mal=${m}`).toBeLessThanOrEqual(ppmUygula(y0.onceki[m]!, tavanPpm));
        }
      }
      // Ardışık iki yağma arası en az pencereSaat.
      for (let i = 1; i < yagmalar.length; i++) {
        expect(yagmalar[i]!.t - yagmalar[i - 1]!.t, `tohum=${tohum}`).toBeGreaterThanOrEqual(pencereMs);
      }
      // Hedefin toplam stok kaybı (tüm zaman) ardışık yağmalarla bile 24 saatlik pencere kuralını bozmaz: ilan reddi çalışmış olmalı.
    }
    // Senaryolar anlamlı olmalı: yağma olmuş, bazı ilanlar reddedilmiş, bazı tohumlarda birden çok (aralıklı) yağma.
    expect(toplamYagma).toBeGreaterThan(20);
    expect(toplamRed).toBeGreaterThan(20);
    expect(coklu).toBeGreaterThan(0);
  });
});

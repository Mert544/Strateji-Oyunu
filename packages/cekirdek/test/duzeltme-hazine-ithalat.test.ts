/**
 * Düzeltme 1: hazine 0 iken tık arası bedava ithalat.
 *
 * Kural (spesifikasyon §4 / §10.2): net hazine oranı negatifse gerçekleşen ithalat, hazine bir sonraki saatlik tıka
 * (en çok 1 saat) yetecek şekilde ölçeklenir; hazine tükenince ithalat da durur. Hazine hiçbir zaman
 * ödenmemiş mal getirmez.
 */
import { describe, expect, it } from "vitest";
import type { VeriPaketi } from "@bolge/veri";
import { bolge, hazine, kur, malNo, verTamam } from "./ekonomi-yardimci";
import { carpBol } from "../src/sabit";
import { anlikMiktar } from "../src/stok";
import { DAKIKA, MILI, PPM, SAAT } from "../src/tipler";
import type { Simulasyon } from "../src/motor";

interface Olcum {
  /** İthal edilen malın değeri (mili-para): dakikalık stok artışı × adım başı fiyat × ithalat çarpanı. */
  deger: number;
  /** Ödenen para: başlangıç hazinesi + toplam gelir − son hazine. */
  odenen: number;
  /** Hazine 0'a (<= 1 mili-para) indikten sonraki dakikalarda ithal edilen mal değeri. */
  sifirdanSonra: number;
}

function vergiGeliriSaat(s: Simulasyon, bolgeId: string, vergiPpm: number): number {
  const p = s.ic.param;
  return carpBol(carpBol(bolge(s, bolgeId).nufus, p.ekonomi.vergiTabani1000Saat, 1000), vergiPpm, PPM);
}

/**
 * Tek limanlı, tesissiz oyuncu; `mal` ithalat emri; `saat` saat boyunca dakikalık adımlarla ölçer.
 * İthal edilen mal tüketilmez (bozulma kapalı, tesis/bakım yok): stok artışı = ithalat.
 */
function olc(opts: { hazine: number; vergiPpm: number; oranSaat: number; saat: number; mallar?: string[] }): Olcum {
  const duzenle = (v: VeriPaketi): void => {
    for (const m of v.icerik.mallar) m.bozulmaPpmGun = 0;
    v.param.ekonomi.vergiBuyumeEsigiPpm = PPM; // nüfus vergiden bağımsız davranır
  };
  const { s } = kur({ oyuncular: { a: ["m_liman"] }, duzenle });
  const b = bolge(s, "m_liman");
  b.tesisler = [];
  s.dunya.oyuncular[0]!.hazine.miktar = opts.hazine;
  verTamam(s, "a", { tur: "vergi_ayarla", oranPpm: opts.vergiPpm });
  const mallar = opts.mallar ?? ["celik"];
  for (const mal of mallar) {
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal, yon: "ithalat", oranSaat: opts.oranSaat });
  }
  const carp = s.ic.param.pazar.ithalatCarpaniPpm;
  const idx = mallar.map((m) => malNo(s, m));
  let onceki = idx.map((m) => anlikMiktar(b.stoklar[m]!, s.dunya.zaman));
  const h0 = hazine(s, "a");
  let deger = 0;
  let gelir = 0;
  let sifirdanSonra = 0;
  const adimSayisi = (opts.saat * SAAT) / DAKIKA;
  for (let i = 0; i < adimSayisi; i++) {
    const fiyatlar = idx.map((m) => s.dunya.pazar.fiyat[m]!);
    const sifirdaydi = hazine(s, "a") <= 1;
    gelir += carpBol(vergiGeliriSaat(s, "m_liman", opts.vergiPpm), DAKIKA, SAAT);
    s.calistirKadar(s.dunya.zaman + DAKIKA);
    let adim = 0;
    const simdi = idx.map((m) => anlikMiktar(b.stoklar[m]!, s.dunya.zaman));
    for (let j = 0; j < idx.length; j++) {
      adim += carpBol(carpBol(simdi[j]! - onceki[j]!, fiyatlar[j]!, MILI), carp, PPM);
    }
    onceki = simdi;
    deger += adim;
    if (sifirdaydi) sifirdanSonra += adim;
  }
  return { deger, odenen: h0 + gelir - hazine(s, "a"), sifirdanSonra };
}

describe("hazine tukenince ithalat durur (tik arasi bedava ithalat yok)", () => {
  it("hazine 1000 para, celik ithalati 100 birim/saat, gelir yok: ithal mal degeri odenen parayi asmaz", () => {
    const o = olc({ hazine: 1_000_000, vergiPpm: 0, oranSaat: 100_000, saat: 12 });
    // Hata varken ~25x: hazine ilk saat icinde biter ama mal gelmeye devam ederdi.
    expect(o.deger).toBeGreaterThan(0); // ithalat tamamen kesilmez: hazine kadar mal gelir
    expect(o.deger).toBeLessThanOrEqual(Math.ceil(o.odenen * 1.02) + 1_000);
    expect(o.odenen).toBeLessThanOrEqual(1_000_000 + 1);
    expect(o.sifirdanSonra).toBeLessThanOrEqual(1_000);
  });

  it("hazine ilk saatte tukenir, sonraki saatlerde stok artmaz", () => {
    const { s } = kur({ oyuncular: { a: ["m_liman"] }, duzenle: (v) => { for (const m of v.icerik.mallar) m.bozulmaPpmGun = 0; } });
    const b = bolge(s, "m_liman");
    b.tesisler = [];
    s.dunya.oyuncular[0]!.hazine.miktar = 1_000_000;
    verTamam(s, "a", { tur: "vergi_ayarla", oranPpm: 0 });
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "celik", yon: "ithalat", oranSaat: 100_000 });
    const m = malNo(s, "celik");
    s.calistirKadar(3 * SAAT);
    expect(hazine(s, "a")).toBeLessThanOrEqual(1);
    const stok3 = anlikMiktar(b.stoklar[m]!, s.dunya.zaman);
    s.calistirKadar(10 * SAAT);
    expect(anlikMiktar(b.stoklar[m]!, s.dunya.zaman)).toBe(stok3);
    expect(b.ticaretEmirleri[0]!.gerceklesenSaat).toBe(0);
  });

  it("farkli hazine ve oranlarda (gelirsiz) hazine hic odenmemis mal getirmez", () => {
    for (const hz of [50_000, 1_000_000, 37_000_000]) {
      for (const oran of [10_000, 100_000, 1_000_000_000]) {
        const o = olc({ hazine: hz, vergiPpm: 0, oranSaat: oran, saat: 8 });
        expect(o.deger, `hazine=${hz} oran=${oran}`).toBeLessThanOrEqual(Math.ceil(o.odenen * 1.02) + 1_000);
        expect(o.odenen).toBeLessThanOrEqual(hz + 1);
      }
    }
  });

  it("gelir varken ithalat gelirle surer; toplam ithal deger = baslangic hazinesi + gelir", () => {
    // Vergi geliri ithalat talebinden kucuk: hazine yine de tukenir, sonra ithalat gelir kadar surer.
    const o = olc({ hazine: 200_000, vergiPpm: 300_000, oranSaat: 100_000, saat: 24 });
    expect(o.deger).toBeLessThanOrEqual(Math.ceil(o.odenen * 1.03) + 2_000);
    // Gelir ithalata yetiyorsa (gelir > 0) ithalat hazine bittikten sonra da devam eder (tamamen kesilmez).
    expect(o.sifirdanSonra).toBeGreaterThan(0);
  });

  it("birden cok ithalat emri ayni oranda kisilir ve toplam yine hazineyi asmaz", () => {
    const o = olc({ hazine: 1_000_000, vergiPpm: 0, oranSaat: 100_000, saat: 6, mallar: ["celik", "yakit"] });
    expect(o.deger).toBeLessThanOrEqual(Math.ceil(o.odenen * 1.02) + 1_500);
  });

  it("hazine yeterliyse ithalat kisilmaz (gerceklesen = pazar payi)", () => {
    const { s } = kur({ oyuncular: { a: ["m_liman"] } });
    const b = bolge(s, "m_liman");
    b.tesisler = [];
    s.dunya.oyuncular[0]!.hazine.miktar = 50_000_000_000;
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "celik", yon: "ithalat", oranSaat: 50_000 });
    s.calistirKadar(2 * SAAT);
    expect(b.ticaretEmirleri[0]!.gerceklesenSaat).toBe(50_000);
  });

  it("deterministik: ayni senaryo ayni durum ozetini verir", () => {
    const calistir = (): string => {
      const { s } = kur({ oyuncular: { a: ["m_liman"] } });
      bolge(s, "m_liman").tesisler = [];
      s.dunya.oyuncular[0]!.hazine.miktar = 300_000;
      verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "celik", yon: "ithalat", oranSaat: 100_000 });
      s.calistirKadar(9 * SAAT + 12345);
      return s.durumOzeti();
    };
    expect(calistir()).toBe(calistir());
  });
});

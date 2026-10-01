/**
 * Sanayi (B2): determinizm. Aynı tohum + aynı komutlar = aynı özet (30 ve 400 gün); yenidenOynat(günlük) ve klonla
 * özet eşitliği; durum düz veridir (structuredClone, tamsayı); farklı tohum farklı sondaj/iklim akışı.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { kanonikSerilestir } from "../src/ozet";
import { GUN, SAAT } from "../src/tipler";
import type { Komut } from "../src/tipler";
import { kurSanayi } from "./sanayi-yardimci";
import { olaylariSiklastir, sanayiAc, tarimAc, yenilikleriKapat } from "./yenilikler";
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";

function veri(): VeriPaketi {
  const v = yenilikleriKapat(miniVeriyiYukle());
  sanayiAc(v);
  // tarım da açık: hidro takvimi, kirlilik-tarım etkisi ve ortak "olay" akışı (sondaj) birlikte sınanır
  tarimAc(v);
  olaylariSiklastir(v, 20_000_000);
  for (const m of v.icerik.mallar) if (m.depolanabilir !== false) v.param.baslangic.stok[m.id] = 5_000_000;
  v.param.baslangic.stok["gubre"] = 5_000_000;
  for (const b of v.harita.bolgeler) {
    b.rezervler = Object.fromEntries(Object.entries(b.rezervler).map(([k, x]) => [k, k === "tahil" ? x : Math.floor(x / 20)]));
  }
  v.harita.bolgeler.find((x) => x.id === "m_sehir")!.tesisler.push("santral");
  v.harita.bolgeler.find((x) => x.id === "m_dag")!.tesisler.push("hidro_santrali");
  v.harita.bolgeler.find((x) => x.id === "m_liman")!.tesisler.push("santral");
  v.harita.bolgeler.find((x) => x.id === "m_col")!.tesisler.push("santral");
  v.harita.bolgeler.find((x) => x.id === "m_gecit")!.tesisler.push("santral");
  v.harita.bolgeler.find((x) => x.id === "m_ova")!.tesisler.push("santral");
  v.param.sanayi!.damar.kesifOlasilikPpm = 600_000;
  return v;
}

const KOMUTLAR: Array<{ gun: number; saat?: number; oyuncu: string; komut: Komut }> = [
  { gun: 0, saat: 1, oyuncu: "a", komut: { tur: "arama_sondaji", bolge: "m_dag", mal: "cevher" } },
  { gun: 1, oyuncu: "a", komut: { tur: "bakim_duzeyi", duzey: 0 } },
  { gun: 1, saat: 3, oyuncu: "b", komut: { tur: "arama_sondaji", bolge: "m_col", mal: "silis" } },
  { gun: 2, oyuncu: "a", komut: { tur: "tesis_olcek_yukselt", bolge: "m_sehir", tesis: -1, olcek: 1 } },
  { gun: 3, oyuncu: "a", komut: { tur: "arama_sondaji", bolge: "m_dag", mal: "cevher" } },
  { gun: 9, oyuncu: "a", komut: { tur: "genel_onarim", bolge: "m_dag" } },
  { gun: 12, oyuncu: "a", komut: { tur: "bakim_duzeyi", duzey: 2 } },
  { gun: 14, oyuncu: "a", komut: { tur: "tesis_insa", bolge: "m_gecit", tesisTuru: "komur_ocagi" } },
];

function oyna(s: Simulasyon, gunSayisi: number, ilkGun = 0): void {
  if (s.dunya.oyuncular.length === 0) {
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman", "m_gecit", "m_dag", "m_sehir"] } });
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_col"] } });
  }
  for (let g = ilkGun; g <= gunSayisi; g++) {
    for (const k of KOMUTLAR) {
      if (k.gun !== g) continue;
      const t = g * GUN + (k.saat ?? 0) * SAAT;
      if (t < s.dunya.zaman) continue;
      s.calistirKadar(t);
      let komut = k.komut;
      if (komut.tur === "tesis_olcek_yukselt" && komut.tesis === -1) {
        // m_sehir'in parça fabrikası (kimlik harita sırasına bağlı olduğundan çalışma anında bulunur)
        const hedef = komut.bolge;
        const b = s.dunya.bolgeler.find((x) => x.id === hedef)!;
        const pf = s.ic.tesisTuruIndeks["parca_fabrikasi"];
        komut = { ...komut, tesis: b.tesisler.find((x) => x.tur === pf)!.id };
      }
      // Bazı komutlar duruma göre reddedilebilir (yetersiz kaynak vb.): reddedilen komut günlüğe girmez, determinizmi bozmaz.
      s.uygula({ t, oyuncu: k.oyuncu, komut });
    }
    s.calistirKadar(g * GUN + 5 * SAAT);
  }
}

describe("sanayi determinizmi", () => {
  it("aynı tohum + aynı komutlar -> aynı özet (30 gün); komutların çoğu kabul edilir", () => {
    const a = Simulasyon.olustur(veri(), 31);
    const b = Simulasyon.olustur(veri(), 31);
    oyna(a, 30);
    oyna(b, 30);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    const turler = new Set(a.gunluk.map((k) => k.komut.tur));
    expect(turler.has("arama_sondaji")).toBe(true);
    expect(turler.has("bakim_duzeyi")).toBe(true);
    expect(turler.has("tesis_olcek_yukselt")).toBe(true);
  });

  it("aynı tohum + aynı komutlar -> aynı özet (400 gün)", () => {
    const a = Simulasyon.olustur(veri(), 32);
    const b = Simulasyon.olustur(veri(), 32);
    oyna(a, 400);
    oyna(b, 400);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
  }, 60_000);

  it("yenidenOynat(günlük) orijinalle aynı özeti verir (sanayi komutları günlükte)", () => {
    const a = Simulasyon.olustur(veri(), 33);
    oyna(a, 25);
    const r = Simulasyon.yenidenOynat(veri(), 33, a.gunluk);
    r.calistirKadar(a.dunya.zaman);
    expect(r.durumOzeti()).toBe(a.durumOzeti());
    expect(r.dunya.bolgeler.map((b) => b.kesifSayisi)).toEqual(a.dunya.bolgeler.map((b) => b.kesifSayisi));
  });

  it("klonla: klon orijinali etkilemez; ikisi aynı devamla aynı özet", () => {
    const a = Simulasyon.olustur(veri(), 34);
    oyna(a, 10);
    const k = a.klonla();
    expect(k.durumOzeti()).toBe(a.durumOzeti());
    const once = a.durumOzeti();
    k.uygula({ t: k.dunya.zaman, oyuncu: "a", komut: { tur: "bakim_duzeyi", duzey: 0 } });
    k.calistirKadar(k.dunya.zaman + 10 * GUN);
    expect(a.durumOzeti()).toBe(once);
    expect(k.durumOzeti()).not.toBe(once);
    const b = a.klonla();
    a.calistirKadar(a.dunya.zaman + 20 * GUN);
    b.calistirKadar(b.dunya.zaman + 20 * GUN);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
  });

  it("sanayi durumu düz veridir: structuredClone eşit, kanonik serileştirme geçer, tüm alanlar tamsayı", () => {
    const a = Simulasyon.olustur(veri(), 35);
    oyna(a, 20);
    const kopya = structuredClone(a.dunya);
    expect(kopya.bolgeler.map((b) => b.elektrik)).toEqual(a.dunya.bolgeler.map((b) => b.elektrik));
    expect(() => kanonikSerilestir(a.dunya)).not.toThrow();
    for (const b of a.dunya.bolgeler) {
      const e = b.elektrik!;
      for (const x of [e.uretimMili, e.talepMili, e.karsilanmaPpm, e.haneKarsilanmaPpm, e.yukPpm, b.kirlilikPpm!, b.bakimKarsilanmaPpm!, ...b.kesifSayisi!]) {
        expect(Number.isInteger(x)).toBe(true);
      }
      for (const t of b.tesisler) {
        expect(Number.isInteger(t.asinmaPpm)).toBe(true);
        expect([0, 1, 2]).toContain(t.olcek);
      }
    }
    for (const o of a.dunya.oyuncular) expect([0, 1, 2]).toContain(o.bakimDuzeyi);
  });

  it("farklı tohum -> farklı özet (sondaj boyutu ve iklim olayları tohuma bağlı)", () => {
    const a = Simulasyon.olustur(veri(), 41);
    const b = Simulasyon.olustur(veri(), 42);
    oyna(a, 8);
    oyna(b, 8);
    expect(a.durumOzeti()).not.toBe(b.durumOzeti());
  });

  it("kurSanayi yardımcısı: aynı kurulum iki kez aynı özeti verir", () => {
    const a = kurSanayi({ tohum: 3 }).s;
    const b = kurSanayi({ tohum: 3 }).s;
    a.calistirKadar(2 * GUN);
    b.calistirKadar(2 * GUN);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
  });
});

/**
 * Tarım katmanı (B1): determinizm: klonla / yenidenOynat özet eşitliği, düz veri (structuredClone) ve tamsayı kuralı.
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { kanonikSerilestir } from "../src/ozet";
import { GUN, SAAT } from "../src/tipler";
import type { Komut } from "../src/tipler";
import { olaylariSiklastir, tarimAc, yenilikleriKapat } from "./yenilikler";

function veri(): VeriPaketi {
  const v = yenilikleriKapat(miniVeriyiYukle());
  tarimAc(v);
  olaylariSiklastir(v, 30_000_000);
  v.param.baslangic.stok["gubre"] = 5_000_000;
  return v;
}

const KOMUTLAR: Array<{ gun: number; oyuncu: string; komut: Komut }> = [
  { gun: 1, oyuncu: "a", komut: { tur: "ekim_plani", bolge: "m_ova", ekimPpm: [500_000, 250_000, 250_000] } },
  { gun: 2, oyuncu: "a", komut: { tur: "gubre_dozu", bolge: "m_sehir", doz: 2 } },
  { gun: 9, oyuncu: "a", komut: { tur: "ekim_plani", bolge: "m_sehir", ekimPpm: [0, 400_000, 600_000] } },
  { gun: 20, oyuncu: "a", komut: { tur: "gubre_dozu", bolge: "m_ova", doz: 1 } },
];

function oyna(s: Simulasyon, gunSayisi: number): void {
  if (s.dunya.oyuncular.length === 0) {
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman", "m_gecit", "m_dag", "m_sehir"] } });
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_col"] } });
  }
  for (let g = 1; g <= gunSayisi; g++) {
    for (const k of KOMUTLAR) {
      if (k.gun === g) {
        const r = s.uygula({ t: g * GUN, oyuncu: k.oyuncu, komut: k.komut });
        if (!r.tamam) throw new Error(`komut basarisiz: ${r.hata}`);
      }
    }
    s.calistirKadar(g * GUN + 5 * SAAT);
  }
}

describe("tarım determinizmi", () => {
  it("aynı tohum + aynı komutlar -> aynı özet (60 gün); olaylar oluşmuştur", () => {
    const a = Simulasyon.olustur(veri(), 21);
    const b = Simulasyon.olustur(veri(), 21);
    oyna(a, 60);
    oyna(b, 60);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    expect(a.dunya.iklim!.sonGun).toBe(273 + 60);
    // Olaylar kimlik sayacından id alır: 6 bölgelik tohum 21 dünyasında 60 günde en az bir olay oluşmuştur.
    expect(a.dunya.sayac.kimlik).toBeGreaterThan(Simulasyon.olustur(veri(), 21).dunya.sayac.kimlik + 3);
  });

  it("yenidenOynat(gunluk) orijinalle aynı özeti verir (tarım komutları günlükte)", () => {
    const a = Simulasyon.olustur(veri(), 22);
    oyna(a, 45);
    expect(a.gunluk.filter((k) => k.komut.tur === "ekim_plani" || k.komut.tur === "gubre_dozu")).toHaveLength(4);
    const r = Simulasyon.yenidenOynat(veri(), 22, a.gunluk);
    r.calistirKadar(a.dunya.zaman);
    expect(r.durumOzeti()).toBe(a.durumOzeti());
    expect(r.dunya.iklim).toEqual(a.dunya.iklim);
  });

  it("klonla: klon orijinali etkilemez; ikisi aynı devamla aynı özet", () => {
    const a = Simulasyon.olustur(veri(), 23);
    oyna(a, 15);
    const k = a.klonla();
    expect(k.durumOzeti()).toBe(a.durumOzeti());
    const once = a.durumOzeti();
    k.uygula({ t: k.dunya.zaman, oyuncu: "a", komut: { tur: "gubre_dozu", bolge: "m_ova", doz: 3 } });
    k.calistirKadar(k.dunya.zaman + 10 * GUN);
    expect(a.durumOzeti()).toBe(once);
    expect(k.durumOzeti()).not.toBe(once);
    const b = a.klonla();
    a.calistirKadar(a.dunya.zaman + 30 * GUN);
    b.calistirKadar(b.dunya.zaman + 30 * GUN);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
  });

  it("tarım durumu düz veridir: structuredClone eşit, kanonik serileştirme tamsayı olmayanı reddetmez", () => {
    const a = Simulasyon.olustur(veri(), 24);
    oyna(a, 30);
    const kopya = structuredClone(a.dunya);
    expect(kopya.iklim).toEqual(a.dunya.iklim);
    expect(kopya.bolgeler.map((b) => b.tarim)).toEqual(a.dunya.bolgeler.map((b) => b.tarim));
    expect(() => kanonikSerilestir(a.dunya)).not.toThrow();
    for (const b of a.dunya.bolgeler) {
      if (!b.tarim) continue;
      for (const x of [b.tarim.toprakPpm, b.tarim.iklimPpm, b.tarim.olayKaybiPpm, b.tarim.gubreDozu, b.tarim.gubreKarsilanmaPpm, ...b.tarim.ekimPpm]) {
        expect(Number.isInteger(x)).toBe(true);
      }
    }
    for (const o of a.dunya.iklim!.olaylar) {
      for (const x of [o.id, o.merkez, o.uyari, o.etkiBaslangic, o.bitis, o.siddetPpm]) expect(Number.isInteger(x)).toBe(true);
    }
  });

  it("farklı tohum -> farklı iklim olayları", () => {
    const a = Simulasyon.olustur(veri(), 31);
    const b = Simulasyon.olustur(veri(), 32);
    a.calistirKadar(40 * GUN);
    b.calistirKadar(40 * GUN);
    expect(a.dunya.rng.olay).not.toEqual(b.dunya.rng.olay);
    expect(a.durumOzeti()).not.toBe(b.durumOzeti());
  });
});

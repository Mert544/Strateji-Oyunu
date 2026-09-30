/**
 * Düzeltme 3: küçük ordular kayıpsız kalmasın. Kayıp tavan yuvarlamayla hesaplanır:
 * adet > 0 ve kayıp oranı > 0 ise kayıp en az 1 (kazanan ve kaybeden için).
 * Ekonomi/lojistik sahte (savaş dışı değişim yok).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/ekonomi", () => ({ saatlikTik: vi.fn(), insaatBitti: vi.fn(), ekonomiKomutu: vi.fn() }));
vi.mock("../src/lojistik/cozum", () => ({ lojistikCoz: vi.fn(), lojistikKomutu: vi.fn() }));

import { miniVeriyiYukle } from "@bolge/veri";
import { KAYBEDEN_KAYIP_PPM, KAZANAN_KAYIP_PPM } from "../src/askeri/savas";
import { Simulasyon } from "../src/motor";
import { carpBolTavan } from "../src/sabit";
import { PPM } from "../src/tipler";

const TEMEL = miniVeriyiYukle();

/** a = m_ova (saldıran), b = m_liman (savunan). */
function savasKos(tohum: number, saldiranAdet: number, savunanAdet: number, durus?: "geri_cekil") {
  const s = Simulasyon.olustur(structuredClone(TEMEL), tohum);
  for (const [o, b] of [["a", "m_ova"], ["b", "m_liman"]] as const) {
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler: [b] } });
  }
  for (const o of s.dunya.oyuncular) o.korumaBitis = 0;
  const pi = s.ic.birlikIndeks["piyade_tumeni"] as number;
  const ova = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!;
  const liman = s.dunya.bolgeler[s.ic.bolgeIndeks["m_liman"] as number]!;
  ova.birlikler.fill(0);
  liman.birlikler.fill(0);
  ova.birlikler[pi] = saldiranAdet;
  liman.birlikler[pi] = savunanAdet;
  if (durus) liman.savunma.durus = durus;
  expect(s.uygula({ t: 1, oyuncu: "a", komut: { tur: "savas_ilan", saldiranBolge: "m_ova", hedefBolge: "m_liman" } })).toEqual({ tamam: true });
  const sv = s.dunya.savaslar[0]!;
  s.calistirKadar(sv.pencereBitis);
  return { s, sv, pi, ova, liman };
}

describe("carpBolTavan: adet > 0 ve oran > 0 ise en az 1", () => {
  it("3 birim x %30 = 1 (floor 0 olurdu); 0 birim = 0; oran 0 = 0; tam bolunen degisme", () => {
    expect(carpBolTavan(3, KAYBEDEN_KAYIP_PPM, PPM)).toBe(1);
    expect(carpBolTavan(1, KAZANAN_KAYIP_PPM, PPM)).toBe(1);
    expect(carpBolTavan(0, KAYBEDEN_KAYIP_PPM, PPM)).toBe(0);
    expect(Object.is(carpBolTavan(0, KAYBEDEN_KAYIP_PPM, PPM), 0)).toBe(true);
    expect(carpBolTavan(5, 0, PPM)).toBe(0);
    expect(carpBolTavan(10, 300_000, PPM)).toBe(3);
    expect(carpBolTavan(50, 100_000, PPM)).toBe(5);
    expect(carpBolTavan(7, PPM, PPM)).toBe(7);
  });
});

describe("kucuk ordularda kayip", () => {
  it("3 birimlik kaybeden saldiran %30 icin 1 birim kaybeder (eskiden 0)", () => {
    const { sv, pi, ova } = savasKos(1, 3, 1000);
    expect(sv.sonuc!.kazanan).toBe("b");
    expect(sv.sonuc!.saldiranBirlikKaybi[pi]).toBe(1);
    expect(ova.birlikler[pi]).toBe(2);
  });

  it("kazanan da en az 1 birim kaybeder: 3 birimlik kazanan saldiran (%10 -> tavan 1)", () => {
    const { sv, pi, ova, liman } = savasKos(2, 3, 0);
    // Savunanda hiç birlik yok -> güç 0; saldıran kazanır.
    expect(sv.sonuc!.kazanan).toBe("a");
    expect(sv.sonuc!.saldiranBirlikKaybi[pi]).toBe(1);
    expect(ova.birlikler[pi]).toBe(2);
    expect(sv.sonuc!.savunanBirlikKaybi[pi]).toBe(0); // adet 0 -> kayıp 0
    expect(liman.birlikler[pi]).toBe(0);
  });

  it("savunan kazanirsa savunan %10 icin 1, kaybeden saldiran %30 icin 1 birim kaybeder", () => {
    const { sv, pi } = savasKos(3, 3, 3 * 1000);
    expect(sv.sonuc!.kazanan).toBe("b");
    expect(sv.sonuc!.saldiranBirlikKaybi[pi]).toBe(1);
    expect(sv.sonuc!.savunanBirlikKaybi[pi]).toBe(300); // 3000 x %10 (tam)
    const k = savasKos(3, 3, 3);
    expect(k.sv.sonuc!.savunanBirlikKaybi[k.pi]).toBeGreaterThanOrEqual(1);
  });

  it("geri_cekil savunan kayipsiz kalir (tavan yuvarlama bunu bozmaz)", () => {
    const { sv, pi, liman } = savasKos(4, 1000, 3, "geri_cekil");
    expect(sv.sonuc!.kazanan).toBe("a");
    expect(sv.sonuc!.savunanBirlikKaybi[pi]).toBe(0);
    expect(liman.birlikler[pi]).toBe(3);
  });

  it("ozellik: her adet/seviyede 1 <= kayip <= adet (adet > 0) ve toplam birlik korunur", () => {
    for (let tohum = 1; tohum <= 12; tohum++) {
      for (const [sa, ha] of [[1, 1], [2, 5], [3, 3], [7, 2], [9, 40], [40, 9]] as const) {
        const { sv, pi, ova, liman } = savasKos(tohum, sa, ha);
        const r = sv.sonuc!;
        expect(r.saldiranBirlikKaybi[pi]).toBeGreaterThanOrEqual(1);
        expect(r.saldiranBirlikKaybi[pi]).toBeLessThanOrEqual(sa);
        expect(r.savunanBirlikKaybi[pi]).toBeGreaterThanOrEqual(1);
        expect(r.savunanBirlikKaybi[pi]).toBeLessThanOrEqual(ha);
        expect(ova.birlikler[pi]).toBe(sa - r.saldiranBirlikKaybi[pi]!);
        expect(liman.birlikler[pi]).toBe(ha - r.savunanBirlikKaybi[pi]!);
      }
    }
  });
});

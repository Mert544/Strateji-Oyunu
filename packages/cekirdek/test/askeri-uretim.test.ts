/** Askeri alt sistem testleri: üretim, ikmal, savunma emri, savaş ilanı/pencere (ekonomi/lojistik sahte). */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/ekonomi", () => ({ saatlikTik: vi.fn(), insaatBitti: vi.fn(), ekonomiKomutu: vi.fn() }));
vi.mock("../src/lojistik/cozum", () => ({ lojistikCoz: vi.fn(), lojistikKomutu: vi.fn() }));

import { miniVeriyiYukle } from "@bolge/veri";
import { ikmalTalebi } from "../src/askeri";
import { Simulasyon } from "../src/motor";
import { anlikMiktar } from "../src/stok";
import { GUN, SAAT } from "../src/tipler";
import type { Komut } from "../src/tipler";

const TEMEL = miniVeriyiYukle();

/** a = m_ova (kuzey), b = m_liman (kuzey, a'ya komşu), c = m_dag (güney, a'ya komşu değil). Korumalar varsayılan (7 gün). */
function kur(tohum = 1, korumasiz = false): Simulasyon {
  const s = Simulasyon.olustur(structuredClone(TEMEL), tohum);
  const katil = (o: string, bolgeler: string[]) =>
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler } });
  katil("a", ["m_ova"]);
  katil("b", ["m_liman"]);
  katil("c", ["m_dag"]);
  if (korumasiz) for (const o of s.dunya.oyuncular) o.korumaBitis = 0;
  return s;
}

function uygula(s: Simulasyon, oyuncu: string, komut: Komut, t = s.dunya.zaman) {
  return s.uygula({ t, oyuncu, komut });
}

const bolgeAl = (s: Simulasyon, id: string) => s.dunya.bolgeler[s.ic.bolgeIndeks[id] as number]!;
const mal = (s: Simulasyon, id: string) => s.ic.malIndeks[id] as number;

describe("birlik_uret", () => {
  it("maliyet bolge stogundan duser, parti sure sonunda birlik olur", () => {
    const s = kur();
    const ova = bolgeAl(s, "m_ova");
    const piyade = s.ic.birlikIndeks["piyade_tumeni"] as number;
    const tanim = s.ic.birlikler[piyade]!;
    const once = Object.keys(tanim.maliyet).map((m) => anlikMiktar(ova.stoklar[mal(s, m)]!, 0));
    const birlikOnce = ova.birlikler[piyade]!;

    expect(uygula(s, "a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 5 }, 1000).tamam).toBe(true);
    const sonra = Object.keys(tanim.maliyet).map((m) => anlikMiktar(ova.stoklar[mal(s, m)]!, 1000));
    Object.keys(tanim.maliyet).forEach((m, i) => expect(sonra[i]).toBe(once[i]! - (tanim.maliyet[m] as number) * 5));
    expect(s.dunya.partiler).toHaveLength(1);
    const bitis = 1000 + tanim.partiSuresiSaat * SAAT;
    expect(s.dunya.partiler[0]).toMatchObject({ sahip: "a", bolge: s.ic.bolgeIndeks["m_ova"], birlik: piyade, adet: 5, bitis });

    s.calistirKadar(bitis - 1);
    expect(ova.birlikler[piyade]).toBe(birlikOnce);
    s.calistirKadar(bitis);
    expect(ova.birlikler[piyade]).toBe(birlikOnce + 5);
    expect(s.dunya.partiler).toEqual([]);
  });

  it("yetersiz stok, gecersiz adet, yabanci bolge, bilinmeyen birlik ve kapali birlik reddedilir; durum degismez", () => {
    const s = kur();
    const ova = bolgeAl(s, "m_ova");
    const stoklar = JSON.stringify(ova.stoklar);
    const reddet = (oyuncu: string, komut: Komut) => {
      const r = uygula(s, oyuncu, komut);
      expect(r.tamam, JSON.stringify(komut)).toBe(false);
    };
    // 11 birim muhimmat: 220000 > 200000
    reddet("a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 11 });
    reddet("a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 0 });
    reddet("a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 101 });
    reddet("a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 1.5 });
    reddet("b", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 1 });
    reddet("a", { tur: "birlik_uret", bolge: "m_gecit", birlik: "piyade_tumeni", adet: 1 });
    reddet("a", { tur: "birlik_uret", bolge: "yok", birlik: "piyade_tumeni", adet: 1 });
    reddet("a", { tur: "birlik_uret", bolge: "m_ova", birlik: "yok", adet: 1 });
    reddet("a", { tur: "birlik_uret", bolge: "m_ova", birlik: "zirhli_tumen", adet: 1 });
    expect(JSON.stringify(ova.stoklar)).toBe(stoklar);
    expect(s.dunya.partiler).toEqual([]);
  });

  it("zirhli tumen teknoloji acilinca uretilebilir", () => {
    const s = kur();
    const ova = bolgeAl(s, "m_ova");
    s.dunya.oyuncular.find((o) => o.id === "a")!.teknolojiler.push(s.ic.teknolojiIndeks["mekanize_ordu"] as number);
    expect(uygula(s, "a", { tur: "birlik_uret", bolge: "m_ova", birlik: "zirhli_tumen", adet: 2 }).tamam).toBe(true);
    s.calistirKadar(18 * SAAT);
    expect(ova.birlikler[s.ic.birlikIndeks["zirhli_tumen"] as number]).toBe(2);
  });

  it("parti bitmeden bolge el degistirirse birlik eklenmez", () => {
    const s = kur();
    const ova = bolgeAl(s, "m_ova");
    const piyade = s.ic.birlikIndeks["piyade_tumeni"] as number;
    uygula(s, "a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 2 });
    const once = ova.birlikler[piyade]!;
    ova.sahip = "b";
    s.calistirKadar(GUN);
    expect(ova.birlikler[piyade]).toBe(once);
    expect(s.dunya.partiler).toEqual([]);
  });
});

describe("ikmalTalebi", () => {
  it("birlik adedi x birim ikmal, mal indeksine gore, uzunluk = mal sayisi", () => {
    const s = kur();
    const ova = bolgeAl(s, "m_ova");
    const piyade = s.ic.birlikIndeks["piyade_tumeni"] as number;
    const zirhli = s.ic.birlikIndeks["zirhli_tumen"] as number;
    ova.birlikler[piyade] = 3;
    ova.birlikler[zirhli] = 2;
    const talep = ikmalTalebi(s.dunya, s.baglam, s.ic.bolgeIndeks["m_ova"] as number);
    expect(talep).toHaveLength(s.ic.mallar.length);
    const beklenen = new Array<number>(s.ic.mallar.length).fill(0);
    for (const [bi, adet] of [[piyade, 3], [zirhli, 2]] as const) {
      const ik = s.ic.birlikler[bi]!.ikmal;
      for (const m of Object.keys(ik)) beklenen[mal(s, m)]! += adet * (ik[m] as number);
    }
    expect(talep).toEqual(beklenen);
    expect(talep[mal(s, "gida")]).toBe(3 * 2000);
    expect(talep[mal(s, "muhimmat")]).toBe(3 * 800 + 2 * 1200);
    expect(ikmalTalebi(s.dunya, s.baglam, s.ic.bolgeIndeks["m_gecit"] as number).every((x) => x === 0)).toBe(true);
    // savunma duruşu talebi değiştirmez
    uygula(s, "a", { tur: "savunma_emri", bolge: "m_ova", durus: "savunma" });
    expect(ikmalTalebi(s.dunya, s.baglam, s.ic.bolgeIndeks["m_ova"] as number)).toEqual(beklenen);
  });
});

describe("savunma_emri", () => {
  it("durusu ayarlar; yabanci bolge ve gecersiz durus reddedilir", () => {
    const s = kur();
    expect(uygula(s, "a", { tur: "savunma_emri", bolge: "m_ova", durus: "geri_cekil" }).tamam).toBe(true);
    expect(bolgeAl(s, "m_ova").savunma.durus).toBe("geri_cekil");
    expect(uygula(s, "b", { tur: "savunma_emri", bolge: "m_ova", durus: "savunma" }).tamam).toBe(false);
    expect(uygula(s, "a", { tur: "savunma_emri", bolge: "m_ova", durus: "saldir" as never }).tamam).toBe(false);
    expect(bolgeAl(s, "m_ova").savunma.durus).toBe("geri_cekil");
  });
});

describe("savas_ilan", () => {
  const ilan = (s: Simulasyon, oyuncu: string, sb: string, hb: string, t = s.dunya.zaman) =>
    uygula(s, oyuncu, { tur: "savas_ilan", saldiranBolge: sb, hedefBolge: hb }, t);

  it("korumadaki oyuncuya savas ilan edilemez; saldiran korumadaysa koruma biter", () => {
    const s = kur();
    expect(ilan(s, "a", "m_ova", "m_liman", 1000).tamam).toBe(false);
    expect(s.dunya.savaslar).toEqual([]);
    // b korumasız, a korumalı: a saldırabilir ve koruması biter
    const b = s.dunya.oyuncular.find((o) => o.id === "b")!;
    const a = s.dunya.oyuncular.find((o) => o.id === "a")!;
    b.korumaBitis = 0;
    expect(a.korumaBitis).toBe(7 * GUN);
    expect(ilan(s, "a", "m_ova", "m_liman", 2000).tamam).toBe(true);
    expect(a.korumaBitis).toBe(2000);
  });

  it("koruma tam bitis aninda sona erer", () => {
    const s = kur();
    expect(ilan(s, "a", "m_ova", "m_liman", 7 * GUN - 1).tamam).toBe(false);
    expect(ilan(s, "a", "m_ova", "m_liman", 7 * GUN).tamam).toBe(true);
  });

  it("komsu olmayan, sahipsiz, kendi, yabanci saldiran bolge, birliksiz bolge ve yinelenen savas reddedilir", () => {
    const s = kur(1, true);
    expect(ilan(s, "a", "m_ova", "m_dag", 10).tamam).toBe(false); // komşu değil
    expect(ilan(s, "a", "m_ova", "m_gecit", 10).tamam).toBe(false); // sahipsiz
    expect(ilan(s, "a", "m_ova", "m_ova", 10).tamam).toBe(false);
    expect(ilan(s, "b", "m_ova", "m_liman", 10).tamam).toBe(false); // saldıran bölge b'nin değil
    expect(ilan(s, "a", "m_ova", "yok", 10).tamam).toBe(false);
    const ova = bolgeAl(s, "m_ova");
    const birlikler = [...ova.birlikler];
    ova.birlikler.fill(0);
    expect(ilan(s, "a", "m_ova", "m_liman", 10).tamam).toBe(false); // birlik yok
    ova.birlikler.splice(0, ova.birlikler.length, ...birlikler);
    expect(s.dunya.savaslar).toEqual([]);
    expect(ilan(s, "a", "m_ova", "m_liman", 10).tamam).toBe(true);
    expect(ilan(s, "a", "m_ova", "m_liman", 10).tamam).toBe(false); // bitmemiş savaş var
    // ters yönde de aynı iki bölge arasında
    bolgeAl(s, "m_liman").birlikler[0] = 3;
    expect(ilan(s, "b", "m_liman", "m_ova", 10).tamam).toBe(false);
  });

  it("hazirlik suresi [min,max] saat, pencere pencereSaat, tohumla deterministik; olaylar planlanir", () => {
    const a = kur(1, true);
    const { min, max, pencere } = {
      min: a.ic.param.askeri.ilanHazirlikSaatMin,
      max: a.ic.param.askeri.ilanHazirlikSaatMax,
      pencere: a.ic.param.askeri.pencereSaat,
    };
    expect([min, max, pencere]).toEqual([12, 24, 24]);
    const gorulen = new Set<number>();
    for (let tohum = 1; tohum <= 60; tohum++) {
      const s = kur(tohum, true);
      expect(ilan(s, "a", "m_ova", "m_liman", 5000).tamam).toBe(true);
      const sv = s.dunya.savaslar[0]!;
      const hazirlik = (sv.pencereBaslangic - sv.ilan) / SAAT;
      expect(Number.isInteger(hazirlik)).toBe(true);
      expect(hazirlik).toBeGreaterThanOrEqual(12);
      expect(hazirlik).toBeLessThanOrEqual(24);
      expect(sv.pencereBitis - sv.pencereBaslangic).toBe(24 * SAAT);
      expect(sv).toMatchObject({ saldiran: "a", savunan: "b", evre: "hazirlik", sonuc: null, ilan: 5000 });
      gorulen.add(hazirlik);
      // aynı tohum, aynı sonuç
      const y = kur(tohum, true);
      ilan(y, "a", "m_ova", "m_liman", 5000);
      expect(y.dunya.savaslar[0]).toEqual(sv);
    }
    expect(gorulen.size).toBeGreaterThan(3);
  });

  it("evreler: hazirlik -> pencere -> bitti", () => {
    const s = kur(2, true);
    ilan(s, "a", "m_ova", "m_liman", 0);
    const sv = s.dunya.savaslar[0]!;
    s.calistirKadar(sv.pencereBaslangic - 1);
    expect(sv.evre).toBe("hazirlik");
    s.calistirKadar(sv.pencereBaslangic);
    expect(sv.evre).toBe("pencere");
    s.calistirKadar(sv.pencereBitis - 1);
    expect(sv.evre).toBe("pencere");
    s.calistirKadar(sv.pencereBitis);
    expect(sv.evre).toBe("bitti");
    expect(sv.sonuc).not.toBeNull();
    // bitmiş savaştan sonra yeni savaş ilan edilebilir
    expect(ilan(s, "a", "m_ova", "m_liman", sv.pencereBitis + 1).tamam).toBe(true);
  });
});

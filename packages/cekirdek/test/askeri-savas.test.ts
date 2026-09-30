/**
 * Savaş çözümü testleri: güç hesabı, kayıplar, yağma ve kayıp tavanı (H5), özellik testi, H5 senaryosu.
 * Ekonomi/lojistik sahte: stoklar savaş dışında değişmez.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/ekonomi", () => ({ saatlikTik: vi.fn(), insaatBitti: vi.fn(), ekonomiKomutu: vi.fn() }));
vi.mock("../src/lojistik/cozum", () => ({ lojistikCoz: vi.fn(), lojistikKomutu: vi.fn() }));

import { ETIKETLER, miniVeriyiYukle } from "@bolge/veri";
import type { Etiket, VeriPaketi } from "@bolge/veri";
import { KAYBEDEN_KAYIP_PPM, KAZANAN_KAYIP_PPM, kayipTavaniUygula } from "../src/askeri/savas";
import { Simulasyon } from "../src/motor";
import { ppmUygula } from "../src/sabit";
import { GUN, PPM } from "../src/tipler";
import type { SavasDurumu, SavunmaDurusu } from "../src/tipler";

const TEMEL = miniVeriyiYukle();

interface Kurulum {
  s: Simulasyon;
  sv: SavasDurumu;
}

/** a = m_ova (saldıran), b = m_liman (savunan; etiketler kiyi+liman). Korumasız; savaş t=1'de ilan edilir. */
function savasKur(
  tohum: number,
  duzenle: (s: Simulasyon) => void = () => {},
  veri: VeriPaketi = structuredClone(TEMEL),
): Kurulum {
  const s = Simulasyon.olustur(veri, tohum);
  for (const [o, b] of [["a", "m_ova"], ["b", "m_liman"]] as const) {
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler: [b] } });
  }
  for (const o of s.dunya.oyuncular) o.korumaBitis = 0;
  duzenle(s);
  const r = s.uygula({ t: 1, oyuncu: "a", komut: { tur: "savas_ilan", saldiranBolge: "m_ova", hedefBolge: "m_liman" } });
  expect(r).toEqual({ tamam: true });
  return { s, sv: s.dunya.savaslar[0]! };
}

const bolge = (s: Simulasyon, id: string) => s.dunya.bolgeler[s.ic.bolgeIndeks[id] as number]!;
const piyade = (s: Simulasyon) => s.ic.birlikIndeks["piyade_tumeni"] as number;
const zirhli = (s: Simulasyon) => s.ic.birlikIndeks["zirhli_tumen"] as number;

function coz(k: Kurulum) {
  k.s.calistirKadar(k.sv.pencereBitis);
  expect(k.sv.evre).toBe("bitti");
  return k.sv.sonuc!;
}

describe("kayipTavaniUygula", () => {
  it("min(yagma, tavan) uygular ve [0, anlik] araliginda kalir", () => {
    expect(kayipTavaniUygula(1000, 400_000, 250_000)).toBe(250);
    expect(kayipTavaniUygula(1000, 100_000, 250_000)).toBe(100);
    expect(kayipTavaniUygula(1000, PPM, PPM)).toBe(1000);
    expect(kayipTavaniUygula(1000, 5 * PPM, 5 * PPM)).toBe(1000);
    expect(kayipTavaniUygula(0, 400_000, 250_000)).toBe(0);
    expect(kayipTavaniUygula(-5, 400_000, 250_000)).toBe(0);
    expect(kayipTavaniUygula(7, 400_000, 250_000)).toBe(1);
    expect(kayipTavaniUygula(20_000_000, PPM, 250_000)).toBe(5_000_000);
  });
});

describe("guc hesabi", () => {
  it("guc = toplam guc x sapma(%90..%110); savunan arazi carpani (en buyuk etiket) uygulanir", () => {
    for (let tohum = 1; tohum <= 20; tohum++) {
      const k = savasKur(tohum, (s) => {
        bolge(s, "m_ova").birlikler[piyade(s)] = 4; // 400
        bolge(s, "m_liman").birlikler[piyade(s)] = 3; // 300, kiyi(1.0)+liman(1.1) -> 1.1
      });
      const r = coz(k);
      expect(r.saldiranGuc).toBeGreaterThanOrEqual(360);
      expect(r.saldiranGuc).toBeLessThanOrEqual(440);
      expect(r.savunanGuc).toBeGreaterThanOrEqual(ppmUygula(330, 900_000));
      expect(r.savunanGuc).toBeLessThanOrEqual(ppmUygula(330, 1_100_000));
    }
  });

  it("etiketsiz hedefte arazi carpani 1; ikmal karsilanma gucu carpar; sifir ikmal saldirani etkisiz kilar", () => {
    const k = savasKur(3, (s) => {
      bolge(s, "m_liman").etiketler = [];
      bolge(s, "m_liman").birlikler[piyade(s)] = 10; // 1000
      bolge(s, "m_ova").birlikler[piyade(s)] = 20;
      bolge(s, "m_ova").ikmalKarsilanmaPpm = 500_000; // 2000 * 0.5 = 1000
    });
    const r = coz(k);
    expect(r.saldiranGuc).toBeGreaterThanOrEqual(900);
    expect(r.saldiranGuc).toBeLessThanOrEqual(1100);
    expect(r.savunanGuc).toBeGreaterThanOrEqual(900);
    expect(r.savunanGuc).toBeLessThanOrEqual(1100);

    const k0 = savasKur(3, (s) => {
      bolge(s, "m_ova").birlikler[piyade(s)] = 50;
      bolge(s, "m_ova").ikmalKarsilanmaPpm = 0;
    });
    const r0 = coz(k0);
    expect(r0.saldiranGuc).toBe(0);
    expect(r0.kazanan).toBe("b");
  });

  it("savunma durusu ayni tohumla savunma gucunu artirir (x1.3)", () => {
    for (let tohum = 1; tohum <= 10; tohum++) {
      const gucler = (durus: SavunmaDurusu) =>
        coz(savasKur(tohum, (s) => {
          bolge(s, "m_liman").birlikler[piyade(s)] = 10;
          bolge(s, "m_liman").savunma.durus = durus;
        })).savunanGuc;
      const normal = gucler("normal");
      const savunma = gucler("savunma");
      expect(savunma).toBeGreaterThan(normal);
      expect(Math.abs(savunma - Math.floor((normal * 1_300_000) / PPM))).toBeLessThanOrEqual(2);
    }
  });

  it("esitlik savunana gider", () => {
    // İkisi de sıfır güç (birliksiz savunan + ikmalsiz saldıran)
    const k = savasKur(1, (s) => {
      bolge(s, "m_liman").birlikler.fill(0);
      bolge(s, "m_ova").ikmalKarsilanmaPpm = 0;
    });
    const r = coz(k);
    expect(r.saldiranGuc).toBe(0);
    expect(r.savunanGuc).toBe(0);
    expect(r.kazanan).toBe("b");
    expect(r.stokKaybi.every((x) => x === 0)).toBe(true);
  });
});

describe("kayiplar ve yagma", () => {
  it("saldiran kazanirsa: kaybeden %30, kazanan %10 birlik kaybi; yagma tavanli; saldiranin bolgesine eklenir", () => {
    expect([KAYBEDEN_KAYIP_PPM, KAZANAN_KAYIP_PPM]).toEqual([300_000, 100_000]);
    const k = savasKur(5, (s) => {
      bolge(s, "m_ova").birlikler[piyade(s)] = 50;
      bolge(s, "m_ova").birlikler[zirhli(s)] = 7;
      bolge(s, "m_liman").birlikler[piyade(s)] = 9;
      bolge(s, "m_liman").birlikler[zirhli(s)] = 1;
    });
    const ova = bolge(k.s, "m_ova");
    const liman = bolge(k.s, "m_liman");
    const ovaStok = ova.stoklar.map((x) => x.miktar);
    const limanStok = liman.stoklar.map((x) => x.miktar);
    const r = coz(k);
    expect(r.kazanan).toBe("a");
    expect(r.saldiranBirlikKaybi[piyade(k.s)]).toBe(5);
    expect(r.saldiranBirlikKaybi[zirhli(k.s)]).toBe(1); // tavan(0.7)
    expect(r.savunanBirlikKaybi[piyade(k.s)]).toBe(3); // tavan(2.7)
    expect(r.savunanBirlikKaybi[zirhli(k.s)]).toBe(1); // tavan(0.3)
    expect(ova.birlikler[piyade(k.s)]).toBe(45);
    expect(liman.birlikler[piyade(k.s)]).toBe(6);
    for (let m = 0; m < k.s.ic.mallar.length; m++) {
      const tavan = ppmUygula(limanStok[m]!, k.s.ic.param.askeri.kayipTavaniPpm);
      expect(r.stokKaybi[m]).toBe(Math.min(ppmUygula(limanStok[m]!, k.s.ic.param.askeri.yagmaOraniPpm), tavan));
      expect(liman.stoklar[m]!.miktar).toBe(limanStok[m]! - r.stokKaybi[m]!);
      expect(ova.stoklar[m]!.miktar).toBe(ovaStok[m]! + r.stokKaybi[m]!);
    }
    expect(r.kayipOraniPpm).toBeGreaterThan(0);
    expect(r.kayipOraniPpm).toBeLessThanOrEqual(k.s.ic.param.askeri.kayipTavaniPpm);
  });

  it("savunan kazanirsa stok kaybi yok; saldiran %30, savunan %10 kaybeder", () => {
    const k = savasKur(5, (s) => {
      bolge(s, "m_ova").birlikler[piyade(s)] = 10;
      bolge(s, "m_liman").birlikler[piyade(s)] = 100;
    });
    const liman = bolge(k.s, "m_liman");
    const once = liman.stoklar.map((x) => x.miktar);
    const r = coz(k);
    expect(r.kazanan).toBe("b");
    expect(r.stokKaybi.every((x) => x === 0)).toBe(true);
    expect(r.kayipOraniPpm).toBe(0);
    expect(liman.stoklar.map((x) => x.miktar)).toEqual(once);
    expect(r.saldiranBirlikKaybi[piyade(k.s)]).toBe(3);
    expect(r.savunanBirlikKaybi[piyade(k.s)]).toBe(10);
  });

  it("geri_cekil: savunan gucu 0, savunan birlik kaybi 0, saldiran kazanir", () => {
    const k = savasKur(9, (s) => {
      bolge(s, "m_ova").birlikler[piyade(s)] = 3;
      bolge(s, "m_liman").birlikler[piyade(s)] = 500;
      bolge(s, "m_liman").savunma.durus = "geri_cekil";
    });
    const liman = bolge(k.s, "m_liman");
    const r = coz(k);
    expect(r.savunanGuc).toBe(0);
    expect(r.kazanan).toBe("a");
    expect(r.savunanBirlikKaybi.every((x) => x === 0)).toBe(true);
    expect(liman.birlikler[piyade(k.s)]).toBe(500);
    expect(r.stokKaybi.some((x) => x > 0)).toBe(true);
  });

  it("saldiranin deposuna sigmayan yagma israfa yazilir", () => {
    const k = savasKur(5, (s) => {
      bolge(s, "m_ova").birlikler[piyade(s)] = 50;
      const m = s.ic.malIndeks["celik"] as number;
      const ova = bolge(s, "m_ova");
      ova.stoklar[m]!.miktar = ova.stoklar[m]!.kapasite;
    });
    const ova = bolge(k.s, "m_ova");
    const m = k.s.ic.malIndeks["celik"] as number;
    const r = coz(k);
    expect(r.stokKaybi[m]).toBeGreaterThan(0);
    expect(ova.stoklar[m]!.miktar).toBe(ova.stoklar[m]!.kapasite);
    expect(ova.israf[m]).toBe(r.stokKaybi[m]);
  });

  it("pencere sirasinda hedef bolge el degistirirse savas sonucsuz biter", () => {
    const k = savasKur(5, (s) => {
      bolge(s, "m_ova").birlikler[piyade(s)] = 50;
    });
    k.s.calistirKadar(k.sv.pencereBaslangic);
    expect(k.sv.evre).toBe("pencere");
    const liman = bolge(k.s, "m_liman");
    const once = liman.stoklar.map((x) => x.miktar);
    liman.sahip = null;
    const ovaBirlik = [...bolge(k.s, "m_ova").birlikler];
    const r = coz(k);
    expect(r.kazanan).toBe("b");
    expect(r.saldiranGuc).toBe(0);
    expect(r.stokKaybi.every((x) => x === 0)).toBe(true);
    expect(r.kayipOraniPpm).toBe(0);
    expect(liman.stoklar.map((x) => x.miktar)).toEqual(once);
    expect(bolge(k.s, "m_ova").birlikler).toEqual(ovaBirlik);
  });

  it("ayni tohum -> ayni sonuc ve durum ozeti; farkli tohum sapmayi degistirebilir", () => {
    const calistir = (tohum: number) => {
      const k = savasKur(tohum, (s) => {
        bolge(s, "m_ova").birlikler[piyade(s)] = 6;
        bolge(s, "m_liman").birlikler[piyade(s)] = 6;
      });
      const r = coz(k);
      return { r, ozet: k.s.durumOzeti() };
    };
    expect(calistir(11)).toEqual(calistir(11));
    const guclar = new Set<number>();
    for (let t = 1; t <= 12; t++) guclar.add(calistir(t).r.saldiranGuc);
    expect(guclar.size).toBeGreaterThan(3);
  });
});

// ---------------------------------------------------------------------------
// Özellik testi (H5): rastgele durumlarda kayıp tavanı asla aşılmaz
// ---------------------------------------------------------------------------

/** Testte kullanılan küçük deterministik üreteç (mulberry32); çekirdek PRNG'sinden bağımsızdır. */
function uretec(tohum: number): (n: number) => number {
  let a = tohum >>> 0;
  return (n: number) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return Math.floor(u * n);
  };
}

interface OzellikDurumu {
  k: Kurulum;
  hedefOnce: number[];
  saldiranOnce: number[];
  saldiranIsrafOnce: number[];
  durus: SavunmaDurusu;
  tavanPpm: number;
}

function ozellikKur(durumTohumu: number): OzellikDurumu {
  const r = uretec(durumTohumu);
  const veri = structuredClone(TEMEL);
  const a = veri.param.askeri;
  a.yagmaOraniPpm = r(5) === 0 ? PPM : r(PPM + 1);
  a.kayipTavaniPpm = r(3) === 0 ? r(PPM + 1) : 250_000;
  const durumlar: SavunmaDurusu[] = ["normal", "savunma", "geri_cekil"];
  const durus = durumlar[r(3)]!;
  const etiketSayisi = r(4);
  const etiketler: Etiket[] = [];
  for (let i = 0; i < etiketSayisi; i++) {
    const e = ETIKETLER[r(ETIKETLER.length)]!;
    if (!etiketler.includes(e)) etiketler.push(e);
  }
  let hedefOnce: number[] = [];
  let saldiranOnce: number[] = [];
  let saldiranIsrafOnce: number[] = [];
  const k = savasKur(
    durumTohumu,
    (s) => {
      const ova = bolge(s, "m_ova");
      const liman = bolge(s, "m_liman");
      const kap = liman.stoklar[0]!.kapasite;
      for (let m = 0; m < s.ic.mallar.length; m++) {
        const tur = r(4);
        liman.stoklar[m]!.miktar = tur === 0 ? 0 : tur === 1 ? r(50) : tur === 2 ? kap : r(kap + 1);
        const ot = r(3);
        ova.stoklar[m]!.miktar = ot === 0 ? ova.stoklar[m]!.kapasite : r(ova.stoklar[m]!.kapasite + 1);
        s.dunya.pazar.fiyat[m] = 1 + r(200_000);
      }
      ova.birlikler[piyade(s)] = 1 + r(60);
      ova.birlikler[zirhli(s)] = r(30);
      liman.birlikler[piyade(s)] = r(60);
      liman.birlikler[zirhli(s)] = r(30);
      ova.ikmalKarsilanmaPpm = r(5) === 0 ? PPM : r(PPM + 1);
      liman.ikmalKarsilanmaPpm = r(5) === 0 ? PPM : r(PPM + 1);
      liman.etiketler = etiketler;
      liman.savunma.durus = durus;
      hedefOnce = liman.stoklar.map((x) => x.miktar);
      saldiranOnce = ova.stoklar.map((x) => x.miktar);
      saldiranIsrafOnce = [...ova.israf];
    },
    veri,
  );
  return { k, hedefOnce, saldiranOnce, saldiranIsrafOnce, durus, tavanPpm: a.kayipTavaniPpm };
}

describe("ozellik testi: kayip tavani (H5)", () => {
  it("500 rastgele durumda stok kaybi ve kayipOraniPpm tavani asmaz; geri_cekil kaybi 0; tutarli muhasebe; deterministik", () => {
    let saldiranKazandi = 0;
    let tavanaDayanan = 0;
    for (let i = 0; i < 500; i++) {
      const durumTohumu = 1000 + i;
      const o = ozellikKur(durumTohumu);
      const { k } = o;
      const r = coz(k);
      const ova = bolge(k.s, "m_ova");
      const liman = bolge(k.s, "m_liman");
      const ctx = `durum ${durumTohumu}`;

      expect(r.kayipOraniPpm, ctx).toBeLessThanOrEqual(o.tavanPpm);
      expect(r.kayipOraniPpm, ctx).toBeGreaterThanOrEqual(0);
      for (let m = 0; m < k.s.ic.mallar.length; m++) {
        const once = o.hedefOnce[m]!;
        const al = r.stokKaybi[m]!;
        expect(al, `${ctx} mal ${m}`).toBeGreaterThanOrEqual(0);
        expect(al, `${ctx} mal ${m}`).toBeLessThanOrEqual(once);
        // al / once <= tavan  <=>  al x PPM <= once x tavan (tam tamsayı karşılaştırma)
        expect(BigInt(al) * BigInt(PPM) <= BigInt(once) * BigInt(o.tavanPpm), `${ctx} mal ${m} tavan`).toBe(true);
        expect(liman.stoklar[m]!.miktar, ctx).toBe(once - al);
        // Muhasebe: saldıranın stoku + israfı, yağmayı tam yansıtır
        expect(
          ova.stoklar[m]!.miktar + (ova.israf[m]! - o.saldiranIsrafOnce[m]!),
          `${ctx} muhasebe ${m}`,
        ).toBe(o.saldiranOnce[m]! + al);
      }
      if (r.kazanan === "b") {
        expect(r.stokKaybi.every((x) => x === 0), ctx).toBe(true);
        expect(r.kayipOraniPpm, ctx).toBe(0);
      } else {
        saldiranKazandi++;
        if (r.kayipOraniPpm > 0) tavanaDayanan++;
      }
      if (o.durus === "geri_cekil") {
        expect(r.savunanGuc, ctx).toBe(0);
        expect(r.savunanBirlikKaybi.every((x) => x === 0), ctx).toBe(true);
      }
      for (const b of [...ova.birlikler, ...liman.birlikler]) expect(b).toBeGreaterThanOrEqual(0);

      // Aynı tohum -> aynı sonuç
      const tekrar = ozellikKur(durumTohumu);
      const r2 = coz(tekrar.k);
      expect(r2, ctx).toEqual(r);
      expect(tekrar.k.s.durumOzeti(), ctx).toBe(k.s.durumOzeti());
    }
    // Testin gerçekten yağma yolunu sınadığından emin ol
    expect(saldiranKazandi).toBeGreaterThan(50);
    expect(tavanaDayanan).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// H5 senaryosu: çevrimdışı oyuncu, 48 saatlik savaş
// ---------------------------------------------------------------------------

describe("H5 senaryosu", () => {
  it("B hic komut vermez (48 saat cevrimdisi); pencere sonunda B'nin hedef bolgesindeki stok kaybi <= %25", () => {
    const s = Simulasyon.olustur(structuredClone(TEMEL), 42);
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_liman"] } });
    const ova = bolge(s, "m_ova");
    ova.birlikler[piyade(s)] = 30;

    // Yeni oyuncu koruması bitince (7 gün) A saldırır; B bundan sonra hiçbir komut vermez.
    const t0 = 7 * GUN;
    s.calistirKadar(t0);
    expect(s.uygula({ t: t0, oyuncu: "a", komut: { tur: "savas_ilan", saldiranBolge: "m_ova", hedefBolge: "m_liman" } })).toEqual({ tamam: true });
    const sv = s.dunya.savaslar[0]!;
    const liman = bolge(s, "m_liman");
    const once = liman.stoklar.map((x) => x.miktar);

    s.calistirKadar(sv.pencereBitis);
    expect(sv.pencereBitis - t0).toBeLessThanOrEqual(48 * 3_600_000);
    expect(sv.evre).toBe("bitti");
    const r = sv.sonuc!;
    expect(r.kazanan).toBe("a");
    expect(s.gunluk.filter((k) => k.oyuncu === "b")).toEqual([]);

    let kayipVar = false;
    for (let m = 0; m < once.length; m++) {
      const kayip = once[m]! - liman.stoklar[m]!.miktar;
      expect(kayip).toBe(r.stokKaybi[m]);
      expect(kayip * 4).toBeLessThanOrEqual(once[m]!); // <= %25
      if (kayip > 0) kayipVar = true;
    }
    expect(kayipVar).toBe(true);
    expect(r.kayipOraniPpm).toBeLessThanOrEqual(250_000);
  });
});

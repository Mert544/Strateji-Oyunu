/**
 * Pazar v1 (B3) determinizmi: aynı tohum + aynı günlük = aynı özet; klonla ve yenidenOynat pazar açıkken (varsayılan içerik:
 * tarım, sanayi ve pazar açık) bit bit aynıdır. Senaryo iki limanlı ticaret, anlaşma/yaptırım, kıtlık ve ticaret rejimi değişimini içerir.
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { GUN } from "../src/tipler";
import type { Komut } from "../src/tipler";

function veri(): VeriPaketi {
  const v = miniVeriyiYukle();
  // İkinci liman (m_sehir, kapıya 24 saat): liman primi ve kıtlık yolları gerçek varsayılan parametrelerle çalışsın.
  const sehir = v.harita.bolgeler.find((b) => b.id === "m_sehir")!;
  sehir.etiketler.push("liman");
  sehir.liman = { dunyaKapisi: false, dunyaMesafeSaat: 24, kapasiteSinifi: 1 };
  v.param.baslangic.hazine = 5_000_000_000;
  return v;
}

const ADIMLAR: Array<{ t: number; oyuncu: string; komut: Komut }> = [
  { t: 0, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 60_000 } },
  { t: 0, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_sehir", mal: "parca", yon: "ihracat", oranSaat: 30_000 } },
  { t: 0, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_sehir", mal: "petrol", yon: "ithalat", oranSaat: 20_000 } },
  { t: 1 * GUN, oyuncu: "b", komut: { tur: "vergi_ayarla", oranPpm: 120_000 } },
  { t: 3 * GUN, oyuncu: "a", komut: { tur: "anlasma_teklif", karsi: "b", anlasma: "ticaret" } },
  { t: 3 * GUN, oyuncu: "b", komut: { tur: "anlasma_teklif", karsi: "a", anlasma: "ticaret" } },
  { t: 8 * GUN, oyuncu: "b", komut: { tur: "yaptirim", hedef: "a", aktif: true } },
  { t: 10 * GUN, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "gida", yon: "ithalat", oranSaat: 80_000 } },
  { t: 12 * GUN, oyuncu: "b", komut: { tur: "yaptirim", hedef: "a", aktif: false } },
  { t: 20 * GUN, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 0 } },
];

function kos(gun: number, sim?: Simulasyon): Simulasyon {
  const s = sim ?? Simulasyon.olustur(veri(), 3);
  if (sim === undefined) {
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman", "m_gecit", "m_sehir"] } });
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_dag", "m_col"] } });
  }
  for (const a of ADIMLAR) {
    if (a.t > gun * GUN || a.t < s.dunya.zaman) continue;
    const r = s.uygula({ t: a.t, oyuncu: a.oyuncu, komut: a.komut });
    if (!r.tamam) throw new Error(`komut basarisiz (${a.komut.tur}): ${r.hata}`);
  }
  s.calistirKadar(gun * GUN);
  return s;
}

describe("pazar v1 determinizmi (varsayılan içerik: pazar açık)", () => {
  it("iki bağımsız koşu aynı özeti verir (30 gün)", () => {
    const a = kos(30);
    const b = kos(30);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    expect(a.dunya.pazar.kaynak).toBe("npc");
    expect(a.dunya.oyuncular.every((o) => o.ticaretDefteri !== undefined)).toBe(true);
  });

  it("yenidenOynat(günlük) aynı özeti verir ve ticaret defteri aynıdır (30 gün)", () => {
    const a = kos(30);
    const b = Simulasyon.yenidenOynat(veri(), 3, a.gunluk);
    b.calistirKadar(30 * GUN);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
    expect(b.dunya.oyuncular.map((o) => o.ticaretDefteri)).toEqual(a.dunya.oyuncular.map((o) => o.ticaretDefteri));
    expect(b.dunya.bolgeler.map((x) => [x.kitlikKademesi, x.kitlikT, x.temelKarsilanmaPpm])).toEqual(
      a.dunya.bolgeler.map((x) => [x.kitlikKademesi, x.kitlikT, x.temelKarsilanmaPpm]),
    );
  });

  it("klonla: klon bağımsızdır ve aynı komutlarla özdeş ilerler; orijinali etkilemez", () => {
    const a = kos(10);
    const klon = a.klonla();
    expect(klon.durumOzeti()).toBe(a.durumOzeti());
    a.calistirKadar(25 * GUN);
    const klonOnce = klon.durumOzeti();
    klon.calistirKadar(25 * GUN);
    expect(klon.durumOzeti()).toBe(a.durumOzeti());
    expect(klonOnce).not.toBe(klon.durumOzeti());
    // klonu ilerletmek orijinali değiştirmez
    const b = kos(10);
    b.calistirKadar(25 * GUN);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
  });

  it("400 günlük koşu determinizmi (kıtlık kademesi ve defter dahil)", () => {
    const a = kos(400);
    const b = Simulasyon.yenidenOynat(veri(), 3, a.gunluk);
    b.calistirKadar(400 * GUN);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
    for (const x of a.dunya.bolgeler) expect(x.kitlikKademesi).toBeLessThanOrEqual(3);
  });
});

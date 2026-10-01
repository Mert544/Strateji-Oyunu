/**
 * Botlar ve pazar katmanı (B3): liman ölçeği (prim ve komisyon), liman seçimi (tüccar prim farkını kullanır, sınırlı), NPC likiditesi,
 * kıtlık açığına ithalat, kapalı mod (B3 öncesi sabitler), determinizm ve entegrasyon (çekirdek komutları kabul eder, kıtlık <= 3).
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, Simulasyon } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Bakis, botOlustur, kos, ticaretAdaylari } from "../src";
import type { ArketipAdi } from "../src";

/** İki limanlı mini harita: m_liman dünya kapısı, m_sehir 24 saat (prim %6) uzakta. Pazar açık (varsayılan). */
function veri(duzenle?: (v: VeriPaketi) => void, pazarKapali = false): VeriPaketi {
  const v = miniVeriyiYukle();
  const sehir = v.harita.bolgeler.find((b) => b.id === "m_sehir")!;
  sehir.etiketler.push("liman");
  sehir.liman = { dunyaKapisi: false, dunyaMesafeSaat: 24, kapasiteSinifi: 1 };
  v.param.baslangic.hazine = 5_000_000_000;
  if (pazarKapali) {
    for (const a of ["makasPpm", "anlasmaMakasPpm", "yaptirimMakasPpm", "limanPrimPpmSaat", "limanPrimTavaniPpm", "islemKomisyonuPpm", "npcLikiditeTabanOyuncu", "kitlik", "tarife"] as const) {
      delete v.param.pazar[a];
    }
  }
  duzenle?.(v);
  return v;
}

function kur(bolgeler: string[], v: VeriPaketi, ekOyuncular: Record<string, string[]> = {}): Simulasyon {
  const s = Simulasyon.olustur(v, 1);
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler } });
  for (const [id, b] of Object.entries(ekOyuncular)) s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: id, bolgeler: b } });
  s.calistirKadar(2 * SAAT);
  return s;
}

function bolgeDurumu(s: Simulasyon, id: string) {
  return s.dunya.bolgeler[s.ic.bolgeIndeks[id] as number]!;
}

function stokYaz(s: Simulasyon, bolge: string, mal: string, miktar: number): void {
  const st = bolgeDurumu(s, bolge).stoklar[s.ic.malIndeks[mal] as number]!;
  st.miktar = Math.min(miktar, st.kapasite);
  st.t0 = s.dunya.zaman;
  st.artik = 0;
}

describe("Bakis: pazar yardımcıları", () => {
  it("liman ölçeği: kapı 1 (komisyon korumada yok), uzak liman ihracatta < 1, ithalatta > 1; kapalıyken her zaman 1", () => {
    const s = kur(["m_ova", "m_liman", "m_sehir"], veri());
    const b = new Bakis(s, "a");
    const kapi = bolgeDurumu(s, "m_liman");
    const uzak = bolgeDurumu(s, "m_sehir");
    expect(b.pazarAcik).toBe(true);
    expect(b.limanOlcegi(kapi, "ihracat")).toBe(1); // prim 0, komisyon 0 (yeni oyuncu koruması)
    expect(b.limanOlcegi(uzak, "ihracat")).toBeCloseTo(0.94, 5);
    expect(b.limanOlcegi(uzak, "ithalat")).toBeCloseTo(1.06, 5);
    s.dunya.oyuncular[0]!.korumaBitis = 0; // koruma bitti: komisyon %1
    const b2 = new Bakis(s, "a");
    expect(b2.limanOlcegi(kapi, "ihracat")).toBeCloseTo(0.99, 5);
    expect(b2.limanOlcegi(uzak, "ihracat")).toBeCloseTo(0.94 * 0.99, 4);

    const k = kur(["m_ova", "m_liman", "m_sehir"], veri(undefined, true));
    const bk = new Bakis(k, "a");
    expect(bk.pazarAcik).toBe(false);
    expect(bk.limanOlcegi(bolgeDurumu(k, "m_sehir"), "ihracat")).toBe(1);
    expect(bk.limanOlcegi(bolgeDurumu(k, "m_sehir"), "ithalat")).toBe(1);
    expect(bk.npcOlcegi()).toBe(1);
    expect(bk.kitlikAcigi(0)).toBe(0);
    expect(bk.enYuksekKitlik()).toBe(0);
  });

  it("NPC likidite ölçeği: oyuncu sayısı 4'ün üstünde orantılı büyür", () => {
    const dort = kur(["m_ova", "m_liman"], veri(), { b: ["m_sehir"], c: ["m_col"], d: ["m_dag"] });
    expect(new Bakis(dort, "a").npcOlcegi()).toBe(1);
    const alti = kur(["m_ova"], veri(), { b: ["m_liman"], c: ["m_sehir"], d: ["m_col"], e: ["m_dag"], f: ["m_gecit"] });
    expect(new Bakis(alti, "a").npcOlcegi()).toBe(1.5);
  });

  it("nakit çarpanı: ithalat > 1 > ihracat; tarife etiket fiyatına değil nakde girmez", () => {
    const s = kur(["m_ova", "m_liman", "m_sehir"], veri());
    s.dunya.oyuncular[0]!.korumaBitis = 0;
    const b = new Bakis(s, "a");
    const uzak = bolgeDurumu(s, "m_sehir");
    expect(b.nakitCarpani(uzak, "ithalat")).toBeGreaterThan(1.1);
    expect(b.nakitCarpani(uzak, "ihracat")).toBeLessThan(0.9);
    expect(b.nakitCarpani(uzak, "ithalat") * 1000).toBeGreaterThan(b.nakitCarpani(uzak, "ihracat") * 1000);
  });
});

describe("ticaretAdaylari: liman seçimi (tüccar prim farkını kullanır, sınırlı)", () => {
  /** Yakıt iki limanda da bol; m_sehir'de daha fazla (%8 depo) -> eski kural m_sehir'i seçerdi. */
  function ihracatLimani(primDuy: number, pazarKapali = false): string | undefined {
    const s = kur(["m_ova", "m_liman", "m_sehir", "m_gecit"], veri(undefined, pazarKapali));
    s.dunya.oyuncular[0]!.korumaBitis = 0;
    stokYaz(s, "m_liman", "yakit", 5_000_000);
    stokYaz(s, "m_sehir", "yakit", 5_800_000);
    for (const bol of ["m_ova", "m_gecit"]) stokYaz(s, bol, "yakit", 0);
    s.calistirKadar(s.dunya.zaman + 1);
    const adaylar = ticaretAdaylari(new Bakis(s, "a"), { ihracatEsigi: 0.05, ithalat: false, primDuyarliligi: primDuy });
    const ihr = adaylar.find((a) => a.konu === "ihracat_yakit");
    return ihr?.bolge;
  }

  it("duyarlılık 0 (B3 öncesi kural): en çok stoklu limandan ihracat; duyarlılık 1 (tüccar): daha ucuz (kapı) limandan", () => {
    expect(ihracatLimani(0)).toBe("m_sehir");
    expect(ihracatLimani(1)).toBe("m_liman");
  });

  it("pazar kapalıyken duyarlılık etkisizdir: her zaman stok kuralı", () => {
    expect(ihracatLimani(1, true)).toBe("m_sehir");
    expect(ihracatLimani(0, true)).toBe("m_sehir");
  });

  it("duyarlılık 0,5 (varsayılan, tüccar dışı) %8 depo farkını %6 prim farkına tercih eder: prim etkisi sınırlı", () => {
    expect(ihracatLimani(0.5)).toBe("m_sehir");
  });

  it("ithalat: tüccar 24 saat uzak limana değil kapı limanına yönelir", () => {
    const ithLimani = (duy: number): string | undefined => {
      // m_liman, m_sehir, m_gecit: gıda üreticisi yok -> nüfus tüketimi gıda stokunu eritir (net < 0)
      const s = kur(["m_liman", "m_sehir", "m_gecit"], veri());
      s.dunya.oyuncular[0]!.korumaBitis = 0;
      for (const bol of ["m_liman", "m_sehir", "m_gecit"]) stokYaz(s, bol, "gida", 0);
      stokYaz(s, "m_liman", "gida", 300_000); // m_sehir'de 0: eski kural en az stoklu limanı (m_sehir) seçer
      s.calistirKadar(s.dunya.zaman + 1 * SAAT);
      const adaylar = ticaretAdaylari(new Bakis(s, "a"), { ithalat: true, primDuyarliligi: duy });
      return adaylar.find((a) => a.konu === "ithalat_gida")?.bolge;
    };
    expect(ithLimani(0)).toBe("m_sehir");
    expect(ithLimani(1)).toBe("m_liman");
  });
});

describe("kıtlık cezası ve ithalat", () => {
  it("kıtlık altındaki bölgenin gıda açığına ithalat emri üretilir (stok ufku şartı aranmaz); kapalıyken kıtlık açığı yok", () => {
    const kurK = (pazarKapali: boolean) => {
      // m_gecit liman değil ve ulaşım yok (m_ova yok): gıdasız kalır; m_liman'da bol gıda var (toplam stok ufku yeterli görünür)
      const s = kur(["m_gecit", "m_liman"], veri(undefined, pazarKapali));
      stokYaz(s, "m_gecit", "gida", 0);
      stokYaz(s, "m_liman", "gida", 6_000_000); // liman deposu %60: ithalat durdurma eşiğinin (%70) altında
      s.calistirKadar(s.dunya.zaman + 6 * SAAT);
      return s;
    };
    const s = kurK(false);
    const b = new Bakis(s, "a");
    const gida = s.ic.malIndeks["gida"] as number;
    expect(bolgeDurumu(s, "m_gecit").kitlikKademesi).toBe(3);
    expect(b.kitlikAcigi(gida)).toBeGreaterThan(0);
    const adaylar = ticaretAdaylari(b, { ithalat: true });
    const ith = adaylar.find((a) => a.konu === "ithalat_gida");
    expect(ith).toBeDefined();
    const oran = (ith!.komut as Extract<Komut, { tur: "ticaret_emri" }>).oranSaat;
    expect(oran).toBeGreaterThanOrEqual(Math.floor(b.kitlikAcigi(gida) * 1.2 * 0.5)); // en az 1,2 x açık x fiyat duyarlılığı alt sınırı
    expect(new Bakis(kurK(true), "a").kitlikAcigi(gida)).toBe(0);
  });

  it("kıtlık yoksa ve stok ufku yetiyorsa gıda ithalatı önerilmez", () => {
    const s = kur(["m_ova", "m_liman", "m_gecit"], veri());
    for (const bol of ["m_ova", "m_liman", "m_gecit"]) stokYaz(s, bol, "gida", 9_000_000);
    s.calistirKadar(s.dunya.zaman + 2 * SAAT);
    const gida = s.ic.malIndeks["gida"] as number;
    const b = new Bakis(s, "a");
    expect(b.kitlikAcigi(gida)).toBe(0);
    expect(ticaretAdaylari(b, { ithalat: true }).find((a) => a.konu === "ithalat_gida")).toBeUndefined();
  });
});

describe("botlar pazar açıkken", () => {
  const DORT: ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist"];

  function koshu(tohum: number, gun: number) {
    const v = veri();
    const gruplar = [["m_ova", "m_liman"], ["m_sehir"], ["m_gecit", "m_dag"], ["m_col"]];
    const oyuncular = gruplar.map((bolgeler, i) => ({ id: `o${i}`, bolgeler, bot: botOlustur(DORT[i] as ArketipAdi, `o${i}`, tohum), katilmaMs: 0 }));
    return kos({ veri: v, tohum, oyuncular, sureMs: gun * GUN });
  }

  it("deterministik: aynı tohum aynı durumOzeti; çekirdek bot komutlarını kabul eder (reddedilme < %30); kıtlık kademesi <= 3", () => {
    const a = koshu(1, 12);
    const b = koshu(1, 12);
    expect(a.sim.durumOzeti()).toBe(b.sim.durumOzeti());
    for (const [id, ok] of Object.entries(a.komutSayisi)) {
      const hata = a.basarisizSayisi[id] ?? 0;
      expect(hata / Math.max(1, ok + hata)).toBeLessThan(0.3);
    }
    for (const x of a.sim.dunya.bolgeler) expect(x.kitlikKademesi ?? 0).toBeLessThanOrEqual(3);
    // ticaret defteri doldu: makas ve komisyon kalemleri var, defter kalemleri negatif değil
    const toplam = a.sim.dunya.oyuncular.map((o) => o.ticaretDefteri!.toplam);
    for (const t of toplam) for (const v of Object.values(t)) expect(v).toBeGreaterThanOrEqual(0);
    expect(toplam.some((t) => t.makas > 0)).toBe(true);
  });

  it("tüccar pazar açıkken de ticaret yapar (ihracat emri verir)", () => {
    const r = koshu(2, 6);
    expect(r.komutTurleri["ticaret_emri"] ?? 0).toBeGreaterThan(0);
  });
});

/**
 * Botlar ve tarım katmanı (B1): ekim_plani ve gubre_dozu adayları, kur_ve_unut ilk planı, kapalı mod, determinizm.
 */
import { describe, expect, it } from "vitest";
import { GUN, PPM, SAAT, Simulasyon } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import { Bakis, botOlustur, kos, onayarBul, tarimAdaylari } from "../src";

const KUZEY = ["m_ova", "m_liman", "m_gecit"];
const GUNEY = ["m_dag", "m_col", "m_sehir"];

function sim(kapali = false): Simulasyon {
  const v = miniVeriyiYukle();
  if (kapali) {
    delete v.param.iklim;
    delete v.param.tarim;
  }
  const s = Simulasyon.olustur(v, 1);
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: KUZEY } });
  s.calistirKadar(0);
  return s;
}

describe("tarimAdaylari", () => {
  it("toprak sağlıklıyken monokültür sürer (aday yok); düşünce ekim nöbeti, çok düşünce toparlanma önerir", () => {
    const s = sim();
    expect(tarimAdaylari(new Bakis(s, "a"), { ekim: true })).toEqual([]);
    const ova = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!;
    ova.tarim!.toprakPpm = 650_000;
    const nobet = tarimAdaylari(new Bakis(s, "a"), { ekim: true });
    expect(nobet).toHaveLength(1);
    expect(nobet[0]!.komut).toEqual({ tur: "ekim_plani", bolge: "m_ova", ekimPpm: [500_000, 250_000, 250_000] });
    ova.tarim!.toprakPpm = 400_000;
    const toparlan = tarimAdaylari(new Bakis(s, "a"), { ekim: true });
    expect(toparlan[0]!.komut).toMatchObject({ tur: "ekim_plani", bolge: "m_ova" });
    expect((toparlan[0]!.komut as { ekimPpm: number[] }).ekimPpm[2]).toBeGreaterThanOrEqual(500_000);
    // Önerilen her komut çekirdekte geçerlidir ve paylar toplamı PPM'dir.
    for (const a of [...nobet, ...toparlan]) {
      expect((a.komut as { ekimPpm: number[] }).ekimPpm.reduce((t, x) => t + x, 0)).toBe(PPM);
      expect(s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: a.komut }).tamam).toBe(true);
    }
  });

  it("gübre: erişim yoksa (limansız, stoksuz) doz önerilmez; limanlı ve fiyat makulse doz ve gübre ithalatı önerilir", () => {
    const limansiz = Simulasyon.olustur(miniVeriyiYukle(), 1);
    limansiz.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_gecit"] } });
    limansiz.calistirKadar(0);
    expect(tarimAdaylari(new Bakis(limansiz, "a"), { ekim: true, gubre: true })).toEqual([]);
    const s = sim(); // m_liman (liman) var; gübre fiyatı taban x1,25 <= 1,35
    const adaylar = tarimAdaylari(new Bakis(s, "a"), { ekim: true, gubre: true });
    const turler = adaylar.map((x) => x.komut.tur).sort();
    expect(turler).toEqual(["gubre_dozu", "ticaret_emri"]);
    const ith = adaylar.find((x) => x.komut.tur === "ticaret_emri")!.komut;
    expect(ith).toMatchObject({ tur: "ticaret_emri", bolge: "m_liman", mal: "gubre", yon: "ithalat" });
    // gubre: false iken gübre kararı yok
    expect(tarimAdaylari(new Bakis(s, "a"), { ekim: true })).toEqual([]);
  });

  it("gübre stoku varsa doz 3 ve ekim monokültür; ekim nöbetindeki bölge monokültüre geri döner", () => {
    const s = sim();
    const ova = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!;
    const gi = s.ic.malIndeks["gubre"] as number;
    ova.stoklar[gi]!.miktar = 5_000_000;
    ova.tarim!.ekimPpm = [500_000, 250_000, 250_000];
    const a = tarimAdaylari(new Bakis(s, "a"), { ekim: true, gubre: true });
    const turler = a.map((x) => x.komut.tur).sort();
    expect(turler).toContain("gubre_dozu");
    expect(turler).toContain("ekim_plani");
    const doz = a.find((x) => x.komut.tur === "gubre_dozu")!.komut as { doz: number };
    expect(doz.doz).toBe(3);
    for (const x of a) expect(s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: x.komut }).tamam).toBe(true);
    expect(ova.tarim!.gubreDozu).toBe(3);
    expect(ova.tarim!.ekimPpm).toEqual([PPM, 0, 0]);
    // Karar uygulandıktan sonra aynı adaylar tekrar önerilmez
    expect(tarimAdaylari(new Bakis(s, "a"), { ekim: true, gubre: true })).toEqual([]);
  });

  it("tarım kapalıysa hiç aday yoktur ve botlar tarım komutu vermez", () => {
    const s = sim(true);
    expect(tarimAdaylari(new Bakis(s, "a"), { ekim: true, gubre: true })).toEqual([]);
    const r = kos({
      veri: (() => { const v = miniVeriyiYukle(); delete v.param.iklim; delete v.param.tarim; return v; })(),
      tohum: 1,
      oyuncular: [{ id: "a", bolgeler: KUZEY, bot: botOlustur("tuccar", "a", 1), katilmaMs: 0 }],
      sureMs: 10 * GUN,
    });
    expect(r.komutTurleri["ekim_plani"]).toBeUndefined();
    expect(r.komutTurleri["gubre_dozu"]).toBeUndefined();
  });
});

describe("botlar tarımda", () => {
  it("kur_ve_unut ilk planında bir kez ekim nöbeti verir (tarım bölgesi başına), sonra hiç", () => {
    const s = sim();
    const bot = botOlustur("kur_ve_unut", "a", 1);
    const ilk = bot.karar(s);
    const ekim = ilk.filter((k) => k.tur === "ekim_plani");
    expect(ekim.length).toBeGreaterThan(0);
    for (const k of ekim) expect(k.tur === "ekim_plani" && k.ekimPpm).toEqual([500_000, 250_000, 250_000]);
    s.calistirKadar(3 * GUN);
    expect(bot.karar(s)).toEqual([]);
  });

  it("sanayici ve tüccar uzun koşuda toprağı korur: ekim planı komutları verir ve toprak tabana gitmez", () => {
    const veri = miniVeriyiYukle();
    const r = kos({
      veri,
      tohum: 2,
      oyuncular: [
        { id: "a", bolgeler: KUZEY, bot: botOlustur("sanayici", "a", 2), katilmaMs: 0 },
        { id: "b", bolgeler: GUNEY, bot: botOlustur("tuccar", "b", 2), katilmaMs: 0 },
      ],
      sureMs: 70 * GUN,
    });
    expect(r.komutTurleri["ekim_plani"] ?? 0).toBeGreaterThan(0);
    for (const b of r.sim.dunya.bolgeler) {
      if (b.tarim && b.sahip) expect(b.tarim.toprakPpm).toBeGreaterThan(450_000);
    }
    expect(r.basarisizNedenleri).toEqual({});
  });

  it("deterministik: tarım açıkken aynı tohum aynı durumOzeti (4 bot, sentetik değil mini, 20 gün)", () => {
    const calis = () =>
      kos({
        veri: miniVeriyiYukle(),
        tohum: 3,
        oyuncular: [
          { id: "a", bolgeler: KUZEY, bot: botOlustur("tuccar", "a", 3), katilmaMs: 0 },
          { id: "b", bolgeler: GUNEY, bot: botOlustur("sanayici", "b", 3), katilmaMs: 0 },
        ],
        sureMs: 20 * GUN,
      }).sim.durumOzeti();
    expect(calis()).toBe(calis());
  });

  it("gida_odakli önayar tarım adayı üretir (tarım kapalıyken üretmez)", () => {
    const s = sim();
    const ova = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!;
    ova.tarim!.toprakPpm = 600_000;
    const komutlar = onayarBul("gida_odakli").uygula(s, "a");
    expect(komutlar.some((k) => k.tur === "ekim_plani" || k.tur === "gubre_dozu")).toBe(true);
    const kapali = sim(true);
    expect(onayarBul("gida_odakli").uygula(kapali, "a").some((k) => k.tur === "ekim_plani" || k.tur === "gubre_dozu")).toBe(false);
    void SAAT;
  });
});

/**
 * Parsel botları (mülk kipi): önayarlar mini-6 parsel fikstüründe `oyuncu_katil {ilce}` + `yapi_yerlestir` + `ticaret_emri` ile oynar;
 * deterministiktir, durum değiştirmez, komutları reddedilmez.
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, Simulasyon, anlikHazine, mulkOyuncuBul } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { GEC_ACILISLARI, PARSEL_ONAYARLARI, parselBotuOlustur, parselKos } from "../src";
import type { ParselBotu, ParselKosuOyuncusu, ParselOnayari } from "../src";

function veri(): CekirdekVeriPaketi {
  return { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
}

function oyuncu(id: string, onayar: ParselOnayari, katilmaMs = 0, acilis?: (typeof GEC_ACILISLARI)[number]): ParselKosuOyuncusu {
  return { id, bot: parselBotuOlustur(onayar, id, acilis === undefined ? {} : { acilis }), katilmaMs };
}

const DUZEN: ParselKosuOyuncusu[] = [
  oyuncu("c1", "ciftci"),
  oyuncu("c2", "ciftci"),
  oyuncu("s1", "sanayici"),
  oyuncu("t1", "tuccar"),
  oyuncu("p1", "pasif"),
  oyuncu("gc", "gec_katilan", 3 * GUN, "ciftci"),
  oyuncu("gs", "gec_katilan", 3 * GUN, "sanayici"),
  oyuncu("gp", "gec_katilan", 3 * GUN, "pazar"),
];

describe("parsel botları", () => {
  it("önayar listesi ve bot sözleşmesi: oyuncu, önayar ve açılış", () => {
    expect(PARSEL_ONAYARLARI).toEqual(["ciftci", "sanayici", "tuccar", "gec_katilan", "pasif"]);
    for (const o of PARSEL_ONAYARLARI) {
      const b = parselBotuOlustur(o, "x", { acilis: "sanayici" });
      expect(b.oyuncu).toBe("x");
      expect(b.onayar).toBe(o);
      expect(b.acilis).toBe(o === "gec_katilan" ? "sanayici" : undefined);
    }
    expect(parselBotuOlustur("gec_katilan", "y").acilis).toBe("ciftci");
  });

  it("deterministik: aynı düzen iki koşuda aynı durum özeti, komut günlüğü ve katılım ilçeleri", () => {
    const a = parselKos({ veri: veri(), tohum: 3, oyuncular: DUZEN.map((o) => ({ ...o, bot: parselBotuOlustur(o.bot!.onayar, o.id, o.bot!.acilis ? { acilis: o.bot!.acilis } : {}) })), sureMs: 6 * GUN });
    const b = parselKos({ veri: veri(), tohum: 3, oyuncular: DUZEN.map((o) => ({ ...o, bot: parselBotuOlustur(o.bot!.onayar, o.id, o.bot!.acilis ? { acilis: o.bot!.acilis } : {}) })), sureMs: 6 * GUN });
    expect(a.sim.durumOzeti()).toBe(b.sim.durumOzeti());
    expect(JSON.stringify(a.komutGunlugu)).toBe(JSON.stringify(b.komutGunlugu));
    expect(JSON.stringify(a.katilimlar)).toBe(JSON.stringify(b.katilimlar));
    expect(a.komutGunlugu.length).toBeGreaterThan(10);
  });

  it("komutlar reddedilmez ve yalnız yapi_yerlestir + ticaret_emri kullanılır", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: DUZEN, sureMs: 8 * GUN });
    for (const o of DUZEN) expect(r.basarisizSayisi[o.id], o.id).toBe(0);
    expect(Object.keys(r.komutTurleri).sort()).toEqual(["ticaret_emri", "yapi_yerlestir"]);
    expect(r.basarisizNedenleri).toEqual({});
  });

  it("karar dünyayı değiştirmez (salt okunur)", () => {
    const s = Simulasyon.olustur(veri(), 1);
    const bot = parselBotuOlustur("sanayici", "s1");
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "s1", bolgeler: [], ilce: bot.katilimIlcesi(s) as string } });
    const once = s.durumOzeti();
    const komutlar = bot.karar(s);
    expect(komutlar.length).toBeGreaterThan(0);
    expect(s.durumOzeti()).toBe(once);
    // Aynı durumda aynı komutlar
    expect(JSON.stringify(bot.karar(s))).toBe(JSON.stringify(komutlar));
  });

  it("çiftçi: ova ilçesinde yurt, Çiftlik → Ahır → Çiftlik; fazla ürünü ihraç eder (hazine artar)", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [oyuncu("c1", "ciftci")], sureMs: 4 * GUN });
    expect(r.katilimlar["c1"]?.istenenIlce).toBe("sn_m_ova_merkez");
    const yapilar = r.komutGunlugu.filter((k) => k.tur === "yapi_yerlestir").map((k) => k.tesisTuru);
    expect(yapilar).toEqual(["ciftlik", "ahir", "ciftlik"]);
    expect(r.komutGunlugu.some((k) => k.tur === "ticaret_emri" && k.tamam)).toBe(true);
    expect(anlikHazine(r.sim.dunya, "c1")).toBeGreaterThan(50_000_000);
  });

  it("sanayici: dağ ilinde Hidro santral + Cevher madeni aynı turda; elektrik ve cevher akışı", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [oyuncu("s1", "sanayici")], sureMs: 4 * GUN });
    expect(r.katilimlar["s1"]?.istenenIlce).toBe("sn_m_dag_merkez");
    const ilk = r.komutGunlugu.filter((k) => k.tur === "yapi_yerlestir" && k.t === 0).map((k) => k.tesisTuru);
    expect(ilk).toEqual(["hidro_santrali", "cevher_madeni"]);
    expect(anlikHazine(r.sim.dunya, "s1")).toBeGreaterThan(50_000_000);
  });

  it("tüccar: kıyı+ova ilini seçer, Çiftlik + Ticaret ofisi kurar", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [oyuncu("t1", "tuccar")], sureMs: 3 * GUN });
    expect(r.katilimlar["t1"]?.istenenIlce).toBe("sn_m_sehir_merkez");
    const yapilar = r.komutGunlugu.filter((k) => k.tur === "yapi_yerlestir").map((k) => k.tesisTuru);
    expect(yapilar).toContain("ciftlik");
    expect(yapilar).toContain("ticaret_ofisi");
  });

  it("pasif (kur-unut): yalnız ilk kurulum (tek yapı + emir), sonra hiçbir komut", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [oyuncu("p1", "pasif")], sureMs: 5 * GUN });
    expect(r.komutGunlugu.every((k) => k.t === 0)).toBe(true);
    expect(r.komutGunlugu.filter((k) => k.tur === "yapi_yerlestir")).toHaveLength(1);
    expect(r.komutSayisi["p1"]).toBe(2);
  });

  it("geç katılan: yerleşiklerin bulunduğu ilçeye katılır; açılışa göre plan (çiftçi/sanayici/pazar)", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: DUZEN, sureMs: 6 * GUN });
    const yurtIlcesi = (id: string): string => r.sim.dunya.mulk!.hucreler.find((h) => h.sahip === id)!.ilce;
    const yerlesikIlceleri = new Set(["c1", "c2", "s1", "t1", "p1"].map(yurtIlcesi));
    for (const g of ["gc", "gs", "gp"]) expect(yerlesikIlceleri.has(yurtIlcesi(g)), g).toBe(true);
    expect(r.katilimlar["gc"]?.ilceGeriDusuldu).toBe(false);
    const yapilar = (id: string): string[] => r.komutGunlugu.filter((k) => k.oyuncu === id && k.tur === "yapi_yerlestir").map((k) => k.tesisTuru as string);
    expect(yapilar("gc")[0]).toBe("ciftlik");
    expect(yapilar("gs").slice(0, 2)).toEqual(["hidro_santrali", "cevher_madeni"]);
    expect(yapilar("gp")).toContain("ticaret_ofisi");
    // Geç katılanın katılımı gün 3: komutlar gün 3'ten önce yok
    expect(r.komutGunlugu.filter((k) => ["gc", "gs", "gp"].includes(k.oyuncu)).every((k) => k.t >= 3 * GUN)).toBe(true);
  });

  it("yeni oyuncu paketi kullanılır: yurt 6 hücre (değer 0), ilk yapılar indirimli, kalkan 14 gün", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [oyuncu("c1", "ciftci")], sureMs: 1 * GUN });
    const d = r.sim.dunya;
    const yurt = d.mulk!.hucreler.filter((h) => h.sahip === "c1" && h.degerMili === 0);
    expect(yurt).toHaveLength(6);
    expect(mulkOyuncuBul(d, "c1")?.indirimliYapi).toBeGreaterThanOrEqual(2);
    const o = d.oyuncular.find((x) => x.id === "c1")!;
    expect(o.korumaBitis - o.katilmaZamani).toBe(14 * GUN);
  });

  it("sermaye kaydı: yapı parası ödenen (indirimli) tutardır; hazine farkı arsa + yapı parasıdır", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [oyuncu("c1", "ciftci")], sureMs: 1 * GUN });
    const ilk = r.sermaye["c1"]![0]!;
    // Çiftlik 6.000 ₺ × %70 = 4.200 ₺ (mili 4_200_000); yurtta arsa yok
    expect(ilk.yapiPara).toBe(4_200_000);
    expect(ilk.yapiMalDegeri).toBeGreaterThan(0);
    expect(ilk.tutar).toBe(ilk.yapiPara);
  });

  it("bölge kipi veri paketi (parsel yok): koşucu açık hatayla reddeder", () => {
    expect(() => parselKos({ veri: miniVeriyiYukle(), tohum: 1, oyuncular: [], sureMs: GUN })).toThrow(/parsel fiksturu/);
  });

  it("bölge kipi simülasyonunda bot komut vermez (mülk kipi kapalı)", () => {
    const s = Simulasyon.olustur(miniVeriyiYukle(), 1);
    const bot: ParselBotu = parselBotuOlustur("ciftci", "a");
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    expect(bot.karar(s)).toEqual([]);
    expect(bot.katilimIlcesi(s)).toBeUndefined();
  });

  it("6 saatlik karar ızgarası: aynı bot aynı durumda tekrar tekrar yapı komutu vermez", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [oyuncu("c1", "ciftci")], sureMs: 10 * GUN, kararAraligiMs: 6 * SAAT });
    const yapilar = r.komutGunlugu.filter((k) => k.tur === "yapi_yerlestir");
    expect(yapilar).toHaveLength(3); // plan: ciftlik, ahir, ciftlik
  });
});

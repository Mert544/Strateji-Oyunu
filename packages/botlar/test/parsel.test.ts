/**
 * Parsel botları (mülk kipi): önayarlar mini-6 parsel fikstüründe `oyuncu_katil {ilce}` + `yapi_yerlestir` + `ticaret_emri` ile oynar;
 * deterministiktir, durum değiştirmez, komutları reddedilmez.
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, Simulasyon, anlikHazine, anlikMiktar, kamuHucreMi, mulkOyuncuBul } from "@bolge/cekirdek";
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
    expect(PARSEL_ONAYARLARI).toEqual(["ciftci", "sanayici", "tuccar", "gec_katilan", "pasif", "ciftci_tarim", "spekulator"]);
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

  it("çiftçi: ova ilçeleri dolunca dağ ilinde Mera kurar (üretimsiz kalmaz); ova ilinde davranış değişmez", () => {
    // Ova ilçelerinin yurt kapasitesi kamu arsası düşüldükten sonraki satılabilir hücrelerden gelir (mini-6'da 4 ova ilçesi ≈ 23 yurt);
    // kamu geometrisi değişince eşik kayar. 40 çiftçi eşiğin açıkça üstündedir.
    const cok = Array.from({ length: 40 }, (_, i) => ({ id: `c${i}`, bot: parselBotuOlustur("ciftci", `c${i}`), katilmaMs: 0 }));
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: cok, sureMs: 2 * GUN, katilimRedDevam: true });
    const yapilar = r.komutGunlugu.filter((k) => k.tur === "yapi_yerlestir" && k.tamam).map((k) => k.tesisTuru);
    expect(yapilar).toContain("ciftlik");
    expect(yapilar).toContain("mera");
    for (const o of cok) expect(r.basarisizSayisi[o.id], o.id).toBe(0);
    // Mera yalnız dağ ilinde: kurulu tüm merlar dag etiketli ilde
    for (const b of r.sim.dunya.bolgeler) if (b.merkez !== undefined && b.tesisler.some((t) => r.sim.ic.tesisTurleri[t.tur]!.id === "mera")) expect(b.etiketler).toContain("dag");
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

/** Hızlı iklim (gunCarpani 12): toprak ve aşınma etkileri kısa koşuda görünür. */
function hizliVeri(): CekirdekVeriPaketi {
  const v = veri();
  v.param.iklim = { ...v.param.iklim!, gunCarpani: 12 };
  return v;
}

function ciftlikDugumu(sim: Simulasyon, oyuncu: string) {
  const d = sim.dunya;
  const isl = d.mulk!.isletmeler.find((i) => i.oyuncu === oyuncu)!;
  return d.bolgeler[isl.bolgeIndeksi]!;
}

describe("parsel botları: tarım ve bakım yönetimi", () => {
  const kos = (onayar: ParselOnayari, secenek: Parameters<typeof parselBotuOlustur>[2], gun: number) =>
    parselKos({ veri: hizliVeri(), tohum: 1, oyuncular: [{ id: "c", bot: parselBotuOlustur(onayar, "c", secenek), katilmaMs: 0 }], sureMs: gun * GUN });

  it("yönetimsiz çiftçinin toprağı taban altına düşer; tarım yönetimli çiftçi toprağı korur (ekim planı nöbete geçer)", () => {
    const y0 = kos("ciftci", {}, 14);
    const y1 = kos("ciftci_tarim", {}, 14);
    const taban = y0.sim.ic.param.tarim!.toprakTabaniPpm;
    expect(ciftlikDugumu(y0.sim, "c").tarim!.toprakPpm).toBe(taban);
    expect(ciftlikDugumu(y1.sim, "c").tarim!.toprakPpm).toBeGreaterThan(taban + 100_000);
    expect(y1.komutTurleri["ekim_plani"]).toBeGreaterThan(0);
    expect(y0.komutTurleri["ekim_plani"]).toBeUndefined();
    expect(y1.basarisizSayisi["c"]).toBe(0);
  });

  it("tarım yönetimi gübreyi ihraç etmez, stokta biriktirir ve doz ayarlar; doz salınmaz (histerezis)", () => {
    const r = kos("ciftci_tarim", {}, 10);
    const b = ciftlikDugumu(r.sim, "c");
    const gubre = r.sim.ic.malIndeks["gubre"]!;
    expect(b.ticaretEmirleri.some((e) => e.mal === gubre && e.yon === "ihracat" && e.oranSaat > 0)).toBe(false);
    expect(anlikMiktar(b.stoklar[gubre]!, r.sim.dunya.zaman)).toBeGreaterThan(0);
    expect(b.tarim!.gubreDozu).toBeGreaterThan(0);
    const dozKomutu = r.komutGunlugu.filter((k) => k.tur === "gubre_dozu").length;
    expect(dozKomutu).toBeLessThanOrEqual(6); // 10 gün = 40 karar anı; salınım olsaydı çok daha fazla
  });

  it("tarimYonetimi seçeneği ciftci'ye de uygulanır; pasif (kur-unut) ve spekülatör için etkisiz", () => {
    const a = kos("ciftci", { tarimYonetimi: true }, 6);
    expect(a.komutTurleri["ekim_plani"]).toBeGreaterThan(0);
    const p = kos("pasif", { tarimYonetimi: true, bakimYonetimi: true }, 6);
    expect(Object.keys(p.komutTurleri).sort()).toEqual(["ticaret_emri", "yapi_yerlestir"]);
  });

  it("bakım yönetimi: parça ithal eder; aşınma yönetimsize göre belirgin düşük", () => {
    const y0 = kos("ciftci", {}, 20);
    const y1 = kos("ciftci", { bakimYonetimi: true }, 20);
    const asinma = (r: ReturnType<typeof kos>) => Math.max(...ciftlikDugumu(r.sim, "c").tesisler.map((t) => t.asinmaPpm ?? 0));
    expect(asinma(y1)).toBeLessThan(asinma(y0));
    const parca = y1.sim.ic.malIndeks["parca"]!;
    expect(y1.komutGunlugu.some((k) => k.tur === "ticaret_emri" && k.tamam)).toBe(true);
    expect(ciftlikDugumu(y1.sim, "c").ticaretEmirleri.some((e) => e.mal === parca && e.yon === "ithalat") || anlikMiktar(ciftlikDugumu(y1.sim, "c").stoklar[parca]!, y1.sim.dunya.zaman) > 0).toBe(true);
    expect(y1.basarisizSayisi["c"]).toBe(0);
  });

  it("yönetimli botlar deterministik", () => {
    const a = kos("ciftci_tarim", { bakimYonetimi: true }, 8);
    const b = kos("ciftci_tarim", { bakimYonetimi: true }, 8);
    expect(a.sim.durumOzeti()).toBe(b.sim.durumOzeti());
    expect(JSON.stringify(a.komutGunlugu)).toBe(JSON.stringify(b.komutGunlugu));
  });
});

describe("parsel botları: spekülatör", () => {
  const spek = (n: number, baslangicGun = 0): ParselKosuOyuncusu[] =>
    Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, bot: parselBotuOlustur("spekulator", `s${i + 1}`, baslangicGun > 0 ? { baslangicGun } : {}), katilmaMs: 0 }));

  it("arsa biriktirir, üretmez: yapı komutu yok; kit stoğunu satar; hiçbir komut reddedilmez (kamu arsası alınmaz)", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: spek(3), sureMs: 8 * GUN });
    expect(r.komutGunlugu.some((k) => k.tur === "yapi_yerlestir")).toBe(false);
    expect(r.komutGunlugu.some((k) => k.tur === "ticaret_emri" && k.tamam)).toBe(true);
    expect(r.komutGunlugu.filter((k) => k.tur === "parsel_al").length).toBeGreaterThan(0);
    for (const k of r.komutGunlugu) expect(k.tamam, JSON.stringify(k)).toBe(true);
    for (const o of ["s1", "s2", "s3"]) expect(r.sim.dunya.mulk!.hucreler.filter((h) => h.sahip === o).length, o).toBeGreaterThan(6);
    // Kamu arsası hiç alınmadı
    for (const h of r.sim.dunya.mulk!.hucreler) expect(kamuHucreMi(r.sim.dunya, h.ilce, h.id)).toBe(false);
  });

  it("sınırlara dayanır ama aşmaz: ilçe başına ≤ min(72, %25 uygun); en az bir ilçede tavana tam dayanır", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: spek(1), sureMs: 12 * GUN });
    const p = r.sim.ic.mulk!.p;
    const sayac = new Map<string, number>();
    for (const h of r.sim.dunya.mulk!.hucreler) if (h.sahip === "s1") sayac.set(h.ilce, (sayac.get(h.ilce) ?? 0) + 1);
    let dayandi = 0;
    for (const [ilce, n] of sayac) {
      const uygun = r.sim.dunya.mulk!.ilceler.find((i) => i.id === ilce)!.uygunHucre;
      const tavan = Math.min(p.ilceHucreTavani, Math.floor((uygun * p.ilcePayTavaniPpm) / 1_000_000));
      expect(n, ilce).toBeLessThanOrEqual(tavan);
      if (n === tavan) dayandi++;
    }
    expect(dayandi).toBeGreaterThanOrEqual(1);
  });

  it("yeni spekülatör ayrılmış hücreleri tüketir; yaşlı spekülatör (15. gün) ayrılmış hücre alamaz ve denemez", () => {
    const yeni = parselKos({ veri: veri(), tohum: 1, oyuncular: spek(2), sureMs: 6 * GUN });
    const ayr = yeni.sim.ic.mulk!.ayrilmis;
    expect(yeni.sim.dunya.mulk!.hucreler.filter((h) => ayr.has(h.id) && h.sahip.startsWith("s")).length).toBeGreaterThan(0);
    const yasli = parselKos({ veri: veri(), tohum: 1, oyuncular: spek(2, 15), sureMs: 22 * GUN });
    // 15. günden önce yurt dışında hücre almaz
    const alimlar = yasli.komutGunlugu.filter((k) => k.tur === "parsel_al");
    expect(alimlar.length).toBeGreaterThan(0);
    expect(alimlar.every((k) => k.t >= 15 * GUN)).toBe(true);
    expect(alimlar.every((k) => k.tamam)).toBe(true);
    // Sahip olduğu ayrılmış hücreler yalnız yurttan gelir (katılım anında alınmış)
    for (const h of yasli.sim.dunya.mulk!.hucreler) {
      if (!yasli.sim.ic.mulk!.ayrilmis.has(h.id)) continue;
      const katilma = yasli.sim.dunya.oyuncular.find((o) => o.id === h.sahip)!.katilmaZamani;
      expect(h.alinma - katilma).toBeLessThan(yasli.sim.ic.mulk!.ayrilmisSureMs);
    }
  });

  it("deterministik; baslangicGun negatif/kesirli reddedilir; bölge kipinde komut vermez", () => {
    const a = parselKos({ veri: veri(), tohum: 2, oyuncular: spek(2), sureMs: 5 * GUN });
    const b = parselKos({ veri: veri(), tohum: 2, oyuncular: spek(2), sureMs: 5 * GUN });
    expect(a.sim.durumOzeti()).toBe(b.sim.durumOzeti());
    expect(() => parselBotuOlustur("spekulator", "x", { baslangicGun: -1 })).toThrow(/baslangicGun/);
    expect(() => parselBotuOlustur("spekulator", "x", { baslangicGun: 1.5 })).toThrow(/baslangicGun/);
    const s = Simulasyon.olustur(miniVeriyiYukle(), 1);
    expect(parselBotuOlustur("spekulator", "a").karar(s)).toEqual([]);
  });

  it("kalabalık: ilçelerde yurt kalmayınca çekirdek yurtsuz katılım verir (hücresiz oyuncu); koşu sürer, hata fırlatılmaz", () => {
    const cok = Array.from({ length: 120 }, (_, i) => ({ id: `p${i}`, bot: parselBotuOlustur("pasif", `p${i}`), katilmaMs: 0 }));
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: cok, sureMs: 1 * GUN, katilimRedDevam: true });
    const hucreli = new Set(r.sim.dunya.mulk!.hucreler.map((h) => h.sahip));
    const yurtsuz = cok.filter((o) => !hucreli.has(o.id));
    expect(yurtsuz.length).toBeGreaterThan(0);
    expect(r.sim.dunya.oyuncular.length).toBe(120);
    // Yurtsuz oyuncuya bot komut vermez (hücresi yok); reddedilen komut da yok
    for (const o of yurtsuz) expect(r.komutSayisi[o.id]).toBe(0);
    expect(Object.values(r.basarisizSayisi).every((x) => x === 0)).toBe(true);
  });
});

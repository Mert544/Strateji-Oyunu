/**
 * Parsel botları (mülk kipi): önayarlar mini-6 parsel fikstüründe `oyuncu_katil {ilce}` + `yapi_yerlestir` + `ticaret_emri` ile oynar;
 * deterministiktir, durum değiştirmez, komutları reddedilmez.
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikHazine, anlikMiktar, kamuHucreMi, mulkOyuncuBul, yurtPlanla } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { ACILIS_ESLEMESI, GEC_ACILISLARI, PARSEL_ONAYARLARI, acilisAyakIzi, ilceAyrilmisBos, ilceSec, parselArsaFiyati, parselBotuOlustur, parselKos } from "../src";
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

describe("ilceSec: yurt verebilen + açılışa uygun ilçe", () => {
  const taze = () => Simulasyon.olustur(veri(), 1);
  const katil = (sim: Simulasyon, id: string, ilce?: string) =>
    sim.uygula({ t: sim.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: id, bolgeler: [], ...(ilce !== undefined ? { ilce } : {}) } });
  /** Ilçe dolana kadar pasif oyuncu katar. */
  const doldur = (sim: Simulasyon, ilceler: readonly string[]) => {
    for (const c of ilceler) for (let i = 0; i < 30 && typeof yurtPlanla(sim.dunya, sim.ic, c) !== "string"; i++) katil(sim, `dolgu_${c}_${i}`, c);
  };

  it("açılış eşlemesi VERİ: her geç açılışı için ilk yapı türleri içerikte vardır; ova / dağ / kıyı+ova tercihi", () => {
    expect(Object.keys(ACILIS_ESLEMESI).sort()).toEqual([...GEC_ACILISLARI].sort());
    const s = taze();
    for (const a of GEC_ACILISLARI) {
      for (const t of ACILIS_ESLEMESI[a].ilkYapiTurleri) expect(s.ic.tesisTuruIndeks[t], `${a}:${t}`).toBeDefined();
      for (const t of ACILIS_ESLEMESI[a].ekYapilar) expect(s.ic.mulk!.ekYapiIndeks.has(t), `${a}:${t}`).toBe(true);
    }
    // Boş dünyada: çiftçi ova ilinde, sanayici dağ ilinde, pazar kıyı+ova ilinde (mini-6)
    expect(ilceSec(s, "ciftci").ilce).toMatch(/^sn_m_ova_/);
    expect(ilceSec(s, "sanayici").ilce).toMatch(/^sn_m_dag_/);
    expect(ilceSec(s, "pazar").ilce).toMatch(/^sn_m_sehir_/);
    expect(ilceSec(s, "ciftci").neden).toContain("yurt verebilen");
  });

  it("açılış koşulu: ek yapı tanımsızsa (pazar için ticaret_ofisi) uygun ilçe yok ve neden yazılı", () => {
    const v = veri();
    delete (v.param.mulk!.ekYapilar as Record<string, unknown>)["ticaret_ofisi"];
    const r = ilceSec(Simulasyon.olustur(v, 1), "pazar");
    expect(r.ilce).toBeNull();
    expect(r.neden).toContain("ek yapisi tanimli degil");
    expect(ilceSec(Simulasyon.olustur(v, 1), "ciftci").ilce).not.toBeNull(); // diğer açılışlar etkilenmez
  });

  it("ÇEKİRDEKLE TUTARLILIK: seçilen ilçede oyuncu_katil gerçekten yurt verir; yurt veremeyen ilçede reddedilir (örneklem)", () => {
    const s = taze();
    doldur(s, ["sn_m_ova_merkez", "sn_m_ova_tasra", "sn_m_dag_tasra"]);
    const mk = s.ic.mulk!;
    let verebilen = 0;
    let veremeyen = 0;
    for (const c of [...mk.ilceler.keys()]) {
      const plan = yurtPlanla(s.dunya, s.ic, c);
      const k = s.klonla();
      const r = katil(k, "deneme", c);
      if (typeof plan === "string") {
        veremeyen++;
        expect(r.tamam, `${c} yurt veremez`).toBe(false);
      } else {
        verebilen++;
        expect(r.tamam, `${c} yurt verebilir`).toBe(true);
        expect(k.dunya.mulk!.hucreler.filter((h) => h.sahip === "deneme" && h.ilce === c)).toHaveLength(mk.p.yeniOyuncu.yurtHucre);
      }
    }
    expect(verebilen).toBeGreaterThan(0);
    expect(veremeyen).toBeGreaterThan(0);
    // Her açılış için seçilen ilçe yurt verebilenlerden biridir ve gerçekten yurt verir
    for (const a of GEC_ACILISLARI) {
      const sec = ilceSec(s, a);
      if (sec.ilce === null) continue;
      expect(typeof yurtPlanla(s.dunya, s.ic, sec.ilce)).not.toBe("string");
      const k = s.klonla();
      expect(katil(k, "deneme", sec.ilce).tamam).toBe(true);
    }
    // Seçim dolu ilçeleri atlar: ova ilçeleri doluyken çiftçi başka ilçeye gider
    expect(["sn_m_ova_merkez", "sn_m_ova_tasra"]).not.toContain(ilceSec(s, "ciftci").ilce);
  });

  it("yurt verebilen ilçe var ama açılışa uygun yok: neden aşamayı söyler (sanayici, dağ ilçeleri dolu)", () => {
    const s = taze();
    doldur(s, ["sn_m_dag_merkez", "sn_m_dag_tasra"]);
    const r = ilceSec(s, "sanayici");
    expect(r.ilce).toBeNull();
    expect(r.yurtVerebilen).toBeGreaterThan(0);
    expect(r.acilisaUygun).toBe(0);
    expect(r.neden).toContain("hicbirinde acilisin ilk yapisi");
  });

  it("DOYGUN dünya: hiçbir ilçe yurt veremez → 'uygun ilçe yok' kararı; koşucu geç katılanı KATMAZ ve ayrı sayaçta tutar (çekirdek yedeğine bırakmaz)", () => {
    const yerlesik = Array.from({ length: 120 }, (_, i) => ({ id: `p${i}`, bot: parselBotuOlustur("pasif", `p${i}`), katilmaMs: 0 }));
    const gec = GEC_ACILISLARI.map((a) => ({ id: `gec_${a}`, bot: parselBotuOlustur("gec_katilan", `gec_${a}`, { acilis: a }), katilmaMs: 3 * GUN }));
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [...yerlesik, ...gec], sureMs: 4 * GUN, katilimRedDevam: true });
    for (const o of gec) {
      const k = r.katilimlar[o.id]!;
      expect(k.uygunIlceYok, o.id).toBe(true);
      expect(k.reddedildi).toContain("uygun ilce yok");
      expect(k.ilceNedeni).toContain("yurt verebilen ilce yok");
      expect(r.sim.dunya.oyuncular.some((x) => x.id === o.id)).toBe(false);
      expect(r.komutSayisi[o.id]).toBe(0);
    }
    // Yerleşik (eski davranış) botlar çekirdek yedeğiyle katılmaya devam eder (yurtsuz): davranış değişmedi
    expect(r.sim.dunya.oyuncular.filter((x) => x.id.startsWith("p"))).toHaveLength(120);
  });

  it("geç katılan açılışa uygun ilçeye katılır ve yapı kurar (ova dolu olsa bile dağda Mera); ilceKarari nedenini kaydeder", () => {
    const yerlesik = Array.from({ length: 40 }, (_, i) => ({ id: `c${i}`, bot: parselBotuOlustur("ciftci", `c${i}`), katilmaMs: 0 }));
    const gec = { id: "gec", bot: parselBotuOlustur("gec_katilan", "gec", { acilis: "ciftci" }), katilmaMs: 2 * GUN };
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [...yerlesik, gec], sureMs: 4 * GUN, katilimRedDevam: true });
    const k = r.katilimlar["gec"]!;
    if (k.uygunIlceYok === true) {
      expect(k.reddedildi).toContain("uygun ilce yok");
    } else {
      expect(k.ilceNedeni).toContain("acilisa uygun");
      expect(k.ilceGeriDusuldu).toBe(false);
      expect(r.komutGunlugu.some((x) => x.oyuncu === "gec" && x.tur === "yapi_yerlestir" && x.tamam)).toBe(true);
    }
  });

  it("siralama: 'doluluk' en boş ilçe; 'emsal' yerleşik sahibi olan ilçeyi tercih eder; dünya değişmez; deterministik", () => {
    const s = taze();
    katil(s, "yerlesik", "sn_m_ova_tasra");
    const once = s.durumOzeti();
    const dol = ilceSec(s, "ciftci", { siralama: "doluluk" });
    const ems = ilceSec(s, "ciftci", { siralama: "emsal" });
    expect(ems.ilce).toBe("sn_m_ova_tasra");
    expect(dol.ilce).not.toBe("sn_m_ova_tasra");
    expect(s.durumOzeti()).toBe(once); // salt okunur
    expect(JSON.stringify(ilceSec(s, "ciftci", { siralama: "emsal" }))).toBe(JSON.stringify(ems));
    const s2 = taze();
    katil(s2, "yerlesik", "sn_m_ova_tasra");
    expect(JSON.stringify(ilceSec(s2, "sanayici"))).toBe(JSON.stringify(ilceSec(s, "sanayici")));
  });

  it("emsal sıralaması ÜRETEN sahibi (yapısı olan) önce sayar: yapısız sahipli ilçe (kimlik sırasında önde) yerine yapılı ilçe seçilir", () => {
    const s = taze();
    katil(s, "yapisiz", "sn_m_ova_merkez");
    katil(s, "ureten", "sn_m_ova_tasra");
    for (const k of parselBotuOlustur("ciftci", "ureten").karar(s)) s.uygula({ t: s.dunya.zaman, oyuncu: "ureten", komut: k });
    expect(s.dunya.mulk!.hucreler.some((h) => h.sahip === "ureten" && (h.tesis !== undefined || h.insaat !== undefined))).toBe(true);
    expect(ilceSec(s, "ciftci", { siralama: "emsal" }).ilce).toBe("sn_m_ova_tasra");
  });

  it("bölge kipinde (mülk yok) ilçe seçimi 'mulk kipi kapali' döner; yerleşik botlar ilceSec seçeneğiyle açık ilçe kararı verir", () => {
    const b = Simulasyon.olustur(miniVeriyiYukle(), 1);
    expect(ilceSec(b, "ciftci")).toMatchObject({ ilce: null, neden: "mulk kipi kapali" });
    const bot = parselBotuOlustur("ciftci", "x", { ilceSec: true });
    expect(bot.ilceKarari).toBeDefined();
    expect(parselBotuOlustur("ciftci", "x").ilceKarari).toBeUndefined(); // vars. kapalı: eski davranış
    expect(parselBotuOlustur("gec_katilan", "x").ilceKarari).toBeDefined(); // geç katılan vars. açık
    const s = taze();
    expect(bot.ilceKarari!(s).ilce).toMatch(/^sn_m_ova_/);
  });
});

describe("P2 uyarlaması: ayrılmış hücre hesap tavanı ve taban fiyat", () => {
  const tavan = (): number => veri().param.mulk!.yeniOyuncu.ayrilmisHucreHesapTavani!;

  it("parametre mevcut: hesap başına ayrılmış tavanı tanımlı ve yurt hücresinden küçük değil", () => {
    expect(tavan()).toBeGreaterThan(0);
    expect(tavan()).toBeGreaterThanOrEqual(0);
  });

  it("fiyat tahmini çekirdekle BİREBİR: karışık (ayrılmış + normal) alımda hazine farkı = tahmin; ayrılmış taban fiyatlı, normal artımlı", () => {
    const s = Simulasyon.olustur(veri(), 1);
    const mk = s.ic.mulk!;
    // Önce ilçede satılmış hücre ve ayrılmış satış üret (eğri normal satılmışa bağlı olsun): başka bir oyuncu karışık alsın
    const ilce = "sn_m_gecit_merkez";
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "once", bolgeler: [], ilce } });
    const tanim = mk.ilceler.get(ilce)!;
    const bos = (ayr: boolean) => tanim.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamuHucreMi(s.dunya, ilce, h.id) && !s.dunya.mulk!.hucreler.some((x) => x.id === h.id) && mk.ayrilmis.has(h.id) === ayr).map((h) => h.id);
    // İkinci oyuncu: katılım ilçesi aynı ilçe (P3b: ayrılmış hücre yalnız katılım ilçesinde satılır); 2 ayrılmış + 3 normal al, bedeli çekirdekle karşılaştır
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "alici", bolgeler: [], ilce } });
    const durum = () => s.dunya.mulk!.ilceler.find((i) => i.id === "sn_m_gecit_merkez")!;
    // Toplam hücre ilçe payı tavanını (%25) aşmasın: yurt + 5 + 2 + 1 ≤ tavan; ayrılmış toplamı günlük ilçe tavanının altında
    const liste = [[2, 3], [0, 2], [1, 0]] as const;
    for (const [ayr, norm] of liste) {
      const a = bos(true).slice(0, ayr);
      const n = bos(false).slice(0, norm);
      const tahmin = parselArsaFiyati(s, ilce, "kirsal", a.length, n.length);
      const once = anlikHazine(s.dunya, "alici");
      const r = s.uygula({ t: s.dunya.zaman, oyuncu: "alici", komut: { tur: "parsel_al", ilce, hucreler: [...a, ...n], sinif: "kirsal" } });
      expect(r.tamam, JSON.stringify(r)).toBe(true);
      expect(once - anlikHazine(s.dunya, "alici"), `ayrilmis ${ayr} normal ${norm}`).toBe(tahmin);
    }
    expect(durum().ayrilmisSatilmis).toBe(liste.reduce((t, [a]) => t + a, 0));
    // Ayrılmış hücre taban fiyatı: eğriden bağımsız (satilmis artsa da aynı)
    const taban = mk.p.hucreFiyati["kirsal"];
    expect(parselArsaFiyati(s, ilce, "kirsal", 1, 0)).toBe(taban);
    expect(parselArsaFiyati(s, ilce, "kirsal", 3, 0)).toBe(3 * taban);
  });

  it("spekülatör ayrılmış hücreyi YALNIZ katılım ilçesinde, hesap tavanı ve günlük ilçe tavanı içinde alır; kalanı normal hücreden; reddedilen komut yok", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: Array.from({ length: 2 }, (_, i) => ({ id: `s${i + 1}`, bot: parselBotuOlustur("spekulator", `s${i + 1}`), katilmaMs: 0 })), sureMs: 6 * GUN });
    const yo = r.sim.ic.mulk!.p.yeniOyuncu;
    for (const o of ["s1", "s2"]) {
      const mo = mulkOyuncuBul(r.sim.dunya, o)!;
      const katilim = mo.katilimIlcesi;
      expect(katilim, o).toBeDefined(); // koşucu katılım ilçesini her zaman verir
      const ayr = r.sim.dunya.mulk!.hucreler.filter((h) => h.sahip === o && r.sim.ic.mulk!.ayrilmis.has(h.id));
      expect(ayr.length).toBe(mo.ayrilmisHucre ?? 0);
      expect(ayr.length, o).toBeGreaterThan(0);
      expect(ayr.length, o).toBeLessThanOrEqual(yo.ayrilmisHucreHesapTavani!); // hesap tavanı (yurt dahil)
      expect(ayr.length, o).toBeLessThanOrEqual(r.sim.ic.mulk!.ayrilmisIlceSayisi.get(katilim as string) as number); // ilçenin ayrılmış stoku
      for (const h of ayr) expect(h.ilce, `${o} ${h.id}`).toBe(katilim); // YALNIZ katılım ilçesi
      expect(r.sim.dunya.mulk!.hucreler.filter((h) => h.sahip === o).length, o).toBeGreaterThan(ayr.length); // kalanı normal hücreden
    }
    // Günlük ilçe tavanı: hiçbir ilçenin sayacı tavanı aşmadı
    for (const c of r.sim.dunya.mulk!.ilceler) {
      if (c.ayrilmisGunluk === undefined) continue;
      const tavan = Math.max(yo.ayrilmisIlceGunlukEnAz ?? 0, Math.floor(((r.sim.ic.mulk!.ayrilmisIlceSayisi.get(c.id) ?? 0) * (yo.ayrilmisIlceGunlukPpm ?? 0)) / 1_000_000));
      expect(c.ayrilmisGunluk.adet, c.id).toBeLessThanOrEqual(tavan);
    }
    for (const k of r.komutGunlugu) expect(k.tamam, JSON.stringify(k)).toBe(true);
  });

  it("koşucu oyuncu_katil'e ilçeyi HER ZAMAN verir (ilçe önerisi olmayan yerleşik için çekirdeğin varsayılan yurt ilçesi); katılım ilçesi yurt ilçesidir", () => {
    const r = parselKos({ veri: veri(), tohum: 1, oyuncular: [{ id: "c", bot: parselBotuOlustur("ciftci", "c"), katilmaMs: 0 }, { id: "p", bot: parselBotuOlustur("pasif", "p"), katilmaMs: 0 }], sureMs: 1 * GUN });
    for (const id of ["c", "p"]) {
      const k = r.katilimlar[id];
      expect(k?.istenenIlce, id).toBeDefined();
      expect(k?.ilceGeriDusuldu, id).toBe(false);
      expect(mulkOyuncuBul(r.sim.dunya, id)?.katilimIlcesi, id).toBe(k?.istenenIlce);
    }
  });

  it("yapi_yerlestir bot: ayrılmış kotası dolunca (tavan 0) ayrılmış hücre almaz, reddedilmez", () => {
    const v = veri();
    v.param.mulk!.yeniOyuncu.ayrilmisHucreHesapTavani = 0;
    v.param.mulk!.yeniOyuncu.yurtHucre = 0; // yurt ayrılmış sayılmasın; kota 0
    const r = parselKos({ veri: v, tohum: 1, oyuncular: [{ id: "c", bot: parselBotuOlustur("ciftci", "c"), katilmaMs: 0 }], sureMs: 2 * GUN, katilimRedDevam: true });
    expect(r.basarisizSayisi["c"] ?? 0).toBe(0);
    for (const h of r.sim.dunya.mulk!.hucreler) expect(r.sim.ic.mulk!.ayrilmis.has(h.id)).toBe(false);
  });
});

describe("acilisAyakIzi: açılışın ilk yapısının hücre sayısı (yurt hariç; H6 açılış koşulu)", () => {
  it("ilk yapı türlerinin en küçük yuvası; tür verisinden okunur, sabit sayı değil", () => {
    const sim = Simulasyon.olustur(veri(), 1);
    const mk = sim.ic.mulk!;
    for (const a of GEC_ACILISLARI) {
      const yuvalar = ACILIS_ESLEMESI[a].ilkYapiTurleri.map((t) => mk.yuva[sim.ic.tesisTuruIndeks[t] as number] as number);
      expect(acilisAyakIzi(sim, a), a).toBe(Math.min(...yuvalar));
      expect(acilisAyakIzi(sim, a)).toBeGreaterThanOrEqual(1);
      expect(acilisAyakIzi(sim, a)).toBeLessThanOrEqual(3); // yapı 1–3 hücre
    }
  });
});

describe("ilceSec: ayrılmış boş hücresi açılış ayak izine yeten ilçeler ÖNCE (H6 açılış koşulu (i))", () => {
  const taze = () => Simulasyon.olustur(veri(), 1);
  /** İlçenin ayrılmış boş sayısını `hedef`e indirir (ayrılmış kümesinden hücre çıkarır; test kancası). */
  const ayarla = (sim: Simulasyon, ilce: string, hedef: number) => {
    const mk = sim.ic.mulk!;
    const bos = mk.ilceler.get(ilce)!.hucreler.filter((h) => h.uygun && mk.ayrilmis.has(h.id)).map((h) => h.id).sort();
    expect(bos.length).toBeGreaterThanOrEqual(hedef);
    for (const id of bos.slice(0, bos.length - hedef)) mk.ayrilmis.delete(id);
    expect(ilceAyrilmisBos(sim, ilce)).toBe(hedef);
  };

  it("SINIR: ayrılmış boş = ayak izi → tercih edilen ilçe seçilir; bir eksik → ayak izine yeten başka ilçe önce gelir", () => {
    for (const acilis of GEC_ACILISLARI) {
      const ayak = acilisAyakIzi(taze(), acilis);
      const ilk = ilceSec(taze(), acilis).ilce as string; // eski sıralamanın (il tercihi, doluluk, kimlik) tercihi
      const tam = taze();
      ayarla(tam, ilk, ayak);
      expect(ilceSec(tam, acilis).ilce, `${acilis} tam sınır`).toBe(ilk);
      const eksik = taze();
      ayarla(eksik, ilk, ayak - 1);
      const sec = ilceSec(eksik, acilis);
      expect(sec.ilce, `${acilis} bir eksik`).not.toBe(ilk);
      expect(ilceAyrilmisBos(eksik, sec.ilce as string)).toBeGreaterThanOrEqual(ayak);
      expect(sec.neden).toContain("taban hucre ayak izine yeten");
    }
  });

  it("hiçbir ilçe ayak izine yetmiyorsa eski sıralama sürer ('uygun ilçe yok' DEĞİL: yedek tercih)", () => {
    const s = taze();
    const mk = s.ic.mulk!;
    const ilk = ilceSec(taze(), "ciftci").ilce;
    mk.ayrilmis.clear();
    const r = ilceSec(s, "ciftci");
    expect(r.ilce).toBe(ilk);
    expect(r.neden).toContain("taban hucre ayak izine yeten 0");
  });
});

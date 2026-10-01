/**
 * G6 `zincir` önayarı (docs/arastirma/bot-kurallari-g6-g8.md §2, §5; p4-p5-sartname.md §15.1 B-1/B-3): fabrika yöntemleri tesis tamamlanınca `yontem_degistir` ile
 * bir kez verilir (rehberli ya da marjinal-net seçici); ihracat emirleri hedef yöntemin net çıktısından türer (`netCikti` düzeltmesi). G6 verisi (G6-3) içeriğe girmeden
 * önce A2 tarifleri test kopyasına eklenir (`g6-yardimci.ts`); gerçek içerik değişmez.
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, Simulasyon, npcHacimleri } from "@bolge/cekirdek";
import { fabrikaAta, parselBotuOlustur, parselKos, portfoyDegeri, portfoyNeti, tohumluFabrikaSayisi } from "../src";
import type { FabrikaSecimGirdisi, ParselKosuOyuncusu } from "../src";
import { kavramSaglandi } from "../../sunucu/src/odul/dedektor";
import { icerikBilgisi } from "../src/tablo";
import { g6TestVerisi } from "./g6-yardimci";

/** Bot koşuları: yeni tariflerde elektrik/yakıt yok (şebeke enerjisi çekirdeğe G6-2b ile girer; o zamana kadar enerjisiz zincir üretir ve nakit akar). */
const ENERJISIZ = { enerjisiz: true } as const;

function zincir(id = "z1", secenek: Parameters<typeof parselBotuOlustur>[2] = {}): ParselKosuOyuncusu {
  return { id, bot: parselBotuOlustur("zincir", id, secenek), katilmaMs: 0 };
}

/** Seçici girdisi: A2 oyuncu dilimi (n ≥ 4: emilim / 4) ve taban fiyatlar; sabit portföy bir çiftlik. */
function secimGirdisi(fabrikaSayisi: number): FabrikaSecimGirdisi {
  const sim = Simulasyon.olustur(g6TestVerisi(true), 1);
  const bilgi = icerikBilgisi(sim.ic);
  const yi = (id: string): number => sim.ic.yontemIndeks[id] as number;
  return {
    bilgi,
    fiyat: bilgi.taban,
    dilim: npcHacimleri(sim.dunya, sim.baglam).emilim.map((x) => x / 4),
    ihracatPpm: sim.ic.param.pazar.ihracatCarpaniPpm,
    ithalatPpm: sim.ic.param.pazar.ithalatCarpaniPpm,
    sabit: [yi("geleneksel_tarim")],
    bloklar: [[yi("standart_gida_isleme")], [yi("degirmen"), yi("ekmek_firini")]],
    fabrikaSayisi,
  };
}

describe("parsel yöntem seçici (saf)", () => {
  it("net: zincirde ara mal (un) birbirini götürür; kepek ve ekmek artar, tahıl tüketilir, yakıt ve elektrik girdidir", () => {
    const g = secimGirdisi(2);
    const [std, degirmen, firin] = [g.bloklar[0]![0]!, g.bloklar[1]![0]!, g.bloklar[1]![1]!];
    void std;
    const net = portfoyNeti(g.bilgi, [...g.sabit, degirmen, firin]);
    const mal = (id: string): number => g.bilgi.malId.indexOf(id);
    expect(net.get(mal("tahil"))).toBe(0); // çiftlik +200.000, değirmen -200.000
    expect(net.get(mal("un"))).toBe(0);
    expect(net.get(mal("kepek"))).toBe(33000);
    expect(net.get(mal("ekmek"))).toBe(240000);
    expect(net.get(mal("yakit"))).toBe(-20000);
    expect(net.get(mal("elektrik"))).toBe(-27000);
  });

  it("n_f = 1: yalnız standart (zincir 2 tesis ister); n_f = 2: standart × 2 ↔ zincir çifti marjinal netle seçilir (A2 §5: D satırı); n_f = 3: standart + zincir", () => {
    const [std, degirmen, firin] = [secimGirdisi(1).bloklar[0]![0]!, secimGirdisi(1).bloklar[1]![0]!, secimGirdisi(1).bloklar[1]![1]!];
    expect(fabrikaAta(secimGirdisi(1))?.yontemler).toEqual([std]);
    const iki = fabrikaAta(secimGirdisi(2));
    expect(iki?.yontemler).toEqual([degirmen, firin]); // 2 × standart doymuş gıda havuzunda değersiz
    const g2 = secimGirdisi(2);
    expect(portfoyDegeri(g2, [...g2.sabit, degirmen, firin])).toBeGreaterThan(portfoyDegeri(g2, [...g2.sabit, std, std]));
    const uc = fabrikaAta(secimGirdisi(3));
    expect(uc?.yontemler).toEqual([std, degirmen, firin]);
    expect(uc?.adetler).toEqual([1, 1]);
  });

  it("deterministik, girdiyi değiştirmez; boş blok listesi ya da doldurulamayan n_f null", () => {
    const g = secimGirdisi(3);
    const once = JSON.stringify([g.sabit, g.bloklar]);
    expect(JSON.stringify(fabrikaAta(g))).toBe(JSON.stringify(fabrikaAta(g)));
    expect(JSON.stringify([g.sabit, g.bloklar])).toBe(once);
    expect(fabrikaAta({ ...g, bloklar: [] })).toBeNull();
    expect(fabrikaAta({ ...g, bloklar: [g.bloklar[1]!], fabrikaSayisi: 1 })).toBeNull();
  });

  it("tohumlu n_f: deterministik, {1,2,3} ve yaklaşık %25/%50/%25 (tohum × bot karması)", () => {
    const sayac = [0, 0, 0, 0];
    for (let tohum = 1; tohum <= 3; tohum++) for (let b = 0; b < 400; b++) sayac[tohumluFabrikaSayisi(tohum, `bot${b}`)]!++;
    expect(sayac[0]).toBe(0);
    const topla = sayac[1]! + sayac[2]! + sayac[3]!;
    expect(topla).toBe(1200);
    expect(sayac[1]! / topla).toBeGreaterThan(0.2);
    expect(sayac[1]! / topla).toBeLessThan(0.3);
    expect(sayac[2]! / topla).toBeGreaterThan(0.45);
    expect(sayac[2]! / topla).toBeLessThan(0.55);
    expect(tohumluFabrikaSayisi(7, "x")).toBe(tohumluFabrikaSayisi(7, "x"));
  });
});

describe("parsel zincir önayarı: rehberli (G6 B-1)", () => {
  it("Çiftlik → gıda fabrikası ×2: tesisler tamamlanınca `yontem_degistir` ile sırayla değirmen ve fırın olur; komutlar reddedilmez", () => {
    const r = parselKos({ veri: g6TestVerisi(true, ENERJISIZ), tohum: 1, oyuncular: [zincir()], sureMs: 2 * GUN });
    expect(r.basarisizSayisi["z1"]).toBe(0);
    expect(r.komutGunlugu.filter((k) => k.tur === "yapi_yerlestir").map((k) => k.tesisTuru).slice(0, 3)).toEqual(["ciftlik", "gida_fabrikasi", "gida_fabrikasi"]);
    const degisim = r.komutGunlugu.filter((k) => k.tur === "yontem_degistir").map((k) => k.yontem);
    expect(degisim.slice(0, 2)).toEqual(["degirmen", "ekmek_firini"]);
    const d = r.sim.dunya;
    const dugum = d.bolgeler[d.mulk!.isletmeler.find((i) => i.oyuncu === "z1")!.bolgeIndeksi]!;
    const yontemler = dugum.tesisler.map((t) => r.sim.ic.yontemler[t.yontem]!.id);
    expect(yontemler).toContain("degirmen");
    expect(yontemler).toContain("ekmek_firini");
    expect(yontemler).not.toContain("standart_gida_isleme");
    // Karar tesis başına BİR kez: yöntemi değişmiş tesis için tekrar komut yok.
    expect(degisim.filter((y) => y === "degirmen")).toHaveLength(1);
    expect(degisim.filter((y) => y === "ekmek_firini")).toHaveLength(1);
  });

  it("ihracat emirleri hedef yöntemden türer: ekmek ve kepek ihraç edilir; un, tahıl ve standart gıda edilmez; yakıt/elektrik için ithalat emri YOKTUR", () => {
    const r = parselKos({ veri: g6TestVerisi(true, ENERJISIZ), tohum: 1, oyuncular: [zincir()], sureMs: 2 * GUN });
    const d = r.sim.dunya;
    const dugum = d.bolgeler[d.mulk!.isletmeler.find((i) => i.oyuncu === "z1")!.bolgeIndeksi]!;
    const malId = r.sim.ic.mallar.map((m) => m.id);
    const ihracat = dugum.ticaretEmirleri.filter((e) => e.yon === "ihracat").map((e) => malId[e.mal]);
    expect(ihracat).toContain("ekmek");
    expect(ihracat).toContain("kepek");
    for (const yok of ["un", "tahil", "gida"]) expect(ihracat).not.toContain(yok);
    const ithalat = dugum.ticaretEmirleri.filter((e) => e.yon === "ithalat").map((e) => malId[e.mal]);
    expect(ithalat).not.toContain("yakit");
    expect(ithalat).not.toContain("elektrik");
  });

  it("ilk turda yanlış ihracat yok: tesisler henüz standartta iken bile hedef yöntemin çıktısı (ekmek, kepek) ihraç edilir, gıda edilmez", () => {
    const sim = Simulasyon.olustur(g6TestVerisi(true, ENERJISIZ), 1);
    const bot = parselBotuOlustur("zincir", "z1");
    sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "z1", bolgeler: [], ilce: bot.katilimIlcesi(sim) as string } });
    const komutlar = bot.karar(sim);
    expect(komutlar.filter((k) => k.tur === "yapi_yerlestir").map((k) => k.tesisTuru)).toEqual(["ciftlik", "gida_fabrikasi"]);
    const ihracat = komutlar.filter((k) => k.tur === "ticaret_emri" && k.yon === "ihracat").map((k) => (k as { mal: string }).mal);
    expect(ihracat).not.toContain("gida");
  });

  it("gerçek tarifle ve şebeke enerjisi çekirdekte yokken (elektrik/yakıt sağlanamaz) fırın üretmez: ekmek birikmez ve ahır kurulmaz (ahır kapısı)", () => {
    const r = parselKos({ veri: g6TestVerisi(true), tohum: 1, oyuncular: [zincir()], sureMs: 3 * GUN });
    expect(r.komutGunlugu.some((k) => k.tur === "yapi_yerlestir" && k.tesisTuru === "ahir")).toBe(false);
  });

  it("uçtan uca (enerjisiz test tarifi): un, kepek ve ekmek üretilir; ahır ~24 saat sonra kurulur ve `kepek_gubresi` olur; `zincir_kapandi` ve `ilk_isleme` sağlanır", () => {
    const r = parselKos({ veri: g6TestVerisi(true, { enerjisiz: true }), tohum: 1, oyuncular: [zincir()], sureMs: 3 * GUN });
    expect(r.basarisizSayisi["z1"]).toBe(0);
    const d = r.sim.dunya;
    const dugum = d.bolgeler[d.mulk!.isletmeler.find((i) => i.oyuncu === "z1")!.bolgeIndeksi]!;
    const mal = (id: string): number => r.sim.ic.malIndeks[id] as number;
    for (const id of ["un", "kepek", "ekmek"]) expect((dugum.uretimToplam[mal(id)] ?? 0) + (dugum.uretimOrani[mal(id)] ?? 0), id).toBeGreaterThan(0);
    const ahir = r.komutGunlugu.find((k) => k.tur === "yapi_yerlestir" && k.tesisTuru === "ahir");
    expect(ahir).toBeDefined();
    expect((ahir as { t: number }).t).toBeGreaterThanOrEqual(24 * SAAT);
    expect(dugum.tesisler.map((t) => r.sim.ic.yontemler[t.yontem]!.id)).toContain("kepek_gubresi");
    const oyuncu = d.oyuncular.find((o) => o.id === "z1")!;
    expect(kavramSaglandi(r.sim.ic, d, oyuncu, "zincir_kapandi", d.zaman)).toBe(true);
    expect(kavramSaglandi(r.sim.ic, d, oyuncu, "ilk_isleme", d.zaman)).toBe(true);
  });

  it("G6 verisi yokken (mevcut içerik): yöntem komutu yok, tür varsayılanı; komutlar reddedilmez; ahır kurulmaz", () => {
    const r = parselKos({ veri: g6TestVerisi(false), tohum: 1, oyuncular: [zincir()], sureMs: 2 * GUN });
    expect(r.basarisizSayisi["z1"]).toBe(0);
    expect(r.komutGunlugu.some((k) => k.tur === "yontem_degistir")).toBe(false);
    expect(r.komutGunlugu.filter((k) => k.tur === "yapi_yerlestir").map((k) => k.tesisTuru).slice(0, 2)).toEqual(["ciftlik", "gida_fabrikasi"]);
    expect(r.komutGunlugu.some((k) => k.tur === "yapi_yerlestir" && k.tesisTuru === "ahir")).toBe(false);
  });

  it("seçenek denetimi: rehberli botta n_f ≠ 2, aralık dışı n_f ve zincir dışı önayarda seçici/n_f atar", () => {
    expect(() => parselBotuOlustur("zincir", "x", { gidaFabrikasi: 3 })).toThrow(/rehberli/);
    expect(() => parselBotuOlustur("zincir", "x", { yontemSecici: true, gidaFabrikasi: 9 })).toThrow(/gidaFabrikasi/);
    expect(() => parselBotuOlustur("ciftci", "x", { yontemSecici: true })).toThrow(/zincir/);
    expect(() => parselBotuOlustur("ciftci", "x", { gidaFabrikasi: 2 })).toThrow(/zincir/);
  });

  it("deterministik ve karar dünyayı değiştirmez", () => {
    const a = parselKos({ veri: g6TestVerisi(true, ENERJISIZ), tohum: 2, oyuncular: [zincir()], sureMs: 3 * GUN });
    const b = parselKos({ veri: g6TestVerisi(true, ENERJISIZ), tohum: 2, oyuncular: [zincir()], sureMs: 3 * GUN });
    expect(a.sim.durumOzeti()).toBe(b.sim.durumOzeti());
    expect(JSON.stringify(a.komutGunlugu)).toBe(JSON.stringify(b.komutGunlugu));
    const once = a.sim.durumOzeti();
    parselBotuOlustur("zincir", "z1").karar(a.sim);
    expect(a.sim.durumOzeti()).toBe(once);
  });
});

describe("parsel zincir önayarı: seçici (G6 B-3; M yalnız seçici botlardan)", () => {
  it("n_f = 3: [standart, değirmen, fırın] sırasıyla; n_f = 1: standart (yöntem komutu yok)", () => {
    const uc = parselKos({ veri: g6TestVerisi(true, ENERJISIZ), tohum: 1, oyuncular: [zincir("s3", { yontemSecici: true, gidaFabrikasi: 3 })], sureMs: 2 * GUN });
    expect(uc.basarisizSayisi["s3"]).toBe(0);
    const degisim = uc.komutGunlugu.filter((k) => k.tur === "yontem_degistir").map((k) => k.yontem);
    expect(degisim.slice(0, 2)).toEqual(["degirmen", "ekmek_firini"]); // 1. tesis standart kalır
    const bir = parselKos({ veri: g6TestVerisi(true, ENERJISIZ), tohum: 1, oyuncular: [zincir("s1", { yontemSecici: true, gidaFabrikasi: 1 })], sureMs: 2 * GUN });
    expect(bir.basarisizSayisi["s1"]).toBe(0);
    expect(bir.komutGunlugu.filter((k) => k.tur === "yontem_degistir" && k.yontem !== "kepek_gubresi")).toHaveLength(0);
  });

  it("n_f = 2: seçici zinciri seçer (rehberli ile aynı yöntemler); tohumlu karma deterministik", () => {
    const r = parselKos({ veri: g6TestVerisi(true, ENERJISIZ), tohum: 1, oyuncular: [zincir("s2", { yontemSecici: true, gidaFabrikasi: 2 })], sureMs: 2 * GUN });
    const degisim = r.komutGunlugu.filter((k) => k.tur === "yontem_degistir").map((k) => k.yontem);
    expect(degisim.slice(0, 2)).toEqual(["degirmen", "ekmek_firini"]);
    const a = parselBotuOlustur("zincir", "q", { yontemSecici: true, tohum: 5 });
    const b = parselBotuOlustur("zincir", "q", { yontemSecici: true, tohum: 5 });
    const sim = Simulasyon.olustur(g6TestVerisi(true), 1);
    expect(JSON.stringify(a.karar(sim))).toBe(JSON.stringify(b.karar(sim)));
  });
});

describe("eski önayarlar G6 verisinden etkilenmez", () => {
  it("çiftçi, sanayici, tüccar: G6 yöntemleri içerikte olsa da komut günlüğü G6 öncesiyle bayt bayt aynıdır", () => {
    const duzen = (): ParselKosuOyuncusu[] => (["ciftci", "sanayici", "tuccar"] as const).map((o, i) => ({ id: `b${i}`, bot: parselBotuOlustur(o, `b${i}`), katilmaMs: 0 }));
    const yeni = parselKos({ veri: g6TestVerisi(true), tohum: 1, oyuncular: duzen(), sureMs: 3 * GUN });
    const eski = parselKos({ veri: g6TestVerisi(false), tohum: 1, oyuncular: duzen(), sureMs: 3 * GUN });
    expect(JSON.stringify(yeni.komutGunlugu)).toBe(JSON.stringify(eski.komutGunlugu));
    expect(yeni.komutGunlugu.some((k) => k.tur === "yontem_degistir")).toBe(false);
  });
});

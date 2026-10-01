/**
 * Esnaf Defteri ödül dedektörü (sunucu): kavram saptama, ödülün günlüğe girişi (sistem kimliği, idempotans), DETERMİNİZM (canlı koşu, yetişme ve
 * kurtarmada aynı ödüller aynı t'de aynı sırayla), "dedektör kapalı" davranışı ve Esnaf Defteri okuması (`defterIste` -> `defter`).
 * Mülk kipi (dedektör yalnız orada çalışır). Sahte duvar saatiyle koşar; gerçek bekleme yok.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon, alinanOdulDegeri, odulDegeri } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { SunucuMesajiSemasi } from "@bolge/protokol";
import { bellekDeposu } from "../src/depo/bellek";
import { postgresDeposu } from "../src/depo/postgres";
import type { Depo, GunlukKaydi } from "../src/depo/tipler";
import { GelistirmeKimligi } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { DuvarSaati, ElleSaat, VARSAYILAN_DUNYA_EPOCH_MS } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import type { CalisanSunucu } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import type { YazarSecenekleri } from "../src/yazar";
import { SIR, kamuKumesi, mulkVerisi, token, veri } from "./yardimci";
import { pgHavuzu } from "./pg-yardimci";

const E = VARSAYILAN_DUNYA_EPOCH_MS;
const TOHUM = 4;
const ILCE1 = "sn_m_ova_merkez";
const ILCE2 = "sn_m_ova_tasra";
const ILCE_V = "sn_m_liman_merkez";

class SahteDuvar {
  constructor(public ms: number) {}
  readonly oku = (): number => this.ms;
}

function dunyaVerisi(ek: (v: ReturnType<typeof mulkVerisi>) => void = () => undefined) {
  const v = mulkVerisi();
  if (v.param.mulk) {
    v.param.mulk.yeniOyuncu.hibe = 500_000_000;
    v.param.mulk.yeniOyuncu.baslangicStok.parca = 400_000; // bakım girdisi (ahır parça ister)
  }
  ek(v);
  return v;
}

function yazarAc(depo: Depo, duvar: SahteDuvar, ek: Partial<YazarSecenekleri> = {}, v = dunyaVerisi()): Promise<DunyaYazari> {
  return DunyaYazari.ac({ veri: v, tohum: TOHUM, depo, saat: new DuvarSaati(1, { duvar: duvar.oku }), commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true, ...ek });
}

async function yetis(y: DunyaYazari): Promise<void> {
  let n = 0;
  while (y.yetisiyor) {
    await y.birTur();
    if (++n > 100_000) throw new Error("yetisme bitmiyor");
  }
}

async function komutla(y: DunyaYazari, oyuncu: string, anahtar: string, komut: Komut): Promise<void> {
  const p = y.komutGonder(oyuncu, "test", anahtar, komut);
  await y.birTur();
  const r = await p;
  if (!r.sonuc.tamam) throw new Error(`komut basarisiz (${anahtar}): ${r.sonuc.hata}`);
}

/** Ayrılmamış, kamu olmayan, uygun kırsal hücreler (satın alınabilir). */
function serbest(y: DunyaYazari, ilce: string): string[] {
  const kamu = kamuKumesi(y.sim, ilce);
  const ay = y.sim.ic.mulk?.ayrilmis ?? new Set<string>();
  return (y.sim.ic.mulk?.fikstur.ilceler.find((c) => c.id === ilce)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id) && !ay.has(h.id)).map((h) => h.id);
}

function bitisikCift(liste: string[]): string[] {
  const k = new Set(liste);
  for (const id of liste) {
    const [x, yy] = id.split(":").map(Number) as [number, number];
    if (k.has(`${x + 1}:${yy}`)) return [id, `${x + 1}:${yy}`];
  }
  throw new Error("bitisik cift yok");
}

/** Oyuncuları katar ve ali'nin altı kavramı doğuran işlerini yapar (hepsi aynı sim anında; duvar saati 5. saatte). */
async function oyna(y: DunyaYazari, duvar: SahteDuvar): Promise<void> {
  await komutla(y, SISTEM_OYUNCUSU, "k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE1 } as Komut);
  await komutla(y, SISTEM_OYUNCUSU, "k-veli", { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: [], ilce: ILCE_V } as Komut);
  for (let h = 0; h < 3; h++) {
    duvar.ms += SAAT;
    await y.birTur();
  }
  const ova = serbest(y, ILCE1);
  const c1 = bitisikCift(ova);
  await komutla(y, "ali", "p1", { tur: "parsel_al", ilce: ILCE1, hucreler: c1, sinif: "kirsal" });
  await komutla(y, "ali", "ins1", { tur: "tesis_insa_hucre", ilce: ILCE1, tesisTuru: "ciftlik", hucreler: c1 });
  await komutla(y, "ali", "t1", { tur: "ticaret_emri", bolge: "sn_m_ova#ali", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
  const tasra = serbest(y, ILCE2);
  const c2 = bitisikCift(tasra.slice(1)); // ilk hücre ikinci ilçe için ayrı
  await komutla(y, "ali", "p2", { tur: "parsel_al", ilce: ILCE2, hucreler: [tasra[0] as string], sinif: "kirsal" }); // ikinci_ilce
  await komutla(y, "ali", "p3", { tur: "parsel_al", ilce: ILCE2, hucreler: c2, sinif: "kirsal" });
  await komutla(y, "ali", "ins2", { tur: "tesis_insa_hucre", ilce: ILCE2, tesisTuru: "ahir", hucreler: c2 }); // işleme + zincir
  await komutla(y, "ali", "ar", { tur: "arastir", teknoloji: "mekanize_tarim" }); // ilk_arastirma
  const lim = serbest(y, ILCE_V);
  await komutla(y, "veli", "pv", { tur: "parsel_al", ilce: ILCE_V, hucreler: [lim[0] as string], sinif: "kirsal" }); // yalnız ilk_parsel damgası
}

async function saatleriIlerlet(y: DunyaYazari, duvar: SahteDuvar, saat: number, adimDk = 60): Promise<void> {
  const adimlar = Math.round((saat * 60) / adimDk);
  for (let i = 0; i < adimlar; i++) {
    duvar.ms += adimDk * 60_000;
    await y.birTur();
  }
}

type Satir = [number, number, string, string, string];
async function gunlukSatirlari(depo: Depo): Promise<Satir[]> {
  return (await depo.gunluk.oku(0)).map((k: GunlukKaydi): Satir => [k.seq, k.t, k.oyuncu, JSON.stringify(k.komut), k.anahtar]);
}
const oduller = (l: Satir[]): Satir[] => l.filter((s) => s[2] === SISTEM_OYUNCUSU && s[3].includes('"sistem_odul"'));

const KAVRAMLAR_ALI = ["ikinci_ilce", "ilk_arastirma", "ilk_yapi", "ilk_isleme", "zincir_kapandi", "ilk_satis"];

afterEach(() => undefined);

describe("kavram saptama ve odulun gunluge girisi", () => {
  it("alti kavram saptanir; her biri bir kez, sistem kimligiyle, anahtar odul:<oyuncu>:<kavram>; yer tutucular ve baskasi yok", async () => {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const depo = bellekDeposu();
    const y = await yazarAc(depo, duvar);
    expect(y.odulDedektoruAcik).toBe(true);
    await yetis(y);
    await oyna(y, duvar);
    await saatleriIlerlet(y, duvar, 100);
    const l = await gunlukSatirlari(depo);
    const o = oduller(l);
    const kavramlar = o.map((s) => (JSON.parse(s[3]) as { kavram: string }).kavram);
    expect(new Set(kavramlar)).toEqual(new Set(KAVRAMLAR_ALI));
    expect(kavramlar).toHaveLength(KAVRAMLAR_ALI.length); // her biri tek
    for (const s of o) {
      const k = JSON.parse(s[3]) as { oyuncu: string; kavram: string };
      expect(k.oyuncu).toBe("ali"); // veli yalniz parsel aldi: odul yok
      expect(s[4]).toBe(`odul:ali:${k.kavram}`);
      expect(["ilk_dukkan", "ilk_sozlesme"]).not.toContain(k.kavram); // dukkani olmayan ali ilk_dukkan almaz
    }
    // HEPSI sim-saat sinirinda (koşullar tamamlanmis yapi/arastirma/uretim ister); komut aninda odul YOK.
    const t5 = 5 * SAAT;
    const tOf = (kv: string): number => o.find((s) => s[3].includes(`"${kv}"`))?.[1] as number;
    for (const kv of KAVRAMLAR_ALI) expect(tOf(kv) % SAAT).toBe(0);
    expect(tOf("ilk_yapi")).toBe(6 * SAAT);
    expect(tOf("ikinci_ilce")).toBe(6 * SAAT); // ikinci ilcedeki yapi (ahir) tamamlaninca
    expect(tOf("ilk_arastirma")).toBeGreaterThan(t5); // arastirma TAMAMLANINCA (baslatinca degil)
    // Cekirdek durumu: alinanOdul tam kume, siralidir; toplam deger tablodan; tavan asilmaz.
    const ali = y.sim.dunya.oyuncular.find((x) => x.id === "ali");
    expect(ali?.alinanOdul).toEqual([...KAVRAMLAR_ALI].sort());
    expect(y.sim.dunya.oyuncular.find((x) => x.id === "veli")?.alinanOdul).toBeUndefined();
    const beklenen = KAVRAMLAR_ALI.reduce((n, k) => n + (odulDegeri(y.sim.ic, k) ?? 0), 0);
    expect(alinanOdulDegeri(y.sim.ic, ali as NonNullable<typeof ali>)).toBe(beklenen);
    expect(beklenen).toBeLessThanOrEqual(y.sim.ic.param.odul?.tavanMili ?? 0);
    expect(y.metrikler.odulVerilen).toBe(KAVRAMLAR_ALI.length);
    expect(y.metrikler.odulReddedilen).toBe(0);
    // Gunluk tam: sifirdan yeniden oynatma canli dunyayla ayni t'de ayni ozeti verir (oduller gunlukte).
    const t = y.sim.dunya.zaman;
    const yeni = Simulasyon.olustur(dunyaVerisi(), TOHUM);
    for (const k of await depo.gunluk.oku(0)) yeni.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
    yeni.calistirKadar(t);
    expect(yeni.durumOzeti()).toBe(y.ozet().durumOzeti);
    await y.kapat();
  }, 60_000);

  it("damgalar profilde: ilk_parsel/ilk_uretim (bilgi, para-mal yok) ve odul zamanlari; metin yok; Defter okumasi tabloyla tutarli", async () => {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const depo = bellekDeposu();
    const y = await yazarAc(depo, duvar);
    await yetis(y);
    await oyna(y, duvar);
    await saatleriIlerlet(y, duvar, 100);
    const damgalar = (await depo.profil?.damgaOku("ali")) ?? [];
    expect(damgalar.filter((d) => d.kaynak === "damga").map((d) => d.kavram).sort()).toEqual(["ilk_parsel", "ilk_uretim"]);
    expect(damgalar.filter((d) => d.kaynak === "odul").map((d) => d.kavram).sort()).toEqual([...KAVRAMLAR_ALI].sort());
    expect((await depo.profil?.damgaOku("veli"))?.map((d) => d.kavram)).toEqual(["ilk_parsel"]); // yalniz bilgi damgasi
    const d = await y.defter("ali");
    expect(d).not.toBeNull();
    expect(d?.kazanilan.filter((k) => k.tur === "odul").map((k) => k.kavram).sort()).toEqual([...KAVRAMLAR_ALI].sort());
    for (const k of d?.kazanilan ?? []) {
      expect(k.sablon).toBe(`defter.kavram.${k.kavram}`);
      expect(k.t).toBeGreaterThan(0);
      if (k.tur === "odul") expect(k.odul?.degerMili).toBe(odulDegeri(y.sim.ic, k.kavram));
      else expect(k.odul).toBeUndefined();
    }
    expect(d?.siradaki.map((s) => [s.kavram, s.etkin])).toEqual([["ilk_dukkan", false], ["ilk_sozlesme", false]]); // etkin kurali (P4/P5): bu icerikte mulk.perakende (dukkan) yok -> ilk_dukkan etkin degil; dukkanli icerikte etkin: odul-p4p5.test.ts
    expect(d?.toplamOdulMili).toBe(KAVRAMLAR_ALI.reduce((n, k) => n + (odulDegeri(y.sim.ic, k) ?? 0), 0));
    expect(d?.tavanMili).toBe(y.sim.ic.param.odul?.tavanMili);
    // Veli: yalniz damga; siradaki 8 kavramin hepsi
    const v = await y.defter("veli");
    expect(v?.kazanilan.map((k) => [k.kavram, k.tur])).toEqual([["ilk_parsel", "damga"]]);
    expect(v?.siradaki).toHaveLength(8);
    expect(await y.defter("yok")).toBeNull();
    await y.kapat();
  }, 60_000);

  it("tavan: tavan dusukse asan odul KOMUTU uretilmez (reddedilen komut gunlukte birikmez)", async () => {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const depo = bellekDeposu();
    const y = await yazarAc(depo, duvar, {}, dunyaVerisi((v) => {
      if (v.param.odul) v.param.odul.tavanMili = 1_300_000;
    }));
    await yetis(y);
    await oyna(y, duvar);
    await saatleriIlerlet(y, duvar, 100);
    const ali = y.sim.dunya.oyuncular.find((x) => x.id === "ali");
    expect(alinanOdulDegeri(y.sim.ic, ali as NonNullable<typeof ali>)).toBeLessThanOrEqual(1_300_000);
    expect(y.metrikler.odulReddedilen).toBe(0);
    const l = await depo.gunluk.oku(0);
    expect(l.filter((k) => k.komut.tur === "sistem_odul").length).toBe(y.metrikler.odulVerilen);
    await y.kapat();
  }, 60_000);
});

describe("kotuye kullanim: odul bedelden ucuza alinamaz", () => {
  async function hazir(): Promise<{ y: DunyaYazari; duvar: SahteDuvar; depo: ReturnType<typeof bellekDeposu> }> {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const depo = bellekDeposu();
    const y = await yazarAc(depo, duvar);
    await yetis(y);
    await komutla(y, SISTEM_OYUNCUSU, "k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE1 } as Komut);
    for (let h = 0; h < 3; h++) {
      duvar.ms += SAAT;
      await y.birTur();
    }
    return { y, duvar, depo };
  }
  const kavramlar = (l: Satir[]): string[] => oduller(l).map((s) => (JSON.parse(s[3]) as { kavram: string }).kavram);

  it("ikinci_ilce: tek hucre al, odul bekle, birak dongusu ODUL VERMEZ (yalniz ikinci ilcede TAMAMLANMIS yapi verir)", async () => {
    const { y, duvar, depo } = await hazir();
    const c1 = bitisikCift(serbest(y, ILCE1));
    await komutla(y, "ali", "p1", { tur: "parsel_al", ilce: ILCE1, hucreler: c1, sinif: "kirsal" });
    await komutla(y, "ali", "ins1", { tur: "tesis_insa_hucre", ilce: ILCE1, tesisTuru: "ciftlik", hucreler: c1 }); // ilk ilcede yapi
    const tasra = serbest(y, ILCE2);
    for (let dongu = 0; dongu < 3; dongu++) {
      await komutla(y, "ali", `al${dongu}`, { tur: "parsel_al", ilce: ILCE2, hucreler: [tasra[0] as string], sinif: "kirsal" });
      expect(y.sim.dunya.mulk?.oyuncular.find((x) => x.id === "ali")?.ilceHucre.length).toBe(2); // eski kosul saglanir
      await saatleriIlerlet(y, duvar, 3); // birkac sim-saat sinirindan gecer
      await komutla(y, "ali", `birak${dongu}`, { tur: "parsel_birak", ilce: ILCE2, hucreler: [tasra[0] as string] });
    }
    // Hucreyi uzun sure TUTMAK da yetmez (yapi yok).
    await komutla(y, "ali", "al-son", { tur: "parsel_al", ilce: ILCE2, hucreler: [tasra[0] as string], sinif: "kirsal" });
    await saatleriIlerlet(y, duvar, 24);
    expect(kavramlar(await gunlukSatirlari(depo))).not.toContain("ikinci_ilce");
    expect(y.sim.dunya.oyuncular.find((x) => x.id === "ali")?.alinanOdul ?? []).not.toContain("ikinci_ilce");
    // Ikinci ilcede yapi: tamamlaninca sim-saat sinirinda bir kez.
    const c2 = bitisikCift(tasra.slice(1));
    await komutla(y, "ali", "p-tasra", { tur: "parsel_al", ilce: ILCE2, hucreler: c2, sinif: "kirsal" });
    await komutla(y, "ali", "ins-tasra", { tur: "tesis_insa_hucre", ilce: ILCE2, tesisTuru: "ahir", hucreler: c2 });
    expect(kavramlar(await gunlukSatirlari(depo))).not.toContain("ikinci_ilce"); // insaat suruyor
    await saatleriIlerlet(y, duvar, 6);
    const l = await gunlukSatirlari(depo);
    expect(kavramlar(l).filter((k) => k === "ikinci_ilce")).toHaveLength(1);
    expect((oduller(l).find((s) => s[3].includes("ikinci_ilce"))?.[1] ?? 1) % SAAT).toBe(0); // sim-saat sinirinda
    await y.kapat();
  }, 60_000);

  it("ilk_arastirma: arastirma BASLAYINCA odul yok (calisirken de); TAMAMLANINCA bir kez; cekirdekte iptal/iade yoktur", async () => {
    const { y, duvar, depo } = await hazir();
    await komutla(y, "ali", "ar", { tur: "arastir", teknoloji: "mekanize_tarim" });
    const ali = (): NonNullable<ReturnType<typeof y.sim.dunya.oyuncular.find>> => y.sim.dunya.oyuncular.find((x) => x.id === "ali") as NonNullable<ReturnType<typeof y.sim.dunya.oyuncular.find>>;
    const bitis = ali().arastirma?.bitis ?? 0;
    expect(bitis).toBeGreaterThan(y.sim.dunya.zaman);
    // Araştırma sürerken (bitisten hemen önceki sinira kadar) odul yok.
    while (duvar.ms - E + SAAT < bitis) {
      duvar.ms += SAAT;
      await y.birTur();
      expect(kavramlar(await gunlukSatirlari(depo))).not.toContain("ilk_arastirma");
      expect(ali().arastirma).not.toBeNull();
    }
    // Tamamlaninca (bitis sonrasi ilk sim-saat sinirinda) tek odul.
    await saatleriIlerlet(y, duvar, 3);
    expect(ali().teknolojiler.length).toBe(1);
    const l = await gunlukSatirlari(depo);
    const o = oduller(l).filter((s) => s[3].includes("ilk_arastirma"));
    expect(o).toHaveLength(1);
    expect(o[0]?.[1]).toBeGreaterThanOrEqual(bitis);
    expect((o[0]?.[1] ?? 0) % SAAT).toBe(0);
    expect(o[0]?.[1]).toBeLessThanOrEqual(bitis + SAAT);
    await saatleriIlerlet(y, duvar, 24);
    expect(kavramlar(await gunlukSatirlari(depo)).filter((k) => k === "ilk_arastirma")).toHaveLength(1);
    await y.kapat();
  }, 60_000);
});

describe("determinizm: canli kosu, yetisme ve kurtarma ayni odulleri ayni t'de verir", () => {
  async function kosu(biçim: { kapaliSaat: number } | { adimDk: number } | { carpma: boolean }, toplamSaat = 100): Promise<{ l: Satir[]; ozet: string; t: number; damga: unknown }> {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const depo = bellekDeposu();
    let y = await yazarAc(depo, duvar);
    await yetis(y);
    await oyna(y, duvar);
    const bitis = duvar.ms + toplamSaat * SAAT;
    if ("kapaliSaat" in biçim) {
      await y.kapat();
      duvar.ms += biçim.kapaliSaat * SAAT;
      y = await yazarAc(depo, duvar);
      expect(y.yetisiyor).toBe(biçim.kapaliSaat > 0);
      await yetis(y);
    } else if ("carpma" in biçim) {
      await saatleriIlerlet(y, duvar, 3);
      // Cokus: kapat YOK; acilis goruntusu + gunluk kuyrugu (oduller dahil) yeniden oynatilir.
      y = await yazarAc(depo, duvar);
      expect(y.kurtarma.kalanKayit).toBeGreaterThan(0);
      await yetis(y);
    } else {
      await saatleriIlerlet(y, duvar, 3, biçim.adimDk);
    }
    while (duvar.ms < bitis) {
      duvar.ms = Math.min(bitis, duvar.ms + SAAT);
      await y.birTur();
    }
    await y.birTur();
    expect(y.sim.dunya.zaman).toBe(bitis - E);
    await y.profilBekle();
    const damga = { ali: await depo.profil?.damgaOku("ali"), veli: await depo.profil?.damgaOku("veli") };
    const sonuc = { l: await gunlukSatirlari(depo), ozet: y.ozet().durumOzeti, t: y.sim.dunya.zaman, damga };
    await y.kapat();
    return sonuc;
  }

  it("kesintisiz saatlik adim = duzensiz kisa adimlar (canli tur araliklari odulu degistirmez)", async () => {
    const a = await kosu({ adimDk: 60 });
    const b = await kosu({ adimDk: 7 });
    const c = await kosu({ adimDk: 90 });
    expect(oduller(a.l)).toHaveLength(KAVRAMLAR_ALI.length);
    expect(b.l).toEqual(a.l);
    expect(c.l).toEqual(a.l);
    expect(b.ozet).toBe(a.ozet);
    expect(c.ozet).toBe(a.ozet);
    expect(b.damga).toEqual(a.damga);
  }, 120_000);

  for (const kapaliSaat of [1, 8, 48]) {
    it(`${kapaliSaat} sa kapali kalip yetisen sunucu: oduller, t'ler, sira, gunluk, durumOzeti ve damgalar kesintisizle birebir ayni`, async () => {
      const kesintisiz = await kosu({ adimDk: 60 });
      const kapali = await kosu({ kapaliSaat });
      expect(kapali.l).toEqual(kesintisiz.l);
      expect(kapali.ozet).toBe(kesintisiz.ozet);
      expect(kapali.damga).toEqual(kesintisiz.damga);
      // Yokluk sirasinda verilen odul var: kapanis (5. sa) sonrasi bir sim-saat sinirinda.
      expect(oduller(kapali.l).some((s) => s[1] > 5 * SAAT)).toBe(true);
      // Benzersiz anahtarlar: cift odul yok.
      const anahtarlar = oduller(kapali.l).map((s) => s[4]);
      expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
    }, 120_000);
  }

  it("kill -9 (kapat cagrilmaz): yeniden aciliste gunluk oynatmasi cift odul uretmez; sonuc kesintisizle ayni", async () => {
    const kesintisiz = await kosu({ adimDk: 60 });
    const carpan = await kosu({ carpma: true });
    expect(carpan.l).toEqual(kesintisiz.l);
    expect(carpan.ozet).toBe(kesintisiz.ozet);
    expect(carpan.damga).toEqual(kesintisiz.damga);
    const anahtarlar = oduller(carpan.l).map((s) => s[4]);
    expect(anahtarlar).toHaveLength(KAVRAMLAR_ALI.length);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
  }, 120_000);
});

describe("dedektor kapali / sunum katmani degil", () => {
  it("dedektor kapaliyken HICBIR odul komutu yok; acik yazarla ayni komutlarda durum yalniz odul kadar farklidir", async () => {
    const calistir = async (acik: boolean): Promise<{ l: Satir[]; ozet: string; t: number }> => {
      const duvar = new SahteDuvar(E + 2 * SAAT);
      const depo = bellekDeposu();
      const y = await yazarAc(depo, duvar, { odul: acik });
      expect(y.odulDedektoruAcik).toBe(acik);
      await yetis(y);
      await oyna(y, duvar);
      await saatleriIlerlet(y, duvar, 100);
      const r = { l: await gunlukSatirlari(depo), ozet: y.ozet().durumOzeti, t: y.sim.dunya.zaman };
      await y.kapat();
      return r;
    };
    const kapali = await calistir(false);
    const acik = await calistir(true);
    expect(oduller(kapali.l)).toEqual([]);
    expect(oduller(acik.l)).toHaveLength(KAVRAMLAR_ALI.length);
    // Odul cekirdek durumunu degistirir (sunum katmani degil): ozetler FARKLI.
    expect(acik.ozet).not.toBe(kapali.ozet);
    // Fark yalniz odullerden: acik gunlukten odul komutlari cikarilip yeniden oynatilinca kapali dunyayla ayni t'de AYNI ozet (odul komutlari disinda
    // iki gunluk ayni; odulun urettigi hazine/stok bu kisa kosuda sonraki komutlari etkilemez).
    expect(acik.l.filter((s) => !oduller([s]).length).map((s) => [s[1], s[2], s[3], s[4]])).toEqual(kapali.l.map((s) => [s[1], s[2], s[3], s[4]]));
    const yeni = Simulasyon.olustur(dunyaVerisi(), TOHUM);
    for (const s of acik.l) {
      if (oduller([s]).length) continue;
      yeni.uygula({ t: s[1], oyuncu: s[2], komut: JSON.parse(s[3]) as Komut });
    }
    yeni.calistirKadar(acik.t);
    expect(yeni.durumOzeti()).toBe(kapali.ozet);
  }, 60_000);

  it("bolge kipinde dedektor acilmaz (baslangic yapilari bedava odul olmasin): odul secenegi etkisiz", async () => {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const depo = bellekDeposu();
    const y = await DunyaYazari.ac({ veri: veri(), tohum: TOHUM, depo, saat: new DuvarSaati(1, { duvar: duvar.oku }), commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
    expect(y.odulDedektoruAcik).toBe(false);
    await yetis(y);
    await komutla(y, SISTEM_OYUNCUSU, "k", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: ["m_ova", "m_liman"] });
    await saatleriIlerlet(y, duvar, 5);
    expect(oduller(await gunlukSatirlari(depo))).toEqual([]);
    expect(((await y.defter("ali"))?.siradaki.length ?? 0) > 0).toBe(true); // okuma yine calisir
    await y.kapat();
  });
});

describe("defterIste (WebSocket)", () => {
  let sunucu: CalisanSunucu | null = null;
  const istemciler: SunucuIstemcisi[] = [];
  afterEach(async () => {
    for (const i of istemciler.splice(0)) await i.kapat();
    await sunucu?.kapat();
    sunucu = null;
  });

  it("oyuncu defterIste -> defter (sema gecerli, istek aynen doner); yonetici yetki hatasi; hiz siniri", async () => {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const depo = bellekDeposu();
    const y = await DunyaYazari.ac({ veri: dunyaVerisi(), tohum: TOHUM, depo, saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
    void duvar;
    sunucu = await sunucuBaslat({ yazar: y, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0, hizSiniri: { kapasite: 12, saniyeBasina: 0.001 } });
    const url = `ws://127.0.0.1:${sunucu.port}`;
    const yonetici = await SunucuIstemcisi.baglan(url, token(SISTEM_OYUNCUSU), "yon");
    const ali = await SunucuIstemcisi.baglan(url, token("ali"), "ali-ist").catch(() => null);
    istemciler.push(yonetici);
    // ali dünyada yok: önce katıl
    const r = await yonetici.komut("k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE1 } as Komut);
    expect(r.tur === "komutSonucu" && r.sonuc.tamam).toBe(true);
    await ali?.kapat();
    const ali2 = await SunucuIstemcisi.baglan(url, token("ali"), "ali-ist2");
    istemciler.push(ali2);
    ali2.gonder({ tur: "defterIste", istek: 42 });
    const m = await ali2.bekle((x) => x.tur === "defter");
    expect(SunucuMesajiSemasi.safeParse(m).success).toBe(true);
    if (m.tur !== "defter") throw new Error("defter bekleniyordu");
    expect(m.istek).toBe(42);
    expect(m.kazanilan).toEqual([]);
    expect(m.siradaki.map((s) => s.kavram)).toEqual(["ilk_yapi", "ilk_satis", "ilk_isleme", "zincir_kapandi", "ilk_dukkan", "ilk_sozlesme", "ikinci_ilce", "ilk_arastirma"]);
    expect(m.siradaki.find((s) => s.kavram === "ilk_yapi")?.odul).toEqual({ mal: { celik: 5000 }, degerMili: odulDegeri(y.sim.ic, "ilk_yapi") });
    expect(m.tavanMili).toBe(8_000_000);
    expect(JSON.stringify(m)).not.toMatch(/Kolay gelsin|ilk tarlan/); // metin yok, sablon anahtari var
    // yonetici (oyuncu degil) yetki hatasi
    yonetici.gonder({ tur: "defterIste" });
    const h = await yonetici.bekle((x) => x.tur === "hata");
    expect(h.tur === "hata" && h.kod).toBe("yetki");
    // hiz siniri: defterIste jeton harcar
    let sinir = false;
    for (let i = 0; i < 30 && !sinir; i++) {
      ali2.gonder({ tur: "defterIste", istek: 100 + i });
      const x = await ali2.bekle((z) => (z.tur === "defter" && z.istek === 100 + i) || (z.tur === "hata" && z.istek === 100 + i));
      if (x.tur === "hata") sinir = x.kod === "hiz_siniri";
    }
    expect(sinir).toBe(true);
  }, 30_000);
});

// --- gercek Postgres (yalniz BOLGE_PG_URL tanimliysa) ----------------------------------------------------------------------------

describe.skipIf(!process.env.BOLGE_PG_URL)("dedektor + pg profili (damga tablosu)", () => {
  it("oduller ve damgalar pg'de kalici; kapat/yeniden ac: cift odul yok, damgalar ve Defter ayni", async () => {
    const url = process.env.BOLGE_PG_URL as string;
    const dunya = `odul-${process.pid}-${Date.now()}`;
    const duvar = new SahteDuvar(E + 2 * SAAT);
    try {
      let depo = await postgresDeposu({ baglanti: url, dunya, semaKur: true });
      let y = await yazarAc(depo, duvar);
      await yetis(y);
      await oyna(y, duvar);
      await saatleriIlerlet(y, duvar, 100);
      const d1 = await y.defter("ali");
      expect(d1?.kazanilan.filter((k) => k.tur === "odul")).toHaveLength(KAVRAMLAR_ALI.length);
      expect((await depo.profil?.damgaOku("ali"))?.map((d) => d.kavram).sort()).toEqual([...KAVRAMLAR_ALI, "ilk_parsel", "ilk_uretim"].sort());
      await y.kapat();
      depo = await postgresDeposu({ baglanti: url, dunya });
      y = await yazarAc(depo, duvar);
      await yetis(y);
      const d2 = await y.defter("ali");
      expect(d2?.kazanilan).toEqual(d1?.kazanilan);
      await saatleriIlerlet(y, duvar, 6);
      const l = await gunlukSatirlari(depo);
      const anahtarlar = oduller(l).map((s) => s[4]);
      expect(anahtarlar).toHaveLength(KAVRAMLAR_ALI.length);
      expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
      await y.kapat();
    } finally {
      const h = pgHavuzu({ connectionString: url, max: 1 });
      for (const t of ["log", "snapshots", "snapshot_yedek", "profil_capa", "profil_kayit", "profil_damga"]) await h.query(`DELETE FROM ${t} WHERE dunya = $1`, [dunya]).catch(() => undefined);
      await h.end();
    }
  }, 60_000);
});

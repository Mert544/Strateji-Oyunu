/**
 * Yöntem seçici GERÇEK sunucuya karşı: ekmek zinciri oynanabilir (değirmen ve ekmek fırını SEÇİLİP kurulur; `yapi_yerlestir.yontem` ve `tesis_insa_hucre.yontem`), seçilen yöntem sunucuda
 * inşaata ve tesise yazılır ve istemcinin işletme özetinde görünür; ekmek üretilir; "Yöntemi değiştir" (`yontem_degistir`) mülk kipinde çalışır, ücretsizdir ve retleri Türkçedir;
 * Hazine'de şebeke gideri (`kare.ozel.sebeke` x fiyat) görünür. Düzen: `harita-f4-ws` (bellek deposu, elle saat, mini-6 parsel fikstürü, bol hazine ve malzeme).
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { katil, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import { bitisikCiftler } from "../../sunucu/test/yontem-yardimci";
import { icerikTablosu } from "../src/komut/tablo";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { sebekeFiyatlari, sebekeSatirlari } from "../src/harita/sebeke-gider";
import { komutYontemi, seciciGorunur, yontemSecenekleri, yontemSecimiTamam } from "../src/harita/yontem-secici";
import { yapiKatalogu } from "../src/harita/yapi";
import type { YerlesimPlani } from "../src/harita/yapi";
import { yerlesimiUygula } from "../src/harita/zincir";

const ILCE = "sn_m_ova_merkez";
const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const fabrika = yapiKatalogu(ic).find((k) => k.id === "gida_fabrikasi")!;
const sebeke = sebekeFiyatlari(ic);

let ts: TestSunucusu | null = null;
const acilanlar: WsBaglanti[] = [];
afterEach(async () => {
  for (const b of acilanlar.splice(0)) b.kapat();
  await ts?.kapat();
  ts = null;
});

async function bekle(kosul: () => boolean, ms = 8000): Promise<void> {
  const son = Date.now() + ms;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("koşul zamanında sağlanmadı");
    await new Promise((c) => setTimeout(c, 10));
  }
}

/** Bol hazine ve malzeme, tahıl stoklu kit (değirmen girdisi), indirimsiz, yurtsuz, 10 eşzamanlı inşaat. */
function veri(): ReturnType<typeof mulkVerisi> {
  const v = mulkVerisi();
  const m = v.param.mulk!;
  m.yeniOyuncu.yurtHucre = 0;
  m.yeniOyuncu.hibe = 5_000_000_000;
  m.yeniOyuncu.indirimliYapiSayisi = 0;
  m.yeniOyuncu.ayrilmisHucrePpm = 0;
  m.yeniOyuncu.baslangicStok = { ...m.yeniOyuncu.baslangicStok, celik: 50_000_000, parca: 50_000_000, tahil: 50_000_000 };
  m.esZamanliInsaat = 10;
  return v;
}

async function oyuncu(): Promise<{ a: WsBaglanti; y: Awaited<ReturnType<TestSunucusu["baglan"]>> }> {
  ts = await testSunucusu({ veri: veri() });
  const y = await ts.baglan(SISTEM_OYUNCUSU);
  await katil(y, "ali", []);
  await y.zamanIlerlet(SAAT);
  const a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "t-ali", geriCekilmeMs: { ilk: 30, en: 100 } });
  acilanlar.push(a);
  await a.sahiplikAl(ILCE);
  await bekle(() => a.ozet() !== null && a.acikTeknolojiler() !== null);
  return { a, y };
}

/** Yapıyı hücrelerine yerleştiren plan (alınacak hücreler = boş hücreler); çekirdek bedeli hazineden düşer, istemci yalnız komutu bilir. */
function plan(hucreler: string[], alinacak: string[]): YerlesimPlani {
  return {
    yapi: fabrika,
    hucreler: hucreler.map((id) => ({ id, x: 0, y: 0, neden: null, benim: !alinacak.includes(id) })),
    gecerli: true,
    neden: null,
    alinacak,
    parseller: alinacak.length ? [{ sinif: "kirsal", hucreler: alinacak, mili: 0 }] : [],
    arsaMili: 0,
    yapiMili: fabrika.paraMili,
    toplamMili: fabrika.paraMili,
    malzeme: [],
    indirimli: false,
    hazineYetmez: false,
  };
}

const sunucuTesisleri = (): Array<{ id: number; yontem: string }> =>
  ts!.yazar.sim.dunya.bolgeler.filter((b) => b.sahip === "ali" && b.merkez !== undefined).flatMap((b) => b.tesisler.map((t) => ({ id: t.id, yontem: ts!.yazar.sim.ic.yontemler[t.yontem]?.id ?? "?" })));

describe("yöntem seçici: gerçek sunucu", () => {
  it("ekmek zinciri: seçici çok yöntemli türde açılır ve seçilmeden kapalı; değirmen ve fırın SEÇİLİP kurulur (komutta yontem), sunucu inşaata ve tesise yazar, istemci görür, ekmek üretilir", async () => {
    const { a, y } = await oyuncu();
    const sec = yontemSecenekleri(ic, "gida_fabrikasi", { acik: (t) => a.acikTeknolojiler()?.has(t) ?? true, sebeke });
    expect(seciciGorunur(sec)).toBe(true);
    expect(yontemSecimiTamam(sec, null)).toBe(false); // seçim yok: "Kur" kapalı
    expect(sec.map((s) => s.id)).toEqual(expect.arrayContaining(["degirmen", "ekmek_firini"]));
    expect(a.acikTeknolojiler()).toEqual(new Set()); // kitte araştırma yok

    const [c1, c2] = bitisikCiftler(ts!.yazar.sim, ILCE, 2) as [string[], string[]];
    const h1 = c1.slice(0, fabrika.yuva);
    const h2 = c2.slice(0, fabrika.yuva);
    const r1 = await yerlesimiUygula(a, ILCE, plan(h1, h1), undefined, komutYontemi(sec, "degirmen"));
    expect(r1, r1.mesaj).toMatchObject({ tamam: true, yol: "atomik", gonderilen: 1 });
    const r2 = await yerlesimiUygula(a, ILCE, plan(h2, h2), undefined, komutYontemi(sec, "ekmek_firini"));
    expect(r2, r2.mesaj).toMatchObject({ tamam: true, yol: "atomik", gonderilen: 1 });
    // Sunucu: inşaatlar seçilen yöntemle (günlükteki komutta yontem alanı)
    const komutlar = (await ts!.depo.gunluk.oku(0)).filter((g) => g.komut.tur === "yapi_yerlestir").map((g) => g.komut as unknown as { yontem?: string });
    expect(komutlar.map((k) => k.yontem)).toEqual(["degirmen", "ekmek_firini"]);
    // İstemci: inşaat yöntemleri karede (oyuncu.insaatYontem) ve işletme özetinde
    await bekle(() => (a.isletme()?.yapilar.filter((x) => x.durum === "insaat" && x.yontem !== undefined).length ?? 0) === 2);
    expect(a.isletme()!.yapilar.filter((x) => x.durum === "insaat").map((x) => x.yontem).sort()).toEqual(["degirmen", "ekmek_firini"]);

    // İnşaatlar bitene kadar saat saat ilerlet; sonra üretim sürerken (girdi bitmeden) 2 saat daha
    let t = SAAT;
    while (sunucuTesisleri().length < 2 && t < 200 * SAAT) await y.zamanIlerlet((t += SAAT));
    expect(sunucuTesisleri().map((x) => x.yontem).sort()).toEqual(["degirmen", "ekmek_firini"]); // sunucuda tesisler seçilen yöntemle
    await y.zamanIlerlet((t += 3 * SAAT));
    await bekle(() => (a.isletme()?.yapilar.filter((x) => x.durum === "tesis").length ?? 0) === 2 && a.ozet()!.simZamani >= t);
    const tesisler = a.isletme()!.yapilar.filter((x) => x.durum === "tesis");
    expect(tesisler.map((x) => x.yontem).sort()).toEqual(["degirmen", "ekmek_firini"]); // tesisin şimdiki yöntemi dizinden
    for (const x of tesisler) expect(x.bolge).toMatch(/^sn_m_ova#/); // yontem_degistir için düğüm kimliği
    // Ekmek zinciri çalıştı: ekmek ÜRETİLDİ (sunucu sayacı ve istemcinin işletme özetindeki stok)
    const mi = ts!.yazar.sim.ic.malIndeks["ekmek"] as number;
    expect(ts!.yazar.sim.dunya.bolgeler.filter((b) => b.sahip === "ali").reduce((n, b) => n + (b.uretimToplam[mi] ?? 0), 0)).toBeGreaterThan(0);
    await bekle(() => (a.isletme()!.mallar.find((m) => m.mal === "ekmek")?.stokMili ?? 0) > 0);
    expect(a.isletme()!.mallar.find((m) => m.mal === "ekmek")?.uretimMili ?? 0).toBeGreaterThan(0); // üretim sürerken oran görünür
    // Şebeke gideri: kare.ozel.sebeke (düğüm düzeyi) x veri fiyatı; Hazine bölümü satırı
    await bekle(() => (a.isletme()?.sebeke?.length ?? 0) > 0);
    const satirlar = sebekeSatirlari(sebeke, a.isletme()!.sebeke ?? []);
    expect(satirlar.length).toBeGreaterThan(0);
    expect(satirlar.every((s) => s.bedelMili > 0 && s.miktarMili > 0)).toBe(true);
  }, 90_000);

  it("seçilen yöntem komutta yoksa tür varsayılanı (bugünkü davranış); yönteme uymayan türde ret Türkçe ve HİÇBİR ŞEY değişmez; kilitli yöntem (teknoloji) reddedilir", async () => {
    const { a } = await oyuncu();
    const [c1, c2] = bitisikCiftler(ts!.yazar.sim, ILCE, 2) as [string[], string[]];
    const h1 = c1.slice(0, fabrika.yuva);
    // Seçici gösterilmeden (ya da tür varsayılanı seçildiğinde) komuta yontem yazılmaz
    const sec = yontemSecenekleri(ic, "gida_fabrikasi", { acik: () => true, sebeke });
    expect(komutYontemi(sec, sec[0]!.id)).toBeUndefined();
    const r0 = await yerlesimiUygula(a, ILCE, plan(h1, h1), undefined, komutYontemi(sec, sec[0]!.id));
    expect(r0.tamam, r0.mesaj).toBe(true);
    const k0 = (await ts!.depo.gunluk.oku(0)).filter((g) => g.komut.tur === "yapi_yerlestir").map((g) => g.komut as unknown as { yontem?: string });
    expect(k0).toHaveLength(1);
    expect(k0[0]).not.toHaveProperty("yontem");
    // Bu türde olmayan yöntem: ret Türkçe, hazine ve hücreler değişmez
    await bekle(() => (a.ozet()!.hazineMili ?? 0) < 5_000_000_000); // ilk kurulumun bedeli istemciye yansıdı
    const hazine = a.ozet()!.hazineMili;
    const h2 = c2.slice(0, fabrika.yuva);
    const r1 = await yerlesimiUygula(a, ILCE, plan(h2, h2), undefined, "kepek_gubresi");
    expect(r1).toMatchObject({ tamam: false });
    expect(r1.mesaj).toContain("Bu yapıda bu yöntem kullanılamaz.");
    expect(r1.mesaj).toContain("Hiçbir şey değişmedi.");
    expect(ts!.yazar.sim.dunya.mulk!.hucreler.filter((h) => h.sahip === "ali" && h2.includes(h.id))).toHaveLength(0);
    expect(a.ozet()!.hazineMili).toBe(hazine);
    // Teknolojisi açık olmayan yöntem (mekanize tarım): sunucu reddeder, istemci metni Türkçe
    const ciftlik = yapiKatalogu(ic).find((k) => k.id === "ciftlik")!;
    const h3 = c2.slice(0, ciftlik.yuva);
    const r2 = await yerlesimiUygula(a, ILCE, { ...plan(h3, h3), yapi: ciftlik }, undefined, "mekanize_tarim");
    expect(r2.tamam).toBe(false);
    expect(r2.mesaj).toContain("Bu yöntem için teknolojiyi açman gerekir.");
    // Kendi arsasında (arsa alınmayan yerleşim) tesis_insa_hucre de yöntemi taşır
    const h4 = c2.slice(0, fabrika.yuva);
    expect((await a.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: h4, sinif: "kirsal" })).tamam).toBe(true);
    const t = await a.tesisInsa({ tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: h4, yontem: "ekmek_firini" });
    expect(t.tamam).toBe(true);
    const ins = (await ts!.depo.gunluk.oku(0)).filter((g) => g.komut.tur === "tesis_insa_hucre").map((g) => g.komut as unknown as { yontem?: string });
    expect(ins.map((k) => k.yontem)).toEqual(["ekmek_firini"]);
  }, 90_000);

  it("'Yöntemi değiştir' mülk kipinde istemciden çalışır: ücretsiz ve anlık (hazine ve stok değişmez), sunucu tesis yöntemi güncellenir, istemci görür; retler Türkçe", async () => {
    const { a, y } = await oyuncu();
    const [c1] = bitisikCiftler(ts!.yazar.sim, ILCE, 1) as [string[]];
    const h1 = c1.slice(0, fabrika.yuva);
    const sec = yontemSecenekleri(ic, "gida_fabrikasi", { acik: () => true, sebeke });
    expect((await yerlesimiUygula(a, ILCE, plan(h1, h1), undefined, komutYontemi(sec, "degirmen"))).tamam).toBe(true);
    await y.zamanIlerlet(SAAT + 3 * 24 * SAAT);
    await bekle(() => a.ozet()!.surenInsaat === 0 && (a.isletme()?.yapilar.filter((x) => x.durum === "tesis").length ?? 0) === 1);
    const t = a.isletme()!.yapilar.find((x) => x.durum === "tesis")!;
    expect(t.yontem).toBe("degirmen");
    const tesisId = Number(t.anahtar.slice(1));
    const stokOnce = JSON.stringify(ts!.yazar.sim.dunya.bolgeler.find((b) => b.sahip === "ali" && b.merkez !== undefined)!.stoklar.map((s) => s.miktar));
    const hazine = (): number => ts!.yazar.sim.dunya.oyuncular.find((o) => o.id === "ali")!.hazine.miktar; // aynı sim anında miktar (oran yöntem değişince doğal olarak değişir)
    const hazineOnce = hazine();
    // Başarı
    const r = await a.yontemDegistir({ bolge: t.bolge!, tesis: tesisId, yontem: "ekmek_firini" });
    expect(r).toMatchObject({ tamam: true });
    expect(sunucuTesisleri()).toEqual([{ id: tesisId, yontem: "ekmek_firini" }]);
    await bekle(() => a.isletme()!.yapilar.find((x) => x.anahtar === t.anahtar)?.yontem === "ekmek_firini");
    expect(JSON.stringify(ts!.yazar.sim.dunya.bolgeler.find((b) => b.sahip === "ali" && b.merkez !== undefined)!.stoklar.map((s) => s.miktar))).toBe(stokOnce); // stok aynı (komut anında)
    expect(hazine()).toBe(hazineOnce); // ücret yok: hazine formülü aynı (komut hazineye dokunmaz)
    // Retler (A1 yontem.ret.*): Türkçe
    expect(await a.yontemDegistir({ bolge: t.bolge!, tesis: tesisId, yontem: "yok_boyle" })).toMatchObject({ tamam: false, mesaj: "Bu yöntem bulunamadı." });
    expect(await a.yontemDegistir({ bolge: t.bolge!, tesis: tesisId, yontem: "kepek_gubresi" })).toMatchObject({ tamam: false, mesaj: "Bu yapıda bu yöntem kullanılamaz." });
    expect(await a.yontemDegistir({ bolge: t.bolge!, tesis: 999_999, yontem: "degirmen" })).toMatchObject({ tamam: false, mesaj: "Bu yapı artık yok." });
    expect(await a.yontemDegistir({ bolge: "sn_m_ova#baskasi", tesis: tesisId, yontem: "degirmen" })).toMatchObject({ tamam: false, mesaj: "Bu yapı senin değil." });
    expect(sunucuTesisleri()).toEqual([{ id: tesisId, yontem: "ekmek_firini" }]); // retler durumu değiştirmedi
  }, 90_000);
});

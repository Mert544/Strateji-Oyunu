/**
 * Kamu arsası: (1) ilçe karesinde yayın (`kamuAdet` her zaman, `kamu` grupları yalnız `abone {kamu: true}`; deltada tekrarlanmaz);
 * (2) kamu hücresine `parsel_al` reddi çekirdekten gelir ve ileti istemciye aynen iletilir; (3) kamu öncesi kurulmuş dünyada
 * (parametrede var, dünyada yok) açılışta açık uyarı ve kurtarma raporu.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon, kamuHucreleri } from "@bolge/cekirdek";
import type { IlgiKaresi } from "@bolge/protokol";
import { blokHucreleri, kamuBilgisiBul } from "@bolge/protokol";
import { bellekDeposu } from "../src/depo/bellek";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { bitisikSatilabilir, kamuKumesi, kareBekle, katil, mulkVerisi, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

const ILCE = "sn_m_ova_merkez";
const ilce = (k: IlgiKaresi | null) => k?.ilceler?.find((c) => c.id === ILCE);

describe("kamu yayini ve ret", () => {
  it("kamuAdet her zaman; kamu gruplari yalniz istenince; cekirdek API'siyle ayni; delta tekrarlamaz; parsel_al reddi iletilir", async () => {
    ts = await testSunucusu({ veri: mulkVerisi() });
    const sim = ts.yazar.sim;
    const grup = kamuHucreleri(sim.dunya, ILCE);
    const toplam = grup.reduce((n, g) => n + g.hucreler.length, 0);
    expect(toplam).toBeGreaterThan(0);
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", []);
    await katil(y, "veli", []);
    const a = await ts.baglan("ali");
    const b = await ts.baglan("veli");
    await a.abone([]);
    await b.abone([]);
    a.gonder({ tur: "abone", ilceler: [ILCE], kamu: true });
    b.gonder({ tur: "abone", ilceler: [ILCE] });
    await kareBekle(a, () => ilce(a.kare) !== undefined);
    await kareBekle(b, () => ilce(b.kare) !== undefined);
    // İstemeyen yalnız sayıyı alır.
    expect(ilce(b.kare)?.kamuAdet).toBe(toplam);
    expect(ilce(b.kare)?.kamu).toBeUndefined();
    // İsteyen grupları dikdörtgen blokla alır: çekirdeğin API'sindeki küme.
    const k = ilce(a.kare);
    expect(k?.kamuAdet).toBe(toplam);
    expect(k?.kamu?.map((g) => [g.sahip, g.tur])).toEqual(grup.map((g) => [g.sahip, g.tur]));
    for (const [i, g] of grup.entries()) expect([...blokHucreleri(k?.kamu?.[i]?.blok ?? [])].sort()).toEqual([...g.hucreler].sort());
    // Hücre kartı: istemci kamuBilgisiBul ile tür ve sahibi öğrenir.
    const ornek = grup[0]?.hucreler[0] as string;
    expect(kamuBilgisiBul(k?.kamu, ornek)).toEqual({ tur: grup[0]?.tur, sahip: grup[0]?.sahip });

    // Kamu hücresine parsel_al: çekirdeğin reddi AYNEN iletilir (başarısız komut günlükte, durum değişmez).
    await y.zamanIlerlet(SAAT);
    const kamuHucre = kamuKumesi(sim, ILCE).values().next().value as string;
    const r = await a.komut("kamu-al", { tur: "parsel_al", ilce: ILCE, hucreler: [kamuHucre], sinif: "kirsal" });
    expect(r.tur).toBe("komutSonucu");
    if (r.tur === "komutSonucu") {
      expect(r.sonuc.tamam).toBe(false);
      const referans = Simulasyon.olustur(mulkVerisi(), 1);
      referans.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] } });
      const beklenen = referans.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [kamuHucre], sinif: "kirsal" } });
      expect(beklenen.tamam).toBe(false);
      expect(r.sonuc.tamam === false && r.sonuc.hata).toBe(beklenen.tamam === false ? beklenen.hata : "");
      expect(r.sonuc.tamam === false && r.sonuc.hata).toMatch(/kamu/);
    }
    // Satılabilir hücre alınır: delta kamu'yu tekrarlamaz, istemcide korunur (deltaUygula).
    const [h1] = bitisikSatilabilir(sim, ILCE);
    const r2 = await a.komut("al-1", { tur: "parsel_al", ilce: ILCE, hucreler: [h1], sinif: "kirsal" });
    expect(r2.tur === "komutSonucu" && r2.sonuc.tamam).toBe(true);
    await kareBekle(a, () => (ilce(a.kare)?.satilmisHucre ?? 0) >= 1);
    const delta = a.gelenler.filter((m) => m.tur === "delta").at(-1);
    expect(delta?.tur === "delta" && delta.delta.ilceler?.[0]?.kamu).toBeUndefined();
    expect(ilce(a.kare)?.kamu).toEqual(k?.kamu);
    expect(a.sorunlar).toEqual([]);
    expect(b.sorunlar).toEqual([]);
  });
});

describe("kamu oncesi kurulmus dunya: acilis uyarisi", () => {
  /** `mulk.kamu` parametresi olmadan (kural kapali) mulk dunyasi kurar ve kapatir. */
  async function kamusuzDunya(): Promise<ReturnType<typeof bellekDeposu>> {
    const depo = bellekDeposu();
    const v = mulkVerisi();
    delete v.param.mulk?.kamu;
    const y = await DunyaYazari.ac({ veri: v, tohum: 1, depo, saat: new ElleSaat(), commitAraligiMs: 15 });
    expect(y.kurtarma.kamuKapali).toBe(false); // parametre de yok: kural kapalı, uyarı yok
    expect(y.kurtarma.uyarilar).toEqual([]);
    await y.kapat();
    return depo;
  }

  it("parametrede kamu var ama dunyada yok: kurtarma raporu ve uyari dinleyicisi acik uyari verir", async () => {
    const depo = await kamusuzDunya();
    // Parametre sonradan eklendi: kural sürümü değişir, dönem sınırında göç gerekir.
    const y = await DunyaYazari.ac({ veri: mulkVerisi(), tohum: 1, depo, saat: new ElleSaat(), commitAraligiMs: 15, gocIzni: true });
    expect(y.kurtarma.goc).not.toBeNull();
    expect(y.kurtarma.kamuKapali).toBe(true);
    expect(y.kurtarma.uyarilar).toHaveLength(1);
    expect(y.kurtarma.uyarilar[0]).toMatch(/bu dunyada kamu arsasi kurali kapali.*ilk gercek satistan once yeni dunya baslatin/);
    // Dinleyici sonradan bağlanınca (CLI böyle) açılış uyarısı teslim edilir; ikinci kez gelmez.
    const gelen: string[] = [];
    y.uyari((m) => gelen.push(m));
    expect(gelen).toEqual(y.kurtarma.uyarilar);
    y.uyari((m) => gelen.push(m));
    expect(gelen).toHaveLength(1);
    await y.kapat();
  });

  it("kamu acik dunyada uyari yok", async () => {
    const y = await DunyaYazari.ac({ veri: mulkVerisi(), tohum: 1, depo: bellekDeposu(), saat: new ElleSaat(), commitAraligiMs: 15 });
    expect(y.kurtarma.kamuKapali).toBe(false);
    expect(y.kurtarma.uyarilar).toEqual([]);
    const gelen: string[] = [];
    y.uyari((m) => gelen.push(m));
    expect(gelen).toEqual([]);
    await y.kapat();
  });
});

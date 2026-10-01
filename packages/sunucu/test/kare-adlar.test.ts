/**
 * Görünen ad kare yolunda (gerçek WebSocket): `adCozucu` (hesap deposu önbelleği) verilince karelere `adlar` eklenir; ilçede başkasının hücresi olan oyuncunun adı
 * görünür, adı olmayan girdisizdir; ad değişince DELTA yalnız değişen girdiyi taşır; çekirdek durumu ve durumOzeti ADLARDAN BAĞIMSIZDIR (iki sunucu, aynı komutlar,
 * biri adlı biri adsız: aynı özet); adCozucu yoksa kare alanı hiç yazılmaz.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { IlgiKaresi } from "@bolge/protokol";
import { IlgiKaresiSemasi } from "@bolge/protokol";
import { AD_KURALI, adKanonik } from "@bolge/cekirdek";
import { SunucuIstemcisi } from "../src/istemci";
import { girisOrtami } from "./giris-yardimci";
import { bitisikSatilabilir, kareBekle, katil, mulkVerisi, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

const ILCE = "sn_m_ova_merkez";
const sunucular: TestSunucusu[] = [];
afterEach(async () => {
  for (const s of sunucular.splice(0)) await s.kapat();
});

async function kur(adlar?: Map<string, string>): Promise<{ ts: TestSunucusu; ali: Awaited<ReturnType<TestSunucusu["baglan"]>>; veli: Awaited<ReturnType<TestSunucusu["baglan"]>>; h: [string, string] }> {
  const ts = await testSunucusu({ veri: mulkVerisi(), ...(adlar ? { sunucu: { adCozucu: (o: string) => adlar.get(o) } } : {}) });
  sunucular.push(ts);
  const h = bitisikSatilabilir(ts.yazar.sim, ILCE);
  const y = await ts.baglan(SISTEM_OYUNCUSU);
  await katil(y, "ali", []);
  await katil(y, "veli", []);
  await katil(y, "yeni", []);
  const ali = await ts.baglan("ali");
  const veli = await ts.baglan("veli");
  await y.zamanIlerlet(SAAT);
  const r = await ali.komut("p1", { tur: "parsel_al", ilce: ILCE, hucreler: h, sinif: "kirsal" });
  expect(r.tur === "komutSonucu" && r.sonuc.tamam).toBe(true);
  return { ts, ali, veli, h };
}
const adlariOku = (k: IlgiKaresi | null): unknown => k?.adlar;

describe("kare.adlar (WebSocket)", () => {
  it("ilçedeki hücre sahibinin ve isteyenin adı gelir, adı olmayan girdisiz; ad değişince DELTA yalnız değişeni taşır; şema geçerli", async () => {
    const adlar = new Map([["ali", "çalışkan değirmenci 427"], ["veli", "sakin balıkçı 100"]]);
    const { ali, veli } = await kur(adlar);
    await veli.abone([]);
    veli.gonder({ tur: "abone", ilceler: [ILCE] });
    await kareBekle(veli, () => veli.kare?.ilceler?.length === 1 && veli.kare.adlar !== undefined);
    expect(adlariOku(veli.kare)).toEqual({ ali: adlar.get("ali"), veli: adlar.get("veli") }); // hücre sahibi ali + isteyen veli
    expect(IlgiKaresiSemasi.parse(veli.kare)).toEqual(veli.kare);
    // Başka ilgi: ali yalnız kendi ilçesini görür; veli'nin adı olsa da ilçede hücresi yok ve istemiyor → yalnız ali.
    await ali.abone([]);
    await kareBekle(ali, () => ali.kare?.adlar !== undefined);
    expect(adlariOku(ali.kare)).toEqual({ ali: adlar.get("ali") });
    // Ad değişir (hesap deposu önbelleği güncellenir): sonraki kare/delta yalnız değişen girdiyi taşır.
    adlar.set("ali", "yeni degisen ad 1");
    const oncekiDelta = veli.gelenler.length;
    const r = await veli.komut("v1", { tur: "vergi_ayarla", oranPpm: 70_000 }); // kare yayınını tetikler
    expect(r.tur).toBe("komutSonucu");
    await kareBekle(veli, () => veli.kare?.adlar?.ali === "yeni degisen ad 1");
    const yeniler = veli.gelenler.slice(oncekiDelta).filter((m) => m.tur === "delta");
    const adliDelta = yeniler.find((m) => m.tur === "delta" && m.delta.adlar !== undefined);
    expect(adliDelta && adliDelta.tur === "delta" ? adliDelta.delta.adlar : null).toEqual({ ali: "yeni degisen ad 1" }); // yalnız değişen
    expect(adlariOku(veli.kare)).toEqual({ ali: "yeni degisen ad 1", veli: adlar.get("veli") });
    expect(veli.sorunlar).toEqual([]); // delta zinciri sağlam
  });

  it("adCozucu yoksa kare ve delta'da `adlar` HİÇ yazılmaz (özellik kapalı); adlar çekirdek durumunu ve durumOzeti'ni etkilemez", async () => {
    const adlar = new Map([["ali", "çalışkan değirmenci 427"], ["veli", "sakin balıkçı 100"]]);
    const a = await kur(adlar);
    const b = await kur(undefined);
    for (const s of [a, b]) {
      await s.veli.abone([]);
      s.veli.gonder({ tur: "abone", ilceler: [ILCE] });
      await kareBekle(s.veli, () => s.veli.kare?.ilceler?.length === 1);
    }
    expect(a.veli.kare?.adlar).toBeDefined();
    expect(b.veli.kare?.adlar).toBeUndefined();
    expect(JSON.stringify(b.veli.gelenler)).not.toContain("adlar");
    // Aynı komutlar iki dünyada: aynı simülasyon durumu (ad çekirdeğe girmez).
    expect(a.ts.yazar.sim.durumOzeti()).toBe(b.ts.yazar.sim.durumOzeti());
    // Adlı karenin ad DIŞINDAki alanları adsız kareyle aynı (ad bağımsız).
    const { adlar: _x, ...adliGeri } = a.veli.kare as IlgiKaresi;
    const { t: _ta, ...adliTsiz } = adliGeri;
    const { t: _tb, ...adsizTsiz } = b.veli.kare as IlgiKaresi;
    expect(adliTsiz.ilceler).toEqual(adsizTsiz.ilceler);
    expect(adliTsiz.bolgeler).toEqual(adsizTsiz.bolgeler);
  });
});

describe("uçtan uca: e-posta girişi -> ad seçimi -> ws -> başkasının karesinde ad", () => {
  it("iki oyuncu e-postayla girer, ad seçer (büyük harf küçülür), ws'e bilet ile bağlanır; ilçede hücre alan ali'nin ADI veli'nin karesinde görünür; ad değişince delta yalnız onu taşır", async () => {
    const o = await girisOrtami({ hizmet: { adKurali: adKanonik, sinirlar: { ipBasina: { kapasite: 1000, saniyeBasina: 1000 }, genel: { kapasite: 1000, saniyeBasina: 1000 } } } });
    try {
      const ta = o.yeniTarayici();
      const tv = o.yeniTarayici();
      const ia = await o.girisYap(ta, "ali.k@ornek.org");
      const iv = await o.girisYap(tv, "veli.k@ornek.org");
      expect((await ta.post("/giris/ad", { ad: "ÇALIŞKAN Değirmenci" })).json).toEqual({ tamam: true, ad: "çalışkan değirmenci", adSecildi: true });
      const biletA = (await ta.post("/giris/bilet")).json?.bilet as string;
      const biletV = (await tv.post("/giris/bilet")).json?.bilet as string;
      const ali = await SunucuIstemcisi.baglan(o.ts.url, biletA, "e2e-a");
      const veli = await SunucuIstemcisi.baglan(o.ts.url, biletV, "e2e-v");
      o.ts.istemciler.push(ali, veli);
      // Oyuncular kendi katılımını yapar (ilçeli); ali ilçede hücre alır.
      expect((await ali.katil("ka", ILCE)).tur).toBe("komutSonucu");
      expect((await veli.katil("kv", ILCE)).tur).toBe("komutSonucu");
      const h = bitisikSatilabilir(o.ts.yazar.sim, ILCE);
      o.ts.saat.ilerlet(SAAT); // elle saat: ilk saat geçsin (geliştirme token'ı e-posta kimliğinde yok; saat doğrudan ilerletilir)
      await o.ts.yazar.birTur();
      const r = await ali.komut("p1", { tur: "parsel_al", ilce: ILCE, hucreler: h, sinif: "kirsal" });
      expect(r.tur === "komutSonucu" && r.sonuc.tamam, JSON.stringify(r)).toBe(true);
      await veli.abone([]);
      veli.gonder({ tur: "abone", ilceler: [ILCE] });
      await kareBekle(veli, () => veli.kare?.adlar?.[ia.oyuncu] !== undefined);
      expect(veli.kare?.adlar?.[ia.oyuncu]).toBe("çalışkan değirmenci"); // seçilen, kanonik (küçük harfli) ad
      expect(veli.kare?.adlar?.[iv.oyuncu]).toMatch(/^[a-zçğıöşü]+ [a-zçğıöşü]+ [1-9]\d{2}$/); // isteyenin kendi (otomatik) adı
      expect(Object.keys(veli.kare?.adlar ?? {}).sort()).toEqual([ia.oyuncu, iv.oyuncu].sort());
      expect(JSON.stringify(veli.gelenler)).not.toContain("ornek.org"); // e-posta hiçbir yerde yok
      // Ad değişimi (günlük sınır: ilk seçim sayılmaz, bu günün ilk değişikliği serbest): veli'nin karesine delta ile gider.
      expect((await ta.post("/giris/ad", { ad: "yeni usta" })).json).toMatchObject({ ad: "yeni usta" });
      const onceki = veli.gelenler.length;
      await veli.komut("v1", { tur: "vergi_ayarla", oranPpm: 60_000 });
      await kareBekle(veli, () => veli.kare?.adlar?.[ia.oyuncu] === "yeni usta");
      const delta = veli.gelenler.slice(onceki).find((m) => m.tur === "delta" && m.delta.adlar !== undefined);
      expect(delta && delta.tur === "delta" ? delta.delta.adlar : null).toEqual({ [ia.oyuncu]: "yeni usta" });
      expect(AD_KURALI.max).toBe(24);
    } finally {
      await o.kapat();
    }
  }, 60_000);
});

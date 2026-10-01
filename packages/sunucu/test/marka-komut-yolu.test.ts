/**
 * G7 marka komutlarının sunucu komut yolu (ws -> komutAl -> günlük): (1) `marka_sifirla` YALNIZ yönetici (oyuncu kimliğiyle günlüğe hiç girmez); (2) `marka_tanimla.ad`
 * günlüğe yazılmadan ÖNCE çekirdek `adKanonik` (sözdizimi + küçük harf) ve yasaklı ad süzgecinden geçer: günlüğe KANONİK ad girer, ret `ad_gecersiz` / `ad_yasakli`
 * (kodlar `/giris/ad` ile aynı), reddedilen komut günlüğe girmez. Perakende yolu G7-3'te etkindir; burada komutun kabulü/reddi ve günlük içeriği sınanır.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU, adKanonik } from "@bolge/cekirdek";
import type { GirisHataKodu, HataKodu } from "@bolge/protokol";
import { YasakliAdSuzgeci } from "../src/ad-suzgec";
import type { SunucuIstemcisi } from "../src/istemci";
import { katil, mulkVerisi, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

async function kur(suzgec: boolean): Promise<{ ts: TestSunucusu; yonetici: SunucuIstemcisi; ali: SunucuIstemcisi }> {
  ts = await testSunucusu({ veri: mulkVerisi(), ...(suzgec ? { sunucu: { adSuzgeci: new YasakliAdSuzgeci(["bim"], ["migros"]) } } : {}) });
  const yonetici = await ts.baglan(SISTEM_OYUNCUSU);
  await katil(yonetici, "ali", []);
  const ali = await ts.baglan("ali");
  return { ts, yonetici, ali };
}

const marka = (ad: string) => ({ tur: "marka_tanimla" as const, marka: 0, ad, simge: 0, renk: 0 });
const gunlukSayisi = async (s: TestSunucusu): Promise<number> => (await s.depo.gunluk.oku(0)).length;

describe("marka_sifirla: yalniz yonetici", () => {
  it("oyuncu kimligiyle yetki hatasi ve GUNLUGE GIRMEZ; yonetici kimligiyle komut yazara ulasir (gunlukte)", async () => {
    const { ts: s, yonetici, ali } = await kur(true);
    const once = await gunlukSayisi(s);
    const r = await ali.komut("s1", { tur: "marka_sifirla", oyuncu: "ali", marka: 0 });
    expect(r.tur).toBe("hata");
    expect(r.tur === "hata" && r.kod).toBe("yetki");
    expect(r.tur === "hata" && r.anahtar).toBe("s1");
    expect(await gunlukSayisi(s)).toBe(once);
    const y = await yonetici.komut("s2", { tur: "marka_sifirla", oyuncu: "ali", marka: 0 });
    expect(y.tur).toBe("komutSonucu"); // etkin yol G7-3'te (sonuc cekirdekte); komut kabul edilip gunluge yazildi
    const kayit = (await s.depo.gunluk.oku(0)).find((g) => g.anahtar === "s2");
    expect(kayit?.oyuncu).toBe(SISTEM_OYUNCUSU);
    expect(kayit?.komut).toEqual({ tur: "marka_sifirla", oyuncu: "ali", marka: 0 });
  });
});

describe("marka_tanimla.ad: gunluge yazilmadan once suzulur", () => {
  it("gecerli ad: GUNLUGE KANONIK (kucuk harf) AD girer (istemcinin buyuk harfli adi degil); cekirdek sonucu doner", async () => {
    const { ts: s, ali } = await kur(true);
    const ad = "ALİ'NİN DÜKKANI";
    const kanonik = adKanonik(ad);
    expect(kanonik).toEqual({ tamam: true, ad: "ali'nin dükkanı" });
    const r = await ali.komut("m1", marka(ad));
    expect(r.tur).toBe("komutSonucu");
    const kayit = (await s.depo.gunluk.oku(0)).find((g) => g.anahtar === "m1");
    expect(kayit?.komut).toEqual({ tur: "marka_tanimla", marka: 0, ad: "ali'nin dükkanı", simge: 0, renk: 0 });
    expect(r.tur === "komutSonucu" && r.komut).toEqual(kayit?.komut); // yanitta da kanonik komut
    // Zaten kanonik ad degismez.
    await ali.komut("m2", marka("ali'nin dükkanı"));
    expect((await s.depo.gunluk.oku(0)).find((g) => g.anahtar === "m2")?.komut).toMatchObject({ ad: "ali'nin dükkanı" });
  });

  it("yasakli ad: ad_yasakli, GUNLUGE GIRMEZ; kelime esitligi (bim), ayiricili gizleme (B.I.M), alt dizgi (migros) yakalanir; bimbo ve sokak gibi parca eslesmeleri gecer", async () => {
    const { ts: s, ali } = await kur(true);
    const once = await gunlukSayisi(s);
    for (const [i, yasak] of ["BİM", "b.i.m", "Migros Şubesi", "SUPER-MIGROS", "bim market"].entries()) {
      const r = await ali.komut(`y${i}`, marka(yasak));
      expect(r.tur === "hata" && r.kod, yasak).toBe("ad_yasakli");
      expect(r.tur === "hata" && r.anahtar).toBe(`y${i}`);
    }
    expect(await gunlukSayisi(s)).toBe(once);
    expect((await ali.komut("g1", marka("Bimbo Unlu Mamuller"))).tur).toBe("komutSonucu"); // yalniz kelime esitligi: "bimbo" yasakli degil
    expect((await ali.komut("g2", marka("Sokak Firini"))).tur).toBe("komutSonucu");
  });

  it("gecersiz ad: ad_gecersiz (cekirdek sozdizimi iletisiyle), GUNLUGE GIRMEZ; karakter, art arda bosluk, harfsiz, bas/son bosluk", async () => {
    const { ts: s, ali } = await kur(true);
    const once = await gunlukSayisi(s);
    const durumlar: Array<[string, RegExp]> = [
      ["ab<", /gecersiz karakter/],
      ["ali  dukkan", /art arda bosluk/],
      ["12", /en az bir harf/],
      [" ali", /bosluk/],
    ];
    for (const [i, [ad, ileti]] of durumlar.entries()) {
      const r = await ali.komut(`b${i}`, marka(ad));
      expect(r.tur === "hata" && r.kod, ad).toBe("ad_gecersiz");
      expect(r.tur === "hata" && r.mesaj, ad).toMatch(ileti);
    }
    expect(await gunlukSayisi(s)).toBe(once);
    // Uzunluk siniri (2..24) protokol zod'unda da var: 25 karakter komut zarfi olarak bile gecersiz_mesaj (komut yazara ulasmaz).
    const b = ali.bekle((m) => m.tur === "hata");
    ali.gonder({ tur: "komut", anahtar: "u1", komut: marka("a".repeat(25)) });
    const h = await b;
    expect(h.tur === "hata" && h.kod).toBe("gecersiz_mesaj");
    expect(await gunlukSayisi(s)).toBe(once);
  });

  it("suzgec verilmemisse (gelistirme, bos liste) yasakli adlar gecer ama sozdizimi ve kanonik cevirisi yine uygulanir", async () => {
    const { ts: s, ali } = await kur(false);
    expect((await ali.komut("n1", marka("MİGROS"))).tur).toBe("komutSonucu");
    expect((await s.depo.gunluk.oku(0)).find((g) => g.anahtar === "n1")?.komut).toMatchObject({ ad: "migros" });
    const r = await ali.komut("n2", marka("a!"));
    expect(r.tur === "hata" && r.kod).toBe("ad_gecersiz");
  });

  it("ret kodlari /giris/ad ile AYNI dizgelerdir (ortak ad kurali)", () => {
    const ortak: Array<GirisHataKodu & HataKodu> = ["ad_gecersiz", "ad_yasakli"];
    expect(ortak).toEqual(["ad_gecersiz", "ad_yasakli"]);
  });
});

/**
 * Hesap deposu: bellek ve dosya depoları aynı sözleşmeden geçer (pg: test/pg.test.ts, yalnız BOLGE_PG_URL ile). Dosyaya özgü:
 * kalıcılık, tüketilen bağlantının çökmeyle yeniden canlanmaması, yarım son satır, bozuk orta satır, sıkıştırma, açık belirteç yazılmaması.
 */
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BellekHesapDeposu } from "../src/depo/bellek";
import { dosyaDeposu, DosyaHesapDeposu } from "../src/depo/dosya";
import type { BaglantiKaydi, HesapKaydi, OturumKaydi } from "../src/depo/tipler";
import { hesapSozlesmesi } from "./hesap-sozlesmesi";

const dizinler: string[] = [];
afterEach(async () => {
  for (const d of dizinler.splice(0)) await rm(d, { recursive: true, force: true });
});
async function geciciDizin(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "bolge-hesap-"));
  dizinler.push(d);
  return d;
}

const hesap: HesapKaydi = { id: "h1", eposta: "ali@ornek.org", anahtar: "ali@ornek.org", oyuncu: "o_aaaaaaaa", olusturma: 1 };
const baglanti = (ozet: string, bitis = 10_000): BaglantiKaydi => ({ ozet, eposta: "ali@ornek.org", anahtar: "ali@ornek.org", bitis, tarayiciOzeti: null, olusturma: 1 });
const oturum = (id: string): OturumKaydi => ({ id, hesap: "h1", gizliOzet: "gizli-ozet", olusturma: 1, sonKullanim: 1, bitis: 50_000, mutlakBitis: 90_000 });

describe("hesap deposu sozlesmesi", () => {
  it("bellek", async () => {
    await hesapSozlesmesi(new BellekHesapDeposu(), "bel");
  });

  it("dosya", async () => {
    const d = await geciciDizin();
    const depo = await dosyaDeposu(d);
    try {
      await hesapSozlesmesi(depo.hesap as NonNullable<typeof depo.hesap>, "dos");
    } finally {
      await depo.gunluk.kapat();
    }
  });
});

describe("dosya hesap deposu", () => {
  it("yeniden acilista kalici: hesap, oturum ve bekleyen baglanti; TUKETILEN baglanti yeniden canlanmaz", async () => {
    const d = await geciciDizin();
    const a = await DosyaHesapDeposu.ac(d);
    await a.hesapOlustur(hesap);
    await a.baglantiEkle(baglanti("tuketilecek"));
    await a.baglantiEkle({ ...baglanti("bekleyen"), anahtar: "veli@ornek.org", eposta: "veli@ornek.org" });
    expect((await a.baglantiTuket("tuketilecek", 5_000, null)).durum).toBe("tamam");
    await a.oturumEkle(oturum("ot1"));
    await a.oturumUzat("ot1", 7_000, 60_000);
    await a.kapat();

    const b = await DosyaHesapDeposu.ac(d);
    expect(await b.hesapBulAnahtar(hesap.anahtar)).toEqual(hesap);
    expect(await b.oturumBul("ot1")).toEqual({ ...oturum("ot1"), sonKullanim: 7_000, bitis: 60_000 });
    expect(await b.baglantiTuket("tuketilecek", 5_000, null)).toEqual({ durum: "yok" }); // yeniden kullanılamaz
    expect((await b.baglantiTuket("bekleyen", 5_000, null)).durum).toBe("tamam");
    expect(await b.sayilar()).toEqual({ hesap: 1, oturum: 1, baglanti: 0 });
    await b.kapat();
  });

  it("gorunen ad (ad, adSecildi, adDegisimT) yeniden acilista ve sikistirmada kalir; adsiz eski hesap adsiz kalir", async () => {
    const d = await geciciDizin();
    const a = await DosyaHesapDeposu.ac(d);
    await a.hesapOlustur({ ...hesap, ad: "sakin balıkçı 321" });
    await a.hesapOlustur({ id: "h2", eposta: "veli@ornek.org", anahtar: "veli@ornek.org", oyuncu: "o_bbbbbbbb", olusturma: 2 }); // eski: adsız
    expect(await a.adYaz("h1", "cesur terzi 100", true, 77_000)).toBe(true);
    await a.kapat();
    const b = await DosyaHesapDeposu.ac(d);
    expect(await b.hesapBulId("h1")).toEqual({ ...hesap, ad: "cesur terzi 100", adSecildi: true, adDegisimT: 77_000 });
    expect((await b.hesapBulId("h2"))?.ad).toBeUndefined();
    expect(await b.adVarMi("sakin balıkçı 321")).toBe(false); // eski ad serbest
    expect(await b.adVarMi("cesur terzi 100")).toBe(true);
    // Çok işlem: sıkıştırma durumu (h+ satırı güncel adı taşır) korur.
    for (let i = 0; i < 400; i++) await b.adYaz("h1", `ad ${i % 10}`, i % 2 === 0, i % 3 === 0 ? i : null);
    await b.adYaz("h1", "son ad", true, 5);
    await b.kapat();
    const c = await DosyaHesapDeposu.ac(d);
    expect(await c.hesapBulId("h1")).toEqual({ ...hesap, ad: "son ad", adSecildi: true, adDegisimT: 5 });
    expect((await c.adlariListele()).sort((x, y) => (x.hesap < y.hesap ? -1 : 1))).toEqual([
      { hesap: "h1", oyuncu: hesap.oyuncu, ad: "son ad" },
      { hesap: "h2", oyuncu: "o_bbbbbbbb", ad: null },
    ]);
    await c.kapat();
  });

  it("cokmeden kalan yarim son satir atilir; ortadaki bozuk satir acilisi durdurur", async () => {
    const d = await geciciDizin();
    const a = await DosyaHesapDeposu.ac(d);
    await a.hesapOlustur(hesap);
    await a.oturumEkle(oturum("ot1"));
    await a.kapat();
    const yol = join(d, "hesap.jsonl");
    await appendFile(yol, '{"o":"o+","k":{"id":"yarim"'); // satir sonu yok: yarim
    const b = await DosyaHesapDeposu.ac(d);
    expect(await b.oturumBul("yarim")).toBeNull();
    expect((await b.sayilar()).oturum).toBe(1);
    await b.oturumEkle(oturum("ot2")); // sonraki ekleme temiz satira yazilir
    await b.kapat();
    const c = await DosyaHesapDeposu.ac(d);
    expect((await c.sayilar()).oturum).toBe(2);
    await c.kapat();

    const metin = await readFile(yol, "utf8");
    const satirlar = metin.split("\n");
    satirlar.splice(1, 0, "{bozuk");
    await writeFile(yol, satirlar.join("\n"));
    await expect(DosyaHesapDeposu.ac(d)).rejects.toThrow(/bozuk JSON/);
  });

  it("cok islemden sonra sikistirilir ve durum ayni kalir", async () => {
    const d = await geciciDizin();
    const a = await DosyaHesapDeposu.ac(d);
    await a.hesapOlustur(hesap);
    // Aynı adrese defalarca bağlantı: her ekleme eskisini düşürür (satır çok, canlı durum az).
    for (let i = 0; i < 400; i++) {
      await a.baglantiEkle(baglanti(`ozet-${i}`));
      if (i % 2 === 0) await a.oturumEkle(oturum(`ot-${i}`));
      if (i % 2 === 0) await a.oturumSil(`ot-${i}`);
    }
    await a.oturumEkle(oturum("kalan"));
    await a.kapat();
    const b = await DosyaHesapDeposu.ac(d); // açılışta sıkıştırma eşiği aşıldıysa yeniden yazılır
    expect(await b.sayilar()).toEqual({ hesap: 1, oturum: 1, baglanti: 1 });
    expect((await b.baglantiTuket("ozet-399", 5_000, null)).durum).toBe("tamam");
    await b.kapat();
    const satirSayisi = (await readFile(join(d, "hesap.jsonl"), "utf8")).trim().split("\n").length;
    expect(satirSayisi).toBeLessThan(1000);
    const c = await DosyaHesapDeposu.ac(d);
    expect(await c.sayilar()).toEqual({ hesap: 1, oturum: 1, baglanti: 0 });
    await c.kapat();
  });
});

/**
 * Görünen ad (İ-1): otomatik ad (opak, e-postadan/kimlikten türetilmez, çakışmada yeniden), `POST /giris/ad` (Origin/CSRF, oturum, kural, süzgeç, küçük harf),
 * günde (00:00 TRT) en çok bir değişiklik (enjekte saat; 23:59 -> 00:01 geçişi; ilk seçim sayılmaz), hız sınırı, eski hesabın doldurulması, hesap silinince ad gider,
 * özellik kapalıyken uç yok, protokol sınırları = AD_KURALI. Sözdizimi ve küçük harf çekirdek `adKanonik`'ten gelir (vaka tablosu: ad-vakalari.ts).
 */
import { afterEach, describe, expect, it } from "vitest";
import { AD_KURALI, adKanonik } from "@bolge/cekirdek";
import { GirisAdIstegiSemasi, GirisAdOneriYanitiSemasi, GirisBenYanitiSemasi, GirisOnayYanitiSemasi } from "@bolge/protokol";
import { YasakliAdSuzgeci } from "../src/ad-suzgec";
import { AdUretici, adKelimeleriniYukle } from "../src/giris/gorunen-ad";
import { GUN, girisOrtami } from "./giris-yardimci";
import type { GirisOrtami, Tarayici } from "./giris-yardimci";
import { AD_VAKALARI } from "./ad-vakalari";
import { turkiyeGeceYarisi } from "../src/saat";

let o: GirisOrtami | null = null;
afterEach(async () => {
  await o?.kapat();
  o = null;
});

const BOL = { kapasite: 100_000, saniyeBasina: 100_000 };
/** Çok hesap açan testler için gevşek giriş sınırları (IP başına istek/onay sınırı ve ad denemesi sınırı). */
const GEVSEK = { adHesapBasina: BOL, ipBasina: BOL, genel: BOL, onayIpBasina: BOL, epostaBasina: BOL };
const OTOMATIK = /^[a-zçğıöşü]+ [a-zçğıöşü]+ [1-9]\d{2}$/;

async function ortam(hizmet: Record<string, unknown> = {}): Promise<GirisOrtami> {
  o = await girisOrtami({ hizmet: { adKurali: adKanonik, ...hizmet } });
  return o;
}
async function giris(t: Tarayici, eposta: string): Promise<Record<string, unknown>> {
  const { jeton } = await (o as GirisOrtami).baglantiIste(t, eposta);
  const r = await t.post("/giris/onay", { j: jeton });
  expect(r.durum).toBe(200);
  return r.json as Record<string, unknown>;
}

describe("otomatik ad", () => {
  it("hesap açılırken küçük harfli opak ad: sıfat + isim + 3 rakam; onay yanıtı ve /giris/ben ad ve adSecildi:false taşır; e-postadan ve oyuncu kimliğinden türetilmez; protokol şeması geçerli", async () => {
    const e = await ortam();
    const t = e.yeniTarayici();
    const onay = await giris(t, "zzqxk@ornek.org");
    expect(GirisOnayYanitiSemasi.parse(onay)).toEqual(onay);
    expect(onay.ad).toMatch(OTOMATIK);
    expect(onay.adSecildi).toBe(false);
    const ad = onay.ad as string;
    expect(ad).not.toContain("zzqxk");
    expect(ad).not.toContain("ornek");
    expect(ad).not.toContain(String(onay.oyuncu).slice(2));
    expect(adKanonik(ad)).toEqual({ tamam: true, ad }); // kural ve kanonik biçim
    const ben = await t.istek("/giris/ben");
    expect(GirisBenYanitiSemasi.parse(ben.json)).toEqual(ben.json);
    expect(ben.json?.ad).toBe(ad);
    expect(ben.json?.adSecildi).toBe(false);
    // Aynı hesaba ikinci giriş aynı adı verir (yeniden üretilmez).
    expect((await giris(e.yeniTarayici(), "ZZQXK@ornek.org")).ad).toBe(ad);
    // Bellek önbelleği (kare yolu): oyuncu kimliğinden ad çözülür.
    expect(e.hizmet.adCoz(onay.oyuncu as string)).toBe(ad);
    expect(e.hizmet.adCoz("o_yok")).toBeUndefined();
    // Günlükte ad yok (yalnız olay adı ve maskelenmiş alan).
    expect(JSON.stringify(e.gunluk)).not.toContain(ad);
  });

  it("aynı adı taşıyan hesap varsa yeniden denenir (otomatik adlar çakışmaz); seçilen adlarda çakışma serbest", async () => {
    // Üretici: tek sıfat, tek isim; rakam sırası 100, 100, 101: ikinci hesap 100'ü almış bulur, 101'e geçer.
    const sira = [0, 0, 0, 0, 1];
    const rng = (n: number): number => (n === 1 ? 0 : (sira.shift() ?? 2));
    const uretici = new AdUretici({ sifatlar: ["sakın"], isimler: ["manav"] }, rng);
    const e = await ortam({ adUretici: uretici });
    const a = await giris(e.yeniTarayici(), "a1@ornek.org");
    const b = await giris(e.yeniTarayici(), "b1@ornek.org");
    expect(a.ad).toBe("sakın manav 100");
    expect(b.ad).toBe("sakın manav 101");
    expect(e.hizmet.sayaclar.al("ad.otomatik")).toBe(2);
    // Seçilen ad çakışabilir: iki oyuncu aynı adı seçer.
    const ta = e.yeniTarayici();
    const tb = e.yeniTarayici();
    await giris(ta, "a1@ornek.org");
    await giris(tb, "b1@ornek.org");
    expect((await ta.post("/giris/ad", { ad: "ortak ad" })).durum).toBe(200);
    expect((await tb.post("/giris/ad", { ad: "Ortak Ad" })).durum).toBe(200);
    expect(e.hizmet.adCoz(a.oyuncu as string)).toBe("ortak ad");
    expect(e.hizmet.adCoz(b.oyuncu as string)).toBe("ortak ad");
  });

  it("otomatik ad yasaklı ad süzgecinden geçer (yasaklı çıkan aday atlanır)", async () => {
    const sira = [0, 0, 0, 0, 1];
    const rng = (n: number): number => (n === 1 ? 0 : (sira.shift() ?? 2));
    const e = await ortam({ adUretici: new AdUretici({ sifatlar: ["sakın"], isimler: ["manav"] }, rng), adSuzgeci: new YasakliAdSuzgeci([], ["manav 100"]) });
    expect((await giris(e.yeniTarayici(), "s@ornek.org")).ad).toBe("sakın manav 101");
  });

  it("kelime listesi: her sıfat x isim x rakam birleşimi ad kuralından geçer, <= 24 karakter, kanonik (küçük harf) ve idempotent; bozuk liste açılışı durdurur", () => {
    const k = adKelimeleriniYukle(undefined, adKanonik);
    expect(k.sifatlar.length).toBeGreaterThanOrEqual(20);
    expect(k.isimler.length).toBeGreaterThanOrEqual(20);
    const uretici = new AdUretici(k);
    expect(uretici.havuz).toBeGreaterThan(400_000);
    for (const s of k.sifatlar) for (const i of k.isimler) {
      const aday = `${s} ${i} 999`;
      expect(aday.length, aday).toBeLessThanOrEqual(AD_KURALI.max);
      expect(adKanonik(aday), aday).toEqual({ tamam: true, ad: aday });
    }
    for (let i = 0; i < 200; i++) expect(uretici.uret()).toMatch(OTOMATIK);
    // Büyük harfli ya da uzun kelime: kuraldan geçmez, açılış durur.
    const bozuk = (sifat: string): AdUretici | never => new AdUretici(adKelimeleriniYukle(listeDosyasi({ sifatlar: [sifat], isimler: ["manav"] }), adKanonik));
    expect(() => bozuk("Büyük")).toThrow(/kanonik degil/);
    expect(() => bozuk("çok-çok-uzun-sıfat")).toThrow(/ad kuralindan gecmiyor/);
    expect(() => adKelimeleriniYukle(listeDosyasi({ sifatlar: [], isimler: ["x"] }))).toThrow(/gecersiz/);
  });
});

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
function listeDosyasi(icerik: unknown): string {
  const d = mkdtempSync(join(tmpdir(), "bolge-adlist-"));
  const yol = join(d, "kelimeler.json");
  writeFileSync(yol, JSON.stringify(icerik));
  return yol;
}

describe("POST /giris/ad", () => {
  it("oturum ve izinli Origin ister; kural çekirdekten (vaka tablosu), küçük harfe çevrilir, yanıt kanonik ad; /giris/ben adSecildi:true", async () => {
    const e = await ortam();
    const t = e.yeniTarayici();
    // Oturum yok: 401. Origin yok/yabancı: 403 (CSRF). Gövde yok: 400.
    expect((await e.yeniTarayici().post("/giris/ad", { ad: "ali" })).durum).toBe(401);
    await giris(t, "ad1@ornek.org");
    expect((await t.post("/giris/ad", { ad: "ali" }, { origin: null })).durum).toBe(403);
    expect((await t.post("/giris/ad", { ad: "ali" }, { origin: "https://kotu.example" })).durum).toBe(403);
    expect((await t.post("/giris/ad")).durum).toBe(400);
    expect((await t.post("/giris/ad", { baska: 1 })).durum).toBe(400);
    expect((await t.istek("/giris/ad", { yontem: "GET" })).durum).toBe(405);
    expect((await t.istek("/giris/ad", { yontem: "POST", ham: "ad=ali" })).durum).toBe(400); // JSON dışı gövde
    // Vaka tablosu: kabul edilenler küçük harfli kanonik ad döner; reddedilenler 422 ad_gecersiz ve "ad ..." iletisi.
    // (Hız sınırı: vakaların hepsi aynı hesapta denenir; kovayı aşmamak için sınır yükseltilmiş ortamda koşar: aşağıda.)
    expect(AD_VAKALARI.length).toBeGreaterThan(20);
  });

  it("vaka tablosu: kabul → kanonik küçük harfli ad; ret → 422 ad_gecersiz, ileti 'ad ...' (marka adi DEĞİL); aynı günde değişiklik sınırına takılmaması için her kabul ayrı hesapta", async () => {
    const e = await ortam({ sinirlar: GEVSEK });
    let n = 0;
    for (const v of AD_VAKALARI) {
      const t = e.yeniTarayici();
      await giris(t, `vaka${n++}@ornek.org`);
      const r = await t.post("/giris/ad", { ad: v.ad });
      if (v.kanonik !== undefined) {
        expect(r.durum, v.ad).toBe(200);
        expect(r.json).toEqual({ tamam: true, ad: v.kanonik, adSecildi: true });
        expect((await t.istek("/giris/ben")).json).toMatchObject({ ad: v.kanonik, adSecildi: true });
      } else {
        expect(r.durum, v.ad).toBe(422);
        expect(r.json?.kod).toBe("ad_gecersiz");
        expect(String(r.json?.mesaj)).toMatch(v.hata as RegExp);
        expect(String(r.json?.mesaj)).not.toMatch(/marka/);
        expect(String(r.json?.mesaj)).toMatch(/^ad /);
        const ben = await t.istek("/giris/ben");
        expect(ben.json?.adSecildi).toBe(false); // ret adı değiştirmedi
      }
    }
  });

  it("ad olmayan tür (sayı, dizi, nesne, null): 422 ad_gecersiz okunur ileti; gövdedeki fazladan alanlar yok sayılır", async () => {
    const e = await ortam({ sinirlar: GEVSEK });
    const t = e.yeniTarayici();
    await giris(t, "tur@ornek.org");
    for (const kotu of [5, ["ali"], { x: 1 }, null, true]) {
      const r = await t.post("/giris/ad", { ad: kotu });
      expect(r.durum, JSON.stringify(kotu)).toBe(422);
      expect(r.json?.kod).toBe("ad_gecersiz");
    }
    const r = await t.post("/giris/ad", { ad: "iyi ad", rol: "yonetici", oyuncu: "o_baska" });
    expect(r.durum).toBe(200);
    expect(r.json).toEqual({ tamam: true, ad: "iyi ad", adSecildi: true });
  });

  it("yasaklı ad: süzgeç kanonik ad üzerinde (katlama), 422 ad_yasakli GENEL ileti (listeyi sızdırmaz); ad değişmez", async () => {
    const e = await ortam({ adSuzgeci: new YasakliAdSuzgeci(["bim"], ["migros"]), sinirlar: GEVSEK });
    const t = e.yeniTarayici();
    const onay = await giris(t, "y@ornek.org");
    for (const ad of ["BİM", "B.İ.M", "Migros Şubesi", "SÜPERMIGROS"]) {
      const r = await t.post("/giris/ad", { ad });
      expect(r.durum, ad).toBe(422);
      expect(r.json).toMatchObject({ tamam: false, kod: "ad_yasakli", mesaj: "ad kullanilamaz" });
      expect(JSON.stringify(r.json)).not.toMatch(/bim|migros/i);
    }
    expect((await t.istek("/giris/ben")).json?.ad).toBe(onay.ad);
    expect((await t.post("/giris/ad", { ad: "bimbo" })).durum).toBe(200);
    expect(e.hizmet.sayaclar.al("ad.yasakli")).toBe(4);
  });

  it("hesap başına ad denemesi hız sınırlıdır (doğrulama reddi dahil): 10 deneme sonra 429 hiz_siniri", async () => {
    const e = await ortam();
    const t = e.yeniTarayici();
    await giris(t, "h@ornek.org");
    for (let i = 0; i < 10; i++) expect((await t.post("/giris/ad", { ad: "x" })).json?.kod).toBe("ad_gecersiz");
    const r = await t.post("/giris/ad", { ad: "gecerli ad" });
    expect(r.durum).toBe(429);
    expect(r.json?.kod).toBe("hiz_siniri");
    e.saat.ilerlet(2 * 60_000); // dakikada 1 jeton geri gelir
    expect((await t.post("/giris/ad", { ad: "gecerli ad" })).durum).toBe(200);
  });
});

describe("GET /giris/ad-oner", () => {
  it("oturumlu, yeni opak öneri döner ve KAYDETMEZ; öneri kuraldan/süzgeçten geçer, kimsede yoktur; hız sınırlı; oturumsuz 401; özellik kapalıysa 404", async () => {
    const e = await ortam({ adSuzgeci: new YasakliAdSuzgeci([], ["manav 1"]) });
    expect((await e.yeniTarayici().istek("/giris/ad-oner")).durum).toBe(401);
    const t = e.yeniTarayici();
    const onay = await giris(t, "oner@ornek.org");
    const oneriler = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const r = await t.istek("/giris/ad-oner");
      expect(r.durum).toBe(200);
      expect(GirisAdOneriYanitiSemasi.parse(r.json)).toEqual(r.json);
      const ad = r.json?.ad as string;
      expect(ad).toMatch(OTOMATIK);
      expect(adKanonik(ad)).toEqual({ tamam: true, ad });
      oneriler.add(ad);
    }
    expect(oneriler.size).toBeGreaterThan(5); // her çağrı yeni öneri
    // Kaydetmez: hesap adı değişmedi, öneriler depoda yok.
    expect((await t.istek("/giris/ben")).json?.ad).toBe(onay.ad);
    expect((await t.istek("/giris/ben")).json?.adSecildi).toBe(false);
    for (const ad of oneriler) if (ad !== onay.ad) expect(await e.hesapDeposu.adVarMi(ad)).toBe(false);
    // Hız sınırı: oturum başına dakikada 10 (ilk 10 yukarıda harcandı).
    const ret = await t.istek("/giris/ad-oner");
    expect(ret.durum).toBe(429);
    expect(ret.json).toMatchObject({ tamam: false, kod: "hiz_siniri" });
    e.saat.ilerlet(60_000);
    expect((await t.istek("/giris/ad-oner")).durum).toBe(200);
    // Yöntem: yalnız GET.
    expect((await t.post("/giris/ad-oner")).durum).toBe(405);
    expect(e.hizmet.sayaclar.al("ad.oner")).toBe(11);
  });

  it("özellik kapalıyken /giris/ad-oner 404", async () => {
    o = await girisOrtami();
    const t = o.yeniTarayici();
    await giris(t, "kapali2@ornek.org");
    expect((await t.istek("/giris/ad-oner")).durum).toBe(404);
  });
});

describe("günde en çok bir değişiklik (00:00 TRT, enjekte saat)", () => {
  /** Saati bugünün TRT 23:59'una kurar (gün sınırından 60 sn önce). */
  function gunSonu(e: GirisOrtami): number {
    const sinir = turkiyeGeceYarisi(e.saat.t) + GUN;
    e.saat.t = sinir - 60_000;
    return sinir;
  }

  it("ilk seçim sayılmaz; aynı gün bir değişiklik serbest, ikincisi 429 ad_sinir (beklemeSn gece yarısına kadar); 23:59 -> 00:01 geçişinde yeniden serbest", async () => {
    const e = await ortam({ sinirlar: GEVSEK });
    const sinir = gunSonu(e);
    const t = e.yeniTarayici();
    await giris(t, "gun@ornek.org");
    // 23:59: otomatik addan ilk seçim (sınıra sayılmaz).
    expect((await t.post("/giris/ad", { ad: "birinci ad" })).json).toEqual({ tamam: true, ad: "birinci ad", adSecildi: true });
    // Aynı gün (23:59:30) ilk gerçek DEĞİŞİKLİK serbest (günlük hak bununla tüketilir)...
    e.saat.ilerlet(30_000);
    expect((await t.post("/giris/ad", { ad: "ikinci ad" })).json).toMatchObject({ ad: "ikinci ad" });
    // ...ikincisi aynı gün reddedilir: okunur ileti, 429 ve gece yarısına kalan süre.
    const ret = await t.post("/giris/ad", { ad: "ucuncu ad" });
    expect(ret.durum).toBe(429);
    expect(ret.json).toMatchObject({ tamam: false, kod: "ad_sinir", beklemeSn: 30 });
    expect(String(ret.json?.mesaj)).toMatch(/gunde en cok bir kez/);
    expect(ret.baslik.get("retry-after")).toBe("30");
    expect((await t.istek("/giris/ben")).json?.ad).toBe("ikinci ad"); // ret adı değiştirmedi
    // Aynı adı yeniden seçmek değişiklik sayılmaz (sınırda bile başarılı, yazma yok).
    expect((await t.post("/giris/ad", { ad: "İKİNCİ AD" })).json).toMatchObject({ ad: "ikinci ad" });
    // 23:59:59 hala aynı gün.
    e.saat.t = sinir - 1_000;
    expect((await t.post("/giris/ad", { ad: "ucuncu ad" })).durum).toBe(429);
    // 00:01 (ertesi TRT günü): kabul.
    e.saat.t = sinir + 60_000;
    expect((await t.post("/giris/ad", { ad: "ucuncu ad" })).json).toMatchObject({ ad: "ucuncu ad" });
    // Yeni günün hakkı tüketildi: aynı gün ikinci değişiklik yine reddedilir; ertesi gün serbest.
    expect((await t.post("/giris/ad", { ad: "dorduncu ad" })).durum).toBe(429);
    e.saat.t = sinir + GUN + 1_000;
    expect((await t.post("/giris/ad", { ad: "dorduncu ad" })).json).toMatchObject({ ad: "dorduncu ad" });
    expect(e.hizmet.sayaclar.al("ad.ilk_secim")).toBe(1);
    expect(e.hizmet.sayaclar.al("ad.degisti")).toBe(3);
    expect(e.hizmet.sayaclar.al("ad.sinir")).toBe(3);
  });

  it("gün sınırı TRT'dir (UTC değil): UTC gece yarısı hakkı yenilemez, 00:00 TRT (21:00 UTC) yeniler", async () => {
    const e = await ortam({ sinirlar: GEVSEK });
    const trtSinir = turkiyeGeceYarisi(e.saat.t) + GUN; // sonraki TRT gece yarısı = önceki gün 21:00 UTC
    const utcGeceYarisi = Math.floor(trtSinir / GUN) * GUN; // TRT sınırından önceki UTC gece yarısı (21:00 UTC'den 21 saat önce)
    e.saat.t = Math.max(e.saat.t, utcGeceYarisi) ;
    const t = e.yeniTarayici();
    await giris(t, "trt@ornek.org");
    await t.post("/giris/ad", { ad: "bir ad" }); // ilk seçim
    expect((await t.post("/giris/ad", { ad: "iki ad" })).durum).toBe(200); // günün hakkı
    expect((await t.post("/giris/ad", { ad: "uc ad" })).durum).toBe(429);
    e.saat.t = trtSinir - 1;
    expect((await t.post("/giris/ad", { ad: "uc ad" })).durum).toBe(429);
    e.saat.t = trtSinir;
    expect((await t.post("/giris/ad", { ad: "uc ad" })).durum).toBe(200);
  });

  it("limit hesap başınadır: başka hesabın değişikliği etkilemez; ad değişimi oyuncu kimliğini DEĞİŞTİRMEZ (/giris/ben oyuncu aynı)", async () => {
    const e = await ortam({ sinirlar: GEVSEK });
    const t1 = e.yeniTarayici();
    const t2 = e.yeniTarayici();
    const o1 = await giris(t1, "h1@ornek.org");
    await giris(t2, "h2@ornek.org");
    await t1.post("/giris/ad", { ad: "ilk" });
    expect((await t1.post("/giris/ad", { ad: "degisti bir" })).durum).toBe(200);
    expect((await t1.post("/giris/ad", { ad: "degisti iki" })).durum).toBe(429);
    expect((await t2.post("/giris/ad", { ad: "baska bir" })).durum).toBe(200);
    expect((await t2.post("/giris/ad", { ad: "baska iki" })).durum).toBe(200);
    expect((await t1.istek("/giris/ben")).json?.oyuncu).toBe(o1.oyuncu);
  });
});

describe("eski hesap, silme, kapalı özellik, protokol sınırı", () => {
  it("adı olmayan eski hesap: adlariYukle otomatik ad yazar ve belleğe alır; açılıştan sonra sızan boşluk /giris/ben'de lazily doldurulur", async () => {
    const e = await ortam();
    // Eski hesap: depo üzerinden adsız oluşturulur (özellik öncesi).
    const eski = { id: "eski-h-1", eposta: "eski@ornek.org", anahtar: "eski@ornek.org", oyuncu: "o_eskieski", olusturma: 1 };
    await e.hesapDeposu.hesapOlustur(eski);
    expect((await e.hesapDeposu.hesapBulId(eski.id))?.ad).toBeUndefined();
    expect(await e.hizmet.adlariYukle()).toBeGreaterThanOrEqual(1);
    const ad = e.hizmet.adCoz("o_eskieski");
    expect(ad).toMatch(OTOMATIK);
    expect((await e.hesapDeposu.hesapBulId(eski.id))?.ad).toBe(ad);
    expect((await e.hesapDeposu.hesapBulId(eski.id))?.adSecildi).toBeUndefined(); // otomatik: seçilmedi
    // Açılıştan sonra adsız hesap: giriş (onay) sırasında doldurulur.
    const eski2 = { id: "eski-h-2", eposta: "eski2@ornek.org", anahtar: "eski2@ornek.org", oyuncu: "o_eskieski2", olusturma: 1 };
    await e.hesapDeposu.hesapOlustur(eski2);
    const onay = await giris(e.yeniTarayici(), "eski2@ornek.org");
    expect(onay.ad).toMatch(OTOMATIK);
    expect(onay.adSecildi).toBe(false);
    expect(e.hizmet.adCoz("o_eskieski2")).toBe(onay.ad);
  });

  it("hesap silinince ad bellekten ve depodan gider; aynı adresle yeniden kayıt yeni oyuncu + yeni otomatik ad verir", async () => {
    const e = await ortam();
    const t = e.yeniTarayici();
    const onay = await giris(t, "sil@ornek.org");
    await t.post("/giris/ad", { ad: "silinecek ad" });
    const hesap = await e.hesapDeposu.hesapBulAnahtar("sil@ornek.org");
    expect(await e.hizmet.hesapSil(hesap?.id as string)).toBe(true);
    expect(e.hizmet.adCoz(onay.oyuncu as string)).toBeUndefined();
    expect((await e.hesapDeposu.adlariListele()).some((x) => x.ad === "silinecek ad")).toBe(false);
    const yeni = await giris(e.yeniTarayici(), "sil@ornek.org");
    expect(yeni.yeniHesap).toBe(true);
    expect(yeni.oyuncu).not.toBe(onay.oyuncu);
    expect(yeni.ad).toMatch(OTOMATIK);
    expect(yeni.adSecildi).toBe(false);
  });

  it("özellik kapalı (adKurali yok): /giris/ad 404, hesapta ad yok, ben/onay ad taşımaz, adCoz boş", async () => {
    o = await girisOrtami();
    const t = o.yeniTarayici();
    const onay = await giris(t, "kapali@ornek.org");
    expect(onay.ad).toBeUndefined();
    expect(onay.adSecildi).toBeUndefined();
    expect((await t.istek("/giris/ben")).json).not.toHaveProperty("ad");
    expect((await t.post("/giris/ad", { ad: "ali" })).durum).toBe(404);
    expect(o.hizmet.adAcik).toBe(false);
    expect(o.hizmet.adCoz(onay.oyuncu as string)).toBeUndefined();
    expect(await o.hizmet.adlariYukle()).toBe(0);
  });

  it("protokol sınırı = AD_KURALI: istemci şeması 2-24; çekirdek sınırıyla aynı", () => {
    expect(GirisAdIstegiSemasi.safeParse({ ad: "a".repeat(AD_KURALI.min - 1) }).success).toBe(false);
    expect(GirisAdIstegiSemasi.safeParse({ ad: "a".repeat(AD_KURALI.min) }).success).toBe(true);
    expect(GirisAdIstegiSemasi.safeParse({ ad: "a".repeat(AD_KURALI.max) }).success).toBe(true);
    expect(GirisAdIstegiSemasi.safeParse({ ad: "a".repeat(AD_KURALI.max + 1) }).success).toBe(false);
  });

  it("vaka tablosu çekirdek adKanonik ile tutarlıdır (görünen ad ve marka adı aynı işlevi kullanır)", () => {
    for (const v of AD_VAKALARI) {
      const r = adKanonik(v.ad);
      if (v.kanonik !== undefined) expect(r, v.ad).toEqual({ tamam: true, ad: v.kanonik });
      else {
        expect(r.tamam, v.ad).toBe(false);
        expect((r as { hata: string }).hata, v.ad).toMatch(v.hata as RegExp);
      }
    }
  });
});

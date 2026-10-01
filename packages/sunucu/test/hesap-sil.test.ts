/**
 * Hesap silme (KVKK): oturumlu `POST /giris/hesap-sil` -> e-postaya onay bağlantısı -> `GET` yan etkisiz sayfa -> `POST /giris/hesap-sil-onay {j}` -> hesap silinir.
 * Kurallar: onaysız istek hiçbir şeyi silmez; bağlantı süreli, imzalı ve tek kullanımlıktır (kullanılınca hesap kalmaz); giriş bağlantısı ve silme bağlantısı birbirinin yerine
 * geçmez; silmeyle bütün oturumlar, biletler ve açık ws bağlantıları düşer; oyuncu günlükte ANONİM kalır, mülk devredilmez, durumOzeti değişmez; ad gider; aynı adresle
 * yeniden kayıt YENİ hesap + yeni oyuncu + yeni otomatik ad açar. G5'teki "silinen hesap" testlerinin devamıdır.
 */
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SAAT } from "@bolge/cekirdek";
import { adKanonik } from "@bolge/cekirdek";
import { GirisHesapSilIstekYanitiSemasi } from "@bolge/protokol";
import { Imzalayici, silmeJetonuUret } from "../src/giris/jeton";
import { BILET_SIRRI, GUN, IZINLI, biletleBaglan, girisOrtami } from "./giris-yardimci";
import type { GirisOrtami, Tarayici } from "./giris-yardimci";
import { bitisikSatilabilir } from "./yardimci";

let ortam: GirisOrtami | null = null;
afterEach(async () => {
  vi.restoreAllMocks();
  await ortam?.kapat();
  ortam = null;
});

const ILCE = "sn_m_ova_merkez";
const GEVSEK = { kapasite: 100_000, saniyeBasina: 100_000 };

async function kur(hizmet: Record<string, unknown> = {}): Promise<GirisOrtami> {
  ortam = await girisOrtami({ hizmet: { adKurali: adKanonik, sinirlar: { ipBasina: GEVSEK, genel: GEVSEK, onayIpBasina: GEVSEK, ...(hizmet.sinirlar as object | undefined) }, ...Object.fromEntries(Object.entries(hizmet).filter(([k]) => k !== "sinirlar")) } });
  return ortam;
}
async function biletAl(t: Tarayici): Promise<string> {
  const r = await t.post("/giris/bilet");
  expect(r.durum).toBe(200);
  return r.json?.bilet as string;
}
/** Silme isteği yapar ve postadaki onay jetonunu döndürür. */
async function silmeIste(o: GirisOrtami, t: Tarayici): Promise<{ jeton: string; baglanti: string; kime: string; metin: string }> {
  const once = await o.postaSayisi();
  const r = await t.post("/giris/hesap-sil");
  expect(r.durum, r.govde).toBe(202);
  expect(GirisHesapSilIstekYanitiSemasi.parse(r.json)).toEqual(r.json);
  await o.hizmet.bosta();
  expect(await o.postaSayisi()).toBe(once + 1);
  const { posta, jeton, baglanti } = await o.sonPosta();
  return { jeton, baglanti, kime: posta.kime, metin: posta.metin };
}

describe("istek: yalnız onay postası gider, HİÇBİR ŞEY silinmez", () => {
  it("oturum + izinli Origin ister; 202; onay bağlantısı hesabın e-postasına gider (sunucunun kendi sayfası); hesap, oturum, ad, ws, bilet yerinde", async () => {
    const o = await kur();
    expect((await o.yeniTarayici().post("/giris/hesap-sil")).durum).toBe(401); // oturumsuz
    const t = o.yeniTarayici();
    const g = await o.girisYap(t, "silme.istek@ornek.org");
    expect((await t.post("/giris/hesap-sil", undefined, { origin: null })).durum).toBe(403); // CSRF
    expect((await t.post("/giris/hesap-sil", undefined, { origin: "https://kotu.example" })).durum).toBe(403);
    expect((await t.istek("/giris/hesap-sil", { yontem: "GET" })).durum).toBe(405);
    expect(await o.postaSayisi()).toBe(1); // yalnız giriş postası; reddedilen istekler posta üretmedi

    const ws = await biletleBaglan(o, await biletAl(t));
    const bilet = await biletAl(t);
    const m = await silmeIste(o, t);
    expect(m.kime).toBe("silme.istek@ornek.org");
    expect(m.baglanti).toContain("/giris/hesap-sil-onay?j=sil1.");
    expect(m.metin).toMatch(/SİLMEK için/);
    expect(m.metin).toMatch(/kalıcıdır/);
    // Onaysız hiçbir şey silinmedi: hesap, oturum, ad, açık ws, bekleyen bilet.
    const hesap = await o.hesapDeposu.hesapBulAnahtar("silme.istek@ornek.org");
    expect(hesap?.oyuncu).toBe(g.oyuncu);
    expect((await t.istek("/giris/ben")).durum).toBe(200);
    expect(o.hizmet.adCoz(g.oyuncu)).toBe(hesap?.ad);
    expect(ws.kapanis).toBeNull(); // acik ws kapanmadi
    const ws2 = await biletleBaglan(o, bilet);
    expect(ws2.hosgeldin?.oyuncu).toBe(g.oyuncu);
    expect(o.hizmet.sayaclar.al("hesap_sil.istek")).toBe(1);
    expect(o.hizmet.sayaclar.al("hesap_sil.onay")).toBe(0);
    await ws2.kapat();
    await ws.kapat();
  });

  it("GET onay sayfası YAN ETKİSİZDİR (önizleme botu hesabı silemez): geçerli jetonla 200 sayfa + düğme, geçersizle 400; hesap yerinde", async () => {
    const o = await kur();
    const t = o.yeniTarayici();
    await o.girisYap(t, "get.sayfa@ornek.org");
    const m = await silmeIste(o, t);
    const sayfa = await t.istek(`/giris/hesap-sil-onay?j=${encodeURIComponent(m.jeton)}`);
    expect(sayfa.durum).toBe(200);
    expect(sayfa.govde).toMatch(/kalıcı olarak/);
    expect(sayfa.govde).toMatch(/<form method="post" action="\/giris\/hesap-sil-onay">/);
    expect(sayfa.baslik.get("referrer-policy")).toBe("no-referrer");
    for (let i = 0; i < 3; i++) await t.istek(`/giris/hesap-sil-onay?j=${encodeURIComponent(m.jeton)}`);
    expect(await o.hesapDeposu.hesapBulAnahtar("get.sayfa@ornek.org")).not.toBeNull();
    expect((await t.istek("/giris/ben")).durum).toBe(200);
    expect((await t.istek("/giris/hesap-sil-onay?j=bozuk")).durum).toBe(400);
    expect((await t.istek("/giris/hesap-sil-onay")).durum).toBe(400);
  });

  it("silme sayfalari (onay, gecersiz, silindi): satir ici <style> CSP ozetiyle birebir eslesir (unsafe-inline yok); kart/dugme siniflari; betik ve olay isleyicisi yok; GET yine yan etkisiz", async () => {
    const o = await kur();
    const t = o.yeniTarayici();
    await o.girisYap(t, "stil.sil@ornek.org");
    const m = await silmeIste(o, t);
    const onay = await t.istek(`/giris/hesap-sil-onay?j=${encodeURIComponent(m.jeton)}`);
    const gecersiz = await t.istek("/giris/hesap-sil-onay?j=bozuk");
    const denetle = (g: { baslik: Headers; govde: string }): void => {
      const csp = g.baslik.get("content-security-policy") ?? "";
      const stil = /<style>([^<]*)<\/style>/.exec(g.govde)?.[1] ?? "";
      expect(stil).toContain(".gr-kart{");
      expect(csp).toContain(`style-src 'sha256-${createHash("sha256").update(stil).digest("base64")}';`);
      expect(csp).not.toContain("unsafe-inline");
      expect(g.govde).not.toMatch(/<script|\son[a-z]+=|style="/i);
      expect(g.govde).toContain('class="gr-kart"');
      expect(g.govde).toContain('class="gr-baslik"');
    };
    denetle(onay);
    denetle(gecersiz);
    expect(onay.govde).toContain('class="gr-dugme"');
    expect(onay.govde).toContain('class="gr-govde"');
    expect(gecersiz.durum).toBe(400);
    expect(gecersiz.govde).toContain('class="gr-hata"');
    // GET'ler hesabi silmedi; formla onay "hesap silindi" sayfasini ayni stille dondurur.
    expect(await o.hesapDeposu.hesapBulAnahtar("stil.sil@ornek.org")).not.toBeNull();
    const silindi = await t.istek("/giris/hesap-sil-onay", { yontem: "POST", ham: `j=${encodeURIComponent(m.jeton)}` });
    expect(silindi.durum).toBe(200);
    expect(silindi.govde).toContain("hesap silindi");
    denetle(silindi);
    expect(await o.hesapDeposu.hesapBulAnahtar("stil.sil@ornek.org")).toBeNull();
  });

  it("hesap başına saatte 3 istek: dördüncüsü 429 hiz_siniri (posta gitmez); bir saat sonra yeniden", async () => {
    const o = await kur();
    const t = o.yeniTarayici();
    await o.girisYap(t, "hiz.sil@ornek.org");
    for (let i = 0; i < 3; i++) await silmeIste(o, t);
    const once = await o.postaSayisi();
    const r = await t.post("/giris/hesap-sil");
    expect(r.durum).toBe(429);
    expect(r.json).toMatchObject({ tamam: false, kod: "hiz_siniri" });
    await o.hizmet.bosta();
    expect(await o.postaSayisi()).toBe(once);
    o.saat.ilerlet(60 * 60_000 + 1000);
    expect((await t.post("/giris/hesap-sil")).durum).toBe(202);
  });
});

describe("onay: jeton denetimi", () => {
  it("sahte/bozuk/başka sırla imzalı/hesap kimliği değiştirilmiş jeton ve GİRİŞ bağlantısı: 400 baglanti_gecersiz, hesap silinmez; silme jetonu da giriş açmaz", async () => {
    const o = await kur();
    const t = o.yeniTarayici();
    const g = await o.girisYap(t, "jeton.sil@ornek.org");
    const hesap = await o.hesapDeposu.hesapBulAnahtar("jeton.sil@ornek.org");
    const bitis = o.saat.simdi() + 60_000;
    const baskaSir = silmeJetonuUret(new Imzalayici(["baska-sir-baska-sir-baska-sir-123456"]), hesap?.id as string, bitis);
    const dogruSirAmacsiz = silmeJetonuUret(new Imzalayici([BILET_SIRRI]), hesap?.id as string, bitis); // GEÇERLİ (kontrol)
    const degisik = dogruSirAmacsiz.replace(`sil1.${hesap?.id}`, "sil1.baska-hesap-kimligi");
    const kotuler = ["", "bozuk", "sil1.a.b.c.d", baskaSir, degisik, `${dogruSirAmacsiz}x`, "bag1.x.y.z"];
    for (const j of kotuler) {
      const r = await t.post("/giris/hesap-sil-onay", { j });
      expect(r.durum, j).toBe(j === "" ? 400 : 400);
      expect(["baglanti_gecersiz", "gecersiz_istek"]).toContain(r.json?.kod);
    }
    // GİRİŞ bağlantısı silme ucunda geçmez (amaç ayrımı) ve hesap yerinde kalır.
    const { jeton: girisJetonu } = await o.baglantiIste(o.yeniTarayici(), "jeton.sil@ornek.org");
    expect((await t.post("/giris/hesap-sil-onay", { j: girisJetonu })).json?.kod).toBe("baglanti_gecersiz");
    expect(await o.hesapDeposu.hesapBulAnahtar("jeton.sil@ornek.org")).not.toBeNull();
    // Silme jetonu giriş ucunda geçmez (yeni oturum açılmaz).
    const yeniTarayici = o.yeniTarayici();
    const r = await yeniTarayici.post("/giris/onay", { j: dogruSirAmacsiz });
    expect(r.durum).toBe(400);
    expect(yeniTarayici.cerezler.has("bolge_oturum")).toBe(false);
    expect((await t.istek("/giris/ben")).json?.oyuncu).toBe(g.oyuncu);
    expect(o.hizmet.sayaclar.al("hesap_sil.baglanti_gecersiz")).toBeGreaterThanOrEqual(kotuler.length);
  });

  it("bağlantı SÜRELİDİR (30 dk): süre dolunca onay ve sayfa 400, hesap silinmez", async () => {
    const o = await kur();
    const t = o.yeniTarayici();
    await o.girisYap(t, "sure.sil@ornek.org");
    const m = await silmeIste(o, t);
    o.saat.ilerlet(30 * 60_000 - 1000);
    expect((await t.istek(`/giris/hesap-sil-onay?j=${encodeURIComponent(m.jeton)}`)).durum).toBe(200); // sınırdan hemen önce hala geçerli
    o.saat.ilerlet(2000);
    expect((await t.istek(`/giris/hesap-sil-onay?j=${encodeURIComponent(m.jeton)}`)).durum).toBe(400);
    const r = await t.post("/giris/hesap-sil-onay", { j: m.jeton });
    expect(r.durum).toBe(400);
    expect(r.json?.kod).toBe("baglanti_gecersiz");
    expect(await o.hesapDeposu.hesapBulAnahtar("sure.sil@ornek.org")).not.toBeNull();
  });

  it("onay IP başına hız sınırlıdır (kaba kuvvet): sınır aşılınca 429", async () => {
    const o = await kur({ sinirlar: { onayIpBasina: { kapasite: 3, saniyeBasina: 0.001 } } });
    const t = o.yeniTarayici();
    for (let i = 0; i < 3; i++) expect((await t.post("/giris/hesap-sil-onay", { j: "sil1.x.y.1.z" })).durum).toBe(400);
    const r = await t.post("/giris/hesap-sil-onay", { j: "sil1.x.y.1.z" });
    expect(r.durum).toBe(429);
    expect(r.json?.kod).toBe("hiz_siniri");
  });
});

describe("onay: silme", () => {
  it("onayla: hesap ve e-posta bağı gider; oturumlar, açık ws, bekleyen bilet ve ad düşer; çerez temizlenir; ikinci kullanım ve yeniden kullanım reddedilir", async () => {
    const o = await kur();
    const t = o.yeniTarayici();
    const g = await o.girisYap(t, "gider@ornek.org");
    const diger = o.yeniTarayici(); // aynı hesabın ikinci oturumu (başka tarayıcı)
    await o.girisYap(diger, "gider@ornek.org");
    const w = await biletleBaglan(o, await biletAl(t));
    const bekleyen = await biletAl(diger);
    const ad = o.hizmet.adCoz(g.oyuncu);
    expect(ad).toMatch(/\S/);
    const m = await silmeIste(o, t);

    const r = await t.post("/giris/hesap-sil-onay", { j: m.jeton });
    expect(r.durum, r.govde).toBe(200);
    expect(r.json).toEqual({ tamam: true });
    expect(t.sonSetCookie.some((c) => c.startsWith("bolge_oturum=;") && /Max-Age=0/i.test(c))).toBe(true); // çerez silinir
    expect(await o.hesapDeposu.hesapBulAnahtar("gider@ornek.org")).toBeNull();
    expect(await o.hesapDeposu.sayilar()).toEqual({ hesap: 0, oturum: 0, baglanti: 0 });
    expect((await t.istek("/giris/ben")).durum).toBe(401);
    expect((await diger.istek("/giris/ben")).durum).toBe(401);
    await vi.waitFor(() => expect(w.kapanis?.kod).toBe(4003)); // açık ws kapandı
    await expect(biletleBaglan(o, bekleyen)).rejects.toThrow(/kimlik/); // bekleyen bilet reddedilir
    expect(o.hizmet.adCoz(g.oyuncu)).toBeUndefined(); // ad gitti (önbellek)
    expect((await o.hesapDeposu.adlariListele()).some((x) => x.oyuncu === g.oyuncu)).toBe(false);
    // Tek kullanımlık: aynı jeton ikinci kez ve yeni bir silme isteği olmadan hiçbir hesabı silmez.
    const tekrar = await t.post("/giris/hesap-sil-onay", { j: m.jeton });
    expect(tekrar.durum).toBe(400);
    expect(tekrar.json?.kod).toBe("baglanti_gecersiz");
    expect(o.hizmet.sayaclar.al("hesap_sil.onay")).toBe(1);
    // Silinen hesabın eski e-postası için eski jeton, aynı adresle YENİDEN kayıttan sonra da başka bir hesabı SİLMEZ (jeton hesap kimliğine bağlıdır).
    const yeni = await o.girisYap(o.yeniTarayici(), "gider@ornek.org");
    expect(yeni.yeniHesap).toBe(true);
    expect((await t.post("/giris/hesap-sil-onay", { j: m.jeton })).durum).toBe(400);
    expect(await o.hesapDeposu.hesapBulAnahtar("gider@ornek.org")).not.toBeNull();
  });

  it("sayfanın formu (form-urlencoded) da siler: 200 sayfa + çerez temizliği; Origin izinli olmalı (CSRF)", async () => {
    const o = await kur();
    const t = o.yeniTarayici();
    await o.girisYap(t, "form.sil@ornek.org");
    const m = await silmeIste(o, t);
    const kotu = await t.istek("/giris/hesap-sil-onay", { yontem: "POST", ham: `j=${encodeURIComponent(m.jeton)}`, origin: "https://kotu.example" });
    expect(kotu.durum).toBe(403);
    const yok = await t.istek("/giris/hesap-sil-onay", { yontem: "POST", ham: `j=${encodeURIComponent(m.jeton)}`, origin: null });
    expect(yok.durum).toBe(403);
    expect(await o.hesapDeposu.hesapBulAnahtar("form.sil@ornek.org")).not.toBeNull();
    const r = await t.istek("/giris/hesap-sil-onay", { yontem: "POST", ham: `j=${encodeURIComponent(m.jeton)}`, origin: IZINLI });
    expect(r.durum).toBe(200);
    expect(r.govde).toMatch(/hesabınız silindi/);
    expect(await o.hesapDeposu.hesapBulAnahtar("form.sil@ornek.org")).toBeNull();
  });

  it("mülk DEVREDİLMEZ, oyuncu günlükte ANONİM kalır: silme sonrası dünya durumu aynı (durumOzeti), hücreler hâlâ eski oyuncu kimliğinin; yeniden kayıt YENİ hesap + yeni oyuncu + yeni otomatik ad", async () => {
    const o = await kur();
    const t1 = o.yeniTarayici();
    const eski = await o.girisYap(t1, "mulk.sil@ornek.org");
    const ws1 = await biletleBaglan(o, await biletAl(t1));
    expect((await ws1.katil("k1")).tur).toBe("komutSonucu");
    o.ts.saat.ilerlet(SAAT);
    await o.ts.yazar.birTur();
    const hucreler = bitisikSatilabilir(o.ts.yazar.sim, ILCE);
    const al = await ws1.komut("p1", { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" });
    expect(al.tur === "komutSonucu" && al.sonuc.tamam).toBe(true);
    await ws1.kapat();
    const sim = o.ts.yazar.sim;
    const ozetOnce = sim.durumOzeti();
    const gunlukOnce = (await o.ts.depo.gunluk.oku(0)).length;
    const sahipler = (): Set<string | null> => new Set((sim.dunya.mulk?.hucreler ?? []).filter((h) => hucreler.includes(h.id)).map((h) => h.sahip));
    expect(sahipler()).toEqual(new Set([eski.oyuncu]));

    const m = await silmeIste(o, t1);
    expect((await t1.post("/giris/hesap-sil-onay", { j: m.jeton })).durum).toBe(200);
    // Dünya DEĞİŞMEDİ: özet aynı, oyuncu ve hücre sahipliği yerinde, günlük aynı uzunlukta (silme komut üretmez).
    expect(sim.durumOzeti()).toBe(ozetOnce);
    expect(sim.dunya.oyuncular.map((x) => x.id)).toEqual([eski.oyuncu]);
    expect(sahipler()).toEqual(new Set([eski.oyuncu]));
    expect((await o.ts.depo.gunluk.oku(0)).length).toBe(gunlukOnce);
    // Günlükte yalnız opak oyuncu kimliği var; e-posta, ad ya da hesap kimliği YOK.
    const gunluk = JSON.stringify(await o.ts.depo.gunluk.oku(0));
    expect(gunluk).not.toContain("mulk.sil");
    expect(gunluk).not.toContain("ornek.org");
    // Yeniden kayıt: yeni hesap, yeni farklı oyuncu, yeni otomatik ad; eski mülke sahip değil.
    const t2 = o.yeniTarayici();
    const yeni = await o.girisYap(t2, "mulk.sil@ornek.org");
    expect(yeni.yeniHesap).toBe(true);
    expect(yeni.oyuncu).not.toBe(eski.oyuncu);
    const ben = (await t2.istek("/giris/ben")).json;
    expect(ben?.adSecildi).toBe(false);
    expect(ben?.ad).toMatch(/^[a-zçğıöşü]+ [a-zçğıöşü]+ [1-9]\d{2}$/);
    expect(sahipler()).toEqual(new Set([eski.oyuncu]));
    // Süreç günlüğünde (gunluk kancası) kişisel veri yok: yalnız olay adı.
    const olaylar = JSON.stringify(o.gunluk);
    expect(olaylar).not.toContain("mulk.sil");
    expect(o.gunluk.some((x) => x.olay === "giris_hesap_silindi")).toBe(true);
  });

  it("silme ucu özellik bağımsızdır (görünen ad kapalıyken de çalışır); silme postası dosyaya YALNIZ onay bağlantısı olarak yazılır, jeton tam adres taşımaz", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    await o.girisYap(t, "adsiz.sil@ornek.org");
    const m = await silmeIste(o, t);
    expect(m.jeton).not.toContain("adsiz");
    expect(m.jeton).toMatch(/^sil1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.\d+\.[A-Za-z0-9_-]+$/); // yalnız opak hesap kimliği, nonce, süre, imza
    expect((await t.post("/giris/hesap-sil-onay", { j: m.jeton })).json).toEqual({ tamam: true });
    expect(await o.hesapDeposu.hesapBulAnahtar("adsiz.sil@ornek.org")).toBeNull();
    // GUN sabiti kullanıldı mı (tembel import denetimi): oturum süresi ayrı testtedir.
    expect(GUN).toBe(86_400_000);
  });
});

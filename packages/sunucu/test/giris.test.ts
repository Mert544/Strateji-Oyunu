/**
 * E-posta bağlantısıyla giriş (G5) uçtan uca: gerçek sunucu + dosya postacısı + çerezli HTTP istemcisi + ws. Saat enjekte edilir
 * (gerçek beklemeye dayanan test yok). Kapsam: tam zincir, tek kullanım, süre, belirteç saldırıları, kullanıcı sızdırmama, hız
 * sınırları, Origin/CSRF, çerez nitelikleri, oturum süreleri, bilet (tek kullanım, süre, oturuma bağlılık, iptal), günlük/metrik gizliliği.
 */
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { dosyaDeposu } from "../src/depo/dosya";
import { GunlukKimligi } from "../src/giris/gunluk-kimlik";
import { Imzalayici, biletUret } from "../src/giris/jeton";
import { BellekPostaGondericisi } from "../src/giris/posta";
import { BILET_SIRRI, GUN, GUNLUK_TUZU, IZINLI, biletleBaglan, girisOrtami } from "./giris-yardimci";
import type { GirisOrtami, Tarayici } from "./giris-yardimci";
import { bitisikSatilabilir } from "./yardimci";

let ortam: GirisOrtami | null = null;
const temizlik: Array<() => Promise<void>> = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await ortam?.kapat();
  ortam = null;
  for (const t of temizlik.splice(0)) await t();
});

const ILCE = "sn_m_ova_merkez";
const OYUNCU_BICIMI = /^o_[0-9a-hjkmnp-tv-z]{8}$/;
const cerezDegeri = (t: Tarayici, ad: string): string => t.cerezler.get(ad) as string;

async function biletAl(t: Tarayici): Promise<string> {
  const r = await t.post("/giris/bilet");
  expect(r.durum).toBe(200);
  return r.json?.bilet as string;
}

describe("uctan uca giris", () => {
  it("istek -> dosya postasi -> GET yan etkisiz -> POST onay -> cerez -> bilet -> ws merhaba -> hosgeldin -> katil -> komut", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();

    // 1. İstek: her zaman 202; posta yanıttan sonra, dosyaya gider.
    const r = await t.post("/giris/istek", { eposta: "Ali@Ornek.org" });
    expect(r.durum).toBe(202);
    expect(r.json).toEqual({ tamam: true, gecerlilikSn: 600 });
    await o.hizmet.bosta();
    const { posta, jeton, baglanti } = await o.sonPosta();
    expect(posta.kime).toBe("ali@ornek.org"); // küçük harfe çevrilmiş adres
    expect(posta.konu).toContain("giriş");
    expect(posta.metin).toContain(baglanti);
    expect(baglanti.startsWith(`${o.taban}/giris/onay?j=`)).toBe(true);

    // 2. GET yalnız onay sayfasıdır: yan etkisiz (önizleme botları bağlantıyı tüketemez), çerez vermez; defalarca açılabilir.
    for (let i = 0; i < 3; i++) {
      const g = await t.istek(`/giris/onay?j=${encodeURIComponent(jeton)}`);
      expect(g.durum).toBe(200);
      expect(g.baslik.get("content-type")).toContain("text/html");
      expect(g.baslik.get("referrer-policy")).toBe("no-referrer");
      expect(t.sonSetCookie.filter((c) => c.startsWith("bolge_oturum"))).toEqual([]);
      expect(g.govde).toContain('<form method="post" action="/giris/onay">');
      expect(g.govde).toContain(jeton);
    }
    expect(await o.hesapDeposu.sayilar()).toEqual({ hesap: 0, oturum: 0, baglanti: 1 });

    // 3. POST onay: oturum çerezi (HttpOnly, SameSite=Lax; geliştirmede Secure yok), yeni hesap, opak oyuncu kimliği.
    const onay = await t.post("/giris/onay", { j: jeton });
    expect(onay.durum).toBe(200);
    expect(onay.json).toMatchObject({ tamam: true, yeniHesap: true });
    const oyuncu = onay.json?.oyuncu as string;
    expect(oyuncu).toMatch(OYUNCU_BICIMI);
    expect(oyuncu).not.toContain("ali");
    const oturumCerezi = t.sonSetCookie.find((c) => c.startsWith("bolge_oturum="));
    expect(oturumCerezi).toMatch(/; HttpOnly/);
    expect(oturumCerezi).toMatch(/; SameSite=Lax/);
    expect(oturumCerezi).toMatch(/; Max-Age=2592000/); // 30 gün
    expect(oturumCerezi).not.toMatch(/Secure/);
    expect(await o.hesapDeposu.sayilar()).toEqual({ hesap: 1, oturum: 1, baglanti: 0 });

    // 4. Ben, bilet.
    const ben = await t.istek("/giris/ben");
    expect(ben.json).toMatchObject({ tamam: true, eposta: "ali@ornek.org", oyuncu });
    const bilet = await biletAl(t);

    // 5. ws merhaba -> hosgeldin (oyuncu kimliği bilet içeriğinden; yönetici değil) -> katil -> komut.
    const ws = await biletleBaglan(o, bilet);
    expect(ws.hosgeldin?.oyuncu).toBe(oyuncu);
    expect(ws.hosgeldin?.yonetici).toBe(false);
    const k = await ws.katil("k1");
    expect(k.tur === "komutSonucu" && k.sonuc.tamam).toBe(true);
    expect(o.ts.yazar.sim.dunya.oyuncular.map((x) => x.id)).toEqual([oyuncu]);
    o.ts.saat.ilerlet(SAAT);
    await o.ts.yazar.birTur();
    const hucreler = bitisikSatilabilir(o.ts.yazar.sim, ILCE);
    const komut = await ws.komut("p1", { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" });
    expect(komut.tur === "komutSonucu" && komut.sonuc.tamam).toBe(true);
    const gunluk = await o.ts.depo.gunluk.oku(0);
    expect(gunluk.map((g) => [g.oyuncu, g.komut.tur])).toEqual([[SISTEM_OYUNCUSU, "oyuncu_katil"], [oyuncu, "parsel_al"]]);
    expect(gunluk[0]?.komut).toMatchObject({ oyuncu });
    // İkinci katılım (hesap başına bir oyuncu): çekirdek reddeder, ikinci oyuncu açılmaz.
    const iki = await ws.katil("k2");
    expect(iki.tur === "komutSonucu" && !iki.sonuc.tamam).toBe(true);
    expect(o.ts.yazar.sim.dunya.oyuncular).toHaveLength(1);
    await ws.kapat();
  });

  it("onay sayfasinin formu (form-urlencoded) oturum acar; gecersiz baglantida okunur hata sayfasi; GET gecersiz jetonda 400", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    const { jeton } = await o.baglantiIste(t, "form@ornek.org");
    const kotu = await t.istek("/giris/onay", { yontem: "POST", ham: "j=bag1.yanlis" });
    expect(kotu.durum).toBe(400);
    expect(kotu.govde).toContain("geçersiz");
    expect((await t.istek(`/giris/onay?j=bag1.yanlis`)).durum).toBe(400);
    const ok = await t.istek("/giris/onay", { yontem: "POST", ham: `j=${encodeURIComponent(jeton)}` });
    expect(ok.durum).toBe(200);
    expect(ok.govde).toContain("giriş yapıldı");
    expect(t.sonSetCookie.some((c) => c.startsWith("bolge_oturum="))).toBe(true);
    expect((await t.istek("/giris/ben")).json?.eposta).toBe("form@ornek.org");
    // Yönlendirme ayarlıysa 303.
    await o.kapat();
    ortam = await girisOrtami({ uclar: { girisSonrasiAdres: `${IZINLI}/oyun` } });
    const t2 = ortam.yeniTarayici();
    const { jeton: j2 } = await ortam.baglantiIste(t2, "yonlen@ornek.org");
    const red = await t2.istek("/giris/onay", { yontem: "POST", ham: `j=${encodeURIComponent(j2)}` });
    expect(red.durum).toBe(303);
    expect(red.baslik.get("location")).toBe(`${IZINLI}/oyun`);
  });

  it("sunucu sayfalari: satir ici <style> CSP ozetiyle birebir eslesir (unsafe-inline yok); onay/sonuc/hata sayfalari kart sinifli; betik ve olay isleyicisi yok; GET yan etkisiz", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    const { jeton } = await o.baglantiIste(t, "stil@ornek.org");
    const sayfalar = [
      await t.istek(`/giris/onay?j=${encodeURIComponent(jeton)}`), // onay
      await t.istek("/giris/onay?j=bag1.yanlis"), // gecersiz baglanti (400)
      await t.istek("/giris/onay", { yontem: "POST", ham: "j=bag1.yanlis" }), // basarisiz sonuc (form)
    ];
    for (const g of sayfalar) {
      const csp = g.baslik.get("content-security-policy") ?? "";
      const stil = /<style>([^<]*)<\/style>/.exec(g.govde)?.[1] ?? "";
      expect(stil).toContain(".gr-kart{");
      const ozet = `'sha256-${createHash("sha256").update(stil).digest("base64")}'`;
      expect(csp).toContain(`style-src ${ozet};`);
      expect(csp).not.toContain("unsafe-inline");
      expect(csp).toContain("default-src 'none'");
      expect(g.govde).not.toMatch(/<script|\son[a-z]+=|style="/i);
      expect(g.govde).toContain('class="gr-kart"');
      expect(g.govde).toContain('class="gr-baslik"');
    }
    expect(sayfalar[0]?.govde).toContain('class="gr-dugme"');
    expect(sayfalar[1]?.govde).toContain('class="gr-hata"');
    // Stil eklemek GET'i yan etkili yapmadi: baglanti hala tuketilmemis, cerez yok.
    expect(t.sonSetCookie.filter((c) => c.startsWith("bolge_oturum"))).toEqual([]);
    expect(await o.hesapDeposu.sayilar()).toEqual({ hesap: 0, oturum: 0, baglanti: 1 });
  });
});

describe("baglanti: tek kullanim, sure, saldiri", () => {
  it("kullanilmis baglanti ikinci kez reddedilir (baska tarayicidan da)", async () => {
    ortam = await girisOrtami({ hizmet: { tarayiciBagli: false } });
    const o = ortam;
    const t = o.yeniTarayici();
    const { jeton } = await o.baglantiIste(t, "tek@ornek.org");
    expect((await t.post("/giris/onay", { j: jeton })).durum).toBe(200);
    const t2 = o.yeniTarayici();
    const tekrar = await t2.post("/giris/onay", { j: jeton });
    expect(tekrar.durum).toBe(400);
    expect(tekrar.json).toMatchObject({ tamam: false, kod: "baglanti_gecersiz" });
    expect(await o.hesapDeposu.sayilar()).toMatchObject({ oturum: 1, baglanti: 0 });
    expect(o.hizmet.sayaclar.al("onay.baglanti_gecersiz")).toBe(1);
  });

  it("suresi gecmis baglanti reddedilir (10 dk, enjekte saat); sureden once gecerli", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    const { jeton } = await o.baglantiIste(t, "sure@ornek.org");
    o.saat.ilerlet(10 * 60_000 - 1_000);
    expect((await t.istek(`/giris/onay?j=${encodeURIComponent(jeton)}`)).durum).toBe(200);
    o.saat.ilerlet(1_000); // tam 10 dk: süre doldu
    expect((await t.istek(`/giris/onay?j=${encodeURIComponent(jeton)}`)).durum).toBe(400);
    const r = await t.post("/giris/onay", { j: jeton });
    expect(r.durum).toBe(400);
    expect(r.json?.kod).toBe("baglanti_gecersiz");
    expect(await o.hesapDeposu.sayilar()).toMatchObject({ hesap: 0, oturum: 0 });
    // Süresi dolan kayıt bakımla silinir.
    expect((await o.hesapDeposu.sayilar()).baglanti).toBe(1);
    await o.hizmet.bakim();
    expect((await o.hesapDeposu.sayilar()).baglanti).toBe(0);
  });

  it("yeni baglanti istenince ayni adresin eski baglantilari duser", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    const { jeton: eski } = await o.baglantiIste(t, "yeni@ornek.org");
    const { jeton: yeni } = await o.baglantiIste(t, "YENI@ornek.org");
    expect(yeni).not.toBe(eski);
    expect((await t.post("/giris/onay", { j: eski })).json?.kod).toBe("baglanti_gecersiz");
    expect((await t.post("/giris/onay", { j: yeni })).durum).toBe(200);
  });

  it("yanlis, kisaltilmis ya da kurcalanmis belirtec reddedilir ve gecerli baglantiyi TUKETMEZ", async () => {
    ortam = await girisOrtami({ hizmet: { tarayiciBagli: false } });
    const o = ortam;
    const t = o.yeniTarayici();
    const { jeton } = await o.baglantiIste(t, "saldiri@ornek.org");
    const [onek, rastgele, bitis, imza] = jeton.split(".") as [string, string, string, string];
    const kotuler = [
      jeton.slice(0, -3), // kısaltılmış
      jeton.slice(0, -1) + (jeton.endsWith("A") ? "B" : "A"), // son karakter değişmiş
      `${onek}.${rastgele}.${Number(bitis) + 3_600_000}.${imza}`, // süre uzatılmış
      `${onek}.${rastgele.slice(0, -1)}x.${bitis}.${imza}`, // rastgele kısım değişmiş
      `${onek}.${rastgele}.${bitis}`, // imzasız
      "bag1.", "", "x".repeat(400), `${jeton}.fazla`,
    ];
    for (const k of kotuler) {
      const r = await t.post("/giris/onay", { j: k || "x" });
      expect(r.durum, k.slice(0, 20)).toBe(400);
      expect(r.json?.kod).toBe("baglanti_gecersiz");
    }
    // Yanlış imza sırrıyla üretilmiş (başka sunucu) jeton da reddedilir.
    const baska = new Imzalayici(["baska-bir-sunucunun-sirri-0123456789"]);
    const sahte = `${onek}.${rastgele}.${bitis}`;
    expect((await t.post("/giris/onay", { j: `${sahte}.${baska.imzala("baglanti", sahte)}` })).durum).toBe(400);
    expect(await o.hesapDeposu.sayilar()).toMatchObject({ baglanti: 1, oturum: 0 });
    expect((await t.post("/giris/onay", { j: jeton })).durum).toBe(200); // gerçek bağlantı hâlâ geçerli
  });

  it("VARSAYILAN: baglanti tarayiciya bagli DEGIL: baska tarayicida acilir, bolge_giris cerezi verilmez (telefonda baska tarayicida acan oyuncu kilitlenmez)", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const a = o.yeniTarayici();
    const b = o.yeniTarayici();
    const { jeton } = await o.baglantiIste(a, "serbest@ornek.org");
    expect(a.sonSetCookie.some((s) => s.startsWith("bolge_giris"))).toBe(false);
    const r = await b.post("/giris/onay", { j: jeton });
    expect(r.durum).toBe(200);
    expect(r.json).toMatchObject({ tamam: true, yeniHesap: true });
  });

  it("tarayiciBagli ACIKKEN: baglanti istegi yapan tarayiciya baglidir: baska tarayicida 403 ve TUKETILMEZ; dogru tarayicida acilir", async () => {
    ortam = await girisOrtami({ hizmet: { tarayiciBagli: true } });
    const o = ortam;
    const a = o.yeniTarayici();
    const b = o.yeniTarayici();
    const { jeton } = await o.baglantiIste(a, "tarayici@ornek.org");
    expect(a.sonSetCookie.some((s) => s.startsWith("bolge_giris="))).toBe(true);
    expect((await b.istek(`/giris/onay?j=${encodeURIComponent(jeton)}`)).durum).toBe(200); // sayfa açılır (yan etkisiz)
    const r = await b.post("/giris/onay", { j: jeton });
    expect(r.durum).toBe(403);
    expect(r.json?.kod).toBe("tarayici_uyumsuz");
    expect(await o.hesapDeposu.sayilar()).toMatchObject({ baglanti: 1, oturum: 0 });
    expect((await a.post("/giris/onay", { j: jeton })).durum).toBe(200);
  });

  it("onay denemesi IP basina sinirlidir (kaba kuvvet): asilinca 429", async () => {
    ortam = await girisOrtami({ hizmet: { sinirlar: { onayIpBasina: { kapasite: 3, saniyeBasina: 0.0001 } } } });
    const t = ortam.yeniTarayici();
    for (let i = 0; i < 3; i++) expect((await t.post("/giris/onay", { j: "bag1.x" })).durum).toBe(400);
    const r = await t.post("/giris/onay", { j: "bag1.x" });
    expect(r.durum).toBe(429);
    expect(r.json).toMatchObject({ kod: "hiz_siniri" });
    expect(r.baslik.get("retry-after")).toBeTruthy();
  });
});

describe("hesap", () => {
  it("hesap basina bir oyuncu: ayni e-posta her giriste ayni oyuncu; Gmail nokta ve +takma ayni hesap; farkli adres farkli opak oyuncu", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t1 = o.yeniTarayici();
    const ilk = await o.girisYap(t1, "ali.veli+oyun@gmail.com");
    expect(ilk.yeniHesap).toBe(true);
    const t2 = o.yeniTarayici();
    const ikinci = await o.girisYap(t2, "aliveli@gmail.com");
    expect(ikinci).toEqual({ oyuncu: ilk.oyuncu, yeniHesap: false });
    const t3 = o.yeniTarayici();
    expect(await o.girisYap(t3, "ALI.VELI@googlemail.com")).toEqual({ oyuncu: ilk.oyuncu, yeniHesap: false });
    // Aynı hesaba ilk kayıtta yazılan adres saklanır; üç oturum, tek hesap.
    expect((await t3.istek("/giris/ben")).json?.eposta).toBe("ali.veli+oyun@gmail.com");
    expect(await o.hesapDeposu.sayilar()).toMatchObject({ hesap: 1, oturum: 3 });
    // Gmail dışında nokta anlamlıdır (+takma yine atılır).
    const t4 = o.yeniTarayici();
    const baska = await o.girisYap(t4, "a.li@ornek.org");
    const t5 = o.yeniTarayici();
    const baska2 = await o.girisYap(t5, "ali@ornek.org");
    expect(baska.oyuncu).not.toBe(baska2.oyuncu);
    expect(baska.oyuncu).toMatch(OYUNCU_BICIMI);
    expect(baska2.oyuncu).toMatch(OYUNCU_BICIMI);
    expect(await o.girisYap(o.yeniTarayici(), "ali+x@ornek.org")).toEqual({ oyuncu: baska2.oyuncu, yeniHesap: false });
  });

  it("iki hesap iki ayri oyuncu olarak katilir; ayni hesabin ikinci tarayicisi AYNI oyuncuya baglanir (ikinci oyuncu acilmaz)", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const a1 = o.yeniTarayici();
    const veli = o.yeniTarayici();
    const ali = await o.girisYap(a1, "ali@ornek.org");
    const vel = await o.girisYap(veli, "veli@ornek.org");
    const wa = await biletleBaglan(o, await biletAl(a1));
    const wv = await biletleBaglan(o, await biletAl(veli));
    expect((await wa.katil("k1")).tur).toBe("komutSonucu");
    expect((await wv.katil("k1")).tur).toBe("komutSonucu"); // kapsam oyuncuya özel: aynı anahtar çakışmaz
    expect(o.ts.yazar.sim.dunya.oyuncular.map((x) => x.id).sort()).toEqual([ali.oyuncu, vel.oyuncu].sort());
    const a2 = o.yeniTarayici();
    await o.girisYap(a2, "ali@ornek.org");
    const wa2 = await biletleBaglan(o, await biletAl(a2), "ikinci-sekme");
    expect(wa2.hosgeldin?.oyuncu).toBe(ali.oyuncu);
    const yine = await wa2.katil("k9");
    expect(yine.tur === "komutSonucu" && !yine.sonuc.tamam).toBe(true);
    expect(o.ts.yazar.sim.dunya.oyuncular).toHaveLength(2);
    for (const w of [wa, wv, wa2]) await w.kapat();
  });

  it("gecici e-posta alanlari reddedilir (alt alan dahil); hesabin varligina bagli degildir; posta gitmez", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    for (const adres of ["x@mailinator.com", "x@a.b.mailinator.com", "Y+z@YOPMAIL.com", "w@guerrillamail.com"]) {
      const r = await t.post("/giris/istek", { eposta: adres });
      expect(r.durum, adres).toBe(422);
      expect(r.json).toMatchObject({ tamam: false, kod: "gecici_eposta" });
    }
    await o.hizmet.bosta();
    expect(await o.postaSayisi()).toBe(0);
    expect(o.hizmet.sayaclar.al("istek.gecici_eposta")).toBe(4);
    // Biçim hataları 422/400.
    expect((await t.post("/giris/istek", { eposta: "yok" })).json?.kod).toBe("gecersiz_eposta");
    expect((await t.post("/giris/istek", { eposta: "a b@ornek.org" })).json?.kod).toBe("gecersiz_eposta");
    expect((await t.post("/giris/istek", { eposta: "a@@ornek.org" })).json?.kod).toBe("gecersiz_eposta");
    expect((await t.post("/giris/istek", { yok: 1 })).json?.kod).toBe("gecersiz_istek");
    expect((await t.post("/giris/istek", { eposta: "a@ornek.org\r\nbcc: x@y.org" })).json?.kod).toBe("gecersiz_eposta"); // başlık enjeksiyonu yok
    // Geçici alan hesap oluşturmada da yeniden denetlenir (liste kayıt ile onay arasında güncellenmiş olabilir).
    const { jeton } = await o.baglantiIste(t, "once@ornek.org");
    const gecici = new Set(["ornek.org"]);
    const hizmet2 = Object.assign(o.hizmet, {});
    (hizmet2 as unknown as { geciciAlanlar: Set<string> }).geciciAlanlar = gecici;
    const r = await t.post("/giris/onay", { j: jeton });
    expect(r.durum).toBe(422);
    expect(r.json?.kod).toBe("gecici_eposta");
    expect(await o.hesapDeposu.sayilar()).toMatchObject({ hesap: 0, oturum: 0 });
  });

  it("KVKK silme: hesap silinince oturumlar duser, ws baglantisi kapanir, bilet reddedilir; e-posta kaydi kalmaz", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    const { oyuncu } = await o.girisYap(t, "sil@ornek.org");
    const w = await biletleBaglan(o, await biletAl(t));
    const bekleyen = await biletAl(t);
    const hesap = await o.hesapDeposu.hesapBulAnahtar("sil@ornek.org");
    expect(hesap?.oyuncu).toBe(oyuncu);
    expect(await o.hizmet.hesapSil(hesap?.id as string)).toBe(true);
    expect(await o.hizmet.hesapSil(hesap?.id as string)).toBe(false);
    await vi.waitFor(() => expect(w.kapanis?.kod).toBe(4003));
    expect((await t.istek("/giris/ben")).durum).toBe(401);
    await expect(biletleBaglan(o, bekleyen)).rejects.toThrow(/kimlik/);
    expect(await o.hesapDeposu.sayilar()).toEqual({ hesap: 0, oturum: 0, baglanti: 0 });
  });
});

describe("silinen hesap", () => {
  it("hesapSil sonrasi ayni e-postayla yeniden kayit serbesttir: YENI hesap ve YENI farkli oyuncu; eski oyuncu ve eski mulk dunyada eskisinin kalir", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t1 = o.yeniTarayici();
    const eski = await o.girisYap(t1, "donen@ornek.org");
    const ws1 = await biletleBaglan(o, await biletAl(t1));
    expect((await ws1.katil("k1")).tur).toBe("komutSonucu");
    o.ts.saat.ilerlet(SAAT);
    await o.ts.yazar.birTur();
    const hucreler = bitisikSatilabilir(o.ts.yazar.sim, ILCE);
    const al = await ws1.komut("p1", { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" });
    expect(al.tur === "komutSonucu" && al.sonuc.tamam).toBe(true);
    await ws1.kapat();
    const eskiHesap = await o.hesapDeposu.hesapBulAnahtar("donen@ornek.org");
    expect(await o.hizmet.hesapSil(eskiHesap?.id as string)).toBe(true);
    expect((await t1.istek("/giris/ben")).durum).toBe(401);
    // Aynı adresle yeniden: yeni hesap, yeni opak oyuncu.
    const t2 = o.yeniTarayici();
    const yeni = await o.girisYap(t2, "donen@ornek.org");
    expect(yeni.yeniHesap).toBe(true);
    expect(yeni.oyuncu).toMatch(OYUNCU_BICIMI);
    expect(yeni.oyuncu).not.toBe(eski.oyuncu);
    const yeniHesap = await o.hesapDeposu.hesapBulAnahtar("donen@ornek.org");
    expect(yeniHesap?.id).not.toBe(eskiHesap?.id);
    // Eski oyuncu dünyada ve günlükte kalır; eski mülk eskisinin; yeni oyuncu henüz katılmamıştır ve eski mülke sahip değildir.
    const sim = o.ts.yazar.sim;
    expect(sim.dunya.oyuncular.map((x) => x.id)).toEqual([eski.oyuncu]);
    const sahipler = (): Set<string | null> => new Set((sim.dunya.mulk?.hucreler ?? []).filter((h) => hucreler.includes(h.id)).map((h) => h.sahip));
    expect(sahipler()).toEqual(new Set([eski.oyuncu]));
    const ws2 = await biletleBaglan(o, await biletAl(t2));
    expect(ws2.hosgeldin?.oyuncu).toBe(yeni.oyuncu);
    expect((await ws2.katil("k2")).tur === "komutSonucu").toBe(true);
    expect(sim.dunya.oyuncular.map((x) => x.id).sort()).toEqual([eski.oyuncu, yeni.oyuncu].sort());
    expect(sahipler()).toEqual(new Set([eski.oyuncu])); // yeni oyuncu eski mülke sahip değil
    const yeniKare = await ws2.abone([]);
    expect(yeniKare.kare.oyuncu?.id).toBe(yeni.oyuncu);
    expect((await o.ts.depo.gunluk.oku(0)).filter((g) => g.komut.tur === "oyuncu_katil").map((g) => (g.komut as { oyuncu: string }).oyuncu)).toEqual([eski.oyuncu, yeni.oyuncu]);
    await ws2.kapat();
  });
});

describe("kullanici sizdirmama ve arka plan", () => {
  /** Yanıtın sızdırabileceği her şey: durum, gövde bayt bayt, başlıklar (Date ve rastgele çerez DEĞERİ hariç). */
  function imza(r: { durum: number; govde: string; baslik: Headers }, cerezler: string[]): unknown {
    const b = [...r.baslik.entries()].filter(([ad]) => ad !== "date" && ad !== "set-cookie").sort(([x], [y]) => (x < y ? -1 : 1));
    return { durum: r.durum, govde: r.govde, baslik: b, cerezler: cerezler.map((c) => c.replace(/=[^;]*/, "=<deger>")) };
  }

  it("kayitli ve kayitsiz adres icin POST /giris/istek ayni durum, govde ve basliklari dondurur", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    await o.girisYap(o.yeniTarayici(), "kayitli@ornek.org");
    const t1 = o.yeniTarayici();
    const t2 = o.yeniTarayici();
    const a = await t1.post("/giris/istek", { eposta: "kayitli@ornek.org" });
    const b = await t2.post("/giris/istek", { eposta: "kayitsiz@ornek.org" });
    expect(a.durum).toBe(202);
    expect(imza(a, t1.sonSetCookie)).toEqual(imza(b, t2.sonSetCookie));
    // Aynı adres için tekrar (sınırlanmış ya da değil) de aynıdır.
    for (let i = 0; i < 5; i++) {
      const x = o.yeniTarayici();
      const y = o.yeniTarayici();
      const ra = await x.post("/giris/istek", { eposta: "kayitli@ornek.org" });
      const rb = await y.post("/giris/istek", { eposta: "kayitsiz@ornek.org" });
      expect(imza(ra, x.sonSetCookie)).toEqual(imza(rb, y.sonSetCookie));
    }
    await o.hizmet.bosta();
  });

  it("isleyici postaciyi BEKLEMEZ: asili kalan postaciyla da yanit doner; posta sonradan gider", async () => {
    const posta = new BellekPostaGondericisi();
    let birak!: () => void;
    posta.engel = new Promise<void>((c) => (birak = c));
    ortam = await girisOrtami({ posta });
    const o = ortam;
    const t = o.yeniTarayici();
    const r = await t.post("/giris/istek", { eposta: "asili@ornek.org" });
    expect(r.durum).toBe(202); // postacı hâlâ asılı
    expect(posta.gonderilenler).toHaveLength(0);
    birak();
    await o.hizmet.bosta();
    expect(posta.gonderilenler).toHaveLength(1);
    expect(posta.gonderilenler[0]?.kime).toBe("asili@ornek.org");
  });

  it("posta hatasi yanita yansimaz (202); yalniz sayac ve maskelenmis gunluk", async () => {
    const posta = new BellekPostaGondericisi();
    posta.hataVer = new Error("SMTP reddetti: kimse@gizli.org");
    ortam = await girisOrtami({ posta });
    const o = ortam;
    const r = await o.yeniTarayici().post("/giris/istek", { eposta: "kimse@gizli.org" });
    expect(r.durum).toBe(202);
    await o.hizmet.bosta();
    expect(o.hizmet.sayaclar.al("posta.hata")).toBe(1);
    expect(JSON.stringify(o.gunluk)).not.toContain("kimse"); // yerel kısım ve tam adres yok
    expect(JSON.stringify(o.gunluk)).not.toMatch(/gizli|\*\*\*|@/); // alan adı ve maskeli hâl de YOK (KVKK): yalnız HMAC öneki
    expect(JSON.stringify(o.gunluk)).not.toContain("SMTP reddetti"); // hata iletisi yazılmaz
    expect(o.gunluk.find((g) => g.olay === "giris_posta_hatasi")?.veri).toEqual({ eposta_hmac: new GunlukKimligi(GUNLUK_TUZU).eposta("kimse@gizli.org"), tur: "Error" });
  });
});

describe("hiz sinirlari (istek)", () => {
  it("e-posta basina 3/saat: dorduncu istek AYNI yanit ama posta gitmez; saat gecince yeniden gider; kayitli/kayitsiz ayni", async () => {
    ortam = await girisOrtami({ hizmet: { sinirlar: { ipBasina: { kapasite: 1000, saniyeBasina: 1 } } } });
    const o = ortam;
    await o.girisYap(o.yeniTarayici(), "kayitli@ornek.org"); // 1 posta
    const yanitlar: unknown[] = [];
    for (const adres of ["kayitli@ornek.org", "kayitli@ornek.org", "kayitli@ornek.org", "kayitli@ornek.org", "kayitsiz@ornek.org", "kayitsiz@ornek.org", "kayitsiz@ornek.org", "kayitsiz@ornek.org", "kayitsiz@ornek.org"]) {
      const t = o.yeniTarayici();
      const r = await t.post("/giris/istek", { eposta: adres });
      expect(r.durum).toBe(202);
      yanitlar.push([r.govde, [...r.baslik.entries()].filter(([a]) => a !== "date").map(([a]) => a).sort()]);
    }
    expect(new Set(yanitlar.map((y) => JSON.stringify(y))).size).toBe(1); // sınırlanan ve sınırlanmayan yanıt aynı
    await o.hizmet.bosta();
    // kayitli: giriş için 1 + 2 (üçüncüde doldu) = 3 posta; kayitsiz: 3 posta. Toplam 6.
    expect(await o.postaSayisi()).toBe(6);
    expect(o.hizmet.sayaclar.al("istek.eposta_siniri")).toBe(4);
    o.saat.ilerlet(21 * 60_000); // 3/saat = 20 dakikada bir jeton
    expect((await o.yeniTarayici().post("/giris/istek", { eposta: "kayitsiz@ornek.org" })).durum).toBe(202);
    await o.hizmet.bosta();
    expect(await o.postaSayisi()).toBe(7);
  });

  it("IP basina 20/saat: asilinca 429 + Retry-After (kayitli/kayitsiz ayni); saat gecince yeniden", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    await o.girisYap(o.yeniTarayici(), "kayitli@ornek.org");
    // girisYap bir istek harcadı: 19 istek daha.
    for (let i = 0; i < 19; i++) expect((await o.yeniTarayici().post("/giris/istek", { eposta: `kisi${i}@ornek.org` })).durum).toBe(202);
    const a = await o.yeniTarayici().post("/giris/istek", { eposta: "kayitli@ornek.org" });
    const b = await o.yeniTarayici().post("/giris/istek", { eposta: "kayitsiz@ornek.org" });
    for (const r of [a, b]) {
      expect(r.durum).toBe(429);
      expect(r.json).toEqual({ tamam: false, kod: "hiz_siniri", mesaj: "cok fazla istek; biraz sonra yeniden deneyin", beklemeSn: 60 });
      expect(r.baslik.get("retry-after")).toBe("60");
    }
    expect(a.govde).toBe(b.govde);
    await o.hizmet.bosta();
    expect(o.hizmet.sayaclar.al("istek.hiz_siniri")).toBe(2);
    o.saat.ilerlet(4 * 60_000); // 20/saat: 3 dakikada bir jeton
    expect((await o.yeniTarayici().post("/giris/istek", { eposta: "kisi99@ornek.org" })).durum).toBe(202);
  });

  it("IP, X-Forwarded-For'un son ogesinden okunur (yalniz guvenilir proxy acikken)", async () => {
    ortam = await girisOrtami({ uclar: { guvenilirProxy: true }, hizmet: { sinirlar: { ipBasina: { kapasite: 1, saniyeBasina: 0.0001 } } } });
    const o = ortam;
    const ist = async (ip: string, eposta: string) => {
      const r = await fetch(`${o.taban}/giris/istek`, { method: "POST", headers: { origin: IZINLI, "content-type": "application/json", "x-forwarded-for": `1.2.3.4, ${ip}` }, body: JSON.stringify({ eposta }) });
      return r.status;
    };
    expect(await ist("10.0.0.1", "a@ornek.org")).toBe(202);
    expect(await ist("10.0.0.1", "b@ornek.org")).toBe(429); // aynı istemci (sahte soldaki öğe fark etmez)
    expect(await ist("10.0.0.2", "c@ornek.org")).toBe(202); // başka istemci
    await o.hizmet.bosta();
  });
});

describe("Origin ve CSRF; cerez nitelikleri", () => {
  it("durum degistiren her POST'ta Origin'siz ve yabanci Origin'li istek reddedilir (yan etki yok); izinli gecer", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    await o.girisYap(t, "csrf@ornek.org");
    const postaOnce = await o.postaSayisi();
    const govdeler: Array<[string, unknown]> = [
      ["/giris/istek", { eposta: "baska@ornek.org" }],
      ["/giris/onay", { j: "bag1.x" }],
      ["/giris/bilet", undefined],
      ["/giris/cikis", undefined],
      ["/giris/cikis-tumu", undefined],
    ];
    for (const [yol, govde] of govdeler) {
      for (const origin of [null, "https://kotu.example", "null", "http://localhost:1"]) {
        const r = await t.post(yol, govde, { origin });
        expect(r.durum, `${yol} ${origin}`).toBe(403);
        expect(r.json).toMatchObject({ tamam: false, kod: "origin" });
        expect(r.baslik.get("access-control-allow-origin")).toBeNull();
      }
    }
    await o.hizmet.bosta();
    expect(await o.postaSayisi()).toBe(postaOnce); // reddedilen istek posta göndermedi
    expect((await t.istek("/giris/ben")).durum).toBe(200); // oturum çıkış isteğiyle kapanmadı
    expect(o.hizmet.sayaclar.al("http.origin_reddi")).toBe(govdeler.length * 4);
    // İzinli köken: CORS başlıkları köken yansıtılarak verilir (kimlik bilgili istek).
    const iyi = await t.post("/giris/bilet", undefined, { origin: IZINLI });
    expect(iyi.durum).toBe(200);
    expect(iyi.baslik.get("access-control-allow-origin")).toBe(IZINLI);
    expect(iyi.baslik.get("access-control-allow-credentials")).toBe("true");
    expect(iyi.baslik.get("vary")).toBe("Origin");
    // Sunucunun kendi adresi de izinlidir (onay sayfasının formu); sonda eğik çizgi ve büyük harf önemsiz.
    expect((await t.post("/giris/bilet", undefined, { origin: o.taban.toUpperCase() })).durum).toBe(200);
    // Ön uçuş: izinli köken 204, yabancı 403.
    const pre = await t.istek("/giris/istek", { yontem: "OPTIONS", origin: IZINLI });
    expect(pre.durum).toBe(204);
    expect(pre.baslik.get("access-control-allow-methods")).toBe("GET, POST");
    expect((await t.istek("/giris/istek", { yontem: "OPTIONS", origin: "https://kotu.example" })).durum).toBe(403);
  });

  it("icerik turu: JSON uclari yalniz application/json ister (basit form/duz metin gonderimi 400); yontem 405; bilinmeyen yol 404; govde siniri", async () => {
    ortam = await girisOrtami();
    const t = ortam.yeniTarayici();
    expect((await t.istek("/giris/istek", { yontem: "POST", ham: '{"eposta":"a@ornek.org"}', tur: "text/plain" })).json?.kod).toBe("gecersiz_istek");
    expect((await t.istek("/giris/istek", { yontem: "POST", ham: "eposta=a%40ornek.org" })).json?.kod).toBe("gecersiz_istek");
    expect((await t.istek("/giris/istek", { yontem: "GET" })).durum).toBe(405);
    expect((await t.istek("/giris/ben", { yontem: "POST", govde: {} })).durum).toBe(405);
    expect((await t.istek("/giris/yok")).durum).toBe(404);
    const buyuk = await t.istek("/giris/istek", { yontem: "POST", govde: { eposta: "a@ornek.org", ek: "x".repeat(10_000) } });
    expect(buyuk.durum).toBe(400);
  });

  it("uretimde cerezlere Secure eklenir; gelistirmede eklenmez; HttpOnly, SameSite=Lax, Path her ikisinde", async () => {
    for (const guvenli of [false, true]) {
      ortam = await girisOrtami({ uclar: { cerezGuvenli: guvenli }, hizmet: { tarayiciBagli: true } });
      const t = ortam.yeniTarayici();
      const { jeton } = await ortam.baglantiIste(t, "cerez@ornek.org");
      const istekCerezi = t.sonSetCookie.find((c) => c.startsWith("bolge_giris=")) as string;
      await t.post("/giris/onay", { j: jeton });
      const oturumCerezi = t.sonSetCookie.find((c) => c.startsWith("bolge_oturum=")) as string;
      for (const c of [istekCerezi, oturumCerezi]) {
        expect(c).toMatch(/; HttpOnly/);
        expect(c).toMatch(/; SameSite=Lax/);
        expect(c).toMatch(/; Path=\/giris/);
        expect(/; Secure/.test(c), `${guvenli} ${c}`).toBe(guvenli);
      }
      await ortam.kapat();
      ortam = null;
    }
  });

  it("ws: yabanci Origin el sikismada reddedilir (CSWSH); izinli ve Origin'siz (tarayici disi) acilir", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const baglan = (origin?: string): Promise<{ durum: number | null; ws: WebSocket }> =>
      new Promise((coz) => {
        const ws = new WebSocket(o.ts.url, origin ? { headers: { Origin: origin } } : {});
        ws.once("open", () => coz({ durum: null, ws }));
        ws.once("unexpected-response", (_i, y) => coz({ durum: y.statusCode ?? 0, ws }));
        ws.once("error", () => undefined);
      });
    const kotu = await baglan("https://kotu.example");
    expect(kotu.durum).toBe(401); // ws kütüphanesi verifyClient reddine 401 döner
    for (const o2 of [IZINLI, undefined]) {
      const iyi = await baglan(o2);
      expect(iyi.durum).toBeNull();
      iyi.ws.close();
    }
  });
});

describe("oturum suresi: kayan 30 gun (gunde en cok bir uzama), mutlak 90 gun", () => {
  it("kullanimda kayan sure gunde bir uzar ve cerez yeniden verilir; mutlak 90 gunu asmaz; sonra reddedilir", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    const t0 = o.saat.t;
    await o.girisYap(t, "sure@ornek.org");
    const ben = async (): Promise<Record<string, unknown>> => {
      const r = await t.istek("/giris/ben");
      expect(r.durum).toBe(200);
      return r.json as Record<string, unknown>;
    };
    let b = await ben();
    expect(b.oturumBitis).toBe(t0 + 30 * GUN);
    expect(b.oturumMutlakBitis).toBe(t0 + 90 * GUN);
    o.saat.ilerlet(12 * 3_600_000); // aynı gün: uzamaz
    expect((await ben()).oturumBitis).toBe(t0 + 30 * GUN);
    expect(t.sonSetCookie).toEqual([]);
    o.saat.ilerlet(12 * 3_600_000); // bir gün doldu: uzar, çerez yeni ömürle yeniden verilir
    b = await ben();
    expect(b.oturumBitis).toBe(t0 + 1 * GUN + 30 * GUN);
    expect(t.sonSetCookie.find((c) => c.startsWith("bolge_oturum="))).toMatch(/Max-Age=2592000/);
    // Günde birden çok kez çağrılsa da en çok bir uzama.
    o.saat.ilerlet(3_600_000);
    expect((await ben()).oturumBitis).toBe(t0 + 31 * GUN);
    // 20 günde bir kullanım oturumu canlı tutar; ama mutlak üst sınır (90. gün) aşılmaz.
    for (const gun of [21, 41, 61, 81]) {
      o.saat.t = t0 + gun * GUN;
      b = await ben();
      expect(b.oturumBitis as number).toBe(Math.min(t0 + gun * GUN + 30 * GUN, t0 + 90 * GUN));
    }
    expect((await t.post("/giris/bilet")).durum).toBe(200); // hâlâ geçerli
    o.saat.t = t0 + 90 * GUN; // mutlak sınır
    const son = await t.istek("/giris/ben");
    expect(son.durum).toBe(401);
    expect(son.json?.kod).toBe("oturum_yok");
    expect((await t.post("/giris/bilet")).durum).toBe(401);
    expect((await o.hesapDeposu.sayilar()).oturum).toBe(0); // süresi geçen oturum silindi
  });

  it("kullanilmayan oturum 30 gunde duser", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    await o.girisYap(t, "bos@ornek.org");
    o.saat.ilerlet(30 * GUN - 1);
    expect((await t.istek("/giris/ben")).durum).toBe(200); // bu çağrı uzatır
    o.saat.ilerlet(30 * GUN);
    expect((await t.istek("/giris/ben")).durum).toBe(401);
    // Bakım, hiç kullanılmayan süresi dolmuş oturumları siler.
    const t2 = o.yeniTarayici();
    await o.girisYap(t2, "bos2@ornek.org");
    expect((await o.hesapDeposu.sayilar()).oturum).toBe(1);
    o.saat.ilerlet(31 * GUN);
    await o.hizmet.bakim();
    expect((await o.hesapDeposu.sayilar()).oturum).toBe(0);
  });

  it("yanlis ya da kisaltilmis oturum cerezi reddedilir", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    await o.girisYap(t, "cerezsaldiri@ornek.org");
    const gercek = cerezDegeri(t, "bolge_oturum");
    const [onek, id, gizli] = gercek.split(".") as [string, string, string];
    for (const kotu of [gercek.slice(0, -1), `${onek}.${id}.${gizli.slice(0, -1)}${gizli.endsWith("A") ? "B" : "A"}`, `${onek}.${id}`, `${onek}.${"a".repeat(16)}.${gizli}`, "", "x"]) {
      t.cerezler.set("bolge_oturum", kotu);
      expect((await t.istek("/giris/ben")).durum, kotu).toBe(401);
      expect((await t.post("/giris/bilet")).durum, kotu).toBe(401);
    }
    t.cerezler.set("bolge_oturum", gercek);
    expect((await t.istek("/giris/ben")).durum).toBe(200);
  });
});

describe("ws bileti", () => {
  it("tek kullanimlik: ikinci el sikisma ayni biletle reddedilir (hata kimlik, kapanis 4003)", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    await o.girisYap(t, "bilet@ornek.org");
    const bilet = await biletAl(t);
    const w = await biletleBaglan(o, bilet);
    await expect(biletleBaglan(o, bilet)).rejects.toThrow(/kimlik/);
    expect(o.hizmet.sayaclar.al("bilet.reddedildi_tekrar")).toBe(1);
    // Her çağrı yeni bilet üretir (jti farklı).
    expect(await biletAl(t)).not.toBe(bilet);
    await w.kapat();
  });

  it("60 sn omurlu: enjekte saatle suresi dolan bilet reddedilir; sureden once gecer", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    await o.girisYap(t, "omur@ornek.org");
    const r = await t.post("/giris/bilet");
    expect(r.json?.bitis).toBe(o.saat.t + 60_000);
    const gecer = r.json?.bilet as string;
    const dolacak = await biletAl(t);
    o.saat.ilerlet(59_000);
    await (await biletleBaglan(o, gecer)).kapat();
    o.saat.ilerlet(1_000);
    await expect(biletleBaglan(o, dolacak)).rejects.toThrow(/kimlik/);
    expect(o.hizmet.sayaclar.al("bilet.reddedildi_sure")).toBe(1);
  });

  it("oturuma baglidir: cikistan ONCE alinan bilet cikistan sonra reddedilir; acik ws baglantisi kapanir", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const t = o.yeniTarayici();
    await o.girisYap(t, "cikis@ornek.org");
    const beklemede = await biletAl(t);
    const acik = await biletleBaglan(o, await biletAl(t));
    expect((await t.post("/giris/cikis")).json).toEqual({ tamam: true });
    expect(t.sonSetCookie.find((c) => c.startsWith("bolge_oturum="))).toMatch(/Max-Age=0/);
    await vi.waitFor(() => expect(acik.kapanis?.kod).toBe(4003));
    await expect(biletleBaglan(o, beklemede)).rejects.toThrow(/kimlik/);
    expect(o.hizmet.sayaclar.al("bilet.reddedildi_iptal")).toBe(1);
    expect((await t.post("/giris/bilet")).durum).toBe(401); // çerez silindi
    // Çıkış idempotenttir.
    expect((await t.post("/giris/cikis")).durum).toBe(200);
  });

  it("cikis-tumu: hesabin bütün oturumlari ve biletleri duser; baska hesap etkilenmez", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const a1 = o.yeniTarayici();
    const a2 = o.yeniTarayici();
    const baska = o.yeniTarayici();
    await o.girisYap(a1, "tumu@ornek.org");
    await o.girisYap(a2, "tumu@ornek.org");
    await o.girisYap(baska, "baska@ornek.org");
    const b2 = await biletAl(a2);
    const w2 = await biletleBaglan(o, await biletAl(a2), "i2");
    const wb = await biletleBaglan(o, await biletAl(baska), "ib");
    expect((await a1.post("/giris/cikis-tumu")).durum).toBe(200);
    await vi.waitFor(() => expect(w2.kapanis?.kod).toBe(4003));
    expect(wb.kapanis).toBeNull();
    expect((await a2.istek("/giris/ben")).durum).toBe(401);
    await expect(biletleBaglan(o, b2)).rejects.toThrow(/kimlik/);
    expect((await baska.istek("/giris/ben")).durum).toBe(200);
    expect((await o.yeniTarayici().post("/giris/cikis-tumu")).durum).toBe(401); // çerezsiz
    await wb.kapat();
  });

  it("yonetici ya da sistem icin bilet uretilemez: imzali olsa bile sistem kimligi reddedilir; imza ve sir denetlenir", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const imz = new Imzalayici([BILET_SIRRI]);
    const bitis = o.saat.t + 30_000;
    const sistem = biletUret(imz, { hesap: "h", oyuncu: SISTEM_OYUNCUSU, oturum: "o", bitis }).bilet;
    expect(await o.hizmet.kimlik.dogrula(sistem)).toBeNull();
    const gecersizKimlik = biletUret(imz, { hesap: "h", oyuncu: "BUYUK Harf", oturum: "o", bitis }).bilet;
    expect(await o.hizmet.kimlik.dogrula(gecersizKimlik)).toBeNull();
    const iyi = biletUret(imz, { hesap: "h", oyuncu: "o_abcdefgh", oturum: "o", bitis }).bilet;
    expect(await o.hizmet.kimlik.dogrula(iyi)).toEqual({ oyuncu: "o_abcdefgh", yonetici: false, hesap: "h", oturum: "o" });
    // Yanlış sır, kurcalanmış yük, geliştirme token'ı, çöp.
    const baska = biletUret(new Imzalayici(["baska-bir-sirrin-uzun-hali-0123456789"]), { hesap: "h", oyuncu: "o_abcdefgh", oturum: "o", bitis }).bilet;
    expect(await o.hizmet.kimlik.dogrula(baska)).toBeNull();
    const [onek, yuk, im] = biletUret(imz, { hesap: "h", oyuncu: "o_abcdefgh", oturum: "o", bitis }).bilet.split(".") as [string, string, string];
    const yuk2 = Buffer.from(Buffer.from(yuk, "base64url").toString().replace("o_abcdefgh", "o_zzzzzzzz")).toString("base64url");
    expect(await o.hizmet.kimlik.dogrula(`${onek}.${yuk2}.${im}`)).toBeNull();
    for (const cop of ["", "x", "gel1.ali.xxxx", "bil1..", "bil1.a.b", "x".repeat(2000)]) expect(await o.hizmet.kimlik.dogrula(cop)).toBeNull();
    // Geliştirme token'ı eposta kipinde geçmez (sunucuda yalnız AuthKimligi kurulu).
    const { gelistirmeTokeni } = await import("../src/kimlik");
    await expect(biletleBaglan(o, gelistirmeTokeni("test-sirri-0123456789", "sistem"))).rejects.toThrow(/kimlik/);
  });

  it("sir rotasyonu: eski sirla imzali bilet ve baglanti kabul edilir (iki sir birden)", async () => {
    const eski = "eski-bilet-sirri-0123456789abcdef";
    ortam = await girisOrtami();
    const o = ortam;
    const eskiImz = new Imzalayici([eski]);
    const bitis = o.saat.t + 30_000;
    const eskiBilet = biletUret(eskiImz, { hesap: "h", oyuncu: "o_abcdefgh", oturum: "o", bitis }).bilet;
    expect(await o.hizmet.kimlik.dogrula(eskiBilet)).toBeNull(); // yalnız yeni sır tanımlı
    const { AuthKimligi } = await import("../src/giris/auth-kimligi");
    const donusum = new AuthKimligi({ imzalayici: new Imzalayici([BILET_SIRRI, eski]), simdi: o.saat.simdi });
    expect((await donusum.dogrula(eskiBilet))?.oyuncu).toBe("o_abcdefgh");
    // Yeni sırla imzalananlar da geçer.
    const yeniBilet = biletUret(new Imzalayici([BILET_SIRRI]), { hesap: "h", oyuncu: "o_abcdefgh", oturum: "o2", bitis }).bilet;
    expect((await donusum.dogrula(yeniBilet))?.oyuncu).toBe("o_abcdefgh");
  });
});

describe("gizlilik: depo, gunluk, metrik", () => {
  it("dosya deposunda ACIK belirtec yoktur (yalniz SHA-256 ozetleri); hesap dosyasi yeniden acilinca oturum surer", async () => {
    const dizin = await mkdtemp(join(tmpdir(), "bolge-hesapdosya-"));
    temizlik.push(() => rm(dizin, { recursive: true, force: true }));
    const depo = await dosyaDeposu(dizin);
    ortam = await girisOrtami({ depo, hizmet: { tarayiciBagli: true } });
    const o = ortam;
    const t = o.yeniTarayici();
    const { jeton } = await o.baglantiIste(t, "ozet@ornek.org");
    const tarayiciCerezi = cerezDegeri(t, "bolge_giris");
    await t.post("/giris/onay", { j: jeton });
    const oturumBelirteci = cerezDegeri(t, "bolge_oturum");
    const bilet = await biletAl(t);
    const metin = await readFile(join(dizin, "hesap.jsonl"), "utf8");
    const [, rastgele] = jeton.split(".") as [string, string];
    const [, , gizli] = oturumBelirteci.split(".") as [string, string, string];
    for (const gizliDeger of [jeton, rastgele, tarayiciCerezi, oturumBelirteci, gizli, bilet]) expect(metin).not.toContain(gizliDeger);
    expect(metin).toContain("ozet@ornek.org"); // tek kişisel veri: e-posta
    expect(metin).not.toMatch(/127\.0\.0\.1|user-agent/i); // IP ve tarayıcı bilgisi tutulmaz
    // Özetler SHA-256 (base64url 43 karakter) olarak durur.
    expect(metin).toMatch(/"gizliOzet":"[A-Za-z0-9_-]{43}"/);
    await o.kapat();
    ortam = null;
    await depo.gunluk.kapat();
    // Yeniden açılış: aynı çerezle oturum sürer.
    const depo2 = await dosyaDeposu(dizin);
    ortam = await girisOrtami({ depo: depo2 });
    const t2 = ortam.yeniTarayici();
    t2.cerezler.set("bolge_oturum", oturumBelirteci);
    expect((await t2.istek("/giris/ben")).json?.eposta).toBe("ozet@ornek.org");
    await ortam.kapat();
    ortam = null;
    await depo2.gunluk.kapat();
  });

  it("giris akisi boyunca gunluk, stdout/stderr ve metrik belirtec, tam e-posta adresi ya da IP yazmaz; metrik sayaclari vardir", async () => {
    const yazilan: string[] = [];
    const sarmala = (a: unknown): boolean => (yazilan.push(typeof a === "string" ? a : Buffer.from(a as Uint8Array).toString()), true);
    vi.spyOn(process.stdout, "write").mockImplementation(sarmala);
    vi.spyOn(process.stderr, "write").mockImplementation(sarmala);
    const posta = new BellekPostaGondericisi();
    ortam = await girisOrtami({ posta });
    const o = ortam;
    const t = o.yeniTarayici();
    await t.post("/giris/istek", { eposta: "gizlikisi@gizlialan.org" });
    await o.hizmet.bosta();
    const mektup = posta.gonderilenler[0];
    const jeton = new URL(mektup?.baglanti as string).searchParams.get("j") as string;
    await t.istek(`/giris/onay?j=${encodeURIComponent(jeton)}`);
    await t.post("/giris/onay", { j: jeton });
    await t.post("/giris/onay", { j: jeton }); // tekrar (red)
    const oturum = cerezDegeri(t, "bolge_oturum");
    const bilet = await biletAl(t);
    const w = await biletleBaglan(o, bilet);
    await biletleBaglan(o, bilet).catch(() => undefined); // tekrar (red)
    await t.post("/giris/istek", { eposta: "kotu adres" });
    await t.post("/giris/cikis");
    posta.hataVer = new Error("sunucu hatasi gizlikisi@gizlialan.org");
    await t.post("/giris/istek", { eposta: "gizlikisi@gizlialan.org" });
    await o.hizmet.bosta();
    const metrik = await o.ts.sunucu.metrikMetni();
    await w.kapat();
    const hepsi = JSON.stringify(o.gunluk) + yazilan.join("") + metrik;
    for (const sir of ["gizlikisi", "gizlikisi@gizlialan.org", jeton, oturum, oturum.split(".")[2] as string, bilet, "127.0.0.1", "::1"]) {
      expect(hepsi, sir).not.toContain(sir);
    }
    expect(o.gunluk.map((g) => g.olay)).toEqual(expect.arrayContaining(["giris_posta_gonderildi", "giris_onaylandi", "giris_posta_hatasi"]));
    expect(o.gunluk.find((g) => g.olay === "giris_posta_gonderildi")?.veri).toEqual({ eposta_hmac: new GunlukKimligi(GUNLUK_TUZU).eposta("gizlikisi@gizlialan.org") });
    expect(hepsi).not.toMatch(/gizlialan|\*\*\*@/); // alan adı ve maskeli hâl de günlükte/metrikte yok
    // Metrik: yalnız toplu sayılar.
    expect(metrik).toContain('bolge_giris_olay_toplam{olay="onay.tamam"} 1');
    expect(metrik).toContain('bolge_giris_olay_toplam{olay="onay.baglanti_gecersiz"} 1');
    expect(metrik).toContain('bolge_giris_olay_toplam{olay="bilet.reddedildi_tekrar"} 1');
    expect(metrik).toContain('bolge_giris_olay_toplam{olay="posta.hata"} 1');
  });
});

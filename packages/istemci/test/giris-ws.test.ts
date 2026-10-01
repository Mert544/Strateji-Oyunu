/**
 * Giriş mantığı (G9-a) GERÇEK sunucuya karşı: e-posta kimliği (`GirisUclari` + `GirisHizmeti`, `--kimlik eposta` ile aynı bileşenler),
 * dosya postacısı, enjekte saat ve çerez kavanozlu `fetch` (Node'da tarayıcı çerezi yoktur). Kapsam: istek → posta → onay → bilet →
 * `merhaba.token` → `hosgeldin`; bilet yenileme ve süre; oturum bitince G-7; e-posta başına sınırın sessizliği ve istemci sayacı;
 * geliştirme kimliği sabit token'la aynen çalışır.
 */
import { afterEach, describe, expect, it } from "vitest";
import { token } from "../../sunucu/test/yardimci";
import { IZINLI, girisOrtami } from "../../sunucu/test/giris-yardimci";
import type { GirisOrtami } from "../../sunucu/test/giris-yardimci";
import { testSunucusu, mulkVerisi } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import { GirisApi } from "../src/giris/api";
import { GirisAkisi, YENIDEN_GONDER_MS } from "../src/giris/akis";
import { BILET_OMRU_MS, BiletSaglayici } from "../src/giris/oturum";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { adKanonik } from "@bolge/cekirdek";

let ortam: GirisOrtami | null = null;
let ts2: TestSunucusu | null = null;
const baglantilar: WsBaglanti[] = [];
afterEach(async () => {
  for (const b of baglantilar.splice(0)) b.kapat();
  await ortam?.kapat();
  ortam = null;
  await ts2?.kapat();
  ts2 = null;
});

async function bekle(kosul: () => boolean, ms = 8000): Promise<void> {
  const son = Date.now() + ms;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("koşul zamanında sağlanmadı");
    await new Promise((c) => setTimeout(c, 10));
  }
}

/** Tarayıcı çerez kavanozu gibi davranan `fetch`: Origin yollar, Set-Cookie'yi saklar, Cookie'yi geri verir. */
function cerezliFetch(origin: string): { fetch: typeof fetch; cerezler: Map<string, string> } {
  const cerezler = new Map<string, string>();
  const fn = (async (girdi: string | URL | Request, init?: RequestInit) => {
    const baslik = new Headers(init?.headers);
    baslik.set("origin", origin);
    const c = [...cerezler].map(([a, d]) => `${a}=${d}`).join("; ");
    if (c !== "") baslik.set("cookie", c);
    const r = await fetch(girdi, { ...init, headers: baslik });
    for (const s of r.headers.getSetCookie()) {
      const [cift = ""] = s.split(";");
      const i = cift.indexOf("=");
      if (/max-age=0(;|$)/i.test(s)) cerezler.delete(cift.slice(0, i));
      else cerezler.set(cift.slice(0, i), cift.slice(i + 1));
    }
    return r;
  }) as typeof fetch;
  return { fetch: fn, cerezler };
}

function istemci(o: GirisOrtami, kavanoz = cerezliFetch(IZINLI)) {
  const simdi = (): number => o.saat.simdi();
  const api = new GirisApi({ taban: o.taban, fetch: kavanoz.fetch });
  const saglayici = new BiletSaglayici({ api, simdi, uyu: async () => undefined });
  const akis = new GirisAkisi({ api, saglayici, simdi });
  return { api, saglayici, akis, kavanoz };
}

function wsAc(o: GirisOrtami, saglayici: BiletSaglayici): Promise<WsBaglanti> {
  return WsBaglanti.ac({ url: o.ts.url, token: saglayici.bilet, istemciKimligi: "t-giris", geriCekilmeMs: { ilk: 30, en: 100 } }).then((b) => {
    baglantilar.push(b);
    return b;
  });
}

/** Kullanıcı adımları: adres yaz, postadaki bağlantıyı aç (`?j=`), giriş yap. */
async function girisYap(o: GirisOrtami, c: ReturnType<typeof istemci>, eposta: string): Promise<void> {
  await c.akis.basla();
  await c.akis.epostaGonder(eposta);
  expect(c.akis.durum.ekran).toBe("g2");
  await o.hizmet.bosta();
  const { jeton } = await o.sonPosta();
  await c.akis.basla(jeton);
  expect(c.akis.durum.ekran).toBe("g3");
  await c.akis.onayla();
  if (c.akis.durum.ekran === "g4") await c.akis.adKaydet("deneme oyuncu"); // görünen ad özelliği açıksa (adKurali) yeni hesap g4'ten geçer
}

describe("giriş mantığı: gerçek sunucu, e-posta kimliği", () => {
  it("tam akış: g1 → g2 → posta → g3 → yeni hesap g4 → oyun; ws bilet işleviyle bağlanır, kimlik biletten gelir", async () => {
    ortam = await girisOrtami({ hizmet: { adKurali: adKanonik } });
    const o = ortam;
    const c = istemci(o);
    await c.akis.basla();
    expect(c.akis.durum).toMatchObject({ ekran: "g1", hata: null });

    await c.akis.epostaGonder("Ali@Ornek.org");
    expect(c.akis.durum).toMatchObject({ ekran: "g2", eposta: "Ali@Ornek.org", gonderimSayisi: 1, tekrarSiniri: false, gecerlilikSn: 600 });
    await o.hizmet.bosta();
    expect(await o.postaSayisi()).toBe(1);
    const { jeton, posta } = await o.sonPosta();
    expect(posta.kime).toBe("ali@ornek.org");

    await c.akis.basla(jeton); // adresteki ?j=
    expect(c.akis.durum).toMatchObject({ ekran: "g3", jetonVar: true });
    await c.akis.onayla();
    expect(c.akis.durum).toMatchObject({ ekran: "g4", yeniHesap: true });
    const oyuncu = c.akis.durum.oyuncu!;
    expect(oyuncu).toMatch(/^o_/);
    // Çerez httpOnly'dir: kavanoz (tarayıcı) taşır, istemci kodu okumaz; token hiçbir yere yazılmadı
    expect([...c.kavanoz.cerezler.keys()]).toContain("bolge_oturum");

    expect(c.akis.durum).toMatchObject({ adSecildi: false });
    expect(c.akis.durum.ad).toBeTruthy(); // sunucu opak bir ad üretti; alan onunla dolu
    await c.akis.adKaydet("Deneme Oyuncu");
    expect(c.akis.durum).toMatchObject({ ekran: "oyun", oyuncu, ad: "deneme oyuncu", adSecildi: true });
    const ws = await wsAc(o, c.saglayici);
    expect(ws.ben.id).toBe(oyuncu);
    expect(ws.durum).toBe("bagli");
  });

  it("dönen oyuncu: çerez varsa açılışta doğrudan oyun (bilet önden); çerez yoksa g1", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const ilk = istemci(o);
    await girisYap(o, ilk, "veli@ornek.org");
    const oyuncu = ilk.akis.durum.oyuncu!;

    // Aynı tarayıcı (aynı çerez kavanozu), yeni sayfa yüklemesi
    const donen = istemci(o, ilk.kavanoz);
    await donen.akis.basla();
    expect(donen.akis.durum).toMatchObject({ ekran: "oyun", oyuncu, yeniHesap: false });
    expect(donen.saglayici.alinan).toBe(1); // bilet önden alındı
    const ws = await wsAc(o, donen.saglayici);
    expect(ws.ben.id).toBe(oyuncu);
    expect(donen.saglayici.alinan).toBe(1); // önceden alınan bilet harcandı, ikinci bilet alınmadı

    // Çerezsiz yeni tarayıcı
    const yeni = istemci(o);
    await yeni.akis.basla();
    expect(yeni.akis.durum).toMatchObject({ ekran: "g1", hata: null });
  });

  it("bilet 60 sn ömürlü ve tek kullanımlık: süresi yaklaşan önbellek bileti yenilenir, eski bilet sunucuda geçmez", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const c = istemci(o);
    await girisYap(o, c, "ayse@ornek.org");
    expect(c.akis.durum.ekran).toBe("oyun");
    const eskiBilet = (await c.saglayici.onceden()).bilet;
    o.saat.ilerlet(BILET_OMRU_MS - 5_000); // marj içinde: önbellek atılır, yeni bilet alınır
    const yeni = await c.saglayici.bilet();
    expect(yeni).not.toBe(eskiBilet);
    const ws = await wsAc(o, c.saglayici);
    expect(ws.durum).toBe("bagli");
    ws.kapat();
    // Karşı deneme: süresi dolmuş bileti sabit token olarak verirsek sunucu reddeder
    o.saat.ilerlet(BILET_OMRU_MS + 1_000);
    await expect(WsBaglanti.ac({ url: o.ts.url, token: eskiBilet, istemciKimligi: "t-eski", geriCekilmeMs: { ilk: 30, en: 100 } })).rejects.toThrow(/Oturum doğrulanamadı/);
  });

  it("ws koparsa yeni bilet alınır (tek kullanımlık bilet yeniden gönderilmez) ve oyun sürer", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const c = istemci(o);
    await girisYap(o, c, "can@ornek.org");
    const ws = await wsAc(o, c.saglayici);
    const once = c.saglayici.alinan;
    // Ağ kopması: soket kimlik reddi (4003) olmayan bir kodla kapanır; oturum geçerli
    (ws as unknown as { ws: WebSocket }).ws.close(4000, "test kopmasi");
    await bekle(() => c.saglayici.alinan > once && ws.durum === "bagli");
    expect(c.saglayici.alinan).toBe(once + 1);
    expect(ws.sunucuHatalari).toEqual([]);
  });

  it("oturum kapanınca (çıkış) ws kimlik reddi alır: bir kez sessiz yeniden deneme, bilet 401 → reddedildi ve g7", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const c = istemci(o);
    await girisYap(o, c, "deniz@ornek.org");
    const ws = await wsAc(o, c.saglayici);
    expect(c.akis.durum.ekran).toBe("oyun");
    // Başka cihazdan "tüm cihazlardan çık": sunucu bu oturumun ws bağlantısını 4003 ile kapatır
    const baska = istemci(o, c.kavanoz); // aynı hesap/çerez
    expect((await baska.api.cikisTumu()).tamam).toBe(true);
    await bekle(() => ws.durum === "reddedildi");
    expect(c.akis.durum).toMatchObject({ ekran: "g7", hata: { kod: "oturum_yok", anahtar: "giris.G6.oturum_yok" } });
    // g7 → giriş yap → g1
    c.akis.yenidenGirisYap();
    expect(c.akis.durum.ekran).toBe("g1");
  });

  it("geçersiz bağlantı: baglanti_gecersiz; kullanılmış bağlantı ikinci kez geçmez", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const c = istemci(o);
    await c.akis.basla("bag1.bozuk.1.imza");
    await c.akis.onayla();
    expect(c.akis.durum).toMatchObject({ ekran: "g3", jetonVar: false, hata: { kod: "baglanti_gecersiz", eylem: "yeni-baglanti-iste" } });
    c.akis.yeniBaglantiIste();
    expect(c.akis.durum.ekran).toBe("g1");

    // Gerçek jeton: ilk onay geçer, aynı bağlantı yeniden açılınca geçmez
    await c.akis.epostaGonder("eda@ornek.org");
    await o.hizmet.bosta();
    const { jeton } = await o.sonPosta();
    await c.akis.basla(jeton);
    await c.akis.onayla();
    expect(c.akis.durum.ekran).toBe("oyun"); // görünen ad özelliği kapalı: ad ekranı yok
    const baskasi = istemci(o);
    await baskasi.akis.basla(jeton);
    await baskasi.akis.onayla();
    expect(baskasi.akis.durum).toMatchObject({ ekran: "g3", hata: { kod: "baglanti_gecersiz" } });
  });

  it("geçersiz ve geçici adresler: sunucu kodu g1'de alanda kalır; davet/sınır bilgisi sızmaz", async () => {
    ortam = await girisOrtami();
    const c = istemci(ortam);
    await c.akis.basla();
    await c.akis.epostaGonder("yok@");
    expect(c.akis.durum.hata).toMatchObject({ kod: "gecersiz_eposta", eylem: "alanda-kal" });
    await c.akis.epostaGonder("tek.kullanimlik@mailinator.com");
    expect(c.akis.durum).toMatchObject({ ekran: "g1", hata: { kod: "gecici_eposta", anahtar: "giris.G6.gecici_eposta" } });
    expect(await ortam.postaSayisi()).toBe(0);
  });

  it("e-posta başına sunucu sınırı sessizdir (4. istek de 202, posta gitmez); istemci sayacı 3. gönderimden sonra tekrarSiniri açar", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const c = istemci(o);
    await c.akis.basla();
    await c.akis.epostaGonder("zeynep@ornek.org");
    for (let i = 2; i <= 4; i++) {
      o.saat.ilerlet(YENIDEN_GONDER_MS);
      await c.akis.yenidenGonder();
      await o.hizmet.bosta();
      expect(c.akis.durum, `${i}. gönderim`).toMatchObject({ ekran: "g2", hata: null, gonderimSayisi: i, tekrarGonderildi: true });
    }
    expect(c.akis.durum.tekrarSiniri).toBe(true);
    // Sunucu 3/saat'ten sonra posta göndermedi ama ekran farkı göremez (yanıt aynı): istemci sayacının nedeni budur
    expect(await o.postaSayisi()).toBe(3);
  });

  it("farklı adres aynı sayaçta toplanmaz; sayaç sayfa belleğindedir (yeni akış nesnesi sıfırdan)", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const c = istemci(o);
    await c.akis.epostaGonder("a1@ornek.org");
    c.akis.adresiDegistir();
    await c.akis.epostaGonder("a2@ornek.org");
    expect(c.akis.durum.gonderimSayisi).toBe(1);
    const yenisi = istemci(o);
    await yenisi.akis.epostaGonder("a1@ornek.org");
    expect(yenisi.akis.durum.gonderimSayisi).toBe(1);
  });

  it("sunucuya ulaşılamıyor: ağ hatası kodu ve g1'de yeniden deneme", async () => {
    ortam = await girisOrtami();
    const o = ortam;
    const sahte = istemci(o);
    const kopuk = new GirisApi({ taban: "http://127.0.0.1:1", fetch: sahte.kavanoz.fetch, zamanAsimiMs: 2000 });
    const saglayici = new BiletSaglayici({ api: kopuk });
    const akis = new GirisAkisi({ api: kopuk, saglayici });
    await akis.basla();
    expect(akis.durum).toMatchObject({ ekran: "g1", hata: { kod: "ag_hatasi", anahtar: "giris.G6.ag_hatasi", eylem: "yeniden-dene" } });
    await akis.epostaGonder("ali@ornek.org");
    expect(akis.durum).toMatchObject({ ekran: "g1", hata: { kod: "ag_hatasi" } });
  });
});

describe("görünen ad (G9-c): gerçek sunucu, adKurali açık", () => {
  async function adliOrtam(): Promise<GirisOrtami> {
    ortam = await girisOrtami({ hizmet: { adKurali: adKanonik } });
    return ortam;
  }

  async function yeniHesapG4(o: GirisOrtami, eposta: string) {
    const c = istemci(o);
    await c.akis.basla();
    await c.akis.epostaGonder(eposta);
    await o.hizmet.bosta();
    const { jeton } = await o.sonPosta();
    await c.akis.basla(jeton);
    await c.akis.onayla();
    expect(c.akis.durum).toMatchObject({ ekran: "g4", adSecildi: false });
    return c;
  }

  it("Başka öner opak öneri getirir (kaydetmez); alan sunucunun adıyla dolu gelir; hız sınırı g4'te kalır", async () => {
    const o = await adliOrtam();
    const c = await yeniHesapG4(o, "oya@ornek.org");
    const ilkAd = c.akis.durum.ad!;
    expect(c.akis.durum.adGirdi).toBe(ilkAd);
    expect(adKanonik(ilkAd)).toMatchObject({ tamam: true, ad: ilkAd }); // kanonik, küçük harfli
    const surum = c.akis.durum.adSurumu;
    await c.akis.adOner();
    expect(c.akis.durum.adSurumu).toBe(surum + 1);
    expect(c.akis.durum.adGirdi).not.toBe("");
    expect(c.akis.durum.ad).toBe(ilkAd); // öneri kaydetmedi
    expect(await c.api.ben()).toMatchObject({ tamam: true, veri: { ad: ilkAd, adSecildi: false } });
    // oturum başına sınır (kapasite 10): sınırı aşınca hiz_siniri g4'te alan hatası olarak kalır, oyun açılmaz
    for (let i = 0; i < 12; i++) await c.akis.adOner();
    expect(c.akis.durum).toMatchObject({ ekran: "g4", adYukleniyor: false });
    expect(c.akis.durum.hata).toMatchObject({ kod: "hiz_siniri" });
  });

  it("adı seçmek: kanonik küçük harf kaydedilir, oyuna geçilir, ws kimlik açar; ben() adSecildi=true", async () => {
    const o = await adliOrtam();
    const c = await yeniHesapG4(o, "kaan@ornek.org");
    const oyuncu = c.akis.durum.oyuncu!;
    expect(await c.akis.adKaydet("Işık Çiftliği")).toBe(true);
    expect(c.akis.durum).toMatchObject({ ekran: "oyun", ad: "ışık çiftliği", adSecildi: true, oyuncu });
    const ben = await c.api.ben();
    expect(ben).toMatchObject({ tamam: true, veri: { ad: "ışık çiftliği", adSecildi: true } });
    const ws = await wsAc(o, c.saglayici);
    expect(ws.ben.id).toBe(oyuncu);
  });

  it("yerel ret ağa gitmez; sunucu reddi (yasaklı olmayan kural farkı yok) alan hatasıdır; ad değişmez", async () => {
    const o = await adliOrtam();
    const c = await yeniHesapG4(o, "naz@ornek.org");
    const onceki = c.akis.durum.ad;
    expect(await c.akis.adKaydet("a")).toBe(false);
    expect(c.akis.durum.hata?.anahtar).toBe("giris.G4.uzunluk");
    expect(await c.akis.adKaydet("ali@x")).toBe(false);
    expect(c.akis.durum.hata?.anahtar).toBe("giris.G4.karakter");
    expect(c.akis.durum).toMatchObject({ ekran: "g4", ad: onceki });
    expect(await c.api.ben()).toMatchObject({ tamam: true, veri: { ad: onceki, adSecildi: false } });
  });

  it("dönen hesap adı hiç seçmediyse açılışta g4; seçtiyse doğrudan oyun; Ayarlar değişimi günde bir kez (ad_sinir)", async () => {
    const o = await adliOrtam();
    const c = await yeniHesapG4(o, "efe@ornek.org");
    // adı seçmeden sayfa yenilendi: aynı çerez, yeni sayfa
    const yenile = istemci(o, c.kavanoz);
    await yenile.akis.basla();
    expect(yenile.akis.durum).toMatchObject({ ekran: "g4", oyuncu: c.akis.durum.oyuncu, adSecildi: false });
    await yenile.akis.adKaydet("efe usta");
    expect(yenile.akis.durum).toMatchObject({ ekran: "oyun", ad: "efe usta" });
    const sonra = istemci(o, c.kavanoz);
    await sonra.akis.basla();
    expect(sonra.akis.durum).toMatchObject({ ekran: "oyun", ad: "efe usta", adSecildi: true });
    // otomatik addan ilk seçim günlük sınıra sayılmaz: bugün ilk değişiklik serbest, ikincisi ad_sinir
    expect(await sonra.akis.adKaydet("efe baba")).toBe(true);
    expect(sonra.akis.durum).toMatchObject({ ekran: "oyun", ad: "efe baba", adSonuc: "efe baba" });
    expect(await sonra.akis.adKaydet("efe dede")).toBe(false);
    expect(sonra.akis.durum.hata).toMatchObject({ kod: "ad_sinir", anahtar: "giris.G4.gunluk_sinir" });
    expect(sonra.akis.adSinirDolu()).toBe(true);
    expect(sonra.akis.durum.ad).toBe("efe baba");
    // bir sonraki gün serbest (saat ilerler)
    o.saat.ilerlet(25 * 3_600_000);
    expect(sonra.akis.adSinirDolu()).toBe(false);
  });
});

describe("hesabı sil (istek): gerçek sunucu", () => {
  it("onay bağlantısı e-postaya gider, hiçbir şey silinmez: oturum, ad ve ws yerinde; oturumsuz istek oturum_yok", async () => {
    ortam = await girisOrtami({ hizmet: { adKurali: adKanonik } });
    const o = ortam;
    const c = istemci(o);
    await girisYap(o, c, "silme@ornek.org");
    expect(c.akis.durum.ekran).toBe("oyun");
    const once = await o.postaSayisi();
    const r = await c.akis.hesapSil();
    expect(r).toMatchObject({ gecerlilikSn: expect.any(Number) });
    await o.hizmet.bosta();
    expect(await o.postaSayisi()).toBe(once + 1);
    expect((await o.sonPosta()).posta.kime).toBe("silme@ornek.org");
    expect(c.akis.durum).toMatchObject({ ekran: "oyun", hata: null });
    expect(await c.api.ben()).toMatchObject({ tamam: true }); // oturum yerinde
    const ws = await wsAc(o, c.saglayici);
    expect(ws.durum).toBe("bagli");
    // oturumsuz tarayıcı: oturum_yok → g7
    const yabanci = istemci(o);
    expect(await yabanci.api.hesapSil()).toMatchObject({ tamam: false, kod: "oturum_yok" });
  });
});

describe("geliştirme kimliği değişmedi", () => {
  it("sabit token dizgisi `merhaba.token` olarak aynen çalışır (giriş ekranı yok)", async () => {
    ts2 = await testSunucusu({ veri: mulkVerisi() });
    const b = await WsBaglanti.ac({ url: ts2.url, token: token("ali"), istemciKimligi: "t-dev", geriCekilmeMs: { ilk: 30, en: 100 } });
    baglantilar.push(b);
    expect(b.ben.id).toBe("ali");
  });

  it("geliştirme sunucusunda giriş uçları yoktur: açılış kararı kip tablosundan verilir (probe yok)", async () => {
    ts2 = await testSunucusu({ veri: mulkVerisi() });
    const taban = `http://127.0.0.1:${ts2.sunucu.port}`;
    const r = await new GirisApi({ taban, fetch: cerezliFetch(IZINLI).fetch }).ben();
    expect(r.tamam).toBe(false); // 404/bulunamadi: kip `?token=` ile seçilir, bu uç kullanılmaz
  });
});

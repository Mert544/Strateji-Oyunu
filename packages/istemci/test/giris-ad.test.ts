/**
 * Görünen ad (G9-c): istemci ad denetiminin çekirdek `adKanonik` ile aynılığı, g4 ve Ayarlar HTML iskeleti, rıza sahip metni, API doğrulayıcıları.
 * DOM yok; görünüm olay bağlama gerçek sunucu testindedir (giris-ws).
 */
import { describe, expect, it, vi } from "vitest";
import { adKanonik, adSozdizimiHatasi } from "@bolge/cekirdek";
import { AD_MAX, AD_YER, adCanliHatasi, adHataAnahtari, adHatasi, adKucuk, adOnizleme } from "../src/giris/ad";
import type { GirisDurumu } from "../src/giris/akis";
import { GIRIS_YOLLARI as PROTOKOL_YOLLARI } from "@bolge/protokol";
import { GIRIS_YOLLARI, GirisApi } from "../src/giris/api";
import { girisHtml, hesapHtml } from "../src/giris/ekran-html";
import { GIRIS_METIN, metin, metinVar, rizaMetni } from "../src/giris/giris-metin";


const ORNEKLER = [
  "ali", "Ali", "ALİ", "IŞIK", "ışık", "İstanbul", "Çiğdem Ünal", "a", "", "ab", "x".repeat(24), "x".repeat(25), " ali", "ali ", "ali  veli", "123", "...", "&-.'", "ali_veli",
  'ali "x"', "ali — x", "ali – x", "ali ’x", "ali@x", "çalışkan değirmenci 427", "ÖĞÜŞÇİ", "Ömer & Oğul", "a b", "a  b", "Şükrü.", "ZZ", "i̇", "ΑΒΓ",
];

describe("istemci ad denetimi çekirdekle aynı", () => {
  it("geçerlilik ve küçük harf: örnek kümesinde adKanonik ile birebir", () => {
    for (const ad of ORNEKLER) {
      const c = adKanonik(ad);
      expect(adHatasi(ad) === null, `geçerlilik: ${JSON.stringify(ad)}`).toBe(c.tamam);
      expect(adSozdizimiHatasi(ad) === null).toBe(adHatasi(ad) === null);
      if (c.tamam) {
        expect(adKucuk(ad), ad).toBe(c.ad);
        expect(adOnizleme(ad)).toBe(c.ad);
      } else expect(adOnizleme(ad)).toBeNull();
    }
  });

  it("kural sabitleri çekirdekle aynı", () => {
    expect(AD_MAX).toBe(24);
    expect(adHatasi("x".repeat(24))).toBeNull();
    expect(adHatasi("x".repeat(25))).toBe("uzunluk");
    expect(adHatasi("a")).toBe("uzunluk");
  });

  it("hata sırası ve türleri: uzunluk, karakter (çift tırnak/uzun tire ayrı), baş/son boşluk, art arda boşluk, harf", () => {
    expect(adHatasi("a")).toBe("uzunluk");
    expect(adHatasi("ali@x")).toBe("karakter");
    expect(adHatasi('ali "x"')).toBe("cift_tirnak_tire");
    expect(adHatasi("ali — x")).toBe("cift_tirnak_tire");
    expect(adHatasi("ali ’x")).toBe("karakter");
    expect(adHatasi(" ali")).toBe("bosluk_kenar");
    expect(adHatasi("ali  veli")).toBe("bosluk_art_arda");
    expect(adHatasi("123")).toBe("harf_gerekli");
    expect(adHatasi("ali veli")).toBeNull();
  });

  it("canlı hata yalnız yazarken düzeltilebilecekler: karakter, art arda boşluk, fazla uzunluk; kısalık ve baş/son boşluk susar", () => {
    expect(adCanliHatasi("")).toBeNull();
    expect(adCanliHatasi("a")).toBeNull();
    expect(adCanliHatasi("ali ")).toBeNull();
    expect(adCanliHatasi("123")).toBeNull();
    expect(adCanliHatasi("ali@")).toBe("karakter");
    expect(adCanliHatasi('ali"')).toBe("cift_tirnak_tire");
    expect(adCanliHatasi("ali  ")).toBe("bosluk_art_arda");
    expect(adCanliHatasi("x".repeat(25))).toBe("uzunluk");
  });

  it("hata türleri metin tablosunda var ve büyük harfli sözcük yok", () => {
    for (const t of ["uzunluk", "karakter", "cift_tirnak_tire", "bosluk_kenar", "bosluk_art_arda", "harf_gerekli"] as const) {
      expect(metinVar(adHataAnahtari(t)), t).toBe(true);
      expect(metin(adHataAnahtari(t))).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,}\b/);
    }
    for (const a of ["giris.G4.gunluk_sinir", "giris.G4.ad_yasakli", "giris.G4.dugme_oner", "giris.G4.ayar_satiri", "giris.G4.ayar_degistir", "giris.G4.ayar_sonuc"]) expect(metinVar(a), a).toBe(true);
  });
});

const durum = (k: Partial<GirisDurumu> = {}): GirisDurumu => ({
  ekran: "g4", eposta: "", gonderiyor: false, hata: null, yenidenGonderBitis: 0, gonderimSayisi: 0, tekrarSiniri: false, tekrarGonderildi: false, gecerlilikSn: 600,
  jetonVar: false, basari: false, oyuncu: "o_1", yeniHesap: true, cikisYapildi: false, ad: "çalışkan çiftçi 427", adSecildi: false, adGirdi: "çalışkan çiftçi 427", adSurumu: 1,
  adYukleniyor: false, adSinirBitis: 0, adSonuc: null, ...k,
});
const b = (adDegeri?: string) => ({ kalanSn: () => 0, epostaDegeri: "", ...(adDegeri !== undefined ? { adDegeri } : {}) });

describe("g4 iskeleti (T1 sözleşmesi: öğe, sınıf, öznitelik)", () => {
  it("başlık, gövde, alan (öznitelikler), sayaç, büyük harf notu, önizleme, iki düğme", () => {
    const h = girisHtml(durum(), b());
    expect(h).toContain(`<section class="gr-ekran" data-ekran="g4" data-durum="bos" aria-labelledby="gr-baslik">`);
    expect(h).toContain(`<h1 id="gr-baslik" class="gr-baslik" tabindex="-1">Sana ne diyelim?</h1>`);
    expect(h).toContain("Bu ad dünyadaki herkese görünür. Gerçek adını yazman gerekmez. Adını günde bir kez değiştirebilirsin.");
    expect(h).toContain(`<label class="gr-etiket" for="gr-ad">Görünen adın</label>`);
    expect(h).toMatch(/<input id="gr-ad" class="gr-girdi" type="text" name="ad" maxlength="24" autocomplete="nickname" autocapitalize="off" spellcheck="false" value="çalışkan çiftçi 427"/);
    expect(h).toContain(`<span class="gr-sayac" data-alan="ad-sayac">19 / 24</span>`);
    expect(h).toContain("Büyük harf yazabilirsin; adın küçük harfle kaydedilir.");
    expect(h).toContain(`<p class="gr-onizleme" data-alan="ad-onizleme" aria-live="polite">Dünyada böyle görünürsün: çalışkan çiftçi 427</p>`);
    expect(h).toContain(`<button class="birincil gr-dugme" type="submit" data-eylem="ad-tamam">Tamam</button>`);
    expect(h).toMatch(/<button class="eylem gr-dugme" type="button" data-eylem="ad-oner"><svg[^>]*><use href="#i-refresh-cw"><\/use><\/svg> Başka öner<\/button>/);
    expect(h).toContain(`<p id="gr-ad-hata" class="gr-hata" role="alert"></p>`);
    expect(h).toContain(`aria-describedby="gr-ad-ipucu gr-ad-hata"`);
  });

  it("yazılan değer (adDegeri) önerinin önüne geçer; önizleme küçük hâli (I → ı, İ → i); geçersizde önizleme yok", () => {
    expect(girisHtml(durum(), b("IŞIK İz"))).toContain("Dünyada böyle görünürsün: ışık iz");
    const gecersiz = girisHtml(durum(), b("a"));
    expect(gecersiz).toContain(`data-alan="ad-onizleme" aria-live="polite"></p>`);
  });

  it("ham yer tutucu çıkmaz: sayaç {en_cok}, uzunluk hatası {en_az}/{en_cok} kuraldan doldurulur", () => {
    expect(girisHtml(durum(), b("a"))).not.toMatch(/\{[a-z_]+\}/);
    const kisa = girisHtml(durum({ hata: { kod: "ad_gecersiz", anahtar: "giris.G4.uzunluk", eylem: "alanda-kal" } }), b("a"));
    expect(kisa).toContain("Ad 2 ile 24 karakter arasında olmalı.");
    expect(kisa).not.toMatch(/\{[a-z_]+\}/);
    expect(metin("giris.G4.sayac", { n: 5, ...AD_YER })).toBe("5 / 24");
  });

  it("canlı hata (izinsiz karakter) ve sunucu hatası alanda: aria-invalid, data-kod, role=alert", () => {
    const canli = girisHtml(durum(), b('ali "x"'));
    expect(canli).toContain(`aria-invalid="true" data-durum="hata"`);
    expect(canli).toContain(`data-kod="ad_gecersiz">Çift tırnak ya da uzun tire yerine`);
    const sunucu = girisHtml(durum({ hata: { kod: "ad_yasakli", anahtar: "giris.G4.ad_yasakli", eylem: "alanda-kal" } }), b());
    expect(sunucu).toContain(`data-durum="hata"`);
    expect(sunucu).toContain(`data-kod="ad_yasakli">Bu ad kullanılamaz; başka bir ad dene.</p>`);
  });

  it("öneri getirilirken: durum 'oneri', role=status metni, alan aria-busy, düğmeler aria-disabled; gönderirken Tamam disabled", () => {
    const o = girisHtml(durum({ adYukleniyor: true }), b());
    expect(o).toContain(`data-ekran="g4" data-durum="oneri"`);
    expect(o).toContain(`<p class="gr-ipucu" role="status" data-kod="oneri-yukleniyor">Sana bir ad hazırlıyoruz.</p>`);
    expect(o).toContain(`aria-busy="true"`);
    expect(o).toContain(`data-eylem="ad-tamam" aria-disabled="true"`);
    expect(o).toContain(`data-eylem="ad-oner" aria-disabled="true"`);
    const g = girisHtml(durum({ gonderiyor: true }), b());
    expect(g).toContain(`data-eylem="ad-tamam" data-durum="yukleniyor" disabled`);
    expect(g).toContain(`data-eylem="ad-oner" disabled`);
  });
});

describe("Ayarlar görünen ad satırı", () => {
  const ad = (k: Partial<NonNullable<Parameters<typeof hesapHtml>[0]["ad"]>> = {}) => ({ ad: "ali", duzenle: false, girdi: "", hata: null, sinir: false, sonuc: null, gonderiyor: false, ...k });
  const h = (a: ReturnType<typeof ad>): string => hesapHtml({ eposta: "ali@ornek.org", onayAcik: false, cikiyor: false, ad: a });

  it("ad yoksa satır hiç yazılmaz (özellik kapalı)", () => {
    expect(h(ad({ ad: null }))).not.toContain("gr-hesap-ad");
    expect(hesapHtml({ eposta: "a@b.co", onayAcik: false, cikiyor: false })).not.toContain("gr-hesap-ad");
  });

  it("satır, Değiştir; sınır doluyken aria-disabled ve neden bağlı; sonuç role=status", () => {
    const a = h(ad());
    expect(a).toContain(`<p class="gr-hesap-ad">Görünen adın: ali</p>`);
    expect(a).toContain(`<button class="eylem mini-dugme" type="button" data-eylem="ad-degistir">Değiştir</button>`);
    const s = h(ad({ sinir: true }));
    expect(s).toContain(`data-eylem="ad-degistir" aria-disabled="true" aria-describedby="gr-hesap-ad-sinir"`);
    expect(s).toContain(`<p id="gr-hesap-ad-sinir" class="gr-ipucu">Adını bugün zaten değiştirdin; yarın yeniden değiştirebilirsin.</p>`);
    expect(h(ad({ sonuc: "veli" }))).toContain(`role="status" data-kod="ad-sonuc">Adın güncellendi: veli</p>`);
  });

  it("düzenleyici: aynı alan parçaları, Tamam (birincil) ve Vazgeç; gönderirken kapalı", () => {
    const d = h(ad({ duzenle: true, girdi: "ali veli" }));
    expect(d).toContain(`data-eylem="ad-ayar-form"`);
    expect(d).toContain(`<input id="gr-hesap-ad" class="gr-girdi" type="text" name="ad" maxlength="24"`);
    expect(d).toContain("Dünyada böyle görünürsün: ali veli");
    expect(d).toContain(`<button class="birincil gr-dugme" type="submit" data-eylem="ad-kaydet">Tamam</button>`);
    expect(d).toContain(`data-eylem="ad-vazgec">Vazgeç</button>`);
    expect(d).not.toContain(`data-eylem="ad-degistir"`);
    expect(h(ad({ duzenle: true, gonderiyor: true }))).toContain(`data-eylem="ad-kaydet" data-durum="yukleniyor" disabled`);
    expect(h(ad({ duzenle: true, girdi: "ali", hata: { anahtar: "giris.G4.gunluk_sinir", kod: "ad_sinir" } }))).toContain(`data-kod="ad_sinir">Adını bugün zaten değiştirdin`);
  });
});

describe("Ayarlar Hesabı sil", () => {
  const sil = (k: Partial<NonNullable<Parameters<typeof hesapHtml>[0]["sil"]>> = {}): string => hesapHtml({ eposta: "ali@ornek.org", onayAcik: false, cikiyor: false, sil: { onayAcik: false, gonderiyor: false, gonderildi: false, hata: null, ...k } });

  it("düğme; onay sorusu alertdialog (Vazgeç varsayılan odak, tehlikeli onay .tehlike); sonuç role=status; hata role=alert", () => {
    expect(sil()).toContain(`<button class="eylem" type="button" data-eylem="hesap-sil">Hesabı sil</button>`);
    expect(sil()).not.toContain("alertdialog");
    const o = sil({ onayAcik: true });
    expect(o).toContain(`role="alertdialog" aria-modal="true" aria-labelledby="gr-sil-onay" data-giris-onay="hesap-sil"`);
    expect(o).toContain("Devam etmek istiyor musun?");
    expect(o).toContain("Hesabın silinince geri getirilemez;");
    expect(o).toContain(`<button class="tehlike" type="button" data-eylem="hesap-sil-onayla">Onay bağlantısı gönder</button>`);
    expect(o).toContain(`data-eylem="hesap-sil-vazgec" data-varsayilan-odak="1">Vazgeç</button>`);
    expect(sil({ gonderildi: true })).toContain(`role="status" data-kod="hesap-sil-sonuc">Onay bağlantısı e-postana gönderildi.`);
    expect(sil({ hata: { anahtar: "giris.G6.hiz_siniri", dakika: 10, kod: "hiz_siniri" } })).toContain(`role="alert" data-kod="hiz_siniri">Çok sık denendi. 10 dakika sonra yeniden dene.`);
    expect(sil({ onayAcik: true, gonderiyor: true })).toContain(`data-eylem="hesap-sil-onayla" disabled`);
  });

  it("sil verilmezse düğme yok (eski çağrılar)", () => {
    expect(hesapHtml({ eposta: "a@b.co", onayAcik: false, cikiyor: false })).not.toContain("hesap-sil");
  });
});

describe("rıza sahip metni (G1)", () => {
  it("tabloda boş sabit; boşken satır yok", () => {
    expect(GIRIS_METIN["giris.riza_metni"]).toBe("");
    expect(rizaMetni()).toBe("");
    expect(girisHtml(durum({ ekran: "g1" }), b())).not.toContain('data-kod="riza"');
  });
});

describe("rıza sahip metni dolu olunca", () => {
  it("G1'de küçük yazının altında gösterilir", async () => {
    vi.resetModules();
    vi.doMock("../src/giris/giris-metin", async (orijinal) => ({ ...(await orijinal<typeof import("../src/giris/giris-metin")>()), rizaMetni: () => "Devam ederek şartları okuduğunu söylersin." }));
    const { girisHtml: g } = await import("../src/giris/ekran-html");
    const h = g(durum({ ekran: "g1" }), b());
    expect(h.indexOf("Adresin yalnız giriş için")).toBeLessThan(h.indexOf('data-kod="riza"'));
    expect(h).toContain('<p class="gr-kucuk" data-kod="riza">Devam ederek şartları okuduğunu söylersin.</p>');
    vi.doUnmock("../src/giris/giris-metin");
    vi.resetModules();
  });
});

describe("API: görünen ad uçları", () => {
  const yanit = (durumKodu: number, govde: unknown, baslik: Record<string, string> = {}) => new Response(JSON.stringify(govde), { status: durumKodu, headers: { "content-type": "application/json", ...baslik } });
  const kimlikler: string[] = [];
  const api = (cevap: (url: string, init?: RequestInit) => Response): { api: GirisApi; cagrilar: Array<{ url: string; yontem: string; govde: string | null }> } => {
    const cagrilar: Array<{ url: string; yontem: string; govde: string | null }> = [];
    const fetchFn = (async (u: string, init?: RequestInit) => {
      kimlikler.push(String(init?.credentials));
      cagrilar.push({ url: u, yontem: init?.method ?? "GET", govde: typeof init?.body === "string" ? init.body : null });
      return cevap(u, init);
    }) as unknown as typeof fetch;
    return { api: new GirisApi({ taban: "http://x", fetch: fetchFn }), cagrilar };
  };

  it("yollar protokolle aynı", () => {
    expect(GIRIS_YOLLARI.ad).toBe(PROTOKOL_YOLLARI.ad);
    expect(GIRIS_YOLLARI.adOner).toBe(PROTOKOL_YOLLARI.adOner);
  });

  it("adOner GET, adKaydet POST {ad}; doğrulayıcılar bozuk yanıtı reddeder", async () => {
    const t = api((u) => (u.endsWith("/ad-oner") ? yanit(200, { tamam: true, ad: "sakin degirmenci 321" }) : yanit(200, { tamam: true, ad: "ali", adSecildi: true })));
    expect(await t.api.adOner()).toEqual({ tamam: true, veri: { tamam: true, ad: "sakin degirmenci 321" } });
    expect(await t.api.adKaydet("Ali")).toEqual({ tamam: true, veri: { tamam: true, ad: "ali", adSecildi: true } });
    expect(t.cagrilar).toEqual([
      { url: "http://x/giris/ad-oner", yontem: "GET", govde: null },
      { url: "http://x/giris/ad", yontem: "POST", govde: JSON.stringify({ ad: "Ali" }) },
    ]);
    const bozuk = api(() => yanit(200, { tamam: true, ad: "a", adSecildi: true }));
    expect(await bozuk.api.adKaydet("x")).toMatchObject({ tamam: false, kod: "yanit" });
    expect(await api(() => yanit(200, { tamam: true, ad: "ali", adSecildi: false })).api.adKaydet("x")).toMatchObject({ tamam: false, kod: "yanit" });
    expect(await api(() => yanit(200, { tamam: true })).api.adOner()).toMatchObject({ tamam: false, kod: "yanit" });
  });

  it("hata kodları: ad_gecersiz 422, ad_yasakli 422, ad_sinir 429 (+beklemeSn), oturum_yok 401", async () => {
    for (const [kod, durumKodu] of [["ad_gecersiz", 422], ["ad_yasakli", 422], ["oturum_yok", 401]] as const)
      expect(await api(() => yanit(durumKodu, { tamam: false, kod, mesaj: "x" })).api.adKaydet("ali")).toEqual({ tamam: false, kod, durum: durumKodu });
    expect(await api(() => yanit(429, { tamam: false, kod: "ad_sinir", mesaj: "x", beklemeSn: 3600 })).api.adKaydet("ali")).toEqual({ tamam: false, kod: "ad_sinir", durum: 429, beklemeSn: 3600 });
  });

  it("hesapSil: POST gövdesiz, 202 {tamam, gecerlilikSn}; yol protokolle aynı; hata kodları", async () => {
    expect(GIRIS_YOLLARI.hesapSil).toBe(PROTOKOL_YOLLARI.hesapSil);
    kimlikler.length = 0;
    const t = api(() => yanit(202, { tamam: true, gecerlilikSn: 3600 }));
    expect(await t.api.hesapSil()).toEqual({ tamam: true, veri: { tamam: true, gecerlilikSn: 3600 } });
    expect(t.cagrilar).toEqual([{ url: "http://x/giris/hesap-sil", yontem: "POST", govde: null }]);
    expect(kimlikler).toEqual(["same-origin"]); // hesap silme: çerez yalnız aynı kökene
    kimlikler.length = 0;
    await api(() => yanit(200, { tamam: true, ad: "ali", adSecildi: true })).api.adKaydet("ali");
    await t.api.ben().catch(() => undefined);
    expect(kimlikler).toEqual(["include", "include"]); // diğer uçlar değişmedi
    expect(await api(() => yanit(401, { tamam: false, kod: "oturum_yok", mesaj: "x" })).api.hesapSil()).toEqual({ tamam: false, kod: "oturum_yok", durum: 401 });
    expect(await api(() => yanit(429, { tamam: false, kod: "hiz_siniri", mesaj: "x", beklemeSn: 600 })).api.hesapSil()).toEqual({ tamam: false, kod: "hiz_siniri", durum: 429, beklemeSn: 600 });
    expect(await api(() => yanit(202, { tamam: true })).api.hesapSil()).toMatchObject({ tamam: false, kod: "yanit" });
  });

  it("onay ve ben yanıtı ad/adSecildi taşır; ad bozuksa yanıt geçersiz", async () => {
    const onay = api(() => yanit(200, { tamam: true, yeniHesap: true, oyuncu: "o_1", ad: "sakin degirmenci 321", adSecildi: false }));
    expect(await onay.api.onayla("j")).toMatchObject({ tamam: true, veri: { ad: "sakin degirmenci 321", adSecildi: false } });
    expect(await api(() => yanit(200, { tamam: true, yeniHesap: true, oyuncu: "o_1", ad: "a" })).api.onayla("j")).toMatchObject({ tamam: false, kod: "yanit" });
    const ben = api(() => yanit(200, { tamam: true, eposta: "a@b.co", oyuncu: "o_1", oturumBitis: 1, oturumMutlakBitis: 2, ad: "ali", adSecildi: true }));
    expect(await ben.api.ben()).toMatchObject({ tamam: true, veri: { ad: "ali", adSecildi: true } });
  });
});

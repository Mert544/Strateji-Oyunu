/**
 * Giriş mantığı (G9-a), saf birimler ve sahte HTTP: kip/adres, e-posta denetimi, hata sunumu, HTTP istemcisi, bilet sağlayıcı,
 * ekran durumu makinesi. Gerçek sunucu ve çerez kavanozu `giris-ws.test.ts`'tedir.
 */
import { describe, expect, it } from "vitest";
import { GirisApi, GirisHatasi, httpTabani } from "../src/giris/api";
import type { GirisSonucu } from "../src/giris/api";
import { GirisAkisi, TEKRAR_SINIRI_ESIGI, YENIDEN_GONDER_MS } from "../src/giris/akis";
import { epostaAnahtari, epostaKontrol, epostaTemizle } from "../src/giris/eposta";
import { hataAnahtari, hataEylemi, hizSiniriDakika } from "../src/giris/hata";
import { baglantiJetonu, girisKipi, jetonsuzAdres } from "../src/giris/kip";
import { BILET_OMRU_MS, BiletSaglayici } from "../src/giris/oturum";

describe("kip ve adres", () => {
  it("?sunucu yok: sahte; token var: geliştirme (giriş ekranı yok); token yok: e-posta", () => {
    expect(girisKipi("")).toEqual({ kip: "sahte" });
    expect(girisKipi("?harita=1")).toEqual({ kip: "sahte" });
    expect(girisKipi("?sunucu=ws://127.0.0.1:8080&token=ali")).toEqual({ kip: "gelistirme", url: "ws://127.0.0.1:8080", token: "ali" });
    expect(girisKipi("?sunucu=ws://127.0.0.1:8080")).toEqual({ kip: "eposta", url: "ws://127.0.0.1:8080", httpTabani: "http://127.0.0.1:8080" });
    expect(girisKipi("?sunucu=wss://oyun.ornek.org/ws")).toMatchObject({ kip: "eposta", httpTabani: "https://oyun.ornek.org" });
    // derleme zamanı üretim adresi: ?sunucu olmasa da e-posta kipi
    expect(girisKipi("", "wss://oyun.ornek.org")).toMatchObject({ kip: "eposta", url: "wss://oyun.ornek.org" });
    // geliştirme token'ı üretim adresinde de geliştirme sayılır (sunucu `--uretim`de reddeder; istemci tahmin etmez)
    expect(girisKipi("?token=ali", "wss://oyun.ornek.org")).toMatchObject({ kip: "gelistirme", token: "ali" });
  });

  it("httpTabani: ws→http, wss→https, yol ve sorgu atılır, çözülemezse boş", () => {
    expect(httpTabani("ws://localhost:9000/yol?x=1")).toBe("http://localhost:9000");
    expect(httpTabani("wss://a.b")).toBe("https://a.b");
    expect(httpTabani("saçma")).toBe("");
  });

  it("?j= jetonu okunur; yoksa ya da çok uzunsa null; adresten silinir, diğer parametreler ve #parça kalır", () => {
    expect(baglantiJetonu("?j=bag1.abc.123.sig")).toBe("bag1.abc.123.sig");
    expect(baglantiJetonu("?sunucu=ws://x&j=abc")).toBe("abc");
    expect(baglantiJetonu("")).toBeNull();
    expect(baglantiJetonu("?j=")).toBeNull();
    expect(baglantiJetonu(`?j=${"x".repeat(513)}`)).toBeNull();
    expect(jetonsuzAdres("https://oyun.ornek.org/?j=abc")).toBe("/");
    expect(jetonsuzAdres("https://oyun.ornek.org/dunya.html?sunucu=ws%3A%2F%2Fx&j=abc#harita")).toBe("/dunya.html?sunucu=ws%3A%2F%2Fx#harita");
    expect(jetonsuzAdres("/dunya.html?j=abc&dil=tr")).toBe("/dunya.html?dil=tr");
    expect(jetonsuzAdres("/dunya.html")).toBe("/dunya.html");
  });
});

describe("e-posta girdisi", () => {
  it("temizlik: boşluk, <...>, mailto:; büyük/küçük harf korunur", () => {
    expect(epostaTemizle("  Ali@Ornek.com \n")).toBe("Ali@Ornek.com");
    expect(epostaTemizle("<ali@ornek.com>")).toBe("ali@ornek.com");
    expect(epostaTemizle("mailto:ali@ornek.com")).toBe("ali@ornek.com");
  });

  it("geçerli ve bariz geçersiz adresler", () => {
    for (const g of ["ali@ornek.com", "a.b+c@alt.ornek.org", " ali@ornek.com ", "ğ@ornek.com.tr"]) expect(epostaKontrol(g), g).toMatchObject({ tamam: true });
    for (const g of ["", "ali", "ali@", "@ornek.com", "ali@ornek", "ali@@ornek.com", "al i@ornek.com", "ali@ornek..com", "ali@.com", "a@b.", `${"a".repeat(250)}@b.co`]) {
      expect(epostaKontrol(g), g).toEqual({ tamam: false, kod: "gecersiz_eposta" });
    }
    expect(epostaKontrol("  ali@ornek.com ")).toEqual({ tamam: true, eposta: "ali@ornek.com" });
  });

  it("sayaç anahtarı küçük harfli ve temiz", () => {
    expect(epostaAnahtari(" Ali@Ornek.COM ")).toBe("ali@ornek.com");
  });
});

describe("hata sunumu", () => {
  it("anahtar giris.G6.<kod>; 404/405/bozuk yanıt ic_hata metnine gider; ağ ve zaman aşımı kendi anahtarı", () => {
    expect(hataAnahtari("gecersiz_eposta")).toBe("giris.G6.gecersiz_eposta");
    expect(hataAnahtari("hiz_siniri")).toBe("giris.G6.hiz_siniri");
    expect(hataAnahtari("ag_hatasi")).toBe("giris.G6.ag_hatasi");
    expect(hataAnahtari("zaman_asimi")).toBe("giris.G6.zaman_asimi");
    expect(hataAnahtari("yontem")).toBe("giris.G6.ic_hata");
    expect(hataAnahtari("bulunamadi")).toBe("giris.G6.ic_hata");
    expect(hataAnahtari("yanit")).toBe("giris.G6.ic_hata");
  });

  it("eylem tablosu (T1 G-6): g1 alanda kal, g3'te gecici_eposta G-1'e döner", () => {
    expect(hataEylemi("gecersiz_eposta", "g1")).toBe("alanda-kal");
    expect(hataEylemi("gecici_eposta", "g1")).toBe("alanda-kal");
    expect(hataEylemi("gecici_eposta", "g3")).toBe("yeni-baglanti-iste");
    expect(hataEylemi("hiz_siniri", "g2")).toBe("bekle");
    expect(hataEylemi("origin", "g1")).toBe("yenile");
    expect(hataEylemi("gecersiz_istek", "g1")).toBe("yenile");
    expect(hataEylemi("baglanti_gecersiz", "g3")).toBe("yeni-baglanti-iste");
    expect(hataEylemi("tarayici_uyumsuz", "g3")).toBe("yeni-baglanti-iste");
    expect(hataEylemi("oturum_yok", "g7")).toBe("giris");
    expect(hataEylemi("ag_hatasi", "g2")).toBe("yeniden-dene");
    expect(hataEylemi("zaman_asimi", "g1")).toBe("yeniden-dene");
    expect(hataEylemi("ic_hata", "g1")).toBe("yeniden-dene");
  });

  it("hız sınırı dakikası yukarı yuvarlanır (en az 1; bilinmiyorsa 1)", () => {
    expect(hizSiniriDakika(1)).toBe(1);
    expect(hizSiniriDakika(60)).toBe(1);
    expect(hizSiniriDakika(61)).toBe(2);
    expect(hizSiniriDakika(3599)).toBe(60);
    expect(hizSiniriDakika(undefined)).toBe(1);
    expect(hizSiniriDakika(0)).toBe(1);
  });
});

// --- sahte HTTP --------------------------------------------------------------------------------------------

interface Cagri {
  url: string;
  init: RequestInit;
}

function yanit(durum: number, govde: unknown, baslik: Record<string, string> = {}): Response {
  return new Response(typeof govde === "string" ? govde : JSON.stringify(govde), { status: durum, headers: { "content-type": "application/json", ...baslik } });
}

function sahteFetch(f: (c: Cagri) => Response | Promise<Response>): { fetch: typeof fetch; cagrilar: Cagri[] } {
  const cagrilar: Cagri[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const c = { url: String(url), init: init ?? {} };
    cagrilar.push(c);
    return f(c);
  }) as typeof fetch;
  return { fetch: fn, cagrilar };
}

describe("GirisApi", () => {
  it("istek: URL, yöntem, JSON gövde, credentials include; şema doğrulanmış yanıt", async () => {
    const s = sahteFetch(() => yanit(202, { tamam: true, gecerlilikSn: 600 }));
    const api = new GirisApi({ taban: "http://x:1/", fetch: s.fetch });
    const r = await api.istek("ali@ornek.com");
    expect(r).toEqual({ tamam: true, veri: { tamam: true, gecerlilikSn: 600 } });
    const c = s.cagrilar[0]!;
    expect(c.url).toBe("http://x:1/giris/istek");
    expect(c.init).toMatchObject({ method: "POST", credentials: "include", body: JSON.stringify({ eposta: "ali@ornek.com" }) });
    expect((c.init.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });

  it("gövdesiz uçlar content-type yollamaz; onay {j} yollar", async () => {
    const s = sahteFetch((c) => (c.url.endsWith("/bilet") ? yanit(200, { tamam: true, bilet: "bil1.x", bitis: 5, oyuncu: "o_1" }) : yanit(200, { tamam: true, yeniHesap: true, oyuncu: "o_1" })));
    const api = new GirisApi({ taban: "", fetch: s.fetch });
    expect(await api.bilet()).toMatchObject({ tamam: true, veri: { bilet: "bil1.x", oyuncu: "o_1" } });
    expect((s.cagrilar[0]!.init.headers as Record<string, string>)["content-type"]).toBeUndefined();
    expect(s.cagrilar[0]!.init.body).toBeUndefined();
    expect(await api.onayla("jtn")).toMatchObject({ tamam: true, veri: { yeniHesap: true } });
    expect(s.cagrilar[1]!.init.body).toBe(JSON.stringify({ j: "jtn" }));
    expect(s.cagrilar[1]!.url).toBe("/giris/onay");
  });

  it("hata gövdesi: kod ve beklemeSn; sunucu mesajı dışarı sızmaz", async () => {
    const s = sahteFetch(() => yanit(429, { tamam: false, kod: "hiz_siniri", mesaj: "gizli ayrıntı", beklemeSn: 90 }, { "retry-after": "90" }));
    const r = await new GirisApi({ taban: "", fetch: s.fetch }).istek("a@b.co");
    expect(r).toEqual({ tamam: false, kod: "hiz_siniri", durum: 429, beklemeSn: 90 });
    expect(JSON.stringify(r)).not.toContain("gizli");
  });

  it("hız sınırı: gövdede beklemeSn yoksa Retry-After; gövde sunucu dışıysa durumdan kod", async () => {
    const a = await new GirisApi({ taban: "", fetch: sahteFetch(() => yanit(429, { tamam: false, kod: "hiz_siniri", mesaj: "x" }, { "retry-after": "2" })).fetch }).bilet();
    expect(a).toEqual({ tamam: false, kod: "hiz_siniri", durum: 429, beklemeSn: 2 });
    const b = await new GirisApi({ taban: "", fetch: sahteFetch(() => yanit(429, "<html>slow down</html>", { "retry-after": "7" })).fetch }).bilet();
    expect(b).toEqual({ tamam: false, kod: "hiz_siniri", durum: 429, beklemeSn: 7 });
    const c = await new GirisApi({ taban: "", fetch: sahteFetch(() => yanit(401, "")).fetch }).ben();
    expect(c).toEqual({ tamam: false, kod: "oturum_yok", durum: 401 });
    const d = await new GirisApi({ taban: "", fetch: sahteFetch(() => yanit(502, "<html>bad gateway</html>")).fetch }).ben();
    expect(d).toEqual({ tamam: false, kod: "yanit", durum: 502 });
  });

  it("bozuk 200 yanıtı yanit; ağ hatası ag_hatasi; zaman aşımı zaman_asimi", async () => {
    expect(await new GirisApi({ taban: "", fetch: sahteFetch(() => yanit(200, { tamam: true })).fetch }).bilet()).toEqual({ tamam: false, kod: "yanit", durum: 200 });
    expect(await new GirisApi({ taban: "", fetch: sahteFetch(() => yanit(200, "json değil")).fetch }).ben()).toEqual({ tamam: false, kod: "yanit", durum: 200 });
    expect(await new GirisApi({ taban: "", fetch: sahteFetch(() => Promise.reject(new TypeError("fetch failed"))).fetch }).ben()).toEqual({ tamam: false, kod: "ag_hatasi" });
    const asili = sahteFetch((c) => new Promise<Response>((_, red) => (c.init.signal as AbortSignal).addEventListener("abort", () => red(Object.assign(new Error("abort"), { name: "AbortError" })))));
    expect(await new GirisApi({ taban: "", fetch: asili.fetch, zamanAsimiMs: 20 }).ben()).toEqual({ tamam: false, kod: "zaman_asimi" });
  });

  it("çıkış uçları", async () => {
    const s = sahteFetch(() => yanit(200, { tamam: true }));
    const api = new GirisApi({ taban: "http://x", fetch: s.fetch });
    expect(await api.cikis()).toMatchObject({ tamam: true });
    expect(await api.cikisTumu()).toMatchObject({ tamam: true });
    expect(s.cagrilar.map((c) => c.url)).toEqual(["http://x/giris/cikis", "http://x/giris/cikis-tumu"]);
  });
});

// --- bilet sağlayıcı ----------------------------------------------------------------------------------------

function biletApi(sonuclar: Array<GirisSonucu<{ tamam: true; bilet: string; bitis: number; oyuncu: string }>>): { api: { bilet: () => Promise<GirisSonucu<{ tamam: true; bilet: string; bitis: number; oyuncu: string }>> }; say: () => number } {
  let i = 0;
  return {
    api: { bilet: async () => sonuclar[Math.min(i++, sonuclar.length - 1)]! },
    say: () => i,
  };
}
const biletYaniti = (b: string) => ({ tamam: true as const, veri: { tamam: true as const, bilet: b, bitis: 1, oyuncu: "o_1" } });

describe("BiletSaglayici", () => {
  it("her bağlanışta taze bilet: ardışık çağrılar farklı bilet alır", async () => {
    const t = biletApi([biletYaniti("b1"), biletYaniti("b2")]);
    const s = new BiletSaglayici({ api: t.api });
    expect(await s.bilet()).toBe("b1");
    expect(await s.bilet()).toBe("b2");
    expect(s.alinan).toBe(2);
  });

  it("önceden alınan bilet bir kez harcanır; eşzamanlı onceden tek istek", async () => {
    const t = biletApi([biletYaniti("b1"), biletYaniti("b2")]);
    const s = new BiletSaglayici({ api: t.api });
    const [a, b] = await Promise.all([s.onceden(), s.onceden()]);
    expect(a).toBe(b);
    expect(t.say()).toBe(1);
    expect(await s.bilet()).toBe("b1"); // önbellekten
    expect(await s.bilet()).toBe("b2"); // tek kullanımlık: yenisi
    expect(t.say()).toBe(2);
  });

  it("süresi dolan (ömür − marj) bilet kullanılmaz, yenilenir", async () => {
    let zaman = 1_000_000;
    const t = biletApi([biletYaniti("eski"), biletYaniti("yeni")]);
    const s = new BiletSaglayici({ api: t.api, simdi: () => zaman, marjMs: 10_000 });
    await s.onceden();
    zaman += BILET_OMRU_MS - 10_000 - 1; // hâlâ geçerli
    expect(await s.bilet()).toBe("eski");
    await s.onceden();
    zaman += BILET_OMRU_MS - 10_000; // marja girdi
    expect(await s.bilet()).toBe("yeni");
  });

  it("429: sessizce beklenir ve yeniden denenir (ekrana hata gitmez); deneme sınırı aşılırsa GirisHatasi hiz_siniri", async () => {
    const bekle: number[] = [];
    const sinir = { tamam: false as const, kod: "hiz_siniri" as const, beklemeSn: 2 };
    const t = biletApi([sinir, sinir, biletYaniti("b")]);
    const s = new BiletSaglayici({ api: t.api, uyu: async (ms) => void bekle.push(ms) });
    expect(await s.bilet()).toBe("b");
    expect(bekle).toEqual([2000, 2000]);
    const t2 = biletApi([sinir]);
    const s2 = new BiletSaglayici({ api: t2.api, uyu: async () => undefined, hizDenemesi: 3 });
    await expect(s2.bilet()).rejects.toMatchObject({ name: "GirisHatasi", kod: "hiz_siniri" });
    expect(t2.say()).toBe(3);
  });

  it("401: bilet() dinleyicileri bir kez çağırır ve GirisHatasi oturum_yok fırlatır; onceden() dinleyiciyi çağırmaz", async () => {
    const yok = { tamam: false as const, kod: "oturum_yok" as const, durum: 401 };
    const s = new BiletSaglayici({ api: biletApi([yok]).api });
    let n = 0;
    s.oturumYokDinle(() => void n++);
    await expect(s.onceden()).rejects.toBeInstanceOf(GirisHatasi);
    expect(n).toBe(0);
    await expect(s.bilet()).rejects.toMatchObject({ kod: "oturum_yok" });
    expect(n).toBe(1);
  });

  it("ağ hatası GirisHatasi ag_hatasi (WsBaglanti geri çekilmeyle yeniden dener)", async () => {
    const s = new BiletSaglayici({ api: biletApi([{ tamam: false, kod: "ag_hatasi" }]).api });
    await expect(s.bilet()).rejects.toMatchObject({ kod: "ag_hatasi" });
  });
});

// --- ekran durumu makinesi ------------------------------------------------------------------------------------

type Api = ConstructorParameters<typeof GirisAkisi>[0]["api"];

function sahteAkis(o: { istek?: Api["istek"]; onayla?: Api["onayla"]; ben?: Api["ben"]; cikis?: Api["cikis"]; cikisTumu?: Api["cikisTumu"]; onceden?: () => Promise<{ tamam: true; bilet: string; bitis: number; oyuncu: string }> } = {}) {
  const zaman = { t: 5_000_000 };
  const istekler: string[] = [];
  const tamam = <T,>(veri: T): GirisSonucu<T> => ({ tamam: true, veri });
  const api: Api = {
    istek: o.istek ?? (async (e) => (istekler.push(e), tamam({ tamam: true as const, gecerlilikSn: 600 }))),
    onayla: o.onayla ?? (async () => tamam({ tamam: true as const, yeniHesap: false, oyuncu: "o_1" })),
    ben: o.ben ?? (async () => ({ tamam: false, kod: "oturum_yok", durum: 401 })),
    cikis: o.cikis ?? (async () => tamam({ tamam: true as const })),
    cikisTumu: o.cikisTumu ?? (async () => tamam({ tamam: true as const })),
  };
  let yokDinleyici: (() => void) | null = null;
  let temizlendi = 0;
  const saglayici = {
    onceden: o.onceden ?? (async () => ({ tamam: true as const, bilet: "b", bitis: 1, oyuncu: "o_1" })),
    temizle: () => void temizlendi++,
    oturumYokDinle: (f: () => void) => {
      yokDinleyici = f;
      return () => undefined;
    },
  };
  const akis = new GirisAkisi({ api, saglayici, simdi: () => zaman.t });
  return { akis, zaman, istekler, yokVer: () => yokDinleyici?.(), temizlendi: () => temizlendi };
}

describe("GirisAkisi: açılış", () => {
  it("?j= jetonu: g3 onay ekranı; jetonun kendisi durumda görünmez", async () => {
    const { akis } = sahteAkis();
    await akis.basla("gizli-jeton");
    expect(akis.durum).toMatchObject({ ekran: "g3", jetonVar: true });
    expect(JSON.stringify(akis.durum)).not.toContain("gizli-jeton");
  });

  it("oturum yok: g1, hata yok", async () => {
    const { akis } = sahteAkis();
    await akis.basla();
    expect(akis.durum).toMatchObject({ ekran: "g1", hata: null });
  });

  it("oturum var: bilet önden alınır, oyun", async () => {
    const { akis } = sahteAkis({ ben: async () => ({ tamam: true, veri: { tamam: true, eposta: "a@b.co", oyuncu: "o_9", oturumBitis: 5, oturumMutlakBitis: 6 } }) });
    await akis.basla();
    expect(akis.durum).toMatchObject({ ekran: "oyun", oyuncu: "o_1", yeniHesap: false });
  });

  it("açılışta ağ yok: g1 ve ag_hatasi anahtarı; bilet 401: g1 hatasız (açılışta 'doldu' denmez)", async () => {
    const a = sahteAkis({ ben: async () => ({ tamam: false, kod: "ag_hatasi" }) });
    await a.akis.basla();
    expect(a.akis.durum).toMatchObject({ ekran: "g1", hata: { kod: "ag_hatasi", anahtar: "giris.G6.ag_hatasi", eylem: "yeniden-dene" } });
    const b = sahteAkis({
      ben: async () => ({ tamam: true, veri: { tamam: true, eposta: "a@b.co", oyuncu: "o_9", oturumBitis: 5, oturumMutlakBitis: 6 } }),
      onceden: async () => {
        throw new GirisHatasi({ kod: "oturum_yok" });
      },
    });
    await b.akis.basla();
    expect(b.akis.durum).toMatchObject({ ekran: "g1", hata: null });
  });
});

describe("GirisAkisi: g1 ve g2", () => {
  it("geçersiz adres istek yapmadan reddedilir; alanda kal", async () => {
    const { akis, istekler } = sahteAkis();
    await akis.basla();
    await akis.epostaGonder("ali");
    expect(istekler).toEqual([]);
    expect(akis.durum).toMatchObject({ ekran: "g1", hata: { kod: "gecersiz_eposta", anahtar: "giris.G6.gecersiz_eposta", eylem: "alanda-kal" } });
  });

  it("202: g2 (koşulsuz), 60 sn geri sayım, adres bellekte; yeniden gönder erken çalışmaz", async () => {
    const { akis, zaman, istekler } = sahteAkis();
    await akis.basla();
    await akis.epostaGonder(" Ali@Ornek.com ");
    expect(istekler).toEqual(["Ali@Ornek.com"]);
    expect(akis.durum).toMatchObject({ ekran: "g2", eposta: "Ali@Ornek.com", gonderimSayisi: 1, tekrarSiniri: false, tekrarGonderildi: false, gecerlilikSn: 600 });
    expect(akis.kalanSn(akis.durum.yenidenGonderBitis)).toBe(60);
    expect(akis.yenidenGonderilebilir()).toBe(false);
    await akis.yenidenGonder();
    expect(istekler).toHaveLength(1);
    zaman.t += 59_000;
    expect(akis.kalanSn(akis.durum.yenidenGonderBitis)).toBe(1);
    expect(akis.yenidenGonderilebilir()).toBe(false);
    zaman.t += 1_000;
    expect(akis.yenidenGonderilebilir()).toBe(true);
  });

  it("yeniden gönder: yeni bekleme, tekrarGonderildi; 3. gönderimden sonra tekrarSiniri (destek birlikte)", async () => {
    const { akis, zaman, istekler } = sahteAkis();
    await akis.epostaGonder("ali@ornek.com");
    for (let i = 2; i <= TEKRAR_SINIRI_ESIGI; i++) {
      expect(akis.durum.tekrarSiniri).toBe(false);
      zaman.t += YENIDEN_GONDER_MS;
      await akis.yenidenGonder();
      expect(akis.durum).toMatchObject({ gonderimSayisi: i, tekrarGonderildi: true });
      expect(akis.kalanSn(akis.durum.yenidenGonderBitis)).toBe(60);
    }
    expect(istekler).toHaveLength(3);
    expect(akis.durum.tekrarSiniri).toBe(true);
    // sınır açıkken de gönderim kullanılabilir (sunucu sessizce eler; istemci yalnız yavaşlatır ve destek gösterir)
    zaman.t += YENIDEN_GONDER_MS;
    expect(akis.yenidenGonderilebilir()).toBe(true);
  });

  it("sayaç adres başına (adres değişince sıfırdan), büyük/küçük harf aynı adres, bir saat sonra düşer", async () => {
    const { akis, zaman } = sahteAkis();
    await akis.epostaGonder("ali@ornek.com");
    zaman.t += YENIDEN_GONDER_MS;
    await akis.yenidenGonder();
    expect(akis.durum.gonderimSayisi).toBe(2);
    akis.adresiDegistir();
    expect(akis.durum).toMatchObject({ ekran: "g1", eposta: "ali@ornek.com" });
    await akis.epostaGonder("veli@ornek.com");
    expect(akis.durum.gonderimSayisi).toBe(1);
    akis.adresiDegistir();
    await akis.epostaGonder("ALI@ornek.com");
    expect(akis.durum.gonderimSayisi).toBe(3);
    expect(akis.durum.tekrarSiniri).toBe(true);
    // bir saat sonra pencere dışında kalan gönderimler sayılmaz
    akis.adresiDegistir();
    zaman.t += 3_600_000;
    await akis.epostaGonder("ali@ornek.com");
    expect(akis.durum).toMatchObject({ gonderimSayisi: 1, tekrarSiniri: false });
  });

  it("başarısız gönderim sayılmaz ve g1'de kalır; ağ hatasında yeniden denenebilir", async () => {
    let n = 0;
    const { akis } = sahteAkis({ istek: async () => (n++ === 0 ? { tamam: false, kod: "ag_hatasi" } : { tamam: true, veri: { tamam: true, gecerlilikSn: 600 } }) });
    await akis.epostaGonder("ali@ornek.com");
    expect(akis.durum).toMatchObject({ ekran: "g1", gonderiyor: false, hata: { kod: "ag_hatasi" } });
    await akis.epostaGonder("ali@ornek.com");
    expect(akis.durum).toMatchObject({ ekran: "g2", hata: null, gonderimSayisi: 1 });
  });

  it("gecici_eposta g1'de alanda kalır; hiz_siniri düğmeyi kapatır, dakika yukarı yuvarlı, süre bitince açılır", async () => {
    const { akis, zaman } = sahteAkis({ istek: async () => ({ tamam: false, kod: "hiz_siniri", beklemeSn: 100 }) });
    await akis.epostaGonder("ali@ornek.com");
    expect(akis.durum).toMatchObject({ ekran: "g1", hata: { kod: "hiz_siniri", eylem: "bekle", dakika: 2 } });
    expect(akis.eylemKapali()).toBe(true);
    expect(akis.kalanSn(akis.durum.hata!.bitis!)).toBe(100);
    await akis.epostaGonder("ali@ornek.com"); // kapalıyken yok sayılır
    expect(akis.durum.gonderiyor).toBe(false);
    zaman.t += 100_000;
    expect(akis.eylemKapali()).toBe(false);
    const g = sahteAkis({ istek: async () => ({ tamam: false, kod: "gecici_eposta" }) });
    await g.akis.epostaGonder("a@mailinator.com");
    expect(g.akis.durum).toMatchObject({ ekran: "g1", hata: { kod: "gecici_eposta", eylem: "alanda-kal" } });
  });

  it("uçuştaki istek varken ikinci gönderim yok sayılır (çift tıklama)", async () => {
    let coz: (() => void) | null = null;
    let n = 0;
    const { akis } = sahteAkis({
      istek: () =>
        new Promise((c) => {
          n++;
          coz = () => c({ tamam: true, veri: { tamam: true, gecerlilikSn: 600 } });
        }),
    });
    const p = akis.epostaGonder("ali@ornek.com");
    expect(akis.durum.gonderiyor).toBe(true);
    expect(akis.eylemKapali()).toBe(true);
    await akis.epostaGonder("ali@ornek.com");
    expect(n).toBe(1);
    coz!();
    await p;
    expect(akis.durum).toMatchObject({ ekran: "g2", gonderiyor: false });
  });

  it("g2 yeniden gönder hız sınırında kapalı kalır", async () => {
    let n = 0;
    const { akis, zaman } = sahteAkis({ istek: async () => (n++ === 0 ? { tamam: true, veri: { tamam: true, gecerlilikSn: 600 } } : { tamam: false, kod: "hiz_siniri", beklemeSn: 300 }) });
    await akis.epostaGonder("ali@ornek.com");
    zaman.t += YENIDEN_GONDER_MS;
    await akis.yenidenGonder();
    expect(akis.durum).toMatchObject({ ekran: "g2", hata: { kod: "hiz_siniri", dakika: 5 } });
    expect(akis.yenidenGonderilebilir()).toBe(false);
    zaman.t += 300_000;
    expect(akis.yenidenGonderilebilir()).toBe(true);
  });
});

describe("GirisAkisi: g3, g4, oyun", () => {
  it("dönen hesap: onay → bilet → oyun; jeton bellekten atılır ve ikinci onay yok sayılır", async () => {
    let n = 0;
    const { akis } = sahteAkis({ onayla: async () => (n++, { tamam: true, veri: { tamam: true, yeniHesap: false, oyuncu: "o_7" } }) });
    await akis.basla("jtn");
    await akis.onayla();
    expect(akis.durum).toMatchObject({ ekran: "oyun", oyuncu: "o_1", yeniHesap: false, jetonVar: false, basari: true });
    await akis.onayla();
    expect(n).toBe(1);
  });

  it("yeni hesap: g4; ad tamamlanınca oyun (yeniHesap bayrağı korunur)", async () => {
    const { akis } = sahteAkis({ onayla: async () => ({ tamam: true, veri: { tamam: true, yeniHesap: true, oyuncu: "o_8" } }) });
    await akis.basla("jtn");
    await akis.onayla();
    expect(akis.durum).toMatchObject({ ekran: "g4", yeniHesap: true, oyuncu: "o_8" });
    await akis.adTamamlandi();
    expect(akis.durum).toMatchObject({ ekran: "oyun", yeniHesap: true });
  });

  it("baglanti_gecersiz: g3'te kalır, 'yeni bağlantı iste' eylemi; yeniden onay jetonsuz G-1'e düşer", async () => {
    const { akis } = sahteAkis({ onayla: async () => ({ tamam: false, kod: "baglanti_gecersiz", durum: 400 }) });
    await akis.basla("jtn");
    await akis.onayla();
    expect(akis.durum).toMatchObject({ ekran: "g3", jetonVar: false, hata: { kod: "baglanti_gecersiz", anahtar: "giris.G6.baglanti_gecersiz", eylem: "yeni-baglanti-iste" } });
    akis.yeniBaglantiIste();
    expect(akis.durum).toMatchObject({ ekran: "g1", hata: null });
  });

  it("tarayici_uyumsuz: jeton korunur (sunucu tüketmez), g3'te kalır", async () => {
    const { akis } = sahteAkis({ onayla: async () => ({ tamam: false, kod: "tarayici_uyumsuz", durum: 403 }) });
    await akis.basla("jtn");
    await akis.onayla();
    expect(akis.durum).toMatchObject({ ekran: "g3", jetonVar: true, hata: { kod: "tarayici_uyumsuz" } });
  });

  it("onayda hiz_siniri: düğme kapalı, süre bitince yeniden denenebilir; gecici_eposta: G-1'e döner", async () => {
    let n = 0;
    const a = sahteAkis({ onayla: async () => (n++ === 0 ? { tamam: false, kod: "hiz_siniri", beklemeSn: 60 } : { tamam: true, veri: { tamam: true, yeniHesap: false, oyuncu: "o_1" } }) });
    await a.akis.basla("jtn");
    await a.akis.onayla();
    expect(a.akis.durum).toMatchObject({ ekran: "g3", jetonVar: true, hata: { kod: "hiz_siniri", dakika: 1 } });
    await a.akis.onayla();
    expect(n).toBe(1);
    a.zaman.t += 60_000;
    await a.akis.onayla();
    expect(a.akis.durum.ekran).toBe("oyun");
    const g = sahteAkis({ onayla: async () => ({ tamam: false, kod: "gecici_eposta", durum: 422 }) });
    await g.akis.basla("jtn");
    await g.akis.onayla();
    expect(g.akis.durum).toMatchObject({ ekran: "g1", jetonVar: false, hata: { kod: "gecici_eposta", eylem: "yeni-baglanti-iste" } });
  });

  it("onay sonrası bilet alınamazsa (ağ) g1 ve hata; oturum yoksa hatasız", async () => {
    const { akis } = sahteAkis({
      onceden: async () => {
        throw new GirisHatasi({ kod: "ag_hatasi" });
      },
    });
    await akis.basla("jtn");
    await akis.onayla();
    expect(akis.durum).toMatchObject({ ekran: "g1", hata: { kod: "ag_hatasi" } });
  });
});

describe("GirisAkisi: oturum süresi ve çıkış", () => {
  it("oyundayken bilet 401: g7; giriş ekranlarındayken dokunmaz; 'giriş yap' g1'e götürür", async () => {
    const a = sahteAkis({ ben: async () => ({ tamam: true, veri: { tamam: true, eposta: "a@b.co", oyuncu: "o_9", oturumBitis: 5, oturumMutlakBitis: 6 } }) });
    await a.akis.basla();
    expect(a.akis.durum.ekran).toBe("oyun");
    a.yokVer();
    expect(a.akis.durum).toMatchObject({ ekran: "g7", hata: { kod: "oturum_yok", anahtar: "giris.G6.oturum_yok", eylem: "giris" } });
    expect(a.temizlendi()).toBe(1);
    a.akis.yenidenGirisYap();
    expect(a.akis.durum).toMatchObject({ ekran: "g1", hata: null, oyuncu: null });
    a.yokVer();
    expect(a.akis.durum.ekran).toBe("g1");
  });

  it("çıkış: g1 ve cikisYapildi; hata olursa ekran değişmez; oturum zaten yoksa da çıkış sayılır", async () => {
    const a = sahteAkis({ ben: async () => ({ tamam: true, veri: { tamam: true, eposta: "a@b.co", oyuncu: "o_9", oturumBitis: 5, oturumMutlakBitis: 6 } }) });
    await a.akis.basla();
    expect(await a.akis.cikis(false)).toBe(true);
    expect(a.akis.durum).toMatchObject({ ekran: "g1", cikisYapildi: true, oyuncu: null });
    const b = sahteAkis({ cikisTumu: async () => ({ tamam: false, kod: "ag_hatasi" }), ben: async () => ({ tamam: true, veri: { tamam: true, eposta: "a@b.co", oyuncu: "o_9", oturumBitis: 5, oturumMutlakBitis: 6 } }) });
    await b.akis.basla();
    expect(await b.akis.cikis(true)).toBe(false);
    expect(b.akis.durum).toMatchObject({ ekran: "oyun", hata: { kod: "ag_hatasi" } });
    const c = sahteAkis({ cikis: async () => ({ tamam: false, kod: "oturum_yok", durum: 401 }), ben: async () => ({ tamam: true, veri: { tamam: true, eposta: "a@b.co", oyuncu: "o_9", oturumBitis: 5, oturumMutlakBitis: 6 } }) });
    await c.akis.basla();
    expect(await c.akis.cikis(false)).toBe(true);
    expect(c.akis.durum.ekran).toBe("g1");
  });

  it("yeni gönderim cikisYapildi iletisini kaldırır", async () => {
    const a = sahteAkis({ ben: async () => ({ tamam: true, veri: { tamam: true, eposta: "a@b.co", oyuncu: "o_9", oturumBitis: 5, oturumMutlakBitis: 6 } }) });
    await a.akis.basla();
    await a.akis.cikis(false);
    await a.akis.epostaGonder("ali@ornek.com");
    expect(a.akis.durum).toMatchObject({ ekran: "g2", cikisYapildi: false });
  });
});

/**
 * Giriş HTTP uçları (`/giris/...`): sunucunun mevcut HTTP sunucusuna takılır (`SunucuSecenekleri.giris`). Sözleşme: `@bolge/protokol` giris.ts.
 *
 * Güvenlik:
 * - Durum değiştiren HER POST `Origin` ister ve izin listesinde olmalıdır (CSRF); Origin'siz ya da yabancı kökenli istek 403.
 * - JSON uçları `Content-Type: application/json` ister (basit form gönderimi başka siteden yapılamaz). Yalnız onay sayfasının kendi
 *   formu (`application/x-www-form-urlencoded`) `/giris/onay`'a gelebilir.
 * - Çerezler `HttpOnly; SameSite=Lax; Path=/giris` (üretimde ayrıca `Secure`). Yanıtlar `no-store`.
 * - `GET /giris/onay` YAN ETKİSİZDİR (önizleme botları bağlantıyı tüketemez); oturum yalnız `POST /giris/onay` ile açılır.
 * - `POST /giris/istek` hesabın varlığını sızdırmaz: yanıt (durum, gövde, başlık adları) her geçerli adres için aynıdır ve posta yanıttan
 *   sonra gönderilir.
 * - Günlük/metrik: belirteç, tam adres ve IP yazılmaz.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { GIRIS_TARAYICI_CEREZI, GIRIS_YOLLARI, GirisIstegiSemasi, GirisOnayiSemasi, OTURUM_CEREZI } from "@bolge/protokol";
import type { GirisAdOneriYaniti, GirisAdYaniti, GirisBenYaniti, GirisBiletYaniti, GirisHataKodu, GirisHatasi, GirisIstekYaniti, GirisOnayYaniti } from "@bolge/protokol";
import type { GirisHizmeti, IptalOlayi } from "./hizmet";
import type { GirisSayaclari } from "./sayac";

/** Sunucunun (`sunucu.ts`) giriş katmanından beklediği yüzey. */
export interface GirisBaglantisi {
  /** `/giris/` altındaki isteği işler. */
  isle(istek: IncomingMessage, yanit: ServerResponse): Promise<boolean>;
  /** ws el sıkışmasında `Origin` izin listesi (boşsa denetim yok). */
  readonly izinliKokenler: readonly string[];
  iptalDinle(f: (o: IptalOlayi) => void): void;
  readonly sayaclar: GirisSayaclari;
  bakim(): Promise<void>;
}

export interface GirisUclariSecenekleri {
  hizmet: GirisHizmeti;
  /** İzin verilen kökenler (`https://oyun.ornek.org`); POST uçları ve ws için. Sonda `/` olmaz. */
  izinliKokenler: readonly string[];
  /** Çerezlere `Secure` eklenir (üretimde zorunlu; geliştirmede `http://localhost` için kapalı). */
  cerezGuvenli?: boolean;
  /** Ters vekil arkasında istemci IP'si `X-Forwarded-For`'un SON öğesidir (vekil ekler). Varsayılan kapalı. */
  guvenilirProxy?: boolean;
  /** Onay sayfası (form) başarıyla bitince yönlendirilecek adres; yoksa kısa bir sayfa gösterilir. */
  girisSonrasiAdres?: string;
}

const GOVDE_SINIRI = 4096;
const HATA_DURUMU: Record<GirisHataKodu, number> = {
  gecersiz_istek: 400,
  gecersiz_eposta: 422,
  gecici_eposta: 422,
  hiz_siniri: 429,
  baglanti_gecersiz: 400,
  tarayici_uyumsuz: 403,
  ad_gecersiz: 422,
  ad_yasakli: 422,
  ad_sinir: 429,
  oturum_yok: 401,
  origin: 403,
  yontem: 405,
  bulunamadi: 404,
  ic_hata: 500,
};
const HATA_METNI: Record<GirisHataKodu, string> = {
  gecersiz_istek: "istek gecersiz",
  gecersiz_eposta: "e-posta adresi gecersiz",
  gecici_eposta: "gecici e-posta adresleri kabul edilmiyor",
  hiz_siniri: "cok fazla istek; biraz sonra yeniden deneyin",
  baglanti_gecersiz: "baglanti gecersiz, suresi dolmus ya da daha once kullanilmis",
  tarayici_uyumsuz: "baglanti girisi istediginiz tarayicida acilmali",
  ad_gecersiz: "ad gecersiz",
  ad_yasakli: "ad kullanilamaz",
  ad_sinir: "ad gunde en cok bir kez degistirilebilir",
  oturum_yok: "oturum yok ya da suresi dolmus",
  origin: "kaynak (Origin) izinli degil",
  yontem: "yontem desteklenmiyor",
  bulunamadi: "yok",
  ic_hata: "sunucu hatasi",
};
const SAYFA_METNI: Partial<Record<GirisHataKodu, string>> = {
  baglanti_gecersiz: "bağlantı geçersiz, süresi dolmuş ya da daha önce kullanılmış. oyundan yeni bir bağlantı isteyin.",
  tarayici_uyumsuz: "bu bağlantıyı girişi istediğiniz tarayıcıda açın.",
  hiz_siniri: "çok fazla deneme yapıldı. biraz sonra yeniden deneyin.",
  gecici_eposta: "geçici e-posta adresleri kabul edilmiyor.",
  origin: "bu istek bu adresten yapılamaz.",
};

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function sayfa(baslik: string, govde: string): string {
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${esc(baslik)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:3rem auto;max-width:28rem;padding:0 1rem}button{font:inherit;padding:.6rem 1.2rem;cursor:pointer}</style></head>
<body><h1>${esc(baslik)}</h1>${govde}</body></html>
`;
}

const SAYFA_BASLIKLARI: Record<string, string> = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function cerezOku(istek: IncomingMessage, ad: string): string | undefined {
  const baslik = istek.headers.cookie;
  if (!baslik) return undefined;
  for (const parca of baslik.split(";")) {
    const i = parca.indexOf("=");
    if (i > 0 && parca.slice(0, i).trim() === ad) return parca.slice(i + 1).trim();
  }
  return undefined;
}

async function govdeOku(istek: IncomingMessage): Promise<string | null> {
  const parcalar: Buffer[] = [];
  let toplam = 0;
  for await (const p of istek as AsyncIterable<Buffer>) {
    toplam += p.length;
    if (toplam > GOVDE_SINIRI) return null;
    parcalar.push(p);
  }
  return Buffer.concat(parcalar).toString("utf8");
}

export class GirisUclari implements GirisBaglantisi {
  /** Güncel izin listesi (sunucu her el sıkışmada okur; `kokenEkle` ile genişleyebilir). */
  readonly izinliKokenler: string[];
  private readonly izinli = new Set<string>();
  private readonly hizmet: GirisHizmeti;
  private readonly guvenli: boolean;
  private readonly proxy: boolean;
  private readonly sonrasi: string | undefined;

  constructor(s: GirisUclariSecenekleri) {
    this.hizmet = s.hizmet;
    this.izinliKokenler = [];
    for (const k of s.izinliKokenler) this.kokenEkle(k);
    this.guvenli = s.cerezGuvenli ?? false;
    this.proxy = s.guvenilirProxy ?? false;
    this.sonrasi = s.girisSonrasiAdres;
  }

  /** İzin listesine köken ekler (örn. sunucunun dinlediği gerçek adres; port 0 ile açılışta bilinmez). */
  kokenEkle(k: string): void {
    const n = k.trim().replace(/\/+$/, "").toLowerCase();
    if (n === "" || this.izinli.has(n)) return;
    this.izinli.add(n);
    this.izinliKokenler.push(n);
  }

  get sayaclar(): GirisSayaclari {
    return this.hizmet.sayaclar;
  }

  iptalDinle(f: (o: IptalOlayi) => void): void {
    this.hizmet.iptalDinle(f);
  }

  bakim(): Promise<void> {
    return this.hizmet.bakim();
  }

  async isle(istek: IncomingMessage, yanit: ServerResponse): Promise<boolean> {
    try {
      await this.yonlendir(istek, yanit);
    } catch {
      // İç hata ayrıntısı (adres/belirteç içerebilir) yazılmaz.
      if (!yanit.headersSent) this.hata(istek, yanit, "ic_hata");
      else yanit.end();
    }
    return true;
  }

  // --- yardımcılar ----------------------------------------------------------------------------------------------------------------

  private kokenIzinli(istek: IncomingMessage): boolean {
    const o = istek.headers.origin;
    return typeof o === "string" && this.izinli.has(o.trim().replace(/\/+$/, "").toLowerCase());
  }

  /** İzinli köken için CORS başlıkları (kimlik bilgili istek: köken yansıtılır, `*` değil). */
  private baslik(istek: IncomingMessage, ek: Record<string, string | string[]> = {}): Record<string, string | string[]> {
    const b: Record<string, string | string[]> = { "cache-control": "no-store", "x-content-type-options": "nosniff", vary: "Origin", ...ek };
    if (this.kokenIzinli(istek)) {
      b["access-control-allow-origin"] = istek.headers.origin as string;
      b["access-control-allow-credentials"] = "true";
    }
    return b;
  }

  private json(istek: IncomingMessage, yanit: ServerResponse, kod: number, govde: object, ek: Record<string, string | string[]> = {}): void {
    yanit.writeHead(kod, this.baslik(istek, { "content-type": "application/json; charset=utf-8", ...ek }));
    yanit.end(JSON.stringify(govde));
  }

  private hata(istek: IncomingMessage, yanit: ServerResponse, kod: GirisHataKodu, ek: { beklemeSn?: number; mesaj?: string; baslik?: Record<string, string | string[]> } = {}): void {
    const g: GirisHatasi = { tamam: false, kod, mesaj: ek.mesaj ?? HATA_METNI[kod], ...(ek.beklemeSn !== undefined ? { beklemeSn: ek.beklemeSn } : {}) };
    const retry: Record<string, string> = ek.beklemeSn !== undefined ? { "retry-after": String(ek.beklemeSn) } : {};
    this.json(istek, yanit, HATA_DURUMU[kod], g, { ...retry, ...ek.baslik });
  }

  private ip(istek: IncomingMessage): string {
    let ip = istek.socket.remoteAddress ?? "bilinmiyor";
    if (this.proxy) {
      const x = istek.headers["x-forwarded-for"];
      const son = (Array.isArray(x) ? x.join(",") : (x ?? "")).split(",").at(-1)?.trim();
      if (son) ip = son;
    }
    return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  }

  private cerezYaz(ad: string, deger: string, omurSn: number): string {
    return `${ad}=${deger}; Path=/giris; HttpOnly; SameSite=Lax; Max-Age=${omurSn}${this.guvenli ? "; Secure" : ""}`;
  }

  private cerezSil(ad: string): string {
    return this.cerezYaz(ad, "", 0);
  }

  /** POST ön koşulları: izinli Origin (CSRF). Reddedilirse yanıt verilmiş ve false döner. */
  private postOnKosulu(istek: IncomingMessage, yanit: ServerResponse, form = false): boolean {
    if (!this.kokenIzinli(istek)) {
      this.sayaclar.artir("http.origin_reddi");
      this.hata(istek, yanit, "origin");
      return false;
    }
    const tur = (istek.headers["content-type"] ?? "").split(";")[0]?.trim().toLowerCase();
    // Gövdesiz uçlar (bilet, çıkış) içerik türü istemez; gövdeli uçlar JSON ister (onay sayfasının formu hariç).
    const govdeVar = Number(istek.headers["content-length"] ?? "0") > 0 || istek.headers["transfer-encoding"] !== undefined;
    if (govdeVar && tur !== "application/json" && !(form && tur === "application/x-www-form-urlencoded")) {
      this.hata(istek, yanit, "gecersiz_istek");
      return false;
    }
    return true;
  }

  private async jsonGovde(istek: IncomingMessage): Promise<unknown> {
    const metin = await govdeOku(istek);
    if (metin === null || metin === "") return undefined;
    try {
      return JSON.parse(metin);
    } catch {
      return undefined;
    }
  }

  // --- yönlendirme ----------------------------------------------------------------------------------------------------------------

  private async yonlendir(istek: IncomingMessage, yanit: ServerResponse): Promise<void> {
    const url = new URL(istek.url ?? "/", "http://yerel");
    const yol = url.pathname;
    const yontem = istek.method ?? "GET";

    if (yontem === "OPTIONS") {
      if (!this.kokenIzinli(istek)) return this.hata(istek, yanit, "origin");
      yanit.writeHead(204, this.baslik(istek, { "access-control-allow-methods": "GET, POST", "access-control-allow-headers": "content-type", "access-control-max-age": "600" }));
      return void yanit.end();
    }

    const izin = (...yontemler: string[]): boolean => {
      if (yontemler.includes(yontem)) return true;
      this.hata(istek, yanit, "yontem", { baslik: { allow: yontemler.join(", ") } });
      return false;
    };

    switch (yol) {
      case GIRIS_YOLLARI.istek:
        if (izin("POST")) await this.istek(istek, yanit);
        return;
      case GIRIS_YOLLARI.onay:
        if (yontem === "GET") return this.onaySayfasi(istek, yanit, url);
        if (izin("POST")) await this.onay(istek, yanit);
        return;
      case GIRIS_YOLLARI.bilet:
        if (izin("POST")) await this.bilet(istek, yanit);
        return;
      case GIRIS_YOLLARI.ben:
        if (izin("GET")) await this.ben(istek, yanit);
        return;
      case GIRIS_YOLLARI.adOner:
        if (!this.hizmet.adAcik) return this.hata(istek, yanit, "bulunamadi");
        if (izin("GET")) await this.adOner(istek, yanit);
        return;
      case GIRIS_YOLLARI.ad:
        // Görünen ad özelliği kapalıysa (adKurali verilmedi) uç yoktur.
        if (!this.hizmet.adAcik) return this.hata(istek, yanit, "bulunamadi");
        if (izin("POST")) await this.ad(istek, yanit);
        return;
      case GIRIS_YOLLARI.cikis:
      case GIRIS_YOLLARI.cikisTumu:
        if (izin("POST")) await this.cikis(istek, yanit, yol === GIRIS_YOLLARI.cikisTumu);
        return;
      default:
        return this.hata(istek, yanit, "bulunamadi");
    }
  }

  // --- uçlar ----------------------------------------------------------------------------------------------------------------------

  private async istek(istek: IncomingMessage, yanit: ServerResponse): Promise<void> {
    if (!this.postOnKosulu(istek, yanit)) return;
    const g = GirisIstegiSemasi.safeParse(await this.jsonGovde(istek));
    if (!g.success) return this.hata(istek, yanit, "gecersiz_istek");
    const r = this.hizmet.istekAl(g.data.eposta, this.ip(istek), cerezOku(istek, GIRIS_TARAYICI_CEREZI));
    if (!r.tamam) return this.hata(istek, yanit, r.kod, r.beklemeSn !== undefined ? { beklemeSn: r.beklemeSn } : {});
    const govde: GirisIstekYaniti = { tamam: true, gecerlilikSn: r.gecerlilikSn };
    const cerez = r.tarayiciCerezi === null ? [] : [this.cerezYaz(GIRIS_TARAYICI_CEREZI, r.tarayiciCerezi, r.gecerlilikSn)];
    this.json(istek, yanit, 202, govde, cerez.length > 0 ? { "set-cookie": cerez } : {});
  }

  /** Yan etkisiz: yalnız onay sayfası (jeton tüketilmez, oturum açılmaz). */
  private onaySayfasi(istek: IncomingMessage, yanit: ServerResponse, url: URL): void {
    const j = url.searchParams.get("j") ?? "";
    if (!this.hizmet.baglantiGecerliMi(j)) {
      yanit.writeHead(400, SAYFA_BASLIKLARI);
      return void yanit.end(sayfa("giriş bağlantısı geçersiz", `<p>${esc(SAYFA_METNI.baglanti_gecersiz as string)}</p>`));
    }
    yanit.writeHead(200, SAYFA_BASLIKLARI);
    yanit.end(
      sayfa(
        "giriş onayı",
        `<p>bölge stratejisi hesabına girmek için onaylayın.</p>\n<form method="post" action="${GIRIS_YOLLARI.onay}"><input type="hidden" name="j" value="${esc(j)}"><button type="submit">giriş yap</button></form>`,
      ),
    );
  }

  private async onay(istek: IncomingMessage, yanit: ServerResponse): Promise<void> {
    if (!this.postOnKosulu(istek, yanit, true)) return;
    const form = (istek.headers["content-type"] ?? "").toLowerCase().startsWith("application/x-www-form-urlencoded");
    let j: string | undefined;
    if (form) {
      const metin = await govdeOku(istek);
      j = metin === null ? undefined : (new URLSearchParams(metin).get("j") ?? undefined);
    } else {
      const g = GirisOnayiSemasi.safeParse(await this.jsonGovde(istek));
      j = g.success ? g.data.j : undefined;
    }
    if (j === undefined || j === "" || j.length > 512) return this.onayHatasi(istek, yanit, form, "gecersiz_istek");
    const r = await this.hizmet.onayla(j, cerezOku(istek, GIRIS_TARAYICI_CEREZI) ?? null, this.ip(istek));
    if (!r.tamam) return this.onayHatasi(istek, yanit, form, r.kod, r.beklemeSn);
    const cerezler = [this.cerezYaz(OTURUM_CEREZI, r.belirtec, r.cerezOmruSn), this.cerezSil(GIRIS_TARAYICI_CEREZI)];
    if (form) {
      if (this.sonrasi !== undefined) {
        yanit.writeHead(303, { ...SAYFA_BASLIKLARI, location: this.sonrasi, "set-cookie": cerezler });
        return void yanit.end();
      }
      yanit.writeHead(200, { ...SAYFA_BASLIKLARI, "set-cookie": cerezler });
      return void yanit.end(sayfa("giriş yapıldı", "<p>giriş yapıldı. bu sekmeyi kapatıp oyuna dönebilirsiniz.</p>"));
    }
    const govde: GirisOnayYaniti = { tamam: true, yeniHesap: r.yeniHesap, oyuncu: r.oyuncu, ...(r.ad !== undefined ? { ad: r.ad, adSecildi: r.adSecildi === true } : {}) };
    this.json(istek, yanit, 200, govde, { "set-cookie": cerezler });
  }

  private onayHatasi(istek: IncomingMessage, yanit: ServerResponse, form: boolean, kod: GirisHataKodu, beklemeSn?: number): void {
    if (!form) return this.hata(istek, yanit, kod, beklemeSn !== undefined ? { beklemeSn } : {});
    yanit.writeHead(HATA_DURUMU[kod], SAYFA_BASLIKLARI);
    yanit.end(sayfa("giriş yapılamadı", `<p>${esc(SAYFA_METNI[kod] ?? "giriş yapılamadı.")}</p>`));
  }

  /** Oturum çerezi kayan süreyle uzadıysa çerezi yeni ömürle yeniden verir. */
  private yenile(belirtec: string | undefined, r: { uzatildi: boolean; cerezOmruSn: number }): Record<string, string | string[]> {
    return r.uzatildi && belirtec !== undefined ? { "set-cookie": [this.cerezYaz(OTURUM_CEREZI, belirtec, r.cerezOmruSn)] } : {};
  }

  private async bilet(istek: IncomingMessage, yanit: ServerResponse): Promise<void> {
    if (!this.postOnKosulu(istek, yanit)) return;
    const belirtec = cerezOku(istek, OTURUM_CEREZI);
    const r = await this.hizmet.biletUret(belirtec);
    if (!r.tamam) return this.hata(istek, yanit, r.kod, r.beklemeSn !== undefined ? { beklemeSn: r.beklemeSn } : {});
    const govde: GirisBiletYaniti = { tamam: true, bilet: r.bilet, bitis: r.bitis, oyuncu: r.oyuncu };
    this.json(istek, yanit, 200, govde, this.yenile(belirtec, r.oturum));
  }

  private async ben(istek: IncomingMessage, yanit: ServerResponse): Promise<void> {
    const belirtec = cerezOku(istek, OTURUM_CEREZI);
    const r = await this.hizmet.oturumBul(belirtec);
    if (!r) return this.hata(istek, yanit, "oturum_yok");
    const govde: GirisBenYaniti = {
      tamam: true,
      eposta: r.hesap.eposta,
      oyuncu: r.hesap.oyuncu,
      oturumBitis: r.oturum.bitis,
      oturumMutlakBitis: r.oturum.mutlakBitis,
      ...(r.hesap.ad !== undefined ? { ad: r.hesap.ad, adSecildi: r.hesap.adSecildi === true } : {}),
    };
    this.json(istek, yanit, 200, govde, this.yenile(belirtec, r));
  }

  /** `GET /giris/ad-oner`: yeni bir opak ad önerisi (kaydetmez). */
  private async adOner(istek: IncomingMessage, yanit: ServerResponse): Promise<void> {
    const belirtec = cerezOku(istek, OTURUM_CEREZI);
    const r = await this.hizmet.adOner(belirtec);
    if (!r.tamam) return this.hata(istek, yanit, r.kod, r.beklemeSn !== undefined ? { beklemeSn: r.beklemeSn } : {});
    const govde: GirisAdOneriYaniti = { tamam: true, ad: r.ad };
    this.json(istek, yanit, 200, govde);
  }

  /** `POST /giris/ad {ad}`: görünen adı seçer/değiştirir (oturum çerezi + izinli Origin). */
  private async ad(istek: IncomingMessage, yanit: ServerResponse): Promise<void> {
    if (!this.postOnKosulu(istek, yanit)) return;
    const girdi = await this.jsonGovde(istek);
    // Ad alanının varlığı denetlenir; uzunluk/karakter kuralını ÇEKİRDEK söyler (okunur ileti; protokol şeması sınırı aynıdır: istemci için `GirisAdIstegiSemasi`).
    const ham = typeof girdi === "object" && girdi !== null && !Array.isArray(girdi) ? (girdi as { ad?: unknown }).ad : undefined;
    if (ham === undefined) return this.hata(istek, yanit, "gecersiz_istek");
    const r = await this.hizmet.adSec(cerezOku(istek, OTURUM_CEREZI), ham);
    if (!r.tamam) return this.hata(istek, yanit, r.kod, { ...(r.beklemeSn !== undefined ? { beklemeSn: r.beklemeSn } : {}), ...(r.mesaj !== undefined ? { mesaj: r.mesaj } : {}) });
    const govde: GirisAdYaniti = { tamam: true, ad: r.ad, adSecildi: true };
    this.json(istek, yanit, 200, govde);
  }

  private async cikis(istek: IncomingMessage, yanit: ServerResponse, tumu: boolean): Promise<void> {
    if (!this.postOnKosulu(istek, yanit)) return;
    const belirtec = cerezOku(istek, OTURUM_CEREZI);
    const ok = tumu ? await this.hizmet.cikisTumu(belirtec) : await this.hizmet.cikis(belirtec);
    if (tumu && !ok) return this.hata(istek, yanit, "oturum_yok");
    // Çıkış idempotenttir: geçersiz çerez de temizlenir.
    this.json(istek, yanit, 200, { tamam: true }, { "set-cookie": [this.cerezSil(OTURUM_CEREZI)] });
  }
}

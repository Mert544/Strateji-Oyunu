/**
 * Giriş HTTP istemcisi (G9-a; saf mantık, DOM yok): `@bolge/protokol` `giris.ts` sözleşmesinin ince sarmalayıcısı (çalışma zamanında protokol içe aktarılmaz: aşağıdaki boyut notu).
 *
 * - Çerez (httpOnly oturum çerezi) tarayıcıdadır: istekler `credentials: "include"` ile gider, kod çerezi OKUYAMAZ ve token'ı
 *   `localStorage`'a YAZMAZ. Sunucu ile AYNI SİTEDE olunmalıdır (SameSite=Lax); `Origin` başlığını tarayıcı koyar.
 * - Her yanıt sunucu şemasına karşılık gelen küçük bir işlevle doğrulanır; bozuk yanıt `yanit` hatasıdır. Hata gövdesi `{tamam:false, kod, mesaj, beklemeSn?}`;
 *   `mesaj` KULLANILMAZ (kod → metin tablosu istemcidedir: `hata.ts`).
 * - Ağ hatası `ag_hatasi`, zaman aşımı `zaman_asimi` kodudur; hiçbir yöntem fırlatmaz (sonuç nesnesi döner), `GirisHatasi` yalnız `BiletSaglayici`
 *   gibi "fırlatan" tüketiciler içindir.
 * - Hesabın var olup olmadığı yanıttan ayrılamaz (K2 sızdırmaz); burada da hiçbir ayrım yapılmaz.
 */
import type { GirisBenYaniti, GirisBiletYaniti, GirisHataKodu, GirisIstekYaniti, GirisOnayYaniti } from "@bolge/protokol";

/*
 * ÖNEMLİ (boyut): bu dosya kabuk paketine (dunya.html) girer. `@bolge/protokol` ÇALIŞMA ZAMANINDA içe aktarılmaz (zod ve bütün ws şemaları
 * kabuğa +25 KB gzip ekler; protokol yalnız harita.js'tedir): yollar ve kodlar burada küçük sabitlerdir, yanıt denetimi elle yazılmış
 * küçük işlevlerdir. `test/giris-mantik.test.ts` bu kopyaların protokol şemalarıyla AYNI olduğunu sınar (yol, kod listesi, örnek yanıtlar).
 */
export const GIRIS_YOLLARI = {
  istek: "/giris/istek",
  onay: "/giris/onay",
  bilet: "/giris/bilet",
  ben: "/giris/ben",
  cikis: "/giris/cikis",
  cikisTumu: "/giris/cikis-tumu",
} as const;

/** `GirisHataKodu` (protokol `giris.ts`) değerlerinin kopyası; sınama eşitliği korur. */
export const GIRIS_HATA_KODLARI: readonly GirisHataKodu[] = ["gecersiz_istek", "gecersiz_eposta", "gecici_eposta", "hiz_siniri", "baglanti_gecersiz", "tarayici_uyumsuz", "oturum_yok", "origin", "yontem", "bulunamadi", "ic_hata"];

type Nesne = Record<string, unknown>;
const nesneMi = (v: unknown): v is Nesne => typeof v === "object" && v !== null && !Array.isArray(v);
const tamsayi = (v: unknown, enAz: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= enAz;
const dizge = (v: unknown, enAz: number, enCok: number): v is string => typeof v === "string" && v.length >= enAz && v.length <= enCok;

/** Yanıt doğrulayıcı: geçerliyse (tipli) değeri, değilse null döndürür. */
type Dogrula<T> = (v: unknown) => T | null;

const dogrulaIstek: Dogrula<GirisIstekYaniti> = (v) => (nesneMi(v) && v["tamam"] === true && tamsayi(v["gecerlilikSn"], 1) ? { tamam: true, gecerlilikSn: v["gecerlilikSn"] } : null);
const dogrulaOnay: Dogrula<GirisOnayYaniti> = (v) =>
  nesneMi(v) && v["tamam"] === true && typeof v["yeniHesap"] === "boolean" && dizge(v["oyuncu"], 1, 32) ? { tamam: true, yeniHesap: v["yeniHesap"], oyuncu: v["oyuncu"] } : null;
const dogrulaBilet: Dogrula<GirisBiletYaniti> = (v) =>
  nesneMi(v) && v["tamam"] === true && dizge(v["bilet"], 1, 4096) && tamsayi(v["bitis"], 1) && dizge(v["oyuncu"], 1, 32) ? { tamam: true, bilet: v["bilet"], bitis: v["bitis"], oyuncu: v["oyuncu"] } : null;
const dogrulaBen: Dogrula<GirisBenYaniti> = (v) =>
  nesneMi(v) && v["tamam"] === true && typeof v["eposta"] === "string" && dizge(v["oyuncu"], 1, 32) && tamsayi(v["oturumBitis"], 1) && tamsayi(v["oturumMutlakBitis"], 1)
    ? { tamam: true, eposta: v["eposta"], oyuncu: v["oyuncu"], oturumBitis: v["oturumBitis"], oturumMutlakBitis: v["oturumMutlakBitis"] }
    : null;
const dogrulaTamam: Dogrula<{ tamam: true }> = (v) => (nesneMi(v) && v["tamam"] === true ? { tamam: true } : null);

/** Hata gövdesi `{tamam:false, kod, mesaj, beklemeSn?}`; `mesaj` okunmaz ama biçim denetlenir. */
function hataGovdesi(v: unknown): { kod: GirisHataKodu; beklemeSn?: number } | null {
  if (!nesneMi(v) || v["tamam"] !== false || typeof v["mesaj"] !== "string") return null;
  const kod = v["kod"];
  if (typeof kod !== "string" || !(GIRIS_HATA_KODLARI as readonly string[]).includes(kod)) return null;
  const bekleme = v["beklemeSn"];
  if (bekleme !== undefined && !tamsayi(bekleme, 0)) return null;
  return { kod: kod as GirisHataKodu, ...(bekleme !== undefined ? { beklemeSn: bekleme } : {}) };
}

/**
 * Sunucunun hata kodları + istemci tarafı üç durum: `ag_hatasi` (bağlantı kurulamadı), `zaman_asimi` (yanıt gelmedi; metni
 * `ag_hatasi` ile aynı) ve `yanit` (beklenmeyen/bozuk yanıt; metni `ic_hata` ile aynı). Metin anahtarı `hata.ts`'tedir.
 */
export type IstemciHataKodu = GirisHataKodu | "ag_hatasi" | "zaman_asimi" | "yanit";

export interface GirisHatasiBilgisi {
  kod: IstemciHataKodu;
  /** `hiz_siniri` için sunucunun bekleme süresi (sn; gövdeden ya da `Retry-After`'den). */
  beklemeSn?: number;
  /** HTTP durumu (ağ hatasında yok). */
  durum?: number;
}

export type GirisSonucu<T> = { tamam: true; veri: T } | ({ tamam: false } & GirisHatasiBilgisi);

/** Fırlatılan biçim (`BiletSaglayici` ve `WsBaglanti` bu sınıfı `kod` alanıyla tanır). */
export class GirisHatasi extends Error {
  readonly kod: IstemciHataKodu;
  readonly beklemeSn: number | undefined;
  constructor(b: GirisHatasiBilgisi) {
    super(`giris hatasi: ${b.kod}`);
    this.name = "GirisHatasi";
    this.kod = b.kod;
    this.beklemeSn = b.beklemeSn;
  }
}

export interface GirisAgSecenekleri {
  /** Sunucunun HTTP kökü, sonda `/` olmadan ("" = bu sayfayla aynı köken). */
  taban: string;
  /** Sınama için başka bir `fetch` (çerez kavanozlu); varsayılan `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** İstek zaman aşımı (ms). Varsayılan 15 000 (K2 posta zaman aşımı ile uyumlu). */
  zamanAsimiMs?: number;
}

/** `ws://host:port` → `http://host:port` (`wss` → `https`); yol ve sorgu atılır. Çözülemezse "". */
export function httpTabani(wsUrl: string): string {
  try {
    const u = new URL(wsUrl);
    const sema = u.protocol === "wss:" ? "https:" : u.protocol === "ws:" ? "http:" : u.protocol;
    return `${sema}//${u.host}`;
  } catch {
    return "";
  }
}

export class GirisApi {
  private readonly taban: string;
  private readonly fetchFn: typeof fetch;
  private readonly zamanAsimiMs: number;

  constructor(s: GirisAgSecenekleri) {
    this.taban = s.taban.replace(/\/+$/, "");
    this.fetchFn = s.fetch ?? ((...a) => globalThis.fetch(...a));
    this.zamanAsimiMs = s.zamanAsimiMs ?? 15_000;
  }

  /** `POST /giris/istek`: her geçerli adres için aynı 202 (hesap varlığı, sınır ve posta sonucu sızmaz). */
  istek(eposta: string): Promise<GirisSonucu<GirisIstekYaniti>> {
    return this.cagir(GIRIS_YOLLARI.istek, "POST", dogrulaIstek, { eposta });
  }

  /** `POST /giris/onay {j}`: jetonu oturuma çevirir (çerez tarayıcıya yazılır). */
  onayla(jeton: string): Promise<GirisSonucu<GirisOnayYaniti>> {
    return this.cagir(GIRIS_YOLLARI.onay, "POST", dogrulaOnay, { j: jeton });
  }

  /** `POST /giris/bilet` (çerezle): 60 sn ömürlü, tek kullanımlık ws bileti. */
  bilet(): Promise<GirisSonucu<GirisBiletYaniti>> {
    return this.cagir(GIRIS_YOLLARI.bilet, "POST", dogrulaBilet);
  }

  /** `GET /giris/ben`: oturum var mı (yoksa `oturum_yok`). */
  ben(): Promise<GirisSonucu<GirisBenYaniti>> {
    return this.cagir(GIRIS_YOLLARI.ben, "GET", dogrulaBen);
  }

  /** `POST /giris/cikis`: bu oturumu kapatır (idempotan). */
  cikis(): Promise<GirisSonucu<{ tamam: true }>> {
    return this.cagir(GIRIS_YOLLARI.cikis, "POST", dogrulaTamam);
  }

  /** `POST /giris/cikis-tumu`: hesabın bütün oturumlarını kapatır. */
  cikisTumu(): Promise<GirisSonucu<{ tamam: true }>> {
    return this.cagir(GIRIS_YOLLARI.cikisTumu, "POST", dogrulaTamam);
  }

  /** Ortak çağrı: asla fırlatmaz. */
  private async cagir<T>(yol: string, yontem: "GET" | "POST", dogrula: Dogrula<T>, govde?: object): Promise<GirisSonucu<T>> {
    const kontrol = new AbortController();
    const zamanlayici = setTimeout(() => kontrol.abort(), this.zamanAsimiMs);
    try {
      const baslik: Record<string, string> = { accept: "application/json" };
      if (govde !== undefined) baslik["content-type"] = "application/json";
      const r = await this.fetchFn(`${this.taban}${yol}`, {
        method: yontem,
        credentials: "include",
        cache: "no-store",
        redirect: "manual",
        headers: baslik,
        signal: kontrol.signal,
        ...(govde !== undefined ? { body: JSON.stringify(govde) } : {}),
      });
      const metin = await r.text();
      let json: unknown = null;
      try {
        json = metin === "" ? null : JSON.parse(metin);
      } catch {
        json = null;
      }
      if (r.ok) {
        const d = dogrula(json);
        return d !== null ? { tamam: true, veri: d } : { tamam: false, kod: "yanit", durum: r.status };
      }
      const h = hataGovdesi(json);
      const retry = Number(r.headers.get("retry-after"));
      const retrySn = Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : undefined;
      if (h !== null) {
        const bekleme = h.beklemeSn ?? (h.kod === "hiz_siniri" ? retrySn : undefined);
        return { tamam: false, kod: h.kod, durum: r.status, ...(bekleme !== undefined ? { beklemeSn: bekleme } : {}) };
      }
      // Sunucu dışı bir yanıt (ters vekil hatası vb.): durumdan en yakın kod; yoksa `yanit`
      if (r.status === 429) return { tamam: false, kod: "hiz_siniri", durum: 429, ...(retrySn !== undefined ? { beklemeSn: retrySn } : {}) };
      if (r.status === 401) return { tamam: false, kod: "oturum_yok", durum: 401 };
      return { tamam: false, kod: "yanit", durum: r.status };
    } catch (e) {
      // AbortError (zaman aşımı); TypeError (ağ) ve gövde okunamadı
      return { tamam: false, kod: (e as { name?: string } | null)?.name === "AbortError" ? "zaman_asimi" : "ag_hatasi" };
    } finally {
      clearTimeout(zamanlayici);
    }
  }
}

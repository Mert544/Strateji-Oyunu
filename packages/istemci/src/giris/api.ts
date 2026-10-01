/**
 * Giriş HTTP istemcisi (G9-a; saf mantık, DOM yok): `@bolge/protokol` `giris.ts` sözleşmesinin ince sarmalayıcısı.
 *
 * - Çerez (httpOnly oturum çerezi) tarayıcıdadır: istekler `credentials: "include"` ile gider, kod çerezi OKUYAMAZ ve token'ı
 *   `localStorage`'a YAZMAZ. Sunucu ile AYNI SİTEDE olunmalıdır (SameSite=Lax); `Origin` başlığını tarayıcı koyar.
 * - Her yanıt sunucu şemasıyla doğrulanır; bozuk yanıt `yanit` hatasıdır. Hata gövdesi `{tamam:false, kod, mesaj, beklemeSn?}`;
 *   `mesaj` KULLANILMAZ (kod → metin tablosu istemcidedir: `hata.ts`).
 * - Ağ hatası `ag_hatasi`, zaman aşımı `zaman_asimi` kodudur; hiçbir yöntem fırlatmaz (sonuç nesnesi döner), `GirisHatasi` yalnız `BiletSaglayici`
 *   gibi "fırlatan" tüketiciler içindir.
 * - Hesabın var olup olmadığı yanıttan ayrılamaz (K2 sızdırmaz); burada da hiçbir ayrım yapılmaz.
 */
import { GIRIS_YOLLARI, GirisBenYanitiSemasi, GirisBiletYanitiSemasi, GirisHatasiSemasi, GirisIstekYanitiSemasi, GirisOnayYanitiSemasi, GirisTamamSemasi } from "@bolge/protokol";
import type { GirisBenYaniti, GirisBiletYaniti, GirisHataKodu, GirisIstekYaniti, GirisOnayYaniti } from "@bolge/protokol";

/** Protokol şemalarının kullandığımız yüzü (istemci paketi `zod`a doğrudan bağlı değildir). */
interface Sema<T> {
  safeParse(v: unknown): { success: true; data: T } | { success: false };
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
    return this.cagir(GIRIS_YOLLARI.istek, "POST", GirisIstekYanitiSemasi, { eposta });
  }

  /** `POST /giris/onay {j}`: jetonu oturuma çevirir (çerez tarayıcıya yazılır). */
  onayla(jeton: string): Promise<GirisSonucu<GirisOnayYaniti>> {
    return this.cagir(GIRIS_YOLLARI.onay, "POST", GirisOnayYanitiSemasi, { j: jeton });
  }

  /** `POST /giris/bilet` (çerezle): 60 sn ömürlü, tek kullanımlık ws bileti. */
  bilet(): Promise<GirisSonucu<GirisBiletYaniti>> {
    return this.cagir(GIRIS_YOLLARI.bilet, "POST", GirisBiletYanitiSemasi);
  }

  /** `GET /giris/ben`: oturum var mı (yoksa `oturum_yok`). */
  ben(): Promise<GirisSonucu<GirisBenYaniti>> {
    return this.cagir(GIRIS_YOLLARI.ben, "GET", GirisBenYanitiSemasi);
  }

  /** `POST /giris/cikis`: bu oturumu kapatır (idempotan). */
  cikis(): Promise<GirisSonucu<{ tamam: true }>> {
    return this.cagir(GIRIS_YOLLARI.cikis, "POST", GirisTamamSemasi);
  }

  /** `POST /giris/cikis-tumu`: hesabın bütün oturumlarını kapatır. */
  cikisTumu(): Promise<GirisSonucu<{ tamam: true }>> {
    return this.cagir(GIRIS_YOLLARI.cikisTumu, "POST", GirisTamamSemasi);
  }

  /** Ortak çağrı: asla fırlatmaz. */
  private async cagir<T>(yol: string, yontem: "GET" | "POST", sema: Sema<T>, govde?: object): Promise<GirisSonucu<T>> {
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
        const d = sema.safeParse(json);
        return d.success ? { tamam: true, veri: d.data } : { tamam: false, kod: "yanit", durum: r.status };
      }
      const h = GirisHatasiSemasi.safeParse(json);
      const retry = Number(r.headers.get("retry-after"));
      const retrySn = Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : undefined;
      if (h.success) {
        const bekleme = h.data.beklemeSn ?? (h.data.kod === "hiz_siniri" ? retrySn : undefined);
        return { tamam: false, kod: h.data.kod, durum: r.status, ...(bekleme !== undefined ? { beklemeSn: bekleme } : {}) };
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

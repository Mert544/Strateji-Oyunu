/**
 * Giriş kipi ve bağlantı adresi (G9-a; saf): sayfa adresinden hangi kimlik yolunun kullanılacağı.
 *
 * - `sahte`: `?sunucu=` yok ve sayfa yerel/dosya/`?yerles=1`/`?sahte=1`: bellek içi sahte bağdaştırıcı, giriş yok. Barındırılan sayfada (yerel olmayan http/https kökeni)
 *   `?sunucu=` yoksa sayfanın KENDİ kökenine bağlanılır (`kokenSunucusu`): davetli oyuncu kısa adresle girer.
 * - `gelistirme`: `?sunucu=ws://...&token=<geliştirme token'ı>`: giriş ekranı YOK, token aynen `merhaba.token` olur
 *   (sunucu `--kimlik gelistirme`; geliştirme ve testler bu yolla çalışmaya devam eder).
 * - `eposta`: `?sunucu=ws://...` ve token yok: e-posta bağlantısıyla giriş (G5). Çerez httpOnly'dir; token `localStorage`'a yazılmaz.
 *
 * Postadaki bağlantı `<genel>/?j=<jeton>` biçimindedir (baş lider/K2 kararı): istemci `j`yi okur, adresten HEMEN siler
 * (`history.replaceState`; jeton Referer/yer imi/geçmişte kalmasın) ve `POST /giris/onay {j}` çağırır.
 */

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

export interface KonumBilgisi {
  protocol: string;
  host: string;
  hostname: string;
}

/** Yerel geliştirme adresleri: kendi köken varsayılanı uygulanmaz (sahte bağdaştırıcı ve `?sunucu=` ile geliştirme sürer). */
const YEREL_ADRES = /^(localhost|127(\.\d+){3}|\[::1\]|::1)$/i;

/**
 * Sayfanın kendi kökenindeki sunucu adresi (`?sunucu=` yokken varsayılan): https → `wss://<host>`, http → `ws://<host>` (yol bugünkü varsayılanla aynı: kök, `/`).
 * "" (varsayılan yok): `?sunucu=` var (değeri ne olursa olsun; geliştirme önceliklidir), `?yerles=1`, `?sahte=1`, http/https dışı (`file:`) ya da yerel adres.
 */
export function kokenSunucusu(konum: KonumBilgisi, arama: string): string {
  if (konum.protocol !== "https:" && konum.protocol !== "http:") return "";
  const q = new URLSearchParams(arama);
  if (q.has("sunucu") || q.get("yerles") === "1" || q.get("sahte") === "1") return "";
  if (YEREL_ADRES.test(konum.hostname)) return "";
  return `${konum.protocol === "https:" ? "wss" : "ws"}://${konum.host}`;
}

export type GirisKipi = "sahte" | "gelistirme" | "eposta";

export interface KipBilgisi {
  kip: GirisKipi;
  /** ws adresi (`sahte` dışında). */
  url?: string;
  /** Geliştirme token'ı (yalnız `gelistirme`). */
  token?: string;
  /** Giriş HTTP kökü (yalnız `eposta`): ws adresinden türetilir. */
  httpTabani?: string;
}

/** `varsayilanSunucu`: `?sunucu=` yokken kullanılacak adres (`kokenSunucusu`; verilirse `?sunucu=` olmasa da e-posta kipidir). */
export function girisKipi(arama: string, varsayilanSunucu?: string): KipBilgisi {
  const q = new URLSearchParams(arama);
  const url = q.get("sunucu") || varsayilanSunucu || "";
  if (!url) return { kip: "sahte" };
  const token = q.get("token") ?? "";
  if (token !== "") return { kip: "gelistirme", url, token };
  return { kip: "eposta", url, httpTabani: httpTabani(url) };
}

/** Adres sorgusundaki giriş bağlantısı jetonu (`?j=`); yoksa null. Çok uzun ya da boş değer reddedilir (sunucu şeması 1–512). */
export function baglantiJetonu(arama: string): string | null {
  const j = new URLSearchParams(arama).get("j");
  if (!j || j.length > 512) return null;
  return j;
}

/** Aynı adres, `j` parametresi atılmış (`history.replaceState` için): yol, diğer sorgu parametreleri ve `#parça` korunur. */
export function jetonsuzAdres(href: string): string {
  const u = new URL(href, "http://yerel.invalid");
  u.searchParams.delete("j");
  const sorgu = u.searchParams.toString();
  return `${u.pathname}${sorgu ? `?${sorgu}` : ""}${u.hash}`;
}

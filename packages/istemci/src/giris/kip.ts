/**
 * Giriş kipi ve bağlantı adresi (G9-a; saf): sayfa adresinden hangi kimlik yolunun kullanılacağı.
 *
 * - `sahte`: `?sunucu=` yok: bellek içi sahte bağdaştırıcı, giriş yok (bugünkü varsayılan).
 * - `gelistirme`: `?sunucu=ws://...&token=<geliştirme token'ı>`: giriş ekranı YOK, token aynen `merhaba.token` olur
 *   (sunucu `--kimlik gelistirme`; geliştirme ve testler bu yolla çalışmaya devam eder).
 * - `eposta`: `?sunucu=ws://...` ve token yok: e-posta bağlantısıyla giriş (G5). Çerez httpOnly'dir; token `localStorage`'a yazılmaz.
 *
 * Postadaki bağlantı `<genel>/?j=<jeton>` biçimindedir (baş lider/K2 kararı): istemci `j`yi okur, adresten HEMEN siler
 * (`history.replaceState`; jeton Referer/yer imi/geçmişte kalmasın) ve `POST /giris/onay {j}` çağırır.
 */
import { httpTabani } from "./api";

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

/** `varsayilanSunucu`: derleme zamanı üretim adresi (verilirse `?sunucu=` olmasa da e-posta kipidir). */
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

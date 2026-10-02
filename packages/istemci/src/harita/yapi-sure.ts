/**
 * Yapı inşa süresi gösterimi (saf): çekirdeğin erken oyun süre çarpanı TEK kaynaktır (protokol `erkenOyunCarpani`; oyuncu karesindeki `erkenOyun` formülü). Çarpan zamana
 * bağlıdır (katılımdan itibaren 24 sa sabit, 168. saate kadar doğrusal artış, sonra 1), bu yüzden süre kart açılırken ŞİMDİKİ zamanla hesaplanır; statik "ilk gün" süresi tutulmaz.
 * Çarpan inşa BAŞLADIĞI anda bir kez uygulanır: kart "şimdi kursan" süresini gösterir.
 */
import { erkenOyunCarpani } from "@bolge/protokol";
import type { ErkenOyunFormulu } from "@bolge/protokol";
import { esc, sureMetni } from "../arayuz/bicim";
import { mulkMetni } from "./mulk-metin";

const PPM = 1_000_000;
/** Çekirdek `carpliSure` tabanı: gerçek süre en az 1 dakika (normal süre ondan kısaysa normal süre). */
const EN_AZ_SAAT = 1 / 60;

/** Erken oyun çarpanı (0, 1] t anında; formül yoksa (parametre ya da oyuncu karesi yok) 1. */
export function sureCarpani(formul: Readonly<ErkenOyunFormulu> | undefined, t: number): number {
  return formul ? erkenOyunCarpani(formul, t) / PPM : 1;
}

export interface YapiSuresi {
  /** Normal inşa süresi (saat). */
  normal: number;
  /** Şimdi kurulursa süre (saat): normal × çarpan, en az 1 dakika. */
  simdi: number;
  /** Yeni oyuncu hızı uygulanıyor (şimdiki süre normalden kısa). */
  hizli: boolean;
}

/** Normal süre ve çarpandan şimdiki süre (çekirdek `carpliSure` ile aynı: en az 1 dakika, normal süreyi aşmaz). */
export function yapiSuresi(normalSaat: number, carpan = 1): YapiSuresi {
  const simdi = Math.min(normalSaat, Math.max(EN_AZ_SAAT, normalSaat * carpan));
  return { normal: normalSaat, simdi, hizli: simdi < normalSaat };
}

/** Maliyet kartı süre değeri (HTML kaçışlı): "24 dk (yeni oyuncu hızı; normalde 4 sa)"; hız yoksa yalnız süre. */
export function yapiSureHtml(s: YapiSuresi): string {
  return esc(s.hizli ? mulkMetni("yapi.satir_sure_hizli", { sure: sureMetni(s.simdi), normal: sureMetni(s.normal) }) : sureMetni(s.normal));
}

/** Formu olmayan komutlar (ayrı küçük modül: işçi paketi komut kaydının tamamını içe aktarmasın). */
import type { KomutTuru } from "./tipler";

/**
 * Arayüzde formu OLMAYAN çekirdek komutları (bilinçli liste; kayıt kapsam testi bunları muaf tutar):
 *   - `oyuncu_katil`: sistem komutu (oyuncu kurulumda katılır);
 *   - `kenar_gelistir`, `askeri_rezerv`: lojistik arka planda otomatik (F0 sakin görsel; lojistik oyuncunun ön
 *     planında değil). Komutlar çekirdekte durur; botlar kullanabilir, önerilen eylemlerde gösterilmez.
 */
export const GIZLI_KOMUTLAR: readonly KomutTuru[] = ["oyuncu_katil", "kenar_gelistir", "askeri_rezerv"];

/**
 * Mülk (parsel) komutları: komut formu yoktur, **harita modülünden gönderilir** (src/harita/: hücre seçimi ve
 * satın alma alt çubuğu -> `MulkBaglantisi.parselAl`). Kayıt kapsam testi bunları da muaf tutar.
 *   - `parsel_al`: L3 arsa ızgarasında seçim + "Satın al" (S8);
 *   - `tesis_insa_hucre`, `insaat_iptal`: inşa modu (sonraki sprint) — yine haritadan.
 */
export const HARITA_KOMUTLARI: readonly KomutTuru[] = ["parsel_al", "tesis_insa_hucre", "insaat_iptal", "yapi_yerlestir", "parsel_birak"];

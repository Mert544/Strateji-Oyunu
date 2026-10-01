/**
 * H6 ikinci koşulu: AÇILIŞ KOŞULU (baş lider kararı, 1 Ekim; docs/12 §13 "H6 ucuz arsa ölçütü"). "Uygun hücrelerin %20'si ucuz" eşiği
 * KALKTI (ayrılmış hücre uygun hücrelerin ~%19'udur ve tek ucuz kaynaktır: eşik yapısal olarak tutmuyordu). Yerine iki alt koşul (yalnız (i) karar verir):
 *  (i)  KATILIM ANINDA, katılınan ilçede taban fiyatlı (ayrılmış, satılmamış) hücre sayısı açılışın AYAK İZİNE yeter:
 *       `ayrilmisBos ≥ ayakIzi`. Ayak izi = açılışın ilk yapısının hücre sayısı (tür yuvası), YURT HÜCRELERİ HARİÇ: yurt ayrı ve
 *       ücretsiz verilir; ölçüt, geç gelenin yurdunun ÖTESİNDE taban fiyatla yapı hücresi bulup bulamadığıdır.
 *       Bilgi olarak yurt DAHİL sayım da verilir (`ayrilmisBos + yurtHucre ≥ ayakIzi`); karara girmez.
 *       Sayı denetimidir; hücrelerin kenar-bitişikliği ölçülmez.
 *  (ii) [BİLGİ, İNSAN TESTİ GEREKLİ] Katılımdan sonraki 14 gün içinde (14. günün sonu dahil) en az bir AÇILIŞ YAPISI kuruldu (kabul edilen yapı komutu).
 *       Pencere dolmadan yapı yoksa ölçülemez; yapı komutu pencerede varsa gözlem süresinden bağımsız "evet".
 * KARARA YALNIZ (i) GİRER (baş lider kararı): (ii) bot ölçeğinde bilgi vermez (botlar katılım anında kurar, ilk yapı 0 gün); hesaplanır ve raporlanır
 * ama İNSAN TESTİ GEREKLİDİR (Y1 ile aynı gerekçe). Olgu geçer ⇔ (i). Koşul tutar ⇔ TÜM olgular geçer (H6 "geç katılan her açılış için işe yarar").
 * Eski tanım (ucuz hücre payı ≥ %20) bilgi olarak raporda ayrı satırda kalır (`PARSEL_H6_UCUZ_HUCRE_ESIK_PPM`, h6.ts).
 */
import { GUN_MS, tamsayiDenetle } from "./ortak";
import { olculemez } from "./yeni-oyuncu";
import type { Olculemez } from "./yeni-oyuncu";

export const H6_ACILIS_PENCERESI_GUN = 14;
export const H6_ACILIS_PENCERESI_MS = H6_ACILIS_PENCERESI_GUN * GUN_MS;

export interface AcilisKosuluGirdisi {
  /** Katılınan ilçede, katılım anında (yurt verilmeden önce) satılmamış AYRILMIŞ (taban fiyatlı) hücre sayısı. */
  ayrilmisBos: number;
  /** Açılışın ilk yapısının hücre sayısı (tür yuvası; yurt hücreleri hariç). */
  ayakIzi: number;
  /** Katılımda verilen yurt hücresi sayısı (yalnız bilgi sayımı için). */
  yurtHucre: number;
  katilmaMs: number;
  /** Katılımdan sonra KABUL EDİLEN açılış yapısı komutlarının zamanları (ms). */
  acilisYapiMs: readonly number[];
  /** Gözlemin bittiği an (ms); pencere bu andan sonra bitiyorsa "yapı yok" ölçülemez. */
  gozlemSonuMs: number;
}

export interface AcilisKosuluSonucu {
  /** (i) ayrılmış boş ≥ ayak izi. */
  tabanYeter: boolean;
  /** Bilgi: yurt dahil sayım (ayrılmış boş + yurt ≥ ayak izi). */
  tabanYeterYurtDahil: boolean;
  /** (ii) BİLGİ (karara girmez; insan testi gerekli): pencerede açılış yapısı kuruldu mu; pencere dolmadan ve yapı yoksa null (ölçülemez). */
  yapiKuruldu: boolean | null;
  /** Kabul edilen ilk açılış yapısının katılımdan sonraki ms'si (pencere içi); yoksa null. */
  ilkYapiGecikmeMs: number | null;
  /** Olgu kararı = (i). (ii) karara girmez. */
  gecti: boolean;
}

/** (i): taban fiyatlı hücre ayak izine yeter mi (tam sınır dahil: ayak izi kadar hücre yeter). */
export function tabanHucreYeter(ayrilmisBos: number, ayakIzi: number): boolean {
  tamsayiDenetle(ayrilmisBos, "ayrilmisBos");
  tamsayiDenetle(ayakIzi, "ayakIzi");
  if (ayrilmisBos < 0) throw new Error(`h6 acilis: ayrilmisBos negatif olamaz (${ayrilmisBos})`);
  if (ayakIzi < 1) throw new Error(`h6 acilis: ayakIzi >= 1 olmali (${ayakIzi})`);
  return ayrilmisBos >= ayakIzi;
}

/**
 * (ii): katılımdan sonraki 14 günde (sınır dahil: tam katılma + 14 gün) açılış yapısı kuruldu mu.
 * Pencerede yapı varsa true; yoksa ve gözlem pencereyi kapsıyorsa false; kapsamıyorsa null. Katılımdan ÖNCEKİ komutlar sayılmaz.
 */
export function acilisYapisiKuruldu(katilmaMs: number, acilisYapiMs: readonly number[], gozlemSonuMs: number): { kuruldu: boolean | null; ilkGecikmeMs: number | null } {
  tamsayiDenetle(katilmaMs, "katilmaMs");
  tamsayiDenetle(gozlemSonuMs, "gozlemSonuMs");
  let ilk: number | null = null;
  for (const t of acilisYapiMs) {
    tamsayiDenetle(t, "acilisYapiMs");
    if (t < katilmaMs || t > katilmaMs + H6_ACILIS_PENCERESI_MS) continue;
    if (ilk === null || t - katilmaMs < ilk) ilk = t - katilmaMs;
  }
  if (ilk !== null) return { kuruldu: true, ilkGecikmeMs: ilk };
  return { kuruldu: gozlemSonuMs >= katilmaMs + H6_ACILIS_PENCERESI_MS ? false : null, ilkGecikmeMs: null };
}

export function acilisKosuluOlgusu(g: AcilisKosuluGirdisi): AcilisKosuluSonucu {
  tamsayiDenetle(g.yurtHucre, "yurtHucre");
  if (g.yurtHucre < 0) throw new Error(`h6 acilis: yurtHucre negatif olamaz (${g.yurtHucre})`);
  const tabanYeter = tabanHucreYeter(g.ayrilmisBos, g.ayakIzi);
  const y = acilisYapisiKuruldu(g.katilmaMs, g.acilisYapiMs, g.gozlemSonuMs);
  const gecti = tabanYeter;
  return { tabanYeter, tabanYeterYurtDahil: tabanHucreYeter(g.ayrilmisBos + g.yurtHucre, g.ayakIzi), yapiKuruldu: y.kuruldu, ilkYapiGecikmeMs: y.ilkGecikmeMs, gecti };
}

export interface H6AcilisSonucu {
  olculebilir: true;
  olguSayisi: number;
  /** KARAR: (i)'yi sağlayan olgular. */
  gecen: number;
  /** Bilgi dökümü: yurt dahil (i) tutan; (ii) tutan ve (ii) ölçülebilen olgular (insan testi gerekli). */
  tabanYeterYurtDahilSayisi: number;
  yapiKurulduSayisi: number;
  yapiOlculenOlgu: number;
  /** KOŞUL: TÜM olgular (i)'yi sağladı. */
  hedefGecti: boolean;
}

/** Açılış koşulu (toplu): TÜM olgular (i)'yi sağlarsa tutar; olgu yoksa ölçülemez. (ii) yalnız bilgi. */
export function h6AcilisKosulu(olgular: readonly AcilisKosuluSonucu[]): H6AcilisSonucu | Olculemez {
  if (olgular.length === 0) return olculemez("geç katılan olgusu yok");
  const gecen = olgular.filter((o) => o.gecti).length;
  return {
    olculebilir: true,
    olguSayisi: olgular.length,
    gecen,
    tabanYeterYurtDahilSayisi: olgular.filter((o) => o.tabanYeterYurtDahil).length,
    yapiKurulduSayisi: olgular.filter((o) => o.yapiKuruldu === true).length,
    yapiOlculenOlgu: olgular.filter((o) => o.yapiKuruldu !== null).length,
    hedefGecti: gecen === olgular.length,
  };
}

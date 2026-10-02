/**
 * Yürüyüş (L4) için gerçek yapılar (saf): sahiplikteki yapılar (`IlceSahipligi.yapilar`, sunucu karesinden) → `InsaatBilgisi` (hücre başına bir girdi).
 * Örnek yer tutucular (`ornekInsaatlar`) yalnız sunucusuz (sahte) kipte kalır; gerçek bağlantı `insaatlarAl` ile bu eşlemeyi verir.
 *
 * - Aşama: biten tesis 3 (Tamam); süren inşaat `yapiAsamasi` (başlangıç bilinmiyorsa tahmini bir saatlik süreye göre).
 * - Dükkân: biten dükkân (ek yapı kimliği tabeladan çözülür; tabela yoksa hücre türü `dukkan`) gövde yerine dükkân görünümüyle (tür ve marka rengi) çizilir; markasız dükkânda renk yazılmaz.
 * - Yöntem: biten tesisin üretim yöntemi imza silüetini belirler (yalnız sahibinin tesisinde bilinir; yoksa genel gövde).
 * - Aşınma (`asinmaPpm`) burada eklenmez: yürüyüş sahnesi `asinmaEsle` ile ekler.
 */
import { yapiAsamasi } from "./yapi";
import type { YapiKaydi } from "./baglanti";
import type { InsaatBilgisi } from "../yuru/arsa";

const SAAT = 3_600_000;

export interface YuruyusYapiGirdisi {
  yapilar: readonly YapiKaydi[];
  /** Şimdiki sim zamanı (ms). */
  simdi: number;
  /** Biten dükkânın tabelası (ek yapı kimliğine göre): tür ve marka rengi; dükkân değilse tanımsız. */
  dukkan: (tesisId: number) => { tur: string; markaRenk?: number } | undefined;
}

export function yapilardanInsaatlar(g: YuruyusYapiGirdisi): InsaatBilgisi[] {
  const l: InsaatBilgisi[] = [];
  for (const y of g.yapilar) {
    const asama = y.durum === "tesis" ? 3 : yapiAsamasi(y, g.simdi, SAAT);
    // Tabela (tür, marka) yalnız ilgi alanındaki işletme düğümlerinde gelir; ilçe karesinin hücre türü ("dukkan") herkesin dükkânını gösterir: tabelasız dükkân markasız çizilir (tür boş)
    const dukkan: InsaatBilgisi["dukkan"] = y.durum === "tesis" ? (g.dukkan(y.id) ?? (y.tur === "dukkan" ? { tur: "" } : undefined)) : undefined;
    for (const hucre of y.hucreler) {
      const b: InsaatBilgisi = { hucre, asama };
      if (asama === 3) {
        if (y.tur === "ordugah") b.ekYapi = "ordugah";
        if (dukkan) b.dukkan = dukkan;
        else if (y.yontem !== undefined) b.yontem = y.yontem;
      }
      l.push(b);
    }
  }
  return l;
}

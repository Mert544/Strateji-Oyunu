/**
 * Esnaf Defteri okuması (docs/arastirma/rehber-gorevler.md §3.1, sunucu tarafı P0): `defterIste` -> `defter`. Sunum katmanı sözleşmesi.
 *
 * - METİN YOKTUR: yalnız şablon anahtarı (`sablon` = `defter.kavram.<kavram>`); metin istemcide.
 * - TUTAR SUNUCUDA YAZILMAZ: ödül miktarları çekirdeğin sürümlü ödül tablosundan (`parametreler.json odul`) OKUNUR (para/mal ve
 *   `degerMili` = para + mal x taban fiyat; çekirdeğin `odulDegeri`'si). `toplamOdulMili` oyuncunun alınmış ödüllerinin toplam değeri,
 *   `tavanMili` çekirdeğin ödül tavanıdır (₺8.000 = 8 000 000 mili-para).
 * - `kazanilan`: alınmış ödüller (çekirdek `alinanOdul`; `t` profildeki damgadan, yoksa alan yok) ve para/mal taşımayan bilgi/kozmetik
 *   damgaları (`tur: "damga"`, profil deposu). `siradaki`: henüz alınmamış ödüllü kavramlar, kritik yol sırasıyla (rehber §4 sıra);
 *   `etkin: false` = çekirdekte henüz olayı olmayan yer tutucu (ilk_dukkan, ilk_sozlesme): istemci gizler.
 * - Zaman alanları SİM zamanıdır (ms).
 */
import { z } from "zod";

/**
 * Ödüllü kavramların kritik yol sırası (rehber §3.1: ilk_yapi → ilk_satis → ilk_isleme → ilk_ekmek → zincir → ilk_dukkan → ilk_pencere → ilk_sozlesme; sonra yön/yayılma).
 * YALNIZ EKLEME: eski kavramların göreli sırası değişmez (`ilk_ekmek` ve `ilk_pencere` araya girer); eski istemci bilmediği kavramı atlar (`kavram` serbest dizedir).
 */
export const DEFTER_ODUL_SIRASI = ["ilk_yapi", "ilk_satis", "ilk_isleme", "ilk_ekmek", "zincir_kapandi", "ilk_dukkan", "ilk_pencere", "ilk_sozlesme", "ikinci_ilce", "ilk_arastirma"] as const;
/**
 * Para ve mal taşımayan (yalnız profilde damga olarak tutulan) kavramlar. YALNIZ EKLEME, SONA: mevcut indeksler (istemci `DEFTER_DAMGALARI[0]` = `ilk_parsel`) kaymaz;
 * `ilk_raf` (dükkân rafında mal seçili) ve `ilk_cam` (ilk cam üretimi) isteğe bağlı yeni damgalardır, `kazanilan[].kavram` serbest dize olduğundan şema DEĞİŞMEZ.
 */
export const DEFTER_DAMGALARI = ["ilk_parsel", "ilk_uretim", "ilk_donus", "ilk_raf", "ilk_cam"] as const;

/** Çekirdekte olayı olmayan yer tutucu kavramlar: her zaman `etkin: false` (sunucu dedektörü de bunları tetiklemez). */
export const DEFTER_YER_TUTUCULARI = ["ilk_sozlesme"] as const;

/**
 * `kavramEtkin` girdisi (EN KÜÇÜK içerik görünümü): sunucu `DerlenmisIcerik`'ten, istemci içerik dizininden kurar; kural tek yerde, iki taraf AYNI işlevi çağırır.
 * - `yontemCiktilari`: içerikteki yöntemlerin çıktı mal kimlikleri (tekrar edebilir; en az bir kez gezilir).
 * - `perakende`: dükkân verisi (`mulk.perakende`) tanımlı mı.
 */
export interface DefterEtkinGirdisi {
  yontemCiktilari: Iterable<string>;
  perakende: boolean;
}

/**
 * Kavram ETKİN mi (Defter'de gösterilir mi): tetikleyici yöntem/dükkân içerikte yoksa değil. Protokolde alan yoktur; sunucu `siradaki.etkin`'i bununla yazar, istemci aynı işlevi dizininden çağırır.
 * `ilk_ekmek`/`ilk_pencere`/`ilk_cam` = o malı çıktı veren en az bir yöntem var; `ilk_dukkan`/`ilk_raf` = dükkân verisi var; yer tutucu (`ilk_sozlesme`) her zaman false; diğerleri true.
 */
export function kavramEtkin(girdi: DefterEtkinGirdisi, kavram: string): boolean {
  if ((DEFTER_YER_TUTUCULARI as readonly string[]).includes(kavram)) return false;
  const uretilen = (mal: string): boolean => {
    for (const m of girdi.yontemCiktilari) if (m === mal) return true;
    return false;
  };
  switch (kavram) {
    case "ilk_ekmek":
      return uretilen("ekmek");
    case "ilk_pencere":
      return uretilen("pencere");
    case "ilk_cam":
      return uretilen("cam");
    case "ilk_dukkan":
    case "ilk_raf":
      return girdi.perakende;
    default:
      return true;
  }
}

/** Şablon anahtarı: `defter.kavram.<kavram>`. */
export const defterSablonu = (kavram: string): string => `defter.kavram.${kavram}`;

export interface DefterOdulu {
  /** Para ödülü (mili-para); yoksa alan yok. */
  paraMili?: number;
  /** Mal ödülü: mal kimliği -> mili-birim; yoksa alan yok. */
  mal?: Record<string, number>;
  /** Toplam değer (mili-para): para + mal x taban fiyat. */
  degerMili: number;
}

export interface DefterKazanilan {
  kavram: string;
  sablon: string;
  /** "odul": çekirdek ödülü alındı; "damga": para/mal taşımayan bilgi/kozmetik damgası. */
  tur: "odul" | "damga";
  /** Kazanıldığı sim zamanı (profil damgasından); eski kayıtlarda yok. */
  t?: number;
  /** Alınan ödül (yalnız `tur: "odul"`). */
  odul?: DefterOdulu;
}

export interface DefterSiradaki {
  kavram: string;
  sablon: string;
  /** false: çekirdekte henüz olayı olmayan yer tutucu; istemci göstermez. */
  etkin: boolean;
  odul: DefterOdulu;
}

export interface Defter {
  kazanilan: DefterKazanilan[];
  siradaki: DefterSiradaki[];
  toplamOdulMili: number;
  tavanMili: number;
}

const tam = z.number().int();
export const DefterOduluSemasi = z.object({ paraMili: tam.optional(), mal: z.record(z.string(), tam).optional(), degerMili: tam });
export const DefterSemasi = z.object({
  kazanilan: z.array(z.object({ kavram: z.string(), sablon: z.string(), tur: z.enum(["odul", "damga"]), t: tam.optional(), odul: DefterOduluSemasi.optional() })),
  siradaki: z.array(z.object({ kavram: z.string(), sablon: z.string(), etkin: z.boolean(), odul: DefterOduluSemasi })),
  toplamOdulMili: tam,
  tavanMili: tam,
});

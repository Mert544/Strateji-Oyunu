/**
 * Dükkân kaynağı (G9 B bağlama; saf: DOM yok): bağdaştırıcı karesi + içerik dizini -> `DukkanKaynagi` (`dukkan-veri.ts`).
 * K2 köprüsü (`dukkan-kopru.ts`) kareyi görünüme çevirir; burada yalnız içerikten gelen girdiler (param, referans fiyat) ve K1 maliyet planlayıcısı (`kurmaKarsilaniyor`) kurulur.
 *
 * - Kare yoksa (sunucusuz sahte bağdaştırıcı) ya da oyuncu karesi gelmediyse kaynak null verir: dükkân yüzeyleri çıkmaz (Defter kartı yine çalışır).
 * - `dukkan` ek yapısı katalogda yoksa (dünyada G7 kapalı) `kapali: true`: panel hiç çıkmaz.
 * - Referans fiyat R: karedeki dünya fiyatı (`fiyat[malIndeksi]`); yoksa taban fiyat ve `yaklasik` (sayılar "yaklaşık" etiketlenir).
 */
import type { Icerik } from "../komut/tablo";
import type { DukkanKaresi } from "./baglanti";
import { dukkanGorunumuKur } from "./dukkan-kopru";
import type { KopruParam, KopruSonucu, ReferansFiyati } from "./dukkan-kopru";
import type { DukkanKaynagi } from "./dukkan-veri";
import { indirimliTutar } from "./yapi";
import type { YapiTanimi } from "./yapi";

export interface DukkanKaynakGirdisi {
  /** Son birikimli kare (yok: null). */
  kare: () => DukkanKaresi | null;
  ic: Icerik;
  /** Yapı kataloğu (`dukkan` ek yapısı bedeli ve malzemesi için). */
  katalog: readonly YapiTanimi[];
  /** Hazine (mili-₺; bilinmiyorsa null) ve depo stoğu (mili-birim) ile ilk-yapı indirimi. */
  hazineMili: () => number | null;
  stokMili: (mal: string) => number;
  indirim: () => { ppm: number; kalan: number } | undefined;
}

/** Parametre görünümü: dükkân kuralı (`param.mulk.perakende`) ve pazar (ihracat/ithalat çarpanı, komisyon). */
export function kopruParam(ic: Icerik): KopruParam {
  return { perakende: ic.param.mulk?.perakende ?? null, pazar: ic.param.pazar };
}

/** Referans fiyat: kare `fiyat` dizisi (mal indeksiyle); yoksa tabanFiyat ve yaklaşık. Bilinmeyen mal: undefined. */
export function referansFiyati(ic: Icerik, kare: Pick<DukkanKaresi, "fiyat"> | null): ReferansFiyati {
  return (mal) => {
    const i = ic.malIdx[mal];
    if (i === undefined) return undefined;
    const f = kare?.fiyat?.[i];
    if (f !== undefined && f > 0) return { mili: f, yaklasik: false };
    const taban = ic.mallar[i]?.taban;
    return taban === undefined ? undefined : { mili: taban, yaklasik: true };
  };
}

/**
 * Dükkân kurma bedeli karşılanıyor mu (D0 koşulu): yapı parası (ilk-yapı indirimi uygulanmış) hazineyi, malzeme (indirimli) depo stoğunu aşmıyor. Hazine bilinmiyorsa
 * para denetlenmez (maliyet kartı da aynı kuralı izler). Arsa bedeli dahil DEĞİL: kart yalnız kendi arsası olan oyuncuya çıkar.
 */
export function dukkanKurmaKarsilaniyor(dukkan: YapiTanimi | undefined, o: { hazineMili: number | null; stokMili: (mal: string) => number; indirim?: { ppm: number; kalan: number } | undefined }): boolean {
  if (dukkan === undefined) return false;
  const indirimli = o.indirim !== undefined && o.indirim.ppm > 0 && o.indirim.kalan > 0;
  const para = indirimli ? indirimliTutar(dukkan.paraMili, o.indirim!.ppm) : dukkan.paraMili;
  if (o.hazineMili !== null && para > o.hazineMili) return false;
  for (const m of dukkan.malzeme) {
    const q = indirimli ? indirimliTutar(m.miktar, o.indirim!.ppm) : m.miktar;
    if (o.stokMili(m.id) < q) return false;
  }
  return true;
}

export interface DukkanKaynagiSonucu extends DukkanKaynagi {
  /** Köprünün tam çıktısı (yaklaşık bayrağı, dükkân neti, talep); kare yoksa null. */
  sonuc(): KopruSonucu | null;
}

export function dukkanKaynagiKur(g: DukkanKaynakGirdisi): DukkanKaynagiSonucu {
  const sonuc = (): KopruSonucu | null => {
    const kare = g.kare();
    if (kare === null) return null;
    const dukkanYapisi = g.katalog.find((y) => y.id === "dukkan");
    const param = kopruParam(g.ic);
    // Dünyada dükkân yoksa (perakende bloğu ya da `dukkan` ek yapısı yok) köprü `kapali` verir
    return dukkanGorunumuKur({
      kare,
      param: dukkanYapisi === undefined ? { ...param, perakende: null } : param,
      referans: referansFiyati(g.ic, kare),
      kurmaKarsilaniyor: dukkanKurmaKarsilaniyor(dukkanYapisi, { hazineMili: g.hazineMili(), stokMili: g.stokMili, indirim: g.indirim() }),
    });
  };
  return { gorunum: () => sonuc()?.gorunum ?? null, sonuc };
}

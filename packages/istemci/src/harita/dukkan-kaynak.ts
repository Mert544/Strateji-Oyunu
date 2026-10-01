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
import { g8Acik, turUyumlari } from "./etkin";
import { dukkanGorunumuKur, ithNetPpm } from "./dukkan-kopru";
import type { KopruParam, KopruSonucu, ReferansFiyati } from "./dukkan-kopru";
import { DUKKAN_TURLERI } from "./dukkan-veri";
import type { DukkanGorunumu, DukkanKaynagi, DukkanTuru } from "./dukkan-veri";
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

// --- yapı kurma akışında dükkân bilgisi (D2 tür seçimi, D3 pencere satırı) ---------------------------------------------------------------------------------------------

export interface DukkanKurBilgisi {
  /** Dükkânın kapladığı hücre sayısı (katalog). */
  hucre: number;
  /** Kurulabilir türler (içerikten; yapı market G8'de varsa). */
  turler: DukkanTuru[];
  /** Bu ilçede / ilde kendi dükkân sayın (biten + süren) ve sınırlar (`ilceBasinaEnFazla`, `dukkan.enFazlaIlBasina`). */
  ilceSayi: number;
  ilceSinir: number;
  ilSayi: number;
  ilSinir: number;
  /** Tür başına depoda satabileceği mal var mı (D2 tür uyumu). */
  uyum: Partial<Record<DukkanTuru, boolean>>;
  /** G8 açık (D3 pencere metni). */
  g8Acik: boolean;
  /** Maliyet kartında pencere satırı: gereken (indirimli), depo stoğu, eksik pencerenin yaklaşık bedeli; malzemede pencere yoksa tanımsız. */
  pencere?: { gereken: number; var: number; tutarMili: number };
}

export interface DukkanKurBilgisiGirdisi {
  ic: Icerik;
  katalog: readonly YapiTanimi[];
  /** Şimdiki görünüm (köprü); yoksa null. */
  gorunum: DukkanGorunumu | null;
  /** Dükkânın bulunduğu ilçeler ve ilçenin ili. */
  ilce: string | null;
  ilceIl: (ilce: string) => string | null;
  stokMili: (mal: string) => number;
  indirim: { ppm: number; kalan: number } | undefined;
  referans: ReferansFiyati;
}

/** Yapı kurma kartı için dükkân bilgisi; dünyada dükkân yoksa tanımsız. Sayaçlar köprü görünümünden (karede hücre yoksa ilçesi bilinmeyen dükkân sayılmaz). */
export function dukkanKurBilgisi(g: DukkanKurBilgisiGirdisi): DukkanKurBilgisi | undefined {
  const yapi = g.katalog.find((y) => y.id === "dukkan");
  const pk = g.ic.param.mulk?.perakende;
  if (yapi === undefined || pk === undefined || g.gorunum === null || g.gorunum.kapali) return undefined;
  const turler = pk.dukkanTurleri.map((t) => t.id).filter((id): id is DukkanTuru => (DUKKAN_TURLERI as readonly string[]).includes(id));
  const il = g.ilce ? g.ilceIl(g.ilce) : null;
  let ilceSayi = 0;
  let ilSayi = 0;
  for (const d of g.gorunum.dukkanlar) {
    if (d.ilce === undefined) continue;
    if (d.ilce === g.ilce) ilceSayi++;
    if (il !== null && g.ilceIl(d.ilce) === il) ilSayi++;
  }
  const indirimli = g.indirim !== undefined && g.indirim.ppm > 0 && g.indirim.kalan > 0;
  const pen = yapi.malzeme.find((m) => m.id === "pencere");
  let pencere: DukkanKurBilgisi["pencere"];
  if (pen !== undefined) {
    const gereken = indirimli ? indirimliTutar(pen.miktar, g.indirim!.ppm) : pen.miktar;
    const var_ = g.stokMili("pencere");
    const eksik = Math.max(0, gereken - var_);
    const R = g.referans("pencere")?.mili ?? 0;
    // Eksik pencerenin yaklaşık bedeli: R x eksik x ithalat net çarpanı (maliyet: YUKARI yuvarlı birim)
    const tutar = eksik > 0 ? Math.ceil((eksik / 1000) * R * (ithNetPpm(g.ic.param.pazar) / 1_000_000)) : 0;
    pencere = { gereken: Math.ceil(gereken / 1000), var: Math.floor(var_ / 1000), tutarMili: tutar };
  }
  return {
    hucre: yapi.yuva,
    turler,
    ilceSayi,
    ilceSinir: pk.ilceBasinaEnFazla,
    ilSayi,
    ilSinir: yapi.enFazlaIlBasina ?? Number.MAX_SAFE_INTEGER,
    uyum: turUyumlari(g.ic, (m) => g.stokMili(m) > 0),
    g8Acik: g8Acik(g.ic),
    ...(pencere !== undefined ? { pencere } : {}),
  };
}

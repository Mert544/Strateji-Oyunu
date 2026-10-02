/**
 * Dükkân kaynağı (G9 B bağlama; saf: DOM yok): bağdaştırıcı karesi + içerik dizini -> `DukkanKaynagi` (`dukkan-veri.ts`).
 * K2 köprüsü (`dukkan-kopru.ts`) kareyi görünüme çevirir; burada yalnız içerikten gelen girdiler (param, referans fiyat) ve K1 maliyet planlayıcısı (`kurmaKarsilaniyor`) kurulur.
 *
 * - Kare yoksa (sunucusuz sahte bağdaştırıcı) ya da oyuncu karesi gelmediyse kaynak null verir: dükkân yüzeyleri çıkmaz (Defter kartı yine çalışır).
 * - `dukkan` ek yapısı katalogda yoksa (dünyada G7 kapalı) `kapali: true`: panel hiç çıkmaz.
 * - Referans fiyat R: karedeki dünya fiyatı (`fiyat[malIndeksi]`); yoksa taban fiyat ve `yaklasik` (sayılar "yaklaşık" etiketlenir).
 */
import { yuzde } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import type { DukkanKaresi } from "./baglanti";
import { dukkanTuruMallari, g8Acik, turUyumlari } from "./etkin";
import { dukkanGorunumuKur, ithNetPpm } from "./dukkan-kopru";
import type { KopruParam, KopruSonucu, ReferansFiyati } from "./dukkan-kopru";
import { DUKKAN_TURLERI } from "./dukkan-veri";
import type { MaliyetDurumu, MaliyetGirdisi } from "./dukkan-html";
import type { DukkanGorunumu, DukkanKaynagi, DukkanTuru } from "./dukkan-veri";
import { indirimliTutar } from "./yapi";
import type { YapiTanimi } from "./yapi";
import { yapiSuresi } from "./yapi-sure";

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
  /** Tür başına depoda satabileceği mal var mı (D2 tür uyumu); `"kismi"`: bazı mallar var, bazıları (yapı market: pencere ve cam) üretilmeli. */
  uyum: Partial<Record<DukkanTuru, boolean | "kismi">>;
  /** G8 açık (D3 pencere metni). */
  g8Acik: boolean;
  /** Aynı anda en çok inşaat (`param.mulk.esZamanliInsaat`; yoksa 2). */
  esZamanliInsaat: number;
  /** İlk yapı indirimi notu: KALAN indirimli yapı hakkı (`indirimliYapiKalan`) ve oran (ppm); parametre ya da hak yoksa tanımsız. */
  indirim?: { n: number; ppm: number };
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

/**
 * D2 tür uyumu: türün mallarından en az biri depoda mı (`turUyumlari`); yapı marketin grubunda (cam, pencere, çelik, parça) çelik ve parça gibi bazıları var ama pencere ve cam
 * yoksa "kısmi" (tam "var" demek yanıltır: pencere ve cam üretilmeden satış tamam olmaz). Diğer türlerde bir mal yeter.
 */
function turUyumlariKismi(ic: Icerik, turler: readonly DukkanTuru[], stokMili: (mal: string) => number): Partial<Record<DukkanTuru, boolean | "kismi">> {
  const temel = turUyumlari(ic, (m) => stokMili(m) > 0);
  const sonuc: Partial<Record<DukkanTuru, boolean | "kismi">> = {};
  for (const t of turler) {
    let u: boolean | "kismi" = temel[t] ?? false;
    if (u === true && t === "yapi_market") {
      const mallar = dukkanTuruMallari(ic, t);
      const ureticiler = mallar.filter((m) => m === "pencere" || m === "cam");
      if (ureticiler.length > 0 && !ureticiler.some((m) => stokMili(m) > 0)) u = "kismi";
    }
    sonuc[t] = u;
  }
  return sonuc;
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
    uyum: turUyumlariKismi(g.ic, turler, g.stokMili),
    g8Acik: g8Acik(g.ic),
    esZamanliInsaat: g.ic.param.mulk?.esZamanliInsaat ?? 2,
    ...(indirimli && g.indirim !== undefined ? { indirim: { n: g.indirim.kalan, ppm: g.indirim.ppm } } : {}),
    ...(pencere !== undefined ? { pencere } : {}),
  };
}

// --- maliyet kartı (D3): durum ve girdi ------------------------------------------------------------------------------------------------------------------------------

export interface DukkanKartPlani {
  gecerli: boolean;
  hazineYetmez: boolean;
  arsaMili: number;
  yapiMili: number;
  toplamMili: number;
  /** İlk yapı indirimi bu yapıya uygulanıyor mu. */
  indirimli: boolean;
  /** İndirimli malzeme (mili-birim); `ad` uyarı metni için. */
  malzeme: ReadonlyArray<{ id: string; ad?: string; miktar: number }>;
}

export interface DukkanKartGirdisi {
  tur: DukkanTuru | null;
  bilgi: DukkanKurBilgisi;
  plan: DukkanKartPlani;
  yapi: Pick<YapiTanimi, "sureSaat">;
  /** Erken oyun süre çarpanı (0, 1] şimdiki zamanda (`MulkBaglantisi.erkenOyunCarpani`); yoksa 1 (yeni oyuncu hızı yok). */
  sureCarpani?: number;
  hazineMili: number | null;
  surenInsaat: number;
  stokMili: (mal: string) => number;
  gonderiyor: boolean;
  hata?: string;
}

/** Maliyet kartı durumu (düğmenin açık/kapalı kararı): önce gönderim, sonra tür, sınırlar, inşaat sayısı, hazine, malzeme ve pencere stoğu. */
export function dukkanMaliyetDurumu(g: DukkanKartGirdisi): MaliyetDurumu {
  if (g.gonderiyor) return "gonderiliyor";
  if (g.tur === null) return "tur-secilmedi";
  if (g.bilgi.ilceSayi >= g.bilgi.ilceSinir || g.bilgi.ilSayi >= g.bilgi.ilSinir) return "sinir-dolu";
  if (g.surenInsaat >= g.bilgi.esZamanliInsaat) return "insaat-siniri";
  if (g.plan.hazineYetmez) return "hazine-yetmiyor";
  if (g.plan.malzeme.some((m) => m.id !== "pencere" && g.stokMili(m.id) < m.miktar)) return "stok-eksik";
  if (g.bilgi.pencere !== undefined && g.bilgi.pencere.var < g.bilgi.pencere.gereken) return "stok-eksik";
  return "uygun";
}

/** İlk eksik malzeme (çelik, makine parçası; pencere kendi satırındadır): ad `ad` ile, gereken ve depodaki birim. */
export function dukkanEksikMalzeme(plan: Pick<DukkanKartPlani, "malzeme">, stokMili: (mal: string) => number): { mal: string; ad: string; var: number; gereken: number } | null {
  const m = plan.malzeme.find((x) => x.id !== "pencere" && stokMili(x.id) < x.miktar);
  return m ? { mal: m.id, ad: m.ad ?? m.id, var: Math.floor(stokMili(m.id) / 1000), gereken: Math.ceil(m.miktar / 1000) } : null;
}

/** D-3 girdisi (`maliyetSatirlariHtml`); tür seçilmemişse null (kart standart yapı satırlarını gösterir). */
export function dukkanMaliyetGirdisi(g: DukkanKartGirdisi): MaliyetGirdisi | null {
  if (g.tur === null) return null;
  const eksik = g.plan.malzeme.length > 0 ? dukkanEksikMalzeme(g.plan, g.stokMili) : null;
  const hizli = yapiSuresi(g.yapi.sureSaat, g.sureCarpani ?? 1);
  const birim = (id: string): number => Math.ceil((g.plan.malzeme.find((m) => m.id === id)?.miktar ?? 0) / 1000);
  return {
    tur: g.tur,
    hucre: g.bilgi.hucre,
    durum: dukkanMaliyetDurumu(g),
    arsaMili: g.plan.arsaMili,
    dukkanMili: g.plan.yapiMili,
    celikAdet: birim("celik"),
    parcaAdet: birim("parca"),
    ...(g.bilgi.pencere !== undefined ? { pencere: g.bilgi.pencere } : {}),
    ...(eksik !== null ? { stokEksik: { ad: eksik.ad, var: eksik.var, gereken: eksik.gereken } } : {}),
    g8Acik: g.bilgi.g8Acik,
    sureSaat: g.yapi.sureSaat,
    ...(hizli.hizli ? { hizliSureSaat: hizli.simdi } : {}),
    toplamMili: g.plan.toplamMili,
    hazineMili: g.hazineMili ?? 0,
    ...(g.plan.indirimli && g.bilgi.indirim !== undefined ? { indirim: { n: g.bilgi.indirim.n, yuzde: yuzde(g.bilgi.indirim.ppm / 10_000) } } : {}),
    esZamanliInsaat: g.bilgi.esZamanliInsaat,
    ...(g.hata !== undefined ? { hata: g.hata } : {}),
  };
}

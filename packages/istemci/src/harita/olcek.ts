/**
 * Mülk kipinde ölçek büyütme planı (G2; saf: DOM, harita ve ağ yok). docs/06 §15.10 "Yerinde yükseltme".
 *
 * Kural (çekirdek `olcekEkHucrePlani` ve `tesis_olcek_yukselt` ile aynı):
 *   - hedef ayak izi `param.mulk.olcekHucre[tür][hedef]`; gereken ek hücre = hedef ayak izi - tesisin GERÇEK hücre sayısı;
 *   - ek hücreler tesisle birlikte kenar-bitişik TEK küme olmalı; her biri oyuncunun BOŞ hücresi ya da sahipsiz (uygun, kamu
 *     dışı) olmalı; sahipsizler tek `sinif`ta alınır (`parsel_al` kuralları: artımlı fiyat, 72 hücre / %25 sınırı);
 *   - arsa + yükseltme tek hazine denetiminden geçer; para ve malzeme bedeli = tür inşa bedeli × (hedef kademe - mevcut kademe)
 *     `insaPpm` farkı, her kalemde aşağı yuvarlanır; mülk kipinde `otomasyon` kilidi yoktur.
 *
 * İki katman: `ekHucrePlani` yalnız HÜCRE seçer (oyuncunun elle değiştirmesi yok; otomatik, kararlı), `olcekPlani` bedel ve
 * sınırlarla tam planı kurar (maliyet kartı ve onay). Aynı girdi her zaman aynı çıktıyı verir.
 */
import type { ArsaSinifi, HucreId, OyuncuId } from "@bolge/cekirdek";
import { fmt } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import type { IlceSahipligi, YapiKaydi } from "./baglanti";
import { arsaSinifi, ILCE_HUCRE_SINIRI, ILCE_PAY_SINIRI, parselFiyatiMili, SINIF_ADI, sinirDenetle } from "./fiyat";
import { durumAl, engelNedeni, hucreId, idCoz } from "./hucre";
import type { Izgara } from "./hucre";
import type { YapiMalzemesi } from "./yapi";

export const OLCEK_AD = ["S", "M", "L"] as const;
export type OlcekKodu = 0 | 1 | 2;
export type HedefOlcek = 1 | 2;

const PPM = 1_000_000;
const SAAT_MS = 3_600_000;
const SINIFLAR: readonly ArsaSinifi[] = ["kirsal", "kasaba", "sehir"];
const KOMSU: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Çekirdek `carpBol`: `floor(a * b / c)` (pozitif); güvenli aralık aşılırsa BigInt. */
export function carpBol(a: number, b: number, c: number): number {
  const p = a * b;
  if (Number.isSafeInteger(p)) return Math.floor(p / c);
  return Number((BigInt(a) * BigInt(b)) / BigInt(c));
}

// --- ölçek verisi ------------------------------------------------------------------------------------------------

/** Türün mülk kipi ölçek ayak izi `[S, M, L]`; ölçeklenemiyorsa (ek yapı, tablo yok, sanayi katmanı kapalı) null. */
export function olcekAyakIzi(ic: Icerik, tur: string): readonly [number, number, number] | null {
  const m = ic.param.mulk;
  if (!m || !ic.sanayi) return null;
  const a = m.olcekHucre[tur];
  return a ?? null;
}

/**
 * Tesisin ölçeği: karede varsa o (`olcek`), yoksa ayak izinden çıkarılır (`olcekHucre[tür][k] <= hücre sayısı` olan en büyük k;
 * P4a sonrası dünyalarda kesin).
 */
export function mevcutOlcek(izi: readonly [number, number, number], hucreSayisi: number, karede?: number): OlcekKodu {
  if (karede === 0 || karede === 1 || karede === 2) return karede;
  let o: OlcekKodu = 0;
  if (hucreSayisi >= izi[1]) o = 1;
  if (hucreSayisi >= izi[2]) o = 2;
  return o;
}

/** Büyütülebilir bir tesis (yapı kaydı + ölçek bilgisi). */
export interface OlcekTesisi {
  /** "t<id>". */
  anahtar: string;
  id: number;
  tur: string;
  ad: string;
  hucreler: HucreId[];
  olcek: OlcekKodu;
}

/**
 * Yapı kaydından büyütülebilir tesis: biten tesis, türü bilinen, ölçeklenebilir ve L olmayan. Değilse null.
 * `ad`: tür kimliğinden görünen ad.
 */
export function olcekTesisi(ic: Icerik, y: Pick<YapiKaydi, "anahtar" | "id" | "durum" | "tur" | "hucreler" | "olcek">, ad: (tur: string) => string): OlcekTesisi | null {
  if (y.durum !== "tesis" || !y.tur) return null;
  const izi = olcekAyakIzi(ic, y.tur);
  if (!izi) return null;
  const olcek = mevcutOlcek(izi, y.hucreler.length, y.olcek);
  if (olcek >= 2) return null;
  return { anahtar: y.anahtar, id: y.id, tur: y.tur, ad: ad(y.tur), hucreler: [...y.hucreler], olcek };
}

/** Bir hedef ölçeğin gereği: ek hücre sayısı, bedel (çekirdekle birebir), süre. */
export interface OlcekHedefi {
  olcek: HedefOlcek;
  ad: "M" | "L";
  /** Hedef ayak izi (hücre). */
  hucre: number;
  /** Gereken EK hücre (hedef ayak izi - gerçek hücre sayısı; en az 0). */
  ek: number;
  /** mili-₺ (aşağı yuvarlanmış). */
  paraMili: number;
  /** Malzeme bedeli (mili-birim; aşağı yuvarlanmış, sıfır olanlar atılmış). */
  malzeme: YapiMalzemesi[];
  /** Yükseltme süresi (saat; erken oyun çarpanı öncesi). */
  sureSaat: number;
  /** Yeni oyuncunun ilk saatlerindeki hızlandırılmış süre tahmini (saat). */
  ilkGunSureSaat: number;
}

/** Çekirdeğin mülk kipi yükseltme bedeli: `oran = hedef.insaPpm - mevcut.insaPpm`; para ve her malzeme `floor(x × oran / 1e6)`. */
export function olcekHedefi(ic: Icerik, tesis: Pick<OlcekTesisi, "tur" | "olcek" | "hucreler">, hedef: HedefOlcek): OlcekHedefi | null {
  const izi = olcekAyakIzi(ic, tesis.tur);
  const sn = ic.param.sanayi;
  const T = ic.turler[ic.turIdx[tesis.tur] ?? -1];
  const hedefK = sn?.olcekKademeleri[hedef];
  const simdiK = sn?.olcekKademeleri[tesis.olcek];
  if (!izi || !sn || !T || !hedefK || !simdiK || hedef <= tesis.olcek) return null;
  const oran = hedefK.insaPpm - simdiK.insaPpm;
  const malzeme: YapiMalzemesi[] = [];
  for (const [mi, q] of T.maliyet) {
    const x = carpBol(q, oran, PPM);
    if (x > 0) malzeme.push({ id: ic.mallar[mi]?.id ?? String(mi), ad: ic.mallar[mi]?.ad ?? String(mi), miktar: x });
  }
  const sureMs = carpBol(T.sureSaat * SAAT_MS, sn.olcekYukseltmeSureCarpaniPpm, PPM);
  const sureSaat = sureMs / SAAT_MS;
  const carpan = (ic.param.erkenOyun?.baslangicCarpaniPpm ?? PPM) / PPM;
  return {
    olcek: hedef,
    ad: hedef === 1 ? "M" : "L",
    hucre: izi[hedef],
    ek: Math.max(0, izi[hedef] - tesis.hucreler.length),
    paraMili: carpBol(T.para, oran, PPM),
    malzeme,
    sureSaat,
    ilkGunSureSaat: Math.max(1 / 60, sureSaat * carpan),
  };
}

/** Tesisin büyütülebileceği hedef ölçekler (S → M, L; M → L), küçükten büyüğe. */
export function olcekHedefleri(ic: Icerik, tesis: Pick<OlcekTesisi, "tur" | "olcek" | "hucreler">): OlcekHedefi[] {
  const l: OlcekHedefi[] = [];
  for (const k of [1, 2] as const) {
    const h = olcekHedefi(ic, tesis, k);
    if (h) l.push(h);
  }
  return l;
}

// --- hücre seçimi ------------------------------------------------------------------------------------------------

export interface EkHucreGirdisi {
  tesis: Pick<OlcekTesisi, "hucreler">;
  /** Gereken ek hücre sayısı (`OlcekHedefi.ek`). */
  gereken: number;
  izgara: Izgara;
  sahiplik: IlceSahipligi;
  ben: OyuncuId;
  /** Sahip kimliğinden görünen ad. */
  ad: (sahip: OyuncuId) => string;
  /** Hücre kamu arsasındaysa Türkçe ret nedeni, değilse null. */
  kamu?: (id: HucreId) => string | null;
}

export type EkHucrePlani = { ekHucreler: HucreId[]; sinif?: ArsaSinifi; arsaMili: number } | { neden: string };

interface Kontrol {
  /** Hücre ek hücre olamıyorsa nedeni. */
  neden: string | null;
  /** Oyuncunun BOŞ hücresi (tesis ve inşaat yok). */
  benim: boolean;
  /** Sahipsiz ve uygun: satın alınabilir; sınıfı. */
  sinif: ArsaSinifi | null;
}

function yapiliKume(s: IlceSahipligi): Set<HucreId> {
  const k = new Set<HucreId>();
  for (const y of s.yapilar ?? []) for (const id of y.hucreler) k.add(id);
  return k;
}

function kontrolEt(b: EkHucreGirdisi, yapili: ReadonlySet<HucreId>, x: number, y: number): Kontrol {
  const id = hucreId(x, y);
  const d = durumAl(b.izgara, x, y);
  let neden = engelNedeni(d);
  if (!neden) neden = b.kamu?.(id) ?? null;
  const sh = b.sahiplik.hucreler.get(id);
  if (!neden && sh) {
    if (sh.sahip !== b.ben) neden = `Sahibi: ${b.ad(sh.sahip)}`;
    else if (sh.tesis !== undefined || sh.insaat !== undefined || yapili.has(id)) neden = "Bu hücrede zaten yapı var";
    else return { neden: null, benim: true, sinif: null };
  }
  if (neden) return { neden, benim: false, sinif: null };
  return { neden: null, benim: false, sinif: arsaSinifi(d) };
}

function komsuSayisi(x: number, y: number, kume: ReadonlySet<HucreId>): number {
  let n = 0;
  for (const [dx, dy] of KOMSU) if (kume.has(hucreId(x + dx, y + dy))) n++;
  return n;
}

/**
 * Açgözlü, kararlı seçim: her adımda tesis + seçilenlerin kenar komşuları arasından en iyi aday; sıra:
 * (1) oyuncunun BOŞ hücresi, sonra sahipsiz (`sinifSecimi`: yalnız o sınıf; "hepsi": her sınıf);
 * (2) kümeye daha çok değen (derli toplu şekil); (3) hücre kimliği (metin sırası). `gereken` kadar bulunamazsa null.
 */
function sec(b: EkHucreGirdisi, yapili: ReadonlySet<HucreId>, sinifSecimi: ArsaSinifi | "hepsi" | null): HucreId[] | null {
  const kume = new Set<HucreId>(b.tesis.hucreler);
  const secili: HucreId[] = [];
  const onbellek = new Map<HucreId, Kontrol>();
  const kontrol = (x: number, y: number): Kontrol => {
    const id = hucreId(x, y);
    let k = onbellek.get(id);
    if (!k) onbellek.set(id, (k = kontrolEt(b, yapili, x, y)));
    return k;
  };
  while (secili.length < b.gereken) {
    let en: { id: HucreId; oncelik: number; komsu: number } | null = null;
    for (const id of kume) {
      const c = idCoz(id);
      if (!c) continue;
      for (const [dx, dy] of KOMSU) {
        const x = c.x + dx;
        const y = c.y + dy;
        const nid = hucreId(x, y);
        if (kume.has(nid)) continue;
        const k = kontrol(x, y);
        if (k.neden !== null) continue;
        let oncelik: number;
        if (k.benim) oncelik = 0;
        else if (sinifSecimi !== null && k.sinif !== null && (sinifSecimi === "hepsi" || k.sinif === sinifSecimi)) oncelik = 1;
        else continue;
        const komsu = komsuSayisi(x, y, kume);
        if (!en || oncelik < en.oncelik || (oncelik === en.oncelik && (komsu > en.komsu || (komsu === en.komsu && nid < en.id)))) en = { id: nid, oncelik, komsu };
      }
    }
    if (!en) return null;
    secili.push(en.id);
    kume.add(en.id);
  }
  return secili;
}

/** Tesisin çevresindeki kullanılamayan hücrelerin (en çok 3) farklı nedenleri: reddin okunur gerekçesi. */
function cevreNedenleri(b: EkHucreGirdisi, yapili: ReadonlySet<HucreId>): string[] {
  const nedenler: string[] = [];
  const gorulen = new Set<HucreId>(b.tesis.hucreler);
  for (const id of [...b.tesis.hucreler].sort()) {
    const c = idCoz(id);
    if (!c) continue;
    for (const [dx, dy] of KOMSU) {
      const x = c.x + dx;
      const y = c.y + dy;
      const nid = hucreId(x, y);
      if (gorulen.has(nid)) continue;
      gorulen.add(nid);
      const k = kontrolEt(b, yapili, x, y);
      if (k.neden && !nedenler.includes(k.neden) && nedenler.length < 3) nedenler.push(k.neden);
    }
  }
  return nedenler;
}

/**
 * Ek hücre planı (saf). Önce oyuncunun BOŞ hücreleri, sonra sahipsiz; sahipsizler tek sınıfta (en ucuz sınıf seçilir;
 * eşitlikte kırsal, kasaba, şehir sırası). Dönüş: `{ekHucreler (metin sırasıyla sıralı), sinif?, arsaMili}` ya da `{neden}`.
 * Sınıf yalnız satın alınacak hücre varsa döner; arsa fiyatı `fiyat.ts` (çekirdekle birebir, artımlı).
 */
export function ekHucrePlani(b: EkHucreGirdisi): EkHucrePlani {
  if (b.gereken <= 0) return { ekHucreler: [], arsaMili: 0 };
  const yapili = yapiliKume(b.sahiplik);
  let en: { liste: HucreId[]; sinif: ArsaSinifi | null; arsa: number } | null = null;
  for (const s of [null, ...SINIFLAR] as const) {
    const liste = sec(b, yapili, s);
    if (!liste) continue;
    const alinacak = liste.filter((id) => !b.sahiplik.hucreler.has(id));
    const arsa = alinacak.length ? parselFiyatiMili(s as ArsaSinifi, b.sahiplik.satilmis, b.sahiplik.uygun, alinacak.length) : 0;
    if (!en || arsa < en.arsa) en = { liste, sinif: alinacak.length ? s : null, arsa };
  }
  if (en) return { ekHucreler: [...en.liste].sort(), ...(en.sinif ? { sinif: en.sinif } : {}), arsaMili: en.arsa };
  if (sec(b, yapili, "hepsi")) return { neden: "Yapının yanındaki boş arsalar farklı sınıflardan; ek hücreler tek arsa sınıfından olmalı (Kırsal, Kasaba ya da Şehir)." };
  const n = cevreNedenleri(b, yapili);
  return { neden: `Yapının yanında büyütmek için ${fmt(b.gereken)} bitişik uygun hücre bulunamadı${n.length ? ` (çevrede: ${n.join("; ")})` : ""}.` };
}

// --- tam plan ----------------------------------------------------------------------------------------------------

export interface OlcekGirdisi extends Omit<EkHucreGirdisi, "gereken" | "tesis"> {
  ic: Icerik;
  tesis: OlcekTesisi;
  hedef: HedefOlcek;
  /** Hazine (mili-₺); bilinmiyorsa null (kontrol atlanır). */
  hazineMili: number | null;
  /** Süren hücreli inşaatlarım (yükseltmeler dahil). */
  surenInsaat: number;
  esZamanliInsaat?: number;
  /** Depodaki mal (mili-birim; bilinmiyorsa null: kontrol atlanır). */
  stok?: (mal: string) => number | null;
}

export interface OlcekPlani {
  tesis: OlcekTesisi;
  hedef: OlcekHedefi;
  /** Eklenecek hücreler (sıralı; ek hücre gerekmiyorsa boş). */
  ekHucreler: HucreId[];
  /** Ek hücrelerden satın alınacak (sahipsiz) olanlar. */
  alinacak: HucreId[];
  /** Sahipsizlerin tek arsa sınıfı (alınacak varsa). */
  sinif?: ArsaSinifi;
  arsaMili: number;
  /** Yükseltme parası (mili-₺); malzeme `hedef.malzeme`'de. */
  yapiMili: number;
  /** Arsa + yükseltme parası (mili-₺). */
  toplamMili: number;
  gecerli: boolean;
  /** Geçersizse okunur neden. */
  neden: string | null;
}

/** Ölçek büyütme planı: hücre seçimi, bedel ve çekirdeğin sınırları (hazine, stok, 72 / %25, eşzamanlı inşaat). */
export function olcekPlani(g: OlcekGirdisi): OlcekPlani {
  const hedef = olcekHedefi(g.ic, g.tesis, g.hedef);
  if (!hedef) {
    const zaten = g.hedef <= g.tesis.olcek;
    return { tesis: g.tesis, ekHucreler: [], alinacak: [], arsaMili: 0, yapiMili: 0, toplamMili: 0, gecerli: false, hedef: { olcek: g.hedef, ad: g.hedef === 1 ? "M" : "L", hucre: 0, ek: 0, paraMili: 0, malzeme: [], sureSaat: 0, ilkGunSureSaat: 0 }, neden: zaten ? "Tesis zaten bu ölçekte ya da daha büyük." : "Bu yapı büyütülemez." };
  }
  const hucre = ekHucrePlani({ ...g, gereken: hedef.ek });
  const yapiMili = hedef.paraMili;
  if ("neden" in hucre) return { tesis: g.tesis, hedef, ekHucreler: [], alinacak: [], arsaMili: 0, yapiMili, toplamMili: yapiMili, gecerli: false, neden: hucre.neden };
  const alinacak = hucre.ekHucreler.filter((id) => !g.sahiplik.hucreler.has(id));
  const toplamMili = hucre.arsaMili + yapiMili;
  const taban = { tesis: g.tesis, hedef, ekHucreler: hucre.ekHucreler, alinacak, ...(hucre.sinif ? { sinif: hucre.sinif } : {}), arsaMili: hucre.arsaMili, yapiMili, toplamMili };
  let neden: string | null = null;
  if (alinacak.length > 0) {
    let benimSayi = 0;
    for (const h of g.sahiplik.hucreler.values()) if (h.sahip === g.ben) benimSayi++;
    const sd = sinirDenetle({ uygun: g.sahiplik.uygun, satilmis: g.sahiplik.satilmis, benim: benimSayi }, alinacak.length);
    if (sd.hucreAsimi) neden = `İlçede en çok ${ILCE_HUCRE_SINIRI} hücren olabilir`;
    else if (sd.payAsimi) neden = `İlçenin en çok %${Math.round(ILCE_PAY_SINIRI * 100)}'i senin olabilir (${fmt(sd.tavan)} hücre)`;
  }
  const esz = g.esZamanliInsaat ?? 2;
  if (!neden && g.surenInsaat >= esz) neden = `Aynı anda en çok ${esz} inşaat sürebilir`;
  if (!neden && g.hazineMili !== null && toplamMili > g.hazineMili) neden = `Hazinede yeterli para yok (gereken ${fmt(Math.ceil(toplamMili / 1000))} ₺)`;
  if (!neden && g.stok) {
    for (const m of hedef.malzeme) {
      const var_ = g.stok(m.id);
      if (var_ !== null && var_ < m.miktar) {
        neden = `Depoda yeterli ${m.ad.toLocaleLowerCase("tr-TR")} yok`;
        break;
      }
    }
  }
  return { ...taban, gecerli: neden === null, neden };
}

/** Sınıf adı (kart metni için). */
export const sinifAdi = (s: ArsaSinifi): string => SINIF_ADI[s];

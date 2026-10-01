/**
 * OSM ilişkilerinden il/ilçe ağacı: il seçimi (ISO3166-2), il -> oyun bölgesi eşlemesi (Natural Earth admin-1
 * üzerinden, karadeniz.json'daki admin-1 listeleri), ilçe -> il ebeveyni (iç nokta içerme), kimlikler, alan, merkez.
 * Geometri çözümlemesi tam çözünürlüklüdür; sadeleştirme topoloji.ts'tedir.
 */
import { readFileSync } from "node:fs";
import { admin1Esle } from "../birlestir";
import { cokgenleriAl, cokgenlerinKutusu, type Cokgen, type Kutu, type Nokta } from "../cografya";
import { KAYNAKLAR } from "../kaynaklar";
import { onbellekYolu } from "../indir";
import { admin1Oku } from "../ulke-verisi";
import type { Yapilandirma } from "../yapilandirma";
import { cokgenAlaniKm2, cokgenlerdeMi, icNokta, iliskiGeometrisi, type OsmIliski, type OsmVeri } from "./halka";
import { asciiKimlik, latinAd, mikro, sirala } from "./ortak";
import type { OsmUlke, OsmYapilandirma } from "./yapilandirma";

export interface Merkez {
  enlemMikro: number;
  boylamMikro: number;
}

export interface IdariBirim {
  kimlik: string;
  ad: string;
  /** OSM `name` (ad'dan farklıysa). */
  yerelAd?: string;
  /** Latin olmayan yazılı adların harf çevirisi (aksan duyarsız arama için). */
  latinAd?: string;
  ebeveyn: string;
  osm: number;
  merkez: Merkez;
  alanKm2: number;
  cokgenler: Cokgen[];
}
export interface Il extends IdariBirim {
  ulke: string;
  iso: string;
  /** Eşlenen Natural Earth admin-1 kodu (ör. "TUR-2265"). */
  ne: string;
  ilceler: IdariBirim[];
  /** admin_centre/label düğümleri (iç kullanım; çıktıya yazılmaz). */
  merkezAdaylari: Nokta[];
  /** OSM il ilişkisinin kendi alanı (karasuları dahil olabilir; iç kullanım). */
  osmIliskiKm2: number;
}

export interface EslemeRaporu {
  ulke: string;
  ilSayisi: number;
  ilceSayisi: number;
  /** Oyun bölgelerine düşmeyen iller (ör. Romanya'nın Transilvanya illeri). */
  oyunDisiIller: Array<{ iso: string; ad: string; osm: number }>;
  /** ISO eşlemesiyle uzamsal kontrolün (il iç noktası NE çokgeninde mi) uyuşmadığı iller. */
  uzamsalUyusmazliklar: Array<{ il: string; ne: string; noktaninNesi: string | null }>;
  /** Yapılandırmadaki elle düzeltmeyle bölgesi atanan iller. */
  elleDuzeltilen: string[];
  /** admin_level uyan ama sınır ilişkisi olmayan (type!=boundary) ilişkiler. */
  haricTutulanlar: string[];
  /** Hiçbir ile oturmayan (sınır komşusu ülkelere ait) ilçe adayları. */
  yabanciIlceAdaylari: string[];
  /** Oyun dışı illere düşen ilçe sayısı. */
  oyunDisiIlce: number;
  /** Geometri sorunları (ilişki -> açıklama). */
  geometriSorunlari: Array<{ osm: number; ad: string; sorun: string }>;
  /** Kimlik çakışması nedeniyle OSM kimliği eklenen ilçeler. */
  kimlikCakismalari: string[];
  /** OSM il ilişkisinin alanı ile karadaki (ilçelerin birleşimi) alan farkı > %2 olan iller (karasuları). */
  denizUzantili: Array<{ il: string; osmIliskiKm2: number; karaKm2: number }>;
}

export interface NeBirim {
  kod: string;
  iso: string;
  /** NE `name_tr` (kamu malı; OSM'de name:tr olmayan iller için Türkçe ad yedeği). */
  adTr: string;
  cokgenler: Cokgen[];
}

function neBirimleriOku(): NeBirim[] {
  const k = KAYNAKLAR.find((x) => x.kimlik === "ne_admin1");
  if (k === undefined) throw new Error("ne_admin1 kaynagi yok");
  const ham = JSON.parse(readFileSync(onbellekYolu(k), "utf8")) as {
    features: Array<{ properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } | null }>;
  };
  return ham.features
    .filter((f) => f.geometry !== null)
    .map((f) => ({
      kod: String(f.properties["adm1_code"]),
      iso: String(f.properties["iso_3166_2"]),
      adTr: turkceAdSadelestir(String(f.properties["name_tr"] ?? "")),
      cokgenler: cokgenleriAl(f.geometry!),
    }));
}

const yuvarla1 = (x: number): number => Math.round(x * 10) / 10;

/** Merkez adayları: admin_centre ve label düğümleri (bu sırayla). */
function merkezAdaylari(r: OsmIliski, veri: OsmVeri): Nokta[] {
  const sonuc: Nokta[] = [];
  for (const rol of ["admin_centre", "label"]) {
    const u = r.members.find((m) => m.type === "node" && m.role === rol);
    const n = u === undefined ? undefined : veri.dugumler.get(u.ref);
    if (n !== undefined) sonuc.push(n);
  }
  return sonuc;
}

/** Merkez: çokgen içindeki ilk aday (admin_centre > label), yoksa geometrik iç nokta. */
export function merkezSec(adaylar: readonly Nokta[], cokgenler: Cokgen[]): Merkez {
  for (const n of adaylar) if (cokgenlerdeMi(n[0], n[1], cokgenler)) return { enlemMikro: mikro(n[1]), boylamMikro: mikro(n[0]) };
  const [b, e] = icNokta(cokgenler);
  return { enlemMikro: mikro(e), boylamMikro: mikro(b) };
}

const LATIN_DISI = /[Ͱ-ϿЀ-ӿ]/;

/** Türkçe ad eklerini atar: "Veliko Tırnovo (il)" -> "Veliko Tırnovo", "Burgaz ili" -> "Burgaz", "X Belediyesi" -> "X". */
function turkceAdSadelestir(ad: string): string {
  return ad
    .trim()
    .replace(/\s*\((il|ili|İl)\)$/u, "")
    .replace(/\s+(Belediyesi|ili|İli)$/u, "")
    .trim();
}

/**
 * Ad alanları: Türkçe ad (OSM name:tr; il için yoksa Natural Earth name_tr) varsa o; yoksa Latin yazılı yerel ad;
 * Yunanca/Kiril yerel adlar için harf çevirisi ("Δήμος Αθηναίων" -> "Athinaion"). Yerel ad `yerelAd`da korunur.
 */
function adlar(tags: Record<string, string>, onEk: RegExp, trYedek = ""): Pick<IdariBirim, "ad" | "yerelAd" | "latinAd"> {
  const yerel = (tags["name"] ?? "").trim();
  const osmTr = turkceAdSadelestir(tags["name:tr"] ?? "");
  const tr = osmTr !== "" ? osmTr : trYedek;
  const latin = LATIN_DISI.test(yerel) ? latinAd(yerel.replace(onEk, "")) : undefined;
  const ad = tr !== "" ? tr : (latin ?? yerel);
  const sonuc: Pick<IdariBirim, "ad" | "yerelAd" | "latinAd"> = { ad };
  if (yerel !== "" && yerel !== ad) sonuc.yerelAd = yerel;
  if (latin !== undefined && latin !== ad) sonuc.latinAd = latin;
  return sonuc;
}

/** Kimlik için kısa yerel ad: "Δήμος Αθηναίων" -> "Αθηναίων", "Община Варна" -> "Варна". */
const ONEK = /^(Δήμος|Περιφέρεια|Община|Област|Municipiul|Orașul|Oraș|Comuna)\s+/u;

interface Aday {
  r: OsmIliski;
  cokgenler: Cokgen[];
  alanKm2: number;
  kutu: Kutu;
  nokta: Nokta;
}

function adayKur(r: OsmIliski, veri: OsmVeri, rapor: EslemeRaporu): Aday | null {
  const g = iliskiGeometrisi(r, veri);
  for (const s of g.sorunlar) rapor.geometriSorunlari.push({ osm: r.id, ad: r.tags["name"] ?? "", sorun: s });
  if (g.cokgenler.length === 0) return null;
  return { r, cokgenler: g.cokgenler, alanKm2: g.alanKm2, kutu: cokgenlerinKutusu(g.cokgenler), nokta: icNokta(g.cokgenler) };
}

const kutudaMi = (k: Kutu, b: number, e: number): boolean => b >= k.minB && b <= k.maxB && e >= k.minE && e <= k.maxE;

export interface UlkeSonucu {
  iller: Il[];
  rapor: EslemeRaporu;
}

/** Bir ülkenin il/ilçe ağacını kurar. `neBolge`: NE admin-1 kodu -> oyun bölgesi. */
export function ulkeHiyerarsisi(
  u: OsmUlke,
  veri: OsmVeri,
  osmYap: OsmYapilandirma,
  neBolge: ReadonlyMap<string, string>,
  neBirimleri: readonly NeBirim[],
): UlkeSonucu {
  const rapor: EslemeRaporu = {
    ulke: u.kod,
    ilSayisi: 0,
    ilceSayisi: 0,
    oyunDisiIller: [],
    uzamsalUyusmazliklar: [],
    elleDuzeltilen: [],
    haricTutulanlar: [],
    yabanciIlceAdaylari: [],
    oyunDisiIlce: 0,
    geometriSorunlari: [],
    kimlikCakismalari: [],
    denizUzantili: [],
  };
  const ekIller = new Set(u.ekIller.map((e) => e.osmIliski));
  const iliskiler = [...veri.iliskiler.values()].sort((a, b) => a.id - b.id);
  const ilAdaylari = iliskiler.filter(
    (r) => ekIller.has(r.id) || (r.tags["admin_level"] === String(u.ilSeviyesi) && (r.tags["ISO3166-2"] ?? "").startsWith(u.isoOnEki)),
  );
  const neIso = new Map(neBirimleri.filter((n) => n.kod.startsWith(`${u.neUlke}-`)).map((n) => [n.iso, n]));

  const iller: Il[] = [];
  const oyunDisi: Aday[] = [];
  for (const r of ilAdaylari) {
    const iso = r.tags["ISO3166-2"] ?? "";
    if (!iso.startsWith(u.isoOnEki)) throw new Error(`il ${r.id} (${r.tags["name"]}): ISO3166-2 yok/yanlis "${iso}"`);
    const a = adayKur(r, veri, rapor);
    if (a === null) throw new Error(`il ${r.id} (${r.tags["name"]}): geometri kurulamadi`);
    const kimlik = `${u.kod}_${asciiKimlik(iso.slice(u.isoOnEki.length))}`;
    const ne = neIso.get(osmYap.isoNeEslemesi[iso] ?? iso);
    const elle = osmYap.ilBolgeDuzeltmeleri[kimlik];
    let bolge = elle ?? (ne === undefined ? undefined : neBolge.get(ne.kod));
    if (elle !== undefined) rapor.elleDuzeltilen.push(kimlik);
    if (bolge === undefined && ne === undefined) {
      // ISO kodu NE'de yok: ham il geometrisinin iç noktasıyla NE birimi bulunur (rapor edilir)
      const noktaNe = neBirimleri.find((n) => n.kod.startsWith(`${u.neUlke}-`) && cokgenlerdeMi(a.nokta[0], a.nokta[1], n.cokgenler));
      rapor.uzamsalUyusmazliklar.push({ il: kimlik, ne: "(ISO eslesmedi)", noktaninNesi: noktaNe?.kod ?? null });
      if (noktaNe !== undefined) bolge = neBolge.get(noktaNe.kod);
    }
    if (bolge === undefined) {
      rapor.oyunDisiIller.push({ iso, ad: r.tags["name"] ?? "", osm: r.id });
      oyunDisi.push(a);
      continue;
    }
    iller.push({
      kimlik,
      ...adlar(r.tags, ONEK, ne?.adTr ?? ""),
      ebeveyn: bolge,
      osm: r.id,
      merkez: merkezSec(merkezAdaylari(r, veri), a.cokgenler),
      alanKm2: yuvarla1(a.alanKm2),
      cokgenler: a.cokgenler,
      merkezAdaylari: merkezAdaylari(r, veri),
      osmIliskiKm2: a.alanKm2,
      ulke: u.kod,
      iso,
      ne: ne?.kod ?? "",
      ilceler: [],
    });
  }
  const ilKutulari = iller.map((il) => cokgenlerinKutusu(il.cokgenler));

  // İlçeler: iç noktası hangi ildeyse onun çocuğu (komşu ülkelerin birimleri hiçbir ile düşmez -> elenir).
  const ilceSeviyesi = String(u.ilceSeviyesi);
  for (const r of iliskiler) {
    if (r.tags["admin_level"] !== ilceSeviyesi || ekIller.has(r.id)) continue;
    // Yalnızca type=boundary: admin_level taşıyan ada çokgenleri (ör. Bodrum "Kara Ada", type=multipolygon) ilçe değildir
    if (r.tags["type"] !== "boundary") {
      rapor.haricTutulanlar.push(`${r.id} ${r.tags["name"] ?? ""} (type=${r.tags["type"] ?? "-"})`);
      continue;
    }
    const a = adayKur(r, veri, rapor);
    if (a === null) continue;
    const [b, e] = a.nokta;
    const k = iller.findIndex((il, n) => kutudaMi(ilKutulari[n] as Kutu, b, e) && cokgenlerdeMi(b, e, il.cokgenler));
    if (k < 0) {
      if (oyunDisi.some((o) => kutudaMi(o.kutu, b, e) && cokgenlerdeMi(b, e, o.cokgenler))) rapor.oyunDisiIlce++;
      else rapor.yabanciIlceAdaylari.push(`${r.id} ${r.tags["name"] ?? ""}`);
      continue;
    }
    const il = iller[k] as Il;
    il.ilceler.push({
      kimlik: `${il.kimlik}_${asciiKimlik((r.tags["name"] ?? String(r.id)).replace(ONEK, ""))}`,
      ...adlar(r.tags, ONEK),
      ebeveyn: il.kimlik,
      osm: r.id,
      merkez: merkezSec(merkezAdaylari(r, veri), a.cokgenler),
      alanKm2: yuvarla1(a.alanKm2),
      cokgenler: a.cokgenler,
    });
  }
  // İlçesi olmayan il (ör. Aynoroz): il kendisi tek ilçe
  for (const il of iller) {
    if (il.ilceler.length > 0) continue;
    il.ilceler.push({
      kimlik: `${il.kimlik}_${asciiKimlik(il.ad)}`,
      ad: il.ad,
      ...(il.yerelAd === undefined ? {} : { yerelAd: il.yerelAd }),
      ...(il.latinAd === undefined ? {} : { latinAd: il.latinAd }),
      ebeveyn: il.kimlik,
      osm: il.osm,
      merkez: il.merkez,
      alanKm2: il.alanKm2,
      cokgenler: il.cokgenler,
    });
  }
  // Kimlik çakışmaları: çakışan tüm ilçelere OSM kimliği eklenir (deterministik).
  for (const il of iller) {
    const sayac = new Map<string, number>();
    for (const c of il.ilceler) sayac.set(c.kimlik, (sayac.get(c.kimlik) ?? 0) + 1);
    for (const c of il.ilceler) {
      if ((sayac.get(c.kimlik) ?? 0) > 1) {
        c.kimlik = `${c.kimlik}_${c.osm}`;
        rapor.kimlikCakismalari.push(c.kimlik);
      }
    }
    il.ilceler.sort((p, q) => sirala(p.kimlik, q.kimlik));
  }
  iller.sort((p, q) => sirala(p.kimlik, q.kimlik));
  rapor.ilSayisi = iller.length;
  rapor.ilceSayisi = iller.reduce((s, il) => s + il.ilceler.length, 0);
  rapor.kimlikCakismalari.sort(sirala);
  return { iller, rapor };
}

/**
 * İl geometrisini karadaki biçimine çevirir: OSM il ilişkileri kıyıda karasularını da kapsar (ör. İstanbul ilişkisi
 * ~11 300 km², ilçeleri ~5 450 km²); ilçeler kıyı çizgisini izler. Bu yüzden il çokgeni = ilçelerinin birleşimi
 * (`kara`, mapshaper -dissolve2). Alan ve merkez yeniden hesaplanır; NE admin-1 eşlemesi uzamsal olarak denetlenir.
 */
export function ilKaralariniUygula(
  iller: Il[],
  kara: ReadonlyMap<string, Cokgen[]>,
  neBirimleri: readonly NeBirim[],
  raporlar: readonly EslemeRaporu[],
): void {
  for (const il of iller) {
    const c = kara.get(il.kimlik);
    if (c === undefined || c.length === 0) throw new Error(`il ${il.kimlik}: ilce birlesimi yok`);
    const rapor = raporlar.find((r) => r.ulke === il.ulke)!;
    il.cokgenler = c;
    const karaKm2 = c.reduce((s, x) => s + cokgenAlaniKm2(x), 0);
    il.alanKm2 = yuvarla1(karaKm2);
    il.merkez = merkezSec(il.merkezAdaylari, c);
    if (il.osmIliskiKm2 - karaKm2 > 0.02 * il.osmIliskiKm2) {
      rapor.denizUzantili.push({ il: il.kimlik, osmIliskiKm2: yuvarla1(il.osmIliskiKm2), karaKm2: yuvarla1(karaKm2) });
    }
    const [b, e] = icNokta(c);
    const noktaNe = neBirimleri.find((n) => n.kod.slice(0, 3) === il.ne.slice(0, 3) && cokgenlerdeMi(b, e, n.cokgenler));
    if (noktaNe?.kod !== il.ne) rapor.uzamsalUyusmazliklar.push({ il: il.kimlik, ne: il.ne, noktaninNesi: noktaNe?.kod ?? null });
  }
}

/** NE admin-1 kodu -> oyun bölgesi ve NE birimleri (karadeniz.json eşlemesiyle aynı kurallar). */
export function neBolgeEslemesi(yap: Yapilandirma): { neBolge: Map<string, string>; neBirimleri: NeBirim[] } {
  return { neBolge: admin1Esle(yap, admin1Oku()), neBirimleri: neBirimleriOku() };
}

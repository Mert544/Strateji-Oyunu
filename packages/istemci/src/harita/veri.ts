/**
 * Harita verisinin tembel yüklenmesi (ODbL; packages/veri/haritalar/odbl/).
 *
 * Dosyalar ilk JS'ye girmez: sayfanın yanındaki `harita-verisi/` klasöründen (ya da `?harita-veri=<url>`)
 * `fetch` ile gelir. Geliştirme sunucusu bu yolu vite.config.ts'deki küçük ara katmanla odbl klasörüne,
 * derleme (scripts/derle.ts) ise dosyaları dist/ ve istemci/ yanına kopyalar. Tek dosya HTML file:// ile
 * açılırsa tarayıcı fetch'e izin vermez; harita bu durumda açık bir hata gösterir.
 */
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import type { AramaKaydi } from "./arama";
import { cerceve } from "./geometri";
import { bhiCoz } from "./hucre";
import type { Izgara, Sinir } from "./hucre";

type Topology = Parameters<typeof feature>[0];

export const OSM_ATIF = "© OpenStreetMap katkıcıları";
export const OSM_ATIF_HTML = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap katkıcıları</a> (ODbL)';

export interface IlceBilgi {
  kimlik: string;
  ad: string;
  il: string;
  merkez: [number, number];
  alanKm2: number;
}

export interface IlBilgi {
  kimlik: string;
  ad: string;
  bolge: string;
  merkez: [number, number];
  ilceler: string[];
}

export interface BolgeBilgi {
  kimlik: string;
  ad: string;
  iller: string[];
}

export interface Hiyerarsi {
  bolgeler: Map<string, BolgeBilgi>;
  iller: Map<string, IlBilgi>;
  ilceler: Map<string, IlceBilgi>;
  atif: string;
}

export type CokgenOzellik = Feature<Polygon | MultiPolygon, { kimlik: string; ad: string; ebeveyn: string }>;
export type CokgenKumesi = FeatureCollection<Polygon | MultiPolygon, { kimlik: string; ad: string; ebeveyn: string }>;

export interface SinirKatmani {
  fc: CokgenKumesi;
  cerceve: Map<string, Sinir>;
}

/** Arsa ızgarası olan ilçeler (S6 örneği; ileride il başına `seritler.pmtiles` + ilçe başına BHI1). */
export const IZGARALI_ILCELER: Readonly<Record<string, { seritler: string; hucreler: string }>> = {
  tr_41_gebze: { seritler: "ornek/gebze-seritler.pmtiles", hucreler: "ornek/gebze-hucreler.bhi.gz" },
};

export function veriKoku(): string {
  let kok = "./harita-verisi/";
  try {
    const q = new URLSearchParams(location.search).get("harita-veri");
    if (q) kok = q.endsWith("/") ? q : q + "/";
  } catch {
    /* yoksay */
  }
  return new URL(kok, location.href).href;
}

const DOSYA_HATASI = "Harita verisi file:// altından okunamıyor; sayfayı bir HTTP sunucusundan açın (ya da ?harita-veri=<http adresi>).";

async function getir(yol: string): Promise<Response> {
  const url = veriKoku() + yol;
  // file:// altında tarayıcı fetch'e izin vermez (konsola CORS hatası düşer): hiç denemeden açık hata ver.
  if (url.startsWith("file:")) throw new Error(DOSYA_HATASI);
  let r: Response;
  try {
    r = await fetch(url);
  } catch {
    throw new Error(`Harita verisi alınamadı: ${yol}`);
  }
  if (!r.ok) throw new Error(`Harita verisi alınamadı (${r.status}): ${yol}`);
  return r;
}

interface HamIlce {
  kimlik: string;
  ad: string;
  merkez: { enlemMikro: number; boylamMikro: number };
  alanKm2?: number;
}
interface HamIl extends HamIlce {
  ilceler: HamIlce[];
}
interface HamHiyerarsi {
  atif: string;
  bolgeler: { kimlik: string; ad: string; iller: HamIl[] }[];
}

const ll = (m: HamIlce["merkez"]): [number, number] => [m.boylamMikro / 1e6, m.enlemMikro / 1e6];

/** hiyerarsi.json -> sade dizin (saf; test edilir). */
export function hiyerarsiCoz(h: HamHiyerarsi): Hiyerarsi {
  const s: Hiyerarsi = { bolgeler: new Map(), iller: new Map(), ilceler: new Map(), atif: h.atif };
  for (const b of h.bolgeler) {
    s.bolgeler.set(b.kimlik, { kimlik: b.kimlik, ad: b.ad, iller: b.iller.map((i) => i.kimlik) });
    for (const i of b.iller) {
      s.iller.set(i.kimlik, { kimlik: i.kimlik, ad: i.ad, bolge: b.kimlik, merkez: ll(i.merkez), ilceler: i.ilceler.map((c) => c.kimlik) });
      for (const c of i.ilceler) s.ilceler.set(c.kimlik, { kimlik: c.kimlik, ad: c.ad, il: i.kimlik, merkez: ll(c.merkez), alanKm2: c.alanKm2 ?? 0 });
    }
  }
  return s;
}

/** Arama kayıtları: iller ve ilçeler. */
export function aramaKayitlari(h: Hiyerarsi): AramaKaydi[] {
  const k: AramaKaydi[] = [];
  for (const i of h.iller.values()) k.push({ tur: "il", kimlik: i.kimlik, ad: i.ad, ust: h.bolgeler.get(i.bolge)?.ad ?? "" });
  for (const c of h.ilceler.values()) k.push({ tur: "ilce", kimlik: c.kimlik, ad: c.ad, ust: h.iller.get(c.il)?.ad ?? "" });
  return k;
}

function topoCoz(t: Topology): SinirKatmani {
  const ad = Object.keys(t.objects)[0];
  if (!ad) throw new Error("Boş TopoJSON");
  const fc = feature(t, t.objects[ad] as Parameters<typeof feature>[1]) as unknown as CokgenKumesi;
  const c = new Map<string, Sinir>();
  for (const f of fc.features) c.set(f.properties.kimlik, cerceve(f.geometry));
  return { fc, cerceve: c };
}

const onbellek = new Map<string, Promise<unknown>>();
function bir<T>(anahtar: string, f: () => Promise<T>): Promise<T> {
  let p = onbellek.get(anahtar) as Promise<T> | undefined;
  if (!p) {
    p = f();
    onbellek.set(anahtar, p);
    // Hata önbellekte kalmasın (yeniden denenebilsin).
    p.catch(() => onbellek.delete(anahtar));
  }
  return p;
}

export function hiyerarsiYukle(): Promise<Hiyerarsi> {
  return bir("hiyerarsi", async () => hiyerarsiCoz((await (await getir("hiyerarsi.json")).json()) as HamHiyerarsi));
}

export function illerYukle(): Promise<SinirKatmani> {
  return bir("iller", async () => topoCoz((await (await getir("iller.topo.json")).json()) as Topology));
}

export function ilceleriYukle(il: string): Promise<SinirKatmani> {
  if (!/^[a-z][a-z0-9_]*$/.test(il)) return Promise.reject(new Error(`Geçersiz il: ${il}`));
  return bir("ilce:" + il, async () => topoCoz((await (await getir(`ilceler/${il}.topo.json`)).json()) as Topology));
}

/** gzip sihri (1f 8b) varsa açar; sunucu Content-Encoding ile zaten açtıysa olduğu gibi döner. */
export async function gzipAc(t: Uint8Array): Promise<Uint8Array> {
  if (t[0] !== 0x1f || t[1] !== 0x8b) return t;
  const akis = new Blob([t as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(akis).arrayBuffer());
}

export function izgaraYukle(ilce: string): Promise<Izgara | null> {
  const k = IZGARALI_ILCELER[ilce];
  if (!k) return Promise.resolve(null);
  return bir("izgara:" + ilce, async () => bhiCoz(await gzipAc(new Uint8Array(await (await getir(k.hucreler)).arrayBuffer()))));
}

export function seritUrl(ilce: string): string | null {
  const k = IZGARALI_ILCELER[ilce];
  return k ? veriKoku() + k.seritler : null;
}

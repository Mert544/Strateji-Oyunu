/** Yerel, nicemlenmiş ilçe TopoJSON'u açık seçimle okur; ham OSM indirmesinin yerine sessizce geçmez. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { feature } from "topojson-client";
import type { GeometryCollection, GeometryObject, Topology } from "topojson-specification";
import type { IlceBilgisi, SinirKaynagi } from "./izgara-ilce";
import type { Halka } from "./izgara-sinir";
import { ODBL_DIZINI } from "./ortak";

export interface IlceSiniri {
  halkalar: Halka[];
  kaynak: SinirKaynagi;
}

type SinirOzellikleri = Record<string, unknown>;
type AdliGeometri = Exclude<GeometryObject<SinirOzellikleri>, { type: null }>;

function halkaOku(v: unknown): Halka {
  if (!Array.isArray(v) || v.length < 4) throw new Error("yerel sinir: halka en az dort nokta icermeli");
  const h: Halka = v.map((p: unknown) => {
    if (!Array.isArray(p) || p.length !== 2 || !p.every((n: unknown) => typeof n === "number" && Number.isFinite(n)))
      throw new Error("yerel sinir: nokta sonlu [boylam, enlem] olmali");
    const [lon, lat] = p as [number, number];
    if (lon < -180 || lon > 180 || Math.abs(lat) > 85.0511287798066) throw new Error("yerel sinir: nokta Web Mercator kapsami disinda");
    return [lon, lat];
  });
  const ilk = h[0]!;
  const son = h[h.length - 1]!;
  if (ilk[0] !== son[0] || ilk[1] !== son[1]) throw new Error("yerel sinir: halka kapali degil");
  if (new Set(h.map(([x, y]) => `${x},${y}`)).size < 3) throw new Error("yerel sinir: halka dejenere");
  return h;
}

/** Dosyanın SHA256'sı türetilmiş TopoJSON baytlarınındır; ham OSM kilidinin özeti veya zamanı değildir. */
export function yerelTopojsonHalkalari(yol: string, bilgiler: readonly IlceBilgisi[]): Map<string, IlceSiniri> {
  const tamYol = resolve(yol);
  const ham = readFileSync(tamYol);
  const topo = JSON.parse(ham.toString("utf8")) as Topology & { lisans?: unknown };
  if (topo.type !== "Topology" || !Array.isArray(topo.arcs) || topo.lisans !== "ODbL-1.0")
    throw new Error("yerel sinir: ODbL-1.0 lisansli Topology gerekli");
  const nesne = topo.objects?.["ilceler"] as GeometryCollection<SinirOzellikleri> | undefined;
  if (nesne?.type !== "GeometryCollection" || !Array.isArray(nesne.geometries))
    throw new Error('yerel sinir: "ilceler" GeometryCollection yok');
  const goreli = relative(ODBL_DIZINI, tamYol);
  const dosya = !isAbsolute(goreli) && goreli !== ".." && !goreli.startsWith("../") && !goreli.startsWith("..\\")
    ? goreli.replaceAll("\\", "/") : tamYol;
  // Bu dosyada kanıtlanmış OSM zaman damgası bulunmaz. Boş değer bilinmiyor anlamındadır.
  const kaynak: SinirKaynagi = { dosya, osmZamani: "", sha256: createHash("sha256").update(ham).digest("hex") };
  const sonuc = new Map<string, IlceSiniri>();
  for (const b of bilgiler) {
    const eslesen = nesne.geometries.filter((g): g is AdliGeometri => g.type !== null && g.properties?.["kimlik"] === b.kimlik);
    if (eslesen.length !== 1) throw new Error(`yerel sinir: ${b.kimlik} icin tek geometri gerekli (${eslesen.length})`);
    const g = eslesen[0]!;
    if (g.properties?.["ebeveyn"] !== b.il) throw new Error(`yerel sinir: ${b.kimlik} ebeveyni ${b.il} ile uyusmuyor`);
    if (g.type !== "Polygon" && g.type !== "MultiPolygon") throw new Error(`yerel sinir: ${b.kimlik} Polygon/MultiPolygon olmali`);
    // Ayrı dallar topojson-client overload'unu Polygon/MultiPolygon olarak daraltır.
    const cokgenler = g.type === "Polygon" ? [feature(topo, g).geometry.coordinates] : feature(topo, g).geometry.coordinates;
    if (cokgenler.length === 0 || cokgenler.some((p) => p.length === 0)) throw new Error(`yerel sinir: ${b.kimlik} bos cokgen`);
    sonuc.set(b.kimlik, { halkalar: cokgenler.flatMap((p) => p.map(halkaOku)), kaynak });
  }
  return sonuc;
}

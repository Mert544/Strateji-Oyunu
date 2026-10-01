/**
 * İl ve ilçe sınırlarının mapshaper ile topoloji korunarak sadeleştirilmesi ve TopoJSON üretimi.
 *
 * - İller: tüm ülkelerin illeri tek katmanda sadeleştirilir; ortak sınırlar tek yay olduğu için komşu iller
 *   arasında boşluk/örtüşme oluşmaz.
 * - İlçeler: tüm ilçeler TEK katmanda birlikte sadeleştirilir (il sınırını aşan ortak yaylar da bir kez
 *   sadeleşir), sonra il başına bölünür (-split). Böylece komşu illerin ilçe dosyaları da kenar kenara oturur
 *   (yalnızca dosya başına nicemleme farkı kadar, < birkaç metre).
 */
import mapshaper from "mapshaper";
import { cokgenleriAl, type Cokgen } from "../cografya";
import { ODBL_LISANSI, OSM_ATIF_UZUN, sirala } from "./ortak";

/** Sadeleştirme: Visvalingam (ağırlıklı), metre cinsinden çözünürlük; nicemleme ızgarası. */
export const IL_SADELESTIRME_M = 250;
export const ILCE_SADELESTIRME_M = 110;
export const NICEMLEME = 100_000;

export interface TopoGirdi {
  kimlik: string;
  ad: string;
  /** Üst birim (il için bölge, ilçe için il). */
  ebeveyn: string;
  cokgenler: Cokgen[];
}

function ozellikKoleksiyonu(birimler: readonly TopoGirdi[]): string {
  const sirali = [...birimler].sort((a, b) => sirala(a.kimlik, b.kimlik));
  return JSON.stringify({
    type: "FeatureCollection",
    features: sirali.map((b) => ({
      type: "Feature",
      properties: { kimlik: b.kimlik, ad: b.ad, ebeveyn: b.ebeveyn },
      geometry: b.cokgenler.length === 1 ? { type: "Polygon", coordinates: b.cokgenler[0] } : { type: "MultiPolygon", coordinates: b.cokgenler },
    })),
  });
}

function metin(v: string | Uint8Array | undefined, ad: string): string {
  if (v === undefined) throw new Error(`mapshaper ciktisi yok: ${ad}`);
  return typeof v === "string" ? v : Buffer.from(v).toString("utf8");
}

/** TopoJSON'a lisans/atıf üyelerini ekler ve nesne adını sabitler (TopoJSON ek üyelere izin verir). */
function damgala(topoMetni: string, nesneAdi: string): string {
  const t = JSON.parse(topoMetni) as { type: string; arcs: unknown; transform?: unknown; bbox?: unknown; objects: Record<string, unknown> };
  const nesneler = Object.values(t.objects);
  if (nesneler.length !== 1) throw new Error(`beklenmeyen nesne sayisi: ${nesneler.length}`);
  const sonuc: Record<string, unknown> = { type: t.type, lisans: ODBL_LISANSI, atif: OSM_ATIF_UZUN };
  if (t.bbox !== undefined) sonuc["bbox"] = t.bbox;
  if (t.transform !== undefined) sonuc["transform"] = t.transform;
  sonuc["objects"] = { [nesneAdi]: nesneler[0] };
  sonuc["arcs"] = t.arcs;
  return JSON.stringify(sonuc);
}

/** İlçeleri ebeveyn ile göre tam çözünürlükte birleştirir (il kara çokgeni). il kimliği -> çokgenler. */
export async function ilceleriBirlestir(ilceler: readonly TopoGirdi[]): Promise<Map<string, Cokgen[]>> {
  const komut = `-i girdi.json -dissolve2 ebeveyn -o cikti.json format=geojson precision=0.0000001`;
  const c = (await mapshaper.applyCommands(komut, { "girdi.json": ozellikKoleksiyonu(ilceler) })) as Record<string, string | Uint8Array>;
  const fc = JSON.parse(metin(c["cikti.json"], "cikti.json")) as {
    features: Array<{ properties: { ebeveyn: string }; geometry: { type: string; coordinates: unknown } | null }>;
  };
  const sonuc = new Map<string, Cokgen[]>();
  for (const f of fc.features) if (f.geometry !== null) sonuc.set(f.properties.ebeveyn, cokgenleriAl(f.geometry));
  return sonuc;
}

/** Tüm illerin sadeleştirilmiş TopoJSON'u (nesne: "iller"). */
export async function illerTopo(iller: readonly TopoGirdi[], aralikM = IL_SADELESTIRME_M): Promise<string> {
  const komut =
    `-i girdi.json -simplify interval=${aralikM} keep-shapes ` +
    `-o cikti.topo.json format=topojson quantization=${NICEMLEME}`;
  const c = (await mapshaper.applyCommands(komut, { "girdi.json": ozellikKoleksiyonu(iller) })) as Record<string, string | Uint8Array>;
  return damgala(metin(c["cikti.topo.json"], "cikti.topo.json"), "iller");
}

/** İl kimliği -> o ilin ilçelerinin TopoJSON'u (nesne: "ilceler"). */
export async function ilcelerTopo(ilceler: readonly TopoGirdi[], aralikM = ILCE_SADELESTIRME_M): Promise<Map<string, string>> {
  const komut =
    `-i girdi.json -simplify interval=${aralikM} keep-shapes -split ebeveyn ` +
    `-o format=topojson singles quantization=${NICEMLEME}`;
  const c = (await mapshaper.applyCommands(komut, { "girdi.json": ozellikKoleksiyonu(ilceler) })) as Record<string, string | Uint8Array>;
  const sonuc = new Map<string, string>();
  const iller = [...new Set(ilceler.map((x) => x.ebeveyn))].sort(sirala);
  for (const il of iller) sonuc.set(il, damgala(metin(c[`${il}.json`], `${il}.json`), "ilceler"));
  if (Object.keys(c).length !== iller.length) throw new Error(`mapshaper il bolmesi beklenmedik: ${Object.keys(c).length} dosya, ${iller.length} il`);
  return sonuc;
}

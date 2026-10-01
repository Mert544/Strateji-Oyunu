/**
 * Adım 2: admin-1 -> oyun bölgeleri. Yapılandırmadaki kimlik listesiyle admin-1 çokgenleri eşlenir,
 * mapshaper ile bölge başına birleştirilir (dissolve2) ve sadeleştirilir; çıktı TopoJSON'dur.
 *
 * İki sürüm üretilir:
 * - tam: birleştirilmiş tam çözünürlüklü çokgenler (kıyı tespiti, konum, nüfus için; dosyaya yazılmaz)
 * - sade: sadeleştirilmiş TopoJSON (komşuluk ve çıktı dosyası)
 */
import mapshaper from "mapshaper";
import type { Topology } from "topojson-specification";
import type { Cokgen } from "./cografya";
import { cokgenleriAl } from "./cografya";
import type { Admin1 } from "./ulke-verisi";
import type { Yapilandirma } from "./yapilandirma";

/** mapshaper sadeleştirme oranı (Visvalingam, tutulan köşe oranı) ve TopoJSON nicemleme ızgarası. */
export const SADELESTIRME_ORANI = 0.5;
export const NICEMLEME = 100_000;

export interface BirlesikBolge {
  id: string;
  cokgenler: Cokgen[];
  /** Birleştirilen admin-1 kimlikleri (sıralı). */
  admin1Kodlari: string[];
}

export interface Birlesim {
  bolgeler: BirlesikBolge[];
  topoloji: Topology;
  topoMetni: string;
}

/** Yapılandırmadaki admin-1 seçicilerini (kod veya ULKE:XXX) bölgelere dağıtır. */
export function admin1Esle(yap: Yapilandirma, tumu: readonly Admin1[]): Map<string, string> {
  const kodlar = new Map<string, Admin1>(tumu.map((a) => [a.kod, a]));
  const sahip = new Map<string, string>(); // admin-1 kodu -> bölge kimliği
  const ulkeSecicileri: Array<{ ulke: string; bolge: string }> = [];
  for (const b of yap.bolgeler) {
    for (const s of b.admin1) {
      if (s.startsWith("ULKE:")) {
        ulkeSecicileri.push({ ulke: s.slice(5), bolge: b.id });
        continue;
      }
      const kod = s.split(" ")[0] as string;
      if (!kodlar.has(kod)) throw new Error(`Bolge "${b.id}": admin-1 kodu bulunamadi: "${s}"`);
      sahip.set(kod, b.id);
    }
  }
  for (const { ulke, bolge } of ulkeSecicileri) {
    let n = 0;
    for (const a of tumu) {
      if (a.ulke === ulke && !sahip.has(a.kod)) {
        sahip.set(a.kod, bolge);
        n++;
      }
    }
    if (n === 0) throw new Error(`Bolge "${bolge}": ULKE:${ulke} icin birlestirilecek admin-1 kalmadi`);
  }
  return sahip;
}

export async function birlestir(yap: Yapilandirma, tumu: readonly Admin1[]): Promise<Birlesim> {
  const sahip = admin1Esle(yap, tumu);
  const ozellikler: unknown[] = [];
  const kodlarBolgeye = new Map<string, string[]>();
  for (const a of [...tumu].sort((x, y) => (x.kod < y.kod ? -1 : 1))) {
    const id = sahip.get(a.kod);
    if (id === undefined) continue;
    ozellikler.push({ type: "Feature", properties: { id }, geometry: a.geometri });
    (kodlarBolgeye.get(id) ?? kodlarBolgeye.set(id, []).get(id))?.push(a.kod);
  }

  const girdi = { "girdi.json": JSON.stringify({ type: "FeatureCollection", features: ozellikler }) };
  const komut =
    `-i girdi.json -dissolve2 id -rename-layers bolgeler ` +
    `-o tam.json format=geojson precision=0.00001 ` +
    `-simplify visvalingam percentage=${SADELESTIRME_ORANI} keep-shapes ` +
    `-o sade.topo.json format=topojson quantization=${NICEMLEME}`;
  const cikti = (await mapshaper.applyCommands(komut, girdi)) as Record<string, string | Uint8Array>;
  const metin = (ad: string): string => {
    const v = cikti[ad];
    if (v === undefined) throw new Error(`mapshaper ciktisi yok: ${ad}`);
    return typeof v === "string" ? v : Buffer.from(v).toString("utf8");
  };

  const tam = JSON.parse(metin("tam.json")) as {
    features: Array<{ properties: { id: string }; geometry: { type: string; coordinates: unknown } }>;
  };
  const bolgeler: BirlesikBolge[] = yap.bolgeler.map((b) => {
    const f = tam.features.find((x) => x.properties.id === b.id);
    if (f === undefined) throw new Error(`Bolge birlestirilemedi: ${b.id}`);
    return { id: b.id, cokgenler: cokgenleriAl(f.geometry), admin1Kodlari: [...(kodlarBolgeye.get(b.id) ?? [])].sort() };
  });

  const topoloji = JSON.parse(metin("sade.topo.json")) as Topology;
  return { bolgeler, topoloji, topoMetni: metin("sade.topo.json") };
}

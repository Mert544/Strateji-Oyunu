/**
 * OSM çokgen ilişkisi (boundary=administrative) -> GeoJSON çokgen: yol parçalarından halka kurma,
 * dış/iç halka eşleme, küresel alan ve iç nokta. Saf ve deterministiktir (üye sırası + kimlik sırası).
 */
import { bolgeMerkezi, noktaCokgende, type Cokgen, type Halka, type Nokta } from "../cografya";

export interface OsmDugum {
  id: number;
  lat: number;
  lon: number;
}
export interface OsmYol {
  id: number;
  nodes: number[];
}
export interface OsmUye {
  type: "node" | "way" | "relation";
  ref: number;
  role: string;
}
export interface OsmIliski {
  id: number;
  tags: Record<string, string>;
  members: OsmUye[];
}

/** Overpass JSON yanıtının dizinlenmiş hali. */
export interface OsmVeri {
  dugumler: Map<number, Nokta>;
  yollar: Map<number, number[]>;
  iliskiler: Map<number, OsmIliski>;
}

/** Overpass JSON metnini dizinler (yalnızca gereken alanlar). */
export function overpassAyristir(metin: string): OsmVeri {
  const j = JSON.parse(metin) as { elements: Array<Record<string, unknown>> };
  const dugumler = new Map<number, Nokta>();
  const yollar = new Map<number, number[]>();
  const iliskiler = new Map<number, OsmIliski>();
  for (const e of j.elements) {
    const id = e["id"] as number;
    if (e["type"] === "node") dugumler.set(id, [e["lon"] as number, e["lat"] as number]);
    else if (e["type"] === "way") yollar.set(id, e["nodes"] as number[]);
    else if (e["type"] === "relation") {
      iliskiler.set(id, { id, tags: (e["tags"] as Record<string, string>) ?? {}, members: (e["members"] as OsmUye[]) ?? [] });
    }
  }
  return { dugumler, yollar, iliskiler };
}

export interface HalkaSonucu {
  /** Düğüm kimlikleriyle kapalı halkalar (ilk = son). */
  halkalar: number[][];
  /** Kapanamayan zincir sayısı (eksik/bozuk ilişki). */
  acikZincir: number;
}

/** Yol düğüm listelerini uç uca ekleyerek kapalı halkalar kurar (açgözlü, deterministik). */
export function halkalariKur(parcalar: readonly number[][]): HalkaSonucu {
  const halkalar: number[][] = [];
  const acik: number[][] = [];
  for (const p of parcalar) {
    if (p.length < 2) continue;
    if (p[0] === p[p.length - 1]) {
      if (p.length >= 4) halkalar.push([...p]);
    } else acik.push(p);
  }
  // uç düğüm -> parça dizinleri
  const uclar = new Map<number, number[]>();
  acik.forEach((p, i) => {
    for (const u of [p[0] as number, p[p.length - 1] as number]) (uclar.get(u) ?? uclar.set(u, []).get(u))?.push(i);
  });
  const kullanildi = new Array<boolean>(acik.length).fill(false);
  let acikZincir = 0;
  for (let i = 0; i < acik.length; i++) {
    if (kullanildi[i]) continue;
    kullanildi[i] = true;
    const zincir = [...(acik[i] as number[])];
    const bas = zincir[0] as number;
    for (;;) {
      const son = zincir[zincir.length - 1] as number;
      if (son === bas) break;
      const aday = (uclar.get(son) ?? []).find((k) => !kullanildi[k]);
      if (aday === undefined) break;
      kullanildi[aday] = true;
      const p = acik[aday] as number[];
      const ek = p[0] === son ? p : [...p].reverse();
      for (let k = 1; k < ek.length; k++) zincir.push(ek[k] as number);
    }
    if (zincir[0] === zincir[zincir.length - 1] && zincir.length >= 4) halkalar.push(zincir);
    else acikZincir++;
  }
  return { halkalar, acikZincir };
}

const DUNYA_YARICAPI_KM = 6371.0088;
const RAD = Math.PI / 180;

/** Küresel halka alanı (km², işaretli; d3/turf ile aynı formül). */
export function halkaAlaniKm2(h: Halka): number {
  let t = 0;
  for (let i = 0; i < h.length - 1; i++) {
    const [b1, e1] = h[i] as Nokta;
    const [b2, e2] = h[i + 1] as Nokta;
    t += (b2 - b1) * RAD * (2 + Math.sin(e1 * RAD) + Math.sin(e2 * RAD));
  }
  return (t * DUNYA_YARICAPI_KM * DUNYA_YARICAPI_KM) / 2;
}

export function cokgenAlaniKm2(c: Cokgen): number {
  let a = 0;
  c.forEach((h, n) => {
    const x = Math.abs(halkaAlaniKm2(h));
    a += n === 0 ? x : -x;
  });
  return a;
}

export interface IliskiGeometrisi {
  cokgenler: Cokgen[];
  alanKm2: number;
  /** Kapanamayan zincir + hiçbir dış halkaya oturmayan iç halka sayısı. */
  sorunlar: string[];
}

/**
 * İlişkinin dış/iç halkalarını kurar. Roller: "outer" veya boş = dış, "inner" = iç (OSM çokgen kuralı).
 * İç halka, içine düştüğü en küçük dış halkaya delik olarak eklenir.
 */
export function iliskiGeometrisi(r: OsmIliski, veri: OsmVeri): IliskiGeometrisi {
  const sorunlar: string[] = [];
  const goruldu = new Set<number>();
  const dis: number[][] = [];
  const ic: number[][] = [];
  let eksikYol = 0;
  for (const u of r.members) {
    if (u.type !== "way" || goruldu.has(u.ref)) continue;
    if (u.role !== "outer" && u.role !== "inner" && u.role !== "") continue;
    goruldu.add(u.ref);
    const y = veri.yollar.get(u.ref);
    if (y === undefined) {
      eksikYol++;
      continue;
    }
    (u.role === "inner" ? ic : dis).push(y);
  }
  if (eksikYol > 0) sorunlar.push(`${eksikYol} uye yol veride yok`);
  const koordinat = (h: number[]): Halka => {
    const sonuc: Nokta[] = [];
    for (const d of h) {
      const n = veri.dugumler.get(d);
      if (n === undefined) throw new Error(`iliski ${r.id}: dugum ${d} veride yok`);
      sonuc.push([Math.round(n[0] * 1e7) / 1e7, Math.round(n[1] * 1e7) / 1e7]);
    }
    return sonuc;
  };
  const d = halkalariKur(dis);
  const i = halkalariKur(ic);
  if (d.acikZincir > 0) sorunlar.push(`${d.acikZincir} dis zincir kapanmadi`);
  if (i.acikZincir > 0) sorunlar.push(`${i.acikZincir} ic zincir kapanmadi`);
  const disHalkalar = d.halkalar.map(koordinat).map((h) => ({ h, alan: Math.abs(halkaAlaniKm2(h)), delikler: [] as Halka[] }));
  // Büyükten küçüğe (eşitlikte ilk nokta) deterministik sıra
  disHalkalar.sort((p, q) => q.alan - p.alan || (p.h[0] as Nokta)[0] - (q.h[0] as Nokta)[0] || (p.h[0] as Nokta)[1] - (q.h[0] as Nokta)[1]);
  for (const h of i.halkalar.map(koordinat)) {
    // Test noktası: ilk kenarın ortası (paylaşılan köşe sorunlarından kaçınmak için)
    const [a, b] = [h[0] as Nokta, h[1] as Nokta];
    const tb = (a[0] + b[0]) / 2;
    const te = (a[1] + b[1]) / 2;
    let sahip: (typeof disHalkalar)[number] | undefined;
    for (const x of disHalkalar) if (noktaCokgende(tb, te, [x.h]) && (sahip === undefined || x.alan < sahip.alan)) sahip = x;
    if (sahip === undefined) sorunlar.push("ic halka hicbir dis halkaya oturmadi (atlandi)");
    else sahip.delikler.push(h);
  }
  const cokgenler: Cokgen[] = disHalkalar.map((x) => [x.h, ...x.delikler]);
  const alanKm2 = cokgenler.reduce((s, c) => s + cokgenAlaniKm2(c), 0);
  return { cokgenler, alanKm2, sorunlar };
}

/** Çokgen kümesi içinde kalan temsilî nokta (ağırlık merkezi içerdeyse o, değilse en geniş iç aralık ortası). */
export function icNokta(cokgenler: Cokgen[]): Nokta {
  const m = bolgeMerkezi(cokgenler);
  return [m.b, m.e];
}

export function cokgenlerdeMi(b: number, e: number, cokgenler: readonly Cokgen[]): boolean {
  return cokgenler.some((c) => noktaCokgende(b, e, c));
}

/**
 * TopoJSON çözme yardımcıları (saf): ülke/kıta poligonları, sınır çizgileri ve oyun bölge çokgenleri.
 */
import { feature, mesh } from "topojson-client";
import type { Poligon } from "../kure/ucgenle";

/** topojson-client'ın kabul ettiği Topology (özel tip bağımlılığı olmadan). */
export type TopoVeri = Parameters<typeof feature>[0];

interface GeoOzellik {
  properties?: Record<string, unknown> | null;
  geometry: { type: string; coordinates?: unknown } | null;
}

function poligonlarCikar(g: GeoOzellik["geometry"]): Poligon[] {
  if (!g) return [];
  if (g.type === "Polygon") return [g.coordinates as Poligon];
  if (g.type === "MultiPolygon") return g.coordinates as Poligon[];
  return [];
}

function ozellikler(topo: TopoVeri, nesne: string): GeoOzellik[] {
  const o = (topo.objects as Record<string, unknown>)[nesne];
  if (!o) throw new Error(`TopoJSON nesnesi yok: ${nesne}`);
  const f = feature(topo, o as Parameters<typeof feature>[1]) as unknown as { features?: GeoOzellik[] } & GeoOzellik;
  return f.features ?? [f];
}

export interface DunyaKarasi {
  poligonlar: Poligon[];
  /** Ülkeler arası (paylaşılan) sınırlar. */
  sinirlar: number[][][];
  /** Dış (kıyı) çizgileri. */
  kiyilar: number[][][];
}

/** Ülke TopoJSON'undan kara poligonları, iç sınırlar ve kıyı çizgileri. */
export function ulkeleriCoz(topo: TopoVeri, nesne = "ulkeler"): DunyaKarasi {
  const poligonlar = ozellikler(topo, nesne).flatMap((f) => poligonlarCikar(f.geometry));
  const o = (topo.objects as Record<string, unknown>)[nesne] as Parameters<typeof mesh>[1];
  const sinirlar = (mesh(topo, o, (a, b) => a !== b) as unknown as { coordinates: number[][][] }).coordinates;
  const kiyilar = (mesh(topo, o, (a, b) => a === b) as unknown as { coordinates: number[][][] }).coordinates;
  return { poligonlar, sinirlar, kiyilar };
}

export interface BolgeCografyasi {
  id: string;
  poligonlar: Poligon[];
  ozellikler: Record<string, unknown>;
}

/** Bölge TopoJSON'undan her geometrinin `properties.id`'sine göre çokgenleri. */
export function bolgeleriCoz(topo: TopoVeri, nesne = "bolgeler"): BolgeCografyasi[] {
  const s: BolgeCografyasi[] = [];
  for (const f of ozellikler(topo, nesne)) {
    const id = f.properties?.["id"];
    if (typeof id !== "string") continue;
    const p = poligonlarCikar(f.geometry);
    if (p.length === 0) continue;
    s.push({ id, poligonlar: p, ozellikler: f.properties ?? {} });
  }
  return s;
}

/** Çokgen kümesinin alan ağırlıklı (düzlemsel) merkezi [boylam, enlem]; en büyük dış halkanın merkezi. */
export function poligonMerkezi(poligonlar: readonly Poligon[]): [number, number] {
  let enAlan = -1;
  let c: [number, number] = [0, 0];
  for (const p of poligonlar) {
    const h = p[0];
    if (!h || h.length < 3) continue;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < h.length - 1; i++) {
      const u = h[i] as number[], v = h[i + 1] as number[];
      const f = (u[0] as number) * (v[1] as number) - (v[0] as number) * (u[1] as number);
      a += f;
      cx += ((u[0] as number) + (v[0] as number)) * f;
      cy += ((u[1] as number) + (v[1] as number)) * f;
    }
    const alan = Math.abs(a) / 2;
    if (alan > enAlan && Math.abs(a) > 1e-12) {
      enAlan = alan;
      c = [cx / (3 * a), cy / (3 * a)];
    }
  }
  return c;
}

/** Çokgen kümesinin [minBoylam, minEnlem, maxBoylam, maxEnlem] kutusu. */
export function sinirKutusu(poligonlar: readonly Poligon[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poligonlar) {
    const h = p[0];
    if (!h) continue;
    for (const n of h) {
      const x = n[0] as number, y = n[1] as number;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return [x0, y0, x1, y1];
}

/** Nokta çokgenin (delikler dahil) içinde mi? (ışın atma) */
export function noktaIcinde(poligonlar: readonly Poligon[], boylam: number, enlem: number): boolean {
  for (const p of poligonlar) {
    const dis = p[0];
    if (!dis || !halkaIcinde(dis, boylam, enlem)) continue;
    let delikte = false;
    for (let k = 1; k < p.length; k++) {
      if (halkaIcinde(p[k] as number[][], boylam, enlem)) {
        delikte = true;
        break;
      }
    }
    if (!delikte) return true;
  }
  return false;
}

function halkaIcinde(h: number[][], x: number, y: number): boolean {
  let icinde = false;
  for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
    const a = h[i] as number[], b = h[j] as number[];
    const xi = a[0] as number, yi = a[1] as number, xj = b[0] as number, yj = b[1] as number;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) icinde = !icinde;
  }
  return icinde;
}

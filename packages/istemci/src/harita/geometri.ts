/**
 * Küçük GeoJSON yardımcıları (saf): çerçeve ve nokta-çokgen testi (çift-tek kuralı, delikler dahil).
 */
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson";
import type { Sinir } from "./hucre";

type Cokgen = Polygon | MultiPolygon;

function halkalar(g: Geometry): Position[][][] {
  if (g.type === "Polygon") return [g.coordinates];
  if (g.type === "MultiPolygon") return g.coordinates;
  return [];
}

export function cerceve(g: Geometry): Sinir {
  let b = Infinity;
  let gu = Infinity;
  let d = -Infinity;
  let k = -Infinity;
  for (const p of halkalar(g))
    for (const h of p)
      for (const c of h) {
        const x = c[0]!;
        const y = c[1]!;
        if (x < b) b = x;
        if (x > d) d = x;
        if (y < gu) gu = y;
        if (y > k) k = y;
      }
  return [b, gu, d, k];
}

export function cerceveBirlestir(a: Sinir, b: Sinir): Sinir {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

function halkadaMi(x: number, y: number, h: Position[]): boolean {
  let ic = false;
  for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
    const xi = h[i]![0]!;
    const yi = h[i]![1]!;
    const xj = h[j]![0]!;
    const yj = h[j]![1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ic = !ic;
  }
  return ic;
}

/** Nokta çokgende mi (çift-tek: dış halka içinde ve hiçbir delikte değil). */
export function noktaCokgende(boylam: number, enlem: number, g: Geometry): boolean {
  for (const p of halkalar(g)) {
    if (!p[0] || !halkadaMi(boylam, enlem, p[0])) continue;
    let delikte = false;
    for (let i = 1; i < p.length; i++) if (halkadaMi(boylam, enlem, p[i]!)) delikte = true;
    if (!delikte) return true;
  }
  return false;
}

/** Noktayı içeren ilk özellik (yoksa null). */
export function noktadakiOzellik<P>(boylam: number, enlem: number, fc: FeatureCollection<Cokgen, P>): Feature<Cokgen, P> | null {
  for (const f of fc.features) if (noktaCokgende(boylam, enlem, f.geometry)) return f;
  return null;
}

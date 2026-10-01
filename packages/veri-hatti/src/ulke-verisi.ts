/**
 * Natural Earth dosyalarının okunması (yalnızca gereken alanlar).
 */
import { readFileSync } from "node:fs";
import { KAYNAKLAR } from "./kaynaklar";
import { onbellekYolu } from "./indir";
import type { Cokgen } from "./cografya";
import { cokgenleriAl } from "./cografya";

interface GeoJsonOzellik {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown } | null;
}

function geoJsonOku(kimlik: string): GeoJsonOzellik[] {
  const k = KAYNAKLAR.find((x) => x.kimlik === kimlik);
  if (k === undefined) throw new Error(`Bilinmeyen kaynak: ${kimlik}`);
  const ham = JSON.parse(readFileSync(onbellekYolu(k), "utf8")) as { features: GeoJsonOzellik[] };
  return ham.features;
}

export interface Admin1 {
  /** adm1_code, ör. "TUR-2241". */
  kod: string;
  ad: string;
  /** adm0_a3, ör. "TUR". */
  ulke: string;
  geometri: { type: string; coordinates: unknown };
}

export function admin1Oku(): Admin1[] {
  return geoJsonOku("ne_admin1")
    .filter((f) => f.geometry !== null)
    .map((f) => ({
      kod: String(f.properties["adm1_code"]),
      ad: String(f.properties["name"]),
      ulke: String(f.properties["adm0_a3"]),
      geometri: f.geometry as { type: string; coordinates: unknown },
    }));
}

/** Kara/deniz ayrımı için ülke çokgenleri (ilgilenilen kutuyla kesişenler). */
export function karaCokgenleriOku(kutu: { minB: number; maxB: number; minE: number; maxE: number }): Cokgen[] {
  const sonuc: Cokgen[] = [];
  for (const f of geoJsonOku("ne_admin0")) {
    if (f.geometry === null) continue;
    for (const c of cokgenleriAl(f.geometry)) {
      let kesisir = false;
      for (const [b, e] of c[0] ?? []) {
        if (b >= kutu.minB - 1 && b <= kutu.maxB + 1 && e >= kutu.minE - 1 && e <= kutu.maxE + 1) {
          kesisir = true;
          break;
        }
      }
      if (kesisir) sonuc.push(c);
    }
  }
  return sonuc;
}

export interface Liman {
  ad: string;
  boylam: number;
  enlem: number;
  /** NE ports scalerank (küçük = daha önemli; NE'de tutarsız olabilir). */
  siralama: number;
  kaynak: "ne_ports" | "ne_places";
}

export function limanlariOku(): Liman[] {
  return geoJsonOku("ne_ports").map((f) => {
    const [b, e] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;
    return { ad: String(f.properties["name"]), boylam: b, enlem: e, siralama: Number(f.properties["scalerank"]), kaynak: "ne_ports" as const };
  });
}

export interface Yerlesim {
  ad: string;
  ulke: string;
  boylam: number;
  enlem: number;
  nufusEnFazla: number;
}

export function yerlesimleriOku(): Yerlesim[] {
  return geoJsonOku("ne_places").map((f) => {
    const [b, e] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;
    return {
      ad: String(f.properties["nameascii"]),
      ulke: String(f.properties["adm0_a3"]),
      boylam: b,
      enlem: e,
      nufusEnFazla: Number(f.properties["pop_max"]),
    };
  });
}

/**
 * Adım 3: komşuluk. Sadeleştirilmiş TopoJSON'da ortak yay paylaşan bölgeler komşudur; ortak sınır uzunluğu
 * (km) paylaşılan yaylardan ölçülür. (Çıktı dosyasındaki geometriyle birebir tutarlıdır.)
 */
import { mesh, neighbors } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { cizgiUzunlukKm, type Nokta } from "./cografya";

export interface Komsuluk {
  a: string;
  b: string;
  ortakSinirKm: number;
}

export function komsulariBul(topoloji: Topology, nesneAdi = "bolgeler"): Komsuluk[] {
  const nesne = topoloji.objects[nesneAdi] as GeometryCollection | undefined;
  if (nesne === undefined || nesne.type !== "GeometryCollection") throw new Error(`TopoJSON'da "${nesneAdi}" koleksiyonu yok`);
  const geometriler = nesne.geometries;
  const kimlik = (i: number): string => String((geometriler[i] as { properties?: { id?: unknown } }).properties?.id);
  const komsu = neighbors(geometriler);
  const sonuc: Komsuluk[] = [];
  for (let i = 0; i < geometriler.length; i++) {
    for (const j of komsu[i] as number[]) {
      if (j <= i) continue;
      const gi = geometriler[i];
      const gj = geometriler[j];
      const ortak = mesh(topoloji, nesne, (x, y) => (x === gi && y === gj) || (x === gj && y === gi));
      const km = cizgiUzunlukKm(ortak.coordinates as unknown as Nokta[][]);
      const [a, b] = [kimlik(i), kimlik(j)].sort();
      sonuc.push({ a: a as string, b: b as string, ortakSinirKm: km });
    }
  }
  sonuc.sort((x, y) => (x.a === y.a ? (x.b < y.b ? -1 : 1) : x.a < y.a ? -1 : 1));
  return sonuc;
}

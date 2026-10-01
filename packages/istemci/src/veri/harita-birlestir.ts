/**
 * Harita + bölge çokgenlerini birleştirme (saf; sanal modül gerektirmez).
 */
import type { HaritaDosyasi } from "@bolge/veri";
import { bolgeleriCoz, poligonMerkezi, sinirKutusu } from "./cografya";
import type { BolgeCografyasi, TopoVeri } from "./cografya";
import type { Poligon } from "../kure/ucgenle";

export interface BolgeGeo {
  /** Harita dosyasındaki indeks. */
  indeks: number;
  id: string;
  poligonlar: Poligon[];
  /** Merkez [boylam, enlem]. */
  merkez: [number, number];
  /** [minBoylam, minEnlem, maxBoylam, maxEnlem]. */
  kutu: [number, number, number, number];
}

export interface DunyaHaritasi {
  harita: HaritaDosyasi;
  bolgeler: BolgeGeo[];
  /** Geçici katman mı (gerçek harita dosyası yok)? */
  gecici: boolean;
  atif: string[];
}

/** Sekiz köşeli küçük disk çokgeni (çokgeni olmayan bölgeler için yedek). */
export function diskPoligonu(boylam: number, enlem: number, yaricapDer = 0.22): Poligon {
  const h: number[][] = [];
  const k = Math.max(0.2, Math.cos((enlem * Math.PI) / 180));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    h.push([boylam + (yaricapDer * Math.cos(a)) / k, enlem + yaricapDer * Math.sin(a)]);
  }
  h.push(h[0] as number[]);
  return [h];
}

/**
 * Harita + bölge çokgenlerini birleştirir. Her bölge için çokgen; yoksa `konum`dan disk; merkez `konum`dan
 * (mikro derece) veya çokgenden. Geçici modda harita adları ve konumlar TopoJSON özelliklerinden doldurulur.
 */
export function haritayiBirlestir(harita: HaritaDosyasi, topo: TopoVeri, gecici: boolean): DunyaHaritasi {
  const cog = new Map<string, BolgeCografyasi>(bolgeleriCoz(topo).map((b) => [b.id, b]));
  const yeni: HaritaDosyasi = { ...harita, bolgeler: harita.bolgeler.map((b) => ({ ...b })) };
  const bolgeler: BolgeGeo[] = [];
  yeni.bolgeler.forEach((b, indeks) => {
    const g = cog.get(b.id);
    let poligonlar = g?.poligonlar ?? [];
    if (gecici && g) {
      // Geçici katmanda ad ve konum il verisinden gelir.
      const oz = g.ozellikler;
      if (typeof oz["ad"] === "string") b.ad = oz["ad"];
      if (typeof oz["enlemMikro"] === "number" && typeof oz["boylamMikro"] === "number") {
        b.konum = { enlemMikro: oz["enlemMikro"], boylamMikro: oz["boylamMikro"] };
      }
    }
    let merkez: [number, number];
    if (b.konum) merkez = [b.konum.boylamMikro / 1e6, b.konum.enlemMikro / 1e6];
    else if (poligonlar.length > 0) merkez = poligonMerkezi(poligonlar);
    else merkez = [0, 0];
    if (poligonlar.length === 0) poligonlar = [diskPoligonu(merkez[0], merkez[1])];
    bolgeler.push({ indeks, id: b.id, poligonlar, merkez, kutu: sinirKutusu(poligonlar) });
  });
  const atif = [...(yeni.atif ?? [])];
  if (!atif.some((a) => /natural earth/i.test(a))) atif.push("Made with Natural Earth (kamu malı)");
  return { harita: yeni, bolgeler, gecici, atif };
}


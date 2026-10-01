/**
 * OSM idari birim yapılandırması (yapilandirma/osm-idari.json): ülke başına OSM ilişkisi, il/ilçe admin_level
 * eşlemesi, ek il ilişkileri, ISO -> Natural Earth kod düzeltmeleri ve elle il -> bölge düzeltmeleri.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { OSM_YAPILANDIRMA_YOLU } from "./ortak";

const aralik = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]);

const ulkeSema = z
  .object({
    /** ISO 3166-1 alfa-2, küçük harf: kimlik öneki. */
    kod: z.string().regex(/^[a-z]{2}$/),
    ad: z.string().min(1),
    /** Ülke sınırı ilişkisi (Overpass alanı = 3600000000 + kimlik). */
    osmIliski: z.number().int().positive(),
    /** Natural Earth adm0_a3 (bölge eşlemesi için). */
    neUlke: z.string().length(3),
    /** İl ilişkilerinin ISO3166-2 öneki (ör. "TR-"); il kimliği bu kodun sonekinden türetilir. */
    isoOnEki: z.string().min(2),
    ilSeviyesi: z.number().int().min(3).max(10),
    ilceSeviyesi: z.number().int().min(4).max(10),
    /** admin_level'ı farklı olan ama il sayılan ilişkiler (ör. Aynoroz). */
    ekIller: z.array(z.object({ osmIliski: z.number().int().positive(), neden: z.string().min(1) }).strict()),
    /** Oyun bölgelerine düşen il sayısı ve toplam ilçe sayısı için beklenen aralıklar (testler/denetim). */
    beklenenIl: aralik,
    beklenenIlce: aralik,
    not: z.string(),
  })
  .strict();

export const OsmYapilandirmaSema = z
  .object({
    surum: z.literal(1),
    aciklama: z.string(),
    overpassUclari: z.array(z.string().url()).min(1),
    ulkeler: z.array(ulkeSema).min(1),
    /** OSM ISO3166-2 -> Natural Earth iso_3166_2 (NE'nin farklı kodladığı birimler). */
    isoNeEslemesi: z.record(z.string(), z.string()),
    /** il kimliği -> oyun bölgesi (otomatik eşleme yanlış/boş kaldığında elle çözüm). */
    ilBolgeDuzeltmeleri: z.record(z.string(), z.string()),
  })
  .strict();

export type OsmYapilandirma = z.infer<typeof OsmYapilandirmaSema>;
export type OsmUlke = OsmYapilandirma["ulkeler"][number];

export function osmYapilandirmaOku(yol: string = OSM_YAPILANDIRMA_YOLU): OsmYapilandirma {
  const s = OsmYapilandirmaSema.safeParse(JSON.parse(readFileSync(yol, "utf8")) as unknown);
  if (!s.success) {
    throw new Error(`OSM yapilandirmasi gecersiz (${yol}):\n - ${s.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n - ")}`);
  }
  return s.data;
}

/** Ülke başına tek Overpass sorgusu: il + ilçe ilişkileri, üye yollar ve düğümler (iskelet). */
export function overpassSorgusu(u: OsmUlke): string {
  const alan = 3_600_000_000 + u.osmIliski;
  const ek = u.ekIller.map((e) => `rel(${e.osmIliski});`).join("");
  return (
    `[out:json][timeout:600][maxsize:536870912];` +
    `area(id:${alan})->.ulke;` +
    `(rel(area.ulke)["boundary"="administrative"]["admin_level"~"^(${u.ilSeviyesi}|${u.ilceSeviyesi})$"];${ek})->.r;` +
    `.r out body qt;` +
    `.r >->.alt;` +
    `.alt out skel qt;`
  );
}

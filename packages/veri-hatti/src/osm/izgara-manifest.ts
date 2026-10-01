/**
 * Arsa ızgarası manifesti (packages/veri/haritalar/odbl/izgara/manifest.json).
 *
 * Üretilmiş TEK kayıttır: hangi ilçelerde z20 ızgarası var, dosya yolları (odbl/ dizinine göre; istemcinin
 * `harita-verisi/` kökü ile aynıdır), baytlar, sha256, hücre sayıları, kural ve kaynak sürümleri. İstemci ve
 * sunucu ilçe listesini buradan alır; el ile ilçe tablosu tutulmaz. Dosya yoksa ilçe yoktur.
 * Saf okuma/doğrulama: ağ ve araç gerektirmez.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { ILCE_NUFUS_ENCOK } from "@bolge/veri";
import { z } from "zod";
import { ikiliCoz, type IkiliIzgara } from "./izgara-cikti";
import { ODBL_DIZINI } from "./ortak";

export const IZGARA_MANIFEST_YOLU = resolve(ODBL_DIZINI, "izgara/manifest.json");

const dosya = z.object({ yol: z.string().min(1), bayt: z.number().int().positive(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).strict();

const ilce = z
  .object({
    kimlik: z.string().regex(/^[a-z][a-z0-9_]*$/),
    ad: z.string().min(1),
    il: z.string().min(1),
    osmIliski: z.number().int().positive(),
    /** İlçe nüfusu (yapilandirma/ilce-nufus.json, TÜİK ADNKS 2025); isteğe bağlı: sunucu `ParselIzgaraIlce.nufus` olarak okur (G7). */
    nufus: z.number().int().min(1).max(ILCE_NUFUS_ENCOK).optional(),
    /** BHI1 (gzip): sunucu ve istemci BU dosyayı okur. */
    bhi: dosya.extend({ hamBayt: z.number().int().positive() }).strict(),
    /** İstemci vektör katmanı (şerit PMTiles, z15). */
    seritler: dosya,
    cerceve: z.object({ x0: z.number().int(), y0: z.number().int(), genislik: z.number().int().positive(), yukseklik: z.number().int().positive() }).strict(),
    hucre: z
      .object({
        icerde: z.number().int().positive(),
        su: z.number().int().nonnegative(),
        kara: z.number().int().positive(),
        uygun: z.number().int().nonnegative(),
        engelYol: z.number().int().nonnegative(),
        engelAskeri: z.number().int().nonnegative(),
      })
      .strict(),
    karo: z.object({ yapi: z.string(), bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]), bayt: z.number().int().positive(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).strict(),
  })
  .strict();

export const IzgaraManifestSemasi = z
  .object({
    surum: z.literal(1),
    lisans: z.literal("ODbL-1.0"),
    atif: z.string(),
    aciklama: z.string(),
    hucreZ: z.literal(20),
    /** Engel kuralı (VARSAYILAN_SECENEKLER): yol/su alt örnek eşiği (64 üzerinden) ve askeri eşik. */
    kural: z.object({ ornek: z.number().int(), yolEsik: z.number().int(), suEsik: z.number().int(), askeriEsik: z.number().int() }).strict(),
    kaynak: z
      .object({
        karo: z.object({ yapi: z.string(), url: z.string().url(), semaSurumu: z.string(), osmZamani: z.string() }).strict(),
        sinir: z.object({ dosya: z.string(), osmZamani: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).strict(),
      })
      .strict(),
    ilceler: z.array(ilce).min(1),
  })
  .strict();

export type IzgaraManifesti = z.infer<typeof IzgaraManifestSemasi>;
export type IlceIzgarasi = IzgaraManifesti["ilceler"][number];

export function manifestOku(yol: string = IZGARA_MANIFEST_YOLU): IzgaraManifesti {
  const s = IzgaraManifestSemasi.safeParse(JSON.parse(readFileSync(yol, "utf8")) as unknown);
  if (!s.success) throw new Error(`izgara manifesti gecersiz (${yol}):\n - ${s.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n - ")}`);
  const kimlikler = s.data.ilceler.map((i) => i.kimlik);
  if (new Set(kimlikler).size !== kimlikler.length) throw new Error("izgara manifesti: yinelenen ilce kimligi");
  if (kimlikler.some((k, i) => i > 0 && k < kimlikler[i - 1]!)) throw new Error("izgara manifesti: ilceler kimlige gore sirali degil");
  return s.data;
}

export const sha256Hex = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

/** Manifestin dosyaları: yol -> {bayt, sha256}. `kok` = odbl dizini. */
export function manifestDosyalari(m: IzgaraManifesti): { kimlik: string; tur: "bhi" | "seritler"; yol: string; bayt: number; sha256: string }[] {
  return m.ilceler.flatMap((i) => [
    { kimlik: i.kimlik, tur: "bhi" as const, ...i.bhi },
    { kimlik: i.kimlik, tur: "seritler" as const, ...i.seritler },
  ]);
}

/** Manifest ile diskteki dosyaları karşılaştırır (bayt, sha256, BHI1 başlığı ve sayımlar). Hata iletileri döner. */
export function manifestiDogrula(m: IzgaraManifesti, kok: string = ODBL_DIZINI): string[] {
  const hata: string[] = [];
  for (const d of manifestDosyalari(m)) {
    const yol = resolve(kok, d.yol);
    if (!existsSync(yol)) {
      hata.push(`${d.kimlik} ${d.tur}: dosya yok (${d.yol})`);
      continue;
    }
    const b = readFileSync(yol);
    if (b.length !== d.bayt) hata.push(`${d.kimlik} ${d.tur}: bayt ${b.length} != ${d.bayt}`);
    if (sha256Hex(b) !== d.sha256) hata.push(`${d.kimlik} ${d.tur}: sha256 uyusmuyor`);
  }
  return hata;
}

/** İlçenin BHI1'ini (gzip açılmış, çözülmüş) okur: sunucu tarafı okuma yolu. */
export function ilceIzgarasiOku(m: IzgaraManifesti, kimlik: string, kok: string = ODBL_DIZINI): IkiliIzgara {
  const i = m.ilceler.find((x) => x.kimlik === kimlik);
  if (!i) throw new Error(`izgara manifestinde ilce yok: ${kimlik}`);
  return ikiliCoz(new Uint8Array(gunzipSync(readFileSync(resolve(kok, i.bhi.yol)))));
}

/**
 * İlçe nüfusu girdisi (yapilandirma/ilce-nufus.json): G7 yerel talebi için parsel fikstüründeki `ParselIlceTanimi.nufus`.
 *
 * Elle yazılan, sabit yıllı veri hattı girdisidir (TÜİK ADNKS 2025; kaynak ve lisans DATA_SOURCES.md §10). ODbL klasörünün
 * DIŞINDADIR (OSM türevi değildir). Bu modül yalnız dosya + zod kullanır: fikstür kuran araçlar (sunucu, betikler) JSON'u
 * doğrudan da okuyabilir. Sınırlar fikstür şemasındaki V9b kuralıyla aynıdır: tamsayı, 1..20.000.000.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ILCE_NUFUS_ENCOK } from "@bolge/veri";
import type { ParselFiksturu, ParselIlceTanimi } from "@bolge/veri";
import { z } from "zod";
import { YAPILANDIRMA_DIZINI } from "../yollar";

export const ILCE_NUFUS_YOLU = resolve(YAPILANDIRMA_DIZINI, "ilce-nufus.json");
export const NUFUS_EN_AZ = 1;
export const NUFUS_EN_COK = ILCE_NUFUS_ENCOK;

const nufus = z.number().int().min(NUFUS_EN_AZ).max(NUFUS_EN_COK);

export const IlceNufusSemasi = z
  .object({
    surum: z.literal(1),
    aciklama: z.string(),
    yil: z.number().int(),
    durum: z.string(),
    kaynak: z.string().min(1),
    lisans: z.string().min(1),
    dogrulama: z.string().min(1),
    /** İl kimliği -> il nüfusu; ilçe toplamlarının denetimi için. */
    ilToplamlari: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), nufus),
    /** İlçe kimliği (odbl/hiyerarsi.json ile aynı) -> nüfus. */
    ilceler: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), nufus),
  })
  .strict();

export type IlceNufusu = z.infer<typeof IlceNufusSemasi>;

export function ilceNufusOku(yol: string = ILCE_NUFUS_YOLU): IlceNufusu {
  const s = IlceNufusSemasi.safeParse(JSON.parse(readFileSync(yol, "utf8")) as unknown);
  if (!s.success) throw new Error(`ilce nufusu gecersiz (${yol}):\n - ${s.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n - ")}`);
  return s.data;
}

/** İlçenin nüfusu; veride yoksa undefined (fikstürde `nufus` alanı o zaman HİÇ yazılmaz: isteğe bağlı alan). */
export function ilceNufusu(kimlik: string, v: IlceNufusu = ilceNufusOku()): number | undefined {
  return Object.prototype.hasOwnProperty.call(v.ilceler, kimlik) ? v.ilceler[kimlik] : undefined;
}

export interface NufusYazimi {
  fikstur: ParselFiksturu;
  /** `nufus` alanı yazılan ilçe sayısı (veride kimliği olanlar). */
  yazilan: number;
  /** Fikstürde başka bir `nufus` değeri vardı ve veriyle değiştirildi. */
  degisen: number;
}

/**
 * Fikstürdeki ilçelere, kimliği veride olanlar için `nufus` yazar (YENİ nesne döner; girdi değişmez). Kimliği veride olmayan ilçeye
 * dokunulmaz: eski fikstürler (sentetik, mini) bit bit aynı kalır. `nufus` alanı `uygunHucre`'den hemen sonra yazılır (deterministik anahtar sırası).
 */
export function fiksturaNufusYaz(f: ParselFiksturu, v: IlceNufusu = ilceNufusOku()): NufusYazimi {
  let yazilan = 0;
  let degisen = 0;
  const ilceler = f.ilceler.map((c: ParselIlceTanimi) => {
    const n = ilceNufusu(c.id, v);
    if (n === undefined) return c;
    yazilan++;
    if (c.nufus !== undefined && c.nufus !== n) degisen++;
    const { nufus: _eski, ...geri } = c;
    const sonuc: Record<string, unknown> = {};
    for (const [k, deger] of Object.entries(geri)) {
      sonuc[k] = deger;
      if (k === "uygunHucre") sonuc["nufus"] = n;
    }
    if (!("uygunHucre" in geri)) sonuc["nufus"] = n;
    return sonuc as unknown as ParselIlceTanimi;
  });
  return { fikstur: { ...f, ilceler }, yazilan, degisen };
}

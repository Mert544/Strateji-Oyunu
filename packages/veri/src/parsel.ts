/**
 * Parsel fikstürü sözleşmesi (S9; docs/11 §7.2, §7.4, §8.3): il -> ilçe -> hücre ağacı ve bölge eşlemesi.
 *
 * Fikstür, parsel dünyasının ölçüm ve test girdisidir: mevcut bölge haritasının (mini-6, sentetik-50) her bölgesi bir
 * İL, her il bir ya da daha çok İLÇE, her ilçe z20 kare HÜCRELERDEN oluşur. Gerçek dünya karşılığı veri hattının OSM
 * il/ilçe hiyerarşisidir (packages/veri-hatti/src/osm; `kimlik` -> `id`, ilçenin `ebeveyn`i -> `il`, ilin `ebeveyn`i -> `bolge`).
 *
 * Kimlik biçimleri (OSM hattıyla hizalı): il `<ulke>_<kod>` (OSM: "tr_41"; sentetik: "sn_<bolge>"), ilçe `<il>_<ad>`
 * (OSM: "tr_41_gebze"; sentetik: "sn_<bolge>_merkez"). Hücre kimliği çekirdek taslağındaki `HucreId` ile aynıdır: "x:y",
 * Web Mercator z20 karo koordinatı (0 <= x, y < 2^20).
 *
 * `ArsaSinifi` ve `IlceSeviyesi`, packages/cekirdek/src/tipler.ts "Mülk sözleşmesi TASLAĞI (S1)" bölümündeki birliklerle
 * AYNIDIR (veri paketi çekirdeğe bağımlı olamaz; S3 çekirdeği bu tipleri buradan almaya geçirebilir).
 *
 * Bu modül dosya sistemine bağlı DEĞİLDİR (`@bolge/veri/saf` ile tarayıcıda da kullanılır).
 */
import { z } from "zod";
import { semaCalistir, type DogrulamaSonucu } from "./dogrula";
import { KIMLIK_BICIMI } from "./sema";
import type { BolgeId } from "./tipler";

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

/** z20 kare hücre kimliği: "x:y" (çekirdek taslağındaki `HucreId` ile aynı). */
export type ParselHucreId = string;

/** Arsa sınıfı; taban fiyatı ve izinli yapıları belirler (docs/11 §7.2). */
export type ArsaSinifi = "kirsal" | "kasaba" | "sehir";
export const ARSA_SINIFLARI: readonly ArsaSinifi[] = ["kirsal", "kasaba", "sehir"];

/** İlçe gelişim seviyesi: 0 Köy, 1 Kasaba, 2 Merkez, 3 Şehir (docs/11 §7.4). */
export type IlceSeviyesi = 0 | 1 | 2 | 3;

/** Satın alınamaz hücrenin nedeni (veri hattının uygunluk bitleriyle hizalı: yol tamponu, su, askeri alan; + korunan alan). */
export type HucreEngeli = "su" | "yol" | "askeri" | "koruma";
export const HUCRE_ENGELLERI: readonly HucreEngeli[] = ["su", "yol", "askeri", "koruma"];

/**
 * Kamu arsası türü (docs/12 §10, docs/06 §15.6): satılmayan hücre. Mahalle paketi (`meydan`, `pazar`, `park`), ilçe merkezi
 * (`hizmet`), kıyı şeridi (`kiyi`), hazine rezervi (`hazine`, `sanayi_rezervi`). Tür kodları veridir; çekirdek anlamı yalnız
 * "satılmaz"dır, türün kendisi tahsis/ihale kurallarına (sonraki işler) anahtar olur.
 */
export type KamuTuru = "meydan" | "pazar" | "park" | "hizmet" | "kiyi" | "sanayi_rezervi" | "hazine";
export const KAMU_TURLERI: readonly KamuTuru[] = ["meydan", "pazar", "park", "hizmet", "kiyi", "sanayi_rezervi", "hazine"];

/** z20 karo koordinatlarının üst sınırı (2^20). */
export const Z20_KENAR = 1 << 20;

export interface ParselIlTanimi {
  id: string;
  ad: string;
  /** Lojistik/pazar merkezi olan bölge (haritadaki bölge kimliği). */
  bolge: BolgeId;
}

export interface ParselHucreTanimi {
  id: ParselHucreId;
  sinif: ArsaSinifi;
  /** Satın alınabilir mi. `false` ise `engel` zorunludur; `true` ise `engel` olmaz. */
  uygun: boolean;
  engel?: HucreEngeli;
  /**
   * Kamu işareti (isteğe bağlı): hücre satılmayan kamu arsasıdır. Yalnız UYGUN hücre taşıyabilir. Fikstür bir bileşen için işaret
   * taşıyorsa (meydan/pazar/park = mahalle paketi, hizmet = ilçe merkezi, kiyi, hazine/sanayi_rezervi) çekirdek o bileşeni
   * KURALLA ÜRETMEZ; işaret geçerlidir (docs/06 §15.6).
   */
  kamu?: KamuTuru;
}

/** İlçenin mahalle (küme) tanımı: mahalle paketi her mahallenin kendi hücrelerinden ayrılır. */
export interface ParselMahalleTanimi {
  /** Dünya genelinde benzersiz kimlik (kamu sahibi `k:mahalle:<id>`). */
  id: string;
  ad: string;
  /** Mahallenin hücreleri (bu ilçeden; bir hücre en çok bir mahallede). */
  hucreler: ParselHucreId[];
}

export interface ParselIlceTanimi {
  id: string;
  ad: string;
  /** Ebeveyn il kimliği. */
  il: string;
  /** Bölge kimliği (ilin bölgesiyle AYNI olmalı; tüketicilerin il üzerinden gitmemesi için tekrarlanır). */
  bolge: BolgeId;
  /** İlçe sınıfı: ilçedeki en yüksek hücre sınıfı (ölçümde ilçe sınıflaması bundan türetilir). */
  sinif: ArsaSinifi;
  /** Başlangıç gelişim seviyesi. */
  seviye: IlceSeviyesi;
  /** = hucreler.length */
  hucreSayisi: number;
  /** = uygun hücre sayısı (çekirdekteki `IlceDurumu.uygunHucre`). */
  uygunHucre: number;
  /** İlçenin hücreleri. Bir hücre yalnız bir ilçede bulunur. */
  hucreler: ParselHucreTanimi[];
  /**
   * Mahalleler (isteğe bağlı; veri hattından). Yoksa çekirdek ilçeyi açık bir kural ("dengeli kd-bölme", `mulk.kamu.mahalleHucreHedefi`)
   * ile kümelere böler. Hücre bir mahalleye bağlı değilse mahalle paketi o hücreden çıkmaz.
   */
  mahalleler?: ParselMahalleTanimi[];
}

export interface ParselFiksturu {
  surum: 1;
  ad: string;
  /** Kaynak bölge haritasının adı (ör. "mini-6", "sentetik-50"). */
  harita: string;
  /** Üretici tohumu (elle yazılmış fikstürde 0). */
  tohum: number;
  /** Hücre karo düzeyi; v1'de yalnız 20. */
  zoom: 20;
  iller: ParselIlTanimi[];
  ilceler: ParselIlceTanimi[];
}

// ---------------------------------------------------------------------------
// Hücre kimliği
// ---------------------------------------------------------------------------

export const HUCRE_ID_BICIMI = /^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/;

/** (x, y) -> "x:y". */
export function hucreIdOlustur(x: number, y: number): ParselHucreId {
  return `${x}:${y}`;
}

/** "x:y" -> { x, y }; biçim ya da z20 aralığı dışıysa null. */
export function hucreIdAyristir(id: string): { x: number; y: number } | null {
  const m = HUCRE_ID_BICIMI.exec(id);
  if (m === null) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  if (x >= Z20_KENAR || y >= Z20_KENAR) return null;
  return { x, y };
}

// ---------------------------------------------------------------------------
// Şema (yapısal)
// ---------------------------------------------------------------------------

const tamsayi = z.number({ invalid_type_error: "sayi olmali" }).int("tamsayi olmali (ondalik sayi yasak)").safe();
const kimlik = z.string().regex(KIMLIK_BICIMI, "kimlik kucuk ASCII harf, rakam ve alt cizgiden olusmali (harfle baslar)");
const metin = z.string().min(1, "bos olamaz");
const arsaSinifi = z.enum(["kirsal", "kasaba", "sehir"]);

const hucreSema = z
  .object({
    id: z.string().regex(HUCRE_ID_BICIMI, 'hucre kimligi "x:y" biciminde olmali'),
    sinif: arsaSinifi,
    uygun: z.boolean(),
    engel: z.enum(["su", "yol", "askeri", "koruma"]).optional(),
    kamu: z.enum(["meydan", "pazar", "park", "hizmet", "kiyi", "sanayi_rezervi", "hazine"]).optional(),
  })
  .strict();

const mahalleSema = z
  .object({
    id: kimlik,
    ad: metin,
    hucreler: z.array(z.string().regex(HUCRE_ID_BICIMI, 'hucre kimligi "x:y" biciminde olmali')).min(1, "mahallede en az 1 hucre olmali"),
  })
  .strict();

const ilSema = z.object({ id: kimlik, ad: metin, bolge: kimlik }).strict();

const ilceSema = z
  .object({
    id: kimlik,
    ad: metin,
    il: kimlik,
    bolge: kimlik,
    sinif: arsaSinifi,
    seviye: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    hucreSayisi: tamsayi.nonnegative(),
    uygunHucre: tamsayi.nonnegative(),
    hucreler: z.array(hucreSema).min(1, "ilcede en az 1 hucre olmali"),
    mahalleler: z.array(mahalleSema).optional(),
  })
  .strict();

export const ParselFiksturuSema = z
  .object({
    surum: z.literal(1),
    ad: metin,
    harita: metin,
    tohum: tamsayi.nonnegative(),
    zoom: z.literal(20),
    iller: z.array(ilSema).min(1, "en az 1 il olmali"),
    ilceler: z.array(ilceSema).min(1, "en az 1 ilce olmali"),
  })
  .strict();

// Şema çıktısı sözleşme tipiyle uyumlu olmalı (derleme anında denetlenir).
type _SemaUyumu = z.infer<typeof ParselFiksturuSema> extends ParselFiksturu ? true : never;
export const PARSEL_SEMA_UYUMU: _SemaUyumu = true;

// ---------------------------------------------------------------------------
// Doğrulama (şema + anlamsal)
// ---------------------------------------------------------------------------

export interface ParselDogrulamaSecenekleri {
  /**
   * Bölge haritası (yalnız bölge kimlikleri okunur). Verilirse her ilin bölgesi haritada olmalı ve (aşağıdaki seçenek
   * kapatılmadıkça) haritanın her bölgesine en az bir il düşmeli.
   */
  harita?: { bolgeler: ReadonlyArray<{ id: string }> };
  /** Haritanın her bölgesi en az bir ille kapsanmalı mı (vars. true; yalnız `harita` verilince). */
  tumBolgelerKapsanmali?: boolean;
}

/**
 * Parsel fikstürünü doğrular; ATMAZ. Kontroller:
 * - şema (strict, tamsayı, kimlik ve "x:y" biçimi);
 * - il, ilçe ve hücre kimlikleri benzersiz; bir hücre yalnız BİR ilçede (iki ilçede görünen hücre ayrıca adlandırılır);
 * - hücre koordinatı z20 aralığında;
 * - ilçe -> il var; ilçenin bölgesi ilin bölgesiyle aynı; her ilin en az bir ilçesi var;
 * - il -> bölge haritada var; haritanın her bölgesine en az bir il (seçenekle);
 * - `hucreSayisi` ve `uygunHucre` sayımları hücrelerle tutarlı; `uygun: false` <=> `engel` var;
 * - ilçe sınıfı = ilçedeki en yüksek hücre sınıfı.
 */
export function dogrulaParselFiksturu(ham: unknown, secenek: ParselDogrulamaSecenekleri = {}): DogrulamaSonucu {
  const s = semaCalistir(ParselFiksturuSema, ham);
  if (!s.tamam) return { gecerli: false, hatalar: s.hatalar };
  const f: ParselFiksturu = s.veri;
  const hatalar: string[] = [];

  const ilBolge = new Map<string, string>();
  for (const il of f.iller) {
    if (ilBolge.has(il.id)) hatalar.push(`iller: yinelenen kimlik "${il.id}"`);
    ilBolge.set(il.id, il.bolge);
  }

  const ilceKimlikleri = new Set<string>();
  const ilceSayisi = new Map<string, number>();
  /** hücre kimliği -> ilk görüldüğü ilçe */
  const hucreIlcesi = new Map<string, string>();
  /** mahalle kimlikleri dünya genelinde benzersizdir (kamu sahibi `k:mahalle:<id>`). */
  const mahalleKimlikleri = new Set<string>();
  const sinifSirasi: Record<ArsaSinifi, number> = { kirsal: 0, kasaba: 1, sehir: 2 };
  for (const [i, c] of f.ilceler.entries()) {
    const yer = `ilceler[${i}] (${c.id})`;
    if (ilceKimlikleri.has(c.id)) hatalar.push(`ilceler: yinelenen kimlik "${c.id}"`);
    ilceKimlikleri.add(c.id);
    const ilinBolgesi = ilBolge.get(c.il);
    if (ilinBolgesi === undefined) hatalar.push(`${yer}: bilinmeyen il "${c.il}"`);
    else {
      ilceSayisi.set(c.il, (ilceSayisi.get(c.il) ?? 0) + 1);
      if (ilinBolgesi !== c.bolge) hatalar.push(`${yer}: bolge "${c.bolge}" ilin bolgesiyle ("${ilinBolgesi}") ayni degil`);
    }
    if (c.hucreSayisi !== c.hucreler.length) hatalar.push(`${yer}: hucreSayisi ${c.hucreSayisi}, hucre listesi ${c.hucreler.length}`);
    let uygun = 0;
    let enYuksek = -1;
    for (const h of c.hucreler) {
      const onceki = hucreIlcesi.get(h.id);
      if (onceki === undefined) hucreIlcesi.set(h.id, c.id);
      else if (onceki === c.id) hatalar.push(`${yer}: yinelenen hucre "${h.id}"`);
      else hatalar.push(`hucre "${h.id}" birden cok ilcede: "${onceki}" ve "${c.id}"`);
      if (hucreIdAyristir(h.id) === null) hatalar.push(`${yer}: hucre "${h.id}" z20 araliginin (0..${Z20_KENAR - 1}) disinda`);
      if (h.uygun) {
        uygun++;
        if (h.engel !== undefined) hatalar.push(`${yer}: uygun hucre "${h.id}" engel tasiyamaz ("${h.engel}")`);
      } else if (h.engel === undefined) hatalar.push(`${yer}: uygun olmayan hucre "${h.id}" icin engel nedeni zorunlu`);
      if (h.kamu !== undefined && !h.uygun) hatalar.push(`${yer}: kamu isaretli hucre "${h.id}" uygun olmali (kamu arsasi uygun hucrelerden ayrilir)`);
      enYuksek = Math.max(enYuksek, sinifSirasi[h.sinif]);
    }
    if (c.uygunHucre !== uygun) hatalar.push(`${yer}: uygunHucre ${c.uygunHucre}, sayilan ${uygun}`);
    const ilceHucreleri = new Set(c.hucreler.map((h) => h.id));
    const mahalleHucresi = new Set<string>();
    for (const mh of c.mahalleler ?? []) {
      if (mahalleKimlikleri.has(mh.id)) hatalar.push(`${yer}: yinelenen mahalle kimligi "${mh.id}"`);
      mahalleKimlikleri.add(mh.id);
      for (const hid of mh.hucreler) {
        if (!ilceHucreleri.has(hid)) hatalar.push(`${yer}: mahalle "${mh.id}" ilcede olmayan hucre iceriyor: "${hid}"`);
        else if (mahalleHucresi.has(hid)) hatalar.push(`${yer}: hucre "${hid}" birden cok mahallede`);
        mahalleHucresi.add(hid);
      }
    }
    if (enYuksek !== sinifSirasi[c.sinif]) hatalar.push(`${yer}: ilce sinifi "${c.sinif}" en yuksek hucre sinifiyla (${ARSA_SINIFLARI[enYuksek] ?? "-"}) ayni degil`);
  }
  for (const il of f.iller) if ((ilceSayisi.get(il.id) ?? 0) === 0) hatalar.push(`il "${il.id}": hic ilcesi yok`);

  if (secenek.harita !== undefined) {
    const bolgeler = new Set(secenek.harita.bolgeler.map((b) => b.id));
    for (const il of f.iller) if (!bolgeler.has(il.bolge)) hatalar.push(`il "${il.id}": haritada olmayan bolge "${il.bolge}"`);
    if (secenek.tumBolgelerKapsanmali !== false) {
      const kapsanan = new Set(f.iller.map((il) => il.bolge));
      for (const b of secenek.harita.bolgeler) if (!kapsanan.has(b.id)) hatalar.push(`bolge "${b.id}": hic ili yok`);
    }
  }
  return hatalar.length === 0 ? { gecerli: true } : { gecerli: false, hatalar };
}

// ---------------------------------------------------------------------------
// Özet ve dizinler
// ---------------------------------------------------------------------------

export interface ParselFiksturOzeti {
  il: number;
  ilce: number;
  hucre: number;
  uygunHucre: number;
  /** Hücre sınıfı -> hücre sayısı (tüm hücreler). */
  hucreSinifi: Record<ArsaSinifi, number>;
  /** İlçe sınıfı -> ilçe sayısı. */
  ilceSinifi: Record<ArsaSinifi, number>;
  /** Engel -> hücre sayısı. */
  engel: Record<HucreEngeli, number>;
}

/** Fikstürün sayım özeti (rapor ve testler için). */
export function parselFiksturOzeti(f: ParselFiksturu): ParselFiksturOzeti {
  const o: ParselFiksturOzeti = {
    il: f.iller.length,
    ilce: f.ilceler.length,
    hucre: 0,
    uygunHucre: 0,
    hucreSinifi: { kirsal: 0, kasaba: 0, sehir: 0 },
    ilceSinifi: { kirsal: 0, kasaba: 0, sehir: 0 },
    engel: { su: 0, yol: 0, askeri: 0, koruma: 0 },
  };
  for (const c of f.ilceler) {
    o.ilceSinifi[c.sinif]++;
    for (const h of c.hucreler) {
      o.hucre++;
      o.hucreSinifi[h.sinif]++;
      if (h.uygun) o.uygunHucre++;
      else if (h.engel !== undefined) o.engel[h.engel]++;
    }
  }
  return o;
}

/** Hücre kimliği -> { ilçe, hücre } dizini (ölçüm ve sahte bağdaştırıcılar için). */
export function parselHucreDizini(f: ParselFiksturu): Map<ParselHucreId, { ilce: ParselIlceTanimi; hucre: ParselHucreTanimi }> {
  const d = new Map<ParselHucreId, { ilce: ParselIlceTanimi; hucre: ParselHucreTanimi }>();
  for (const c of f.ilceler) for (const h of c.hucreler) d.set(h.id, { ilce: c, hucre: h });
  return d;
}

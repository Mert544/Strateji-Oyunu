/**
 * Yurt önce (B2; saf: DOM ve harita yok): taze oyuncunun varışta yurdunda (bedava, kendi boş hücreleri) tek tıkla ilk yapısını kurması.
 * Yurt = oyuncunun bu ilçedeki, tesis ve inşaat taşımayan hücreleri. İlk yapı yurda sığıyorsa arsa parası ödenmez (`yapi_yerlestir`
 * kendi hücresini kabul eder); sığmıyorsa yanındaki arsayı alarak genişletmek ikincil eylemdir.
 */
import type { HucreId, OyuncuId } from "@bolge/cekirdek";
import type { IlceSahipligi } from "./baglanti";
import { idCoz } from "./hucre";
import { yerlesimPlani } from "./yapi";
import type { YapiTanimi, YerlesimBaglami, YerlesimPlani } from "./yapi";

/** Varış kartı metinleri (Tasarım lideri; sade Türkçe, büyük harfsiz). */
export const YURT_METIN = {
  baslik: "Yurdun hazır",
  aciklama: (n: number): string => `Yurdun ${n} hücre ve ücretsiz. İlk yapın buraya sığar.`,
  aciklamaYapi: (yapi: string, k: number, b: number): string => `${yapi} ${k} hücre ister; yurdunda ${b} boş hücre var.`,
  birincil: "Yurdunda kur",
  birincilNot: "ücretsiz",
  ikincil: "Arsa satın al",
  genislet: "Genişlet: yanındaki arsayı al",
  yerYok: "Yurdunda bu yapıya yer yok. Yanındaki arsayı alarak genişletebilirsin.",
  sigmiyor: (yapi: string, k: number, b: number): string => `${yapi} ${k} hücre ister, yurdunda ${b} boş hücre kaldı.`,
} as const;

/** Oyuncunun ilçedeki BOŞ (tesis, inşaat ve yapı taşımayan) hücreleri: yurt; kimliğe göre sıralı. */
export function yurtBosHucreler(s: IlceSahipligi | null, ben: OyuncuId): HucreId[] {
  if (!s) return [];
  const yapili = new Set<HucreId>();
  for (const y of s.yapilar ?? []) for (const id of y.hucreler) yapili.add(id);
  const l: HucreId[] = [];
  for (const [id, h] of s.hucreler) if (h.sahip === ben && h.tesis === undefined && h.insaat === undefined && !yapili.has(id)) l.push(id);
  return l.sort();
}

export interface YurtPlani {
  /** Yurda sığan yerleşim planı (arsa gerekmez); sığmıyorsa tanımsız. */
  plan?: YerlesimPlani;
  /** Planın çapa hücresi ve dönüşü (`yerlesimPlani` argümanları). */
  cx?: number;
  cy?: number;
  donus?: number;
  /** Yurdun boş hücre sayısı. */
  bos: number;
  /** Plan yoksa okunur neden (Tasarım metni); plan geçersizse plan.neden'dedir. */
  neden?: string;
}

/**
 * İlk yapının yurda yerleşimi: boş hücrelerin her biri çapa, iki dönüş (yatay ve dikey); yalnız kendi boş hücrelerinden oluşan ve
 * geçerli ilk plan (kimlik sırası; deterministik). Geçerli plan yoksa ama şekil sığıyorsa o plan (nedeniyle) döner.
 */
export function yurtPlani(yapi: YapiTanimi, b: YerlesimBaglami): YurtPlani {
  const bos = yurtBosHucreler(b.sahiplik, b.ben);
  if (bos.length < yapi.yuva) return { bos: bos.length, neden: YURT_METIN.sigmiyor(yapi.ad, yapi.yuva, bos.length) };
  let sigan: YurtPlani | null = null;
  for (const id of bos) {
    const c = idCoz(id);
    if (!c) continue;
    for (const donus of [0, 1]) {
      const p = yerlesimPlani(yapi, c.x, c.y, donus, b);
      // yalnız kendi boş hücreleri: arsa alınmaz
      if (p.alinacak.length > 0 || !p.hucreler.every((h) => h.benim)) continue;
      const y: YurtPlani = { plan: p, cx: c.x, cy: c.y, donus, bos: bos.length };
      if (p.gecerli) return y;
      sigan ??= y;
    }
  }
  return sigan ?? { bos: bos.length, neden: YURT_METIN.yerYok };
}

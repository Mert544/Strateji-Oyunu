/**
 * Sayfanın yanına kopyalanacak harita verisi dosyaları (saf; `derle.ts` ve test kullanır). Yollar `packages/veri/haritalar/odbl/`
 * köküne göredir. Arsa ızgarası dosyaları (BHI1 ve şerit katmanı) elle değil, veri hattının ürettiği manifestten gelir
 * (`odbl/izgara/manifest.json`; sunucu ve istemci aynı kaydı okur).
 */
export interface IzgaraManifesti {
  ilceler: ReadonlyArray<{ kimlik: string; bhi: { yol: string }; seritler: { yol: string } }>;
}

/** Sabit dosyalar (sınırlar, hiyerarşi, örnek lisansı) ve manifestteki her ilçenin BHI1 + şerit dosyaları (yinelenenler tek). */
export function haritaVerisiDosyalari(m: IzgaraManifesti): string[] {
  const l = ["hiyerarsi.json", "iller.topo.json", "ilceler", "ornek/LISANS.txt", "izgara/manifest.json", "izgara/LISANS.txt", ...m.ilceler.flatMap((i) => [i.bhi.yol, i.seritler.yol])];
  return [...new Set(l)];
}

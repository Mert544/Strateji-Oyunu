/**
 * `harita-iklim*.test.ts` dosyalarının ortak yardımcıları (test dosyası değildir). Uzun dosya iki-üç dosyaya bölündü ki kapıdaki vitest
 * dosyaları paralel işçilere dağıtabilsin; test içeriği ve adları değişmedi.
 */
import { expect } from "vitest";
import type { HipotezSonucu } from "../src";

/** Duvar saati alanlarını (sureMs) çıkararak serileştirir. */
export function kararli(x: unknown): string {
  return JSON.stringify(x, (k, v) => (k === "sureMs" ? undefined : v));
}

export function semaDogru(h: HipotezSonucu, kimlik: string, tohumSayisi: number): void {
  expect(h.kimlik).toBe(kimlik);
  expect(typeof h.hipotez).toBe("string");
  expect(["gecti", "kaldi", "belirsiz"]).toContain(h.verdict);
  expect(h.tohumBasina).toHaveLength(tohumSayisi);
  for (const t of h.tohumBasina) {
    expect(["gecti", "kaldi", "belirsiz"]).toContain(t.verdict);
    expect(t.durumOzeti).toMatch(/^[0-9a-f]{16}$/);
  }
  expect(h.olcum.ad.length).toBeGreaterThan(0);
  expect(h.esik.aciklama.length).toBeGreaterThan(0);
  expect(h.tohumBasariOrani).toBeGreaterThanOrEqual(0);
  expect(h.tohumBasariOrani).toBeLessThanOrEqual(1);
  expect(() => JSON.parse(JSON.stringify(h))).not.toThrow();
}

/** Parametreler bloğundaki harita ve iklim özeti beklenen gibi mi. */

export function baglamDogru(h: HipotezSonucu, harita: string, bolge: number, iklim: string, gunCarpani: number): void {
  const p = h.parametreler as Record<string, unknown> & { iklim: Record<string, unknown> };
  expect(p["harita"]).toBe(harita);
  expect(p["haritaBolgeSayisi"]).toBe(bolge);
  expect(p["haritaDevletSayisi"]).toBe(4);
  expect(p.iklim["secenek"]).toBe(iklim);
  expect(p.iklim["etkin"]).toBe(true);
  expect(p.iklim["gunCarpani"]).toBe(gunCarpani);
}

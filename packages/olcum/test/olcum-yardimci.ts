/**
 * `olcum*.test.ts` dosyalarının ortak yardımcıları (test dosyası değildir). Uzun dosya dört dosyaya bölündü ki kapıdaki vitest dosyaları
 * paralel işçilere dağıtabilsin; test içeriği ve adları değişmedi. `kisaSonuclar`, rapor testlerinin ihtiyaç duyduğu altı kısa hipotez sonucunu
 * (H1 v0.2, H2, H3, H5, H6, H7; tohum 1) eskiden aynı dosyadaki H testlerinin biriktirdiği sırayla üretir (koşular deterministiktir).
 */
import { expect } from "vitest";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { h1Kos, h2Kos, h3Kos, h5Kos, h6Kos, h7Kos } from "../src";
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
    expect(typeof t.tohum).toBe("number");
  }
  expect(h.olcum.ad.length).toBeGreaterThan(0);
  expect(h.esik.aciklama.length).toBeGreaterThan(0);
  expect(h.tohumBasariOrani).toBeGreaterThanOrEqual(0);
  expect(h.tohumBasariOrani).toBeLessThanOrEqual(1);
  expect(typeof h.sureMs).toBe("number");
  // JSON'a serileştirilebilir ve geri okunabilir
  expect(() => JSON.parse(JSON.stringify(h))).not.toThrow();
}

/** Rapor testleri için altı kısa hipotez sonucu (sıra: H1, H2, H3, H5, H6, H7). */
export function kisaSonuclar(): HipotezSonucu[] {
  const tohumlar = [1];
  const veri = varsayilanVeriyiYukle();
  return [h1Kos({ tohumlar, kisa: true, veri }), h2Kos({ tohumlar, kisa: true }), h3Kos({ tohumlar, kisa: true }), h5Kos({ tohumlar, kisa: true }), h6Kos({ tohumlar, kisa: true }), h7Kos({ tohumlar, kisa: true })];
}

/**
 * G7-1a (A3 §6.5, V9b): ilçe başına isteğe bağlı `nufus` alanı (fikstür `ParselIlceTanimi.nufus?` ve ızgara `ParselIzgaraIlce.nufus?`): tamsayı 1..20 000 000.
 * Alan yokken davranış bugünküyle aynıdır (hiçbir JSON değişmedi).
 */
import { describe, expect, it } from "vitest";
import { ILCE_NUFUS_ENCOK, dogrulaParselFiksturu, parselFiksturuYukle, parselIzgaraHatalari } from "../src/index";
import type { ParselIzgaraGirdisi } from "../src/index";

function fikstur(nufus: unknown): string {
  const f = parselFiksturuYukle("mini-6");
  if (nufus !== undefined) (f.ilceler[0] as unknown as { nufus: unknown }).nufus = nufus;
  const r = dogrulaParselFiksturu(f);
  return r.gecerli ? "" : r.hatalar.join("\n");
}

function izgara(nufus: unknown): string[] {
  const g: ParselIzgaraGirdisi = {
    ad: "t",
    harita: "mini-6",
    tohum: 0,
    iller: [{ id: "i1", ad: "I1", bolge: "b1" }],
    ilceler: [{ id: "c1", ad: "C1", il: "i1", bolge: "b1", izgara: { x0: 10, y0: 10, genislik: 2, yukseklik: 2, durum: new Uint8Array([1, 1, 1, 1]) } }],
  };
  if (nufus !== undefined) (g.ilceler[0] as unknown as { nufus: unknown }).nufus = nufus;
  return parselIzgaraHatalari(g);
}

describe("V9b: ilçe nüfusu (fikstür)", () => {
  it("yok: geçerli (bugünkü fikstürler); 1, 20 000 000 ve ortadaki değer geçerli", () => {
    expect(fikstur(undefined)).toBe("");
    for (const n of [1, 150_000, ILCE_NUFUS_ENCOK]) expect(fikstur(n), String(n)).toBe("");
  });
  it("0, negatif, 20 000 001, ondalık, metin reddedilir", () => {
    expect(fikstur(0)).toContain("nufus en az 1 olmali");
    expect(fikstur(-5)).toContain("nufus en az 1 olmali");
    expect(fikstur(ILCE_NUFUS_ENCOK + 1)).toContain("nufus en fazla 20000000 olabilir");
    expect(fikstur(1.5)).toContain("tamsayi");
    expect(fikstur("100")).not.toBe("");
  });
});

describe("V9b: ilçe nüfusu (ızgara girdisi)", () => {
  it("yok ya da sınırlar içinde: hata yok; sınır dışı ve tamsayı olmayan hata", () => {
    expect(izgara(undefined)).toEqual([]);
    expect(izgara(1)).toEqual([]);
    expect(izgara(ILCE_NUFUS_ENCOK)).toEqual([]);
    for (const n of [0, ILCE_NUFUS_ENCOK + 1, 2.5, -1]) expect(izgara(n).join("\n"), String(n)).toContain("nufus 1 ile 20000000 arasinda tamsayi olmali");
  });
});

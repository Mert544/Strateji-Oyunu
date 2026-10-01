/**
 * Harita görünürlük kararları (G1; saf): il ve küre düzeyinde yapı dolgusu ile etiketi çizilmez; "Geri al" şeridi yalnız
 * işlemin ilçesinde ve ilçe/arsa düzeyinde görünür, süre dolunca hiç görünmez.
 */
import { describe, expect, it } from "vitest";
import { geriSeridiGorunur, yapiCizimi } from "../src/harita/gorunurluk";

const GEBZE = "tr_41_gebze";
const IZMIT = "tr_41_izmit";
const DK = 60_000;

describe("yapiCizimi: düzeye göre yapı dolgusu ve etiketi", () => {
  it("il düzeyinde (ilçe seçili değil) ne dolgu ne etiket çizilir; ilçe adına binmez", () => {
    expect(yapiCizimi(null, 1)).toEqual({ dolgu: false, etiket: false });
    expect(yapiCizimi(null, 2)).toEqual({ dolgu: false, etiket: false });
    expect(yapiCizimi(null, 3)).toEqual({ dolgu: false, etiket: false });
  });

  it("küre düzeyinde (0) ilçe seçili görünse bile çizilmez", () => {
    expect(yapiCizimi(GEBZE, 0)).toEqual({ dolgu: false, etiket: false });
    expect(yapiCizimi(null, 0)).toEqual({ dolgu: false, etiket: false });
  });

  it("ilçe düzeyinde yalnız dolgu, arsa düzeyinde dolgu ve etiket çizilir", () => {
    expect(yapiCizimi(GEBZE, 2)).toEqual({ dolgu: true, etiket: false });
    expect(yapiCizimi(GEBZE, 3)).toEqual({ dolgu: true, etiket: true });
  });

  it("ilçeye dönünce yeniden çizilir (karar yalnız ilçe ve düzeye bağlı, durum tutmaz)", () => {
    const il = yapiCizimi(null, 1);
    const donus = yapiCizimi(GEBZE, 3);
    expect(il.dolgu || il.etiket).toBe(false);
    expect(donus).toEqual({ dolgu: true, etiket: true });
  });
});

describe("geriSeridiGorunur: 5 dakikalık geri al şeridi", () => {
  it("işlemin ilçesinde, ilçe ya da arsa düzeyinde ve süre varken görünür", () => {
    expect(geriSeridiGorunur(2, GEBZE, GEBZE, 5 * DK)).toBe(true);
    expect(geriSeridiGorunur(3, GEBZE, GEBZE, 1)).toBe(true);
  });

  it("küre ve il düzeyinde gizli", () => {
    expect(geriSeridiGorunur(0, GEBZE, GEBZE, 4 * DK)).toBe(false);
    expect(geriSeridiGorunur(1, null, GEBZE, 4 * DK)).toBe(false);
    // il düzeyinde ilçe seçili olmasa da (null) gizli; bir ilçe adı kalsa bile düzey 1 gizler
    expect(geriSeridiGorunur(1, GEBZE, GEBZE, 4 * DK)).toBe(false);
  });

  it("başka ilçede gizli", () => {
    expect(geriSeridiGorunur(2, IZMIT, GEBZE, 4 * DK)).toBe(false);
    expect(geriSeridiGorunur(3, IZMIT, GEBZE, 4 * DK)).toBe(false);
  });

  it("süre dolunca hiçbir yerde görünmez", () => {
    expect(geriSeridiGorunur(3, GEBZE, GEBZE, 0)).toBe(false);
    expect(geriSeridiGorunur(3, GEBZE, GEBZE, -1)).toBe(false);
  });

  it("sıra: ilçeden il'e çık (gizli, sayaç sürer), 5 dk dolmadan dön (yeniden görünür), süre dolunca kapanır", () => {
    const bitis = 5 * DK;
    const goster = (simdi: number, duzey: number, ilce: string | null): boolean => geriSeridiGorunur(duzey, ilce, GEBZE, bitis - simdi);
    expect(goster(0, 3, GEBZE)).toBe(true);
    expect(goster(30_000, 1, null)).toBe(false);
    expect(goster(60_000, 0, null)).toBe(false);
    expect(goster(120_000, 2, IZMIT)).toBe(false);
    expect(goster(180_000, 2, GEBZE)).toBe(true);
    expect(goster(bitis, 3, GEBZE)).toBe(false);
  });
});

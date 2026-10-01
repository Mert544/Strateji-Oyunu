/** İlçe sözlüğü: kimlikler hiyerarşide, metinler kısa ve büyük harfsiz, seçiciler dükkân düzeyine göre, nüfus biçimi. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { acilisMetni, bilinenYaniSatiri, ILCE_METIN, ILCE_ORTAK, ilceMetni, ilceNedeni, nufusMetni } from "../src/tasarim/ilce-metin";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "veri", "haritalar", "odbl");
interface Il { ilceler?: Array<{ kimlik: string }> }
interface Hiy { bolgeler: Array<{ iller: Il[] }> }
const hiy = JSON.parse(readFileSync(join(KOK, "hiyerarsi.json"), "utf8")) as Hiy;
const ilceKimlikleri = new Set(hiy.bolgeler.flatMap((b) => b.iller.flatMap((i) => (i.ilceler ?? []).map((x) => x.kimlik))));

describe("ilçe sözlüğü", () => {
  it("45 ilçe; kimlikler hiyerarşide; öneri geçerli", () => {
    expect(Object.keys(ILCE_METIN)).toHaveLength(45);
    for (const [k, m] of Object.entries(ILCE_METIN)) {
      expect(ilceKimlikleri.has(k), k).toBe(true);
      expect(["tarim", "sanayi", "pazar"], k).toContain(m.oneri);
    }
  });

  it("metinler kısa, noktayla biter, büyük harfli sözcük ve tutar yok; bilinen yanı boş değil ya da null", () => {
    const tum: string[] = [...Object.values(ILCE_ORTAK.acilis), ...Object.values(ILCE_ORTAK.acilisG7), ...Object.values(ILCE_ORTAK.acilisG8)];
    for (const m of Object.values(ILCE_METIN)) tum.push(m.neden, m.nedenG7);
    for (const t of tum) {
      expect(t.length, t).toBeLessThanOrEqual(120);
      expect(t, t).toMatch(/[.!?]$/);
      expect(t, t).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,}\b/);
      expect(t, t).not.toMatch(/₺\s*\d|\d\s*₺/);
    }
    for (const [k, m] of Object.entries(ILCE_METIN)) if (m.bilinenYani !== null) expect(m.bilinenYani.trim().length, k).toBeGreaterThan(0);
  });

  it("seçiciler: neden G7 açıkken nedenG7; açılış G8 > G7 > temel; bilinen yanı null ise satır yok", () => {
    const m = ilceMetni("tr_41_basiskele")!;
    expect(ilceNedeni("tr_41_basiskele")).toBe(m.neden);
    expect(ilceNedeni("tr_41_basiskele", { g7: true })).toBe(m.nedenG7);
    expect(ilceNedeni("yok_boyle_ilce")).toBeUndefined();
    expect(acilisMetni("pazar")).toBe(ILCE_ORTAK.acilis.pazar);
    expect(acilisMetni("pazar", { g7: true })).toBe(ILCE_ORTAK.acilisG7.pazar);
    expect(acilisMetni("sanayi", { g7: true })).toBe(ILCE_ORTAK.acilis.sanayi); // acilisG7'de sanayi yok
    expect(acilisMetni("sanayi", { g7: true, g8: true })).toBe(ILCE_ORTAK.acilisG8.sanayi);
    expect(acilisMetni("tarim", { g8: true })).toBe(ILCE_ORTAK.acilis.tarim);
    expect(bilinenYaniSatiri("tr_41_basiskele")).toBeNull();
    expect(bilinenYaniSatiri("tr_41_cayirova")).toEqual({ etiket: "Bilinen yanı", deger: "Otomotiv" });
  });

  it("nüfus biçimi: 1.000 altı tam sayı, binlerde '415 bin', milyonda ondalık; yoksa null", () => {
    expect(nufusMetni(850)).toBe("850");
    expect(nufusMetni(999)).toBe("999");
    expect(nufusMetni(1000)).toBe("1 bin");
    expect(nufusMetni(415_300)).toBe("415 bin");
    expect(nufusMetni(415_600)).toBe("416 bin");
    expect(nufusMetni(1_234_000)).toBe("1,2 milyon");
    expect(nufusMetni(999_499)).toBe("999 bin");
    expect(nufusMetni(999_500)).toBe("1 milyon");
    expect(nufusMetni(999_600)).toBe("1 milyon");
    expect(nufusMetni(999.6)).toBe("1 bin");
    expect(nufusMetni(1_000_000)).toBe("1 milyon");
    expect(nufusMetni(undefined)).toBeNull();
    expect(nufusMetni(null)).toBeNull();
    expect(nufusMetni(Number.NaN)).toBeNull();
  });
});

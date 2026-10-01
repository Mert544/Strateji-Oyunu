/**
 * İlçe başına isteğe bağlı `nufus` alanı (A3 sartname §6.5, V9b): `ParselIlceTanimi.nufus?`, tamsayı 1..20 000 000. Alan yokken fikstür bit bit eskisi gibidir.
 */
import { describe, expect, it } from "vitest";
import { ILCE_NUFUS_ENCOK, ParselFiksturuSema, dogrulaParselFiksturu, parselFiksturuYukle } from "../src/index";

function dogrula(nufus: unknown): string {
  const f = parselFiksturuYukle("mini-6");
  if (nufus !== undefined) (f.ilceler[0] as unknown as { nufus: unknown }).nufus = nufus;
  const r = dogrulaParselFiksturu(f);
  return r.gecerli ? "" : r.hatalar.join("\n");
}

describe("ParselIlceTanimi.nufus? (V9b)", () => {
  it("alansız fikstür geçerli ve alan hiçbir ilçede yok (mevcut fikstürler değişmedi)", () => {
    expect(dogrula(undefined)).toBe("");
    for (const ad of ["mini-6", "sentetik-50"]) for (const c of parselFiksturuYukle(ad).ilceler) expect("nufus" in c).toBe(false);
  });

  it("alanlı fikstür geçerli: 1, ortada bir değer, 20 000 000; ayrıştırma alanı korur", () => {
    for (const n of [1, 150_000, ILCE_NUFUS_ENCOK]) expect(dogrula(n), String(n)).toBe("");
    const f = parselFiksturuYukle("mini-6");
    (f.ilceler[0] as { nufus?: number }).nufus = 150_000;
    expect(ParselFiksturuSema.parse(f).ilceler[0]!.nufus).toBe(150_000);
  });

  it("0, -1, 1.5, 20 000 001 ve metin reddedilir", () => {
    expect(dogrula(0)).toContain("nufus en az 1 olmali");
    expect(dogrula(-1)).toContain("nufus en az 1 olmali");
    expect(dogrula(1.5)).toContain("tamsayi");
    expect(dogrula(ILCE_NUFUS_ENCOK + 1)).toContain("nufus en fazla 20000000 olabilir");
    expect(dogrula("100")).not.toBe("");
  });
});

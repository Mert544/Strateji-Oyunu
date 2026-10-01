/**
 * İlçe nüfusu girdisi (G7): şema, V9b sınırları, hiyerarşi ile 45/45 eşleşme, il toplamları, kanonik biçim.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ILCE_NUFUS_ENCOK, dogrulaParselFiksturu, miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { ILCE_NUFUS_YOLU, IlceNufusSemasi, NUFUS_EN_AZ, NUFUS_EN_COK, fiksturaNufusYaz, ilceNufusOku, ilceNufusu } from "../src/osm/ilce-nufus";
import { ODBL_DIZINI } from "../src/osm/ortak";

const v = ilceNufusOku();
const hiyerarsi = JSON.parse(readFileSync(resolve(ODBL_DIZINI, "hiyerarsi.json"), "utf8")) as unknown;

function ilceKimlikleri(o: unknown, cikti: Map<string, string> = new Map()): Map<string, string> {
  if (Array.isArray(o)) for (const x of o) ilceKimlikleri(x, cikti);
  else if (o !== null && typeof o === "object") {
    const r = o as Record<string, unknown>;
    if (typeof r["kimlik"] === "string" && typeof r["osm"] === "number" && typeof r["ebeveyn"] === "string") cikti.set(r["kimlik"], r["ebeveyn"]);
    for (const x of Object.values(r)) ilceKimlikleri(x, cikti);
  }
  return cikti;
}
const birimler = ilceKimlikleri(hiyerarsi);

describe("ilce nufusu girdisi", () => {
  it("2025, TUIK ADNKS kaynagi ve lisans notu yazili; yil sabit", () => {
    expect(v.yil).toBe(2025);
    expect(v.kaynak).toBe("TÜİK, ADNKS Sonuçları, 2025 (9 Şubat 2026)");
    expect(v.lisans).toMatch(/Yasal Uyarı/);
    expect(v.dogrulama).toMatch(/doğrulanmadı/);
  });

  it("45 ilce, hepsi hiyerarsi.json'da ve Kocaeli, Sakarya, Bursa'ya ait; o illerin her ilcesi var", () => {
    const kimlikler = Object.keys(v.ilceler);
    expect(kimlikler).toHaveLength(45);
    for (const k of kimlikler) {
      expect(birimler.has(k), k).toBe(true);
      expect(["tr_41", "tr_54", "tr_16"], k).toContain(birimler.get(k));
    }
    const ilceSayisi = (il: string): number => [...birimler.entries()].filter(([k, e]) => e === il && k.startsWith(`${il}_`)).length;
    expect(ilceSayisi("tr_41") + ilceSayisi("tr_54") + ilceSayisi("tr_16")).toBe(45);
  });

  it("her deger tamsayi ve V9b sinirinda (1..20.000.000)", () => {
    for (const [k, n] of Object.entries(v.ilceler)) {
      expect(Number.isInteger(n), k).toBe(true);
      expect(n, k).toBeGreaterThanOrEqual(NUFUS_EN_AZ);
      expect(n, k).toBeLessThanOrEqual(NUFUS_EN_COK);
    }
  });

  it("ilce toplamlari il toplamlariyla birebir uyumlu", () => {
    const toplam: Record<string, number> = {};
    for (const [k, n] of Object.entries(v.ilceler)) {
      const il = [...Object.keys(v.ilToplamlari)].find((i) => k.startsWith(`${i}_`));
      expect(il, k).toBeDefined();
      toplam[il as string] = (toplam[il as string] ?? 0) + n;
    }
    expect(toplam).toEqual(v.ilToplamlari);
    expect(v.ilToplamlari).toEqual({ tr_16: 3_263_011, tr_41: 2_161_171, tr_54: 1_123_693 });
  });

  it("ilceNufusu: bilinen ilce, bilinmeyen ilce (undefined: fiksturde alan yazilmaz)", () => {
    expect(ilceNufusu("tr_41_gebze", v)).toBe(414_960);
    expect(ilceNufusu("tr_16_gemlik", v)).toBe(124_400);
    expect(ilceNufusu("tr_41_korfez", v)).toBe(183_077);
    expect(ilceNufusu("tr_34_kadikoy", v)).toBeUndefined();
    expect(ilceNufusu("__proto__", v)).toBeUndefined();
  });

  it("bozuk girdi sema tarafindan reddedilir (ondalik, sinir disi, sifir, fazla alan)", () => {
    const ham = JSON.parse(readFileSync(ILCE_NUFUS_YOLU, "utf8")) as Record<string, unknown>;
    const gecerli = (degis: (o: { ilceler: Record<string, number> } & Record<string, unknown>) => void): boolean => {
      const o = structuredClone(ham) as { ilceler: Record<string, number> } & Record<string, unknown>;
      degis(o);
      return IlceNufusSemasi.safeParse(o).success;
    };
    expect(gecerli(() => undefined)).toBe(true);
    expect(gecerli((o) => (o.ilceler["tr_41_gebze"] = 414_960.5))).toBe(false);
    expect(gecerli((o) => (o.ilceler["tr_41_gebze"] = 0))).toBe(false);
    expect(gecerli((o) => (o.ilceler["tr_41_gebze"] = NUFUS_EN_COK + 1))).toBe(false);
    expect(gecerli((o) => (o["fazlaAlan"] = 1))).toBe(false);
  });

  it("dosya kanonik (yeniden bicimlendirme ayni baytlari verir, LF)", () => {
    const ham = readFileSync(ILCE_NUFUS_YOLU, "utf8");
    expect(ham).toBe(`${JSON.stringify(JSON.parse(ham), null, 1)}\n`);
    expect(ham.includes("\r")).toBe(false);
  });
});

describe("fiksturaNufusYaz (parsel fikstürüne nüfus)", () => {
  it("sınır, @bolge/veri şemasındaki V9b sınırıyla aynı kaynaktan gelir", () => {
    expect(NUFUS_EN_COK).toBe(ILCE_NUFUS_ENCOK);
  });

  it("veride kimliği olmayan fikstür (mini-6, sentetik) bit bit aynı kalır", () => {
    const f = parselFiksturuYukle("mini-6");
    const r = fiksturaNufusYaz(f, v);
    expect(r.yazilan).toBe(0);
    expect(r.degisen).toBe(0);
    expect(JSON.stringify(r.fikstur)).toBe(JSON.stringify(f));
  });

  it("kimliği veride olan ilçeye nufus yazılır, anahtar sırası deterministik, fikstür doğrulayıcıdan geçer; girdi değişmez", () => {
    const f = parselFiksturuYukle("mini-6");
    const ilk = f.ilceler[0]!;
    // Gerçek ilçe kimliğiyle yeniden adlandırılmış küçük fikstür (hücreler sentetik; yalnız alan yazımı sınanır).
    const g = { ...f, ilceler: [{ ...ilk, id: "tr_41_gebze" }, ...f.ilceler.slice(1)] };
    const once = JSON.stringify(g);
    const r = fiksturaNufusYaz(g, v);
    expect(JSON.stringify(g)).toBe(once);
    expect(r.yazilan).toBe(1);
    expect(r.fikstur.ilceler[0]!.nufus).toBe(414_960);
    expect(Object.keys(r.fikstur.ilceler[0]!)).toEqual(["id", "ad", "il", "bolge", "sinif", "seviye", "hucreSayisi", "uygunHucre", "nufus", "hucreler"]);
    expect(r.fikstur.ilceler.slice(1)).toEqual(f.ilceler.slice(1));
    // İkinci yazım idempotent.
    expect(JSON.stringify(fiksturaNufusYaz(r.fikstur, v).fikstur)).toBe(JSON.stringify(r.fikstur));
    const harita = miniVeriyiYukle().harita;
    const s = dogrulaParselFiksturu(r.fikstur, { harita });
    expect(s.gecerli, s.gecerli ? "" : s.hatalar.join("; ")).toBe(true);
  });

  it("fikstürde farklı bir nufus varsa veri kazanır ve sayılır", () => {
    const f = parselFiksturuYukle("mini-6");
    const g = { ...f, ilceler: [{ ...f.ilceler[0]!, id: "tr_16_gemlik", nufus: 5 }, ...f.ilceler.slice(1)] };
    const r = fiksturaNufusYaz(g, v);
    expect(r.degisen).toBe(1);
    expect(r.fikstur.ilceler[0]!.nufus).toBe(124_400);
  });
});

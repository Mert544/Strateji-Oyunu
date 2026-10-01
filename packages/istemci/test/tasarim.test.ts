/**
 * Tasarım belirteçleri (docs/arastirma/gorsel-kimlik-ve-arayuz.md §7.5): kontrast, renk körlüğü ayrışması, hex-only çıktı,
 * güncellik (tema.css = belirtec.ts çıktısı) ve büyük harf yasağı.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emblem, KATMAN_ADLARI, OYUNCU, PALET_SURUMU } from "../src/tasarim/belirtec";
import { deltaE, enKucukAyrim, kontrast } from "../src/tasarim/renk";
import type { GormeTuru } from "../src/tasarim/renk";
import { renkTablosu, temaCss, yuruTemaCss } from "../src/tasarim/uret-css";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMALAR = [
  ["açık", renkTablosu(0)],
  ["koyu", renkTablosu(1)],
] as const;
const CVD: GormeTuru[] = ["protan", "deutan", "tritan"];

const r = (t: Map<string, string>, ad: string): string => {
  const v = t.get(ad);
  if (!v) throw new Error(`belirteç yok: ${ad}`);
  return v;
};

describe("kontrast (WCAG 2.2)", () => {
  for (const [ad, t] of TEMALAR) {
    it(`${ad}: metin çiftleri ≥ 4,5:1`, () => {
      const ciftler: [string, string][] = [
        ["murekkep", "yuzey"],
        ["murekkep", "zemin"],
        ["murekkep", "yuzey-2"],
        ["murekkep", "yuzey-3"],
        ["murekkep-2", "yuzey"],
        ["murekkep-2", "yuzey-2"],
        ["murekkep-2", "zemin"],
        ["murekkep-3", "yuzey"],
        ["murekkep-3", "yuzey-2"],
        ["birincil-ustu", "birincil"],
        ["birincil-ustu", "birincil-hover"],
        ["birincil", "yuzey"],
      ];
      for (const aile of ["birincil", "ikincil", "basari", "uyari", "hata", "bilgi"]) {
        ciftler.push([`${aile}-ink`, "yuzey"], [`${aile}-ink`, "yuzey-2"], [`${aile}-ink`, `${aile}-tint`]);
      }
      for (const k of KATMAN_ADLARI) ciftler.push([`katman-${k}-ink`, "yuzey"], [`katman-${k}-ink`, `katman-${k}-tint`]);
      for (const e of ["il", "ilce", "mahalle", "su", "yol"]) ciftler.push([`harita-etiket-${e}`, "harita-kara"]);
      for (const [a, b] of ciftler) expect(kontrast(r(t, a), r(t, b)), `${a} / ${b}`).toBeGreaterThanOrEqual(4.5);
    });
    it(`${ad}: arayüz bileşenleri ve anlam taşıyan grafik ≥ 3:1`, () => {
      const ciftler: [string, string][] = [
        ["cizgi-guclu", "yuzey"],
        ["odak", "yuzey"],
        ["odak", "zemin"],
        ["sen", "harita-kara"],
        ["secim", "harita-kara"],
        ["rozet-savas", "harita-kara"],
        ["rozet-eksik", "harita-kara"],
        ["rozet-bosta", "harita-kara"],
        ["rozet-bitti", "harita-kara"],
        ["harita-sinir-il", "harita-kara"],
      ];
      OYUNCU.forEach((_, i) => ciftler.push([`oyuncu-${i}-kenar`, "harita-kara"]));
      for (const [a, b] of ciftler) expect(kontrast(r(t, a), r(t, b)), `${a} / ${b}`).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("renk körlüğü ayrışması (Machado 2009, ΔE_OK × 100)", () => {
  for (const [ad, t] of TEMALAR) {
    const oyuncu = [...OYUNCU.map((_, i) => r(t, `oyuncu-${i}`)), r(t, "sen")];
    it(`${ad}: 12 oyuncu + Sen normal görüşte ≥ 10`, () => {
      expect(enKucukAyrim(oyuncu).deger).toBeGreaterThanOrEqual(10);
    });
    for (const g of CVD)
      it(`${ad}: 12 oyuncu + Sen ${g} ≥ 6`, () => {
        expect(enKucukAyrim(oyuncu, g).deger).toBeGreaterThanOrEqual(6);
      });
    it(`${ad}: katman renkleri + Sen ≥ 5,5 (her görme türünde)`, () => {
      const k = [...KATMAN_ADLARI.map((x) => r(t, `katman-${x}`)), r(t, "sen")];
      for (const g of ["normal", ...CVD] as GormeTuru[]) expect(enKucukAyrim(k, g).deger, g).toBeGreaterThanOrEqual(5.5);
    });
    it(`${ad}: rozetler ≥ 5 (her görme türünde; şekil ayrıca zorunlu)`, () => {
      const k = ["savas", "eksik", "bosta", "bitti"].map((x) => r(t, `rozet-${x}`));
      for (const g of ["normal", ...CVD] as GormeTuru[]) expect(enKucukAyrim(k, g).deger, g).toBeGreaterThanOrEqual(5);
    });
    it(`${ad}: kara ↔ su ayrışır (açık ≥ 10, koyu ≥ 6)`, () => {
      expect(deltaE(r(t, "harita-kara"), r(t, "harita-su"))).toBeGreaterThanOrEqual(ad === "açık" ? 10 : 6);
    });
    it(`${ad}: soluk oyuncu tonları kara'dan ayrışır (≥ 8)`, () => {
      for (let i = 0; i < OYUNCU.length; i++) expect(deltaE(r(t, `oyuncu-${i}-soluk`), r(t, "harita-kara")), String(i)).toBeGreaterThanOrEqual(8);
    });
    it(`${ad}: arsa türleri kara'dan ve birbirinden ayrışır (≥ 5)`, () => {
      const k = ["harita-kara", "harita-su", "arsa-tarla", "arsa-sanayi", "arsa-konut", "arsa-orman", "arsa-yapili"].map((x) => r(t, x));
      expect(enKucukAyrim(k).deger).toBeGreaterThanOrEqual(5);
    });
  }
});

describe("oyuncu renk sözleşmesi", () => {
  it("12 renk, sabit sıra, emblem çifti benzersiz", () => {
    expect(OYUNCU.length).toBe(12);
    expect(PALET_SURUMU).toBeGreaterThanOrEqual(1);
    const anahtar = new Set(OYUNCU.map((_, i) => JSON.stringify(emblem(i))));
    expect(anahtar.size).toBe(12);
    expect(OYUNCU[0]?.ad).toBe("gul-kurusu");
    expect(OYUNCU[11]?.ad).toBe("nar-cicegi");
  });
});

describe("üretilen CSS", () => {
  const kabuk = readFileSync(join(KOK, "src", "tasarim", "tema.css"), "utf8");
  const yuru = readFileSync(join(KOK, "src", "yuru", "yuru-tema.css"), "utf8");
  const css = kabuk + yuru;
  it("güncel: tema.css ve yuru-tema.css = belirtec.ts çıktısı (`pnpm --filter @bolge/istemci tasarim`)", () => {
    expect(kabuk).toBe(temaCss());
    expect(yuru).toBe(yuruTemaCss());
    expect(kabuk).not.toMatch(/--yuru-/);
  });
  it("oklch() yok; JS'in okuduğu renk belirteçleri yalnız #rrggbb", () => {
    expect(css).not.toMatch(/oklch\(/i);
    const js = /^\s*(--(?:sahne|harita|arsa|oyuncu|rozet|sen|secim|katman|rampa|yuru|d\d|s\d|p\d|t\d|k-|olay|panel|ink|murekkep|desen|sahipsiz|genel|tarim-disi)[a-z0-9-]*):\s*([^;]+);/gm;
    let n = 0;
    for (const m of css.matchAll(js)) {
      const [, ad, deger] = m as unknown as [string, string, string];
      if (/-(alfa|guc)$/.test(ad) || /^--sahne-(yildiz|gece|gece-bolge|aksam)$/.test(ad)) {
        expect(Number.isFinite(Number(deger)), ad).toBe(true);
        continue;
      }
      expect(deger, ad).toMatch(/^#[0-9a-f]{6}$/);
      n++;
    }
    expect(n).toBeGreaterThan(200);
  });
});

/** Kaynak ağacında büyük harfe çevirme yasağı (Türkçe İ/ı; MapLibre `upcase` ve text-transform dahil). */
describe("büyük harf yasağı", () => {
  const dosyalar: string[] = [];
  const gez = (d: string): void => {
    for (const a of readdirSync(d)) {
      const y = join(d, a);
      if (statSync(y).isDirectory()) gez(y);
      else if (/\.(ts|css|html)$/.test(a)) dosyalar.push(y);
    }
  };
  gez(join(KOK, "src"));
  dosyalar.push(join(KOK, "index.html"));
  it("text-transform: uppercase / upcase / toUpperCase yok", () => {
    for (const f of dosyalar) {
      const s = readFileSync(f, "utf8");
      expect(/text-transform\s*:\s*uppercase/i.test(s), `${f}: text-transform: uppercase`).toBe(false);
      expect(/["']upcase["']/.test(s), `${f}: MapLibre upcase`).toBe(false);
      // Yalnız cümle başı büyük harfe izin var (charAt(0).toLocaleUpperCase); tümü büyük harf yok.
      expect(/(?<!charAt\(0\)\.)toLocaleUpperCase\(/.test(s), `${f}: toLocaleUpperCase`).toBe(false);
      expect(/"text-transform"\s*:\s*"uppercase"/.test(s), `${f}: MapLibre text-transform`).toBe(false);
    }
  });
});

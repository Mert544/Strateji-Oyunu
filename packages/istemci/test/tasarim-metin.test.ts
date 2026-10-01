/**
 * Kullanıcıya görünen metin tabloları denetimi (T1, G9 sözleşmesi): şapkasız "dukkan", 3+ harfli tamamen büyük harfli sözcük
 * ve elle ₺/TL birleştirmesi yasak. Kimlikler ve anahtarlar (nesne anahtarı, import yolu, kimlik benzeri tek sözcük) hariç.
 * Para yalnız bicim.ts'teki para()/paraMili()/paraIsaretli() ile yazılır; metin tablolarında ₺ ya da TL harfi bulunmaz.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(KOK, "src");

/** Metin dosyası: adında metin/etiket/sözlük geçen ya da i18n dizinindeki .ts; kesin adlar mevcutsa eklenir. */
const KESIN = ["tasarim/icerik-metin.ts", "tasarim/ilce-metin.ts"];
const AD_DESENI = /(^|[-/])(metin|etiketler?|sozluk|i18n)([-.]|\/|$)|(-metin|-sozluk)\.ts$/;

function tara(d: string, cikti: string[] = []): string[] {
  for (const ad of readdirSync(d)) {
    const yol = join(d, ad);
    if (statSync(yol).isDirectory()) tara(yol, cikti);
    else if (yol.endsWith(".ts") && !yol.endsWith(".d.ts")) cikti.push(yol);
  }
  return cikti;
}

export function metinDosyalari(): string[] {
  const hepsi = tara(SRC).map((y) => relative(SRC, y).replace(/\\/g, "/"));
  const secim = new Set(hepsi.filter((g) => AD_DESENI.test(g) || g.includes("i18n/")));
  for (const k of KESIN) if (existsSync(join(SRC, k))) secim.add(k);
  return [...secim].sort();
}

/** Görünür dizge: tek tırnaklı/şablon metin parçaları; anahtar, import yolu ve kimlik benzeri tek sözcükler elenir. */
export function gorunenDizgeler(kaynak: string, ad: string): { satir: number; metin: string }[] {
  const sf = ts.createSourceFile(ad, kaynak, ts.ScriptTarget.Latest, true);
  const cikti: { satir: number; metin: string }[] = [];
  const kimlikMi = (m: string): boolean => /^[a-z0-9_.:/#@-]+$/.test(m) || /^[A-Za-z0-9_.:/#@-]+$/.test(m) && !/^\p{Lu}\p{Ll}+$/u.test(m) && !/^\p{Lu}{3,}$/u.test(m);
  const ekle = (n: ts.Node, m: string): void => {
    if (!m.trim() || kimlikMi(m)) return;
    cikti.push({ satir: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, metin: m });
  };
  const gez = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isImportTypeNode(n) || ts.isLiteralTypeNode(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent;
      const anahtar = (ts.isPropertyAssignment(p) && p.name === n) || (ts.isElementAccessExpression(p) && p.argumentExpression === n) || ts.isComputedPropertyName(p) || ts.isPropertySignature(p) || ts.isEnumMember(p);
      if (!anahtar) ekle(n, n.text);
      return;
    }
    if (ts.isTemplateExpression(n)) {
      ekle(n, n.head.text);
      for (const s of n.templateSpans) {
        ekle(s, s.literal.text);
        gez(s.expression);
      }
      return;
    }
    ts.forEachChild(n, gez);
  };
  gez(sf);
  return cikti;
}

function ihlaller(g: string, m: string): string[] {
  const s: string[] = [];
  if (/dukkan/i.test(m)) s.push("şapkasız dukkan (dükkân)");
  if (/(^|[^\p{L}])\p{Lu}{3,}(?![\p{L}])/u.test(m)) s.push("3+ harfli tamamen büyük harfli sözcük");
  if (/₺|(^|[^\p{L}])TL(?![\p{L}])/u.test(m)) s.push("elle ₺/TL (para()/paraMili() kullan)");
  return s;
}

describe("metin tabloları: görünen dizge denetimi", () => {
  const dosyalar = metinDosyalari();

  it("denetlenen dosya listesi boş değil", () => {
    expect(dosyalar.length).toBeGreaterThan(0);
  });

  for (const d of dosyalar) {
    it(`${d}: dükkân yazımı, büyük harf, elle para yok`, () => {
      const kaynak = readFileSync(join(SRC, d), "utf8");
      const kotu = gorunenDizgeler(kaynak, d).flatMap(({ satir, metin }) => ihlaller(d, metin).map((i) => `${d}:${satir} ${i}: ${JSON.stringify(metin.slice(0, 70))}`));
      expect(kotu).toEqual([]);
    });
  }
});

describe("denetim kendi kendini sınar", () => {
  it("anahtar ve kimlik elenir, görünen dizge yakalanır", () => {
    const k = 'const T = { dukkan_kimligi: "dukkan.D5.baslik", ad: "Dukkan acik", y: `Bedel ${x} ₺`, b: "KAPAT", ok: "OK" };';
    const m = gorunenDizgeler(k, "x.ts").map((e) => e.metin);
    expect(m).toEqual(["Dukkan acik", "Bedel ", " ₺", "KAPAT"]);
    expect(ihlaller("x", "Dukkan acik")).toHaveLength(1);
    expect(ihlaller("x", "Bedel 5 TL")).toHaveLength(1);
    expect(ihlaller("x", "KAPAT")).toHaveLength(1);
    expect(ihlaller("x", "Dükkân, OK, 3 ₺ değil")).toHaveLength(1); // yalnız ₺
  });
});

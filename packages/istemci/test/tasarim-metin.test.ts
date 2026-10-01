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


/**
 * İçerik adları (A1 set bulgusu A10): mal, yapı ve yöntem adlarında "Her Sözcük Büyük" biçimi yasak ("Makine Parçası" → "Makine parçası";
 * Türkçede yalnız cümle başı ve özel ad büyük harfle başlar). Kural: ad en az iki sözcükten oluşuyor ve HER sözcük büyük harfle başlıyor
 * (tire ve parantez içi ayrı sayılır). Kimlikler denetlenmez; özel ad gerekirse `OZEL_AD`'a eklenir.
 * Kapsam: icerik.json `mallar`, `yontemler`, `tesisTurleri` ve parametreler.json `mulk.ekYapilar`.
 */
const ICERIK = join(KOK, "..", "veri", "icerik");
const OZEL_AD = new Set<string>([]);
/**
 * T3 ad yaması (SP/t3/ad-degisim.patch) girene kadar bekleyen ihlaller (kimlik: bugünkü ad). Yama girince bu liste BOŞALTILIR (kalan
 * satırlar zararsızdır ama gereksizdir); liste dışında yeni ihlal ise testi kırar.
 */
const BEKLEYEN_YAMA = new Set<string>([
  "mallar.cevher", // Demir Cevheri,
  "mallar.parca", // Makine Parçası,
  "mallar.petrol", // Ham Petrol,
  "mallar.sut_urunu", // Süt Ürünleri,
  "mallar.findik_urunu", // Fındık İçi,
  "yontemler.geleneksel_tarim", // Geleneksel Tarım,
  "yontemler.mekanize_tarim", // Mekanize Tarım,
  "yontemler.standart_gida_isleme", // Standart Gıda İşleme,
  "yontemler.yuzey_cevher", // Yüzey Cevher Ocağı,
  "yontemler.derin_cevher", // Derin Cevher Madenciliği,
  "yontemler.yuzey_komur", // Açık Ocak Kömür,
  "yontemler.derin_komur", // Derin Kömür Madenciliği,
  "yontemler.bakir_cikarim", // Bakır Çıkarımı,
  "yontemler.silis_cikarim", // Silis Çıkarımı,
  "yontemler.petrol_cikarim", // Petrol Çıkarımı,
  "yontemler.yuksek_firin", // Yüksek Fırın,
  "yontemler.elektrik_ark", // Elektrik Ark Ocağı,
  "yontemler.standart_parca", // Standart Parça Hattı,
  "yontemler.otomatik_hat", // Otomatik Üretim Hattı,
  "yontemler.standart_elektronik", // Standart Elektronik Hattı,
  "yontemler.standart_rafineri", // Standart Rafineri,
  "yontemler.standart_muhimmat", // Standart Mühimmat Hattı,
  "yontemler.ahir_besi", // Ahır Besiciliği,
  "yontemler.mera_hayvancilik", // Mera Hayvancılığı,
  "yontemler.azotlu_gubre", // Azotlu Gübre Üretimi,
  "yontemler.komur_santrali", // Kömür Santrali,
  "yontemler.yakit_jeneratoru", // Yakıt Jeneratörü,
  "yontemler.hidro_santrali", // Hidroelektrik Santrali,
  "yontemler.sulama_pompasi", // Sulama Pompası,
  "tesisTurleri.gida_fabrikasi", // Gıda Fabrikası,
  "tesisTurleri.cevher_madeni", // Cevher Madeni,
  "tesisTurleri.komur_ocagi", // Kömür Ocağı,
  "tesisTurleri.bakir_madeni", // Bakır Madeni,
  "tesisTurleri.silis_ocagi", // Silis Ocağı,
  "tesisTurleri.petrol_kuyusu", // Petrol Kuyusu,
  "tesisTurleri.parca_fabrikasi", // Parça Fabrikası,
  "tesisTurleri.elektronik_fabrikasi", // Elektronik Fabrikası,
  "tesisTurleri.muhimmat_fabrikasi", // Mühimmat Fabrikası,
  "tesisTurleri.gubre_fabrikasi", // Gübre Fabrikası,
  "tesisTurleri.hidro_santrali", // Hidroelektrik Santrali,
  "tesisTurleri.sulama_kanali", // Sulama Kanalı,
  "ekYapilar.atolye_lab", // Atölye-Lab
  // G6 dalında eklenen yöntemler (bu tabanda yok; yama onlara da dokunuyor):
  "yontemler.ekmek_firini", // Ekmek Fırını
  "yontemler.kepek_gubresi", // Kepekten Gübre
  "yontemler.sut_kepekli", // Kepekli Süt Besisi
]);

export function herSozcukBuyukMu(ad: string): boolean {
  if (OZEL_AD.has(ad)) return false;
  const sozcukler = ad
    .replace(/\([^)]*\)/g, " ")
    .split(/[\s-]+/)
    .filter((s) => /\p{L}/u.test(s));
  return sozcukler.length >= 2 && sozcukler.every((s) => /^\p{Lu}/u.test(s));
}

function icerikAdlari(): Array<{ anahtar: string; ad: string }> {
  const ic = JSON.parse(readFileSync(join(ICERIK, "icerik.json"), "utf8")) as Record<string, Array<{ id: string; ad: string }>>;
  const pr = JSON.parse(readFileSync(join(ICERIK, "parametreler.json"), "utf8")) as { mulk?: { ekYapilar?: Record<string, { ad: string }> } };
  const l: Array<{ anahtar: string; ad: string }> = [];
  for (const dizi of ["mallar", "yontemler", "tesisTurleri"]) for (const o of ic[dizi] ?? []) l.push({ anahtar: `${dizi}.${o.id}`, ad: o.ad });
  for (const [k, o] of Object.entries(pr.mulk?.ekYapilar ?? {})) l.push({ anahtar: `ekYapilar.${k}`, ad: o.ad });
  return l;
}

describe("içerik adları: Her Sözcük Büyük biçimi yok (mal, yapı, yöntem)", () => {
  it("liste boş değil ve denetim yakalıyor", () => {
    expect(icerikAdlari().length).toBeGreaterThan(40);
    expect(herSozcukBuyukMu("Makine Parçası")).toBe(true);
    expect(herSozcukBuyukMu("Atölye-Lab")).toBe(true);
    expect(herSozcukBuyukMu("Makine parçası")).toBe(false);
    expect(herSozcukBuyukMu("Fındık (kabuklu)")).toBe(false);
    expect(herSozcukBuyukMu("Çiftlik")).toBe(false);
  });
  it("beklenen ihlal dışında yeni ihlal yok (T3 yaması bekleyen liste hariç)", () => {
    const yeni = icerikAdlari().filter((x) => herSozcukBuyukMu(x.ad) && !BEKLEYEN_YAMA.has(x.anahtar));
    expect(yeni.map((x) => `${x.anahtar}: ${x.ad}`)).toEqual([]);
  });
  it.todo("T3 ad yaması girince BEKLEYEN_YAMA boşaltılır; bu test yeşil kalır");
  it.todo("kapsam dışı (yama değiştirmiyor): teknolojiler (Mekanize Tarım, Sulama Sistemi, Derin Madencilik, Elektrik Ark Ocağı, Konteyner Limanı, Mekanize Ordu) ve birlikler (Piyade Tümeni, Zırhlı Tümen) adları da Her Sözcük Büyük");
});

/**
 * Elle yazılan hat yapılandırması (yapilandirma/karadeniz.json): oyun bölgesi -> admin-1 kimlik listesi,
 * ad, devlet, elle etiketler, deniz havzaları, sanayi ve rezerv tablosu, boğaz/geçit kuralları.
 * Biçim zod ile doğrulanır; anlamsal kontroller (bilinmeyen admin-1, bilinmeyen devlet...) `yapilandirmaDogrula`dadır.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { YAPILANDIRMA_YOLU } from "./yollar";

/** ASCII kimlik (veri paketindeki KIMLIK_BICIMI ile aynı kural). */
const KIMLIK_BICIMI = /^[a-z][a-z0-9_]*$/;
const kimlik = z.string().regex(KIMLIK_BICIMI);
const etiket = z.enum(["kiyi", "dag", "ova", "liman", "dar_gecit"]);

export const HAVZALAR = ["karadeniz", "marmara", "ege", "akdeniz"] as const;
const havza = z.enum(HAVZALAR);

const bolgeSema = z
  .object({
    id: kimlik,
    ad: z.string().min(1),
    devlet: kimlik,
    /** Kıta sınıfı: "gecit" = Avrupa-Asya kara bağlantısını taşıyan boğaz bölgesi. */
    kita: z.enum(["avrupa", "asya", "gecit"]),
    /** "TUR-2241 Kirklareli" biçiminde admin-1 kimlikleri (ilk sözcük adm1_code) veya "ULKE:SRB" (ülkenin başka bölgeye verilmemiş kalanı). */
    admin1: z.array(z.string().min(1)).min(1),
    /** Elle verilen coğrafi etiketler (dag, ova, dar_gecit). Kıyı ve liman coğrafyadan türetilir. */
    etiketler: z.array(etiket),
    /** Elle düzeltmeler: türetilmiş etiketlere ekleme / çıkarma. */
    etiketEkle: z.array(etiket).default([]),
    etiketCikar: z.array(etiket).default([]),
    /** Deniz havzaları: deniz kenarları yalnızca havzası ortak limanlar arasında kurulur. */
    havzalar: z.array(havza),
    /** Başlangıçta kurulu işleme tesisleri (rezerv tesislerine eklenir). */
    sanayi: z.array(kimlik),
    /** Ham mal rezervleri, bin birim (sentetik harita ölçeği: 100-1100). */
    rezervler: z.record(kimlik, z.number().int().positive()),
    /** MRDS kaydı bulunamayan ama bilinen (gerekçesi rezervKaynak'ta) cevher/bakır iddiaları. */
    mrdsMuaf: z.array(kimlik).default([]),
    /** Rezerv satırının kaynağı/gerekçesi (DATA_SOURCES.md'ye birebir yansır). */
    rezervKaynak: z.string().min(1),
  })
  .strict();

export const YapilandirmaSema = z
  .object({
    surum: z.literal(1),
    ad: z.string().min(1),
    devletler: z.array(z.object({ id: kimlik, ad: z.string().min(1), blok: kimlik }).strict()),
    bolgeler: z.array(bolgeSema),
    /** Deniz yolu boğaz geçitleri: kara maskesinde açılan çok noktalı çizgiler ([boylam, enlem]). */
    denizGecitleri: z.array(
      z.object({ ad: z.string(), noktalar: z.array(z.tuple([z.number(), z.number()])).min(2) }).strict(),
    ),
    /** NE ports listesinde olmayan önemli limanlar: NE populated places'tan ada göre alınır. */
    ekLimanlar: z.array(z.object({ bolge: kimlik, yer: z.string(), ulke: z.string().length(3), neden: z.string() }).strict()),
    /** Geometri komşuluğundan çıkarılan kara kenarları (dağ kuşağını geçitsiz aşan bağlantılar). */
    kaldirilanKaraKenarlari: z.array(z.object({ a: kimlik, b: kimlik, neden: z.string() }).strict()),
    /** Geometri komşuluğunda bulunmayan ama var olan kara bağlantıları. */
    eklenenKaraKenarlari: z.array(z.object({ a: kimlik, b: kimlik, neden: z.string() }).strict()),
    /** Hava kenarları (devletlerin en büyük bölgeleri arasında); [devletA, devletB]. */
    havaKenarlari: z.array(z.tuple([kimlik, kimlik])),
  })
  .strict();

export type Yapilandirma = z.infer<typeof YapilandirmaSema>;
export type BolgeYapilandirmasi = Yapilandirma["bolgeler"][number];

export function yapilandirmaOku(yol: string = YAPILANDIRMA_YOLU): Yapilandirma {
  const ham = JSON.parse(readFileSync(yol, "utf8")) as unknown;
  const s = YapilandirmaSema.safeParse(ham);
  if (!s.success) {
    throw new Error(`Yapilandirma gecersiz (${yol}):\n - ${s.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n - ")}`);
  }
  return s.data;
}

/** Yapılandırmanın kendi içinde tutarlılığı (veri dosyalarına bakmadan). Hata listesi döndürür. */
export function yapilandirmaDogrula(y: Yapilandirma): string[] {
  const hatalar: string[] = [];
  const devletler = new Set(y.devletler.map((d) => d.id));
  const bolgeler = new Set<string>();
  const adminSahibi = new Map<string, string>();
  for (const b of y.bolgeler) {
    if (bolgeler.has(b.id)) hatalar.push(`yinelenen bolge kimligi "${b.id}"`);
    bolgeler.add(b.id);
    if (!devletler.has(b.devlet)) hatalar.push(`${b.id}: bilinmeyen devlet "${b.devlet}"`);
    for (const a of b.admin1) {
      const anahtar = a.split(" ")[0] as string;
      const onceki = adminSahibi.get(anahtar);
      if (onceki !== undefined) hatalar.push(`${b.id}: "${anahtar}" zaten "${onceki}" bolgesine ait`);
      adminSahibi.set(anahtar, b.id);
    }
    if (b.etiketler.includes("dag") && b.etiketler.includes("ova")) {
      hatalar.push(`${b.id}: "dag" ve "ova" bir arada olamaz (arazi sinifi tek olmali)`);
    }
    if ((b.rezervler["tahil"] ?? 0) > 0 && !b.etiketler.includes("ova")) {
      hatalar.push(`${b.id}: tahil rezervi var ama "ova" etiketi yok (ciftlik kurulamaz)`);
    }
  }
  for (const k of [...y.kaldirilanKaraKenarlari, ...y.eklenenKaraKenarlari]) {
    if (!bolgeler.has(k.a) || !bolgeler.has(k.b)) hatalar.push(`kenar kurali: bilinmeyen bolge ${k.a} - ${k.b}`);
  }
  for (const e of y.ekLimanlar) if (!bolgeler.has(e.bolge)) hatalar.push(`ekLimanlar: bilinmeyen bolge "${e.bolge}"`);
  for (const [a, b] of y.havaKenarlari) {
    if (!devletler.has(a) || !devletler.has(b)) hatalar.push(`havaKenarlari: bilinmeyen devlet ${a} - ${b}`);
  }
  return hatalar;
}

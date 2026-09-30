/**
 * Zod şemaları: harita, içerik ve parametre dosyalarının biçim (yapı) doğrulaması.
 *
 * Bu dosya yalnızca YAPISAL kontrolleri yapar (tür, tamsayı, işaret, kimlik biçimi).
 * Anlamsal ve çapraz referans kontrolleri yukle.ts içindedir.
 * Tüm nesneler `strict`: tanınmayan alan hata sayılır (yazım hatalarını yakalar).
 */
import { z } from "zod";
import type {
  HaritaDosyasi,
  IcerikDosyasi,
  Parametreler,
} from "./tipler";

// ---------------------------------------------------------------------------
// Temel yapı taşları
// ---------------------------------------------------------------------------

/** Tamsayı: ondalık sayı veri dosyalarında yasaktır. */
const tamsayi = z
  .number({ invalid_type_error: "sayi olmali" })
  .int("tamsayi olmali (ondalik sayi yasak)")
  .safe("guvenli tamsayi araligi disinda");

/** >= 0 tamsayı. */
const negatifOlmayan = tamsayi.nonnegative("negatif olamaz");

/** >= 1 tamsayı. */
const pozitif = tamsayi.positive("en az 1 olmali");

/** ASCII kimlik: küçük harf, rakam, alt çizgi; harfle başlar. */
export const KIMLIK_BICIMI = /^[a-z][a-z0-9_]*$/;
const kimlik = z
  .string({ invalid_type_error: "metin olmali" })
  .regex(KIMLIK_BICIMI, "kimlik kucuk ASCII harf, rakam ve alt cizgiden olusmali (harfle baslar)");

/** Serbest metin (görünen ad vb.): boş olamaz. */
const metin = z.string({ invalid_type_error: "metin olmali" }).min(1, "bos olamaz");

/** mal/birlik kimliği -> negatif olmayan tamsayı. Anahtarlar kimlik biçiminde olmalıdır. */
const kayit = z.record(kimlik, negatifOlmayan);

const etiket = z.enum(["kiyi", "dag", "ova", "liman", "dar_gecit"]);
const kenarTuru = z.enum(["kara", "deniz", "hava"]);

// ---------------------------------------------------------------------------
// Harita
// ---------------------------------------------------------------------------

const koordinat = tamsayi.min(0, "0-1000 araliginda olmali").max(1000, "0-1000 araliginda olmali");

const devletSema = z
  .object({ id: kimlik, ad: metin, blok: kimlik })
  .strict();

const bolgeSema = z
  .object({
    id: kimlik,
    ad: metin,
    devlet: kimlik,
    etiketler: z.array(etiket),
    nufus: negatifOlmayan,
    rezervler: kayit,
    tesisler: z.array(kimlik),
    x: koordinat,
    y: koordinat,
  })
  .strict();

const kenarSema = z
  .object({
    a: kimlik,
    b: kimlik,
    tur: kenarTuru,
    kapasiteSaat: pozitif,
    sureSaat: pozitif,
  })
  .strict();

export const HaritaSema = z
  .object({
    surum: z.literal(1),
    ad: metin,
    devletler: z.array(devletSema),
    bolgeler: z.array(bolgeSema),
    kenarlar: z.array(kenarSema),
  })
  .strict();

// ---------------------------------------------------------------------------
// İçerik
// ---------------------------------------------------------------------------

const ppmSiniri = negatifOlmayan.max(1_000_000, "ppm en fazla 1_000_000 olabilir");

const malSema = z
  .object({
    id: kimlik,
    ad: metin,
    kategori: z.enum(["ham", "ara", "tuketim", "askeri"]),
    tabanFiyat: pozitif,
    lojistikOnceligi: negatifOlmayan,
    bozulmaPpmGun: ppmSiniri,
  })
  .strict();

const yontemSema = z
  .object({
    id: kimlik,
    ad: metin,
    girdiler: kayit,
    ciktilar: kayit,
    isci: pozitif,
    bakim: kayit,
    gerekliTeknoloji: kimlik.optional(),
    rezerv: kimlik.optional(),
  })
  .strict();

const tesisTuruSema = z
  .object({
    id: kimlik,
    ad: metin,
    insaMaliyeti: kayit,
    insaParasi: negatifOlmayan,
    insaSuresiSaat: pozitif,
    yontemler: z.array(kimlik),
    gerekliEtiket: etiket.optional(),
    gerekliRezerv: kimlik.optional(),
    gerekliTeknoloji: kimlik.optional(),
  })
  .strict();

const teknolojiSema = z
  .object({
    id: kimlik,
    ad: metin,
    aciklama: metin,
    maliyet: negatifOlmayan,
    sureGun: pozitif,
    onKosullar: z.array(kimlik),
    acar: z
      .object({
        yontemler: z.array(kimlik).optional(),
        tesisTurleri: z.array(kimlik).optional(),
        kararlar: z.array(kimlik).optional(),
      })
      .strict(),
  })
  .strict();

const birlikSema = z
  .object({
    id: kimlik,
    ad: metin,
    maliyet: kayit,
    partiSuresiSaat: pozitif,
    guc: pozitif,
    ikmal: kayit,
    gerekliTeknoloji: kimlik.optional(),
  })
  .strict();

export const IcerikSema = z
  .object({
    surum: z.literal(1),
    mallar: z.array(malSema),
    yontemler: z.array(yontemSema),
    tesisTurleri: z.array(tesisTuruSema),
    teknolojiler: z.array(teknolojiSema),
    birlikler: z.array(birlikSema),
  })
  .strict();

// ---------------------------------------------------------------------------
// Parametreler
// ---------------------------------------------------------------------------

export const ParametreSema = z
  .object({
    surum: z.literal(1),
    dunyaHizi: pozitif,
    baslangic: z
      .object({
        stok: kayit,
        hazine: negatifOlmayan,
        birlikler: kayit,
      })
      .strict(),
    nufus: z
      .object({
        isgucuPpm: ppmSiniri,
        tuketim1000Saat: kayit,
        buyumePpmGun: negatifOlmayan,
        kuculmePpmGun: negatifOlmayan,
      })
      .strict(),
    ekonomi: z
      .object({
        depoKapasitesi: pozitif,
        vergiTabani1000Saat: negatifOlmayan,
        varsayilanVergiPpm: ppmSiniri,
        vergiBuyumeEsigiPpm: ppmSiniri,
      })
      .strict(),
    pazar: z
      .object({
        fiyatEsnekligiPpm: negatifOlmayan,
        emilimSaat: kayit,
        arzSaat: kayit,
        ithalatCarpaniPpm: pozitif,
        ihracatCarpaniPpm: pozitif,
        yaptirimIthalatCarpaniPpm: pozitif,
        yaptirimIhracatCarpaniPpm: pozitif,
        anlasmaIthalatCarpaniPpm: pozitif,
        anlasmaIhracatCarpaniPpm: pozitif,
      })
      .strict(),
    lojistik: z
      .object({
        enAzCozumAraligiDakika: negatifOlmayan,
        tamponSaat: negatifOlmayan,
        gelistirmeArtisPpm: pozitif,
        gelistirmeMaliyeti: kayit,
        gelistirmeParasi: negatifOlmayan,
        gelistirmeSuresiSaat: pozitif,
      })
      .strict(),
    askeri: z
      .object({
        ilanHazirlikSaatMin: negatifOlmayan,
        ilanHazirlikSaatMax: negatifOlmayan,
        pencereSaat: pozitif,
        kayipTavaniPpm: ppmSiniri,
        yagmaOraniPpm: ppmSiniri,
        yeniOyuncuKorumasiGun: negatifOlmayan,
        araziSavunmaPpm: z
          .object({
            kiyi: pozitif,
            dag: pozitif,
            ova: pozitif,
            liman: pozitif,
            dar_gecit: pozitif,
          })
          .strict(),
        savunmaDurusuCarpaniPpm: pozitif,
      })
      .strict(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Şema çıktılarının sözleşme tipleriyle derleme zamanı uyumu
// (tipler.ts değişirse burada derleme hatası çıkar.)
// ---------------------------------------------------------------------------

type Karsilikli<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export type SemaUyumu = [
  Karsilikli<z.infer<typeof HaritaSema>, HaritaDosyasi>,
  Karsilikli<z.infer<typeof IcerikSema>, IcerikDosyasi>,
  Karsilikli<z.infer<typeof ParametreSema>, Parametreler>,
];

/** Derleme zamanı kontrolü: herhangi biri uyumsuzsa bu atama derlenmez. */
export const SEMA_UYUMU: SemaUyumu = [true, true, true];

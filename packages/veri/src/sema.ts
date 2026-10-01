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
const iklimTipi = z.enum(["akdeniz", "karasal", "karadeniz", "balkan_kita", "kurak", "dag_yayla"]);

/** İşaretli tamsayı (negatif olabilir). */
const isaretliTamsayi = tamsayi;

// ---------------------------------------------------------------------------
// Harita
// ---------------------------------------------------------------------------

const koordinat = tamsayi.min(0, "0-1000 araliginda olmali").max(1000, "0-1000 araliginda olmali");

/** Bölge tarım alanı (B1, opsiyonel). */
const bolgeTarimSema = z
  .object({
    toprakTabanPpm: tamsayi.min(300_000, "en az 300000 olmali").max(1_200_000, "en fazla 1200000 olabilir"),
    iklimTipi,
    tarimTesisTavani: tamsayi.min(0).max(20, "en fazla 20 olabilir"),
    sulanabilirPpm: negatifOlmayan.max(1_000_000, "ppm en fazla 1_000_000 olabilir"),
  })
  .strict();

/** Liman tanımı (B3, opsiyonel). */
const limanSema = z
  .object({
    dunyaKapisi: z.boolean(),
    dunyaMesafeSaat: negatifOlmayan.max(10_000, "en fazla 10000 saat olabilir"),
    kapasiteSinifi: tamsayi.min(1, "1..4 olmali").max(4, "1..4 olmali"),
  })
  .strict();

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
    konum: z
      .object({
        enlemMikro: tamsayi.min(-90_000_000).max(90_000_000),
        boylamMikro: tamsayi.min(-180_000_000).max(180_000_000),
      })
      .strict()
      .optional(),
    tarim: bolgeTarimSema.optional(),
    liman: limanSema.optional(),
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
    sinirDosyasi: metin.optional(),
    atif: z.array(metin).optional(),
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
    kategori: z.enum(["ham", "ara", "tuketim", "askeri", "enerji"]),
    tabanFiyat: pozitif,
    lojistikOnceligi: negatifOlmayan,
    bozulmaPpmGun: ppmSiniri,
    depolanabilir: z.boolean().optional(),
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
    tarimsal: z.boolean().optional(),
    sulama: z.boolean().optional(),
    kirlilikPpmSaat: negatifOlmayan.max(1_000_000, "kirlilikPpmSaat en fazla 1000000 olabilir").optional(),
    hidro: z.boolean().optional(),
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
    tarimTesisi: z.boolean().optional(),
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

const tarimUrunSema = z
  .object({
    id: kimlik,
    ad: metin,
    ciktiPpm: negatifOlmayan.max(3_000_000, "ciktiPpm en fazla 3000000 olabilir"),
    toprakDegisimPpmGun: isaretliTamsayi.min(-1_000_000).max(1_000_000),
    olayDuyarliligiPpm: ppmSiniri,
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
    tarimUrunleri: z.array(tarimUrunSema).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Parametreler
// ---------------------------------------------------------------------------

/** 12 aylık tamsayı dizisi (ppm veya gün). */
const onIkiAy = z.array(negatifOlmayan).length(12, "12 eleman (ay) olmali");

/** Anahtarları iklim tipleri olan nesne (z.record Partial üretir; tam sözleşme uyumu için açık nesne). */
function iklimTipiKaydi<T extends z.ZodTypeAny>(deger: T) {
  return z
    .object({
      akdeniz: deger,
      karasal: deger,
      karadeniz: deger,
      balkan_kita: deger,
      kurak: deger,
      dag_yayla: deger,
    })
    .strict();
}

const iklimOlayProfilSema = z
  .object({
    sureGunMin: pozitif,
    sureGunMax: pozitif,
    siddetMinPpm: ppmSiniri,
    siddetMaxPpm: ppmSiniri,
    menzilKenar: negatifOlmayan.max(8, "en fazla 8 olabilir"),
    yayilimPpm: ppmSiniri,
    olasilikPpmGun: onIkiAy.refine((a) => a.every((x) => x <= 1_000_000), "ppm en fazla 1_000_000 olabilir"),
  })
  .strict();

const iklimOlayKaydi = <T extends z.ZodTypeAny>(deger: T) =>
  z.object({ kuraklik: deger, don: deger, sel: deger, kis_firtinasi: deger }).strict();

const iklimSema = z
  .object({
    baslangicGunu: negatifOlmayan.max(364, "0..364 olmali"),
    gunCarpani: pozitif.max(365, "en fazla 365 olabilir"),
    ayGunleri: onIkiAy,
    uyariSaat: negatifOlmayan,
    hasatEgrisiPpm: iklimTipiKaydi(onIkiAy),
    olaylar: iklimOlayKaydi(iklimOlayProfilSema),
    tipOlasilikCarpaniPpm: iklimOlayKaydi(iklimTipiKaydi(negatifOlmayan.max(100_000_000, "en fazla 100000000 olabilir"))),
    sulamaKuraklikKorumaPpm: ppmSiniri,
    sulamaDipPpm: ppmSiniri,
  })
  .strict();

const tarimParamSema = z
  .object({
    toprakTabaniPpm: ppmSiniri,
    gubreTuketimiSaat: negatifOlmayan,
    gubreToprakPpmGun: negatifOlmayan,
    gubreCiktiEkiPpm: negatifOlmayan,
    azamiGubreDozu: negatifOlmayan.max(10, "en fazla 10 olabilir"),
  })
  .strict();

/** Pazar v1 ek alanları (B3, hepsi opsiyonel; "ya hiçbiri ya hepsi" kuralı dogrula.ts'dedir). */
const kitlikSema = z
  .object({
    esikPpm: z.tuple([ppmSiniri, ppmSiniri, ppmSiniri]),
    cezaPpm: z.tuple([ppmSiniri, ppmSiniri, ppmSiniri]),
    toparlanmaSaat: pozitif,
  })
  .strict();

const tarifeSema = z
  .object({
    ithalatPpm: z.array(ppmSiniri).min(1, "en az 1 kademe olmali"),
    ihracatVergisiPpm: z.array(ppmSiniri).min(1, "en az 1 kademe olmali"),
  })
  .strict();

const olcekKademeSema = z
  .object({
    ciktiPpm: pozitif.max(10_000_000, "ciktiPpm en fazla 10000000 olabilir"),
    isciPpm: pozitif.max(10_000_000, "isciPpm en fazla 10000000 olabilir"),
    bakimPpm: pozitif.max(10_000_000, "bakimPpm en fazla 10000000 olabilir"),
    insaPpm: pozitif.max(20_000_000, "insaPpm en fazla 20000000 olabilir"),
    gerekliTeknoloji: kimlik.nullable(),
  })
  .strict();

const bakimDuzeyiSema = z
  .object({
    id: z.enum(["asgari", "normal", "yuksek"]),
    girdiPpm: negatifOlmayan.max(10_000_000, "girdiPpm en fazla 10000000 olabilir"),
    asinmaPpmGun: isaretliTamsayi.min(-1_000_000).max(1_000_000),
  })
  .strict();

const sanayiSema = z
  .object({
    iletimKaybiPpm: ppmSiniri,
    uretimTabaniPpm: ppmSiniri,
    haneOnceligi: z.boolean(),
    yukPlanMarjiPpm: ppmSiniri,
    santralIsletmePpm: negatifOlmayan.max(10_000_000, "en fazla 10000000 olabilir"),
    olcekKademeleri: z.array(olcekKademeSema),
    olcekYukseltmeSureCarpaniPpm: pozitif.max(10_000_000, "en fazla 10000000 olabilir"),
    hidro: z.object({ akarsuEgrisiPpm: onIkiAy }).strict(),
    bakim: z
      .object({
        duzeyler: z.array(bakimDuzeyiSema),
        asinmaVerimKaybiTavaniPpm: ppmSiniri,
        genelOnarimMaliyetPpm: negatifOlmayan.max(10_000_000, "en fazla 10000000 olabilir"),
        genelOnarimDurusSaat: negatifOlmayan,
        kitlikEsigiPpm: ppmSiniri,
        kitlikAsinmaPpmGun: negatifOlmayan.max(1_000_000, "en fazla 1000000 olabilir"),
      })
      .strict(),
    kirlilik: z
      .object({
        azalmaPpmGun: ppmSiniri,
        komsuYayilimPpmGun: ppmSiniri,
        tarimKatsayiPpm: ppmSiniri,
        istikrarKatsayiPpm: ppmSiniri,
      })
      .strict(),
    damar: z
      .object({
        rezervOlcegiPpm: pozitif.max(10_000_000, "en fazla 10000000 olabilir"),
        rezervVerimTabaniPpm: ppmSiniri,
        kesifMaliyetPara: negatifOlmayan,
        kesifMaliyetMal: kayit,
        kesifSureSaat: pozitif,
        kesifOlasilikPpm: ppmSiniri,
        kesifEkiMinPpm: ppmSiniri,
        kesifEkiMaxPpm: negatifOlmayan.max(10_000_000, "en fazla 10000000 olabilir"),
        kesifHakkiBolgeMal: negatifOlmayan.max(100, "en fazla 100 olabilir"),
      })
      .strict(),
  })
  .strict();

const mulkEkYapiSema = z
  .object({
    ad: z.string().min(1),
    yuva: pozitif.max(3, "yuva en fazla 3 olabilir"),
    insaSaati: pozitif,
    insaParasi: negatifOlmayan,
    insaMaliyeti: kayit,
    enFazlaIlBasina: pozitif.optional(),
    depoKapasiteEkiMili: negatifOlmayan.optional(),
    komisyonIndirimPpm: ppmSiniri.optional(),
    makasIndirimPpm: ppmSiniri.optional(),
    emirYuvasi: negatifOlmayan.optional(),
  })
  .strict();

const mulkKamuSema = z
  .object({
    mahallePaketi: z
      .array(z.object({ tur: z.enum(["meydan", "pazar", "park", "hizmet", "kiyi", "sanayi_rezervi", "hazine"]), hucre: pozitif }).strict())
      .min(1, "mahalle paketi bos olamaz"),
    mahalleHucreHedefi: pozitif,
    hazineRezerviPpm: ppmSiniri,
    hazineAdaHucre: pozitif,
    hazineEnFazlaAda: pozitif,
    ilceMerkeziHucre: negatifOlmayan,
    kiyiDerinlik: negatifOlmayan.max(8, "en fazla 8 olabilir"),
    kiyiIlceMinSuHucre: pozitif,
    oyuncuyaKapaliYapilar: z.array(kimlik),
  })
  .strict();

const mulkKasaSema = z
  .object({
    vergiPayi: z.object({ mahallePpm: ppmSiniri, ilcePpm: ppmSiniri, ilPpm: ppmSiniri }).strict(),
    ithalatMakasiIlcePpm: ppmSiniri,
    ithalatKomisyonuIlcePpm: ppmSiniri,
    pencereGun: pozitif.max(365, "en fazla 365 olabilir"),
    oyuncuPayiTavaniPpm: ppmSiniri,
    tekAlimTavaniPpm: ppmSiniri,
    haftalikButcePpm: ppmSiniri,
  })
  .strict();

const odulSema = z
  .object({
    surum: z.literal(1),
    tavanMili: negatifOlmayan,
    kavramlar: z.record(kimlik, z.object({ para: negatifOlmayan.optional(), mal: kayit.optional() }).strict()),
  })
  .strict();

const mulkSema = z
  .object({
    hucreFiyati: z.object({ kirsal: negatifOlmayan, kasaba: negatifOlmayan, sehir: negatifOlmayan }).strict(),
    satisPayiCarpaniPpm: negatifOlmayan.max(100_000_000, "en fazla 100000000 olabilir"),
    ilceHucreTavani: pozitif,
    ilcePayTavaniPpm: ppmSiniri,
    araziVergisiHaftalikPpm: ppmSiniri,
    insaatIptalIadePpm: ppmSiniri,
    parselBirakIadePpm: ppmSiniri.optional(),
    esZamanliInsaat: pozitif,
    yapiYuva: z.record(kimlik, pozitif.max(3, "yuva en fazla 3 olabilir")),
    yapiInsaSaati: z.record(kimlik, pozitif).optional(),
    yeniOyuncu: z
      .object({
        hibe: negatifOlmayan,
        baslangicStok: kayit,
        yurtHucre: negatifOlmayan,
        ilkYapiIndirimPpm: ppmSiniri,
        indirimliYapiSayisi: negatifOlmayan,
        ayrilmisHucrePpm: ppmSiniri,
        ayrilmisGun: negatifOlmayan.optional(),
        ayrilmisHucreHesapTavani: negatifOlmayan.optional(),
        ayrilmisYalnizKatilimIlcesi: z.boolean().optional(),
        ayrilmisIlceGunlukPpm: ppmSiniri.optional(),
        ayrilmisIlceGunlukEnAz: negatifOlmayan.optional(),
        kalkanGun: negatifOlmayan,
      })
      .strict(),
    ekYapilar: z.record(kimlik, mulkEkYapiSema).optional(),
    temelEmirYuvasi: negatifOlmayan.optional(),
    kamu: mulkKamuSema.optional(),
    kasa: mulkKasaSema.optional(),
    hareketsizlik: z
      .object({
        uykuGun: negatifOlmayan,
        curumeGun: negatifOlmayan,
        curumePpmGun: ppmSiniri,
        acikArtirmaGun: negatifOlmayan,
        tatilGunYillik: negatifOlmayan,
      })
      .strict(),
  })
  .strict();

export const ParametreSema = z
  .object({
    surum: z.literal(1),
    odul: odulSema.optional(),
    dunyaHizi: pozitif,
    baslangic: z
      .object({
        stok: kayit,
        hazine: negatifOlmayan,
        birlikler: kayit,
      })
      .strict(),
    erkenOyun: z
      .object({
        baslangicCarpaniPpm: pozitif.max(1_000_000, "ppm en fazla 1_000_000 olabilir"),
        sabitSaat: negatifOlmayan,
        bitisSaat: negatifOlmayan,
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
        tesisIsletmeParasiSaat: negatifOlmayan,
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
        // Pazar v1 (B3, opsiyonel; ya hiçbiri ya hepsi)
        makasPpm: ppmSiniri.optional(),
        anlasmaMakasPpm: ppmSiniri.optional(),
        yaptirimMakasPpm: ppmSiniri.optional(),
        limanPrimPpmSaat: negatifOlmayan.max(1_000_000, "en fazla 1000000 olabilir").optional(),
        limanPrimTavaniPpm: ppmSiniri.optional(),
        islemKomisyonuPpm: ppmSiniri.optional(),
        npcLikiditeTabanOyuncu: pozitif.max(1000, "en fazla 1000 olabilir").optional(),
        kitlik: kitlikSema.optional(),
        tarife: tarifeSema.optional(),
      })
      .strict(),
    lojistik: z
      .object({
        enAzCozumAraligiDakika: negatifOlmayan,
        // >= 1: lojistik çözüm stok fazlasını tamponSaat'e bölerek hesaplar (sıfıra bölme).
        tamponSaat: pozitif,
        gelistirmeArtisPpm: pozitif,
        gelistirmeMaliyeti: kayit,
        gelistirmeParasi: negatifOlmayan,
        gelistirmeSuresiSaat: pozitif,
      })
      .strict(),
    askeri: z
      .object({
        // >= 1: hazırlık süresi en az 1 saat (pencere ilan anında açılmasın; yukle.ts de denetler).
        ilanHazirlikSaatMin: pozitif,
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
        birlikMaasiSaat: negatifOlmayan,
      })
      .strict(),
    teknoloji: z
      .object({
        yayilimIndirimiPpm: ppmSiniri,
      })
      .strict(),
    iklim: iklimSema.optional(),
    tarim: tarimParamSema.optional(),
    sanayi: sanayiSema.optional(),
    mulk: mulkSema.optional(),
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

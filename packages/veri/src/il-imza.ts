/**
 * İl imza ürünleri ve ürün pencere verisi: şema (zod) + dosya sisteminden bağımsız doğrulayıcı.
 *
 * Kapsam: `icerik/il-imza.json` (il -> imza mal kimlikleri, coğrafi işaret kayıtları) ve `icerik/urun-pencere.json`
 * (ürün başına 12 aylık hasat/üretim yoğunluk penceresi, ppm). Çekirdek tiplerine/şemasına BAĞLI DEĞİLDİR: yalnızca
 * veri sözleşmesidir; çekirdek ileride bu dosyaları okuyabilir (docs/arastirma/cesitlilik-uretim-katmanlari.md §3, §4.5, §7).
 *
 * Tasarım ilkeleri:
 *  - Ülkeden bağımsız: kayıtta `ulke` ("TR") ve harita hiyerarşisinin il/ilçe kimlikleri (tr_41, tr_41_gebze) vardır;
 *    yeni ülke = yeni kayıtlar, kod değişmez.
 *  - icerik.json'da OLMAYAN mal kimlikleri `ileride` listesindedir; ona bağlı imzalar `planli: true` taşır. Mal içeriğe
 *    eklenince `ileride` kaydı silinir ve `planli` false olur (doğrulayıcı tutarsızlığı hata sayar).
 *  - `imza[]` ilin +%10 çıktı bonusu taşıyan 2-4 imzasıdır (kademeden bağımsız; ilçe başına en çok 2). `aday[]` bilgi amaçlıdır, bonus yok.
 *  - `dogrulandi`: üretim/sanayi varlığı (coğrafi işaret kaydında: adın ve durumun) kaynakta görüldü. Coğrafi işaret BAŞVURUSU imza kanıtı sayılmaz.
 *  - Ürün penceresi HAM saklanır (toplam 12 000 000 ppm); çekirdek profili `urunProfiliPpm(pencere, yogunlukPpm)` ile üretir.
 *  - Tamsayı + ppm; kayan nokta yok. Dosyalar kanonik sıralıdır (doğrulayıcı sırayı denetler; metin biçimi `kanonikMetin`).
 *  - Bu dosya `node:fs` kullanmaz (tarayıcı/worker güvenli). Node yükleyici: il-imza-yukle.ts.
 */
import { z } from "zod";
import type { DogrulamaSonucu } from "./dogrula";
import { KIMLIK_BICIMI } from "./sema";

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

/** Pencere ay sayısı (indeks 0 = Ocak). */
export const PENCERE_AY_SAYISI = 12;
/** Ortalama (1,0) = 1 000 000 ppm. */
export const PENCERE_PPM = 1_000_000;
/** Bir ürün penceresinin 12 aylık ppm toplamı (ortalama 1 000 000; hasatEgrisiPpm ile aynı sözleşme). */
export const PENCERE_TOPLAM_PPM = 12_000_000;
/** Yoğunluk (y) alt sınırı: 0,1. y = ürün profilinin mevsimli (pencereye bağlı) payı; kalanı düz akıştır. */
export const YOGUNLUK_ALT_PPM = 100_000;
/** Yoğunluk (y) üst sınırı: 0,3 (Alfa-0). */
export const YOGUNLUK_UST_PPM = 300_000;
/** Önerilen varsayılan yoğunluk (0,2). */
export const YOGUNLUK_ONERILEN_PPM = 200_000;

/** Alfa-0'da ve her ilde imza sayısı sınırları (rapor S-3): bonus taşıyan imza toplamı. */
export const IMZA_EN_AZ = 2;
export const IMZA_EN_COK = 4;
/** Bir ilçede en çok bu kadar imza (rapor S-3). */
export const ILCE_BASINA_EN_COK_IMZA = 2;

/** İmza çıktı çarpanı üst sınırı (+%10; rapor S-5: tek "en iyi imza" doğmasın). */
export const IMZA_CARPAN_UST_PPM = 1_100_000;
/** Çarpan yok (nötr). */
export const IMZA_CARPAN_NOTR_PPM = 1_000_000;

/** Alfa-0 illeri (Kocaeli, Sakarya, Bursa): `kapsam: "tam"` olmak zorundadır. */
export const ALFA0_ILLERI: readonly string[] = ["tr_16", "tr_41", "tr_54"];

/**
 * Mal olarak ASLA kullanılmayacak kimlikler (mal kimlik kilidi, docs/12 §10): `tekstil` -> `kumas` + `hazir_giyim`;
 * `sarkuteri` mal değil dükkân türüdür (mal: `sut_urunu`).
 */
export const YASAK_MAL_KIMLIKLERI: readonly string[] = ["sarkuteri", "tekstil"];

/** Kademe sırası (kanonik sıralama): t1 temel ağırlık, t2 bölgesel imza, t3a zanaat/lüks. */
export const IMZA_KADEMELERI = ["t1", "t2", "t3a"] as const;
export type ImzaKademesi = (typeof IMZA_KADEMELERI)[number];

const KADEME_SIRASI: Readonly<Record<ImzaKademesi, number>> = { t1: 0, t2: 1, t3a: 2 };

// ---------------------------------------------------------------------------
// Şemalar
// ---------------------------------------------------------------------------

const tamsayi = z.number({ invalid_type_error: "sayi olmali" }).int("tamsayi olmali (ondalik sayi yasak)").safe("guvenli tamsayi araligi disinda");
const kimlik = z.string({ invalid_type_error: "metin olmali" }).regex(KIMLIK_BICIMI, "kimlik kucuk ASCII harf, rakam ve alt cizgiden olusmali (harfle baslar)");
const metin = z.string({ invalid_type_error: "metin olmali" }).min(1, "bos olamaz");
const ulke = z.string({ invalid_type_error: "metin olmali" }).regex(/^[A-Z]{2}$/, "ulke iki buyuk harf olmali (ornek: TR)");
/** Kaynak: https adresi ya da depodaki bir belge (docs/...) başvurusu. */
const kaynakMetni = z.string({ invalid_type_error: "metin olmali" }).regex(/^(https?:\/\/\S+|docs\/\S+)$/, "kaynak http(s) adresi ya da docs/ yolu olmali");
const iklimTipi = z.enum(["akdeniz", "karasal", "karadeniz", "balkan_kita", "kurak", "dag_yayla"]);

const imzaKademesi = z.enum(IMZA_KADEMELERI);

/** Bir ilin imza (ya da ağırlık) malı. t1: temel mal ağırlığı; t2: bölgesel imza; t3a: zanaat/lüks. */
export const IlImzaMalSema = z
  .object({
    malId: kimlik,
    kademe: imzaKademesi,
    /** Hiyerarşi ilçe kimlikleri (tr_41_gebze), alfabetik. */
    ilceler: z.array(kimlik).min(1).optional(),
    /** icerik.json'da henüz yoksa true (ve `ileride` listesinde olmalıdır). */
    planli: z.boolean(),
    /** İmza çıktı çarpanı, ppm (1_100_000 = +%10). */
    carpanPpm: tamsayi,
    /** Üretim/sanayi varlığı kaynakla doğrulandı mı (true ise en az bir http(s) kaynak). Coğrafi işaret başvurusu tek başına kanıt değildir. */
    dogrulandi: z.boolean().describe("uretim/sanayi varligi kaynakla kanitlandi; cografi isaret basvurusu kanit sayilmaz"),
    kaynak: z.array(kaynakMetni).min(1, "en az bir kaynak gerekli"),
    aciklama: metin.optional(),
  })
  .strict();

/** İlin bilgi amaçlı adayı: imza gibi tanımlı ama çıktı çarpanı YOKTUR (t1 ağırlık, zanaat, kanıtı zayıf ya da elenen adaylar). */
export const IlAdayMalSema = IlImzaMalSema.omit({ carpanPpm: true }).strict();

/** Coğrafi işaret kaydı (Tier 3b): stok kalemi AÇMAZ; bir malın etiketli sürümüdür. */
export const CografiIsaretSema = z
  .object({
    kimlik: kimlik,
    ad: metin,
    /** Bağlı mal (varsa); bilinmiyorsa yok. */
    malId: kimlik.optional(),
    ilceler: z.array(kimlik).min(1).optional(),
    /** menşe adı / mahreç işareti / geleneksel ürün adı; kaynak belirtmiyorsa yok. */
    tur: z.enum(["mensei", "mahrec", "gelenek"]).optional(),
    yil: tamsayi.min(1900).max(2100).optional(),
    koruma: z.array(z.enum(["TURKPATENT", "AB"])).min(1),
    durum: z.enum(["tescilli", "basvuru", "belirsiz"]),
    /** Adın ve durumun kaynakta görüldüğü anlamına gelir; durum "basvuru" ise başvurunun varlığını gösterir, tescil anlamına GELMEZ. */
    dogrulandi: z.boolean().describe("ad ve durum kaynakta goruldu; basvuru tescil anlamina gelmez"),
    kaynak: z.array(kaynakMetni).min(1, "en az bir kaynak gerekli"),
    aciklama: metin.optional(),
  })
  .strict();

export const IlImzaKaydiSema = z
  .object({
    ulke,
    /** Hiyerarşi il kimliği (tr_41). */
    il: kimlik,
    ad: metin,
    iklimTipi,
    /** İkincil iklim tipi (ör. Kocaeli: akdeniz + karadeniz). */
    iklimTipiEk: iklimTipi.optional(),
    /** tam: kaynaklı ve eksiksiz (Alfa-0); ozet: rapor tablosundan ön öneri. */
    kapsam: z.enum(["tam", "ozet"]),
    /** +%10 çıktı bonusu taşıyan imzalar (Alfa-0: 2-4; ilçe başına en çok 2). */
    imza: z.array(IlImzaMalSema),
    /** Bilgi amaçlı adaylar (bonus yok). */
    aday: z.array(IlAdayMalSema),
    cografiIsaretler: z.array(CografiIsaretSema),
  })
  .strict();

/** icerik.json'da olmayan, planlı mal kataloğu girdisi. */
export const IleridekiMalSema = z
  .object({
    malId: kimlik,
    ad: metin,
    kademe: imzaKademesi,
    /** Yalnız t2: H hammadde/tarım, A ara/işlenmiş, S sanayi (rapor §7.3). */
    tur: z.enum(["H", "A", "S"]).optional(),
    oncelik: z.enum(["A0", "A0-ops", "A1", "Sonra"]),
  })
  .strict();

export const IlImzaDosyaSema = z
  .object({
    surum: z.literal(1),
    aciklama: metin,
    ileride: z.array(IleridekiMalSema),
    iller: z.array(IlImzaKaydiSema),
  })
  .strict();

export const UrunPencereSema = z
  .object({
    /** mevsimli: en az bir ay 0; yil_boyu: tüm aylar > 0. */
    tur: z.enum(["mevsimli", "yil_boyu"]),
    /** HAM 12 aylık ppm (Ocak = 0), toplam PENCERE_TOPLAM_PPM. */
    ppm: z.array(tamsayi.nonnegative("negatif olamaz")).length(PENCERE_AY_SAYISI, "tam 12 ay olmali"),
    dogrulandi: z.boolean(),
    kaynak: z.array(kaynakMetni).min(1, "en az bir kaynak gerekli"),
    aciklama: metin.optional(),
  })
  .strict();

export const UrunPencereDosyaSema = z
  .object({
    surum: z.literal(1),
    ulke,
    aciklama: metin,
    /** Varsayılan yoğunluk y (ppm; 100 000–300 000). Parametreler.json'a taşınması G2 işidir. */
    varsayilanYogunlukPpm: tamsayi,
    urunler: z.record(kimlik, UrunPencereSema),
  })
  .strict();

export type IlImzaMali = z.infer<typeof IlImzaMalSema>;
export type IlAdayMal = z.infer<typeof IlAdayMalSema>;
export type CografiIsaret = z.infer<typeof CografiIsaretSema>;
export type IlImzaKaydi = z.infer<typeof IlImzaKaydiSema>;
export type IleridekiMal = z.infer<typeof IleridekiMalSema>;
export type IlImzaDosyasi = z.infer<typeof IlImzaDosyaSema>;
export type UrunPencere = z.infer<typeof UrunPencereSema>;
export type UrunPencereDosyasi = z.infer<typeof UrunPencereDosyaSema>;

// ---------------------------------------------------------------------------
// Hiyerarşi özeti (harita hiyerarşisinden yalnız il/ilçe kimlikleri)
// ---------------------------------------------------------------------------

export interface HiyerarsiIli {
  readonly ad: string;
  /** Küçük harf ülke kodu (hiyerarşi biçimi: "tr"). */
  readonly ulke: string;
  readonly ilceler: ReadonlySet<string>;
}
export type IlHiyerarsisi = ReadonlyMap<string, HiyerarsiIli>;

interface HamHiyerarsi {
  bolgeler?: Array<{ iller?: Array<{ kimlik?: string; ad?: string; ulke?: string; ilceler?: Array<{ kimlik?: string }> }> }>;
}

/**
 * packages/veri/haritalar/odbl/hiyerarsi.json biçimindeki ham veriden il -> { ad, ulke, ilçe kimlikleri } çıkarır.
 * Biçim bozuksa Error fırlatır (bu dosya girdi değil, depo verisidir).
 */
export function hiyerarsiOzetiCikar(ham: unknown): IlHiyerarsisi {
  const h = ham as HamHiyerarsi;
  if (typeof h !== "object" || h === null || !Array.isArray(h.bolgeler)) throw new Error("Hiyerarsi gecersiz: 'bolgeler' dizisi yok");
  const sonuc = new Map<string, HiyerarsiIli>();
  for (const b of h.bolgeler) {
    for (const i of b.iller ?? []) {
      if (typeof i.kimlik !== "string" || typeof i.ad !== "string" || typeof i.ulke !== "string" || !Array.isArray(i.ilceler)) {
        throw new Error(`Hiyerarsi gecersiz: il kaydi eksik (${String(i.kimlik)})`);
      }
      const ilceler = new Set<string>();
      for (const c of i.ilceler) if (typeof c.kimlik === "string") ilceler.add(c.kimlik);
      sonuc.set(i.kimlik, { ad: i.ad, ulke: i.ulke, ilceler });
    }
  }
  return sonuc;
}

// ---------------------------------------------------------------------------
// Doğrulayıcılar
// ---------------------------------------------------------------------------

function zodHatalari(hata: z.ZodError, onek: string): string[] {
  return hata.issues.map((i) => `${onek}${i.path.length > 0 ? "." + i.path.join(".") : ""}: ${i.message}`);
}

function sonuc(hatalar: string[]): DogrulamaSonucu {
  return hatalar.length === 0 ? { gecerli: true } : { gecerli: false, hatalar };
}

/** Düz alfabetik (kod birimi) karşılaştırma: JSON dosyalarının kanonik sırası. */
function karsilastir(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function siraliMi(dizi: readonly string[]): boolean {
  for (let i = 1; i < dizi.length; i++) if (karsilastir(dizi[i - 1] as string, dizi[i] as string) > 0) return false;
  return true;
}

function tekrarlar(dizi: readonly string[]): string[] {
  const goruldu = new Set<string>();
  const tekrar = new Set<string>();
  for (const x of dizi) {
    if (goruldu.has(x)) tekrar.add(x);
    goruldu.add(x);
  }
  return [...tekrar];
}

function kaynakDogrulamasi(etiket: string, dogrulandi: boolean, kaynak: readonly string[], hatalar: string[]): void {
  if (!siraliMi(kaynak)) hatalar.push(`${etiket}: kaynak dizisi alfabetik sirali olmali`);
  const tekrar = tekrarlar(kaynak);
  if (tekrar.length > 0) hatalar.push(`${etiket}: kaynak tekrar ediyor (${tekrar.join(", ")})`);
  if (dogrulandi && !kaynak.some((k) => k.startsWith("http"))) hatalar.push(`${etiket}: dogrulandi=true icin en az bir http(s) kaynak gerekli`);
}

/** Yıl boyu etkin: penceresi olmayan mal (sanayi, zanaat) ya da ham penceresinde 0 ay bulunmayan ürün. */
export function yilBoyuEtkinMi(malId: string, pencere: UrunPencereDosyasi | undefined): boolean {
  const p = pencere?.urunler[malId];
  return p === undefined || !p.ppm.includes(0);
}

/** Ürün pencere dosyasını (şema + anlamsal kurallar) doğrular. `bilinenMallar`: icerik.json mal kimlikleri + `ileride` kimlikleri. */
export function dogrulaUrunPencere(ham: unknown, bilinenMallar: ReadonlySet<string>): DogrulamaSonucu {
  const s = UrunPencereDosyaSema.safeParse(ham);
  if (!s.success) return { gecerli: false, hatalar: zodHatalari(s.error, "urun-pencere") };
  const hatalar: string[] = [];
  const y = s.data.varsayilanYogunlukPpm;
  if (y < YOGUNLUK_ALT_PPM || y > YOGUNLUK_UST_PPM) {
    hatalar.push(`urun-pencere.varsayilanYogunlukPpm ${y}, ${YOGUNLUK_ALT_PPM}-${YOGUNLUK_UST_PPM} araliginda olmali`);
  }
  const anahtarlar = Object.keys(s.data.urunler);
  if (!siraliMi(anahtarlar)) hatalar.push("urun-pencere.urunler: anahtarlar alfabetik sirali olmali");
  for (const [mal, p] of Object.entries(s.data.urunler)) {
    const e = `urun-pencere.urunler.${mal}`;
    if (YASAK_MAL_KIMLIKLERI.includes(mal)) hatalar.push(`${e}: yasak mal kimligi (${YASAK_MAL_KIMLIKLERI.join(", ")}; mal kimlik kilidi)`);
    if (!bilinenMallar.has(mal)) hatalar.push(`${e}: mal kimligi ne icerikte ne 'ileride' listesinde`);
    const toplam = p.ppm.reduce((t, x) => t + x, 0);
    if (toplam !== PENCERE_TOPLAM_PPM) hatalar.push(`${e}: ppm toplami ${toplam}, ${PENCERE_TOPLAM_PPM} olmali`);
    const sifirVar = p.ppm.includes(0);
    if (p.tur === "yil_boyu" && sifirVar) hatalar.push(`${e}: yil_boyu urunde tum aylar > 0 olmali`);
    if (p.tur === "mevsimli" && !sifirVar) hatalar.push(`${e}: mevsimli urunde en az bir ay 0 olmali (yoksa yil_boyu yazin)`);
    kaynakDogrulamasi(e, p.dogrulandi, p.kaynak, hatalar);
  }
  return sonuc(hatalar);
}

export interface IlImzaDogrulamaBaglami {
  /** Harita hiyerarşisi (hiyerarsiOzetiCikar çıktısı). */
  hiyerarsi: IlHiyerarsisi;
  /** icerik.json'daki mal kimlikleri. */
  malKimlikleri: ReadonlySet<string>;
  /** Verilirse: Alfa-0 illerinde "yıl boyu etkin imza" ve `ileride` H/tarım ürünlerinin pencere kapsamı denetlenir. */
  pencere?: UrunPencereDosyasi;
  /** Varsayılan ALFA0_ILLERI. */
  alfa0Iller?: readonly string[];
  /** Verilen her ülkenin hiyerarşideki TÜM illeri kayıtlı olmalı (varsayılan true). */
  tumIlleriZorunlu?: boolean;
}

/** il-imza dosyasını (şema + hiyerarşi/içerik/pencere çapraz kuralları) doğrular. Atmaz. */
export function dogrulaIlImza(ham: unknown, b: IlImzaDogrulamaBaglami): DogrulamaSonucu {
  const s = IlImzaDosyaSema.safeParse(ham);
  if (!s.success) return { gecerli: false, hatalar: zodHatalari(s.error, "il-imza") };
  const d = s.data;
  const hatalar: string[] = [];
  const alfa0 = b.alfa0Iller ?? ALFA0_ILLERI;

  // --- ileride listesi ---
  const ilerideKimlikleri = d.ileride.map((m) => m.malId);
  const ilerideSet = new Set(ilerideKimlikleri);
  for (const t of tekrarlar(ilerideKimlikleri)) hatalar.push(`il-imza.ileride: ${t} tekrar ediyor`);
  for (let i = 1; i < d.ileride.length; i++) {
    const a = d.ileride[i - 1] as IleridekiMal;
    const c = d.ileride[i] as IleridekiMal;
    const k = KADEME_SIRASI[a.kademe] - KADEME_SIRASI[c.kademe] || karsilastir(a.malId, c.malId);
    if (k > 0) hatalar.push(`il-imza.ileride: kanonik sira (kademe, malId) bozuk (${a.malId} -> ${c.malId})`);
  }
  for (const m of d.ileride) {
    if (b.malKimlikleri.has(m.malId)) hatalar.push(`il-imza.ileride.${m.malId}: mal artik icerik.json'da var; 'ileride' listesinden silin ve imzalardaki planli degerini false yapin`);
    if (YASAK_MAL_KIMLIKLERI.includes(m.malId)) hatalar.push(`il-imza.ileride.${m.malId}: yasak mal kimligi (mal kimlik kilidi: tekstil -> kumas + hazir_giyim; sarkuteri mal degil, sut_urunu)`);
    if (m.tur === "A" && b.pencere?.urunler[m.malId] !== undefined) hatalar.push(`il-imza.ileride.${m.malId}: islenmis (A) mal pencere almaz (mevsimsizdir)`);
    if (m.kademe === "t2" && m.tur === undefined) hatalar.push(`il-imza.ileride.${m.malId}: t2 icin tur (H/A/S) gerekli`);
    if (m.kademe !== "t2" && m.tur !== undefined) hatalar.push(`il-imza.ileride.${m.malId}: tur yalniz t2 icin olur`);
    if (b.pencere !== undefined && m.tur === "H" && b.pencere.urunler[m.malId] === undefined) {
      hatalar.push(`il-imza.ileride.${m.malId}: tarim (H) urunu icin urun-pencere kaydi yok`);
    }
  }
  for (const mal of b.malKimlikleri) {
    if (YASAK_MAL_KIMLIKLERI.includes(mal)) hatalar.push(`icerik mal kimligi ${mal}: yasak mal kimligi (mal kimlik kilidi)`);
  }
  const bilinen = (malId: string): boolean => b.malKimlikleri.has(malId) || ilerideSet.has(malId);

  // --- iller ---
  const ilKimlikleri = d.iller.map((k) => k.il);
  for (const t of tekrarlar(ilKimlikleri)) hatalar.push(`il-imza.iller: ${t} tekrar ediyor`);
  if (!siraliMi(ilKimlikleri)) hatalar.push("il-imza.iller: il kimligine gore alfabetik sirali olmali");
  const tumCografiKimlikleri: string[] = [];
  const kullanilanUlkeler = new Set<string>();

  for (const k of d.iller) {
    const e = `il-imza.iller.${k.il}`;
    const h = b.hiyerarsi.get(k.il);
    if (h === undefined) {
      hatalar.push(`${e}: il hiyerarsi.json'da yok`);
    } else {
      if (h.ulke !== k.ulke.toLowerCase()) hatalar.push(`${e}: ulke ${k.ulke}, hiyerarsideki ulke "${h.ulke}" ile uyusmuyor`);
      if (h.ad !== k.ad) hatalar.push(`${e}: ad "${k.ad}", hiyerarsideki ad "${h.ad}" ile uyusmuyor`);
    }
    kullanilanUlkeler.add(k.ulke.toLowerCase());
    if (k.iklimTipiEk !== undefined && k.iklimTipiEk === k.iklimTipi) hatalar.push(`${e}: iklimTipiEk, iklimTipi ile ayni olamaz`);

    const ilceGecerli = (ilceler: readonly string[] | undefined, etiket: string): void => {
      if (ilceler === undefined) return;
      if (!siraliMi(ilceler)) hatalar.push(`${etiket}: ilceler alfabetik sirali olmali`);
      for (const t of tekrarlar(ilceler)) hatalar.push(`${etiket}: ilce ${t} tekrar ediyor`);
      if (h === undefined) return;
      for (const c of ilceler) if (!h.ilceler.has(c)) hatalar.push(`${etiket}: ilce ${c} bu ilin ilcesi degil (hiyerarsi)`);
    };

    // imza ve aday malları (aday: bonus yok; aynı kurallar, çarpan hariç)
    const malListesi = (liste: ReadonlyArray<IlImzaMali | IlAdayMal>, ad: "imza" | "aday"): void => {
      for (const t of tekrarlar(liste.map((m) => m.malId))) hatalar.push(`${e}.${ad}: ${t} tekrar ediyor`);
      for (let i = 1; i < liste.length; i++) {
        const a = liste[i - 1] as IlImzaMali | IlAdayMal;
        const c = liste[i] as IlImzaMali | IlAdayMal;
        const sira = KADEME_SIRASI[a.kademe] - KADEME_SIRASI[c.kademe] || karsilastir(a.malId, c.malId);
        if (sira > 0) hatalar.push(`${e}.${ad}: kanonik sira (kademe, malId) bozuk (${a.malId} -> ${c.malId})`);
      }
      for (const m of liste) {
        const em = `${e}.${ad}.${m.malId}`;
        if (YASAK_MAL_KIMLIKLERI.includes(m.malId)) hatalar.push(`${em}: yasak mal kimligi (${YASAK_MAL_KIMLIKLERI.join(", ")}; mal kimlik kilidi)`);
        if (!bilinen(m.malId)) hatalar.push(`${em}: mal kimligi ne icerikte ne 'ileride' listesinde`);
        const icerikte = b.malKimlikleri.has(m.malId);
        if (m.planli === icerikte) hatalar.push(`${em}: planli=${String(m.planli)} ama mal icerikte ${icerikte ? "VAR" : "YOK"} (planli = icerikte yok)`);
        if (m.planli && !ilerideSet.has(m.malId)) hatalar.push(`${em}: planli mal 'ileride' listesinde olmali`);
        if (!m.planli && ilerideSet.has(m.malId)) hatalar.push(`${em}: planli olmayan mal 'ileride' listesinde olmamali`);
        const ileriMal = d.ileride.find((x) => x.malId === m.malId);
        if (ileriMal !== undefined && ileriMal.kademe !== m.kademe) hatalar.push(`${em}: kademe ${m.kademe}, 'ileride' katalogunda ${ileriMal.kademe}`);
        ilceGecerli(m.ilceler, em);
        kaynakDogrulamasi(em, m.dogrulandi, m.kaynak, hatalar);
      }
    };
    malListesi(k.imza, "imza");
    malListesi(k.aday, "aday");
    const imzaKimlikleri = new Set(k.imza.map((m) => m.malId));
    for (const m of k.aday) if (imzaKimlikleri.has(m.malId)) hatalar.push(`${e}.aday.${m.malId}: ayni mal hem imza hem aday olamaz`);
    for (const m of k.imza) {
      if (m.carpanPpm < IMZA_CARPAN_NOTR_PPM || m.carpanPpm > IMZA_CARPAN_UST_PPM) {
        hatalar.push(`${e}.imza.${m.malId}: carpanPpm ${m.carpanPpm}, ${IMZA_CARPAN_NOTR_PPM}-${IMZA_CARPAN_UST_PPM} araliginda olmali`);
      }
    }
    // her ilde: imza sayisi en cok 4; bir ilcede en cok 2 imza
    if (k.imza.length > IMZA_EN_COK) hatalar.push(`${e}: imza sayisi ${k.imza.length}, en cok ${IMZA_EN_COK} olmali (fazlasi 'aday' olur)`);
    const ilceImzaSayisi = new Map<string, number>();
    for (const m of k.imza) for (const c of m.ilceler ?? []) ilceImzaSayisi.set(c, (ilceImzaSayisi.get(c) ?? 0) + 1);
    for (const [c, n] of ilceImzaSayisi) {
      if (n > ILCE_BASINA_EN_COK_IMZA) hatalar.push(`${e}: ilce ${c} icin ${n} imza var, en cok ${ILCE_BASINA_EN_COK_IMZA} olmali`);
    }

    // coğrafi işaretler
    const cografiKimlikleri = k.cografiIsaretler.map((g) => g.kimlik);
    if (!siraliMi(cografiKimlikleri)) hatalar.push(`${e}.cografiIsaretler: kimlige gore alfabetik sirali olmali`);
    for (const g of k.cografiIsaretler) {
      const eg = `${e}.cografiIsaretler.${g.kimlik}`;
      tumCografiKimlikleri.push(g.kimlik);
      if (!g.kimlik.startsWith(`ci_${k.il}_`)) hatalar.push(`${eg}: kimlik "ci_${k.il}_" ile baslamali`);
      if (g.malId !== undefined && YASAK_MAL_KIMLIKLERI.includes(g.malId)) hatalar.push(`${eg}: yasak mal kimligi ${g.malId} (mal kimlik kilidi)`);
      if (g.malId !== undefined && !bilinen(g.malId)) hatalar.push(`${eg}: malId ${g.malId} ne icerikte ne 'ileride' listesinde`);
      if (!siraliMi(g.koruma)) hatalar.push(`${eg}: koruma alfabetik sirali olmali`);
      ilceGecerli(g.ilceler, eg);
      kaynakDogrulamasi(eg, g.dogrulandi, g.kaynak, hatalar);
    }

    // Alfa-0 / tam kapsam kuralları
    if (k.kapsam === "tam" || alfa0.includes(k.il)) {
      if (alfa0.includes(k.il) && k.kapsam !== "tam") hatalar.push(`${e}: Alfa-0 ili kapsam "tam" olmali`);
      if (k.imza.length < IMZA_EN_AZ || k.imza.length > IMZA_EN_COK) {
        hatalar.push(`${e}: tam kapsamda imza sayisi ${IMZA_EN_AZ}-${IMZA_EN_COK} olmali (su an ${k.imza.length})`);
      }
      if (k.cografiIsaretler.length === 0) hatalar.push(`${e}: tam kapsamda en az bir cografi isaret kaydi olmali`);
      for (const m of k.imza) {
        if (m.carpanPpm !== IMZA_CARPAN_UST_PPM) hatalar.push(`${e}.imza.${m.malId}: tam kapsamda carpanPpm ${IMZA_CARPAN_UST_PPM} (+%10) olmali`);
      }
      if (b.pencere !== undefined && !k.imza.some((m) => yilBoyuEtkinMi(m.malId, b.pencere))) {
        hatalar.push(`${e}: yil boyu etkin imza yok (en az bir imza penceresiz ya da ham penceresinde 0 ay olmayan bir mal olmali)`);
      }
    }
  }
  for (const t of tekrarlar(tumCografiKimlikleri)) hatalar.push(`il-imza: cografi isaret kimligi ${t} tekrar ediyor`);

  // her ülkenin tüm illeri kayıtlı olmalı
  if (b.tumIlleriZorunlu !== false) {
    const kayitli = new Set(ilKimlikleri);
    for (const [il, h] of b.hiyerarsi) {
      if (kullanilanUlkeler.has(h.ulke) && !kayitli.has(il)) hatalar.push(`il-imza: ${il} (${h.ad}) icin kayit yok`);
    }
  }
  for (const a of alfa0) if (!ilKimlikleri.includes(a)) hatalar.push(`il-imza: Alfa-0 ili ${a} icin kayit yok`);

  return sonuc(hatalar);
}

export interface IlImzaPaketi {
  ilImza: unknown;
  urunPencere: unknown;
  /** Ham harita hiyerarşisi (hiyerarsi.json). */
  hiyerarsi: unknown;
  /** icerik.json mal kimlikleri. */
  malKimlikleri: Iterable<string>;
}

/**
 * İki dosyayı ve çapraz kuralları birlikte doğrular (dosya sistemine dokunmaz).
 * Geçerliyse tipli (zod ayrıştırılmış, kanonik anahtar sıralı) nesneleri döndürmek için `ilImzaPaketiniAyristir` kullanın.
 */
export function dogrulaIlImzaPaketi(p: IlImzaPaketi, secenek: { alfa0Iller?: readonly string[]; tumIlleriZorunlu?: boolean } = {}): DogrulamaSonucu {
  const hatalar: string[] = [];
  const mallar = new Set(p.malKimlikleri);
  const hiyerarsi = hiyerarsiOzetiCikar(p.hiyerarsi);
  const imza = IlImzaDosyaSema.safeParse(p.ilImza);
  const pencere = UrunPencereDosyaSema.safeParse(p.urunPencere);
  const bilinen = new Set(mallar);
  if (imza.success) for (const m of imza.data.ileride) bilinen.add(m.malId);
  const pr = dogrulaUrunPencere(p.urunPencere, bilinen);
  if (!pr.gecerli) hatalar.push(...pr.hatalar);
  const ir = dogrulaIlImza(p.ilImza, {
    hiyerarsi,
    malKimlikleri: mallar,
    pencere: pencere.success ? pencere.data : undefined,
    alfa0Iller: secenek.alfa0Iller,
    tumIlleriZorunlu: secenek.tumIlleriZorunlu,
  });
  if (!ir.gecerli) hatalar.push(...ir.hatalar);
  if (pencere.success && imza.success && !imza.data.iller.some((k) => k.ulke === pencere.data.ulke)) {
    hatalar.push(`urun-pencere: ulke ${pencere.data.ulke} icin il-imza kaydi yok`);
  }
  return sonuc(hatalar);
}

/** Geçerli ham veriyi tipli nesnelere çevirir (zod çıktısı: anahtar sırası şemadaki gibi). Geçersizse Error fırlatır. */
export function ilImzaPaketiniAyristir(p: IlImzaPaketi, secenek: { alfa0Iller?: readonly string[]; tumIlleriZorunlu?: boolean } = {}): { ilImza: IlImzaDosyasi; urunPencere: UrunPencereDosyasi } {
  const r = dogrulaIlImzaPaketi(p, secenek);
  if (!r.gecerli) throw new Error(`Il imza verisi gecersiz:\n - ${r.hatalar.join("\n - ")}`);
  return { ilImza: IlImzaDosyaSema.parse(p.ilImza), urunPencere: UrunPencereDosyaSema.parse(p.urunPencere) };
}

// ---------------------------------------------------------------------------
// Sorgu yardımcıları ve kanonik biçim
// ---------------------------------------------------------------------------

/** İl kimliği -> kayıt (okuma amaçlı dizin). */
export function ilImzaIndeksi(d: IlImzaDosyasi): ReadonlyMap<string, IlImzaKaydi> {
  return new Map(d.iller.map((k) => [k.il, k]));
}

/** HAM pencere ppm değeri: ay 0 = Ocak ... 11 = Aralık. Pencere yoksa PPM (düz akış) döner. */
export function urunPencereAyPpm(d: UrunPencereDosyasi, malId: string, ay: number): number {
  const p = d.urunler[malId];
  if (p === undefined) return PENCERE_PPM;
  if (!Number.isInteger(ay) || ay < 0 || ay >= PENCERE_AY_SAYISI) throw new Error(`Gecersiz ay: ${ay}`);
  return p.ppm[ay] as number;
}

/**
 * Ürün profili (rapor §4.5): profil[ay] = (PPM - y) + y x pencere[ay] / PPM; y = yogunlukPpm (0 = düz akış, PPM = ham pencere).
 * Tamsayı: her ay için y x pencere / PPM aşağı yuvarlanır; toplam tam 12 000 000 olacak şekilde artan kalan, EN BÜYÜK pencere değerli aya
 * (eşitlikte küçük ay indeksine) eklenir. Her ay >= PPM - y. Saf ve deterministiktir.
 * `pencere`: 12 aylık HAM ppm, toplam PENCERE_TOPLAM_PPM; aksi halde Error fırlatır.
 */
export function urunProfiliPpm(pencere: readonly number[], yogunlukPpm: number): number[] {
  if (pencere.length !== PENCERE_AY_SAYISI) throw new Error(`Pencere ${PENCERE_AY_SAYISI} aylik olmali`);
  if (!Number.isInteger(yogunlukPpm) || yogunlukPpm < 0 || yogunlukPpm > PENCERE_PPM) throw new Error(`Gecersiz yogunluk: ${yogunlukPpm}`);
  let toplam = 0;
  for (const p of pencere) {
    if (!Number.isInteger(p) || p < 0) throw new Error(`Gecersiz pencere degeri: ${p}`);
    toplam += p;
  }
  if (toplam !== PENCERE_TOPLAM_PPM) throw new Error(`Pencere toplami ${toplam}, ${PENCERE_TOPLAM_PPM} olmali`);
  const taban = PENCERE_PPM - yogunlukPpm;
  const profil = pencere.map((p) => {
    const carpim = yogunlukPpm * p;
    return taban + (carpim - (carpim % PENCERE_PPM)) / PENCERE_PPM;
  });
  const kalan = PENCERE_TOPLAM_PPM - profil.reduce((t, x) => t + x, 0);
  if (kalan > 0) {
    let en = 0;
    for (let i = 1; i < PENCERE_AY_SAYISI; i++) if ((pencere[i] as number) > (pencere[en] as number)) en = i;
    profil[en] = (profil[en] as number) + kalan;
  }
  return profil;
}

/**
 * Kanonik dosya metni: 1 boşluk girinti, sonda yeni satır, anahtar sırası şema sırası (ayrıştırılmış nesne).
 * Veri dosyalarının satır satır karşılaştırılabilir ve deterministik kalmasını sağlar.
 */
export function kanonikMetin(veri: unknown): string {
  return JSON.stringify(veri, null, 1) + "\n";
}

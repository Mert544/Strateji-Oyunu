/**
 * Deterministik sentetik harita üreticisi.
 *
 * Çalıştırma: `pnpm harita:uret` -> packages/veri/haritalar/sentetik-50.json
 *
 * Kurgusal dünya (gerçek ülke/yer yok):
 * - İki kara kütlesi (batı, doğu) bir boğazla ayrılır; boğazın ortasında tek bir ada vardır.
 * - Her kara kütlesi, üzerinde iki "dar_gecit" bölgesi bulunan bir dağ sırasıyla kuzey ve güney
 *   yarıya bölünür. Kuzey ve güney yarı arasındaki kara bağlantıları yalnızca bu geçitler ile
 *   bir yavaş dağ yolu üzerinden geçer (asıl darboğaz). Deniz ve hava kenarları alternatiftir.
 * - 4 devlet: askan (batı-kuzey), carvan (batı-güney), belora (doğu-kuzey), dorsa (doğu-güney + ada).
 *   İki blok: kuzey_pakti (askan + belora), guney_birligi (carvan + dorsa).
 * - Kaynaklar KASITLI olarak dengesiz: askan tarım ovası, carvan cevher dağları, belora petrol kıyısı
 *   ve bakır/silis çölü, dorsa kömür ve sanayi. Her devletin zinciri tek başına eksiktir.
 *
 * Tarım alanı (B1) bölge etiketinden ve devletten SABİT kurallarla türetilir (rastgelelik yok; PRNG akışı etkilenmez):
 * ova 1 000 000 / kıyı 800 000 / dağ 400 000 toprak tabanı (devlet verimlilik çarpanıyla), iklim tipi devletin iklim
 * kuşağından (dağ etiketi her zaman dag_yayla), tarım tesisi tavanı ova 3 / kıyı, dağ 2, sulanabilir alan 600 000 / 400 000 / 100 000.
 *
 * Rastgelelik yalnızca küçük sapmalar içindir (koordinat, nüfus, rezerv, kapasite) ve kendi tohumlu
 * PRNG'sinden gelir; Math.random kullanılmaz. Aynı tohum -> bayt bayt aynı çıktı.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BolgeTanimi, BolgeTarimTanimi, DevletTanimi, Etiket, HaritaDosyasi, IklimTipi, KenarTanimi } from "./tipler";

export const VARSAYILAN_TOHUM = 20260930;

// ---------------------------------------------------------------------------
// Küçük tohumlu PRNG (mulberry32), tamsayı çıktı
// ---------------------------------------------------------------------------

class Prng {
  private durum: number;
  constructor(tohum: number) {
    this.durum = tohum >>> 0;
  }
  /** [0, 2^32) aralığında tamsayı. */
  private sonraki(): number {
    this.durum = (this.durum + 0x6d2b79f5) >>> 0;
    let t = this.durum;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  /** [min, maks] (her iki uç dahil) tamsayı. */
  aralik(min: number, maks: number): number {
    return min + (this.sonraki() % (maks - min + 1));
  }
}

// ---------------------------------------------------------------------------
// Bölge taslakları
// ---------------------------------------------------------------------------

interface Taslak {
  id: string;
  ad: string;
  devlet: string;
  etiketler: Etiket[];
  /** Başlangıç nüfusu, bin kişi (üretimde ±%8 sapar). */
  nufusBin: number;
  /** Ham rezerv, bin birim (üretimde ±%15 sapar). */
  rezervBin: Record<string, number>;
  tesisler: string[];
  x: number;
  y: number;
}

function t(
  id: string,
  ad: string,
  devlet: string,
  x: number,
  y: number,
  etiketler: Etiket[],
  nufusBin: number,
  rezervBin: Record<string, number>,
  tesisler: string[],
): Taslak {
  return { id, ad, devlet, etiketler, nufusBin, rezervBin, tesisler, x, y };
}

const DEVLETLER: DevletTanimi[] = [
  { id: "askan", ad: "Askan Cumhuriyeti", blok: "kuzey_pakti" },
  { id: "belora", ad: "Belora Emirliği", blok: "kuzey_pakti" },
  { id: "carvan", ad: "Carvan Birliği", blok: "guney_birligi" },
  { id: "dorsa", ad: "Dorsa Federasyonu", blok: "guney_birligi" },
];

/**
 * Devlet -> tarım kuşağı: toprak verimlilik çarpanı (ppm) ve ova / kıyı iklim tipi. Dağ etiketi her devlette dag_yayla.
 * Askan: bereketli kuzey ovası (Tuna benzeri kıta ikliminde ova, Karadeniz benzeri kıyı); Carvan: Akdeniz kuşağı;
 * Belora: sıcak-kurak çöl kuşağı (düşük toprak, kurak); Dorsa: karasal ova, Akdeniz kıyı.
 */
const TARIM_KUSAGI: Record<string, { toprakPpm: number; ova: IklimTipi; kiyi: IklimTipi }> = {
  askan: { toprakPpm: 1_100_000, ova: "balkan_kita", kiyi: "karadeniz" },
  carvan: { toprakPpm: 900_000, ova: "akdeniz", kiyi: "akdeniz" },
  belora: { toprakPpm: 600_000, ova: "kurak", kiyi: "kurak" },
  dorsa: { toprakPpm: 1_000_000, ova: "karasal", kiyi: "akdeniz" },
};

/** Başlangıçta tarım tesisi sayılan türler (tavan alt sınırı için). */
const TARIM_TESISLERI: readonly string[] = ["ciftlik", "ahir", "mera"];

/** Bölge taslağının tarım alanı; ova, kıyı veya dağ etiketi ya da tarım tesisi yoksa undefined (tarım dışı). */
function tarimTuret(tk: Taslak): BolgeTarimTanimi | undefined {
  const ova = tk.etiketler.includes("ova");
  const kiyi = tk.etiketler.includes("kiyi");
  const dag = tk.etiketler.includes("dag");
  const baslangicTarim = tk.tesisler.filter((x) => TARIM_TESISLERI.includes(x)).length;
  if (!ova && !kiyi && !dag && baslangicTarim === 0) return undefined;
  const kusak = TARIM_KUSAGI[tk.devlet] ?? { toprakPpm: 1_000_000, ova: "karasal" as IklimTipi, kiyi: "akdeniz" as IklimTipi };
  const taban = ova ? 1_000_000 : kiyi ? 800_000 : dag ? 400_000 : 600_000;
  const toprak = kisitla(yuvarla((taban * kusak.toprakPpm) / 1_000_000, 10_000), 300_000, 1_200_000);
  const iklimTipi: IklimTipi = dag && !kiyi ? "dag_yayla" : ova ? kusak.ova : kiyi ? kusak.kiyi : "karasal";
  return {
    toprakTabanPpm: toprak,
    iklimTipi,
    tarimTesisTavani: Math.max(ova ? 3 : 2, baslangicTarim),
    sulanabilirPpm: ova ? 600_000 : kiyi ? 400_000 : 100_000,
  };
}

const TASLAKLAR: Taslak[] = [
  // --- ASKAN (batı kara kütlesi, kuzey yarı): tarım ovası, kömür; cevher az, petrol/bakır yok ---
  t("ak_ova", "Ak Ova", "askan", 90, 110, ["ova", "kiyi"], 110, { tahil: 900 }, ["ciftlik"]),
  t("bereket_dizi", "Bereket Dizi", "askan", 220, 100, ["ova"], 140, { tahil: 1100 }, ["ciftlik", "gida_fabrikasi"]),
  t("kuzey_burun", "Kuzey Burun", "askan", 350, 115, ["kiyi"], 70, { komur: 350 }, ["komur_ocagi"]),
  t("yelken_limani", "Yelken Limanı", "askan", 60, 235, ["kiyi", "liman"], 190, { komur: 300 }, ["komur_ocagi"]),
  t("askan_kenti", "Askan Kenti", "askan", 165, 240, ["ova"], 520, { tahil: 700 }, ["ciftlik", "gida_fabrikasi"]),
  t("sis_tepeleri", "Sis Tepeleri", "askan", 280, 230, ["dag"], 90, { komur: 500, cevher: 150 }, ["komur_ocagi", "cevher_madeni"]),
  t("kopuk_limani", "Köpük Limanı", "askan", 385, 240, ["kiyi", "liman"], 230, {}, ["gida_fabrikasi"]),
  t("duman_koyu", "Duman Koyu", "askan", 110, 365, ["kiyi", "ova"], 100, { silis: 250 }, ["silis_ocagi"]),
  t("orta_ova", "Orta Ova", "askan", 240, 360, ["ova"], 160, { tahil: 1000 }, ["ciftlik"]),
  t("tas_kapi", "Taş Kapı", "askan", 355, 370, ["kiyi"], 80, { komur: 250 }, ["komur_ocagi"]),
  t("kurt_gecidi", "Kurt Geçidi", "askan", 150, 490, ["dar_gecit"], 50, { komur: 120 }, ["komur_ocagi"]),
  t("kara_zirve", "Kara Zirve", "askan", 395, 470, ["dag"], 55, { cevher: 180 }, ["cevher_madeni"]),

  // --- CARVAN (batı kara kütlesi, güney yarı): cevher dağları, çelik; gıda az, petrol yok ---
  t("demir_dagi", "Demir Dağı", "carvan", 100, 620, ["dag"], 90, { cevher: 700 }, ["cevher_madeni"]),
  t("kor_ocak", "Kor Ocak", "carvan", 215, 610, ["dag"], 100, { cevher: 900, komur: 300 }, ["cevher_madeni", "komur_ocagi"]),
  t("cam_vadisi", "Cam Vadisi", "carvan", 325, 625, [], 85, { silis: 400 }, ["silis_ocagi"]),
  t("gumus_limani", "Gümüş Limanı", "carvan", 60, 745, ["kiyi", "liman"], 200, {}, ["celikhane"]),
  t("carvan_kenti", "Carvan Kenti", "carvan", 165, 740, ["ova"], 480, { tahil: 300 }, ["ciftlik", "gida_fabrikasi", "celikhane"]),
  t("cevre_kalesi", "Çevre Kalesi", "carvan", 275, 745, ["dag"], 120, { cevher: 600 }, ["cevher_madeni"]),
  t("sisli_liman", "Sisli Liman", "carvan", 385, 740, ["kiyi", "liman"], 240, {}, ["parca_fabrikasi"]),
  t("tuz_koyu", "Tuz Koyu", "carvan", 110, 870, ["kiyi"], 75, { komur: 250 }, ["komur_ocagi"]),
  t("gun_batimi", "Gün Batımı", "carvan", 240, 875, ["ova", "kiyi"], 110, { tahil: 150 }, ["ciftlik", "gida_fabrikasi"]),
  t("kuru_kiyi", "Kuru Kıyı", "carvan", 355, 865, ["kiyi"], 80, { komur: 450 }, ["komur_ocagi"]),
  t("demir_gecit", "Demir Geçit", "carvan", 330, 490, ["dar_gecit"], 50, { silis: 150 }, ["silis_ocagi"]),
  t("yalin_zirve", "Yalın Zirve", "carvan", 245, 495, ["dag"], 55, { cevher: 300 }, ["cevher_madeni"]),
  t("golge_tepe", "Gölge Tepe", "carvan", 45, 520, ["dag"], 50, { bakir: 150 }, ["bakir_madeni"]),

  // --- BELORA (doğu kara kütlesi, kuzey yarı): petrol kıyısı, bakır/silis çölü; gıda az, cevher/kömür yok ---
  t("kum_burnu", "Kum Burnu", "belora", 650, 110, ["kiyi"], 75, { petrol: 500 }, ["petrol_kuyusu"]),
  t("altin_col", "Altın Çöl", "belora", 780, 100, [], 60, { bakir: 700 }, ["bakir_madeni"]),
  t("gunes_kumulu", "Güneş Kumulu", "belora", 910, 115, ["kiyi"], 70, { silis: 800 }, ["silis_ocagi"]),
  t("inci_limani", "İnci Limanı", "belora", 615, 235, ["kiyi", "liman"], 230, { petrol: 250 }, ["rafineri"]),
  t("vaha_kenti", "Vaha Kenti", "belora", 725, 240, ["ova"], 180, { tahil: 400 }, ["ciftlik", "gida_fabrikasi"]),
  t("belora_kenti", "Belora Kenti", "belora", 835, 230, [], 500, { bakir: 400 }, ["bakir_madeni", "elektronik_fabrikasi"]),
  t("dogu_limani", "Doğu Limanı", "belora", 940, 240, ["kiyi", "liman"], 210, { petrol: 900 }, ["petrol_kuyusu", "rafineri"]),
  t("kizil_kaya", "Kızıl Kaya", "belora", 640, 365, ["dag"], 65, { bakir: 300 }, ["bakir_madeni"]),
  t("orta_col", "Orta Çöl", "belora", 770, 360, [], 85, { petrol: 400 }, ["petrol_kuyusu"]),
  t("yel_burnu", "Yel Burnu", "belora", 890, 370, ["kiyi"], 90, { silis: 450 }, ["silis_ocagi"]),
  t("kum_gecidi", "Kum Geçidi", "belora", 700, 490, ["dar_gecit"], 50, { bakir: 120 }, ["bakir_madeni"]),
  t("kuru_tepe", "Kuru Tepe", "belora", 605, 470, ["dag"], 50, { silis: 150 }, ["silis_ocagi"]),

  // --- DORSA (doğu kara kütlesi, güney yarı + ada): kömür ve sanayi; elektronik zinciri eksik ---
  t("sanayi_ovasi", "Sanayi Ovası", "dorsa", 660, 620, ["ova"], 200, { tahil: 600 }, ["ciftlik", "gida_fabrikasi"]),
  t("komur_havzasi", "Kömür Havzası", "dorsa", 790, 610, [], 150, { komur: 900, cevher: 250 }, ["komur_ocagi", "cevher_madeni"]),
  t("tuz_golu", "Tuz Gölü", "dorsa", 910, 625, ["kiyi"], 90, { petrol: 250 }, ["petrol_kuyusu"]),
  t("celik_limani", "Çelik Limanı", "dorsa", 615, 745, ["kiyi", "liman"], 250, {}, ["celikhane"]),
  t("dorsa_kenti", "Dorsa Kenti", "dorsa", 725, 740, ["ova"], 560, { tahil: 400 }, ["ciftlik", "parca_fabrikasi", "muhimmat_fabrikasi"]),
  t("tas_ova", "Taş Ova", "dorsa", 835, 745, ["ova"], 140, { tahil: 700 }, ["ciftlik", "gida_fabrikasi"]),
  t("gundogumu_limani", "Gündoğumu Limanı", "dorsa", 940, 740, ["kiyi", "liman"], 220, {}, ["rafineri"]),
  t("bati_yamaci", "Batı Yamacı", "dorsa", 650, 870, ["kiyi"], 100, { silis: 200 }, ["silis_ocagi"]),
  t("yesil_vadi", "Yeşil Vadi", "dorsa", 770, 875, ["ova", "kiyi"], 130, { tahil: 500 }, ["ciftlik", "gida_fabrikasi"]),
  t("tas_gecit", "Taş Geçit", "dorsa", 880, 490, ["dar_gecit"], 50, { komur: 100 }, ["komur_ocagi"]),
  t("ulu_dag", "Ulu Dağ", "dorsa", 790, 495, ["dag"], 55, { cevher: 350 }, ["cevher_madeni"]),
  t("gri_tepe", "Gri Tepe", "dorsa", 950, 520, ["dag"], 50, { komur: 300 }, ["komur_ocagi"]),
  t("hilal_adasi", "Hilal Adası", "dorsa", 500, 500, ["kiyi", "liman"], 120, { petrol: 350 }, ["petrol_kuyusu"]),
];

// ---------------------------------------------------------------------------
// Kenar listeleri
// ---------------------------------------------------------------------------

/** Kara kenarları. Dağ sırasını yalnızca geçitler ve bir yavaş dağ yolu (yalin_zirve / ulu_dag) aşar. */
const KARA_KENARLAR: Array<[string, string]> = [
  // Batı-kuzey (askan)
  ["ak_ova", "bereket_dizi"], ["bereket_dizi", "kuzey_burun"],
  ["yelken_limani", "askan_kenti"], ["askan_kenti", "sis_tepeleri"], ["sis_tepeleri", "kopuk_limani"],
  ["duman_koyu", "orta_ova"], ["orta_ova", "tas_kapi"],
  ["ak_ova", "yelken_limani"], ["ak_ova", "askan_kenti"], ["bereket_dizi", "askan_kenti"],
  ["bereket_dizi", "sis_tepeleri"], ["kuzey_burun", "sis_tepeleri"], ["kuzey_burun", "kopuk_limani"],
  ["yelken_limani", "duman_koyu"], ["askan_kenti", "duman_koyu"], ["askan_kenti", "orta_ova"],
  ["sis_tepeleri", "orta_ova"], ["sis_tepeleri", "tas_kapi"], ["kopuk_limani", "tas_kapi"],
  // Batı dağ sırası
  ["kurt_gecidi", "duman_koyu"], ["kurt_gecidi", "orta_ova"], ["kurt_gecidi", "demir_dagi"], ["kurt_gecidi", "kor_ocak"],
  ["demir_gecit", "tas_kapi"], ["demir_gecit", "cam_vadisi"],
  ["yalin_zirve", "orta_ova"], ["yalin_zirve", "kor_ocak"],
  ["kara_zirve", "tas_kapi"], ["golge_tepe", "demir_dagi"],
  // Batı-güney (carvan)
  ["demir_dagi", "kor_ocak"], ["kor_ocak", "cam_vadisi"],
  ["gumus_limani", "carvan_kenti"], ["carvan_kenti", "cevre_kalesi"], ["cevre_kalesi", "sisli_liman"],
  ["tuz_koyu", "gun_batimi"], ["gun_batimi", "kuru_kiyi"],
  ["demir_dagi", "gumus_limani"], ["demir_dagi", "carvan_kenti"], ["kor_ocak", "carvan_kenti"],
  ["kor_ocak", "cevre_kalesi"], ["cam_vadisi", "cevre_kalesi"], ["cam_vadisi", "sisli_liman"],
  ["gumus_limani", "tuz_koyu"], ["carvan_kenti", "tuz_koyu"], ["carvan_kenti", "gun_batimi"],
  ["cevre_kalesi", "gun_batimi"], ["cevre_kalesi", "kuru_kiyi"], ["sisli_liman", "kuru_kiyi"],
  // Doğu-kuzey (belora)
  ["kum_burnu", "altin_col"], ["altin_col", "gunes_kumulu"],
  ["inci_limani", "vaha_kenti"], ["vaha_kenti", "belora_kenti"], ["belora_kenti", "dogu_limani"],
  ["kizil_kaya", "orta_col"], ["orta_col", "yel_burnu"],
  ["kum_burnu", "inci_limani"], ["kum_burnu", "vaha_kenti"], ["altin_col", "vaha_kenti"],
  ["altin_col", "belora_kenti"], ["gunes_kumulu", "belora_kenti"], ["gunes_kumulu", "dogu_limani"],
  ["inci_limani", "kizil_kaya"], ["vaha_kenti", "kizil_kaya"], ["vaha_kenti", "orta_col"],
  ["belora_kenti", "orta_col"], ["belora_kenti", "yel_burnu"], ["dogu_limani", "yel_burnu"],
  // Doğu dağ sırası
  ["kum_gecidi", "kizil_kaya"], ["kum_gecidi", "orta_col"], ["kum_gecidi", "sanayi_ovasi"], ["kum_gecidi", "komur_havzasi"],
  ["tas_gecit", "yel_burnu"], ["tas_gecit", "tuz_golu"],
  ["ulu_dag", "orta_col"], ["ulu_dag", "komur_havzasi"],
  ["kuru_tepe", "kizil_kaya"], ["gri_tepe", "tuz_golu"],
  // Doğu-güney (dorsa)
  ["sanayi_ovasi", "komur_havzasi"], ["komur_havzasi", "tuz_golu"],
  ["celik_limani", "dorsa_kenti"], ["dorsa_kenti", "tas_ova"], ["tas_ova", "gundogumu_limani"],
  ["bati_yamaci", "yesil_vadi"],
  ["sanayi_ovasi", "celik_limani"], ["sanayi_ovasi", "dorsa_kenti"], ["komur_havzasi", "dorsa_kenti"],
  ["komur_havzasi", "tas_ova"], ["tuz_golu", "tas_ova"], ["tuz_golu", "gundogumu_limani"],
  ["celik_limani", "bati_yamaci"], ["dorsa_kenti", "bati_yamaci"], ["dorsa_kenti", "yesil_vadi"],
  ["tas_ova", "yesil_vadi"],
];

/** Deniz kenarları: [a, b, süre saat]. Yalnızca liman (kıyı) bölgeleri arasında. */
const DENIZ_KENARLAR: Array<[string, string, number]> = [
  ["kopuk_limani", "inci_limani", 26],
  ["sisli_liman", "celik_limani", 26],
  ["hilal_adasi", "kopuk_limani", 24],
  ["hilal_adasi", "inci_limani", 24],
  ["hilal_adasi", "sisli_liman", 28],
  ["hilal_adasi", "celik_limani", 28],
  ["kopuk_limani", "sisli_liman", 36],
  ["inci_limani", "celik_limani", 36],
  ["yelken_limani", "gumus_limani", 48],
  ["dogu_limani", "gundogumu_limani", 48],
  ["yelken_limani", "dogu_limani", 72],
  ["gumus_limani", "gundogumu_limani", 72],
];

/** Hava kenarları: [a, b, süre saat]. Düşük kapasite, hızlı. */
const HAVA_KENARLAR: Array<[string, string, number]> = [
  ["askan_kenti", "belora_kenti", 4],
  ["carvan_kenti", "dorsa_kenti", 4],
  ["askan_kenti", "carvan_kenti", 3],
  ["belora_kenti", "dorsa_kenti", 3],
];

// ---------------------------------------------------------------------------
// Üretim
// ---------------------------------------------------------------------------

function yuvarla(deger: number, birim: number): number {
  return Math.round(deger / birim) * birim;
}

function kisitla(deger: number, alt: number, ust: number): number {
  return Math.min(ust, Math.max(alt, deger));
}

/** Verilen tohumla sentetik haritayı üretir. Aynı tohum her zaman aynı sonucu verir. */
export function uretSentetikHarita(tohum: number = VARSAYILAN_TOHUM): HaritaDosyasi {
  const rng = new Prng(tohum);

  const bolgeler: BolgeTanimi[] = TASLAKLAR.map((tk) => {
    const x = kisitla(tk.x + rng.aralik(-10, 10), 5, 995);
    const y = kisitla(tk.y + rng.aralik(-10, 10), 5, 995);
    const nufus = yuvarla((tk.nufusBin * 1000 * rng.aralik(92, 108)) / 100, 1000);
    const rezervler: Record<string, number> = {};
    for (const mal of Object.keys(tk.rezervBin)) {
      const bin = tk.rezervBin[mal] as number;
      // bin birim -> mili-birim (x1_000_000); 1000 birimlik adımlara yuvarlanır
      rezervler[mal] = yuvarla(bin * rng.aralik(85, 115) * 10_000, 1_000_000);
    }
    const bolge: BolgeTanimi = {
      id: tk.id,
      ad: tk.ad,
      devlet: tk.devlet,
      etiketler: [...tk.etiketler],
      nufus,
      rezervler,
      tesisler: [...tk.tesisler],
      x,
      y,
    };
    const tarim = tarimTuret(tk);
    if (tarim !== undefined) bolge.tarim = tarim;
    return bolge;
  });

  const indeks = new Map(bolgeler.map((b) => [b.id, b]));
  const bul = (id: string): BolgeTanimi => {
    const b = indeks.get(id);
    if (b === undefined) throw new Error(`Harita ureticisi: bilinmeyen bolge "${id}"`);
    return b;
  };
  const uzaklik = (a: BolgeTanimi, b: BolgeTanimi): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const kenarlar: KenarTanimi[] = [];

  for (const [ka, kb] of KARA_KENARLAR) {
    const a = bul(ka);
    const b = bul(kb);
    const temel = Math.round(uzaklik(a, b) / 42);
    const gecit = a.etiketler.includes("dar_gecit") || b.etiketler.includes("dar_gecit");
    const dag = a.etiketler.includes("dag") || b.etiketler.includes("dag");
    let sureSaat: number;
    let kapasiteSaat: number;
    if (gecit) {
      // Geçit: orta hız, dar (düşük) kapasite
      sureSaat = kisitla(temel + 1, 3, 5);
      kapasiteSaat = yuvarla(280_000 + rng.aralik(0, 80_000), 10_000);
    } else if (dag) {
      // Dağ yolu: yavaş ve düşük kapasite
      sureSaat = kisitla(temel * 2 + 1, 5, 8);
      kapasiteSaat = yuvarla(140_000 + rng.aralik(0, 80_000), 10_000);
    } else {
      sureSaat = kisitla(temel, 1, 5);
      kapasiteSaat = yuvarla(520_000 + rng.aralik(0, 240_000), 10_000);
    }
    kenarlar.push({ a: ka, b: kb, tur: "kara", kapasiteSaat, sureSaat });
  }

  for (const [ka, kb, sureSaat] of DENIZ_KENARLAR) {
    kenarlar.push({
      a: ka,
      b: kb,
      tur: "deniz",
      kapasiteSaat: yuvarla(1_600_000 + rng.aralik(0, 800_000), 50_000),
      sureSaat,
    });
  }

  for (const [ka, kb, sureSaat] of HAVA_KENARLAR) {
    kenarlar.push({
      a: ka,
      b: kb,
      tur: "hava",
      kapasiteSaat: yuvarla(30_000 + rng.aralik(0, 30_000), 5_000),
      sureSaat,
    });
  }

  return {
    surum: 1,
    ad: "Sentetik 50 Bölge",
    devletler: DEVLETLER.map((d) => ({ ...d })),
    bolgeler,
    kenarlar,
  };
}

/** Haritanın diske yazılan kanonik JSON metni (2 boşluk girinti, sonda satır sonu). */
export function haritaJson(tohum: number = VARSAYILAN_TOHUM): string {
  return `${JSON.stringify(uretSentetikHarita(tohum), null, 2)}\n`;
}

/** Varsayılan çıktı dosyası: packages/veri/haritalar/sentetik-50.json */
export const CIKTI_YOLU = resolve(dirname(fileURLToPath(import.meta.url)), "../haritalar/sentetik-50.json");

// Doğrudan çalıştırılırsa (tsx packages/veri/src/harita-uretici.ts) dosyayı yazar.
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(dirname(CIKTI_YOLU), { recursive: true });
  writeFileSync(CIKTI_YOLU, haritaJson(), "utf8");
  console.log(`Yazildi: ${CIKTI_YOLU}`);
}

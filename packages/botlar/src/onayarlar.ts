/**
 * Politika önayarları (H1 ve H2 için). Her önayar, o anki duruma göre birkaç düzenleme
 * (inşa / yöntem / araştırma / ticaret / vergi / rezerv / birlik) komutu üretir.
 * Önayar sabit bir strateji "teması"dır; ne yapılacağı (hangi bölgede hangi tesis) duruma göre seçilir.
 */
import type { Komut, OyuncuId, Simulasyon } from "@bolge/cekirdek";
import { askeriAdaylar, hedefGucKapasiteden } from "./askeri";
import {
  Bakis,
  adayiSec,
  arastirmaAdaylari,
  insaAdaylari,
  kenarAdaylari,
  sanayiAdaylari,
  tarimAdaylari,
  ticaretAdaylari,
  vergiAdaylari,
  yontemAdaylari,
} from "./planlayici";
import type { Aday, SanayiSecenek } from "./planlayici";

export interface Onayar {
  readonly ad: string;
  readonly aciklama: string;
  /** O anki duruma göre bir düzenleme; durum değiştirmez. */
  uygula(sim: Simulasyon, oyuncu: OyuncuId): Komut[];
}

export interface OnayarTanimi {
  ad: string;
  aciklama: string;
  /** İzin verilen tesis türleri (boş/undefined = hiçbiri). */
  turler?: string[];
  /** İzin verilen yöntemler. */
  yontemler?: string[];
  /** İzin verilen teknolojiler. */
  teknolojiler?: string[];
  /** Ticarete konu olabilecek mallar. */
  ticaretMal?: string[];
  ihracatEsigi?: number;
  vergi?: boolean;
  kenar?: boolean;
  askeri?: { oran: number };
  /** Belirtilmişse sivil adayların tümü (dengeli). */
  hepsi?: boolean;
  /**
   * H1 v0.2 ortak yerel-ham tabanı: bölgenin rezerv/etiket kaynaklı ham çıkarım tesisleri (çiftlik, maden, kuyu) TÜM
   * önayarlarda ortak aday olur; `turler` yalnızca temaya özgü EK türleri taşır.
   */
  taban?: boolean;
  n?: number;
  /** Tarım (B1) adayları: ekim planı (+ gübre dozu). Tarım kapalıysa etkisizdir. */
  tarim?: { gubre?: boolean };
  /** Sanayi (B2) adayları: santral (elektrik açığı), ölçek, bakım düzeyi/onarım, sondaj. Sanayi kapalıysa etkisizdir. */
  sanayi?: SanayiSecenek;
}

/** Ham çıkarım tesis türleri (ortak yerel-ham tabanı; rezerv türü başına bir tür). */
export const HAM_CIKARIM_TURLERI: readonly string[] = ["ciftlik", "cevher_madeni", "komur_ocagi", "bakir_madeni", "silis_ocagi", "petrol_kuyusu"];

/**
 * Sanayi (B2): her önayar elektrik açığında santral kurar ve bakım düzeyini duruma göre ayarlar (ortak yetenek: hiçbir önayarı
 * diğerinin üst kümesi yapmaz). Ölçek yükseltme, onarım ve sondaj önayarlara değil arketip botlara aittir. Sanayi kapalıysa etkisiz.
 */
const ORTAK_SANAYI: SanayiSecenek = { santral: true, bakim: "dengeli" };

function onayarOlustur(t: OnayarTanimi): Onayar {
  return {
    ad: t.ad,
    aciklama: t.aciklama,
    uygula(sim, oyuncu) {
      if (!sim.dunya.oyuncular.some((o) => o.id === oyuncu)) return [];
      const b = new Bakis(sim, oyuncu);
      if (b.bolgeler.length === 0) return [];
      let adaylar: Aday[] = [];
      const turler = new Set([...(t.turler ?? []), ...(t.taban ? HAM_CIKARIM_TURLERI : [])]);
      const yontemler = new Set(t.yontemler ?? []);
      const teknolojiler = new Set(t.teknolojiler ?? []);
      const mallar = new Set(t.ticaretMal ?? []);
      if (t.hepsi) {
        adaylar = [
          ...insaAdaylari(b),
          ...yontemAdaylari(b),
          ...arastirmaAdaylari(b),
          ...kenarAdaylari(b),
          ...ticaretAdaylari(b, {}),
          ...vergiAdaylari(b),
          ...tarimAdaylari(b, { ekim: true }),
          ...sanayiAdaylari(b, { santral: true, bakim: "dengeli" }),
        ];
      } else {
        adaylar.push(...insaAdaylari(b, { filtre: (x) => turler.has(x.id) }));
        adaylar.push(...yontemAdaylari(b).filter((a) => yontemler.has(a.konu)));
        adaylar.push(...arastirmaAdaylari(b).filter((a) => teknolojiler.has(a.konu)));
        if (mallar.size > 0) {
          adaylar.push(
            ...ticaretAdaylari(b, { ihracatEsigi: t.ihracatEsigi ?? 0.1, ithalat: false }).filter((a) =>
              [...mallar].some((m) => a.konu.endsWith(`_${m}`)),
            ),
          );
        }
        if (t.vergi) adaylar.push(...vergiAdaylari(b));
        if (t.tarim) adaylar.push(...tarimAdaylari(b, { ekim: true, gubre: t.tarim.gubre === true }));
        if (t.sanayi) adaylar.push(...sanayiAdaylari(b, t.sanayi));
        if (t.kenar) adaylar.push(...kenarAdaylari(b));
        if (t.askeri) {
          const hedefGuc = Math.max(600, hedefGucKapasiteden(sim, b, t.askeri.oran));
          adaylar.push(...askeriAdaylar(b, { hedefGuc, rezervPpm: 200_000, savas: false, savunmaDurusu: true }).map((a) => ({ ...a, tahminiFayda: a.tahminiFayda * 50 })));
        }
      }
      return adayiSec(adaylar, b, {
        n: t.n ?? 6,
        kategoriSiniri: { arastir: 1, kenar: 1, vergi: 1, rezerv: 1, ticaret: 3, birlik: 2, savunma: 1, tarim: 2 },
      }).map((a) => a.komut);
    },
  };
}

export const ONAYARLAR: readonly Onayar[] = [
  onayarOlustur({
    ad: "gida_odakli",
    sanayi: ORTAK_SANAYI,
    aciklama: "Tahıl-gıda zinciri, mekanize tarım, gıda ihracatı, vergi ayarı.",
    turler: ["ciftlik", "gida_fabrikasi"],
    yontemler: ["mekanize_tarim"],
    teknolojiler: ["mekanize_tarim"],
    ticaretMal: ["tahil", "gida"],
    vergi: true,
    tarim: { gubre: true },
  }),
  onayarOlustur({
    ad: "agir_sanayi",
    sanayi: ORTAK_SANAYI,
    aciklama: "Cevher-kömür-çelik-parça zinciri, derin madencilik, çelik/cevher ihracatı.",
    turler: ["cevher_madeni", "komur_ocagi", "celikhane", "parca_fabrikasi"],
    yontemler: ["derin_cevher", "derin_komur", "elektrik_ark"],
    teknolojiler: ["derin_madencilik", "elektrik_ark_ocagi"],
    ticaretMal: ["cevher", "komur", "celik", "parca"],
  }),
  onayarOlustur({
    ad: "elektronik",
    sanayi: ORTAK_SANAYI,
    aciklama: "Bakır-silis-parça-elektronik zinciri, otomasyon, elektronik ihracatı.",
    turler: ["bakir_madeni", "silis_ocagi", "parca_fabrikasi", "elektronik_fabrikasi", "celikhane"],
    yontemler: ["otomatik_hat"],
    teknolojiler: ["mekanize_tarim", "otomasyon"],
    ticaretMal: ["elektronik", "parca", "bakir", "silis"],
  }),
  onayarOlustur({
    ad: "enerji",
    sanayi: ORTAK_SANAYI,
    aciklama: "Petrol-rafineri-yakıt, kömür; derin madencilik; yakıt/petrol ihracatı.",
    turler: ["petrol_kuyusu", "rafineri", "komur_ocagi"],
    yontemler: ["derin_komur"],
    teknolojiler: ["derin_madencilik"],
    ticaretMal: ["petrol", "yakit", "komur"],
  }),
  onayarOlustur({
    ad: "ihracatci",
    sanayi: ORTAK_SANAYI,
    aciklama: "Ham madde çıkarımı ağırlıklı; limandan düşük eşikle her fazlayı ihraç et.",
    turler: ["ciftlik", "cevher_madeni", "komur_ocagi", "bakir_madeni", "silis_ocagi", "petrol_kuyusu"],
    ticaretMal: ["tahil", "gida", "cevher", "komur", "celik", "bakir", "silis", "parca", "elektronik", "petrol", "yakit"],
    ihracatEsigi: 0.03,
    vergi: true,
  }),
  onayarOlustur({
    ad: "lojistik_yatirimi",
    sanayi: ORTAK_SANAYI,
    aciklama: "Kenar kapasite geliştirme, parça fabrikası, otomasyon ve konteyner limanı araştırması.",
    turler: ["parca_fabrikasi"],
    yontemler: ["otomatik_hat", "mekanize_tarim"],
    teknolojiler: ["mekanize_tarim", "otomasyon", "konteyner_limani"],
    kenar: true,
  }),
  onayarOlustur({
    ad: "askeri_hazirlik",
    sanayi: ORTAK_SANAYI,
    aciklama: "Mühimmat fabrikası, çelik/rafineri desteği, birlik üretimi, askeri rezerv, savunma duruşu.",
    turler: ["celikhane", "rafineri", "komur_ocagi", "cevher_madeni"],
    teknolojiler: ["derin_madencilik", "elektrik_ark_ocagi"],
    askeri: { oran: 0.2 },
  }),
  onayarOlustur({
    ad: "dengeli",
    aciklama: "Tüm sivil adaylar içinden tahmini faydası en yüksekler (genel amaçlı).",
    hepsi: true,
  }),
];

export function onayarBul(ad: string): Onayar {
  const o = ONAYARLAR.find((x) => x.ad === ad);
  if (!o) throw new Error(`bilinmeyen onayar: ${ad}`);
  return o;
}

// ---------------------------------------------------------------------------
// H1 v0.2 önayar kümesi
// ---------------------------------------------------------------------------

/** Tüm malların ticaret listesi (ticaret teması). */
const TUM_TICARET_MALLARI = ["tahil", "gida", "cevher", "komur", "celik", "bakir", "silis", "parca", "elektronik", "petrol", "yakit"];

/**
 * H1 v0.2 önayar tanımları (docs/07 Ö1b): ORTAK YEREL-HAM TABANI + tema.
 *  - Her önayar, odak kümesinin rezerv/etiket kaynaklı ham çıkarım tesislerini ortak aday olarak içerir (`taban`), böylece
 *    "ham çıkarımın tüm türlerini kuran" bir üst küme oluşmaz; temalar yalnızca EK karar (işleme zinciri, yöntem,
 *    araştırma, kenar, askeri) getirir.
 *  - `ihracatci` artık "tüm ham türler" değil TİCARET TEMASI: tabana ek olarak limandan düşük eşikle her malı ihraç eder
 *    ve vergiyi ayarlar; işleme tesisi, yöntem, araştırma, kenar ve askeri karar getirmez.
 *  - Hiçbir önayarın yetenek kümesi (tesis türü + yöntem + teknoloji + ihracat malı + bayraklar) bir diğerininkinin üst
 *    kümesi değildir (test: botlar.test.ts).
 * v0.1 kümesi (`ONAYARLAR`) değişmeden kalır; H1 dışındaki kullanımlar onu kullanır.
 */
export const H1_ONAYAR_TANIMLARI: readonly OnayarTanimi[] = [
  {
    ad: "gida_odakli",
    sanayi: ORTAK_SANAYI,
    aciklama: "Ortak ham tabanı + gıda fabrikası, mekanize tarım, tahıl/gıda ihracatı, vergi ayarı.",
    taban: true,
    turler: ["gida_fabrikasi"],
    yontemler: ["mekanize_tarim"],
    teknolojiler: ["mekanize_tarim"],
    ticaretMal: ["tahil", "gida"],
    vergi: true,
    tarim: { gubre: true },
    n: 8,
  },
  {
    ad: "agir_sanayi",
    sanayi: ORTAK_SANAYI,
    aciklama: "Ortak ham tabanı + çelik/parça zinciri, derin madencilik, elektrik ark, çelik/cevher ihracatı.",
    taban: true,
    turler: ["celikhane", "parca_fabrikasi"],
    yontemler: ["derin_cevher", "derin_komur", "elektrik_ark"],
    teknolojiler: ["derin_madencilik", "elektrik_ark_ocagi"],
    ticaretMal: ["cevher", "komur", "celik", "parca"],
    n: 8,
  },
  {
    ad: "elektronik",
    sanayi: ORTAK_SANAYI,
    aciklama: "Ortak ham tabanı + parça/elektronik zinciri, çelikhane, otomasyon, elektronik ihracatı.",
    taban: true,
    turler: ["parca_fabrikasi", "elektronik_fabrikasi", "celikhane"],
    yontemler: ["otomatik_hat"],
    teknolojiler: ["mekanize_tarim", "otomasyon"],
    ticaretMal: ["elektronik", "parca", "bakir", "silis"],
    n: 8,
  },
  {
    ad: "enerji",
    sanayi: ORTAK_SANAYI,
    aciklama: "Ortak ham tabanı + rafineri (petrol-yakıt), derin kömür, yakıt/petrol ihracatı.",
    taban: true,
    turler: ["rafineri"],
    yontemler: ["derin_komur"],
    teknolojiler: ["derin_madencilik"],
    ticaretMal: ["petrol", "yakit", "komur"],
    n: 8,
  },
  {
    ad: "ihracatci",
    sanayi: ORTAK_SANAYI,
    aciklama: "TİCARET TEMASI: ortak ham tabanı + limandan düşük eşikle her malı ihraç et, vergi ayarı (işleme/yöntem/araştırma/kenar/askeri yok).",
    taban: true,
    ticaretMal: TUM_TICARET_MALLARI,
    ihracatEsigi: 0.03,
    vergi: true,
    n: 8,
  },
  {
    ad: "lojistik_yatirimi",
    sanayi: ORTAK_SANAYI,
    aciklama: "Ortak ham tabanı + kenar kapasite geliştirme, parça fabrikası, otomasyon ve konteyner limanı araştırması.",
    taban: true,
    turler: ["parca_fabrikasi"],
    yontemler: ["otomatik_hat", "mekanize_tarim"],
    teknolojiler: ["mekanize_tarim", "otomasyon", "konteyner_limani"],
    kenar: true,
    n: 8,
  },
  {
    ad: "askeri_hazirlik",
    sanayi: ORTAK_SANAYI,
    aciklama: "Ortak ham tabanı + çelik/rafineri desteği, mühimmat ve birlik üretimi, askeri rezerv, savunma duruşu.",
    taban: true,
    turler: ["celikhane", "rafineri"],
    teknolojiler: ["derin_madencilik", "elektrik_ark_ocagi"],
    askeri: { oran: 0.2 },
    n: 8,
  },
  {
    ad: "dengeli",
    aciklama: "Tüm sivil adaylar içinden tahmini faydası en yüksekler (genel amaçlı; H1'de yalnızca referans).",
    hepsi: true,
  },
];

/** H1 v0.2 önayar kümesi (sabit önayarlar + `dengeli` referansı). */
export const H1_ONAYARLARI: readonly Onayar[] = H1_ONAYAR_TANIMLARI.map(onayarOlustur);

/** Pasif referans: hiçbir şey yapmaz (eklenen değer = önayar − pasif). */
export const PASIF_ONAYAR: Onayar = { ad: "pasif", aciklama: "Hiçbir şey yapma (referans).", uygula: () => [] };

/** Bir önayar tanımının yetenek kümesi (tesis türü, yöntem, teknoloji, ihracat malı, bayraklar); üst-küme kontrolü için. */
export function onayarYetenekleri(t: OnayarTanimi): Set<string> {
  const k = new Set<string>();
  for (const x of t.turler ?? []) k.add(`tur:${x}`);
  if (t.taban) for (const x of HAM_CIKARIM_TURLERI) k.add(`tur:${x}`);
  for (const x of t.yontemler ?? []) k.add(`yontem:${x}`);
  for (const x of t.teknolojiler ?? []) k.add(`teknoloji:${x}`);
  for (const x of t.ticaretMal ?? []) k.add(`ihracat:${x}`);
  for (const f of ["vergi", "kenar", "hepsi"] as const) if (t[f]) k.add(`bayrak:${f}`);
  if (t.tarim) k.add("bayrak:tarim");
  if (t.sanayi) {
    if (t.sanayi.santral !== false) k.add("bayrak:santral");
    if (t.sanayi.proaktif) k.add("bayrak:enerji_proaktif");
    if (t.sanayi.olcek) k.add("bayrak:olcek");
    if (t.sanayi.sondaj) k.add("bayrak:sondaj");
    if (t.sanayi.bakim === "tasarruf") k.add("bayrak:bakim_tasarruf");
    else if (t.sanayi.bakim !== false) k.add("bayrak:bakim");
  }
  if (t.askeri) k.add("bayrak:askeri");
  return k;
}

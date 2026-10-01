/**
 * Parsel kısa ölçüm komutu (mülk kipi): `pnpm olcum --kip parsel [--tohum 1-3] [--gun 24] [--gec-gun 10] [--olcum-gunu 14]
 * [--bot ciftci=3,sanayici=2,tuccar=2,pasif=1] [--gec ciftci,sanayici,pazar] [--iklim hizli|gercek] [--cikti raporlar] [--ad kosu] [--bulgular dosya.md] [--tarim-yonetimi] [--bakim-yonetimi] [--spekulator-gun 15] [--kalabalik] [--harita mini-6|sentetik-50] [--karsilastir onceki.json] [--agir]`.
 *
 * Varsayılan KISA koşudur (mini-6 parsel fikstürü, 8 yerleşik + 3 geç katılan bot, 24 sim günü, tohum 1–3; tohum başına ~2–4 sn).
 * AĞIR koşu (`--agir`): H6 tanımındaki gerçek 60. gün katılımı (74 sim günü) ve tohum 1–10; varsayılanda çalıştırılmaz.
 * Çıktı: `<cikti>/parsel-<ad>.json` ve `.md` (ad vars. "kosu"; dosya adı deterministiktir, tarih yok).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { GEC_ACILISLARI } from "@bolge/botlar";
import type { GecAcilis } from "@bolge/botlar";
import { tohumAyristir } from "./ortak";
import { TUM_IKLIM_MODLARI } from "./tipler";
import type { IklimModu } from "./tipler";
import { parselOzetle, parselRaporUret } from "./parsel-rapor";
import { PARSEL_HARITALARI, VARSAYILAN_SPEKULATOR_GUN, VARSAYILAN_YERLESIK, parselDuzeni, parselTohumKos } from "./parsel-kosu";
import type { ParselHaritasi, ParselYerlesikDagilimi } from "./parsel-kosu";
import type { ParselKarsilastirma } from "./parsel-rapor";

export interface ParselArguman {
  tohum: string;
  cikti: string;
  ad: string | undefined;
  bulgular: string | undefined;
  gun: number | undefined;
  gecGun: number | undefined;
  olcumGunu: number | undefined;
  bot: Partial<ParselYerlesikDagilimi>;
  gec: GecAcilis[] | undefined;
  iklim: IklimModu;
  agir: boolean;
  harita: ParselHaritasi;
  tarimYonetimi: boolean;
  bakimYonetimi: boolean;
  spekulatorGun: number | undefined;
  kalabalik: boolean;
  karsilastir: string | undefined;
  yardim: boolean;
}

/** Kısa koşu varsayılanları (sabit; belgede ve raporda yazılır). */
export const PARSEL_VARSAYILAN_TOHUM = "1-3";
export const PARSEL_AGIR_TOHUM = "1-10";
export const PARSEL_AGIR_GEC_GUN = 60;

/** `--kalabalik` varsayılan yerleşik dağılımı: mini-6 (≈ 5× yoğun) ve sentetik-50 (≈ 25×). Yarısı spekülatör değil: dörtte biri. */
export const KALABALIK_DAGILIM: Readonly<Record<ParselHaritasi, Readonly<ParselYerlesikDagilimi>>> = {
  "mini-6": { ciftci: 20, sanayici: 10, tuccar: 10, pasif: 6, spekulator: 8, spekulatorYasli: 8 },
  "sentetik-50": { ciftci: 100, sanayici: 50, tuccar: 50, pasif: 30, spekulator: 40, spekulatorYasli: 40 },
};

function tamsayi(v: string, ad: string, en: number): number {
  if (!/^\d+$/.test(v) || Number(v) < en) throw new Error(`${ad} en az ${en} olan tamsayi olmali: ${v}`);
  return Number(v);
}

function botAyristir(v: string): Partial<ParselYerlesikDagilimi> {
  const s: Partial<ParselYerlesikDagilimi> = {};
  for (const p of v.split(",")) {
    const m = /^(ciftci|sanayici|tuccar|pasif|spekulator|spekulatorYasli)=(\d+)$/.exec(p.trim());
    if (!m) throw new Error(`--bot 'ciftci=3,sanayici=2,tuccar=2,pasif=1,spekulator=0,spekulatorYasli=0' biciminde olmali: ${p}`);
    s[m[1] as keyof ParselYerlesikDagilimi] = Number(m[2]);
  }
  return s;
}

function gecAyristir(v: string): GecAcilis[] {
  if (v.trim() === "" || v === "yok") return [];
  return v.split(",").map((p) => {
    const a = p.trim();
    if (!(GEC_ACILISLARI as readonly string[]).includes(a)) throw new Error(`--gec ${GEC_ACILISLARI.join("|")} listesi olmali: ${a}`);
    return a as GecAcilis;
  });
}

export function parselArgumanAyristir(argv: readonly string[]): ParselArguman {
  const a: ParselArguman = { tohum: PARSEL_VARSAYILAN_TOHUM, cikti: "raporlar", ad: undefined, bulgular: undefined, gun: undefined, gecGun: undefined, olcumGunu: undefined, bot: {}, gec: undefined, iklim: "hizli", agir: false, harita: "mini-6", tarimYonetimi: false, bakimYonetimi: false, spekulatorGun: undefined, kalabalik: false, karsilastir: undefined, yardim: false };
  let tohumVerildi = false;
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i] as string;
    const esit = x.indexOf("=");
    const anahtar = x.startsWith("--") && esit > 0 ? x.slice(0, esit) : x;
    const deger = (): string => {
      if (x.startsWith("--") && esit > 0) return x.slice(esit + 1);
      const v = argv[++i];
      if (v === undefined) throw new Error(`${x} icin deger gerekli`);
      return v;
    };
    switch (anahtar) {
      case "--tohum":
        a.tohum = deger();
        tohumVerildi = true;
        break;
      case "--cikti":
        a.cikti = deger();
        break;
      case "--ad":
        a.ad = deger();
        break;
      case "--bulgular": {
        const v = deger();
        if (!/^[A-Za-z0-9._-]+\.md$/.test(v)) throw new Error(`--bulgular yalniz dosya adi (.md) olmali: ${v}`);
        a.bulgular = v;
        break;
      }
      case "--gun":
        a.gun = tamsayi(deger(), "--gun", 2);
        break;
      case "--gec-gun":
        a.gecGun = tamsayi(deger(), "--gec-gun", 1);
        break;
      case "--olcum-gunu":
        a.olcumGunu = tamsayi(deger(), "--olcum-gunu", 1);
        break;
      case "--bot":
        a.bot = botAyristir(deger());
        break;
      case "--gec":
        a.gec = gecAyristir(deger());
        break;
      case "--iklim": {
        const v = deger();
        if (!(TUM_IKLIM_MODLARI as readonly string[]).includes(v)) throw new Error(`--iklim ${TUM_IKLIM_MODLARI.join("|")} olmali: ${v}`);
        a.iklim = v as IklimModu;
        break;
      }
      case "--agir":
        a.agir = true;
        break;
      case "--kalabalik":
        a.kalabalik = true;
        break;
      case "--tarim-yonetimi":
        a.tarimYonetimi = true;
        break;
      case "--bakim-yonetimi":
        a.bakimYonetimi = true;
        break;
      case "--spekulator-gun":
        a.spekulatorGun = tamsayi(deger(), "--spekulator-gun", 0);
        break;
      case "--harita": {
        const v = deger();
        if (!(PARSEL_HARITALARI as readonly string[]).includes(v)) throw new Error(`--harita ${PARSEL_HARITALARI.join("|")} olmali: ${v}`);
        a.harita = v as ParselHaritasi;
        break;
      }
      case "--karsilastir":
        a.karsilastir = deger();
        break;
      case "--yardim":
      case "-h":
        a.yardim = true;
        break;
      default:
        throw new Error(`bilinmeyen secenek: ${x}`);
    }
  }
  if (a.agir && !tohumVerildi) a.tohum = PARSEL_AGIR_TOHUM;
  if (a.ad !== undefined && !/^[A-Za-z0-9._-]+$/.test(a.ad)) throw new Error(`--ad yalniz harf, rakam, '.', '_' ve '-' icerebilir: ${a.ad}`);
  return a;
}

const YARDIM = `Kullanim: pnpm olcum --kip parsel [--tohum 1-3] [--gun 24] [--gec-gun 10] [--olcum-gunu 14] [--bot ciftci=3,sanayici=2,tuccar=2,pasif=1] [--gec ciftci,sanayici,pazar] [--iklim hizli|gercek] [--cikti raporlar] [--ad kosu] [--bulgular dosya.md] [--tarim-yonetimi] [--bakim-yonetimi] [--spekulator-gun 15] [--kalabalik] [--harita mini-6|sentetik-50] [--karsilastir onceki.json] [--agir]
  Kisa parsel olcumu (mini-6 parsel fikstur; varsayilan 8 yerlesik + 3 gec katilan bot, 24 sim gunu, tohum 1-3): H6 (birincil Y7 + ucuz hucre; ikincil servet), H8, Y olcutleri.
  --tohum        Tohum araligi/listesi (vars. 1-3; --agir ile 1-10)
  --gun          Toplam sim gunu (vars. gec-gun + olcum-gunu = 24; verilirse en az gec-gun + olcum-gunu olmali)
  --gec-gun      Gec katilanlarin katilim gunu (vars. 10; H6 tanimi 60 = agir)
  --olcum-gunu   Gec katilimdan sonra olcum suresi, gun (vars. 14)
  --bot          Yerlesik bot dagilimi (vars. ciftci=3,sanayici=2,tuccar=2,pasif=1)
  --gec          Gec katilan acilislari (vars. ciftci,sanayici,pazar; 'yok' = gec katilan yok)
  --iklim        Iklim takvimi: hizli (vars.) | gercek
  --cikti        Rapor klasoru (vars. raporlar); dosyalar parsel-<ad>.json / .md
  --ad           Dosya adi ve rapor etiketi (vars. kosu)
  --bulgular     Raporun baglanti verecegi elle yazilmis bulgular dosyasi (vars. parsel-<ad>-bulgular.md); dosya URETILMEZ/ezilmez
  --kalabalik    Kalabalik/yuksek doluluk: mini-6'da 62 yerlesik bot (spekulator dahil); --harita sentetik-50 ile 310. Katilamayan oyuncular raporlanir
  --harita       mini-6 (vars.) | sentetik-50 (10.000 hucre; uzun surer)
  --tarim-yonetimi  Botlar ekim_plani + gubre_dozu ile toprak yonetir (pasif/spekulator haric)
  --bakim-yonetimi  Botlar bakim parcasi ithal eder ve asinma esiginde genel_onarim yapar (pasif/spekulator haric)
  --spekulator-gun  Yasli spekulatorun arsa almaya basladigi yas, gun (vars. 15)
  --karsilastir  Onceki parsel olcum JSON'u: rapora yan yana Y7/servet oranlari ekler
  --agir         AGIR koşu: gec-gun 60 (74 sim gunu), tohum 1-10. Varsayilanda calistirilmaz.`;

export function parselAna(argv: readonly string[]): void {
  const arg = parselArgumanAyristir(argv);
  if (arg.yardim) {
    console.log(YARDIM);
    return;
  }
  const gecGun = arg.gecGun ?? (arg.agir ? PARSEL_AGIR_GEC_GUN : 10);
  const olcumGunu = arg.olcumGunu ?? 14;
  const sureGun = arg.gun ?? gecGun + olcumGunu;
  if (sureGun < gecGun + olcumGunu) throw new Error(`--gun (${sureGun}) en az gec-gun + olcum-gunu (${gecGun + olcumGunu}) olmali`);
  const tohumlar = tohumAyristir(arg.tohum);
  const gecAcilislari = arg.gec ?? GEC_ACILISLARI;
  const yerlesikDagilim: Partial<ParselYerlesikDagilimi> = arg.kalabalik && Object.keys(arg.bot).length === 0 ? { ...KALABALIK_DAGILIM[arg.harita] } : arg.bot;
  const spekulatorGun = arg.spekulatorGun ?? VARSAYILAN_SPEKULATOR_GUN;
  const duzen = parselDuzeni(yerlesikDagilim, gecAcilislari, gecGun, spekulatorGun);
  const toplamBot = duzen.oyuncular.length;
  if (toplamBot < 8 || toplamBot > 12) console.log(`Uyari: bot sayisi ${toplamBot} (onerilen 8-12).`);
  console.log(`Parsel olcumu | tohum ${tohumlar.join(",")} | ${toplamBot} bot | gec-gun ${gecGun} + olcum ${olcumGunu} -> ${sureGun} gun | iklim ${arg.iklim} | harita ${arg.harita}${arg.tarimYonetimi ? " | TARIM-YONETIMI" : ""}${arg.bakimYonetimi ? " | BAKIM-YONETIMI" : ""}${arg.kalabalik ? " | KALABALIK" : ""}${arg.agir ? " | AGIR" : ""}${arg.ad ? ` | etiket ${arg.ad}` : ""}`);
  const basla = Date.now();
  const sonuclar = tohumlar.map((t) => {
    const r = parselTohumKos({ tohumlar, gecGun, olcumGunu, gun: sureGun, yerlesik: yerlesikDagilim, harita: arg.harita, tarimYonetimi: arg.tarimYonetimi, bakimYonetimi: arg.bakimYonetimi, spekulatorGun, gecAcilislari, iklim: arg.iklim, ilerleme: (m) => console.log(`[${((Date.now() - basla) / 1000).toFixed(1)} sn] ${m}`) }, t);
    console.log(`[${((Date.now() - basla) / 1000).toFixed(1)} sn] tohum ${t} bitti: H6 (Y7+ucuz) ${r.h6.karar.birincil.verdict}, servet(ikincil) ${r.h6.karar.ikincil.ham.verdict}, H8 ${r.h8.verdict}`);
    return r;
  });
  const sureMs = Date.now() - basla;
  const ad = `parsel-${arg.ad ?? "kosu"}`;
  const yerlesik = { ...VARSAYILAN_YERLESIK, ...yerlesikDagilim };
  let karsilastirma: ParselKarsilastirma | undefined;
  if (arg.karsilastir !== undefined) {
    const j = JSON.parse(readFileSync(arg.karsilastir, "utf8")) as { kip?: string; etiket?: string; tohumBasina?: ParselKarsilastirma["sonuclar"] };
    if (j.kip !== "parsel" || !Array.isArray(j.tohumBasina)) throw new Error(`--karsilastir: gecerli bir parsel olcum JSON'u degil: ${arg.karsilastir}`);
    karsilastirma = { kaynak: basename(arg.karsilastir), etiket: j.etiket, sonuclar: j.tohumBasina };
  }
  const meta = {
    harita: arg.harita,
    tarimYonetimi: arg.tarimYonetimi,
    bakimYonetimi: arg.bakimYonetimi,
    spekulatorGun,
    ...(karsilastirma !== undefined ? { karsilastirma } : {}), etiket: arg.ad, bulgular: arg.bulgular ?? `${ad}-bulgular.md`, tohumlar, gun: sureGun, gecGun, olcumGunu, iklim: arg.iklim, agir: arg.agir, sureMs, duzen: { yerlesik, gec: gecAcilislari } };
  const { karsilastirma: _onceki, ...jsonMeta } = meta; // karşılaştırılan koşunun tamamı JSON'a kopyalanmaz
  mkdirSync(arg.cikti, { recursive: true });
  const ozet = parselOzetle(sonuclar);
  writeFileSync(join(arg.cikti, `${ad}.json`), JSON.stringify({ surum: 1, kip: "parsel", ...jsonMeta, kalabalik: arg.kalabalik, ozet, tohumBasina: sonuclar }, null, 2) + "\n", "utf8");
  writeFileSync(join(arg.cikti, `${ad}.md`), parselRaporUret(sonuclar, meta), "utf8");
  console.log(`\nH6 (Y7+ucuz): ${ozet.h6.verdict} | servet (ikincil): ${ozet.h6.servetVerdict} | H8: ${ozet.h8.verdict}`);
  console.log(`Toplam sure: ${(sureMs / 1000).toFixed(1)} sn`);
  console.log(`Rapor: ${join(arg.cikti, ad)}.json / .md`);
}

// Doğrudan çalıştırıldığında (tsx packages/olcum/src/parsel-cli.ts ...)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    parselAna(process.argv.slice(2));
  } catch (e) {
    console.error(`Hata: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

/**
 * Parsel kısa ölçüm komutu (mülk kipi): `pnpm olcum --kip parsel [--tohum 1-3] [--gun 24] [--gec-gun 10] [--olcum-gunu 14]
 * [--bot ciftci=3,sanayici=2,tuccar=2,pasif=1] [--gec ciftci,sanayici,pazar] [--iklim hizli|gercek] [--cikti raporlar] [--ad kosu] [--bulgular dosya.md] [--agir]`.
 *
 * Varsayılan KISA koşudur (mini-6 parsel fikstürü, 8 yerleşik + 3 geç katılan bot, 24 sim günü, tohum 1–3; tohum başına ~2–4 sn).
 * AĞIR koşu (`--agir`): H6 tanımındaki gerçek 60. gün katılımı (74 sim günü) ve tohum 1–10; varsayılanda çalıştırılmaz.
 * Çıktı: `<cikti>/parsel-<ad>.json` ve `.md` (ad vars. "kosu"; dosya adı deterministiktir, tarih yok).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { GEC_ACILISLARI } from "@bolge/botlar";
import type { GecAcilis } from "@bolge/botlar";
import { tohumAyristir } from "./ortak";
import { TUM_IKLIM_MODLARI } from "./tipler";
import type { IklimModu } from "./tipler";
import { parselOzetle, parselRaporUret } from "./parsel-rapor";
import { parselDuzeni, parselTohumKos, VARSAYILAN_YERLESIK } from "./parsel-kosu";
import type { ParselYerlesikDagilimi } from "./parsel-kosu";

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
  yardim: boolean;
}

/** Kısa koşu varsayılanları (sabit; belgede ve raporda yazılır). */
export const PARSEL_VARSAYILAN_TOHUM = "1-3";
export const PARSEL_AGIR_TOHUM = "1-10";
export const PARSEL_AGIR_GEC_GUN = 60;

function tamsayi(v: string, ad: string, en: number): number {
  if (!/^\d+$/.test(v) || Number(v) < en) throw new Error(`${ad} en az ${en} olan tamsayi olmali: ${v}`);
  return Number(v);
}

function botAyristir(v: string): Partial<ParselYerlesikDagilimi> {
  const s: Partial<ParselYerlesikDagilimi> = {};
  for (const p of v.split(",")) {
    const m = /^(ciftci|sanayici|tuccar|pasif)=(\d+)$/.exec(p.trim());
    if (!m) throw new Error(`--bot 'ciftci=3,sanayici=2,tuccar=2,pasif=1' biciminde olmali: ${p}`);
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
  const a: ParselArguman = { tohum: PARSEL_VARSAYILAN_TOHUM, cikti: "raporlar", ad: undefined, bulgular: undefined, gun: undefined, gecGun: undefined, olcumGunu: undefined, bot: {}, gec: undefined, iklim: "hizli", agir: false, yardim: false };
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

const YARDIM = `Kullanim: pnpm olcum --kip parsel [--tohum 1-3] [--gun 24] [--gec-gun 10] [--olcum-gunu 14] [--bot ciftci=3,sanayici=2,tuccar=2,pasif=1] [--gec ciftci,sanayici,pazar] [--iklim hizli|gercek] [--cikti raporlar] [--ad kosu] [--bulgular dosya.md] [--agir]
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
  const duzen = parselDuzeni(arg.bot, gecAcilislari, gecGun);
  const toplamBot = duzen.oyuncular.length;
  if (toplamBot < 8 || toplamBot > 12) console.log(`Uyari: bot sayisi ${toplamBot} (onerilen 8-12).`);
  console.log(`Parsel olcumu | tohum ${tohumlar.join(",")} | ${toplamBot} bot | gec-gun ${gecGun} + olcum ${olcumGunu} -> ${sureGun} gun | iklim ${arg.iklim}${arg.agir ? " | AGIR" : ""}${arg.ad ? ` | etiket ${arg.ad}` : ""}`);
  const basla = Date.now();
  const sonuclar = tohumlar.map((t) => {
    const r = parselTohumKos({ tohumlar, gecGun, olcumGunu, gun: sureGun, yerlesik: arg.bot, gecAcilislari, iklim: arg.iklim, ilerleme: (m) => console.log(`[${((Date.now() - basla) / 1000).toFixed(1)} sn] ${m}`) }, t);
    console.log(`[${((Date.now() - basla) / 1000).toFixed(1)} sn] tohum ${t} bitti: H6 (Y7+ucuz) ${r.h6.karar.birincil.verdict}, servet(ikincil) ${r.h6.karar.ikincil.ham.verdict}, H8 ${r.h8.verdict}`);
    return r;
  });
  const sureMs = Date.now() - basla;
  const ad = `parsel-${arg.ad ?? "kosu"}`;
  const yerlesik = { ...VARSAYILAN_YERLESIK, ...arg.bot };
  const meta = { etiket: arg.ad, bulgular: arg.bulgular ?? `${ad}-bulgular.md`, tohumlar, gun: sureGun, gecGun, olcumGunu, iklim: arg.iklim, agir: arg.agir, sureMs, duzen: { yerlesik, gec: gecAcilislari } };
  mkdirSync(arg.cikti, { recursive: true });
  const ozet = parselOzetle(sonuclar);
  writeFileSync(join(arg.cikti, `${ad}.json`), JSON.stringify({ surum: 1, kip: "parsel", ...meta, ozet, tohumBasina: sonuclar }, null, 2) + "\n", "utf8");
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

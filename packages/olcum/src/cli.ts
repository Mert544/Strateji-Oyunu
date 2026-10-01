/**
 * Komut satırı: pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-10 --cikti raporlar/ [--harita sentetik|gercek] [--iklim gercek|hizli] [--hizli] [--tam] [--bolge 16] [--odak bolge_liman|bolge] [--anlamli 0.03] [--pencere-bas 3] [--h1-gun 7] [--ad v0.2] [--karsilastir onceki.json]
 * Varsayılan: tüm hipotezler, tohum 1-3, çıktı "raporlar". Dosya adları deterministiktir (tarih yok):
 * olcum-<hipotezler>-t<tohum aralığı>[-hizli][-gercek][-iklimgercek][-<ad>].json / .md
 * (-gercek: gerçek harita; -iklimgercek: gerçek takvim, vars. "hizli" iklimde sonek yok).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { calistir, hipotezAyristir } from "./kosu";
import { raporUret } from "./rapor";
import type { KarsilastirmaVerisi } from "./rapor";
import { tohumAyristir } from "./ortak";
import { TUM_HARITALAR, TUM_IKLIM_MODLARI } from "./tipler";
import type { HaritaAdi, IklimModu } from "./tipler";

interface Arguman {
  hip: string;
  tohum: string;
  cikti: string;
  hizli: boolean;
  /** Tam boyut (H1: tüm bölgeler). */
  tam: boolean;
  /** H1 bölge sayısı (devlet başına eşit örnek). */
  bolge: number | undefined;
  /** H1 odak kurulumu (vars. bolge_liman). */
  odak: "bolge" | "bolge_liman" | undefined;
  /** H1 anlamlı fark oranı (vars. 0.03). */
  anlamli: number | undefined;
  /** H1 birincil pencere başlangıç günü (vars. 3). */
  pencereBas: number | undefined;
  /** H1 koşu süresi, gün (vars. 7). */
  h1Gun: number | undefined;
  /** Ölçüm haritası (vars. sentetik). */
  harita: HaritaAdi;
  /** İklim takvimi modu (vars. hizli: gunCarpani=12; tarım kapalıysa etkisiz). */
  iklim: IklimModu;
  /** Dosya adı soneki ve rapor "Sürüm/etiket" satırı (ör. v0.1). */
  ad: string | undefined;
  /** Önceki ölçüm JSON dosyası (özet tabloda yan yana gösterilir). */
  karsilastir: string | undefined;
  yardim: boolean;
}

function haritaAyristir(v: string): HaritaAdi {
  if (!(TUM_HARITALAR as readonly string[]).includes(v)) throw new Error(`--harita ${TUM_HARITALAR.join("|")} olmali: ${v}`);
  return v as HaritaAdi;
}

function iklimAyristir(v: string): IklimModu {
  if (!(TUM_IKLIM_MODLARI as readonly string[]).includes(v)) throw new Error(`--iklim ${TUM_IKLIM_MODLARI.join("|")} olmali: ${v}`);
  return v as IklimModu;
}

function bolgeSayisiAyristir(v: string): number {
  if (!/^\d+$/.test(v) || Number(v) < 1) throw new Error(`--bolge pozitif tamsayi olmali: ${v}`);
  return Number(v);
}

function odakAyristir(v: string): "bolge" | "bolge_liman" {
  if (v !== "bolge" && v !== "bolge_liman") throw new Error(`--odak 'bolge' veya 'bolge_liman' olmali: ${v}`);
  return v;
}

function oranAyristir(v: string): number {
  const x = Number(v);
  if (!Number.isFinite(x) || x < 0 || x > 1) throw new Error(`--anlamli 0 ile 1 arasinda bir oran olmali: ${v}`);
  return x;
}

function gunAyristir(v: string): number {
  if (!/^\d+$/.test(v) || Number(v) < 2) throw new Error(`--h1-gun en az 2 olan tamsayi olmali: ${v}`);
  return Number(v);
}

function pencereAyristir(v: string): number {
  if (!/^\d+$/.test(v)) throw new Error(`--pencere-bas negatif olmayan tamsayi olmali: ${v}`);
  return Number(v);
}

export function argumanAyristir(argv: readonly string[]): Arguman {
  const a: Arguman = { hip: "H1,H2,H3,H5,H6,H7", tohum: "1-3", cikti: "raporlar", hizli: false, tam: false, harita: "sentetik", iklim: "hizli", bolge: undefined, odak: undefined, anlamli: undefined, pencereBas: undefined, h1Gun: undefined, ad: undefined, karsilastir: undefined, yardim: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i] as string;
    const deger = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${x} icin deger gerekli`);
      return v;
    };
    if (x === "--hip") a.hip = deger();
    else if (x === "--tohum") a.tohum = deger();
    else if (x === "--cikti") a.cikti = deger();
    else if (x === "--hizli") a.hizli = true;
    else if (x === "--tam") a.tam = true;
    else if (x === "--harita") a.harita = haritaAyristir(deger());
    else if (x === "--iklim") a.iklim = iklimAyristir(deger());
    else if (x === "--bolge") a.bolge = bolgeSayisiAyristir(deger());
    else if (x === "--odak") a.odak = odakAyristir(deger());
    else if (x === "--anlamli") a.anlamli = oranAyristir(deger());
    else if (x === "--pencere-bas") a.pencereBas = pencereAyristir(deger());
    else if (x === "--h1-gun") a.h1Gun = gunAyristir(deger());
    else if (x === "--ad") a.ad = deger();
    else if (x === "--karsilastir") a.karsilastir = deger();
    else if (x === "--yardim" || x === "-h") a.yardim = true;
    else if (x.startsWith("--hip=")) a.hip = x.slice(6);
    else if (x.startsWith("--tohum=")) a.tohum = x.slice(8);
    else if (x.startsWith("--cikti=")) a.cikti = x.slice(8);
    else if (x.startsWith("--harita=")) a.harita = haritaAyristir(x.slice(9));
    else if (x.startsWith("--iklim=")) a.iklim = iklimAyristir(x.slice(8));
    else if (x.startsWith("--bolge=")) a.bolge = bolgeSayisiAyristir(x.slice(8));
    else if (x.startsWith("--odak=")) a.odak = odakAyristir(x.slice(7));
    else if (x.startsWith("--anlamli=")) a.anlamli = oranAyristir(x.slice(10));
    else if (x.startsWith("--pencere-bas=")) a.pencereBas = pencereAyristir(x.slice(14));
    else if (x.startsWith("--h1-gun=")) a.h1Gun = gunAyristir(x.slice(9));
    else if (x.startsWith("--ad=")) a.ad = x.slice(5);
    else if (x.startsWith("--karsilastir=")) a.karsilastir = x.slice(14);
    else throw new Error(`bilinmeyen secenek: ${x}`);
  }
  if (a.ad !== undefined && !/^[A-Za-z0-9._-]+$/.test(a.ad)) throw new Error(`--ad yalniz harf, rakam, '.', '_' ve '-' icerebilir: ${a.ad}`);
  return a;
}

const YARDIM = `Kullanim: pnpm olcum [--hip H1,H2,H3,H5,H6,H7] [--tohum 1-3] [--cikti raporlar/] [--harita sentetik|gercek] [--iklim gercek|hizli] [--hizli] [--tam] [--bolge 16] [--odak bolge_liman|bolge] [--anlamli 0.03] [--pencere-bas 3] [--h1-gun 7] [--ad v0.2] [--karsilastir onceki.json]
  --hip     Calistirilacak hipotezler (vars. tumu)
  --tohum   Tohum araligi veya listesi: 1-10, 1,2,5, 1-3,7 (vars. 1-3)
  --cikti   Rapor klasoru (vars. raporlar)
  --harita  Olcum haritasi: sentetik (vars.; sentetik-50) veya gercek (gercek-karadeniz: 53 bolge, 4 devlet)
  --iklim   Iklim takvimi (yalniz tarim aciksa): hizli (vars.; gunCarpani=12, 30 gunluk kosu ~1 yil gorur) veya gercek (gunCarpani=1,
            30 gunluk kosu tek ay gorur). Iki modda da baslangic ayi tohumla doner: tohum k, param'daki baslangic ayindan (k-1) ay ileride
            baslar (tohum 1 = 1 Ekim, 2 = 1 Kasim, ...; 12 ardisik tohum 12 ayi kapsar). Tarim kapaliysa sessizce etkisiz
  --hizli   Kucultulmus boyutlar (H1: 8 bolge, H2: 12 gun, ...)
  --tam     Tam boyut (H1: tum bolgeler; varsayilan 16 bolge ornegi; yavas)
  --bolge   H1 bolge sayisi (devlet basina esit ornek; --tam'i gecersiz kilmaz)
  --odak    H1 odak kurulumu: bolge_liman (vars.; odak bolge + en yakin liman) veya bolge (yalniz odak bolge)
  --anlamli H1 anlamli fark orani: pasif referansin mutlak net degerinin orani (vars. 0.03; taban 10 bin para)
  --pencere-bas  H1 birincil skor penceresinin baslangic gunu (vars. 3 = 4-7. gun; 0 = 7 gunluk toplam)
  --h1-gun  H1 kosu suresi, gun (vars. 7; arka plandaki militarist ilk savasi ~7. gunde ilan eder, askeri etki icin 14 denenebilir)
  --ad      Dosya adina sonek ve rapora "Surum/etiket" satiri (ornek: --ad v0.1 -> ...-t1-3-v0.1.md)
  --karsilastir  Onceki olcumun JSON dosyasi; ozet tabloda onceki olcum ve sonuc yan yana gosterilir`;

export function dosyaAdi(hip: readonly string[], tohumlar: readonly number[], hizli: boolean, ad?: string, harita?: HaritaAdi, iklim?: IklimModu): string {
  const ilk = tohumlar[0] as number;
  const son = tohumlar[tohumlar.length - 1] as number;
  const bitisik = tohumlar.length === son - ilk + 1;
  const t = tohumlar.length === 1 ? `${ilk}` : bitisik ? `${ilk}-${son}` : tohumlar.join("_");
  return `olcum-${hip.join("")}-t${t}${hizli ? "-hizli" : ""}${harita === "gercek" ? "-gercek" : ""}${iklim === "gercek" ? "-iklimgercek" : ""}${ad ? `-${ad}` : ""}`;
}

export function ana(argv: readonly string[]): void {
  const arg = argumanAyristir(argv);
  if (arg.yardim) {
    console.log(YARDIM);
    return;
  }
  const hip = hipotezAyristir(arg.hip);
  const tohumlar = tohumAyristir(arg.tohum);
  let karsilastirma: KarsilastirmaVerisi | undefined;
  if (arg.karsilastir !== undefined) {
    const j = JSON.parse(readFileSync(arg.karsilastir, "utf8")) as { hipotezler?: KarsilastirmaVerisi["hipotezler"]; etiket?: string };
    if (!Array.isArray(j.hipotezler)) throw new Error(`--karsilastir: gecerli bir olcum JSON'u degil (hipotezler yok): ${arg.karsilastir}`);
    karsilastirma = { kaynak: arg.karsilastir, etiket: j.etiket, hipotezler: j.hipotezler };
  }
  console.log(`Olcum: ${hip.join(",")} | tohum ${tohumlar.join(",")} | cikti ${arg.cikti}${arg.hizli ? " | HIZLI" : ""}${arg.tam ? " | TAM" : ""} | harita ${arg.harita} | iklim ${arg.iklim}${arg.ad ? ` | etiket ${arg.ad}` : ""}`);
  const basla = Date.now();
  const sonuclar = calistir({
    hipotezler: hip,
    tohumlar,
    hizli: arg.hizli,
    tam: arg.tam,
    harita: arg.harita,
    iklim: arg.iklim,
    ...(arg.bolge !== undefined ? { bolgeSayisi: arg.bolge } : {}),
    ...(arg.odak !== undefined ? { odak: arg.odak } : {}),
    ...(arg.anlamli !== undefined ? { anlamliOran: arg.anlamli } : {}),
    ...(arg.pencereBas !== undefined ? { pencereBasGun: arg.pencereBas } : {}),
    ...(arg.h1Gun !== undefined ? { h1Gun: arg.h1Gun } : {}),
    ilerleme: (m) => console.log(`[${((Date.now() - basla) / 1000).toFixed(1)} sn] ${m}`),
  });
  const sureMs = Date.now() - basla;
  const ad = dosyaAdi(hip, tohumlar, arg.hizli, arg.ad, arg.harita, arg.iklim);
  mkdirSync(arg.cikti, { recursive: true });
  const jsonMeta = {
    tohumlar,
    hizli: arg.hizli,
    tam: arg.tam,
    etiket: arg.ad,
    sureMs,
    secenekler: { hip, tohum: arg.tohum, hizli: arg.hizli, tam: arg.tam, harita: arg.harita, iklim: arg.iklim, bolge: arg.bolge ?? null, odak: arg.odak ?? "bolge_liman", anlamli: arg.anlamli ?? null, pencereBas: arg.pencereBas ?? 3, h1Gun: arg.h1Gun ?? 7, ad: arg.ad ?? null },
  };
  const meta = { ...jsonMeta, karsilastirma };
  writeFileSync(join(arg.cikti, `${ad}.json`), JSON.stringify({ surum: 1, ...jsonMeta, hipotezler: sonuclar }, null, 2) + "\n", "utf8");
  writeFileSync(join(arg.cikti, `${ad}.md`), raporUret(sonuclar, meta), "utf8");
  console.log("");
  for (const s of sonuclar) {
    console.log(`${s.kimlik}: ${s.verdict.toUpperCase()}  ${s.olcum.ad} = ${s.olcum.deger}  (kosul basari ${(s.tohumBasariOrani * 100).toFixed(0)}%, ${(s.sureMs / 1000).toFixed(1)} sn)`);
  }
  console.log(`\nToplam sure: ${(sureMs / 1000).toFixed(1)} sn`);
  console.log(`Rapor: ${join(arg.cikti, ad)}.json / .md`);
}

// Doğrudan çalıştırıldığında (tsx packages/olcum/src/cli.ts ...)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    ana(process.argv.slice(2));
  } catch (e) {
    console.error(`Hata: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

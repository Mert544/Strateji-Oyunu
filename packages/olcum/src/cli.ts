/**
 * Komut satırı: pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-10 --cikti raporlar/ [--hizli] [--tam] [--bolge 16] [--ad v0.1] [--karsilastir onceki.json]
 * Varsayılan: tüm hipotezler, tohum 1-3, çıktı "raporlar". Dosya adları deterministiktir (tarih yok):
 * olcum-<hipotezler>-t<tohum aralığı>[-hizli][-<ad>].json / .md
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { calistir, hipotezAyristir } from "./kosu";
import { raporUret } from "./rapor";
import type { KarsilastirmaVerisi } from "./rapor";
import { tohumAyristir } from "./ortak";

interface Arguman {
  hip: string;
  tohum: string;
  cikti: string;
  hizli: boolean;
  /** Tam boyut (H1: tüm bölgeler). */
  tam: boolean;
  /** H1 bölge sayısı (devlet başına eşit örnek). */
  bolge: number | undefined;
  /** Dosya adı soneki ve rapor "Sürüm/etiket" satırı (ör. v0.1). */
  ad: string | undefined;
  /** Önceki ölçüm JSON dosyası (özet tabloda yan yana gösterilir). */
  karsilastir: string | undefined;
  yardim: boolean;
}

function bolgeSayisiAyristir(v: string): number {
  if (!/^\d+$/.test(v) || Number(v) < 1) throw new Error(`--bolge pozitif tamsayi olmali: ${v}`);
  return Number(v);
}

export function argumanAyristir(argv: readonly string[]): Arguman {
  const a: Arguman = { hip: "H1,H2,H3,H5,H6,H7", tohum: "1-3", cikti: "raporlar", hizli: false, tam: false, bolge: undefined, ad: undefined, karsilastir: undefined, yardim: false };
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
    else if (x === "--bolge") a.bolge = bolgeSayisiAyristir(deger());
    else if (x === "--ad") a.ad = deger();
    else if (x === "--karsilastir") a.karsilastir = deger();
    else if (x === "--yardim" || x === "-h") a.yardim = true;
    else if (x.startsWith("--hip=")) a.hip = x.slice(6);
    else if (x.startsWith("--tohum=")) a.tohum = x.slice(8);
    else if (x.startsWith("--cikti=")) a.cikti = x.slice(8);
    else if (x.startsWith("--bolge=")) a.bolge = bolgeSayisiAyristir(x.slice(8));
    else if (x.startsWith("--ad=")) a.ad = x.slice(5);
    else if (x.startsWith("--karsilastir=")) a.karsilastir = x.slice(14);
    else throw new Error(`bilinmeyen secenek: ${x}`);
  }
  if (a.ad !== undefined && !/^[A-Za-z0-9._-]+$/.test(a.ad)) throw new Error(`--ad yalniz harf, rakam, '.', '_' ve '-' icerebilir: ${a.ad}`);
  return a;
}

const YARDIM = `Kullanim: pnpm olcum [--hip H1,H2,H3,H5,H6,H7] [--tohum 1-3] [--cikti raporlar/] [--hizli] [--tam] [--bolge 16] [--ad v0.1] [--karsilastir onceki.json]
  --hip     Calistirilacak hipotezler (vars. tumu)
  --tohum   Tohum araligi veya listesi: 1-10, 1,2,5, 1-3,7 (vars. 1-3)
  --cikti   Rapor klasoru (vars. raporlar)
  --hizli   Kucultulmus boyutlar (H1: 8 bolge, H2: 12 gun, ...)
  --tam     Tam boyut (H1: tum bolgeler; varsayilan 16 bolge ornegi; yavas)
  --bolge   H1 bolge sayisi (devlet basina esit ornek; --tam'i gecersiz kilmaz)
  --ad      Dosya adina sonek ve rapora "Surum/etiket" satiri (ornek: --ad v0.1 -> ...-t1-3-v0.1.md)
  --karsilastir  Onceki olcumun JSON dosyasi; ozet tabloda onceki olcum ve sonuc yan yana gosterilir`;

export function dosyaAdi(hip: readonly string[], tohumlar: readonly number[], hizli: boolean, ad?: string): string {
  const ilk = tohumlar[0] as number;
  const son = tohumlar[tohumlar.length - 1] as number;
  const bitisik = tohumlar.length === son - ilk + 1;
  const t = tohumlar.length === 1 ? `${ilk}` : bitisik ? `${ilk}-${son}` : tohumlar.join("_");
  return `olcum-${hip.join("")}-t${t}${hizli ? "-hizli" : ""}${ad ? `-${ad}` : ""}`;
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
  console.log(`Olcum: ${hip.join(",")} | tohum ${tohumlar.join(",")} | cikti ${arg.cikti}${arg.hizli ? " | HIZLI" : ""}${arg.tam ? " | TAM" : ""}${arg.ad ? ` | etiket ${arg.ad}` : ""}`);
  const basla = Date.now();
  const sonuclar = calistir({
    hipotezler: hip,
    tohumlar,
    hizli: arg.hizli,
    tam: arg.tam,
    ...(arg.bolge !== undefined ? { bolgeSayisi: arg.bolge } : {}),
    ilerleme: (m) => console.log(`[${((Date.now() - basla) / 1000).toFixed(1)} sn] ${m}`),
  });
  const sureMs = Date.now() - basla;
  const ad = dosyaAdi(hip, tohumlar, arg.hizli, arg.ad);
  mkdirSync(arg.cikti, { recursive: true });
  const jsonMeta = {
    tohumlar,
    hizli: arg.hizli,
    tam: arg.tam,
    etiket: arg.ad,
    sureMs,
    secenekler: { hip, tohum: arg.tohum, hizli: arg.hizli, tam: arg.tam, bolge: arg.bolge ?? null, ad: arg.ad ?? null },
  };
  const meta = { ...jsonMeta, karsilastirma };
  writeFileSync(join(arg.cikti, `${ad}.json`), JSON.stringify({ surum: 1, ...jsonMeta, hipotezler: sonuclar }, null, 2) + "\n", "utf8");
  writeFileSync(join(arg.cikti, `${ad}.md`), raporUret(sonuclar, meta), "utf8");
  console.log("");
  for (const s of sonuclar) {
    console.log(`${s.kimlik}: ${s.verdict.toUpperCase()}  ${s.olcum.ad} = ${s.olcum.deger}  (tohum basari ${(s.tohumBasariOrani * 100).toFixed(0)}%, ${(s.sureMs / 1000).toFixed(1)} sn)`);
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

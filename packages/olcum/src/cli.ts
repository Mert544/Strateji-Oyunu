/**
 * Komut satırı: pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-10 --cikti raporlar/ [--hizli]
 * Varsayılan: tüm hipotezler, tohum 1-3, çıktı "raporlar". Dosya adları deterministiktir (tarih yok):
 * olcum-<hipotezler>-t<tohum aralığı>.json / .md
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { calistir, hipotezAyristir } from "./kosu";
import { raporUret } from "./rapor";
import { tohumAyristir } from "./ortak";

interface Arguman {
  hip: string;
  tohum: string;
  cikti: string;
  hizli: boolean;
  yardim: boolean;
}

export function argumanAyristir(argv: readonly string[]): Arguman {
  const a: Arguman = { hip: "H1,H2,H3,H5,H6,H7", tohum: "1-3", cikti: "raporlar", hizli: false, yardim: false };
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
    else if (x === "--yardim" || x === "-h") a.yardim = true;
    else if (x.startsWith("--hip=")) a.hip = x.slice(6);
    else if (x.startsWith("--tohum=")) a.tohum = x.slice(8);
    else if (x.startsWith("--cikti=")) a.cikti = x.slice(8);
    else throw new Error(`bilinmeyen secenek: ${x}`);
  }
  return a;
}

const YARDIM = `Kullanim: pnpm olcum [--hip H1,H2,H3,H5,H6,H7] [--tohum 1-3] [--cikti raporlar/] [--hizli]
  --hip     Calistirilacak hipotezler (vars. tumu)
  --tohum   Tohum araligi veya listesi: 1-10, 1,2,5, 1-3,7 (vars. 1-3)
  --cikti   Rapor klasoru (vars. raporlar)
  --hizli   Kucultulmus boyutlar (H1: 12 bolge, H2: 12 gun, ...)`;

function dosyaAdi(hip: readonly string[], tohumlar: readonly number[], hizli: boolean): string {
  const ilk = tohumlar[0] as number;
  const son = tohumlar[tohumlar.length - 1] as number;
  const bitisik = tohumlar.length === son - ilk + 1;
  const t = tohumlar.length === 1 ? `${ilk}` : bitisik ? `${ilk}-${son}` : tohumlar.join("_");
  return `olcum-${hip.join("")}-t${t}${hizli ? "-hizli" : ""}`;
}

export function ana(argv: readonly string[]): void {
  const arg = argumanAyristir(argv);
  if (arg.yardim) {
    console.log(YARDIM);
    return;
  }
  const hip = hipotezAyristir(arg.hip);
  const tohumlar = tohumAyristir(arg.tohum);
  console.log(`Olcum: ${hip.join(",")} | tohum ${tohumlar.join(",")} | cikti ${arg.cikti}${arg.hizli ? " | HIZLI" : ""}`);
  const basla = Date.now();
  const sonuclar = calistir({
    hipotezler: hip,
    tohumlar,
    hizli: arg.hizli,
    ilerleme: (m) => console.log(`[${((Date.now() - basla) / 1000).toFixed(1)} sn] ${m}`),
  });
  const sureMs = Date.now() - basla;
  const ad = dosyaAdi(hip, tohumlar, arg.hizli);
  mkdirSync(arg.cikti, { recursive: true });
  const meta = { tohumlar, hizli: arg.hizli, sureMs, secenekler: { hip, tohum: arg.tohum, hizli: arg.hizli } };
  writeFileSync(join(arg.cikti, `${ad}.json`), JSON.stringify({ surum: 1, ...meta, hipotezler: sonuclar }, null, 2) + "\n", "utf8");
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

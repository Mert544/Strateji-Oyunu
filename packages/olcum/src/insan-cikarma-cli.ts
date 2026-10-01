/**
 * İnsan testi çıkarma komutu (İ1 + İ4): `pnpm olcum --kip cikarma --depo <dizin> --oyuncular <eslesme.json> --cikti <dosya.json> [...]`.
 * Dosya deposunu çevrimdışı yeniden oynatır (insan-cikarma.ts) ve oyuncu başına olguları JSON'a yazar.
 *
 *   --depo DIZIN         sunucunun dosya deposu dizini (gunluk.jsonl, goruntu/); YALNIZ OKUNUR (kopyası daha güvenli)
 *   --oyuncular DOSYA    eşleme dosyası (repoda TUTULMAZ): [{ "id": "<oyuncu kimliği>", "kod": "K1", "profil": "...", "acilis": "ciftci|sanayici|pazar" }, ...]
 *   --cikti DOSYA        çıktı JSON'u
 *   --harita AD          mini | sentetik | gercek[:ad] (vars. sentetik; sunucuyla AYNI veri paketi olmalı)
 *   --parsel AD          mini | sentetik: haritanın parsel fikstürü (mini -> mini-6, sentetik -> sentetik-50)
 *   --parsel-dosya YOL   sunucuya verilen parsel fikstürü JSON'u (--parsel ile birlikte verilmez)
 *   --tohum N            dünya tohumu (vars. anlık görüntüdeki, yoksa 1)
 *   --commit SHA         çıktıya yazılacak sürüm (vars. `git rev-parse HEAD`)
 *   --dunya AD           çıktıya yazılacak dünya adı
 *   --epoch MS           dünyanın gerçek saat epoch'u (vars. anlık görüntüdeki)
 *   --bitis-t MS         gözlem bitişi (sim ms; vars. son kayıt ve görüntü zamanının en büyüğü)
 *   --bitis-trt ISO      aynısı gerçek saatle (örn. 2026-10-23T12:00:00+03:00; --epoch ya da görüntüdeki epoch ile sim ms'e çevrilir). Son kayıttan sonra
 *                        komut gelmediyse (sakin dünya) gözlem pencerelerini kapatmak için verilmelidir
 *   --baslangic AD       bastan | goruntu
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gercekVeriyiYukle, miniVeriyiYukle, parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { parselDosyasiYukle } from "../../sunucu/src/parsel-dosya";
import { cikar } from "./insan-cikarma";
import type { CikarmaOyuncusu } from "./insan-cikarma";
import { dosyaDeposundanOku } from "./insan-cikarma-depo";

interface Arguman {
  depo: string | undefined;
  oyuncular: string | undefined;
  cikti: string | undefined;
  harita: string;
  parsel: string | undefined;
  parselDosya: string | undefined;
  tohum: number | undefined;
  commit: string | undefined;
  dunya: string | undefined;
  epoch: number | undefined;
  bitisT: number | undefined;
  bitisTrt: string | undefined;
  baslangic: "bastan" | "goruntu" | undefined;
  yardim: boolean;
}

const sayi = (v: string, ad: string): number => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${ad} negatif olmayan tamsayi olmali: ${v}`);
  return n;
};

export function cikarmaArgumanAyristir(argv: readonly string[]): Arguman {
  const a: Arguman = { depo: undefined, oyuncular: undefined, cikti: undefined, harita: "sentetik", parsel: undefined, parselDosya: undefined, tohum: undefined, commit: undefined, dunya: undefined, epoch: undefined, bitisT: undefined, bitisTrt: undefined, baslangic: undefined, yardim: false };
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
      case "--depo": a.depo = deger(); break;
      case "--oyuncular": a.oyuncular = deger(); break;
      case "--cikti": a.cikti = deger(); break;
      case "--harita": a.harita = deger(); break;
      case "--parsel": a.parsel = deger(); break;
      case "--parsel-dosya": a.parselDosya = deger(); break;
      case "--tohum": a.tohum = sayi(deger(), "--tohum"); break;
      case "--commit": a.commit = deger(); break;
      case "--dunya": a.dunya = deger(); break;
      case "--epoch": a.epoch = sayi(deger(), "--epoch"); break;
      case "--bitis-t": a.bitisT = sayi(deger(), "--bitis-t"); break;
      case "--bitis-trt": a.bitisTrt = deger(); break;
      case "--baslangic": {
        const v = deger();
        if (v !== "bastan" && v !== "goruntu") throw new Error(`--baslangic bastan|goruntu olmali: ${v}`);
        a.baslangic = v;
        break;
      }
      case "--yardim":
      case "-h": a.yardim = true; break;
      default: throw new Error(`bilinmeyen secenek: ${x}`);
    }
  }
  return a;
}

function veriYukle(ad: string): CekirdekVeriPaketi {
  if (ad === "mini") return miniVeriyiYukle();
  if (ad === "sentetik") return varsayilanVeriyiYukle();
  if (ad === "gercek") return gercekVeriyiYukle();
  if (ad.startsWith("gercek:")) return gercekVeriyiYukle(ad.slice("gercek:".length));
  throw new Error(`bilinmeyen harita: ${ad}`);
}

const YARDIM = `Kullanim: pnpm olcum --kip cikarma --depo DIZIN --oyuncular ESLESME.json --cikti CIKTI.json [--harita mini|sentetik|gercek[:ad]] [--parsel mini|sentetik | --parsel-dosya YOL] [--tohum N] [--commit SHA] [--dunya AD] [--epoch MS] [--bitis-t MS | --bitis-trt ISO] [--baslangic bastan|goruntu]
  Insan testi cikarmasi (kilavuz §7.3): dosya deposunun gunlugunu cevrimdisi yeniden oynatir, oyuncu basina H6 (ii), Y1, Y2, Y5, Y6, Y7, A0-11 olgularini cikarir.
  Depo YALNIZ okunur. Eslesme dosyasi [{ id, kod, profil?, acilis? }] repoda tutulmaz; cikti yalniz K1..K5 kodlarini tasir (kisisel veri yok).
  Sunucuyla AYNI veri paketi (--harita/--parsel[-dosya]) verilmeli: kural surumu eslesmezse durur.`;

export function cikarmaAna(argv: readonly string[]): void {
  const a = cikarmaArgumanAyristir(argv);
  if (a.yardim) {
    console.log(YARDIM);
    return;
  }
  if (a.depo === undefined || a.oyuncular === undefined || a.cikti === undefined) throw new Error("--depo, --oyuncular ve --cikti gerekli (--yardim)");
  const veri = veriYukle(a.harita);
  if (a.parsel !== undefined && a.parselDosya !== undefined) throw new Error("--parsel ve --parsel-dosya birlikte verilemez");
  if (a.parsel !== undefined) {
    const ad = a.parsel === "mini" ? "mini-6" : a.parsel === "sentetik" ? "sentetik-50" : undefined;
    if (ad === undefined) throw new Error(`--parsel mini | sentetik olmali: ${a.parsel}`);
    veri.parsel = parselFiksturuYukle(ad);
  } else if (a.parselDosya !== undefined) veri.parsel = parselDosyasiYukle(resolve(a.parselDosya), veri);
  const oyuncular = JSON.parse(readFileSync(a.oyuncular, "utf8")) as CikarmaOyuncusu[];
  if (!Array.isArray(oyuncular) || oyuncular.length === 0) throw new Error("--oyuncular bos ya da dizi degil");
  const okuma = dosyaDeposundanOku(a.depo);
  for (const u of okuma.uyarilar) console.log(`Uyari: ${u}`);
  let bitisT = a.bitisT;
  if (a.bitisTrt !== undefined) {
    if (bitisT !== undefined) throw new Error("--bitis-t ve --bitis-trt birlikte verilemez");
    const epoch = a.epoch ?? okuma.goruntu?.ek?.dunyaEpochMs;
    if (epoch === undefined) throw new Error("--bitis-trt icin dunya epoch'u gerek (--epoch ya da goruntude dunyaEpochMs)");
    const ms = Date.parse(a.bitisTrt);
    if (!Number.isFinite(ms)) throw new Error(`--bitis-trt gecerli ISO tarih degil: ${a.bitisTrt}`);
    bitisT = ms - epoch;
    if (bitisT < 0) throw new Error(`--bitis-trt dunya epoch'undan once: ${a.bitisTrt}`);
  }
  let commit = a.commit ?? null;
  if (commit === null) {
    try {
      commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      commit = null;
    }
  }
  const cikti = cikar({
    veri,
    gunluk: okuma.gunluk,
    goruntu: okuma.goruntu,
    oyuncular,
    commit,
    ...(a.dunya !== undefined ? { dunya: a.dunya } : {}),
    ...(a.tohum !== undefined ? { tohum: a.tohum } : {}),
    ...(a.epoch !== undefined ? { dunyaEpochMs: a.epoch } : {}),
    ...(bitisT !== undefined ? { bitisTMs: bitisT } : {}),
    ...(a.baslangic !== undefined ? { baslangic: a.baslangic } : {}),
  });
  mkdirSync(dirname(resolve(a.cikti)), { recursive: true });
  writeFileSync(a.cikti, JSON.stringify(cikti, null, 2) + "\n", "utf8");
  console.log(`${okuma.gunluk.length} gunluk kaydi oynatildi (${cikti.test.baslangic}); ${cikti.katilimcilar.length} katilimci; cikti: ${a.cikti}`);
  for (const n of cikti.notlar) if (n.startsWith("UYARI")) console.log(n);
}

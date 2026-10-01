/**
 * Entegrasyon kapısı (O1). Kullanım ve adımlar için scripts/kapi.sh dosyasına bakın.
 *
 * Bir dalı temiz bir geçici worktree'de `entegrasyon` üzerine yeniden tabanlar, sırayla doğrular
 * (kurulum, tip denetimi, lint, tüm vitest, dunya.html boyutu, gerekirse Playwright) ve geçerse `entegrasyon`
 * dalını yeniden tabanlanmış uca ileri sarar. Push yapmaz.
 *
 * Tasarım notları:
 * - Taşınabilir olsun diye (Git Bash dahil) kabuk bağımlılığı yok: kilit, süre aşımı ve süreç temizliği burada.
 * - Bir adım kırılırsa sonrakiler koşmaz. Tek istisna: Playwright betikleri birbirinden bağımsızdır, hepsi koşar.
 * - Yeniden deneme yalnız vitest için ve bir kez: kırılan dosyalar hedefli yeniden koşulur; geçerse "kararsız" yazılır.
 * - Test atlanmaz ya da devre dışı bırakılmaz; atlanan test sayısı (ortam değişkenine bağlı olanlar) yalnız raporlanır.
 *
 * Ortam değişkenleri (hepsi isteğe bağlı):
 *   KAPI_SP                 sonuç, kilit ve geçici worktree'lerin kökü (varsayılan: `entegrasyon` worktree'sinin üst dizini)
 *   KAPI_ENTEGRASYON_DIZIN  `entegrasyon` dalının worktree'si (varsayılan: git worktree listesinden bulunur)
 *   KAPI_KARO               yürüyüş karosu (gebze-z15.pmtiles) kaynağı (varsayılan: ana ağaçtaki dist/harita-verisi/karolar)
 *   KAPI_BEKLE_SN           kilit için en çok bekleme (varsayılan 7200)
 */
import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { appendFileSync, closeSync, copyFileSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readlinkSync, renameSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { hostname, loadavg } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// ---------------------------------------------------------------------------------------------------------------------
// Sabitler

const WIN = process.platform === "win32";
const GZIP_SINIR = 400 * 1024; // 409.600 bayt: dunya.html gzip bütçesi
/** Bu yollardan biri değiştiyse (ya da --istemci verildiyse) `pnpm dunya` ve boyut denetimi koşar; yoksa "yol tetiklemedi" ile atlanır. */
const DUNYA_YOLLARI = ["packages/istemci/", "packages/protokol/", "packages/cekirdek/", "packages/veri/", "packages/botlar/", "pnpm-lock.yaml"];
const KARO_GORELI = join("harita-verisi", "karolar", "gebze-z15.pmtiles");
const IS = "packages/istemci/";
const ON = (...oneks: string[]) => (y: string): boolean => oneks.some((o) => y.startsWith(o));
const ISTEMCI_MANTIK = ["harita/", "komut/", "arayuz/", "isci/"].map((d) => `${IS}src/${d}`);

/** Adım başına süre aşımı (sn). Aşılırsa süreç ağacı öldürülür ve adım kırık sayılır; kilit sonsuza dek tutulmaz. */
const ZAMAN_ASIMI = { rebase: 300, kurulum: 900, tipkontrol: 900, lint: 900, vitest: 2400, vitestTekrar: 900, dunya: 900, playwright: 600 };
/** Bir kapı koşusunun toplam süre sınırı (dk; kilit beklemesi hariç). Aşılırsa koşu durur ve hangi adımda olduğu raporlanır. */
const SURE_SINIRI_SN = Number(process.env["KAPI_SURE_SINIRI_DK"] ?? 45) * 60;

/**
 * Kapıda koşan Playwright betikleri ve tetikleyen yollar (operasyon lideri onayı, 1 Ekim 2026; "ilerleyiş önce" kararıyla
 * P4'ten itibaren): yalnız `f4-uctan-uca` kapıyı kırabilir; `yuru-etkilesim` yalnız rapor olarak koşar (kırığı paketi durdurmaz,
 * `playwright_rapor` alanına yazılır). `kapiDisi` betikler (harita-etkilesim, etkilesim, sakin-ekran) kapıdan çıkarıldı:
 * yol örüntüsüyle ve `--istemci` ile seçilmez, yalnız `--sadece=` ile elle istenebilir.
 * Kabul/ret vermeyen ekran ve ölçüm betikleri (ekran, tasarim-ekran, olcum, yuru-fps-ab, yuru-karakter, yuru-sadelestir)
 * kapı dışıdır; `--istemci` ile de koşmaz. `sakin-ekran` yalnız `istemci/src/kure/` değişince koşar (çizim çağrısı bütçesi).
 * `args`: `{html}` dunya.html yolu, `{ekran}` bu betik için ekran görüntüsü klasörü.
 */
const PLAYWRIGHT: { ad: string; betik: string; args: string[]; tetik: (yol: string) => boolean; yalnizTetik?: boolean; kapiDisi?: boolean; yalnizRapor?: boolean; k1?: (yol: string) => boolean }[] = [
  {
    ad: "harita-etkilesim",
    kapiDisi: true,
    betik: "harita-etkilesim.ts",
    args: ["{ekran}"],
    tetik: (y) => ON(...ISTEMCI_MANTIK, `${IS}src/tasarim/`, "packages/protokol/", "packages/veri/")(y) || (y.startsWith(IS) && y.endsWith(".css")),
  },
  { ad: "f4-uctan-uca", betik: "f4-uctan-uca.ts", args: ["{ekran}"], tetik: ON(...ISTEMCI_MANTIK, "packages/protokol/", "packages/sunucu/src/", "packages/cekirdek/"), k1: ON(IS) },
  {
    ad: "etkilesim",
    kapiDisi: true,
    betik: "etkilesim.ts",
    args: ["{html}", "{ekran}"],
    // istemci/src içinde harita, komut, arayuz, isci, tasarim, yuru dışında kalan her şey (kure, akis, main.ts...); src dışı istemci dosyaları (index.html, vite.config.ts, public/...), botlar ve kilit dosyası da
    tetik: (y) =>
      (y.startsWith(`${IS}src/`) && !ON(...ISTEMCI_MANTIK, `${IS}src/tasarim/`, `${IS}src/yuru/`)(y)) ||
      (y.startsWith(IS) && !y.startsWith(`${IS}src/`) && !y.startsWith(`${IS}scripts/`) && !y.startsWith(`${IS}test/`) && !y.endsWith(".css")) ||
      y.startsWith("packages/botlar/") ||
      y === "pnpm-lock.yaml",
  },
  { ad: "yuru-etkilesim", betik: "yuru-etkilesim.ts", args: ["{ekran}"], tetik: ON(`${IS}src/yuru/`, `${IS}src/harita/stil.ts`), yalnizRapor: true, k1: ON(IS) },
  // çizim çağrısı bütçesini denetler; yalnız küre kodu değişince koşar, --istemci ile koşmaz (--sadece ile istenebilir)
  { ad: "sakin-ekran", betik: "sakin-ekran.ts", args: ["{html}", "{ekran}"], tetik: ON(`${IS}src/kure/`), yalnizTetik: true, kapiDisi: true },
];

// ---------------------------------------------------------------------------------------------------------------------
// Türler

interface AdimKaydi {
  ad: string;
  komut: string;
  durum: "gecti" | "kirik" | "atlandi";
  kod: number | null;
  sure_sn: number;
  gunluk: string | null;
  not?: string;
}

interface KirikTest {
  dosya: string;
  test: string;
  ileti: string;
}

interface VitestOzeti {
  toplam: number;
  gecen: number;
  kirik: number;
  atlanan: number;
  atlananTestler: { dosya: string; test: string }[];
  kirikTestler: KirikTest[];
}

interface Kararsiz {
  dosya: string;
  test: string;
  ilkHata: string;
  yuk1dk: number;
  /** Playwright kararsızlarında betiğin ölçtüğü kare hızları (varsa). */
  fps?: Record<string, unknown> | null;
}

/** scripts/kapi-istisna.json: kırığı kararsız sayılan Playwright betikleri (geçici kural; kuralı operasyon lideri ekler ve kaldırır). */
interface KararsizPlaywright {
  betik: string;
  gerekce?: string;
  /** Paket bu yol öneklerinden birine dokunuyorsa kural uygulanmaz: kırık yine KIRIK. */
  haric_yollar?: string[];
  /** Bilinen kararsız hata desenleri (düzenli ifade, büyük/küçük harfe duyarsız). Verilmişse yalnız bunlar kararsız sayılır. */
  desenler?: string[];
  /** Kararsız sayılabilmesi için en çok kaç hata satırı olabilir (varsayılan: sınır yok). */
  en_cok_hata?: number;
}

class Kirik extends Error {
  readonly adim: string;
  /** true: kod kırık değil, dal sahibinin düzeltmesi gerek (şimdilik yalnız atıf denetimi). */
  readonly duzeltme: boolean;
  constructor(adim: string, ileti: string, duzeltme = false) {
    super(ileti);
    this.adim = adim;
    this.duzeltme = duzeltme;
  }
}

class Kullanim extends Error {}

/** `--on-denetim` modunda ön denetimler bitince akışı keser (hata değil). */
class OnDenetimBitti extends Error {}

/** Pakette her dalın durumu. `cikarma`: dal pakette kalmadıysa nedeni (atif, buyuk-dosya, rebase). */
interface DalKaydi {
  dal: string;
  sha: string;
  atif: AtifSonucu;
  buyuk: BuyukDosyaSonucu;
  durum: "pakette" | "cikarildi";
  cikarma: string | null;
  uc_sha: string | null;
  rebase_cakisma: string[];
  degisen: string[];
  /** Bu dalın kendi commit'lerinin başladığı yer: pakette ondan önce gelen ve bu dalın atası olan dalın ucu, yoksa entegrasyon. */
  taban: string;
  /** Üzerine yığılı olduğu paket içi dal (varsa). Onun commit'leri tekrarlanmaz ve yeniden denetlenmez. */
  ust_dal: string | null;
  /** Bu dalın kendi commit sayısı (taban..dal). */
  commit_sayisi: number;
  /** Dondurulmuş altın dosyalarından bu dalın değiştirdikleri (istisnasız). */
  dondurulmus: string[];
  /** Dalın merge-base'e göre getirdiği dosyalar (eski tabanlı dallarda taban farkı değil, yalnız dalın kendi işi). */
  dal_dosyalari: string[];
}

// ---------------------------------------------------------------------------------------------------------------------
// Küçük yardımcılar

const aktif = new Set<ChildProcess>();
let t0 = Date.now(); // kapı koşusunun başı (kilit alındıktan sonra yeniden kurulur)
const kalanSn = (): number => SURE_SINIRI_SN - (Date.now() - t0) / 1000;

function zamanDamgasi(d = new Date()): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function gunlukYaz(ileti: string): void {
  const d = new Date();
  const s = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  process.stderr.write(`[kapi ${s}] ${ileti}\n`);
}

const yuvarla1 = (n: number): number => Math.round(n * 10) / 10;
const kb = (b: number): string => (b / 1024).toFixed(1);

/** Sonuç dosyaları asla üzerine yazılmaz: aynı ad (aynı saniye) varsa -2, -3... eklenir. */
function benzersizAd(sonucDizin: string, ad: string): string {
  let aday = ad;
  for (let n = 2; existsSync(join(sonucDizin, `${aday}.json`)) || existsSync(join(sonucDizin, aday)); n++) aday = `${ad}-${n}`;
  return aday;
}

function guvenliAd(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, "_");
}

function git(cwd: string, args: string[]): { kod: number; cikti: string } {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { kod: r.status ?? 1, cikti: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

function gitOk(cwd: string, args: string[]): string {
  const r = git(cwd, args);
  if (r.kod !== 0) throw new Kullanim(`git ${args.join(" ")} başarısız (${cwd}):\n${r.cikti}`);
  return r.cikti;
}

/** Süreç ağacını öldürür (POSIX: süreç grubu; Windows: taskkill /T). Hata yutulur: süreç çoktan bitmiş olabilir. */
function agaciOldur(c: ChildProcess): void {
  if (c.pid === undefined) return;
  try {
    if (WIN) spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-c.pid, "SIGKILL");
  } catch {
    /* süreç grubu zaten yok */
  }
}

interface CalistirSecenek {
  cwd: string;
  gunluk: string;
  zamanAsimi: number;
  env?: NodeJS.ProcessEnv;
}

/** Tek kabuk komutu; çıktı doğrudan günlük dosyasına gider. Süre aşımında süreç ağacı öldürülür (kod 124). */
function calistir(komut: string, s: CalistirSecenek): Promise<{ kod: number; sure: number; zamanAsimi: boolean }> {
  return new Promise((coz) => {
    const fd = openSync(s.gunluk, "a");
    writeSync(fd, `$ ${komut}\n# cwd: ${s.cwd}\n# baslangic: ${new Date().toISOString()}\n`);
    const basla = Date.now();
    const c = spawn(komut, { cwd: s.cwd, shell: true, detached: !WIN, stdio: ["ignore", fd, fd], env: s.env ?? process.env });
    aktif.add(c);
    let asildi = false;
    const zamanlayici = setTimeout(() => {
      asildi = true;
      agaciOldur(c);
    }, s.zamanAsimi * 1000);
    let bitti = false;
    const bitir = (kod: number): void => {
      if (bitti) return; // "error" ve "close" ikisi de gelebilir
      bitti = true;
      clearTimeout(zamanlayici);
      agaciOldur(c); // geride kalan torunlar (vitest işçileri, tarayıcı) varsa kapat
      aktif.delete(c);
      const sure = (Date.now() - basla) / 1000;
      writeSync(fd, `# bitis: kod=${kod} sure=${sure.toFixed(1)}s${asildi ? " (ZAMAN ASIMI)" : ""}\n`);
      closeSync(fd);
      coz({ kod: asildi ? 124 : kod, sure, zamanAsimi: asildi });
    };
    c.on("error", () => bitir(127));
    c.on("close", (kod) => bitir(kod ?? 1));
  });
}

interface YabanciSurec {
  pid: number;
  cwd: string | null;
  worktree: string | null;
  args: string;
}

/**
 * Kapı dışı ağır süreçler (başka worktree'lerde koşan vitest, tarayıcı...). Zaman aşımı ya da kırıkta kök neden "yük" ise
 * ihlal eden worktree buradan okunur. Yalnız POSIX; başka yerde boş döner.
 */
function yabanciSurecler(worktreeYollari: string[], kendiWt: string): YabanciSurec[] {
  if (WIN) return [];
  const r = spawnSync("pgrep", ["-af", "chrome --type=gpu|vitest|playwright"], { encoding: "utf8" });
  const cikti: YabanciSurec[] = [];
  const uzunlar = [...worktreeYollari].sort((a, b) => b.length - a.length);
  for (const satir of (r.stdout ?? "").split("\n")) {
    const m = /^(\d+) (.*)$/.exec(satir.trim());
    if (!m) continue;
    const pid = Number(m[1]);
    if (pid === process.pid) continue;
    let cwd: string | null = null;
    try {
      cwd = readlinkSync(`/proc/${pid}/cwd`);
    } catch {
      /* /proc yok ya da süreç bitti */
    }
    if (cwd && kendiWt && (cwd === kendiWt || cwd.startsWith(kendiWt + "/"))) continue; // kapının kendi süreci
    const wt = cwd ? (uzunlar.find((w) => cwd === w || cwd.startsWith(w + "/")) ?? null) : null;
    cikti.push({ pid, cwd, worktree: wt, args: (m[2] ?? "").slice(0, 160) });
  }
  return cikti;
}

function sonSatirlar(dosya: string, n = 15): string {
  try {
    const satirlar = readFileSync(dosya, "utf8").trimEnd().split("\n");
    return satirlar.slice(-n).join("\n");
  } catch {
    return "(günlük okunamadı)";
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Kilit: SP/takim/kapi.kilit (taşınabilir: dosya + süreç canlılığı; flock yok)

let kilitYolu = "";
let kilitBizim = false;

function surecCanli(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function bekle(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function kilitAl(yol: string, dal: string, enCokSn: number): Promise<void> {
  kilitYolu = yol;
  mkdirSync(dirname(yol), { recursive: true });
  const bekleBasla = Date.now();
  let yazdi = false;
  for (;;) {
    try {
      const fd = openSync(yol, "wx");
      writeSync(fd, JSON.stringify({ pid: process.pid, dal, zaman: new Date().toISOString(), makine: hostname() }) + "\n");
      closeSync(fd);
      kilitBizim = true;
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    let sahip: { pid?: number; dal?: string; zaman?: string } = {};
    try {
      sahip = JSON.parse(readFileSync(yol, "utf8")) as typeof sahip;
    } catch {
      /* yarım yazılmış kilit: aşağıda bayat sayılır */
    }
    const ayniMakine = (sahip as { makine?: string }).makine === undefined || (sahip as { makine?: string }).makine === hostname();
    if (typeof sahip.pid === "number" && ayniMakine && !surecCanli(sahip.pid)) {
      gunlukYaz(`bayat kilit temizleniyor (pid ${sahip.pid}, dal ${sahip.dal ?? "?"})`);
      try {
        renameSync(yol, `${yol}.bayat-${process.pid}`); // atomik: iki bekleyenden yalnız biri kazanır
        rmSync(`${yol}.bayat-${process.pid}`, { force: true });
      } catch {
        /* başkası temizledi */
      }
      continue;
    }
    if (!yazdi) {
      gunlukYaz(`kapı meşgul (dal ${sahip.dal ?? "?"}, pid ${sahip.pid ?? "?"}, ${sahip.zaman ?? "?"}); sıra bekleniyor`);
      yazdi = true;
    }
    if ((Date.now() - bekleBasla) / 1000 > enCokSn) throw new Kullanim(`kapı kilidi ${enCokSn} sn içinde alınamadı: ${yol}`);
    await bekle(5000);
  }
}

function kilitBirak(): void {
  if (!kilitBizim || !kilitYolu) return;
  try {
    const sahip = JSON.parse(readFileSync(kilitYolu, "utf8")) as { pid?: number };
    if (sahip.pid === process.pid) rmSync(kilitYolu, { force: true });
  } catch {
    /* kilit zaten yok */
  }
  kilitBizim = false;
}

// ---------------------------------------------------------------------------------------------------------------------
// Temizlik (eşzamanlı: sinyal ve çıkış yollarında da çalışmalı)

let geciciWt = "";
let anaDizin = "";
let sakla = false;
let temizlendi = false;

function temizle(): string[] {
  if (temizlendi) return [];
  temizlendi = true;
  for (const c of aktif) agaciOldur(c);
  aktif.clear();
  const artik: string[] = [];
  if (geciciWt) {
    if (!WIN) {
      // Geçici worktree yolunu komut satırında taşıyan artık süreç var mı? (vitest, vite, tarayıcı...)
      const r = spawnSync("pgrep", ["-f", geciciWt], { encoding: "utf8" });
      for (const p of (r.stdout ?? "").split("\n").map((x) => Number(x.trim())).filter((x) => x > 0 && x !== process.pid)) {
        artik.push(String(p));
        try {
          process.kill(p, "SIGKILL");
        } catch {
          /* bitmiş */
        }
      }
    }
    if (!sakla && existsSync(geciciWt)) {
      const r = git(anaDizin || process.cwd(), ["worktree", "remove", "--force", geciciWt]);
      if (r.kod !== 0 || existsSync(geciciWt)) rmSync(geciciWt, { recursive: true, force: true, maxRetries: 3 });
      git(anaDizin || process.cwd(), ["worktree", "prune"]);
    }
  }
  kilitBirak();
  return artik;
}

for (const sinyal of ["SIGINT", "SIGTERM", "SIGHUP"] as const)
  process.on(sinyal, () => {
    gunlukYaz(`${sinyal} alındı; temizleniyor`);
    temizle();
    process.exit(130);
  });
process.on("exit", () => {
  temizle();
});

// ---------------------------------------------------------------------------------------------------------------------
// vitest JSON ayrıştırma

interface VitestJson {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  numTodoTests?: number;
  testResults?: {
    name?: string;
    status?: string;
    message?: string;
    assertionResults?: { fullName?: string; title?: string; status?: string; failureMessages?: string[] }[];
  }[];
}

function ilkSatir(s: string | undefined, n = 300): string {
  const t = (s ?? "").replace(/\u001b\[[0-9;]*m/g, "").trim().split("\n")[0] ?? "";
  return t.length > n ? `${t.slice(0, n)}...` : t;
}

function vitestOku(json: string, kok: string): VitestOzeti | null {
  let j: VitestJson;
  try {
    j = JSON.parse(readFileSync(json, "utf8")) as VitestJson;
  } catch {
    return null;
  }
  const kirikTestler: KirikTest[] = [];
  const atlananTestler: { dosya: string; test: string }[] = [];
  for (const d of j.testResults ?? []) {
    const dosya = d.name ? relative(kok, d.name).split("\\").join("/") : "?";
    let testKirik = false;
    for (const a of d.assertionResults ?? []) {
      if (a.status === "skipped" || a.status === "pending" || a.status === "todo" || a.status === "disabled") atlananTestler.push({ dosya, test: a.fullName ?? a.title ?? "?" });
      if (a.status === "failed") {
        testKirik = true;
        kirikTestler.push({ dosya, test: a.fullName ?? a.title ?? "?", ileti: ilkSatir(a.failureMessages?.[0]) });
      }
    }
    // Dosya yüklenemedi / paket hatası: test düzeyinde kırık yok ama dosya kırık
    if (d.status === "failed" && !testKirik) kirikTestler.push({ dosya, test: "(dosya yüklenemedi ya da paket hatası)", ileti: ilkSatir(d.message) });
  }
  const toplam = j.numTotalTests ?? 0;
  const atlanan = (j.numPendingTests ?? 0) + (j.numTodoTests ?? 0);
  return { toplam, gecen: j.numPassedTests ?? 0, kirik: j.numFailedTests ?? kirikTestler.length, atlanan, atlananTestler, kirikTestler };
}

// ---------------------------------------------------------------------------------------------------------------------
// Ana akış

interface Secenekler {
  dallar: string[];
  istemci: boolean;
  kuru: boolean;
  sakla: boolean;
  ileriSar: boolean;
  /** Paket adı (`--ad=p3`): sonuç dosyası, günlük dizini ve PG bekleyen uç (`refs/kapi/<ad>`) bu adla anılır. */
  ad: string | null;
  /** Kırık arama modu (`--sadece=a,b`): kurulum + dunya + yalnız verilen Playwright betikleri; tipkontrol, lint, vitest ve ön denetimler yok. */
  sadece: string[] | null;
  /** `--on-denetim`: yalnız ön denetimler (atıf, büyük dosya, dondurulmuş altın, yığılma); kilit, worktree ve ağır adım yok. */
  onDenetim: boolean;
  /** Kademeli kapı (sahip kararı): 1 = tsc + lint + vitest related (+ çekirdek testleri) + dunya (yol tetiklerse) + f4 (istemci değiştiyse); 2 = tam vitest + dunya + f4 + yuru (yalnız rapor). Varsayılan 1. */
  kademe: 1 | 2;
  /** Tekrar koşusu işareti: ozet.log satırına `tekrar=evet`, JSON'a `tekrar: true`. İlk resmi sonuç değişmez. */
  tekrar: boolean;
}

function seceneklerOku(argv: string[]): Secenekler {
  const s: Secenekler = { dallar: [], istemci: false, kuru: false, sakla: false, ileriSar: false, ad: null, sadece: null, onDenetim: false, kademe: 1, tekrar: false };
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i] ?? "";
    if (a === "--kademe") a = `--kademe=${argv[++i] ?? ""}`; // "--kademe 2" ve "--kademe=2"
    if (a.startsWith("--kademe=")) {
      const k = a.slice("--kademe=".length);
      if (k !== "1" && k !== "2") throw new Kullanim(`--kademe 1 ya da 2 olmalı: ${k}`);
      s.kademe = k === "1" ? 1 : 2;
    } else if (a === "--tekrar") s.tekrar = true;
    else if (a === "--istemci") s.istemci = true;
    else if (a === "--kuru") s.kuru = true;
    else if (a === "--sakla") s.sakla = true;
    else if (a === "--ileri-sar") s.ileriSar = true;
    else if (a === "--on-denetim") s.onDenetim = true;
    else if (a.startsWith("--ad=")) s.ad = a.slice("--ad=".length) || null;
    else if (a.startsWith("--sadece=")) s.sadece = a.slice("--sadece=".length).split(",").filter(Boolean);
    else if (a === "-h" || a === "--yardim") throw new Kullanim("yardim");
    else if (a.startsWith("-")) throw new Kullanim(`bilinmeyen seçenek: ${a}`);
    else s.dallar.push(a);
  }
  if (s.dallar.length === 0) throw new Kullanim("dal verilmedi");
  if (new Set(s.dallar).size !== s.dallar.length) throw new Kullanim("aynı dal birden çok kez verildi");
  return s;
}

const KULLANIM = `Kullanım: scripts/kapi.sh <dal> [<dal2> ...] [--ad=<paket>] [--istemci] [--kuru] [--sakla] [--sadece=<betik,...>] [--on-denetim] [--kademe=1|2] [--tekrar]
          scripts/kapi.sh --ileri-sar <paket-adı | dal [<dal2> ...]>
  --ad=<paket> paketin adı: sonuç dosyası, günlük dizini ve PG bekleyen uç (refs/kapi/<paket>) bu adla anılır;
               verilmezse dal adları birleştirilir. Sonra: scripts/kapi.sh --ileri-sar <paket>
  <dal>        kapıdan geçirilecek dal (ya da commit); entegrasyon üzerine yeniden tabanlanır. Birden çok dal
               verilirse paket olur: verilen sırayla üst üste yeniden tabanlanır, tam kapı bir kez koşar, geçerse
               tek seferde ileri sarılır. Atıf ve büyük dosya denetimi her dalın her commit'inde ayrı yapılır;
               eksik çıkan dal paketten çıkarılır (DUZELTME GEREKLI), kalanlarla devam edilir. Bir dal, pakette önce
               gelen bir dalın üstüne yığılıysa (ata ise) yalnız kendi commit'leri alınır ve denetlenir; üst dal
               çıkarılırsa o da çıkarılır.
  --istemci    istemci değişmese de Playwright betiklerini koş
  --kademe=1|2 kademeli kapı (varsayılan 1). 1: tsc + lint + vitest related <değişen dosyalar> (çekirdek değiştiyse
               packages/cekirdek testleri de) + dunya (yol tetiklerse) + f4 (yalnız istemci değiştiyse). 2: tam vitest + dunya +
               f4 + yuru (yalnız rapor); her 3. pakette, kural sürümü ya da protokol şeması değişince, sabahın son paketinde.
  --tekrar     tekrar koşusu işareti: özet satırına tekrar=evet, JSON'a tekrar: true (ilk resmi sonuç korunur)
  --on-denetim yalnız ön denetimler (atıf, büyük dosya, dondurulmuş altın, yığılma; dal dal): saniyeler sürer, kilit
               almaz, worktree açmaz, hiçbir şeye dokunmaz. Kuyruğa girmeden önce dalları yoklamak için.
  --kuru       her şeyi koş ama geçse bile entegrasyon dalını ileri sarma (sınama için)
  --sadece=a,b kırık arama: kurulum + dunya + yalnız verilen Playwright betikleri (ör. f4-uctan-uca,yuru-etkilesim);
               tipkontrol, lint, vitest ve ön denetimler koşmaz. Geçse bile ileri sarmaz: uç refs/kapi/<ad> altında
               "GECTI (kismi)" ile tutulur, ileri sarma açık onayla --ileri-sar ile yapılır. Bir dal yerine tam
               commit verilirse (ör. daha önce test edilmiş uç) aynı uç yeniden sınanır.
  --sakla      geçici worktree'yi silme (hata ayıklama)
  --ileri-sar  "GECTI (PG bekliyor)" sonucuyla bırakılan ucu (refs/kapi/<dal>[_<dal2>...]), yalnız hâlâ güncel entegrasyon
               üzerindeyse, entegrasyon dalına ileri sarar. PG testleri olumlu bittikten sonra kullanılır.
Postgres ile sınanması gereken dallarda (packages/sunucu/sql/, packages/sunucu/src/depo/, deploy/yedek.sh,
deploy/geri-yukle.sh ya da BOLGE_PG_URL kullanan test dosyaları değişmişse) pg'siz adımlar geçse bile ileri sarılmaz.
Çıkış kodu: 0 geçti, 1 kırık, 2 kullanım ya da ortam hatası, 3 düzeltme gerekli (atıf satırı eksik ya da depo politikasına aykırı büyük dosya).`;

interface WorktreeBilgi {
  yol: string;
  dal: string | null;
}

function worktreeler(cwd: string): WorktreeBilgi[] {
  const cikti = gitOk(cwd, ["worktree", "list", "--porcelain"]);
  const sonuc: WorktreeBilgi[] = [];
  for (const blok of cikti.split(/\r?\n\r?\n/)) {
    let yol = "";
    let dal: string | null = null;
    for (const satir of blok.split(/\r?\n/)) {
      if (satir.startsWith("worktree ")) yol = satir.slice("worktree ".length);
      else if (satir.startsWith("branch refs/heads/")) dal = satir.slice("branch refs/heads/".length);
    }
    if (yol) sonuc.push({ yol: resolve(yol), dal });
  }
  return sonuc;
}

/** Her commit mesajında bulunması gereken oturum satırı (baş lider kararı; bkz. SP/takim/ortak.md). */
const OTURUM_SATIRI = process.env["KAPI_OTURUM_SATIRI"] ?? "Claude-Session: https://claude.ai/code/session_01YQaN9Xy6JqWQSadMfNhyVn";

interface AtifSonucu {
  incelenen: number;
  eksik: string[];
  ayrinti: { sha: string; konu: string; eksik: string[] }[];
}

/**
 * Atıf denetimi: `entegrasyon..<dal>` aralığındaki her commit mesajında tam oturum satırı ve bir "Co-Authored-By: Claude ..."
 * satırı olmalı (model adı denetlenmez; adres noreply@anthropic.com olmalı).
 */
function atifDenetle(cwd: string, taban: string, dal: string): AtifSonucu {
  const sonuc: AtifSonucu = { incelenen: 0, eksik: [], ayrinti: [] };
  const liste = gitOk(cwd, ["rev-list", `${taban}..${dal}`]).split("\n").filter(Boolean);
  for (const sha of liste) {
    sonuc.incelenen++;
    const mesaj = gitOk(cwd, ["show", "-s", "--format=%B", sha]);
    const satirlar = mesaj.split(/\r?\n/).map((l) => l.trimEnd());
    const eksik: string[] = [];
    if (!satirlar.includes(OTURUM_SATIRI)) eksik.push("Claude-Session");
    if (!satirlar.some((l) => /^Co-Authored-By: Claude\b.*<noreply@anthropic\.com>$/i.test(l))) eksik.push("Co-Authored-By: Claude <model> <noreply@anthropic.com>");
    if (eksik.length > 0) {
      sonuc.eksik.push(sha.slice(0, 7));
      sonuc.ayrinti.push({ sha, konu: satirlar[0] ?? "", eksik });
    }
  }
  return sonuc;
}

/** Depo politikası: git'e yalnız BHI1, manifest ve küçük test verisi girer; tek dosya 1 MB'ı aşamaz, *.pmtiles girmez, LFS yok. */
const BUYUK_SINIR = 1024 * 1024;

interface Istisna {
  dal: string;
  onay?: string;
  gerekce?: string;
  /** Verilirse istisna yalnız bu yol önekleri için geçerlidir. */
  yol_onekleri?: string[];
}

interface BuyukDosyaSonucu {
  bulunan: { yol: string; bayt: number; neden: string }[];
  ihlal: { yol: string; bayt: number; neden: string }[];
  istisna: Istisna | null;
}

/** İstisna listesi kapıyı koşturan ağaçtan okunur (scripts/kapi-istisna.json); denenen dalın kopyası sayılmaz. */
function istisnalariOku(betikDizin: string): Istisna[] {
  try {
    const j = JSON.parse(readFileSync(join(betikDizin, "kapi-istisna.json"), "utf8")) as { buyuk_dosya?: Istisna[] };
    return Array.isArray(j.buyuk_dosya) ? j.buyuk_dosya : [];
  } catch {
    return [];
  }
}

/** `entegrasyon...<dal>` farkında eklenen ya da değişen dosyalardan 1 MB'ı aşanlar ve *.pmtiles. */
function buyukDosyaDenetle(cwd: string, taban: string, dal: string, dalAdi: string, istisnalar: Istisna[]): BuyukDosyaSonucu {
  const r = spawnSync("git", ["diff", "--numstat", "--no-renames", "-z", `${taban}...${dal}`], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const bulunan: BuyukDosyaSonucu["bulunan"] = [];
  for (const kayit of (r.stdout ?? "").split("\0")) {
    const m = /^(\S+)\t(\S+)\t([\s\S]+)$/.exec(kayit);
    if (!m) continue;
    const yol = m[3] ?? "";
    const boyut = git(cwd, ["cat-file", "-s", `${dal}:${yol}`]); // silinmiş dosyada hata verir: atlanır
    if (boyut.kod !== 0) continue;
    const bayt = Number(boyut.cikti);
    const nedenler: string[] = [];
    if (yol.toLowerCase().endsWith(".pmtiles")) nedenler.push("pmtiles");
    if (bayt > BUYUK_SINIR) nedenler.push("1MB-ustu");
    if (nedenler.length > 0) bulunan.push({ yol, bayt, neden: nedenler.join("+") });
  }
  const istisna = bulunan.length > 0 ? (istisnalar.find((i) => i.dal === dalAdi) ?? null) : null;
  const ihlal = istisna ? bulunan.filter((b) => istisna.yol_onekleri !== undefined && !istisna.yol_onekleri.some((o) => b.yol.startsWith(o))) : bulunan;
  return { bulunan, ihlal, istisna };
}

interface SizintiSonucu {
  yapilandirma: boolean;
  dizge_sayisi: number;
  taranan: string[];
  bulunan: { dosya: string; dizge: string }[];
}

/**
 * İstemci sızıntı denetimi: derlenmiş istemci çıktısında (dunya.html, harita.js, yuru.js ve diğer .js/.css/.html parçaları)
 * yasaklı dizgeler olmamalı. Dizge listesi scripts/kapi-istemci-yasak.json'dan, kapıyı koşturan ağaçtan okunur
 * (denenen dalın kopyası sayılmaz). Eşleşme büyük/küçük harfe duyarsızdır.
 */
function istemciSizintiDenetle(kok: string, betikDizin: string): SizintiSonucu {
  const sonuc: SizintiSonucu = { yapilandirma: false, dizge_sayisi: 0, taranan: [], bulunan: [] };
  let dizgeler: string[] = [];
  try {
    const j = JSON.parse(readFileSync(join(betikDizin, "kapi-istemci-yasak.json"), "utf8")) as { dizgeler?: string[] };
    dizgeler = (j.dizgeler ?? []).filter((d) => typeof d === "string" && d.length > 0);
    sonuc.yapilandirma = true;
  } catch {
    return sonuc;
  }
  sonuc.dizge_sayisi = dizgeler.length;
  const adaylar: string[] = [];
  for (const dizin of [join(kok, "istemci"), join(kok, "packages", "istemci", "dist", "assets")]) {
    try {
      for (const f of readdirSync(dizin)) if (/\.(html|js|mjs|css)$/i.test(f)) adaylar.push(join(dizin, f));
    } catch {
      /* dizin yok */
    }
  }
  for (const dosya of adaylar) {
    const goreli = relative(kok, dosya).split("\\").join("/");
    sonuc.taranan.push(goreli);
    const icerik = readFileSync(dosya, "utf8").toLowerCase();
    for (const d of dizgeler) if (icerik.includes(d.toLowerCase())) sonuc.bulunan.push({ dosya: goreli, dizge: d });
  }
  return sonuc;
}

/** Kırık adımın günlüğünden dosya yollarını ayıklar (tsc: `yol(satır,sütun): error`; eslint: mutlak yol satırları). */
function kirikDosyalari(ad: string, gunlukYolu: string, kok: string): string[] {
  let metin = "";
  try {
    metin = readFileSync(gunlukYolu, "utf8");
  } catch {
    return [];
  }
  const bulunan = new Set<string>();
  if (ad === "tipkontrol") for (const m of metin.matchAll(/^([^\s(][^(]*)\(\d+,\d+\): error/gm)) bulunan.add((m[1] ?? "").split("\\").join("/"));
  if (ad === "lint") for (const m of metin.matchAll(/^(\/[^\n]+\.(?:ts|tsx|js|mjs|cjs))$/gm)) bulunan.add(relative(kok, m[1] ?? "").split("\\").join("/"));
  return [...bulunan];
}

function kararsizPlaywrightOku(betikDizin: string): KararsizPlaywright[] {
  try {
    const j = JSON.parse(readFileSync(join(betikDizin, "kapi-istisna.json"), "utf8")) as { kararsiz_playwright?: KararsizPlaywright[] };
    return Array.isArray(j.kararsiz_playwright) ? j.kararsiz_playwright : [];
  } catch {
    return [];
  }
}

/** Playwright günlüğündeki HATA satırları ve (varsa) "Ölçümler" JSON'undaki fps değerleri. */
function playwrightOzeti(gunlukYolu: string): { hata: string[]; fps: Record<string, unknown> | null } {
  let metin = "";
  try {
    metin = readFileSync(gunlukYolu, "utf8");
  } catch {
    return { hata: [], fps: null };
  }
  const hata = metin.split("\n").filter((l) => l.startsWith("HATA")).map((l) => l.trim().slice(0, 200));
  if (/TimeoutError/.test(metin)) {
    // "page.waitForFunction: Timeout 90000ms exceeded." satırı ve onu çağıran işlev (ör. yuruHazir)
    const zaman = /^(\S+: Timeout \d+ms exceeded\.?)/m.exec(metin)?.[1] ?? "TimeoutError";
    const isleve = /^\s+at (\w+) \(/m.exec(metin)?.[1];
    hata.push(`${zaman}${isleve ? ` @ ${isleve}` : ""}`);
  }
  let fps: Record<string, unknown> | null = null;
  const m = /Ölçümler: (\{.*\})/.exec(metin);
  if (m) {
    try {
      const o = JSON.parse(m[1] ?? "{}") as Record<string, Record<string, unknown>>;
      fps = {};
      for (const [k, v] of Object.entries(o)) {
        if (typeof v?.["fps"] === "number") fps[k] = Math.round((v["fps"] as number) * 10) / 10;
        else {
          const alt: Record<string, number> = {};
          for (const [kk, vv] of Object.entries(v ?? {})) if (typeof (vv as { fps?: unknown } | null)?.fps === "number") alt[kk] = Math.round(((vv as { fps: number }).fps) * 10) / 10;
          if (Object.keys(alt).length > 0) fps[k] = alt;
        }
      }
    } catch {
      fps = null;
    }
  }
  return { hata, fps };
}

/** K-2 dondurulmuş altın denetimi: bu yollardaki dosyalar (fikstürler, regresyon testleri) pakette değişmemeli. */
interface DondurulmusYapilandirma {
  yollar: string[];
  /** Bu yollar da dondurulmuştur, ama ilk girişleri (ekleme) serbesttir: ekleyen paketin kendisi kırmaz, ondan sonra her değişiklik KIRIK. */
  ilk_giris_serbest: string[];
  istisna: { dal: string; onay?: string; gerekce?: string; yollar?: string[] }[];
}

/** Yapılandırma kapıyı koşturan ağaçtan okunur (scripts/kapi-dondurulmus.json); denenen dalın kopyası sayılmaz. */
function dondurulmusOku(betikDizin: string): DondurulmusYapilandirma | null {
  try {
    const j = JSON.parse(readFileSync(join(betikDizin, "kapi-dondurulmus.json"), "utf8")) as { yollar?: string[]; ilk_giris_serbest?: string[]; istisna?: DondurulmusYapilandirma["istisna"] };
    const temiz = (l: string[] | undefined): string[] => (l ?? []).filter((y) => typeof y === "string" && y.length > 0);
    const yollar = temiz(j.yollar);
    const serbest = temiz(j.ilk_giris_serbest);
    return yollar.length + serbest.length > 0 ? { yollar, ilk_giris_serbest: serbest, istisna: Array.isArray(j.istisna) ? j.istisna : [] } : null;
  } catch {
    return null;
  }
}

/**
 * `git diff --name-status a b -- <yollar>` (a, b: commit ya da ağaç). Denetim ve negatif kontrol aynı işlevi kullanır.
 * İhlal: dondurulmuş bir yolda değişiklik ya da silme; ekleme yalnız `yollar` (katı liste) içindeyse ihlaldir,
 * `ilk_giris_serbest` içindeki yolların ilk girişi serbesttir.
 */
function dondurulmusFark(cwd: string, a: string, b: string, yap: DondurulmusYapilandirma): string[] {
  const hepsi = [...yap.yollar, ...yap.ilk_giris_serbest];
  const r = spawnSync("git", ["diff", "--name-status", "--no-renames", a, b, "--", ...hepsi.map((y) => `:(glob)${y}`)], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Kullanim(`dondurulmuş altın farkı alınamadı: ${(r.stderr ?? "").trim()}`);
  const ihlal: string[] = [];
  for (const satir of (r.stdout ?? "").split("\n").filter(Boolean)) {
    const [durum, ...yol] = satir.split("\t");
    const dosya = yol.join("\t");
    if (durum === "A" && !yap.yollar.some((y) => globEsler(y, dosya))) continue; // ilk giriş serbest
    ihlal.push(dosya);
  }
  return ihlal;
}

/** Basit glob eşleme: `**` her şey, `*` yol ayracı dışında her şey. */
function globEsler(glob: string, dosya: string): boolean {
  const re = glob
    .split("**")
    .map((p) => p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join(".*");
  return new RegExp(`^${re}$`).test(dosya);
}

/**
 * Negatif kontrol: listeden bir dosyada 1 bayt değiştirilmiş geçici bir ağaç kurulur (geçici git indeksi; çalışma ağacına ve
 * dalların hiçbirine dokunulmaz), aynı denetim bu ağaca karşı kırmızı vermeli. Sonra geçici indeks silinir.
 */
function dondurulmusNegatifKontrol(cwd: string, taban: string, yap: DondurulmusYapilandirma, gecici: string): { dosya: string | null; sonuc: "kirmizi" | "yesil" | "uygulanamaz" } {
  const liste = gitOk(cwd, ["ls-tree", "-r", "--name-only", taban]).split("\n").filter((f) => [...yap.yollar, ...yap.ilk_giris_serbest].some((y) => globEsler(y, f))).sort();
  const dosya = liste[0];
  if (!dosya) return { dosya: null, sonuc: "uygulanamaz" };
  const ortam: NodeJS.ProcessEnv = { ...process.env, GIT_INDEX_FILE: gecici };
  try {
    const icerik = spawnSync("git", ["cat-file", "blob", `${taban}:${dosya}`], { cwd, maxBuffer: 256 * 1024 * 1024 });
    if (icerik.status !== 0) return { dosya, sonuc: "uygulanamaz" };
    const degisik = Buffer.concat([icerik.stdout, Buffer.from("\n")]); // 1 bayt eklenir
    const h = spawnSync("git", ["hash-object", "-w", "--stdin"], { cwd, input: degisik, encoding: "utf8" });
    const blob = (h.stdout ?? "").trim();
    if (h.status !== 0 || !blob) return { dosya, sonuc: "uygulanamaz" };
    if (spawnSync("git", ["read-tree", taban], { cwd, env: ortam }).status !== 0) return { dosya, sonuc: "uygulanamaz" };
    if (spawnSync("git", ["update-index", "--cacheinfo", `100644,${blob},${dosya}`], { cwd, env: ortam }).status !== 0) return { dosya, sonuc: "uygulanamaz" };
    const w = spawnSync("git", ["write-tree"], { cwd, env: ortam, encoding: "utf8" });
    const agac = (w.stdout ?? "").trim();
    if (w.status !== 0 || !agac) return { dosya, sonuc: "uygulanamaz" };
    const fark = dondurulmusFark(cwd, `${taban}^{tree}`, agac, yap);
    return { dosya, sonuc: fark.includes(dosya) ? "kirmizi" : "yesil" };
  } finally {
    rmSync(gecici, { force: true });
  }
}

/** Postgres ile doğrulanması gereken yollar: kapı BOLGE_PG_URL olmadan koştuğu için bunları sınayamaz. */
const PG_YOLLARI = ["packages/sunucu/sql/", "packages/sunucu/src/depo/", "deploy/yedek.sh", "deploy/geri-yukle.sh"];

/** Değişen dosyalardan pg gerektirenleri döndürür: sabit yollar ya da BOLGE_PG_URL kullanan test dosyaları. */
function pgNedenleri(wt: string, degisen: string[]): string[] {
  const nedenler: string[] = [];
  for (const d of degisen) {
    if (PG_YOLLARI.some((y) => d.startsWith(y))) {
      nedenler.push(d);
    } else if (/^packages\/[^/]+\/test\/.*\.ts$/.test(d)) {
      try {
        if (readFileSync(join(wt, d), "utf8").includes("BOLGE_PG_URL")) nedenler.push(d);
      } catch {
        /* dosya silinmiş */
      }
    }
  }
  return nedenler;
}

const pgRefAdi = (dal: string): string => `refs/kapi/${dal.replace(/[^A-Za-z0-9._/-]+/g, "_")}`;

interface IleriSarmaKaydi {
  yapildi: boolean;
  once: string | null;
  sonra: string | null;
  not?: string;
}

/** `entegrasyon` dalını (kendi worktree'sinde) hedef commit'e ileri sarar. Koşullar uymazsa Kirik("ileri-sar") fırlatır. */
async function entegrasyonuIleriSar(entegDizin: string, beklenenTaban: string, hedef: string, degisen: string[], gunlukDosya: string, ortam: NodeJS.ProcessEnv): Promise<IleriSarmaKaydi> {
  const simdi = gitOk(entegDizin, ["rev-parse", "--verify", "refs/heads/entegrasyon^{commit}"]);
  const dalAdi = git(entegDizin, ["branch", "--show-current"]).cikti;
  const kirli = git(entegDizin, ["status", "--porcelain"]).cikti;
  if (simdi !== beklenenTaban) throw new Kirik("ileri-sar", `entegrasyon ilerlemiş (${simdi.slice(0, 7)}, beklenen ${beklenenTaban.slice(0, 7)}); ileri sarılmadı`);
  if (dalAdi !== "entegrasyon" || kirli) throw new Kirik("ileri-sar", `entegrasyon worktree'si uygun değil (dal=${dalAdi || "?"}, kirli=${kirli ? "evet" : "hayır"})`);
  const m = git(entegDizin, ["merge", "--ff-only", hedef]);
  if (m.kod !== 0) throw new Kirik("ileri-sar", `merge --ff-only başarısız: ${m.cikti}`);
  const sonra = gitOk(entegDizin, ["rev-parse", "HEAD"]);
  gunlukYaz(`entegrasyon ileri sarıldı: ${beklenenTaban.slice(0, 7)} -> ${sonra.slice(0, 7)}`);
  // Kilit dosyası değiştiyse yeni HEAD için bağımlılıkları güncel tut (en iyi çaba)
  if (degisen.includes("pnpm-lock.yaml")) {
    const r = await calistir("pnpm install --frozen-lockfile", { cwd: entegDizin, gunluk: gunlukDosya, zamanAsimi: ZAMAN_ASIMI.kurulum, env: ortam });
    gunlukYaz(`entegrasyon worktree'sinde kurulum: kod ${r.kod}`);
  }
  return { yapildi: true, once: beklenenTaban, sonra };
}

function tabanBoyutYaz(sonucDizin: string, sha: string, gzipBayt: number): void {
  const tabanYolu = join(sonucDizin, "taban-boyut.json");
  let taban: Record<string, { gzip_bayt: number }> = {};
  try {
    taban = JSON.parse(readFileSync(tabanYolu, "utf8")) as typeof taban;
  } catch {
    /* ilk kayıt */
  }
  taban[sha] = { gzip_bayt: gzipBayt };
  writeFileSync(tabanYolu, JSON.stringify(taban, null, 2) + "\n");
}

/** `--ileri-sar <dal>`: PG sonrası ileri sarma. Kilit alınmış olarak çağrılır. */
async function ileriSarKomutu(dal: string, entegDizin: string, sonucDizin: string, ortam: NodeJS.ProcessEnv): Promise<number> {
  const zaman = zamanDamgasi();
  const kosuAd = benzersizAd(sonucDizin, `${guvenliAd(dal)}-${zaman}-ileri-sar`);
  const jsonYolu = join(sonucDizin, `${kosuAd}.json`);
  const ref = pgRefAdi(dal);
  const uc = git(entegDizin, ["rev-parse", "--verify", `${ref}^{commit}`]);
  if (uc.kod !== 0) throw new Kullanim(`bekleyen uç yok: ${ref} (önce scripts/kapi.sh ${dal} çalıştırılmalı ve "GECTI (PG bekliyor)" vermeli)`);
  const entegSha = gitOk(entegDizin, ["rev-parse", "--verify", "refs/heads/entegrasyon^{commit}"]);
  const ucSha = uc.cikti;
  let sonuc: IleriSarmaKaydi;
  let ret = 0;
  let neden = "";
  if (git(entegDizin, ["merge-base", "--is-ancestor", entegSha, ucSha]).kod !== 0) {
    ret = 1;
    neden = "uc-eski: entegrasyon uçtan sonra ilerledi; dal yeniden kapıdan (ve PG'den) geçmeli";
    sonuc = { yapildi: false, once: entegSha, sonra: null, not: neden };
  } else {
    const degisen = git(entegDizin, ["diff", "--name-only", entegSha, ucSha]).cikti.split("\n").filter(Boolean);
    try {
      sonuc = await entegrasyonuIleriSar(entegDizin, entegSha, ucSha, degisen, join(sonucDizin, `${kosuAd}-kurulum.log`), ortam);
      git(entegDizin, ["update-ref", "-d", ref]);
    } catch (e) {
      if (!(e instanceof Kirik)) throw e;
      ret = 1;
      neden = e.message;
      sonuc = { yapildi: false, once: entegSha, sonra: null, not: neden };
    }
  }
  // Kapı geçişinde ölçülen gzip boyutunu bul (uc_sha eşleşen en yeni GECTI kaydı) ve taban kaydına işle
  let gzip: number | null = null;
  if (sonuc.yapildi) {
    for (const f of readdirSync(sonucDizin).filter((x) => x.endsWith(".json") && !x.endsWith("-ileri-sar.json")).sort().reverse()) {
      try {
        const k = JSON.parse(readFileSync(join(sonucDizin, f), "utf8")) as { uc_sha?: string; gzip_bayt?: number; sonuc?: string };
        if (k.uc_sha === ucSha && String(k.sonuc).startsWith("GECTI") && typeof k.gzip_bayt === "number") {
          gzip = k.gzip_bayt;
          break;
        }
      } catch {
        /* bozuk kayıt */
      }
    }
    if (gzip !== null) tabanBoyutYaz(sonucDizin, ucSha, gzip);
  }
  const ozet = ret === 0 ? `KAPI ILERI-SARILDI dal=${dal} taban=${entegSha.slice(0, 7)} uc=${ucSha.slice(0, 7)} gzip=${gzip !== null ? `${kb(gzip)}KB` : "-"}` : `KAPI ILERI-SAR-REDDEDILDI dal=${dal} taban=${entegSha.slice(0, 7)} uc=${ucSha.slice(0, 7)} neden=${neden}`;
  writeFileSync(jsonYolu, JSON.stringify({ surum: 1, tur: "ileri-sar", sonuc: ret === 0 ? "ILERI-SARILDI" : "REDDEDILDI", ozet, dal, zaman, ref, taban_sha: entegSha, uc_sha: ucSha, ileri_sarma: sonuc, gzip_bayt: gzip }, null, 2) + "\n", { flag: "wx" });
  appendFileSync(join(sonucDizin, "ozet.log"), `${new Date().toISOString()} ${ozet}\n`);
  process.stderr.write(`[kapi] json: ${jsonYolu}\n`);
  process.stdout.write(`${ozet}\n`);
  return ret;
}

async function main(): Promise<number> {
  const sec = seceneklerOku(process.argv.slice(2));
  sakla = sec.sakla;
  const betikDizin = dirname(fileURLToPath(import.meta.url));
  const wts = worktreeler(betikDizin);
  const ana = wts[0];
  if (!ana) throw new Kullanim("ana çalışma ağacı bulunamadı");
  anaDizin = ana.yol;

  const entegBilgi = process.env["KAPI_ENTEGRASYON_DIZIN"] ? { yol: resolve(process.env["KAPI_ENTEGRASYON_DIZIN"]), dal: "entegrasyon" } : wts.find((w) => w.dal === "entegrasyon");
  if (!entegBilgi) throw new Kullanim("`entegrasyon` dalının worktree'si bulunamadı (KAPI_ENTEGRASYON_DIZIN verin)");
  const entegDizin = entegBilgi.yol;
  const SP = resolve(process.env["KAPI_SP"] ?? dirname(entegDizin));
  const sonucDizin = join(SP, "takim", "kapi-sonuclari");
  mkdirSync(sonucDizin, { recursive: true });

  // Kilit: aynı anda tek kapı koşusu. Taban ve dal kilit alındıktan SONRA çözülür (sıra beklerken entegrasyon ilerlemiş olabilir).
  const kilitBasla = Date.now();
  const etiket = sec.ad ?? sec.dallar.join("+");
  if (!sec.onDenetim) await kilitAl(join(SP, "takim", "kapi.kilit"), etiket, Number(process.env["KAPI_BEKLE_SN"] ?? 7200));
  const kilitBeklemeSn = yuvarla1((Date.now() - kilitBasla) / 1000);
  t0 = Date.now(); // süre sınırı kilit beklemesini saymaz

  const ortam: NodeJS.ProcessEnv = { ...process.env, CI: "true" };
  // Kapı ortam koşullu testleri açmaz: ağır testler ve Postgres testleri kendi varsayılanında koşar.
  delete ortam["BOLGE_AGIR_TEST"];
  delete ortam["BOLGE_PG_URL"];

  if (sec.ileriSar) return await ileriSarKomutu(etiket, entegDizin, sonucDizin, ortam);

  const zaman = zamanDamgasi();
  const dalAd = guvenliAd(etiket).slice(0, 100);
  const kosuAd = benzersizAd(sonucDizin, `${dalAd}-${zaman}`);
  const gunlukDizin = join(sonucDizin, kosuAd);
  mkdirSync(gunlukDizin, { recursive: true });
  const jsonYolu = join(sonucDizin, `${kosuAd}.json`);
  geciciWt = join(SP, `wt-kapi-${zaman}`);

  const adimlar: AdimKaydi[] = [];
  const kararsiz: Kararsiz[] = [];
  let testler: (VitestOzeti & { kararsizSayisi: number }) | null = null;
  let kirikTestler: KirikTest[] = [];
  let kirikAdim: string | null = null;
  let kirikIleti = "";
  let gzipBayt: number | null = null;
  let gzipTaban: number | null = null;
  const yardimciBoyutlar: Record<string, number> = {};
  let dunyaKosuldu = false;
  let dunyaNotu = "";
  let istemciDegisti = false;
  let playwrightSecilen: { ad: string; nedeni: string[] }[] = [];
  let sureSiniriAdim: string | null = null;
  let sizinti: SizintiSonucu | null = null;
  const playwrightRapor: { betik: string; sonuc: string; hata: string[]; fps: Record<string, unknown> | null; yuk1dk: number }[] = [];
  let dondurulmus: { yapilandirma: boolean; yollar_sayisi: number; negatif_kontrol: { dosya: string | null; sonuc: string } | null; istisna: { dal: string; onay: string | null; gerekce: string | null }[] } = { yapilandirma: false, yollar_sayisi: 0, negatif_kontrol: null, istisna: [] };
  const kirikSorumlu: { adim: string; dosyalar: string[]; dallar: string[] }[] = [];
  let degisen: string[] = [];
  const dalKayitlari: DalKaydi[] = [];
  let ileriSarma: IleriSarmaKaydi = { yapildi: false, once: null, sonra: null };
  let pgNeden: string[] = [];
  let pgRef: string | null = null;
  let duzeltme = false;
  const yukTanisi: { adim: string; zaman: string; yuk1dk: number; yabanci_surecler: YabanciSurec[]; yabanci_worktree: string[] }[] = [];
  let entegSha = "";
  let ucSha = "";

  const gunluk = (ad: string): string => join(gunlukDizin, `${ad}.log`);
  /** Bir adımı koşturur, kaydeder; kodu 0 değilse Kirik fırlatır (çağıran isterse yakalar). */
  async function adim(ad: string, komut: string, cwd: string, zamanAsimi: number, ek?: { env?: NodeJS.ProcessEnv }): Promise<AdimKaydi> {
    if (kalanSn() <= 0) {
      sureSiniriAdim = ad;
      throw new Kirik("sure-siniri", `${SURE_SINIRI_SN / 60} dk süre sınırı ${ad} adımı başlamadan doldu`);
    }
    gunlukYaz(`${ad} ...`);
    const g = gunluk(ad);
    const r = await calistir(komut, { cwd, gunluk: g, zamanAsimi: Math.max(1, Math.min(zamanAsimi, kalanSn())), env: ek?.env ?? ortam });
    if (r.zamanAsimi && kalanSn() <= 1) sureSiniriAdim = ad;
    const k: AdimKaydi = { ad, komut, durum: r.kod === 0 ? "gecti" : "kirik", kod: r.kod, sure_sn: yuvarla1(r.sure), gunluk: g };
    if (r.zamanAsimi) k.not = `zaman asimi (${zamanAsimi} sn)`;
    adimlar.push(k);
    gunlukYaz(`${ad} ${k.durum === "gecti" ? "tamam" : `KIRIK (kod ${r.kod})`} ${k.sure_sn} sn`);
    if (k.durum === "kirik") {
      if (r.zamanAsimi || ad.startsWith("vitest") || ad.startsWith("playwright")) {
        // Kök neden "yük" olabilir: o anki 1 dk yük ortalaması ve kapı dışı ağır süreçler (hangi worktree'de) kaydedilir
        const yabanci = yabanciSurecler(wts.map((w) => w.yol), geciciWt);
        const tani = { adim: ad, zaman: new Date().toISOString(), yuk1dk: yuvarla1(loadavg()[0] ?? 0), yabanci_surecler: yabanci, yabanci_worktree: [...new Set(yabanci.map((y) => y.worktree ?? y.cwd ?? "?"))] };
        yukTanisi.push(tani);
        gunlukYaz(`yük tanısı: 1dk=${tani.yuk1dk}; kapı dışı ağır süreç ${yabanci.length}${tani.yabanci_worktree.length ? ` (${tani.yabanci_worktree.join(", ")})` : ""}`);
      }
      if (ad === "tipkontrol" || ad === "lint") {
        // Hangi dalın dosyası kırdı? (tsc ve eslint çıktısındaki yollar, dalların kendi değişen dosyalarıyla eşlenir)
        const dosyalar = kirikDosyalari(ad, g, geciciWt);
        const dallar = dalKayitlari.filter((d) => d.durum === "pakette" && d.degisen.some((f) => dosyalar.some((y) => f === y || f.endsWith(`/${y}`)))).map((d) => d.dal);
        kirikSorumlu.push({ adim: ad, dosyalar: dosyalar.slice(0, 40), dallar });
        gunlukYaz(`${ad}: kırık dosyalar ${dosyalar.length}; sorumlu dal: ${dallar.join(", ") || "belirlenemedi"}`);
      }
      process.stderr.write(`${sonSatirlar(g)}\n`);
      if (sureSiniriAdim === ad) throw new Kirik("sure-siniri", `${SURE_SINIRI_SN / 60} dk süre sınırı ${ad} adımında aşıldı; günlük: ${g}`);
      throw new Kirik(ad, `${ad} kırıldı (kod ${r.kod}${r.zamanAsimi ? ", zaman aşımı" : ""}); günlük: ${g}`);
    }
    return k;
  }

  try {
    // --- 0. Çözümleme ---
    entegSha = gitOk(entegDizin, ["rev-parse", "--verify", "refs/heads/entegrasyon^{commit}"]);
    for (const dal of sec.dallar) {
      const c = git(entegDizin, ["rev-parse", "--verify", `${dal}^{commit}`]);
      if (c.kod !== 0) throw new Kullanim(`dal çözülemedi: ${dal}`);
      dalKayitlari.push({ dal, sha: c.cikti, atif: { incelenen: 0, eksik: [], ayrinti: [] }, buyuk: { bulunan: [], ihlal: [], istisna: null }, durum: "pakette", cikarma: null, uc_sha: null, rebase_cakisma: [], degisen: [], taban: entegSha, ust_dal: null, commit_sayisi: 0, dondurulmus: [], dal_dosyalari: [] });
    }
    // Paket içi yığılma: bir dal, pakette kendinden önce gelen bir dalın üstündeyse (atası oysa) yalnız kendi commit'leri alınır
    for (let i = 0; i < dalKayitlari.length; i++) {
      const d = dalKayitlari[i];
      if (!d) continue;
      for (let j = i - 1; j >= 0; j--) {
        const o = dalKayitlari[j];
        if (o && o.sha !== d.sha && git(entegDizin, ["merge-base", "--is-ancestor", o.sha, d.sha]).kod === 0) {
          d.taban = o.sha;
          d.ust_dal = o.dal;
          break;
        }
      }
      d.commit_sayisi = Number(gitOk(entegDizin, ["rev-list", "--count", `${d.taban}..${d.sha}`]));
    }
    git(entegDizin, ["update-ref", "-d", pgRefAdi(etiket)]); // önceki koşudan kalan bekleyen uç eskimiş sayılır
    const paketMi = sec.dallar.length > 1;
    gunlukYaz(`${paketMi ? `paket (${sec.dallar.length} dal)` : "dal"}=${dalKayitlari.map((d) => `${d.dal} (${d.sha.slice(0, 7)})`).join(", ")} taban=entegrasyon (${entegSha.slice(0, 7)}) ${sec.kuru ? "[kuru]" : ""}`);
    const sonek = (d: DalKaydi): string => (paketMi ? `:${d.dal}` : "");

    // --- 0b. Ön denetimler, dal dal: atıf ve depo politikası (büyük dosya). Ağır adımlardan önce; eksik dal pakette kalmaz
    //     (sahip düzeltince sha'lar değişir; kalanlarla devam edilir) ---
    const istisnalar = istisnalariOku(betikDizin);
    const dondYap = sec.sadece ? null : dondurulmusOku(betikDizin);
    if (dondYap) {
      dondurulmus = { yapilandirma: true, yollar_sayisi: dondYap.yollar.length + dondYap.ilk_giris_serbest.length, negatif_kontrol: null, istisna: [] };
      // Her koşuda negatif kontrol: denetim bir dosyada 1 baytlık değişikliği yakalamıyorsa denetim geçersizdir ve kapı KIRIK olur
      const basla0 = Date.now();
      const nk = dondurulmusNegatifKontrol(entegDizin, entegSha, dondYap, join(gunlukDizin, "dondurulmus-gecici-indeks"));
      dondurulmus.negatif_kontrol = nk;
      const nkTamam = nk.sonuc === "kirmizi";
      adimlar.push({
        ad: "dondurulmus-negatif-kontrol",
        komut: `1 bayt değişmiş geçici ağaca karşı aynı denetim (${nk.dosya ?? "dosya yok"})`,
        durum: nkTamam ? "gecti" : "kirik",
        kod: nkTamam ? 0 : 1,
        sure_sn: yuvarla1((Date.now() - basla0) / 1000),
        gunluk: null,
        not: `${nk.dosya ?? "-"}: ${nk.sonuc}`,
      });
      gunlukYaz(`dondurulmuş altın negatif kontrolü: ${nk.dosya ?? "-"} ${nk.sonuc}`);
      if (!nkTamam) throw new Kirik("dondurulmus-altin-gecersiz", `dondurulmuş altın negatif kontrolü kırmızı vermedi (${nk.sonuc}): denetim geçersiz`);
    }
    for (const d of sec.sadece ? [] : dalKayitlari) {
      const ust = d.ust_dal ? dalKayitlari.find((x) => x.dal === d.ust_dal) : undefined;
      if (ust && ust.durum === "cikarildi") {
        d.durum = "cikarildi";
        d.cikarma = `ust-dal-cikarildi(${ust.dal})`;
        gunlukYaz(`${d.dal}: üstüne yığılı olduğu ${ust.dal} paketten çıkarıldığı için çıkarıldı`);
        continue;
      }
      const basla = Date.now();
      d.dal_dosyalari = git(entegDizin, ["diff", "--name-only", "--no-renames", `${d.taban}...${d.sha}`]).cikti.split("\n").filter(Boolean);
      d.atif = atifDenetle(entegDizin, d.taban, d.sha);
      const atifTamam = d.atif.eksik.length === 0;
      adimlar.push({
        ad: `atif${sonek(d)}`,
        komut: `git rev-list ${d.taban.slice(0, 7)}..${d.sha.slice(0, 7)} (oturum satırı + Co-Authored-By: Claude <model> <noreply@anthropic.com>)`,
        durum: atifTamam ? "gecti" : "kirik",
        kod: atifTamam ? 0 : 1,
        sure_sn: yuvarla1((Date.now() - basla) / 1000),
        gunluk: null,
        not: atifTamam ? `${d.atif.incelenen} commit tamam` : `eksik: ${d.atif.eksik.join(", ")}`,
      });
      for (const a of d.atif.ayrinti) gunlukYaz(`atıf eksik [${d.dal}]: ${a.sha.slice(0, 7)} "${a.konu}" -> ${a.eksik.join(", ")}`);

      const basla2 = Date.now();
      d.buyuk = buyukDosyaDenetle(entegDizin, d.taban, d.sha, d.dal, istisnalar);
      const buyukTamam = d.buyuk.ihlal.length === 0;
      adimlar.push({
        ad: `buyuk-dosya${sonek(d)}`,
        komut: `git diff --numstat ${d.taban.slice(0, 7)}...${d.sha.slice(0, 7)} (>1MB ve *.pmtiles)`,
        durum: buyukTamam ? "gecti" : "kirik",
        kod: buyukTamam ? 0 : 1,
        sure_sn: yuvarla1((Date.now() - basla2) / 1000),
        gunluk: null,
        not: d.buyuk.istisna && d.buyuk.bulunan.length > 0 && buyukTamam ? `istisna: ${d.buyuk.istisna.onay ?? "?"}` : buyukTamam ? "temiz" : `ihlal: ${d.buyuk.ihlal.map((b) => b.yol).join(", ")}`,
      });
      for (const b of d.buyuk.ihlal) gunlukYaz(`büyük dosya [${d.dal}]: ${b.yol} (${b.bayt} bayt, ${b.neden})`);
      if (d.buyuk.istisna && d.buyuk.bulunan.length > 0) gunlukYaz(`büyük dosya istisnası uygulandı [${d.dal}]: ${d.buyuk.istisna.onay ?? "?"} (${d.buyuk.bulunan.length} dosya)`);

      let dondTamam = true;
      if (dondYap) {
        const basla3 = Date.now();
        const mb = gitOk(entegDizin, ["merge-base", d.taban, d.sha]);
        const fark = dondurulmusFark(entegDizin, mb, d.sha, dondYap);
        const ist = fark.length > 0 ? dondYap.istisna.find((i) => i.dal === d.dal) : undefined;
        const ihlal = ist ? fark.filter((f) => ist.yollar !== undefined && !ist.yollar.some((y) => globEsler(y, f))) : fark;
        if (ist && fark.length > 0) dondurulmus.istisna.push({ dal: d.dal, onay: ist.onay ?? null, gerekce: ist.gerekce ?? null });
        d.dondurulmus = ihlal;
        dondTamam = ihlal.length === 0;
        adimlar.push({
          ad: `dondurulmus-altin${sonek(d)}`,
          komut: `git diff --name-only ${mb.slice(0, 7)} ${d.sha.slice(0, 7)} -- <kapi-dondurulmus.json>`,
          durum: dondTamam ? "gecti" : "kirik",
          kod: dondTamam ? 0 : 1,
          sure_sn: yuvarla1((Date.now() - basla3) / 1000),
          gunluk: null,
          not: dondTamam ? (ist && fark.length > 0 ? `istisna: ${ist.onay ?? "?"}` : "temiz") : `değişen: ${ihlal.join(", ")}`,
        });
        if (!dondTamam) {
          for (const f of ihlal) gunlukYaz(`dondurulmuş altın [${d.dal}]: ${f} değişmiş`);
          kirikSorumlu.push({ adim: "dondurulmus-altin", dosyalar: ihlal, dallar: [d.dal] });
        }
      }
      const sorunlar = [...(atifTamam ? [] : ["atif"]), ...(buyukTamam ? [] : ["buyuk-dosya"]), ...(dondTamam ? [] : ["dondurulmus-altin"])];
      if (sorunlar.length > 0) {
        d.durum = "cikarildi";
        d.cikarma = sorunlar.join("+");
        gunlukYaz(`${d.dal}: DUZELTME GEREKLI (${d.cikarma})${paketMi ? "; paketten çıkarıldı, kalanlarla devam" : ""}`);
      }
    }
    if (dalKayitlari.every((d) => d.durum === "cikarildi")) {
      throw new Kirik(
        [...new Set(dalKayitlari.map((d) => d.cikarma ?? ""))].join("+"),
        dalKayitlari.map((d) => `${d.dal}: ${d.cikarma}`).join("; "),
        !dalKayitlari.some((d) => d.cikarma?.includes("dondurulmus-altin")), // dondurulmuş altın ihlali DUZELTME değil KIRIK
      );
    }
    if (sec.sadece) adimlar.push({ ad: "atif", komut: "-", durum: "atlandi", kod: null, sure_sn: 0, gunluk: null, not: "--sadece modu: ön denetimler atlandı" });
    if (sec.onDenetim) throw new OnDenetimBitti();
    gunlukYaz(`ön denetimler ${sec.sadece ? "atlandı (--sadece)" : "tamam"} (${dalKayitlari.filter((d) => d.durum === "pakette").length}/${dalKayitlari.length} dal pakette)`);

    // --- 1. Temiz geçici worktree + yeniden tabanlama. Dalların kendisine dokunulmaz: ayrık HEAD üzerinde, verilen sırayla üst üste ---
    {
      const g = gunluk("rebase");
      const basla = Date.now();
      const ekle = git(entegDizin, ["worktree", "add", "--detach", geciciWt, entegSha]);
      appendFileSync(g, `$ git worktree add --detach ${geciciWt} ${entegSha}\n${ekle.cikti}\n`);
      if (ekle.kod !== 0) throw new Kirik("rebase", `geçici worktree açılamadı: ${ekle.cikti}`);
      let uc = entegSha;
      for (const d of dalKayitlari.filter((x) => x.durum === "pakette")) {
        // Yığılı dal: üstüne kurulduğu dal paketten çıkmışsa (ör. rebase çakışması) kendisi de çıkar; yoksa tabanı olmadan girerdi
        const ust = d.ust_dal ? dalKayitlari.find((x) => x.dal === d.ust_dal) : undefined;
        if (ust && ust.durum === "cikarildi") {
          d.durum = "cikarildi";
          d.cikarma = `ust-dal-cikarildi(${ust.dal})`;
          gunlukYaz(`${d.dal}: üstüne yığılı olduğu ${ust.dal} paketten çıkarıldığı için çıkarıldı`);
          continue;
        }
        // dalın kendi commit'leri (taban..dal), o ana kadarki uçun üstüne
        gitOk(geciciWt, ["checkout", "-q", "--detach", d.sha]);
        const rb = git(geciciWt, ["rebase", "--onto", uc, d.taban]);
        appendFileSync(g, `$ git rebase --onto ${uc.slice(0, 7)} ${d.taban.slice(0, 7)}   # ${d.dal} (${d.sha.slice(0, 7)}, ${d.commit_sayisi} commit)\n${rb.cikti}\n`);
        if (rb.kod !== 0) {
          d.rebase_cakisma = git(geciciWt, ["diff", "--name-only", "--diff-filter=U"]).cikti.split("\n").filter(Boolean);
          git(geciciWt, ["rebase", "--abort"]);
          d.durum = "cikarildi";
          d.cikarma = "rebase";
          gunlukYaz(`rebase KIRIK [${d.dal}]: çakışma ${d.rebase_cakisma.join(", ") || "(dosya bulunamadı)"}${paketMi ? "; paketten çıkarıldı, kalanlarla devam" : ""}`);
          continue;
        }
        const yeniUc = gitOk(geciciWt, ["rev-parse", "HEAD"]);
        d.degisen = gitOk(geciciWt, ["diff", "--name-only", uc, yeniUc]).split("\n").filter(Boolean);
        d.uc_sha = yeniUc;
        uc = yeniUc;
        gunlukYaz(`rebase tamam [${d.dal}]: uc=${uc.slice(0, 7)}`);
      }
      gitOk(geciciWt, ["checkout", "-q", "--detach", uc]);
      const kalanSayi = dalKayitlari.filter((x) => x.durum === "pakette").length;
      adimlar.push({ ad: "rebase", komut: `git rebase --onto <uc> ${entegSha.slice(0, 7)} (${kalanSayi} dal)`, durum: kalanSayi > 0 ? "gecti" : "kirik", kod: kalanSayi > 0 ? 0 : 1, sure_sn: yuvarla1((Date.now() - basla) / 1000), gunluk: g });
      if (kalanSayi === 0) {
        throw new Kirik("rebase", `yeniden tabanlama çakıştı: ${dalKayitlari.map((d) => `${d.dal}: ${d.rebase_cakisma.join(", ")}`).join("; ")}`, dalKayitlari.every((d) => d.cikarma !== "rebase"));
      }
      ucSha = uc;
      degisen = gitOk(geciciWt, ["diff", "--name-only", entegSha, "HEAD"]).split("\n").filter(Boolean);
      gunlukYaz(`rebase tamam: uc=${ucSha.slice(0, 7)}; ${degisen.length} dosya entegrasyondan farklı`);
    }
    pgNeden = pgNedenleri(geciciWt, degisen);
    if (pgNeden.length > 0) gunlukYaz(`pg gerekli: ${pgNeden.join(", ")}`);
    istemciDegisti = degisen.some((d) => DUNYA_YOLLARI.some((y) => d.startsWith(y)));
    dunyaKosuldu = sec.istemci || istemciDegisti || sec.sadece !== null || sec.kademe === 2;
    if (sec.sadece) {
      const bilinmeyen = sec.sadece.filter((a) => !PLAYWRIGHT.some((p) => p.ad === a));
      if (bilinmeyen.length > 0) throw new Kullanim(`--sadece: bilinmeyen Playwright betiği: ${bilinmeyen.join(", ")} (var olanlar: ${PLAYWRIGHT.map((p) => p.ad).join(", ")})`);
      playwrightSecilen = PLAYWRIGHT.filter((p) => sec.sadece?.includes(p.ad)).map((p) => ({ ad: p.ad, nedeni: ["--sadece"] }));
    } else {
      playwrightSecilen = PLAYWRIGHT.filter((p) => !p.kapiDisi)
        .map((p) => ({
          ad: p.ad,
          nedeni:
            sec.kademe === 2 && p.ad !== "sakin-ekran"
              ? ["kademe 2"]
              : sec.istemci && !p.yalnizTetik
                ? ["--istemci"]
                : degisen.filter((d) => (sec.kademe === 1 ? (p.k1 ? p.k1(d) : false) : p.tetik(d))),
        }))
        .filter((p) => p.nedeni.length > 0);
    }
    try {
      const taban = JSON.parse(readFileSync(join(sonucDizin, "taban-boyut.json"), "utf8")) as Record<string, { gzip_bayt: number }>;
      gzipTaban = taban[entegSha]?.gzip_bayt ?? null;
    } catch {
      gzipTaban = null;
    }

    // --- 2-4. Kurulum, tip denetimi, lint ---
    await adim("kurulum", "pnpm install --frozen-lockfile", geciciWt, ZAMAN_ASIMI.kurulum);
    if (sec.sadece) {
      for (const ad of ["tipkontrol", "lint", "vitest"]) adimlar.push({ ad, komut: "-", durum: "atlandi", kod: null, sure_sn: 0, gunluk: null, not: "--sadece modu" });
    } else {
      await adim("tipkontrol", "pnpm -s tipkontrol", geciciWt, ZAMAN_ASIMI.tipkontrol);
      await adim("lint", "pnpm -s lint", geciciWt, ZAMAN_ASIMI.lint);
    }

    // --- 5. Testler. Kademe 2: tüm vitest. Kademe 1: değişen dosyalarla ilişkili testler (+ çekirdek değiştiyse çekirdek testleri).
    //     Kırılan dosyalar bir kez yeniden koşulur (--sadece modunda testler yok) ---
    if (!sec.sadece) {
      const rapor = ' --reporter=default --reporter=json --outputFile.json=';
      type Kosu = { ad: string; komut: string; json: string };
      const kosular: Kosu[] = [];
      if (sec.kademe === 2) {
        kosular.push({ ad: "vitest", komut: "npx vitest run", json: join(gunlukDizin, "vitest.json") });
      } else {
        const iliskili = degisen.filter((f) => /^packages\/.+\.(ts|tsx|js|mjs|cjs|json)$/.test(f) && existsSync(join(geciciWt, f)));
        if (iliskili.length > 0) kosular.push({ ad: "vitest", komut: `npx vitest related --run --passWithNoTests ${iliskili.map((f) => `"${f}"`).join(" ")}`, json: join(gunlukDizin, "vitest.json") });
        else adimlar.push({ ad: "vitest", komut: "-", durum: "atlandi", kod: null, sure_sn: 0, gunluk: null, not: "kademe 1: ilişkili dosya yok" });
        if (degisen.some((f) => f.startsWith("packages/cekirdek/"))) kosular.push({ ad: "vitest-cekirdek", komut: "npx vitest run packages/cekirdek", json: join(gunlukDizin, "vitest-cekirdek.json") });
      }
      const toplam: VitestOzeti = { toplam: 0, gecen: 0, kirik: 0, atlanan: 0, atlananTestler: [], kirikTestler: [] };
      let toplamKararsiz = 0;
      for (const k of kosular) {
        let kirikHata: Kirik | null = null;
        try {
          await adim(k.ad, `${k.komut}${rapor}"${k.json}"`, geciciWt, ZAMAN_ASIMI.vitest);
        } catch (e) {
          if (!(e instanceof Kirik)) throw e;
          kirikHata = e;
        }
        const o1 = vitestOku(k.json, geciciWt);
        if (!o1) {
          if (!kirikHata) throw new Kirik(k.ad, "vitest JSON çıktısı okunamadı");
          throw kirikHata; // çöktü ya da zaman aşımı: kırılan dosya bilinmiyor, yeniden deneme yok
        }
        let sonuc1: VitestOzeti = o1;
        if (kirikHata || o1.kirik > 0) {
          const yuk = yuvarla1(loadavg()[0] ?? 0);
          const dosyalar = [...new Set(o1.kirikTestler.map((t) => t.dosya).filter((d) => d !== "?"))];
          if (dosyalar.length === 0) throw kirikHata ?? new Kirik(k.ad, "vitest kırık bildirdi ama kırılan dosya belirlenemedi");
          gunlukYaz(`${k.ad}: ${o1.kirik} test kırık (${dosyalar.length} dosya); kırılan dosyalar bir kez yeniden koşuluyor`);
          const json2 = join(gunlukDizin, `${k.ad}-tekrar.json`);
          let tekrarKirik = false;
          try {
            await adim(`${k.ad}-tekrar`, `npx vitest run ${dosyalar.map((d) => `"${d}"`).join(" ")}${rapor}"${json2}"`, geciciWt, ZAMAN_ASIMI.vitestTekrar);
          } catch (e) {
            if (!(e instanceof Kirik)) throw e;
            tekrarKirik = true;
          }
          const o2 = vitestOku(json2, geciciWt);
          const hala = new Set((o2?.kirikTestler ?? []).map((t) => `${t.dosya}::${t.test}`));
          for (const t of o1.kirikTestler) {
            if (!hala.has(`${t.dosya}::${t.test}`)) kararsiz.push({ dosya: t.dosya, test: t.test, ilkHata: t.ileti, yuk1dk: yuk });
          }
          if (tekrarKirik || !o2 || o2.kirikTestler.length > 0) {
            kirikTestler = o2 && o2.kirikTestler.length > 0 ? o2.kirikTestler : o1.kirikTestler;
            testler = { toplam: toplam.toplam + o1.toplam, gecen: toplam.gecen + o1.toplam - kirikTestler.length - o1.atlanan, kirik: toplam.kirik + kirikTestler.length, atlanan: toplam.atlanan + o1.atlanan, atlananTestler: [...toplam.atlananTestler, ...o1.atlananTestler], kirikTestler, kararsizSayisi: kararsiz.length };
            kirikSorumlu.push({ adim: k.ad, dosyalar: [...new Set(kirikTestler.map((t) => t.dosya))], dallar: dalKayitlari.filter((d) => d.durum === "pakette" && d.degisen.some((f) => kirikTestler.some((t) => t.dosya === f))).map((d) => d.dal) });
            throw new Kirik(k.ad, `kırık test (yeniden denemeden sonra da): ${kirikTestler.map((t) => `${t.dosya} > ${t.test}`).join("; ")}`);
          }
          // Yeniden denemede geçti: hepsi kararsız sayılır
          sonuc1 = { ...o1, kirik: 0, gecen: o1.toplam - o1.atlanan };
          toplamKararsiz = kararsiz.length;
          gunlukYaz(`${k.ad}: yeniden denemede geçti (kararsız: ${kararsiz.map((x) => `${x.dosya}/${x.test}`).join(", ")})`);
        }
        toplam.toplam += sonuc1.toplam;
        toplam.gecen += sonuc1.gecen;
        toplam.kirik += sonuc1.kirik;
        toplam.atlanan += sonuc1.atlanan;
        toplam.atlananTestler.push(...sonuc1.atlananTestler);
      }
      testler = { ...toplam, kararsizSayisi: toplamKararsiz };
    }

    // --- 6. dunya.html boyutu (yalnız yol tetiklediyse ya da --istemci ile) ---
    if (!dunyaKosuldu) {
      dunyaNotu = "atlandı: yol tetiklemedi";
      adimlar.push({ ad: "dunya", komut: "-", durum: "atlandi", kod: null, sure_sn: 0, gunluk: null, not: dunyaNotu });
      gunlukYaz(`dunya ${dunyaNotu}`);
    } else {
      await adim("dunya", "pnpm -s dunya", geciciWt, ZAMAN_ASIMI.dunya);
      const html = join(geciciWt, "istemci", "dunya.html");
      if (!existsSync(html)) throw new Kirik("dunya", `dunya.html üretilmedi: ${html}`);
      gzipBayt = gzipSync(readFileSync(html), { level: 9 }).length;
      for (const [ad, d] of [["harita.js", "harita.js"], ["yuru.js", "yuru.js"]] as const) {
        const y = join(geciciWt, "istemci", d);
        if (existsSync(y)) yardimciBoyutlar[`${ad}_gzip_bayt`] = gzipSync(readFileSync(y), { level: 9 }).length;
      }
      sizinti = istemciSizintiDenetle(geciciWt, betikDizin);
      adimlar.push({
        ad: "istemci-sizinti",
        komut: `tara ${sizinti.taranan.length} dosya, ${sizinti.dizge_sayisi} yasak dizge (scripts/kapi-istemci-yasak.json)`,
        durum: sizinti.bulunan.length === 0 ? "gecti" : "kirik",
        kod: sizinti.bulunan.length === 0 ? 0 : 1,
        sure_sn: 0,
        gunluk: null,
        not: !sizinti.yapilandirma ? "yapılandırma yok: atlandı" : sizinti.bulunan.length === 0 ? "temiz" : `bulunan: ${sizinti.bulunan.map((b) => `${b.dosya}:${b.dizge}`).join(", ")}`,
      });
      if (sizinti.bulunan.length > 0) throw new Kirik("istemci-sizinti", `istemci çıktısında yasak dizge: ${sizinti.bulunan.map((b) => `${b.dosya} -> ${b.dizge}`).join("; ")}`);
      const asti = gzipBayt > GZIP_SINIR;
      adimlar.push({
        ad: "boyut",
        komut: `gzip(istemci/dunya.html) <= ${GZIP_SINIR}`,
        durum: asti ? "kirik" : "gecti",
        kod: asti ? 1 : 0,
        sure_sn: 0,
        gunluk: null,
        not: `${gzipBayt} bayt (${kb(gzipBayt)} KB)${gzipTaban !== null ? `; taban ${gzipTaban} bayt` : ""}`,
      });
      gunlukYaz(`dunya.html gzip ${gzipBayt} bayt (${kb(gzipBayt)} KB; sınır ${GZIP_SINIR})${gzipTaban !== null ? `; taban ${kb(gzipTaban)} KB` : ""}`);
      if (asti) throw new Kirik("boyut", `dunya.html gzip ${gzipBayt} bayt > ${GZIP_SINIR}`);
    }

    // --- 7. Playwright (yol örüntüsüyle seçilen betikler; hepsi bağımsız, biri kırılsa da kalanlar koşar) ---
    if (!dunyaKosuldu || playwrightSecilen.length === 0) {
      adimlar.push({ ad: "playwright", komut: "-", durum: "atlandi", kod: null, sure_sn: 0, gunluk: null, not: "atlandı: yol tetiklemedi" });
      gunlukYaz("playwright atlandı: yol tetiklemedi");
    } else {
      gunlukYaz(`playwright seçilen: ${playwrightSecilen.map((p) => p.ad).join(", ")}`);
      const kaynakKaro = resolve(process.env["KAPI_KARO"] ?? join(anaDizin, "packages", "istemci", "dist", KARO_GORELI));
      if (existsSync(kaynakKaro)) {
        for (const hedef of [join(geciciWt, "istemci", KARO_GORELI), join(geciciWt, "packages", "istemci", "dist", KARO_GORELI)]) {
          mkdirSync(dirname(hedef), { recursive: true });
          copyFileSync(kaynakKaro, hedef);
        }
        adimlar.push({ ad: "karo-kopya", komut: `copy ${kaynakKaro}`, durum: "gecti", kod: 0, sure_sn: 0, gunluk: null });
      } else if (playwrightSecilen.some((p) => p.ad === "yuru-etkilesim")) {
        throw new Kirik("karo-kopya", `yürüyüş karosu yok: ${kaynakKaro} (KAPI_KARO ile verin)`);
      } else {
        adimlar.push({ ad: "karo-kopya", komut: `copy ${kaynakKaro}`, durum: "atlandi", kod: null, sure_sn: 0, gunluk: null, not: "karo yok; seçilen betikler gerektirmiyor" });
      }
      const istemciDizin = join(geciciWt, "packages", "istemci");
      const html = join(geciciWt, "istemci", "dunya.html");
      const kirikBetikler: string[] = [];
      const playwrightRaporGeciti = (ad: string): void => {
        if (PLAYWRIGHT.find((x) => x.ad === ad)?.yalnizRapor && !playwrightRapor.some((r) => r.betik === ad)) playwrightRapor.push({ betik: ad, sonuc: "gecti", hata: [], fps: null, yuk1dk: yuvarla1(loadavg()[0] ?? 0) });
      };
      const kararsizKurallari = kararsizPlaywrightOku(betikDizin);
      for (const sec1 of playwrightSecilen) {
        const p = PLAYWRIGHT.find((x) => x.ad === sec1.ad);
        if (!p) continue;
        const ekran = join(gunlukDizin, "ekran", p.ad);
        mkdirSync(ekran, { recursive: true });
        const args = p.args.map((a) => `"${a.replace("{html}", html).replace("{ekran}", ekran)}"`).join(" ");
        try {
          await adim(`playwright-${p.ad}`, `npx tsx scripts/${p.betik} ${args}`, istemciDizin, ZAMAN_ASIMI.playwright);
          playwrightRaporGeciti(p.ad);
        } catch (e) {
          if (!(e instanceof Kirik)) throw e;
          if (e.adim === "sure-siniri") throw e;
          const oz = playwrightOzeti(gunluk(`playwright-${p.ad}`));
          if (p.yalnizRapor) {
            // Yalnız rapor: kırığı paketi durdurmaz; hata, fps ve yük JSON'a yazılır
            playwrightRapor.push({ betik: p.ad, sonuc: "kirik", hata: oz.hata, fps: oz.fps, yuk1dk: yuvarla1(loadavg()[0] ?? 0) });
            const son = adimlar[adimlar.length - 1];
            if (son) son.not = "yalnız rapor: paketi durdurmaz";
            gunlukYaz(`playwright-${p.ad}: kırık; yalnız rapor, kapı kırılmaz`);
            continue;
          }
          const kural = kararsizKurallari.find((k) => {
            if (k.betik !== p.ad) return false;
            if ((k.haric_yollar ?? []).some((h) => degisen.some((d) => d.startsWith(h)))) return false;
            if (k.en_cok_hata !== undefined && oz.hata.length > k.en_cok_hata) return false;
            if (k.desenler !== undefined) return oz.hata.length > 0 && oz.hata.every((h) => (k.desenler ?? []).some((d) => new RegExp(d, "i").test(h)));
            return true;
          });
          if (kural) {
            // Geçici kural: bu betiğin bilinen kararsız hatası kapıyı kırmaz, kararsız yazılır (hata, fps ve yük JSON'da)
            kararsiz.push({ dosya: p.ad, test: "playwright", ilkHata: oz.hata.join(" | ").slice(0, 400), yuk1dk: yuvarla1(loadavg()[0] ?? 0), fps: oz.fps });
            const son = adimlar[adimlar.length - 1];
            if (son) son.not = `kararsız sayıldı (kural: ${kural.gerekce ?? "kapi-istisna.json"})`;
            gunlukYaz(`playwright-${p.ad}: kırık ama kararsız kuralı geçerli; kapı kırılmaz`);
            continue;
          }
          kirikBetikler.push(p.ad); // bağımsız betikler: kalanlar yine de koşar
        }
      }
      if (kirikBetikler.length > 0) throw new Kirik(`playwright-${kirikBetikler[0]}`, `Playwright kırık: ${kirikBetikler.join(", ")}`);
    }

    // --- 9. Geçti: entegrasyonu ileri sar (kuru koşuda ya da PG bekleyen dalda sarma) ---
    if (sec.sadece) {
      const ref = pgRefAdi(etiket);
      const u = git(entegDizin, ["update-ref", ref, ucSha]);
      if (u.kod !== 0) throw new Kirik("kismi-ref", `kısmi uç ${ref} yazılamadı: ${u.cikti}`);
      pgRef = ref;
      ileriSarma = { yapildi: false, once: entegSha, sonra: null, not: `--sadece: kısmi doğrulama; uç ${ref} altında tutuluyor, ileri sarma açık onayla: scripts/kapi.sh --ileri-sar ${etiket}` };
      gunlukYaz(ileriSarma.not ?? "");
    } else if (sec.kuru) {
      ileriSarma = { yapildi: false, once: entegSha, sonra: null, not: "kuru koşu: ileri sarılmadı" };
    } else if (pgNeden.length > 0) {
      const ref = pgRefAdi(etiket);
      const u = git(entegDizin, ["update-ref", ref, ucSha]);
      if (u.kod !== 0) throw new Kirik("pg-ref", `bekleyen uç ${ref} yazılamadı: ${u.cikti}`);
      pgRef = ref;
      ileriSarma = { yapildi: false, once: entegSha, sonra: null, not: `PG bekliyor: uç ${ref} altında tutuluyor; PG olumlu bitince scripts/kapi.sh --ileri-sar ${etiket}` };
      gunlukYaz(ileriSarma.not ?? "");
    } else {
      try {
        ileriSarma = await entegrasyonuIleriSar(entegDizin, entegSha, ucSha, degisen, gunluk("entegrasyon-kurulum"), ortam);
      } catch (e) {
        if (e instanceof Kirik) ileriSarma = { yapildi: false, once: entegSha, sonra: null, not: e.message };
        throw e;
      }
    }
  } catch (e) {
    if (e instanceof OnDenetimBitti) {
      /* ön denetim tamam: aşağıda özetlenir */
    } else if (e instanceof Kirik) {
      kirikAdim = e.adim;
      kirikIleti = e.message;
      duzeltme = e.duzeltme;
    } else {
      throw e;
    }
  }

  // --- 8. Çıktı ---
  const sureSn = yuvarla1((Date.now() - t0) / 1000);
  const gecti = kirikAdim === null;
  const artik = temizle();
  let genelArtik: string[] = [];
  if (!WIN) {
    const r = spawnSync("pgrep", ["-af", "vitest|vite|playwright|postgres"], { encoding: "utf8" });
    genelArtik = (r.stdout ?? "").split("\n").filter((s) => s.trim() && !s.startsWith(`${process.pid} `));
  }
  const pgBekliyor = gecti && pgNeden.length > 0;
  const sonucAd = gecti ? (sec.onDenetim ? "ON-DENETIM TAMAM" : sec.sadece ? "GECTI (kismi)" : pgBekliyor ? "GECTI (PG bekliyor)" : "GECTI") : duzeltme ? "DUZELTME GEREKLI" : "KIRIK";
  const atifEksik = dalKayitlari.flatMap((d) => d.atif.eksik);
  const buyukIhlal = dalKayitlari.flatMap((d) => d.buyuk.ihlal);
  const cikarilan = dalKayitlari.filter((d) => d.durum === "cikarildi");
  const paketMiCikti = sec.dallar.length > 1;
  const ozet =
    `KAPI ${sonucAd} dal=${etiket} taban=${entegSha.slice(0, 7)} uc=${(ucSha || dalKayitlari[0]?.sha || "").slice(0, 7)} sure=${Math.round(sureSn)}s ` +
    `gzip=${gzipBayt !== null ? `${kb(gzipBayt)}KB` : "-"} test=${testler ? `${testler.gecen}/${testler.toplam}` : "-"} kirik=${kirikAdim === "sure-siniri" ? `sure-siniri(${sureSiniriAdim ?? "?"})` : (kirikAdim ?? "-")}` +
    (kararsiz.length ? ` kararsiz=${[...new Set(kararsiz.map((k) => k.dosya))].join(",")}` : "") +
    (atifEksik.length > 0 ? ` eksik=${atifEksik.join(",")}` : "") +
    (buyukIhlal.length > 0 ? ` buyuk=${buyukIhlal.map((b) => b.yol).slice(0, 3).join(",")}${buyukIhlal.length > 3 ? ",..." : ""}` : "") +
    (kirikSorumlu.length > 0 && kirikSorumlu.some((k) => k.dallar.length > 0) ? ` sorumlu=${[...new Set(kirikSorumlu.flatMap((k) => k.dallar))].join(",")}` : "") +
    (paketMiCikti ? ` paket=${dalKayitlari.length - cikarilan.length}/${dalKayitlari.length}` : "") +
    (cikarilan.length > 0 && paketMiCikti ? ` cikarilan=${cikarilan.map((d) => `${d.dal}(${d.cikarma})`).join(",")}` : "") +
    (sec.sadece ? ` sadece=${sec.sadece.join(",")}` : "") +
    (sec.tekrar ? " tekrar=evet" : "") +
    ` kademe=${sec.kademe}` +
    (sec.kuru ? " kuru=evet" : "");
  const kayit = {
    surum: 1,
    sonuc: sonucAd,
    sadece: sec.sadece,
    on_denetim: sec.onDenetim,
    tekrar: sec.tekrar,
    kademe: sec.kademe,
    sonuc_kodu: gecti ? (sec.sadece ? "gecti_kismi" : pgBekliyor ? "gecti_pg_bekliyor" : "gecti") : duzeltme ? "duzeltme_gerekli" : "kirik",
    atif: { incelenen: dalKayitlari.reduce((t, d) => t + d.atif.incelenen, 0), eksik: atifEksik, ayrinti: dalKayitlari.flatMap((d) => d.atif.ayrinti.map((a) => ({ dal: d.dal, ...a }))) },
    buyuk_dosya: {
      sinir_bayt: BUYUK_SINIR,
      bulunan: dalKayitlari.flatMap((d) => d.buyuk.bulunan.map((b) => ({ dal: d.dal, ...b }))),
      ihlal: dalKayitlari.flatMap((d) => d.buyuk.ihlal.map((b) => ({ dal: d.dal, ...b }))),
      istisna: dalKayitlari.filter((d) => d.buyuk.istisna && d.buyuk.bulunan.length > 0).map((d) => ({ dal: d.dal, istisna: `istisna: ${d.buyuk.istisna?.onay ?? "?"}`, gerekce: d.buyuk.istisna?.gerekce ?? null })),
    },
    paket: {
      dallar: dalKayitlari.map((d) => ({
        dal: d.dal,
        dal_sha: d.sha,
        uc_sha: d.uc_sha,
        durum: d.durum,
        cikarma_nedeni: d.cikarma,
        ust_dal: d.ust_dal,
        taban_sha: d.taban,
        commit_sayisi: d.commit_sayisi,
        atif: { incelenen: d.atif.incelenen, eksik: d.atif.eksik, ayrinti: d.atif.ayrinti },
        buyuk_dosya: { bulunan: d.buyuk.bulunan, ihlal: d.buyuk.ihlal, istisna: d.buyuk.istisna && d.buyuk.bulunan.length > 0 ? `istisna: ${d.buyuk.istisna.onay ?? "?"}` : null },
        rebase_cakisma: d.rebase_cakisma,
        dondurulmus_degisen: d.dondurulmus,
        dal_dosyalari: d.dal_dosyalari,
        degisen_dosyalar: d.degisen,
      })),
      cikarilan: cikarilan.map((d) => ({ dal: d.dal, neden: d.cikarma })),
    },
    pgGerekli: pgNeden.length > 0,
    pg_nedeni: pgNeden,
    pg_ref: pgRef,
    ozet,
    dal: etiket,
    paket_adi: sec.ad,
    dallar: sec.dallar,
    zaman,
    kuru: sec.kuru,
    taban_sha: entegSha,
    dal_sha: dalKayitlari.length === 1 ? (dalKayitlari[0]?.sha ?? null) : null,
    uc_sha: ucSha || null,
    kirik_adim: kirikAdim,
    kirik_ileti: kirikIleti || null,
    rebase_cakisma: dalKayitlari.flatMap((d) => d.rebase_cakisma),
    sure_sn: sureSn,
    adimlar,
    testler: testler
      ? { toplam: testler.toplam, gecen: testler.gecen, kirik: testler.kirik, atlanan: testler.atlanan, atlanan_testler: testler.atlananTestler, kirik_testler: kirikTestler }
      : null,
    kararsiz,
    kirik_sorumlu: kirikSorumlu,
    istemci_sizinti: sizinti,
    playwright_rapor: playwrightRapor,
    dondurulmus_altin: dondurulmus,
    negatif_kontrol: dondurulmus.negatif_kontrol,
    vitest_sure_sn: yuvarla1(adimlar.filter((a) => a.ad.startsWith("vitest")).reduce((t, a) => t + a.sure_sn, 0)),
    yuk_tanisi: yukTanisi,
    gzip_bayt: gzipBayt,
    gzip_kb: gzipBayt !== null ? Number(kb(gzipBayt)) : null,
    gzip_taban_bayt: gzipTaban,
    gzip_fark_bayt: gzipBayt !== null && gzipTaban !== null ? gzipBayt - gzipTaban : null,
    gzip_sinir_bayt: GZIP_SINIR,
    ...yardimciBoyutlar,
    istemci_degisti: istemciDegisti,
    dunya_kosuldu: dunyaKosuldu,
    dunya: dunyaKosuldu ? "koştu" : dunyaNotu || "atlandı: yol tetiklemedi",
    playwright_kosuldu: dunyaKosuldu && playwrightSecilen.length > 0,
    playwright_betikleri: dunyaKosuldu ? playwrightSecilen : [],
    playwright: dunyaKosuldu && playwrightSecilen.length > 0 ? "koştu" : "atlandı: yol tetiklemedi",
    sure_siniri_sn: SURE_SINIRI_SN,
    sure_siniri_asildi_adim: sureSiniriAdim,
    kilit_bekleme_sn: kilitBeklemeSn,
    degisen_dosyalar: degisen,
    ileri_sarma: ileriSarma,
    kalan_surecler: { kapi_artigi: artik, genel: genelArtik },
    gunluk_dizini: gunlukDizin,
    makine: { ad: hostname(), yuk_1dk_bitis: yuvarla1(loadavg()[0] ?? 0) },
  };
  writeFileSync(jsonYolu, JSON.stringify(kayit, null, 2) + "\n", { flag: "wx" });
  appendFileSync(join(sonucDizin, "ozet.log"), `${new Date().toISOString()} ${ozet}\n`);
  // Sonraki koşular için "önce" boyutu: geçen ucun gzip boyutu
  // dunya atlandıysa (yol tetiklemedi) dunya.html değişmemiştir: tabanın boyutu yeni uca taşınır
  if (gecti && (gzipBayt ?? gzipTaban) !== null) tabanBoyutYaz(sonucDizin, ileriSarma.sonra ?? ucSha, (gzipBayt ?? gzipTaban) as number);
  process.stderr.write(`[kapi] json: ${jsonYolu}\n`);
  process.stdout.write(`${ozet}\n`);
  return gecti ? 0 : duzeltme ? 3 : 1;
}

main()
  .then((kod) => {
    process.exitCode = kod;
  })
  .catch((e: unknown) => {
    const ileti = e instanceof Error ? e.message : String(e);
    if (e instanceof Kullanim && ileti === "yardim") {
      process.stdout.write(`${KULLANIM}\n`);
      process.exitCode = 0;
    } else if (e instanceof Kullanim) {
      process.stderr.write(`kapi: ${ileti}\n${KULLANIM}\n`);
      process.exitCode = 2;
    } else {
      process.stderr.write(`kapi: beklenmeyen hata: ${e instanceof Error ? (e.stack ?? ileti) : ileti}\n`);
      process.exitCode = 2;
    }
  });

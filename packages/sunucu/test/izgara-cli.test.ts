/**
 * `--izgara-manifest` CLI (gerçek süreç): JSON fikstür yoluyla birlikte reddi; manifest/dosya hataları açılışı okunur bir `olumcul` olayıyla durdurur
 * (eksik dosya, sha256, bayt). Başarılı yükleme ve dünya eşitliği çekirdek bağlandıktan sonra (K3 hücre dizini) eklenir.
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { izgaraDizini } from "./izgara-yardimci";
import type { IzgaraDizini } from "./izgara-yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const temizlik: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const f of temizlik.splice(0).reverse()) await f().catch(() => undefined);
});

/** Süreci başlatır; ilk `hazir`/`olumcul` olayını döndürür. */
async function ilkOlay(ortam: Record<string, string>, ...args: string[]): Promise<Record<string, unknown>> {
  const p: ChildProcess = spawn(process.execPath, ["--import", "tsx", CLI, ...args], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_DEPO: "bellek", BOLGE_ELLE_SAAT: "1", ...ortam } });
  temizlik.push(async () => {
    if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
  });
  return new Promise((coz, reddet) => {
    let tampon = "";
    p.stdout?.on("data", (b: Buffer) => {
      tampon += b.toString();
      for (const satir of tampon.split("\n")) {
        if (!satir.startsWith("{")) continue;
        const o = JSON.parse(satir) as Record<string, unknown>;
        if (o.olay === "hazir" || o.olay === "olumcul") coz(o);
      }
    });
    p.once("exit", (kod) => reddet(new Error(`cikti: ${kod}`)));
  });
}

async function hata(ortam: Record<string, string>, ...args: string[]): Promise<string> {
  const o = await ilkOlay(ortam, ...args);
  expect(o.olay).toBe("olumcul");
  return String(o.hata);
}

describe("--izgara-manifest (CLI)", () => {
  it("JSON fikstürle (--parsel, --parsel-dosya) birlikte verilirse reddedilir; ortam değişkeni de aynı", async () => {
    const d: IzgaraDizini = await izgaraDizini();
    temizlik.push(() => d.temizle());
    expect(await hata({}, "--izgara-manifest", d.manifestYolu, "--parsel")).toMatch(/--izgara-manifest ile --parsel\/--parsel-dosya birlikte verilemez/);
    expect(await hata({}, "--izgara-manifest", d.manifestYolu, "--parsel-dosya", join(d.kok, "yok.json"))).toMatch(/birlikte verilemez/);
    expect(await hata({ BOLGE_IZGARA_MANIFEST: d.manifestYolu, BOLGE_PARSEL: "1" })).toMatch(/birlikte verilemez/);
  }, 120_000);

  it("manifest yok / bozuk, dosya eksik, sha256 ve bayt uyuşmazlığı: açılış okunur hatayla durur", async () => {
    const d: IzgaraDizini = await izgaraDizini();
    temizlik.push(() => d.temizle());
    expect(await hata({}, "--izgara-manifest", join(d.kok, "yok.json"))).toMatch(/izgara manifesti okunamadi/);
    await writeFile(join(d.kok, "bozuk.json"), "{ json degil");
    expect(await hata({}, "--izgara-manifest", join(d.kok, "bozuk.json"))).toMatch(/gecerli JSON degil/);
    // sha256: gz baytlarından biri bozulur (aynı uzunluk).
    const yol = join(d.kok, "izgara", "tr_16_gemlik.bhi.gz");
    const gz = await readFile(yol);
    const orijinal = Buffer.from(gz);
    gz[gz.length - 9] = (gz[gz.length - 9] as number) ^ 1;
    await writeFile(yol, gz);
    expect(await hata({}, "--izgara-manifest", d.manifestYolu)).toMatch(/izgara sha256 uyusmuyor: tr_16_gemlik/);
    await writeFile(yol, Buffer.concat([orijinal, Buffer.from([0])])); // bayt sayısı
    expect(await hata({ BOLGE_IZGARA_MANIFEST: d.manifestYolu })).toMatch(/izgara bayt sayisi uyusmuyor: tr_16_gemlik/);
    await rm(yol);
    expect(await hata({}, "--izgara-manifest", d.manifestYolu)).toMatch(/izgara dosyasi yok: tr_16_gemlik/);
    // --izgara-kok: manifestin üst dizini yerine açık kök (dosyalar orada yok).
    expect(await hata({}, "--izgara-manifest", d.manifestYolu, "--izgara-kok", join(d.kok, "izgara"))).toMatch(/izgara dosyasi yok/);
  }, 180_000);
});

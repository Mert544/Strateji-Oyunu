/**
 * `--izgara-manifest` CLI (gerçek süreç): JSON fikstür yoluyla birlikte reddi; manifest/dosya hataları açılışı okunur bir `olumcul` olayıyla durdurur
 * (eksik dosya, sha256, bayt). Başarılı yükleme: gerçek kod çözücüyle dünya kurulur, hazir olayı yüklenen hücre sayısını verir, oyuncu ilçeye katılır.
 * Dünya eşitliği (manifest = JSON fikstürü) `izgara-dunya.test.ts`'tedir.
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { SunucuIstemcisi } from "../src/istemci";
import { izgaraDizini, zenginDurum } from "./izgara-yardimci";
import { SIR, token } from "./yardimci";
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

describe("--izgara-manifest ile açılış (gerçek BHI1 çözücüsü)", () => {
  it("manifest + hiyerarşi ile mülk dünyası açılır: izgara olayı (ilçe, hücre sayısı), oyuncu ilçeye katılır, kare gelir; hiyerarşide olmayan ilçe açılışı durdurur", async () => {
    const ilceler = [
      { kimlik: "sn_m_liman_merkez", ad: "Liman Merkez", il: "sn_m_liman", x0: 90, y0: 95, genislik: 68, yukseklik: 60, tohum: 2 },
      { kimlik: "sn_m_ova_merkez", ad: "Ova Merkez", il: "sn_m_ova", x0: 900_000, y0: 905_000, genislik: 60, yukseklik: 56, tohum: 1 },
    ];
    const d: IzgaraDizini = await izgaraDizini(ilceler, (c) => zenginDurum(c.genislik, c.yukseklik, c.tohum));
    temizlik.push(() => d.temizle());
    const hiy = {
      bolgeler: [
        { kimlik: "m_ova", iller: [{ kimlik: "sn_m_ova", ad: "Ova", ilceler: [{ kimlik: "sn_m_ova_merkez", ad: "Ova Merkez" }] }] },
        { kimlik: "m_liman", iller: [{ kimlik: "sn_m_liman", ad: "Liman", ilceler: [{ kimlik: "sn_m_liman_merkez", ad: "Liman Merkez" }] }] },
      ],
    };
    await writeFile(join(d.kok, "hiyerarsi.json"), JSON.stringify(hiy));
    await writeFile(join(d.kok, "eksik-hiyerarsi.json"), JSON.stringify({ bolgeler: [hiy.bolgeler[0]] }));
    expect(await hata({}, "--izgara-manifest", d.manifestYolu, "--hiyerarsi", join(d.kok, "eksik-hiyerarsi.json"))).toMatch(/ilce hiyerarsi dosyasinda yok: sn_m_liman_merkez/);

    const p: ChildProcess = spawn(process.execPath, ["--import", "tsx", CLI, "--izgara-manifest", d.manifestYolu, "--gelistirme-sirri", SIR], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_DEPO: "bellek", BOLGE_ELLE_SAAT: "1" } });
    temizlik.push(async () => {
      if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
    });
    const olaylar: Array<Record<string, unknown>> = [];
    const hazir = await new Promise<Record<string, unknown>>((coz, reddet) => {
      let tampon = "";
      p.stdout?.on("data", (b: Buffer) => {
        tampon += b.toString();
        for (const satir of tampon.split("\n")) {
          if (!satir.startsWith("{")) continue;
          const o = JSON.parse(satir) as Record<string, unknown>;
          if (!olaylar.some((x) => JSON.stringify(x) === satir)) olaylar.push(o);
          if (o.olay === "hazir" || o.olay === "olumcul") coz(o);
        }
      });
      p.once("exit", (kod) => reddet(new Error(`cikti: ${kod}`)));
    });
    expect(hazir.olay, JSON.stringify(hazir)).toBe("hazir");
    const izgara = olaylar.find((o) => o.olay === "izgara");
    expect(izgara).toMatchObject({ ilce: 2 });
    expect(Number(izgara?.hucre)).toBeGreaterThan(2000);
    const url = `ws://127.0.0.1:${hazir.port}`;
    const sistem = await SunucuIstemcisi.baglan(url, token("sistem"), "s");
    const r = await sistem.komut("k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: "sn_m_ova_merkez" });
    expect(r.tur === "komutSonucu" && r.sonuc.tamam, JSON.stringify(r)).toBe(true);
    const ali = await SunucuIstemcisi.baglan(url, token("ali"), "a");
    const k = await ali.abone([]);
    expect(k.kare.oyuncu?.mulk?.katilimIlcesi).toBe("sn_m_ova_merkez");
    await ali.kapat();
    await sistem.kapat();
  }, 120_000);
});

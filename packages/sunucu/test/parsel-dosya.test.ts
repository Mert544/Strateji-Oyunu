/**
 * CLI `--parsel-dosya`: parsel fikstürü dosyadan yüklenir, `@bolge/veri` doğrulayıcısından (harita ile) geçer;
 * geçerliyse mülk kipi açılır, bozuksa anlaşılır hata verilir. Mülk kipi `param.mulk` + fikstür birlikte gerektirir.
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { bellekDeposu } from "../src/depo/bellek";
import { parselDosyasiYukle } from "../src/parsel-dosya";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { mulkVerisi, veri } from "./yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

let dizin = "";
const surecler: ChildProcess[] = [];
afterAll(async () => {
  for (const p of surecler) if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
  if (dizin) await rm(dizin, { recursive: true, force: true });
});

async function dosya(ad: string, icerik: unknown): Promise<string> {
  dizin ||= await mkdtemp(join(tmpdir(), "bolge-parsel-"));
  const yol = join(dizin, ad);
  await writeFile(yol, typeof icerik === "string" ? icerik : JSON.stringify(icerik));
  return yol;
}

/** CLI'yi başlatır; ilk `hazir` ya da `olumcul` olayını döndürür. */
async function cliBaslat(...ekArgumanlar: string[]): Promise<{ olay: Record<string, unknown>; p: ChildProcess }> {
  const p = spawn(process.execPath, ["--import", "tsx", CLI, "--port", "0", "--harita", "mini", "--depo", "bellek", "--elle-saat", ...ekArgumanlar], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"] });
  surecler.push(p);
  const olay = await new Promise<Record<string, unknown>>((coz, reddet) => {
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
  return { olay, p };
}

describe("parselDosyasiYukle", () => {
  it("gecerli fiksturu (harita ile dogrulanarak) yukler; yazar mulk kipinde acilir", async () => {
    const yol = await dosya("gecerli.json", parselFiksturuYukle("mini-6"));
    const v = mulkVerisi();
    delete v.parsel;
    v.parsel = parselDosyasiYukle(yol, v);
    expect(v.parsel.ilceler.length).toBeGreaterThan(0);
    const y = await DunyaYazari.ac({ veri: v, tohum: 1, depo: bellekDeposu(), saat: new ElleSaat() });
    expect(y.sim.dunya.mulk).toBeDefined();
  });

  it("bozuk fikstur anlasilir hatayla reddedilir: eksik dosya, gecersiz JSON, sema, anlamsal, harita uyusmazligi", async () => {
    const v = veri();
    expect(() => parselDosyasiYukle(join(tmpdir(), "yok-parsel.json"), v)).toThrow(/okunamadi/);
    expect(() => parselDosyasiYukle("/dev/null", v)).toThrow(/gecerli JSON degil/);
    const bozukSema = await dosya("sema.json", { ad: "x" });
    expect(() => parselDosyasiYukle(bozukSema, v)).toThrow(/parsel fiksturu gecersiz/);
    const f = parselFiksturuYukle("mini-6");
    const sayimBozuk = structuredClone(f);
    (sayimBozuk.ilceler[0] as { hucreSayisi: number }).hucreSayisi += 5;
    expect(() => parselDosyasiYukle(bozukSema, v)).toThrow(/ - /); // hata listesi madde madde
    const sayimYolu = await dosya("sayim.json", sayimBozuk);
    expect(() => parselDosyasiYukle(sayimYolu, v)).toThrow(/hucreSayisi/);
    const haritaDisi = structuredClone(f);
    (haritaDisi.iller[0] as { bolge: string }).bolge = "olmayan_bolge";
    const haritaYolu = await dosya("harita.json", haritaDisi);
    expect(() => parselDosyasiYukle(haritaYolu, v)).toThrow(/olmayan_bolge/);
  });

  it("param.mulk yoksa fikstur verilse de acik hata (mulk kipi ikisini birlikte ister)", async () => {
    const yol = await dosya("gecerli2.json", parselFiksturuYukle("mini-6"));
    const v = veri();
    delete v.param.mulk;
    expect(() => parselDosyasiYukle(yol, v)).toThrow(/param\.mulk/);
  });
});

describe("CLI --parsel-dosya", () => {
  it("gecerli dosyayla sunucu mulk kipinde acilir", async () => {
    const yol = await dosya("cli-gecerli.json", parselFiksturuYukle("mini-6"));
    const { olay, p } = await cliBaslat("--parsel-dosya", yol);
    expect(olay.olay).toBe("hazir");
    p.kill("SIGKILL");
  }, 120_000);

  it("bozuk dosyada olumcul hata (anlasilir mesaj); --parsel ile birlikte verilemez", async () => {
    const f = parselFiksturuYukle("mini-6");
    (f.ilceler[0] as { uygunHucre: number }).uygunHucre += 1;
    const yol = await dosya("cli-bozuk.json", f);
    const r = await cliBaslat("--parsel-dosya", yol);
    expect(r.olay.olay).toBe("olumcul");
    expect(String(r.olay.hata)).toMatch(/parsel fiksturu gecersiz[\s\S]*uygunHucre/);
    const r2 = await cliBaslat("--parsel", "--parsel-dosya", yol);
    expect(String(r2.olay.hata)).toMatch(/birlikte verilemez/);
  }, 120_000);
});

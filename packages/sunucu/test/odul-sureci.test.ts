/**
 * Esnaf Defteri dedektörü, GERÇEK süreç: CLI (mülk kipi, dosya deposu, elle saat, `--odul` varsayılan açık) alt süreçte koşar; oyuncu ws üzerinden
 * işlerini yapar, yönetici zamanı ilerletir; SIGKILL; yeniden başlatmada çift ödül yoktur, Defter aynıdır ve dünya günlüğün bağımsız yeniden
 * oynatılmasıyla (ödüller günlükte) aynı özeti verir.
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import type { GunlukKaydi } from "../src/depo/tipler";
import { SunucuIstemcisi } from "../src/istemci";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { SIR, kamuKumesi, token } from "./yardimci";

/** CLI `--harita mini --parsel` ile aynı veri (yurt hücreleri DAHİL: varsayılan parametreler). */
const cliVerisi = () => ({ ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") });

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const TOHUM = 5;
const surecler: ChildProcess[] = [];
const dizinler: string[] = [];
afterAll(async () => {
  for (const p of surecler) if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
  for (const d of dizinler) await rm(d, { recursive: true, force: true });
});

function surec(dizin: string, ek: string[] = []): { p: ChildProcess; hazir: Promise<{ port: number }> } {
  const p = spawn(process.execPath, ["--import", "tsx", CLI, "--port", "0", "--harita", "mini", "--parsel", "--tohum", String(TOHUM), "--depo", "dosya", "--dizin", dizin, "--elle-saat", "--goruntu-saat", "6", "--commit-ms", "20", "--hiz-siniri", "1000/1000", "--gelistirme-sirri", SIR, ...ek], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"] });
  surecler.push(p);
  let tampon = "";
  let hata = "";
  p.stderr?.on("data", (b: Buffer) => (hata += b.toString()));
  const hazir = new Promise<{ port: number }>((coz, reddet) => {
    p.stdout?.on("data", (b: Buffer) => {
      tampon += b.toString();
      let i;
      while ((i = tampon.indexOf("\n")) >= 0) {
        const o = JSON.parse(tampon.slice(0, i)) as { olay?: string; port?: number; hata?: string };
        tampon = tampon.slice(i + 1);
        if (o.olay === "hazir") coz({ port: o.port as number });
        if (o.olay === "olumcul") reddet(new Error(`olumcul: ${String(o.hata)}`));
      }
    });
    p.once("exit", (kod) => reddet(new Error(`hazir olmadan cikti (${kod}): ${hata}`)));
  });
  return { p, hazir };
}

async function oldur(p: ChildProcess): Promise<void> {
  const bitti = new Promise<void>((coz) => p.once("exit", () => coz()));
  p.kill("SIGKILL");
  await bitti;
}

async function gunluk(dizin: string): Promise<GunlukKaydi[]> {
  return (await readFile(join(dizin, "gunluk.jsonl"), "utf8"))
    .split("\n")
    .filter((s) => s !== "")
    .map((s) => JSON.parse(s) as GunlukKaydi);
}

function bitisik(liste: string[]): string[] {
  const k = new Set(liste);
  for (const id of liste) {
    const [x, y] = id.split(":").map(Number) as [number, number];
    if (k.has(`${x + 1}:${y}`)) return [id, `${x + 1}:${y}`];
  }
  throw new Error("bitisik cift yok");
}

describe("dedektor (CLI, dosya deposu, SIGKILL)", () => {
  it("oyuncu isleri odul dogurur; SIGKILL sonrasi cift odul yok, Defter ayni, dunya gunlugun yeniden oynatilmasiyla ayni", async () => {
    const dizin = await mkdtemp(join(tmpdir(), "bolge-odul-"));
    dizinler.push(dizin);
    // Hücre seçimi: aynı fikstür ve parametrelerle yerel bir sim (kamu/ayrılmış hücreler dışarıda).
    const yerel = Simulasyon.olustur(cliVerisi(), TOHUM);
    const serbest = (ilce: string): string[] => {
      const kamu = kamuKumesi(yerel, ilce);
      const ay = yerel.ic.mulk?.ayrilmis ?? new Set<string>();
      return (yerel.ic.mulk?.fikstur.ilceler.find((c) => c.id === ilce)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id) && !ay.has(h.id)).map((h) => h.id);
    };
    const c1 = bitisik(serbest("sn_m_ova_merkez"));
    const t2 = serbest("sn_m_ova_tasra");

    const s1 = surec(dizin);
    const h1 = await s1.hazir;
    const url1 = `ws://127.0.0.1:${h1.port}`;
    const yon = await SunucuIstemcisi.baglan(url1, token(SISTEM_OYUNCUSU), "yon");
    const kt = await yon.komut("k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: "sn_m_ova_merkez" } as Komut);
    expect(kt.tur === "komutSonucu" && kt.sonuc.tamam).toBe(true);
    await yon.zamanIlerlet(3 * SAAT);
    const ali = await SunucuIstemcisi.baglan(url1, token("ali"), "ali-ist");
    const dene = async (a: string, k: Komut): Promise<void> => {
      const r = await ali.komut(a, k);
      if (r.tur !== "komutSonucu" || !r.sonuc.tamam) throw new Error(`komut basarisiz ${a}: ${JSON.stringify(r)}`);
    };
    await dene("p1", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: c1, sinif: "kirsal" });
    await dene("i1", { tur: "tesis_insa_hucre", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler: c1 });
    await dene("p2", { tur: "parsel_al", ilce: "sn_m_ova_tasra", hucreler: [t2[0] as string], sinif: "kirsal" });
    await yon.zamanIlerlet(10 * SAAT);
    ali.gonder({ tur: "defterIste", istek: 1 });
    const d1 = await ali.bekle((m) => m.tur === "defter" && m.istek === 1);
    if (d1.tur !== "defter") throw new Error("defter bekleniyordu");
    const kavramlar1 = d1.kazanilan.filter((k) => k.tur === "odul").map((k) => k.kavram).sort();
    expect(kavramlar1).toEqual(["ilk_yapi"]); // ikinci ilcede yalniz hucre var (yapi yok): ikinci_ilce YOK
    expect(d1.kazanilan.every((k) => k.t !== undefined)).toBe(true);
    const x1 = await yon.zamanIlerlet(20 * SAAT);
    await oldur(s1.p); // kill -9
    await yon.kapat();
    await ali.kapat();

    const l1 = (await gunluk(dizin)).filter((k) => k.komut.tur === "sistem_odul");
    expect(l1.map((k) => k.anahtar).sort()).toEqual(["odul:ali:ilk_yapi"]);

    // Yeniden başlatma: çift ödül yok, Defter aynı, durumOzeti aynı t'de aynı.
    const s2 = surec(dizin);
    const h2 = await s2.hazir;
    const url2 = `ws://127.0.0.1:${h2.port}`;
    const yon2 = await SunucuIstemcisi.baglan(url2, token(SISTEM_OYUNCUSU), "yon");
    const x2 = await yon2.zamanIlerlet(20 * SAAT);
    expect(x2.durumOzeti).toBe(x1.durumOzeti);
    const ali2 = await SunucuIstemcisi.baglan(url2, token("ali"), "ali-ist");
    ali2.gonder({ tur: "defterIste", istek: 2 });
    const d2 = await ali2.bekle((m) => m.tur === "defter" && m.istek === 2);
    if (d2.tur !== "defter") throw new Error("defter bekleniyordu");
    expect(d2.kazanilan).toEqual(d1.kazanilan);
    expect(d2.toplamOdulMili).toBe(d1.toplamOdulMili);
    const x3 = await yon2.zamanIlerlet(30 * SAAT); // yeni ilerleme: eskiler tekrar edilmez (yeni kosul dogarsa yeni kavram)
    await oldur(s2.p);
    await yon2.kapat();
    await ali2.kapat();
    const l2 = (await gunluk(dizin)).filter((k) => k.komut.tur === "sistem_odul");
    const anahtarlar = l2.map((k) => k.anahtar);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
    for (const a of ["odul:ali:ilk_yapi"]) expect(anahtarlar.filter((x) => x === a)).toHaveLength(1);

    // Günlüğün bağımsız, baştan yeniden oynatılması (ödüller günlükte) aynı özeti verir.
    const referans = Simulasyon.olustur(cliVerisi(), TOHUM);
    for (const k of await gunluk(dizin)) referans.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
    referans.calistirKadar(x3.t);
    expect(referans.durumOzeti()).toBe(x3.durumOzeti);
  }, 120_000);
});

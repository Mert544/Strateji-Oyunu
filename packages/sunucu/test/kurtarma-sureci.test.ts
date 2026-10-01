/**
 * (a) kill -9 / yeniden başlatma: dosya depolu sunucu ALT SÜREÇTE (`node --import tsx src/cli.ts`) koşar; sunucu
 * botu ve bir WebSocket oyuncusu dünyayı ilerletir; SIGKILL; yeniden başlatma → son anlık görüntü + günlük kuyruğu.
 *
 * Elle saat kullanılır: karşılaştırma AYNI sim anında yapılmalıdır (kurtarılan dünya son komutun t'sinde ya da görüntü
 * anındadır; canlı dünya daha ileride olabilir → `zamanIlerlet(T)` = `calistirKadar(T)`, docs/06 §14).
 *
 * 1. Koşu: bot + oyuncu, 30 sim-saat; T'de özet X1 → SIGKILL.
 * 2. Koşu (botsuz): görüntü + kuyrukla kurtarılır; T'de özet = X1. Sonra onaylanan komutlar + onay beklenmeden
 *    gönderilen komutlar → hemen SIGKILL (yolda olanlar).
 * 3. Koşu: T'de özet = günlük dosyasının bağımsız, baştan yeniden oynatılması; onaylanan her komut günlükte. SIGTERM
 *    → düzgün kapanış (kuyruk yazılır, kapanış görüntüsü).
 * 4. Koşu: kapanış görüntüsünden kalan kuyruk olmadan aynı özetle açılır.
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
import type { KurtarmaRaporu } from "../src/yazar";
import { GUNEY, SIR, token, veri } from "./yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const TOHUM = 3;

interface Surec {
  p: ChildProcess;
  hazir: Promise<{ port: number; kurtarma: KurtarmaRaporu }>;
  olaylar: Array<Record<string, unknown>>;
  cikis: Promise<{ kod: number | null; sinyal: NodeJS.Signals | null }>;
  hataCiktisi: () => string;
}

const surecler: ChildProcess[] = [];
const dizinler: string[] = [];
afterAll(async () => {
  for (const p of surecler) if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
  if (!process.env.BOLGE_TEST_DIZIN_TUT) for (const d of dizinler) await rm(d, { recursive: true, force: true });
  else console.log("dizin korundu:", dizinler);
});

function sunucuSureci(dizin: string, botlar: string): Surec {
  const p = spawn(
    process.execPath,
    ["--import", "tsx", CLI, "--port", "0", "--harita", "mini", "--tohum", String(TOHUM), "--depo", "dosya", "--dizin", dizin, "--elle-saat", "--goruntu-saat", "6", "--commit-ms", "20", "--botlar", botlar, "--hiz-siniri", "1000/1000", "--gelistirme-sirri", SIR],
    { cwd: KOK, stdio: ["ignore", "pipe", "pipe"] },
  );
  surecler.push(p);
  const olaylar: Array<Record<string, unknown>> = [];
  let hata = "";
  let tampon = "";
  p.stderr?.on("data", (b: Buffer) => (hata += b.toString()));
  const hazir = new Promise<{ port: number; kurtarma: KurtarmaRaporu }>((coz, reddet) => {
    p.stdout?.on("data", (b: Buffer) => {
      tampon += b.toString();
      let i;
      while ((i = tampon.indexOf("\n")) >= 0) {
        const satir = tampon.slice(0, i);
        tampon = tampon.slice(i + 1);
        const o = JSON.parse(satir) as Record<string, unknown>;
        olaylar.push(o);
        if (o.olay === "hazir") coz(o as unknown as { port: number; kurtarma: KurtarmaRaporu });
        if (o.olay === "olumcul") reddet(new Error(`sunucu olumcul: ${String(o.hata)}`));
      }
    });
    p.once("exit", (kod) => reddet(new Error(`sunucu hazir olmadan cikti (${kod}): ${hata}`)));
  });
  const cikis = new Promise<{ kod: number | null; sinyal: NodeJS.Signals | null }>((coz) => p.once("exit", (kod, sinyal) => coz({ kod, sinyal })));
  return { p, hazir, olaylar, cikis, hataCiktisi: () => hata };
}

async function oldur(s: Surec): Promise<void> {
  s.p.kill("SIGKILL");
  const c = await s.cikis;
  expect(c.sinyal).toBe("SIGKILL");
}

/** Oyuncu komutları: başarılı ve başarısız karışık (deterministik). */
function insanKomutlari(adim: number): Komut[] {
  const bolge = GUNEY[adim % 3] as string;
  return [
    { tur: "vergi_ayarla", oranPpm: 80_000 + adim * 3_000 },
    { tur: "tesis_insa", bolge: adim % 2 ? "m_sehir" : bolge, tesisTuru: adim % 3 ? "ciftlik" : "gida_fabrikasi" },
    { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }, // yabancı bölge: başarısız
    { tur: "savunma_emri", bolge, durus: adim % 2 ? "savunma" : "normal" },
  ];
}

async function gunlukOku(dizin: string): Promise<GunlukKaydi[]> {
  const metin = await readFile(join(dizin, "gunluk.jsonl"), "utf8");
  return metin
    .split("\n")
    .filter((s) => s !== "")
    .map((s) => JSON.parse(s) as GunlukKaydi);
}

describe("kill -9 ve yeniden baslatma (alt surec, dosya deposu)", () => {
  it("anlik goruntu + gunluk kuyrugu ayni t'de ayni ozeti verir; onaylanan komut kaybolmaz", async () => {
    const dizin = await mkdtemp(join(tmpdir(), "bolge-kurtarma-"));
    dizinler.push(dizin);
    const T = 30 * SAAT;

    // --- 1. koşu: bot + oyuncu ---
    const s1 = sunucuSureci(dizin, "sanayici");
    const h1 = await s1.hazir;
    expect(h1.kurtarma.goruntuSeq).toBeNull();
    const url1 = `ws://127.0.0.1:${h1.port}`;
    const y1 = await SunucuIstemcisi.baglan(url1, token(SISTEM_OYUNCUSU), "yonetici");
    const katilim = await y1.komut("katil-insan", { tur: "oyuncu_katil", oyuncu: "insan", bolgeler: GUNEY });
    expect(katilim.tur === "komutSonucu" && katilim.sonuc.tamam).toBe(true);
    const i1 = await SunucuIstemcisi.baglan(url1, token("insan"), "insan-istemci");
    let basarisiz = 0;
    for (let adim = 1; adim <= 10; adim++) {
      await y1.zamanIlerlet(adim * 3 * SAAT - 30 * 60_000);
      const yanitlar = await Promise.all(insanKomutlari(adim).map((k, j) => i1.komut(`k${adim}-${j}`, k)));
      for (const r of yanitlar) {
        expect(r.tur).toBe("komutSonucu");
        if (r.tur === "komutSonucu" && !r.sonuc.tamam) basarisiz++;
      }
    }
    expect(basarisiz).toBeGreaterThanOrEqual(10);
    const x1 = await y1.zamanIlerlet(T);
    expect(x1.t).toBe(T);
    const gunluk1 = await gunlukOku(dizin);
    expect(gunluk1.some((k) => k.oyuncu === "bot0")).toBe(true); // sunucu botu da günlükte
    expect(gunluk1.at(-1)?.seq).toBe(x1.seq);
    await oldur(s1);
    await y1.kapat();
    await i1.kapat();

    // --- 2. koşu: kurtarma; aynı t'de aynı özet ---
    const s2 = sunucuSureci(dizin, "");
    const h2 = await s2.hazir;
    expect(h2.kurtarma.goruntuSeq).toBeGreaterThan(0);
    expect(h2.kurtarma.seq).toBe(x1.seq);
    expect(h2.kurtarma.simZamani).toBeLessThanOrEqual(T);
    const url2 = `ws://127.0.0.1:${h2.port}`;
    const y2 = await SunucuIstemcisi.baglan(url2, token(SISTEM_OYUNCUSU), "yonetici");
    const x2 = await y2.zamanIlerlet(T);
    expect(x2.seq).toBe(x1.seq);
    expect(x2.durumOzeti).toBe(x1.durumOzeti);

    // Onaylanan komutlar, sonra onay beklenmeden bir yığın ve hemen SIGKILL.
    const i2 = await SunucuIstemcisi.baglan(url2, token("insan"), "insan-istemci");
    const onaylanan: string[] = [];
    for (let j = 0; j < 6; j++) {
      const r = await i2.komut(`son-${j}`, insanKomutlari(20 + j)[j % 4] as Komut);
      if (r.tur === "komutSonucu") onaylanan.push(r.anahtar);
    }
    expect(onaylanan).toHaveLength(6);
    expect(new Set(onaylanan).size).toBe(6);
    // İlk yığın: en az biri onaylanana kadar beklenir (kuyrukta T anında başarılı komut kesin olsun: son komutun
    // planladığı aynı-t `cozum` olayı ancak calistirKadar(T) ile işlenir). İkinci yığın onay beklenmeden, hemen SIGKILL.
    const ilkOnay = i2.bekle((m) => m.tur === "komutSonucu" && m.anahtar === "yolda-0");
    for (let j = 0; j < 30; j++) i2.gonder({ tur: "komut", anahtar: `yolda-${j}`, komut: { tur: "vergi_ayarla", oranPpm: 50_000 + j } });
    await ilkOnay;
    onaylanan.push("yolda-0");
    for (let j = 0; j < 30; j++) i2.gonder({ tur: "komut", anahtar: `yolda2-${j}`, komut: { tur: "vergi_ayarla", oranPpm: 60_000 + j } });
    await oldur(s2);
    await y2.kapat();
    await i2.kapat();

    // --- 3. koşu: günlüğün bağımsız yeniden oynatılmasıyla aynı özet ---
    const gunluk = await gunlukOku(dizin);
    const anahtarlar = new Set(gunluk.map((k) => k.anahtar));
    for (const a of onaylanan) expect(anahtarlar.has(a)).toBe(true);
    const referans = Simulasyon.olustur(veri(), TOHUM);
    for (const k of gunluk) referans.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
    referans.calistirKadar(T);

    const s3 = sunucuSureci(dizin, "");
    const h3 = await s3.hazir;
    expect(h3.kurtarma.seq).toBe(gunluk.at(-1)?.seq);
    const y3 = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${h3.port}`, token(SISTEM_OYUNCUSU), "yonetici");
    const x3 = await y3.zamanIlerlet(T);
    expect(x3.durumOzeti).toBe(referans.durumOzeti());
    // Yolda kalıp günlüğe giremeyenler için istemci aynı anahtarla yeniden dener; girenler tekrar olarak döner.
    const i3 = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${h3.port}`, token("insan"), "insan-istemci");
    const yeniden = await i3.komut("son-0", { tur: "vergi_ayarla", oranPpm: 1 });
    expect(yeniden.tur === "komutSonucu" && yeniden.tekrar).toBe(true);
    await i3.kapat();
    s3.p.kill("SIGTERM");
    expect((await s3.cikis).kod).toBe(0);
    expect(s3.olaylar.some((o) => o.olay === "kapandi")).toBe(true);
    await y3.kapat();

    // --- 4. koşu: kapanış görüntüsünden, kuyruksuz ---
    const s4 = sunucuSureci(dizin, "");
    const h4 = await s4.hazir;
    expect(h4.kurtarma.kalanKayit).toBe(0);
    expect(h4.kurtarma.simZamani).toBe(T);
    const son = await gunlukOku(dizin);
    const ref4 = Simulasyon.olustur(veri(), TOHUM);
    for (const k of son) ref4.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
    ref4.calistirKadar(T);
    expect(h4.kurtarma.durumOzeti).toBe(ref4.durumOzeti());
    await oldur(s4);
  });
});

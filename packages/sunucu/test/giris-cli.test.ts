/**
 * CLI uçtan uca (gerçek süreç): `--uretim` ile geliştirme kimliği reddi ve `--token` kapalı; `--kimlik eposta` ile gerçek sunucuda
 * istek -> dosya postası -> onay -> bilet -> ws -> katil. Sunucu `--elle-saat` ve `--depo bellek` ile açılır (hızlı, yan etkisiz).
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { GunlukKimligi } from "../src/giris/gunluk-kimlik";
import { VARSAYILAN_GUNLUK_TUZU } from "../src/giris/kip";
import { SunucuIstemcisi } from "../src/istemci";
import { Tarayici } from "./giris-yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const kapatilacak: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const f of kapatilacak.splice(0).reverse()) await f().catch(() => undefined);
});

interface Surec {
  p: ChildProcess;
  olaylar: Array<Record<string, unknown>>;
  ilk: Promise<Record<string, unknown>>;
  cikti: () => string;
}

function baslat(ortam: Record<string, string>, ...args: string[]): Surec {
  const p = spawn(process.execPath, ["--import", "tsx", CLI, ...args], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...ortam } });
  kapatilacak.push(async () => {
    if (p.exitCode === null && p.signalCode === null) {
      p.kill("SIGTERM");
      await new Promise<void>((coz) => {
        const z = setTimeout(() => (p.kill("SIGKILL"), coz()), 10_000);
        p.once("exit", () => (clearTimeout(z), coz()));
      });
    }
  });
  const olaylar: Array<Record<string, unknown>> = [];
  let tum = "";
  const ilk = new Promise<Record<string, unknown>>((coz, reddet) => {
    let tampon = "";
    p.stdout?.on("data", (b: Buffer) => {
      tum += b.toString();
      tampon += b.toString();
      const satirlar = tampon.split("\n");
      tampon = satirlar.pop() ?? "";
      for (const satir of satirlar) {
        if (!satir.startsWith("{")) continue;
        const o = JSON.parse(satir) as Record<string, unknown>;
        olaylar.push(o);
        if (o.olay === "hazir" || o.olay === "olumcul") coz(o);
      }
    });
    p.stderr?.on("data", (b: Buffer) => (tum += b.toString()));
    p.once("exit", (kod) => reddet(new Error(`cikti: ${kod}`)));
  });
  ilk.catch(() => undefined); // çıkış kodu 0 ile biten (--token) süreçte işlenmemiş ret oluşmasın
  return { p, olaylar, ilk, cikti: () => tum };
}

const TEMEL = { BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_PARSEL: "1", BOLGE_DEPO: "bellek", BOLGE_ELLE_SAAT: "1" };
const URETIM = {
  BOLGE_PORT: "0",
  BOLGE_HARITA: "mini",
  BOLGE_PARSEL: "1",
  BOLGE_DEPO: "bellek",
  BOLGE_URETIM: "1",
  BOLGE_BILET_SIRRI: "uretim-icin-uzun-rastgele-bilet-sirri-0123456789",
  BOLGE_GUNLUK_TUZU: "uretim-icin-ayri-gunluk-tuzu-9876543210-abcdef",
  BOLGE_IZINLI_KOKENLER: "https://oyun.ornek.org",
  BOLGE_GENEL_URL: "https://sunucu.ornek.org",
};

async function gecici(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "bolge-giris-cli-"));
  kapatilacak.push(() => rm(d, { recursive: true, force: true }));
  return d;
}

describe("CLI: --uretim ve kimlik kipi", () => {
  it("--uretim ile gelistirme kimligi reddedilir (BOLGE_KIMLIK=gelistirme ve --kimlik); --token kapali; gelistirme sirri tek basina yetmez", async () => {
    const hata = async (ortam: Record<string, string>, ...args: string[]): Promise<string> => {
      const s = baslat(ortam, ...args);
      const o = await s.ilk;
      expect(o.olay).toBe("olumcul");
      return String(o.hata);
    };
    expect(await hata({ ...URETIM, BOLGE_KIMLIK: "gelistirme" })).toMatch(/gelistirme kimligi kapali/);
    expect(await hata({ ...URETIM }, "--kimlik", "gelistirme")).toMatch(/gelistirme kimligi kapali/);
    // Eski dağıtım biçimi: yalnız geliştirme sırrı verilmiş üretim artık açılmaz (bilet sırrı yok).
    expect(await hata({ BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_DEPO: "bellek", BOLGE_URETIM: "1", BOLGE_GELISTIRME_SIRRI: "uretim-sirri-0123456789" })).toMatch(/BOLGE_BILET_SIRRI/);
    // --token üretimde kapalı: token yazdırılmaz, hata verir.
    const t = baslat(URETIM, "--token", "ali");
    const o = await t.ilk;
    expect(o.olay).toBe("olumcul");
    expect(String(o.hata)).toMatch(/--token/);
    expect(t.cikti()).not.toMatch(/gel1\./);
    // Üretimde konsol postacısı reddedilir.
    expect(await hata({ ...URETIM, BOLGE_POSTA: "konsol" })).toMatch(/konsol postacisi kapali/);
    // Üretimde günlük tuzu zorunlu (KVKK: günlükte adres yok, tuzlu HMAC öneki) ve bilet sırrından farklı olmalı.
    const { BOLGE_GUNLUK_TUZU: _t, ...tuzsuz } = URETIM;
    expect(await hata(tuzsuz)).toMatch(/BOLGE_GUNLUK_TUZU acikca/);
    expect(await hata({ ...URETIM, BOLGE_GUNLUK_TUZU: URETIM.BOLGE_BILET_SIRRI })).toMatch(/bilet sirrindan.*farkli/);
  }, 180_000);

  it("--token geliştirmede çalışır (bugunku gibi): gel1 token'i yazar ve cikar", async () => {
    const s = baslat({ BOLGE_GELISTIRME_SIRRI: "gelistirme-sirri-uzun-0123" }, "--token", "ali");
    await new Promise<void>((coz) => s.p.once("exit", () => coz()));
    expect(s.cikti().trim()).toMatch(/^gel1\.ali\./);
  }, 60_000);

  it("--uretim: gelistirme sirri verilmisse uyari olayi (yok sayilir) ve sunucu e-posta kipinde acilir", async () => {
    const posta = await gecici();
    await writeFile(join(posta, "yasakli-adlar.json"), JSON.stringify({ yasakliKelimeler: ["bim"], yasakliIcerik: ["migros"] })); // uretimde yasakli ad listesi zorunlu
    const s = baslat({ ...URETIM, BOLGE_POSTA_DIZIN: posta, BOLGE_YASAKLI_ADLAR: join(posta, "yasakli-adlar.json"), BOLGE_GELISTIRME_SIRRI: "eski-dagitimdan-kalan-sir-0123456789" });
    const hazir = await s.ilk;
    expect(hazir.olay).toBe("hazir");
    expect(hazir.kimlik).toBe("eposta");
    expect(s.olaylar.some((o) => o.olay === "uyari" && String(o.mesaj).includes("GELISTIRME_SIRRI yok sayilir"))).toBe(true);
    // Geliştirme token'ı üretimde geçmez (GelistirmeKimligi hiç kurulmadı): imzası doğru olsa bile reddedilir.
    const { gelistirmeTokeni } = await import("../src/kimlik");
    await expect(SunucuIstemcisi.baglan(`ws://127.0.0.1:${hazir.port}`, gelistirmeTokeni("eski-dagitimdan-kalan-sir-0123456789", "sistem"), "x")).rejects.toThrow(/kimlik/);
    await expect(SunucuIstemcisi.baglan(`ws://127.0.0.1:${hazir.port}`, gelistirmeTokeni("gelistirme-sirri-degistir", "sistem"), "x")).rejects.toThrow(/kimlik/);
  }, 120_000);
});

describe("CLI: yasakli ad listesi (gorunen ad)", () => {
  it("--uretim: liste yok/bozuksa acilis durur (okunur hata, icerik yok); gelistirmede uyari + bos liste ve acilir; gecerli listeyle uretim acilir", async () => {
    const d = await gecici();
    const yok = join(d, "yok.json");
    const o1 = await baslat({ ...URETIM, BOLGE_YASAKLI_ADLAR: yok, BOLGE_POSTA_DIZIN: join(d, "posta") }).ilk;
    expect(o1.olay).toBe("olumcul");
    expect(String(o1.hata)).toMatch(/yasakli ad listesi dosya yok.*uretimde acilis durur/);
    await writeFile(join(d, "bozuk.json"), '{"yasakliKelimeler": ["gizli-kelime"]}');
    const o2 = await baslat({ ...URETIM, BOLGE_YASAKLI_ADLAR: join(d, "bozuk.json"), BOLGE_POSTA_DIZIN: join(d, "posta") }).ilk;
    expect(o2.olay).toBe("olumcul");
    expect(String(o2.hata)).toMatch(/bicim gecersiz/);
    expect(String(o2.hata)).not.toContain("gizli-kelime");
    // Gelistirme: uyari olayi ve acilir (varsayilan yol yoksa da; T3 dosyasi gelene kadar).
    const s = baslat({ ...TEMEL, BOLGE_KIMLIK: "eposta", BOLGE_POSTA_DIZIN: join(d, "posta"), BOLGE_YASAKLI_ADLAR: yok });
    const hazir = await s.ilk;
    expect(hazir.olay).toBe("hazir");
    expect(s.olaylar.some((e) => e.olay === "uyari" && String(e.mesaj).includes("BOS listeyle devam"))).toBe(true);
  }, 180_000);
});

describe("CLI: e-posta kipi uctan uca (gelistirme, dosya postacisi)", () => {
  it("istek -> dosya postasi -> onay -> bilet -> ws hosgeldin -> katil; kendi adresi izinli koken (port 0)", async () => {
    const posta = await gecici();
    const s = baslat({ ...TEMEL, BOLGE_KIMLIK: "eposta", BOLGE_POSTA_DIZIN: posta });
    const hazir = await s.ilk;
    expect(hazir.olay).toBe("hazir");
    expect(hazir.kimlik).toBe("eposta");
    const taban = `http://127.0.0.1:${hazir.port}`;
    const t = new Tarayici(taban, taban);
    expect((await t.post("/giris/istek", { eposta: "cli@ornek.org" })).durum).toBe(202);
    let ad: string | undefined;
    for (let i = 0; i < 100 && !ad; i++) {
      ad = (await readdir(posta)).find((x) => x.endsWith(".json"));
      if (!ad) await new Promise((r) => setTimeout(r, 50));
    }
    expect(ad, "posta dosyasi").toBeDefined();
    const mektup = JSON.parse(await readFile(join(posta, ad as string), "utf8")) as { baglanti: string; kime: string };
    expect(mektup.kime).toBe("cli@ornek.org");
    expect(mektup.baglanti.startsWith(`${taban}/giris/onay?j=`)).toBe(true);
    const jeton = new URL(mektup.baglanti).searchParams.get("j") as string;
    expect((await t.istek(`/giris/onay?j=${encodeURIComponent(jeton)}`)).durum).toBe(200);
    const onay = await t.post("/giris/onay", { j: jeton });
    expect(onay.durum).toBe(200);
    expect(t.sonSetCookie.find((c) => c.startsWith("bolge_oturum="))).not.toMatch(/Secure/); // geliştirme
    const bilet = (await t.post("/giris/bilet")).json?.bilet as string;
    const ws = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${hazir.port}`, bilet, "cli-ist");
    expect(ws.hosgeldin?.oyuncu).toBe(onay.json?.oyuncu);
    expect(ws.hosgeldin?.yonetici).toBe(false);
    const k = await ws.katil("k1");
    expect(k.tur === "komutSonucu" && k.sonuc.tamam).toBe(true);
    await ws.kapat();
    // Günlükte belirteç ya da adres yok (süreç çıktısı).
    expect(s.cikti()).not.toContain(jeton);
    expect(s.cikti()).not.toContain("cli@ornek.org");
    expect(s.cikti()).not.toContain(bilet);
    // KVKK: günlükte alan adı ve maskeli hâl de yok; ilişkilendirme için yalnız tuzlu HMAC öneki (geliştirmede örnek tuz + uyarı).
    expect(s.cikti()).not.toMatch(/ornek\.org|\*\*\*@/);
    expect(s.olaylar.find((o) => o.olay === "giris_posta_gonderildi")).toEqual({ olay: "giris_posta_gonderildi", eposta_hmac: new GunlukKimligi(VARSAYILAN_GUNLUK_TUZU).eposta("cli@ornek.org") });
    expect(s.olaylar.some((o) => o.olay === "uyari" && String(o.mesaj).includes("BOLGE_GUNLUK_TUZU verilmedi"))).toBe(true);
    // Metrik portu yok; sağlık ucu etkilenmez.
    expect((await fetch(`${taban}/saglik`)).status).toBe(200);
    // Yabancı Origin reddedilir.
    expect((await new Tarayici(taban, "https://kotu.example").post("/giris/istek", { eposta: "x@ornek.org" })).durum).toBe(403);
  }, 120_000);
});

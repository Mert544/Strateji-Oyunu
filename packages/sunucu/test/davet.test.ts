/**
 * Davetli listesi (kayıt kapısı): ayrıştırma ve normalleştirme, dosyadan yükleme/yenileme, hizmette sızdırmama (davetli olmayana yanıt AYNI, posta yok),
 * bağlantıdan sonra listeden çıkarılan adresin onayı, varsayılan kapalı, CLI (SIGHUP, bozuk/eksik dosyada açılış durur, günlükte adres yok).
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { DAVETLI_UST_SINIRI, DavetliListesi, davetliListesiAyristir } from "../src/giris/davet";
import { girisOrtami, Tarayici } from "./giris-yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const geciciler: string[] = [];
const sureclar: ChildProcess[] = [];
afterEach(async () => {
  for (const p of sureclar.splice(0)) if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
  for (const d of geciciler.splice(0)) await rm(d, { recursive: true, force: true });
});
async function gecici(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "bolge-davet-"));
  geciciler.push(d);
  return d;
}

describe("davetli listesi ayristirma", () => {
  it("bos satir, # satiri ve satir sonu aciklamasi yok sayilir; BOM ve CRLF; adresler G5 anahtarina normallesir", () => {
    const k = davetliListesiAyristir("﻿# Alfa-0 davetlileri\r\nAli@Ornek.org\r\n\r\n  veli+oyun@ornek.org   # arkadas\nAyse.Yilmaz+x@Gmail.com\n");
    expect([...k].sort()).toEqual(["ali@ornek.org", "ayseyilmaz@gmail.com", "veli@ornek.org"]);
    expect(davetliListesiAyristir("").size).toBe(0);
    expect(davetliListesiAyristir("# yalniz aciklama\n\n").size).toBe(0);
  });

  it("gecersiz satir hatasi satir numarasini verir, adresi YAZMAZ; ust sinir asilirsa hata", () => {
    let hata = "";
    try {
      davetliListesiAyristir("ali@ornek.org\ngizli-kisi@@ornek.org\n");
    } catch (e) {
      hata = (e as Error).message;
    }
    expect(hata).toMatch(/satir 2/);
    expect(hata).not.toContain("gizli-kisi");
    const cok = Array.from({ length: DAVETLI_UST_SINIRI + 1 }, (_, i) => `k${i}@ornek.org`).join("\n");
    expect(() => davetliListesiAyristir(cok)).toThrow(/asiyor/);
  });

  it("uyeMi: ayni anahtarli varyantlar eslesir (Gmail noktasi, +takma, buyuk harf); baskasi eslesmez", () => {
    const l = DavetliListesi.metinden("ali.veli@gmail.com\nkisi@ornek.org\n");
    expect(l.boyut).toBe(2);
    expect(l.uyeMi("aliveli@gmail.com")).toBe(true);
    expect(l.uyeMi("kisi@ornek.org")).toBe(true);
    expect(l.uyeMi("kisi@ornek.com")).toBe(false);
    expect(() => l.yenile()).toThrow(/yenilenemez/);
  });
});

describe("davetli listesi dosyasi", () => {
  it("yok ya da bozuk dosya fırlatir (acilis durur); yenile: yeni adresler gelir, bozuk dosyada ESKI liste korunur", async () => {
    const d = await gecici();
    const yol = join(d, "davetli.txt");
    expect(() => DavetliListesi.dosyadan(yol)).toThrow(/okunamadi/);
    await writeFile(yol, "ali@ornek.org\n");
    const l = DavetliListesi.dosyadan(yol);
    expect(l.uyeMi("ali@ornek.org")).toBe(true);
    expect(l.uyeMi("veli@ornek.org")).toBe(false);
    await writeFile(yol, "ali@ornek.org\nveli@ornek.org\n");
    expect(l.yenile()).toBe(2);
    expect(l.uyeMi("veli@ornek.org")).toBe(true);
    await writeFile(yol, "ali@ornek.org\nbozuk satir\n");
    expect(() => l.yenile()).toThrow(/satir 2/);
    expect(l.boyut).toBe(2); // eski liste korundu
    expect(l.uyeMi("veli@ornek.org")).toBe(true);
    await writeFile(yol, "");
    expect(l.yenile()).toBe(0); // bos liste: kimse davetli degil
    await writeFile(yol, "\u0000\u0001");
    expect(() => DavetliListesi.dosyadan(yol)).toThrow();
  });
});

describe("giris hizmeti: kayit kapisi", () => {
  it("davetli olmayana yanit davetliyle BIREBIR ayni ve posta GITMEZ; davetliye (varyantlariyla) gider; sayac artar, gunlukte adres yok", async () => {
    const o = await girisOrtami({ hizmet: { davetliler: DavetliListesi.metinden("davetli@ornek.org\nAli.Veli@gmail.com\n"), tarayiciBagli: true } });
    try {
      const t1 = o.yeniTarayici();
      const t2 = o.yeniTarayici();
      const r1 = await t1.post("/giris/istek", { eposta: "Davetli@Ornek.org" });
      const r2 = await t2.post("/giris/istek", { eposta: "zeta-kisi@ornek.org" });
      await o.hizmet.bosta();
      expect(r2.durum).toBe(r1.durum);
      expect(r2.durum).toBe(202);
      expect(r2.govde).toBe(r1.govde); // bayt bayt aynı gövde
      expect(t2.sonSetCookie.map((c) => c.split("=")[0])).toEqual(t1.sonSetCookie.map((c) => c.split("=")[0])); // aynı çerezler (değerleri rastgele)
      expect(await o.postaSayisi()).toBe(1);
      expect((await o.sonPosta()).posta.kime).toBe("davetli@ornek.org");
      // Varyantlar: Gmail noktası/+takma davetli sayılır.
      expect((await o.yeniTarayici().post("/giris/istek", { eposta: "aliveli+x@googlemail.com" })).durum).toBe(202);
      await o.hizmet.bosta();
      expect(await o.postaSayisi()).toBe(2);
      expect(o.hizmet.sayaclar.al("istek.davet_disi")).toBe(1);
      expect(o.hizmet.sayaclar.al("istek.kabul")).toBe(2);
      // Günlükte davetsiz adres de (maskelenmiş olarak da) yok.
      expect(JSON.stringify(o.gunluk)).not.toMatch(/zeta|z\*\*\*@/);
      // Biçim ve geçici alan denetimleri listeden bağımsızdır (listedeki adres sızmasın diye yanıt aynı).
      expect((await o.yeniTarayici().post("/giris/istek", { eposta: "bozuk" })).durum).toBe(422);
      expect((await o.yeniTarayici().post("/giris/istek", { eposta: "x@mailinator.com" })).durum).toBe(422);
    } finally {
      await o.kapat();
    }
  });

  it("davetli olmayan adres icin depoda baglanti kaydi ve hesap ACILMAZ; adres basina sinir kovasi tuketilmez", async () => {
    const o = await girisOrtami({ hizmet: { davetliler: DavetliListesi.metinden("davetli@ornek.org\n") } });
    try {
      for (let i = 0; i < 12; i++) await o.yeniTarayici().post("/giris/istek", { eposta: "davetsiz@ornek.org" });
      await o.hizmet.bosta();
      expect(await o.hesapDeposu.sayilar()).toEqual({ hesap: 0, oturum: 0, baglanti: 0 });
      expect(o.hizmet.sayaclar.al("istek.davet_disi")).toBe(12);
      expect(o.hizmet.sayaclar.al("istek.eposta_siniri")).toBe(0);
      expect(await o.postaSayisi()).toBe(0);
    } finally {
      await o.kapat();
    }
  });

  it("baglanti verildikten sonra listeden cikarilan adres onaylayamaz (baglanti_gecersiz); hesap acilmaz; listeye geri alininca yeni baglanti calisir", async () => {
    const dizin = await gecici();
    const yol = join(dizin, "davetli.txt");
    await writeFile(yol, "ali@ornek.org\n");
    const liste = DavetliListesi.dosyadan(yol);
    const o = await girisOrtami({ hizmet: { davetliler: liste } });
    try {
      const t = o.yeniTarayici();
      const { jeton } = await o.baglantiIste(t, "ali@ornek.org");
      await writeFile(yol, "baska@ornek.org\n");
      liste.yenile();
      const r = await t.post("/giris/onay", { j: jeton });
      expect(r.durum).toBe(400);
      expect(r.json?.kod).toBe("baglanti_gecersiz");
      expect(await o.hesapDeposu.hesapBulAnahtar("ali@ornek.org")).toBeNull();
      expect(o.hizmet.sayaclar.al("onay.davet_disi")).toBe(1);
      // Aynı bağlantı yeniden denenemez (tüketildi); listeye geri alınınca yeni bağlantı çalışır.
      await writeFile(yol, "baska@ornek.org\nali@ornek.org\n");
      liste.yenile();
      expect(await o.girisYap(o.yeniTarayici(), "ali@ornek.org")).toMatchObject({ yeniHesap: true });
    } finally {
      await o.kapat();
    }
  });

  it("liste verilmezse kapi ACIK (varsayilan): herkese posta gider", async () => {
    const o = await girisOrtami();
    try {
      expect(await o.girisYap(o.yeniTarayici(), "herhangi@ornek.org")).toMatchObject({ yeniHesap: true });
      expect(o.hizmet.sayaclar.al("istek.davet_disi")).toBe(0);
    } finally {
      await o.kapat();
    }
  });

  it("zaten acik oturum listeden cikarilmayla kapanmaz (kapi yalniz yeni girisi sinirlar)", async () => {
    const liste = DavetliListesi.metinden("ali@ornek.org\n");
    const o = await girisOrtami({ hizmet: { davetliler: liste } });
    try {
      const t = o.yeniTarayici();
      await o.girisYap(t, "ali@ornek.org");
      const bos = DavetliListesi.metinden("");
      expect(bos.uyeMi("ali@ornek.org")).toBe(false);
      expect((await t.istek("/giris/ben")).durum).toBe(200);
    } finally {
      await o.kapat();
    }
  });
});

interface Surec {
  p: ChildProcess;
  olaylar: Array<Record<string, unknown>>;
  ilk: Promise<Record<string, unknown>>;
  cikti: () => string;
}
function baslat(ortam: Record<string, string>, ...args: string[]): Surec {
  const p = spawn(process.execPath, ["--import", "tsx", CLI, ...args], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...ortam } });
  sureclar.push(p);
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
  ilk.catch(() => undefined);
  return { p, olaylar, ilk, cikti: () => tum };
}
const TEMEL = { BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_PARSEL: "1", BOLGE_DEPO: "bellek", BOLGE_ELLE_SAAT: "1", BOLGE_KIMLIK: "eposta" };
const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
async function postaBekle(dizin: string, adet: number, ms = 8_000): Promise<number> {
  const son = Date.now() + ms;
  let n = 0;
  while (Date.now() < son) {
    n = (await readdir(dizin).catch(() => [] as string[])).filter((x) => x.endsWith(".json")).length;
    if (n >= adet) return n;
    await bekle(50);
  }
  return n;
}

describe("CLI: --davetli-liste", () => {
  it("davetliye posta gider, davetsize gitmez (yanit ayni); SIGHUP listeyi yeniden okur; bozuk dosyada eski liste korunur; adres sureç ciktisinda yok", async () => {
    const d = await gecici();
    const liste = join(d, "davetli.txt");
    const posta = join(d, "posta");
    await writeFile(liste, "# alfa-0\nolan@ornek.org\n");
    const s = baslat({ ...TEMEL, BOLGE_POSTA_DIZIN: posta, BOLGE_DAVETLI_LISTE: liste });
    const hazir = await s.ilk;
    expect(hazir.olay).toBe("hazir");
    expect(hazir.davetli).toBe(1);
    const taban = `http://127.0.0.1:${hazir.port}`;
    const t = new Tarayici(taban, taban);
    const r1 = await t.post("/giris/istek", { eposta: "olan@ornek.org" });
    expect(await postaBekle(posta, 1)).toBe(1);
    const r2 = await new Tarayici(taban, taban).post("/giris/istek", { eposta: "olmayan@ornek.org" });
    expect(r2.durum).toBe(r1.durum);
    expect(r2.govde).toBe(r1.govde);
    await bekle(600);
    expect((await readdir(posta).catch(() => [] as string[])).filter((x) => x.endsWith(".json")).length).toBe(1);

    // SIGHUP: yeni adres eklenir (yeniden baslatmadan).
    await writeFile(liste, "olan@ornek.org\nolmayan@ornek.org\n");
    s.p.kill("SIGHUP");
    for (let i = 0; i < 100 && !s.olaylar.some((o) => o.olay === "davetliListeYenilendi"); i++) await bekle(50);
    expect(s.olaylar.find((o) => o.olay === "davetliListeYenilendi")).toMatchObject({ adet: 2 });
    await new Tarayici(taban, taban).post("/giris/istek", { eposta: "olmayan@ornek.org" });
    expect(await postaBekle(posta, 2)).toBe(2);

    // Bozuk dosya: uyarı, eski liste (2 adres) korunur.
    await writeFile(liste, "olan@ornek.org\nbozuk satir\n");
    s.p.kill("SIGHUP");
    for (let i = 0; i < 100 && !s.olaylar.some((o) => o.olay === "uyari" && String(o.mesaj).includes("yenilenemedi")); i++) await bekle(50);
    const uyari = s.olaylar.find((o) => o.olay === "uyari" && String(o.mesaj).includes("yenilenemedi"));
    expect(uyari).toBeDefined();
    expect(String(uyari?.mesaj)).toMatch(/satir 2/);
    await new Tarayici(taban, taban).post("/giris/istek", { eposta: "olmayan@ornek.org" });
    expect(await postaBekle(posta, 3)).toBe(3); // hala davetli

    expect(s.cikti()).not.toMatch(/olan@|olmayan@/); // günlükte tam adres yok (G5 maskeli gönderim kaydı kalır)
    const mektuplar = await Promise.all((await readdir(posta)).filter((x) => x.endsWith(".json")).map(async (x) => JSON.parse(await readFile(join(posta, x), "utf8")) as { kime: string }));
    expect(mektuplar.every((m) => m.kime === "olan@ornek.org" || m.kime === "olmayan@ornek.org")).toBe(true);
  }, 120_000);

  it("liste yok / bozuk ise acilis durur; gelistirme kimligiyle birlikte verilemez; bozuk satir hatasinda adres yok", async () => {
    const d = await gecici();
    const hata = async (ortam: Record<string, string>, ...args: string[]): Promise<{ hata: string; cikti: string }> => {
      const s = baslat(ortam, ...args);
      const o = await s.ilk;
      expect(o.olay).toBe("olumcul");
      return { hata: String(o.hata), cikti: s.cikti() };
    };
    expect((await hata({ ...TEMEL, BOLGE_DAVETLI_LISTE: join(d, "yok.txt") })).hata).toMatch(/davetli listesi okunamadi/);
    const bozuk = join(d, "bozuk.txt");
    await writeFile(bozuk, "iyi@ornek.org\nsakli-ad@@ornek.org\n");
    const b = await hata({ ...TEMEL, BOLGE_DAVETLI_LISTE: bozuk });
    expect(b.hata).toMatch(/satir 2/);
    expect(b.cikti).not.toContain("sakli-ad");
    expect((await hata({ ...TEMEL, BOLGE_KIMLIK: "gelistirme", BOLGE_DAVETLI_LISTE: bozuk })).hata).toMatch(/yalniz --kimlik eposta/);
  }, 120_000);
});

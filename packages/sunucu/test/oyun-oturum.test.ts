/**
 * Oyun bağlantısı oturum olay kaydı (İ2): depo sözleşmesi (bellek ve dosya; pg: test/pg.test.ts), dosyaya özgü dayanıklılık, `OturumKaydedici` kuralları
 * (kopup yeniden bağlanma, çok sekme, bayat açık satır, hata yalıtımı), sunucuya bağlı uçtan uca ws akışı ve KVKK (yalnız zaman ve opak kimlik).
 */
import { spawn } from "node:child_process";
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { BellekOyunOturumDeposu } from "../src/depo/bellek";
import { dosyaDeposu, DosyaOyunOturumDeposu } from "../src/depo/dosya";
import type { OyunOturumDeposu } from "../src/depo/tipler";
import { OturumKaydedici, VARSAYILAN_OTURUM_BOSLUGU_MS } from "../src/oturum-kaydi";
import { oyunOturumSozlesmesi } from "./oyun-oturum-sozlesmesi";
import { SunucuIstemcisi } from "../src/istemci";
import { SIR, testSunucusu, token } from "./yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const dizinler: string[] = [];
afterEach(async () => {
  for (const d of dizinler.splice(0)) await rm(d, { recursive: true, force: true });
});
async function geciciDizin(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "bolge-oturum-"));
  dizinler.push(d);
  return d;
}

describe("oyun oturumu deposu sozlesmesi", () => {
  it("bellek", async () => {
    await oyunOturumSozlesmesi(new BellekOyunOturumDeposu(), new BellekOyunOturumDeposu());
  });

  it("dosya", async () => {
    const d = await geciciDizin();
    const depo = await DosyaOyunOturumDeposu.ac(d);
    try {
      await oyunOturumSozlesmesi(depo);
    } finally {
      await depo.kapat();
    }
  });

  it("dosya deposu (dosyaDeposu uzerinden) acik gelir", async () => {
    const d = await geciciDizin();
    const depo = await dosyaDeposu(d);
    try {
      expect(depo.oyunOturumu).toBeDefined();
      await oyunOturumSozlesmesi(depo.oyunOturumu as OyunOturumDeposu);
    } finally {
      await depo.gunluk.kapat();
    }
  });
});

describe("dosya oyun oturumu deposu", () => {
  it("yeniden acilista kalici: acik ve kapali oturumlar ve toplu sayilar", async () => {
    const d = await geciciDizin();
    const a = await DosyaOyunOturumDeposu.ac(d);
    const k1 = await a.ac("ali", 1_000);
    await a.kapanisYaz(k1.id, 2_000);
    const k2 = await a.ac("veli", 3_000);
    const eski = await a.ac("ali", 5);
    await a.kapanisYaz(eski.id, 105);
    await a.kapat();

    const b = await DosyaOyunOturumDeposu.ac(d);
    expect((await b.oku()).map((o) => [o.id, o.oyuncu, o.acilis, o.kapanis])).toEqual([
      [eski.id, "ali", 5, 105],
      [k1.id, "ali", 1_000, 2_000],
      [k2.id, "veli", 3_000, null],
    ]);
    await b.toplulastir(200 * 86_400_000); // kesim 110. gün: hepsi gün 0'a ait
    await b.kapat();

    const c = await DosyaOyunOturumDeposu.ac(d);
    expect(await c.oku()).toEqual([]);
    expect(await c.gunlukSayilar()).toEqual([{ gun: 0, oturum: 3, oyuncu: 2, sureMs: 1_000 + 100 }]);
    const yeni = await c.ac("ali", 300 * 86_400_000);
    expect((await c.oku()).map((o) => o.id)).toEqual([yeni.id]);
    await c.kapat();
  });

  it("cokmeden kalan yarim son satir atilir; ortadaki bozuk satir acilisi durdurur; satirlarda e-posta, IP, cihaz alani yok", async () => {
    const d = await geciciDizin();
    const a = await DosyaOyunOturumDeposu.ac(d);
    const k = await a.ac("o_abcdef12", 1_000);
    await a.kapanisYaz(k.id, 9_000);
    await a.kapat();
    const yol = join(d, "oyun-oturum.jsonl");
    const metin = await readFile(yol, "utf8");
    // KVKK: yalnız kimlik, açılış ve kapanış (opak oyuncu kimliği); başka alan yok.
    for (const satir of metin.trim().split("\n")) {
      const o = JSON.parse(satir) as { o: string; k?: Record<string, unknown>; id?: number; t?: number };
      if (o.k) expect(Object.keys(o.k).sort()).toEqual(["acilis", "id", "kapanis", "oyuncu"]);
    }
    expect(metin).not.toMatch(/@|ip|cihaz|agent/i);
    await appendFile(yol, '{"o":"a","k":{"id":99,"oyuncu":"yarim"'); // satır sonu yok
    const b = await DosyaOyunOturumDeposu.ac(d);
    expect((await b.oku()).map((o) => o.oyuncu)).toEqual(["o_abcdef12"]);
    await b.ac("o_ikinci", 20_000); // sonraki ekleme temiz satıra yazılır
    await b.kapat();
    const c = await DosyaOyunOturumDeposu.ac(d);
    expect((await c.oku()).map((o) => o.oyuncu)).toEqual(["o_abcdef12", "o_ikinci"]);
    await c.kapat();

    const satirlar = (await readFile(yol, "utf8")).split("\n");
    satirlar.splice(1, 0, "{bozuk");
    await writeFile(yol, satirlar.join("\n"));
    await expect(DosyaOyunOturumDeposu.ac(d)).rejects.toThrow(/bozuk JSON/);
  });

  it("cok islemden sonra sikistirilir ve durum ayni kalir", async () => {
    const d = await geciciDizin();
    const a = await DosyaOyunOturumDeposu.ac(d);
    for (let i = 0; i < 1500; i++) {
      const o = await a.ac("ali", 10_000 + i);
      await a.kapanisYaz(o.id, 10_001 + i);
    }
    const once = await a.oku();
    await a.kapat();
    const satirOnce = (await readFile(join(d, "oyun-oturum.jsonl"), "utf8")).trim().split("\n").length;
    expect(satirOnce).toBe(3000);
    const b = await DosyaOyunOturumDeposu.ac(d);
    expect(await b.oku()).toEqual(once);
    await b.kapat();
  });
});

describe("OturumKaydedici (sahte saat)", () => {
  function kur(boslukMs?: number) {
    const depo = new BellekOyunOturumDeposu();
    let t = 1_000_000;
    const hatalar: string[] = [];
    const k = new OturumKaydedici({ depo, simdi: () => t, hata: (m) => hatalar.push(m), ...(boslukMs !== undefined ? { boslukMs } : {}) });
    return { depo, k, hatalar, saat: { ilerlet: (ms: number) => void (t += ms), simdi: () => t } };
  }

  it("ilk baglanti oturumu acar, son baglanti kapatir; sure kapanis - acilis", async () => {
    const { depo, k, saat } = kur();
    expect(await k.ac("ali")).toBe("yeni");
    saat.ilerlet(90_000);
    await k.kapat("ali");
    expect(await depo.oku()).toEqual([{ id: 1, oyuncu: "ali", acilis: 1_000_000, kapanis: 1_090_000 }]);
  });

  it("bosluk icinde yeniden baglanma AYNI oturumdur (kapanis geri alinir); bosluktan sonra YENI oturum", async () => {
    const { depo, k, saat } = kur();
    await k.ac("ali");
    saat.ilerlet(60_000);
    await k.kapat("ali");
    saat.ilerlet(VARSAYILAN_OTURUM_BOSLUGU_MS - 1_000); // boşlukta
    expect(await k.ac("ali")).toBe("yenidenAcildi");
    expect(await depo.oku()).toEqual([{ id: 1, oyuncu: "ali", acilis: 1_000_000, kapanis: null }]);
    saat.ilerlet(30_000);
    await k.kapat("ali");
    expect((await depo.oku())[0]?.kapanis).toBe(1_000_000 + 60_000 + VARSAYILAN_OTURUM_BOSLUGU_MS - 1_000 + 30_000);
    saat.ilerlet(VARSAYILAN_OTURUM_BOSLUGU_MS + 1); // boşluğu aştı
    expect(await k.ac("ali")).toBe("yeni");
    expect((await depo.oku()).length).toBe(2);
  });

  it("bosluk ayarlanabilir; tam sinirda ayni oturum sayilir", async () => {
    const { depo, k, saat } = kur(10_000);
    await k.ac("ali");
    await k.kapat("ali");
    saat.ilerlet(10_000);
    expect(await k.ac("ali")).toBe("yenidenAcildi");
    await k.kapat("ali");
    saat.ilerlet(10_001);
    expect(await k.ac("ali")).toBe("yeni");
    expect((await depo.oku()).length).toBe(2);
  });

  it("acik oturumda ikinci ac devam sayilir (cok sekme tek oturum); kapat yalniz bir kez yazar", async () => {
    const { depo, k, saat } = kur();
    await k.ac("ali");
    expect(await k.ac("ali")).toBe("devam");
    saat.ilerlet(5_000);
    await k.kapat("ali");
    saat.ilerlet(5_000);
    await k.kapat("ali"); // ikinci kapanış yok sayılır
    expect(await depo.oku()).toEqual([{ id: 1, oyuncu: "ali", acilis: 1_000_000, kapanis: 1_005_000 }]);
  });

  it("onceki surecin acik biraktigi satir (ani olum) kapanis=acilis ile kapatilir ve yeni oturum acilir; bosluk icinde bile yeniden acilmaz", async () => {
    const { depo, k, saat } = kur();
    await depo.ac("ali", 999_000); // önceki süreç: açık satır
    saat.ilerlet(10);
    expect(await k.ac("ali")).toBe("yeni");
    expect(await depo.oku()).toEqual([
      { id: 1, oyuncu: "ali", acilis: 999_000, kapanis: 999_000 },
      { id: 2, oyuncu: "ali", acilis: 1_000_010, kapanis: null },
    ]);
  });

  it("farkli oyuncular birbirini etkilemez; hepsiniKapat acik olanlari kapatir", async () => {
    const { depo, k, saat } = kur();
    await k.ac("ali");
    await k.ac("veli");
    saat.ilerlet(1_000);
    await k.kapat("ali");
    saat.ilerlet(1_000);
    await k.hepsiniKapat();
    expect((await depo.oku()).map((o) => [o.oyuncu, o.kapanis])).toEqual([["ali", 1_001_000], ["veli", 1_002_000]]);
  });

  it("depo hatasi oyunu etkilemez: istek reddedilmez, hata kancasi ayrinti (kimlik) icermeyen ileti alir; sonraki cagrilar calisir", async () => {
    const depo = new BellekOyunOturumDeposu();
    let bozuk = true;
    const asil = depo.ac.bind(depo);
    depo.ac = async (o, t) => {
      if (bozuk) throw new Error("disk dolu o_gizli");
      return asil(o, t);
    };
    const hatalar: string[] = [];
    const k = new OturumKaydedici({ depo, hata: (m) => hatalar.push(m) });
    await expect(k.ac("o_gizli")).resolves.toBeUndefined();
    expect(hatalar).toEqual(["oyun oturumu kaydi yazilamadi"]);
    expect(hatalar.join()).not.toContain("o_gizli");
    bozuk = false;
    expect(await k.ac("o_gizli")).toBe("yeni"); // yazılamayan açılış "açık" sayılmaz: sonraki bağlantı yeniden dener
    expect(await k.ac("veli")).toBe("yeni");
    expect((await depo.oku()).map((o) => o.oyuncu)).toEqual(["o_gizli", "veli"]);
  });

  it("bakim 90 gunu gecen ayrintiyi gun duzeyinde topluya cevirir", async () => {
    const { depo, k, saat } = kur();
    await k.ac("ali");
    await k.kapat("ali");
    saat.ilerlet(95 * 86_400_000);
    expect(await k.bakim()).toBe(1);
    expect(await depo.oku()).toEqual([]);
    expect((await depo.gunlukSayilar()).length).toBe(1);
  });
});

describe("sunucuya bagli (ws)", () => {
  it("ilk baglanti oturum acar, ikinci sekme ayni oturum, son kapanista kapanir; kopup yeniden baglanma ayni oturum; varsayilan kapali", async () => {
    let t = 5_000_000;
    const depo = new BellekOyunOturumDeposu();
    const kayit = new OturumKaydedici({ depo, simdi: () => t });
    const s = await testSunucusu({ sunucu: { oturumKaydi: kayit } });
    try {
      const a1 = await s.baglan("ali", "sekme-1");
      await kayit.bosta();
      expect((await depo.oku()).map((o) => [o.oyuncu, o.acilis, o.kapanis])).toEqual([["ali", 5_000_000, null]]);
      const a2 = await s.baglan("ali", "sekme-2");
      await kayit.bosta();
      expect((await depo.oku()).length).toBe(1); // çok sekme tek oturum
      t += 20_000;
      await a1.kapat();
      await new Promise((r) => setTimeout(r, 100));
      await kayit.bosta();
      expect((await depo.oku())[0]?.kapanis).toBeNull(); // ikinci sekme açık
      t += 20_000;
      await a2.kapat();
      await new Promise((r) => setTimeout(r, 100));
      await kayit.bosta();
      expect((await depo.oku()).map((o) => o.kapanis)).toEqual([5_040_000]);
      // Kopup yeniden bağlanma (boşluk içinde): aynı oturum yeniden açılır.
      t += 30_000;
      const a3 = await s.baglan("ali", "sekme-3");
      await kayit.bosta();
      expect((await depo.oku()).map((o) => o.kapanis)).toEqual([null]);
      // Sunucu kapanırken açık oturumlar kapanır.
      t += 1_000;
      await a3.kapat();
    } finally {
      await s.kapat();
    }
    await kayit.bosta();
    expect((await depo.oku()).map((o) => o.kapanis)).toEqual([5_071_000]);
  });

  it("oturumKaydi verilmezse hicbir sey yazilmaz (varsayilan kapali)", async () => {
    const s = await testSunucusu();
    try {
      await s.baglan("ali");
      expect(await s.depo.oyunOturumu.oku()).toEqual([]);
    } finally {
      await s.kapat();
    }
  });

  it("sunucu kapanirken bagli oyuncunun oturumu kapatilir", async () => {
    const depo = new BellekOyunOturumDeposu();
    const kayit = new OturumKaydedici({ depo });
    const s = await testSunucusu({ sunucu: { oturumKaydi: kayit } });
    await s.baglan("ali");
    await s.baglan("veli");
    await kayit.bosta();
    expect((await depo.oku()).every((o) => o.kapanis === null)).toBe(true);
    await s.kapat();
    await kayit.bosta();
    const o = await depo.oku();
    expect(o.length).toBe(2);
    expect(o.every((x) => x.kapanis !== null)).toBe(true);
  });
});

describe("CLI (--oturum-kaydi, gercek surec)", () => {
  async function kos(oturumKaydi: boolean): Promise<string> {
    const d = await geciciDizin();
    const args = ["--import", "tsx", CLI, "--port", "0", "--harita", "mini", "--depo", "dosya", "--dizin", d, "--elle-saat", "--gelistirme-sirri", SIR, "--goruntu-isci", "0", ...(oturumKaydi ? ["--oturum-kaydi", "1", "--oturum-bosluk-dk", "1"] : [])];
    const p = spawn(process.execPath, args, { cwd: KOK, stdio: ["ignore", "pipe", "pipe"] });
    try {
      const port = await new Promise<number>((coz, reddet) => {
        let tampon = "";
        p.stdout?.on("data", (b: Buffer) => {
          tampon += b.toString();
          for (const satir of tampon.split("\n")) {
            if (!satir.startsWith("{")) continue;
            const o = JSON.parse(satir) as { olay: string; port?: number; hata?: string };
            if (o.olay === "hazir") coz(o.port as number);
            if (o.olay === "olumcul") reddet(new Error(o.hata));
          }
        });
        p.once("exit", (k) => reddet(new Error(`cikis ${k}`)));
      });
      const i = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${port}`, token("o_cli00001"), "cli-sekme");
      await new Promise((r) => setTimeout(r, 300));
      await i.kapat();
      await new Promise((r) => setTimeout(r, 300));
    } finally {
      const bitti = new Promise<void>((coz) => p.once("exit", () => coz()));
      p.kill("SIGTERM");
      await bitti;
    }
    return readFile(join(d, "oyun-oturum.jsonl"), "utf8");
  }

  it("--oturum-kaydi 1: baglanti oturum satiri yazar (acilis + kapanis, yalniz opak kimlik); varsayilan kapali: dosya bos", async () => {
    const acik = (await kos(true)).trim().split("\n").map((s) => JSON.parse(s) as { o: string; k?: { oyuncu: string; acilis: number; kapanis: number | null }; id?: number; t?: number });
    expect(acik[0]?.o).toBe("a");
    expect(acik[0]?.k?.oyuncu).toBe("o_cli00001");
    expect(acik.some((x) => x.o === "k" && typeof x.t === "number")).toBe(true);
    expect(await kos(false)).toBe("");
  }, 60_000);
});

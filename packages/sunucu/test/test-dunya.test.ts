/**
 * Test dünyası silme/sayım (İ3) ve depo dökümü (İ1 desteği), dosya deposu ve CLI: önek koruması, çalışan yazar reddi, salt okunur döküm
 * (kaynağa dokunmaz, kilitsiz), dökümden açılan dünyanın `durumOzeti`'nin kaynakla aynı olması. pg sürümü: test/pg.test.ts (BOLGE_PG_URL ile).
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { dosyaDeposu, dosyaSaltOkunur } from "../src/depo/dosya";
import { depoyuDok } from "../src/dok";
import { ElleSaat } from "../src/saat";
import { dosyaTestDunyasiSay, dosyaTestDunyasiSil, onekDenetle, pgTestDunyasiSil, silmeyiDenetle, testDunyaAdiniDenetle } from "../src/test-dunya";
import type { SilmeDenetimi } from "../src/test-dunya";
import { DunyaYazari } from "../src/yazar";
import { KUZEY, veri } from "./yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const dizinler: string[] = [];
afterEach(async () => {
  for (const d of dizinler.splice(0)) await rm(d, { recursive: true, force: true });
});
/** `ad` ile başlayan geçici dizin (test dünyası dizini adı test önekiyle başlamalı). */
async function geciciDizin(ad: string): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), ad));
  dizinler.push(d);
  return d;
}

/** Dosya deposunda küçük bir dünya oynatır (katılım, tesis, vergi; 5 sim-saat; kapanış görüntüsü) ve özetini döner. */
async function dunyaOynat(dizin: string): Promise<{ durumOzeti: string; seq: number }> {
  const depo = await dosyaDeposu(dizin);
  const saat = new ElleSaat();
  const y = await DunyaYazari.ac({ veri: veri(), tohum: 4, depo, saat, goruntuAraligiMs: 3 * SAAT, commitAraligiMs: 5 });
  const p = [
    y.komutGonder(SISTEM_OYUNCUSU, "t", "k", { tur: "oyuncu_katil", oyuncu: "o_ali00001", bolgeler: KUZEY }),
    y.komutGonder("o_ali00001", "t", "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }),
  ];
  await y.birTur();
  saat.ilerlet(5 * SAAT);
  await y.birTur();
  p.push(y.komutGonder("o_ali00001", "t", "b", { tur: "vergi_ayarla", oranPpm: 120_000 }));
  await y.birTur();
  await Promise.all(p);
  const o = y.ozet();
  await y.kapat();
  await depo.gunluk.kapat();
  return { durumOzeti: o.durumOzeti, seq: o.seq };
}

describe("test dunyasi adi korumasi", () => {
  it("test onekiyle baslamayan dunya reddedilir (paylasilan dunya silinmez)", () => {
    for (const ad of ["ana", "", "prod-test", "Test1"]) expect(() => testDunyaAdiniDenetle(ad), ad).toThrow(/reddedildi/);
    expect(() => testDunyaAdiniDenetle("test-1")).not.toThrow();
    expect(() => testDunyaAdiniDenetle("deneme-1", "deneme")).not.toThrow(); // önek ayarlanabilir (BOLGE_TEST_DUNYA_ONEKI), ama bilinçli
  });

  it("bos ya da kisa onek reddedilir (her adi kapsamasin); ana hicbir onekle silinemez", () => {
    for (const onek of ["", "t", "te"]) {
      expect(() => testDunyaAdiniDenetle("test-1", onek), `onek "${onek}"`).toThrow(/en az 3 karakter/);
      expect(() => onekDenetle(onek, "hesap oneki")).toThrow(/en az 3 karakter/);
    }
    expect(() => testDunyaAdiniDenetle("ana", "ana")).toThrow(/hicbir onekle/);
    expect(() => testDunyaAdiniDenetle("ana", "an")).toThrow(); // kisa onek
    expect(() => onekDenetle("pgh", "hesap oneki")).not.toThrow();
  });

  const temel: SilmeDenetimi = { dunya: "test-1", onek: "test", canliDunya: "ana", uretim: false };
  it("silmeyiDenetle: hesap oneki >= 3; canli (CLI --dunya) dunya ve varsayilan dizin silinemez; uretimde adin ikinci kez yazilmasi sart", () => {
    expect(() => silmeyiDenetle(temel)).not.toThrow();
    expect(() => silmeyiDenetle({ ...temel, hesapOneki: "" })).toThrow(/hesap oneki/);
    expect(() => silmeyiDenetle({ ...temel, hesapOneki: "ab" })).toThrow(/hesap oneki/);
    expect(() => silmeyiDenetle({ ...temel, hesapOneki: "pgh" })).not.toThrow();
    expect(() => silmeyiDenetle({ ...temel, canliDunya: "test-1" })).toThrow(/canli dunyasi/); // BOLGE_DUNYA=test-1
    expect(() => silmeyiDenetle({ ...temel, dunya: "ana", onek: "ana" })).toThrow(/hicbir onekle/);
    expect(() => silmeyiDenetle({ ...temel, dizin: "/x/raporlar/dunya", varsayilanDizin: "/x/raporlar/dunya" })).toThrow(/varsayilan dosya dizini/);
    expect(() => silmeyiDenetle({ ...temel, dizin: "/x/test-a", varsayilanDizin: "/x/raporlar/dunya" })).not.toThrow();
    expect(() => silmeyiDenetle({ ...temel, uretim: true })).toThrow(/ikinci kez/);
    expect(() => silmeyiDenetle({ ...temel, uretim: true, onay: "test-2" })).toThrow(/ikinci kez/);
    expect(() => silmeyiDenetle({ ...temel, uretim: true, onay: "test-1" })).not.toThrow();
  });

  it("pg silme kutuphanesi baglanmadan once boş hesap onekini ve ana'yi reddeder", async () => {
    await expect(pgTestDunyasiSil("postgres://yok.invalid/x", { dunya: "test-1", hesapOneki: "" })).rejects.toThrow(/hesap oneki/);
    await expect(pgTestDunyasiSil("postgres://yok.invalid/x", { dunya: "ana", onek: "ana" })).rejects.toThrow(/hicbir onekle/);
    await expect(pgTestDunyasiSil("postgres://yok.invalid/x", { dunya: "test-1", onek: "" })).rejects.toThrow(/en az 3 karakter/);
  });
});

describe("dosya deposu: test dunyasi silme ve sayim", () => {
  it("dunyayi tek komutla siler, tablo tablo sayim 0 verir; baska dosyaya dokunmaz", async () => {
    const d = await geciciDizin("test-dunya-");
    await dunyaOynat(d);
    await writeFile(join(d, "notlarim.txt"), "dokunma");
    const once = await dosyaTestDunyasiSay(d, "test-a");
    expect(once.kalan["gunluk.jsonl"]).toBeGreaterThan(0);
    expect(once.kalan["goruntu"]).toBeGreaterThan(0);
    expect(once.toplam).toBeGreaterThan(0);

    const rapor = await dosyaTestDunyasiSil(d, { dunya: "test-a" });
    expect(rapor.depo).toBe("dosya");
    expect(rapor.silinen["gunluk.jsonl"]).toBe(once.kalan["gunluk.jsonl"]);
    expect(rapor.oyuncular).toContain("o_ali00001");
    expect(rapor.toplam).toBe(once.toplam);

    const sonra = await dosyaTestDunyasiSay(d, "test-a");
    expect(sonra.toplam).toBe(0);
    expect(Object.values(sonra.kalan).every((n) => n === 0)).toBe(true);
    expect((await readdir(d)).filter((x) => x !== "yazar.kilit" && x !== "notlarim.txt")).toEqual([]);
    expect(await readFile(join(d, "notlarim.txt"), "utf8")).toBe("dokunma");
    expect(rapor.dizinSilindi).toBe(false); // başka dosya var: dizin KORUNUR
  });

  it("silmeden sonra BOS kalan test dunyasi dizini de silinir (kilit dosyasi dahil); icinde baska dosya ya da alt dizin varsa dizin korunur; ikinci silme ve sayim olmayan dizinde 0", async () => {
    const d = await geciciDizin("test-dizin-");
    await dunyaOynat(d);
    const rapor = await dosyaTestDunyasiSil(d, { dunya: "test-dizin" });
    expect(rapor.dizinSilindi).toBe(true);
    expect(await stat(d).catch(() => null)).toBeNull(); // dizin yok
    expect((await dosyaTestDunyasiSay(d, "test-dizin")).toplam).toBe(0);
    // Alt dizin (goruntu disinda) kalirsa dizin silinmez.
    const e = await geciciDizin("test-dizin2-");
    await dunyaOynat(e);
    await mkdir(join(e, "elle-konan"));
    expect((await dosyaTestDunyasiSil(e, { dunya: "test-dizin2" })).dizinSilindi).toBe(false);
    expect(await stat(join(e, "elle-konan")).then(() => true, () => false)).toBe(true);
    // Yazar kilidi tutuluyorsa (baska surec) hicbir sey silinmez, dizin de yerinde kalir.
    const f = await geciciDizin("test-dizin3-");
    await dunyaOynat(f);
    await writeFile(join(f, "yazar.kilit"), String(process.ppid));
    await expect(dosyaTestDunyasiSil(f, { dunya: "test-dizin3" })).rejects.toThrow(/kilitli/);
    expect(await stat(f).then(() => true, () => false)).toBe(true);
  });

  it("dizin adi test onekiyle baslamiyorsa ya da dunya adi paylasilansa reddeder; dosyalar yerinde kalir", async () => {
    const d = await geciciDizin("paylasilan-");
    await dunyaOynat(d);
    await expect(dosyaTestDunyasiSil(d, { dunya: "test-a" })).rejects.toThrow(/dizin adi/);
    const t = await geciciDizin("test-x-");
    await expect(dosyaTestDunyasiSil(t, { dunya: "ana" })).rejects.toThrow(/hicbir onekle/);
    await expect(dosyaTestDunyasiSil(t, { dunya: "baska" })).rejects.toThrow(/dunya adi/);
    expect((await dosyaTestDunyasiSay(d, "x")).toplam).toBeGreaterThan(0);
  });

  it("dunyanin yazari aciksa (baska surecin kilidi) reddeder; kilit kalkinca siler", async () => {
    const d = await geciciDizin("test-kilit-");
    const depo = await dosyaDeposu(d);
    await depo.gunluk.ekle([{ seq: 1, t: 0, oyuncu: "o_ali", komut: { tur: "vergi_ayarla", oranPpm: 1 }, istemci: "i", anahtar: "a", kuralSurumu: "k", semaSurumu: 1 }]);
    await depo.gunluk.kapat();
    // Kilit dosyası yaşayan BAŞKA bir sürece (üst süreç) aittir: yazar açık sayılır. (Aynı sürecin kilidi yeniden açılış için devralınabilir.)
    await writeFile(join(d, "yazar.kilit"), String(process.ppid));
    await expect(dosyaTestDunyasiSil(d, { dunya: "test-kilit" })).rejects.toThrow(/kilitli/);
    expect((await dosyaTestDunyasiSay(d, "test-kilit")).kalan["gunluk.jsonl"]).toBe(1);
    await rm(join(d, "yazar.kilit"));
    expect((await dosyaTestDunyasiSil(d, { dunya: "test-kilit" })).toplam).toBeGreaterThan(0);
  });

  it("dosya silme: bos onek ve varsayilan dizin (raporlar/dunya) reddedilir", async () => {
    const d = await geciciDizin("test-onek-");
    await expect(dosyaTestDunyasiSil(d, { dunya: "test-onek", onek: "" })).rejects.toThrow(/en az 3 karakter/);
    await expect(dosyaTestDunyasiSil("raporlar/dunya", { dunya: "test-1" })).rejects.toThrow(/dizin adi|varsayilan/);
  });

  it("olmayan dizin: sayim 0", async () => {
    const s = await dosyaTestDunyasiSay(join(tmpdir(), "test-yok-dizin-xyz"), "test-yok");
    expect(s.toplam).toBe(0);
  });
});

describe("depo dokumu (--dok)", () => {
  it("dosya kaynagi: dokulen dizinden acilan dunya kaynakla ayni durumOzeti'ni verir; kaynaga dokunulmaz", async () => {
    const a = await geciciDizin("kaynak-");
    const b = await geciciDizin("hedef-");
    const beklenen = await dunyaOynat(a);
    const oncesi = new Map<string, string>();
    for (const ad of await readdir(a)) if (ad.endsWith(".jsonl")) oncesi.set(ad, await readFile(join(a, ad), "utf8"));

    const sonuc = await depoyuDok(await dosyaSaltOkunur(a), b, 2); // küçük parça: sayfalama
    expect(sonuc.kayit).toBeGreaterThan(2);
    expect(sonuc.sonSeq).toBe(sonuc.kayit);
    expect(sonuc.goruntuSeq).not.toBeNull();

    const depo = await dosyaDeposu(b);
    try {
      const y = await DunyaYazari.ac({ veri: veri(), tohum: 999, depo, saat: new ElleSaat(), goruntuAraligiMs: 1e12 });
      expect(y.ozet().durumOzeti).toBe(beklenen.durumOzeti);
      expect(y.ozet().seq).toBe(beklenen.seq);
    } finally {
      await depo.gunluk.kapat();
    }
    for (const [ad, icerik] of oncesi) expect(await readFile(join(a, ad), "utf8"), ad).toBe(icerik);
  });

  it("kaynak dizinin yazari ACIKKEN de dokulur (kilit alinmaz); yarim son satir yok sayilir", async () => {
    const a = await geciciDizin("kaynak-");
    const b = await geciciDizin("hedef-");
    const depo = await dosyaDeposu(a); // yazar kilidi tutuluyor
    try {
      await depo.gunluk.ekle([
        { seq: 1, t: 0, oyuncu: "o_ali", komut: { tur: "vergi_ayarla", oranPpm: 1 }, istemci: "i", anahtar: "a1", kuralSurumu: "k", semaSurumu: 1 },
        { seq: 2, t: 1, oyuncu: "o_ali", komut: { tur: "vergi_ayarla", oranPpm: 2 }, istemci: "i", anahtar: "a2", kuralSurumu: "k", semaSurumu: 1 },
      ]);
      await writeFile(join(a, "gunluk.jsonl"), (await readFile(join(a, "gunluk.jsonl"), "utf8")) + '{"seq":3,"t":2,"oyuncu":"yar'); // yazma sırasında yarım satır
      const sonuc = await depoyuDok(await dosyaSaltOkunur(a), b);
      expect(sonuc).toEqual({ kayit: 2, sonSeq: 2, goruntuSeq: null });
    } finally {
      await depo.gunluk.kapat();
    }
  });

  it("bos olmayan hedef reddedilir; yeniden kosulursa uzerine yazilmaz", async () => {
    const a = await geciciDizin("kaynak-");
    const b = await geciciDizin("hedef-");
    await dunyaOynat(a);
    await depoyuDok(await dosyaSaltOkunur(a), b);
    await expect(depoyuDok(await dosyaSaltOkunur(a), b)).rejects.toThrow(/bos degil/);
  });
});

describe("CLI", () => {
  function cli(...args: string[]): { kod: number | null; olaylar: Array<Record<string, unknown>>; cikti: string } {
    const r = spawnSync(process.execPath, ["--import", "tsx", CLI, ...args], { cwd: KOK, encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" }, timeout: 60_000 });
    const olaylar = r.stdout.split("\n").filter((s) => s.startsWith("{")).map((s) => JSON.parse(s) as Record<string, unknown>);
    return { kod: r.status, olaylar, cikti: r.stdout + r.stderr };
  }

  it("--test-dunya-sil/--test-dunya-say (dosya): once sayim, silme raporu, sonra sayim 0; paylasilan ad ve dizin reddedilir (cikis kodu 1)", async () => {
    const d = await geciciDizin("test-cli-");
    await dunyaOynat(d);
    const once = cli("--depo", "dosya", "--dizin", d, "--test-dunya-say", "test-cli");
    expect(once.kod).toBe(0);
    expect((once.olaylar[0] as { toplam: number }).toplam).toBeGreaterThan(0);

    const ana = cli("--depo", "dosya", "--dizin", d, "--test-dunya-sil", "ana");
    expect(ana.kod).toBe(1);
    expect(ana.cikti).toMatch(/reddedildi/);
    expect((await stat(join(d, "gunluk.jsonl"))).size).toBeGreaterThan(0);

    const sil = cli("--depo", "dosya", "--dizin", d, "--test-dunya-sil", "test-cli");
    expect(sil.kod).toBe(0);
    expect(sil.olaylar[0]).toMatchObject({ olay: "testDunyaSilindi", dunya: "test-cli", depo: "dosya" });
    const sonra = cli("--depo", "dosya", "--dizin", d, "--test-dunya-say", "test-cli");
    expect((sonra.olaylar[0] as { toplam: number }).toplam).toBe(0);

    const paylasilan = await geciciDizin("ana-dunya-");
    await dunyaOynat(paylasilan);
    expect(cli("--depo", "dosya", "--dizin", paylasilan, "--test-dunya-sil", "test-cli").kod).toBe(1); // dizin adi test onekli degil
    expect((await stat(join(paylasilan, "gunluk.jsonl"))).size).toBeGreaterThan(0);
  });

  it("--dok DIZIN (dosya kaynagi): dokulur ve cikar; hedef bos degilse kod 1", async () => {
    const a = await geciciDizin("kaynak-");
    const b = await geciciDizin("hedef-");
    await mkdir(b, { recursive: true });
    const beklenen = await dunyaOynat(a);
    const r = cli("--depo", "dosya", "--dizin", a, "--dok", b);
    expect(r.kod).toBe(0);
    expect(r.olaylar[0]).toMatchObject({ olay: "dokuldu", kayit: beklenen.seq, sonSeq: beklenen.seq });
    expect(cli("--depo", "dosya", "--dizin", a, "--dok", b).kod).toBe(1);
  });

  function cliEnv(ortam: Record<string, string>, ...args: string[]): { kod: number | null; olaylar: Array<Record<string, unknown>>; cikti: string } {
    const r = spawnSync(process.execPath, ["--import", "tsx", CLI, ...args], { cwd: KOK, encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...ortam }, timeout: 60_000 });
    return { kod: r.status, olaylar: r.stdout.split("\n").filter((x) => x.startsWith("{")).map((x) => JSON.parse(x) as Record<string, unknown>), cikti: r.stdout + r.stderr };
  }

  it("silme sertlestirmesi: bos/kisa onek, ana, canli dunya, varsayilan dizin ve --uretim'de onaysiz silme reddedilir (cikis 1) ve HICBIR SEY silinmez; onayla calisir", async () => {
    const d = await geciciDizin("test-sert-");
    await dunyaOynat(d);
    const boyut = async (): Promise<number> => (await stat(join(d, "gunluk.jsonl"))).size;
    const once = await boyut();
    const reddet = (r: { kod: number | null; cikti: string }, desen: RegExp): void => {
      expect(r.kod, r.cikti).toBe(1);
      expect(r.cikti).toMatch(desen);
    };
    reddet(cli("--depo", "dosya", "--dizin", d, "--test-dunya-oneki", "", "--test-dunya-sil", "test-sert"), /en az 3 karakter/);
    reddet(cli("--depo", "dosya", "--dizin", d, "--test-dunya-oneki", "te", "--test-dunya-sil", "test-sert"), /en az 3 karakter/);
    reddet(cli("--depo", "dosya", "--dizin", d, "--test-hesap-oneki", "", "--test-dunya-sil", "test-sert"), /en az 3 karakter/);
    reddet(cli("--depo", "dosya", "--dizin", d, "--test-dunya-oneki", "ana", "--test-dunya-sil", "ana"), /hicbir onekle/);
    reddet(cli("--depo", "dosya", "--dizin", d, "--dunya", "test-sert", "--test-dunya-sil", "test-sert"), /canli dunyasi/);
    reddet(cli("--depo", "dosya", "--dizin", "raporlar/dunya", "--test-dunya-sil", "test-x"), /varsayilan dosya dizini/);
    // Ortam degiskeniyle bos onek varsayilana duser (silinecek adi her seye uydurmaz); "ab" ise reddedilir.
    reddet(cliEnv({ BOLGE_TEST_DUNYA_ONEKI: "ab" }, "--depo", "dosya", "--dizin", d, "--test-dunya-sil", "abc"), /en az 3 karakter/);
    reddet(cliEnv({ BOLGE_TEST_DUNYA_ONEKI: "" }, "--depo", "dosya", "--dizin", d, "--test-dunya-sil", "baska-dunya"), /reddedildi/);
    expect(await boyut()).toBe(once);

    const URETIM = { BOLGE_URETIM: "1", BOLGE_BILET_SIRRI: "uretim-icin-uzun-rastgele-bilet-sirri-0123456789", BOLGE_GUNLUK_TUZU: "uretim-icin-ayri-gunluk-tuzu-9876543210-abcdef", BOLGE_IZINLI_KOKENLER: "https://oyun.ornek.org", BOLGE_GENEL_URL: "https://sunucu.ornek.org" };
    reddet(cliEnv(URETIM, "--depo", "dosya", "--dizin", d, "--test-dunya-sil", "test-sert"), /ikinci kez/);
    reddet(cliEnv(URETIM, "--depo", "dosya", "--dizin", d, "--evet-sil", "test-baska", "--test-dunya-sil", "test-sert"), /ikinci kez/);
    reddet(cliEnv({ ...URETIM, BOLGE_TEST_DUNYA_SIL_ONAY: "yanlis" }, "--depo", "dosya", "--dizin", d, "--test-dunya-sil", "test-sert"), /ikinci kez/);
    expect(await boyut()).toBe(once);
    // Sayim (silmez) uretimde onaysiz calisir; onayli silme calisir (bayrak ya da ortam).
    expect(cliEnv(URETIM, "--depo", "dosya", "--dizin", d, "--test-dunya-say", "test-sert").kod).toBe(0);
    const sil = cliEnv({ ...URETIM, BOLGE_TEST_DUNYA_SIL_ONAY: "test-sert" }, "--depo", "dosya", "--dizin", d, "--test-dunya-sil", "test-sert");
    expect(sil.kod, sil.cikti).toBe(0);
    expect(sil.olaylar.find((o) => o.olay === "testDunyaSilindi")).toBeDefined();

    const d2 = await geciciDizin("test-sert2-");
    await dunyaOynat(d2);
    const sil2 = cliEnv(URETIM, "--depo", "dosya", "--dizin", d2, "--evet-sil", "test-sert2", "--test-dunya-sil", "test-sert2");
    expect(sil2.kod, sil2.cikti).toBe(0);
  }, 120_000);

  it("--test-dunya-sil ile --test-dunya-say birlikte ve bellek deposu reddedilir", () => {
    expect(cli("--test-dunya-sil", "test-a", "--test-dunya-say", "test-a").kod).toBe(1);
    expect(cli("--depo", "bellek", "--test-dunya-sil", "test-a").kod).toBe(1);
    expect(cli("--depo", "bellek", "--dok", "/tmp/x-dok-yok").kod).toBe(1);
  });
});

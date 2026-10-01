/**
 * Kalıcılık bağdaştırıcıları: bellek ve dosya aynı sözleşmeyi uygular (seq sürekliliği, `oku(seq)`, son görüntü).
 * Dosya: çökmeden kalan yarım satır kesilir, ortadaki bozulma açılışı durdurur, tek yazar kilidi.
 * Postgres: yalnız `BOLGE_PG_URL` tanımlıysa (ör. postgres://localhost/bolge_test).
 */
import { appendFile, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bellekDeposu } from "../src/depo/bellek";
import { dosyaDeposu } from "../src/depo/dosya";
import { postgresDeposu } from "../src/depo/postgres";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { KUZEY, veri } from "./yardimci";
import { SEMA_SURUMU } from "../src/depo/tipler";
import type { AnlikGoruntuKaydi, Depo, GunlukKaydi } from "../src/depo/tipler";

const dizinler: string[] = [];
afterEach(async () => {
  for (const d of dizinler.splice(0)) await rm(d, { recursive: true, force: true });
});

async function geciciDizin(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "bolge-depo-"));
  dizinler.push(d);
  return d;
}

function kayit(seq: number): GunlukKaydi {
  return { seq, t: seq * 1000, oyuncu: "ali", komut: { tur: "vergi_ayarla", oranPpm: seq }, istemci: "i", anahtar: `a${seq}`, kuralSurumu: "k1-test", semaSurumu: SEMA_SURUMU };
}

function goruntu(seq: number, simZamani: number): AnlikGoruntuKaydi {
  return { seq, simZamani, kuralSurumu: "k1-test", semaSurumu: SEMA_SURUMU, durumOzeti: "0123456789abcdef", metin: `{"x":${seq}}`, ek: { tohum: 1, idempotans: [] } };
}

async function sozlesme(depo: Depo): Promise<void> {
  expect(await depo.gunluk.oku(0)).toEqual([]);
  expect(await depo.goruntu.sonuncu()).toBeNull();
  await depo.gunluk.ekle([kayit(1), kayit(2)]);
  await depo.gunluk.ekle([]);
  await depo.gunluk.ekle([kayit(3)]);
  await expect(depo.gunluk.ekle([kayit(5)])).rejects.toThrow(/seq/);
  await expect(depo.gunluk.ekle([kayit(3)])).rejects.toThrow(/seq/);
  expect((await depo.gunluk.oku(0)).map((k) => k.seq)).toEqual([1, 2, 3]);
  expect(await depo.gunluk.oku(1)).toEqual([kayit(2), kayit(3)]);
  expect(await depo.gunluk.oku(3)).toEqual([]);
  await depo.goruntu.kaydet(goruntu(0, 0));
  await depo.goruntu.kaydet(goruntu(2, 5000));
  await depo.goruntu.kaydet(goruntu(2, 9000));
  expect(await depo.goruntu.sonuncu()).toEqual(goruntu(2, 9000));
}

describe("bellek deposu", () => {
  it("sozlesme", async () => {
    await sozlesme(bellekDeposu());
  });
});

describe("dosya deposu", () => {
  it("sozlesme ve yeniden acilista kalicilik", async () => {
    const d = await geciciDizin();
    const depo = await dosyaDeposu(d);
    await sozlesme(depo);
    await depo.gunluk.kapat();
    const yeni = await dosyaDeposu(d);
    expect((await yeni.gunluk.oku(0)).map((k) => k.seq)).toEqual([1, 2, 3]);
    expect(await yeni.goruntu.sonuncu()).toEqual(goruntu(2, 9000));
    await yeni.gunluk.ekle([kayit(4)]);
    await yeni.gunluk.kapat();
  });

  it("cokmeden kalan yarim satir kesilir; sonraki ekleme temiz satira yazilir", async () => {
    const d = await geciciDizin();
    const depo = await dosyaDeposu(d);
    await depo.gunluk.ekle([kayit(1), kayit(2)]);
    await depo.gunluk.kapat();
    await appendFile(join(d, "gunluk.jsonl"), JSON.stringify(kayit(3)).slice(0, 25));
    const yeni = await dosyaDeposu(d);
    expect((await yeni.gunluk.oku(0)).map((k) => k.seq)).toEqual([1, 2]);
    await yeni.gunluk.ekle([kayit(3)]);
    expect((await yeni.gunluk.oku(0)).map((k) => k.seq)).toEqual([1, 2, 3]);
    await yeni.gunluk.kapat();
    expect((await readFile(join(d, "gunluk.jsonl"), "utf8")).split("\n")).toHaveLength(4);
  });

  it("ortadaki bozuk satir ya da seq boslugu acilisi durdurur", async () => {
    const d = await geciciDizin();
    await writeFile(join(d, "gunluk.jsonl"), [JSON.stringify(kayit(1)), "{bozuk", JSON.stringify(kayit(3)), ""].join("\n"));
    await expect(dosyaDeposu(d)).rejects.toThrow(/bozuk JSON/);
    await writeFile(join(d, "gunluk.jsonl"), [JSON.stringify(kayit(1)), JSON.stringify(kayit(3)), ""].join("\n"));
    await expect(dosyaDeposu(d)).rejects.toThrow(/seq/);
  });

  it("tek yazar kilidi: yasayan sahip varsa reddedilir, olu sahibin kilidi devralinir", async () => {
    const d = await geciciDizin();
    const depo = await dosyaDeposu(d);
    await depo.gunluk.kapat();
    // Yaşayan başka bir süreç (test sürecinin ebeveyni) kilit sahibi gibi.
    await writeFile(join(d, "yazar.kilit"), String(process.ppid));
    await expect(dosyaDeposu(d)).rejects.toThrow(/kilitli/);
    // Ölmüş süreç (kill -9 sonrası kalan kilit).
    await writeFile(join(d, "yazar.kilit"), "999999999");
    const yeni = await dosyaDeposu(d);
    expect(await readFile(join(d, "yazar.kilit"), "utf8")).toBe(String(process.pid));
    await yeni.gunluk.kapat();
    await expect(readFile(join(d, "yazar.kilit"), "utf8")).rejects.toThrow();
  });

  it("son uc goruntu saklanir; yarim gecici dosya atilir", async () => {
    const d = await geciciDizin();
    const depo = await dosyaDeposu(d);
    for (let i = 0; i < 5; i++) await depo.goruntu.kaydet(goruntu(i, i * 100));
    await writeFile(join(d, "goruntu", "000000000009-0000000000000900.goruntu.tmp"), "yarim");
    await depo.gunluk.kapat();
    const yeni = await dosyaDeposu(d);
    expect((await readdir(join(d, "goruntu"))).sort()).toHaveLength(3);
    expect((await yeni.goruntu.sonuncu())?.seq).toBe(4);
    await yeni.gunluk.kapat();
  });
});

const PG = process.env.BOLGE_PG_URL;
describe.skipIf(!PG)("postgres deposu (BOLGE_PG_URL)", () => {
  it("yedekle: kaynak goruntu satiri yoksa firlatir (goc durur); varsa snapshot_yedek etiketini doner", async () => {
    const dunya = `yedek-${process.pid}-${Date.now()}`;
    const depo = await postgresDeposu({ baglanti: PG as string, dunya, semaKur: true });
    try {
      await expect(depo.goruntu.yedekle?.(goruntu(0, 0), "goc-x")).rejects.toThrow(/yedeklenecek goruntu satiri yok/);
      await depo.goruntu.kaydet(goruntu(0, 0));
      expect(await depo.goruntu.yedekle?.(goruntu(0, 0), "goc-x")).toBe(`pg:snapshot_yedek:${dunya}:goc-x`);
      await depo.havuz.query("DELETE FROM snapshots WHERE dunya = $1", [dunya]);
      await depo.havuz.query("DELETE FROM snapshot_yedek WHERE dunya = $1", [dunya]);
    } finally {
      await depo.gunluk.kapat();
    }
  });

  it("sozlesme, advisory kilit ve yeniden acilis", async () => {
    const dunya = `test-${process.pid}-${Date.now()}`;
    const depo = await postgresDeposu({ baglanti: PG as string, dunya, semaKur: true });
    try {
      await sozlesme(depo);
      await expect(postgresDeposu({ baglanti: PG as string, dunya })).rejects.toThrow(/kilitli/);
    } finally {
      await depo.gunluk.kapat();
    }
    const yeni = await postgresDeposu({ baglanti: PG as string, dunya });
    try {
      expect((await yeni.gunluk.oku(0)).map((k) => k.seq)).toEqual([1, 2, 3]);
      expect(await yeni.goruntu.sonuncu()).toEqual(goruntu(2, 9000));
      await yeni.havuz.query("DELETE FROM log WHERE dunya = $1", [dunya]);
      await yeni.havuz.query("DELETE FROM snapshots WHERE dunya = $1", [dunya]);
    } finally {
      await yeni.gunluk.kapat();
    }
  });

  it("yazar: postgres gunlugu + goruntusuyle kurtarma ayni ozeti verir", async () => {
    const dunya = `yazar-${process.pid}-${Date.now()}`;
    const saat = new ElleSaat();
    const depo = await postgresDeposu({ baglanti: PG as string, dunya, semaKur: true });
    const y = await DunyaYazari.ac({ veri: veri(), tohum: 4, depo, saat, goruntuAraligiMs: 3 * SAAT });
    const p = [
      y.komutGonder(SISTEM_OYUNCUSU, "t", "k", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY }),
      y.komutGonder("ali", "t", "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }),
    ];
    await y.birTur();
    saat.ilerlet(5 * SAAT);
    await y.birTur();
    p.push(y.komutGonder("ali", "t", "b", { tur: "vergi_ayarla", oranPpm: 120_000 }), y.komutGonder("ali", "t", "c", { tur: "tesis_insa", bolge: "m_dag", tesisTuru: "ciftlik" }));
    await y.birTur();
    await Promise.all(p);
    expect(y.sonGoruntuHatasi).toBeNull();
    const beklenen = y.ozet();
    await depo.gunluk.kapat(); // kilidi bırak (çökme benzeri: kapanış görüntüsü alınmadı)
    const depo2 = await postgresDeposu({ baglanti: PG as string, dunya });
    try {
      const k = await DunyaYazari.ac({ veri: veri(), tohum: 999, depo: depo2, saat: new ElleSaat() });
      expect(k.kurtarma.goruntuSeq).toBeGreaterThan(0);
      expect(k.kurtarma.kalanKayit).toBe(2);
      expect(k.ozet()).toEqual(beklenen);
      await depo2.havuz.query("DELETE FROM log WHERE dunya = $1", [dunya]);
      await depo2.havuz.query("DELETE FROM snapshots WHERE dunya = $1", [dunya]);
    } finally {
      await depo2.gunluk.kapat();
    }
  });
});

/**
 * Yedek ve geri yükleme tatbikatı (Alfa-0 işletim; yalnız `BOLGE_PG_URL` ve pg istemci ikilileri varsa): canlı pg dünyasından
 * `deploy/yedek.sh` (pg_dump) alınır, `deploy/geri-yukle.sh` ile YENİ bir veritabanına yüklenir, sunucu oradan açılır (son görüntü +
 * günlük kuyruğu oynatılır) ve `durumOzeti` canlı dünyanın AYNI t'deki özetiyle eşit olmalıdır. Profil (çapa, özet kayıtları) de aynı.
 * `PG_BIN` ortam değişkeni ya da /usr/lib/postgresql/*\/bin içinde pg_dump aranır.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { postgresDeposu } from "../src/depo/postgres";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { GUNEY, KUZEY, veri } from "./yardimci";

const PG = process.env.BOLGE_PG_URL;
const KOK = fileURLToPath(new URL("../../../", import.meta.url));

function pgBin(): string | null {
  if (process.env.PG_BIN && existsSync(join(process.env.PG_BIN, "pg_dump"))) return process.env.PG_BIN;
  const kok = "/usr/lib/postgresql";
  if (existsSync(kok)) {
    for (const s of readdirSync(kok).sort().reverse()) if (existsSync(join(kok, s, "bin", "pg_dump"))) return join(kok, s, "bin");
  }
  return null;
}
const BIN = pgBin();

const dizinler: string[] = [];
const veritabanlari: string[] = [];
afterAll(async () => {
  for (const d of dizinler) await rm(d, { recursive: true, force: true });
  if (!PG) return;
  const y = new pg.Pool({ connectionString: PG, max: 1 });
  for (const ad of veritabanlari) await y.query(`DROP DATABASE IF EXISTS ${ad} WITH (FORCE)`).catch(() => undefined);
  await y.end();
});

function betik(ad: "yedek.sh" | "geri-yukle.sh", ...args: string[]): { kod: number | null; cikti: string } {
  const r = spawnSync("bash", [join(KOK, "deploy", ad), ...args], { env: { ...process.env, PG_BIN: BIN ?? "" }, encoding: "utf8" });
  return { kod: r.status, cikti: `${r.stdout}${r.stderr}` };
}

describe.skipIf(!PG || !BIN)("yedek ve geri yukleme tatbikati (gercek pg)", () => {
  it("canli dunyadan pg_dump -> yeni veritabanina geri yukle -> sunucu oradan acilir: ayni t'de ayni durumOzeti", async () => {
    const sonek = `${process.pid}_${Date.now()}`;
    const kaynakAd = `bolge_yedek_k_${sonek}`;
    const hedefAd = `bolge_yedek_h_${sonek}`;
    veritabanlari.push(kaynakAd, hedefAd);
    const yonetici = new pg.Pool({ connectionString: PG, max: 1 });
    await yonetici.query(`CREATE DATABASE ${kaynakAd}`);
    await yonetici.end();
    const url = (ad: string): string => {
      const u = new URL(PG as string);
      u.pathname = `/${ad}`;
      return u.toString();
    };
    const dizin = await mkdtemp(join(tmpdir(), "bolge-yedek-"));
    dizinler.push(dizin);

    // --- Canlı dünya (kaynak pg): görüntüler her 3 sim-saatte; son görüntüden SONRA günlük kuyruğu var ---
    const depo = await postgresDeposu({ baglanti: url(kaynakAd), dunya: "ana", semaKur: true });
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: veri(), tohum: 3, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 3 * SAAT });
    let n = 0;
    const gonder = async (o: string, k: Komut): Promise<void> => {
      const p = y.komutGonder(o, "t", `k${n++}`, k);
      await y.birTur();
      await p;
    };
    const ilerle = async (t: number): Promise<void> => {
      saat.ilerlet(t);
      for (let i = 0; y.sim.dunya.zaman < t && i < 1000; i++) await y.birTur();
    };
    await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY });
    await gonder("ali", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
    await gonder("ali", { tur: "ticaret_emri", bolge: "m_liman", mal: "tahil", yon: "ihracat", oranSaat: 5_000 });
    for (let sa = 4; sa <= 12; sa += 4) {
      await ilerle(sa * SAAT);
      await gonder("veli", { tur: "vergi_ayarla", oranPpm: 80_000 + sa * 1_000 });
    }
    await y.cikis("ali");
    await ilerle(13 * SAAT);
    await gonder("ali", { tur: "tesis_insa", bolge: "m_gecit", tesisTuru: "gida_fabrikasi" }); // görüntüden sonraki kuyruk
    await gonder("ali", { tur: "vergi_ayarla", oranPpm: 91_000 });
    await y.profilBekle();
    expect(y.metrikler.goruntu).toBeGreaterThan(2);
    const canli = y.ozet();
    const kayitCanli = await depo.profil?.kayitOku("ali");
    const capaCanli = await depo.profil?.capaOku("ali");
    expect(capaCanli?.sonGorulen).toBeDefined();

    // --- Yedek (canlı sunucuyla birlikte) ---
    const dump = join(dizin, "yedek.dump");
    const yd = betik("yedek.sh", url(kaynakAd), dump);
    expect(yd.kod, yd.cikti).toBe(0);
    expect(yd.cikti).toContain("dunya=ana son_seq=");
    expect(existsSync(`${dump}.sha256`)).toBe(true);

    // --- Geri yükleme: yeni veritabanı; dolu/var olan hedef ve bozuk yedek reddedilir ---
    const gy = betik("geri-yukle.sh", dump, url(hedefAd), "--olustur");
    expect(gy.kod, gy.cikti).toBe(0);
    expect(gy.cikti).toContain(`dunya=ana son_seq=${canli.seq}`);
    expect(betik("geri-yukle.sh", dump, url(hedefAd), "--olustur").kod).not.toBe(0); // zaten var
    const dolu = betik("geri-yukle.sh", dump, url(hedefAd));
    expect(dolu.kod).not.toBe(0);
    expect(dolu.cikti).toContain("bos degil");
    const bozuk = join(dizin, "bozuk.dump");
    writeFileSync(bozuk, readFileSync(dump));
    writeFileSync(`${bozuk}.sha256`, `${"0".repeat(64)}  bozuk.dump\n`);
    const bz = betik("geri-yukle.sh", bozuk, url(`${hedefAd}_x`), "--olustur");
    expect(bz.kod).not.toBe(0);
    expect(bz.cikti).toContain("sha256 uyusmuyor");

    // --- Sunucu geri yüklenen veritabanından açılır: görüntü + günlük kuyruğu ---
    const depo2 = await postgresDeposu({ baglanti: url(hedefAd), dunya: "ana", semaKur: false }); // şema sürümü yedekle geldi
    try {
      const k = await DunyaYazari.ac({ veri: veri(), tohum: 999, depo: depo2, saat: new ElleSaat(), commitAraligiMs: 15 });
      expect(k.kurtarma.goruntuSeq).toBeGreaterThan(0);
      expect(k.kurtarma.kalanKayit).toBeGreaterThan(0); // görüntüden sonraki kuyruk oynatıldı
      expect(k.kurtarma.seq).toBe(canli.seq);
      expect(k.kurtarma.donusAcik).toBe(true);
      k.sim.calistirKadar(canli.t); // karşılaştırma AYNI t'de (docs/06 §14)
      const geri = k.ozet();
      expect(geri.t).toBe(canli.t);
      expect(geri.seq).toBe(canli.seq);
      expect(geri.durumOzeti).toBe(canli.durumOzeti);
      // Profil (çapa ve özet kayıtları) da yedekten geldi.
      expect(await depo2.profil?.kayitOku("ali")).toEqual(kayitCanli);
      expect(await depo2.profil?.capaOku("ali")).toEqual(capaCanli);
      // Geri yüklenen dünya yaşar: yeni komut kabul edilir ve seq sürer.
      const p = k.komutGonder("veli", "t", "yeni", { tur: "vergi_ayarla", oranPpm: 70_000 });
      await k.birTur();
      expect((await p).seq).toBe(canli.seq + 1);
      await k.kapat();
    } finally {
      await depo2.gunluk.kapat().catch(() => undefined);
    }
    await y.kapat();
  }, 120_000);
});

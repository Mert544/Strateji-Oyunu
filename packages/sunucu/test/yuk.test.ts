/**
 * 100 botluk yük testi (Alfa-0 işletim): parsel botları (`@bolge/botlar`, yalnız herkese açık API) GERÇEK WebSocket üzerinden komut
 * gönderir. Ağır koşu: yalnız `BOLGE_AGIR_TEST=1` ile.   BOLGE_AGIR_TEST=1 pnpm vitest run packages/sunucu/test/yuk.test.ts
 *
 * Düzen: tek süreç (sunucu + 100 ws istemcisi + bot kararları). Bot kararları dünyayı (`yazar.sim`) okuyarak verilir (botlar bir
 * `Simulasyon` ister; ws istemcisi yalnız ilgi karesi alır); komutlar her bot için ayrı bağlantıdan, token'lı, hız sınırıyla
 * (yük testinde gevşetilmiş) gönderilir. Sim saati her turda 6 sim-saat ilerler (elle saat: sunucu döngüsü gerçek zamanlı çalışır,
 * grup commit 75 ms, dosya deposu fsync). Ölçülenler: komutun gönderiminden `komutSonucu`na kadar gecikme (uçtan uca), sunucu içi
 * commit gecikmesi (metrik histogramı), CPU ve bellek.
 *
 * Ortam: BOLGE_YUK_BOT (vars. 100), BOLGE_YUK_TUR (vars. 24 tur = 6 sim-günü), BOLGE_YUK_DEPO (bellek | dosya | pg; vars. dosya),
 * BOLGE_YUK_ABONE=0 (ilçe aboneliği/kare yayını yok), BOLGE_YUK_GORUNTU_SAAT (görüntü aralığı, sim-saat; vars. 6). Rapor: raporlar/yuk/yuk-<zaman>.json (git dışı) ve konsol özeti.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { cpus, tmpdir, totalmem } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import { PARSEL_ONAYARLARI, parselBotuOlustur } from "@bolge/botlar";
import type { ParselBotu } from "@bolge/botlar";
import { SAAT } from "@bolge/cekirdek";
import { parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { Depo } from "../src/depo/tipler";
import { bellekDeposu } from "../src/depo/bellek";
import { dosyaDeposu } from "../src/depo/dosya";
import { postgresDeposu } from "../src/depo/postgres";
import { GelistirmeKimligi } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { ElleSaat } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import { SIR, token } from "./yardimci";

const AGIR = process.env.BOLGE_AGIR_TEST === "1";
const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const BOT = Number(process.env.BOLGE_YUK_BOT ?? 100);
const TUR = Number(process.env.BOLGE_YUK_TUR ?? 24);
const DEPO = process.env.BOLGE_YUK_DEPO ?? "dosya";
const ABONE = process.env.BOLGE_YUK_ABONE !== "0";
/** Görüntü aralığı (sim-saat; vars. 6 = üretim varsayılanı). Yük turları 6 sim-saat/tur olduğundan 6'da HER turda görüntü alınır (sıkıştırılmış zaman). */
const GORUNTU_SAAT = Number(process.env.BOLGE_YUK_GORUNTU_SAAT ?? 6);

const dizinler: string[] = [];
afterAll(async () => {
  for (const d of dizinler) await rm(d, { recursive: true, force: true });
});

function nicelik(sirali: number[], q: number): number {
  if (sirali.length === 0) return 0;
  return sirali[Math.min(sirali.length - 1, Math.max(0, Math.ceil(q * sirali.length) - 1))] as number;
}

const yuvarla = (n: number, k = 1): number => Math.round(n * 10 ** k) / 10 ** k;

describe.skipIf(!AGIR)("yuk testi: parsel botlari, gercek ws", () => {
  it(`${BOT} bot, ${TUR} tur (6 sim-saat), ${DEPO} deposu: tum komutlar yanitlanir; p95 gecikme, CPU ve bellek raporlanir`, async () => {
    const v = { ...varsayilanVeriyiYukle(), parsel: parselFiksturuYukle("sentetik-50") };
    let depo: Depo;
    let pgDunya: string | null = null;
    if (DEPO === "bellek") depo = bellekDeposu();
    else if (DEPO === "pg") {
      if (!process.env.BOLGE_PG_URL) throw new Error("BOLGE_YUK_DEPO=pg icin BOLGE_PG_URL gerekli");
      pgDunya = `yuk-${process.pid}-${Date.now()}`;
      depo = await postgresDeposu({ baglanti: process.env.BOLGE_PG_URL, dunya: pgDunya, semaKur: true });
    } else {
      const d = await mkdtemp(join(tmpdir(), "bolge-yuk-"));
      dizinler.push(d);
      depo = await dosyaDeposu(d);
    }
    const saat = new ElleSaat();
    const yazar = await DunyaYazari.ac({ veri: v, tohum: 7, depo, saat, goruntuAraligiMs: GORUNTU_SAAT * SAAT });
    const sunucu = await sunucuBaslat({
      yazar,
      kimlik: new GelistirmeKimligi(SIR),
      port: 0,
      hizSiniri: { kapasite: 10_000, saniyeBasina: 10_000 }, // yük testinde gevşetilmiş (üretim varsayılanı 20/5)
      metrik: { port: 0 },
    });
    const url = `ws://127.0.0.1:${sunucu.port}`;

    // --- botlar ve bağlantılar ---
    const botlar: Array<{ id: string; bot: ParselBotu; ist: SunucuIstemcisi }> = [];
    for (let i = 0; i < BOT; i++) {
      const id = `bot${String(i).padStart(3, "0")}`;
      const onayar = PARSEL_ONAYARLARI[i % PARSEL_ONAYARLARI.length] as (typeof PARSEL_ONAYARLARI)[number];
      const bot = parselBotuOlustur(onayar, id, onayar === "gec_katilan" ? { acilis: (["ciftci", "sanayici", "pazar"] as const)[i % 3] as "ciftci" } : {});
      botlar.push({ id, bot, ist: await SunucuIstemcisi.baglan(url, token(id), `yuk-${id}`) });
    }

    // --- katılım: oyuncu kendi katilimini yapar (`katil {ilce}`) ---
    let katilan = 0;
    for (let i = 0; i < botlar.length; i += 10) {
      await Promise.all(
        botlar.slice(i, i + 10).map(async (b) => {
          const r = await b.ist.katil(`katil-${b.id}`, b.bot.katilimIlcesi(yazar.sim));
          if (r.tur === "komutSonucu" && r.sonuc.tamam) katilan++;
        }),
      );
    }
    expect(katilan).toBeGreaterThanOrEqual(Math.floor(BOT * 0.9));
    if (ABONE) {
      for (const b of botlar) {
        const o = yazar.sim.dunya.mulk?.oyuncular.find((x) => x.id === b.id);
        const ilceler = (o?.ilceHucre ?? []).map((x) => x.ilce);
        if (ilceler.length > 0) b.ist.gonder({ tur: "abone", ilceler });
      }
    }

    // --- yük turları ---
    const gecikme: number[] = [];
    let komut = 0;
    let basarili = 0;
    let basarisiz = 0;
    let hata = 0;
    const hataKodlari: Record<string, number> = {};
    let botSuresiMs = 0;
    const cpu0 = process.cpuUsage();
    const t0 = performance.now();
    const bellekler: number[] = [];
    let enYuksekRss = 0;
    // Olay döngüsü gecikmesi: 20 ms'lik zamanlayıcının sapması.
    let sonTik = performance.now();
    let enBuyukSapma = 0;
    const sapmaSayaci = setInterval(() => {
      const an = performance.now();
      enBuyukSapma = Math.max(enBuyukSapma, an - sonTik - 20);
      sonTik = an;
    }, 20);

    for (let tur = 1; tur <= TUR; tur++) {
      const hedef = yazar.sim.dunya.zaman + 6 * SAAT;
      saat.ilerlet(hedef);
      await yazar.durgunlukBekle(hedef);
      // Karar anı: dünya tutarlıdır (sunucu döngüsü yalnız `await` noktalarında ilerler); kararlar senkron verilir.
      const bas = performance.now();
      const gonderilecek: Array<{ b: (typeof botlar)[number]; komutlar: ReturnType<ParselBotu["karar"]> }> = [];
      for (const b of botlar) {
        if (!yazar.sim.dunya.oyuncular.some((o) => o.id === b.id)) continue;
        gonderilecek.push({ b, komutlar: b.bot.karar(yazar.sim) });
      }
      botSuresiMs += performance.now() - bas;
      const bekleyen: Promise<void>[] = [];
      for (const { b, komutlar } of gonderilecek) {
        komutlar.forEach((k, j) => {
          komut++;
          const anahtar = `t${tur}-${j}`;
          const g0 = performance.now();
          bekleyen.push(
            b.ist.komut(anahtar, k).then((r) => {
              gecikme.push(performance.now() - g0);
              if (r.tur === "komutSonucu") {
                if (r.sonuc.tamam) basarili++;
                else basarisiz++;
              } else {
                hata++;
                hataKodlari[r.kod] = (hataKodlari[r.kod] ?? 0) + 1;
              }
            }),
          );
        });
      }
      await Promise.all(bekleyen);
      const m = process.memoryUsage();
      bellekler.push(m.heapUsed);
      enYuksekRss = Math.max(enYuksekRss, m.rss);
    }
    clearInterval(sapmaSayaci);
    const sureMs = performance.now() - t0;
    const cpu = process.cpuUsage(cpu0);
    const cpuSn = (cpu.user + cpu.system) / 1e6;
    const metin = await sunucu.metrikMetni();
    const m = yazar.metrikler;

    gecikme.sort((a, b) => a - b);
    const rapor = {
      tarih: new Date().toISOString(),
      makine: { cpu: cpus()[0]?.model ?? "?", cekirdek: cpus().length, bellekGB: yuvarla(totalmem() / 2 ** 30), node: process.version, platform: process.platform },
      yapilandirma: { bot: BOT, tur: TUR, simSaatTur: 6, depo: DEPO, abone: ABONE, goruntuAraligiSimSaat: GORUNTU_SAAT, commitMs: yazar.commitAraligiMs, harita: "sentetik + sentetik-50 parsel (mulk kipi)" },
      sonuc: {
        katilan,
        komut,
        basarili,
        basarisiz,
        hata,
        hataKodlari,
        seq: yazar.seq,
        simGunu: yuvarla(yazar.sim.dunya.zaman / (24 * SAAT), 2),
        gecenSn: yuvarla(sureMs / 1000, 2),
        komutSn: yuvarla(komut / (sureMs / 1000), 1),
        uctanUca: { p50Ms: yuvarla(nicelik(gecikme, 0.5)), p95Ms: yuvarla(nicelik(gecikme, 0.95)), p99Ms: yuvarla(nicelik(gecikme, 0.99)), maxMs: yuvarla(gecikme.at(-1) ?? 0) },
        sunucuCommit: { p50Ms: yuvarla(m.commit.nicelik(0.5)), p95Ms: yuvarla(m.commit.nicelik(0.95)), ortMs: yuvarla(m.commit.toplam / Math.max(1, m.commit.sayi)) },
        cpu: { toplamSn: yuvarla(cpuSn, 2), ortCekirdek: yuvarla(cpuSn / (sureMs / 1000), 2), botKarariSn: yuvarla(botSuresiMs / 1000, 2), botHaricOrtCekirdek: yuvarla(Math.max(0, cpuSn - botSuresiMs / 1000) / (sureMs / 1000), 2) },
        bellek: { enYuksekRssMB: yuvarla(enYuksekRss / 2 ** 20), sonHeapMB: yuvarla((bellekler.at(-1) ?? 0) / 2 ** 20), enYuksekHeapMB: yuvarla(Math.max(...bellekler) / 2 ** 20) },
        olayDongusuEnBuyukSapmaMs: yuvarla(enBuyukSapma),
        goruntu: m.goruntu,
        goruntuHatasi: m.goruntuHatasi,
        sonGoruntuMB: yuvarla(m.sonGoruntuBayt / 2 ** 20, 2),
        goruntuSureSonMs: yuvarla(m.sonGoruntuSureMs),
        goruntuSureEnUzunMs: yuvarla(m.enUzunGoruntuSureMs),
      },
    };
    mkdirSync(join(KOK, "raporlar", "yuk"), { recursive: true });
    writeFileSync(join(KOK, "raporlar", "yuk", `yuk-${Date.now()}.json`), JSON.stringify(rapor, null, 2) + "\n");
    console.log("YUK RAPORU", JSON.stringify(rapor, null, 1));

    // Sağlık ölçütleri (gevşek; asıl çıktı rapordur): hiçbir komut yanıtsız kalmadı, günlük yazılabildi, p95 makul.
    expect(basarili + basarisiz + hata).toBe(komut);
    expect(hataKodlari["ic_hata"] ?? 0).toBe(0);
    expect(yazar.olumculMu).toBe(false);
    expect(m.goruntuHatasi).toBe(0);
    expect(nicelik(gecikme, 0.95)).toBeLessThan(5000);
    expect(metin).toContain("bolge_commit_gecikme_ms_count");

    for (const b of botlar) await b.ist.kapat();
    await sunucu.kapat();
    if (pgDunya) {
      const h = new pg.Pool({ connectionString: process.env.BOLGE_PG_URL, max: 1 });
      for (const t of ["log", "snapshots", "snapshot_yedek", "profil_capa", "profil_kayit"]) await h.query(`DELETE FROM ${t} WHERE dunya = $1`, [pgDunya]);
      await h.end();
    }
  }, 600_000);
});

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
 * BOLGE_YUK_SENARYO=kademeli (BOLGE_YUK_KADEME=5: tur başına katılan bot), BOLGE_YUK_ISINMA=4, BOLGE_YUK_HEDEF_ZORUNLU=1 (ısınmış p95 > 300 ms ise düşer),
 * BOLGE_YUK_ABONE=0 (ilçe aboneliği/kare yayını yok), BOLGE_YUK_GORUNTU_SAAT (görüntü aralığı, sim-saat; vars. 6), BOLGE_YUK_ISCI=0 (görüntü işçisi kapalı), BOLGE_YUK_ODUL=1 (Esnaf Defteri ödül dedektörü açık; kapasite/gecikme karşılaştırması için), BOLGE_YUK_PROFIL=dosya.cpuprofile (ana iş parçacığı CPU profili). Rapor: raporlar/yuk/yuk-<zaman>.json (git dışı) ve konsol özeti.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { Session } from "node:inspector";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import { cpus, tmpdir, totalmem } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import { PARSEL_ONAYARLARI, parselBotuOlustur } from "@bolge/botlar";
import type { ParselBotu } from "@bolge/botlar";
import { SAAT, anlikGoruntuOlusturOzetli, icerikKimlikTablosuOlustur, kuralSurumuHesapla } from "@bolge/cekirdek";
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
/**
 * Senaryo: "patlama" (vars.; tüm botlar baştan katılır, ilk turlarda hepsi aynı anda pahalı kurulum komutları yollar) ya da "kademeli"
 * (botlar tur başına BOLGE_YUK_KADEME (vars. 5) bot hızıyla katılır; yük zamana yayılır). Yük turları sıkıştırılmıştır (1 tur = 6 sim-saat):
 * "tur başına N bot" gerçek zamanda "dakikada N bot" ölçeğindedir. Kademeli kipte "ısınma" = katılımın bitişinden sonraki BOLGE_YUK_ISINMA tur.
 */
const SENARYO = process.env.BOLGE_YUK_SENARYO ?? "patlama";
if (SENARYO !== "patlama" && SENARYO !== "kademeli") throw new Error(`BOLGE_YUK_SENARYO: patlama | kademeli (verilen: ${SENARYO})`);
const KADEME = Math.max(1, Number(process.env.BOLGE_YUK_KADEME ?? 5));
const KATILIM_BITIS = SENARYO === "kademeli" ? Math.ceil(Number(process.env.BOLGE_YUK_BOT ?? 100) / KADEME) : 0;
/** Hedef p95 (ms): ısınmış durumda uçtan uca komut gecikmesi. BOLGE_YUK_HEDEF_ZORUNLU=1 ise aşılırsa test düşer (vars. yalnız raporlanır). */
const HEDEF_P95_MS = 300;
const DEPO = process.env.BOLGE_YUK_DEPO ?? "dosya";
const ABONE = process.env.BOLGE_YUK_ABONE !== "0";
/** Görüntü aralığı (sim-saat; vars. 6 = üretim varsayılanı). Yük turları 6 sim-saat/tur olduğundan 6'da HER turda görüntü alınır (sıkıştırılmış zaman). */
const GORUNTU_SAAT = Number(process.env.BOLGE_YUK_GORUNTU_SAAT ?? 6);
/** Isınma turları: ilk N tur (botların ilk parsel/tesis kurulum patlaması) ayrıca raporlanır; "ısınma sonrası" istatistikler sonrasını kapsar. */
const ISINMA = Number(process.env.BOLGE_YUK_ISINMA ?? 4);
/** Bu turdan (dahil) önceki komutlar "ilk turlar"a (patlama: ilk ISINMA tur; kademeli: katılım dönemi + ISINMA tur), sonrası "ısınmış"a yazılır. */
const ISINMA_SON = KATILIM_BITIS + ISINMA;
const TUR = Number(process.env.BOLGE_YUK_TUR ?? (SENARYO === "kademeli" ? ISINMA_SON + 20 : 24));
/** Görüntü işçisi (worker_threads; vars. açık). BOLGE_YUK_ISCI=0: eşzamanlı (ana döngüde) görüntü: karşılaştırma için. */
const ISCI = process.env.BOLGE_YUK_ISCI !== "0";
/** Tanı anahtarları (vars. sunucu varsayılanı): BOLGE_YUK_DILIM = yazar uygulama dilimi ms (0 kapalı), BOLGE_YUK_PARCA = yayın parçası bağlantı sayısı (büyük değer = parçasız). */
const DILIM = process.env.BOLGE_YUK_DILIM !== undefined ? Number(process.env.BOLGE_YUK_DILIM) : undefined;
const PARCA = process.env.BOLGE_YUK_PARCA !== undefined ? Number(process.env.BOLGE_YUK_PARCA) : undefined;

const dizinler: string[] = [];
/** Düşen koşuda kaynakları bırakmak için kapatıcılar (best-effort; başarılı koşu kendi kapanışını yapar). */
const temizlik: Array<() => Promise<unknown>> = [];
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
    // Tanı günlüğü: aşama zamanları bellekte tutulur; test düşerse (kararsızlık) hata, yığın, aşama günlüğü, pg durumu ve ortam basılır.
    const baslangic = performance.now();
    const gunluk: string[] = [];
    const L = (m: string): void => {
      gunluk.push(`${(performance.now() - baslangic).toFixed(0).padStart(7)} ms  ${m}`);
    };
    try {
      await yukGovdesi(L);
    } catch (e) {
      console.error(
        [
          "=== YUK TESTI DUSTU: TANI ===",
          `hata: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`,
          `ortam: depo=${DEPO} bot=${BOT} tur=${TUR} abone=${ABONE} isci=${ISCI} goruntuSaat=${GORUNTU_SAAT} node=${process.version} yuk=${os.loadavg().map((x) => x.toFixed(1)).join("/")} bosBellekMB=${Math.round(os.freemem() / 2 ** 20)}`,
          ...gunluk,
          ...(await pgTani()),
          "=== /TANI ===",
        ].join("\n"),
      );
      throw e;
    } finally {
      for (const f of temizlik.splice(0).reverse()) await f().catch(() => undefined);
    }
  }, 600_000);
});

/** İş parçacığının KENDİ CPU süresi (ms; çekişmeden etkilenmez) ve duvar süresi: n tekrarın medyanı. */
function maliyetOlc(f: () => void, n = 5): { cpuMs: number; duvarMs: number } {
  const cpu: number[] = [];
  const duvar: number[] = [];
  for (let i = 0; i < n; i++) {
    const c0 = process.threadCpuUsage();
    const w0 = performance.now();
    f();
    const c = process.threadCpuUsage(c0);
    cpu.push((c.user + c.system) / 1000);
    duvar.push(performance.now() - w0);
  }
  const med = (d: number[]): number => [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)] as number;
  return { cpuMs: yuvarla(med(cpu)), duvarMs: yuvarla(med(duvar)) };
}

/** pg depoda düşen koşu için sunucu durumu: bağlantılar, kilitler, veritabanı başına dünya sayısı (başarısızsa kendi hatasını yazar). */
async function pgTani(): Promise<string[]> {
  if (DEPO !== "pg" || !process.env.BOLGE_PG_URL) return [];
  const h = new pg.Pool({ connectionString: process.env.BOLGE_PG_URL, max: 1, connectionTimeoutMillis: 3000 });
  try {
    const a = await h.query("SELECT state, wait_event_type, count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() GROUP BY 1, 2");
    const k = await h.query("SELECT locktype, mode, granted, count(*)::int AS n FROM pg_locks GROUP BY 1, 2, 3");
    const d = await h.query("SELECT dunya, count(*)::int AS n FROM log GROUP BY 1 ORDER BY 2 DESC LIMIT 5").catch(() => ({ rows: [] }));
    return [`pg bağlantıları: ${JSON.stringify(a.rows)}`, `pg kilitleri: ${JSON.stringify(k.rows)}`, `log dünyaları: ${JSON.stringify(d.rows)}`];
  } catch (e) {
    return [`pg tanı alınamadı: ${e instanceof Error ? e.message : String(e)}`];
  } finally {
    await h.end().catch(() => undefined);
  }
}

async function yukGovdesi(L: (m: string) => void): Promise<void> {
  {
    const v = { ...varsayilanVeriyiYukle(), parsel: parselFiksturuYukle("sentetik-50") };
    let depo: Depo;
    let pgDunya: string | null = null;
    if (DEPO === "bellek") depo = bellekDeposu();
    else if (DEPO === "pg") {
      if (!process.env.BOLGE_PG_URL) throw new Error("BOLGE_YUK_DEPO=pg icin BOLGE_PG_URL gerekli");
      pgDunya = `yuk-${process.pid}-${Date.now()}`;
      L(`pg deposu aciliyor: dunya=${pgDunya}`);
      depo = await postgresDeposu({ baglanti: process.env.BOLGE_PG_URL, dunya: pgDunya, semaKur: true });
      L("pg deposu acildi (sema kuruldu)");
      const dunya = pgDunya;
      temizlik.push(async () => {
        const h = new pg.Pool({ connectionString: process.env.BOLGE_PG_URL, max: 1 });
        for (const t of ["log", "snapshots", "snapshot_yedek", "profil_capa", "profil_kayit", "profil_damga"]) await h.query(`DELETE FROM ${t} WHERE dunya = $1`, [dunya]);
        await h.end();
      });
    } else {
      const d = await mkdtemp(join(tmpdir(), "bolge-yuk-"));
      dizinler.push(d);
      depo = await dosyaDeposu(d);
    }
    const saat = new ElleSaat();
    const yazar = await DunyaYazari.ac({ veri: v, tohum: 7, depo, saat, goruntuAraligiMs: GORUNTU_SAAT * SAAT, goruntuIsci: ISCI, odul: process.env.BOLGE_YUK_ODUL === "1", ...(DILIM !== undefined ? { uygulamaDilimiMs: DILIM } : {}) });
    const sunucu = await sunucuBaslat({
      yazar,
      kimlik: new GelistirmeKimligi(SIR),
      port: 0,
      hizSiniri: { kapasite: 10_000, saniyeBasina: 10_000 }, // yük testinde gevşetilmiş (üretim varsayılanı 20/5)
      metrik: { port: 0 },
      ...(PARCA !== undefined ? { yayinParca: PARCA, yayinButceMs: 1e9 } : {}),
    });
    temizlik.push(() => sunucu.kapat());
    L(`sunucu hazir: port=${sunucu.port} metrikPort=${sunucu.metrikPort} yazar.seq=${yazar.seq} acilis=${JSON.stringify({ seq: yazar.kurtarma.seq, sureMs: yazar.kurtarma.sureMs })}`);
    const url = `ws://127.0.0.1:${sunucu.port}`;

    // --- botlar ve bağlantılar ---
    const botlar: Array<{ id: string; bot: ParselBotu; ist: SunucuIstemcisi }> = [];
    for (let i = 0; i < BOT; i++) {
      const id = `bot${String(i).padStart(3, "0")}`;
      const onayar = PARSEL_ONAYARLARI[i % PARSEL_ONAYARLARI.length] as (typeof PARSEL_ONAYARLARI)[number];
      const bot = parselBotuOlustur(onayar, id, onayar === "gec_katilan" ? { acilis: (["ciftci", "sanayici", "pazar"] as const)[i % 3] as "ciftci" } : {});
      const ist = await SunucuIstemcisi.baglan(url, token(id), `yuk-${id}`);
      temizlik.push(() => ist.kapat());
      botlar.push({ id, bot, ist });
    }
    L(`${botlar.length} bot baglandi`);

    // --- katılım: oyuncu kendi katilimini yapar (`katil {ilce}`); patlama: hepsi baştan, kademeli: tur başına KADEME bot ---
    let katilan = 0;
    const katil = async (grup: typeof botlar): Promise<void> => {
      for (let i = 0; i < grup.length; i += 10) {
        await Promise.all(
          grup.slice(i, i + 10).map(async (b) => {
            const r = await b.ist.katil(`katil-${b.id}`, b.bot.katilimIlcesi(yazar.sim));
            if (r.tur === "komutSonucu" && r.sonuc.tamam) katilan++;
          }),
        );
      }
      if (ABONE) {
        for (const b of grup) {
          const o = yazar.sim.dunya.mulk?.oyuncular.find((x) => x.id === b.id);
          const ilceler = (o?.ilceHucre ?? []).map((x) => x.ilce);
          if (ilceler.length > 0) b.ist.gonder({ tur: "abone", ilceler });
        }
      }
    };
    if (SENARYO === "patlama") {
      await katil(botlar);
      L(`katilim: ${katilan}/${BOT} basarili`);
      expect(katilan).toBeGreaterThanOrEqual(Math.floor(BOT * 0.9));
    }

    // --- yük turları ---
    const gecikme: number[] = [];
    const gecikmeIlk: number[] = [];
    const gecikmeSicak: number[] = [];
    const gecikmeKatilim: number[] = [];
    let isinmaSonuCommit = 0;
    let komut = 0;
    let basarili = 0;
    let basarisiz = 0;
    let hata = 0;
    const hataKodlari: Record<string, number> = {};
    let botSuresiMs = 0;
    // BOLGE_YUK_PROFIL=<dosya>: ana is parcacigi CPU profili (.cpuprofile; tani icin; olcumleri biraz bozar).
    const profilDosyasi = process.env.BOLGE_YUK_PROFIL;
    const oturum = profilDosyasi ? new Session() : null;
    if (oturum) {
      oturum.connect();
      oturum.post("Profiler.enable");
      oturum.post("Profiler.setSamplingInterval", { interval: 500 });
      oturum.post("Profiler.start");
    }
    const cpu0 = process.cpuUsage();
    const t0 = performance.now();
    const bellekler: number[] = [];
    let enYuksekRss = 0;
    // Olay döngüsü gecikmesi: 20 ms'lik zamanlayıcının sapması.
    let sonTik = performance.now();
    let enBuyukSapma = 0;
    const dongu = monitorEventLoopDelay({ resolution: 10 });
    dongu.enable();
    const sapmaSayaci = setInterval(() => {
      const an = performance.now();
      enBuyukSapma = Math.max(enBuyukSapma, an - sonTik - 20);
      sonTik = an;
    }, 20);

    for (let tur = 1; tur <= TUR; tur++) {
      const hedef = yazar.sim.dunya.zaman + 6 * SAAT;
      saat.ilerlet(hedef);
      await yazar.durgunlukBekle(hedef);
      // Kademeli katılım: bu turun katılımcıları (katılım komutu gecikmeye girmez; botların ilk karar komutları girer).
      if (SENARYO === "kademeli" && tur <= KATILIM_BITIS) {
        await katil(botlar.slice((tur - 1) * KADEME, tur * KADEME));
        if (tur === KATILIM_BITIS) {
          L(`katilim: ${katilan}/${BOT} basarili (kademeli, tur basina ${KADEME})`);
          expect(katilan).toBeGreaterThanOrEqual(Math.floor(BOT * 0.9));
        }
      }
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
              const gk = performance.now() - g0;
              gecikme.push(gk);
              (tur <= ISINMA_SON ? gecikmeIlk : gecikmeSicak).push(gk);
              if (tur <= KATILIM_BITIS) gecikmeKatilim.push(gk);
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
      if (tur === ISINMA_SON) isinmaSonuCommit = yazar.metrikler.commit.sayi;
      L(`tur ${tur}/${TUR}: komut=${komut} seq=${yazar.seq} goruntu=${yazar.metrikler.goruntu} isci=${yazar.goruntuIsiSuruyor ? "mesgul" : "bos"}`);
      const m = process.memoryUsage();
      bellekler.push(m.heapUsed);
      enYuksekRss = Math.max(enYuksekRss, m.rss);
    }
    clearInterval(sapmaSayaci);
    dongu.disable();
    if (oturum && profilDosyasi) {
      oturum.post("Profiler.stop", (_e, r) => writeFileSync(profilDosyasi, JSON.stringify(r.profile)));
      oturum.disconnect();
    }
    const sureMs = performance.now() - t0;
    const cpu = process.cpuUsage(cpu0);
    const cpuSn = (cpu.user + cpu.system) / 1e6;
    const metin = await sunucu.metrikMetni();
    const m = yazar.metrikler;

    gecikme.sort((a, b) => a - b);
    gecikmeIlk.sort((a, b) => a - b);
    gecikmeSicak.sort((a, b) => a - b);
    gecikmeKatilim.sort((a, b) => a - b);
    const ozet = (d: number[]) => ({ n: d.length, p50Ms: yuvarla(nicelik(d, 0.5)), p95Ms: yuvarla(nicelik(d, 0.95)), p99Ms: yuvarla(nicelik(d, 0.99)), maxMs: yuvarla(d.at(-1) ?? 0) });
    const commitSicak = [...((m.commit as { ornekler?: () => readonly number[] }).ornekler?.() ?? [])].slice(isinmaSonuCommit).sort((a, b) => a - b);
    // Görüntü maliyeti (son dünya): ana döngüde eşzamanlı üretim, gzip, yapısal kopya ve işçiye `postMessage` (ana iş parçacığında kalan iş).
    const kural = kuralSurumuHesapla(v);
    const ozetMetin = anlikGoruntuOlusturOzetli(yazar.sim, kural).metin;
    const goruntuMaliyeti: Record<string, unknown> = {
      metinMB: yuvarla(ozetMetin.length / 2 ** 20, 2),
      serilestirOzet: maliyetOlc(() => anlikGoruntuOlusturOzetli(yazar.sim, kural)),
      gzip: maliyetOlc(() => gzipSync(ozetMetin)),
      structuredClone: maliyetOlc(() => structuredClone(yazar.sim.dunya)),
    };
    const goruntuModulu = await import("../src/goruntu").catch(() => null);
    if (goruntuModulu) {
      const isci = new goruntuModulu.GoruntuIscisi(icerikKimlikTablosuOlustur(yazar.sim.ic), kural);
      try {
        const post: { cpuMs: number; duvarMs: number }[] = [];
        for (let i = 0; i < 5; i++) {
          const c0 = process.threadCpuUsage();
          const w = isci.calistir(yazar.sim.dunya, false);
          const c = process.threadCpuUsage(c0);
          post.push({ cpuMs: (c.user + c.system) / 1000, duvarMs: w?.kopyaMs ?? 0 });
          await w?.sonuc;
        }
        const med = (d: number[]): number => [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)] as number;
        goruntuMaliyeti["postMessageAnaIsParcacigi"] = { cpuMs: yuvarla(med(post.map((x) => x.cpuMs))), duvarMs: yuvarla(med(post.map((x) => x.duvarMs))) };
      } finally {
        await isci.kapat();
      }
    }
    L(`goruntu maliyeti: ${JSON.stringify(goruntuMaliyeti)}`);
    const rapor = {
      tarih: new Date().toISOString(),
      makine: { cpu: cpus()[0]?.model ?? "?", cekirdek: cpus().length, bellekGB: yuvarla(totalmem() / 2 ** 30), node: process.version, platform: process.platform },
      yapilandirma: { senaryo: SENARYO, bot: BOT, tur: TUR, simSaatTur: 6, depo: DEPO, abone: ABONE, isci: ISCI, goruntuAraligiSimSaat: GORUNTU_SAAT, commitMs: yazar.commitAraligiMs, harita: "sentetik + sentetik-50 parsel (mulk kipi)" },
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
        senaryo: SENARYO,
        ...(SENARYO === "kademeli" ? { kademeTurBasinaBot: KADEME, katilimBitisTuru: KATILIM_BITIS, uctanUcaKatilimDonemi: ozet(gecikmeKatilim) } : {}),
        isinmaTurSayisi: ISINMA,
        isinmaBitisTuru: ISINMA_SON,
        hedefP95Ms: HEDEF_P95_MS,
        hedefIsinmisTuttu: gecikmeSicak.length > 0 && nicelik(gecikmeSicak, 0.95) <= HEDEF_P95_MS,
        uctanUcaIlkTurlar: ozet(gecikmeIlk),
        uctanUcaIsinmaSonrasi: ozet(gecikmeSicak),
        commitIsinmaSonrasi: { p50Ms: yuvarla(nicelik(commitSicak, 0.5)), p95Ms: yuvarla(nicelik(commitSicak, 0.95)) },
        uctanUca: { p50Ms: yuvarla(nicelik(gecikme, 0.5)), p95Ms: yuvarla(nicelik(gecikme, 0.95)), p99Ms: yuvarla(nicelik(gecikme, 0.99)), maxMs: yuvarla(gecikme.at(-1) ?? 0) },
        sunucuCommit: { p50Ms: yuvarla(m.commit.nicelik(0.5)), p95Ms: yuvarla(m.commit.nicelik(0.95)), ortMs: yuvarla(m.commit.toplam / Math.max(1, m.commit.sayi)) },
        cpu: { toplamSn: yuvarla(cpuSn, 2), ortCekirdek: yuvarla(cpuSn / (sureMs / 1000), 2), botKarariSn: yuvarla(botSuresiMs / 1000, 2), botHaricOrtCekirdek: yuvarla(Math.max(0, cpuSn - botSuresiMs / 1000) / (sureMs / 1000), 2) },
        bellek: { enYuksekRssMB: yuvarla(enYuksekRss / 2 ** 20), sonHeapMB: yuvarla((bellekler.at(-1) ?? 0) / 2 ** 20), enYuksekHeapMB: yuvarla(Math.max(...bellekler) / 2 ** 20) },
        olayDongusuEnBuyukSapmaMs: yuvarla(enBuyukSapma),
        // monitorEventLoopDelay (10 ms cozunurluk): olay dongusunun GECIKMESI (ns -> ms); 10 ms'lik taban gecikmesi dahildir.
        olayDongusu: { p50Ms: yuvarla(dongu.percentile(50) / 1e6), p99Ms: yuvarla(dongu.percentile(99) / 1e6), maxMs: yuvarla(dongu.max / 1e6) },
        goruntu: m.goruntu,
        goruntuHatasi: m.goruntuHatasi,
        sonGoruntuMB: yuvarla(m.sonGoruntuBayt / 2 ** 20, 2),
        goruntuSureSonMs: yuvarla(m.sonGoruntuSureMs),
        goruntuSureEnUzunMs: yuvarla(m.enUzunGoruntuSureMs),
        goruntuIsci: { alinan: m.isciGoruntu ?? 0, atlanan: m.goruntuAtlanan ?? 0, hata: m.isciHatasi ?? 0, kopyaSonMs: yuvarla(m.sonKopyaMs ?? 0), kopyaEnUzunMs: yuvarla(m.enUzunKopyaMs ?? 0), isciSonMs: yuvarla(m.sonIsciMs ?? 0) },
        yukOrtalamasi: os.loadavg()[0],
        goruntuMaliyeti,
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
    if (process.env.BOLGE_YUK_HEDEF_ZORUNLU === "1") expect(nicelik(gecikmeSicak, 0.95), `isinmis p95 hedefi (${HEDEF_P95_MS} ms)`).toBeLessThanOrEqual(HEDEF_P95_MS);
    expect(metin).toContain("bolge_commit_gecikme_ms_count");

    // Başarılı koşu: kapanış (bot bağlantıları, sunucu, pg satırları) `temizlik` kapatıcılarıyla, ters sırayla.
    L("olcum tamam; kapatiliyor");
    for (const f of temizlik.splice(0).reverse()) await f();
    L("kapandi");
  }
}

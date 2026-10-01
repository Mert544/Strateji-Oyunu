/**
 * Dükkânlı lojistik çözüm süresi p95 ölçümü (Alfa-0 §6.9 komut-maliyeti şartı; baş lider istisnası). vitest'e GİRMEZ; SESSİZ PENCEREDE (kapı vitest koşmuyor, PG yok) TEK koşu:
 *
 *   npx tsx packages/olcum/bench/dukkan-cozum-p95.ts
 *   BOT=100 TUR=44 TOHUM=7 npx tsx packages/olcum/bench/dukkan-cozum-p95.ts      # varsayılanlar
 *
 * Düzen (K3'ün `cekirdek/bench/komut-maliyeti.ts` düzeniyle aynı): sentetik-50 mülk fikstürü, `BOT` parsel botu (kademeli katılım, tur başına 5 bot, tur = 6 sim-saat); her turda önce
 * `calistirKadar(t)`, sonra bot komutları. İki varyant AYNI süreçte art arda: (1) BAZ = dükkânsız aynı senaryo, (2) DUKKAN = `mulk.perakende` bloğu (bellekte; JSON değişmez) ve oyuncu başına
 * 1 ya da 2 dükkân (ortalama 1,5; katılım sırasından), raf 4 yuva (gıda, ekmek, un, süt), düğümde bol stok (çekim yolu tam çalışır: en kötü durum). Dükkân durumu doğrudan dünyaya yazılır
 * (kurma komutu G7-3'tedir). Ölçüt: HER lojistik çözümün iş parçacığı CPU süresi (`process.threadCpuUsage`; duvar saati değil); p50/p95/p99/maks, tüm koşu ve KARARLI HÂL (tüm botlar katıldıktan sonra).
 * Hedef: DUKKAN p95 ≤ 300 ms. Çıktının sonunda durum özeti ve yük ortalaması basılır.
 */
import { loadavg } from "node:os";
import { parselBotuOlustur, PARSEL_ONAYARLARI } from "@bolge/botlar";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Olay } from "@bolge/cekirdek";
import { parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import { perakendeBlogu } from "../../veri/test/perakende-g7-yardimci";
import { dukkanSayisi, dukkanlariEkle, sureOzeti } from "../src/dukkan-yuk";

const BOT = Number(process.env["BOT"] ?? 100);
const TUR = Number(process.env["TUR"] ?? 44);
const TOHUM = Number(process.env["TOHUM"] ?? 7);
const KADEME = 5;
const HEDEF_P95_MS = 300;

const cpu = (): number => {
  const u = process.threadCpuUsage();
  return (u.user + u.system) / 1000;
};

// Çözüm başına CPU: olay işleyicisi sarılır (yalnız bu betikte).
let hedefDizi: Array<{ tur: number; ms: number }> | null = null;
let gecerliTur = 0;
const proto = Simulasyon.prototype as unknown as { olayIsle(o: Olay): void };
const asilIsle = proto.olayIsle;
proto.olayIsle = function (this: unknown, o: Olay): void {
  if (o.veri.tur !== "cozum" || hedefDizi === null) return asilIsle.call(this, o);
  const g0 = cpu();
  asilIsle.call(this, o);
  hedefDizi.push({ tur: gecerliTur, ms: cpu() - g0 });
};

function veriKur(dukkanli: boolean): CekirdekVeriPaketi {
  const v = { ...varsayilanVeriyiYukle(), parsel: parselFiksturuYukle("sentetik-50") };
  if (dukkanli) {
    const mulk = v.param.mulk!;
    mulk.ekYapilar = { ...(mulk.ekYapilar ?? {}), dukkan: { ad: "Dukkan", yuva: 1, insaSaati: 4, insaParasi: 6_000_000, insaMaliyeti: { celik: 20_000, parca: 8_000 }, enFazlaIlBasina: 6, olcekHucre: [1, 2, 3] } };
    const pr = perakendeBlogu();
    pr.olcekler[0].rafYuvasi = 4; // A2/A3: raf yuvası 4
    mulk.perakende = pr;
  }
  return v;
}

function kos(ad: string, dukkanli: boolean): { ozet: string; tumu: ReturnType<typeof sureOzeti>; karar: ReturnType<typeof sureOzeti>; dukkan: number; oyuncu: number; sureSn: number } {
  const sim = Simulasyon.olustur(veriKur(dukkanli), TOHUM);
  const botlar = Array.from({ length: BOT }, (_, i) => {
    const id = `bot${String(i).padStart(3, "0")}`;
    const onayar = PARSEL_ONAYARLARI[i % PARSEL_ONAYARLARI.length] as (typeof PARSEL_ONAYARLARI)[number];
    return { id, bot: parselBotuOlustur(onayar, id, onayar === "gec_katilan" ? { acilis: (["ciftci", "sanayici", "pazar"] as const)[i % 3] as "ciftci" } : {}) };
  });
  const olc: Array<{ tur: number; ms: number }> = [];
  hedefDizi = olc;
  const bas = performance.now();
  let t = 0;
  const kararliTur = Math.ceil(BOT / KADEME) + 1;
  for (let tur = 1; tur <= TUR; tur++) {
    gecerliTur = tur;
    t += 6 * SAAT;
    sim.calistirKadar(t);
    if (tur <= BOT / KADEME) {
      for (const b of botlar.slice((tur - 1) * KADEME, tur * KADEME)) {
        const ilce = b.bot.katilimIlcesi(sim);
        sim.uygula({ t, oyuncu: SISTEM_OYUNCUSU, komut: ilce === undefined ? { tur: "oyuncu_katil", oyuncu: b.id, bolgeler: [] } : { tur: "oyuncu_katil", oyuncu: b.id, bolgeler: [], ilce } });
      }
    }
    for (const b of botlar) {
      if (!sim.dunya.oyuncular.some((o) => o.id === b.id)) continue;
      for (const k of b.bot.karar(sim)) sim.uygula({ t, oyuncu: b.id, komut: k });
    }
    if (dukkanli) dukkanlariEkle(sim);
  }
  hedefDizi = null;
  const sureSn = (performance.now() - bas) / 1000;
  const tumu = sureOzeti(olc.map((x) => x.ms));
  const karar = sureOzeti(olc.filter((x) => x.tur >= kararliTur).map((x) => x.ms));
  const f = (x: ReturnType<typeof sureOzeti>): string => `n ${x.n}, ort ${x.ort.toFixed(1)}, p50 ${x.p50.toFixed(1)}, p95 ${x.p95.toFixed(1)}, p99 ${x.p99.toFixed(1)}, maks ${x.max.toFixed(1)} ms`;
  console.log(`[${ad}] oyuncu ${sim.dunya.oyuncular.length}, dukkan ${dukkanSayisi(sim)}, sure ${sureSn.toFixed(0)} sn duvar, yuk ${(loadavg()[0] ?? 0).toFixed(1)}`);
  console.log(`[${ad}] cozum CPU (tum koşu):    ${f(tumu)}`);
  console.log(`[${ad}] cozum CPU (kararli hal): ${f(karar)}`);
  const ozet = sim.durumOzeti();
  console.log(`[${ad}] OZET ${ozet}`);
  return { ozet, tumu, karar, dukkan: dukkanSayisi(sim), oyuncu: sim.dunya.oyuncular.length, sureSn };
}

console.log(`dukkan cozum p95: BOT ${BOT}, TUR ${TUR}, TOHUM ${TOHUM}; hedef p95 <= ${HEDEF_P95_MS} ms`);
const baz = kos("BAZ", false);
const duk = kos("DUKKAN", true);
const oran = (a: number, b: number): string => (b > 0 ? (a / b).toFixed(2) : "-");
console.log(`ORAN dukkan/baz (kararli hal): p50 ${oran(duk.karar.p50, baz.karar.p50)}, p95 ${oran(duk.karar.p95, baz.karar.p95)}, p99 ${oran(duk.karar.p99, baz.karar.p99)}, ort ${oran(duk.karar.ort, baz.karar.ort)}`);
console.log(`ORAN dukkan/baz (tum kosu):    p50 ${oran(duk.tumu.p50, baz.tumu.p50)}, p95 ${oran(duk.tumu.p95, baz.tumu.p95)}, p99 ${oran(duk.tumu.p99, baz.tumu.p99)}, ort ${oran(duk.tumu.ort, baz.tumu.ort)}`);
console.log(`DUKKAN/OYUNCU ${(duk.dukkan / Math.max(1, duk.oyuncu)).toFixed(2)}; HEDEF ${duk.karar.p95 <= HEDEF_P95_MS ? "TUTTU" : "TUTMADI"} (kararli hal p95 ${duk.karar.p95.toFixed(1)} ms, tum kosu p95 ${duk.tumu.p95.toFixed(1)} ms)`);

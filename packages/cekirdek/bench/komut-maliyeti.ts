/**
 * Çekirdek komut maliyeti ölçümü (P3c; docs/06 §15.9). vitest'e GİRMEZ (test klasörlerinde değildir); elle koşturulur.
 *
 *   npx tsx packages/cekirdek/bench/komut-maliyeti.ts
 *   BOT=100 TUR=44 npx tsx packages/cekirdek/bench/komut-maliyeti.ts          # varsayılanlar
 *   node --cpu-prof --cpu-prof-dir=/tmp/prof --import tsx packages/cekirdek/bench/komut-maliyeti.ts   # profil (payları saymak için /tmp'deki .cpuprofile)
 *
 * Düzen: sentetik-50 mülk fixture, `BOT` parsel botu (`@bolge/botlar`), kademeli katılım (tur başına 5 bot), tur = 6 sim-saat; her turda önce
 * `calistirKadar(t)` (bekleyen çözümler boşalır), sonra botların komutları AYNI t'de sırayla `Simulasyon.uygula`'ya verilir. Süreç içi, ağsız.
 * Ölçüt: iş parçacığının CPU süresi (`process.threadCpuUsage`; duvar saati değil: paylaşımlı makinede yük ortalaması sonucu bozmaz).
 * Çıktı: komut türüne göre `uygula` süresi (kabul/red), lojistik çözüm başına CPU (olay işleyicisi sarılarak), toplamlar, yük ortalaması ve
 * DURUM ÖZETİ (önce/sonra karşılaştırmasında aynı olmalıdır: bot kararları deterministiktir; optimizasyon özeti değiştirmemelidir).
 */
import { loadavg } from "node:os";
import { PARSEL_ONAYARLARI, parselBotuOlustur } from "../../botlar/src";
import { parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { lojistikCoz } from "../src/lojistik/cozum";
import { SAAT } from "../src/tipler";
import type { Olay } from "../src/tipler";

const BOT = Number(process.env["BOT"] ?? 100);
const KADEME = 5;
const TUR = Number(process.env["TUR"] ?? 44);

const cpu = (): number => {
  const u = process.threadCpuUsage();
  return (u.user + u.system) / 1000;
};

interface Satir {
  n: number;
  top: number;
  max: number;
  red: number;
  redTop: number;
}
const olc: Record<string, Satir> = {};
function kaydet(tur: string, ms: number, tamam: boolean): void {
  const k = (olc[tur] ??= { n: 0, top: 0, max: 0, red: 0, redTop: 0 });
  if (tamam) {
    k.n++;
    k.top += ms;
    if (ms > k.max) k.max = ms;
  } else {
    k.red++;
    k.redTop += ms;
  }
}

const v = { ...varsayilanVeriyiYukle(), parsel: parselFiksturuYukle("sentetik-50") };
const sim = Simulasyon.olustur(v, 7);

// Lojistik çözüm başına CPU: olay işleyicisi sarılır (yalnız bu betikte).
let cozumCpu = 0;
let cozumAdet = 0;
const proto = Simulasyon.prototype as unknown as { olayIsle(o: Olay): void };
const asilIsle = proto.olayIsle;
proto.olayIsle = function (this: unknown, o: Olay): void {
  if (o.veri.tur !== "cozum") return asilIsle.call(this, o);
  const g0 = cpu();
  asilIsle.call(this, o);
  cozumCpu += cpu() - g0;
  cozumAdet++;
};

const botlar = Array.from({ length: BOT }, (_, i) => {
  const id = `bot${String(i).padStart(3, "0")}`;
  const onayar = PARSEL_ONAYARLARI[i % PARSEL_ONAYARLARI.length] as (typeof PARSEL_ONAYARLARI)[number];
  return { id, bot: parselBotuOlustur(onayar, id, onayar === "gec_katilan" ? { acilis: (["ciftci", "sanayici", "pazar"] as const)[i % 3] as "ciftci" } : {}) };
});

let t = 0;
const bas = performance.now();
const cpuBas = cpu();
for (let tur = 1; tur <= TUR; tur++) {
  t += 6 * SAAT;
  sim.calistirKadar(t);
  if (tur <= BOT / KADEME) {
    for (const b of botlar.slice((tur - 1) * KADEME, tur * KADEME)) {
      const ilce = b.bot.katilimIlcesi(sim);
      const g0 = cpu();
      const r = sim.uygula({
        t,
        oyuncu: SISTEM_OYUNCUSU,
        komut: ilce === undefined ? { tur: "oyuncu_katil", oyuncu: b.id, bolgeler: [] } : { tur: "oyuncu_katil", oyuncu: b.id, bolgeler: [], ilce },
      });
      kaydet("oyuncu_katil", cpu() - g0, r.tamam);
    }
  }
  for (const b of botlar) {
    if (!sim.dunya.oyuncular.some((o) => o.id === b.id)) continue;
    for (const k of b.bot.karar(sim)) {
      const g0 = cpu();
      const r = sim.uygula({ t, oyuncu: b.id, komut: k });
      kaydet(k.tur, cpu() - g0, r.tamam);
    }
  }
}
const toplamCpu = cpu() - cpuBas;
const toplamDuvar = performance.now() - bas;
console.log(`toplam: CPU ${(toplamCpu / 1000).toFixed(1)} sn, duvar ${(toplamDuvar / 1000).toFixed(1)} sn, yuk ortalamasi ${(loadavg()[0] ?? 0).toFixed(1)}, oyuncu ${sim.dunya.oyuncular.length}`);
console.log("komut turu | kabul n | kabul ort ms | kabul en yavas ms | red n | red ort ms   (CPU, Simulasyon.uygula)");
let uygulaToplam = 0;
for (const [tur, k] of Object.entries(olc).sort()) {
  uygulaToplam += k.top + k.redTop;
  console.log(`${tur} | ${k.n} | ${(k.n ? k.top / k.n : 0).toFixed(2)} | ${k.max.toFixed(1)} | ${k.red} | ${(k.red ? k.redTop / k.red : 0).toFixed(3)}`);
}
console.log(`uygula toplam: ${(uygulaToplam / 1000).toFixed(2)} sn CPU`);
console.log(`lojistik cozum: ${cozumAdet} adet, toplam ${(cozumCpu / 1000).toFixed(2)} sn CPU, cozum basina ${(cozumCpu / Math.max(1, cozumAdet)).toFixed(2)} ms CPU`);
console.log(`OZET ${sim.durumOzeti()}`); // mikro ölçümden ÖNCE (mikro ölçüm durumu değiştirir)
// Çözüm mikro ölçümü: son durumda doğrudan `lojistikCoz` (20 küme x 10 çağrı); yük gürültüsüne karşı en küçük ve ortanca küme ortalaması.
{
  const kumeler: number[] = [];
  for (let k = 0; k < 20; k++) {
    const g0 = cpu();
    for (let i = 0; i < 10; i++) lojistikCoz(sim.dunya, sim.baglam);
    kumeler.push((cpu() - g0) / 10);
  }
  kumeler.sort((a, b) => a - b);
  console.log(`cozum mikro (son durum, CPU ms/cozum): en kucuk ${kumeler[0]!.toFixed(2)}, ortanca ${kumeler[10]!.toFixed(2)}`);
}
{
  const d = sim.dunya;
  const sahipli = d.bolgeler.filter((b) => b.sahip !== null);
  const tesisli = sahipli.filter((b) => b.tesisler.length > 0);
  const mulkDugum = d.bolgeler.filter((b) => b.merkez !== undefined);
  const stokluMal = new Set<number>();
  for (const b of d.bolgeler) b.stoklar.forEach((s, m) => { if (s.miktar !== 0 || s.yerelOran !== 0 || s.gelenOran !== 0) stokluMal.add(m); });
  console.log(`bolge ${d.bolgeler.length}, sahipli ${sahipli.length}, tesisli ${tesisli.length}, isletme dugumu ${mulkDugum.length}, akis ${d.lojistik.akislar.length}, hareketli mal ${stokluMal.size}/${d.pazar.fiyat.length}, kenar ${d.kenarlar.length}`);
}

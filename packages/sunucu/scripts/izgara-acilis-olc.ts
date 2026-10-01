/**
 * Arsa izgarası açılış süresi ve bellek ölçümü (G3b): gerçek manifestteki bütün ilçeleri yükler ve dünyayı kurar; iki biçim, AYNI komut (süreç başına bir ölçüm):
 *
 *   node --expose-gc --max-old-space-size=6144 --import tsx packages/sunucu/scripts/izgara-acilis-olc.ts --bicim izgara   # manifestten (BHI1, kompakt dizin)
 *   node --expose-gc --max-old-space-size=6144 --import tsx packages/sunucu/scripts/izgara-acilis-olc.ts --bicim json     # aynı ızgaralardan JSON fikstürü ("önce")
 *   [--manifest YOL] [--oyuncu N]   # --oyuncu N: N ardışık oyuncu_katil (yurt araması; ağır, K3'ün yurt-halka işi öncesi p50 ≈ 0,9 sn)
 *
 * Çıktı: satır başına bir ölçü ve sonda `SONUC {json}` (süreler duvar ms; CPU süresi `process.cpuUsage`; bellek `gc()` sonrası, MB). İki biçimin `durumOzeti`
 * ÇIKTISI AYNI olmalıdır. Kapı (`SP/takim/kapi.kilit`) koşarken ve makine yüklüyken koşturmayın (süre ve RSS paylaşımdan etkilenir; yük ortalaması çıktıda yazılır).
 */
import { loadavg } from "node:os";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { Bit, arsaSinifi, engelAdi, gercekVeriyiYukle, ilceSeviyesiTuret, ilceSinifiTuret } from "@bolge/veri";
import type { Izgara, ParselFiksturu, ParselHucreTanimi, ParselIlceTanimi } from "@bolge/veri";
import { hiyerarsiOku, izgaraGirdisiKur, izgaraManifestiOku, izgaralariYukle, izgarayiVeriyeBagla, varsayilanIzgaraBagimliliklari, varsayilanIzgaraKoku } from "../src/izgara/manifest";

const { values: a } = parseArgs({ options: { bicim: { type: "string", default: "izgara" }, manifest: { type: "string" }, oyuncu: { type: "string", default: "0" } } });
const manifestYolu = a.manifest ?? fileURLToPath(new URL("../../veri/haritalar/odbl/izgara/manifest.json", import.meta.url));
const MB = 1024 * 1024;
const gcSonrasi = (): { rssMB: number; heapMB: number } => {
  (globalThis as { gc?: () => void }).gc?.();
  const m = process.memoryUsage();
  return { rssMB: Math.round(m.rss / MB), heapMB: Math.round(m.heapUsed / MB) };
};
const cpu = (): number => {
  const c = process.cpuUsage();
  return (c.user + c.system) / 1000;
};

function izgaradanIlce(id: string, ad: string, il: string, bolge: string, ig: Izgara): ParselIlceTanimi {
  const hucreler: ParselHucreTanimi[] = [];
  let uygun = 0;
  for (let dy = 0; dy < ig.yukseklik; dy++) {
    for (let dx = 0; dx < ig.genislik; dx++) {
      const d = ig.durum[dy * ig.genislik + dx] as number;
      if (!(d & Bit.ICERIDE)) continue;
      const hid = `${ig.x0 + dx}:${ig.y0 + dy}`;
      const engel = engelAdi(d);
      if (engel !== undefined) hucreler.push({ id: hid, sinif: arsaSinifi(d), uygun: false, engel });
      else {
        uygun++;
        hucreler.push({ id: hid, sinif: arsaSinifi(d), uygun: true });
      }
    }
  }
  const sinif = ilceSinifiTuret(ig);
  return { id, ad, il, bolge, sinif, seviye: ilceSeviyesiTuret(sinif), hucreSayisi: hucreler.length, uygunHucre: uygun, hucreler };
}

const sonuc: Record<string, unknown> = { bicim: a.bicim, yukOrtalamasi: loadavg().map((x) => Math.round(x * 10) / 10), node: process.version };
const bos = gcSonrasi();
sonuc.baslangic = bos;

const kok = varsayilanIzgaraKoku(manifestYolu);
const manifest = izgaraManifestiOku(manifestYolu);
let t0 = performance.now();
let c0 = cpu();
const yuklenen = izgaralariYukle(manifest, kok, varsayilanIzgaraBagimliliklari);
sonuc.yukleme = { ms: Math.round(performance.now() - t0), cpuMs: Math.round(cpu() - c0), ilce: yuklenen.length, hucre: yuklenen.reduce((n, y) => n + y.ilce.hucre.icerde, 0) };

const veri: CekirdekVeriPaketi = gercekVeriyiYukle();
const girdi = izgaraGirdisiKur(yuklenen, { ad: "izgara-manifest", harita: veri.harita.ad, hiyerarsi: hiyerarsiOku(`${kok}/hiyerarsi.json`), haritaBolgeleri: new Set(veri.harita.bolgeler.map((b) => b.id)) });
t0 = performance.now();
c0 = cpu();
if (a.bicim === "json") {
  const fikstur: ParselFiksturu = { surum: 1, ad: girdi.ad, harita: girdi.harita, tohum: girdi.tohum, zoom: 20, iller: girdi.iller.map((il) => ({ ...il })), ilceler: girdi.ilceler.map((c) => izgaradanIlce(c.id, c.ad, c.il, c.bolge, c.izgara)) };
  veri.parsel = fikstur;
  sonuc.jsonKurma = { ms: Math.round(performance.now() - t0), cpuMs: Math.round(cpu() - c0) };
} else izgarayiVeriyeBagla(veri, girdi);
t0 = performance.now();
c0 = cpu();
const sim = Simulasyon.olustur(veri, 3);
sonuc.olustur = { ms: Math.round(performance.now() - t0), cpuMs: Math.round(cpu() - c0) };
sonuc.ozet = sim.durumOzeti();
sonuc.kurulumSonrasi = gcSonrasi();
sonuc.tepeRssMB = Math.round(process.resourceUsage().maxRSS / 1024);

const n = Math.trunc(Number(a.oyuncu));
if (n > 0) {
  const ilce = girdi.ilceler[0]?.id as string;
  const sureler: number[] = [];
  for (let i = 0; i < n; i++) {
    const b = performance.now();
    const r = sim.uygula({ t: 1000 + i, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: `o${i}`, bolgeler: [], ilce } });
    sureler.push(Math.round(performance.now() - b));
    if (!r.tamam) throw new Error(`katilim basarisiz: ${JSON.stringify(r)}`);
  }
  sureler.sort((x, y) => x - y);
  sonuc.katilim = { n, p50: sureler[Math.floor(n / 2)], p95: sureler[Math.min(n - 1, Math.floor(n * 0.95))], enYuksek: sureler[n - 1] };
  sonuc.katilimSonrasi = gcSonrasi();
  sonuc.tepeRssMB = Math.round(process.resourceUsage().maxRSS / 1024);
  sonuc.ozetKatilimSonrasi = sim.durumOzeti();
}
for (const [k, v] of Object.entries(sonuc)) console.log(k, JSON.stringify(v));
console.log(`SONUC ${JSON.stringify(sonuc)}`);

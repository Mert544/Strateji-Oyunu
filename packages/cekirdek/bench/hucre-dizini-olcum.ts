/**
 * Hücre dizini bellek / kurulum süresi / yurt süresi ölçümü (G3b; docs/06 §15.11). vitest'e GİRMEZ (test klasörlerinde değildir); elle koşturulur.
 * AĞIR iştir (JSON biçimi ~1,2 GB RSS ister): kapı koşarken koşturulmaz; ölçüm kapıyı, kapı ölçümü beklemez (O2 AĞIR kuyruğu).
 *
 *   node --expose-gc --max-old-space-size=6144 --import tsx packages/cekirdek/bench/hucre-dizini-olcum.ts --bicim json   [--uc-ilce] [--oyuncu 20]
 *   node --expose-gc --max-old-space-size=6144 --import tsx packages/cekirdek/bench/hucre-dizini-olcum.ts --bicim izgara [--uc-ilce] [--oyuncu 20]
 *
 * İki biçimde de dünya YALNIZ ölçülen ilçelerden kurulur (mini-6'nın küçük ilçeleri yok; ızgara girdisi karışık dünya kabul etmez).
 * `--bicim json`: ESKİ biçim, f4 `gebzeFiksturu` eşlemesiyle hücre başına nesneli JSON fikstürü (`veri.parsel`). Hem eski ağaçta (hücre dizininden önce)
 *    hem yeni ağaçta koşar; "önce" ölçümü eski ağaçtadır, "sonra" JSON satırı yeni ağaçtaki uyumluluk yolunu gösterir.
 * `--bicim izgara`: YENİ biçim, BHI1 baytları doğrudan (`veri.parselIzgara`); yalnız yeni ağaçta çalışır (eski çekirdek alanı yok sayar).
 * `--uc-ilce`: Gebze yerine Gebze + Körfez (il tr_41 -> m_ova) + Gemlik (il tr_16 -> m_liman); BHI1 dosyaları `packages/veri/haritalar/odbl/izgara/`
 *    (G3/O3 girdisi) altında aranır; `IZGARA_DIZINI` ortam değişkeni başka bir klasör gösterebilir.
 * `--oyuncu N`: yurt ölçümü için ardışık katılan oyuncu sayısı (varsayılan 20).
 *
 * Süreç içi, ağsız, platformdan bağımsızdır (yalnız `node:` modülleri; /proc okumaz). Bellek: `global.gc()` sonrası `process.memoryUsage()` (rss, heapUsed,
 * external + arrayBuffers) ve `process.resourceUsage().maxRSS` (tepe RSS, KB). Süre: iş parçacığı CPU süresi (`process.threadCpuUsage`) + duvar saati;
 * yük ortalaması çıktıya yazılır (paylaşımlı makinede yorumlamak için). Aynı iki biçimin DURUM ÖZETİ aynı olmalıdır (çıktıda `OZET`).
 *
 * Çıktı: okunur satırlar + tek satır `SONUC {json}` (makinece okunur).
 */
import { readFileSync } from "node:fs";
import { loadavg } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { CekirdekVeriPaketi } from "../src/tipler";

// ---- Girdi seçenekleri ---------------------------------------------------------------------------------------------------------------------------------
function secenek(ad: string, varsayilan?: string): string | undefined {
  const i = process.argv.indexOf(`--${ad}`);
  if (i < 0) return varsayilan;
  return process.argv[i + 1] ?? varsayilan;
}
const bicim = secenek("bicim");
if (bicim !== "json" && bicim !== "izgara") {
  console.error("kullanim: --bicim json|izgara [--uc-ilce] [--oyuncu N]");
  process.exit(2);
}
const UC_ILCE = process.argv.includes("--uc-ilce");
const OYUNCU = Number(secenek("oyuncu", "20"));

const gc = (globalThis as unknown as { gc?: () => void }).gc;
if (!gc) {
  console.error("--expose-gc gerekli (bellek ölçümü için)");
  process.exit(2);
}

// ---- BHI1 (bu betik kendi kopyasını taşır: eski ağaçta @bolge/veri/izgara yoktur) ---------------------------------------------------------------------
const ICERIDE = 1;
const YOL = 2;
const SU = 4;
const ASKERI = 8;
const BINA = 16;
interface Izgara {
  x0: number;
  y0: number;
  genislik: number;
  yukseklik: number;
  durum: Uint8Array;
}
function bhiCoz(t: Uint8Array): Izgara {
  const v = new DataView(t.buffer, t.byteOffset, t.byteLength);
  const duzlem = v.getUint16(6, true);
  const genislik = v.getUint32(16, true);
  const yukseklik = v.getUint32(20, true);
  const n = genislik * yukseklik;
  if (t.length !== 24 + n * duzlem) throw new Error("BHI1 boyutu tutarsiz");
  return { x0: v.getUint32(8, true), y0: v.getUint32(12, true), genislik, yukseklik, durum: t.subarray(24, 24 + n) };
}
type Sinif = "kirsal" | "kasaba" | "sehir";
function arsaSinifi(d: number): Sinif {
  const s = (d >> 5) & 7;
  if (s === 3 || s === 5) return "sehir";
  if (s === 2 || (d & BINA) !== 0) return "kasaba";
  return "kirsal";
}

interface IlceGirdisi {
  id: string;
  ad: string;
  il: string;
  ilAd: string;
  bolge: string;
  dosya: string;
  izgara: Izgara;
}

const DEPO = resolve(import.meta.dirname, "..", "..", "..");
function ilceleriOku(): IlceGirdisi[] {
  const dizin = process.env["IZGARA_DIZINI"] ?? join(DEPO, "packages", "veri", "haritalar", "odbl", "izgara");
  const liste: Omit<IlceGirdisi, "izgara">[] = UC_ILCE
    ? [
        { id: "tr_41_gebze", ad: "Gebze", il: "tr_41", ilAd: "Kocaeli", bolge: "m_ova", dosya: join(DEPO, "packages", "veri", "haritalar", "odbl", "ornek", "gebze-hucreler.bhi.gz") },
        { id: "tr_41_korfez", ad: "Korfez", il: "tr_41", ilAd: "Kocaeli", bolge: "m_ova", dosya: join(dizin, "tr_41_korfez.bhi.gz") },
        { id: "tr_16_gemlik", ad: "Gemlik", il: "tr_16", ilAd: "Bursa", bolge: "m_liman", dosya: join(dizin, "tr_16_gemlik.bhi.gz") },
      ]
    : [{ id: "tr_41_gebze", ad: "Gebze", il: "tr_41", ilAd: "Kocaeli", bolge: "m_ova", dosya: join(DEPO, "packages", "veri", "haritalar", "odbl", "ornek", "gebze-hucreler.bhi.gz") }];
  return liste.map((c) => ({ ...c, izgara: bhiCoz(new Uint8Array(gunzipSync(readFileSync(c.dosya)))) }));
}

/** f4 `gebzeFiksturu` eşlemesi (satır öncelikli, engel su > askeri > yol). */
function jsonFikstur(girdiler: IlceGirdisi[]) {
  const taban = parselFiksturuYukle("mini-6");
  const ilIds = new Set(girdiler.map((g) => g.il));
  const ilceler = girdiler.map((g) => {
    const iz = g.izgara;
    const hucreler: { id: string; sinif: Sinif; uygun: boolean; engel?: "su" | "askeri" | "yol" }[] = [];
    let uygun = 0;
    let enYuksek = 0;
    const sira = { kirsal: 0, kasaba: 1, sehir: 2 } as const;
    for (let dy = 0; dy < iz.yukseklik; dy++)
      for (let dx = 0; dx < iz.genislik; dx++) {
        const d = iz.durum[dy * iz.genislik + dx] as number;
        if (!(d & ICERIDE)) continue;
        const id = `${iz.x0 + dx}:${iz.y0 + dy}`;
        const sinif = arsaSinifi(d);
        enYuksek = Math.max(enYuksek, sira[sinif]);
        const engel = d & SU ? "su" : d & ASKERI ? "askeri" : d & YOL ? "yol" : undefined;
        if (engel) hucreler.push({ id, sinif, uygun: false, engel });
        else {
          uygun++;
          hucreler.push({ id, sinif, uygun: true });
        }
      }
    const sinif = (["kirsal", "kasaba", "sehir"] as const)[enYuksek] as Sinif;
    return { id: g.id, ad: g.ad, il: g.il, bolge: g.bolge, sinif, seviye: (sinif === "sehir" ? 3 : sinif === "kasaba" ? 1 : 0) as 0 | 1 | 3, hucreSayisi: hucreler.length, uygunHucre: uygun, hucreler };
  });
  return {
    ...taban,
    ad: "olcum-json",
    iller: [...ilIds].map((id) => ({ id, ad: (girdiler.find((g) => g.il === id) as IlceGirdisi).ilAd, bolge: (girdiler.find((g) => g.il === id) as IlceGirdisi).bolge })),
    ilceler,
  };
}
function izgaraGirdisi(girdiler: IlceGirdisi[]) {
  const taban = parselFiksturuYukle("mini-6");
  const iller: { id: string; ad: string; bolge: string }[] = [];
  for (const g of girdiler) if (!iller.some((i) => i.id === g.il)) iller.push({ id: g.il, ad: g.ilAd, bolge: g.bolge });
  return {
    ad: "olcum-izgara",
    harita: taban.harita,
    tohum: taban.tohum,
    iller,
    ilceler: girdiler.map((g) => ({ id: g.id, ad: g.ad, il: g.il, bolge: g.bolge, izgara: g.izgara })),
  };
}

// ---- Ölçüm ----------------------------------------------------------------------------------------------------------------------------------------------
const MB = 1024 * 1024;
function bellek(etiket: string): Record<string, number> {
  gc?.();
  gc?.();
  const m = process.memoryUsage();
  const r = { rssMB: Math.round(m.rss / MB), heapMB: Math.round(m.heapUsed / MB), harici_MB: Math.round((m.external + m.arrayBuffers) / MB), tepeRssMB: Math.round(process.resourceUsage().maxRSS / 1024) };
  console.log(`BELLEK ${etiket}: rss ${r.rssMB} MB, heapUsed ${r.heapMB} MB, external ${r.harici_MB} MB, tepe RSS ${r.tepeRssMB} MB`);
  return r;
}
const cpu = (): number => {
  const u = process.threadCpuUsage();
  return (u.user + u.system) / 1000;
};

console.log(`ORTAM node ${process.version} ${process.platform}/${process.arch}; yuk ortalamasi basta ${loadavg().map((x) => x.toFixed(2)).join(" ")}`);
const m0 = bellek("baslangic");
const girdiler = ilceleriOku();
const hucreToplam = girdiler.reduce((a, g) => a + g.izgara.durum.reduce((s, b) => s + (b & ICERIDE), 0), 0);
console.log(`GIRDI ${girdiler.map((g) => `${g.id} ${g.izgara.genislik}x${g.izgara.yukseklik}`).join(", ")}; icerideki hucre ${hucreToplam}`);
const m1 = bellek("izgaralar okundu");

const veri: CekirdekVeriPaketi = miniVeriyiYukle();
let tFikstur = 0;
if (bicim === "json") {
  const t = cpu();
  veri.parsel = jsonFikstur(girdiler) as unknown as CekirdekVeriPaketi["parsel"];
  tFikstur = cpu() - t;
  console.log(`SURE json fikstur uretimi (f4 eslemesi): ${tFikstur.toFixed(0)} ms CPU`);
} else {
  (veri as unknown as Record<string, unknown>)["parselIzgara"] = izgaraGirdisi(girdiler);
  delete veri.parsel;
}
const m2 = bellek("girdi hazir");

const w0 = performance.now();
const c0 = cpu();
const sim = Simulasyon.olustur(veri, 7);
const kurCpu = cpu() - c0;
const kurDuvar = performance.now() - w0;
console.log(`SURE Simulasyon.olustur (derle + dunya): ${kurCpu.toFixed(0)} ms CPU, ${kurDuvar.toFixed(0)} ms duvar`);
const m3 = bellek("Simulasyon.olustur sonrasi");

// Yurt: ardışık oyuncu_katil (BHI1 yolunda yurt arama maliyeti = bedava yurt seçimi `kumeSec` dahil).
const yurtCpu: number[] = [];
const yurtDuvar: number[] = [];
const ilceId = (girdiler[0] as IlceGirdisi).id;
let tamam = 0;
for (let i = 0; i < OYUNCU; i++) {
  const w = performance.now();
  const c = cpu();
  const r = sim.uygula({ t: sim.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: `olcum-${i}`, bolgeler: [], ilce: ilceId } });
  yurtCpu.push(cpu() - c);
  yurtDuvar.push(performance.now() - w);
  if (r.tamam) tamam++;
}
const pct = (a: number[], p: number): number => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)] as number;
const yurt = { oyuncu: OYUNCU, tamam, cpuMs: { p50: pct(yurtCpu, 0.5), p95: pct(yurtCpu, 0.95), max: Math.max(...yurtCpu) }, duvarMs: { p50: pct(yurtDuvar, 0.5), p95: pct(yurtDuvar, 0.95), max: Math.max(...yurtDuvar) } };
console.log(
  `SURE yurt (oyuncu_katil, ${ilceId}, ${OYUNCU} ardisik): tamam ${tamam}; CPU p50 ${yurt.cpuMs.p50.toFixed(1)} ms, p95 ${yurt.cpuMs.p95.toFixed(1)} ms, en yuksek ${yurt.cpuMs.max.toFixed(1)} ms; duvar p95 ${yurt.duvarMs.p95.toFixed(1)} ms`,
);
const m4 = bellek("yurtlar sonrasi");
const ozet = sim.durumOzeti();
console.log(`OZET ${ozet}`);
console.log(`ORTAM yuk ortalamasi sonda ${loadavg().map((x) => x.toFixed(2)).join(" ")}`);
console.log(
  `SONUC ${JSON.stringify({ bicim, ucIlce: UC_ILCE, hucre: hucreToplam, bellek: { baslangic: m0, izgaraOkundu: m1, girdiHazir: m2, kurulumSonrasi: m3, yurtSonrasi: m4 }, sureMs: { fikstur: Math.round(tFikstur), kurulumCpu: Math.round(kurCpu), kurulumDuvar: Math.round(kurDuvar) }, yurt, ozet, yuk: loadavg() })}`,
);

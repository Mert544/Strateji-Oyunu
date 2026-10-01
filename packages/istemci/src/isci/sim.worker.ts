/**
 * Simülasyon işçisi: @bolge/cekirdek + @bolge/botlar tarayıcıda (Web Worker) çalışır. 4 bot (sanayici, tüccar,
 * lojistikçi, militarist) oynar; oyuncu izler. Dünya hızı: sim saniyesi / gerçek saniye. Her sim-saatte bir
 * gözlem alınır; ana iş parçacığına en çok ~2,5 kare/sn gönderilir (yapısal kopya maliyetini sınırlamak için).
 *
 * Çekirdek koduna dokunulmaz; bot koşucusu (`kos`) mevcut simülasyonla, saat sınırlarına kadar çağrılarak
 * parça parça sürülür (karar anları 6 saatlik ızgarada, koşucu tarafından verilir).
 */
import { SAAT, Simulasyon } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import type { ArketipAdi, KosuOyuncusu } from "@bolge/botlar";
import { dizinKur, kareAl } from "./kare";
import { hataMetni, veriPaketiniHazirla } from "./veri-hazirla";
import type { IsciMesaji, IsciyeMesaj, IsciVeriPaketi } from "./protokol";
import type { Kare } from "../veri/kare-tipleri";

interface IsciKapsami {
  postMessage(m: IsciMesaji): void;
  onmessage: ((e: MessageEvent<IsciyeMesaj>) => void) | null;
}
const kapsam = self as unknown as IsciKapsami;

let sim: Simulasyon | null = null;
let veri: IsciVeriPaketi | null = null;
let tohum = 1;
let oyuncular: KosuOyuncusu[] = [];
let idler: string[] = [];
let hiz = 21600;
let duraklat = false;
let hedefMs = 0;
let sonGercek = 0;
let sonKare: Kare | null = null;
let sonKareGonderilen = -1;
let sonKareGonderimGercek = 0;
let sonGozlemSaat = -1;
let zamanlayici: ReturnType<typeof setInterval> | null = null;
let adimMs = 0;
let gerideMi = false;

function baslat(m: Extract<IsciyeMesaj, { tur: "baslat" }>): void {
  veri = m.veri;
  // Tarım alanı JSON'da yoksa Node yükleyicisiyle aynı kuralla türetilir ve paket doğrulanır; hata arayüze iletilir.
  const hazir = veriPaketiniHazirla(veri);
  if (!hazir.tamam) {
    kapsam.postMessage({ tur: "hata", mesaj: hataMetni(hazir.hatalar) });
    return;
  }
  tohum = m.tohum;
  hiz = m.hiz;
  duraklat = m.duraklat;
  const devletBolge = new Map<string, string[]>();
  for (const d of veri.harita.devletler) devletBolge.set(d.id, []);
  for (const b of veri.harita.bolgeler) devletBolge.get(b.devlet)?.push(b.id);
  const devletler = veri.harita.devletler.slice(0, m.botlar.length);
  if (devletler.length < m.botlar.length) throw new Error("haritada bot sayisindan az devlet var");
  oyuncular = devletler.map((d, i) => ({
    id: `o${i}`,
    bolgeler: devletBolge.get(d.id) ?? [],
    bot: botOlustur(m.botlar[i] as ArketipAdi, `o${i}`, tohum),
    katilmaMs: 0,
  }));
  idler = oyuncular.map((o) => o.id);
  sim = Simulasyon.olustur(veri, tohum);
  hedefMs = 0;
  sonGozlemSaat = -1;
  sonKare = null;
  sonKareGonderilen = -1;
  // İlk adım: t=0'da katılım, karar ve gözlem.
  adimAt(0);
  // Test/ölçüm için: ilk kare gösterilmeden önce eşzamanlı ileri sarma (ör. iklim olaylarını yakalamak için).
  const ileri = Math.max(0, Math.floor(m.ileriSaat ?? 0));
  for (let h = 1; h <= ileri; h++) adimAt(h * SAAT);
  hedefMs = sim.dunya.zaman;
  kapsam.postMessage({ tur: "hazir", dizin: dizinKur(sim, m.botlar) });
  kareyiGonder(true);
  sonGercek = performance.now();
  if (zamanlayici !== null) clearInterval(zamanlayici);
  zamanlayici = setInterval(dongu, 50);
}

/** Simülasyonu en fazla bir sim-saat ilerletir (mevcut zamandan hedefe kadar; hedef saat katı olmalı). */
function adimAt(sinirMs: number): void {
  if (!sim || !veri) return;
  kos({
    veri,
    tohum,
    oyuncular,
    sureMs: sinirMs,
    gozlemAraligiMs: SAAT,
    sim,
    gozlem: (s, t) => {
      const saat = Math.round(t / SAAT);
      if (saat === sonGozlemSaat) return; // kos() her çağrının başında aynı anı yeniden gözler
      sonGozlemSaat = saat;
      sonKare = kareAl(s, idler);
    },
  });
}

function kareyiGonder(zorla: boolean): void {
  if (!sonKare || !sim) return;
  const simdi = performance.now();
  if (!zorla && (sonKare.saat === sonKareGonderilen || simdi - sonKareGonderimGercek < 400)) return;
  sonKareGonderilen = sonKare.saat;
  sonKareGonderimGercek = simdi;
  kapsam.postMessage({ tur: "kare", kare: sonKare, simMs: sim.dunya.zaman });
}

let sonZamanBildirimi = 0;

function dongu(): void {
  if (!sim) return;
  const simdi = performance.now();
  const dt = Math.min(0.5, (simdi - sonGercek) / 1000);
  sonGercek = simdi;
  const t0 = simdi;
  if (!duraklat) {
    // Sim hedefi: gerçek süre * hız; işçi geride kalırsa birikimi sınırla (en çok 12 sim-saat öne).
    hedefMs += dt * hiz * 1000;
    const az = sim.dunya.zaman + 12 * SAAT;
    gerideMi = hedefMs > az;
    if (gerideMi) hedefMs = az;
    // Saat sınırlarında ilerle; bir turda en çok ~35 ms harca.
    for (;;) {
      const t = sim.dunya.zaman;
      const sonraki = t + SAAT;
      if (sonraki > hedefMs) break;
      adimAt(sonraki);
      if (performance.now() - t0 > 35) break;
    }
    adimMs = performance.now() - t0;
  }
  kareyiGonder(false);
  if (simdi - sonZamanBildirimi >= 120) {
    sonZamanBildirimi = simdi;
    kapsam.postMessage({ tur: "zaman", simMs: Math.min(hedefMs, sim.dunya.zaman + SAAT), hiz, duraklat, gerideMi, adimMs });
  }
}

kapsam.onmessage = (e): void => {
  const m = e.data;
  try {
    if (m.tur === "baslat") baslat(m);
    else if (m.tur === "hiz") hiz = m.hiz;
    else if (m.tur === "duraklat") {
      duraklat = m.duraklat;
      if (!duraklat) sonGercek = performance.now();
    }
  } catch (err) {
    kapsam.postMessage({ tur: "hata", mesaj: err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err) });
  }
};

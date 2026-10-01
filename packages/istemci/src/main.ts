/**
 * Bölge Stratejisi 3B istemci (Katman A): three.js ile stilize Dünya küresi.
 * Simülasyon Web Worker'da (inline blob) çalışır; ana iş parçacığı yalnızca çizim, kamera ve arayüzle ilgilenir.
 */
import "./arayuz/stil.css";
import SimIsci from "./isci/sim.worker?worker&inline";
import icerik from "../../veri/icerik/icerik.json";
import param from "../../veri/icerik/parametreler.json";
import dunyaTopo from "./veri/dunya-ulkeler.topo.json";
import type { HaritaDosyasi, IcerikDosyasi, Parametreler } from "@bolge/veri";
import { Etiketler } from "./arayuz/etiketler";
import { Panel } from "./arayuz/panel";
import { Sahne } from "./kure/sahne";
import { slerp } from "./kure/matematik";
import type { Vek3 } from "./kure/matematik";
import { ulkeleriCoz } from "./veri/cografya";
import type { TopoVeri } from "./veri/cografya";
import { haritaYukle } from "./veri/yukleyici";
import type { Dizin, Kare } from "./veri/kare-tipleri";
import type { IsciMesaji, IsciyeMesaj } from "./isci/protokol";

const BOTLAR = ["sanayici", "tuccar", "lojistikci", "militarist"];
const VARSAYILAN_HIZ = 21600;

declare global {
  interface Window {
    /** Ölçüm/hata ayıklama kancası (Playwright doğrulaması). */
    __olcum?: {
      bilgi: () => ReturnType<Sahne["olcum"]>;
      sahne: Sahne;
      kare: () => Kare | null;
      simSaat: () => number;
      bolgeSec: (i: number, uc?: boolean) => void;
      malSec: (m: number) => void;
      /** "Tarım" harita görünümünü aç/kapat. */
      tarim: (a: boolean) => void;
      hiz: (h: number) => void;
      duraklat: (d: boolean) => void;
      sekme: (s: string) => void;
      hazir: () => boolean;
      karaSayisi: () => number;
    };
  }
}

function hataGoster(mesaj: string): void {
  const k = document.getElementById("hata-kutusu");
  if (!k) return;
  k.hidden = false;
  k.textContent = mesaj;
}

function temaKur(onDegisti: () => void): () => void {
  const anahtar = "bolge-dunya-tema";
  const sira = ["auto", "light", "dark"] as const;
  let simdi: (typeof sira)[number] = "auto";
  try {
    const k = localStorage.getItem(anahtar);
    if (k === "light" || k === "dark") simdi = k;
  } catch {
    /* depolama kapalı olabilir */
  }
  const uygula = (): void => {
    if (simdi === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", simdi);
    const d = document.getElementById("tema");
    if (d) {
      d.textContent = simdi === "auto" ? "◐" : simdi === "light" ? "☀" : "☾";
      d.title = `Tema: ${simdi === "auto" ? "otomatik" : simdi === "light" ? "açık" : "koyu"} (değiştirmek için dokunun)`;
    }
  };
  uygula();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (simdi === "auto") onDegisti();
  });
  return () => {
    simdi = sira[(sira.indexOf(simdi) + 1) % sira.length] as (typeof sira)[number];
    try {
      localStorage.setItem(anahtar, simdi);
    } catch {
      /* yoksay */
    }
    uygula();
    onDegisti();
  };
}

function baslat(): void {
  const q = new URLSearchParams(location.search);
  const mobil = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
  const temaDegistir = temaKur(() => sahne?.temaUygula());
  const harita = haritaYukle();
  const karalar = ulkeleriCoz(dunyaTopo as unknown as TopoVeri);
  const canvas = document.getElementById("sahne") as HTMLCanvasElement;
  const kap = document.getElementById("sahne-kap") as HTMLElement;

  let sahne: Sahne | null = null;
  try {
    sahne = new Sahne(
      kap,
      canvas,
      harita,
      karalar,
      { bolgeSec: (i) => olaySec(i, false) },
      { adaptif: q.get("adaptif") !== "0", mobil },
    );
  } catch (e) {
    hataGoster("3B çizim başlatılamadı (WebGL2 gerekli). " + (e instanceof Error ? e.message : String(e)));
    document.getElementById("yukleme")?.classList.add("bitti");
    return;
  }
  const s = sahne;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    hataGoster("WebGL bağlamı kayboldu (GPU sıfırlandı veya bellek doldu). Sayfayı yenileyin.");
  });

  const isci = new SimIsci();
  const isciyeGonder = (m: IsciyeMesaj): void => isci.postMessage(m);

  // --- zaman durumu ---
  let hiz = Number(q.get("hiz")) || VARSAYILAN_HIZ;
  let duraklat = q.get("duraklat") === "1";
  let simMsAlinan = 0;
  let alinanGercek = performance.now();
  let gerideMi = false;
  let sonKare: Kare | null = null;
  let dizin: Dizin | null = null;
  let ilkKare = false;

  // Görünen sim saati tekdüze artar (işçi zaman bildirimi gelince geriye sıçramaz).
  let enYuksekSaat = 0;
  const gorunenSaat = (): number => {
    const gecen = duraklat ? 0 : Math.min(3 * 3600, ((performance.now() - alinanGercek) / 1000) * hiz);
    enYuksekSaat = Math.max(enYuksekSaat, (simMsAlinan / 1000 + gecen) / 3600);
    return enYuksekSaat;
  };
  s.simSaatiKaynagi = gorunenSaat;

  const bolgeAd = (i: number): string => harita.harita.bolgeler[i]?.ad ?? "?";
  const panel: Panel = new Panel(
    {
      malSec: (m) => {
        s.malSec(m);
        panel.malAyarla(m);
      },
      bolgeSec: (i, uc) => olaySec(i, uc),
      tarimGorunum: (a) => tarimSec(a),
      kenareUc: (k) => {
        const e = dizin?.kenarlar[k];
        if (!e) return;
        const a = s.merkezler[e.a] as Vek3, b = s.merkezler[e.b] as Vek3;
        const m = slerp(a, b, 0.5);
        const ac = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
        s.kontrol.ucusYap({ p: m, dist: Math.min(1.2, Math.max(0.15, ac * 2.6)) });
      },
      hiz: (h) => {
        hiz = h;
        isciyeGonder({ tur: "hiz", hiz: h });
      },
      duraklat: (d) => {
        duraklat = d;
        alinanGercek = performance.now();
        isciyeGonder({ tur: "duraklat", duraklat: d });
      },
      kuzey: () => s.kontrol.kuzeyYukari(),
      dunya: () => s.dunyayiGoster(),
      tema: temaDegistir,
    },
    bolgeAd,
    harita.atif,
    harita.gecici,
  );
  panel.hizAyarla(hiz, false);
  panel.duraklatAyarla(duraklat, false);

  function tarimSec(a: boolean): void {
    s.tarimGorunumuAyarla(a);
    panel.tarimGorunumAyarla(a);
  }

  function olaySec(i: number, uc: boolean): void {
    s.bolgeSec(i);
    panel.bolgeAyarla(i);
    if (uc && i >= 0) s.bolgeyeUc(i);
  }

  const etiketler = new Etiketler(
    document.getElementById("etiketler") as HTMLElement,
    () => harita.harita.bolgeler.map((b) => b.ad),
    s.merkezler,
    harita.harita.bolgeler.map((b) => b.nufus),
  );
  let sonZamanYazim = 0;
  s.cizimSonrasi = () => {
    const simdi = performance.now();
    etiketler.guncelle(s.kontrol, panel.secili, simdi);
    if (simdi - sonZamanYazim > 200) {
      sonZamanYazim = simdi;
      panel.zamanYaz(gorunenSaat(), gerideMi);
    }
  };

  isci.onmessage = (e: MessageEvent<IsciMesaji>): void => {
    const m = e.data;
    switch (m.tur) {
      case "hazir":
        dizin = m.dizin;
        s.dizinKur(m.dizin);
        panel.dizinKur(m.dizin);
        break;
      case "kare":
        sonKare = m.kare;
        if (!ilkKare) simMsAlinan = m.simMs;
        s.kareUygula(m.kare);
        panel.kareYaz(m.kare);
        if (!ilkKare) {
          ilkKare = true;
          if (q.get("acilis") !== "0") s.acilisUcusu();
          document.getElementById("yukleme")?.classList.add("bitti");
        }
        break;
      case "zaman":
        simMsAlinan = m.simMs;
        alinanGercek = performance.now();
        gerideMi = m.gerideMi;
        break;
      case "hata":
        hataGoster("Simülasyon işçisi hatası:\n" + m.mesaj);
        document.getElementById("yukleme")?.classList.add("bitti");
        break;
    }
  };
  isci.onerror = (e: ErrorEvent): void => hataGoster("İşçi hatası: " + e.message);

  isciyeGonder({
    tur: "baslat",
    veri: { harita: harita.harita as HaritaDosyasi, icerik: icerik as unknown as IcerikDosyasi, param: param as unknown as Parametreler },
    tohum: Number(q.get("tohum")) || 1,
    botlar: BOTLAR,
    hiz,
    duraklat,
    ileriSaat: Number(q.get("ileri")) || 0,
  });

  window.__olcum = {
    bilgi: () => s.olcum(),
    sahne: s,
    kare: () => sonKare,
    simSaat: gorunenSaat,
    bolgeSec: (i, uc) => olaySec(i, uc === true),
    malSec: (m) => {
      s.malSec(m);
      panel.malAyarla(m);
    },
    tarim: (a) => tarimSec(a),
    hiz: (h) => {
      panel.hizAyarla(h, true);
    },
    duraklat: (d) => panel.duraklatAyarla(d, true),
    sekme: (x) => panel.sekmeSec(x as never),
    hazir: () => ilkKare,
    karaSayisi: () => s.dunya.istatistik.karaUcgen,
  };

  s.baslat();
  // Gizli kalan sekmede veya çok yavaş cihazda yükleme perdesini sonsuza dek tutma.
  window.setTimeout(() => document.getElementById("yukleme")?.classList.add("bitti"), 15000);
}

window.addEventListener("error", (e) => hataGoster("Hata: " + e.message));
window.addEventListener("unhandledrejection", (e) => hataGoster("Hata: " + String(e.reason)));
try {
  baslat();
} catch (e) {
  hataGoster("Başlatma hatası: " + (e instanceof Error ? e.message + "\n" + (e.stack ?? "") : String(e)));
}

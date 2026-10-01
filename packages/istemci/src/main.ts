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
import { bildir } from "./arayuz/bildirim";
import { devletKartlari, devletSecimiHtml, secimBelirteci, secimCoz } from "./arayuz/devlet-sec";
import { Etiketler } from "./arayuz/etiketler";
import { Panel } from "./arayuz/panel";
import { hataCevir } from "./komut/hata";
import { komutOzeti } from "./komut/kayit";
import { icerikTablosu } from "./komut/tablo";
import type { Komut, OzetBaglami } from "./komut/tipler";
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
      /** Oyuncunun devlet indeksi (-1: yalnızca izleme; yok: henüz seçilmedi). */
      devlet: () => number;
      /** Komutu işçiye gönderir (arayüzdeki gönderimle aynı yol). */
      komut: (k: Komut) => void;
      /** Bölge kimliğinden indeks (bilinmiyorsa -1). */
      bolgeIndeksi: (id: string) => number;
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

  let devletAcici: () => void = () => undefined;
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
      komutGonder: (k) => komutGonder(k),
      formHata: (m) => bildir(m, "hata"),
      oneriIste: () => isciyeGonder({ tur: "oneriIste" }),
      devletSec: () => devletAcici(),
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
      case "komutSonuc": {
        const o = ozetBaglami();
        if (!o) break;
        if (m.sonuc.tamam) {
          bildir(`Tamam — ${komutOzeti(m.komut, o)}.`, "tamam");
          isciyeGonder({ tur: "oneriIste" });
        } else bildir(`Olmadı: ${hataCevir(m.sonuc.hata, o)}`, "hata");
        break;
      }
      case "oneriler":
        panel.oneriYaz(m.liste);
        break;
      case "kare":
        sonKare = m.kare;
        if (!ilkKare) simMsAlinan = m.simMs;
        s.kareUygula(m.kare);
        panel.kareYaz(m.kare);
        if (!ilkKare) {
          ilkKare = true;
          if (q.get("acilis") !== "0") {
            // Oyuncu kipinde açılış uçuşu kendi bölgelerine gider (seçim yapmadan: Devlet sekmesi açık kalır).
            const ilk = benim >= 0 ? m.kare.bolgeler.findIndex((b) => b.sahip === benim) : -1;
            if (ilk >= 0) s.bolgeyeUc(ilk);
            else s.acilisUcusu();
          }
          if (benim >= 0) isciyeGonder({ tur: "oneriIste" });
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

  // --- devlet seçimi ve komutlar ---
  const veriPaketi = { harita: harita.harita as HaritaDosyasi, icerik: icerik as unknown as IcerikDosyasi, param: param as unknown as Parametreler };
  const ic = icerikTablosu(veriPaketi.icerik, veriPaketi.param);
  const devletIdler = veriPaketi.harita.devletler.map((d) => d.id);
  let benim = -2; // -2: henüz seçilmedi, -1: yalnızca izle, >= 0: yönetilen devlet
  let komutNo = 0;
  const ozetBaglami = (): OzetBaglami | null => (dizin ? { ic, dizin, bolgeAd } : null);

  function komutGonder(k: Komut): void {
    if (benim < 0) {
      bildir("Yalnızca izliyorsunuz: komut vermek için bir devlet seçin.", "hata");
      return;
    }
    isciyeGonder({ tur: "komut", id: ++komutNo, komut: k });
  }

  function oyunuBaslat(devlet: number): void {
    benim = devlet;
    if (devlet >= 0) panel.oyunuKur(ic);
    document.getElementById("yukleme")?.classList.remove("bitti");
    isciyeGonder({ tur: "baslat", veri: veriPaketi, tohum: Number(q.get("tohum")) || 1, botlar: BOTLAR, hiz, duraklat, ileriSaat: Number(q.get("ileri")) || 0, oyuncuDevlet: devlet });
  }

  function belirteciYaz(idx: number): void {
    const t = secimBelirteci(idx, devletIdler);
    try {
      history.replaceState(null, "", `#${t}`);
    } catch {
      location.hash = t;
    }
  }

  /** "Devlet seç" katmanı: ilk açılışta (oyun başlamadan) ya da oyundayken (seçince sayfa yeniden yüklenir). */
  function devletKatmaniAc(oyunda: boolean): void {
    const kat = document.getElementById("devlet-sec") as HTMLElement;
    kat.innerHTML = devletSecimiHtml(devletKartlari(veriPaketi.harita, veriPaketi.icerik), oyunda);
    kat.hidden = false;
    document.body.classList.add("secim-acik");
    kat.onclick = (e): void => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-devlet-kapat]")) {
        kat.hidden = true;
        document.body.classList.remove("secim-acik");
        return;
      }
      const d = t.closest("[data-devlet]") as HTMLElement | null;
      if (!d) return;
      const idx = Number(d.dataset["devlet"]);
      belirteciYaz(idx);
      kat.hidden = true;
      document.body.classList.remove("secim-acik");
      if (oyunda) location.reload();
      else oyunuBaslat(idx);
    };
    (kat.querySelector("[data-devlet]") as HTMLElement | null)?.focus();
  }
  devletAcici = () => devletKatmaniAc(benim !== -2);

  const secim = secimCoz(location.hash, location.search, devletIdler);
  if (secim === null) {
    document.getElementById("yukleme")?.classList.add("bitti");
    devletKatmaniAc(false);
  } else oyunuBaslat(secim);

  // Önerilen eylemler: oyuncu kipinde, panel görünürken birkaç saniyede bir yenilenir.
  window.setInterval(() => {
    if (benim >= 0 && ilkKare && !document.hidden && !document.querySelector("#sekme-icerik select:focus, #sekme-icerik input:focus")) isciyeGonder({ tur: "oneriIste" });
  }, 7000);

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
    devlet: () => benim,
    komut: (k) => komutGonder(k),
    bolgeIndeksi: (id) => harita.harita.bolgeler.findIndex((b) => b.id === id),
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

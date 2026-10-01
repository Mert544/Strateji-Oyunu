/**
 * Bölge Stratejisi 3B istemci (Katman A): three.js ile stilize Dünya küresi.
 * Simülasyon Web Worker'da (inline blob) çalışır; ana iş parçacığı yalnızca çizim, kamera ve arayüzle ilgilenir.
 */
import "./tasarim/tema.css";
import "./tasarim/temel.css";
import "./arayuz/stil.css";
import { ikonlariKur } from "./tasarim/ikon-veri";
import { ikon } from "./tasarim/ikon";
import SimIsci from "./isci/sim.worker?worker&inline";
import icerik from "../../veri/icerik/icerik.json";
import param from "../../veri/icerik/parametreler.json";
// Küre için kaba ülke katmanı (tek dosya bütçesi); haritanın 50m "dış kara"sı harita.js'te
import dunyaTopo from "./veri/dunya-ulkeler-kure.topo.json";
import type { HaritaDosyasi, IcerikDosyasi, Parametreler } from "@bolge/veri";
import { bildir } from "./arayuz/bildirim";
import { devletKartlari, devletSecimiHtml, secimBelirteci, secimCoz } from "./arayuz/devlet-sec";
import { Etiketler } from "./arayuz/etiketler";
import { Panel } from "./arayuz/panel";
import { hataCevir } from "./komut/hata";
import { komutOzeti } from "./komut/kayit";
import { icerikTablosu } from "./komut/tablo";
import type { Komut, OzetBaglami } from "./komut/tipler";
import { HaritaDenetci } from "./harita/denetci";
import { Sahne } from "./kure/sahne";
import type { Mercek } from "./veri/mercek";
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
      /** "mal" merceği (m < 0: Genel). */
      malSec: (m: number) => void;
      /** "Tarım" merceğini aç/kapat (kapatınca Genel). */
      tarim: (a: boolean) => void;
      /** Mercek seç (tek mercek etkin). */
      mercek: (m: Mercek, mal?: number) => void;
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
      d.innerHTML = ikon(simdi === "auto" ? "sun-moon" : simdi === "light" ? "sun" : "moon", 20);
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

/** Yükleme ekranı: adımlı ince ilerleme (Veri · Küre · Kurallar · Hazır); sürekli dönen gösterge yok. */
function yuklemeAdimi(oran: number, metin: string): void {
  const y = document.getElementById("yukleme");
  if (!y) return;
  y.style.setProperty("--ilerleme", String(oran));
  const a = y.querySelector(".yk-adim");
  if (a) a.textContent = metin;
}

function baslat(): void {
  ikonlariKur();
  yuklemeAdimi(0.15, "Veri hazırlanıyor…");
  const q = new URLSearchParams(location.search);
  const mobil = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
  let haritaDenetci: HaritaDenetci | null = null;
  const temaDegistir = temaKur(() => {
    sahne?.temaUygula();
    haritaDenetci?.temaUygula();
  });
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

  yuklemeAdimi(0.55, "Kurallar yükleniyor…");
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
      mercekSec: (m, mal) => mercekSec(m, mal),
      bolgeSec: (i, uc) => olaySec(i, uc),
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
  s.bitenler = panel.bitenler;

  /** Tek mercek etkin: sahne ve panel birlikte güncellenir. */
  function mercekSec(m: Mercek, mal = -1): void {
    const hedef: Mercek = m === "mal" && mal < 0 ? "genel" : m;
    s.mercekSec(hedef, mal);
    panel.mercekAyarla(hedef, mal);
  }

  function olaySec(i: number, uc: boolean): void {
    s.bolgeSec(i);
    panel.bolgeAyarla(i);
    if (uc && i >= 0) s.bolgeyeUc(i);
    haritaDenetci?.bolgeAyarla(harita.harita.bolgeler[i]?.id ?? null);
  }

  // Strateji haritası (L1–L3, MapLibre tembel yüklenir): kırıntı yolu, arama, küre ↔ harita geçişi.
  haritaDenetci = new HaritaDenetci(kap, {
    canvas,
    bolgeIsin: (x, y) => s.bolgeIsin(x, y),
    isin: (x, y) => s.kontrol.isin(x, y),
    bolgeKimligi: (i) => harita.harita.bolgeler[i]?.id ?? null,
    bolgeyeDon: (kimlik) => olaySec(kimlik ? harita.harita.bolgeler.findIndex((b) => b.id === kimlik) : -1, kimlik !== null),
    kureyiAskiyaAl: (a) => {
      s.askida = a;
    },
    mulkPaneli: (p) => {
      panel.mulkKipiKur(p);
      // Mülk kipinde küre güneşi mutlak saatte (epoch + t, sunucunun zamanı); çevrimdışı demo eski varsayımla kalır
      if (sahne)
        sahne.mutlakZamanKaynagi = () => {
          const h = p.simSaat();
          return h === null ? null : p.epochMs() + h * 3_600_000;
        };
      // Küredeki mülk işaretleri: oyuncunun hücresi olan ilçelerin merkezleri (hiyerarşi bellekte; yalnız mülk kipinde)
      const isaretle = (): void => {
        const oz = document.hidden ? null : window.__harita?.baglanti()?.ozet?.();
        if (!oz) return;
        void import("./harita/veri").then(({ hiyerarsiYukle }) =>
          hiyerarsiYukle().then((h) => s.mulkIsaretleriAyarla(oz.ilceHucre.flatMap(([k, n]) => (n > 0 && h.ilceler.get(k) ? [h.ilceler.get(k)!.merkez] : [])))),
        );
      };
      isaretle();
      window.setInterval(isaretle, 1500);
    },
  });

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
        yuklemeAdimi(0.85, "Dünya hazırlanıyor…");
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
        // Önce panel: biten inşaat izleyicisi güncellenir, sahne rozetleri aynı haritayı okur.
        panel.kareYaz(m.kare);
        s.kareUygula(m.kare);
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
    s.oyuncuAyarla(devlet);
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
  // Mülk kipi (sunucu bağlı ya da ?yerles=1): "Devlet seç" gösterilmez; giriş Yerleş ekranıyla başlar (bölge kipinde kalır).
  const mulkKipi = q.has("sunucu") || q.get("yerles") === "1";
  if (mulkKipi) document.body.classList.add("mulk-kipi");
  s.mulkKipiAyarla(mulkKipi);
  devletAcici = () => {
    if (mulkKipi) bildir("Mülk kipinde devlet seçilmez: haritadan arsa alıp yapı kurarsın.", "bilgi");
    else devletKatmaniAc(benim !== -2);
  };

  const secim = secimCoz(location.hash, location.search, devletIdler);
  if (mulkKipi) {
    // Küre yalnız izlenir (bölge simülasyonu arka planda); oyun haritada ve sunucudadır.
    oyunuBaslat(-1);
    void haritaDenetci.mulkBaslat(q.get("yerles") === "1");
  } else if (secim === null) {
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
    malSec: (m) => mercekSec("mal", m),
    tarim: (a) => mercekSec(a ? "tarim" : "genel"),
    mercek: (m, mal) => mercekSec(m, mal ?? -1),
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

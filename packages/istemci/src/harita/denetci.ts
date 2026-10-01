/**
 * Harita denetçisi (ilk yükte gelen küçük parça): kırıntı yolu, aksan duyarsız arama, küre ↔ harita geçişi,
 * Esc / geri tuşu ile bir üst düzey. MapLibre ve çizim kodu (`gorunum.ts`) ilk kez il açılınca dinamik
 * `import()` ile yüklenir.
 *
 * Düzeyler (docs/11 §9.1): L0 küre (bölge) · L1 il · L2 ilçe · L3 arsa (ilçe yeterince yakınken, yakınlaşmaya bağlı).
 * Küreden ile geçiş: bir bölge seçiliyken o bölgede çift tık (ya da kırıntıdaki il çipleri / arama).
 */
import "./harita.css";
import { bildir } from "../arayuz/bildirim";
import { esc, fmt } from "../arayuz/bicim";
import { isinKureKesisimi, vekLl } from "../kure/matematik";
import type { Vek3 } from "../kure/matematik";
import { ara, dizinKur } from "./arama";
import type { AramaDizini, AramaKaydi } from "./arama";
import { kokenSunucusu } from "../giris/kip";
import type { MulkBaglantisi } from "./baglanti";
import type { MulkPaneli } from "../arayuz/mulk-paneli";
import { noktadakiOzellik } from "./geometri";
import { aramaKayitlari, hiyerarsiYukle, illerYukle, izgaraYukle, OSM_ATIF } from "./veri";
import { yuruAc } from "../yuru/giris";
import { ortuIle } from "../tasarim/ortu";
import type { Hiyerarsi } from "./veri";
import type { HaritaGorunumu } from "./gorunum";
import type { YerlesEkrani } from "../arayuz/yerles-ekrani";

export interface KureBaglami {
  canvas: HTMLCanvasElement;
  /** Ekran noktasındaki bölge indeksi (-1 yok). */
  bolgeIsin: (x: number, y: number) => number;
  /** Ekran noktasından kamera ışını. */
  isin: (x: number, y: number) => [Vek3, Vek3];
  bolgeKimligi: (i: number) => string | null;
  /** Kürede bölgeyi seç ve ona uç (kimlik null: seçimi kaldır). */
  bolgeyeDon: (kimlik: string | null) => void;
  /** Küre çizimini askıya al / sürdür (harita açıkken küre çizilmez). */
  kureyiAskiyaAl: (askida: boolean) => void;
  /** Mülk kipi başlayınca panelin içerik sağlayıcısı (harita yığınından; kabuk paneli ona bağlar). */
  mulkPaneli?: (p: MulkPaneli) => void;
}

export type Duzey = 0 | 1 | 2 | 3;

export interface HaritaDurumu {
  duzey: Duzey;
  bolge: string | null;
  il: string | null;
  ilce: string | null;
}

declare global {
  interface Window {
    /** Harita sınama kancası (Playwright). */
    __harita?: {
      durum: () => HaritaDurumu;
      hazir: () => boolean;
      ilAc: (il: string) => Promise<void>;
      ilceAc: (ilce: string) => Promise<void>;
      gorunum: () => HaritaGorunumu | null;
      baglanti: () => MulkBaglantisi | null;
      /** Mülk kipi başlangıcı (sunucu bağlantısı + Yerleş ekranı); sınama kancası. */
      mulkBaslat: (zorla?: boolean) => Promise<void>;
      yerles: () => YerlesEkrani | null;
    };
  }
}

const CIFT_MS = 340;

type GorunumModulu = typeof import("./gorunum");

/**
 * Harita yığını (MapLibre + pmtiles + görünüm). Çok dosyalı derlemede ve geliştirmede vite'ın tembel parçası.
 * Tek dosya HTML'de (mode "tek") ayrı `harita.js` dosyasıdır: HTML'in yanından yüklenir, satır içine gömülmez
 * (bütçe: tek dosya ≤400 KB gzip; karar 1 Ekim, seçenek A). Sabit koşul derlemede katlanır: tek dosyada
 * `import("./gorunum")` dalı paketlenmez.
 */
function gorunumModulu(): Promise<GorunumModulu> {
  if (import.meta.env.MODE === "tek") {
    const url = new URL("./harita.js", location.href).href;
    return (import(/* @vite-ignore */ url) as Promise<GorunumModulu>).catch(() => {
      throw new Error("Harita yığını (harita.js) yüklenemedi; dunya.html'in yanında olmalı ve sayfa HTTP üzerinden açılmalı.");
    });
  }
  return import("./gorunum");
}

/** Arama kutusu yer tutucusu (anahtar `harita.ara.yer_tutucu`; ≤600 px `harita.ara.yer_tutucu_kisa`). */
const ARA_YER_TUTUCU = "İl ya da ilçe ara";
const ARA_YER_TUTUCU_KISA = "Ara";

export class HaritaDenetci {
  private durum: HaritaDurumu = { duzey: 0, bolge: null, il: null, ilce: null };
  private hiyerarsi: Hiyerarsi | null = null;
  private aramaDizini: AramaDizini | null = null;
  private gorunum: HaritaGorunumu | null = null;
  private gorunumYukleniyor: Promise<HaritaGorunumu> | null = null;
  private gezgin: HTMLElement;
  private kirinti: HTMLOListElement;
  private geri: HTMLButtonElement;
  private aramaKutusu: HTMLInputElement;
  private sonuc: HTMLElement;
  private cipler: HTMLElement;
  private durumYazi: HTMLElement;
  private mercek: HTMLElement;
  readonly kap: HTMLElement;
  private gecmisteMi = false;
  private yukleniyor = false;
  private yerlesEkrani: YerlesEkrani | null = null;
  private baglantiSozu: Promise<MulkBaglantisi | undefined> | null = null;
  private mulkPaneliKuruldu = false;
  private donusAcik = false;

  /** Dönüş özeti ekranı (varsa). Oyuncu "Git" ile bir ilçeye geçtiyse true. */
  private async donusGoster(): Promise<boolean> {
    const g = this.gorunum;
    if (!g || this.donusAcik || !g.baglanti.donusOzeti?.()) return false;
    this.donusAcik = true;
    let gitti = false;
    try {
      const [m, h] = await Promise.all([gorunumModulu(), this.hiyerarsiAl()]);
      await m.donusuGoster({
        gorunum: g,
        hiyerarsi: h,
        kap: this.sahneKap,
        ilceAc: (ilce) => {
          gitti = true;
          void this.ilceAc(ilce).then(() => this.gorunum?.mulkeUc());
        },
      });
    } finally {
      this.donusAcik = false;
    }
    return gitti;
  }
  // Kürede çift tık algılama (kamera kontrolündeki eşiklerle aynı)
  private sonTik = { t: 0, x: 0, y: 0 };
  private basili: { x: number; y: number; t: number; dugme: number; ek: boolean } | null = null;
  private ciftOncesiBolge: string | null = null;

  constructor(
    private sahneKap: HTMLElement,
    private kure: KureBaglami,
  ) {
    this.kap = document.createElement("div");
    this.kap.id = "harita-kap";
    this.kap.hidden = true;
    this.kap.setAttribute("aria-label", "Strateji haritası: il, ilçe ve arsa");

    this.gezgin = document.createElement("div");
    this.gezgin.id = "harita-gezgin";
    this.gezgin.innerHTML = `
      <div class="kart-cubuk kirinti-satir">
        <button type="button" class="harita-geri" id="harita-geri" hidden aria-label="Bir üst düzey (Esc)" title="Bir üst düzey (Esc)">‹</button>
        <nav aria-label="Konum"><ol class="kirinti" id="harita-kirinti"></ol></nav>
        <div class="harita-ara" role="search">
          <input id="harita-ara" type="search" placeholder="${ARA_YER_TUTUCU}" aria-label="${ARA_YER_TUTUCU}" autocomplete="off" spellcheck="false" aria-controls="harita-ara-sonuc" aria-expanded="false">
          <div class="ara-sonuc" id="harita-ara-sonuc" role="listbox" hidden></div>
        </div>
      </div>
      <div class="il-cipleri" id="harita-cipler" hidden></div>
      <div class="segment harita-mercek" id="harita-mercek" role="group" aria-label="Harita merceği" hidden>
        <button type="button" data-mercek="arazi" aria-pressed="true" title="Arazi sınıfı">Arazi</button>
        <button type="button" data-mercek="sahiplik" aria-pressed="false" title="Sahiplik merceği (7)">Sahiplik</button>
      </div>
      <div class="harita-durum" id="harita-durum" aria-live="polite"></div>`;
    sahneKap.append(this.kap, this.gezgin);
    const $ = <T extends HTMLElement>(id: string): T => this.gezgin.querySelector(`#${id}`) as T;
    this.kirinti = $("harita-kirinti");
    this.geri = $("harita-geri");
    this.aramaKutusu = $("harita-ara");
    // Dar ekranda (≤600 px) yer tutucu kısa ("Ara"); erişilebilir ad (aria-label) tam metin kalır
    const dar = window.matchMedia("(max-width: 600px)");
    const yerTutucu = (): void => {
      this.aramaKutusu.placeholder = dar.matches ? ARA_YER_TUTUCU_KISA : ARA_YER_TUTUCU;
    };
    yerTutucu();
    dar.addEventListener("change", yerTutucu);
    this.sonuc = $("harita-ara-sonuc");
    this.cipler = $("harita-cipler");
    this.durumYazi = $("harita-durum");
    this.mercek = $("harita-mercek");

    this.olaylariBagla();
    this.uzunBasmaBagla();
    this.atifEkle();
    this.ciz();
    window.__harita = {
      durum: () => ({ ...this.durum }),
      hazir: () => !this.yukleniyor && (this.durum.duzey === 0 || (this.gorunum?.hazir() ?? false)),
      ilAc: (il) => this.ilAc(il),
      ilceAc: (ilce) => this.ilceAc(ilce),
      gorunum: () => this.gorunum,
      baglanti: () => this.gorunum?.baglanti ?? null,
      mulkBaslat: (zorla) => this.mulkBaslat(zorla === true),
      yerles: () => this.yerlesEkrani,
    };
  }

  // --- dış bağlantı ---------------------------------------------------------------------------------

  /** Kürede bölge seçimi değişti (main.ts). */
  bolgeAyarla(kimlik: string | null): void {
    if (this.durum.duzey !== 0) return;
    this.durum.bolge = kimlik;
    this.ciz();
    // Sessiz: veri yoksa (ör. file://) il çipleri görünmez; hata ancak harita/arama denenince yazılır.
    if (kimlik) void this.hiyerarsiAl().then(() => this.ciz(), () => undefined);
  }

  temaUygula(): void {
    this.gorunum?.temaUygula();
  }

  /** Mülk bağlantısı (görünüm yüklenmediyse null): küredeki mülk işaretleri için (main.ts). */
  mulkBaglantisi(): MulkBaglantisi | null {
    return this.gorunum?.baglanti ?? null;
  }

  // --- gezinme --------------------------------------------------------------------------------------

  async ilAc(il: string): Promise<void> {
    const h = await this.hiyerarsiAl().catch((e: unknown) => this.hataYaz(e));
    const bilgi = h?.iller.get(il);
    if (!bilgi) return;
    await this.git({ duzey: 1, bolge: bilgi.bolge, il, ilce: null });
  }

  async ilceAc(ilce: string): Promise<void> {
    const h = await this.hiyerarsiAl().catch((e: unknown) => this.hataYaz(e));
    const bilgi = h?.ilceler.get(ilce);
    if (!h || !bilgi) return;
    await this.git({ duzey: 2, bolge: h.iller.get(bilgi.il)?.bolge ?? null, il: bilgi.il, ilce });
  }

  /** Bir üst düzey: L3 -> L2 -> L1 -> L0 (bölge seçili kalır). */
  ustDuzey(): void {
    const d = this.durum;
    if (d.duzey === 3) void this.git({ ...d, duzey: 2 });
    else if (d.duzey === 2) void this.git({ ...d, duzey: 1, ilce: null });
    else if (d.duzey === 1) this.kureyeDon(d.bolge);
  }

  private kureyeDon(bolge: string | null): void {
    // Harita açıksa kâğıt örtüyle geç (tuval değişimi örtünün altında)
    if (!this.kap.hidden) {
      void ortuIle(() => this.kureyeDonHemen(bolge));
      return;
    }
    this.kureyeDonHemen(bolge);
  }

  private kureyeDonHemen(bolge: string | null): void {
    this.durum = { duzey: 0, bolge, il: null, ilce: null };
    this.kap.hidden = true;
    document.body.classList.remove("harita-acik");
    this.gorunum?.uyut();
    this.kure.kureyiAskiyaAl(false);
    this.kure.bolgeyeDon(bolge);
    this.durumYazi.textContent = "";
    if (this.gecmisteMi) {
      this.gecmisteMi = false;
      try {
        if ((history.state as { harita?: number } | null)?.harita) history.back();
      } catch {
        /* yoksay */
      }
    }
    this.ciz();
  }

  private async git(hedef: HaritaDurumu): Promise<void> {
    if (hedef.duzey === 0) {
      this.kureyeDon(hedef.bolge);
      return;
    }
    this.yukleniyor = true;
    this.durumYazi.textContent = "Harita yükleniyor…";
    try {
      const g = await this.gorunumAl();
      const ilkAcilis = this.kap.hidden;
      const ac = (): void => {
        this.kap.hidden = false;
        document.body.classList.add("harita-acik");
        this.kure.kureyiAskiyaAl(true);
      };
      // Küre → harita: kâğıt örtü (240 ms) gelir, harita altında açılır ve ilk kadraja oturur, örtü çekilir
      if (ilkAcilis) await ortuIle(ac);
      else ac();
      if (!this.gecmisteMi) {
        try {
          history.pushState({ ...(history.state as object | null), harita: 1 }, "");
          this.gecmisteMi = true;
        } catch {
          /* yoksay */
        }
      }
      this.durum = { ...hedef };
      this.ciz();
      await g.goster(hedef, ilkAcilis);
      this.durumYazi.textContent = "";
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      this.durumYazi.textContent = m;
      bildir(`Harita açılamadı: ${m}`, "hata");
      if (this.kap.hidden) this.durum = { duzey: 0, bolge: this.durum.bolge, il: null, ilce: null };
    } finally {
      this.yukleniyor = false;
      this.ciz();
    }
  }

  private gorunumAl(): Promise<HaritaGorunumu> {
    if (this.gorunum) return Promise.resolve(this.gorunum);
    if (!this.gorunumYukleniyor) {
      // Önce veri (file:// altında fetch denemeden hata verir), sonra MapLibre yığını
      this.gorunumYukleniyor = Promise.all([this.hiyerarsiAl(), illerYukle()])
        .then(([h, iller]) => this.baglantiAl().then((b) => [h, iller, b] as const))
        .then(([h, iller, b]) => gorunumModulu().then((m) => [m, h, iller, b] as const))
        .then(([m, h, iller, b]) => {
          const g = new m.HaritaGorunumu(this.kap, this.sahneKap, {
            hiyerarsi: h,
            iller,
            ...(b ? { baglanti: b } : {}),
            ilceSec: (ilce) => void this.ilceAc(ilce),
            yuruAc: (boylam, enlem) => this.yuruBaslat(boylam, enlem),
            duzeyDegisti: (d) => {
              if (this.durum.duzey >= 2 && d !== this.durum.duzey) {
                this.durum.duzey = d;
                this.ciz();
              }
            },
          });
          this.gorunum = g;
          return g;
        })
        .catch((e: unknown) => {
          this.gorunumYukleniyor = null;
          throw e;
        });
    }
    return this.gorunumYukleniyor;
  }

  /** Gerçek sunucu kullanılacak mı: `?sunucu=` var ya da barındırılan sayfada kendi köken (`kokenSunucusu`). */
  private sunucuVar(): boolean {
    return new URLSearchParams(location.search).has("sunucu") || kokenSunucusu(location, location.search) !== "";
  }

  /** `?sunucu=ws://...` varsa gerçek sunucuya WebSocket bağlantısı (sayfa başına bir kez); yoksa tanımsız (sahte bağdaştırıcı). */
  private baglantiAl(): Promise<MulkBaglantisi | undefined> {
    if (!this.sunucuVar()) return Promise.resolve(undefined);
    this.baglantiSozu ??= gorunumModulu()
      .then((m) => m.baglantiKur(location.search))
      .catch((e: unknown) => {
        this.baglantiSozu = null;
        throw e;
      });
    return this.baglantiSozu;
  }

  /**
   * Mülk kipi başlangıcı (sunucu bağlıyken ya da `?yerles=1`): bağlantıyı kurar; oyuncunun hücresi yoksa Yerleş ekranını açar,
   * varsa kendi ilçesine uçar. Eski "Devlet seç" akışı bu kipte gösterilmez.
   */
  async mulkBaslat(zorla = false): Promise<void> {
    if (this.yerlesEkrani) return;
    this.durumYazi.textContent = this.sunucuVar() ? "Sunucuya bağlanılıyor…" : "Yerleş hazırlanıyor…";
    try {
      const g = await this.gorunumAl();
      // Panel: devlet oyunu yerine işletme (harita yığınındaki sağlayıcı; bölge kipinde çağrılmaz)
      if (this.kure.mulkPaneli && !this.mulkPaneliKuruldu) {
        this.mulkPaneliKuruldu = true;
        const [m, h] = await Promise.all([gorunumModulu(), this.hiyerarsiAl()]);
        this.kure.mulkPaneli(m.mulkPaneliKur({ gorunum: g, hiyerarsi: h, ilceAc: (ilce) => this.ilceAc(ilce).then(() => this.gorunum?.mulkeUc()) }));
      }
      await g.baglanti.hazirBekle?.();
      // "Sen yokken": gösterilmemiş dönüş özeti varsa önce o (kapanınca devam); ilk girişte özet yoktur. Yetişme bitince
      // ayrıca gelen özet (`donusOzeti` mesajı) için bağdaştırıcı dinlenir.
      this.durumYazi.textContent = "";
      if (await this.donusGoster()) return;
      g.baglanti.dinle?.(() => {
        if (!this.donusAcik && g.baglanti.donusOzeti?.()) void this.donusGoster();
      });
      const oz = g.baglanti.ozet?.() ?? null;
      const hucreli = oz?.ilceHucre.find(([, n]) => n > 0)?.[0];
      this.durumYazi.textContent = "";
      if (hucreli && !zorla) {
        await this.ilceAc(hucreli);
        this.gorunum?.mulkeUc();
        return;
      }
      const m = await gorunumModulu();
      const h = await this.hiyerarsiAl();
      this.yerlesEkrani = await m.yerlesAc({
        kap: this.sahneKap,
        baglanti: g.baglanti,
        hiyerarsi: h,
        git: (ilce, acilis, yapi) => this.yerlesGit(ilce, acilis, yapi),
        yuva: (yapi) => g.yapiKatalogu().find((k) => k.id === yapi)?.yuva ?? 1,
        kapandi: () => {
          this.yerlesEkrani = null;
        },
      });
      this.durumYazi.textContent = "";
    } catch (e) {
      const mesaj = e instanceof Error ? e.message : String(e);
      this.durumYazi.textContent = mesaj;
      bildir(`Sunucuya bağlanılamadı: ${mesaj}`, "hata");
    }
  }

  /** Yerleş onayı: ilçeyi aç, ızgaralıysa önerilen hazır arsaya uç ve seç; yapı menüsüne açılış önerisini işle. */
  private async yerlesGit(ilce: string, acilis: "tarim" | "sanayi" | "pazar", oneriYapi: string): Promise<void> {
    await this.ilceAc(ilce);
    const g = this.gorunum;
    if (!g || this.durum.ilce !== ilce) return;
    const merkez = this.hiyerarsi?.ilceler.get(ilce)?.merkez;
    if (!g.izgaraVar(ilce) || !merkez) {
      bildir("Bu ilçenin arsa ızgarası henüz yok: haritada gezebilirsin.", "bilgi");
      return;
    }
    // L3'e in ve hazır arsayı seç (ızgara ve sahiplik yüklenmiş olmalı)
    const tamam = await g.yerlesVarisi(acilis, oneriYapi, merkez);
    if (!tamam) bildir("Bu ilçede boş hazır arsa kalmadı: başka bir ilçe dene.", "bilgi");
  }

  private hiyerarsiAl(): Promise<Hiyerarsi> {
    return hiyerarsiYukle().then((h) => {
      if (!this.hiyerarsi) {
        this.hiyerarsi = h;
        this.aramaDizini = dizinKur(aramaKayitlari(h));
      }
      return h;
    });
  }

  // --- olaylar -------------------------------------------------------------------------------------

  private olaylariBagla(): void {
    this.geri.addEventListener("click", () => this.ustDuzey());
    this.kirinti.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-duzey]") as HTMLButtonElement | null;
      if (!b) return;
      const d = Number(b.dataset["duzey"]) as Duzey;
      const s = this.durum;
      if (d === 0) {
        // "Dünya": küreye dön, seçimi kaldır
        if (s.duzey === 0) this.kure.bolgeyeDon(null);
        else this.kureyeDon(null);
        if (s.duzey === 0) this.bolgeAyarla(null);
      } else if (d === 1 && s.il) void this.git({ ...s, duzey: 1, ilce: null });
      else if (d === 2 && s.ilce) void this.git({ ...s, duzey: 2 });
    });
    this.kirinti.addEventListener("click", (e) => {
      // Bölge parçası: küreye dön, bölge seçili kalır ve kamera ona uçar
      if ((e.target as HTMLElement).closest("button[data-bolge]")) this.kureyeDon(this.durum.bolge);
    });
    this.cipler.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-il]") as HTMLButtonElement | null;
      if (b?.dataset["il"]) void this.ilAc(b.dataset["il"]);
    });
    this.mercek.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-mercek]") as HTMLButtonElement | null;
      if (b) this.mercekSec(b.dataset["mercek"] === "sahiplik");
    });

    // Arama
    let secili = -1;
    const kayitlar = (): HTMLButtonElement[] => [...this.sonuc.querySelectorAll<HTMLButtonElement>("button[data-tur]")];
    const vurgula = (i: number): void => {
      const k = kayitlar();
      secili = k.length ? (i + k.length) % k.length : -1;
      k.forEach((b, j) => b.setAttribute("aria-selected", String(j === secili)));
      k[secili]?.scrollIntoView({ block: "nearest" });
    };
    this.aramaKutusu.addEventListener("focus", () => void this.hiyerarsiAl().then(() => this.aramaYaz(), (e: unknown) => this.hataYaz(e)));
    this.aramaKutusu.addEventListener("input", () => {
      secili = -1;
      void this.hiyerarsiAl().then(() => this.aramaYaz(), (e: unknown) => this.hataYaz(e));
    });
    this.aramaKutusu.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        vurgula(secili + (e.key === "ArrowDown" ? 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const b = kayitlar()[secili < 0 ? 0 : secili];
        b?.click();
      } else if (e.key === "Escape") {
        e.stopPropagation();
        this.aramaKapat();
        this.aramaKutusu.blur();
      }
    });
    this.sonuc.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-tur]") as HTMLButtonElement | null;
      if (!b) return;
      const tur = b.dataset["tur"];
      const k = b.dataset["kimlik"] ?? "";
      this.aramaKutusu.value = "";
      this.aramaKapat();
      this.aramaKutusu.blur();
      if (tur === "il") void this.ilAc(k);
      else if (tur === "ilce") void this.ilceAc(k);
      else if (tur === "mulk") void this.ilceAc(k).then(() => this.gorunum?.mulkeUc());
    });
    document.addEventListener("pointerdown", (e) => {
      if (!this.sonuc.hidden && !(e.target as HTMLElement).closest(".harita-ara")) this.aramaKapat();
    });

    // Esc / Backspace: bir üst düzey (yazı alanında değilken)
    window.addEventListener("keydown", (e) => {
      if (this.durum.duzey === 0) return;
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Yapı yerleşimi etkinken R (döndür), Enter (kur), Esc (vazgeç) hayalete gider
      if (this.gorunum?.tusIsle(e)) {
        e.preventDefault();
        return;
      }
      if (e.key === "Escape" || e.key === "Backspace") {
        if (e.key === "Escape" && this.gorunum?.secimVarMi()) {
          this.gorunum.secimTemizle();
          return;
        }
        e.preventDefault();
        this.ustDuzey();
      } else if (e.key === "7") this.mercekSec(!(this.gorunum?.sahiplikMercegi ?? false));
      else if ((e.key === "y" || e.key === "Y") && this.durum.duzey >= 2 && this.gorunum) {
        // Kısayol: harita merkezinde sokak yürüyüşü (L4)
        const m = this.gorunum.ml.getCenter();
        this.yuruBaslat(m.lng, m.lat);
      }
    });
    // Tarayıcının geri tuşu: harita açıkken bir üst düzey (geçmişte tek nöbetçi kayıt tutulur)
    window.addEventListener("popstate", () => {
      if (!this.gecmisteMi) return;
      this.gecmisteMi = false;
      if (this.durum.duzey === 0) return;
      this.ustDuzey();
      // Hâlâ haritadaysak nöbetçi kaydı yenile (bir sonraki geri de bir üst düzeye çıksın)
      if (this.durum.duzey > 0 && !this.kap.hidden) {
        try {
          history.pushState({ ...(history.state as object | null), harita: 1 }, "");
          this.gecmisteMi = true;
        } catch {
          /* yoksay */
        }
      }
    });
    // 🌍 düğmesi: haritayı kapat
    document.getElementById("dunya-dugme")?.addEventListener("click", () => {
      if (this.durum.duzey > 0) this.kureyeDon(null);
    });

    // Kürede çift tık (bölge zaten seçiliyken): imleçteki ili aç
    const c = this.kure.canvas;
    c.addEventListener("pointerdown", (e) => {
      const r = c.getBoundingClientRect();
      const t = performance.now();
      if (t - this.sonTik.t > CIFT_MS) this.ciftOncesiBolge = this.durum.bolge;
      this.basili = { x: e.clientX - r.left, y: e.clientY - r.top, t, dugme: e.button, ek: e.ctrlKey || e.shiftKey };
    });
    c.addEventListener("pointerup", (e) => {
      const b = this.basili;
      this.basili = null;
      if (!b || b.dugme !== 0 || b.ek) return;
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const t = performance.now();
      if (Math.hypot(x - b.x, y - b.y) >= 7 || t - b.t >= 450) return;
      const cift = t - this.sonTik.t < CIFT_MS && Math.hypot(x - this.sonTik.x, y - this.sonTik.y) < 32;
      this.sonTik = cift ? { t: 0, x, y } : { t, x, y };
      if (!cift) return;
      const bolge = this.kure.bolgeKimligi(this.kure.bolgeIsin(x, y));
      if (bolge && bolge === this.ciftOncesiBolge) void this.noktadakiIliAc(x, y, bolge);
    });
  }

  /** L4 sokak yürüyüşü (ilçe görünümünde: kart düğmesi, uzun basma ya da Y). Harita altta kalır. */
  private yuruBaslat(boylam: number, enlem: number): void {
    const ilce = this.durum.ilce;
    this.durumYazi.textContent = "Sokak yükleniyor…";
    ortuIle(() => yuruAc(this.sahneKap, {
      boylam,
      enlem,
      ilce,
      ilceAd: ilce ? (this.hiyerarsi?.ilceler.get(ilce)?.ad ?? "") : "",
      izgaraAl: () => (ilce ? izgaraYukle(ilce) : Promise.resolve(null)),
      baglanti: this.gorunum?.baglanti ?? null,
      donus: () => {
        this.ciz();
        void this.gorunum?.sahiplikYenile();
      },
    })).then(
      () => (this.durumYazi.textContent = ""),
      (e: unknown) => this.hataYaz(e),
    );
  }

  /** İlçe görünümünde haritaya uzun basma (≥ 650 ms, kıpırdamadan): basılan noktada yürüyüş. */
  private uzunBasmaBagla(): void {
    let z = 0;
    let bas: { x: number; y: number } | null = null;
    const iptal = (): void => {
      window.clearTimeout(z);
      bas = null;
    };
    this.kap.addEventListener("pointerdown", (e) => {
      iptal();
      if (this.durum.duzey < 2 || !this.gorunum || (e.pointerType === "mouse" && e.button !== 0)) return;
      const r = this.kap.getBoundingClientRect();
      bas = { x: e.clientX - r.left, y: e.clientY - r.top };
      z = window.setTimeout(() => {
        if (!bas || !this.gorunum) return;
        const p = this.gorunum.ml.unproject([bas.x, bas.y]);
        bas = null;
        this.yuruBaslat(p.lng, p.lat);
      }, 650);
    });
    this.kap.addEventListener("pointermove", (e) => {
      if (!bas) return;
      const r = this.kap.getBoundingClientRect();
      if (Math.hypot(e.clientX - r.left - bas.x, e.clientY - r.top - bas.y) > 8) iptal();
    });
    for (const ad of ["pointerup", "pointercancel", "pointerleave"] as const) this.kap.addEventListener(ad, iptal);
  }

  private async noktadakiIliAc(x: number, y: number, bolge: string): Promise<void> {
    const [o, yon] = this.kure.isin(x, y);
    const p = isinKureKesisimi(o, yon, 1);
    if (!p) return;
    const [lon, lat] = vekLl(p);
    this.durumYazi.textContent = "Harita yükleniyor…";
    try {
      const [h, iller] = await Promise.all([this.hiyerarsiAl(), illerYukle()]);
      let il = noktadakiOzellik(lon, lat, iller.fc)?.properties.kimlik ?? null;
      if (!il || h.iller.get(il)?.bolge !== bolge) {
        // Kıyıya yakın tık (il çokgeni karasularını içermez): bölgenin en yakın il merkezi
        let enIyi = Infinity;
        for (const k of h.bolgeler.get(bolge)?.iller ?? []) {
          const m = h.iller.get(k)?.merkez;
          if (!m) continue;
          const d = (m[0] - lon) ** 2 + (m[1] - lat) ** 2;
          if (d < enIyi) {
            enIyi = d;
            il = k;
          }
        }
      }
      if (il) await this.ilAc(il);
    } catch (e) {
      this.durumYazi.textContent = e instanceof Error ? e.message : String(e);
    }
  }

  /** Veri hatası: kırıntının altındaki durum satırına (açılır pencere yok). */
  private hataYaz(e: unknown): void {
    this.durumYazi.textContent = e instanceof Error ? e.message : String(e);
  }

  private mercekSec(sahiplik: boolean): void {
    this.gorunum?.mercekSec(sahiplik);
    for (const b of this.mercek.querySelectorAll<HTMLButtonElement>("button[data-mercek]"))
      b.setAttribute("aria-pressed", String((b.dataset["mercek"] === "sahiplik") === sahiplik));
  }

  // --- çizim ----------------------------------------------------------------------------------------

  private aramaKapat(): void {
    this.sonuc.hidden = true;
    this.aramaKutusu.setAttribute("aria-expanded", "false");
  }

  private aramaYaz(): void {
    const q = this.aramaKutusu.value;
    if (!this.aramaDizini || !q.trim()) {
      this.aramaKapat();
      return;
    }
    const s = ara(this.aramaDizini, q, 6);
    const mulk = this.mulkKayitlari().filter((k) => s.ilce.length + s.il.length === 0 || k.ad.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));
    const grup = (baslik: string, liste: AramaKaydi[]): string =>
      liste.length
        ? `<h4>${baslik}</h4>` +
          liste.map((k) => `<button type="button" role="option" aria-selected="false" data-tur="${k.tur}" data-kimlik="${esc(k.kimlik)}"><span>${esc(k.ad)}</span><small>${esc(k.ust)}</small></button>`).join("")
        : "";
    const html = grup("İller", s.il) + grup("İlçeler", s.ilce) + grup("Mülklerim", mulk);
    this.sonuc.innerHTML = html || `<div class="bos">Sonuç yok</div>`;
    this.sonuc.hidden = false;
    this.aramaKutusu.setAttribute("aria-expanded", "true");
  }

  /** "Mülklerim": görünümün bildiği ilçelerde oyuncunun hücreleri. */
  private mulkKayitlari(): AramaKaydi[] {
    const m = this.gorunum?.mulklerim() ?? [];
    return m.map((x) => ({ tur: "mulk" as const, kimlik: x.ilce, ad: `${this.hiyerarsi?.ilceler.get(x.ilce)?.ad ?? x.ilce}: ${fmt(x.hucre)} hücre`, ust: "Parselin" }));
  }

  private ciz(): void {
    const s = this.durum;
    const h = this.hiyerarsi;
    const bolgeAd = s.bolge ? (h?.bolgeler.get(s.bolge)?.ad ?? "") : "";
    const parca: string[] = [];
    const sayfa = (ad: string): string => `<li><span aria-current="page">${esc(ad)}</span></li>`;
    const dugme = (ad: string, duzey: number): string => `<li><button type="button" data-duzey="${duzey}">${esc(ad)}</button></li>`;
    parca.push(s.duzey === 0 && !s.bolge ? sayfa("Dünya") : dugme("Dünya", 0));
    if (s.bolge && bolgeAd) parca.push(s.duzey === 0 ? sayfa(bolgeAd) : `<li><button type="button" data-bolge="1">${esc(bolgeAd)}</button></li>`);
    if (s.il) {
      const ad = h?.iller.get(s.il)?.ad ?? s.il;
      parca.push(s.duzey === 1 ? sayfa(ad) : dugme(ad, 1));
    }
    if (s.ilce) {
      const ad = h?.ilceler.get(s.ilce)?.ad ?? s.ilce;
      parca.push(s.duzey === 2 ? sayfa(ad) : dugme(ad, 2));
    }
    if (s.duzey === 3) parca.push(sayfa("Arsa"));
    this.kirinti.innerHTML = parca.join("");
    this.geri.hidden = s.duzey === 0;
    // Telefonda kısa geri etiketi: "‹ Gebze"
    const ust = s.duzey === 3 ? s.ilce : s.duzey === 2 ? s.il : null;
    const ustAd = ust ? (h?.ilceler.get(ust)?.ad ?? h?.iller.get(ust)?.ad ?? "") : s.duzey === 1 ? bolgeAd || "Dünya" : "";
    this.geri.textContent = ustAd ? `‹ ${ustAd}` : "‹";
    // L0'da seçili bölgenin illeri
    const iller = s.duzey === 0 && s.bolge && h ? (h.bolgeler.get(s.bolge)?.iller ?? []) : [];
    this.cipler.hidden = iller.length === 0;
    this.cipler.innerHTML = iller.map((k) => `<button type="button" class="il-cip" data-il="${esc(k)}" title="İl haritasını aç">${esc(h?.iller.get(k)?.ad ?? k)}</button>`).join("");
    this.mercek.hidden = s.duzey < 2 || !(this.gorunum?.izgaraVar(s.ilce) ?? false);
  }

  private atifEkle(): void {
    const ul = document.getElementById("atif");
    if (!ul || ul.querySelector("[data-osm]")) return;
    const li = document.createElement("li");
    li.dataset["osm"] = "1";
    li.textContent = `${OSM_ATIF} — il/ilçe sınırları ve arsa ızgarası (ODbL 1.0)`;
    ul.append(li);
  }
}

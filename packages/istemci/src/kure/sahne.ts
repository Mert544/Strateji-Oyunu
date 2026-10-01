/**
 * Sahne: three.js sahnesini, katmanları, kamerayı ve çizim döngüsünü bir araya getirir.
 * Sakin görsel (F0): lojistik akış şeritleri, parçacıklar ve savaş yayları YOKTUR. Durum, bölge başına en çok
 * bir rozetle (simge katmanında, ek çizim çağrısı olmadan) ve seçili mercekle gösterilir.
 * Mülk kipinde (`mulkKipi`) bölge simülasyonu görünmez: nötr kâğıt dolgu, rozet ve olay yok; oyuncunun ilçeleri tek bir
 * çini nokta işaretiyle (mulk-kipi.ts). Bölge kipi aynen kalır.
 * Çizim çağrıları: yıldız, okyanus, kara, ülke çizgileri, bölge dolgusu, bölge çizgileri, seçim çizgisi,
 * simgeler, atmosfer (yaklaşık 9).
 */
import { Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { KameraKontrol } from "../kamera/kontrol";
import { DIKEY_ACI, enUzakMesafe, sigmaMesafesi, yerelBaz } from "../kamera/durum";
import { BolgeKatmani, BOLGE_YARICAPI } from "./bolge-katmani";
import { DunyaKatmani } from "./dunya";
import { gunesYonu, mutlakGunesYonu } from "./gunes";
import { DERECE, aci, birim, isinKureKesisimi, llVek, vekLl } from "./matematik";
import type { Vek3 } from "./matematik";
import { isaretleriKumele, mulkRenkleri } from "./mulk-kipi";
import type { MulkIsareti } from "./mulk-kipi";
import { ortakOlustur } from "./ortak";
import type { Ortak } from "./ortak";
import { SimgeKatmani } from "./simgeler";
import type { OlayGirdisi } from "./simgeler";
import { paletiOku } from "./tema";
import type { SahnePaleti } from "./tema";
import type { DunyaKarasi } from "../veri/cografya";
import type { DunyaHaritasi } from "../veri/harita-birlestir";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import { genelRenkleri, pazarRenkleri, sahiplikRenkleri, sanayiRenkleri } from "../veri/mercek";
import type { Mercek } from "../veri/mercek";
import { bolgeRenkleriniHesapla, bolgeTamponuOlustur } from "../veri/renkler";
import type { BolgeRenkTamponu, RGB } from "../veri/renkler";
import { rozetleriHesapla } from "../veri/rozet";
import type { BitenInsaat, RozetTuru } from "../veri/rozet";
import { olayEvresi, olaySimgesi, olaySonumu, tarimRenkleriniHesapla } from "../veri/tarim";

export interface SahneOlaylari {
  /** Tek tıklama: bölge indeksi veya -1 (boşluk). */
  bolgeSec: (i: number) => void;
}

export interface OlcumBilgisi {
  fps: number;
  cizimCagrisi: number;
  ucgen: number;
  pikselOrani: number;
  kare: number;
  /** Çerçeve başına ortalama ana iş parçacığı süresi (ms): JS + GL komut gönderimi, GPU beklemesi hariç değil (senkron). */
  cpuMs: number;
}

export class Sahne {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly kamera = new PerspectiveCamera(DIKEY_ACI, 1, 0.01, 10);
  readonly kontrol: KameraKontrol;
  readonly ortak: Ortak = ortakOlustur();
  readonly dunya: DunyaKatmani;
  readonly bolge: BolgeKatmani;
  simge: SimgeKatmani | null = null;
  palet: SahnePaleti;
  dizin: Dizin | null = null;
  kare: Kare | null = null;
  /** Etkin mercek (tek mercek): varsayılan sakin "Genel". */
  mercek: Mercek = "genel";
  /** "mal" merceğinde seçili mal. */
  private mal = -1;
  /** Oyuncunun indeksi (-1: izleme): "Genel" merceğinde yalnız onun bölgeleri doygun; rozetler yalnız onun bölgelerinde. */
  ben = -1;
  /** Mülk kipi (sunucu ya da `?yerles=1`): bölge renkleri, rozetler ve olaylar gösterilmez; oyuncunun mülk işaretleri çizilir. */
  mulkKipi = false;
  private mulkNoktalari: Vek3[] = [];
  private mulkImzasi = "";
  /** Ekran uzayında kümelenmiş mülk işaretleri ve imzası (kamera değişince yeniden hesaplanır). */
  private mulkKumeleri: MulkIsareti[] = [];
  private mulkKumeImzasi = "";
  private mulkKirli = false;
  private readonly gecici = new Vector3();
  /** Biten inşaatlar (panelin izleyicisi; "inşaat bitti" rozetleri). */
  bitenler: ReadonlyMap<number, BitenInsaat> = new Map();
  /** Hareket azaltma tercihi: rozet nabzı ve uçuş yumuşatması yok. */
  hareketAzalt = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  private oncekiRozet: Array<RozetTuru | null> | null = null;
  private nabiz = new Float32Array(0);
  secili = -1;
  /** Görünen sim saati (kesirli); güneş yönü için. */
  simSaatiKaynagi: () => number = () => 0;
  /** Mutlak saat (sunucu ve mülk kipi): gerçek an (epoch ms) ya da null; varsa güneş ona göre (çevrimdışı demo: sim saati). */
  mutlakZamanKaynagi: () => number | null = () => null;
  readonly merkezler: Vek3[];
  private renkler: BolgeRenkTamponu;
  private pikselOrani: number;
  private enYuksekPikselOrani: number;
  private adaptif: boolean;
  private sonZaman = 0;
  private cerceve = 0;
  private fpsPenceresi: number[] = [];
  private fps = 0;
  private cpuMs = 0;
  private sonAdaptif = 0;
  private durdu = false;
  /** true iken çizim döngüsü kare çizmez (üstte MapLibre haritası açıkken; harita/denetci.ts). */
  askida = false;
  /** Her çizimden sonra çağrılır (etiketler vb.). */
  cizimSonrasi: ((kameraDegisti: boolean, dt: number) => void) | null = null;

  constructor(
    private konteyner: HTMLElement,
    readonly canvas: HTMLCanvasElement,
    readonly harita: DunyaHaritasi,
    karalar: DunyaKarasi,
    private olaylar: SahneOlaylari,
    secenek: { adaptif: boolean; mobil: boolean },
  ) {
    this.adaptif = secenek.adaptif;
    this.enYuksekPikselOrani = Math.min(window.devicePixelRatio || 1, secenek.mobil ? 1.5 : 2);
    this.pikselOrani = this.enYuksekPikselOrani;
    this.renderer = new WebGLRenderer({ canvas, antialias: !secenek.mobil, powerPreference: "high-performance", alpha: false });
    this.renderer.setPixelRatio(this.pikselOrani);
    this.palet = paletiOku();

    this.dunya = new DunyaKatmani(karalar, this.ortak);
    this.bolge = new BolgeKatmani(harita.bolgeler, this.ortak);
    for (const o of [...this.dunya.nesneler, ...this.bolge.nesneler]) this.scene.add(o);
    this.merkezler = harita.bolgeler.map((b) => llVek(b.merkez[0], b.merkez[1]));
    this.renkler = bolgeTamponuOlustur(harita.bolgeler.length);

    this.kontrol = new KameraKontrol(canvas, this.kamera, {
      tikla: (x, y) => {
        const i = this.bolgeIsin(x, y);
        this.olaylar.bolgeSec(i);
      },
      ciftTikla: (x, y) => {
        const i = this.bolgeIsin(x, y);
        if (i >= 0) {
          this.olaylar.bolgeSec(i);
          this.bolgeyeUc(i);
        }
      },
    });
    // Başlangıç: bakış oyun bölgelerinin merkezinde (dünya görünümü), sonra açılış uçuşu yakınlaştırır.
    const c = this.oyunMerkezi();
    this.kontrol.durum = { ...this.kontrol.durum, p: c.p, f: yerelBaz(c.p).kuzey };
    this.temaUygula();
    const ro = new ResizeObserver(() => this.boyutla());
    ro.observe(konteyner);
    this.boyutla();
  }

  /** "mal" merceğindeki mal (diğer merceklerde -1). Ölçüm kancası ve eski betikler için. */
  get malSecili(): number {
    return this.mercek === "mal" ? this.mal : -1;
  }

  /** "Tarım" merceği etkin mi. */
  get tarimGorunumu(): boolean {
    return this.mercek === "tarim";
  }

  /** Dizin (mallar, tesis türleri) geldiğinde dinamik katmanları kurar. */
  dizinKur(dizin: Dizin): void {
    this.dizin = dizin;
    this.nabiz = new Float32Array(dizin.bolgeler.length).fill(-1e6);
    this.simge = new SimgeKatmani(
      this.harita.bolgeler,
      this.merkezler,
      this.harita.harita.bolgeler.map((b) => b.etiketler),
      this.ortak,
    );
    for (const o of this.simge.nesneler) this.scene.add(o);
    this.temaUygula();
    this.kareUygula(this.kare);
  }

  // --- durum güncelleme ----------------------------------------------------------------------------

  kareUygula(kare: Kare | null): void {
    this.kare = kare;
    this.renkleriYenile();
    if (!kare || !this.dizin) return;
    this.rozetleriYenile();
    this.simgeleriYenile();
  }

  private renkleriYenile(): void {
    const dizin = this.dizin ?? this.onDizin();
    const p = this.palet.palet;
    if (this.mulkKipi) {
      mulkRenkleri(dizin.bolgeler.length, p, this.palet.kara, this.palet.panel, this.renkler);
      this.bolge.renkleriYaz(this.renkler, this.secili, [1, 1, 1]);
      return;
    }
    switch (this.mercek) {
      case "tarim":
        tarimRenkleriniHesapla(this.kare, dizin, this.palet.tarim, this.renkler);
        break;
      case "sanayi":
        sanayiRenkleri(this.kare, dizin, p, this.renkler);
        break;
      case "pazar":
        pazarRenkleri(this.kare, dizin, p, this.renkler);
        break;
      case "sahiplik":
        sahiplikRenkleri(this.kare, dizin, this.ben, p, this.renkler);
        break;
      case "mal":
        bolgeRenkleriniHesapla(this.kare, dizin, this.mal, p, this.renkler);
        break;
      default:
        genelRenkleri(this.kare, dizin, this.ben, p, this.renkler);
    }
    this.bolge.renkleriYaz(this.renkler, this.secili, [1, 1, 1]);
  }

  /** Rozetleri yeniden hesaplar; yeni gelen (ya da türü değişen) rozet için tek nabız başlatır. */
  private rozetleriYenile(): void {
    if (!this.dizin) return;
    const yeni: Array<RozetTuru | null> = this.mulkKipi ? [] : rozetleriHesapla(this.kare, this.dizin, this.ben, this.bitenler);
    const once = this.oncekiRozet;
    if (once && !this.hareketAzalt) {
      const t = performance.now() / 1000;
      yeni.forEach((r, i) => {
        if (r && r !== once[i]) this.nabiz[i] = t;
      });
    }
    this.oncekiRozet = yeni;
  }

  /** Dizin gelmeden önce bölge renklendirmesi için asgari bir dizin (harita verisinden). */
  private onDizin(): Dizin {
    const h = this.harita.harita;
    const devletIdx = new Map(h.devletler.map((d, i) => [d.id, i]));
    return {
      devletler: h.devletler.map((d) => ({ id: d.id, ad: d.ad, blok: d.blok })),
      mallar: [],
      bolgeler: h.bolgeler.map((b) => ({ id: b.id, ad: b.ad, devlet: devletIdx.get(b.devlet) ?? 0, etiketler: [...b.etiketler], x: b.x, y: b.y, nufus0: b.nufus })),
      kenarlar: [],
      oyuncular: [],
      tesisTurleri: [],
      yontemler: [],
      birlikler: [],
    };
  }

  /** Etkin ve uyarıdaki iklim olaylarını simge katmanının girdisine çevirir (türler dizinden, renkler temadan). */
  private olayGirdileri(): OlayGirdisi[] {
    if (this.mulkKipi) return [];
    const kare = this.kare;
    const tarim = this.dizin?.tarim;
    if (!kare?.iklim || !tarim) return [];
    const cikti: OlayGirdisi[] = [];
    for (const o of kare.iklim.olaylar) {
      const evre = olayEvresi(o, kare.saat);
      if (evre === "bitti") continue;
      const tur = tarim.olayTurleri[o.tur] ?? "";
      cikti.push({
        merkez: o.merkez,
        glif: olaySimgesi(tur).glif,
        aktif: evre === "aktif",
        renk: this.palet.olay[tur] ?? this.palet.olayDiger,
        etki: o.etki.map(([b, p]): [number, number] => [b, p / Math.max(1, o.siddet)]),
        guc: olaySonumu(o, kare.saat),
      });
      if (cikti.length >= 16) break;
    }
    return cikti;
  }

  private simgeleriYenile(): void {
    this.simge?.guncelle({
      rozetler: this.oncekiRozet ?? [],
      nabiz: this.nabiz,
      rozetRenk: this.palet.rozet,
      olaylar: this.olayGirdileri(),
      secili: this.secili,
      secimRengi: this.palet.secimCizgi.slice(0, 3) as [number, number, number],
      ...(this.mulkKipi ? { mulkIsaretleri: this.mulkKumeleri, statikGizli: true, mulkRengi: this.palet.palet.sen ?? ([0, 0.47, 0.51] as RGB) } : {}),
    });
  }

  /** Mülk kipini aç/kapat (main.ts: `?sunucu` ya da `?yerles=1`). Bölge kipinde hiçbir şey değişmez. */
  mulkKipiAyarla(acik: boolean): void {
    if (this.mulkKipi === acik) return;
    this.mulkKipi = acik;
    this.oncekiRozet = null;
    this.mulkKumeImzasi = "";
    if (acik) this.mulkKumeleriniYenile();
    this.kareUygula(this.kare);
    if (!this.kare && this.simge) this.simgeleriYenile();
  }

  /** Oyuncunun ilçe ya da arsa noktaları ([boylam, enlem]); aynı küme tekrar verilirse hiçbir şey yeniden yazılmaz. */
  mulkIsaretleriAyarla(noktalar: ReadonlyArray<readonly [number, number]>): void {
    const imza = noktalar.map((n) => `${n[0].toFixed(4)},${n[1].toFixed(4)}`).join(";");
    if (imza === this.mulkImzasi) return;
    this.mulkImzasi = imza;
    this.mulkNoktalari = noktalar.map((n) => llVek(n[0], n[1]));
    this.mulkKumeImzasi = "";
    this.mulkKirli = true;
    if (this.mulkKipi) this.mulkKumeleriniYenile();
  }

  /** Mülk işaretlerini ekran uzayında kümeler; küme kümesi değiştiyse simgeleri yeniden yazar. */
  private mulkKumeleriniYenile(): void {
    this.mulkKirli = false;
    const k = this.kamera;
    k.updateMatrixWorld();
    const w = this.ortak.uEkran.value.x;
    const h = this.ortak.uEkran.value.y;
    const c = k.position;
    const kume = isaretleriKumele(this.mulkNoktalari, (p) => {
      // Kürenin görünen yüzü: yüzey noktası p, kamera konumu c için p·c > 1
      if (p[0] * c.x + p[1] * c.y + p[2] * c.z <= 1) return null;
      const v = this.gecici.set(p[0], p[1], p[2]).project(k);
      return [(v.x * 0.5 + 0.5) * w, (0.5 - v.y * 0.5) * h];
    });
    const imza = kume.map((m) => `${m.sayi}:${m.p[0].toFixed(3)},${m.p[1].toFixed(3)}`).join(";");
    if (imza === this.mulkKumeImzasi) return;
    this.mulkKumeImzasi = imza;
    this.mulkKumeleri = kume;
    if (this.simge) this.simgeleriYenile();
  }

  /** Mercek seç (tek mercek etkin). `mal` yalnız "mal" merceğinde kullanılır; mal < 0 ise "Genel"e döner. */
  mercekSec(m: Mercek, mal = -1): void {
    if (m === "mal" && mal < 0) m = "genel";
    this.mercek = m;
    this.mal = m === "mal" ? mal : -1;
    this.renkleriYenile();
  }

  /** Oyuncu belirlendi (Genel merceği ve rozetler ona göre). */
  oyuncuAyarla(ben: number): void {
    this.ben = ben;
    this.oncekiRozet = null;
    this.kareUygula(this.kare);
  }

  bolgeSec(i: number): void {
    this.secili = i;
    this.bolge.seciliAyarla(i);
    this.renkleriYenile();
    this.simgeleriYenile();
  }

  temaUygula(): void {
    this.palet = paletiOku();
    const p = this.palet;
    this.dunya.temaUygula(p);
    this.bolge.temaUygula(p);
    this.simge?.temaUygula(p);
    this.renderer.setClearColor(new Color(p.zemin), 1);
    this.renkleriYenile();
    if (this.kare && this.dizin) this.simgeleriYenile();
  }

  // --- boyut / seçim / uçuş --------------------------------------------------------------------------

  private boyutla(): void {
    const w = Math.max(1, this.konteyner.clientWidth);
    const h = Math.max(1, this.konteyner.clientHeight);
    this.renderer.setPixelRatio(this.pikselOrani);
    this.renderer.setSize(w, h, false);
    this.kontrol.boyutla(w, h);
    this.ortak.uEkran.value.set(w, h);
    this.mulkKirli = true;
    this.ortak.uPikselOran.value = this.pikselOrani;
    this.ortak.uOdak.value = (h * this.pikselOrani) / (2 * Math.tan((DIKEY_ACI * DERECE) / 2));
  }

  /** Ekran (CSS px) noktasındaki bölge indeksi (-1: yok). */
  bolgeIsin(x: number, y: number): number {
    const [o, yon] = this.kontrol.isin(x, y);
    const h = isinKureKesisimi(o, yon, BOLGE_YARICAPI);
    if (!h) return -1;
    const [lon, lat] = vekLl(h);
    const esnek = Math.min(2.5, Math.max(0.12, this.kontrol.durum.dist * 2.2));
    return this.bolge.bul(lon, lat, esnek);
  }

  bolgeyeUc(i: number): void {
    const b = this.harita.bolgeler[i];
    if (!b) return;
    const w = (b.kutu[2] - b.kutu[0]) * Math.cos((b.merkez[1] * Math.PI) / 180);
    const h = b.kutu[3] - b.kutu[1];
    const boyRad = Math.max(w, h, 0.4) * DERECE;
    this.kontrol.ucusYap({ p: this.merkezler[i] as Vek3, dist: Math.min(0.9, Math.max(0.09, boyRad * 3.6)) });
  }

  /** Oyun bölgelerinin ortalama yönü ve en uzak bölgeye açısı (radyan). */
  oyunMerkezi(): { p: Vek3; yayilim: number } {
    let t: Vek3 = [0, 0, 0];
    for (const m of this.merkezler) t = [t[0] + m[0], t[1] + m[1], t[2] + m[2]];
    const p = birim(t);
    let yayilim = 0.05;
    for (const m of this.merkezler) yayilim = Math.max(yayilim, aci(p, m));
    return { p, yayilim };
  }

  /** Açılış uçuşu: oyun bölgelerinin tümü ekrana sığacak kadar yakınlaş. */
  acilisUcusu(): void {
    const { p, yayilim } = this.oyunMerkezi();
    const a = this.kamera.aspect;
    const yarimDikey = Math.tan((DIKEY_ACI * DERECE) / 2);
    const dist = (yayilim * 1.3) / (yarimDikey * Math.min(1, a));
    this.kontrol.ucusYap({ p, dist: Math.min(dist, sigmaMesafesi(a)) });
  }

  /** Tüm küreyi gösteren uzak görünüm. */
  dunyayiGoster(): void {
    const { p } = this.oyunMerkezi();
    this.kontrol.ucusYap({ p, dist: enUzakMesafe(this.kamera.aspect) / 1.12 });
  }

  /** Bir noktaya (boylam, enlem) uç. */
  noktayaUc(boylam: number, enlem: number, dist: number): void {
    this.kontrol.ucusYap({ p: llVek(boylam, enlem), dist });
  }

  // --- döngü ------------------------------------------------------------------------------------------

  baslat(): void {
    const dongu = (ts: number): void => {
      if (this.durdu) return;
      requestAnimationFrame(dongu);
      if (document.hidden || this.askida) {
        this.sonZaman = 0;
        return;
      }
      const dt = this.sonZaman ? Math.min(0.25, (ts - this.sonZaman) / 1000) : 1 / 60;
      this.sonZaman = ts;
      this.cerceve++;
      this.kare1(ts, dt);
    };
    requestAnimationFrame(dongu);
  }

  durdur(): void {
    this.durdu = true;
  }

  private kare1(ts: number, dt: number): void {
    const cpuBas = performance.now();
    const degisti = this.kontrol.guncelle(dt);
    const o = this.ortak;
    o.uZaman.value = ts / 1000;
    const an = this.mutlakZamanKaynagi();
    const g = an !== null ? mutlakGunesYonu(an) : gunesYonu(this.simSaatiKaynagi());
    o.uGunes.value.set(g[0], g[1], g[2]);
    const dist = this.kontrol.durum.dist;
    o.uGenislikOlcek.value = Math.min(1.3, Math.max(0.12, dist * 0.5));
    o.uYakin.value = Math.min(1, Math.max(0, (1.5 - dist) / 0.6));
    if (this.mulkKipi && (degisti || this.mulkKirli) && this.mulkNoktalari.length > 1) this.mulkKumeleriniYenile();
    this.renderer.render(this.scene, this.kamera);
    this.cizimSonrasi?.(degisti, dt);
    this.cpuMs = this.cpuMs * 0.95 + (performance.now() - cpuBas) * 0.05;

    // fps ve uyarlamalı çözünürlük
    this.fpsPenceresi.push(dt);
    if (this.fpsPenceresi.length > 90) this.fpsPenceresi.shift();
    const ort = this.fpsPenceresi.reduce((a, b) => a + b, 0) / this.fpsPenceresi.length;
    this.fps = 1 / Math.max(1e-4, ort);
    if (this.adaptif && ts - this.sonAdaptif > 2500 && this.fpsPenceresi.length >= 60) {
      this.sonAdaptif = ts;
      if (this.fps < 30 && this.pikselOrani > 0.6) {
        this.pikselOrani = Math.max(0.6, this.pikselOrani * 0.8);
        this.boyutla();
      } else if (this.fps > 57 && this.pikselOrani < this.enYuksekPikselOrani) {
        this.pikselOrani = Math.min(this.enYuksekPikselOrani, this.pikselOrani * 1.15);
        this.boyutla();
      }
    }
  }

  olcum(): OlcumBilgisi {
    const i = this.renderer.info;
    return { fps: this.fps, cizimCagrisi: i.render.calls, ucgen: i.render.triangles, pikselOrani: this.pikselOrani, kare: this.cerceve, cpuMs: this.cpuMs };
  }
}

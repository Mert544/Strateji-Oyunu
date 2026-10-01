/**
 * Sahne: three.js sahnesini, katmanları, kamerayı ve çizim döngüsünü bir araya getirir.
 * Çizim çağrıları: yıldız, okyanus, kara, ülke çizgileri, bölge dolgusu, bölge çizgileri, seçim çizgisi,
 * kenar şeritleri, savaş yayları, parçacıklar, simgeler, atmosfer (yaklaşık 12).
 */
import { Color, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { AkisParcaciklari, malKenarlari } from "../akis/parcaciklar";
import { KenarSeritleri, SavasYaylari } from "../akis/seritler";
import { KameraKontrol } from "../kamera/kontrol";
import { DIKEY_ACI, enUzakMesafe, sigmaMesafesi, yerelBaz } from "../kamera/durum";
import { BolgeKatmani, BOLGE_YARICAPI } from "./bolge-katmani";
import { DunyaKatmani } from "./dunya";
import { gunesYonu } from "./gunes";
import { DERECE, aci, birim, isinKureKesisimi, llVek, vekLl } from "./matematik";
import type { Vek3 } from "./matematik";
import { ortakOlustur } from "./ortak";
import type { Ortak } from "./ortak";
import { SimgeKatmani } from "./simgeler";
import type { OlayGirdisi } from "./simgeler";
import { paletiOku } from "./tema";
import type { SahnePaleti } from "./tema";
import type { DunyaKarasi } from "../veri/cografya";
import type { DunyaHaritasi } from "../veri/harita-birlestir";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import { bolgeRenkleriniHesapla, bolgeTamponuOlustur } from "../veri/renkler";
import type { BolgeRenkTamponu } from "../veri/renkler";
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
  serit: KenarSeritleri | null = null;
  parcacik: AkisParcaciklari | null = null;
  savas: SavasYaylari | null = null;
  simge: SimgeKatmani | null = null;
  palet: SahnePaleti;
  dizin: Dizin | null = null;
  kare: Kare | null = null;
  malSecili = -1;
  /** "Tarım" harita görünümü (bölge dolgusu toprak verimliliği + ekim deseni); mal görünümünü geçersiz kılar. */
  tarimGorunumu = false;
  secili = -1;
  /** Görünen sim saati (kesirli); güneş yönü için. */
  simSaatiKaynagi: () => number = () => 0;
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

  /** Dizin (kenarlar, mallar) geldiğinde dinamik katmanları kurar. */
  dizinKur(dizin: Dizin): void {
    this.dizin = dizin;
    this.serit = new KenarSeritleri(dizin.kenarlar, this.merkezler, this.ortak);
    this.parcacik = new AkisParcaciklari(dizin, this.merkezler, this.ortak);
    this.savas = new SavasYaylari(this.merkezler, this.ortak);
    this.simge = new SimgeKatmani(
      this.harita.bolgeler,
      this.merkezler,
      this.harita.harita.bolgeler.map((b) => b.etiketler),
      this.ortak,
    );
    for (const k of [this.serit, this.savas, this.parcacik, this.simge]) for (const o of k.nesneler) this.scene.add(o);
    this.temaUygula();
    this.kareUygula(this.kare);
  }

  // --- durum güncelleme ----------------------------------------------------------------------------

  kareUygula(kare: Kare | null): void {
    this.kare = kare;
    this.renkleriYenile();
    if (!kare || !this.dizin) return;
    this.serit?.guncelle(kare, malKenarlari(kare, this.malSecili));
    this.parcacik?.guncelle(kare, this.malSecili);
    // Tarım görünümünde akış parçacıkları gizlenir: dolgu ve desen okunur kalsın.
    if (this.parcacik) for (const o of this.parcacik.nesneler) o.visible = !this.tarimGorunumu;
    this.savas?.guncelle(kare.savaslar);
    this.simgeleriYenile();
  }

  private renkleriYenile(): void {
    const dizin = this.dizin ?? this.onDizin();
    if (this.tarimGorunumu) tarimRenkleriniHesapla(this.kare, dizin, this.palet.tarim, this.renkler);
    else bolgeRenkleriniHesapla(this.kare, dizin, this.malSecili, this.palet.palet, this.renkler);
    this.bolge.renkleriYaz(this.renkler, this.secili, [1, 1, 1]);
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
      renkler: this.renkler,
      savaslar: this.kare?.savaslar ?? [],
      olaylar: this.olayGirdileri(),
      secili: this.secili,
      savasRengi: this.palet.savas,
      secimRengi: this.palet.secimCizgi.slice(0, 3) as [number, number, number],
    });
  }

  malSec(m: number): void {
    this.malSecili = m;
    this.tarimGorunumu = false;
    this.kareUygula(this.kare);
  }

  /** "Tarım" görünümünü aç/kapat. */
  tarimGorunumuAyarla(a: boolean): void {
    this.tarimGorunumu = a;
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
    this.serit?.temaUygula(p);
    this.savas?.temaUygula(p);
    this.parcacik?.temaUygula(p);
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
      if (document.hidden) {
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
    const g = gunesYonu(this.simSaatiKaynagi());
    o.uGunes.value.set(g[0], g[1], g[2]);
    const dist = this.kontrol.durum.dist;
    o.uGenislikOlcek.value = Math.min(1.3, Math.max(0.12, dist * 0.5));
    o.uYakin.value = Math.min(1, Math.max(0, (1.5 - dist) / 0.6));
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

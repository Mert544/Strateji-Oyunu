/**
 * L4 yürüyüş sahnesi (yuru.js yığınının girişi): küreden ve haritadan bağımsız ayrı bir three.js sahnesi.
 *
 * Gerçek sokak: Protomaps z15 karoları (işçide geometriye çevrilir), ~3×3 karo (~2,8 km) pencere, kayan orijin.
 * Oyun hissi (Capital Rift / Minecraft örneği): tepkisel kinematik kontrolcü (WASD/oklar anında koşu 7 m/s, Shift depar
 * 10 m/s, çubukla yürüme 4 m/s, anında dönüş, kısa zıplama, tıkla-git + yol bulma; telefonda dokun-git + sanal çubuk +
 * Zıpla), 2B çarpışma ve kayma; üçüncü şahıs takip kamerası (karakterin arkasında, 14 m, ~35°; gecikmesiz konum;
 * sağ tık/sürükle: yörünge, tekerlek: 6–40 m; tıkla-git yolunda karakterin arkasına hızla geçer; bina duvarına girerse
 * öne çekilir); kamera çatıların üstündeyken karakteri örten binada yarık kesme. Karakterler örneklenmiş (Quaternius
 * manken, CC0; tek çizim çağrısı, ileride diğer oyuncular). Karolar karakterle akar (ilçenin tamamında kesintisiz).
 * Arsa ızgarası yakın çevrede, parsel bayrakları uzaktan; bağlamsal `[E]` hapı (yönet / yapı kur / bilgi / satın al);
 * mini harita; ODbL atfı. Çizim yalnız bir şey değişince yapılır (boşta 0 fps).
 */
import { BufferAttribute, BufferGeometry, Color, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import type { ShaderMaterial } from "three";
import { esc, fmt, sayi } from "../arayuz/bicim";
import { bildir } from "../arayuz/bildirim";
import type { IlceSahipligi, MulkBaglantisi } from "../harita/baglanti";
import { arsaSinifi, hucreFiyati, SINIF_ADI } from "../harita/fiyat";
import { ARAZI_ADLARI, durumAl, durumSinifi, engelNedeni, hucreId, kisaAd, satinAlinabilir } from "../harita/hucre";
import type { Izgara } from "../harita/hucre";
import { ArsaKatmani, ASAMA_ADI, insaatKaynagiMi, ornekInsaatlar } from "./arsa";
import type { InsaatBilgisi } from "./arsa";
import { daireyiCoz, gorusVar, ilerle, kameraEngeli, karoEngeli, ortenVar } from "./carpisma";
import { Girdi } from "./girdi";
import { etkilesimSec } from "./etkilesim";
import type { Etkilesim } from "./etkilesim";
import { Kalabalik } from "./karakter";
import KaroIsci from "./karo.worker?worker&inline";
import { KaroYonetici } from "./karo-yonetici";
import { cerceveKur, dunyaHucre, dunyaKaro, dunyaLl, karoKenari, llDunya, orijinGerekli, orijinKaydir } from "./koordinat";
import type { Cerceve, Orijin } from "./koordinat";
import { aciYaklas, animasyonSec, arkaYaw, bakisNoktasi, hareketYonu, HIZ, KAMERA_GORUS, KARAKTER_OLCEK, KARAKTER_R, kameraKonumu, kameraSinirla, VARSAYILAN_KAMERA, yawTakip, yerKesisimi, yonAcisi, ZIPLA, ziplaAdimi } from "./kontrol";
import type { KameraDurumu } from "./kontrol";
import { binaMalzemesi, cizgiMalzemesi, katmanMalzemesi, kutuMalzemesi, temaGuncelle, yerMalzemesi } from "./malzeme";
import type { SisAyari } from "./malzeme";
import { MiniHarita } from "./mini-harita";
import { paletOku } from "./palet";
import type { YuruPaleti } from "./palet";
import karakterUrl from "./varlik/karakter.ykr?url";
import { yolBul } from "./yol-bulma";
import type { YolSorgusu } from "./yol-bulma";
import yuruCss from "./yuru.css?inline";
import yuruTemaCss from "./yuru-tema.css?inline";
import { ikon } from "../tasarim/ikon";
import { ortuIle } from "../tasarim/ortu";

export interface YuruGirisi {
  boylam: number;
  enlem: number;
  ilce: string | null;
  ilceAd: string;
  izgaraAl: () => Promise<Izgara | null>;
  baglanti: MulkBaglantisi | null;
  /** Protomaps z15 PMTiles arşivi (mutlak URL). */
  karoUrl: string;
  /** Haritaya dönüş (denetçi görünümü yeniden gösterir). */
  donus: () => void;
}

export interface YuruDurumu {
  acik: boolean;
  hazir: boolean;
  dunya: [number, number];
  ll: [number, number];
  hucre: string;
  hap: boolean;
  kart: boolean;
  yol: number;
  hiz: number;
  cizim: number;
  ucgen: number;
  karakter: string;
  orijin: [number, number];
  karo: ReturnType<KaroYonetici["istatistik"]>;
  kesme: boolean;
  /** Zıplama yüksekliği (m) ve oynayan animasyon. */
  y: number;
  anim: string;
  /** Karakter örneği sayısı (tek çizim çağrısı). */
  karakterOrnek: number;
  /** Bağlamsal etkileşim türü (hap). */
  etkilesim: string | null;
  /** Arsa katmanı köşe sayıları (ızgara, sahiplik dolgu/kenar) ve inşaat örnekleri. */
  arsa: { izgara: number; dolgu: number; kenar: number; insaat: number };
}

declare global {
  interface Window {
    /** Yürüyüş sınama kancası (Playwright). */
    __yuru?: {
      durum: () => YuruDurumu;
      olc: (ms: number) => Promise<{ fps: number; kare: number; cizimEnCok: number; ucgenEnCok: number; cpuMsOrt: number }>;
      sinamaHedef: (enAz?: number, enCok?: number) => { x: number; y: number; dunya: [number, number] } | null;
      /** Kamera durumunu ayarla (ekran görüntüleri için). */
      kamera: (k: Partial<KameraDurumu>) => void;
      /** Kamera ayarı, etkin mesafe (bina çarpışması sonrası), karakter yönü ve kamera konumu. */
      kameraDurum: () => KameraDurumu & { etkin: number; yon: number; konum: [number, number, number] };
      /** Karakterin ekrandaki boyu: ekran yüksekliğine oranı, piksel boyu ve ayak noktası. */
      karakterEkran: () => { oran: number; piksel: number; ayak: [number, number]; bas: [number, number] };
      /** Karakteri dünya metresiyle göreli taşı (karo akışı sınaması). */
      isinla: (dx: number, dz: number) => void;
      /** Karakteri boylam/enlem noktasına taşı (sınama; çarpışma dışı noktaya iner). */
      git: (boylam: number, enlem: number) => void;
    };
  }
}

/** Sis: yakın derinlik sakin ve yumuşak; ufuktaki binalar silik, pencere kenarı (≥925 m) hiç görünmez. */
const SIS: SisAyari = { yakin: 200, uzak: 760 };
/** Kısa ipucu şeridi bu kadar sn sonra solar. */
const IPUCU_SURESI = 10_000;
const DUR_HIZ = 0.05;

let cssEklendi = false;

export class YuruSahnesi {
  readonly kap: HTMLElement;
  private tuval: HTMLCanvasElement;
  private renderer: WebGLRenderer | null = null;
  private sahne = new Scene();
  private kamera = new PerspectiveCamera(KAMERA_GORUS.dikeyAci, 1, KAMERA_GORUS.yakin, KAMERA_GORUS.uzak);
  private isci: Worker | null = null;
  private palet: YuruPaleti;
  private malz: Record<"yer" | "bina" | "cizgi" | "izgara" | "dolgu" | "kenar" | "kutu" | "isaret", ShaderMaterial>;
  private girdi: Girdi;
  private mini = new MiniHarita();
  private ui: Record<"durum" | "hap" | "kart" | "baslik" | "ipucu", HTMLElement>;

  private acik = false;
  private hazir = false;
  private g: YuruGirisi | null = null;
  private cerceve: Cerceve = { X0: 0, Y0: 0, k: 1 };
  private orijin: Orijin = { x: 0, z: 0 };
  private karolar: KaroYonetici | null = null;
  private kalabalik: Kalabalik | null = null;
  /** Oyuncunun karakter örneği (kalabalıkta 0). */
  private benOrnek = -1;
  private karakterKaynak = "";
  private arsa: ArsaKatmani | null = null;
  private izgara: Izgara | null = null;
  private sahiplik: IlceSahipligi | null = null;
  private insaatlar: InsaatBilgisi[] = [];
  private ben = "ben";
  private merkezKaro = { x: NaN, y: NaN };

  // Karakter durumu (dünya metresi)
  private x = 0;
  private z = 0;
  private yon = 0;
  private hiz = 0;
  private y = 0;
  private vy = 0;
  private animAd = "dur";
  private animZaman = 0;
  private etkilesim: Etkilesim | null = null;
  private yol: [number, number][] = [];
  private yolDepar = false;
  private takili = 0;
  private cubuk: [number, number] = [0, 0];
  private kam: KameraDurumu = { ...VARSAYILAN_KAMERA };
  private kamHedef: [number, number, number] = [0, KAMERA_GORUS.hedefYuksek, 0];
  /** Bina çarpışmasından sonra etkin kamera mesafesi (m) ve son elle döndürme anı (ms). */
  private kamEtkin: number = VARSAYILAN_KAMERA.mesafe;
  private kamElSon = -1e9;
  private ipucuZamani = 0;
  private hucre = { x: NaN, y: NaN };
  private kesme = false;

  private golge: Mesh;
  private halka: Mesh;
  private isaret: Mesh;
  private raf = 0;
  private sonT = 0;
  private surekli = false;
  private kirli = true;
  private cizim = 0;
  private ucgen = 0;
  private cpuMs = 0;
  private temaGozcu: MutationObserver | null = null;
  private boyutGozcu: ResizeObserver;

  constructor(private sahneKap: HTMLElement) {
    if (!cssEklendi) {
      const st = document.createElement("style");
      st.textContent = yuruTemaCss + yuruCss;
      document.head.append(st);
      cssEklendi = true;
    }
    this.palet = paletOku();
    const p = this.palet;
    const bina = binaMalzemesi(p, SIS);
    this.malz = {
      yer: yerMalzemesi(p, SIS),
      bina,
      cizgi: cizgiMalzemesi(p, SIS, bina),
      izgara: katmanMalzemesi(1, [14, 50], p, SIS),
      dolgu: katmanMalzemesi(1, null, p, SIS),
      kenar: katmanMalzemesi(1, null, p, SIS),
      kutu: kutuMalzemesi(p, SIS),
      isaret: katmanMalzemesi(1, null, p, SIS),
    };
    this.kap = document.createElement("div");
    this.kap.id = "yuru-kap";
    this.kap.hidden = true;
    this.kap.setAttribute("role", "application");
    this.kap.setAttribute("aria-label", "Sokak yürüyüşü");
    const mobil = window.matchMedia("(pointer: coarse)").matches;
    this.kap.innerHTML = `
      <canvas class="yuru-tuval" tabindex="0" aria-label="Sokak sahnesi: yürümek için tıklayın ya da WASD"></canvas>
      <div class="yuru-ust">
        <button type="button" class="yuru-geri" data-eylem="don" title="Haritaya dön (Esc)">${ikon("chevron-left", 18)}Haritaya dön</button>
        <span class="yuru-baslik"></span>
      </div>
      <button type="button" class="yuru-hap" data-eylem="kart" hidden>${mobil ? "" : "<kbd>E</kbd>"}<span></span></button>
      <button type="button" class="yuru-zipla yalniz-dokunma" data-eylem="zipla" aria-label="Zıpla">Zıpla</button>
      <section class="yuru-kart" aria-label="Parsel kartı" hidden></section>
      <div class="yuru-ipucu">${mobil ? "Solda sürükle: koş · sağda sürükle: kamera · dokun: git" : "WASD: koş · Shift: depar · Boşluk: zıpla · sağ tık sürükle: kamera · tekerlek: yakınlaş · E: etkileşim"}</div>
      <div class="yuru-atif"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap katkıcıları</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> · Karakter: Quaternius (CC0)</div>
      <div class="yuru-durum" role="status" aria-live="polite"></div>`;
    this.kap.append(this.mini.tuval);
    sahneKap.append(this.kap);
    const $ = (s: string): HTMLElement => this.kap.querySelector(s) as HTMLElement;
    this.tuval = $(".yuru-tuval") as HTMLCanvasElement;
    this.ui = { durum: $(".yuru-durum"), hap: $(".yuru-hap"), kart: $(".yuru-kart"), baslik: $(".yuru-baslik"), ipucu: $(".yuru-ipucu") };
    this.girdi = new Girdi(this.tuval, this.kap, {
      tikla: (x, y) => this.tikla(x, y),
      dondur: (dx, dy) => {
        this.kamElSon = performance.now();
        this.kam = kameraSinirla({ yaw: this.kam.yaw - dx * 0.0062, egim: this.kam.egim + dy * 0.0045, mesafe: this.kam.mesafe });
        this.iste();
      },
      yakinlas: (c) => {
        this.kam = kameraSinirla({ ...this.kam, mesafe: this.kam.mesafe * c });
        this.iste();
      },
      cubuk: (i, s) => {
        this.cubuk = [i, s];
        if (i || s) this.yolBirak();
        this.iste();
      },
    });
    this.kap.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("[data-eylem]") as HTMLElement | null;
      const ey = b?.dataset["eylem"];
      if (ey === "don") this.kapat();
      else if (ey === "kart") this.kartAc();
      else if (ey === "kart-kapat") this.kartKapat();
      else if (ey === "zipla") this.zipla();
      else if (ey === "satin-al") void this.satinAl();
    });
    this.mini.tuval.addEventListener("click", () => this.kapat());
    this.mini.tuval.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") this.kapat();
    });
    // Klavye: yakalama evresinde (harita denetçisinin Esc/Backspace işleyicisinden önce); açıkken olay yutulur.
    window.addEventListener("keydown", (e) => this.tusBas(e), true);
    window.addEventListener("keyup", (e) => {
      if (!this.acik) return;
      this.girdi.tusBirakildi(e.code);
      e.stopImmediatePropagation();
    }, true);
    window.addEventListener("blur", () => this.girdi.sifirla());
    this.boyutGozcu = new ResizeObserver(() => this.boyutla());
    this.boyutGozcu.observe(this.kap);

    // Karakter gölgesi (yumuşak disk) ve tıkla-git hedef halkası
    this.golge = new Mesh(diskGeometrisi(0.64, 0.32, this.palet.golge), this.malz.isaret);
    // Oyuncu halkası: karakter uzaktan ve kalabalıkta seçilsin (oyuncu renginde, durağan)
    this.halka = new Mesh(halkaGeometrisi(0.56, 0.69, this.palet.ben), this.malz.isaret);
    this.halka.renderOrder = 4;
    this.sahne.add(this.halka);
    this.golge.renderOrder = 4;
    this.isaret = new Mesh(halkaGeometrisi(0.55, 0.8, this.palet.ben), this.malz.isaret);
    this.isaret.renderOrder = 4;
    this.isaret.visible = false;
    this.sahne.add(this.golge, this.isaret);

    window.__yuru = {
      durum: () => this.durum(),
      olc: (ms) => this.olc(ms),
      sinamaHedef: (a, b) => this.sinamaHedef(a, b),
      kamera: (k) => {
        this.kam = kameraSinirla({ ...this.kam, ...k });
        this.kamEtkin = Math.min(this.kamEtkin, this.kam.mesafe);
        this.kamElSon = performance.now();
        this.iste();
      },
      kameraDurum: () => ({ ...this.kam, etkin: this.kamEtkin, yon: this.yon, konum: this.kamera.position.toArray() as [number, number, number] }),
      karakterEkran: () => this.karakterEkran(),
      isinla: (dx, dz) => {
        this.x += dx;
        this.z += dz;
        this.yolBirak();
        this.iste();
      },
      git: (boylam, enlem) => {
        [this.x, this.z] = llDunya(this.cerceve, boylam, enlem);
        this.dogusDuzelt();
        this.yolBirak();
        this.iste();
      },
    };
  }

  // --- yaşam döngüsü ---------------------------------------------------------------------------------

  get acikMi(): boolean {
    return this.acik;
  }

  async ac(g: YuruGirisi): Promise<void> {
    this.g = g;
    this.acik = true;
    this.hazir = false;
    this.kap.hidden = false;
    document.body.classList.add("yuru-acik");
    this.ui.baslik.textContent = `${g.ilceAd || "Sokak"} · sokak`;
    this.durumYaz("Sokak yükleniyor…");
    this.kartKapat();
    this.ui.hap.hidden = true;
    this.girdi.sifirla();
    this.yolBirak();
    this.cubuk = [0, 0];
    if (!this.temaGozcu) {
      this.temaGozcu = new MutationObserver(() => this.temaUygula());
      this.temaGozcu.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => this.temaUygula());
    }
    try {
      this.rendererKur();
    } catch (e) {
      this.durumYaz(`3B çizim başlatılamadı: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    this.temaUygula();

    // Oturum çerçevesi: giriş noktasının z20 hücresi
    this.karolar?.temizle();
    this.cerceve = cerceveKur(g.boylam, g.enlem);
    const [x, z] = llDunya(this.cerceve, g.boylam, g.enlem);
    this.x = x;
    this.z = z;
    this.hiz = 0;
    this.kam = { ...VARSAYILAN_KAMERA };
    this.kamEtkin = this.kam.mesafe;
    this.orijin = orijinKaydir(x, z, karoKenari(this.cerceve));
    if (!this.isci) {
      this.isci = new KaroIsci();
      KaroYonetici.isciKur(this.isci, g.karoUrl);
    }
    this.karolar = new KaroYonetici(this.sahne, this.isci, this.cerceve, { yer: this.malz.yer, bina: this.malz.bina, cizgi: this.malz.cizgi }, () => this.iste());
    this.karolar.orijinAyarla(this.orijin);
    if (this.arsa) {
      for (const m of [this.arsa.izgara, this.arsa.dolgu, this.arsa.kenar, this.arsa.insaat]) this.sahne.remove(m);
    }
    this.arsa = new ArsaKatmani(this.sahne, this.cerceve, this.palet, { izgara: this.malz.izgara, dolgu: this.malz.dolgu, kenar: this.malz.kenar, kutu: this.malz.kutu });
    this.arsa.orijinAyarla(this.orijin);
    this.merkezKaro = { x: NaN, y: NaN };
    this.hucre = { x: NaN, y: NaN };
    this.karoPenceresi();

    // Karakter, ızgara, sahiplik, inşaat (paralel)
    const karakterP = this.kalabalik ? Promise.resolve(null) : Kalabalik.yukle(karakterUrl, this.palet, SIS);
    const veriP = this.arsaVerisi(g);
    const [k] = await Promise.all([karakterP, veriP]);
    if (k) {
      this.kalabalik = k.kalabalik;
      this.karakterKaynak = k.kaynak;
      this.benOrnek = k.kalabalik.ekle(this.palet.ben);
      this.sahne.add(k.kalabalik.mesh);
    }
    this.y = 0;
    this.vy = 0;
    // Merkez karo gelene dek bekle (en çok 10 sn), sonra çarpışmaya göre doğuş noktasını düzelt
    const t0 = performance.now();
    while (this.acik && this.g === g && !this.karolar.hazir(true, this.merkezKaro) && performance.now() - t0 < 10_000) await new Promise((r) => setTimeout(r, 50));
    if (!this.acik || this.g !== g) return;
    this.dogusDuzelt();
    this.acilisBakisi();
    this.hazir = true;
    this.durumYaz("");
    this.kamHedef = [this.x - this.orijin.x, KAMERA_GORUS.hedefYuksek, this.z - this.orijin.z];
    this.ipucuGoster();
    this.tuval.focus({ preventScroll: true });
    this.iste();
  }

  kapat(): void {
    if (!this.acik) return;
    this.acik = false;
    if (this.ipucuZamani) clearTimeout(this.ipucuZamani);
    this.ipucuZamani = 0;
    this.girdi.sifirla();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    // Sokak → harita: kâğıt örtü altında (tersi yönde aynı geçiş)
    void ortuIle(() => {
      if (this.acik) return;
      this.kap.hidden = true;
      document.body.classList.remove("yuru-acik");
      this.g?.donus();
    });
  }

  private async arsaVerisi(g: YuruGirisi): Promise<void> {
    this.izgara = null;
    this.sahiplik = null;
    this.ben = g.baglanti?.ben.id ?? "ben";
    let insaatlar: InsaatBilgisi[] = [];
    this.insaatlar = [];
    try {
      this.izgara = await g.izgaraAl();
      if (g.ilce && g.baglanti) {
        this.sahiplik = await g.baglanti.sahiplikAl(g.ilce);
        insaatlar = insaatKaynagiMi(g.baglanti) ? await g.baglanti.insaatlarAl(g.ilce) : ornekInsaatlar(this.sahiplik, this.ben);
      }
    } catch (e) {
      console.warn("Arsa verisi alınamadı:", e);
    }
    this.insaatlar = insaatlar;
    this.arsa?.veriAyarla(this.sahiplik, this.ben, insaatlar);
    this.insaatEngeli();
  }

  /** Gövde/Tamam aşamasındaki yer tutucular çarpışır (ayrı sözde karo). */
  private insaatEngeli(): void {
    const k = this.karolar;
    const h = this.arsa?.engelHalkalari() ?? [];
    if (!k) return;
    k.engel.sil("insaat");
    if (!h.length) return;
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    for (const { halka } of h)
      for (let i = 0; i < halka.length; i += 2) {
        x0 = Math.min(x0, halka[i]!);
        x1 = Math.max(x1, halka[i]!);
        z0 = Math.min(z0, halka[i + 1]!);
        z1 = Math.max(z1, halka[i + 1]!);
      }
    const kok = [x0 - 1, z0 - 1];
    const kenar = Math.max(x1 - x0, z1 - z0) + 2;
    const nokta: number[] = [];
    const bas = [0];
    for (const { halka } of h) {
      for (let i = 0; i < halka.length; i += 2) nokta.push(halka[i]! - kok[0]!, halka[i + 1]! - kok[1]!);
      bas.push(nokta.length / 2);
    }
    k.engel.ekle(
      "insaat",
      karoEngeli({ nokta: Float32Array.from(nokta), halkaBas: Uint32Array.from(bas), bina: Uint32Array.from(h.map((_, i) => i)), ust: Float32Array.from(h.map((x) => x.ust)) }, kok[0]!, kok[1]!, kenar),
    );
  }

  private rendererKur(): void {
    if (this.renderer) return;
    const mobil = window.matchMedia("(pointer: coarse)").matches;
    const r = new WebGLRenderer({ canvas: this.tuval, antialias: !mobil, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobil ? 1.5 : 2));
    this.renderer = r;
    this.tuval.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.durumYaz("WebGL bağlamı kayboldu; haritaya dönüp yeniden deneyin.");
    });
    this.boyutla();
  }

  private boyutla(): void {
    const r = this.renderer;
    if (!r) return;
    const w = Math.max(1, this.kap.clientWidth);
    const h = Math.max(1, this.kap.clientHeight);
    r.setSize(w, h, false);
    this.kamera.aspect = w / h;
    this.kamera.updateProjectionMatrix();
    this.iste();
  }

  private temaUygula(): void {
    this.palet = paletOku();
    for (const m of Object.values(this.malz)) temaGuncelle(m, this.palet);
    this.renderer?.setClearColor(new Color().setRGB(...this.palet.gok, "srgb"));
    this.kalabalik?.temaAyarla(this.palet);
    if (this.kalabalik && this.benOrnek >= 0) this.kalabalik.renkAyarla(this.benOrnek, this.palet.ben);
    this.arsa?.paletAyarla(this.palet);
    this.golge.geometry.dispose();
    this.golge.geometry = diskGeometrisi(0.64, this.palet.koyu ? 0.45 : 0.3, this.palet.golge);
    this.isaret.geometry.dispose();
    this.isaret.geometry = halkaGeometrisi(0.55, 0.8, this.palet.ben);
    this.halka.geometry.dispose();
    this.halka.geometry = halkaGeometrisi(0.56, 0.69, this.palet.ben);
    this.mini.gecersiz();
    this.iste();
  }

  private durumYaz(m: string): void {
    this.ui.durum.textContent = m;
    this.ui.durum.hidden = !m;
  }

  /**
   * Açılışta karakter ve kamera en uzun serbest koridora (genelde sokağa) bakar: kamera karakterin arkasında durur.
   * Eşit uzunlukta koridorlarda kuzeye en yakın olan seçilir.
   */
  private acilisBakisi(): void {
    const e = this.karolar?.engel;
    if (!e) return;
    let enIyi = -1;
    let aci = Math.PI;
    const adaylar = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2).sort((a, b) => Math.abs(a - Math.PI) - Math.abs(b - Math.PI));
    for (const a of adaylar) {
      const dx = Math.sin(a);
      const dz = Math.cos(a);
      let s = 0;
      for (let d = 8; d <= 96; d += 8) {
        if (!gorusVar(e, this.x, this.z, this.x + dx * d, this.z + dz * d, KARAKTER_R + 0.2)) break;
        s = d;
      }
      if (s > enIyi) {
        enIyi = s;
        aci = a;
      }
    }
    this.yon = aci;
    this.kam = { ...this.kam, yaw: arkaYaw(aci) };
    this.kamEtkin = this.kam.mesafe;
  }

  /** Kısa ipucu şeridi: açılışta görünür, 10 sn sonra solar (CSS geçişi). */
  private ipucuGoster(): void {
    this.ui.ipucu.classList.remove("solgun");
    if (this.ipucuZamani) clearTimeout(this.ipucuZamani);
    this.ipucuZamani = window.setTimeout(() => this.ui.ipucu.classList.add("solgun"), IPUCU_SURESI);
  }

  /** Doğuş noktası bir binanın içindeyse ya da çarpışıyorsa en yakın serbest noktaya taşı (sarmal arama). */
  private dogusDuzelt(): void {
    const e = this.karolar?.engel;
    if (!e) return;
    const serbest = (x: number, z: number): boolean => e.icinde(x, z) === null && !daireyiCoz(e, x, z, KARAKTER_R + 0.2).carpti;
    if (serbest(this.x, this.z)) return;
    for (let r = 1; r < 120; r += 1)
      for (let a = 0; a < 16; a++) {
        const x = this.x + Math.cos((a / 16) * Math.PI * 2) * r;
        const z = this.z + Math.sin((a / 16) * Math.PI * 2) * r;
        if (serbest(x, z)) {
          this.x = x;
          this.z = z;
          return;
        }
      }
  }

  // --- girdi ----------------------------------------------------------------------------------------

  private tusBas(e: KeyboardEvent): void {
    if (!this.acik) return;
    const t = e.target as HTMLElement;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
    e.stopImmediatePropagation();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const kod = e.code;
    if (kod === "Escape") {
      e.preventDefault();
      if (!this.ui.kart.hidden) this.kartKapat();
      else this.kapat();
      return;
    }
    if (kod === "KeyM") {
      this.kapat();
      return;
    }
    if (kod === "KeyE") {
      if (!this.ui.kart.hidden) this.kartKapat();
      else if (!this.ui.hap.hidden) this.kartAc();
      return;
    }
    if (kod === "Space") {
      e.preventDefault();
      this.zipla();
      return;
    }
    if (kod === "Equal" || kod === "NumpadAdd") this.girdiYakinlas(0.85);
    else if (kod === "Minus" || kod === "NumpadSubtract") this.girdiYakinlas(1 / 0.85);
    if (/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Shift(Left|Right))$/.test(kod)) {
      e.preventDefault();
      this.girdi.tusBasildi(kod);
      if (!kod.startsWith("Shift")) this.yolBirak();
      this.iste();
    }
  }

  private zipla(): void {
    if (!this.hazir || this.y > 0 || this.vy > 0) return;
    this.vy = ZIPLA.hiz;
    this.iste();
  }

  private girdiYakinlas(c: number): void {
    this.kam = kameraSinirla({ ...this.kam, mesafe: this.kam.mesafe * c });
    this.iste();
  }

  private yolBirak(): void {
    this.yol = [];
    this.isaret.visible = false;
  }

  /** Ekran noktası → yer düzlemi (dünya metresi). */
  private ekrandanYer(sx: number, sy: number): [number, number] | null {
    const w = this.tuval.clientWidth;
    const h = this.tuval.clientHeight;
    const v = new Vector3((sx / w) * 2 - 1, -(sy / h) * 2 + 1, 0.5).unproject(this.kamera).sub(this.kamera.position).normalize();
    const p = this.kamera.position;
    const k = yerKesisimi([p.x, p.y, p.z], [v.x, v.y, v.z]);
    return k ? [k[0] + this.orijin.x, k[1] + this.orijin.z] : null;
  }

  private yolSorgusu(): YolSorgusu {
    const e = this.karolar!.engel;
    return {
      engelli: (x, z) => e.icinde(x, z) !== null || daireyiCoz(e, x, z, KARAKTER_R).carpti,
      gorus: (ax, az, bx, bz) => gorusVar(e, ax, az, bx, bz, KARAKTER_R),
    };
  }

  /** Tıkla-git: yer noktasına yol bul (görüş varsa düz), uzun yolda koş. */
  private tikla(sx: number, sy: number): void {
    if (!this.hazir || !this.karolar) return;
    this.tuval.focus({ preventScroll: true });
    const p = this.ekrandanYer(sx, sy);
    if (!p || Math.hypot(p[0] - this.x, p[1] - this.z) > 900) return;
    this.yolKur(p[0], p[1]);
  }

  private yolKur(hx: number, hz: number): void {
    const y = yolBul(this.yolSorgusu(), this.x, this.z, hx, hz);
    this.yol = y;
    this.takili = 0;
    let L = 0;
    let [px, pz] = [this.x, this.z];
    for (const [x, z] of y) {
      L += Math.hypot(x - px, z - pz);
      [px, pz] = [x, z];
    }
    this.yolDepar = L > HIZ.kendiDeparEsigi;
    const son = y[y.length - 1]!;
    this.isaret.position.set(son[0] - this.orijin.x, 0.07, son[1] - this.orijin.z);
    this.isaret.visible = true;
    this.iste();
  }

  // --- kart ve hap ----------------------------------------------------------------------------------

  /** Bağlamsal kart: parsel bilgisi + etkileşime göre eylem (satın al; yönet/yapı kur ileride bina paneline bağlanır). */
  private kartAc(): void {
    const h = this.hucre;
    if (Number.isNaN(h.x)) return;
    const id = hucreId(h.x, h.y);
    const d = this.izgara ? durumAl(this.izgara, h.x, h.y) : 0;
    const sh = this.sahiplik?.hucreler.get(id);
    const benim = sh?.sahip === this.ben;
    const neden = engelNedeni(d);
    const sahip = sh ? (benim ? "Sen" : (this.g?.baglanti?.oyuncuAdi(sh.sahip) ?? sh.sahip)) : neden ? "Satılık değil" : "Sahipsiz";
    const ins = this.arsa?.insaatBul(id);
    const [lon, lat] = dunyaLl(this.cerceve, this.x, this.z);
    const e = this.etkilesim;
    const fiyat = this.hucreFiyat(d);
    let eylem = "";
    if (e?.tur === "satin-al") eylem = `<button type="button" class="birincil" data-eylem="satin-al">Satın al · ${fiyat}</button>`;
    else if (e?.tur === "yonet") eylem = `<button type="button" disabled title="Bina paneli sonraki dilimde">Yönet (yakında)</button>`;
    else if (e?.tur === "kur") eylem = `<button type="button" disabled title="İnşa modu sonraki dilimde">Yapı kur (yakında)</button>`;
    const k = this.ui.kart;
    k.innerHTML = `
      <h3><span>Parsel ${esc(kisaAd(id))}</span><button type="button" data-eylem="kart-kapat" aria-label="Kartı kapat">${ikon("x", 18)}</button></h3>
      <dl>
        <dt>Sahip</dt><dd data-alan="sahip">${sh ? `<span class="sahip-isaret" style="background:${benim ? "var(--sen)" : "var(--murekkep-3)"}"></span>` : ""}${esc(sahip)}</dd>
        <dt>Sınıf</dt><dd data-alan="sinif">${neden ? esc(neden) : `${SINIF_ADI[sh?.sinif ?? arsaSinifi(d)]} · ${ARAZI_ADLARI[durumSinifi(d)] ?? ""}`}</dd>
        ${sh ? `<dt>Değer</dt><dd>${fmt(sh.degerMili / 1000)} ₺</dd>` : !neden && fiyat ? `<dt>Fiyat</dt><dd>${fiyat}</dd>` : ""}
        <dt>Yapı</dt><dd data-alan="insaat">${ins ? `${esc(ASAMA_ADI[ins.asama])}${ins.ornek ? " <small>(örnek)</small>" : ""}` : "Yok"}</dd>
        <dt>Konum</dt><dd>${sayi(lat, 5)}° K, ${sayi(lon, 5)}° D</dd>
      </dl>${eylem ? `<div class="yuru-kart-eylem">${eylem}</div>` : ""}`;
    k.hidden = false;
  }

  private hucreFiyat(d: number): string {
    const s = this.sahiplik;
    if (!s || !satinAlinabilir(d)) return "";
    return `${fmt(hucreFiyati(arsaSinifi(d), s.satilmis, s.uygun))} ₺`;
  }

  /** Bulunulan hücreyi satın al (sahte bağdaştırıcı ya da sunucu; haritadaki satın almayla aynı komut). */
  private async satinAl(): Promise<void> {
    const g = this.g;
    const h = this.hucre;
    if (!g?.baglanti || !g.ilce || !this.izgara || Number.isNaN(h.x)) return;
    const id = hucreId(h.x, h.y);
    const d = durumAl(this.izgara, h.x, h.y);
    try {
      const r = await g.baglanti.parselAl({ tur: "parsel_al", ilce: g.ilce, hucreler: [id], sinif: arsaSinifi(d) });
      if (!r.tamam) {
        bildir(`Olmadı: ${r.mesaj}`, "hata");
        return;
      }
      bildir(`Parsel satın alındı: 1 hücre, ${fmt(r.toplamMili / 1000)} ₺.`, "tamam");
      this.sahiplik = await g.baglanti.sahiplikAl(g.ilce);
      this.arsa?.veriAyarla(this.sahiplik, this.ben, this.insaatlar);
      this.arsa?.guncelle(this.hucre);
      this.mini.gecersiz();
      this.hapGuncelle(true);
      this.kartAc();
      this.iste();
    } catch (e) {
      bildir(`Olmadı: ${e instanceof Error ? e.message : String(e)}`, "hata");
    }
  }

  private kartKapat(): void {
    this.ui.kart.hidden = true;
  }

  /** Bulunulan hücreye göre bağlamsal hap. */
  private hapGuncelle(zorla = false): void {
    const h = this.hucre;
    const d = this.izgara && !Number.isNaN(h.x) ? durumAl(this.izgara, h.x, h.y) : 0;
    const id = Number.isNaN(h.x) ? "" : hucreId(h.x, h.y);
    const sh = this.sahiplik?.hucreler.get(id);
    const e = etkilesimSec({
      durum: d,
      satinAlinabilir: satinAlinabilir(d),
      sahip: sh?.sahip ?? null,
      ...(sh && sh.sahip !== this.ben ? { sahipAdi: this.g?.baglanti?.oyuncuAdi(sh.sahip) ?? sh.sahip } : {}),
      ben: this.ben,
      insaat: !!this.arsa?.insaatBul(id),
      fiyat: this.hucreFiyat(d),
    });
    const degisti = zorla || e?.tur !== this.etkilesim?.tur || e?.etiket !== this.etkilesim?.etiket;
    this.etkilesim = e;
    this.ui.hap.hidden = !e;
    if (!e) {
      this.kartKapat();
      return;
    }
    (this.ui.hap.querySelector("span") as HTMLElement).textContent = e.etiket;
    this.ui.hap.dataset["tur"] = e.tur;
    if (degisti && !this.ui.kart.hidden) this.kartAc();
  }

  // --- döngü -----------------------------------------------------------------------------------------

  /** Bir sonraki kareyi iste (çizim yalnız gerektiğinde). */
  private iste(): void {
    this.kirli = true;
    if (!this.acik || this.raf) return;
    this.raf = requestAnimationFrame((t) => this.kare(t));
  }

  private karoPenceresi(): void {
    const m = dunyaKaro(this.cerceve, this.x, this.z);
    if (m.x === this.merkezKaro.x && m.y === this.merkezKaro.y) return;
    this.merkezKaro = m;
    this.karolar?.pencereAyarla(m);
  }

  private kare(t: number): void {
    this.raf = 0;
    if (!this.acik || !this.renderer) return;
    const dt = this.sonT ? Math.min(0.05, (t - this.sonT) / 1000) : 1 / 60;
    this.sonT = t;
    const c0 = performance.now();
    let devam = this.surekli;
    if (this.hazir) devam = this.adim(dt) || devam;
    this.kameraGuncelle(dt);
    this.renderer.render(this.sahne, this.kamera);
    this.cizim = this.renderer.info.render.calls;
    this.ucgen = this.renderer.info.render.triangles;
    this.cpuMs = performance.now() - c0;
    this.kirli = false;
    const k = this.karolar?.istatistik();
    if (devam || (k && k.bekleyen > 0 && !this.hazir)) this.iste();
    else this.sonT = 0;
  }

  /** Karakter adımı (ivmesiz, tepkisel); hareket varsa true. */
  private adim(dt: number): boolean {
    const e = this.karolar!.engel;
    const tg = this.girdi.tusGirdisi();
    let [ileri, sag] = [tg.ileri, tg.sag];
    let hedefHiz = 0;
    if (ileri || sag) hedefHiz = tg.kos ? HIZ.depar : HIZ.kos;
    else if (this.cubuk[0] || this.cubuk[1]) {
      [ileri, sag] = this.cubuk;
      const m = Math.hypot(ileri, sag);
      hedefHiz = m < 0.55 ? HIZ.yuru : m < 0.97 ? HIZ.kos : HIZ.depar;
    }
    let vx = 0;
    let vz = 0;
    if (hedefHiz > 0) {
      const [dx, dz] = hareketYonu(ileri, sag, this.kam.yaw);
      const L = Math.hypot(dx, dz) || 1;
      vx = (dx / L) * hedefHiz;
      vz = (dz / L) * hedefHiz;
    } else if (this.yol.length) {
      const yolHiz = this.yolDepar || tg.kos ? HIZ.depar : HIZ.kos;
      let [hx, hz] = this.yol[0]!;
      let d = Math.hypot(hx - this.x, hz - this.z);
      // Ara noktayı geçerken sapmamak için eşik, bir karede alınan yola göre büyür
      while (d < Math.max(0.25, yolHiz * dt * 0.6) && this.yol.length) {
        this.yol.shift();
        if (!this.yol.length) break;
        [hx, hz] = this.yol[0]!;
        d = Math.hypot(hx - this.x, hz - this.z);
      }
      if (!this.yol.length) this.isaret.visible = false;
      else {
        hedefHiz = yolHiz;
        if (this.yol.length === 1) hedefHiz = Math.min(hedefHiz, Math.max(1.2, d * 6));
        vx = ((hx - this.x) / d) * hedefHiz;
        vz = ((hz - this.z) / d) * hedefHiz;
      }
    }
    const once = [this.x, this.z];
    if (hedefHiz > 0) {
      const r = ilerle(e, this.x, this.z, vx * dt, vz * dt, KARAKTER_R);
      this.x = r.x;
      this.z = r.z;
      const gercek = Math.hypot(this.x - once[0]!, this.z - once[1]!) / dt;
      if (this.yol.length && gercek < hedefHiz * 0.25) {
        this.takili += dt;
        if (this.takili > 0.6) this.yolBirak();
      } else this.takili = 0;
      this.hiz = gercek;
      // Dönüş anında (oyunsu); kamera yalnız tıkla-git yolunda karakterin arkasına hızla geçer, WASD'de elle
      // döndürülmedikçe sabit kalır (yan basışta kamera dönmez: kayarak yürümek Minecraft/Roblox gibi)
      if (gercek > DUR_HIZ) this.yon = aciYaklas(this.yon, yonAcisi(vx, vz), HIZ.donus * dt);
      const yoldaGidiyor = this.yol.length > 0 && !tg.ileri && !tg.sag && !this.cubuk[0] && !this.cubuk[1];
      this.kam = { ...this.kam, yaw: yawTakip(this.kam.yaw, this.yon, dt, yoldaGidiyor && gercek > DUR_HIZ, performance.now() - this.kamElSon < KAMERA_GORUS.elBekleme * 1000) };
    } else this.hiz = 0;
    // Zıplama (kinematik; binaların üstüne çıkılmaz, çarpışma 2B)
    const havada = this.y > 0 || this.vy > 0;
    if (havada) [this.y, this.vy] = ziplaAdimi(this.y, this.vy, dt);
    // Animasyon: hıza göre seç, oynatma oranı doğal hızına göre (ayak kayması sınırlı)
    const ad = animasyonSec(this.hiz, this.y > 0);
    if (ad !== this.animAd) {
      this.animAd = ad;
      this.animZaman = 0;
    }
    const a = this.kalabalik?.animasyon(ad);
    if (a && a.hiz > 0) this.animZaman += dt * Math.min(2.2, Math.max(0.6, this.hiz / a.hiz));
    const hareket = this.hiz > DUR_HIZ || havada;

    // Kayan orijin
    const kenar = karoKenari(this.cerceve);
    if (orijinGerekli(this.orijin, this.x, this.z, kenar * 0.75)) {
      this.orijin = orijinKaydir(this.x, this.z, kenar);
      this.karolar!.orijinAyarla(this.orijin);
      this.arsa?.orijinAyarla(this.orijin);
      if (this.yol.length) {
        const son = this.yol[this.yol.length - 1]!;
        this.isaret.position.set(son[0] - this.orijin.x, 0.07, son[1] - this.orijin.z);
      }
    }
    this.karoPenceresi();
    const hc = dunyaHucre(this.cerceve, this.x, this.z);
    if (hc.x !== this.hucre.x || hc.y !== this.hucre.y) {
      this.hucre = hc;
      this.arsa?.guncelle(hc);
      this.hapGuncelle();
    }
    const lx = this.x - this.orijin.x;
    const lz = this.z - this.orijin.z;
    if (this.kalabalik && this.benOrnek >= 0) this.kalabalik.guncelle(this.benOrnek, { x: lx, y: this.y, z: lz, yon: this.yon, anim: this.animAd, zaman: this.animZaman });
    this.golge.position.set(lx, 0.06, lz);
    this.halka.position.set(lx, 0.065, lz);
    this.malz.izgara.uniforms["uMerkez"]!.value = [lx, lz];
    if (this.karolar) this.mini.ciz(this.cerceve, this.x, this.z, this.yon, this.karolar.engel, this.sahiplik, this.ben, this.palet);
    return hareket || this.yol.length > 0 || ileri !== 0 || sag !== 0;
  }

  /**
   * Üçüncü şahıs takip kamerası: karakterin arkasında ve hafif üstünde; konum gecikmesizdir (oyun hissi). Bakış noktası
   * karakterin biraz önündedir, böylece karakter kadrajın alt üçte birinde durur ve ufuk görünür. Kamera bina duvarına
   * girecekse karaktere doğru öne çekilir (anlık), duvar kalkınca hızla geri açılır. Duvar yerine kamera binaların
   * üstündeyse karakteri örten çatıda yarık açılır.
   */
  private kameraGuncelle(dt: number): void {
    const lx = this.x - this.orijin.x;
    const lz = this.z - this.orijin.z;
    const hedef: [number, number, number] = [lx, KAMERA_GORUS.hedefYuksek + this.y * 0.35, lz];
    this.kamHedef = hedef;
    const e = this.karolar?.engel;
    const ham = kameraKonumu(hedef, this.kam);
    let izinli = this.kam.mesafe;
    if (e && this.hazir) {
      const t = kameraEngeli(e, this.x, hedef[1], this.z, ham[0] + this.orijin.x, Math.max(0.6, ham[1]), ham[2] + this.orijin.z);
      if (t < 1) izinli = Math.max(KAMERA_GORUS.enKisa, Math.min(this.kam.mesafe, this.kam.mesafe * t - 0.7));
    }
    this.kamEtkin = Math.min(this.kamEtkin, this.kam.mesafe);
    if (izinli < this.kamEtkin) this.kamEtkin = izinli;
    else this.kamEtkin = Math.min(izinli, this.kamEtkin + KAMERA_GORUS.geriAcma * dt);
    const d = { ...this.kam, mesafe: this.kamEtkin };
    const [cx, cy, cz] = kameraKonumu(hedef, d);
    const bak = bakisNoktasi(hedef, d);
    this.kamera.position.set(cx, Math.max(0.6, cy), cz);
    this.kamera.lookAt(bak[0], bak[1], bak[2]);
    this.kamera.updateMatrixWorld();
    // Çatı kesme: kamera → karakter başı hattını bina örtüyorsa yarık aç (kamera çatıların üstündeyken)
    const kes = !!e && this.hazir && ortenVar(e, cx + this.orijin.x, cy, cz + this.orijin.z, this.x, 1.6 + this.y, this.z);
    this.kesme = kes;
    const u = this.malz.bina.uniforms;
    u["uKesP"]!.value = [kes ? 1 : 0, 4.2];
    u["uKes"]!.value = [hedef[0], hedef[2], cx, cz];
  }

  /** Karakterin ekrandaki boyu (ayak → baş): sınama ve ayar için. */
  private karakterEkran(): { oran: number; piksel: number; ayak: [number, number]; bas: [number, number] } {
    const w = this.tuval.clientWidth;
    const h = this.tuval.clientHeight;
    const lx = this.x - this.orijin.x;
    const lz = this.z - this.orijin.z;
    const nokta = (y: number): [number, number] => {
      const v = new Vector3(lx, y, lz).project(this.kamera);
      return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
    };
    const ayak = nokta(this.y);
    const bas = nokta(this.y + 1.78 * KARAKTER_OLCEK);
    const piksel = Math.hypot(ayak[0] - bas[0], ayak[1] - bas[1]);
    return { oran: piksel / h, piksel, ayak, bas };
  }

  // --- ölçüm ve sınama ---------------------------------------------------------------------------------

  private durum(): YuruDurumu {
    const ll = dunyaLl(this.cerceve, this.x, this.z);
    return {
      acik: this.acik,
      hazir: this.hazir && (this.karolar?.hazir() ?? false),
      dunya: [this.x, this.z],
      ll,
      hucre: Number.isNaN(this.hucre.x) ? "" : hucreId(this.hucre.x, this.hucre.y),
      hap: !this.ui.hap.hidden,
      kart: !this.ui.kart.hidden,
      yol: this.yol.length,
      hiz: this.hiz,
      cizim: this.cizim,
      ucgen: this.ucgen,
      karakter: this.karakterKaynak,
      orijin: [this.orijin.x, this.orijin.z],
      karo: this.karolar?.istatistik() ?? { hazir: 0, bekleyen: 0, ucgen: 0, bayt: 0, ortMs: 0, enCokMs: 0 },
      kesme: this.kesme,
      y: this.y,
      anim: this.animAd,
      karakterOrnek: this.kalabalik?.ornekSayisi ?? 0,
      etkilesim: this.etkilesim?.tur ?? null,
      arsa: {
        izgara: this.arsa?.izgara.geometry.getAttribute("position")?.count ?? 0,
        dolgu: this.arsa?.dolgu.geometry.getAttribute("position")?.count ?? 0,
        kenar: this.arsa?.kenar.geometry.getAttribute("position")?.count ?? 0,
        insaat: (this.arsa?.insaat.geometry as { instanceCount?: number } | undefined)?.instanceCount ?? 0,
      },
    };
  }

  /** `ms` boyunca sürekli çizer; fps, en çok çizim çağrısı/üçgen ve ortalama CPU süresi. */
  private async olc(ms: number): Promise<{ fps: number; kare: number; cizimEnCok: number; ucgenEnCok: number; cpuMsOrt: number }> {
    this.surekli = true;
    this.iste();
    let kare = 0;
    let cizim = 0;
    let ucgen = 0;
    let cpu = 0;
    const t0 = performance.now();
    await new Promise<void>((coz) => {
      const say = (): void => {
        kare++;
        cizim = Math.max(cizim, this.cizim);
        ucgen = Math.max(ucgen, this.ucgen);
        cpu += this.cpuMs;
        if (performance.now() - t0 < ms) requestAnimationFrame(say);
        else coz();
      };
      requestAnimationFrame(say);
    });
    this.surekli = false;
    const sure = performance.now() - t0;
    return { fps: (kare * 1000) / sure, kare, cizimEnCok: cizim, ucgenEnCok: ucgen, cpuMsOrt: cpu / Math.max(1, kare) };
  }

  /** Sınama: karakterin önünde [enAz, enCok] m uzakta, ekranda görünen ve düz yürünebilir bir yer noktası. */
  private sinamaHedef(enAz = 10, enCok = 30): { x: number; y: number; dunya: [number, number] } | null {
    const e = this.karolar?.engel;
    if (!e) return null;
    const s = this.yolSorgusu();
    const w = this.tuval.clientWidth;
    const h = this.tuval.clientHeight;
    for (let r = enAz; r <= enCok; r += 2)
      for (let a = 0; a < 24; a++) {
        const aci = this.kam.yaw + Math.PI + ((a % 2 ? 1 : -1) * Math.ceil(a / 2) * Math.PI) / 24;
        const x = this.x + Math.sin(aci) * r;
        const z = this.z + Math.cos(aci) * r;
        if (s.engelli(x, z)) continue;
        const v = new Vector3(x - this.orijin.x, 0, z - this.orijin.z).project(this.kamera);
        const sx = ((v.x + 1) / 2) * w;
        const sy = ((1 - v.y) / 2) * h;
        if (sx < 40 || sx > w - 40 || sy < 90 || sy > h - 90 || v.z > 1) continue;
        return { x: sx, y: sy, dunya: [x, z] };
      }
    return null;
  }
}

/** Yumuşak gölge diski (merkez saydamlığı `a`, kenar 0). */
function diskGeometrisi(r: number, a: number, renk: [number, number, number]): BufferGeometry {
  const n = 20;
  const konum = [0, 0, 0];
  const rk = [...renk, a];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    konum.push(Math.cos(t) * r, 0, Math.sin(t) * r);
    rk.push(...renk, 0);
  }
  const ix: number[] = [];
  for (let i = 1; i <= n; i++) ix.push(0, i, i + 1);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(Float32Array.from(konum), 3));
  g.setAttribute("aRenk", new BufferAttribute(Float32Array.from(rk), 4));
  g.setIndex(ix);
  return g;
}

/** Tıkla-git hedef halkası (durağan). */
function halkaGeometrisi(r0: number, r1: number, renk: [number, number, number]): BufferGeometry {
  const n = 28;
  const konum: number[] = [];
  const rk: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    konum.push(Math.cos(t) * r0, 0, Math.sin(t) * r0, Math.cos(t) * r1, 0, Math.sin(t) * r1);
    rk.push(...renk, 0.9, ...renk, 0.9);
  }
  const ix: number[] = [];
  for (let i = 0; i < n; i++) ix.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(Float32Array.from(konum), 3));
  g.setAttribute("aRenk", new BufferAttribute(Float32Array.from(rk), 4));
  g.setIndex(ix);
  return g;
}

let tekil: YuruSahnesi | null = null;

/** yuru.js girişi: tekil sahne (WebGL bağlamı ve karo önbelleği girişler arasında korunur). */
export function yuruSahnesi(sahneKap: HTMLElement): YuruSahnesi {
  tekil ??= new YuruSahnesi(sahneKap);
  return tekil;
}

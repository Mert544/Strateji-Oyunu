/**
 * Kamera denetleyicisi: fare/dokunmatik/klavye girdisi -> KameraDurumu -> three PerspectiveCamera.
 *  - Sürükle: harita gibi kaydır (eylemsizlikli). Sağ tuş / Ctrl+sürükle: döndür ve eğ.
 *  - Tekerlek, iki parmakla yakınlaş: uzaklık. İki parmakla bük: yönü döndür.
 *  - WASD / oklar: küre üzerinde serbest gezinme; Q/E: döndür; R/F veya +/-: yakınlaş/uzaklaş; Shift: hızlı; N: kuzey yukarı.
 *  - Çift tıklama / çift dokunma: bölgeye uçuş (geri çağrı ile bildirilir).
 */
import { PerspectiveCamera } from "three";
import { DERECE, birim, nokta, topla, olcekle } from "../kure/matematik";
import type { Vek3 } from "../kure/matematik";
import {
  DIKEY_ACI,
  donder,
  kameraBaslangic,
  kameraYerlesimi,
  mesafeKelepcele,
  pikselBasinaAci,
  sigmaMesafesi,
  ucusBaslat,
  ucusIlerlet,
  yerelBaz,
  yuzeydeGez,
} from "./durum";
import type { KameraDurumu, Ucus, UcusHedefi } from "./durum";

export interface KameraGeriCagrilari {
  /** Tek tıklama/dokunma (canvas piksel koordinatı, CSS px). */
  tikla: (x: number, y: number) => void;
  ciftTikla: (x: number, y: number) => void;
}

interface Isaretci {
  x: number;
  y: number;
  ilkX: number;
  ilkY: number;
  zaman: number;
  dugme: number;
  ctrl: boolean;
}

export class KameraKontrol {
  durum: KameraDurumu;
  /** Durum her değiştiğinde artar (etiket/LOD güncellemesi için). */
  surum = 0;
  private w = 1;
  private h = 1;
  private isaretciler = new Map<number, Isaretci>();
  private ucus: Ucus | null = null;
  private hiz = { sag: 0, yukari: 0 };
  private tus = new Set<string>();
  private sonTikZaman = 0;
  private sonTikX = 0;
  private sonTikY = 0;
  private sonIkiParmak: { mesafe: number; aci: number } | null = null;
  private sonKonum = "";

  constructor(
    private canvas: HTMLCanvasElement,
    readonly kamera: PerspectiveCamera,
    private geriCagri: KameraGeriCagrilari,
  ) {
    this.durum = kameraBaslangic(34, 41, 3);
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.asagi);
    canvas.addEventListener("pointermove", this.tasi);
    canvas.addEventListener("pointerup", this.yukari);
    canvas.addEventListener("pointercancel", this.yukari);
    canvas.addEventListener("wheel", this.tekerlek, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", this.tusAsagi);
    window.addEventListener("keyup", this.tusYukari);
    window.addEventListener("blur", () => this.tus.clear());
  }

  /** Canvas CSS boyutu değiştiğinde çağrılır. */
  boyutla(w: number, h: number): void {
    const ilk = this.w === 1 && this.h === 1;
    this.w = w;
    this.h = h;
    this.kamera.aspect = w / Math.max(1, h);
    this.kamera.fov = DIKEY_ACI;
    if (ilk) this.durum = { ...this.durum, dist: sigmaMesafesi(this.kamera.aspect) };
    else this.durum = { ...this.durum, dist: mesafeKelepcele(this.durum.dist, this.kamera.aspect) };
    this.kamera.updateProjectionMatrix();
    this.surum++;
  }

  get aspect(): number {
    return this.kamera.aspect;
  }

  /** Canvas CSS boyutu (px). */
  get boyutPx(): { w: number; h: number } {
    return { w: this.w, h: this.h };
  }

  /** Belirli bir yüzey noktasına uçuş. */
  ucusYap(hedef: UcusHedefi): void {
    this.hiz.sag = this.hiz.yukari = 0;
    this.ucus = ucusBaslat(this.durum, { ...hedef, dist: mesafeKelepcele(hedef.dist, this.kamera.aspect) });
  }

  kuzeyYukari(): void {
    this.durum = { ...this.durum, f: yerelBaz(this.durum.p).kuzey };
    this.surum++;
  }

  ucuyorMu(): boolean {
    return this.ucus !== null;
  }

  // --- olaylar ---------------------------------------------------------------------------------

  private konum(e: PointerEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  private asagi = (e: PointerEvent): void => {
    const [x, y] = this.konum(e);
    this.canvas.setPointerCapture(e.pointerId);
    this.isaretciler.set(e.pointerId, { x, y, ilkX: x, ilkY: y, zaman: performance.now(), dugme: e.button, ctrl: e.ctrlKey || e.shiftKey });
    this.ucus = null;
    this.hiz.sag = this.hiz.yukari = 0;
    if (this.isaretciler.size === 2) this.sonIkiParmak = this.ikiParmakOlcu();
    this.canvas.classList.add("surukle");
  };

  private ikiParmakOlcu(): { mesafe: number; aci: number } | null {
    const v = [...this.isaretciler.values()];
    const a = v[0], b = v[1];
    if (!a || !b) return null;
    return { mesafe: Math.hypot(b.x - a.x, b.y - a.y), aci: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  private tasi = (e: PointerEvent): void => {
    const s = this.isaretciler.get(e.pointerId);
    if (!s) return;
    const [x, y] = this.konum(e);
    const dx = x - s.x, dy = y - s.y;
    s.x = x;
    s.y = y;
    if (this.isaretciler.size >= 2) {
      const olcu = this.ikiParmakOlcu();
      const onceki = this.sonIkiParmak;
      if (olcu && onceki && onceki.mesafe > 1) {
        const oran = onceki.mesafe / Math.max(1, olcu.mesafe);
        this.durum = { ...this.durum, dist: mesafeKelepcele(this.durum.dist * oran, this.kamera.aspect) };
        let da = olcu.aci - onceki.aci;
        if (da > Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        this.durum = donder(this.durum, -da);
        // iki parmağın ortak kayması da gezdirir
        const k = pikselBasinaAci(this.durum, this.h) * 0.5;
        this.durum = yuzeydeGez(this.durum, -dx * k, dy * k);
        this.surum++;
      }
      this.sonIkiParmak = olcu;
      return;
    }
    if ((s.dugme === 2 || s.ctrl) && e.pointerType === "mouse") {
      this.durum = donder(this.durum, dx * 0.008);
      this.durum = { ...this.durum, tiltFaktor: Math.min(1, Math.max(0, this.durum.tiltFaktor + dy * 0.004)) };
      this.surum++;
      return;
    }
    const k = pikselBasinaAci(this.durum, this.h);
    const sagAci = -dx * k, yukariAci = dy * k;
    this.durum = yuzeydeGez(this.durum, sagAci, yukariAci);
    // eylemsizlik hızı (rad/kare -> ağırlıklı ortalama)
    this.hiz.sag = this.hiz.sag * 0.5 + sagAci * 0.5;
    this.hiz.yukari = this.hiz.yukari * 0.5 + yukariAci * 0.5;
    this.surum++;
  };

  private yukari = (e: PointerEvent): void => {
    const s = this.isaretciler.get(e.pointerId);
    this.isaretciler.delete(e.pointerId);
    this.canvas.classList.toggle("surukle", this.isaretciler.size > 0);
    if (this.isaretciler.size < 2) this.sonIkiParmak = null;
    if (!s || e.type === "pointercancel") return;
    const hareket = Math.hypot(s.x - s.ilkX, s.y - s.ilkY);
    const sure = performance.now() - s.zaman;
    if (hareket < 7 && sure < 450 && s.dugme === 0 && !s.ctrl) {
      this.hiz.sag = this.hiz.yukari = 0;
      const simdi = performance.now();
      const cift = simdi - this.sonTikZaman < 340 && Math.hypot(s.x - this.sonTikX, s.y - this.sonTikY) < 32;
      this.sonTikZaman = cift ? 0 : simdi;
      this.sonTikX = s.x;
      this.sonTikY = s.y;
      if (cift) this.geriCagri.ciftTikla(s.x, s.y);
      else this.geriCagri.tikla(s.x, s.y);
    }
  };

  private tekerlek = (e: WheelEvent): void => {
    e.preventDefault();
    const birimCarpan = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const d = Math.max(-300, Math.min(300, e.deltaY * birimCarpan));
    this.ucus = null;
    this.durum = { ...this.durum, dist: mesafeKelepcele(this.durum.dist * Math.exp(d * 0.0016), this.kamera.aspect) };
    this.surum++;
  };

  private tusAsagi = (e: KeyboardEvent): void => {
    const h = e.target as HTMLElement | null;
    if (h && (h.tagName === "INPUT" || h.tagName === "TEXTAREA" || h.tagName === "SELECT")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "n") {
      this.kuzeyYukari();
      return;
    }
    if (["w", "a", "s", "d", "q", "e", "r", "f", "+", "-", "=", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      this.tus.add(k);
      this.ucus = null;
      if (k.startsWith("arrow")) e.preventDefault();
    }
    if (e.shiftKey) this.tus.add("shift");
  };

  private tusYukari = (e: KeyboardEvent): void => {
    this.tus.delete(e.key.toLowerCase());
    if (!e.shiftKey) this.tus.delete("shift");
  };

  // --- çerçeve güncellemesi ------------------------------------------------------------------

  /** dt saniye. Kamera durumu değiştiyse true. */
  guncelle(dt: number): boolean {
    const onceki = this.surum;
    dt = Math.min(dt, 0.1);
    if (this.ucus) {
      const [d, bitti] = ucusIlerlet(this.ucus, dt);
      this.durum = d;
      if (bitti) this.ucus = null;
      this.surum++;
    } else if (this.isaretciler.size === 0) {
      const t = this.tus;
      if (t.size > 0) {
        const hizci = t.has("shift") ? 2.6 : 1;
        const aciHiz = pikselBasinaAci(this.durum, this.h) * 460 * hizci * dt;
        const sag = (t.has("d") || t.has("arrowright") ? 1 : 0) - (t.has("a") || t.has("arrowleft") ? 1 : 0);
        const yuk = (t.has("w") || t.has("arrowup") ? 1 : 0) - (t.has("s") || t.has("arrowdown") ? 1 : 0);
        if (sag || yuk) {
          const uz = Math.hypot(sag, yuk);
          this.durum = yuzeydeGez(this.durum, (sag / uz) * aciHiz, (yuk / uz) * aciHiz);
          this.hiz.sag = this.hiz.yukari = 0;
          this.surum++;
        }
        const don = (t.has("q") ? 1 : 0) - (t.has("e") ? 1 : 0);
        if (don) {
          this.durum = donder(this.durum, don * 1.4 * dt);
          this.surum++;
        }
        const yak = (t.has("r") || t.has("+") || t.has("=") ? 1 : 0) - (t.has("f") || t.has("-") ? 1 : 0);
        if (yak) {
          this.durum = { ...this.durum, dist: mesafeKelepcele(this.durum.dist * Math.exp(-yak * 1.6 * dt), this.kamera.aspect) };
          this.surum++;
        }
      }
      if (Math.abs(this.hiz.sag) + Math.abs(this.hiz.yukari) > 1e-6) {
        // eylemsizlik: hız kare başına değil, saniyeye normalize edilmiş sönümleme
        const sonum = Math.pow(0.0025, dt);
        this.durum = yuzeydeGez(this.durum, this.hiz.sag * dt * 60 * 0.6, this.hiz.yukari * dt * 60 * 0.6);
        this.hiz.sag *= sonum;
        this.hiz.yukari *= sonum;
        this.surum++;
      }
    }
    this.uygula();
    return this.surum !== onceki;
  }

  /** Durumu three kamerasına yazar. */
  uygula(): void {
    const y = kameraYerlesimi(this.durum);
    const anahtar = y.konum.join(",") + y.yakin.toFixed(5);
    if (anahtar === this.sonKonum) return;
    this.sonKonum = anahtar;
    const c = this.kamera;
    c.position.set(y.konum[0], y.konum[1], y.konum[2]);
    c.up.set(y.yukari[0], y.yukari[1], y.yukari[2]);
    c.lookAt(y.hedef[0], y.hedef[1], y.hedef[2]);
    c.near = y.yakin;
    c.far = y.uzak;
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
  }

  /** Ekran noktasından kamera ışını: [kamera konumu, birim yön]. */
  isin(x: number, y: number): [Vek3, Vek3] {
    const nx = (x / this.w) * 2 - 1;
    const ny = -(y / this.h) * 2 + 1;
    const c = this.kamera;
    const tanY = Math.tan((c.fov * DERECE) / 2);
    const tanX = tanY * c.aspect;
    const m = c.matrixWorld.elements;
    // kamera eksenleri: sağ = sütun0, yukarı = sütun1, geri = sütun2
    const sag: Vek3 = [m[0] as number, m[1] as number, m[2] as number];
    const yuk: Vek3 = [m[4] as number, m[5] as number, m[6] as number];
    const ileri: Vek3 = [-(m[8] as number), -(m[9] as number), -(m[10] as number)];
    const yon = birim(topla(topla(ileri, sag, nx * tanX), yuk, ny * tanY));
    return [[c.position.x, c.position.y, c.position.z], yon];
  }

  /** Yüzey noktası (birim vektör) ekranın hangi (CSS px) noktasında; arkadaysa null. */
  ekranaProje(p: Vek3, yaricap = 1): { x: number; y: number; derinlik: number } | null {
    const c = this.kamera;
    const v = olcekle(p, yaricap);
    // kamera görünüm uzayı
    const m = c.matrixWorldInverse.elements;
    const vx = (m[0] as number) * v[0] + (m[4] as number) * v[1] + (m[8] as number) * v[2] + (m[12] as number);
    const vy = (m[1] as number) * v[0] + (m[5] as number) * v[1] + (m[9] as number) * v[2] + (m[13] as number);
    const vz = (m[2] as number) * v[0] + (m[6] as number) * v[1] + (m[10] as number) * v[2] + (m[14] as number);
    if (vz >= -c.near) return null;
    const tanY = Math.tan((c.fov * DERECE) / 2);
    const ndcX = vx / -vz / (tanY * c.aspect);
    const ndcY = vy / -vz / tanY;
    return { x: (ndcX * 0.5 + 0.5) * this.w, y: (-ndcY * 0.5 + 0.5) * this.h, derinlik: -vz };
  }

  /** Kamera konumuna göre yüzey noktası görünür (öndeki yarımkürede) mi? */
  onYuzde(p: Vek3, esik = 0.05): boolean {
    const c = this.kamera.position;
    const yon: Vek3 = [c.x, c.y, c.z];
    const r = Math.hypot(yon[0], yon[1], yon[2]);
    // ufuk: cos(açı) > 1/r ; eşik payı
    return nokta(p, birim(yon)) > 1 / r + esik * 0.2;
  }
}

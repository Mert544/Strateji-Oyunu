/**
 * Yürüyüş girdisi: fare (tıkla-git, sürükleyerek kamera döndürme, tekerlekle yakınlaşma), klavye ve dokunma
 * (dokun-git, dinamik sanal çubuk: başparmağın ilk dokunduğu yerde belirir; sağ yarıda sürükleme kamerayı
 * döndürür; iki parmak yakınlaştırır).
 */
import { cubukDegeri } from "./kontrol";

export interface GirdiOlaylari {
  tikla(x: number, y: number): void;
  dondur(dx: number, dy: number): void;
  yakinlas(carpan: number): void;
  /** Çubuk değeri [ileri, sağ]; bırakılınca [0, 0]. */
  cubuk(ileri: number, sag: number): void;
}

const SURUKLE_PX = 6;
const CUBUK_R = 48;

interface Parmak {
  id: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  t0: number;
  tur: "belirsiz" | "cubuk" | "kamera";
}

export class Girdi {
  readonly tuslar = new Set<string>();
  private fare: { x: number; y: number; x0: number; y0: number; dugme: number; surukle: boolean } | null = null;
  private parmaklar = new Map<number, Parmak>();
  private kiskac: number | null = null;
  private cubukTaban: HTMLElement;
  private cubukTopuz: HTMLElement;
  private kaldir: (() => void)[] = [];

  constructor(
    private tuval: HTMLCanvasElement,
    kap: HTMLElement,
    private o: GirdiOlaylari,
  ) {
    this.cubukTaban = document.createElement("div");
    this.cubukTaban.className = "yuru-cubuk";
    this.cubukTaban.hidden = true;
    this.cubukTopuz = document.createElement("div");
    this.cubukTaban.append(this.cubukTopuz);
    kap.append(this.cubukTaban);
    const dinle = <K extends keyof HTMLElementEventMap>(h: HTMLElement, ad: K, f: (e: HTMLElementEventMap[K]) => void, sec?: AddEventListenerOptions): void => {
      h.addEventListener(ad, f as EventListener, sec);
      this.kaldir.push(() => h.removeEventListener(ad, f as EventListener, sec));
    };
    dinle(tuval, "pointerdown", (e) => this.bas(e));
    dinle(tuval, "pointermove", (e) => this.tasi(e));
    dinle(tuval, "pointerup", (e) => this.birak(e));
    dinle(tuval, "pointercancel", (e) => this.birak(e, true));
    dinle(tuval, "contextmenu", (e) => e.preventDefault());
    dinle(tuval, "wheel", (e) => {
      e.preventDefault();
      this.o.yakinlas(Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)))));
    }, { passive: false });
  }

  private yerel(e: PointerEvent): [number, number] {
    const r = this.tuval.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  private bas(e: PointerEvent): void {
    const [x, y] = this.yerel(e);
    this.tuval.setPointerCapture?.(e.pointerId);
    if (e.pointerType === "mouse") {
      this.fare = { x, y, x0: x, y0: y, dugme: e.button, surukle: false };
      return;
    }
    e.preventDefault();
    this.parmaklar.set(e.pointerId, { id: e.pointerId, x0: x, y0: y, x, y, t0: performance.now(), tur: "belirsiz" });
    if (this.parmaklar.size === 2) {
      this.cubukBirak();
      const [a, b] = [...this.parmaklar.values()];
      this.kiskac = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  }

  private tasi(e: PointerEvent): void {
    const [x, y] = this.yerel(e);
    if (e.pointerType === "mouse") {
      const f = this.fare;
      if (!f) return;
      const dx = x - f.x;
      const dy = y - f.y;
      f.x = x;
      f.y = y;
      if (!f.surukle && Math.hypot(x - f.x0, y - f.y0) > SURUKLE_PX) f.surukle = true;
      if (f.surukle) this.o.dondur(dx, dy);
      return;
    }
    const p = this.parmaklar.get(e.pointerId);
    if (!p) return;
    const dx = x - p.x;
    const dy = y - p.y;
    p.x = x;
    p.y = y;
    if (this.parmaklar.size >= 2) {
      const [a, b] = [...this.parmaklar.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (this.kiskac && d > 10) this.o.yakinlas(this.kiskac / d);
      this.kiskac = d;
      this.o.dondur(dx / 2, 0);
      return;
    }
    if (p.tur === "belirsiz" && Math.hypot(x - p.x0, y - p.y0) > SURUKLE_PX * 1.5) {
      // Ekranın sol yarısında başlayan sürükleme çubuk, sağ yarısında kamera
      p.tur = p.x0 < this.tuval.clientWidth * 0.5 ? "cubuk" : "kamera";
      if (p.tur === "cubuk") {
        this.cubukTaban.hidden = false;
        this.cubukTaban.style.transform = `translate(${p.x0 - CUBUK_R}px, ${p.y0 - CUBUK_R}px)`;
      }
    }
    if (p.tur === "kamera") this.o.dondur(dx, dy);
    else if (p.tur === "cubuk") {
      const ox = Math.max(-CUBUK_R, Math.min(CUBUK_R, x - p.x0));
      const oy = Math.max(-CUBUK_R, Math.min(CUBUK_R, y - p.y0));
      this.cubukTopuz.style.transform = `translate(${ox}px, ${oy}px)`;
      const [i, s] = cubukDegeri(x - p.x0, y - p.y0, CUBUK_R);
      this.o.cubuk(i, s);
    }
  }

  private birak(e: PointerEvent, iptal = false): void {
    const [x, y] = this.yerel(e);
    if (e.pointerType === "mouse") {
      const f = this.fare;
      this.fare = null;
      if (!iptal && f && !f.surukle && f.dugme === 0) this.o.tikla(x, y);
      return;
    }
    const p = this.parmaklar.get(e.pointerId);
    this.parmaklar.delete(e.pointerId);
    if (this.parmaklar.size < 2) this.kiskac = null;
    if (!p) return;
    if (p.tur === "cubuk") this.cubukBirak();
    else if (!iptal && p.tur === "belirsiz" && performance.now() - p.t0 < 450 && this.parmaklar.size === 0) this.o.tikla(x, y);
  }

  private cubukBirak(): void {
    this.cubukTaban.hidden = true;
    this.cubukTopuz.style.transform = "";
    for (const p of this.parmaklar.values()) if (p.tur === "cubuk") p.tur = "kamera";
    this.o.cubuk(0, 0);
  }

  /** Klavye tuşları (KeyboardEvent.code): basılı tutulanlar. */
  tusBasildi(kod: string): void {
    this.tuslar.add(kod);
  }

  tusBirakildi(kod: string): void {
    this.tuslar.delete(kod);
  }

  sifirla(): void {
    this.tuslar.clear();
    this.fare = null;
    this.parmaklar.clear();
    this.cubukBirak();
  }

  /** [ileri, sağ] tuş girdisi ve koşu. */
  tusGirdisi(): { ileri: number; sag: number; kos: boolean } {
    const t = this.tuslar;
    const ileri = (t.has("KeyW") || t.has("ArrowUp") ? 1 : 0) - (t.has("KeyS") || t.has("ArrowDown") ? 1 : 0);
    const sag = (t.has("KeyD") || t.has("ArrowRight") ? 1 : 0) - (t.has("KeyA") || t.has("ArrowLeft") ? 1 : 0);
    return { ileri, sag, kos: t.has("ShiftLeft") || t.has("ShiftRight") };
  }

  yokEt(): void {
    for (const k of this.kaldir) k();
    this.cubukTaban.remove();
  }
}

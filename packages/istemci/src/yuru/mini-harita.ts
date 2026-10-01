/**
 * Mini harita (sağ üst, 120 px, kuzey yukarıda): bina ayak izleri soluk, parseller (senin: oyuncu rengi,
 * başkası: gri), karakter oku. Yalnız karakter belirgin biçimde yer değiştirince yeniden çizilir.
 * Dokununca stratejik haritaya dönülür (docs/arastirma/arayuz-ux.md §3).
 */
import type { IlceSahipligi } from "../harita/baglanti";
import { idCoz } from "../harita/hucre";
import type { EngelDunyasi } from "./carpisma";
import { hucreDunya } from "./koordinat";
import type { Cerceve } from "./koordinat";
import { rgbCss } from "./palet";
import type { YuruPaleti } from "./palet";

const BOYUT = 120;
const ALAN_M = 520; // kenar (m)

export class MiniHarita {
  readonly tuval: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private son = { x: NaN, z: NaN, yon: NaN };

  constructor() {
    this.tuval = document.createElement("canvas");
    this.tuval.className = "yuru-mini";
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.tuval.width = Math.round(BOYUT * dpr);
    this.tuval.height = Math.round(BOYUT * dpr);
    this.tuval.setAttribute("role", "button");
    this.tuval.setAttribute("aria-label", "Mini harita: stratejik haritaya dön (M)");
    this.tuval.title = "Haritaya dön (M)";
    this.tuval.tabIndex = 0;
    this.ctx = this.tuval.getContext("2d");
    this.ctx?.scale(dpr, dpr);
  }

  gecersiz(): void {
    this.son = { x: NaN, z: NaN, yon: NaN };
  }

  ciz(c: Cerceve, x: number, z: number, yon: number, engel: EngelDunyasi, sahiplik: IlceSahipligi | null, ben: string, p: YuruPaleti, zorla = false): void {
    const g = this.ctx;
    if (!g) return;
    if (!zorla && Math.hypot(x - this.son.x, z - this.son.z) < 4 && Math.abs(yon - this.son.yon) < 0.15) return;
    this.son = { x, z, yon };
    const o = BOYUT / ALAN_M;
    const sx = (wx: number): number => BOYUT / 2 + (wx - x) * o;
    const sz = (wz: number): number => BOYUT / 2 + (wz - z) * o;
    const yari = ALAN_M / 2;
    g.clearRect(0, 0, BOYUT, BOYUT);
    g.fillStyle = rgbCss([p.sinif[3]!, p.sinif[4]!, p.sinif[5]!]); // kara
    g.fillRect(0, 0, BOYUT, BOYUT);
    // Binalar
    g.fillStyle = rgbCss([p.sinif[16 * 3 + 0]!, p.sinif[16 * 3 + 1]!, p.sinif[16 * 3 + 2]!], 1);
    g.strokeStyle = rgbCss(p.koyu ? [0.5, 0.55, 0.6] : [0.55, 0.52, 0.47], 0.55);
    g.lineWidth = 0.6;
    g.beginPath();
    engel.halkalar(x - yari - 60, z - yari - 60, x + yari + 60, z + yari + 60, (n, b, s) => {
      g.moveTo(sx(n[b * 2]!), sz(n[b * 2 + 1]!));
      for (let i = b + 1; i < s; i++) g.lineTo(sx(n[i * 2]!), sz(n[i * 2 + 1]!));
      g.closePath();
    });
    g.fill("evenodd");
    g.stroke();
    // Parseller
    if (sahiplik) {
      for (const [id, h] of sahiplik.hucreler) {
        const hc = idCoz(id);
        if (!hc) continue;
        const [hx, hz] = hucreDunya(c, hc.x, hc.y);
        if (Math.abs(hx - x) > yari + c.k || Math.abs(hz - z) > yari + c.k) continue;
        const benim = h.sahip === ben;
        g.fillStyle = rgbCss(benim ? p.ben : p.baskasi, benim ? 0.85 : 0.5);
        g.fillRect(sx(hx), sz(hz), c.k * o + 0.5, c.k * o + 0.5);
      }
    }
    // Karakter oku (yön: model +z = güney; ekranda aşağı)
    g.save();
    g.translate(BOYUT / 2, BOYUT / 2);
    g.rotate(-yon);
    g.beginPath();
    g.moveTo(0, 7);
    g.lineTo(5, -5);
    g.lineTo(0, -2);
    g.lineTo(-5, -5);
    g.closePath();
    g.fillStyle = rgbCss(p.ben);
    g.strokeStyle = p.koyu ? "#0b1016" : "#ffffff";
    g.lineWidth = 1.5;
    g.stroke();
    g.fill();
    g.restore();
    // Kuzey
    g.fillStyle = rgbCss(p.koyu ? [0.85, 0.88, 0.92] : [0.2, 0.24, 0.3]);
    g.font = "600 10px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("K", BOYUT / 2, 11);
  }
}

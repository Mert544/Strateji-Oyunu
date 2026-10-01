/**
 * Yürüyüş kipi koordinatları (saf; DOM yok).
 *
 * Üç çerçeve vardır:
 *   1) Coğrafi: boylam/enlem (derece).
 *   2) **Dünya metresi** (oturum çerçevesi, float64): Web Mercator z20 hücre birimleri `(X, Y)`, oturum girişindeki
 *      hücreye `(X0, Y0)` göre ve oturum enleminin ölçeğiyle `k` (metre/hücre) metreye çevrilir:
 *      `x = (X − X0)·k` (doğu), `z = (Y − Y0)·k` (güney). Mercator açı koruyan olduğundan birkaç km'lik alanda
 *      biçim doğrudur; z20 hücreleri bu çerçevede tam karedir (ızgara çizimi ve çarpışma kolaylaşır).
 *      Kontrolcü, çarpışma ve yol bulma bu çerçevede (JS sayısı, float64) çalışır.
 *   3) **Yerel çizim çerçevesi** (float32, GPU): dünya metresi − kayan orijin. Orijin karakter uzaklaşınca karo
 *      kenarına oturtulmuş yeni bir noktaya kayar; böylece GPU'ya giden sayılar küçük kalır (float32 hassasiyeti).
 *
 * three.js ekseni: x = doğu, y = yukarı, z = güney (sağ elli).
 */
import { boylamdanX, enlemdenY, xtenBoylam, ytenEnlem } from "../harita/hucre";

/** Ekvator çevresi (m), Web Mercator küresi. */
export const DUNYA_CEVRESI = 40_075_016.685_578_49;
export const HUCRE_Z = 20;
export const KARO_Z = 15;
/** Bir z15 karosunun kenarındaki z20 hücre sayısı. */
export const KARO_HUCRE = 2 ** (HUCRE_Z - KARO_Z);

export interface Cerceve {
  /** Oturum orijini (z20 hücre birimi; tamsayı). */
  X0: number;
  Y0: number;
  /** Metre / hücre (oturum enleminde). */
  k: number;
}

/** Giriş noktasının hücresine oturtulmuş oturum çerçevesi. */
export function cerceveKur(boylam: number, enlem: number): Cerceve {
  const X0 = Math.floor(boylamdanX(boylam));
  const Y0 = Math.floor(enlemdenY(enlem));
  const k = (DUNYA_CEVRESI / 2 ** HUCRE_Z) * Math.cos((enlem * Math.PI) / 180);
  return { X0, Y0, k };
}

/** Boylam/enlem → dünya metresi [x, z]. */
export function llDunya(c: Cerceve, boylam: number, enlem: number): [number, number] {
  return [(boylamdanX(boylam) - c.X0) * c.k, (enlemdenY(enlem) - c.Y0) * c.k];
}

/** Dünya metresi → [boylam, enlem]. */
export function dunyaLl(c: Cerceve, x: number, z: number): [number, number] {
  return [xtenBoylam(c.X0 + x / c.k), ytenEnlem(c.Y0 + z / c.k)];
}

/** z20 hücresinin kuzeybatı köşesi (dünya metresi). */
export function hucreDunya(c: Cerceve, hx: number, hy: number): [number, number] {
  return [(hx - c.X0) * c.k, (hy - c.Y0) * c.k];
}

/** Noktayı içeren z20 hücresi. */
export function dunyaHucre(c: Cerceve, x: number, z: number): { x: number; y: number } {
  return { x: Math.floor(c.X0 + x / c.k), y: Math.floor(c.Y0 + z / c.k) };
}

/** z15 karosunun kenarı (m). */
export function karoKenari(c: Cerceve): number {
  return KARO_HUCRE * c.k;
}

/** z15 karosunun kuzeybatı köşesi (dünya metresi). */
export function karoKokeni(c: Cerceve, kx: number, ky: number): [number, number] {
  return [(kx * KARO_HUCRE - c.X0) * c.k, (ky * KARO_HUCRE - c.Y0) * c.k];
}

/** Noktayı içeren z15 karosu. */
export function dunyaKaro(c: Cerceve, x: number, z: number): { x: number; y: number } {
  return { x: Math.floor((c.X0 + x / c.k) / KARO_HUCRE), y: Math.floor((c.Y0 + z / c.k) / KARO_HUCRE) };
}

/** Karo penceresi: merkez karonun çevresindeki (2r+1)² karo, merkezden uzaklığa göre sıralı (yakın önce). */
export function karoPenceresi(merkez: { x: number; y: number }, r = 1): { x: number; y: number }[] {
  const l: { x: number; y: number; d: number }[] = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) l.push({ x: merkez.x + dx, y: merkez.y + dy, d: dx * dx + dy * dy });
  l.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  return l.map(({ x, y }) => ({ x, y }));
}

// --- Kayan orijin -----------------------------------------------------------------------------------------

export interface Orijin {
  x: number;
  z: number;
}

/** Nokta orijinden `esik` metreden (Chebyshev) uzaksa yeni orijin gerekir. */
export function orijinGerekli(o: Orijin, x: number, z: number, esik: number): boolean {
  return Math.abs(x - o.x) > esik || Math.abs(z - o.z) > esik;
}

/**
 * Yeni orijin: noktaya en yakın `adim` katı (ör. karo kenarı). Orijin her zaman aynı kafese oturduğundan
 * kaydırma deterministiktir ve karo ağlarının yerel konumları da kafes katları olur.
 */
export function orijinKaydir(x: number, z: number, adim: number): Orijin {
  return { x: Math.round(x / adim) * adim, z: Math.round(z / adim) * adim };
}

/** Dünya metresi → yerel çizim çerçevesi (GPU'ya giden değer). */
export function yerel(o: Orijin, x: number, z: number): [number, number] {
  return [x - o.x, z - o.z];
}

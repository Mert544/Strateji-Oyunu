/**
 * Kinematik kontrolcü ve takip kamerası matematiği (saf).
 *
 * Kamera karakterin çevresinde küresel ofsetle durur: `yaw` (y ekseni etrafında), `egim` (yerden yukarı açı),
 * `mesafe`. yaw = 0 iken kamera karakterin güneyinde (+z) durur ve kuzeye bakar.
 */

export interface KameraDurumu {
  yaw: number;
  egim: number;
  mesafe: number;
}

export const KAMERA_SINIR = { egimMin: 0.12, egimMax: 1.4, mesafeMin: 3.5, mesafeMax: 70 } as const;
/** Oyunsu varsayılan: yüksekçe ve yakın-orta mesafe (çatılar ve sokak birlikte okunur; Capital Rift benzeri). */
export const VARSAYILAN_KAMERA: KameraDurumu = { yaw: 0.35, egim: 1.05, mesafe: 44 };

/**
 * Hızlar (m/s), oyunsu ve tepkisel (ivmelenme yok): WASD ve tıkla-git varsayılanı koşu, Shift depar; çubuğu az
 * itmek yürütür. Tıkla-git uzun yolda kendiliğinden depar atar. Dönüş hızı rad/s.
 */
export const HIZ = { yuru: 1.6, kos: 3.8, depar: 6.8, kendiDeparEsigi: 60, donus: 16 } as const;

/** Basit kinematik zıplama: kalkış hızı (m/s) ve yerçekimi (m/s²) → ~0,85 m tepe, ~0,65 s havada. */
export const ZIPLA = { hiz: 5.2, yercekimi: 16 } as const;

/** Hıza göre animasyon ve oynatma oranı (animasyonun doğal hızına göre; ayak kayması sınırlı). */
export function animasyonSec(hiz: number, havada: boolean): string {
  if (havada) return "zipla";
  if (hiz < 0.05) return "dur";
  if (hiz < 2.4) return "yuru";
  if (hiz < 5.2) return "kos";
  return "depar";
}

/** Zıplama adımı: [yükseklik, düşey hız]; yere inince [0, 0]. */
export function ziplaAdimi(y: number, vy: number, dt: number): [number, number] {
  const v = vy - ZIPLA.yercekimi * dt;
  const yeni = y + (vy + v) * 0.5 * dt;
  return yeni <= 0 ? [0, 0] : [yeni, v];
}
/** Karakter dairesinin yarıçapı (m). */
export const KARAKTER_R = 0.35;

export function kameraSinirla(d: KameraDurumu): KameraDurumu {
  return {
    yaw: d.yaw,
    egim: Math.min(KAMERA_SINIR.egimMax, Math.max(KAMERA_SINIR.egimMin, d.egim)),
    mesafe: Math.min(KAMERA_SINIR.mesafeMax, Math.max(KAMERA_SINIR.mesafeMin, d.mesafe)),
  };
}

/** Kamera konumu: hedef + küresel ofset. */
export function kameraKonumu(hedef: readonly [number, number, number], d: KameraDurumu): [number, number, number] {
  const c = Math.cos(d.egim) * d.mesafe;
  return [hedef[0] + Math.sin(d.yaw) * c, hedef[1] + Math.sin(d.egim) * d.mesafe, hedef[2] + Math.cos(d.yaw) * c];
}

/** Kameraya göre yatay ileri ve sağ birim vektörler [x, z]. */
export function ileriSag(yaw: number): { ileri: [number, number]; sag: [number, number] } {
  return { ileri: [-Math.sin(yaw), -Math.cos(yaw)], sag: [Math.cos(yaw), -Math.sin(yaw)] };
}

/** Tuş/çubuk girdisi (ileri ve sağ bileşenleri, [-1, 1]) → dünya yönü [x, z]; büyüklük ≤ 1. */
export function hareketYonu(ileriG: number, sagG: number, yaw: number): [number, number] {
  if (!ileriG && !sagG) return [0, 0];
  const { ileri, sag } = ileriSag(yaw);
  let x = ileri[0] * ileriG + sag[0] * sagG;
  let z = ileri[1] * ileriG + sag[1] * sagG;
  const L = Math.hypot(x, z);
  if (L > 1) {
    x /= L;
    z /= L;
  }
  return [x, z];
}

/** Karakterin bakış açısı (rotation.y): yön [x, z] için atan2(x, z) (model +z'ye bakar). */
export function yonAcisi(x: number, z: number): number {
  return Math.atan2(x, z);
}

/** a açısını b'ye en kısa yoldan en çok `adim` radyan yaklaştırır. */
export function aciYaklas(a: number, b: number, adim: number): number {
  let d = (((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  if (d > adim) d = adim;
  else if (d < -adim) d = -adim;
  return a + d;
}

/** Sanal çubuk: başlangıç ve şimdiki dokunma (piksel) → [ileri, sağ] ∈ [-1, 1], ölü bölge ve yarıçapla. */
export function cubukDegeri(dx: number, dy: number, yaricap: number, olu = 0.12): [number, number] {
  let x = dx / yaricap;
  let y = -dy / yaricap;
  const L = Math.hypot(x, y);
  if (L < olu) return [0, 0];
  if (L > 1) {
    x /= L;
    y /= L;
  }
  return [y, x];
}

/** Ekran noktasından (NDC) yer düzlemine (y = 0) ışın kesişimi; ışın kamera konumu ve yönüyle verilir. */
export function yerKesisimi(o: readonly [number, number, number], yon: readonly [number, number, number]): [number, number] | null {
  if (yon[1] >= -1e-6) return null;
  const t = -o[1] / yon[1];
  if (t > 5000) return null;
  return [o[0] + yon[0] * t, o[2] + yon[2] * t];
}

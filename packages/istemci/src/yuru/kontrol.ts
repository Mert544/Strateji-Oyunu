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

export const KAMERA_SINIR = { egimMin: 0.1, egimMax: 1.35, mesafeMin: 6, mesafeMax: 40 } as const;
/**
 * Oyunsu üçüncü şahıs takip kamerası: karakterin arkasında ve hafif üstünde. 14 m, ~35° eğim, 60° dikey görüş:
 * karakter ekran yüksekliğinin ~%11'i, sokak ve ufuktaki binalar kadrajda. Tekerlek 6–40 m arası.
 */
export const VARSAYILAN_KAMERA: KameraDurumu = { yaw: 0, egim: 0.62, mesafe: 14 };
/** Perspektif ayarı (derece ve m) ve kameranın baktığı noktanın ayarı. */
export const KAMERA_GORUS = {
  dikeyAci: 60,
  yakin: 0.3,
  uzak: 820,
  /** Kameranın baktığı nokta: karakterin göğsü (m). */
  hedefYuksek: 1.3,
  /** Bakış noktası ileri (kamera yönünde) kaydırılır: karakter kadrajın alt üçte birinde, ufuk üstte kalır. mesafe × oran × cos(eğim). */
  oneBakis: 0.55,
  /** Kamera yaw'ının karakterin bakış yönünü izleme hızı (rad/s): hızlı, ama yumuşatma yok (tıkla-git yolunda). */
  takipHizi: 7,
  /** Elle döndürmeden sonra otomatik izleme bekleme süresi (s). */
  elBekleme: 1.1,
  /** Bina duvarına çarpan kamerayı geri açma hızı (m/s); öne çekme anlıktır. */
  geriAcma: 28,
  /** Karakterin gövdesine yaklaşabileceği en kısa mesafe (m). */
  enKisa: 2.4,
} as const;

/**
 * Hızlar (m/s), oyunsu ve tepkisel (ivmelenme yok): yürüme ~4, koşu ~7, depar ~10. WASD ve tıkla-git varsayılanı koşu,
 * Shift depar; sanal çubuğu az itmek yürütür. Tıkla-git uzun yolda kendiliğinden depar atar. Dönüşler anındadır
 * (`donus`, rad/s: yarım turu ~0,08 sn'de döner).
 */
export const HIZ = { yuru: 4, kos: 7, depar: 10, kendiDeparEsigi: 60, donus: 40 } as const;

/** Kısa zıplama: kalkış hızı (m/s) ve yerçekimi (m/s²) → ~0,44 m tepe, ~0,37 s havada. */
export const ZIPLA = { hiz: 4.8, yercekimi: 26 } as const;

/** Hıza göre animasyon (eşikler, hız basamaklarının ortasında). */
export function animasyonSec(hiz: number, havada: boolean): string {
  if (havada) return "zipla";
  if (hiz < 0.05) return "dur";
  if (hiz < (HIZ.yuru + HIZ.kos) / 2) return "yuru";
  if (hiz < (HIZ.kos + HIZ.depar) / 2) return "kos";
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

/** Kamera yaw'ı ↔ karakter bakış açısı: kameranın "ileri" yönü karakterin bakış yönüne (`yon`, rad) eşit olur (yaw = yon + π, tersi de aynı). */
export function arkaYaw(yon: number): number {
  return yon + Math.PI;
}

/**
 * Kamerayı karakterin arkasına yaklaştırır (hızlı, yumuşatmasız sabit açısal hızla). `hareket` yoksa ya da elle
 * döndürme yeniyse yaw değişmez.
 */
export function yawTakip(yaw: number, yon: number, dt: number, hareket: boolean, elBeklemede: boolean): number {
  if (!hareket || elBeklemede) return yaw;
  return aciYaklas(yaw, arkaYaw(yon), KAMERA_GORUS.takipHizi * dt);
}

/** Kameranın baktığı nokta: hedef (göğüs) + yatay ileri × mesafe × oran × cos(eğim). */
export function bakisNoktasi(hedef: readonly [number, number, number], d: KameraDurumu): [number, number, number] {
  const o = d.mesafe * KAMERA_GORUS.oneBakis * Math.cos(d.egim);
  return [hedef[0] - Math.sin(d.yaw) * o, hedef[1] - 0.25, hedef[2] - Math.cos(d.yaw) * o];
}

/** Dikey görüşle ekran yüksekliğinin kaç katı: `boy` m uzunluk, `uzaklik` m uzaklıkta. */
export function ekranOrani(boy: number, uzaklik: number, dikeyAci = KAMERA_GORUS.dikeyAci): number {
  return boy / (2 * uzaklik * Math.tan((dikeyAci * Math.PI) / 360));
}

/**
 * z20 Web Mercator hücre ızgarası: hücre kimliği, sınırlar ve boyut hesapları.
 *
 * Parsel atomu (plan F2, karar 1): z20 karo = 1 hücre (~29 m @ 40,9°K). Hücre (x, y) slippy-map
 * karo adresidir (x doğuya, y güneye artar). Kanonik kimlik: 40 bitlik quadkey tamsayısı
 * (Morton/Z-sırası, y biti üstte). Bu kimliğin üst 10 biti atılınca z15 ebeveyn karo kimliği
 * kalır (`>> 10` yerine `/ 1024` — 32 bit taşmasını önlemek için aritmetik).
 */

/** Hücre yakınlaştırma düzeyi. */
export const HUCRE_Z = 20;
/** z15 karonun bir kenarındaki z20 hücre sayısı (2^5). */
export const KARO_HUCRE = 32;
/** WGS84 ekvator çevresi (m) — Web Mercator ölçeği. */
export const EKVATOR_CEVRESI = 40_075_016.685_578_49;

export interface Hucre {
  x: number;
  y: number;
}

/** [batı, güney, doğu, kuzey] derece. */
export type Sinir = [number, number, number, number];

/** Boylam -> z düzeyinde kesirli karo x. */
export function boylamdanX(boylam: number, z: number = HUCRE_Z): number {
  return ((boylam + 180) / 360) * 2 ** z;
}

/** Enlem -> z düzeyinde kesirli karo y (Web Mercator). */
export function enlemdenY(enlem: number, z: number = HUCRE_Z): number {
  const r = (enlem * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}

export function xtenBoylam(x: number, z: number = HUCRE_Z): number {
  return (x / 2 ** z) * 360 - 180;
}

export function ytenEnlem(y: number, z: number = HUCRE_Z): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/** Noktayı içeren z20 hücresi. */
export function noktadanHucre(boylam: number, enlem: number): Hucre {
  return { x: Math.floor(boylamdanX(boylam)), y: Math.floor(enlemdenY(enlem)) };
}

/** Hücrenin coğrafi sınırı. */
export function hucreSiniri(x: number, y: number, z: number = HUCRE_Z): Sinir {
  return [xtenBoylam(x, z), ytenEnlem(y + 1, z), xtenBoylam(x + 1, z), ytenEnlem(y, z)];
}

/** Hücre merkezi [boylam, enlem]. */
export function hucreMerkezi(x: number, y: number): [number, number] {
  return [xtenBoylam(x + 0.5), ytenEnlem(y + 0.5)];
}

/**
 * Hücre kenarının yerdeki uzunluğu (m), hücre merkezi enleminde. Web Mercator karesel olduğundan
 * doğu-batı ve kuzey-güney kenarları (hücre içinde) eşittir; enlemle cos(φ) oranında küçülür.
 */
export function hucreKenariMetre(y: number, z: number = HUCRE_Z): number {
  const enlem = ytenEnlem(y + 0.5, z);
  return (EKVATOR_CEVRESI / 2 ** z) * Math.cos((enlem * Math.PI) / 180);
}

/** Quadkey dizgesi (Bing): her basamak = (y biti << 1) | x biti, kökten yaprağa. */
export function quadkey(x: number, y: number, z: number = HUCRE_Z): string {
  let s = "";
  for (let i = z; i > 0; i--) {
    const m = 1 << (i - 1);
    s += String((x & m ? 1 : 0) + (y & m ? 2 : 0));
  }
  return s;
}

export function quadkeyCoz(q: string): Hucre & { z: number } {
  let x = 0;
  let y = 0;
  for (const c of q) {
    const d = c.charCodeAt(0) - 48;
    if (d < 0 || d > 3) throw new Error(`Gecersiz quadkey: ${q}`);
    x = x * 2 + (d & 1);
    y = y * 2 + (d >> 1);
  }
  return { x, y, z: q.length };
}

/**
 * 40 bitlik hücre kimliği (quadkey'in tamsayı biçimi). 2^53'ün altında: JS number ile güvenli.
 * Sıralama Z-eğrisidir; aynı z15 karodaki 1024 hücre ardışık bir aralıktadır.
 */
export function hucreKimligi(x: number, y: number): number {
  let k = 0;
  for (let i = HUCRE_Z - 1; i >= 0; i--) {
    k = k * 4 + (((y >>> i) & 1) << 1) + ((x >>> i) & 1);
  }
  return k;
}

export function kimliktenHucre(k: number): Hucre {
  if (!Number.isInteger(k) || k < 0 || k >= 2 ** (2 * HUCRE_Z)) throw new Error(`Gecersiz hucre kimligi: ${k}`);
  let x = 0;
  let y = 0;
  let kalan = k;
  for (let i = 0; i < HUCRE_Z; i++) {
    const d = kalan % 4;
    kalan = Math.floor(kalan / 4);
    x |= (d & 1) << i;
    y |= (d >> 1) << i;
  }
  return { x, y };
}

/** Hücrenin z15 ebeveyn karosu. */
export function z15Ebeveyn(x: number, y: number): Hucre {
  return { x: x >>> 5, y: y >>> 5 };
}

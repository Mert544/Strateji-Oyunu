/**
 * Küre matematiği (saf): enlem/boylam <-> birim küre koordinatı, büyük daire yayları, küçük vektör işlemleri.
 * Eksenler: y yukarı (kuzey), +z = (boylam 0, enlem 0), +x = (boylam 90D, enlem 0).
 */
export type Vek3 = [number, number, number];

export const DERECE = Math.PI / 180;

export function llVek(boylamDer: number, enlemDer: number, yaricap = 1): Vek3 {
  const b = boylamDer * DERECE;
  const e = enlemDer * DERECE;
  const ce = Math.cos(e);
  return [yaricap * ce * Math.sin(b), yaricap * Math.sin(e), yaricap * ce * Math.cos(b)];
}

/** Vektör -> [boylam, enlem] (derece). */
export function vekLl(v: Vek3): [number, number] {
  const r = Math.hypot(v[0], v[1], v[2]) || 1;
  return [Math.atan2(v[0], v[2]) / DERECE, Math.asin(Math.max(-1, Math.min(1, v[1] / r))) / DERECE];
}

export function nokta(a: Vek3, b: Vek3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function carpim(a: Vek3, b: Vek3): Vek3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function uzunluk(a: Vek3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function birim(a: Vek3): Vek3 {
  const u = uzunluk(a) || 1;
  return [a[0] / u, a[1] / u, a[2] / u];
}

export function topla(a: Vek3, b: Vek3, k = 1): Vek3 {
  return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
}

export function olcekle(a: Vek3, k: number): Vek3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/** İki birim vektör arasındaki açı (radyan). */
export function aci(a: Vek3, b: Vek3): number {
  return Math.atan2(uzunluk(carpim(a, b)), nokta(a, b));
}

/** Küresel doğrusal ara değer (birim vektörler). */
export function slerp(a: Vek3, b: Vek3, t: number): Vek3 {
  const w = aci(a, b);
  if (w < 1e-6) return birim(topla(olcekle(a, 1 - t), b, t));
  const sw = Math.sin(w);
  return birim(topla(olcekle(a, Math.sin((1 - t) * w) / sw), b, Math.sin(t * w) / sw));
}

/** Yay yüksekliği (kürenin yarıçapına oranla): kısa yollar alçak, uzun yollar yüksek. */
export function yayYuksekligi(aciRad: number): number {
  return 0.004 + 0.16 * Math.min(aciRad, 1.6);
}

/** Yay boyunca t (0-1) konumundaki yarıçap: 1 + yükseklik * sin(pi t). */
export function yayYaricapi(yukseklik: number, t: number): number {
  return 1 + yukseklik * Math.sin(Math.PI * t);
}

/**
 * İki nokta arasında büyük daire yayı: n+1 nokta (düz [x,y,z,...] dizisi), yarıçap yayYaricapi ile yükselir.
 * Uç noktalarda yarıçap 1'dir (yüzeyde).
 */
export function buyukDaireYayi(a: Vek3, b: Vek3, n: number, yukseklik?: number): number[] {
  const h = yukseklik ?? yayYuksekligi(aci(a, b));
  const c: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = slerp(a, b, t);
    const r = yayYaricapi(h, t);
    c.push(p[0] * r, p[1] * r, p[2] * r);
  }
  return c;
}

/** Yayı kaç parçaya böleceğimiz (açıya göre, 6-28 arası). */
export function yayParcaSayisi(aciRad: number): number {
  return Math.max(6, Math.min(28, Math.ceil(aciRad / 0.035)));
}

/** Küre üzerindeki iki nokta arası açısal mesafe (derece, boylam/enlem girdisi). */
export function acisalMesafeDer(b1: number, e1: number, b2: number, e2: number): number {
  return aci(llVek(b1, e1), llVek(b2, e2)) / DERECE;
}

/**
 * Kamera ışını ile birim küre (yarıçap r) kesişimi; ilk kesişim noktası veya null.
 * origin: kamera konumu; yon: birim ışın yönü.
 */
export function isinKureKesisimi(origin: Vek3, yon: Vek3, r = 1): Vek3 | null {
  const b = nokta(origin, yon);
  const c = nokta(origin, origin) - r * r;
  const d = b * b - c;
  if (d < 0) return null;
  const t = -b - Math.sqrt(d);
  if (t < 0) return null;
  return topla(origin, yon, t);
}

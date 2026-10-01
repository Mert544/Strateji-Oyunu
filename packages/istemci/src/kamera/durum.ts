/**
 * Kamera durumu ve matematiği (saf, three'ye bağımsız).
 *
 * Kamera "harita gibi küre üstünde gezer": bakılan yüzey noktası p (birim vektör), ekranda yukarıyı gösteren
 * yüzey yönü f (p'ye dik birim vektör), hedefe uzaklık dist ve eğim (tilt). Enlem/boylam/kuzey ayrımı yoktur;
 * kutuplarda takılma olmaz.
 */
import { DERECE, aci, birim, carpim, llVek, nokta, olcekle, slerp, topla } from "../kure/matematik";
import type { Vek3 } from "../kure/matematik";

export interface KameraDurumu {
  /** Bakılan yüzey noktası (birim vektör). */
  p: Vek3;
  /** Ekranda yukarıyı gösteren yüzey yönü (p'ye dik, birim). */
  f: Vek3;
  /** Kameranın hedef noktaya uzaklığı (yarıçap = 1 birim). */
  dist: number;
  /** Kullanıcı eğim katsayısı 0-1 (otomatik azami eğimin oranı). */
  tiltFaktor: number;
}

export const DIKEY_ACI = 38; // derece
export const EN_YAKIN = 0.035;

/** p'nin yerel doğu ve kuzey vektörleri. */
export function yerelBaz(p: Vek3): { dogu: Vek3; kuzey: Vek3 } {
  let dogu = carpim([0, 1, 0], p);
  if (Math.hypot(dogu[0], dogu[1], dogu[2]) < 1e-6) dogu = [1, 0, 0];
  dogu = birim(dogu);
  const kuzey = birim(carpim(p, dogu));
  return { dogu, kuzey };
}

/** f'yi p'ye dik düzleme izdüşürüp birimler. */
export function yukariDuzelt(p: Vek3, f: Vek3): Vek3 {
  const d = nokta(f, p);
  const g = birim([f[0] - d * p[0], f[1] - d * p[1], f[2] - d * p[2]]);
  if (Math.hypot(g[0], g[1], g[2]) < 0.5) return yerelBaz(p).kuzey;
  return g;
}

/** Ekranın sağını gösteren yüzey yönü. */
export function sagVektoru(d: KameraDurumu): Vek3 {
  return carpim(d.f, d.p);
}

/** Başlangıç durumu: boylam/enlem (derece) üzerinde, kuzey yukarı. */
export function kameraBaslangic(boylam: number, enlem: number, dist: number): KameraDurumu {
  const p = llVek(boylam, enlem);
  return { p, f: yerelBaz(p).kuzey, dist, tiltFaktor: 0.55 };
}

/** Yakınlığa göre azami eğim (radyan): uzaktayken 0 (küre görünümü), yaklaştıkça artar. */
export function azamiEgim(dist: number): number {
  return Math.min(1, Math.max(0, (1.25 - dist) / 1.0)) * 1.15;
}

export function egimAcisi(d: KameraDurumu): number {
  return azamiEgim(d.dist) * d.tiltFaktor;
}

/** Tüm küre ekrana sığacak kamera uzaklığı (hedef yüzeyde; yarıçap 1). aspect = genişlik/yükseklik. */
export function sigmaMesafesi(aspect: number, dikeyAciDer = DIKEY_ACI): number {
  const yarimDikey = (dikeyAciDer * DERECE) / 2;
  const yarim = Math.atan(Math.tan(yarimDikey) * Math.min(1, aspect));
  return 1 / Math.sin(0.92 * yarim) - 1;
}

export function enUzakMesafe(aspect: number): number {
  return sigmaMesafesi(aspect) * 1.12;
}

export function mesafeKelepcele(dist: number, aspect: number): number {
  return Math.min(enUzakMesafe(aspect), Math.max(EN_YAKIN, dist));
}

export interface KameraYerlesimi {
  konum: Vek3;
  hedef: Vek3;
  yukari: Vek3;
  yakin: number;
  uzak: number;
}

export function kameraYerlesimi(d: KameraDurumu): KameraYerlesimi {
  const t = egimAcisi(d);
  const ct = Math.cos(t), st = Math.sin(t);
  const kameraYonu = topla(olcekle(d.p, ct), d.f, -st);
  const konum = topla(d.p, kameraYonu, d.dist);
  const yukari = topla(olcekle(d.f, ct), d.p, st);
  const r = Math.hypot(konum[0], konum[1], konum[2]);
  const yakin = Math.max(0.0008, d.dist * 0.04);
  const uzak = r + 1.2;
  return { konum, hedef: d.p, yukari, yakin, uzak };
}

/** Kamera konumunun (dünya) yüzeyden yüksekliği ~ yarıçap - 1. */
export function kameraYuksekligi(d: KameraDurumu): number {
  const y = kameraYerlesimi(d).konum;
  return Math.hypot(y[0], y[1], y[2]) - 1;
}

/**
 * Yüzey üzerinde ötele: (sagAci, yukariAci) radyan, ekran eksenlerinde ("harita" kayması: içerik sağa
 * sürüklenirse merkez sola kayar, bu yüzden çağıran işareti ayarlar). p ve f birlikte taşınır.
 */
export function yuzeydeGez(d: KameraDurumu, sagAci: number, yukariAci: number): KameraDurumu {
  const v = topla(olcekle(sagVektoru(d), sagAci), d.f, yukariAci);
  const a = Math.hypot(v[0], v[1], v[2]);
  if (a < 1e-9) return d;
  const dir = olcekle(v, 1 / a);
  const p = birim(topla(olcekle(d.p, Math.cos(a)), dir, Math.sin(a)));
  const f = yukariDuzelt(p, d.f);
  return { ...d, p, f };
}

/** Bakış ekseni (p) etrafında yukarı yönünü döndür (radyan, + = saat yönünün tersi ekranda). */
export function donder(d: KameraDurumu, aciRad: number): KameraDurumu {
  const c = Math.cos(aciRad), s = Math.sin(aciRad);
  const sag = sagVektoru(d);
  const f = birim(topla(olcekle(d.f, c), sag, -s));
  return { ...d, f: yukariDuzelt(d.p, f) };
}

/** Piksel başına açı (radyan): "harita tutma" yaklaşımı; yüzeye olan uzaklık / yükseklik. */
export function pikselBasinaAci(d: KameraDurumu, yukseklikPx: number): number {
  const yuzeyeUzaklik = Math.max(0.02, d.dist * Math.cos(egimAcisi(d)));
  return (2 * Math.tan((DIKEY_ACI * DERECE) / 2) * yuzeyeUzaklik) / Math.max(1, yukseklikPx);
}

export interface UcusHedefi {
  p: Vek3;
  dist: number;
  /** Verilirse hedef yukarı yönü; yoksa mevcut yön taşınır. */
  f?: Vek3;
}

export interface Ucus {
  bas: KameraDurumu;
  hedef: UcusHedefi;
  sure: number;
  gecen: number;
  /** Uçuş sırasında ara olarak ne kadar uzaklaşılacağı (dist ekle). */
  kabarma: number;
}

export function ucusBaslat(bas: KameraDurumu, hedef: UcusHedefi): Ucus {
  const ang = aci(bas.p, hedef.p);
  return {
    bas,
    hedef,
    sure: Math.min(2.6, Math.max(0.9, 0.8 + ang * 1.3)),
    gecen: 0,
    kabarma: Math.min(1.4, ang * 0.9),
  };
}

function yumusat(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Uçuşu dt kadar ilerletir; [yeniDurum, bitti]. */
export function ucusIlerlet(u: Ucus, dt: number): [KameraDurumu, boolean] {
  u.gecen += dt;
  const t = Math.min(1, u.gecen / u.sure);
  const e = yumusat(t);
  const p = slerp(u.bas.p, u.hedef.p, e);
  const hedefF = u.hedef.f ? yukariDuzelt(p, u.hedef.f) : null;
  const tasinan = yukariDuzelt(p, u.bas.f);
  const f = hedefF ? yukariDuzelt(p, topla(olcekle(tasinan, 1 - e), hedefF, e)) : tasinan;
  // mesafe: log uzayında ara değer + orta noktada kabarma (yüksekten bakış)
  const ld = Math.log(u.bas.dist) * (1 - e) + Math.log(u.hedef.dist) * e;
  const dist = Math.exp(ld) + Math.sin(Math.PI * e) * u.kabarma * 0.6;
  return [{ p, f, dist, tiltFaktor: u.bas.tiltFaktor }, t >= 1];
}

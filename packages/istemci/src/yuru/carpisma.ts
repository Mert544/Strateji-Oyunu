/**
 * 2B çarpışma (saf): karakter dairesi ile bina ayak izi kenarları; duvar boyunca kayma.
 *
 * Fizik motoru yok (docs/arastirma/sokak-seviyesi-3d.md §3): hareket küçük alt adımlara bölünür, her adımdan sonra
 * daire yakındaki kenarlardan dışarı itilir. İtme yalnız kenar normali yönünde olduğundan hareketin duvara paralel
 * bileşeni korunur: kayma kendiliğinden çıkar. Kenarlar karo başına uzamsal karmada (kova) tutulur; karo
 * pencereden çıkınca tek seferde silinir. Koordinatlar dünya metresidir (float64; koordinat.ts).
 */
import type { AyakIzleri } from "./karo-geometri";

const KOVA = 12; // m

interface KaroEngeli {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** ax, az, bx, bz, üst kot (kenar başına 5 sayı). */
  kenar: Float64Array;
  /** Halka noktaları (dünya metresi) ve başları; çift-tek içeride testi için. */
  nokta: Float64Array;
  halkaBas: Uint32Array;
  halkaBina: Uint32Array;
  halkaUst: Float32Array;
  kova: Map<number, number[]>;
  kovaX0: number;
  kovaZ0: number;
}

const kovaAnahtar = (i: number, j: number): number => i * 65536 + j;

/** Karonun ayak izlerini dünya metresine taşıyıp kenar kovalarına yerleştirir. Sınır kırpma kenarları atlanır. */
export function karoEngeli(iz: AyakIzleri, kokX: number, kokZ: number, kenarM: number): KaroEngeli {
  const nokta = new Float64Array(iz.nokta.length);
  for (let i = 0; i < iz.nokta.length; i += 2) {
    nokta[i] = iz.nokta[i]! + kokX;
    nokta[i + 1] = iz.nokta[i + 1]! + kokZ;
  }
  const kenarlar: number[] = [];
  const eps = 1e-3;
  const sinirda = (v: number): boolean => Math.abs(v) < eps || Math.abs(v - kenarM) < eps;
  const halkaSayisi = iz.halkaBas.length - 1;
  for (let h = 0; h < halkaSayisi; h++) {
    const b = iz.halkaBas[h]!;
    const s = iz.halkaBas[h + 1]!;
    const n = s - b;
    for (let i = 0; i < n; i++) {
      const p = b + i;
      const q = b + ((i + 1) % n);
      const lx1 = iz.nokta[p * 2]!;
      const lz1 = iz.nokta[p * 2 + 1]!;
      const lx2 = iz.nokta[q * 2]!;
      const lz2 = iz.nokta[q * 2 + 1]!;
      if ((Math.abs(lx1 - lx2) < eps && sinirda(lx1)) || (Math.abs(lz1 - lz2) < eps && sinirda(lz1))) continue;
      kenarlar.push(nokta[p * 2]!, nokta[p * 2 + 1]!, nokta[q * 2]!, nokta[q * 2 + 1]!, iz.ust[h]!);
    }
  }
  const e: KaroEngeli = {
    x0: kokX,
    z0: kokZ,
    x1: kokX + kenarM,
    z1: kokZ + kenarM,
    kenar: Float64Array.from(kenarlar),
    nokta,
    halkaBas: iz.halkaBas,
    halkaBina: iz.bina,
    halkaUst: iz.ust,
    kova: new Map(),
    kovaX0: Math.floor(kokX / KOVA),
    kovaZ0: Math.floor(kokZ / KOVA),
  };
  for (let k = 0; k < e.kenar.length / 5; k++) {
    const ax = e.kenar[k * 5]!;
    const az = e.kenar[k * 5 + 1]!;
    const bx = e.kenar[k * 5 + 2]!;
    const bz = e.kenar[k * 5 + 3]!;
    const i0 = Math.floor(Math.min(ax, bx) / KOVA);
    const i1 = Math.floor(Math.max(ax, bx) / KOVA);
    const j0 = Math.floor(Math.min(az, bz) / KOVA);
    const j1 = Math.floor(Math.max(az, bz) / KOVA);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const a = kovaAnahtar(i - e.kovaX0 + 100, j - e.kovaZ0 + 100);
        let l = e.kova.get(a);
        if (!l) e.kova.set(a, (l = []));
        l.push(k);
      }
  }
  return e;
}

export class EngelDunyasi {
  private karolar = new Map<string, KaroEngeli>();
  /** Sorgu sayacı (aynı kenarı iki kez işlememek için). */
  private damga = 0;
  private gorulen = new Map<KaroEngeli, Uint32Array>();

  ekle(anahtar: string, e: KaroEngeli): void {
    this.karolar.set(anahtar, e);
    this.gorulen.set(e, new Uint32Array(e.kenar.length / 5));
  }

  sil(anahtar: string): void {
    const e = this.karolar.get(anahtar);
    if (e) this.gorulen.delete(e);
    this.karolar.delete(anahtar);
  }

  get boyut(): number {
    return this.karolar.size;
  }

  /** Kutuyla kesişen kenarları ziyaret eder: f(ax, az, bx, bz, üst). */
  kenarlar(x0: number, z0: number, x1: number, z1: number, f: (ax: number, az: number, bx: number, bz: number, ust: number) => void): void {
    const d = ++this.damga;
    for (const e of this.karolar.values()) {
      if (x1 < e.x0 - 1 || x0 > e.x1 + 1 || z1 < e.z0 - 1 || z0 > e.z1 + 1) continue;
      const g = this.gorulen.get(e)!;
      const i0 = Math.floor(x0 / KOVA);
      const i1 = Math.floor(x1 / KOVA);
      const j0 = Math.floor(z0 / KOVA);
      const j1 = Math.floor(z1 / KOVA);
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          const l = e.kova.get(kovaAnahtar(i - e.kovaX0 + 100, j - e.kovaZ0 + 100));
          if (!l) continue;
          for (const k of l) {
            if (g[k] === d) continue;
            g[k] = d;
            const b = k * 5;
            f(e.kenar[b]!, e.kenar[b + 1]!, e.kenar[b + 2]!, e.kenar[b + 3]!, e.kenar[b + 4]!);
          }
        }
    }
  }

  /** Kutuyla (kaba: ilk noktası kutuda) kesişen halkaları ziyaret eder (mini harita). f(noktalar, baş, son). */
  halkalar(x0: number, z0: number, x1: number, z1: number, f: (nokta: Float64Array, bas: number, son: number) => void): void {
    for (const e of this.karolar.values()) {
      if (x1 < e.x0 || x0 > e.x1 || z1 < e.z0 || z0 > e.z1) continue;
      for (let h = 0; h + 1 < e.halkaBas.length; h++) {
        const b = e.halkaBas[h]!;
        const x = e.nokta[b * 2]!;
        const z = e.nokta[b * 2 + 1]!;
        if (x < x0 || x > x1 || z < z0 || z > z1) continue;
        f(e.nokta, b, e.halkaBas[h + 1]!);
      }
    }
  }

  /** Nokta bir binanın içinde mi (çift-tek kuralı, bina bina)? İçindeyse binanın üst kotu, değilse null. */
  icinde(x: number, z: number): number | null {
    for (const e of this.karolar.values()) {
      if (x < e.x0 || x > e.x1 || z < e.z0 || z > e.z1) continue;
      const n = e.halkaBas.length - 1;
      let h = 0;
      while (h < n) {
        const bina = e.halkaBina[h]!;
        let ic = false;
        let ust = 0;
        for (; h < n && e.halkaBina[h] === bina; h++) {
          const b = e.halkaBas[h]!;
          const s = e.halkaBas[h + 1]!;
          ust = e.halkaUst[h]!;
          for (let i = b, j = s - 1; i < s; j = i++) {
            const xi = e.nokta[i * 2]!;
            const zi = e.nokta[i * 2 + 1]!;
            const xj = e.nokta[j * 2]!;
            const zj = e.nokta[j * 2 + 1]!;
            if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ic = !ic;
          }
        }
        if (ic) return ust;
      }
    }
    return null;
  }
}

/** Noktanın doğru parçasına en yakın noktası. */
export function enYakin(px: number, pz: number, ax: number, az: number, bx: number, bz: number): [number, number] {
  const dx = bx - ax;
  const dz = bz - az;
  const L2 = dx * dx + dz * dz;
  let t = L2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return [ax + t * dx, az + t * dz];
}

/** Daireyi kenarlardan dışarı iter (birkaç yineleme). */
export function daireyiCoz(d: EngelDunyasi, x: number, z: number, r: number): { x: number; z: number; carpti: boolean } {
  let carpti = false;
  for (let yineleme = 0; yineleme < 4; yineleme++) {
    let itti = false;
    d.kenarlar(x - r, z - r, x + r, z + r, (ax, az, bx, bz) => {
      const [qx, qz] = enYakin(x, z, ax, az, bx, bz);
      let vx = x - qx;
      let vz = z - qz;
      const L = Math.hypot(vx, vz);
      if (L >= r) return;
      if (L < 1e-9) {
        // Tam kenar üstünde: kenarın dış normaliyle (dış halka saat yönünde, y aşağı: (dz, −dx))
        const ex = bx - ax;
        const ez = bz - az;
        const el = Math.hypot(ex, ez) || 1;
        vx = ez / el;
        vz = -ex / el;
        x = qx + vx * r;
        z = qz + vz * r;
      } else {
        x = qx + (vx / L) * r;
        z = qz + (vz / L) * r;
      }
      itti = true;
    });
    if (!itti) break;
    carpti = true;
  }
  return { x, z, carpti };
}

/**
 * Kinematik ilerleme: (dx, dz) hareketi ≤ r/2'lik alt adımlarla uygulanır, her adımda daire çözülür.
 * Alt adım yarıçaptan küçük olduğundan ince duvarlardan geçilemez.
 */
export function ilerle(d: EngelDunyasi, x: number, z: number, dx: number, dz: number, r: number): { x: number; z: number; carpti: boolean } {
  const L = Math.hypot(dx, dz);
  const adim = Math.max(1, Math.ceil(L / (r * 0.5)));
  let carpti = false;
  for (let i = 0; i < adim; i++) {
    const c = daireyiCoz(d, x + dx / adim, z + dz / adim, r);
    x = c.x;
    z = c.z;
    carpti ||= c.carpti;
  }
  return { x, z, carpti };
}

/** İki doğru parçası arasındaki en kısa uzaklık. */
export function bolumUzakligi(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): number {
  // Kesişiyorsa 0
  const o = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number): number => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
  const d1 = o(ax, az, bx, bz, cx, cz);
  const d2 = o(ax, az, bx, bz, dx, dz);
  const d3 = o(cx, cz, dx, dz, ax, az);
  const d4 = o(cx, cz, dx, dz, bx, bz);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
  const u = (px: number, pz: number, sx: number, sz: number, ex: number, ez: number): number => {
    const [qx, qz] = enYakin(px, pz, sx, sz, ex, ez);
    return Math.hypot(px - qx, pz - qz);
  };
  return Math.min(u(ax, az, cx, cz, dx, dz), u(bx, bz, cx, cz, dx, dz), u(cx, cz, ax, az, bx, bz), u(dx, dz, ax, az, bx, bz));
}

/** (a → b) doğrusu boyunca r yarıçaplı daire engelsiz geçebilir mi? */
export function gorusVar(d: EngelDunyasi, ax: number, az: number, bx: number, bz: number, r: number): boolean {
  let serbest = true;
  d.kenarlar(Math.min(ax, bx) - r, Math.min(az, bz) - r, Math.max(ax, bx) + r, Math.max(az, bz) + r, (cx, cz, ex, ez) => {
    if (serbest && bolumUzakligi(ax, az, bx, bz, cx, cz, ex, ez) < r) serbest = false;
  });
  return serbest;
}

/**
 * Kamera → karakter görüş hattını örten bina var mı? Hat 2B'de bir kenarı kesiyorsa ve kesişimde hattın
 * yüksekliği binanın üst kotunun altındaysa örtüyor sayılır.
 */
export function ortenVar(d: EngelDunyasi, kx: number, ky: number, kz: number, hx: number, hy: number, hz: number): boolean {
  let var_ = false;
  d.kenarlar(Math.min(kx, hx), Math.min(kz, hz), Math.max(kx, hx), Math.max(kz, hz), (ax, az, bx, bz, ust) => {
    if (var_) return;
    const rx = hx - kx;
    const rz = hz - kz;
    const sx = bx - ax;
    const sz = bz - az;
    const den = rx * sz - rz * sx;
    if (Math.abs(den) < 1e-12) return;
    const t = ((ax - kx) * sz - (az - kz) * sx) / den;
    const u = ((ax - kx) * rz - (az - kz) * rx) / den;
    if (t <= 0 || t >= 0.97 || u < 0 || u > 1) return;
    if (ky + (hy - ky) * t < ust) var_ = true;
  });
  return var_;
}

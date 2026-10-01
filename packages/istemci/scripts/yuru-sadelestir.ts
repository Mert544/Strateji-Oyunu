/**
 * Üçgen ağı sadeleştirme (Garland–Heckbert dörtlü hata ölçüsü, uç noktaya çökertme). Yürüyüş karakterini pişirirken
 * (scripts/yuru-karakter.ts) çok poligonlu mankeni daha düşük poligonlu bir varyanta indirmek için kullanılır.
 *
 * Neden uç noktaya çökertme: çökerttiğimiz köşe kalan köşenin konumuna ve deri ağırlıklarına geçer; yeni köşe
 * üretilmediği için kemik indeksleri ve ağırlıklar bozulmaz. Açık kenar (sınır) köşeleri hiç silinmez ve oynamaz:
 * böylece bölgeler arası dikişler (aynı konumda ayrı köşeler) aralanmaz. Eşdeğer simetri/çevirme (flip) denetimi ve
 * "bağlantı koşulu" ağın düzgün kalmasını sağlar. Üçüncü taraf kod yok; yöntem literatürden.
 */

export interface SadeSecenek {
  /** Hedef üçgen sayısı. */
  hedef: number;
  /** Köşe çiftinin çökertilmesine ek maliyet (m²; örn. farklı deri ağırlıkları için). */
  ekMaliyet?: (silinen: number, kalan: number) => number;
  /** Çökertme sonrası yüz normalinin ters dönmesine izin verilen alt sınır (nokta çarpımı). */
  donmeSiniri?: number;
}

export interface SadeSonuc {
  /** Kalan üçgenler (orijinal köşe indeksleriyle). */
  indeks: number[];
  /** Çökertme sayısı ve son hata. */
  cokertme: number;
  sonHata: number;
}

const bos = (n: number): Float64Array => new Float64Array(n);

/** Düzlem dörtlüsü (simetrik 4×4: a² ab ac ad b² bc bd c² cd d²) × ağırlık. */
function duzlemDortlusu(nx: number, ny: number, nz: number, d: number, w: number, q: Float64Array, o: number): void {
  const c = [nx * nx, nx * ny, nx * nz, nx * d, ny * ny, ny * nz, ny * d, nz * nz, nz * d, d * d];
  for (let i = 0; i < 10; i++) q[o + i]! += w * c[i]!;
}

function hata(q: Float64Array, o: number, x: number, y: number, z: number): number {
  return (
    q[o]! * x * x + 2 * q[o + 1]! * x * y + 2 * q[o + 2]! * x * z + 2 * q[o + 3]! * x +
    q[o + 4]! * y * y + 2 * q[o + 5]! * y * z + 2 * q[o + 6]! * y +
    q[o + 7]! * z * z + 2 * q[o + 8]! * z + q[o + 9]!
  );
}

interface Aday {
  c: number;
  /** Silinen → kalan. */
  u: number;
  v: number;
  su: number;
  sv: number;
}

/** Küçük ikili yığın (en küçük maliyet üstte). */
class Yigin {
  private a: Aday[] = [];
  get uzunluk(): number {
    return this.a.length;
  }
  ekle(x: Aday): void {
    const a = this.a;
    let i = a.length;
    a.push(x);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]!.c <= x.c) break;
      a[i] = a[p]!;
      i = p;
    }
    a[i] = x;
  }
  al(): Aday | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const ust = a[0]!;
    const son = a.pop()!;
    if (a.length) {
      let i = 0;
      for (;;) {
        let k = i * 2 + 1;
        if (k >= a.length) break;
        if (k + 1 < a.length && a[k + 1]!.c < a[k]!.c) k++;
        if (a[k]!.c >= son.c) break;
        a[i] = a[k]!;
        i = k;
      }
      a[i] = son;
    }
    return ust;
  }
}

export function sadelestir(konum: ArrayLike<number>, indeks: ArrayLike<number>, sec: SadeSecenek): SadeSonuc {
  const V = konum.length / 3;
  const F = indeks.length / 3;
  const yuz = Int32Array.from(indeks as ArrayLike<number>); // a, b, c (silinince -1)
  const canli = new Uint8Array(F).fill(1);
  const komsuYuz: number[][] = Array.from({ length: V }, () => []);
  for (let f = 0; f < F; f++) for (let k = 0; k < 3; k++) komsuYuz[yuz[f * 3 + k]!]!.push(f);
  const P = Float64Array.from(konum as ArrayLike<number>);
  const donme = sec.donmeSiniri ?? 0.25;

  // Sınır köşeleri: yalnız bir yüze ait (ya da ikiden fazla yüze ait) kenarların uçları
  const kenarSay = new Map<number, number>();
  const kenarAnahtar = (a: number, b: number): number => (a < b ? a * V + b : b * V + a);
  for (let f = 0; f < F; f++)
    for (let k = 0; k < 3; k++) {
      const a = yuz[f * 3 + k]!;
      const b = yuz[f * 3 + ((k + 1) % 3)]!;
      const key = kenarAnahtar(a, b);
      kenarSay.set(key, (kenarSay.get(key) ?? 0) + 1);
    }
  const sinir = new Uint8Array(V);
  for (let f = 0; f < F; f++)
    for (let k = 0; k < 3; k++) {
      const a = yuz[f * 3 + k]!;
      const b = yuz[f * 3 + ((k + 1) % 3)]!;
      if (kenarSay.get(kenarAnahtar(a, b)) !== 2) sinir[a] = sinir[b] = 1;
    }

  // Köşe dörtlüleri
  const Q = bos(V * 10);
  const normal = (f: number, p = P): [number, number, number, number] => {
    const a = yuz[f * 3]! * 3;
    const b = yuz[f * 3 + 1]! * 3;
    const c = yuz[f * 3 + 2]! * 3;
    const ux = p[b]! - p[a]!;
    const uy = p[b + 1]! - p[a + 1]!;
    const uz = p[b + 2]! - p[a + 2]!;
    const vx = p[c]! - p[a]!;
    const vy = p[c + 1]! - p[a + 1]!;
    const vz = p[c + 2]! - p[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz);
    return [nx, ny, nz, L];
  };
  for (let f = 0; f < F; f++) {
    const [nx, ny, nz, L] = normal(f);
    if (L < 1e-14) continue;
    const a = yuz[f * 3]! * 3;
    const d = -((nx / L) * P[a]! + (ny / L) * P[a + 1]! + (nz / L) * P[a + 2]!);
    for (let k = 0; k < 3; k++) duzlemDortlusu(nx / L, ny / L, nz / L, d, L / 2, Q, yuz[f * 3 + k]! * 10);
  }

  const surum = new Uint32Array(V);
  const silindi = new Uint8Array(V);
  const yigin = new Yigin();

  const komsular = (v: number): Set<number> => {
    const s = new Set<number>();
    for (const f of komsuYuz[v]!)
      if (canli[f])
        for (let k = 0; k < 3; k++) {
          const w = yuz[f * 3 + k]!;
          if (w !== v) s.add(w);
        }
    return s;
  };

  const maliyet = (u: number, v: number): number => {
    const q = new Float64Array(10);
    for (let i = 0; i < 10; i++) q[i] = Q[u * 10 + i]! + Q[v * 10 + i]!;
    return Math.max(0, hata(q, 0, P[v * 3]!, P[v * 3 + 1]!, P[v * 3 + 2]!)) + (sec.ekMaliyet?.(u, v) ?? 0);
  };
  const adayEkle = (u: number, v: number): void => {
    if (sinir[u]) return; // sınır köşesi silinmez
    yigin.ekle({ c: maliyet(u, v), u, v, su: surum[u]!, sv: surum[v]! });
  };
  const kenarlariEkle = (v: number): void => {
    for (const w of komsular(v)) {
      adayEkle(v, w);
      adayEkle(w, v);
    }
  };
  for (let v = 0; v < V; v++) {
    for (const w of komsular(v)) if (v < w) {
      adayEkle(v, w);
      adayEkle(w, v);
    }
  }

  let canliYuz = F;
  let cokertme = 0;
  let sonHata = 0;
  while (canliYuz > sec.hedef) {
    const a = yigin.al();
    if (!a) break;
    const { u, v } = a;
    if (silindi[u] || silindi[v] || a.su !== surum[u] || a.sv !== surum[v]) continue;
    const ortak: number[] = [];
    const komsuU = komsular(u);
    const komsuV = komsular(v);
    for (const w of komsuU) if (komsuV.has(w)) ortak.push(w);
    // u–v kenarını paylaşan yüzler
    const paylasan = komsuYuz[u]!.filter((f) => canli[f] && [0, 1, 2].some((k) => yuz[f * 3 + k] === v));
    if (!paylasan.length) continue;
    // Bağlantı koşulu: ortak komşular yalnız paylaşan yüzlerin tepe köşeleri olmalı
    if (ortak.length !== paylasan.length) continue;
    // Çevirme (flip) ve dejenere denetimi
    let gecerli = true;
    const eski = P.slice(u * 3, u * 3 + 3);
    for (const f of komsuYuz[u]!) {
      if (!canli[f] || paylasan.includes(f)) continue;
      const [nx, ny, nz, L] = normal(f);
      P[u * 3] = P[v * 3]!;
      P[u * 3 + 1] = P[v * 3 + 1]!;
      P[u * 3 + 2] = P[v * 3 + 2]!;
      const [mx, my, mz, M] = normal(f);
      P[u * 3] = eski[0]!;
      P[u * 3 + 1] = eski[1]!;
      P[u * 3 + 2] = eski[2]!;
      if (L < 1e-14) continue;
      if (M < 1e-14 || (nx * mx + ny * my + nz * mz) / (L * M) < donme) {
        gecerli = false;
        break;
      }
    }
    if (!gecerli) continue;
    // Çökert: u → v
    for (const f of komsuYuz[u]!) {
      if (!canli[f]) continue;
      if (paylasan.includes(f)) {
        canli[f] = 0;
        canliYuz--;
        continue;
      }
      for (let k = 0; k < 3; k++) if (yuz[f * 3 + k] === u) yuz[f * 3 + k] = v;
      komsuYuz[v]!.push(f);
    }
    silindi[u] = 1;
    for (let i = 0; i < 10; i++) Q[v * 10 + i]! += Q[u * 10 + i]!;
    surum[v]!++;
    for (const w of komsuU) surum[w]!++;
    kenarlariEkle(v);
    for (const w of komsular(v)) kenarlariEkle(w);
    cokertme++;
    sonHata = a.c;
  }
  const cikti: number[] = [];
  for (let f = 0; f < F; f++) if (canli[f]) cikti.push(yuz[f * 3]!, yuz[f * 3 + 1]!, yuz[f * 3 + 2]!);
  return { indeks: cikti, cokertme, sonHata };
}

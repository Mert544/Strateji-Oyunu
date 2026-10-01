/**
 * Çokgen -> üçgen ağı (saf, three'ye bağımsız).
 *
 * Çokgenler enlem/boylam düzleminde earcut ile üçgenlenir; sonra küre eğriliğini izlemek için uzun kenarlar
 * ORTA NOKTADAN bölünür. Bölme kararı yalnızca kenarın uç noktalarına bağlı olduğundan komşu üçgenler aynı
 * noktaları üretir (T-kavşağı/çatlak oluşmaz).
 */
import earcut from "earcut";
import { acisalMesafeDer, llVek } from "./matematik";

/** [boylam, enlem] noktalarından halka; ilk halka dış sınır, diğerleri delik. */
export type Halka = number[][];
export type Poligon = Halka[];

export interface UcgenAgi {
  /** Düz [boylam, enlem, ...]. */
  ll: number[];
  /** Üçlü köşe indeksleri. */
  indeks: number[];
}

/** Aşırı büyük ağları (hatalı girdi) kesmek için üst sınır. */
const EN_COK_UCGEN = 3_000_000;

/** Kapalı halkanın tekrarlanan son noktasını atar. */
function halkaAc(h: Halka): Halka {
  const s = h.length;
  if (s > 1) {
    const a = h[0] as number[];
    const b = h[s - 1] as number[];
    if (a[0] === b[0] && a[1] === b[1]) return h.slice(0, s - 1);
  }
  return h;
}

/**
 * Bir ağa (lon/lat köşe listeleri + üçgen listesi) uzun kenar bölmesi uygular.
 * Kenar açısal uzunluğu (derece) adimDer'i aşarsa bölünür.
 */
export function ucgenleriBol(ll: number[], indeks: number[], adimDer: number): number[] {
  const orta = new Map<number, number>();
  const M = 67_108_864; // 2^26: indeks çifti anahtarı
  const uzak = (i: number, j: number): number =>
    acisalMesafeDer(ll[2 * i] as number, ll[2 * i + 1] as number, ll[2 * j] as number, ll[2 * j + 1] as number);
  const uzun = (i: number, j: number): boolean => uzak(i, j) > adimDer;
  const ortaNokta = (i: number, j: number): number => {
    const k = i < j ? i * M + j : j * M + i;
    let v = orta.get(k);
    if (v === undefined) {
      v = ll.length / 2;
      ll.push(((ll[2 * i] as number) + (ll[2 * j] as number)) / 2, ((ll[2 * i + 1] as number) + (ll[2 * j + 1] as number)) / 2);
      orta.set(k, v);
    }
    return v;
  };

  const cikti: number[] = [];
  const yigin = indeks.slice();
  while (yigin.length > 0) {
    const c = yigin.pop() as number;
    const b = yigin.pop() as number;
    const a = yigin.pop() as number;
    const sab = uzun(a, b);
    const sbc = uzun(b, c);
    const sca = uzun(c, a);
    const say = (sab ? 1 : 0) + (sbc ? 1 : 0) + (sca ? 1 : 0);
    if (say === 0) {
      cikti.push(a, b, c);
      if (cikti.length > EN_COK_UCGEN * 3) throw new Error("ucgenleriBol: ag cok buyuk (adim cok kucuk?)");
      continue;
    }
    if (say === 1) {
      // bölünen kenarı (p,q) yap; r karşı köşe
      let p = a, q = b, r = c;
      if (sbc) { p = b; q = c; r = a; } else if (sca) { p = c; q = a; r = b; }
      const m = ortaNokta(p, q);
      yigin.push(p, m, r, m, q, r);
    } else if (say === 2) {
      // bölünmeyen kenar (r,p); bölünenler (p,q) ve (q,r): q ortadaki köşe
      let p = a, q = b, r = c;
      if (!sab) { p = b; q = c; r = a; } else if (!sbc) { p = c; q = a; r = b; }
      // burada bölünen kenarlar (p,q) ve (q,r) olmalı: sab&sbc -> p=a,q=b,r=c ; sbc&sca -> p=b,q=c,r=a ; sca&sab -> p=c,q=a,r=b
      const m1 = ortaNokta(p, q);
      const m2 = ortaNokta(q, r);
      yigin.push(m1, q, m2);
      // dörtgen p, m1, m2, r: kısa köşegeni seç
      if (uzak(p, m2) <= uzak(m1, r)) yigin.push(p, m1, m2, p, m2, r);
      else yigin.push(p, m1, r, m1, m2, r);
    } else {
      const m1 = ortaNokta(a, b);
      const m2 = ortaNokta(b, c);
      const m3 = ortaNokta(c, a);
      yigin.push(a, m1, m3, m1, b, m2, m3, m2, c, m1, m2, m3);
    }
  }
  return cikti;
}

/** Tek çokgenin üçgen listesi (earcut), köşeler ll'ye eklenir. */
function tekCokgen(p: Poligon, ll: number[], indeks: number[]): void {
  const halkalar = p.map(halkaAc).filter((h) => h.length >= 3);
  if (halkalar.length === 0) return;
  const taban = ll.length / 2;
  const duz: number[] = [];
  const delikler: number[] = [];
  halkalar.forEach((h, i) => {
    if (i > 0) delikler.push(duz.length / 2);
    for (const n of h) duz.push(n[0] as number, n[1] as number);
  });
  const t = earcut(duz, delikler, 2);
  for (const k of duz) ll.push(k);
  for (const k of t) indeks.push(taban + k);
}

/** Çokgenleri üçgenler ve (adimDer > 0 ise) küre eğriliği için böler. */
export function poligonlariUcgenle(poligonlar: readonly Poligon[], adimDer: number): UcgenAgi {
  const ll: number[] = [];
  let indeks: number[] = [];
  for (const p of poligonlar) tekCokgen(p, ll, indeks);
  if (adimDer > 0) indeks = ucgenleriBol(ll, indeks, adimDer);
  return { ll, indeks };
}

/** Ağdaki üçgenlerin düzlemsel (derece²) toplam alanı; testler ve doğrulama için. */
export function duzlemselAlan(ag: UcgenAgi): number {
  let s = 0;
  for (let i = 0; i < ag.indeks.length; i += 3) {
    const a = ag.indeks[i] as number, b = ag.indeks[i + 1] as number, c = ag.indeks[i + 2] as number;
    const ax = ag.ll[2 * a] as number, ay = ag.ll[2 * a + 1] as number;
    const bx = ag.ll[2 * b] as number, by = ag.ll[2 * b + 1] as number;
    const cx = ag.ll[2 * c] as number, cy = ag.ll[2 * c + 1] as number;
    s += Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
  }
  return s;
}

/** Ağ köşelerini yarıçap r'lik küreye yerleştirir: düz [x,y,z,...]. yukselt: (boylam, enlem) -> yarıçap eki. */
export function kureyeYerlestir(ag: UcgenAgi, yaricap: number, yukselt?: (boylam: number, enlem: number) => number): Float32Array {
  const n = ag.ll.length / 2;
  const cikti = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const b = ag.ll[2 * i] as number;
    const e = ag.ll[2 * i + 1] as number;
    const v = llVek(b, e, yaricap + (yukselt ? yukselt(b, e) : 0));
    cikti[3 * i] = v[0];
    cikti[3 * i + 1] = v[1];
    cikti[3 * i + 2] = v[2];
  }
  return cikti;
}

/**
 * Çoklu çizgileri (her biri [boylam, enlem] dizisi) küre üzerinde ikili uçlu parçalara çevirir (LineSegments):
 * uzun kenarlar adimDer'e göre bölünür. Çıktı: düz [x,y,z,...] (her iki köşe art arda).
 */
export function cizgiParcalari(cizgiler: readonly number[][][], adimDer: number, yaricap: number): Float32Array {
  const d: number[] = [];
  for (const c of cizgiler) {
    for (let i = 0; i + 1 < c.length; i++) {
      const p = c[i] as number[], q = c[i + 1] as number[];
      const uz = acisalMesafeDer(p[0] as number, p[1] as number, q[0] as number, q[1] as number);
      const n = Math.max(1, Math.ceil(uz / adimDer));
      let onceki = llVek(p[0] as number, p[1] as number, yaricap);
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const s = llVek((p[0] as number) + ((q[0] as number) - (p[0] as number)) * t, (p[1] as number) + ((q[1] as number) - (p[1] as number)) * t, yaricap);
        d.push(onceki[0], onceki[1], onceki[2], s[0], s[1], s[2]);
        onceki = s;
      }
    }
  }
  return Float32Array.from(d);
}

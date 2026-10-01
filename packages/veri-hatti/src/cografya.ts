/**
 * Küçük coğrafya yardımcıları: mesafe, sınır kutusu, kara/deniz ızgarası ve deniz yolu araması.
 * Hepsi deterministiktir (rastgelelik ve saat yok).
 */

export type Nokta = readonly [number, number]; // [boylam, enlem]
export type Halka = Nokta[];
export type Cokgen = Halka[]; // ilk halka dış sınır, diğerleri delik

const DUNYA_YARICAPI_KM = 6371.0088;
const RAD = Math.PI / 180;

/** İki nokta arası büyük daire mesafesi (km). */
export function haversineKm(b1: number, e1: number, b2: number, e2: number): number {
  const dE = (e2 - e1) * RAD;
  const dB = (b2 - b1) * RAD;
  const a = Math.sin(dE / 2) ** 2 + Math.cos(e1 * RAD) * Math.cos(e2 * RAD) * Math.sin(dB / 2) ** 2;
  return 2 * DUNYA_YARICAPI_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface Kutu {
  minB: number;
  minE: number;
  maxB: number;
  maxE: number;
}

export function kutuKesisir(a: Kutu, b: Kutu): boolean {
  return a.minB <= b.maxB && a.maxB >= b.minB && a.minE <= b.maxE && a.maxE >= b.minE;
}

/** GeoJSON geometrisinden (Polygon/MultiPolygon) çokgen listesi. */
export function cokgenleriAl(geo: { type: string; coordinates: unknown }): Cokgen[] {
  if (geo.type === "Polygon") return [geo.coordinates as Cokgen];
  if (geo.type === "MultiPolygon") return geo.coordinates as Cokgen[];
  throw new Error(`Desteklenmeyen geometri turu: ${geo.type}`);
}

export function cokgenlerinKutusu(cokgenler: Cokgen[]): Kutu {
  const k: Kutu = { minB: Infinity, minE: Infinity, maxB: -Infinity, maxE: -Infinity };
  for (const c of cokgenler) {
    for (const halka of c) {
      for (const [b, e] of halka) {
        if (b < k.minB) k.minB = b;
        if (b > k.maxB) k.maxB = b;
        if (e < k.minE) k.minE = e;
        if (e > k.maxE) k.maxE = e;
      }
    }
  }
  return k;
}

/** Işın atma (çift-tek kuralı): nokta çokgenin içinde mi (delikler dışarıda sayılır). */
export function noktaCokgende(b: number, e: number, cokgen: Cokgen): boolean {
  let icerde = false;
  for (const halka of cokgen) {
    for (let i = 0, j = halka.length - 1; i < halka.length; j = i++) {
      const [bi, ei] = halka[i] as Nokta;
      const [bj, ej] = halka[j] as Nokta;
      if (ei > e !== ej > e && b < ((bj - bi) * (e - ei)) / (ej - ei) + bi) icerde = !icerde;
    }
  }
  return icerde;
}

// ---------------------------------------------------------------------------
// Kara/deniz ızgarası
// ---------------------------------------------------------------------------

export interface IzgaraOlcusu {
  minB: number;
  maxB: number;
  minE: number;
  maxE: number;
  /** Hücre kenarı (derece). */
  adim: number;
}

/**
 * Kara maskesi: hücre merkezi herhangi bir kara çokgeninin içindeyse 1 (kara), değilse 0 (deniz/göl).
 * Satır 0 en güney enlemdedir.
 */
export class Izgara {
  readonly genislik: number;
  readonly yukseklik: number;
  readonly kara: Uint8Array;

  constructor(readonly olcu: IzgaraOlcusu) {
    this.genislik = Math.ceil((olcu.maxB - olcu.minB) / olcu.adim);
    this.yukseklik = Math.ceil((olcu.maxE - olcu.minE) / olcu.adim);
    this.kara = new Uint8Array(this.genislik * this.yukseklik);
  }

  hucreBoylam(i: number): number {
    return this.olcu.minB + (i + 0.5) * this.olcu.adim;
  }
  hucreEnlem(j: number): number {
    return this.olcu.minE + (j + 0.5) * this.olcu.adim;
  }
  indeks(i: number, j: number): number {
    return j * this.genislik + i;
  }
  icerde(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.genislik && j < this.yukseklik;
  }
  hucreBul(b: number, e: number): [number, number] {
    return [Math.floor((b - this.olcu.minB) / this.olcu.adim), Math.floor((e - this.olcu.minE) / this.olcu.adim)];
  }
  denizMi(i: number, j: number): boolean {
    return this.icerde(i, j) && this.kara[this.indeks(i, j)] === 0;
  }

  /** Bir çokgeni (delikli) tarama çizgisi yöntemiyle kara olarak işaretler. */
  karaEkle(cokgen: Cokgen): void {
    const { minB, minE, adim } = this.olcu;
    const satirlar: number[][] = Array.from({ length: this.yukseklik }, () => []);
    for (const halka of cokgen) {
      for (let n = 0, m = halka.length - 1; n < halka.length; m = n++) {
        const [b1, e1] = halka[m] as Nokta;
        const [b2, e2] = halka[n] as Nokta;
        if (e1 === e2) continue;
        const altE = Math.min(e1, e2);
        const ustE = Math.max(e1, e2);
        // Merkez enlemi [altE, ustE) aralığında olan satırlar
        const j0 = Math.max(0, Math.ceil((altE - minE) / adim - 0.5));
        const j1 = Math.min(this.yukseklik - 1, Math.ceil((ustE - minE) / adim - 0.5) - 1);
        for (let j = j0; j <= j1; j++) {
          const e = minE + (j + 0.5) * adim;
          const b = b1 + ((e - e1) * (b2 - b1)) / (e2 - e1);
          (satirlar[j] as number[]).push(b);
        }
      }
    }
    for (let j = 0; j < this.yukseklik; j++) {
      const kesisim = satirlar[j] as number[];
      if (kesisim.length < 2) continue;
      kesisim.sort((x, y) => x - y);
      for (let k = 0; k + 1 < kesisim.length; k += 2) {
        const i0 = Math.max(0, Math.ceil(((kesisim[k] as number) - minB) / adim - 0.5));
        const i1 = Math.min(this.genislik - 1, Math.ceil(((kesisim[k + 1] as number) - minB) / adim - 0.5) - 1);
        for (let i = i0; i <= i1; i++) this.kara[this.indeks(i, j)] = 1;
      }
    }
  }

  /** Çok noktalı bir çizgi boyunca `yaricap` hücre genişliğinde deniz yolu açar (boğazlar). */
  denizYoluAc(noktalar: readonly Nokta[], yaricap: number): void {
    for (let n = 0; n + 1 < noktalar.length; n++) {
      const [b1, e1] = noktalar[n] as Nokta;
      const [b2, e2] = noktalar[n + 1] as Nokta;
      const adimSayisi = Math.max(1, Math.ceil(Math.max(Math.abs(b2 - b1), Math.abs(e2 - e1)) / (this.olcu.adim / 2)));
      for (let s = 0; s <= adimSayisi; s++) {
        const b = b1 + ((b2 - b1) * s) / adimSayisi;
        const e = e1 + ((e2 - e1) * s) / adimSayisi;
        const [ci, cj] = this.hucreBul(b, e);
        for (let dj = -yaricap; dj <= yaricap; dj++) {
          for (let di = -yaricap; di <= yaricap; di++) {
            if (this.icerde(ci + di, cj + dj)) this.kara[this.indeks(ci + di, cj + dj)] = 0;
          }
        }
      }
    }
  }

  /** (b, e) noktasına en yakın deniz hücresi (km cinsinden mesafesiyle) veya null. */
  enYakinDeniz(b: number, e: number, azamiKm: number): { i: number; j: number; km: number } | null {
    const [ci, cj] = this.hucreBul(b, e);
    const yaricapHucre = Math.ceil(azamiKm / (this.olcu.adim * 111.19 * Math.cos(e * RAD))) + 1;
    let en: { i: number; j: number; km: number } | null = null;
    for (let dj = -yaricapHucre; dj <= yaricapHucre; dj++) {
      for (let di = -yaricapHucre; di <= yaricapHucre; di++) {
        const i = ci + di;
        const j = cj + dj;
        if (!this.denizMi(i, j)) continue;
        const km = haversineKm(b, e, this.hucreBoylam(i), this.hucreEnlem(j));
        if (km > azamiKm) continue;
        if (en === null || km < en.km || (km === en.km && (j < en.j || (j === en.j && i < en.i)))) en = { i, j, km };
      }
    }
    return en;
  }
}

// ---------------------------------------------------------------------------
// Deniz yolu araması (çok kaynaklı Dijkstra)
// ---------------------------------------------------------------------------

/** İkili yığın (anahtar, değer); tembel silme. */
class Yigin {
  private anahtar: number[] = [];
  private deger: number[] = [];
  get boyut(): number {
    return this.anahtar.length;
  }
  ekle(a: number, d: number): void {
    const A = this.anahtar;
    const D = this.deger;
    let i = A.length;
    A.push(a);
    D.push(d);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if ((A[p] as number) <= a) break;
      A[i] = A[p] as number;
      D[i] = D[p] as number;
      i = p;
    }
    A[i] = a;
    D[i] = d;
  }
  cek(): [number, number] {
    const A = this.anahtar;
    const D = this.deger;
    const ka = A[0] as number;
    const kd = D[0] as number;
    const sa = A.pop() as number;
    const sd = D.pop() as number;
    const n = A.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && (A[c + 1] as number) < (A[c] as number)) c++;
        if ((A[c] as number) >= sa) break;
        A[i] = A[c] as number;
        D[i] = D[c] as number;
        i = c;
      }
      A[i] = sa;
      D[i] = sd;
    }
    return [ka, kd];
  }
}

/** Deniz hareketleri: 8 komşu + at hamleleri; ara hücrelerin tümü deniz olmalı (köşe kesmek yasak). */
const HAMLELER: ReadonlyArray<{ di: number; dj: number; ara: ReadonlyArray<[number, number]> }> = [
  { di: 1, dj: 0, ara: [] },
  { di: -1, dj: 0, ara: [] },
  { di: 0, dj: 1, ara: [] },
  { di: 0, dj: -1, ara: [] },
  { di: 1, dj: 1, ara: [[1, 0], [0, 1]] },
  { di: 1, dj: -1, ara: [[1, 0], [0, -1]] },
  { di: -1, dj: 1, ara: [[-1, 0], [0, 1]] },
  { di: -1, dj: -1, ara: [[-1, 0], [0, -1]] },
  { di: 2, dj: 1, ara: [[1, 0], [1, 1]] },
  { di: 2, dj: -1, ara: [[1, 0], [1, -1]] },
  { di: -2, dj: 1, ara: [[-1, 0], [-1, 1]] },
  { di: -2, dj: -1, ara: [[-1, 0], [-1, -1]] },
  { di: 1, dj: 2, ara: [[0, 1], [1, 1]] },
  { di: -1, dj: 2, ara: [[0, 1], [-1, 1]] },
  { di: 1, dj: -2, ara: [[0, -1], [1, -1]] },
  { di: -1, dj: -2, ara: [[0, -1], [-1, -1]] },
];

/**
 * Verilen deniz hücrelerinden (çok kaynaklı) tüm deniz hücrelerine en kısa deniz mesafesi (km).
 * Ulaşılamayan hücreler Infinity kalır.
 */
export function denizMesafeleri(izgara: Izgara, kaynaklar: ReadonlyArray<{ i: number; j: number }>): Float64Array {
  const { genislik, yukseklik, olcu } = izgara;
  const uzak = new Float64Array(genislik * yukseklik).fill(Infinity);
  // Hamle uzunlukları satır enlemine göre değişir; satır başına önceden hesaplanır.
  const dyKm = olcu.adim * 111.19;
  const dxKm = new Float64Array(yukseklik);
  for (let j = 0; j < yukseklik; j++) dxKm[j] = olcu.adim * 111.32 * Math.cos(izgara.hucreEnlem(j) * RAD);

  const yigin = new Yigin();
  for (const k of kaynaklar) {
    const n = izgara.indeks(k.i, k.j);
    uzak[n] = 0;
    yigin.ekle(0, n);
  }
  while (yigin.boyut > 0) {
    const [d, n] = yigin.cek();
    if (d > (uzak[n] as number)) continue;
    const j = Math.floor(n / genislik);
    const i = n - j * genislik;
    for (const h of HAMLELER) {
      const i2 = i + h.di;
      const j2 = j + h.dj;
      if (!izgara.denizMi(i2, j2)) continue;
      let acik = true;
      for (const [ai, aj] of h.ara) {
        if (!izgara.denizMi(i + ai, j + aj)) {
          acik = false;
          break;
        }
      }
      if (!acik) continue;
      const dx = (dxKm[j] as number + (dxKm[j2] as number)) / 2;
      const uzunluk = Math.sqrt((h.di * dx) ** 2 + (h.dj * dyKm) ** 2);
      const n2 = izgara.indeks(i2, j2);
      const yeni = d + uzunluk;
      if (yeni < (uzak[n2] as number)) {
        uzak[n2] = yeni;
        yigin.ekle(yeni, n2);
      }
    }
  }
  return uzak;
}

// ---------------------------------------------------------------------------
// Alan, ağırlık merkezi, mesafe
// ---------------------------------------------------------------------------

/** Nokta ile bir çokgenin kenarları arasındaki en kısa mesafe (km; yerel düzlem yaklaşımı). */
export function noktaCokgenMesafeKm(b: number, e: number, cokgen: Cokgen): number {
  const kx = 111.32 * Math.cos(e * RAD);
  const ky = 111.19;
  let en = Infinity;
  for (const halka of cokgen) {
    for (let i = 0, j = halka.length - 1; i < halka.length; j = i++) {
      const [bi, ei] = halka[i] as Nokta;
      const [bj, ej] = halka[j] as Nokta;
      const ax = (bi - b) * kx;
      const ay = (ei - e) * ky;
      const bx = (bj - b) * kx;
      const by = (ej - e) * ky;
      const dx = bx - ax;
      const dy = by - ay;
      const uz2 = dx * dx + dy * dy;
      let t = uz2 === 0 ? 0 : -(ax * dx + ay * dy) / uz2;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (d < en) en = d;
    }
  }
  return en;
}

/** Halka alanı (km², işaretli) ve ağırlık merkezi; yerel düzlem (boylam × cos(orta enlem)). */
function halkaAlanMerkez(halka: Halka): { alan: number; b: number; e: number } {
  let e0 = 0;
  for (const [, e] of halka) e0 += e;
  e0 /= halka.length;
  const kx = 111.32 * Math.cos(e0 * RAD);
  const ky = 111.19;
  let a2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = halka.length - 1; i < halka.length; j = i++) {
    const x1 = (halka[j] as Nokta)[0] * kx;
    const y1 = (halka[j] as Nokta)[1] * ky;
    const x2 = (halka[i] as Nokta)[0] * kx;
    const y2 = (halka[i] as Nokta)[1] * ky;
    const c = x1 * y2 - x2 * y1;
    a2 += c;
    cx += (x1 + x2) * c;
    cy += (y1 + y2) * c;
  }
  if (a2 === 0) return { alan: 0, b: (halka[0] as Nokta)[0], e: (halka[0] as Nokta)[1] };
  return { alan: a2 / 2, b: cx / (3 * a2) / kx, e: cy / (3 * a2) / ky };
}

/** Çokgenin (delikler düşülerek) alanı km² ve ağırlık merkezi. */
export function cokgenAlanMerkez(c: Cokgen): { alan: number; b: number; e: number } {
  let alan = 0;
  let mb = 0;
  let me = 0;
  c.forEach((halka, n) => {
    const h = halkaAlanMerkez(halka);
    const a = Math.abs(h.alan) * (n === 0 ? 1 : -1);
    alan += a;
    mb += h.b * a;
    me += h.e * a;
  });
  return alan === 0 ? { alan: 0, b: (c[0]?.[0] as Nokta)[0], e: (c[0]?.[0] as Nokta)[1] } : { alan, b: mb / alan, e: me / alan };
}

/**
 * Bölge merkezi: alan ağırlıklı merkez çokgenlerden birinin içindeyse o; değilse (adalar, içbükey)
 * en büyük çokgenin merkez enleminde en geniş iç aralığın ortası.
 */
export function bolgeMerkezi(cokgenler: Cokgen[]): { b: number; e: number; alanKm2: number } {
  let toplam = 0;
  let mb = 0;
  let me = 0;
  let enBuyuk: { alan: number; c: Cokgen; b: number; e: number } | null = null;
  for (const c of cokgenler) {
    const h = cokgenAlanMerkez(c);
    toplam += h.alan;
    mb += h.b * h.alan;
    me += h.e * h.alan;
    if (enBuyuk === null || h.alan > enBuyuk.alan) enBuyuk = { alan: h.alan, c, b: h.b, e: h.e };
  }
  const b = mb / toplam;
  const e = me / toplam;
  if (cokgenler.some((c) => noktaCokgende(b, e, c))) return { b, e, alanKm2: toplam };
  if (enBuyuk === null) throw new Error("bos bolge");
  // En büyük çokgenin merkez enleminde en geniş iç aralık
  const kesisim: number[] = [];
  for (const halka of enBuyuk.c) {
    for (let i = 0, j = halka.length - 1; i < halka.length; j = i++) {
      const [bi, ei] = halka[i] as Nokta;
      const [bj, ej] = halka[j] as Nokta;
      if (ei > enBuyuk.e !== ej > enBuyuk.e) kesisim.push(bi + ((enBuyuk.e - ei) * (bj - bi)) / (ej - ei));
    }
  }
  kesisim.sort((x, y) => x - y);
  let enIyi = { genislik: -1, orta: enBuyuk.b };
  for (let k = 0; k + 1 < kesisim.length; k += 2) {
    const g = (kesisim[k + 1] as number) - (kesisim[k] as number);
    if (g > enIyi.genislik) enIyi = { genislik: g, orta: ((kesisim[k] as number) + (kesisim[k + 1] as number)) / 2 };
  }
  return { b: enIyi.orta, e: enBuyuk.e, alanKm2: toplam };
}

/** Çok noktalı çizgi uzunlukları toplamı (km). */
export function cizgiUzunlukKm(cizgiler: ReadonlyArray<ReadonlyArray<Nokta>>): number {
  let t = 0;
  for (const c of cizgiler) {
    for (let i = 1; i < c.length; i++) {
      t += haversineKm((c[i - 1] as Nokta)[0], (c[i - 1] as Nokta)[1], (c[i] as Nokta)[0], (c[i] as Nokta)[1]);
    }
  }
  return t;
}

/**
 * Birleştirilmiş geometri yazıcısı (saf): bir karonun tüm yer ya da bina üçgenleri tek tampona yazılır,
 * böylece karo başına tek çizim çağrısı olur. Renk köşeye **sınıf** (palet indeksi) ve **gölge** (0–255) olarak
 * yazılır; tema değişince yalnız renk dizisi yeniden doldurulur, geometri yeniden kurulmaz.
 */

export interface GeometriParcasi {
  /** x, y, z (yerel metre). */
  konum: Float32Array;
  /** Köşe başına palet sınıfı. */
  sinif: Uint8Array;
  /** Köşe başına gölge çarpanı (255 = 1). */
  golge: Uint8Array;
  indeks: Uint32Array;
}

export class GeometriYazici {
  private k = new Float32Array(3 * 1024);
  private s = new Uint8Array(1024);
  private g = new Uint8Array(1024);
  private ix = new Uint32Array(3 * 1024);
  private nk = 0;
  private ni = 0;

  get kose(): number {
    return this.nk;
  }

  get ucgen(): number {
    return this.ni / 3;
  }

  private koseYeri(n: number): void {
    if (this.nk + n <= this.s.length) return;
    let c = this.s.length * 2;
    while (c < this.nk + n) c *= 2;
    const k = new Float32Array(c * 3);
    k.set(this.k);
    this.k = k;
    const s = new Uint8Array(c);
    s.set(this.s);
    this.s = s;
    const g = new Uint8Array(c);
    g.set(this.g);
    this.g = g;
  }

  private indeksYeri(n: number): void {
    if (this.ni + n <= this.ix.length) return;
    let c = this.ix.length * 2;
    while (c < this.ni + n) c *= 2;
    const ix = new Uint32Array(c);
    ix.set(this.ix);
    this.ix = ix;
  }

  /** Köşe ekler, indeksini döndürür. */
  nokta(x: number, y: number, z: number, sinif: number, golge = 255): number {
    this.koseYeri(1);
    const i = this.nk++;
    this.k[i * 3] = x;
    this.k[i * 3 + 1] = y;
    this.k[i * 3 + 2] = z;
    this.s[i] = sinif;
    this.g[i] = golge;
    return i;
  }

  uc(a: number, b: number, c: number): void {
    this.indeksYeri(3);
    this.ix[this.ni++] = a;
    this.ix[this.ni++] = b;
    this.ix[this.ni++] = c;
  }

  /** Başka bir parçayı (indeksleri kaydırarak) ekler. */
  ekle(p: GeometriParcasi): void {
    const n = p.sinif.length;
    const taban = this.nk;
    this.koseYeri(n);
    this.k.set(p.konum, taban * 3);
    this.s.set(p.sinif, taban);
    this.g.set(p.golge, taban);
    this.nk += n;
    this.indeksYeri(p.indeks.length);
    for (let i = 0; i < p.indeks.length; i++) this.ix[this.ni + i] = p.indeks[i]! + taban;
    this.ni += p.indeks.length;
  }

  bitir(): GeometriParcasi {
    return {
      konum: this.k.slice(0, this.nk * 3),
      sinif: this.s.slice(0, this.nk),
      golge: this.g.slice(0, this.nk),
      indeks: this.ix.slice(0, this.ni),
    };
  }
}

/** Parçaları tek parçaya birleştirir (çizim çağrısı birleştirme). Sıra korunur. */
export function birlestir(parcalar: readonly GeometriParcasi[]): GeometriParcasi {
  const y = new GeometriYazici();
  for (const p of parcalar) y.ekle(p);
  return y.bitir();
}

/** Parçanın içerik özeti (FNV-1a, 32 bit): determinizm testleri ve hata ayıklama için. */
export function parcaOzeti(p: GeometriParcasi): string {
  let h = 0x811c9dc5;
  const yut = (b: Uint8Array): void => {
    for (let i = 0; i < b.length; i++) {
      h ^= b[i]!;
      h = Math.imul(h, 0x01000193);
    }
  };
  yut(new Uint8Array(p.konum.buffer, p.konum.byteOffset, p.konum.byteLength));
  yut(p.sinif);
  yut(p.golge);
  yut(new Uint8Array(p.indeks.buffer, p.indeks.byteOffset, p.indeks.byteLength));
  return (h >>> 0).toString(16).padStart(8, "0");
}

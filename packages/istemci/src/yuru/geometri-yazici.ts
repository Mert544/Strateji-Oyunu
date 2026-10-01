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
  /**
   * İsteğe bağlı cephe verisi (köşe başına 4 sayı; yalnız bina parçası): u (duvar boyunca m, pencere aralığının
   * başından), pencere açıklığı bitişi (m), pencere aralığı (m), bina tohumu (0–1). Gölgelendirici kat çizgisi,
   * pencere ritmi ve giriş katını bundan üretir (doku yok, tek çizim çağrısı korunur).
   */
  cephe?: Float32Array;
  /** İsteğe bağlı: köşenin ait olduğu cephenin üst kotu (m; korniş/parapet bandı için). */
  ust?: Float32Array;
}

export class GeometriYazici {
  private c: Float32Array | null;
  private u: Float32Array | null;
  /** Sonraki köşelere yazılacak cephe verisi (bina yazıcısında). */
  private simdiC: [number, number, number, number] = [0, 0, 0, 0];
  private simdiU = 0;

  constructor(cephe = false) {
    this.c = cephe ? new Float32Array(4 * 1024) : null;
    this.u = cephe ? new Float32Array(1024) : null;
  }

  /** Bundan sonra eklenen köşelerin cephe verisi (u, açıklık sonu, aralık, tohum) ve üst kotu. */
  cepheAyarla(u: number, aciklik: number, aralik: number, tohum: number, ust: number): void {
    this.simdiC = [u, aciklik, aralik, tohum];
    this.simdiU = ust;
  }

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
    if (this.c && this.u) {
      const cc = new Float32Array(c * 4);
      cc.set(this.c);
      this.c = cc;
      const uu = new Float32Array(c);
      uu.set(this.u);
      this.u = uu;
    }
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
    if (this.c && this.u) {
      this.c.set(this.simdiC, i * 4);
      this.u[i] = this.simdiU;
    }
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
    if (this.c && this.u && p.cephe && p.ust) {
      this.c.set(p.cephe, taban * 4);
      this.u.set(p.ust, taban);
    }
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
      ...(this.c && this.u ? { cephe: this.c.slice(0, this.nk * 4), ust: this.u.slice(0, this.nk) } : {}),
    };
  }
}

/** Parçaları tek parçaya birleştirir (çizim çağrısı birleştirme). Sıra korunur. */
export function birlestir(parcalar: readonly GeometriParcasi[]): GeometriParcasi {
  const y = new GeometriYazici(parcalar.some((p) => p.cephe));
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
  if (p.cephe) yut(new Uint8Array(p.cephe.buffer, p.cephe.byteOffset, p.cephe.byteLength));
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Asgari Mapbox Vector Tile (MVT 2.1) çözücü (saf; bağımlılıksız).
 *
 * Yalnız yürüyüş kipinin ihtiyacı: katman adı, extent, özellik türü, nitelikler ve geometri komutları.
 * `@mapbox/vector-tile` + `pbf` (~5 KB gzip) eklemek yerine ~150 satır; böylece yeni bağımlılık gerekmez ve çözüm
 * işçide tipli dizilerle doğrudan yapılır. Spesifikasyon: https://github.com/mapbox/vector-tile-spec/tree/master/2.1
 */

export type MvtDeger = string | number | boolean;

export interface MvtOzellik {
  /** 1 nokta, 2 çizgi, 3 çokgen. */
  tur: number;
  ozellik: Record<string, MvtDeger>;
  /** Parçalar (halka ya da çizgi), her biri düz [x0, y0, x1, y1, ...] karo birimiyle. Çokgende halka kapalı değildir. */
  parcalar: number[][];
}

export interface MvtKatman {
  ad: string;
  extent: number;
  ozellikler: MvtOzellik[];
}

class Okuyucu {
  i: number;
  constructor(
    readonly b: Uint8Array,
    bas = 0,
    readonly son = b.length,
  ) {
    this.i = bas;
  }

  varint(): number {
    // 2^53'e kadar güvenli (çarpma ile; bit kaydırma 32 bitte taşar)
    let s = 0;
    let c = 1;
    for (;;) {
      const x = this.b[this.i++];
      if (x === undefined) throw new Error("MVT: beklenmedik son");
      s += (x & 0x7f) * c;
      if (x < 0x80) return s;
      c *= 128;
    }
  }

  /** Alan anahtarı: [alan no, kablo türü]. */
  anahtar(): [number, number] {
    const v = this.varint();
    return [Math.floor(v / 8), v & 7];
  }

  uzunluklu(): Okuyucu {
    const n = this.varint();
    const r = new Okuyucu(this.b, this.i, this.i + n);
    this.i += n;
    return r;
  }

  atla(tur: number): void {
    if (tur === 0) this.varint();
    else if (tur === 1) this.i += 8;
    else if (tur === 2) this.i += this.varint();
    else if (tur === 5) this.i += 4;
    else throw new Error(`MVT: bilinmeyen kablo türü ${tur}`);
  }

  metin(): string {
    const n = this.varint();
    const s = Okuyucu.cozucu.decode(this.b.subarray(this.i, this.i + n));
    this.i += n;
    return s;
  }

  /** Paketlenmiş uint32 dizisi. */
  paketli(): number[] {
    const r = this.uzunluklu();
    const l: number[] = [];
    while (r.i < r.son) l.push(r.varint());
    return l;
  }

  static readonly cozucu = new TextDecoder();
}

const zigzag = (n: number): number => (n % 2 === 1 ? -(n + 1) / 2 : n / 2);

function degerOku(r: Okuyucu): MvtDeger {
  let v: MvtDeger = "";
  const g = new DataView(r.b.buffer, r.b.byteOffset, r.b.byteLength);
  while (r.i < r.son) {
    const [alan, tur] = r.anahtar();
    if (alan === 1 && tur === 2) v = r.metin();
    else if (alan === 2 && tur === 5) {
      v = g.getFloat32(r.i, true);
      r.i += 4;
    } else if (alan === 3 && tur === 1) {
      v = g.getFloat64(r.i, true);
      r.i += 8;
    } else if ((alan === 4 || alan === 5) && tur === 0) v = r.varint();
    else if (alan === 6 && tur === 0) v = zigzag(r.varint());
    else if (alan === 7 && tur === 0) v = r.varint() !== 0;
    else r.atla(tur);
  }
  return v;
}

/** Geometri komutlarını parçalara çevirir (MoveTo 1, LineTo 2, ClosePath 7). */
export function geometriCoz(komutlar: readonly number[]): number[][] {
  const parcalar: number[][] = [];
  let x = 0;
  let y = 0;
  let p: number[] | null = null;
  let i = 0;
  while (i < komutlar.length) {
    const ck = komutlar[i++]!;
    const id = ck & 7;
    const sayi = ck >>> 3;
    if (id === 1 || id === 2) {
      for (let j = 0; j < sayi; j++) {
        x += zigzag(komutlar[i++] ?? 0);
        y += zigzag(komutlar[i++] ?? 0);
        if (id === 1) {
          p = [];
          parcalar.push(p);
        }
        p?.push(x, y);
      }
    } else if (id === 7) {
      // Halka kapanır: ilk nokta tekrar yazılmaz (çokgen işlemleri kapalı kabul eder).
    } else throw new Error(`MVT: bilinmeyen komut ${id}`);
  }
  return parcalar;
}

/**
 * Karo baytlarını katmanlara çözer. `istenen` verilirse yalnız o katmanların özellikleri çözülür (diğerleri atlanır).
 */
export function mvtCoz(veri: Uint8Array, istenen?: ReadonlySet<string>): Map<string, MvtKatman> {
  const sonuc = new Map<string, MvtKatman>();
  const r = new Okuyucu(veri);
  while (r.i < r.son) {
    const [alan, tur] = r.anahtar();
    if (alan !== 3 || tur !== 2) {
      r.atla(tur);
      continue;
    }
    const k = r.uzunluklu();
    // İlk geçiş: ad, anahtarlar, değerler, extent; özellik ofsetleri saklanır.
    let ad = "";
    let extent = 4096;
    const anahtarlar: string[] = [];
    const degerler: MvtDeger[] = [];
    const ozellikler: Okuyucu[] = [];
    while (k.i < k.son) {
      const [a, t] = k.anahtar();
      if (a === 1 && t === 2) ad = k.metin();
      else if (a === 2 && t === 2) ozellikler.push(k.uzunluklu());
      else if (a === 3 && t === 2) anahtarlar.push(k.metin());
      else if (a === 4 && t === 2) degerler.push(degerOku(k.uzunluklu()));
      else if (a === 5 && t === 0) extent = k.varint();
      else k.atla(t);
    }
    if (istenen && !istenen.has(ad)) continue;
    const katman: MvtKatman = { ad, extent, ozellikler: [] };
    for (const f of ozellikler) {
      let ftur = 0;
      let etiket: number[] = [];
      let geo: number[] = [];
      while (f.i < f.son) {
        const [a, t] = f.anahtar();
        if (a === 2 && t === 2) etiket = f.paketli();
        else if (a === 3 && t === 0) ftur = f.varint();
        else if (a === 4 && t === 2) geo = f.paketli();
        else f.atla(t);
      }
      const ozellik: Record<string, MvtDeger> = {};
      for (let j = 0; j + 1 < etiket.length; j += 2) {
        const an = anahtarlar[etiket[j]!];
        const dg = degerler[etiket[j + 1]!];
        if (an !== undefined && dg !== undefined) ozellik[an] = dg;
      }
      katman.ozellikler.push({ tur: ftur, ozellik, parcalar: geometriCoz(geo) });
    }
    sonuc.set(ad, katman);
  }
  return sonuc;
}

/** Halkanın işaretli alanı (karo birimi, y aşağı): > 0 dış halka (ekranda saat yönü), < 0 iç halka. */
export function halkaAlani(h: readonly number[]): number {
  let s = 0;
  const n = h.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) s += h[j * 2]! * h[i * 2 + 1]! - h[i * 2]! * h[j * 2 + 1]!;
  return s / 2;
}

/** Çokgen özelliğinin halkalarını [dış, ...delikler] gruplarına ayırır (MVT 2.1 §4.3.4.4). */
export function cokgenler(parcalar: readonly number[][]): number[][][] {
  const l: number[][][] = [];
  let simdiki: number[][] | null = null;
  for (const h of parcalar) {
    if (h.length < 6) continue;
    const a = halkaAlani(h);
    if (a === 0) continue;
    if (a > 0 || !simdiki) {
      simdiki = [h];
      l.push(simdiki);
    } else simdiki.push(h);
  }
  return l;
}

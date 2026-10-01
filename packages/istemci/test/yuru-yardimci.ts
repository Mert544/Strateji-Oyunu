/**
 * Yürüyüş testleri için küçük MVT yazıcısı (yalnız test): sentetik karo baytları üretir.
 */

type Deger = string | number | boolean;

export interface YaziOzellik {
  tur: 1 | 2 | 3;
  ozellik: Record<string, Deger>;
  /** Parçalar (halka ya da çizgi), düz [x0, y0, ...]. Çokgen halkaları kapalı yazılmaz. */
  parcalar: number[][];
}

class Yazici {
  b: number[] = [];
  varint(v: number): void {
    while (v >= 0x80) {
      this.b.push((v % 128) | 0x80);
      v = Math.floor(v / 128);
    }
    this.b.push(v);
  }
  anahtar(alan: number, tur: number): void {
    this.varint(alan * 8 + tur);
  }
  baytlar(alan: number, v: number[]): void {
    this.anahtar(alan, 2);
    this.varint(v.length);
    for (const x of v) this.b.push(x);
  }
  metin(alan: number, s: string): void {
    this.baytlar(alan, [...new TextEncoder().encode(s)]);
  }
  paketli(alan: number, l: number[]): void {
    const y = new Yazici();
    for (const v of l) y.varint(v);
    this.baytlar(alan, y.b);
  }
}

const zz = (n: number): number => (n >= 0 ? n * 2 : -n * 2 - 1);

function geometri(f: YaziOzellik): number[] {
  const k: number[] = [];
  let x = 0;
  let y = 0;
  for (const p of f.parcalar) {
    const n = p.length / 2;
    k.push((1 & 7) | (1 << 3), zz(p[0]! - x), zz(p[1]! - y));
    x = p[0]!;
    y = p[1]!;
    const son = f.tur === 1 ? 1 : n;
    if (son > 1) {
      k.push((2 & 7) | ((son - 1) << 3));
      for (let i = 1; i < son; i++) {
        k.push(zz(p[i * 2]! - x), zz(p[i * 2 + 1]! - y));
        x = p[i * 2]!;
        y = p[i * 2 + 1]!;
      }
    }
    if (f.tur === 3) k.push(7 | (1 << 3));
  }
  return k;
}

/** Katman adı → özellikler; karo baytları (sıkıştırılmamış). */
export function mvtYaz(katmanlar: Record<string, YaziOzellik[]>, extent = 4096): Uint8Array {
  const kok = new Yazici();
  for (const [ad, ozellikler] of Object.entries(katmanlar)) {
    const k = new Yazici();
    k.anahtar(15, 0);
    k.varint(2);
    k.metin(1, ad);
    const anahtarlar: string[] = [];
    const degerler: Deger[] = [];
    const ai = (s: string): number => {
      let i = anahtarlar.indexOf(s);
      if (i < 0) i = anahtarlar.push(s) - 1;
      return i;
    };
    const di = (v: Deger): number => {
      let i = degerler.findIndex((d) => d === v && typeof d === typeof v);
      if (i < 0) i = degerler.push(v) - 1;
      return i;
    };
    for (const f of ozellikler) {
      const fy = new Yazici();
      const etiket: number[] = [];
      for (const [a, v] of Object.entries(f.ozellik)) etiket.push(ai(a), di(v));
      fy.paketli(2, etiket);
      fy.anahtar(3, 0);
      fy.varint(f.tur);
      fy.paketli(4, geometri(f));
      k.baytlar(2, fy.b);
    }
    for (const a of anahtarlar) k.metin(3, a);
    for (const v of degerler) {
      const vy = new Yazici();
      if (typeof v === "string") vy.metin(1, v);
      else if (typeof v === "boolean") {
        vy.anahtar(7, 0);
        vy.varint(v ? 1 : 0);
      } else if (Number.isInteger(v) && v >= 0) {
        vy.anahtar(5, 0);
        vy.varint(v);
      } else {
        const dv = new DataView(new ArrayBuffer(8));
        dv.setFloat64(0, v, true);
        vy.anahtar(3, 1);
        for (let i = 0; i < 8; i++) vy.b.push(dv.getUint8(i));
      }
      k.baytlar(4, vy.b);
    }
    k.anahtar(5, 0);
    k.varint(extent);
    kok.baytlar(3, k.b);
  }
  return Uint8Array.from(kok.b);
}

/** Kare halka (dış: y aşağı koordinatta saat yönü). */
export function kare(x0: number, y0: number, x1: number, y1: number): number[] {
  return [x0, y0, x1, y0, x1, y1, x0, y1];
}

/** Ters sarımlı kare (delik). */
export function delik(x0: number, y0: number, x1: number, y1: number): number[] {
  return [x0, y0, x0, y1, x1, y1, x1, y0];
}

/** Büyük daire yayı şeridi geometrisi (saf): merkez çizgisi + yüzeye paralel yan vektörler. */
import { aci, birim, buyukDaireYayi, carpim, yayParcaSayisi, yayYuksekligi } from "../kure/matematik";
import type { Vek3 } from "../kure/matematik";

export interface SeritKesiti {
  /** Köşe çiftleri: her dilim için [sol, sag] merkez noktası (aynı merkez iki kez): düz xyz, 2(n+1) köşe. */
  merkez: number[];
  /** Her köşenin yan yönü (birim, işaretli: sol = +, sağ = -). */
  yan: number[];
  /** Yay boyunca 0-1. */
  t: number[];
  /** Şerit enine koordinatı: sol köşe +1, sağ köşe -1. */
  capraz: number[];
  /** Yayın açısı (radyan). */
  aci: number;
  n: number;
}

/** Yay boyunca n dilimli şerit; şerit çifti (+yan, -yan) genişlik öznitelikle uygulanır. */
export function seritKesiti(a: Vek3, b: Vek3, n?: number, yukseklik?: number): SeritKesiti {
  const ac = aci(a, b);
  const dilim = n ?? yayParcaSayisi(ac);
  const yuk = yukseklik ?? yayYuksekligi(ac);
  const nk = buyukDaireYayi(a, b, dilim, yuk);
  const merkez: number[] = [];
  const yan: number[] = [];
  const t: number[] = [];
  const capraz: number[] = [];
  for (let i = 0; i <= dilim; i++) {
    const p: Vek3 = [nk[3 * i] as number, nk[3 * i + 1] as number, nk[3 * i + 2] as number];
    const o = Math.max(0, i - 1), s = Math.min(dilim, i + 1);
    const tan: Vek3 = [
      (nk[3 * s] as number) - (nk[3 * o] as number),
      (nk[3 * s + 1] as number) - (nk[3 * o + 1] as number),
      (nk[3 * s + 2] as number) - (nk[3 * o + 2] as number),
    ];
    const y = birim(carpim(birim(p), birim(tan)));
    merkez.push(p[0], p[1], p[2], p[0], p[1], p[2]);
    yan.push(y[0], y[1], y[2], -y[0], -y[1], -y[2]);
    t.push(i / dilim, i / dilim);
    capraz.push(1, -1);
  }
  return { merkez, yan, t, capraz, aci: ac, n: dilim };
}

/** Şeridin üçgen indeksleri (köşe ofseti ile): dilim başına 6 indeks. */
export function seritIndeksleri(n: number, ofset: number): number[] {
  const s: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = ofset + 2 * i;
    s.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return s;
}

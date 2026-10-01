/**
 * Akış parçacıkları: tek Points çizimi. Her parçacık bir kenar üzerinde (yön, mal) grubuna aittir ve konumu
 * tamamen GPU'da (shader) büyük daire yayı boyunca hesaplanır; anlık görüntü gelince yalnızca öznitelikler
 * yerinde yeniden yazılır. Mal rengi + şekil (kategori) iki kanal olarak kodlanır.
 */
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Points, ShaderMaterial, Uniform } from "three";
import type { Object3D } from "three";
import { PARCACIK_FS, PARCACIK_VS } from "../kure/shaderlar";
import type { Ortak } from "../kure/ortak";
import { v3 } from "../kure/ortak";
import type { SahnePaleti } from "../kure/tema";
import { aci, birim, carpim, topla, yayYuksekligi } from "../kure/matematik";
import type { Vek3 } from "../kure/matematik";
import type { Dizin, DizinKenar, Kare } from "../veri/kare-tipleri";
import { hexRgb, malRengiHex, sekilKodu } from "../veri/renkler";

export const EN_COK_PARCACIK = 6000;

export interface AkisGrubu {
  kenar: number;
  /** 0: kenar.a -> kenar.b, 1: ters. */
  yon: 0 | 1;
  mal: number;
  /** birim/saat */
  oran: number;
}

/** Akışları (kenar, yön, mal) gruplarına topla: her akışın yolu kaynaktan hedefe kenar kenar izlenir. */
export function akisGruplari(kare: Kare, kenarlar: readonly DizinKenar[]): AkisGrubu[] {
  const harita = new Map<number, AkisGrubu>();
  for (const a of kare.akislar) {
    let cur = a[2];
    for (const e of a[4]) {
      const k = kenarlar[e];
      if (!k) break;
      const yon: 0 | 1 = k.a === cur ? 0 : 1;
      const sonraki = yon === 0 ? k.b : k.a;
      const anahtar = (e * 2 + yon) * 64 + a[0];
      const g = harita.get(anahtar);
      if (g) g.oran += a[1];
      else harita.set(anahtar, { kenar: e, yon, mal: a[0], oran: a[1] });
      cur = sonraki;
    }
  }
  return [...harita.values()];
}

/** Gruptaki parçacık sayısı (orana göre 1-4). */
export function grupParcacikSayisi(oran: number): number {
  return Math.max(1, Math.min(4, Math.ceil(oran / 40)));
}

/** Kare ve seçili mal için seçili malın geçtiği kenar kümesi (yoksa null). */
export function malKenarlari(kare: Kare, mal: number): Set<number> | null {
  if (mal < 0) return null;
  const s = new Set<number>();
  for (const a of kare.akislar) if (a[0] === mal) for (const e of a[4]) s.add(e);
  return s;
}

export class AkisParcaciklari {
  readonly nesneler: Object3D[] = [];
  private malz: ShaderMaterial;
  private geo: BufferGeometry;
  private a: BufferAttribute;
  private b: BufferAttribute;
  private omega: BufferAttribute;
  private yuk: BufferAttribute;
  private faz: BufferAttribute;
  private hiz: BufferAttribute;
  private renk: BufferAttribute;
  private boyut: BufferAttribute;
  private sekil: BufferAttribute;
  private alfa: BufferAttribute;
  sayi = 0;

  constructor(
    private dizin: Dizin,
    private merkezler: readonly Vek3[],
    ortak: Ortak,
  ) {
    const n = EN_COK_PARCACIK;
    const mk = (boy: number): BufferAttribute => {
      const b = new BufferAttribute(new Float32Array(n * boy), boy);
      b.setUsage(DynamicDrawUsage);
      return b;
    };
    this.a = mk(3);
    this.b = mk(3);
    this.omega = mk(1);
    this.yuk = mk(1);
    this.faz = mk(1);
    this.hiz = mk(1);
    this.renk = mk(3);
    this.boyut = mk(1);
    this.sekil = mk(1);
    this.alfa = mk(1);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aA", this.a);
    g.setAttribute("aB", this.b);
    g.setAttribute("aOmega", this.omega);
    g.setAttribute("aYukseklik", this.yuk);
    g.setAttribute("aFaz", this.faz);
    g.setAttribute("aHizKat", this.hiz);
    g.setAttribute("aRenk", this.renk);
    g.setAttribute("aBoyut", this.boyut);
    g.setAttribute("aSekil", this.sekil);
    g.setAttribute("aAlfa", this.alfa);
    g.setDrawRange(0, 0);
    this.geo = g;
    this.malz = new ShaderMaterial({
      vertexShader: PARCACIK_VS,
      fragmentShader: PARCACIK_FS,
      uniforms: {
        uZaman: ortak.uZaman as Uniform,
        // Hareket azaltma tercihi: parçacıklar yerinde durur (yine de mal rengi/şekliyle okunur).
        uAcisalHiz: new Uniform(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.085),
        uPikselOran: ortak.uPikselOran as Uniform,
        uOdak: ortak.uOdak as Uniform,
        uYukseklik: new Uniform(0.0008),
        uKontur: new Uniform(v3([0.1, 0.1, 0.1])),
      },
      transparent: true,
      depthWrite: false,
    });
    const p = new Points(g, this.malz);
    p.frustumCulled = false;
    p.renderOrder = 11;
    this.nesneler.push(p);
  }

  /** malSecili: -1 = hepsi; aksi halde diğer mallar soluk. */
  guncelle(kare: Kare, malSecili: number): void {
    const gruplar = akisGruplari(kare, this.dizin.kenarlar);
    let i = 0;
    const A = this.a.array as Float32Array, B = this.b.array as Float32Array;
    const om = this.omega.array as Float32Array, yk = this.yuk.array as Float32Array, fz = this.faz.array as Float32Array;
    const hz = this.hiz.array as Float32Array, rn = this.renk.array as Float32Array, by = this.boyut.array as Float32Array;
    const sk = this.sekil.array as Float32Array, al = this.alfa.array as Float32Array;
    for (const g of gruplar) {
      const k = this.dizin.kenarlar[g.kenar];
      if (!k) continue;
      const basIdx = g.yon === 0 ? k.a : k.b;
      const sonIdx = g.yon === 0 ? k.b : k.a;
      const u0 = this.merkezler[basIdx] as Vek3, u1 = this.merkezler[sonIdx] as Vek3;
      const ac = aci(u0, u1);
      // Mal şeridi: yanal kayma (aynı kenardaki farklı mallar üst üste binmesin)
      const yan = birim(carpim(u0, u1));
      const serit = ((g.mal % 4) - 1.5) * 0.0032;
      const p0 = birim(topla(u0, yan, serit)), p1 = birim(topla(u1, yan, serit));
      const mal = this.dizin.mallar[g.mal];
      const rgb = hexRgb(malRengiHex(mal?.id ?? String(g.mal)));
      const sekil = sekilKodu(mal?.kategori ?? "");
      const secili = malSecili < 0 || malSecili === g.mal;
      const n = grupParcacikSayisi(g.oran);
      const yuks = yayYuksekligi(ac);
      const tohum = ((g.kenar * 131 + g.mal * 71 + g.yon * 17) % 97) / 97;
      for (let q = 0; q < n && i < EN_COK_PARCACIK; q++, i++) {
        A[3 * i] = p0[0]; A[3 * i + 1] = p0[1]; A[3 * i + 2] = p0[2];
        B[3 * i] = p1[0]; B[3 * i + 1] = p1[1]; B[3 * i + 2] = p1[2];
        om[i] = ac;
        yk[i] = yuks;
        fz[i] = (q / n + tohum) % 1;
        hz[i] = 1;
        rn[3 * i] = rgb[0]; rn[3 * i + 1] = rgb[1]; rn[3 * i + 2] = rgb[2];
        by[i] = secili && malSecili >= 0 ? 1.35 : 1;
        sk[i] = sekil;
        al[i] = secili ? 1 : 0.1;
      }
    }
    this.sayi = i;
    for (const at of [this.a, this.b, this.omega, this.yuk, this.faz, this.hiz, this.renk, this.boyut, this.sekil, this.alfa]) at.needsUpdate = true;
    this.geo.setDrawRange(0, i);
  }

  temaUygula(p: SahnePaleti): void {
    (this.malz.uniforms["uKontur"] as Uniform).value = v3(p.kontur);
  }
}


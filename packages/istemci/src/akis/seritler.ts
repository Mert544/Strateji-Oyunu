/**
 * Lojistik kenarları: büyük daire yayı şeritleri (tek birleştirilmiş arabellek, tek çizim çağrısı).
 * Kalınlık = kapasite, renk = kullanım (viridis benzeri rampa); genişlik/renk öznitelikleri yerinde güncellenir.
 * Savaş yayları aynı shader ile ayrı (küçük) bir arabellekte yanıp söner.
 */
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh, ShaderMaterial, Uniform } from "three";
import type { Object3D } from "three";
import { SERIT_FS, SERIT_VS } from "../kure/shaderlar";
import type { Ortak } from "../kure/ortak";
import { v3 } from "../kure/ortak";
import type { SahnePaleti } from "../kure/tema";
import { seritIndeksleri, seritKesiti } from "./serit-geo";
import type { Vek3 } from "../kure/matematik";
import type { DizinKenar, Kare, SavasKaresi } from "../veri/kare-tipleri";
import { kenarKullanimi } from "../veri/kapsam";

const TUR_KODU = { kara: 0, deniz: 1, hava: 2 } as const;

/** Bir kenarın genişliği (dünya birimi): kapasiteyle artan, doygunsa asgari değerli. */
export function kenarGenisligi(kapasite: number, enBuyuk: number, tur: DizinKenar["tur"], doygun: boolean): number {
  let w = 0.0028 + 0.0092 * Math.sqrt(Math.max(0, kapasite) / Math.max(1, enBuyuk));
  if (tur === "hava") w *= 0.55;
  if (doygun) w = Math.max(w, tur === "hava" ? 0.004 : 0.0058);
  return w;
}

function seritMalzemesi(ortak: Ortak, savas: boolean): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: SERIT_VS,
    fragmentShader: SERIT_FS,
    uniforms: {
      uGunes: new Uniform(ortak.uGunes.value),
      uGece: new Uniform(0.6),
      uAksam: new Uniform(0),
      uKenarIsik: new Uniform(v3([0, 0, 0])),
      uGenislikOlcek: ortak.uGenislikOlcek as Uniform,
      uZaman: ortak.uZaman as Uniform,
      uRampa: new Uniform([v3([0, 0, 0]), v3([0, 0, 0]), v3([0, 0, 0]), v3([0, 0, 0]), v3([0, 0, 0])]),
      uSavasRenk: new Uniform(v3([1, 0.3, 0.3])),
      uSavas: new Uniform(savas ? 1 : 0),
      uSeritKontur: new Uniform(v3([0.1, 0.1, 0.1])),
    },
    transparent: true,
    depthWrite: false,
  });
}

export class KenarSeritleri {
  readonly nesneler: Object3D[] = [];
  private malz: ShaderMaterial;
  private ilk: Int32Array;
  private adet: Int32Array;
  private genislik: BufferAttribute;
  private kullanim: BufferAttribute;
  private soluk: BufferAttribute;
  private enBuyukKap = 1;
  readonly ucgen: number;

  constructor(
    private kenarlar: readonly DizinKenar[],
    merkezler: readonly Vek3[],
    ortak: Ortak,
  ) {
    const nk = kenarlar.length;
    this.ilk = new Int32Array(nk);
    this.adet = new Int32Array(nk);
    const merkez: number[] = [], yan: number[] = [], t: number[] = [], tur: number[] = [], uz: number[] = [], capraz: number[] = [];
    const indeks: number[] = [];
    let kose = 0;
    kenarlar.forEach((k, i) => {
      const a = merkezler[k.a] as Vek3, b = merkezler[k.b] as Vek3;
      const s = seritKesiti(a, b);
      const n2 = s.merkez.length / 3;
      this.ilk[i] = kose;
      this.adet[i] = n2;
      for (const v of s.merkez) merkez.push(v);
      for (const v of s.yan) yan.push(v);
      for (const v of s.t) t.push(v);
      for (const v of s.capraz) capraz.push(v);
      for (let q = 0; q < n2; q++) {
        tur.push(TUR_KODU[k.tur]);
        uz.push(s.aci);
      }
      for (const v of seritIndeksleri(s.n, kose)) indeks.push(v);
      kose += n2;
    });
    const g = new BufferGeometry();
    const mAttr = new BufferAttribute(new Float32Array(merkez), 3);
    g.setAttribute("position", mAttr);
    g.setAttribute("aMerkez", mAttr);
    g.setAttribute("aYan", new BufferAttribute(new Float32Array(yan), 3));
    g.setAttribute("aT", new BufferAttribute(new Float32Array(t), 1));
    g.setAttribute("aCapraz", new BufferAttribute(new Float32Array(capraz), 1));
    g.setAttribute("aTur", new BufferAttribute(new Float32Array(tur), 1));
    g.setAttribute("aUzun", new BufferAttribute(new Float32Array(uz), 1));
    this.genislik = new BufferAttribute(new Float32Array(kose).fill(0.004), 1);
    this.kullanim = new BufferAttribute(new Float32Array(kose), 1);
    this.soluk = new BufferAttribute(new Float32Array(kose).fill(0.9), 1);
    for (const a of [this.genislik, this.kullanim, this.soluk]) a.setUsage(DynamicDrawUsage);
    g.setAttribute("aGenislik", this.genislik);
    g.setAttribute("aKullanim", this.kullanim);
    g.setAttribute("aSoluk", this.soluk);
    g.setIndex(new BufferAttribute(kose > 65535 ? new Uint32Array(indeks) : new Uint16Array(indeks), 1));
    this.malz = seritMalzemesi(ortak, false);
    const m = new Mesh(g, this.malz);
    m.frustumCulled = false;
    m.renderOrder = 10;
    this.nesneler.push(m);
    this.ucgen = indeks.length / 3;
  }

  /**
   * Kareden genişlik ve kullanım renklerini yazar. maleGore: seçili malın taşındığı kenarların kümesi (yoksa null).
   */
  guncelle(kare: Kare, maleGore: ReadonlySet<number> | null): void {
    for (const k of kare.kenarlar) if (k[0] > this.enBuyukKap) this.enBuyukKap = k[0];
    const w = this.genislik.array as Float32Array;
    const u = this.kullanim.array as Float32Array;
    const s = this.soluk.array as Float32Array;
    for (let i = 0; i < this.kenarlar.length; i++) {
      const k = kare.kenarlar[i];
      const dk = this.kenarlar[i];
      if (!k || !dk) continue;
      const kul = kenarKullanimi(k);
      const gen = kenarGenisligi(k[0], this.enBuyukKap, dk.tur, kul >= 0.9);
      const solukluk = maleGore ? (maleGore.has(i) ? 0.98 : 0.22) : 0.9;
      const a = this.ilk[i] as number, n = this.adet[i] as number;
      for (let q = a; q < a + n; q++) {
        w[q] = gen;
        u[q] = Math.min(1, kul);
        s[q] = solukluk;
      }
    }
    this.genislik.needsUpdate = true;
    this.kullanim.needsUpdate = true;
    this.soluk.needsUpdate = true;
  }

  temaUygula(p: SahnePaleti): void {
    (this.malz.uniforms["uRampa"] as Uniform).value = p.palet.kullanim.map((c) => v3(c));
    (this.malz.uniforms["uGece"] as Uniform).value = p.geceBolge;
    (this.malz.uniforms["uSeritKontur"] as Uniform).value = v3(p.seritKontur);
  }
}

const EN_COK_SAVAS = 12;
const SAVAS_DILIM = 28;

export class SavasYaylari {
  readonly nesneler: Object3D[] = [];
  private malz: ShaderMaterial;
  private geo: BufferGeometry;
  private merkez: BufferAttribute;
  private yan: BufferAttribute;
  private t: BufferAttribute;
  private uz: BufferAttribute;
  private capraz: BufferAttribute;
  private genislik: BufferAttribute;

  constructor(
    private merkezler: readonly Vek3[],
    ortak: Ortak,
  ) {
    const koseArc = (SAVAS_DILIM + 1) * 2;
    const toplam = koseArc * EN_COK_SAVAS;
    this.merkez = new BufferAttribute(new Float32Array(toplam * 3), 3);
    this.yan = new BufferAttribute(new Float32Array(toplam * 3), 3);
    this.t = new BufferAttribute(new Float32Array(toplam), 1);
    this.uz = new BufferAttribute(new Float32Array(toplam), 1);
    this.capraz = new BufferAttribute(new Float32Array(toplam), 1);
    this.genislik = new BufferAttribute(new Float32Array(toplam).fill(0.013), 1);
    const indeks: number[] = [];
    for (let i = 0; i < EN_COK_SAVAS; i++) for (const v of seritIndeksleri(SAVAS_DILIM, i * koseArc)) indeks.push(v);
    const g = new BufferGeometry();
    g.setAttribute("position", this.merkez);
    g.setAttribute("aMerkez", this.merkez);
    g.setAttribute("aYan", this.yan);
    g.setAttribute("aT", this.t);
    g.setAttribute("aCapraz", this.capraz);
    g.setAttribute("aUzun", this.uz);
    g.setAttribute("aGenislik", this.genislik);
    g.setAttribute("aKullanim", new BufferAttribute(new Float32Array(toplam), 1));
    g.setAttribute("aTur", new BufferAttribute(new Float32Array(toplam), 1));
    g.setAttribute("aSoluk", new BufferAttribute(new Float32Array(toplam).fill(1), 1));
    g.setIndex(new BufferAttribute(new Uint16Array(indeks), 1));
    g.setDrawRange(0, 0);
    this.geo = g;
    this.malz = seritMalzemesi(ortak, true);
    const m = new Mesh(g, this.malz);
    m.frustumCulled = false;
    m.renderOrder = 12;
    this.nesneler.push(m);
  }

  guncelle(savaslar: readonly SavasKaresi[]): void {
    const aktif = savaslar.filter((s) => s.evre !== "bitti").slice(0, EN_COK_SAVAS);
    const koseArc = (SAVAS_DILIM + 1) * 2;
    aktif.forEach((s, i) => {
      const a = this.merkezler[s.saldiranBolge], b = this.merkezler[s.hedefBolge];
      if (!a || !b) return;
      const k = seritKesiti(a, b, SAVAS_DILIM);
      (this.merkez.array as Float32Array).set(k.merkez, i * koseArc * 3);
      (this.yan.array as Float32Array).set(k.yan, i * koseArc * 3);
      (this.t.array as Float32Array).set(k.t, i * koseArc);
      (this.uz.array as Float32Array).fill(k.aci, i * koseArc, (i + 1) * koseArc);
      (this.capraz.array as Float32Array).set(k.capraz, i * koseArc);
    });
    this.merkez.needsUpdate = true;
    this.yan.needsUpdate = true;
    this.t.needsUpdate = true;
    this.uz.needsUpdate = true;
    this.capraz.needsUpdate = true;
    this.geo.setDrawRange(0, aktif.length * SAVAS_DILIM * 6);
  }

  temaUygula(p: SahnePaleti): void {
    (this.malz.uniforms["uSavasRenk"] as Uniform).value = v3(p.savas);
    (this.malz.uniforms["uSeritKontur"] as Uniform).value = v3(p.seritKontur);
  }
}

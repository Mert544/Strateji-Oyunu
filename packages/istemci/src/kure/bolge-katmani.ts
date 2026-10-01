/**
 * Oyun bölgeleri katmanı: tüm bölge çokgenleri TEK birleştirilmiş üçgen arabelleğinde (her bölge ardışık bir köşe
 * aralığı); renk ve desen öznitelikleri yerinde güncellenir (yeniden arabellek oluşturma yok). Bölge sınır çizgileri
 * tek LineSegments, seçili bölge çizgisi ayrı küçük arabellekte.
 */
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, LineSegments, Mesh, ShaderMaterial, Uniform } from "three";
import type { Object3D } from "three";
import { BOLGE_FS, BOLGE_VS, CIZGI_FS, CIZGI_VS } from "./shaderlar";
import { cizgiParcalari, kureyeYerlestir, poligonlariUcgenle } from "./ucgenle";
import type { Ortak } from "./ortak";
import { v3 } from "./ortak";
import type { SahnePaleti } from "./tema";
import type { BolgeGeo } from "../veri/harita-birlestir";
import { noktaIcinde } from "../veri/cografya";
import { acisalMesafeDer } from "./matematik";
import type { BolgeRenkTamponu, RGB } from "../veri/renkler";

export const BOLGE_YARICAPI = 1.0045;
export const BOLGE_CIZGI_YARICAPI = 1.0052;
const SECIM_KAPASITE = 12000; // köşe

export interface BolgeKatmaniIstatistik {
  ucgen: number;
  kose: number;
  cizgiParca: number;
}

export class BolgeKatmani {
  readonly nesneler: Object3D[] = [];
  readonly istatistik: BolgeKatmaniIstatistik;
  private ilk: Int32Array;
  private adet: Int32Array;
  private renkAttr: BufferAttribute;
  private desenAttr: BufferAttribute;
  private malz: ShaderMaterial;
  private cizgiMalz: ShaderMaterial;
  private secimMalz: ShaderMaterial;
  private secimAttr: BufferAttribute;
  private secimGeo: BufferGeometry;
  private bolgeCizgileri: Float32Array[] = [];
  private secili = -1;

  constructor(private bolgeler: readonly BolgeGeo[], ortak: Ortak, adimDer = 0.4) {
    const nb = bolgeler.length;
    this.ilk = new Int32Array(nb);
    this.adet = new Int32Array(nb);

    const konumlar: Float32Array[] = [];
    const indeksler: number[] = [];
    let kose = 0;
    bolgeler.forEach((b, i) => {
      const ag = poligonlariUcgenle(b.poligonlar, adimDer);
      const k = kureyeYerlestir(ag, BOLGE_YARICAPI);
      this.ilk[i] = kose;
      this.adet[i] = k.length / 3;
      for (const x of ag.indeks) indeksler.push(x + kose);
      konumlar.push(k);
      kose += k.length / 3;
    });
    const konum = new Float32Array(kose * 3);
    let o = 0;
    for (const k of konumlar) {
      konum.set(k, o);
      o += k.length;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(konum, 3));
    this.renkAttr = new BufferAttribute(new Float32Array(kose * 3).fill(0.6), 3);
    this.renkAttr.setUsage(DynamicDrawUsage);
    this.desenAttr = new BufferAttribute(new Float32Array(kose), 1);
    this.desenAttr.setUsage(DynamicDrawUsage);
    g.setAttribute("renk", this.renkAttr);
    g.setAttribute("desen", this.desenAttr);
    g.setIndex(new BufferAttribute(kose > 65535 ? new Uint32Array(indeksler) : new Uint16Array(indeksler), 1));
    const isik = (): Record<string, Uniform> => ({
      uGunes: new Uniform(ortak.uGunes.value),
      uGece: new Uniform(0.6),
      uAksam: new Uniform(1),
      uKenarIsik: new Uniform(v3([0.5, 0.7, 1])),
    });
    this.malz = new ShaderMaterial({
      vertexShader: BOLGE_VS,
      fragmentShader: BOLGE_FS,
      uniforms: { ...isik(), uDesenRenk: new Uniform(v3([1, 1, 1])), uPikselOran: ortak.uPikselOran as Uniform },
    });
    const mesh = new Mesh(g, this.malz);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    this.nesneler.push(mesh);

    // Bölge sınır çizgileri
    const parcalar: Float32Array[] = [];
    bolgeler.forEach((b) => {
      const halkalar: number[][][] = [];
      for (const p of b.poligonlar) for (const h of p) halkalar.push(h);
      const c = cizgiParcalari(halkalar, adimDer * 2, BOLGE_CIZGI_YARICAPI);
      this.bolgeCizgileri.push(c);
      parcalar.push(c);
    });
    const topam = parcalar.reduce((s, p) => s + p.length, 0);
    const cp = new Float32Array(topam);
    let oo = 0;
    for (const p of parcalar) {
      cp.set(p, oo);
      oo += p.length;
    }
    const cg = new BufferGeometry();
    cg.setAttribute("position", new BufferAttribute(cp, 3));
    cg.setAttribute("aKalin", new BufferAttribute(new Float32Array(cp.length / 3), 1));
    this.cizgiMalz = new ShaderMaterial({
      vertexShader: CIZGI_VS,
      fragmentShader: CIZGI_FS,
      uniforms: { ...isik(), uRenkA: new Uniform([0, 0, 0, 0.6]), uRenkB: new Uniform([0, 0, 0, 0.6]) },
      transparent: true,
      depthWrite: false,
    });
    const cizgi = new LineSegments(cg, this.cizgiMalz);
    cizgi.frustumCulled = false;
    this.nesneler.push(cizgi);

    // Seçili bölge çizgisi
    this.secimGeo = new BufferGeometry();
    this.secimAttr = new BufferAttribute(new Float32Array(SECIM_KAPASITE * 3), 3);
    this.secimAttr.setUsage(DynamicDrawUsage);
    this.secimGeo.setAttribute("position", this.secimAttr);
    this.secimGeo.setAttribute("aKalin", new BufferAttribute(new Float32Array(SECIM_KAPASITE), 1));
    this.secimGeo.setDrawRange(0, 0);
    this.secimMalz = new ShaderMaterial({
      vertexShader: CIZGI_VS,
      fragmentShader: CIZGI_FS,
      uniforms: { ...isik(), uRenkA: new Uniform([1, 1, 1, 1]), uRenkB: new Uniform([1, 1, 1, 1]) },
      transparent: true,
      depthWrite: false,
    });
    const secim = new LineSegments(this.secimGeo, this.secimMalz);
    secim.frustumCulled = false;
    secim.renderOrder = 5;
    this.nesneler.push(secim);

    this.istatistik = { ucgen: indeksler.length / 3, kose, cizgiParca: cp.length / 6 };
  }

  /** Renk/desen tamponunu köşe özniteliklerine yazar. vurgu: seçili bölgeyi beyaza doğru açar. */
  renkleriYaz(t: BolgeRenkTamponu, secili: number, vurguRenk: RGB): void {
    const r = this.renkAttr.array as Float32Array;
    const d = this.desenAttr.array as Float32Array;
    for (let i = 0; i < this.bolgeler.length; i++) {
      let cr = t.renk[3 * i] as number, cg = t.renk[3 * i + 1] as number, cb = t.renk[3 * i + 2] as number;
      if (i === secili) {
        cr = cr + (vurguRenk[0] - cr) * 0.3;
        cg = cg + (vurguRenk[1] - cg) * 0.3;
        cb = cb + (vurguRenk[2] - cb) * 0.3;
      }
      const dv = t.desen[i] as number;
      const a = this.ilk[i] as number, n = this.adet[i] as number;
      for (let k = a; k < a + n; k++) {
        r[3 * k] = cr;
        r[3 * k + 1] = cg;
        r[3 * k + 2] = cb;
        d[k] = dv;
      }
    }
    this.renkAttr.needsUpdate = true;
    this.desenAttr.needsUpdate = true;
  }

  /** Seçili bölgenin çizgisini güncelle (-1 = kaldır). */
  seciliAyarla(i: number): void {
    this.secili = i;
    const c = i >= 0 ? this.bolgeCizgileri[i] : undefined;
    if (!c) {
      this.secimGeo.setDrawRange(0, 0);
      return;
    }
    const n = Math.min(c.length / 3, SECIM_KAPASITE);
    (this.secimAttr.array as Float32Array).set(c.subarray(0, n * 3));
    this.secimAttr.needsUpdate = true;
    this.secimGeo.setDrawRange(0, n);
  }

  get seciliBolge(): number {
    return this.secili;
  }

  temaUygula(p: SahnePaleti): void {
    for (const m of [this.malz, this.cizgiMalz, this.secimMalz]) {
      (m.uniforms["uGece"] as Uniform).value = p.geceBolge;
      (m.uniforms["uAksam"] as Uniform).value = p.aksam;
      (m.uniforms["uKenarIsik"] as Uniform).value = v3(p.kenarIsik);
    }
    (this.malz.uniforms["uDesenRenk"] as Uniform).value = v3(p.desen);
    (this.cizgiMalz.uniforms["uRenkA"] as Uniform).value = p.bolgeCizgi;
    (this.cizgiMalz.uniforms["uRenkB"] as Uniform).value = p.bolgeCizgi;
    (this.secimMalz.uniforms["uRenkA"] as Uniform).value = p.secimCizgi;
    (this.secimMalz.uniforms["uRenkB"] as Uniform).value = p.secimCizgi;
  }

  /**
   * Boylam/enlemdeki bölgeyi bul (çokgen içinde); yoksa en yakın bölge merkezi (esnekDer derece içinde); yoksa -1.
   */
  bul(boylam: number, enlem: number, esnekDer: number): number {
    for (const b of this.bolgeler) {
      const k = b.kutu;
      if (boylam < k[0] || boylam > k[2] || enlem < k[1] || enlem > k[3]) continue;
      if (noktaIcinde(b.poligonlar, boylam, enlem)) return b.indeks;
    }
    let en = -1;
    let enD = esnekDer;
    for (const b of this.bolgeler) {
      const d = acisalMesafeDer(boylam, enlem, b.merkez[0], b.merkez[1]);
      if (d < enD) {
        enD = d;
        en = b.indeks;
      }
    }
    return en;
  }
}


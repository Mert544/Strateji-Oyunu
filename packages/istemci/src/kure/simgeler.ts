/**
 * Simgeler: liman, dar geçit, kapsam nedeni, savaş hedefi ve seçim halkası. Hepsi tek örneklenmiş (instanced)
 * çizimde, ekrana dönük sabit piksel boyutlu SDF gliflerdir.
 *   tür: 0 liman, 1 dar geçit, 2 kapasite, 3 girdi eksik, 4 mesafe, 5 erişim yok, 6 savaş hedefi, 7 seçim halkası,
 *        8 kuraklık, 9 don, 10 sel, 11 kış fırtınası, 12 bilinmeyen olay (olay rozetleri),
 *        13 olay uyarı halkası (kesikli, yayılan nabız), 14 etkin olay halkası (dolu, yayılan nabız), 15 yayılım halkası,
 *        16 uyarı halkası (kesikli, sabit boyut)
 * İklim olayları da aynı tek çizim çağrısındadır (ek çizim çağrısı yok).
 */
import { BufferAttribute, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, ShaderMaterial, Uniform } from "three";
import type { Object3D } from "three";
import { SIMGE_FS, SIMGE_VS } from "./shaderlar";
import type { Ortak } from "./ortak";
import { v3 } from "./ortak";
import type { SahnePaleti } from "./tema";
import { birim, carpim, topla, olcekle } from "./matematik";
import type { Vek3 } from "./matematik";
import type { BolgeGeo } from "../veri/harita-birlestir";
import type { SavasKaresi } from "../veri/kare-tipleri";
import type { BolgeRenkTamponu, RGB } from "../veri/renkler";

const KAPASITE = 512;
const SIMGE_YARICAP = 1.014;

/** Küre üzerinde gösterilecek bir iklim olayı (merkez rozeti + nabız halkası + yayılım halkaları). */
export interface OlayGirdisi {
  merkez: number;
  /** Rozet glif kodu (8..12). */
  glif: number;
  aktif: boolean;
  renk: RGB;
  /** Etki bölgeleri: [bölge, şiddet payı 0..1]; merkez dahil olabilir (merkez ayrıca çizilir). */
  etki: ReadonlyArray<[number, number]>;
  /** Etki gücü (0..1): aktif olayda sönümle azalır. */
  guc: number;
}

export interface SimgeGirdisi {
  renkler: BolgeRenkTamponu;
  savaslar: readonly SavasKaresi[];
  olaylar?: readonly OlayGirdisi[];
  secili: number;
  savasRengi: RGB;
  secimRengi: RGB;
}

export class SimgeKatmani {
  readonly nesneler: Object3D[] = [];
  private malz: ShaderMaterial;
  private geo: InstancedBufferGeometry;
  private konum: InstancedBufferAttribute;
  private tur: InstancedBufferAttribute;
  private renk: InstancedBufferAttribute;
  private boyut: InstancedBufferAttribute;
  private alfa: InstancedBufferAttribute;
  private statikSayi = 0;
  private merkezler: Vek3[];

  constructor(
    private bolgeler: readonly BolgeGeo[],
    merkezler: readonly Vek3[],
    etiketler: readonly (readonly string[])[],
    ortak: Ortak,
  ) {
    this.merkezler = [...merkezler];
    const g = new InstancedBufferGeometry();
    g.setAttribute("kose", new BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
    g.setAttribute("position", new BufferAttribute(new Float32Array(12), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const mk = (boy: number): InstancedBufferAttribute => {
      const a = new InstancedBufferAttribute(new Float32Array(KAPASITE * boy), boy);
      a.setUsage(DynamicDrawUsage);
      return a;
    };
    this.konum = mk(3);
    this.tur = mk(1);
    this.renk = mk(3);
    this.boyut = mk(1);
    this.alfa = mk(1);
    g.setAttribute("aKonum", this.konum);
    g.setAttribute("aTur", this.tur);
    g.setAttribute("aRenk", this.renk);
    g.setAttribute("aBoyut", this.boyut);
    g.setAttribute("aAlfa", this.alfa);
    g.instanceCount = 0;
    this.geo = g;
    this.malz = new ShaderMaterial({
      vertexShader: SIMGE_VS,
      fragmentShader: SIMGE_FS,
      uniforms: {
        uEkran: ortak.uEkran as Uniform,
        uZaman: ortak.uZaman as Uniform,
        uYakin: ortak.uYakin as Uniform,
        uPanel: new Uniform(v3([1, 1, 1])),
        uMurekkep: new Uniform(v3([0, 0, 0])),
      },
      transparent: true,
      depthWrite: false,
    });
    const m = new Mesh(g, this.malz);
    m.frustumCulled = false;
    m.renderOrder = 20;
    this.nesneler.push(m);

    // Statik: liman ve dar geçit simgeleri (etiketlerden)
    let n = 0;
    bolgeler.forEach((_b, i) => {
      const et = etiketler[i] ?? [];
      const c = this.merkezler[i] as Vek3;
      const dogu = birim(carpim([0, 1, 0], c));
      const liste: number[] = [];
      if (et.includes("liman")) liste.push(0);
      if (et.includes("dar_gecit")) liste.push(1);
      liste.forEach((t, j) => {
        const kayma = (j - (liste.length - 1) / 2) * 0.011;
        const p = birim(topla(c, dogu, kayma));
        this.yaz(n++, olcekle(p, SIMGE_YARICAP), t, [1, 1, 1], 17, 1);
      });
    });
    this.statikSayi = n;
    this.geo.instanceCount = n;
  }

  private yaz(i: number, p: Vek3, tur: number, renk: RGB, boyut: number, alfa: number): void {
    (this.konum.array as Float32Array).set(p, 3 * i);
    (this.tur.array as Float32Array)[i] = tur;
    (this.renk.array as Float32Array).set(renk, 3 * i);
    (this.boyut.array as Float32Array)[i] = boyut;
    (this.alfa.array as Float32Array)[i] = alfa;
  }

  /** Dinamik simgeleri (neden glifleri, savaş hedefleri, seçim halkası) yeniden yaz. */
  guncelle(g: SimgeGirdisi): void {
    let n = this.statikSayi;
    const nb = this.bolgeler.length;
    for (let i = 0; i < nb && n < KAPASITE - 40; i++) {
      const gl = g.renkler.glif[i] as number;
      if (gl >= 2) this.yaz(n++, olcekle(this.merkezler[i] as Vek3, SIMGE_YARICAP + 0.001), gl, [1, 1, 1], 21, 1);
    }
    for (const s of g.savaslar) {
      if (s.evre === "bitti" || n >= KAPASITE - 20) continue;
      const c = this.merkezler[s.hedefBolge];
      if (c) this.yaz(n++, olcekle(c, SIMGE_YARICAP + 0.002), 6, g.savasRengi, 27, 1);
    }
    for (const o of g.olaylar ?? []) {
      const c = this.merkezler[o.merkez];
      if (!c || n >= KAPASITE - 24) continue;
      // sabit halka (nabzın sönük anında da olay görünsün) + yayılan nabız halkası
      this.yaz(n++, olcekle(c, SIMGE_YARICAP + 0.001), o.aktif ? 15 : 16, o.renk, 54, 1);
      this.yaz(n++, olcekle(c, SIMGE_YARICAP + 0.0015), o.aktif ? 14 : 13, o.renk, o.aktif ? 120 : 104, 0.95);
      for (const [b, pay] of o.etki) {
        const cb = this.merkezler[b];
        if (!cb || b === o.merkez || n >= KAPASITE - 22) continue;
        this.yaz(n++, olcekle(cb, SIMGE_YARICAP + 0.001), 15, o.renk, 28 + 22 * pay, (o.aktif ? 0.4 + 0.6 * o.guc : 0.7) * (0.5 + 0.5 * pay));
      }
      this.yaz(n++, olcekle(c, SIMGE_YARICAP + 0.003), o.glif, o.renk, 34, o.aktif ? 1 : 0.9);
    }
    if (g.secili >= 0 && this.merkezler[g.secili]) {
      this.yaz(n++, olcekle(this.merkezler[g.secili] as Vek3, SIMGE_YARICAP - 0.002), 7, g.secimRengi, 42, 1);
    }
    this.geo.instanceCount = n;
    for (const a of [this.konum, this.tur, this.renk, this.boyut, this.alfa]) a.needsUpdate = true;
  }

  temaUygula(p: SahnePaleti): void {
    (this.malz.uniforms["uPanel"] as Uniform).value = v3(p.panel);
    (this.malz.uniforms["uMurekkep"] as Uniform).value = v3(p.murekkep);
  }
}

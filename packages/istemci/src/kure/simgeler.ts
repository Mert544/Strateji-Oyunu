/**
 * Simgeler: liman, dar geçit, durum rozetleri, iklim olayları ve seçim halkası. Hepsi tek örneklenmiş (instanced)
 * çizimde, ekrana dönük sabit piksel boyutlu SDF gliflerdir (rozetler ve olaylar ek çizim çağrısı getirmez).
 *   tür: 0 liman, 1 dar geçit, 6 savaş rozeti (⚔), 7 seçim halkası,
 *        8 kuraklık, 9 don, 10 sel, 11 kış fırtınası, 12 bilinmeyen olay (olay simgeleri),
 *        15 etkin olay / yayılım halkası (dolu), 16 olay uyarı halkası (kesikli),
 *        17 ▲ eksik girdi, 18 ◯ boşta, 19 ✓ inşaat bitti (durum rozetleri),
 *        20 oyuncunun mülk işareti (mülk kipi: çini nokta + ince halka); 22..29 yakın işaretlerin kümesi (tür - 20 = ilçe sayısı, en çok 9)
 * Sakin görsel: sürekli animasyon yoktur. Rozet yalnız gelişinde tek kısa nabız atar (aNabiz = başlangıç zamanı;
 * hareket azaltma tercihinde hiç atmaz).
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
import type { RGB } from "../veri/renkler";
import type { RozetTuru } from "../veri/rozet";
import type { MulkIsareti } from "./mulk-kipi";

const KAPASITE = 512;
const SIMGE_YARICAP = 1.014;
/** Mülk işareti: bölge dolgusunun (1,0045) ve çizgilerinin (1,0052) hemen üstü; yüksekte durup yakın planda kaymasın. */
const MULK_YARICAP = 1.0058;

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

/** Rozet türü -> glif kodu. */
export const ROZET_GLIF: Record<RozetTuru, number> = { savas: 6, eksik: 17, bosta: 18, bitti: 19 };

export interface SimgeGirdisi {
  /** Bölge başına en çok bir rozet (null: yok). */
  rozetler: ReadonlyArray<RozetTuru | null>;
  /** Bölge başına rozetin geliş nabzının başlangıcı (uZaman saniyesi; nabız yoksa çok küçük). */
  nabiz: Float32Array;
  rozetRenk: Record<RozetTuru, RGB>;
  olaylar?: readonly OlayGirdisi[];
  secili: number;
  secimRengi: RGB;
  /** Mülk kipi: oyuncunun ilçe/arsa noktaları (yüzey birim vektörü) ve işaret rengi (`sen`). */
  mulkIsaretleri?: readonly MulkIsareti[];
  mulkRengi?: RGB;
  /** Mülk kipi: liman ve dar geçit gibi statik glifler gizlenir (küre sakin kalır). */
  statikGizli?: boolean;
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
  private nabiz: InstancedBufferAttribute;
  private statikSayi = 0;
  private statikler: Array<{ p: Vek3; tur: number }> = [];
  private merkezler: Vek3[];
  /** Bölge başına rozet konumu (merkez, yüzeyin hemen üstü; ekranda gölgelendiricide 16 px yukarı kaydırılır). */
  private rozetKonumu: Vek3[];

  constructor(
    private bolgeler: readonly BolgeGeo[],
    merkezler: readonly Vek3[],
    etiketler: readonly (readonly string[])[],
    ortak: Ortak,
  ) {
    this.merkezler = [...merkezler];
    this.rozetKonumu = this.merkezler.map((c) => olcekle(c, SIMGE_YARICAP + 0.002));
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
    this.nabiz = mk(1);
    g.setAttribute("aKonum", this.konum);
    g.setAttribute("aTur", this.tur);
    g.setAttribute("aRenk", this.renk);
    g.setAttribute("aBoyut", this.boyut);
    g.setAttribute("aAlfa", this.alfa);
    g.setAttribute("aNabiz", this.nabiz);
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
        this.statikler.push({ p: olcekle(p, SIMGE_YARICAP), tur: t });
      });
    });
    this.statikYaz();
    this.geo.instanceCount = this.statikSayi;
  }

  private yaz(i: number, p: Vek3, tur: number, renk: RGB, boyut: number, alfa: number, nabiz = -1e6): void {
    (this.konum.array as Float32Array).set(p, 3 * i);
    (this.tur.array as Float32Array)[i] = tur;
    (this.renk.array as Float32Array).set(renk, 3 * i);
    (this.boyut.array as Float32Array)[i] = boyut;
    (this.alfa.array as Float32Array)[i] = alfa;
    (this.nabiz.array as Float32Array)[i] = nabiz;
  }

  /** Statik simgeleri başa yazar (gizliyse hiç): dinamikler hemen ardından gelir. */
  private statikYaz(gizli = false): void {
    let n = 0;
    if (!gizli) for (const s of this.statikler) this.yaz(n++, s.p, s.tur, [1, 1, 1], 17, 1);
    this.statikSayi = n;
  }

  /** Dinamik simgeleri (durum rozetleri, iklim olayları, seçim halkası) yeniden yaz. */
  guncelle(g: SimgeGirdisi): void {
    this.statikYaz(g.statikGizli === true);
    let n = this.statikSayi;
    const nb = this.bolgeler.length;
    for (let i = 0; i < nb && n < KAPASITE - 40; i++) {
      const r = g.rozetler[i];
      if (!r) continue;
      // Rozet ekranda merkezin 16 px üstünde (gölgelendirici): ad etiketi altta, liman/geçit simgesi merkezde kalır.
      const p = this.rozetKonumu[i] as Vek3;
      this.yaz(n++, p, ROZET_GLIF[r], g.rozetRenk[r], r === "savas" ? 24 : 20, 1, g.nabiz[i] ?? -1e6);
    }
    for (const o of g.olaylar ?? []) {
      const c = this.merkezler[o.merkez];
      if (!c || n >= KAPASITE - 24) continue;
      // Sabit halka (etkin: dolu, uyarı: kesikli) ve etki alanı halkaları; yayılan nabız yok.
      this.yaz(n++, olcekle(c, SIMGE_YARICAP + 0.001), o.aktif ? 15 : 16, o.renk, 54, 0.9);
      for (const [b, pay] of o.etki) {
        const cb = this.merkezler[b];
        if (!cb || b === o.merkez || n >= KAPASITE - 22) continue;
        this.yaz(n++, olcekle(cb, SIMGE_YARICAP + 0.001), 15, o.renk, 28 + 22 * pay, (o.aktif ? 0.3 + 0.5 * o.guc : 0.55) * (0.5 + 0.5 * pay));
      }
      this.yaz(n++, olcekle(c, SIMGE_YARICAP + 0.003), o.glif, o.renk, 30, o.aktif ? 1 : 0.9);
    }
    for (const m of g.mulkIsaretleri ?? []) {
      if (n >= KAPASITE - 4) break;
      this.yaz(n++, olcekle(m.p, MULK_YARICAP), m.sayi > 1 ? 20 + Math.min(m.sayi, 9) : 20, g.mulkRengi ?? [0, 0.47, 0.51], m.sayi > 1 ? 34 : 30, 1);
    }
    if (g.secili >= 0 && this.merkezler[g.secili]) {
      this.yaz(n++, olcekle(this.merkezler[g.secili] as Vek3, SIMGE_YARICAP - 0.002), 7, g.secimRengi, 42, 1);
    }
    this.geo.instanceCount = n;
    for (const a of [this.konum, this.tur, this.renk, this.boyut, this.alfa, this.nabiz]) a.needsUpdate = true;
  }

  temaUygula(p: SahnePaleti): void {
    (this.malz.uniforms["uPanel"] as Uniform).value = v3(p.panel);
    (this.malz.uniforms["uMurekkep"] as Uniform).value = v3(p.murekkep);
  }
}

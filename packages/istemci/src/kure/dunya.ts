/**
 * Dünya katmanı: okyanus küresi, atmosfer, yıldızlar, kıtalar (birleştirilmiş üçgen ağı) ve ülke sınırı/kıyı çizgileri.
 * Toplam 5 çizim çağrısı (okyanus, atmosfer, yıldız, kara, çizgiler). Kara tek arabellek, çizgiler tek arabellek.
 */
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  FrontSide,
  LineSegments,
  Mesh,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Uniform,
} from "three";
import type { Object3D } from "three";
import { araziTonu, araziYuksekligi, kutupOrani } from "./arazi";
import { ATMOSFER_FS, ATMOSFER_VS, CIZGI_FS, CIZGI_VS, KARA_FS, KARA_VS, OKYANUS_FS, OKYANUS_VS, YILDIZ_FS, YILDIZ_VS } from "./shaderlar";
import { cizgiParcalari, kureyeYerlestir, poligonlariUcgenle } from "./ucgenle";
import type { Ortak } from "./ortak";
import { v3 } from "./ortak";
import type { SahnePaleti } from "./tema";
import type { DunyaKarasi } from "../veri/cografya";

export const KARA_YARICAPI = 1.0;
export const OKYANUS_YARICAPI = 0.9975;
export const CIZGI_YARICAPI = 1.0018;

export interface DunyaIstatistik {
  karaUcgen: number;
  karaKose: number;
  cizgiParca: number;
}

export class DunyaKatmani {
  readonly nesneler: Object3D[] = [];
  readonly istatistik: DunyaIstatistik;
  private okyanus: ShaderMaterial;
  private kara: ShaderMaterial;
  private cizgi: ShaderMaterial;
  private atmosfer: ShaderMaterial;
  private yildiz: ShaderMaterial;

  constructor(ulkeler: DunyaKarasi, ortak: Ortak) {
    const isik = (): Record<string, Uniform> => ({
      uGunes: new Uniform(ortak.uGunes.value) as Uniform,
      uGece: new Uniform(0.3),
      uAksam: new Uniform(1),
      uKenarIsik: new Uniform(v3([0.5, 0.7, 1])),
    });

    // Yıldızlar (önce çizilir; derinliğe yazmaz)
    {
      const n = 1600;
      const konum = new Float32Array(n * 3);
      const parlak = new Float32Array(n);
      let s = 12345;
      const r = (): number => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < n; i++) {
        const z = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.sqrt(1 - z * z);
        konum[3 * i] = q * Math.cos(a);
        konum[3 * i + 1] = z;
        konum[3 * i + 2] = q * Math.sin(a);
        parlak[i] = Math.pow(r(), 3);
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(konum, 3));
      g.setAttribute("aParlak", new BufferAttribute(parlak, 1));
      this.yildiz = new ShaderMaterial({
        vertexShader: YILDIZ_VS,
        fragmentShader: YILDIZ_FS,
        uniforms: { uYildizAlfa: new Uniform(1), uPikselOran: ortak.uPikselOran as Uniform },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const m = new Points(g, this.yildiz);
      m.frustumCulled = false;
      m.renderOrder = -10;
      this.nesneler.push(m);
    }

    // Okyanus
    this.okyanus = new ShaderMaterial({
      vertexShader: OKYANUS_VS,
      fragmentShader: OKYANUS_FS,
      uniforms: { ...isik(), uOkyanus: new Uniform(v3([0, 0, 1])), uOkyanusDerin: new Uniform(v3([0, 0, 0.5])) },
    });
    // Opak katmanlar önden arkaya çizilir (bölge -> kara -> okyanus): erken derinlik reddi, aşırı çizim maliyetini düşürür.
    const okyanusMesh = new Mesh(new SphereGeometry(OKYANUS_YARICAPI, 112, 72), this.okyanus);
    okyanusMesh.renderOrder = 3;
    this.nesneler.push(okyanusMesh);

    // Kara: birleştirilmiş üçgen ağı
    const ag = poligonlariUcgenle(ulkeler.poligonlar, 2.0);
    const konum = kureyeYerlestir(ag, KARA_YARICAPI, araziYuksekligi);
    const n = ag.ll.length / 2;
    const ton = new Float32Array(n);
    const kutup = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const b = ag.ll[2 * i] as number, e = ag.ll[2 * i + 1] as number;
      ton[i] = araziTonu(b, e);
      kutup[i] = kutupOrani(e);
    }
    const kg = new BufferGeometry();
    kg.setAttribute("position", new BufferAttribute(konum, 3));
    kg.setAttribute("aTon", new BufferAttribute(ton, 1));
    kg.setAttribute("aKutup", new BufferAttribute(kutup, 1));
    kg.setIndex(new BufferAttribute(n > 65535 ? new Uint32Array(ag.indeks) : new Uint16Array(ag.indeks), 1));
    this.kara = new ShaderMaterial({
      vertexShader: KARA_VS,
      fragmentShader: KARA_FS,
      uniforms: { ...isik(), uKara: new Uniform(v3([0.8, 0.8, 0.7])), uKara2: new Uniform(v3([0.7, 0.8, 0.6])), uKutup: new Uniform(v3([1, 1, 1])) },
      side: FrontSide,
    });
    const karaMesh = new Mesh(kg, this.kara);
    karaMesh.frustumCulled = false;
    karaMesh.renderOrder = 2;
    this.nesneler.push(karaMesh);

    // Çizgiler: ülke sınırları (aKalin=0) + kıyılar (aKalin=1)
    const sinir = cizgiParcalari(ulkeler.sinirlar, 2.0, CIZGI_YARICAPI);
    const kiyi = cizgiParcalari(ulkeler.kiyilar, 2.0, CIZGI_YARICAPI + 0.0004);
    const cp = new Float32Array(sinir.length + kiyi.length);
    cp.set(sinir, 0);
    cp.set(kiyi, sinir.length);
    const kalin = new Float32Array(cp.length / 3);
    kalin.fill(1, sinir.length / 3);
    const cg = new BufferGeometry();
    cg.setAttribute("position", new BufferAttribute(cp, 3));
    cg.setAttribute("aKalin", new BufferAttribute(kalin, 1));
    this.cizgi = new ShaderMaterial({
      vertexShader: CIZGI_VS,
      fragmentShader: CIZGI_FS,
      uniforms: { ...isik(), uRenkA: new Uniform([0, 0, 0, 0.3]), uRenkB: new Uniform([0, 0, 0, 0.6]) },
      transparent: true,
      depthWrite: false,
    });
    const cizgiMesh = new LineSegments(cg, this.cizgi);
    cizgiMesh.frustumCulled = false;
    this.nesneler.push(cizgiMesh);

    // Atmosfer
    this.atmosfer = new ShaderMaterial({
      vertexShader: ATMOSFER_VS,
      fragmentShader: ATMOSFER_FS,
      uniforms: { uGunes: new Uniform(ortak.uGunes.value), uAtmosfer: new Uniform(v3([0.4, 0.6, 1])), uAtmosferGuc: new Uniform(0.6) },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: BackSide,
    });
    const atm = new Mesh(new SphereGeometry(1.085, 64, 48), this.atmosfer);
    atm.renderOrder = 50;
    // BackSide: dış yüzeyin arka yüzü (gezegenin arkasındaki kabuk); derinlik testi gezegenin önünü kapatır.
    this.nesneler.push(atm);

    this.istatistik = { karaUcgen: ag.indeks.length / 3, karaKose: n, cizgiParca: cp.length / 6 };
  }

  temaUygula(p: SahnePaleti): void {
    const mats = [this.okyanus, this.kara, this.cizgi];
    for (const m of mats) {
      (m.uniforms["uGece"] as Uniform).value = p.gece;
      (m.uniforms["uAksam"] as Uniform).value = p.aksam;
      (m.uniforms["uKenarIsik"] as Uniform).value = v3(p.kenarIsik);
    }
    (this.okyanus.uniforms["uOkyanus"] as Uniform).value = v3(p.okyanus);
    (this.okyanus.uniforms["uOkyanusDerin"] as Uniform).value = v3(p.okyanusDerin);
    (this.kara.uniforms["uKara"] as Uniform).value = v3(p.kara);
    (this.kara.uniforms["uKara2"] as Uniform).value = v3(p.kara2);
    (this.kara.uniforms["uKutup"] as Uniform).value = v3(p.kutup);
    (this.cizgi.uniforms["uRenkA"] as Uniform).value = p.sinir;
    (this.cizgi.uniforms["uRenkB"] as Uniform).value = p.kiyi;
    (this.atmosfer.uniforms["uAtmosfer"] as Uniform).value = v3(p.atmosfer);
    (this.atmosfer.uniforms["uAtmosferGuc"] as Uniform).value = p.atmosferGuc;
    (this.yildiz.uniforms["uYildizAlfa"] as Uniform).value = p.yildizAlfa;
  }
}

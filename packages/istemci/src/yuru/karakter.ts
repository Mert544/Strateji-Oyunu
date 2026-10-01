/**
 * Karakterler: pişirilmiş Quaternius mankeni (CC0; varlik/karakter.ykr) örneklenmiş (instanced) deri giydirmeyle
 * çizilir. Kemik matrisleri bir animasyon dokusundadır; her örnek konumunu, yönünü, kare indekslerini ve rengini
 * taşır. Böylece oyuncunun karakteri ve ileride diğer oyuncuların karakterleri **tek çizim çağrısında** çizilir.
 * Dosya yüklenemezse prosedürel kapsül yedeği (aynı yol, tek kemik, basit yalpalama kareleri).
 */
import { BufferAttribute, DataTexture, FloatType, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, NearestFilter, RGBAFormat } from "three";
import type { ShaderMaterial } from "three";
import { animasyonDokusu, karakterCoz, kareIndeksi } from "./karakter-veri";
import type { KarakterAnimasyonu, KarakterVerisi } from "./karakter-veri";
import { kalabalikMalzemesi } from "./malzeme";
import type { SisAyari } from "./malzeme";
import type { Rgb, YuruPaleti } from "./palet";

export interface KarakterDurumu {
  /** Yerel çizim çerçevesi (kayan orijine göre). */
  x: number;
  y: number;
  z: number;
  yon: number;
  anim: string;
  /** Animasyon saati (s). */
  zaman: number;
}

export class Kalabalik {
  readonly mesh: Mesh;
  readonly veri: KarakterVerisi;
  private geo: InstancedBufferGeometry;
  private malz: ShaderMaterial;
  private kapasite = 0;
  private sayi = 0;
  private ornek!: Float32Array;
  private kare!: Float32Array;
  private renk!: Float32Array;

  private constructor(veri: KarakterVerisi, p: YuruPaleti, sis: SisAyari) {
    this.veri = veri;
    const g = new InstancedBufferGeometry();
    g.setAttribute("position", new BufferAttribute(veri.konum, 3));
    g.setAttribute("normal", new BufferAttribute(veri.normal, 3));
    g.setAttribute("aMalzeme", new BufferAttribute(veri.malzeme, 1));
    g.setAttribute("aKemik", new BufferAttribute(veri.kemikIndeks, 4));
    g.setAttribute("aAgirlik", new BufferAttribute(veri.agirlik, 4, true));
    g.setIndex(new BufferAttribute(veri.indeks, 1));
    this.geo = g;
    const d = animasyonDokusu(veri);
    const doku = new DataTexture(d.veri, d.genislik, d.yukseklik, RGBAFormat, FloatType);
    doku.minFilter = NearestFilter;
    doku.magFilter = NearestFilter;
    doku.needsUpdate = true;
    this.malz = kalabalikMalzemesi(doku, p.govde, p, sis);
    this.mesh = new Mesh(g, this.malz);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.buyut(4);
  }

  /** Karakter dosyasını yükler; okunamazsa prosedürel yedek. `kaynak` raporlama içindir. */
  static async yukle(url: string, p: YuruPaleti, sis: SisAyari): Promise<{ kalabalik: Kalabalik; kaynak: string }> {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      return { kalabalik: new Kalabalik(karakterCoz(await r.arrayBuffer()), p, sis), kaynak: "Quaternius UAL (CC0)" };
    } catch (e) {
      console.warn("Karakter yüklenemedi, prosedürel yedek:", e);
      return { kalabalik: new Kalabalik(kapsulVerisi(), p, sis), kaynak: "prosedürel" };
    }
  }

  private buyut(n: number): void {
    if (n <= this.kapasite) return;
    const k = Math.max(n, this.kapasite * 2);
    const eski = [this.ornek, this.kare, this.renk];
    this.ornek = new Float32Array(k * 4);
    this.kare = new Float32Array(k * 3);
    this.renk = new Float32Array(k * 3);
    if (eski[0]) {
      this.ornek.set(eski[0]);
      this.kare.set(eski[1]!);
      this.renk.set(eski[2]!);
    }
    this.geo.setAttribute("aOrnek", new InstancedBufferAttribute(this.ornek, 4));
    this.geo.setAttribute("aKare", new InstancedBufferAttribute(this.kare, 3));
    this.geo.setAttribute("aRenk", new InstancedBufferAttribute(this.renk, 3));
    this.kapasite = k;
  }

  /** Yeni karakter örneği; indeksini döndürür. */
  ekle(renk: Rgb): number {
    this.buyut(this.sayi + 1);
    const i = this.sayi++;
    this.geo.instanceCount = this.sayi;
    this.renkAyarla(i, renk);
    this.guncelle(i, { x: 0, y: 0, z: 0, yon: 0, anim: "dur", zaman: 0 });
    return i;
  }

  get ornekSayisi(): number {
    return this.sayi;
  }

  animasyon(ad: string): KarakterAnimasyonu {
    return this.veri.animasyonlar.find((a) => a.ad === ad) ?? this.veri.animasyonlar[0]!;
  }

  guncelle(i: number, d: KarakterDurumu): void {
    this.ornek.set([d.x, d.y, d.z, d.yon], i * 4);
    this.kare.set(kareIndeksi(this.animasyon(d.anim), d.zaman), i * 3);
    this.geo.getAttribute("aOrnek").needsUpdate = true;
    this.geo.getAttribute("aKare").needsUpdate = true;
  }

  renkAyarla(i: number, renk: Rgb): void {
    this.renk.set(renk, i * 3);
    this.geo.getAttribute("aRenk").needsUpdate = true;
  }

  temaAyarla(p: YuruPaleti): void {
    this.malz.uniforms["uGovde"]!.value = [...p.govde];
    this.malz.uniforms["uSis"]!.value = [...p.gok];
  }

  get ucgen(): number {
    return (this.veri.indeks.length / 3) * this.sayi;
  }
}

/** Prosedürel yedek: kapsül gövde + küre baş, tek kemik; 8 karelik hafif yalpalama "yürüme" animasyonu. */
export function kapsulVerisi(): KarakterVerisi {
  const konum: number[] = [];
  const normal: number[] = [];
  const malzeme: number[] = [];
  const indeks: number[] = [];
  const dilim = 12;
  const govde: [number, number, number][] = [
    [0.0, 0.0, 1],
    [0.16, 0.05, 1],
    [0.2, 0.3, 0],
    [0.24, 0.8, 0],
    [0.26, 1.2, 0],
    [0.2, 1.4, 0],
    [0.07, 1.48, 1],
  ];
  const bas: [number, number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const t = (i / 6) * Math.PI;
    bas.push([Math.sin(t) * 0.14, 1.64 - Math.cos(t) * 0.14, 0]);
  }
  for (const profil of [govde, bas]) {
    const b0 = konum.length / 3;
    for (let p = 0; p < profil.length; p++) {
      const [r, y, m] = profil[p]!;
      const onceki = profil[Math.max(0, p - 1)]!;
      const sonraki = profil[Math.min(profil.length - 1, p + 1)]!;
      const dy = sonraki[1] - onceki[1];
      const dr = sonraki[0] - onceki[0];
      const L = Math.hypot(dy, dr) || 1;
      for (let d = 0; d <= dilim; d++) {
        const a = (d / dilim) * Math.PI * 2;
        konum.push(r * Math.cos(a), y, r * Math.sin(a));
        normal.push((dy / L) * Math.cos(a), -dr / L, (dy / L) * Math.sin(a));
        malzeme.push(m);
      }
    }
    for (let p = 0; p + 1 < profil.length; p++)
      for (let d = 0; d < dilim; d++) {
        const a = b0 + p * (dilim + 1) + d;
        const b = a + dilim + 1;
        indeks.push(a, a + 1, b, a + 1, b + 1, b);
      }
  }
  const n = konum.length / 3;
  const agirlik = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) agirlik[i * 4] = 255;
  // Kareler: 0 dur (birim), 1–8 yürüme (z ekseni etrafında ±0,08 rad yalpalama + hafif sıçrama); niceli değil, ölçek 1.
  const kareler: number[] = [];
  for (let f = 0; f < 9; f++) {
    const a = f === 0 ? 0 : Math.sin(((f - 1) / 8) * Math.PI * 2) * 0.08;
    const c = Math.cos(a);
    const s = Math.sin(a);
    kareler.push(c, -s, 0, 0, s, c, 0, f === 0 ? 0 : Math.abs(Math.sin(((f - 1) / 8) * Math.PI * 2)) * 0.05, 0, 0, 1, 0);
  }
  const kare = Int16Array.from(kareler.map((x) => Math.round(x * 16000)));
  // Öteleme sütunu ayrı ölçekli: 16000 yerine 8000 ile nicele
  for (let f = 0; f < 9; f++) for (const i of [3, 7, 11]) kare[f * 12 + i] = Math.round(kareler[f * 12 + i]! * 8000);
  const yuru: KarakterAnimasyonu = { ad: "yuru", kare: 8, sure: 0.8, hiz: 1.2, bas: 1 };
  return {
    kose: n,
    kemik: 1,
    konum: Float32Array.from(konum),
    normal: Float32Array.from(normal),
    malzeme: Uint8Array.from(malzeme),
    kemikIndeks: new Uint8Array(n * 4),
    agirlik,
    indeks: Uint16Array.from(indeks),
    kareler: kare,
    donOlcek: 1 / 16000,
    otelemeOlcek: 1 / 8000,
    animasyonlar: [{ ad: "dur", kare: 1, sure: 0, hiz: 0, bas: 0 }, yuru, { ...yuru, ad: "kos", hiz: 3 }, { ...yuru, ad: "depar", hiz: 4 }, { ad: "zipla", kare: 1, sure: 0, hiz: 0, bas: 0 }],
  };
}

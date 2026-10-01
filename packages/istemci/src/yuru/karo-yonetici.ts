/**
 * Karo penceresi yöneticisi: karakterin çevresindeki 3×3 z15 karosunu işçiden ister, ağları kurar, çarpışma
 * dünyasına ekler; pencereden çıkanları gizler (küçük önbellek) ve kayan orijin değişince konumları günceller.
 * Karo başına 3 çizim çağrısı (yer + bina + kenar çizgileri); kamera dışında kalan karolar kesilir (frustum culling).
 */
import { BufferAttribute, BufferGeometry, LineSegments, Mesh } from "three";
import type { Scene, ShaderMaterial } from "three";
import { EngelDunyasi, karoEngeli } from "./carpisma";
import type { GeometriParcasi } from "./geometri-yazici";
import type { KaroGeometrisi } from "./karo-geometri";
import type { IsciyeKaro, KarodanMesaj } from "./karo.worker";
import { karoKenari, karoKokeni, KARO_Z, karoPenceresi } from "./koordinat";
import type { Cerceve, Orijin } from "./koordinat";

interface Karo {
  anahtar: string;
  x: number;
  y: number;
  kok: [number, number];
  yer: Mesh | null;
  bina: Mesh | null;
  cizgi: LineSegments | null;
  geo: KaroGeometrisi | null;
  engel: ReturnType<typeof karoEngeli> | null;
  durum: "bekliyor" | "hazir" | "hata";
  bayt: number;
  ms: number;
  son: number;
}

const ONBELLEK = 25;

function geometri(p: GeometriParcasi): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(p.konum, 3));
  g.setAttribute("aSinif", new BufferAttribute(p.sinif, 1));
  g.setAttribute("aGolge", new BufferAttribute(p.golge, 1, true));
  if (p.cephe && p.ust) {
    g.setAttribute("aCephe", new BufferAttribute(p.cephe, 4));
    g.setAttribute("aUst", new BufferAttribute(p.ust, 1));
  }
  g.setIndex(new BufferAttribute(p.indeks, 1));
  g.computeBoundingSphere();
  return g;
}

export interface KaroIstatistigi {
  hazir: number;
  bekleyen: number;
  ucgen: number;
  bayt: number;
  ortMs: number;
  enCokMs: number;
}

export class KaroYonetici {
  private karolar = new Map<string, Karo>();
  private no = 0;
  private bekleyen = new Map<number, string>();
  private pencere = new Set<string>();
  private orijin: Orijin = { x: 0, z: 0 };
  private saat = 0;
  readonly engel = new EngelDunyasi();

  constructor(
    private sahne: Scene,
    private isci: Worker,
    private cerceve: Cerceve,
    private malz: { yer: ShaderMaterial; bina: ShaderMaterial; cizgi: ShaderMaterial },
    private degisti: () => void,
  ) {
    isci.addEventListener("message", (e: MessageEvent<KarodanMesaj>) => this.al(e.data));
  }

  static isciKur(isci: Worker, url: string): void {
    isci.postMessage({ tur: "kur", url } satisfies IsciyeKaro);
  }

  /** Merkez karoya göre pencereyi günceller; eksik karoları (yakın önce) ister. */
  pencereAyarla(merkez: { x: number; y: number }): void {
    const yeni = karoPenceresi(merkez, 1);
    this.pencere = new Set(yeni.map((k) => `${k.x}/${k.y}`));
    this.saat++;
    for (const k of yeni) {
      const a = `${k.x}/${k.y}`;
      let karo = this.karolar.get(a);
      if (!karo) {
        karo = { anahtar: a, x: k.x, y: k.y, kok: karoKokeni(this.cerceve, k.x, k.y), yer: null, bina: null, cizgi: null, geo: null, engel: null, durum: "bekliyor", bayt: 0, ms: 0, son: this.saat };
        this.karolar.set(a, karo);
        const no = ++this.no;
        this.bekleyen.set(no, a);
        this.isci.postMessage({ tur: "karo", no, z: KARO_Z, x: k.x, y: k.y, olcek: karoKenari(this.cerceve) / 4096 } satisfies IsciyeKaro);
      }
      karo.son = this.saat;
    }
    for (const karo of this.karolar.values()) this.gorunurluk(karo);
    // Önbellek: en uzun süre pencere dışında kalanları at
    if (this.karolar.size > ONBELLEK) {
      const disarida = [...this.karolar.values()].filter((k) => !this.pencere.has(k.anahtar) && k.durum !== "bekliyor").sort((a, b) => a.son - b.son);
      for (const k of disarida.slice(0, this.karolar.size - ONBELLEK)) this.at(k);
    }
  }

  private gorunurluk(k: Karo): void {
    const g = this.pencere.has(k.anahtar);
    for (const m of [k.yer, k.bina, k.cizgi]) if (m) m.visible = g;
    // Çarpışma yalnız penceredeki karolarda (karakter pencerenin ortasında)
    if (g && k.geo) {
      k.engel ??= karoEngeli(k.geo.iz, k.kok[0], k.kok[1], karoKenari(this.cerceve));
      this.engel.ekle(k.anahtar, k.engel);
    } else this.engel.sil(k.anahtar);
  }

  private at(k: Karo): void {
    for (const m of [k.yer, k.bina, k.cizgi]) {
      if (!m) continue;
      this.sahne.remove(m);
      m.geometry.dispose();
    }
    this.engel.sil(k.anahtar);
    this.karolar.delete(k.anahtar);
  }

  private al(m: KarodanMesaj): void {
    const a = this.bekleyen.get(m.no);
    this.bekleyen.delete(m.no);
    const k = a ? this.karolar.get(a) : undefined;
    if (!k) return;
    if (m.tur === "hata") {
      k.durum = "hata";
      console.warn(`yürüyüş karosu ${a}: ${m.mesaj}`);
      this.degisti();
      return;
    }
    k.geo = m.geo;
    k.bayt = m.bayt;
    k.ms = m.ms;
    k.durum = "hazir";
    const yer = new Mesh(geometri(m.geo.yer), this.malz.yer);
    yer.renderOrder = -10;
    yer.matrixAutoUpdate = false;
    const bina = new Mesh(geometri(m.geo.bina), this.malz.bina);
    bina.matrixAutoUpdate = false;
    const cg = new BufferGeometry();
    cg.setAttribute("position", new BufferAttribute(m.geo.cizgi.konum, 3));
    cg.setAttribute("aSinif", new BufferAttribute(m.geo.cizgi.sinif, 1));
    cg.computeBoundingSphere();
    const cizgi = new LineSegments(cg, this.malz.cizgi);
    cizgi.matrixAutoUpdate = false;
    cizgi.renderOrder = 1;
    k.yer = yer;
    k.bina = bina;
    k.cizgi = cizgi;
    this.konumla(k);
    this.sahne.add(yer, bina, cizgi);
    this.gorunurluk(k);
    this.degisti();
  }

  private konumla(k: Karo): void {
    for (const m of [k.yer, k.bina, k.cizgi]) {
      if (!m) continue;
      m.position.set(k.kok[0] - this.orijin.x, 0, k.kok[1] - this.orijin.z);
      m.updateMatrix();
    }
  }

  orijinAyarla(o: Orijin): void {
    this.orijin = o;
    for (const k of this.karolar.values()) this.konumla(k);
  }

  /** Penceredeki karolar geldi mi (hatalılar da "geldi" sayılır)? */
  hazir(yalnizMerkez = false, merkez?: { x: number; y: number }): boolean {
    if (yalnizMerkez && merkez) {
      const k = this.karolar.get(`${merkez.x}/${merkez.y}`);
      return !!k && k.durum !== "bekliyor";
    }
    for (const a of this.pencere) if (this.karolar.get(a)?.durum === "bekliyor") return false;
    return true;
  }

  istatistik(): KaroIstatistigi {
    let hazir = 0;
    let bekleyen = 0;
    let ucgen = 0;
    let bayt = 0;
    let ms = 0;
    let enCok = 0;
    for (const a of this.pencere) {
      const k = this.karolar.get(a);
      if (!k) continue;
      if (k.durum === "bekliyor") bekleyen++;
      else if (k.durum === "hazir") {
        hazir++;
        ucgen += (k.geo?.istatistik.yerUcgen ?? 0) + (k.geo?.istatistik.binaUcgen ?? 0);
        bayt += k.bayt;
        ms += k.ms;
        enCok = Math.max(enCok, k.ms);
      }
    }
    return { hazir, bekleyen, ucgen, bayt, ortMs: hazir ? ms / hazir : 0, enCokMs: enCok };
  }

  temizle(): void {
    for (const k of [...this.karolar.values()]) this.at(k);
    this.bekleyen.clear();
  }
}

/**
 * Arsa katmanı (yürüyüş): z20 hücre ızgarası yalnız karakterin yakın çevresinde ince çizgilerle; sahip olunan
 * hücreler ince bir işaretle gösterilir (başkalarınınki soluk gri); inşaat aşamaları için örneklenmiş kutu yer tutucuları.
 * Oyuncunun arsası zemini boyamaz: çok hafif ton, kenar çizgisi, kenar boyunca içe doğru solan dar bir bant, köşe kazıkları
 * ve bayrak. Böylece zemin, yol ve bina okunur kalır; "Sen" kısık gözle de bulunur.
 *
 * Geometriler bir "çapa" hücresine göre yerel kurulur (küçük sayılar), ağ konumu = çapa − kayan orijin.
 * Çizim çağrısı: ızgara 1 + sahiplik dolgu 1 + sahiplik kenar 1 + inşaat ve bayraklar 1 (örneklenmiş).
 */
import { BufferAttribute, BufferGeometry, InstancedBufferAttribute, InstancedBufferGeometry, LineSegments, Mesh } from "three";
import type { Scene, ShaderMaterial } from "three";
import type { IlceSahipligi } from "../harita/baglanti";
import { idCoz } from "../harita/hucre";
import { S } from "./karo-geometri";
import { hucreDunya } from "./koordinat";
import type { Cerceve, Orijin } from "./koordinat";
import type { Rgb, YuruPaleti } from "./palet";

/** İnşaat aşaması (çekirdek `InsaatAsamasi` ile aynı sıra): 0 Temel, 1 İskele, 2 Gövde, 3 Tamam. */
export type Asama = 0 | 1 | 2 | 3;
export const ASAMA_ADI: Record<Asama, string> = { 0: "Temel", 1: "İskele", 2: "Gövde", 3: "Tamam" };

export interface InsaatBilgisi {
  hucre: string;
  asama: Asama;
  /** Sahte bağdaştırıcıda inşaat yoksa üretilen örnek (kartta belirtilir). */
  ornek?: boolean;
}

/** İsteğe bağlı bağdaştırıcı yeteneği: inşaatları veren sunucu (S4) gelince uygulanır. */
export interface InsaatKaynagi {
  insaatlarAl(ilce: string): Promise<InsaatBilgisi[]>;
}

export function insaatKaynagiMi(b: unknown): b is InsaatKaynagi {
  return !!b && typeof (b as Partial<InsaatKaynagi>).insaatlarAl === "function";
}

/**
 * Bağdaştırıcıda inşaat yoksa yer tutucu (örnek veri): her komşu (bot) parselinde bir yapı; ilk parselde dört
 * aşamanın hepsi yan yana (Temel, İskele, Gövde, Tamam), böylece tek bakışta görülür. Deterministik.
 */
export function ornekInsaatlar(s: IlceSahipligi | null, ben: string): InsaatBilgisi[] {
  if (!s) return [];
  const sahipler = new Map<string, string[]>();
  for (const [id, h] of s.hucreler) {
    if (h.sahip === ben) continue;
    let l = sahipler.get(h.sahip);
    if (!l) sahipler.set(h.sahip, (l = []));
    l.push(id);
  }
  const l: InsaatBilgisi[] = [];
  const sirali = [...sahipler.keys()].sort();
  sirali.forEach((sahip, i) => {
    const h = sahipler.get(sahip)!.sort();
    // 3×3 parselin köşeleri (kimlik sırasında 0, 2, 6, 8): dört aşama, ortası boş kalır
    if (i === 0) [0, 2, 6, 8].forEach((j, a) => h[j] && l.push({ hucre: h[j], asama: a as Asama, ornek: true }));
    else if (h[0]) l.push({ hucre: h[0], asama: ((i - 1) % 4) as Asama, ornek: true });
  });
  return l;
}

/**
 * Parsel bayrakları: sahip başına 4-komşulu bileşenler; her bileşenin en küçük kimlikli hücresi (deterministik).
 */
export function parselBayraklari(s: IlceSahipligi | null): { hucre: string; sahip: string }[] {
  if (!s) return [];
  const gorulen = new Set<string>();
  const l: { hucre: string; sahip: string }[] = [];
  for (const id of [...s.hucreler.keys()].sort()) {
    if (gorulen.has(id)) continue;
    const sahip = s.hucreler.get(id)!.sahip;
    const yigin = [id];
    gorulen.add(id);
    while (yigin.length) {
      const c = idCoz(yigin.pop()!);
      if (!c) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const n = `${c.x + dx}:${c.y + dy}`;
        if (!gorulen.has(n) && s.hucreler.get(n)?.sahip === sahip) {
          gorulen.add(n);
          yigin.push(n);
        }
      }
    }
    l.push({ hucre: id, sahip });
  }
  return l;
}

/**
 * Aşamaya göre kutu parçaları (hücre kenarı `c`; hücre KB köşesine göre; [x, y, z, sx, sy, sz, renkNo]).
 * renkNo: 0 beton döşeme, 1 iskele, 2 açık beton, 3 bitmiş gövde, 4 çatı (bina çatısı rengi).
 */
export function asamaKutulari(asama: Asama, c: number): [number, number, number, number, number, number, number][] {
  const m = c * 0.15;
  const w = c * 0.7;
  const k: [number, number, number, number, number, number, number][] = [[m, 0, m, w, 0.45, w, 0]]; // temel döşemesi
  if (asama === 0) return k;
  const dikme = (yuk: number): void => {
    for (const [x, z] of [
      [m, m],
      [m + w - 0.3, m],
      [m, m + w - 0.3],
      [m + w - 0.3, m + w - 0.3],
    ] as const)
      k.push([x, 0.45, z, 0.3, yuk, 0.3, 1]);
  };
  if (asama === 1) {
    dikme(9);
    for (const y of [3, 6, 9]) {
      k.push([m, y, m, w, 0.18, 0.18, 1], [m, y, m + w - 0.18, w, 0.18, 0.18, 1]);
      k.push([m, y, m, 0.18, 0.18, w, 1], [m + w - 0.18, y, m, 0.18, 0.18, w, 1]);
    }
    return k;
  }
  if (asama === 2) {
    k.push([m + 0.6, 0.45, m + 0.6, w - 1.2, 5.5, w - 1.2, 2]);
    dikme(9);
    return k;
  }
  k.push([m + 0.6, 0.45, m + 0.6, w - 1.2, 9.5, w - 1.2, 3], [m + 0.3, 9.95, m + 0.3, w - 0.6, 0.45, w - 0.6, 4]);
  return k;
}

/** Birim kutu (taban y = 0) ve yüz gölgeleri. */
function birimKutu(): { konum: Float32Array; golge: Uint8Array; indeks: Uint16Array } {
  const yuz: [number[][], number][] = [
    [[[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], 255], // üst
    [[[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], 225], // güney (+z)
    [[[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], 190], // kuzey
    [[[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], 205], // doğu
    [[[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], 215], // batı
  ];
  const konum: number[] = [];
  const golge: number[] = [];
  const indeks: number[] = [];
  for (const [k, g] of yuz) {
    const b = konum.length / 3;
    for (const p of k) konum.push(...p);
    golge.push(g, g, g, g);
    indeks.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { konum: Float32Array.from(konum), golge: Uint8Array.from(golge), indeks: Uint16Array.from(indeks) };
}

/** Izgara yarıçapı (hücre): çok soluk ve karakterin yakınında (solma ~14–50 m; sahne.ts), yakın planda gürültü yapmasın. */
const IZGARA_R = 3;
/** Parsel kenar şeridi genişliği (m): kendi arsan kalın, başkalarınınki ince (şerit: kenar çizgisi 1 piksele inip kaybolmasın). */
const KENAR_GENISLIK = { ben: 0.26, baskasi: 0.12 } as const;
const SAHIPLIK_R = 45; // hücre (~1,3 km)
/** Sahiplik dolgusu (tüm hücre): zemini ezmeyen çok hafif ton. Kenardaki bant ayrıca eklenir. */
const DOLGU_ALFA = { ben: 0.06, baskasi: 0.04 } as const;
/** Kendi arsanın dış kenarı boyunca içe doğru solan bant: genişlik (m) ve kenardaki alfa. */
const BANT = { genislik: 2.2, alfa: 0.22 } as const;
/** Köşe kazığı: gövde boyu ve eni (m); en çok bu kadar kazık (büyük arsalarda kare başına yük sınırı). */
const KAZIK = { boy: 1.5, en: 0.24, sinir: 160 } as const;

export class ArsaKatmani {
  readonly izgara: LineSegments;
  readonly dolgu: Mesh;
  readonly kenar: Mesh;
  readonly insaat: Mesh;
  private izgaraCapa = { x: NaN, y: NaN };
  private sahiplikCapa = { x: NaN, y: NaN };
  private sahiplik: IlceSahipligi | null = null;
  private ben = "";
  private insaatlar: InsaatBilgisi[] = [];
  private orijin: Orijin = { x: 0, z: 0 };
  private palet: YuruPaleti;

  constructor(
    sahne: Scene,
    private cerceve: Cerceve,
    palet: YuruPaleti,
    malz: { izgara: ShaderMaterial; dolgu: ShaderMaterial; kenar: ShaderMaterial; kutu: ShaderMaterial },
  ) {
    this.palet = palet;
    this.izgara = new LineSegments(new BufferGeometry(), malz.izgara);
    this.dolgu = new Mesh(new BufferGeometry(), malz.dolgu);
    this.kenar = new Mesh(new BufferGeometry(), malz.kenar);
    const kutu = birimKutu();
    const g = new InstancedBufferGeometry();
    g.setAttribute("position", new BufferAttribute(kutu.konum, 3));
    g.setAttribute("aGolge", new BufferAttribute(kutu.golge, 1, true));
    g.setIndex(new BufferAttribute(kutu.indeks, 1));
    g.instanceCount = 0;
    this.insaat = new Mesh(g, malz.kutu);
    for (const m of [this.izgara, this.dolgu, this.kenar, this.insaat]) {
      m.frustumCulled = false;
      m.matrixAutoUpdate = false;
    }
    this.izgara.renderOrder = 2;
    this.dolgu.renderOrder = 1;
    this.kenar.renderOrder = 3;
    sahne.add(this.izgara, this.dolgu, this.kenar, this.insaat);
  }

  veriAyarla(sahiplik: IlceSahipligi | null, ben: string, insaatlar: InsaatBilgisi[]): void {
    this.sahiplik = sahiplik;
    this.ben = ben;
    this.insaatlar = insaatlar;
    this.sahiplikCapa = { x: NaN, y: NaN };
    this.insaatKur();
  }

  paletAyarla(p: YuruPaleti): void {
    this.palet = p;
    this.izgaraCapa = { x: NaN, y: NaN };
    this.sahiplikCapa = { x: NaN, y: NaN };
    this.insaatKur();
  }

  orijinAyarla(o: Orijin): void {
    this.orijin = o;
    this.konumla(this.izgara, this.izgaraCapa);
    this.konumla(this.dolgu, this.sahiplikCapa);
    this.konumla(this.kenar, this.sahiplikCapa);
    this.konumla(this.insaat, { x: this.cerceve.X0, y: this.cerceve.Y0 });
  }

  private konumla(m: Mesh | LineSegments, capa: { x: number; y: number }): void {
    if (Number.isNaN(capa.x)) return;
    const [x, z] = hucreDunya(this.cerceve, capa.x, capa.y);
    m.position.set(x - this.orijin.x, 0, z - this.orijin.z);
    m.updateMatrix();
  }

  /** Karakterin hücresi değişince ızgara ve (uzaklaşınca) sahiplik yeniden kurulur. */
  guncelle(hucre: { x: number; y: number }): void {
    if (hucre.x !== this.izgaraCapa.x || hucre.y !== this.izgaraCapa.y) {
      this.izgaraCapa = { ...hucre };
      this.izgaraKur();
      this.konumla(this.izgara, this.izgaraCapa);
    }
    if (Number.isNaN(this.sahiplikCapa.x) || Math.max(Math.abs(hucre.x - this.sahiplikCapa.x), Math.abs(hucre.y - this.sahiplikCapa.y)) > 10) {
      this.sahiplikCapa = { ...hucre };
      this.sahiplikKur();
      this.konumla(this.dolgu, this.sahiplikCapa);
      this.konumla(this.kenar, this.sahiplikCapa);
    }
  }

  private izgaraKur(): void {
    const k = this.cerceve.k;
    const n = IZGARA_R;
    const konum: number[] = [];
    const y = 0.04;
    // Hücre kenarı başına kısa parçalar: kameranın arkasına uzanan uzun çizgiler bazı sürücülerde (SwiftShader)
    // yakın düzlemde kırpılırken tümden kayboluyor; kısa parçalar her yerde doğru çizilir.
    for (let i = -n; i <= n + 1; i++)
      for (let j = -n; j <= n; j++) {
        konum.push(i * k, y, j * k, i * k, y, (j + 1) * k);
        konum.push(j * k, y, i * k, (j + 1) * k, y, i * k);
      }
    const [r, g, b] = this.palet.izgara;
    const renk = new Float32Array((konum.length / 3) * 4);
    for (let i = 0; i < renk.length; i += 4) renk.set([r, g, b, this.palet.izgaraAlfa], i);
    const geo = this.izgara.geometry;
    geo.setAttribute("position", new BufferAttribute(Float32Array.from(konum), 3));
    geo.setAttribute("aRenk", new BufferAttribute(renk, 4));
  }

  private sahiplikKur(): void {
    const s = this.sahiplik;
    const capa = this.sahiplikCapa;
    const k = this.cerceve.k;
    const dk: number[] = [];
    const dr: number[] = [];
    const ix: number[] = [];
    const kk: number[] = [];
    const kr: number[] = [];
    const kx: number[] = [];
    if (s) {
      for (const [id, h] of s.hucreler) {
        const c = idCoz(id);
        if (!c || Math.max(Math.abs(c.x - capa.x), Math.abs(c.y - capa.y)) > SAHIPLIK_R) continue;
        const ben = h.sahip === this.ben;
        const renk: Rgb = ben ? this.palet.ben : this.palet.baskasi;
        const x0 = (c.x - capa.x) * k;
        const z0 = (c.y - capa.y) * k;
        const x1 = x0 + k;
        const z1 = z0 + k;
        const y = 0.05;
        const b = dk.length / 3;
        dk.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
        const a = ben ? DOLGU_ALFA.ben : DOLGU_ALFA.baskasi;
        for (let q = 0; q < 4; q++) dr.push(renk[0], renk[1], renk[2], a);
        ix.push(b, b + 2, b + 1, b, b + 3, b + 2);
        // Kenar: yalnız komşusu aynı sahipte olmayan kenarlar (birleşik parsel tek çerçeve)
        const ayni = (dx: number, dy: number): boolean => s.hucreler.get(`${c.x + dx}:${c.y + dy}`)?.sahip === h.sahip;
        const ka = ben ? 0.95 : 0.5;
        // Eksene paralel kenar → ince dörtgen şerit (uçlar yarım genişlik uzar: köşelerde boşluk kalmaz)
        const yari = KENAR_GENISLIK[ben ? "ben" : "baskasi"] / 2;
        const ekle = (ax: number, az: number, bx: number, bz: number): void => {
          const x0k = Math.min(ax, bx) - yari;
          const x1k = Math.max(ax, bx) + yari;
          const z0k = Math.min(az, bz) - yari;
          const z1k = Math.max(az, bz) + yari;
          const t = kk.length / 3;
          kk.push(x0k, 0.06, z0k, x1k, 0.06, z0k, x1k, 0.06, z1k, x0k, 0.06, z1k);
          for (let q = 0; q < 4; q++) kr.push(renk[0], renk[1], renk[2], ka);
          kx.push(t, t + 2, t + 1, t, t + 3, t + 2);
        };
        if (!ayni(0, -1)) ekle(x0, z0, x1, z0);
        if (!ayni(0, 1)) ekle(x0, z1, x1, z1);
        if (!ayni(-1, 0)) ekle(x0, z0, x0, z1);
        if (!ayni(1, 0)) ekle(x1, z0, x1, z1);
        if (ben) {
          // Dış kenardan içe doğru solan bant (dolgu yerine: ton yalnız sınırda yoğun, ortası boş)
          const w = BANT.genislik;
          const bant = (ax: number, az: number, bx: number, bz: number, ix2: number, iz: number): void => {
            const t = dk.length / 3;
            dk.push(ax, y, az, bx, y, bz, bx + ix2 * w, y, bz + iz * w, ax + ix2 * w, y, az + iz * w);
            dr.push(renk[0], renk[1], renk[2], BANT.alfa, renk[0], renk[1], renk[2], BANT.alfa, renk[0], renk[1], renk[2], 0, renk[0], renk[1], renk[2], 0);
            ix.push(t, t + 2, t + 1, t, t + 3, t + 2);
          };
          if (!ayni(0, -1)) bant(x0, z0, x1, z0, 0, 1);
          if (!ayni(0, 1)) bant(x0, z1, x1, z1, 0, -1);
          if (!ayni(-1, 0)) bant(x0, z0, x0, z1, 1, 0);
          if (!ayni(1, 0)) bant(x1, z0, x1, z1, -1, 0);
        }
      }
    }
    const g = this.dolgu.geometry;
    g.setAttribute("position", new BufferAttribute(Float32Array.from(dk), 3));
    g.setAttribute("aRenk", new BufferAttribute(Float32Array.from(dr), 4));
    g.setIndex(ix.length ? new BufferAttribute(Uint32Array.from(ix), 1) : null);
    const e = this.kenar.geometry;
    e.setAttribute("position", new BufferAttribute(Float32Array.from(kk), 3));
    e.setAttribute("aRenk", new BufferAttribute(Float32Array.from(kr), 4));
    e.setIndex(kx.length ? new BufferAttribute(Uint32Array.from(kx), 1) : null);
    this.dolgu.visible = ix.length > 0;
    this.kenar.visible = kx.length > 0;
  }

  /**
   * İnşaat örnekleri ve parsel bayrakları (tek örneklenmiş çizim): oturum orijin hücresine göre (çapa = (X0, Y0)).
   * Her bitişik parselin (sahip başına 4-komşulu bileşen) ilk hücresinde direk + bayrak: seninki oyuncu renginde ve
   * büyük, başkalarınınki gri ve küçük; uzaktan fark edilir. Senin yapıların gövdesi oyuncu rengine çalar.
   */
  private insaatKur(): void {
    const k = this.cerceve.k;
    const of: number[] = [];
    const ol: number[] = [];
    const rn: number[] = [];
    const kutu = (x: number, y: number, z: number, sx: number, sy: number, sz: number, renk: Rgb): void => {
      of.push(x, y, z);
      ol.push(sx, sy, sz);
      rn.push(...renk);
    };
    const karis = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (const ins of this.insaatlar) {
      const c = idCoz(ins.hucre);
      if (!c) continue;
      const bx = (c.x - this.cerceve.X0) * k;
      const bz = (c.y - this.cerceve.Y0) * k;
      const sahip = this.sahiplik?.hucreler.get(ins.hucre)?.sahip;
      for (const [x, y, z, sx, sy, sz, r] of asamaKutulari(ins.asama, k)) {
        let renk: Rgb = r === 4 ? [this.palet.sinif[S.BINA_CATI * 3]!, this.palet.sinif[S.BINA_CATI * 3 + 1]!, this.palet.sinif[S.BINA_CATI * 3 + 2]!] : this.palet.insaat[r as 0 | 1 | 2 | 3];
        if ((r === 2 || r === 3) && sahip === this.ben) renk = karis(renk, this.palet.ben, 0.45);
        kutu(bx + x, y, bz + z, sx, sy, sz, renk);
      }
    }
    for (const b of parselBayraklari(this.sahiplik)) {
      const c = idCoz(b.hucre);
      if (!c) continue;
      const ben = b.sahip === this.ben;
      const bx = (c.x - this.cerceve.X0) * k + k * 0.08;
      const bz = (c.y - this.cerceve.Y0) * k + k * 0.08;
      const boy = ben ? 7 : 4.5;
      kutu(bx, 0, bz, 0.22, boy, 0.22, this.palet.koyu ? [0.75, 0.78, 0.82] : [0.35, 0.37, 0.4]);
      kutu(bx + 0.22, boy - (ben ? 1.4 : 1.0), bz, ben ? 2.2 : 1.4, ben ? 1.3 : 0.9, 0.1, ben ? this.palet.ben : this.palet.baskasi);
    }
    // Köşe kazıkları: kendi arsanın köşelerinde (düz kenar ortasında değil); gövde oyuncu renginde, tepesi açık renkli
    const ust = karis(this.palet.ben, [1, 1, 1], 0.6);
    for (const [vx, vy] of this.arsaKoseleri()) {
      const bx = (vx - this.cerceve.X0) * k;
      const bz = (vy - this.cerceve.Y0) * k;
      kutu(bx - KAZIK.en / 2, 0, bz - KAZIK.en / 2, KAZIK.en, KAZIK.boy, KAZIK.en, this.palet.ben);
      kutu(bx - KAZIK.en * 0.7, KAZIK.boy, bz - KAZIK.en * 0.7, KAZIK.en * 1.4, 0.14, KAZIK.en * 1.4, ust);
    }
    const g = this.insaat.geometry as InstancedBufferGeometry;
    g.setAttribute("aOfset", new InstancedBufferAttribute(Float32Array.from(of), 3));
    g.setAttribute("aOlcek", new InstancedBufferAttribute(Float32Array.from(ol), 3));
    g.setAttribute("aRenk", new InstancedBufferAttribute(Float32Array.from(rn), 3));
    g.instanceCount = of.length / 3;
    this.insaat.visible = g.instanceCount > 0;
    this.konumla(this.insaat, { x: this.cerceve.X0, y: this.cerceve.Y0 });
  }

  /**
   * Oyuncunun arsa köşeleri (hücre köşe koordinatı): köşeyi çevreleyen dört hücreden biri ya da üçü oyuncunun, ya da ikisi
   * çaprazdaysa. Düz kenar ortası (iki bitişik hücre) ve iç nokta kazık almaz. Sıra ve sınır deterministik.
   */
  arsaKoseleri(): Array<[number, number]> {
    const s = this.sahiplik;
    if (!s) return [];
    const benim = (x: number, y: number): boolean => s.hucreler.get(`${x}:${y}`)?.sahip === this.ben;
    const gorulen = new Set<string>();
    const l: Array<[number, number]> = [];
    for (const id of [...s.hucreler.keys()].sort()) {
      const c = idCoz(id);
      if (!c || !benim(c.x, c.y)) continue;
      for (const [vx, vy] of [[c.x, c.y], [c.x + 1, c.y], [c.x, c.y + 1], [c.x + 1, c.y + 1]] as const) {
        const ad = `${vx}:${vy}`;
        if (gorulen.has(ad)) continue;
        gorulen.add(ad);
        const kb = benim(vx - 1, vy - 1), kd = benim(vx, vy - 1), gb = benim(vx - 1, vy), gd = benim(vx, vy);
        const sayi = +kb + +kd + +gb + +gd;
        const duz = sayi === 2 && (kb === kd || kb === gb);
        if (sayi === 4 || duz) continue;
        l.push([vx, vy]);
        if (l.length >= KAZIK.sinir) return l;
      }
    }
    return l;
  }

  /** Hücredeki inşaat (kart için). */
  insaatBul(id: string): InsaatBilgisi | undefined {
    return this.insaatlar.find((i) => i.hucre === id);
  }

  /** Çarpışma için Gövde/Tamam aşamasındaki blokların ayak izleri (dünya metresi, saat yönü halkalar). */
  engelHalkalari(): { halka: number[]; ust: number }[] {
    const k = this.cerceve.k;
    const l: { halka: number[]; ust: number }[] = [];
    for (const ins of this.insaatlar) {
      if (ins.asama < 2) continue;
      const c = idCoz(ins.hucre);
      if (!c) continue;
      const [bx, bz] = hucreDunya(this.cerceve, c.x, c.y);
      const m = k * 0.15 + 0.6;
      const w = k * 0.7 - 1.2;
      l.push({ halka: [bx + m, bz + m, bx + m + w, bz + m, bx + m + w, bz + m + w, bx + m, bz + m + w], ust: ins.asama === 3 ? 10.3 : 6 });
    }
    return l;
  }
}

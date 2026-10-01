/**
 * z15 vektör karosu (Protomaps şema v4) → yürüyüş sahnesi geometrisi (saf, deterministik; işçide çalışır).
 *
 * Karo başına üç birleştirilmiş parça çıkar (= üç çizim çağrısı):
 *   - **yer**: deniz tabanı, kara (earth), arazi örtüsü/kullanımı, su, kaldırımlar ve yol şeritleri. Hepsi y = 0
 *     düzleminde; sahnede derinlik testi kapalı ve üçgen sırasıyla (ressam algoritması) çizilir, z-çatışması olmaz.
 *   - **bina**: ayak izi ekstrüzyonu; küçük dörtgen konutlarda saçaklı kırma çatı (kiremit), apartmanlarda parapetli düz
 *     çatı (beton/arduvaz), büyük ayak izlerinde sanayi gövdesi. Yüz gölgesi tek yönlü güneşe (güneybatı, yüksek) göre
 *     pişirilir; kat çizgisi, pencere ritmi, giriş katı vitrini ve korniş gölgelendiricide köşe başına cephe verisinden
 *     (aCephe, aUst) üretilir: doku yok, tek çizim çağrısı korunur.
 *   - **çizgi**: çatı çevresi, mahya ve kırma çizgileri, belirgin köşelerde dikey kenarlar (net, illüstratif siluet).
 * Ayrıca çarpışma için bina halkaları (ayak izleri) döner.
 *
 * Koordinatlar karo yereldir: karo kuzeybatı köşesi (0, 0); x doğu, z güney, metre. `olcek` = metre / karo birimi.
 * Çokgenler ve çizgiler karo karesine kırpılır (komşu karonun tampon bölgesi üst üste çizilmesin).
 * DEM (yükseklik) bu dilimde yok: zemin düz. İleride `yukseklikAl(x, z)` ile köşeler oturtulabilir (Mapterhorn).
 */
import earcut from "earcut";
import { GeometriYazici } from "./geometri-yazici";
import type { GeometriParcasi } from "./geometri-yazici";
import { cokgenler, halkaAlani } from "./mvt";
import type { MvtDeger, MvtKatman } from "./mvt";

/** Palet sınıfları (köşe başına bir bayt). Renkleri `palet.ts` temadan verir. */
export const S = {
  DENIZ: 0,
  KARA: 1,
  YESIL: 2,
  ORMAN: 3,
  TARLA: 4,
  SANAYI_ALAN: 5,
  KONUT_ALAN: 6,
  KURUM: 7,
  YAYA: 8,
  KUM: 9,
  SU: 10,
  OTOYOL: 11,
  ANA_YOL: 12,
  TALI_YOL: 13,
  PATIKA: 14,
  RAY: 15,
  BINA: 16,
  BINA_CATI: 17,
  SANAYI_BINA: 18,
  SANAYI_CATI: 19,
  KALDIRIM: 20,
  KENAR: 21,
  /** Kaldırım taşı (bordür): kaldırımla asfaltın birleştiği ince şerit. */
  KERB: 22,
  CATI_KIREMIT: 23,
  CATI_KOYU_KIREMIT: 24,
  CATI_ARDUVAZ: 25,
} as const;
export const SINIF_SAYISI = 26;

export interface AyakIzleri {
  /** Halka noktaları (x, z çiftleri, karo yerel metre). */
  nokta: Float32Array;
  /** Halka başlangıçları (nokta çifti indeksi); uzunluk = halka sayısı + 1. */
  halkaBas: Uint32Array;
  /** Halkanın ait olduğu bina (çift-tek içerde testi bina bina yapılır). */
  bina: Uint32Array;
  /** Halkanın binasının üst kotu (m). */
  ust: Float32Array;
}

/** Çizgi parçaları (LineSegments): bina çatı ve köşe kenarları (net siluet). */
export interface CizgiParcasi {
  konum: Float32Array;
  sinif: Uint8Array;
}

export interface KaroGeometrisi {
  yer: GeometriParcasi;
  bina: GeometriParcasi;
  cizgi: CizgiParcasi;
  iz: AyakIzleri;
  istatistik: { bina: number; yol: number; arazi: number; su: number; yerUcgen: number; binaUcgen: number };
}

export interface KaroGirdisi {
  katmanlar: ReadonlyMap<string, MvtKatman>;
  /** Metre / karo birimi (extent 4096 için karo kenarı / 4096). */
  olcek: number;
  /** Karo yoksa (özüt dışı) true: düz kara zemini. */
  bos?: boolean;
}

export const ISTENEN_KATMANLAR: ReadonlySet<string> = new Set(["earth", "landcover", "landuse", "water", "roads", "buildings"]);

// --- Sınıf eşlemeleri (Protomaps v4.15 `kind`) ------------------------------------------------------------

const ARAZI: Record<string, number> = {};
const esle = (sinif: number, l: string): void => {
  for (const k of l.split(" ")) ARAZI[k] = sinif;
};
esle(S.YESIL, "park garden grass grassland meadow village_green golf_course playground pitch recreation_ground dog_park cemetery grave_yard allotments zoo theme_park stadium");
esle(S.ORMAN, "forest wood nature_reserve national_park protected_area scrub wetland heath");
esle(S.TARLA, "farmland farmyard orchard vineyard plant_nursery greenhouse_horticulture");
esle(S.SANAYI_ALAN, "industrial railway quarry landfill construction brownfield works military naval_base aerodrome runway taxiway apron port harbour");
esle(S.KONUT_ALAN, "residential urban_area commercial retail");
esle(S.KURUM, "school university college kindergarten hospital clinic place_of_worship");
esle(S.YAYA, "pedestrian platform pier marina parking");
esle(S.KUM, "beach sand bare_rock barren scree glacier");

/** Arazi örtüsü/kullanımı türünden palet sınıfı (bilinmeyen: null, çizilmez). */
export function araziSinifi(kind: string): number | null {
  return ARAZI[kind] ?? null;
}

/** Kaldırım payı (her iki yanda, m): şehir içi yollarda; otoyol, patika ve rayda yok. */
export function kaldirimPayi(o: Readonly<Record<string, MvtDeger>>): number {
  const kind = String(o["kind"] ?? "");
  if (kind === "major_road") return o["is_link"] === true ? 0 : 2.6;
  if (kind === "minor_road") return String(o["kind_detail"] ?? "") === "service" ? 0 : 2.2;
  return 0;
}

/** Yol: [sınıf, genişlik m] ya da çizilmezse null. */
export function yolSinifi(o: Readonly<Record<string, MvtDeger>>): [number, number] | null {
  if (o["is_tunnel"] === true) return null;
  const kind = String(o["kind"] ?? "");
  const detay = String(o["kind_detail"] ?? "");
  const bag = o["is_link"] === true;
  switch (kind) {
    case "highway":
      return [S.OTOYOL, bag ? 8 : 16];
    case "major_road": {
      if (bag) return [S.ANA_YOL, 7];
      const w = detay === "trunk" ? 14 : detay === "primary" ? 12 : detay === "secondary" ? 10 : 9;
      return [S.ANA_YOL, w];
    }
    case "minor_road":
      return [S.TALI_YOL, detay === "service" ? 4.5 : 7];
    case "path":
      return [S.PATIKA, detay === "track" ? 3 : detay === "pedestrian" ? 5 : 2.4];
    case "rail":
      return o["is_bridge"] === true || detay === "rail" || detay === "" ? [S.RAY, 3] : [S.RAY, 2.5];
    case "other":
      return [S.TALI_YOL, 4];
    default:
      return null; // ferry, aerialway vb.
  }
}

/** Su çokgeni mi (havuz ve çeşme dahil: sakin mavi leke)? Çizgi suları için genişlik. */
function suCizgiGenisligi(kind: string): number | null {
  if (kind === "river") return 14;
  if (kind === "canal") return 8;
  if (kind === "stream" || kind === "ditch" || kind === "drain") return 3;
  return null;
}

/** Varsayılan bina yüksekliği: `height` yoksa ayak izi alanına göre makul kat sayısı (deterministik tohumla). */
export function varsayilanYukseklik(alanM2: number, tohum: number): number {
  // Okunurluk için gerçekçi ama alçak tutulur (oyunsu bloklar; sokak kameradan görünsün).
  const KAT = 3.0;
  const t = Math.abs(tohum) >>> 0;
  if (alanM2 < 25) return 2.8;
  if (alanM2 < 90) return KAT * (1 + (t % 2));
  if (alanM2 < 700) return KAT * (2 + (t % 4)); // 2–5 katlı apartman
  if (alanM2 < 1800) return KAT * (2 + (t % 3));
  return 8 + (t % 3) * 2; // büyük ayak izi: sanayi/depo yapısı, alçak
}

// --- Kırpma ---------------------------------------------------------------------------------------------

/** Sutherland–Hodgman: halkayı [0, E]² karesine kırpar (düz dizi; kapalı değil). */
export function halkaKirp(h: readonly number[], E: number): number[] {
  let giris = h as number[];
  const kenarlar: [number, number][] = [
    [0, 0], // x >= 0
    [0, 1], // x <= E
    [1, 0], // y >= 0
    [1, 1], // y <= E
  ];
  for (const [eksen, ust] of kenarlar) {
    const n = giris.length / 2;
    if (n === 0) break;
    const cikis: number[] = [];
    const icerde = (i: number): boolean => {
      const v = giris[i * 2 + eksen]!;
      return ust ? v <= E : v >= 0;
    };
    const sinir = ust ? E : 0;
    for (let i = 0; i < n; i++) {
      const j = (i + n - 1) % n;
      const ai = icerde(j);
      const bi = icerde(i);
      const ax = giris[j * 2]!;
      const ay = giris[j * 2 + 1]!;
      const bx = giris[i * 2]!;
      const by = giris[i * 2 + 1]!;
      if (ai !== bi) {
        const av = eksen === 0 ? ax : ay;
        const bv = eksen === 0 ? bx : by;
        const t = (sinir - av) / (bv - av);
        if (eksen === 0) cikis.push(sinir, ay + (by - ay) * t);
        else cikis.push(ax + (bx - ax) * t, sinir);
      }
      if (bi) cikis.push(bx, by);
    }
    giris = cikis;
  }
  return giris;
}

/** Liang–Barsky: doğru parçasını [0, E]² karesine kırpar; dışarıdaysa null. */
export function bolumKirp(ax: number, ay: number, bx: number, by: number, E: number): [number, number, number, number] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax, E - ax, ay, E - ay];
  for (let i = 0; i < 4; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (pi === 0) {
      if (qi < 0) return null;
    } else {
      const r = qi / pi;
      if (pi < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [ax + t0 * dx, ay + t0 * dy, ax + t1 * dx, ay + t1 * dy];
}

// --- Üretim ---------------------------------------------------------------------------------------------

/** Düz çokgeni (dış + delikler, karo birimi) y = taban düzleminde üçgenler; köşeler metreye çevrilir. */
function duzCokgen(y: GeometriYazici, halkalar: readonly number[][], olcek: number, kot: number, sinif: number, golge = 255): number {
  const veri: number[] = [];
  const delik: number[] = [];
  for (let i = 0; i < halkalar.length; i++) {
    if (i > 0) delik.push(veri.length / 2);
    for (const v of halkalar[i]!) veri.push(v);
  }
  const ucg = earcut(veri, delik.length ? delik : undefined, 2);
  if (!ucg.length) return 0;
  const taban = y.kose;
  for (let i = 0; i < veri.length; i += 2) y.nokta(veri[i]! * olcek, kot, veri[i + 1]! * olcek, sinif, golge);
  for (let i = 0; i < ucg.length; i += 3) {
    const a = ucg[i]!;
    const b = ucg[i + 1]!;
    const c = ucg[i + 2]!;
    // Yukarı (+y) bakan sarım: (b−a)×(c−a) için y bileşeni = dz1·dx2 − dx1·dz2 > 0
    const dx1 = veri[b * 2]! - veri[a * 2]!;
    const dz1 = veri[b * 2 + 1]! - veri[a * 2 + 1]!;
    const dx2 = veri[c * 2]! - veri[a * 2]!;
    const dz2 = veri[c * 2 + 1]! - veri[a * 2 + 1]!;
    if (dz1 * dx2 - dx1 * dz2 >= 0) y.uc(taban + a, taban + b, taban + c);
    else y.uc(taban + a, taban + c, taban + b);
  }
  return ucg.length / 3;
}

/** Çizgiyi (karo birimi) genişlikli şeride çevirir: parça başına dörtgen + kare uç (birleşimlerde boşluk kalmaz). */
function serit(y: GeometriYazici, cizgi: readonly number[], E: number, olcek: number, genislikM: number, sinif: number): number {
  let n = 0;
  const yari = genislikM / 2;
  for (let i = 0; i + 3 < cizgi.length; i += 2) {
    const k = bolumKirp(cizgi[i]!, cizgi[i + 1]!, cizgi[i + 2]!, cizgi[i + 3]!, E);
    if (!k) continue;
    const ax = k[0] * olcek;
    const az = k[1] * olcek;
    const bx = k[2] * olcek;
    const bz = k[3] * olcek;
    const dx = bx - ax;
    const dz = bz - az;
    const L = Math.hypot(dx, dz);
    if (L < 1e-6) continue;
    const ux = dx / L;
    const uz = dz / L;
    // Uçları kırpılmış kenarın ötesine taşırmamak için yalnız karo içindeki uçlar uzatılır.
    const icA = k[0] > 0 && k[0] < E && k[1] > 0 && k[1] < E;
    const icB = k[2] > 0 && k[2] < E && k[3] > 0 && k[3] < E;
    const ex0 = icA ? yari : 0;
    const ex1 = icB ? yari : 0;
    const px = -uz * yari;
    const pz = ux * yari;
    const x0 = ax - ux * ex0;
    const z0 = az - uz * ex0;
    const x1 = bx + ux * ex1;
    const z1 = bz + uz * ex1;
    const a = y.nokta(x0 + px, 0, z0 + pz, sinif);
    const b = y.nokta(x1 + px, 0, z1 + pz, sinif);
    const c = y.nokta(x1 - px, 0, z1 - pz, sinif);
    const d = y.nokta(x0 - px, 0, z0 - pz, sinif);
    // +y'ye bakan sarım
    if (pz * dx - px * dz >= 0) {
      y.uc(a, b, c);
      y.uc(a, c, d);
    } else {
      y.uc(a, c, b);
      y.uc(a, d, c);
    }
    n++;
  }
  return n;
}

/** Güneş yönü (birim; x doğu, y yukarı, z güney): güneybatıdan, yüksek; sakin ve tek yönlü. */
const GUNES: readonly [number, number, number] = (() => {
  const v = [-0.5, 0.72, 0.48];
  const L = Math.hypot(v[0]!, v[1]!, v[2]!);
  return [v[0]! / L, v[1]! / L, v[2]! / L] as const;
})();

/** Yüz gölgesi (0–255): ortam + yumuşak yayınık güneş. Güneşe bakan duvar ~0,97, gölgedeki ~0,74; düz çatı 1. */
export function yuzGolgesi(nx: number, ny: number, nz: number): number {
  const d = nx * GUNES[0] + ny * GUNES[1] + nz * GUNES[2];
  return Math.round(255 * Math.min(1, 0.74 + 0.25 * Math.max(0, Math.min(1, (d + 0.25) / 0.85))));
}

/** Duvar gölgesi (yatay normal). */
function duvarGolgesi(nx: number, nz: number): number {
  return yuzGolgesi(nx, 0, nz);
}

/** Bina tohumu → 0–1 (cephe tonu, pencere aralığı, vitrin, çatı türü; deterministik). */
const tohum01 = (t: number): number => ((t >>> 0) % 9973) / 9973;

/**
 * Dörtgen (yaklaşık dikdörtgen) ayak izi: neredeyse doğrusal köşeler atılır; tam 4 köşe, dışbükey ve köşeleri dike
 * yakınsa metre cinsinden köşeleri döndürür (kırma çatı için), değilse null.
 */
export function dortgenMi(h: readonly number[], olcek: number): [number, number][] | null {
  const n = h.length / 2;
  const p: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = [h[((i + n - 1) % n) * 2]!, h[((i + n - 1) % n) * 2 + 1]!];
    const b = [h[i * 2]!, h[i * 2 + 1]!];
    const c = [h[((i + 1) % n) * 2]!, h[((i + 1) % n) * 2 + 1]!];
    const ux = b[0]! - a[0]!;
    const uz = b[1]! - a[1]!;
    const vx = c[0]! - b[0]!;
    const vz = c[1]! - b[1]!;
    const lu = Math.hypot(ux, uz);
    const lv = Math.hypot(vx, vz);
    if (lu < 1e-6 || lv < 1e-6) continue;
    if ((ux * vx + uz * vz) / (lu * lv) > 0.985) continue; // neredeyse doğrusal
    p.push([b[0]! * olcek, b[1]! * olcek]);
  }
  if (p.length !== 4) return null;
  let isaret = 0;
  for (let i = 0; i < 4; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % 4]!;
    const c = p[(i + 2) % 4]!;
    const ux = b[0] - a[0];
    const uz = b[1] - a[1];
    const vx = c[0] - b[0];
    const vz = c[1] - b[1];
    const cr = ux * vz - uz * vx;
    if (isaret === 0) isaret = Math.sign(cr);
    else if (Math.sign(cr) !== isaret) return null;
    if (Math.abs(ux * vx + uz * vz) / (Math.hypot(ux, uz) * Math.hypot(vx, vz)) > 0.3) return null;
  }
  return p;
}

const sayi = (v: MvtDeger | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Üçgeni yukarı (+y) bakan sarımla ve normale göre gölgeyle yazar. */
function catiUcgen(y: GeometriYazici, p: readonly [number, number, number][], sinif: number): void {
  const [a, b, c] = p as [[number, number, number], [number, number, number], [number, number, number]];
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const L = Math.hypot(nx, ny, nz) || 1;
  const ters = ny < 0;
  if (ters) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const gl = yuzGolgesi(nx / L, ny / L, nz / L);
  const i = y.nokta(a[0], a[1], a[2], sinif, gl);
  const j = y.nokta(b[0], b[1], b[2], sinif, gl);
  const k = y.nokta(c[0], c[1], c[2], sinif, gl);
  if (ters) y.uc(i, k, j);
  else y.uc(i, j, k);
}

/**
 * Saçaklı kırma çatı (dörtgen konut): ayak izi 0,35 m dışa genişletilir (saçak), mahya uzun eksende, kırma uçları 45°
 * planla; eğim ~30°. Mahya ve kırma çizgileri siluet çizgisine eklenir.
 */
function kirmaCati(y: GeometriYazici, cizgi: number[], p: [number, number][], ust: number, sinif: number): void {
  const SACAK = 0.35;
  const birim = (x: number, z: number): [number, number] => {
    const L = Math.hypot(x, z) || 1;
    return [x / L, z / L];
  };
  const q = p.map((v, i) => {
    const o = p[(i + 3) % 4]!;
    const s = p[(i + 1) % 4]!;
    const a = birim(v[0] - o[0], v[1] - o[1]);
    const b = birim(v[0] - s[0], v[1] - s[1]);
    return [v[0] + (a[0] + b[0]) * SACAK, v[1] + (a[1] + b[1]) * SACAK] as [number, number];
  });
  // Uzun kenar 0→1 olsun
  const e0 = Math.hypot(q[1]![0] - q[0]![0], q[1]![1] - q[0]![1]);
  const e1 = Math.hypot(q[2]![0] - q[1]![0], q[2]![1] - q[1]![1]);
  const r = e0 >= e1 ? q : [q[1]!, q[2]!, q[3]!, q[0]!];
  const kisa = Math.min(e0, e1);
  const uzun = Math.max(e0, e1);
  const [P0, P1, P2, P3] = r as [[number, number], [number, number], [number, number], [number, number]];
  const Ma: [number, number] = [(P3[0] + P0[0]) / 2, (P3[1] + P0[1]) / 2];
  const Mb: [number, number] = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2];
  const ek = birim(Mb[0] - Ma[0], Mb[1] - Ma[1]);
  const hs = Math.min(kisa / 2, uzun / 2 - 0.01);
  const rise = Math.min(2.8, Math.max(0.9, (kisa / 2) * 0.58));
  const Ra: [number, number, number] = [Ma[0] + ek[0] * hs, ust + rise, Ma[1] + ek[1] * hs];
  const Rb: [number, number, number] = [Mb[0] - ek[0] * hs, ust + rise, Mb[1] - ek[1] * hs];
  const k = (v: [number, number]): [number, number, number] => [v[0], ust, v[1]];
  // İki eğimli uzun yüz (yamuk) + iki kırma ucu (üçgen)
  catiUcgen(y, [k(P0), k(P1), Rb], sinif);
  catiUcgen(y, [k(P0), Rb, Ra], sinif);
  catiUcgen(y, [k(P2), k(P3), Ra], sinif);
  catiUcgen(y, [k(P2), Ra, Rb], sinif);
  catiUcgen(y, [k(P1), k(P2), Rb], sinif);
  catiUcgen(y, [k(P3), k(P0), Ra], sinif);
  // Siluet: saçak çevresi, mahya, dört kırma çizgisi
  const e = 0.03;
  for (let i = 0; i < 4; i++) {
    const a = k(r[i]!);
    const b = k(r[(i + 1) % 4]!);
    cizgi.push(a[0], a[1] + e, a[2], b[0], b[1] + e, b[2]);
  }
  cizgi.push(Ra[0], Ra[1] + e, Ra[2], Rb[0], Rb[1] + e, Rb[2]);
  for (const [v, R] of [
    [P0, Ra],
    [P3, Ra],
    [P1, Rb],
    [P2, Rb],
  ] as [[number, number], [number, number, number]][])
    cizgi.push(v[0], ust + e, v[1], R[0], R[1] + e, R[2]);
}

export function karoGeometrisi(g: KaroGirdisi): KaroGeometrisi {
  const yer = new GeometriYazici();
  const bina = new GeometriYazici(true);
  const izNokta: number[] = [];
  const izBas: number[] = [0];
  const izBina: number[] = [];
  const izUst: number[] = [];
  const ist = { bina: 0, yol: 0, arazi: 0, su: 0, yerUcgen: 0, binaUcgen: 0 };
  const E = g.katmanlar.values().next().value?.extent ?? 4096;
  const o = g.olcek;
  const kare = [0, 0, E, 0, E, E, 0, E];

  // 1) Taban: karo varsa deniz (earth karayı örter), yoksa düz kara.
  duzCokgen(yer, [kare], o, 0, g.bos ? S.KARA : S.DENIZ);
  const katman = (ad: string): MvtKatman | undefined => g.katmanlar.get(ad);
  const kirpilmis = (parcalar: readonly number[][]): number[][][] => {
    const l: number[][][] = [];
    for (const c of cokgenler(parcalar)) {
      const k = c.map((h) => halkaKirp(h, E)).filter((h) => h.length >= 6);
      if (k.length && halkaAlani(k[0]!) !== 0) l.push(k);
    }
    return l;
  };

  // 2) Kara
  for (const f of katman("earth")?.ozellikler ?? []) if (f.tur === 3) for (const c of kirpilmis(f.parcalar)) duzCokgen(yer, c, o, 0, S.KARA);

  // 3) Arazi örtüsü ve kullanımı (sort_rank sırasıyla; örtü önce)
  const arazi: { sira: number; no: number; sinif: number; parcalar: number[][] }[] = [];
  let no = 0;
  for (const ad of ["landcover", "landuse"]) {
    for (const f of katman(ad)?.ozellikler ?? []) {
      no++;
      if (f.tur !== 3) continue;
      const s = araziSinifi(String(f.ozellik["kind"] ?? ""));
      if (s === null) continue;
      arazi.push({ sira: (ad === "landcover" ? -1000 : 0) + (sayi(f.ozellik["sort_rank"]) ?? 0), no, sinif: s, parcalar: f.parcalar });
    }
  }
  arazi.sort((a, b) => a.sira - b.sira || a.no - b.no);
  for (const a of arazi) for (const c of kirpilmis(a.parcalar)) if (duzCokgen(yer, c, o, 0, a.sinif)) ist.arazi++;

  // 4) Su: çokgenler, sonra çizgiler (nehir, dere)
  for (const f of katman("water")?.ozellikler ?? []) {
    const kind = String(f.ozellik["kind"] ?? "");
    if (f.tur === 3) {
      for (const c of kirpilmis(f.parcalar)) if (duzCokgen(yer, c, o, 0, S.SU)) ist.su++;
    } else if (f.tur === 2 && f.ozellik["tunnel"] !== true) {
      const w = suCizgiGenisligi(kind);
      if (w) for (const c of f.parcalar) if (serit(yer, c, E, o, w, S.SU)) ist.su++;
    }
  }

  // 5) Yollar (sort_rank artan: küçük yollar altta)
  const yollar = (katman("roads")?.ozellikler ?? [])
    .map((f, i) => ({ f, i, sira: sayi(f.ozellik["sort_rank"]) ?? 0, s: f.tur === 2 ? yolSinifi(f.ozellik) : null }))
    .filter((y) => y.s !== null)
    .sort((a, b) => a.sira - b.sira || a.i - b.i);
  // Önce bütün kaldırımlar, sonra bordür, sonra asfalt: kavşaklarda kaldırım yolun üstüne binmez; bordür asfaltın hemen
  // dışında ince bir şerittir (asfalt sonra çizildiği için kavşakta yolun içine taşan bordür örtülür).
  for (const { f, s } of yollar) {
    const pay = kaldirimPayi(f.ozellik);
    if (pay > 0) for (const c of f.parcalar) serit(yer, c, E, o, s![1] + 2 * pay, S.KALDIRIM);
  }
  for (const { f, s } of yollar) {
    const pay = kaldirimPayi(f.ozellik);
    if (pay > 0) for (const c of f.parcalar) serit(yer, c, E, o, s![1] + 0.7, S.KERB);
  }
  for (const { f, s } of yollar) {
    let n = 0;
    for (const c of f.parcalar) n += serit(yer, c, E, o, s![1], s![0]);
    if (n) ist.yol++;
  }

  // 6) Binalar
  let binaNo = 0;
  const cizgi: number[] = [];
  for (const f of katman("buildings")?.ozellikler ?? []) {
    if (f.tur !== 3) continue;
    for (const c of cokgenler(f.parcalar)) {
      const alanM2 = Math.abs(halkaAlani(c[0]!)) * o * o;
      if (alanM2 < 4) continue;
      const k = c.map((h) => halkaKirp(h, E)).filter((h) => h.length >= 6);
      if (!k.length || halkaAlani(k[0]!) === 0) continue;
      const h0 = c[0]!;
      const tohum = Math.imul(h0[0]! | 0, 73856093) ^ Math.imul(h0[1]! | 0, 19349663);
      const t01 = tohum01(tohum);
      const yuk = sayi(f.ozellik["height"]);
      const ust = Math.max(2.5, yuk ?? varsayilanYukseklik(alanM2, tohum));
      const alt = Math.min(ust - 1, Math.max(0, sayi(f.ozellik["min_height"]) ?? 0));
      const sanayi = alanM2 >= 1800 && yuk === null;
      // Kırma çatı: küçük, alçak, kırpılmamış dörtgen konut (çoğunluk); diğerleri parapetli düz çatı.
      const kirpilmamis = k.length === 1 && c.length === 1 && k[0]!.length === h0.length;
      const dort = !sanayi && kirpilmamis && alanM2 < 480 && ust <= 10 && t01 < 0.78 ? dortgenMi(k[0]!, o) : null;
      const parapet = sanayi || dort ? 0 : 0.45 + Math.floor(t01 * 3) * 0.15;
      const cepheUst = ust + parapet;
      const duvarS = sanayi ? S.SANAYI_BINA : S.BINA;
      const catiS = sanayi ? S.SANAYI_CATI : t01 < 0.6 ? S.BINA_CATI : S.CATI_ARDUVAZ;
      // Pencere aralığı (m): konutta 2,9–4,0; sanayide 0 (gölgelendirici panel çizgisi ve yüksek bant çizer)
      const aralik = sanayi ? 0 : 2.9 + ((t01 * 7.3) % 1) * 1.1;
      // Duvarlar: karo sınırı üzerindeki kırpma kenarları atlanır (komşu karodaki parça devam eder).
      for (const h of k) {
        const n = h.length / 2;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const x1 = h[i * 2]!;
          const y1 = h[i * 2 + 1]!;
          const x2 = h[j * 2]!;
          const y2 = h[j * 2 + 1]!;
          if ((x1 === x2 && (x1 === 0 || x1 === E)) || (y1 === y2 && (y1 === 0 || y1 === E))) continue;
          const ax = x1 * o;
          const az = y1 * o;
          const bx = x2 * o;
          const bz = y2 * o;
          const L = Math.hypot(bx - ax, bz - az);
          if (L < 1e-4) continue;
          // Dış normal: dış halkada (y aşağı, saat yönü) (dz, −dx); delik halkası ters sarımlıdır, aynı formül katı
          // malzemeden dışarıyı (avluya doğru) verir.
          const nx = (bz - az) / L;
          const nz = -(bx - ax) / L;
          const gl = duvarGolgesi(nx, nz);
          // Siluet: cephe üstü her duvarda; dikey köşe yalnız belirgin dönüşlerde (eğri cephede çizgi kalabalığı olmasın)
          cizgi.push(ax, cepheUst + 0.03, az, bx, cepheUst + 0.03, bz);
          const h0i = (i + n - 1) % n;
          const px = h[h0i * 2]! * o;
          const pz = h[h0i * 2 + 1]! * o;
          const pl = Math.hypot(ax - px, az - pz);
          if (pl > 1e-4 && ((ax - px) * (bx - ax) + (az - pz) * (bz - az)) / (pl * L) < 0.94) cizgi.push(ax, alt, az, ax, cepheUst + 0.03, az);
          // Cephe: pencereler duvar ortasına hizalı (u = 0 ilk pencere aralığının başı)
          const adet = aralik > 0 ? Math.floor((L - 0.8) / aralik) : 0;
          const u0 = adet > 0 ? -(L - adet * aralik) / 2 : 0;
          bina.cepheAyarla(u0, adet * aralik, aralik, t01, cepheUst);
          const a = bina.nokta(ax, alt, az, duvarS, gl);
          const d = bina.nokta(ax, cepheUst, az, duvarS, gl);
          bina.cepheAyarla(u0 + L, adet * aralik, aralik, t01, cepheUst);
          const b = bina.nokta(bx, alt, bz, duvarS, gl);
          const cc = bina.nokta(bx, cepheUst, bz, duvarS, gl);
          bina.uc(a, cc, b);
          bina.uc(a, d, cc);
          if (parapet > 0) {
            // Parapetin iç yüzü (üstten bakınca çatı çukurda kalır; arka yüz görünmez olmasın)
            bina.cepheAyarla(0, 0, 0, t01, cepheUst);
            const ia = bina.nokta(ax, ust, az, duvarS, 175);
            const ib = bina.nokta(bx, ust, bz, duvarS, 175);
            const ic = bina.nokta(bx, cepheUst, bz, duvarS, 175);
            const id = bina.nokta(ax, cepheUst, az, duvarS, 175);
            bina.uc(ia, ib, ic);
            bina.uc(ia, ic, id);
          }
        }
      }
      bina.cepheAyarla(0, 0, 0, t01, cepheUst);
      if (dort) kirmaCati(bina, cizgi, dort, ust, t01 < 0.36 ? S.CATI_KOYU_KIREMIT : S.CATI_KIREMIT);
      else duzCokgen(bina, k, o, ust, catiS, 255);
      for (const h of k) {
        for (let i = 0; i < h.length; i++) izNokta.push(h[i]! * o);
        izBas.push(izNokta.length / 2);
        izBina.push(binaNo);
        izUst.push(dort ? ust + 1 : cepheUst);
      }
      binaNo++;
      ist.bina++;
    }
  }

  const yerP = yer.bitir();
  const cizgiK = Float32Array.from(cizgi);
  const binaP = bina.bitir();
  ist.yerUcgen = yerP.indeks.length / 3;
  ist.binaUcgen = binaP.indeks.length / 3;
  return {
    yer: yerP,
    bina: binaP,
    cizgi: { konum: cizgiK, sinif: new Uint8Array(cizgiK.length / 3).fill(S.KENAR) },
    iz: { nokta: Float32Array.from(izNokta), halkaBas: Uint32Array.from(izBas), bina: Uint32Array.from(izBina), ust: Float32Array.from(izUst) },
    istatistik: ist,
  };
}

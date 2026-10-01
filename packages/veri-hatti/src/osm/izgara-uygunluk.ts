/**
 * Hücre uygunluğu: z15 vektör karosundaki şekiller (yol, su, askeri alan, bina, arazi kullanımı)
 * karonun 32x32 z20 hücresine örnekleme ile işlenir.
 *
 * Yöntem (deterministik, tamsayı ızgaralı): her hücre ORNEK x ORNEK alt noktaya bölünür; her alt
 * nokta için hangi katmanların içinde (poligon: çift-tek kuralı) ya da tampon mesafesinde (çizgi)
 * olduğu işaretlenir. Hücre başına katman sayacı = kapsayan alt nokta sayısı (0..ORNEK²).
 * Varsayılan engel kuralı: yol/su kapsaması >= %50, askeri alan herhangi kesişim (sayaç >= 1;
 * alt nokta aralığı ORNEK=8 için ~3,6 m @ 41°K).
 *
 * Şema: Protomaps Basemap v4 (https://docs.protomaps.com/basemaps/layers).
 */
import type { VectorTile } from "@mapbox/vector-tile";
import { EKVATOR_CEVRESI, KARO_HUCRE, ytenEnlem } from "./izgara-geometri";

/** Hücre başına sayılan katmanlar. */
export const Katman = {
  YOL: 0,
  SU: 1,
  ASKERI: 2,
  BINA: 3,
  TARLA: 4,
  SANAYI: 5,
  KONUT: 6,
  ORMAN: 7,
} as const;
export type KatmanKodu = (typeof Katman)[keyof typeof Katman];
export const KATMAN_SAYISI = 8;

/** Hücre arazi sınıfı (durum baytında 3 bit). */
export const Sinif = {
  DIGER: 0,
  TARLA: 1,
  SANAYI: 2,
  KONUT: 3,
  ORMAN: 4,
  /** Arazi etiketi yok ama bina örtüsü var (OSM'de landuse=residential eksik kentsel doku). */
  YAPILI: 5,
} as const;
export type SinifKodu = (typeof Sinif)[keyof typeof Sinif];
export const SINIF_ADLARI = ["diger", "tarla", "sanayi", "konut", "orman", "yapili"] as const;

/** Durum baytı bitleri. 0 = ilçe dışında. */
export const Bit = {
  ICERIDE: 1,
  YOL: 2,
  SU: 4,
  ASKERI: 8,
  BINA: 16,
} as const;
/** Bu bitlerden biri varsa hücre satın alınamaz. */
export const ENGEL_MASKESI = Bit.YOL | Bit.SU | Bit.ASKERI;

export const durumSinifi = (d: number): number => (d >> 5) & 7;
/**
 * Kota ve sayımlara giren hücre: ilçede ve su değil. Su hücreleri (karasuları, göl, nehir) ilçe/il
 * hücre kotalarında ve "toplam" sayımlarında hariç tutulur (karar, S6 sonrası).
 */
export const kotayaSayilir = (d: number): boolean => (d & Bit.ICERIDE) !== 0 && (d & Bit.SU) === 0;
export const satinAlinabilir = (d: number): boolean => (d & Bit.ICERIDE) !== 0 && (d & ENGEL_MASKESI) === 0;

export interface Nokta {
  x: number;
  y: number;
}

/** Karo koordinatında (0..extent) tek bir şekil. */
export interface KaroSekli {
  katman: KatmanKodu;
  tur: "poligon" | "cizgi";
  halkalar: Nokta[][];
  /** Yalnız çizgiler: merkez hattan her iki yana tampon (yer metresi). */
  tamponMetre: number;
}

export interface UygunlukSecenekleri {
  /** Ana yol (otoyol, devlet/il yolu, pist) tamponu, m (merkez hattan bir yana). */
  anaYolTamponM: number;
  /** Diğer yollar (mahalle, servis, demiryolu) tamponu, m. */
  digerYolTamponM: number;
  /** Akarsu/kanal çizgisi tamponu, m. */
  nehirTamponM: number;
  /** Hücre kenarı başına alt örnek sayısı. */
  ornek: number;
  /**
   * Engel eşikleri (alt örnek sayısı, 0..ornek²): sayaç >= eşik ise bit konur (1 = herhangi kesişim).
   * `ornek` değişirse eşikler de ölçeklenmelidir.
   */
  yolEsik: number;
  suEsik: number;
  askeriEsik: number;
  /** Arazi sınıfı için en baskın sınıfın asgari kapsama oranı (0..1). */
  sinifOrani: number;
  /** Etiketsiz hücrede "yapili" sınıfı için asgari bina kapsama oranı (0..1). */
  yapiliOrani: number;
}

export const VARSAYILAN_SECENEKLER: UygunlukSecenekleri = {
  anaYolTamponM: 12,
  digerYolTamponM: 6,
  nehirTamponM: 6,
  ornek: 8,
  // Karar (S6 sonrası, takım lideri): yol ve su hücrenin >= %50'sini kaplıyorsa engel (8x8 = 64 örnekte 32);
  // askeri alan her kesişimde engel. Kentte sokağa cephesi olan hücreler böylece alınabilir kalır.
  yolEsik: 32,
  suEsik: 32,
  askeriEsik: 1,
  sinifOrani: 0.3,
  yapiliOrani: 0.1,
};

// --- Protomaps v4 eşlemesi ---------------------------------------------------------------

const ANA_YOL_TURLERI = new Set(["highway", "major_road", "aeroway"]);
const DIGER_YOL_TURLERI = new Set(["minor_road", "other", "rail"]);
/** Yol sayılmayanlar: yaya/patika (path), feribot, kullanım dışı. */
const YOL_DISI_AYRINTI = new Set(["disused", "abandoned", "rest_area", "services"]);
const SU_POLIGON_DISI = new Set(["swimming_pool", "fountain"]);
const SU_CIZGI_TURLERI = new Set(["river", "canal"]);
const ARAZI_ESLEME: Record<string, KatmanKodu> = {
  military: Katman.ASKERI,
  naval_base: Katman.ASKERI,
  farmland: Katman.TARLA,
  farmyard: Katman.TARLA,
  orchard: Katman.TARLA,
  vineyard: Katman.TARLA,
  allotments: Katman.TARLA,
  meadow: Katman.TARLA,
  plant_nursery: Katman.TARLA,
  greenhouse_horticulture: Katman.TARLA,
  industrial: Katman.SANAYI,
  railway: Katman.SANAYI,
  quarry: Katman.SANAYI,
  brownfield: Katman.SANAYI,
  landfill: Katman.SANAYI,
  residential: Katman.KONUT,
  forest: Katman.ORMAN,
  wood: Katman.ORMAN,
};

const dogru = (v: unknown): boolean => v === true || v === "true" || v === 1;

/** Protomaps v4 karosundan uygunluk şekillerini çıkarır (öznitelik sırası karodaki sıradır). */
export function sekilleriAyikla(vt: VectorTile, s: UygunlukSecenekleri = VARSAYILAN_SECENEKLER): KaroSekli[] {
  const sonuc: KaroSekli[] = [];
  const ekle = (katman: KatmanKodu, tur: "poligon" | "cizgi", halkalar: Nokta[][], tamponMetre = 0): void => {
    sonuc.push({ katman, tur, halkalar, tamponMetre });
  };
  const yollar = vt.layers["roads"];
  if (yollar) {
    for (let i = 0; i < yollar.length; i++) {
      const f = yollar.feature(i);
      if (f.type !== 2 || dogru(f.properties["is_tunnel"])) continue;
      const tur = String(f.properties["kind"] ?? "");
      const ayrinti = String(f.properties["kind_detail"] ?? "");
      if (YOL_DISI_AYRINTI.has(ayrinti)) continue;
      if (ANA_YOL_TURLERI.has(tur)) ekle(Katman.YOL, "cizgi", f.loadGeometry(), s.anaYolTamponM);
      else if (DIGER_YOL_TURLERI.has(tur)) ekle(Katman.YOL, "cizgi", f.loadGeometry(), s.digerYolTamponM);
    }
  }
  const sular = vt.layers["water"];
  if (sular) {
    for (let i = 0; i < sular.length; i++) {
      const f = sular.feature(i);
      const tur = String(f.properties["kind"] ?? "");
      if (f.type === 3 && !SU_POLIGON_DISI.has(tur)) ekle(Katman.SU, "poligon", f.loadGeometry());
      else if (f.type === 2 && SU_CIZGI_TURLERI.has(tur) && Number(f.properties["layer"] ?? 0) >= 0)
        ekle(Katman.SU, "cizgi", f.loadGeometry(), s.nehirTamponM);
    }
  }
  const arazi = vt.layers["landuse"];
  if (arazi) {
    for (let i = 0; i < arazi.length; i++) {
      const f = arazi.feature(i);
      const k = ARAZI_ESLEME[String(f.properties["kind"] ?? "")];
      if (f.type === 3 && k !== undefined) ekle(k, "poligon", f.loadGeometry());
    }
  }
  const binalar = vt.layers["buildings"];
  if (binalar) {
    for (let i = 0; i < binalar.length; i++) {
      const f = binalar.feature(i);
      if (f.type === 3 && f.properties["kind"] === "building") ekle(Katman.BINA, "poligon", f.loadGeometry());
    }
  }
  return sonuc;
}

// --- Örnekleme -----------------------------------------------------------------------------

/** z15 karosunda karo biriminin yer metresi (karo merkez enleminde). */
export function metrePerBirim(z15y: number, extent: number): number {
  const enlem = ytenEnlem(z15y + 0.5, 15);
  return (EKVATOR_CEVRESI / 2 ** 15 / extent) * Math.cos((enlem * Math.PI) / 180);
}

/**
 * Şekilleri karonun 32x32 hücresine işler. Dönüş: hücre başına KATMAN_SAYISI sayaç
 * (indeks: (hy * 32 + hx) * KATMAN_SAYISI + katman), hy kuzeyden güneye.
 */
export function karoyuOrnekle(
  sekiller: readonly KaroSekli[],
  extent: number,
  mpb: number,
  ornek: number = VARSAYILAN_SECENEKLER.ornek,
): Uint8Array {
  if (ornek * ornek > 255) throw new Error("ornek^2 en fazla 255 olabilir");
  const R = KARO_HUCRE * ornek;
  const adim = extent / R;
  const raster = Array.from({ length: KATMAN_SAYISI }, () => new Uint8Array(R * R));
  const kesisimler: number[] = [];
  for (const s of sekiller) {
    const r = raster[s.katman]!;
    if (s.tur === "poligon") {
      let minY = Infinity;
      let maxY = -Infinity;
      for (const h of s.halkalar)
        for (const p of h) {
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
      const j0 = Math.max(0, Math.floor(minY / adim - 0.5));
      const j1 = Math.min(R - 1, Math.ceil(maxY / adim - 0.5));
      for (let j = j0; j <= j1; j++) {
        const yc = (j + 0.5) * adim;
        kesisimler.length = 0;
        for (const h of s.halkalar) {
          const n = h.length;
          for (let i = 0; i < n; i++) {
            // Halka kapalı olmayabilir: son -> ilk kenarı da dahil
            const a = h[i]!;
            const b = h[(i + 1) % n]!;
            if (a.y === b.y) continue;
            const alt = a.y < b.y ? a.y : b.y;
            const ust = a.y < b.y ? b.y : a.y;
            if (yc < alt || yc >= ust) continue;
            kesisimler.push(a.x + ((yc - a.y) / (b.y - a.y)) * (b.x - a.x));
          }
        }
        if (kesisimler.length < 2) continue;
        kesisimler.sort((p, q) => p - q);
        for (let k = 0; k + 1 < kesisimler.length; k += 2) {
          const i0 = Math.max(0, Math.ceil(kesisimler[k]! / adim - 0.5));
          const i1 = Math.min(R - 1, Math.ceil(kesisimler[k + 1]! / adim - 0.5) - 1);
          for (let i = i0; i <= i1; i++) r[j * R + i] = 1;
        }
      }
    } else {
      const yaricap = s.tamponMetre / mpb;
      const y2 = yaricap * yaricap;
      for (const h of s.halkalar) {
        for (let k = 0; k + 1 < h.length; k++) {
          const a = h[k]!;
          const b = h[k + 1]!;
          const i0 = Math.max(0, Math.ceil((Math.min(a.x, b.x) - yaricap) / adim - 0.5));
          const i1 = Math.min(R - 1, Math.floor((Math.max(a.x, b.x) + yaricap) / adim - 0.5));
          const j0 = Math.max(0, Math.ceil((Math.min(a.y, b.y) - yaricap) / adim - 0.5));
          const j1 = Math.min(R - 1, Math.floor((Math.max(a.y, b.y) + yaricap) / adim - 0.5));
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const l2 = dx * dx + dy * dy;
          for (let j = j0; j <= j1; j++) {
            const py = (j + 0.5) * adim;
            for (let i = i0; i <= i1; i++) {
              if (r[j * R + i]) continue;
              const px = (i + 0.5) * adim;
              let t = l2 === 0 ? 0 : ((px - a.x) * dx + (py - a.y) * dy) / l2;
              if (t < 0) t = 0;
              else if (t > 1) t = 1;
              const ex = a.x + t * dx - px;
              const ey = a.y + t * dy - py;
              if (ex * ex + ey * ey <= y2) r[j * R + i] = 1;
            }
          }
        }
      }
    }
  }
  const sayac = new Uint8Array(KARO_HUCRE * KARO_HUCRE * KATMAN_SAYISI);
  for (let k = 0; k < KATMAN_SAYISI; k++) {
    const r = raster[k]!;
    for (let j = 0; j < R; j++) {
      const hy = (j / ornek) | 0;
      for (let i = 0; i < R; i++) {
        if (r[j * R + i]) sayac[(hy * KARO_HUCRE + ((i / ornek) | 0)) * KATMAN_SAYISI + k]!++;
      }
    }
  }
  return sayac;
}

/** Hücre sayaçlarından durum baytı (ICERIDE biti dahil) ve bina yüzdesi. */
export function hucreDurumu(
  sayac: Uint8Array,
  ofset: number,
  s: UygunlukSecenekleri = VARSAYILAN_SECENEKLER,
): { durum: number; binaYuzde: number } {
  const toplam = s.ornek * s.ornek;
  const c = (k: KatmanKodu): number => sayac[ofset + k]!;
  let d: number = Bit.ICERIDE;
  if (c(Katman.YOL) >= s.yolEsik) d |= Bit.YOL;
  if (c(Katman.SU) >= s.suEsik) d |= Bit.SU;
  if (c(Katman.ASKERI) >= s.askeriEsik) d |= Bit.ASKERI;
  if (c(Katman.BINA) > 0) d |= Bit.BINA;
  // Sınıf: en baskın arazi katmanı (eşitlikte sabit sıra: tarla, sanayi, konut, orman)
  const adaylar: [KatmanKodu, SinifKodu][] = [
    [Katman.TARLA, Sinif.TARLA],
    [Katman.SANAYI, Sinif.SANAYI],
    [Katman.KONUT, Sinif.KONUT],
    [Katman.ORMAN, Sinif.ORMAN],
  ];
  let sinif: SinifKodu = Sinif.DIGER;
  let enCok = 0;
  for (const [k, sk] of adaylar) {
    if (c(k) > enCok) {
      enCok = c(k);
      sinif = sk;
    }
  }
  if (enCok < s.sinifOrani * toplam) {
    sinif = c(Katman.BINA) >= s.yapiliOrani * toplam ? Sinif.YAPILI : Sinif.DIGER;
  }
  d |= sinif << 5;
  return { durum: d, binaYuzde: Math.round((c(Katman.BINA) * 100) / toplam) };
}

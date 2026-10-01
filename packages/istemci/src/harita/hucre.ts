/**
 * z20 arsa hücresi matematiği (istemci; saf, DOM yok).
 *
 * Hücre = Web Mercator z20 karosu (~29 m @ 40,9°K). İki kimlik biçimi vardır:
 *   - Mülk sözleşmesi (packages/cekirdek/src/tipler.ts, S1 taslağı): `HucreId` = "x:y" (z20 karo koordinatı).
 *   - Izgara dosyası (S6, BHI1): 40 bitlik quadkey tamsayısı (Morton/Z-sırası, y biti üstte).
 * Bu dosya ikisi arasında dönüşüm yapar. Formüller packages/veri-hatti/src/osm/izgara-geometri.ts ile aynıdır
 * (o paket Node'a bağlı olduğundan istemcide yeniden yazıldı; test/harita-hucre.test.ts eşitliği sınar).
 *
 * BHI1 biçimi (packages/veri-hatti/src/osm/izgara-cikti.ts): 24 bayt başlık + durum düzlemi (+ isteğe bağlı bina
 * yüzdesi düzlemi). Durum baytı: bit0 içeride, bit1 yol, bit2 su, bit3 askeri, bit4 bina, bit5–7 arazi sınıfı.
 */

export const HUCRE_Z = 20;
const N = 2 ** HUCRE_Z;

export interface Hucre {
  x: number;
  y: number;
}

/** [batı, güney, doğu, kuzey] derece. */
export type Sinir = [number, number, number, number];

export function boylamdanX(boylam: number, z: number = HUCRE_Z): number {
  return ((boylam + 180) / 360) * 2 ** z;
}

export function enlemdenY(enlem: number, z: number = HUCRE_Z): number {
  const r = (enlem * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}

export function xtenBoylam(x: number, z: number = HUCRE_Z): number {
  return (x / 2 ** z) * 360 - 180;
}

export function ytenEnlem(y: number, z: number = HUCRE_Z): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/** Noktayı içeren z20 hücresi. */
export function noktadanHucre(boylam: number, enlem: number): Hucre {
  return { x: Math.floor(boylamdanX(boylam)), y: Math.floor(enlemdenY(enlem)) };
}

/** Hücrenin coğrafi sınırı. */
export function hucreSiniri(x: number, y: number): Sinir {
  return [xtenBoylam(x), ytenEnlem(y + 1), xtenBoylam(x + 1), ytenEnlem(y)];
}

/** Hücre merkezi [boylam, enlem]. */
export function hucreMerkezi(x: number, y: number): [number, number] {
  return [xtenBoylam(x + 0.5), ytenEnlem(y + 0.5)];
}

/** Hücre kenarı (m), hücre merkezinin enleminde. */
export function hucreKenariMetre(y: number): number {
  return (40_075_016.685_578_49 / N) * Math.cos((ytenEnlem(y + 0.5) * Math.PI) / 180);
}

// --- Kimlikler -------------------------------------------------------------------------------------------

/** Mülk sözleşmesindeki hücre kimliği: "x:y". */
export function hucreId(x: number, y: number): string {
  return `${x}:${y}`;
}

const ID_BICIMI = /^(\d{1,7}):(\d{1,7})$/;

/** "x:y" -> hücre. Biçim ya da aralık dışıysa null. */
export function idCoz(id: string): Hucre | null {
  const m = ID_BICIMI.exec(id);
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  if (x >= N || y >= N) return null;
  return { x, y };
}

/** Quadkey dizgesi (Bing): her basamak = (y biti << 1) | x biti, kökten yaprağa. */
export function quadkey(x: number, y: number, z: number = HUCRE_Z): string {
  let s = "";
  for (let i = z; i > 0; i--) {
    const m = 1 << (i - 1);
    s += String((x & m ? 1 : 0) + (y & m ? 2 : 0));
  }
  return s;
}

export function quadkeyCoz(q: string): Hucre & { z: number } {
  let x = 0;
  let y = 0;
  for (const c of q) {
    const d = c.charCodeAt(0) - 48;
    if (d < 0 || d > 3) throw new Error(`Geçersiz quadkey: ${q}`);
    x = x * 2 + (d & 1);
    y = y * 2 + (d >> 1);
  }
  return { x, y, z: q.length };
}

/** 40 bitlik hücre kimliği (BHI1 / S6 ızgarası). 2^53 altında: JS number ile güvenli. */
export function quadkeyTamsayi(x: number, y: number): number {
  let k = 0;
  for (let i = HUCRE_Z - 1; i >= 0; i--) k = k * 4 + (((y >>> i) & 1) << 1) + ((x >>> i) & 1);
  return k;
}

export function tamsayidanHucre(k: number): Hucre {
  if (!Number.isInteger(k) || k < 0 || k >= N * N) throw new Error(`Geçersiz hücre kimliği: ${k}`);
  let x = 0;
  let y = 0;
  let kalan = k;
  for (let i = 0; i < HUCRE_Z; i++) {
    const d = kalan % 4;
    kalan = Math.floor(kalan / 4);
    x |= (d & 1) << i;
    y |= (d >> 1) << i;
  }
  return { x, y };
}

/** "x:y" -> 40 bit quadkey tamsayısı. */
export function idtenQuadkey(id: string): number {
  const h = idCoz(id);
  if (!h) throw new Error(`Geçersiz hücre kimliği: ${id}`);
  return quadkeyTamsayi(h.x, h.y);
}

/** 40 bit quadkey tamsayısı -> "x:y". */
export function quadkeydenId(k: number): string {
  const h = tamsayidanHucre(k);
  return hucreId(h.x, h.y);
}

/** Arayüzde gösterilen kısa parsel adı: quadkey'in son 6 basamağı ("#A3F2" gibi kısa ve kararlı). */
export function kisaAd(id: string): string {
  const h = idCoz(id);
  if (!h) return id;
  return "#" + quadkeyTamsayi(h.x, h.y).toString(16).toUpperCase().slice(-5);
}

// --- BHI1 ---------------------------------------------------------------------------------------------

export const Bit = { ICERIDE: 1, YOL: 2, SU: 4, ASKERI: 8, BINA: 16 } as const;
export const ENGEL_MASKESI = Bit.YOL | Bit.SU | Bit.ASKERI;
/** Arazi sınıfı adları (durum baytı bit5–7 sırası). */
export const ARAZI_ADLARI = ["Diğer", "Tarla", "Sanayi", "Konut", "Orman", "Yapılı"] as const;

export const durumSinifi = (d: number): number => (d >> 5) & 7;
export const satinAlinabilir = (d: number): boolean => (d & Bit.ICERIDE) !== 0 && (d & ENGEL_MASKESI) === 0;
/** Kota sayımına giren hücre: ilçede ve su değil (S6 kararı: karasuları/göller kotada sayılmaz). */
export const kotayaSayilir = (d: number): boolean => (d & Bit.ICERIDE) !== 0 && (d & Bit.SU) === 0;

export interface Izgara {
  x0: number;
  y0: number;
  genislik: number;
  yukseklik: number;
  durum: Uint8Array;
}

/** Ham (gzip'i açılmış) BHI1 baytlarını çözer. */
export function bhiCoz(t: Uint8Array): Izgara {
  if (t.length < 24) throw new Error("BHI1 çok kısa");
  const sihir = String.fromCharCode(t[0]!, t[1]!, t[2]!, t[3]!);
  if (sihir !== "BHI1") throw new Error(`BHI1 değil: ${sihir}`);
  const v = new DataView(t.buffer, t.byteOffset, t.byteLength);
  if (v.getUint8(4) !== HUCRE_Z || v.getUint8(5) !== 1) throw new Error("Desteklenmeyen BHI sürümü");
  const duzlem = v.getUint16(6, true);
  const x0 = v.getUint32(8, true);
  const y0 = v.getUint32(12, true);
  const genislik = v.getUint32(16, true);
  const yukseklik = v.getUint32(20, true);
  const n = genislik * yukseklik;
  if (t.length !== 24 + n * duzlem) throw new Error("BHI1 boyutu tutarsız");
  return { x0, y0, genislik, yukseklik, durum: t.subarray(24, 24 + n) };
}

/** Hücrenin durum baytı (çerçeve dışı = 0). */
export function durumAl(iz: Izgara, x: number, y: number): number {
  const dx = x - iz.x0;
  const dy = y - iz.y0;
  if (dx < 0 || dy < 0 || dx >= iz.genislik || dy >= iz.yukseklik) return 0;
  return iz.durum[dy * iz.genislik + dx]!;
}

/** Izgaranın coğrafi sınırı. */
export function izgaraSiniri(iz: Izgara): Sinir {
  return [xtenBoylam(iz.x0), ytenEnlem(iz.y0 + iz.yukseklik), xtenBoylam(iz.x0 + iz.genislik), ytenEnlem(iz.y0)];
}

export interface IzgaraSayimi {
  /** İçeride ve su değil (kota paydası). */
  kota: number;
  /** Satın alınabilir. */
  uygun: number;
}

export function izgaraSay(iz: Izgara): IzgaraSayimi {
  let kota = 0;
  let uygun = 0;
  for (let i = 0; i < iz.durum.length; i++) {
    const d = iz.durum[i]!;
    if (kotayaSayilir(d)) kota++;
    if (satinAlinabilir(d)) uygun++;
  }
  return { kota, uygun };
}

/** Satın alınamama nedeni (uygunsa null). Öncelik: ilçe dışı > su > askeri > yol. */
export function engelNedeni(d: number): string | null {
  if (!(d & Bit.ICERIDE)) return "İlçe sınırı dışında";
  if (d & Bit.SU) return "Su: göl, nehir ya da deniz";
  if (d & Bit.ASKERI) return "Askerî alan";
  if (d & Bit.YOL) return "Yol tamponu";
  return null;
}

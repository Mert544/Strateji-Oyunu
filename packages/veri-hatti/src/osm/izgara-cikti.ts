/**
 * Izgara çıktı biçimleri.
 *
 * (b) Sunucu/çekirdek: "BHI1" ikili (ilçe başına tek dosya, gzip'li). Maske çerçevesinde yoğun,
 *     satır-öncelikli iki düzlem: durum baytı + bina yüzdesi. Arama O(1): i = (y-y0)*genislik + (x-x0).
 *     Başlık (24 bayt, küçük-sonlu):
 *       0  "BHI1"           4  u8 z (=20)        5  u8 surum (=1)   6  u16 duzlem sayisi (1|2)
 *       8  u32 x0           12 u32 y0            16 u32 genislik    20 u32 yukseklik
 *     Durum baytı: bit0 içeride, bit1 yol, bit2 su, bit3 askeri, bit4 bina, bit5-7 sınıf.
 * (a) İstemci: tippecanoe girdisi GeoJSONSeq — "hucre" (hücre başına kare, id = hücre kimliği) ya da
 *     "serit" (aynı durumlu ardışık hücrelerin yatay şeritleri; hücre kimliği tıklanan noktadan hesaplanır).
 */
import { closeSync, openSync, writeSync } from "node:fs";
import { crc32, deflateSync, gzipSync } from "node:zlib";
import { HUCRE_Z, hucreKimligi, xtenBoylam, ytenEnlem } from "./izgara-geometri";
import type { IcerdeMaskesi } from "./izgara-sinir";
import { Bit, ENGEL_MASKESI, durumSinifi } from "./izgara-uygunluk";

export const BHI_SIHIR = "BHI1";
const BASLIK = 24;

export interface IkiliIzgara {
  x0: number;
  y0: number;
  genislik: number;
  yukseklik: number;
  durum: Uint8Array;
  binaYuzde?: Uint8Array;
}

/** Ham (sıkıştırılmamış) BHI1 baytları. */
export function ikiliKodla(iz: IkiliIzgara): Uint8Array {
  const n = iz.genislik * iz.yukseklik;
  if (iz.durum.length !== n) throw new Error("durum boyutu cerceveyle uyusmuyor");
  const duzlem = iz.binaYuzde ? 2 : 1;
  const t = new Uint8Array(BASLIK + n * duzlem);
  const v = new DataView(t.buffer);
  for (let i = 0; i < 4; i++) t[i] = BHI_SIHIR.charCodeAt(i);
  v.setUint8(4, HUCRE_Z);
  v.setUint8(5, 1);
  v.setUint16(6, duzlem, true);
  v.setUint32(8, iz.x0, true);
  v.setUint32(12, iz.y0, true);
  v.setUint32(16, iz.genislik, true);
  v.setUint32(20, iz.yukseklik, true);
  t.set(iz.durum, BASLIK);
  if (iz.binaYuzde) t.set(iz.binaYuzde, BASLIK + n);
  return t;
}

export function ikiliCoz(t: Uint8Array): IkiliIzgara {
  const sihir = String.fromCharCode(t[0]!, t[1]!, t[2]!, t[3]!);
  if (sihir !== BHI_SIHIR) throw new Error(`BHI1 degil: ${sihir}`);
  const v = new DataView(t.buffer, t.byteOffset, t.byteLength);
  if (v.getUint8(4) !== HUCRE_Z || v.getUint8(5) !== 1) throw new Error("Desteklenmeyen BHI surumu");
  const duzlem = v.getUint16(6, true);
  const iz: IkiliIzgara = {
    x0: v.getUint32(8, true),
    y0: v.getUint32(12, true),
    genislik: v.getUint32(16, true),
    yukseklik: v.getUint32(20, true),
    durum: new Uint8Array(0),
  };
  const n = iz.genislik * iz.yukseklik;
  if (t.length !== BASLIK + n * duzlem) throw new Error("BHI1 boyutu tutarsiz");
  iz.durum = t.slice(BASLIK, BASLIK + n);
  if (duzlem === 2) iz.binaYuzde = t.slice(BASLIK + n, BASLIK + 2 * n);
  return iz;
}

/** gzip -9 (Node zlib: başlıkta zaman damgası yok -> deterministik). */
export function sikistir(t: Uint8Array): Uint8Array {
  return new Uint8Array(gzipSync(t, { level: 9 }));
}

/** Hücrenin durum baytı (çerçeve dışı = 0). */
export function durumAl(iz: IkiliIzgara, x: number, y: number): number {
  const dx = x - iz.x0;
  const dy = y - iz.y0;
  if (dx < 0 || dy < 0 || dx >= iz.genislik || dy >= iz.yukseklik) return 0;
  return iz.durum[dy * iz.genislik + dx]!;
}

const yuvarla = (v: number): number => Math.round(v * 1e7) / 1e7;

function dikdortgen(xa: number, xb: number, y: number): number[][][] {
  const b = yuvarla(xtenBoylam(xa));
  const d = yuvarla(xtenBoylam(xb));
  const k = yuvarla(ytenEnlem(y));
  const g = yuvarla(ytenEnlem(y + 1));
  return [
    [
      [b, g],
      [d, g],
      [d, k],
      [b, k],
      [b, g],
    ],
  ];
}

function ozellikler(d: number): { s: number; u: number; e: number } {
  return { s: durumSinifi(d), u: d & ENGEL_MASKESI ? 0 : 1, e: (d & (ENGEL_MASKESI | Bit.BINA)) >> 1 };
}

/**
 * GeoJSONSeq yazar (satır başına bir Feature). Dönüş: yazılan özellik sayısı.
 * kip "hucre": her içeride hücre bir kare, `id` = hücre kimliği, `b` = bina yüzdesi.
 * kip "serit": aynı durum baytına sahip ardışık hücreler tek dikdörtgen.
 */
export function geojsonSeqYaz(
  yol: string,
  maske: IcerdeMaskesi,
  durum: Uint8Array,
  binaYuzde: Uint8Array,
  kip: "hucre" | "serit",
): number {
  const fd = openSync(yol, "w");
  let tampon = "";
  let sayi = 0;
  const bosalt = (zorla: boolean): void => {
    if (zorla || tampon.length > 1 << 20) {
      writeSync(fd, tampon);
      tampon = "";
    }
  };
  const { x0, y0, genislik, yukseklik } = maske;
  for (let s = 0; s < yukseklik; s++) {
    const y = y0 + s;
    let i = 0;
    while (i < genislik) {
      const d = durum[s * genislik + i]!;
      if (!(d & Bit.ICERIDE)) {
        i++;
        continue;
      }
      if (kip === "hucre") {
        const x = x0 + i;
        const oz = { ...ozellikler(d), b: binaYuzde[s * genislik + i]! };
        tampon += `${JSON.stringify({ type: "Feature", id: hucreKimligi(x, y), properties: oz, geometry: { type: "Polygon", coordinates: dikdortgen(x, x + 1, y) } })}\n`;
        i++;
      } else {
        let j = i + 1;
        while (j < genislik && durum[s * genislik + j] === d) j++;
        tampon += `${JSON.stringify({ type: "Feature", properties: ozellikler(d), geometry: { type: "Polygon", coordinates: dikdortgen(x0 + i, x0 + j, y) } })}\n`;
        i = j;
      }
      sayi++;
      bosalt(false);
    }
  }
  bosalt(true);
  closeSync(fd);
  return sayi;
}

// --- Önizleme (yalnız göz denetimi; oyun verisi değil) -------------------------------------

const ONIZLEME_RENK: Record<number, [number, number, number]> = {
  0: [200, 200, 200], // diğer
  1: [230, 210, 120], // tarla
  2: [150, 120, 170], // sanayi
  3: [240, 150, 120], // konut
  4: [70, 140, 70], // orman
  5: [220, 170, 150], // yapılı
};

function onizlemeRengi(d: number): [number, number, number] {
  if (!(d & Bit.ICERIDE)) return [255, 255, 255];
  if (d & Bit.SU) return [60, 110, 220];
  if (d & Bit.YOL) return [30, 30, 30];
  if (d & Bit.ASKERI) return [200, 0, 0];
  return ONIZLEME_RENK[durumSinifi(d)] ?? [255, 0, 255];
}

/** Durum düzlemini 1 hücre = 1 piksel RGB PNG olarak kodlar (deterministik). */
export function onizlemePng(genislik: number, yukseklik: number, durum: Uint8Array): Uint8Array {
  const satir = genislik * 3 + 1;
  const ham = new Uint8Array(satir * yukseklik);
  for (let y = 0; y < yukseklik; y++) {
    for (let x = 0; x < genislik; x++) {
      const [r, g, b] = onizlemeRengi(durum[y * genislik + x]!);
      const o = y * satir + 1 + x * 3;
      ham[o] = r;
      ham[o + 1] = g;
      ham[o + 2] = b;
    }
  }
  const parca = (tur: string, veri: Uint8Array): Uint8Array => {
    const t = new Uint8Array(12 + veri.length);
    const v = new DataView(t.buffer);
    v.setUint32(0, veri.length);
    for (let i = 0; i < 4; i++) t[4 + i] = tur.charCodeAt(i);
    t.set(veri, 8);
    v.setUint32(8 + veri.length, crc32(t.subarray(4, 8 + veri.length)));
    return t;
  };
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, genislik);
  hv.setUint32(4, yukseklik);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const parcalar = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    parca("IHDR", ihdr),
    parca("IDAT", new Uint8Array(deflateSync(ham, { level: 9 }))),
    parca("IEND", new Uint8Array(0)),
  ];
  const sonuc = new Uint8Array(parcalar.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parcalar) {
    sonuc.set(p, o);
    o += p.length;
  }
  return sonuc;
}

/**
 * Yerel PMTiles (v3) okuyucu: başlık, dizin gezinme ve karo okuma.
 *
 * `pmtiles` paketi uzak/tarayıcı kullanımına odaklı ve dizin girdilerini (karo başına sıkıştırılmış
 * bayt boyutu) dışa açmıyor; ölçüm için tüm girdileri gezmemiz gerektiğinden dizin çözümü burada
 * (spesifikasyon: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md). Başlık çözümü
 * paketin `bytesToHeader` işleviyle yapılır.
 */
import { closeSync, openSync, readSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { PbfReader } from "pbf";
import { VectorTile } from "@mapbox/vector-tile";
import { bytesToHeader, tileIdToZxy, zxyToTileId, type Header } from "pmtiles";

/** Dizin girdisi (spesifikasyondaki Entry). */
export interface DizinGirdisi {
  karoKimligi: number;
  ofset: number;
  uzunluk: number;
  /** 0: alt dizin işaretçisi; >=1: ardışık karo kimliği sayısı (aynı içerik). */
  tekrar: number;
}

/** Çözülmüş karo adresi + sıkıştırılmış bayt boyutu. */
export interface KaroKaydi {
  z: number;
  x: number;
  y: number;
  /** Karo verisi içindeki ofset (tileDataOffset'e göre). */
  ofset: number;
  /** Sıkıştırılmış (gzip) bayt. */
  bayt: number;
}

function varintOku(tampon: Uint8Array, konum: { i: number }): number {
  // 2^53'e kadar güvenli: çarpma ile (bit kaydırma 32 bitte taşar)
  let sonuc = 0;
  let carpan = 1;
  for (;;) {
    const b = tampon[konum.i++];
    if (b === undefined) throw new Error("PMTiles dizini: beklenmedik son");
    sonuc += (b & 0x7f) * carpan;
    if (b < 0x80) return sonuc;
    carpan *= 128;
  }
}

/** Sıkıştırması açılmış dizin baytlarını girdilere çevirir. */
export function dizinCoz(veri: Uint8Array): DizinGirdisi[] {
  const k = { i: 0 };
  const n = varintOku(veri, k);
  const girdiler: DizinGirdisi[] = [];
  let son = 0;
  for (let i = 0; i < n; i++) {
    son += varintOku(veri, k);
    girdiler.push({ karoKimligi: son, ofset: 0, uzunluk: 0, tekrar: 1 });
  }
  for (const g of girdiler) g.tekrar = varintOku(veri, k);
  for (const g of girdiler) g.uzunluk = varintOku(veri, k);
  for (let i = 0; i < n; i++) {
    const g = girdiler[i]!;
    const deger = varintOku(veri, k);
    if (deger === 0 && i > 0) {
      const onceki = girdiler[i - 1]!;
      g.ofset = onceki.ofset + onceki.uzunluk;
    } else {
      g.ofset = deger - 1;
    }
  }
  return girdiler;
}

/** Yerel dosyadan okuyan PMTiles arşivi. */
export class YerelPmtiles {
  readonly baslik: Header;
  private readonly fd: number;
  private kayitlar: KaroKaydi[] | null = null;
  private dizin: Map<number, KaroKaydi> | null = null;

  constructor(readonly yol: string) {
    this.fd = openSync(yol, "r");
    const bas = this.oku(0, 127);
    this.baslik = bytesToHeader(bas.buffer.slice(bas.byteOffset, bas.byteOffset + bas.byteLength) as ArrayBuffer);
    if (this.baslik.specVersion !== 3) throw new Error(`Desteklenmeyen PMTiles surumu: ${this.baslik.specVersion}`);
  }

  kapat(): void {
    closeSync(this.fd);
  }

  private oku(ofset: number, uzunluk: number): Uint8Array {
    const t = new Uint8Array(uzunluk);
    let okunan = 0;
    while (okunan < uzunluk) {
      const r = readSync(this.fd, t, okunan, uzunluk - okunan, ofset + okunan);
      if (r === 0) throw new Error(`PMTiles: dosya erken bitti (${this.yol})`);
      okunan += r;
    }
    return t;
  }

  private ic(veri: Uint8Array, sikistirma: number): Uint8Array {
    // Compression: 1 none, 2 gzip (Protomaps yapıları gzip kullanır)
    if (sikistirma === 1) return veri;
    if (sikistirma === 2) return new Uint8Array(gunzipSync(veri));
    throw new Error(`Desteklenmeyen sikistirma: ${sikistirma}`);
  }

  /** JSON metaveri (Protomaps: version, vector_layers, planetiler:* ...). */
  metaveri(): Record<string, unknown> {
    const b = this.baslik;
    if (b.jsonMetadataLength === 0) return {};
    const v = this.ic(this.oku(b.jsonMetadataOffset, b.jsonMetadataLength), b.internalCompression);
    return JSON.parse(new TextDecoder().decode(v)) as Record<string, unknown>;
  }

  /** Tüm karo kayıtları (tekrarlar açılmış), karo kimliğine göre sıralı. */
  tumKarolar(): KaroKaydi[] {
    if (this.kayitlar) return this.kayitlar;
    const b = this.baslik;
    const sonuc: KaroKaydi[] = [];
    const gez = (ofset: number, uzunluk: number): void => {
      const girdiler = dizinCoz(this.ic(this.oku(ofset, uzunluk), b.internalCompression));
      for (const g of girdiler) {
        if (g.tekrar === 0) {
          gez(b.leafDirectoryOffset + g.ofset, g.uzunluk);
          continue;
        }
        for (let r = 0; r < g.tekrar; r++) {
          const [z, x, y] = tileIdToZxy(g.karoKimligi + r);
          sonuc.push({ z, x, y, ofset: g.ofset, bayt: g.uzunluk });
        }
      }
    };
    gez(b.rootDirectoryOffset, b.rootDirectoryLength);
    this.kayitlar = sonuc;
    return sonuc;
  }

  kayit(z: number, x: number, y: number): KaroKaydi | undefined {
    if (!this.dizin) {
      this.dizin = new Map();
      for (const k of this.tumKarolar()) this.dizin.set(zxyToTileId(k.z, k.x, k.y), k);
    }
    return this.dizin.get(zxyToTileId(z, x, y));
  }

  /** Karonun sıkıştırması açılmış MVT baytları (yoksa undefined). */
  karoBaytlari(z: number, x: number, y: number): Uint8Array | undefined {
    const k = this.kayit(z, x, y);
    if (!k) return undefined;
    return this.ic(this.oku(this.baslik.tileDataOffset + k.ofset, k.bayt), this.baslik.tileCompression);
  }

  vektorKaro(z: number, x: number, y: number): VectorTile | undefined {
    const v = this.karoBaytlari(z, x, y);
    return v ? new VectorTile(new PbfReader(v)) : undefined;
  }
}

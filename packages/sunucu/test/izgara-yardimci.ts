/**
 * Arsa ızgarası testlerinin ortak yardımcıları: küçük, sentetik BHI1 üretici (tek dosya << 1 MB), manifest yazıcı ve test kod çözücüsü.
 * Kod çözücü `@bolge/veri` `bhiCoz`/`izgaraSay` ile aynı biçimi (24 bayt başlık + durum düzlemi) uygular; bağlanınca gerçek çözücüye geçilir.
 */
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import type { CozulmusIzgara, IzgaraBagimliliklari, IzgaraManifesti } from "../src/izgara/manifest";

export const ICERIDE = 1;
export const YOL = 2;
export const SU = 4;
export const ASKERI = 8;

/** BHI1 baytları (gzip'siz): "BHI1", z20, sürüm 1, düzlem 1, x0, y0, genişlik, yükseklik (u32 LE), durum düzlemi. */
export function bhiBaytlari(x0: number, y0: number, genislik: number, yukseklik: number, durum: Uint8Array): Uint8Array {
  const b = Buffer.alloc(24 + durum.length);
  b.write("BHI1", 0, "ascii");
  b.writeUInt8(20, 4);
  b.writeUInt8(1, 5);
  b.writeUInt16LE(1, 6);
  b.writeUInt32LE(x0, 8);
  b.writeUInt32LE(y0, 12);
  b.writeUInt32LE(genislik, 16);
  b.writeUInt32LE(yukseklik, 20);
  b.set(durum, 24);
  return new Uint8Array(b);
}

/** Deterministik sentetik durum düzlemi: çoğu hücre içeride; her 7. hücre yol, her 11. su (ikisi de engel); her 13. içeride değil. */
export function sentetikDurum(genislik: number, yukseklik: number, tohum: number): Uint8Array {
  const d = new Uint8Array(genislik * yukseklik);
  for (let i = 0; i < d.length; i++) {
    const n = i + tohum;
    let b = n % 13 === 0 ? 0 : ICERIDE;
    if (b !== 0 && n % 7 === 0) b |= YOL;
    else if (b !== 0 && n % 11 === 0) b |= SU;
    d[i] = b;
  }
  return d;
}

export const testCozucusu: IzgaraBagimliliklari = {
  coz(t: Uint8Array): CozulmusIzgara {
    if (t.length < 24) throw new Error("BHI1 cok kisa");
    const sihir = String.fromCharCode(t[0] as number, t[1] as number, t[2] as number, t[3] as number);
    if (sihir !== "BHI1") throw new Error(`BHI1 degil: ${sihir}`);
    const v = new DataView(t.buffer, t.byteOffset, t.byteLength);
    const genislik = v.getUint32(16, true);
    const yukseklik = v.getUint32(20, true);
    const duzlem = v.getUint16(6, true);
    if (t.length !== 24 + genislik * yukseklik * duzlem) throw new Error("BHI1 boyutu tutarsiz");
    return { x0: v.getUint32(8, true), y0: v.getUint32(12, true), genislik, yukseklik, durum: t.subarray(24, 24 + genislik * yukseklik) };
  },
  say(ig: CozulmusIzgara): { hucre: number; uygun: number } {
    let hucre = 0;
    let uygun = 0;
    for (const b of ig.durum) {
      if ((b & ICERIDE) === 0) continue;
      hucre++;
      if ((b & (YOL | SU | ASKERI)) === 0) uygun++;
    }
    return { hucre, uygun };
  },
};

export interface TestIlcesi {
  kimlik: string;
  ad: string;
  il: string;
  x0: number;
  y0: number;
  genislik: number;
  yukseklik: number;
  tohum: number;
}

export const ILCELER: TestIlcesi[] = [
  { kimlik: "tr_16_gemlik", ad: "Gemlik", il: "tr_16", x0: 600, y0: 400, genislik: 40, yukseklik: 30, tohum: 3 },
  { kimlik: "tr_41_korfez", ad: "Korfez", il: "tr_41", x0: 700, y0: 410, genislik: 25, yukseklik: 20, tohum: 5 },
];

export interface IzgaraDizini {
  kok: string;
  manifestYolu: string;
  manifest: IzgaraManifesti;
  /** Ham manifest nesnesi (testler bozup yeniden yazar). */
  ham: { surum: number; hucreZ: number; ilceler: Array<Record<string, unknown>> };
  yaz(): Promise<void>;
  temizle(): Promise<void>;
}

/** `<gecici>/odbl/izgara/` altında manifest + gzip'li BHI1 dosyaları kurar (yollar `odbl/` köküne göredir: `izgara/<kimlik>.bhi.gz`). */
export async function izgaraDizini(ilceler: TestIlcesi[] = ILCELER): Promise<IzgaraDizini> {
  const kok = await mkdtemp(join(tmpdir(), "bolge-izgara-"));
  await mkdir(join(kok, "izgara"), { recursive: true });
  const ham: IzgaraDizini["ham"] = { surum: 1, hucreZ: 20, ilceler: [] };
  const dosyalar = new Map<string, Buffer>();
  for (const c of ilceler) {
    const durum = sentetikDurum(c.genislik, c.yukseklik, c.tohum);
    const raw = bhiBaytlari(c.x0, c.y0, c.genislik, c.yukseklik, durum);
    const gz = gzipSync(raw);
    const yol = `izgara/${c.kimlik}.bhi.gz`;
    dosyalar.set(yol, gz);
    const say = testCozucusu.say({ x0: c.x0, y0: c.y0, genislik: c.genislik, yukseklik: c.yukseklik, durum });
    ham.ilceler.push({
      kimlik: c.kimlik,
      ad: c.ad,
      il: c.il,
      bhi: { yol, bayt: gz.length, sha256: createHash("sha256").update(gz).digest("hex"), hamBayt: raw.length },
      cerceve: { x0: c.x0, y0: c.y0, genislik: c.genislik, yukseklik: c.yukseklik },
      hucre: { icerde: say.hucre, uygun: say.uygun },
    });
  }
  const manifestYolu = join(kok, "izgara", "manifest.json");
  const d: IzgaraDizini = {
    kok,
    manifestYolu,
    manifest: ham as unknown as IzgaraManifesti,
    ham,
    async yaz() {
      for (const [yol, b] of dosyalar) await writeFile(join(kok, yol), b);
      await writeFile(manifestYolu, JSON.stringify(ham, null, 2));
    },
    async temizle() {
      await rm(kok, { recursive: true, force: true });
    },
  };
  await d.yaz();
  return d;
}

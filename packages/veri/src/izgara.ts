/**
 * Arsa ızgarası (BHI1) okuyucusu ve durum baytı eşlemesi (G3b; docs/06 §15.11).
 *
 * BHI1 (`packages/veri-hatti/src/osm/izgara-cikti.ts`): 24 bayt başlık + durum düzlemi (+ isteğe bağlı bina yüzdesi düzlemi).
 * Başlık: sihir "BHI1", z (20), sürüm (1), düzlem sayısı (u16), x0, y0, genişlik, yükseklik (u32; hepsi küçük uçlu).
 * Durum baytı: bit0 içeride, bit1 yol, bit2 su, bit3 askeri, bit4 bina, bit5-7 arazi sınıfı (0 diğer, 1 tarla, 2 sanayi, 3 konut, 4 orman, 5 yapılı).
 *
 * SAF modül: girdi AÇILMIŞ (gzip'siz) bayt dizisidir (`Uint8Array`); gzip açma kenarlardadır (sunucuda `zlib`, istemcide tarayıcı API'si).
 * Node modülü ya da bağımlılık YOKTUR; tarayıcıda ve işçide çalışır. Yalnız tamsayı işlemleri.
 *
 * İstemcideki `harita/hucre.ts` `bhiCoz`/`durumSinifi` ve `harita/fiyat.ts` `arsaSinifi` ile EŞDEĞERDİR (`veri/test/izgara.test.ts` aynı baytlar için
 * aynı çıktıyı sınar). Çekirdek (`@bolge/veri`'den çalışma zamanı importu yapmaz) bayt eşlemesinin kendi kopyasını taşır; `cekirdek/test` bu modülle
 * 256 baytın hepsinde eşitliği sınar.
 */
import type { ArsaSinifi, HucreEngeli, IlceSeviyesi, ParselMahalleTanimi } from "./parsel";

/** Izgara karo düzeyi (z20). */
export const IZGARA_Z = 20;

/** Durum baytı bitleri. */
export const Bit = { ICERIDE: 1, YOL: 2, SU: 4, ASKERI: 8, BINA: 16 } as const;
/** Satın alınmayı engelleyen bitler. */
export const ENGEL_MASKESI = Bit.YOL | Bit.SU | Bit.ASKERI;
/** Arazi sınıfı adları (durum baytı bit5–7 sırası). */
export const ARAZI_ADLARI = ["Diğer", "Tarla", "Sanayi", "Konut", "Orman", "Yapılı"] as const;

/** Ham BHI1 çözümü: çerçeve (x0, y0, genislik, yukseklik) ve durum düzlemi (satır öncelikli, y artan, x artan). */
export interface Izgara {
  x0: number;
  y0: number;
  genislik: number;
  yukseklik: number;
  durum: Uint8Array;
}

/** Ham (gzip'i açılmış) BHI1 baytlarını çözer. Durum düzlemi girdinin `subarray`'idir (kopyalanmaz). */
export function bhiCoz(t: Uint8Array): Izgara {
  if (t.length < 24) throw new Error("BHI1 çok kısa");
  const sihir = String.fromCharCode(t[0] as number, t[1] as number, t[2] as number, t[3] as number);
  if (sihir !== "BHI1") throw new Error(`BHI1 değil: ${sihir}`);
  const v = new DataView(t.buffer, t.byteOffset, t.byteLength);
  if (v.getUint8(4) !== IZGARA_Z || v.getUint8(5) !== 1) throw new Error("Desteklenmeyen BHI sürümü");
  const duzlem = v.getUint16(6, true);
  const x0 = v.getUint32(8, true);
  const y0 = v.getUint32(12, true);
  const genislik = v.getUint32(16, true);
  const yukseklik = v.getUint32(20, true);
  const n = genislik * yukseklik;
  if (t.length !== 24 + n * duzlem) throw new Error("BHI1 boyutu tutarsız");
  return { x0, y0, genislik, yukseklik, durum: t.subarray(24, 24 + n) };
}

/** Durum baytından arazi sınıfı (0..7). */
export const durumSinifi = (d: number): number => (d >> 5) & 7;

/** İlçe içinde ve engelsiz (satın alınabilir) mi? */
export const satinAlinabilir = (d: number): boolean => (d & Bit.ICERIDE) !== 0 && (d & ENGEL_MASKESI) === 0;

/**
 * Arsa sınıfı: arazi sınıfı konut (3) ya da yapılı (5) ise şehir; sanayi (2) ya da bina biti varsa kasaba; kalanı kırsal
 * (istemci `harita/fiyat.ts` `arsaSinifi` ile aynı).
 */
export function arsaSinifi(d: number): ArsaSinifi {
  const s = durumSinifi(d);
  if (s === 3 || s === 5) return "sehir";
  if (s === 2 || (d & Bit.BINA) !== 0) return "kasaba";
  return "kirsal";
}

/** Engel nedeni: su > askeri > yol (parsel fikstürü üreticisiyle aynı öncelik); engelsizse tanımsız. */
export function engelAdi(d: number): HucreEngeli | undefined {
  if ((d & Bit.SU) !== 0) return "su";
  if ((d & Bit.ASKERI) !== 0) return "askeri";
  if ((d & Bit.YOL) !== 0) return "yol";
  return undefined;
}

/** İlçenin sınıfı: içerideki hücrelerin en yüksek arsa sınıfı (kırsal < kasaba < şehir); içeride hücre yoksa kırsal. */
export function ilceSinifiTuret(ig: Izgara): ArsaSinifi {
  let en = 0;
  const d = ig.durum;
  for (let i = 0; i < d.length; i++) {
    const b = d[i] as number;
    if ((b & Bit.ICERIDE) === 0) continue;
    const s = arsaSinifi(b);
    const sira = s === "sehir" ? 2 : s === "kasaba" ? 1 : 0;
    if (sira > en) {
      en = sira;
      if (en === 2) break;
    }
  }
  return en === 2 ? "sehir" : en === 1 ? "kasaba" : "kirsal";
}

/** İlçe sınıfından başlangıç seviyesi (Gebze örneğindeki kural): şehir 3, kasaba 1, kırsal 0. */
export function ilceSeviyesiTuret(sinif: ArsaSinifi): IlceSeviyesi {
  return sinif === "sehir" ? 3 : sinif === "kasaba" ? 1 : 0;
}

/** Izgaranın içerideki (ilçe sınırı içi) ve uygun (satın alınabilir) hücre sayıları. */
export function izgaraSay(ig: Izgara): { hucre: number; uygun: number } {
  let hucre = 0;
  let uygun = 0;
  const d = ig.durum;
  for (let i = 0; i < d.length; i++) {
    const b = d[i] as number;
    if ((b & Bit.ICERIDE) === 0) continue;
    hucre++;
    if ((b & ENGEL_MASKESI) === 0) uygun++;
  }
  return { hucre, uygun };
}

// ---------------------------------------------------------------------------
// Çekirdek girdisi: ızgaradan parsel dünyası
// ---------------------------------------------------------------------------

/** Izgaradan kurulan bir ilçe: kimlik, il bağı ve BHI1 çözümü. `sinif`/`seviye` yoksa ızgaradan türetilir (`ilceSinifiTuret`, `ilceSeviyesiTuret`). */
export interface ParselIzgaraIlce {
  id: string;
  ad: string;
  /** Ebeveyn il kimliği (`ParselIzgaraGirdisi.iller`). */
  il: string;
  /** İlin bölgesiyle aynı bölge kimliği. */
  bolge: string;
  sinif?: ArsaSinifi;
  seviye?: IlceSeviyesi;
  izgara: Izgara;
  /** Mahalleler (isteğe bağlı; fikstürdeki `ParselMahalleTanimi` ile aynı biçim). Yoksa kamu mahalle kümelerini kuralla böler. */
  mahalleler?: ParselMahalleTanimi[];
}

/**
 * Izgaralardan parsel girdisi (JSON fikstürünün yerine; çekirdek `CekirdekVeriPaketi.parselIzgara`). İlçeler sırası dünya sırasıdır;
 * hücreler her ilçede (y, x) satır öncelikli yinelenir. Kamu işareti ve orman bilgisi ızgarada yoktur (kamu kuraldan üretilir).
 */
export interface ParselIzgaraGirdisi {
  ad: string;
  /** Kaynak bölge haritasının adı. */
  harita: string;
  tohum: number;
  iller: { id: string; ad: string; bolge: string }[];
  ilceler: ParselIzgaraIlce[];
}

/** Izgara girdisinin biçim ve tutarlılık denetimi (yapısal; ızgara baytlarını yeniden çözmez). Hata iletileri boşsa geçerli. */
export function parselIzgaraHatalari(g: ParselIzgaraGirdisi): string[] {
  const hatalar: string[] = [];
  const iller = new Map<string, string>();
  for (const il of g.iller) {
    if (iller.has(il.id)) hatalar.push(`iller: yinelenen kimlik "${il.id}"`);
    iller.set(il.id, il.bolge);
  }
  const kimlikler = new Set<string>();
  const sinir = 1 << IZGARA_Z;
  for (const [i, c] of g.ilceler.entries()) {
    const yer = `ilceler[${i}] (${c.id})`;
    if (kimlikler.has(c.id)) hatalar.push(`ilceler: yinelenen kimlik "${c.id}"`);
    kimlikler.add(c.id);
    const b = iller.get(c.il);
    if (b === undefined) hatalar.push(`${yer}: bilinmeyen il "${c.il}"`);
    else if (b !== c.bolge) hatalar.push(`${yer}: bolge "${c.bolge}" ilin bolgesiyle ("${b}") ayni degil`);
    const ig = c.izgara;
    if (ig.durum.length !== ig.genislik * ig.yukseklik) hatalar.push(`${yer}: durum duzlemi ${ig.durum.length} bayt, beklenen ${ig.genislik * ig.yukseklik}`);
    if (ig.x0 < 0 || ig.y0 < 0 || ig.x0 + ig.genislik > sinir || ig.y0 + ig.yukseklik > sinir) hatalar.push(`${yer}: cerceve z20 araliginin (0..${sinir - 1}) disinda`);
  }
  for (const il of g.iller) if (!g.ilceler.some((c) => c.il === il.id)) hatalar.push(`il "${il.id}": hic ilcesi yok`);
  return hatalar;
}

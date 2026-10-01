/**
 * Kompakt hücre dizini (G3b; docs/06 §15.11): parsel dünyasının hücre tanımlarını (sınıf, uygunluk, engel, kamu işareti) hücre başına NESNE ve
 * `Map` girdisi tutmadan, ilçe başına tek bir durum düzlemiyle (`Uint8Array`, BHI1 durum baytı) saklar.
 *
 * - **Biçim.** Her ilçe `{x0, y0, w, h, durum}` çerçevesidir; `durum[(y - y0) * w + (x - x0)]` BHI1 baytıdır (bit0 içeride, bit1 yol, bit2 su, bit3 askeri,
 *   bit4 bina, bit5-7 arazi sınıfı). Bellek: çerçeve alanı kadar bayt (üç ilçede ≈ 7 MB; fikstür JSON'u ve `Map` ≈ 1 GB).
 * - **İki kurucu.** `fiksturden` (mevcut JSON fikstürü; hücreler bayta kodlanır, kamu işareti / orman / "koruma" seyrek yan tablolara) ve `izgaradan`
 *   (`ParselIzgaraGirdisi`: BHI1 düzlemi olduğu gibi kullanılır, kopyalanmaz). Tüm tüketiciler aynı API'yi kullanır; iki yol aynı dünyayı kurar.
 * - **Yineleme sırası TANIMLI:** ilçeler girdideki sırayla; ilçe içinde `fiksturden` için fikstür dizisinin sırası (satır öncelikli değilse `sira` dizisiyle
 *   korunur), `izgaradan` için (y, x) satır öncelikli. Sıraya bağımlı tüketiciler (botların "ilk uygun yerleşim"i, `[...ayrilmis]`) bu sırayı görür.
 * - **Ayrılmış hücre kümesi SAKLANMAZ:** ilçe başına bir karma eşiği (`esik`) ve eşitlik kümesiyle hesaplanır (`ayrilmisKur`); sıralama (karma, kimlik DİZESİ)
 *   ile birebir eski `Set` yöntemidir.
 * - **Uyum katmanı.** `hucreler` (`Map<HucreId, {ilce, hucre}>` yüzü: `get`/`has`/`size`/yineleme) ve `ayrilmis` (`Set` yüzü: `has`/`add`/`delete`/`clear`/`size`/
 *   yineleme) eski tip adlarıyla durur; sunucu, protokol, botlar ve testler değişmeden çalışır. Sıcak yol için sayısal API: `hucreDurum`, `gez`, `ilceHucreleri`,
 *   `ayrilmisListe`. Fikstür ilçe tanımının `hucreler` dizisi (izgara dünyasında) yalnız ≤ `TEMBEL_HUCRE_SINIRI` hücrelik ilçede açılır; büyükte
 *   `HucreDiziniBuyukHatasi` fırlatır (gizli bellek patlaması yerine yüksek sesle kırılır).
 *
 * Yalnız tamsayı işlemleri (kayan nokta yok); deterministiktir.
 */
import type { ArsaSinifi, HucreEngeli, IlceSeviyesi, ParselFiksturu, ParselHucreTanimi, ParselIlceTanimi, ParselIzgaraGirdisi, ParselMahalleTanimi } from "@bolge/veri";
import { carpBol } from "../sabit";
import { PPM } from "../tipler";
import type { HucreId, KamuKumesi, KamuTuru } from "../tipler";
import { kamuIndeksiAra, kamuIndeksiKur } from "./kamu";
import type { KamuIndeksi } from "./kamu";

// ---------------------------------------------------------------------------
// BHI1 durum baytı (veri paketinin `izgara.ts` kopyası; `cekirdek/test/hucre-dizini-esdegerlik` 256 baytın hepsinde eşitliği sınar)
// ---------------------------------------------------------------------------

const ICERIDE = 1;
const YOL = 2;
const SU = 4;
const ASKERI = 8;
const BINA = 16;
/** Satın almayı engelleyen bitler. */
export const DURUM_ENGEL_MASKESI = YOL | SU | ASKERI;

/** Durum baytından arsa sınıfı (veri `arsaSinifi` ile aynı). */
export function durumArsaSinifi(d: number): ArsaSinifi {
  const s = (d >> 5) & 7;
  if (s === 3 || s === 5) return "sehir";
  if (s === 2 || (d & BINA) !== 0) return "kasaba";
  return "kirsal";
}

/** Durum baytından engel nedeni: su > askeri > yol (veri `engelAdi` ile aynı). */
export function durumEngeli(d: number): HucreEngeli | undefined {
  if ((d & SU) !== 0) return "su";
  if ((d & ASKERI) !== 0) return "askeri";
  if ((d & YOL) !== 0) return "yol";
  return undefined;
}

/** İlçe sınıfı: içerideki hücrelerin en yüksek arsa sınıfı (veri `ilceSinifiTuret` ile aynı). */
function ilceSinifiTuret(d: Uint8Array): ArsaSinifi {
  let en = 0;
  for (let i = 0; i < d.length; i++) {
    const b = d[i] as number;
    if ((b & ICERIDE) === 0) continue;
    const s = durumArsaSinifi(b);
    const sira = s === "sehir" ? 2 : s === "kasaba" ? 1 : 0;
    if (sira > en) {
      en = sira;
      if (en === 2) break;
    }
  }
  return en === 2 ? "sehir" : en === 1 ? "kasaba" : "kirsal";
}

/** İlçe sınıfından başlangıç seviyesi (veri `ilceSeviyesiTuret` ile aynı). */
function ilceSeviyesiTuret(sinif: ArsaSinifi): IlceSeviyesi {
  return sinif === "sehir" ? 3 : sinif === "kasaba" ? 1 : 0;
}

/** `hucreDurum` sonucundan ilçe numarası (sonuç ≥ 0 olmalı). */
export const durumIlceNo = (hd: number): number => hd >> 8;
/** `hucreDurum` sonucundan durum baytı. */
export const durumBayti = (hd: number): number => hd & 255;
/** `hucreDurum` sonucu bir hücrenin uygun (satın alınabilir) olduğunu söylüyor mu? (sonuç ≥ 0 olmalı) */
export const durumUygunMu = (hd: number): boolean => (hd & DURUM_ENGEL_MASKESI) === 0;

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

/** İlçe tanımı hücre dizisinin tembel açılışının hücre sınırı (üstünde `HucreDiziniBuyukHatasi`). Parametre DEĞİL, sabit. */
export const TEMBEL_HUCRE_SINIRI = 50_000;

/** Bir ilçenin hücre dizisi sınırı aşan ilçede açılmak istendi: sıcak yol API'sini (`ilceHucreleri`, `hucreDurum`) kullanmalı. */
export class HucreDiziniBuyukHatasi extends Error {
  readonly ilce: string;
  readonly hucreSayisi: number;
  constructor(ilce: string, hucreSayisi: number) {
    super(`ilce ${ilce} ${hucreSayisi} hucre tasiyor (tembel hucre dizisi siniri ${TEMBEL_HUCRE_SINIRI}); hucre dizisi acilamaz: ilceHucreleri() ya da hucreDurum() kullan`);
    this.name = "HucreDiziniBuyukHatasi";
    this.ilce = ilce;
    this.hucreSayisi = hucreSayisi;
  }
}

/** `hucreler.get(id)` sonucu: eski `Map` değeriyle aynı biçim. */
export interface HucreKaydi {
  ilce: string;
  hucre: ParselHucreTanimi;
}

/** Eski `DerlenmisMulk.hucreler` (`Map<HucreId, HucreKaydi>`) yüzü: salt okunur. */
export type HucreHaritasi = ReadonlyMap<HucreId, HucreKaydi>;

/** Bir ilçenin hücreleri (kamu hesabı girdisi; yineleme sırasıyla): koordinatlar ve bayraklar. */
export interface IlceHucreDizileri {
  id: string;
  mahalleler?: ParselMahalleTanimi[];
  /** Hücre sayısı (xs, ys, bayrak uzunluğu). */
  n: number;
  xs: Int32Array;
  ys: Int32Array;
  /** `DIZI_UYGUN` | `DIZI_KIRSAL_DEGIL` | `DIZI_SU` bitleri. */
  bayrak: Uint8Array;
  /** Kamu işaretli hücreler (`i`: dizi indeksi; yalnız uygun hücre). */
  isaretler: { i: number; tur: KamuTuru }[];
}
export const DIZI_UYGUN = 1;
export const DIZI_KIRSAL_DEGIL = 2;
export const DIZI_SU = 4;

interface IlceIzgarasi {
  id: string;
  ad: string;
  il: string;
  bolge: string;
  sinif: ArsaSinifi;
  seviye: IlceSeviyesi;
  x0: number;
  y0: number;
  w: number;
  h: number;
  durum: Uint8Array;
  /** İçerideki hücre sayısı. */
  hucreSayisi: number;
  /** Uygun hücre sayısı. */
  uygun: number;
  /** Fikstür dizisi satır öncelikli değilse: dizideki i. hücrenin çerçeve indeksi; aksi halde null (satır öncelikli yineleme). */
  sira: Int32Array | null;
  /** Fikstür kamu işaretleri (yalnız JSON yolu): anahtar `y * 2^20 + x`. */
  kamuIsareti: Map<number, KamuTuru> | null;
  /** "orman" kullanımlı hücreler (yalnız JSON yolu). */
  orman: Set<number> | null;
  /** engel = "koruma" hücreleri (yalnız JSON yolu; baytta YOL biti ile engelli görünür). */
  koruma: Set<number> | null;
  mahalleler?: ParselMahalleTanimi[];
  /** Tembel hücre dizisi önbelleği (izgara dünyasında, ≤ sınır). */
  tembel: ParselHucreTanimi[] | null;
}

/** İlçe başına ayrılmış hücre durumu: eşik ve eşitlik kümesi (küme saklanmaz). */
export interface IlceAyrilmis {
  adet: number;
  esik: number;
  /** Karması eşiğe eşit olan hücrelerden (karma, kimlik DİZESİ) sırasıyla ayrılmışa girenler: anahtar `y * 2^20 + x`. */
  esitlik: Set<number>;
  kamu: KamuIndeksi | null;
}

const HUCRE_KENARI = 1 << 20;
const anahtar = (x: number, y: number): number => y * HUCRE_KENARI + x;
/** Çerçeve alanı sınırı (bayt): bundan büyük sınırlayıcı kutu hata. */
const ALAN_SINIRI = 1 << 28;

/** "x:y" -> [x, y]; kanonik biçim değilse (başında sıfır, işaret, boşluk, fazla ':') null. `Map` anahtarıyla aynı katılık. */
function idAyir(id: string): [number, number] | null {
  if (typeof id !== "string") return null;
  const n = id.length;
  let i = 0;
  let x = 0;
  let basamak = 0;
  for (; i < n; i++) {
    const c = id.charCodeAt(i);
    if (c === 58) break;
    if (c < 48 || c > 57 || ++basamak > 8) return null;
    x = x * 10 + (c - 48);
  }
  if (basamak === 0 || i >= n || (basamak > 1 && id.charCodeAt(0) === 48)) return null;
  const bas = ++i;
  let y = 0;
  basamak = 0;
  for (; i < n; i++) {
    const c = id.charCodeAt(i);
    if (c < 48 || c > 57 || ++basamak > 8) return null;
    y = y * 10 + (c - 48);
  }
  if (basamak === 0 || (basamak > 1 && id.charCodeAt(bas) === 48)) return null;
  return [x, y];
}

/**
 * 32 bit FNV-1a, "x:y" metninin karakterleri üzerinde (dize üretmeden; `hucreKarmasi(`${x}:${y}`)` ile BİREBİR aynı). Yalnız tamsayı işlemleri.
 */
export function hucreKarmasiXY(x: number, y: number): number {
  let h = 0x811c9dc5;
  h = karmaSayi(h, x);
  h ^= 58;
  h = Math.imul(h, 0x01000193);
  h = karmaSayi(h, y);
  return h >>> 0;
}

function karmaSayi(h0: number, v: number): number {
  let h = h0;
  // en anlamlı basamaktan başlayarak (ondalık gösterim)
  let bol = 1;
  while (bol * 10 <= v) bol *= 10;
  let kalan = v;
  while (bol >= 1) {
    const b = Math.floor(kalan / bol);
    kalan -= b * bol;
    bol = Math.floor(bol / 10);
    h ^= 48 + b;
    h = Math.imul(h, 0x01000193);
  }
  return h;
}

/** Eşitlik kümesi kimlikleri için dize sırası (JS `<`): eski `Set` yönteminin eşitlik çözümü. */
const dizeSirasi = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------
// Dizin
// ---------------------------------------------------------------------------

export class HucreDizini {
  /** Eski `DerlenmisMulk.hucreler` yüzü. */
  readonly hucreler: HucreHaritasi;
  /** Eski `DerlenmisMulk.ayrilmis` yüzü (`ayrilmisKur` ile doldurulur; ondan önce boş). */
  ayrilmis: AyrilmisKumesi;

  private readonly ilceler: IlceIzgarasi[];
  private readonly ilceNoHaritasi = new Map<string, number>();
  private toplam = 0;

  private constructor(ilceler: IlceIzgarasi[]) {
    this.ilceler = ilceler;
    ilceler.forEach((c, i) => {
      this.ilceNoHaritasi.set(c.id, i);
      this.toplam += c.hucreSayisi;
    });
    this.hucreler = new HucreHaritasiGorunumu(this);
    this.ayrilmis = new AyrilmisKumesi(this, []);
  }

  // --- Kurucular ----------------------------------------------------------

  /**
   * JSON fikstüründen. Hücre kodlaması: `uygun` ⇔ engelsiz; `engel` su/askeri/yol baytta, "koruma" YOL biti + seyrek tablo; `sinif` kırsal/kasaba/şehir arazi sınıfı
   * 1/2/3 olarak; `kamu` ve `kullanim: "orman"` seyrek tablolar. Tekrarlanan hücre (ilçe içinde ya da ilçeler arasında) hata.
   */
  static fiksturden(f: ParselFiksturu): HucreDizini {
    const ilceler: IlceIzgarasi[] = [];
    for (const c of f.ilceler) ilceler.push(ilceKodla(c));
    const dz = new HucreDizini(ilceler);
    dz.caprazDenetim();
    return dz;
  }

  /** Izgaralardan (BHI1 düzlemleri olduğu gibi kullanılır, kopyalanmaz). */
  static izgaradan(g: ParselIzgaraGirdisi): HucreDizini {
    const ilceler: IlceIzgarasi[] = [];
    for (const c of g.ilceler) {
      const ig = c.izgara;
      if (ig.durum.length !== ig.genislik * ig.yukseklik) throw new Error(`icerikDerle: ilce ${c.id} izgara boyutu tutarsiz (${ig.durum.length} != ${ig.genislik} x ${ig.yukseklik})`);
      if (ig.genislik * ig.yukseklik > ALAN_SINIRI) throw new Error(`icerikDerle: ilce sinirlayici kutusu cok buyuk (${ig.genislik} x ${ig.yukseklik}): ${c.id}`);
      let hucre = 0;
      let uygun = 0;
      const d = ig.durum;
      for (let i = 0; i < d.length; i++) {
        const b = d[i] as number;
        if ((b & ICERIDE) === 0) continue;
        hucre++;
        if ((b & DURUM_ENGEL_MASKESI) === 0) uygun++;
      }
      const sinif = c.sinif ?? ilceSinifiTuret(d);
      const o: IlceIzgarasi = {
        id: c.id,
        ad: c.ad,
        il: c.il,
        bolge: c.bolge,
        sinif,
        seviye: c.seviye ?? ilceSeviyesiTuret(sinif),
        x0: ig.x0,
        y0: ig.y0,
        w: ig.genislik,
        h: ig.yukseklik,
        durum: d,
        hucreSayisi: hucre,
        uygun,
        sira: null,
        kamuIsareti: null,
        orman: null,
        koruma: null,
        tembel: null,
      };
      if (c.mahalleler !== undefined) o.mahalleler = c.mahalleler;
      ilceler.push(o);
    }
    const dz = new HucreDizini(ilceler);
    dz.caprazDenetim();
    return dz;
  }

  /** İlçeler arası çakışma: bir hücre iki ilçede içeride olamaz (eski "hucre iki kez tanimli" denetimi). */
  private caprazDenetim(): void {
    const l = this.ilceler;
    for (let a = 0; a < l.length; a++) {
      const A = l[a] as IlceIzgarasi;
      for (let b = a + 1; b < l.length; b++) {
        const B = l[b] as IlceIzgarasi;
        const x0 = Math.max(A.x0, B.x0);
        const x1 = Math.min(A.x0 + A.w, B.x0 + B.w);
        const y0 = Math.max(A.y0, B.y0);
        const y1 = Math.min(A.y0 + A.h, B.y0 + B.h);
        if (x0 >= x1 || y0 >= y1) continue;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            if ((((A.durum[(y - A.y0) * A.w + (x - A.x0)] as number) & ICERIDE) !== 0) && (((B.durum[(y - B.y0) * B.w + (x - B.x0)] as number) & ICERIDE) !== 0)) {
              throw new Error(`icerikDerle: hucre iki kez tanimli: ${x}:${y}`);
            }
          }
        }
      }
    }
  }

  // --- Sorgular -----------------------------------------------------------

  get ilceSayisi(): number {
    return this.ilceler.length;
  }

  /** Toplam (içerideki) hücre sayısı. */
  get hucreSayisi(): number {
    return this.toplam;
  }

  /** İlçe kimliğinden ilçe numarası (girdideki sıra); yoksa -1. */
  ilceNo(id: string): number {
    return this.ilceNoHaritasi.get(id) ?? -1;
  }

  ilceKimligi(no: number): string {
    return (this.ilceler[no] as IlceIzgarasi).id;
  }

  /** İlçenin içerideki hücre ve uygun hücre sayıları. */
  ilceSayilari(no: number): { hucre: number; uygun: number } {
    const c = this.ilceler[no] as IlceIzgarasi;
    return { hucre: c.hucreSayisi, uygun: c.uygun };
  }

  /**
   * (x, y) hücresinin durumu: tanımlı bir ilçenin içindeyse `ilceNo * 256 + durumBaytı`, değilse -1. Kopyasız, nesne üretmez (sıcak yol).
   * `durumIlceNo`, `durumBayti`, `durumUygunMu` ile ayrıştırılır.
   */
  hucreDurum(x: number, y: number): number {
    const l = this.ilceler;
    for (let i = 0; i < l.length; i++) {
      const c = l[i] as IlceIzgarasi;
      const dx = x - c.x0;
      const dy = y - c.y0;
      if (dx >= 0 && dy >= 0 && dx < c.w && dy < c.h) {
        const b = c.durum[dy * c.w + dx] as number;
        if ((b & ICERIDE) !== 0) return i * 256 + b;
      }
    }
    return -1;
  }

  /**
   * `no` numaralı ilçenin (x, y) hücresinin durum baytı; ilçenin çerçevesi dışındaysa ya da içeride değilse -1 (yurt halka araması: yalnız o ilçeye bakar;
   * `hucreDurum`'dan farkı ilçe taraması yoktur). Kopyasız, nesne üretmez.
   */
  ilceBayti(no: number, x: number, y: number): number {
    const c = this.ilceler[no] as IlceIzgarasi;
    const dx = x - c.x0;
    const dy = y - c.y0;
    if (dx < 0 || dy < 0 || dx >= c.w || dy >= c.h) return -1;
    const b = c.durum[dy * c.w + dx] as number;
    return (b & ICERIDE) !== 0 ? b : -1;
  }

  /** İlçe çerçevesi (kapsayıcı x0..x1, y0..y1). */
  ilceCercevesi(no: number): { x0: number; y0: number; x1: number; y1: number } {
    const c = this.ilceler[no] as IlceIzgarasi;
    return { x0: c.x0, y0: c.y0, x1: c.x0 + c.w - 1, y1: c.y0 + c.h - 1 };
  }

  /** "x:y" kimlikli hücrenin bilgisi (eski `hucreler.get`); kanonik olmayan ya da tanımsız hücre için tanımsız. */
  hucreBilgisi(id: string): HucreKaydi | undefined {
    const xy = idAyir(id);
    if (xy === null) return undefined;
    const hd = this.hucreDurum(xy[0], xy[1]);
    if (hd < 0) return undefined;
    return this.kayit(hd >> 8, xy[0], xy[1], hd & 255);
  }

  private kayit(no: number, x: number, y: number, b: number): HucreKaydi {
    const c = this.ilceler[no] as IlceIzgarasi;
    const k = anahtar(x, y);
    const hucre: ParselHucreTanimi = { id: `${x}:${y}`, sinif: durumArsaSinifi(b), uygun: (b & DURUM_ENGEL_MASKESI) === 0 };
    const engel = c.koruma !== null && c.koruma.has(k) ? "koruma" : durumEngeli(b);
    if (engel !== undefined) hucre.engel = engel;
    const kamu = c.kamuIsareti?.get(k);
    if (kamu !== undefined) hucre.kamu = kamu;
    if (c.orman?.has(k) === true) (hucre as unknown as { kullanim: string }).kullanim = "orman";
    return { ilce: c.id, hucre };
  }

  /** İlçenin hücrelerini yineleme sırasında `fn(x, y, durumBaytı)` ile gezer (sıcak yol: nesne üretmez). */
  gez(no: number, fn: (x: number, y: number, durum: number) => void): void {
    const c = this.ilceler[no] as IlceIzgarasi;
    if (c.sira !== null) {
      for (let i = 0; i < c.sira.length; i++) {
        const idx = c.sira[i] as number;
        fn(c.x0 + (idx % c.w), c.y0 + Math.floor(idx / c.w), c.durum[idx] as number);
      }
      return;
    }
    const d = c.durum;
    for (let r = 0, idx = 0; r < c.h; r++) {
      for (let q = 0; q < c.w; q++, idx++) {
        const b = d[idx] as number;
        if ((b & ICERIDE) !== 0) fn(c.x0 + q, c.y0 + r, b);
      }
    }
  }

  /** İlçenin hücreleri yineleme sırasında (üreteç; hücre başına küçük bir demet üretir). */
  *ilceHucreleri(ilceKimligi: string): Generator<{ x: number; y: number; durum: number }> {
    const no = this.ilceNo(ilceKimligi);
    if (no < 0) return;
    const c = this.ilceler[no] as IlceIzgarasi;
    if (c.sira !== null) {
      for (let i = 0; i < c.sira.length; i++) {
        const idx = c.sira[i] as number;
        yield { x: c.x0 + (idx % c.w), y: c.y0 + Math.floor(idx / c.w), durum: c.durum[idx] as number };
      }
      return;
    }
    for (let r = 0, idx = 0; r < c.h; r++) {
      for (let q = 0; q < c.w; q++, idx++) {
        const b = c.durum[idx] as number;
        if ((b & ICERIDE) !== 0) yield { x: c.x0 + q, y: c.y0 + r, durum: b };
      }
    }
  }

  /**
   * İlçe merkezi (kasaba ve şehir sınıfı uygun hücrelerin tamsayı ağırlık merkezi; yoksa tüm uygun hücrelerinki; uygun hücre yoksa [0, 0]):
   * `geometri.ts ilceMerkezi` ile AYNI tanım. Toplamlar sıradan bağımsızdır.
   */
  ilceMerkezi(no: number): [number, number] {
    const onbellekte = this.merkezler[no];
    if (onbellekte !== undefined) return onbellekte;
    const m = this.ilceMerkeziHesapla(no);
    this.merkezler[no] = m;
    return m;
  }

  /** `ilceMerkezi` önbelleği: dizin değişmezdir (ilçe başına bir kez hesaplanır). */
  private readonly merkezler: ([number, number] | undefined)[] = [];

  private ilceMerkeziHesapla(no: number): [number, number] {
    let tx = 0;
    let ty = 0;
    let tn = 0;
    let yx = 0;
    let yy = 0;
    let yn = 0;
    this.gez(no, (x, y, b) => {
      if ((b & DURUM_ENGEL_MASKESI) !== 0) return;
      tx += x;
      ty += y;
      tn++;
      if (durumArsaSinifi(b) !== "kirsal") {
        yx += x;
        yy += y;
        yn++;
      }
    });
    if (tn === 0) return [0, 0];
    return yn > 0 ? [Math.floor(yx / yn), Math.floor(yy / yn)] : [Math.floor(tx / tn), Math.floor(ty / tn)];
  }

  /** İlçenin kamu hesabı girdisi (geçici tipli diziler; yineleme sırasıyla). */
  ilceDizileri(no: number): IlceHucreDizileri {
    const c = this.ilceler[no] as IlceIzgarasi;
    const n = c.hucreSayisi;
    const xs = new Int32Array(n);
    const ys = new Int32Array(n);
    const bayrak = new Uint8Array(n);
    const isaretler: { i: number; tur: KamuTuru }[] = [];
    let i = 0;
    this.gez(no, (x, y, b) => {
      xs[i] = x;
      ys[i] = y;
      const uygun = (b & DURUM_ENGEL_MASKESI) === 0;
      let f = uygun ? DIZI_UYGUN : 0;
      if (uygun && durumArsaSinifi(b) !== "kirsal") f |= DIZI_KIRSAL_DEGIL;
      if ((b & SU) !== 0 && durumEngeli(b) === "su") f |= DIZI_SU;
      bayrak[i] = f;
      if (uygun && c.kamuIsareti !== null) {
        const t = c.kamuIsareti.get(anahtar(x, y));
        if (t !== undefined) isaretler.push({ i, tur: t });
      }
      i++;
    });
    const o: IlceHucreDizileri = { id: c.id, n, xs, ys, bayrak, isaretler };
    if (c.mahalleler !== undefined) o.mahalleler = c.mahalleler;
    return o;
  }

  /** Fikstürdeki `orman` kullanımı (yurt seçimi): izgara dünyasında yoktur. */
  ormanMi(no: number, x: number, y: number): boolean {
    return (this.ilceler[no] as IlceIzgarasi).orman?.has(anahtar(x, y)) === true;
  }

  /**
   * İlçe tanımları: JSON yolunda verilen fikstür ilçeleri, izgara yolunda üretilen (`hucreler` dizisi TEMBEL ve ≤ `TEMBEL_HUCRE_SINIRI` hücrelik ilçede
   * açılır; büyükte `HucreDiziniBuyukHatasi`) `ParselIlceTanimi` nesneleri.
   */
  fiksturOlustur(g: ParselIzgaraGirdisi): ParselFiksturu {
    const ilceler = this.ilceler.map((c): ParselIlceTanimi => {
      const o = { id: c.id, ad: c.ad, il: c.il, bolge: c.bolge, sinif: c.sinif, seviye: c.seviye, hucreSayisi: c.hucreSayisi, uygunHucre: c.uygun } as ParselIlceTanimi;
      if (c.mahalleler !== undefined) o.mahalleler = c.mahalleler;
      Object.defineProperty(o, "hucreler", { enumerable: false, configurable: true, get: () => this.tembelHucreler(c) });
      return o;
    });
    return { surum: 1, ad: g.ad, harita: g.harita, tohum: g.tohum, zoom: 20, iller: g.iller.map((il) => ({ ...il })), ilceler };
  }

  private tembelHucreler(c: IlceIzgarasi): ParselHucreTanimi[] {
    if (c.hucreSayisi > TEMBEL_HUCRE_SINIRI) throw new HucreDiziniBuyukHatasi(c.id, c.hucreSayisi);
    if (c.tembel === null) {
      const no = this.ilceNoHaritasi.get(c.id) as number;
      const l: ParselHucreTanimi[] = [];
      this.gez(no, (x, y, b) => l.push((this.kayit(no, x, y, b)).hucre));
      c.tembel = l;
    }
    return c.tembel;
  }

  // --- Ayrılmış hücre ------------------------------------------------------

  /**
   * Yeni oyunculara ayrılmış hücreleri hesaplar: her ilçenin uygun ∧ kamu-olmayan hücreleri (karma, kimlik dizesi) sırasıyla dizilir ve ilk
   * `floor(n × ppm / PPM)` tanesi ayrılır (eski `ayrilmisHucreler` ile aynı küme). Küme SAKLANMAZ: ilçe başına karma eşiği ve eşitlik kümesi tutulur.
   * Döndürür: ilçe → ayrılmış hücre sayısı (ayrılmışı olmayan ilçe yazılmaz). `this.ayrilmis` güncellenir.
   */
  ayrilmisKur(ayrilmisPpm: number, kamu?: ReadonlyMap<string, KamuKumesi>): Map<string, number> {
    const sayilar = new Map<string, number>();
    const durumlar: (IlceAyrilmis | null)[] = [];
    for (let no = 0; no < this.ilceler.length; no++) {
      const c = this.ilceler[no] as IlceIzgarasi;
      const kk = kamu?.get(c.id);
      const kamuIx = kk !== undefined && kk.gruplar.length > 0 ? kamuIndeksiKur(kk.gruplar) : null;
      if (ayrilmisPpm <= 0) {
        durumlar.push(null);
        continue;
      }
      const karmalar = new Uint32Array(c.uygun);
      let m = 0;
      const d = c.durum;
      for (let r = 0, idx = 0; r < c.h; r++) {
        for (let q = 0; q < c.w; q++, idx++) {
          const b = d[idx] as number;
          if ((b & ICERIDE) === 0 || (b & DURUM_ENGEL_MASKESI) !== 0) continue;
          const x = c.x0 + q;
          const y = c.y0 + r;
          if (kamuIx !== null && kamuIndeksiAra(kamuIx, x, y) >= 0) continue;
          karmalar[m++] = hucreKarmasiXY(x, y);
        }
      }
      const adet = carpBol(m, ayrilmisPpm, PPM);
      if (adet <= 0) {
        durumlar.push(null);
        continue;
      }
      const sirali = karmalar.slice(0, m).sort();
      const esik = sirali[adet - 1] as number;
      // eşikten küçük karmalı hücre sayısı (alt sınır ikili arama)
      let lo = 0;
      let hi = m;
      while (lo < hi) {
        const orta = (lo + hi) >> 1;
        if ((sirali[orta] as number) < esik) lo = orta + 1;
        else hi = orta;
      }
      const gerek = adet - lo;
      const adaylar: { id: string; k: number }[] = [];
      for (let r = 0, idx = 0; r < c.h; r++) {
        for (let q = 0; q < c.w; q++, idx++) {
          const b = d[idx] as number;
          if ((b & ICERIDE) === 0 || (b & DURUM_ENGEL_MASKESI) !== 0) continue;
          const x = c.x0 + q;
          const y = c.y0 + r;
          if (hucreKarmasiXY(x, y) !== esik) continue;
          if (kamuIx !== null && kamuIndeksiAra(kamuIx, x, y) >= 0) continue;
          adaylar.push({ id: `${x}:${y}`, k: anahtar(x, y) });
        }
      }
      adaylar.sort((a, b) => dizeSirasi(a.id, b.id));
      const esitlik = new Set<number>();
      for (let i = 0; i < gerek; i++) esitlik.add((adaylar[i] as { k: number }).k);
      durumlar.push({ adet, esik, esitlik, kamu: kamuIx });
      sayilar.set(c.id, adet);
    }
    this.ayrilmis = new AyrilmisKumesi(this, durumlar);
    return sayilar;
  }

  /** Ayrılmış hücre tabanı üyeliği (üzerine yazma katmanı hariç). */
  tabanAyrilmisMi(no: number, x: number, y: number, b: number): boolean {
    const a = this.ayrilmis.durum(no);
    if (a === null) return false;
    if ((b & ICERIDE) === 0 || (b & DURUM_ENGEL_MASKESI) !== 0) return false;
    if (a.kamu !== null && kamuIndeksiAra(a.kamu, x, y) >= 0) return false;
    const k = hucreKarmasiXY(x, y);
    return k < a.esik || (k === a.esik && a.esitlik.has(anahtar(x, y)));
  }

  /** İlçenin ayrılmış hücreleri, kimliğe göre (JS dize sırası) sıralı ve önbellekli. Dönen dizi DEĞİŞTİRİLMEMELİ. */
  ayrilmisListe(ilceKimligi: string): readonly HucreId[] {
    return this.ayrilmis.liste(this.ilceNo(ilceKimligi));
  }

  /** (iç) ilçe izgarası erişimi (ayrılmış kümenin yinelemesi için). */
  ilceIzgarasi(no: number): { x0: number; y0: number; w: number; h: number; durum: Uint8Array } {
    return this.ilceler[no] as IlceIzgarasi;
  }
}

// ---------------------------------------------------------------------------
// JSON kodlaması
// ---------------------------------------------------------------------------

/** Bir fikstür ilçesini çerçeveye kodlar (tekrarlanan hücre hata). */
function ilceKodla(c: ParselIlceTanimi): IlceIzgarasi {
  const n = c.hucreler.length;
  const xs = new Int32Array(n);
  const ys = new Int32Array(n);
  let minx = Number.POSITIVE_INFINITY;
  let miny = Number.POSITIVE_INFINITY;
  let maxx = -1;
  let maxy = -1;
  for (let i = 0; i < n; i++) {
    const h = c.hucreler[i] as ParselHucreTanimi;
    const xy = idAyir(h.id);
    if (xy === null) throw new Error(`icerikDerle: gecersiz hucre kimligi: ${String(h.id)} (${c.id})`);
    xs[i] = xy[0];
    ys[i] = xy[1];
    if (xy[0] < minx) minx = xy[0];
    if (xy[0] > maxx) maxx = xy[0];
    if (xy[1] < miny) miny = xy[1];
    if (xy[1] > maxy) maxy = xy[1];
  }
  const w = n === 0 ? 0 : maxx - minx + 1;
  const hh = n === 0 ? 0 : maxy - miny + 1;
  if (w * hh > ALAN_SINIRI) throw new Error(`icerikDerle: ilce sinirlayici kutusu cok buyuk (${w} x ${hh}): ${c.id}`);
  const durum = new Uint8Array(w * hh);
  const sira = new Int32Array(n);
  let satirOncelikli = true;
  let onceki = -1;
  let uygun = 0;
  let kamuIsareti: Map<number, KamuTuru> | null = null;
  let orman: Set<number> | null = null;
  let koruma: Set<number> | null = null;
  const SINIF_BITI: Record<ArsaSinifi, number> = { kirsal: 1 << 5, kasaba: 2 << 5, sehir: 3 << 5 };
  for (let i = 0; i < n; i++) {
    const h = c.hucreler[i] as ParselHucreTanimi;
    const x = xs[i] as number;
    const y = ys[i] as number;
    const idx = (y - miny) * w + (x - minx);
    if (((durum[idx] as number) & ICERIDE) !== 0) throw new Error(`icerikDerle: hucre iki kez tanimli: ${h.id}`);
    let b = ICERIDE | (SINIF_BITI[h.sinif] ?? 0);
    if (h.uygun) {
      if (h.engel !== undefined) throw new Error(`icerikDerle: uygun hucre engel tasiyamaz: ${h.id}`);
      uygun++;
    } else {
      if (h.engel === undefined) throw new Error(`icerikDerle: uygun olmayan hucre icin engel nedeni zorunlu: ${h.id}`);
      b |= h.engel === "su" ? SU : h.engel === "askeri" ? ASKERI : YOL;
      if (h.engel === "koruma") (koruma ??= new Set()).add(anahtar(x, y));
    }
    durum[idx] = b;
    if (h.kamu !== undefined) (kamuIsareti ??= new Map()).set(anahtar(x, y), h.kamu);
    if ((h as unknown as { kullanim?: unknown }).kullanim === "orman") (orman ??= new Set()).add(anahtar(x, y));
    if (idx <= onceki) satirOncelikli = false;
    onceki = idx;
    sira[i] = idx;
  }
  const o: IlceIzgarasi = {
    id: c.id,
    ad: c.ad,
    il: c.il,
    bolge: c.bolge,
    sinif: c.sinif,
    seviye: c.seviye,
    x0: n === 0 ? 0 : minx,
    y0: n === 0 ? 0 : miny,
    w,
    h: hh,
    durum,
    hucreSayisi: n,
    uygun,
    sira: satirOncelikli ? null : sira,
    kamuIsareti,
    orman,
    koruma,
    tembel: null,
  };
  if (c.mahalleler !== undefined) o.mahalleler = c.mahalleler;
  return o;
}

// ---------------------------------------------------------------------------
// Uyum katmanı: Map ve Set yüzleri
// ---------------------------------------------------------------------------

class HucreHaritasiGorunumu implements ReadonlyMap<HucreId, HucreKaydi> {
  constructor(private readonly dz: HucreDizini) {}

  get size(): number {
    return this.dz.hucreSayisi;
  }
  get(id: HucreId): HucreKaydi | undefined {
    return this.dz.hucreBilgisi(id);
  }
  has(id: HucreId): boolean {
    const xy = idAyir(id);
    return xy !== null && this.dz.hucreDurum(xy[0], xy[1]) >= 0;
  }
  *entries(): MapIterator<[HucreId, HucreKaydi]> {
    for (let no = 0; no < this.dz.ilceSayisi; no++) {
      const ilce = this.dz.ilceKimligi(no);
      for (const h of this.dz.ilceHucreleri(ilce)) {
        const k = this.dz.hucreBilgisi(`${h.x}:${h.y}`) as HucreKaydi;
        yield [k.hucre.id, k];
      }
    }
  }
  *keys(): MapIterator<HucreId> {
    for (const [id] of this.entries()) yield id;
  }
  *values(): MapIterator<HucreKaydi> {
    for (const [, k] of this.entries()) yield k;
  }
  forEach(fn: (deger: HucreKaydi, anahtar: HucreId, harita: ReadonlyMap<HucreId, HucreKaydi>) => void): void {
    for (const [id, k] of this.entries()) fn(k, id, this);
  }
  [Symbol.iterator](): MapIterator<[HucreId, HucreKaydi]> {
    return this.entries();
  }
}

/**
 * Eski `Set<HucreId>` yüzü: ayrılmış hücreler. Taban küme hesaplanır (saklanmaz); `add`/`delete`/`clear` üzerine yazma katmanıdır (testler kümeyi değiştirir).
 * Yineleme sırası eski `Set` ile aynı: ilçe sırası, ilçe içinde (karma, kimlik dizesi) artan; ardından eklenenler.
 */
export class AyrilmisKumesi implements Set<HucreId> {
  private readonly silinen = new Set<HucreId>();
  private readonly eklenen = new Set<HucreId>();
  private temizlendi = false;
  private onbellek = new Map<number, HucreId[]>();

  constructor(
    private readonly dz: HucreDizini,
    private readonly durumlar: (IlceAyrilmis | null)[],
  ) {}

  /** (iç) ilçenin ayrılmış durumu. */
  durum(no: number): IlceAyrilmis | null {
    return this.durumlar[no] ?? null;
  }

  private tabanda(id: HucreId): boolean {
    if (this.temizlendi) return false;
    const xy = idAyir(id);
    if (xy === null) return false;
    const hd = this.dz.hucreDurum(xy[0], xy[1]);
    if (hd < 0) return false;
    return this.dz.tabanAyrilmisMi(hd >> 8, xy[0], xy[1], hd & 255);
  }

  has(id: HucreId): boolean {
    if (this.eklenen.has(id)) return true;
    if (this.silinen.has(id)) return false;
    return this.tabanda(id);
  }

  add(id: HucreId): this {
    if (this.silinen.delete(id)) {
      this.onbellek.clear();
      return this;
    }
    if (!this.tabanda(id)) this.eklenen.add(id);
    this.onbellek.clear();
    return this;
  }

  delete(id: HucreId): boolean {
    if (this.eklenen.delete(id)) {
      this.onbellek.clear();
      return true;
    }
    if (this.tabanda(id) && !this.silinen.has(id)) {
      this.silinen.add(id);
      this.onbellek.clear();
      return true;
    }
    return false;
  }

  clear(): void {
    this.temizlendi = true;
    this.silinen.clear();
    this.eklenen.clear();
    this.onbellek.clear();
  }

  get size(): number {
    let n = this.eklenen.size;
    if (!this.temizlendi) {
      for (const a of this.durumlar) if (a !== null) n += a.adet;
      n -= this.silinen.size;
    }
    return n;
  }

  /** İlçenin ayrılmış hücreleri (taban − silinen + eklenen), kimliğe göre sıralı; önbellekli. */
  liste(no: number): readonly HucreId[] {
    if (no < 0) return [];
    let l = this.onbellek.get(no);
    if (l === undefined) {
      l = this.ilceUyeleri(no).map((u) => u.id);
      l.sort();
      this.onbellek.set(no, l);
    }
    return l;
  }

  /** İlçenin üyeleri (karma, kimlik dizesi) sırasıyla; silinenler hariç, eklenenlerden o ilçeye ait olanlar sonda DEĞİL (ayrı ele alınır). */
  private ilceUyeleri(no: number): { id: HucreId; k: number }[] {
    const sonuc: { id: HucreId; k: number }[] = [];
    const a = this.durumlar[no] ?? null;
    if (a !== null && !this.temizlendi) {
      this.dz.gez(no, (x, y, b) => {
        if (!this.dz.tabanAyrilmisMi(no, x, y, b)) return;
        const id = `${x}:${y}`;
        if (!this.silinen.has(id)) sonuc.push({ id, k: hucreKarmasiXY(x, y) });
      });
    }
    const ilce = this.dz.ilceKimligi(no);
    for (const id of this.eklenen) {
      const xy = idAyir(id);
      if (xy === null) continue;
      const hd = this.dz.hucreDurum(xy[0], xy[1]);
      if (hd >= 0 && this.dz.ilceKimligi(hd >> 8) === ilce) sonuc.push({ id, k: hucreKarmasiXY(xy[0], xy[1]) });
    }
    return sonuc;
  }

  *values(): SetIterator<HucreId> {
    for (let no = 0; no < this.dz.ilceSayisi; no++) {
      const a = this.durumlar[no] ?? null;
      if (a === null || this.temizlendi) continue;
      const uyeler = this.ilceUyeleri(no).filter((u) => !this.eklenen.has(u.id));
      uyeler.sort((p, q) => p.k - q.k || dizeSirasi(p.id, q.id));
      for (const u of uyeler) yield u.id;
    }
    for (const id of this.eklenen) yield id;
  }
  keys(): SetIterator<HucreId> {
    return this.values();
  }
  *entries(): SetIterator<[HucreId, HucreId]> {
    for (const id of this.values()) yield [id, id];
  }
  forEach(fn: (deger: HucreId, anahtar: HucreId, kume: Set<HucreId>) => void): void {
    for (const id of this.values()) fn(id, id, this);
  }
  [Symbol.iterator](): SetIterator<HucreId> {
    return this.values();
  }
  get [Symbol.toStringTag](): string {
    return "AyrilmisKumesi";
  }
}

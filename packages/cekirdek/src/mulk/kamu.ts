/**
 * Kamu arsası (docs/12 §10, docs/06 §15.6): satılmayan hücreler. Dört bileşen, her biri `parametreler.mulk.kamu` parametresi:
 *  A. Mahalle paketi: mahalle (ya da küme) başına SABİT hücre (varsayılan meydan 5 + pazar 7 + park 8 = 20);
 *  B. Hazine rezervi: ilçenin uygun hücrelerinin %4'ü (`hazineRezerviPpm`), birkaç büyük dikdörtgen ada olarak (`hazineAdaHucre`
 *     hedef boyut, `hazineEnFazlaAda` ada sayısı tavanı);
 *  C. İlçe merkezi: 8–12 hücre (`ilceMerkeziHucre`, varsayılan 10), ilçe merkezine (yurt seçimindeki tanım) en yakın;
 *  D. Kıyı şeridi: kıyı ilçesinde su hücresine `kiyiDerinlik` (2) hücre uzaklıktaki uygun hücreler.
 *
 * Fikstür bir bileşen için işaret taşıyorsa (`ParselHucreTanimi.kamu`) o bileşen KURALLA ÜRETİLMEZ; işaret geçerlidir. Mahalle
 * verisi (`ParselIlceTanimi.mahalleler`) varsa mahalle paketi o mahallelerden ayrılır; yoksa ilçe dengeli ŞERİT-BÖLMEYLE
 * `max(1, yuvarlama(uygun / mahalleHucreHedefi))` kümeye bölünür. Yerleştirme sırası D, C, A, B'dir (sabit geometri önce).
 *
 * BLOKLAR DİKDÖRTGENDİR: bir blok (n hücre) önce n'ye en uygun dolu dikdörtgen (n = en × boy, en/boy ≤ 3; değilse kareye yakın
 * dikdörtgen + sağ kenarda artık sütun) olarak merkeze en yakın TAMAMEN SERBEST yere aranır; sığmazsa iki yarıya bölünüp her biri aynı
 * hedefe yakın aranır (en küçüğü tek hücre). Dikdörtgen yalnız UYGUN serbest hücre içerir (yol/su bloğun içine girmez). Eşitlikte
 * (y, x) sırası. Hepsi tamsayı ve deterministiktir.
 *
 * DURUM bloklar listesidir (`KamuGrubuDurumu.dikdortgenler`): ızgara satır satır taranır ve aynı (sahip, tür) ve aynı [x0, x1]
 * aralıklı ardışık satırlar tek dikdörtgende birleşir; blok sayısı hücre sayısıyla değil geometriyle ölçeklenir (Gebze: ≈ 2 bin blok
 * ≈ 22 bin hücre). Nokta sorgusu kova (64 × 64) dizinidir. Okuma API'si (`kamuHucreleri`, `kamuBilgisi`, `kamuHucreMi`,
 * `kamuBloklari`) kodlamayı gizler.
 *
 * ÖLÇEK: hesap ilçenin sınırlayıcı kutusunda tür atanmış (typed array) ızgarada çalışır; O(hücre) işi yalnız kimlik ayrıştırma ve
 * birkaç sayım geçişidir, yerleştirme blok sayısıyla ölçeklenir (Gebze ≈ 486 bin uygun hücre).
 *
 * Dondurma: kamu kümesi mülk dünyası KURULURKEN (`mulkDurumuKur`) hesaplanır ve `Dunya.mulk.kamu`ya yazılır (parametre ve algoritma
 * sürümüyle). İlk satıştan çok önce dondurulmuş olur; sonra ne parametre değişikliği ne yeniden derleme onu değiştirir. Kamu hücreleri
 * `mulk.hucreler`e girmez; `IlceDurumu.uygunHucre` kamu DÜŞÜLMÜŞ (satılabilir) sayıdır.
 */
import type { MulkKamuParametreleri, ParselFiksturu, ParselHucreTanimi, ParselIlceTanimi } from "@bolge/veri";
import { carpBol } from "../sabit";
import { KAMU_SAHIP_ONEKI, PPM } from "../tipler";
import type { Dunya, HucreId, KamuBlok, KamuGrubu, KamuGrubuDurumu, KamuIlceDurumu, KamuKumesi, KamuTuru } from "../tipler";
import { hucreXY, sirali } from "./durum";
import { ilceMerkeziDizi } from "./geometri";
import { DIZI_KIRSAL_DEGIL, DIZI_SU, DIZI_UYGUN, durumEngeli } from "./hucreDizini";
import type { HucreDizini } from "./hucreDizini";
import type { IlceHucreDizileri } from "./hucreDizini";

/** Kamu algoritmasının sürümü (dünya durumuna yazılır; kümeyi üreten kural değişirse artırılır, eski dünyalar dondurulmuş kalır). */
export const KAMU_ALGORITMA_SURUMU = 1;

/** Kamu sahibi kimlikleri: `k:mahalle:<id>`, `k:ilce:<id>`, `k:il:<id>`. Oyuncu kimlikleri `k:` ile başlayamaz. */
export const kamuMahalleKimligi = (id: string): string => `${KAMU_SAHIP_ONEKI}mahalle:${id}`;
export const kamuIlceKimligi = (id: string): string => `${KAMU_SAHIP_ONEKI}ilce:${id}`;
export const kamuIlKimligi = (id: string): string => `${KAMU_SAHIP_ONEKI}il:${id}`;
/** Kimlik kamu sahibi önekini taşıyor mu (oyuncu kimliği olamaz)? */
export const kamuSahibiMi = (id: string): boolean => id.startsWith(KAMU_SAHIP_ONEKI);

/** Tür sırası (ızgara kodları için). */
const TURLER: readonly KamuTuru[] = ["meydan", "pazar", "park", "hizmet", "kiyi", "sanayi_rezervi", "hazine"];
const TUR_INDEKSI: Readonly<Record<KamuTuru, number>> = { meydan: 0, pazar: 1, park: 2, hizmet: 3, kiyi: 4, sanayi_rezervi: 5, hazine: 6 };

/** Marker türünün ait olduğu bileşen. */
const BILESEN: Readonly<Record<KamuTuru, "paket" | "merkez" | "kiyi" | "hazine">> = {
  meydan: "paket",
  pazar: "paket",
  park: "paket",
  hizmet: "merkez",
  kiyi: "kiyi",
  hazine: "hazine",
  sanayi_rezervi: "hazine",
};

/** Izgara kenar sınırı (hücre): sınırlayıcı kutu en çok bu kadar geniş/yüksek ve alanı 2^24'ü aşmaz. */
const KENAR_SINIRI = 8192;
const ALAN_SINIRI = 1 << 24;
/** Dikdörtgen sığmazsa bölünmeyen en küçük blok (hücre): bundan küçük artıklar en yakın hücrelerle tamamlanır. */
const KUCUK_BLOK = 16;

// ---------------------------------------------------------------------------
// Blok (dikdörtgen) dizini
// ---------------------------------------------------------------------------

const KOVA_BIT = 6; // 64 x 64 hücrelik kovalar
const KOVA_ANAHTAR = 1 << (20 - KOVA_BIT); // kova koordinatı < 2^14

/** Gruplar üzerinde nokta sorgusu: dikdörtgenler 64 x 64 kovalara dağıtılır. */
export interface KamuIndeksi {
  /** x0, y0, x1, y1 dörtlüleri (grup sırasıyla birleştirilmiş). */
  dik: Int32Array;
  /** dikdörtgen -> grup indeksi */
  grup: Int32Array;
  kova: Map<number, number[]>;
  /** Toplam hücre sayısı. */
  sayi: number;
}

/**
 * Bloklardan arama dizini kurar. Çakışan dikdörtgen (iki grup arasında ya da bir grupta) `Error` fırlatır (kanonik biçim ihlali).
 * Dörtlü uzunluğu 4'ün katı olmalıdır.
 */
export function kamuIndeksiKur(gruplar: readonly { dikdortgenler: readonly number[] }[]): KamuIndeksi {
  let n = 0;
  for (const g of gruplar) n += g.dikdortgenler.length / 4;
  const dik = new Int32Array(n * 4);
  const grup = new Int32Array(n);
  const kova = new Map<number, number[]>();
  let r = 0;
  let sayi = 0;
  gruplar.forEach((g, gi) => {
    for (let i = 0; i < g.dikdortgenler.length; i += 4) {
      const x0 = g.dikdortgenler[i] as number;
      const y0 = g.dikdortgenler[i + 1] as number;
      const x1 = g.dikdortgenler[i + 2] as number;
      const y1 = g.dikdortgenler[i + 3] as number;
      dik[4 * r] = x0;
      dik[4 * r + 1] = y0;
      dik[4 * r + 2] = x1;
      dik[4 * r + 3] = y1;
      grup[r] = gi;
      sayi += (x1 - x0 + 1) * (y1 - y0 + 1);
      for (let by = y0 >> KOVA_BIT; by <= y1 >> KOVA_BIT; by++) {
        for (let bx = x0 >> KOVA_BIT; bx <= x1 >> KOVA_BIT; bx++) {
          const anahtar = by * KOVA_ANAHTAR + bx;
          let l = kova.get(anahtar);
          if (l === undefined) {
            l = [];
            kova.set(anahtar, l);
          }
          for (const j of l) {
            if (x0 <= (dik[4 * j + 2] as number) && (dik[4 * j] as number) <= x1 && y0 <= (dik[4 * j + 3] as number) && (dik[4 * j + 1] as number) <= y1) {
              throw new Error("cakisan kamu dikdortgenleri");
            }
          }
          l.push(r);
        }
      }
      r++;
    }
  });
  return { dik, grup, kova, sayi };
}

/** (x, y) hücresinin grubu (indeks) ya da -1. */
export function kamuIndeksiAra(ix: KamuIndeksi, x: number, y: number): number {
  if (!(x >= 0 && y >= 0)) return -1;
  const l = ix.kova.get((y >> KOVA_BIT) * KOVA_ANAHTAR + (x >> KOVA_BIT));
  if (l === undefined) return -1;
  for (const r of l) {
    if (x >= (ix.dik[4 * r] as number) && x <= (ix.dik[4 * r + 2] as number) && y >= (ix.dik[4 * r + 1] as number) && y <= (ix.dik[4 * r + 3] as number)) return ix.grup[r] as number;
  }
  return -1;
}

/** Kompakt grubun hücre kimlikleri (sırasız; `kamuGrubunuGenislet` sıralar). */
export function kamuGrubuHucreKimlikleri(g: { dikdortgenler: readonly number[] }): HucreId[] {
  const l: HucreId[] = [];
  for (let i = 0; i < g.dikdortgenler.length; i += 4) {
    for (let y = g.dikdortgenler[i + 1] as number; y <= (g.dikdortgenler[i + 3] as number); y++) {
      for (let x = g.dikdortgenler[i] as number; x <= (g.dikdortgenler[i + 2] as number); x++) l.push(`${x}:${y}`);
    }
  }
  return l;
}

/** Kompakt grubun hücre kimlikleri (JS dize sırasıyla sıralı). */
export function kamuGrubunuGenislet(g: KamuGrubuDurumu): HucreId[] {
  return kamuGrubuHucreKimlikleri(g).sort();
}

/** Kompakt gruplar → açık biçim (okuma API'sinin döndürdüğü). */
export function kamuGruplariGenislet(gruplar: readonly KamuGrubuDurumu[]): KamuGrubu[] {
  return gruplar.map((g) => ({ sahip: g.sahip, tur: g.tur, hucreler: kamuGrubunuGenislet(g) }));
}

/** Kompakt grubun hücre sayısı. */
export function kamuGrubuSayisi(g: { dikdortgenler: readonly number[] }): number {
  let n = 0;
  for (let i = 0; i < g.dikdortgenler.length; i += 4) {
    n += ((g.dikdortgenler[i + 2] as number) - (g.dikdortgenler[i] as number) + 1) * ((g.dikdortgenler[i + 3] as number) - (g.dikdortgenler[i + 1] as number) + 1);
  }
  return n;
}

// ---------------------------------------------------------------------------
// Hesap (saf; ızgara üzerinde)
// ---------------------------------------------------------------------------

interface Izgara {
  minx: number;
  miny: number;
  w: number;
  h: number;
  /** 1 = serbest uygun hücre; diğerleri 0. */
  serbest: Uint8Array;
  /** atanmış hücrenin kodu (sahip indeksi × 8 + tür indeksi + 1); 0 = atanmamış. */
  kod: Int32Array;
}

/** Blok şekli: ana dikdörtgen `w × h` ve (gerekirse) sağ kenara bitişik `ek` hücrelik sütun (üst hizalı, ek < h). */
interface Sekil {
  w: number;
  h: number;
  ek: number;
}

/**
 * n hücre için şekil: n = en × boy ve en/boy ≤ 3 olacak biçimde tam bölünen (kareye en yakın) dikdörtgen; yoksa
 * `taban(√n)` satırlı ana dikdörtgen + artık sütun.
 */
function sekilSec(n: number): Sekil {
  let r = Math.floor(Math.sqrt(n));
  while ((r + 1) * (r + 1) <= n) r++;
  while (r * r > n) r--;
  for (let b = r; b >= 1; b--) {
    if (n % b === 0 && n / b <= 3 * b) return { w: n / b, h: b, ek: 0 };
    if (n / b > 3 * b && b < r) break;
  }
  const h = Math.max(1, r);
  const w = Math.floor(n / h);
  return { w, h, ek: n - w * h };
}

/** Yerleştirici: şekilleri merkeze en yakın TAMAMEN uygun ve serbest yere koyar (ızgara indeks listesi döndürür). */
class Yerlestirici {
  constructor(private readonly g: Izgara) {}

  private yaricap(cx: number, cy: number): number {
    const { minx, miny, w, h } = this.g;
    return Math.max(Math.abs(cx - minx), Math.abs(cx - (minx + w - 1)), Math.abs(cy - miny), Math.abs(cy - (miny + h - 1)));
  }

  /** (cx, cy) çevresindeki r Chebyshev halkasında ızgara içi (mutlak) koordinatlar. */
  private halka(cx: number, cy: number, r: number, fn: (x: number, y: number) => void): void {
    if (r === 0) {
      fn(cx, cy);
      return;
    }
    for (let x = cx - r; x <= cx + r; x++) {
      fn(x, cy - r);
      fn(x, cy + r);
    }
    for (let y = cy - r + 1; y <= cy + r - 1; y++) {
      fn(cx - r, y);
      fn(cx + r, y);
    }
  }

  private uyar(ax: number, ay: number, sk: Sekil, ok: (idx: number) => boolean): boolean {
    const { minx, miny, w, h } = this.g;
    const tw = sk.w + (sk.ek > 0 ? 1 : 0);
    if (ax < minx || ay < miny || ax + tw > minx + w || ay + sk.h > miny + h) return false;
    for (let y = 0; y < sk.h; y++) {
      const satir = (ay + y - miny) * w + (ax - minx);
      for (let x = 0; x < sk.w; x++) if (!ok(satir + x)) return false;
    }
    for (let y = 0; y < sk.ek; y++) if (!ok((ay + y - miny) * w + (ax + sk.w - minx))) return false;
    return true;
  }

  /** Şeklin hücreleri (ızgara indeksleri). */
  private hucreler(ax: number, ay: number, sk: Sekil): number[] {
    const { minx, miny, w } = this.g;
    const l: number[] = [];
    for (let y = 0; y < sk.h; y++) for (let x = 0; x < sk.w; x++) l.push((ay + y - miny) * w + (ax + x - minx));
    for (let y = 0; y < sk.ek; y++) l.push((ay + y - miny) * w + (ax + sk.w - minx));
    return l;
  }

  /** Şekli hedefe (cx, cy) en yakın (çapa mesafesi, eşitlikte (y, x)) uyan yere koyar; `yaricap` halkasında bulunamazsa null. */
  private ara(sk: Sekil, cx: number, cy: number, ok: (idx: number) => boolean, yaricap: number): number[] | null {
    const tw = sk.w + (sk.ek > 0 ? 1 : 0);
    const hx = cx - Math.floor(tw / 2);
    const hy = cy - Math.floor(sk.h / 2);
    const en = { d: Number.POSITIVE_INFINITY, x: 0, y: 0, var: false };
    for (let r = 0; r <= yaricap; r++) {
      if (en.var && r * r > en.d) break;
      this.halka(hx, hy, r, (x, y) => {
        const d = (x - hx) * (x - hx) + (y - hy) * (y - hy);
        if (en.var && (d > en.d || (d === en.d && (y > en.y || (y === en.y && x > en.x))))) return;
        if (this.uyar(x, y, sk, ok)) {
          en.d = d;
          en.x = x;
          en.y = y;
          en.var = true;
        }
      });
    }
    return en.var ? this.hucreler(en.x, en.y, sk) : null;
  }

  /** (cx, cy)'ye en yakın `n` uygun hücre (bitişiklik aranmaz; küçük artıklar için). Eşitlikte ızgara indeksi (y, x). */
  private enYakinlar(n: number, cx: number, cy: number, ok: (idx: number) => boolean): number[] {
    const { minx, miny, w, h } = this.g;
    const maxR = this.yaricap(cx, cy);
    let adaylar: { d: number; i: number }[] = [];
    for (let r = 0; r <= maxR; r++) {
      this.halka(cx, cy, r, (x, y) => {
        if (x < minx || y < miny || x >= minx + w || y >= miny + h) return;
        const i = (y - miny) * w + (x - minx);
        if (ok(i)) adaylar.push({ d: (x - cx) * (x - cx) + (y - cy) * (y - cy), i });
      });
      if (adaylar.length >= n) {
        adaylar.sort((a, b) => a.d - b.d || a.i - b.i);
        adaylar = adaylar.slice(0, n);
        if ((r + 1) * (r + 1) > (adaylar[n - 1] as { d: number }).d) break;
      }
    }
    adaylar.sort((a, b) => a.d - b.d || a.i - b.i);
    return adaylar.slice(0, n).map((a) => a.i);
  }

  /**
   * `n` hücrelik blok: dolu dikdörtgen şekil aranır; sığmazsa (n > `KUCUK_BLOK`) iki yarıya bölünür (her yarı aynı hedefe yakın
   * aranır); küçük artıklar en yakın uygun hücrelerle tamamlanır. Havuz yetmezse daha az hücre döner.
   */
  yerlestir(n: number, cx: number, cy: number, ok: (idx: number) => boolean): number[] {
    const secili = new Set<number>();
    const ok2 = (i: number): boolean => ok(i) && !secili.has(i);
    const coz = (m: number): void => {
      if (m <= 0) return;
      const sk = sekilSec(m);
      const bul = this.ara(sk, cx, cy, ok2, Math.max(8, 2 * (sk.w + sk.h)));
      if (bul !== null) {
        for (const i of bul) secili.add(i);
        return;
      }
      if (m <= KUCUK_BLOK) {
        for (const i of this.enYakinlar(m, cx, cy, ok2)) secili.add(i);
        return;
      }
      const b = Math.ceil(m / 2);
      coz(b);
      coz(m - b);
    };
    coz(n);
    return [...secili];
  }
}

/**
 * Dengeli şerit-bölme: `hucreler` (ızgara indeksleri) `m` dengeli kümeye bölünür. Sütunlar `gx` şeride (gx·gx·h ≈ m·w) bölünür; her şerit
 * kendi küme payı kadar satır bandına. Eşik değerleri histogramın kümülatifinden (tamsayı); soldan sağa, yukarıdan aşağıya numaralanır.
 * Dönen: hücre başına küme (0..m-1).
 */
function seritBol(g: Izgara, hucreler: Int32Array, m: number): Uint16Array {
  const { w, h } = g;
  const kume = new Uint16Array(hucreler.length);
  if (m <= 1 || hucreler.length === 0) return kume;
  // gx: |gx² · h − m · w| en küçük (eşitlikte küçük gx)
  let gx = 1;
  let enIyi = Number.POSITIVE_INFINITY;
  for (let k = 1; k <= m; k++) {
    const f = Math.abs(k * k * h - m * w);
    if (f < enIyi) {
      enIyi = f;
      gx = k;
    }
  }
  const sutun = new Int32Array(w);
  for (const i of hucreler) sutun[i % w] = (sutun[i % w] as number) + 1;
  const toplam = hucreler.length;
  const pay: number[] = [];
  for (let i = 0; i < gx; i++) pay.push(Math.floor(m / gx) + (i < m % gx ? 1 : 0));
  const sutunSerit = new Int32Array(w);
  let birikim = 0;
  let hedefM = 0;
  let serit = 0;
  for (let x = 0; x < w; x++) {
    sutunSerit[x] = serit;
    birikim += sutun[x] as number;
    if (serit < gx - 1 && birikim >= Math.floor((toplam * (hedefM + (pay[serit] as number))) / m)) {
      hedefM += pay[serit] as number;
      serit++;
    }
  }
  const satir: Int32Array[] = Array.from({ length: gx }, () => new Int32Array(h));
  const seritToplam = new Int32Array(gx);
  for (const i of hucreler) {
    const s = sutunSerit[i % w] as number;
    const sr = satir[s] as Int32Array;
    sr[Math.floor(i / w)] = (sr[Math.floor(i / w)] as number) + 1;
    seritToplam[s] = (seritToplam[s] as number) + 1;
  }
  const satirKume: Int32Array[] = [];
  let taban = 0;
  for (let s = 0; s < gx; s++) {
    const ms = pay[s] as number;
    const kn = new Int32Array(h);
    let b = 0;
    let parca = 0;
    const st = seritToplam[s] as number;
    for (let y = 0; y < h; y++) {
      kn[y] = taban + parca;
      b += (satir[s] as Int32Array)[y] as number;
      if (parca < ms - 1 && b >= Math.floor((st * (parca + 1)) / ms)) parca++;
    }
    satirKume.push(kn);
    taban += ms;
  }
  for (let k = 0; k < hucreler.length; k++) {
    const i = hucreler[k] as number;
    kume[k] = (satirKume[sutunSerit[i % w] as number] as Int32Array)[Math.floor(i / w)] as number;
  }
  return kume;
}

/** "x:y" -> (x, y) hızlı ayrıştırma (kimlikler denetimlidir: yalnız rakam ve tek ':'). */
function ayir(id: string, xy: Int32Array, k: number): void {
  let x = 0;
  let i = 0;
  const n = id.length;
  for (; i < n; i++) {
    const c = id.charCodeAt(i);
    if (c === 58) break;
    x = x * 10 + (c - 48);
  }
  let y = 0;
  for (i++; i < n; i++) y = y * 10 + (id.charCodeAt(i) - 48);
  xy[2 * k] = x;
  xy[2 * k + 1] = y;
}

/**
 * Bir ilçenin kamu kümesini hesaplar (saf; dünyaya bakmaz). `su` fikstürün TÜM su hücreleridir (x, y çiftleri düz dizi; kıyı için komşu
 * ilçelerin suyu da görülür). Sınırlayıcı kutu sınırı aşılırsa `Error` fırlatır.
 */
export function ilceKamuHesapla(c: ParselIlceTanimi, su: Int32Array, kp: MulkKamuParametreleri): KamuKumesi {
  return ilceKamuHesaplaDizi(fikstureDizi(c), su, kp);
}

/** Fikstür ilçesinden hesap girdisi (hücre dizisi sırasıyla): koordinatlar, bayraklar ve kamu işaretleri. */
function fikstureDizi(c: ParselIlceTanimi): IlceHucreDizileri {
  const n = c.hucreler.length;
  const xy = new Int32Array(n * 2);
  const xs = new Int32Array(n);
  const ys = new Int32Array(n);
  const bayrak = new Uint8Array(n);
  const isaretler: { i: number; tur: KamuTuru }[] = [];
  for (let i = 0; i < n; i++) {
    const hc = c.hucreler[i] as ParselHucreTanimi;
    ayir(hc.id, xy, i);
    xs[i] = xy[2 * i] as number;
    ys[i] = xy[2 * i + 1] as number;
    let f = hc.uygun ? DIZI_UYGUN : 0;
    if (hc.uygun && hc.sinif !== "kirsal") f |= DIZI_KIRSAL_DEGIL;
    if (hc.engel === "su") f |= DIZI_SU;
    bayrak[i] = f;
    if (hc.kamu !== undefined && hc.uygun) isaretler.push({ i, tur: hc.kamu });
  }
  const o: IlceHucreDizileri = { id: c.id, n, xs, ys, bayrak, isaretler };
  if (c.mahalleler !== undefined) o.mahalleler = c.mahalleler;
  return o;
}

/** `ilceKamuHesapla` çekirdeği: hücre dizilerinden (fikstür ya da kompakt hücre dizini) hesap. */
export function ilceKamuHesaplaDizi(c: IlceHucreDizileri, su: Int32Array, kp: MulkKamuParametreleri): KamuKumesi {
  const ilceSahip = kamuIlceKimligi(c.id);
  // --- Izgara ---
  let minx = Number.POSITIVE_INFINITY;
  let miny = Number.POSITIVE_INFINITY;
  let maxx = -1;
  let maxy = -1;
  let uygunSayisi = 0;
  for (let i = 0; i < c.n; i++) {
    if (((c.bayrak[i] as number) & DIZI_UYGUN) === 0) continue;
    const x = c.xs[i] as number;
    const y = c.ys[i] as number;
    uygunSayisi++;
    if (x < minx) minx = x;
    if (x > maxx) maxx = x;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
  }
  if (uygunSayisi === 0) return { gruplar: [], sayi: 0 };
  const w = maxx - minx + 1;
  const h = maxy - miny + 1;
  if (w > KENAR_SINIRI || h > KENAR_SINIRI || w * h > ALAN_SINIRI) throw new Error(`ilceKamuHesapla: ilce sinirlayici kutusu cok buyuk (${w} x ${h}): ${c.id}`);
  const g: Izgara = { minx, miny, w, h, serbest: new Uint8Array(w * h), kod: new Int32Array(w * h) };
  for (let i = 0; i < c.n; i++) {
    if (((c.bayrak[i] as number) & DIZI_UYGUN) !== 0) g.serbest[((c.ys[i] as number) - miny) * w + ((c.xs[i] as number) - minx)] = 1;
  }
  const idxOf = (x: number, y: number): number => (y - miny) * w + (x - minx);
  const yer = new Yerlestirici(g);

  // --- Sahip kayıt defteri ---
  const sahipler: string[] = [];
  const sahipIndeksi = new Map<string, number>();
  const sahipNo = (s: string): number => {
    let i = sahipIndeksi.get(s);
    if (i === undefined) {
      i = sahipler.length;
      sahipler.push(s);
      sahipIndeksi.set(s, i);
    }
    return i;
  };
  let serbestSayisi = uygunSayisi;
  const ata = (idxler: readonly number[], sahip: string, tur: KamuTuru): void => {
    const k = sahipNo(sahip) * 8 + TUR_INDEKSI[tur] + 1;
    for (const i of idxler) {
      if (g.serbest[i] === 1) {
        g.serbest[i] = 0;
        g.kod[i] = k;
        serbestSayisi--;
      }
    }
  };

  // --- 1. Fikstür işaretleri (kurala üstün) ---
  const mahalleSahibi = new Map<HucreId, string>();
  for (const m of c.mahalleler ?? []) for (const hid of m.hucreler) mahalleSahibi.set(hid, kamuMahalleKimligi(m.id));
  const isaretli = { paket: false, merkez: false, kiyi: false, hazine: false };
  for (const is of c.isaretler) {
    const x = c.xs[is.i] as number;
    const y = c.ys[is.i] as number;
    const bilesen = BILESEN[is.tur];
    isaretli[bilesen] = true;
    ata([idxOf(x, y)], bilesen === "paket" ? (mahalleSahibi.get(`${x}:${y}`) ?? ilceSahip) : ilceSahip, is.tur);
  }
  const serbestMi = (i: number): boolean => g.serbest[i] === 1;

  // --- 2. D: kıyı şeridi (kıyı ilçesi: en az `kiyiIlceMinSuHucre` su hücresi) ---
  if (!isaretli.kiyi && kp.kiyiDerinlik > 0) {
    let suSayisi = 0;
    for (let i = 0; i < c.n; i++) if (((c.bayrak[i] as number) & DIZI_SU) !== 0) suSayisi++;
    if (suSayisi >= kp.kiyiIlceMinSuHucre) {
      const D = kp.kiyiDerinlik;
      const kiyi: number[] = [];
      for (let k = 0; k < su.length; k += 2) {
        const sx = su[k] as number;
        const sy = su[k + 1] as number;
        if (sx < minx - D || sx > maxx + D || sy < miny - D || sy > maxy + D) continue;
        for (let dy = -D; dy <= D; dy++) {
          for (let dx = -D; dx <= D; dx++) {
            if (Math.abs(dx) + Math.abs(dy) > D) continue;
            const x = sx + dx;
            const y = sy + dy;
            if (x < minx || x > maxx || y < miny || y > maxy) continue;
            const i = idxOf(x, y);
            if (g.serbest[i] === 1) kiyi.push(i);
          }
        }
      }
      ata(kiyi, ilceSahip, "kiyi");
    }
  }

  // --- 3. C: ilçe merkezi alanı ---
  const [mx, my] = ilceMerkeziDizi(c);
  if (!isaretli.merkez && kp.ilceMerkeziHucre > 0 && serbestSayisi > 0) {
    ata(yer.yerlestir(Math.min(kp.ilceMerkeziHucre, serbestSayisi), mx, my, serbestMi), ilceSahip, "hizmet");
  }

  // --- 4. A: mahalle paketi ---
  if (!isaretli.paket) {
    // Küme ızgarası: hücre -> küme no (1..M); 0 = kümesiz. Küme merkezi: kümenin TÜM uygun hücrelerinin ağırlık merkezi.
    const kumeNo = new Uint16Array(w * h);
    const sahipKume: string[] = [];
    if (c.mahalleler !== undefined && c.mahalleler.length > 0) {
      [...c.mahalleler]
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .forEach((mh, k) => {
          sahipKume.push(kamuMahalleKimligi(mh.id));
          for (const hid of mh.hucreler) {
            const t = new Int32Array(2);
            ayir(hid, t, 0);
            const x = t[0] as number;
            const y = t[1] as number;
            if (x < minx || x > maxx || y < miny || y > maxy) continue;
            const i = idxOf(x, y);
            if (g.serbest[i] === 1 || g.kod[i] !== 0) kumeNo[i] = k + 1;
          }
        });
    } else {
      let say = 0;
      for (let i = 0; i < w * h; i++) if (g.serbest[i] === 1 || g.kod[i] !== 0) say++;
      const tumUygun = new Int32Array(say);
      for (let i = 0, j = 0; i < w * h; i++) if (g.serbest[i] === 1 || g.kod[i] !== 0) tumUygun[j++] = i;
      const m = Math.max(1, Math.min(say, Math.floor((2 * uygunSayisi + kp.mahalleHucreHedefi) / (2 * kp.mahalleHucreHedefi))));
      const kn = seritBol(g, tumUygun, m);
      for (let k = 0; k < tumUygun.length; k++) kumeNo[tumUygun[k] as number] = (kn[k] as number) + 1;
      for (let k = 0; k < m; k++) sahipKume.push(kamuMahalleKimligi(`${c.id}_${k + 1}`));
    }
    const M = sahipKume.length;
    const sx = new Float64Array(M);
    const sy = new Float64Array(M);
    const sn = new Int32Array(M);
    const serbestKume = new Int32Array(M);
    for (let i = 0; i < w * h; i++) {
      const k = (kumeNo[i] as number) - 1;
      if (k < 0) continue;
      sx[k] = (sx[k] as number) + minx + (i % w);
      sy[k] = (sy[k] as number) + miny + Math.floor(i / w);
      sn[k] = (sn[k] as number) + 1;
      if (g.serbest[i] === 1) serbestKume[k] = (serbestKume[k] as number) + 1;
    }
    for (let k = 0; k < M; k++) {
      if ((sn[k] as number) === 0) continue;
      const cx = Math.floor((sx[k] as number) / (sn[k] as number));
      const cy = Math.floor((sy[k] as number) / (sn[k] as number));
      const ok = (i: number): boolean => g.serbest[i] === 1 && kumeNo[i] === k + 1;
      for (const oge of kp.mahallePaketi) {
        const n = Math.min(oge.hucre, serbestKume[k] as number);
        if (n <= 0) break;
        const ids = yer.yerlestir(n, cx, cy, ok);
        ata(ids, sahipKume[k] as string, oge.tur);
        serbestKume[k] = (serbestKume[k] as number) - ids.length;
      }
    }
  }

  // --- 5. B: hazine rezervi (birkaç büyük dikdörtgen ada; ilçe merkezinden en uzak noktalarda) ---
  if (!isaretli.hazine && kp.hazineRezerviPpm > 0) {
    let kalan = carpBol(uygunSayisi, kp.hazineRezerviPpm, PPM);
    const uzakNokta = (ok: (i: number) => boolean, aday?: Int32Array): number => {
      let en = -1;
      let enD = -1;
      const tara = (i: number): void => {
        if (!ok(i)) return;
        const x = minx + (i % w);
        const y = miny + Math.floor(i / w);
        const d = (x - mx) * (x - mx) + (y - my) * (y - my);
        if (d > enD) {
          en = i;
          enD = d;
        }
      };
      if (aday === undefined) for (let i = 0; i < w * h; i++) tara(i);
      else for (const i of aday) tara(i);
      return en;
    };
    const adaSayisi = Math.max(0, Math.min(Math.ceil(kalan / Math.max(1, kp.hazineAdaHucre)), kp.hazineEnFazlaAda, serbestSayisi, 60_000));
    if (adaSayisi > 0) {
      let say = 0;
      for (let i = 0; i < w * h; i++) if (g.serbest[i] === 1) say++;
      const dizi = new Int32Array(say);
      for (let i = 0, j = 0; i < w * h; i++) if (g.serbest[i] === 1) dizi[j++] = i;
      const kn = seritBol(g, dizi, adaSayisi);
      const kume = new Uint16Array(w * h);
      const kumeler: number[][] = Array.from({ length: adaSayisi }, () => []);
      for (let k = 0; k < dizi.length; k++) {
        (kumeler[kn[k] as number] as number[]).push(dizi[k] as number);
        kume[dizi[k] as number] = (kn[k] as number) + 1;
      }
      const hedefToplam = kalan;
      for (let k = 0; k < adaSayisi && kalan > 0; k++) {
        const aday = Int32Array.from(kumeler[k] as number[]);
        const ok = (i: number): boolean => g.serbest[i] === 1 && kume[i] === k + 1;
        const bas = uzakNokta(ok, aday);
        if (bas < 0) continue;
        // ada boyutu: rezerv adalar arasında eşit paylaştırılır (ilk `rezerv % ada` adaya +1)
        const n = Math.min(Math.floor(hedefToplam / adaSayisi) + (k < hedefToplam % adaSayisi ? 1 : 0), kalan);
        const ids = yer.yerlestir(n, minx + (bas % w), miny + Math.floor(bas / w), ok);
        ata(ids, ilceSahip, "hazine");
        kalan -= ids.length;
      }
    }
    // Pay kümelerin darlığından kalan açık: ilçe geneli serbest hücreden (en uzak noktada başlayarak) tamamlanır.
    while (kalan > 0 && serbestSayisi > 0) {
      const bas = uzakNokta(serbestMi);
      const ids = yer.yerlestir(Math.min(Math.max(1, kp.hazineAdaHucre), kalan, serbestSayisi), minx + (bas % w), miny + Math.floor(bas / w), serbestMi);
      if (ids.length === 0) break;
      ata(ids, ilceSahip, "hazine");
      kalan -= ids.length;
    }
  }

  // --- Çıktı: ızgara satır satır taranır; aynı (sahip, tür) ve aynı [x0, x1] aralıklı ardışık satırlar tek dikdörtgende birleşir ---
  interface Acik {
    k: number;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  }
  const gruplar = new Map<number, number[]>();
  let acik = new Map<string, Acik>();
  const kapat = (a: Acik): void => {
    let l = gruplar.get(a.k);
    if (l === undefined) {
      l = [];
      gruplar.set(a.k, l);
    }
    l.push(a.x0, a.y0, a.x1, a.y1);
  };
  let sayi = 0;
  for (let y = 0; y < h; y++) {
    const yeniAcik = new Map<string, Acik>();
    let x = 0;
    while (x < w) {
      const k = g.kod[y * w + x] as number;
      if (k === 0) {
        x++;
        continue;
      }
      let x2 = x;
      while (x2 + 1 < w && g.kod[y * w + x2 + 1] === k) x2++;
      const anahtar = `${k}:${x}:${x2}`;
      const onceki = acik.get(anahtar);
      if (onceki !== undefined && onceki.y1 === miny + y - 1) {
        onceki.y1 = miny + y;
        yeniAcik.set(anahtar, onceki);
        acik.delete(anahtar);
      } else yeniAcik.set(anahtar, { k, x0: minx + x, x1: minx + x2, y0: miny + y, y1: miny + y });
      sayi += x2 - x + 1;
      x = x2 + 1;
    }
    for (const a of acik.values()) kapat(a);
    acik = yeniAcik;
  }
  for (const a of acik.values()) kapat(a);
  const sonuc: KamuGrubuDurumu[] = [];
  for (const [k, dik] of gruplar) {
    const kk = k - 1;
    // dörtlüleri (y0, x0) ile sırala
    const dortlu: [number, number, number, number][] = [];
    for (let i = 0; i < dik.length; i += 4) dortlu.push([dik[i] as number, dik[i + 1] as number, dik[i + 2] as number, dik[i + 3] as number]);
    dortlu.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    sonuc.push({ sahip: sahipler[Math.floor(kk / 8)] as string, tur: TURLER[kk % 8] as KamuTuru, dikdortgenler: dortlu.flat() });
  }
  sonuc.sort((a, b) => (a.sahip < b.sahip ? -1 : a.sahip > b.sahip ? 1 : a.tur < b.tur ? -1 : a.tur > b.tur ? 1 : 0));
  return { gruplar: sonuc, sayi };
}

/** Fikstürün tüm ilçeleri için kamu kümeleri (derleme zamanında bir kez; `mulkDurumuKur` bunu dondurur). */
export function kamuKumeleriHesapla(f: ParselFiksturu | HucreDizini, kp: MulkKamuParametreleri): Map<string, KamuKumesi> {
  const sonuc = new Map<string, KamuKumesi>();
  // Dizin ayrımı yapısaldır (`instanceof` değil): sınıfın değeri bu modülde okunmaz, mülk kipsiz paketlemede (istemci işçisi) ağaç sallamayla düşer.
  if ("ilceNo" in f) {
    // Kompakt dizin: ilçe başına geçici diziler (yineleme sırasıyla); su hücreleri önce tüm ilçelerden toplanır (kıyı komşu ilçenin suyunu da görür).
    const suListe: number[] = [];
    if (kp.kiyiDerinlik > 0) {
      for (let no = 0; no < f.ilceSayisi; no++) {
        f.gez(no, (x, y, b) => {
          if ((b & 4) !== 0 && durumEngeli(b) === "su") suListe.push(x, y);
        });
      }
    }
    const su = Int32Array.from(suListe);
    for (let no = 0; no < f.ilceSayisi; no++) {
      const g = f.ilceDizileri(no);
      sonuc.set(g.id, ilceKamuHesaplaDizi(g, su, kp));
    }
    return sonuc;
  }
  // Fikstürün tüm su hücreleri (kıyı komşu ilçenin suyunu da görür).
  const suListe: number[] = [];
  if (kp.kiyiDerinlik > 0) {
    for (const c of f.ilceler) {
      for (const hc of c.hucreler) {
        if (hc.engel === "su") {
          const [x, y] = hucreXY(hc.id);
          suListe.push(x, y);
        }
      }
    }
  }
  const su = Int32Array.from(suListe);
  for (const c of f.ilceler) sonuc.set(c.id, ilceKamuHesapla(c, su, kp));
  return sonuc;
}

// ---------------------------------------------------------------------------
// Dünya durumu üzerinde okuma API'si (kodlamayı gizler)
// ---------------------------------------------------------------------------

const indeksOnbellegi = new WeakMap<readonly KamuGrubuDurumu[], KamuIndeksi>();
const genisOnbellegi = new WeakMap<readonly KamuGrubuDurumu[], KamuGrubu[]>();

function ilceKaydi(d: Dunya, ilce: string): KamuIlceDurumu | undefined {
  const k = d.mulk?.kamu;
  if (k === undefined) return undefined;
  const i = sirali(k, (x) => x.ilce, ilce);
  return i >= 0 ? k[i] : undefined;
}

function indeks(gruplar: readonly KamuGrubuDurumu[]): KamuIndeksi {
  let ix = indeksOnbellegi.get(gruplar);
  if (ix === undefined) {
    ix = kamuIndeksiKur(gruplar);
    indeksOnbellegi.set(gruplar, ix);
  }
  return ix;
}

/**
 * Hücrenin kamu bilgisi (tür ve sahip) ya da kamu değilse tanımsız. Dünya kamu kuralı olmadan kurulmuşsa (`mulk.kamu` yok)
 * her hücre için tanımsızdır. Maliyet O(blok içi kova); büyük ilçede de ucuzdur.
 */
export function kamuBilgisi(d: Dunya, ilce: string, hucre: HucreId): { tur: KamuTuru; sahip: string } | undefined {
  const k = ilceKaydi(d, ilce);
  if (k === undefined) return undefined;
  const [x, y] = hucreXY(hucre);
  const gi = kamuIndeksiAra(indeks(k.gruplar), x, y);
  if (gi < 0) return undefined;
  const g = k.gruplar[gi] as KamuGrubuDurumu;
  return { tur: g.tur, sahip: g.sahip };
}

/** Hücre kamu arsası mı (satılmaz)? */
export function kamuHucreMi(d: Dunya, ilce: string, hucre: HucreId): boolean {
  const k = ilceKaydi(d, ilce);
  if (k === undefined) return false;
  const [x, y] = hucreXY(hucre);
  return kamuIndeksiAra(indeks(k.gruplar), x, y) >= 0;
}

/**
 * İlçenin dondurulmuş kamu BLOKLARI (dikdörtgenler; salt okunur; kural kapalıysa boş): (sahip, tür) sonra (y0, x0) sırasıyla. Her blok
 * yalnız uygun kamu hücrelerini kapsar. Tel biçimi ve istemci çizimi için hücre listesinden çok daha küçüktür.
 */
export function kamuBloklari(d: Dunya, ilce: string): readonly KamuBlok[] {
  const k = ilceKaydi(d, ilce);
  if (k === undefined) return [];
  const l: KamuBlok[] = [];
  for (const g of k.gruplar) {
    for (let i = 0; i < g.dikdortgenler.length; i += 4) {
      l.push({ sahip: g.sahip, tur: g.tur, x0: g.dikdortgenler[i] as number, y0: g.dikdortgenler[i + 1] as number, x1: g.dikdortgenler[i + 2] as number, y1: g.dikdortgenler[i + 3] as number });
    }
  }
  return l;
}

/**
 * İlçenin dondurulmuş kamu grupları, AÇIK biçimde (sahip, tür, hücre kimlikleri; salt okunur; kural kapalıysa boş). İlk çağrıda
 * genişletilir ve ön belleklenir (büyük ilçede on binlerce kimlik; sık çağrılmamalıdır: nokta sorgusu için `kamuBilgisi`, çizim için
 * `kamuBloklari`).
 */
export function kamuHucreleri(d: Dunya, ilce: string): readonly KamuGrubu[] {
  const k = ilceKaydi(d, ilce);
  if (k === undefined) return [];
  let l = genisOnbellegi.get(k.gruplar);
  if (l === undefined) {
    l = kamuGruplariGenislet(k.gruplar);
    genisOnbellegi.set(k.gruplar, l);
  }
  return l;
}

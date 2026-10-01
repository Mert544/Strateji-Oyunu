/**
 * Hazır arsalar (F4, saf; DOM ve harita yok): ızgaradan (BHI1) türetilen 4–12 hücrelik satın alınabilir arsalar.
 *
 * GEÇİCİ istemci türetmesi: üretim hattı (veri-hatti) bu bölmeyi ızgarayla birlikte üretip dağıtınca bu dosya yalnız
 * okuyucuya iner (rapor: "üretim hattına taşınma önerisi"). Kurallar, deterministik ve konuma bağlı (ızgara çerçevesinden
 * bağımsız):
 *   1. Satın alınabilir hücreler (yol, su ve askerî alan hariç) 4 komşulukla bağlı bileşenlere ayrılır: yollar ve engeller
 *      bileşenleri ayıran "ada sınırları"dır.
 *   2. 4–12 hücrelik bileşen tek arsadır. 4'ten küçük bileşenlerde arsa yoktur (artık hücre).
 *   3. 12'den büyük bileşen, mutlak koordinatlarda 3×3'lük bir blok örgüsüyle kesilir. Bir bileşenin bir bloktaki hücreleri
 *      (bağlı parçalar) adaydır: ≥4 hücreliyse arsa olur, <4 ise en çok paylaştığı komşu parçaya (toplam ≤12) katılır.
 *      Katılabileceği yer yoksa artık hücre kalır.
 *   4. Arsa kimliği `arsa:<x>:<y>`: arsanın (y, x) sırasında ilk hücresi. Aynı ızgara için çıktı her zaman aynıdır.
 *   5. KAMU ARSASI (docs/06 §15.6): kamu hücreleri SUNUCUDAN gelir (`IlceSahipligi.kamu`, dikdörtgen bloklar; dünya kurulurken
 *      donar) ve arsaya girmez: yol ve su gibi ada sınırıdır. Kamu kümesi tüm istemcilerde aynı olduğundan kimlikler de aynıdır.
 * Satın alma durumu (sahiplik) bölmeye girmez: kimlikler tüm istemcilerde aynıdır.
 */
import type { ArsaSinifi, HucreId } from "@bolge/cekirdek";
import type { KamuGrubuKaresi } from "@bolge/protokol";
import { arsaSinifi } from "./fiyat";
import { durumSinifi, hucreId, satinAlinabilir, xtenBoylam, ytenEnlem } from "./hucre";
import type { Izgara } from "./hucre";

export const ARSA_EN_AZ = 4;
export const ARSA_EN_COK = 12;
/** Büyük bileşenleri kesen blok kenarı (hücre). 3×3 = en çok 9 hücre. */
export const ARSA_BLOK = 3;

export interface Arsa {
  /** `arsa:<x>:<y>` */
  kimlik: string;
  /** Hücre kimlikleri ("x:y"), (y, x) sırasında. */
  hucreler: HucreId[];
  /** Sınırlayıcı kutu (hücre koordinatı, iki uç dahil). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Ağırlık merkezi (hücre koordinatı). */
  cx: number;
  cy: number;
  /** Sınıf başına hücre sayısı. */
  siniflar: Partial<Record<ArsaSinifi, number>>;
  /** Çoğunluk arsa sınıfı (eşitlikte kırsal < kasaba < şehir sırasıyla ilki). */
  baskin: ArsaSinifi;
  /** Çoğunluk arazi kullanımı (BHI1 sınıfı 0–5). */
  arazi: number;
}

export interface ArsaKumesi {
  izgara: Izgara;
  /** (y, x) sırasında. */
  arsalar: Arsa[];
  /** Hücre (satır-sütun sırası) -> arsa dizini; arsası yoksa -1. */
  arsaNo: Int32Array;
  /** Satın alınabilir ama arsası olmayan hücre sayısı (küçük adalar, artıklar). */
  artik: number;
  /** Satılabilir hücre sayısı (satın alınabilir, kamu düşülmüş). */
  uygun: number;
  /** Hücre (satır-sütun sırası) -> kamu grubu no + 1 (0: kamu değil); kamu yoksa null. */
  kamuNo: Uint16Array | null;
  /** Kamu grupları (sunucudan; `kamuNo` bunlara bakar). */
  kamuGruplari: readonly KamuGrubuKaresi[];
  /** Izgaradaki kamu hücresi sayısı. */
  kamuSayisi: number;
}

const KOMSU: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const SIRA: Record<ArsaSinifi, number> = { kirsal: 0, kasaba: 1, sehir: 2 };

/** Izgaradan hazır arsaları türetir (saf, deterministik). `kamu`: sunucunun kamu blokları (bu hücreler arsaya girmez). */
export function arsalariTuret(iz: Izgara, kamu: readonly KamuGrubuKaresi[] = []): ArsaKumesi {
  const G = iz.genislik;
  const Y = iz.yukseklik;
  const N = G * Y;
  // Kamu hücreleri: blokları ızgaraya kırparak işaretle
  let kamuNo: Uint16Array | null = null;
  let kamuSayisi = 0;
  kamu.forEach((g, gi) => {
    for (const [bx0, by0, bx1, by1] of g.blok) {
      const xa = Math.max(bx0 - iz.x0, 0);
      const ya = Math.max(by0 - iz.y0, 0);
      const xb = Math.min(bx1 - iz.x0, G - 1);
      const yb = Math.min(by1 - iz.y0, Y - 1);
      if (xb < xa || yb < ya) continue;
      kamuNo ??= new Uint16Array(N);
      for (let y = ya; y <= yb; y++)
        for (let x = xa; x <= xb; x++) {
          if (kamuNo[y * G + x] === 0) kamuSayisi++;
          kamuNo[y * G + x] = gi + 1;
        }
    }
  });
  const kn = kamuNo as Uint16Array | null;
  const uygunMu = (i: number): boolean => satinAlinabilir(iz.durum[i]!) && (kn === null || kn[i] === 0);

  // 1. Bağlı bileşenler (yinelemeli taşkın doldurma).
  const bilesen = new Int32Array(N).fill(-1);
  const bilesenBoyut: number[] = [];
  const yigin = new Int32Array(N);
  let uygun = 0;
  for (let i = 0; i < N; i++) {
    if (!uygunMu(i)) continue;
    uygun++;
    if (bilesen[i] !== -1) continue;
    const b = bilesenBoyut.length;
    let n = 0;
    let ust = 0;
    yigin[ust++] = i;
    bilesen[i] = b;
    while (ust > 0) {
      const c = yigin[--ust]!;
      n++;
      const x = c % G;
      const y = (c - x) / G;
      for (const [dx, dy] of KOMSU) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= Y) continue;
        const j = ny * G + nx;
        if (bilesen[j] !== -1 || !uygunMu(j)) continue;
        bilesen[j] = b;
        yigin[ust++] = j;
      }
    }
    bilesenBoyut.push(n);
  }

  // 2.–3. Parçalar: küçük bileşen tek parça; büyük bileşen (bileşen, blok) başına bağlı parçalar.
  const parca = new Int32Array(N).fill(-1);
  const parcaBoyut: number[] = [];
  /** Parçanın büyük bileşene ait olup olmadığı (yalnız onlar birleştirilir). */
  const parcaBuyuk: boolean[] = [];
  const blokNo = (x: number, y: number): number => Math.floor((iz.x0 + x) / ARSA_BLOK) * 4_000_003 + Math.floor((iz.y0 + y) / ARSA_BLOK);
  for (let i = 0; i < N; i++) {
    const b = bilesen[i]!;
    if (b < 0 || parca[i] !== -1) continue;
    const p = parcaBoyut.length;
    const buyuk = bilesenBoyut[b]! > ARSA_EN_COK;
    const x0 = i % G;
    const y0 = (i - x0) / G;
    const blok = buyuk ? blokNo(x0, y0) : 0;
    let n = 0;
    let ust = 0;
    yigin[ust++] = i;
    parca[i] = p;
    while (ust > 0) {
      const c = yigin[--ust]!;
      n++;
      const x = c % G;
      const y = (c - x) / G;
      for (const [dx, dy] of KOMSU) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= Y) continue;
        const j = ny * G + nx;
        if (parca[j] !== -1 || bilesen[j] !== b) continue;
        if (buyuk && blokNo(nx, ny) !== blok) continue;
        parca[j] = p;
        yigin[ust++] = j;
      }
    }
    parcaBoyut.push(n);
    parcaBuyuk.push(buyuk);
  }

  // Küçük parçaları (<4) en çok kenar paylaştıkları komşuya kat (toplam ≤12). Birleşik kümeler birleştirme-bulma ile izlenir.
  const ata = Int32Array.from({ length: parcaBoyut.length }, (_, k) => k);
  const kok = (k: number): number => {
    while (ata[k] !== k) {
      ata[k] = ata[ata[k]!]!;
      k = ata[k]!;
    }
    return k;
  };
  const boyut = [...parcaBoyut];
  const kucuk: number[] = [];
  for (let k = 0; k < parcaBoyut.length; k++) if (parcaBuyuk[k] && parcaBoyut[k]! < ARSA_EN_AZ) kucuk.push(k);
  // Küçük parçanın komşu parçaları (ortak kenar sayısıyla); tek hücre taraması.
  const komsular = new Map<number, Map<number, number>>();
  if (kucuk.length) {
    for (let i = 0; i < N; i++) {
      const p = parca[i]!;
      if (p < 0 || !parcaBuyuk[p] || parcaBoyut[p]! >= ARSA_EN_AZ) continue;
      const x = i % G;
      const y = (i - x) / G;
      for (const [dx, dy] of KOMSU) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= Y) continue;
        const q = parca[ny * G + nx]!;
        if (q < 0 || q === p) continue;
        let m = komsular.get(p);
        if (!m) komsular.set(p, (m = new Map()));
        m.set(q, (m.get(q) ?? 0) + 1);
      }
    }
  }
  // Küçükten büyüğe, eşitlikte parça sırasıyla (deterministik). Birleşme boyutları değiştirdiği için en çok 4 geçiş.
  for (let gecis = 0; gecis < 4; gecis++) {
    let degisti = false;
    const sirali = [...new Set(kucuk.map(kok))].sort((a, b) => boyut[a]! - boyut[b]! || a - b);
    for (const kp of sirali) {
      if (kok(kp) !== kp || boyut[kp]! >= ARSA_EN_AZ) continue;
      // Komşu kökler ve ortak kenar toplamı
      const aday = new Map<number, number>();
      for (const [q0, kenar] of komsular.get(kp) ?? []) {
        const kq = kok(q0);
        if (kq !== kp) aday.set(kq, (aday.get(kq) ?? 0) + kenar);
      }
      let enIyi = -1;
      let enIyiKenar = 0;
      for (const [kq, kenar] of aday) {
        if (boyut[kq]! + boyut[kp]! > ARSA_EN_COK) continue;
        // Daha çok ortak kenar; eşitlikte daha büyük komşu; sonra daha küçük kimlik
        if (enIyi < 0 || kenar > enIyiKenar || (kenar === enIyiKenar && (boyut[kq]! > boyut[enIyi]! || (boyut[kq]! === boyut[enIyi]! && kq < enIyi)))) {
          enIyi = kq;
          enIyiKenar = kenar;
        }
      }
      if (enIyi < 0) continue;
      ata[kp] = enIyi;
      boyut[enIyi] = boyut[enIyi]! + boyut[kp]!;
      // Katılan kümenin komşuluğunu devral (yalnız küçük hâlâ birleşecekse gerekir)
      const m = komsular.get(kp);
      if (m) {
        let hedef = komsular.get(enIyi);
        if (!hedef) komsular.set(enIyi, (hedef = new Map()));
        for (const [q, k] of m) hedef.set(q, (hedef.get(q) ?? 0) + k);
      }
      degisti = true;
    }
    if (!degisti) break;
  }

  // Arsalar: kök parçalar (>= 4 hücre). Hücreleri (y, x) sırasında topla.
  const arsaNo = new Int32Array(N).fill(-1);
  const kokArsa = new Map<number, number>();
  const arsalar: Arsa[] = [];
  const toplam: Array<{ hucreler: number[] }> = [];
  for (let i = 0; i < N; i++) {
    const p = parca[i]!;
    if (p < 0) continue;
    const k = kok(p);
    if (boyut[k]! < ARSA_EN_AZ) continue;
    let a = kokArsa.get(k);
    if (a === undefined) {
      a = toplam.length;
      kokArsa.set(k, a);
      toplam.push({ hucreler: [] });
    }
    toplam[a]!.hucreler.push(i);
    arsaNo[i] = a;
  }
  let artik = uygun;
  for (const t of toplam) {
    artik -= t.hucreler.length;
    arsalar.push(arsaOlustur(iz, t.hucreler));
  }
  return { izgara: iz, arsalar, arsaNo, artik, uygun, kamuNo: kn, kamuGruplari: kamu, kamuSayisi };
}

function arsaOlustur(iz: Izgara, idler: number[]): Arsa {
  const G = iz.genislik;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let sx = 0;
  let sy = 0;
  const siniflar: Partial<Record<ArsaSinifi, number>> = {};
  const arazi = [0, 0, 0, 0, 0, 0, 0, 0];
  const hucreler: HucreId[] = [];
  for (const i of idler) {
    const dx = i % G;
    const dy = (i - dx) / G;
    const x = iz.x0 + dx;
    const y = iz.y0 + dy;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
    sx += x;
    sy += y;
    const d = iz.durum[i]!;
    const s = arsaSinifi(d);
    siniflar[s] = (siniflar[s] ?? 0) + 1;
    arazi[durumSinifi(d)]!++;
    hucreler.push(hucreId(x, y));
  }
  let baskin: ArsaSinifi = "kirsal";
  for (const s of ["kirsal", "kasaba", "sehir"] as const) if ((siniflar[s] ?? 0) > (siniflar[baskin] ?? 0) || (siniflar[baskin] === undefined && siniflar[s] !== undefined)) baskin = s;
  let enArazi = 0;
  for (let k = 1; k < arazi.length; k++) if (arazi[k]! > arazi[enArazi]!) enArazi = k;
  const ilk = hucreler[0]!.split(":");
  return { kimlik: `arsa:${ilk[0]}:${ilk[1]}`, hucreler, x0, y0, x1, y1, cx: sx / idler.length, cy: sy / idler.length, siniflar, baskin, arazi: enArazi };
}

/** Hücreyi içeren arsa (yoksa null). */
export function hucredenArsa(k: ArsaKumesi, x: number, y: number): Arsa | null {
  const iz = k.izgara;
  const dx = x - iz.x0;
  const dy = y - iz.y0;
  if (dx < 0 || dy < 0 || dx >= iz.genislik || dy >= iz.yukseklik) return null;
  const a = k.arsaNo[dy * iz.genislik + dx]!;
  return a >= 0 ? (k.arsalar[a] ?? null) : null;
}

export function arsaKimligindenBul(k: ArsaKumesi, kimlik: string): Arsa | null {
  const m = /^arsa:(\d+):(\d+)$/.exec(kimlik);
  if (!m) return null;
  const a = hucredenArsa(k, Number(m[1]), Number(m[2]));
  return a && a.kimlik === kimlik ? a : null;
}

/**
 * Görünür kutudaki arsa sınırları: arsa hücresinin komşusu başka arsada ya da arsasızsa o kenar çizilir.
 * `[boylam, enlem]` çiftlerinden oluşan doğru parçaları döner (her biri iki nokta).
 */
export function arsaSinirlari(k: ArsaKumesi, xa: number, ya: number, xb: number, yb: number, enCokHucre = 60_000): Array<[[number, number], [number, number]]> {
  const iz = k.izgara;
  const x0 = Math.max(iz.x0, xa);
  const y0 = Math.max(iz.y0, ya);
  const x1 = Math.min(iz.x0 + iz.genislik - 1, xb);
  const y1 = Math.min(iz.y0 + iz.yukseklik - 1, yb);
  const kes: Array<[[number, number], [number, number]]> = [];
  if (x1 < x0 || y1 < y0 || (x1 - x0 + 1) * (y1 - y0 + 1) > enCokHucre) return kes;
  const no = (x: number, y: number): number => {
    const dx = x - iz.x0;
    const dy = y - iz.y0;
    if (dx < 0 || dy < 0 || dx >= iz.genislik || dy >= iz.yukseklik) return -1;
    return k.arsaNo[dy * iz.genislik + dx]!;
  };
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const a = no(x, y);
      if (a < 0) continue;
      const b = xtenBoylam(x);
      const d = xtenBoylam(x + 1);
      const ku = ytenEnlem(y);
      const gu = ytenEnlem(y + 1);
      if (no(x, y - 1) !== a) kes.push([[b, ku], [d, ku]]);
      if (no(x, y + 1) !== a) kes.push([[b, gu], [d, gu]]);
      if (no(x - 1, y) !== a) kes.push([[b, ku], [b, gu]]);
      if (no(x + 1, y) !== a) kes.push([[d, ku], [d, gu]]);
    }
  return kes;
}

/** Hücrenin kamu grubu (sunucudan; kamu değilse ya da ızgara dışındaysa null). O(1). */
export function kamuBilgisi(k: ArsaKumesi, x: number, y: number): KamuGrubuKaresi | null {
  const iz = k.izgara;
  const dx = x - iz.x0;
  const dy = y - iz.y0;
  if (!k.kamuNo || dx < 0 || dy < 0 || dx >= iz.genislik || dy >= iz.yukseklik) return null;
  const g = k.kamuNo[dy * iz.genislik + dx]!;
  return g > 0 ? (k.kamuGruplari[g - 1] ?? null) : null;
}

/** Görünür kutuyla kesişen kamu blokları (grup ve dört uç dahil `[x0, y0, x1, y1]`), çizim için. */
export function kamuBloklari(k: ArsaKumesi, xa: number, ya: number, xb: number, yb: number): Array<{ grup: KamuGrubuKaresi; blok: readonly [number, number, number, number] }> {
  const l: Array<{ grup: KamuGrubuKaresi; blok: readonly [number, number, number, number] }> = [];
  for (const g of k.kamuGruplari) for (const b of g.blok) if (b[2] >= xa && b[0] <= xb && b[3] >= ya && b[1] <= yb) l.push({ grup: g, blok: b });
  return l;
}

/** Tek arsanın çevresi (komşusu başka arsa ya da arsasız olan kenarlar), `[boylam, enlem]` doğru parçaları. */
export function arsaKenarlari(a: Arsa): Array<[[number, number], [number, number]]> {
  const kume = new Set(a.hucreler);
  const kes: Array<[[number, number], [number, number]]> = [];
  for (const id of a.hucreler) {
    const [xs, ys] = id.split(":");
    const x = Number(xs);
    const y = Number(ys);
    const b = xtenBoylam(x);
    const d = xtenBoylam(x + 1);
    const ku = ytenEnlem(y);
    const gu = ytenEnlem(y + 1);
    if (!kume.has(hucreId(x, y - 1))) kes.push([[b, ku], [d, ku]]);
    if (!kume.has(hucreId(x, y + 1))) kes.push([[b, gu], [d, gu]]);
    if (!kume.has(hucreId(x - 1, y))) kes.push([[b, ku], [b, gu]]);
    if (!kume.has(hucreId(x + 1, y))) kes.push([[d, ku], [d, gu]]);
  }
  return kes;
}

/** Arsanın sınıf özeti ("Kırsal" ya da "Kırsal 6 · Kasaba 3"): sıra kırsal, kasaba, şehir. */
export function arsaSiniflari(a: Arsa): Array<[ArsaSinifi, number]> {
  return (Object.entries(a.siniflar) as Array<[ArsaSinifi, number]>).sort((p, q) => SIRA[p[0]] - SIRA[q[0]]);
}

/** Arsanın hücrelerini sınıfa göre gruplar (`parsel_al` tek sınıf ister): sınıf sırasıyla. */
export function sinifGruplari(a: Arsa, sinifAl: (id: HucreId) => ArsaSinifi): Array<{ sinif: ArsaSinifi; hucreler: HucreId[] }> {
  const m = new Map<ArsaSinifi, HucreId[]>();
  for (const id of a.hucreler) {
    const s = sinifAl(id);
    let l = m.get(s);
    if (!l) m.set(s, (l = []));
    l.push(id);
  }
  return [...m.entries()].sort((p, q) => SIRA[p[0]] - SIRA[q[0]]).map(([sinif, hucreler]) => ({ sinif, hucreler }));
}

export type ArsaTercihi = "tarim" | "sanayi" | "pazar";

/** Açılış önerisine göre tercih edilen arazi kullanımları (BHI1 sınıfı: 1 Tarla, 2 Sanayi, 3 Konut, 4 Orman, 5 Yapılı). */
const TERCIH_ARAZI: Record<ArsaTercihi, readonly number[]> = { tarim: [1], sanayi: [2], pazar: [3, 5] };

/**
 * Yerleş ekranı için önerilen hazır arsa (saf, deterministik): tümüyle boş (hiçbir hücresi satılmamış) arsalar arasında ilçe
 * merkezine (hücre koordinatı) en yakın; açılış önerisinin arazi türüne uyan, tek sınıflı ve en az 8 hücrelik arsa tercih edilir.
 * Skor = merkeze uzaklık (hücre) + uyumsuzluk cezaları; eşitlikte kimlik sırası.
 */
export function onerilenArsa(
  k: ArsaKumesi,
  sahipli: (id: HucreId) => boolean,
  merkezX: number,
  merkezY: number,
  tercih: ArsaTercihi,
  /** İsteğe bağlı: arsa fiyatı (mili-₺) ve bütçe tavanı; tavanı aşan arsa önerilmez (ilk yapıya para kalsın). */
  butce?: { fiyat: (a: Arsa) => number; tavanMili: number },
): Arsa | null {
  let enIyi: Arsa | null = null;
  let enSkor = Infinity;
  const uygunArazi = TERCIH_ARAZI[tercih];
  for (const a of k.arsalar) {
    const d = Math.hypot(a.cx - merkezX, a.cy - merkezY);
    if (d > enSkor) continue; // ceza ≥ 0: uzaklık tek başına zaten kötüyse atla
    if (a.hucreler.some(sahipli)) continue;
    if (butce && butce.fiyat(a) > butce.tavanMili) continue;
    const skor = d + (uygunArazi.includes(a.arazi) ? 0 : 14) + (Object.keys(a.siniflar).length > 1 ? 6 : 0) + (a.hucreler.length < 8 ? 4 : 0);
    if (skor < enSkor) {
      enIyi = a;
      enSkor = skor;
    }
  }
  return enIyi;
}

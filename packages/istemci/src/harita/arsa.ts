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
 *   5. KAMU ARSASI (imza mekanikleri, geçici istemci türetmesi): arsaların ~%4'ü satışa kapalı kamu arsasıdır (meydan, pazar
 *      yeri, muhtarlık için). "Mahalle" = bileşen ∩ 48×48 hücrelik mutlak blok; en az `enAzArsa` (6) arsası olan her mahallede
 *      en az bir kamu arsası vardır: ilki mahalle ağırlık merkezine en yakın arsa (meydan), kalanı kimlik karmasıyla.
 *      Kural parametredir (`KamuAyari`: açık/kapalı, oran); sunucu bunu bilmez (rapor: üretim hattına/çekirdeğe taşınmalı).
 * Satın alma durumu (sahiplik) bölmeye girmez: kimlikler tüm istemcilerde aynıdır.
 */
import type { ArsaSinifi, HucreId } from "@bolge/cekirdek";
import { arsaSinifi } from "./fiyat";
import { durumSinifi, hucreId, satinAlinabilir, xtenBoylam, ytenEnlem } from "./hucre";
import type { Izgara } from "./hucre";

/** Kamu arsası kuralı (geçici istemci türetmesi). */
export interface KamuAyari {
  /** Kamu arsaları işaretlensin mi? */
  acik: boolean;
  /** Mahalledeki arsaların kamu payı (0–1). Varsayılan 0,04. */
  oran: number;
  /** Bir mahallede kamu arsası olması için en az arsa sayısı (küçük adaların tek arsası satışa kapanmasın). */
  enAzArsa: number;
  /** Mahalle blok kenarı (hücre). */
  mahalle: number;
}

export const KAMU_VARSAYILAN: Readonly<KamuAyari> = { acik: true, oran: 0.04, enAzArsa: 6, mahalle: 48 };

/** Kamu arsası kuralı sayfa adresinden: varsayılan açık, %4; `?kamu=0` kapatır, `?kamu-oran=0.06` oranı değiştirir. */
export function kamuAyari(arama: string): KamuAyari {
  const q = new URLSearchParams(arama);
  const oran = Number(q.get("kamu-oran"));
  return { ...KAMU_VARSAYILAN, acik: q.get("kamu") !== "0", ...(q.has("kamu-oran") && oran >= 0 && oran <= 1 ? { oran } : {}) };
}

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
  /** Kamu arsası: satışa ve yerleşime kapalı (meydan, pazar yeri, muhtarlık). */
  kamu: boolean;
}

export interface ArsaKumesi {
  izgara: Izgara;
  /** (y, x) sırasında. */
  arsalar: Arsa[];
  /** Hücre (satır-sütun sırası) -> arsa dizini; arsası yoksa -1. */
  arsaNo: Int32Array;
  /** Satın alınabilir ama arsası olmayan hücre sayısı (küçük adalar, artıklar). */
  artik: number;
  /** Satın alınabilir hücre sayısı. */
  uygun: number;
  /** Kamu arsası sayısı. */
  kamuSayisi: number;
}

const KOMSU: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const SIRA: Record<ArsaSinifi, number> = { kirsal: 0, kasaba: 1, sehir: 2 };

/** FNV-1a 32 bit (kimlik karması; ASCII). */
function karma(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Izgaradan hazır arsaları türetir (saf, deterministik). `kamu` kamu arsası kuralını geçersiz kılar. */
export function arsalariTuret(iz: Izgara, kamu: Partial<KamuAyari> = {}): ArsaKumesi {
  const G = iz.genislik;
  const Y = iz.yukseklik;
  const N = G * Y;
  const uygunMu = (i: number): boolean => satinAlinabilir(iz.durum[i]!);

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
  const bolgeAnahtari: string[] = [];
  const ayar: KamuAyari = { ...KAMU_VARSAYILAN, ...kamu };
  for (const t of toplam) {
    artik -= t.hucreler.length;
    const a = arsaOlustur(iz, t.hucreler);
    arsalar.push(a);
    // Mahalle anahtarı: bileşen + mutlak blok (ağırlık merkezi)
    bolgeAnahtari.push(`${bilesen[t.hucreler[0]!]!}:${Math.floor(a.cx / ayar.mahalle)}:${Math.floor(a.cy / ayar.mahalle)}`);
  }
  let kamuSayisi = 0;
  if (ayar.acik && ayar.oran > 0) kamuSayisi = kamuIsaretle(arsalar, bolgeAnahtari, ayar);
  return { izgara: iz, arsalar, arsaNo, artik, uygun, kamuSayisi };
}

/** Kamu arsalarını işaretler (mahalle başına en az bir; ilki merkeze en yakın). İşaretlenen sayıyı döndürür. */
function kamuIsaretle(arsalar: Arsa[], bolge: string[], ayar: KamuAyari): number {
  const gruplar = new Map<string, number[]>();
  bolge.forEach((k, i) => {
    let l = gruplar.get(k);
    if (!l) gruplar.set(k, (l = []));
    l.push(i);
  });
  let toplam = 0;
  for (const idler of gruplar.values()) {
    if (idler.length < ayar.enAzArsa) continue;
    let mx = 0;
    let my = 0;
    for (const i of idler) {
      mx += arsalar[i]!.cx;
      my += arsalar[i]!.cy;
    }
    mx /= idler.length;
    my /= idler.length;
    const adet = Math.max(1, Math.round(ayar.oran * idler.length));
    // Meydan: ağırlık merkezine en yakın arsa (eşitlikte kimlik); kalanlar kimlik karmasıyla
    const meydan = [...idler].sort((p, q) => Math.hypot(arsalar[p]!.cx - mx, arsalar[p]!.cy - my) - Math.hypot(arsalar[q]!.cx - mx, arsalar[q]!.cy - my) || (arsalar[p]!.kimlik < arsalar[q]!.kimlik ? -1 : 1))[0]!;
    const secilen = new Set<number>([meydan]);
    const karmaSirali = [...idler].sort((p, q) => karma(arsalar[p]!.kimlik) - karma(arsalar[q]!.kimlik) || (arsalar[p]!.kimlik < arsalar[q]!.kimlik ? -1 : 1));
    for (const i of karmaSirali) {
      if (secilen.size >= adet) break;
      secilen.add(i);
    }
    for (const i of secilen) arsalar[i]!.kamu = true;
    toplam += secilen.size;
  }
  return toplam;
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
  return { kimlik: `arsa:${ilk[0]}:${ilk[1]}`, hucreler, x0, y0, x1, y1, cx: sx / idler.length, cy: sy / idler.length, siniflar, baskin, arazi: enArazi, kamu: false };
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

/** Görünür kutudaki kamu arsası hücreleri (`[x, y]`); kutu `enCokHucre`'den büyükse boş. */
export function kamuHucreleri(k: ArsaKumesi, xa: number, ya: number, xb: number, yb: number, enCokHucre = 60_000): Array<[number, number]> {
  const iz = k.izgara;
  const x0 = Math.max(iz.x0, xa);
  const y0 = Math.max(iz.y0, ya);
  const x1 = Math.min(iz.x0 + iz.genislik - 1, xb);
  const y1 = Math.min(iz.y0 + iz.yukseklik - 1, yb);
  const l: Array<[number, number]> = [];
  if (k.kamuSayisi === 0 || x1 < x0 || y1 < y0 || (x1 - x0 + 1) * (y1 - y0 + 1) > enCokHucre) return l;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const no = k.arsaNo[(y - iz.y0) * iz.genislik + (x - iz.x0)]!;
      if (no >= 0 && k.arsalar[no]!.kamu) l.push([x, y]);
    }
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
    if (a.kamu || a.hucreler.some(sahipli)) continue;
    if (butce && butce.fiyat(a) > butce.tavanMili) continue;
    const skor = d + (uygunArazi.includes(a.arazi) ? 0 : 14) + (Object.keys(a.siniflar).length > 1 ? 6 : 0) + (a.hucreler.length < 8 ? 4 : 0);
    if (skor < enSkor) {
      enIyi = a;
      enSkor = skor;
    }
  }
  return enIyi;
}

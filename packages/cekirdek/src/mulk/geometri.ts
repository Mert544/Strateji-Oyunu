/**
 * Hücre ızgarası geometrisi (mülk kipi): deterministik, yalnız tamsayı. Bedava yurt (`yurt.ts`) ve kamu arsası (`kamu.ts`) ortak
 * kullanır: ilçe merkezi ve merkeze en yakın kenar-bitişik küme (kamu arsası kendi ızgara hesabını `kamu.ts`'te yapar).
 */
import type { ParselIlceTanimi } from "@bolge/veri";
import { tabanBol } from "../sabit";
import { hucreXY } from "./durum";
import type { IlceHucreDizileri } from "./hucreDizini";

/** 4 komşuluk (kenar-bitişik), sabit sıra. */
export const KOMSULAR: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const dizge = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Izgara hücresi: kimlik + koordinat. */
export interface Nokta {
  id: string;
  x: number;
  y: number;
}

export function nokta(id: string): Nokta {
  const [x, y] = hucreXY(id);
  return { id, x, y };
}

/**
 * İlçe merkezi (bedava yurt ve kamu ilçe merkezi alanı için TEK tanım): ilçenin kasaba ve şehir sınıfı uygun hücrelerinin (yerleşik doku)
 * tamsayı ağırlık merkezi; bu sınıftan hücre yoksa tüm uygun hücrelerinki. (Fikstürde idari merkez noktası yoktur.)
 */
export function ilceMerkezi(tanim: ParselIlceTanimi): [number, number] {
  const xy = new Int32Array(tanim.hucreler.length * 2);
  tanim.hucreler.forEach((h, i) => {
    const [x, y] = hucreXY(h.id);
    xy[2 * i] = x;
    xy[2 * i + 1] = y;
  });
  return ilceMerkeziXY(tanim, xy);
}

/** `ilceMerkezi` ile aynı tanım; hücre koordinatları (x, y çiftleri, `tanim.hucreler` sırasıyla) önceden ayrıştırılmışsa. */
export function ilceMerkeziXY(tanim: ParselIlceTanimi, xy: Int32Array): [number, number] {
  let tx = 0;
  let ty = 0;
  let tn = 0;
  let yx = 0;
  let yy = 0;
  let yn = 0;
  tanim.hucreler.forEach((h, i) => {
    if (!h.uygun) return;
    const x = xy[2 * i] as number;
    const y = xy[2 * i + 1] as number;
    tx += x;
    ty += y;
    tn++;
    if (h.sinif !== "kirsal") {
      yx += x;
      yy += y;
      yn++;
    }
  });
  if (tn === 0) return [0, 0];
  return yn > 0 ? [tabanBol(yx, yn), tabanBol(yy, yn)] : [tabanBol(tx, tn), tabanBol(ty, tn)];
}

/** `ilceMerkeziXY` ile aynı tanım; hücre dizilerinden (kompakt hücre dizini ya da fikstür; yineleme sırasından bağımsız toplamlar). */
export function ilceMerkeziDizi(g: IlceHucreDizileri): [number, number] {
  let tx = 0;
  let ty = 0;
  let tn = 0;
  let yx = 0;
  let yy = 0;
  let yn = 0;
  for (let i = 0; i < g.n; i++) {
    const f = g.bayrak[i] as number;
    if ((f & 1) === 0) continue; // DIZI_UYGUN
    const x = g.xs[i] as number;
    const y = g.ys[i] as number;
    tx += x;
    ty += y;
    tn++;
    if ((f & 2) !== 0) {
      // DIZI_KIRSAL_DEGIL
      yx += x;
      yy += y;
      yn++;
    }
  }
  if (tn === 0) return [0, 0];
  return yn > 0 ? [tabanBol(yx, yn), tabanBol(yy, yn)] : [tabanBol(tx, tn), tabanBol(ty, tn)];
}

// ---------------------------------------------------------------------------
// Halka araması (yurt; docs/06 §15.11): `kumeSec`in sonucunu TÜM adayları sıralamadan, merkezden dışa doğru halka halka üretir.
// ---------------------------------------------------------------------------

/** Hücre yüklemi: (x, y) kümeye üye mi? (Üyelik doğrudan dizinden ve dünya durumundan sorulur; aday listesi kurulmaz.) */
export type HucreYuklemi = (x: number, y: number) => boolean;

/** Aranan çerçeve (kapsayıcı): ilçe ızgarasının sınırları. */
export interface HalkaCercevesi {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** İlk halka yarıçapı (hücre); her halka bir öncekinin iki katı. Yurt için (n ≤ ~10) çoğu zaman ilk halka yeter. */
const ILK_YARICAP = 8;

interface HalkaHucre {
  x: number;
  y: number;
  u: number;
  id: string;
}

/**
 * Yüklemi sağlayan hücreleri (uzaklık², kimlik DİZESİ) artan sırasıyla verir: `kumeSec`in `sirali` dizisiyle AYNI sıra. Merkezden yarıçapı ikiye katlayarak
 * halkalar (u ∈ (önceki², bu²]) üretir; her halka kendi içinde tam sıralanır, halkalar uzaklıkça sıralıdır, yani birleşim tam sıradır.
 */
export function* halkaGez(yuklem: HucreYuklemi, c: HalkaCercevesi, cx: number, cy: number): Generator<HalkaHucre> {
  const dxEn = Math.max(Math.abs(cx - c.x0), Math.abs(cx - c.x1));
  const dyEn = Math.max(Math.abs(cy - c.y0), Math.abs(cy - c.y1));
  const uEn = dxEn * dxEn + dyEn * dyEn;
  let onceki = -1;
  for (let r = ILK_YARICAP; ; r *= 2) {
    const ust = r * r;
    const l: HalkaHucre[] = [];
    const ya = Math.max(c.y0, cy - r);
    const yb = Math.min(c.y1, cy + r);
    const xa = Math.max(c.x0, cx - r);
    const xb = Math.min(c.x1, cx + r);
    for (let y = ya; y <= yb; y++) {
      for (let x = xa; x <= xb; x++) {
        const u = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (u <= onceki || u > ust) continue;
        if (yuklem(x, y)) l.push({ x, y, u, id: `${x}:${y}` });
      }
    }
    l.sort((a, b) => a.u - b.u || dizge(a.id, b.id));
    yield* l;
    if (ust >= uEn) return;
    onceki = ust;
  }
}

/** Yüklemi sağlayan hücre sayısı, `n`'de keser: dönen değer n'e eşitse "en az n"; n'den küçükse TAM sayıdır. */
export function halkaSay(yuklem: HucreYuklemi, c: HalkaCercevesi, cx: number, cy: number, n: number): number {
  let s = 0;
  for (const _ of halkaGez(yuklem, c, cx, cy)) if (++s >= n) break;
  return s;
}

/** Hücre anahtarı (sayısal; dize üretmez): x ∈ (-2³¹, 2³²) ve y ∈ [0, 2²⁰) için çakışmaz (komşu sorgusunun x - 1 = -1 gibi taşmaları gerçek hücreyle karışmaz; sonuç 2⁵³ altında). */
const hucreAnahtar = (x: number, y: number): number => y * 8_589_934_592 + x;

/**
 * `kumeSec` ile BİREBİR aynı sonuç (aynı hücreler, aynı seçim sırası; yoksa null), aday listesi kurmadan: tohumlar (uzaklık², kimlik dizesi) sırasıyla
 * halkalardan gelir; bileşen n'e ulaşınca kesilen taşkın doldurma karar için yeter (karar yalnız "bileşen ≥ n"); büyütme ve komşuluk üyeliği aynı
 * yüklemden sorulur. Başarısız (n'den küçük) bileşenin hücreleri tohum olarak atlanır.
 */
export function kumeSecHalka(yuklem: HucreYuklemi, c: HalkaCercevesi, n: number, cx: number, cy: number): string[] | null {
  const basarisiz = new Set<number>();
  const uzak = (x: number, y: number): number => (x - cx) * (x - cx) + (y - cy) * (y - cy);
  for (const tohum of halkaGez(yuklem, c, cx, cy)) {
    if (basarisiz.has(hucreAnahtar(tohum.x, tohum.y))) continue;
    // Bağlı bileşen en az n hücre mi? (taşkın doldurma n'de kesilir)
    const bilesen = new Set<number>([hucreAnahtar(tohum.x, tohum.y)]);
    const yigin: [number, number][] = [[tohum.x, tohum.y]];
    while (yigin.length > 0 && bilesen.size < n) {
      const [px, py] = yigin.pop() as [number, number];
      for (const [dx, dy] of KOMSULAR) {
        const nx = px + dx;
        const ny = py + dy;
        const k = hucreAnahtar(nx, ny);
        if (!bilesen.has(k) && yuklem(nx, ny)) {
          bilesen.add(k);
          yigin.push([nx, ny]);
        }
      }
    }
    if (bilesen.size < n) {
      for (const k of bilesen) basarisiz.add(k);
      continue;
    }
    // Merkeze en yakın komşuyu ekleyerek büyüt (kompakt küme).
    const secilen: [number, number][] = [[tohum.x, tohum.y]];
    const secili = new Set<number>([hucreAnahtar(tohum.x, tohum.y)]);
    while (secilen.length < n) {
      let en: { x: number; y: number; u: number } | null = null;
      for (const [px, py] of secilen) {
        for (const [dx, dy] of KOMSULAR) {
          const nx = px + dx;
          const ny = py + dy;
          if (secili.has(hucreAnahtar(nx, ny)) || !yuklem(nx, ny)) continue;
          const u = uzak(nx, ny);
          if (en === null || u < en.u || (u === en.u && dizge(`${nx}:${ny}`, `${en.x}:${en.y}`) < 0)) en = { x: nx, y: ny, u };
        }
      }
      if (en === null) break; // bileşen yeterli büyüklükte olduğundan olmaz
      secilen.push([en.x, en.y]);
      secili.add(hucreAnahtar(en.x, en.y));
    }
    if (secilen.length === n) return secilen.map(([x, y]) => `${x}:${y}`);
  }
  return null;
}

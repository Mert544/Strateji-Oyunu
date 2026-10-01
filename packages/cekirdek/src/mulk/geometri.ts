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

/** Adaylar arasında merkeze (cx, cy) en yakın tohumdan büyüyen `n` hücrelik kenar-bitişik küme; yoksa null. */
export function kumeSec(adaylar: readonly Nokta[], n: number, cx: number, cy: number): string[] | null {
  const uzak = (c: { x: number; y: number }): number => (c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy);
  const sirali = adaylar.map((c) => ({ ...c, u: uzak(c) })).sort((a, b) => a.u - b.u || dizge(a.id, b.id));
  const kimlik = new Map(sirali.map((c) => [c.id, c]));
  const basarisiz = new Set<string>();
  for (const tohum of sirali) {
    if (basarisiz.has(tohum.id)) continue;
    // Bağlı bileşen yeterince büyük mü? (taşkın doldurma)
    const bilesen = new Set<string>([tohum.id]);
    const yigin = [tohum.id];
    while (yigin.length > 0) {
      const c = kimlik.get(yigin.pop() as string) as { x: number; y: number };
      for (const [dx, dy] of KOMSULAR) {
        const k = `${c.x + dx}:${c.y + dy}`;
        if (kimlik.has(k) && !bilesen.has(k)) {
          bilesen.add(k);
          yigin.push(k);
        }
      }
    }
    if (bilesen.size < n) {
      for (const id of bilesen) basarisiz.add(id); // bileşen n'den küçük: içindeki hiçbir hücre tohum olamaz
      continue;
    }
    // Merkeze en yakın komşuyu ekleyerek büyüt (kompakt küme).
    const secilen = [tohum.id];
    const secili = new Set(secilen);
    while (secilen.length < n) {
      let en: { id: string; u: number } | null = null;
      for (const id of secilen) {
        const c = kimlik.get(id) as { x: number; y: number };
        for (const [dx, dy] of KOMSULAR) {
          const k = `${c.x + dx}:${c.y + dy}`;
          const a = kimlik.get(k);
          if (a !== undefined && !secili.has(k) && (en === null || a.u < en.u || (a.u === en.u && dizge(a.id, en.id) < 0))) en = a;
        }
      }
      if (en === null) break; // bileşen yeterli büyüklükte olduğundan olmaz
      secilen.push(en.id);
      secili.add(en.id);
    }
    if (secilen.length === n) return secilen;
  }
  return null;
}

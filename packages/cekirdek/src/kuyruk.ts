/**
 * Olay kuyruğu: Olay[] üzerinde ikili (min) yığın.
 * Sıralama anahtarı (t, oncelik, sira); hepsi küçük olan önce.
 * Kuyruk düz bir dizi olduğundan dünya durumuyla birlikte kopyalanabilir ve özetlenebilir.
 */
import type { Olay } from "./tipler";

/** a, b'den önce mi işlenmeli? */
function once(a: Olay, b: Olay): boolean {
  if (a.t !== b.t) return a.t < b.t;
  if (a.oncelik !== b.oncelik) return a.oncelik < b.oncelik;
  return a.sira < b.sira;
}

/** Olayı kuyruğa ekler. O(log n). */
export function kuyrukEkle(kuyruk: Olay[], olay: Olay): void {
  let i = kuyruk.length;
  kuyruk.push(olay);
  while (i > 0) {
    const ebeveyn = (i - 1) >> 1;
    const e = kuyruk[ebeveyn] as Olay;
    if (!once(olay, e)) break;
    kuyruk[i] = e;
    i = ebeveyn;
  }
  kuyruk[i] = olay;
}

/** En öndeki olayı çıkarıp döndürür; kuyruk boşsa undefined. O(log n). */
export function kuyrukCikar(kuyruk: Olay[]): Olay | undefined {
  const n = kuyruk.length;
  if (n === 0) return undefined;
  const ust = kuyruk[0] as Olay;
  const son = kuyruk.pop() as Olay;
  if (n === 1) return ust;
  let i = 0;
  const yarim = (n - 1) >> 1; // yaprak olmayan düğüm sayısı (yeni boyut n-1)
  while (i < yarim) {
    let k = 2 * i + 1;
    const sag = k + 1;
    if (sag < n - 1 && once(kuyruk[sag] as Olay, kuyruk[k] as Olay)) k = sag;
    const c = kuyruk[k] as Olay;
    if (!once(c, son)) break;
    kuyruk[i] = c;
    i = k;
  }
  kuyruk[i] = son;
  return ust;
}

/** En öndeki olayı çıkarmadan döndürür. */
export function kuyrukBas(kuyruk: readonly Olay[]): Olay | undefined {
  return kuyruk[0];
}

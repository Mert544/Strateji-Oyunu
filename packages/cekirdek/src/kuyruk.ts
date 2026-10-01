/**
 * Olay kuyruğu: Olay[] üzerinde ikili (min) yığın.
 * Sıralama anahtarı (t, oncelik, sira); hepsi küçük olan önce.
 * Kuyruk düz bir dizi olduğundan dünya durumuyla birlikte kopyalanabilir ve özetlenebilir.
 */
import type { Olay } from "./tipler";

/** a, b'den önce mi işlenmeli? (Serileştirici yığın düzenini doğrularken de kullanır.) */
export function kuyrukOnce(a: Olay, b: Olay): boolean {
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
    if (!kuyrukOnce(olay, e)) break;
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
    if (sag < n - 1 && kuyrukOnce(kuyruk[sag] as Olay, kuyruk[k] as Olay)) k = sag;
    const c = kuyruk[k] as Olay;
    if (!kuyrukOnce(c, son)) break;
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

/** i konumundaki olayı yığında aşağı iter (n = etkin boyut). */
function asagiIt(kuyruk: Olay[], i: number, n: number): void {
  const olay = kuyruk[i] as Olay;
  const yarim = n >> 1;
  while (i < yarim) {
    let k = 2 * i + 1;
    const sag = k + 1;
    if (sag < n && kuyrukOnce(kuyruk[sag] as Olay, kuyruk[k] as Olay)) k = sag;
    const c = kuyruk[k] as Olay;
    if (!kuyrukOnce(c, olay)) break;
    kuyruk[i] = c;
    i = k;
  }
  kuyruk[i] = olay;
}

/**
 * Kuyruğu yerinde süzer: `tut(olay)` false dönen olaylar atılır, kalanlar dizideki göreli sıralarını koruyarak sıkıştırılır
 * ve yığın düzeni (Floyd, O(n)) yeniden kurulur. Atılan olay sayısını döndürür; hiçbiri atılmazsa dizi DOKUNULMADAN kalır.
 * Olaylar (t, oncelik, sira) ile tam sıralı olduğundan (sira tekil) kalan olayların işlenme sırası değişmez; yalnız yığın
 * dizisinin düzeni değişir. Deterministiktir: sonuç yalnız diziye ve `tut`'a bağlıdır.
 */
export function kuyrukSuz(kuyruk: Olay[], tut: (olay: Olay) => boolean): number {
  let j = 0;
  for (let i = 0; i < kuyruk.length; i++) {
    const o = kuyruk[i] as Olay;
    if (tut(o)) kuyruk[j++] = o;
  }
  const atilan = kuyruk.length - j;
  if (atilan === 0) return 0;
  kuyruk.length = j;
  for (let i = (j >> 1) - 1; i >= 0; i--) asagiIt(kuyruk, i, j);
  return atilan;
}

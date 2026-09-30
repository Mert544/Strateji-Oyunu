/**
 * Tamsayı matematiği yardımcıları. Çekirdekte kayan nokta bölmesi yerine bunlar kullanılır.
 * Hepsi saf fonksiyondur ve platformdan bağımsız aynı sonucu verir.
 */

/** Tek bir tamsayı bölmesi için güvenli aralık kontrolü (|x| <= 2^53 - 1). */
function guvenliMi(x: number): boolean {
  return Number.isSafeInteger(x);
}

/**
 * Matematiksel floor bölmesi: floor(a / c), c > 0. Negatif a için de aşağı yuvarlar.
 * a güvenli tamsayı olmalıdır.
 */
export function tabanBol(a: number, c: number): number {
  if (!(c > 0)) throw new RangeError(`tabanBol: bolen pozitif olmali (${c})`);
  // Kayan nokta bölmesinin olası 1 hatasını tamsayı kalanla düzeltir.
  let q = Math.floor(a / c);
  let r = a - q * c;
  while (r < 0) {
    q -= 1;
    r += c;
  }
  while (r >= c) {
    q += 1;
    r -= c;
  }
  return q;
}

/**
 * floor(a × b / c), tamsayı. c > 0. a ve b negatif olabilir (matematiksel floor).
 * Ara çarpım 2^53'ü aşarsa BigInt yolu kullanılır, sonuç Number olarak döner.
 */
export function carpBol(a: number, b: number, c: number): number {
  if (!(c > 0)) throw new RangeError(`carpBol: bolen pozitif olmali (${c})`);
  const p = a * b;
  if (guvenliMi(p) && guvenliMi(a) && guvenliMi(b)) return tabanBol(p, c);
  const x = BigInt(a) * BigInt(b);
  const cc = BigInt(c);
  let q = x / cc; // sıfıra doğru keser
  if (x % cc !== 0n && x < 0n) q -= 1n;
  return Number(q);
}

/**
 * ceil(a × b / c), tamsayı. c > 0. carpBol'un tavan karşılığı.
 */
export function carpBolTavan(a: number, b: number, c: number): number {
  return -carpBol(-a, b, c);
}

/** floor(sqrt(n)), tam. n >= 0 güvenli tamsayı olmalıdır. */
export function tamsayiKarekok(n: number): number {
  if (!(n >= 0) || !Number.isSafeInteger(n)) {
    throw new RangeError(`tamsayiKarekok: negatif olmayan guvenli tamsayi bekleniyor (${n})`);
  }
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r -= 1;
  while ((r + 1) * (r + 1) <= n) r += 1;
  return r;
}

/** x değerini [min, max] aralığına kelepçeler. */
export function kelepce(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

/** floor(x × ppm / 1_000_000). */
export function ppmUygula(x: number, ppm: number): number {
  return carpBol(x, ppm, 1_000_000);
}

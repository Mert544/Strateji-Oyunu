/**
 * Deterministik sözde rastgele sayı üretimi: sfc32 + splitmix32 tohumlama.
 * Yalnızca 32-bit tamsayı işlemleri kullanılır; platformlar arası aynı sonuç verir.
 */
import type { PrngDurumu } from "./tipler";

/** FNV-1a 32-bit (UTF-16 kod birimleri üzerinden); akış adını tohuma karıştırmak için. */
export function fnv1a32(metin: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** splitmix32 bir adım: durumu ilerletir, karıştırılmış uint32 döndürür. */
function splitmix32Adim(durum: { a: number }): number {
  durum.a = (durum.a + 0x9e3779b9) | 0;
  let t = durum.a ^ (durum.a >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  t = t ^ (t >>> 15);
  return t >>> 0;
}

/**
 * Ana tohumdan ve akış adından bağımsız bir sfc32 durumu türetir.
 * Aynı (tohum, akis) her zaman aynı durumu verir; farklı akış adları ilişkisiz akışlar verir.
 */
export function prngOlustur(tohum: number, akis: string): PrngDurumu {
  const ad = fnv1a32(akis);
  const sm = { a: (tohum >>> 0) ^ ad };
  // Tohumu bir tur karıştır ki yakın tohumlar yakın durum üretmesin.
  sm.a = splitmix32Adim(sm) ^ ad;
  const durum: PrngDurumu = [
    splitmix32Adim(sm),
    splitmix32Adim(sm),
    splitmix32Adim(sm),
    splitmix32Adim(sm),
  ];
  // Isınma turları
  for (let i = 0; i < 12; i++) sonraki(durum);
  return durum;
}

/** sfc32: durum dizisini yerinde değiştirir, [0, 2^32) uint32 döndürür. */
export function sonraki(durum: PrngDurumu): number {
  const a = durum[0] >>> 0;
  const b = durum[1] >>> 0;
  const c = durum[2] >>> 0;
  const d = durum[3] >>> 0;
  const t = (((a + b) | 0) + d) | 0;
  durum[0] = (b ^ (b >>> 9)) >>> 0;
  durum[1] = (c + (c << 3)) >>> 0;
  durum[2] = (((c << 21) | (c >>> 11)) + t) >>> 0;
  durum[3] = (d + 1) >>> 0;
  return t >>> 0;
}

/**
 * [0, n) aralığında sapmasız tamsayı (reddetme örneklemesi).
 * 1 <= n <= 2^32 olmalıdır.
 */
export function aralik(durum: PrngDurumu, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 4294967296) {
    throw new RangeError(`aralik: n 1..2^32 araliginda tamsayi olmali (${n})`);
  }
  if (n === 1) return 0;
  // Reddetme sınırı: 2^32'nin n'in katı olan en büyük değeri
  const sinir = 4294967296 - (4294967296 % n);
  for (;;) {
    const x = sonraki(durum);
    if (x < sinir) return x % n;
  }
}

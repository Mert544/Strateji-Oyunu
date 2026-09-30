/**
 * Erken oyun hızlandırması (PDF zaman kuralı 2: "erken oyun hızlı, sonra yavaşlar").
 *
 * Oyuncunun katılımından itibaren geçen süreye göre bir SÜRE ÇARPANI (ppm) uygulanır:
 *   geçen ≤ sabitSaat            -> baslangicCarpaniPpm        (ör. %10: 4-12 saatlik inşa 24-72 dakika)
 *   sabitSaat < geçen < bitisSaat -> doğrusal olarak PPM'e yükselir
 *   geçen ≥ bitisSaat            -> PPM (%100, normal süre)
 * Çarpan, işin BAŞLADIĞI andaki geçen süreye göre bir kez hesaplanır; devam eden iş sonradan yavaşlamaz.
 * Kapsam: tesis inşası, kenar geliştirme, birlik partisi, araştırma. Savaş hazırlık ve pencere süreleri
 * ETKİLENMEZ (çevrimdışı koruma kuralları sabit kalır). Geç katılan oyuncu da KENDİ katılımından
 * saymaya başlar ve aynı hızlandırmayı alır (yetişme yardımı, H6).
 */
import { carpBol } from "./sabit";
import { DAKIKA, PPM, SAAT } from "./tipler";
import type { Baglam, Dunya, Ms, OyuncuId } from "./tipler";
import { oyuncuBul } from "./stok";

/** Hızlandırılmış bir sürenin alabileceği en kısa değer. */
export const EN_KISA_SURE: Ms = DAKIKA;

/**
 * Oyuncunun o andaki süre çarpanı (ppm, (0, PPM]). Bilinmeyen oyuncu için PPM (hızlandırma yok).
 * Yalnızca tamsayı aritmetiği: ara değerler ms cinsindendir.
 */
export function sureCarpaniPpm(d: Dunya, ctx: Baglam, oyuncu: OyuncuId): number {
  const o = oyuncuBul(d, oyuncu);
  if (!o) return PPM;
  const e = ctx.ic.param.erkenOyun;
  const gecen = d.zaman > o.katilmaZamani ? d.zaman - o.katilmaZamani : 0;
  const sabitMs = e.sabitSaat * SAAT;
  const bitisMs = e.bitisSaat * SAAT;
  if (gecen <= sabitMs) return e.baslangicCarpaniPpm;
  if (gecen >= bitisMs) return PPM;
  // sabitMs < gecen < bitisMs, dolayısıyla bitisMs > sabitMs.
  return e.baslangicCarpaniPpm + carpBol(PPM - e.baslangicCarpaniPpm, gecen - sabitMs, bitisMs - sabitMs);
}

/**
 * Süreyi (ms) oyuncunun çarpanıyla kısaltır; en az EN_KISA_SURE (özgün süre bundan kısaysa özgün süre).
 */
export function hizlandirilmisSure(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, sureMs: Ms): Ms {
  const c = sureCarpaniPpm(d, ctx, oyuncu);
  return carpliSure(sureMs, c);
}

/** Süreyi ppm çarpanıyla ölçekler; alt sınır EN_KISA_SURE (özgün süre bundan kısaysa özgün süre). */
export function carpliSure(sureMs: Ms, carpanPpm: number): Ms {
  const yeni = carpBol(sureMs, carpanPpm, PPM);
  const alt = sureMs < EN_KISA_SURE ? sureMs : EN_KISA_SURE;
  return yeni < alt ? alt : yeni;
}

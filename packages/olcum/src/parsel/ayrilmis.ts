/**
 * Ayrılmış hücre garantisi (docs/06 §15.1): her ilçenin uygun hücrelerinin %20'si yalnız katılımının ilk 14 gününde olan oyuncuya
 * satılır. Garanti iki yönlüdür ve burada ölçülür:
 *  1. İHLAL: ayrılmış hücre, sahibinin katılımından 14 gün (ya da daha) sonra alınmışsa ihlaldir (çekirdek bunu reddeder; sayı 0 olmalı).
 *     Sınır: `alinmaMs − sahipKatilmaMs ≥ ayrilmisSureMs` ihlaldir (çekirdek: `d.zaman < katılma + süre` ise yeni oyuncu).
 *  2. KORUMA: geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu? Ölçü: satılmamış ayrılmış hücre / tüm ayrılmış hücre (kalan pay).
 * Saf işlev; tamsayı, ppm.
 */
import { oranPpm, tamsayiDenetle } from "./ortak";

/** Bir ayrılmış hücrenin durumu. Sahipsiz hücrede `alinmaMs` ve `sahipKatilmaMs` null'dır. */
export interface AyrilmisHucreKaydi {
  sahipli: boolean;
  /** Satın alma (ya da yurt verilme) anı, ms. */
  alinmaMs: number | null;
  /** Sahibin katılma anı, ms. */
  sahipKatilmaMs: number | null;
}

export interface AyrilmisGarantisi {
  ayrilmisToplam: number;
  /** Satılmış (yeni oyuncu tarafından alınmış) ayrılmış hücre. */
  satilan: number;
  /** Satılmamış ayrılmış hücre. */
  bos: number;
  /** KORUMA: satılmamış / toplam, ppm (toplam 0 ise 0). */
  kalanPayPpm: number;
  /** İHLAL: sahibinin katılımından ayrilmisSureMs ya da daha sonra alınmış ayrılmış hücre (0 olmalı). */
  ihlal: number;
  /** İhlal yok mu. */
  guvenceTuttu: boolean;
}

export function ayrilmisGarantisi(kayitlar: readonly AyrilmisHucreKaydi[], ayrilmisSureMs: number): AyrilmisGarantisi {
  tamsayiDenetle(ayrilmisSureMs, "ayrilmisSureMs");
  if (ayrilmisSureMs <= 0) throw new Error(`ayrilmisGarantisi: ayrilmisSureMs pozitif olmali (bulunan ${ayrilmisSureMs})`);
  let satilan = 0;
  let ihlal = 0;
  for (const k of kayitlar) {
    if (!k.sahipli) continue;
    satilan++;
    if (k.alinmaMs === null || k.sahipKatilmaMs === null) throw new Error("ayrilmisGarantisi: sahipli hucrede alinma ve katilma zamani gerekli");
    tamsayiDenetle(k.alinmaMs, "alinmaMs");
    tamsayiDenetle(k.sahipKatilmaMs, "sahipKatilmaMs");
    if (k.alinmaMs < k.sahipKatilmaMs) throw new Error("ayrilmisGarantisi: alinma katilmadan once olamaz");
    if (k.alinmaMs - k.sahipKatilmaMs >= ayrilmisSureMs) ihlal++;
  }
  const toplam = kayitlar.length;
  const bos = toplam - satilan;
  return { ayrilmisToplam: toplam, satilan, bos, kalanPayPpm: toplam === 0 ? 0 : oranPpm(bos, toplam), ihlal, guvenceTuttu: ihlal === 0 };
}

/**
 * PMTiles özütü ölçümü: düzey başına karo sayısı ve sıkıştırılmış boyut dağılımı, z15'te katman
 * başına özellik sayıları. Bütçe kıyası: karo başına aktarım <= 150 KB (araştırma §7, P0 hedefi).
 */
import type { YerelPmtiles } from "./izgara-pmtiles";

export const KARO_BUTCESI_BAYT = 150 * 1024;

export interface DuzeyOlcumu {
  z: number;
  karo: number;
  /** Farklı içerik sayısı (tekrar eden okyanus/kara karoları tek sayılır). */
  benzersiz: number;
  toplamBayt: number;
  ortalamaBayt: number;
  medyanBayt: number;
  p95Bayt: number;
  enBuyukBayt: number;
  enBuyukKaro: string;
  butceAsan: number;
}

function yuzdelik(sirali: number[], p: number): number {
  if (sirali.length === 0) return 0;
  return sirali[Math.min(sirali.length - 1, Math.floor(p * sirali.length))]!;
}

export function duzeyOlcumleri(arsiv: YerelPmtiles, zler: number[]): DuzeyOlcumu[] {
  const kayitlar = arsiv.tumKarolar();
  return zler.map((z) => {
    const k = kayitlar.filter((r) => r.z === z);
    const boyutlar = k.map((r) => r.bayt).sort((a, b) => a - b);
    const toplam = boyutlar.reduce((a, b) => a + b, 0);
    let enBuyuk = k[0];
    for (const r of k) if (enBuyuk === undefined || r.bayt > enBuyuk.bayt) enBuyuk = r;
    return {
      z,
      karo: k.length,
      benzersiz: new Set(k.map((r) => r.ofset)).size,
      toplamBayt: toplam,
      ortalamaBayt: k.length ? Math.round(toplam / k.length) : 0,
      medyanBayt: yuzdelik(boyutlar, 0.5),
      p95Bayt: yuzdelik(boyutlar, 0.95),
      enBuyukBayt: enBuyuk?.bayt ?? 0,
      enBuyukKaro: enBuyuk ? `${enBuyuk.z}/${enBuyuk.x}/${enBuyuk.y}` : "",
      butceAsan: k.filter((r) => r.bayt > KARO_BUTCESI_BAYT).length,
    };
  });
}

export interface KatmanOlcumu {
  katman: string;
  ozellik: number;
  karoBasinaOrtalama: number;
  karoBasinaEnCok: number;
}

/** Verilen karolarda (varsayılan: tüm z15) katman başına özellik sayıları. */
export function katmanOlcumleri(arsiv: YerelPmtiles, z = 15, filtre?: (x: number, y: number) => boolean): KatmanOlcumu[] {
  const toplam = new Map<string, number>();
  const enCok = new Map<string, number>();
  let karo = 0;
  for (const r of arsiv.tumKarolar()) {
    if (r.z !== z || (filtre && !filtre(r.x, r.y))) continue;
    const vt = arsiv.vektorKaro(r.z, r.x, r.y);
    if (!vt) continue;
    karo++;
    for (const [ad, l] of Object.entries(vt.layers)) {
      toplam.set(ad, (toplam.get(ad) ?? 0) + l.length);
      enCok.set(ad, Math.max(enCok.get(ad) ?? 0, l.length));
    }
  }
  return [...toplam.keys()].sort().map((ad) => ({
    katman: ad,
    ozellik: toplam.get(ad)!,
    karoBasinaOrtalama: karo ? Math.round((toplam.get(ad)! / karo) * 10) / 10 : 0,
    karoBasinaEnCok: enCok.get(ad)!,
  }));
}

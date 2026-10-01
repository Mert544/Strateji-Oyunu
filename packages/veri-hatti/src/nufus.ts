/**
 * Adım 6: nüfus. Natural Earth populated places noktalarının (pop_max) bölge içi toplamı, oyun nüfusuna
 * LOGARİTMİK (geometrik) ölçekle dönüştürülür:
 *
 *   t = (ln P - ln Pmin) / (ln Pmax - ln Pmin)         (P: bölgedeki yerleşim nüfusu toplamı)
 *   nüfus = Nmin * (Nmax / Nmin) ^ t                   (Nmin = 50 000, Nmax = 800 000), 1000'e yuvarlanır
 *
 * En küçük P bölge 50 000, en büyük P bölge 800 000 olur; aradakiler oran olarak korunur. Hiç yerleşim
 * noktası düşmeyen bölge Pmin/2 sayılır. Yalnızca KIYIDAKİ (deniz hücresine komşu) yerleşimler çokgen dışına
 * 10 km'ye kadar yakınsa en yakın bölgeye atanır (kıyı çizgisi genelleştirme farkı); kara sınırındaki
 * yerleşimler (başka bir ülkenin/bölgenin yerleşimi) ASLA komşu bölgeye atanmaz.
 */
import { kutuKesisir, noktaCokgenMesafeKm, noktaCokgende, cokgenlerinKutusu, type Kutu } from "./cografya";
import type { BirlesikBolge } from "./birlestir";
import type { Yerlesim } from "./ulke-verisi";
import { NUFUS } from "./kurallar";

export interface BolgeYerlesimleri {
  toplam: number;
  yerlesimler: Array<{ ad: string; nufus: number }>;
}

const YAKIN_KM = 10;

export function yerlesimleriBolgeyeAta(
  bolgeler: readonly BirlesikBolge[],
  yerlesimler: readonly Yerlesim[],
  kiyidaMi: (boylam: number, enlem: number) => boolean,
): Map<string, BolgeYerlesimleri> {
  const kutular = new Map<string, Kutu>(bolgeler.map((b) => [b.id, cokgenlerinKutusu(b.cokgenler)]));
  const sonuc = new Map<string, BolgeYerlesimleri>(bolgeler.map((b) => [b.id, { toplam: 0, yerlesimler: [] }]));
  const sirali = [...yerlesimler].sort((x, y) => (x.ad === y.ad ? x.boylam - y.boylam : x.ad < y.ad ? -1 : 1));
  for (const y of sirali) {
    const nokta: Kutu = { minB: y.boylam, maxB: y.boylam, minE: y.enlem, maxE: y.enlem };
    let sahip: string | null = null;
    for (const b of bolgeler) {
      if (!kutuKesisir(kutular.get(b.id) as Kutu, nokta)) continue;
      if (b.cokgenler.some((c) => noktaCokgende(y.boylam, y.enlem, c))) {
        sahip = b.id;
        break;
      }
    }
    if (sahip === null && kiyidaMi(y.boylam, y.enlem)) {
      // Kıyıda çokgenin hemen dışında kalan yerleşim: 10 km içindeki en yakın bölge
      let en = YAKIN_KM;
      const genis: Kutu = { minB: y.boylam - 0.2, maxB: y.boylam + 0.2, minE: y.enlem - 0.2, maxE: y.enlem + 0.2 };
      for (const b of bolgeler) {
        if (!kutuKesisir(kutular.get(b.id) as Kutu, genis)) continue;
        for (const c of b.cokgenler) {
          const d = noktaCokgenMesafeKm(y.boylam, y.enlem, c);
          if (d < en) {
            en = d;
            sahip = b.id;
          }
        }
      }
    }
    if (sahip !== null) {
      const s = sonuc.get(sahip) as BolgeYerlesimleri;
      s.toplam += y.nufusEnFazla;
      s.yerlesimler.push({ ad: y.ad, nufus: y.nufusEnFazla });
    }
  }
  return sonuc;
}

/** Gerçek toplamları oyun nüfusuna dönüştürür (logaritmik ölçek, bkz. dosya başı). */
export function nufusOlcekle(toplamlar: ReadonlyMap<string, number>): { nufus: Map<string, number>; t: Map<string, number> } {
  const pozitif = [...toplamlar.values()].filter((v) => v > 0);
  const pMin = Math.min(...pozitif);
  const pMax = Math.max(...pozitif);
  const lnMin = Math.log(pMin);
  const aralik = Math.log(pMax) - lnMin;
  const nufus = new Map<string, number>();
  const tMap = new Map<string, number>();
  for (const [id, p] of toplamlar) {
    const deger = p > 0 ? p : pMin / 2;
    const t = Math.max(0, Math.min(1, (Math.log(deger) - lnMin) / aralik));
    tMap.set(id, t);
    const n = NUFUS.min * (NUFUS.maks / NUFUS.min) ** t;
    nufus.set(id, Math.round(n / NUFUS.yuvarlama) * NUFUS.yuvarlama);
  }
  return { nufus, t: tMap };
}

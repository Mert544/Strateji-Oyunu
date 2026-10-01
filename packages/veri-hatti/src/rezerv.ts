/**
 * Adım 7: rezervler.
 *
 * Rezerv tablosu (yapilandirma/karadeniz.json, bin birim) elle yazılmış ve genel kamu bilgisiyle
 * oluşturulmuştur; ölçek sentetik haritayla aynıdır. USGS MRDS burada DOĞRULAMA katmanıdır:
 * cevher (Iron) ve bakır (Copper) iddialarının, bölge çokgeni içinde (veya 35 km'ye kadar yakınında; MRDS
 * konumları bazen çeyrek derece kaba) en az bir MRDS kaydıyla desteklenmesi aranır. Destek yoksa iddia
 * `mrdsMuaf` ile gerekçeli olarak muaf tutulmalıdır. MRDS'te kömür ve petrol yoktur (DATA_SOURCES.md).
 */
import { kutuKesisir, noktaCokgenMesafeKm, noktaCokgende, cokgenlerinKutusu, type Kutu } from "./cografya";
import type { BirlesikBolge } from "./birlestir";
import type { MrdsKaydi } from "./mrds";

/** MRDS geliştirme durumu -> ağırlık ("Plant" = işleme tesisi, yatak değil: 0). */
export const DURUM_AGIRLIGI: Readonly<Record<string, number>> = {
  Producer: 3,
  "Past Producer": 2,
  Prospect: 1,
  Occurrence: 1,
  Unknown: 1,
  Plant: 0,
};
/** MRDS ile doğrulanan mallar. */
export const MRDS_MALLARI = ["cevher", "bakir"] as const;
export const YAKIN_KM = 35;

export interface MrdsKaniti {
  /** Çokgen içindeki ağırlıklı kayıt sayısı. */
  icerde: number;
  /** Çokgen dışında ama YAKIN_KM içindeki ağırlıklı kayıt sayısı. */
  yakin: number;
  /** En yüksek ağırlıklı en çok 3 kayıt adı. */
  ornekler: string[];
}

/** bölge kimliği -> mal -> kanıt. Yalnızca en az bir kaydı olan hücreler bulunur. */
export function mrdsKanitlari(bolgeler: readonly BirlesikBolge[], kayitlar: readonly MrdsKaydi[]): Map<string, Record<string, MrdsKaniti>> {
  const kutular = new Map<string, Kutu>(bolgeler.map((b) => [b.id, cokgenlerinKutusu(b.cokgenler)]));
  const sonuc = new Map<string, Record<string, MrdsKaniti & { _ad: Array<[number, string]> }>>();
  for (const k of kayitlar) {
    const agirlik = DURUM_AGIRLIGI[k.durum] ?? 1;
    if (agirlik === 0 || k.mallar.length === 0) continue;
    const nokta: Kutu = { minB: k.boylam, maxB: k.boylam, minE: k.enlem, maxE: k.enlem };
    const genis: Kutu = { minB: k.boylam - 0.5, maxB: k.boylam + 0.5, minE: k.enlem - 0.5, maxE: k.enlem + 0.5 };
    let sahip: string | null = null;
    const yakinlar: string[] = [];
    for (const b of bolgeler) {
      const kutu = kutular.get(b.id) as Kutu;
      if (!kutuKesisir(kutu, genis)) continue;
      if (kutuKesisir(kutu, nokta) && b.cokgenler.some((c) => noktaCokgende(k.boylam, k.enlem, c))) {
        sahip = b.id;
        break;
      }
      if (b.cokgenler.some((c) => noktaCokgenMesafeKm(k.boylam, k.enlem, c) <= YAKIN_KM)) yakinlar.push(b.id);
    }
    const hedefler: Array<[string, "icerde" | "yakin"]> = sahip !== null ? [[sahip, "icerde"]] : yakinlar.map((id) => [id, "yakin"]);
    for (const [id, tur] of hedefler) {
      for (const mal of k.mallar) {
        const bolgeKaydi = sonuc.get(id) ?? sonuc.set(id, {}).get(id)!;
        const h = (bolgeKaydi[mal] ??= { icerde: 0, yakin: 0, ornekler: [], _ad: [] });
        h[tur] += agirlik;
        h._ad.push([agirlik, k.ad]);
      }
    }
  }
  const temiz = new Map<string, Record<string, MrdsKaniti>>();
  for (const [id, mallar] of sonuc) {
    const c: Record<string, MrdsKaniti> = {};
    for (const [mal, h] of Object.entries(mallar)) {
      const adlar = h._ad.sort((x, y) => y[0] - x[0] || (x[1] < y[1] ? -1 : 1)).map((x) => x[1]);
      c[mal] = { icerde: h.icerde, yakin: h.yakin, ornekler: [...new Set(adlar)].slice(0, 3) };
    }
    temiz.set(id, c);
  }
  return temiz;
}

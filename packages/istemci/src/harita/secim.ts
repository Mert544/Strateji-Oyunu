/**
 * Hücre seçimi (saf): tek tık = tek hücre, shift+tık = ekle/çıkar, shift+sürükle = dikdörtgen ekle.
 * Uygunsuz hücreler (yol / su / askerî / ilçe dışı / başkasına ait) seçilemez; neden döner.
 * Seçim tek arsa sınıfından olur (`parsel_al` komutunda tek `sinif` alanı var): farklı sınıftan hücre eklenmez,
 * nedeni ipucunda yazılır.
 */
import type { ArsaSinifi, HucreId } from "@bolge/cekirdek";
import { arsaSinifi, ILCE_HUCRE_SINIRI, SINIF_ADI } from "./fiyat";
import { durumAl, engelNedeni, hucreId, idCoz } from "./hucre";
import type { Izgara } from "./hucre";

export interface SecimBaglami {
  izgara: Izgara;
  /** Hücrenin sahibi (yoksa null). */
  sahip: (id: HucreId) => string | null;
  ben: string;
  /** Sahip kimliğinden görünen ad. */
  ad: (sahip: string) => string;
  /** Hücre kamu arsasında mı (satışa kapalı)? */
  kamu?: (id: HucreId) => boolean;
}

/** Hücre seçilebilir mi? Seçilemezse kısa Türkçe neden. */
export function secilemezNedeni(b: SecimBaglami, x: number, y: number): string | null {
  const n = engelNedeni(durumAl(b.izgara, x, y));
  if (n) return n;
  if (b.kamu?.(hucreId(x, y))) return "Kamu arsası: satışa kapalı";
  const s = b.sahip(hucreId(x, y));
  if (s === b.ben) return "Zaten senin";
  if (s) return `Sahibi: ${b.ad(s)}`;
  return null;
}

export type SecimSonucu = { tamam: true } | { tamam: false; neden: string };

export class Secim {
  private kume = new Set<HucreId>();

  get liste(): HucreId[] {
    return [...this.kume];
  }

  get boyut(): number {
    return this.kume.size;
  }

  /** Seçimin arsa sınıfı (boşsa null). */
  sinif(b: SecimBaglami): ArsaSinifi | null {
    for (const id of this.kume) {
      const h = idCoz(id);
      if (h) return arsaSinifi(durumAl(b.izgara, h.x, h.y));
    }
    return null;
  }

  /** Hücre seçimin sınıfına uymuyorsa neden (uyuyorsa ya da seçim boşsa null). */
  private sinifNedeni(b: SecimBaglami, x: number, y: number): string | null {
    const s = this.sinif(b);
    const h = arsaSinifi(durumAl(b.izgara, x, y));
    return s && s !== h ? `Seçim tek sınıftan olmalı (seçim: ${SINIF_ADI[s]}, bu hücre: ${SINIF_ADI[h]})` : null;
  }

  var(id: HucreId): boolean {
    return this.kume.has(id);
  }

  temizle(): void {
    this.kume.clear();
  }

  /** Tek tık: seçimi bu hücreyle değiştir (zaten tek seçiliyse kaldır). */
  tek(b: SecimBaglami, x: number, y: number): SecimSonucu {
    const neden = secilemezNedeni(b, x, y);
    if (neden) return { tamam: false, neden };
    const id = hucreId(x, y);
    const yalniz = this.kume.size === 1 && this.kume.has(id);
    this.kume.clear();
    if (!yalniz) this.kume.add(id);
    return { tamam: true };
  }

  /** Shift+tık: ekle ya da çıkar. */
  degistir(b: SecimBaglami, x: number, y: number): SecimSonucu {
    const id = hucreId(x, y);
    if (this.kume.has(id)) {
      this.kume.delete(id);
      return { tamam: true };
    }
    const neden = secilemezNedeni(b, x, y) ?? this.sinifNedeni(b, x, y);
    if (neden) return { tamam: false, neden };
    this.kume.add(id);
    return { tamam: true };
  }

  /**
   * Shift+sürükle: dikdörtgendeki seçilebilir hücreleri ekle. Seçim `enCok` hücreyi geçmez (varsayılan 72:
   * ilçe sınırından fazlası zaten alınamaz). Sınıf, mevcut seçimin (boşsa dikdörtgendeki ilk uygun hücrenin)
   * sınıfıdır; farklı sınıftan hücreler atlanır. Dönüş: eklenen, atlanan (uygunsuz) ve farklı sınıf sayısı.
   */
  dikdortgen(
    b: SecimBaglami,
    xa: number,
    ya: number,
    xb: number,
    yb: number,
    enCok = ILCE_HUCRE_SINIRI,
  ): { eklenen: number; atlanan: number; farkliSinif: number; kesildi: boolean } {
    const [x0, x1] = xa <= xb ? [xa, xb] : [xb, xa];
    const [y0, y1] = ya <= yb ? [ya, yb] : [yb, ya];
    let eklenen = 0;
    let atlanan = 0;
    let farkliSinif = 0;
    let kesildi = false;
    let sinif = this.sinif(b);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const id = hucreId(x, y);
        if (this.kume.has(id)) continue;
        if (secilemezNedeni(b, x, y)) {
          atlanan++;
          continue;
        }
        const s = arsaSinifi(durumAl(b.izgara, x, y));
        sinif ??= s;
        if (s !== sinif) {
          farkliSinif++;
          continue;
        }
        if (this.kume.size >= enCok) {
          kesildi = true;
          continue;
        }
        this.kume.add(id);
        eklenen++;
      }
    return { eklenen, atlanan, farkliSinif, kesildi };
  }
}

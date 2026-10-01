/**
 * H3 (parsel dünyası) — Askeri kayma ekonomiyi değiştirir (docs/11 §7.7, §8.1; bot: komutan/akıncı).
 *
 * Eşli koşu: aynı tohumla TEMEL ve MÜDAHALE. Müdahalede bir ilin inşa edilmiş yuvalarının ≥ %20'si ordugâha kayar
 * (önkoşul; tutmazsa sonuç belirsiz). KARAR: o il ve komşu illerde herhangi bir (fiyat ya da arz) göstergesinin göreli
 * değişimi |müdahale − temel| / |temel| ≥ %10 -> geçti. Gösterge anahtarı: "fiyat:<il>:<mal>", "arz:<il>:<mal>" (tamsayı).
 */
import type { Verdict } from "../tipler";
import { dizgeSirala, goreliDegisimPpm, oranPpm } from "./ortak";

export const PARSEL_H3_ORDUGAH_PAYI_PPM = 200_000;
export const PARSEL_H3_DEGISIM_ESIK_PPM = 100_000;
export const PARSEL_H3_ORDUGAH_TURU = "ordugah";

export interface YapiKaydi {
  il: string;
  tur: string;
  /** Kapladığı hücre (yuva) sayısı. */
  yuva: number;
}

export interface OrdugahPayiSonucu {
  /** İlin yuvaları içinde ordugâh payı, ppm; ilde yapı yoksa null. */
  payPpm: number | null;
  ordugahYuva: number;
  toplamYuva: number;
}

/** Bir ildeki tamamlanmış (ya da inşa hâlindeki; koşucu seçer) yapıların yuva toplamında ordugâh payı. */
export function ordugahPayi(yapilar: readonly YapiKaydi[], il: string, ordugahTuru: string = PARSEL_H3_ORDUGAH_TURU): OrdugahPayiSonucu {
  let ordugah = 0;
  let toplam = 0;
  for (const y of yapilar) {
    if (y.il !== il) continue;
    toplam += y.yuva;
    if (y.tur === ordugahTuru) ordugah += y.yuva;
  }
  return { payPpm: toplam === 0 ? null : oranPpm(ordugah, toplam), ordugahYuva: ordugah, toplamYuva: toplam };
}

export interface EsliDegisimSonucu {
  /** En büyük göreli değişim, ppm (karşılaştırılabilir gösterge yoksa null). */
  enBuyukPpm: number | null;
  enBuyukAnahtar: string | null;
  /** Anahtar -> değişim (temel 0 ise null). Yalnız iki koşuda da olan anahtarlar. */
  degisimler: Record<string, number | null>;
  /** Eşiği (≥ %10) geçen anahtarlar (sıralı). */
  esikAsan: string[];
}

export function esliDegisim(temel: Readonly<Record<string, number>>, mudahale: Readonly<Record<string, number>>): EsliDegisimSonucu {
  const degisimler: Record<string, number | null> = {};
  let enBuyuk: number | null = null;
  let enBuyukAnahtar: string | null = null;
  const esikAsan: string[] = [];
  for (const k of Object.keys(temel).sort(dizgeSirala)) {
    const m = mudahale[k];
    if (m === undefined) continue;
    const d = goreliDegisimPpm(temel[k] as number, m);
    degisimler[k] = d;
    if (d === null) continue;
    if (d >= PARSEL_H3_DEGISIM_ESIK_PPM) esikAsan.push(k);
    if (enBuyuk === null || d > enBuyuk) {
      enBuyuk = d;
      enBuyukAnahtar = k;
    }
  }
  return { enBuyukPpm: enBuyuk, enBuyukAnahtar, degisimler, esikAsan };
}

export interface H3ParselSonucu {
  verdict: Verdict;
  /** Müdahale önkoşulu (ordugâh payı ≥ %20) tuttu mu. */
  mudahaleGecerli: boolean;
  ordugah: OrdugahPayiSonucu;
  degisim: EsliDegisimSonucu;
}

export function h3ParselDegerlendir(ordugah: OrdugahPayiSonucu, degisim: EsliDegisimSonucu): H3ParselSonucu {
  const mudahaleGecerli = ordugah.payPpm !== null && ordugah.payPpm >= PARSEL_H3_ORDUGAH_PAYI_PPM;
  const verdict: Verdict = !mudahaleGecerli || degisim.enBuyukPpm === null ? "belirsiz" : degisim.enBuyukPpm >= PARSEL_H3_DEGISIM_ESIK_PPM ? "gecti" : "kaldi";
  return { verdict, mudahaleGecerli, ordugah, degisim };
}

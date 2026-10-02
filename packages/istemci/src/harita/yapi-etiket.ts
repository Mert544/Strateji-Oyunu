/**
 * Haritadaki yapı etiketi metni (saf): "Çiftlik · İskele · 7 dk" (B6), büyütmede "Çiftlik · Büyütme · 7 dk", biten yapıda yalnız ad. Dükkân inşaatında `D4.etiket_ad`
 * ("Dükkân · İskele · 24 dk"; marka ya da tür bilinirse o ad). Başlangıç bilinmiyorsa aşama yerine "İnşa" (tek terim).
 */
import { kalanSureMetni } from "../arayuz/bicim";
import { dukkanMetni } from "./dukkan-metin";
import { ASAMA_ADI } from "./yapi";

export interface YapiEtiketGirdisi {
  ad: string;
  /** 0 Temel, 1 İskele, 2 Gövde, 3 Tamam. */
  asama: 0 | 1 | 2 | 3;
  yukseltme: boolean;
  dukkan: boolean;
  /** Bitişe kalan süre (ms); bitiş bilinmiyorsa ya da geçtiyse tanımsız. */
  kalanMs?: number;
  /** İnşaatın bitişi hiç bilinmiyor (aşama de bilinmez). */
  bitisBilinmiyor?: boolean;
}

export function yapiEtiketMetni(g: YapiEtiketGirdisi): string {
  const kalan = g.kalanMs !== undefined && g.kalanMs > 0 ? ` · ${kalanSureMetni(g.kalanMs)}` : "";
  if (g.yukseltme) return `${g.ad} · Büyütme${kalan}`;
  if (g.asama === 3) return g.ad;
  if (g.dukkan && kalan !== "") return dukkanMetni("dukkan.D4.etiket_ad", { ad: g.ad, asama: ASAMA_ADI[g.asama], sure: kalanSureMetni(g.kalanMs as number) });
  return `${g.ad} · ${g.bitisBilinmiyor ? "İnşa" : ASAMA_ADI[g.asama]}${kalan}`;
}

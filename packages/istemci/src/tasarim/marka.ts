/**
 * Dükkân ve marka görsel eşlemeleri (saf veri; G7). Çekirdek yalnız indeks taşır (`OyuncuMarka { ad, simge, renk }`,
 * p4-p5-sartname §7.1); görünüm burada eşlenir. Renk: oyuncu paletinin 12 rengi (`--oyuncu-N`; tema belirteçleri, açık/koyu
 * kendiliğinden). Simge: 8 Lucide adı (yalnız kartta görünür; harita ve sokakta marka rengi taşır). Dükkân TÜRÜ simgesi ayrıdır
 * ve haritada ile kartta görünür.
 */

/** `param.mulk.perakende.marka.renkSayisi` ile aynı olmalı (oyuncu paleti 12 renk). */
export const MARKA_RENK_SAYISI = 12;

/** Marka rengi indeksi -> CSS belirteci (palet indeksine eşit; sınır dışı değer modülle döner). */
export function markaRenkBelirteci(renk: number): string {
  return `--oyuncu-${((Math.trunc(renk) % MARKA_RENK_SAYISI) + MARKA_RENK_SAYISI) % MARKA_RENK_SAYISI}`;
}

/** Marka simgeleri (`OyuncuMarka.simge` indeksi -> Lucide adı; yalnız kartta). Öneri: tasarım lideri seçer. */
export const MARKA_SIMGELERI = ["leaf", "flame", "gem", "sun", "mountain", "feather", "flower", "bird"] as const;

/** Dükkân türü (`dukkanTurleri[].id`) -> Lucide adı (haritada ve kartta). */
export const DUKKAN_SIMGELERI: Readonly<Record<string, string>> = {
  bakkal: "shopping-basket",
  firin: "croissant",
  sarkuteri: "ham",
  sekerci: "candy",
  yapi_market: "hammer",
};

/** Bilinmeyen tür için genel dükkân simgesi. */
export const DUKKAN_SIMGESI_VARSAYILAN = "store";

export function dukkanSimgesi(tur: string): string {
  return DUKKAN_SIMGELERI[tur] ?? DUKKAN_SIMGESI_VARSAYILAN;
}

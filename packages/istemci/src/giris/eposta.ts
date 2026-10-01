/**
 * E-posta girdisi (G9-a; saf): gönderimden önce kaba denetim ve sayaç anahtarı. Asıl denetim sunucudadır (`gecersiz_eposta`,
 * `gecici_eposta`); burada yalnız bariz yazım hataları (boşluk, `@` yok, alan noktasız) gereksiz istek yapılmadan yakalanır.
 * Büyük/küçük harf DEĞİŞTİRİLMEZ (sunucu normalleştirir; posta yazılan adrese gider).
 */

/** Sunucu şeması 3–254 karakter ister. */
export const EPOSTA_EN_AZ = 3;
export const EPOSTA_EN_COK = 254;

export type EpostaSonucu = { tamam: true; eposta: string } | { tamam: false; kod: "gecersiz_eposta" };

/** Baştaki/sondaki boşluk ve posta uygulamalarının eklediği `<...>`, `mailto:` önekini atar. */
export function epostaTemizle(girdi: string): string {
  let s = girdi.trim().replace(/^mailto:/i, "");
  const m = /^<(.+)>$/.exec(s);
  if (m?.[1]) s = m[1].trim();
  return s;
}

export function epostaKontrol(girdi: string): EpostaSonucu {
  const eposta = epostaTemizle(girdi);
  if (eposta.length < EPOSTA_EN_AZ || eposta.length > EPOSTA_EN_COK) return { tamam: false, kod: "gecersiz_eposta" };
  // tek @, yerel kısım boş değil, alan en az bir nokta ve boşluksuz; ardışık nokta ve uç noktalar yok
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(eposta)) return { tamam: false, kod: "gecersiz_eposta" };
  return { tamam: true, eposta };
}

/** Yeniden gönderme sayacının anahtarı (yalnız bellekte tutulur; kaydedilmez). */
export function epostaAnahtari(eposta: string): string {
  return epostaTemizle(eposta).toLowerCase();
}

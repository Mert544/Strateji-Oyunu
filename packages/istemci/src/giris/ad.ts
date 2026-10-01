/**
 * Görünen ad istemci denetimi (G9-c; saf, DOM yok): çekirdek `ad.ts` ad kuralının (min 2, max 24, izinli küme, baş/son/art arda boşluk, en az bir harf)
 * ve sabit Türkçe küçük harf tablosunun KOPYASI. Çekirdek içe aktarılmaz: bu dosya kabuk paketine (giris.js) girer ve `@bolge/cekirdek` girişi çok büyüktür
 * (boyut notu `api.ts`'te). `test/giris-ad.test.ts` kopyanın çekirdekle AYNI sonucu verdiğini bir örnek kümesinde sınar.
 * Sunucu (POST /giris/ad) ayrıca doğrular ve istemciye güvenmez: buradaki denetim yalnız hızlı geri bildirim ve "küçük hâli" önizlemesi içindir.
 *
 * Hata türleri metin anahtarına çevrilir (`giris.G4.<tür>`): kural, çekirdeğin sırasıyla (uzunluk, karakter, baş/son boşluk, art arda boşluk, harf);
 * çift tırnak ve uzun tire, `karakter`in daha açık bir türüdür (`cift_tirnak_tire`).
 */
export const AD_MIN = 2;
export const AD_MAX = 24;
const IZINLI = /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$/;
const HARF = /[A-Za-zÇĞİÖŞÜçğıöşü]/;
/** Çift tırnak (düz ve kıvrık) ve uzun tire (en/em): kullanıcı çoğu kez bunları yapıştırır; "karakter" yerine daha açık bir ileti. */
const TIRNAK_TIRE = /["“”„‟″—–]/;

/** Metin yer tutucuları (`{en_az}`, `{en_cok}`): sabit yazılmaz, kuraldan gelir. */
export const AD_YER = { en_az: AD_MIN, en_cok: AD_MAX } as const;

export type AdHatasi = "uzunluk" | "karakter" | "cift_tirnak_tire" | "bosluk_kenar" | "bosluk_art_arda" | "harf_gerekli";

/** İlk ihlal (çekirdek sırası) ya da null (geçerli). Düzeltme yapılmaz (kırpma yok). */
export function adHatasi(ad: string): AdHatasi | null {
  if (ad.length < AD_MIN || ad.length > AD_MAX) return "uzunluk";
  if (!IZINLI.test(ad)) return TIRNAK_TIRE.test(ad) ? "cift_tirnak_tire" : "karakter";
  if (ad.startsWith(" ") || ad.endsWith(" ")) return "bosluk_kenar";
  if (ad.includes("  ")) return "bosluk_art_arda";
  if (!HARF.test(ad)) return "harf_gerekli";
  return null;
}

/**
 * Yazarken (canlı) gösterilecek hata: yalnız o an düzeltilebilecek türler (izinsiz karakter, art arda boşluk). Kısalık, baş/son boşluk ve harf eksikliği yazma
 * sırasında normaldir; onlar gönderirken söylenir.
 */
export function adCanliHatasi(ad: string): AdHatasi | null {
  if (ad === "") return null;
  if (!IZINLI.test(ad)) return TIRNAK_TIRE.test(ad) ? "cift_tirnak_tire" : "karakter";
  if (ad.includes("  ")) return "bosluk_art_arda";
  if (ad.length > AD_MAX) return "uzunluk";
  return null;
}

const KUCUK: Readonly<Record<string, string>> = { I: "ı", "İ": "i", "Ç": "ç", "Ğ": "ğ", "Ö": "ö", "Ş": "ş", "Ü": "ü" };

/** Sabit Türkçe tablo (yerel ayardan bağımsız): `I -> ı`, `İ -> i`; öbür büyük ASCII harfler küçültülür. Çekirdek `adKanonik` ile aynıdır. */
export function adKucuk(ad: string): string {
  let c = "";
  for (let i = 0; i < ad.length; i++) {
    const h = ad.charAt(i);
    c += KUCUK[h] ?? (h >= "A" && h <= "Z" ? String.fromCharCode(h.charCodeAt(0) + 32) : h);
  }
  return c;
}

/** Önizleme ("Dünyada böyle görünürsün: …"): geçerli addaysa küçük hâli, değilse null. */
export function adOnizleme(ad: string): string | null {
  return adHatasi(ad) === null ? adKucuk(ad) : null;
}

/** Hata türü → metin anahtarı. */
export const adHataAnahtari = (h: AdHatasi): string => `giris.G4.${h}`;

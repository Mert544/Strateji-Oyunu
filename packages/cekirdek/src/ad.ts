/**
 * Ad kuralı (marka adı ve oyuncunun görünen adı için TEK kaynak; docs/arastirma/p4-p5-sartname.md §7.7, S-12 varsayılanı).
 *
 * SAF modül: yalnız tamsayı ve dizge işlemleri; yerel ayara, çalışma ortamına ve Node/ICU sürümüne bağlı HİÇBİR işlev çağrılmaz.
 * Büyük harften küçük harfe çeviri SABİT Türkçe tabloyla yapılır (`İ -> i`, `I -> ı`, `Ç Ğ Ö Ş Ü` -> küçükleri); dil kütüphanesinin
 * kendi çevirisi bilerek kullanılmaz (Türkçede `I` için yanlış sonuç verir ve ortama göre değişir). `ad-kurali.test.ts` bu dosyanın
 * kaynağında o işlevlerin adının geçmediğini sınar.
 *
 * Yasaklı ad listesi çekirdekte YOKTUR (liste moderasyonla güncellenir; sunucunun komut kabul süzgecindedir). Çekirdek yalnız sözdizimini
 * ve kanonik (küçük harf) biçimi bilir; ikisi kural dönemi dışında değişmez (tablo ve `AD_KURALI.kucukHarf` kuralSurumu kararıdır).
 */

/** Sabit ad kuralı: uzunluk (UTF-16 kod birimi; izinli kümede bir karakter = bir kod birimi), izinli küme, büyük harf çevirisi. */
export const AD_KURALI = {
  min: 2,
  max: 24,
  izinli: /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$/,
  /** true: ad küçük harfe çevrilerek saklanır (S-12 varsayılanı). Sahip "serbest" derse yalnız bu alan false olur. */
  kucukHarf: true,
} as const;

/** Harf aranan küme (en az bir harf şartı). */
const HARF = /[A-Za-zÇĞİÖŞÜçğıöşü]/;

/**
 * Ad sözdizimi hatası (ret iletisi, küçük harfli ASCII-Türkçe) ya da geçerliyse null. Sıra: tür, uzunluk, izinli küme, baş/son boşluk,
 * art arda boşluk, en az bir harf. Düzeltme YAPILMAZ (kırpma yok): metin ya olduğu gibi kabul edilir ya reddedilir. Büyük harf ret nedeni DEĞİLDİR.
 */
export function adSozdizimiHatasi(ad: unknown): string | null {
  if (typeof ad !== "string") return "marka adi metin olmali";
  if (ad.length < AD_KURALI.min || ad.length > AD_KURALI.max) return `marka adi ${AD_KURALI.min} ile ${AD_KURALI.max} karakter arasinda olmali`;
  if (!AD_KURALI.izinli.test(ad)) return "marka adinda gecersiz karakter";
  if (ad.startsWith(" ") || ad.endsWith(" ")) return "marka adi bastan ya da sondan bosluk icermemeli";
  if (ad.includes("  ")) return "marka adinda art arda bosluk olamaz";
  if (!HARF.test(ad)) return "marka adi en az bir harf icermeli";
  return null;
}

/**
 * Büyük -> küçük harf tablosu (tek doğruluk kaynağı). Tabloda olmayan karakter (küçük harf, rakam, boşluk, `.` `'` `&` `-`) olduğu gibi geçer.
 * Tablo değişirse yeniden oynatma sonucu değişir: değişiklik kural dönemi (kuralSurumu) kararıdır.
 */
const KUCUK_HARF: Readonly<Record<string, string>> = {
  A: "a", B: "b", C: "c", D: "d", E: "e", F: "f", G: "g", H: "h", I: "ı", J: "j",
  K: "k", L: "l", M: "m", N: "n", O: "o", P: "p", Q: "q", R: "r", S: "s", T: "t",
  U: "u", V: "v", W: "w", X: "x", Y: "y", Z: "z",
  "İ": "i", "Ç": "ç", "Ğ": "ğ", "Ö": "ö", "Ş": "ş", "Ü": "ü",
};

/**
 * Kanonik ad: önce sözdizimi (`adSozdizimiHatasi`), sonra `AD_KURALI.kucukHarf` iken sabit tabloyla küçük harf. Uzunluk korunur (bire bir BMP eşleme);
 * çeviri idempotenttir (`adKanonik(adKanonik(x).ad)` aynı sonucu verir). Marka komutu ve sunucunun görünen ad ucu AYNI işlevi çağırır; ikisi de
 * istemciye güvenmez, yeniden çevirir.
 */
export function adKanonik(ad: unknown): { tamam: true; ad: string } | { tamam: false; hata: string } {
  const hata = adSozdizimiHatasi(ad);
  if (hata !== null) return { tamam: false, hata };
  const s = ad as string;
  if (!AD_KURALI.kucukHarf) return { tamam: true, ad: s };
  let c = "";
  for (let i = 0; i < s.length; i++) {
    const h = s.charAt(i);
    c += KUCUK_HARF[h] ?? h;
  }
  return { tamam: true, ad: c };
}

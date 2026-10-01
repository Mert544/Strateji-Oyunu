/**
 * Giriş (HTTP) sözleşmesi: e-posta bağlantısıyla giriş (G5, docs/12 §14 A-1; tasarım: packages/sunucu/KIMLIK.md).
 *
 * WebSocket protokolüne DOKUNMAZ (`PROTOKOL_SURUMU` değişmez): ws tarafında yalnız `merhaba.token` alanı bir ws bileti taşır.
 * Bu dosya yalnız ekleme olarak eklenmiştir; uçlar sunucunun mevcut HTTP portunda `/giris/` altındadır.
 *
 * Akış (istemci, tarayıcı):
 * 1. `POST /giris/istek {eposta}` -> her zaman 202 (hesabın varlığı sızmaz); posta arka planda gider.
 * 2. Kullanıcı postadaki bağlantıyı açar: `GET /giris/onay?j=<jeton>` YALNIZ onay sayfasını gösterir (yan etkisiz; önizleme botları
 *    bağlantıyı tüketemez). Sayfadaki düğme `POST /giris/onay {j}` yapar -> oturum çerezi (httpOnly) verilir.
 * 3. `POST /giris/bilet` (çerezle) -> 60 sn ömürlü, tek kullanımlık ws bileti; istemci bunu `merhaba.token` olarak gönderir.
 * Durum değiştiren her POST `Origin` başlığı ister ve sunucunun izin listesindeki bir kökenden gelmelidir (CSRF savunması);
 * istemci `fetch(..., {credentials: "include"})` kullanır ve sunucuyla AYNI SİTEDE (SameSite=Lax çerezi) olmalıdır.
 */
import { z } from "zod";

export const GIRIS_YOLLARI = {
  istek: "/giris/istek",
  onay: "/giris/onay",
  bilet: "/giris/bilet",
  ben: "/giris/ben",
  ad: "/giris/ad",
  adOner: "/giris/ad-oner",
  cikis: "/giris/cikis",
  cikisTumu: "/giris/cikis-tumu",
} as const;

/** Oturum çerezi (httpOnly; istemci kodu okuyamaz, yalnız tarayıcı gönderir). */
export const OTURUM_CEREZI = "bolge_oturum";
/** İstek yapan tarayıcıya bağlı çerez (bağlantı başka tarayıcıda açılırsa `tarayici_uyumsuz`). Ömrü bağlantı ömrüdür. */
export const GIRIS_TARAYICI_CEREZI = "bolge_giris";

/** HTTP hata gövdesindeki kod; durum kodu eşlemesi parantez içindedir. */
export type GirisHataKodu =
  /** 400: gövde bozuk ya da alan eksik. */
  | "gecersiz_istek"
  /** 422: e-posta biçimi geçersiz. */
  | "gecersiz_eposta"
  /** 422: geçici (tek kullanımlık) e-posta alanı. Alan listesine göredir; hesabın varlığına bağlı DEĞİLDİR. */
  | "gecici_eposta"
  /** 429: istek hız sınırı (IP başına ya da genel); `beklemeSn` ve `Retry-After` verilir. */
  | "hiz_siniri"
  /** 400: bağlantı geçersiz, süresi dolmuş ya da daha önce kullanılmış. */
  | "baglanti_gecersiz"
  /** 403: bağlantı isteği yapan tarayıcıdan farklı bir tarayıcıda açıldı (bağlantı tüketilmez; doğru tarayıcıda açılabilir). */
  | "tarayici_uyumsuz"
  /** 422: görünen ad kuralına uymuyor (uzunluk 2-24, izinli karakterler, baş/son/art arda boşluk, en az bir harf); `mesaj` nedeni söyler. Düzeltme yapılmaz. */
  | "ad_gecersiz"
  /** 422: ad kuralına uyuyor ama yasaklı ad listesinde (katlanmış karşılaştırma); `mesaj` genel ("ad kullanilamaz"), listeyi sızdırmaz. */
  | "ad_yasakli"
  /** 429: ad günde (00:00 TRT sınırı) en çok bir kez değiştirilebilir; `beklemeSn` bir sonraki Türkiye gece yarısına kalan süredir. */
  | "ad_sinir"
  /** 401: oturum çerezi yok, süresi dolmuş ya da kapatılmış. */
  | "oturum_yok"
  /** 403: `Origin` yok ya da izin listesinde değil. */
  | "origin"
  /** 405 ve 404. */
  | "yontem"
  | "bulunamadi"
  /** 500. */
  | "ic_hata";

export const GirisHatasiSemasi = z.object({
  tamam: z.literal(false),
  kod: z.enum(["gecersiz_istek", "gecersiz_eposta", "gecici_eposta", "hiz_siniri", "baglanti_gecersiz", "tarayici_uyumsuz", "ad_gecersiz", "ad_yasakli", "ad_sinir", "oturum_yok", "origin", "yontem", "bulunamadi", "ic_hata"]),
  mesaj: z.string(),
  beklemeSn: z.number().int().nonnegative().optional(),
});
export type GirisHatasi = z.infer<typeof GirisHatasiSemasi>;

/** `POST /giris/istek` gövdesi. */
export const GirisIstegiSemasi = z.object({ eposta: z.string().min(3).max(254) });
export type GirisIstegi = z.infer<typeof GirisIstegiSemasi>;
/** 202 yanıtı: her e-posta için aynıdır (hesap varlığı, hız sınırı ve gönderim sonucu sızmaz). */
export const GirisIstekYanitiSemasi = z.object({ tamam: z.literal(true), gecerlilikSn: z.number().int().positive() });
export type GirisIstekYaniti = z.infer<typeof GirisIstekYanitiSemasi>;

/** `POST /giris/onay` gövdesi (JSON); onay sayfasının formu aynı alanı `j` adıyla form-urlencoded gönderir. */
export const GirisOnayiSemasi = z.object({ j: z.string().min(1).max(512) });
export type GirisOnayi = z.infer<typeof GirisOnayiSemasi>;
export const GirisOnayYanitiSemasi = z.object({
  tamam: z.literal(true),
  /** Bu girişle yeni hesap (ve oyuncu kimliği) açıldı mı. */
  yeniHesap: z.boolean(),
  /** Hesabın tek oyuncusu (opak, sunucu üretimli; e-postadan türetilmez). */
  oyuncu: z.string().min(1).max(32),
  /** Görünen ad (sunucu üretimli küçük harfli opak ad ya da oyuncunun seçtiği; yoksa sunucuda ad özelliği kapalıdır). */
  ad: z.string().min(2).max(24).optional(),
  /** Oyuncu adını kendisi seçti mi (false: otomatik ad; istemci ad seçme ekranını gösterir). */
  adSecildi: z.boolean().optional(),
});
export type GirisOnayYaniti = z.infer<typeof GirisOnayYanitiSemasi>;

/** `POST /giris/bilet` yanıtı: ws bileti (`merhaba.token`). `bitis` epoch ms (sunucu duvar saati). */
export const GirisBiletYanitiSemasi = z.object({
  tamam: z.literal(true),
  bilet: z.string().min(1).max(4096),
  bitis: z.number().int().positive(),
  oyuncu: z.string().min(1).max(32),
});
export type GirisBiletYaniti = z.infer<typeof GirisBiletYanitiSemasi>;

/** `GET /giris/ben` yanıtı. Süreler epoch ms. */
export const GirisBenYanitiSemasi = z.object({
  tamam: z.literal(true),
  eposta: z.string(),
  oyuncu: z.string().min(1).max(32),
  oturumBitis: z.number().int().positive(),
  oturumMutlakBitis: z.number().int().positive(),
  /** Görünen ad ve seçilip seçilmediği (bkz. `GirisOnayYanitiSemasi`). */
  ad: z.string().min(2).max(24).optional(),
  adSecildi: z.boolean().optional(),
});
export type GirisBenYaniti = z.infer<typeof GirisBenYanitiSemasi>;

/**
 * `POST /giris/ad` gövdesi: oturumlu (çerez) ve `Origin` izinli. Ad sunucuda doğrulanır ve KÜÇÜK HARFE çevrilerek saklanır (Türkçe sabit tablo; çekirdek `adKanonik`);
 * yanıttaki `ad` kaydedilen (kanonik) biçimdir. Sınırlar `AD_KURALI` ile aynıdır (sunucu testi eşitliği sınar). Günde (00:00 TRT) en çok bir değişiklik; otomatik
 * addan ilk seçime geçiş sayılmaz.
 */
export const GirisAdIstegiSemasi = z.object({ ad: z.string().min(2).max(24) });
export type GirisAdIstegi = z.infer<typeof GirisAdIstegiSemasi>;
export const GirisAdYanitiSemasi = z.object({ tamam: z.literal(true), ad: z.string().min(2).max(24), adSecildi: z.literal(true) });
export type GirisAdYaniti = z.infer<typeof GirisAdYanitiSemasi>;

/**
 * `GET /giris/ad-oner` yanıtı (oturum çerezi gerekir): sunucunun o an ürettiği YENİ bir opak öneri (küçük harfli "sıfat isim rakam"; ad kuralından ve yasaklı ad
 * süzgecinden geçmiş, başka hesapta olmayan). KAYDETMEZ; oyuncu beğenirse `POST /giris/ad` ile seçer. Hız sınırlıdır (oturum başına). Hata kodları: `oturum_yok` (401),
 * `hiz_siniri` (429), `bulunamadi` (404: görünen ad özelliği kapalı).
 */
export const GirisAdOneriYanitiSemasi = z.object({ tamam: z.literal(true), ad: z.string().min(2).max(24) });
export type GirisAdOneriYaniti = z.infer<typeof GirisAdOneriYanitiSemasi>;

/** `POST /giris/cikis` ve `/giris/cikis-tumu` yanıtı. */
export const GirisTamamSemasi = z.object({ tamam: z.literal(true) });

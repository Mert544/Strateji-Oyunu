/**
 * Kimlik kipi seçimi ve `--uretim` denetimleri (saf işlev: CLI ve testler kullanır).
 *
 * - `gelistirme`: `GelistirmeKimligi` (`gel1.<oyuncu>.<hmac>`, `--token` ile üretilir). `--uretim`'de REDDEDİLİR; orada hiç kurulmaz.
 * - `eposta`: e-posta bağlantısıyla giriş (ws bileti). Üretimin tek kipi ve üretimde varsayılandır.
 * Üretimde varsayılan/örnek sırlar ve günlük tuzu (`BOLGE_GUNLUK_TUZU`, bilet sırrından farklı) zorunludur/reddedilir; konsol postacısı reddedilir (bağlantı günlüğe sızmasın); `Origin` izin listesi ve
 * https genel adresi zorunludur.
 */
export type KimlikKipi = "gelistirme" | "eposta";
export type PostaTuru = "dosya" | "konsol";

/** Geliştirmede (yalnız) kullanılan örnek bilet sırrı; üretimde reddedilir. */
export const VARSAYILAN_BILET_SIRRI = "gelistirme-bilet-sirri-degistir-0123456789";
export const EN_KISA_URETIM_SIRRI = 32;
/** Geliştirmede (yalnız; uyarıyla) kullanılan örnek günlük tuzu; üretimde reddedilir (`gelistirme...`). */
export const VARSAYILAN_GUNLUK_TUZU = "gelistirme-gunluk-tuzu-degistir-0123456789";

export interface KimlikKipiGirdisi {
  uretim: boolean;
  /** `--kimlik` / `BOLGE_KIMLIK`; verilmezse üretimde `eposta`, değilse `gelistirme`. */
  kimlik?: string;
  /** `BOLGE_BILET_SIRRI` ve rotasyondaki eski sır `BOLGE_BILET_SIRRI_ESKI`. */
  biletSirri?: string;
  biletSirriEski?: string;
  /** `BOLGE_GUNLUK_TUZU`: günlükte e-posta kimliği (HMAC öneki) tuzu; bilet sırrından FARKLI olmalı. `eposta` kipinde üretimde zorunlu, geliştirmede yoksa uyarı + örnek tuz. */
  gunlukTuzu?: string;
  /** `--posta` / `BOLGE_POSTA` (dosya | konsol); varsayılan dosya. */
  posta?: string;
  izinliKokenler: readonly string[];
  /** `--genel-url` / `BOLGE_GENEL_URL`. */
  genelUrl?: string;
  /** `--token` verildi mi (geliştirme token'ı yazdırma komutu). */
  tokenKomutu: boolean;
  /** Geliştirme sırrı açıkça verildi mi (üretimde yok sayıldığı bildirilir). */
  gelistirmeSirriVerildi: boolean;
}

export interface KimlikKipiSonucu {
  kip: KimlikKipi;
  /** İmza sırları: ilki yeni, varsa ikincisi eski. Yalnız `eposta` kipinde. */
  sirlar: string[];
  posta: PostaTuru;
  /** Günlük kimliği tuzu (yalnız `eposta` kipinde). */
  gunlukTuzu?: string;
  uyarilar: string[];
}

function uretimSirri(ad: string, sir: string): void {
  if (sir.length < EN_KISA_URETIM_SIRRI) throw new Error(`uretim kipi: ${ad} en az ${EN_KISA_URETIM_SIRRI} karakter olmali`);
  if (sir === VARSAYILAN_BILET_SIRRI || sir.startsWith("degistir") || sir.startsWith("gelistirme")) throw new Error(`uretim kipi: ${ad} varsayilan/ornek ('degistir...', 'gelistirme...') deger olmamali`);
}

export function kimlikKipiCoz(g: KimlikKipiGirdisi): KimlikKipiSonucu {
  const kip = (g.kimlik ?? (g.uretim ? "eposta" : "gelistirme")) as string;
  if (kip !== "gelistirme" && kip !== "eposta") throw new Error(`bilinmeyen kimlik kipi: ${kip} (gelistirme | eposta)`);
  const uyarilar: string[] = [];
  if (g.uretim) {
    if (kip === "gelistirme") throw new Error("uretim kipi: gelistirme kimligi kapali (BOLGE_KIMLIK=eposta); GelistirmeKimligi uretimde kurulmaz");
    if (g.tokenKomutu) throw new Error("uretim kipi: --token (gelistirme token'i) kapali");
    if (g.gelistirmeSirriVerildi) uyarilar.push("uretim kipi: BOLGE_GELISTIRME_SIRRI yok sayilir (gelistirme kimligi kapali); ortamdan kaldirin");
  }
  const posta = (g.posta ?? "dosya") as string;
  if (posta !== "dosya" && posta !== "konsol") throw new Error(`bilinmeyen posta bagdastiricisi: ${posta} (dosya | konsol)`);
  if (kip === "gelistirme") return { kip, sirlar: [], posta, uyarilar };

  if (g.uretim) {
    if (posta === "konsol") throw new Error("uretim kipi: konsol postacisi kapali (giris baglantisi gunluge sizar); BOLGE_POSTA=dosya ya da gercek bir bagdastirici");
    if (g.biletSirri === undefined) throw new Error("uretim kipi: BOLGE_BILET_SIRRI acikca verilmeli");
    uretimSirri("BOLGE_BILET_SIRRI", g.biletSirri);
    if (g.biletSirriEski !== undefined) {
      uretimSirri("BOLGE_BILET_SIRRI_ESKI", g.biletSirriEski);
      if (g.biletSirriEski === g.biletSirri) throw new Error("uretim kipi: BOLGE_BILET_SIRRI_ESKI yeni sirdan farkli olmali");
    }
    if (g.izinliKokenler.length === 0) throw new Error("uretim kipi: BOLGE_IZINLI_KOKENLER (Origin izin listesi) verilmeli");
    if (g.genelUrl === undefined) throw new Error("uretim kipi: BOLGE_GENEL_URL (postadaki baglantinin genel adresi) verilmeli");
    let u: URL;
    try {
      u = new URL(g.genelUrl);
    } catch {
      throw new Error(`uretim kipi: BOLGE_GENEL_URL gecersiz: ${g.genelUrl}`);
    }
    if (u.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) throw new Error("uretim kipi: BOLGE_GENEL_URL https olmali (Secure cerez)");
  }
  const yeni = g.biletSirri ?? VARSAYILAN_BILET_SIRRI;
  if (yeni.length < 16) throw new Error("BOLGE_BILET_SIRRI en az 16 karakter olmali");
  // Günlük kimliği tuzu (KVKK: günlükte adres yok, yalnız HMAC öneki): üretimde zorunlu; imza sırlarından FARKLI (amaç ayrımı anahtar ayrımıyla tamamlanır).
  let gunlukTuzu = g.gunlukTuzu;
  if (g.uretim) {
    if (gunlukTuzu === undefined) throw new Error("uretim kipi: BOLGE_GUNLUK_TUZU acikca verilmeli (gunlukte e-posta kimligi HMAC tuzu; bilet sirrindan farkli)");
    uretimSirri("BOLGE_GUNLUK_TUZU", gunlukTuzu);
  } else if (gunlukTuzu === undefined) {
    gunlukTuzu = VARSAYILAN_GUNLUK_TUZU;
    uyarilar.push("BOLGE_GUNLUK_TUZU verilmedi: gelistirme icin ornek tuz kullaniliyor (gunlukteki e-posta kimligi onekleri tahmin edilebilir; uretimde tuz zorunludur)");
  } else if (gunlukTuzu.length < 16) throw new Error("BOLGE_GUNLUK_TUZU en az 16 karakter olmali");
  if (gunlukTuzu === yeni || gunlukTuzu === g.biletSirriEski) throw new Error("BOLGE_GUNLUK_TUZU bilet sirrindan (BOLGE_BILET_SIRRI/_ESKI) farkli olmali: jeton anahtariyla ayni anahtar kullanilmaz");
  return { kip, sirlar: g.biletSirriEski !== undefined ? [yeni, g.biletSirriEski] : [yeni], posta, gunlukTuzu, uyarilar };
}

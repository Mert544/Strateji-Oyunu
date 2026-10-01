/**
 * Günlükte e-posta kimliği (KVKK): günlüğe e-posta adresi HİÇ yazılmaz, maskeli hâli de (alan adı ve ilk harf kısmi kişisel veridir). İlişkilendirme (aynı adresin olayları)
 * için yalnız `HMAC-SHA256(kanonik adres)`'in ilk 8 hex karakteri yazılır; anahtar sunucu tuzundan (`BOLGE_GUNLUK_TUZU`) AMACA ÖZEL türetilir (`amacAnahtari`, amaç
 * `eposta-gunluk`): jeton/bilet imza anahtarıyla aynı anahtar KULLANILMAZ (kip denetimi tuzun bilet sırrından farklı olmasını da ister). Tuz olmadan önek tersine çevrilemez
 * ama sözlük saldırısına açık olurdu: üretimde tuz zorunlu (`kip.ts`), geliştirmede uyarıyla örnek tuz kullanılır.
 * Kanonik adres = `epostaCoz().anahtar` (küçük harf, `+takma` ve Gmail noktaları atılmış): aynı hesap aynı öneki alır.
 */
import { createHmac } from "node:crypto";
import { epostaCoz } from "./eposta";
import { amacAnahtari } from "./jeton";

export const GUNLUK_KIMLIK_AMACI = "eposta-gunluk";
/** Önek uzunluğu (hex karakter): ilişkilendirmeye yeter, adres geri kazanılamaz. */
export const GUNLUK_KIMLIK_ONEK = 8;
export const EN_KISA_GUNLUK_TUZU = 16;

export class GunlukKimligi {
  private readonly anahtar: Buffer;

  constructor(tuz: string) {
    if (tuz.length < EN_KISA_GUNLUK_TUZU) throw new Error(`gunluk tuzu en az ${EN_KISA_GUNLUK_TUZU} karakter olmali`);
    this.anahtar = amacAnahtari(tuz, GUNLUK_KIMLIK_AMACI);
  }

  /** Kanonik (normalleştirilmiş) adresin öneki. */
  onek(kanonik: string): string {
    return createHmac("sha256", this.anahtar).update(kanonik).digest("hex").slice(0, GUNLUK_KIMLIK_ONEK);
  }

  /** Ham adresin öneki: önce `epostaCoz` ile kanonikleştirilir (biçim geçersizse küçük harfli kırpılmış hâli). */
  eposta(adres: string): string {
    return this.onek(epostaCoz(adres)?.anahtar ?? adres.trim().toLowerCase());
  }
}

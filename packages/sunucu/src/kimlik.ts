/**
 * Takılabilir kimlik doğrulama. Oyuncu kimliği YALNIZ token'dan çözülür; istemcinin söylediği kimliğe güvenilmez.
 * İki uygulama var: geliştirme token'ı (`GelistirmeKimligi`, HMAC-SHA256 imzalı; `--uretim`'de HİÇ kurulmaz) ve e-posta bağlantısıyla
 * girişten gelen ws bileti (`AuthKimligi`, giris/auth-kimligi.ts).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { OyuncuId } from "@bolge/cekirdek";

export interface Kimlik {
  oyuncu: OyuncuId;
  /** Yönetici: sistem komutları (oyuncu_katil) ve elle saatte zamanIlerlet. Komutları "sistem" olarak damgalanır. */
  yonetici: boolean;
  /** E-posta girişinde hesap kimliği (opak); geliştirme kimliğinde yoktur. Yaptırım ve iptal için. */
  hesap?: string;
  /** E-posta girişinde bileti üreten oturumun kimliği (oturum kapanınca bağlantı düşer); geliştirme kimliğinde yoktur. */
  oturum?: string;
}

export interface KimlikDogrulayici {
  /** Geçerli token için kimlik, aksi halde null. */
  dogrula(token: string): Promise<Kimlik | null>;
}

/** Oyuncu kimliği biçimi: küçük harf, rakam, _ ve -; 1–32 karakter. */
export const OYUNCU_KIMLIGI = /^[a-z0-9_-]{1,32}$/;

const ONEK = "gel1";

function imza(sir: string, oyuncu: string): string {
  return createHmac("sha256", sir).update(`${ONEK}.${oyuncu}`).digest("base64url");
}

/** Geliştirme token'ı üretir: `gel1.<oyuncu>.<hmac>`. "sistem" oyuncusu yöneticidir. */
export function gelistirmeTokeni(sir: string, oyuncu: OyuncuId): string {
  if (!OYUNCU_KIMLIGI.test(oyuncu)) throw new Error(`gecersiz oyuncu kimligi: ${oyuncu}`);
  return `${ONEK}.${oyuncu}.${imza(sir, oyuncu)}`;
}

export class GelistirmeKimligi implements KimlikDogrulayici {
  constructor(private readonly sir: string) {
    if (sir.length < 8) throw new Error("gelistirme sirri en az 8 karakter olmali");
  }

  async dogrula(token: string): Promise<Kimlik | null> {
    const parca = token.split(".");
    if (parca.length !== 3 || parca[0] !== ONEK) return null;
    const oyuncu = parca[1] as string;
    if (!OYUNCU_KIMLIGI.test(oyuncu)) return null;
    const beklenen = Buffer.from(imza(this.sir, oyuncu));
    const gelen = Buffer.from(parca[2] as string);
    if (gelen.length !== beklenen.length || !timingSafeEqual(gelen, beklenen)) return null;
    return { oyuncu, yonetici: oyuncu === SISTEM_OYUNCUSU };
  }
}

/**
 * Giriş belirteçleri (`node:crypto`): sihirli bağlantı jetonu, oturum çerezi ve ws bileti.
 *
 * - Rastgelelik `randomBytes(>= 32)`; depoda YALNIZ SHA-256 özetleri tutulur (açık belirteç ASLA); karşılaştırmalar `timingSafeEqual`.
 * - İmzalar HMAC-SHA256'dır; sırdan AMAÇ BAŞINA alt anahtar türetilir (bir amaçtaki imza başka amaçta geçmez). Sırlar listesinin ilki
 *   imzalar, hepsi doğrular: eski/yeni iki sırla kesintisiz rotasyon (KIMLIK.md §3).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** base64url dizgesi olarak `n` rastgele bayt. */
export function rastgele(n: number): string {
  return randomBytes(n).toString("base64url");
}

/** SHA-256 özeti (base64url, 43 karakter). */
export function ozet(metin: string): string {
  return createHash("sha256").update(metin).digest("base64url");
}

/** Sabit zamanlı eşitlik (uzunluk farkı hemen false; özetler sabit uzunluktadır). */
export function sabitEsit(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

export class Imzalayici {
  private readonly sirlar: readonly string[];

  constructor(sirlar: readonly string[]) {
    if (sirlar.length === 0 || sirlar.some((s) => s.length < 16)) throw new Error("imza sirlari en az bir tane ve her biri en az 16 karakter olmali");
    this.sirlar = sirlar;
  }

  private anahtar(sir: string, amac: string): Buffer {
    return createHmac("sha256", sir).update(`bolge-kimlik/v1/${amac}`).digest();
  }

  imzala(amac: string, veri: string): string {
    return createHmac("sha256", this.anahtar(this.sirlar[0] as string, amac)).update(veri).digest("base64url");
  }

  /** Sırların herhangi biriyle doğruysa true (sabit zamanlı; her sır denenir). */
  dogrula(amac: string, veri: string, imza: string): boolean {
    let ok = false;
    for (const sir of this.sirlar) {
      const beklenen = createHmac("sha256", this.anahtar(sir, amac)).update(veri).digest("base64url");
      if (sabitEsit(beklenen, imza)) ok = true;
    }
    return ok;
  }
}

// --- sihirli bağlantı jetonu: `bag1.<rastgele32>.<bitis>.<imza>` -----------------------------------------------------------------

export interface UretilenBaglanti {
  /** E-postadaki açık jeton (depoya YAZILMAZ). */
  jeton: string;
  /** Depoda saklanan SHA-256 özeti. */
  ozet: string;
}

export function baglantiJetonuUret(imz: Imzalayici, bitis: number): UretilenBaglanti {
  const govde = `bag1.${rastgele(32)}.${bitis}`;
  const jeton = `${govde}.${imz.imzala("baglanti", govde)}`;
  return { jeton, ozet: ozet(jeton) };
}

/** Biçim, imza ve süre geçerliyse jetonun özetini döndürür (veritabanına gitmeden elenir); aksi null. */
export function baglantiJetonuCoz(imz: Imzalayici, jeton: string, simdi: number): { ozet: string; bitis: number } | null {
  if (jeton.length > 300) return null;
  const p = jeton.split(".");
  if (p.length !== 4 || p[0] !== "bag1") return null;
  const [, rastgeleKisim, bitisMetni, imza] = p as [string, string, string, string];
  if (rastgeleKisim.length !== 43 || !BASE64URL.test(rastgeleKisim) || !/^\d{1,15}$/.test(bitisMetni) || !BASE64URL.test(imza)) return null;
  if (!imz.dogrula("baglanti", `bag1.${rastgeleKisim}.${bitisMetni}`, imza)) return null;
  const bitis = Number(bitisMetni);
  if (bitis <= simdi) return null;
  return { ozet: ozet(jeton), bitis };
}

// --- hesap silme onay jetonu: `sil1.<hesap>.<nonce>.<bitis>.<imza>` (durumsuz; AMAÇ "hesap-sil": giriş bağlantısı imzası burada geçmez) ------------------------

/** İmzalı, süreli silme onay jetonu. Durumsuzdur: tek kullanımlık oluşu hesabın silinmesindendir (silinen hesap bir daha bulunmaz). */
export function silmeJetonuUret(imz: Imzalayici, hesap: string, bitis: number): string {
  const govde = `sil1.${hesap}.${rastgele(8)}.${bitis}`;
  return `${govde}.${imz.imzala("hesap-sil", govde)}`;
}

/** Biçim, imza ve süre geçerliyse hesap kimliğini döndürür; aksi null. */
export function silmeJetonuCoz(imz: Imzalayici, jeton: string, simdi: number): { hesap: string; bitis: number } | null {
  if (jeton.length > 200) return null;
  const p = jeton.split(".");
  if (p.length !== 5 || p[0] !== "sil1") return null;
  const [, hesap, nonce, bitisMetni, imza] = p as [string, string, string, string, string];
  if (!BASE64URL.test(hesap) || hesap.length > 64 || !BASE64URL.test(nonce) || !/^\d{1,15}$/.test(bitisMetni) || !BASE64URL.test(imza)) return null;
  if (!imz.dogrula("hesap-sil", `sil1.${hesap}.${nonce}.${bitisMetni}`, imza)) return null;
  const bitis = Number(bitisMetni);
  if (bitis <= simdi) return null;
  return { hesap, bitis };
}

// --- oturum belirteci (çerez): `ot1.<id>.<gizli>` ---------------------------------------------------------------------------------

export interface UretilenOturum {
  belirtec: string;
  id: string;
  gizliOzet: string;
}

export function oturumBelirteciUret(): UretilenOturum {
  const id = rastgele(12);
  const gizli = rastgele(32);
  return { belirtec: `ot1.${id}.${gizli}`, id, gizliOzet: ozet(gizli) };
}

export function oturumBelirteciCoz(belirtec: string | undefined): { id: string; gizliOzet: string } | null {
  if (!belirtec || belirtec.length > 128) return null;
  const p = belirtec.split(".");
  if (p.length !== 3 || p[0] !== "ot1") return null;
  const [, id, gizli] = p as [string, string, string];
  if (id.length !== 16 || gizli.length !== 43 || !BASE64URL.test(id) || !BASE64URL.test(gizli)) return null;
  return { id, gizliOzet: ozet(gizli) };
}

// --- ws bileti: `bil1.<yük>.<imza>` -----------------------------------------------------------------------------------------------

export interface BiletIcerigi {
  hesap: string;
  oyuncu: string;
  /** Bileti üreten oturumun kimliği (oturum kapanınca bilet geçersiz olur). */
  oturum: string;
  /** Bitiş (epoch ms). */
  bitis: number;
  /** Tek kullanım kimliği. */
  jti: string;
}

export function biletUret(imz: Imzalayici, ic: Omit<BiletIcerigi, "jti">): { bilet: string; jti: string } {
  const jti = rastgele(16);
  const yuk = Buffer.from(JSON.stringify({ h: ic.hesap, o: ic.oyuncu, s: ic.oturum, e: ic.bitis, j: jti })).toString("base64url");
  return { bilet: `bil1.${yuk}.${imz.imzala("bilet", yuk)}`, jti };
}

/** İmza ve biçim geçerliyse içeriği döndürür (süre, tek kullanım ve iptal denetimi `AuthKimligi`'nindir); aksi null. */
export function biletCoz(imz: Imzalayici, bilet: string): BiletIcerigi | null {
  if (bilet.length > 1024) return null;
  const p = bilet.split(".");
  if (p.length !== 3 || p[0] !== "bil1") return null;
  const [, yuk, imza] = p as [string, string, string];
  if (!BASE64URL.test(yuk) || !BASE64URL.test(imza) || !imz.dogrula("bilet", yuk, imza)) return null;
  try {
    const o = JSON.parse(Buffer.from(yuk, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof o.h !== "string" || typeof o.o !== "string" || typeof o.s !== "string" || typeof o.j !== "string" || !Number.isSafeInteger(o.e)) return null;
    return { hesap: o.h, oyuncu: o.o, oturum: o.s, bitis: o.e as number, jti: o.j };
  } catch {
    return null;
  }
}

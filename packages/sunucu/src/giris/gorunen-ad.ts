/**
 * Görünen ad (İ-1): kural arayüzü ve OTOMATİK ad üreticisi. Hesap açılırken sunucu opak bir ad üretir (küçük harfli sıfat + isim + rakam, örn. "çalışkan
 * değirmenci 427"); ad e-postadan ya da oyuncu kimliğinden TÜRETİLMEZ (kişisel veri sızmaz). Oyuncu sonradan kendi adını seçer (`POST /giris/ad`).
 *
 * Sözdizimi ve küçük harfe çeviri TEK kaynaktan gelir: çekirdek `adKanonik` (`@bolge/cekirdek`, marka adıyla ortak kural; sabit Türkçe tablo). Sunucuda ayrı bir
 * tablo YOKTUR; kural bu modüle enjekte edilir (`AdKurali`).
 */
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";

/** `@bolge/cekirdek` `adKanonik` ile aynı imza. */
export type AdKurali = (ad: unknown) => { tamam: true; ad: string } | { tamam: false; hata: string };

export interface AdKelimeleri {
  sifatlar: readonly string[];
  isimler: readonly string[];
}

export const VARSAYILAN_AD_KELIMELERI = new URL("../../veri/gorunen-ad-kelimeleri.json", import.meta.url);
/** Rakam bölümü: 3 basamak (100-999). */
const RAKAM_ALT = 100;
const RAKAM_UST = 999;

/** Kelime dosyasını okur ve doğrular (hata: açılış durur). `kural` verilirse her sıfat/isim ve en uzun birleşim kuraldan geçer. */
export function adKelimeleriniYukle(yol: URL | string = VARSAYILAN_AD_KELIMELERI, kural?: AdKurali): AdKelimeleri {
  const ham = JSON.parse(readFileSync(yol, "utf8")) as { sifatlar?: unknown; isimler?: unknown };
  const dizge = (x: unknown): x is string[] => Array.isArray(x) && x.length > 0 && x.every((e) => typeof e === "string" && e !== "" && !/[\s\d]/.test(e));
  if (!dizge(ham.sifatlar) || !dizge(ham.isimler)) throw new Error("gorunen ad kelime listesi gecersiz: { sifatlar: string[], isimler: string[] } (bos olmayan, bosluksuz) bekleniyordu");
  const k: AdKelimeleri = { sifatlar: [...new Set(ham.sifatlar)], isimler: [...new Set(ham.isimler)] };
  if (kural) {
    for (const s of k.sifatlar) for (const i of k.isimler) {
      const aday = `${s} ${i} ${RAKAM_UST}`;
      const r = kural(aday);
      if (!r.tamam || r.ad !== aday) throw new Error(`gorunen ad kelime listesi ad kuralindan gecmiyor ("${s}" + "${i}"): ${r.tamam ? "kanonik degil (buyuk harf?)" : r.hata}`);
    }
  }
  return k;
}

export class AdUretici {
  constructor(
    private readonly kelimeler: AdKelimeleri,
    private readonly rastgele: (n: number) => number = (n) => randomInt(n),
  ) {}

  /** Olası ad sayısı (çakışma olasılığı için). */
  get havuz(): number {
    return this.kelimeler.sifatlar.length * this.kelimeler.isimler.length * (RAKAM_UST - RAKAM_ALT + 1);
  }

  /** Bir aday ad: "<sıfat> <isim> <rakam>". Benzersizlik çağıranındır (depoda aynı ad varsa yeniden denenir). */
  uret(): string {
    const s = this.kelimeler.sifatlar[this.rastgele(this.kelimeler.sifatlar.length)] as string;
    const i = this.kelimeler.isimler[this.rastgele(this.kelimeler.isimler.length)] as string;
    return `${s} ${i} ${RAKAM_ALT + this.rastgele(RAKAM_UST - RAKAM_ALT + 1)}`;
  }
}

/**
 * Çekirdek iletileri marka adı diliyle yazılmıştır ("marka adi ...", "marka adinda ..."); görünen ad ucunda "ad ..." olarak döner (sözdizimi kuralı AYNI,
 * yalnız özne değişir): "marka adi X" -> "ad X"; "marka adinda X" -> "ad icinde X".
 */
export function adIletisi(hata: string): string {
  return hata.replace(/^marka adinda /, "ad icinde ").replace(/^marka adi /, "ad ");
}

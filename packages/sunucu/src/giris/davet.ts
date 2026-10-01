/**
 * Davetli listesi (kayıt kapısı; Alfa-0, baş lider kararı): `--davetli-liste <dosya>` ile AÇILIR, varsayılan KAPALI.
 *
 * - Dosya: satır başına bir e-posta adresi; boş satırlar ve `#` ile başlayan satırlar (ya da boşluktan sonra gelen `#` açıklaması) yok sayılır.
 *   Adresler G5'in normalleştirmesinden geçer (`epostaCoz`: küçük harf, `+takma`, Gmail noktaları): listede `Ali.Veli+x@gmail.com` olanın `aliveli@gmail.com`
 *   ile girişi de geçer; bir adres, bir hesap kuralıyla aynı anahtar.
 * - Liste KİŞİSEL VERİDİR: sunucuda tutulur, DEPOYA GİRMEZ (örnek konum `raporlar/davetli.txt`; `raporlar/` git dışıdır). Günlüğe, metriğe, hata iletisine
 *   adres YAZILMAZ (yalnız adet ve satır numarası).
 * - Bozuk satır ya da okunamayan dosya AÇILIŞI DURDURUR (kapıyı sessizce açık bırakmak yerine). `yenile()` (SIGHUP) bozuk dosyada ESKİ listeyi korur ve hata verir.
 * - Dosya boş olabilir (kimse davetli değil).
 */
import { readFileSync } from "node:fs";
import { epostaCoz } from "./eposta";

/** Hizmetin gördüğü arayüz: adres anahtarı davetli mi? */
export interface Davetliler {
  uyeMi(anahtar: string): boolean;
}

/** Yanlış dosyayı (örn. bir veri dökümünü) listeyle karıştırmamak için üst sınır. */
export const DAVETLI_UST_SINIRI = 10_000;

/** Metni ayrıştırır: anahtar kümesi. Hata iletisi satır numarası içerir, adres içermez. */
export function davetliListesiAyristir(metin: string): Set<string> {
  const anahtarlar = new Set<string>();
  const satirlar = metin.replace(/^﻿/, "").split(/\r?\n/);
  for (let i = 0; i < satirlar.length; i++) {
    const ham = (satirlar[i] as string).replace(/(^|\s)#.*$/, "").trim();
    if (ham === "") continue;
    const e = epostaCoz(ham);
    if (!e) throw new Error(`davetli listesi satir ${i + 1} gecerli bir e-posta adresi degil`);
    anahtarlar.add(e.anahtar);
    if (anahtarlar.size > DAVETLI_UST_SINIRI) throw new Error(`davetli listesi ${DAVETLI_UST_SINIRI} adresi asiyor (yanlis dosya?)`);
  }
  return anahtarlar;
}

export class DavetliListesi implements Davetliler {
  private anahtarlar: ReadonlySet<string>;

  private constructor(
    private readonly yol: string,
    anahtarlar: ReadonlySet<string>,
  ) {
    this.anahtarlar = anahtarlar;
  }

  /** Dosyadan yükler; yok ya da bozuksa fırlatır (açılış durur). */
  static dosyadan(yol: string): DavetliListesi {
    return new DavetliListesi(yol, DavetliListesi.oku(yol));
  }

  /** Testler ve gömülü kullanım: bellekteki metinden. */
  static metinden(metin: string): DavetliListesi {
    return new DavetliListesi("", davetliListesiAyristir(metin));
  }

  private static oku(yol: string): Set<string> {
    let metin: string;
    try {
      metin = readFileSync(yol, "utf8");
    } catch (e) {
      throw new Error(`davetli listesi okunamadi (${(e as NodeJS.ErrnoException).code ?? "hata"}): ${yol}`);
    }
    return davetliListesiAyristir(metin);
  }

  get boyut(): number {
    return this.anahtarlar.size;
  }

  uyeMi(anahtar: string): boolean {
    return this.anahtarlar.has(anahtar);
  }

  /** Dosyayı yeniden okur (SIGHUP). Hata olursa ESKİ liste korunur ve fırlatılır. Yeni adet döner. */
  yenile(): number {
    if (this.yol === "") throw new Error("davetli listesi dosyadan yuklenmedi: yenilenemez");
    this.anahtarlar = DavetliListesi.oku(this.yol);
    return this.anahtarlar.size;
  }
}

/**
 * Posta gönderimi: TAKILABİLİR arayüz. Gerçek SMTP/SES bağdaştırıcısı sahip işidir (hesap, alan doğrulama, bölge): bu dosyada yalnız
 * arayüz ve geliştirme bağdaştırıcıları vardır; hiçbir sır ya da adres gömülü değildir.
 *
 * - `dosya`: her postayı dizine bir JSON dosyası olarak yazar (geliştirme ve ÜRETİM PROVASI; testler okur).
 * - `konsol`: postayı stdout'a yazar (YALNIZ geliştirme: bağlantı günlüğe düşer, `--uretim`'de reddedilir).
 * - `bellek`: testler için.
 */
import { randomBytes } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface Posta {
  kime: string;
  konu: string;
  /** Düz metin gövde (bağlantı içerir). */
  metin: string;
  /** Giriş bağlantısı (adaptörler şablon için ayrı alan olarak da kullanabilir). */
  baglanti: string;
}

export interface PostaGonderici {
  /** Gönderilemezse fırlatır. Başarılı dönüş "posta kuyruğa/alıcıya teslim edildi" demektir. */
  gonder(p: Posta): Promise<void>;
}

/** Dizine `<zaman>-<sayaç>-<rastgele>.json` yazar (geçici dosya + rename: yarım dosya okunmaz). */
export class DosyaPostaGondericisi implements PostaGonderici {
  private hazir: Promise<void> | null = null;
  private sayac = 0;

  constructor(
    private readonly dizin: string,
    private readonly simdi: () => number = () => Date.now(),
  ) {}

  async gonder(p: Posta): Promise<void> {
    this.hazir ??= mkdir(this.dizin, { recursive: true }).then(() => undefined);
    await this.hazir;
    // Ad sıralıdır: zaman, süreç içi sayaç (aynı ms'deki postalar gönderim sırasıyla), rastgele ek (süreçler arası çakışma olmasın).
    const ad = `${String(this.simdi()).padStart(15, "0")}-${String(++this.sayac).padStart(6, "0")}-${randomBytes(3).toString("hex")}.json`;
    const gecici = join(this.dizin, `${ad}.tmp`);
    await writeFile(gecici, JSON.stringify({ ...p, zaman: this.simdi() }, null, 2) + "\n");
    await rename(gecici, join(this.dizin, ad));
  }
}

/** stdout'a satır başına bir JSON (`{"olay":"posta",...}`). Üretimde kullanılmaz. */
export class KonsolPostaGondericisi implements PostaGonderici {
  constructor(private readonly yaz: (satir: string) => void = (s) => void process.stdout.write(s)) {}

  async gonder(p: Posta): Promise<void> {
    this.yaz(JSON.stringify({ olay: "posta", kime: p.kime, konu: p.konu, baglanti: p.baglanti }) + "\n");
  }
}

/** Testler: gönderilenleri tutar; `engel` verilirse gönderim o söz çözülene dek asılı kalır (asenkron kuyruğu sınamak için). */
export class BellekPostaGondericisi implements PostaGonderici {
  readonly gonderilenler: Posta[] = [];
  engel: Promise<void> | null = null;
  hataVer: Error | null = null;

  async gonder(p: Posta): Promise<void> {
    if (this.engel) await this.engel;
    if (this.hataVer) throw this.hataVer;
    this.gonderilenler.push({ ...p });
  }
}

/** Giriş postası (Türkçe düz metin). `tarayiciBagli` ise isteğin yapıldığı tarayıcıda açılması gerektiği söylenir. */
export function girisPostasi(kime: string, baglanti: string, gecerlilikDk: number, tarayiciBagli: boolean): Posta {
  const satirlar = [
    "Merhaba,",
    "",
    `Bölge Stratejisi'ne girmek için aşağıdaki bağlantıyı açın. Bağlantı ${gecerlilikDk} dakika geçerlidir ve yalnız bir kez kullanılabilir.`,
    ...(tarayiciBagli ? ["Bağlantıyı girişi istediğiniz tarayıcıda açın."] : []),
    "",
    baglanti,
    "",
    "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; hesabınızda hiçbir şey değişmez.",
  ];
  return { kime, konu: "Bölge Stratejisi giriş bağlantınız", metin: satirlar.join("\n") + "\n", baglanti };
}

/** Hesap silme onay postası (Türkçe düz metin): silme KALICIDIR; bağlantı onay sayfasına gider (silme orada düğmeyle yapılır). */
export function hesapSilmePostasi(kime: string, baglanti: string, gecerlilikDk: number): Posta {
  const satirlar = [
    "Merhaba,",
    "",
    `Bölge Stratejisi hesabınızı SİLMEK için bir istek yapıldı. Silmeyi onaylamak için aşağıdaki bağlantıyı açın ve sayfadaki düğmeye basın. Bağlantı ${gecerlilikDk} dakika geçerlidir.`,
    "",
    baglanti,
    "",
    "Silme kalıcıdır: e-posta adresiniz ve oturumlarınız silinir, oyundan çıkarılırsınız. Oyuncu kimliğiniz oyun kayıtlarında anonim kalır; mülkleriniz başkasına devredilmez ve geri alınamaz.",
    "Bu isteği siz yapmadıysanız bu e-postayı yok sayın; hesabınızda hiçbir şey değişmez.",
  ];
  return { kime, konu: "Bölge Stratejisi hesap silme onayı", metin: satirlar.join("\n") + "\n", baglanti };
}

/**
 * Dosya tabanlı depo (tek makine, geliştirme ve kill -9 testleri):
 *
 * - `gunluk.jsonl`: satır başına bir `GunlukKaydi`. Toplu ekleme TEK `write` + `fdatasync` ile yapılır; `ekle` ancak
 *   bundan sonra çözülür. Çökme yarım satır bırakabilir: açılışta sondaki tamamlanmamış satır (son "\n"den sonrası)
 *   kesilir. Ortadaki bozuk satır ya da seq boşluğu ise açılışı durdurur (sessizce veri atılmaz).
 * - `goruntu/<seq>-<simZamani>.goruntu`: ilk satır üst veri JSON'u, ikinci satır çekirdeğin anlık görüntü zarfı.
 *   Geçici dosyaya yazılır, fsync, `rename` (atomik), dizin fsync. Son `TUTULAN_GORUNTU` dosya saklanır.
 * - Göç yedeği: `yedekle(g, etiket)` görüntü dosyasını `<ad>.goruntu.<etiket>.yedek` olarak kopyalar (geçici dosya, fsync, `rename`,
 *   dizin fsync). `.goruntu` ile bitmediği için `sonuncu()`a girmez ve saklama sınırıyla silinmez. Geri dönüş: sunucuyu durdurup yedeği
 *   `<ad>.goruntu` üzerine kopyalayın (yeni kural sürümüyle komut kabul edilmediyse eski içerikle açılır).
 * - `profil.jsonl`: oyuncu çapaları ve özet kayıtları (satır başına `{o, c}` çapa güncellemesi ya da `{o, k: [...]}` kayıt ekleme).
 *   Bellekte tutulur; açılışta okunur (yarım son satır atılır), çok satır birikince atomik yeniden yazılır (sıkıştırma). `esitle`
 *   fdatasync yapar (anlık görüntüden önce). Kayıtlar günlükten yeniden türetilebildiği için satır başına fsync yoktur.
 * - `hesap.jsonl`: hesap, oturum ve giriş bağlantısı işlemleri (satır başına bir `HesapIslemi`; bkz. `DosyaHesapDeposu`). Her işlem fdatasync ile
 *   kalıcıdır (tüketilen bağlantı çökmeyle yeniden canlanmasın). Açık belirteç yazılmaz, yalnız SHA-256 özetleri.
 * - `oyun-oturum.jsonl`: oyun bağlantısı oturum olayları (İ2; yalnız zaman ve opak oyuncu kimliği; bkz. `DosyaOyunOturumDeposu`). Yalnız bayrak açıkken yazılır.
 * - `yazar.kilit`: tek yazar kilidi (içinde süreç kimliği). Kilit varsa ve sahibi yaşıyorsa açılış reddedilir; sahibi
 *   ölmüşse (kill -9 sonrası) kilit devralınır.
 */
import { copyFile, mkdir, open, readdir, readFile, rename, rm, stat, truncate, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { join } from "node:path";
import { BellekHesapDeposu, BellekOyunOturumDeposu, BellekProfilDeposu } from "./bellek";
import type { HesapIslemi, OyunOturumIslemi } from "./bellek";
import { seqSurekliligiDenetle } from "./tipler";
import type { AnlikGoruntuKaydi, Capa, Damga, Depo, GoruntuDeposu, GunlukDeposu, GunlukKaydi, OzetKaydi } from "./tipler";

const TUTULAN_GORUNTU = 3;
const GUNLUK_DOSYASI = "gunluk.jsonl";
const GORUNTU_DIZINI = "goruntu";
const KILIT_DOSYASI = "yazar.kilit";
const PROFIL_DOSYASI = "profil.jsonl";
const HESAP_DOSYASI = "hesap.jsonl";
const OTURUM_DOSYASI = "oyun-oturum.jsonl";

async function dizinFsync(dizin: string): Promise<void> {
  // Windows dizin tutamacında fsync'i desteklemez (EPERM); NTFS üst veriyi kendi günlüğüyle korur. Üretim Linux'tadır.
  if (process.platform === "win32") return;
  const h = await open(dizin, "r");
  try {
    await h.sync();
  } finally {
    await h.close();
  }
}

function surecYasiyorMu(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Tek yazar kilidi alır; kilit ölü bir sürece aitse devralır. */
export async function kilitAl(dizin: string): Promise<() => Promise<void>> {
  const yol = join(dizin, KILIT_DOSYASI);
  for (let deneme = 0; deneme < 2; deneme++) {
    try {
      await writeFile(yol, String(process.pid), { flag: "wx" });
      return async () => {
        await rm(yol, { force: true });
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      const pid = Number.parseInt(await readFile(yol, "utf8").catch(() => ""), 10);
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid && surecYasiyorMu(pid)) {
        throw new Error(`dunya dizini baska bir yazar tarafindan kilitli (pid ${pid}): ${dizin}`);
      }
      await rm(yol, { force: true });
    }
  }
  throw new Error(`yazar kilidi alinamadi: ${yol}`);
}

function kayitDogrula(ham: unknown, satir: number): GunlukKaydi {
  const k = ham as Partial<GunlukKaydi> | null;
  if (
    k === null ||
    typeof k !== "object" ||
    !Number.isSafeInteger(k.seq) ||
    !Number.isSafeInteger(k.t) ||
    typeof k.oyuncu !== "string" ||
    typeof k.komut !== "object" ||
    k.komut === null ||
    typeof k.istemci !== "string" ||
    typeof k.anahtar !== "string" ||
    typeof k.kuralSurumu !== "string" ||
    !Number.isSafeInteger(k.semaSurumu)
  ) {
    throw new Error(`gunluk satiri ${satir} gecersiz kayit`);
  }
  return k as GunlukKaydi;
}

/** Günlük metnini ayrıştırır: tamamlanmış satırlar + (varsa) kesilecek yarım kuyruğun başlangıç baytı. */
function gunlukAyristir(metin: string): { kayitlar: GunlukKaydi[]; gecerliBayt: number } {
  const sonSatirSonu = metin.lastIndexOf("\n");
  const tam = sonSatirSonu < 0 ? "" : metin.slice(0, sonSatirSonu);
  const kayitlar: GunlukKaydi[] = [];
  if (tam !== "") {
    const satirlar = tam.split("\n");
    for (let i = 0; i < satirlar.length; i++) {
      let ham: unknown;
      try {
        ham = JSON.parse(satirlar[i] as string);
      } catch {
        throw new Error(`gunluk satiri ${i + 1} bozuk JSON (orta satir bozulmasi; elle inceleme gerekir)`);
      }
      kayitlar.push(kayitDogrula(ham, i + 1));
    }
  }
  seqSurekliligiDenetle(0, kayitlar);
  return { kayitlar, gecerliBayt: Buffer.byteLength(tam, "utf8") + (sonSatirSonu < 0 ? 0 : 1) };
}

export class DosyaGunlukDeposu implements GunlukDeposu {
  private constructor(
    private readonly yol: string,
    private readonly tutamac: FileHandle,
    private sonSeq: number,
  ) {}

  static async ac(dizin: string): Promise<DosyaGunlukDeposu> {
    const yol = join(dizin, GUNLUK_DOSYASI);
    const metin = await readFile(yol, "utf8").catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return "";
      throw e;
    });
    const { kayitlar, gecerliBayt } = gunlukAyristir(metin);
    // Çökmeden kalan yarım satır: kes (onaylanmamıştı; istemci aynı anahtarla yeniden dener). Kesme yol üzerinden ve ekleme
    // tutamacı açılmadan yapılır: Windows'ta ekleme kipindeki tutamaç dosyayı kısaltamaz (EPERM).
    const kesildi = gecerliBayt < Buffer.byteLength(metin, "utf8");
    if (kesildi) await truncate(yol, gecerliBayt);
    const h = await open(yol, "a+");
    if (kesildi) await h.sync();
    await dizinFsync(dizin);
    return new DosyaGunlukDeposu(yol, h, kayitlar.at(-1)?.seq ?? 0);
  }

  async ekle(toplu: readonly GunlukKaydi[]): Promise<void> {
    if (toplu.length === 0) return;
    seqSurekliligiDenetle(this.sonSeq, toplu);
    const metin = toplu.map((k) => JSON.stringify(k)).join("\n") + "\n";
    await this.tutamac.write(metin);
    await this.tutamac.datasync();
    this.sonSeq = (toplu.at(-1) as GunlukKaydi).seq;
  }

  async oku(seqSonrasi: number, enCok?: number): Promise<GunlukKaydi[]> {
    const { kayitlar } = gunlukAyristir(await readFile(this.yol, "utf8"));
    const l = kayitlar.filter((k) => k.seq > seqSonrasi);
    return enCok === undefined ? l : l.slice(0, enCok);
  }

  async kapat(): Promise<void> {
    await this.tutamac.close();
  }
}

function goruntuAdi(seq: number, simZamani: number): string {
  return `${String(seq).padStart(12, "0")}-${String(simZamani).padStart(16, "0")}.goruntu`;
}

/** `goruntu/` dizinindeki en yeni geçerli görüntü (dosya adı sırasıyla: seq, sim zamanı); yoksa null. SALT OKUNUR (dosyaya yazmaz). */
async function dosyadanSonGoruntu(dizin: string): Promise<AnlikGoruntuKaydi | null> {
  const hepsi = (await readdir(dizin)).filter((x) => x.endsWith(".goruntu")).sort().reverse();
  for (const ad of hepsi) {
    const icerik = await readFile(join(dizin, ad), "utf8");
    const ayrac = icerik.indexOf("\n");
    if (ayrac < 0) continue;
    try {
      const ust = JSON.parse(icerik.slice(0, ayrac)) as Omit<AnlikGoruntuKaydi, "metin">;
      const metin = icerik.slice(ayrac + 1);
      if (!Number.isSafeInteger(ust.seq) || metin === "") continue;
      return { ...ust, metin };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * SALT OKUNUR dosya deposu (`--dok`, çevrimdışı oynatma): kilit ALMAZ, hiçbir dosyayı değiştirmez (yarım kuyruk kesilmez, geçici dosya silinmez); çalışan
 * bir sunucunun dizini de okunabilir (yarım son günlük satırı yok sayılır). Yazma yöntemleri yoktur.
 */
export async function dosyaSaltOkunur(dizin: string): Promise<{ gunluk: { oku(seqSonrasi: number, enCok?: number): Promise<GunlukKaydi[]> }; goruntu: { sonuncu(): Promise<AnlikGoruntuKaydi | null> } }> {
  const gunlukYolu = join(dizin, GUNLUK_DOSYASI);
  // Günlük bir kez okunur (anlık görüntü gibi: dökümün tutarlılığı için; parça parça okuma ikinci dereceden büyümesin).
  let onbellek: GunlukKaydi[] | null = null;
  return {
    gunluk: {
      async oku(seqSonrasi: number, enCok?: number): Promise<GunlukKaydi[]> {
        if (onbellek === null) {
          const metin = await readFile(gunlukYolu, "utf8").catch((e: NodeJS.ErrnoException) => {
            if (e.code === "ENOENT") return "";
            throw e;
          });
          onbellek = gunlukAyristir(metin).kayitlar;
        }
        const l = onbellek.filter((k) => k.seq > seqSonrasi);
        return enCok === undefined ? l : l.slice(0, enCok);
      },
    },
    goruntu: {
      async sonuncu(): Promise<AnlikGoruntuKaydi | null> {
        const d = join(dizin, GORUNTU_DIZINI);
        return (await stat(d).catch(() => null)) ? dosyadanSonGoruntu(d) : null;
      },
    },
  };
}

export class DosyaGoruntuDeposu implements GoruntuDeposu {
  private constructor(private readonly dizin: string) {}

  static async ac(dizin: string): Promise<DosyaGoruntuDeposu> {
    const d = join(dizin, GORUNTU_DIZINI);
    await mkdir(d, { recursive: true });
    // Yarım kalmış geçici dosyalar (rename öncesi çökme) atılır.
    for (const ad of await readdir(d)) if (ad.endsWith(".tmp")) await rm(join(d, ad), { force: true });
    return new DosyaGoruntuDeposu(d);
  }

  async kaydet(g: AnlikGoruntuKaydi): Promise<void> {
    const { metin, gzip: _gzip, ...ust } = g;
    const ad = goruntuAdi(g.seq, g.simZamani);
    const gecici = join(this.dizin, `${ad}.tmp`);
    const h = await open(gecici, "w");
    try {
      await h.write(JSON.stringify(ust) + "\n");
      await h.write(metin);
      await h.sync();
    } finally {
      await h.close();
    }
    await rename(gecici, join(this.dizin, ad));
    await dizinFsync(this.dizin);
    const hepsi = (await readdir(this.dizin)).filter((x) => x.endsWith(".goruntu")).sort();
    for (const eski of hepsi.slice(0, Math.max(0, hepsi.length - TUTULAN_GORUNTU))) await rm(join(this.dizin, eski), { force: true });
  }

  async yedekle(g: AnlikGoruntuKaydi, etiket: string): Promise<string> {
    const guvenli = etiket.replace(/[^A-Za-z0-9._-]/g, "_");
    const kaynak = join(this.dizin, goruntuAdi(g.seq, g.simZamani));
    const hedef = `${kaynak}.${guvenli}.yedek`;
    const gecici = `${hedef}.tmp`;
    await copyFile(kaynak, gecici); // kaynak yoksa fırlatır: yedek alınamadı
    const h = await open(gecici, "r+");
    try {
      await h.sync();
    } finally {
      await h.close();
    }
    await rename(gecici, hedef);
    await dizinFsync(this.dizin);
    return hedef;
  }

  async sonuncu(): Promise<AnlikGoruntuKaydi | null> {
    return dosyadanSonGoruntu(this.dizin);
  }

  async kapat(): Promise<void> {}
}

export class DosyaProfilDeposu extends BellekProfilDeposu {
  private satir = 0;

  private constructor(
    private readonly yol: string,
    private tutamac: FileHandle,
  ) {
    super();
  }

  static async ac(dizin: string): Promise<DosyaProfilDeposu> {
    const yol = join(dizin, PROFIL_DOSYASI);
    const metin = await readFile(yol, "utf8").catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return "";
      throw e;
    });
    const tutamac = await open(yol, "a+");
    const d = new DosyaProfilDeposu(yol, tutamac);
    const satirlar = metin.split("\n");
    // Son satır "\n" ile bitmediyse yarımdır: atılır (kayıtlar günlükten yeniden türetilir).
    for (const s of satirlar.slice(0, -1)) {
      if (s === "") continue;
      let o: { o: string; c?: Capa; k?: OzetKaydi[]; d?: Damga[] };
      try {
        o = JSON.parse(s);
      } catch {
        continue;
      }
      if (o.c) d.capaUygula(o.o, o.c);
      if (o.k) d.kayitUygula(o.o, o.k, Number.NEGATIVE_INFINITY);
      if (o.d) d.damgaUygula(o.o, o.d);
      d.satir++;
    }
    const gerekli = d.gerekliSatir();
    if (d.satir > 2 * gerekli + 100 || (metin !== "" && !metin.endsWith("\n"))) await d.sikistir();
    return d;
  }

  private async ekle(satir: object): Promise<void> {
    await this.tutamac.write(JSON.stringify(satir) + "\n");
    this.satir++;
    if (this.satir > 20_000 + 4 * this.gerekliSatir()) await this.sikistir();
  }

  gerekliSatir(): number {
    return this.capalar.size + [...this.kayitlar.values()].reduce((n, m) => n + m.size, 0) + [...this.damgalar.values()].reduce((n, m) => n + m.size, 0);
  }

  /** Bellekteki durumdan atomik yeniden yazım (geçici dosya, fsync, rename). */
  private async sikistir(): Promise<void> {
    const satirlar: string[] = [];
    for (const [o, c] of this.capalar) satirlar.push(JSON.stringify({ o, c }));
    for (const [o, m] of this.kayitlar) if (m.size > 0) satirlar.push(JSON.stringify({ o, k: [...m.values()] }));
    for (const [o, m] of this.damgalar) if (m.size > 0) satirlar.push(JSON.stringify({ o, d: [...m.values()] }));
    const gecici = `${this.yol}.tmp`;
    const h = await open(gecici, "w");
    try {
      await h.write(satirlar.map((s) => s + "\n").join(""));
      await h.sync();
    } finally {
      await h.close();
    }
    await this.tutamac.close();
    await rename(gecici, this.yol);
    this.tutamac = await open(this.yol, "a+");
    this.satir = satirlar.length;
  }

  override async capaYaz(oyuncu: string, kismi: Capa): Promise<void> {
    this.capaUygula(oyuncu, kismi);
    await this.ekle({ o: oyuncu, c: kismi });
  }

  override async kayitEkle(oyuncu: string, kayitlar: readonly OzetKaydi[], simdi: number): Promise<number> {
    const yeni = this.kayitUygula(oyuncu, kayitlar, simdi);
    if (yeni.length > 0) await this.ekle({ o: oyuncu, k: yeni });
    return yeni.length;
  }

  override async damgaEkle(oyuncu: string, damgalar: readonly Damga[]): Promise<number> {
    const yeni = this.damgaUygula(oyuncu, damgalar);
    if (yeni.length > 0) await this.ekle({ o: oyuncu, d: yeni });
    return yeni.length;
  }

  override async esitle(): Promise<void> {
    await this.tutamac.datasync();
  }

  private kapali = false;

  override async kapat(): Promise<void> {
    if (this.kapali) return;
    this.kapali = true;
    await this.tutamac.datasync();
    await this.tutamac.close();
  }
}

/**
 * Dosya tabanlı hesap deposu: bellekteki durum + satır başına bir işlem (`hesap.jsonl`). Her işlem tek `write` + `fdatasync` ile kalıcılaşır,
 * yanıt ondan sonra döner. Açılışta sondaki yarım satır atılır (onaylanmamıştı); ortadaki bozuk satır açılışı DURDURUR (sessizce
 * bağlantı/oturum atılmaz). Satır sayısı canlı durumun çok üstüne çıkınca atomik yeniden yazılır (sıkıştırma).
 */
export class DosyaHesapDeposu extends BellekHesapDeposu {
  private satir = 0;
  private zincir: Promise<void> = Promise.resolve();
  private kapali = false;

  private constructor(
    private readonly yol: string,
    private readonly dizin: string,
    private tutamac: FileHandle,
  ) {
    super();
  }

  static async ac(dizin: string): Promise<DosyaHesapDeposu> {
    const yol = join(dizin, HESAP_DOSYASI);
    const metin = await readFile(yol, "utf8").catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return "";
      throw e;
    });
    const yarim = metin !== "" && !metin.endsWith("\n");
    if (yarim) {
      // Yol üzerinden kes (Windows'ta ekleme kipindeki tutamaç dosyayı kısaltamaz): tamamlanmış satırlar korunur.
      await truncate(yol, Buffer.byteLength(metin.slice(0, metin.lastIndexOf("\n") + 1), "utf8"));
    }
    const tutamac = await open(yol, "a+");
    const d = new DosyaHesapDeposu(yol, dizin, tutamac);
    const satirlar = (yarim ? metin.slice(0, metin.lastIndexOf("\n") + 1) : metin).split("\n");
    for (let i = 0; i < satirlar.length; i++) {
      const s = satirlar[i] as string;
      if (s === "") continue;
      let islem: HesapIslemi;
      try {
        islem = JSON.parse(s) as HesapIslemi;
      } catch {
        await tutamac.close();
        throw new Error(`hesap dosyasi satiri ${i + 1} bozuk JSON (orta satir bozulmasi; elle inceleme gerekir)`);
      }
      d.uygula(islem);
      d.satir++;
    }
    if (d.satir > 2 * d.gerekliSatir() + 200) await d.sikistir();
    else await dizinFsync(dizin);
    return d;
  }

  private gerekliSatir(): number {
    return this.hesaplar.size + this.baglantilar.size + this.oturumlar.size;
  }

  protected override async yaz(islem: HesapIslemi): Promise<void> {
    const is = this.zincir.then(async () => {
      await this.tutamac.write(JSON.stringify(islem) + "\n");
      await this.tutamac.datasync();
      this.satir++;
      if (this.satir > 5_000 + 4 * this.gerekliSatir()) await this.sikistir();
    });
    this.zincir = is.catch(() => undefined);
    await is;
  }

  /** Bellekteki canlı durumdan atomik yeniden yazım (geçici dosya, fsync, rename). */
  private async sikistir(): Promise<void> {
    const islemler = this.durumIslemleri();
    const gecici = `${this.yol}.tmp`;
    const h = await open(gecici, "w");
    try {
      await h.write(islemler.map((i) => JSON.stringify(i) + "\n").join(""));
      await h.sync();
    } finally {
      await h.close();
    }
    await this.tutamac.close();
    await rename(gecici, this.yol);
    await dizinFsync(this.dizin);
    this.tutamac = await open(this.yol, "a+");
    this.satir = islemler.length;
  }

  override async esitle(): Promise<void> {
    await this.zincir;
    await this.tutamac.datasync();
  }

  override async kapat(): Promise<void> {
    if (this.kapali) return;
    this.kapali = true;
    await this.zincir;
    await this.tutamac.datasync();
    await this.tutamac.close();
  }
}

/**
 * Dosya tabanlı oyun oturumu deposu (`oyun-oturum.jsonl`): bellekteki durum + satır başına bir işlem. Oturum olayları denetim verisi değildir:
 * her işlem `write` ile eklenir, `datasync` YALNIZ `esitle`/`kapat`/toplulaştırmada yapılır (çökmede son birkaç saniye kaybolabilir; kabul).
 * Yarım son satır açılışta atılır, ortadaki bozuk satır açılışı durdurur. Çok satır birikince atomik yeniden yazılır.
 */
export class DosyaOyunOturumDeposu extends BellekOyunOturumDeposu {
  private satir = 0;
  private zincir: Promise<void> = Promise.resolve();
  private kapali = false;

  private constructor(
    private readonly yol: string,
    private readonly dizin: string,
    private tutamac: FileHandle,
  ) {
    super();
  }

  static async ac(dizin: string): Promise<DosyaOyunOturumDeposu> {
    const yol = join(dizin, OTURUM_DOSYASI);
    const metin = await readFile(yol, "utf8").catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return "";
      throw e;
    });
    const yarim = metin !== "" && !metin.endsWith("\n");
    const tam = yarim ? metin.slice(0, metin.lastIndexOf("\n") + 1) : metin;
    if (yarim) await truncate(yol, Buffer.byteLength(tam, "utf8"));
    const tutamac = await open(yol, "a+");
    const d = new DosyaOyunOturumDeposu(yol, dizin, tutamac);
    const satirlar = tam.split("\n");
    for (let i = 0; i < satirlar.length; i++) {
      const s = satirlar[i] as string;
      if (s === "") continue;
      let islem: OyunOturumIslemi;
      try {
        islem = JSON.parse(s) as OyunOturumIslemi;
      } catch {
        await tutamac.close();
        throw new Error(`oyun oturumu dosyasi satiri ${i + 1} bozuk JSON (orta satir bozulmasi; elle inceleme gerekir)`);
      }
      d.uygula(islem);
      d.satir++;
    }
    if (d.satir > 2 * (d.oturumlar.size + d.gunluk.size) + 1000) await d.sikistir();
    return d;
  }

  protected override async yaz(islem: OyunOturumIslemi): Promise<void> {
    const is = this.zincir.then(async () => {
      await this.tutamac.write(JSON.stringify(islem) + "\n");
      this.satir++;
      if (islem.o === "t" || islem.o === "s") await this.tutamac.datasync();
      if (this.satir > 20_000 + 4 * (this.oturumlar.size + this.gunluk.size)) await this.sikistir();
    });
    this.zincir = is.catch(() => undefined);
    await is;
  }

  private async sikistir(): Promise<void> {
    const satirlar = this.durumSatirlari();
    const gecici = `${this.yol}.tmp`;
    const h = await open(gecici, "w");
    try {
      await h.write(satirlar.map((x) => JSON.stringify(x) + "\n").join(""));
      await h.sync();
    } finally {
      await h.close();
    }
    await this.tutamac.close();
    await rename(gecici, this.yol);
    await dizinFsync(this.dizin);
    this.tutamac = await open(this.yol, "a+");
    this.satir = satirlar.length;
  }

  override async esitle(): Promise<void> {
    await this.zincir;
    await this.tutamac.datasync();
  }

  override async kapat(): Promise<void> {
    if (this.kapali) return;
    this.kapali = true;
    await this.zincir;
    await this.tutamac.datasync();
    await this.tutamac.close();
  }
}

/** Dizini hazırlar, tek yazar kilidini alır, günlüğü (yarım kuyruğu keserek) ve görüntü deposunu açar. */
export async function dosyaDeposu(dizin: string): Promise<Depo> {
  await mkdir(dizin, { recursive: true });
  const kilidiBirak = await kilitAl(dizin);
  try {
    const gunluk = await DosyaGunlukDeposu.ac(dizin);
    const goruntu = await DosyaGoruntuDeposu.ac(dizin);
    const profil = await DosyaProfilDeposu.ac(dizin);
    const hesap = await DosyaHesapDeposu.ac(dizin);
    const oyunOturumu = await DosyaOyunOturumDeposu.ac(dizin);
    return {
      gunluk: {
        ekle: (t) => gunluk.ekle(t),
        oku: (s) => gunluk.oku(s),
        kapat: async () => {
          await profil.kapat(); // idempotent: yazar zaten kapatmış olabilir
          await hesap.kapat();
          await oyunOturumu.kapat();
          await gunluk.kapat();
          await kilidiBirak();
        },
      },
      goruntu,
      profil,
      hesap,
      oyunOturumu,
      /** Günlük dosyasının ve `goruntu/` dizinindeki dosyaların bayt toplamı. */
      boyut: async () => {
        const gunlukBayt = (await stat(join(dizin, GUNLUK_DOSYASI)).catch(() => ({ size: 0 }))).size;
        let goruntuBayt = 0;
        for (const ad of await readdir(join(dizin, GORUNTU_DIZINI)).catch(() => [] as string[])) goruntuBayt += (await stat(join(dizin, GORUNTU_DIZINI, ad)).catch(() => ({ size: 0 }))).size;
        return { gunlukBayt, goruntuBayt };
      },
    };
  } catch (e) {
    await kilidiBirak();
    throw e;
  }
}

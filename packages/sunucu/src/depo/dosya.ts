/**
 * Dosya tabanlı depo (tek makine, geliştirme ve kill -9 testleri):
 *
 * - `gunluk.jsonl`: satır başına bir `GunlukKaydi`. Toplu ekleme TEK `write` + `fdatasync` ile yapılır; `ekle` ancak
 *   bundan sonra çözülür. Çökme yarım satır bırakabilir: açılışta sondaki tamamlanmamış satır (son "\n"den sonrası)
 *   kesilir. Ortadaki bozuk satır ya da seq boşluğu ise açılışı durdurur (sessizce veri atılmaz).
 * - `goruntu/<seq>-<simZamani>.goruntu`: ilk satır üst veri JSON'u, ikinci satır çekirdeğin anlık görüntü zarfı.
 *   Geçici dosyaya yazılır, fsync, `rename` (atomik), dizin fsync. Son `TUTULAN_GORUNTU` dosya saklanır.
 * - `yazar.kilit`: tek yazar kilidi (içinde süreç kimliği). Kilit varsa ve sahibi yaşıyorsa açılış reddedilir; sahibi
 *   ölmüşse (kill -9 sonrası) kilit devralınır.
 */
import { mkdir, open, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { join } from "node:path";
import { seqSurekliligiDenetle } from "./tipler";
import type { AnlikGoruntuKaydi, Depo, GoruntuDeposu, GunlukDeposu, GunlukKaydi } from "./tipler";

const TUTULAN_GORUNTU = 3;
const GUNLUK_DOSYASI = "gunluk.jsonl";
const GORUNTU_DIZINI = "goruntu";
const KILIT_DOSYASI = "yazar.kilit";

async function dizinFsync(dizin: string): Promise<void> {
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
async function kilitAl(dizin: string): Promise<() => Promise<void>> {
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
    const h = await open(yol, "a+");
    if (gecerliBayt < Buffer.byteLength(metin, "utf8")) {
      // Çökmeden kalan yarım satır: kes (onaylanmamıştı; istemci aynı anahtarla yeniden dener).
      await h.truncate(gecerliBayt);
      await h.sync();
    }
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

  async oku(seqSonrasi: number): Promise<GunlukKaydi[]> {
    const { kayitlar } = gunlukAyristir(await readFile(this.yol, "utf8"));
    return kayitlar.filter((k) => k.seq > seqSonrasi);
  }

  async kapat(): Promise<void> {
    await this.tutamac.close();
  }
}

function goruntuAdi(seq: number, simZamani: number): string {
  return `${String(seq).padStart(12, "0")}-${String(simZamani).padStart(16, "0")}.goruntu`;
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
    const { metin, ...ust } = g;
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

  async sonuncu(): Promise<AnlikGoruntuKaydi | null> {
    const hepsi = (await readdir(this.dizin)).filter((x) => x.endsWith(".goruntu")).sort().reverse();
    for (const ad of hepsi) {
      const icerik = await readFile(join(this.dizin, ad), "utf8");
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

  async kapat(): Promise<void> {}
}

/** Dizini hazırlar, tek yazar kilidini alır, günlüğü (yarım kuyruğu keserek) ve görüntü deposunu açar. */
export async function dosyaDeposu(dizin: string): Promise<Depo> {
  await mkdir(dizin, { recursive: true });
  const kilidiBirak = await kilitAl(dizin);
  try {
    const gunluk = await DosyaGunlukDeposu.ac(dizin);
    const goruntu = await DosyaGoruntuDeposu.ac(dizin);
    return {
      gunluk: {
        ekle: (t) => gunluk.ekle(t),
        oku: (s) => gunluk.oku(s),
        kapat: async () => {
          await gunluk.kapat();
          await kilidiBirak();
        },
      },
      goruntu,
    };
  } catch (e) {
    await kilidiBirak();
    throw e;
  }
}

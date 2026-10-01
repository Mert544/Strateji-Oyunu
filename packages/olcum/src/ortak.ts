/** Hipotez koşucularının ortak yardımcıları: tohum ayrıştırma, harita düzeni, özet birleştirme. */
import { SAAT, fnv1a64, kanonikSerilestir } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import type { ArketipAdi } from "@bolge/botlar";
import { gercekVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { HaritaDosyasi, VeriPaketi } from "@bolge/veri";
import type { HipotezSecenek, IklimModu } from "./tipler";

/**
 * Tohum dizgesini ayrıştırır: "1-10", "1,2,5", "1-3,7" ve bunların birleşimleri.
 * Sonuç artan, tekrarsız. Geçersiz girdide hata fırlatır.
 */
export function tohumAyristir(metin: string): number[] {
  const sonuc = new Set<number>();
  for (const parca of metin.split(",")) {
    const p = parca.trim();
    if (p === "") continue;
    const aralik = /^(\d+)\s*-\s*(\d+)$/.exec(p);
    if (aralik) {
      const a = Number(aralik[1]);
      const b = Number(aralik[2]);
      if (b < a) throw new Error(`gecersiz tohum araligi: ${p}`);
      if (b - a > 10_000) throw new Error(`tohum araligi cok genis: ${p}`);
      for (let i = a; i <= b; i++) sonuc.add(i);
    } else if (/^\d+$/.test(p)) {
      sonuc.add(Number(p));
    } else {
      throw new Error(`gecersiz tohum: ${p}`);
    }
  }
  if (sonuc.size === 0) throw new Error("tohum listesi bos");
  return [...sonuc].sort((x, y) => x - y);
}

/**
 * Dizge karşılaştırıcısı: eşitlikte 0 döner (kararlı, ICU/yerel ayar bağımsız; `localeCompare` kullanılmaz).
 * Çok anahtarlı sıralamada `a || b` zincirinde tie-break için güvenle kullanılır.
 */
export function karsilastir(x: string, y: string): number {
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Devlet kimliği -> harita sırasındaki bölge kimlikleri. */
export function devletBolgeleri(harita: HaritaDosyasi): Record<string, string[]> {
  const s: Record<string, string[]> = {};
  for (const d of harita.devletler) s[d.id] = [];
  for (const b of harita.bolgeler) (s[b.devlet] ??= []).push(b.id);
  return s;
}

/** Bölge kimliği -> komşu bölge kimlikleri (harita kenar sırasıyla, tekrarsız). */
export function komsuluk(harita: HaritaDosyasi): Record<string, string[]> {
  const s: Record<string, string[]> = {};
  for (const b of harita.bolgeler) s[b.id] = [];
  for (const k of harita.kenarlar) {
    (s[k.a] as string[]).push(k.b);
    (s[k.b] as string[]).push(k.a);
  }
  return s;
}

/**
 * `kume` bölgeleri içinde `baslangic`tan genişlik-öncelikli sıra (komşuluk sırasıyla).
 * Kümenin bağlantısız kalan bölgeleri sona, harita sırasıyla eklenir.
 */
export function bfsSirasi(harita: HaritaDosyasi, kume: readonly string[], baslangic: string): string[] {
  const komsu = komsuluk(harita);
  const icinde = new Set(kume);
  const gorulen = new Set<string>([baslangic]);
  const sira = [baslangic];
  for (let i = 0; i < sira.length; i++) {
    for (const n of komsu[sira[i] as string] ?? []) {
      if (icinde.has(n) && !gorulen.has(n)) {
        gorulen.add(n);
        sira.push(n);
      }
    }
  }
  for (const b of kume) if (!gorulen.has(b)) sira.push(b);
  return sira;
}

/** Devletin "başkent" bölgesi: kimliği "_kenti" ile biten, yoksa en kalabalık. */
export function baskent(harita: HaritaDosyasi, devlet: string): string {
  const bl = harita.bolgeler.filter((b) => b.devlet === devlet);
  const k = bl.find((b) => b.id.endsWith("_kenti"));
  if (k) return k.id;
  return [...bl].sort((x, y) => y.nufus - x.nufus || karsilastir(x.id, y.id))[0]?.id ?? "";
}

/** Sıralı durumOzeti listesinden tek bir iz (determinizm kanıtı). */
export function birlesikOzet(ozetler: readonly string[]): string {
  return fnv1a64(kanonikSerilestir([...ozetler]));
}

/** Sim'in durum özeti (kısa yol). */
export function ozet(sim: Simulasyon): string {
  return sim.durumOzeti();
}

/** Dörtlü standart bot dizilimi (devlet sırasıyla). */
export const DORT_BOT: readonly ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist"];

/** Saat -> ms. */
export function saat(n: number): number {
  return n * SAAT;
}

/** Shannon entropisi (bit) — olasılık yerine sayımlardan. */
export function shannon(sayimlar: readonly number[]): number {
  const toplam = sayimlar.reduce((t, x) => t + x, 0);
  if (toplam <= 0) return 0;
  let h = 0;
  for (const c of sayimlar) {
    if (c <= 0) continue;
    const p = c / toplam;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Ölçüm değerini yuvarlı, JSON güvenli sayıya çevirir. */
export function say(x: number, n = 4): number {
  if (!Number.isFinite(x)) return 0;
  const k = 10 ** n;
  return Math.round(x * k) / k;
}

/**
 * Devlet sırasını tohuma göre döndürür: tohum k için ilk devlet (k-1) mod n. Böylece farklı tohumlar farklı
 * devletleri "odak/ilk" yapar ve haritanın asimetrisi tohumlar arası değişkenlik sağlar (simülasyon tohumu yalnızca
 * savaş/rastgele akışlarını etkilediği için tek başına ekonomide çeşitlilik yaratmaz).
 * DİKKAT (karıştırıcı faktör): tohum = devlet sırası rotasyonu + savaş rastgeleliği. Tohumlar arası fark esas olarak
 * hangi devletin odak oyuncu olduğundan gelir; tohumlar bağımsız örnek değil, "koşul"dur (bkz. TOHUM_NOTU).
 */
export function devletSirasi(devletler: readonly string[], tohum: number): string[] {
  const n = devletler.length;
  if (n === 0) return [];
  const k = (((tohum - 1) % n) + n) % n;
  return [...devletler.slice(k), ...devletler.slice(0, k)];
}

/** Raporlarda her hipotez sonucunun altına yazılan tohum notu (tohumun ne olduğu ve ne olmadığı). */
export const TOHUM_NOTU =
  "Tohum = devlet sırası rotasyonu + savaş rastgeleliği. Simülasyon tohumu savaş dışında ekonomiyi değiştirmez; " +
  "tohumlar arası fark esas olarak hangi devletin odak/ilk oyuncu olduğundan (devlet sırası rotasyonu, bkz. devletSirasi) " +
  "gelir. Bu yüzden tohumlar bağımsız örnek değil, birer koşuldur (haritanın asimetrisi × devlet konumu); " +
  "\"koşul başarı oranı\" koşullar üzerinden sayım olup istatistiksel güven aralığı vermez.";

// ---------------------------------------------------------------------------
// Harita seçimi ve iklim takvimi (E3-G2, E4-G7; docs/08 §7 ölçüm notu)
// ---------------------------------------------------------------------------

/** Ölçümde "hızlı" iklim: sim zamanının 1 günü = 12 takvim günü (30 günlük koşu ≈ 1 yıl görür). */
export const OLCUM_GUN_CARPANI = 12;
const AY_GUNLERI: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const AY_ADLARI = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];

/** Ölçüm veri paketi: `veri` verilmişse o; yoksa `harita` ("sentetik" vars. | "gercek"). Her çağrıda yeni kopya. */
export function veriYukle(secenek: Pick<HipotezSecenek, "harita" | "veri">): VeriPaketi {
  if (secenek.veri !== undefined) return secenek.veri;
  return secenek.harita === "gercek" ? gercekVeriyiYukle() : varsayilanVeriyiYukle();
}

/** İklim takvimi ölçüm için etkin mi: seçenek verilmiş VE param'da hem `iklim` hem `tarim` (tarım açık) var. */
export function iklimEtkin(veri: VeriPaketi, mod: IklimModu | undefined): boolean {
  return mod !== undefined && veri.param.iklim !== undefined && veri.param.tarim !== undefined;
}

/**
 * Tohuma göre başlangıç günü (başlangıç AYI rotasyonu): param'daki başlangıç gününün ayından (tohum - 1) ay ilerisi,
 * ay içindeki gün sırası korunur (kısa aya sığmazsa ayın son günü). Tohum 1 param'ın başlangıç gününde kalır (vars. 273 =
 * 1 Ekim); 12 ardışık tohum yılın 12 ayını başlangıç ayı olarak tam bir kez kapsar. (docs/08 §7: "12 farklı başlangıç ayı".)
 */
export function iklimBaslangicGunu(temelGun: number, tohum: number, ayGunleri: readonly number[] = AY_GUNLERI): number {
  const baslar: number[] = [];
  let t = 0;
  for (const g of ayGunleri) {
    baslar.push(t);
    t += g;
  }
  const gun = (((temelGun % t) + t) % t) as number;
  let ay = baslar.length - 1;
  while ((baslar[ay] as number) > gun) ay--;
  const icGun = gun - (baslar[ay] as number);
  const yeniAy = (((ay + tohum - 1) % baslar.length) + baslar.length) % baslar.length;
  return (baslar[yeniAy] as number) + Math.min(icGun, (ayGunleri[yeniAy] as number) - 1);
}

/**
 * İklim seçeneğini param'a yansıtır (girdiyi değiştirmez; yalnız `param.iklim` yeni nesne, kalanı paylaşılır).
 * - `mod` undefined: param olduğu gibi (kütüphane çağrılarında geriye uyum; CLI vars. "hizli" verir).
 * - "hizli": gunCarpani = 12; "gercek": param'ın kendi gunCarpani'si (gerçek takvim = 1).
 * - İki modda da başlangıç ayı tohuma göre döner: tohum k -> (k-1) ay ileri (iklimBaslangicGunu).
 * - Tarım kapalıysa (param.iklim veya param.tarim yok) seçenek sessizce etkisizdir: aynı paket döner.
 */
export function iklimUygula(veri: VeriPaketi, mod: IklimModu | undefined, tohum: number): VeriPaketi {
  if (!iklimEtkin(veri, mod)) return veri;
  const ik = veri.param.iklim as NonNullable<VeriPaketi["param"]["iklim"]>;
  return {
    ...veri,
    param: {
      ...veri.param,
      iklim: { ...ik, baslangicGunu: iklimBaslangicGunu(ik.baslangicGunu, tohum, ik.ayGunleri), gunCarpani: mod === "hizli" ? OLCUM_GUN_CARPANI : ik.gunCarpani },
    },
  };
}

/** Takvim gününün (0 = 1 Ocak) ay adı (ayGunleri'ne göre). */
export function takvimAyAdi(gun: number, ayGunleri: readonly number[]): string {
  let kalan = gun;
  for (let m = 0; m < ayGunleri.length; m++) {
    if (kalan < (ayGunleri[m] as number)) return AY_ADLARI[m] ?? String(m + 1);
    kalan -= ayGunleri[m] as number;
  }
  return AY_ADLARI[AY_ADLARI.length - 1] as string;
}

/** Raporun "parametreler" bloğuna eklenen harita ve iklim özeti (her koşucu `...olcumBaglami(...)` ile ekler). */
export function olcumBaglami(secenek: Pick<HipotezSecenek, "harita" | "veri" | "iklim">, veri: VeriPaketi, tohumlar: readonly number[]): Record<string, unknown> {
  const etkin = iklimEtkin(veri, secenek.iklim);
  const ik = veri.param.iklim;
  return {
    harita: secenek.harita ?? (secenek.veri !== undefined ? "ozel" : "sentetik"),
    haritaAdi: veri.harita.ad,
    haritaBolgeSayisi: veri.harita.bolgeler.length,
    haritaDevletSayisi: veri.harita.devletler.length,
    iklim: {
      secenek: secenek.iklim ?? "param",
      etkin,
      gunCarpani: etkin ? (secenek.iklim === "hizli" ? OLCUM_GUN_CARPANI : (ik?.gunCarpani ?? 1)) : (ik?.gunCarpani ?? null),
      baslangicGunleri: etkin ? Object.fromEntries(tohumlar.map((t) => [t, iklimUygula(veri, secenek.iklim, t).param.iklim?.baslangicGunu ?? 0])) : null,
      baslangicAylari: etkin
        ? Object.fromEntries(tohumlar.map((t) => [t, takvimAyAdi(iklimUygula(veri, secenek.iklim, t).param.iklim?.baslangicGunu ?? 0, ik?.ayGunleri ?? [])]))
        : null,
      not: etkin ? undefined : secenek.iklim === undefined ? "iklim secenegi verilmedi (param dosyasi oldugu gibi)" : "tarim/iklim kapali: secenek etkisiz",
    },
  };
}

/** Haritadaki devlet kimlikleri (harita sırasıyla, bölgesi olanlar). Sentetik 4 devlet, gerçek harita 4 devlet; sayı sabit varsayılmaz. */
export function devletKimlikleri(harita: HaritaDosyasi): string[] {
  const dev = devletBolgeleri(harita);
  const sira = harita.devletler.map((d) => d.id).filter((d) => (dev[d] ?? []).length > 0);
  for (const d of Object.keys(dev)) if (!sira.includes(d) && (dev[d] ?? []).length > 0) sira.push(d);
  return sira;
}

/** i. devlete atanan arka plan botu: DORT_BOT döngüsel (4'ten fazla devlette baştan başlar). */
export function botArketibi(i: number): ArketipAdi {
  return DORT_BOT[i % DORT_BOT.length] as ArketipAdi;
}

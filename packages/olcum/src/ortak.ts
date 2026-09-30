/** Hipotez koşucularının ortak yardımcıları: tohum ayrıştırma, harita düzeni, özet birleştirme. */
import { SAAT, fnv1a64, kanonikSerilestir } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import type { ArketipAdi } from "@bolge/botlar";
import type { HaritaDosyasi } from "@bolge/veri";

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
  return [...bl].sort((x, y) => y.nufus - x.nufus || (x.id < y.id ? -1 : 1))[0]?.id ?? "";
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
 */
export function devletSirasi(devletler: readonly string[], tohum: number): string[] {
  const n = devletler.length;
  if (n === 0) return [];
  const k = (((tohum - 1) % n) + n) % n;
  return [...devletler.slice(k), ...devletler.slice(0, k)];
}

/**
 * H1 (parsel dünyası) — İlçeler gerçekten farklı (docs/11 §8.1; botlar: çiftçi, sanayici).
 *
 * İfade: hiçbir 6 yuvalık yapı portföyü, ilçe sınıflarının %70'inden fazlasında ilk 3'te değildir.
 *  - Portföy: toplam 6 yuva dolduran yapı çoklu kümesi (ör. Tarla 2 + Ahır 2 + Sulama 1 + Konut 1); anahtar = sıralı tür listesi.
 *  - İlçe sınıfı: `<arsa sınıfı>_<arazi>`; arazi = bölge etiketinden dag > kiyi > ova > diger önceliğiyle.
 *  - Skor: aynı ilçede aynı tohumla portföyün EKLENEN değeri (portföy − pasif referans; tamsayı, mili-₺), sınıf içinde
 *    karşılaştırılır. Sınıf başına skor = o sınıftaki örnek ilçelerin toplamı ya da medyanı (koşucu seçer, raporlar).
 *  - Sıra: yarışma sıralaması, `esikFark` toleranslı: sıra(p) = 1 + #{q : skor(q) > skor(p) + esikFark}. Eşitler sırayı paylaşır.
 *  - KARAR: en yaygın portföyün ilk-3 sınıf oranı > %70 -> kaldı. En az 2 sınıf yoksa belirsiz.
 *  - Bilgi: en iyi portföy dağılımının normalize entropisi; tüm sınıflarda ölçülen tek sabit portföyün en düşük
 *    ortalama pişmanlığı (sınıf başına (en iyi − skor) / |en iyi|).
 */
import type { ArsaSinifi, HaritaDosyasi, ParselFiksturu } from "@bolge/veri";
import type { Verdict } from "../tipler";
import { PPM, dizgeSirala, oranPpm } from "./ortak";

export const PARSEL_H1_ESIK_PPM = 700_000;
export const PARSEL_H1_PORTFOY_YUVA = 6;
export const PARSEL_H1_ILK_N = 3;
/** İlçe sınıfının arazi bileşeni (öncelik sırasıyla). */
export const PARSEL_H1_ARAZI_ONCELIGI: readonly string[] = ["dag", "kiyi", "ova"];

/** Portföy anahtarı: türler sıralı, "+" ile; toplam yuva tam 6 olmalı. */
export function portfoyAnahtari(yapilar: ReadonlyArray<{ tur: string; yuva: number }>): string {
  const toplam = yapilar.reduce((t, y) => t + y.yuva, 0);
  if (toplam !== PARSEL_H1_PORTFOY_YUVA) throw new Error(`portfoyAnahtari: toplam yuva ${toplam}, beklenen ${PARSEL_H1_PORTFOY_YUVA}`);
  return yapilar
    .map((y) => y.tur)
    .sort(dizgeSirala)
    .join("+");
}

/** İlçe sınıfı anahtarı: "<arsa sınıfı>_<arazi>", ör. "kirsal_ova", "sehir_kiyi". */
export function ilceSinifAnahtari(sinif: ArsaSinifi, etiketler: readonly string[]): string {
  const arazi = PARSEL_H1_ARAZI_ONCELIGI.find((e) => etiketler.includes(e)) ?? "diger";
  return `${sinif}_${arazi}`;
}

/** Fikstürdeki her ilçenin sınıf anahtarı (ilçe kimliği -> sınıf). */
export function ilceSiniflari(f: ParselFiksturu, harita: Pick<HaritaDosyasi, "bolgeler">): Record<string, string> {
  const etiket = new Map(harita.bolgeler.map((b) => [b.id, b.etiketler as readonly string[]]));
  const s: Record<string, string> = {};
  for (const c of f.ilceler) s[c.id] = ilceSinifAnahtari(c.sinif, etiket.get(c.bolge) ?? []);
  return s;
}

export interface PortfoySkoru {
  sinif: string;
  portfoy: string;
  /** Eklenen değer (tamsayı). */
  skor: number;
}

export interface PortfoyCesitliligiSonucu {
  verdict: Verdict;
  sinifSayisi: number;
  /** KARAR: ilk-3 sınıf oranı en yüksek portföy (eşitlikte anahtar sırası). */
  enYaygin: { portfoy: string; ilkUcSinif: number; oranPpm: number } | null;
  /** Portföy -> ilk 3'te olduğu sınıf sayısı. */
  ilkUcSayisi: Record<string, number>;
  /** Sınıf -> 1. sıradaki portföyler (eşitler dahil, sıralı). */
  enIyiler: Record<string, string[]>;
  /** Bilgi: en iyi portföy dağılımının normalize Shannon entropisi (log2(sınıf sayısı) ile), ppm. */
  entropiPpm: number;
  /** Bilgi: tüm sınıflarda ölçülmüş tek sabit portföyün en düşük ortalama pişmanlığı, ppm. */
  sabitPortfoyPismanligi: { portfoy: string; ortalamaPpm: number } | null;
}

/** Sınıf içi pişmanlık (ppm): (en iyi − skor) / |en iyi|; en iyi 0 ise skor eşitse 0, değilse %100. */
function pismanlikPpm(enIyi: number, skor: number): number {
  if (enIyi === skor) return 0;
  if (enIyi === 0) return PPM;
  return oranPpm(enIyi - skor, Math.abs(enIyi));
}

export function portfoyCesitliligi(skorlar: readonly PortfoySkoru[], secenek: { esikFark?: number } = {}): PortfoyCesitliligiSonucu {
  const esikFark = secenek.esikFark ?? 0;
  const siniflar = new Map<string, Map<string, number>>();
  for (const k of skorlar) {
    if (!Number.isSafeInteger(k.skor)) throw new Error(`portfoyCesitliligi: skor tamsayi olmali (${k.sinif}/${k.portfoy})`);
    const m = siniflar.get(k.sinif) ?? new Map<string, number>();
    if (m.has(k.portfoy)) throw new Error(`portfoyCesitliligi: yinelenen skor ${k.sinif}/${k.portfoy}`);
    m.set(k.portfoy, k.skor);
    siniflar.set(k.sinif, m);
  }
  const sinifAdlari = [...siniflar.keys()].sort(dizgeSirala);
  const ilkUcSayisi: Record<string, number> = {};
  const enIyiler: Record<string, string[]> = {};
  const enIyiSayaci = new Map<string, number>();
  for (const sinif of sinifAdlari) {
    const m = siniflar.get(sinif) as Map<string, number>;
    const degerler = [...m.values()];
    const enIyiler1: string[] = [];
    for (const p of [...m.keys()].sort(dizgeSirala)) {
      const s = m.get(p) as number;
      const sira = 1 + degerler.filter((q) => q > s + esikFark).length;
      ilkUcSayisi[p] ??= 0;
      if (sira <= PARSEL_H1_ILK_N) ilkUcSayisi[p] = (ilkUcSayisi[p] as number) + 1;
      if (sira === 1) enIyiler1.push(p);
    }
    enIyiler[sinif] = enIyiler1;
    for (const p of enIyiler1) enIyiSayaci.set(p, (enIyiSayaci.get(p) ?? 0) + 1);
  }

  let enYaygin: PortfoyCesitliligiSonucu["enYaygin"] = null;
  for (const p of Object.keys(ilkUcSayisi).sort(dizgeSirala)) {
    const n = ilkUcSayisi[p] as number;
    if (enYaygin === null || n > enYaygin.ilkUcSinif) enYaygin = { portfoy: p, ilkUcSinif: n, oranPpm: sinifAdlari.length === 0 ? 0 : oranPpm(n, sinifAdlari.length) };
  }

  // Entropi (bilgi): en iyi portföylerin sınıflar arası dağılımı; log2(sınıf sayısı) ile normalize.
  let entropiPpm = 0;
  if (sinifAdlari.length > 1) {
    const sayimlar = [...enIyiSayaci.values()];
    const toplam = sayimlar.reduce((t, x) => t + x, 0);
    let h = 0;
    for (const c of sayimlar) {
      const p = c / toplam;
      h -= p * Math.log2(p);
    }
    entropiPpm = Math.min(PPM, Math.round((h / Math.log2(sinifAdlari.length)) * PPM));
  }

  // Sabit portföy pişmanlığı (bilgi): yalnız her sınıfta skoru olan portföyler.
  let sabit: PortfoyCesitliligiSonucu["sabitPortfoyPismanligi"] = null;
  const ortakPortfoyler = Object.keys(ilkUcSayisi)
    .filter((p) => sinifAdlari.every((s) => (siniflar.get(s) as Map<string, number>).has(p)))
    .sort(dizgeSirala);
  for (const p of ortakPortfoyler) {
    let t = 0;
    for (const s of sinifAdlari) {
      const m = siniflar.get(s) as Map<string, number>;
      t += pismanlikPpm(Math.max(...m.values()), m.get(p) as number);
    }
    const ort = Math.floor(t / sinifAdlari.length);
    if (sabit === null || ort < sabit.ortalamaPpm) sabit = { portfoy: p, ortalamaPpm: ort };
  }

  const verdict: Verdict = sinifAdlari.length < 2 || enYaygin === null ? "belirsiz" : enYaygin.oranPpm > PARSEL_H1_ESIK_PPM ? "kaldi" : "gecti";
  return { verdict, sinifSayisi: sinifAdlari.length, enYaygin, ilkUcSayisi, enIyiler, entropiPpm, sabitPortfoyPismanligi: sabit };
}

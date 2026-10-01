/**
 * H2 (parsel dünyası) — Karar tekrarı düşük, yeni karar türleri gelmeye devam ediyor (docs/11 §8.1; tüm botlar).
 *
 * İki koşul:
 *  1. Tekrar: her oyuncu için 30. günde biten 10 günlük pencerede (21–30. günler) ardışık iki günün BASKIN karar türü
 *     aynı mı? Tekrar oranı = aynı olan (g−1, g) çiftleri / iki günde de kararı olan çiftler (kararsız gün içeren çiftler
 *     bölge kipi H2'deki "tükenme" gibi paydadan çıkar ve sayılır). KARAR: oyuncu tekrar oranlarının medyanı ≤ %60.
 *  2. Yenilik: 45. güne kadar her hafta (1–7, 8–14, …, 43–45) oyuncu en az 1 kez ilk kez görülen bir karar türü kullanır.
 *     KARAR: bu koşulu sağlayan oyuncu payı ≥ %50 (öneri eşik; docs/11 eşiği oyuncu başına ifade eder).
 *
 * Karar türü = komut türü + ayırt edici nesne (ör. "tesis_insa_hucre:tarla", "yontem:celikhane:ark_firini", "emir:sat:celik",
 * "parsel_al:kasaba"); miktar ve hedef hücre gibi parametreler türe girmez. Günler 1 tabanlıdır (1. gün = [0, 24 sa)).
 */
import type { Verdict } from "../tipler";
import { dizgeSirala, kosullardanVerdict, oranPpm, tamsayiMedyan } from "./ortak";

export const PARSEL_H2_TEKRAR_ESIK_PPM = 600_000;
export const PARSEL_H2_OLCUM_GUNU = 30;
export const PARSEL_H2_PENCERE_GUN = 10;
export const PARSEL_H2_YENI_TUR_SON_GUN = 45;
export const PARSEL_H2_HAFTA_GUN = 7;
/** Öneri: her hafta yeni tür koşulunu sağlaması gereken oyuncu payı (lider onayı bekliyor). */
export const PARSEL_H2_YENI_TUR_OYUNCU_PAYI_PPM = 500_000;

export interface KararKaydi {
  /** 1 tabanlı gün numarası. */
  gun: number;
  tur: string;
}

/** Gün -> baskın karar türü (en sık; eşitlikte anahtar sırasıyla ilk). */
export function gunlukBaskinTur(kararlar: readonly KararKaydi[]): Map<number, string> {
  const sayac = new Map<number, Map<string, number>>();
  for (const k of kararlar) {
    const m = sayac.get(k.gun) ?? new Map<string, number>();
    m.set(k.tur, (m.get(k.tur) ?? 0) + 1);
    sayac.set(k.gun, m);
  }
  const s = new Map<number, string>();
  for (const [gun, m] of sayac) {
    let en: [string, number] | null = null;
    for (const t of [...m.keys()].sort(dizgeSirala)) {
      const n = m.get(t) as number;
      if (en === null || n > en[1]) en = [t, n];
    }
    if (en !== null) s.set(gun, en[0]);
  }
  return s;
}

export interface KararTekrariSonucu {
  /** Tekrar oranı, ppm; ölçülebilir çift yoksa null. */
  tekrarPpm: number | null;
  ciftSayisi: number;
  /** Paydadan çıkarılan (en az bir günü kararsız) çift sayısı. */
  bosCift: number;
}

export function kararTekrari(kararlar: readonly KararKaydi[], secenek: { olcumGunu?: number; pencereGun?: number } = {}): KararTekrariSonucu {
  const son = secenek.olcumGunu ?? PARSEL_H2_OLCUM_GUNU;
  const pencere = secenek.pencereGun ?? PARSEL_H2_PENCERE_GUN;
  const baskin = gunlukBaskinTur(kararlar);
  let ayni = 0;
  let cift = 0;
  let bos = 0;
  for (let g = Math.max(2, son - pencere + 1); g <= son; g++) {
    const a = baskin.get(g - 1);
    const b = baskin.get(g);
    if (a === undefined || b === undefined) {
      bos++;
      continue;
    }
    cift++;
    if (a === b) ayni++;
  }
  return { tekrarPpm: cift === 0 ? null : oranPpm(ayni, cift), ciftSayisi: cift, bosCift: bos };
}

/** Haftalık yeni karar türü sayıları (hafta w = 7(w−1)+1 .. min(7w, sonGun)); ilk kez görülen türler sayılır. */
export function haftalikYeniTurler(kararlar: readonly KararKaydi[], sonGun: number = PARSEL_H2_YENI_TUR_SON_GUN): number[] {
  const ilk = new Map<string, number>();
  for (const k of kararlar) {
    const g = ilk.get(k.tur);
    if (g === undefined || k.gun < g) ilk.set(k.tur, k.gun);
  }
  const haftalar = new Array<number>(Math.ceil(sonGun / PARSEL_H2_HAFTA_GUN)).fill(0);
  for (const g of ilk.values()) {
    if (g < 1 || g > sonGun) continue;
    const w = Math.floor((g - 1) / PARSEL_H2_HAFTA_GUN);
    haftalar[w] = (haftalar[w] as number) + 1;
  }
  return haftalar;
}

export interface KararCesitliligiSonucu {
  verdict: Verdict;
  /** KARAR 1: oyuncu tekrar oranlarının medyanı, ppm (ölçülebilir oyuncu yoksa null). */
  medyanTekrarPpm: number | null;
  /** Bilgi: tekrar oranı %60'ı aşan oyuncu payı (ölçülebilirler içinde), ppm. */
  tekrarEsikAsanPpm: number;
  /** KARAR 2: 45. güne kadar her hafta yeni tür kullanan oyuncu payı, ppm. */
  herHaftaYeniPayiPpm: number;
  oyuncuBasina: Record<string, { tekrarPpm: number | null; haftalikYeni: number[] }>;
}

/** Oyuncu -> karar kayıtları. Oyuncular anahtar sırasıyla işlenir. */
export function kararCesitliligi(oyuncular: Readonly<Record<string, readonly KararKaydi[]>>): KararCesitliligiSonucu {
  const adlar = Object.keys(oyuncular).sort(dizgeSirala);
  const oyuncuBasina: KararCesitliligiSonucu["oyuncuBasina"] = {};
  const tekrarlar: number[] = [];
  let yeniTamam = 0;
  for (const o of adlar) {
    const k = oyuncular[o] as readonly KararKaydi[];
    const t = kararTekrari(k).tekrarPpm;
    const h = haftalikYeniTurler(k);
    oyuncuBasina[o] = { tekrarPpm: t, haftalikYeni: h };
    if (t !== null) tekrarlar.push(t);
    if (h.every((x) => x >= 1)) yeniTamam++;
  }
  const medyan = tamsayiMedyan(tekrarlar);
  const herHaftaYeniPayiPpm = adlar.length === 0 ? 0 : oranPpm(yeniTamam, adlar.length);
  const verdict = kosullardanVerdict([
    medyan === null ? null : medyan <= PARSEL_H2_TEKRAR_ESIK_PPM,
    adlar.length === 0 ? null : herHaftaYeniPayiPpm >= PARSEL_H2_YENI_TUR_OYUNCU_PAYI_PPM,
  ]);
  return {
    verdict,
    medyanTekrarPpm: medyan,
    tekrarEsikAsanPpm: tekrarlar.length === 0 ? 0 : oranPpm(tekrarlar.filter((x) => x > PARSEL_H2_TEKRAR_ESIK_PPM).length, tekrarlar.length),
    herHaftaYeniPayiPpm,
    oyuncuBasina,
  };
}

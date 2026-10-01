/**
 * Dükkân yükü ölçümü yardımcıları (Alfa-0 §6.9 komut-maliyeti şartı; `bench/dukkan-cozum-p95.ts`): lojistik çözüm süresinin dağılımı (p95) için dükkânlı ve dükkânsız aynı senaryo.
 *
 * Dükkân kurma komutu G7-3'tedir; ölçümde dükkân DURUM olarak doğrudan dünyaya yazılır (K3'ün `komut-maliyeti.ts` DUKKAN=1 kalıbı ve `cekirdek/test/perakende-yardimci.ts` ile aynı biçim) ve
 * çözüm kirletilir. Yalnız yazar; çekirdek kodu değişmez. Deterministiktir: oyuncu başına dükkân sayısı oyuncunun katılım sırasından türer (tek: 1, çift: 2; ortalama 1,5).
 */
import type { Simulasyon } from "@bolge/cekirdek";

/** En yakın sıra (nearest-rank) yüzdeliği: `sirali` artan sıralı; p ∈ (0, 100]. Boşta 0. */
export function yuzdelik(sirali: readonly number[], p: number): number {
  if (sirali.length === 0) return 0;
  const i = Math.min(sirali.length - 1, Math.max(0, Math.ceil((p / 100) * sirali.length) - 1));
  return sirali[i] as number;
}

/** Oyuncu başına dükkân sayısı (gerçekçi pay: 1 ya da 2): katılım sırası çift ise 2, tek ise 1 (ortalama 1,5). */
export function oyuncuDukkanSayisi(katilimSirasi: number): 1 | 2 {
  return katilimSirasi % 2 === 0 ? 2 : 1;
}

/** Çözüm süre örneklerinden özet (ms). */
export interface SureOzeti {
  n: number;
  ort: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

export function sureOzeti(ornekler: readonly number[]): SureOzeti {
  const s = [...ornekler].sort((a, b) => a - b);
  const top = s.reduce((a, x) => a + x, 0);
  return { n: s.length, ort: s.length === 0 ? 0 : top / s.length, p50: yuzdelik(s, 50), p95: yuzdelik(s, 95), p99: yuzdelik(s, 99), max: s.at(-1) ?? 0 };
}

export interface DukkanYukSecenegi {
  /** Raf malları (yuva sırasıyla; vars. gıda, ekmek, un, süt). Yuva sayısı perakende bloğunun ölçek 0 raf yuvası kadardır (fazlası kesilir, eksiği boş). */
  rafMallari?: readonly string[];
  /** true: dükkânın düğümünde raf mallarının stoğu bol (en az 1.000 birim) tutulur: çekim yolu tam çalışır (en kötü durum). Vars. true. */
  bolStok?: boolean;
  /** Dükkân türü (vars. "bakkal"). */
  tur?: string;
}

/**
 * Henüz hedef sayıda dükkânı olmayan her OYUNCUYA dükkân ekler (oyuncu sırası `dunya.mulk.oyuncular` sırasıdır; oyuncunun ilk işletme düğümüne) ve çözümü kirletir. Döner: eklenen dükkân sayısı. Aynı çağrı tekrarında yeni
 * katılanlara ekler; mevcut dükkânlar korunur.
 */
export function dukkanlariEkle(sim: Simulasyon, secenek: DukkanYukSecenegi = {}): number {
  const d = sim.dunya;
  const mk = sim.ic.mulk;
  const pk = mk?.perakende;
  if (d.mulk === undefined || mk === undefined || pk === undefined) throw new Error("dukkanlariEkle: mulk kipi ve mulk.perakende blogu gerekli");
  const tur = secenek.tur ?? "bakkal";
  const yuva = pk.p.olcekler[0].rafYuvasi;
  const mallar = secenek.rafMallari ?? ["gida", "ekmek", "un", "sut"];
  let eklenen = 0;
  const sira = new Map(d.mulk.oyuncular.map((o, i) => [o.id, i] as const));
  // Dükkân sayısı OYUNCU başınadır (bir oyuncunun birden çok işletme düğümü olabilir): hedef oyuncunun tüm düğümlerindeki toplamdır; yeni dükkân oyuncunun ilk düğümüne eklenir.
  const dugumleri = new Map<string, number[]>();
  for (const isl of d.mulk.isletmeler) dugumleri.set(isl.oyuncu, [...(dugumleri.get(isl.oyuncu) ?? []), isl.bolgeIndeksi]);
  for (const [oyuncu, indeksler] of dugumleri) {
    const dugum = d.bolgeler[indeksler[0] as number];
    if (dugum === undefined) continue;
    const hucreler = d.mulk.hucreler.filter((h) => h.sahip === oyuncu);
    if (hucreler.length === 0) continue;
    const hedef = oyuncuDukkanSayisi(sira.get(oyuncu) ?? 0);
    const mevcut = indeksler.reduce((t, i) => t + (d.bolgeler[i]?.ekYapilar ?? []).filter((e) => e.dukkan !== undefined).length, 0);
    for (let j = mevcut; j < hedef; j++) {
      const raf = Array.from({ length: yuva }, (_, i) => {
        const mal = mallar[i];
        return mal === undefined ? { fiyat: pk.p.varsayilanFiyatKademesi } : { mal, fiyat: pk.p.varsayilanFiyatKademesi };
      });
      let id = 9_000_000;
      for (const b of d.bolgeler) for (const e of b.ekYapilar ?? []) if (e.id >= id) id = e.id + 1;
      (dugum.ekYapilar ??= []).push({ id, tur: "dukkan", hucreler: [(hucreler[j % hucreler.length] as { id: string }).id], dukkan: { tur, olcek: 0, raf, baslangic: d.zaman, kurulus: d.zaman } });
      eklenen++;
    }
    if (secenek.bolStok !== false) {
      for (const m of mallar) {
        const mi = sim.ic.malIndeks[m];
        const st = mi === undefined ? undefined : dugum.stoklar[mi];
        if (st !== undefined) st.miktar = Math.max(st.miktar, 1_000_000);
      }
    }
  }
  if (eklenen > 0 || secenek.bolStok !== false) sim.baglam.kirlet(d);
  return eklenen;
}

/** Dünyadaki dükkân sayısı. */
export function dukkanSayisi(sim: Simulasyon): number {
  let n = 0;
  for (const b of sim.dunya.bolgeler) for (const e of b.ekYapilar ?? []) if (e.dukkan !== undefined) n++;
  return n;
}

/**
 * Ölçüm metrikleri. Hepsi salt okunurdur (sim durumunu değiştirmez) ve YALNIZCA çekirdeğin genel API'sini kullanır.
 *
 * Birim: "para" = mili-para / MILI. Üretim değeri SABİT taban fiyatla hesaplanır (fiyat gürültüsünü dışlar).
 */
import { MILI, PPM, SAAT, anlikHazine, anlikMiktar } from "@bolge/cekirdek";
import type { BolgeDurumu, OyuncuId, Simulasyon } from "@bolge/cekirdek";

/** Bölge seçicisi: bölge indeksi veya kimliği. Verilmezse tüm bölgeler. */
export type BolgeSecici = readonly (number | string)[] | undefined;

function indeksler(sim: Simulasyon, bolgeler: BolgeSecici): number[] {
  if (bolgeler === undefined) return sim.dunya.bolgeler.map((b) => b.indeks);
  return bolgeler.map((b) => {
    const i = typeof b === "number" ? b : sim.ic.bolgeIndeks[b];
    if (i === undefined || sim.dunya.bolgeler[i] === undefined) throw new Error(`metrik: bilinmeyen bolge: ${String(b)}`);
    return i;
  });
}

/** Oyuncunun sahip olduğu bölge indeksleri (artan). */
export function oyuncuBolgeleri(sim: Simulasyon, oyuncu: OyuncuId): number[] {
  return sim.dunya.bolgeler.filter((b) => b.sahip === oyuncu).map((b) => b.indeks);
}

/**
 * Bölgenin CANLI kümülatif üretimi (mili-birim, mal indeksine göre): uretimToplam çözümde güncellenir,
 * son çözümden bu yana geçen süre için uretimOrani × (t − uretimT0) ile anlık tamamlanır (yerinde değiştirmez).
 */
export function canliUretimToplami(sim: Simulasyon, b: BolgeDurumu): number[] {
  const t = sim.dunya.zaman;
  const dt = t - b.uretimT0;
  return b.uretimToplam.map((q, m) => {
    const oran = b.uretimOrani[m] as number;
    return dt > 0 && oran !== 0 ? q + Math.floor((oran * dt) / SAAT) : q;
  });
}

/** Bölge başına üretim değeri (para): Σ canlı üretim × taban fiyat / MILI. */
export function bolgeUretimDegeri(sim: Simulasyon, bolge: number | string): number {
  const [i] = indeksler(sim, [bolge]);
  const b = sim.dunya.bolgeler[i as number] as BolgeDurumu;
  const q = canliUretimToplami(sim, b);
  let t = 0;
  for (let m = 0; m < q.length; m++) t += ((q[m] as number) / MILI) * ((sim.ic.mallar[m]?.tabanFiyat ?? 0) / MILI);
  return t;
}

/** Bölgeler kümesinin üretim değeri (para) = Σ uretimToplam[m] × taban fiyat / MILI (sabit taban fiyat). */
export function uretimDegeri(sim: Simulasyon, bolgeler?: BolgeSecici): number {
  let t = 0;
  for (const i of indeksler(sim, bolgeler)) t += bolgeUretimDegeri(sim, i);
  return t;
}

/** Bölgeler kümesinin anlık stok değeri (para, taban fiyat). */
export function stokDegeri(sim: Simulasyon, bolgeler?: BolgeSecici): number {
  let t = 0;
  const z = sim.dunya.zaman;
  for (const i of indeksler(sim, bolgeler)) {
    const b = sim.dunya.bolgeler[i] as BolgeDurumu;
    for (let m = 0; m < b.stoklar.length; m++) {
      t += (anlikMiktar(b.stoklar[m]!, z) / MILI) * ((sim.ic.mallar[m]?.tabanFiyat ?? 0) / MILI);
    }
  }
  return t;
}

/** Oyuncunun hazinesi (para). */
export function hazinePara(sim: Simulasyon, oyuncu: OyuncuId): number {
  return anlikHazine(sim.dunya, oyuncu) / MILI;
}

/** Mal kimliği -> fiyat / taban fiyat oranı. */
export function fiyatOrani(sim: Simulasyon): Record<string, number> {
  const s: Record<string, number> = {};
  sim.ic.mallar.forEach((m, i) => {
    s[m.id] = (sim.dunya.pazar.fiyat[i] as number) / m.tabanFiyat;
  });
  return s;
}

/** Mal kimliği -> mutlak fiyat (para/birim). */
export function fiyatlar(sim: Simulasyon): Record<string, number> {
  const s: Record<string, number> = {};
  sim.ic.mallar.forEach((m, i) => {
    s[m.id] = (sim.dunya.pazar.fiyat[i] as number) / MILI;
  });
  return s;
}

export interface KapsamOzeti {
  /** Mal kimliği -> ortalama karşılanma [0,1] (sahipli bölgeler, verilen oyuncular). */
  ortalama: Record<string, number>;
  /** Mal kimliği -> karşılanması %95'in altında olan hücre oranı [0,1]. */
  acikOran: Record<string, number>;
  /** Malların ortalaması. */
  genelOrtalama: number;
  /** Açıklık nedeni -> hücre sayısı (yalnızca karşılanma < %95). */
  nedenler: Record<string, number>;
  hucreSayisi: number;
}

/** Kapsam özeti: sahipli (ve `oyuncular` verilmişse yalnızca onların) bölgelerdeki karşılanma ortalamaları. */
export function kapsamOzeti(sim: Simulasyon, oyuncular?: readonly OyuncuId[]): KapsamOzeti {
  const d = sim.dunya;
  const nm = sim.ic.mallar.length;
  const topla = new Array<number>(nm).fill(0);
  const acik = new Array<number>(nm).fill(0);
  const nedenler: Record<string, number> = {};
  let n = 0;
  for (const b of d.bolgeler) {
    if (b.sahip === null) continue;
    if (oyuncular && !oyuncular.includes(b.sahip)) continue;
    n++;
    const satir = d.lojistik.kapsam[b.indeks] ?? [];
    for (let m = 0; m < nm; m++) {
      const h = satir[m];
      const k = h ? h.karsilanmaPpm / PPM : 1;
      topla[m] = (topla[m] as number) + k;
      if (h && k < 0.95) {
        acik[m] = (acik[m] as number) + 1;
        nedenler[h.neden] = (nedenler[h.neden] ?? 0) + 1;
      }
    }
  }
  const ortalama: Record<string, number> = {};
  const acikOran: Record<string, number> = {};
  let toplam = 0;
  sim.ic.mallar.forEach((mal, m) => {
    const o = n > 0 ? (topla[m] as number) / n : 1;
    ortalama[mal.id] = o;
    acikOran[mal.id] = n > 0 ? (acik[m] as number) / n : 0;
    toplam += o;
  });
  return { ortalama, acikOran, genelOrtalama: nm > 0 ? toplam / nm : 1, nedenler, hucreSayisi: n * nm };
}

/** Dizinin ortancası (boşsa 0). */
export function medyan(a: readonly number[]): number {
  if (a.length === 0) return 0;
  const s = [...a].sort((x, y) => x - y);
  const o = s.length >> 1;
  return s.length % 2 === 1 ? (s[o] as number) : ((s[o - 1] as number) + (s[o] as number)) / 2;
}

export function ortalama(a: readonly number[]): number {
  return a.length === 0 ? 0 : a.reduce((t, x) => t + x, 0) / a.length;
}

/** Yuvarlama (raporlama): n ondalık basamak. */
export function yuvarla(x: number, n = 3): number {
  const k = 10 ** n;
  return Math.round(x * k) / k;
}

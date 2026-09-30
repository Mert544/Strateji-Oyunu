/**
 * Ekonomi ve lojistik çözüm testleri için ortak yardımcılar (gerçek Simulasyon, gerçek içerik).
 */
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { anlikHazine, anlikMiktar } from "../src/stok";
import { SAAT } from "../src/tipler";
import type { BolgeDurumu, Komut, KomutSonucu, OyuncuId } from "../src/tipler";

export interface KurulumSecenegi {
  /** oyuncu kimliği -> bölge kimlikleri. Varsayılan: a = 5 bölge (zincir tam), b = m_col. */
  oyuncular?: Record<OyuncuId, string[]>;
  /** Paket üzerinde değişiklik (her çağrıda taze kopya gelir). */
  duzenle?: (veri: VeriPaketi) => void;
  tohum?: number;
}

export const VARSAYILAN_OYUNCULAR: Record<OyuncuId, string[]> = {
  a: ["m_ova", "m_liman", "m_gecit", "m_dag", "m_sehir"],
  b: ["m_col"],
};

/** Mini haritada iki oyuncu katılmış bir simülasyon döndürür. */
export function kur(sec: KurulumSecenegi = {}): { s: Simulasyon; veri: VeriPaketi } {
  const veri = miniVeriyiYukle();
  sec.duzenle?.(veri);
  const s = Simulasyon.olustur(veri, sec.tohum ?? 1);
  const oyuncular = sec.oyuncular ?? VARSAYILAN_OYUNCULAR;
  for (const id of Object.keys(oyuncular)) {
    const r = s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: id, bolgeler: oyuncular[id] as string[] } });
    if (!r.tamam) throw new Error(`oyuncu_katil basarisiz: ${r.hata}`);
  }
  return { s, veri };
}

/** Komutu şimdiki simülasyon zamanında uygular. */
export function ver(s: Simulasyon, oyuncu: OyuncuId, komut: Komut): KomutSonucu {
  return s.uygula({ t: s.dunya.zaman, oyuncu, komut });
}

/** Komut başarılı olmak zorundadır. */
export function verTamam(s: Simulasyon, oyuncu: OyuncuId, komut: Komut): void {
  const r = ver(s, oyuncu, komut);
  if (!r.tamam) throw new Error(`komut basarisiz (${komut.tur}): ${r.hata}`);
}

/** Şimdiye kadar kuyruktaki tüm "şimdi" olayları (örn. aynı t'deki çözüm) işlenir. */
export function simdiyiIsle(s: Simulasyon): void {
  s.calistirKadar(s.dunya.zaman);
}

export function saatKos(s: Simulasyon, saat: number): void {
  s.calistirKadar(s.dunya.zaman + saat * SAAT);
}

export function malNo(s: Simulasyon, id: string): number {
  const i = s.ic.malIndeks[id];
  if (i === undefined) throw new Error(`bilinmeyen mal: ${id}`);
  return i;
}

export function bolge(s: Simulasyon, id: string): BolgeDurumu {
  const i = s.ic.bolgeIndeks[id];
  if (i === undefined) throw new Error(`bilinmeyen bolge: ${id}`);
  return s.dunya.bolgeler[i] as BolgeDurumu;
}

/** Bölgenin d.zaman'daki anlık stoku (mili-birim). */
export function stok(s: Simulasyon, bolgeId: string, malId: string): number {
  return anlikMiktar(bolge(s, bolgeId).stoklar[malNo(s, malId)]!, s.dunya.zaman);
}

export function hazine(s: Simulasyon, oyuncu: OyuncuId): number {
  return anlikHazine(s.dunya, oyuncu);
}

/** Hiçbir bölge stoğu negatif mi (anlık)? Negatif stok bulunan ilk (bölge, mal) açıklamasını döndürür. */
export function negatifStok(s: Simulasyon): string | null {
  for (const b of s.dunya.bolgeler) {
    for (let m = 0; m < b.stoklar.length; m++) {
      const st = b.stoklar[m]!;
      if (st.miktar < 0 || anlikMiktar(st, s.dunya.zaman) < 0) return `${b.id}/${s.ic.mallar[m]!.id}`;
    }
  }
  return null;
}

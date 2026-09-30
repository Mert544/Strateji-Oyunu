/**
 * Bölge stoğu + hazine maliyeti ortak yardımcıları (tesis inşası ve kenar geliştirme).
 * Hepsi ya da hiçbiri: yeterlilik önce denetlenir, sonra düşülür; hata durumunda hiçbir şey değişmez.
 */
import { anlikHazine, anlikMiktar, hazineEkle, stokEkle } from "../stok";
import type { Baglam, BolgeDurumu, Dunya, OyuncuId, Stok } from "../tipler";
import type { MalMiktar } from "./tablo";

/** Bölge stoğunda (anlık) ve hazinede maliyet var mı? Yoksa hata iletisi, varsa null. */
export function maliyetYeterliMi(d: Dunya, bolge: number, oyuncu: OyuncuId, mal: MalMiktar, para: number): string | null {
  const b = d.bolgeler[bolge] as BolgeDurumu;
  for (const [m, q] of mal) {
    const s = b.stoklar[m] as Stok;
    if (anlikMiktar(s, d.zaman) < q) return `yetersiz stok: ${b.id} (mal indeksi ${m})`;
  }
  if (anlikHazine(d, oyuncu) < para) return "yetersiz hazine";
  return null;
}

/** Maliyeti düşer. Önce maliyetYeterliMi ile denetlenmiş olmalı; hazine düşümü başarısız olursa geri alır. */
export function maliyetiDus(d: Dunya, ctx: Baglam, bolge: number, oyuncu: OyuncuId, mal: MalMiktar, para: number): boolean {
  if (!hazineEkle(d, oyuncu, -para)) return false;
  for (const [m, q] of mal) stokEkle(d, ctx, bolge, m, -q);
  return true;
}

/**
 * Mülk durumu (S3, docs/11 §4.3): kurulum ve deterministik sıralı aramalar.
 *
 * Tüm listeler düz dizidir (Map/Set yok) ve JS dize sırasına göre tutulur; arama ikili aramadır:
 * - `hucreler`: hücre kimliği, `ilceler`: ilçe kimliği, `oyuncular`: oyuncu kimliği, `isletmeler`: (oyuncu, il).
 * İşletme düğümünün bölge kimliği `<il>#<oyuncu>`'dur (il kimlikleri "#" içermez).
 */
import type { DerlenmisMulk, Dunya, HucreDurumu, IlceDurumu, IsletmeDugumu, MulkDurumu, MulkOyuncuDurumu, Ms, OyuncuId } from "../tipler";

/** Fikstürün tüm ilçeleriyle (kimliğe göre sıralı, satılmış 0) boş mülk durumu. */
export function mulkDurumuKur(m: DerlenmisMulk): MulkDurumu {
  const ilceler: IlceDurumu[] = [...m.fikstur.ilceler]
    .sort((a, b) => dizgeKarsilastir(a.id, b.id))
    .map((c) => ({ id: c.id, il: c.il, seviye: c.seviye, uygunHucre: c.uygunHucre, satilmisHucre: 0 }));
  return { hucreler: [], ilceler, isletmeler: [], oyuncular: [] };
}

/** JS dize sırası (oyuncuBul ile tutarlı). */
export function dizgeKarsilastir(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Kimliğe göre sıralı dizide ikili arama: bulunursa konum, bulunmazsa -(ekleme konumu + 1). */
export function sirali<T>(dizi: readonly T[], anahtar: (x: T) => string, aranan: string): number {
  let lo = 0;
  let hi = dizi.length - 1;
  while (lo <= hi) {
    const orta = (lo + hi) >> 1;
    const k = anahtar(dizi[orta] as T);
    if (k === aranan) return orta;
    if (k < aranan) lo = orta + 1;
    else hi = orta - 1;
  }
  return -(lo + 1);
}

const hucreAnahtari = (h: HucreDurumu): string => h.id;
const idAnahtari = (x: { id: string }): string => x.id;

export function hucreBul(d: Dunya, id: string): HucreDurumu | undefined {
  const m = d.mulk;
  if (m === undefined) return undefined;
  const i = sirali(m.hucreler, hucreAnahtari, id);
  return i >= 0 ? m.hucreler[i] : undefined;
}

/** Hücreyi sıralı konumuna ekler (kimlik yoksa). */
export function hucreEkle(m: MulkDurumu, h: HucreDurumu): void {
  const i = sirali(m.hucreler, hucreAnahtari, h.id);
  if (i >= 0) throw new Error(`hucreEkle: hucre zaten var: ${h.id}`);
  m.hucreler.splice(-i - 1, 0, h);
}

export function ilceBul(d: Dunya, id: string): IlceDurumu | undefined {
  const m = d.mulk;
  if (m === undefined) return undefined;
  const i = sirali(m.ilceler, idAnahtari, id);
  return i >= 0 ? m.ilceler[i] : undefined;
}

export function mulkOyuncuBul(d: Dunya, id: OyuncuId): MulkOyuncuDurumu | undefined {
  const m = d.mulk;
  if (m === undefined) return undefined;
  const i = sirali(m.oyuncular, idAnahtari, id);
  return i >= 0 ? m.oyuncular[i] : undefined;
}

/** Oyuncunun mülk kaydını döndürür; yoksa (arazi 0, vergi stoğu boş) oluşturup sıralı ekler. */
export function mulkOyuncuAl(m: MulkDurumu, id: OyuncuId, t: Ms): MulkOyuncuDurumu {
  const i = sirali(m.oyuncular, idAnahtari, id);
  if (i >= 0) return m.oyuncular[i] as MulkOyuncuDurumu;
  const yeni: MulkOyuncuDurumu = {
    id,
    araziDegeriMili: 0,
    ilceHucre: [],
    araziVergisi: { miktar: 0, yerelOran: 0, gelenOran: 0, t0: t, artik: 0, kapasite: Number.MAX_SAFE_INTEGER, surum: 0 },
    sonEtkinlik: t,
  };
  m.oyuncular.splice(-i - 1, 0, yeni);
  return yeni;
}

/** Oyuncunun ilçedeki hücre sayısı. */
export function ilceHucreSayisi(mo: MulkOyuncuDurumu, ilce: string): number {
  const i = sirali(mo.ilceHucre, (x) => x.ilce, ilce);
  return i >= 0 ? (mo.ilceHucre[i] as { hucre: number }).hucre : 0;
}

/** Oyuncunun ilçedeki hücre sayısına `delta` ekler (sıfıra inen kayıt silinir). */
export function ilceHucreEkle(mo: MulkOyuncuDurumu, ilce: string, delta: number): void {
  const i = sirali(mo.ilceHucre, (x) => x.ilce, ilce);
  if (i >= 0) {
    const k = mo.ilceHucre[i] as { hucre: number };
    k.hucre += delta;
    if (k.hucre <= 0) mo.ilceHucre.splice(i, 1);
  } else if (delta > 0) {
    mo.ilceHucre.splice(-i - 1, 0, { ilce, hucre: delta });
  }
}

/** (oyuncu, il) sırası. */
function isletmeSirasi(a: { oyuncu: string; il: string }, oyuncu: string, il: string): number {
  return dizgeKarsilastir(a.oyuncu, oyuncu) || dizgeKarsilastir(a.il, il);
}

/** İşletme kaydının sıralı konumu (bulunursa >= 0, değilse -(ekleme konumu + 1)). */
export function isletmeKonumu(m: MulkDurumu, oyuncu: OyuncuId, il: string): number {
  let lo = 0;
  let hi = m.isletmeler.length - 1;
  while (lo <= hi) {
    const orta = (lo + hi) >> 1;
    const c = isletmeSirasi(m.isletmeler[orta] as IsletmeDugumu, oyuncu, il);
    if (c === 0) return orta;
    if (c < 0) lo = orta + 1;
    else hi = orta - 1;
  }
  return -(lo + 1);
}

export function isletmeBul(d: Dunya, oyuncu: OyuncuId, il: string): IsletmeDugumu | undefined {
  const m = d.mulk;
  if (m === undefined) return undefined;
  const i = isletmeKonumu(m, oyuncu, il);
  return i >= 0 ? m.isletmeler[i] : undefined;
}

/** Oyuncunun en az bir işletme düğümü var mı? */
export function isletmesiVarMi(m: MulkDurumu, oyuncu: OyuncuId): boolean {
  const i = isletmeKonumu(m, oyuncu, "");
  const k = i >= 0 ? i : -i - 1;
  return (m.isletmeler[k]?.oyuncu ?? null) === oyuncu;
}

/** İşletme düğümünün bölge kimliği. */
export function isletmeKimligi(il: string, oyuncu: OyuncuId): string {
  return `${il}#${oyuncu}`;
}

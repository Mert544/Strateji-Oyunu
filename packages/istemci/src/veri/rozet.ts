/**
 * Durum rozetleri (saf): bölge başına EN ÇOK BİR rozet. Üç biçim (renk + şekil; renk tek başına anlam taşımaz):
 *   ▲ eksik  — eksik girdi: tedarik açığı ya da gıda kıtlığı;
 *   ◯ boşta  — tesis durmuş ya da verimi çok düşük;
 *   ✓ bitti  — inşaat bitti (son BITTI_SURESI sim-saat).
 * Öncelik ▲ > ◯ > ✓. Etkin bir savaşın hedefi olan bölgede ⚔ (savaş) rozeti hepsinin önündedir: savaş durumu
 * haritada yalnız bu rozetle (yay/çizgi yok) ve panelde gösterilir.
 * Oyuncu kipinde yalnız oyuncunun bölgeleri rozet alır; izleme kipinde sahipli tüm bölgeler.
 */
import { hucre, kareTuret } from "./kapsam";
import type { Hucre } from "./kapsam";
import type { Dizin, Kare } from "./kare-tipleri";

export type RozetTuru = "savas" | "eksik" | "bosta" | "bitti";

/** Yüksekten düşüğe öncelik. */
export const ROZET_ONCELIK: readonly RozetTuru[] = ["savas", "eksik", "bosta", "bitti"];

/** "İnşaat bitti" rozetinin görünür kaldığı süre (sim-saat). */
export const BITTI_SURESI = 6;
/** Gıda karşılanması bunun altındaysa bölge "eksik". */
export const GIDA_ESIGI = 80;
/** Çalışan tesisin verimi bunun altındaysa (%) "boşta". */
export const BOSTA_VERIM = 25;

/** Biten bir inşaat (istemci tarafında iki kare karşılaştırılarak bulunur). */
export interface BitenInsaat {
  bolge: number;
  /** Bitişin görüldüğü sim-saat. */
  saat: number;
  /** Yeni tesisin türü (DizinTesisTuru indeksi); bilinmiyorsa -1. */
  tesisTuru: number;
  /** Oyuncunun kendi inşaatı mı (oyuncu karesinden doğrulandı). */
  benim: boolean;
}

/** Bir bölgenin tüm rozet nedenleri (öncelik sırası dışında; Dikkat paneli ayrıntı için kullanır). */
export interface RozetNedenleri {
  savas: boolean;
  /** En kötü tedarik hücresi (eksik değilse null); gıda kıtlığı ayrıca `gida`. */
  eksik: { mal: number; hucre: Hucre } | null;
  /** Gıda karşılanma yüzdesi eşiğin altındaysa değeri, değilse null. */
  gida: number | null;
  /** İlk boştaki tesisin bölge tesis listesindeki sırası (yoksa -1). */
  bosta: number;
  bitti: BitenInsaat | null;
}

/** Rozet alabilecek bölge mi: oyuncu kipinde (ben >= 0) yalnız kendi bölgeleri; izlemede sahipli bölgeler. */
export function rozetAlabilir(kare: Kare, i: number, ben: number): boolean {
  const s = kare.bolgeler[i]?.sahip ?? -1;
  return ben >= 0 ? s === ben : s >= 0;
}

export function rozetNedenleri(kare: Kare, dizin: Dizin, i: number, bitenler: ReadonlyMap<number, BitenInsaat>): RozetNedenleri {
  const bk = kare.bolgeler[i];
  const bos: RozetNedenleri = { savas: false, eksik: null, gida: null, bosta: -1, bitti: null };
  if (!bk) return bos;
  const t = kareTuret(kare, dizin.oyuncular.length);
  let eksik: RozetNedenleri["eksik"] = null;
  for (let m = 0; m < t.nm; m++) {
    const h = hucre(kare, t, i, m);
    if ((h.d === "acik" || h.d === "engelli") && (!eksik || h.pct < eksik.hucre.pct)) eksik = { mal: m, hucre: h };
  }
  const b = bitenler.get(i);
  return {
    savas: kare.savaslar.some((s) => s.evre !== "bitti" && s.hedefBolge === i),
    eksik,
    gida: bk.nufus > 0 && bk.gida < GIDA_ESIGI ? bk.gida : null,
    bosta: bk.tesis.findIndex((x) => x[2] === 0 || x[3] < BOSTA_VERIM),
    bitti: b && kare.saat - b.saat <= BITTI_SURESI ? b : null,
  };
}

/** Nedenlerden tek rozet (öncelik: savaş > eksik > boşta > bitti). */
export function rozetSec(n: RozetNedenleri): RozetTuru | null {
  if (n.savas) return "savas";
  if (n.eksik || n.gida !== null) return "eksik";
  if (n.bosta >= 0) return "bosta";
  if (n.bitti) return "bitti";
  return null;
}

/** Bölge başına rozet (null: yok). */
export function rozetleriHesapla(kare: Kare | null, dizin: Dizin, ben: number, bitenler: ReadonlyMap<number, BitenInsaat>): Array<RozetTuru | null> {
  const n = dizin.bolgeler.length;
  if (!kare) return new Array<RozetTuru | null>(n).fill(null);
  return Array.from({ length: n }, (_, i) => (rozetAlabilir(kare, i, ben) ? rozetSec(rozetNedenleri(kare, dizin, i, bitenler)) : null));
}

/**
 * Biten inşaatları izler: art arda gelen karelerde bir bölgenin tesis sayısı artarsa (ya da oyuncunun bir
 * inşaatı kuyruktan düşerse) o bölgede inşaat bitmiştir. Sim saati geri giderse (yeni oyun) sıfırlanır.
 */
export class InsaatIzleyici {
  private onceki: Kare | null = null;
  readonly bitenler = new Map<number, BitenInsaat>();

  /** Yeni kareyi işler; bu karede yeni biten inşaatları döndürür. */
  guncelle(kare: Kare): BitenInsaat[] {
    const o = this.onceki;
    this.onceki = kare;
    if (o && kare.saat < o.saat) {
      this.bitenler.clear();
      return [];
    }
    for (const [b, x] of this.bitenler) if (kare.saat - x.saat > BITTI_SURESI) this.bitenler.delete(b);
    if (!o) return [];
    const yeni: BitenInsaat[] = [];
    const ekle = (x: BitenInsaat): void => {
      if (yeni.some((y) => y.bolge === x.bolge)) return;
      yeni.push(x);
      this.bitenler.set(x.bolge, x);
    };
    // Oyuncunun kuyruktan düşen inşaatları (iptal değil: bitiş zamanı geldi).
    const simdikiIdler = new Set((kare.oyuncu?.insaatlar ?? []).map((i) => i.id));
    for (const i of o.oyuncu?.insaatlar ?? []) {
      if (simdikiIdler.has(i.id) || i.bitis > kare.saat + 1) continue;
      ekle({ bolge: i.bolge, saat: kare.saat, tesisTuru: i.tur === "tesis" ? i.hedef : -1, benim: true });
    }
    // Tesis sayısı artan bölgeler (tüm oyuncular).
    kare.bolgeler.forEach((b, i) => {
      const onceki = o.bolgeler[i];
      if (!onceki || b.tesis.length <= onceki.tesis.length) return;
      const tur = b.tesis[b.tesis.length - 1]?.[0] ?? -1;
      ekle({ bolge: i, saat: kare.saat, tesisTuru: tur, benim: kare.oyuncu !== undefined && b.sahip === kare.oyuncu.idx });
    });
    return yeni;
  }
}

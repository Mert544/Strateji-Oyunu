/**
 * Lojistik graf yardımcıları (SAF: Dunya'ya bağımlı değildir).
 *
 * Yalnızca sayı dizileri alır/döndürür. Tüm sayılar tamsayıdır. Yineleme sırası
 * her zaman artan indekstir (determinizm).
 */

/**
 * Yönsüz kenar.
 * - `kapasite`: iki yönün TOPLAMI için paylaşılan tek sınır (mili-birim/saat vb.).
 * - `maliyet`: taşıma süresi (ms); pozitif olmalıdır.
 */
export interface GrafKenari {
  u: number;
  v: number;
  kapasite: number;
  maliyet: number;
}

/** Komşuluk listesindeki bir giriş: hangi kenarla hangi düğüme gidilir. */
export interface Komsu {
  /** Kenar indeksi (kenarlar dizisindeki konum) */
  kenar: number;
  /** Kenarın öbür ucundaki düğüm */
  dugum: number;
}

/**
 * Komşuluk listesi kurar. Her düğümün listesi kenar indeksine göre ARTAN sıralıdır.
 * Kendi kendine döngü kenarları (u === v) ve aralık dışı uçlar yok sayılır.
 * Kapasitesi 0 olan kenarlar dahildir (filtrelemek için `kenarFiltrele` kullanın).
 */
export function komsulukKur(dugumSayisi: number, kenarlar: readonly GrafKenari[]): Komsu[][] {
  const liste: Komsu[][] = [];
  for (let i = 0; i < dugumSayisi; i++) liste.push([]);
  for (let i = 0; i < kenarlar.length; i++) {
    const k = kenarlar[i]!;
    if (k.u === k.v) continue;
    if (k.u < 0 || k.v < 0 || k.u >= dugumSayisi || k.v >= dugumSayisi) continue;
    liste[k.u]!.push({ kenar: i, dugum: k.v });
    liste[k.v]!.push({ kenar: i, dugum: k.u });
  }
  return liste;
}

/** Kenar listesinin geçerliliğini denetler; geçersizse açıklayıcı `RangeError` fırlatır. */
export function kenarlariDogrula(dugumSayisi: number, kenarlar: readonly GrafKenari[]): void {
  for (let i = 0; i < kenarlar.length; i++) {
    const k = kenarlar[i]!;
    if (!Number.isInteger(k.u) || !Number.isInteger(k.v) || k.u < 0 || k.v < 0 || k.u >= dugumSayisi || k.v >= dugumSayisi) {
      throw new RangeError(`kenar ${i}: uc dugumleri aralik disi (${k.u}, ${k.v})`);
    }
    if (!Number.isInteger(k.kapasite) || k.kapasite < 0) {
      throw new RangeError(`kenar ${i}: kapasite negatif olmayan tamsayi olmali (${k.kapasite})`);
    }
    if (!Number.isInteger(k.maliyet) || k.maliyet < 0) {
      throw new RangeError(`kenar ${i}: maliyet negatif olmayan tamsayi olmali (${k.maliyet})`);
    }
  }
}

/** `kenarFiltrele` sonucu: süzülmüş kenarlar ve eski indeks eşlemesi. */
export interface FiltreliGraf {
  kenarlar: GrafKenari[];
  /** `eskiIndeks[yeni] = orijinal kenar indeksi` (artan sıralı) */
  eskiIndeks: number[];
}

/**
 * Yalnızca `tut(kenarIndeks, kenar)` true dönen kenarları tutar (göreli sıra korunur).
 * Kenarlar kopyalanır; girdi değişmez.
 */
export function kenarFiltrele(
  kenarlar: readonly GrafKenari[],
  tut: (kenarIndeks: number, kenar: GrafKenari) => boolean,
): FiltreliGraf {
  const sonuc: GrafKenari[] = [];
  const eskiIndeks: number[] = [];
  for (let i = 0; i < kenarlar.length; i++) {
    const k = kenarlar[i]!;
    if (tut(i, k)) {
      sonuc.push({ u: k.u, v: k.v, kapasite: k.kapasite, maliyet: k.maliyet });
      eskiIndeks.push(i);
    }
  }
  return { kenarlar: sonuc, eskiIndeks };
}

/** Yalnızca kapasitesi sıfırdan büyük kenarları tutar. */
export function kapasiteliKenarlar(kenarlar: readonly GrafKenari[]): FiltreliGraf {
  return kenarFiltrele(kenarlar, (_i, k) => k.kapasite > 0);
}

/**
 * Kenarların kapasitesini verilen diziyle değiştirilmiş kopyasını döndürür
 * (ör. `kalanKapasite` çıktısı ile sonraki mal için ağ kurmak). Negatifler 0'a kırpılır.
 */
export function kapasiteleriDegistir(kenarlar: readonly GrafKenari[], kapasiteler: readonly number[]): GrafKenari[] {
  return kenarlar.map((k, i) => ({
    u: k.u,
    v: k.v,
    kapasite: Math.max(0, kapasiteler[i] ?? 0),
    maliyet: k.maliyet,
  }));
}

/** Kenar `i` üzerinde `x` düğümünden öbür uca geçer; `x` kenarın ucu değilse -1. */
export function oburUc(kenar: GrafKenari, x: number): number {
  if (kenar.u === x) return kenar.v;
  if (kenar.v === x) return kenar.u;
  return -1;
}

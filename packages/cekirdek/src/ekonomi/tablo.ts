/**
 * Ekonomi ve lojistik için içerikten türetilmiş, indeksli (sıralı) tablolar.
 * İçerik dosyasındaki Record<MalId, number> alanları mal indeksine göre sıralı [mal, miktar] çiftlerine
 * çevrilir; böylece çözüm içinde nesne anahtarı gezmek gerekmez (determinizm + hız).
 * Tablo dünya durumuna girmez; DerlenmisIcerik başına bir kez üretilip önbelleklenir.
 */
import type { DerlenmisIcerik } from "../tipler";

/** [mal indeksi, miktar] çiftleri, mal indeksine göre artan. */
export type MalMiktar = ReadonlyArray<readonly [number, number]>;

export interface YontemSatiri {
  girdi: MalMiktar;
  cikti: MalMiktar;
  bakim: MalMiktar;
  isci: number;
  /** Ham çıkarımda tüketilen rezerv malının indeksi; yoksa -1. */
  rezerv: number;
}

export interface TurSatiri {
  /** Yöntem indeksleri (ilki varsayılan). */
  yontemler: number[];
  insaMaliyeti: MalMiktar;
  insaParasi: number;
  insaSuresiSaat: number;
  /** Gerekli rezerv malı indeksi; yoksa -1. */
  gerekliRezerv: number;
}

export interface IcerikTablosu {
  malSayisi: number;
  yontem: YontemSatiri[];
  tur: TurSatiri[];
  /** Nüfusun 1000 kişi başına saatlik tüketimi. */
  nufusTuketim: MalMiktar;
  /** Kenar geliştirme maliyeti (mal). */
  gelistirmeMaliyeti: MalMiktar;
  /** Gıda malının indeksi; yoksa -1. */
  gidaMal: number;
  /** Mal kategorisi "ham" mı (rezervden çıkarılır). */
  ham: boolean[];
  /** Mal kategorisi "askeri" mi. */
  askeri: boolean[];
  /** Pazar emilim/arz (mal indeksine göre, eksik = 0). */
  emilimSaat: number[];
  arzSaat: number[];
}

function cift(ic: DerlenmisIcerik, kayit: Record<string, number>): Array<[number, number]> {
  const sonuc: Array<[number, number]> = [];
  for (const malId of Object.keys(kayit)) {
    const mi = ic.malIndeks[malId];
    if (mi === undefined) throw new Error(`ekonomi tablosu: bilinmeyen mal: ${malId}`);
    const miktar = kayit[malId] as number;
    if (miktar !== 0) sonuc.push([mi, miktar]);
  }
  sonuc.sort((a, b) => a[0] - b[0]);
  return sonuc;
}

function malDizisi(ic: DerlenmisIcerik, kayit: Record<string, number>): number[] {
  const dizi = new Array<number>(ic.mallar.length).fill(0);
  for (const [mi, q] of cift(ic, kayit)) dizi[mi] = q;
  return dizi;
}

const onbellek = new WeakMap<DerlenmisIcerik, IcerikTablosu>();

/** İçerik tablosunu döndürür (ilk çağrıda üretir). */
export function icerikTablosu(ic: DerlenmisIcerik): IcerikTablosu {
  const mevcut = onbellek.get(ic);
  if (mevcut) return mevcut;

  const yontem: YontemSatiri[] = ic.yontemler.map((y) => {
    const rezerv = y.rezerv === undefined ? -1 : (ic.malIndeks[y.rezerv] ?? -1);
    return { girdi: cift(ic, y.girdiler), cikti: cift(ic, y.ciktilar), bakim: cift(ic, y.bakim), isci: y.isci, rezerv };
  });
  const tur: TurSatiri[] = ic.tesisTurleri.map((t) => ({
    yontemler: t.yontemler.map((yid) => {
      const yi = ic.yontemIndeks[yid];
      if (yi === undefined) throw new Error(`ekonomi tablosu: tesis turu ${t.id} bilinmeyen yontem: ${yid}`);
      return yi;
    }),
    insaMaliyeti: cift(ic, t.insaMaliyeti),
    insaParasi: t.insaParasi,
    insaSuresiSaat: t.insaSuresiSaat,
    gerekliRezerv: t.gerekliRezerv === undefined ? -1 : (ic.malIndeks[t.gerekliRezerv] ?? -1),
  }));

  const tablo: IcerikTablosu = {
    malSayisi: ic.mallar.length,
    yontem,
    tur,
    nufusTuketim: cift(ic, ic.param.nufus.tuketim1000Saat),
    gelistirmeMaliyeti: cift(ic, ic.param.lojistik.gelistirmeMaliyeti),
    gidaMal: ic.malIndeks["gida"] ?? -1,
    ham: ic.mallar.map((m) => m.kategori === "ham"),
    askeri: ic.mallar.map((m) => m.kategori === "askeri"),
    emilimSaat: malDizisi(ic, ic.param.pazar.emilimSaat),
    arzSaat: malDizisi(ic, ic.param.pazar.arzSaat),
  };
  onbellek.set(ic, tablo);
  return tablo;
}

/**
 * Bot yardımcısı: içerikten (DerlenmisIcerik) türetilmiş indeksli tablolar.
 * Yalnızca okunur; içerik başına bir kez üretilir (WeakMap önbelleği, dünya durumuna girmez).
 *
 * Para birimi bot hesaplarında "para" = mili-para / MILI (yani oyuncunun gördüğü birim) olarak tutulur;
 * miktarlar ise çekirdekle aynı mili-birimdir.
 */
import { MILI } from "@bolge/cekirdek";
import type { DerlenmisIcerik } from "@bolge/cekirdek";
import type { Etiket } from "@bolge/veri";

/** [mal indeksi, miktar] çiftleri. */
export type MalMiktar = Array<[number, number]>;

export interface YontemBilgisi {
  indeks: number;
  id: string;
  girdi: MalMiktar;
  cikti: MalMiktar;
  bakim: MalMiktar;
  isci: number;
  gerekliTeknoloji?: string;
  /** Ham çıkarımda tüketilen rezerv malı (yoksa -1). */
  rezerv: number;
  /** Tam kadroda saatlik brüt çıktı değeri (para/saat, taban fiyat). */
  brutDeger: number;
  /** Çıktı − girdi − bakım değeri (para/saat, taban fiyat). */
  netDeger: number;
}

export interface TurBilgisi {
  indeks: number;
  id: string;
  yontemler: number[];
  maliyet: MalMiktar;
  /** İnşa para maliyeti (mili-para). */
  para: number;
  sureSaat: number;
  gerekliEtiket?: Etiket;
  gerekliRezerv: number;
  gerekliTeknoloji?: string;
  /** Varsayılan yöntemin çıktılarından biri askeri mal mı. */
  askeri: boolean;
  /** Tüm maliyetin taban fiyatla değeri (para). */
  maliyetDegeri: number;
  /** Tarım tesisi (çiftlik, ahır, mera): bölgenin tarımTesisTavani sayımına girer (B1). */
  tarimTesisi: boolean;
}

export interface BirlikBilgisi {
  indeks: number;
  id: string;
  maliyet: MalMiktar;
  guc: number;
  partiSuresiSaat: number;
  gerekliTeknoloji?: string;
  /** Birim başına maliyet değeri (para, taban fiyat). */
  maliyetDegeri: number;
}

export interface IcerikBilgisi {
  malSayisi: number;
  malId: string[];
  /** Taban fiyat (para/birim). */
  taban: number[];
  ham: boolean[];
  askeri: boolean[];
  yontem: YontemBilgisi[];
  tur: TurBilgisi[];
  birlik: BirlikBilgisi[];
  gida: number;
  muhimmat: number;
  yakit: number;
  celik: number;
  parca: number;
  /** gubre malı (yoksa -1). */
  gubre: number;
  /** Mal -> o malı çıktılayan tesis türü indeksleri (herhangi bir yöntemle). */
  ureticiTurler: number[][];
}

function cift(ic: DerlenmisIcerik, kayit: Record<string, number>): MalMiktar {
  const s: MalMiktar = [];
  for (const id of Object.keys(kayit)) {
    const mi = ic.malIndeks[id];
    if (mi === undefined) continue;
    const q = kayit[id] as number;
    if (q !== 0) s.push([mi, q]);
  }
  s.sort((a, b) => a[0] - b[0]);
  return s;
}

const onbellek = new WeakMap<DerlenmisIcerik, IcerikBilgisi>();

export function icerikBilgisi(ic: DerlenmisIcerik): IcerikBilgisi {
  const var_ = onbellek.get(ic);
  if (var_) return var_;
  const taban = ic.mallar.map((m) => m.tabanFiyat / MILI);
  const deger = (l: MalMiktar): number => l.reduce((t, [m, q]) => t + (q / MILI) * (taban[m] as number), 0);

  const yontem: YontemBilgisi[] = ic.yontemler.map((y, indeks) => {
    const girdi = cift(ic, y.girdiler);
    const cikti = cift(ic, y.ciktilar);
    const bakim = cift(ic, y.bakim);
    const brut = deger(cikti);
    return {
      indeks,
      id: y.id,
      girdi,
      cikti,
      bakim,
      isci: y.isci,
      gerekliTeknoloji: y.gerekliTeknoloji,
      rezerv: y.rezerv === undefined ? -1 : (ic.malIndeks[y.rezerv] ?? -1),
      brutDeger: brut,
      netDeger: brut - deger(girdi) - deger(bakim),
    };
  });
  const askeri = ic.mallar.map((m) => m.kategori === "askeri");
  const tur: TurBilgisi[] = ic.tesisTurleri.map((t, indeks) => {
    const yontemler = t.yontemler.map((id) => ic.yontemIndeks[id] as number);
    const maliyet = cift(ic, t.insaMaliyeti);
    const y0 = yontem[yontemler[0] as number] as YontemBilgisi;
    return {
      indeks,
      id: t.id,
      yontemler,
      maliyet,
      para: t.insaParasi,
      sureSaat: t.insaSuresiSaat,
      gerekliEtiket: t.gerekliEtiket,
      gerekliRezerv: t.gerekliRezerv === undefined ? -1 : (ic.malIndeks[t.gerekliRezerv] ?? -1),
      gerekliTeknoloji: t.gerekliTeknoloji,
      askeri: y0.cikti.some(([m]) => askeri[m] === true),
      maliyetDegeri: deger(maliyet) + t.insaParasi / MILI,
      tarimTesisi: t.tarimTesisi === true,
    };
  });
  const birlik: BirlikBilgisi[] = ic.birlikler.map((b, indeks) => {
    const maliyet = cift(ic, b.maliyet);
    return {
      indeks,
      id: b.id,
      maliyet,
      guc: b.guc,
      partiSuresiSaat: b.partiSuresiSaat,
      gerekliTeknoloji: b.gerekliTeknoloji,
      maliyetDegeri: deger(maliyet),
    };
  });
  const ureticiTurler: number[][] = ic.mallar.map(() => []);
  for (const t of tur) {
    const goruldu = new Set<number>();
    for (const yi of t.yontemler) {
      for (const [m] of (yontem[yi] as YontemBilgisi).cikti) {
        if (!goruldu.has(m)) {
          goruldu.add(m);
          (ureticiTurler[m] as number[]).push(t.indeks);
        }
      }
    }
  }
  const bilgi: IcerikBilgisi = {
    malSayisi: ic.mallar.length,
    malId: ic.mallar.map((m) => m.id),
    taban,
    ham: ic.mallar.map((m) => m.kategori === "ham"),
    askeri,
    yontem,
    tur,
    birlik,
    gida: ic.malIndeks["gida"] ?? -1,
    muhimmat: ic.malIndeks["muhimmat"] ?? -1,
    yakit: ic.malIndeks["yakit"] ?? -1,
    celik: ic.malIndeks["celik"] ?? -1,
    parca: ic.malIndeks["parca"] ?? -1,
    gubre: ic.malIndeks["gubre"] ?? -1,
    ureticiTurler,
  };
  onbellek.set(ic, bilgi);
  return bilgi;
}

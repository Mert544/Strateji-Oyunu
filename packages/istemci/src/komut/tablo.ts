/**
 * İçerikten (icerik.json + parametreler.json) türetilen, indeksli ve salt okunur tablolar. Komut formları ve
 * hata çevirisi yalnızca buradan okur; sabit tesis/mal/teknoloji listesi yoktur (içerik değişince form değişir).
 * Saf modül: DOM ve çekirdek bağımlılığı yok (işçide ve ana iş parçacığında ortak kullanılır).
 */
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";

/** [mal indeksi, miktar (mili-birim)] */
export type MalMiktar = Array<[number, number]>;

export interface YontemT {
  indeks: number;
  id: string;
  ad: string;
  girdi: MalMiktar;
  cikti: MalMiktar;
  /** Temel saatlik bakım tarifesi; eski tablolarda yoksa bilinmiyor. */
  bakim?: MalMiktar;
  isci: number;
  gerekliTeknoloji?: string;
}

export interface TurT {
  indeks: number;
  id: string;
  ad: string;
  maliyet: MalMiktar;
  /** mili-para */
  para: number;
  sureSaat: number;
  yontemler: number[];
  gerekliEtiket?: string;
  /** Rezerv malı indeksi; yoksa -1. */
  gerekliRezerv: number;
  gerekliTeknoloji?: string;
  tarimTesisi: boolean;
  /** Varsayılan yöntemi elektrik üretir. */
  santral: boolean;
}

export interface BirlikT {
  indeks: number;
  id: string;
  ad: string;
  maliyet: MalMiktar;
  sureSaat: number;
  guc: number;
  gerekliTeknoloji?: string;
}

export interface TeknolojiT {
  indeks: number;
  id: string;
  ad: string;
  aciklama: string;
  /** mili-para */
  maliyet: number;
  sureGun: number;
  onKosullar: string[];
  /** Açtığı şeylerin kısa adları (yöntem, tesis, karar kimlikleri). */
  acar: string[];
}

export interface MalT {
  id: string;
  ad: string;
  kategori: string;
  /** mili-para / birim */
  taban: number;
  depolanabilir: boolean;
}

export interface Icerik {
  mallar: MalT[];
  malIdx: Record<string, number>;
  yontemler: YontemT[];
  yontemIdx: Record<string, number>;
  turler: TurT[];
  turIdx: Record<string, number>;
  birlikler: BirlikT[];
  birlikIdx: Record<string, number>;
  teknolojiler: TeknolojiT[];
  teknolojiIdx: Record<string, number>;
  /** Tarım ürünleri (ekim payı sırasıyla). */
  urunler: Array<{ id: string; ad: string; /** çıktı (%) */ cikti: number; /** günlük toprak değişimi (ppm; 10 000 = 1 puan) */ toprak: number }>;
  azamiGubreDozu: number;
  param: Parametreler;
  /** Katman açık mı (parametrelerde bölümü var mı). */
  sanayi: boolean;
  tarim: boolean;
}

const onbellek = new WeakMap<IcerikDosyasi, Icerik>();

function malMiktar(r: Record<string, number>, idx: Record<string, number>): MalMiktar {
  return Object.keys(r)
    .sort()
    .flatMap((id): MalMiktar => {
      const m = idx[id];
      return m === undefined ? [] : [[m, r[id] as number]];
    })
    .sort((a, b) => a[0] - b[0]);
}

export function icerikTablosu(ic: IcerikDosyasi, param: Parametreler): Icerik {
  const var_ = onbellek.get(ic);
  if (var_ && var_.param === param) return var_;
  const idx = <T extends { id: string }>(l: T[]): Record<string, number> => Object.fromEntries(l.map((x, i) => [x.id, i]));
  const malIdx = idx(ic.mallar);
  const yontemIdx = idx(ic.yontemler);
  const turIdx = idx(ic.tesisTurleri);
  const birlikIdx = idx(ic.birlikler);
  const teknolojiIdx = idx(ic.teknolojiler);
  const yontemler = ic.yontemler.map(
    (y, i): YontemT => ({
      indeks: i,
      id: y.id,
      ad: y.ad,
      girdi: malMiktar(y.girdiler, malIdx),
      cikti: malMiktar(y.ciktilar, malIdx),
      ...(y.bakim === undefined ? {} : { bakim: malMiktar(y.bakim, malIdx) }),
      isci: y.isci,
      ...(y.gerekliTeknoloji !== undefined ? { gerekliTeknoloji: y.gerekliTeknoloji } : {}),
    }),
  );
  const elektrik = malIdx["elektrik"];
  const turler = ic.tesisTurleri.map((t, i): TurT => {
    const y0 = yontemler[yontemIdx[t.yontemler[0] as string] as number];
    return {
      indeks: i,
      id: t.id,
      ad: t.ad,
      maliyet: malMiktar(t.insaMaliyeti, malIdx),
      para: t.insaParasi,
      sureSaat: t.insaSuresiSaat,
      yontemler: t.yontemler.flatMap((y) => (yontemIdx[y] === undefined ? [] : [yontemIdx[y] as number])),
      ...(t.gerekliEtiket !== undefined ? { gerekliEtiket: t.gerekliEtiket } : {}),
      gerekliRezerv: t.gerekliRezerv !== undefined ? (malIdx[t.gerekliRezerv] ?? -1) : -1,
      ...(t.gerekliTeknoloji !== undefined ? { gerekliTeknoloji: t.gerekliTeknoloji } : {}),
      tarimTesisi: t.tarimTesisi === true,
      santral: elektrik !== undefined && (y0?.cikti.some((c) => c[0] === elektrik) ?? false),
    };
  });
  const adBul = (id: string): string => ic.yontemler.find((y) => y.id === id)?.ad ?? ic.tesisTurleri.find((t) => t.id === id)?.ad ?? id;
  const t: Icerik = {
    mallar: ic.mallar.map((m) => ({ id: m.id, ad: m.ad, kategori: m.kategori, taban: m.tabanFiyat, depolanabilir: m.depolanabilir !== false })),
    malIdx,
    yontemler,
    yontemIdx,
    turler,
    turIdx,
    birlikler: ic.birlikler.map((b, i): BirlikT => ({
      indeks: i,
      id: b.id,
      ad: b.ad,
      maliyet: malMiktar(b.maliyet, malIdx),
      sureSaat: b.partiSuresiSaat,
      guc: b.guc,
      ...(b.gerekliTeknoloji !== undefined ? { gerekliTeknoloji: b.gerekliTeknoloji } : {}),
    })),
    birlikIdx,
    teknolojiler: ic.teknolojiler.map((k, i): TeknolojiT => ({
      indeks: i,
      id: k.id,
      ad: k.ad,
      aciklama: k.aciklama,
      maliyet: k.maliyet,
      sureGun: k.sureGun,
      onKosullar: [...k.onKosullar],
      acar: [...(k.acar.yontemler ?? []), ...(k.acar.tesisTurleri ?? [])].map(adBul).concat(k.acar.kararlar ?? []),
    })),
    teknolojiIdx,
    urunler: (ic.tarimUrunleri ?? []).map((u) => ({ id: u.id, ad: u.ad, cikti: Math.round(u.ciktiPpm / 10000), toprak: u.toprakDegisimPpmGun })),
    azamiGubreDozu: param.tarim?.azamiGubreDozu ?? 0,
    param,
    sanayi: param.sanayi !== undefined,
    tarim: param.tarim !== undefined && (ic.tarimUrunleri?.length ?? 0) > 0,
  };
  onbellek.set(ic, t);
  return t;
}

/** Teknoloji kimliğinden ad (bilinmiyorsa kimliğin kendisi). */
export function teknolojiAdi(ic: Icerik, id: string): string {
  return ic.teknolojiler[ic.teknolojiIdx[id] ?? -1]?.ad ?? id;
}

/** Bir kararı (ör. deniz_kenar_gelistir) açan teknolojinin adı; bilinmiyorsa null. */
export function kararTeknolojisi(ic: Icerik, karar: string): string | null {
  const t = ic.teknolojiler.find((k) => k.acar.includes(karar));
  return t ? t.ad : null;
}

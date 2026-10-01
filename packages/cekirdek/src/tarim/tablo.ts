/**
 * Tarım katmanı için içerikten türetilmiş sabit tablolar (B1, docs/08 §1).
 * Dünya durumuna girmez; DerlenmisIcerik başına bir kez üretilip önbelleklenir.
 *
 * Tarım "açık" sayılır: `param.iklim` VE `param.tarim` tanımlıysa. Kapalıyken `tarimTablosu` null döner ve
 * çekirdek v0.2 davranışını birebir verir (hiçbir tarım alanı, olay veya rastgele çekim yoktur).
 *
 * Not: çekirdek `@bolge/veri`'den yalnızca tip içe aktarır (tarayıcıya node:fs girmesin); bu yüzden iklim tipi
 * ve olay türü sıraları burada sabit olarak yinelenir.
 */
import type { IklimOlayTuru, IklimTipi, TarimParametreleri, IklimParametreleri } from "@bolge/veri";
import { carpBol, tabanBol } from "../sabit";
import { PPM } from "../tipler";
import type { DerlenmisIcerik } from "../tipler";

/** İklim tipi sırası (hasat eğrisi tablosu bu indekse göre). */
export const IKLIM_TIPI_SIRASI: readonly IklimTipi[] = ["akdeniz", "karasal", "karadeniz", "balkan_kita", "kurak", "dag_yayla"];

/** Olay türü sırası: günlük çekimde her bölge için bu sırayla tam bir çekim yapılır (sıra değişmez). */
export const OLAY_TURU_SIRASI: readonly IklimOlayTuru[] = ["kuraklik", "don", "sel", "kis_firtinasi"];

/** Tarım üretimini etkileyen olay türleri (kis_firtinasi Lojistik içindir, B5). */
export const TARIMI_ETKILEYEN_OLAY: Readonly<Record<IklimOlayTuru, boolean>> = {
  kuraklik: true,
  don: true,
  sel: true,
  kis_firtinasi: false,
};

export interface TarimUrunSatiri {
  ciktiPpm: number;
  toprakDegisimPpmGun: number;
  olayDuyarliligiPpm: number;
}

export interface TarimTablosu {
  iklim: IklimParametreleri;
  tarim: TarimParametreleri;
  /** Ürün grupları (ekim payları bu sıradadır). */
  urun: TarimUrunSatiri[];
  /** gubre malının indeksi. */
  gubreMal: number;
  /** 13 eleman: ayBaslangic[m] (m = 0..11) ve sonda 365. */
  ayBaslangic: number[];
  /** Takvim gününe (0..364) karşılık gelen ay (0..11). */
  gunAyi: number[];
  /**
   * Tip indeksi -> takvim günü (0..364) -> hasat oranı (ppm): ay ortaları arası doğrusal enterpolasyon, ardından
   * 365 günün toplamı TAM 365 x PPM olacak şekilde ölçeklenmiş (gün ağırlıklı yıllık ortalama tam PPM).
   */
  hasatGunluk: number[][];
  /** Bölge -> kara kenarıyla komşu bölge indeksleri (kenar indeksi artan sırada; yinelenen komşu tek sayılır). */
  karaKomsu: number[][];
  /** Yöntem indeksi -> tarımsal mı. */
  yontemTarimsal: boolean[];
  /** Yöntem indeksi -> ekili ürün yöntemi mi (tarımsal ve rezervli): ekim karışımı ve toprak sürüklenmesi bunlarla ilgilidir. */
  yontemEkili: boolean[];
  /** Yöntem indeksi -> sulama yöntemi mi. */
  yontemSulama: boolean[];
  /** Tesis türü indeksi -> tarım tesisi tavanına sayılır mı. */
  turTarimTesisi: boolean[];
  /** Mal indeksi -> bir tarımsal yöntemin tükettiği rezerv malı mı (tarım açıkken tarım bölgesinde rezerv tükenmez). */
  tarimsalRezervMal: boolean[];
}

/**
 * Gün (0..364) için hasat oranı: ay ortaları arasında doğrusal (tamsayı, floor). Ay ortası = ayBaslangic + floor(ayGunleri / 2).
 * Yılın sonu ile başı arasında dolanır.
 */
export function hasatEnterpole(egri: readonly number[], ayGunleri: readonly number[], gun: number): number {
  const ayBas: number[] = [];
  let t = 0;
  for (const g of ayGunleri) {
    ayBas.push(t);
    t += g;
  }
  const yil = t;
  const ayOrta = ayGunleri.map((g, m) => (ayBas[m] as number) + Math.floor(g / 2));
  let m = 0;
  while (m < 11 && gun >= (ayBas[m + 1] as number)) m++;
  let a: number;
  let b: number;
  let k: number;
  let aralik: number;
  if (gun >= (ayOrta[m] as number)) {
    a = m;
    b = (m + 1) % 12;
    k = gun - (ayOrta[m] as number);
    aralik = (ayOrta[b] as number) + (b === 0 ? yil : 0) - (ayOrta[m] as number);
  } else {
    a = (m + 11) % 12;
    b = m;
    k = gun - (ayOrta[a] as number) + (a === 11 ? yil : 0);
    aralik = (ayOrta[m] as number) + (a === 11 ? yil : 0) - (ayOrta[a] as number);
  }
  return tabanBol((egri[a] as number) * (aralik - k) + (egri[b] as number) * k, aralik);
}

/**
 * Günlük eğriyi yıllık ortalaması tam PPM olacak biçimde ölçekler: ay uzunlukları eşit olmadığından (Şubat 28 gün)
 * ham enterpolasyonun gün ağırlıklı ortalaması PPM'den en çok ~%0,5 sapar. Önce tamsayı ölçekleme (floor), kalan
 * birimler yıla eşit aralıkla 1'er eklenir; toplam tam 365 x PPM olur.
 */
export function hasatGunlukNormallestir(gunluk: readonly number[]): number[] {
  const gun = gunluk.length;
  const hedef = gun * PPM;
  let toplam = 0;
  for (const v of gunluk) toplam += v;
  if (toplam <= 0) return [...gunluk];
  const yeni = gunluk.map((v) => carpBol(v, hedef, toplam));
  let olcekli = 0;
  for (const v of yeni) olcekli += v;
  const kalan = hedef - olcekli;
  for (let g = 0; g < gun; g++) {
    if (Math.floor(((g + 1) * kalan) / gun) > Math.floor((g * kalan) / gun)) yeni[g] = (yeni[g] as number) + 1;
  }
  return yeni;
}

const onbellek = new WeakMap<DerlenmisIcerik, TarimTablosu | null>();

/** Tarım açıksa tabloyu (önbellekli) döndürür, kapalıysa null. Tutarsız veri (gubre malı, ürün yok) hata fırlatır. */
export function tarimTablosu(ic: DerlenmisIcerik): TarimTablosu | null {
  const mevcut = onbellek.get(ic);
  if (mevcut !== undefined) return mevcut;
  const tablo = tabloUret(ic);
  onbellek.set(ic, tablo);
  return tablo;
}

function tabloUret(ic: DerlenmisIcerik): TarimTablosu | null {
  const iklim = ic.param.iklim;
  const tarim = ic.param.tarim;
  if (iklim === undefined || tarim === undefined) return null;
  const urunler = ic.icerik.tarimUrunleri ?? [];
  if (urunler.length === 0) throw new Error("tarim acik ama icerik.tarimUrunleri bos");
  const gubreMal = ic.malIndeks["gubre"];
  if (gubreMal === undefined) throw new Error('tarim acik ama icerikte "gubre" mali yok');

  const ayBaslangic: number[] = [];
  const gunAyi: number[] = [];
  let t = 0;
  for (let m = 0; m < 12; m++) {
    ayBaslangic.push(t);
    const g = iklim.ayGunleri[m] as number;
    for (let i = 0; i < g; i++) gunAyi.push(m);
    t += g;
  }
  ayBaslangic.push(t);
  if (t !== 365) throw new Error(`iklim.ayGunleri toplami 365 olmali (${t})`);

  const hasatGunluk = IKLIM_TIPI_SIRASI.map((tip) => {
    const egri = iklim.hasatEgrisiPpm[tip];
    const gunluk: number[] = [];
    for (let g = 0; g < 365; g++) gunluk.push(hasatEnterpole(egri, iklim.ayGunleri, g));
    return hasatGunlukNormallestir(gunluk);
  });

  // Kara komşuluğu: iklim olayları kara kenarlarıyla yayılır (deniz ve hava kenarları yayılma yolu değildir).
  const karaKomsu: number[][] = ic.harita.bolgeler.map(() => []);
  for (let k = 0; k < ic.harita.kenarlar.length; k++) {
    const kenar = ic.harita.kenarlar[k];
    if (kenar === undefined || kenar.tur !== "kara") continue;
    const a = ic.bolgeIndeks[kenar.a];
    const b = ic.bolgeIndeks[kenar.b];
    if (a === undefined || b === undefined || a === b) continue;
    const la = karaKomsu[a] as number[];
    const lb = karaKomsu[b] as number[];
    if (!la.includes(b)) la.push(b);
    if (!lb.includes(a)) lb.push(a);
  }

  const yontemTarimsal = ic.yontemler.map((y) => y.tarimsal === true);
  const yontemEkili = ic.yontemler.map((y) => y.tarimsal === true && y.rezerv !== undefined);
  const yontemSulama = ic.yontemler.map((y) => y.sulama === true);
  const turTarimTesisi = ic.tesisTurleri.map((tt) => tt.tarimTesisi === true);
  const tarimsalRezervMal = ic.mallar.map(() => false);
  for (const y of ic.yontemler) {
    if (y.tarimsal === true && y.rezerv !== undefined) {
      const mi = ic.malIndeks[y.rezerv];
      if (mi !== undefined) tarimsalRezervMal[mi] = true;
    }
  }

  return {
    iklim,
    tarim,
    urun: urunler.map((u) => ({ ciktiPpm: u.ciktiPpm, toprakDegisimPpmGun: u.toprakDegisimPpmGun, olayDuyarliligiPpm: u.olayDuyarliligiPpm })),
    gubreMal,
    ayBaslangic,
    gunAyi,
    hasatGunluk,
    karaKomsu,
    yontemTarimsal,
    yontemEkili,
    yontemSulama,
    turTarimTesisi,
    tarimsalRezervMal,
  };
}

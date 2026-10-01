/**
 * Parsel botları: marjinal-net yöntem seçici (G6; docs/arastirma/bot-kurallari-g6-g8.md §5, p4-p5-sartname.md §15.1 B-3, p4-p5-ekonomi.md §1.3-B2).
 *
 * Soru: bir bot n_f gıda fabrikası kuracaksa fabrikaların yöntemleri ne olsun? Aday atamalar BLOKLARDAN oluşur (A2 §5): `standart_gida_isleme` tek başına
 * bir blok (1 tesis), `degirmen + ekmek_firini` bir zincir çifti (2 tesis). Bloklarla n_f tesisi dolduran TÜM kombinasyonlar (k standart + j çift,
 * k + 2j = n_f) değerlendirilir; en yüksek değerli kombinasyon seçilir, eşitlikte ÖNCEKİ blok (varsayılan yöntem) önceliklidir.
 *
 * Karar SAF ve DETERMİNİSTİKTİR (yalnız verilen sayılara bakar; dünyayı okumaz/yazmaz) ve aynı girdide aynı sonucu verir; bot durumsuz kalır.
 *
 * Değer ölçüsü ("marjinal net", fiyat birimi × mili-birim/saat; yalnız KARŞILAŞTIRMA için, ₺ değildir):
 *   portföy neti[mal] = Σ çıktı − Σ girdi (tam kadro, tam verim; zincirde ara mal (un) birbirini götürür),
 *   değer = Σ_{net > 0} min(net, oyuncu dilimi[mal]) × fiyat × ihracat çarpanı − Σ_{net < 0} (−net) × fiyat × ithalat çarpanı − Σ bakım parçası × fiyat × ithalat çarpanı.
 * Oyuncu dilimi = NPC emiliminin oyuncu başına saatlik payı: erken oyunda bağlayıcı kısıt pazar derinliğidir (A2 B2; "ikinci standart tesis doymuş havuzda
 * değersizdir"). Dilimi aşan çıktı değersizdir. Tesis sabit gideri (işletme parası) aynı sayıda tesiste sadeleşir; yerel dükkân satışı G7'dedir (dilime eklenir).
 *
 * `parsel.ts`'e bağımlı DEĞİLDİR.
 */
import type { IcerikBilgisi } from "./tablo";

const PPM = 1_000_000;

/** Seçicinin girdisi (hepsi salt okunur). */
export interface FabrikaSecimGirdisi {
  bilgi: IcerikBilgisi;
  /** Mal indeksi -> fiyat (aynı birim; ölçek önemsiz). */
  fiyat: ArrayLike<number>;
  /** Mal indeksi -> OYUNCU DİLİMİ: NPC emiliminin oyuncu başına saatlik payı (mili-birim/saat; dükkân varsa yerel satış eklenmiş). */
  dilim: ArrayLike<number>;
  ihracatPpm: number;
  ithalatPpm: number;
  /** Fabrika DIŞI portföyün yöntem indeksleri (çiftlik vb.; planlanan dahil). */
  sabit: readonly number[];
  /** Bloklar: her biri bir yöntem indeks listesi (blok sırası = öncelik; ilki varsayılan). */
  bloklar: readonly (readonly number[])[];
  /** Kurulacak fabrika sayısı n_f (≥ 1). */
  fabrikaSayisi: number;
}

/** Portföyün saatlik mal neti (mili-birim/saat; çıktı − girdi). */
export function portfoyNeti(bilgi: IcerikBilgisi, yontemler: readonly number[]): Map<number, number> {
  const net = new Map<number, number>();
  for (const yi of yontemler) {
    const y = bilgi.yontem[yi];
    if (y === undefined) continue;
    for (const [m, q] of y.cikti) net.set(m, (net.get(m) ?? 0) + q);
    for (const [m, q] of y.girdi) net.set(m, (net.get(m) ?? 0) - q);
  }
  return net;
}

/** Portföyün marjinal net değeri (yukarıdaki tanım). */
export function portfoyDegeri(g: Pick<FabrikaSecimGirdisi, "bilgi" | "fiyat" | "dilim" | "ihracatPpm" | "ithalatPpm">, yontemler: readonly number[]): number {
  let deger = 0;
  for (const [m, q] of portfoyNeti(g.bilgi, yontemler)) {
    const fiyat = g.fiyat[m] ?? 0;
    if (q > 0) deger += (Math.min(q, g.dilim[m] ?? 0) * fiyat * g.ihracatPpm) / PPM;
    else if (q < 0) deger -= (-q * fiyat * g.ithalatPpm) / PPM;
  }
  for (const yi of yontemler) for (const [m, q] of g.bilgi.yontem[yi]?.bakim ?? []) deger -= (q * (g.fiyat[m] ?? 0) * g.ithalatPpm) / PPM;
  return deger;
}

/** Atama sonucu: fabrikaların yöntem indeksleri (SIRALI: önce ilk blok tesisleri, sonra sonraki bloklar; çift içinde blok sırası) ve değeri. */
export interface FabrikaAtamasi {
  yontemler: number[];
  deger: number;
  /** Seçilen blok adetleri (blok sırasıyla). */
  adetler: number[];
}

/**
 * Blok adetlerini (Σ adet × blok uzunluğu = n_f) gezer; en yüksek değerli atamayı döndürür. Hiçbir kombinasyon n_f'yi tam doldurmuyorsa null
 * (ör. yalnız 2'lik blok ve n_f = 1). Eşitlikte sözlük sırasında ilk (ilk bloğa daha çok adet) kalır.
 */
export function fabrikaAta(g: FabrikaSecimGirdisi): FabrikaAtamasi | null {
  const n = Math.floor(g.fabrikaSayisi);
  if (n < 1 || g.bloklar.length === 0) return null;
  let en: FabrikaAtamasi | null = null;
  const adet: number[] = new Array<number>(g.bloklar.length).fill(0);
  const gez = (b: number, kalan: number): void => {
    if (b === g.bloklar.length) {
      if (kalan !== 0) return;
      const yontemler = g.bloklar.flatMap((blok, i) => Array.from({ length: adet[i] as number }, () => [...blok]).flat());
      const deger = portfoyDegeri(g, [...g.sabit, ...yontemler]);
      if (en === null || deger > en.deger) en = { yontemler, deger, adetler: [...adet] };
      return;
    }
    const uz = (g.bloklar[b] as readonly number[]).length;
    // İlk bloğa (varsayılan) çok adet önce denenir: eşitlikte o kalır (kesin üstünlük gerekir).
    for (let a = Math.floor(kalan / uz); a >= 0; a--) {
      adet[b] = a;
      gez(b + 1, kalan - a * uz);
    }
    adet[b] = 0;
  };
  gez(0, n);
  return en;
}

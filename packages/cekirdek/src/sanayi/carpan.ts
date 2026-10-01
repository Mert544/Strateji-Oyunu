/**
 * Sanayi çarpanları (B2, docs/08 §0.2-b ve §2.3): ölçek, aşınma cezası, bakım ve kirlilik etkisi.
 * Hepsi saf, tamsayı; çarpan PPM ise sonuç özgün (Tarım v1) değerle birebir aynıdır.
 */
import { icerikTablosu } from "../ekonomi/tablo";
import { carpBol } from "../sabit";
import { oyuncuBul } from "../stok";
import { PPM } from "../tipler";
import type { BolgeDurumu, DerlenmisIcerik, DerlenmisMulkBakim, Dunya, TesisDurumu } from "../tipler";
import { sanayiTablosu } from "./tablo";
import type { SanayiTablosu } from "./tablo";

/** Tesisin ölçek kademesi (0 = S). */
export function olcekKademesi(sn: SanayiTablosu, ts: TesisDurumu): SanayiTablosu["p"]["olcekKademeleri"][number] {
  return sn.p.olcekKademeleri[ts.olcek ?? 0] as SanayiTablosu["p"]["olcekKademeleri"][number];
}

/**
 * Üretim ceza çarpanı (ppm): max(uretimTabani, aşınma x istikrar x kıtlık). `kitlik` (pazar v1, B3; varsayılan PPM = ceza yok)
 * kıtlık çarpanıdır; istikrar B4'te bağlanır (şimdilik PPM). Doğal değişkenlik (iklim, toprak, tükenme) taban dışındadır.
 * Santral elektrik kapasitesi yalnız aşınma cezasını kullanır (`kitlik` verilmez): elektrik kıtlığın girdisidir.
 */
export function cezaCarpani(sn: SanayiTablosu, ts: TesisDurumu, kitlik: number = PPM, tavanPpm?: number): number {
  const asinma = ts.asinmaPpm ?? 0;
  // `tavanPpm` (mülk bakımı C, sartname §5.10): yalnız mülk kipinde ve işletme düğümünde etkin tavan; yoksa `sanayi.bakim` değeri (bit bit eski davranış).
  let c = asinma <= 0 ? PPM : PPM - carpBol(asinma, tavanPpm ?? sn.p.bakim.asinmaVerimKaybiTavaniPpm, PPM);
  if (kitlik !== PPM) c = carpBol(c, kitlik, PPM);
  return c < sn.p.uretimTabaniPpm ? sn.p.uretimTabaniPpm : c;
}

/** Kirliliğin tarımsal çıktıya çarpanı (ppm): PPM - kirlilik x tarimKatsayi. */
export function kirlilikTarimCarpani(sn: SanayiTablosu, b: BolgeDurumu): number {
  const k = b.kirlilikPpm ?? 0;
  return k <= 0 ? PPM : PPM - carpBol(k, sn.p.kirlilik.tarimKatsayiPpm, PPM);
}

/**
 * Devlet istikrar hedefindeki kirlilik cezası (ppm; B4 için hazır alan): kirlilik x istikrarKatsayi / PPM.
 * B2'de hiçbir yerde okunmaz; B4 istikrar hedefinden bunu düşecek.
 */
export function kirlilikIstikrarCezasi(sn: SanayiTablosu, b: BolgeDurumu): number {
  return carpBol(b.kirlilikPpm ?? 0, sn.p.kirlilik.istikrarKatsayiPpm, PPM);
}

/** Bölge sahibinin bakım düzeyi (0..2; sahip yoksa/ayarsızsa normal = 1). */
export function bakimDuzeyiIndeksi(d: Dunya, b: BolgeDurumu): 0 | 1 | 2 {
  if (b.sahip === null) return 1;
  return oyuncuBul(d, b.sahip)?.bakimDuzeyi ?? 1;
}

/** Bakım girdisi ve işletme gideri çarpanı (ppm) = ölçek.bakimPpm x düzey.girdiPpm. */
export function bakimCarpani(sn: SanayiTablosu, ts: TesisDurumu, duzey: 0 | 1 | 2): number {
  const o = olcekKademesi(sn, ts).bakimPpm;
  const g = (sn.p.bakim.duzeyler[duzey] as { girdiPpm: number }).girdiPpm;
  return o === PPM ? g : g === PPM ? o : carpBol(o, g, PPM);
}

/**
 * Mülk kipi bakım ayarı (sartname §5.10): YALNIZ mülk dünyasında (`ic.mulk`) ve işletme düğümünde (`b.merkez`); aksi halde `undefined` (bölge kipi etkilenmez).
 * Blok yokken ya da yalnız kimlik değerleri varken derleme `ic.mulk.bakim` alanını oluşturmaz: her zaman `undefined`.
 */
export function mulkBakim(ic: DerlenmisIcerik, b: BolgeDurumu): DerlenmisMulkBakim | undefined {
  return b.merkez !== undefined ? ic.mulk?.bakim : undefined;
}

/**
 * Bir bakım girdisi kaleminin etkin saatlik miktarı (mili-birim/saat): önce yöntem parça çarpanı (`mulk.bakim.yontemParcaPpm`), sonra ölçek x düzey çarpanı
 * (`bakimCarpani`); iki aşağı yuvarlama. Çarpanlar PPM/tanımsızsa `q0` aynen döner (bit bit eski). Çözümün (`bolgeHesapla`) ve `bakimParcaSaat`ın TEK kaynağı.
 */
export function bakimGirdiMiktari(q0: number, parcaPpm: number | undefined, bakimC: number): number {
  const q = parcaPpm === undefined ? q0 : carpBol(q0, parcaPpm, PPM);
  return bakimC === PPM ? q : carpBol(q, bakimC, PPM);
}

/**
 * Bir tesisin ETKİN bakım girdisi (saatlik, mili-birim; (mal indeksi, miktar) çiftleri, mal indeksine göre sıralı): yöntemin `bakim` girdisi x `mulk.bakim` parça çarpanı
 * (yalnız mülk kipi + işletme düğümü) x ölçek x sahibin bakım düzeyi. Çözümün tükettiği değerle BİREBİR aynıdır (aynı `bakimGirdiMiktari`); sunucu ve istemci
 * "tesis parça ihtiyacı" göstergesini buradan alır. Sanayi kapalıyken ölçek ve düzey çarpanı yoktur (PPM).
 */
export function bakimGirdileriSaat(d: Dunya, ic: DerlenmisIcerik, b: BolgeDurumu, ts: TesisDurumu): [number, number][] {
  const y = icerikTablosu(ic).yontem[ts.yontem];
  if (y === undefined) return [];
  const sn = sanayiTablosu(ic);
  const bakimC = sn === null ? PPM : bakimCarpani(sn, ts, bakimDuzeyiIndeksi(d, b));
  const pp = mulkBakim(ic, b)?.yontemParcaPpm?.[ts.yontem];
  return y.bakim.map(([m, q]): [number, number] => [m, bakimGirdiMiktari(q, pp, bakimC)]);
}

/** Tesisin etkin bakım PARÇASI ihtiyacı (parça/sa, mili-birim): `bakimGirdileriSaat` içinde `parca` malının miktarı; mal yoksa ya da yöntemin bakım girdisinde parça yoksa 0. */
export function bakimParcaSaat(d: Dunya, ic: DerlenmisIcerik, b: BolgeDurumu, ts: TesisDurumu): number {
  const parca = ic.malIndeks["parca"];
  if (parca === undefined) return 0;
  let t = 0;
  for (const [m, q] of bakimGirdileriSaat(d, ic, b, ts)) if (m === parca) t += q;
  return t;
}

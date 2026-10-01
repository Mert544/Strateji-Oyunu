/**
 * Sanayi çarpanları (B2, docs/08 §0.2-b ve §2.3): ölçek, aşınma cezası, bakım ve kirlilik etkisi.
 * Hepsi saf, tamsayı; çarpan PPM ise sonuç özgün (Tarım v1) değerle birebir aynıdır.
 */
import { carpBol } from "../sabit";
import { oyuncuBul } from "../stok";
import { PPM } from "../tipler";
import type { BolgeDurumu, Dunya, TesisDurumu } from "../tipler";
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
export function cezaCarpani(sn: SanayiTablosu, ts: TesisDurumu, kitlik: number = PPM): number {
  const asinma = ts.asinmaPpm ?? 0;
  let c = asinma <= 0 ? PPM : PPM - carpBol(asinma, sn.p.bakim.asinmaVerimKaybiTavaniPpm, PPM);
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

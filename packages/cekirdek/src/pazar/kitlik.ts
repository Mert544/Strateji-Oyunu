/**
 * Kıtlık cezası (B3, docs/08 §5.3 P4): temel ihtiyaç karşılanması düşünce kademeli üretim çarpanı cezası.
 *
 *   temelKarsilanma = min(gıda, yakıt, hane elektriği)      (bölgenin son lojistik çözümünden)
 *   karşılanma >= esik[0]: kademe 0;  >= esik[1]: 1;  >= esik[2]: 2;  aksi: 3
 *   ceza = [0, cezaPpm[0], cezaPpm[1], cezaPpm[2]][kademe]   (en çok %30)
 *
 * Kademe saatlik tıkta güncellenir: kötüleşme anında; iyileşme `toparlanmaSaat`'te bir kademe (toparlanma ataleti).
 * Ceza çıktı çarpanı zincirine girer (docs/08 §0.2-b): `max(uretimTabani, asinma x kitlik)`; santral elektrik kapasitesi
 * etkilenmez (elektrik kıtlığın girdisidir; sarmalı önlemek için). Sahipsiz (uykudaki) bölgede kademe donar.
 */
import type { KitlikParametreleri } from "@bolge/veri";
import { oyuncuBul } from "../stok";
import { PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya } from "../tipler";
import { pazarTablosu } from "./tablo";

type Kademe = 0 | 1 | 2 | 3;

/** Karşılanma oranından hedef kademe. */
export function kitlikHedefKademesi(k: KitlikParametreleri, karsilanmaPpm: number): Kademe {
  if (karsilanmaPpm >= k.esikPpm[0]) return 0;
  if (karsilanmaPpm >= k.esikPpm[1]) return 1;
  if (karsilanmaPpm >= k.esikPpm[2]) return 2;
  return 3;
}

/** Kademenin üretim çarpanı cezası (ppm). */
export function kitlikCezasiPpm(k: KitlikParametreleri, kademe: Kademe): number {
  return kademe === 0 ? 0 : (k.cezaPpm[kademe - 1] as number);
}

/** Bölgenin kıtlık çıktı çarpanı (ppm): PPM - ceza. Pazar v1 kapalıysa veya kademe 0 ise PPM (çıktıya hiç uygulanmaz). */
export function kitlikCarpani(ic: Baglam["ic"], b: BolgeDurumu): number {
  const kademe = b.kitlikKademesi;
  if (kademe === undefined || kademe === 0) return PPM;
  const pz = pazarTablosu(ic);
  if (pz === null) return PPM;
  return PPM - kitlikCezasiPpm(pz.p.kitlik, kademe);
}

/**
 * Temel ihtiyaç karşılanması (ppm): gıda, yakıt (nüfus ve ordu talebi varsa) ve hane elektriği (bölgede aktif santral varsa)
 * karşılanmasının en küçüğü. `elektrik`: hane karşılanması ya da şebekesiz bölgede null.
 */
export function temelKarsilanmaHesapla(gida: number, yakit: number | null, elektrik: number | null): number {
  let k = gida;
  if (yakit !== null && yakit < k) k = yakit;
  if (elektrik !== null && elektrik < k) k = elektrik;
  return k;
}

/**
 * Saatlik tık: her sahipli bölgenin kıtlık kademesini `temelKarsilanmaPpm`'e göre günceller. Pazar v1 kapalıysa hiçbir şey yapmaz.
 * Kötüleşme (hedef > kademe) anında uygulanır; iyileşme (hedef < kademe) son değişimden `toparlanmaSaat` sonra bir kademe düşer.
 */
export function kitlikTik(d: Dunya, ctx: Baglam): void {
  const pz = pazarTablosu(ctx.ic);
  if (pz === null) return;
  const k = pz.p.kitlik;
  const t = d.zaman;
  for (const b of d.bolgeler) {
    if (b.sahip === null || b.kitlikKademesi === undefined) continue;
    const hedef = kitlikHedefKademesi(k, b.temelKarsilanmaPpm ?? PPM);
    const mevcut = b.kitlikKademesi;
    if (hedef > mevcut) {
      b.kitlikKademesi = hedef;
      b.kitlikT = t;
    } else if (hedef < mevcut && t - (b.kitlikT ?? 0) >= k.toparlanmaSaat * SAAT) {
      b.kitlikKademesi = (mevcut - 1) as Kademe;
      b.kitlikT = t;
    }
  }
}

/** Oyuncunun bölgelerinde en yüksek kıtlık kademesi (ölçüm ve bot için; pazar kapalıysa 0). */
export function enYuksekKitlikKademesi(d: Dunya, oyuncu: string): number {
  if (oyuncuBul(d, oyuncu) === undefined) return 0;
  let en = 0;
  for (const b of d.bolgeler) if (b.sahip === oyuncu && (b.kitlikKademesi ?? 0) > en) en = b.kitlikKademesi ?? 0;
  return en;
}

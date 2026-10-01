/**
 * Ekonomi alt sistemi: saatlik tık, komutlar ve inşaat tamamlanması.
 * Motor bu dosyadaki üç fonksiyonu çağırır; ayrıntılar pazar/nufus/komut/insaat/uretim dosyalarındadır.
 */
import { nufusTik } from "./nufus";
import { pazarEmirleriniGerceklestir, pazarFiyatlari } from "./pazar";
import { sanayiGunluk, sanayiSaatlik } from "../sanayi";
import { GUN } from "../tipler";
import type { Baglam, Dunya } from "../tipler";

export { ekonomiKomutu } from "./komut";
export { insaatBitti } from "./insaat";

/**
 * Saatlik tık: (1) pazar emirleri gerçekleşir, (2) fiyatlar, (3) nüfus; sonunda ctx.kirlet().
 * Bozulma, rezerv tükenmesi ve vergi geliri lojistik çözümde (oran olarak) işlenir; çözüm aynı t'de koşar.
 */
export function saatlikTik(d: Dunya, ctx: Baglam): void {
  pazarEmirleriniGerceklestir(d, ctx);
  pazarFiyatlari(d, ctx);
  nufusTik(d, ctx);
  // Sanayi (B2; kapalıyken hiçbir şey yapmaz): saatlik emisyon, her sim-günü başında aşınma ve kirlilik yayılımı/sönümü.
  if (ctx.ic.param.sanayi !== undefined) {
    sanayiSaatlik(d, ctx);
    if (d.zaman > 0 && d.zaman % GUN === 0) sanayiGunluk(d, ctx);
  }
  ctx.kirlet(d);
}

/**
 * Sanayi katmanı (B2, docs/08 §2): elektrik ve brownout, ölçek kademesi, bakım düzeyi ve aşınma, kirlilik, damar
 * tükenmesi ve keşif sondajı. Motor yalnızca `sanayiKomutu`, `sondajBitti`, `sanayiSaatlik` ve `sanayiGunluk`'ü çağırır;
 * üretim çarpanı zinciri ve elektrik uygulaması ekonomi/uretim.ts içindedir.
 */
export { sanayiKomutu } from "./komut";
export { genelOnarimGorunumu } from "./onarim";
export { sondajGorunumu, sondajOyuncuGorunumu } from "./sondaj";
export { sondajBitti } from "./damar";
export { sanayiSaatlik, sanayiGunluk } from "./gunluk";
export { elektrikDagit } from "./elektrik";
export type { ElektrikSonucu } from "./elektrik";
export { sanayiTablosu, akarsuCarpani } from "./tablo";
export type { SanayiTablosu } from "./tablo";
export { cezaCarpani, kirlilikTarimCarpani, kirlilikIstikrarCezasi, olcekKademesi, bakimCarpani, mulkBakim, bakimGirdiMiktari, bakimGirdileriSaat, bakimParcaSaat } from "./carpan";

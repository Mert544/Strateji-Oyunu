/**
 * @bolge/cekirdek genel API'si.
 * Botlar ve ölçüm takımı yalnızca buradan içe aktarır.
 */
export * from "./tipler";
export { Simulasyon } from "./motor";
export { anlikMiktar, anlikHazine } from "./stok";
export { carpBol } from "./sabit";
export { durumOzeti } from "./ozet";

// --- Çekirdek motor (Ajan B) ---
export { SISTEM_OYUNCUSU } from "./motor";
export { BaglamUygulamasi } from "./baglam";
export { icerikDerle } from "./derle";
export { dunyaKur } from "./kurulum";
export {
  stokUzlastir,
  stokUzlastirYerel,
  stokEsikMesafesi,
  stokEsikPlanla,
  stokOranAyarla,
  stokGelenEkle,
  stokEkle,
  oyuncuBul,
  hazineUzlastir,
  hazineOranAyarla,
  hazineEkle,
} from "./stok";
export { prngOlustur, sonraki as prngSonraki, aralik as prngAralik, fnv1a32 } from "./prng";
export { kuyrukEkle, kuyrukCikar, kuyrukBas } from "./kuyruk";
export { tabanBol, carpBolTavan, tamsayiKarekok, kelepce, ppmUygula } from "./sabit";
export { kanonikSerilestir, fnv1a64 } from "./ozet";
export { sureCarpaniPpm, hizlandirilmisSure } from "./erkenOyun";
export { teknolojiYayilimiPpm } from "./teknoloji";

// --- Tarım katmanı (B1) ---
export { iklimGunluk, takvimGunu, takvimAyi, mutlakTakvimGunu, hasatEnterpole, hasatGunlukNormallestir, tarimTablosu, tarimCiktiCarpani } from "./tarim";
export type { TarimTablosu } from "./tarim";

// --- Sanayi katmanı (B2) ---
export {
  sanayiKomutu,
  sondajBitti,
  sanayiSaatlik,
  sanayiGunluk,
  elektrikDagit,
  sanayiTablosu,
  akarsuCarpani,
  cezaCarpani,
  kirlilikTarimCarpani,
  kirlilikIstikrarCezasi,
  olcekKademesi,
  bakimCarpani,
} from "./sanayi";
export type { SanayiTablosu, ElektrikSonucu } from "./sanayi";
export { rezervVerimi } from "./ekonomi/uretim";

// --- Pazar katmanı (B3) ---
export {
  pazarEmirleriniGerceklestir,
  pazarFiyatlari,
  npcHacimleri,
  pazarTablosu,
  npcLikiditeOlcekPpm,
  ticaretCarpanlari,
  ihracatKirilimi,
  ithalatKirilimi,
  ticaretNakitCarpanlari,
  ticaretKorumasindaMi,
  sifirKalemler,
  kitlikHedefKademesi,
  kitlikCezasiPpm,
  kitlikCarpani,
  kitlikTik,
  temelKarsilanmaHesapla,
  enYuksekKitlikKademesi,
  ticaretDefteriBaslat,
} from "./pazar";
export type { PazarTablosu, TicaretCarpanlari, TicaretKirilimi } from "./pazar";
export { pazarCarpanlari, oyuncuMakasPpm } from "./politika";

// --- Serileştirme ve anlık görüntü (F1, docs/06 §14) ---
export {
  dunyaSerilestir,
  dunyaCoz,
  dunyaDogrula,
  dunyaIcerikUyumu,
  kuralSurumuHesapla,
  anlikGoruntuOlustur,
  anlikGoruntuCoz,
  ANLIK_GORUNTU_SURUMU,
  SerilestirmeHatasi,
} from "./serilestir";
export type { AnlikGoruntu } from "./serilestir";
export { PRNG_AKISLARI } from "./kurulum";
export { kuyrukOnce } from "./kuyruk";

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
export type { KurtarmaSecenegi } from "./motor";
export { BaglamUygulamasi } from "./baglam";
export { icerikDerle, hucreKarmasi } from "./derle";
export { AD_KURALI, adKanonik, adSozdizimiHatasi } from "./ad";
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
export { ikmalTalebi } from "./askeri/uretim";
export { savunmaGucuGorunumu } from "./askeri/savas";
export type { SavunmaGucuGorunumu } from "./askeri/savas";
export { eskiyaIlceGorunumu, eskiyaOyuncuGorunumu, yagmaTavaniUygula } from "./askeri/eskiya";
export { revirKapasiteRezervi } from "./askeri/durum";

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
  anlikGoruntuOlusturOzetli,
  anlikGoruntuCoz,
  anlikGoruntuUyarla,
  ANLIK_GORUNTU_SURUMU,
  ANLIK_GORUNTU_ESKI_SURUMU,
  SerilestirmeHatasi,
} from "./serilestir";
export type { AnlikGoruntu, GocRaporu, GocSecenegi } from "./serilestir";
// Para güvenliği (docs/06 §15.7): komut alan sözlüğü, ödül, para sayaçları, kamu kasaları ve kamu NPC alıcısı
export { KOMUT_SEMASI, SISTEM_ALAN_TURLERI, sistemKomutuMu } from "./komutSemasi";
export type { AlanTuru } from "./komutSemasi";
export { odulDegeri, alinanOdulDegeri } from "./odul";
export { sayacOlcekli, paraAcikMi } from "./paraSayac";
export type { HazineKalemi } from "./paraSayac";
export {
  kasaBul,
  kasaBakiyesi,
  kasaGirisi,
  kamuAlici,
  kamuOdenekRezerv,
  kamuOdenekIptal,
  kamuOdenekOde,
  kamuFiyatTavani,
  kamuFiyatGecerli,
  paraUzlastir,
  dugumIlcesi,
} from "./mulk/kasa";
// Perakende (G7-2, sartname §6.8): saf okuma API'si (durumu değiştirmez; arayüz, ölçüm ve kare alanları için)
export { dukkanSatisMili, yerelPazarGorunumu, ilceYasamGorunumu } from "./mulk/perakende";
export { ADSIZ_MARKA, ilcedeDukkanSayisi } from "./mulk/dukkanKomut";
export type { DukkanGorunumu, YerelYuvaGorunumu, IlceYasamGorunumu } from "./mulk/perakende";
// Kalıcı kimlik ve içerik göçü (G8, docs/06 §14): kimlik tablosu, yalnız-ekle denetimi
export {
  KIMLIK_TABLOSU_ADLARI,
  icerikKimlikTablosuOlustur,
  kimlikTablolariEsit,
  yalnizEkleDenetimi,
} from "./goc";
export type { EkleDenetimi, EkleIhlali, IcerikKimlikTablosu, KimlikTablosuAdi } from "./goc";
export { PRNG_AKISLARI } from "./kurulum";
export { kuyrukOnce } from "./kuyruk";
// Mülk kipi (S3, docs/11 §4.3, §7): parsel komutları, işletme düğümleri, arazi vergisi, inşaat aşaması
export {
  mulkKomutu,
  parselFiyati,
  hucreFiyatiMili,
  parselToplamFiyatiMili,
  isletmeAl,
  araziVergisiSaat,
  INSAAT_ASAMALARI,
  insaatAsamasi,
  hucreBul,
  hucreXY,
  kenarBitisikMi,
  ilceBul,
  ilceHucreSayisi,
  isletmeBul,
  isletmeKimligi,
  mulkOyuncuBul,
  yurtPlanla,
  // Kamu arsası (docs/06 §15.6)
  kamuBilgisi,
  kamuBloklari,
  kamuHucreMi,
  kamuHucreleri,
  kamuIlKimligi,
  kamuIlceKimligi,
  kamuMahalleKimligi,
  kamuSahibiMi,
  AyrilmisKumesi,
  HucreDizini,
  HucreDiziniBuyukHatasi,
  TEMBEL_HUCRE_SINIRI,
  hucreKarmasiXY,
  ekYapiSayisi,
  ekYapiToplami,
  ticaretEmirYuvasi,
  ticaretIndirimi,
} from "./mulk";
export type { InsaatAsamasi, YurtPlani, IlceFiyatDurumu, HucreHaritasi, HucreKaydi } from "./mulk";
export { bolgeIndeksiBul, haritaIndeksi, komsuKenarlariBul } from "./dugum";
export { kuyrukSuz } from "./kuyruk";
export { eskimisEsikleriBuda } from "./stok";

export { kamuSiparisGorunumu, kamuTeslimGorunumu } from "./mulk/kamuSiparis";

export { meclisGorunumu } from "./mulk/meclis";

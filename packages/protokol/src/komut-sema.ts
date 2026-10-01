/**
 * Çekirdek `Komut` birliğinin zod şeması (istemciden gelen niyet). Yalnız BİÇİM denetlenir (tür, alan tipi, uzunluk
 * tavanları); oyun kuralları (aralıklar, sahiplik, para) çekirdekte `Simulasyon.uygula` içinde doğrulanır.
 *
 * - Bilinmeyen alanlar ATILIR (zod varsayılanı `strip`): istemci `t` veya `oyuncu` gönderse bile günlüğe girmez;
 *   zamanı ve oyuncuyu sunucu basar.
 * - Tip eşitliği derleme zamanında denetlenir (`_KomutDenetimi`): çekirdekte `Komut`'a tür/alan eklenince bu dosya
 *   derlenmez, şema güncellenmelidir.
 */
import { z } from "zod";
import type { Komut } from "@bolge/cekirdek";

/** Kimlik dizeleri (bölge, mal, tesis türü...) için üst sınır: kötü niyetli dev dizeleri günlüğe sokmamak için. */
const KIMLIK_EN_UZUN = 64;
/** Dizi alanları (bölge listesi, ekim payları) için üst sınır. */
const DIZI_EN_UZUN = 64;

const kimlik = z.string().min(1).max(KIMLIK_EN_UZUN);
const tamsayi = z.number().int().safe();
const anlasma = z.enum(["ticaret", "ortak_altyapi"]);

export const KomutSemasi = z.discriminatedUnion("tur", [
  // Ekonomi
  z.object({ tur: z.literal("tesis_insa"), bolge: kimlik, tesisTuru: kimlik }),
  z.object({ tur: z.literal("yontem_degistir"), bolge: kimlik, tesis: tamsayi, yontem: kimlik }),
  z.object({ tur: z.literal("tesis_durum"), bolge: kimlik, tesis: tamsayi, aktif: z.boolean() }),
  z.object({ tur: z.literal("ticaret_emri"), bolge: kimlik, mal: kimlik, yon: z.enum(["ihracat", "ithalat"]), oranSaat: tamsayi }),
  z.object({ tur: z.literal("vergi_ayarla"), oranPpm: tamsayi }),
  // Tarım
  z.object({ tur: z.literal("ekim_plani"), bolge: kimlik, ekimPpm: z.array(tamsayi).max(DIZI_EN_UZUN) }),
  z.object({ tur: z.literal("gubre_dozu"), bolge: kimlik, doz: tamsayi }),
  // Sanayi
  z.object({ tur: z.literal("tesis_olcek_yukselt"), bolge: kimlik, tesis: tamsayi, olcek: z.union([z.literal(1), z.literal(2)]) }),
  z.object({ tur: z.literal("genel_onarim"), bolge: kimlik }),
  z.object({ tur: z.literal("bakim_duzeyi"), duzey: z.union([z.literal(0), z.literal(1), z.literal(2)]) }),
  z.object({ tur: z.literal("arama_sondaji"), bolge: kimlik, mal: kimlik }),
  // Lojistik
  z.object({ tur: z.literal("kenar_gelistir"), kenar: tamsayi }),
  z.object({ tur: z.literal("askeri_rezerv"), oranPpm: tamsayi }),
  // Askeri
  z.object({ tur: z.literal("birlik_uret"), bolge: kimlik, birlik: kimlik, adet: tamsayi }),
  z.object({ tur: z.literal("savas_ilan"), saldiranBolge: kimlik, hedefBolge: kimlik }),
  z.object({ tur: z.literal("savunma_emri"), bolge: kimlik, durus: z.enum(["normal", "savunma", "geri_cekil"]) }),
  // Teknoloji
  z.object({ tur: z.literal("arastir"), teknoloji: kimlik }),
  // Politika
  z.object({ tur: z.literal("anlasma_teklif"), karsi: kimlik, anlasma }),
  z.object({ tur: z.literal("anlasma_feshet"), karsi: kimlik, anlasma }),
  z.object({ tur: z.literal("yaptirim"), hedef: kimlik, aktif: z.boolean() }),
  // Mülk kipi (S3). Hücre kimliği "x:y" (z20 karo). Coğrafi geçerliliği çekirdek fikstürle denetler.
  z.object({ tur: z.literal("parsel_al"), ilce: kimlik, hucreler: z.array(kimlik).max(DIZI_EN_UZUN), sinif: z.enum(["kirsal", "kasaba", "sehir"]) }),
  z.object({ tur: z.literal("tesis_insa_hucre"), ilce: kimlik, tesisTuru: kimlik, hucreler: z.array(kimlik).max(3) }),
  z.object({ tur: z.literal("insaat_iptal"), insaat: tamsayi }),
  z.object({
    tur: z.literal("yapi_yerlestir"),
    ilce: kimlik,
    tesisTuru: kimlik,
    hucreler: z.array(kimlik).max(3),
    sinif: z.enum(["kirsal", "kasaba", "sehir"]),
  }),
  z.object({ tur: z.literal("parsel_birak"), ilce: kimlik, hucreler: z.array(kimlik).max(DIZI_EN_UZUN) }),
  // Sistem (yalnız yönetici kimliğiyle; sunucu "sistem" oyuncusu olarak damgalar; mülk kipinde bolgeler boş; isteğe bağlı `ilce`: bedava yurdun ilçesi)
  z.object({ tur: z.literal("oyuncu_katil"), oyuncu: kimlik, bolgeler: z.array(kimlik).max(DIZI_EN_UZUN), ilce: kimlik.optional() }),
]);

// Derleme zamanı denetimi: şemanın çıkarsanan tipi çekirdek `Komut` ile birebir aynı olmalı.
type Esit<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const _KomutDenetimi: Esit<z.infer<typeof KomutSemasi>, Komut> = true;
void _KomutDenetimi;

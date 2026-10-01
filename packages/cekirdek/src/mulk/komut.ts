/**
 * Mülk komutları (S3, docs/11 §7.2–§7.3): parsel_al, tesis_insa_hucre, yapi_yerlestir, parsel_birak, insaat_iptal.
 *
 * Hepsi ya da hiçbiri: tüm denetimler önce yapılır, sonra durum değişir; başarısız komut dünyayı (hazinenin temsili dahil)
 * değiştirmez (docs/06 §14 başarısız komut sözleşmesi). Mülk kipi kapalıysa her mülk komutu reddedilir.
 *
 * - parsel_al {ilce, hucreler, sinif}: hücreler fikstürde bu ilçede, uygun, KAMU ARSASI OLMAYAN (docs/06 §15.6) ve komuttaki
 *   sınıfta olmalı, kimseye ait olmamalı, tekrarlanmamalı. Sınır: oyuncu ilçede en çok `ilceHucreTavani` (72) hücre ve uygun hücrelerin en çok `ilcePayTavaniPpm`
 *   (%25) kadarı. Fiyat hücre başına artımlı: k. hücre için taban[sınıf] × (1 + 2 × (satılmış + k) / uygun), tamsayı
 *   (aşağı yuvarlanır; mili-para). Toplu alım indirim yaratmaz. İlk parsel ilde (oyuncu, il) işletme düğümünü açar.
 *   Bitişiklik (Earth2 kuralı) sunucunun coğrafi doğrulamasındadır; çekirdek denetlemez.
 * - tesis_insa_hucre {ilce, tesisTuru, hucreler}: hücreler oyuncunun, bu ilçede, boş (tesis ve süren inşaat yok) ve sayısı
 *   türün yuvasına eşit olmalı. Mevcut inşaat mekanizması: maliyet işletme stoğundan ve hazineden düşer, süre
 *   `mulk.yapiInsaSaati` (yoksa içerik süresi) × erken oyun çarpanı; `insaat_bitti` tesisi işletme düğümüne kurar.
 *   Oyuncu başına aynı anda en çok `esZamanliInsaat` hücreli inşaat. `tesisTuru` bir EK YAPI kimliği de olabilir
 *   (`mulk.ekYapilar`: ambar, ticaret_ofisi, muhtarlik, konut, garaj, atolye_lab; `mulk/yapi.ts`): ilde en çok
 *   `enFazlaIlBasina` (biten + süren); inşaat `ekYapi` taşır, bitince düğümün `ekYapilar` listesine yazılır. Yeni oyuncu:
 *   ilk `indirimliYapiSayisi` yapıda (ek yapılar dahil) para ve malzeme `ilkYapiIndirimPpm` kadar indirimlidir; iptalde hak geri verilir.
 *   parsel_al: `ayrilmis` hücreler yalnız katılımının ilk `ayrilmisGun` gününde olan oyunculara satılır.
 *   Yapı hücreleri 1–3 hücre, yuva sayısınca ve KENAR-BİTİŞİK (4 komşuluk, tek bağlı küme) olmalıdır.
 * - yapi_yerlestir {ilce, tesisTuru, hucreler, sinif}: arsa + yapı tek atomik işlem. `hucreler` yapının tüm hücreleridir
 *   (yuva sayısınca, kenar-bitişik); oyuncunun olmayan sahipsiz hücreler `sinif` sınıfında `parsel_al` kurallarıyla (sınırlar,
 *   ayrılmış hücre, artımlı fiyat) satın alınır, sonra `tesis_insa_hucre` kurallarıyla inşaat başlar. Arsa ve yapı bedeli tek
 *   hazine denetiminden geçer; ilde işletme yoksa aynı komutla açılır (etiket/rezerv il merkezinden, malzeme açılış kitinden
 *   denetlenir). Herhangi bir denetim başarısızsa hiçbir şey değişmez (başarısız komut yan etkisiz kuralı).
 *   İsteğe bağlı `siniflar` (hücrelerle aynı uzunluk; `siniflar[i]`, `hucreler[i]`'nin sınıfı): verilirse her sahipsiz hücre KENDİ
 *   sınıfında denetlenir ve fiyatlanır (iki sınıfa düşen yapı tek komutta atomik alınır); `sinif` yalnız geçerli bir değer olmalıdır, kullanılmaz.
 *   Sahip olunan hücrelerin sınıfı denetlenmez (bugünkü `sinif` davranışı gibi). Verilmezse `sinif` davranışı birebir aynıdır.
 * - Dükkân (G7; sartname §7, §9; `mulk/dukkanKomut.ts`): `tesis_insa_hucre` ve `yapi_yerlestir`'e `dukkanTuru` (tesisTuru `dukkan` iken zorunlu, değilken yasak; DUK-01…DUK-06), ilçe sınırı
 *   `perakende.ilceBasinaEnFazla` (biten + süren); inşaat `InsaatDurumu.dukkanTuru` taşır, `ekYapiTamamla` dükkân durumunu kurar. `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`,
 *   `dukkan_marka`, `dukkan_yik` (iade YOK; arsa oyuncuda kalır) `perakendeKomutu`'na devredilir; `perakende` bloğu yokken hepsi `perakende kapali` (DUK-00).
 * - parsel_birak {ilce, hucreler}: oyuncunun, üzerinde yapı ya da inşaat olmayan hücreleri; hücre bedelinin
 *   `parselBirakIadePpm`'i (%70) hazineye iade edilir, hücreler sahipsiz olur; arazi değeri, ilçe hücre sayacı ve ilçenin
 *   `satilmisHucre`'si düşer (fiyat çarpanı geri iner). Yurt hücrelerinin bedeli 0'dır (iade 0). İşletme düğümü kalır.
 * - insaat_iptal {insaat}: oyuncunun süren hücreli inşaatı; ödenen paranın ve malzemenin `insaatIptalIadePpm` (%50) kadarı
 *   iade edilir (malzeme depo kapasitesini aşarsa fazlası iade edilmez), hücreler boşalır. Planlı `insaat_bitti` olayı
 *   kuyrukta kalır ve işlendiğinde inşaatı bulamadığı için etkisizdir.
 */
import { maliyetYeterliMi, maliyetiDus } from "../ekonomi/maliyet";
import { icerikTablosu } from "../ekonomi/tablo";
import { hizlandirilmisSure } from "../erkenOyun";
import { carpBol } from "../sabit";
import { sanayiTablosu } from "../sanayi/tablo";
import { anlikHazine, hazineEkle, oyuncuBul, stokEkle } from "../stok";
import { tesisTuruAcikMi, yontemAcikMi } from "../teknoloji";
import { GUN, PPM, SAAT } from "../tipler";
import type {
  ArsaSinifi,
  Baglam,
  BolgeDurumu,
  DerlenmisEkYapi,
  DerlenmisIcerik,
  DerlenmisMulk,
  Dunya,
  HucreDurumu,
  IlceDurumu,
  InsaatDurumu,
  KomutSonucu,
  Mili,
  MulkDurumu,
  MulkKomutu,
  OyuncuId,
  TesisDurumu,
} from "../tipler";
import type { MulkParametreleri } from "@bolge/veri";
import {
  dizgeKarsilastir,
  hucreBul,
  hucreEkle,
  hucreSil,
  ilceBul,
  ilceHucreEkle,
  ilceHucreSayisi,
  isletmeBul,
  isletmeKimligi,
  isletmesiVarMi,
  kenarBitisikMi,
  mulkOyuncuAl,
  mulkOyuncuBul,
} from "./durum";
import { dukkanKurulumDenetimi, ilcedeDukkanSayisi, perakendeKomutu } from "./dukkanKomut";
import { isletmeAl } from "./isletme";
import { kamuBilgisi } from "./kamu";
import { ekYapiSayisi } from "./yapi";

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

const TAMAM: KomutSonucu = { tamam: true };

/** `parsel_birak` iadesi (ppm); `mulk.parselBirakIadePpm` yoksa %70. */
const PARSEL_BIRAK_IADE_VARSAYILAN = 700_000;

const SINIFLAR: readonly ArsaSinifi[] = ["kirsal", "kasaba", "sehir"];

/** Hücre listesini denetler: dize dizisi, boş değil, en çok `tavan` eleman, tekrarsız. Sıralı kopyasını ya da hatayı döndürür. */
function hucreListesi(hucreler: unknown, tavan: number): string[] | string {
  if (!Array.isArray(hucreler) || hucreler.length === 0) return "hucre listesi bos olamaz";
  if (hucreler.length > tavan) return `en cok ${tavan} hucre verilebilir`;
  for (const h of hucreler) if (typeof h !== "string") return `gecersiz hucre kimligi: ${String(h)}`;
  const sirali = [...(hucreler as string[])].sort(dizgeKarsilastir);
  for (let i = 1; i < sirali.length; i++) if (sirali[i] === sirali[i - 1]) return `tekrarlanan hucre: ${sirali[i] as string}`;
  return sirali;
}

/**
 * Parsel fiyatı (mili-para): `adet` hücre, ilçede şu an `satilmis` / `uygun` satılmışken. k. hücre (0'dan):
 * taban × (PPM + carpanPpm × (satilmis + k) / uygun) / PPM, aşağı yuvarlanır.
 */
export function parselFiyati(taban: Mili, carpanPpm: number, satilmis: number, uygun: number, adet: number): Mili {
  let toplam = 0;
  for (let k = 0; k < adet; k++) {
    const pay = uygun > 0 ? carpBol(carpanPpm, satilmis + k, uygun) : 0;
    toplam += carpBol(taban, PPM + pay, PPM);
  }
  return toplam;
}

/** Fiyat için ilçe durumu (dünya `IlceDurumu`sunun fiyatı belirleyen alanları). */
export type IlceFiyatDurumu = Pick<IlceDurumu, "uygunHucre" | "satilmisHucre" | "ayrilmisSatilmis">;

function hucreFiyatiParametreyle(p: MulkParametreleri, ilce: IlceFiyatDurumu, sinif: ArsaSinifi, k: number, ayrilmis: boolean): Mili {
  const taban = p.hucreFiyati[sinif];
  // Ayrılmış hücre (docs/06 §15.7): taban (sınıf) fiyatından, satış payı çarpanından muaf; ilçe eğrisini ilerletmez.
  if (ayrilmis) return taban;
  return parselFiyati(taban, p.satisPayiCarpaniPpm, ilce.satilmisHucre - (ilce.ayrilmisSatilmis ?? 0) + k, ilce.uygunHucre, 1);
}

/**
 * ARSA (hücre) FİYATI için TEK KAYNAK (mili-para): ilçe şu anki durumundayken (`satilmisHucre`, `ayrilmisSatilmis`, `uygunHucre`) `sinif` sınıfında
 * k. (0'dan) hücrenin fiyatı. `ayrilmis` ise AYRILMIŞ hücredir: taban fiyat, ilçe eğrisinden muaf (k yok sayılır). Normal hücrede eğri
 * `satilmisHucre − ayrilmisSatilmis + k` üzerinden ilerler (ayrılmış alımlar eğriyi ilerletmez). Komut yolu (`parsel_al`, `yapi_yerlestir`), botlar,
 * ölçüm ve istemci tahmini bunu kullanmalıdır. Mülk kipi kapalıysa RangeError.
 */
export function hucreFiyatiMili(ic: DerlenmisIcerik, ilce: IlceFiyatDurumu, sinif: ArsaSinifi, k = 0, ayrilmis = false): Mili {
  const p = ic.mulk?.p;
  if (p === undefined) throw new RangeError("hucreFiyatiMili: mulk kipi kapali");
  return hucreFiyatiParametreyle(p, ilce, sinif, k, ayrilmis);
}

/** `normalAdet` normal + `ayrilmisAdet` ayrılmış hücrenin toplam fiyatı (aynı komutta alınırlarsa): `hucreFiyatiMili` toplamı. */
export function parselToplamFiyatiMili(ic: DerlenmisIcerik, ilce: IlceFiyatDurumu, sinif: ArsaSinifi, normalAdet: number, ayrilmisAdet = 0): Mili {
  let t = 0;
  for (let k = 0; k < normalAdet; k++) t += hucreFiyatiMili(ic, ilce, sinif, k, false);
  for (let k = 0; k < ayrilmisAdet; k++) t += hucreFiyatiMili(ic, ilce, sinif, k, true);
  return t;
}

/** Ayrılmış hücre sahipliği hatası iletisi için gün sayısı. */
function ayrilmisGun(mk: DerlenmisMulk): number {
  return Math.floor(mk.ayrilmisSureMs / GUN);
}

/** Satın alma planı: denetlenmiş hücre listesi ve toplam fiyat (dünyayı değiştirmez). */
interface AlimPlani {
  ilce: IlceDurumu;
  liste: string[];
  /** `liste` ile hizalı: her hücrenin alım sınıfı (tek sınıflı alımda hepsi aynıdır). */
  siniflar: ArsaSinifi[];
  fiyat: Mili;
  /** Listedeki AYRILMIŞ hücre sayısı: taban fiyattan satılır, satış payı çarpanından muaftır (docs/06 §15.7). */
  ayrilmis: number;
}

/**
 * `parsel_al` denetimleri (hazine dışında): hücreler fikstürde bu ilçede, uygun, komut sınıfında, sahipsiz, ayrılmışsa
 * yeni oyuncu; ilçe başına 72 / %25 sınırı; ilçede yeterli boş hücre. `liste` sıralı ve tekrarsız olmalıdır.
 */
function alimPlani(d: Dunya, mk: DerlenmisMulk, oyuncu: OyuncuId, ilce: IlceDurumu, liste: string[], sinif: ArsaSinifi | readonly ArsaSinifi[]): AlimPlani | string {
  const p = mk.p;
  // Tek sınıf (tüm hücreler aynı) ya da hücre başına sınıf (`liste` ile hizalı).
  const siniflar: ArsaSinifi[] = typeof sinif === "string" ? liste.map(() => sinif) : [...sinif];
  if (siniflar.length !== liste.length) return `siniflar hucrelerle ayni uzunlukta olmali (${siniflar.length} / ${liste.length})`;
  // Ayrılmış hücreler (yeni oyuncu hakkı): yalnız katılımının ilk `ayrilmisGun` gününde olanlara satılır.
  const katilma = oyuncuBul(d, oyuncu)?.katilmaZamani;
  const yeniOyuncuMu = katilma !== undefined && d.zaman < katilma + mk.ayrilmisSureMs;
  const mo0 = mulkOyuncuBul(d, oyuncu);
  // Çok hesaplı alıcıya karşı (docs/06 §15.1): ayrılmış hücre yalnız KATILIM ilçesinde satılır (kural parametreyle açıksa).
  const yalnizKatilimIlcesi = p.yeniOyuncu.ayrilmisYalnizKatilimIlcesi === true;
  for (let i = 0; i < liste.length; i++) {
    const id = liste[i] as string;
    const sn = siniflar[i] as ArsaSinifi;
    const f = mk.hucreler.get(id);
    if (f === undefined || f.ilce !== ilce.id) return `hucre bu ilcede degil: ${id}`;
    if (!f.hucre.uygun) return `hucre satin alinamaz (${f.hucre.engel ?? "uygun degil"}): ${id}`;
    // Kamu arsası (docs/06 §15.6) satılmaz: mahalle paketi, ilçe merkezi, kıyı şeridi, hazine rezervi.
    const kamu = kamuBilgisi(d, ilce.id, id);
    if (kamu !== undefined) return `hucre kamu arsasi (satilmaz): ${id} (${kamu.tur}, ${kamu.sahip})`;
    if (f.hucre.sinif !== sn) return `hucre sinifi uyusmuyor: ${id} (${f.hucre.sinif}, komut ${sn})`;
    const sahipli = hucreBul(d, id);
    if (sahipli !== undefined) return `hucre zaten sahipli: ${id} (${sahipli.sahip})`;
    if (!yeniOyuncuMu && mk.ayrilmis.has(id)) return `hucre yeni oyunculara ayrilmis (katilimin ilk ${ayrilmisGun(mk)} gunu): ${id}`;
    if (yalnizKatilimIlcesi && mk.ayrilmis.has(id) && mo0?.katilimIlcesi !== ilce.id) {
      return `ayrilmis hucre yalniz katilim ilcesinde satilir (katilim ilcesi: ${mo0?.katilimIlcesi ?? "yok"}): ${id}`;
    }
  }
  const mevcut = mo0 === undefined ? 0 : ilceHucreSayisi(mo0, ilce.id);
  const yeniToplam = mevcut + liste.length;
  if (yeniToplam > p.ilceHucreTavani) return `ilcede en cok ${p.ilceHucreTavani} hucre (mevcut ${mevcut})`;
  const payTavani = carpBol(ilce.uygunHucre, p.ilcePayTavaniPpm, PPM);
  if (yeniToplam > payTavani) return `ilcenin en cok %${carpBol(p.ilcePayTavaniPpm, 100, PPM)}'i (${payTavani} hucre; mevcut ${mevcut})`;
  if (ilce.satilmisHucre + liste.length > ilce.uygunHucre) return "ilcede yeterli bos uygun hucre yok";
  // Ayrılmış hücreler (docs/06 §15.7): hesap başına sınır; taban (sınıf) fiyatından, satış payı çarpanından muaf.
  let ayrilmis = 0;
  for (const id of liste) if (mk.ayrilmis.has(id)) ayrilmis++;
  const ayrilmisTavan = p.yeniOyuncu.ayrilmisHucreHesapTavani;
  if (ayrilmis > 0 && ayrilmisTavan !== undefined) {
    const sahip = mo0?.ayrilmisHucre ?? 0;
    if (sahip + ayrilmis > ayrilmisTavan) return `hesap basina en cok ${ayrilmisTavan} ayrilmis hucre (mevcut ${sahip})`;
  }
  // Günlük ilçe tavanı (docs/06 §15.1): ilçenin ayrılmış stokunun %'si (en az `ayrilmisIlceGunlukEnAz` hücre), sim günü başına.
  const gunlukPpm = p.yeniOyuncu.ayrilmisIlceGunlukPpm;
  if (ayrilmis > 0 && gunlukPpm !== undefined) {
    const tavan = Math.max(p.yeniOyuncu.ayrilmisIlceGunlukEnAz ?? 0, carpBol(mk.ayrilmisIlceSayisi.get(ilce.id) ?? 0, gunlukPpm, PPM));
    const bugun = ilce.ayrilmisGunluk !== undefined && ilce.ayrilmisGunluk.gun === Math.floor(d.zaman / GUN) ? ilce.ayrilmisGunluk.adet : 0;
    if (bugun + ayrilmis > tavan) return `ilcede gunluk ayrilmis satis tavani asildi: ${ilce.id} (tavan ${tavan}, bugun ${bugun}, istenen ${ayrilmis})`;
  }
  // Fiyat hücre başına, hücrenin KENDİ sınıfıyla (`alimUygula` ile aynı sıra: yalnız ayrılmamış hücreler artımlı eğriyi ilerletir).
  let fiyat = 0;
  let normal = 0;
  for (let i = 0; i < liste.length; i++) {
    fiyat += mk.ayrilmis.has(liste[i] as string)
      ? hucreFiyatiParametreyle(p, ilce, siniflar[i] as ArsaSinifi, 0, true)
      : hucreFiyatiParametreyle(p, ilce, siniflar[i] as ArsaSinifi, normal++, false);
  }
  return { ilce, liste, siniflar, fiyat, ayrilmis };
}

/** Satın almayı uygular: hazineden fiyatı düşer (önceden denetlenmiş olmalı), işletme düğümünü açar, hücreleri ekler. */
function alimUygula(d: Dunya, ctx: Baglam, mk: DerlenmisMulk, oyuncu: OyuncuId, plan: AlimPlani): boolean {
  const m = d.mulk as MulkDurumu;
  const p = mk.p;
  if (!hazineEkle(d, oyuncu, -plan.fiyat, "arsa")) return false;
  const mo = mulkOyuncuAl(m, oyuncu, d.zaman);
  isletmeAl(d, ctx.ic, oyuncu, plan.ilce.il);
  let normal = 0;
  for (let i = 0; i < plan.liste.length; i++) {
    const id = plan.liste[i] as string;
    // Ayrılmış hücre taban fiyattan (satış payı çarpanından muaf); diğerleri artımlı (yalnız normal satışlar eğriyi ilerletir).
    const sn = plan.siniflar[i] as ArsaSinifi;
    const deger = mk.ayrilmis.has(id) ? hucreFiyatiParametreyle(p, plan.ilce, sn, 0, true) : hucreFiyatiParametreyle(p, plan.ilce, sn, normal++, false);
    const h: HucreDurumu = { id, ilce: plan.ilce.id, sinif: sn, sahip: oyuncu, degerMili: deger, alinma: d.zaman };
    hucreEkle(m, h);
    mo.araziDegeriMili += deger;
  }
  plan.ilce.satilmisHucre += plan.liste.length;
  if (plan.ayrilmis > 0) {
    if (p.yeniOyuncu.ayrilmisIlceGunlukPpm !== undefined) {
      const gun = Math.floor(d.zaman / GUN);
      const g = plan.ilce.ayrilmisGunluk;
      plan.ilce.ayrilmisGunluk = { gun, adet: (g !== undefined && g.gun === gun ? g.adet : 0) + plan.ayrilmis };
    }
    plan.ilce.ayrilmisSatilmis = (plan.ilce.ayrilmisSatilmis ?? 0) + plan.ayrilmis;
    mo.ayrilmisHucre = (mo.ayrilmisHucre ?? 0) + plan.ayrilmis;
  }
  ilceHucreEkle(mo, plan.ilce.id, plan.liste.length);
  return true;
}

/** Yapı türü: içerikteki tesis türü (`ti`) ya da ek yapı (`ek`); ikisi birden tanımlı olmaz. */
interface YapiTuru {
  ad: string;
  ti: number | undefined;
  ek: DerlenmisEkYapi | undefined;
  /** Bu ÖLÇEKTE kaplanan hücre sayısı (`mulk.olcekHucre[tür][olcek]`; S'de `yapiYuva`). */
  yuva: number;
  /** Doğrudan kurulum ölçeği: 0 = S, 1 = M, 2 = L (ek yapılar yalnız S; yalnız `dukkan` ek yapısı `olcekHucre` ile M/L olabilir, G7). */
  olcek: 0 | 1 | 2;
  /** Dükkân türü kimliği (yalnız `dukkan` ek yapısında; komutun `dukkanTuru` alanı, `dukkanKurulumDenetimi` denetler). */
  dukkanTuru?: string;
}

const OLCEK_ADLARI = ["S", "M", "L"] as const;

/** Komutun `olcek` alanı (docs/06 §15.10): yok ya da 0 = S, 1 = M, 2 = L; başkası hata. */
function olcekCoz(olcek: unknown): 0 | 1 | 2 | string {
  if (olcek === undefined || olcek === 0) return 0;
  if (olcek === 1 || olcek === 2) return olcek;
  return `gecersiz olcek: ${String(olcek)} (0 = S, 1 = M, 2 = L)`;
}

function yapiTuruCoz(ctx: Baglam, mk: DerlenmisMulk, tesisTuru: unknown, olcek: 0 | 1 | 2): YapiTuru | string {
  const ti = typeof tesisTuru === "string" ? ctx.ic.tesisTuruIndeks[tesisTuru] : undefined;
  // Ek yapı (Ambar, Ticaret ofisi...): içerikte tesis türü değil, `mulk.ekYapilar`'da tanımlıdır.
  const ei = ti === undefined && typeof tesisTuru === "string" ? mk.ekYapiIndeks.get(tesisTuru) : undefined;
  if (ti === undefined && ei === undefined) return `bilinmeyen tesis turu: ${String(tesisTuru)}`;
  const ek = ei === undefined ? undefined : (mk.ekYapilar[ei] as DerlenmisEkYapi);
  // Kamu yapıları (ör. Muhtarlık) mülk kipinde oyuncuya kapalıdır (`mulk.kamu.oyuncuyaKapaliYapilar`).
  if (ek !== undefined && mk.p.kamu?.oyuncuyaKapaliYapilar.includes(ek.id) === true) return `${ek.id} kamu yapisidir (oyuncuya kapali)`;
  let yuva = ek !== undefined ? ek.yuva : (mk.yuva[ti as number] as number);
  if (yuva <= 0) return `tesis turu mulk kipinde insa edilemez: ${String(tesisTuru)}`;
  if (olcek > 0) {
    // M/L (docs/06 §15.10): yalnız tesis türlerinde ve sanayi katmanı (ölçek çarpanları) açıkken; ek yapılar ölçeklenmez (tek istisna: `dukkan`, ayak izi `ekYapilar.dukkan.olcekHucre`;
    // hangi ölçeklerin AÇIK olduğunu `perakende.acikOlcekler` söyler ve komutta DUK-04 olarak önceden denetlenir). KİLİT YOK: teknoloji, ilçe seviyesi, sıra aranmaz.
    const dukkanAyakIzi = ek?.id === "dukkan" ? ctx.ic.param.mulk?.ekYapilar?.["dukkan"]?.olcekHucre : undefined;
    if (ek !== undefined && dukkanAyakIzi === undefined) return `ek yapi olceklenemez: ${ek.id} (yalniz S)`;
    if (sanayiTablosu(ctx.ic) === null) return "olcek icin sanayi katmani gerekli";
    yuva = dukkanAyakIzi !== undefined ? (dukkanAyakIzi[olcek] as number) : ((mk.olcekHucre[ti as number] as number[])[olcek] as number);
  }
  return { ad: tesisTuru as string, ti, ek, yuva, olcek };
}

/**
 * Komutun `yontem` alanı (G6, sartname §5.8): yok = tür varsayılanı (alan yazılmaz). Verilmişse yalnız TESİS türü inşasında ve `yontem_degistir` ile AYNI denetimler/iletiler:
 * bilinmeyen yöntem, türün listesinde yok, teknoloji açık değil. Dünyayı değiştirmez; hata iletisi ya da yöntem kimliği (yoksa tanımsız) döner.
 */
function yontemCoz(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, tur: YapiTuru, yontem: unknown): string | undefined | { kimlik: string } {
  if (yontem === undefined) return undefined;
  if (tur.ek !== undefined) return `yontem yalniz tesis turunde verilebilir: ${tur.ad}`;
  const yi = typeof yontem === "string" ? ctx.ic.yontemIndeks[yontem] : undefined;
  if (yi === undefined) return `bilinmeyen yontem: ${String(yontem)}`;
  if (!(icerikTablosu(ctx.ic).tur[tur.ti as number] as { yontemler: number[] }).yontemler.includes(yi)) return `yontem bu tesis turunde yok: ${String(yontem)}`;
  if (!yontemAcikMi(d, ctx, oyuncu, yi)) return `yontem acik degil: ${String(yontem)}`;
  return { kimlik: yontem as string };
}

/**
 * Yapı hücreleri: S'de 1–3, M/L'de en çok 5 hücre; sayısı o ölçeğin ayak izine eşit; kenar-bitişik (4 komşuluk) tek bağlı küme (I, L, T... her biçim).
 * Sıralı listeyi ya da hatayı döndürür.
 */
function yapiHucreleri(tur: YapiTuru, hucreler: unknown): string[] | string {
  const liste = hucreListesi(hucreler, tur.olcek > 0 ? ENCOK_AYAK_IZI : 3);
  if (typeof liste === "string") return liste;
  if (liste.length !== tur.yuva) {
    return tur.olcek === 0 ? `${tur.ad} ${tur.yuva} hucre kaplar (verilen ${liste.length})` : `${tur.ad} ${OLCEK_ADLARI[tur.olcek]} olceginde ${tur.yuva} hucre kaplar (verilen ${liste.length})`;
  }
  for (const id of liste) if (!HUCRE_KIMLIGI.test(id)) return `gecersiz hucre kimligi: ${id}`;
  if (!kenarBitisikMi(liste)) return `yapi hucreleri kenar-bitisik olmali: ${liste.join(", ")}`;
  return liste;
}

/** Bir yapının kaplayabileceği en çok hücre (`mulk.olcekHucre` değerleri en çok 5; docs/06 §15.10). */
export const ENCOK_AYAK_IZI = 5;

/** "x:y", yalnız rakamlar (başında sıfır yok). */
const HUCRE_KIMLIGI = /^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/;

/** Yapı inşaatı planı: tür denetimleri, bedel (indirimli) ve süre. Dünyayı değiştirmez. */
interface YapiPlani {
  tur: YapiTuru;
  ilce: IlceDurumu;
  liste: string[];
  mal: readonly (readonly [number, Mili])[];
  para: Mili;
  /** İnşaat süresi (ms; ölçek çarpanı dahil, erken oyun hızlandırması HARİÇ: o başlangıçta bir kez uygulanır). */
  sureMs: number;
  indirimli: boolean;
  /** Oyuncunun ildeki işletme düğümü; henüz yoksa (aynı komutta açılacak) tanımsız. */
  dugum: BolgeDurumu | undefined;
}

/**
 * Yapı denetimleri (hücre sahipliği denetimleri çağırandadır): ilde işletme (ya da aynı komutla açılacak), tür açık mı,
 * il etiketi ve rezerv, ek yapı için ilde en çok, eşzamanlı inşaat sınırı ve ilk-yapı indirimi. İşletme düğümü henüz yoksa
 * (`yeniHucre` boş değilken) etiket ve rezerv il merkezinden okunur (işletme düğümü bunları merkezden kopyalar).
 */
function yapiPlani(d: Dunya, ctx: Baglam, mk: DerlenmisMulk, oyuncu: OyuncuId, ilce: IlceDurumu, tur: YapiTuru, liste: string[], yeniVar: boolean): YapiPlani | string {
  const isl = isletmeBul(d, oyuncu, ilce.il);
  if (isl === undefined && !yeniVar) return `ilde isletme yok: ${ilce.il}`;
  const dugum = isl === undefined ? undefined : (d.bolgeler[isl.bolgeIndeksi] as BolgeDurumu);
  const merkez = d.bolgeler[mk.ilMerkezi.get(ilce.il) as number] as BolgeDurumu;
  const etiketler = dugum?.etiketler ?? merkez.etiketler;
  let mal: readonly (readonly [number, Mili])[];
  let para: Mili;
  let saat: number;
  // S (ölçeksiz) taban bedel: ilk-yapı indirimi ölçekten bağımsız olsun diye (docs/06 §15.10) indirim tutarı bu tabandan hesaplanır.
  let tabanMal: readonly (readonly [number, Mili])[];
  let tabanPara: Mili;
  if (tur.ek !== undefined) {
    // Dükkân ilçe sınırı (DUK-06; sartname §7.6): oyuncu başına ilçede en çok `ilceBasinaEnFazla` (biten + süren); il sınırından (DUK-07) ÖNCE.
    if (tur.ek.id === "dukkan" && mk.perakende !== undefined && ilcedeDukkanSayisi(d, oyuncu, ilce.id) >= mk.perakende.p.ilceBasinaEnFazla) {
      return `ilcede en cok ${mk.perakende.p.ilceBasinaEnFazla} dukkan (biten + suren)`;
    }
    let mevcutAdet = dugum === undefined ? 0 : ekYapiSayisi(dugum, tur.ek.id);
    if (dugum !== undefined) for (const i of d.insaatlar) if (i.ekYapi === tur.ek.id && i.bolge === dugum.indeks) mevcutAdet++;
    if (mevcutAdet >= tur.ek.enFazlaIlBasina) return `ilde en cok ${tur.ek.enFazlaIlBasina} ${tur.ek.ad} (biten + suren)`;
    mal = tur.ek.insaMaliyeti;
    para = tur.ek.insaParasi;
    saat = tur.ek.insaSaati;
    tabanMal = mal;
    tabanPara = para;
    if (tur.olcek > 0) {
      // Dükkân M/L (G7): bedel tesis dalıyla AYNI ölçek çarpanı tablosundan (`olcekKademeleri[olcek].insaPpm`); süre aşağıda ortak.
      const st = sanayiTablosu(ctx.ic);
      if (st === null) return "olcek icin sanayi katmani gerekli";
      const insaPpm = st.p.olcekKademeleri[tur.olcek]!.insaPpm;
      mal = tabanMal.map(([mi, q]) => [mi, carpBol(q, insaPpm, PPM)] as [number, Mili]);
      para = carpBol(tabanPara, insaPpm, PPM);
    }
  } else {
    const ti = tur.ti as number;
    const tanim = ctx.ic.tesisTurleri[ti]!;
    const satir = icerikTablosu(ctx.ic).tur[ti]!;
    if (!tesisTuruAcikMi(d, ctx, oyuncu, ti)) return `tesis turu acik degil: ${tur.ad}`;
    if (tanim.gerekliEtiket !== undefined && !etiketler.includes(tanim.gerekliEtiket)) return `il etiketi yetersiz: ${tanim.gerekliEtiket}`;
    if (satir.gerekliRezerv >= 0) {
      const kalan = dugum === undefined ? (merkez.rezervIlk[satir.gerekliRezerv] as number) : (dugum.rezervKalan[satir.gerekliRezerv] as number);
      if (kalan <= 0) return `gerekli rezerv yok: ${tanim.gerekliRezerv}`;
    }
    tabanMal = satir.insaMaliyeti;
    tabanPara = satir.insaParasi;
    mal = tabanMal;
    para = tabanPara;
    saat = mk.insaSaati[ti] as number;
    if (tur.olcek > 0) {
      // Doğrudan M/L kurulumu (docs/06 §15.10): bedel (para + malzeme) × `olcekKademeleri[olcek].insaPpm` (yükseltmeyle AYNI tablo); süre × `olcekInsaSureCarpaniPpm`.
      const insaPpm = (sanayiTablosu(ctx.ic) as NonNullable<ReturnType<typeof sanayiTablosu>>).p.olcekKademeleri[tur.olcek]!.insaPpm;
      mal = tabanMal.map(([mi, q]) => [mi, carpBol(q, insaPpm, PPM)] as [number, Mili]);
      para = carpBol(tabanPara, insaPpm, PPM);
    }
  }
  let sureMs = saat * SAAT;
  if (tur.olcek > 0) sureMs = carpBol(sureMs, mk.p.olcekInsaSureCarpaniPpm[tur.olcek] as number, PPM);
  let suren = 0;
  for (const i of d.insaatlar) if (i.sahip === oyuncu && i.hucreler !== undefined) suren++;
  if (suren >= mk.p.esZamanliInsaat) return `ayni anda en cok ${mk.p.esZamanliInsaat} insaat`;
  // Yeni oyuncu: ilk `indirimliYapiSayisi` yapıda `ilkYapiIndirimPpm` indirimi (para ve malzeme; ek yapılar dahil).
  const yo = mk.p.yeniOyuncu;
  const indirimli = yo.ilkYapiIndirimPpm > 0 && (mulkOyuncuBul(d, oyuncu)?.indirimliYapi ?? 0) < yo.indirimliYapiSayisi;
  if (indirimli) {
    // İndirim TUTARI S tabanından hesaplanır (S'de eski formülle birebir aynı): M/L bedeli bu sabit tutar kadar düşer. Böylece "S kur + yükselt" toplamı
    // doğrudan M/L bedeline eşit kalır (arbitraj yok) ve büyük ölçek indirimle ucuzlamaz.
    mal = mal.map(([mi, q], i) => {
      const q0 = (tabanMal[i] as readonly [number, Mili])[1];
      return [mi, q - (q0 - carpBol(q0, PPM - yo.ilkYapiIndirimPpm, PPM))] as [number, Mili];
    });
    para -= tabanPara - carpBol(tabanPara, PPM - yo.ilkYapiIndirimPpm, PPM);
  }
  return { tur, ilce, liste, mal, para, sureMs, indirimli, dugum };
}

/**
 * Yapı bedelinin (para + malzeme) karşılanıp karşılanmadığı; `ekPara` aynı komutta önce ödenecek arsa bedelidir. Düğüm yoksa
 * (aynı komutla açılacak) malzeme, düğümün açılışta alacağı stoğa (ilk işletmeyse başlangıç kiti, değilse boş) bakılır.
 */
function yapiBedeliEksik(d: Dunya, ctx: Baglam, mk: DerlenmisMulk, oyuncu: OyuncuId, plan: YapiPlani, ekPara: Mili): string | null {
  if (plan.dugum !== undefined) return maliyetYeterliMi(d, plan.dugum.indeks, oyuncu, plan.mal, plan.para + ekPara);
  const ilk = !isletmesiVarMi(d.mulk as MulkDurumu, oyuncu);
  const kapasite = ctx.ic.param.ekonomi.depoKapasitesi;
  for (const [mi, q] of plan.mal) {
    const elde = ilk ? Math.min(mk.baslangicStok[mi] as number, kapasite) : 0;
    if (elde < q) return `yetersiz stok: ${isletmeKimligi(plan.ilce.il, oyuncu)} (mal indeksi ${mi})`;
  }
  return anlikHazine(d, oyuncu) < plan.para + ekPara ? "yetersiz hazine" : null;
}

/** Yerinde ölçek yükseltmesinin ek hücre planı (dünyayı değiştirmez): `olcekEkHucrePlani` üretir, sanayi komutu uygular. */
export interface OlcekEkPlani {
  ilce: IlceDurumu;
  /** Yükseltmeyle eklenecek hücreler (sıralı; ölçeğin ek hücresi yoksa boş). */
  ek: string[];
  /** Ekin sahipsiz hücreleri için `parsel_al` planı; satın alınacak hücre yoksa null. */
  alim: AlimPlani | null;
  /** Ek hücrelerin satın alma bedeli (mili-para; alım yoksa 0). */
  arsa: Mili;
}

/**
 * Mülk kipinde `tesis_olcek_yukselt` ek hücre denetimi (docs/06 §15.10): hedef ölçeğin ayak izi (`olcekHucre`) ile tesisin bugünkü hücre sayısı arasındaki
 * fark kadar EK hücre (`ekHucreler`) verilmeli; hücreler tesisin ilçesinde, tesis hücreleriyle birlikte kenar-bitişik tek küme olmalı ve ya oyuncunun BOŞ
 * hücresi ya da sahipsiz olmalı (sahipsizler `sinif` sınıfında `parsel_al` kurallarıyla satın alınır: artımlı fiyat, ayrılmış hücre, kamu arsası reddi,
 * 72 / %25 sınırı). Oyuncu başına eşzamanlı hücreli inşaat sınırı (`esZamanliInsaat`) yükseltmeye de uygulanır. Hata iletisi ya da plan döner.
 */
export function olcekEkHucrePlani(d: Dunya, mk: DerlenmisMulk, oyuncu: OyuncuId, ts: TesisDurumu, hedef: 1 | 2, ekHucreler: unknown, sinif: unknown): OlcekEkPlani | string {
  const mevcut = ts.hucreler;
  const ilkHucre = mevcut === undefined ? undefined : hucreBul(d, mevcut[0] as string);
  if (mevcut === undefined || ilkHucre === undefined) return `tesisin hucresi yok: ${ts.id}`;
  const hedefHucre = (mk.olcekHucre[ts.tur] as number[])[hedef];
  if (hedefHucre === undefined) return "tesis turu mulk kipinde olceklenemez";
  const ilce = ilceBul(d, ilkHucre.ilce) as IlceDurumu;
  // Ayak izi tesisin GERÇEK hücre sayısından hesaplanır (eski dünyalarda M tesisi S ayak iziyle durabilir).
  const gerekli = Math.max(0, hedefHucre - mevcut.length);
  let ek: string[] = [];
  if (gerekli === 0) {
    if (ekHucreler !== undefined && !(Array.isArray(ekHucreler) && ekHucreler.length === 0)) return "bu yukseltme ek hucre gerektirmez (ekHucreler bos olmali)";
  } else {
    if (ekHucreler === undefined) return `olcek yukseltmesi ${gerekli} ek bitisik hucre ister (ekHucreler)`;
    const liste = hucreListesi(ekHucreler, ENCOK_AYAK_IZI);
    if (typeof liste === "string") return liste;
    if (liste.length !== gerekli) return `olcek yukseltmesi ${gerekli} ek hucre ister (verilen ${liste.length})`;
    for (const id of liste) if (!HUCRE_KIMLIGI.test(id)) return `gecersiz hucre kimligi: ${id}`;
    if (!kenarBitisikMi([...mevcut, ...liste])) return `ek hucreler tesisin hucrelerine kenar-bitisik olmali: ${liste.join(", ")}`;
    ek = liste;
  }
  if (sinif !== undefined && !SINIFLAR.includes(sinif as ArsaSinifi)) return `gecersiz arsa sinifi: ${String(sinif)}`;
  const yeni: string[] = [];
  for (const id of ek) {
    const h = hucreBul(d, id);
    if (h === undefined) {
      yeni.push(id);
      continue;
    }
    if (h.sahip !== oyuncu) return `hucre zaten sahipli: ${id} (${h.sahip})`;
    if (h.ilce !== ilce.id) return `hucre bu ilcede degil: ${id}`;
    if (h.tesis !== undefined || h.insaat !== undefined) return `hucre bos degil: ${id}`;
  }
  let alim: AlimPlani | null = null;
  if (yeni.length > 0) {
    if (sinif === undefined) return `sahipsiz hucre icin sinif gerekli: ${yeni.join(", ")}`;
    const a = alimPlani(d, mk, oyuncu, ilce, yeni, sinif as ArsaSinifi);
    if (typeof a === "string") return a;
    alim = a;
  }
  let suren = 0;
  for (const i of d.insaatlar) if (i.sahip === oyuncu && i.hucreler !== undefined) suren++;
  if (suren >= mk.p.esZamanliInsaat) return `ayni anda en cok ${mk.p.esZamanliInsaat} insaat`;
  return { ilce, ek, alim, arsa: alim === null ? 0 : alim.fiyat };
}

/** Planın sahipsiz ek hücrelerini satın alır (önceden denetlenmiş; hazineyi düşer). Alım yoksa doğru döner. */
export function olcekEkHucreAl(d: Dunya, ctx: Baglam, mk: DerlenmisMulk, oyuncu: OyuncuId, plan: OlcekEkPlani): boolean {
  return plan.alim === null ? true : alimUygula(d, ctx, mk, oyuncu, plan.alim);
}

/** Yapı inşaatını başlatır (denetlenmiş plan; düğüm artık vardır): bedeli düşer, hücreleri işaretler, bitişi planlar. */
function yapiUygula(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, plan: YapiPlani, b: BolgeDurumu, yontem?: string): boolean {
  if (!maliyetiDus(d, ctx, b.indeks, oyuncu, plan.mal, plan.para)) return false;
  const id = ctx.yeniKimlik(d);
  const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, plan.sureMs);
  const ins: InsaatDurumu = {
    id,
    tur: "tesis",
    sahip: oyuncu,
    bolge: b.indeks,
    hedef: plan.tur.ek !== undefined ? -1 : (plan.tur.ti as number),
    bitis,
    hucreler: plan.liste,
    baslangic: d.zaman,
    odenenPara: plan.para,
    odenenMal: plan.mal.map(([mi, q]) => [mi, q] as [number, Mili]),
  };
  if (plan.tur.ek !== undefined) ins.ekYapi = plan.tur.ek.id;
  if (plan.tur.olcek > 0) ins.olcek = plan.tur.olcek as 1 | 2;
  if (plan.tur.dukkanTuru !== undefined) ins.dukkanTuru = plan.tur.dukkanTuru;
  if (yontem !== undefined) ins.yontem = yontem;
  if (plan.indirimli) {
    ins.indirimli = true;
    const mo = mulkOyuncuAl(d.mulk as MulkDurumu, oyuncu, d.zaman);
    mo.indirimliYapi = (mo.indirimliYapi ?? 0) + 1;
  }
  d.insaatlar.push(ins);
  for (const hid of plan.liste) (hucreBul(d, hid) as HucreDurumu).insaat = id;
  ctx.planla(d, bitis, { tur: "insaat_bitti", insaat: id });
  return true;
}

export function mulkKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: MulkKomutu): KomutSonucu {
  const mk = ctx.ic.mulk;
  const m = d.mulk;
  if (mk === undefined || m === undefined) return hata("mulk kipi kapali");
  switch (k.tur) {
    case "parsel_al": {
      const ilce = typeof k.ilce === "string" ? ilceBul(d, k.ilce) : undefined;
      if (ilce === undefined || !mk.ilceler.has(k.ilce)) return hata(`bilinmeyen ilce: ${String(k.ilce)}`);
      if (!SINIFLAR.includes(k.sinif)) return hata(`gecersiz arsa sinifi: ${String(k.sinif)}`);
      const liste = hucreListesi(k.hucreler, mk.p.ilceHucreTavani);
      if (typeof liste === "string") return hata(liste);
      const plan = alimPlani(d, mk, oyuncu, ilce, liste, k.sinif);
      if (typeof plan === "string") return hata(plan);
      if (anlikHazine(d, oyuncu) < plan.fiyat) return hata(`yetersiz hazine (gereken ${plan.fiyat})`);
      if (!alimUygula(d, ctx, mk, oyuncu, plan)) return hata(`yetersiz hazine (gereken ${plan.fiyat})`);
      return TAMAM;
    }
    case "tesis_insa_hucre": {
      const ilce = typeof k.ilce === "string" ? ilceBul(d, k.ilce) : undefined;
      if (ilce === undefined) return hata(`bilinmeyen ilce: ${String(k.ilce)}`);
      const olcek = olcekCoz(k.olcek);
      if (typeof olcek === "string") return hata(olcek);
      const dk = dukkanKurulumDenetimi(mk, k.tesisTuru, k.dukkanTuru, olcek);
      if (typeof dk === "string") return hata(dk);
      const tur = yapiTuruCoz(ctx, mk, k.tesisTuru, olcek);
      if (typeof tur === "string") return hata(tur);
      if (dk !== undefined) tur.dukkanTuru = dk.dukkanTuru;
      const yontem = yontemCoz(d, ctx, oyuncu, tur, k.yontem);
      if (typeof yontem === "string") return hata(yontem);
      const liste = yapiHucreleri(tur, k.hucreler);
      if (typeof liste === "string") return hata(liste);
      for (const id of liste) {
        const h = hucreBul(d, id);
        if (h === undefined || h.sahip !== oyuncu) return hata(`hucre oyuncunun degil: ${id}`);
        if (h.ilce !== ilce.id) return hata(`hucre bu ilcede degil: ${id}`);
        if (h.tesis !== undefined || h.insaat !== undefined) return hata(`hucre bos degil: ${id}`);
      }
      const plan = yapiPlani(d, ctx, mk, oyuncu, ilce, tur, liste, false);
      if (typeof plan === "string") return hata(plan);
      const eksik = yapiBedeliEksik(d, ctx, mk, oyuncu, plan, 0);
      if (eksik !== null) return hata(eksik);
      if (!yapiUygula(d, ctx, oyuncu, plan, plan.dugum as BolgeDurumu, yontem?.kimlik)) return hata("yetersiz hazine");
      return TAMAM;
    }
    case "yapi_yerlestir": {
      // Arsa + yapı TEK atomik işlem: boş hücreler satın alınır, hepsi oyuncunun olunca inşaat başlar; herhangi bir denetim
      // başarısızsa dünya (hazinenin temsili dahil) değişmez.
      const ilce = typeof k.ilce === "string" ? ilceBul(d, k.ilce) : undefined;
      if (ilce === undefined || !mk.ilceler.has(k.ilce)) return hata(`bilinmeyen ilce: ${String(k.ilce)}`);
      if (!SINIFLAR.includes(k.sinif)) return hata(`gecersiz arsa sinifi: ${String(k.sinif)}`);
      const olcek = olcekCoz(k.olcek);
      if (typeof olcek === "string") return hata(olcek);
      const dk = dukkanKurulumDenetimi(mk, k.tesisTuru, k.dukkanTuru, olcek);
      if (typeof dk === "string") return hata(dk);
      const tur = yapiTuruCoz(ctx, mk, k.tesisTuru, olcek);
      if (typeof tur === "string") return hata(tur);
      if (dk !== undefined) tur.dukkanTuru = dk.dukkanTuru;
      const yontem = yontemCoz(d, ctx, oyuncu, tur, k.yontem);
      if (typeof yontem === "string") return hata(yontem);
      const liste = yapiHucreleri(tur, k.hucreler);
      if (typeof liste === "string") return hata(liste);
      // Hücre başına sınıf (isteğe bağlı): `siniflar[i]` = `hucreler[i]`'nin sınıfı; `liste` sıralandığından kimliğe eşlenir.
      let sinifOf: Map<string, ArsaSinifi> | null = null;
      if (k.siniflar !== undefined) {
        const sl: unknown = k.siniflar;
        if (!Array.isArray(sl)) return hata("siniflar dizi olmali");
        if (sl.length !== (k.hucreler as string[]).length) return hata(`siniflar hucrelerle ayni uzunlukta olmali (${sl.length} / ${(k.hucreler as string[]).length})`);
        sinifOf = new Map();
        for (let i = 0; i < sl.length; i++) {
          if (!SINIFLAR.includes(sl[i] as ArsaSinifi)) return hata(`gecersiz arsa sinifi: ${String(sl[i])}`);
          sinifOf.set((k.hucreler as string[])[i] as string, sl[i] as ArsaSinifi);
        }
      }
      const yeni: string[] = [];
      for (const id of liste) {
        const h = hucreBul(d, id);
        if (h === undefined) {
          yeni.push(id);
          continue;
        }
        if (h.sahip !== oyuncu) return hata(`hucre zaten sahipli: ${id} (${h.sahip})`);
        if (h.ilce !== ilce.id) return hata(`hucre bu ilcede degil: ${id}`);
        if (h.tesis !== undefined || h.insaat !== undefined) return hata(`hucre bos degil: ${id}`);
      }
      const alim = yeni.length > 0 ? alimPlani(d, mk, oyuncu, ilce, yeni, sinifOf === null ? k.sinif : yeni.map((id) => sinifOf.get(id) as ArsaSinifi)) : null;
      if (typeof alim === "string") return hata(alim);
      const plan = yapiPlani(d, ctx, mk, oyuncu, ilce, tur, liste, yeni.length > 0);
      if (typeof plan === "string") return hata(plan);
      const arsaBedeli = alim === null ? 0 : alim.fiyat;
      const eksik = yapiBedeliEksik(d, ctx, mk, oyuncu, plan, arsaBedeli);
      if (eksik !== null) return hata(eksik === "yetersiz hazine" ? `yetersiz hazine (gereken ${arsaBedeli + plan.para})` : eksik);
      // Değişiklikler (artık başarısız olamaz)
      if (alim !== null && !alimUygula(d, ctx, mk, oyuncu, alim)) return hata("yetersiz hazine");
      const isl = isletmeBul(d, oyuncu, ilce.il) as NonNullable<ReturnType<typeof isletmeBul>>;
      if (!yapiUygula(d, ctx, oyuncu, plan, d.bolgeler[isl.bolgeIndeksi] as BolgeDurumu, yontem?.kimlik)) return hata("yetersiz hazine");
      return TAMAM;
    }
    case "parsel_birak": {
      const ilce = typeof k.ilce === "string" ? ilceBul(d, k.ilce) : undefined;
      if (ilce === undefined || !mk.ilceler.has(k.ilce)) return hata(`bilinmeyen ilce: ${String(k.ilce)}`);
      const liste = hucreListesi(k.hucreler, mk.p.ilceHucreTavani);
      if (typeof liste === "string") return hata(liste);
      let deger = 0;
      for (const id of liste) {
        const h = hucreBul(d, id);
        if (h === undefined || h.sahip !== oyuncu) return hata(`hucre oyuncunun degil: ${id}`);
        if (h.ilce !== ilce.id) return hata(`hucre bu ilcede degil: ${id}`);
        if (h.tesis !== undefined || h.insaat !== undefined) return hata(`hucre bos degil (yapi ya da insaat var): ${id}`);
        deger += h.degerMili;
      }
      const iade = carpBol(deger, mk.p.parselBirakIadePpm ?? PARSEL_BIRAK_IADE_VARSAYILAN, PPM);
      if (iade > 0 && !hazineEkle(d, oyuncu, iade, "iade")) return hata("iade yapilamadi");
      // Değişiklikler (artık başarısız olamaz): hücreler boşalır; arazi değeri, ilçe hücre sayacı ve ilçe satılmışı düşer.
      const mo = mulkOyuncuAl(m, oyuncu, d.zaman);
      for (const id of liste) {
        // Ayrılmış hücre bırakılırsa hesap sayacı düşer; AYRILMIŞ olarak satın alınmışsa (bedeli > 0; yurt bedelsizdir) ilçenin muaf sayacı da düşer.
        if (mk.ayrilmis.has(id)) {
          const bos = hucreBul(d, id) as HucreDurumu;
          mo.ayrilmisHucre = (mo.ayrilmisHucre ?? 0) - 1;
          if (mo.ayrilmisHucre <= 0) delete mo.ayrilmisHucre;
          if (bos.degerMili > 0) {
            ilce.ayrilmisSatilmis = (ilce.ayrilmisSatilmis ?? 0) - 1;
            if (ilce.ayrilmisSatilmis <= 0) delete ilce.ayrilmisSatilmis;
          }
        }
        hucreSil(m, id);
      }
      mo.araziDegeriMili -= deger;
      ilceHucreEkle(mo, ilce.id, -liste.length);
      ilce.satilmisHucre -= liste.length;
      return TAMAM;
    }
    case "insaat_iptal": {
      if (!Number.isSafeInteger(k.insaat)) return hata(`gecersiz insaat: ${String(k.insaat)}`);
      const konum = d.insaatlar.findIndex((i) => i.id === k.insaat);
      const ins = d.insaatlar[konum];
      if (ins === undefined || ins.sahip !== oyuncu || ins.hucreler === undefined) return hata(`oyuncunun suren hucreli insaati yok: ${k.insaat}`);
      const iade = mk.p.insaatIptalIadePpm;
      const para = carpBol(ins.odenenPara ?? 0, iade, PPM);
      if (para > 0 && !hazineEkle(d, oyuncu, para, "iade")) return hata("iade yapilamadi");
      for (const [mal, q] of ins.odenenMal ?? []) {
        const geri = carpBol(q, iade, PPM);
        if (geri > 0) stokEkle(d, ctx, ins.bolge, mal, geri);
      }
      for (const hid of ins.hucreler) {
        const h = hucreBul(d, hid);
        if (h !== undefined && h.insaat === ins.id) delete h.insaat;
      }
      d.insaatlar.splice(konum, 1);
      // İlk-yapı indirimiyle başlamış inşaat iptal edilirse indirim hakkı geri verilir (ödenenin %50'si zaten iade edildi).
      if (ins.indirimli === true) {
        const mo = mulkOyuncuBul(d, oyuncu);
        if (mo?.indirimliYapi !== undefined) {
          mo.indirimliYapi--;
          if (mo.indirimliYapi <= 0) delete mo.indirimliYapi;
        }
      }
      return TAMAM;
    }
    case "dukkan_raf":
    case "dukkan_fiyat":
    case "marka_tanimla":
    case "dukkan_marka":
    case "dukkan_yik":
      // Perakende komutları (G7; sartname §9.1-9.2): DUK-00 `mulk.perakende` yokken; etkin yol `mulk/dukkanKomut.ts`.
      return perakendeKomutu(d, ctx, oyuncu, k);
    default: {
      const _tamamlik: never = k;
      return hata(`bilinmeyen mulk komutu: ${JSON.stringify(_tamamlik)}`);
    }
  }
}

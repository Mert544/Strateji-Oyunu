/**
 * Arsa fiyatı ve sahip olma sınırları (docs/11 §7.2, v1 başlangıç değerleri; saf).
 *
 *   hücre fiyatı = taban(sınıf) × (1 + 2 · ilçede satılmış pay)
 *   taban: kırsal 1.000 ₺ · kasaba 2.500 ₺ · şehir 6.500 ₺
 *   sınır: oyuncu ilçede ≤ 72 hücre VE ilçenin ≤ %25'i
 *   seçim kuralı: seçilen hücreler (kenardan) bitişik olmalı; sahip olunan hücreye değen seçim "Birleştir" olur.
 *
 * Açık konu: S6 ızgarası OSM arazi sınıfı verir (tarla/sanayi/konut/orman/yapılı/diğer), sözleşme ise
 * `ArsaSinifi` (kırsal/kasaba/şehir) ister. Geçici eşleme `arsaSinifi()` içindedir (rapor: açık sorular).
 */
import type { ArsaSinifi, HucreId } from "@bolge/cekirdek";
import { yuzde } from "../arayuz/bicim";
import { Bit, durumSinifi, hucreId, idCoz } from "./hucre";

export const TABAN_FIYAT: Readonly<Record<ArsaSinifi, number>> = { kirsal: 1000, kasaba: 2500, sehir: 6500 };
export const SINIF_ADI: Readonly<Record<ArsaSinifi, string>> = { kirsal: "Kırsal", kasaba: "Kasaba", sehir: "Şehir" };
/** Oyuncu başına ilçede en çok hücre. */
export const ILCE_HUCRE_SINIRI = 72;
/** Oyuncu başına ilçenin en çok payı. */
export const ILCE_PAY_SINIRI = 0.25;

/**
 * Durum baytından arsa sınıfı (GEÇİCİ eşleme): konut / yapılı -> şehir; sanayi ya da bina kesişen -> kasaba;
 * tarla / orman / diğer -> kırsal.
 */
export function arsaSinifi(durum: number): ArsaSinifi {
  const s = durumSinifi(durum);
  if (s === 3 || s === 5) return "sehir";
  if (s === 2 || durum & Bit.BINA) return "kasaba";
  return "kirsal";
}

/** Fiyat çarpanı: 1 + 2 · pay (pay 0–1 aralığına kırpılır). */
export function fiyatCarpani(satilmis: number, uygun: number): number {
  const pay = uygun > 0 ? Math.min(1, Math.max(0, satilmis / uygun)) : 0;
  return 1 + 2 * pay;
}

const PPM = 1_000_000;
/** Çekirdekteki `satisPayiCarpaniPpm` (2.000.000 = "× (1 + 2·pay)"). */
const PAY_CARPANI_PPM = 2_000_000;

/** Çekirdek `arsaTamLiraYukari`: mili-₺ tutarı bir sonraki tam liraya yukarı yuvarlar (şartname §9.4; tamsayı). */
const tamLiraYukari = (mili: number): number => Math.floor((mili + 999) / 1000) * 1000;

/**
 * Çekirdek `parselFiyati` ile birebir (mili-₺): `adet` hücre, ilçede şu an `satilmis` / `uygun` satılmışken. k. hücre (0'dan)
 * taban × (1 + 2·(satilmis + k)/uygun), tamsayı bölmeyle aşağı yuvarlanır, sonra HER hücre tam liraya YUKARI yuvarlanır (§9.4). Toplu alım indirim yaratmaz.
 */
export function parselFiyatiMili(sinif: ArsaSinifi, satilmis: number, uygun: number, adet: number): number {
  const taban = TABAN_FIYAT[sinif] * 1000;
  let toplam = 0;
  for (let k = 0; k < adet; k++) {
    const pay = uygun > 0 ? Math.floor((PAY_CARPANI_PPM * (satilmis + k)) / uygun) : 0;
    toplam += tamLiraYukari(Math.floor((taban * (PPM + pay)) / PPM));
  }
  return toplam;
}

/** Tek hücrenin fiyatı (tam ₺): çekirdekle aynı tek formül (`parselFiyatiMili`, bir hücre; yukarı yuvarlanmış tam lira). */
export function hucreFiyati(sinif: ArsaSinifi, satilmis: number, uygun: number): number {
  return parselFiyatiMili(sinif, satilmis, uygun, 1) / 1000;
}

// --- ayrılmış hücre (yeni oyunculara ayrılmış; docs/06 §15.7) -----------------------------------------------------------
//
// Çekirdek `hucreFiyatiMili`: AYRILMIŞ hücre taban (sınıf) fiyatındadır ve satış payı eğrisini ilerletmez; normal hücrenin eğrisi
// `satilmisHucre - ayrilmisSatilmis + k` üzerinden gider. Bir ayrılmış hücre yalnız katılımının ilk `ayrilmisGun` gününde olan
// oyuncuya (ve `ayrilmisYalnizKatilimIlcesi` açıksa yalnız KATILIM ilçesinde) satılır; aksi hâlde satın alma reddedilir.

/** Fiyatı belirleyen ilçe durumu (çekirdek `IlceFiyatDurumu`). */
export interface IlceFiyatDurumu {
  /** Satılabilir hücre sayısı (kamu düşülmüş). */
  uygun: number;
  /** İlçede satılmış hücre (ayrılmışlar dahil). */
  satilmis: number;
  /** Bunların PARA ile alınmış ayrılmış olanı (eğriyi ilerletmez); bilinmiyorsa 0. */
  ayrilmisSatilmis?: number;
}

/** Çekirdek `hucreFiyatiMili`: `sinif` sınıfında k. (0'dan) hücrenin fiyatı (mili-₺); ayrılmışsa taban, eğriden muaf. */
export function hucreFiyatiMili(sinif: ArsaSinifi, ilce: IlceFiyatDurumu, k = 0, ayrilmis = false): number {
  if (ayrilmis) return tamLiraYukari(TABAN_FIYAT[sinif] * 1000);
  return parselFiyatiMili(sinif, Math.max(0, ilce.satilmis - (ilce.ayrilmisSatilmis ?? 0)) + k, ilce.uygun, 1);
}

/** Çekirdek `parselToplamFiyatiMili`: `normalAdet` normal + `ayrilmisAdet` ayrılmış hücrenin (aynı komutta) toplamı (mili-₺). */
export function parselToplamFiyatiMili(sinif: ArsaSinifi, ilce: IlceFiyatDurumu, normalAdet: number, ayrilmisAdet = 0): number {
  let t = 0;
  for (let k = 0; k < normalAdet; k++) t += hucreFiyatiMili(sinif, ilce, k, false);
  for (let k = 0; k < ayrilmisAdet; k++) t += hucreFiyatiMili(sinif, ilce, k, true);
  return t;
}

/** Oyuncunun bir ilçede ayrılmış hücre alma hakkı: var, ya da yok ve nedeni (Türkçe). */
export type AyrilmisHakki = { var: true } | { var: false; neden: string };

/**
 * Oyuncunun bu ilçedeki ayrılmış hücre hakkı (çekirdek `alimPlani` koşulları: katılımın ilk `ayrilmisGun` günü ve, kural açıksa, yalnız
 * KATILIM ilçesi). Hesap başına tavan (`ayrilmisHucreHesapTavani`) ve günlük ilçe tavanı önizlemede bilinmez; sunucu Türkçe reddeder.
 */
export function ayrilmisHakki(g: { simZamani: number; ayrilmisBitis: number | null; katilimIlcesi: string | null; ilce: string; yalnizKatilimIlcesi: boolean; gun: number }): AyrilmisHakki {
  if (g.ayrilmisBitis === null || g.simZamani >= g.ayrilmisBitis) return { var: false, neden: `Bu hücre yeni oyunculara ayrılmış (katılımlarının ilk ${g.gun} günü)` };
  if (g.yalnizKatilimIlcesi && g.katilimIlcesi !== g.ilce) return { var: false, neden: "Ayrılmış hücre yalnız katılım ilçende satılır" };
  return { var: true };
}

/**
 * Bir hücrenin satın alma türü: normal, ayrılmış (hakkı varsa taban fiyat) ya da bu oyuncuya kapalı (neden). `ayrilmis` ilçenin
 * ayrılmış hücre kümesidir (bilinmiyorsa tanımsız: hepsi normal sayılır; sunucu yine de reddeder); `hak` bilinmiyorsa var sayılır.
 */
export function alimTuru(id: string, ayrilmis: ReadonlySet<string> | undefined, hak: AyrilmisHakki | undefined): { tur: "normal" | "ayrilmis" } | { tur: "yasak"; neden: string } {
  if (!ayrilmis || !ayrilmis.has(id)) return { tur: "normal" };
  if (hak && !hak.var) return { tur: "yasak", neden: hak.neden };
  return { tur: "ayrilmis" };
}

export interface IlceSayilari {
  /** Bunların para ile alınmış ayrılmış olanı (eğriyi ilerletmez); bilinmiyorsa tanımsız. */
  ayrilmisSatilmis?: number;
  /**
   * İlçenin uygun (satın alınabilir; su değil) hücre sayısı: hem fiyat payının hem %25 sınırının paydası
   * (çekirdekteki `IlceDurumu.uygunHucre` ile aynı anlam; karar 1 Ekim).
   */
  uygun: number;
  /** İlçede satılmış hücre (tüm oyuncular). */
  satilmis: number;
  /** Bu oyuncunun ilçedeki hücresi. */
  benim: number;
}

/** Oyuncunun ilçede tutabileceği en çok hücre: min(72, ⌊%25 · uygun⌋). */
export function ilceTavani(uygun: number): number {
  return Math.min(ILCE_HUCRE_SINIRI, Math.floor(ILCE_PAY_SINIRI * uygun));
}

export interface SinirDurumu {
  tavan: number;
  /** Satın almadan sonraki toplam. */
  sonra: number;
  /** 72 hücre sınırı aşılıyor. */
  hucreAsimi: boolean;
  /** %25 pay sınırı aşılıyor. */
  payAsimi: boolean;
}

export function sinirDenetle(sayi: IlceSayilari, secili: number): SinirDurumu {
  const sonra = sayi.benim + secili;
  return {
    tavan: ilceTavani(sayi.uygun),
    sonra,
    hucreAsimi: sonra > ILCE_HUCRE_SINIRI,
    payAsimi: sonra > Math.floor(ILCE_PAY_SINIRI * sayi.uygun),
  };
}

const KOMSU: ReadonlyArray<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Seçim kenardan bitişik mi? `ek` (sahip olunan hücreler) köprü olarak sayılır: seçim parçaları sahip olunan
 * bir parsel üzerinden bağlanıyorsa geçerlidir (Birleştir).
 */
export function bitisikMi(secili: readonly HucreId[], ek: ReadonlySet<HucreId> = new Set()): boolean {
  if (secili.length <= 1) return true;
  const hedef = new Set(secili);
  const gezilebilir = (id: string): boolean => hedef.has(id) || ek.has(id);
  const gorulen = new Set<string>([secili[0]!]);
  const kuyruk: string[] = [secili[0]!];
  let bulunan = 1;
  while (kuyruk.length) {
    const h = idCoz(kuyruk.pop()!);
    if (!h) continue;
    for (const [dx, dy] of KOMSU) {
      const k = hucreId(h.x + dx, h.y + dy);
      if (gorulen.has(k) || !gezilebilir(k)) continue;
      gorulen.add(k);
      if (hedef.has(k)) bulunan++;
      kuyruk.push(k);
    }
  }
  return bulunan === hedef.size;
}

/** Seçim sahip olunan bir hücreye kenardan değiyor mu (Birleştir). */
export function sahipliyeDegiyor(secili: readonly HucreId[], benim: ReadonlySet<HucreId>): boolean {
  for (const id of secili) {
    const h = idCoz(id);
    if (!h) continue;
    for (const [dx, dy] of KOMSU) if (benim.has(hucreId(h.x + dx, h.y + dy))) return true;
  }
  return false;
}

export interface SatinAlmaOzeti {
  sayi: number;
  /** Tek sınıfsa o sınıf; karışık ya da boşsa null. */
  sinif: ArsaSinifi | null;
  /** Sınıf başına hücre sayısı. */
  siniflar: Partial<Record<ArsaSinifi, number>>;
  hucreFiyati: number;
  toplam: number;
  sinir: SinirDurumu;
  bitisik: boolean;
  birlestir: boolean;
  /** Satın almayı engelleyen uyarılar (boşsa düğme etkin). */
  engeller: string[];
}

/** Satın alma alt çubuğunun tüm sayıları (saf). `sinifAl` hücrenin arsa sınıfını verir. */
export function satinAlmaOzeti(
  secili: readonly HucreId[],
  sinifAl: (id: HucreId) => ArsaSinifi,
  sayi: IlceSayilari,
  benim: ReadonlySet<HucreId>,
): SatinAlmaOzeti {
  const siniflar: Partial<Record<ArsaSinifi, number>> = {};
  let toplam = 0;
  for (const id of secili) {
    const s = sinifAl(id);
    siniflar[s] = (siniflar[s] ?? 0) + 1;
    toplam += hucreFiyati(s, sayi.satilmis, sayi.uygun);
  }
  const anahtar = Object.keys(siniflar) as ArsaSinifi[];
  const sinif = anahtar.length === 1 ? anahtar[0]! : null;
  const sinir = sinirDenetle(sayi, secili.length);
  const bitisik = bitisikMi(secili, benim);
  const birlestir = secili.length > 0 && sahipliyeDegiyor(secili, benim);
  const engeller: string[] = [];
  if (secili.length === 0) engeller.push("Hücre seçin");
  if (anahtar.length > 1) engeller.push("Seçim tek sınıftan olmalı");
  if (!bitisik) engeller.push("Seçilen hücreler bitişik olmalı");
  if (sinir.hucreAsimi) engeller.push(`İlçede en çok ${ILCE_HUCRE_SINIRI} hücre`);
  if (sinir.payAsimi) engeller.push(`İlçenin en çok ${yuzde(ILCE_PAY_SINIRI * 100)}'i`);
  return {
    sayi: secili.length,
    sinif,
    siniflar,
    hucreFiyati: sinif ? hucreFiyati(sinif, sayi.satilmis, sayi.uygun) : 0,
    toplam,
    sinir,
    bitisik,
    birlestir,
    engeller,
  };
}

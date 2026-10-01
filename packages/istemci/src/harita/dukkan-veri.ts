/**
 * Dükkân paneli görünüm verisi ve saf kurallar (G9 B, iskelet: sahte veri; sunucu karesi köprüsü K3'ün `kare.ozel.dukkanlar` / `genel.dukkanlar` /
 * `oyuncu.markalar` / `ilceler[].talep` / `oyuncu.ilkSatisT` alanlarından bu görünüme çevirir, burada kare şeması bilinmez).
 *
 * İçerik:
 *   - `DukkanGorunumu`: panelin okuduğu tek veri yüzü (dükkânlar, raf yuvaları, kampanya, marka); alanlar mili/ppm/ms, hesap yok;
 *   - `DukkanKaynagi`: görünümün nereden geldiği (üretimde köprü, testte `sahteDukkanKaynagi`); null = G7 kapalı, panel hiç çıkmaz;
 *   - `oneriDurumu`: D0 "ilk dükkân önerisi" ve B7 "sıradaki adım" kartının görünme kuralı (tek kart, öncelik dükkân önerisi);
 *   - `IlkSatisIzleyici`: "İlk satışın oldu; hayırlı olsun." bildirimi tek sefer (alan ilk göründüğünde);
 *   - `Depo` + `tarayiciDeposu`: kapatma / atlama tercihi (localStorage erişilemezse oturum içi).
 */
export type DukkanTuru = "bakkal" | "firin" | "sarkuteri" | "sekerci" | "yapi_market";
export const DUKKAN_TURLERI: readonly DukkanTuru[] = ["bakkal", "firin", "sarkuteri", "sekerci", "yapi_market"];

/** Fiyat kademesi: 0 kampanya, 1 uygun, 2 normal, 3 yüksek (`D6.kademe_*` sırası). */
export type Kademe = 0 | 1 | 2 | 3;

export interface DukkanYuvasi {
  /** Raftaki mal kimliği; null = boş yuva. */
  mal: string | null;
  /** Saklanan kademe ve (kampanya penceresine göre) etkin kademe. */
  kademe: Kademe;
  etkinKademe: Kademe;
  /** Rafta stok var mı (yok ise yuva çekime girmez: "stoğun yok"). */
  stokVar: boolean;
  /** Tahmini satış (mili-birim/saat; kasa kırpmalı istek). */
  istekMiliSaat: number;
  /** Raftaki birim fiyat (mili-₺). */
  fiyatMili: number;
  /** Bu yuvanın tahmini net getirisi (mili-₺/saat). */
  netMiliSaat: number;
  /** Son fiyat/mal değişim anı (sim ms; 0 = hiç). */
  fiyatT: number;
  /** Bu yuvada şu an fiyat değişikliği için kalan bekleme (sim saat; 0 = serbest). */
  beklemeSaat: number;
}

export interface DukkanKaydi {
  /** Ek yapı kimliği. */
  id: number;
  /** Dükkân türü; inşadaki dükkânda tür henüz bilinmeyebilir (null: türsüz çizilir, adı "Dükkân", simgesi genel `store`). */
  tur: DukkanTuru | null;
  durum: "insaat" | "acik";
  ilce?: string;
  /** Marka (tabela): kanonik küçük harfli ad; markasız ise boş. */
  markaAd: string;
  simge?: number;
  renk?: number;
  /** İnşaat bitişi (sim ms; `durum: "insaat"`). */
  bitis?: number;
  yuvalar: DukkanYuvasi[];
  /** Kasa doluluğu (ppm) ve stoğun talebi karşılama oranı (ppm). */
  kasaPpm: number;
  karsilanmaPpm: number;
  /** Tahmini gelir ve gider (mili-₺/saat); net = gelir - gider. (Birim satışı yuvaların `istekMiliSaat` toplamıdır.) */
  gelirMiliSa: number;
  giderMiliSa: number;
  /** Kampanya: bitiş (0 yok), bugün kalan saat, bu hafta kalan gün. */
  kampanya: { bitis: number; kalanSaat: number; kalanGun: number };
}

export interface DukkanGorunumu {
  /** Dünyada dükkân kuralı kapalıysa true (DUK-00: panel hiç çıkmaz). */
  kapali: boolean;
  dukkanlar: DukkanKaydi[];
  /** Oyuncunun marka tanımları (`[ad, simge, renk]`). */
  markalar: Array<[ad: string, simge: number, renk: number]>;
  /** İlk dükkân satışı anı (sim ms; hiç satış yoksa null). */
  ilkSatisT: number | null;
  /** Bir dükkân türünün satabileceği mal kimlikleri (rafa konabilir stok denetimi). */
  satilabilirMallar: ReadonlySet<string>;
  /** Dükkân kurma maliyet planlayıcısı: S bedelinin TAMAMINI (hazine, çelik, parça, pencere) karşılıyor mu. */
  kurmaKarsilaniyor: boolean;
  /** Dükkân kampanya (kademe 0) kuralı açık mı (`param.mulk.perakende`). */
  kampanyaAcik: boolean;
}

export interface DukkanKaynagi {
  /** Şimdiki görünüm; null = veri yok (G7 kapalı ya da henüz gelmedi). */
  gorunum(): DukkanGorunumu | null;
}

/** Sahte kaynak (test ve geliştirme): sabit görünüm verir, `guncelle` ile değiştirilir. */
export function sahteDukkanKaynagi(ilk: DukkanGorunumu | null): DukkanKaynagi & { guncelle: (g: DukkanGorunumu | null) => void } {
  let g = ilk;
  return {
    gorunum: () => g,
    guncelle: (y) => {
      g = y;
    },
  };
}

// --- D0 / B7 kart kuralı -------------------------------------------------------------------------

export interface OneriGirdisi {
  /** Oyuncunun yapıları (kısa: durum ve tür); büyütme inşaatı sayılmaz (zaten var olan tesise aittir). */
  yapilar: ReadonlyArray<{ durum: "insaat" | "tesis"; tur: string; yukseltme?: unknown }>;
  /** Ek yapı (ambar, ticaret ofisi, muhtarlık, konut, garaj, atölye, dükkân) mı: üretim tesisi sayılmaz. */
  ekYapiMi: (tur: string) => boolean;
  dukkan: DukkanGorunumu | null;
  /** Depoda rafa konabilir stok var mı (`rafaKonabilirStok`). */
  stokVar: boolean;
  /** "Dükkân kur" eylemi bağlı mı (`MulkPaneliSecenekleri.dukkanKur`). Bağlı değilse D0 kartı HİÇ çıkmaz (ölü uç olmasın): Defter kartı yerine geçer. */
  dukkanKurulabilir: boolean;
  /** D0 kartı kapatıldı mı (kalıcı tercih). */
  oneriKapatildi: boolean;
  /** B7 Defter kartı atlandı mı (kalıcı tercih). */
  defterAtlandi: boolean;
  /** Defter'in ilk etkin sıradaki adımı var mı. */
  defterSiradaki: boolean;
}

/** İşletme düğümünde İLK ÜRETİM YAPISININ inşası başlamış ya da bitmiş mi (inşa sürerken de kart çıkar; ek yapılar ve dükkân sayılmaz). */
export function uretimTesisiBasladi(yapilar: OneriGirdisi["yapilar"], ekYapiMi: (tur: string) => boolean): boolean {
  return yapilar.some((y) => !y.yukseltme && y.tur !== "" && y.tur !== "dukkan" && !ekYapiMi(y.tur));
}

/** Depoda rafa konabilir stok var mı (dükkân türlerinden en az birinin satabileceği mal, `mevcut > 0`). */
export function rafaKonabilirStok(mallar: ReadonlyArray<{ mal: string; stokMili: number }>, satilabilir: ReadonlySet<string>): boolean {
  return mallar.some((m) => m.stokMili > 0 && satilabilir.has(m.mal));
}

/**
 * Üstte hangi kart gösterilir: dükkân önerisi (D0), Defter kartı (B7) ya da hiçbiri. Dükkân önerisi varken Defter kartı ona katlanır (iki kart üst üste
 * binmez; D0 kartı Defter'in sıradaki adımını soluk bir satır olarak içinde taşır). D0 koşulu (hepsi birden): kapalı değil, kur eylemi bağlı, dükkân yok (inşadaki dahil), kart kapatılmamış, ilk üretim yapısının inşası başlamış, depoda rafa konabilir stok
 * var (`stokVar`), ve kurma planlayıcısı dükkân bedelinin tamamını karşılıyor.
 */
export function oneriDurumu(g: OneriGirdisi): "dukkan" | "defter" | null {
  const d = g.dukkan;
  const dukkanOneri = d !== null && g.dukkanKurulabilir && !d.kapali && d.dukkanlar.length === 0 && !g.oneriKapatildi && uretimTesisiBasladi(g.yapilar, g.ekYapiMi) && g.stokVar && d.kurmaKarsilaniyor;
  if (dukkanOneri) return "dukkan";
  return g.defterSiradaki && !g.defterAtlandi ? "defter" : null;
}

// --- ilk satış bildirimi ------------------------------------------------------------------------

/**
 * "İlk satışın oldu" bildirimi: `ilkSatisT` bu oturumda ilk kez görününce bir kez (kalıcı bayrakla yeniden yüklemede tekrarlamaz). İlk okumada alan zaten
 * varsa bu önceki oturumun satışıdır: bayrak yazılır, bildirim gösterilmez.
 */
export class IlkSatisIzleyici {
  private onceki: number | null | undefined;
  constructor(private readonly depo: Depo) {}

  /** `true` dönerse bildirim gösterilmeli. */
  kontrol(ilkSatisT: number | null): boolean {
    const ilkOkuma = this.onceki === undefined;
    const oncekiVardi = this.onceki !== undefined && this.onceki !== null;
    this.onceki = ilkSatisT;
    if (ilkSatisT === null) return false;
    const bildirildi = this.depo.oku(IL_SATIS_ANAHTARI) === "1";
    if (!bildirildi) this.depo.yaz(IL_SATIS_ANAHTARI, "1");
    return !ilkOkuma && !oncekiVardi && !bildirildi;
  }
}

// --- kalıcı tercihler ----------------------------------------------------------------------------

export const ONERI_KAPALI_ANAHTARI = "dukkan.oneri.kapali";
export const DEFTER_ATLA_ANAHTARI = "defter.ust.atlandi";
export const IL_SATIS_ANAHTARI = "dukkan.ilk_satis.bildirildi";

export interface Depo {
  oku(anahtar: string): string | null;
  yaz(anahtar: string, deger: string): void;
}

/** localStorage (erişilemezse ya da yazılamazsa oturum içi bellek): tercih yalnız kolaylıktır, sunucuda tutulmaz. */
export function tarayiciDeposu(): Depo {
  const bellek = new Map<string, string>();
  return {
    oku(a) {
      try {
        const v = globalThis.localStorage?.getItem(a);
        if (v !== null && v !== undefined) return v;
      } catch {
        /* erişilemez: bellek */
      }
      return bellek.get(a) ?? null;
    },
    yaz(a, d) {
      bellek.set(a, d);
      try {
        globalThis.localStorage?.setItem(a, d);
      } catch {
        /* yazılamaz: yalnız bellek */
      }
    },
  };
}

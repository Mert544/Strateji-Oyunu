/**
 * Esnaf Defteri kavram dedektörü (rehber-gorevler.md §3.1; sunucu P0): çekirdek durumunu YALNIZ okur, hiçbir şey yazmaz. Bir kavramın
 * koşulu sağlandığını saptar; ödülün günlüğe girmesi (`sistem_odul`), zamanı ve idempotansı `yazar.ts`'dedir.
 *
 * ## Kavram koşulları (her biri çekirdek durumundan türetilir; tutar sunucuda YAZILMAZ, çekirdek ödül tablosundadır)
 * | Kavram | Tür | Koşul |
 * | --- | --- | --- |
 * | `ilk_yapi` | ızgara | oyuncunun işletme düğümlerinin birinde TAMAMLANMIŞ üretim yapısı var (`BolgeDurumu.tesisler.length > 0`; süren inşaat sayılmaz) |
 * | `ilk_satis` | ızgara | `ticaretDefteri.toplam.brutIhracat` (tembel: toplam + oran x dt) > 0 |
 * | `ilk_isleme` | ızgara | düğümde İŞLEME yapısı (aktif yöntemi ham/ara girdiyi ara/tüketim malına çevirir; enerji hariç) VE o çıktı malının kümülatif üretimi (tembel) > 0 |
 * | `zincir_kapandi` | ızgara | oyuncunun iki FARKLI aktif yapısından birinin (enerji dışı) çıktısı ötekinin girdisi VE o çıktının kümülatif üretimi > 0 (en az bir üretim çevrimi) |
 * | `ikinci_ilce` | ızgara | tamamlanmış üretim yapıları EN AZ İKİ FARKLI ilçede (`ilk_yapi` ile aynı yapı tanımı; yalnız hücre sahipliği DEĞİL: al-bırak arbitrajı olmasın) |
 * | `ilk_arastirma` | ızgara | `teknolojiler.length > 0` (araştırma TAMAMLANDI; başlatma değil: iptal/iade arbitrajına kapalı) |
 * | `ilk_dukkan`, `ilk_sozlesme` | YER TUTUCU | çekirdekte olayı yok (dükkân P4, sözleşme sonra); TETİKLENMEZ |
 * Damgalar (para/mal yok; profilde): `ilk_parsel` (başarılı `parsel_al`), `ilk_uretim` (herhangi bir düğümde kümülatif üretim > 0, ızgara),
 * `ilk_donus` (iki kabul edilen komut arası >= 6 sa; yalnız mülk kipi, `sonEtkinlik`'ten).
 *
 * Yalnız insan oyuncular (sunucu botları ve sistem hariç) değerlendirilir. Koşullar saf işlevlerdir (aynı durum aynı sonuç).
 */
import { SAAT, carpBol } from "@bolge/cekirdek";
import type { BolgeDurumu, DerlenmisIcerik, Dunya, Ms, OyuncuDurumu } from "@bolge/cekirdek";

/**
 * Sunucunun saptadığı ödüllü kavramlar: HEPSİ her sim-saat sınırında değerlendirilir (ödül bedelden ucuz alınamasın: koşullar tamamlanmış
 * yapı/araştırma/üretim ister, komutla tek adımda sağlanamaz).
 */
export const ODUL_IZGARA_KAVRAMLARI = ["ilk_yapi", "ilk_satis", "ilk_isleme", "zincir_kapandi", "ikinci_ilce", "ilk_arastirma"] as const;
/** Çekirdekte olayı olmayan kavramlar: dedektörde yer tutucudur, tetiklenmez. */
export const ODUL_YER_TUTUCULARI = ["ilk_dukkan", "ilk_sozlesme"] as const;
/** Sabit değerlendirme sırası (deterministik: aynı anda birden çok kavram doğarsa bu sırayla günlüğe girer). */
export const ODUL_SIRASI = ODUL_IZGARA_KAVRAMLARI;

/** Izgara aralığı: sim-saat sınırı. */
export const IZGARA_MS = SAAT;
/** `ilk_donus`: iki kabul edilen komut arası bu kadar ya da daha uzunsa. */
export const DONUS_ESIGI_MS = 6 * SAAT;

export interface OdulAday {
  oyuncu: string;
  kavram: string;
}

/** Oyuncunun işletme düğümleri (mülk kipi) ya da sahip olduğu bölgeler (bölge kipi). */
export function oyuncuDugumleri(d: Readonly<Dunya>, oyuncu: string): BolgeDurumu[] {
  if (d.mulk !== undefined) {
    const l: BolgeDurumu[] = [];
    for (const e of d.mulk.isletmeler) if (e.oyuncu === oyuncu) {
      const b = d.bolgeler[e.bolgeIndeksi];
      if (b) l.push(b);
    }
    return l;
  }
  return d.bolgeler.filter((b) => b.sahip === oyuncu);
}

/** Tembel kümülatif üretim (mili-birim): `uretimToplam + uretimOrani x (t - uretimT0)`. */
function uretimTembel(b: Readonly<BolgeDurumu>, mal: number, t: Ms): number {
  const dt = t - b.uretimT0;
  const toplam = b.uretimToplam[mal] ?? 0;
  const oran = b.uretimOrani[mal] ?? 0;
  return dt > 0 && oran !== 0 ? toplam + carpBol(oran, dt, SAAT) : toplam;
}

/** İşleme yöntemi: ham/ara girdiyi ara/tüketim malına çevirir (enerji ve askeri çıktı/girdi dışarıda). */
export function islemeYontemiMi(ic: DerlenmisIcerik, yontem: number): boolean {
  const y = ic.yontemler[yontem];
  if (!y) return false;
  let girdi = false;
  for (const m of Object.keys(y.girdiler)) {
    const k = ic.mallar[ic.malIndeks[m] as number]?.kategori;
    if (k === "ham" || k === "ara") girdi = true;
  }
  if (!girdi) return false;
  for (const m of Object.keys(y.ciktilar)) {
    const k = ic.mallar[ic.malIndeks[m] as number]?.kategori;
    if (k === "ara" || k === "tuketim") return true;
  }
  return false;
}

function ilkYapi(d: Readonly<Dunya>, o: Readonly<OyuncuDurumu>): boolean {
  return oyuncuDugumleri(d, o.id).some((b) => b.tesisler.length > 0);
}

function ilkSatis(o: Readonly<OyuncuDurumu>, t: Ms): boolean {
  const df = o.ticaretDefteri;
  if (!df) return false;
  const dt = t - df.t0;
  const v = dt > 0 && df.oran.brutIhracat !== 0 ? df.toplam.brutIhracat + carpBol(df.oran.brutIhracat, dt, SAAT) : df.toplam.brutIhracat;
  return v > 0;
}

function ilkIsleme(ic: DerlenmisIcerik, d: Readonly<Dunya>, o: Readonly<OyuncuDurumu>, t: Ms): boolean {
  for (const b of oyuncuDugumleri(d, o.id)) {
    for (const ts of b.tesisler) {
      if (!islemeYontemiMi(ic, ts.yontem)) continue;
      const y = ic.yontemler[ts.yontem];
      if (!y) continue;
      for (const m of Object.keys(y.ciktilar).sort()) {
        const mi = ic.malIndeks[m] as number;
        const k = ic.mallar[mi]?.kategori;
        if ((k === "ara" || k === "tuketim") && uretimTembel(b, mi, t) > 0) return true;
      }
    }
  }
  return false;
}

/** Enerji dışı (depolanabilir) çıktı/girdi kümeleri. */
function malKumesi(ic: DerlenmisIcerik, kayit: Readonly<Record<string, number>>): Set<string> {
  const s = new Set<string>();
  for (const m of Object.keys(kayit)) {
    if (ic.mallar[ic.malIndeks[m] as number]?.kategori !== "enerji") s.add(m);
  }
  return s;
}

function zincirKapandi(ic: DerlenmisIcerik, d: Readonly<Dunya>, o: Readonly<OyuncuDurumu>, t: Ms): boolean {
  // Yapı başına: (enerji dışı) ÇIKTISI ÜRETİLMİŞ mallar (kümülatif üretim > 0 = en az bir üretim çevrimi) ve girdi malları.
  const yapilar: Array<{ cikti: Set<string>; girdi: Set<string> }> = [];
  for (const b of oyuncuDugumleri(d, o.id)) {
    for (const ts of b.tesisler) {
      if (!ts.aktif) continue;
      const y = ic.yontemler[ts.yontem];
      if (!y) continue;
      const cikti = new Set<string>();
      for (const m of malKumesi(ic, y.ciktilar)) if (uretimTembel(b, ic.malIndeks[m] as number, t) > 0) cikti.add(m);
      yapilar.push({ cikti, girdi: malKumesi(ic, y.girdiler) });
    }
  }
  for (let a = 0; a < yapilar.length; a++) {
    for (let b = 0; b < yapilar.length; b++) {
      if (a === b) continue;
      for (const m of (yapilar[a] as { cikti: Set<string> }).cikti) if ((yapilar[b] as { girdi: Set<string> }).girdi.has(m)) return true;
    }
  }
  return false;
}

/** Tamamlanmış üretim yapılarının bulunduğu FARKLI ilçe sayısı >= 2 (yapı hücresinin ilçesi; ilçe bilinmeyen yapı sayılmaz). */
function ikinciIlce(ic: DerlenmisIcerik, d: Readonly<Dunya>, o: Readonly<OyuncuDurumu>): boolean {
  const ilceler = new Set<string>();
  for (const b of oyuncuDugumleri(d, o.id)) {
    for (const ts of b.tesisler) {
      const h = ts.hucreler?.[0];
      const ilce = h !== undefined ? ic.mulk?.hucreler.get(h)?.ilce : undefined;
      if (ilce !== undefined) ilceler.add(ilce);
    }
  }
  return ilceler.size >= 2;
}

function ilkArastirma(o: Readonly<OyuncuDurumu>): boolean {
  return o.teknolojiler.length > 0;
}

/** Kavramın koşulu `t` anındaki durumda sağlanıyor mu (yer tutucular ve bilinmeyenler için false). */
export function kavramSaglandi(ic: DerlenmisIcerik, d: Readonly<Dunya>, o: Readonly<OyuncuDurumu>, kavram: string, t: Ms): boolean {
  switch (kavram) {
    case "ilk_yapi":
      return ilkYapi(d, o);
    case "ilk_satis":
      return ilkSatis(o, t);
    case "ilk_isleme":
      return ilkIsleme(ic, d, o, t);
    case "zincir_kapandi":
      return zincirKapandi(ic, d, o, t);
    case "ikinci_ilce":
      return ikinciIlce(ic, d, o);
    case "ilk_arastirma":
      return ilkArastirma(o);
    default:
      return false;
  }
}

/** `ilk_uretim` damgası: herhangi bir düğümde herhangi bir malın kümülatif üretimi > 0. */
export function ilkUretim(d: Readonly<Dunya>, oyuncu: string, t: Ms): boolean {
  for (const b of oyuncuDugumleri(d, oyuncu)) {
    for (let m = 0; m < b.uretimToplam.length; m++) if (uretimTembel(b, m, t) > 0) return true;
  }
  return false;
}

/** Oyuncunun `sonEtkinlik`'i (mülk kipi; yoksa null): `ilk_donus` için komut ÖNCESİ okunur. */
export function sonEtkinlik(d: Readonly<Dunya>, oyuncu: string): number | null {
  return d.mulk?.oyuncular.find((x) => x.id === oyuncu)?.sonEtkinlik ?? null;
}

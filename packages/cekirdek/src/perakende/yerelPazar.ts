/**
 * Yerel pazar (G7a; şartname docs/arastirma/p4-p5-sartname.md §6.4-6.6): ilçedeki dükkânlar ve görünmez esnaf arasında NPC hane talebinin paylaştırılması.
 *
 * SAF MODÜL: dünya durumuna, içeriğe ve çözüme BAĞLI DEĞİLDİR (bağlama G6'dan sonra ayrıca kararlaştırılır). Girdi, çağıranın dünyadan çıkardığı düz
 * yapılardır; çıktı geçicidir. Tamsayı ve PPM aritmetiği (`carpBol`: aşağı yuvarlar, ara çarpım 2^53'ü aşarsa BigInt); kayan nokta, `Math.pow`,
 * `Math.sqrt`, rastgelelik, `Date` ve `Map` yineleme sırasına bağlılık YOKTUR. Sonuç yalnız girdinin fonksiyonudur ve girdi sırasından bağımsızdır
 * (girdi dizileri burada AÇIKÇA sıralanır).
 *
 * İçerik:
 *  1. `yerelPazarHesapla` / `ilcePaylastir` / `turPayi`: §6.4 Adım 2-6 (çeşit, ağırlık, ilçe x mal su-doldurma paylaşımı, tur payı, havuz üst sınırı, satırlar).
 *     Adım 0 (dükkânları ilçeye göre toplama) ve Adım 1 (mal mevcudiyeti) dünyaya bakar; çağıranın işidir ve `YerelYuva.mevcut` ile gelir.
 *  2. `etkinKademe`: §7.5b kampanya penceresinde yuvanın etkin fiyat kademesi (ağırlığın girdisi `fiyatPpm`).
 *  3. Talep Q (§6.5): `ilceNufusEsdegeri`, `talepTabani`, `bayramCarpani`, `yerelTalep`.
 *  4. Para (§6.4 Adım 7, §6.6): `yerelSatisGeliri`.
 *
 * SIRALAMA KURALLARI (hepsi açık; bozulması sonucu değiştirir):
 *  - ilçeler: ilçe kimliğine göre, JS dize sırası (`<`);
 *  - ilçe içinde dükkânlar: (oyuncu kimliği dize sırası, `ekYapi` sayısal) artan; aynı (oyuncu, ekYapi) iki kez verilirse hata;
 *  - bir dükkânın yuvaları: dizideki sıra (yuva indeksi);
 *  - mallar: mal kimliği dize sırası (`<`);
 *  - paylaşımda yuva sırası (kalan birimlerin dağıtımı): (dükkân sırası, yuva indeksi);
 *  - çıktı satırları: (`dugum` sayısal, `mal` dize, `ekYapi` sayısal, `yuva` sayısal).
 */
import { carpBol } from "../sabit";
import { GUN, MILI, PPM } from "../tipler";
import type { Mili, Ms } from "../tipler";

/** Kasa kırpmasının su-doldurma tur sınırı (§6.4 Adım 4). */
export const EN_COK_TUR = 32;

export type IlceSinifi = "kirsal" | "kasaba" | "sehir";

// ---------------------------------------------------------------------------
// 1. Çekim: tipler
// ---------------------------------------------------------------------------

/** Çekim parametreleri (`param.mulk.perakende`'den çağıran verir). */
export interface YerelCekimParametreleri {
  /** Çeşit çarpanı katsayısı (ppm): w x (PPM + cesitKatsayiPpm x cesit / PPM). A2: 250 000. */
  cesitKatsayiPpm: number;
  /** Esnaf (görünmez arka plan dükkân): fiyat R'nin katı (ppm) ve oyuncu havuzunun tabanı (ppm). A2: 1 120 000 ve 250 000. */
  esnaf: { fiyatPpm: number; tabanPayPpm: number };
}

/** Bir raf yuvası. Boş yuva (`mal` tanımsız) ve stoksuz yuva (`mevcut` yanlış) çekime girmez; çeşit paydasına da girmez. */
export interface YerelYuva {
  mal?: string;
  /** §6.4 Adım 1: oyuncunun herhangi bir düğümünde mal stokta, üretimde ya da gelen akışta var. Çağıran hesaplar. */
  mevcut: boolean;
  /** ETKİN kademenin çarpanı (ppm): `fiyatKademeleriPpm[etkinKademe]`, > 0. Dükkân fiyatı = R x fiyatPpm / PPM. */
  fiyatPpm: number;
}

/** Bir dükkân. */
export interface YerelDukkan {
  /** Çıktıya aynen taşınır (dükkânın bağlı olduğu işletme düğümü; çağıranın tanımı). */
  dugum: number;
  oyuncu: string;
  /** `EkYapiDurumu.id`. (oyuncu, ekYapi) ilçe içinde tektir. */
  ekYapi: number;
  /** Tam çeşit için gereken dolu yuva sayısı (`dukkanTurleri[].tamCesit`). */
  tamCesit: number;
  /** Kasa kapasitesi, mili-birim/saat, TÜM mallar toplamı (`olcekler[olcek].kasaMiliSaat`). */
  kasaMiliSaat: number;
  /** Ölçek çekim çarpanı (ppm; `olcekler[olcek].cekimCarpaniPpm`; Alfa-0 S: PPM). */
  cekimCarpaniPpm: number;
  /** İşletme gideri, mili-₺/saat (`olcekler[olcek].giderMiliSaat`). */
  giderMiliSaat: number;
  yuvalar: readonly YerelYuva[];
}

/** Bir ilçe: o ilçenin mal başına talebi ve dükkânları. */
export interface YerelIlce {
  ilce: string;
  /** Mal -> Q (mili-birim/saat), §6.5. Q = 0 olan mal paylaşıma girmez. Aynı mal iki kez verilemez. */
  talep: readonly { mal: string; q: number }[];
  dukkanlar: readonly YerelDukkan[];
}

/** Bir yuvanın isteği (mili-birim/saat). Yalnız `istek > 0` olan yuvalar yazılır. */
export interface YerelSatir {
  ilce: string;
  dugum: number;
  oyuncu: string;
  ekYapi: number;
  yuva: number;
  mal: string;
  istek: number;
  /** Satışın fiyat çarpanı (ppm), girdideki etkin kademe çarpanı. */
  fiyatPpm: number;
}

export interface YerelPazarSonucu {
  /** (dugum, mal, ekYapi, yuva) sıralı. */
  satirlar: YerelSatir[];
  /** Düğüm x mal toplam istek (`h.dukkan[m]` girdisi); (dugum, mal) sıralı; yalnız > 0. */
  dugumIstek: { dugum: number; mal: string; istek: number }[];
  /** Düğüm başına dükkân gideri toplamı, mili-₺/saat (girdideki TÜM dükkânlar); dugum sıralı. */
  dugumGider: { dugum: number; giderMiliSaat: number }[];
}

// ---------------------------------------------------------------------------
// 1. Çekim: yardımcılar
// ---------------------------------------------------------------------------

function dizgeKucukMu(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function tamsayiDenetle(ad: string, x: number, alt: number): void {
  if (!Number.isSafeInteger(x) || x < alt) throw new RangeError(`yerelPazar: ${ad} ${alt} ya da buyuk guvenli tamsayi olmali (${String(x)})`);
}

/**
 * (R / fiyat)^2 tamsayı karşılığı: `ters = PPM^2 / p`, `kare = ters^2 / PPM` (§6.4 Adım 3). p ∈ [700 000, 1 400 000] ise ters ∈ [714 285, 1 428 571].
 */
export function fiyatKaresi(fiyatPpm: number): number {
  tamsayiDenetle("fiyatPpm", fiyatPpm, 1);
  const ters = carpBol(PPM, PPM, fiyatPpm);
  return carpBol(ters, ters, PPM);
}

/** Dükkân yuvasının çekim ağırlığı (§6.4 Adım 3): `kare x (PPM + cesitKatsayi x cesit / PPM) x olcekCarpan`, her çarpım PPM'e bölünerek aşağı yuvarlanır. */
export function yuvaAgirligi(fiyatPpm: number, cesitPpm: number, cesitKatsayiPpm: number, cekimCarpaniPpm: number): number {
  const kare = fiyatKaresi(fiyatPpm);
  const cesitC = PPM + carpBol(cesitKatsayiPpm, cesitPpm, PPM);
  return carpBol(carpBol(kare, cesitC, PPM), cekimCarpaniPpm, PPM);
}

/** Esnafın ağırlığı: aynı `ters`/`kare`; çeşit ve ölçek çarpanı yoktur. */
export function esnafAgirligi(esnafFiyatPpm: number): number {
  return fiyatKaresi(esnafFiyatPpm);
}

/** Çeşit oranı (ppm): `dolu >= tamCesit ? PPM : dolu x PPM / tamCesit` (§6.4 Adım 2; anlık, 24 saatlik pencere yok). */
export function cesitOrani(dolu: number, tamCesit: number): number {
  return dolu >= tamCesit ? PPM : carpBol(dolu, PPM, tamCesit);
}

/**
 * Tek (ilçe, mal) turunun oyuncu payı (şartname §6.4 Adım 4a; Ek B V5): `Qr <= 0` ise HERKES SIFIR (önceki turun payı taşınmaz; durum ulaşılamaz, kural savunmadır
 * ama belirlenimcidir); aksi halde esnaf taban payı ile oyuncu havuzu `P = Qr - floor(Qr x esnafPay / PPM)` ağırlıklarla bölünür (`floor(P x w_i / Σw)`) ve
 * kalan birimler (0 <= kalan < |ws|) sıradaki ilk yuvalara +1 verilir. `esnafPay = max(tabanPayPpm, floor(wE x PPM / (Σw + wE)))`. `ws` boşsa boş dizi.
 */
export function turPayi(Qr: number, ws: readonly number[], wE: number, tabanPayPpm: number): number[] {
  if (ws.length === 0) return [];
  if (Qr <= 0) return ws.map(() => 0);
  let sw = 0;
  for (const w of ws) sw += w;
  const pay0 = carpBol(wE, PPM, sw + wE);
  const esnafPay = pay0 > tabanPayPpm ? pay0 : tabanPayPpm;
  const P = Qr - carpBol(Qr, esnafPay, PPM); // oyuncu havuzu
  const s = ws.map((w) => carpBol(P, w, sw));
  let kalan = P - s.reduce((a, b) => a + b, 0);
  for (let i = 0; kalan > 0; i++, kalan--) s[i] = (s[i] as number) + 1;
  return s;
}

interface YuvaHesabi {
  dukkan: number;
  yuva: number;
  mal: string;
  w: number;
  s: number;
}

interface DukkanHesabi {
  d: YerelDukkan;
  yuvalar: YuvaHesabi[];
  donuk: boolean;
}

function dukkanSirasi(a: YerelDukkan, b: YerelDukkan): number {
  return dizgeKucukMu(a.oyuncu, b.oyuncu) || a.ekYapi - b.ekYapi;
}

// ---------------------------------------------------------------------------
// 1. Çekim: ilçe paylaşımı (§6.4 Adım 2-6)
// ---------------------------------------------------------------------------

/**
 * Tek ilçenin paylaşımı: su-doldurmalı kasa kırpması (en çok `EN_COK_TUR` tur) ve oyuncu havuzu üst sınırı. Dünyayı değiştirmez; girdi dizilerini değiştirmez.
 * `izle` (isteğe bağlı, yalnız test/ölçüm): donmamış yuvası olan her (tur, mal) için turun kalan talebi `Qr` verilir (değişmez: her zaman >= 1; şartname §6.4).
 * Satırlar (dugum, mal, ekYapi, yuva) sıralıdır.
 */
export function ilcePaylastir(p: YerelCekimParametreleri, ilce: YerelIlce, izle?: (tur: number, mal: string, kalanTalep: number) => void): YerelSatir[] {
  tamsayiDenetle("cesitKatsayiPpm", p.cesitKatsayiPpm, 0);
  tamsayiDenetle("esnaf.fiyatPpm", p.esnaf.fiyatPpm, 1);
  tamsayiDenetle("esnaf.tabanPayPpm", p.esnaf.tabanPayPpm, 0);
  if (p.esnaf.tabanPayPpm > PPM) throw new RangeError("yerelPazar: esnaf.tabanPayPpm PPM'i asamaz");

  // Mallar: kimlik dizesi sırası; yinelenen mal ve geçersiz Q reddedilir.
  const talep = [...ilce.talep].sort((a, b) => dizgeKucukMu(a.mal, b.mal));
  for (let i = 0; i < talep.length; i++) {
    const t = talep[i] as { mal: string; q: number };
    tamsayiDenetle(`talep[${t.mal}].q`, t.q, 0);
    if (i > 0 && (talep[i - 1] as { mal: string }).mal === t.mal) throw new RangeError(`yerelPazar: yinelenen talep malı (${t.mal})`);
  }

  // Dükkânlar: (oyuncu, ekYapi) sıralı; çift anahtar reddedilir.
  const sirali = [...ilce.dukkanlar].sort(dukkanSirasi);
  for (let i = 1; i < sirali.length; i++) {
    const a = sirali[i - 1] as YerelDukkan;
    const b = sirali[i] as YerelDukkan;
    if (a.oyuncu === b.oyuncu && a.ekYapi === b.ekYapi) throw new RangeError(`yerelPazar: yinelenen dukkan (${a.oyuncu}, ${a.ekYapi})`);
  }

  const wE = esnafAgirligi(p.esnaf.fiyatPpm);
  const dukkanlar: DukkanHesabi[] = sirali.map((d, di) => {
    tamsayiDenetle("kasaMiliSaat", d.kasaMiliSaat, 0);
    tamsayiDenetle("cekimCarpaniPpm", d.cekimCarpaniPpm, 1);
    tamsayiDenetle("tamCesit", d.tamCesit, 0);
    let dolu = 0;
    for (const y of d.yuvalar) if (y.mal !== undefined && y.mevcut) dolu++;
    const cesit = cesitOrani(dolu, d.tamCesit);
    const yuvalar: YuvaHesabi[] = [];
    d.yuvalar.forEach((y, yi) => {
      if (y.mal === undefined || !y.mevcut) return; // boş ya da stoksuz yuva: ağırlık 0, çekime girmez
      yuvalar.push({ dukkan: di, yuva: yi, mal: y.mal, w: yuvaAgirligi(y.fiyatPpm, cesit, p.cesitKatsayiPpm, d.cekimCarpaniPpm), s: 0 });
    });
    return { d, yuvalar, donuk: false };
  });

  const sabit = new Map<string, number>(); // mal -> donmuş dükkânların aldığı toplam
  for (const t of talep) sabit.set(t.mal, 0);

  for (let tur = 0; tur < EN_COK_TUR; tur++) {
    // a) her mal için kalan talebi donmamış dükkânların yuvaları ile esnaf arasında paylaştır
    for (const t of talep) {
      if (t.q <= 0) continue;
      const L: YuvaHesabi[] = [];
      for (const dk of dukkanlar) {
        if (dk.donuk) continue;
        for (const y of dk.yuvalar) if (y.mal === t.mal && y.w > 0) L.push(y);
      }
      const Qr = t.q - (sabit.get(t.mal) as number);
      if (L.length === 0) continue; // donmamış yuva yok: bu mal bu turda atlanır
      izle?.(tur, t.mal, Qr);
      const pay = turPayi(Qr, L.map((y) => y.w), wE, p.esnaf.tabanPayPpm);
      L.forEach((y, i) => (y.s = pay[i] as number));
    }
    // b) kasası aşılan donmamış dükkânlar
    const yeni: { dk: DukkanHesabi; top: number }[] = [];
    for (const dk of dukkanlar) {
      if (dk.donuk) continue;
      let top = 0;
      for (const y of dk.yuvalar) top += y.s;
      if (top > dk.d.kasaMiliSaat) yeni.push({ dk, top });
    }
    // c) yeni dolan yoksa dur; varsa orantılı kıs, dondur ve taşan talebi sonraki turda yeniden dağıt
    if (yeni.length === 0) break;
    for (const { dk, top } of yeni) {
      for (const y of dk.yuvalar) {
        y.s = carpBol(y.s, dk.d.kasaMiliSaat, top);
        sabit.set(y.mal, (sabit.get(y.mal) ?? 0) + y.s);
      }
      dk.donuk = true;
    }
    if (tur === EN_COK_TUR - 1) break;
  }
  // Son geçiş: tur sınırı dolduysa hâlâ kasayı aşan dükkân orantılı kısılır.
  for (const dk of dukkanlar) {
    let top = 0;
    for (const y of dk.yuvalar) top += y.s;
    if (top > dk.d.kasaMiliSaat) for (const y of dk.yuvalar) y.s = carpBol(y.s, dk.d.kasaMiliSaat, top);
  }

  // Adım 5: oyuncu havuzu üst sınırı (ilçe x mal): tüm yuvaların (donmuşlar dahil) toplamı Q - floor(Q x tabanPay) değerini aşamaz.
  for (const t of talep) {
    const limit = t.q - carpBol(t.q, p.esnaf.tabanPayPpm, PPM);
    let toplam = 0;
    for (const dk of dukkanlar) for (const y of dk.yuvalar) if (y.mal === t.mal) toplam += y.s;
    if (toplam > limit) for (const dk of dukkanlar) for (const y of dk.yuvalar) if (y.mal === t.mal) y.s = carpBol(y.s, limit, toplam);
  }

  // Adım 6: satırlar
  const satirlar: YerelSatir[] = [];
  for (const dk of dukkanlar) {
    for (const y of dk.yuvalar) {
      if (y.s <= 0) continue;
      satirlar.push({
        ilce: ilce.ilce,
        dugum: dk.d.dugum,
        oyuncu: dk.d.oyuncu,
        ekYapi: dk.d.ekYapi,
        yuva: y.yuva,
        mal: y.mal,
        istek: y.s,
        fiyatPpm: (dk.d.yuvalar[y.yuva] as YerelYuva).fiyatPpm,
      });
    }
  }
  return satirSirala(satirlar);
}

function satirSirala(l: YerelSatir[]): YerelSatir[] {
  return l.sort((a, b) => a.dugum - b.dugum || dizgeKucukMu(a.mal, b.mal) || a.ekYapi - b.ekYapi || a.yuva - b.yuva);
}

/**
 * Bütün ilçelerin paylaşımı (çözüm başına tek geçiş). İlçeler kimlik sırasıyla; aynı ilçe iki kez verilirse hata. Dükkânı olmayan ya da talebi 0 olan
 * ilçe satır üretmez. Satırlar (dugum, mal, ekYapi, yuva) sıralı birleşir; `dugumIstek` ve `dugumGider` bunlardan türetilir.
 */
export function yerelPazarHesapla(p: YerelCekimParametreleri, ilceler: readonly YerelIlce[]): YerelPazarSonucu {
  const sirali = [...ilceler].sort((a, b) => dizgeKucukMu(a.ilce, b.ilce));
  for (let i = 1; i < sirali.length; i++) {
    if ((sirali[i - 1] as YerelIlce).ilce === (sirali[i] as YerelIlce).ilce) throw new RangeError(`yerelPazar: yinelenen ilce (${(sirali[i] as YerelIlce).ilce})`);
  }
  const satirlar: YerelSatir[] = [];
  const gider = new Map<number, number>();
  for (const c of sirali) {
    for (const s of ilcePaylastir(p, c)) satirlar.push(s);
    for (const d of c.dukkanlar) {
      tamsayiDenetle("giderMiliSaat", d.giderMiliSaat, 0);
      gider.set(d.dugum, (gider.get(d.dugum) ?? 0) + d.giderMiliSaat);
    }
  }
  satirSirala(satirlar);
  const dugumIstek: { dugum: number; mal: string; istek: number }[] = [];
  for (const s of satirlar) {
    const son = dugumIstek[dugumIstek.length - 1];
    if (son !== undefined && son.dugum === s.dugum && son.mal === s.mal) son.istek += s.istek;
    else dugumIstek.push({ dugum: s.dugum, mal: s.mal, istek: s.istek });
  }
  const dugumGider = [...gider.entries()].sort((a, b) => a[0] - b[0]).map(([dugum, giderMiliSaat]) => ({ dugum, giderMiliSaat }));
  return { satirlar, dugumIstek, dugumGider };
}

// ---------------------------------------------------------------------------
// 2. Etkin kademe (§7.5b)
// ---------------------------------------------------------------------------

/**
 * Yuvanın ETKİN fiyat kademesi (saf; yalnız (durum, t) fonksiyonu): yuva `kampanyaKademesi` dışındaysa kendi kademesi; kampanya kademesindeyse ve kampanya
 * etkinse (`kampanyaBitis > t`) kampanya kademesi; aksi halde `varsayilanKademe` (otomatik dönüş; yuvanın durumu DEĞİŞTİRİLMEZ).
 * `kampanyaKademesi` tanımsızsa kampanya yoktur: yuvanın kademesi aynen döner.
 */
export function etkinKademe(yuvaKademesi: number, kampanyaKademesi: number | undefined, kampanyaBitis: Ms | undefined, varsayilanKademe: number, t: Ms): number {
  if (kampanyaKademesi === undefined || yuvaKademesi !== kampanyaKademesi) return yuvaKademesi;
  return kampanyaBitis !== undefined && kampanyaBitis > t ? kampanyaKademesi : varsayilanKademe;
}

// ---------------------------------------------------------------------------
// 3. Talep Q (§6.5)
// ---------------------------------------------------------------------------

/**
 * İlçe nüfus eşdeğeri (kişi; şartname §6.5, baş lider onaylı): fikstürdeki isteğe bağlı `nufus`, yoksa ilçenin fikstürdeki `sinif` alanına bağlı yedek sabit
 * `ilceSinifiNufus[sinif]`. HÜCRE SINIFI HESAPLANMAZ ve kullanılmaz; ilçe seviyesi yoktur (kilitsizlik). Saf; iki yol da testlidir.
 */
export function ilceNufusEsdegeri(ilce: { nufus?: number; sinif: IlceSinifi }, ilceSinifiNufus: Readonly<Record<IlceSinifi, number>>): number {
  return ilce.nufus ?? ilceSinifiNufus[ilce.sinif];
}

/**
 * `taban[ilçe][mal] = talep1000Saat[mal] x yerelOlcek x ilceNufusEsdegeri(ilçe) / 1000` (mili-birim/saat; derlemede bir kez). İlçe seviyesi yoktur.
 * Ara çarpım `talep1000Saat x yerelOlcek` ilk bölmeden ÖNCE tam çarpılır (`carpBol(talep1000Saat x yerelOlcek, nufus, 1000)`).
 */
export function talepTabani(talep1000Saat: number, yerelOlcek: number, nufusEsdegeri: number): number {
  return carpBol(talep1000Saat * yerelOlcek, nufusEsdegeri, 1000);
}

/** Toplam-sabit bayram dalgası (A2 §1.9): bayramdan `oncesiGun` gün önce talep x oncesiPpm, bayram günü dahil sonraki `sonrasiGun` gün x sonrasiPpm. */
export interface BayramDalgasi {
  oncesiGun: number;
  oncesiPpm: number;
  sonrasiGun: number;
  sonrasiPpm: number;
}

/**
 * Bayram çarpanı (PPM = etkisiz). `bayramGunleri` kesin artan sim günü indeksleridir (bayramın ilk günü). Pencereler: `[B - Do, B - 1]` oncesiPpm ve
 * `[B, B + Ds - 1]` sonrasiPpm (bayram günü dahil); gün bu pencerelerin dışındaysa PPM. Pencereler çakışmaz (doğrulayıcı: komşu bayram farkı >= Do + Ds).
 * `dalga` tanımsızsa (grubun bayramı yok) PPM.
 */
export function bayramCarpani(dalga: BayramDalgasi | undefined, bayramGunleri: readonly number[], gun: number): number {
  if (dalga === undefined) return PPM;
  for (const B of bayramGunleri) {
    if (gun < B - dalga.oncesiGun) break; // sonraki bayramlar daha ileri
    if (gun < B) return dalga.oncesiPpm;
    if (gun < B + dalga.sonrasiGun) return dalga.sonrasiPpm;
  }
  return PPM;
}

/**
 * Yerel talep Q (mili-birim/saat), (mal, ilçe, t) için: `floor(floor(taban x takvim / PPM) x bayram / PPM)`.
 *  - `taban`: `talepTabani` (0 ise 0);
 *  - `takvimPpm` ve `ay`: malın grubunun 12 aylık takvimi ve `takvimAyi(ic, t)` (0-11); tarım kapalıysa `ay` null ve takvim UYGULANMAZ;
 *  - `bayram`: grubun bayram dalgası (yoksa tanımsız), `bayramGunleri`; gün = `floor(t / GUN)` (sim günü; epoch dünya başlangıcı).
 */
export function yerelTalep(taban: number, takvimPpm: readonly number[], ay: number | null, dalga: BayramDalgasi | undefined, bayramGunleri: readonly number[], t: Ms): number {
  if (taban === 0) return 0;
  const q = ay === null ? taban : carpBol(taban, takvimPpm[ay] as number, PPM);
  const w = bayramCarpani(dalga, bayramGunleri, Math.floor(t / GUN));
  return w === PPM ? q : carpBol(q, w, PPM);
}

// ---------------------------------------------------------------------------
// 4. Gelir (§6.4 Adım 7)
// ---------------------------------------------------------------------------

/**
 * Bir satırın gerçekleşen satışı ve geliri (`hazineKalemleri` içinde; saatlik oran birimleri):
 *   gercek = istek x karsilanmaPpm / PPM            (mili-birim/saat; `karsilanmaPpm` = düğümün `frD[mal]`)
 *   brut   = gercek x R / MILI                       (mili-₺/saat; `R` = d.pazar.fiyat[mal], mili-₺ cinsinden birim fiyat)
 *   gelir  = brut x fiyatPpm / PPM                   (dükkân fiyatı = R x kademe)
 * `karsilanmaPpm` tanımsızsa (çözüm öncesi ödeme gücü tahmini; `hesaplar === null`) `gercek = istek` alınır. Her bölme aşağı yuvarlar.
 */
export function yerelSatisGeliri(istek: Mili, fiyatPpm: number, referansFiyat: Mili, karsilanmaPpm?: number): { gercek: Mili; brut: Mili; gelir: Mili } {
  const gercek = karsilanmaPpm === undefined ? istek : carpBol(istek, karsilanmaPpm, PPM);
  const brut = carpBol(gercek, referansFiyat, MILI);
  const gelir = carpBol(brut, fiyatPpm, PPM);
  return { gercek, brut, gelir };
}

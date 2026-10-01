/**
 * Mülk komutları (S3, docs/11 §7.2–§7.3): parsel_al, tesis_insa_hucre, yapi_yerlestir, parsel_birak, insaat_iptal.
 *
 * Hepsi ya da hiçbiri: tüm denetimler önce yapılır, sonra durum değişir; başarısız komut dünyayı (hazinenin temsili dahil)
 * değiştirmez (docs/06 §14 başarısız komut sözleşmesi). Mülk kipi kapalıysa her mülk komutu reddedilir.
 *
 * - parsel_al {ilce, hucreler, sinif}: hücreler fikstürde bu ilçede, uygun ve komuttaki sınıfta olmalı, kimseye ait olmamalı,
 *   tekrarlanmamalı. Sınır: oyuncu ilçede en çok `ilceHucreTavani` (72) hücre ve uygun hücrelerin en çok `ilcePayTavaniPpm`
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
import { anlikHazine, hazineEkle, oyuncuBul, stokEkle } from "../stok";
import { tesisTuruAcikMi } from "../teknoloji";
import { GUN, PPM, SAAT } from "../tipler";
import type {
  ArsaSinifi,
  Baglam,
  BolgeDurumu,
  DerlenmisEkYapi,
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
} from "../tipler";
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
import { isletmeAl } from "./isletme";
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

/** Ayrılmış hücre sahipliği hatası iletisi için gün sayısı. */
function ayrilmisGun(mk: DerlenmisMulk): number {
  return Math.floor(mk.ayrilmisSureMs / GUN);
}

/** Satın alma planı: denetlenmiş hücre listesi ve toplam fiyat (dünyayı değiştirmez). */
interface AlimPlani {
  ilce: IlceDurumu;
  liste: string[];
  sinif: ArsaSinifi;
  fiyat: Mili;
}

/**
 * `parsel_al` denetimleri (hazine dışında): hücreler fikstürde bu ilçede, uygun, komut sınıfında, sahipsiz, ayrılmışsa
 * yeni oyuncu; ilçe başına 72 / %25 sınırı; ilçede yeterli boş hücre. `liste` sıralı ve tekrarsız olmalıdır.
 */
function alimPlani(d: Dunya, mk: DerlenmisMulk, oyuncu: OyuncuId, ilce: IlceDurumu, liste: string[], sinif: ArsaSinifi): AlimPlani | string {
  const p = mk.p;
  // Ayrılmış hücreler (yeni oyuncu hakkı): yalnız katılımının ilk `ayrilmisGun` gününde olanlara satılır.
  const katilma = oyuncuBul(d, oyuncu)?.katilmaZamani;
  const yeniOyuncuMu = katilma !== undefined && d.zaman < katilma + mk.ayrilmisSureMs;
  for (const id of liste) {
    const f = mk.hucreler.get(id);
    if (f === undefined || f.ilce !== ilce.id) return `hucre bu ilcede degil: ${id}`;
    if (!f.hucre.uygun) return `hucre satin alinamaz (${f.hucre.engel ?? "uygun degil"}): ${id}`;
    if (f.hucre.sinif !== sinif) return `hucre sinifi uyusmuyor: ${id} (${f.hucre.sinif}, komut ${sinif})`;
    const sahipli = hucreBul(d, id);
    if (sahipli !== undefined) return `hucre zaten sahipli: ${id} (${sahipli.sahip})`;
    if (!yeniOyuncuMu && mk.ayrilmis.has(id)) return `hucre yeni oyunculara ayrilmis (katilimin ilk ${ayrilmisGun(mk)} gunu): ${id}`;
  }
  const mo0 = mulkOyuncuBul(d, oyuncu);
  const mevcut = mo0 === undefined ? 0 : ilceHucreSayisi(mo0, ilce.id);
  const yeniToplam = mevcut + liste.length;
  if (yeniToplam > p.ilceHucreTavani) return `ilcede en cok ${p.ilceHucreTavani} hucre (mevcut ${mevcut})`;
  const payTavani = carpBol(ilce.uygunHucre, p.ilcePayTavaniPpm, PPM);
  if (yeniToplam > payTavani) return `ilcenin en cok %${carpBol(p.ilcePayTavaniPpm, 100, PPM)}'i (${payTavani} hucre; mevcut ${mevcut})`;
  if (ilce.satilmisHucre + liste.length > ilce.uygunHucre) return "ilcede yeterli bos uygun hucre yok";
  const fiyat = parselFiyati(p.hucreFiyati[sinif], p.satisPayiCarpaniPpm, ilce.satilmisHucre, ilce.uygunHucre, liste.length);
  return { ilce, liste, sinif, fiyat };
}

/** Satın almayı uygular: hazineden fiyatı düşer (önceden denetlenmiş olmalı), işletme düğümünü açar, hücreleri ekler. */
function alimUygula(d: Dunya, ctx: Baglam, mk: DerlenmisMulk, oyuncu: OyuncuId, plan: AlimPlani): boolean {
  const m = d.mulk as MulkDurumu;
  const p = mk.p;
  if (!hazineEkle(d, oyuncu, -plan.fiyat)) return false;
  const mo = mulkOyuncuAl(m, oyuncu, d.zaman);
  isletmeAl(d, ctx.ic, oyuncu, plan.ilce.il);
  const taban = p.hucreFiyati[plan.sinif];
  for (let i = 0; i < plan.liste.length; i++) {
    const deger = parselFiyati(taban, p.satisPayiCarpaniPpm, plan.ilce.satilmisHucre + i, plan.ilce.uygunHucre, 1);
    const h: HucreDurumu = { id: plan.liste[i] as string, ilce: plan.ilce.id, sinif: plan.sinif, sahip: oyuncu, degerMili: deger, alinma: d.zaman };
    hucreEkle(m, h);
    mo.araziDegeriMili += deger;
  }
  plan.ilce.satilmisHucre += plan.liste.length;
  ilceHucreEkle(mo, plan.ilce.id, plan.liste.length);
  return true;
}

/** Yapı türü: içerikteki tesis türü (`ti`) ya da ek yapı (`ek`); ikisi birden tanımlı olmaz. */
interface YapiTuru {
  ad: string;
  ti: number | undefined;
  ek: DerlenmisEkYapi | undefined;
  yuva: number;
}

function yapiTuruCoz(ctx: Baglam, mk: DerlenmisMulk, tesisTuru: unknown): YapiTuru | string {
  const ti = typeof tesisTuru === "string" ? ctx.ic.tesisTuruIndeks[tesisTuru] : undefined;
  // Ek yapı (Ambar, Ticaret ofisi...): içerikte tesis türü değil, `mulk.ekYapilar`'da tanımlıdır.
  const ei = ti === undefined && typeof tesisTuru === "string" ? mk.ekYapiIndeks.get(tesisTuru) : undefined;
  if (ti === undefined && ei === undefined) return `bilinmeyen tesis turu: ${String(tesisTuru)}`;
  const ek = ei === undefined ? undefined : (mk.ekYapilar[ei] as DerlenmisEkYapi);
  const yuva = ek !== undefined ? ek.yuva : (mk.yuva[ti as number] as number);
  if (yuva <= 0) return `tesis turu mulk kipinde insa edilemez: ${String(tesisTuru)}`;
  return { ad: tesisTuru as string, ti, ek, yuva };
}

/** Yapı hücreleri: 1–3 hücre, sayısı türün yuvasına eşit, kenar-bitişik (4 komşuluk) tek küme. Sıralı listeyi ya da hatayı döndürür. */
function yapiHucreleri(tur: YapiTuru, hucreler: unknown): string[] | string {
  const liste = hucreListesi(hucreler, 3);
  if (typeof liste === "string") return liste;
  if (liste.length !== tur.yuva) return `${tur.ad} ${tur.yuva} hucre kaplar (verilen ${liste.length})`;
  for (const id of liste) if (!HUCRE_KIMLIGI.test(id)) return `gecersiz hucre kimligi: ${id}`;
  if (!kenarBitisikMi(liste)) return `yapi hucreleri kenar-bitisik olmali: ${liste.join(", ")}`;
  return liste;
}

/** "x:y", yalnız rakamlar (başında sıfır yok). */
const HUCRE_KIMLIGI = /^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/;

/** Yapı inşaatı planı: tür denetimleri, bedel (indirimli) ve süre. Dünyayı değiştirmez. */
interface YapiPlani {
  tur: YapiTuru;
  ilce: IlceDurumu;
  liste: string[];
  mal: readonly (readonly [number, Mili])[];
  para: Mili;
  saat: number;
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
  if (tur.ek !== undefined) {
    let mevcutAdet = dugum === undefined ? 0 : ekYapiSayisi(dugum, tur.ek.id);
    if (dugum !== undefined) for (const i of d.insaatlar) if (i.ekYapi === tur.ek.id && i.bolge === dugum.indeks) mevcutAdet++;
    if (mevcutAdet >= tur.ek.enFazlaIlBasina) return `ilde en cok ${tur.ek.enFazlaIlBasina} ${tur.ek.ad} (biten + suren)`;
    mal = tur.ek.insaMaliyeti;
    para = tur.ek.insaParasi;
    saat = tur.ek.insaSaati;
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
    mal = satir.insaMaliyeti;
    para = satir.insaParasi;
    saat = mk.insaSaati[ti] as number;
  }
  let suren = 0;
  for (const i of d.insaatlar) if (i.sahip === oyuncu && i.hucreler !== undefined) suren++;
  if (suren >= mk.p.esZamanliInsaat) return `ayni anda en cok ${mk.p.esZamanliInsaat} insaat`;
  // Yeni oyuncu: ilk `indirimliYapiSayisi` yapıda `ilkYapiIndirimPpm` indirimi (para ve malzeme; ek yapılar dahil).
  const yo = mk.p.yeniOyuncu;
  const indirimli = yo.ilkYapiIndirimPpm > 0 && (mulkOyuncuBul(d, oyuncu)?.indirimliYapi ?? 0) < yo.indirimliYapiSayisi;
  if (indirimli) {
    mal = mal.map(([mi, q]) => [mi, carpBol(q, PPM - yo.ilkYapiIndirimPpm, PPM)] as [number, Mili]);
    para = carpBol(para, PPM - yo.ilkYapiIndirimPpm, PPM);
  }
  return { tur, ilce, liste, mal, para, saat, indirimli, dugum };
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

/** Yapı inşaatını başlatır (denetlenmiş plan; düğüm artık vardır): bedeli düşer, hücreleri işaretler, bitişi planlar. */
function yapiUygula(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, plan: YapiPlani, b: BolgeDurumu): boolean {
  if (!maliyetiDus(d, ctx, b.indeks, oyuncu, plan.mal, plan.para)) return false;
  const id = ctx.yeniKimlik(d);
  const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, plan.saat * SAAT);
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
      const tur = yapiTuruCoz(ctx, mk, k.tesisTuru);
      if (typeof tur === "string") return hata(tur);
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
      if (!yapiUygula(d, ctx, oyuncu, plan, plan.dugum as BolgeDurumu)) return hata("yetersiz hazine");
      return TAMAM;
    }
    case "yapi_yerlestir": {
      // Arsa + yapı TEK atomik işlem: boş hücreler satın alınır, hepsi oyuncunun olunca inşaat başlar; herhangi bir denetim
      // başarısızsa dünya (hazinenin temsili dahil) değişmez.
      const ilce = typeof k.ilce === "string" ? ilceBul(d, k.ilce) : undefined;
      if (ilce === undefined || !mk.ilceler.has(k.ilce)) return hata(`bilinmeyen ilce: ${String(k.ilce)}`);
      if (!SINIFLAR.includes(k.sinif)) return hata(`gecersiz arsa sinifi: ${String(k.sinif)}`);
      const tur = yapiTuruCoz(ctx, mk, k.tesisTuru);
      if (typeof tur === "string") return hata(tur);
      const liste = yapiHucreleri(tur, k.hucreler);
      if (typeof liste === "string") return hata(liste);
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
      const alim = yeni.length > 0 ? alimPlani(d, mk, oyuncu, ilce, yeni, k.sinif) : null;
      if (typeof alim === "string") return hata(alim);
      const plan = yapiPlani(d, ctx, mk, oyuncu, ilce, tur, liste, yeni.length > 0);
      if (typeof plan === "string") return hata(plan);
      const arsaBedeli = alim === null ? 0 : alim.fiyat;
      const eksik = yapiBedeliEksik(d, ctx, mk, oyuncu, plan, arsaBedeli);
      if (eksik !== null) return hata(eksik === "yetersiz hazine" ? `yetersiz hazine (gereken ${arsaBedeli + plan.para})` : eksik);
      // Değişiklikler (artık başarısız olamaz)
      if (alim !== null && !alimUygula(d, ctx, mk, oyuncu, alim)) return hata("yetersiz hazine");
      const isl = isletmeBul(d, oyuncu, ilce.il) as NonNullable<ReturnType<typeof isletmeBul>>;
      if (!yapiUygula(d, ctx, oyuncu, plan, d.bolgeler[isl.bolgeIndeksi] as BolgeDurumu)) return hata("yetersiz hazine");
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
      if (iade > 0 && !hazineEkle(d, oyuncu, iade)) return hata("iade yapilamadi");
      // Değişiklikler (artık başarısız olamaz): hücreler boşalır; arazi değeri, ilçe hücre sayacı ve ilçe satılmışı düşer.
      const mo = mulkOyuncuAl(m, oyuncu, d.zaman);
      for (const id of liste) hucreSil(m, id);
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
      if (para > 0 && !hazineEkle(d, oyuncu, para)) return hata("iade yapilamadi");
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
    default: {
      const _tamamlik: never = k;
      return hata(`bilinmeyen mulk komutu: ${JSON.stringify(_tamamlik)}`);
    }
  }
}

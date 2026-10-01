/**
 * Kamu kasaları, para defteri ve kamu NPC alıcısı (para güvenliği, docs/06 §15.7; araştırma kamu-ve-kamu-arazileri §4).
 *
 * KASA SAHİPLERİ: `k:mahalle:<id>`, `k:ilce:<id>`, `k:il:<id>` (Y-39: Muhtar = mahalle, İlçe Başkanı = ilçe, Vali = il; kasa yöneticisizse NPC Kaymakam
 * kuralıyla çalışır, pasif mahallede NPC; pasiflik sonrası devralma "kayyum"dur). KAYNAKLAR yalnız ZATEN YANAN paradır (§4.1):
 *  - arazi vergisi: %20 mahalle / %40 ilçe / %15 il / %25 yanar (`mulk.kasa.vergiPayi`); oyuncunun ilçelerine hücre sayısıyla orantılı dağıtılır;
 *    mahalle payı, hücre → mahalle eşlemesi gelene kadar İLÇENİN MAHALLE HAVUZUNA (`k:mahalle:<ilce>`) yazılır (Alfa-0'da mahalle pasiftir);
 *  - ithalat makasının %20'si ve ithalat işlem komisyonunun %50'si → ilçe (oyuncunun o ildeki en çok hücreli ilçesi);
 *  - İHRACAT tarafı ASLA kaynak olmaz (NPC ihracatta ×0,9 öder; aradaki hiç basılmamıştır).
 * Kasalar tembel birikir: saatlik oranlar `ParaAkisi`'nda tutulur, her lojistik çözümünün başında `paraMuhasebesi` kayıpsız (n + a/SAAT) işler.
 *
 * KORUNUM (zorunlu test): SAAT ile ölçeklenmiş tamsayıda her an
 *   Σ oyuncu hazinesi + Σ kasa bakiyesi + Σ lavabo = Σ musluk
 * (musluk: hibe, ödül, iade, NPC ihracat ödemesi, nüfus vergisi, kelepçe; lavabo: arsa, harcama, araştırma, NPC ithalat tahsilatı - kasa payı, işletme
 * gideri, arazi vergisinin yanan kısmı, kasanın NPC'ye harcaması). Kasadan oyuncuya ödemeler musluk değil transferdir.
 *
 * KAMU NPC ALICISI (hafif): `kamuAlici` görünümü, ödenek rezervi (ödeneği olmayan alım açılmaz), oyuncu payı ≤ %50 (28 gün kayan pencere),
 * tek alım tavanı (≤ bakiyenin %40), haftalık bütçe ve FİYAT TAVANI doğrulayıcısı (≤ referans × `mulk.kamuIthalatCarpaniPpm` = en düşük ulaşılabilir NPC ithalat çarpanı: NPC'den alıp kamuya
 * satmak sıfır marj). Sipariş komutları (`siparis_al`/`siparis_teslim`) burada YOK; bu işlevler onların kancalarıdır.
 */
import { carpBol } from "../sabit";
import { hazineEkle, hazineUzlastir, oyuncuBul } from "../stok";
import { GUN, KASA_GIRIS_KALEMLERI, PPM } from "../tipler";
import type { DerlenmisIcerik, Dunya, KasaDurumu, KasaGirisKalemi, KasaGunu, KomutSonucu, Mili, NpcAlici, ParaAkisi, ParaDurumu } from "../tipler";
import type { MulkKasaParametreleri } from "@bolge/veri";
import { sayacOranEkle, sayacSifir } from "../paraSayac";
import { sirali, mulkOyuncuBul } from "./durum";
import { kamuIlKimligi, kamuIlceKimligi, kamuMahalleKimligi } from "./kamu";

const KASA_SAHIP = (k: KasaDurumu): string => k.sahip;

function kasaParam(ic: DerlenmisIcerik): MulkKasaParametreleri | undefined {
  return ic.mulk?.p.kasa;
}

/** Kasayı bulur (yoksa tanımsız). */
export function kasaBul(para: ParaDurumu, sahip: string): KasaDurumu | undefined {
  const i = sirali(para.kasalar, KASA_SAHIP, sahip);
  return i >= 0 ? para.kasalar[i] : undefined;
}

/** Kasayı bulur; yoksa sıralı ekler. */
export function kasaAl(para: ParaDurumu, sahip: string): KasaDurumu {
  const i = sirali(para.kasalar, KASA_SAHIP, sahip);
  if (i >= 0) return para.kasalar[i] as KasaDurumu;
  const giris = {} as Record<KasaGirisKalemi, ReturnType<typeof sayacSifir>>;
  for (const k of KASA_GIRIS_KALEMLERI) giris[k] = sayacSifir();
  const yeni: KasaDurumu = { sahip, giris, cikisOyuncu: 0, cikisNpc: 0, rezervOyuncu: 0, rezervNpc: 0, gunler: [] };
  para.kasalar.splice(-i - 1, 0, yeni);
  return yeni;
}

/** Kasanın toplam girişi (tam birimler). */
export function kasaGirisi(k: KasaDurumu): Mili {
  let t = 0;
  for (const kalem of KASA_GIRIS_KALEMLERI) t += k.giris[kalem].n;
  return t;
}

/** Kullanılabilir bakiye: giriş − çıkış − rezerv (tam birimler). */
export function kasaBakiyesi(k: KasaDurumu): Mili {
  return kasaGirisi(k) - k.cikisOyuncu - k.cikisNpc - k.rezervOyuncu - k.rezervNpc;
}

/** Bugünün (gün sayısı) kaydı; yoksa ekler ve pencere dışı günleri atar. */
function gunKaydi(k: KasaDurumu, gun: number, pencereGun: number): KasaGunu {
  let g = k.gunler[k.gunler.length - 1];
  if (g === undefined || g.gun !== gun) {
    g = { gun, giris: 0, oyuncu: 0, npc: 0 };
    k.gunler.push(g);
  }
  const esik = gun - pencereGun;
  while (k.gunler.length > 0 && (k.gunler[0] as KasaGunu).gun <= esik) k.gunler.shift();
  return g;
}

function pencereToplami(k: KasaDurumu, gun: number, pencereGun: number, sonGun = pencereGun): { giris: Mili; oyuncu: Mili; npc: Mili } {
  const t = { giris: 0, oyuncu: 0, npc: 0 };
  for (const g of k.gunler) {
    if (g.gun > gun - sonGun && g.gun <= gun) {
      t.giris += g.giris;
      t.oyuncu += g.oyuncu;
      t.npc += g.npc;
    }
  }
  return t;
}

/**
 * Lojistik çözümünün başı (ve gerektiğinde herhangi bir an): her oyuncunun önceki saatlik para akışlarını `t - t0` süresince KESİN işler:
 * musluk (ihracat, nüfus), lavabo (ithalat − kasa payı, işletme, vergi − kasa payı) ve kasa girişleri. Nötrdür: parçalı ve tek seferlik
 * uzlaştırma aynı sonucu verir. Para defteri kapalıysa hiçbir şey yapmaz.
 */
export function paraMuhasebesi(d: Dunya, ic: DerlenmisIcerik): void {
  const para = d.mulk?.para;
  const m = d.mulk;
  const kp = kasaParam(ic);
  if (para === undefined || m === undefined || kp === undefined) return;
  const t = d.zaman;
  const gun = Math.floor(t / GUN);
  for (const mo of m.oyuncular) {
    const a = mo.paraAkisi;
    if (a === undefined) continue;
    const dt = t - a.t0;
    if (dt > 0) {
      sayacOranEkle(para.musluk.ihracatNpc, a.ihracat, dt);
      sayacOranEkle(para.musluk.nufusGeliri, a.nufus, dt);
      sayacOranEkle(para.lavabo.isletme, a.isletme, dt);
      let ithKasa = 0;
      let vergiKasa = 0;
      for (const e of a.kasa) {
        const k = kasaAl(para, e.sahip);
        const eklenen = sayacOranEkle(k.giris[e.kalem], e.oran, dt);
        if (eklenen > 0) gunKaydi(k, gun, kp.pencereGun).giris += eklenen;
        if (e.kalem === "vergi") vergiKasa += e.oran;
        else ithKasa += e.oran;
      }
      sayacOranEkle(para.lavabo.ithalatNpc, a.ithalat - ithKasa, dt);
      sayacOranEkle(para.lavabo.araziVergisi, a.vergi - vergiKasa, dt);
    }
    a.t0 = t;
  }
}

/** Para defterini ve tüm hazineleri d.zaman'a uzlaştırır (nötr). Testler ve alıcı işlevleri kontrol noktasında çağırır. */
export function paraUzlastir(d: Dunya, ic: DerlenmisIcerik): void {
  if (d.mulk?.para === undefined) return;
  for (const o of d.oyuncular) hazineUzlastir(d, o.id);
  paraMuhasebesi(d, ic);
}

/** Lojistik çözümün son adımı: oyuncunun yeni saatlik para akışlarını yazar (t0 = şimdi; muhasebe adım 0 ile işlenmiştir). */
export function paraAkisiYaz(d: Dunya, oyuncu: string, akis: Omit<ParaAkisi, "t0">): void {
  const mo = mulkOyuncuBul(d, oyuncu);
  if (mo === undefined) return;
  const kasa = akis.kasa.filter((e) => e.oran > 0);
  if (mo.paraAkisi === undefined && akis.ihracat === 0 && akis.nufus === 0 && akis.ithalat === 0 && akis.isletme === 0 && akis.vergi === 0 && kasa.length === 0) return;
  const onceki = mo.paraAkisi;
  if (onceki !== undefined && onceki.kasa.length === kasa.length && kasa.every((e, i) => {
    const x = onceki.kasa[i] as ParaAkisi["kasa"][number];
    return x.sahip === e.sahip && x.kalem === e.kalem && x.oran === e.oran;
  })) {
    // Aynı oranlar: kayıt YERİNDE güncellenir (çıktı aynı; her çözümde yeni nesne ve dizi üretilmez).
    onceki.t0 = d.zaman;
    onceki.ihracat = akis.ihracat;
    onceki.nufus = akis.nufus;
    onceki.ithalat = akis.ithalat;
    onceki.isletme = akis.isletme;
    onceki.vergi = akis.vergi;
    return;
  }
  mo.paraAkisi = { t0: d.zaman, ihracat: akis.ihracat, nufus: akis.nufus, ithalat: akis.ithalat, isletme: akis.isletme, vergi: akis.vergi, kasa };
}

// ---------------------------------------------------------------------------
// Kasa kaynağı dağılımı (saatlik oranlar)
// ---------------------------------------------------------------------------

/** İlin ilçeleri (kimliğe göre sıralı): düğümün ilçesi bulunamazsa ilk ilçe. */
const ilIlceOnbellegi = new WeakMap<object, Map<string, string[]>>();
function ilIlceleri(ic: DerlenmisIcerik): Map<string, string[]> {
  const mk = ic.mulk;
  if (mk === undefined) return new Map();
  let m = ilIlceOnbellegi.get(mk);
  if (m === undefined) {
    m = new Map();
    for (const c of mk.fikstur.ilceler) {
      const l = m.get(c.il) ?? [];
      l.push(c.id);
      m.set(c.il, l);
    }
    for (const l of m.values()) l.sort();
    ilIlceOnbellegi.set(mk, m);
  }
  return m;
}

/** İşletme düğümünün kamu ilçesi: oyuncunun düğümün ilindeki en çok hücreli ilçesi (eşitlikte kimlik); hücre yoksa ilin ilk ilçesi. */
export function dugumIlcesi(d: Dunya, ic: DerlenmisIcerik, oyuncu: string, dugumKimligi: string): string | undefined {
  const mk = ic.mulk;
  if (mk === undefined) return undefined;
  const ayrac = dugumKimligi.indexOf("#");
  if (ayrac <= 0) return undefined;
  const il = dugumKimligi.slice(0, ayrac);
  const mo = mulkOyuncuBul(d, oyuncu);
  let en: string | undefined;
  let enHucre = 0;
  for (const e of mo?.ilceHucre ?? []) {
    if (mk.ilceler.get(e.ilce)?.il !== il) continue;
    if (e.hucre > enHucre) {
      en = e.ilce;
      enHucre = e.hucre;
    }
  }
  return en ?? ilIlceleri(ic).get(il)?.[0];
}

/** Bir kaynak toplamını `(sahip, kalem)` oranlarına çevirir: kaynak kaleminin birikimi için yardımcı. */
type KasaOrani = { sahip: string; kalem: KasaGirisKalemi; oran: Mili };

/**
 * Oyuncunun saatlik kasa oranları: arazi vergisi (`vergi`, ilçelerine hücre sayısıyla orantılı) ve ithalat makası/komisyonu
 * (`makasIlce`/`komisyonIlce`: ilçe → saatlik tutar). Kalan yanar. Sonuç (sahip, kalem) sırasıyla birleştirilmiş ve sıralıdır.
 */
export function kasaOranlari(
  d: Dunya,
  ic: DerlenmisIcerik,
  oyuncu: string,
  vergi: Mili,
  makasIlce: ReadonlyMap<string, Mili>,
  komisyonIlce: ReadonlyMap<string, Mili>,
): KasaOrani[] {
  // Önbellek (P3c; docs/06 §15.9): sonuç, girdilerinin (vergi, ilçe hücre sayıları, makas/komisyon ilçe tutarları, içerik) SAF işlevidir; girdi
  // aynıysa önceki sonuç aynen döner. Anahtar girdinin KENDİSİdir (sürüm/imza değil): soğuk önbellek (yeni yükleme) aynı sonucu hesaplar.
  const mo = mulkOyuncuBul(d, oyuncu);
  if (mo === undefined) return kasaOranlariHesapla(d, ic, oyuncu, vergi, makasIlce, komisyonIlce);
  const o = kasaOnbellegi.get(mo);
  if (o !== undefined && o.ic === ic && o.vergi === vergi && ilceHucreAyni(o.hucre, mo.ilceHucre) && haritaAyni(o.makas, makasIlce) && haritaAyni(o.komisyon, komisyonIlce)) {
    return o.sonuc;
  }
  const sonuc = kasaOranlariHesapla(d, ic, oyuncu, vergi, makasIlce, komisyonIlce);
  kasaOnbellegi.set(mo, {
    ic,
    vergi,
    hucre: mo.ilceHucre.map((e) => ({ ilce: e.ilce, hucre: e.hucre })),
    makas: [...makasIlce],
    komisyon: [...komisyonIlce],
    sonuc,
  });
  return sonuc;
}

interface KasaOnbellegi {
  ic: DerlenmisIcerik;
  vergi: Mili;
  hucre: { ilce: string; hucre: number }[];
  makas: [string, Mili][];
  komisyon: [string, Mili][];
  sonuc: KasaOrani[];
}
/** Durum metnine GİRMEZ: oyuncu kaydı başına, bellekte; girdi karşılaştırmasıyla doğrulanır. */
const kasaOnbellegi = new WeakMap<object, KasaOnbellegi>();

function ilceHucreAyni(a: readonly { ilce: string; hucre: number }[], b: readonly { ilce: string; hucre: number }[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if ((a[i] as { ilce: string }).ilce !== (b[i] as { ilce: string }).ilce || (a[i] as { hucre: number }).hucre !== (b[i] as { hucre: number }).hucre) return false;
  }
  return true;
}

function haritaAyni(a: readonly [string, Mili][], b: ReadonlyMap<string, Mili>): boolean {
  if (a.length !== b.size) return false;
  let i = 0;
  for (const [k, v] of b) {
    const e = a[i++] as [string, Mili];
    if (e[0] !== k || e[1] !== v) return false;
  }
  return true;
}

function kasaOranlariHesapla(
  d: Dunya,
  ic: DerlenmisIcerik,
  oyuncu: string,
  vergi: Mili,
  makasIlce: ReadonlyMap<string, Mili>,
  komisyonIlce: ReadonlyMap<string, Mili>,
): KasaOrani[] {
  const mk = ic.mulk;
  const kp = kasaParam(ic);
  if (mk === undefined || kp === undefined) return [];
  const toplam = new Map<string, number>();
  const ekle = (sahip: string, kalem: KasaGirisKalemi, oran: Mili): void => {
    if (oran <= 0) return;
    const anahtar = `${sahip}\u0000${kalem}`;
    toplam.set(anahtar, (toplam.get(anahtar) ?? 0) + oran);
  };
  if (vergi > 0) {
    const mo = mulkOyuncuBul(d, oyuncu);
    const ilceler = mo?.ilceHucre ?? [];
    let w = 0;
    for (const e of ilceler) w += e.hucre;
    if (w > 0) {
      let dagitilan = 0;
      const pay = ilceler.map((e) => {
        const v = carpBol(vergi, e.hucre, w);
        dagitilan += v;
        return v;
      });
      pay[0] = (pay[0] as number) + (vergi - dagitilan); // artık ilk ilçeye
      ilceler.forEach((e, i) => {
        const v = pay[i] as number;
        const il = mk.ilceler.get(e.ilce)?.il;
        if (il === undefined) return;
        ekle(kamuMahalleKimligi(e.ilce), "vergi", carpBol(v, kp.vergiPayi.mahallePpm, PPM));
        ekle(kamuIlceKimligi(e.ilce), "vergi", carpBol(v, kp.vergiPayi.ilcePpm, PPM));
        ekle(kamuIlKimligi(il), "vergi", carpBol(v, kp.vergiPayi.ilPpm, PPM));
      });
    }
  }
  for (const [ilce, x] of makasIlce) ekle(kamuIlceKimligi(ilce), "ithalatMakas", carpBol(x, kp.ithalatMakasiIlcePpm, PPM));
  for (const [ilce, x] of komisyonIlce) ekle(kamuIlceKimligi(ilce), "ithalatKomisyon", carpBol(x, kp.ithalatKomisyonuIlcePpm, PPM));
  const sonuc: KasaOrani[] = [];
  for (const [anahtar, oran] of toplam) {
    const ayrac = anahtar.indexOf("\u0000");
    sonuc.push({ sahip: anahtar.slice(0, ayrac), kalem: anahtar.slice(ayrac + 1) as KasaGirisKalemi, oran });
  }
  return sonuc.sort((a, b) => (a.sahip < b.sahip ? -1 : a.sahip > b.sahip ? 1 : a.kalem < b.kalem ? -1 : a.kalem > b.kalem ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Kamu NPC alıcısı: ödenek, pay sayacı, tavan (sipariş kancaları)
// ---------------------------------------------------------------------------

const hata = (mesaj: string): KomutSonucu => ({ tamam: false, hata: mesaj });
const TAMAM: KomutSonucu = { tamam: true };

/** Kamu NPC alıcısı görünümü (kasa kaynaklı). Kasa yoksa (hiç gelir almamış) sıfır değerli görünüm döner. Para defteri kapalıysa tanımsız. */
export function kamuAlici(d: Dunya, ic: DerlenmisIcerik, kasa: string): NpcAlici | undefined {
  const para = d.mulk?.para;
  const kp = kasaParam(ic);
  if (para === undefined || kp === undefined) return undefined;
  paraUzlastir(d, ic);
  const k = kasaBul(para, kasa);
  const gun = Math.floor(d.zaman / GUN);
  if (k === undefined) return { tur: "kamu", kaynak: kasa, haftalikButce: 0, haftalikKullanilan: 0, bakiye: 0, pencereGiris: 0, pencereOyuncu: 0, pencereNpc: 0 };
  const pen = pencereToplami(k, gun, kp.pencereGun);
  const hafta = pencereToplami(k, gun, kp.pencereGun, 7);
  return {
    tur: "kamu",
    kaynak: kasa,
    haftalikButce: carpBol(pen.giris, kp.haftalikButcePpm, PPM),
    haftalikKullanilan: hafta.oyuncu + hafta.npc + k.rezervOyuncu + k.rezervNpc,
    bakiye: kasaBakiyesi(k),
    pencereGiris: pen.giris,
    pencereOyuncu: pen.oyuncu,
    pencereNpc: pen.npc,
  };
}

/**
 * Ödenek rezervi: ilan/alım açılmadan önce tutar kasadan bloke edilir. Reddedilir (kasa değişmez): kasa/para defteri yok, tutar geçersiz,
 * ödenek yetersiz ("ödeneği olmayan alım açılmaz"), tek alım tavanı (kullanılabilir bakiyenin %40'ı), haftalık bütçe, ve hedef oyuncu ise oyuncu payı
 * tavanı (pencere girişinin %50'si: ödenen + bekleyen rezerv + bu tutar).
 */
export function kamuOdenekRezerv(d: Dunya, ic: DerlenmisIcerik, kasa: string, tutar: Mili, hedef: "oyuncu" | "npc"): KomutSonucu {
  const para = d.mulk?.para;
  const kp = kasaParam(ic);
  if (para === undefined || kp === undefined) return hata("para defteri kapali");
  if (!Number.isSafeInteger(tutar) || tutar <= 0) return hata(`gecersiz odenek tutari: ${String(tutar)}`);
  paraUzlastir(d, ic);
  const k = kasaBul(para, kasa);
  if (k === undefined) return hata(`kasa yok: ${kasa}`);
  const bakiye = kasaBakiyesi(k);
  if (tutar > bakiye) return hata(`odenek yetersiz: ${kasa} (bakiye ${bakiye}, istenen ${tutar})`);
  if (tutar > carpBol(bakiye, kp.tekAlimTavaniPpm, PPM)) return hata(`tek alim tavani asildi: ${kasa} (en cok ${carpBol(bakiye, kp.tekAlimTavaniPpm, PPM)})`);
  const gun = Math.floor(d.zaman / GUN);
  const pen = pencereToplami(k, gun, kp.pencereGun);
  const hafta = pencereToplami(k, gun, kp.pencereGun, 7);
  const haftalik = carpBol(pen.giris, kp.haftalikButcePpm, PPM);
  const kullanilan = hafta.oyuncu + hafta.npc + k.rezervOyuncu + k.rezervNpc;
  if (kullanilan + tutar > haftalik) return hata(`haftalik butce asildi: ${kasa} (butce ${haftalik}, kullanilan ${kullanilan})`);
  if (hedef === "oyuncu") {
    const tavan = carpBol(pen.giris, kp.oyuncuPayiTavaniPpm, PPM);
    if (pen.oyuncu + k.rezervOyuncu + tutar > tavan) return hata(`oyuncu payi tavani asildi: ${kasa} (pencere girisi ${pen.giris}, tavan ${tavan})`);
    k.rezervOyuncu += tutar;
  } else {
    k.rezervNpc += tutar;
  }
  return TAMAM;
}

/** Rezervi iptal eder (ödeme yapılmadı); rezervden fazlası iptal edilemez. */
export function kamuOdenekIptal(d: Dunya, kasa: string, tutar: Mili, hedef: "oyuncu" | "npc"): KomutSonucu {
  const para = d.mulk?.para;
  if (para === undefined) return hata("para defteri kapali");
  const k = kasaBul(para, kasa);
  if (k === undefined) return hata(`kasa yok: ${kasa}`);
  const rezerv = hedef === "oyuncu" ? k.rezervOyuncu : k.rezervNpc;
  if (!Number.isSafeInteger(tutar) || tutar <= 0 || tutar > rezerv) return hata(`gecersiz iptal tutari: ${String(tutar)} (rezerv ${rezerv})`);
  if (hedef === "oyuncu") k.rezervOyuncu -= tutar;
  else k.rezervNpc -= tutar;
  return TAMAM;
}

/**
 * Rezerve edilmiş ödeneği öder: oyuncuya (hazineye TRANSFER; musluk değil) ya da NPC'ye (YANAR; `lavabo.kamuNpc`). Rezervden fazlası ödenemez.
 * Pencere sayaçlarına işlenir (oyuncuya akan / NPC'ye akan).
 */
export function kamuOdenekOde(d: Dunya, ic: DerlenmisIcerik, kasa: string, tutar: Mili, hedef: "oyuncu" | "npc", oyuncu?: string): KomutSonucu {
  const para = d.mulk?.para;
  const kp = kasaParam(ic);
  if (para === undefined || kp === undefined) return hata("para defteri kapali");
  const k = kasaBul(para, kasa);
  if (k === undefined) return hata(`kasa yok: ${kasa}`);
  const rezerv = hedef === "oyuncu" ? k.rezervOyuncu : k.rezervNpc;
  if (!Number.isSafeInteger(tutar) || tutar <= 0 || tutar > rezerv) return hata(`odenek rezervi yetersiz: ${kasa} (rezerv ${rezerv}, istenen ${String(tutar)})`);
  if (hedef === "oyuncu") {
    if (oyuncu === undefined || oyuncuBul(d, oyuncu) === undefined) return hata(`bilinmeyen oyuncu: ${String(oyuncu)}`);
    if (!hazineEkle(d, oyuncu, tutar, "kamuOdeme")) return hata("odeme yapilamadi");
    k.rezervOyuncu -= tutar;
    k.cikisOyuncu += tutar;
    gunKaydi(k, Math.floor(d.zaman / GUN), kp.pencereGun).oyuncu += tutar;
  } else {
    k.rezervNpc -= tutar;
    k.cikisNpc += tutar;
    para.lavabo.kamuNpc.n += tutar;
    gunKaydi(k, Math.floor(d.zaman / GUN), kp.pencereGun).npc += tutar;
  }
  return TAMAM;
}

/**
 * Fiyat tavanı doğrulayıcısı: kamu siparişi/ihale/esnaf siparişi birim fiyatı (mili-para/birim) ≤ referans fiyat × `mulk.kamuIthalatCarpaniPpm`
 * (oyunda ULAŞILABİLECEK EN DÜŞÜK NPC ithalat nakit çarpanı: anlaşma makası ve en iyi Ticaret ofisi indirimi dahil, `kamuFiyat.ts`; derleme zamanında
 * hesaplanır, oyuncu durumuna bakmaz): NPC'den ithalatla alıp kamuya satmak HİÇBİR oyuncu için pozitif marj bırakmaz, yalnız gerçek üretim kâr eder.
 * Kalıcı çözüm (sipariş komutları gelince tavanın teslim edenin kendi nakit çarpanıyla denetlenmesi) sonraki iştir. `mal` mal indeksidir.
 */
export function kamuFiyatTavani(d: Dunya, ic: DerlenmisIcerik, mal: number): Mili {
  const ref = d.pazar.fiyat[mal];
  if (ref === undefined) throw new RangeError(`kamuFiyatTavani: gecersiz mal: ${mal}`);
  const c = ic.mulk?.kamuIthalatCarpaniPpm;
  if (c === undefined) throw new RangeError("kamuFiyatTavani: mulk kipi kapali");
  return carpBol(ref, c, PPM);
}

export function kamuFiyatGecerli(d: Dunya, ic: DerlenmisIcerik, mal: number, birimFiyat: Mili): boolean {
  return Number.isSafeInteger(birimFiyat) && birimFiyat >= 0 && birimFiyat <= kamuFiyatTavani(d, ic, mal);
}

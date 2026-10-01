/**
 * Dükkân komutlarının etkin yolu (G7-3; şartname docs/arastirma/p4-p5-sartname.md §7, §9): `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`, `dukkan_yik`
 * (oyuncu yolu, `mulkKomutu`'ndan devredilir) ve `marka_sifirla` (sistem yolu, `motor.uygula`'dan). Ayrıca dükkân kurulumunun yardımcıları: `ilcedeDukkanSayisi` (ilçe sınırı),
 * `dukkanVarsayilani` (`ekYapiTamamla`) ve `dukkanKurulumDenetimi` (`tesis_insa_hucre` / `yapi_yerlestir` için `dukkanTuru`, ölçek denetimleri).
 *
 * Ret iletileri şartname §9.3 tablosundaki ÇEKİRDEK iletileridir (küçük harfli ASCII-Türkçe; kod yok). Her komut hepsi ya da hiçbiri: tüm denetimler önce yapılır,
 * durum yalnız en sonda değişir; başarısız komut dünyayı (hazine dahil) değiştirmez. Hiçbir komut para hareketi yapmaz (tutar alanı yoktur; yıkımda iade yoktur).
 * Satış ve gelir hesabı G7-2'dedir (`mulk/perakende.ts`); bu dosya yalnız dükkân DURUMUNU (raf, fiyat kademesi, kampanya sayaçları, marka bağı) yazar. Kampanya "etkin
 * kademe" durumdan türetilir (`etkinKademe`); çözüm sırasında durum yazılmaz.
 *
 * Bölge kipi ve perakendesiz mülk dünyası: `mulkKomutu` bölge kipinde "mulk kipi kapali", blok yokken "perakende kapali" (DUK-00) döner; durum hiç yazılmaz.
 */
import { adKanonik } from "../ad";
import type { DerlenmisPerakende } from "../perakende/derle";
import { GUN, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, DukkanDurumu, DerlenmisMulk, Dunya, EkYapiDurumu, KampanyaDurumu, KomutSonucu, MulkKomutu, OyuncuId, RafYuvasi } from "../tipler";
import { hucreBul, mulkOyuncuAl, mulkOyuncuBul } from "./durum";

const TAMAM: KomutSonucu = { tamam: true };
const hata = (mesaj: string): KomutSonucu => ({ tamam: false, hata: mesaj });

/** `marka_sifirla` yer tutucu adı (izinli kümede ve kanonik: `adKanonik`'ten geçer). */
export const ADSIZ_MARKA = "adsiz marka";

const OLCEK_HARFI = ["s", "m", "l"] as const;

// ---------------------------------------------------------------------------
// Kurulum yardımcıları (tesis_insa_hucre / yapi_yerlestir / ekYapiTamamla)
// ---------------------------------------------------------------------------

/**
 * Oyuncunun bir ilçedeki dükkân sayısı: biten (işletme düğümlerinin `ekYapilar`'ında, ilk hücresi o ilçede) + süren (`d.insaatlar`, `ekYapi === "dukkan"`, ilk hücresi o ilçede).
 * Sayaç türetilmiştir (yıkımla otomatik düşer; ayrı sayaç yok).
 */
export function ilcedeDukkanSayisi(d: Dunya, oyuncu: OyuncuId, ilceId: string): number {
  const m = d.mulk;
  if (m === undefined) return 0;
  let n = 0;
  for (const isl of m.isletmeler) {
    if (isl.oyuncu !== oyuncu) continue;
    const b = d.bolgeler[isl.bolgeIndeksi] as BolgeDurumu;
    for (const e of b.ekYapilar ?? []) if (e.tur === "dukkan" && hucreBul(d, e.hucreler[0] as string)?.ilce === ilceId) n++;
  }
  for (const i of d.insaatlar) {
    if (i.sahip !== oyuncu || i.ekYapi !== "dukkan" || i.hucreler === undefined) continue;
    if (hucreBul(d, i.hucreler[0] as string)?.ilce === ilceId) n++;
  }
  return n;
}

/**
 * Yeni dükkân durumu (`ekYapiTamamla`): boş raf (uzunluk = `olcekler[olcek].rafYuvasi`, her yuva `varsayilanFiyatKademesi`), markasız. `baslangic` = inşaat komut anı, `kurulus` = tamamlanma anı.
 * Perakende kapalıysa ya da tür bilinmiyorsa tanımsız (dükkân alanı yazılmaz).
 */
export function dukkanVarsayilani(mk: DerlenmisMulk, dukkanTuru: string | undefined, olcek: 0 | 1 | 2, baslangic: number, kurulus: number): DukkanDurumu | undefined {
  const pk = mk.perakende;
  if (pk === undefined || dukkanTuru === undefined || !pk.turler.has(dukkanTuru)) return undefined;
  const yuva = pk.p.olcekler[olcek].rafYuvasi;
  return { tur: dukkanTuru, olcek, raf: Array.from({ length: yuva }, () => ({ fiyat: pk.p.varsayilanFiyatKademesi })), baslangic, kurulus };
}

/**
 * Yapı komutunun (`tesis_insa_hucre`, `yapi_yerlestir`) dükkân denetimleri (§9.2; ölçek komutta çözülmüş): DUK-00 (yalnız `tesisTuru === "dukkan"`), DUK-01, DUK-02, DUK-03, DUK-04, DUK-05.
 * Dönüş: hata iletisi ya da (dükkân değilse) tanımsız ya da `{ dukkanTuru }`.
 */
export function dukkanKurulumDenetimi(mk: DerlenmisMulk, tesisTuru: unknown, dukkanTuru: unknown, olcek: 0 | 1 | 2): string | undefined | { dukkanTuru: string } {
  if (tesisTuru !== "dukkan") {
    if (dukkanTuru !== undefined) return `dukkanTuru yalniz dukkan yapisinda verilebilir: ${String(tesisTuru)}`;
    return undefined;
  }
  const pk = mk.perakende;
  if (pk === undefined) return "perakende kapali";
  if (dukkanTuru === undefined) return "dukkan turu gerekli (dukkanTuru)";
  const tur = typeof dukkanTuru === "string" ? pk.turler.get(dukkanTuru) : undefined;
  if (tur === undefined) return `bilinmeyen dukkan turu: ${String(dukkanTuru)}`;
  if (!pk.p.acikOlcekler.includes(olcek)) return `dukkan olcegi henuz acik degil: ${OLCEK_HARFI[olcek]}`;
  if (!tur.olcekAraligi.includes(olcek)) return `${dukkanTuru as string} dukkani ${OLCEK_HARFI[olcek]} olceginde kurulamaz`;
  return { dukkanTuru: dukkanTuru as string };
}

// ---------------------------------------------------------------------------
// Dükkân bulma ve ortak denetimler
// ---------------------------------------------------------------------------

interface DukkanKaydi {
  b: BolgeDurumu;
  konum: number;
  e: EkYapiDurumu;
  dk: DukkanDurumu;
}

/** Oyuncunun TAMAMLANMIŞ dükkânı (işletme düğümlerinin ek yapıları); başkasının dükkânı ve bilinmeyen kimlik bulunamaz. */
function dukkanBul(d: Dunya, oyuncu: OyuncuId, id: unknown): DukkanKaydi | undefined {
  const m = d.mulk;
  if (m === undefined || !Number.isSafeInteger(id)) return undefined;
  for (const isl of m.isletmeler) {
    if (isl.oyuncu !== oyuncu) continue;
    const b = d.bolgeler[isl.bolgeIndeksi] as BolgeDurumu;
    const ek = b.ekYapilar ?? [];
    for (let j = 0; j < ek.length; j++) {
      const e = ek[j] as EkYapiDurumu;
      if (e.id === id && e.tur === "dukkan" && e.dukkan !== undefined) return { b, konum: j, e, dk: e.dukkan };
    }
  }
  return undefined;
}

const bulunamadi = (id: unknown): KomutSonucu => hata(`dukkan bulunamadi: ${String(id)}`);

/** Yuva indeksi (DUK-12). */
function yuvaDenetimi(dk: DukkanDurumu, yuva: unknown): string | null {
  if (!Number.isSafeInteger(yuva) || (yuva as number) < 0 || (yuva as number) >= dk.raf.length) return `gecersiz yuva: ${String(yuva)} (0..${dk.raf.length - 1})`;
  return null;
}

/** Hız sınırı (DUK-18): son fiyat/mal değişiminden `fiyatDegisimEnAzSaat` saat dolmadan dolu yuvada mal ya da fiyat değişmez. Kalan saat yukarı yuvarlanır. */
function hizSiniri(d: Dunya, pk: DerlenmisPerakende, fiyatT: number | undefined): string | null {
  const enAz = pk.p.fiyatDegisimEnAzSaat;
  if (enAz <= 0 || fiyatT === undefined) return null;
  const bitis = fiyatT + enAz * SAAT;
  if (d.zaman >= bitis) return null;
  return `fiyat degisimi icin ${Math.ceil((bitis - d.zaman) / SAAT)} saat beklenmeli`;
}

/**
 * Kampanya başlatma planı (§7.5b; saf): `dukkan_fiyat` kademe = `kampanyaKademesi` iken. Hata iletisi (DUK-20/21/22), "ucretsiz" (kampanya zaten etkin; sayaç değişmez) ya da yazılacak yeni sayaçlar.
 */
function kampanyaPlani(d: Dunya, pk: DerlenmisPerakende, dk: DukkanDurumu): string | "ucretsiz" | KampanyaDurumu {
  if (!pk.kampanyaAcik) return "kampanya kademesi acik degil";
  const kp = dk.kampanya;
  if (kp !== undefined && kp.bitis > d.zaman) return "ucretsiz";
  const gunluk = pk.p.kampanyaGunlukEnFazlaSaat as number;
  const haftalik = pk.p.kampanyaHaftalikEnFazlaGun as number;
  const g = Math.floor(d.zaman / GUN);
  const h = Math.floor(g / 7);
  // Sayaçlar hesapta: yok ya da başka haftaysa sıfırlanır (durum yalnız komut başarılı olunca yazılır).
  let gunSayisi = kp === undefined || kp.hafta !== h ? 0 : kp.gunSayisi;
  let saat = kp === undefined ? 0 : kp.saat;
  const yeniGun = kp === undefined || kp.gun !== g;
  if (yeniGun) {
    if (gunSayisi >= haftalik) return `kampanya haftalik gun siniri (en cok ${haftalik} gun)`;
    saat = 0;
  } else if (saat >= gunluk) {
    return `kampanya gunluk saat siniri (en cok ${gunluk} saat)`;
  }
  const baslangicSaat = Math.floor(d.zaman / SAAT);
  const gunSonuSaat = (g + 1) * 24;
  const bitisSaat = Math.min(baslangicSaat + (gunluk - saat), gunSonuSaat);
  saat += bitisSaat - baslangicSaat;
  if (yeniGun) gunSayisi += 1;
  return { hafta: h, gunSayisi, gun: g, saat, bitis: bitisSaat * SAAT };
}

// ---------------------------------------------------------------------------
// Komutlar
// ---------------------------------------------------------------------------

type PerakendeKomutu = Extract<MulkKomutu, { tur: "dukkan_raf" | "dukkan_fiyat" | "marka_tanimla" | "dukkan_marka" | "dukkan_yik" }>;

/** Beş dükkân komutunun etkin yolu. `mulkKomutu` mülk kipi açıkken çağırır; `mk.perakende` yoksa DUK-00. */
export function perakendeKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: PerakendeKomutu): KomutSonucu {
  const mk = ctx.ic.mulk as DerlenmisMulk;
  const pk = mk.perakende;
  if (pk === undefined) return hata("perakende kapali");
  switch (k.tur) {
    case "dukkan_raf": {
      const dkn = dukkanBul(d, oyuncu, k.dukkan);
      if (dkn === undefined) return bulunamadi(k.dukkan);
      const dk = dkn.dk;
      const yh = yuvaDenetimi(dk, k.yuva);
      if (yh !== null) return hata(yh);
      const y = dk.raf[k.yuva] as RafYuvasi;
      if (k.mal === null) {
        if (y.mal === undefined) return hata("yuva zaten bos");
        // Boşaltma `fiyatT`'yi SİLMEZ: fiyat değiştir -> boşalt -> doldur -> fiyat değiştir döngüsü hız sınırını atlayamaz (hız sınırı doldurmada denetlenir). `fiyatT` hiç yazılmamışsa
        // boşaltma anı yazılır: doldur -> boşalt -> doldur -> boşalt ile mal rotasyonu da sınırsız dönemez (yuvanın İLK doldurulması muaf kalır; dolu yuvada doğrudan A -> B bir kez serbesttir).
        delete y.mal;
        if (y.fiyatT === undefined) y.fiyatT = d.zaman;
        y.fiyat = pk.p.varsayilanFiyatKademesi;
        return TAMAM;
      }
      const mi = typeof k.mal === "string" ? ctx.ic.malIndeks[k.mal] : undefined;
      if (mi === undefined) return hata(`bilinmeyen mal: ${String(k.mal)}`);
      const tur = pk.turler.get(dk.tur);
      if (tur === undefined || !tur.malKumesi.has(mi)) return hata(`bu mal bu dukkan turunde satilamaz: ${k.mal}`);
      for (let i = 0; i < dk.raf.length; i++) if (i !== k.yuva && (dk.raf[i] as { mal?: string }).mal === k.mal) return hata(`bu mal baska yuvada: ${k.mal}`);
      if (y.mal === k.mal) return hata(`yuva zaten bu malla dolu: ${k.mal}`);
      const dolu = y.mal !== undefined;
      // Hız sınırı: `fiyatT` tanımlıysa (yuvada daha önce fiyat/mal DEĞİŞİMİ olmuşsa; boş yuvaya doldurma dahil) denetlenir. Yuvanın İLK doldurulması (`fiyatT` tanımsız) muaftır
      // ve `fiyatT` tanımsız kalır: oyuncu rafı doldurup kademeyi hemen seçebilir.
      const hs = hizSiniri(d, pk, y.fiyatT);
      if (hs !== null) return hata(hs);
      // Uygula: mal yaz, kademe varsayılana döner; değiştirme (dolu yuva ya da `fiyatT` tanımlı boş yuva) `fiyatT` yazar, yuvanın ilk doldurulması yazmaz.
      const sayac = dolu || y.fiyatT !== undefined;
      y.mal = k.mal;
      y.fiyat = pk.p.varsayilanFiyatKademesi;
      if (sayac) y.fiyatT = d.zaman;
      return TAMAM;
    }
    case "dukkan_fiyat": {
      const dkn = dukkanBul(d, oyuncu, k.dukkan);
      if (dkn === undefined) return bulunamadi(k.dukkan);
      const dk = dkn.dk;
      const yh = yuvaDenetimi(dk, k.yuva);
      if (yh !== null) return hata(yh);
      const y = dk.raf[k.yuva] as RafYuvasi;
      if (y.mal === undefined) return hata("bos yuvaya fiyat verilemez");
      const K = pk.p.fiyatKademeleriPpm.length;
      if (!Number.isSafeInteger(k.fiyat) || k.fiyat < 0 || k.fiyat >= K) return hata(`gecersiz fiyat kademesi: ${String(k.fiyat)} (0..${K - 1})`);
      if (k.fiyat === y.fiyat) return hata("fiyat zaten bu kademede");
      let kampanya: KampanyaDurumu | undefined;
      if (pk.p.kampanyaKademesi !== undefined && k.fiyat === pk.p.kampanyaKademesi) {
        const plan = kampanyaPlani(d, pk, dk);
        if (typeof plan === "string" && plan !== "ucretsiz") return hata(plan);
        if (typeof plan !== "string") kampanya = plan;
      }
      const hs = hizSiniri(d, pk, y.fiyatT);
      if (hs !== null) return hata(hs);
      y.fiyat = k.fiyat;
      y.fiyatT = d.zaman;
      if (kampanya !== undefined) dk.kampanya = kampanya;
      return TAMAM;
    }
    case "marka_tanimla": {
      const mo = mulkOyuncuBul(d, oyuncu);
      const liste = mo?.markalar ?? [];
      if (!Number.isSafeInteger(k.marka) || k.marka < 0 || k.marka > liste.length) return hata(`gecersiz marka sirasi: ${String(k.marka)}`);
      const en = pk.p.marka;
      if (k.marka >= en.hesapBasinaEnFazla) return hata(`hesap basina en cok ${en.hesapBasinaEnFazla} marka`);
      const ad = adKanonik(k.ad);
      if (!ad.tamam) return hata(ad.hata);
      if (!Number.isSafeInteger(k.simge) || k.simge < 0 || k.simge >= en.simgeSayisi) return hata(`gecersiz marka simgesi: ${String(k.simge)} (0..${en.simgeSayisi - 1})`);
      if (!Number.isSafeInteger(k.renk) || k.renk < 0 || k.renk >= en.renkSayisi) return hata(`gecersiz marka rengi: ${String(k.renk)} (0..${en.renkSayisi - 1})`);
      const mevcut = liste[k.marka];
      if (mevcut !== undefined && mevcut.ad === ad.ad && mevcut.simge === k.simge && mevcut.renk === k.renk) return hata("marka zaten bu degerlerde");
      const yeni = { ad: ad.ad, simge: k.simge, renk: k.renk };
      const o = mulkOyuncuAl(d.mulk as NonNullable<Dunya["mulk"]>, oyuncu, d.zaman);
      const l = (o.markalar ??= []);
      if (k.marka === l.length) l.push(yeni);
      else l[k.marka] = yeni;
      return TAMAM;
    }
    case "dukkan_marka": {
      const dkn = dukkanBul(d, oyuncu, k.dukkan);
      if (dkn === undefined) return bulunamadi(k.dukkan);
      const sayi = mulkOyuncuBul(d, oyuncu)?.markalar?.length ?? 0;
      if (!Number.isSafeInteger(k.marka) || k.marka < 0 || k.marka >= sayi) return hata(`bilinmeyen marka: ${String(k.marka)}`);
      if (dkn.dk.marka === k.marka) return hata("dukkan zaten bu markada");
      dkn.dk.marka = k.marka;
      return TAMAM;
    }
    case "dukkan_yik": {
      const dkn = dukkanBul(d, oyuncu, k.dukkan);
      if (dkn === undefined) {
        // Kimlik oyuncunun SÜREN dükkân inşaatına aitse DUK-23; başkasının dükkânı ve bilinmeyen kimlik aynı ileti (DUK-10): bilgi sızdırmaz.
        if (Number.isSafeInteger(k.dukkan) && d.insaatlar.some((i) => i.id === k.dukkan && i.sahip === oyuncu && i.ekYapi === "dukkan")) return hata(`dukkan henuz tamamlanmadi: insaat_iptal kullanin (${k.dukkan})`);
        return bulunamadi(k.dukkan);
      }
      // Uygula (artık başarısız olamaz): yapı (raf, kampanya, marka bağı, zaman damgaları ile birlikte) silinir, hücrelerin `tesis` işareti kalkar; hücre sahibi, arazi değeri,
      // ilçe sayaçları, indirim sayacı, marka tanımı ve para DEĞİŞMEZ (iade YOK).
      const b = dkn.b;
      (b.ekYapilar as EkYapiDurumu[]).splice(dkn.konum, 1);
      if ((b.ekYapilar as EkYapiDurumu[]).length === 0) delete b.ekYapilar;
      for (const hid of dkn.e.hucreler) {
        const h = hucreBul(d, hid);
        if (h !== undefined && h.tesis === dkn.e.id) delete h.tesis;
      }
      return TAMAM;
    }
    default: {
      const _tamamlik: never = k;
      return hata(`bilinmeyen perakende komutu: ${JSON.stringify(_tamamlik)}`);
    }
  }
}

/**
 * `marka_sifirla {oyuncu, marka}` (moderasyon; yalnız sistem yolu, `motor.uygula` sistem yetkisini denetler): markanın adını `ADSIZ_MARKA` yer tutucusuna çevirir; simge, renk ve dükkân
 * bağlantıları değişmez. Perakende kapalıysa DUK-00; oyuncunun mülk kaydı yoksa `bilinmeyen oyuncu`; marka yoksa MRK-13.
 */
export function markaSifirla(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, marka: number): KomutSonucu {
  if (ctx.ic.mulk?.perakende === undefined) return hata("perakende kapali");
  const mo = mulkOyuncuBul(d, oyuncu);
  if (mo === undefined) return hata(`bilinmeyen oyuncu: ${String(oyuncu)}`);
  const m = Number.isSafeInteger(marka) ? mo.markalar?.[marka] : undefined;
  if (m === undefined) return hata(`bilinmeyen marka: ${String(marka)}`);
  m.ad = ADSIZ_MARKA;
  return TAMAM;
}

/**
 * Bölge bazında üretim/tüketim hesabı (lojistik çözümünün 1., 4. ve 5. adımları).
 *
 * - bolgeHesapla: istihdam, rezerv verimi, potansiyel, talep ve arz (adım 1).
 * - bolgeVerimCoz: stok 0 iken öncelik sırasıyla kullanılabilir akışı paylaştırır, tesis verimini belirler (adım 4).
 * - bolgeOranlariUygula: stok yerel oranlarını ve üretim oranını yazar (adım 5).
 *
 * Bilinen sınır (belgelenmiş): zincir içi dolaylı kısıtlar tek çözümde tam yakınsamaz. Bölge içi zincir
 * (çiftlik -> gıda fabrikası) için verim birkaç tur yinelenir; bölgeler arası etki stok boşalınca gelen
 * esik/oran_delta olaylarının tetiklediği yeni çözümlerle oturur.
 */
import { ikmalTalebi } from "../askeri";
import { icerikTablosu } from "./tablo";
import type { IcerikTablosu } from "./tablo";
import { carpBol, tamsayiKarekok } from "../sabit";
import { anlikMiktar, stokOranAyarla } from "../stok";
import { PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya, Mili } from "../tipler";

/** Bir bölgenin tek çözümlük hesabı. Mal dizileri mal indeksine göre, tesis dizileri tesis sırasına göredir. */
export interface BolgeHesabi {
  indeks: number;
  bolge: BolgeDurumu;
  /** Tesis başına istihdam oranı (ppm). */
  isciPpm: number[];
  /** Tesis başına potansiyel çalışma oranı (ppm): istihdam × rezerv verimi. */
  potansiyelPpm: number[];
  /** Tesis başına son verim (ppm): min(potansiyel, girdi yeterliliği). */
  verimPpm: number[];
  nufusTuketim: Mili[];
  ikmal: Mili[];
  bakim: Mili[];
  girdiPot: Mili[];
  ciktiPot: Mili[];
  ihracat: Mili[];
  ithalat: Mili[];
  talep: Mili[];
  arz: Mili[];
  /** Çözüm anındaki anlık stok. */
  stok: Mili[];
  /** Öncelik katmanlarının karşılanma oranları (ppm): 1 nüfus+ordu, 2 bakım, 3 tesis girdisi, 4 ihracat. */
  fr1: number[];
  fr2: number[];
  fr3: number[];
  fr4: number[];
  /** Gerçek (verimle ve karşılanma ile ölçeklenmiş) saatlik ihracat (mal bazında). */
  ihracatGercek: Mili[];
  /** Brüt çıktı oranı: Σ çıktı × verim. */
  ciktiGercek: Mili[];
}

/** Stok bu kadar saatlik açığı karşılayabiliyorsa tüketim kısılmaz; altında stok bu ufka yayılarak tüketilir. */
const STOK_UFKU_SAAT = 4;

/** stokOranAyarla için mutlak taban tolerans (mili-birim/saat). */
const ORAN_TOLERANSI_TABAN = 4;

function sifirlar(n: number): number[] {
  return new Array<number>(n).fill(0);
}

/** Rezerv verimi (ppm) = sqrt(kalan / ilk); ilk veya kalan 0 ise 0. */
export function rezervVerimi(ilk: number, kalan: number): number {
  if (ilk <= 0 || kalan <= 0) return 0;
  if (kalan >= ilk) return PPM;
  // sqrt(kalan/ilk) × PPM = sqrt(kalan × PPM² / ilk): ara bölmede ppm hassasiyeti kaybolmasın diye tek adımda.
  return tamsayiKarekok(carpBol(kalan, PPM * PPM, ilk));
}


const havuzlar = new WeakMap<object, BolgeHesabi[]>();

/**
 * Bölge hesap nesnesini havuzdan alır ve sıfırlar (GC baskısını azaltır). Çözüm eşzamanlı ve tek başınadır;
 * nesne yalnızca bir çözüm boyunca yaşar, dünya durumuna girmez.
 */
function hesapAl(anahtar: object, nm: number, r: number, tesisSayisi: number): BolgeHesabi {
  let havuz = havuzlar.get(anahtar);
  if (!havuz) {
    havuz = [];
    havuzlar.set(anahtar, havuz);
  }
  let h = havuz[r];
  if (!h || h.isciPpm.length !== tesisSayisi || h.talep.length !== nm) {
    h = {
      indeks: r,
      bolge: undefined as unknown as BolgeDurumu,
      isciPpm: sifirlar(tesisSayisi),
      potansiyelPpm: sifirlar(tesisSayisi),
      verimPpm: sifirlar(tesisSayisi),
      nufusTuketim: sifirlar(nm),
      ikmal: sifirlar(nm),
      bakim: sifirlar(nm),
      girdiPot: sifirlar(nm),
      ciktiPot: sifirlar(nm),
      ihracat: sifirlar(nm),
      ithalat: sifirlar(nm),
      talep: sifirlar(nm),
      arz: sifirlar(nm),
      stok: sifirlar(nm),
      fr1: new Array<number>(nm).fill(PPM),
      fr2: new Array<number>(nm).fill(PPM),
      fr3: new Array<number>(nm).fill(PPM),
      fr4: new Array<number>(nm).fill(PPM),
      ihracatGercek: sifirlar(nm),
      ciktiGercek: sifirlar(nm),
    };
    havuz[r] = h;
    return h;
  }
  h.isciPpm.fill(0);
  h.potansiyelPpm.fill(0);
  h.verimPpm.fill(0);
  h.nufusTuketim.fill(0);
  h.ikmal.fill(0);
  h.bakim.fill(0);
  h.girdiPot.fill(0);
  h.ciktiPot.fill(0);
  h.ihracat.fill(0);
  h.ithalat.fill(0);
  h.talep.fill(0);
  h.arz.fill(0);
  h.stok.fill(0);
  h.fr1.fill(PPM);
  h.fr2.fill(PPM);
  h.fr3.fill(PPM);
  h.fr4.fill(PPM);
  h.ihracatGercek.fill(0);
  h.ciktiGercek.fill(0);
  return h;
}

/** Adım 1: istihdam, potansiyel, talep ve arz. `odemePpm`: sahibin ödeme gücü (para lavaboları), varsayılan %100. */
export function bolgeHesapla(d: Dunya, ctx: Baglam, r: number, odemePpm: number = PPM): BolgeHesabi {
  const tb = icerikTablosu(ctx.ic);
  const nm = tb.malSayisi;
  const b = d.bolgeler[r] as BolgeDurumu;
  const t = d.zaman;
  const tesisSayisi = b.tesisler.length;

  const h = hesapAl(ctx.ic, nm, r, tesisSayisi);
  h.bolge = b;

  for (let m = 0; m < nm; m++) h.stok[m] = anlikMiktar((b.stoklar[m] as BolgeDurumu["stoklar"][number]), t);

  // İşgücü: aktif tesislere tesis sırasıyla (id sırası) dağıtılır.
  let kalanIsci = carpBol(b.nufus, ctx.ic.param.nufus.isgucuPpm, PPM);
  for (let i = 0; i < tesisSayisi; i++) {
    const ts = b.tesisler[i] as BolgeDurumu["tesisler"][number];
    const y = tb.yontem[ts.yontem] as IcerikTablosu["yontem"][number];
    if (ts.aktif) {
      const atanan = kalanIsci < y.isci ? kalanIsci : y.isci;
      kalanIsci -= atanan;
      const isciPpm = y.isci > 0 ? carpBol(atanan, PPM, y.isci) : PPM;
      h.isciPpm[i] = isciPpm;
      const rv = y.rezerv >= 0 ? rezervVerimi(b.rezervIlk[y.rezerv] as number, b.rezervKalan[y.rezerv] as number) : PPM;
      // Ödeme gücü (hazine 0 ve net oran negatifken < PPM): tesis verimi "maaş ödenemiyor" oranında kısılır.
      h.potansiyelPpm[i] = carpBol(carpBol(isciPpm, rv, PPM), odemePpm, PPM);
    }
    // Bakım aktif olsun olmasın tüketilir (batma).
    for (const [m, q] of y.bakim) h.bakim[m] = (h.bakim[m] as number) + q;
    const pot = h.potansiyelPpm[i] as number;
    if (pot > 0) {
      for (const [m, q] of y.girdi) h.girdiPot[m] = (h.girdiPot[m] as number) + carpBol(q, pot, PPM);
      for (const [m, q] of y.cikti) h.ciktiPot[m] = (h.ciktiPot[m] as number) + carpBol(q, pot, PPM);
    }
  }

  for (const [m, q] of tb.nufusTuketim) h.nufusTuketim[m] = carpBol(b.nufus, q, 1000);
  const ik = ikmalTalebi(d, ctx, r);
  for (let m = 0; m < nm; m++) h.ikmal[m] = ik[m] ?? 0;
  for (const e of b.ticaretEmirleri) {
    if (e.yon === "ihracat") h.ihracat[e.mal] = (h.ihracat[e.mal] as number) + e.gerceklesenSaat;
    else h.ithalat[e.mal] = (h.ithalat[e.mal] as number) + e.gerceklesenSaat;
  }

  for (let m = 0; m < nm; m++) {
    h.talep[m] = (h.nufusTuketim[m] as number) + (h.ikmal[m] as number) + (h.girdiPot[m] as number) + (h.bakim[m] as number) + (h.ihracat[m] as number);
    h.arz[m] = (h.ciktiPot[m] as number) + (h.ithalat[m] as number);
  }
  return h;
}

/** a/b oranı ppm olarak, [0, PPM]; b <= 0 ise PPM. */
function oranPpm(a: number, bolen: number): number {
  if (bolen <= 0) return PPM;
  if (a >= bolen) return PPM;
  if (a <= 0) return 0;
  return carpBol(a, PPM, bolen);
}

/**
 * Adım 4: tesis verimi ve öncelik katmanı karşılanma oranları.
 * `giden`: bu çözümün akışlarıyla bölgeden çıkan oran (mal bazında).
 * Stok açığı (talep − kullanılabilir akış) en az STOK_UFKU_SAAT saat karşılıyorsa her katman %100; aksi halde kullanılabilir
 * akış (yerel arz + gelen + ithalat − giden) sırayla (1) nüfus + ordu ikmali, (2) bakım, (3) tesis girdileri,
 * (4) ihracat arasında paylaştırılır (stok 0 iken tam bu durum).
 */
export function bolgeVerimCoz(ctx: Baglam, h: BolgeHesabi, giden: readonly Mili[]): void {
  const tb = icerikTablosu(ctx.ic);
  const nm = tb.malSayisi;
  const b = h.bolge;
  const tesisSayisi = b.tesisler.length;

  // Başlangıç: verim = potansiyel.
  for (let i = 0; i < tesisSayisi; i++) h.verimPpm[i] = h.potansiyelPpm[i] as number;

  for (let tur = 0; tur < 4; tur++) {
    // Mevcut verimle brüt çıktı
    h.ciktiGercek.fill(0);
    for (let i = 0; i < tesisSayisi; i++) {
      const v = h.verimPpm[i] as number;
      if (v <= 0) continue;
      const y = tb.yontem[(b.tesisler[i] as BolgeDurumu["tesisler"][number]).yontem] as IcerikTablosu["yontem"][number];
      for (const [m, q] of y.cikti) h.ciktiGercek[m] = (h.ciktiGercek[m] as number) + carpBol(q, v, PPM);
    }

    let paylasim = false;
    for (let m = 0; m < nm; m++) {
      const s = b.stoklar[m] as BolgeDurumu["stoklar"][number];
      const d1 = (h.nufusTuketim[m] as number) + (h.ikmal[m] as number);
      const d2 = h.bakim[m] as number;
      const d3 = h.girdiPot[m] as number;
      const d4 = h.ihracat[m] as number;
      let a = (h.ciktiGercek[m] as number) + (h.ithalat[m] as number) + s.gelenOran - (giden[m] as number);
      if (a < 0) a = 0;
      // Stok, açığı en az STOK_UFKU_SAAT saat karşılayabiliyorsa tüm katmanlar %100 (stok "sınırsız" sayılır).
      // Aksi halde stok bu ufka yayılarak (saatte stok/ufuk) kullanılabilir akışa eklenir ve toplam katmanlara
      // öncelik sırasıyla paylaştırılır; böylece rejim geçişi sürekli (titreşimsiz) ve stok tam tükenir.
      const acik = d1 + d2 + d3 + d4 - a;
      const stok = h.stok[m] as number;
      if (acik <= 0 || stok >= acik * STOK_UFKU_SAAT) {
        h.fr1[m] = PPM;
        h.fr2[m] = PPM;
        h.fr3[m] = PPM;
        h.fr4[m] = PPM;
        continue;
      }
      paylasim = true;
      a += Math.floor(stok / STOK_UFKU_SAAT);
      const p1 = a < d1 ? a : d1;
      a -= p1;
      const p2 = a < d2 ? a : d2;
      a -= p2;
      const p3 = a < d3 ? a : d3;
      a -= p3;
      const p4 = a < d4 ? a : d4;
      h.fr1[m] = oranPpm(p1, d1);
      h.fr2[m] = oranPpm(p2, d2);
      h.fr3[m] = oranPpm(p3, d3);
      h.fr4[m] = oranPpm(p4, d4);
    }
    if (!paylasim) break;

    let degisti = false;
    for (let i = 0; i < tesisSayisi; i++) {
      const pot = h.potansiyelPpm[i] as number;
      if (pot <= 0) continue;
      const y = tb.yontem[(b.tesisler[i] as BolgeDurumu["tesisler"][number]).yontem] as IcerikTablosu["yontem"][number];
      let v = pot;
      for (const [m] of y.girdi) {
        const f = h.fr3[m] as number;
        if (f < v) v = f;
      }
      if (v !== h.verimPpm[i]) {
        h.verimPpm[i] = v;
        degisti = true;
      }
    }
    if (!degisti) break;
  }
  // Son verimle brüt çıktıyı tazele (döngü erken çıkmış olabilir).
  h.ciktiGercek.fill(0);
  for (let i = 0; i < tesisSayisi; i++) {
    const v = h.verimPpm[i] as number;
    if (v <= 0) continue;
    const y = tb.yontem[(b.tesisler[i] as BolgeDurumu["tesisler"][number]).yontem] as IcerikTablosu["yontem"][number];
    for (const [m, q] of y.cikti) h.ciktiGercek[m] = (h.ciktiGercek[m] as number) + carpBol(q, v, PPM);
  }
  for (let m = 0; m < nm; m++) h.ihracatGercek[m] = carpBol(h.ihracat[m] as number, h.fr4[m] as number, PPM);
}

/** Bölgeye yazılan karşılanma oranları ve tesis verim alanları. */
export function bolgeDurumunaYaz(ctx: Baglam, h: BolgeHesabi): void {
  const tb = icerikTablosu(ctx.ic);
  const b = h.bolge;
  for (let i = 0; i < b.tesisler.length; i++) {
    const ts = b.tesisler[i] as BolgeDurumu["tesisler"][number];
    ts.isciPpm = h.isciPpm[i] as number;
    ts.verimPpm = h.verimPpm[i] as number;
  }
  b.gidaKarsilanmaPpm = tb.gidaMal >= 0 ? (h.fr1[tb.gidaMal] as number) : PPM;
  let ikmalOran = PPM;
  for (let m = 0; m < tb.malSayisi; m++) {
    if ((h.ikmal[m] as number) > 0) {
      const f = h.fr1[m] as number;
      if (f < ikmalOran) ikmalOran = f;
    }
  }
  b.ikmalKarsilanmaPpm = ikmalOran;
}

/**
 * Adım 5: stok yerel oranları ve üretim oranı.
 * yerelOran = Σ çıktı×verim − Σ girdi×verim − nüfus/ordu − bakım − ihracat + ithalat − giden − bozulma.
 */
export function bolgeOranlariUygula(d: Dunya, ctx: Baglam, h: BolgeHesabi, giden: readonly Mili[]): void {
  const tb = icerikTablosu(ctx.ic);
  const nm = tb.malSayisi;
  const b = h.bolge;
  const girdiGercek = sifirlar(nm);
  for (let i = 0; i < b.tesisler.length; i++) {
    const v = h.verimPpm[i] as number;
    if (v <= 0) continue;
    const y = tb.yontem[(b.tesisler[i] as BolgeDurumu["tesisler"][number]).yontem] as IcerikTablosu["yontem"][number];
    for (const [m, q] of y.girdi) girdiGercek[m] = (girdiGercek[m] as number) + carpBol(q, v, PPM);
  }
  for (let m = 0; m < nm; m++) {
    const cikti = h.ciktiGercek[m] as number;
    const tuketim = carpBol(h.nufusTuketim[m] as number, h.fr1[m] as number, PPM) + carpBol(h.ikmal[m] as number, h.fr1[m] as number, PPM);
    const bakim = carpBol(h.bakim[m] as number, h.fr2[m] as number, PPM);
    const bozulmaPpmGun = (ctx.ic.mallar[m] as { bozulmaPpmGun: number }).bozulmaPpmGun;
    const bozulma = bozulmaPpmGun > 0 ? carpBol(h.stok[m] as number, bozulmaPpmGun, 24 * PPM) : 0;
    const yerel =
      cikti - (girdiGercek[m] as number) - tuketim - bakim - (h.ihracatGercek[m] as number) + (h.ithalat[m] as number) - (giden[m] as number) - bozulma;
    // Bozulma yalnızca stok varken işler; stok 0 iken yerel oran ≥ 0 kalır.
    b.uretimOrani[m] = cikti;
    // Küçük (~%0,4 veya 4 mili-birim/saat) oran değişimleri uygulanmaz: her çözümde yüzlerce yeni eşik olayı
    // üretmemek için. Mevcut eşik olayı bu kadar sapmada hâlâ geçerlidir (boşalma/dolma çözümü zaten yeniler).
    const mevcut = (b.stoklar[m] as BolgeDurumu["stoklar"][number]).yerelOran;
    const fark = yerel > mevcut ? yerel - mevcut : mevcut - yerel;
    const mutlak = yerel < 0 ? -yerel : yerel;
    const tolerans = mutlak >> 8 > ORAN_TOLERANSI_TABAN ? mutlak >> 8 : ORAN_TOLERANSI_TABAN;
    if (fark > tolerans) stokOranAyarla(d, ctx, h.indeks, m, yerel);
  }
}

/** Adım 0: muhasebe. uretimToplam'a ve ham mallar için rezerve eski oranla işler. */
export function uretimMuhasebesi(d: Dunya, ctx: Baglam): void {
  const tb = icerikTablosu(ctx.ic);
  const t = d.zaman;
  for (const b of d.bolgeler) {
    const dt = t - b.uretimT0;
    if (dt > 0) {
      for (let m = 0; m < tb.malSayisi; m++) {
        const oran = b.uretimOrani[m] as number;
        if (oran === 0) continue;
        const artis = carpBol(oran, dt, SAAT);
        b.uretimToplam[m] = (b.uretimToplam[m] as number) + artis;
        if (tb.ham[m]) {
          const kalan = (b.rezervKalan[m] as number) - artis;
          b.rezervKalan[m] = kalan < 0 ? 0 : kalan;
        }
      }
    }
    b.uretimT0 = t;
  }
}

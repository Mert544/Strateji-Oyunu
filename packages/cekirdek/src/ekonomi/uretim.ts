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
import { tarimCiktiCarpani } from "../tarim/carpan";
import { tarimTablosu } from "../tarim/tablo";
import type { TarimTablosu } from "../tarim/tablo";
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
  /**
   * Tarım (B1): tesis başına çıktı çarpanı (ppm; toprak x iklim x olay x gübre). Tarımsal olmayan tesiste ve tarım
   * kapalıyken PPM'dir (çıktıya hiç uygulanmaz).
   */
  ciktiCarpan: number[];
  /** Tarım (B1): tesis başına tam verimde gübre talebi (mili-birim/saat); gübre dozu yoksa 0. */
  gubreIstek: number[];
  /** Tarım (B1): gübre girdisinin bu çözümdeki karşılanma oranı (ppm); talep yoksa PPM. */
  gubreKarsilanma: number;
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
      ciktiCarpan: new Array<number>(tesisSayisi).fill(PPM),
      gubreIstek: sifirlar(tesisSayisi),
      gubreKarsilanma: PPM,
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
  h.ciktiCarpan.fill(PPM);
  h.gubreIstek.fill(0);
  h.gubreKarsilanma = PPM;
  return h;
}

/**
 * Tarım (B1): bir tesisin çıktı kalemini verimle ve (tarımsal ise) çıktı çarpanıyla ölçekler.
 * Çarpan PPM ise sonuç `carpBol(q, v, PPM)` ile birebir aynıdır (v0.2).
 */
function ciktiOlcekle(q: number, v: number, carpan: number): number {
  const x = carpBol(q, v, PPM);
  return carpan === PPM ? x : carpBol(x, carpan, PPM);
}

/** Tarımsal tesislerin çıktı çarpanlarını verilen gübre karşılanma oranıyla yeniler (yalnız tarım açık ve bölge tarımlıysa). */
function carpanlariYenile(tt: TarimTablosu, ctx: Baglam, h: BolgeHesabi, gubreKarsilanma: number): void {
  const b = h.bolge;
  for (let i = 0; i < b.tesisler.length; i++) {
    const ts = b.tesisler[i] as BolgeDurumu["tesisler"][number];
    if (!ts.aktif || !(tt.yontemTarimsal[ts.yontem] as boolean)) continue;
    h.ciktiCarpan[i] = tarimCiktiCarpani(tt, ctx.ic, b, tt.yontemEkili[ts.yontem] as boolean, gubreKarsilanma);
  }
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
  // Tarım (B1): tarım açıksa ve bölge tarım alanına sahipse tarımsal tesislere çıktı çarpanı ve gübre talebi uygulanır.
  const tt = tarimTablosu(ctx.ic);
  const tarimli = tt !== null && b.tarim !== undefined;

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
      const tarimsal = tarimli && (tt as TarimTablosu).yontemTarimsal[ts.yontem] === true;
      // Tarımsal yöntemde rezerv verimi yerine toprak x iklim x olay x gübre çarpanı (çıktıya) uygulanır.
      const rv = y.rezerv >= 0 && !tarimsal ? rezervVerimi(b.rezervIlk[y.rezerv] as number, b.rezervKalan[y.rezerv] as number) : PPM;
      // Ödeme gücü (hazine 0 ve net oran negatifken < PPM): tesis verimi "maaş ödenemiyor" oranında kısılır.
      h.potansiyelPpm[i] = carpBol(carpBol(isciPpm, rv, PPM), odemePpm, PPM);
      if (tarimsal) {
        const tb2 = tt as TarimTablosu;
        h.ciktiCarpan[i] = tarimCiktiCarpani(tb2, ctx.ic, b, tb2.yontemEkili[ts.yontem] as boolean, PPM);
        const ta = b.tarim as NonNullable<BolgeDurumu["tarim"]>;
        if (ta.gubreDozu > 0) h.gubreIstek[i] = ta.gubreDozu * tb2.tarim.gubreTuketimiSaat;
      }
    }
    // Bakım aktif olsun olmasın tüketilir (batma).
    for (const [m, q] of y.bakim) h.bakim[m] = (h.bakim[m] as number) + q;
    const pot = h.potansiyelPpm[i] as number;
    if (pot > 0) {
      for (const [m, q] of y.girdi) h.girdiPot[m] = (h.girdiPot[m] as number) + carpBol(q, pot, PPM);
      const carpan = h.ciktiCarpan[i] as number;
      for (const [m, q] of y.cikti) h.ciktiPot[m] = (h.ciktiPot[m] as number) + ciktiOlcekle(q, pot, carpan);
      const gi = h.gubreIstek[i] as number;
      if (gi > 0) {
        const gm = (tt as TarimTablosu).gubreMal;
        h.girdiPot[gm] = (h.girdiPot[gm] as number) + carpBol(gi, pot, PPM);
      }
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
  // Tarım (B1): gübre girdisi verimi sınırlamaz (yalnızca gübre etkisini azaltır); karşılanma oranı fr3'ten okunur.
  const tt = tarimTablosu(ctx.ic);
  let gubreTalep = false;
  for (let i = 0; i < tesisSayisi; i++) if ((h.gubreIstek[i] as number) > 0 && (h.potansiyelPpm[i] as number) > 0) gubreTalep = true;

  // Başlangıç: verim = potansiyel.
  for (let i = 0; i < tesisSayisi; i++) h.verimPpm[i] = h.potansiyelPpm[i] as number;

  for (let tur = 0; tur < 4; tur++) {
    // Mevcut verimle brüt çıktı
    h.ciktiGercek.fill(0);
    for (let i = 0; i < tesisSayisi; i++) {
      const v = h.verimPpm[i] as number;
      if (v <= 0) continue;
      const y = tb.yontem[(b.tesisler[i] as BolgeDurumu["tesisler"][number]).yontem] as IcerikTablosu["yontem"][number];
      const carpan = h.ciktiCarpan[i] as number;
      for (const [m, q] of y.cikti) h.ciktiGercek[m] = (h.ciktiGercek[m] as number) + ciktiOlcekle(q, v, carpan);
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
    // Gübre karşılanma oranı (paylaşım yoksa tüm fr'ler PPM'dir); değişirse çıktı çarpanları yenilenir ve tur tekrarlanır.
    let degisti = false;
    if (gubreTalep && tt !== null) {
      const gk = h.fr3[tt.gubreMal] as number;
      if (gk !== h.gubreKarsilanma) {
        h.gubreKarsilanma = gk;
        carpanlariYenile(tt, ctx, h, gk);
        degisti = true;
      }
    }
    if (!paylasim && !degisti) break;
    if (!paylasim) continue;
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
    const carpan = h.ciktiCarpan[i] as number;
    for (const [m, q] of y.cikti) h.ciktiGercek[m] = (h.ciktiGercek[m] as number) + ciktiOlcekle(q, v, carpan);
  }
  for (let m = 0; m < nm; m++) h.ihracatGercek[m] = carpBol(h.ihracat[m] as number, h.fr4[m] as number, PPM);
}

/**
 * Sahipsiz bölge ("uykuda"): üretim, tüketim, bozulma ve rezerv tükenmesi yok; tüm talep/arz sıfır.
 * Stok anlık miktarı h.stok'a yazılır (kapsam ve akış hesapları okur). Uyku durumu bolgeUykuUygula ile yazılır.
 */
export function bolgeUykuHesapla(d: Dunya, ctx: Baglam, r: number): BolgeHesabi {
  const tb = icerikTablosu(ctx.ic);
  const nm = tb.malSayisi;
  const b = d.bolgeler[r] as BolgeDurumu;
  const h = hesapAl(ctx.ic, nm, r, b.tesisler.length);
  h.bolge = b;
  for (let m = 0; m < nm; m++) h.stok[m] = anlikMiktar(b.stoklar[m] as BolgeDurumu["stoklar"][number], d.zaman);
  return h;
}

/**
 * Uyku durumunu bölgeye yazar: tesis verimi/işçi 0, karşılanma oranları %100 (kıtlık yok), üretim oranı 0 ve
 * tüm stok yerel oranları 0 (bozulma dahil). Oran zaten 0 ise stokOranAyarla hiçbir şey yapmaz (sürüm artmaz).
 * Bölge sahiplenince ilk çözüm bolgeHesapla ile normal hesaba geçer.
 */
export function bolgeUykuUygula(d: Dunya, ctx: Baglam, h: BolgeHesabi): void {
  const b = h.bolge;
  for (const ts of b.tesisler) {
    ts.isciPpm = 0;
    ts.verimPpm = 0;
  }
  b.gidaKarsilanmaPpm = PPM;
  b.ikmalKarsilanmaPpm = PPM;
  for (let m = 0; m < b.stoklar.length; m++) {
    b.uretimOrani[m] = 0;
    stokOranAyarla(d, ctx, h.indeks, m, 0);
  }
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
  // Tarım (B1): gübre karşılanma oranı (talep yoksa 0); toprak günlük tikte bunu okur.
  const tt = tarimTablosu(ctx.ic);
  if (tt !== null && b.tarim !== undefined) {
    b.tarim.gubreKarsilanmaPpm = (h.girdiPot[tt.gubreMal] as number) > 0 && b.tarim.gubreDozu > 0 ? h.gubreKarsilanma : 0;
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
  const tt = tarimTablosu(ctx.ic);
  const girdiGercek = sifirlar(nm);
  for (let i = 0; i < b.tesisler.length; i++) {
    const v = h.verimPpm[i] as number;
    if (v <= 0) continue;
    const y = tb.yontem[(b.tesisler[i] as BolgeDurumu["tesisler"][number]).yontem] as IcerikTablosu["yontem"][number];
    for (const [m, q] of y.girdi) girdiGercek[m] = (girdiGercek[m] as number) + carpBol(q, v, PPM);
    // Tarım (B1): gerçek gübre tüketimi = doz x tüketim x verim x karşılanma.
    const gi = h.gubreIstek[i] as number;
    if (gi > 0) {
      const gm = (tt as TarimTablosu).gubreMal;
      girdiGercek[gm] = (girdiGercek[gm] as number) + carpBol(carpBol(gi, v, PPM), h.gubreKarsilanma, PPM);
    }
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
  const tt = tarimTablosu(ctx.ic);
  const t = d.zaman;
  for (const b of d.bolgeler) {
    const dt = t - b.uretimT0;
    if (dt > 0) {
      for (let m = 0; m < tb.malSayisi; m++) {
        const oran = b.uretimOrani[m] as number;
        if (oran === 0) continue;
        const artis = carpBol(oran, dt, SAAT);
        b.uretimToplam[m] = (b.uretimToplam[m] as number) + artis;
        // Tarım açıkken tarım bölgesinde tarımsal yöntemin rezervi (tahıl) tükenmez: verim toprak/iklim çarpanıyla belirlenir.
        if (tb.ham[m] && !(tt !== null && b.tarim !== undefined && tt.tarimsalRezervMal[m] === true)) {
          const kalan = (b.rezervKalan[m] as number) - artis;
          b.rezervKalan[m] = kalan < 0 ? 0 : kalan;
        }
      }
    }
    b.uretimT0 = t;
  }
}

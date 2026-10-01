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
import { kitlikCarpani, temelKarsilanmaHesapla } from "../pazar";
import { pazarTablosu } from "../pazar/tablo";
import { carpBol, tamsayiKarekok } from "../sabit";
import { bakimCarpani, bakimDuzeyiIndeksi, bakimGirdiMiktari, cezaCarpani, kirlilikTarimCarpani, mulkBakim, olcekKademesi } from "../sanayi/carpan";
import { elektrikDagit } from "../sanayi/elektrik";
import type { ElektrikSonucu } from "../sanayi/elektrik";
import { akarsuCarpani, sanayiTablosu } from "../sanayi/tablo";
import type { SanayiTablosu } from "../sanayi/tablo";
import { anlikMiktar, stokOranAyarla } from "../stok";
import { tarimCiktiCarpani } from "../tarim/carpan";
import type { YerelCozum } from "../mulk/perakende";
import { MULKSUZ_PAKET } from "../mulksuz";
import { tarimTablosu } from "../tarim/tablo";
import type { TarimTablosu } from "../tarim/tablo";
import { PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, DerlenmisSebeke, Dunya, Mili } from "../tipler";

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
  /**
   * Mülk kipi yerel pazar (G7-2, sartname §6.3 a): düğümün dükkân satış isteği (mal bazında, mili-birim/saat; geçici, her çözümde sıfırlanır), katman 4a karşılanma
   * oranı (ppm) ve gerçekleşen satış. Dükkân yokken hep 0, PPM ve 0 (bit-exact no-op: `d4a = 0`).
   */
  dukkan: Mili[];
  frD: number[];
  dukkanGercek: Mili[];
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
  /** Sanayi (B2): tesis başına ölçek çarpanı (ppm; çıktı, girdi ve elektrik); sanayi kapalıyken PPM. */
  olcekPpm: number[];
  /** Sanayi (B2): tesis başına tam verimde elektrik talebi (mili-birim/saat; ölçekli); tüketici değilse 0. */
  elektrikGirdi: Mili[];
  /** Sanayi (B2): tesis başına tam verimde brüt santral elektriği (ölçek, akarsu, aşınma dahil); santral değilse 0. */
  elektrikKap: Mili[];
  /** Sanayi (B2): tesis başına elektrik uygulanmadan önceki verim (min(potansiyel, girdi yeterliliği)). */
  verimOn: number[];
  /** Sanayi (B2): hane elektrik talebi (mili-birim/saat). */
  haneElektrik: Mili;
  /** Sanayi (B2): bu çözümün elektrik dağıtımı; sanayi kapalıysa null. */
  elektrik: ElektrikSonucu | null;
  /** Mülk kipi şebeke (G6, sartname §5.2.2): kendi santralden karşılanamayıp şebekeden teslim edilen elektrik (mili-birim/saat; geçici, her çözümde sıfırlanır). */
  sebekeMili: Mili;
  /** Mülk kipi şebeke stoksuz tedarik (G6, §5.2.2b): mal indeksine göre şebekeden alınan GERÇEK tüketim (mili-birim/saat; geçici; şebekeli olmayan mallar 0). */
  sebekeStoksuz: Mili[];
}

/** Stok bu kadar saatlik açığı karşılayabiliyorsa tüketim kısılmaz; altında stok bu ufka yayılarak tüketilir. */
const STOK_UFKU_SAAT = 4;

/** Santral yük planı basamağı (ppm). */
const PLAN_BASAMAGI = 250_000;

/** stokOranAyarla için mutlak taban tolerans (mili-birim/saat). */
const ORAN_TOLERANSI_TABAN = 4;

function sifirlar(n: number): number[] {
  return new Array<number>(n).fill(0);
}

/**
 * Rezerv verimi (ppm) = sqrt(kalan / ilk); ilk veya kalan 0 ise 0.
 * Sanayi (B2): `taban` > 0 ise damar tükenince verim sıfıra değil bu orana iner (ilk > 0 olduğu sürece); kalan = 0 iken de
 * `taban` döner. Taban 0 (sanayi kapalı) özgün davranıştır.
 */
export function rezervVerimi(ilk: number, kalan: number, taban = 0): number {
  if (ilk <= 0) return 0;
  if (kalan <= 0) return taban;
  if (kalan >= ilk) return PPM;
  // sqrt(kalan/ilk) × PPM = sqrt(kalan × PPM² / ilk): ara bölmede ppm hassasiyeti kaybolmasın diye tek adımda.
  const v = tamsayiKarekok(carpBol(kalan, PPM * PPM, ilk));
  return v < taban ? taban : v;
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
      dukkan: sifirlar(nm),
      frD: new Array<number>(nm).fill(PPM),
      dukkanGercek: sifirlar(nm),
      ciktiGercek: sifirlar(nm),
      ciktiCarpan: new Array<number>(tesisSayisi).fill(PPM),
      gubreIstek: sifirlar(tesisSayisi),
      gubreKarsilanma: PPM,
      olcekPpm: new Array<number>(tesisSayisi).fill(PPM),
      elektrikGirdi: sifirlar(tesisSayisi),
      elektrikKap: sifirlar(tesisSayisi),
      verimOn: sifirlar(tesisSayisi),
      haneElektrik: 0,
      elektrik: null,
      sebekeMili: 0,
      sebekeStoksuz: sifirlar(nm),
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
  h.dukkan.fill(0);
  h.frD.fill(PPM);
  h.dukkanGercek.fill(0);
  h.ciktiGercek.fill(0);
  h.ciktiCarpan.fill(PPM);
  h.gubreIstek.fill(0);
  h.gubreKarsilanma = PPM;
  h.olcekPpm.fill(PPM);
  h.elektrikGirdi.fill(0);
  h.elektrikKap.fill(0);
  h.verimOn.fill(0);
  h.haneElektrik = 0;
  h.elektrik = null;
  h.sebekeMili = 0;
  h.sebekeStoksuz.fill(0);
  return h;
}

/**
 * Şebeke yolları (G6; sartname §5.2.2): YALNIZ mülk kipinde (`ic.mulk`), yalnız işletme düğümünde (`b.merkez`) ve yalnız `mulk.sebeke` tanımlıyken. Blok yoksa ya da
 * düğüm harita bölgesiyse `null` döner ve hiçbir kod yolu değişmez (bölge kipi altınları bayt bayt aynı).
 */
function sebekeElektrikYolu(ctx: Baglam, b: BolgeDurumu): DerlenmisSebeke | null {
  const sb = MULKSUZ_PAKET ? undefined : ctx.ic.mulk?.sebeke;
  return sb !== undefined && sb.elektrik !== undefined && b.merkez !== undefined ? sb : null;
}

/** Stoksuz mal tablosu (mal indeksi -> kayıt indeksi ya da -1); şebeke yoksa/listede stoksuz mal yoksa null. */
function sebekeStoksuzTablo(ctx: Baglam, b: BolgeDurumu): readonly number[] | null {
  const sb = MULKSUZ_PAKET ? undefined : ctx.ic.mulk?.sebeke;
  return sb !== undefined && sb.stoksuz.length > 0 && b.merkez !== undefined ? sb.stoksuzIndeks : null;
}

/**
 * Tarım (B1): bir tesisin çıktı kalemini verimle ve (tarımsal ise) çıktı çarpanıyla ölçekler.
 * Çarpan PPM ise sonuç `carpBol(q, v, PPM)` ile birebir aynıdır (v0.2).
 */
function ciktiOlcekle(q: number, v: number, carpan: number): number {
  const x = carpBol(q, v, PPM);
  return carpan === PPM ? x : carpBol(x, carpan, PPM);
}

/**
 * Bir tesisin çıktı çarpanı (ppm): [ölçek] x [tarım: toprak x iklim x olay x ürün x gübre x kirlilik] x [aşınma cezası].
 * Sanayi ve tarım kapalıyken (veya tarımsal olmayan tesiste) PPM döner: çıktıya hiç uygulanmaz (özgün davranış).
 */
function ciktiCarpaniHesapla(tt: TarimTablosu | null, sn: SanayiTablosu | null, ic: Baglam["ic"], b: BolgeDurumu, ts: BolgeDurumu["tesisler"][number], tarimsal: boolean, gubreKarsilanma: number): number {
  let c = PPM;
  if (tarimsal && tt !== null) c = tarimCiktiCarpani(tt, ic, b, tt.yontemEkili[ts.yontem] as boolean, gubreKarsilanma);
  // Pazar v1 (B3): kıtlık cezası çarpanı (kapalıyken veya kademe 0'da PPM).
  const kitlik = kitlikCarpani(ic, b);
  if (sn !== null) {
    const ol = olcekKademesi(sn, ts).ciktiPpm;
    if (ol !== PPM) c = carpBol(c, ol, PPM);
    const ceza = cezaCarpani(sn, ts, kitlik, mulkBakim(ic, b)?.tavanPpm);
    if (ceza !== PPM) c = carpBol(c, ceza, PPM);
    if (tarimsal) {
      const k = kirlilikTarimCarpani(sn, b);
      if (k !== PPM) c = carpBol(c, k, PPM);
    }
  } else if (kitlik !== PPM) {
    c = carpBol(c, kitlik, PPM);
  }
  // Yöntem çıktısı yedek geçersiz kılma (G6, sartname §5.9; varsayılan KAPALI): tablo yalnız `ciktiPpm !== PPM` yöntemleri içerir ve hiç yoksa alan oluşmaz (bu satırlar atlanır).
  // Yalnız mülk kipinde ve işletme düğümünde (`b.merkez`); ÇIKTIYA uygulanır, girdiye değil (girdi, bakım ve işçi aynı kalır).
  const mc = ic.mulk?.yontemCiktiPpm?.[ts.yontem];
  if (mc !== undefined && b.merkez !== undefined) c = carpBol(c, mc, PPM);
  return c;
}

/** Tesislerin çıktı çarpanlarını verilen gübre karşılanma oranıyla yeniler (yalnız tarımsal tesisler: gübre etkisi değişir). */
function carpanlariYenile(tt: TarimTablosu, ctx: Baglam, h: BolgeHesabi, gubreKarsilanma: number): void {
  const b = h.bolge;
  const sn = sanayiTablosu(ctx.ic);
  for (let i = 0; i < b.tesisler.length; i++) {
    const ts = b.tesisler[i] as BolgeDurumu["tesisler"][number];
    if (!ts.aktif || !(tt.yontemTarimsal[ts.yontem] as boolean)) continue;
    h.ciktiCarpan[i] = ciktiCarpaniHesapla(tt, sn, ctx.ic, b, ts, true, gubreKarsilanma);
  }
}

/** Adım 1: istihdam, potansiyel, talep ve arz. `odemePpm`: sahibin ödeme gücü (para lavaboları), varsayılan %100. */
export function bolgeHesapla(d: Dunya, ctx: Baglam, r: number, odemePpm: number = PPM, yerel?: YerelCozum | null): BolgeHesabi {
  const tb = icerikTablosu(ctx.ic);
  const nm = tb.malSayisi;
  const b = d.bolgeler[r] as BolgeDurumu;
  const t = d.zaman;
  const tesisSayisi = b.tesisler.length;
  const stoksuz = sebekeStoksuzTablo(ctx, b);

  const h = hesapAl(ctx.ic, nm, r, tesisSayisi);
  h.bolge = b;
  // Tarım (B1): tarım açıksa ve bölge tarım alanına sahipse tarımsal tesislere çıktı çarpanı ve gübre talebi uygulanır.
  const tt = tarimTablosu(ctx.ic);
  const tarimli = tt !== null && b.tarim !== undefined;
  // Sanayi (B2): ölçek, elektrik, aşınma, bakım düzeyi ve rezerv verimi tabanı; kapalıysa null (özgün davranış).
  const sn = sanayiTablosu(ctx.ic);
  const rezervTaban = sn === null ? 0 : sn.p.damar.rezervVerimTabaniPpm;
  const duzey = sn === null ? 1 : bakimDuzeyiIndeksi(d, b);
  // Mülk bakımı C (sartname §5.10): yalnız mülk kipinde, işletme düğümünde ve blok etkinse tanımlı; aksi halde undefined (eski aritmetik).
  const mb = mulkBakim(ctx.ic, b);
  const akarsu = sn === null ? PPM : akarsuCarpani(sn, ctx.ic, t);
  // Pazar v1 (B3): bölgede kıtlık cezası varsa sanayi kapalıyken de çıktı çarpanı hesaplanır.
  const kitlikAktif = pazarTablosu(ctx.ic) !== null && (b.kitlikKademesi ?? 0) > 0;
  // Santral yük planı: önceki çözümdeki yük + marj (yakıt talebi gerçek yükü izler; yük bilinmiyorsa tam yük).
  // Yük 250 000 ppm basamaklarına yukarı yuvarlanır: yakıt talebi yük dalgalanmasıyla her çözümde değişip akış/olay çalkantısı
  // (çözüm sayısı) yaratmasın.
  const planYuk =
    sn === null || b.elektrik === undefined ? PPM : Math.min(PPM, Math.ceil((b.elektrik.yukPpm + sn.p.yukPlanMarjiPpm) / PLAN_BASAMAGI) * PLAN_BASAMAGI);

  for (let m = 0; m < nm; m++) h.stok[m] = anlikMiktar((b.stoklar[m] as BolgeDurumu["stoklar"][number]), t);

  // İşgücü: aktif tesislere tesis sırasıyla (id sırası) dağıtılır.
  // Mülk kipi (S3): işletme düğümünün nüfusu yoktur; işgücü il düzeyinde yaklaşık "tam istihdam" sayılır (docs/11 §7.5).
  let kalanIsci = b.merkez !== undefined ? Number.MAX_SAFE_INTEGER : carpBol(b.nufus, ctx.ic.param.nufus.isgucuPpm, PPM);
  // Sanayi (B2): santraller işgücünde ÖNCELİKLİDİR (şebeke altyapısı; sıra sonunda kalan santral tüm bölgeyi karartmasın);
  // kalan işgücü diğer tesislere id sırasıyla dağıtılır. Kapalıyken özgün sıralı dağıtım.
  let atananDizi: number[] | null = null;
  if (sn !== null) {
    atananDizi = new Array<number>(tesisSayisi).fill(0);
    let kalan = kalanIsci;
    for (const santralTuru of [true, false]) {
      for (let i = 0; i < tesisSayisi; i++) {
        const ts = b.tesisler[i] as BolgeDurumu["tesisler"][number];
        if (((sn.yontemElektrikCikti[ts.yontem] as number) > 0) !== santralTuru) continue;
        if (!(ts.aktif && !(ts.onarimBitis !== undefined && ts.onarimBitis > t))) continue;
        const y = tb.yontem[ts.yontem] as IcerikTablosu["yontem"][number];
        const k = olcekKademesi(sn, ts);
        const gerek = k.isciPpm === PPM ? y.isci : carpBol(y.isci, k.isciPpm, PPM);
        const a = kalan < gerek ? kalan : gerek;
        kalan -= a;
        atananDizi[i] = a;
      }
    }
  }
  for (let i = 0; i < tesisSayisi; i++) {
    const ts = b.tesisler[i] as BolgeDurumu["tesisler"][number];
    const y = tb.yontem[ts.yontem] as IcerikTablosu["yontem"][number];
    // Sanayi: genel onarım sırasındaki tesis çalışmaz (bakım girdisi yine tüketilir).
    const calisir = ts.aktif && !(ts.onarimBitis !== undefined && ts.onarimBitis > t);
    const kademe = sn === null ? null : olcekKademesi(sn, ts);
    const olcekCikti = kademe === null ? PPM : kademe.ciktiPpm;
    if (kademe !== null) h.olcekPpm[i] = olcekCikti;
    let planPot = 0;
    if (calisir) {
      const isciGerek = kademe === null || kademe.isciPpm === PPM ? y.isci : carpBol(y.isci, kademe.isciPpm, PPM);
      let atanan: number;
      if (atananDizi !== null) atanan = atananDizi[i] as number;
      else {
        atanan = kalanIsci < isciGerek ? kalanIsci : isciGerek;
        kalanIsci -= atanan;
      }
      const isciPpm = isciGerek > 0 ? carpBol(atanan, PPM, isciGerek) : PPM;
      h.isciPpm[i] = isciPpm;
      const tarimsal = tarimli && (tt as TarimTablosu).yontemTarimsal[ts.yontem] === true;
      // Tarımsal yöntemde rezerv verimi yerine toprak x iklim x olay x gübre çarpanı (çıktıya) uygulanır.
      const rv = y.rezerv >= 0 && !tarimsal ? rezervVerimi(b.rezervIlk[y.rezerv] as number, b.rezervKalan[y.rezerv] as number, rezervTaban) : PPM;
      // Ödeme gücü (hazine 0 ve net oran negatifken < PPM): tesis verimi "maaş ödenemiyor" oranında kısılır.
      h.potansiyelPpm[i] = carpBol(carpBol(isciPpm, rv, PPM), odemePpm, PPM);
      planPot = h.potansiyelPpm[i] as number;
      if (sn !== null) {
        // Çıktı çarpanı: ölçek x aşınma cezası (x tarım x kirlilik tarımsalda).
        h.ciktiCarpan[i] = ciktiCarpaniHesapla(tt, sn, ctx.ic, b, ts, tarimsal, PPM);
        const eg = sn.yontemElektrikGirdi[ts.yontem] as number;
        if (eg > 0) h.elektrikGirdi[i] = carpBol(eg, olcekCikti, PPM);
        const ec = sn.yontemElektrikCikti[ts.yontem] as number;
        if (ec > 0) {
          const hidroCarpan = sn.yontemHidro[ts.yontem] ? akarsu : PPM;
          h.elektrikKap[i] = carpBol(carpBol(ec, olcekCikti, PPM), carpBol(hidroCarpan, cezaCarpani(sn, ts, PPM, mb?.tavanPpm), PPM), PPM);
          // Santralin yakıt talebi gerçek yükünü izler (tam yük planlamak, kullanılmayan yakıtı depoya yığardı).
          planPot = carpBol(planPot, planYuk, PPM);
        }
      } else if (tarimsal || kitlikAktif || ctx.ic.mulk?.yontemCiktiPpm !== undefined) {
        // Sanayi kapalı: tarım çıktı çarpanı (varsa), pazar v1 kıtlık cezası ve (mülk kipinde, yalnız blok etkinse) yöntem çıktı geçersiz kılma.
        h.ciktiCarpan[i] = ciktiCarpaniHesapla(tt, null, ctx.ic, b, ts, tarimsal, PPM);
      }
      if (tarimsal) {
        const tb2 = tt as TarimTablosu;
        const ta = b.tarim as NonNullable<BolgeDurumu["tarim"]>;
        if (ta.gubreDozu > 0) h.gubreIstek[i] = carpBol(ta.gubreDozu * tb2.tarim.gubreTuketimiSaat, olcekCikti, PPM);
      }
    }
    // Bakım aktif olsun olmasın tüketilir (batma); sanayide ölçek ve bakım düzeyi çarpanıyla.
    const bakimC = sn === null ? PPM : bakimCarpani(sn, ts, duzey);
    const pp = mb?.yontemParcaPpm?.[ts.yontem];
    for (const [m, q] of y.bakim) h.bakim[m] = (h.bakim[m] as number) + bakimGirdiMiktari(q, pp, bakimC);
    const pot = h.potansiyelPpm[i] as number;
    if (pot > 0) {
      for (const [m, q] of y.girdi) {
        // Şebekeli (stoksuz) mal stoktan talep EDİLMEZ (§5.2.2b Y-a): tüketim anında şebekeden alınır.
        if (stoksuz !== null && (stoksuz[m] as number) >= 0) continue;
        const qo = olcekCikti === PPM ? q : carpBol(q, olcekCikti, PPM);
        h.girdiPot[m] = (h.girdiPot[m] as number) + carpBol(qo, planPot, PPM);
      }
      const carpan = h.ciktiCarpan[i] as number;
      for (const [m, q] of y.cikti) h.ciktiPot[m] = (h.ciktiPot[m] as number) + ciktiOlcekle(q, pot, carpan);
      const gi = h.gubreIstek[i] as number;
      if (gi > 0) {
        const gm = (tt as TarimTablosu).gubreMal;
        h.girdiPot[gm] = (h.girdiPot[gm] as number) + carpBol(gi, pot, PPM);
      }
    }
  }
  if (sn !== null) h.haneElektrik = carpBol(b.nufus, sn.haneElektrik, 1000);

  for (const [m, q] of tb.nufusTuketim) h.nufusTuketim[m] = carpBol(b.nufus, q, 1000);
  const ik = ikmalTalebi(d, ctx, r);
  for (let m = 0; m < nm; m++) h.ikmal[m] = ik[m] ?? 0;
  for (const e of b.ticaretEmirleri) {
    if (e.yon === "ihracat") h.ihracat[e.mal] = (h.ihracat[e.mal] as number) + e.gerceklesenSaat;
    else h.ithalat[e.mal] = (h.ithalat[e.mal] as number) + e.gerceklesenSaat;
  }

  // Yerel pazar (G7-2): düğümün dükkân satış isteği (katman 4a girdisi; talebe girer: lojistik stoğu düğüme çeker). Dükkân yokken `h.dukkan` hep 0.
  const dukkanIstek = yerel?.istek.get(r);
  if (dukkanIstek !== undefined) for (let m = 0; m < nm; m++) h.dukkan[m] = dukkanIstek[m] as number;
  for (let m = 0; m < nm; m++) {
    h.talep[m] = (h.nufusTuketim[m] as number) + (h.ikmal[m] as number) + (h.girdiPot[m] as number) + (h.bakim[m] as number) + (h.dukkan[m] as number) + (h.ihracat[m] as number);
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
 * Sanayi (B2): `verimOn` (girdi/işgücü sınırlı verim) üzerine elektrik dağıtımını uygular ve `verimPpm`'i yazar.
 * Santraller yüklerine, elektrik girdili tüketici tesisler karşılanma oranına göre ölçeklenir. Sanayi kapalıysa
 * `verimPpm = verimOn` (özgün davranış).
 */
function elektrikUygula(sn: SanayiTablosu | null, h: BolgeHesabi, tesisSayisi: number, sebeke: DerlenmisSebeke | null): boolean {
  if (sn === null) {
    for (let i = 0; i < tesisSayisi; i++) h.verimPpm[i] = h.verimOn[i] as number;
    return false;
  }
  let kapasite = 0;
  let talepTesis = 0;
  for (let i = 0; i < tesisSayisi; i++) {
    const v = h.verimOn[i] as number;
    if (v <= 0) continue;
    const kap = h.elektrikKap[i] as number;
    if (kap > 0) kapasite += carpBol(kap, v, PPM);
    const eg = h.elektrikGirdi[i] as number;
    if (eg > 0) talepTesis += carpBol(eg, v, PPM);
  }
  let e = elektrikDagit(kapasite, talepTesis, h.haneElektrik, sn.p.iletimKaybiPpm, sn.p.haneOnceligi); // 1. kendi santral
  h.sebekeMili = 0;
  if (sebeke !== null) {
    // 2. Mülk kipi şebekesi (G6, §5.2.2): kendi santralden karşılanamayan açık şebekeden teslim edilir (iletim kaybı yok; kapasite sınırı yok). Santral yükü e'den kalır.
    const toplam = talepTesis + h.haneElektrik;
    const arz = carpBol(kapasite, PPM - sn.p.iletimKaybiPpm, PPM); // elektrikDagit içindeki arz ile AYNI ifade
    const acik = toplam > arz ? toplam - arz : 0;
    if (acik > 0) {
      h.sebekeMili = acik;
      e = { ...e, tesisKarsilanmaPpm: PPM, haneKarsilanmaPpm: PPM };
    }
  }
  h.elektrik = e;
  let degisti = false;
  for (let i = 0; i < tesisSayisi; i++) {
    const v = h.verimOn[i] as number;
    let yeni = v;
    if (v > 0) {
      if ((h.elektrikKap[i] as number) > 0) yeni = carpBol(v, e.yukPpm, PPM);
      else if ((h.elektrikGirdi[i] as number) > 0) yeni = carpBol(v, e.tesisKarsilanmaPpm, PPM);
    }
    if (yeni !== h.verimPpm[i]) {
      h.verimPpm[i] = yeni;
      degisti = true;
    }
  }
  return degisti;
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

  // Sanayi (B2): elektrik dengesi verimleri etkiler (brownout); kapalıysa null ve verim özgün davranıştadır.
  const sn = sanayiTablosu(ctx.ic);
  // Mülk kipi şebekesi (G6): elektrik açığı şebekeden (anlık denge) ve stoksuz mallar (yakıt) tüketim anında; blok yoksa/bölge kipinde null.
  const sebeke = sn === null ? null : sebekeElektrikYolu(ctx, b);
  const stoksuz = sebekeStoksuzTablo(ctx, b);

  // Başlangıç: verim = potansiyel (sanayi açıksa elektrik dağıtımıyla ölçeklenmiş).
  for (let i = 0; i < tesisSayisi; i++) h.verimOn[i] = h.potansiyelPpm[i] as number;
  elektrikUygula(sn, h, tesisSayisi, sebeke);

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
      const d4a = h.dukkan[m] as number; // G7-2 katman 4a: yerel (dükkân) satış isteği; dükkân yokken 0
      const d4 = h.ihracat[m] as number;
      let a = (h.ciktiGercek[m] as number) + (h.ithalat[m] as number) + s.gelenOran - (giden[m] as number);
      if (a < 0) a = 0;
      // Stok, açığı en az STOK_UFKU_SAAT saat karşılayabiliyorsa tüm katmanlar %100 (stok "sınırsız" sayılır).
      // Aksi halde stok bu ufka yayılarak (saatte stok/ufuk) kullanılabilir akışa eklenir ve toplam katmanlara
      // öncelik sırasıyla paylaştırılır; böylece rejim geçişi sürekli (titreşimsiz) ve stok tam tükenir.
      const acik = d1 + d2 + d3 + d4a + d4 - a;
      const stok = h.stok[m] as number;
      if (acik <= 0 || stok >= acik * STOK_UFKU_SAAT) {
        h.fr1[m] = PPM;
        h.fr2[m] = PPM;
        h.fr3[m] = PPM;
        h.frD[m] = PPM;
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
      const p4a = a < d4a ? a : d4a;
      a -= p4a;
      const p4 = a < d4 ? a : d4;
      h.fr1[m] = oranPpm(p1, d1);
      h.fr2[m] = oranPpm(p2, d2);
      h.fr3[m] = oranPpm(p3, d3);
      h.frD[m] = oranPpm(p4a, d4a);
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
        if (stoksuz !== null && (stoksuz[m] as number) >= 0) continue; // şebekeli mal verimi kısmaz (Y-b)
        const f = h.fr3[m] as number;
        if (f < v) v = f;
      }
      h.verimOn[i] = v;
    }
    if (sn === null) {
      for (let i = 0; i < tesisSayisi; i++) {
        const v = h.verimOn[i] as number;
        if ((h.potansiyelPpm[i] as number) > 0 && v !== h.verimPpm[i]) {
          h.verimPpm[i] = v;
          degisti = true;
        }
      }
    } else {
      // Elektrik: girdi yeterliliğinden sonra brownout/yük uygulanır; verim değişirse tur tekrarlanır.
      if (elektrikUygula(sn, h, tesisSayisi, sebeke)) degisti = true;
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
  // İhracat 0 ise gerçek ihracat 0 (carpBol(0, x, PPM) = 0): çağrı atlanır.
  for (let m = 0; m < nm; m++) h.ihracatGercek[m] = (h.ihracat[m] as number) === 0 ? 0 : carpBol(h.ihracat[m] as number, h.fr4[m] as number, PPM);
  // Gerçekleşen yerel (dükkân) satışı (G7-2): stoktan çıkan oran (bolgeOranlariUygula) ve gelirin girdisi; dükkân yokken 0.
  for (let m = 0; m < nm; m++) h.dukkanGercek[m] = (h.dukkan[m] as number) === 0 ? 0 : carpBol(h.dukkan[m] as number, h.frD[m] as number, PPM);
  // Şebeke stoksuz tüketim (Y-c; G6 §5.2.2b): her şebekeli mal için GERÇEK tüketim = Σ_tesis Σ_(girdi) carpBol(carpBol(q, ölçek, PPM), verim, PPM) (stoktan düşmez; bedel buradan).
  if (stoksuz !== null) {
    for (let i = 0; i < tesisSayisi; i++) {
      const v = h.verimPpm[i] as number;
      if (v <= 0) continue;
      const y = tb.yontem[(b.tesisler[i] as BolgeDurumu["tesisler"][number]).yontem] as IcerikTablosu["yontem"][number];
      const olcek = h.olcekPpm[i] as number;
      for (const [m, q] of y.girdi) {
        if ((stoksuz[m] as number) < 0) continue;
        const qo = olcek === PPM ? q : carpBol(q, olcek, PPM);
        h.sebekeStoksuz[m] = (h.sebekeStoksuz[m] as number) + carpBol(qo, v, PPM);
      }
    }
  }
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
  // Sanayi (B2): uykuda elektrik talebi/arzı yok, kıtlık yok; kirlilik ve keşif hakları donar.
  if (b.elektrik !== undefined) {
    b.elektrik = { uretimMili: 0, talepMili: 0, karsilanmaPpm: PPM, haneKarsilanmaPpm: PPM, yukPpm: 0 };
    b.bakimKarsilanmaPpm = PPM;
  }
  // Pazar v1 (B3): uykuda kıtlık yok (kademe donar), temel ihtiyaç tam karşılanır.
  if (b.temelKarsilanmaPpm !== undefined) b.temelKarsilanmaPpm = PPM;
  for (let m = 0; m < b.stoklar.length; m++) {
    b.uretimOrani[m] = 0;
    stokOranAyarla(d, ctx, h.indeks, m, 0);
  }
}

/** Bölgede aktif bir santral (elektrik üreten tesis) var mı: şebekesiz bölgede hane elektriği kıtlık sayılmaz (B3). */
function santraliVarMi(ctx: Baglam, b: BolgeDurumu): boolean {
  const sn = sanayiTablosu(ctx.ic);
  if (sn === null) return false;
  for (const ts of b.tesisler) if (ts.aktif && (sn.yontemElektrikCikti[ts.yontem] as number) > 0) return true;
  return false;
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
  // Sanayi (B2): elektrik dengesi ve bakım girdisi karşılanma oranı (aşınmayı hızlandırır).
  if (h.elektrik !== null && b.elektrik !== undefined) {
    b.elektrik = {
      uretimMili: h.elektrik.uretim,
      talepMili: h.elektrik.talepTesis + h.elektrik.talepHane,
      karsilanmaPpm: h.elektrik.tesisKarsilanmaPpm,
      haneKarsilanmaPpm: h.elektrik.haneKarsilanmaPpm,
      yukPpm: h.elektrik.yukPpm,
    };
    let bakimOran = PPM;
    for (let m = 0; m < tb.malSayisi; m++) {
      if ((h.bakim[m] as number) > 0) {
        const f = h.fr2[m] as number;
        if (f < bakimOran) bakimOran = f;
      }
    }
    b.bakimKarsilanmaPpm = bakimOran;
    // Mülk kipi şebeke (G6): yalnız alım VARKEN yazılır (nesne her seferinde baştan kurulur; yoksa alan oluşmaz).
    if (h.sebekeMili > 0) b.elektrik.sebekeMili = h.sebekeMili;
  }
  // Şebeke stoksuz tüketimi (mal KİMLİĞİ anahtarlı; yalnız > 0 olanlar; hiç yoksa alan silinir/oluşmaz).
  const sbStoksuz = sebekeStoksuzTablo(ctx, b);
  if (sbStoksuz !== null) {
    let tuketim: Record<string, Mili> | undefined;
    for (const kayit of (ctx.ic.mulk as NonNullable<typeof ctx.ic.mulk>).sebeke!.stoksuz) {
      const x = h.sebekeStoksuz[kayit.mal] as number;
      if (x > 0) (tuketim ??= {})[(ctx.ic.mallar[kayit.mal] as { id: string }).id] = x;
    }
    if (tuketim !== undefined) b.sebekeTuketim = tuketim;
    else delete b.sebekeTuketim;
  }
  b.gidaKarsilanmaPpm = tb.gidaMal >= 0 ? (h.fr1[tb.gidaMal] as number) : PPM;
  // Pazar v1 (B3): temel ihtiyaç karşılanması (kıtlık kademesinin girdisi): min(gıda, yakıt, hane elektriği).
  const pz = pazarTablosu(ctx.ic);
  if (pz !== null && b.kitlikKademesi !== undefined) {
    const yakit = pz.yakitMal >= 0 && (h.nufusTuketim[pz.yakitMal] as number) + (h.ikmal[pz.yakitMal] as number) > 0 ? (h.fr1[pz.yakitMal] as number) : null;
    b.temelKarsilanmaPpm = temelKarsilanmaHesapla(b.gidaKarsilanmaPpm, yakit, santraliVarMi(ctx, b) && h.elektrik !== null ? h.elektrik.haneKarsilanmaPpm : null);
  }
  let ikmalOran = PPM;
  for (let m = 0; m < tb.malSayisi; m++) {
    if ((h.ikmal[m] as number) > 0) {
      const f = h.fr1[m] as number;
      if (f < ikmalOran) ikmalOran = f;
    }
  }
  b.ikmalKarsilanmaPpm = ikmalOran;
  // Yerel pazar (G7-2): dükkân isteği olan malların en düşük karşılanma oranı; yalnız < PPM iken yazılır (aksi halde alan silinir/oluşmaz).
  let yerelOran = PPM;
  for (let m = 0; !MULKSUZ_PAKET && m < tb.malSayisi; m++) {
    if ((h.dukkan[m] as number) > 0) {
      const f = h.frD[m] as number;
      if (f < yerelOran) yerelOran = f;
    }
  }
  if (yerelOran < PPM) b.yerelKarsilanmaPpm = yerelOran;
  else if (!MULKSUZ_PAKET && b.yerelKarsilanmaPpm !== undefined) delete b.yerelKarsilanmaPpm;
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
  const stoksuz = sebekeStoksuzTablo(ctx, b);
  const girdiGercek = sifirlar(nm);
  for (let i = 0; i < b.tesisler.length; i++) {
    const v = h.verimPpm[i] as number;
    if (v <= 0) continue;
    const y = tb.yontem[(b.tesisler[i] as BolgeDurumu["tesisler"][number]).yontem] as IcerikTablosu["yontem"][number];
    const olcek = h.olcekPpm[i] as number;
    for (const [m, q] of y.girdi) {
      if (stoksuz !== null && (stoksuz[m] as number) >= 0) continue; // şebekeli mal stoktan düşmez (Y-d)
      const qo = olcek === PPM ? q : carpBol(q, olcek, PPM);
      girdiGercek[m] = (girdiGercek[m] as number) + carpBol(qo, v, PPM);
    }
    // Tarım (B1): gerçek gübre tüketimi = doz x tüketim x verim x karşılanma.
    const gi = h.gubreIstek[i] as number;
    if (gi > 0) {
      const gm = (tt as TarimTablosu).gubreMal;
      girdiGercek[gm] = (girdiGercek[gm] as number) + carpBol(carpBol(gi, v, PPM), h.gubreKarsilanma, PPM);
    }
  }
  for (let m = 0; m < nm; m++) {
    const cikti = h.ciktiGercek[m] as number;
    // Hareketsiz mal (hiçbir girdi/çıktı/tüketim/stok/akış yok): yerel oran 0 (tüm terimler 0; carpBol(0, ...) = 0); hesap atlanır, sonuç aynı.
    const hareketsiz =
      cikti === 0 && girdiGercek[m] === 0 && h.nufusTuketim[m] === 0 && h.ikmal[m] === 0 && h.bakim[m] === 0 && h.ihracatGercek[m] === 0 && h.dukkanGercek[m] === 0 && h.ithalat[m] === 0 && giden[m] === 0 && h.stok[m] === 0;
    let yerel = 0;
    if (!hareketsiz) {
      const tuketim = carpBol(h.nufusTuketim[m] as number, h.fr1[m] as number, PPM) + carpBol(h.ikmal[m] as number, h.fr1[m] as number, PPM);
      const bakim = carpBol(h.bakim[m] as number, h.fr2[m] as number, PPM);
      const bozulmaPpmGun = (ctx.ic.mallar[m] as { bozulmaPpmGun: number }).bozulmaPpmGun;
      const bozulma = bozulmaPpmGun > 0 ? carpBol(h.stok[m] as number, bozulmaPpmGun, 24 * PPM) : 0;
      yerel = cikti - (girdiGercek[m] as number) - tuketim - bakim - (h.ihracatGercek[m] as number) - (h.dukkanGercek[m] as number) + (h.ithalat[m] as number) - (giden[m] as number) - bozulma;
    }
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

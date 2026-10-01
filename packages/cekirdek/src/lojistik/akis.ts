/**
 * Lojistik akış çözümü (çözümün 2. ve 3. adımları) ve gecikmeli teslim planlaması.
 *
 * Oyuncular kimlik sırasıyla çözülür; kenar kalan kapasitesi TÜM oyuncular arasında ortaktır (kenar fiziksel).
 * Her oyuncu için iki geçiş vardır:
 *  (i)  ASKERİ geçiş: hedef = ordu ikmali (+ "askeri" kategorili malın talebi) içindeki karşılanmayan kısım;
 *       kenarın tüm kalan kapasitesini kullanabilir.
 *  (ii) SİVİL geçiş: mallar lojistikSirasi ile, kalan açık/fazla; bir kenarda en fazla
 *       kapasite × (PPM − askeriRezervPpm) / PPM kadar sivil akış taşınır.
 * Aynı bölgenin kaynağı iki geçişte ortaktır. Maliyet = taşıma süresi (ms).
 * Oyuncu ağı kompakttır: yalnızca sahip olunan bölgeler ve kullanılabilir kenarların uç düğümleri.
 *
 * Mülk kipi (S3, docs/11 §3.5 (b)): MCF yalnız harita (merkez) bölgeleri arasında çözülür. Oyuncunun işletme düğümleri
 * merkezlerine sıfır süreli örtük kenarla bağlıdır: önce aynı merkezdeki işletmeler arasında İL İÇİ HAVUZ (yolsuz, süresiz
 * akış) kurulur, kalan fazla/açık merkez başına toplanıp merkezler arası MCF'ye verilir, MCF yolları merkezin işletmelerine
 * artan indeks sırasıyla paylaştırılır. Her kenar kamudur. Bölge kipinde her düğümün tek üyesi vardır ve sonuç değişmez.
 *
 * MCF sonuç önbelleği `ic`'den bağımsızdır: anahtar, ağ imzasına (düğüm ve kenar listeleri) ek olarak dünyanın kenar
 * yapısının (uçlar ve süreler) imzasını içerir; böylece büyüyen düğüm kümesi ya da farklı haritalar aynı önbelleği güvenle
 * paylaşır.
 */
import { kenarKullanilabilirMi } from "../politika";
import { ppmUygula } from "../sabit";
import type { Akis, Baglam, Dunya, Mili, OyuncuDurumu, OyuncuId } from "../tipler";
import { BOS_DUGUMLER, oyuncuDugumleri } from "../dugum";
import { minMaliyetAkis } from "./mcf";
import type { GrafKenari } from "./graf";

/** Bir oyuncunun kompakt lojistik ağı. */
export interface OyuncuAgi {
  oyuncu: OyuncuId;
  /** Sahip olunan bölgeler (gerçek indeks, artan). */
  bolgeler: number[];
  /** kompakt indeks -> gerçek bölge indeksi (artan). */
  dugumler: number[];
  /** gerçek bölge indeksi -> kompakt indeks (yoksa -1). */
  dugumIndeks: number[];
  /** Kullanılabilir kenarlar (gerçek indeks, artan). */
  kenarlar: number[];
  /** Ağ yapısı imzası (önbellek anahtarı için). */
  imza: string;
  /**
   * Mülk kipi: MCF düğümü (merkez) -> oyuncunun o merkeze bağlı işletme düğümleri (artan). Bölge kipinde TANIMSIZ (her
   * düğümün tek üyesi kendisidir).
   */
  uyeler?: (readonly number[])[];
  /** Mülk kipi: oyuncunun işletmesi olan merkezler (artan). */
  merkezler?: number[];
}

/** MCF sonuç önbelleği kaydı: girdi (karşılaştırma için) ve gerçek indekslere çevrilmiş yollar. */
interface McfKaydi {
  imza: string;
  girdi: number[];
  yollar: { kaynak: number; hedef: number; yol: number[]; miktar: number; sureMs: number }[];
}

const ONBELLEK_TAVANI = 20_000;
/**
 * MCF sonuç önbelleği (modül düzeyi, `ic`'den bağımsız). Sonuç yalnızca girdiye (ağ imzası + kenar yapısı imzası +
 * kapasiteler + kaynak/hedefler) bağlıdır; dünya durumuna girmez, şeffaftır (isabet ya da ıskalama sonucu değiştirmez).
 */
const onbellek: { tablo: Map<number, McfKaydi[]>; boyut: number } = { tablo: new Map(), boyut: 0 };

/** Dünyanın kenar yapısı imzası: kenar sayısı, uçlar ve süreler (kapasite girdidedir). */
function kenarYapisiImzasi(d: Dunya): string {
  let h = 0x811c9dc5;
  for (const k of d.kenarlar) {
    h = Math.imul(h ^ k.a, 0x01000193);
    h = Math.imul(h ^ k.b, 0x01000193);
    h = Math.imul(h ^ (k.sureMs | 0), 0x01000193);
    h = Math.imul(h ^ ((k.sureMs / 4294967296) | 0), 0x01000193);
  }
  return `${d.kenarlar.length}:${(h >>> 0).toString(16)}`;
}

/** Tamsayı dizisi için 32 bit FNV benzeri özet. */
function ozet(dizi: readonly number[], uzunluk: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < uzunluk; i++) {
    const x = dizi[i] as number;
    h = Math.imul(h ^ (x | 0), 0x01000193);
    h = Math.imul(h ^ ((x / 4294967296) | 0), 0x01000193);
  }
  return h | 0;
}

export interface AkisSonucu {
  /** Kanonik sıralı akış listesi. */
  akislar: Akis[];
  /** Oyuncu ağları (d.oyuncular sırasıyla). */
  agler: OyuncuAgi[];
  /** Çözüm sonunda kenar başına kalan kapasite. */
  kalan: number[];
  /** Kenar başına toplam ve askeri kullanım (mili-birim/saat). */
  kullanilan: number[];
  askeriKullanilan: number[];
  /** [bölge][mal] giden ve gelen akış toplamı. */
  giden: Mili[][];
  gelen: Mili[][];
}

function sifirMatris(n: number, m: number): number[][] {
  const a: number[][] = [];
  for (let i = 0; i < n; i++) a.push(new Array<number>(m).fill(0));
  return a;
}

/**
 * Mülk kipi: oyuncunun işletme düğümleri, düğüm kümesi = tüm merkezler (harita bölgeleri), kenarlar = tüm kenarlar (kamu).
 * İşletme düğümünün kompakt indeksi merkezinin indeksidir (örtük sıfır süreli kenar).
 */
function mulkAgiKur(d: Dunya, ctx: Baglam, o: OyuncuDurumu, dugumler: readonly number[] | undefined, ortak: MulkOrtak): OyuncuAgi {
  const nh = ortak.nh;
  const bolgeler: number[] = [];
  const dugumIndeks = ortak.dugumIndeks;
  const uyeler: (readonly number[])[] = new Array<readonly number[]>(nh).fill(BOS_DUGUMLER);
  const merkezler: number[] = [];
  const liste = dugumler ?? oyuncuDugumleri(d).get(o.id) ?? BOS_DUGUMLER;
  for (const r of liste) {
    const b = d.bolgeler[r] as { sahip: OyuncuId | null; merkez?: number };
    if (b.sahip !== o.id || b.merkez === undefined) continue;
    bolgeler.push(r);
    let u = uyeler[b.merkez] as number[];
    if (u === BOS_DUGUMLER) {
      u = [];
      uyeler[b.merkez] = u;
      merkezler.push(b.merkez);
    }
    u.push(r);
  }
  merkezler.sort((x, y) => x - y);
  return { oyuncu: o.id, bolgeler, dugumler: ortak.merkezDugumleri, dugumIndeks, kenarlar: bolgeler.length > 0 ? ortak.kenarlar : [], imza: ortak.imza, uyeler, merkezler };
}

/**
 * Mülk kipinde tüm oyuncuların ortak (salt okunur) ağ parçaları: merkez düğümleri, düğüm -> merkez eşlemesi, tüm kenarlar.
 * Bir çözüm boyunca bir kez kurulur (oyuncu başına O(düğüm) kurulum yerine).
 */
interface MulkOrtak {
  nh: number;
  merkezDugumleri: number[];
  dugumIndeks: number[];
  kenarlar: number[];
  imza: string;
}

function mulkOrtakKur(d: Dunya, ctx: Baglam): MulkOrtak {
  const n = d.bolgeler.length;
  const nh = ctx.ic.harita.bolgeler.length;
  const dugumIndeks = new Array<number>(n).fill(-1);
  const merkezDugumleri: number[] = [];
  for (let c = 0; c < nh; c++) {
    merkezDugumleri.push(c);
    dugumIndeks[c] = c;
  }
  for (let r = nh; r < n; r++) {
    const mz = (d.bolgeler[r] as { merkez?: number }).merkez;
    if (mz !== undefined) dugumIndeks[r] = mz;
  }
  const kenarlar: number[] = [];
  for (let e = 0; e < d.kenarlar.length; e++) kenarlar.push(e);
  return { nh, merkezDugumleri, dugumIndeks, kenarlar, imza: `m${nh}/${d.kenarlar.length}` };
}

/**
 * Oyuncunun kompakt ağını kurar (mülk kipinde merkez ağı: `mulkAgiKur`). `sahipDugumleri`: oyuncunun düğümleri (artan; verilmezse
 * taranır), `ortak`: mülk kipinin çözüm başına ortak parçaları.
 */
export function oyuncuAgiKur(d: Dunya, ctx: Baglam, o: OyuncuDurumu, sahipDugumleri?: readonly number[], ortak?: MulkOrtak): OyuncuAgi {
  if (d.mulk !== undefined) return mulkAgiKur(d, ctx, o, sahipDugumleri, ortak ?? mulkOrtakKur(d, ctx));
  const n = d.bolgeler.length;
  const dahil = new Array<boolean>(n).fill(false);
  const bolgeler: number[] = [];
  for (let r = 0; r < n; r++) {
    if ((d.bolgeler[r] as { sahip: OyuncuId | null }).sahip === o.id) {
      bolgeler.push(r);
      dahil[r] = true;
    }
  }
  const kenarlar: number[] = [];
  if (bolgeler.length > 0) {
    for (let e = 0; e < d.kenarlar.length; e++) {
      const k = d.kenarlar[e]!;
      // En az bir ucu oyuncunun olmayan kenar ortak altyapıda bile kullanılamaz; ucuz ön eleme.
      if (!dahil[k.a] && !dahil[k.b]) continue;
      if (kenarKullanilabilirMi(d, ctx, o.id, e)) kenarlar.push(e);
    }
    for (const e of kenarlar) {
      const k = d.kenarlar[e]!;
      dahil[k.a] = true;
      dahil[k.b] = true;
    }
  }
  const dugumler: number[] = [];
  const dugumIndeks = new Array<number>(n).fill(-1);
  for (let r = 0; r < n; r++) {
    if (dahil[r]) {
      dugumIndeks[r] = dugumler.length;
      dugumler.push(r);
    }
  }
  return { oyuncu: o.id, bolgeler, dugumler, dugumIndeks, kenarlar, imza: dugumler.join(",") + "/" + kenarlar.join(",") };
}

/** Ölü bant: değişim büyük akışın 1/10'undan (ve OLU_BANT_TABAN'dan) küçükse akış değiştirilmez. */
const OLU_BANT_BOLEN = 10;
/** Bundan küçük (mili-birim/saat) kaynak, hedef ve akışlar yok sayılır (gürültü akışları yeni çözüm üretmesin). */
export const EN_AZ_AKIS = 1024;
/** Ölü bant tabanı: bundan küçük (mili-birim/saat) değişimler her zaman yok sayılır. */
const OLU_BANT_TABAN = 512;

/** Akışı aşağı yuvarlanan basamağa oturtur: basamak = f/64'ten büyük olmayan en büyük 2 kuvveti (f < 128 ise 1). */
export function akisNicele(f: number): number {
  if (f < 64) return f;
  let basamak: number;
  if (f < 2_147_483_648) {
    basamak = 1 << (26 - Math.clz32(f));
  } else {
    basamak = 1;
    while (basamak * 128 <= f) basamak *= 2;
  }
  return f - (f % basamak);
}

function akisKarsilastir(a: Akis, b: Akis): number {
  if (a.sahip !== b.sahip) return a.sahip < b.sahip ? -1 : 1;
  if (a.mal !== b.mal) return a.mal - b.mal;
  if (a.kaynak !== b.kaynak) return a.kaynak - b.kaynak;
  if (a.hedef !== b.hedef) return a.hedef - b.hedef;
  const n = a.yol.length < b.yol.length ? a.yol.length : b.yol.length;
  for (let i = 0; i < n; i++) {
    if (a.yol[i] !== b.yol[i]) return (a.yol[i] as number) - (b.yol[i] as number);
  }
  return a.yol.length - b.yol.length;
}

/**
 * Tüm oyuncular için akışları çözer.
 * `fazla[r][m]`: >0 kaynak, <0 hedef (mili-birim/saat). `askeriTalep[r][m]`: hedefin askeri kısmı üst sınırı.
 * `eski`: önceki çözümün (kanonik sıralı) akışları; ölü bant için kullanılır.
 */
export function akisCoz(
  d: Dunya,
  ctx: Baglam,
  fazla: readonly (readonly Mili[])[],
  askeriTalep: readonly (readonly Mili[])[],
  eski: readonly Akis[] = [],
  sahipli?: ReadonlyMap<OyuncuId, readonly number[]>,
): AkisSonucu {
  const ic = ctx.ic;
  const n = d.bolgeler.length;
  const nm = ic.mallar.length;
  const ne = d.kenarlar.length;
  const kalan = d.kenarlar.map((k) => k.kapasiteSaat);
  const sivilKul = new Array<number>(ne).fill(0);
  const askeriKul = new Array<number>(ne).fill(0);
  const giden = sifirMatris(n, nm);
  const gelen = sifirMatris(n, nm);
  const tumAkislar: Akis[] = [];
  const agler: OyuncuAgi[] = [];
  const grafImza = kenarYapisiImzasi(d);
  const ortak = d.mulk !== undefined ? mulkOrtakKur(d, ctx) : undefined;
  // Oyuncu başına kaynak kalanı ve hedef isteği (düz dizi, r * nm + mal; her oyuncuda sıfırlanır).
  const kaynakKalan = new Float64Array(n * nm);
  const hedefKalan = new Float64Array(n * nm);
  const girdi: number[] = [];

  for (const o of d.oyuncular) {
    const ag = oyuncuAgiKur(d, ctx, o, sahipli?.get(o.id) ?? (sahipli ? BOS_DUGUMLER : undefined), ortak);
    agler.push(ag);
    const uyeler = ag.uyeler;
    if (ag.bolgeler.length === 0 || (uyeler === undefined && ag.kenarlar.length === 0)) continue;
    const agImza = `${ag.imza}|${grafImza}`;

    // Yalnız oyuncunun düğüm satırları yazılır ve okunur (düğümün tek sahibi vardır); tüm diziyi sıfırlamak yerine bu
    // satırlar baştan kurulur (mülk kipinde düğüm sayısı oyuncuyla büyür).
    let kaynakVar = false;
    let hedefVar = false;
    for (const r of ag.bolgeler) {
      const satir = fazla[r] as readonly Mili[];
      for (let m = 0; m < nm; m++) {
        const f = satir[m] as number;
        kaynakKalan[r * nm + m] = f > 0 ? f : 0;
        hedefKalan[r * nm + m] = f < 0 ? -f : 0;
        if (f > 0) kaynakVar = true;
        else if (f < 0) hedefVar = true;
      }
    }
    if (!kaynakVar || !hedefVar) continue;

    const sivilTavan = ag.kenarlar.map((e) => {
      const kap = (d.kenarlar[e] as { kapasiteSaat: number }).kapasiteSaat;
      return kap - ppmUygula(kap, o.askeriRezervPpm);
    });
    const kaynaklar: { dugum: number; miktar: number }[] = [];
    const hedefler: { dugum: number; miktar: number }[] = [];
    const kapDizi: number[] = new Array<number>(ag.kenarlar.length).fill(0);
    const oyuncuAkislari: Akis[] = [];

    /** Hedef düğümün bu geçişteki açığı (askeri geçişte askeri talep tavanıyla). */
    const hedefIstek = (r: number, mal: number, askeri: boolean): number => {
      let hm = hedefKalan[r * nm + mal] as number;
      if (askeri) {
        const at = (askeriTalep[r] as readonly Mili[])[mal] as number;
        if (at < hm) hm = at;
      }
      return hm;
    };
    /**
     * Akış kaydı ve kaynak/hedef kalanı, giden/gelen güncellemesi (kenar kapasitesi çağıranda). `yol` KOPYALANIR: önbellek
     * kaydının yol dizisi birden çok akışa (aynı girdili iki mal, mülk kipinde bir yolu paylaşan işletmeler) ve önbelleğe
     * ortak olamaz; dünyada paylaşılan referans serileştirmede reddedilir (docs/06 §14).
     */
    const akisEkle = (mal: number, kaynak: number, hedef: number, yol: readonly number[], sureMs: number, miktar: number): void => {
      oyuncuAkislari.push({ sahip: o.id, mal, kaynak, hedef, yol: [...yol], oranSaat: miktar, sureMs });
      kaynakKalan[kaynak * nm + mal] = (kaynakKalan[kaynak * nm + mal] as number) - miktar;
      hedefKalan[hedef * nm + mal] = (hedefKalan[hedef * nm + mal] as number) - miktar;
      (giden[kaynak] as number[])[mal] = ((giden[kaynak] as number[])[mal] as number) + miktar;
      (gelen[hedef] as number[])[mal] = ((gelen[hedef] as number[])[mal] as number) + miktar;
    };
    /** Mülk kipi: aynı merkezdeki işletmeler arasında il içi havuz (yolsuz, süresiz; nicelenmiş). */
    const havuzla = (uy: readonly (readonly number[])[], merkezler: readonly number[], mal: number, askeri: boolean): void => {
      for (const c of merkezler) {
        const grup = uy[c] as readonly number[];
        if (grup.length < 2) continue;
        for (const rk of grup) {
          for (const rh of grup) {
            if (rh === rk) continue;
            const ak = kaynakKalan[rk * nm + mal] as number;
            if (ak < EN_AZ_AKIS) break;
            const ah = hedefIstek(rh, mal, askeri);
            const q = akisNicele(ak < ah ? ak : ah);
            if (q >= EN_AZ_AKIS) akisEkle(mal, rk, rh, [], 0, q);
          }
        }
      }
    };

    const adim = (mal: number, askeri: boolean): void => {
      kaynaklar.length = 0;
      hedefler.length = 0;
      if (uyeler === undefined) {
        for (const r of ag.bolgeler) {
          // Girdiler de nicelenir (aşağı): sürekli küçük kaymalar aynı MCF girdisini, dolayısıyla önbellek isabetini korur.
          const ks = akisNicele(kaynakKalan[r * nm + mal] as number);
          if (ks >= EN_AZ_AKIS) kaynaklar.push({ dugum: ag.dugumIndeks[r] as number, miktar: ks });
          const hm = akisNicele(hedefIstek(r, mal, askeri));
          if (hm >= EN_AZ_AKIS) hedefler.push({ dugum: ag.dugumIndeks[r] as number, miktar: hm });
        }
      } else {
        const merkezler = ag.merkezler as number[];
        havuzla(uyeler, merkezler, mal, askeri);
        // Merkez başına toplanmış kalan fazla ve açık (merkez sırasıyla).
        for (const c of merkezler) {
          const grup = uyeler[c] as readonly number[];
          let tk = 0;
          let th = 0;
          for (const r of grup) {
            const k = kaynakKalan[r * nm + mal] as number;
            if (k > 0) tk += k;
            const h = hedefIstek(r, mal, askeri);
            if (h > 0) th += h;
          }
          const ks = akisNicele(tk);
          if (ks >= EN_AZ_AKIS) kaynaklar.push({ dugum: c, miktar: ks });
          const hm = akisNicele(th);
          if (hm >= EN_AZ_AKIS) hedefler.push({ dugum: c, miktar: hm });
        }
      }
      if (kaynaklar.length === 0 || hedefler.length === 0) return;

      // Etkin (nicelenmiş) kenar kapasiteleri
      let kapVar = false;
      for (let i = 0; i < ag.kenarlar.length; i++) {
        const e = ag.kenarlar[i] as number;
        let kap = kalan[e] as number;
        if (!askeri) {
          const sv = (sivilTavan[i] as number) - (sivilKul[e] as number);
          if (sv < kap) kap = sv;
        }
        kap = kap > 0 ? akisNicele(kap) : 0;
        if (kap > 0) kapVar = true;
        kapDizi[i] = kap;
      }
      if (!kapVar) return;

      // MCF saf bir fonksiyondur: aynı girdi (ağ, kapasiteler, kaynak/hedefler) aynı sonucu verir; önbellek şeffaftır.
      let gn = 0;
      for (let i = 0; i < kapDizi.length; i++) girdi[gn++] = kapDizi[i] as number;
      girdi[gn++] = -1;
      for (const x of kaynaklar) {
        girdi[gn++] = x.dugum;
        girdi[gn++] = x.miktar;
      }
      girdi[gn++] = -1;
      for (const x of hedefler) {
        girdi[gn++] = x.dugum;
        girdi[gn++] = x.miktar;
      }
      const h = ozet(girdi, gn);
      let kova = onbellek.tablo.get(h);
      let kayit: McfKaydi | undefined;
      if (kova) {
        for (const k of kova) {
          if (k.imza !== agImza || k.girdi.length !== gn) continue;
          let esit = true;
          for (let i = 0; i < gn; i++) {
            if (k.girdi[i] !== girdi[i]) {
              esit = false;
              break;
            }
          }
          if (esit) {
            kayit = k;
            break;
          }
        }
      }
      if (!kayit) {
        const gk: GrafKenari[] = [];
        const gr: number[] = [];
        for (let i = 0; i < ag.kenarlar.length; i++) {
          const kap = kapDizi[i] as number;
          if (kap <= 0) continue;
          const e = ag.kenarlar[i] as number;
          const k = d.kenarlar[e]!;
          gk.push({ u: ag.dugumIndeks[k.a] as number, v: ag.dugumIndeks[k.b] as number, kapasite: kap, maliyet: k.sureMs });
          gr.push(e);
        }
        const sonuc = minMaliyetAkis(ag.dugumler.length, gk, kaynaklar, hedefler);
        kayit = { imza: agImza, girdi: girdi.slice(0, gn), yollar: [] };
        for (const y of sonuc.yollar) {
          if (y.kenarlar.length === 0 || y.miktar <= 0) continue;
          const yol = y.kenarlar.map((i) => gr[i] as number);
          let sure = 0;
          for (const e of yol) sure += (d.kenarlar[e] as { sureMs: number }).sureMs;
          kayit.yollar.push({ kaynak: ag.dugumler[y.kaynak] as number, hedef: ag.dugumler[y.hedef] as number, yol, miktar: y.miktar, sureMs: sure });
        }
        if (onbellek.boyut >= ONBELLEK_TAVANI) {
          onbellek.tablo.clear();
          onbellek.boyut = 0;
          kova = undefined;
        }
        if (!kova) {
          kova = [];
          onbellek.tablo.set(h, kova);
        }
        kova.push(kayit);
        onbellek.boyut++;
      }

      // Yollar aşağı yuvarlanan ~%1,5'lik basamaklara oturtulur: küçük sürekli değişimler yeni akış farkı
      // (oran_delta) ve dolayısıyla yeni çözüm üretmesin.
      for (const y of kayit.yollar) {
        let miktar = akisNicele(y.miktar);
        if (miktar <= 0) continue;
        if (uyeler === undefined) {
          akisEkle(mal, y.kaynak, y.hedef, y.yol, y.sureMs, miktar);
        } else {
          // Mülk kipi: merkezler arası yol, kaynak merkezin ve hedef merkezin işletmelerine artan indeksle paylaştırılır.
          const ku = uyeler[y.kaynak] as readonly number[];
          const hu = uyeler[y.hedef] as readonly number[];
          let kalanQ = miktar;
          let i = 0;
          let j = 0;
          while (kalanQ > 0 && i < ku.length && j < hu.length) {
            const rk = ku[i] as number;
            const rh = hu[j] as number;
            const ak = kaynakKalan[rk * nm + mal] as number;
            if (ak <= 0) {
              i++;
              continue;
            }
            const ah = hedefIstek(rh, mal, askeri);
            if (ah <= 0) {
              j++;
              continue;
            }
            const q = kalanQ < ak ? (kalanQ < ah ? kalanQ : ah) : ak < ah ? ak : ah;
            akisEkle(mal, rk, rh, y.yol, y.sureMs, q);
            kalanQ -= q;
          }
          miktar -= kalanQ;
          if (miktar <= 0) continue;
        }
        for (const e of y.yol) {
          kalan[e] = (kalan[e] as number) - miktar;
          if (askeri) askeriKul[e] = (askeriKul[e] as number) + miktar;
          else sivilKul[e] = (sivilKul[e] as number) + miktar;
        }
      }
    };

    // (i) askeri geçiş: yalnızca askeri talebi olan mallar (lojistik sırasıyla)
    for (const mal of ic.lojistikSirasi) {
      let askeriVar = false;
      for (const r of ag.bolgeler) if (((askeriTalep[r] as readonly Mili[])[mal] as number) > 0) askeriVar = true;
      if (askeriVar) adim(mal, true);
    }
    // (ii) sivil geçiş
    for (const mal of ic.lojistikSirasi) adim(mal, false);

    for (const a of oyuncuAkislari) tumAkislar.push(a);
  }

  // Kanonik sıra; aynı anahtarlı (askeri + sivil geçişten) akışlar birleştirilir.
  tumAkislar.sort(akisKarsilastir);
  const birlesik: Akis[] = [];
  for (const a of tumAkislar) {
    const son = birlesik[birlesik.length - 1];
    if (son && akisKarsilastir(son, a) === 0) son.oranSaat += a.oranSaat;
    else birlesik.push({ ...a });
  }
  // Ölü bant (histerezis): mevcut bir akışın yeni değeri eskisinin ~%10'u içindeyse eski değer korunur.
  // Stoktaki sürekli küçük kaymalar yeni oran_delta ve dolayısıyla yeni çözüm üretmesin diye. Eski değer
  // daha büyükse yalnızca yoldaki tüm kenarların kalan kapasitesi ve sahibin sivil tavanı fazlayı kaldırıyorsa
  // korunur (kapasite ve askeri rezerv asla aşılmaz).
  if (eski.length > 0) {
    const rezerv = new Map<OyuncuId, number>();
    for (const o of d.oyuncular) rezerv.set(o.id, o.askeriRezervPpm);
    let j = 0;
    for (const a of birlesik) {
      while (j < eski.length && akisKarsilastir(eski[j] as Akis, a) < 0) j++;
      const e = eski[j];
      if (!e || akisKarsilastir(e, a) !== 0 || e.oranSaat === a.oranSaat) continue;
      const fark = e.oranSaat - a.oranSaat; // >0: eski daha büyük
      const buyuk = e.oranSaat > a.oranSaat ? e.oranSaat : a.oranSaat;
      const esik = Math.max(OLU_BANT_TABAN, Math.floor(buyuk / OLU_BANT_BOLEN));
      if ((fark < 0 ? -fark : fark) > esik) continue;
      if (fark > 0) {
        const rz = rezerv.get(a.sahip) ?? 0;
        let sigar = true;
        for (const k of a.yol) {
          const kap = (d.kenarlar[k] as { kapasiteSaat: number }).kapasiteSaat;
          const sivilBaslik = kap - ppmUygula(kap, rz) - (sivilKul[k] as number);
          if ((kalan[k] as number) < fark || sivilBaslik < fark) sigar = false;
        }
        if (!sigar) continue;
      }
      for (const k of a.yol) {
        kalan[k] = (kalan[k] as number) - fark;
        sivilKul[k] = Math.max(0, (sivilKul[k] as number) + fark);
      }
      (giden[a.kaynak] as number[])[a.mal] = ((giden[a.kaynak] as number[])[a.mal] as number) + fark;
      (gelen[a.hedef] as number[])[a.mal] = ((gelen[a.hedef] as number[])[a.mal] as number) + fark;
      a.oranSaat = e.oranSaat;
    }
  }
  const kullanilan = sivilKul.map((s, e) => s + (askeriKul[e] as number));
  return { akislar: birlesik, agler, kalan, kullanilan, askeriKullanilan: askeriKul, giden, gelen };
}

/**
 * Gecikme (adım 3): eski ve yeni akışları (sahip, mal, kaynak, hedef, yol) anahtarıyla eşleştirir;
 * her anahtar için delta = yeni − eski ≠ 0 ise hedefte t + sureMs'de oran_delta planlar.
 * Yoldaki mal böylece korunur: hedefin gelen oranı + bekleyen deltalar = güncel akışların toplamı.
 */
export function akisGecikmeleriniPlanla(d: Dunya, ctx: Baglam, eski: readonly Akis[], yeni: readonly Akis[]): void {
  const t = d.zaman;
  // Her iki liste de kanonik sıralıdır: birleşik tek geçiş (anahtar dizgesi gerekmez).
  let i = 0;
  let j = 0;
  while (i < yeni.length || j < eski.length) {
    const a = yeni[i];
    const e = eski[j];
    const c = a === undefined ? 1 : e === undefined ? -1 : akisKarsilastir(a, e);
    if (c === 0 && a && e) {
      const delta = a.oranSaat - e.oranSaat;
      if (delta !== 0) ctx.planla(d, t + a.sureMs, { tur: "oran_delta", bolge: a.hedef, mal: a.mal, delta });
      i++;
      j++;
    } else if (c < 0 && a) {
      ctx.planla(d, t + a.sureMs, { tur: "oran_delta", bolge: a.hedef, mal: a.mal, delta: a.oranSaat });
      i++;
    } else if (e) {
      ctx.planla(d, t + e.sureMs, { tur: "oran_delta", bolge: e.hedef, mal: e.mal, delta: -e.oranSaat });
      j++;
    }
  }
}

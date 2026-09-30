/**
 * Ortak planlayıcı: dünya görünümünden (stoklar, kapsam tablosu, fiyatlar, hazine) aday komutlar üretir.
 *
 * Bot arketipleri ve politika önayarları bu adayları kendi ağırlıklarıyla puanlar ve seçer.
 * Planlayıcı YALNIZCA okur (sim durumunu değiştirmez) ve Math.random kullanmaz.
 *
 * Fayda birimi: "para" (= mili-para / MILI), kabaca "bir haftalık net getiri − maliyet" tahminidir.
 * Amaç mutlak doğruluk değil, adaylar arasında makul bir sıralamadır.
 */
import { GUN, MILI, PPM, SAAT, anlikHazine, anlikMiktar } from "@bolge/cekirdek";
import type { BolgeDurumu, Dunya, Komut, Ms, OyuncuDurumu, OyuncuId, Simulasyon } from "@bolge/cekirdek";
import { icerikBilgisi } from "./tablo";
import type { IcerikBilgisi, MalMiktar, TurBilgisi, YontemBilgisi } from "./tablo";

export type AdayKategori =
  | "insa"
  | "yontem"
  | "ticaret"
  | "kenar"
  | "arastir"
  | "vergi"
  | "rezerv"
  | "birlik"
  | "savunma"
  | "savas";

/** Bir adayın dış kaynak maliyeti: hazine (mili-para) ve bölge stokları. */
export interface AdayMaliyet {
  para: number;
  stok: Array<{ bolge: number; mal: number; miktar: number }>;
}

export interface Aday {
  /** "tür:konu" biçiminde anahtar, ör. "tesis_insa:celikhane". Bölge içermez (bölge ayrı alandır). */
  anahtar: string;
  komut: Komut;
  /** Tahmini fayda (para). Yüksek = daha iyi. */
  tahminiFayda: number;
  kategori: AdayKategori;
  /** Komutun uygulandığı bölge kimliği (varsa). */
  bolge?: string;
  /** Anahtarın konu kısmı (tesis türü, mal, teknoloji vb.). */
  konu: string;
  maliyet?: AdayMaliyet;
  /** Bekleme süresi anahtarı (verilmezse "anahtar|bölge"). Aynı kilidi paylaşan adaylar birlikte beklemeye alınır. */
  kilit?: string;
}

/** Yeni başlayan bir kararda hazinede bırakılacak güvenlik payı (para). */
export const HAZINE_TAMPONU = 1500;

function sinirla(x: number, alt: number, ust: number): number {
  return x < alt ? alt : x > ust ? ust : x;
}

/** Oyuncu odaklı, salt okunur dünya görünümü ve sık kullanılan türetilmiş nicelikler. */
export class Bakis {
  readonly d: Dunya;
  readonly t: Ms;
  readonly tb: IcerikBilgisi;
  readonly o: OyuncuDurumu;
  readonly bolgeler: BolgeDurumu[];
  /** Hazine (mili-para). */
  readonly hazine: number;
  private readonly sahipli = new Set<number>();
  private readonly stokMat = new Map<number, number[]>();
  /** Mal başına sahip olunan bölgelerdeki toplam anlık stok (mili-birim). */
  readonly stokToplam: number[];
  /** Mal başına net oran toplamı: Σ (yerelOran + gelenOran), mili-birim/saat. */
  readonly netOran: number[];
  /** Mal başına brüt üretim oranı toplamı (mili-birim/saat). */
  readonly uretimSaat: number[];
  /** Mal başına ortalama açıklık (1 − karşılanma), [0,1]. */
  readonly aciklik: number[];
  readonly kapasiteToplam: number;
  /** Mal başına sahip olunan bölgelerdeki gerçekleşen net ihracat (ihracat − ithalat), mili-birim/saat. */
  readonly ticaretNeti: number[];

  constructor(readonly sim: Simulasyon, readonly oyuncu: OyuncuId) {
    const d = sim.dunya;
    this.d = d;
    this.t = d.zaman;
    this.tb = icerikBilgisi(sim.ic);
    const o = d.oyuncular.find((x) => x.id === oyuncu);
    if (!o) throw new Error(`Bakis: bilinmeyen oyuncu: ${oyuncu}`);
    this.o = o;
    this.hazine = anlikHazine(d, oyuncu);
    this.bolgeler = d.bolgeler.filter((b) => b.sahip === oyuncu);
    const nm = this.tb.malSayisi;
    this.stokToplam = new Array<number>(nm).fill(0);
    this.netOran = new Array<number>(nm).fill(0);
    this.uretimSaat = new Array<number>(nm).fill(0);
    this.aciklik = new Array<number>(nm).fill(0);
    this.ticaretNeti = new Array<number>(nm).fill(0);
    for (const b of this.bolgeler) {
      this.sahipli.add(b.indeks);
      for (const e of b.ticaretEmirleri) {
        this.ticaretNeti[e.mal] = (this.ticaretNeti[e.mal] as number) + (e.yon === "ihracat" ? e.gerceklesenSaat : -e.gerceklesenSaat);
      }
      const satir = b.stoklar.map((s) => anlikMiktar(s, this.t));
      this.stokMat.set(b.indeks, satir);
      for (let m = 0; m < nm; m++) {
        this.stokToplam[m] = (this.stokToplam[m] as number) + (satir[m] as number);
        const s = b.stoklar[m]!;
        this.netOran[m] = (this.netOran[m] as number) + s.yerelOran + s.gelenOran;
        this.uretimSaat[m] = (this.uretimSaat[m] as number) + (b.uretimOrani[m] as number);
        this.aciklik[m] = (this.aciklik[m] as number) + (1 - this.karsilanma(b.indeks, m));
      }
    }
    const n = this.bolgeler.length;
    for (let m = 0; m < nm; m++) this.aciklik[m] = n > 0 ? (this.aciklik[m] as number) / n : 0;
    this.kapasiteToplam = n * sim.ic.param.ekonomi.depoKapasitesi;
  }

  sahipMi(bolgeIndeks: number): boolean {
    return this.sahipli.has(bolgeIndeks);
  }

  /** Anlık stok (mili-birim); bölge bu oyuncunun değilse 0. */
  stok(bolgeIndeks: number, mal: number): number {
    return this.stokMat.get(bolgeIndeks)?.[mal] ?? 0;
  }

  teknolojiVar(id: string): boolean {
    const ti = this.sim.ic.teknolojiIndeks[id];
    return ti !== undefined && this.o.teknolojiler.includes(ti);
  }

  /** Bölgenin kapsam karşılanma oranı [0,1]; hiç hesaplanmamış hücre (0, "yok") tam sayılır. */
  karsilanma(bolgeIndeks: number, mal: number): number {
    const h = this.d.lojistik.kapsam[bolgeIndeks]?.[mal];
    if (!h) return 1;
    if (h.karsilanmaPpm === 0 && h.neden === "yok" && h.enYakinKaynakMs === -1) return 1;
    return h.karsilanmaPpm / PPM;
  }

  /** Mal stok doluluk oranı (oyuncunun toplam depo kapasitesine göre) [0,1]. */
  stokOrani(mal: number): number {
    return this.kapasiteToplam > 0 ? (this.stokToplam[mal] as number) / this.kapasiteToplam : 0;
  }

  /** Malın sahip olunan bölgelerdeki en dolu deponun doluluğu [0,1] (israf bölge başına depo tavanında başlar). */
  enDoluDoluluk(mal: number): number {
    const kap = this.sim.ic.param.ekonomi.depoKapasitesi;
    if (kap <= 0) return 0;
    let en = 0;
    for (const satir of this.stokMat.values()) {
      const o = (satir[mal] as number) / kap;
      if (o > en) en = o;
    }
    return en;
  }

  /** Malın depo doluluğunun `oran` üstünde kalan toplam stoku (mili-birim), bölgeler üzerinden. */
  fazlaStok(mal: number, oran: number): number {
    const esik = oran * this.sim.ic.param.ekonomi.depoKapasitesi;
    let t = 0;
    for (const satir of this.stokMat.values()) {
      const x = (satir[mal] as number) - esik;
      if (x > 0) t += x;
    }
    return t;
  }

  /** Canlı fiyatın taban fiyata oranı (1 = taban). */
  fiyatOrani(mal: number): number {
    const taban = this.tb.taban[mal] as number;
    return taban > 0 ? this.fiyat(mal) / taban : 1;
  }

  isgucu(b: BolgeDurumu): number {
    return Math.floor((b.nufus * this.sim.ic.param.nufus.isgucuPpm) / PPM);
  }

  /** Aktif tesislerin ve devam eden inşaatların ayırdığı işçi. */
  kullanilanIsci(b: BolgeDurumu): number {
    let t = 0;
    for (const ts of b.tesisler) if (ts.aktif) t += (this.tb.yontem[ts.yontem] as YontemBilgisi).isci;
    for (const i of this.d.insaatlar) {
      if (i.tur === "tesis" && i.bolge === b.indeks) {
        const tur = this.tb.tur[i.hedef] as TurBilgisi;
        t += (this.tb.yontem[tur.yontemler[0] as number] as YontemBilgisi).isci;
      }
    }
    return t;
  }

  bosIsci(b: BolgeDurumu): number {
    const f = this.isgucu(b) - this.kullanilanIsci(b);
    return f > 0 ? f : 0;
  }

  /** Bu türden (bölgede) mevcut + devam eden tesis sayısı. bolge verilmezse tüm bölgeler. */
  tesisSayisi(tur: number, bolge?: number): number {
    let n = 0;
    for (const b of this.bolgeler) {
      if (bolge !== undefined && b.indeks !== bolge) continue;
      for (const ts of b.tesisler) if (ts.tur === tur) n++;
    }
    for (const i of this.d.insaatlar) {
      if (i.tur === "tesis" && i.sahip === this.oyuncu && i.hedef === tur && (bolge === undefined || i.bolge === bolge)) n++;
    }
    return n;
  }

  /** Devam eden (oyuncunun) tesis inşaatı sayısı, türe göre. */
  insaatta(tur: number): number {
    let n = 0;
    for (const i of this.d.insaatlar) if (i.tur === "tesis" && i.sahip === this.oyuncu && i.hedef === tur) n++;
    return n;
  }

  kenarInsaatta(kenar: number): boolean {
    return this.d.insaatlar.some((i) => i.tur === "kenar" && i.hedef === kenar);
  }

  /** Bölge stokları maliyeti karşılıyor mu (mili-birim)? */
  maliyetVar(bolgeIndeks: number, maliyet: MalMiktar, carpan = 1): boolean {
    for (const [m, q] of maliyet) if (this.stok(bolgeIndeks, m) < q * carpan) return false;
    return true;
  }

  /** Malın (saatlik q mili-birim) yeni bir tüketici için bulunabilirliği (0.15..1). */
  arzYeterliligi(mal: number, q: number): number {
    if (q <= 0) return 1;
    const bulunur = Math.max(0, this.netOran[mal] as number) + (this.stokToplam[mal] as number) / 96;
    return sinirla(bulunur / q, 0.15, 1);
  }

  /** Malın bot gözünde ağırlığı: açık mallar değerli, dolu depodaki mal değersiz. */
  malAgirlik(mal: number): number {
    if (this.tb.askeri[mal]) return 1.2;
    const so = this.stokOrani(mal);
    const dolu = so > 0.4 ? 0.1 : so > 0.15 ? 0.3 : 1;
    return (0.6 + 3 * (this.aciklik[mal] as number)) * dolu;
  }

  /** Ticaret etkisi çıkarılmış net oran (mili-birim/saat): ihracat/ithalatı sabit tutmadan kıtlık/fazla göstergesi. */
  ticaretsizNet(mal: number): number {
    return (this.netOran[mal] as number) + (this.ticaretNeti[mal] as number);
  }

  /** Hazine tehlikede mi: düşük veya negatif oranla yakında tükenecek. İthalat durdurulur. */
  hazineTehlikede(): boolean {
    const para = this.hazine / MILI;
    const oran = this.o.hazine.yerelOran / MILI;
    return para < 4000 || (oran < 0 && para < -oran * 72);
  }

  /** Canlı pazar fiyatı (para/birim). */
  fiyat(mal: number): number {
    return (this.d.pazar.fiyat[mal] as number) / MILI;
  }

  limanlar(): BolgeDurumu[] {
    return this.bolgeler.filter((b) => b.etiketler.includes("liman")).sort((x, y) => x.indeks - y.indeks);
  }
}

// ---------------------------------------------------------------------------
// Tesis inşası
// ---------------------------------------------------------------------------

export interface InsaSecenek {
  /** Hangi tesis türleri değerlendirilsin (vars.: askeri olmayanlar). */
  filtre?: (t: TurBilgisi) => boolean;
  /** Mal ağırlığı (vars.: Bakis.malAgirlik). */
  malAgirlik?: (mal: number) => number;
  /** Aynı türden bölge başına en fazla tesis (vars. 2). */
  bolgeSiniri?: number;
  /** Fayda süzgecini kaldırır: uygulanabilir her tesis aday olur (H2 gibi ölçüm amaçlı geniş küme). */
  hepsi?: boolean;
}

function maliyetOlustur(bolge: number, l: MalMiktar, para: number): AdayMaliyet {
  return { para, stok: l.map(([mal, miktar]) => ({ bolge, mal, miktar })) };
}

/** (a) Zincirde açık malı üreten tesisi rezervi/etiketi uygun bölgede inşa et. Tür başına en iyi bölge. */
export function insaAdaylari(b: Bakis, sec: InsaSecenek = {}): Aday[] {
  const cikti: Aday[] = [];
  const sinir = sec.bolgeSiniri ?? 2;
  const w = sec.malAgirlik ?? ((m: number) => b.malAgirlik(m));
  for (const T of b.tb.tur) {
    if (T.gerekliTeknoloji !== undefined && !b.teknolojiVar(T.gerekliTeknoloji)) continue;
    if (sec.filtre ? !sec.filtre(T) : T.askeri) continue;
    if (b.insaatta(T.indeks) >= 1) continue;
    const y0 = b.tb.yontem[T.yontemler[0] as number] as YontemBilgisi;

    let enIyi: BolgeDurumu | null = null;
    let enIyiSkor = 0;
    let enIyiIsci = 1;
    let enIyiRezerv = 1;
    for (const r of b.bolgeler) {
      if (T.gerekliEtiket !== undefined && !r.etiketler.includes(T.gerekliEtiket)) continue;
      let fRez = 1;
      if (T.gerekliRezerv >= 0) {
        const ilk = r.rezervIlk[T.gerekliRezerv] as number;
        const kalan = r.rezervKalan[T.gerekliRezerv] as number;
        if (ilk <= 0 || kalan <= ilk * 0.1) continue;
        fRez = Math.sqrt(kalan / ilk);
      }
      const mevcut = b.tesisSayisi(T.indeks, r.indeks);
      if (mevcut >= sinir) continue;
      if (!b.maliyetVar(r.indeks, T.maliyet)) continue;
      const fIsci = y0.isci > 0 ? Math.min(1, b.bosIsci(r) / y0.isci) : 1;
      if (fIsci < 0.4) continue;
      const skor = fIsci * fRez * (1 - 0.25 * mevcut);
      if (skor > enIyiSkor) {
        enIyiSkor = skor;
        enIyi = r;
        enIyiIsci = fIsci;
        enIyiRezerv = fRez;
      }
    }
    if (!enIyi) continue;

    let fGirdi = 1;
    let girdiDegeri = 0;
    for (const [m, q] of y0.girdi) {
      fGirdi = Math.min(fGirdi, b.arzYeterliligi(m, q));
      girdiDegeri += (q / MILI) * (b.tb.taban[m] as number);
    }
    let ciktiDegeri = 0;
    for (const [m, q] of y0.cikti) ciktiDegeri += (q / MILI) * (b.tb.taban[m] as number) * w(m);
    const v = (ciktiDegeri - girdiDegeri) * enIyiIsci * enIyiRezerv * fGirdi;
    const fayda = v * 168 - T.maliyetDegeri;
    if (fayda <= 0 && !sec.hepsi) continue;
    cikti.push({
      anahtar: `tesis_insa:${T.id}`,
      komut: { tur: "tesis_insa", bolge: enIyi.id, tesisTuru: T.id },
      tahminiFayda: fayda,
      kategori: "insa",
      bolge: enIyi.id,
      konu: T.id,
      maliyet: maliyetOlustur(enIyi.indeks, T.maliyet, T.para),
    });
  }
  return cikti;
}

// ---------------------------------------------------------------------------
// Yöntem değişimi
// ---------------------------------------------------------------------------

/** (e) Açılan yöntemlere geç (işgücü açığında otomasyon, derin madencilik vb.). */
export function yontemAdaylari(b: Bakis, hepsi = false): Aday[] {
  const cikti: Aday[] = [];
  const enIyiKonu = new Map<string, Aday>();
  for (const r of b.bolgeler) {
    const bos = b.bosIsci(r);
    for (const ts of r.tesisler) {
      if (!ts.aktif) continue;
      const tur = b.tb.tur[ts.tur] as TurBilgisi;
      const yc = b.tb.yontem[ts.yontem] as YontemBilgisi;
      const mevcutDeger = yc.netDeger * (ts.verimPpm / PPM);
      const calisan = (ts.isciPpm / PPM) * yc.isci;
      for (const yi of tur.yontemler) {
        if (yi === ts.yontem) continue;
        const y = b.tb.yontem[yi] as YontemBilgisi;
        if (y.gerekliTeknoloji !== undefined && !b.teknolojiVar(y.gerekliTeknoloji)) continue;
        const fIsci = y.isci > 0 ? Math.min(1, (calisan + bos) / y.isci) : 1;
        let fGirdi = 1;
        for (const [m, q] of y.girdi) {
          if (yc.girdi.some(([m2]) => m2 === m)) continue;
          fGirdi = Math.min(fGirdi, b.arzYeterliligi(m, q * fIsci));
          if (b.karsilanma(r.indeks, m) < 0.97) fGirdi = Math.min(fGirdi, 0.3);
        }
        const yeniDeger = y.netDeger * fIsci * fGirdi;
        if (!hepsi && (yeniDeger < mevcutDeger * 1.1 || yeniDeger - mevcutDeger < 300)) continue;
        const aday: Aday = {
          anahtar: `yontem_degistir:${y.id}`,
          komut: { tur: "yontem_degistir", bolge: r.id, tesis: ts.id, yontem: y.id },
          tahminiFayda: (yeniDeger - mevcutDeger) * 168,
          kategori: "yontem",
          bolge: r.id,
          konu: y.id,
          kilit: `yontem|${ts.id}`,
        };
        // Yöntem başına en iyi bölge/tesis: aynı yöntemi birden çok yerde önermek yerine ilk sırayı tutar.
        const onceki = enIyiKonu.get(`${y.id}|${r.id}|${ts.id}`);
        if (!onceki) enIyiKonu.set(`${y.id}|${r.id}|${ts.id}`, aday);
      }
    }
  }
  // Yöntem başına en iyi 2 tesis.
  const yontemeGore = new Map<string, Aday[]>();
  for (const a of enIyiKonu.values()) {
    const l = yontemeGore.get(a.konu) ?? [];
    l.push(a);
    yontemeGore.set(a.konu, l);
  }
  for (const k of [...yontemeGore.keys()].sort()) {
    const l = (yontemeGore.get(k) as Aday[]).sort((x, y) => y.tahminiFayda - x.tahminiFayda);
    cikti.push(...l.slice(0, 2));
  }
  return cikti;
}

// ---------------------------------------------------------------------------
// Teknoloji
// ---------------------------------------------------------------------------

/** Bir teknolojinin doğrudan (yöntem açma yoluyla) saatlik değer kazancı tahmini (para/saat). */
function teknolojiDogrudanKazanc(b: Bakis, teknolojiId: string): number {
  const ic = b.sim.ic;
  const ti = ic.teknolojiIndeks[teknolojiId];
  if (ti === undefined) return 0;
  const tek = ic.teknolojiler[ti]!;
  const acilacak = new Set(tek.acar.yontemler ?? []);
  let kazanc = 0;
  let gorulenTur = false;
  for (const r of b.bolgeler) {
    const bos = b.bosIsci(r);
    for (const ts of r.tesisler) {
      if (!ts.aktif) continue;
      const tur = b.tb.tur[ts.tur] as TurBilgisi;
      const yc = b.tb.yontem[ts.yontem] as YontemBilgisi;
      const calisan = (ts.isciPpm / PPM) * yc.isci;
      let enIyi = 0;
      for (const yi of tur.yontemler) {
        const y = b.tb.yontem[yi] as YontemBilgisi;
        if (!acilacak.has(y.id)) continue;
        gorulenTur = true;
        const fIsci = y.isci > 0 ? Math.min(1, (calisan + bos) / y.isci) : 1;
        const g = y.netDeger * fIsci - yc.netDeger * (ts.verimPpm / PPM);
        if (g > enIyi) enIyi = g;
      }
      kazanc += enIyi;
    }
  }
  if (!gorulenTur && acilacak.size > 0) {
    // Henüz ilgili tesis yok: spekülatif küçük değer (tesis kurulursa işe yarar).
    let en = 0;
    for (const yid of acilacak) {
      const yi = ic.yontemIndeks[yid];
      const y = yi === undefined ? undefined : b.tb.yontem[yi];
      if (y && y.netDeger > en) en = y.netDeger;
    }
    kazanc += en * 0.25;
  }
  if ((tek.acar.kararlar ?? []).includes("deniz_kenar_gelistir")) {
    const denizKenari = b.d.kenarlar.some((e) => e.tur === "deniz" && b.sahipMi(e.a) && b.sahipMi(e.b));
    if (denizKenari) kazanc += 500;
  }
  return kazanc;
}

/** (d) Teknoloji araştır (maliyeti karşılanıyorsa, ön koşul sırasına göre). */
export function arastirmaAdaylari(b: Bakis, hepsi = false): Aday[] {
  if (b.o.arastirma !== null) return [];
  const ic = b.sim.ic;
  const dogrudan = new Map<string, number>();
  for (const t of ic.teknolojiler) dogrudan.set(t.id, teknolojiDogrudanKazanc(b, t.id));
  const cikti: Aday[] = [];
  for (let ti = 0; ti < ic.teknolojiler.length; ti++) {
    const t = ic.teknolojiler[ti]!;
    if (b.o.teknolojiler.includes(ti)) continue;
    if (!t.onKosullar.every((k) => b.teknolojiVar(k))) continue;
    // Bir sonraki basamağın değerinin bir kısmı: ön koşul teknolojiler de değer taşır.
    let ileri = 0;
    for (const t2 of ic.teknolojiler) {
      if (t2.onKosullar.includes(t.id) && !b.teknolojiVar(t2.id)) ileri = Math.max(ileri, dogrudan.get(t2.id) ?? 0);
    }
    const kazanc = (dogrudan.get(t.id) as number) + 0.6 * ileri;
    const maliyet = t.maliyet / MILI;
    const fayda = kazanc * 168 - maliyet;
    if (fayda <= 0 && !hepsi) continue;
    cikti.push({
      anahtar: `arastir:${t.id}`,
      komut: { tur: "arastir", teknoloji: t.id },
      tahminiFayda: fayda,
      kategori: "arastir",
      konu: t.id,
      maliyet: { para: t.maliyet, stok: [] },
    });
  }
  return cikti;
}

// ---------------------------------------------------------------------------
// Lojistik: kenar geliştirme
// ---------------------------------------------------------------------------

/** (c) Kapsam nedeni "kapasite" olan hatlardaki dolu kenarları geliştir. */
export function kenarAdaylari(b: Bakis, hepsi = false): Aday[] {
  const cikti: Aday[] = [];
  if (b.bolgeler.length < 2) return cikti;
  const nm = b.tb.malSayisi;
  const lp = b.sim.ic.param.lojistik;
  const ic = b.sim.ic;
  // Kapasite kaynaklı açıklık, bölge başına.
  const tikaniklik = new Map<number, number>();
  for (const r of b.bolgeler) {
    let s = 0;
    for (let m = 0; m < nm; m++) {
      const h = b.d.lojistik.kapsam[r.indeks]?.[m];
      if (h && h.neden === "kapasite") s += 0.25 + (1 - b.karsilanma(r.indeks, m));
    }
    tikaniklik.set(r.indeks, s);
  }
  const maliyetMal: MalMiktar = [];
  for (const id of Object.keys(lp.gelistirmeMaliyeti).sort()) {
    const mi = ic.malIndeks[id];
    if (mi !== undefined) maliyetMal.push([mi, lp.gelistirmeMaliyeti[id] as number]);
  }
  let maliyetDegeri = lp.gelistirmeParasi / MILI;
  for (const [m, q] of maliyetMal) maliyetDegeri += (q / MILI) * (b.tb.taban[m] as number);

  for (const e of b.d.kenarlar) {
    if (!b.sahipMi(e.a) || !b.sahipMi(e.b)) continue;
    if (e.tur === "deniz" && !b.o.kararlar.includes("deniz_kenar_gelistir")) continue;
    if (b.kenarInsaatta(e.indeks)) continue;
    const doluluk = e.kapasiteSaat > 0 ? e.kullanilanSaat / e.kapasiteSaat : 0;
    if (doluluk < 0.6 && !hepsi) continue;
    // Uçlardaki ve bir adım ötesindeki tıkanıklık.
    let tik = (tikaniklik.get(e.a) ?? 0) + (tikaniklik.get(e.b) ?? 0);
    for (const k2 of b.d.kenarlar) {
      if (k2.indeks === e.indeks) continue;
      if (k2.a === e.a || k2.a === e.b) tik += 0.3 * (tikaniklik.get(k2.b) ?? 0);
      else if (k2.b === e.a || k2.b === e.b) tik += 0.3 * (tikaniklik.get(k2.a) ?? 0);
    }
    if (tik <= 0 && !hepsi) continue;
    const uc = e.a;
    const r = b.d.bolgeler[uc] as BolgeDurumu;
    if (!b.maliyetVar(uc, maliyetMal)) continue;
    // Tıkalı hücre başına ~60 birim/saat x ortalama fiyat(~80) x yarı etki
    const degerSaat = tik * 60 * 80 * 0.5 * Math.min(1, doluluk);
    const fayda = degerSaat * 168 - maliyetDegeri + (hepsi ? doluluk * 1000 : 0);
    if (fayda <= 0 && !hepsi) continue;
    cikti.push({
      anahtar: `kenar_gelistir:${e.tur}`,
      komut: { tur: "kenar_gelistir", kenar: e.indeks },
      tahminiFayda: fayda,
      kategori: "kenar",
      bolge: r.id,
      konu: `${e.tur}#${e.indeks}`,
      maliyet: maliyetOlustur(uc, maliyetMal, lp.gelistirmeParasi),
    });
  }
  // En iyi 3 kenar yeterli.
  cikti.sort((x, y) => y.tahminiFayda - x.tahminiFayda || x.konu.localeCompare(y.konu));
  return cikti.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Ticaret
// ---------------------------------------------------------------------------

export interface TicaretSecenek {
  /** Bu doluluk oranının üstündeki mal ihraç edilir (vars. 0.25). */
  ihracatEsigi?: number;
  /** İthalat yapılsın mı (vars. true). */
  ithalat?: boolean;
  /** Askeri mallar (mühimmat) da ihraç edilsin mi (vars. false). */
  askeriIhracat?: boolean;
  /** Fayda çarpanı (vars. 1). */
  carpan?: number;
}

function mevcutEmir(port: BolgeDurumu, mal: number, yon: "ihracat" | "ithalat"): number {
  return port.ticaretEmirleri.find((e) => e.mal === mal && e.yon === yon)?.oranSaat ?? 0;
}

/** Depo doluluğu bu oranın üstündeyse "acil": israf başlamak üzeredir, ihracat fiyata bakmadan artar, ithalat durur. */
export const DEPO_ACIL_ORANI = 0.7;
/** İhracat fiyat ölçeği: fiyat/taban bu değerin altında 0, `IHRACAT_FIYAT_TAM` üstünde 1 (arası doğrusal). */
export const IHRACAT_FIYAT_ALT = 0.55;
export const IHRACAT_FIYAT_TAM = 0.95;
/** İthalat fiyat ölçeği: fiyat/taban `ITHALAT_FIYAT_UCUZ` altında 1, `ITHALAT_FIYAT_PAHALI` üstünde en az 0.3. */
export const ITHALAT_FIYAT_UCUZ = 1.0;
export const ITHALAT_FIYAT_PAHALI = 1.5;

/** Fiyat/taban oranından ihracat ölçeği [0,1]: taban altına indikçe azalır. Deterministik, salt fonksiyon. */
export function ihracatFiyatCarpani(oran: number): number {
  return sinirla((oran - IHRACAT_FIYAT_ALT) / (IHRACAT_FIYAT_TAM - IHRACAT_FIYAT_ALT), 0, 1);
}

/** Fiyat/taban oranından ithalat ölçeği [0.3,1]: pahalandıkça azalır (zorunlu ihtiyaç tamamen kesilmez). */
export function ithalatFiyatCarpani(oran: number): number {
  return sinirla(1 - (0.7 * (oran - ITHALAT_FIYAT_UCUZ)) / (ITHALAT_FIYAT_PAHALI - ITHALAT_FIYAT_UCUZ), 0.3, 1);
}

/** Portlardan biri: verilen yönde emri olan ilk liman, yoksa `sec` ölçütüne göre en iyi liman (eşitlikte küçük indeks). */
function emirPortu(b: Bakis, limanlar: BolgeDurumu[], mal: number, yon: "ihracat" | "ithalat", enCok: boolean): BolgeDurumu {
  const var_ = limanlar.find((p) => mevcutEmir(p, mal, yon) > 0);
  if (var_) return var_;
  let en = limanlar[0] as BolgeDurumu;
  for (const p of limanlar) {
    const x = b.stok(p.indeks, mal);
    const e = b.stok(en.indeks, mal);
    if (enCok ? x > e : x < e) en = p;
  }
  return en;
}

/**
 * (b) Limanlarda fazla malı ihraç et, açık malı ithal et (hazine yeterliyse).
 * Fiyat ve depo duyarlıdır: ihracat fiyat/taban oranı düştükçe azalır (taban oranı 0.55 altında durur), ama deponun
 * %70'inden fazlası doluysa (israf başlamak üzere) fiyata bakmadan artar; ithalat pahalandıkça azalır, ucuzlayınca
 * artar ve dolu depoda kısılır. İhracat malın en çok stok tutan limanından, ithalat en az stok tutan limanından yapılır;
 * dolu depolu diğer limanlarda ayrıca ihracat emri açılır.
 */
export function ticaretAdaylari(b: Bakis, sec: TicaretSecenek = {}): Aday[] {
  const cikti: Aday[] = [];
  const limanlar = b.limanlar();
  if (limanlar.length === 0) return cikti;
  const esik = sec.ihracatEsigi ?? 0.25;
  const carpan = sec.carpan ?? 1;
  const p = b.sim.ic.param.pazar;
  const depo = b.sim.ic.param.ekonomi.depoKapasitesi;
  const tehlike = b.hazineTehlikede();
  const iptal = (port: BolgeDurumu, yon: "ihracat" | "ithalat", malId: string, fayda: number): Aday => ({
    anahtar: `ticaret_emri:${yon}_iptal_${malId}`,
    komut: { tur: "ticaret_emri", bolge: port.id, mal: malId, yon, oranSaat: 0 },
    tahminiFayda: fayda,
    kategori: "ticaret",
    bolge: port.id,
    konu: `${yon}_iptal_${malId}`,
  });
  for (let m = 0; m < b.tb.malSayisi; m++) {
    const malId = b.tb.malId[m] as string;
    const emilim = p.emilimSaat[malId] ?? 0;
    const arz = p.arzSaat[malId] ?? 0;
    // Kendi ticaretimizin etkisi çıkarılmış net oran: denetleyicinin kararlı kalması için.
    const net = b.ticaretsizNet(m);
    const stokOran = b.stokOrani(m);
    const fiyat = b.fiyat(m);
    const fOran = b.fiyatOrani(m);
    const askeri = b.tb.askeri[m] === true;
    const stokToplam = b.stokToplam[m] as number;
    const dolu = b.enDoluDoluluk(m);
    const acil = dolu > DEPO_ACIL_ORANI;
    const ihrPort = emirPortu(b, limanlar, m, "ihracat", true);
    const ithPort = emirPortu(b, limanlar, m, "ithalat", false);
    const mevcutIth = mevcutEmir(ithPort, m, "ithalat");

    // --- İthalat ihtiyacı: net açık var ve stok 4 günden az yetiyorsa ---
    let hedefIth = 0;
    if (sec.ithalat !== false && !askeri && !tehlike && net < 0 && stokToplam < -net * 96) {
      // Pahalıysa azalt, ucuzsa biraz artır; ithalat limanının deposu doluysa (mal zaten geliyor) kıs.
      const fi = ithalatFiyatCarpani(fOran);
      const ucuz = fOran < 0.85 ? 1.25 : 1;
      const portDolu = b.stok(ithPort.indeks, m) / depo > DEPO_ACIL_ORANI;
      const dolulukCarpani = portDolu ? 0 : acil ? 0.5 : 1;
      hedefIth = Math.min(Math.floor(-net * 1.1 * fi), Math.floor(arz * 0.4 * fi * ucuz));
      hedefIth = Math.floor(hedefIth * dolulukCarpani);
      const harcama72 = (hedefIth / MILI) * fiyat * 1.1 * 72;
      const butce = 0.3 * (b.hazine / MILI);
      if (harcama72 > butce) hedefIth = Math.floor((hedefIth * butce) / harcama72);
      if (hedefIth < 5000) hedefIth = 0;
    }

    // --- İhracat (ana liman): fazla varsa ve ithalat gerekmiyorsa ---
    const ihracTemel = (!askeri || sec.askeriIhracat === true || acil) && hedefIth === 0;
    const ihracEdilebilir = ihracTemel && (b.aciklik[m] as number) < (acil ? 0.25 : 0.08);
    const fp = ihracatFiyatCarpani(fOran);
    // Depo dolmak üzereyse israf her fiyattan kötüdür: ölçeğe alt sınır, tavan biraz yüksek.
    const fpEf = acil ? Math.max(fp, 0.35) : fp;
    const ihrUst = emilim * (acil ? 0.6 : 0.4) * fpEf;
    let hedefIhr = 0;
    if (ihracEdilebilir && net >= 0 && stokOran > esik) {
      const fazla = stokToplam - 0.12 * b.kapasiteToplam;
      hedefIhr = Math.max(fazla / 48, 0.8 * net);
    } else if (ihracEdilebilir && net > 0 && stokOran > 0.03) {
      hedefIhr = 0.6 * net;
    }
    if (ihracEdilebilir && acil) {
      // Depoların %60 üstünü 24 saatte boşalt; toplam stok oranı eşiğin altında kalsa da (dağınık birikim) devreye girer.
      hedefIhr = Math.max(hedefIhr, b.fazlaStok(m, 0.6) / 24, 0.8 * Math.max(net, 0));
    }
    hedefIhr = Math.min(Math.floor(hedefIhr * fpEf), Math.floor(ihrUst));
    if (hedefIhr < 5000) hedefIhr = 0;

    // --- Emir komutları (ters yöndeki emir önce iptal edilir) ---
    for (const port of limanlar) {
      const mevcutIhr = mevcutEmir(port, m, "ihracat");
      const mevcutIthP = mevcutEmir(port, m, "ithalat");
      let hIhr = 0;
      if (port === ihrPort) hIhr = hedefIhr;
      else if (ihracTemel && b.stok(port.indeks, m) / depo > DEPO_ACIL_ORANI) {
        // Diğer limanlar: yalnızca kendi deposu dolmak üzereyse, kendi fazlasını boşalt.
        const fazlaPort = b.stok(port.indeks, m) - 0.6 * depo;
        hIhr = Math.min(Math.floor((fazlaPort / 24) * fpEf), Math.floor(emilim * 0.3 * fpEf));
        if (hIhr < 5000) hIhr = 0;
      }
      const hIth = port === ithPort ? hedefIth : 0;
      if (hIth > 0 && mevcutIhr > 0) cikti.push(iptal(port, "ihracat", malId, 1e4));
      if (hIhr > 0 && mevcutIthP > 0) cikti.push(iptal(port, "ithalat", malId, 1e4));

      if (hIhr === 0 && mevcutIhr > 0 && hIth === 0) cikti.push(iptal(port, "ihracat", malId, 50));
      else if (hIhr > 0 && Math.abs(hIhr - mevcutIhr) > 0.3 * Math.max(mevcutIhr, 1)) {
        cikti.push({
          anahtar: `ticaret_emri:ihracat_${malId}`,
          komut: { tur: "ticaret_emri", bolge: port.id, mal: malId, yon: "ihracat", oranSaat: hIhr },
          tahminiFayda: (hIhr / MILI) * fiyat * 0.9 * 48 * carpan,
          kategori: "ticaret",
          bolge: port.id,
          konu: `ihracat_${malId}`,
        });
      }

      const mIth = port === ithPort ? mevcutIth : mevcutIthP;
      if (mIth > 0 && hIth === 0) {
        // İthalat: ihtiyaç bitti, hazine tehlikede ya da liman deposu doldu.
        const portDolu = b.stok(port.indeks, m) / depo > DEPO_ACIL_ORANI;
        if (tehlike || portDolu) cikti.push(iptal(port, "ithalat", malId, 1e4));
        else if (net >= 0 && stokOran > 0.05) cikti.push(iptal(port, "ithalat", malId, 50));
      } else if (hIth > 0 && Math.abs(hIth - mIth) > 0.3 * Math.max(mIth, 1)) {
        cikti.push({
          anahtar: `ticaret_emri:ithalat_${malId}`,
          komut: { tur: "ticaret_emri", bolge: port.id, mal: malId, yon: "ithalat", oranSaat: hIth },
          tahminiFayda: (hIth / MILI) * fiyat * 0.5 * 48 * carpan,
          kategori: "ticaret",
          bolge: port.id,
          konu: `ithalat_${malId}`,
        });
      }
    }
  }
  return cikti;
}

// ---------------------------------------------------------------------------
// Vergi
// ---------------------------------------------------------------------------

/** (f) Gıda karşılanma iyi ise vergiyi biraz artır, kötüyse azalt. */
export function vergiAdaylari(b: Bakis): Aday[] {
  const param = b.sim.ic.param;
  const mevcut = b.o.vergiPpm;
  let nufus = 0;
  let gidaAgirlikli = 0;
  for (const r of b.bolgeler) {
    nufus += r.nufus;
    gidaAgirlikli += r.nufus * r.gidaKarsilanmaPpm;
  }
  if (nufus === 0) return [];
  const gida = gidaAgirlikli / nufus;
  const ust = param.ekonomi.vergiBuyumeEsigiPpm;
  const alt = 100_000;
  let hedef = mevcut;
  if (gida >= 970_000 && mevcut < ust) hedef = Math.min(ust, mevcut + 50_000);
  else if (gida < 850_000 && mevcut > alt) hedef = Math.max(alt, mevcut - 50_000);
  if (hedef === mevcut) return [];
  const delta = hedef - mevcut;
  const gelirSaat = (nufus / 1000) * (param.ekonomi.vergiTabani1000Saat / MILI) * (delta / PPM);
  // Artış: hafta boyu ek gelir. Azalış: nüfus korunması (küçük sabit değer).
  const fayda = delta > 0 ? gelirSaat * 168 : 2000;
  return [
    {
      anahtar: `vergi_ayarla:${delta > 0 ? "artir" : "azalt"}`,
      komut: { tur: "vergi_ayarla", oranPpm: hedef },
      tahminiFayda: fayda,
      kategori: "vergi",
      konu: delta > 0 ? "artir" : "azalt",
    },
  ];
}

/** Geniş ticaret kümesi: stoku olan her mal için ihracat, açığı olan her mal için ithalat emri (süzgeçsiz). */
function ticaretGenis(b: Bakis): Aday[] {
  const cikti: Aday[] = [];
  const port = b.limanlar()[0];
  if (!port) return cikti;
  const p = b.sim.ic.param.pazar;
  for (let m = 0; m < b.tb.malSayisi; m++) {
    if (b.tb.askeri[m]) continue;
    const malId = b.tb.malId[m] as string;
    const stok = b.stokToplam[m] as number;
    const net = b.ticaretsizNet(m);
    const fiyat = b.fiyat(m);
    const ihr = Math.min(Math.floor((p.emilimSaat[malId] ?? 0) * 0.3), Math.floor(stok / 48));
    if (ihr >= 5000 && mevcutEmir(port, m, "ihracat") !== ihr) {
      cikti.push({
        anahtar: `ticaret_emri:ihracat_${malId}`,
        komut: { tur: "ticaret_emri", bolge: port.id, mal: malId, yon: "ihracat", oranSaat: ihr },
        tahminiFayda: (ihr / MILI) * fiyat * 0.9 * 48 * (net >= 0 ? 1 : 0.2),
        kategori: "ticaret",
        bolge: port.id,
        konu: `ihracat_${malId}`,
      });
    }
    if (net < 0) {
      const ith = Math.min(Math.floor(-net * 1.1), Math.floor((p.arzSaat[malId] ?? 0) * 0.3));
      if (ith >= 5000 && mevcutEmir(port, m, "ithalat") !== ith) {
        cikti.push({
          anahtar: `ticaret_emri:ithalat_${malId}`,
          komut: { tur: "ticaret_emri", bolge: port.id, mal: malId, yon: "ithalat", oranSaat: ith },
          tahminiFayda: (ith / MILI) * fiyat * 0.5 * 48,
          kategori: "ticaret",
          bolge: port.id,
          konu: `ithalat_${malId}`,
        });
      }
    }
  }
  return cikti;
}

/** Geniş vergi kümesi: +/- 50 000 ppm (sınırlar içinde). */
function vergiGenis(b: Bakis): Aday[] {
  const ust = b.sim.ic.param.ekonomi.vergiBuyumeEsigiPpm;
  const mevcut = b.o.vergiPpm;
  const cikti: Aday[] = [];
  if (mevcut + 50_000 <= ust) {
    cikti.push({ anahtar: "vergi_ayarla:artir", komut: { tur: "vergi_ayarla", oranPpm: mevcut + 50_000 }, tahminiFayda: 100, kategori: "vergi", konu: "artir" });
  }
  if (mevcut - 50_000 >= 100_000) {
    cikti.push({ anahtar: "vergi_ayarla:azalt", komut: { tur: "vergi_ayarla", oranPpm: mevcut - 50_000 }, tahminiFayda: 50, kategori: "vergi", konu: "azalt" });
  }
  return cikti;
}

/**
 * Geniş sivil aday kümesi (H2 ölçümü için): fayda süzgeci olmadan uygulanabilir tüm sivil eylemler.
 * Sıralama yine tahminiFayda iledir; seçim ölçümü bot heuristiğine değil klon koşusuna bırakılır.
 */
export function genisAdaylar(b: Bakis): Aday[] {
  return [
    ...insaAdaylari(b, { hepsi: true }),
    ...yontemAdaylari(b, true),
    ...arastirmaAdaylari(b, true),
    ...kenarAdaylari(b, true).slice(0, 3),
    ...ticaretGenis(b),
    ...vergiGenis(b),
  ];
}

/** Sivil adayların tamamı (askeri olmayan). */
export function sivilAdaylar(b: Bakis, ticaret: TicaretSecenek = {}): Aday[] {
  return [
    ...insaAdaylari(b),
    ...yontemAdaylari(b),
    ...arastirmaAdaylari(b),
    ...kenarAdaylari(b),
    ...ticaretAdaylari(b, ticaret),
    ...vergiAdaylari(b),
  ];
}

// ---------------------------------------------------------------------------
// Seçim
// ---------------------------------------------------------------------------

export interface SecimSecenek {
  /** En fazla komut sayısı. */
  n: number;
  /** Kategori başına üst sınır (vars.: araştırma 1, kenar 1, vergi 1, rezerv 1, savaş 1, ticaret 2). */
  kategoriSiniri?: Partial<Record<AdayKategori, number>>;
  /** Hazinede bırakılacak tampon (para). */
  tampon?: number;
}

const VARSAYILAN_SINIR: Partial<Record<AdayKategori, number>> = {
  arastir: 1,
  kenar: 1,
  vergi: 1,
  rezerv: 1,
  savas: 1,
  ticaret: 2,
};

/**
 * Adayları fayda sırasına dizip bütçe (hazine + bölge stokları) içinde kalarak ilk n tanesini seçer.
 * Sıralama kararlıdır (eşit faydada anahtar, bölge, konu sırası).
 */
export function adayiSec(adaylar: readonly Aday[], b: Bakis, sec: SecimSecenek): Aday[] {
  const sirali = [...adaylar]
    .filter((a) => a.tahminiFayda > 0)
    .sort(
      (x, y) =>
        y.tahminiFayda - x.tahminiFayda ||
        (x.anahtar < y.anahtar ? -1 : x.anahtar > y.anahtar ? 1 : 0) ||
        (x.bolge ?? "").localeCompare(y.bolge ?? ""),
    );
  const sinirlar = { ...VARSAYILAN_SINIR, ...(sec.kategoriSiniri ?? {}) };
  const sayac = new Map<AdayKategori, number>();
  const gorulen = new Set<string>();
  const harcananStok = new Map<string, number>();
  let kalanPara = b.hazine - (sec.tampon ?? HAZINE_TAMPONU) * MILI;
  const secilen: Aday[] = [];
  for (const a of sirali) {
    if (secilen.length >= sec.n) break;
    const anahtar = `${a.anahtar}|${a.bolge ?? ""}`;
    if (gorulen.has(anahtar)) continue;
    const s = sayac.get(a.kategori) ?? 0;
    const ust = sinirlar[a.kategori];
    if (ust !== undefined && s >= ust) continue;
    if (a.maliyet) {
      if (a.maliyet.para > kalanPara) continue;
      let tamam = true;
      for (const k of a.maliyet.stok) {
        const harcanan = harcananStok.get(`${k.bolge}|${k.mal}`) ?? 0;
        if (b.stok(k.bolge, k.mal) - harcanan < k.miktar) {
          tamam = false;
          break;
        }
      }
      if (!tamam) continue;
      kalanPara -= a.maliyet.para;
      for (const k of a.maliyet.stok) {
        const an = `${k.bolge}|${k.mal}`;
        harcananStok.set(an, (harcananStok.get(an) ?? 0) + k.miktar);
      }
    }
    gorulen.add(anahtar);
    sayac.set(a.kategori, s + 1);
    secilen.push(a);
  }
  return secilen;
}

/** Günün saatini (0-23) döndürür; bot bekleme süreleri ve önayar zamanlaması için. */
export function gunSaati(t: Ms): number {
  return Math.floor((t % GUN) / SAAT);
}

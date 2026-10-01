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
  | "savas"
  | "tarim"
  | "enerji"
  | "olcek"
  | "bakim"
  | "sondaj";

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

  /** Sanayi katmanı (B2) açık mı: `param.sanayi` tanımlı. */
  get sanayiAcik(): boolean {
    return this.sim.ic.param.sanayi !== undefined;
  }

  /** Tesisin ölçek kademesi çarpanları (sanayi kapalıysa S: hepsi PPM). */
  olcekKademesi(ts: { olcek?: 0 | 1 | 2 }): { ciktiPpm: number; isciPpm: number; bakimPpm: number; insaPpm: number } {
    const p = this.sim.ic.param.sanayi;
    if (p === undefined) return { ciktiPpm: PPM, isciPpm: PPM, bakimPpm: PPM, insaPpm: PPM };
    return p.olcekKademeleri[ts.olcek ?? 0] as { ciktiPpm: number; isciPpm: number; bakimPpm: number; insaPpm: number };
  }

  /** Tesisin (ölçekli) tam kadro işçi ihtiyacı. */
  tesisIsci(ts: { yontem: number; olcek?: 0 | 1 | 2 }): number {
    const y = this.tb.yontem[ts.yontem] as YontemBilgisi;
    const k = this.olcekKademesi(ts);
    return k.isciPpm === PPM ? y.isci : Math.floor((y.isci * k.isciPpm) / PPM);
  }

  /** Bölgenin elektrik karşılanma oranı [0,1] (tesisler); sanayi kapalıysa veya hesaplanmamışsa 1. */
  elektrikOrani(b: BolgeDurumu): number {
    return b.elektrik === undefined ? 1 : b.elektrik.karsilanmaPpm / PPM;
  }

  /** Aktif tesislerin ve devam eden inşaatların ayırdığı işçi. */
  kullanilanIsci(b: BolgeDurumu): number {
    let t = 0;
    for (const ts of b.tesisler) if (ts.aktif) t += this.tesisIsci(ts);
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

  /** Tarım katmanı (B1) açık mı: iklim ve tarim parametreleri tanımlı. */
  get tarimAcik(): boolean {
    const p = this.sim.ic.param;
    return p.iklim !== undefined && p.tarim !== undefined;
  }

  /** Bölgenin tarım tesisi tavanı (inşa edilen + devam eden tarım tesisi sayısı >= tavan ise dolu). Tarım kapalıysa false. */
  tarimTavaniDolu(b: BolgeDurumu): boolean {
    if (!this.tarimAcik || b.tarim === undefined) return false;
    const tavan = this.sim.ic.harita.bolgeler[b.indeks]?.tarim?.tarimTesisTavani;
    if (tavan === undefined) return false;
    let n = 0;
    for (const ts of b.tesisler) if ((this.tb.tur[ts.tur] as TurBilgisi).tarimTesisi) n++;
    for (const i of this.d.insaatlar) {
      if (i.tur === "tesis" && i.bolge === b.indeks && (this.tb.tur[i.hedef] as TurBilgisi).tarimTesisi) n++;
    }
    return n >= tavan;
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
    // Santral: elektrik açığına göre ayrı aday yolundan (sanayiAdaylari) kurulur; genel fayda süzgeci santrale uymaz.
    if (T.santral) continue;
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
      if (T.tarimTesisi && b.tarimTavaniDolu(r)) continue;
      // Elektrik (B2): şebekesi çökmüş ya da kapasitesi dolu bölgede elektrik girdili yeni tesis kurulmaz (önce santral).
      if (y0.elektrikGirdi > 0 && r.elektrik !== undefined) {
        const kap = santralKapasitesi(b, r) * (1 - b.sim.ic.param.sanayi!.iletimKaybiPpm / PPM);
        if (b.elektrikOrani(r) < 0.9 || r.elektrik.talepMili + y0.elektrikGirdi > kap) continue;
      }
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
      // Depolanamaz mal (elektrik) arz yeterliliği değil bölge şebekesine bağlıdır: aşağıda elektrik çarpanı ile.
      if (!b.tb.depolanamaz[m]) fGirdi = Math.min(fGirdi, b.arzYeterliligi(m, q));
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
      // Santral yöntemi (kömür/yakıt) yakıt erişimine göre ayrı seçilir (sanayiAdaylari).
      if (tur.santral) continue;
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
          if (b.tb.depolanamaz[m]) continue;
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
    if (b.tb.depolanamaz[m]) continue; // elektrik (B2): ticaret, stok ve doluluk kararı yok
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
// Tarım (B1): ekim planı ve gübre dozu
// ---------------------------------------------------------------------------

export interface TarimSecenek {
  /** Ekim planı adayları üretilsin mi (vars. true). */
  ekim?: boolean;
  /** Gübre dozu (ve gübre ithalatı) adayları üretilsin mi (vars. false). */
  gubre?: boolean;
  /** Ekim planı hep ekim nöbeti (toprağı koruyan sabit plan) olsun: ayarla-unut (kur_ve_unut) oyuncusu için. */
  nobet?: boolean;
}

/** Ekim planı şablonları (payların toplamı PPM): bugday / baklagil / nadas. */
const EKIM_A = [1_000_000, 0, 0]; // monokültür: en yüksek çıktı, toprağı tüketir (-9000/gün)
const EKIM_B = [500_000, 250_000, 250_000]; // ekim nöbeti: toprağı korur (-500/gün), çıktı ~%61
const EKIM_C = [200_000, 300_000, 500_000]; // toparlanma: toprağı yeniler (+5400/gün)

function ayniPlan(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Toprağa ve mevcut plana göre hedef ekim planı (gübreli monokültür sürdürülebilirse A). Histerezisli, deterministik. */
function hedefEkim(toprak: number, mevcut: readonly number[], gubreli: boolean): readonly number[] {
  if (gubreli) return EKIM_A;
  const cNde = ayniPlan(mevcut, EKIM_C);
  const aDa = ayniPlan(mevcut, EKIM_A);
  if (toprak < 500_000) return EKIM_C;
  if (toprak < 700_000) return cNde && toprak < 650_000 ? EKIM_C : EKIM_B;
  if (toprak < 900_000) return aDa ? EKIM_A : EKIM_B;
  return EKIM_A;
}

/**
 * (g) Tarım (docs/08 §1.3 T1, T4): ekili (rezervli tarımsal) tesisi olan her tarım bölgesi için ekim planı ve (isteğe
 * bağlı) gübre dozu. Gübre yalnız erişilebilirse (yurt içi üretim, ≥ 48 saatlik stok ya da limanlı + fiyat ≤ 1,35 x taban)
 * ve hazine sağlamsa seçilir; gübreli monokültür toprağı korur. Gübre dozu kararında ithal mal açığı mevcut ticaret
 * mantığıyla kapanır; tarım kapalıyken boş döner. Kilit: bölge başına ekim ve gübre ayrı beklemeye alınır.
 */
export function tarimAdaylari(b: Bakis, sec: TarimSecenek = {}): Aday[] {
  const cikti: Aday[] = [];
  if (!b.tarimAcik) return cikti;
  const ic = b.sim.ic;
  const urunler = ic.icerik.tarimUrunleri ?? [];
  if (urunler.length !== 3 || urunler[0]?.id !== "bugday" || urunler[1]?.id !== "baklagil" || urunler[2]?.id !== "nadas") return cikti;
  const tp = ic.param.tarim;
  if (tp === undefined) return cikti;
  const gubre = b.tb.gubre;
  const gubreIste = sec.gubre === true && gubre >= 0 && tp.azamiGubreDozu > 0;
  const limanVar = b.limanlar().length > 0;
  for (const r of b.bolgeler) {
    const ts = r.tarim;
    if (ts === undefined) continue;
    // Yalnız ekili (rezervli tarımsal) aktif tesisi olan bölge karar gerektirir.
    let ciftlik = 0;
    for (const t of r.tesisler) {
      const y = ic.yontemler[t.yontem];
      if (t.aktif && y !== undefined && y.tarimsal === true && y.rezerv !== undefined) ciftlik++;
    }
    if (ciftlik === 0) continue;

    // Gübre: erişilebilirlik ve hedef doz.
    let hedefDoz = 0;
    if (gubreIste) {
      const ihtiyac = tp.azamiGubreDozu * tp.gubreTuketimiSaat * ciftlik; // mili-birim/saat
      const yurtici = (b.uretimSaat[gubre] as number) >= ihtiyac;
      const stoklu = b.stok(r.indeks, gubre) >= ihtiyac * 48;
      const ithal = limanVar && b.fiyatOrani(gubre) <= 1.35 && !b.hazineTehlikede() && b.hazine / MILI > 20_000;
      if (yurtici || stoklu || ithal) hedefDoz = tp.azamiGubreDozu;
    }
    const gubreli = hedefDoz >= 2;

    if (sec.ekim !== false) {
      const hedef = sec.nobet === true ? EKIM_B : hedefEkim(ts.toprakPpm, ts.ekimPpm, gubreli);
      if (!ayniPlan(hedef, ts.ekimPpm)) {
        const ad = ayniPlan(hedef, EKIM_A) ? "monokultur" : ayniPlan(hedef, EKIM_B) ? "nobet" : "toparlanma";
        cikti.push({
          anahtar: `ekim_plani:${ad}`,
          komut: { tur: "ekim_plani", bolge: r.id, ekimPpm: [...hedef] },
          tahminiFayda: 15_000,
          kategori: "tarim",
          bolge: r.id,
          konu: ad,
          kilit: `ekim|${r.id}`,
        });
      }
    }
    if (gubreIste && hedefDoz !== ts.gubreDozu) {
      cikti.push({
        anahtar: `gubre_dozu:${hedefDoz}`,
        komut: { tur: "gubre_dozu", bolge: r.id, doz: hedefDoz },
        tahminiFayda: 12_000,
        kategori: "tarim",
        bolge: r.id,
        konu: `doz${hedefDoz}`,
        kilit: `gubre|${r.id}`,
      });
      // Gübre açığı oluşmadan ithalat emri: ihtiyaç yok sayılan malda net < 0 görülmediği için ticaret mantığı tetiklenmez.
      if (hedefDoz > 0 && !(b.uretimSaat[gubre] as number) && b.stokToplam[gubre]! < tp.gubreTuketimiSaat * 48 && limanVar) {
        const port = b.limanlar()[0] as BolgeDurumu;
        const oran = Math.min(Math.floor(hedefDoz * tp.gubreTuketimiSaat * ciftlik * 1.2), Math.floor((ic.param.pazar.arzSaat["gubre"] ?? 0) * 0.5));
        if (oran >= 5_000 && mevcutEmir(port, gubre, "ithalat") < oran) {
          cikti.push({
            anahtar: "ticaret_emri:ithalat_gubre",
            komut: { tur: "ticaret_emri", bolge: port.id, mal: "gubre", yon: "ithalat", oranSaat: oran },
            tahminiFayda: 10_000,
            kategori: "tarim",
            bolge: port.id,
            konu: "ithalat_gubre",
            kilit: `gubre_ithalat|${port.id}`,
          });
        }
      }
    }
  }
  return cikti;
}

// ---------------------------------------------------------------------------
// Sanayi (B2): santral, ölçek, bakım/onarım, keşif sondajı
// ---------------------------------------------------------------------------

export interface SanayiSecenek {
  /** Santral adayları: elektrik açığında santral/hidro inşası ve yakıt yöntemi seçimi (vars. true). */
  santral?: boolean;
  /** Ölçek yükseltme adayları (vars. false). */
  olcek?: boolean;
  /** Bakım düzeyi ve genel onarım: "tasarruf" = hep asgari düzey, "dengeli" = duruma göre (vars.), false = yok. */
  bakim?: false | "tasarruf" | "dengeli";
  /** Keşif sondajı adayları (vars. false). */
  sondaj?: boolean;
  /** Proaktif şebeke: kapasite payı daralınca (talep > %80 kapasite) açık oluşmadan santral kur (vars. true). */
  proaktif?: boolean;
}

/** Elektrik karşılanma oranı bunun altındaysa bölge "açıkta" sayılır: santral kararı doğar. */
const ELEKTRIK_ESIGI = 0.96;
/** Bölgede en çok bu kadar santral (kurulu + inşada): şebeke tek bölge içindir, sınırsız büyütmeyiz. */
const EN_COK_SANTRAL = 3;

/** Bölgedeki santral kapasitesi tahmini (tam yükte, mili-birim/saat): hidro mevsim ortalaması için %70. */
function santralKapasitesi(b: Bakis, r: BolgeDurumu): number {
  let k = 0;
  for (const ts of r.tesisler) {
    const y = b.tb.yontem[ts.yontem] as YontemBilgisi;
    if (y.elektrikCikti <= 0) continue;
    k += (y.elektrikCikti * b.olcekKademesi(ts).ciktiPpm) / PPM * (y.hidro ? 0.7 : 1);
  }
  // İnşaatı süren santraller de kapasiteye sayılır (aynı açık için ikinci santral kurulmasın).
  for (const i of b.d.insaatlar) {
    if (i.tur !== "tesis" || i.bolge !== r.indeks) continue;
    const T = b.tb.tur[i.hedef] as TurBilgisi;
    if (!T.santral) continue;
    const y = b.tb.yontem[T.yontemler[0] as number] as YontemBilgisi;
    k += y.elektrikCikti * (y.hidro ? 0.7 : 1);
  }
  return k;
}

/** Yakıt (kömür/yakıt) bu bölgeye erişilebilir mi: depoda >= 24 saatlik ya da kapsam iyi ve oyuncu yeterince üretiyor. */
function yakitErisimi(b: Bakis, r: BolgeDurumu, mal: number, saatlik: number): boolean {
  if (mal < 0) return true;
  if (b.stok(r.indeks, mal) >= saatlik * 24) return true;
  return b.karsilanma(r.indeks, mal) >= 0.9 && (b.uretimSaat[mal] as number) >= saatlik;
}

/** Elektrik açığında santral inşası ve yakıt yöntemi seçimi. */
function santralAdaylari(b: Bakis, proaktif = true): Aday[] {
  const cikti: Aday[] = [];
  const santralTurleri = b.tb.tur.filter((T) => T.santral && (T.gerekliTeknoloji === undefined || b.teknolojiVar(T.gerekliTeknoloji)));
  for (const r of b.bolgeler) {
    if (r.elektrik === undefined) continue;
    const K = b.elektrikOrani(r);
    // Tüketici tesisler: elektrik açığının getirdiği kayıp (para/saat).
    let kayip = 0;
    let tuketici = 0;
    let santralSayisi = 0;
    for (const ts of r.tesisler) {
      const y = b.tb.yontem[ts.yontem] as YontemBilgisi;
      if (y.elektrikCikti > 0) santralSayisi++;
      else if (ts.aktif && y.elektrikGirdi > 0) {
        tuketici++;
        kayip += Math.max(0, y.netDeger) * (ts.isciPpm / PPM) * (1 - K);
      }
    }
    for (const i of b.d.insaatlar) {
      if (i.tur === "tesis" && i.bolge === r.indeks && (b.tb.tur[i.hedef] as TurBilgisi).santral) santralSayisi++;
    }
    if (tuketici === 0) continue;

    // (1) Yakıt sıkıntısı: kömür/yakıt santralinin yakıtına erişilemiyorsa erişilebilir olan yönteme geç.
    let yakitSikintisi = false;
    let yakitCozumu = false;
    for (const ts of r.tesisler) {
      const y = b.tb.yontem[ts.yontem] as YontemBilgisi;
      if (y.elektrikCikti <= 0 || y.hidro || !ts.aktif) continue;
      const tur = b.tb.tur[ts.tur] as TurBilgisi;
      const ol = b.olcekKademesi(ts).ciktiPpm;
      const ihtiyac = ((y.girdi[0]?.[1] ?? 0) * ol) / PPM;
      if (yakitErisimi(b, r, y.yakitMal, ihtiyac * 0.4)) continue;
      yakitSikintisi = true;
      for (const yi of tur.yontemler) {
        if (yi === ts.yontem) continue;
        const alt = b.tb.yontem[yi] as YontemBilgisi;
        if (alt.hidro || alt.yakitMal < 0) continue;
        if (alt.gerekliTeknoloji !== undefined && !b.teknolojiVar(alt.gerekliTeknoloji)) continue;
        const altIhtiyac = ((alt.girdi[0]?.[1] ?? 0) * ol) / PPM;
        if (!yakitErisimi(b, r, alt.yakitMal, altIhtiyac * 0.4)) continue;
        cikti.push({
          anahtar: `yontem_degistir:${alt.id}`,
          komut: { tur: "yontem_degistir", bolge: r.id, tesis: ts.id, yontem: alt.id },
          tahminiFayda: 30_000 + kayip * 168,
          kategori: "enerji",
          bolge: r.id,
          konu: alt.id,
          kilit: `yontem|${ts.id}`,
        });
        yakitCozumu = true;
        break;
      }
    }

    // (2) Kapasite: şebeke tıkalıysa (kalan elektrik yok) ya da talep kapasitenin %80'ini aşıyorsa (proaktif) yeni santral.
    // Yakıt sorunu yöntem değişimiyle çözülüyorsa bekle.
    if ((yakitSikintisi && yakitCozumu) || santralSayisi >= EN_COK_SANTRAL) continue;
    const kap = santralKapasitesi(b, r) * (1 - b.sim.ic.param.sanayi!.iletimKaybiPpm / PPM);
    // Kapasite (inşaattakiler dahil) talebi zaten karşılıyorsa sorun kapasite değildir (yakıt, işgücü, aşınma): santral çözmez.
    if (kap >= r.elektrik.talepMili && K < ELEKTRIK_ESIGI) continue;
    const acik = K < ELEKTRIK_ESIGI;
    const daralma = proaktif && kap > 0 && r.elektrik.talepMili > 0.8 * kap;
    if (!acik && !daralma) continue;
    let kayipEf = kayip;
    if (!acik) {
      kayipEf = 0;
      for (const ts of r.tesisler) {
        const y = b.tb.yontem[ts.yontem] as YontemBilgisi;
        if (ts.aktif && y.elektrikGirdi > 0 && y.elektrikCikti <= 0) kayipEf += Math.max(0, y.netDeger) * (ts.isciPpm / PPM) * 0.15;
      }
    }
    const ayrikHidro = r.etiketler.includes("dag");
    let secilen: TurBilgisi | undefined;
    for (const T of santralTurleri) {
      const y0 = b.tb.yontem[T.yontemler[0] as number] as YontemBilgisi;
      if (T.gerekliEtiket !== undefined && !r.etiketler.includes(T.gerekliEtiket)) continue;
      if (y0.hidro && (!ayrikHidro || b.tesisSayisi(T.indeks, r.indeks) > 0)) continue;
      // Yakıtlı santral: türün herhangi bir (açık) yöntemi için yakıt erişilebilir olmalı (varsayılan yöntem erişilemezse
      // kurulduktan sonra erişilebilir olana geçilir); hidro her zaman uygun.
      if (!y0.hidro) {
        let erisim = false;
        for (const yi of T.yontemler) {
          const y = b.tb.yontem[yi] as YontemBilgisi;
          if (y.hidro || y.yakitMal < 0) continue;
          if (y.gerekliTeknoloji !== undefined && !b.teknolojiVar(y.gerekliTeknoloji)) continue;
          if (yakitErisimi(b, r, y.yakitMal, (y.girdi[0]?.[1] ?? 0) * 0.4)) erisim = true;
        }
        if (!erisim) continue;
      }
      if (!b.maliyetVar(r.indeks, T.maliyet)) continue;
      if (secilen === undefined || (y0.hidro && !(b.tb.yontem[secilen.yontemler[0] as number] as YontemBilgisi).hidro)) secilen = T;
    }
    if (secilen === undefined) continue;
    const fayda = kayipEf * 168 - secilen.maliyetDegeri;
    if (fayda <= 0) continue;
    cikti.push({
      anahtar: `tesis_insa:${secilen.id}`,
      komut: { tur: "tesis_insa", bolge: r.id, tesisTuru: secilen.id },
      tahminiFayda: fayda + 50_000,
      kategori: "enerji",
      bolge: r.id,
      konu: secilen.id,
      maliyet: maliyetOlustur(r.indeks, secilen.maliyet, secilen.para),
    });
  }
  return cikti;
}

/** Ölçek yükseltme (S -> M -> L): işgücü, girdi ve elektrik payı olan, iyi çalışan tesislerde. */
function olcekAdaylari(b: Bakis): Aday[] {
  const cikti: Aday[] = [];
  const sp = b.sim.ic.param.sanayi;
  if (sp === undefined) return cikti;
  const isletme = b.sim.ic.param.ekonomi.tesisIsletmeParasiSaat / MILI;
  for (const r of b.bolgeler) {
    if (r.elektrik === undefined || b.elektrikOrani(r) < 0.97 || r.elektrik.yukPpm > 850_000) continue;
    for (const ts of r.tesisler) {
      if (!ts.aktif || ts.verimPpm < 900_000 || ts.isciPpm < 900_000) continue;
      const tur = b.tb.tur[ts.tur] as TurBilgisi;
      const y = b.tb.yontem[ts.yontem] as YontemBilgisi;
      if (tur.santral || y.cikti.length === 0 || tur.tarimTesisi) continue;
      if (b.d.insaatlar.some((i) => i.tur === "olcek" && i.hedef === ts.id)) continue;
      const mevcut = ts.olcek ?? 0;
      if (mevcut >= 2) continue;
      const hedef = (mevcut + 1) as 1 | 2;
      const gerekli = (sp.olcekKademeleri[hedef] as { gerekliTeknoloji: string | null }).gerekliTeknoloji;
      if (gerekli !== null && !b.teknolojiVar(gerekli)) continue;
      const eski = b.olcekKademesi(ts);
      const yeni = sp.olcekKademeleri[hedef] as { ciktiPpm: number; isciPpm: number; bakimPpm: number; insaPpm: number };
      // İşgücü: ek işçi boşta olmalı (tam kadro).
      const ekIsci = Math.floor((y.isci * yeni.isciPpm) / PPM) - b.tesisIsci(ts);
      if (b.bosIsci(r) < ekIsci) continue;
      // Girdi: ek girdi akışı bulunabilir olmalı.
      const artis = (yeni.ciktiPpm - eski.ciktiPpm) / PPM;
      let fGirdi = 1;
      for (const [m, q] of y.girdi) {
        if (b.tb.depolanamaz[m]) continue;
        fGirdi = Math.min(fGirdi, b.arzYeterliligi(m, q * artis));
        if (b.karsilanma(r.indeks, m) < 0.9) fGirdi = Math.min(fGirdi, 0.2);
      }
      // Ham çıkarımda L/M ölçek damarı hızla tüketir: ömrü kısa damarda yükseltme yok.
      let fDamar = 1;
      if (y.rezerv >= 0) {
        const ilk = r.rezervIlk[y.rezerv] as number;
        const kalan = r.rezervKalan[y.rezerv] as number;
        if (ilk <= 0 || kalan < ilk * 0.5) continue;
        fDamar = 0.6;
      }
      // Pazar doygunluğu (A1 pürüzü: limansız üretici bölgelerde elektronik depoda tavana dayanıp israf oluyor): çıktı
      // mallarından birinin fiyatı doygun (ihracat fiyat ölçeği düşük) ya da deposu dolmak üzereyse (>%50) ek çıktı değersizdir.
      let fPazar = 1;
      for (const [m] of y.cikti) {
        if (b.tb.askeri[m] || b.tb.depolanamaz[m]) continue;
        fPazar = Math.min(fPazar, Math.max(0.1, ihracatFiyatCarpani(b.fiyatOrani(m))));
        if (b.stok(r.indeks, m) / b.sim.ic.param.ekonomi.depoKapasitesi > 0.5) fPazar = Math.min(fPazar, 0.2);
      }
      const bakimMaliyet = y.bakim.reduce((t, [m, q]) => t + (q / MILI) * (b.tb.taban[m] as number), 0);
      const ekBakim = ((yeni.bakimPpm - eski.bakimPpm) / PPM) * (bakimMaliyet + isletme);
      const kazanc = y.netDeger * artis * fGirdi * fDamar * fPazar - ekBakim;
      const oran = (yeni.insaPpm - eski.insaPpm) / PPM;
      const maliyetDegeri = tur.maliyetDegeri * oran;
      const fayda = kazanc * 168 - maliyetDegeri;
      if (fayda <= 0) continue;
      const mal: MalMiktar = tur.maliyet.map(([m, q]) => [m, Math.floor(q * oran)] as [number, number]).filter(([, q]) => q > 0);
      cikti.push({
        anahtar: `tesis_olcek_yukselt:${tur.id}_${hedef}`,
        komut: { tur: "tesis_olcek_yukselt", bolge: r.id, tesis: ts.id, olcek: hedef },
        tahminiFayda: fayda,
        kategori: "olcek",
        bolge: r.id,
        konu: `${tur.id}_${hedef}`,
        kilit: `olcek|${ts.id}`,
        maliyet: maliyetOlustur(r.indeks, mal, Math.floor(tur.para * oran)),
      });
    }
  }
  cikti.sort((x, y) => y.tahminiFayda - x.tahminiFayda || (x.bolge ?? "").localeCompare(y.bolge ?? "") || x.konu.localeCompare(y.konu));
  return cikti.slice(0, 3);
}

/** Bakım düzeyi (oyuncu düzeyi) ve bölge başına genel onarım. */
function bakimAdaylari(b: Bakis, mod: "tasarruf" | "dengeli"): Aday[] {
  const cikti: Aday[] = [];
  const sp = b.sim.ic.param.sanayi;
  if (sp === undefined) return cikti;
  const kayipTavani = sp.bakim.asinmaVerimKaybiTavaniPpm / PPM;
  const onarimMaliyetOrani = sp.bakim.genelOnarimMaliyetPpm / PPM;
  const cur = b.o.bakimDuzeyi ?? 1;
  let topAsinma = 0;
  let n = 0;
  let parcaKitligi = false;
  for (const r of b.bolgeler) {
    if ((r.bakimKarsilanmaPpm ?? PPM) < sp.bakim.kitlikEsigiPpm) parcaKitligi = true;
    for (const ts of r.tesisler) {
      if (!ts.aktif) continue;
      topAsinma += (ts.asinmaPpm ?? 0) / PPM;
      n++;
    }
  }
  const ort = n > 0 ? topAsinma / n : 0;
  const tehlike = b.hazineTehlikede();
  let hedef: 0 | 1 | 2 = cur;
  if (mod === "tasarruf") hedef = 0;
  else if (tehlike && ort < 0.1) hedef = 0;
  else if (ort > 0.15 && !tehlike && !parcaKitligi) hedef = 2;
  else if (cur === 2 && (ort < 0.05 || parcaKitligi)) hedef = 1;
  else if (cur === 0 && !tehlike && ort > 0.08) hedef = 1;
  if (hedef !== cur) {
    cikti.push({
      anahtar: `bakim_duzeyi:${hedef}`,
      komut: { tur: "bakim_duzeyi", duzey: hedef },
      tahminiFayda: 20_000,
      kategori: "bakim",
      konu: `duzey${hedef}`,
      // Düzey değişimleri tek kilitte beklenir (0 <-> 1 <-> 2 salınımı önlenir).
      kilit: "bakim_duzeyi",
    });
  }
  if (mod === "tasarruf") return cikti;

  // Genel onarım: aşınma yüksek bölgeler (kayıp > maliyet + 6 saatlik durma).
  const durus = sp.bakim.genelOnarimDurusSaat;
  for (const r of b.bolgeler) {
    let toplamAsinma = 0;
    let enAsinma = 0;
    let kayipSaat = 0;
    let degerSaat = 0;
    let maliyetDegeri = 0;
    const toplamMal = new Map<number, number>();
    let para = 0;
    let adet = 0;
    for (const ts of r.tesisler) {
      const a = (ts.asinmaPpm ?? 0) / PPM;
      if (!ts.aktif || a <= 0) continue;
      const y = b.tb.yontem[ts.yontem] as YontemBilgisi;
      const tur = b.tb.tur[ts.tur] as TurBilgisi;
      const oran = (b.olcekKademesi(ts).insaPpm / PPM) * onarimMaliyetOrani;
      adet++;
      toplamAsinma += a;
      if (a > enAsinma) enAsinma = a;
      const v = Math.max(0, y.netDeger) * (ts.verimPpm / PPM);
      kayipSaat += v * a * kayipTavani;
      degerSaat += v;
      maliyetDegeri += tur.maliyetDegeri * oran;
      for (const [m, q] of tur.maliyet) {
        const x = Math.floor(q * oran);
        if (x > 0) toplamMal.set(m, (toplamMal.get(m) ?? 0) + x);
      }
      para += Math.floor(tur.para * oran);
    }
    if (adet === 0 || (toplamAsinma / adet < 0.22 && enAsinma < 0.35)) continue;
    const fayda = kayipSaat * 168 - maliyetDegeri - degerSaat * durus;
    if (fayda <= 0) continue;
    const mal: MalMiktar = [...toplamMal.entries()].sort((x, y) => x[0] - y[0]);
    cikti.push({
      anahtar: "genel_onarim",
      komut: { tur: "genel_onarim", bolge: r.id },
      tahminiFayda: fayda,
      kategori: "bakim",
      bolge: r.id,
      konu: "onarim",
      maliyet: maliyetOlustur(r.indeks, mal, para),
    });
  }
  return cikti;
}

/** Keşif sondajı: tükenen damarda (kalan/ilk < 0,5) yeni damar şansı. Beklenen verim kazancı - maliyet. */
function sondajAdaylari(b: Bakis): Aday[] {
  const cikti: Aday[] = [];
  const sp = b.sim.ic.param.sanayi;
  if (sp === undefined) return cikti;
  const dp = sp.damar;
  const ic = b.sim.ic;
  const tarimRezerv = new Set<string>();
  for (const y of ic.yontemler) if (y.tarimsal === true && y.rezerv !== undefined) tarimRezerv.add(y.rezerv);
  const mal: MalMiktar = [];
  let maliyetDegeri = dp.kesifMaliyetPara / MILI;
  for (const id of Object.keys(dp.kesifMaliyetMal).sort()) {
    const mi = ic.malIndeks[id];
    const q = dp.kesifMaliyetMal[id] as number;
    if (mi === undefined || q <= 0) continue;
    mal.push([mi, q]);
    maliyetDegeri += (q / MILI) * (b.tb.taban[mi] as number);
  }
  mal.sort((x, y) => x[0] - y[0]);
  const ortEki = (dp.kesifEkiMinPpm + dp.kesifEkiMaxPpm) / 2 / PPM;
  const taban = dp.rezervVerimTabaniPpm / PPM;
  for (const r of b.bolgeler) {
    for (let mi = 0; mi < b.tb.malSayisi; mi++) {
      if (!b.tb.ham[mi] || tarimRezerv.has(b.tb.malId[mi] as string)) continue;
      const ilk = r.rezervIlk[mi] as number;
      if (ilk <= 0) continue;
      if ((r.kesifSayisi?.[mi] ?? 0) >= dp.kesifHakkiBolgeMal) continue;
      const oran = (r.rezervKalan[mi] as number) / ilk;
      if (oran >= 0.5) continue;
      // Bu rezervi çeken aktif tesislerin brüt çıktı değeri.
      let deger = 0;
      for (const ts of r.tesisler) {
        const y = b.tb.yontem[ts.yontem] as YontemBilgisi;
        if (ts.aktif && y.rezerv === mi) deger += y.brutDeger * (b.olcekKademesi(ts).ciktiPpm / PPM);
      }
      if (deger <= 0) continue;
      const simdi = Math.max(taban, Math.sqrt(Math.max(0, oran)));
      const sonra = Math.max(taban, Math.sqrt((oran + ortEki) / (1 + ortEki)));
      const kazanc = (dp.kesifOlasilikPpm / PPM) * (sonra - simdi) * deger * 168;
      const fayda = kazanc - maliyetDegeri;
      if (fayda <= 0) continue;
      cikti.push({
        anahtar: `arama_sondaji:${b.tb.malId[mi]}`,
        komut: { tur: "arama_sondaji", bolge: r.id, mal: b.tb.malId[mi] as string },
        tahminiFayda: fayda,
        kategori: "sondaj",
        bolge: r.id,
        konu: `sondaj_${b.tb.malId[mi]}`,
        maliyet: maliyetOlustur(r.indeks, mal, dp.kesifMaliyetPara),
      });
    }
  }
  cikti.sort((x, y) => y.tahminiFayda - x.tahminiFayda || (x.bolge ?? "").localeCompare(y.bolge ?? "") || x.konu.localeCompare(y.konu));
  return cikti.slice(0, 3);
}

/**
 * (h) Sanayi (docs/08 §2, B2): elektrik açığında santral inşası ve yakıt yöntemi, ölçek yükseltme, bakım düzeyi ve genel
 * onarım, keşif sondajı. Sanayi kapalıysa boş döner. Tamamen deterministik: yalnız dünya durumunu okur.
 */
export function sanayiAdaylari(b: Bakis, sec: SanayiSecenek = {}): Aday[] {
  if (!b.sanayiAcik) return [];
  const cikti: Aday[] = [];
  if (sec.santral !== false) cikti.push(...santralAdaylari(b, sec.proaktif !== false));
  if (sec.olcek === true) cikti.push(...olcekAdaylari(b));
  if (sec.bakim !== false) cikti.push(...bakimAdaylari(b, sec.bakim ?? "dengeli"));
  if (sec.sondaj === true) cikti.push(...sondajAdaylari(b));
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
    if (b.tb.askeri[m] || b.tb.depolanamaz[m]) continue;
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
    ...tarimAdaylari(b, { ekim: true, gubre: true }),
    ...sanayiAdaylari(b, { santral: true, olcek: true, bakim: "dengeli", sondaj: true }),
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
    ...tarimAdaylari(b, { ekim: true }),
    ...sanayiAdaylari(b, { santral: true, bakim: "dengeli" }),
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
  tarim: 2,
  enerji: 2,
  olcek: 1,
  bakim: 1,
  sondaj: 1,
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

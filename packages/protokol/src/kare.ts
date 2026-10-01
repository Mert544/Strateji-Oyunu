/**
 * İlgi alanı karesi: sunucunun bir istemciye gönderdiği dünya kesiti (saf işlevler; Node veya tarayıcıda çalışır).
 *
 * İstemcinin `isci/kare.ts` içindeki `kareAl`'ından farkı (oradan kopyalanmadı):
 * - Yalnız ilgi alanındaki bölgeler (abone olunanlar ∪ oyuncunun kendi bölgeleri) kareye girer.
 * - Veri iki katmandır: GENEL (sahip, nüfus, tesis siluetleri, savunma duruşu) herkese; ÖZEL (stoklar, üretim, tesis
 *   ayrıntısı, ticaret emirleri, ordu, rezerv) yalnız bölgenin sahibine. Hazine ve oyuncu durumu yalnız oyuncunun kendisine.
 * - Stoklar ve hazine anlık DEĞER değil FORMÜL olarak gider: `(miktar, oran, t0, artik, kapasite)`. İstemci
 *   `stokAraDeger(f, t)` ile her karede ara değer üretir; stok yalnız oran değişince (uzlaştırmada) yeniden gönderilir.
 *   `stokAraDeger` çekirdeğin `anlikMiktar`'ını kullanır: istemcinin gösterdiği sayı sunucudakiyle bit bit aynıdır.
 * - Sayılar çekirdeğin ham tamsayı birimleridir (mili-birim, ppm, ms); yuvarlama/biçimleme istemcinin işidir.
 *
 * - Mülk kipinde (S3) ilgi alanı ilçeleri de kapsar: abone olunan ilçeler ∪ oyuncunun hücresi olan ilçeler. İlçe
 *   girdisi genel veridir (seviye, satılmış hücre, hücre sahipliği ve üzerindeki tesis/inşaat); oyuncunun arazi kaydı
 *   (arazi değeri, tembel arazi vergisi formülü) yalnız kendisine.
 *
 * - F4 eklemeleri (hepsi İSTEĞE BAĞLI alan; eski istemci yok sayar): hücrede tesis/ek yapı türü (herkese; yoksa inşaattaki
 *   tür) ve yalnız sahibine hücre değeri; ilçede ayrılmış (yeni oyuncuya satılan) hücre kümesi (türetilmiş, DEĞİŞMEZ: delta
 *   yalnız ilçe ilk girdiğinde taşır, sonrasında atlanır; yalnız ABONE OLUNAN/oyuncunun ilçeleri için ve yalnız isteyen
 *   bağlantıya, çünkü Gebze ölçeğinde ilçe başına ~1,5 MB; sayı `ayrilmisAdet` her zaman gelir); yalnız sahibine erken
 *   oyun çarpanı FORMÜLÜ (`erkenOyun`; çarpan zamanla değiştiği için değer değil formül gider, delta kirlenmez), ilk-yapı
 *   indirimi kalan hakkı, ayrılmış hücre satın alma bitişi ve inşaatın başlangıcı/ek yapı kimliği.
 *
 * Delta: `kareFarki(eski, yeni)` yalnız değişen bölgeleri (tam girdi olarak), çıkan bölgeleri ve değişen genel alanları
 * verir; `deltaUygula(eski, delta)` yeni kareyi geri kurar (`deltaUygula(a, kareFarki(a, b))` ≡ `b`).
 */
import { PPM, anlikMiktar, carpBol } from "@bolge/cekirdek";
import type { ArsaSinifi, DerlenmisIcerik, DerlenmisMulk, Dunya, IlceSeviyesi, Mili, Ms, OyuncuId, Stok } from "@bolge/cekirdek";

export interface KareSecenekleri {
  /** İlçe karelerine ayrılmış hücre listesini (`IlceKaresi.ayrilmis`) ekle (varsayılan hayır; büyük). */
  ayrilmisListesi?: boolean;
}

/** Kare çıkarmak için gereken en az simülasyon yüzü (`Simulasyon` bunu sağlar). */
export interface KareKaynagi {
  readonly dunya: Readonly<Dunya>;
  readonly ic: DerlenmisIcerik;
}

/** Tembel stok formülü: `[miktar, oran (yerel + gelen, /saat), t0, artik, kapasite]`. */
export type StokFormulu = [miktar: Mili, oran: Mili, t0: Ms, artik: number, kapasite: Mili];

/** Herkese açık bölge verisi. tesisler: `[tesisTuruIndeksi, aktif (0/1)]`; durus: 0 normal, 1 savunma, 2 geri çekil. */
export interface GenelBolgeKaresi {
  sahip: OyuncuId | null;
  nufus: number;
  tesisler: Array<[tur: number, aktif: 0 | 1]>;
  durus: 0 | 1 | 2;
}

/** Yalnız sahibine giden bölge verisi (ham çekirdek birimleri). */
export interface OzelBolgeKaresi {
  /** Mal indeksine göre stok formülleri. */
  stoklar: StokFormulu[];
  /** Mal indeksine göre brüt üretim oranı (mili-birim/saat). */
  uretimOrani: Mili[];
  /** `[kimlik, tür, yöntem, aktif (0/1), verimPpm, isciPpm]` */
  tesisler: Array<[id: number, tur: number, yontem: number, aktif: 0 | 1, verimPpm: number, isciPpm: number]>;
  /** `[mal, yön (0 ihracat, 1 ithalat), istenen oran, gerçekleşen oran]` (mili-birim/saat) */
  emirler: Array<[mal: number, yon: 0 | 1, oranSaat: Mili, gerceklesenSaat: Mili]>;
  /** Birlik indeksine göre adet. */
  birlikler: number[];
  gidaPpm: number;
  ikmalPpm: number;
  /** Mal indeksine göre kalan rezerv (mili-birim). */
  rezervKalan: Mili[];
}

export interface BolgeKaresi {
  /** Bölge indeksi (dünyadaki sıra; mülk kipinde işletme düğümleri harita bölgelerinin ardından eklenir). */
  i: number;
  /** Bölge kimliği (işletme düğümleri sonradan eklendiği için dizin yerine karede taşınır). */
  id: string;
  genel: GenelBolgeKaresi;
  ozel?: OzelBolgeKaresi;
}

/**
 * Hücre: `[kimlik "x:y", sahip, sınıf, tesis kimliği (-1 yok), inşaat kimliği (-1 yok), tür?, değerMili?]`.
 * `tür` (herkese): üzerindeki tesisin türü ya da ek yapı kimliği; tesis yoksa süren inşaatın türü; ikisi de yoksa alan
 * yoktur (ya da `değerMili` varsa ""). `değerMili` YALNIZ hücrenin sahibine: satın alma bedeli (mili-para).
 */
export type HucreKaresi = [id: string, sahip: OyuncuId, sinif: ArsaSinifi, tesis: number, insaat: number, tur?: string, degerMili?: Mili];

/** İlçe (mülk kipi, genel veri): durum + sahiplenilmiş hücreler (kimliğe göre sıralı). */
export interface IlceKaresi {
  id: string;
  il: string;
  seviye: IlceSeviyesi;
  uygunHucre: number;
  satilmisHucre: number;
  hucreler: HucreKaresi[];
  /** Yeni oyunculara ayrılmış hücre sayısı (türetilmiş, değişmez; yoksa alan yok). */
  ayrilmisAdet?: number;
  /**
   * Ayrılmış hücrelerin LİSTESİ (kimliğe göre sıralı; satılmış olanlar da listededir): yalnız `abone {ayrilmis: true}`
   * isteyen bağlantıya (`KareSecenekleri.ayrilmisListesi`); büyük olabilir. Değişmezdir: delta yalnız ilçe ilk girdiğinde
   * taşır, `deltaUygula` önceki girdiden korur.
   */
  ayrilmis?: string[];
}

/** Oyuncunun mülk kaydı (yalnız kendisine). */
export interface MulkOyuncuKaresi {
  araziDegeriMili: Mili;
  /** Tahakkuk eden arazi vergisi (tembel stok formülü). */
  araziVergisi: StokFormulu;
  /** `[ilçe, hücre sayısı]` */
  ilceHucre: Array<[ilce: string, hucre: number]>;
  sonEtkinlik: Ms;
  /** İlk-yapı indirimi kalan hakkı (kaç yapı daha indirimli). */
  indirimliYapiKalan?: number;
  /** Ayrılmış hücreleri satın alabilme bitişi (katılım + ayrılmış süre; sim ms). */
  ayrilmisBitis?: Ms;
}

/** Erken oyun süre çarpanı formülü: `[katılımZamanı, başlangıçÇarpanıPpm, sabitMs, bitişMs]` (bkz. `erkenOyunCarpani`). */
export type ErkenOyunFormulu = [katilma: Ms, baslangicPpm: number, sabitMs: Ms, bitisMs: Ms];

/** Oyuncunun kendi durumu (yalnız kendisine). */
export interface OyuncuKaresi {
  id: OyuncuId;
  hazine: StokFormulu;
  vergiPpm: number;
  askeriRezervPpm: number;
  teknolojiler: number[];
  arastirma: { teknoloji: number; bitis: Ms } | null;
  korumaBitis: Ms;
  /**
   * `[kimlik, tür, bölge, hedef, bitiş, başlangıç?, ekYapı?]`; tür: "tesis" | "kenar" | "olcek" | "onarim". `başlangıç`
   * (mülk kipi hücreli inşaat; yoksa -1) aşama hesabı içindir; `ekYapı` ek yapı inşaatında `mulk.ekYapilar` kimliğidir.
   */
  insaatlar: Array<[id: number, tur: string, bolge: number, hedef: number, bitis: Ms, baslangic?: Ms, ekYapi?: string]>;
  /** Erken oyun süre çarpanı formülü (inşa, kenar, birlik, araştırma süreleri); değer için `erkenOyunCarpani(f, t)`. */
  erkenOyun?: ErkenOyunFormulu;
  /** Mülk kipinde oyuncunun arazi kaydı (katılmış ama hücresi yoksa da vardır). */
  mulk?: MulkOyuncuKaresi;
}

export interface IlgiKaresi {
  /** Karenin sim zamanı (ms). */
  t: Ms;
  /** İlgi alanındaki bölgeler, indekse göre artan. */
  bolgeler: BolgeKaresi[];
  /** Mal indeksine göre dünya referans fiyatı (mili-para/birim); genel veri. */
  fiyat: number[];
  /** Yalnız kimliği doğrulanmış ve dünyaya katılmış oyuncuya. */
  oyuncu?: OyuncuKaresi;
  /** Mülk kipinde ilgi alanındaki ilçeler (kimliğe göre sıralı); bölge kipinde yok. */
  ilceler?: IlceKaresi[];
}

export interface KareDeltasi {
  t: Ms;
  /** Eklenen veya değişen bölgeler (tam girdi). */
  bolgeler: BolgeKaresi[];
  /** İlgi alanından çıkan bölge indeksleri. */
  cikan: number[];
  /** Değiştiyse yeni fiyat dizisi. */
  fiyat?: number[];
  /** Değiştiyse yeni oyuncu karesi; `null` = artık yok. */
  oyuncu?: OyuncuKaresi | null;
  /** Mülk kipi: eklenen veya değişen ilçeler (tam girdi). */
  ilceler?: IlceKaresi[];
  /** Mülk kipi: ilgi alanından çıkan ilçeler. */
  cikanIlceler?: string[];
}

const DURUS: Record<string, 0 | 1 | 2> = { normal: 0, savunma: 1, geri_cekil: 2 };

/**
 * Erken oyun süre çarpanı (ppm, (0, PPM]) t anında: çekirdeğin `sureCarpaniPpm`'i ile aynı tamsayı formülü
 * (katılımdan itibaren `sabit` kadar sabit, `bitiş`e kadar doğrusal artış, sonra PPM).
 */
export function erkenOyunCarpani(f: Readonly<ErkenOyunFormulu>, t: Ms): number {
  const [katilma, baslangic, sabitMs, bitisMs] = f;
  const gecen = t > katilma ? t - katilma : 0;
  if (gecen <= sabitMs) return baslangic;
  if (gecen >= bitisMs) return PPM;
  return baslangic + carpBol(PPM - baslangic, gecen - sabitMs, bitisMs - sabitMs);
}

/** İlçe başına ayrılmış hücre listesi (türetilmiş; çekirdek derlemesi başına bir kez hesaplanır, referans sabittir). */
const ayrilmisOnbellek = new WeakMap<DerlenmisMulk, Map<string, string[] | null>>();
function ayrilmisHucreler(mk: DerlenmisMulk, ilce: string): string[] | undefined {
  let m = ayrilmisOnbellek.get(mk);
  if (!m) ayrilmisOnbellek.set(mk, (m = new Map()));
  let l = m.get(ilce);
  if (l === undefined) {
    const t = mk.ilceler.get(ilce);
    const liste = t ? t.hucreler.filter((h) => mk.ayrilmis.has(h.id)).map((h) => h.id).sort() : [];
    m.set(ilce, (l = liste.length > 0 ? liste : null));
  }
  return l ?? undefined;
}

export function stokFormulu(s: Readonly<Stok>): StokFormulu {
  return [s.miktar, s.yerelOran + s.gelenOran, s.t0, s.artik, s.kapasite];
}

/** Formülden t anındaki miktar (çekirdeğin `anlikMiktar`'ı; kelepçeli). Oran sonradan değişmediği sürece kesindir. */
export function stokAraDeger(f: Readonly<StokFormulu>, t: Ms): Mili {
  const [miktar, oran, t0, artik, kapasite] = f;
  return anlikMiktar({ miktar, yerelOran: oran, gelenOran: 0, t0, artik, kapasite, surum: 0 }, t);
}

/**
 * İlgi alanı: istenen bölge indeksleri ∪ oyuncunun sahip olduğu bölgeler; tekil, aralıkta, artan sırada.
 * Aralık dışı indeksler sessizce atılır (çözümleme sunucudadır).
 */
export function ilgiAlaniKur(kaynak: KareKaynagi, istenen: readonly number[], oyuncu: OyuncuId | null): number[] {
  const n = kaynak.dunya.bolgeler.length;
  const kume = new Set<number>();
  for (const i of istenen) if (Number.isInteger(i) && i >= 0 && i < n) kume.add(i);
  if (oyuncu !== null) for (const b of kaynak.dunya.bolgeler) if (b.sahip === oyuncu) kume.add(b.indeks);
  return [...kume].sort((a, b) => a - b);
}

/**
 * Mülk kipi ilçe ilgisi: istenen (dünyada var olan) ilçeler ∪ oyuncunun hücresi olan ilçeler; tekil, sıralı.
 * Bölge kipinde (dünyada mülk durumu yoksa) boş döner.
 */
export function ilceIlgisiKur(kaynak: KareKaynagi, istenen: readonly string[], oyuncu: OyuncuId | null): string[] {
  const m = kaynak.dunya.mulk;
  if (!m) return [];
  const var_ = new Set(m.ilceler.map((c) => c.id));
  const kume = new Set<string>();
  for (const c of istenen) if (var_.has(c)) kume.add(c);
  if (oyuncu !== null) for (const x of m.oyuncular.find((o) => o.id === oyuncu)?.ilceHucre ?? []) if (x.hucre > 0) kume.add(x.ilce);
  return [...kume].sort();
}

/**
 * Dünyadan ilgi alanı karesi (saf; dünyayı değiştirmez). `oyuncu` null ise yalnız genel veri. `ilceler` (mülk
 * kipi) verilmezse ilçe bölümü boş liste olur; bölge kipinde hiç yazılmaz.
 */
export function ilgiKaresiCikar(
  kaynak: KareKaynagi,
  bolgeIndeksleri: readonly number[],
  oyuncu: OyuncuId | null,
  ilceler: readonly string[] = [],
  secenek: KareSecenekleri = {},
): IlgiKaresi {
  const d = kaynak.dunya;
  const bolgeler: BolgeKaresi[] = [];
  for (const i of bolgeIndeksleri) {
    const b = d.bolgeler[i];
    if (!b) continue;
    const girdi: BolgeKaresi = {
      i,
      id: b.id,
      genel: {
        sahip: b.sahip,
        nufus: b.nufus,
        tesisler: b.tesisler.map((x): [number, 0 | 1] => [x.tur, x.aktif ? 1 : 0]),
        durus: DURUS[b.savunma.durus] ?? 0,
      },
    };
    if (oyuncu !== null && b.sahip === oyuncu) {
      girdi.ozel = {
        stoklar: b.stoklar.map(stokFormulu),
        uretimOrani: [...b.uretimOrani],
        tesisler: b.tesisler.map((x): OzelBolgeKaresi["tesisler"][number] => [x.id, x.tur, x.yontem, x.aktif ? 1 : 0, x.verimPpm, x.isciPpm]),
        emirler: b.ticaretEmirleri.map((e): OzelBolgeKaresi["emirler"][number] => [e.mal, e.yon === "ihracat" ? 0 : 1, e.oranSaat, e.gerceklesenSaat]),
        birlikler: [...b.birlikler],
        gidaPpm: b.gidaKarsilanmaPpm,
        ikmalPpm: b.ikmalKarsilanmaPpm,
        rezervKalan: [...b.rezervKalan],
      };
    }
    bolgeler.push(girdi);
  }
  const kare: IlgiKaresi = { t: d.zaman, bolgeler, fiyat: [...d.pazar.fiyat] };
  if (oyuncu !== null) {
    const o = d.oyuncular.find((x) => x.id === oyuncu);
    if (o) {
      kare.oyuncu = {
        id: o.id,
        hazine: stokFormulu(o.hazine),
        vergiPpm: o.vergiPpm,
        askeriRezervPpm: o.askeriRezervPpm,
        teknolojiler: [...o.teknolojiler],
        arastirma: o.arastirma ? { teknoloji: o.arastirma.teknoloji, bitis: o.arastirma.bitis } : null,
        korumaBitis: o.korumaBitis,
        insaatlar: d.insaatlar
          .filter((x) => x.sahip === oyuncu)
          .map((x): OyuncuKaresi["insaatlar"][number] => {
            const girdi: OyuncuKaresi["insaatlar"][number] = [x.id, x.tur, x.bolge, x.hedef, x.bitis];
            if (x.baslangic !== undefined || x.ekYapi !== undefined) girdi.push(x.baslangic ?? -1);
            if (x.ekYapi !== undefined) girdi.push(x.ekYapi);
            return girdi;
          }),
      };
      const eo = kaynak.ic.param.erkenOyun;
      if (eo) kare.oyuncu.erkenOyun = [o.katilmaZamani, eo.baslangicCarpaniPpm, eo.sabitSaat * 3_600_000, eo.bitisSaat * 3_600_000];
      const mo = d.mulk?.oyuncular.find((x) => x.id === oyuncu);
      if (mo) {
        kare.oyuncu.mulk = {
          araziDegeriMili: mo.araziDegeriMili,
          araziVergisi: stokFormulu(mo.araziVergisi),
          ilceHucre: mo.ilceHucre.map((x): [string, number] => [x.ilce, x.hucre]),
          sonEtkinlik: mo.sonEtkinlik,
        };
        const mk = kaynak.ic.mulk;
        if (mk) {
          kare.oyuncu.mulk.indirimliYapiKalan = Math.max(0, mk.p.yeniOyuncu.indirimliYapiSayisi - (mo.indirimliYapi ?? 0));
          kare.oyuncu.mulk.ayrilmisBitis = o.katilmaZamani + mk.ayrilmisSureMs;
        }
      }
    }
  }
  const m = d.mulk;
  if (m) {
    const istenen = new Set(ilceler);
    const hucreler = new Map<string, HucreKaresi[]>();
    // Hücre üzerindeki tür: tesis/ek yapı kimliği -> tür kimliği (yalnız gerekirse, kare başına bir kez kurulur).
    let tesisTuru: Map<number, string> | null = null;
    let insaatTuru: Map<number, string> | null = null;
    const turler = (): void => {
      if (tesisTuru !== null) return;
      tesisTuru = new Map();
      insaatTuru = new Map();
      for (const b of d.bolgeler) {
        if (b.merkez === undefined) continue;
        for (const t of b.tesisler) tesisTuru.set(t.id, kaynak.ic.tesisTurleri[t.tur]?.id ?? "");
        for (const e of b.ekYapilar ?? []) tesisTuru.set(e.id, e.tur);
      }
      for (const i of d.insaatlar) {
        if (i.hucreler === undefined) continue;
        insaatTuru.set(i.id, i.ekYapi ?? kaynak.ic.tesisTurleri[i.hedef]?.id ?? "");
      }
    };
    for (const h of m.hucreler) {
      if (!istenen.has(h.ilce)) continue;
      let liste = hucreler.get(h.ilce);
      if (!liste) hucreler.set(h.ilce, (liste = []));
      const girdi: HucreKaresi = [h.id, h.sahip, h.sinif, h.tesis ?? -1, h.insaat ?? -1];
      let tur: string | undefined;
      if (h.tesis !== undefined || h.insaat !== undefined) {
        turler();
        tur = h.tesis !== undefined ? (tesisTuru as unknown as Map<number, string>).get(h.tesis) : (insaatTuru as unknown as Map<number, string>).get(h.insaat as number);
      }
      const sahibi = oyuncu !== null && h.sahip === oyuncu;
      if (tur !== undefined || sahibi) girdi.push(tur ?? "");
      if (sahibi) girdi.push(h.degerMili);
      liste.push(girdi);
    }
    const mk = kaynak.ic.mulk;
    kare.ilceler = m.ilceler
      .filter((c) => istenen.has(c.id))
      .map((c) => {
        const girdi: IlceKaresi = { id: c.id, il: c.il, seviye: c.seviye, uygunHucre: c.uygunHucre, satilmisHucre: c.satilmisHucre, hucreler: hucreler.get(c.id) ?? [] };
        const ayrilmis = mk ? ayrilmisHucreler(mk, c.id) : undefined;
        if (ayrilmis) {
          girdi.ayrilmisAdet = ayrilmis.length;
          if (secenek.ayrilmisListesi === true) girdi.ayrilmis = ayrilmis;
        }
        return girdi;
      });
  }
  return kare;
}

function ayni(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** İlçe girdisi eşitliği; büyük `ayrilmis` listesi önce referansla (kare başına aynı önbellek dizisi) karşılaştırılır. */
function ilceAyni(a: IlceKaresi, b: IlceKaresi): boolean {
  if (a.ayrilmis !== b.ayrilmis && !ayni(a.ayrilmis, b.ayrilmis)) return false;
  const { ayrilmis: _a, ...x } = a;
  const { ayrilmis: _b, ...y } = b;
  return ayni(x, y);
}

/** İki kare arasındaki fark. Yalnız `t` değiştiyse `deltaBosMu` true döner (göndermeye gerek yok). */
export function kareFarki(eski: IlgiKaresi, yeni: IlgiKaresi): KareDeltasi {
  const eskiBolge = new Map(eski.bolgeler.map((b) => [b.i, b]));
  const yeniIndeks = new Set(yeni.bolgeler.map((b) => b.i));
  const delta: KareDeltasi = {
    t: yeni.t,
    bolgeler: yeni.bolgeler.filter((b) => {
      const e = eskiBolge.get(b.i);
      return e === undefined || !ayni(e, b);
    }),
    cikan: eski.bolgeler.filter((b) => !yeniIndeks.has(b.i)).map((b) => b.i),
  };
  if (!ayni(eski.fiyat, yeni.fiyat)) delta.fiyat = yeni.fiyat;
  if (!ayni(eski.oyuncu, yeni.oyuncu)) delta.oyuncu = yeni.oyuncu ?? null;
  if (eski.ilceler !== undefined || yeni.ilceler !== undefined) {
    const eskiIlce = new Map((eski.ilceler ?? []).map((c) => [c.id, c]));
    const yeniIlce = new Set((yeni.ilceler ?? []).map((c) => c.id));
    const degisen: IlceKaresi[] = [];
    for (const c of yeni.ilceler ?? []) {
      const e = eskiIlce.get(c.id);
      if (e !== undefined && ilceAyni(e, c)) continue;
      // Ayrılmış hücre kümesi değişmezdir: ilçe zaten istemcideyse delta taşımaz (kare boyutu).
      if (e !== undefined && c.ayrilmis !== undefined && ayni(e.ayrilmis, c.ayrilmis)) {
        const { ayrilmis: _atla, ...kalan } = c;
        degisen.push(kalan);
      } else degisen.push(c);
    }
    const cikan = (eski.ilceler ?? []).filter((c) => !yeniIlce.has(c.id)).map((c) => c.id);
    if (degisen.length > 0) delta.ilceler = degisen;
    if (cikan.length > 0) delta.cikanIlceler = cikan;
  }
  return delta;
}

export function deltaBosMu(delta: KareDeltasi): boolean {
  return (
    delta.bolgeler.length === 0 &&
    delta.cikan.length === 0 &&
    delta.fiyat === undefined &&
    delta.oyuncu === undefined &&
    delta.ilceler === undefined &&
    delta.cikanIlceler === undefined
  );
}

/** Deltayı kareye uygular (yeni kare döner; girdi değişmez). */
export function deltaUygula(kare: IlgiKaresi, delta: KareDeltasi): IlgiKaresi {
  const harita = new Map(kare.bolgeler.map((b) => [b.i, b]));
  for (const i of delta.cikan) harita.delete(i);
  for (const b of delta.bolgeler) harita.set(b.i, b);
  const yeni: IlgiKaresi = {
    t: delta.t,
    bolgeler: [...harita.values()].sort((a, b) => a.i - b.i),
    fiyat: delta.fiyat ?? kare.fiyat,
  };
  const oyuncu = delta.oyuncu === undefined ? kare.oyuncu : delta.oyuncu;
  if (oyuncu) yeni.oyuncu = oyuncu;
  if (kare.ilceler !== undefined || delta.ilceler !== undefined) {
    const ilce = new Map((kare.ilceler ?? []).map((c) => [c.id, c]));
    for (const c of delta.cikanIlceler ?? []) ilce.delete(c);
    for (const c of delta.ilceler ?? []) {
      const onceki = ilce.get(c.id);
      // `ayrilmis` yoksa önceki girdiden korunur (değişmezdir).
      ilce.set(c.id, c.ayrilmis === undefined && onceki?.ayrilmis !== undefined ? { ...c, ayrilmis: onceki.ayrilmis } : c);
    }
    yeni.ilceler = [...ilce.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  return yeni;
}

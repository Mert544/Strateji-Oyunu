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
 * - Kamu arsası (satılmayan hücreler; G2 P1): ilçe girdisinde `kamuAdet` (her zaman) ve `kamu` grupları (yalnız `abone {kamu:
 *   true}` isteyen bağlantıya; Gebze ölçeğinde ilçe başına on binlerce hücre olabilir). Tel biçimi DİKDÖRTGEN BLOK: her grup
 *   `{sahip, tur, blok: [x0, y0, x1, y1][]}`; hücre kimliği "x:y" olduğundan blok x0..x1 × y0..y1 (dört uç da DAHİL) kamu hücreleridir.
 *   Çekirdek bloklar YALNIZ uygun kamu hücrelerini kapsar (bloğun her hücresi kamudur; yol/su gibi uygunsuz hücre blok dışında kalır).
 *   Gruplar (sahip, tür) sırasıyla, bloklar (y0, x0) sırasıyla gelir (çekirdeğin `kamuBloklari` sırası). `kamuAdet` blok alanları
 *   toplamıdır. Kamu kümesi DEĞİŞMEZ (dünya kurulurken donar), bu yüzden `ayrilmis` gibi deltada tekrarlanmaz. Kamu hücreleri `hucreler`de
 *   yoktur (satılmaz). Yardımcılar: `kamuBilgisiBul` (hücre sorgusu), `blokHucreleri` (blok açma).
 *
 * Delta: `kareFarki(eski, yeni)` yalnız değişen bölgeleri (tam girdi olarak), çıkan bölgeleri ve değişen genel alanları
 * verir; `deltaUygula(eski, delta)` yeni kareyi geri kurar (`deltaUygula(a, kareFarki(a, b))` ≡ `b`).
 */
import { PPM, anlikMiktar, carpBol, kamuBloklari } from "@bolge/cekirdek";
import type { ArsaSinifi, DerlenmisIcerik, DerlenmisMulk, Dunya, KamuGrubu, IlceSeviyesi, Mili, Ms, OyuncuId, Stok } from "@bolge/cekirdek";

/** Dikdörtgen kamu bloğu: `[x0, y0, x1, y1]` = x0..x1 × y0..y1 (dört uç dahil) hücreleri ("x:y" kimliği), hepsi kamu arsası. */
export type KamuBlogu = [x0: number, y0: number, x1: number, y1: number];

/** Aynı sahibe ve türe ait kamu blokları. */
export interface KamuGrubuKaresi {
  /** `k:mahalle:<id>` | `k:ilce:<id>` (ileride `k:il:<id>`). */
  sahip: string;
  tur: KamuGrubu["tur"];
  blok: KamuBlogu[];
}

export interface KareSecenekleri {
  /**
   * Oyuncu kimliğinden görünen ad (sunucu hesap deposundan verir; ÇEKİRDEK DURUMUNA GİRMEZ, `durumOzeti` etkilenmez). Verilirse karedeki sahiplerin
   * (bölge sahibi, ilgi alanındaki ilçelerin hücre sahipleri ve isteyenin kendisi) adları `IlgiKaresi.adlar`'a yazılır; adı olmayan oyuncu girdisizdir.
   */
  adlar?: (oyuncu: OyuncuId) => string | undefined;
  /** İlçe karelerine kamu arsası gruplarını (`IlceKaresi.kamu`) ekle (varsayılan hayır; büyük olabilir). */
  kamuListesi?: boolean;
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
  /**
   * `[kimlik, tür, yöntem, aktif (0/1), verimPpm, isciPpm]`. DEMETE ÖĞE EKLENMEZ: istemci her sunucu mesajını zod ile doğrular ve zod 3 `tuple`
   * fazla öğeyi reddeder (eski istemci kareyi tümden atar). Yeni veri isteğe bağlı nesne alanıyla gelir (`tesisOlcek`).
   */
  tesisler: Array<[id: number, tur: number, yontem: number, aktif: 0 | 1, verimPpm: number, isciPpm: number]>;
  /**
   * Yalnız ekleme (isteğe bağlı): ölçeği S olmayan tesisler `[tesis kimliği, 1 (M) | 2 (L)]`; listede olmayan tesis S'dir. Hiç M/L tesis yoksa alan YAZILMAZ.
   * Eski istemci (z.object bilinmeyen anahtarı atar) alanı sessizce yok sayar.
   */
  tesisOlcek?: Array<[id: number, olcek: 1 | 2]>;
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
  /** Kamu arsası hücre sayısı (satılmaz; kamu kuralı kapalıysa ya da ilçede kamu yoksa alan yok). */
  kamuAdet?: number;
  /**
   * Kamu arsası grupları (dikdörtgen blok; bkz. dosya başlığı): yalnız `abone {kamu: true}` isteyen bağlantıya
   * (`KareSecenekleri.kamuListesi`). Değişmezdir: delta yalnız ilçe ilk girdiğinde taşır, `deltaUygula` önceki girdiden korur.
   */
  kamu?: KamuGrubuKaresi[];
  /** Yeni oyunculara ayrılmış hücre sayısı (türetilmiş, değişmez; yoksa alan yok). */
  ayrilmisAdet?: number;
  /**
   * Yalnız ekleme (isteğe bağlı): `satilmisHucre`nin PARA ile satılmış AYRILMIŞ hücre kısmı (çekirdek `IlceDurumu.ayrilmisSatilmis`; yurdun bedelsiz verdiği
   * hücreler sayılmaz). Parsel fiyat eğrisi `satilmisHucre − ayrilmisSatilmis + k` üzerinden ilerler (ayrılmış alımlar eğriyi ilerletmez). 0 ise alan YAZILMAZ.
   */
  ayrilmisSatilmis?: number;
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
  /**
   * KATILIM ilçesi (çekirdek `MulkOyuncuDurumu.katilimIlcesi`: yurt ilçesi ya da yurtsuz katılımdaki `ilce`; ayrılmış hücre yalnız burada satılır).
   * Çekirdekte yoksa (katılım ilçesi belirlenemediyse ya da kural kapalıysa) ALAN YOKTUR; bölge kipinde zaten `mulk` yoktur. Yalnız sahibine.
   */
  katilimIlcesi?: string;
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
  /**
   * Yalnız ekleme (isteğe bağlı; mülk kipi, G6): inşaatta SEÇİLEN yöntemin KİMLİĞİ (çekirdek `InsaatDurumu.yontem`): `[inşaat kimliği, yöntem kimliği]`. Yalnız komutta
   * `yontem` verilmiş (alan yazılmış) KENDİ inşaatları listelenir; yöntemsiz inşaat (tür varsayılanı) ve hiç yoksa alan YAZILMAZ. `insaatlar` demetine öğe EKLENMEZ
   * (zod 3 tuple fazla öğeyi reddeder; eski istemci kareyi tümden atardı); eski istemci (z.object bilinmeyen anahtarı atar) alanı sessizce yok sayar.
   */
  insaatYontem?: Array<[insaat: number, yontem: string]>;
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
  /**
   * Bu karede görünen oyuncuların (bölge sahipleri, ilçe hücre sahipleri, isteyenin kendisi) GÖRÜNEN ADLARI: `oyuncu kimliği -> ad` (küçük harfli, 2-24 karakter;
   * anahtarlar sıralı). Adı olmayan oyuncunun girdisi yoktur (istemci kimlikten varsayılan gösterir); sunucuda görünen ad özelliği kapalıysa alan yoktur.
   */
  adlar?: Record<OyuncuId, string>;
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
  /**
   * Yeni ya da DEĞİŞEN görünen adlar (`oyuncu kimliği -> ad`; yalnız değişenler, ad değişince yeni ad gelir). Görünümden çıkan oyuncunun adı bildirilmez: istemci adları
   * önbellek olarak tutar (`deltaUygula` birikimlidir).
   */
  adlar?: Record<OyuncuId, string>;
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

/** Blokların kapladığı hücre kimlikleri ("x:y"), blok sırasıyla ve her blokta (y, x) sırasıyla (listeyi açmak gerekirse). */
export function blokHucreleri(blok: readonly KamuBlogu[]): string[] {
  const sonuc: string[] = [];
  for (const [x0, y0, x1, y1] of blok) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sonuc.push(`${x}:${y}`);
  return sonuc;
}

/** Hücre kamu bloklarından birinde mi? Tür ve sahip döner (istemci hücre kartı için; sunucuya sormaz). */
export function kamuBilgisiBul(kamu: readonly KamuGrubuKaresi[] | undefined, hucre: string): { tur: KamuGrubu["tur"]; sahip: string } | undefined {
  if (kamu === undefined) return undefined;
  const i = hucre.indexOf(":");
  const x = Number(hucre.slice(0, i));
  const y = Number(hucre.slice(i + 1));
  if (i <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  for (const g of kamu) for (const [x0, y0, x1, y1] of g.blok) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return { tur: g.tur, sahip: g.sahip };
  return undefined;
}

/**
 * İlçenin kamu grupları (çekirdeğin `kamuBloklari` API'si; bloklar (sahip, tür) sıralı); kamu kümesi dünya kurulurken donduğu için
 * (dünyanın mülk durumu başına, ilçe başına) bir kez hesaplanır ve saklanır: referans sabittir (deltada karşılaştırma ucuzdur).
 */
const kamuOnbellek = new WeakMap<object, Map<string, { adet: number; gruplar: KamuGrubuKaresi[] } | null>>();
function kamuKompakt(d: Dunya, ilce: string): { adet: number; gruplar: KamuGrubuKaresi[] } | undefined {
  const m = d.mulk;
  if (m === undefined) return undefined;
  let o = kamuOnbellek.get(m);
  if (!o) kamuOnbellek.set(m, (o = new Map()));
  let k = o.get(ilce);
  if (k === undefined) {
    const bloklar = kamuBloklari(d, ilce);
    if (bloklar.length === 0) k = null; // kural kapalı ya da ilçede kamu yok
    else {
      const gruplar: KamuGrubuKaresi[] = [];
      let adet = 0;
      for (const b of bloklar) {
        let g = gruplar[gruplar.length - 1];
        if (!g || g.sahip !== b.sahip || g.tur !== b.tur) gruplar.push((g = { sahip: b.sahip, tur: b.tur, blok: [] }));
        g.blok.push([b.x0, b.y0, b.x1, b.y1]);
        adet += (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
      }
      k = { adet, gruplar };
    }
    o.set(ilce, k);
  }
  return k ?? undefined;
}

/**
 * Sıcak yol: ilçenin ayrılmış hücreleri, kimliğe göre (JS dize sırası) sıralı. Kompakt hücre dizininden (`mk.dizin.ayrilmisListe`, önbellekli) okunur: büyük
 * BHI1 ilçesinde ilçe tanımının `hucreler` dizisi AÇILMAZ (`HucreDiziniBuyukHatasi`). JSON fikstürü ve BHI1 aynı listeyi verir (K3 eşdeğerlik testleri).
 */
function ayrilmisListeHesapla(mk: DerlenmisMulk, ilce: string): string[] {
  return [...mk.dizin.ayrilmisListe(ilce)];
}

/** İlçe başına ayrılmış hücre listesi (türetilmiş; çekirdek derlemesi başına bir kez hesaplanır, referans sabittir). */
const ayrilmisOnbellek = new WeakMap<DerlenmisMulk, Map<string, string[] | null>>();
function ayrilmisHucreler(mk: DerlenmisMulk, ilce: string): string[] | undefined {
  let m = ayrilmisOnbellek.get(mk);
  if (!m) ayrilmisOnbellek.set(mk, (m = new Map()));
  let l = m.get(ilce);
  if (l === undefined) {
    const liste = ayrilmisListeHesapla(mk, ilce);
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
      const olcekler = b.tesisler.flatMap((x): Array<[number, 1 | 2]> => (x.olcek === 1 || x.olcek === 2 ? [[x.id, x.olcek]] : []));
      if (olcekler.length > 0) girdi.ozel.tesisOlcek = olcekler;
    }
    bolgeler.push(girdi);
  }
  const kare: IlgiKaresi = { t: d.zaman, bolgeler, fiyat: [...d.pazar.fiyat] };
  // Görünen ad için karede geçen sahipler (yalnız `secenek.adlar` verilmişse toplanır).
  const sahipler: Set<string> | null = secenek.adlar ? new Set<string>() : null;
  if (sahipler) {
    if (oyuncu !== null) sahipler.add(oyuncu);
    for (const b of bolgeler) if (b.genel.sahip !== null) sahipler.add(b.genel.sahip);
  }
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
      const yontemler = d.insaatlar.filter((x) => x.sahip === oyuncu && x.yontem !== undefined).map((x): [number, string] => [x.id, x.yontem as string]);
      if (yontemler.length > 0) kare.oyuncu.insaatYontem = yontemler;
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
        if (mo.katilimIlcesi !== undefined) kare.oyuncu.mulk.katilimIlcesi = mo.katilimIlcesi;
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
        // `hedef` türe göre değişir: "tesis" inşaatında tesis TÜRÜ indeksi, "olcek" (yerinde yükseltme) inşaatında yükseltilen TESİSİN kimliği
        // (türü hedef tesisten alınır; ek yapı yükseltiliyorsa onun türü).
        insaatTuru.set(i.id, i.tur === "olcek" ? (tesisTuru.get(i.hedef) ?? "") : (i.ekYapi ?? kaynak.ic.tesisTurleri[i.hedef]?.id ?? ""));
      }
    };
    for (const h of m.hucreler) {
      if (!istenen.has(h.ilce)) continue;
      let liste = hucreler.get(h.ilce);
      if (!liste) hucreler.set(h.ilce, (liste = []));
      sahipler?.add(h.sahip);
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
        if ((c.ayrilmisSatilmis ?? 0) > 0) girdi.ayrilmisSatilmis = c.ayrilmisSatilmis as number;
        const ayrilmis = mk ? ayrilmisHucreler(mk, c.id) : undefined;
        if (ayrilmis) {
          girdi.ayrilmisAdet = ayrilmis.length;
          if (secenek.ayrilmisListesi === true) girdi.ayrilmis = ayrilmis;
        }
        const k = kamuKompakt(d, c.id);
        if (k) {
          girdi.kamuAdet = k.adet;
          if (secenek.kamuListesi === true) girdi.kamu = k.gruplar;
        }
        return girdi;
      });
  }
  if (sahipler && secenek.adlar) {
    const adlar: Record<OyuncuId, string> = {};
    for (const id of [...sahipler].sort()) {
      const ad = secenek.adlar(id);
      if (ad !== undefined) adlar[id] = ad;
    }
    if (Object.keys(adlar).length > 0) kare.adlar = adlar;
  }
  return kare;
}

function ayni(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** İlçe girdisi eşitliği; büyük `ayrilmis` listesi önce referansla (kare başına aynı önbellek dizisi) karşılaştırılır. */
function ilceAyni(a: IlceKaresi, b: IlceKaresi): boolean {
  if (a.ayrilmis !== b.ayrilmis && !ayni(a.ayrilmis, b.ayrilmis)) return false;
  if (a.kamu !== b.kamu && !ayni(a.kamu, b.kamu)) return false;
  const { ayrilmis: _a, kamu: _k, ...x } = a;
  const { ayrilmis: _b, kamu: _l, ...y } = b;
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
  // Görünen adlar: yalnız yeni ya da değişen girdiler (sıralı).
  if (yeni.adlar !== undefined) {
    const degisen: Record<OyuncuId, string> = {};
    for (const id of Object.keys(yeni.adlar).sort()) if (eski.adlar?.[id] !== yeni.adlar[id]) degisen[id] = yeni.adlar[id] as string;
    if (Object.keys(degisen).length > 0) delta.adlar = degisen;
  }
  if (eski.ilceler !== undefined || yeni.ilceler !== undefined) {
    const eskiIlce = new Map((eski.ilceler ?? []).map((c) => [c.id, c]));
    const yeniIlce = new Set((yeni.ilceler ?? []).map((c) => c.id));
    const degisen: IlceKaresi[] = [];
    for (const c of yeni.ilceler ?? []) {
      const e = eskiIlce.get(c.id);
      if (e !== undefined && ilceAyni(e, c)) continue;
      // Ayrılmış hücre kümesi değişmezdir: ilçe zaten istemcideyse delta taşımaz (kare boyutu).
      if (e !== undefined && ((c.ayrilmis !== undefined && ayni(e.ayrilmis, c.ayrilmis)) || (c.kamu !== undefined && ayni(e.kamu, c.kamu)))) {
        const kalan = { ...c };
        if (c.ayrilmis !== undefined && ayni(e.ayrilmis, c.ayrilmis)) delete kalan.ayrilmis;
        if (c.kamu !== undefined && ayni(e.kamu, c.kamu)) delete kalan.kamu;
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
    delta.cikanIlceler === undefined &&
    delta.adlar === undefined
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
  // Adlar birikimlidir: önceki adlar + delta'daki yeni/değişenler (anahtarlar sıralı).
  if (kare.adlar !== undefined || delta.adlar !== undefined) {
    const birlesik: Record<OyuncuId, string> = { ...kare.adlar, ...delta.adlar };
    const sirali: Record<OyuncuId, string> = {};
    for (const id of Object.keys(birlesik).sort()) sirali[id] = birlesik[id] as string;
    yeni.adlar = sirali;
  }
  if (kare.ilceler !== undefined || delta.ilceler !== undefined) {
    const ilce = new Map((kare.ilceler ?? []).map((c) => [c.id, c]));
    for (const c of delta.cikanIlceler ?? []) ilce.delete(c);
    for (const c of delta.ilceler ?? []) {
      const onceki = ilce.get(c.id);
      // `ayrilmis` ve `kamu` yoksa önceki girdiden korunur (değişmezdir).
      const girdi = { ...c };
      if (c.ayrilmis === undefined && onceki?.ayrilmis !== undefined) girdi.ayrilmis = onceki.ayrilmis;
      if (c.kamu === undefined && onceki?.kamu !== undefined) girdi.kamu = onceki.kamu;
      ilce.set(c.id, girdi);
    }
    yeni.ilceler = [...ilce.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  return yeni;
}

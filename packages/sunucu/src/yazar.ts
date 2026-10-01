/**
 * Dünya yazarı: paylaşılan dünyanın TEK YAZARI (ağdan bağımsız; WebSocket katmanı `sunucu.ts`'te).
 *
 * Komut yolu (yazma-önce-günlük):
 * 1. `komutGonder`: idempotans tablosuna bakılır (aynı (oyuncu, istemci, anahtar) ikinci kez kuyruğa girmez); yeni
 *    komut sunucu zamanıyla DAMGALANIR (`t = max(saat, son damga, dünya zamanı)`; istemci zamanı yok sayılır) ve
 *    bekleyenler kuyruğuna girer.
 * 2. Her tur (`commitAraligiMs`, 50–100 ms): bekleyenler seq alır, günlüğe TOPLU yazılır (`ekle` = fsync/commit),
 *    ANCAK SONRA sırayla `sim.uygula` edilir; sonuç idempotans tablosuna yazılır ve bekleyen yanıtlar çözülür.
 *    Günlük yazılamazsa hiçbir komut uygulanmamıştır: yazar durur (fail-stop), bellek ve günlük tutarlı kalır.
 * 3. Dünya `calistirKadar(min(saat, ilk bekleyen t))` ile ilerletilir (bekleyen komutun zamanını asla geçmez).
 * 4. Sunucu botları karar anlarında komut üretir (aynı yoldan: damga + günlük).
 * 5. Gerekirse anlık görüntü (her `goruntuAraligiMs` sim süresinde veya `goruntuKomutAraligi` komutta; açılışta
 *    görüntü yoksa ve kapanışta her zaman).
 * 6. Dinleyicilere (yayın) haber verilir.
 *
 * Başarısız komutlar da günlüğe girer (uygulamadan önce yazıldıkları için sonuç bilinmez). Çekirdek sözleşmesi
 * (docs/06 §14: başarısız komut durumu değiştirmez) ve determinizm sayesinde yeniden oynatmada aynı sonucu verirler;
 * kurtarma bu yüzden kalan günlüğü `Simulasyon.anlikGoruntudenYukle`'nin kuyruğu yerine tek tek `uygula` ile oynatır.
 *
 * Mutlak saat ve yetişme (sahip kararı: dünya sunucu kapalıyken de akar; docs/12 §7): `DuvarSaati` (hız 1) `t = duvar −
 * dunyaEpochMs` verir; epoch dünyayla birlikte anlık görüntü üst verisinde saklanır (yeni dünyada varsayılan
 * `VARSAYILAN_DUNYA_EPOCH_MS`, bir Türkiye gece yarısı). Açılışta görüntü + kalan günlük uygulandıktan sonra dünya
 * şimdiki duvar saatinin gerisindeyse `yetisiyor` olur ve ana döngü dünyayı `yetismeAdimMs`'lik (1 sim-saat) adımlarla
 * ilerletir: tur arası uyku yok (olay döngüsüne her adımda `setImmediate` ile nefes verilir), ilerleme ~1 sn'de bir
 * `yetismeDinle`'ye bildirilir, görüntü seyrek alınır, bitince bir görüntü alınır. SÖZLEŞME: yetişirken dışarıdan
 * gelen komut KUYRUKLANMAZ, `YetisiyorHatasi` ile REDDEDİLİR (günlüğe girmez; istemci bitişi `durum` mesajıyla öğrenip
 * aynı anahtarla yeniden dener; daha önce işlenmiş anahtarlar ilk sonuçla yanıtlanır). Kapalı geçen sürede komut
 * kabul edilmediği için kimse adaletsiz hareket etmiş olmaz. Sunucu botları yetişirken de dünya zamanında karar verir
 * (damga = dünyanın şimdiki zamanı). Duvar saati geri giderse sim zamanı geri gitmez (saat bekler, uyarı verilir).
 * KESİNTİ ADALETİ (çekirdek işi; burada YOK): kesinti > 15 dk ise rastgele olumsuz olayların "ön duyuru → etki"
 * geçişi kesinti kadar ötelenmeli (canli-dunya-simulasyonu.md §2.2); yetişme olayları şimdilik kesintisiz oynatır.
 *
 * İçerik göçü (docs/06 §14.2, `gocIzni`): kural sürümü farklıysa (içerik/parametre değişmiş) varsayılan HATA'dır (eski
 * davranış). `gocIzni: true` ile ve YALNIZ görüntüden sonra günlük kaydı yokken (dönem sınırı) görüntü
 * `anlikGoruntudenYukleSonuclu` ile göçürülür: üst verideki özet `goc.eskiDurumOzeti`'ne karşı denetlenir, hemen yeni
 * (güncel kural sürümlü, zarf v2) görüntü alınır ve `kurtarma.goc` doldurulur. Görüntüden sonra HER günlük kaydı eski kural
 * sürümüyle yazılmıştır (açılış hep görüntü + kuyruk; yeni kuralla hiç açılmamıştır) ve günlük kural sürümleri arasında
 * yeniden oynatılamaz (`ekim_plani.ekimPpm` gibi komutlar indeks sırasına bağlıdır): bu yüzden göç REDDEDİLİR, günlük
 * oynatılmaz. Kural: kayıtta kural sürümü alanı olmasa da görüntü seq'inden sonra kayıt sayısı > 0 ise ret yeterlidir.
 * Göç yeni görüntüyü eskisiyle AYNI seq/sim zamanında yazar: bu yüzden eski görüntü ÖNCE `depo.goruntu.yedekle` ile ayrı ve kalıcı
 * saklanır (yoksa/alınamazsa göç durur; pg deposu şimdilik göçü açıkça reddeder). `kurtarma.goc.yedek` yedeğin yeridir.
 * `yalnizEkleZorunlu` varsayılan AÇIK (içeriğe araya ekleme/yeniden sıralama üretimde reddedilir).
 *
 * Kurtarma: son anlık görüntü (`anlikGoruntudenYukle`: kural sürümü + zarf özeti denetimi; ek olarak üst verideki
 * özet karşılaştırılır) + görüntüden sonraki günlük kayıtları. Kurtarılan dünyanın zamanı, son kaydın `t`'si ile
 * görüntü zamanının büyüğüdür; canlı dünyayla karşılaştırma AYNI t'de yapılmalıdır (`calistirKadar(t)`, docs/06 §14).
 */
import { SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikGoruntuOlustur, kuralSurumuHesapla } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, IcerikKimlikTablosu, Komut, KomutSonucu, Ms, OyuncuId } from "@bolge/cekirdek";
import type { Bot } from "@bolge/botlar";
import type { Dizin } from "@bolge/protokol";
import { SEMA_SURUMU } from "./depo/tipler";
import type { AnlikGoruntuKaydi, Depo, GunlukKaydi, IdempotansGirdisi } from "./depo/tipler";
import { VARSAYILAN_DUNYA_EPOCH_MS, turkiyeGeceYarisiMi } from "./saat";
import type { Saat } from "./saat";

export interface YazarSecenekleri {
  /** İçerik + parametre + harita; mülk kipi için `parsel` fikstürü de (çekirdek `param.mulk` + `parsel` ile açar). */
  veri: CekirdekVeriPaketi;
  /** Yalnız ilk açılışta (depoda görüntü yokken) kullanılır. */
  tohum: number;
  depo: Depo;
  saat: Saat;
  /** Grup commit aralığı (ms, duvar saati). Varsayılan 75. */
  commitAraligiMs?: number;
  /** Bir turda günlüğe yazılacak en çok komut (küresel tavan). Varsayılan 2000. */
  enCokToplu?: number;
  /** Anlık görüntü aralığı (sim ms). Varsayılan 6 sim-saat. */
  goruntuAraligiMs?: Ms;
  /** Bu kadar komutta bir de anlık görüntü. Varsayılan 10 000. */
  goruntuKomutAraligi?: number;
  /** Bir turda dünyanın en çok ilerleyeceği sim süresi (geride kalınca döngüyü kilitlememek için). Varsayılan 6 sim-saat. */
  enCokAdimMs?: Ms;
  /** İdempotans tablosunun en çok girdisi (eskiler atılır). Varsayılan 20 000. */
  idempotansTavani?: number;
  /** Sunucu botları (yük üreteci / NPC oyuncu). Katılmamışsa bölgeleriyle katılır. */
  botlar?: SunucuBotu[];
  /** Bot karar aralığı (sim ms). Varsayılan 6 sim-saat. */
  botKararAraligiMs?: Ms;
  /**
   * YALNIZ yeni dünyada ve mutlak saatte: dünyanın duvar saati epoch'u (epoch ms; bir Türkiye gece yarısı olmalı ve
   * şimdiden ileri olmamalı). Varsayılan `VARSAYILAN_DUNYA_EPOCH_MS` (1 Ekim 2026 00:00 TRT). Var olan dünyada
   * saklanan epoch geçerlidir (bu alan yok sayılır).
   */
  dunyaEpochMs?: number;
  /** Yetişirken tur başına en çok sim ilerlemesi (≤ `enCokAdimMs`). Varsayılan 1 sim-saat. */
  yetismeAdimMs?: Ms;
  /** Dünya duvar saatinin bu kadar gerisindeyse "yetişiyor" sayılır. Varsayılan 1 sim-dakika. */
  yetismeEsigiMs?: Ms;
  /** Yetişirken anlık görüntü aralığı (sim ms; her 6 sim-saatte görüntü büyük boşlukta israftır). Varsayılan 24 sim-saat. */
  yetismeGoruntuAraligiMs?: Ms;
  /** Yetişme ilerleme bildirimlerinin en sık aralığı (ms, duvar). Varsayılan 1000. */
  ilerlemeAraligiMs?: number;
  /**
   * İçerik göçüne izin ver (varsayılan KAPALI: kural sürümü ya da özet uyuşmazsa hata). Yalnız dönem sınırında, görüntüden
   * sonra günlük kaydı yokken çalışır; bkz. dosya başlığı.
   */
  gocIzni?: boolean;
  /**
   * Yalnız zarf SÜRÜM 1 (tablosuz) bir görüntü başka kural sürümüyle göçürülürken: görüntünün yazıldığı içeriğin kimlik
   * tablosu (`icerikKimlikTablosuOlustur` çıktısı; CLI `--goc-eski-tablo`). Sürüm 2 görüntüler tablosunu kendisi taşır.
   */
  gocEskiTablo?: IcerikKimlikTablosu;
  /** Göçte içerik yalnız SONA eklenebilir (araya ekleme/taşıma hata). Varsayılan true (üretim); yalnız geliştirmede false. */
  yalnizEkleZorunlu?: boolean;
  /** Yetişirken her adımdan sonra çağrılır (test/enstrümantasyon: söz döndürerek yetişmeyi bekletebilir). */
  yetismeAdimKancasi?: (d: YetismeDurumu) => void | Promise<void>;
}

/** Açılışta yapılan içerik göçünün özeti (`GocRaporu`'ndan). */
export interface GocOzeti {
  /** Kimlik tabloları farklıydı: dünya yeniden indekslendi (özet görüntününkinden farklı olur). */
  yenidenIndekslendi: boolean;
  eskiKuralSurumu: string;
  yeniKuralSurumu: string;
  /** Yalnızca sona ekleme miydi. */
  yalnizEkle: boolean;
  /** Eklenen kimlikler (uzay -> kimlikler) ve toplam sayısı. */
  eklenen: Record<string, string[]>;
  eklenenSayisi: number;
  /** Göç öncesi görüntünün yedeği (depo `yedekle`'sinin döndürdüğü yer/etiket); üzerine yazılmadan ÖNCE alınır. */
  yedek: string;
  /** Yalnız-ekle ihlali sayısı (`yalnizEkleZorunlu` kapalıyken > 0 olabilir). */
  ihlalSayisi: number;
}

/** Yetişme (kapalıyken geçen süreyi işletme) ilerlemesi. */
export interface YetismeDurumu {
  yetisiyor: boolean;
  /** Dünyanın şimdiki zamanı ve ulaşılacak hedef (duvar saatinin şimdiki sim zamanı). */
  simZamani: Ms;
  hedefZamani: Ms;
  kalanMs: Ms;
  /** Yetişmenin başlangıcından beri geçen duvar süresi (ms) ve atılan adım sayısı. */
  gecenSureMs: number;
  adim: number;
}

/** Yetişirken dışarıdan gelen komut kuyruklanmaz, bununla reddedilir (günlüğe girmemiştir; yeniden denenebilir). */
export class YetisiyorHatasi extends Error {
  constructor() {
    super("sunucu kapaliyken gecen sureyi yetistiriyor; bitince ayni anahtarla yeniden deneyin");
    this.name = "YetisiyorHatasi";
  }
}

export interface SunucuBotu {
  bot: Bot;
  bolgeler: string[];
}

export interface KomutYaniti {
  seq: number;
  t: Ms;
  komut: Komut;
  sonuc: KomutSonucu;
  /** Anahtar daha önce işlenmişti; ilk sonuç döndü. */
  tekrar: boolean;
}

export interface KurtarmaRaporu {
  /** Kullanılan görüntünün seq'i (görüntü yoksa null). */
  goruntuSeq: number | null;
  goruntuZamani: Ms | null;
  /** Görüntüden sonra yeniden oynatılan günlük kaydı sayısı ve bunların başarısız olanları. */
  kalanKayit: number;
  kalanBasarisiz: number;
  seq: number;
  simZamani: Ms;
  durumOzeti: string;
  sureMs: number;
  /** Dünyanın duvar saati epoch'u (mutlak saatte; elle saatli eski dünyada null). */
  dunyaEpochMs: number | null;
  /** İçerik göçü yapıldıysa özeti (yoksa null). */
  goc: GocOzeti | null;
  /** Açılışta duvar saatinin gerisinde kalan sim süresi (yetişilecek miktar; mutlak saat değilse 0). */
  yetisecekMs: Ms;
  /** Açılışta duvar saati dünya zamanının gerisindeyse (saat geri gitmiş) fark; yoksa 0. Dünya geri gitmez, saat bekler. */
  saatGeriMs: Ms;
}

export interface TurOlayi {
  /** Bu turda uygulanan komut sayısı (başarılı + başarısız) ve başarılı olanlar. */
  uygulanan: number;
  basarili: number;
  /** Dünya zamanı ilerledi mi. */
  ilerledi: boolean;
}

interface Bekleyen {
  t: Ms;
  oyuncu: OyuncuId;
  istemci: string;
  anahtar: string;
  komut: Komut;
  girdi: IdempotansKaydi;
}

interface IdempotansKaydi {
  oyuncu: OyuncuId;
  istemci: string;
  anahtar: string;
  seq: number;
  t: Ms;
  komut: Komut;
  sonuc: KomutSonucu | null;
  bekleyenler: Array<{ coz: (y: KomutYaniti) => void; reddet: (e: Error) => void }>;
}

interface BotDurumu {
  b: SunucuBotu;
  katildi: boolean;
  sonIzgara: number;
}

function idempotansAnahtari(oyuncu: string, istemci: string, anahtar: string): string {
  return `${oyuncu}\u0000${istemci}\u0000${anahtar}`;
}

function uyku(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class DunyaYazari {
  readonly kuralSurumu: string;
  readonly commitAraligiMs: number;
  private readonly enCokToplu: number;
  private readonly goruntuAraligiMs: Ms;
  private readonly goruntuKomutAraligi: number;
  private readonly enCokAdimMs: Ms;
  private readonly idempotansTavani: number;
  private readonly botKararAraligiMs: Ms;
  private readonly yetismeAdimMs: Ms;
  private readonly yetismeEsigiMs: Ms;
  private readonly yetismeGoruntuAraligiMs: Ms;
  private readonly ilerlemeAraligiMs: number;

  /** Dünyanın duvar saati epoch'u (görüntü üst verisine yazılır); elle saatli yeni dünyada null. */
  private dunyaEpochMsDegeri: number | null = null;
  private yetisiyorDegeri = false;
  private yetisme: { bas: number; adim: number; sonBildirim: number } | null = null;
  private readonly yetismeDinleyicileri: Array<(d: YetismeDurumu) => void> = [];
  private yetismeBekleyenleri: Array<() => void> = [];
  private saatGeride = false;
  /** Son uygulanan (= son günlüğe yazılan) seq. */
  private seqDegeri = 0;
  private sonDamga: Ms = 0;
  private bekleyenler: Bekleyen[] = [];
  private readonly idempotans = new Map<string, IdempotansKaydi>();
  private sonGoruntuZamani: Ms = 0;
  private sonGoruntuSeq = 0;
  private readonly botlar: BotDurumu[] = [];
  private botAnahtarSayaci = 0;
  private readonly dinleyiciler: Array<(o: TurOlayi) => void> = [];
  private durgunlukBekleyenleri: Array<{ t: Ms; coz: () => void }> = [];
  private calisiyor = false;
  private dongu: Promise<void> | null = null;
  private olumcul: Error | null = null;
  private olumculDinleyici: ((e: Error) => void) | null = null;
  private uyariDinleyici: ((m: string) => void) | null = null;
  /** Son başarısız anlık görüntü denemesinin hatası (başarılı görüntüde temizlenir). */
  sonGoruntuHatasi: string | null = null;

  private constructor(
    readonly sim: Simulasyon,
    private readonly s: YazarSecenekleri,
    readonly kurtarma: KurtarmaRaporu,
  ) {
    this.kuralSurumu = kuralSurumuHesapla(s.veri);
    this.commitAraligiMs = s.commitAraligiMs ?? 75;
    this.enCokToplu = s.enCokToplu ?? 2000;
    this.goruntuAraligiMs = s.goruntuAraligiMs ?? 6 * SAAT;
    this.goruntuKomutAraligi = s.goruntuKomutAraligi ?? 10_000;
    this.enCokAdimMs = s.enCokAdimMs ?? 6 * SAAT;
    this.idempotansTavani = s.idempotansTavani ?? 20_000;
    this.botKararAraligiMs = s.botKararAraligiMs ?? 6 * SAAT;
    this.yetismeAdimMs = Math.max(1, Math.min(s.yetismeAdimMs ?? SAAT, this.enCokAdimMs));
    this.yetismeEsigiMs = s.yetismeEsigiMs ?? 60_000;
    this.yetismeGoruntuAraligiMs = s.yetismeGoruntuAraligiMs ?? 24 * SAAT;
    this.ilerlemeAraligiMs = s.ilerlemeAraligiMs ?? 1000;
  }

  /** Depodan kurtarır (görüntü + kalan günlük) ya da yeni dünya kurar; saati dünyanın zamanından başlatır. */
  static async ac(s: YazarSecenekleri): Promise<DunyaYazari> {
    const bas = performance.now();
    const kuralSurumu = kuralSurumuHesapla(s.veri);
    const g = await s.depo.goruntu.sonuncu();
    let sim: Simulasyon;
    let seq = 0;
    let idempotansGirdileri: IdempotansGirdisi[] = [];
    let goc: GocOzeti | null = null;
    if (g) {
      const kuralFarkli = g.kuralSurumu !== kuralSurumu;
      if (kuralFarkli && s.gocIzni !== true) {
        throw new Error(`kural surumu uyusmuyor: goruntu ${g.kuralSurumu}, veri ${kuralSurumu} (donem sinirinda goc gerekir: gocIzni / --goc)`);
      }
      if (g.semaSurumu !== SEMA_SURUMU) throw new Error(`desteklenmeyen goruntu sema surumu: ${g.semaSurumu}`);
      if (kuralFarkli) {
        // Göç yalnız dönem sınırında: görüntüden sonra yazılmış her kayıt ESKİ kural sürümüyledir ve oynatılamaz.
        const arta = await s.depo.gunluk.oku(g.seq);
        if (arta.length > 0) {
          throw new Error(
            `goc yalniz donem sinirinda: goruntuden (seq ${g.seq}) sonra ${arta.length} gunluk kaydi var (eski kural surumu ${g.kuralSurumu}); ` +
              "once eski kural surumuyle acip goruntu alin (duzgun kapanista kuyruk bosalir), sonra goc edin; gunluk yeniden oynatilmadi",
          );
        }
        const r = Simulasyon.anlikGoruntudenYukleSonuclu(s.veri, g.metin, [], { gocIzni: true, yalnizEkleZorunlu: s.yalnizEkleZorunlu ?? true, ...(s.gocEskiTablo ? { eskiTablo: s.gocEskiTablo } : {}) });
        sim = r.sim;
        // Üst verideki özet YAZILDIĞI HALİYLE dünyanındır: göçte `goc.eskiDurumOzeti`ne karşı denetlenir.
        if (r.goc.eskiDurumOzeti !== g.durumOzeti) throw new Error(`goruntu ust verisindeki ozet uyusmuyor (goc): ${g.durumOzeti} != ${r.goc.eskiDurumOzeti}`);
        if (!r.goc.yenidenIndekslendi && sim.durumOzeti() !== g.durumOzeti) throw new Error(`goruntu ust verisindeki ozet uyusmuyor: ${g.durumOzeti} != ${sim.durumOzeti()}`);
        // Yeni görüntü eskisiyle AYNI seq/sim zamanında yazılacağından önce göç öncesi görüntü AYRI ve KALICI yedeklenir
        // (doğrulama bittikten sonra, hiçbir şey değişmeden): yedek yoksa/alınamazsa göç durur, depo ve dünya değişmez.
        const yedekle = s.depo.goruntu.yedekle;
        if (!yedekle) throw new Error("goc reddedildi: depo goruntu yedegi (goruntu.yedekle) desteklemiyor; goc yedek almadan eski goruntunun uzerine yazmaz");
        let yedek: string;
        try {
          yedek = await yedekle.call(s.depo.goruntu, g, `goc-${g.kuralSurumu}`);
        } catch (e) {
          throw new Error(`goc yedegi alinamadi (${e instanceof Error ? e.message : String(e)}); goc durdu, depo ve dunya degismedi`);
        }
        goc = {
          yenidenIndekslendi: r.goc.yenidenIndekslendi,
          eskiKuralSurumu: r.goc.eskiKuralSurumu,
          yeniKuralSurumu: r.goc.yeniKuralSurumu,
          yalnizEkle: r.goc.yalnizEkle,
          eklenen: { ...r.goc.eklenen },
          eklenenSayisi: Object.values(r.goc.eklenen).reduce((n, l) => n + l.length, 0),
          yedek,
          ihlalSayisi: r.goc.ihlaller.length,
        };
      } else {
        sim = Simulasyon.anlikGoruntudenYukle(s.veri, g.metin);
        const ozet = sim.durumOzeti();
        if (ozet !== g.durumOzeti) throw new Error(`goruntu ust verisindeki ozet uyusmuyor: ${g.durumOzeti} != ${ozet}`);
      }
      seq = g.seq;
      idempotansGirdileri = g.ek.idempotans;
    } else {
      sim = Simulasyon.olustur(s.veri, s.tohum);
    }
    const kalan = await s.depo.gunluk.oku(seq);
    const y = new DunyaYazari(sim, s, {
      goruntuSeq: g ? g.seq : null,
      goruntuZamani: g ? g.simZamani : null,
      kalanKayit: kalan.length,
      kalanBasarisiz: 0,
      seq: 0,
      simZamani: 0,
      durumOzeti: "",
      sureMs: 0,
      dunyaEpochMs: null,
      goc,
      yetisecekMs: 0,
      saatGeriMs: 0,
    });
    for (const e of idempotansGirdileri) {
      y.idempotans.set(idempotansAnahtari(e.oyuncu, e.istemci, e.anahtar), { oyuncu: e.oyuncu, istemci: e.istemci, anahtar: e.anahtar, seq: e.seq, t: e.t, komut: e.komut, sonuc: e.tamam ? { tamam: true } : { tamam: false, hata: e.hata ?? "" }, bekleyenler: [] });
    }
    y.seqDegeri = seq;
    for (const k of kalan) {
      if (k.seq !== y.seqDegeri + 1) throw new Error(`gunluk seq boslugu: ${y.seqDegeri} -> ${k.seq}`);
      if (k.kuralSurumu !== kuralSurumu) throw new Error(`gunluk kaydi ${k.seq} farkli kural surumuyle yazilmis: ${k.kuralSurumu}`);
      const r = sim.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
      if (!r.tamam) y.kurtarma.kalanBasarisiz++;
      y.seqDegeri = k.seq;
      y.idempotansYaz(idempotansAnahtari(k.oyuncu, k.istemci, k.anahtar), { oyuncu: k.oyuncu, istemci: k.istemci, anahtar: k.anahtar, seq: k.seq, t: k.t, komut: k.komut, sonuc: r, bekleyenler: [] });
    }
    y.yerlestir();
    y.sonDamga = sim.dunya.zaman;
    y.sonGoruntuZamani = g ? g.simZamani : sim.dunya.zaman;
    y.sonGoruntuSeq = g ? g.seq : 0;
    // Saat ve dünya epoch'u. Mutlak saatte epoch dünyayla saklanır; yoksa (yeni dünya ya da eski görüntü) bağlanır.
    let epoch: number | null = g?.ek.dunyaEpochMs ?? null;
    let epochYeni = false;
    if (s.saat.mutlak) {
      const duvar = s.saat.duvarMs() as number;
      if (epoch === null) {
        epochYeni = true;
        if (g) {
          // Epoch'suz eski dünya: "şimdi = dünyanın şimdiki zamanı" (o ana kadar kapalı süre sayılmaz).
          epoch = duvar - sim.dunya.zaman;
        } else {
          epoch = s.dunyaEpochMs ?? VARSAYILAN_DUNYA_EPOCH_MS;
          if (!turkiyeGeceYarisiMi(epoch)) throw new Error(`dunyaEpochMs bir Turkiye gece yarisi olmali (UTC+3): ${epoch}`);
          if (epoch > duvar) throw new Error(`dunyaEpochMs gelecekte: ${epoch} > simdi ${duvar}`);
        }
      }
      s.saat.baslat(sim.dunya.zaman, epoch);
    } else {
      epoch ??= s.dunyaEpochMs ?? null;
      s.saat.baslat(sim.dunya.zaman);
    }
    y.dunyaEpochMsDegeri = epoch;
    y.kurtarma.dunyaEpochMs = epoch;
    y.kurtarma.saatGeriMs = s.saat.gerideMs;
    y.yetisiyorDegeri = y.yetisiyorHesapla();
    if (y.yetisiyorDegeri) y.yetisme = { bas: performance.now(), adim: 0, sonBildirim: Number.NEGATIVE_INFINITY };
    y.kurtarma.yetisecekMs = s.saat.mutlak ? Math.max(0, s.saat.simdi() - sim.dunya.zaman) : 0;
    for (const b of s.botlar ?? []) {
      const katildi = sim.dunya.oyuncular.some((o) => o.id === b.bot.oyuncu);
      y.botlar.push({ b, katildi, sonIzgara: Math.floor(sim.dunya.zaman / y.botKararAraligiMs) });
      if (!katildi) {
        y.komutAl(SISTEM_OYUNCUSU, "sunucu", `katil:${b.bot.oyuncu}`, { tur: "oyuncu_katil", oyuncu: b.bot.oyuncu, bolgeler: b.bolgeler }, true).catch(() => undefined);
      }
    }
    // Görüntü yoksa hemen al: tohum ve başlangıç durumu kalıcı olsun (sonraki açılışlar tohuma bağlı kalmaz).
    // Epoch yeni bağlandıysa da (eski dünya) hemen kalıcı olsun: çökme sonrası kapalı süre kaybolmasın.
    // Göçten hemen sonra yeni (güncel kural sürümlü, zarf v2) görüntü: sonraki açılış göçmez.
    if (!g || epochYeni || goc) await y.goruntuAl();
    Object.assign(y.kurtarma, { seq: y.seqDegeri, simZamani: sim.dunya.zaman, durumOzeti: sim.durumOzeti(), sureMs: Math.round(performance.now() - bas) });
    return y;
  }

  get seq(): number {
    return this.seqDegeri;
  }

  get bekleyenSayisi(): number {
    return this.bekleyenler.length;
  }

  get saat(): Saat {
    return this.s.saat;
  }

  /** Dünyanın duvar saati epoch'u (mutlak saatte); yoksa null. */
  get dunyaEpochMs(): number | null {
    return this.dunyaEpochMsDegeri;
  }

  /** Kapalı geçen süreyi yetiştiriyor: dışarıdan gelen komutlar `YetisiyorHatasi` ile reddedilir. */
  get yetisiyor(): boolean {
    return this.yetisiyorDegeri;
  }

  /** Dünya duvar saatinin bu kadar gerisindeyse (`yetismeEsigiMs`) yetişiyor sayılır; yalnız mutlak saatte. */
  private yetisiyorHesapla(): boolean {
    return this.s.saat.mutlak && this.s.saat.simdi() - this.sim.dunya.zaman > this.yetismeEsigiMs;
  }

  /** Yetişme ilerlemesi (yetişmiyorsa `yetisiyor: false`). */
  yetismeDurumu(): YetismeDurumu {
    const hedef = Math.max(this.s.saat.simdi(), this.sim.dunya.zaman);
    return {
      yetisiyor: this.yetisiyorDegeri,
      simZamani: this.sim.dunya.zaman,
      hedefZamani: hedef,
      kalanMs: hedef - this.sim.dunya.zaman,
      gecenSureMs: this.yetisme ? Math.round(performance.now() - this.yetisme.bas) : 0,
      adim: this.yetisme?.adim ?? 0,
    };
  }

  /** Yetişme bildirimi (~ilerlemeAraligiMs'de bir ve bitişte `yetisiyor: false` ile bir kez). */
  yetismeDinle(f: (d: YetismeDurumu) => void): void {
    this.yetismeDinleyicileri.push(f);
  }

  /** Yetişme bitince çözülür (yetişmiyorsa hemen). Döngü (`baslat`) ya da elle `birTur` çağrıları yetişmeyi ilerletir. */
  yetismeBekle(): Promise<void> {
    if (!this.yetisiyorDegeri) return Promise.resolve();
    return new Promise((coz) => this.yetismeBekleyenleri.push(coz));
  }

  dizin(): Dizin {
    const ic = this.sim.ic;
    return {
      bolgeler: this.sim.dunya.bolgeler.map((b) => b.id),
      mallar: ic.mallar.map((m) => m.id),
      tesisTurleri: ic.tesisTurleri.map((t) => t.id),
      yontemler: ic.yontemler.map((y) => y.id),
      birlikler: ic.birlikler.map((b) => b.id),
      teknolojiler: ic.teknolojiler.map((t) => t.id),
    };
  }

  /** Bu anahtar daha önce görüldü mü (bekliyor ya da bitti). Ağ katmanı hız sınırını yalnız yeni komutlara uygular. */
  anahtarVarMi(oyuncu: OyuncuId, istemci: string, anahtar: string): boolean {
    return this.idempotans.has(idempotansAnahtari(oyuncu, istemci, anahtar));
  }

  /**
   * Komutu damgalar ve kuyruğa alır; yanıt, komut günlüğe yazılıp uygulandıktan sonra çözülür. Aynı anahtar daha
   * önce görüldüyse yeniden kuyruğa girmez: ilk sonuç `tekrar: true` ile döner (bekliyorsa uygulanınca).
   */
  komutGonder(oyuncu: OyuncuId, istemci: string, anahtar: string, komut: Komut): Promise<KomutYaniti> {
    return this.komutAl(oyuncu, istemci, anahtar, komut, false);
  }

  /** `ic`: sunucunun kendi komutları (bot, açılış katılımı); yetişirken de kabul edilir ve dünya zamanıyla damgalanır. */
  private komutAl(oyuncu: OyuncuId, istemci: string, anahtar: string, komut: Komut, ic: boolean): Promise<KomutYaniti> {
    if (this.olumcul) return Promise.reject(this.olumcul);
    const ia = idempotansAnahtari(oyuncu, istemci, anahtar);
    const var_ = this.idempotans.get(ia);
    if (var_) {
      if (var_.sonuc) return Promise.resolve({ seq: var_.seq, t: var_.t, komut: var_.komut, sonuc: var_.sonuc, tekrar: true });
      return new Promise((coz, reddet) => var_.bekleyenler.push({ coz: (y) => coz({ ...y, tekrar: true }), reddet }));
    }
    if (!ic && this.yetisiyorDegeri) return Promise.reject(new YetisiyorHatasi());
    // Yetişirken duvar saati dünyadan çok ileridedir: sunucu komutları dünyanın şimdiki zamanında damgalanır.
    const t = this.yetisiyorDegeri ? Math.max(this.sonDamga, this.sim.dunya.zaman) : Math.max(this.s.saat.simdi(), this.sonDamga, this.sim.dunya.zaman);
    this.sonDamga = t;
    const girdi: IdempotansKaydi = { oyuncu, istemci, anahtar, seq: 0, t, komut: structuredClone(komut), sonuc: null, bekleyenler: [] };
    this.idempotansYaz(ia, girdi);
    this.bekleyenler.push({ t, oyuncu, istemci, anahtar, komut: girdi.komut, girdi });
    return new Promise((coz, reddet) => girdi.bekleyenler.push({ coz, reddet }));
  }

  private idempotansYaz(ia: string, g: IdempotansKaydi): void {
    this.idempotans.delete(ia);
    this.idempotans.set(ia, g);
    if (this.idempotans.size <= this.idempotansTavani) return;
    // En eski BİTMİŞ girdileri at (bekleyenler atılmaz).
    for (const [k, v] of this.idempotans) {
      if (this.idempotans.size <= this.idempotansTavani) break;
      if (v.sonuc) this.idempotans.delete(k);
    }
  }

  /** Tur sonu dinleyicisi (yayın için). */
  dinle(f: (o: TurOlayi) => void): void {
    this.dinleyiciler.push(f);
  }

  /** Ölümcül hata (günlük yazılamadı vb.) dinleyicisi; yazar bundan sonra komut kabul etmez. */
  olumculHata(f: (e: Error) => void): void {
    this.olumculDinleyici = f;
  }

  /**
   * Dünya `t`'ye (verilmezse saatin şimdisine) ulaşıp kuyruk boşalınca çözülür. Elle saatte zamanIlerlet'in yanıtı ve
   * testler için "her şey uygulandı" noktasıdır.
   */
  durgunlukBekle(t?: Ms): Promise<void> {
    return new Promise((coz) => this.durgunlukBekleyenleri.push({ t: t ?? this.s.saat.simdi(), coz }));
  }

  /**
   * Dünyayı şu anki zamanına yerleştirir: `calistirKadar(zaman)`, yani aynı t'de bekleyen olayları (komutun planladığı
   * `cozum` gibi) işler. Değer korur: o t'de gelecek her komut `uygula` içinde zaten önce bunu yapar; yalnız özet ve
   * görüntünün "aynı t'de calistirKadar(t)" noktasında alınmasını sağlar (docs/06 §14).
   */
  private yerlestir(): void {
    this.sim.calistirKadar(this.sim.dunya.zaman);
  }

  /** O anki (tutarlı, t'ye yerleşmiş) durumun özeti: tur arasında çağrılır; `seq`'e kadar her komut uygulanmıştır. */
  ozet(): { t: Ms; seq: number; durumOzeti: string } {
    this.yerlestir();
    return { t: this.sim.dunya.zaman, seq: this.seqDegeri, durumOzeti: this.sim.durumOzeti() };
  }

  baslat(): void {
    if (this.calisiyor) return;
    this.calisiyor = true;
    this.dongu = (async () => {
      while (this.calisiyor) {
        const bas = performance.now();
        await this.birTur();
        if (this.olumcul) break;
        // Yetişirken uyku yok (aksi halde yıllık boşluk saatlerce sürer); olay döngüsüne her adımda nefes verilir.
        if (this.yetisiyorDegeri) await new Promise<void>((r) => setImmediate(r));
        else await uyku(Math.max(1, this.commitAraligiMs - (performance.now() - bas)));
      }
    })();
  }

  /** Döngüyü durdurur, kuyruğu son kez yazar ve uygular, kapanış görüntüsünü alır, depoyu kapatır. */
  async kapat(): Promise<void> {
    this.calisiyor = false;
    await this.dongu;
    this.dongu = null;
    for (const c of this.yetismeBekleyenleri.splice(0)) c();
    if (!this.olumcul) {
      while (this.bekleyenler.length > 0) await this.birTur(false);
      await this.goruntuDene();
    }
    await this.s.depo.gunluk.kapat();
    await this.s.depo.goruntu.kapat();
  }

  /** Bir grup commit turu (döngü dışında testlerden de çağrılabilir). */
  async birTur(ilerlet = true): Promise<void> {
    if (this.olumcul) return;
    const zaman0 = this.sim.dunya.zaman;
    let uygulanan = 0;
    let basarili = 0;
    // 1. Günlüğe yaz (önce), sonra uygula.
    const toplu = this.bekleyenler.splice(0, this.enCokToplu);
    if (toplu.length > 0) {
      const kayitlar: GunlukKaydi[] = toplu.map((b, i) => ({
        seq: this.seqDegeri + 1 + i,
        t: b.t,
        oyuncu: b.oyuncu,
        komut: b.komut,
        istemci: b.istemci,
        anahtar: b.anahtar,
        kuralSurumu: this.kuralSurumu,
        semaSurumu: SEMA_SURUMU,
      }));
      try {
        await this.s.depo.gunluk.ekle(kayitlar);
      } catch (e) {
        this.olumculYap(e instanceof Error ? e : new Error(String(e)), toplu);
        return;
      }
      for (let i = 0; i < toplu.length; i++) {
        const b = toplu[i] as Bekleyen;
        const k = kayitlar[i] as GunlukKaydi;
        const sonuc = this.sim.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
        this.seqDegeri = k.seq;
        uygulanan++;
        if (sonuc.tamam) basarili++;
        b.girdi.seq = k.seq;
        b.girdi.sonuc = sonuc;
        const yanit: KomutYaniti = { seq: k.seq, t: k.t, komut: k.komut, sonuc, tekrar: false };
        for (const w of b.girdi.bekleyenler.splice(0)) w.coz(yanit);
      }
    }
    // 2. Dünyayı ilerlet (bekleyen bir komutun zamanını geçmeden).
    if (ilerlet) {
      let hedef = this.s.saat.simdi();
      const ilk = this.bekleyenler[0];
      if (ilk) hedef = Math.min(hedef, ilk.t);
      hedef = Math.min(hedef, this.sim.dunya.zaman + (this.yetisiyorDegeri ? this.yetismeAdimMs : this.enCokAdimMs));
      // `>=`: zaman ilerlemese bile aynı t'deki bekleyen olaylar (ör. son komutun planladığı `cozum`) işlenir; tur
      // sonundaki dünya her zaman "t'ye yerleşmiş" durumdur (docs/06 §14: karşılaştırma aynı t'de calistirKadar(t)).
      if (hedef >= this.sim.dunya.zaman) this.sim.calistirKadar(hedef);
    } else {
      this.yerlestir();
    }
    // 3. Sunucu botları.
    this.botTuru();
    // 4. Anlık görüntü.
    const goruntuAraligi = this.yetisiyorDegeri ? Math.max(this.goruntuAraligiMs, this.yetismeGoruntuAraligiMs) : this.goruntuAraligiMs;
    if (this.sim.dunya.zaman - this.sonGoruntuZamani >= goruntuAraligi || this.seqDegeri - this.sonGoruntuSeq >= this.goruntuKomutAraligi) {
      await this.goruntuDene();
    }
    // 4b. Yetişme durumu ve saat geri gitme denetimi.
    await this.yetismeGuncelle();
    this.saatDenetle();
    // 5. Durgunluk bekleyenleri.
    if (this.bekleyenler.length === 0 && this.durgunlukBekleyenleri.length > 0) {
      const z = this.sim.dunya.zaman;
      const kalan: typeof this.durgunlukBekleyenleri = [];
      for (const w of this.durgunlukBekleyenleri) {
        if (z >= w.t) w.coz();
        else kalan.push(w);
      }
      this.durgunlukBekleyenleri = kalan;
    }
    // 6. Yayın.
    const olay: TurOlayi = { uygulanan, basarili, ilerledi: this.sim.dunya.zaman > zaman0 };
    for (const f of this.dinleyiciler) f(olay);
  }

  /** Tur sonu: yetişme sürüyor mu, ilerleme bildirimi, bitişte görüntü + bekleyenleri çöz. */
  private async yetismeGuncelle(): Promise<void> {
    const once = this.yetisiyorDegeri;
    const simdi = this.yetisiyorHesapla();
    this.yetisiyorDegeri = simdi;
    if (!once && !simdi) return;
    const an = performance.now();
    if (!once) this.yetisme = { bas: an, adim: 0, sonBildirim: Number.NEGATIVE_INFINITY };
    const y = this.yetisme as { bas: number; adim: number; sonBildirim: number };
    if (simdi) {
      y.adim++;
      if (an - y.sonBildirim >= this.ilerlemeAraligiMs) {
        y.sonBildirim = an;
        this.yetismeBildir();
      }
      await this.s.yetismeAdimKancasi?.(this.yetismeDurumu());
      return;
    }
    // Bitti: yetişme boyunca seyrek alınan görüntü yerine tam bir görüntü (çökme sonrası yeniden yetişme kısa kalsın).
    await this.goruntuDene();
    this.yetismeBildir();
    this.yetisme = null;
    for (const c of this.yetismeBekleyenleri.splice(0)) c();
  }

  private yetismeBildir(): void {
    const d = this.yetismeDurumu();
    for (const f of this.yetismeDinleyicileri) f(d);
  }

  /** Duvar saati geri gittiyse bir kez uyarır (sim zamanı geri gitmez; saat eski değere ulaşana kadar bekler). */
  private saatDenetle(): void {
    const geri = this.s.saat.gerideMs;
    if (geri > 0 && !this.saatGeride) {
      this.saatGeride = true;
      this.uyariDinleyici?.(`duvar saati geri gitti (${geri} ms); sim zamani geri gitmez, saat eski degere ulasana kadar bekliyor`);
    } else if (geri === 0) {
      this.saatGeride = false;
    }
  }

  private botTuru(): void {
    const z = this.sim.dunya.zaman;
    const izgara = Math.floor(z / this.botKararAraligiMs);
    for (const d of this.botlar) {
      let karar = false;
      if (!d.katildi) {
        if (!this.sim.dunya.oyuncular.some((o) => o.id === d.b.bot.oyuncu)) continue;
        d.katildi = true;
        karar = true;
      } else if (izgara > d.sonIzgara) {
        karar = true;
      }
      if (!karar) continue;
      d.sonIzgara = izgara;
      for (const komut of d.b.bot.karar(this.sim)) {
        // Bot yanıtını bekleyen yok; sonuç idempotans tablosunda ve günlükte kalır.
        this.komutAl(d.b.bot.oyuncu, "sunucu-bot", `bot:${z}:${this.botAnahtarSayaci++}`, komut, true).catch(() => undefined);
      }
    }
  }

  /** Uyarı dinleyicisi (ör. anlık görüntü alınamadı; dünya ve günlük etkilenmez). */
  uyari(f: (m: string) => void): void {
    this.uyariDinleyici = f;
  }

  /**
   * Görüntü almayı dener; başarısızlık döngüyü durdurmaz (günlük sağlamdır, kurtarma daha eski görüntü + daha uzun
   * kuyrukla yapılır). Bir sonraki deneme bir görüntü aralığı sonradır.
   */
  private async goruntuDene(): Promise<void> {
    try {
      await this.goruntuAl();
      this.sonGoruntuHatasi = null;
    } catch (e) {
      this.sonGoruntuHatasi = e instanceof Error ? e.message : String(e);
      this.sonGoruntuZamani = this.sim.dunya.zaman;
      this.sonGoruntuSeq = this.seqDegeri;
      this.uyariDinleyici?.(`anlik goruntu alinamadi: ${this.sonGoruntuHatasi}`);
    }
  }

  /** Anlık görüntü alır ve kaydeder (bekleyen, henüz günlüğe yazılmamış komut görüntüye girmez; hepsi uygulanmamıştır). */
  async goruntuAl(): Promise<AnlikGoruntuKaydi> {
    this.yerlestir();
    const metin = anlikGoruntuOlustur(this.sim, this.kuralSurumu);
    // Zarf kanonik JSON'dur ve `durumOzeti` dünyadan SONRA gelir: son geçiş zarfınkidir (dünyayı ikinci kez özetlemeyiz).
    const ozetIndeksi = metin.lastIndexOf('"durumOzeti":"');
    const durumOzeti = metin.slice(ozetIndeksi + 14, ozetIndeksi + 30);
    if (!/^[0-9a-f]{16}$/.test(durumOzeti)) throw new Error("anlik goruntu zarfinda durumOzeti bulunamadi");
    const idempotans: IdempotansGirdisi[] = [];
    for (const v of this.idempotans.values()) {
      if (!v.sonuc) continue;
      const ortak = { oyuncu: v.oyuncu, istemci: v.istemci, anahtar: v.anahtar, seq: v.seq, t: v.t, komut: v.komut };
      idempotans.push(v.sonuc.tamam ? { ...ortak, tamam: true } : { ...ortak, tamam: false, hata: v.sonuc.hata });
    }
    const g: AnlikGoruntuKaydi = {
      seq: this.seqDegeri,
      simZamani: this.sim.dunya.zaman,
      kuralSurumu: this.kuralSurumu,
      semaSurumu: SEMA_SURUMU,
      durumOzeti,
      metin,
      ek: { tohum: this.sim.dunya.tohum, ...(this.dunyaEpochMsDegeri !== null ? { dunyaEpochMs: this.dunyaEpochMsDegeri } : {}), idempotans },
    };
    await this.s.depo.goruntu.kaydet(g);
    this.sonGoruntuZamani = g.simZamani;
    this.sonGoruntuSeq = g.seq;
    return g;
  }

  private olumculYap(e: Error, toplu: Bekleyen[]): void {
    this.olumcul = new Error(`gunluk yazilamadi; yazar durdu: ${e.message}`);
    this.calisiyor = false;
    for (const b of [...toplu, ...this.bekleyenler]) for (const w of b.girdi.bekleyenler.splice(0)) w.reddet(this.olumcul);
    this.bekleyenler = [];
    this.olumculDinleyici?.(this.olumcul);
  }
}

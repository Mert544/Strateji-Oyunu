/**
 * Gerçek sunucuya WebSocket bağdaştırıcısı (F4): `MulkBaglantisi`'nı `@bolge/protokol` üzerinden konuşur.
 * `?sunucu=ws://host:port` (ve geliştirme token'ı `?token=...`) ile seçilir; sahte bağdaştırıcıyla aynı arayüzü sunar.
 *
 *   - El sıkışma: `merhaba` → `hosgeldin` (oyuncu kimliği token'dan çözülür; istemcinin söylediğine güvenilmez).
 *   - İlgi: `abone {ilceler}`. Kaynak başına küme tutulur (harita, Yerleş ekranı, sahiplik istekleri); gönderilen liste
 *     birleşimdir. Sunucuda olmayan ilçe `gecersiz_ilgi` ile reddedilir: ilçe "yok" işaretlenir ve abonelik onsuz yenilenir.
 *   - Kare/delta: `kare` tam kareyi koyar, `delta` bir önceki sürüme uygulanır (`deltaUygula`); sürüm kopukluğunda yeniden abone
 *     olunur (tam kare gelir).
 *   - Komut: idempotans anahtarıyla gönderilir; sonuç anahtarla eşleşir. Bağlantı kopsa bile bekleyen komutlar yeniden
 *     bağlanınca AYNI anahtarla yeniden gönderilir (sunucu ikinci kez uygulamaz). Hız sınırı (`hiz_siniri`) aynı anahtarla
 *     birkaç kez yeniden denenir.
 *   - Yeniden bağlanma: koparsa üstel geri çekilmeyle (0,5 s → 10 s) yeniden bağlanır; kimlik reddi (4003) denenmez.
 *   - Zaman eşitleme: `zamanIste`/`zaman` (NTP benzeri); sim zamanı = son bilinen sim zamanı + geçen gerçek süre × hız.
 *     Elle saatte (hız 0) sim zamanı karenin `t`'sidir.
 * Hazine ve stok formülle gelir (`stokAraDeger`): gösterilen sayı sunucudakiyle bit bit aynıdır.
 */
import type { HucreId, Komut, OyuncuId } from "@bolge/cekirdek";
import { KomutSemasi, PROTOKOL_SURUMU, deltaUygula, erkenOyunCarpani, stokAraDeger, sunucuMesajiCoz } from "@bolge/protokol";
import type { Defter, DonusOzeti, IlgiKaresi, IlceKaresi, IstemciMesaji, LojistikKenarGorunumu, SunucuMesaji } from "@bolge/protokol";
import type { BakimDuzeyiDegistirIstegi, PazarKaynagi, PazarSatisIstegi, PazarSatisSonucu, DukkanKaresi, DukkanKomutSonucu, GenelOnarimIstegi, GeriAlIstegi, HucreSahipligi, IlceSahipligi, IsletmeDurumu, IsletmeYapisi, MulkBaglantisi, MulkOzeti, OlcekIstegi, Oyuncu, ParselKomutu, ParselSonucu, TesisDurumDegistirIstegi, TesisKomutu, TesisSonucu, TicaretEmriIstegi, YapiKaydi, YerlestirIstegi, YontemDegistirIstegi } from "./baglanti";
import { hataHucresi, mulkHatasiTurkce, pazarHatasiTurkce, yontemHatasiTurkce } from "./hata-mulk";
import type { InsaatBilgisi } from "../yuru/arsa";
import type { AramaSondajiIstegi } from "./baglanti";
import { parselToplamFiyatiMili } from "./fiyat";
import { yapilardanInsaatlar } from "./yapi-yuruyus";
import { sureCarpani } from "./yapi-sure";
import type { ArastirmaSonucu, TeknolojiDurumu } from "./teknoloji-panel";
import type { OrduDurumu, OrduSonucu } from "./ordu-panel";
import type { TedarikDurumu } from "./tedarik-panel";

type Mesaj<T extends SunucuMesaji["tur"]> = Extract<SunucuMesaji, { tur: T }>;

/** Kamu teslim çekirdeğinin oyuncuya yönelik sabit Türkçe retleri; bilinmeyen iç hatalar gösterilmez. */
const KAMU_TESLIM_RET_MESAJLARI = new Set([
  "Kamu siparişleri kapalı.",
  "Sipariş bulunamadı; ilanı yenileyin.",
  "Teslim sırası değişmiş; ilanı yenileyin.",
  "Paket bedeli değişmiş; güncel teklifi yenileyin.",
  "Sipariş kapanmış.",
  "Siparişin süresi dolmuş.",
  "Aynı ilin kendi işletme deposundan teslim edin.",
  "Bu ilçede size ait en az bir arsa gerekiyor.",
  "İl ortak deposunda tam paket gıda bulunmuyor.",
  "Güncel paket bedeli sıfır; teslim yapılamıyor.",
  "Hazine kapasitesi ödemenin tamamını alamıyor.",
  "Sipariş ödeneği yetersiz.",
]);

const MECLIS_KATILIM_RET_MESAJLARI = new Set([
  "Meclis katılımı yalnız mülk dünyasında kullanılabilir.",
  "İlçe bulunamadı.",
  "Oyuncunun mülk kaydı bulunamadı.",
  "Önceki ilçe kaydı geçersiz.",
  "Meclis kaydınız değişmiş; güncel kaydı yenileyin.",
  "Bu ilçe meclisine zaten kayıtlısınız.",
  "Katılmak için bu ilçede size ait en az bir arsa gerekiyor.",
]);

/** Ücret çekirdekten gelir; bütün kendi kaynaklarının aynı çözümüne ait bedeller yalnız toplanır. */
function tasimaGideriToplami(bolgeler: readonly IlgiKaresi["bolgeler"][number][]): number | undefined {
  const sonCozum = bolgeler[0]?.ozel?.lojistik?.sonCozum;
  if (sonCozum === undefined || !bolgeler.every((b) => {
    const l = b.ozel?.lojistik;
    return l !== undefined && l.sonCozum === sonCozum && l.tasimaBedeliMiliSaat !== undefined
      && l.akislar.every((a) => a.tasimaBedeliMiliSaat !== undefined);
  })) return undefined;
  return bolgeler.reduce((toplam, b) => toplam + b.ozel!.lojistik!.tasimaBedeliMiliSaat!, 0);
}

/** Kopyalanan kendi yük tekrar toplanmaz; bütün kaynaklar aynı plan ve tutarlı kenar sözlüğü vermelidir. */
function lojistikYolVerisi(bolgeler: readonly IlgiKaresi["bolgeler"][number][]): { kenarlar: LojistikKenarGorunumu[]; guncellemeBekliyor: boolean } | undefined {
  const ilk = bolgeler[0]?.ozel?.lojistik;
  if (ilk?.kenarlar === undefined || ilk.guncellemeBekliyor === undefined) return undefined;
  const kenarlar = new Map<number, LojistikKenarGorunumu>();
  for (const b of bolgeler) {
    const l = b.ozel?.lojistik;
    if (l?.kenarlar === undefined || l.sonCozum !== ilk.sonCozum || l.guncellemeBekliyor !== ilk.guncellemeBekliyor) return undefined;
    const kaynakKenarlar = new Set(l.kenarlar.map((e) => e.indeks));
    if (l.akislar.some((a) => a.yol === undefined || a.yol.some((i) => !kaynakKenarlar.has(i)))) return undefined;
    for (const e of l.kenarlar) {
      const onceki = kenarlar.get(e.indeks);
      if (onceki !== undefined && (onceki.a !== e.a || onceki.b !== e.b || onceki.tur !== e.tur || onceki.sureMs !== e.sureMs
        || onceki.kapasiteMiliSaat !== e.kapasiteMiliSaat || onceki.kendiYukMiliSaat !== e.kendiYukMiliSaat)) return undefined;
      if (onceki === undefined) kenarlar.set(e.indeks, e);
    }
  }
  return { kenarlar: [...kenarlar.values()].sort((a, b) => a.indeks - b.indeks), guncellemeBekliyor: ilk.guncellemeBekliyor };
}

export interface WsSecenekleri {
  url: string;
  /**
   * Geliştirme kimliği için sabit token; e-posta girişinde (G9) her bağlanışta TAZE bir ws bileti veren işlev (`BiletSaglayici.bilet`).
   * Bilet 60 sn ömürlü ve tek kullanımlıktır: işlev her (yeniden) bağlanmadan hemen önce çağrılır. İşlev `GirisHatasi` ile `oturum_yok`
   * (401) fırlatırsa bağlantı "reddedildi" olur ve yeniden denenmez; başka hata (ağ) üstel geri çekilmeyle yeniden denenir.
   */
  token: string | (() => Promise<string>);
  /** Kurulum/sekme başına kimlik (idempotans kapsamı). Verilmezse rastgele üretilir. */
  istemciKimligi?: string;
  /** Sınama için başka bir WebSocket gerçeklemesi. */
  WebSocketCtor?: typeof WebSocket;
  /** İlk `hosgeldin` için bekleme (ms). Varsayılan 10 000. */
  acZamanAsimiMs?: number;
  /** Komut yanıtı için bekleme (ms; bağlantı kopukken de sayar). Varsayılan 30 000. */
  komutZamanAsimiMs?: number;
  /** Zaman eşitleme aralığı (ms). Varsayılan 20 000. */
  zamanAraligiMs?: number;
  /** Yeniden bağlanma geri çekilmesi (ms). Varsayılan 500 → 10 000. */
  geriCekilmeMs?: { ilk: number; en: number };
  /**
   * Hesabı dünyaya katan hizmet (Yerleş ekranı). Protokolde oyuncunun kendi katılımı yoktur; embedder sağlar
   * (ör. oturum hizmeti ya da yönetici köprüsü). Yoksa `katil` açık bir hata döner.
   */
  katilIste?: (ilce: string) => Promise<void>;
}

export type WsDurumu = "baglaniyor" | "bagli" | "kopuk" | "kapali" | "reddedildi";

/**
 * Özel bölge karesindeki tesis ölçeği: `tesisOlcek` listesi `[tesis kimliği, ölçek (1 M | 2 L)]` (protokole sonradan eklenen isteğe
 * bağlı alan; `tesisler` demetine öğe eklenmedi). Listede olmayan tesis S'dir (0). Alan hiç yoksa (eski sunucu) tanımsız: istemci
 * ölçeği ayak izinden çıkarır (`olcek.ts` `mevcutOlcek`).
 */
export function tesisOlcegi(oz: object, tesisId: number): 0 | 1 | 2 | undefined {
  // Alan protokol tipine eklenene dek (K2 `kare-olcek`) yapısal okunur; eklendikten sonra da aynen çalışır
  const l = (oz as { tesisOlcek?: ReadonlyArray<readonly [number, number]> }).tesisOlcek;
  if (!l) return undefined;
  const o = l.find((x) => x[0] === tesisId)?.[1];
  return o === 1 || o === 2 ? o : 0;
}

/**
 * Tesisin aşınması (ppm, > 0) `ozel.tesisAsinma`'dan (K2 `kare-asinma`; yalnız aşınması > 0 olan tesisler listelenir). Alan yoksa ya da tesis listede değilse tanımsız.
 * Protokol tipine yapısal okunur: alan eklenmemiş sunucuda davranış birebir aynıdır.
 */
export function tesisAsinmasi(oz: object, tesisId: number): number | undefined {
  const l = (oz as { tesisAsinma?: ReadonlyArray<readonly [number, number]> }).tesisAsinma;
  if (!l) return undefined;
  const a = l.find((x) => x[0] === tesisId)?.[1];
  return a !== undefined && a > 0 ? a : undefined;
}

/** İnşaatta seçilen yöntemin kimliği (`oyuncu.insaatYontem`: `[inşaat kimliği, yöntem kimliği]`); alan yoksa ya da inşaat listede değilse tanımsız. */
export function insaatYontemi(oyuncu: object, insaatId: number): string | undefined {
  const l = (oyuncu as { insaatYontem?: ReadonlyArray<readonly [number, string]> }).insaatYontem;
  if (!l) return undefined;
  return l.find((x) => x[0] === insaatId)?.[1];
}

interface Bekleyen {
  anahtar: string;
  komut: Komut;
  coz: (s: { t: number; tamam: true } | { tamam: false; hata: string }) => void;
  reddet: (e: Error) => void;
  zamanlayici: ReturnType<typeof setTimeout>;
  denemeler: number;
  /** Sunucu yetişirken reddetti (günlüğe girmedi): yetişme bitince aynı anahtarla yeniden gönderilir. */
  yetismeBekliyor: boolean;
}

const rastgele = (n: number): string => {
  let s = "";
  while (s.length < n) s += Math.floor(Math.random() * 36 ** 6).toString(36);
  return s.slice(0, n);
};

function reddetFn(b: Bekleyen): (e: Error) => void {
  return b.reddet;
}

function kapanisMesaji(kod: number): string {
  if (kod === 4003) return "Oturum doğrulanamadı: token geçersiz ya da eksik.";
  if (kod === 4001) return "İstemci ile sunucunun protokol sürümü uyuşmuyor; sayfayı yenileyin.";
  if (kod === 4002) return "Oyun kuralları sürümü uyuşmuyor; sayfayı yenileyin.";
  if (kod === 4009) return "Sunucu kapanıyor.";
  return "Sunucuya bağlanılamadı.";
}

export class WsBaglanti implements MulkBaglantisi {
  ben: Oyuncu = { id: "", ad: "" };
  /** Sınama kancası: bağlantı durumu. */
  durum: WsDurumu = "baglaniyor";
  sonHata: string | null = null;
  readonly istemciKimligi: string;
  /** Sınama kancası: son tam/güncel kare. */
  kare: IlgiKaresi | null = null;
  /** Sınama kancası: gelen `hata` mesajları (anahtarsız). */
  readonly sunucuHatalari: string[] = [];

  private ws: WebSocket | null = null;
  private hos: Mesaj<"hosgeldin"> | null = null;
  private rev = 0;
  private kaynaklar = new Map<string, Set<string>>();
  private yok = new Set<string>();
  private bekleyenler = new Map<string, Bekleyen>();
  private kareBekleyen: Array<() => boolean> = [];
  private dinleyiciler = new Set<() => void>();
  private zamanRef = { perf: 0, sim: 0, hiz: 1 };
  private enIyiGidisDonus = Infinity;
  private sayac = 0;
  private yenidenZamanlayici: ReturnType<typeof setTimeout> | null = null;
  private zamanZamanlayici: ReturnType<typeof setInterval> | null = null;
  private geriCekilme: number;
  private bildirimBekliyor = false;
  private aboneBekliyor = false;
  private ilkHos!: { coz: () => void; reddet: (e: Error) => void };
  private ilkHazir: Promise<void>;
  private ilkAcildi = false;
  private insaBaslangic = new Map<HucreId, number>();
  /**
   * Görünen ad önbelleği (`IlgiKaresi.adlar` / `KareDeltasi.adlar`): BİRİKİMLİ; adı görünümden çıkan oyuncunun girdisi de kalır, zincir kopup tam kare gelince birleşir
   * (silinmez). Sunucuda görünen ad özelliği kapalıysa alan gelmez ve önbellek boştur.
   */
  private adOnbellek = new Map<OyuncuId, string>();
  /** Bu oturumda istenen ölçek büyütmelerinin hedefi (tesis kimliği → ölçek): karede hedef ölçek yoktur. */
  private olcekHedefleri = new Map<number, 1 | 2>();
  private kapandi = false;
  /** Art arda kimlik reddi (4003): sessiz yenileme için ilk ret bir kez yeni biletle yeniden denenir (G9, docs/arastirma/g9 G-7). */
  private kimlikReddi = 0;
  /** Yetişme (sunucu kapalıyken geçen süreyi işletme): başlangıç, hedef ve son sim zamanı. */
  private yetisme: { bas: number; hedef: number; simdi: number } | null = null;

  private constructor(private s: WsSecenekleri) {
    this.istemciKimligi = s.istemciKimligi ?? `web-${rastgele(10)}`;
    this.geriCekilme = s.geriCekilmeMs?.ilk ?? 500;
    this.ilkHazir = new Promise<void>((coz, reddet) => {
      this.ilkHos = { coz, reddet };
    });
    // Yakalanmayan red uyarısı çıkmasın; hata `ac()` çağıranında görülür.
    this.ilkHazir.catch(() => undefined);
  }

  /** Bağlanır ve ilk `hosgeldin`'i bekler; olmazsa Türkçe hatayla reddeder. */
  static async ac(s: WsSecenekleri): Promise<WsBaglanti> {
    const b = new WsBaglanti(s);
    b.baglan();
    const zamanAsimi = setTimeout(() => {
      if (!b.ilkAcildi) b.ilkHos.reddet(new Error("Sunucu yanıt vermedi (zaman aşımı)."));
    }, s.acZamanAsimiMs ?? 10_000);
    try {
      await b.ilkHazir;
    } catch (e) {
      b.kapat();
      throw e;
    } finally {
      clearTimeout(zamanAsimi);
    }
    return b;
  }

  // --- MulkBaglantisi ----------------------------------------------------------------------------

  oyuncuAdi(id: OyuncuId): string {
    return this.adOnbellek.get(id) ?? id;
  }

  /** Görünen ad (`kare.adlar` birikimli önbelleği); bilinmiyorsa tanımsız. */
  ad(oyuncu: OyuncuId): string | undefined {
    return this.adOnbellek.get(oyuncu);
  }

  ilgi(kaynak: string, ilceler: readonly string[]): void {
    const yeni = new Set(ilceler);
    const eski = this.kaynaklar.get(kaynak);
    if (eski && eski.size === yeni.size && [...yeni].every((x) => eski.has(x))) return;
    this.kaynaklar.set(kaynak, yeni);
    this.aboneIste();
  }

  ilceVarMi(ilce: string): boolean | null {
    if (this.yok.has(ilce)) return false;
    if (this.kare?.ilceler?.some((c) => c.id === ilce)) return true;
    return null;
  }

  dinle(f: () => void): () => void {
    this.dinleyiciler.add(f);
    return () => this.dinleyiciler.delete(f);
  }

  async sahiplikAl(ilce: string): Promise<IlceSahipligi | null> {
    await this.ilkHazir;
    if (this.yok.has(ilce)) return null;
    // Sahiplik istekleri kalıcı bir ilgi kaynağıdır: ilçe karede kalır ve delta ile güncellenir.
    const k = this.kaynaklar.get("sahiplik") ?? new Set<string>();
    if (!k.has(ilce)) {
      k.add(ilce);
      this.kaynaklar.set("sahiplik", k);
      this.aboneIste();
    }
    if (!this.ilceKaresi(ilce)) {
      const hazir = await this.karedeBekle(() => this.yok.has(ilce) || this.ilceKaresi(ilce) !== undefined, 10_000);
      if (!hazir) throw new Error("Sunucu ilçe verisini göndermedi.");
      if (this.yok.has(ilce)) return null;
    }
    return this.sahiplik(ilce);
  }

  async parselAl(komut: ParselKomutu): Promise<ParselSonucu> {
    const c = this.ilceKaresi(komut.ilce);
    // Önizleme tahmini: ayrılmış hücre taban fiyattan, eğriyi ilerletmez (çekirdek `parselToplamFiyatiMili`)
    const sh = c ? this.sahiplik(komut.ilce) : null;
    const ayr = sh?.ayrilmis ? komut.hucreler.filter((h) => sh.ayrilmis!.has(h)).length : 0;
    const tahmin = c ? parselToplamFiyatiMili(komut.sinif, { uygun: c.uygunHucre, satilmis: c.satilmisHucre, ...(sh?.ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis: sh.ayrilmisSatilmis } : {}) }, komut.hucreler.length - ayr, ayr) : 0;
    try {
      const r = await this.komutGonder(komut);
      if (r.tamam) return { tamam: true, hucreler: [...komut.hucreler], toplamMili: tahmin, t: r.t };
      const hucre = hataHucresi(r.hata);
      return { tamam: false, hata: "sunucu", mesaj: mulkHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x)), ...(hucre ? { hucre } : {}) };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  async tesisInsa(komut: TesisKomutu): Promise<TesisSonucu> {
    try {
      const r = await this.komutGonder(komut);
      if (r.tamam) {
        for (const h of komut.hucreler) this.insaBaslangic.set(h, r.t);
        return { tamam: true, t: r.t };
      }
      const hucre = hataHucresi(r.hata);
      return { tamam: false, hata: "sunucu", mesaj: mulkHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x)), ...(hucre ? { hucre } : {}) };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /**
   * Sunucu atomik `yapi_yerlestir` komutunu (hücre başına sınıf dahil) biliyor mu? Protokol paketi (sunucuyla aynı depoda, aynı sürüm)
   * komut şemasında tanıyorsa evet. Hayırsa yapı yerleştirme arsa alan bir yolla YAPILMAZ (`zincir.ts`: yarım alım olmaz).
   */
  atomikYerlestirme(): boolean {
    // Hücre başına sınıf (`siniflar`) da tanınmalı: iki sınıfa düşen yerleşim de TEK komuttur (yarım alım yok)
    return komutVarMi({ tur: "yapi_yerlestir", ilce: "x", tesisTuru: "x", hucreler: ["1:1"], sinif: "kirsal", siniflar: ["kirsal"] }, "siniflar");
  }

  async yapiYerlestir(i: YerlestirIstegi): Promise<TesisSonucu> {
    try {
      // Çekirdek tipinde henüz olmayan komut: şema sürümüne göre sunucu kabul eder (`atomikYerlestirme`).
      const r = await this.komutGonder({ tur: "yapi_yerlestir", ilce: i.ilce, tesisTuru: i.tesisTuru, hucreler: i.hucreler, sinif: i.sinif, ...(i.siniflar ? { siniflar: i.siniflar } : {}), ...(i.dukkanTuru ? { dukkanTuru: i.dukkanTuru } : {}), ...(i.yontem ? { yontem: i.yontem } : {}) } as unknown as Komut);
      if (r.tamam) {
        for (const h of i.hucreler) this.insaBaslangic.set(h, r.t);
        return { tamam: true, t: r.t };
      }
      const hucre = hataHucresi(r.hata);
      return { tamam: false, hata: "sunucu", mesaj: mulkHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x)), ...(hucre ? { hucre } : {}) };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Sonuç yalnız sonraki özel kareden okunur; komut kabulü keşif başarısı değildir. */
  async aramaSondaji(i: AramaSondajiIstegi): Promise<TesisSonucu> {
    try {
      const t = i.gorulenTeklif;
      const r = await this.komutGonder({ tur: "arama_sondaji", bolge: i.bolge, mal: i.mal, gorulenTeklif: {
        mal: t.mal, kullanilanHak: t.kullanilanHak, hakTavani: t.hakTavani, paraMili: t.paraMili,
        malMaliyeti: t.malMaliyeti.map(([mal, miktar]): [string, number] => [mal, miktar]),
        temelSureMs: t.temelSureMs, sureMs: t.sureMs, olasilikPpm: t.olasilikPpm, ekMinPpm: t.ekMinPpm, ekMaxPpm: t.ekMaxPpm,
      } });
      if (r.tamam) return { tamam: true, t: r.t };
      const mesaj = r.hata === "sondaj teklifi degisti" ? "Sondaj teklifi değişmiş. Güncel hakları ve bedeli yeniden inceleyin."
        : r.hata === "gecersiz sondaj teklifi" ? "Görülen sondaj teklifi geçersiz. Sondaj kartını yeniden açın."
        : r.hata.startsWith("kesif hakki bitti") ? "Bu kaynağın sondaj hakları tükenmiş."
        : r.hata.startsWith("bolgede bu malda damar yok") ? "Bu işletmede seçilen mal için sondaj yapılabilecek damar yok."
        : r.hata.startsWith("sondaj yalniz ham mallarda yapilir") || r.hata.startsWith("tarim rezervinde sondaj yapilamaz") ? "Bu malda sondaj yapılamıyor."
        : r.hata.startsWith("yetersiz stok") ? "Sondaj için gereken mallar bu işletmenin deposunda yeterli değil."
        : r.hata === "yetersiz hazine" ? "Sondaj için hazineniz yeterli değil."
        : r.hata.startsWith("bolge oyuncunun degil") ? "Bu işletme size ait değil."
        : r.hata.startsWith("bilinmeyen bolge") ? "Sondaj yapılacak işletme bulunamadı. Güncel kaydı kontrol edin."
        : r.hata.startsWith("bilinmeyen mal") ? "Sondaj yapılacak mal bulunamadı."
        : r.hata === "sanayi katmani kapali" ? "Sanayi katmanı kapalı; sondaj şu anda kullanılamıyor."
        : "Sondaj başlatılamadı. Güncel teklifi kontrol edip yeniden deneyin.";
      return { tamam: false, hata: "sunucu", mesaj };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Sunucu teklifini aynı hedef ve tutarlarla kopyalar; istemcide onarım maliyeti hesaplanmaz. */
  async genelOnarim(i: GenelOnarimIstegi): Promise<TesisSonucu> {
    try {
      const teklif = i.gorulenTeklif;
      const r = await this.komutGonder({ tur: "genel_onarim", bolge: i.bolge, gorulenTeklif: {
        tesisler: teklif.tesisler.map(({ tesis, tur, olcek }) => ({ tesis, tur, olcek })),
        paraMili: teklif.paraMili,
        mal: teklif.mal.map(([mal, miktar]): [string, number] => [mal, miktar]),
        durusMs: teklif.durusMs,
      } });
      if (r.tamam) return { tamam: true, t: r.t };
      const mesaj = r.hata === "onarim teklifi degisti" ? "Onarım teklifi değişmiş. Güncel hedefleri ve bedeli yeniden inceleyin."
        : r.hata === "gecersiz onarim teklifi" ? "Görülen onarım teklifi geçersiz. Onarım kartını yeniden açın."
        : r.hata.startsWith("bolgede onarim suruyor") ? "Bu işletmede onarım zaten sürüyor. Bitiş bilgisini kontrol edin."
        : r.hata.startsWith("onarilacak asinma yok") ? "Bu işletmede onarılacak aşınmış tesis yok."
        : r.hata.startsWith("yetersiz stok") ? "Onarım için gereken mallar bu işletmenin deposunda yeterli değil."
        : r.hata === "yetersiz hazine" ? "Onarım için hazineniz yeterli değil."
        : r.hata.startsWith("bolge oyuncunun degil") ? "Bu işletme size ait değil."
        : r.hata.startsWith("bilinmeyen bolge") ? "Onarılacak işletme bulunamadı. Güncel tesis kayıtlarını kontrol edin."
        : r.hata === "sanayi katmani kapali" ? "Sanayi katmanı kapalı; onarım şu anda kullanılamıyor."
        : "Onarım başlatılamadı. Güncel teklifi kontrol edip yeniden deneyin.";
      return { tamam: false, hata: "sunucu", mesaj };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Oyuncunun global bakım tercihi; görülen düzey istemcide yeniden hesaplanmaz. */
  async bakimDuzeyiDegistir(i: BakimDuzeyiDegistirIstegi): Promise<TesisSonucu> {
    try {
      const r = await this.komutGonder({ tur: "bakim_duzeyi", duzey: i.duzey, oncekiDuzey: i.oncekiDuzey });
      if (r.tamam) return { tamam: true, t: r.t };
      const mesaj = r.hata === "bakim duzeyi degisti" ? "Bakım düzeyi değişmiş. Güncel tercihi yeniden inceleyin."
        : r.hata === "gecersiz onceki bakim duzeyi" ? "Görülen bakım düzeyi geçersiz. Bakım tercihlerini yeniden açın."
        : r.hata.startsWith("gecersiz bakim duzeyi") ? "İstenen bakım düzeyi geçersiz. Bakım tercihlerini yeniden açın."
        : r.hata.startsWith("bilinmeyen oyuncu") ? "Oyuncunun bakım bilgisi bulunamadı. Güncel durumu kontrol edin."
        : r.hata === "sanayi katmani kapali" ? "Sanayi katmanı kapalı; bakım tercihi şu anda kullanılamıyor."
        : "Bakım düzeyi değiştirilemedi. Güncel tercihi kontrol edip yeniden deneyin.";
      return { tamam: false, hata: "sunucu", mesaj };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Görülen durumu aynen taşıyan tesis_durum köprüsü; yalnız gerçek sunucu yanıtı döner. */
  async tesisDurumDegistir(i: TesisDurumDegistirIstegi): Promise<TesisSonucu> {
    try {
      const r = await this.komutGonder({ tur: "tesis_durum", bolge: i.bolge, tesis: i.tesis, aktif: i.aktif, oncekiAktif: i.oncekiAktif });
      if (r.tamam) return { tamam: true, t: r.t };
      const mesaj = r.hata === "tesisin calisma durumu degisti" ? "Tesisin çalışma durumu değişmiş. Güncel durumu yeniden inceleyin."
        : r.hata === "gecersiz onceki aktif degeri" ? "Görülen çalışma durumu geçersiz. Tesis kaydını yeniden açın."
        : r.hata.startsWith("gecersiz aktif degeri") ? "İstenen çalışma durumu geçersiz. Tesis kaydını yeniden açın."
        : r.hata.startsWith("bolge oyuncunun degil") ? "Bu işletme size ait değil."
        : r.hata.startsWith("bilinmeyen bolge") ? "İşletme düğümü bulunamadı. Güncel tesis kaydını kontrol edin."
        : r.hata.startsWith("bolgede boyle bir tesis yok") ? "Bu işletmede tesis bulunamadı. Güncel tesis kaydını kontrol edin."
        : "Tesisin çalışma durumu değiştirilemedi. Güncel durumu kontrol edip yeniden deneyin.";
      return { tamam: false, hata: "sunucu", mesaj };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Biten tesisin yöntemini değiştirir (`yontem_degistir`): ücretsiz ve anlık; ret nedeni Türkçe (`yontemHatasiTurkce`, A1 `yontem.ret.*`). */
  async yontemDegistir(i: YontemDegistirIstegi): Promise<TesisSonucu> {
    try {
      const r = await this.komutGonder({ tur: "yontem_degistir", bolge: i.bolge, tesis: i.tesis, yontem: i.yontem, ...(i.oncekiYontem === undefined ? {} : { oncekiYontem: i.oncekiYontem }) });
      if (r.tamam) return { tamam: true, t: r.t };
      const mesaj = r.hata === "tesisin yontemi degisti" ? "Tesisin yöntemi değişmiş. Güncel yöntemleri yeniden inceleyin."
        : r.hata === "gecersiz onceki yontem" ? "Görülen yöntem bilgisi geçersiz. Yöntem seçicisini yeniden açın."
        : yontemHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x));
      return { tamam: false, hata: "sunucu", mesaj };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Pazar'da sat: `ticaret_emri` (ihracat, sürekli saatlik emir; `oranSaat` 0 = kaldır). Mülk kipinde liman şartı yoktur (çekirdek `ekonomi/komut.ts`); ret nedeni Türkçe (`pazarHatasiTurkce`, A1 `pazar.ret.*`). */
  async ticaretEmri(i: TicaretEmriIstegi): Promise<TesisSonucu> {
    try {
      const r = await this.komutGonder({ tur: "ticaret_emri", bolge: i.bolge, mal: i.mal, yon: "ihracat", oranSaat: i.oranSaat });
      if (r.tamam) return { tamam: true, t: r.t };
      return { tamam: false, hata: "sunucu", mesaj: pazarHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x)) };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Aynı ticaret komutunun ithalat yönü; kabul ve ret gerçek sunucu yanıtından gelir. */
  async tedarikKomutu(i: TicaretEmriIstegi): Promise<TesisSonucu> {
    try {
      const r = await this.komutGonder({ tur: "ticaret_emri", bolge: i.bolge, mal: i.mal, yon: "ithalat", oranSaat: i.oranSaat });
      if (r.tamam) return { tamam: true, t: r.t };
      const mesaj = r.hata.startsWith("depolanamaz mal ticarete konu olamaz") ? "Bu mal depolanamadığı için ithal edilemez."
        : r.hata.startsWith("bolge liman degil") ? "Bu bölgede ithalat yapılamaz."
        : r.hata.startsWith("gecersiz yon") ? "Tedarik emrinin yönü geçersiz."
        : /^(gecersiz oran|bilinmeyen mal|ticaret emri yuvasi dolu|bolge oyuncunun degil|bilinmeyen bolge)/.test(r.hata)
          ? pazarHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x))
          : "Tedarik emri uygulanamadı. Güncel durumunu kontrol edip yeniden deneyebilirsin.";
      return { tamam: false, hata: "sunucu", mesaj };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Tek kamu gıda paketinin gerçek teslimi; fiyat ve sıra değişirse sunucu kabul etmez. */
  async kamuTeslim(komut: Extract<Komut, { tur: "kamu_teslim" }>): Promise<TesisSonucu> {
    try {
      const r = await this.komutGonder(komut);
      if (r.tamam) return { tamam: true, t: r.t };
      const mesaj = KAMU_TESLIM_RET_MESAJLARI.has(r.hata) ? r.hata
        : "Kamuya teslim uygulanamadı. Güncel sipariş ve deponu kontrol edip yeniden deneyebilirsin.";
      return { tamam: false, hata: "sunucu", mesaj };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Tek siyasi ilçe kaydı; eski önceki-ilçe verisiyle gelen istek sunucuda reddedilir. */
  async meclisKatil(komut: Extract<Komut, { tur: "meclis_katil" }>): Promise<TesisSonucu> {
    try {
      const r = await this.komutGonder(komut);
      if (r.tamam) return { tamam: true, t: r.t };
      return { tamam: false, hata: "sunucu", mesaj: MECLIS_KATILIM_RET_MESAJLARI.has(r.hata) ? r.hata : "Meclis kaydı uygulanamadı. Güncel kayıt ve bu ilçedeki arsanı kontrol edip yeniden deneyebilirsin." };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Yalnız sahibinin mülk işletme düğümleri; oran ve stok değerleri sunucu karesinden okunur. */
  tedarikDurumu(): TedarikDurumu | null {
    const k = this.kare;
    const o = k?.oyuncu;
    const dizin = this.hos?.dizin;
    if (!k || !o || !dizin) return null;
    const simZamani = this.simZamani();
    const kendiIsletmeleri = k.bolgeler.filter((b) => o.mulk !== undefined && b.genel.sahip === o.id && b.id.endsWith(`#${o.id}`));
    // Plan, bütün kaynakların aynı çözüm karesi mevcutsa bilinir. Gelen hız
    // düğümden bağımsız okunur; gecikmeli teslim sürerken plan boş olabilir.
    const ilkLojistik = kendiIsletmeleri[0]?.ozel?.lojistik;
    const lojistikTam = ilkLojistik !== undefined && kendiIsletmeleri.every((b) => b.ozel?.lojistik !== undefined && b.ozel.lojistik.sonCozum === ilkLojistik.sonCozum);
    const kendiKimlikleri = new Set(kendiIsletmeleri.map((b) => b.id));
    const tasimaBedeliMiliSaat = tasimaGideriToplami(kendiIsletmeleri);
    const yolVerisi = lojistikYolVerisi(kendiIsletmeleri);
    const lojistik = lojistikTam && ilkLojistik !== undefined ? {
      sonCozum: ilkLojistik.sonCozum,
      akislar: kendiIsletmeleri.flatMap((b) => b.ozel!.lojistik!.akislar.filter((a) => a.kaynak === b.id && kendiKimlikleri.has(a.hedef))).map((a) => {
        if (yolVerisi !== undefined) return a;
        return {
          mal: a.mal, kaynak: a.kaynak, hedef: a.hedef, oranMiliSaat: a.oranMiliSaat, sureMs: a.sureMs,
          ...(a.tasimaBedeliMiliSaat === undefined ? {} : { tasimaBedeliMiliSaat: a.tasimaBedeliMiliSaat }),
        };
      }),
      ...(tasimaBedeliMiliSaat === undefined ? {} : { tasimaBedeliMiliSaat }),
      ...(yolVerisi === undefined ? {} : { kenarlar: yolVerisi.kenarlar, guncellemeBekliyor: yolVerisi.guncellemeBekliyor, kapasiteZamani: k.t }),
    } : undefined;
    return {
      simZamani,
      ...(lojistik === undefined ? {} : { lojistik }),
      bolgeler: kendiIsletmeleri.filter((b) => b.ozel !== undefined).map((b) => {
        const oz = b.ozel!;
        const il = b.id.slice(0, -(o.id.length + 1));
        // Eski sunucu kapasiteyi bildirmezse yeni emir uygunluğu bilinmez;
        // gerçek komut yolu güncelleme/silme ve son doğrulamayı korur.
        const yuva = oz.isletme?.emirYuvasi;
        const yeniEmirUygun = yuva === undefined ? undefined : oz.emirler.length < yuva;
        return {
          id: b.id,
          il,
          ad: il,
          stoklar: new Map(dizin.mallar.flatMap((mal, mi): Array<[string, number]> => {
            const f = oz.stoklar[mi];
            return f === undefined ? [] : [[mal, Math.max(0, stokAraDeger(f, simZamani))]];
          })),
          emirler: oz.emirler.flatMap(([mi, yon, oranSaat, gerceklesenSaat]) => yon !== 1 || dizin.mallar[mi] === undefined ? [] : [{ mal: dizin.mallar[mi]!, oranSaat, gerceklesenSaat }]),
          uygun: true,
          ...(oz.isletme?.ithNetPpm === undefined ? {} : { ithNetPpm: oz.isletme.ithNetPpm }),
          ...(oz.sebekeGiderleri === undefined ? {} : { sebekeGiderleri: oz.sebekeGiderleri }),
          ...(oz.yakitTedariki === undefined ? {} : { yakitTedariki: oz.yakitTedariki }),
          ...(oz.ithalatGiderleri === undefined ? {} : { ithalatGiderleri: oz.ithalatGiderleri }),
          ...(oz.gelenOran === undefined ? {} : { gelenOran: oz.gelenOran }),
          ...(oz.lojistik?.tasimaBedeliMiliSaat === undefined ? {} : { tasimaBedeliMiliSaat: oz.lojistik.tasimaBedeliMiliSaat }),
          ...(yeniEmirUygun === undefined ? {} : { yeniEmirUygun }),
          ...(yeniEmirUygun === false ? { yeniEmirNedeni: `Satış ve alış emri yuvaların dolu (${yuva}). Bir emri bırak ya da Ticaret ofisi kur.` } : {}),
        };
      }),
    };
  }

  /** Eski istemci çağrıları da aynı ticaret_emri köprüsünü kullanır. */
  async pazarSatis(i: PazarSatisIstegi): Promise<PazarSatisSonucu> {
    const r = await this.ticaretEmri(i);
    return r.tamam ? r : { tamam: false, mesaj: r.mesaj };
  }

  /** Oyuncunun araştırdığı teknolojilerin kimlikleri (`oyuncu.teknolojiler` dizin indeksleri); oyuncu karesi ya da dizin yoksa null. */
  acikTeknolojiler(): ReadonlySet<string> | null {
    const o = this.kare?.oyuncu;
    const dizin = this.hos?.dizin.teknolojiler;
    if (!o || !dizin) return null;
    return new Set(o.teknolojiler.flatMap((i) => (dizin[i] === undefined ? [] : [dizin[i] as string])));
  }

  arastirmaDurumu(): TeknolojiDurumu | null {
    const o = this.kare?.oyuncu;
    const dizin = this.hos?.dizin.teknolojiler;
    const acik = this.acikTeknolojiler();
    if (!o || !dizin || !acik) return null;
    const simZamani = this.simZamani();
    return {
      simZamani,
      acik,
      arastirma: o.arastirma ? { teknoloji: dizin[o.arastirma.teknoloji] ?? "Bilinmeyen araştırma", bitis: o.arastirma.bitis } : null,
      ...(o.arastirmaYayilimPpm ? { yayilimPpm: new Map(dizin.flatMap((id, i): Array<[string, number]> => {
        const ppm = o.arastirmaYayilimPpm?.[i];
        return ppm === undefined ? [] : [[id, ppm]];
      })) } : {}),
      erkenOyunPpm: o.erkenOyun ? erkenOyunCarpani(o.erkenOyun, simZamani) : 1_000_000,
      hazineMili: stokAraDeger(o.hazine, simZamani),
    };
  }

  async arastirmaBaslat(teknoloji: string, maliyetMili?: number): Promise<ArastirmaSonucu> {
    try {
      const r = await this.komutGonder({ tur: "arastir", teknoloji, ...(maliyetMili === undefined ? {} : { maliyetMili }) });
      if (r.tamam) return { tamam: true };
      const mesaj = r.hata === "arastirma maliyeti degisti" ? "Araştırma bedeli değişmiş. Güncel bedeli yeniden inceleyin."
        : r.hata === "gecersiz arastirma maliyeti" ? "Görülen araştırma bedeli geçersiz. Araştırma kartını yeniden açın."
        : r.hata === "hazine yetersiz" ? "Araştırma için hazinen yeterli değil."
        : r.hata === "devam eden bir arastirma var" ? "Zaten devam eden bir araştırman var."
        : r.hata.startsWith("on kosul eksik") ? "Önce bu teknolojinin ön koşullarını araştırmalısın."
        : r.hata.startsWith("teknoloji zaten acik") ? "Bu teknolojiyi zaten araştırdın."
        : r.hata.startsWith("bilinmeyen teknoloji") ? "Bu teknoloji bulunamadı."
        : "Araştırma başlatılamadı. Güncel durumunu kontrol edip yeniden deneyebilirsin.";
      return { tamam: false, mesaj };
    } catch {
      return { tamam: false, mesaj: "Sunucuya ulaşılamadı. Bağlantı kurulunca yeniden deneyebilirsin." };
    }
  }

  /** Yalnız oyuncunun kendi işletme düğümleri; özel kapasite gelmeden üretim gösterilmez. */
  orduDurumu(): OrduDurumu | null {
    const o = this.kare?.oyuncu;
    const dizin = this.hos?.dizin;
    const teknolojiler = this.acikTeknolojiler();
    if (!o || !dizin || !teknolojiler) return null;
    const simZamani = this.simZamani();
    return {
      simZamani,
      erkenOyunPpm: o.erkenOyun ? erkenOyunCarpani(o.erkenOyun, simZamani) : 1_000_000,
      teknolojiler,
      ...(o.pve === undefined ? {} : { pve: o.pve }),
      bolgeler: (this.kare?.bolgeler ?? []).filter((b) => b.genel.sahip === o.id && b.id.endsWith("#" + o.id) && b.ozel?.ordu !== undefined).map((b) => {
        const oz = b.ozel!;
        const ordu = oz.ordu!;
        return {
          id: b.id,
          ad: b.id.slice(0, -(o.id.length + 1)),
          birlikler: new Map(dizin.birlikler.map((id, i) => [id, oz.birlikler[i] ?? 0])),
          stoklar: new Map(dizin.mallar.map((id, i) => [id, oz.stoklar[i] ? Math.max(0, stokAraDeger(oz.stoklar[i]!, simZamani)) : 0])),
          kapasite: ordu.kapasite,
          ordugahSayisi: ordu.ordugahSayisi,
          ikmalPpm: oz.ikmalPpm,
          ...(ordu.savunma === undefined ? {} : { savunma: ordu.savunma }),
          ...(ordu.ikmalSaat ? { ikmalSaat: new Map(ordu.ikmalSaat.flatMap(([mi, q]): Array<[string, number]> => dizin.mallar[mi] === undefined ? [] : [[dizin.mallar[mi]!, q]])) } : {}),
          durus: b.genel.durus === 1 ? "savunma" as const : b.genel.durus === 2 ? "geri_cekil" as const : "normal" as const,
          partiler: (o.partiler ?? []).filter((p) => p.bolge === b.i).map((p) => ({ id: p.id, birlik: dizin.birlikler[p.birlik] ?? "Bilinmeyen birlik", adet: p.adet, bitis: p.bitis })),
        };
      }),
    };
  }

  async orduKomutu(komut: Extract<Komut, { tur: "birlik_uret" | "savunma_emri" }>): Promise<OrduSonucu> {
    try {
      const r = await this.komutGonder(komut);
      if (r.tamam) return { tamam: true };
      const mesaj = r.hata.startsWith("ordugah gerekli") ? "Önce bu ilde bir Ordugâh tamamlamalısın."
        : r.hata.startsWith("ordugah kapasitesi yetersiz") ? "Ordugâh kapasitesi dolu; eğitimdeki birlikler de yer kaplar."
        : r.hata.startsWith("stok yetersiz") ? "Bu ilde birlik eğitimi için yeterli malzeme yok."
        : r.hata.startsWith("birlik acik degil") ? "Önce birliğin gerekli teknolojisini araştırmalısın."
        : r.hata.startsWith("bolge oyuncunun degil") ? "Yalnız kendi birliklerini yönetebilirsin."
        : r.hata.startsWith("gecersiz adet") ? "1 ile 100 arasında tam sayı girmelisin."
        : "Ordu emri uygulanamadı. Güncel durumunu kontrol edip yeniden deneyebilirsin.";
      return { tamam: false, mesaj };
    } catch (e) {
      return { tamam: false, mesaj: this.agHatasi(e).mesaj };
    }
  }

  /** Dükkân görünümü için son birikimli kare. */
  dukkanKaresi(): DukkanKaresi | null {
    return this.kare;
  }

  /** Dükkân komutu (raf, fiyat, marka, yıkım, inşaat iptali): TEK komut; ret nedeni Türkçe (`hata-mulk.ts`). */
  async dukkanKomutu(komut: Komut): Promise<DukkanKomutSonucu> {
    try {
      const r = await this.komutGonder(komut);
      if (r.tamam) return { tamam: true, t: r.t };
      return { tamam: false, mesaj: mulkHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x)) };
    } catch (e) {
      return { tamam: false, mesaj: this.agHatasi(e).mesaj };
    }
  }

  /** Ölçek büyütme: `tesis_olcek_yukselt` (ek hücrelerin arsası + yükseltme sunucuda tek işlem; başarısızsa hiçbir şey değişmez). */
  async olcekYukselt(i: OlcekIstegi): Promise<TesisSonucu> {
    try {
      const komut: Komut = {
        tur: "tesis_olcek_yukselt",
        bolge: i.bolge,
        tesis: i.tesis,
        olcek: i.olcek,
        ...(i.ekHucreler.length > 0 ? { ekHucreler: [...i.ekHucreler] } : {}),
        ...(i.sinif ? { sinif: i.sinif } : {}),
      };
      const r = await this.komutGonder(komut);
      if (r.tamam) {
        this.olcekHedefleri.set(i.tesis, i.olcek);
        for (const h of i.ekHucreler) this.insaBaslangic.set(h, r.t);
        return { tamam: true, t: r.t };
      }
      const hucre = hataHucresi(r.hata);
      return { tamam: false, hata: "sunucu", mesaj: mulkHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x)), ...(hucre ? { hucre } : {}) };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  /** Geri al: `insaat_iptal` (yapının inşaat kimliği karedeki hücreden), sonra bu işlemle alınan hücreler için `parsel_birak`. */
  async yapiGeriAl(i: GeriAlIstegi): Promise<TesisSonucu> {
    const c = this.ilceKaresi(i.ilce);
    const hucre = c?.hucreler.find((h) => i.hucreler.includes(h[0]) && h[4] >= 0);
    if (!hucre) return { tamam: false, hata: "yapi_yok", mesaj: "Geri alınacak inşaat bulunamadı (bitmiş ya da iptal edilmiş olabilir)." };
    try {
      const r = await this.komutGonder({ tur: "insaat_iptal", insaat: hucre[4] });
      if (!r.tamam) return { tamam: false, hata: "sunucu", mesaj: mulkHatasiTurkce(r.hata, (x) => this.oyuncuAdi(x)) };
      if (i.alinan.length === 0) return { tamam: true, t: r.t };
      if (!komutVarMi({ tur: "parsel_birak", ilce: i.ilce, hucreler: i.alinan })) {
        return { tamam: false, hata: "sunucu", mesaj: "İnşaat iptal edildi; ancak bu sunucuda arsa bırakma (parsel_birak) henüz yok, hücreler sende kaldı." };
      }
      const b = await this.komutGonder({ tur: "parsel_birak", ilce: i.ilce, hucreler: i.alinan } as unknown as Komut);
      if (!b.tamam) return { tamam: false, hata: "sunucu", mesaj: `İnşaat iptal edildi; arsa bırakılamadı: ${mulkHatasiTurkce(b.hata, (x) => this.oyuncuAdi(x))}` };
      return { tamam: true, t: b.t };
    } catch (e) {
      return this.agHatasi(e);
    }
  }

  async hazirBekle(): Promise<void> {
    await this.ilkHazir;
    await this.karedeBekle(() => this.kare !== null, 10_000);
  }

  /** Protokolün `katil` mesajı (ilçe HER ZAMAN gönderilir: ayrılmış hücre hakkı yalnız katılım ilçesinde geçerlidir). */
  private katilBekleyen: { anahtar: string; zamanlayici: ReturnType<typeof setTimeout>; coz: (s: { tamam: true } | { tamam: false; hata: string }) => void } | null = null;

  /** Sınama kancası: son gönderilen `katil` mesajı. */
  sonKatil: { anahtar: string; ilce: string } | null = null;

  private katilGonder(ilce: string): Promise<{ tamam: true } | { tamam: false; hata: string }> {
    const anahtar = `${this.istemciKimligi.slice(-10)}-k${(++this.sayac).toString(36)}-${rastgele(5)}`.slice(0, 64);
    return new Promise((coz) => {
      const zamanlayici = setTimeout(() => {
        if (this.katilBekleyen?.anahtar !== anahtar) return;
        this.katilBekleyen = null;
        coz({ tamam: false, hata: "zaman_asimi" });
      }, this.s.komutZamanAsimiMs ?? 30_000);
      this.katilBekleyen = { anahtar, zamanlayici, coz };
      this.sonKatil = { anahtar, ilce };
      this.gonder({ tur: "katil", anahtar, ilce });
    });
  }

  async katil(ilce: string): Promise<{ tamam: boolean; mesaj?: string }> {
    if (!ilce) return { tamam: false, mesaj: "Katılım için bir ilçe seçilmeli." };
    try {
      if (this.s.katilIste) await this.s.katilIste(ilce);
      else {
        const r = await this.katilGonder(ilce);
        if (!r.tamam) return { tamam: false, mesaj: r.hata === "zaman_asimi" ? "Sunucudan yanıt gelmedi; yeniden dene." : mulkHatasiTurkce(r.hata) };
      }
      // Katılım sonrası oyuncu karesi gelene kadar bekle (yurt, işletme, hazine karede).
      this.aboneIste();
      const tamam = await this.karedeBekle(() => this.kare?.oyuncu !== undefined, 10_000);
      return tamam ? { tamam: true } : { tamam: false, mesaj: "Katılım sonrası oyuncu verisi gelmedi; sayfayı yenileyin." };
    } catch (e) {
      return { tamam: false, mesaj: e instanceof Error ? e.message : "Dünyaya katılınamadı." };
    }
  }

  /** Katılım ilçesi: karede varsa o (ileriye uyumlu), yoksa bu oturumda gönderilen `katil`ın ilçesi, yoksa tek yurt ilçesi; yoksa null. */
  private katilimIlcesi(): string | null {
    const mk = this.kare?.oyuncu?.mulk;
    return (mk as { katilimIlcesi?: string } | undefined)?.katilimIlcesi ?? this.sonKatil?.ilce ?? (mk?.ilceHucre.length === 1 ? (mk.ilceHucre[0]?.[0] ?? null) : null);
  }

  ozet(): MulkOzeti | null {
    const k = this.kare;
    if (!k?.oyuncu) return null;
    const t = this.simZamani();
    const mk = k.oyuncu.mulk;
    return {
      hazineMili: stokAraDeger(k.oyuncu.hazine, t),
      simZamani: t,
      ayrilmisBitis: mk?.ayrilmisBitis !== undefined && mk.ayrilmisBitis > t ? mk.ayrilmisBitis : null,
      katilimIlcesi: this.katilimIlcesi(),
      indirimliYapiKalan: mk?.indirimliYapiKalan ?? null,
      baglanti: this.durum === "bagli" ? "bagli" : "kopuk",
      ilceHucre: (k.oyuncu.mulk?.ilceHucre ?? []).map(([i, n]) => [i, n]),
      // Hücreli inşaatlar: tesis ve ölçek büyütme (çekirdekte yükseltme de eşzamanlı inşaat sınırına girer)
      surenInsaat: k.oyuncu.insaatlar.filter((x) => x[1] === "tesis" || x[1] === "olcek").length,
      yetisiyor: this.yetisme ? { ilerleme: this.yetisme.hedef > this.yetisme.bas ? Math.max(0, Math.min(1, (this.yetisme.simdi - this.yetisme.bas) / (this.yetisme.hedef - this.yetisme.bas))) : 0 } : null,
    };
  }

  private donus: DonusOzeti | null = null;
  private defterBekleyen = new Map<number, { coz: (d: Defter | null) => void; zamanlayici: ReturnType<typeof setTimeout> }>();

  /** Esnaf Defteri: `defterIste` (istek numarasıyla) → `defter`; 10 sn'de yanıt yoksa ya da bağlı değilse null. */
  defterAl(): Promise<Defter | null> {
    if (this.durum !== "bagli") return Promise.resolve(null);
    const istek = ++this.sayac;
    return new Promise((coz) => {
      const zamanlayici = setTimeout(() => {
        this.defterBekleyen.delete(istek);
        coz(null);
      }, 10_000);
      this.defterBekleyen.set(istek, { coz, zamanlayici });
      this.gonder({ tur: "defterIste", istek });
    });
  }

  /** Gösterilmemiş "Sen yokken" özeti (hosgeldin ya da yetişme sonrası `donusOzeti` mesajı). */
  donusOzeti(): DonusOzeti | null {
    return this.donus;
  }

  /** Özet gösterildi: sunucuya `ozetOkundu` (istemcinin gördüğü sim zamanı); çapa ilerler. */
  ozetOkundu(): void {
    this.donus = null;
    this.gonder({ tur: "ozetOkundu", t: Math.max(0, this.simZamani()) });
  }

  /** Sunucunun dünya epoch'u (`hosgeldin.dunyaEpochMs`; protokole isteğe bağlı alan olarak ekleniyor): yoksa null. */
  dunyaEpochMs(): number | null {
    const e = (this.hos as { dunyaEpochMs?: unknown } | null)?.dunyaEpochMs;
    return typeof e === "number" && Number.isSafeInteger(e) ? e : null;
  }

  /** İşletme özeti: oyuncu karesi (hazine, kalkan, inşaatlar, arazi) ve kendi işletme düğümlerinin özel verisi (stok, tesis, emir). */
  isletme(): IsletmeDurumu | null {
    const k = this.kare;
    const o = k?.oyuncu;
    if (!k || !o) return null;
    const t = this.simZamani();
    const turler = this.hos?.dizin.tesisTurleri ?? [];
    const mallar = this.hos?.dizin.mallar ?? [];
    const yontemler = this.hos?.dizin.yontemler ?? [];
    const sebeke = new Map<string, number>();
    const kendiIsletmeleri = k.bolgeler.filter((b) => o.mulk !== undefined && b.genel.sahip === o.id && b.id.endsWith(`#${o.id}`));
    const rezervDizini = this.hos?.dizin.mallar;
    const sondajTeklifleri: IsletmeDurumu["sondajTeklifleri"] = o.mulk === undefined ? undefined : kendiIsletmeleri.map((b) => ({
      bolge: b.id, il: b.id.split("#")[0]!, ...(b.ozel?.sondaj === undefined ? {} : { sondaj: b.ozel.sondaj }),
    }));
    const onarimTeklifleri: IsletmeDurumu["onarimTeklifleri"] = o.mulk === undefined ? undefined : kendiIsletmeleri.map((b) => ({
      bolge: b.id, il: b.id.split("#")[0]!, ...(b.ozel?.onarim === undefined ? {} : { onarim: b.ozel.onarim }),
    }));
    // Rezerv muhasebesinin zamanı wire'da yoktur; yalnız kaydedilmiş değerler aktarılır.
    // Özel verisi eksik kaynaklar görünür kalır, public merkezden rezerv kopyalanmaz.
    const rezervler: IsletmeDurumu["rezervler"] = o.mulk === undefined || rezervDizini === undefined ? undefined : kendiIsletmeleri.map((b) => {
      const kalan = b.ozel?.rezervKalan;
      const biliniyor = Array.isArray(kalan) && kalan.length === rezervDizini.length && kalan.every((n) => Number.isSafeInteger(n) && n >= 0);
      return { bolge: b.id, il: b.id.split("#")[0]!, ...(biliniyor ? { rezervKalan: rezervDizini.map((mal, mi): [string, number] => [mal, kalan[mi]!]) } : {}) };
    });
    const ilkYakit = kendiIsletmeleri[0]?.ozel?.yakitTedariki;
    const tasimaGideriMiliSaat = tasimaGideriToplami(kendiIsletmeleri);
    const yakitCozumu = kendiIsletmeleri[0]?.ozel?.lojistik?.sonCozum;
    // Kaynak payları sunucunun tahsisidir; stok formülü veya sevk planından türetilmez.
    // Tüm düğümler aynı malın aynı çözümünü vermedikçe kısmi toplam gösterilmez.
    const yakitTedariki = ilkYakit !== undefined && yakitCozumu !== undefined && kendiIsletmeleri.every((b) => b.ozel?.yakitTedariki?.mal === ilkYakit.mal && b.ozel?.lojistik?.sonCozum === yakitCozumu)
      ? kendiIsletmeleri.reduce((toplam, b) => {
        const yakit = b.ozel!.yakitTedariki!;
        toplam.tuketimMiliSaat += yakit.tuketimMiliSaat;
        toplam.stokMiliSaat += yakit.stokMiliSaat;
        toplam.sebekeMiliSaat += yakit.sebekeMiliSaat;
        return toplam;
      }, { mal: ilkYakit.mal, tuketimMiliSaat: 0, stokMiliSaat: 0, sebekeMiliSaat: 0 }) : undefined;
    // Tüm düğümler gider karesini vermeden kısmi toplamı gerçek toplam diye göstermeyiz.
    // Hiç düğüm yoksa yeni alanın sunucuda desteklenip desteklenmediği bilinmez.
    const sebekeGiderleri = kendiIsletmeleri.length > 0 && kendiIsletmeleri.every((b) => b.ozel?.sebekeGiderleri !== undefined)
      ? new Map<string, { mal: string; miktarMiliSaat: number; bedelMiliSaat: number }>() : undefined;
    if (sebekeGiderleri !== undefined) {
      for (const b of kendiIsletmeleri) for (const g of b.ozel!.sebekeGiderleri!) {
        let toplam = sebekeGiderleri.get(g.mal);
        if (toplam === undefined) {
          toplam = { mal: g.mal, miktarMiliSaat: 0, bedelMiliSaat: 0 };
          sebekeGiderleri.set(g.mal, toplam);
        }
        toplam.miktarMiliSaat += g.miktarMiliSaat;
        toplam.bedelMiliSaat += g.bedelMiliSaat;
      }
    }
    let ihracatEmriVar = false;
    const pazar: PazarKaynagi[] = [];
    // Net stok formülü gelenOran'ı ayrı taşımaz. Pozitif/negatif net oranı
    // "gelen" diye etiketlemeyiz; belirsizlik istemcide kesin stok reddi doğurmaz.
    const pazarDugumleri = k.bolgeler.filter((b) => o.mulk !== undefined && b.genel.sahip === o.id && b.id.endsWith(`#${o.id}`) && b.ozel !== undefined);
    const agMallari = mallar.map((_, mi) => ({
      stokMili: pazarDugumleri.reduce((n, b) => n + (b.ozel!.stoklar[mi] ? Math.max(0, stokAraDeger(b.ozel!.stoklar[mi]!, t)) : 0), 0),
      uretimMili: pazarDugumleri.reduce((n, b) => n + Math.max(0, b.ozel!.uretimOrani[mi] ?? 0), 0),
      gelenMili: null,
    }));
    const agEmirleri = new Set(pazarDugumleri.flatMap((b) => b.ozel!.emirler.filter(([, yon, oran]) => yon === 0 && oran > 0).map(([mi]) => mi)));
    // Yapı → ilçe ve hücre sayısı: abone olunan ilçe karelerinden (bilinmiyorsa yalnız il)
    const yer = new Map<string, { ilce: string; hucre: number }>();
    for (const c of k.ilceler ?? [])
      for (const [, sahip, , tesis, insaat] of c.hucreler) {
        if (sahip !== o.id) continue;
        const a = insaat >= 0 ? `i${insaat}` : tesis >= 0 ? `t${tesis}` : null;
        if (!a) continue;
        const y = yer.get(a);
        if (y) y.hucre++;
        else yer.set(a, { ilce: c.id, hucre: 1 });
      }
    const ilDugum = (i: number): string | undefined => k.bolgeler.find((b) => b.i === i)?.id.split("#")[0];
    const yapilar: IsletmeYapisi[] = [];
    // Tesis türü (kimlik): işletme düğümlerinin özel verisinden; ölçek büyütme inşaatında `hedef` TESİS kimliğidir (tür indeksi değil)
    const tesisTuru = (tesisId: number): string => {
      for (const b of k.bolgeler) {
        const t = b.ozel?.tesisler.find((x) => x[0] === tesisId);
        if (t) return turler[t[1]] ?? "";
      }
      return "";
    };
    for (const [id, tur, bolge, hedef, bitis, bas, ek] of o.insaatlar) {
      if (tur !== "tesis" && tur !== "olcek") continue;
      const anahtar = `i${id}`;
      const il = ilDugum(bolge);
      const baslangic = bas !== undefined && bas >= 0 ? { baslangic: bas } : {};
      if (tur === "olcek") {
        // Ek hücre gerekmediyse inşaatın hücresi yoktur: ilçe, büyüyen tesisin hücrelerinden bilinir
        const yer_ = yer.get(anahtar) ?? yer.get(`t${hedef}`);
        const hedefOlcek = this.olcekHedefleri.get(hedef);
        const asinma = this.tesisAsinmasiBul(hedef);
        yapilar.push({ anahtar, durum: "insaat", tur: tesisTuru(hedef), ...(il ? { il } : {}), ...(yer_ ? { ilce: yer_.ilce } : {}), ...(yer.get(anahtar) ? { hucre: yer.get(anahtar)!.hucre } : {}), ...baslangic, bitis, yukseltme: { tesis: hedef, ...(hedefOlcek ? { olcek: hedefOlcek } : {}) }, ...(asinma !== undefined ? { asinmaPpm: asinma } : {}) });
        continue;
      }
      const yontem = insaatYontemi(o, id);
      yapilar.push({ anahtar, durum: "insaat", tur: ek ?? turler[hedef] ?? "", ...(il ? { il } : {}), ...yer.get(anahtar), ...baslangic, bitis, ...(yontem !== undefined ? { yontem } : {}) });
    }
    const stok = new Map<number, { stokMili: number; uretimMili: number; satisMili: number; alisMili: number; satisBolge?: string; satisEmirMili?: number; satisNetPpm?: number }>();
    const mal = (m: number): { stokMili: number; uretimMili: number; satisMili: number; alisMili: number; satisBolge?: string; satisEmirMili?: number; satisNetPpm?: number } => {
      let x = stok.get(m);
      if (!x) stok.set(m, (x = { stokMili: 0, uretimMili: 0, satisMili: 0, alisMili: 0 }));
      return x;
    };
    // Pazar'da sat: malın satış emrinin yeri. Emri olan düğüm kazanır; emri yoksa malı en çok tutan düğüm (eşitlikte ilk).
    const satisAdayi = new Map<number, number>();
    for (const b of k.bolgeler) {
      const oz = b.ozel;
      if (!oz || b.genel.sahip !== o.id) continue;
      const il = b.id.split("#")[0];
      // Mülk düğümleri yerel NPC pazarına satabilir (liman gerekmez).
      const uygun = o.mulk !== undefined && b.id.endsWith(`#${o.id}`);
      for (let mi = 0; mi < mallar.length; mi++) {
        const stokMili = oz.stoklar[mi] ? Math.max(0, stokAraDeger(oz.stoklar[mi]!, t)) : 0;
        const uretimMili = oz.uretimOrani[mi] ?? 0;
        const emir = oz.emirler.find(([m, yon]) => m === mi && yon === 0);
        const emirMili = emir?.[2] ?? 0;
        const gerceklesenMili = emir?.[3] ?? 0;
        const ag = uygun ? agMallari[mi]! : { stokMili, uretimMili, gelenMili: null };
        // Her sahipli çıkış ilinde ağın bilinen malları seçilebilir; yerel stok0
        // başka ildeki malın satılmasını engellemez. Aktif emir her durumda kalır.
        if (ag.stokMili > 0 || ag.uretimMili > 0 || agEmirleri.has(mi) || emirMili > 0 || (oz.stoklar[mi]?.[1] ?? 0) !== 0) pazar.push({ bolge: b.id, il: il ?? b.id, mal: mallar[mi]!, stokMili, uretimMili, emirMili, gerceklesenMili, ag, uygun, ...(oz.isletme?.ihrNetPpm !== undefined ? { netPpm: oz.isletme.ihrNetPpm } : {}), ...(uygun ? {} : { neden: "Bu bölgede pazar satışı doğrulanamadı." }) });
      }
      for (const demet of oz.tesisler) {
        const [id, tur, yontemIdx, aktif, verim] = demet;
        const anahtar = `t${id}`;
        const olcek = tesisOlcegi(oz, id);
        const asinma = tesisAsinmasi(oz, id);
        const yontem = yontemler[yontemIdx];
        const surenOnarim = oz.onarim?.suruyor;
        const onarimBitis = uygun && surenOnarim?.tesisler.includes(id) ? surenOnarim.bitis : undefined;
        yapilar.push({ anahtar, durum: "tesis", tur: turler[tur] ?? "", ...(il ? { il } : {}), ...yer.get(anahtar), aktif: aktif === 1, verimPpm: verim, ...(olcek !== undefined ? { olcek } : {}), ...(asinma !== undefined ? { asinmaPpm: asinma } : {}), ...(yontem !== undefined ? { yontem } : {}), ...(onarimBitis === undefined ? {} : { onarimBitis }), bolge: b.id });
      }
      for (const [m, q] of oz.sebeke ?? []) if (q > 0) sebeke.set(m, (sebeke.get(m) ?? 0) + q);
      oz.stoklar.forEach((f, m) => {
        const v = stokAraDeger(f, t);
        if (v > 0 || f[1] !== 0) {
          mal(m).stokMili += Math.max(0, v);
          if (mal(m).satisEmirMili === undefined && v > (satisAdayi.get(m) ?? 0)) {
            satisAdayi.set(m, v);
            mal(m).satisBolge = b.id;
          }
        }
      });
      oz.uretimOrani.forEach((r, m) => {
        if (r > 0) mal(m).uretimMili += r;
      });
      for (const [m, yon, oran, gercek] of oz.emirler) {
        if (yon === 0) {
          const x = mal(m);
          x.satisMili += gercek;
          if (x.satisEmirMili === undefined) x.satisBolge = b.id; // ilk emri olan düğüm (mal başına tek emir; çok düğümde toplam oran)
          x.satisEmirMili = (x.satisEmirMili ?? 0) + oran;
          if (oran > 0) ihracatEmriVar = true;
        } else mal(m).alisMili += gercek;
      }
    }
    // Pazar'da sat: emrin yerindeki düğümün ihracat net çarpanı (sunucu `ozel.isletme.ihrNetPpm` (K2), isteğe bağlı: yoksa alan YAZILMAZ ve istemci "Eline geçen"i göstermez)
    const dugumNet = new Map<string, number>();
    for (const b of k.bolgeler) {
      const n = (b.ozel as { isletme?: { ihrNetPpm?: unknown } } | undefined)?.isletme?.ihrNetPpm;
      if (typeof n === "number" && Number.isFinite(n) && n > 0) dugumNet.set(b.id, n);
    }
    for (const x of stok.values()) {
      const n = x.satisBolge === undefined ? undefined : dugumNet.get(x.satisBolge);
      if (n !== undefined) x.satisNetPpm = n;
    }
    const mk = o.mulk;
    return {
      simZamani: t,
      ...(o.bakimDuzeyi === undefined ? {} : { bakimDuzeyi: o.bakimDuzeyi }),
      ...(onarimTeklifleri === undefined ? {} : { onarimTeklifleri }),
      ...(sondajTeklifleri === undefined ? {} : { sondajTeklifleri }),
      ...(o.sondaj === undefined ? {} : { sondaj: o.sondaj }),
      hazineMili: stokAraDeger(o.hazine, t),
      hazineOraniMili: o.hazine[1],
      araziDegeriMili: mk?.araziDegeriMili ?? null,
      araziVergisiMili: mk ? stokAraDeger(mk.araziVergisi, t) : null,
      ilceHucre: (mk?.ilceHucre ?? []).map(([i, n]) => [i, n]),
      korumaBitis: o.korumaBitis > t ? o.korumaBitis : null,
      ayrilmisBitis: mk?.ayrilmisBitis !== undefined && mk.ayrilmisBitis > t ? mk.ayrilmisBitis : null,
      // Katılım ilçesi: karede varsa o (ileriye uyumlu), yoksa bu oturumda gönderilen `katil`ın ilçesi, yoksa tek yurt ilçesi
      katilimIlcesi: this.katilimIlcesi(),
      indirimliYapiKalan: mk?.indirimliYapiKalan ?? null,
      yapilar,
      pazar,
      mallar: [...stok.entries()].sort((a, b) => a[0] - b[0]).map(([m, x]) => ({ mal: mallar[m] ?? String(m), ...x })),
      ...(sebeke.size > 0 ? { sebeke: [...sebeke.entries()] } : {}),
      ...(sebekeGiderleri === undefined ? {} : { sebekeGiderleri: [...sebekeGiderleri.values()].sort((a, b) => a.mal.localeCompare(b.mal)) }),
      ...(yakitTedariki === undefined ? {} : { yakitTedariki }),
      ...(tasimaGideriMiliSaat === undefined ? {} : { tasimaGideriMiliSaat }),
      ...(rezervler === undefined ? {} : { rezervler }),
      ...(ihracatEmriVar ? { ihracatEmriVar: true } : {}),
    };
  }

  /**
   * Sim zamanını hemen eşitler (`zamanIste` → `zaman`). Elle saatli sunucuda zaman yalnız değişiklikle gelir; yönetici zamanı
   * ilerlettiğinde istemci bununla (ya da 20 sn'lik döngüyle) yetişir. Sınama ve "hemen güncelle" için.
   */
  zamanEsitle(): Promise<void> {
    return new Promise((coz) => {
      const once = this.zamanRef;
      this.zamanIste();
      const son = Date.now() + 3000;
      const bak = (): void => {
        if (this.zamanRef !== once || Date.now() > son) return coz();
        setTimeout(bak, 15);
      };
      bak();
    });
  }

  /** Erken oyun süre çarpanı (0, 1] şimdiki zamanda: oyuncu karesindeki formülden (`erkenOyun`; çekirdek `sureCarpaniPpm` ile aynı); kare/formül yoksa 1. */
  erkenOyunCarpani(): number {
    return sureCarpani(this.kare?.oyuncu?.erkenOyun, this.simZamani());
  }

  /** İstemcinin tahmini sim zamanı (ms). */
  simZamani(): number {
    const r = this.zamanRef;
    return Math.floor(r.sim + (performance.now() - r.perf) * r.hiz);
  }

  /** Sınama kancası: sunucudaki sim hızı (sim ms / gerçek ms). */
  get hiz(): number {
    return this.zamanRef.hiz;
  }

  /** Sınama kancası: sunucu dizini (tesis türü sırası). */
  get tesisTurleri(): readonly string[] {
    return this.hos?.dizin.tesisTurleri ?? [];
  }

  kapat(): void {
    this.kapandi = true;
    this.durum = "kapali";
    if (this.yenidenZamanlayici) clearTimeout(this.yenidenZamanlayici);
    if (this.zamanZamanlayici) clearInterval(this.zamanZamanlayici);
    for (const b of this.bekleyenler.values()) {
      clearTimeout(b.zamanlayici);
      b.reddet(new Error("Bağlantı kapatıldı."));
    }
    this.bekleyenler.clear();
    try {
      this.ws?.close(1000, "istemci kapatti");
    } catch {
      /* yoksay */
    }
    this.ws = null;
  }

  // --- bağlantı -----------------------------------------------------------------------------------

  private baglan(): void {
    if (this.kapandi) return;
    this.durum = this.ilkAcildi ? "kopuk" : "baglaniyor";
    const t = this.s.token;
    if (typeof t === "function") {
      // Bilet işlevi: her bağlanışta taze bilet (tek kullanımlık, 60 sn)
      t().then(
        (bilet) => {
          this.baglanTokenla(bilet);
        },
        (e: unknown) => {
          if (this.kapandi) return;
          const ileti = e instanceof Error ? e.message : String(e);
          if ((e as { kod?: unknown } | null)?.kod === "oturum_yok") {
            this.durum = "reddedildi";
            this.sonHata = "Oturum bitti: yeniden giriş yapmalısın.";
            this.ilkHos.reddet(new Error(this.sonHata));
            this.bekleyenleriReddet(this.sonHata);
            this.degisti();
            return;
          }
          // Ağ ya da geçici hata: ilk bağlanışta çağırana, sonrasında geri çekilmeyle yeniden
          if (!this.ilkAcildi) {
            this.sonHata = `Bilet alınamadı: ${ileti}`;
            this.ilkHos.reddet(new Error(this.sonHata));
            return;
          }
          this.durum = "kopuk";
          this.degisti();
          this.yenidenPlanla();
        },
      );
      return;
    }
    this.baglanTokenla(t);
  }

  private baglanTokenla(token: string): void {
    if (this.kapandi) return;
    const Ctor = this.s.WebSocketCtor ?? WebSocket;
    const ws = new Ctor(this.s.url);
    this.ws = ws;
    ws.addEventListener("open", () => {
      this.gonder({ tur: "merhaba", protokolSurumu: PROTOKOL_SURUMU, token, istemciKimligi: this.istemciKimligi });
    });
    ws.addEventListener("message", (e) => {
      if (typeof e.data === "string") this.mesajAl(e.data);
    });
    ws.addEventListener("close", (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.zamanZamanlayici) clearInterval(this.zamanZamanlayici);
      if (this.kapandi) return;
      if (e.code === 4003 && typeof this.s.token === "function" && this.kimlikReddi++ === 0) {
        // Bilet/oturum reddi: bir kez sessizce yeni biletle yeniden dene (oturum geçerliyse sorun kalmaz; değilse bilet işlevi oturum_yok verir)
        this.yenidenPlanla();
        return;
      }
      if (e.code === 4003 || e.code === 4001 || e.code === 4002) {
        this.durum = "reddedildi";
        this.sonHata = kapanisMesaji(e.code);
        this.ilkHos.reddet(new Error(this.sonHata));
        this.bekleyenleriReddet(this.sonHata);
        this.degisti();
        return;
      }
      if (!this.ilkAcildi) {
        this.sonHata = kapanisMesaji(e.code);
        this.ilkHos.reddet(new Error(this.sonHata));
        return;
      }
      this.durum = "kopuk";
      this.degisti();
      this.yenidenPlanla();
    });
    ws.addEventListener("error", () => {
      /* close olayı ardından gelir */
    });
  }

  private yenidenPlanla(): void {
    if (this.kapandi || this.yenidenZamanlayici) return;
    const gec = this.geriCekilme;
    this.geriCekilme = Math.min(this.s.geriCekilmeMs?.en ?? 10_000, this.geriCekilme * 2);
    this.yenidenZamanlayici = setTimeout(() => {
      this.yenidenZamanlayici = null;
      this.baglan();
    }, gec);
  }

  private gonder(m: IstemciMesaji): void {
    const ws = this.ws;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
  }

  private bekleyenleriReddet(neden: string): void {
    for (const b of this.bekleyenler.values()) {
      clearTimeout(b.zamanlayici);
      b.reddet(new Error(neden));
    }
    this.bekleyenler.clear();
  }

  // --- gelen mesajlar -----------------------------------------------------------------------------

  private mesajAl(metin: string): void {
    const r = sunucuMesajiCoz(metin);
    if (!r.tamam) {
      this.sunucuHatalari.push(`çözülemeyen sunucu mesajı: ${r.hata}`);
      return;
    }
    const m = r.mesaj;
    switch (m.tur) {
      case "hosgeldin":
        return this.hosgeldinAl(m);
      case "kare":
        this.kare = m.kare;
        this.adlariBirlestir(m.kare.adlar);
        this.rev = m.rev;
        this.zamanDuzelt(m.kare.t);
        this.ayrilmisAboneKontrol();
        this.karedeKosulBak();
        return this.degisti();
      case "delta":
        if (!this.kare || m.onceki !== this.rev) {
          // Zincir koptu: tam kare iste.
          this.rev = 0;
          this.kare = null;
          return this.aboneGonder();
        }
        this.kare = deltaUygula(this.kare, m.delta);
        this.adlariBirlestir(m.delta.adlar);
        this.rev = m.rev;
        this.zamanDuzelt(m.delta.t);
        this.ayrilmisAboneKontrol();
        this.karedeKosulBak();
        return this.degisti();
      case "komutSonucu": {
        const k = this.katilBekleyen;
        if (k && k.anahtar === m.anahtar) {
          this.katilBekleyen = null;
          clearTimeout(k.zamanlayici);
          k.coz(m.sonuc.tamam ? { tamam: true } : { tamam: false, hata: m.sonuc.hata });
          return;
        }
        const b = this.bekleyenler.get(m.anahtar);
        if (!b) return;
        clearTimeout(b.zamanlayici);
        this.bekleyenler.delete(m.anahtar);
        b.coz(m.sonuc.tamam ? { tamam: true, t: m.t } : { tamam: false, hata: m.sonuc.hata });
        return;
      }
      case "zaman": {
        const gidisDonus = performance.now() - m.istemciGonderim;
        if (gidisDonus <= this.enIyiGidisDonus * 2 + 5) {
          this.enIyiGidisDonus = Math.min(this.enIyiGidisDonus, gidisDonus);
          this.zamanRef = { perf: performance.now(), sim: m.simZamani + (m.hiz * gidisDonus) / 2, hiz: m.hiz };
        } else this.zamanRef.hiz = m.hiz;
        return this.degisti();
      }
      case "hata":
        return this.hataAl(m);
      case "durum":
        return this.durumAl(m);
      case "ozet":
        return;
      case "defter": {
        const b = this.defterBekleyen.get(m.istek ?? -1);
        if (!b) return;
        this.defterBekleyen.delete(m.istek ?? -1);
        clearTimeout(b.zamanlayici);
        b.coz({ kazanilan: m.kazanilan, siradaki: m.siradaki, toplamOdulMili: m.toplamOdulMili, tavanMili: m.tavanMili });
        return;
      }
      case "donusOzeti":
        this.donus = m.ozet;
        return this.degisti();
    }
  }

  /**
   * Yetişme durumu: sunucu kapalı geçen süreyi işletirken komutları `yetisiyor` hatasıyla reddeder (günlüğe girmez);
   * `yetisiyor: false` gelince bekleyen komutlar AYNI anahtarla yeniden gönderilir.
   */
  private durumAl(m: Mesaj<"durum">): void {
    if (m.yetisiyor) {
      const bas = this.yetisme?.bas ?? m.simZamani;
      this.yetisme = { bas, hedef: m.hedefZamani, simdi: m.simZamani };
    } else {
      this.yetisme = null;
      this.zamanRef = { perf: performance.now(), sim: m.simZamani, hiz: this.zamanRef.hiz };
      for (const b of this.bekleyenler.values()) {
        if (!b.yetismeBekliyor) continue;
        b.yetismeBekliyor = false;
        this.gonder({ tur: "komut", anahtar: b.anahtar, komut: b.komut });
      }
    }
    this.degisti();
  }

  private hosgeldinAl(m: Mesaj<"hosgeldin">): void {
    this.kimlikReddi = 0;
    this.hos = m;
    if (m.donusOzeti) this.donus = m.donusOzeti;
    this.ben = { id: m.oyuncu, ad: m.oyuncu };
    this.durum = "bagli";
    this.sonHata = null;
    this.geriCekilme = this.s.geriCekilmeMs?.ilk ?? 500;
    this.zamanRef = { perf: performance.now(), sim: m.simZamani, hiz: m.hiz };
    this.enIyiGidisDonus = Infinity;
    this.kare = null;
    this.rev = 0;
    const ilk = !this.ilkAcildi;
    this.ilkAcildi = true;
    this.yetisme = m.yetisiyor === true && m.hedefZamani !== undefined ? { bas: m.simZamani, hedef: m.hedefZamani, simdi: m.simZamani } : null;
    // Oyuncu karesi için abonelik şart (ilgi boş olsa bile): sunucu tam kareyi ancak `abone` ile gönderir.
    this.aboneGonder();
    this.zamanIste();
    if (this.zamanZamanlayici) clearInterval(this.zamanZamanlayici);
    this.zamanZamanlayici = setInterval(() => this.zamanIste(), this.s.zamanAraligiMs ?? 20_000);
    // Bağlantı kopukken bekleyen komutlar aynı anahtarla yeniden gönderilir (sunucu ikinci kez uygulamaz).
    for (const b of this.bekleyenler.values()) this.gonder({ tur: "komut", anahtar: b.anahtar, komut: b.komut });
    if (ilk) this.ilkHos.coz();
    this.degisti();
  }

  private hataAl(m: Mesaj<"hata">): void {
    if (m.anahtar !== undefined) {
      const b = this.bekleyenler.get(m.anahtar);
      if (!b) return;
      if (m.kod === "yetisiyor") {
        // Sunucu kapalıyken geçen süreyi yetiştiriyor: komut günlüğe girmedi. Beklet; `durum` bitişi bildirince (ya da
        // `durum` kaçarsa kısa aralıkla) aynı anahtarla yeniden gönder. Zaman aşımı sayacı her reddedişte yenilenir.
        b.yetismeBekliyor = true;
        clearTimeout(b.zamanlayici);
        b.zamanlayici = this.komutZamanlayicisi(b.anahtar, reddetFn(b));
        setTimeout(() => {
          if (this.bekleyenler.has(b.anahtar) && b.yetismeBekliyor && !this.yetisme) {
            b.yetismeBekliyor = false;
            this.gonder({ tur: "komut", anahtar: b.anahtar, komut: b.komut });
          }
        }, 1500);
        this.degisti();
        return;
      }
      if (m.kod === "hiz_siniri" && b.denemeler < 6) {
        // Sunucu komutu günlüğe almadı: aynı anahtarla biraz sonra yeniden dene.
        b.denemeler++;
        setTimeout(() => {
          if (this.bekleyenler.has(b.anahtar)) this.gonder({ tur: "komut", anahtar: b.anahtar, komut: b.komut });
        }, 400 * b.denemeler);
        return;
      }
      clearTimeout(b.zamanlayici);
      this.bekleyenler.delete(m.anahtar);
      b.coz({ tamam: false, hata: m.kod === "yetki" || m.kod === "hiz_siniri" ? `${m.kod}: ${m.mesaj}` : m.mesaj });
      return;
    }
    if (m.kod === "gecersiz_ilgi") {
      const ad = /bilinmeyen ilce: (\S+)/.exec(m.mesaj)?.[1];
      if (ad) {
        this.yok.add(ad);
        this.degisti();
        this.karedeKosulBak();
        this.aboneIste();
        return;
      }
    }
    this.sunucuHatalari.push(`${m.kod}: ${m.mesaj}`);
  }

  // --- abonelik -----------------------------------------------------------------------------------

  private istenenIlceler(): string[] {
    const k = new Set<string>();
    for (const l of this.kaynaklar.values()) for (const i of l) if (!this.yok.has(i)) k.add(i);
    return [...k].sort();
  }

  private aboneIste(): void {
    if (this.aboneBekliyor) return;
    this.aboneBekliyor = true;
    queueMicrotask(() => {
      this.aboneBekliyor = false;
      this.aboneGonder();
    });
  }

  /** Ayrılmış hücre listesi istenmiş mi (aboneliğe `ayrilmis: true` eklendi)? */
  private ayrilmisIstendi = false;

  /**
   * Ayrılmış hücre listesi (büyük: Gebze ölçeğinde ilçe başına ~200 KB gzip) yalnız oyuncunun ayrılmış hakkı sürerken istenir:
   * ayrılmış hücre yalnız katılım ilçesinde ve katılımın ilk günlerinde satılır; başka durumda fiyat zaten normal eğridir.
   */
  private ayrilmisListesiGerek(): boolean {
    const bitis = this.kare?.oyuncu?.mulk?.ayrilmisBitis;
    return bitis !== undefined && bitis > this.simZamani();
  }

  private aboneGonder(): void {
    const ilceler = this.istenenIlceler();
    this.ayrilmisIstendi = this.ayrilmisListesiGerek();
    // Kamu arsası blokları (değişmez; ilçe ilk girdiğinde bir kez gelir): haritada doku ve hücre kartı için
    this.gonder({ tur: "abone", kamu: true, ...(this.ayrilmisIstendi ? { ayrilmis: true } : {}), ...(ilceler.length ? { ilceler } : {}) });
  }

  /** Oyuncu karesi ilk geldikten sonra (hak sürüyorsa) abonelik ayrılmış listesiyle yenilenir (tam kare gelir). */
  private ayrilmisAboneKontrol(): void {
    if (!this.ayrilmisIstendi && this.ayrilmisListesiGerek()) this.aboneGonder();
  }

  private zamanIste(): void {
    this.gonder({ tur: "zamanIste", istemciGonderim: performance.now() });
  }

  /** Karedeki `t` tahminden ileriyse (ya da hız 0 ise) sim zamanını kareye sabitler. */
  private zamanDuzelt(t: number): void {
    const r = this.zamanRef;
    if (r.hiz === 0 || t > this.simZamani()) this.zamanRef = { perf: performance.now(), sim: t, hiz: r.hiz };
  }

  // --- komut yolu ----------------------------------------------------------------------------------

  private komutGonder(komut: Komut): Promise<{ t: number; tamam: true } | { tamam: false; hata: string }> {
    const anahtar = `${this.istemciKimligi.slice(-10)}-${(++this.sayac).toString(36)}-${rastgele(5)}`.slice(0, 64);
    return new Promise((coz, reddet) => {
      const zamanlayici = this.komutZamanlayicisi(anahtar, reddet);
      this.bekleyenler.set(anahtar, { anahtar, komut, coz, reddet, zamanlayici, denemeler: 0, yetismeBekliyor: false });
      this.gonder({ tur: "komut", anahtar, komut, istemciZamani: performance.now() });
    });
  }

  /** Komut yanıt zaman aşımı: dolunca bekleyen kaydı silinir ve söz reddedilir. */
  private komutZamanlayicisi(anahtar: string, reddet: (e: Error) => void): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      this.bekleyenler.delete(anahtar);
      reddet(Object.assign(new Error("Sunucudan yanıt gelmedi."), { kod: "zaman_asimi" }));
    }, this.s.komutZamanAsimiMs ?? 30_000);
  }

  private agHatasi(e: unknown): { tamam: false; hata: "baglanti" | "zaman_asimi"; mesaj: string } {
    const zaman = (e as { kod?: string }).kod === "zaman_asimi";
    return { tamam: false, hata: zaman ? "zaman_asimi" : "baglanti", mesaj: zaman ? "Sunucudan yanıt gelmedi; komut uygulanmış olabilir, birazdan haritayı kontrol edin." : e instanceof Error ? e.message : "Sunucuyla bağlantı yok." };
  }

  // --- kare -> sahiplik ----------------------------------------------------------------------------

  private ilceKaresi(ilce: string): IlceKaresi | undefined {
    return this.kare?.ilceler?.find((c) => c.id === ilce);
  }

  private karedeBekle(kosul: () => boolean, ms: number): Promise<boolean> {
    return new Promise((coz) => {
      if (kosul()) return coz(true);
      const zaman = setTimeout(() => {
        this.kareBekleyen = this.kareBekleyen.filter((f) => f !== kontrol);
        coz(false);
      }, ms);
      const kontrol = (): boolean => {
        if (!kosul()) return false;
        clearTimeout(zaman);
        coz(true);
        return true;
      };
      this.kareBekleyen.push(kontrol);
    });
  }

  /** Bir tesisin aşınması: tesisin bulunduğu (kendi) işletme düğümünün özel verisinden. */
  private tesisAsinmasiBul(tesisId: number): number | undefined {
    for (const b of this.kare?.bolgeler ?? []) {
      if (!b.ozel) continue;
      if (b.ozel.tesisler.some((x) => x[0] === tesisId)) return tesisAsinmasi(b.ozel, tesisId);
    }
    return undefined;
  }

  private adlariBirlestir(adlar: Readonly<Record<OyuncuId, string>> | undefined): void {
    if (adlar === undefined) return;
    for (const [id, ad] of Object.entries(adlar)) this.adOnbellek.set(id, ad);
  }

  private karedeKosulBak(): void {
    this.kareBekleyen = this.kareBekleyen.filter((f) => !f());
  }

  /** Ayrılmış hücre listesi → küme (değişmez dizi başına bir kez; delta aynı diziyi korur). */
  private ayrilmisOnbellek = new WeakMap<readonly string[], ReadonlySet<string>>();
  private ayrilmisKumesi(l: readonly string[]): ReadonlySet<string> {
    let k = this.ayrilmisOnbellek.get(l);
    if (!k) this.ayrilmisOnbellek.set(l, (k = new Set(l)));
    return k;
  }

  private sahiplik(ilce: string): IlceSahipligi {
    const c = this.ilceKaresi(ilce)!;
    const k = this.kare!;
    const ben = this.ben.id;
    const hucreler = new Map<HucreId, HucreSahipligi>();
    const gruplar = new Map<string, YapiKaydi>();
    for (const [id, sahip, sinif, tesis, insaat, tur] of c.hucreler) {
      const h: HucreSahipligi = { sahip, sinif, degerMili: 0, alinma: 0 };
      if (tesis >= 0) h.tesis = tesis;
      if (insaat >= 0) h.insaat = insaat;
      hucreler.set(id, h);
      const anahtar = insaat >= 0 ? `i${insaat}` : tesis >= 0 ? `t${tesis}` : null;
      if (anahtar === null) continue;
      let y = gruplar.get(anahtar);
      if (!y) gruplar.set(anahtar, (y = { id: insaat >= 0 ? insaat : tesis, anahtar, durum: insaat >= 0 ? "insaat" : "tesis", sahip, hucreler: [] }));
      y.hucreler.push(id);
      // Hücre türü ("dukkan") herkese açıktır: başkasının dükkânı da yürüyüşte dükkân olarak çizilir (tabela yoksa markasız)
      if (tur === "dukkan" && y.tur === undefined) y.tur = "dukkan";
    }
    // Sahibine özel ayrıntı: tür adı (dizinden), inşaat bitişi ve (bu oturumda başlatıldıysa) başlangıcı
    const turler = this.hos?.dizin.tesisTurleri ?? [];
    const kendi = k.bolgeler.find((b) => b.id.endsWith(`#${ben}`) && b.id.startsWith(`${c.il}#`));
    for (const y of gruplar.values()) {
      if (y.sahip !== ben) continue;
      if (y.durum === "insaat") {
        const ins = k.oyuncu?.insaatlar.find((x) => x[0] === y.id);
        if (ins) {
          if (ins[1] === "olcek") {
            // Ölçek büyütme: `hedef` büyüyen TESİSİN kimliğidir (tür indeksi değil); hücreler yalnız eklenecek olanlardır
            const t = kendi?.ozel?.tesisler.find((x) => x[0] === ins[3]);
            const tur = t ? turler[t[1]] : undefined;
            if (tur) y.tur = tur;
            const hedefOlcek = this.olcekHedefleri.get(ins[3]);
            y.yukseltme = { tesis: ins[3], ...(hedefOlcek ? { olcek: hedefOlcek } : {}) };
            const asinma = kendi?.ozel ? tesisAsinmasi(kendi.ozel, ins[3]) : undefined;
            if (asinma !== undefined) y.asinmaPpm = asinma;
          } else {
            const tur = turler[ins[3]];
            if (tur) y.tur = tur;
            const yontem = k.oyuncu ? insaatYontemi(k.oyuncu, ins[0]) : undefined;
            if (yontem !== undefined) y.yontem = yontem;
          }
          y.bitis = ins[4];
          const bas = this.insaBaslangic.get(y.hucreler[0]!);
          if (bas !== undefined) y.baslangic = bas;
        }
      } else {
        const t = kendi?.ozel?.tesisler.find((x) => x[0] === y.id);
        if (kendi?.genel.sahip === ben && t !== undefined && (t[3] === 0 || t[3] === 1)) y.aktif = t[3] === 1;
        const tur = t ? turler[t[1]] : undefined;
        if (tur) y.tur = tur;
        const olcek = t && kendi?.ozel ? tesisOlcegi(kendi.ozel, t[0]) : undefined;
        if (olcek !== undefined) y.olcek = olcek;
        const asinma = t && kendi?.ozel ? tesisAsinmasi(kendi.ozel, t[0]) : undefined;
        if (asinma !== undefined) y.asinmaPpm = asinma;
        // Biten tesisin üretim yöntemi (yürüyüşte imza silüeti): `ozel.tesisler[2]` yöntem indeksidir
        const yontem = t ? this.hos?.dizin.yontemler[t[2]] : undefined;
        if (yontem) y.yontem = yontem;
      }
    }
    // Ayrılmış hücre kümesi (liste istenmişse) ve para ile alınmış ayrılmış sayısı: karede `ayrilmisSatilmis` varsa kesin değer; yoksa
    // (eski sunucu) satılmış ∩ ayrılmış tahmini; liste de yoksa bilinmiyor (eğri normal sayılır).
    const ayrilmis = c.ayrilmis ? this.ayrilmisKumesi(c.ayrilmis) : undefined;
    const kesin = c.ayrilmisSatilmis;
    let ayrilmisSatilmis: number | undefined = kesin;
    if (ayrilmisSatilmis === undefined && ayrilmis) {
      ayrilmisSatilmis = 0;
      for (const id of hucreler.keys()) if (ayrilmis.has(id)) ayrilmisSatilmis++;
    }
    return {
      ilce,
      hucreler,
      uygun: c.uygunHucre,
      satilmis: c.satilmisHucre,
      ...(ayrilmis ? { ayrilmis } : {}),
      ...(ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis } : {}),
      yapilar: [...gruplar.values()],
      ...(c.kamuAdet !== undefined ? { kamuAdet: c.kamuAdet } : {}),
      ...(c.ayrilmisAdet !== undefined ? { ayrilmisAdet: c.ayrilmisAdet } : {}),
      ...(c.kamu ? { kamu: c.kamu } : {}),
    };
  }

  /** Biten dükkânın tabelası (herkese açık: `genel.dukkanlar` = `[kimlik, tür, ölçek, markaAd, simge, renk]`); dükkân değilse tanımsız. Markasız dükkânda renk yazılmaz. */
  private dukkanTabelasi(id: number): { tur: string; markaRenk?: number } | undefined {
    for (const b of this.kare?.bolgeler ?? []) {
      const x = b.genel.dukkanlar?.find((d) => d[0] === id);
      if (x) return { tur: x[1], ...(x[3] !== "" ? { markaRenk: x[5] } : {}) };
    }
    return undefined;
  }

  /**
   * Yürüyüş için ilçenin yapıları (gerçek sunucu verisi): inşaat aşamaları, biten dükkânın türü ve marka rengi, biten tesisin yöntemi (silüet).
   * Örnek yer tutucular yalnız sunucusuz kipte kalır (`ornekInsaatlar`; sahte bağdaştırıcıda bu uç yoktur). Aşınmayı sahne ekler.
   */
  async insaatlarAl(ilce: string): Promise<InsaatBilgisi[]> {
    const sh = await this.sahiplikAl(ilce);
    return yapilariEsle(sh, this.ozet()?.simZamani ?? this.kare?.t ?? 0, (id) => this.dukkanTabelasi(id));
  }

  private degisti(): void {
    if (this.bildirimBekliyor) return;
    this.bildirimBekliyor = true;
    queueMicrotask(() => {
      this.bildirimBekliyor = false;
      for (const f of [...this.dinleyiciler]) f();
    });
  }
}

/** Komut sunucunun komut şemasında var mı? (protokol paketiyle; sunucu aynı şemayı kullanır) */
const komutOnbellek = new Map<string, boolean>();
function komutVarMi(k: Record<string, unknown>, alan?: string): boolean {
  const tur = String(k["tur"]);
  const anahtar = alan ? `${tur}.${alan}` : tur;
  let v = komutOnbellek.get(anahtar);
  if (v === undefined) {
    const r = KomutSemasi.safeParse(k);
    // `alan` verilirse şema o alanı TANIMALI (zod bilinmeyen alanı sessizce atar; eski sunucu `siniflar`ı yok sayıp yanlış sınıfla alırdı)
    v = r.success && (alan === undefined || alan in (r.data as unknown as Record<string, unknown>));
    komutOnbellek.set(anahtar, v);
  }
  return v;
}

function yapilariEsle(sh: IlceSahipligi | null, simdi: number, dukkan: (id: number) => { tur: string; markaRenk?: number } | undefined): InsaatBilgisi[] {
  return yapilardanInsaatlar({ yapilar: sh?.yapilar ?? [], simdi, dukkan });
}

/** Sayfa adresinden sunucu seçenekleri: `?sunucu=ws://...&token=...`. `varsayilan` (kendi köken, `giris/kip.ts`) yalnız `?sunucu=` yokken geçer; ikisi de yoksa null (sahte bağdaştırıcı). */
export function sunucuSecenekleri(arama: string, varsayilan = ""): { url: string; token: string } | null {
  const q = new URLSearchParams(arama);
  const url = q.get("sunucu") || varsayilan;
  if (!url) return null;
  const token = q.get("token") ?? "";
  return { url, token };
}

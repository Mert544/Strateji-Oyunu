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
import { KomutSemasi, PROTOKOL_SURUMU, deltaUygula, stokAraDeger, sunucuMesajiCoz } from "@bolge/protokol";
import type { Defter, DonusOzeti, IlgiKaresi, IlceKaresi, IstemciMesaji, SunucuMesaji } from "@bolge/protokol";
import type { DukkanKaresi, DukkanKomutSonucu, GeriAlIstegi, HucreSahipligi, IlceSahipligi, IsletmeDurumu, IsletmeYapisi, MulkBaglantisi, MulkOzeti, OlcekIstegi, Oyuncu, ParselKomutu, ParselSonucu, TesisKomutu, TesisSonucu, YapiKaydi, YerlestirIstegi } from "./baglanti";
import { hataHucresi, mulkHatasiTurkce } from "./hata-mulk";
import { parselToplamFiyatiMili } from "./fiyat";

type Mesaj<T extends SunucuMesaji["tur"]> = Extract<SunucuMesaji, { tur: T }>;

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
    return id;
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
      const r = await this.komutGonder({ tur: "yapi_yerlestir", ilce: i.ilce, tesisTuru: i.tesisTuru, hucreler: i.hucreler, sinif: i.sinif, ...(i.siniflar ? { siniflar: i.siniflar } : {}), ...(i.dukkanTuru ? { dukkanTuru: i.dukkanTuru } : {}) } as unknown as Komut);
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
        yapilar.push({ anahtar, durum: "insaat", tur: tesisTuru(hedef), ...(il ? { il } : {}), ...(yer_ ? { ilce: yer_.ilce } : {}), ...(yer.get(anahtar) ? { hucre: yer.get(anahtar)!.hucre } : {}), ...baslangic, bitis, yukseltme: { tesis: hedef, ...(hedefOlcek ? { olcek: hedefOlcek } : {}) } });
        continue;
      }
      yapilar.push({ anahtar, durum: "insaat", tur: ek ?? turler[hedef] ?? "", ...(il ? { il } : {}), ...yer.get(anahtar), ...baslangic, bitis });
    }
    const stok = new Map<number, { stokMili: number; uretimMili: number; satisMili: number; alisMili: number }>();
    const mal = (m: number): { stokMili: number; uretimMili: number; satisMili: number; alisMili: number } => {
      let x = stok.get(m);
      if (!x) stok.set(m, (x = { stokMili: 0, uretimMili: 0, satisMili: 0, alisMili: 0 }));
      return x;
    };
    for (const b of k.bolgeler) {
      const oz = b.ozel;
      if (!oz) continue;
      const il = b.id.split("#")[0];
      for (const demet of oz.tesisler) {
        const [id, tur, , aktif, verim] = demet;
        const anahtar = `t${id}`;
        const olcek = tesisOlcegi(oz, id);
        yapilar.push({ anahtar, durum: "tesis", tur: turler[tur] ?? "", ...(il ? { il } : {}), ...yer.get(anahtar), aktif: aktif === 1, verimPpm: verim, ...(olcek !== undefined ? { olcek } : {}) });
      }
      oz.stoklar.forEach((f, m) => {
        const v = stokAraDeger(f, t);
        if (v > 0) mal(m).stokMili += v;
      });
      oz.uretimOrani.forEach((r, m) => {
        if (r > 0) mal(m).uretimMili += r;
      });
      for (const [m, yon, , gercek] of oz.emirler) {
        if (yon === 0) mal(m).satisMili += gercek;
        else mal(m).alisMili += gercek;
      }
    }
    const mk = o.mulk;
    return {
      simZamani: t,
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
      mallar: [...stok.entries()].sort((a, b) => a[0] - b[0]).map(([m, x]) => ({ mal: mallar[m] ?? String(m), ...x })),
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
    for (const [id, sahip, sinif, tesis, insaat] of c.hucreler) {
      const h: HucreSahipligi = { sahip, sinif, degerMili: 0, alinma: 0 };
      if (tesis >= 0) h.tesis = tesis;
      if (insaat >= 0) h.insaat = insaat;
      hucreler.set(id, h);
      const anahtar = insaat >= 0 ? `i${insaat}` : tesis >= 0 ? `t${tesis}` : null;
      if (anahtar === null) continue;
      let y = gruplar.get(anahtar);
      if (!y) gruplar.set(anahtar, (y = { id: insaat >= 0 ? insaat : tesis, anahtar, durum: insaat >= 0 ? "insaat" : "tesis", sahip, hucreler: [] }));
      y.hucreler.push(id);
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
          } else {
            const tur = turler[ins[3]];
            if (tur) y.tur = tur;
          }
          y.bitis = ins[4];
          const bas = this.insaBaslangic.get(y.hucreler[0]!);
          if (bas !== undefined) y.baslangic = bas;
        }
      } else {
        const t = kendi?.ozel?.tesisler.find((x) => x[0] === y.id);
        const tur = t ? turler[t[1]] : undefined;
        if (tur) y.tur = tur;
        const olcek = t && kendi?.ozel ? tesisOlcegi(kendi.ozel, t[0]) : undefined;
        if (olcek !== undefined) y.olcek = olcek;
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

/** Sayfa adresinden sunucu seçenekleri: `?sunucu=ws://...&token=...`. Sunucu parametresi yoksa null (sahte bağdaştırıcı). */
export function sunucuSecenekleri(arama: string): { url: string; token: string } | null {
  const q = new URLSearchParams(arama);
  const url = q.get("sunucu");
  if (!url) return null;
  const token = q.get("token") ?? "";
  return { url, token };
}

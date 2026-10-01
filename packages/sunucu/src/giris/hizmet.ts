/**
 * Giriş hizmeti: e-posta bağlantısıyla giriş (G5; KIMLIK.md). HTTP'den bağımsız iş mantığıdır (`giris/http.ts` uçları bunu çağırır).
 *
 * Akış: `istekAl` (eşzamanlı, depoya/postaya GİTMEZ) -> arka planda bağlantı üretimi + posta -> `onayla` (bağlantı tüketilir, hesap
 * ve oturum açılır) -> `biletUret` (çerezle; ws bileti) -> ws `merhaba` (`AuthKimligi.dogrula`).
 *
 * Kullanıcı sızdırmama: `istekAl` hesabın var olup olmadığına, posta sonucuna ve e-posta başına sınıra BAKMADAN döner; her yanıt aynıdır.
 * Hesap araması, bağlantı kaydı ve posta yanıttan SONRA, sıralı bir arka plan işinde yapılır (yanıt süresi hesaptan bağımsızdır).
 * Saat enjekte edilir (`simdi`); bütün süreler ve sınırlar parametredir.
 */
import { randomBytes } from "node:crypto";
import { HizSiniri } from "../hiz-siniri";
import { turkiyeGeceYarisi } from "../saat";
import type { AdSuzgeci } from "../ad-suzgec";
import type { HizSiniriSecenekleri } from "../hiz-siniri";
import { OyuncuCakismasi } from "../depo/tipler";
import type { HesapDeposu, HesapKaydi, OturumKaydi } from "../depo/tipler";
import { AuthKimligi } from "./auth-kimligi";
import { epostaCoz, epostaMaskele, geciciAlanMi } from "./eposta";
import type { EpostaBicimi } from "./eposta";
import { Imzalayici, baglantiJetonuCoz, baglantiJetonuUret, biletUret, oturumBelirteciCoz, oturumBelirteciUret, ozet, rastgele, sabitEsit, silmeJetonuCoz, silmeJetonuUret } from "./jeton";
import { AdUretici, adIletisi, adKelimeleriniYukle } from "./gorunen-ad";
import type { AdKurali } from "./gorunen-ad";
import { girisPostasi, hesapSilmePostasi } from "./posta";
import type { PostaGonderici } from "./posta";
import type { Davetliler } from "./davet";
import { GirisSayaclari } from "./sayac";
import type { GirisGunlugu } from "./sayac";

const SAAT_MS = 3_600_000;
const GUN_MS = 24 * SAAT_MS;

export interface GirisSureleri {
  /** Sihirli bağlantı ömrü. Varsayılan 10 dk. */
  baglantiOmruMs: number;
  /** Oturumun kayan süresi. Varsayılan 30 gün. */
  oturumKayanMs: number;
  /** Oturumun mutlak üst sınırı. Varsayılan 90 gün. */
  oturumMutlakMs: number;
  /** Kayan süre en çok bu aralıkta bir uzar. Varsayılan 1 gün. */
  oturumUzatmaAraligiMs: number;
  /** ws bileti ömrü. Varsayılan 60 sn. */
  biletOmruMs: number;
  /** Hesap silme onay bağlantısı ömrü. Varsayılan 30 dk. */
  hesapSilBaglantiOmruMs: number;
}

export const VARSAYILAN_GIRIS_SURELERI: GirisSureleri = {
  baglantiOmruMs: 10 * 60_000,
  oturumKayanMs: 30 * GUN_MS,
  oturumMutlakMs: 90 * GUN_MS,
  oturumUzatmaAraligiMs: GUN_MS,
  biletOmruMs: 60_000,
  hesapSilBaglantiOmruMs: 30 * 60_000,
};

export interface GirisSinirlari {
  /** Aynı e-posta (normalleştirilmiş) için bağlantı isteği. Varsayılan 3/saat. Aşımda yanıt AYNIdır, posta gitmez. */
  epostaBasina: HizSiniriSecenekleri;
  /** IP başına bağlantı isteği. Varsayılan 20/saat. Aşımda 429. */
  ipBasina: HizSiniriSecenekleri;
  /** Bütün istekler için genel tavan (posta kuyruğu). Varsayılan 1000/saat. Aşımda 429. */
  genel: HizSiniriSecenekleri;
  /** IP başına onay denemesi (kaba kuvvet). Varsayılan 20 deneme, saatte 60 dolar. Aşımda 429. */
  onayIpBasina: HizSiniriSecenekleri;
  /** Oturum başına bilet. Varsayılan 30 ani, 0,5/sn. Aşımda 429. */
  biletOturumBasina: HizSiniriSecenekleri;
  /** Hesap başına ad denemesi (doğrulama reddi dahil). Varsayılan 10 ani, dakikada 1. Aşımda 429. (Günlük değişiklik sınırı ayrıdır.) */
  adHesapBasina: HizSiniriSecenekleri;
  /** Oturum başına ad önerisi (`GET /giris/ad-oner`). Varsayılan 10 ani, dakikada 10. Aşımda 429. */
  adOneriOturumBasina: HizSiniriSecenekleri;
  /** Hesap başına silme onayı isteği (posta). Varsayılan 3/saat. Aşımda 429. */
  hesapSilIstekHesapBasina: HizSiniriSecenekleri;
}

const saatlik = (n: number, kapasite = n): HizSiniriSecenekleri => ({ kapasite, saniyeBasina: n / 3600 });

export const VARSAYILAN_GIRIS_SINIRLARI: GirisSinirlari = {
  epostaBasina: saatlik(3),
  ipBasina: saatlik(20),
  genel: saatlik(1000),
  onayIpBasina: saatlik(60, 20),
  biletOturumBasina: { kapasite: 30, saniyeBasina: 0.5 },
  adHesapBasina: { kapasite: 10, saniyeBasina: 1 / 60 },
  adOneriOturumBasina: { kapasite: 10, saniyeBasina: 10 / 60 },
  hesapSilIstekHesapBasina: saatlik(3),
};

export interface GirisHizmetiSecenekleri {
  depo: HesapDeposu;
  posta: PostaGonderici;
  /** İmza sırları: ilki yeni (imzalar), ikincisi (varsa) eski (yalnız doğrular). */
  sirlar: readonly string[];
  /** Postadaki bağlantının tabanı; `?j=<jeton>` eklenir (varsayılan: sunucunun `/giris/onay` sayfası). */
  baglantiTabani: string | (() => string);
  /**
   * Hesap silme onay bağlantısının tabanı (sunucunun KENDİ onay sayfası: `<genel>/giris/hesap-sil-onay`; istemci sayfası değil). Verilmezse `baglantiTabani`'nın sonundaki
   * `/giris/onay` bu yolla değiştirilir.
   */
  silmeBaglantiTabani?: string | (() => string);
  /** Geçici e-posta alanları (`geciciAlanlariYukle`); verilmezse engel yoktur. */
  geciciAlanlar?: ReadonlySet<string>;
  /**
   * Davetli listesi (kayıt kapısı; `giris/davet.ts`). Verilirse YALNIZ listedeki adreslere bağlantı gider ve onay geçer. Listede olmayan adrese yanıt
   * AYNIDIR (202, aynı gövde), yalnız posta gitmez: kimin davetli olduğu dışarıdan anlaşılmaz. Verilmezse (varsayılan) kapı açıktır.
   */
  davetliler?: Davetliler;
  /**
   * Görünen ad kuralı (çekirdek `adKanonik`: sözdizimi + küçük harf). VERİLİRSE görünen ad özelliği açılır: hesap açılırken otomatik ad üretilir, `POST /giris/ad`
   * çalışır. Verilmezse özellik KAPALIDIR (ad yok); üretim CLI'si her zaman verir.
   */
  adKurali?: AdKurali;
  /** Yasaklı ad süzgeci (`ad-suzgec.ts`; verilmezse süzgeç yok). Otomatik adlar da süzgeçten geçer. */
  adSuzgeci?: AdSuzgeci;
  /** Otomatik ad üreticisi (varsayılan: `veri/gorunen-ad-kelimeleri.json`, `adKurali` ile doğrulanır). */
  adUretici?: AdUretici;
  /** Bağlantı, isteği yapan tarayıcıya bağlansın mı (KIMLIK.md §1). Varsayılan false: postayı telefonda başka bir tarayıcıda açan oyuncu kilitlenmesin. */
  tarayiciBagli?: boolean;
  sureler?: Partial<GirisSureleri>;
  sinirlar?: Partial<GirisSinirlari>;
  /** Duvar saati (epoch ms); testler enjekte eder. */
  simdi?: () => number;
  gunluk?: GirisGunlugu;
  /** Posta gönderimi zaman aşımı (ms). Varsayılan 15 000. */
  postaZamanAsimiMs?: number;
}

export type IstekSonucu =
  | { tamam: true; gecerlilikSn: number; tarayiciCerezi: string | null }
  | { tamam: false; kod: "gecersiz_eposta" | "gecici_eposta" | "hiz_siniri"; beklemeSn?: number };

export type OnaySonucu =
  | { tamam: true; yeniHesap: boolean; oyuncu: string; ad?: string; adSecildi?: boolean; belirtec: string; cerezOmruSn: number }
  | { tamam: false; kod: "baglanti_gecersiz" | "tarayici_uyumsuz" | "hiz_siniri" | "gecici_eposta"; beklemeSn?: number };

export type OturumSonucu = { hesap: HesapKaydi; oturum: OturumKaydi; /** Bu çağrıda kayan süre uzadı (çerez yeniden verilmeli). */ uzatildi: boolean; cerezOmruSn: number };

export type BiletSonucu =
  | { tamam: true; bilet: string; bitis: number; oyuncu: string; oturum: OturumSonucu }
  | { tamam: false; kod: "oturum_yok" | "hiz_siniri"; beklemeSn?: number };

export type AdSonucu =
  | { tamam: true; ad: string; degisti: boolean }
  | { tamam: false; kod: "oturum_yok" | "ad_gecersiz" | "ad_yasakli" | "ad_sinir" | "hiz_siniri"; mesaj?: string; beklemeSn?: number };

export type HesapSilIstekSonucu = { tamam: true; gecerlilikSn: number } | { tamam: false; kod: "oturum_yok" | "hiz_siniri"; beklemeSn?: number };
export type HesapSilOnaySonucu = { tamam: true } | { tamam: false; kod: "baglanti_gecersiz" | "hiz_siniri"; beklemeSn?: number };

export type AdOneriSonucu = { tamam: true; ad: string } | { tamam: false; kod: "oturum_yok" | "hiz_siniri"; beklemeSn?: number };

export interface IptalOlayi {
  oturumlar: string[];
}

const OYUNCU_ALFABESI = "0123456789abcdefghjkmnpqrstvwxyz";

/** Opak, sunucu üretimli oyuncu kimliği (`o_` + 8 karakter); e-postadan ve hesap kimliğinden türetilmez. */
export function oyuncuKimligiUret(): string {
  const b = randomBytes(8);
  let s = "";
  for (const bayt of b) s += OYUNCU_ALFABESI[bayt % 32];
  return `o_${s}`;
}

function zamanAsimli<T>(is: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((coz, reddet) => {
    const z = setTimeout(() => reddet(new Error("zaman asimi")), ms);
    is.then(
      (v) => (clearTimeout(z), coz(v)),
      (e: unknown) => (clearTimeout(z), reddet(e)),
    );
  });
}

export class GirisHizmeti {
  readonly kimlik: AuthKimligi;
  readonly sayaclar: GirisSayaclari;
  readonly sureler: GirisSureleri;
  private readonly depo: HesapDeposu;
  private readonly posta: PostaGonderici;
  private readonly imz: Imzalayici;
  private readonly baglantiTabani: () => string;
  private readonly silmeBaglantiTabani: () => string;
  private readonly geciciAlanlar: ReadonlySet<string>;
  private readonly davetliler: Davetliler | null;
  private readonly tarayiciBagli: boolean;
  private readonly simdi: () => number;
  private readonly gunluk: GirisGunlugu;
  private readonly postaZamanAsimiMs: number;
  private readonly epostaSiniri: HizSiniri;
  private readonly ipSiniri: HizSiniri;
  private readonly genelSiniri: HizSiniri;
  private readonly onaySiniri: HizSiniri;
  private readonly biletSiniri: HizSiniri;
  private readonly adSiniri: HizSiniri;
  private readonly adOneriSiniri: HizSiniri;
  private readonly hesapSilSiniri: HizSiniri;
  private readonly adKurali: AdKurali | null;
  private readonly adSuzgeci: AdSuzgeci | null;
  private readonly adUretici: AdUretici | null;
  /** oyuncu kimliği -> görünen ad (bellek önbelleği; kare yolu eşzamanlı okur). `adlariYukle` açılışta doldurur, değişiklikler anında yazılır. */
  private readonly adlar = new Map<string, string>();
  private readonly adSirasi = new Map<string, Promise<unknown>>();
  private readonly isler = new Set<Promise<void>>();
  private readonly sira = new Map<string, Promise<void>>();
  private readonly dinleyiciler: Array<(o: IptalOlayi) => void> = [];

  constructor(s: GirisHizmetiSecenekleri) {
    this.depo = s.depo;
    this.posta = s.posta;
    this.imz = new Imzalayici(s.sirlar);
    const taban = s.baglantiTabani;
    this.baglantiTabani = typeof taban === "string" ? () => taban : taban;
    const silme = s.silmeBaglantiTabani;
    this.silmeBaglantiTabani = silme !== undefined ? (typeof silme === "string" ? () => silme : silme) : () => this.baglantiTabani().replace(/\/giris\/onay(?:\?.*)?$/, "/giris/hesap-sil-onay");
    this.geciciAlanlar = s.geciciAlanlar ?? new Set();
    this.davetliler = s.davetliler ?? null;
    this.tarayiciBagli = s.tarayiciBagli ?? false;
    this.simdi = s.simdi ?? (() => Date.now());
    this.gunluk = s.gunluk ?? (() => undefined);
    this.postaZamanAsimiMs = s.postaZamanAsimiMs ?? 15_000;
    this.sureler = { ...VARSAYILAN_GIRIS_SURELERI, ...s.sureler };
    const sinirlar = { ...VARSAYILAN_GIRIS_SINIRLARI, ...s.sinirlar };
    this.epostaSiniri = new HizSiniri(sinirlar.epostaBasina, this.simdi);
    this.ipSiniri = new HizSiniri(sinirlar.ipBasina, this.simdi);
    this.genelSiniri = new HizSiniri(sinirlar.genel, this.simdi);
    this.onaySiniri = new HizSiniri(sinirlar.onayIpBasina, this.simdi);
    this.biletSiniri = new HizSiniri(sinirlar.biletOturumBasina, this.simdi);
    this.adSiniri = new HizSiniri(sinirlar.adHesapBasina, this.simdi);
    this.adOneriSiniri = new HizSiniri(sinirlar.adOneriOturumBasina, this.simdi);
    this.hesapSilSiniri = new HizSiniri(sinirlar.hesapSilIstekHesapBasina, this.simdi);
    this.adKurali = s.adKurali ?? null;
    this.adSuzgeci = s.adSuzgeci ?? null;
    this.adUretici = this.adKurali === null ? null : (s.adUretici ?? new AdUretici(adKelimeleriniYukle(undefined, this.adKurali)));
    this.sayaclar = new GirisSayaclari();
    this.kimlik = new AuthKimligi({ imzalayici: this.imz, simdi: this.simdi, biletOmruMs: this.sureler.biletOmruMs, sayaclar: this.sayaclar });
  }

  /** Oturum iptalinde (çıkış, tümünü kapat, hesap silme) çağrılır: sunucu bu oturumların açık ws bağlantılarını kapatır. */
  iptalDinle(f: (o: IptalOlayi) => void): void {
    this.dinleyiciler.push(f);
  }

  /** Arka plandaki bağlantı/posta işlerinin bitmesini bekler (testler ve düzgün kapanış). */
  async bosta(): Promise<void> {
    while (this.isler.size > 0) await Promise.all([...this.isler]);
  }

  // --- 1. istek -------------------------------------------------------------------------------------------------------------------

  /**
   * Bağlantı isteği. EŞZAMANLI ve depoya/postaya gitmez: yalnız biçim, geçici alan (alana bağlı, hesaba değil) ve IP/genel sınır
   * yanıtı değiştirir. E-posta başına sınır aşılsa da yanıt aynıdır (posta gitmez). Gerisi arka planda yapılır. `mevcutTarayici`: istekle
   * gelen `bolge_giris` çerezi (varsa yeniden kullanılır).
   */
  istekAl(eposta: string, ip: string, mevcutTarayici?: string): IstekSonucu {
    const e = epostaCoz(eposta);
    if (!e) {
      this.sayaclar.artir("istek.gecersiz_eposta");
      return { tamam: false, kod: "gecersiz_eposta" };
    }
    if (geciciAlanMi(e.alan, this.geciciAlanlar)) {
      this.sayaclar.artir("istek.gecici_eposta");
      return { tamam: false, kod: "gecici_eposta" };
    }
    if (!this.ipSiniri.al(ip) || !this.genelSiniri.al("*")) {
      this.sayaclar.artir("istek.hiz_siniri");
      return { tamam: false, kod: "hiz_siniri", beklemeSn: 60 };
    }
    // Aynı tarayıcı yeniden isterse çerez DEĞİŞMEZ (sınırlanan istek, bekleyen geçerli bağlantının tarayıcı bağını bozmasın).
    const tarayici = this.tarayiciBagli ? (mevcutTarayici !== undefined && /^[A-Za-z0-9_-]{43}$/.test(mevcutTarayici) ? mevcutTarayici : rastgele(32)) : null;
    if (this.davetliler !== null && !this.davetliler.uyeMi(e.anahtar)) {
      // Davetli değil: yanıt davetliyle BİREBİR aynı (çerez dahil), yalnız arka plan işi (bağlantı kaydı, posta) başlamaz; adres başına sınır kovası da açılmaz.
      this.sayaclar.artir("istek.davet_disi");
    } else if (!this.epostaSiniri.al(e.anahtar)) this.sayaclar.artir("istek.eposta_siniri");
    else {
      this.sayaclar.artir("istek.kabul");
      this.isiBaslat(e, tarayici);
    }
    return { tamam: true, gecerlilikSn: Math.round(this.sureler.baglantiOmruMs / 1000), tarayiciCerezi: tarayici };
  }

  private isiBaslat(e: EpostaBicimi, tarayici: string | null): void {
    // Aynı adresin işleri sıralıdır (yeni bağlantı eskileri düşürür; sıra yarışmasın).
    const onceki = this.sira.get(e.anahtar) ?? Promise.resolve();
    const is: Promise<void> = onceki.then(() => this.postaIsi(e, tarayici));
    this.sira.set(e.anahtar, is);
    this.isler.add(is);
    void is.then(() => {
      this.isler.delete(is);
      if (this.sira.get(e.anahtar) === is) this.sira.delete(e.anahtar);
    });
  }

  /** Bağlantıyı üretir, özetini kaydeder (aynı adresin eskileri düşer) ve postalar. Hatalar yutulur: yanıt çoktan verildi. */
  private async postaIsi(e: EpostaBicimi, tarayici: string | null): Promise<void> {
    try {
      const an = this.simdi();
      const bitis = an + this.sureler.baglantiOmruMs;
      const { jeton, ozet: jetonOzeti } = baglantiJetonuUret(this.imz, bitis);
      await this.depo.baglantiEkle({ ozet: jetonOzeti, eposta: e.eposta, anahtar: e.anahtar, bitis, tarayiciOzeti: tarayici === null ? null : ozet(tarayici), olusturma: an });
      const taban = this.baglantiTabani();
      const baglanti = `${taban}${taban.includes("?") ? "&" : "?"}j=${encodeURIComponent(jeton)}`;
      await zamanAsimli(this.posta.gonder(girisPostasi(e.eposta, baglanti, Math.round(this.sureler.baglantiOmruMs / 60_000), tarayici !== null)), this.postaZamanAsimiMs);
      this.sayaclar.artir("posta.gonderildi");
      this.gunluk("giris_posta_gonderildi", { kime: epostaMaskele(e.eposta) });
    } catch (hata) {
      this.sayaclar.artir("posta.hata");
      // Hata iletisi yazılmaz (adres ya da bağlantı içerebilir): yalnız tür ve maskelenmiş adres.
      this.gunluk("giris_posta_hatasi", { kime: epostaMaskele(e.eposta), tur: hata instanceof Error ? hata.name : "Hata" });
    }
  }

  // --- 2. onay --------------------------------------------------------------------------------------------------------------------

  /** Jetonun biçim, imza ve süre geçerliliğini (depoya gitmeden) denetler; onay sayfasının yan etkisiz GET'i bunu kullanır. */
  baglantiGecerliMi(jeton: string): boolean {
    return baglantiJetonuCoz(this.imz, jeton, this.simdi()) !== null;
  }

  /** Bağlantıyı tüketir (tek kullanım), hesabı bulur ya da açar (hesap başına bir oyuncu) ve oturum açar. */
  async onayla(jeton: string, tarayiciCerezi: string | null, ip: string): Promise<OnaySonucu> {
    if (!this.onaySiniri.al(ip)) {
      this.sayaclar.artir("onay.hiz_siniri");
      return { tamam: false, kod: "hiz_siniri", beklemeSn: 60 };
    }
    const an = this.simdi();
    const j = baglantiJetonuCoz(this.imz, jeton, an);
    if (!j) {
      this.sayaclar.artir("onay.baglanti_gecersiz");
      return { tamam: false, kod: "baglanti_gecersiz" };
    }
    const t = await this.depo.baglantiTuket(j.ozet, an, tarayiciCerezi === null || tarayiciCerezi === "" ? null : ozet(tarayiciCerezi));
    if (t.durum === "tarayici") {
      this.sayaclar.artir("onay.tarayici_uyumsuz");
      return { tamam: false, kod: "tarayici_uyumsuz" };
    }
    if (t.durum === "yok") {
      this.sayaclar.artir("onay.baglanti_gecersiz");
      return { tamam: false, kod: "baglanti_gecersiz" };
    }
    // Bağlantı verildikten sonra listeden çıkarılan adres giremez (bağlantı yine de tüketildi).
    if (this.davetliler !== null && !this.davetliler.uyeMi(t.kayit.anahtar)) {
      this.sayaclar.artir("onay.davet_disi");
      return { tamam: false, kod: "baglanti_gecersiz" };
    }
    const bulunan = await this.hesapBulVeyaAc(t.kayit.eposta, t.kayit.anahtar);
    const yeni = bulunan.yeni;
    if (bulunan.hesap === null) {
      this.sayaclar.artir("onay.baglanti_gecersiz");
      return { tamam: false, kod: "gecici_eposta" };
    }
    const hesap = await this.adGaranti(bulunan.hesap);
    const o = oturumBelirteciUret();
    await this.depo.oturumEkle({
      id: o.id,
      hesap: hesap.id,
      gizliOzet: o.gizliOzet,
      olusturma: an,
      sonKullanim: an,
      bitis: Math.min(an + this.sureler.oturumKayanMs, an + this.sureler.oturumMutlakMs),
      mutlakBitis: an + this.sureler.oturumMutlakMs,
    });
    this.sayaclar.artir("onay.tamam");
    if (yeni) this.sayaclar.artir("onay.yeni_hesap");
    this.gunluk("giris_onaylandi", { yeniHesap: yeni });
    return {
      tamam: true,
      yeniHesap: yeni,
      oyuncu: hesap.oyuncu,
      ...(hesap.ad !== undefined ? { ad: hesap.ad, adSecildi: hesap.adSecildi === true } : {}),
      belirtec: o.belirtec,
      cerezOmruSn: Math.round(this.sureler.oturumKayanMs / 1000),
    };
  }

  /** Hesabı bulur; yoksa açar (oyuncu kimliği sunucu üretimli, çakışırsa yenilenir). Yeni hesap geçici alandaysa null. */
  private async hesapBulVeyaAc(eposta: string, anahtar: string): Promise<{ hesap: HesapKaydi | null; yeni: boolean }> {
    const mevcut = await this.depo.hesapBulAnahtar(anahtar);
    if (mevcut) return { hesap: mevcut, yeni: false };
    const e = epostaCoz(eposta);
    if (!e || geciciAlanMi(e.alan, this.geciciAlanlar)) return { hesap: null, yeni: false };
    for (let deneme = 0; deneme < 8; deneme++) {
      try {
        // Görünen ad açıksa hesapla birlikte otomatik ad yazılır (opak: sıfat + isim + rakam; e-postadan türetilmez).
        const ad = this.adKurali === null ? undefined : await this.yeniAd();
        const r = await this.depo.hesapOlustur({ id: rastgele(12), eposta: e.eposta, anahtar, oyuncu: oyuncuKimligiUret(), olusturma: this.simdi(), ...(ad !== undefined ? { ad } : {}) });
        if (r.yeni && r.hesap.ad !== undefined) {
          this.adlar.set(r.hesap.oyuncu, r.hesap.ad);
          this.sayaclar.artir("ad.otomatik");
        }
        return { hesap: r.hesap, yeni: r.yeni };
      } catch (hata) {
        if (!(hata instanceof OyuncuCakismasi)) throw hata;
      }
    }
    throw new Error("oyuncu kimligi uretilemedi");
  }

  // --- 3. oturum, bilet, çıkış -----------------------------------------------------------------------------------------------------

  /** Çerezdeki belirteçten oturumu çözer (gizli kısım özetle ve sabit zamanlı karşılaştırılır); süresi geçmişse siler. Kayan süreyi uzatır. */
  async oturumBul(belirtec: string | undefined): Promise<OturumSonucu | null> {
    const p = oturumBelirteciCoz(belirtec);
    if (!p) return null;
    const o = await this.depo.oturumBul(p.id);
    if (!o || !sabitEsit(o.gizliOzet, p.gizliOzet)) return null;
    const an = this.simdi();
    if (an >= o.bitis || an >= o.mutlakBitis) {
      await this.depo.oturumSil(o.id);
      return null;
    }
    const hesap = await this.depo.hesapBulId(o.hesap);
    if (!hesap) {
      await this.depo.oturumSil(o.id);
      return null;
    }
    const hesapAdli = await this.adGaranti(hesap);
    let guncel = o;
    let uzatildi = false;
    if (an - o.sonKullanim >= this.sureler.oturumUzatmaAraligiMs) {
      const bitis = Math.min(an + this.sureler.oturumKayanMs, o.mutlakBitis);
      await this.depo.oturumUzat(o.id, an, bitis);
      guncel = { ...o, sonKullanim: an, bitis };
      uzatildi = true;
    }
    return { hesap: hesapAdli, oturum: guncel, uzatildi, cerezOmruSn: Math.max(1, Math.floor((guncel.bitis - an) / 1000)) };
  }

  /** ws bileti: oturuma bağlı, 60 sn, tek kullanımlık. Yönetici/`sistem` için üretilemez (oyuncu kimliği hesaptan gelir). */
  async biletUret(belirtec: string | undefined): Promise<BiletSonucu> {
    const r = await this.oturumBul(belirtec);
    if (!r) return { tamam: false, kod: "oturum_yok" };
    if (!this.biletSiniri.al(r.oturum.id)) {
      this.sayaclar.artir("bilet.hiz_siniri");
      return { tamam: false, kod: "hiz_siniri", beklemeSn: 2 };
    }
    const bitis = this.simdi() + this.sureler.biletOmruMs;
    const { bilet } = biletUret(this.imz, { hesap: r.hesap.id, oyuncu: r.hesap.oyuncu, oturum: r.oturum.id, bitis });
    this.sayaclar.artir("bilet.verildi");
    return { tamam: true, bilet, bitis, oyuncu: r.hesap.oyuncu, oturum: r };
  }

  /** Oturumu kapatır (yalnız geçerli belirteçle) ve iptal kümesine/dinleyicilere bildirir. */
  async cikis(belirtec: string | undefined): Promise<boolean> {
    const p = oturumBelirteciCoz(belirtec);
    if (!p) return false;
    const o = await this.depo.oturumBul(p.id);
    if (!o || !sabitEsit(o.gizliOzet, p.gizliOzet)) return false;
    await this.depo.oturumSil(o.id);
    this.iptalBildir([o.id]);
    return true;
  }

  /** Hesabın bütün oturumlarını kapatır (çerezle yetkili). */
  async cikisTumu(belirtec: string | undefined): Promise<boolean> {
    const p = oturumBelirteciCoz(belirtec);
    if (!p) return false;
    const o = await this.depo.oturumBul(p.id);
    if (!o || !sabitEsit(o.gizliOzet, p.gizliOzet)) return false;
    this.iptalBildir(await this.depo.hesabinOturumlariniSil(o.hesap));
    return true;
  }

  // --- 3a. hesap silme: e-posta onayıyla (KVKK) -----------------------------------------------------------------------------------

  /**
   * Silme talebi (oturumlu): hesabın e-postasına bir ONAY bağlantısı gönderir; bu çağrıda HİÇBİR ŞEY SİLİNMEZ. Hesap başına saatte 3 istek. Yanıt posta sonucundan
   * bağımsızdır (posta arka planda gider; hata günlüğe/sayaca yazılır, adres yazılmaz).
   */
  async hesapSilIste(belirtec: string | undefined): Promise<HesapSilIstekSonucu> {
    const r = await this.oturumBul(belirtec);
    if (!r) return { tamam: false, kod: "oturum_yok" };
    if (!this.hesapSilSiniri.al(r.hesap.id)) {
      this.sayaclar.artir("hesap_sil.hiz_siniri");
      return { tamam: false, kod: "hiz_siniri", beklemeSn: 600 };
    }
    this.sayaclar.artir("hesap_sil.istek");
    const bitis = this.simdi() + this.sureler.hesapSilBaglantiOmruMs;
    const jeton = silmeJetonuUret(this.imz, r.hesap.id, bitis);
    const taban = this.silmeBaglantiTabani();
    const adres = `${taban}${taban.includes("?") ? "&" : "?"}j=${encodeURIComponent(jeton)}`;
    const is = (async (): Promise<void> => {
      try {
        await zamanAsimli(this.posta.gonder(hesapSilmePostasi(r.hesap.eposta, adres, Math.round(this.sureler.hesapSilBaglantiOmruMs / 60_000))), this.postaZamanAsimiMs);
        this.sayaclar.artir("hesap_sil.posta_gonderildi");
      } catch {
        this.sayaclar.artir("hesap_sil.posta_hata"); // hata iletisi yazılmaz (adres/bağlantı içerebilir)
      }
    })();
    this.isler.add(is);
    void is.then(() => this.isler.delete(is));
    return { tamam: true, gecerlilikSn: Math.round(this.sureler.hesapSilBaglantiOmruMs / 1000) };
  }

  /** Onay sayfasının yan etkisiz denetimi: jeton biçim, imza ve süre bakımından geçerli mi (depoya gitmez). */
  hesapSilBaglantiGecerliMi(jeton: string): boolean {
    return silmeJetonuCoz(this.imz, jeton, this.simdi()) !== null;
  }

  /** Onay (POST): jeton geçerliyse ve hesap hâlâ varsa hesap SİLİNİR (oturumlar, biletler, açık ws bağlantıları, ad dahil). Aksi `baglanti_gecersiz`. */
  async hesapSilOnayla(jeton: string, ip: string): Promise<HesapSilOnaySonucu> {
    if (!this.onaySiniri.al(ip)) {
      this.sayaclar.artir("hesap_sil.onay_hiz_siniri");
      return { tamam: false, kod: "hiz_siniri", beklemeSn: 60 };
    }
    const j = silmeJetonuCoz(this.imz, jeton, this.simdi());
    if (!j || !(await this.depo.hesapBulId(j.hesap))) {
      this.sayaclar.artir("hesap_sil.baglanti_gecersiz");
      return { tamam: false, kod: "baglanti_gecersiz" };
    }
    if (!(await this.hesapSil(j.hesap))) {
      this.sayaclar.artir("hesap_sil.baglanti_gecersiz");
      return { tamam: false, kod: "baglanti_gecersiz" };
    }
    this.sayaclar.artir("hesap_sil.onay");
    this.gunluk("giris_hesap_silindi", {});
    return { tamam: true };
  }

  /** KVKK silme talebi (yönetim işi, HTTP ucu YOK): hesap, e-posta bağı ve oturumlar silinir; oyuncu anonim kalır. */
  async hesapSil(hesapId: string): Promise<boolean> {
    const hesap = await this.depo.hesapBulId(hesapId);
    const silinen = await this.depo.hesapSil(hesapId);
    if (silinen === null) return false;
    if (hesap) this.adlar.delete(hesap.oyuncu); // ad hesapla birlikte gider (kare artık adı taşımaz)
    this.iptalBildir(silinen);
    return true;
  }

  // --- 4. görünen ad (İ-1) ------------------------------------------------------------------------------------------------------

  /** Görünen ad özelliği açık mı (`adKurali` verildi). */
  get adAcik(): boolean {
    return this.adKurali !== null;
  }

  /** Oyuncunun görünen adı (bellek önbelleği; eşzamanlı; kare yolu için). Adı olmayan ya da özellik kapalıysa undefined. */
  adCoz(oyuncu: string): string | undefined {
    return this.adlar.get(oyuncu);
  }

  /** Açılışta bütün hesapların adlarını belleğe yükler; adı olmayan (eski) hesaplara otomatik ad yazar. Yüklenen ad sayısını döndürür. */
  async adlariYukle(): Promise<number> {
    if (this.adKurali === null) return 0;
    for (const x of await this.depo.adlariListele()) {
      let ad = x.ad;
      if (ad === null) {
        ad = await this.yeniAd();
        await this.depo.adYaz(x.hesap, ad, false, null);
        this.sayaclar.artir("ad.otomatik");
      }
      this.adlar.set(x.oyuncu, ad);
    }
    return this.adlar.size;
  }

  /**
   * Otomatik ad: sıfat + isim + 3 basamaklı rakam (küçük harfli, ad kuralından ve yasaklı ad süzgecinden geçer). Başka hesapta aynı ad varsa yeniden denenir
   * (seçilen adlarda çakışma serbesttir; ad bir kimlik değildir). Deterministik olmak zorunda değildir ve çekirdeğe girmez.
   */
  private async yeniAd(): Promise<string> {
    const u = this.adUretici as AdUretici;
    const kural = this.adKurali as AdKurali;
    let son = "";
    for (let deneme = 0; deneme < 20; deneme++) {
      const aday = u.uret();
      son = aday;
      const k = kural(aday);
      if (!k.tamam || k.ad !== aday) continue;
      if (this.adSuzgeci?.yasakliMi(aday) === true) continue;
      if (await this.depo.adVarMi(aday)) continue;
      return aday;
    }
    return son;
  }

  /** Yeni bir opak ad ÖNERİSİ (kaydetmez; oturumlu; oturum başına hız sınırlı). Özellik kapalıysa HTTP katmanı 404 verir. */
  async adOner(belirtec: string | undefined): Promise<AdOneriSonucu> {
    if (this.adKurali === null) return { tamam: false, kod: "oturum_yok" };
    const r = await this.oturumBul(belirtec);
    if (!r) return { tamam: false, kod: "oturum_yok" };
    if (!this.adOneriSiniri.al(r.oturum.id)) {
      this.sayaclar.artir("ad.oner_hiz_siniri");
      return { tamam: false, kod: "hiz_siniri", beklemeSn: 10 };
    }
    this.sayaclar.artir("ad.oner");
    return { tamam: true, ad: await this.yeniAd() };
  }

  /** Eski hesapta ad yoksa otomatik ad yazar (açılışta `adlariYukle` doldurur; bu, açılıştan sonra sızan boşluğa karşı güvencedir). */
  private async adGaranti(hesap: HesapKaydi): Promise<HesapKaydi> {
    if (this.adKurali === null || hesap.ad !== undefined) return hesap;
    const ad = await this.yeniAd();
    await this.depo.adYaz(hesap.id, ad, false, null);
    this.adlar.set(hesap.oyuncu, ad);
    this.sayaclar.artir("ad.otomatik");
    return { ...hesap, ad, adSecildi: false };
  }

  private adSirala<T>(hesap: string, is: () => Promise<T>): Promise<T> {
    const onceki = this.adSirasi.get(hesap) ?? Promise.resolve();
    const yeni = onceki.then(is, is);
    const temiz = yeni.then(() => undefined, () => undefined);
    this.adSirasi.set(hesap, temiz);
    void temiz.then(() => {
      if (this.adSirasi.get(hesap) === temiz) this.adSirasi.delete(hesap);
    });
    return yeni;
  }

  /**
   * Oyuncunun görünen adını seçer/değiştirir (çerezli oturum). Sözdizimi ve küçük harf çevirisi çekirdek `adKanonik`'ten (düzeltme yapılmaz, reddedilir),
   * sonra yasaklı ad süzgeci (kanonik ad üzerinde). Günlük (00:00 TRT) en çok BİR değişiklik: otomatik addan oyuncunun İLK seçtiği ada geçiş sayılmaz; aynı adı
   * yeniden seçmek değişiklik sayılmaz. Hesap başına ad denemesi hız sınırlıdır (doğrulama reddi dahil).
   */
  async adSec(belirtec: string | undefined, ham: unknown): Promise<AdSonucu> {
    const kural = this.adKurali;
    if (kural === null) return { tamam: false, kod: "oturum_yok" };
    const r = await this.oturumBul(belirtec);
    if (!r) return { tamam: false, kod: "oturum_yok" };
    if (!this.adSiniri.al(r.hesap.id)) {
      this.sayaclar.artir("ad.hiz_siniri");
      return { tamam: false, kod: "hiz_siniri", beklemeSn: 60 };
    }
    return this.adSirala(r.hesap.id, async (): Promise<AdSonucu> => {
      const hesap = await this.depo.hesapBulId(r.hesap.id);
      if (!hesap) return { tamam: false, kod: "oturum_yok" };
      const k = kural(ham);
      if (!k.tamam) {
        this.sayaclar.artir("ad.gecersiz");
        // Çekirdek iletisi marka adı diliyle yazılmıştır ("marka adi ..."); görünen ad ucunda "ad ..." olarak döner.
        return { tamam: false, kod: "ad_gecersiz", mesaj: adIletisi(k.hata) };
      }
      const ad = k.ad;
      if (this.adSuzgeci?.yasakliMi(ad) === true) {
        this.sayaclar.artir("ad.yasakli");
        return { tamam: false, kod: "ad_yasakli", mesaj: "ad kullanilamaz" };
      }
      const an = this.simdi();
      const ilkSecim = hesap.adSecildi !== true;
      if (!ilkSecim && hesap.ad === ad) return { tamam: true, ad, degisti: false };
      if (!ilkSecim && hesap.adDegisimT !== undefined && turkiyeGeceYarisi(hesap.adDegisimT) === turkiyeGeceYarisi(an)) {
        this.sayaclar.artir("ad.sinir");
        return { tamam: false, kod: "ad_sinir", mesaj: "ad gunde en cok bir kez degistirilebilir; yarin (00:00 TRT) tekrar deneyin", beklemeSn: Math.ceil((turkiyeGeceYarisi(an) + GUN_MS - an) / 1000) };
      }
      // İlk seçim günlük hakkı tüketmez (değişim zamanı korunur); sonraki değişiklikler zamanı yazar.
      await this.depo.adYaz(hesap.id, ad, true, ilkSecim ? (hesap.adDegisimT ?? null) : an);
      this.adlar.set(hesap.oyuncu, ad);
      this.sayaclar.artir(ilkSecim ? "ad.ilk_secim" : "ad.degisti");
      return { tamam: true, ad, degisti: true };
    });
  }

  private iptalBildir(oturumlar: string[]): void {
    if (oturumlar.length === 0) return;
    this.kimlik.oturumlariIptalEt(oturumlar);
    this.sayaclar.artir("oturum.kapatildi", oturumlar.length);
    for (const d of this.dinleyiciler) d({ oturumlar });
  }

  /** Süresi geçmiş bağlantı/oturum kayıtlarını siler ve sınır kovalarını temizler (periyodik). */
  async bakim(): Promise<void> {
    await this.depo.sureGecmisleriSil(this.simdi());
    this.epostaSiniri.temizle();
    this.ipSiniri.temizle();
    this.onaySiniri.temizle();
    this.biletSiniri.temizle();
    this.adSiniri.temizle();
    this.adOneriSiniri.temizle();
    this.hesapSilSiniri.temizle();
  }
}

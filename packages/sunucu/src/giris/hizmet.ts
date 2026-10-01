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
import type { HizSiniriSecenekleri } from "../hiz-siniri";
import { OyuncuCakismasi } from "../depo/tipler";
import type { HesapDeposu, HesapKaydi, OturumKaydi } from "../depo/tipler";
import { AuthKimligi } from "./auth-kimligi";
import { epostaCoz, epostaMaskele, geciciAlanMi } from "./eposta";
import type { EpostaBicimi } from "./eposta";
import { Imzalayici, baglantiJetonuCoz, baglantiJetonuUret, biletUret, oturumBelirteciCoz, oturumBelirteciUret, ozet, rastgele, sabitEsit } from "./jeton";
import { girisPostasi } from "./posta";
import type { PostaGonderici } from "./posta";
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
}

export const VARSAYILAN_GIRIS_SURELERI: GirisSureleri = {
  baglantiOmruMs: 10 * 60_000,
  oturumKayanMs: 30 * GUN_MS,
  oturumMutlakMs: 90 * GUN_MS,
  oturumUzatmaAraligiMs: GUN_MS,
  biletOmruMs: 60_000,
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
}

const saatlik = (n: number, kapasite = n): HizSiniriSecenekleri => ({ kapasite, saniyeBasina: n / 3600 });

export const VARSAYILAN_GIRIS_SINIRLARI: GirisSinirlari = {
  epostaBasina: saatlik(3),
  ipBasina: saatlik(20),
  genel: saatlik(1000),
  onayIpBasina: saatlik(60, 20),
  biletOturumBasina: { kapasite: 30, saniyeBasina: 0.5 },
};

export interface GirisHizmetiSecenekleri {
  depo: HesapDeposu;
  posta: PostaGonderici;
  /** İmza sırları: ilki yeni (imzalar), ikincisi (varsa) eski (yalnız doğrular). */
  sirlar: readonly string[];
  /** Postadaki bağlantının tabanı; `?j=<jeton>` eklenir (varsayılan: sunucunun `/giris/onay` sayfası). */
  baglantiTabani: string | (() => string);
  /** Geçici e-posta alanları (`geciciAlanlariYukle`); verilmezse engel yoktur. */
  geciciAlanlar?: ReadonlySet<string>;
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
  | { tamam: true; yeniHesap: boolean; oyuncu: string; belirtec: string; cerezOmruSn: number }
  | { tamam: false; kod: "baglanti_gecersiz" | "tarayici_uyumsuz" | "hiz_siniri" | "gecici_eposta"; beklemeSn?: number };

export type OturumSonucu = { hesap: HesapKaydi; oturum: OturumKaydi; /** Bu çağrıda kayan süre uzadı (çerez yeniden verilmeli). */ uzatildi: boolean; cerezOmruSn: number };

export type BiletSonucu =
  | { tamam: true; bilet: string; bitis: number; oyuncu: string; oturum: OturumSonucu }
  | { tamam: false; kod: "oturum_yok" | "hiz_siniri"; beklemeSn?: number };

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
  private readonly geciciAlanlar: ReadonlySet<string>;
  private readonly tarayiciBagli: boolean;
  private readonly simdi: () => number;
  private readonly gunluk: GirisGunlugu;
  private readonly postaZamanAsimiMs: number;
  private readonly epostaSiniri: HizSiniri;
  private readonly ipSiniri: HizSiniri;
  private readonly genelSiniri: HizSiniri;
  private readonly onaySiniri: HizSiniri;
  private readonly biletSiniri: HizSiniri;
  private readonly isler = new Set<Promise<void>>();
  private readonly sira = new Map<string, Promise<void>>();
  private readonly dinleyiciler: Array<(o: IptalOlayi) => void> = [];

  constructor(s: GirisHizmetiSecenekleri) {
    this.depo = s.depo;
    this.posta = s.posta;
    this.imz = new Imzalayici(s.sirlar);
    const taban = s.baglantiTabani;
    this.baglantiTabani = typeof taban === "string" ? () => taban : taban;
    this.geciciAlanlar = s.geciciAlanlar ?? new Set();
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
    if (!this.epostaSiniri.al(e.anahtar)) this.sayaclar.artir("istek.eposta_siniri");
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
    const { hesap, yeni } = await this.hesapBulVeyaAc(t.kayit.eposta, t.kayit.anahtar);
    if (hesap === null) {
      this.sayaclar.artir("onay.baglanti_gecersiz");
      return { tamam: false, kod: "gecici_eposta" };
    }
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
    return { tamam: true, yeniHesap: yeni, oyuncu: hesap.oyuncu, belirtec: o.belirtec, cerezOmruSn: Math.round(this.sureler.oturumKayanMs / 1000) };
  }

  /** Hesabı bulur; yoksa açar (oyuncu kimliği sunucu üretimli, çakışırsa yenilenir). Yeni hesap geçici alandaysa null. */
  private async hesapBulVeyaAc(eposta: string, anahtar: string): Promise<{ hesap: HesapKaydi | null; yeni: boolean }> {
    const mevcut = await this.depo.hesapBulAnahtar(anahtar);
    if (mevcut) return { hesap: mevcut, yeni: false };
    const e = epostaCoz(eposta);
    if (!e || geciciAlanMi(e.alan, this.geciciAlanlar)) return { hesap: null, yeni: false };
    for (let deneme = 0; deneme < 8; deneme++) {
      try {
        const r = await this.depo.hesapOlustur({ id: rastgele(12), eposta: e.eposta, anahtar, oyuncu: oyuncuKimligiUret(), olusturma: this.simdi() });
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
    let guncel = o;
    let uzatildi = false;
    if (an - o.sonKullanim >= this.sureler.oturumUzatmaAraligiMs) {
      const bitis = Math.min(an + this.sureler.oturumKayanMs, o.mutlakBitis);
      await this.depo.oturumUzat(o.id, an, bitis);
      guncel = { ...o, sonKullanim: an, bitis };
      uzatildi = true;
    }
    return { hesap, oturum: guncel, uzatildi, cerezOmruSn: Math.max(1, Math.floor((guncel.bitis - an) / 1000)) };
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

  /** KVKK silme talebi (yönetim işi, HTTP ucu YOK): hesap, e-posta bağı ve oturumlar silinir; oyuncu anonim kalır. */
  async hesapSil(hesapId: string): Promise<boolean> {
    const silinen = await this.depo.hesapSil(hesapId);
    if (silinen === null) return false;
    this.iptalBildir(silinen);
    return true;
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
  }
}

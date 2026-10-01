/**
 * Giriş akışı (G9-a; DOM yok): ekran durumu makinesi. Ekranlar G9-b'dedir (T1 sözleşmesi `data-ekran`: g1…g4, g7); burada YALNIZ
 * hangi ekranın ne zaman göründüğü, gönderim/bekleme/sayaç kuralları ve hata sunumu vardır.
 *
 *   yukleniyor --(?j=<jeton>)--> g3 --giris yap--> [yeni hesap] g4 --tamam--> oyun
 *       |                         |                [dönen]      ------------> oyun
 *       |--(oturum çerezi var)----+---------------------------------------> oyun
 *       `--(yok)--> g1 --bağlantı gönder--> g2 --(postadaki bağlantı, başka sekme/tarayıcı)--> g3
 *   oyun/yeniden bağlanma sırasında oturum biterse: g7 --giriş yap--> g1
 *
 * Kurallar (A1 G-1…G-8 + baş lider kararları):
 * - "Bağlantı gönderdik" KOŞULSUZDUR: 202 gelince g2 (hesap, davet, e-posta başına sınır ve posta sonucu bilinmez/ima edilmez).
 * - Yeniden gönder 60 sn bekler (geri sayım). Aynı adrese son bir saatte 3 gönderimden sonra `tekrarSiniri` açılır
 *   (`giris.G2.tekrar_siniri` + `giris.G2.destek` birlikte): sunucu e-posta başına sınırı aşınca yanıtı DEĞİŞTİRMEZ, ekran sınırı
 *   göremez; bu yüzden sayaç istemcidedir, adres başına, YALNIZ bellektedir (kaydedilmez; sayfa yenilenince sıfırlanır).
 * - `hiz_siniri` (IP/genel) g1/g2/g3'te düğmeyi kapatır, canlı geri sayım `hataBitis` ile (yukarı yuvarlı dakika: `hata.ts`).
 * - g3'te `gecici_eposta` G-1'e döndürür (alan listesi istekten sonra güncellenmiş olabilir).
 * - Token `localStorage`'a yazılmaz; jeton yalnız bellekte tutulur ve onaydan sonra silinir.
 * - Zaman `simdi()` ile okunur (sınamada sahte); zamanlayıcı yoktur: arayüz geri sayımı `kalanSn()` ile çizer.
 */
import { epostaAnahtari, epostaKontrol } from "./eposta";
import { hataAnahtari, hataEylemi, hizSiniriDakika } from "./hata";
import type { GirisEkraniAdi, HataEylemi } from "./hata";
import type { GirisApi, GirisHatasiBilgisi, IstemciHataKodu } from "./api";
import type { BiletSaglayici } from "./oturum";

/** Yeniden gönder bekleme süresi (baş lider kararı: 60 sn). */
export const YENIDEN_GONDER_MS = 60_000;
/** Bu kadar (ve fazla) gönderimden sonra `tekrarSiniri` açılır. */
export const TEKRAR_SINIRI_ESIGI = 3;
/** Sayacın penceresi: sunucunun e-posta başına sınırı saatliktir. */
export const SAYAC_PENCERESI_MS = 3_600_000;

export type GirisEkrani = "yukleniyor" | "g1" | "g2" | "g3" | "g4" | "g7" | "oyun";

export interface HataDurumu {
  kod: IstemciHataKodu;
  /** Metin anahtarı (`giris.G6.<kod>`); metin G9-b'nin tablosunda. */
  anahtar: string;
  eylem: HataEylemi;
  /** `hiz_siniri`: kalan dakika (yukarı yuvarlı; metindeki {n}). */
  dakika?: number;
  /** `hiz_siniri`: sınırın biteceği an (ms, `simdi()` cinsinden); geri sayım ve düğme açılışı. */
  bitis?: number;
}

export interface GirisDurumu {
  ekran: GirisEkrani;
  /** Son gönderilen (g2) ya da g1'de doldurulacak adres; yalnız bellek. */
  eposta: string;
  /** Bir istek uçuşta: düğme kapalı, çift tıklama yok. */
  gonderiyor: boolean;
  hata: HataDurumu | null;
  /** g2: yeniden gönderin açılacağı an (ms, `simdi()` cinsinden). */
  yenidenGonderBitis: number;
  /** g2: son saatte bu adrese gönderim sayısı (ilk gönderim dahil). */
  gonderimSayisi: number;
  /** g2: `giris.G2.tekrar_siniri` + `giris.G2.destek` birlikte gösterilir. */
  tekrarSiniri: boolean;
  /** g2: son gönderim "yeniden gönder" idi (`giris.G2.tekrar_gonderildi`). */
  tekrarGonderildi: boolean;
  /** g2: bağlantı geçerlilik süresi (sn; sunucu `gecerlilikSn`, yok sayılırsa 600). */
  gecerlilikSn: number;
  /** g3: onaylanacak jeton var (jetonun kendisi durumda görünmez). */
  jetonVar: boolean;
  /** g3: onay başarılı ("giriş yaptın", kısa; oyuna otomatik geçilir). */
  basari: boolean;
  /** Oturumun oyuncusu (opak kimlik); oturum kurulunca. */
  oyuncu: string | null;
  /** Bu girişle yeni hesap açıldı (g4 gösterilir). */
  yeniHesap: boolean;
  /** Çıkıştan sonra g1: `giris.G8.sonuc` gösterilir. */
  cikisYapildi: boolean;
}

function ilkDurum(): GirisDurumu {
  return {
    ekran: "yukleniyor",
    eposta: "",
    gonderiyor: false,
    hata: null,
    yenidenGonderBitis: 0,
    gonderimSayisi: 0,
    tekrarSiniri: false,
    tekrarGonderildi: false,
    gecerlilikSn: 600,
    jetonVar: false,
    basari: false,
    oyuncu: null,
    yeniHesap: false,
    cikisYapildi: false,
  };
}

export interface GirisAkisiSecenekleri {
  api: Pick<GirisApi, "istek" | "onayla" | "ben" | "cikis" | "cikisTumu">;
  saglayici: Pick<BiletSaglayici, "onceden" | "temizle" | "oturumYokDinle">;
  /** Yerel saat (ms); sınamada sahte. */
  simdi?: () => number;
}

export class GirisAkisi {
  private d: GirisDurumu = ilkDurum();
  private readonly dinleyiciler = new Set<(d: GirisDurumu) => void>();
  private readonly api: GirisAkisiSecenekleri["api"];
  private readonly saglayici: GirisAkisiSecenekleri["saglayici"];
  private readonly simdi: () => number;
  /** Adres → son saatteki gönderim zamanları (ms). Yalnız bellek. */
  private readonly sayac = new Map<string, number[]>();
  private jeton: string | null = null;

  constructor(s: GirisAkisiSecenekleri) {
    this.api = s.api;
    this.saglayici = s.saglayici;
    this.simdi = s.simdi ?? (() => Date.now());
    // Oyunda/yeniden bağlanırken oturum biterse (bilet 401) G-7
    this.saglayici.oturumYokDinle(() => this.oturumBitti());
  }

  get durum(): Readonly<GirisDurumu> {
    return this.d;
  }

  dinle(f: (d: GirisDurumu) => void): () => void {
    this.dinleyiciler.add(f);
    return () => this.dinleyiciler.delete(f);
  }

  /** Geri sayım: `bitis`e kalan tam saniye (yukarı yuvarlı, en az 0). */
  kalanSn(bitis: number): number {
    return Math.max(0, Math.ceil((bitis - this.simdi()) / 1000));
  }

  /** g2: yeniden gönder şimdi kullanılabilir mi. */
  yenidenGonderilebilir(): boolean {
    return this.d.ekran === "g2" && !this.d.gonderiyor && this.simdi() >= this.d.yenidenGonderBitis && !this.hizSiniriSuruyor();
  }

  /** Bir ekranın birincil eylemi şimdi kapalı mı (uçuşta ya da `hiz_siniri` geri sayımında). */
  eylemKapali(): boolean {
    return this.d.gonderiyor || this.hizSiniriSuruyor();
  }

  // --- açılış -----------------------------------------------------------------------------------------

  /**
   * Açılış kararı. `jeton`: adresteki `?j=` (varsa çağıran adresi `jetonsuzAdres` ile HEMEN temizler): g3 onay ekranı.
   * Yoksa çerezle oturum sınanır (`GET /giris/ben`, sonra bilet önden alınır): geçerliyse `oyun`, değilse g1.
   */
  async basla(jeton: string | null = null): Promise<void> {
    if (jeton) {
      this.jeton = jeton;
      this.ayarla({ ekran: "g3", jetonVar: true, hata: null });
      return;
    }
    this.ayarla({ ekran: "yukleniyor", hata: null });
    const b = await this.api.ben();
    if (!b.tamam) {
      // oturum yok ya da sunucuya ulaşılamadı: giriş ekranı (ağ hatası alan altında)
      this.ayarla({ ekran: "g1", ...(b.kod === "oturum_yok" ? { hata: null } : { hata: this.hataYap(b, "g1") }) });
      return;
    }
    await this.oturumaGec(b.veri.oyuncu, false);
  }

  // --- g1, g2 -----------------------------------------------------------------------------------------

  /** g1 "bağlantı gönder": biçimi denetler, `POST /giris/istek`; başarıda g2. */
  async epostaGonder(girdi: string): Promise<void> {
    if (this.d.gonderiyor || this.hizSiniriSuruyor()) return;
    const k = epostaKontrol(girdi);
    if (!k.tamam) {
      this.ayarla({ ekran: "g1", eposta: girdi.trim(), hata: this.hataYap({ kod: k.kod }, "g1"), cikisYapildi: false });
      return;
    }
    await this.gonder(k.eposta, false);
  }

  /** g2 "yeniden gönder" (60 sn beklemeden sonra); aynı adrese yeni bağlantı, eskisi düşer. */
  async yenidenGonder(): Promise<void> {
    if (!this.yenidenGonderilebilir()) return;
    await this.gonder(this.d.eposta, true);
  }

  /** g2 "adresi değiştir": g1'e dön (adres bellekte dolu kalır; sayaç adres başınadır). */
  adresiDegistir(): void {
    this.ayarla({ ekran: "g1", hata: null, tekrarGonderildi: false });
  }

  private async gonder(eposta: string, yeniden: boolean): Promise<void> {
    const ekran: GirisEkraniAdi = this.d.ekran === "g2" ? "g2" : "g1";
    this.ayarla({ gonderiyor: true, hata: null, eposta, cikisYapildi: false });
    const r = await this.api.istek(eposta);
    if (!r.tamam) {
      this.ayarla({ ekran, gonderiyor: false, hata: this.hataYap(r, ekran) });
      return;
    }
    // Yalnız başarılı (202) gönderim sayılır; sayaç adres başına, son saat
    const simdi = this.simdi();
    const anahtar = epostaAnahtari(eposta);
    const zamanlar = (this.sayac.get(anahtar) ?? []).filter((t) => simdi - t < SAYAC_PENCERESI_MS);
    zamanlar.push(simdi);
    this.sayac.set(anahtar, zamanlar);
    this.ayarla({
      ekran: "g2",
      gonderiyor: false,
      hata: null,
      gecerlilikSn: r.veri.gecerlilikSn,
      yenidenGonderBitis: simdi + YENIDEN_GONDER_MS,
      gonderimSayisi: zamanlar.length,
      tekrarSiniri: zamanlar.length >= TEKRAR_SINIRI_ESIGI,
      tekrarGonderildi: yeniden,
    });
  }

  // --- g3, g4 -----------------------------------------------------------------------------------------

  /** g3 "giriş yap": `POST /giris/onay {j}`. Başarıda: yeni hesap → g4, dönen → oyun. */
  async onayla(): Promise<void> {
    if (this.d.ekran !== "g3" || this.d.gonderiyor || this.hizSiniriSuruyor()) return;
    const jeton = this.jeton;
    if (!jeton) {
      this.ayarla({ ekran: "g1", hata: this.hataYap({ kod: "baglanti_gecersiz" }, "g3") });
      return;
    }
    this.ayarla({ gonderiyor: true, hata: null });
    const r = await this.api.onayla(jeton);
    if (!r.tamam) {
      if (r.kod === "gecici_eposta") {
        // alan listesi istekten sonra güncellenmiş olabilir: G-1'e dön, kalıcı adresle yeniden iste
        this.jeton = null;
        this.ayarla({ ekran: "g1", gonderiyor: false, jetonVar: false, hata: this.hataYap(r, "g3") });
        return;
      }
      if (r.kod === "baglanti_gecersiz") this.jeton = null; // tüketilmiş ya da düşmüş: yeniden denemenin anlamı yok
      this.ayarla({ gonderiyor: false, hata: this.hataYap(r, "g3"), jetonVar: this.jeton !== null });
      return;
    }
    this.jeton = null; // tek kullanımlık; bellekten de at
    this.ayarla({ gonderiyor: false, jetonVar: false, basari: true, oyuncu: r.veri.oyuncu, yeniHesap: r.veri.yeniHesap });
    if (r.veri.yeniHesap) {
      this.ayarla({ ekran: "g4" });
      return;
    }
    await this.oturumaGec(r.veri.oyuncu, false);
  }

  /** g3/g1: "yeni bağlantı iste" (`baglanti_gecersiz`, `tarayici_uyumsuz`): g1'e dön. */
  yeniBaglantiIste(): void {
    this.jeton = null;
    this.ayarla({ ekran: "g1", jetonVar: false, hata: null, basari: false });
  }

  /** g4 tamam (görünen ad G9-c'de bağlanır): oyuna geç. */
  async adTamamlandi(): Promise<void> {
    if (this.d.ekran !== "g4") return;
    await this.oturumaGec(this.d.oyuncu ?? "", true);
  }

  // --- oyun, oturum -----------------------------------------------------------------------------------

  /**
   * Oturum kuruldu: bileti önden al (oturumu sınar; `WsBaglanti` bunu harcar) ve `oyun` ekranına geç. Bilet alınamazsa (ağ) g1 ve hata;
   * 401 ise oturum yoktur (g1, hata yok: açılışta "doldu" denmez).
   */
  private async oturumaGec(oyuncu: string, yeniHesap: boolean): Promise<void> {
    try {
      const y = await this.saglayici.onceden();
      this.ayarla({ ekran: "oyun", oyuncu: y.oyuncu || oyuncu, yeniHesap: yeniHesap || this.d.yeniHesap, hata: null, gonderiyor: false });
    } catch (e) {
      const kod = (e as { kod?: IstemciHataKodu } | null)?.kod ?? "ag_hatasi";
      const beklemeSn = (e as { beklemeSn?: number } | null)?.beklemeSn;
      this.ayarla({ ekran: "g1", gonderiyor: false, hata: kod === "oturum_yok" ? null : this.hataYap({ kod, ...(beklemeSn !== undefined ? { beklemeSn } : {}) }, "g1") });
    }
  }

  /** Oturum bitti (bilet 401 ya da ws kimlik reddi sonrası): G-7. Zaten giriş ekranlarındaysa dokunmaz. */
  oturumBitti(): void {
    if (this.d.ekran === "g1" || this.d.ekran === "g2" || this.d.ekran === "g3" || this.d.ekran === "g4") return;
    this.saglayici.temizle();
    this.ayarla({ ekran: "g7", hata: this.hataYap({ kod: "oturum_yok" }, "g7"), gonderiyor: false });
  }

  /** g7 "giriş yap": g1'e git. */
  yenidenGirisYap(): void {
    this.ayarla({ ekran: "g1", hata: null, oyuncu: null });
  }

  /** Ayarlar "çıkış yap" / "tüm cihazlardan çık": oturum kapanır; sonuç `cikisYapildi` ile g1. Hata olursa ekran değişmez. */
  async cikis(tumu: boolean): Promise<boolean> {
    if (this.d.gonderiyor) return false;
    this.ayarla({ gonderiyor: true });
    const r = await (tumu ? this.api.cikisTumu() : this.api.cikis());
    this.saglayici.temizle();
    if (!r.tamam && r.kod !== "oturum_yok") {
      this.ayarla({ gonderiyor: false, hata: this.hataYap(r, "g7") });
      return false;
    }
    this.ayarla({ ekran: "g1", gonderiyor: false, hata: null, oyuncu: null, yeniHesap: false, cikisYapildi: true, jetonVar: false, basari: false });
    return true;
  }

  // --- yardımcılar ------------------------------------------------------------------------------------

  private hizSiniriSuruyor(): boolean {
    const h = this.d.hata;
    return h?.kod === "hiz_siniri" && h.bitis !== undefined && this.simdi() < h.bitis;
  }

  private hataYap(b: GirisHatasiBilgisi, ekran: GirisEkraniAdi): HataDurumu {
    const h: HataDurumu = { kod: b.kod, anahtar: hataAnahtari(b.kod), eylem: hataEylemi(b.kod, ekran) };
    if (b.kod === "hiz_siniri") {
      h.dakika = hizSiniriDakika(b.beklemeSn);
      h.bitis = this.simdi() + (b.beklemeSn !== undefined && b.beklemeSn > 0 ? b.beklemeSn : 60) * 1000;
    }
    return h;
  }

  private ayarla(k: Partial<GirisDurumu>): void {
    this.d = { ...this.d, ...k };
    for (const f of [...this.dinleyiciler]) f(this.d);
  }
}

/**
 * Baglam uygulaması: alt sistemlerin motorla konuştuğu arayüz (olay planlama, kirletme,
 * rastgelelik, kimlik). Durumun tamamı Dunya içindedir; bu nesne yalnızca "şu an işlenen olay
 * türü" bilgisini taşır (kirlet davranışını belirlemek için). Klonlanan simülasyon yeni bir Baglam alır.
 */
import { kuyrukEkle } from "./kuyruk";
import { aralik, sonraki } from "./prng";
import { DAKIKA, OLAY_ONCELIGI } from "./tipler";
import type { Baglam, DerlenmisIcerik, Dunya, Ms, OlayTuru, OlayVerisi, PrngAkisi } from "./tipler";

/**
 * Bir olay türü kirletmeyi "gecikmeli" (titreşim önleyici) kılar mı?
 * Yalnızca eşik ve oran_delta (ve çözümün kendisi); komut/tik/inşaat vb. anında çözüm ister.
 */
function gecikmeliKaynakMi(tur: OlayTuru | null): boolean {
  return tur === "esik" || tur === "oran_delta" || tur === "cozum";
}

export class BaglamUygulamasi implements Baglam {
  /**
   * Şu an işlenen olay türü; komut uygulanırken veya olay dışında null. Motor her olaydan önce ayarlar.
   * null/komut/saatlik_tik/insaat_bitti/... -> kirlet aynı t'ye çözüm planlar;
   * esik/oran_delta -> en erken sonCozum + enAzCozumAraligiDakika.
   */
  islenenOlay: OlayTuru | null = null;

  constructor(readonly ic: DerlenmisIcerik) {}

  /** Olayı kuyruğa koyar; sira = d.sayac.olay++, öncelik OLAY_ONCELIGI'nden. t < d.zaman ise hata. */
  planla(d: Dunya, t: Ms, veri: OlayVerisi): void {
    if (!(t >= d.zaman)) {
      throw new RangeError(`planla: gecmise olay planlanamaz (t=${t}, zaman=${d.zaman}, tur=${veri.tur})`);
    }
    kuyrukEkle(d.kuyruk, { t, oncelik: OLAY_ONCELIGI[veri.tur], sira: d.sayac.olay++, veri });
  }

  /**
   * Lojistiği kirli işaretler ve gerekirse çözüm planlar (spesifikasyon §2).
   * - Kaynak komut/tik/inşaat/araştırma/parti/savaş ise çözüm AYNI t'dedir.
   * - Kaynak eşik/oran_delta ise çözüm en erken sonCozum + enAzCozumAraligiDakika'dadır
   *   (hiç çözüm yapılmadıysa d.zaman).
   * Kuyrukta zaten bir çözüm bekliyorsa yenisi eklenmez; istisna: anında çözüm isteniyor ama
   * bekleyen çözüm gecikmeli (gelecekte) ise ek bir çözüm d.zaman'a planlanır. Fazla kalan çözüm
   * olayı kirli değilse motor tarafından zararsızca yok sayılır.
   */
  kirlet(d: Dunya): void {
    const l = d.lojistik;
    l.kirli = true;
    const gecikmeli = gecikmeliKaynakMi(this.islenenOlay);
    const aralikMs = this.ic.param.lojistik.enAzCozumAraligiDakika * DAKIKA;
    const gecikmeSiniri = l.cozumSayisi > 0 ? l.sonCozum + aralikMs : d.zaman;
    if (!l.cozumPlanli) {
      const t = gecikmeli && gecikmeSiniri > d.zaman ? gecikmeSiniri : d.zaman;
      this.planla(d, t, { tur: "cozum" });
      l.cozumPlanli = true;
      return;
    }
    // Bekleyen çözüm var. Gecikmeli planlandıysa zamanı sonCozum + aralık'tır (> d.zaman ise gelecektedir).
    if (!gecikmeli && gecikmeSiniri > d.zaman && !d.kuyruk.some((o) => o.t === d.zaman && o.veri.tur === "cozum")) {
      this.planla(d, d.zaman, { tur: "cozum" });
    }
  }

  /** Akıştan [0, 2^32) uint32 çeker (durum d.rng[akis] yerinde ilerler). */
  rastgele(d: Dunya, akis: PrngAkisi): number {
    return sonraki(d.rng[akis]);
  }

  /** Akıştan [0, n) sapmasız tamsayı çeker. 1 <= n <= 2^32. */
  rastgeleAralik(d: Dunya, akis: PrngAkisi, n: number): number {
    return aralik(d.rng[akis], n);
  }

  /** Yeni benzersiz kimlik (d.sayac.kimlik, 1'den başlar). */
  yeniKimlik(d: Dunya): number {
    return d.sayac.kimlik++;
  }
}

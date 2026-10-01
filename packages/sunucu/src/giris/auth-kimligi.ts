/**
 * ws bileti doğrulayıcısı (`merhaba.token`): imza (eski/yeni sır), süre, `jti` TEK KULLANIM (bellek kümesi) ve OTURUM İPTALİ.
 * Veritabanına gitmez (tek yazar sürecinin gecikmesi korunur): iptal bellek içi kümededir, giriş hizmeti çıkış/iptalde doldurur.
 * Hiçbir zaman yönetici (`sistem`) kimliği üretmez; oyuncu kimliği yalnız bilet içeriğinden gelir.
 */
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { OYUNCU_KIMLIGI } from "../kimlik";
import type { Kimlik, KimlikDogrulayici } from "../kimlik";
import { biletCoz } from "./jeton";
import type { Imzalayici } from "./jeton";
import { GirisSayaclari } from "./sayac";

export interface AuthKimligiSecenekleri {
  imzalayici: Imzalayici;
  /** Duvar saati (epoch ms); testler enjekte eder. */
  simdi?: () => number;
  /** Bilet ömrü (ms): iptal ve jti kayıtlarının tutulma süresini belirler. Varsayılan 60 000. */
  biletOmruMs?: number;
  sayaclar?: GirisSayaclari;
}

export class AuthKimligi implements KimlikDogrulayici {
  private readonly imz: Imzalayici;
  private readonly simdi: () => number;
  private readonly omur: number;
  readonly sayaclar: GirisSayaclari;
  /** Kullanılmış `jti` -> bilet bitişi. */
  private readonly kullanilan = new Map<string, number>();
  /** İptal edilmiş oturum -> iptal anı. Bilet ömrü (+ pay) geçince girişi silinir: o oturumdan alınmış hiçbir bilet artık geçerli olamaz. */
  private readonly iptal = new Map<string, number>();
  private sonTemizlik = 0;

  constructor(s: AuthKimligiSecenekleri) {
    this.imz = s.imzalayici;
    this.simdi = s.simdi ?? (() => Date.now());
    this.omur = s.biletOmruMs ?? 60_000;
    this.sayaclar = s.sayaclar ?? new GirisSayaclari();
  }

  /** Oturumları iptal eder: bunların biletleri (çıkıştan önce alınmış olanlar dahil) artık reddedilir. */
  oturumlariIptalEt(oturumlar: readonly string[]): void {
    const an = this.simdi();
    for (const o of oturumlar) this.iptal.set(o, an);
  }

  async dogrula(token: string): Promise<Kimlik | null> {
    const an = this.simdi();
    this.temizle(an);
    const b = biletCoz(this.imz, token);
    if (!b) {
      this.sayaclar.artir("bilet.reddedildi_imza");
      return null;
    }
    if (b.bitis <= an || b.bitis - an > this.omur + 5_000) {
      this.sayaclar.artir("bilet.reddedildi_sure");
      return null;
    }
    if (this.iptal.has(b.oturum)) {
      this.sayaclar.artir("bilet.reddedildi_iptal");
      return null;
    }
    if (this.kullanilan.has(b.jti)) {
      this.sayaclar.artir("bilet.reddedildi_tekrar");
      return null;
    }
    if (!OYUNCU_KIMLIGI.test(b.oyuncu) || b.oyuncu === SISTEM_OYUNCUSU) {
      this.sayaclar.artir("bilet.reddedildi_imza");
      return null;
    }
    this.kullanilan.set(b.jti, b.bitis);
    return { oyuncu: b.oyuncu, yonetici: false, hesap: b.hesap, oturum: b.oturum };
  }

  private temizle(an: number): void {
    if (an - this.sonTemizlik < 10_000) return;
    this.sonTemizlik = an;
    for (const [j, bitis] of this.kullanilan) if (bitis <= an) this.kullanilan.delete(j);
    for (const [o, iptalAni] of this.iptal) if (an - iptalAni > 2 * this.omur) this.iptal.delete(o);
  }
}

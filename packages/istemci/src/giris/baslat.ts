/**
 * Giriş açılışı (G9-b; kabuk): e-posta kipinde uygulama BAŞLAMADAN önce giriş akışını kurar ve `oyun` ekranına gelinene dek bekletir.
 * `sahte` ve `gelistirme` kiplerinde hiç çağrılmaz (giriş ekranı yok; `?token=` aynen çalışır).
 *
 * - Adreste `?j=<jeton>` varsa HEMEN adresten silinir (`history.replaceState`; Referer/yer imi/geçmişte kalmasın), sonra g3 gösterilir.
 * - Harita yığını (ayrı bundle) bileti `window.__girisBilet` işleviyle alır (`baglanti-kur.ts`): `__katilIste` ile aynı köprü deseni.
 * - Oturum bitip yeniden giriş yapılırsa (ya da çıkıştan sonra) uygulama çalışır durumdadır ama ws "reddedildi"dir: sayfa yenilenir.
 * - Ayarlar menüsüne hesap bölümü (G-8: e-posta maskeli, çıkış yap, tüm cihazlardan çık) eklenir.
 */
import { GirisApi } from "./api";
import { GirisAkisi } from "./akis";
import { GirisGorunumu, HesapBolumu } from "./gorunum";
import { baglantiJetonu, jetonsuzAdres } from "./kip";
import type { KipBilgisi } from "./kip";
import { BiletSaglayici } from "./oturum";

declare global {
  interface Window {
    /** E-posta girişi: her bağlanışta taze ws bileti veren işlev (`WsBaglanti.token`). Geliştirme kipinde tanımsız. */
    __girisBilet?: () => Promise<string>;
  }
}

export interface GirisKurulumu {
  akis: GirisAkisi;
  api: GirisApi;
  saglayici: BiletSaglayici;
  gorunum: GirisGorunumu;
  /** Akış ilk kez `oyun` ekranına gelince çözülür (uygulama o zaman başlar). */
  oyunHazir: Promise<void>;
}

export function girisBaslat(kip: KipBilgisi): GirisKurulumu {
  const api = new GirisApi({ taban: kip.httpTabani ?? "" });
  const saglayici = new BiletSaglayici({ api });
  const akis = new GirisAkisi({ api, saglayici });
  window.__girisBilet = saglayici.bilet;

  const jeton = baglantiJetonu(location.search);
  if (jeton) {
    try {
      history.replaceState(history.state, "", jetonsuzAdres(location.href));
    } catch {
      /* adres güncellenemedi (kısıtlı bağlam): jeton bellekte kullanılır */
    }
  }

  const gorunum = new GirisGorunumu({ kok: document.getElementById("giris"), arka: document.getElementById("uygulama"), akis });
  let oyunaGirildi = false;
  let eposta = "";
  let hesap: HesapBolumu | null = null;
  const oyunHazir = new Promise<void>((coz) => {
    akis.dinle((d) => {
      if (d.ekran !== "oyun") return;
      if (oyunaGirildi) {
        // Oturum kapanıp yeniden girildi: çalışan uygulamanın ws bağlantısı reddedilmişti, temiz bir yükleme gerekir
        location.reload();
        return;
      }
      oyunaGirildi = true;
      hesapKur();
      coz();
    });
  });
  gorunum.kur();

  /** Ayarlar menüsüne hesap bölümü (e-posta `GET /giris/ben`'den). */
  function hesapKur(): void {
    const menu = document.getElementById("ayar-menu");
    if (!menu || hesap) return;
    const kap = document.createElement("div");
    kap.className = "gr-hesap-kap";
    menu.appendChild(kap);
    hesap = new HesapBolumu(kap, akis, () => eposta);
    hesap.kur();
    void api.ben().then((r) => {
      if (r.tamam) {
        eposta = r.veri.eposta;
        hesap?.tazele();
      }
    });
  }

  void akis.basla(jeton);
  return { akis, api, saglayici, gorunum, oyunHazir };
}

/**
 * Giriş görünümü (G9-b; DOM): `GirisAkisi` durumunu `ekran-html.ts` iskeletiyle `#giris` köküne çizer ve olayları akışa bağlar.
 * Mantık akışta, dizge üretimi `ekran-html.ts`'te; burada yalnız bağlama vardır:
 * - tam yeniden çizim durum değişince (giriş alanı değeri ve odak korunur), geri sayım her saniye yerinde güncellenir;
 * - ekran değişince başlığa (`h1`, tabindex -1) odak; hata/yeniden çizimde odak alanda kalır;
 * - giriş ekranı açıkken arka uygulama `inert` (klavye ve okuyucu arkaya gitmez); `oyun` ekranında kök gizlenir;
 * - G-4 (görünen ad): alan değeri yazarken ezilmez (`adSurumu` artınca, yani öneri gelince üzerine yazılır); sayaç, küçük hâl önizlemesi ve canlı hata alanda yerinde güncellenir.
 * Sınıf adı/stil satırı yazmaz (CSS T1'in `arayuz/giris.css`); durum `data-durum` ile yazılır.
 */
import type { GirisAkisi, GirisDurumu } from "./akis";
import { adCanliHatasi, adHataAnahtari, adOnizleme } from "./ad";
import { girisHtml, hesapHtml } from "./ekran-html";
import { metin } from "./giris-metin";

export interface GirisGorunumuSecenekleri {
  /** Giriş perdesi (`#giris.gr`); hazır element ya da null (kendisi oluşturur ve `body`ye ekler). */
  kok?: HTMLElement | null;
  /** Giriş açıkken `inert` yapılacak uygulama kökü (`#uygulama`). */
  arka?: HTMLElement | null;
  akis: GirisAkisi;
}

/**
 * Görünen ad alanı yazılırken yerinde güncelleme (tam yeniden çizim yok: imleç ve odak korunur): sayaç, küçük hâl önizlemesi ve canlı hata.
 * Önceki (sunucu) hata yazmaya başlayınca kalkar; yerine yalnız o an düzeltilebilecek canlı hata gelir (`adCanliHatasi`).
 */
export function adAlaniniGuncelle(kok: ParentNode, deger: string): void {
  const sayac = kok.querySelector<HTMLElement>("[data-alan='ad-sayac']");
  if (sayac) sayac.textContent = metin("giris.G4.sayac", { n: deger.length });
  const onizleme = adOnizleme(deger);
  const on = kok.querySelector<HTMLElement>("[data-alan='ad-onizleme']");
  if (on) on.textContent = onizleme !== null ? metin("giris.G4.onizleme", { ad: onizleme }) : "";
  const canli = adCanliHatasi(deger);
  const hata = kok.querySelector<HTMLElement>(".gr-alan .gr-hata");
  if (hata) {
    hata.textContent = canli !== null ? metin(adHataAnahtari(canli)) : "";
    if (canli !== null) hata.setAttribute("data-kod", "ad_gecersiz");
    else hata.removeAttribute("data-kod");
  }
  const girdi = kok.querySelector<HTMLInputElement>("input[name='ad']");
  if (girdi) {
    if (canli !== null) {
      girdi.setAttribute("aria-invalid", "true");
      girdi.setAttribute("data-durum", "hata");
    } else {
      girdi.removeAttribute("aria-invalid");
      girdi.removeAttribute("data-durum");
    }
  }
}

export class GirisGorunumu {
  readonly kok: HTMLElement;
  private readonly akis: GirisAkisi;
  private readonly arka: HTMLElement | null;
  private epostaDegeri = "";
  /** g4 alan değeri (yazarken) ve akıştan en son alınan sürüm. */
  private adDegeri: string | null = null;
  private adSurumu = -1;
  private oncekiEkran = "";
  /** Son çizilen iskelet: aynıysa yeniden çizilmez (hata `role=alert` satırı boş yere yeniden okunmasın). */
  private sonHtml = "";
  /** Giriş açılırken odaktaki öğe: kapanınca odak ona döner (ekran okuyucu/klavye bağlamı korunur). */
  private oncekiOdak: HTMLElement | null = null;
  private zamanlayici: ReturnType<typeof setInterval> | null = null;
  private durdur: () => void = () => undefined;

  constructor(s: GirisGorunumuSecenekleri) {
    this.akis = s.akis;
    this.arka = s.arka ?? null;
    let k = s.kok ?? null;
    if (!k) {
      k = document.createElement("div");
      k.id = "giris";
      document.body.appendChild(k);
    }
    k.classList.add("gr");
    k.setAttribute("role", "dialog");
    k.setAttribute("aria-modal", "true");
    k.setAttribute("aria-labelledby", "gr-baslik");
    k.hidden = true;
    this.kok = k;
  }

  /** Olayları bağlar ve ilk çizimi yapar. */
  kur(): void {
    this.kok.addEventListener("submit", this.gonderildi);
    this.kok.addEventListener("click", this.tiklandi);
    this.kok.addEventListener("input", this.girdi);
    this.durdur = this.akis.dinle(() => this.ciz());
    this.ciz();
  }

  yokEt(): void {
    this.durdur();
    this.kok.removeEventListener("submit", this.gonderildi);
    this.kok.removeEventListener("click", this.tiklandi);
    this.kok.removeEventListener("input", this.girdi);
    this.zamanlayiciKapat();
    this.arkayiAc();
  }

  // --- olaylar --------------------------------------------------------------------------------------

  private readonly girdi = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    if (t instanceof HTMLInputElement && t.id === "gr-eposta") this.epostaDegeri = t.value;
    if (t instanceof HTMLInputElement && t.id === "gr-ad") {
      this.adDegeri = t.value;
      adAlaniniGuncelle(this.kok, t.value);
    }
  };

  private readonly gonderildi = (e: Event): void => {
    e.preventDefault();
    const ad = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-eylem='ad-form']");
    if (ad) {
      const a = this.kok.querySelector<HTMLInputElement>("#gr-ad");
      this.adDegeri = a?.value ?? this.adDegeri;
      void this.akis.adKaydet(this.adDegeri ?? "");
      return;
    }
    const f = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-eylem='baglanti-gonder-form']");
    if (!f) return;
    const alan = this.kok.querySelector<HTMLInputElement>("#gr-eposta");
    this.epostaDegeri = alan?.value ?? this.epostaDegeri;
    void this.akis.epostaGonder(this.epostaDegeri);
  };

  private readonly tiklandi = (e: Event): void => {
    const d = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-eylem]");
    if (!d || d.getAttribute("aria-disabled") === "true" || (d as HTMLButtonElement).disabled) return;
    switch (d.dataset["eylem"]) {
      case "yeniden-gonder":
        void this.akis.yenidenGonder();
        break;
      case "adresi-degistir":
        this.akis.adresiDegistir();
        break;
      case "giris-yap":
        void this.akis.onayla();
        break;
      case "yeni-baglanti-iste":
        this.akis.yeniBaglantiIste();
        break;
      case "yeniden-giris":
        this.akis.yenidenGirisYap();
        break;
      case "ad-oner":
        void this.akis.adOner();
        break;
      default:
        break;
    }
  };

  // --- çizim ----------------------------------------------------------------------------------------

  private ciz(): void {
    const d = this.akis.durum;
    const gorunur = d.ekran !== "oyun";
    const acikti = !this.kok.hidden;
    this.kok.hidden = !gorunur;
    if (!gorunur) {
      this.zamanlayiciKapat();
      this.arkayiAc();
      this.oncekiEkran = "oyun";
      this.sonHtml = "";
      this.kok.removeAttribute("aria-busy");
      // Kapanınca odak çağıran öğeye döner (yoksa gövde)
      const geri = this.oncekiOdak;
      this.oncekiOdak = null;
      if (acikti && geri && geri.isConnected) geri.focus();
      return;
    }
    if (!acikti) this.oncekiOdak = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    if (this.arka && !this.arka.hasAttribute("inert")) this.arka.setAttribute("inert", "");
    this.kok.setAttribute("aria-busy", d.gonderiyor || d.ekran === "yukleniyor" ? "true" : "false");
    // Yeniden çizimde odak korunur: odaktaki öğenin kimliği ya da `data-eylem`i kaydedilir
    const odak = document.activeElement instanceof HTMLElement && this.kok.contains(document.activeElement) ? document.activeElement : null;
    const secim = odak instanceof HTMLInputElement ? [odak.selectionStart, odak.selectionEnd] : null;
    // g4 alanı: öneri gelince (sürüm arttı) değer akıştan; yazarken kullanıcının değeri
    if (d.adSurumu !== this.adSurumu) {
      this.adSurumu = d.adSurumu;
      this.adDegeri = d.adGirdi;
    }
    const odakSecici = odak?.id ? `#${odak.id}` : odak?.dataset["eylem"] ? `[data-eylem='${odak.dataset["eylem"]}']` : null;
    if (d.eposta && d.ekran === "g1" && this.epostaDegeri === "") this.epostaDegeri = d.eposta;
    const html = girisHtml(d, { kalanSn: (b) => this.akis.kalanSn(b), epostaDegeri: this.epostaDegeri, ...(this.adDegeri !== null ? { adDegeri: this.adDegeri } : {}) });
    if (html === this.sonHtml && this.oncekiEkran === d.ekran) return this.sayimiBaslat(d);
    this.sonHtml = html;
    this.kok.innerHTML = html;
    const degisti = this.oncekiEkran !== d.ekran;
    this.oncekiEkran = d.ekran;
    if (degisti) {
      // Ekran değişti: başlığa odak (okuyucu başlığı okur)
      this.kok.querySelector<HTMLElement>("#gr-baslik")?.focus();
    } else if (odakSecici) {
      const yeni = this.kok.querySelector<HTMLElement>(odakSecici);
      yeni?.focus();
      if (yeni instanceof HTMLInputElement) {
        // imleç yerinde kalır (yeniden çizim yazmayı bölmez); öneri gelince alan içeriği değiştiği için sona
        const n = yeni.value.length;
        const [b, e] = secim ?? [n, n];
        yeni.setSelectionRange(Math.min(b ?? n, n), Math.min(e ?? n, n));
      }
    }
    this.sayimiBaslat(d);
  }

  /** Geri sayım yalnız gerektiğinde (g2 bekleme, hız sınırı) saniyede bir yerinde güncellenir; bitince tam çizim. */
  private sayimiBaslat(d: GirisDurumu): void {
    const gerek = this.kok.querySelector("[data-sayim]") !== null;
    if (!gerek) return this.zamanlayiciKapat();
    if (this.zamanlayici) return;
    this.zamanlayici = setInterval(() => {
      const kalanVar = this.sayimiYaz();
      if (!kalanVar) {
        this.zamanlayiciKapat();
        this.ciz(); // süre doldu: düğme açılır, hız sınırı satırı kalkar
      }
    }, 1000);
    void d;
  }

  /** `[data-sayim]` öğelerini şimdiki duruma göre yazar; sayım sürüyorsa true. */
  private sayimiYaz(): boolean {
    const d = this.akis.durum;
    let suruyor = false;
    for (const el of this.kok.querySelectorAll<HTMLElement>("[data-sayim]")) {
      const tur = el.dataset["sayim"];
      const bitis = tur === "hiz" ? d.hata?.bitis : d.yenidenGonderBitis;
      if (bitis === undefined) continue;
      const sn = this.akis.kalanSn(bitis);
      if (sn > 0) suruyor = true;
      if (tur === "hiz") {
        el.dataset["saniye"] = String(sn);
        el.textContent = `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, "0")}`;
      }
    }
    // Yeniden gönder düğmesinin etiketi: tam çizim yerine metni güncelle (odak kaybolmaz)
    const tekrar = this.kok.querySelector<HTMLElement>("[data-eylem='yeniden-gonder'][data-sayim]");
    if (tekrar && d.ekran === "g2") {
      const sn = this.akis.kalanSn(d.yenidenGonderBitis);
      if (sn > 0) {
        tekrar.textContent = tekrar.textContent?.replace(/\(\d+ sn\)/, `(${sn} sn)`) ?? "";
        suruyor = true;
      }
    }
    return suruyor;
  }

  private zamanlayiciKapat(): void {
    if (this.zamanlayici) clearInterval(this.zamanlayici);
    this.zamanlayici = null;
  }

  private arkayiAc(): void {
    this.arka?.removeAttribute("inert");
  }
}

/** G-8: Ayarlar'daki hesap bölümü ("çıkış yap", "tüm cihazlardan çık" + onay). Kök, `section.gr-hesap`ın yerleşeceği kap. */
export class HesapBolumu {
  private onayAcik = false;
  private cikiyor = false;
  /** Görünen ad düzenleyicisi (Ayarlar) açık mı ve alan değeri. */
  private adDuzenle = false;
  private adGirdi = "";
  private durdur: () => void = () => undefined;

  constructor(
    private readonly kap: HTMLElement,
    private readonly akis: GirisAkisi,
    private readonly eposta: () => string,
  ) {}

  kur(): void {
    this.kap.addEventListener("click", this.tiklandi);
    this.kap.addEventListener("submit", this.gonderildi);
    this.kap.addEventListener("input", this.girdi);
    // ad değişimi/sonuç/sınır akıştan gelir: bölüm yerinde yeniden çizilir (odak ve imleç korunur)
    this.durdur = this.akis.dinle(() => this.ciz());
    this.ciz();
  }

  yokEt(): void {
    this.durdur();
    this.kap.removeEventListener("click", this.tiklandi);
    this.kap.removeEventListener("submit", this.gonderildi);
    this.kap.removeEventListener("input", this.girdi);
    this.kap.innerHTML = "";
  }

  /** E-posta bilgisi geç gelirse yeniden çizer. */
  tazele(): void {
    this.ciz();
  }

  private ciz(): void {
    const d = this.akis.durum;
    const alan = document.activeElement instanceof HTMLInputElement && this.kap.contains(document.activeElement) ? document.activeElement : null;
    const secim = alan ? [alan.selectionStart, alan.selectionEnd] : null;
    this.kap.innerHTML = hesapHtml({
      eposta: this.eposta(),
      onayAcik: this.onayAcik,
      cikiyor: this.cikiyor,
      ad: {
        ad: d.ad,
        duzenle: this.adDuzenle,
        girdi: this.adGirdi,
        hata: this.adDuzenle && d.hata ? { anahtar: d.hata.anahtar, kod: d.hata.kod } : null,
        sinir: this.akis.adSinirDolu(),
        sonuc: d.adSonuc,
        gonderiyor: d.gonderiyor && this.adDuzenle,
      },
    });
    if (alan) {
      const yeni = this.kap.querySelector<HTMLInputElement>("#gr-hesap-ad");
      yeni?.focus();
      if (yeni) yeni.setSelectionRange(secim?.[0] ?? yeni.value.length, secim?.[1] ?? yeni.value.length);
    }
  }

  private readonly girdi = (e: Event): void => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.id === "gr-hesap-ad") {
      this.adGirdi = t.value;
      adAlaniniGuncelle(this.kap, t.value);
    }
  };

  private readonly gonderildi = (e: Event): void => {
    e.preventDefault();
    if (!(e.target as HTMLElement | null)?.closest("[data-eylem='ad-ayar-form']")) return;
    const alan = this.kap.querySelector<HTMLInputElement>("#gr-hesap-ad");
    this.adGirdi = alan?.value ?? this.adGirdi;
    void this.akis.adKaydet(this.adGirdi).then((tamam) => {
      if (tamam) this.adDuzenle = false;
      this.ciz();
    });
  };

  private readonly tiklandi = (e: Event): void => {
    const d = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-eylem]");
    if (!d || (d as HTMLButtonElement).disabled || d.getAttribute("aria-disabled") === "true") return;
    const islem = d.dataset["eylem"];
    if (islem === "cikis") void this.cik(false);
    else if (islem === "cikis-tumu") {
      this.onayAcik = true;
      this.ciz();
      this.kap.querySelector<HTMLElement>("[data-eylem='cikis-tumu-vazgec']")?.focus();
    } else if (islem === "cikis-tumu-vazgec") {
      this.onayAcik = false;
      this.ciz();
    } else if (islem === "cikis-tumu-onayla") void this.cik(true);
    else if (islem === "ad-degistir") {
      this.adDuzenle = true;
      this.adGirdi = this.akis.durum.ad ?? "";
      this.akis.adHatasiniTemizle();
      this.ciz();
      this.kap.querySelector<HTMLElement>("#gr-hesap-ad")?.focus();
    } else if (islem === "ad-vazgec") {
      this.adDuzenle = false;
      this.akis.adHatasiniTemizle();
      this.ciz();
      this.kap.querySelector<HTMLElement>("[data-eylem='ad-degistir']")?.focus();
    }
  };

  private async cik(tumu: boolean): Promise<void> {
    this.cikiyor = true;
    this.ciz();
    const tamam = await this.akis.cikis(tumu);
    this.cikiyor = false;
    this.onayAcik = false;
    if (!tamam) this.ciz();
  }
}

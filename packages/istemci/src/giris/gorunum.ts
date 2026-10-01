/**
 * Giriş görünümü (G9-b; DOM): `GirisAkisi` durumunu `ekran-html.ts` iskeletiyle `#giris` köküne çizer ve olayları akışa bağlar.
 * Mantık akışta, dizge üretimi `ekran-html.ts`'te; burada yalnız bağlama vardır:
 * - tam yeniden çizim durum değişince (giriş alanı değeri ve odak korunur), geri sayım her saniye yerinde güncellenir;
 * - ekran değişince başlığa (`h1`, tabindex -1) odak; hata/yeniden çizimde odak alanda kalır;
 * - giriş ekranı açıkken arka uygulama `inert` (klavye ve okuyucu arkaya gitmez); `oyun` ekranında kök gizlenir;
 * - G-4 (görünen ad) G9-c'dedir: akış `g4`e gelince görünüm adımı atlar (`adTamamlandi`).
 * Sınıf adı/stil satırı yazmaz (CSS T1'in `arayuz/giris.css`); durum `data-durum` ile yazılır.
 */
import type { GirisAkisi, GirisDurumu } from "./akis";
import { girisHtml, hesapHtml } from "./ekran-html";

export interface GirisGorunumuSecenekleri {
  /** Giriş perdesi (`#giris.gr`); hazır element ya da null (kendisi oluşturur ve `body`ye ekler). */
  kok?: HTMLElement | null;
  /** Giriş açıkken `inert` yapılacak uygulama kökü (`#uygulama`). */
  arka?: HTMLElement | null;
  akis: GirisAkisi;
}

export class GirisGorunumu {
  readonly kok: HTMLElement;
  private readonly akis: GirisAkisi;
  private readonly arka: HTMLElement | null;
  private epostaDegeri = "";
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
  };

  private readonly gonderildi = (e: Event): void => {
    e.preventDefault();
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
      default:
        break;
    }
  };

  // --- çizim ----------------------------------------------------------------------------------------

  private ciz(): void {
    const d = this.akis.durum;
    if (d.ekran === "g4") {
      // Görünen ad ekranı G9-c'de: şimdilik atla (sunucu opak bir ad verir)
      void this.akis.adTamamlandi();
      return;
    }
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
    const odakSecici = odak?.id ? `#${odak.id}` : odak?.dataset["eylem"] ? `[data-eylem='${odak.dataset["eylem"]}']` : null;
    if (d.eposta && d.ekran === "g1" && this.epostaDegeri === "") this.epostaDegeri = d.eposta;
    const html = girisHtml(d, { kalanSn: (b) => this.akis.kalanSn(b), epostaDegeri: this.epostaDegeri });
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
      if (yeni instanceof HTMLInputElement) yeni.setSelectionRange(yeni.value.length, yeni.value.length);
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

  constructor(
    private readonly kap: HTMLElement,
    private readonly akis: GirisAkisi,
    private readonly eposta: () => string,
  ) {}

  kur(): void {
    this.kap.addEventListener("click", this.tiklandi);
    this.ciz();
  }

  yokEt(): void {
    this.kap.removeEventListener("click", this.tiklandi);
    this.kap.innerHTML = "";
  }

  /** E-posta bilgisi geç gelirse yeniden çizer. */
  tazele(): void {
    this.ciz();
  }

  private ciz(): void {
    this.kap.innerHTML = hesapHtml({ eposta: this.eposta(), onayAcik: this.onayAcik, cikiyor: this.cikiyor });
  }

  private readonly tiklandi = (e: Event): void => {
    const d = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-eylem]");
    if (!d || (d as HTMLButtonElement).disabled) return;
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

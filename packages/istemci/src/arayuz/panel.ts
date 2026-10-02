/**
 * Arayüz denetleyicisi (sakin HUD): üst çubuk (devlet/hazine, tarih ve hasat, bildirimler, kamera, tema, ⚙),
 * "Görünüm" mercek menüsü, panel sekmeleri, neden şeridi, ⓘ bilgi kutusu ve gelen kutusu.
 *   - Dünya hızı ve duraklat yalnız "⚙ Hata ayıklama" menüsündedir (varsayılan kapalı).
 *   - Atıf metni ve kontrol yardımı köşedeki "ⓘ" kutusundadır.
 *   - Toast yalnız oyuncunun kendi eyleminin sonucudur; diğer olaylar "Bildirimler" kutusuna düşer.
 * İçerik üreticileri govde.ts / dikkat.ts / komut-govde.ts'de saftır; burada DOM bağlama ve olay yönlendirme vardır.
 */
import { HIZ_SECENEKLERI } from "../isci/protokol";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import { MERCEKLER, mercekAdi } from "../veri/mercek";
import type { Mercek } from "../veri/mercek";
import { InsaatIzleyici } from "../veri/rozet";
import type { BitenInsaat } from "../veri/rozet";
import { bolgePaneli, hazinePaneli, malIkonu, malPaneli, nedenSatiri, savasPaneli } from "./govde";
import type { GovdeDurumu } from "./govde";
import { dikkatMaddeleri, dikkatPaneli } from "./dikkat";
import { GelenKutusu, gelenOlaylari } from "./gelen-kutusu";
import { baglamKur, devletPaneli, yeniOyunDurumu } from "./komut-govde";
import { komutTanimi } from "../komut/kayit";
import type { Icerik } from "../komut/tablo";
import type { Komut } from "../komut/tipler";
import type { Oneri } from "../isci/protokol";
import { hasatCubuklari, olayPaneli, olaySayisi } from "./tarim-govde";
import { DUNYA_EPOCH_MS, esc, fmt, gercekTarih, kisalt, simGunNo, simSaatMetni, tamTarihMetni, tarihMetni, yuzde } from "./bicim";
import { ikon } from "../tasarim/ikon";
import type { IkonAdi } from "../tasarim/ikon";
import { hasatMetni, takvimDurumu, takvimParametresi } from "../veri/tarim";
import type { MulkPaneli } from "./mulk-paneli";

export type Sekme = "bolge" | "devlet" | "dikkat" | "mal" | "hazine" | "savas" | "olaylar";

/** "Devlet" sekmesi yalnızca oyuncu kipinde görünür. "Dikkat", eski "Darboğaz" sekmesinin yerindedir. */
const SEKMELER: ReadonlyArray<{ id: Sekme; ad: string; ikon: IkonAdi; oyuncu?: boolean }> = [
  { id: "bolge", ad: "Bölge", ikon: "map-pin" },
  { id: "devlet", ad: "Devlet", ikon: "landmark", oyuncu: true },
  { id: "dikkat", ad: "Dikkat", ikon: "triangle-alert" },
  { id: "mal", ad: "Mal", ikon: "package" },
  { id: "hazine", ad: "Hazine", ikon: "wallet" },
  { id: "savas", ad: "Savaş", ikon: "swords" },
  { id: "olaylar", ad: "Olaylar", ikon: "cloud-sun-rain" },
];

/** Görünüm menüsündeki mercek simgeleri. */
const MERCEK_IKON: Record<string, IkonAdi> = { genel: "map", tarim: "wheat", sanayi: "factory", pazar: "store", sahiplik: "layers" };

const sekmeIcerik = (s: { ad: string; ikon: IkonAdi }, n = 0): string => `${ikon(s.ikon, 18)}<span>${s.ad}</span>${n > 0 ? `<span class="sayac">${n}</span>` : ""}`;

export interface PanelGeriCagrilari {
  /** Mercek seç (tek mercek etkin); mal yalnız "mal" merceğinde anlamlı. */
  mercekSec: (m: Mercek, mal: number) => void;
  bolgeSec: (i: number, uc: boolean) => void;
  hiz: (h: number) => void;
  duraklat: (d: boolean) => void;
  kuzey: () => void;
  dunya: () => void;
  tema: () => void;
  /** Oyuncu komutunu işçiye gönderir (sonuç bildirimle gösterilir). */
  komutGonder: (k: Komut) => void;
  /** Form doğrulama hatası (komut gönderilmedi). */
  formHata: (mesaj: string) => void;
  /** Önerilen eylemleri yeniden hesaplat. */
  oneriIste: () => void;
  /** "Devlet seç" katmanını aç. */
  devletSec: () => void;
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

/** Açılır kutular (aynı anda biri açık). */
const ACILIRLAR = [
  ["mercek-dugme", "mercek-menu"],
  ["ayar-dugme", "ayar-menu"],
  ["bilgi-dugme", "bilgi-kutu"],
  ["gelen-dugme", "gelen-menu"],
] as const;

export class Panel {
  sekme: Sekme | string = "bolge";
  /** Mülk kipi içerik sağlayıcısı (harita yığınından); varsa sekmeler, oyuncu düğmesi ve saat ondan gelir. */
  private mulk: MulkPaneli | null = null;
  private durum: GovdeDurumu;
  private hiz = 21600;
  private duraklatildi = false;
  private sonIcerik = "";
  private sonNeden = "";
  private takvimAnahtari = "";
  private izleyici = new InsaatIzleyici();
  private gelen: GelenKutusu;
  /** Bir form alanı odaktayken yapılamayan yeniden çizim bekliyor mu. */
  private bekleyen = false;
  /** İşaretçi panel içinde basılı (tıklama bitmeden DOM değiştirilmez; yoksa tıklama kaybolur). */
  private basiliT = -1e9;

  constructor(
    private g: PanelGeriCagrilari,
    bolgeAd: (i: number) => string,
    atif: string[],
    gecici: boolean,
  ) {
    this.durum = { kare: null, dizin: null, mal: -1, mercek: "genel", bolge: -1, bolgeAd, hazineGecmisi: [], bitenler: this.izleyici.bitenler };
    // sekmeler
    const nav = $("sekmeler");
    this.sekmeleriCiz();
    nav.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-sekme]") as HTMLElement | null;
      if (b) this.sekmeSec(b.dataset["sekme"] as Sekme);
    });
    // ⚙ hata ayıklama: hız düğmeleri ve duraklat
    const hizlar = $("hizlar");
    hizlar.innerHTML = HIZ_SECENEKLERI.map((h) => `<button type="button" data-hiz="${h.hiz}" aria-pressed="${h.hiz === this.hiz}" title="${fmt(h.hiz)} sim-saniye / sn = ${fmt(h.hiz / 3600)} sim-saat / sn">${h.ad.replace("×", "<span class=\"x\">×</span>")}</button>`).join("");
    hizlar.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-hiz]") as HTMLElement | null;
      if (b) this.hizAyarla(Number(b.dataset["hiz"]), true);
    });
    $("duraklat").addEventListener("click", () => this.duraklatAyarla(!this.duraklatildi, true));
    $("kuzey").addEventListener("click", () => this.g.kuzey());
    $("dunya-dugme").addEventListener("click", () => this.g.dunya());
    $("tema").addEventListener("click", () => this.g.tema());
    $("oyuncu-cubuk").addEventListener("click", () => this.sekmeSec(this.mulk ? (this.mulk.sekmeler[0]?.id ?? "") : "devlet"));
    // açılır kutular
    for (const [d, k] of ACILIRLAR) $(d).addEventListener("click", (e) => {
      if (d === "gelen-dugme") return; // gelen kutusu kendi düğmesini yönetir
      e.stopPropagation();
      this.acilirAc(k, $(k).hidden);
    });
    this.gelen = new GelenKutusu($("gelen-dugme"), $("gelen-menu"), (i) => this.g.bolgeSec(i, true));
    $("gelen-dugme").addEventListener("click", () => this.acilirKapat("gelen-menu"));
    document.addEventListener("pointerdown", (e) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".acilir, .acilir-dugme")) this.acilirKapat(null);
    });
    window.addEventListener("keydown", (e) => {
      const etiket = (e.target as HTMLElement).tagName;
      const yazi = ["INPUT", "SELECT", "TEXTAREA"].includes(etiket);
      if (e.key === "Escape") this.acilirKapat(null);
      if (e.code === "Space" && !yazi && etiket !== "BUTTON") {
        e.preventDefault();
        this.duraklatAyarla(!this.duraklatildi, true);
      }
      // 1-5: mercek kısayolları
      if (!yazi && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const m = MERCEKLER.find((x) => x.tus === e.key);
        if (m && (m.id !== "tarim" || this.durum.dizin?.tarim)) this.g.mercekSec(m.id, -1);
      }
    });
    $("mercek-menu").addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const mk = t.closest("[data-mercek]") as HTMLElement | null;
      const ml = t.closest("[data-mal]") as HTMLElement | null;
      if (mk) this.g.mercekSec(mk.dataset["mercek"] as Mercek, -1);
      else if (ml) this.g.mercekSec("mal", Number(ml.dataset["mal"]));
      else return;
      this.acilirKapat(null);
    });
    // içerik olayları (temsilci)
    this.komutOlaylariniBagla();
    $("sekme-icerik").addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (this.mulk?.tikla(t)) {
        const sekme = this.mulk.sekmeIstegi?.();
        if (sekme) this.sekmeSec(sekme);
        return;
      }
      if (this.komutTikla(t)) return;
      const mal = t.closest("[data-mal]") as HTMLElement | null;
      const mercek = t.closest("[data-mercek]") as HTMLElement | null;
      const bolge = t.closest("[data-bolge]") as HTMLElement | null;
      if (mercek) this.g.mercekSec(mercek.dataset["mercek"] as Mercek, -1);
      else if (bolge) {
        if (mal) this.g.mercekSec("mal", Number(mal.dataset["mal"]));
        this.g.bolgeSec(Number(bolge.dataset["bolge"]), true);
      } else if (mal) this.g.mercekSec("mal", Number(mal.dataset["mal"]));
      else if (t.closest("[data-uc]")) this.g.bolgeSec(this.durum.bolge, true);
    });
    // mobil panel tutamacı
    const panel = $("panel");
    $("panel-tutamac").addEventListener("click", () => this.panelKapali(!panel.classList.contains("kapali")));
    if (window.matchMedia("(max-width: 820px)").matches) this.panelKapali(true);
    $("atif").innerHTML =
      atif.map((a) => `<li>${esc(a)}</li>`).join("") +
      (gecici ? "<li><b>Geçici bölge katmanı</b></li>" : "") +
      "<li>Yazı tipi: Inter (SIL Open Font License 1.1) · Simgeler: Lucide (ISC; Feather türevleri MIT)</li>";
    this.mercekDugmesiYaz();
  }

  // --- açılır kutular --------------------------------------------------------------------------

  private acilirAc(kutu: string, ac: boolean): void {
    this.acilirKapat(ac ? kutu : null, true);
    const k = $(kutu);
    k.hidden = !ac;
    const d = ACILIRLAR.find((x) => x[1] === kutu)?.[0];
    if (d) $(d).setAttribute("aria-expanded", String(ac));
    if (ac && kutu === "mercek-menu") this.mercekMenusuCiz();
  }

  /** `haric` dışındaki açılır kutuları kapatır. */
  private acilirKapat(haric: string | null, sessiz = false): void {
    for (const [d, k] of ACILIRLAR) {
      if (k === haric) continue;
      if (k === "gelen-menu") {
        if (!$(k).hidden) this.gelen.ac(false);
        continue;
      }
      $(k).hidden = true;
      $(d).setAttribute("aria-expanded", "false");
    }
    void sessiz;
  }

  // --- sekmeler ve oyuncu kipi -----------------------------------------------------------------

  private sekmeleriCiz(): void {
    const oyuncu = this.durum.oyun !== undefined;
    $("sekmeler").innerHTML = (this.mulk?.sekmeler ?? SEKMELER.filter((s) => oyuncu || !s.oyuncu))
      .map((s) => `<button type="button" role="tab" id="sek-${s.id}" data-sekme="${s.id}" aria-selected="${s.id === this.sekme}">${sekmeIcerik(s)}</button>`)
      .join("");
  }

  /** Oyuncu kipini açar: komut arayüzü durumunu kurar, "Devlet" sekmesini ekler ve ona geçer. */
  oyunuKur(ic: Icerik): void {
    this.durum.oyun = yeniOyunDurumu(ic);
    this.sekme = "devlet";
    this.sekmeleriCiz();
    $("oyuncu-cubuk").hidden = false;
    document.body.classList.add("oyuncu-kipi");
    this.sonIcerik = "";
    this.tazele();
  }

  /**
   * Mülk kipi: panel oyuncunun işletmesini gösterir (bölge, devlet ve savaş sekmeleri yok; öneri motoru kapalı). Bölge kipi
   * bu çağrı olmadan eskisi gibidir.
   */
  mulkKipiKur(p: MulkPaneli): void {
    this.mulk = p;
    this.sekme = p.sekmeler[0]?.id ?? "";
    this.sekmeleriCiz();
    document.body.classList.add("mulk-paneli");
    $("oyuncu-cubuk").setAttribute("aria-label", "İşletmem");
    $("neden-seridi").innerHTML = "";
    this.sonNeden = "";
    p.dinle(() => {
      this.sonIcerik = "";
      this.tazele();
    });
    this.sonIcerik = "";
    this.tazele();
  }

  oneriYaz(liste: Oneri[]): void {
    if (!this.durum.oyun) return;
    this.durum.oyun.oneriler = liste;
    this.sonIcerik = "";
    this.tazele();
  }

  get oyuncuKipi(): boolean {
    return this.durum.oyun !== undefined;
  }

  /** Biten inşaatlar (sahne rozetleri aynı haritayı okur). */
  get bitenler(): ReadonlyMap<number, BitenInsaat> {
    return this.izleyici.bitenler;
  }

  /** Üst çubuktaki devlet düğmesi: devlet adı ve hazine. */
  private oyuncuCubuguYaz(kare: Kare): void {
    const o = kare.oyuncu;
    const d = this.durum.dizin;
    if (!o || !d) return;
    const dev = d.devletler[d.oyuncular[o.idx]?.devlet ?? -1];
    const ad = (dev?.ad ?? "").split(" ")[0] ?? "";
    const hazine = kare.hazine[o.idx] ?? 0;
    const k = $("oyuncu-cubuk");
    const metin = `<i class="nokta" style="background:var(--sen)"></i><span class="ocad">${esc(ad)}</span><b>${kisalt(hazine)}</b>`;
    if (k.innerHTML !== metin) k.innerHTML = metin;
    k.title = `${dev?.ad ?? ""}: hazine ${fmt(hazine)} para. Devlet sekmesini açmak için dokunun.`;
  }

  private get basili(): boolean {
    return performance.now() - this.basiliT < 2500;
  }

  private formOdakta(): boolean {
    const a = document.activeElement;
    return a !== null && a.matches("#sekme-icerik select, #sekme-icerik input");
  }

  /** Bir formun değerlerini oyun durumuna kaydeder (yeniden çizimde korunur). */
  private formKaydet(f: HTMLFormElement): void {
    const oyun = this.durum.oyun;
    if (!oyun) return;
    for (const [ad, v] of new FormData(f).entries()) {
      if (typeof v === "string") oyun.formlar.set(`${f.dataset["kapsam"] ?? "d"}:${f.dataset["form"] ?? ""}:${ad}`, v);
    }
  }

  /**
   * Dikkat panelindeki önerilen komut: formu ön doldurup bölgenin komut bölümünde açar (değerleri oyuncu onaylar).
   * `{ id, bolge, degerler }`.
   */
  formAc(id: string, bolge: number, degerler: Record<string, string>): void {
    const oyun = this.durum.oyun;
    if (!oyun) return;
    for (const [ad, v] of Object.entries(degerler)) oyun.formlar.set(`${bolge}:${id}:${ad}`, v);
    oyun.acik.add(id);
    this.g.bolgeSec(bolge, true);
    this.sekmeSec("bolge");
    window.setTimeout(() => {
      const f = document.querySelector(`#sekme-icerik form[data-form="${id}"]`);
      f?.closest("details")?.scrollIntoView({ block: "nearest" });
    }, 0);
  }

  /** Komut düğmelerine (veri öznitelikli) tıklama; işlendiyse true. */
  private komutTikla(t: HTMLElement): boolean {
    const km = t.closest("[data-komut]") as HTMLElement | null;
    if (km) {
      this.g.komutGonder(JSON.parse(km.dataset["komut"] ?? "null") as Komut);
      return true;
    }
    const fa = t.closest("[data-form-ac]") as HTMLElement | null;
    if (fa) {
      const f = JSON.parse(fa.dataset["formAc"] ?? "null") as { id: string; bolge: number; degerler: Record<string, string> } | null;
      if (f) this.formAc(f.id, f.bolge, f.degerler);
      return true;
    }
    const on = t.closest("[data-oneri]") as HTMLElement | null;
    if (on) {
      const o = this.durum.oyun?.oneriler?.[Number(on.dataset["oneri"])];
      if (o) this.g.komutGonder(o.komut);
      return true;
    }
    if (t.closest("[data-oneri-yenile]")) {
      this.g.oneriIste();
      return true;
    }
    if (t.closest("[data-devlet-sec]")) {
      this.g.devletSec();
      return true;
    }
    return false;
  }

  private komutOlaylariniBagla(): void {
    const kap = $("sekme-icerik");
    kap.addEventListener("pointerdown", () => {
      this.basiliT = performance.now();
    });
    const birak = (): void => {
      window.setTimeout(() => {
        this.basiliT = -1e9;
        if (this.bekleyen && !this.formOdakta()) {
          this.bekleyen = false;
          this.sonIcerik = "";
          this.tazele();
        }
      }, 30);
    };
    window.addEventListener("pointerup", birak);
    window.addEventListener("pointercancel", birak);
    kap.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = (e.target as HTMLElement).closest("form.komut-form") as HTMLFormElement | null;
      const b = baglamKur(this.durum);
      const t = f ? komutTanimi(f.dataset["form"] ?? "") : undefined;
      if (!f || !b || !t) return;
      const kapsam = f.dataset["kapsam"] ?? "d";
      const g = Object.fromEntries([...new FormData(f).entries()].flatMap(([k, v]): Array<[string, string]> => (typeof v === "string" ? [[k, v]] : [])));
      const k = t.komut({ ...b, bolge: kapsam === "d" ? b.bolge : Number(kapsam) }, g);
      if (typeof k === "string") this.g.formHata(k);
      else this.g.komutGonder(k);
    });
    kap.addEventListener("change", (e) => {
      const f = (e.target as HTMLElement).closest("form.komut-form") as HTMLFormElement | null;
      if (!f) return;
      this.formKaydet(f);
      this.sonIcerik = "";
      this.icerikCiz(!this.basili || (e.target as HTMLElement).tagName === "SELECT");
    });
    kap.addEventListener("input", (e) => {
      const el = e.target as HTMLInputElement;
      const f = el.closest("form.komut-form") as HTMLFormElement | null;
      if (!f) return;
      this.formKaydet(f);
      if (el.type === "range" && el.nextElementSibling) el.nextElementSibling.textContent = yuzde(Number(el.value));
    });
    kap.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (this.bekleyen && !this.formOdakta()) {
          this.bekleyen = false;
          this.sonIcerik = "";
          this.tazele();
        }
      }, 0);
    });
  }

  private panelKapali(k: boolean): void {
    $("panel").classList.toggle("kapali", k);
    document.body.classList.toggle("panel-kapali", k);
  }

  sekmeSec(s: Sekme | string): void {
    this.sekme = s;
    for (const b of document.querySelectorAll<HTMLElement>("#sekmeler button")) b.setAttribute("aria-selected", String(b.dataset["sekme"] === s));
    this.sonIcerik = "";
    this.icerikCiz(true);
    if (window.matchMedia("(max-width: 820px)").matches) this.panelKapali(false);
  }

  // --- zaman (⚙ menüsü) ve takvim --------------------------------------------------------------

  hizAyarla(h: number, bildir: boolean): void {
    this.hiz = h;
    for (const b of document.querySelectorAll<HTMLElement>("#hizlar button")) b.setAttribute("aria-pressed", String(Number(b.dataset["hiz"]) === h));
    if (bildir) this.g.hiz(h);
  }

  duraklatAyarla(d: boolean, bildir: boolean): void {
    this.duraklatildi = d;
    const b = $("duraklat");
    b.setAttribute("aria-pressed", String(d));
    b.innerHTML = d ? `${ikon("play", 16)} Sürdür` : `${ikon("pause", 16)} Duraklat`;
    b.setAttribute("aria-label", d ? "Sürdür" : "Duraklat");
    $("duraklama-isareti").hidden = !d;
    if (bildir) this.g.duraklat(d);
  }

  zamanYaz(simSaat: number, gerideMi: boolean): void {
    // Mülk kipinde saat ve tarih sunucunun dünyasından (mutlak saat); küredeki bölge simülasyonundan değil
    simSaat = this.mulk?.simSaat() ?? simSaat;
    const t = simSaatMetni(simSaat);
    // Sade saat (SS:DD): tarih çubukta zaten gerçek takvimden; "Gün N" yalnız ipucunda. Saat tarihin altındaki satırda (#takvim-saat);
    // #zaman yalnız takvim yokken (tarım verisi gelmeden) görünür.
    for (const id of ["zaman", "takvim-saat"]) {
      const z = $(id);
      if (z.textContent !== t) z.textContent = t;
    }
    $("geride").hidden = !gerideMi;
    this.takvimYaz(simSaat);
  }

  /**
   * Üst çubuk: gerçek tarih (Türkiye saati; dünya duvar saatine bağlı, epoch + t) ve iklim dönemi göstergesi (hasat ritmi;
   * ay çekirdeğin iklim takviminden). Dini bayramlar burada gösterilmez (yalnız hatırlatma takviminde, istek üzerine).
   */
  private takvimYaz(simSaat: number): void {
    const tarim = this.durum.dizin?.tarim;
    const kap = $("takvim");
    if (!tarim) {
      kap.hidden = true;
      return;
    }
    const d = takvimDurumu(simSaat, takvimParametresi(tarim));
    const g = gercekTarih(simSaat, this.mulk?.epochMs() ?? DUNYA_EPOCH_MS);
    const anahtar = `${d.mutlakGun}|${g.yil}-${g.ay}-${g.gun}`;
    if (anahtar === this.takvimAnahtari) return;
    this.takvimAnahtari = anahtar;
    kap.hidden = false;
    const aylik = tarim.hasatAylik[d.ay] ?? 1000;
    $("takvim-gun").textContent = tarihMetni(g);
    $("takvim-yil").textContent = g.gunAdi;
    $("hasat-yuzde").textContent = hasatMetni(aylik);
    $("hasat").innerHTML = hasatCubuklari(tarim.hasatAylik, d.ay, false);
    kap.title = `${tamTarihMetni(g)} (Türkiye saati; oyunun ${simGunNo(simSaat)}. günü). İklim dönemi: ${d.ayAdi}; bu ayın ortalama hasat oranı ${hasatMetni(aylik)} (yıllık ortalama %100). Ayrıntı için Olaylar sekmesi.`;
  }

  // --- mercek ----------------------------------------------------------------------------------

  /** Dizin gelince mercek menüsünü kurar. */
  dizinKur(d: Dizin): void {
    this.durum.dizin = d;
    this.durum.hazineGecmisi = d.oyuncular.map(() => []);
    this.mercekDugmesiYaz();
  }

  private mercekDugmesiYaz(): void {
    const m = this.durum.mercek ?? "genel";
    const d = this.durum.dizin;
    const malSimge = m === "mal" && d ? malIkonu(d, this.durum.mal, 12) : "";
    $("mercek-dugme").innerHTML = `${ikon(m === "mal" ? "package" : (MERCEK_IKON[m] ?? "layers"), 18)}<span class="soluk">Görünüm</span>${malSimge}<b>${esc(mercekAdi(m, d, this.durum.mal))}</b>${ikon("chevron-down", 16)}`;
    if (!$("mercek-menu").hidden) this.mercekMenusuCiz();
  }

  private mercekMenusuCiz(): void {
    const d = this.durum.dizin;
    const m = this.durum.mercek ?? "genel";
    let s = `<div class="acilir-baslik"><b>Görünüm</b><span class="soluk">tek mercek · 1–5</span></div><div class="mercek-liste" role="group" aria-label="Mercekler">`;
    for (const x of MERCEKLER) {
      if (x.id === "tarim" && !d?.tarim) continue;
      s += `<button type="button" class="mercek-secenek" data-mercek="${x.id}" aria-pressed="${m === x.id}">${ikon(MERCEK_IKON[x.id] ?? "layers", 20)}<span><b>${esc(x.ad)}</b><br><span class="soluk">${esc(x.aciklama)}</span></span><span class="tus" aria-hidden="true">${x.tus}</span></button>`;
    }
    s += `</div>`;
    if (d) {
      s += `<div class="acilir-baslik"><b>Mal</b><span class="soluk">tedarik durumu</span></div><div class="mal-izgara" role="group" aria-label="Mal seçici">`;
      s += d.mallar.map((x, i) => `<button type="button" class="mal-cip" data-mal="${i}" aria-pressed="${m === "mal" && this.durum.mal === i}">${malIkonu(d, i, 11)}${esc(x.ad)}</button>`).join("");
      s += `</div>`;
    }
    $("mercek-menu").innerHTML = s;
  }

  /** Mercek değişti (sahne zaten güncellendi): düğme, menü ve paneller. */
  mercekAyarla(m: Mercek, mal: number): void {
    this.durum.mercek = m;
    this.durum.mal = m === "mal" ? mal : -1;
    this.mercekDugmesiYaz();
    this.sonIcerik = "";
    this.tazele();
  }

  get mercek(): Mercek {
    return this.durum.mercek ?? "genel";
  }

  // --- kare ------------------------------------------------------------------------------------

  kareYaz(kare: Kare): void {
    const onceki = this.durum.kare;
    this.durum.kare = kare;
    const yeni = this.izleyici.guncelle(kare);
    const d = this.durum.dizin;
    // Mülk kipinde küredeki bölge simülasyonu yalnız arka plandır: olayları bildirim kutusuna düşmez
    if (d && !this.mulk) this.gelen.ekle(gelenOlaylari(onceki, kare, d, this.durum.oyun && kare.oyuncu ? kare.oyuncu.idx : -1, yeni, this.durum.bolgeAd));
    if (this.durum.oyun) this.oyuncuCubuguYaz(kare);
    const gec = this.durum.hazineGecmisi;
    kare.hazine.forEach((h, i) => {
      const a = gec[i] ?? (gec[i] = []);
      if (a.length === 0 || kare.saat !== (this.sonKareSaat ?? -1)) a.push(h);
      if (a.length > 160) a.shift();
    });
    this.sonKareSaat = kare.saat;
    this.tazele();
  }
  private sonKareSaat: number | null = null;

  bolgeAyarla(i: number): void {
    this.durum.bolge = i;
    if (i >= 0 && this.sekme !== "bolge" && !this.mulk) this.sekmeSec("bolge");
    this.sonIcerik = "";
    this.tazele();
  }

  get secili(): number {
    return this.durum.bolge;
  }

  get govdeDurumu(): GovdeDurumu {
    return this.durum;
  }

  adlarDegisti(): void {
    this.sonIcerik = "";
    this.tazele();
  }

  private tazele(): void {
    this.icerikCiz();
    this.sayaclariYaz();
    if (this.mulk) {
      // Harita açıkken küre çizilmez (zamanYaz çağrılmaz): saat ve tarih sunucunun zamanından burada tazelenir
      this.zamanYaz(0, false);
      const c = this.mulk.cubuk();
      const k = $("oyuncu-cubuk");
      k.hidden = !c;
      if (c && k.innerHTML !== c.html) k.innerHTML = c.html;
      if (c) k.title = c.baslik;
      return;
    }
    const n = nedenSatiri(this.durum);
    if (n !== this.sonNeden) {
      this.sonNeden = n;
      $("neden-seridi").innerHTML = n;
    }
  }

  /** Sekme etiketlerindeki sayı rozetleri: Dikkat (madde) ve Olaylar (etkin + uyarıdaki olay). */
  private sayaclariYaz(): void {
    if (this.mulk) {
      for (const s of this.mulk.sekmeler) {
        const b = document.getElementById(`sek-${s.id}`);
        const metin = sekmeIcerik(s, this.mulk.sayac(s.id));
        if (b && b.innerHTML !== metin) b.innerHTML = metin;
      }
      return;
    }
    const yaz = (id: string, ad: string, n: number): void => {
      const b = document.getElementById(id);
      if (!b) return;
      const s = SEKMELER.find((x) => x.ad === ad);
      if (!s) return;
      const metin = sekmeIcerik(s, n);
      if (b.innerHTML !== metin) b.innerHTML = metin;
    };
    yaz("sek-olaylar", "Olaylar", olaySayisi(this.durum));
    yaz("sek-dikkat", "Dikkat", Math.min(5, dikkatMaddeleri(this.durum).length));
  }

  private icerikCiz(zorla = false): void {
    // Bir form alanı (seçim/sayı) odaktayken yeniden çizim, açık listeyi ve imleci bozar: bırakınca çizilir.
    if (!zorla && (this.formOdakta() || this.basili)) {
      this.bekleyen = true;
      return;
    }
    const d = this.durum;
    let h = "";
    if (this.mulk) h = this.mulk.icerik(this.sekme, d);
    else switch (this.sekme) {
      case "bolge":
        h = bolgePaneli(d);
        break;
      case "dikkat":
        h = dikkatPaneli(d);
        break;
      case "mal":
        h = malPaneli(d);
        break;
      case "hazine":
        h = hazinePaneli(d);
        break;
      case "savas":
        h = savasPaneli(d);
        break;
      case "olaylar":
        h = olayPaneli(d);
        break;
      case "devlet":
        h = devletPaneli(d);
        break;
    }
    if (h === this.sonIcerik) return;
    this.sonIcerik = h;
    const kap = $("sekme-icerik");
    const ust = kap.scrollTop;
    // Açık/kapalı bölümleri yeniden çizmeden önce gerçek DOM'dan oku (toggle olayına güvenme: gecikebilir).
    const acik = this.durum.oyun?.acik;
    if (acik) {
      for (const dt of kap.querySelectorAll<HTMLDetailsElement>("details.komut")) {
        const ad = dt.dataset["ac"];
        if (!ad) continue;
        if (dt.open) acik.add(ad);
        else acik.delete(ad);
      }
    }
    kap.innerHTML = h;
    kap.scrollTop = ust;
  }
}

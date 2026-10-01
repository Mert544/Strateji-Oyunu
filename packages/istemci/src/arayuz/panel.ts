/**
 * Arayüz denetleyicisi: üst çubuk (zaman, hız, duraklat, tema), mal çubuğu, panel sekmeleri ve "neden" şeridi.
 * İçerik üreticileri govde.ts'de saftır; burada yalnızca DOM bağlama ve olay yönlendirme vardır.
 */
import { HIZ_SECENEKLERI } from "../isci/protokol";
import { simSaatMetni } from "../kure/gunes";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import { bolgePaneli, darbogazPaneli, hazinePaneli, malIkonu, malPaneli, nedenSatiri, savasPaneli } from "./govde";
import type { GovdeDurumu } from "./govde";
import { esc } from "./bicim";

export type Sekme = "bolge" | "mal" | "hazine" | "darbogaz" | "savas";

const SEKMELER: ReadonlyArray<{ id: Sekme; ad: string }> = [
  { id: "bolge", ad: "Bölge" },
  { id: "mal", ad: "Mal" },
  { id: "hazine", ad: "Hazine" },
  { id: "darbogaz", ad: "Darboğaz" },
  { id: "savas", ad: "Savaş" },
];

export interface PanelGeriCagrilari {
  malSec: (m: number) => void;
  bolgeSec: (i: number, uc: boolean) => void;
  kenareUc: (k: number) => void;
  hiz: (h: number) => void;
  duraklat: (d: boolean) => void;
  kuzey: () => void;
  dunya: () => void;
  tema: () => void;
}

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export class Panel {
  sekme: Sekme = "bolge";
  private durum: GovdeDurumu;
  private hiz = 21600;
  private duraklatildi = false;
  private sonIcerik = "";
  private sonNeden = "";
  private malCubuguDizin: Dizin | null = null;

  constructor(
    private g: PanelGeriCagrilari,
    bolgeAd: (i: number) => string,
    atif: string[],
    gecici: boolean,
  ) {
    this.durum = { kare: null, dizin: null, mal: -1, bolge: -1, bolgeAd, hazineGecmisi: [] };
    // sekmeler
    const nav = $("sekmeler");
    nav.innerHTML = SEKMELER.map((s) => `<button type="button" role="tab" id="sek-${s.id}" data-sekme="${s.id}" aria-selected="${s.id === this.sekme}">${s.ad}</button>`).join("");
    nav.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-sekme]") as HTMLElement | null;
      if (b) this.sekmeSec(b.dataset["sekme"] as Sekme);
    });
    // hız düğmeleri
    const hizlar = $("hizlar");
    hizlar.innerHTML = HIZ_SECENEKLERI.map((h) => `<button type="button" data-hiz="${h.hiz}" aria-pressed="${h.hiz === this.hiz}" title="${h.hiz} sim-saniye / sn = ${h.hiz / 3600} sim-saat / sn">${h.ad.replace("×", "<span class=\"x\">×</span>")}</button>`).join("");
    hizlar.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-hiz]") as HTMLElement | null;
      if (b) this.hizAyarla(Number(b.dataset["hiz"]), true);
    });
    $("duraklat").addEventListener("click", () => this.duraklatAyarla(!this.duraklatildi, true));
    $("kuzey").addEventListener("click", () => this.g.kuzey());
    $("dunya-dugme").addEventListener("click", () => this.g.dunya());
    $("tema").addEventListener("click", () => this.g.tema());
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        this.duraklatAyarla(!this.duraklatildi, true);
      }
    });
    // içerik olayları (temsilci)
    $("sekme-icerik").addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const mal = t.closest("[data-mal]") as HTMLElement | null;
      const bolge = t.closest("[data-bolge]") as HTMLElement | null;
      const kenar = t.closest("[data-kenar]") as HTMLElement | null;
      if (kenar) this.g.kenareUc(Number(kenar.dataset["kenar"]));
      else if (bolge) {
        if (mal) this.g.malSec(Number(mal.dataset["mal"]));
        this.g.bolgeSec(Number(bolge.dataset["bolge"]), true);
      } else if (mal) this.g.malSec(Number(mal.dataset["mal"]));
      else if (t.closest("[data-uc]")) this.g.bolgeSec(this.durum.bolge, true);
    });
    $("mal-cubugu").addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("[data-mal]") as HTMLElement | null;
      if (b) this.g.malSec(Number(b.dataset["mal"]));
    });
    // mobil panel tutamacı
    const panel = $("panel");
    $("panel-tutamac").addEventListener("click", () => this.panelKapali(!panel.classList.contains("kapali")));
    if (window.matchMedia("(max-width: 820px)").matches) this.panelKapali(true);
    $("panel-atif").innerHTML = atif.map(esc).join(" · ") + (gecici ? " · <b>geçici bölge katmanı</b>" : "");
  }

  private panelKapali(k: boolean): void {
    $("panel").classList.toggle("kapali", k);
    document.body.classList.toggle("panel-kapali", k);
  }

  sekmeSec(s: Sekme): void {
    this.sekme = s;
    for (const b of document.querySelectorAll<HTMLElement>("#sekmeler button")) b.setAttribute("aria-selected", String(b.dataset["sekme"] === s));
    this.sonIcerik = "";
    this.icerikCiz();
    if (window.matchMedia("(max-width: 820px)").matches) this.panelKapali(false);
  }

  hizAyarla(h: number, bildir: boolean): void {
    this.hiz = h;
    for (const b of document.querySelectorAll<HTMLElement>("#hizlar button")) b.setAttribute("aria-pressed", String(Number(b.dataset["hiz"]) === h));
    if (bildir) this.g.hiz(h);
  }

  duraklatAyarla(d: boolean, bildir: boolean): void {
    this.duraklatildi = d;
    const b = $("duraklat");
    b.setAttribute("aria-pressed", String(d));
    b.textContent = d ? "▶" : "⏸";
    b.setAttribute("aria-label", d ? "Sürdür" : "Duraklat");
    if (bildir) this.g.duraklat(d);
  }

  zamanYaz(simSaat: number, gerideMi: boolean): void {
    const t = simSaatMetni(simSaat);
    const z = $("zaman");
    if (z.textContent !== t) z.textContent = t;
    $("geride").hidden = !gerideMi;
  }

  /** Dizin gelince mal çubuğunu kurar. */
  dizinKur(d: Dizin): void {
    this.durum.dizin = d;
    this.durum.hazineGecmisi = d.oyuncular.map(() => []);
    this.malCubuguDizin = d;
    this.malCubuguCiz();
  }

  private malCubuguCiz(): void {
    const d = this.malCubuguDizin;
    if (!d) return;
    const hepsi = `<button type="button" class="mal-cip" data-mal="-1" aria-pressed="${this.durum.mal < 0}">Hepsi</button>`;
    $("mal-cubugu").innerHTML = hepsi + d.mallar.map((m, i) => `<button type="button" class="mal-cip" data-mal="${i}" aria-pressed="${this.durum.mal === i}">${malIkonu(d, i, 11)}${esc(m.ad)}</button>`).join("");
  }

  kareYaz(kare: Kare): void {
    this.durum.kare = kare;
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

  malAyarla(m: number): void {
    this.durum.mal = m;
    this.malCubuguCiz();
    this.sonIcerik = "";
    this.tazele();
  }

  bolgeAyarla(i: number): void {
    this.durum.bolge = i;
    if (i >= 0 && this.sekme !== "bolge") this.sekmeSec("bolge");
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
    const n = nedenSatiri(this.durum);
    if (n !== this.sonNeden) {
      this.sonNeden = n;
      $("neden-seridi").innerHTML = n;
    }
  }

  private icerikCiz(): void {
    const d = this.durum;
    let h = "";
    switch (this.sekme) {
      case "bolge":
        h = bolgePaneli(d);
        break;
      case "mal":
        h = malPaneli(d);
        break;
      case "hazine":
        h = hazinePaneli(d);
        break;
      case "darbogaz":
        h = darbogazPaneli(d);
        break;
      case "savas":
        h = savasPaneli(d);
        break;
    }
    if (h === this.sonIcerik) return;
    this.sonIcerik = h;
    const kap = $("sekme-icerik");
    const ust = kap.scrollTop;
    kap.innerHTML = h;
    kap.scrollTop = ust;
  }
}

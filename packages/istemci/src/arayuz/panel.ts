/**
 * Arayüz denetleyicisi: üst çubuk (zaman, hız, duraklat, tema), mal çubuğu, panel sekmeleri ve "neden" şeridi.
 * İçerik üreticileri govde.ts'de saftır; burada yalnızca DOM bağlama ve olay yönlendirme vardır.
 */
import { HIZ_SECENEKLERI } from "../isci/protokol";
import { simSaatMetni } from "../kure/gunes";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import { bolgePaneli, darbogazPaneli, hazinePaneli, malIkonu, malPaneli, nedenSatiri, savasPaneli, yaprakIkonu } from "./govde";
import type { GovdeDurumu } from "./govde";
import { hasatCubuklari, olayPaneli, olaySayisi } from "./tarim-govde";
import { esc } from "./bicim";
import { hasatMetni, takvimDurumu, takvimMetni, takvimParametresi } from "../veri/tarim";

export type Sekme = "bolge" | "mal" | "hazine" | "darbogaz" | "savas" | "olaylar";

const SEKMELER: ReadonlyArray<{ id: Sekme; ad: string }> = [
  { id: "bolge", ad: "Bölge" },
  { id: "mal", ad: "Mal" },
  { id: "hazine", ad: "Hazine" },
  { id: "darbogaz", ad: "Darboğaz" },
  { id: "savas", ad: "Savaş" },
  { id: "olaylar", ad: "Olaylar" },
];

export interface PanelGeriCagrilari {
  malSec: (m: number) => void;
  bolgeSec: (i: number, uc: boolean) => void;
  kenareUc: (k: number) => void;
  /** "Tarım" harita görünümünü aç/kapat. */
  tarimGorunum: (a: boolean) => void;
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
  private takvimAnahtari = "";

  constructor(
    private g: PanelGeriCagrilari,
    bolgeAd: (i: number) => string,
    atif: string[],
    gecici: boolean,
  ) {
    this.durum = { kare: null, dizin: null, mal: -1, tarimGorunumu: false, bolge: -1, bolgeAd, hazineGecmisi: [] };
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
      if (t.closest("[data-gorunum]")) this.g.tarimGorunum(!this.durum.tarimGorunumu);
      else if (kenar) this.g.kenareUc(Number(kenar.dataset["kenar"]));
      else if (bolge) {
        if (mal) this.g.malSec(Number(mal.dataset["mal"]));
        this.g.bolgeSec(Number(bolge.dataset["bolge"]), true);
      } else if (mal) this.g.malSec(Number(mal.dataset["mal"]));
      else if (t.closest("[data-uc]")) this.g.bolgeSec(this.durum.bolge, true);
    });
    $("mal-cubugu").addEventListener("click", (e) => {
      const el = e.target as HTMLElement;
      if (el.closest("[data-gorunum]")) {
        this.g.tarimGorunum(!this.durum.tarimGorunumu);
        return;
      }
      const b = el.closest("[data-mal]") as HTMLElement | null;
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
    this.takvimYaz(simSaat);
  }

  /** Üst çubuktaki iklim takvimi: tarih, ay adı ve hasat ritmi göstergesi (tarım kapalıysa gizli). */
  private takvimYaz(simSaat: number): void {
    const tarim = this.durum.dizin?.tarim;
    const kap = $("takvim");
    if (!tarim) {
      kap.hidden = true;
      return;
    }
    const d = takvimDurumu(simSaat, takvimParametresi(tarim));
    const anahtar = `${d.mutlakGun}`;
    if (anahtar === this.takvimAnahtari) return;
    this.takvimAnahtari = anahtar;
    kap.hidden = false;
    const aylik = tarim.hasatAylik[d.ay] ?? 1000;
    $("takvim-gun").textContent = takvimMetni(d);
    $("takvim-yil").textContent = `${d.yil}. yıl`;
    $("hasat-yuzde").textContent = hasatMetni(aylik);
    $("hasat").innerHTML = hasatCubuklari(tarim.hasatAylik, d.ay, false);
    kap.title = `İklim takvimi: ${d.ayAdi}. Bu ayın ortalama hasat oranı ${hasatMetni(aylik)} (yıllık ortalama %100). Ayrıntı için Olaylar sekmesi.`;
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
    const tg = this.durum.tarimGorunumu;
    const hepsi = `<button type="button" class="mal-cip" data-mal="-1" aria-pressed="${this.durum.mal < 0 && !tg}">Hepsi</button>`;
    const tarim = d.tarim ? `<button type="button" class="mal-cip tarim-cip" data-gorunum="tarim" aria-pressed="${tg}" title="Tarım görünümü: toprak verimliliği ve ekim deseni">${yaprakIkonu(12)}Tarım</button>` : "";
    $("mal-cubugu").innerHTML = hepsi + tarim + d.mallar.map((m, i) => `<button type="button" class="mal-cip" data-mal="${i}" aria-pressed="${this.durum.mal === i && !tg}">${malIkonu(d, i, 11)}${esc(m.ad)}</button>`).join("");
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
    this.durum.tarimGorunumu = false;
    this.malCubuguCiz();
    this.sonIcerik = "";
    this.tazele();
  }

  /** "Tarım" görünümünü açar/kapatır (mal seçimi sıfırlanır). */
  tarimGorunumAyarla(a: boolean): void {
    this.durum.tarimGorunumu = a;
    if (a) this.durum.mal = -1;
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
    this.olaySayaciniYaz();
    const n = nedenSatiri(this.durum);
    if (n !== this.sonNeden) {
      this.sonNeden = n;
      $("neden-seridi").innerHTML = n;
    }
  }

  /** "Olaylar" sekme etiketindeki sayı rozeti (etkin + uyarıdaki olay). */
  private olaySayaciniYaz(): void {
    const b = document.getElementById("sek-olaylar");
    if (!b) return;
    const n = olaySayisi(this.durum);
    const metin = n > 0 ? `Olaylar <span class="sayac">${n}</span>` : "Olaylar";
    if (b.innerHTML !== metin) b.innerHTML = metin;
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
      case "olaylar":
        h = olayPaneli(d);
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

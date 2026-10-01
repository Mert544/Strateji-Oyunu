/**
 * Arayüz denetleyicisi: üst çubuk (zaman, hız, duraklat, tema), mal çubuğu, panel sekmeleri ve "neden" şeridi.
 * İçerik üreticileri govde.ts'de saftır; burada yalnızca DOM bağlama ve olay yönlendirme vardır.
 */
import { HIZ_SECENEKLERI } from "../isci/protokol";
import { simSaatMetni } from "../kure/gunes";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import { bolgePaneli, darbogazPaneli, hazinePaneli, malIkonu, malPaneli, nedenSatiri, savasPaneli, yaprakIkonu } from "./govde";
import type { GovdeDurumu } from "./govde";
import { baglamKur, devletPaneli, yeniOyunDurumu } from "./komut-govde";
import { komutTanimi } from "../komut/kayit";
import type { Icerik } from "../komut/tablo";
import type { Komut } from "../komut/tipler";
import type { Oneri } from "../isci/protokol";
import { hasatCubuklari, olayPaneli, olaySayisi } from "./tarim-govde";
import { esc, kisalt } from "./bicim";
import { hasatMetni, takvimDurumu, takvimMetni, takvimParametresi } from "../veri/tarim";

export type Sekme = "bolge" | "mal" | "hazine" | "darbogaz" | "savas" | "olaylar" | "devlet";

/** "Devlet" sekmesi yalnızca oyuncu kipinde görünür. */
const SEKMELER: ReadonlyArray<{ id: Sekme; ad: string; oyuncu?: boolean }> = [
  { id: "bolge", ad: "Bölge" },
  { id: "devlet", ad: "Devlet", oyuncu: true },
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

export class Panel {
  sekme: Sekme = "bolge";
  private durum: GovdeDurumu;
  private hiz = 21600;
  private duraklatildi = false;
  private sonIcerik = "";
  private sonNeden = "";
  private malCubuguDizin: Dizin | null = null;
  private takvimAnahtari = "";
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
    this.durum = { kare: null, dizin: null, mal: -1, tarimGorunumu: false, bolge: -1, bolgeAd, hazineGecmisi: [] };
    // sekmeler
    const nav = $("sekmeler");
    this.sekmeleriCiz();
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
    $("oyuncu-cubuk").addEventListener("click", () => this.sekmeSec("devlet"));
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        this.duraklatAyarla(!this.duraklatildi, true);
      }
    });
    // içerik olayları (temsilci)
    this.komutOlaylariniBagla();
    $("sekme-icerik").addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (this.komutTikla(t)) return;
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

  private sekmeleriCiz(): void {
    const oyuncu = this.durum.oyun !== undefined;
    $("sekmeler").innerHTML = SEKMELER.filter((s) => oyuncu || !s.oyuncu)
      .map((s) => `<button type="button" role="tab" id="sek-${s.id}" data-sekme="${s.id}" aria-selected="${s.id === this.sekme}">${s.ad}</button>`)
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

  oneriYaz(liste: Oneri[]): void {
    if (!this.durum.oyun) return;
    this.durum.oyun.oneriler = liste;
    this.sonIcerik = "";
    this.tazele();
  }

  get oyuncuKipi(): boolean {
    return this.durum.oyun !== undefined;
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
    const metin = `<i class="nokta" style="background:var(--d${o.idx % 4})"></i><span class="ocad">${esc(ad)}</span><b>${kisalt(hazine)}</b>`;
    if (k.innerHTML !== metin) k.innerHTML = metin;
    k.title = `${dev?.ad ?? ""}: hazine ${hazine.toLocaleString("tr-TR")} para. Devlet sekmesini açmak için dokunun.`;
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

  /** Komut düğmelerine (veri öznitelikli) tıklama; işlendiyse true. */
  private komutTikla(t: HTMLElement): boolean {
    const km = t.closest("[data-komut]") as HTMLElement | null;
    if (km) {
      this.g.komutGonder(JSON.parse(km.dataset["komut"] ?? "null") as Komut);
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
      if (el.type === "range" && el.nextElementSibling) el.nextElementSibling.textContent = `%${el.value}`;
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

  sekmeSec(s: Sekme): void {
    this.sekme = s;
    for (const b of document.querySelectorAll<HTMLElement>("#sekmeler button")) b.setAttribute("aria-selected", String(b.dataset["sekme"] === s));
    this.sonIcerik = "";
    this.icerikCiz(true);
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

  private icerikCiz(zorla = false): void {
    // Bir form alanı (seçim/sayı) odaktayken yeniden çizim, açık listeyi ve imleci bozar: bırakınca çizilir.
    if (!zorla && (this.formOdakta() || this.basili)) {
      this.bekleyen = true;
      return;
    }
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

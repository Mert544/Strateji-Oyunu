/** Mülk oyuncusunun mevcut araştırma motoruna erişimi; durum her çizimde sunucudan okunur. */
import { carpBol, PPM } from "@bolge/cekirdek";
import { esc, paraMili, sureMetni } from "../arayuz/bicim";
import type { Icerik, TeknolojiT } from "../komut/tablo";
import { ikon } from "../tasarim/ikon";
import type { IsletmeDurumu, IsletmeYapisi } from "./baglanti";
import { teknolojiEtkiGorunumuHtml } from "./teknoloji-etki-gorunum";
import "./teknoloji-etki-gorunum.css";

const SAAT = 3_600_000;

export interface TeknolojiDurumu {
  simZamani: number;
  acik: ReadonlySet<string>;
  arastirma: { teknoloji: string; bitis: number } | null;
  yayilimPpm?: ReadonlyMap<string, number>;
  erkenOyunPpm: number;
  hazineMili: number;
}
export type ArastirmaSonucu = { tamam: true } | { tamam: false; mesaj: string };
export interface TeknolojiPanelParam {
  ic: Icerik;
  durum: () => TeknolojiDurumu | null;
  isletme?: () => IsletmeDurumu | null;
  tesisAdi?: (tesis: IsletmeYapisi) => string;
  yontemDestegi?: boolean;
  komut: (teknoloji: string, maliyetMili?: number) => Promise<ArastirmaSonucu>;
  degisti: () => void;
}
export interface ArastirmaIstegi { teknoloji: string; maliyetMili: number }
export interface TeknolojiTesisEylemi { teknoloji: string; tesis: string; yontem: string }
function tesisEylemiOku(t: HTMLElement): TeknolojiTesisEylemi | null {
  const b = t.closest<HTMLButtonElement>("button[data-teknoloji-tesis]");
  if (!b || b.disabled) return null;
  const teknoloji = b.dataset["teknoloji"], tesis = b.dataset["teknolojiTesis"], yontem = b.dataset["teknolojiYontem"];
  return teknoloji && tesis && yontem ? { teknoloji, tesis, yontem } : null;
}
function arastirmaIstegiOku(t: HTMLElement): ArastirmaIstegi | null {
  const b = t.closest<HTMLButtonElement>("button[data-teknoloji-baslat]");
  if (!b || b.disabled) return null;
  const teknoloji = b.dataset["teknolojiBaslat"], metin = b.dataset["maliyetMili"];
  if (!teknoloji || metin === undefined || !/^\d+$/.test(metin)) return null;
  const maliyetMili = Number(metin);
  return Number.isSafeInteger(maliyetMili) && maliyetMili >= 0 ? { teknoloji, maliyetMili } : null;
}

/** Yayılım + erken oyun süresi çekirdeğin tamsayı işlemi ve bir dakika tabanıyla aynı sırada. */
export function arastirmaTeklifi(t: TeknolojiT, d: TeknolojiDurumu): { maliyet: number; sureMs: number } | null {
  const yayilim = d.yayilimPpm?.get(t.id);
  if (yayilim === undefined) return null;
  const normal = carpBol(t.sureGun * 24 * SAAT, yayilim, PPM);
  return {
    maliyet: carpBol(t.maliyet, yayilim, PPM),
    sureMs: Math.max(Math.min(normal, 60_000), carpBol(normal, d.erkenOyunPpm, PPM)),
  };
}

export class TeknolojiPaneli {
  private gonderiliyor = false;
  private sonuc = "";
  private hata = false;
  private gorulenTeklif: ArastirmaIstegi | null = null;
  private gorulenTesis: TeknolojiTesisEylemi | null = null;
  private readonly acikEtkiler = new Set<string>();
  private acilacakEtki: string | null = null;
  constructor(private readonly p: TeknolojiPanelParam) {}

  teklifYakala(t: HTMLElement): void { this.gorulenTeklif = arastirmaIstegiOku(t); this.gorulenTesis = tesisEylemiOku(t); }
  baslatEylemiOku(t: HTMLElement): ArastirmaIstegi | null {
    const simdiki = arastirmaIstegiOku(t), gorulen = this.gorulenTeklif;
    this.gorulenTeklif = null;
    return simdiki && gorulen ? gorulen : simdiki;
  }
  tesisEylemiOku(t: HTMLElement): TeknolojiTesisEylemi | null {
    const simdiki = tesisEylemiOku(t), gorulen = this.gorulenTesis;
    this.gorulenTesis = null;
    return simdiki && gorulen ? gorulen : simdiki;
  }

  ac(id: string): boolean {
    if (!this.p.durum() || !this.p.ic.teknolojiler.some((t) => t.id === id)) return false;
    this.acilacakEtki = id;
    this.p.degisti();
    return true;
  }

  /** Yalnız mülk oyununda gerçekten kullanılabilir yöntem/tesis/birlik açan araştırmalar başlatılır. */
  private secenekler(t: TeknolojiT): string[] {
    const ic = this.p.ic;
    const kurulabilir = ic.turler.filter((tur) => (ic.param.mulk?.yapiYuva[tur.id] ?? 0) > 0);
    const kullanilan = new Set(kurulabilir.flatMap((tur) => tur.yontemler));
    return [
      ...ic.yontemler.filter((y) => kullanilan.has(y.indeks) && y.gerekliTeknoloji === t.id).map((y) => y.ad),
      ...kurulabilir.filter((tur) => tur.gerekliTeknoloji === t.id).map((tur) => tur.ad),
      ...((ic.param.mulk?.ekYapilar?.["ordugah"]?.birlikKapasitesi ?? 0) > 0
        ? ic.birlikler.filter((birlik) => birlik.gerekliTeknoloji === t.id).map((birlik) => birlik.ad)
        : []),
    ];
  }

  private engel(t: TeknolojiT, d: TeknolojiDurumu): string | null {
    if (d.acik.has(t.id)) return "Araştırıldı";
    if (d.arastirma) return d.arastirma.teknoloji === t.id ? "Araştırılıyor" : "Önce süren araştırmanın bitmesini bekle.";
    if (!this.secenekler(t).length) return "Mülk oyununda kullanılabilir bir seçeneği henüz yok.";
    const eksik = t.onKosullar.filter((id) => !d.acik.has(id));
    if (eksik.length) return `Önce ${eksik.map((id) => this.p.ic.teknolojiler.find((x) => x.id === id)?.ad ?? id).join(", ")} araştırılmalı.`;
    const teklif = arastirmaTeklifi(t, d);
    if (!teklif) return "Araştırma bedeli sunucudan bekleniyor.";
    if (d.hazineMili < teklif.maliyet) return "Araştırma için hazinen yeterli değil.";
    return null;
  }

  html(): string {
    if (typeof document !== "undefined") this.etkileriYakala(document);
    if (this.acilacakEtki !== null) { this.acikEtkiler.add(esc(this.acilacakEtki)); this.acilacakEtki = null; }
    const d = this.p.durum();
    if (!d) return '<p class="ipucu-metin">Araştırma bilgisi yükleniyor…</p>';
    const etkin = d.arastirma;
    let s = `<section class="tk-panel" aria-busy="${this.gonderiliyor}"><h3>${ikon("flask-conical", 18)} Teknoloji</h3><p class="ipucu-metin">Yeni üretim yöntemlerini araştır. Aynı anda bir araştırma yürütülür; tamamlanan yöntemleri tesislerinde seçebilirsin. Araştırma bitince tesislerin yöntemi kendiliğinden değişmez.</p>`;
    if (etkin) {
      const ad = this.p.ic.teknolojiler.find((t) => t.id === etkin.teknoloji)?.ad ?? etkin.teknoloji;
      const kalan = Math.max(0, etkin.bitis - d.simZamani);
      s += `<p class="tk-etkin" role="status"><b>${esc(ad)}</b><span>${kalan > 0 ? `${esc(sureMetni(kalan / SAAT))} kaldı` : "Tamamlanma bilgisi bekleniyor…"}</span></p>`;
    }
    if (this.sonuc) s += `<p class="tk-sonuc${this.hata ? " tk-hata" : ""}" role="${this.hata ? "alert" : "status"}">${esc(this.sonuc)}</p>`;
    s += '<div class="tk-liste">';
    for (const t of this.p.ic.teknolojiler) {
      const acik = d.acik.has(t.id);
      const secenekler = this.secenekler(t);
      const teklif = arastirmaTeklifi(t, d);
      const neden = this.engel(t, d);
      s += `<article class="tk-kart${acik ? " tk-tamam" : ""}" data-teknoloji-kart="${esc(t.id)}" tabindex="-1"><h4>${esc(t.ad)}${acik ? ` ${ikon("check", 15)}` : ""}</h4>`;
      s += `<p>${esc(secenekler.length ? `Üretim seçenekleri: ${secenekler.join(", ")}.` : "Bu araştırmanın açtığı seçenekler mülk oyununa henüz bağlı değil.")}</p>`;
      if (!acik && secenekler.length && teklif) s += `<dl class="tk-bedel"><div><dt>Şimdi başlatırsan</dt><dd>${paraMili(teklif.maliyet)} · ${esc(sureMetni(teklif.sureMs / SAAT))}</dd></div></dl>`;
      if (neden) s += `<p class="ipucu-metin">${esc(neden)}</p>`;
      if (!acik && secenekler.length) s += `<button type="button" class="eylem" data-teknoloji-baslat="${esc(t.id)}"${teklif ? ` data-maliyet-mili="${teklif.maliyet}"` : ""}${neden || this.gonderiliyor ? " disabled" : ""}>${this.gonderiliyor ? "İşleniyor…" : "Araştırmayı başlat"}</button>`;
      const etki = teknolojiEtkiGorunumuHtml({ teknoloji: t.id, ic: this.p.ic, isletme: this.p.isletme?.() ?? null, acik: d.acik, yontemDestegi: this.p.yontemDestegi === true, bekliyor: this.gonderiliyor, ...(this.p.tesisAdi ? { tesisAdi: this.p.tesisAdi } : {}) });
      s += etki.replace(/<details\b([^>]*)>/g, (etiket: string, ozellikler: string) => {
        const id = /data-teknoloji-etki="([^"]*)"/.exec(ozellikler)?.[1];
        return id !== undefined && this.acikEtkiler.has(id) ? etiket.slice(0, -1) + " open>" : etiket;
      });
      s += "</article>";
    }
    return s + '</div><p class="ipucu-metin">Bedel araştırma başlarken alınır. Yayılım ve yeni oyuncu hızı, başlangıçtaki maliyet ve süreyi etkiler. Süre, araştırmanın başladığı andaki koşullara göre belirlenir.</p></section>';
  }

  async baslat(id: string, maliyetMili?: number): Promise<void> {
    if (this.gonderiliyor) return;
    const d = this.p.durum();
    const t = this.p.ic.teknolojiler.find((x) => x.id === id);
    if (!d || !t) return;
    const neden = this.engel(t, d);
    if (neden) { this.sonuc = neden; this.hata = true; this.p.degisti(); return; }
    const teklif = arastirmaTeklifi(t, d);
    if (maliyetMili !== undefined && (!Number.isSafeInteger(maliyetMili) || maliyetMili < 0 || teklif?.maliyet !== maliyetMili)) {
      this.sonuc = "Araştırma bedeli değişmiş. Güncel bedeli yeniden incele ve tekrar başlat.";
      this.hata = true;
      this.p.degisti();
      return;
    }
    this.gonderiliyor = true;
    this.sonuc = "";
    this.p.degisti();
    try {
      const r = await this.p.komut(id, maliyetMili);
      this.hata = !r.tamam;
      this.sonuc = r.tamam ? `${t.ad} araştırması başladı.` : r.mesaj;
    } catch {
      this.hata = true;
      this.sonuc = "Sunucuya ulaşılamadı. Araştırma durumunu kontrol edip yeniden deneyebilirsin.";
    } finally {
      this.gonderiliyor = false;
      this.p.degisti();
    }
  }

  private etkileriYakala(kok: ParentNode): void {
    for (const d of kok.querySelectorAll<HTMLDetailsElement>(".tk-panel details[data-teknoloji-etki]")) {
      const id = d.dataset["teknolojiEtki"];
      if (id === undefined) continue;
      if (d.open) this.acikEtkiler.add(esc(id));
      else this.acikEtkiler.delete(esc(id));
    }
  }

  odagiYakala(kok: ParentNode): (() => void) | null {
    this.etkileriYakala(kok);
    const a = typeof document === "undefined" ? null : document.activeElement;
    if (!(a instanceof HTMLElement) || !a.closest(".tk-panel")) return null;
    const kart = a.closest<HTMLElement>("[data-teknoloji-kart]")?.dataset["teknolojiKart"];
    const detay = a.tagName === "SUMMARY" ? a.closest<HTMLElement>("[data-teknoloji-etki]")?.dataset["teknolojiEtki"] : undefined;
    const ozellikler = ["data-teknoloji-baslat", "data-teknoloji-tesis", "data-teknoloji-yontem", "data-teknoloji"].filter((id) => a.hasAttribute(id)).map((id) => [id, a.getAttribute(id)] as const);
    return () => {
      const k = [...kok.querySelectorAll<HTMLElement>("[data-teknoloji-kart]")].find((x) => x.dataset["teknolojiKart"] === kart);
      if (!k) return;
      const y = detay !== undefined ? [...k.querySelectorAll<HTMLDetailsElement>("details[data-teknoloji-etki]")].find((x) => x.dataset["teknolojiEtki"] === detay)?.querySelector<HTMLElement>("summary") : ozellikler.length ? [...k.querySelectorAll<HTMLElement>("button")].find((x) => ozellikler.every(([id, deger]) => x.getAttribute(id) === deger)) : k;
      (y ?? k).focus({ preventScroll: true });
    };
  }
}

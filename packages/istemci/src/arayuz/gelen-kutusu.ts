/**
 * "Bildirimler" gelen kutusu. Bildirim kuralı: kısa bildirim (toast) YALNIZ oyuncunun kendi eyleminin sonucu
 * içindir (arayuz/bildirim.ts); diğer her şey (savaş ilanı, biten inşaat, iklim uyarısı...) buraya düşer ve asla
 * açılır pencere olarak gösterilmez. Olay üretimi saftır (`gelenOlaylari`); `GelenKutusu` yalnız DOM'u yönetir.
 */
import { ikon } from "../tasarim/ikon";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import type { BitenInsaat } from "../veri/rozet";
import { olayEvresi, olaySimgesi } from "../veri/tarim";
import { esc, sureMetni, tarihSaatMetni } from "./bicim";
import { oyuncuAd } from "./govde";

export interface GelenOlay {
  /** Sim-saat. */
  saat: number;
  metin: string;
  /** İlgili bölge (Git), yoksa -1. */
  bolge: number;
  tur: "savas" | "insaat" | "iklim";
}

/** Kutuda tutulan en çok olay. */
export const GELEN_EN_COK = 40;

/**
 * İki kare arasındaki dikkat çekici değişiklikler. Oyuncu kipinde (ben >= 0) yalnız oyuncuyu ilgilendirenler
 * (taraf olduğu savaşlar, kendi inşaatları, bölgelerini etkileyen iklim olayları); izlemede savaşlar ve iklim.
 */
export function gelenOlaylari(onceki: Kare | null, simdi: Kare, dizin: Dizin, ben: number, bitenler: readonly BitenInsaat[], bolgeAd: (i: number) => string): GelenOlay[] {
  const cikti: GelenOlay[] = [];
  if (!onceki || simdi.saat < onceki.saat) return cikti;
  const benim = (s: number): boolean => ben < 0 || s === ben;
  const oncekiSavas = new Map(onceki.savaslar.map((w) => [w.id, w]));
  for (const w of simdi.savaslar) {
    if (!benim(w.saldiran) && !benim(w.savunan)) continue;
    const o = oncekiSavas.get(w.id);
    if (!o && w.evre !== "bitti") {
      const bana = ben >= 0 && w.savunan === ben;
      cikti.push({
        saat: simdi.saat,
        bolge: w.hedefBolge,
        tur: "savas",
        metin: bana ? `${oyuncuAd(dizin, w.saldiran)}, ${bolgeAd(w.hedefBolge)} bölgenize savaş ilan etti.` : `Savaş ilan edildi: ${bolgeAd(w.saldiranBolge)} → ${bolgeAd(w.hedefBolge)}.`,
      });
    } else if (o && o.evre !== "bitti" && w.evre === "bitti" && w.sonuc) {
      cikti.push({ saat: simdi.saat, bolge: w.hedefBolge, tur: "savas", metin: `Savaş bitti (${bolgeAd(w.hedefBolge)}): ${w.sonuc.kazanan === w.saldiran ? "saldıran" : "savunan"} kazandı.` });
    }
  }
  if (ben >= 0) {
    for (const b of bitenler) {
      if (!b.benim) continue;
      const ad = b.tesisTuru >= 0 ? dizin.tesisTurleri[b.tesisTuru]?.ad : undefined;
      cikti.push({ saat: b.saat, bolge: b.bolge, tur: "insaat", metin: `${bolgeAd(b.bolge)}: ${ad ? `${ad} inşaatı` : "inşaat"} bitti.` });
    }
  }
  const tarim = dizin.tarim;
  if (tarim && simdi.iklim) {
    const oncekiOlay = new Set((onceki.iklim?.olaylar ?? []).map((o) => o.id));
    for (const o of simdi.iklim.olaylar) {
      if (oncekiOlay.has(o.id) || olayEvresi(o, simdi.saat) === "bitti") continue;
      const etkiler = o.etki.map((e) => e[0]);
      if (ben >= 0 && !etkiler.some((b) => simdi.bolgeler[b]?.sahip === ben)) continue;
      const ad = olaySimgesi(tarim.olayTurleri[o.tur] ?? "").ad;
      const ne = olayEvresi(o, simdi.saat) === "uyari" ? `${sureMetni(o.baslangic - simdi.saat)} sonra başlıyor` : "başladı";
      cikti.push({ saat: simdi.saat, bolge: o.merkez, tur: "iklim", metin: `${ad} — ${bolgeAd(o.merkez)} çevresi: ${ne}.` });
    }
  }
  return cikti;
}

/** Gelen kutusu: üst çubuktaki düğme (okunmamış sayısı) + açılır liste. */
export class GelenKutusu {
  private olaylar: GelenOlay[] = [];
  private okunmamis = 0;

  constructor(
    private dugme: HTMLElement,
    private liste: HTMLElement,
    private git: (bolge: number) => void,
  ) {
    dugme.addEventListener("click", () => this.ac(this.liste.hidden));
    liste.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const g = t.closest("[data-git]") as HTMLElement | null;
      if (g) {
        this.git(Number(g.dataset["git"]));
        this.ac(false);
      } else if (t.closest("[data-temizle]")) {
        this.olaylar = [];
        this.ciz();
      }
    });
    this.ciz();
  }

  get sayi(): number {
    return this.olaylar.length;
  }

  ekle(yeni: readonly GelenOlay[]): void {
    if (!yeni.length) return;
    this.olaylar = [...[...yeni].reverse(), ...this.olaylar].slice(0, GELEN_EN_COK);
    if (this.liste.hidden) this.okunmamis = Math.min(GELEN_EN_COK, this.okunmamis + yeni.length);
    this.ciz();
  }

  ac(a: boolean): void {
    this.liste.hidden = !a;
    this.dugme.setAttribute("aria-expanded", String(a));
    if (a) this.okunmamis = 0;
    this.ciz();
  }

  private ciz(): void {
    const n = this.okunmamis;
    this.dugme.innerHTML = `${ikon("bell", 20)}${n > 0 ? `<span class="sayac">${n}</span>` : ""}`;
    this.dugme.setAttribute("aria-label", n > 0 ? `Bildirimler (${n} yeni)` : "Bildirimler");
    if (this.liste.hidden) return;
    const satirlar = this.olaylar
      .map((o) => `<li><button type="button" class="gelen-satir" ${o.bolge >= 0 ? `data-git="${o.bolge}"` : "disabled"}><span>${esc(o.metin)}</span><span class="soluk">${esc(tarihSaatMetni(o.saat))}</span></button></li>`)
      .join("");
    this.liste.innerHTML = `<div class="acilir-baslik"><b>Bildirimler</b>${this.olaylar.length ? `<button type="button" class="mini-dugme" data-temizle>Temizle</button>` : ""}</div>${satirlar ? `<ul class="gelen-liste">${satirlar}</ul>` : `<div class="bos-durum">${ikon("bell", 32)}<p class="ipucu-metin">Henüz bildirimin yok. Savaş ilanları, biten inşaatlar ve iklim uyarıları burada toplanır.</p></div>`}`;
  }
}

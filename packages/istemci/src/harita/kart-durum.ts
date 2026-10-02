/**
 * Maliyet kartlarının (yapı yerleştirme, ölçek büyütme) KALICI durum bölgesi (erişilebilirlik): neden satırı her kart yenilemesinde
 * yeniden oluşturulmaz (`innerHTML` her seferinde yeni `role=alert` düğümü açar ve ekran okuyucu aynı nedeni tekrar okur); tek bir
 * `role=status` öğesi vardır, yeni kart HTML'inin `[data-yk-neden-yer]` yuvasına taşınır ve YALNIZ metin değişince güncellenir.
 * Kapalı onay düğmesi `disabled` değil `aria-disabled` olur (odağa gelir, neden `aria-describedby` ile okunur).
 */
export const NEDEN_KIMLIGI = "yk-neden";

export class KartDurumu {
  readonly el: HTMLParagraphElement;

  constructor() {
    this.el = document.createElement("p");
    this.el.id = NEDEN_KIMLIGI;
    this.el.className = "yk-uyari";
    this.el.setAttribute("role", "status");
    this.el.setAttribute("aria-live", "polite");
    this.el.dataset["ykAlan"] = "neden";
    this.el.hidden = true;
  }

  /** Neden metnini yazar (yalnız değişince); boşsa bölge gizlenir ama DOM'da kalır. */
  yaz(neden: string | null): void {
    const t = neden ?? "";
    if (this.el.textContent !== t) this.el.textContent = t;
    this.el.hidden = t === "";
  }

  /** Yeniden yazılan kartın yuvasına kalıcı öğeyi yerleştirir (yuva yoksa öğe DOM'dan ayrılır). */
  yerlestir(kok: HTMLElement): void {
    const yuva = kok.querySelector("[data-yk-neden-yer]");
    if (yuva) yuva.replaceWith(this.el);
    else this.el.remove();
  }
}

/** Kapalı birincil düğmenin öznitelikleri: `disabled` yerine `aria-disabled` ve neden bağı. Hazırsa boş dizge. */
export function kapaliDugmeOznitelikleri(hazir: boolean, nedenVar: boolean): string {
  if (hazir) return "";
  return `aria-disabled="true"${nedenVar ? ` aria-describedby="${NEDEN_KIMLIGI}"` : ""}`;
}

/** "Yapı kur" düğmesi basılı sayılır: yapı seçili (kart açık) ya da alt arsa şeridi açık. Tek birincil kuralı (ekranda tek dolu birincil). */
export function dugmeBasili(yapiSecili: boolean, seritAcik: boolean): boolean {
  return yapiSecili || seritAcik;
}

/**
 * Yapı maliyet kartının konumu: hedef hücre ekranın ALT yarısındaysa kart üste alınır (`#yapi-kart[data-konum="ust"]`; CSS T1'in), aksi hâlde ya da hedef yokken
 * varsayılan (alt) konum. `hedefY`: hedef hücre merkezinin harita kabındaki dikey konumu (px, üstten); `yukseklik`: harita kabının yüksekliği (px).
 */
export function kartKonumu(hedefY: number | null, yukseklik: number): "ust" | null {
  return hedefY !== null && yukseklik > 0 && hedefY > yukseklik / 2 ? "ust" : null;
}

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

/** Kartın ölçüsü ve kenar payları (px; hepsi harita kabına göre). `hedefYari`: hedef hücrenin ekrandaki yüksekliğinin yarısı. */
export interface KartOlcusu {
  /** Kartın doğal (kırpılmamış) yüksekliği. */
  kartYukseklik: number;
  /** Harita kabının yüksekliği. */
  kapYukseklik: number;
  /** Üst konumda kartın üst kenarının kaptan uzaklığı (üst HUD'un altı). */
  ustPx: number;
  /** Alt konumda kartın alt kenarının kaptan uzaklığı. */
  altPx: number;
  hedefYari: number;
}

export interface KartYerlesimi {
  konum: "ust" | null;
  /** İki konum da hedefi örtüyorsa kartın izinli en büyük yüksekliği (px; fazlası kart içinde kayar); aksi hâlde null. */
  enYuksek: number | null;
}

/** Hedefle kart arasında bırakılan boşluk (px) ve sınırlanan kartın alt sınırı. */
const KART_BOSLUK = 8;
const KART_EN_AZ = 140;

/**
 * Kartın ÖLÇÜLEN yüksekliğiyle konum seçimi: hedef hücreyi örtmeyen taraf seçilir (üst: kart [ustPx, ustPx+h]; alt: [kap-altPx-h, kap-altPx]).
 * İkisi de örtmüyorsa eski kural (`kartKonumu`: hedef alt yarıdaysa üst; konum titremesin). İkisi de örtüyorsa açık alanı (hedefin üstü ya da altı) büyük olan taraf seçilir
 * ve kartın en büyük yüksekliği o alana sınırlanır (`enYuksek`; kart içinde kayar): hedef görünür ve tıklanabilir kalır.
 */
export function kartYerlesimi(hedefY: number | null, o: KartOlcusu): KartYerlesimi {
  const eski = kartKonumu(hedefY, o.kapYukseklik);
  if (hedefY === null || o.kapYukseklik <= 0 || o.kartYukseklik <= 0) return { konum: eski, enYuksek: null };
  const ust = hedefY - o.hedefYari;
  const alt = hedefY + o.hedefYari;
  const ustOrter = ust < o.ustPx + o.kartYukseklik && alt > o.ustPx;
  const altBas = o.kapYukseklik - o.altPx - o.kartYukseklik;
  const altOrter = alt > altBas && ust < o.kapYukseklik - o.altPx;
  if (!ustOrter && !altOrter) return { konum: eski, enYuksek: null };
  if (!ustOrter) return { konum: "ust", enYuksek: null };
  if (!altOrter) return { konum: null, enYuksek: null };
  const ustAlan = ust - KART_BOSLUK - o.ustPx;
  const altAlan = o.kapYukseklik - o.altPx - (alt + KART_BOSLUK);
  return ustAlan >= altAlan ? { konum: "ust", enYuksek: Math.max(KART_EN_AZ, Math.floor(ustAlan)) } : { konum: null, enYuksek: Math.max(KART_EN_AZ, Math.floor(altAlan)) };
}

/**
 * "Pazar'da sat" (mülk paneli, Mal sekmesi; alfa-0 ilk saat T-1): her satılabilir malın satırında düğme, satırın altında SÜREKLİ saatlik satış emri formu ve emir durumu.
 * Komut `ticaret_emri` (ihracat; mülk kipinde liman şartı yoktur): `oranSaat` mili-birim/sa, 0 = emri kaldırır. Emir tek seferlik satış DEĞİLDİR: metin "saatte N birim" der,
 * "Satışı bırak" emri kaldırır. Metinler `pazar-sat-metin.ts` (A1 `pazar.sat.*`, `pazar.ret.*`). Saf durum + HTML dizgesi; DOM'a bağlamayı `mulk-panel.ts` yapar.
 *
 * Kurallar: depolanamaz mal (elektrik) satırında düğme yok; emir varken "Satışı değiştir" (mevcut oranla açar); gıdada "Depodaki kadar" kısayolu yok ve ilk dükkân satışı yoksa tek
 * satır uyarı (engel değil); "Eline geçen" yalnız sunucu düğümün ihracat net çarpanını (`satisNetPpm`: liman primi, komisyon, kalkan, Ticaret ofisi dahil) verirse görünür, yoksa gizli; Defter `ilk_satis` sıradaysa emir varken saat başı notu. Ret nedeni Türkçe, sayfada kalır.
 */
import { PPM, carpBol } from "@bolge/cekirdek";
import { esc, paraMili } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import type { IsletmeDurumu, TesisSonucu, TicaretEmriIstegi } from "./baglanti";
import { saatDakika } from "./dukkan-html";
import { PAZAR_EN_COK_BIRIM_SAAT, pazarMetni } from "./pazar-sat-metin";

type MalSatiri = IsletmeDurumu["mallar"][number];

export interface PazarSatParam {
  ic: Icerik;
  /** Mal kimliği -> görünen ad. */
  malAdi: (mal: string) => string;
  isletme: () => IsletmeDurumu | null;
  /** Referans (dünya) fiyatı: mili-₺/birim; kare yoksa taban ve `yaklasik`; bilinmeyen mal tanımsız (`referansFiyati`). */
  referans: (mal: string) => { mili: number; yaklasik: boolean } | undefined;
  /** Yeni oyuncu kalkanı sürüyor mu (komisyon, tarife, vergi yok). */
  kalkan: () => boolean;
  /** Defter `ilk_satis` sırada ve ödülü (mili); sırada değilse (alındı ya da defter yok) null. */
  ilkSatisOdulu: () => number | null;
  /** Oyuncunun ilk DÜKKÂN satışı oldu mu (gıda uyarısı yalnız olmadıysa). */
  ilkDukkanSatisi: () => boolean;
  komut: (i: TicaretEmriIstegi) => Promise<TesisSonucu>;
  /** Durum değişti: panel yeniden çizilsin. */
  degisti: () => void;
  bildir: (metin: string, tur: "bilgi" | "hata") => void;
  /** Şimdi (ms; iyimser emir süresi için); varsayılan `Date.now`. */
  simdi?: () => number;
}

/** Panel eylemi (DOM'dan okunur). */
export type PazarSatEylemi = { eylem: "ac"; mal: string } | { eylem: "oran"; oran: string } | { eylem: "ver" } | { eylem: "birak" } | { eylem: "vazgec" };

/** `tikla`: tıklanan öğeden Pazar'da sat eylemi (yoksa null). Devre dışı düğme (`aria-disabled`) eylem sayılmaz. */
export function pazarSatEylemiOku(t: HTMLElement): PazarSatEylemi | null {
  const d = t.closest<HTMLElement>("[data-eylem^='pazar-']");
  if (!d || d.getAttribute("aria-disabled") === "true") return null;
  switch (d.dataset["eylem"]) {
    case "pazar-ac":
      return { eylem: "ac", mal: d.dataset["mal"] ?? "" };
    case "pazar-oran":
      return { eylem: "oran", oran: d.dataset["oran"] ?? "" };
    case "pazar-ver":
      return { eylem: "ver" };
    case "pazar-birak":
      return { eylem: "birak" };
    case "pazar-vazgec":
      return { eylem: "vazgec" };
    default:
      return null;
  }
}

/** Sayı alanı değeri -> birim/sa (tamsayı, 1..1.000.000) ya da null. */
export function pazarOrani(girdi: string): number | null {
  const metin = girdi.trim();
  if (metin === "") return null;
  const n = Number(metin);
  return Number.isInteger(n) && n >= 1 && n <= PAZAR_EN_COK_BIRIM_SAAT ? n : null;
}

const SAAT = 3_600_000;
const birim = (mili: number): number => Math.round(mili / 1000);
/** İyimser emir (komut kabul edildi, kare henüz yetişmedi) bu kadar süre geçerli. */
const IYIMSER_MS = 20_000;

export class PazarSatPaneli {
  /** Formu açık malın kimliği; yok = kapalı. */
  private acik: string | null = null;
  private girdiMetni = "";
  private gonderiyor = false;
  private hata: string | null = null;
  /** Kabul edilen ama karede henüz görünmeyen emir (mal -> oran mili-birim/sa; 0 = kaldırıldı). */
  private iyimser = new Map<string, { oran: number; t: number }>();

  constructor(private readonly p: PazarSatParam) {}

  get durum(): { acik: string | null; girdi: string; gonderiyor: boolean; hata: string | null } {
    return { acik: this.acik, girdi: this.girdiMetni, gonderiyor: this.gonderiyor, hata: this.hata };
  }

  private simdi(): number {
    return (this.p.simdi ?? Date.now)();
  }

  /** Depolanabilir mal Pazar'a satılabilir (çekirdek: depolanamaz mal ticarete konu olamaz). */
  satilabilir(mal: string): boolean {
    const i = this.p.ic.malIdx[mal];
    return i !== undefined && this.p.ic.mallar[i]?.depolanabilir === true;
  }

  /** Satış emrinin etkin oranı (mili-birim/sa; yoksa 0): karedeki emir, yoksa bu oturumda kabul edilen iyimser emir. */
  private emir(x: MalSatiri): number {
    const gercek = x.satisEmirMili ?? 0;
    const o = this.iyimser.get(x.mal);
    if (o === undefined) return gercek;
    if (o.oran === gercek || this.simdi() - o.t > IYIMSER_MS) {
      this.iyimser.delete(x.mal);
      return gercek;
    }
    return o.oran;
  }

  /**
   * Emir verildi ama henüz gerçekleşmedi mi: çekirdek ticaret emirlerini YALNIZ saatlik tıkta (`saatlik_tik`, her tam sim-saatinde) gerçekleştirir; emir tıkla tıkla arasında verildiyse ilk
   * gerçekleşme bir sonraki tam saattedir. Emir var, gerçekleşen 0 ve satılacak mal (stok ya da üretim) VARSA bu bekleyiştir; mal yoksa "satılacak mal yok".
   * Kalan süre sunucunun sim zamanından (`isletme().simZamani`) bir sonraki tam saate hesaplanır (tahmin yok).
   */
  private bekleyis(x: MalSatiri, emir: number): { kalanSaat: number } | null {
    if (emir <= 0 || x.satisMili > 0 || !(x.stokMili > 0 || x.uretimMili > 0)) return null;
    const t = this.p.isletme()?.simZamani;
    if (t === undefined) return null;
    return { kalanSaat: (SAAT - (t % SAAT)) / SAAT };
  }

  /** Satırın düğmeye ihtiyacı var mı: satılabilir mal, emrin yeri biliniyor. */
  private gorunur(x: MalSatiri): boolean {
    return this.satilabilir(x.mal) && x.satisBolge !== undefined;
  }

  /**
   * Mal satırının ALTINDAKİ ek satırın içeriği (T1 yerleşimi: tablo sütunu açılmaz): emir durumu, "Pazar'da sat" / "Satışı değiştir" düğmesi ve açıksa form. Satılamayan malda boş
   * (elektrik gibi depolanamaz mal: düğme yok).
   */
  satirEki(x: MalSatiri): string {
    if (!this.gorunur(x)) return "";
    const emir = this.emir(x);
    const ad = this.p.malAdi(x.mal);
    const acik = this.acik === x.mal;
    const etiket = emir > 0 ? pazarMetni("pazar.sat.dugme_degistir") : pazarMetni("pazar.sat.dugme");
    let h = "";
    if (emir > 0) {
      const g = birim(x.satisMili);
      const bekle = this.bekleyis(x, emir);
      const metin = bekle ? pazarMetni("pazar.sat.bekliyor", { sure: saatDakika(bekle.kalanSaat) }) : g > 0 ? pazarMetni("pazar.sat.durum", { n: birim(emir), g }) : pazarMetni("pazar.sat.durum_bos", { n: birim(emir) });
      h += `<p class="soluk pz-durum" data-alan="pazar-durum" data-mal="${esc(x.mal)}">${esc(metin)}</p>`;
    }
    h += `<button type="button" class="eylem mini-dugme" data-eylem="pazar-ac" data-mal="${esc(x.mal)}" aria-expanded="${acik}" aria-label="${esc(emir > 0 ? `${ad}: ${etiket}` : pazarMetni("pazar.sat.dugme_etiket", { mal: ad }))}"${this.gonderiyor ? ` aria-disabled="true"` : ""}>${esc(etiket)}</button>`;
    if (acik) h += this.formHtml(x, emir);
    return h;
  }

  /** Yalnız özet bölgesi (fiyat, net, gelir, uyarılar, ret): sayı yazılırken yeniden çizim odağı bozmasın diye ayrı yamalanır. */
  ozetHtml(mal: string): string {
    const x = this.p.isletme()?.mallar.find((m) => m.mal === mal);
    if (!x) return "";
    return this.ozetIc(x, this.emir(x));
  }

  private ozetIc(x: MalSatiri, emir: number): string {
    const oran = pazarOrani(this.girdiMetni);
    const r = this.p.referans(x.mal);
    let h = "";
    if (r) {
      h += `<p class="soluk">${esc(pazarMetni(r.yaklasik ? "pazar.sat.fiyat_yaklasik" : "pazar.sat.fiyat", { fiyat: paraMili(r.mili) }))}</p>`;
      // "Eline geçen": yalnız sunucu düğümün ihracat net çarpanını veriyorsa (liman primi, komisyon, Ticaret ofisi dahil); yoksa satırlar GİZLİ (sabit çarpanla rakam gösterilmez). Aşağı yuvarlanır.
      if (x.satisNetPpm !== undefined) {
        const net = carpBol(r.mili, x.satisNetPpm, PPM);
        h += `<p class="soluk">${esc(pazarMetni("pazar.sat.net", { net: paraMili(net) }))}</p>`;
        if (oran !== null) h += `<p class="soluk" data-alan="pazar-gelir">${esc(pazarMetni("pazar.sat.gelir", { gelir: paraMili(oran * net) }))}</p>`;
      }
      if (this.p.kalkan()) h += `<p class="soluk">${esc(pazarMetni("pazar.sat.kalkan"))}</p>`;
    }
    if (x.mal === "gida" && !this.p.ilkDukkanSatisi()) h += `<p>${esc(pazarMetni("pazar.sat.gida_not"))}</p>`;
    const odul = this.p.ilkSatisOdulu();
    if (emir > 0 && odul !== null && this.bekleyis(x, emir) === null) h += `<p class="soluk">${esc(pazarMetni("pazar.sat.defter_not", { odul: paraMili(odul) }))}</p>`;
    if (this.girdiMetni.trim() !== "" && oran === null && Number(this.girdiMetni) > PAZAR_EN_COK_BIRIM_SAAT) h += `<p class="dk-hata" role="alert">${esc(pazarMetni("pazar.ret.oran", { n: PAZAR_EN_COK_BIRIM_SAAT.toLocaleString("tr-TR") }))}</p>`;
    else if (oran === null) h += `<p class="soluk" data-alan="pazar-gerekli">${esc(pazarMetni("pazar.sat.oran_gerekli"))}</p>`;
    if (this.hata) h += `<p class="dk-hata" role="alert">${esc(this.hata)}</p>`;
    return h;
  }

  private formHtml(x: MalSatiri, emir: number): string {
    const ad = this.p.malAdi(x.mal);
    const oran = pazarOrani(this.girdiMetni);
    const uretim = birim(x.uretimMili);
    const stok = birim(x.stokMili);
    let h = `<div class="pz-form" data-mal="${esc(x.mal)}"${this.gonderiyor ? ` data-durum="gonderiliyor"` : ""}>`;
    h += `<p><b>${esc(pazarMetni("pazar.sat.baslik", { mal: ad }))}</b></p>`;
    h += `<p class="soluk">${esc(pazarMetni("pazar.sat.alt"))}</p>`;
    const hizli: string[] = [];
    if (uretim >= 1) hizli.push(`<button type="button" class="eylem mini-dugme" data-eylem="pazar-oran" data-oran="${uretim}">${esc(pazarMetni("pazar.sat.oran_uretim", { n: uretim }))}</button>`);
    if (stok >= 1 && x.mal !== "gida") hizli.push(`<button type="button" class="eylem mini-dugme" data-eylem="pazar-oran" data-oran="${stok}">${esc(pazarMetni("pazar.sat.oran_stok", { n: stok }))}</button>`);
    if (hizli.length > 0) h += `<div class="pz-hizli">${hizli.join(" ")}</div>`;
    h += `<label for="pz-oran">${esc(pazarMetni("pazar.sat.alan"))}</label> <input id="pz-oran" class="pz-oran" type="number" inputmode="numeric" min="1" max="${PAZAR_EN_COK_BIRIM_SAAT}" step="1" value="${esc(this.girdiMetni)}"${this.gonderiyor ? ` disabled` : ""}>`;
    h += `<div data-alan="pazar-ozet" aria-live="polite">${this.ozetIc(x, emir)}</div>`;
    const kapali = oran === null || this.gonderiyor;
    h += `<div class="pz-eylemler"><button type="button" class="birincil" data-eylem="pazar-ver"${kapali ? ` aria-disabled="true"` : ""}>${esc(pazarMetni(emir > 0 ? "pazar.sat.dugme_guncelle" : "pazar.sat.dugme_ver"))}</button>`;
    if (emir > 0) h += ` <button type="button" class="eylem" data-eylem="pazar-birak"${this.gonderiyor ? ` aria-disabled="true"` : ""}>${esc(pazarMetni("pazar.sat.dugme_kaldir"))}</button>`;
    h += ` <button type="button" class="eylem" data-eylem="pazar-vazgec"${this.gonderiyor ? ` aria-disabled="true"` : ""}>${esc(pazarMetni("pazar.sat.vazgec"))}</button></div>`;
    return h + `</div>`;
  }

  /** Sayı alanına yazılırken (yeniden çizim yok; `ozetHtml` yamalanır). */
  girdi(deger: string): void {
    this.girdiMetni = deger;
    this.hata = null;
  }

  async eylem(e: PazarSatEylemi): Promise<void> {
    if (this.gonderiyor) return;
    switch (e.eylem) {
      case "ac": {
        // Aynı düğme tekrar: kapanır
        if (this.acik === e.mal) return this.kapat();
        const x = this.p.isletme()?.mallar.find((m) => m.mal === e.mal);
        this.acik = e.mal;
        this.hata = null;
        const emir = x ? this.emir(x) : 0;
        // Açılışta alan: emir varsa mevcut oranı; yoksa üretimin kadar (varsa), yoksa boş
        this.girdiMetni = emir > 0 ? String(birim(emir)) : x && birim(x.uretimMili) >= 1 ? String(birim(x.uretimMili)) : "";
        return this.p.degisti();
      }
      case "oran":
        this.girdiMetni = e.oran;
        this.hata = null;
        return this.p.degisti();
      case "vazgec":
        return this.kapat();
      case "ver":
        return this.gonder(false);
      case "birak":
        return this.gonder(true);
    }
  }

  /** Panel yenilenirken sayı alanının odağını ve imlecini korur (yeniden çizimden SONRA çağrılır); alan odakta değilse null. */
  odagiYakala(kok: ParentNode): (() => void) | null {
    const a = typeof document !== "undefined" ? document.activeElement : null;
    if (!(a instanceof HTMLInputElement) || a.id !== "pz-oran") return null;
    const bas = a.selectionStart;
    const son = a.selectionEnd;
    return () => {
      const y = kok.querySelector<HTMLInputElement>("#pz-oran");
      if (!y) return;
      y.focus();
      if (bas !== null && son !== null) y.setSelectionRange(bas, son);
    };
  }

  kapat(): void {
    if (this.acik === null) return;
    this.acik = null;
    this.hata = null;
    this.p.degisti();
  }

  private async gonder(birak: boolean): Promise<void> {
    const mal = this.acik;
    const x = mal === null ? undefined : this.p.isletme()?.mallar.find((m) => m.mal === mal);
    if (mal === null || !x || x.satisBolge === undefined) return;
    const oran = birak ? 0 : pazarOrani(this.girdiMetni);
    if (oran === null) return;
    const oncekiEmir = this.emir(x);
    this.gonderiyor = true;
    this.hata = null;
    this.p.degisti();
    try {
      const r = await this.p.komut({ bolge: x.satisBolge, mal, oranSaat: oran * 1000 });
      if (r.tamam) {
        this.iyimser.set(mal, { oran: oran * 1000, t: this.simdi() });
        this.acik = null;
        const ad = this.p.malAdi(mal);
        this.p.bildir(birak ? pazarMetni("pazar.sat.kaldirildi", { mal: ad }) : pazarMetni(oncekiEmir > 0 ? "pazar.sat.guncellendi" : "pazar.sat.tamam", { mal: ad, n: oran }), "bilgi");
      } else this.hata = r.mesaj;
    } catch (e) {
      this.hata = e instanceof Error ? e.message : String(e);
    } finally {
      this.gonderiyor = false;
      this.p.degisti();
    }
  }
}

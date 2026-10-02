/**
 * "Pazar'da sat" (mülk paneli, Mal sekmesi; alfa-0 ilk saat T-1): her satılabilir malın satırında düğme, satırın altında SÜREKLİ saatlik satış emri formu ve emir durumu.
 * Komut `ticaret_emri` (ihracat; mülk kipinde liman şartı yoktur): `oranSaat` mili-birim/sa, 0 = emri kaldırır. Emir tek seferlik satış DEĞİLDİR: metin "saatte N birim" der,
 * "Satışı bırak" emri kaldırır. Metinler `pazar-sat-metin.ts` (A1 `pazar.sat.*`, `pazar.ret.*`). Saf durum + HTML dizgesi; DOM'a bağlamayı `mulk-panel.ts` yapar.
 *
 * Kurallar: depolanamaz mal (elektrik) satırında düğme yok; emir varken "Satışı değiştir" (mevcut oranla açar); gıdada "Depodaki kadar" kısayolu yok ve ilk dükkân satışı yoksa tek
 * satır uyarı (engel değil); "Eline geçen" yalnız sunucu düğümün ihracat net çarpanını (`satisNetPpm`: liman primi, komisyon, kalkan, Ticaret ofisi dahil) verirse görünür, yoksa gizli; Defter `ilk_satis` sıradaysa emir varken saat başı notu. Ret nedeni Türkçe, sayfada kalır.
 */
import { PPM, carpBol } from "@bolge/cekirdek";
import { esc, fmt, paraMili } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import type { IsletmeDurumu, PazarKaynagi, TesisSonucu, TicaretEmriIstegi } from "./baglanti";
import { saatDakika } from "./dukkan-html";
import { mulkMetni } from "./mulk-metin";
import { PAZAR_EN_COK_BIRIM_SAAT, pazarMetni } from "./pazar-sat-metin";

type MalSatiri = IsletmeDurumu["mallar"][number];

export interface PazarSatParam {
  ic: Icerik;
  /** Mal kimliği -> görünen ad. */
  malAdi: (mal: string) => string;
  ilAdi?: (il: string) => string;
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
export type PazarSatEylemi = { eylem: "ac"; mal: string; bolge?: string } | { eylem: "oran"; oran: string } | { eylem: "ver" } | { eylem: "birak" } | { eylem: "vazgec" };

/** `tikla`: tıklanan öğeden Pazar'da sat eylemi (yoksa null). Devre dışı düğme (`aria-disabled`) eylem sayılmaz. */
export function pazarSatEylemiOku(t: HTMLElement): PazarSatEylemi | null {
  const d = t.closest<HTMLElement>("[data-eylem^='pazar-']");
  if (!d || d.getAttribute("aria-disabled") === "true") return null;
  switch (d.dataset["eylem"]) {
    case "pazar-ac":
      return { eylem: "ac", mal: d.dataset["mal"] ?? "", ...(d.dataset["bolge"] ? { bolge: d.dataset["bolge"] } : {}) };
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

/** Form birimi birim/saat; komut mili-birim/saat. Boş değer iptal değildir. */
export function satisMiktari(girdi: string): number | null {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(girdi.trim())) return null;
  const n = Math.round(Number(girdi.trim().replace(",", ".")) * 1000);
  return Number.isSafeInteger(n) && n >= 0 && n <= PAZAR_EN_COK_BIRIM_SAAT * 1000 ? n : null;
}
export function pazarOrani(girdi: string): number | null {
  const n = satisMiktari(girdi);
  return n === null ? null : n / 1000;
}

const SAAT = 3_600_000;
const birim = (mili: number): number => mili / 1000;
/** İyimser emir (komut kabul edildi, kare henüz yetişmedi) bu kadar süre geçerli. */
const IYIMSER_MS = 20_000;

export class PazarSatPaneli {
  /** Formu açık malın kimliği; yok = kapalı. */
  private acik: string | null = null;
  private bolge: string | null = null;
  private sonSatir: MalSatiri | null = null;
  private girdiMetni = "";
  private gonderiyor = false;
  private hata: string | null = null;
  /** Kabul edilen ama karede henüz görünmeyen emir (mal -> oran mili-birim/sa; 0 = kaldırıldı). */
  private iyimser = new Map<string, { oran: number; t: number }>();

  constructor(private readonly p: PazarSatParam) {}

  get durum(): { acik: string | null; bolge: string | null; girdi: string; gonderiyor: boolean; hata: string | null } {
    return { acik: this.acik, bolge: this.bolge, girdi: this.girdiMetni, gonderiyor: this.gonderiyor, hata: this.hata };
  }

  private simdi(): number {
    return (this.p.simdi ?? Date.now)();
  }

  /** Depolanabilir mal Pazar'a satılabilir (çekirdek: depolanamaz mal ticarete konu olamaz). */
  satilabilir(mal: string): boolean {
    const i = this.p.ic.malIdx[mal];
    return i !== undefined && this.p.ic.mallar[i]?.depolanabilir === true;
  }

  private anahtar(x: MalSatiri): string { return `${x.satisBolge ?? ""}#${x.mal}`; }

  private kaynaktan(x: MalSatiri, k: PazarKaynagi): MalSatiri {
    return { ...x, stokMili: k.ag?.stokMili ?? k.stokMili, uretimMili: k.ag?.uretimMili ?? k.uretimMili,
      satisBolge: k.bolge, satisEmirMili: k.emirMili, satisMili: k.gerceklesenMili ?? 0, satisNetPpm: k.netPpm };
  }

  private satir(mal: string): MalSatiri | undefined {
    const d = this.p.isletme();
    const x = d?.mallar.find((m) => m.mal === mal);
    if (d?.pazar === undefined) return x;
    const k = d.pazar.find((k) => k.mal === mal && k.bolge === this.bolge);
    if (k && x) return this.kaynaktan(x, k);
    // Eski emir miktarını gösterme; son doğrulanan kimliği iptal için koru.
    return this.sonSatir?.mal === mal ? { ...this.sonSatir, stokMili: 0, uretimMili: 0, satisEmirMili: 0, satisMili: 0, satisNetPpm: undefined } : undefined;
  }

  private neden(k: PazarKaynagi): string {
    if (k.emirMili > 0) return "";
    if (!this.satilabilir(k.mal)) return "Bu mal pazarda satılamaz.";
    if (!k.uygun) return k.neden ?? "Bu bölgede pazar satışı yapılamaz.";
    const ag = k.ag ?? { stokMili: k.stokMili, uretimMili: k.uretimMili, gelenMili: 0 };
    return ag.stokMili > 0 || ag.uretimMili > 0 || ag.gelenMili === null || ag.gelenMili > 0 ? "" : "Önce üretim bekleniyor.";
  }

  /** Satış emrinin etkin oranı (mili-birim/sa; yoksa 0): karedeki emir, yoksa bu oturumda kabul edilen iyimser emir. */
  private emir(x: MalSatiri): number {
    const gercek = x.satisEmirMili ?? 0;
    const o = this.iyimser.get(this.anahtar(x));
    if (o === undefined) return gercek;
    if (o.oran === gercek || this.simdi() - o.t > IYIMSER_MS) {
      this.iyimser.delete(this.anahtar(x));
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
    const kaynaklar = this.p.isletme()?.pazar;
    if (kaynaklar === undefined) return this.kaynakEki(x);
    let h = kaynaklar.filter((k) => k.mal === x.mal).map((k) => this.kaynakEki(this.kaynaktan(x, k), k)).join("");
    if (this.acik === x.mal && !kaynaklar.some((k) => k.mal === x.mal && k.bolge === this.bolge)) {
      const eski = this.satir(x.mal);
      if (eski) h += this.formHtml(eski, 0);
    }
    return h;
  }

  private kaynakEki(x: MalSatiri, k?: PazarKaynagi): string {
    if (!this.gorunur(x)) return "";
    const emir = this.emir(x);
    const ad = this.p.malAdi(x.mal);
    const acik = this.acik === x.mal && (k === undefined || this.bolge === k.bolge);
    const etiket = emir > 0 ? pazarMetni("pazar.sat.dugme_degistir") : pazarMetni("pazar.sat.dugme");
    const neden = k ? this.neden(k) : "";
    let h = k ? `<p class="soluk pz-kaynak">Çıkış ili: ${esc(this.p.ilAdi?.(k.il) ?? k.il)} · Bu ilde stok ${fmt(k.stokMili / 1000)} · Ağ stoğu ${fmt(x.stokMili / 1000)} · Ağ üretimi ${fmt(x.uretimMili / 1000)}/sa</p>` : "";
    if (emir > 0) {
      const g = birim(x.satisMili);
      const bekle = this.bekleyis(x, emir);
      const metin = bekle ? pazarMetni("pazar.sat.bekliyor", { sure: saatDakika(bekle.kalanSaat) }) : g > 0 ? pazarMetni("pazar.sat.durum", { n: birim(emir), g }) : pazarMetni("pazar.sat.durum_bos", { n: birim(emir) });
      h += `<p class="soluk pz-durum" data-alan="pazar-durum" data-mal="${esc(x.mal)}">${esc(metin)}</p>`;
    }
    h += `<button type="button" class="eylem mini-dugme" data-eylem="pazar-ac" data-mal="${esc(x.mal)}"${k ? ` data-bolge="${esc(k.bolge)}"` : ""} aria-expanded="${acik}" aria-label="${esc(k ? `${ad}: ${etiket}, ${this.p.ilAdi?.(k.il) ?? k.il}` : emir > 0 ? `${ad}: ${etiket}` : pazarMetni("pazar.sat.dugme_etiket", { mal: ad }))}"${this.gonderiyor || neden ? ` aria-disabled="true"` : ""}>${esc(etiket)}</button>${neden ? `<span class="soluk">${esc(neden)}</span>` : ""}`;
    if (acik) h += this.formHtml(x, emir);
    return h;
  }

  /** Yalnız özet bölgesi (fiyat, net, gelir, uyarılar, ret): sayı yazılırken yeniden çizim odağı bozmasın diye ayrı yamalanır. */
  ozetHtml(mal: string): string {
    const x = this.satir(mal);
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
      if (this.p.kalkan()) h += `<p class="soluk">${esc(mulkMetni("mulk.koruma.kalkan_ayrinti"))}</p>`;
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
    let h = `<div class="pz-form" data-pazar-form data-mal="${esc(x.mal)}"${this.gonderiyor ? ` data-durum="gonderiliyor"` : ""}>`;
    h += `<p><b>${esc(pazarMetni("pazar.sat.baslik", { mal: ad }))}</b></p>`;
    h += `<p class="soluk">${esc(pazarMetni("pazar.sat.alt"))}</p>`;
    const hizli: string[] = [];
    if (uretim >= 1) hizli.push(`<button type="button" class="eylem mini-dugme" data-eylem="pazar-oran" data-oran="${uretim}">${esc(pazarMetni("pazar.sat.oran_uretim", { n: uretim }))}</button>`);
    if (stok >= 1 && x.mal !== "gida") hizli.push(`<button type="button" class="eylem mini-dugme" data-eylem="pazar-oran" data-oran="${stok}">${esc(pazarMetni("pazar.sat.oran_stok", { n: stok }))}</button>`);
    if (hizli.length > 0) h += `<div class="pz-hizli">${hizli.join(" ")}</div>`;
    const zaman = this.p.isletme()?.simZamani ?? 0;
    h += `<p class="soluk">Satış emirleri saat başında işlenir. Bir sonraki işlem ≈ ${esc(saatDakika((SAAT - zaman % SAAT) / SAAT))} sonra.</p>`;
    h += `<label for="pz-oran">Saatlik satış miktarı</label> <input id="pz-oran" class="pz-oran" type="text" inputmode="decimal" autocomplete="off" aria-describedby="pz-birim" value="${esc(this.girdiMetni)}"${this.gonderiyor ? ` readonly` : ""}><span id="pz-birim">birim/saat</span>`;
    h += `<div data-alan="pazar-ozet" aria-live="polite">${this.ozetIc(x, emir)}</div>`;
    const kapali = oran === null || this.gonderiyor;
    h += `<div class="pz-eylemler"><button type="button" class="eylem birincil" data-eylem="pazar-ver"${kapali ? ` aria-disabled="true"` : ""}>${esc(pazarMetni(emir > 0 ? "pazar.sat.dugme_guncelle" : "pazar.sat.dugme_ver"))}</button>`;
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
        if (this.acik === e.mal && (e.bolge === undefined || this.bolge === e.bolge)) return this.kapat();
        const d = this.p.isletme();
        let x = d?.mallar.find((m) => m.mal === e.mal);
        const k = d?.pazar?.find((k) => k.mal === e.mal && (e.bolge === undefined || k.bolge === e.bolge));
        if (d?.pazar !== undefined && (!k || this.neden(k))) return;
        if (k && x) x = this.kaynaktan(x, k);
        this.bolge = x?.satisBolge ?? null;
        this.sonSatir = x ?? null;
        this.acik = e.mal;
        this.hata = null;
        const emir = x ? this.emir(x) : 0;
        // Açılışta alan: emir varsa mevcut oranı; yoksa üretimin kadar (varsa), yoksa boş
        this.girdiMetni = emir > 0 ? String(birim(emir)) : x && x.uretimMili > 0 ? String(birim(x.uretimMili)) : "";
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

  /** Tüm form kontrollerinin ve çıkış düğmesinin odağını korur. */
  odagiYakala(kok: ParentNode): (() => void) | null {
    const a = typeof document !== "undefined" ? document.activeElement : null;
    if (!(a instanceof HTMLElement)) return null;
    if (a.closest(".pz-form")) {
      const eylem = a.dataset["eylem"], oran = a.dataset["oran"];
      const q = a.id ? `#${a.id}` : `[data-eylem="${eylem}"]${oran ? `[data-oran="${oran}"]` : ""}`;
      const g = a instanceof HTMLInputElement ? { value: a.value, bas: a.selectionStart, son: a.selectionEnd } : null;
      return () => {
        const y = kok.querySelector<HTMLElement>(q);
        if (!y) return;
        if (g && y instanceof HTMLInputElement) {
          if (g.bas !== null && g.son !== null) y.setSelectionRange(g.bas, g.son);
        }
        y.focus({ preventScroll: true });
      };
    }
    if (a.dataset["eylem"] !== "pazar-ac") return null;
    const mal = a.dataset["mal"], bolge = a.dataset["bolge"];
    return () => [...kok.querySelectorAll<HTMLElement>('[data-eylem="pazar-ac"]')].find((y) => y.dataset["mal"] === mal && y.dataset["bolge"] === bolge)?.focus({ preventScroll: true });
  }

  kapat(): void {
    if (this.gonderiyor || this.acik === null) return;
    this.acik = null;
    this.hata = null;
    this.p.degisti();
  }

  private async gonder(birak: boolean): Promise<void> {
    if (this.gonderiyor) return;
    const mal = this.acik;
    const x = mal === null ? undefined : this.satir(mal);
    if (mal === null || !x || x.satisBolge === undefined) return;
    const oran = birak ? 0 : pazarOrani(this.girdiMetni);
    if (oran === null) {
      this.hata = "Geçerli bir saatlik satış miktarı yaz (0 veya pozitif, en çok üç ondalık).";
      this.p.degisti();
      return;
    }
    const kaynaklar = this.p.isletme()?.pazar;
    const kaynak = kaynaklar?.find((k) => k.bolge === x.satisBolge && k.mal === mal);
    if (oran > 0 && kaynaklar !== undefined && (!kaynak || !kaynak.uygun || !this.satilabilir(mal))) {
      this.hata = kaynak?.neden ?? "Bu işletmenin satış bilgisi artık bulunamadı.";
      this.p.degisti();
      return;
    }
    if (oran > 0 && kaynak && this.neden({ ...kaynak, emirMili: 0 })) {
      this.hata = this.neden({ ...kaynak, emirMili: 0 });
      this.p.degisti();
      return;
    }
    const oncekiEmir = this.emir(x);
    this.gonderiyor = true;
    this.hata = null;
    this.p.degisti();
    try {
      const r = await this.p.komut({ bolge: x.satisBolge, mal, oranSaat: Math.round(oran * 1000) });
      if (r.tamam) {
        this.iyimser.set(this.anahtar(x), { oran: Math.round(oran * 1000), t: this.simdi() });
        this.acik = null;
        const ad = this.p.malAdi(mal);
        this.p.bildir(oran === 0 ? pazarMetni("pazar.sat.kaldirildi", { mal: ad }) : pazarMetni(oncekiEmir > 0 ? "pazar.sat.guncellendi" : "pazar.sat.tamam", { mal: ad, n: oran }), "bilgi");
      } else this.hata = r.mesaj;
    } catch (e) {
      this.hata = e instanceof Error ? e.message : String(e);
    } finally {
      this.gonderiyor = false;
      this.p.degisti();
    }
  }
}

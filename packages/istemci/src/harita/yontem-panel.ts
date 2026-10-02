/**
 * "Yöntemi değiştir" (mülk paneli, İşletmem > Yapılar): biten tesis satırında düğme, satırın altında yöntem seçici (T1 L.2) ve onay. Komut `yontem_degistir` (ücretsiz, anlık);
 * ret nedenleri Türkçe (`yontem.ret.*`). Saf durum + HTML dizgesi (DOM'a bağlamayı `mulk-panel.ts` yapar); sunucu karesi `IsletmeYapisi.yontem` (tesisin şimdiki yöntemi) ve `bolge` verir.
 *
 * Kurallar: türün birden çok yöntemi varsa görünür; inşadaki yapıda düğme yerine "İnşa bitince yöntemi değiştirebilirsin." satırı; tek yöntemli türde hiçbir şey yazılmaz.
 * Seçim mevcuttan farklıysa onay açılır ("{eski} → {yeni}", "Ücret yok; stoğun kalır."); "Vazgeç" varsayılan odak; Esc vazgeçer. Gönderilirken seçim ve düğmeler kilitli.
 */
import { esc } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import type { IsletmeDurumu, IsletmeYapisi, TesisSonucu, YontemDegistirIstegi } from "./baglanti";
import { sebekeFiyatlari } from "./sebeke-gider";
import { seciciGorunur, seciciTusu, yontemSecenekleri, yontemSeciciHtml } from "./yontem-secici";
import type { YontemSecenegi } from "./yontem-secici";
import { yontemMetni } from "./yontem-metin";

export interface YontemPaneliParam {
  ic: Icerik;
  /** Tesis türü kimliği -> görünen ad. */
  yapiAdi: (tur: string) => string;
  isletme: () => IsletmeDurumu | null;
  /** Oyuncunun açık teknolojileri; bilinmiyorsa null (teknoloji isteyen yöntem kilitli sayılır). */
  acikTeknolojiler: () => ReadonlySet<string> | null;
  komut: (i: YontemDegistirIstegi) => Promise<TesisSonucu>;
  /** Durum değişti: panel yeniden çizilsin. */
  degisti: () => void;
  bildir: (metin: string, tur: "bilgi" | "hata") => void;
}

/** Panel eylemi (DOM'dan okunur): düğme, onay, vazgeç ya da kart seçimi. */
export type YontemEylemi = { eylem: "ac"; tesis: string } | { eylem: "onayla" } | { eylem: "vazgec" } | { eylem: "sec"; yontem: string };

/** `tikla`: tıklanan öğeden yöntem eylemi (yoksa null). */
export function yontemEylemiOku(t: HTMLElement): YontemEylemi | null {
  const d = t.closest<HTMLElement>("[data-eylem='yontem-degistir'], [data-eylem='yontem-onayla'], [data-eylem='yontem-vazgec']");
  if (d) {
    const e = d.dataset["eylem"];
    if (d.getAttribute("aria-disabled") === "true") return null;
    if (e === "yontem-degistir") return { eylem: "ac", tesis: d.dataset["tesis"] ?? "" };
    return { eylem: e === "yontem-onayla" ? "onayla" : "vazgec" };
  }
  const k = t.closest<HTMLElement>(".ym-degistir .ym-kart");
  if (k && k.getAttribute("aria-disabled") !== "true") return { eylem: "sec", yontem: k.dataset["yontem"] ?? "" };
  return null;
}

export class YontemPaneli {
  /** Açık seçicinin tesis kimliği (anahtar "t<id>"); yok = kapalı. */
  private acik: string | null = null;
  private secili: string | null = null;
  private onayAcik = false;
  private gonderiyor = false;
  private hata: string | null = null;

  constructor(private readonly p: YontemPaneliParam) {}

  get durum(): { acik: string | null; secili: string | null; onayAcik: boolean; gonderiyor: boolean; hata: string | null } {
    return { acik: this.acik, secili: this.secili, onayAcik: this.onayAcik, gonderiyor: this.gonderiyor, hata: this.hata };
  }

  private secenekler(tur: string): YontemSecenegi[] {
    const acik = this.p.acikTeknolojiler();
    return yontemSecenekleri(this.p.ic, tur, { acik: (t) => acik !== null && acik.has(t), sebeke: sebekeFiyatlari(this.p.ic) });
  }

  private tesis(anahtar: string): IsletmeYapisi | undefined {
    return this.p.isletme()?.yapilar.find((y) => y.anahtar === anahtar && y.durum === "tesis");
  }

  /**
   * Yapı satırının parçaları: `dugme` ("Yöntemi değiştir", satırın düğmeleri arasında) ve `alt` (satırın altında seçici ve onay; inşadaki yapıda soluk "İnşa bitince…" satırı).
   * Birden çok yöntemi olmayan türde ve yöntemi bilinmeyen tesiste ikisi de boş.
   */
  satirParcalari(y: IsletmeYapisi): { dugme: string; alt: string } {
    const bos = { dugme: "", alt: "" };
    if (y.tur === "") return bos;
    const sec = this.secenekler(y.tur);
    if (!seciciGorunur(sec)) return bos;
    if (y.durum === "insaat") return y.yukseltme ? bos : { dugme: "", alt: `<span class="soluk">${esc(yontemMetni("yontem.degistir.insaatta"))}</span>` };
    if (y.yontem === undefined || y.bolge === undefined) return bos;
    const ad = this.p.yapiAdi(y.tur);
    const id = Number(y.anahtar.slice(1));
    const acik = this.acik === y.anahtar;
    const dugme = `<button type="button" class="eylem mini-dugme" data-eylem="yontem-degistir" data-tesis="${esc(y.anahtar)}" aria-expanded="${acik}" aria-label="${esc(yontemMetni("yontem.degistir.dugme_etiket", { yapi: ad }))}"${this.gonderiyor ? ` aria-disabled="true"` : ""}>${esc(yontemMetni("yontem.degistir.dugme"))}</button>`;
    if (!acik) return { dugme, alt: "" };
    const kilitli = this.onayAcik || this.gonderiyor;
    const mevcut = sec.find((s) => s.id === y.yontem);
    const baslik = yontemMetni("yontem.degistir.baslik", { yapi: ad });
    let h = `<div class="ym-degistir" data-tesis="${esc(y.anahtar)}"${this.gonderiyor ? ` data-durum="gonderiliyor"` : ""}>`;
    h += `<p class="soluk">${esc(yontemMetni("yontem.degistir.simdiki", { yontem: mevcut?.ad ?? y.yontem }))}</p>`;
    h += yontemSeciciHtml({ yapiAd: ad, secenekler: sec, secili: this.secili ?? y.yontem, mevcut: y.yontem, kilitli, kimlik: `t${id}`, baslik });
    const yeni = sec.find((s) => s.id === this.secili);
    if (this.onayAcik && yeni && yeni.id !== y.yontem) {
      h += `<div class="ym-onay" role="alertdialog" aria-labelledby="ym-onay-${id}"><p class="ym-onay-ozet" id="ym-onay-${id}">${esc(yontemMetni("yontem.degistir.ozet", { eski: mevcut?.ad ?? y.yontem, yeni: yeni.ad }))}</p><p class="soluk">${esc(yontemMetni("yontem.degistir.onay"))} ${esc(yontemMetni("yontem.degistir.bedel_yok"))}</p><div class="ym-eylemler"><button type="button" class="birincil" data-eylem="yontem-onayla"${this.gonderiyor ? ` aria-disabled="true"` : ""}>${esc(yontemMetni("yontem.degistir.dugme_onay"))}</button><button type="button" class="eylem" data-eylem="yontem-vazgec" data-varsayilan-odak="1"${this.gonderiyor ? ` aria-disabled="true"` : ""}>${esc(yontemMetni("yontem.degistir.vazgec"))}</button></div></div>`;
    }
    if (this.hata) h += `<p class="dk-hata" role="alert">${esc(this.hata)}</p>`;
    return { dugme, alt: h + `</div>` };
  }

  /** Düğme, onay, vazgeç ya da kart seçimi. Komut yalnız onaydan sonra gider. */
  async eylem(e: YontemEylemi): Promise<void> {
    if (this.gonderiyor) return;
    switch (e.eylem) {
      case "ac": {
        // Aynı düğme tekrar: kapanır
        if (this.acik === e.tesis) return this.kapat();
        const y = this.tesis(e.tesis);
        this.acik = e.tesis;
        this.secili = y?.yontem ?? null;
        this.onayAcik = false;
        this.hata = null;
        return this.p.degisti();
      }
      case "sec": {
        if (this.acik === null || this.onayAcik) return;
        const y = this.tesis(this.acik);
        const s = y ? this.secenekler(y.tur).find((x) => x.id === e.yontem) : undefined;
        if (!y || !s || s.kilitli) return;
        this.secili = s.id;
        this.hata = null;
        this.onayAcik = s.id !== y.yontem; // mevcut yöntem seçiliyse onay yok
        return this.p.degisti();
      }
      case "vazgec":
        return this.kapat();
      case "onayla":
        return this.gonder();
    }
  }

  /** Esc ya da vazgeç: onay açıksa yalnız onay kapanır (seçim mevcuda döner), değilse seçici kapanır. */
  kapat(): void {
    if (this.onayAcik) {
      const y = this.acik ? this.tesis(this.acik) : undefined;
      this.onayAcik = false;
      this.secili = y?.yontem ?? null;
      this.hata = null;
      return this.p.degisti();
    }
    if (this.acik === null) return;
    this.acik = null;
    this.secili = null;
    this.hata = null;
    this.p.degisti();
  }

  /** Klavye (seçici açıkken kartta): seçilecek yöntem kimliği ya da null. */
  tus(tus: string, odak: string | null): string | null {
    if (this.acik === null || this.onayAcik) return null;
    const y = this.tesis(this.acik);
    return y ? seciciTusu(tus, this.secenekler(y.tur), odak) : null;
  }

  private async gonder(): Promise<void> {
    const y = this.acik ? this.tesis(this.acik) : undefined;
    if (!y || y.bolge === undefined || this.secili === null || this.secili === y.yontem || !this.onayAcik) return;
    const yeni = this.secenekler(y.tur).find((s) => s.id === this.secili);
    if (!yeni || yeni.kilitli) return;
    this.gonderiyor = true;
    this.hata = null;
    this.p.degisti();
    try {
      const r = await this.p.komut({ bolge: y.bolge, tesis: Number(y.anahtar.slice(1)), yontem: yeni.id });
      if (r.tamam) {
        this.acik = null;
        this.secili = null;
        this.onayAcik = false;
        this.p.bildir(yontemMetni("yontem.degistir.tamam", { yontem: yeni.ad }), "bilgi");
      } else {
        this.onayAcik = false;
        this.secili = y.yontem ?? null;
        this.hata = r.mesaj;
      }
    } catch (e) {
      this.onayAcik = false;
      this.hata = e instanceof Error ? e.message : String(e);
    } finally {
      this.gonderiyor = false;
      this.p.degisti();
    }
  }

  /**
   * Panel yenilenirken odağı korur: odak `.ym-degistir` içindeyse (kart ya da düğme) yeniden çizimden sonra aynı öğeye (data-yontem / data-eylem) döner; onay yeni açıldıysa
   * "Vazgeç" (varsayılan odak). Dönen işlev yeniden çizimden SONRA çağrılır.
   */
  odagiYakala(kok: ParentNode): (() => void) | null {
    const a = typeof document !== "undefined" ? document.activeElement : null;
    const yer = a instanceof HTMLElement ? a.closest(".ym-degistir, [data-eylem='yontem-degistir']") : null;
    if (!(a instanceof HTMLElement) || !yer) return null;
    const tesis = a.dataset["tesis"] ? `[data-tesis="${a.dataset["tesis"].replace(/"/g, "")}"]` : "";
    const secici = a.dataset["yontem"] ? `.ym-degistir .ym-kart[data-yontem="${a.dataset["yontem"].replace(/"/g, "")}"]` : a.dataset["eylem"] ? `[data-eylem="${a.dataset["eylem"]}"]${tesis}` : null;
    return () => {
      const onay = kok.querySelector<HTMLElement>("[data-varsayilan-odak='1']");
      const hedef = this.onayAcik && onay ? onay : secici ? kok.querySelector<HTMLElement>(secici) : null;
      hedef?.focus();
    };
  }
}

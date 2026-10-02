/** Global bakım tercihi: seçim, dondurulmuş ayrı onay ve gerçek sunucu yanıtı. */
import { carpBol } from "@bolge/cekirdek";
import type { Icerik } from "../komut/tablo";
import type { BakimDuzeyiDegistirIstegi, IsletmeDurumu, TesisSonucu } from "./baglanti";
import { BAKIM_ADLARI, bakimDuzeyiGecerli, bakimGorunumuHtml } from "./bakim-gorunum";
import type { BakimDuzeyi, BakimDuzeyiEtkisi, BakimOnayi } from "./bakim-gorunum";

export type BakimEylemi = { eylem: "sec" | "onayla"; onay: BakimOnayi } | { eylem: "vazgec" };
export interface BakimPanelParam {
  ic: Icerik;
  isletme: () => IsletmeDurumu | null;
  komut?: (i: BakimDuzeyiDegistirIstegi) => Promise<TesisSonucu>;
  degisti: () => void;
  bildir?: (metin: string, tur: "bilgi" | "hata") => void;
  odak?: (onay: boolean) => void;
}

function onayOku(o: unknown): BakimOnayi | null {
  if (!o || typeof o !== "object" || !("oncekiDuzey" in o) || !("duzey" in o) || !bakimDuzeyiGecerli(o.oncekiDuzey) || !bakimDuzeyiGecerli(o.duzey) || o.oncekiDuzey === o.duzey) return null;
  return { oncekiDuzey: o.oncekiDuzey, duzey: o.duzey };
}
export function bakimEylemiOku(t: HTMLElement): BakimEylemi | null {
  const b = t.closest<HTMLElement>("[data-bakim-eylem]");
  if (!b || b.hasAttribute("disabled") || b.getAttribute("aria-disabled") === "true") return null;
  const eylem = b.dataset["bakimEylem"];
  if (eylem === "vazgec") return { eylem };
  let onay: BakimOnayi | null = null;
  if (eylem === "sec") {
    const onceki = b.dataset["oncekiDuzey"], hedef = b.dataset["duzey"];
    if (onceki !== undefined && hedef !== undefined && /^[012]$/.test(onceki) && /^[012]$/.test(hedef)) onay = onayOku({ oncekiDuzey: Number(onceki), duzey: Number(hedef) });
  } else if (eylem === "onayla") {
    try { onay = onayOku(JSON.parse(b.dataset["bakimOnayi"] ?? "null")); } catch { /* Geçersiz veri seçim değildir. */ }
  }
  return onay && (eylem === "sec" || eylem === "onayla") ? { eylem, onay } : null;
}
const ayni = (a: BakimOnayi, b: BakimOnayi): boolean => a.oncekiDuzey === b.oncekiDuzey && a.duzey === b.duzey;

export class BakimPaneli {
  private onay: BakimOnayi | null = null;
  private bekliyor = false;
  private hata = "";
  private sonuc = "";
  private gorulen: BakimEylemi | null = null;
  constructor(private readonly p: BakimPanelParam) {}

  get durum(): { onay: Readonly<BakimOnayi> | null; bekliyor: boolean; hata: string } {
    return { onay: this.onay ? { ...this.onay } : null, bekliyor: this.bekliyor, hata: this.hata };
  }
  private mevcut(): BakimDuzeyi | undefined {
    const d = this.p.isletme()?.bakimDuzeyi;
    if (!bakimDuzeyiGecerli(d)) return undefined;
    return d;
  }
  private reddet(mesaj: string): void { this.hata = mesaj; this.p.bildir?.(mesaj, "hata"); this.p.degisti(); }
  teklifYakala(t: HTMLElement): void { this.gorulen = bakimEylemiOku(t); }
  eylemOku(t: HTMLElement): BakimEylemi | null {
    const simdiki = bakimEylemiOku(t), gorulen = this.gorulen;
    this.gorulen = null;
    if (simdiki && gorulen && simdiki.eylem !== gorulen.eylem) { this.reddet("Görülen bakım eylemi değişmiş. Tercihini yeniden incele."); return null; }
    return simdiki && gorulen ? gorulen : simdiki;
  }
  html(): string {
    const duzey = this.mevcut();
    const bk = this.p.ic.param.sanayi?.bakim;
    const hiz = this.p.ic.param.mulk?.bakim?.asinmaHizCarpaniPpm ?? 1_000_000;
    const etkiler: BakimDuzeyiEtkisi[] = [0, 1, 2].map((d) => {
      const satir = bk?.duzeyler[d];
      return { duzey: d as BakimDuzeyi, ...(satir ? { girdiPpm: satir.girdiPpm, asinmaPpmGun: carpBol(satir.asinmaPpmGun, hiz, 1_000_000) } : {}) };
    });
    return bakimGorunumuHtml({ ...(duzey === undefined ? {} : { duzey }), destek: this.p.komut !== undefined, etkiler, onay: this.onay, bekliyor: this.bekliyor, degisti: this.onay !== null && duzey !== this.onay.oncekiDuzey, hata: this.hata, sonuc: this.sonuc });
  }
  async eylem(e: BakimEylemi): Promise<void> {
    if (this.bekliyor) return;
    if (e.eylem === "vazgec") { this.kapat(); return; }
    const o = onayOku(e.onay);
    if (!o) return;
    const mevcut = this.mevcut();
    if (!this.p.komut || mevcut === undefined) { this.reddet("Güncel bakım bilgisi veya değişiklik bağlantısı henüz hazır değil."); return; }
    if (e.eylem === "sec") {
      if (this.onay) return;
      this.onay = { ...o };
      this.hata = mevcut === o.oncekiDuzey ? "" : "Bakım düzeyi değişmiş. Vazgeçip güncel tercihi yeniden incele.";
      this.sonuc = "";
      this.p.odak?.(true);
      this.p.degisti();
      return;
    }
    if (!this.onay || !ayni(this.onay, o)) { this.reddet("Görülen bakım onayı değişmiş. Tercihini yeniden incele."); return; }
    if (mevcut !== o.oncekiDuzey) { this.reddet("Bakım düzeyi değişmiş. Vazgeçip güncel tercihi yeniden incele."); return; }
    this.bekliyor = true;
    this.hata = "";
    this.p.degisti();
    try {
      const r = await this.p.komut({ ...o });
      if (r.tamam) {
        this.onay = null;
        this.sonuc = `${BAKIM_ADLARI[o.duzey]} bakım tercihi kabul edildi.`;
        this.p.odak?.(false);
        this.p.bildir?.(this.sonuc, "bilgi");
      } else this.reddet(r.mesaj);
    } catch { this.reddet("Bakım değişikliğinin yanıtı alınamadı. Güncel sunucu durumunu incele."); }
    finally { this.bekliyor = false; this.p.degisti(); }
  }
  kapat(): void {
    if (this.bekliyor || !this.onay) return;
    this.onay = null;
    this.hata = "";
    this.p.odak?.(false);
    this.p.degisti();
  }
  odagiYakala(kok: ParentNode): (() => void) | null {
    const a = typeof document === "undefined" ? null : document.activeElement;
    if (!(a instanceof HTMLElement) || !a.closest(".bkp-panel")) return null;
    const b = a.closest<HTMLElement>("[data-bakim-eylem]");
    const eylem = b?.dataset["bakimEylem"], duzey = b?.dataset["duzey"];
    const acikti = kok.querySelector(".bkp-onay") !== null;
    return () => {
      const panel = kok.querySelector<HTMLElement>(".bkp-panel");
      if (!panel) return;
      const secenekler = [...panel.querySelectorAll<HTMLElement>("[data-bakim-eylem]")].filter((x) => !x.hasAttribute("disabled"));
      const eski = secenekler.find((x) => x.dataset["bakimEylem"] === eylem && (eylem !== "sec" || x.dataset["duzey"] === duzey));
      const hedef = this.onay ? (acikti ? eski : undefined) ?? panel.querySelector<HTMLElement>("[data-bakim-varsayilan-odak]:not(:disabled)") : eski ?? panel.querySelector<HTMLElement>("[data-bakim-baslik]");
      hedef?.focus({ preventScroll: true });
    };
  }
}

/** Seçili maden malı için sunucu sondaj teklifini ayrı onayla başlatır. */
import type { AramaSondajiIstegi, IsletmeDurumu, SondajTeklifi, TesisSonucu } from "./baglanti";
import { sondajEngelMetni, sondajGorunumuHtml } from "./sondaj-gorunum";

export type SondajOnayi = AramaSondajiIstegi;
export type SondajEylemi =
  | { eylem: "ac" | "onayla"; onay: SondajOnayi }
  | { eylem: "vazgec"; bolge: string; mal: string };
export interface SondajPanelParam {
  mal: () => string;
  isletme: () => IsletmeDurumu | null;
  komut?: (i: AramaSondajiIstegi) => Promise<TesisSonucu>;
  degisti: () => void;
  bildir?: (metin: string, tur: "bilgi" | "hata") => void;
  odak?: (bolge: string, mal: string, onay: boolean) => void;
  bolgeAdi?: (bolge: string, il: string) => string;
  malAdi?: (mal: string) => string;
}

const tam = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

/** Teklifin hiçbir tutarı, süresi veya olasılığı istemcide hesaplanmaz. */
function teklifOku(v: unknown): SondajTeklifi | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o["mal"] !== "string" || !o["mal"] || !tam(o["kullanilanHak"]) || !tam(o["hakTavani"]) || !tam(o["paraMili"]) || !tam(o["temelSureMs"]) || !tam(o["sureMs"]) || !tam(o["olasilikPpm"]) || o["olasilikPpm"] > 1_000_000 || !tam(o["ekMinPpm"]) || !tam(o["ekMaxPpm"]) || o["ekMinPpm"] > o["ekMaxPpm"] || !Array.isArray(o["malMaliyeti"])) return null;
  const malMaliyeti: SondajTeklifi["malMaliyeti"] = [];
  const mallar = new Set<string>();
  for (const m of o["malMaliyeti"] as unknown[]) {
    if (!Array.isArray(m) || m.length !== 2 || typeof m[0] !== "string" || !m[0] || !tam(m[1]) || m[1] === 0 || mallar.has(m[0])) return null;
    mallar.add(m[0]);
    malMaliyeti.push([m[0], m[1]]);
  }
  return {
    mal: o["mal"], kullanilanHak: o["kullanilanHak"], hakTavani: o["hakTavani"], paraMili: o["paraMili"], malMaliyeti,
    temelSureMs: o["temelSureMs"], sureMs: o["sureMs"], olasilikPpm: o["olasilikPpm"], ekMinPpm: o["ekMinPpm"], ekMaxPpm: o["ekMaxPpm"],
  };
}
function onayOku(v: unknown): SondajOnayi | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o["bolge"] !== "string" || !o["bolge"] || typeof o["mal"] !== "string" || !o["mal"]) return null;
  const gorulenTeklif = teklifOku(o["gorulenTeklif"]);
  return gorulenTeklif && gorulenTeklif.mal === o["mal"] ? { bolge: o["bolge"], mal: o["mal"], gorulenTeklif } : null;
}

/** Güncel süre tahmini eşitlik dışıdır; onayda görülen tahmin yine korunur. */
export function sondajTeklifleriAyni(a: SondajTeklifi, b: SondajTeklifi): boolean {
  return a.mal === b.mal && a.kullanilanHak === b.kullanilanHak && a.hakTavani === b.hakTavani && a.paraMili === b.paraMili
    && a.temelSureMs === b.temelSureMs && a.olasilikPpm === b.olasilikPpm && a.ekMinPpm === b.ekMinPpm && a.ekMaxPpm === b.ekMaxPpm
    && a.malMaliyeti.length === b.malMaliyeti.length && a.malMaliyeti.every((m, i) => m[0] === b.malMaliyeti[i]![0] && m[1] === b.malMaliyeti[i]![1]);
}
const ayniOnay = (a: SondajOnayi, b: SondajOnayi): boolean => a.bolge === b.bolge && a.mal === b.mal && sondajTeklifleriAyni(a.gorulenTeklif, b.gorulenTeklif);

export function sondajEylemiOku(t: HTMLElement): SondajEylemi | null {
  const b = t.closest<HTMLElement>("[data-sondaj-eylem]");
  if (!b || b.hasAttribute("disabled") || b.getAttribute("aria-disabled") === "true") return null;
  const eylem = b.dataset["sondajEylem"], bolge = b.dataset["bolge"], mal = b.dataset["mal"];
  if (eylem === "vazgec") return bolge && mal ? { eylem, bolge, mal } : null;
  if (eylem !== "ac" && eylem !== "onayla") return null;
  try {
    const onay = onayOku(JSON.parse(b.dataset["sondajOnayi"] ?? "null"));
    return onay && onay.bolge === bolge && onay.mal === mal ? { eylem, onay } : null;
  } catch { return null; }
}

export class SondajPaneli {
  private onay: SondajOnayi | null = null;
  private bekliyor = false;
  private hata = "";
  private sonuc = "";
  private gorulen: SondajEylemi | null = null;
  private readonly acikDetaylar = new Set<string>();
  constructor(private readonly p: SondajPanelParam) {}

  get durum(): { onay: SondajOnayi | null; bekliyor: boolean; hata: string } {
    return { onay: this.onay ? onayOku(this.onay) : null, bekliyor: this.bekliyor, hata: this.hata };
  }
  private kaynak(bolge: string) { return this.p.isletme()?.sondajTeklifleri?.find((k) => k.bolge === bolge); }
  private teklif(bolge: string, mal: string) { return this.kaynak(bolge)?.sondaj?.teklifler.find((k) => k.teklif.mal === mal); }
  private engel(o: SondajOnayi): string | null {
    if (this.p.mal() !== o.mal) return "Seçili mal değişmiş. Vazgeçip bu malın güncel sondaj teklifini yeniden incele.";
    const satir = this.teklif(o.bolge, o.mal), teklif = teklifOku(satir?.teklif);
    if (!satir || !teklif) return "Bu işletmenin güncel sondaj teklifi alınmadı. Vazgeçip işletmeyi yeniden incele.";
    if (!sondajTeklifleriAyni(teklif, o.gorulenTeklif)) return "Sondaj teklifi değişmiş. Vazgeçip güncel bedeli ve kalan hakkı yeniden incele.";
    if (satir.uygun !== true) return satir.engel ? sondajEngelMetni(satir.engel) : "Bu işletmede bu mal için sondaj şu an başlatılamıyor.";
    return null;
  }
  private reddet(mesaj: string): void { this.hata = mesaj; this.p.bildir?.(mesaj, "hata"); this.p.degisti(); }
  private detaylariYakala(kok: ParentNode): void {
    for (const d of kok.querySelectorAll<HTMLDetailsElement>(".sdj-panel details[data-sondaj-detay]")) {
      const anahtar = d.dataset["sondajDetay"];
      if (!anahtar) continue;
      if (d.open) this.acikDetaylar.add(anahtar);
      else this.acikDetaylar.delete(anahtar);
    }
  }

  teklifYakala(t: HTMLElement): void { this.gorulen = sondajEylemiOku(t); }
  eylemOku(t: HTMLElement): SondajEylemi | null {
    const simdiki = sondajEylemiOku(t), gorulen = this.gorulen;
    this.gorulen = null;
    if (simdiki && gorulen) {
      const ayni = simdiki.eylem === "vazgec" && gorulen.eylem === "vazgec"
        ? simdiki.bolge === gorulen.bolge && simdiki.mal === gorulen.mal
        : simdiki.eylem !== "vazgec" && gorulen.eylem !== "vazgec" && simdiki.eylem === gorulen.eylem && ayniOnay(simdiki.onay, gorulen.onay);
      if (!ayni) { this.reddet("Görülen sondaj eylemi değişmiş. Güncel teklifi yeniden incele."); return null; }
      return gorulen;
    }
    return simdiki;
  }

  html(): string {
    if (typeof document !== "undefined") this.detaylariYakala(document);
    const d = this.p.isletme(), kaynaklar = d?.sondajTeklifleri, isler = d?.sondaj?.isler;
    const guncel = this.onay ? teklifOku(this.teklif(this.onay.bolge, this.onay.mal)?.teklif) : null;
    return sondajGorunumuHtml({
      mal: this.p.mal(),
      ...(kaynaklar === undefined ? {} : { kaynaklar }),
      ...(isler === undefined ? {} : { isler }),
      onay: this.onay ? onayOku(this.onay) : null,
      bekliyor: this.bekliyor,
      acikDetaylar: this.acikDetaylar,
      destek: this.p.komut !== undefined,
      degisti: this.onay !== null && (this.p.mal() !== this.onay.mal || guncel === null || !sondajTeklifleriAyni(guncel, this.onay.gorulenTeklif)),
      hata: this.hata,
      sonuc: this.sonuc,
      ...(this.p.bolgeAdi ? { bolgeAdi: this.p.bolgeAdi } : {}),
      ...(this.p.malAdi ? { malAdi: this.p.malAdi } : {}),
    });
  }

  async eylem(e: SondajEylemi): Promise<void> {
    if (this.bekliyor) return;
    if (e.eylem === "vazgec") { this.kapat(e.bolge, e.mal); return; }
    const o = onayOku(e.onay);
    if (!o) return;
    if (!this.p.komut) { this.reddet("Bu bağlantıda sondaj başlatılamıyor."); return; }
    const engel = this.engel(o);
    if (engel) { this.reddet(engel); return; }
    if (e.eylem === "ac") {
      if (this.onay) return;
      this.onay = o;
      this.hata = "";
      this.sonuc = "";
      this.p.odak?.(o.bolge, o.mal, true);
      this.p.degisti();
      return;
    }
    if (!this.onay || !ayniOnay(this.onay, o)) { this.reddet("Görülen sondaj onayı değişmiş. Tercihini yeniden incele."); return; }
    this.bekliyor = true;
    this.hata = "";
    this.p.degisti();
    try {
      // Onay tahmini yerinde kalır; komut görülmüş teklifin ayrı derin kopyasını alır.
      const r = await this.p.komut(onayOku(this.onay)!);
      if (r.tamam) {
        this.onay = null;
        this.sonuc = "Sondaj isteği kabul edildi. Kesin bitiş ve sonuç sunucu iş kaydından gösterilir.";
        this.p.odak?.(o.bolge, o.mal, false);
        this.p.bildir?.(this.sonuc, "bilgi");
      } else this.reddet(r.mesaj);
    } catch { this.reddet("Sondaj yanıtı alınamadı. Yeniden işlem yapmadan güncel sunucu durumunu incele."); }
    finally { this.bekliyor = false; this.p.degisti(); }
  }

  kapat(bolge?: string, mal?: string): void {
    if (this.bekliyor || !this.onay || (bolge !== undefined && bolge !== this.onay.bolge) || (mal !== undefined && mal !== this.onay.mal)) return;
    const eski = this.onay;
    this.onay = null;
    this.hata = "";
    this.p.odak?.(eski.bolge, eski.mal, false);
    this.p.degisti();
  }

  odagiYakala(kok: ParentNode): (() => void) | null {
    this.detaylariYakala(kok);
    if (typeof document === "undefined" || typeof HTMLElement === "undefined") return null;
    const a = document.activeElement;
    if (!(a instanceof HTMLElement) || !a.closest(".sdj-panel")) return null;
    const b = a.closest<HTMLElement>("[data-sondaj-eylem]");
    const bolge = b?.dataset["bolge"] ?? a.closest<HTMLElement>("[data-bolge]")?.dataset["bolge"];
    const mal = b?.dataset["mal"] ?? a.closest<HTMLElement>("[data-mal]")?.dataset["mal"];
    const eylem = b?.dataset["sondajEylem"];
    const detay = a.tagName === "SUMMARY" ? a.closest<HTMLDetailsElement>("details[data-sondaj-detay]")?.dataset["sondajDetay"] : undefined;
    const acikti = kok.querySelector("[data-sondaj-onay]") !== null;
    return () => {
      const panel = kok.querySelector<HTMLElement>(".sdj-panel");
      if (!panel) return;
      const ayniKaynak = (x: HTMLElement): boolean => x.dataset["bolge"] === bolge && x.dataset["mal"] === mal;
      const eski = [...panel.querySelectorAll<HTMLElement>("[data-sondaj-eylem]:not(:disabled)")].find((x) => ayniKaynak(x) && x.dataset["sondajEylem"] === eylem);
      const baslik = [...panel.querySelectorAll<HTMLElement>("[data-sondaj-baslik]")].find(ayniKaynak) ?? panel.querySelector<HTMLElement>("[data-sondaj-baslik]");
      if (detay !== undefined) {
        const d = [...panel.querySelectorAll<HTMLDetailsElement>("details[data-sondaj-detay]")].find((x) => x.dataset["sondajDetay"] === detay);
        const summary = d?.querySelector<HTMLElement>("summary");
        if (summary) { summary.focus({ preventScroll: true }); return; }
      }
      const hedef = this.onay ? (acikti ? eski : undefined) ?? panel.querySelector<HTMLElement>("[data-sondaj-varsayilan-odak]:not(:disabled)") ?? baslik : eski ?? baslik;
      hedef?.focus({ preventScroll: true });
    };
  }
}

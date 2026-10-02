/** Bir il işletmesinin sunucu teklifini ayrı onayla uygulayan genel onarım controller'ı. */
import type { GenelOnarimIstegi, GenelOnarimTeklifi, IsletmeDurumu, TesisSonucu } from "./baglanti";
import { onarimEngelMetni, onarimGorunumuHtml } from "./onarim-gorunum";

export type OnarimOnayi = GenelOnarimIstegi;
export type OnarimEylemi =
  | { eylem: "ac" | "onayla"; onay: OnarimOnayi }
  | { eylem: "vazgec"; bolge: string };
export interface OnarimPanelParam {
  isletme: () => IsletmeDurumu | null;
  komut?: (i: GenelOnarimIstegi) => Promise<TesisSonucu>;
  degisti: () => void;
  bildir?: (metin: string, tur: "bilgi" | "hata") => void;
  odak?: (bolge: string, onay: boolean) => void;
  bolgeAdi?: (bolge: string, il: string) => string;
  tesisAdi?: (tesis: GenelOnarimTeklifi["tesisler"][number], bolge: string) => string;
  malAdi?: (mal: string) => string;
}

const tam = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

/** Sunucu teklifi kopyalanır; maliyet, hedef veya süre istemcide türetilmez. */
function teklifOku(o: unknown): GenelOnarimTeklifi | null {
  if (!o || typeof o !== "object" || Array.isArray(o) || !("tesisler" in o) || !("paraMili" in o) || !("mal" in o) || !("durusMs" in o)) return null;
  if (!tam(o.paraMili) || !tam(o.durusMs) || !Array.isArray(o.tesisler) || o.tesisler.length === 0 || !Array.isArray(o.mal)) return null;
  const tesisler: GenelOnarimTeklifi["tesisler"] = [];
  const kimlikler = new Set<number>();
  for (const t of o.tesisler as unknown[]) {
    if (!t || typeof t !== "object" || Array.isArray(t) || !("tesis" in t) || !("tur" in t) || !("olcek" in t) || !tam(t.tesis) || typeof t.tur !== "string" || !t.tur || (t.olcek !== 0 && t.olcek !== 1 && t.olcek !== 2) || kimlikler.has(t.tesis)) return null;
    kimlikler.add(t.tesis);
    tesisler.push({ tesis: t.tesis, tur: t.tur, olcek: t.olcek });
  }
  const mal: GenelOnarimTeklifi["mal"] = [];
  const mallar = new Set<string>();
  for (const m of o.mal as unknown[]) {
    if (!Array.isArray(m) || m.length !== 2 || typeof m[0] !== "string" || !m[0] || !tam(m[1]) || m[1] === 0 || mallar.has(m[0])) return null;
    mallar.add(m[0]);
    mal.push([m[0], m[1]]);
  }
  return { tesisler, paraMili: o.paraMili, mal, durusMs: o.durusMs };
}

function onayOku(o: unknown): OnarimOnayi | null {
  if (!o || typeof o !== "object" || Array.isArray(o) || !("bolge" in o) || typeof o.bolge !== "string" || !o.bolge || !("gorulenTeklif" in o)) return null;
  const gorulenTeklif = teklifOku(o.gorulenTeklif);
  return gorulenTeklif ? { bolge: o.bolge, gorulenTeklif } : null;
}

/** Kanonik sunucu dizilerinin sırası dahil görülen teklif birebir korunur. */
export function onarimTeklifleriAyni(a: GenelOnarimTeklifi, b: GenelOnarimTeklifi): boolean {
  return a.paraMili === b.paraMili && a.durusMs === b.durusMs && a.tesisler.length === b.tesisler.length && a.mal.length === b.mal.length
    && a.tesisler.every((t, i) => { const x = b.tesisler[i]!; return t.tesis === x.tesis && t.tur === x.tur && t.olcek === x.olcek; })
    && a.mal.every((m, i) => m[0] === b.mal[i]![0] && m[1] === b.mal[i]![1]);
}
const ayniOnay = (a: OnarimOnayi, b: OnarimOnayi): boolean => a.bolge === b.bolge && onarimTeklifleriAyni(a.gorulenTeklif, b.gorulenTeklif);

export function onarimEylemiOku(t: HTMLElement): OnarimEylemi | null {
  const b = t.closest<HTMLElement>("[data-onarim-eylem]");
  if (!b || b.hasAttribute("disabled") || b.getAttribute("aria-disabled") === "true") return null;
  const eylem = b.dataset["onarimEylem"], bolge = b.dataset["bolge"];
  if (eylem === "vazgec") return bolge ? { eylem, bolge } : null;
  if (eylem !== "ac" && eylem !== "onayla") return null;
  try {
    const onay = onayOku(JSON.parse(b.dataset["onarimOnayi"] ?? "null"));
    return onay && onay.bolge === bolge ? { eylem, onay } : null;
  } catch { return null; }
}

export class OnarimPaneli {
  private onay: OnarimOnayi | null = null;
  private bekliyor = false;
  private hata = "";
  private sonuc = "";
  private gorulen: OnarimEylemi | null = null;
  constructor(private readonly p: OnarimPanelParam) {}

  get durum(): { onay: OnarimOnayi | null; bekliyor: boolean; hata: string } {
    return { onay: this.onay ? onayOku(this.onay) : null, bekliyor: this.bekliyor, hata: this.hata };
  }
  private kaynak(bolge: string) { return this.p.isletme()?.onarimTeklifleri?.find((k) => k.bolge === bolge); }
  private guncelTeklif(bolge: string): GenelOnarimTeklifi | null { return teklifOku(this.kaynak(bolge)?.onarim?.teklif); }
  private engel(onay: OnarimOnayi): string | null {
    const kaynak = this.kaynak(onay.bolge);
    const teklif = teklifOku(kaynak?.onarim?.teklif);
    if (!kaynak?.onarim || !teklif) return "Bu işletmenin güncel onarım teklifi alınmadı. Vazgeçip işletmeyi yeniden incele.";
    if (!onarimTeklifleriAyni(teklif, onay.gorulenTeklif)) return "Onarım teklifi değişmiş. Vazgeçip güncel tesisleri ve bedeli yeniden incele.";
    if (kaynak.onarim.suruyor) return "Bu işletmede onarım zaten sürüyor.";
    if (kaynak.onarim.uygun !== true) return kaynak.onarim.engel ? onarimEngelMetni(kaynak.onarim.engel) : "Bu işletmede genel onarım şu an başlatılamıyor.";
    return null;
  }
  private reddet(mesaj: string): void { this.hata = mesaj; this.p.bildir?.(mesaj, "hata"); this.p.degisti(); }

  teklifYakala(t: HTMLElement): void { this.gorulen = onarimEylemiOku(t); }
  eylemOku(t: HTMLElement): OnarimEylemi | null {
    const simdiki = onarimEylemiOku(t), gorulen = this.gorulen;
    this.gorulen = null;
    if (simdiki && gorulen) {
      const ayni = simdiki.eylem === "vazgec" && gorulen.eylem === "vazgec"
        ? simdiki.bolge === gorulen.bolge
        : simdiki.eylem !== "vazgec" && gorulen.eylem !== "vazgec" && simdiki.eylem === gorulen.eylem && ayniOnay(simdiki.onay, gorulen.onay);
      if (!ayni) { this.reddet("Görülen onarım eylemi değişmiş. Güncel teklifi yeniden incele."); return null; }
      return gorulen;
    }
    return simdiki;
  }

  html(): string {
    const kaynaklar = this.p.isletme()?.onarimTeklifleri;
    const guncel = this.onay ? this.guncelTeklif(this.onay.bolge) : null;
    return onarimGorunumuHtml({
      ...(kaynaklar === undefined ? {} : { kaynaklar }),
      onay: this.onay ? onayOku(this.onay) : null,
      bekliyor: this.bekliyor,
      destek: this.p.komut !== undefined,
      degisti: this.onay !== null && (guncel === null || !onarimTeklifleriAyni(guncel, this.onay.gorulenTeklif)),
      hata: this.hata,
      sonuc: this.sonuc,
      ...(this.p.bolgeAdi ? { bolgeAdi: this.p.bolgeAdi } : {}),
      ...(this.p.tesisAdi ? { tesisAdi: this.p.tesisAdi } : {}),
      ...(this.p.malAdi ? { malAdi: this.p.malAdi } : {}),
    });
  }

  async eylem(e: OnarimEylemi): Promise<void> {
    if (this.bekliyor) return;
    if (e.eylem === "vazgec") { this.kapat(e.bolge); return; }
    const o = onayOku(e.onay);
    if (!o) return;
    if (!this.p.komut) { this.reddet("Bu bağlantıda genel onarım başlatılamıyor."); return; }
    const engel = this.engel(o);
    if (engel) { this.reddet(engel); return; }
    if (e.eylem === "ac") {
      if (this.onay) return;
      this.onay = o;
      this.hata = "";
      this.sonuc = "";
      this.p.odak?.(o.bolge, true);
      this.p.degisti();
      return;
    }
    if (!this.onay || !ayniOnay(this.onay, o)) { this.reddet("Görülen onarım onayı değişmiş. Tercihini yeniden incele."); return; }
    this.bekliyor = true;
    this.hata = "";
    this.p.degisti();
    try {
      // Komut yeni bir derin kopya alır; açık onay ve özel kare aynı nesneyi paylaşmaz.
      const r = await this.p.komut(onayOku(o)!);
      if (r.tamam) {
        this.onay = null;
        this.sonuc = "Genel onarım isteği kabul edildi. Güncel onarım durumu sunucudan gösterilir.";
        this.p.odak?.(o.bolge, false);
        this.p.bildir?.(this.sonuc, "bilgi");
      } else this.reddet(r.mesaj);
    } catch { this.reddet("Onarım yanıtı alınamadı. Yeniden işlem yapmadan güncel sunucu durumunu incele."); }
    finally { this.bekliyor = false; this.p.degisti(); }
  }

  kapat(bolge?: string): void {
    if (this.bekliyor || !this.onay || (bolge !== undefined && bolge !== this.onay.bolge)) return;
    const eski = this.onay.bolge;
    this.onay = null;
    this.hata = "";
    this.p.odak?.(eski, false);
    this.p.degisti();
  }

  odagiYakala(kok: ParentNode): (() => void) | null {
    if (typeof document === "undefined" || typeof HTMLElement === "undefined") return null;
    const a = document.activeElement;
    if (!(a instanceof HTMLElement) || !a.closest(".onr-panel")) return null;
    const b = a.closest<HTMLElement>("[data-onarim-eylem]");
    const bolge = b?.dataset["bolge"] ?? a.closest<HTMLElement>("[data-bolge]")?.dataset["bolge"];
    const eylem = b?.dataset["onarimEylem"];
    const acikti = kok.querySelector("[data-onarim-onay]") !== null;
    return () => {
      const panel = kok.querySelector<HTMLElement>(".onr-panel");
      if (!panel) return;
      const eski = [...panel.querySelectorAll<HTMLElement>("[data-onarim-eylem]:not(:disabled)")].find((x) => x.dataset["bolge"] === bolge && x.dataset["onarimEylem"] === eylem);
      const baslik = [...panel.querySelectorAll<HTMLElement>("[data-onarim-baslik]")].find((x) => x.dataset["bolge"] === bolge) ?? panel.querySelector<HTMLElement>("[data-onarim-baslik]");
      const hedef = this.onay ? (acikti ? eski : undefined) ?? panel.querySelector<HTMLElement>("[data-onarim-varsayilan-odak]:not(:disabled)") ?? baslik : eski ?? baslik;
      hedef?.focus({ preventScroll: true });
    };
  }
}

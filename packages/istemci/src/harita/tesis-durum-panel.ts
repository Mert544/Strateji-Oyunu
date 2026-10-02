/** Sahibinin gerçek üretim tesisinin çalışma durumunu ayrı onayla değiştirir. */
import type { Icerik } from "../komut/tablo";
import type { IsletmeDurumu, IsletmeYapisi, TesisDurumDegistirIstegi, TesisSonucu } from "./baglanti";
import { tesisDurumGorunumuHtml } from "./tesis-durum-gorunum";

export interface TesisDurumOnayi {
  tesis: string;
  bolge: string;
  oncekiAktif: boolean;
  aktif: boolean;
}
export type TesisDurumEylemi =
  | { eylem: "ac" | "onayla"; onay: TesisDurumOnayi }
  | { eylem: "vazgec"; tesis: string };
export interface TesisDurumPanelParam {
  ic: Icerik;
  isletme: () => IsletmeDurumu | null;
  tesisAdi: (yapi: IsletmeYapisi) => string;
  komut: (istek: TesisDurumDegistirIstegi) => Promise<TesisSonucu>;
  degisti: () => void;
  bildir: (metin: string, tur: "bilgi" | "hata") => void;
  odak?: (tesis: string, onay: boolean) => void;
}

/** İnşaat, bilinmeyen durum/yöntem ve üretim çıktısı olmayan yardımcı yapılar kapsam dışıdır. */
export function tesisDurumUygunMu(ic: Icerik, y: IsletmeYapisi): boolean {
  if (y.durum !== "tesis" || !/^t(?:0|[1-9]\d*)$/.test(y.anahtar) || !Number.isSafeInteger(Number(y.anahtar.slice(1))) || !y.bolge || typeof y.aktif !== "boolean" || y.yontem === undefined) return false;
  const tur = ic.turler[ic.turIdx[y.tur] ?? -1];
  const yontem = ic.yontemler[ic.yontemIdx[y.yontem] ?? -1];
  return tur !== undefined && yontem !== undefined && tur.yontemler.includes(yontem.indeks) && yontem.cikti.some(([, miktar]) => miktar > 0);
}

function onayOku(o: unknown): TesisDurumOnayi | null {
  if (!o || typeof o !== "object" || !("tesis" in o) || !("bolge" in o) || !("oncekiAktif" in o) || !("aktif" in o)) return null;
  if (typeof o.tesis !== "string" || !/^t(?:0|[1-9]\d*)$/.test(o.tesis) || !Number.isSafeInteger(Number(o.tesis.slice(1))) || typeof o.bolge !== "string" || !o.bolge || typeof o.oncekiAktif !== "boolean" || typeof o.aktif !== "boolean" || o.aktif === o.oncekiAktif) return null;
  return { tesis: o.tesis, bolge: o.bolge, oncekiAktif: o.oncekiAktif, aktif: o.aktif };
}

export function tesisDurumEylemiOku(t: HTMLElement): TesisDurumEylemi | null {
  const b = t.closest<HTMLElement>("[data-tesis-durum-eylem]");
  if (!b || b.hasAttribute("disabled") || b.getAttribute("aria-disabled") === "true") return null;
  const eylem = b.dataset["tesisDurumEylem"];
  if (eylem === "vazgec") return b.dataset["tesis"] ? { eylem, tesis: b.dataset["tesis"] } : null;
  let onay: TesisDurumOnayi | null = null;
  if (eylem === "ac") {
    const onceki = b.dataset["aktif"], hedef = b.dataset["hedefAktif"];
    if ((onceki === "true" || onceki === "false") && (hedef === "true" || hedef === "false")) onay = onayOku({ tesis: b.dataset["tesis"], bolge: b.dataset["bolge"], oncekiAktif: onceki === "true", aktif: hedef === "true" });
  } else if (eylem === "onayla") {
    try { onay = onayOku(JSON.parse(b.dataset["tesisDurumOnayi"] ?? "null")); } catch { /* Geçersiz onay eylem değildir. */ }
  }
  return onay && (eylem === "ac" || eylem === "onayla") ? { eylem, onay } : null;
}

const ayniOnay = (a: TesisDurumOnayi, b: TesisDurumOnayi): boolean => a.tesis === b.tesis && a.bolge === b.bolge && a.oncekiAktif === b.oncekiAktif && a.aktif === b.aktif;

export class TesisDurumPaneli {
  private onay: TesisDurumOnayi | null = null;
  private onayAdi = "";
  private hata = "";
  private bekliyor = false;
  private gorulen: TesisDurumEylemi | null = null;

  constructor(private readonly p: TesisDurumPanelParam) {}

  get durum(): { onay: Readonly<TesisDurumOnayi> | null; bekliyor: boolean; hata: string } {
    return { onay: this.onay ? { ...this.onay } : null, bekliyor: this.bekliyor, hata: this.hata };
  }

  private tesis(id: string): IsletmeYapisi | undefined {
    return this.p.isletme()?.yapilar.find((y) => y.anahtar === id && tesisDurumUygunMu(this.p.ic, y));
  }

  teklifYakala(t: HTMLElement): void { this.gorulen = tesisDurumEylemiOku(t); }

  eylemOku(t: HTMLElement): TesisDurumEylemi | null {
    const simdiki = tesisDurumEylemiOku(t), gorulen = this.gorulen;
    this.gorulen = null;
    if (simdiki && gorulen && gorulen.eylem !== simdiki.eylem) {
      this.reddet("Görülen tesis eylemi değişmiş. Kararını yeniden incele.");
      return null;
    }
    return simdiki && gorulen?.eylem === simdiki.eylem ? gorulen : simdiki;
  }

  satirParcalari(y: IsletmeYapisi): { dugme: string; alt: string } {
    const uygun = tesisDurumUygunMu(this.p.ic, y);
    const onay = this.onay?.tesis === y.anahtar ? this.onay : null;
    if (!uygun && !onay) return { dugme: "", alt: "" };
    const degisti = onay !== null && (!uygun || onay.bolge !== y.bolge || onay.oncekiAktif !== y.aktif);
    const parcalar = tesisDurumGorunumuHtml({
      tesis: y.anahtar,
      bolge: onay?.bolge ?? y.bolge!,
      tesisAdi: onay ? this.onayAdi : this.p.tesisAdi(y),
      acik: onay !== null,
      aktif: onay?.oncekiAktif ?? y.aktif!,
      hedefAktif: onay?.aktif ?? !y.aktif,
      bekliyor: this.bekliyor,
      ...(onay ? { hata: this.hata, degisti } : {}),
    });
    return uygun ? parcalar : { dugme: "", alt: parcalar.alt };
  }

  private reddet(mesaj: string): void {
    this.hata = mesaj;
    if (!this.onay || !this.tesis(this.onay.tesis)) this.p.bildir(mesaj, "hata");
    this.p.degisti();
  }

  async eylem(e: TesisDurumEylemi): Promise<void> {
    if (this.bekliyor) return;
    if (e.eylem === "vazgec") {
      if (this.onay?.tesis !== e.tesis) return;
      this.kapat();
      return;
    }
    const gorulen = onayOku(e.onay);
    if (!gorulen) return;
    if (e.eylem === "ac") {
      const y = this.tesis(gorulen.tesis);
      if (!y || y.bolge !== gorulen.bolge) { this.p.bildir("Bu tesisin güncel üretim bilgisi alınmadı. Tesislerini yeniden incele.", "hata"); return; }
      this.onay = { ...gorulen };
      this.onayAdi = this.p.tesisAdi(y);
      this.hata = y.aktif === gorulen.oncekiAktif ? "" : "Tesisin çalışma durumu değişmiş. Vazgeçip güncel durumu yeniden incele.";
      this.p.odak?.(gorulen.tesis, true);
      this.p.degisti();
      return;
    }
    if (!this.onay || !ayniOnay(this.onay, gorulen)) { this.reddet("Görülen onay değişmiş. Tesis kararını yeniden incele."); return; }
    const y = this.tesis(gorulen.tesis);
    if (!y || y.bolge !== gorulen.bolge || y.aktif !== gorulen.oncekiAktif) { this.reddet("Tesisin çalışma durumu değişmiş. Vazgeçip güncel durumu yeniden incele."); return; }
    this.bekliyor = true;
    this.hata = "";
    this.p.degisti();
    try {
      const r = await this.p.komut({ bolge: gorulen.bolge, tesis: Number(gorulen.tesis.slice(1)), aktif: gorulen.aktif, oncekiAktif: gorulen.oncekiAktif });
      if (r.tamam) {
        this.p.odak?.(gorulen.tesis, false);
        this.onay = null;
        this.p.bildir(`${this.onayAdi} ${gorulen.aktif ? "başlatıldı" : "durduruldu"}.`, "bilgi");
      } else this.reddet(r.mesaj);
    } catch {
      this.reddet("Sunucuya ulaşılamadı. Tesisin güncel durumunu inceleyip yeniden deneyebilirsin.");
    } finally {
      this.bekliyor = false;
      this.p.degisti();
    }
  }

  kapat(): void {
    if (this.bekliyor || !this.onay) return;
    this.p.odak?.(this.onay.tesis, false);
    this.onay = null;
    this.hata = "";
    this.p.degisti();
  }

  odagiYakala(kok: ParentNode): (() => void) | null {
    const a = typeof document === "undefined" ? null : document.activeElement;
    if (!(a instanceof HTMLElement)) return null;
    const b = a.closest<HTMLElement>("[data-tesis-durum-eylem]");
    const tesis = b?.dataset["tesis"] ?? a.closest<HTMLElement>("[data-tesis-durum]")?.dataset["tesisDurum"];
    if (!tesis) return null;
    const eylem = b?.dataset["tesisDurumEylem"];
    const onayGorunurdu = [...kok.querySelectorAll<HTMLElement>("[data-tesis-durum]")].some((x) => x.dataset["tesisDurum"] === tesis);
    return () => {
      const secenekler = [...kok.querySelectorAll<HTMLElement>("[data-tesis-durum-eylem]")].filter((x) => x.dataset["tesis"] === tesis && !x.hasAttribute("disabled"));
      const hedef = this.onay?.tesis === tesis ? (onayGorunurdu ? secenekler.find((x) => x.dataset["tesisDurumEylem"] === eylem) : undefined) ?? secenekler.find((x) => x.hasAttribute("data-tesis-durum-varsayilan-odak")) : secenekler.find((x) => x.dataset["tesisDurumEylem"] === "ac");
      hedef?.focus({ preventScroll: true });
    };
  }
}

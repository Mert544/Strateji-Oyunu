/**
 * Dükkân paneli denetleyicisi (G9 B bağlama; saf: DOM yok): İşletmem'de seçilen dükkânın ayrıntısı (D-5 raf, D-6 kademe ve kampanya, D-7 marka, D-8 özet, D-8.1 menü ve kaldırma)
 * ve dükkân komutları. Durum bu sınıfta tutulur; HTML `dukkan-html.ts` üreteçlerinden gelir; her komut TEK `dukkanKomutu` çağrısıdır (ret Türkçe, `hata-mulk.ts`).
 *
 * - Komut kuruculari K2 köprüsündendir (`rafKomutu`, `fiyatKomutu`, `markaKomutu`); `dukkan_marka`, `dukkan_yik`, `insaat_iptal` burada kurulur (tutar/miktar yok, yalnız kimlik).
 * - Fiyat kademesi indeks olarak gider (tutar değil); kampanya kademe 0'dır. Boş yuva pencere sürerken doldurulmaz (önleme: kapalı yuva + neden), sunucu yine reddeder.
 * - İnşadaki dükkânın kimliği negatiftir (`-inşaatKimliği`, köprü kuralı): iptal `insaat_iptal {insaat: -id}`.
 * - Marka: önce `marka_tanimla` (yeni marka dizini = tanımlı marka sayısı), sonra `dukkan_marka`; iki komut ayrıdır (ilki başarılı, ikincisi reddedilirse marka tanımlı kalır ve ret söylenir).
 * - Gönderim sürerken ikinci komut gönderilmez (`gonderiyor`); sonuç gelince panel yeniden çizilir (`degisti`).
 */
import type { Komut } from "@bolge/cekirdek";
import { esc, yuzde } from "../arayuz/bicim";
import { adHatasi } from "../giris/ad";
import type { Icerik } from "../komut/tablo";
import type { DukkanKomutSonucu } from "./baglanti";
import { bosaltOnayHtml, dukkanAdi, dukkanMenusuHtml, kademeHtml, kaldirOnayHtml, markaFormuHtml, etkinKasaPpm, ozetHtml, rafHtml, saatDakika, seciciHtml } from "./dukkan-html";
import type { SeciciMali } from "./dukkan-html";
import { fiyatKomutu, markaKomutu, rafKomutu } from "./dukkan-kopru";
import type { ReferansFiyati } from "./dukkan-kopru";
import { dukkanMetni } from "./dukkan-metin";
import type { DukkanGorunumu, DukkanKaydi, DukkanTuru } from "./dukkan-veri";

export interface DukkanPanelParam {
  /** Kasanın saatlik en çok satış birimi (S ölçek `kasaMiliSaat`; `D5.bilgi`). */
  kasaBirimSa: number;
  /** Fiyat/mal değişim penceresi (saat). */
  pencereSaat: number;
  /** İnşaat iptal iadesi ("%50"). */
  iadeYuzde: string;
  /** Esnaf payı ("%20"); veri yoksa tanımsız. */
  esnafPayiYuzde?: string;
  /** Rafa konan malın uygulanacak (Normal kademe) fiyat çarpanı (ppm; `fiyatKademeleriPpm[varsayilanFiyatKademesi]`): seçicide referans fiyat değil bu fiyat yazılır. */
  normalKademePpm: number;
}

/** Panel parametreleri içerikten (sabit yazılmaz); dükkân kuralı yoksa tanımsız. */
export function dukkanPanelParam(ic: Icerik): DukkanPanelParam | undefined {
  const mulk = ic.param.mulk;
  const pk = mulk?.perakende;
  if (mulk === undefined || pk === undefined) return undefined;
  const kasa = (pk.olcekler[0] as { kasaMiliSaat?: number } | undefined)?.kasaMiliSaat ?? 0;
  const esnaf = (pk as { esnaf?: { tabanPayPpm?: number } }).esnaf?.tabanPayPpm;
  const iade = (mulk as { insaatIptalIadePpm?: number }).insaatIptalIadePpm ?? 500_000;
  const kademeler = (pk as { fiyatKademeleriPpm?: readonly number[] }).fiyatKademeleriPpm ?? [];
  const varsayilan = (pk as { varsayilanFiyatKademesi?: number }).varsayilanFiyatKademesi ?? 2;
  return {
    normalKademePpm: kademeler[varsayilan] ?? 1_000_000,
    kasaBirimSa: Math.round(kasa / 1000),
    pencereSaat: pk.fiyatDegisimEnAzSaat,
    iadeYuzde: yuzde(iade / 10_000),
    ...(esnaf ? { esnafPayiYuzde: yuzde(esnaf / 10_000) } : {}),
  };
}

export interface DukkanPaneliGirdisi {
  gorunum: () => DukkanGorunumu | null;
  malAdi: (mal: string) => string;
  /** Şimdiki sim zamanı (ms). */
  simdi: () => number;
  /** Depo stoğu (mili-birim). */
  stokMili: (mal: string) => number;
  referans: ReferansFiyati;
  /** Türün sattığı mallar (içerikten; tür bilinmiyorsa boş). */
  turMallari: (tur: DukkanTuru | null) => readonly string[];
  komut: (k: Komut) => Promise<DukkanKomutSonucu>;
  param: DukkanPanelParam;
  /** Durum ya da sonuç değişti: panel yeniden çizilir. */
  degisti: () => void;
  bildir: (metin: string, tur: "bilgi" | "hata") => void;
  /** "Yapı kur" mini düğmesi (stok yokken yönlendirme). */
  yapiKur?: () => void;
}

/** DOM bağlayıcısının çıkardığı eylem: `data-*` öznitelikleri. */
export interface PanelEylemi {
  eylem: string;
  dukkan?: number;
  yuva?: number;
  mal?: string;
  kademe?: number;
  simge?: number;
  renk?: number;
  /** Öğe `aria-disabled`: etkisiz (boş yuvada neden söylenir, diğerlerinde hiçbir şey olmaz). */
  kapali?: boolean;
}

const EYLEMLER: ReadonlySet<string> = new Set(["dukkan-sec", "dukkan-rafa", "marka-ac", "marka-kaydet", "marka-yok", "kampanya", "yuva-bosalt", "yuva-bosalt-onayla", "onay-vazgec", "dukkan-kaldir", "dukkan-kaldir-onayla", "insaat-iptal", "insaat-iptal-onayla", "yapi-kur"]);

/** Tıklanan öğeden panel eylemi (`data-*`); dükkân paneli dışı öğede null. */
export function panelEylemiOku(t: Element): PanelEylemi | null {
  const say = (el: HTMLElement, ad: string): number => Number(el.dataset[ad]);
  const kapali = (el: Element): boolean => el.getAttribute("aria-disabled") === "true";
  const yuva = t.closest<HTMLElement>(".dk-yuva");
  if (yuva) return { eylem: "yuva", yuva: say(yuva, "yuva"), kapali: kapali(yuva) };
  const mal = t.closest<HTMLElement>(".dk-mal");
  if (mal) return { eylem: "mal", mal: mal.dataset["mal"] ?? "", kapali: kapali(mal) };
  const kademe = t.closest<HTMLElement>("[data-kademe]");
  if (kademe) return { eylem: "kademe", kademe: say(kademe, "kademe"), kapali: kapali(kademe) };
  const simge = t.closest<HTMLElement>("[data-simge]");
  if (simge) return { eylem: "simge", simge: say(simge, "simge") };
  const renk = t.closest<HTMLElement>("[data-renk]");
  if (renk) return { eylem: "renk", renk: say(renk, "renk") };
  if (t.closest("button.dk-menu")) return { eylem: "menu" };
  const e = t.closest<HTMLElement>("[data-eylem]");
  const ad = e?.dataset["eylem"];
  if (e && ad && EYLEMLER.has(ad)) return { eylem: ad, ...(e.dataset["dukkan"] !== undefined ? { dukkan: say(e, "dukkan") } : {}), kapali: kapali(e) };
  return null;
}

interface MarkaDurumu {
  ad: string;
  simge: number;
  renk: number;
  /** Gönderirken yerel denetim hatası gösterilsin (yazarken yalnız canlı hata). */
  gonder: boolean;
  /** Sunucu ret metni (Türkçe). */
  ret?: string;
}

export class DukkanPaneli {
  private secili: number | null = null;
  /** Kademesi düzenlenen dolu yuva. */
  private yuva: number | null = null;
  /** Mal seçicisi açık olan boş yuva. */
  private secici: number | null = null;
  /** "Yuvayı boşalt" onayı açık olan yuva. */
  private bosalt: number | null = null;
  private menu = false;
  private onay: "kaldir" | "iptal" | null = null;
  private marka: MarkaDurumu | null = null;
  private gonderiyor = false;
  private hata = "";

  constructor(private g: DukkanPaneliGirdisi) {}

  /** Test ve DOM bağlayıcısı için durum özeti. */
  get durum(): { secili: number | null; yuva: number | null; secici: number | null; bosalt: number | null; menu: boolean; onay: "kaldir" | "iptal" | null; marka: Readonly<MarkaDurumu> | null; gonderiyor: boolean; hata: string } {
    return { secili: this.secili, yuva: this.yuva, secici: this.secici, bosalt: this.bosalt, menu: this.menu, onay: this.onay, marka: this.marka, gonderiyor: this.gonderiyor, hata: this.hata };
  }

  private kayit(): DukkanKaydi | null {
    const g = this.g.gorunum();
    if (g === null || g.kapali || this.secili === null) return null;
    return g.dukkanlar.find((d) => d.id === this.secili) ?? null;
  }

  /** Seçimi ve açık adımları sıfırlar (dükkân kaldırıldı ya da başka dükkân seçildi). */
  private sifirla(secili: number | null): void {
    this.secili = secili;
    this.yuva = null;
    this.secici = null;
    this.bosalt = null;
    this.menu = false;
    this.onay = null;
    this.marka = null;
    this.hata = "";
  }

  /** Seçili dükkânın ayrıntısı (D-1 listesinin altına eklenir); seçili dükkân yoksa boş. */
  html(): string {
    const g = this.g.gorunum();
    const d = this.kayit();
    if (g === null || g.kapali || d === null) return "";
    const iade = this.g.param.iadeYuzde;
    const simdi = this.g.simdi();
    let s = `<div class="dk-panel" data-dukkan="${d.id}" data-durum="${d.durum}"><div class="yk-baslik"><h4 class="dk-baslik">${esc(dukkanAdi(d))}</h4>${dukkanMenusuHtml(d, this.menu, iade)}</div>`;
    if (this.onay !== null) s += kaldirOnayHtml(d, iade);
    if (d.durum === "acik") {
      const ilceSayi = g.dukkanlar.filter((x) => x.ilce !== undefined && x.ilce === d.ilce).length;
      const toplam = g.dukkanlar.length > 1 ? g.dukkanlar.reduce((t, x) => t + (x.durum === "acik" ? x.gelirMiliSa : 0), 0) : null;
      s += ozetHtml(d, toplam);
      s += rafHtml(d, { malAdi: this.g.malAdi, simdi, gonderiyor: this.gonderiyor, ...(this.yuva !== null ? { seciliYuva: this.yuva } : {}), kasaBirimSa: this.g.param.kasaBirimSa });
      const y = this.yuva !== null ? d.yuvalar[this.yuva] : undefined;
      if (y && y.mal !== null) {
        s += kademeHtml(y, {
          malAdi: this.g.malAdi,
          kampanyaAcik: g.kampanyaAcik,
          kampanya: d.kampanya,
          simdi,
          gonderiyor: this.gonderiyor,
          kasaPpm: etkinKasaPpm(d),
          ilceDukkanSayisi: ilceSayi,
          ...(this.g.param.esnafPayiYuzde ? { esnafPayiYuzde: this.g.param.esnafPayiYuzde } : {}),
        });
        if (this.bosalt === this.yuva) s += bosaltOnayHtml(y, { simdi, pencereSaat: this.g.param.pencereSaat, yuva: this.yuva as number });
      }
      if (this.secici !== null) s += seciciHtml(this.adaylar(d), this.g.malAdi, this.secici, this.g.param.kasaBirimSa);
      s += this.markaHtml(d);
    }
    if (this.hata) s += `<p class="dk-hata" role="alert">${esc(this.hata)}</p>`;
    return s + `</div>`;
  }

  /** Mal seçicisinin adayları: türün malları, başka yuvada olmayanlar. */
  adaylar(d: DukkanKaydi): SeciciMali[] {
    const rafta = new Set(d.yuvalar.map((y) => y.mal).filter((m): m is string => m !== null));
    return this.g.turMallari(d.tur).filter((m) => !rafta.has(m)).map((mal) => ({ mal, stokMili: this.g.stokMili(mal), fiyatMili: Math.floor(((this.g.referans(mal)?.mili ?? 0) * this.g.param.normalKademePpm) / 1_000_000) }));
  }

  private markaHtml(d: DukkanKaydi): string {
    const m = this.marka;
    const ad = d.markaAd ? `<p class="dk-ipucu" data-alan="marka-ad">${esc(d.markaAd)}</p>` : "";
    // Düğme markasızken "Marka adı ver", markalıyken "Markayı değiştir"
    if (m === null) return `<div class="dk-marka-satir">${ad}<button type="button" class="eylem" data-eylem="marka-ac">${esc(dukkanMetni(d.markaAd ? "dukkan.D7.dugme_degistir" : "dukkan.D7.dugme_ad_ver"))}</button></div>`;
    return markaFormuHtml({ ad: m.ad, simge: m.simge, renk: m.renk, gonder: m.gonder, gonderiyor: this.gonderiyor, ...(m.ret !== undefined ? { retMetin: m.ret } : {}) });
  }

  /** Marka adı yazılırken (canlı hata, sayaç, önizleme; yeniden çizim yok). */
  girdi(ad: string): void {
    if (this.marka === null) return;
    this.marka.ad = ad;
    delete this.marka.ret;
  }

  /** Marka formu alanları için yeniden üretilmiş HTML (DOM bağlayıcısı yalnız sayaç/önizleme/hata düğümlerini yamar; odak bozulmaz). */
  markaFormu(): string {
    const m = this.marka;
    return m === null ? "" : markaFormuHtml({ ad: m.ad, simge: m.simge, renk: m.renk, gonder: m.gonder, ...(m.ret !== undefined ? { retMetin: m.ret } : {}) });
  }

  /** Tek komut gönder: gönderim sürerken ikinci komut reddedilir (null); sonuç gelince panel yeniden çizilir. */
  private async calistir(k: Komut): Promise<DukkanKomutSonucu | null> {
    if (this.gonderiyor) return null;
    this.gonderiyor = true;
    this.hata = "";
    this.g.degisti();
    try {
      return await this.g.komut(k);
    } finally {
      this.gonderiyor = false;
    }
  }

  /** Eylemi işler; işlendiyse true. */
  async eylem(e: PanelEylemi): Promise<boolean> {
    const g = this.g.gorunum();
    if (g === null || g.kapali) return false;
    // Kapalı öğe (aria-disabled): boş yuvada neden söylenir; başka öğede hiçbir şey olmaz (neden zaten yazılıdır)
    if (e.kapali === true && e.eylem !== "yuva") return true;
    if (e.eylem === "dukkan-sec" || e.eylem === "dukkan-rafa") {
      if (e.dukkan === undefined) return false;
      // "Rafa git" (Dikkat maddesi) dükkânı her zaman açar; Raf düğmesi açıkken kapatır
      this.sifirla(e.eylem === "dukkan-sec" && this.secili === e.dukkan ? null : e.dukkan);
      this.g.degisti();
      return true;
    }
    const d = this.kayit();
    if (d === null) return false;
    const sonuc = await this.eylemDukkan(d, g, e);
    this.g.degisti();
    return sonuc;
  }

  private async eylemDukkan(d: DukkanKaydi, g: DukkanGorunumu, e: PanelEylemi): Promise<boolean> {
    switch (e.eylem) {
      case "yuva": {
        const y = e.yuva === undefined ? undefined : d.yuvalar[e.yuva];
        if (y === undefined || e.yuva === undefined || this.gonderiyor) return true;
        this.hata = "";
        this.bosalt = null;
        if (y.mal === null) {
          // Boş yuva pencere sürerken doldurulmaz: neden söylenir (sunucu da reddederdi)
          if (y.beklemeSaat > 0) {
            this.secici = null;
            this.hata = dukkanMetni("dukkan.D5.degisim_cok_sik", { sure: saatDakika(y.beklemeSaat) });
          } else this.secici = this.secici === e.yuva ? null : e.yuva;
          this.yuva = null;
        } else {
          this.secici = null;
          this.yuva = this.yuva === e.yuva ? null : e.yuva;
        }
        return true;
      }
      case "mal": {
        if (e.mal === undefined || this.secici === null) return true;
        const yuva = this.secici;
        const r = await this.calistir(rafKomutu(d.id, yuva, e.mal));
        if (r === null) return true;
        if (r.tamam) {
          this.secici = null;
          this.yuva = yuva;
        } else this.hata = r.mesaj;
        return true;
      }
      case "kademe":
      case "kampanya": {
        if (this.yuva === null) return true;
        const kademe = e.eylem === "kampanya" ? 0 : e.kademe;
        if (kademe === undefined) return true;
        const r = await this.calistir(fiyatKomutu(d.id, this.yuva, kademe));
        if (r !== null && !r.tamam) this.hata = r.mesaj;
        return true;
      }
      case "yuva-bosalt":
        this.bosalt = this.yuva;
        return true;
      case "yuva-bosalt-onayla": {
        if (this.yuva === null) return true;
        const r = await this.calistir(rafKomutu(d.id, this.yuva, null));
        if (r === null) return true;
        if (r.tamam) {
          this.bosalt = null;
          this.yuva = null;
        } else this.hata = r.mesaj;
        return true;
      }
      case "onay-vazgec":
        this.bosalt = null;
        this.onay = null;
        return true;
      case "menu":
        this.menu = !this.menu;
        return true;
      case "dukkan-kaldir":
        this.menu = false;
        this.onay = "kaldir";
        return true;
      case "insaat-iptal":
        this.menu = false;
        this.onay = "iptal";
        return true;
      case "dukkan-kaldir-onayla": {
        const r = await this.calistir({ tur: "dukkan_yik", dukkan: d.id });
        if (r === null) return true;
        if (r.tamam) {
          this.sifirla(null);
          this.g.bildir(dukkanMetni("dukkan.D81.sonuc"), "bilgi");
        } else {
          this.onay = null;
          this.hata = r.mesaj;
        }
        return true;
      }
      case "insaat-iptal-onayla": {
        // İnşadaki dükkânın kimliği negatiftir (köprü): iptal edilecek inşaat kimliği -id
        const r = await this.calistir({ tur: "insaat_iptal", insaat: -d.id });
        if (r === null) return true;
        if (r.tamam) this.sifirla(null);
        else {
          this.onay = null;
          this.hata = r.mesaj;
        }
        return true;
      }
      case "marka-ac":
        this.marka = { ad: "", simge: 0, renk: 0, gonder: false };
        this.hata = "";
        return true;
      case "marka-yok":
        this.marka = null;
        return true;
      case "simge":
        if (this.marka !== null && e.simge !== undefined) this.marka.simge = e.simge;
        return true;
      case "renk":
        if (this.marka !== null && e.renk !== undefined) this.marka.renk = e.renk;
        return true;
      case "marka-kaydet":
        return this.markaKaydet(d, g);
      case "yapi-kur":
        this.g.yapiKur?.();
        return true;
      default:
        return false;
    }
  }

  /** Marka: yerel ad denetimi (sunucu yine doğrular), `marka_tanimla` sonra `dukkan_marka`. Ret formda (ad hatası) ya da alt satırda (atama hatası) görünür. */
  private async markaKaydet(d: DukkanKaydi, g: DukkanGorunumu): Promise<boolean> {
    const m = this.marka;
    if (m === null || this.gonderiyor) return true;
    if (adHatasi(m.ad) !== null) {
      m.gonder = true;
      return true;
    }
    const dizin = g.markalar.length;
    const r1 = await this.calistir(markaKomutu(dizin, m.ad, m.simge, m.renk));
    if (r1 === null) return true;
    if (!r1.tamam) {
      m.ret = r1.mesaj;
      return true;
    }
    const r2 = await this.calistir({ tur: "dukkan_marka", dukkan: d.id, marka: dizin });
    this.marka = null;
    if (r2 !== null && !r2.tamam) this.hata = r2.mesaj;
    return true;
  }
}

/** Gerçek ticaret_emri/ithalat kaynağına bağlı sürekli tedarik yönetimi. */
import type { Komut } from "@bolge/cekirdek";
import type { IthalatGideri, SebekeGideri } from "@bolge/protokol";
import { esc, paraMili, sayi, sureMetni } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import { ikon } from "../tasarim/ikon";
import { lojistikGorunumuHtml } from "./lojistik-gorunum";
import type { LojistikPlanGorunumu } from "./lojistik-gorunum";
import "./lojistik-gorunum.css";

const SAAT = 3_600_000;
/** Çekirdek ekonomi/komut.ts: 1_000_000_000 mili-birim/saat. */
const EN_COK_ORAN = 1_000_000_000;

export interface TedarikEmri {
  mal: string;
  /** İstenen ve son çözümde gerçekleşen oran; mili-birim/saat. */
  oranSaat: number;
  gerceklesenSaat: number;
}
export interface TedarikBolgesi {
  /** Komuta gönderilecek gerçek işletme/bölge düğümü kimliği. */
  id: string;
  il: string;
  ad: string;
  stoklar: ReadonlyMap<string, number>;
  /** Sunucunun hesapladığı nakit ithalat çarpanı; eski sunucuda yoktur. */
  ithNetPpm?: number;
  /** Son gerçekleşen akışın sunucudan gelen giderleri; [] bilinen sıfır, yokluk bilinmiyor. */
  sebekeGiderleri?: readonly SebekeGideri[];
  ithalatGiderleri?: readonly IthalatGideri[];
  /** İç ağdan ulaşmış hız; pazar ithalatından ayrıdır. [] bilinen sıfır, yokluk bilinmiyor. */
  gelenOran?: ReadonlyArray<readonly [mal: string, miliSaat: number]>;
  /** Yalnız ithalat emirleri; ihracat emirleri burada yer almaz. */
  emirler: readonly TedarikEmri[];
  /** Sahiplik ve mülk kipi/liman şartının kaynaktan doğrulanmış sonucu. */
  uygun: boolean;
  neden?: string;
  /** Emir yuvası doluluğu yalnız yeni emri engeller; mevcut emir değiştirilebilir. */
  yeniEmirUygun?: boolean;
  yeniEmirNedeni?: string;
}
export interface TedarikDurumu {
  simZamani: number;
  bolgeler: readonly TedarikBolgesi[];
  /** Bütün bilinen sahipli kaynakların aynı son çözümdeki iç sevk planı. */
  lojistik?: LojistikPlanGorunumu;
}
export interface TedarikFiyati {
  /** Dünya referans fiyatı veya taban tahmini; mili-para/birim. */
  mili: number;
  /** Taban fiyatı kullanıldıysa true; canlı referans ise false. */
  yaklasik: boolean;
  /** Yalnız gerçek sunucu çarpanları biliniyorsa hesaplanan son ithalat birim maliyeti. */
  ithalatBirimMili?: number;
}
export type TedarikSonucu = { tamam: true } | { tamam: false; mesaj: string };
export interface TedarikPanelParam {
  ic: Icerik;
  durum: () => TedarikDurumu | null;
  referans: (mal: string, bolge: string) => TedarikFiyati | undefined;
  komut: (komut: Extract<Komut, { tur: "ticaret_emri" }>) => Promise<TedarikSonucu>;
  degisti: () => void;
}
export type TedarikEylemi =
  | { eylem: "ver"; oran: string }
  | { eylem: "durdur" }
  | { eylem: "ac"; bolge: string; mal: string };

/** Birim/saat -> mili-birim/saat. Boş alan, eksi ve üçten fazla ondalık kabul edilmez. */
export function tedarikOrani(deger: string): number | null {
  const s = deger.trim();
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(s)) return null;
  const n = Math.round(Number(s.replace(",", ".")) * 1000);
  return Number.isSafeInteger(n) && n >= 0 && n <= EN_COK_ORAN ? n : null;
}

export function tedarikEylemiOku(t: HTMLElement): TedarikEylemi | null {
  const b = t.closest<HTMLButtonElement>("button[data-tedarik-eylem]");
  if (!b || b.disabled) return null;
  switch (b.dataset["tedarikEylem"]) {
    case "ver": {
      const input = b.closest(".tdr-panel")?.querySelector<HTMLInputElement>("input[data-tedarik-oran]");
      return input ? { eylem: "ver", oran: input.value } : null;
    }
    case "durdur": return { eylem: "durdur" };
    case "ac": {
      const bolge = b.dataset["bolge"], mal = b.dataset["mal"];
      return bolge && mal ? { eylem: "ac", bolge, mal } : null;
    }
    default: return null;
  }
}

const anahtar = (bolge: string, mal: string): string => JSON.stringify([bolge, mal]);

export class TedarikPaneli {
  private bolge: string | null = null;
  private mal: string | null = null;
  private readonly taslaklar = new Map<string, string>();
  private gonderiliyor = false;
  private sonuc = "";
  private hata = false;
  private icSevkiyatAcik = false;

  constructor(private readonly p: TedarikPanelParam) {}

  private malAdi(id: string): string { return this.p.ic.mallar[this.p.ic.malIdx[id] ?? -1]?.ad ?? id; }
  private depolanabilir(id: string): boolean { return this.p.ic.mallar[this.p.ic.malIdx[id] ?? -1]?.depolanabilir === true; }

  private secili(d: TedarikDurumu): TedarikBolgesi | undefined {
    const b = this.bolge === null ? d.bolgeler[0] : d.bolgeler.find((x) => x.id === this.bolge);
    if (this.bolge === null) this.bolge = b?.id ?? null;
    if (this.mal === null || !this.depolanabilir(this.mal)) this.mal = this.p.ic.mallar.find((m) => m.depolanabilir)?.id ?? null;
    return b;
  }

  private taslak(b: TedarikBolgesi, mal: string): string {
    const emir = b.emirler.find((e) => e.mal === mal);
    return this.taslaklar.get(anahtar(b.id, mal)) ?? (emir ? String(emir.oranSaat / 1000) : "");
  }

  private engel(b: TedarikBolgesi, mal: string, oran: number | null): string | null {
    if (!this.depolanabilir(mal)) return "Bu mal depolanamaz; pazardan ithal edilemez.";
    if (!b.uygun) return b.neden ?? "Bu işletmede tedarik emri verilemiyor.";
    if (oran === null) return "0–1.000.000 arasında, en çok üç ondalıklı bir miktar yaz.";
    if (oran > 0 && !b.emirler.some((e) => e.mal === mal) && b.yeniEmirUygun === false) return b.yeniEmirNedeni ?? "Ticaret emir yuvaları dolu. Bir emri durdur veya Ticaret ofisi kur.";
    return null;
  }

  private ithalatGideriHtml(b: TedarikBolgesi, mal: string): string {
    let h = '<section class="tdr-akis"><h5>Gerçekleşen ithalatın saatlik gideri</h5>';
    if (b.ithalatGiderleri === undefined) return h + '<p class="ipucu-metin">Bu işletmenin gerçekleşen ithalat gideri bilinmiyor; sunucudan gider dökümü bekleniyor.</p></section>';
    const g = b.ithalatGiderleri.find((x) => x.mal === mal);
    if (!g) return h + `<p>Bu mal için gerçekleşen ithalat yok. Saatlik ithalat gideri: <b>${paraMili(0, "yukari")}/sa</b>.</p></section>`;
    h += `<p>${esc(this.malAdi(mal))}: <b>${sayi(g.miktarMiliSaat / 1000, 3)} birim/sa</b> · Dünya referans fiyatı: ${paraMili(g.birimFiyatMili, "yukari")}/birim.</p>`;
    const satir = (ad: string, miktar: number): string => `<div><dt>${ad}</dt><dd>${paraMili(miktar, "yukari")}/sa</dd></div>`;
    h += '<dl class="tdr-gider">';
    h += satir("Mal bedeli", g.malBedeliMiliSaat);
    h += satir("Pazar makası", g.makasMiliSaat);
    h += satir("Liman primi", g.limanPrimiMiliSaat);
    h += satir("Komisyon", g.komisyonMiliSaat);
    h += satir("Vergi / tarife (Hazine’ye geri yazılır)", g.vergiMiliSaat);
    h += `<div class="tdr-gider-toplam"><dt>Toplam net ithalat gideri</dt><dd>${paraMili(g.netBedelMiliSaat, "yukari")}/sa</dd></div></dl>`;
    h += '<p class="ipucu-metin">Sunucu bu dökümü son gerçekleşen ithalat hızı ve güncel fiyatlarla hesaplar. Geçmişte tahsil edilmiş tutarı göstermez. Vergi / tarife Hazine’ye geri yazıldığı için net giderin üzerine tekrar eklenmez.</p>';
    return h + '</section>';
  }

  private sebekeGideriHtml(b: TedarikBolgesi, mal: string): string {
    const g = b.sebekeGiderleri?.find((x) => x.mal === mal);
    const sebekeMali = b.id.includes("#") && this.p.ic.param.mulk?.sebeke?.mallar.some((m) => m.mal === mal);
    if (!g && !sebekeMali) return "";
    let h = '<section class="tdr-akis"><h5>Tesislerin otomatik şebeke tedariki</h5>';
    if (b.sebekeGiderleri === undefined) return h + '<p class="ipucu-metin">Bu malın şebeke tüketimi ve bedeli bilinmiyor; sunucudan gider bilgisi bekleniyor.</p></section>';
    if (!g) return h + `<p>Bu mal için son çözümde şebeke tüketimi yok. Şebeke gideri: <b>${paraMili(0, "yukari")}/sa</b>.</p></section>`;
    h += `<p>${esc(this.malAdi(mal))}: <b>${sayi(g.miktarMiliSaat / 1000, 3)} birim/sa</b> otomatik tüketim.</p><dl class="tdr-gider"><div><dt>Şebeke birim fiyatı</dt><dd>${paraMili(g.birimFiyatMili, "yukari")}/birim</dd></div><div class="tdr-gider-toplam"><dt>Şebeke gideri</dt><dd>${paraMili(g.bedelMiliSaat, "yukari")}/sa</dd></div></dl><p class="ipucu-metin">Son çözümün gerçek tüketimi ve şebeke fiyatıyla hesaplanır. Bu gider ithalat emrinin giderinden ayrıdır; ayrıntısı Hazine’de görünür.</p>`;
    return h + '</section>';
  }

  private ozetHtml(b: TedarikBolgesi, mal: string, metin: string): string {
    const emir = b.emirler.find((e) => e.mal === mal);
    const oran = tedarikOrani(metin);
    const stok = b.stoklar.get(mal);
    let h = `<dl class="tdr-ozet"><div><dt>Bu ilde işletme stoğu</dt><dd>${stok === undefined ? "Bilinmiyor" : `${sayi(stok / 1000, 3)} birim`}</dd></div><div><dt>İstenen ithalat</dt><dd>${sayi((emir?.oranSaat ?? 0) / 1000, 3)} birim/sa</dd></div><div><dt>Son gerçekleşen ithalat</dt><dd>${sayi((emir?.gerceklesenSaat ?? 0) / 1000, 3)} birim/sa</dd></div></dl>`;
    if (b.id.includes("#") && this.depolanabilir(mal) && this.p.ic.param.mulk?.sebeke?.mallar.some((m) => m.mal === mal)) {
      h += mal === "yakit"
        ? '<p class="tdr-uyari">Bu yakıt stoğu birlikler ve ticaret için kullanılır. Tesislerin otomatik yakıt tedariki ayrıca Hazine’de görünür; bu stok onu azaltmaz.</p>'
        : '<p class="tdr-uyari">Bu malın stoğu ticarette ve stok gerektiren işlemlerde kullanılır. Tesislerin otomatik şebeke tedariki ayrıca Hazine’de görünür; bu stok onu azaltmaz.</p>';
    }
    if (emir && emir.gerceklesenSaat < emir.oranSaat) h += '<p class="tdr-uyari">İstenen miktarın tamamı karşılanmamış. Pazar arzı ve nakit durumu gerçekleşen tedariki sınırlayabilir.</p>';
    h += this.ithalatGideriHtml(b, mal);
    h += this.sebekeGideriHtml(b, mal);
    h += '<section class="tdr-tahmin"><h5>Yeni emir için tahmin</h5>';
    const f = this.p.referans(mal, b.id);
    if (f && Number.isFinite(f.mili) && f.mili >= 0) {
      h += `<p>${f.yaklasik ? "Yaklaşık taban fiyatı" : "Güncel dünya referans fiyatı"}: <b>${paraMili(f.mili, "yukari")}/birim</b>. Referans fiyatı ödenecek nihai tutar değildir.</p>`;
      if (f.ithalatBirimMili !== undefined && Number.isFinite(f.ithalatBirimMili) && f.ithalatBirimMili >= 0) {
        h += `<p>İthalat birim maliyeti <span class="tdr-kesinlik">Tahmini${f.yaklasik ? " · taban fiyatıyla" : " · son fiyatla"}</span>: <b>${paraMili(f.ithalatBirimMili, "yukari")}/birim</b>.</p>`;
        if (oran !== null) h += `<p>İstenen orana göre tahmini gider: <b>${paraMili(oran / 1000 * f.ithalatBirimMili, "yukari")}/sa</b>. Gerçek gider gerçekleşen miktara ve işlem fiyatına bağlıdır.</p>`;
      } else h += '<p class="ipucu-metin">İthalatın toplam birim maliyeti bilinmiyor; makas, komisyon ve varsa tarife nihai bedeli etkiler.</p>';
    } else h += '<p class="ipucu-metin">Birim fiyat bilgisi bekleniyor. Tedarik ücretlidir.</p>';
    h += '</section>';
    const engel = this.engel(b, mal, oran);
    if (engel) h += `<p class="tdr-uyari">${esc(engel)}</p>`;
    return h;
  }

  private sonucHtml(): string {
    return this.sonuc ? `<p class="tdr-sonuc${this.hata ? " tdr-hata" : ""}" role="${this.hata ? "alert" : "status"}">${esc(this.sonuc)}</p>` : "";
  }

  private lojistikHtml(d: TedarikDurumu, b: TedarikBolgesi, mal: string): string {
    return lojistikGorunumuHtml({ bolgeId: b.id, mal, bolgeler: d.bolgeler, lojistik: d.lojistik });
  }

  html(): string {
    const oncekiSevkiyat = typeof document === "undefined" ? null : document.querySelector<HTMLDetailsElement>("details[data-tedarik-ic-sevkiyat]");
    if (oncekiSevkiyat) this.icSevkiyatAcik = oncekiSevkiyat.open;
    const d = this.p.durum();
    if (!d) return '<p class="ipucu-metin">Tedarik bilgisi yükleniyor…</p>';
    const b = this.secili(d), mal = this.mal;
    let h = `<section class="tdr-panel" aria-label="Tedarik yönetimi" aria-busy="${this.gonderiliyor}"><h3>${ikon("package", 18)} Tedarik</h3><p class="ipucu-metin">Birlik üretimi, ikmal ve üretim girdileri için sürekli ithalat emri ver. Mallar hemen eklenmez; pazar işlemi saat başında yapılır ve tedarik zaman içinde işletme stoğuna gelir.</p>`;
    h += `<div data-tedarik-sonuc>${this.sonucHtml()}</div>`;
    if (!d.bolgeler.length) return h + '<p>Tedarik yönetimi için önce bir işletme kur.</p></section>';
    if (!b) return h + '<p class="tdr-uyari">Seçilen işletmenin bilgisi artık bulunamadı. Başka bir işletmeden tedariki yeniden aç.</p></section>';
    if (mal === null) return h + '<p>İthal edilebilen mal bulunamadı.</p></section>';
    h += '<div class="tdr-secimler"><label>Varış ili / işletme<select data-tedarik-secim="bolge"';
    h += `${this.gonderiliyor ? " disabled" : ""}>${d.bolgeler.map((x) => `<option value="${esc(x.id)}"${x.id === b.id ? " selected" : ""}>${esc(x.ad)}</option>`).join("")}</select></label><label>Tedarik edilecek mal<select data-tedarik-secim="mal"${this.gonderiliyor ? " disabled" : ""}>${this.p.ic.mallar.filter((m) => m.depolanabilir).map((m) => `<option value="${esc(m.id)}"${m.id === mal ? " selected" : ""}>${esc(m.ad)}</option>`).join("")}</select></label></div>`;
    h += '<p class="ipucu-metin">Elektrik gibi depolanamayan mallar bu pazardan ithal edilemez. Birlik üretiminde gereken stok, seçilen ildeki işletmede bulunmalıdır.</p>';
    const taslak = this.taslak(b, mal), emir = b.emirler.find((e) => e.mal === mal);
    h += `<div class="tdr-form"><label>Saatlik ithalat miktarı <input type="text" inputmode="decimal" autocomplete="off" data-tedarik-oran value="${esc(taslak)}"${this.gonderiliyor ? " readonly" : ""}><span>birim/saat</span></label><p class="ipucu-metin">Emir durdurulana kadar sürer. 0 emri kaldırır; en çok 1.000.000 birim/sa ve üç ondalık girilebilir.</p><div data-tedarik-ozet aria-live="polite">${this.ozetHtml(b, mal, taslak)}</div>`;
    h += `<div class="tdr-eylemler"><button type="button" class="eylem birincil" data-tedarik-eylem="ver"${this.gonderiliyor || this.engel(b, mal, tedarikOrani(taslak)) ? " disabled" : ""}>${this.gonderiliyor ? "İşleniyor…" : emir ? "Tedariki güncelle" : "Tedarik emri ver"}</button><button type="button" class="eylem" data-tedarik-eylem="durdur"${this.gonderiliyor || !emir || !b.uygun ? " disabled" : ""}>Tedariki durdur</button></div></div>`;
    h += `<details class="tdr-sevkiyat" data-tedarik-ic-sevkiyat${this.icSevkiyatAcik ? " open" : ""}><summary data-tedarik-sevkiyat-baslik>İç sevkiyat · ${esc(this.malAdi(mal))}</summary><div data-tedarik-lojistik>${this.lojistikHtml(d, b, mal)}</div></details>`;
    h += `<p class="ipucu-metin">Sonraki pazar işlemine simülasyon zamanıyla ${esc(sureMetni((SAAT - d.simZamani % SAAT) / SAAT))} kaldı. Pozitif nakit ve pazar arzı gerekir; emrin kabulü bütün miktarın sağlanacağını garanti etmez.</p>`;
    const emirler = d.bolgeler.flatMap((x) => x.emirler.map((e) => ({ b: x, e })));
    if (emirler.length) {
      h += '<h4>Mevcut ithalat emirleri</h4><ul class="tdr-emirler">';
      for (const { b: kaynak, e } of emirler) h += `<li><div><b>${esc(this.malAdi(e.mal))} · ${esc(kaynak.ad)}</b><span>İstenen ${sayi(e.oranSaat / 1000, 3)} / gerçekleşen ${sayi(e.gerceklesenSaat / 1000, 3)} birim/sa</span></div><button type="button" class="eylem" data-tedarik-eylem="ac" data-bolge="${esc(kaynak.id)}" data-mal="${esc(e.mal)}" aria-label="${esc(`${this.malAdi(e.mal)}, ${kaynak.ad}: tedariki düzenle`)}"${this.gonderiliyor || !this.depolanabilir(e.mal) ? " disabled" : ""}>Düzenle</button></li>`;
      h += '</ul>';
    } else h += '<p class="ipucu-metin">Henüz bir ithalat emri yok.</p>';
    return h + '</section>';
  }

  /** Yalnız özeti ve düğmeyi yamalar; yazarken input ve imleç korunur. */
  girdi(input: HTMLInputElement): boolean {
    if (!input.hasAttribute("data-tedarik-oran")) return false;
    const d = this.p.durum(), b = d?.bolgeler.find((x) => x.id === this.bolge), mal = this.mal;
    if (!b || mal === null) return false;
    this.taslaklar.set(anahtar(b.id, mal), input.value);
    const kok = input.closest(".tdr-panel");
    const ozet = kok?.querySelector<HTMLElement>("[data-tedarik-ozet]");
    if (ozet) ozet.innerHTML = this.ozetHtml(b, mal, input.value);
    const dugme = kok?.querySelector<HTMLButtonElement>("button[data-tedarik-eylem='ver']");
    if (dugme) dugme.disabled = this.gonderiliyor || this.engel(b, mal, tedarikOrani(input.value)) !== null;
    return true;
  }

  secim(select: HTMLSelectElement): boolean {
    const tur = select.dataset["tedarikSecim"];
    if (tur !== "bolge" && tur !== "mal") return false;
    if (this.gonderiliyor) return true;
    if (tur === "bolge") {
      if (!this.p.durum()?.bolgeler.some((b) => b.id === select.value)) return false;
      this.bolge = select.value;
    } else {
      if (!this.depolanabilir(select.value)) return false;
      this.mal = select.value;
    }
    this.sonuc = "";
    const kok = select.closest(".tdr-panel");
    if (kok) this.yamala(kok);
    this.p.degisti();
    return true;
  }

  /** Kabuk form odağı nedeniyle yeniden çizimi ertelerse alanları yerinde günceller.
   * Native select ve input elemanları korunur; eski seçim miktarı yeni mala taşınmaz. */
  yamala(kok: ParentNode): boolean {
    const panel = kok instanceof HTMLElement && kok.matches(".tdr-panel") ? kok : kok.querySelector<HTMLElement>(".tdr-panel");
    if (!panel) return false;
    const d = this.p.durum();
    const b = d ? this.secili(d) : undefined;
    const mal = this.mal;
    panel.setAttribute("aria-busy", String(this.gonderiliyor));
    const sonuc = panel.querySelector<HTMLElement>("[data-tedarik-sonuc]");
    if (sonuc) sonuc.innerHTML = this.sonucHtml();
    for (const select of panel.querySelectorAll<HTMLSelectElement>("select[data-tedarik-secim]")) {
      select.disabled = this.gonderiliyor;
      const secim = select.dataset["tedarikSecim"] === "bolge" ? this.bolge : mal;
      if (secim !== null && select.value !== secim) select.value = secim;
    }
    const input = panel.querySelector<HTMLInputElement>("input[data-tedarik-oran]");
    const taslak = b && mal !== null ? this.taslak(b, mal) : "";
    if (input) {
      input.readOnly = this.gonderiliyor || !b || mal === null;
      if (input.value !== taslak) input.value = taslak;
    }
    const ozet = panel.querySelector<HTMLElement>("[data-tedarik-ozet]");
    if (ozet) ozet.innerHTML = b && mal !== null ? this.ozetHtml(b, mal, taslak) : '<p class="tdr-uyari">Seçilen işletmenin tedarik bilgisi bulunamadı. Geçerli bir işletme seç.</p>';
    const sevkiyat = panel.querySelector<HTMLDetailsElement>("details[data-tedarik-ic-sevkiyat]");
    if (sevkiyat) {
      this.icSevkiyatAcik = sevkiyat.open;
      const baslik = sevkiyat.querySelector<HTMLElement>("summary");
      if (baslik) baslik.textContent = `İç sevkiyat${mal === null ? "" : ` · ${this.malAdi(mal)}`}`;
      const lojistik = sevkiyat.querySelector<HTMLElement>("[data-tedarik-lojistik]");
      if (lojistik) lojistik.innerHTML = d && b && mal !== null ? this.lojistikHtml(d, b, mal) : '<p class="ipucu-metin">Seçilen işletmenin iç sevkiyat bilgisi bulunamadı.</p>';
    }
    const emir = b && mal !== null ? b.emirler.find((e) => e.mal === mal) : undefined;
    const ver = panel.querySelector<HTMLButtonElement>("button[data-tedarik-eylem='ver']");
    if (ver) {
      ver.disabled = this.gonderiliyor || !b || mal === null || this.engel(b, mal, tedarikOrani(taslak)) !== null;
      ver.textContent = this.gonderiliyor ? "İşleniyor…" : emir ? "Tedariki güncelle" : "Tedarik emri ver";
    }
    const durdur = panel.querySelector<HTMLButtonElement>("button[data-tedarik-eylem='durdur']");
    if (durdur) durdur.disabled = this.gonderiliyor || !emir || !b?.uygun;
    for (const ac of panel.querySelectorAll<HTMLButtonElement>("button[data-tedarik-eylem='ac']")) ac.disabled = this.gonderiliyor || !this.depolanabilir(ac.dataset["mal"] ?? "") || !d?.bolgeler.some((x) => x.id === ac.dataset["bolge"]);
    return true;
  }

  /** Dış panelden yönlendirme. Açıkça istenen düğüm/mal yoksa başka yere geçilmez. */
  ac(secim: { mal?: string; bolge?: string }): boolean {
    if (this.gonderiliyor) return false;
    const d = this.p.durum();
    if (!d) { this.reddet("Tedarik bilgisi yükleniyor. İşletme bilgisi geldikten sonra yeniden açabilirsin."); return false; }
    if (secim.bolge !== undefined && !d.bolgeler.some((b) => b.id === secim.bolge)) {
      this.reddet("Seçilen ildeki işletmenin tedarik bilgisi bulunamadı. İthalat için geçerli bir işletme seç.");
      return false;
    }
    if (secim.mal !== undefined && !this.depolanabilir(secim.mal)) {
      this.reddet("Seçilen mal pazardan ithal edilemez. Elektrik gibi depolanamayan mallar için yerel üretim veya şebeke gerekir.");
      return false;
    }
    if (secim.bolge !== undefined) this.bolge = secim.bolge;
    if (secim.mal !== undefined) this.mal = secim.mal;
    this.sonuc = "";
    this.p.degisti();
    return true;
  }

  odagiYakala(kok: ParentNode): (() => void) | null {
    const sevkiyat = kok.querySelector<HTMLDetailsElement>("details[data-tedarik-ic-sevkiyat]");
    if (sevkiyat) this.icSevkiyatAcik = sevkiyat.open;
    const a = typeof document === "undefined" ? null : document.activeElement;
    if (!(a instanceof HTMLElement) || ![...kok.querySelectorAll(".tdr-panel")].some((x) => x.contains(a))) return null;
    const oran = a instanceof HTMLInputElement && a.hasAttribute("data-tedarik-oran");
    const sevkiyatBasligi = a.hasAttribute("data-tedarik-sevkiyat-baslik");
    const secim = a.dataset["tedarikSecim"], eylem = a.dataset["tedarikEylem"], bolge = a.dataset["bolge"], mal = a.dataset["mal"];
    const bas = oran ? a.selectionStart : null, son = oran ? a.selectionEnd : null;
    if (oran && this.bolge !== null && this.mal !== null) this.taslaklar.set(anahtar(this.bolge, this.mal), a.value);
    return () => {
      const y = sevkiyatBasligi ? kok.querySelector<HTMLElement>("summary[data-tedarik-sevkiyat-baslik]") : oran ? kok.querySelector<HTMLInputElement>("input[data-tedarik-oran]") : secim ? [...kok.querySelectorAll<HTMLSelectElement>("select[data-tedarik-secim]")].find((x) => x.dataset["tedarikSecim"] === secim) : [...kok.querySelectorAll<HTMLButtonElement>("button[data-tedarik-eylem]")].find((x) => x.dataset["tedarikEylem"] === eylem && x.dataset["bolge"] === bolge && x.dataset["mal"] === mal);
      if (!y) return;
      y.focus({ preventScroll: true });
      if (y instanceof HTMLInputElement && bas !== null && son !== null) y.setSelectionRange(bas, son);
    };
  }

  async eylem(e: TedarikEylemi): Promise<void> {
    if (this.gonderiliyor) return;
    if (e.eylem === "ac") {
      this.ac({ bolge: e.bolge, mal: e.mal });
      return;
    }
    const d = this.p.durum(), b = d?.bolgeler.find((x) => x.id === this.bolge), mal = this.mal;
    if (!b || mal === null) return this.reddet("Bu işletmenin tedarik bilgisi artık bulunamadı.");
    const metin = e.eylem === "durdur" ? "0" : e.oran;
    const oran = tedarikOrani(metin), engel = this.engel(b, mal, oran);
    if (engel || oran === null) return this.reddet(engel ?? "Geçerli bir miktar yaz.");
    this.taslaklar.set(anahtar(b.id, mal), metin);
    this.gonderiliyor = true; this.sonuc = ""; this.p.degisti();
    try {
      const r = await this.p.komut({ tur: "ticaret_emri", bolge: b.id, mal, yon: "ithalat", oranSaat: oran });
      this.hata = !r.tamam;
      this.sonuc = r.tamam ? oran === 0 ? `${b.ad}: ${this.malAdi(mal)} tedarikini durdurma emri kabul edildi. Mevcut stok korunur; emir bilgisi sunucudan güncellenecek.` : `${b.ad}: ${this.malAdi(mal)} için ${sayi(oran / 1000, 3)} birim/sa tedarik emri kabul edildi. Stok ve gerçekleşen miktar sunucudan güncellenecek.` : r.mesaj;
    } catch {
      this.hata = true;
      this.sonuc = "Sunucuya ulaşılamadı. Emir durumunu kontrol edip yeniden deneyebilirsin.";
    } finally {
      this.gonderiliyor = false; this.p.degisti();
    }
  }

  private reddet(mesaj: string): void { this.hata = true; this.sonuc = mesaj; this.p.degisti(); }
}

/** İçerik tarifeleri ile sahibinin sunucudan gelen işletme verisini ayrı gösterir. */
import { esc, fmt, sayi } from "../arayuz/bicim";
import type { Icerik, MalMiktar, TurT, YontemT } from "../komut/tablo";
import { teknolojiAdi } from "../komut/tablo";
import { IKONLAR, ikon } from "../tasarim/ikon";
import type { IkonAdi } from "../tasarim/ikon";
import { yontemSimgesi } from "../tasarim/yontem";
import type { IsletmeDurumu, IsletmeYapisi } from "./baglanti";
import { yakitTedarikiHtml } from "./sebeke-gider";
import { uretimTesisleri } from "./uretim-tesisleri";
import type { UretimTesisi } from "./uretim-tesisleri";
import { rezervGorunumuHtml } from "./rezerv-gorunum";
import "./rezerv-gorunum.css";

export interface UretimAgiPanelParam {
  ic: Icerik;
  isletme: () => IsletmeDurumu | null;
  acikTeknolojiler: () => ReadonlySet<string> | null;
  yontemDestegi?: boolean;
  yontemBekliyor?: () => boolean;
  tesisAdi?: (tesis: Readonly<IsletmeYapisi>) => string;
  ilAdi?: (il: string) => string;
  degisti: () => void;
}

export type UretimAgiEylemi =
  | { eylem: "mal-sec"; mal: string }
  | { eylem: "tedarik"; mal: string }
  | { eylem: "teknoloji"; teknoloji: string }
  | { eylem: "tesis"; tesis: string; yontem: string };

/** Kök panel seçimi ve diğer sekmelere yönlendirmeyi bu eylemlerle bağlar. */
export function uretimAgiEylemiOku(hedef: HTMLElement): UretimAgiEylemi | null {
  const dugme = hedef.closest<HTMLElement>("[data-uretim-mal], [data-uretim-tedarik], [data-uretim-teknoloji], [data-uretim-tesis]");
  if (!dugme || dugme.hasAttribute("disabled") || dugme.getAttribute("aria-disabled") === "true") return null;
  const tesis = dugme.dataset["uretimTesis"], yontem = dugme.dataset["uretimYontem"];
  if (tesis !== undefined) return tesis && yontem ? { eylem: "tesis", tesis, yontem } : null;
  const mal = dugme.dataset["uretimMal"];
  if (mal !== undefined) return { eylem: "mal-sec", mal };
  const tedarik = dugme.dataset["uretimTedarik"];
  if (tedarik !== undefined) return { eylem: "tedarik", mal: tedarik };
  const teknoloji = dugme.dataset["uretimTeknoloji"];
  return teknoloji !== undefined ? { eylem: "teknoloji", teknoloji } : null;
}

export interface UretimBaglantilari {
  ureten: YontemT[];
  kullanan: YontemT[];
}

/** Liste içerikten türetilir; tüketim, talep veya kapasite tahmini üretmez. */
export function uretimBaglantilari(ic: Icerik, mal: string): UretimBaglantilari {
  const mi = ic.malIdx[mal];
  if (mi === undefined) return { ureten: [], kullanan: [] };
  return {
    ureten: ic.yontemler.filter((y) => y.cikti.some(([m, miktar]) => m === mi && miktar > 0)),
    kullanan: ic.yontemler.filter((y) => y.girdi.some(([m, miktar]) => m === mi && miktar > 0)),
  };
}

/** Görsel kısayollar: her mal ve her ok güncel içerikte doğrulanır. */
export function uretimYollari(ic: Icerik): string[][] {
  return [
    ["tahil", "gida"],
    ["tahil", "un", "ekmek"],
    ["yun", "iplik", "kumas", "hazir_giyim"],
    ["cevher", "celik", "parca"],
    ["balik"],
    ["petrol", "yakit"],
  ].filter((yol) => yol.every((mal, i) => {
    const mi = ic.malIdx[mal];
    if (mi === undefined) return false;
    if (i === 0) return uretimBaglantilari(ic, mal).ureten.length > 0;
    const onceki = ic.malIdx[yol[i - 1]!];
    return ic.yontemler.some((y) => y.girdi.some(([m, q]) => m === onceki && q > 0) && y.cikti.some(([m, q]) => m === mi && q > 0));
  }));
}

export class UretimAgiPaneli {
  private seciliMal: string;
  private readonly acikTesisler = new Set<string>();
  private malSecimiAcik = false;
  private gorulenTesis: Extract<UretimAgiEylemi, { eylem: "tesis" }> | null = null;

  constructor(private readonly p: UretimAgiPanelParam) {
    this.seciliMal = p.ic.malIdx["tahil"] !== undefined ? "tahil" : p.ic.mallar[0]?.id ?? "";
  }

  get mal(): string { return this.seciliMal; }

  teklifYakala(t: HTMLElement): void {
    const e = uretimAgiEylemiOku(t);
    this.gorulenTesis = e?.eylem === "tesis" ? e : null;
  }

  eylemOku(t: HTMLElement): UretimAgiEylemi | null {
    const e = uretimAgiEylemiOku(t), gorulen = this.gorulenTesis;
    this.gorulenTesis = null;
    return e?.eylem === "tesis" && gorulen ? gorulen : e;
  }

  /** İçerikteki mallardan birini seçer; seçim değiştiyse yeniden çizim ister. */
  malSec(mal: string): boolean {
    if (this.p.ic.malIdx[mal] === undefined || this.seciliMal === mal) return false;
    this.seciliMal = mal;
    this.p.degisti();
    return true;
  }

  private malDugmesi(mal: string, miktar?: number): string {
    const m = this.p.ic.mallar[this.p.ic.malIdx[mal] ?? -1];
    if (!m) return "";
    return `<button type="button" class="ua-mal${mal === this.seciliMal ? " ua-secili" : ""}" data-uretim-mal="${esc(mal)}" aria-pressed="${mal === this.seciliMal}">${mal === this.seciliMal ? ikon("check", 14) : ""}${miktar !== undefined ? `<span class="ua-miktar">${sayi(miktar / 1000, 3)}</span> ` : ""}${esc(m.ad)}</button>`;
  }

  private tarife(miktarlar: MalMiktar, bos: string): string {
    const kalemler = miktarlar.filter(([, q]) => q > 0);
    if (!kalemler.length) return `<span class="ua-bos">${esc(bos)}</span>`;
    return kalemler.map(([mi, q]) => {
      const mal = this.p.ic.mallar[mi];
      return mal ? this.malDugmesi(mal.id, q) : "";
    }).join("");
  }

  private teknoloji(id: string, acik: ReadonlySet<string> | null): string {
    const durum = acik === null ? "Durum bekleniyor" : acik.has(id) ? "Araştırıldı" : "Araştırma gerekiyor";
    return `<button type="button" class="ua-teknoloji" data-uretim-teknoloji="${esc(id)}">${ikon("flask-conical", 14)} ${esc(teknolojiAdi(this.p.ic, id))}<span>${esc(durum)}</span></button>`;
  }

  private tesis(t: TurT, d: IsletmeDurumu | null, acik: ReadonlySet<string> | null): string {
    const yapilar = d?.yapilar.filter((y) => y.tur === t.id) ?? [];
    const biten = yapilar.filter((y) => y.durum === "tesis").length;
    const insaat = yapilar.filter((y) => y.durum === "insaat" && !y.yukseltme).length;
    const kurulabilir = (this.p.ic.param.mulk?.yapiYuva[t.id] ?? 0) > 0;
    const konum: string[] = [];
    if (t.gerekliEtiket) konum.push(`Gerekli arazi etiketi: ${t.gerekliEtiket}`);
    if (t.gerekliRezerv >= 0) konum.push(`Gerekli rezerv: ${this.p.ic.mallar[t.gerekliRezerv]?.ad ?? "İçerik bilgisi bekleniyor"}`);
    return `<li><div class="ua-tesis-baslik">${ikon("factory", 14)}<b>${esc(t.ad)}</b><span>${kurulabilir ? "Mülk oyununda kurulabilir" : "İçerik tesisi; mülk oyununda kurulumu açık değil"}</span></div>`
      + `<p>${d ? `İşletmende ${fmt(biten)} tesis${insaat ? ` · ${fmt(insaat)} inşaat` : ""}` : "İşletme bilgisi bekleniyor"}${konum.length ? ` · ${esc(konum.join(" · "))}` : ""}</p>`
      + (t.gerekliTeknoloji ? this.teknoloji(t.gerekliTeknoloji, acik) : "") + "</li>";
  }

  private kendiTesisleri(yontem: string, yon: string, tesisler: readonly UretimTesisi[] | null): string {
    const id = esc(JSON.stringify([this.seciliMal, yon, yontem]));
    let h = `<details class="ua-kendi-tesisler" data-uretim-tesisler="${id}"${this.acikTesisler.has(id) ? " open" : ""}><summary>Kendi tesislerimde</summary>`;
    if (tesisler === null) return h + '<p class="ua-tesis-durum">Tesis bilgilerin henüz alınmadı.</p></details>';
    if (!tesisler.length) return h + '<p class="ua-tesis-durum">Bu yönteme uygun kendi tesisin veya inşaatın yok.</p></details>';
    h += '<ul class="ua-kendi-tesis-listesi">';
    for (const t of tesisler) {
      const tur = this.p.ic.turler[this.p.ic.turIdx[t.yapi.tur] ?? -1];
      const ad = this.p.tesisAdi?.(t.yapi) ?? tur?.ad ?? "Tesis bilgisi bekleniyor";
      const tesisNo = /^t(?:0|[1-9]\d*)$/.test(t.yapi.anahtar) && Number.isSafeInteger(Number(t.yapi.anahtar.slice(1))) ? ` · Tesis #${t.yapi.anahtar.slice(1)}` : "";
      const durum = t.durum === "insaat" ? "İnşa sürüyor" : t.durum === "bilgi_eksik" ? "Yöntem bilgisi bekleniyor" : t.durum === "kullaniyor" ? "Bu yöntemi zaten kullanıyor" : "Bu yöntemi inceleyebilirsin";
      h += `<li class="ua-kendi-tesis"><strong>${esc(ad + tesisNo)}</strong><p class="ua-tesis-durum">${esc(durum)}</p>`;
      if (t.yapi.durum === "tesis") h += `<p class="ua-tesis-durum">Mevcut yöntem: ${esc(t.mevcut?.ad ?? "Bilinmiyor")}</p>`;
      if (t.gecis) {
        const bekliyor = this.p.yontemBekliyor?.() === true;
        const destek = this.p.yontemDestegi === true;
        h += `<button type="button" class="ua-tesis-git" data-uretim-tesis="${esc(t.yapi.anahtar)}" data-uretim-yontem="${esc(t.hedef.id)}"${!destek || bekliyor ? " disabled" : ""}>Tesiste yöntemleri gör</button>`;
        if (!destek || bekliyor) h += `<p class="ua-tesis-durum">${bekliyor ? "Yöntem işleminin yanıtı bekleniyor." : "Yöntem seçimi bu bağlantıda kullanılamıyor."}</p>`;
      } else if (t.engel) h += `<p class="ua-tesis-durum">${esc(t.engel)}</p>`;
      h += '</li>';
    }
    return h + '</ul><p class="ua-tesis-durum">Bir tesis aynı anda tek yöntem çalıştırır; zincirin tüm aşamaları birlikte çalışmaz. Bu düğme yöntemi değiştirmez; seçim ve onay ayrıca yapılır.</p></details>';
  }

  private yontem(y: YontemT, d: IsletmeDurumu | null, acik: ReadonlySet<string> | null, yon: string): string {
    const turler = this.p.ic.turler.filter((t) => t.yontemler.includes(y.indeks));
    const tesisler = uretimTesisleri(this.p.ic, d, y.id);
    const mevcut = tesisler?.filter((t) => t.yapi.durum === "tesis" && t.mevcut?.id === y.id).map((t) => t.yapi) ?? [];
    const etkin = mevcut.filter((t) => t.aktif === true).length;
    const bilinmeyen = mevcut.filter((t) => t.aktif === undefined).length;
    const simge = yontemSimgesi(y.id);
    const simgeAdi: IkonAdi = simge && IKONLAR.includes(simge as IkonAdi) ? simge as IkonAdi : "factory";
    let h = `<article class="ua-yontem" data-uretim-yontem-kart="${esc(JSON.stringify([this.seciliMal, yon, y.id]))}"><header><h5>${ikon(simgeAdi, 18)}${esc(y.ad)}</h5><span class="ua-tarife-etiket">Nominal içerik tarifesi · saatlik</span></header>`;
    h += `<div class="ua-tarife"><div class="ua-girdi"><h6>${ikon("inbox", 14)} Girdi / saat</h6><div class="ua-kalemler">${this.tarife(y.girdi, "Mal girdisi yok")}</div></div><span class="ua-ok" aria-hidden="true">${ikon("chevron-right", 18)}</span><div class="ua-cikti"><h6>${ikon("package", 14)} Çıktı / saat</h6><div class="ua-kalemler">${this.tarife(y.cikti, "Mal çıktısı yok")}</div></div></div>`;
    h += `<p class="ua-aciklama">S ölçek · tam kadro ve tam verim · ${fmt(y.isci)} işçi. Bu tarife gerçekleşen üretim değildir.</p>`;
    const sebekeMallari = this.p.ic.param.mulk?.sebeke?.mallar ?? [];
    const sebekeGirdileri = y.girdi.filter(([mi, q]) => q > 0 && sebekeMallari.some((m) => m.mal === this.p.ic.mallar[mi]?.id));
    const stoksuzGirdiler = sebekeGirdileri.flatMap(([mi]) => {
      const mal = this.p.ic.mallar[mi];
      return mal && mal.id !== "elektrik" && mal.id !== "yakit" ? [mal.ad] : [];
    });
    if (stoksuzGirdiler.length) h += `<p class="ua-sebeke-notu">${ikon("info", 14)}<span>${esc(stoksuzGirdiler.join(", "))}: tesisler bu girdileri otomatik ücretli şebekeden karşılar; stok bu gideri azaltmaz.</span></p>`;
    if (sebekeGirdileri.some(([mi]) => this.p.ic.mallar[mi]?.id === "yakit")) h += `<p class="ua-sebeke-notu">${ikon("info", 14)}<span>${d?.yakitTedariki?.mal === "yakit" ? "Sanayi yakıtı önce depo ve ulaşmış tedarikten karşılanır. Yalnız eksik kısım otomatik ücretli şebekeden alınır; tarifedeki miktar gerçek tüketim değildir." : "Yakıt kaynak payları bilinmiyor; sunucu dökümü alınmadı. Eski veya kapalı stok önceliği kuralında tesis yakıtı otomatik ücretli şebekeden alınır; stok bu gideri azaltmaz."}</span></p>`;
    if (sebekeGirdileri.some(([mi]) => this.p.ic.mallar[mi]?.id === "elektrik")) h += `<p class="ua-sebeke-notu">${ikon("info", 14)}<span>Mülk oyununda kendi elektrik üretiminin karşılamadığı ihtiyaç otomatik ücretli şebekeden alınır.</span></p>`;
    if (y.gerekliTeknoloji) h += this.teknoloji(y.gerekliTeknoloji, acik);
    else h += '<p class="ua-durum">Yöntem için araştırma gerekmiyor.</p>';
    h += `<p class="ua-oyuncu-yontemi">${d ? `İşletmende bu yöntemi kullanan ${fmt(mevcut.length)} tesis · ${fmt(etkin)} etkin${bilinmeyen ? ` · ${fmt(bilinmeyen)} tesisin çalışma durumu bekleniyor` : ""}` : "Yöntemi kullanan tesislerin bilgisi bekleniyor."}</p>`;
    h += `<ul class="ua-tesisler">${turler.length ? turler.map((t) => this.tesis(t, d, acik)).join("") : "<li>İçerikte bu yöntem için tesis eşleşmesi bulunmuyor.</li>"}</ul>`;
    h += this.kendiTesisleri(y.id, yon, tesisler);
    return h + "</article>";
  }

  html(): string {
    if (typeof document !== "undefined") this.detaylariYakala(document);
    const ic = this.p.ic;
    const mal = ic.mallar[ic.malIdx[this.seciliMal] ?? -1];
    if (!mal) return '<p class="ipucu-metin">Üretim içeriği yükleniyor…</p>';
    const d = this.p.isletme();
    const acik = this.p.acikTeknolojiler();
    const veri = d?.mallar.find((m) => m.mal === mal.id);
    const bag = uretimBaglantilari(ic, mal.id);
    let h = `<section class="ua-panel"><h3>${ikon("factory", 18)} Üretim ağı</h3><p class="ipucu-metin">Bir mal seç; hangi yöntemle üretildiğini ve nerede kullanıldığını gör. Girdi ve çıktılara dokunarak zincirde ilerleyebilirsin.</p>`;
    h += '<nav class="ua-yollar" aria-label="Üretim zincirleri">';
    const yollar = uretimYollari(ic);
    for (const [kok, baslik, simge] of [
      ["tahil", "Tahıl ve gıda", "wheat"],
      ["yun", "Tekstil", "layers"],
      ["cevher", "Metal işleme", "hammer"],
      ["balik", "Su ürünleri", "package"],
      ["petrol", "Enerji ve yakıt", "flame"],
    ] as const) {
      const grup = yollar.filter((yol) => yol[0] === kok);
      if (!grup.length) continue;
      h += `<section class="ua-grup ua-grup-${kok}" aria-label="${baslik}"><h4>${ikon(simge, 16)} ${baslik}</h4>`;
      for (const yol of grup) h += `<div class="ua-yol">${yol.map((id) => this.malDugmesi(id)).join(`<span class="ua-yol-ok" aria-hidden="true">${ikon("chevron-right", 14)}</span>`)}</div>`;
      h += "</section>";
    }
    h += `</nav><details class="ua-mal-secimi"${this.malSecimiAcik ? " open" : ""}><summary>Tüm mallar</summary><div class="ua-mallar">`;
    h += ic.mallar.map((m) => this.malDugmesi(m.id)).join("") + "</div></details>";
    h += `<section class="ua-gercek" aria-label="Seçili malın işletme durumu"><h4>${ikon("package", 18)} ${esc(mal.ad)} <small>İşletmendeki gerçek durum</small></h4>`;
    if (d) {
      h += `<dl><div><dt>${mal.depolanabilir ? "Stok" : "Depolanamaz"}</dt><dd>${mal.depolanabilir ? sayi((veri?.stokMili ?? 0) / 1000, 3) + " birim" : "Anlık akış"}</dd></div><div><dt>Gerçek brüt üretim</dt><dd>${sayi((veri?.uretimMili ?? 0) / 1000, 3)} birim/saat</dd></div><div><dt>Gerçekleşen pazar alışı</dt><dd>${sayi((veri?.alisMili ?? 0) / 1000, 3)} birim/saat</dd></div></dl>`;
      const sebeke = d.sebeke?.find(([id]) => id === mal.id);
      if (mal.id === "yakit" && (ic.param.mulk?.sebeke?.mallar.some((m) => m.mal === mal.id) || d.yakitTedariki?.mal === mal.id)) h += yakitTedarikiHtml({ mal: mal.id, tedarik: d.yakitTedariki, giderler: d.sebekeGiderleri, malAdi: (id) => ic.mallar[ic.malIdx[id] ?? -1]?.ad ?? id });
      else if (sebeke) h += `<p class="ua-aciklama">Şebekeden alınan: ${sayi(sebeke[1] / 1000, 3)} birim/saat.</p>`;
      h += '<p class="ua-aciklama">Son sunucu işletme özeti; bütün sahipli işletmelerin toplamı. Üretim, satış veya kâr anlamına gelmez.</p>';
    } else h += '<p role="status">İşletme verisi bekleniyor. Aşağıdaki tarifeler içerik bilgisidir.</p>';
    if (ic.turler.some((tur) => !tur.tarimTesisi && tur.gerekliRezerv === ic.malIdx[mal.id])) {
      h += rezervGorunumuHtml({ mal: mal.id, ...(d?.rezervler !== undefined ? { rezervler: d.rezervler } : {}), ...(this.p.ilAdi ? { ilAdi: this.p.ilAdi } : {}) });
    }
    if (mal.depolanabilir) h += `<button type="button" class="eylem" data-uretim-tedarik="${esc(mal.id)}">${ikon("truck", 16)} ${esc(mal.ad)} tedarikine git</button>`;
    else h += '<p class="ua-aciklama">Bu mal depolanamaz ve pazardan ithal edilemez. Üretim yöntemlerini veya şebeke akışını inceleyebilirsin.</p>';
    h += "</section>";
    h += '<p class="ua-aciklama">Yol okları içerikteki girdi–çıktı bağını gösterir. Tesis sayısı, ölçek, kadro, verim, arazi ve girdi erişimi gerçekleşen üretimi değiştirir. Uygun konum yapı kurarken ayrıca denetlenir.</p>';
    for (const [baslik, liste, bos, yon] of [
      ["Bu malı üreten yöntemler", bag.ureten, "İçerikte bu malı üreten bir yöntem bulunmuyor.", "ureten"],
      ["Bu malı kullanan yöntemler", bag.kullanan, "İçerikte bu malı girdi olarak kullanan bir yöntem bulunmuyor.", "kullanan"],
    ] as const) {
      h += `<section class="ua-baglantilar"><h4>${baslik} <span>${fmt(liste.length)}</span></h4>`;
      h += liste.length ? liste.map((y) => this.yontem(y, d, acik, yon)).join("") : `<p class="ua-bos">${bos}</p>`;
      h += "</section>";
    }
    return h + "</section>";
  }

  private detaylariYakala(kok: ParentNode): void {
    const mallar = kok.querySelector<HTMLDetailsElement>(".ua-panel details.ua-mal-secimi");
    if (mallar) this.malSecimiAcik = mallar.open;
    for (const d of kok.querySelectorAll<HTMLDetailsElement>(".ua-panel details[data-uretim-tesisler]")) {
      const id = d.dataset["uretimTesisler"];
      if (id === undefined) continue;
      if (d.open) this.acikTesisler.add(esc(id));
      else this.acikTesisler.delete(esc(id));
    }
  }

  odagiYakala(kok: ParentNode): (() => void) | null {
    this.detaylariYakala(kok);
    const a = typeof document === "undefined" ? null : document.activeElement;
    if (!(a instanceof HTMLElement) || !a.closest(".ua-panel")) return null;
    const detay = a.tagName === "SUMMARY" ? a.closest<HTMLDetailsElement>("details") : null;
    const id = detay?.dataset["uretimTesisler"];
    const malBasligi = detay?.classList.contains("ua-mal-secimi") === true;
    const kart = a.closest<HTMLElement>("[data-uretim-yontem-kart]")?.dataset["uretimYontemKart"];
    const alanlar = ["data-uretim-mal", "data-uretim-tedarik", "data-uretim-teknoloji", "data-uretim-tesis", "data-uretim-yontem"].filter((alan) => a.hasAttribute(alan)).map((alan) => [alan, a.getAttribute(alan)] as const);
    return () => {
      const panel = kok.querySelector<HTMLElement>(".ua-panel");
      if (!panel) return;
      const kapsam = kart ? [...panel.querySelectorAll<HTMLElement>("[data-uretim-yontem-kart]")].find((x) => x.dataset["uretimYontemKart"] === kart) : panel;
      const hedef = id !== undefined ? [...panel.querySelectorAll<HTMLDetailsElement>("details[data-uretim-tesisler]")].find((d) => d.dataset["uretimTesisler"] === id)?.querySelector<HTMLElement>("summary") : malBasligi ? panel.querySelector<HTMLElement>(".ua-mal-secimi > summary") : alanlar.length ? [...(kapsam?.querySelectorAll<HTMLElement>("button") ?? [])].find((b) => alanlar.every(([alan, deger]) => b.getAttribute(alan) === deger)) : null;
      (hedef ?? panel.querySelector<HTMLElement>("button[data-uretim-mal].ua-secili"))?.focus({ preventScroll: true });
    };
  }
}

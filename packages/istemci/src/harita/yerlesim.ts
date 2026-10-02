/**
 * Yapı önce yerleşim (F4; DOM + MapLibre): yapı menüsü, haritada hayalet, R ile döndürme, maliyet kartı, onayda tek işlem.
 *
 * Akış: "Yapı kur" menüsünden yapı seç → hayalet imleci izler (geçerli mavi, geçersiz turuncu taralı; nedeni ipucunda) →
 * tıkla/dokun = yeri sabitle (maliyet kartı: arsa + yapı bedeli + süre) → "Kur" = `parsel_al` (boş hücreler) + `tesis_insa_hucre`
 * sırayla; ilki başarısızsa ikincisi gönderilmez (`zincir.ts`). Sonuç Türkçe bildirimle gelir. Hücre ızgarası bu akışta görünmez.
 * Klavye: R döndür · Enter kur · Esc vazgeç. Plan hesabı saftır (`yapi.ts`); bu dosya yalnız arayüzdür.
 */
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, Map as MlHarita, MapMouseEvent } from "maplibre-gl";
import { bildir } from "../arayuz/bildirim";
import { esc, fmt, para, paraMili, sureMetni } from "../arayuz/bicim";
import type { IlceSahipligi, MulkBaglantisi } from "./baglanti";
import { geriSeridiGorunur, yapiBittiMi } from "./gorunurluk";
import { dugmeBasili, KartDurumu, kapaliDugmeOznitelikleri, kartYerlesimi } from "./kart-durum";
import type { AyrilmisHakki } from "./fiyat";
import { dukkanMaliyetDurumu, dukkanMaliyetGirdisi } from "./dukkan-kaynak";
import type { DukkanKurBilgisi } from "./dukkan-kaynak";
import { maliyetSatirlariHtml, turSecimiHtml } from "./dukkan-html";
import { dukkanMetni } from "./dukkan-metin";
import type { DukkanTuru } from "./dukkan-veri";
import { hucreSiniri, noktadanHucre } from "./hucre";
import type { Izgara } from "./hucre";
import { ETIKET_ADI, GRUP_SIRASI, malzemeMetni, yapiRengiCss, yerlesimPlani } from "./yapi";
import { yapiSureHtml, yapiSuresi } from "./yapi-sure";
import { ikon } from "../tasarim/ikon";
import { icerikMetni } from "../tasarim/icerik-metin";
import type { Icerik } from "../komut/tablo";
import { sebekeFiyatlari } from "./sebeke-gider";
import { komutYontemi, onayAcik, seciciGorunur, seciciTusu, tekSecilebilir, yontemSecenekleri, yontemSecimiTamam, yontemSeciciHtml } from "./yontem-secici";
import type { YontemSecenegi } from "./yontem-secici";
import { yontemMetni } from "./yontem-metin";
import { tesisRolu } from "./tesis-rol-metin";
import type { YapiTanimi, YerlesimPlani } from "./yapi";
import { yerlesimiUygula } from "./zincir";
import { yurtPlani } from "./yurt";
import type { YurtPlani } from "./yurt";

export interface YerlesimGirdisi {
  ml: MlHarita;
  /** Haritanın kabı (ipucu konumu ve imleç için). */
  kap: HTMLElement;
  /** Maliyet kartının ekleneceği sahne kabı. */
  sahneKap: HTMLElement;
  /** Menü düğmesinin ekleneceği sol üst sütun. */
  gezgin: HTMLElement;
  baglanti: MulkBaglantisi;
  katalog: readonly YapiTanimi[];
  ilce: () => string | null;
  izgara: () => Izgara | null;
  sahiplik: () => IlceSahipligi | null;
  ad: (sahip: string) => string;
  /** Hücre kamu arsasındaysa Türkçe ret nedeni (satışa ve yerleşime kapalı), değilse null. */
  kamu: (id: string) => string | null;
  /** Sahipliği sunucudan/bağdaştırıcıdan tazeler ve çizer. */
  yenile: () => Promise<void>;
  ipucu: (html: string, x: number, y: number, uyari: boolean, sure?: number) => void;
  ipucuGizle: () => void;
  /** Arsa düzeyine (L3) yakınlaş. */
  yakinlas: () => void;
  /** Hayalet etkinken alt çubuğu gizle/göster. */
  altGizle: (gizle: boolean) => void;
  /** Yapı seçilip yerleşim başlarken (ör. ölçek büyütme kipini kapatmak için). */
  basliyor?: () => void;
  /** Oyuncunun bu ilçedeki ayrılmış hücre hakkı (bilinmiyorsa tanımsız). */
  ayrilmisHakki?: () => AyrilmisHakki | undefined;
  /** İlk-yapı indirimi: oran (ppm) ve kalan hak; bilinmiyorsa tanımsız (indirim uygulanmaz). */
  indirim?: () => { ppm: number; kalan: number } | undefined;
  /** Dükkân kurma bilgisi (D2 tür seçimi, D3 satırları); dünyada dükkân yoksa tanımsız: `dukkan` yapısı düz yapı kartıyla çıkar. */
  dukkan?: () => DukkanKurBilgisi | undefined;
  /** İçerik tablosu (yöntem seçici: tesis türünün yöntemleri içerikten okunur); tanımsızsa seçici hiç çıkmaz (bugünkü davranış). */
  tablo?: Icerik;
}

const BOS: FeatureCollection = { type: "FeatureCollection", features: [] };

function renk(ad: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(ad).trim() || "#888";
}

function hucreCokgeni(x: number, y: number, oz: Record<string, unknown>): Feature<Polygon> {
  const [b, g, d, k] = hucreSiniri(x, y);
  return { type: "Feature", properties: oz, geometry: { type: "Polygon", coordinates: [[[b, g], [d, g], [d, k], [b, k], [b, g]]] } };
}

/** Onaydan sonra geri alma penceresi (ürün kararı: 5 dk). */
const GERI_AL_MS = 5 * 60 * 1000;

export class YerlesimKipi {
  private yapi: YapiTanimi | null = null;
  private donus = 0;
  /** Sabitlenen çapa hücresi (tıklama/dokunma); null: imleci izler. */
  private sabit: { x: number; y: number } | null = null;
  private plan: YerlesimPlani | null = null;
  private uygulaniyor = false;
  private oneriId: string | null = null;
  /** Dükkân kurulurken seçilen tür (D2); `sec` her yapı seçiminde sıfırlar. */
  private dukkanTuru: DukkanTuru | null = null;
  /** Oyuncu tür seçmeden "Dükkânı kur"a basmayı denedi: `D2.tur_gerekli` ancak o zaman gösterilir (seçim denenmeden ret tonu yok). */
  private turDenendi = false;
  /** Yapı kurulurken seçilen üretim yöntemi (çok yöntemli türde; VARSAYILAN YOK: seçilene dek "Kur" kapalı). `sec` ve `iptal` sıfırlar. */
  private yontem: string | null = null;
  /** İmlecin son hücresi (sabitlenmeden R'ye basılırsa hayalet burada döner). */
  private sonHover: { x: number; y: number } | null = null;
  /** Son başarılı işlem: 5 dk içinde "Geri al" (bağdaştırıcı `yapiGeriAl` sunuyorsa). */
  private sonIslem: { ilce: string; ad: string; hucreler: string[]; alinan: string[]; bitis: number } | null = null;
  private geriZamanlayici = 0;
  /** Son bildirilen harita düzeyi (0 küre, 1 il, 2 ilçe, 3 arsa): "Geri al" şeridi yalnız 2 ve 3'te görünür. */
  private duzeyNo = 0;
  private geri: HTMLElement;
  private menuAcik = false;
  private seritAcik = false;
  private hazir = false;
  readonly dugme: HTMLButtonElement;
  private menu: HTMLElement;
  private kart: HTMLElement;
  /** Kalıcı neden bölgesi (`role=status`): kart yenilenince yeniden okunmaz (kart-durum.ts). */
  private readonly nedenBolgesi = new KartDurumu();

  constructor(private g: YerlesimGirdisi) {
    this.dugme = document.createElement("button");
    this.dugme.type = "button";
    this.dugme.id = "yapi-menu-dugme";
    this.dugme.className = "yapi-dugme birincil";
    this.dugme.hidden = true;
    this.dugme.setAttribute("aria-haspopup", "true");
    this.dugme.setAttribute("aria-expanded", "false");
    this.dugme.setAttribute("aria-controls", "yapi-menu");
    this.dugme.setAttribute("aria-pressed", "false");
    this.dugme.innerHTML = `${ikon("hammer", 17)}Yapı kur`;
    this.dugme.title = "Önce yapıyı seç, sonra haritada yerleştir; arsa aynı işlemde alınır";
    this.menu = document.createElement("div");
    this.menu.id = "yapi-menu";
    this.menu.hidden = true;
    this.menu.setAttribute("role", "menu");
    this.menu.setAttribute("aria-label", "Yapı menüsü");
    g.gezgin.append(this.dugme, this.menu);
    this.kart = document.createElement("section");
    this.kart.id = "yapi-kart";
    this.kart.hidden = true;
    this.kart.setAttribute("aria-label", "Yapı maliyet kartı");
    g.sahneKap.append(this.kart);
    this.geri = document.createElement("div");
    this.geri.id = "yapi-geri";
    this.geri.hidden = true;
    this.geri.setAttribute("role", "status");
    // Sol üst sütunda (hazine çipinin altında): alttaki maliyet kartı ve alt çubukla çakışmaz.
    g.gezgin.append(this.geri);
    this.geri.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("[data-yg='geri-al']")) void this.geriAl();
      else if ((e.target as HTMLElement).closest("[data-yg='kapat']")) this.geriGizle();
    });
    this.menuyuYaz();
    this.dugme.addEventListener("click", () => this.menuAc(!this.menuAcik));
    this.menu.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-yapi]") as HTMLButtonElement | null;
      if (b?.dataset["yapi"]) this.sec(b.dataset["yapi"]);
    });
    this.kart.addEventListener("click", (e) => {
      const hedef = e.target as HTMLElement;
      const tur = hedef.closest("button[data-tur]") as HTMLButtonElement | null;
      if (tur) {
        if (tur.getAttribute("aria-disabled") !== "true") this.turSec(tur.dataset["tur"] as DukkanTuru);
        return;
      }
      if (hedef.closest("button[data-eylem='pazardan-al']")) {
        this.pazarHatirlat();
        return;
      }
      const ym = hedef.closest("button.ym-kart") as HTMLButtonElement | null;
      if (ym) {
        if (ym.getAttribute("aria-disabled") !== "true") this.yontemSec(ym.dataset["yontem"] ?? "", true);
        return;
      }
      const b = hedef.closest("button[data-yk]") as HTMLButtonElement | null;
      const ey = b?.dataset["yk"];
      if (b?.getAttribute("aria-disabled") === "true") {
        // kapalı onay düğmesi: tıklama/Enter etkisiz (neden bölgede okunur); tür seçilmeden dükkân kurma denemesi nedeni gösterir
        if (ey === "onayla") this.turDeneniyor();
        return;
      }
      if (ey === "don") this.dondur();
      else if (ey === "vazgec") this.iptal();
      else if (ey === "onayla") void this.onayla();
    });
    // Yöntem seçici klavyesi (radiogroup): oklar/Home/End odağı ve seçimi taşır, Boşluk/Enter seçer; olay haritanın global tuşlarına (Enter = kur, R, Esc) KABARMAZ
    this.kart.addEventListener("keydown", (e) => {
      const kartEl = (e.target as HTMLElement).closest("button.ym-kart") as HTMLButtonElement | null;
      if (!kartEl) return;
      const id = seciciTusu(e.key, this.yontemler(), kartEl.dataset["yontem"] ?? null);
      if (e.key === "Escape") return; // Esc yapı kipinden vazgeçer (global)
      e.stopPropagation();
      if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", " ", "Spacebar", "Enter"].includes(e.key)) return;
      e.preventDefault();
      if (id !== null) this.yontemSec(id, true);
    });
    document.addEventListener("pointerdown", (e) => {
      if (this.menuAcik && !(e.target as HTMLElement).closest("#yapi-menu, #yapi-menu-dugme")) this.menuAc(false);
    });
  }

  get aktif(): boolean {
    return this.yapi !== null;
  }

  /** Maliyet kartının kabı (ölçek büyütme kipi aynı kabı kullanır; aynı anda yalnız biri açıktır). */
  get kartKabi(): HTMLElement {
    return this.kart;
  }

  get seciliYapi(): string | null {
    return this.yapi?.id ?? null;
  }

  /**
   * Tek birincil kuralı: varış kartı ("Yurdunda kur") açıkken üstteki "Yapı kur" düğmesi birincil olmaz; kart kapanınca geri gelir.
   */
  birincilAyarla(birincil: boolean): void {
    this.dugme.classList.toggle("birincil", birincil);
  }

  /**
   * Yurt önce: yapıyı oyuncunun KENDİ boş hücrelerine (yurt) yerleştirir ve tek işlemde kurar (arsa parası ödenmez; geri al şeridi
   * açılır). Sığmıyorsa ya da plan geçersizse kurmaz ve nedeni söyler. Başarılıysa true.
   */
  async yurdaKur(yapiId: string): Promise<{ tamam: boolean; neden?: string }> {
    if (this.uygulaniyor) return { tamam: false };
    if (!this.sec(yapiId)) return { tamam: false, neden: "Bu ilçede yapı kurulamıyor." };
    const y = this.yapi as YapiTanimi;
    const b = this.baglam();
    const yp = b ? yurtPlani(y, b) : null;
    if (!yp?.plan || yp.cx === undefined || yp.cy === undefined) {
      this.iptal();
      return { tamam: false, neden: yp?.neden ?? "Bu ilçede yapı kurulamıyor." };
    }
    if (!yp.plan.gecerli) {
      const neden = yp.plan.neden ?? "Bu yapı yurdunda kurulamıyor.";
      this.iptal();
      return { tamam: false, neden };
    }
    this.donus = yp.donus ?? 0;
    this.sabit = { x: yp.cx, y: yp.cy };
    this.plan = yp.plan;
    this.hayaletCiz(yp.plan);
    this.kartiYaz();
    // Çok yöntemli türde yöntem seçilmeden otomatik kurulmaz (varsayılan yok): kip yurt hücrelerinde açık kalır, oyuncu seçip "Kur"a basar
    if (!yontemSecimiTamam(this.yontemler(), this.yontem)) return { tamam: false, neden: yontemMetni("yontem.secici.sec") };
    const tamam = await this.onayla();
    return { tamam };
  }

  /** Yurt önce varış kartı için: yapının yurda yerleşim durumu (plan, boş hücre sayısı, neden). Bağlam yoksa tanımsız. */
  yurtDurumu(y: YapiTanimi): YurtPlani | undefined {
    const b = this.baglam();
    return b ? yurtPlani(y, b) : undefined;
  }

  /** Sınama kancası: şu anki plan. */
  get gecerliPlan(): YerlesimPlani | null {
    return this.plan;
  }

  /** Harita stili yüklendikten sonra: hayalet kaynağı, katmanları ve taralı desen. */
  kur(): void {
    const h = this.g.ml;
    if (this.hazir) return;
    h.addSource("hayalet", { type: "geojson", data: BOS });
    this.desen();
    // Geçerli: "Sen" (çini); geçersiz: hata (soluk kiremit-kırmızı) + tarama (taramanın anlamlı olduğu tek yer).
    // Satın alınacak (boş) hücre daha açık ve kesikli çizgili.
    h.addLayer({
      id: "hayalet-dolgu",
      type: "fill",
      source: "hayalet",
      paint: { "fill-color": ["case", ["==", ["get", "g"], 1], renk("--sen"), renk("--hata")], "fill-opacity": ["case", ["==", ["get", "g"], 1], ["case", ["==", ["get", "b"], 1], 0.3, 0.55], 0.22] },
    });
    h.addLayer({ id: "hayalet-tarali", type: "fill", source: "hayalet", filter: ["==", ["get", "g"], 0], paint: { "fill-pattern": "hayalet-tarali", "fill-opacity": 0.95 } });
    h.addLayer({
      id: "hayalet-cizgi",
      type: "line",
      source: "hayalet",
      paint: { "line-color": ["case", ["==", ["get", "g"], 1], renk("--sen"), renk("--hata")], "line-width": 2.2 },
    });
    h.addLayer({ id: "hayalet-bos-cizgi", type: "line", source: "hayalet", filter: ["all", ["==", ["get", "g"], 1], ["==", ["get", "b"], 1]], paint: { "line-color": renk("--sen"), "line-width": 2.2, "line-dasharray": [1.6, 1.2] } });
    this.hazir = true;
  }

  private desen(): void {
    const c = renk("--hata");
    const m = /^#([0-9a-f]{6})$/i.exec(c);
    const v = m ? parseInt(m[1]!, 16) : 0xb53434;
    const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    const data = new Uint8Array(8 * 8 * 4);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = (y * 8 + x) * 4;
        const cizgi = (x + y) % 8 < 3;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = cizgi ? 170 : 30;
      }
    if (this.g.ml.hasImage("hayalet-tarali")) this.g.ml.updateImage("hayalet-tarali", { width: 8, height: 8, data });
    else this.g.ml.addImage("hayalet-tarali", { width: 8, height: 8, data });
  }

  temaUygula(): void {
    if (!this.hazir) return;
    const h = this.g.ml;
    this.desen();
    h.setPaintProperty("hayalet-dolgu", "fill-color", ["case", ["==", ["get", "g"], 1], renk("--sen"), renk("--hata")]);
    h.setPaintProperty("hayalet-cizgi", "line-color", ["case", ["==", ["get", "g"], 1], renk("--sen"), renk("--hata")]);
    h.setPaintProperty("hayalet-bos-cizgi", "line-color", renk("--sen"));
  }

  // --- menü -------------------------------------------------------------------------------------------

  /** Yeni ilçe/düzey: menü düğmesi yalnız ızgaralı ilçede ve yapı kurabilen bağdaştırıcıda görünür. */
  gorunurluk(duzey: number): void {
    this.duzeyNo = duzey;
    if (this.sonIslem) this.geriYaz();
    const var_ = duzey >= 2 && !!this.g.izgara() && !!this.g.baglanti.tesisInsa && this.g.katalog.length > 0;
    this.dugme.hidden = !var_;
    if (!var_) {
      this.menuAc(false);
      if (this.yapi) this.iptal();
    }
  }

  /** Yerleş ekranının açılış önerisi: menüde "Önerilen" rozeti. */
  oneriAyarla(yapiId: string | null): void {
    this.oneriId = yapiId;
    this.menuyuYaz();
  }

  private menuyuYaz(): void {
    const gruplar = new Map<string, YapiTanimi[]>();
    for (const y of this.g.katalog) {
      let l = gruplar.get(y.grup);
      if (!l) gruplar.set(y.grup, (l = []));
      l.push(y);
    }
    const html: string[] = [];
    for (const ad of GRUP_SIRASI) {
      const l = gruplar.get(ad);
      if (!l) continue;
      html.push(`<h4>${esc(ad)}</h4>`);
      for (const y of l) {
        const notlar: string[] = [`${y.yuva} hücre`, paraMili(y.paraMili, "yukari"), sureMetni(yapiSuresi(y.sureSaat, this.g.baglanti.erkenOyunCarpani?.() ?? 1).simdi)];
        const koşul: string[] = [];
        if (y.gerekliEtiket) koşul.push(`${ETIKET_ADI[y.gerekliEtiket] ?? y.gerekliEtiket} ilinde`);
        if (y.gerekliTeknoloji) koşul.push("teknoloji gerekir");
        if (y.enFazlaIlBasina) koşul.push(`ilde en çok ${y.enFazlaIlBasina}`);
        html.push(
          `<button type="button" role="menuitem" data-yapi="${esc(y.id)}"><span class="yapi-ad"><i class="yapi-nokta" style="--kr:${yapiRengiCss(y.id)}"></i>${y.id === "ordugah" ? `${ikon("shield", 16)} ` : ""}${esc(y.ad)}${y.id === this.oneriId ? ' <i class="oneri-rozet">Önerilen</i>' : ""}</span><small>${esc(notlar.join(" · "))}</small>${koşul.length ? `<small class="yapi-kosul">${esc(koşul.join(" · "))}</small>` : ""}</button>`,
        );
      }
    }
    this.menu.innerHTML = html.join("");
  }

  /**
   * "Yapı kur" düğmesi basılı mı (tek birincil kuralı): yapı kartı ya da arsa şeridi açıkken düğme tonlu (`aria-pressed="true"`; stil T1'in
   * CSS'inde), böylece ekranda tek dolu birincil kalır (kartta "… kur", şeritte "Satın al"). Kapanınca false.
   */
  private basiliGuncelle(): void {
    this.dugme.setAttribute("aria-pressed", String(dugmeBasili(this.yapi !== null, this.seritAcik)));
  }

  /** Alt arsa şeridinin açık olup olmadığı (görünüm bildirir). */
  seritDurumu(acik: boolean): void {
    if (this.seritAcik === acik) return;
    this.seritAcik = acik;
    this.basiliGuncelle();
  }

  menuAc(ac: boolean): void {
    this.menuAcik = ac;
    this.menu.hidden = !ac;
    this.dugme.setAttribute("aria-expanded", String(ac));
  }

  // --- seçim ve hayalet -------------------------------------------------------------------------------

  /** Yapıyı seçer ve hayalet kipine girer (menüden ya da programatik). */
  sec(yapiId: string): boolean {
    const y = this.g.katalog.find((k) => k.id === yapiId);
    if (!y || !this.g.izgara()) return false;
    this.g.basliyor?.();
    this.yapi = y;
    this.dukkanTuru = null;
    this.turDenendi = false;
    // Çok yöntemli türde seçici açılır, hiçbiri seçili gelmez; seçilebilir (kilitsiz) yöntem TEK ise o seçili gelir (gizlenecek alternatif yok)
    this.yontem = tekSecilebilir(this.yontemler())?.id ?? null;
    this.donus = 0;
    this.sabit = null;
    this.sonHover = null;
    this.plan = null;
    this.menuAc(false);
    this.g.altGizle(true);
    this.g.yakinlas();
    this.g.kap.classList.add("yapi-kipi");
    this.basiliGuncelle();
    this.kartiYaz();
    this.hayaletCiz(null);
    return true;
  }

  iptal(): void {
    if (!this.yapi) return;
    this.yapi = null;
    this.dukkanTuru = null;
    this.turDenendi = false;
    this.yontem = null;
    this.sabit = null;
    this.plan = null;
    this.g.kap.classList.remove("yapi-kipi");
    this.basiliGuncelle();
    this.g.ipucuGizle();
    this.g.altGizle(false);
    this.hayaletCiz(null);
    this.kart.hidden = true;
  }

  dondur(): void {
    if (!this.yapi) return;
    this.donus = (this.donus + 1) % 2;
    const c = this.sabit ?? this.sonHover;
    if (c) this.planla(c.x, c.y);
    else this.kartiYaz();
  }

  private baglam(): Parameters<typeof yerlesimPlani>[4] | null {
    const iz = this.g.izgara();
    const sh = this.g.sahiplik();
    if (!iz || !sh) return null;
    const oz = this.g.baglanti.ozet?.() ?? null;
    return { izgara: iz, sahiplik: sh, ben: this.g.baglanti.ben.id, ad: this.g.ad, hazineMili: oz?.hazineMili ?? null, surenInsaat: oz?.surenInsaat ?? 0, kamu: this.g.kamu, ...this.hakAlani(), ...this.indirimAlani() };
  }

  private indirimAlani(): { indirim?: { ppm: number; kalan: number } } {
    const i = this.g.indirim?.();
    return i ? { indirim: i } : {};
  }

  private hakAlani(): { ayrilmisHakki?: AyrilmisHakki } {
    const h = this.g.ayrilmisHakki?.();
    return h ? { ayrilmisHakki: h } : {};
  }

  private planla(x: number, y: number): void {
    const y_ = this.yapi;
    const b = this.baglam();
    if (!y_ || !b) return;
    this.plan = yerlesimPlani(y_, x, y, this.donus, b);
    this.hayaletCiz(this.plan);
    this.kartiYaz();
  }

  private hayaletCiz(p: YerlesimPlani | null): void {
    const src = this.g.ml.getSource("hayalet") as GeoJSONSource | undefined;
    if (!src) return;
    if (!p) {
      src.setData(BOS);
      return;
    }
    src.setData({
      type: "FeatureCollection",
      features: p.hucreler.map((h) => hucreCokgeni(h.x, h.y, { g: p.gecerli ? 1 : 0, b: h.benim ? 0 : 1 })),
    });
  }

  /** Harita imleci hareketi (hayalet imleci izler; yeri sabitlenmişse yerinde kalır). */
  uzerinde(e: MapMouseEvent): void {
    if (!this.yapi || this.sabit || this.uygulaniyor) return;
    const c = noktadanHucre(e.lngLat.lng, e.lngLat.lat);
    this.sonHover = { x: c.x, y: c.y };
    this.planla(c.x, c.y);
    const p = this.plan;
    if (p && !p.gecerli && p.neden) this.g.ipucu(`<b>Buraya kurulamaz</b> · ${esc(p.neden)}`, e.point.x, e.point.y, true);
    else this.g.ipucuGizle();
  }

  /** Haritaya tıklama / dokunma: yeri sabitler (tekrar tıklayınca taşır). */
  tikla(e: MapMouseEvent): void {
    if (!this.yapi || this.uygulaniyor) return;
    const c = noktadanHucre(e.lngLat.lng, e.lngLat.lat);
    this.sabit = { x: c.x, y: c.y };
    this.planla(c.x, c.y);
    const p = this.plan;
    if (p && !p.gecerli && p.neden) this.g.ipucu(`<b>Buraya kurulamaz</b> · ${esc(p.neden)}`, e.point.x, e.point.y, true, 3200);
    else this.g.ipucuGizle();
  }

  /** Klavye: R döndür, Enter kur, Esc vazgeç. İşlendiyse true. */
  tus(e: KeyboardEvent): boolean {
    if (!this.yapi) return false;
    if (e.key === "r" || e.key === "R") {
      this.dondur();
      return true;
    }
    if (e.key === "Enter") {
      if (this.plan?.gecerli && this.sabit) void this.onayla();
      return true;
    }
    if (e.key === "Escape") {
      this.iptal();
      return true;
    }
    return false;
  }

  /** Sahiplik ya da hazine değişti: planı yeniden hesapla. */
  tazele(): void {
    if (this.yapi && this.sabit) this.planla(this.sabit.x, this.sabit.y);
    else if (this.yapi) this.kartiYaz();
  }

  // --- kart -------------------------------------------------------------------------------------------

  private kartiYaz(): void {
    const y = this.yapi;
    if (!y) {
      this.kart.hidden = true;
      return;
    }
    const p = this.plan;
    const oz = this.g.baglanti.ozet?.() ?? null;
    const sabit = this.sabit !== null && p !== null;
    const baslik = `<div class="yk-baslik"><div><b>${y.id === "ordugah" ? `${ikon("shield", 16)} ` : ""}${esc(y.ad)}</b><small>${esc(y.grup)} · ${y.yuva} hücre${y.ek ? "" : ""}</small></div><button type="button" data-yk="vazgec" aria-label="Vazgeç (Esc)" title="Vazgeç (Esc)">${ikon("x", 18)}</button></div>`;
    const dk = y.id === "dukkan" ? this.g.dukkan?.() : undefined;
    if (dk) {
      this.dukkanKartiYaz(y, p, sabit, baslik, dk, oz);
      return;
    }
    const govde = this.govde(y, p, sabit, oz);
    const yontemler = this.yontemler();
    const yontemTamam = yontemSecimiTamam(yontemler, this.yontem);
    // Yöntem seçilmeden "Kur" kapalı: neden bölgesi (düğmenin aria-describedby'ı) "Bir yöntem seç." der; plan nedeni varsa o önce gelir
    this.nedenBolgesi.yaz(p?.neden ?? (!yontemTamam && p?.gecerli && sabit ? yontemMetni("yontem.secici.sec") : null));
    const isl = this.g.baglanti.isletme?.() ?? null;
    const stok = isl ? (mal: string): number => isl.mallar.find((x) => x.mal === mal)?.stokMili ?? 0 : undefined;
    const secici = yontemSeciciHtml({ yapiAd: y.ad, secenekler: yontemler, secili: this.yontem, kilitli: this.uygulaniyor, kimlik: "yapi", ...(stok ? { stok } : {}) });
    // T-3: yöntemli tesiste (seçici görünürken) rolü anlatan tek satır: başlığın hemen altında, seçicinin üstünde
    const askeriMetin = y.id === "ordugah" ? icerikMetni("yapi", y.id) : undefined;
    const rol = askeriMetin ? `${askeriMetin.aciklama} ${askeriMetin.ipucu ?? ""}` : seciciGorunur(yontemler) ? tesisRolu(y.id) : null;
    const rolHtml = rol ? `<p class="yk-rol">${esc(rol)}</p>` : "";
    const kur = this.uygulaniyor ? "Kuruluyor…" : `${esc(y.ad)} kur`;
    const odakYontem = document.activeElement instanceof HTMLElement && this.kart.contains(document.activeElement) ? document.activeElement.dataset["yontem"] : undefined;
    this.kart.innerHTML = `${baslik}${rolHtml}${secici}${govde}<div class="yk-dugmeler"><button type="button" data-yk="don" title="Döndür (R)">${ikon("rotate-cw", 16)}Döndür <kbd>R</kbd></button><button type="button" data-yk="vazgec">Vazgeç</button><button type="button" class="birincil" data-yk="onayla" ${kapaliDugmeOznitelikleri(onayAcik({ gecerli: !!p?.gecerli, sabit, uygulaniyor: this.uygulaniyor, yontemTamam }), !!p?.neden || (!yontemTamam && !!p?.gecerli && sabit))}>${kur}</button></div>`;
    this.nedenBolgesi.yerlestir(this.kart);
    if (odakYontem) [...this.kart.querySelectorAll<HTMLElement>(".ym-kart")].find((e) => e.dataset["yontem"] === odakYontem)?.focus({ preventScroll: true });
    this.kart.hidden = false;
    this.konumAyarla();
  }

  /**
   * Kart konumu: hedef hücreyi (sabitlenen ya da imlecin altındaki) örtmeyen taraf (`data-konum="ust"` ya da varsayılan alt). Kartın ÖLÇÜLEN yüksekliği kullanılır
   * (`kartYerlesimi`): iki taraf da örtüyorsa kartın en büyük yüksekliği hedefin üstündeki/altındaki alana sınırlanır (iç kaydırma). Kart yazıldıktan sonra çağrılır.
   */
  private konumAyarla(): void {
    const c = this.sabit ?? this.sonHover;
    const kap = this.g.ml.getContainer().clientHeight;
    let y: number | null = null;
    let yari = 0;
    if (c) {
      const [b, g, d, k] = hucreSiniri(c.x, c.y);
      y = this.g.ml.project([(b + d) / 2, (g + k) / 2]).y;
      yari = Math.abs(this.g.ml.project([b, g]).y - this.g.ml.project([d, k]).y) / 2;
    }
    // Doğal yükseklik: önceki konum/sınır kalkınca ölçülür (gizliyse ölçü yok: eski kural)
    delete this.kart.dataset["konum"];
    this.kart.style.maxHeight = "";
    this.kart.style.overflowY = "";
    delete this.kart.dataset["sinirli"];
    const telefon = window.matchMedia("(max-width: 820px)").matches;
    const r = kartYerlesimi(y, { kartYukseklik: this.kart.hidden ? 0 : this.kart.offsetHeight, kapYukseklik: kap, ustPx: telefon ? 64 : 72, altPx: telefon ? 32 : 36, hedefYari: yari });
    if (r.konum) this.kart.dataset["konum"] = r.konum;
    if (r.enYuksek !== null) {
      this.kart.style.maxHeight = `${r.enYuksek}px`;
      this.kart.style.overflowY = "auto";
      this.kart.dataset["sinirli"] = "1"; // CSS: Kur/Vazgeç satırı yapışık
    }
  }

  /** Standart maliyet gövdesi: ipucu (yer seçilmedi) ya da arsa/yapı/süre/toplam satırları ve neden yeri. */
  private govde(y: YapiTanimi, p: YerlesimPlani | null, sabit: boolean, oz: ReturnType<NonNullable<MulkBaglantisi["ozet"]>> | null): string {
    if (!p) return `<p class="yk-ipucu">${window.matchMedia("(pointer: coarse)").matches ? "Yerleştirmek için haritaya dokun." : "Haritada yeri seç: tıkla. R: döndür · Esc: vazgeç."}</p>`;
    const arsa = p.alinacak.length > 0 ? `${fmt(p.alinacak.length)} hücre alınacak · <b>${paraMili(p.arsaMili, "yukari")}</b>` : `Kendi arsan: <b>${para(0)}</b>`;
    const sure = yapiSureHtml(yapiSuresi(y.sureSaat, this.g.baglanti.erkenOyunCarpani?.() ?? 1));
    const malzeme = malzemeMetni({ malzeme: p.malzeme });
    return `<dl class="yk-satirlar">
        <dt>Arsa</dt><dd data-yk-alan="arsa">${arsa}</dd>
        <dt>Yapı</dt><dd data-yk-alan="yapi"><b>${paraMili(p.yapiMili, "yukari")}</b>${malzeme ? ` <small>+ ${esc(malzeme)}</small>` : ""}${p.indirimli ? " <small>ilk yapı indirimli</small>" : ""}</dd>
        <dt>Süre</dt><dd data-yk-alan="sure">${sure}</dd>
        <dt class="yk-toplam">Toplam</dt><dd class="yk-toplam" data-yk-alan="toplam"><b>${paraMili(p.toplamMili, "yukari")}</b>${oz?.hazineMili != null ? ` <small>Hazine ${paraMili(oz.hazineMili, "asagi")}</small>` : ""}</dd>
      </dl>
      ${p.neden ? `<span data-yk-neden-yer></span>` : sabit ? "" : `<p class="yk-ipucu">Yeri sabitlemek için seç.</p>`}`;
  }

  /** Seçili yapının yöntemleri (içerikten; ek yapı ve içerik yoksa boş). Teknolojisi açık olmayanlar kilitli; açık teknolojiler bilinmiyorsa (sahte bağdaştırıcı, kare henüz yok) teknoloji isteyen yöntem temkinli biçimde kilitli sayılır (sunucu zaten reddederdi). */
  private yontemler(): YontemSecenegi[] {
    const y = this.yapi;
    const ic = this.g.tablo;
    if (!y || !ic || y.ek) return [];
    const acik = this.g.baglanti.acikTeknolojiler?.() ?? null;
    return yontemSecenekleri(ic, y.id, { acik: (t) => acik !== null && acik.has(t), sebeke: sebekeFiyatlari(ic) });
  }

  /** Yöntem seçimi (kart ya da klavye): kilitsiz bir yöntem; kart yenilenir ve odak (klavyede) seçilen karta döner. */
  private yontemSec(id: string, odakla = false): void {
    if (this.uygulaniyor) return;
    const s = this.yontemler().find((x) => x.id === id);
    if (!s || s.kilitli) return;
    this.yontem = id;
    this.kartiYaz();
    if (odakla) this.kart.querySelector<HTMLElement>(`.ym-kart[data-yontem="${id.replace(/"/g, "")}"]`)?.focus();
  }

  /** Tür seçilmeden kur denendi: neden gösterilir (yalnız dükkân kartında). */
  private turDeneniyor(): void {
    if (this.yapi?.id !== "dukkan" || this.dukkanTuru !== null) return;
    this.turDenendi = true;
    this.kartiYaz();
  }

  /** Dükkân kartında tür seçilene dek maliyet satırı yok (D2'de yinelenmez; yalnız D3'te): yalnız yer ipucu ve (varsa) neden yeri. */
  private dukkanIpucu(y: YapiTanimi, p: YerlesimPlani | null, sabit: boolean, oz: ReturnType<NonNullable<MulkBaglantisi["ozet"]>> | null): string {
    if (!p) return this.govde(y, null, sabit, oz);
    return p.neden ? `<span data-yk-neden-yer></span>` : sabit ? "" : `<p class="yk-ipucu">Yeri sabitlemek için seç.</p>`;
  }

  /** Dükkân seçimi (D2): tür seçilince kart yenilenir (maliyet satırları D3). */
  private turSec(tur: DukkanTuru): void {
    if (this.yapi?.id !== "dukkan" || this.uygulaniyor) return;
    this.dukkanTuru = tur;
    this.turDenendi = false;
    this.kartiYaz();
  }

  /** "Pazar'dan al" (eksik pencere): Pazar yüzeyi bu ekranda açılmaz; eksik malzeme ve yol söylenir. */
  private pazarHatirlat(): void {
    const dk = this.g.dukkan?.();
    const pen = dk?.pencere;
    if (pen) bildir(dukkanMetni(dk?.g8Acik ? "dukkan.D3.pencere_yok_g8" : "dukkan.D3.pencere_yok", { n: pen.gereken, var: pen.var, tutar: paraMili(pen.tutarMili, "yukari") }), "bilgi");
  }

  /**
   * Dükkân kartı: tür seçimi (D2) + maliyet satırları (D3; tür seçilince, kendi düğmeleriyle). Tür yokken standart yapı satırları ve kapalı "Dükkânı kur";
   * kapalı düğme `aria-disabled` + neden (`p.dk-neden`). Döndür yalnız dükkân birden çok hücre kaplıyorsa.
   */
  private dukkanKartiYaz(y: YapiTanimi, p: YerlesimPlani | null, sabit: boolean, baslik: string, dk: DukkanKurBilgisi, oz: ReturnType<NonNullable<MulkBaglantisi["ozet"]>> | null): void {
    const stokMili = (m: string): number => this.g.baglanti.isletme?.()?.mallar.find((x) => x.mal === m)?.stokMili ?? 0;
    const sinirDolu = dk.ilceSayi >= dk.ilceSinir || dk.ilSayi >= dk.ilSinir;
    const turNeden = !sinirDolu && this.dukkanTuru === null && this.turDenendi;
    let html = baslik + turSecimiHtml({ secili: this.dukkanTuru, hucre: dk.hucre, turler: dk.turler, ilceSayi: dk.ilceSayi, ilceSinir: dk.ilceSinir, ilSayi: dk.ilSayi, ilSinir: dk.ilSinir, uyum: dk.uyum, ...(turNeden ? { neden: "dukkan.D2.tur_gerekli" as const } : {}) });
    const don = dk.hucre > 1 ? `<div class="yk-dugmeler"><button type="button" data-yk="don" title="Döndür (R)">${ikon("rotate-cw", 16)}Döndür <kbd>R</kbd></button></div>` : "";
    let neden: string | null = p?.neden ?? null;
    const d3 =
      p && this.dukkanTuru !== null
        ? dukkanMaliyetGirdisi({
            tur: this.dukkanTuru,
            bilgi: dk,
            plan: { gecerli: p.gecerli, hazineYetmez: p.hazineYetmez, arsaMili: p.arsaMili, yapiMili: p.yapiMili, toplamMili: p.toplamMili, indirimli: p.indirimli, malzeme: p.malzeme.map((m) => ({ id: m.id, ad: m.ad, miktar: m.miktar })) },
            yapi: y,
            sureCarpani: this.g.baglanti.erkenOyunCarpani?.() ?? 1,
            hazineMili: oz?.hazineMili ?? null,
            surenInsaat: oz?.surenInsaat ?? 0,
            stokMili,
            gonderiyor: this.uygulaniyor,
          })
        : null;
    if (d3 && p) {
      // Plan başka nedenle geçersizse (sahibi başkası, kamu arsası...) düğme kapalı; D3'ün kendi uyarıları nedeni zaten söyleyenleri yinelemez
      if (!p.gecerli && d3.durum === "uygun") d3.durum = "hazirlaniyor";
      if (d3.durum === "hazine-yetmiyor" || d3.durum === "insaat-siniri") neden = null;
      html += don + maliyetSatirlariHtml(d3) + (neden ? `<span data-yk-neden-yer></span>` : "");
    } else {
      const kapali = `aria-disabled="true" aria-describedby="dk-neden"`;
      html += this.dukkanIpucu(y, p, sabit, oz) + `<div class="yk-dugmeler">${dk.hucre > 1 ? `<button type="button" data-yk="don" title="Döndür (R)">${ikon("rotate-cw", 16)}Döndür <kbd>R</kbd></button>` : ""}<button type="button" data-yk="vazgec">${esc(dukkanMetni("dukkan.D3.dugme_vazgec"))}</button><button type="button" class="birincil" data-yk="onayla" ${kapali}>${esc(dukkanMetni("dukkan.D3.dugme_kur"))}</button></div>`;
    }
    this.nedenBolgesi.yaz(neden);
    this.kart.innerHTML = html;
    this.nedenBolgesi.yerlestir(this.kart);
    this.kart.hidden = false;
    this.konumAyarla();
  }

  private async onayla(): Promise<boolean> {
    const p = this.plan;
    const ilce = this.g.ilce();
    if (!p || !p.gecerli || !this.sabit || !ilce || this.uygulaniyor) return false;
    const yontemler = this.yontemler();
    if (!yontemSecimiTamam(yontemler, this.yontem)) return false; // çok yöntemli türde yöntem seçilmeden kurulmaz (kapalı düğme ile aynı koşul; Enter de buradan geçer)
    // Dükkân: tür seçilmeden ve sınırlar/malzeme uygun değilken kurulmaz (kapalı düğme ile aynı koşul; Enter de buradan geçer)
    const dk = p.yapi.id === "dukkan" ? this.g.dukkan?.() : undefined;
    if (dk) {
      if (this.dukkanTuru === null) {
        this.turDeneniyor();
        return false;
      }
      const oz = this.g.baglanti.ozet?.() ?? null;
      const stokMili = (m: string): number => this.g.baglanti.isletme?.()?.mallar.find((x) => x.mal === m)?.stokMili ?? 0;
      const durum = dukkanMaliyetDurumu({ tur: this.dukkanTuru, bilgi: dk, plan: { gecerli: p.gecerli, hazineYetmez: p.hazineYetmez, arsaMili: p.arsaMili, yapiMili: p.yapiMili, toplamMili: p.toplamMili, indirimli: p.indirimli, malzeme: p.malzeme }, yapi: p.yapi, hazineMili: oz?.hazineMili ?? null, surenInsaat: oz?.surenInsaat ?? 0, stokMili, gonderiyor: false });
      if (durum !== "uygun") return false;
    }
    this.uygulaniyor = true;
    this.kartiYaz();
    try {
      const r = await yerlesimiUygula(this.g.baglanti, ilce, p, this.dukkanTuru ?? undefined, komutYontemi(yontemler, this.yontem));
      // "… kuruluyor": iş bitmedi, bilgi (başarı simgesi yalnız biten işin bildirimidir)
      bildir(r.mesaj, r.tamam ? "bilgi" : "hata");
      await this.g.yenile();
      if (r.tamam) {
        this.geriGoster(ilce, p, r.alinan);
        this.iptal();
        return true;
      }
      // Başarısız: kip açık kalır (arsa alındıysa plan artık "kendi arsan" diye yeniden hesaplanır).
      this.sabit = { ...this.sabit };
      return false;
    } catch (e) {
      bildir(`Olmadı: ${e instanceof Error ? e.message : String(e)}`, "hata");
      return false;
    } finally {
      this.uygulaniyor = false;
      this.tazele();
    }
  }

  // --- geri al (5 dk) -----------------------------------------------------------------------------------

  /** Başarılı onaydan sonra 5 dakikalık "Geri al" şeridi (yalnız bağdaştırıcı `yapiGeriAl` sunuyorsa). */
  private geriGoster(ilce: string, p: YerlesimPlani, alinan: string[]): void {
    if (!this.g.baglanti.yapiGeriAl) return;
    this.sonIslem = { ilce, ad: p.yapi.ad, hucreler: p.hucreler.map((h) => h.id), alinan, bitis: Date.now() + GERI_AL_MS };
    this.geriYaz();
    window.clearInterval(this.geriZamanlayici);
    this.geriZamanlayici = window.setInterval(() => this.geriYaz(), 1000);
  }

  private geriYaz(): void {
    const s = this.sonIslem;
    if (!s || Date.now() >= s.bitis) return this.geriGizle();
    // İnşaat bitti (hücreler tesis oldu): geri alınacak inşaat kalmadı, şerit kapanır
    const sh = this.g.sahiplik();
    if (sh && sh.ilce === s.ilce && yapiBittiMi((id) => sh.hucreler.get(id), s.hucreler)) return this.geriGizle();
    const kalan = Math.ceil((s.bitis - Date.now()) / 1000);
    // Küre ve il düzeyinde ya da başka ilçede gizli (sayaç sürer; işlemin ilçesine dönülünce yeniden görünür)
    const gorunur = geriSeridiGorunur(this.duzeyNo, this.g.ilce(), s.ilce, s.bitis - Date.now());
    const sure = `${Math.floor(kalan / 60)}:${String(kalan % 60).padStart(2, "0")}`;
    // Yalnız sayaç güncellenir: düğmeler her saniye yeniden kurulmasın (tıklama ve odak kaybolmasın)
    const sayac = this.geri.querySelector<HTMLElement>("[data-yg='sure']");
    if (sayac && this.geri.dataset["islem"] === String(s.bitis)) sayac.textContent = sure;
    else {
      this.geri.dataset["islem"] = String(s.bitis);
      this.geri.innerHTML = `<span>${esc(s.ad)} kuruluyor · geri alma: <b data-yg="sure">${sure}</b></span><button type="button" data-yg="geri-al">${ikon("undo-2", 15)} Geri al</button><button type="button" data-yg="kapat" aria-label="Kapat">${ikon("x", 15)}</button>`;
    }
    this.geri.hidden = !gorunur;
  }

  private geriGizle(): void {
    window.clearInterval(this.geriZamanlayici);
    this.sonIslem = null;
    delete this.geri.dataset["islem"];
    this.geri.hidden = true;
  }

  private async geriAl(): Promise<void> {
    const s = this.sonIslem;
    if (!s || !this.g.baglanti.yapiGeriAl) return;
    this.geriGizle();
    const r = await this.g.baglanti.yapiGeriAl({ ilce: s.ilce, hucreler: s.hucreler, alinan: s.alinan });
    bildir(r.tamam ? `${s.ad} geri alındı.` : r.mesaj, r.tamam ? "tamam" : "hata");
    await this.g.yenile();
  }
}

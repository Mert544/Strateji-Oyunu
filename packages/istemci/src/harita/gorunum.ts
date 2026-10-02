/**
 * MapLibre görünümü (L1 il, L2 ilçe, L3 arsa). Bu modül ve maplibre-gl + pmtiles yalnız `import()` ile yüklenir.
 *
 * Temel harita yok: düz sakin zemin + il/ilçe sınırları (OSM, ODbL). İsteğe bağlı Protomaps altlığı
 * `?altlik=<pmtiles url>` ile açılır. L3'te arsa ızgarası S6'nın `seritler` PMTiles katmanından çizilir
 * (yalnız z15 karoları; MapLibre büyütür). Tıklanan hücre istemcide hesaplanır, uygunluk BHI1'den okunur.
 * Çizim durağandır: harita yalnız etkileşimde yeniden çizilir (MapLibre boşta 0 fps), sürekli animasyon yok.
 */
import maplibregl from "maplibre-gl";
import type { GeoJSONSource, LayerSpecification, LngLatBoundsLike, Map as MlHarita, MapMouseEvent, StyleSpecification } from "maplibre-gl";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css?inline";
import yiginCss from "./harita-yigin.css?inline";
import { Protocol } from "pmtiles";
import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from "geojson";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import type { ArsaSinifi, HucreId } from "@bolge/cekirdek";
import type { DefterOdulu, KamuGrubuKaresi } from "@bolge/protokol";
import icerikHam from "../../../veri/icerik/icerik.json";
import parametreHam from "../../../veri/icerik/parametreler.json";
import { bildir } from "../arayuz/bildirim";
import { esc, fmt, kalanSureMetni, para, paraMili, simSaatMetni, yuzde } from "../arayuz/bicim";
import { icerikTablosu } from "../komut/tablo";
import type { Icerik } from "../komut/tablo";
import { arsaFiyati, arsaKenarlari, arsalariTuret, arsaSinirlari, arsaSiniflari, hucredenArsa, kamuBilgisi, kamuBloklari, onerilenArsa } from "./arsa";
import type { Arsa, ArsaKumesi, ArsaTercihi } from "./arsa";
import { SahteBaglanti } from "./baglanti";
import { DONUS_ORNEGI } from "./donus-ekrani";
import { KAMU_ACIKLAMA, KAMU_TUR_ADI, kamuGrubuBul, kamuNedeni, kamuSahibiAdi } from "./kamu";
import type { IlceSahipligi, MulkBaglantisi } from "./baglanti";
import type { Duzey, HaritaDurumu } from "./denetci";
import { alimTuru, arsaSinifi, ayrilmisHakki, hucreFiyatiMili, ilceTavani, SINIF_ADI, satinAlmaOzeti } from "./fiyat";
import type { AyrilmisHakki } from "./fiyat";
import type { IlceSayilari } from "./fiyat";
import { parselZinciri } from "./zincir";
import { kavramEtkin } from "./etkin";
import { ASAMA_ADI, yapiAsamasi, yapiKatalogu, yapiKatmani, yapiRengiCss } from "./yapi";
import { altlikKatmanlari, ayrilmisKatmanlari, boyalar, IZGARA_CIZGI_ZOOM, L3_ZOOM, oyunKatmanlari, sahiplikBoyasi, SERIT_ONCESI, seritRengi, sinirKatmanlari, zeminKatmanlari } from "./stil";
import { asinmaOzelligi } from "../tasarim/asinma";
import { ikon } from "../tasarim/ikon";
import type { YapiTanimi } from "./yapi";
import { dukkanKaynagiKur, dukkanKurBilgisi, referansFiyati } from "./dukkan-kaynak";
import type { DukkanKurBilgisi } from "./dukkan-kaynak";
import { YerlesimKipi } from "./yerlesim";
import { yapiCizimi } from "./gorunurluk";
import { OlcekKipi } from "./olcek-kipi";
import { YURT_METIN, yurtBosHucreler } from "./yurt";
import { olcekAyakIzi, olcekHedefi, mevcutOlcek } from "./olcek";
import { cerceveBirlestir } from "./geometri";
import {
  ARAZI_ADLARI,
  boylamdanX,
  durumAl,
  durumSinifi,
  engelNedeni,
  enlemdenY,
  hucreId,
  hucreMerkezi,
  hucreSiniri,
  idCoz,
  izgaraSiniri,
  kisaAd,
  noktadanHucre,
  xtenBoylam,
  ytenEnlem,
} from "./hucre";
import type { Izgara, Sinir } from "./hucre";
import { Secim, secilemezNedeni } from "./secim";
import type { SecimBaglami } from "./secim";
import { disKaraCoz, ilceleriYukle, izgaraYukle, OSM_ATIF_HTML, seritUrl } from "./veri";
import dunyaUlkeler from "../veri/dunya-ulkeler.topo.json";
import type { Hiyerarsi, SinirKatmani } from "./veri";

export { baglantiKur } from "./baglanti-kur";
export { yerlesAc } from "../arayuz/yerles-ekrani";
export { mulkPaneliKur } from "./mulk-panel";
export { donusuGoster } from "./donus-ekrani";

export interface GorunumSecenekleri {
  hiyerarsi: Hiyerarsi;
  iller: SinirKatmani;
  /** Mülk bağdaştırıcısı; verilmezse bellek içi sahte sunucu (S4 gelene dek). */
  baglanti?: MulkBaglantisi;
  ilceSec: (ilce: string) => void;
  duzeyDegisti: (d: Duzey) => void;
  /** L4: hücre merkezinde sokak yürüyüşünü aç (parsel kartındaki "Sokakta yürü" düğmesi). */
  yuruAc?: (boylam: number, enlem: number) => void;
  /** Komşu ülkeler ("dış kara"; küre verisinden, Türkiye hariç). */
  dunya?: FeatureCollection<Polygon | MultiPolygon>;
}

/** L3 (arsa ızgarası) bu yakınlaşmadan itibaren: seritler katmanı yalnız z15 karosu içerir. */
export { L3_ZOOM };

/** Oyuncu kimliğinden renk indeksi (0–11). Sunucu `renkIndeksi` gönderince o kullanılır; şimdilik kararlı karma. */
export function oyuncuRenkIndeksi(oyuncu: string): number {
  let x = 2166136261;
  for (let i = 0; i < oyuncu.length; i++) x = Math.imul(x ^ oyuncu.charCodeAt(i), 16777619);
  return (x >>> 0) % 12;
}

const BOS: FeatureCollection = { type: "FeatureCollection", features: [] };

function renk(ad: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(ad).trim() || "#888888";
}

function hareketAzMi(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hucreCokgeni(x: number, y: number, oz: Record<string, unknown> = {}): Feature<Polygon> {
  const [b, g, d, k] = hucreSiniri(x, y);
  return { type: "Feature", properties: oz, geometry: { type: "Polygon", coordinates: [[[b, g], [d, g], [d, k], [b, k], [b, g]]] } };
}

/** Sunucusuz örnek defter için ödül tablosu: değer = para + mal × taban fiyat (çekirdeğin `odulDegeri` kuralı). */
function defterOdulleri(ic: Icerik): { tavanMili: number; kavramlar: Record<string, DefterOdulu> } {
  const t = ic.param.odul!;
  const kavramlar: Record<string, DefterOdulu> = {};
  for (const [k, v] of Object.entries(t.kavramlar)) {
    let deger = v.para ?? 0;
    for (const [m, mili] of Object.entries(v.mal ?? {})) deger += Math.floor((mili * (ic.mallar[ic.malIdx[m] ?? -1]?.taban ?? 0)) / 1000);
    kavramlar[k] = { ...(v.para ? { paraMili: v.para } : {}), ...(v.mal ? { mal: { ...v.mal } } : {}), degerMili: deger };
  }
  return { tavanMili: t.tavanMili, kavramlar };
}

/** Dikdörtgen hücre bloğu (`[x0, y0, x1, y1]`, dört uç dahil) tek çokgen. */
function blokCokgeni(blok: readonly [number, number, number, number], oz: Record<string, unknown> = {}): Feature<Polygon> {
  const [b, , , k] = hucreSiniri(blok[0], blok[1]);
  const [, g, d] = hucreSiniri(blok[2], blok[3]);
  return { type: "Feature", properties: oz, geometry: { type: "Polygon", coordinates: [[[b, g], [d, g], [d, k], [b, k], [b, g]]] } };
}

function sinirdanKutu(s: Sinir): LngLatBoundsLike {
  return [
    [s[0], s[1]],
    [s[2], s[3]],
  ];
}

let protokolKuruldu = false;
let cssEklendi = false;

export class HaritaGorunumu {
  private harita: MlHarita;
  private yuklendi: Promise<void>;
  private ilce: SinirKatmani | null = null;
  private il: string | null = null;
  private ilceKimlik: string | null = null;
  private duzey: Duzey = 1;
  private etiketler: maplibregl.Marker[] = [];
  private izgara: Izgara | null = null;
  private sahiplik: IlceSahipligi | null = null;
  private tumSahiplik = new Map<string, IlceSahipligi>();
  private secim = new Secim();
  private cokluSecim = false;
  private sahiplikAcik = false;
  private uzerindeIlce: string | null = null;
  private kart: HTMLElement;
  private alt: HTMLElement;
  private ipucu: HTMLElement;
  private ipucuZamanlayici = 0;
  private kartHucre: HucreId | null = null;
  private suruklenen: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private tiklamaYut = false;
  private satinAliniyor = false;
  private seritYuklu: string | null = null;
  readonly baglanti: MulkBaglantisi;
  // F4: hazır arsalar, yapı önce yerleşim, canlı sahiplik
  private arsaK: ArsaKumesi | null = null;
  private arsaHazir: Promise<ArsaKumesi | null> | null = null;
  private arsaSecili: Arsa | null = null;
  private arsaUzerinde: Arsa | null = null;
  /** Bilgi için seçilen kamu bloğu (satın alınamaz; alt çubukta tür ve neden). */
  private kamuSecili: { grup: KamuGrubuKaresi; blok: readonly [number, number, number, number] } | null = null;
  private hucreAraci = false;
  private altGizli = false;
  private katalog: YapiTanimi[];
  /** İçerik tablosu (mal ve yapı adları; mülk paneli de okur). */
  readonly tablo: Icerik;
  private yerlesim: YerlesimKipi | null = null;
  private olcek: OlcekKipi | null = null;
  /** Yurt önce varış kartı (Yerleş sonrası): "Yurdunda kur" birincil, "Arsa satın al" ikincil. Kapanınca null. */
  private varis: { acilis: ArsaTercihi; oneriYapi: string; merkez: [number, number]; genislet: boolean } | null = null;
  private yurtKuruluyor = false;
  private yapiEtiketleri: maplibregl.Marker[] = [];
  private canliBirak: (() => void) | null = null;
  private canliBekliyor = false;
  private durumZamanlayici = 0;
  private hazineYazi: HTMLElement;
  private yetismeSeridi: HTMLElement;

  constructor(
    private kap: HTMLElement,
    sahneKap: HTMLElement,
    private s: GorunumSecenekleri,
  ) {
    const tablo = icerikTablosu(icerikHam as unknown as IcerikDosyasi, parametreHam as unknown as Parametreler);
    this.tablo = tablo;
    this.katalog = yapiKatalogu(tablo);
    this.baglanti =
      s.baglanti ??
      new SahteBaglanti({
        izgaraAl: izgaraYukle,
        gecikme: 120,
        hazineMili: 50_000_000,
        kamu: true,
        ...(tablo.param.odul ? { defterOdulleri: defterOdulleri(tablo), defterEtkin: (k: string) => kavramEtkin(tablo, k) } : {}),
        ...(new URLSearchParams(location.search).get("donus") === "ornek" ? { donusOrnegi: DONUS_ORNEGI } : {}),
        yapiBilgisi: (tur) => {
          const y = this.katalog.find((k) => k.id === tur);
          return y ? { yuva: y.yuva, paraMili: y.paraMili, sureSaat: y.sureSaat } : null;
        },
        // Sunucusuz kipte ölçek büyütme bedeli: çekirdekle aynı hesap (`olcek.ts`)
        olcekBilgisi: (tur, hedef, hucreSayisi) => {
          const izi = olcekAyakIzi(tablo, tur);
          if (!izi) return null;
          const h = olcekHedefi(tablo, { tur, olcek: mevcutOlcek(izi, hucreSayisi), hucreler: Array.from({ length: hucreSayisi }, () => "") }, hedef);
          return h ? { ek: h.ek, paraMili: h.paraMili, sureSaat: h.sureSaat } : null;
        },
      });
    if (!cssEklendi) {
      // MapLibre ve harita yığını arayüzü (alt çubuk, kartlar, yapı menüsü, Yerleş): tek dosyaya girmez, harita.js ile gelir
      const st = document.createElement("style");
      st.textContent = maplibreCss + "\n" + yiginCss;
      document.head.append(st);
      cssEklendi = true;
    }
    if (!protokolKuruldu) {
      maplibregl.addProtocol("pmtiles", new Protocol().tile);
      protokolKuruldu = true;
    }
    const tr = s.iller.cerceve.get("tr_41") ?? [26, 36, 45, 42];
    this.harita = new maplibregl.Map({
      container: kap,
      style: this.stil(),
      bounds: sinirdanKutu(tr),
      attributionControl: false,
      boxZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxPitch: 0,
      renderWorldCopies: false,
      fadeDuration: 0,
      minZoom: 4,
      maxZoom: 19.5,
      maxBounds: [
        [5, 25],
        [55, 55],
      ],
      locale: {
        "NavigationControl.ZoomIn": "Yakınlaş",
        "NavigationControl.ZoomOut": "Uzaklaş",
        "AttributionControl.ToggleAttribution": "Atfı göster/gizle",
        "ScrollZoomBlocker.CtrlMessage": "Yakınlaşmak için Ctrl + kaydırma",
        "TouchPanBlocker.Message": "Haritayı iki parmakla kaydırın",
      },
    });
    this.harita.touchZoomRotate.disableRotation();
    this.harita.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: OSM_ATIF_HTML }), "bottom-left");
    this.yuklendi = new Promise((coz) => this.harita.once("load", () => coz()));
    void this.yuklendi.then(() => this.desenEkle());

    this.kart = document.createElement("section");
    this.kart.id = "parsel-kart";
    this.kart.hidden = true;
    this.kart.setAttribute("aria-label", "Parsel kartı");
    this.alt = document.createElement("div");
    this.alt.id = "harita-alt";
    this.alt.hidden = true;
    this.alt.setAttribute("role", "region");
    this.alt.setAttribute("aria-label", "Satın alma");
    this.ipucu = document.createElement("div");
    this.ipucu.id = "harita-ipucu";
    this.ipucu.hidden = true;
    this.ipucu.setAttribute("role", "status");
    sahneKap.append(this.kart, this.alt, this.ipucu);
    this.hazineYazi = document.createElement("div");
    this.hazineYazi.id = "harita-hazine";
    this.hazineYazi.hidden = true;
    this.hazineYazi.setAttribute("aria-live", "off");
    document.getElementById("harita-gezgin")?.append(this.hazineYazi);
    // Sakin bilgi şeridi: sunucu kapalıyken geçen süreyi yetiştirirken (komutlar kısa süre bekler)
    this.yetismeSeridi = document.createElement("div");
    this.yetismeSeridi.id = "harita-yetisme";
    this.yetismeSeridi.hidden = true;
    this.yetismeSeridi.setAttribute("role", "status");
    this.yetismeSeridi.setAttribute("aria-live", "polite");
    document.getElementById("harita-gezgin")?.append(this.yetismeSeridi);
    this.olaylar();
    this.yerlesimKur(sahneKap);
    this.olcekKur();
  }

  /** Ölçek büyütme kipi (İşletmem'deki "Büyüt"ten açılır); yalnız büyütmeyi destekleyen bağdaştırıcıda. */
  private olcekKur(): void {
    const y = this.yerlesim;
    if (!y || !this.baglanti.olcekYukselt) return;
    const o = new OlcekKipi({
      ml: this.harita,
      kart: y.kartKabi,
      baglanti: this.baglanti,
      ic: this.tablo,
      ilce: () => this.ilceKimlik,
      il: (ilce) => this.s.hiyerarsi.ilceler.get(ilce)?.il ?? null,
      izgara: () => this.izgara,
      sahiplik: () => this.sahiplik,
      ad: (k) => this.baglanti.oyuncuAdi(k),
      yapiAdi: (tur) => this.katalog.find((k) => k.id === tur)?.ad ?? this.tablo.turler[this.tablo.turIdx[tur] ?? -1]?.ad ?? tur,
      kamu: this.kamuHucre,
      yenile: () => this.sahiplikYenile(),
      yakinlas: (hucreler) => this.hucrelereYakinlas(hucreler),
      altGizle: (g) => {
        this.altGizli = g;
        this.arsaVurguCiz();
        this.altCiz();
      },
      yerlesimIptal: () => this.yerlesim?.iptal(),
      ayrilmisHakki: () => this.ayrilmisHakki(),
    });
    this.olcek = o;
    void this.yuklendi.then(() => o.kur());
  }

  /** Hücre kümesini L3'te çerçeveler (ölçek büyütme: tesis ve ek hücreler görünsün). */
  private hucrelereYakinlas(hucreler: readonly string[]): void {
    let c: Sinir | null = null;
    for (const id of hucreler) {
      const x = idCoz(id);
      if (!x) continue;
      const b = hucreSiniri(x.x, x.y);
      c = c ? cerceveBirlestir(c, b) : b;
    }
    if (!c) return;
    const pad = Math.min(160, Math.round(Math.min(this.kap.clientWidth, this.kap.clientHeight) * 0.22));
    this.harita.fitBounds(sinirdanKutu(c), { padding: { top: pad + 40, bottom: pad + 60, left: pad, right: pad }, maxZoom: 17.4, duration: hareketAzMi() ? 0 : 600 });
  }

  /**
   * İşletmem'deki "Büyüt": tesis açık ilçedeyse (izgara ve sahiplik yüklü) ölçek büyütme kipini başlatır. Başlayamazsa false.
   * Başka ilçedeyse çağıran önce ilçeyi açar (`mulk-panel.ts`).
   */
  olcekBaslat(anahtar: string): boolean {
    return this.olcek?.baslat(anahtar) ?? false;
  }

  /** Sınama kancası: ölçek büyütme kipi. */
  get olcekKipi(): OlcekKipi | null {
    return this.olcek;
  }

  /** Yapı yerleşim kipi (menü + hayalet + maliyet kartı); yalnız yapı kurabilen bağdaştırıcıda. */
  private yerlesimKur(sahneKap: HTMLElement): void {
    const gezgin = document.getElementById("harita-gezgin");
    if (!gezgin || !this.baglanti.tesisInsa) return;
    const y = new YerlesimKipi({
      ml: this.harita,
      kap: this.kap,
      sahneKap,
      gezgin,
      baglanti: this.baglanti,
      katalog: this.katalog,
      ilce: () => this.ilceKimlik,
      izgara: () => this.izgara,
      sahiplik: () => this.sahiplik,
      ad: (k) => this.baglanti.oyuncuAdi(k),
      kamu: this.kamuHucre,
      yenile: () => this.sahiplikYenile(),
      ipucu: (html, x, yy, uyari, sure) => this.ipucuGoster(html, x, yy, uyari, sure ?? 0),
      ipucuGizle: () => this.ipucuGizle(),
      yakinlas: () => {
        if (this.harita.getZoom() < L3_ZOOM + 0.8) this.harita.easeTo({ zoom: 16.6, duration: hareketAzMi() ? 0 : 500 });
      },
      altGizle: (g) => {
        this.altGizli = g;
        if (g && !this.yurtKuruluyor) this.varisAyarla(null); // yerleşim kipi başladı: varış kartı biter
        this.arsaVurguCiz();
        this.altCiz();
      },
      basliyor: () => this.olcek?.iptal(),
      ayrilmisHakki: () => this.ayrilmisHakki(),
      indirim: () => this.ilkYapiIndirimi(),
      dukkan: () => this.dukkanKurBilgisi(),
      tablo: this.tablo,
    });
    this.yerlesim = y;
    // Alt arsa şeridi açıkken "Yapı kur" düğmesi basılı/tonlu (tek birincil kuralı); `hidden` değişimini izle
    const seritIzle = (): void => y.seritDurumu(!this.alt.hidden);
    new MutationObserver(seritIzle).observe(this.alt, { attributes: true, attributeFilter: ["hidden"] });
    seritIzle();
    void this.yuklendi.then(() => y.kur());
  }

  // --- stil ------------------------------------------------------------------------------------------

  private altlikVar = new URLSearchParams(location.search).get("altlik");

  /** Stilin tüm katmanları (tema değişince aynı listeden yeniden boyanır; serit ve hayalet ayrıca). */
  private katmanlar(): LayerSpecification[] {
    return [...zeminKatmanlari(renk), ...(this.altlikVar ? altlikKatmanlari(renk) : []), ...sinirKatmanlari(renk), ...oyunKatmanlari(renk, this.sahiplikAcik), ...ayrilmisKatmanlari(renk)];
  }

  private stil(): StyleSpecification {
    const altlik = this.altlikVar;
    const st: StyleSpecification = {
      version: 8,
      sources: {
        dunya: { type: "geojson", data: this.s.dunya ?? disKaraCoz(dunyaUlkeler as unknown as Parameters<typeof disKaraCoz>[0]) },
        iller: { type: "geojson", data: this.s.iller.fc, promoteId: "kimlik" },
        "il-sinir": { type: "geojson", data: this.s.iller.sinir ?? BOS },
        ilceler: { type: "geojson", data: BOS, promoteId: "kimlik" },
        "ilce-sinir": { type: "geojson", data: BOS },
        sahiplik: { type: "geojson", data: BOS },
        secim: { type: "geojson", data: BOS },
        izgara: { type: "geojson", data: BOS },
        dikdortgen: { type: "geojson", data: BOS },
        arsalar: { type: "geojson", data: BOS },
        "arsa-kamu": { type: "geojson", data: BOS },
        "arsa-vurgu": { type: "geojson", data: BOS },
        ayrilmis: { type: "geojson", data: BOS },
        yapilar: { type: "geojson", data: BOS },
      },
      layers: this.katmanlar(),
    };
    // İsteğe bağlı Protomaps altlığı (şema v4): arazi, su, bina, yol hiyerarşisi; etiket yok (glyph gerekmez).
    if (altlik) st.sources["altlik"] = { type: "vector", url: "pmtiles://" + new URL(altlik, location.href).href };
    return st;
  }

  /** Alınamaz hücreler için taralı desen (yalnız yüksek kontrast kipinde kullanılır; 8×8, tema rengiyle). */
  private desenEkle(): void {
    const c = renk("--murekkep-3");
    const m = /^#([0-9a-f]{6})$/i.exec(c);
    const v = m ? parseInt(m[1]!, 16) : 0x5f6b75;
    const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    const data = new Uint8Array(8 * 8 * 4);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = (y * 8 + x) * 4;
        const cizgi = (x + y) % 8 < 2;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = cizgi ? 120 : 0;
      }
    if (this.harita.hasImage("tarali")) this.harita.updateImage("tarali", { width: 8, height: 8, data });
    else this.harita.addImage("tarali", { width: 8, height: 8, data });
    // Kamu arsası dokusu: 12×12 karoda iki yumuşak nokta (şaşırtmalı), devlet katman rengiyle; çizgi ya da hareket yok
    const kc = /^#([0-9a-f]{6})$/i.exec(renk("--katman-devlet"));
    const kv = kc ? parseInt(kc[1]!, 16) : 0x5a6b8c;
    const K = 12;
    const doku = new Uint8Array(K * K * 4);
    for (let y = 0; y < K; y++)
      for (let x = 0; x < K; x++) {
        const i = (y * K + x) * 4;
        const u = (px: number, py: number): number => Math.hypot(x + 0.5 - px, y + 0.5 - py);
        const d = Math.min(u(3, 3), u(9, 9));
        doku[i] = (kv >> 16) & 255;
        doku[i + 1] = (kv >> 8) & 255;
        doku[i + 2] = kv & 255;
        doku[i + 3] = Math.round(150 * Math.max(0, Math.min(1, 1.6 - d)));
      }
    if (this.harita.hasImage("kamu-doku")) this.harita.updateImage("kamu-doku", { width: K, height: K, data: doku });
    else this.harita.addImage("kamu-doku", { width: K, height: K, data: doku });
  }

  private seritKatmanlari(): void {
    const ilce = this.ilceKimlik;
    const url = ilce ? seritUrl(ilce) : null;
    if (!url || this.seritYuklu === url) return;
    const h = this.harita;
    for (const id of ["serit-dolgu", "serit-engel"]) if (h.getLayer(id)) h.removeLayer(id);
    if (h.getSource("seritler")) h.removeSource("seritler");
    h.addSource("seritler", { type: "vector", url: "pmtiles://" + url });
    // Arsa mozaiği karanın üstünde, sınırların altında; altlık varsa onun altında (yollar ve binalar ızgaranın üstünde okunur)
    const once = h.getLayer("altlik-orman") ? "altlik-orman" : SERIT_ONCESI;
    // Su biti: e = (durum & (yol|su|askerî|bina)) >> 1 -> su = ⌊e/2⌋ mod 2 (ifadelerde bit işlemi yok)
    const su: maplibregl.ExpressionSpecification = ["==", ["%", ["floor", ["/", ["get", "e"], 2]], 2], 1];
    h.addLayer(
      {
        id: "serit-dolgu",
        type: "fill",
        source: "seritler",
        "source-layer": "seritler",
        minzoom: L3_ZOOM - 0.01,
        paint: { "fill-color": seritRengi(renk, su, this.sahiplikAcik), "fill-antialias": false },
      },
      once,
    );
    h.addLayer(
      {
        id: "serit-engel",
        type: "fill",
        source: "seritler",
        "source-layer": "seritler",
        minzoom: L3_ZOOM - 0.01,
        filter: ["all", ["==", ["get", "u"], 0], ["!", su]],
        // Alınamaz hücre: düz `arsa-engel` (tarama yok); yalnız yüksek kontrast kipinde taralı desen
        paint: window.matchMedia("(prefers-contrast: more)").matches ? { "fill-pattern": "tarali" } : { "fill-color": renk("--arsa-engel"), "fill-antialias": false },
      },
      once,
    );
    this.seritYuklu = url;
  }

  temaUygula(): void {
    void this.yuklendi.then(() => {
      const h = this.harita;
      for (const l of this.katmanlar()) {
        if (!h.getLayer(l.id)) continue;
        for (const [p, v] of Object.entries(boyalar(l))) h.setPaintProperty(l.id, p, v);
      }
      this.yerlesim?.temaUygula();
      this.olcek?.temaUygula();
      this.sahiplikBoya();
      this.desenEkle();
      if (h.getLayer("serit-engel") && !window.matchMedia("(prefers-contrast: more)").matches) h.setPaintProperty("serit-engel", "fill-color", renk("--arsa-engel"));
      this.yapilariCiz(true);
    });
  }

  private sahiplikBoya(): void {
    const h = this.harita;
    if (!h.getLayer("sahiplik-dolgu")) return;
    const b = sahiplikBoyasi(renk, this.sahiplikAcik);
    for (const [p, v] of Object.entries(b.dolgu)) h.setPaintProperty("sahiplik-dolgu", p, v);
    for (const [p, v] of Object.entries(b.cizgi)) h.setPaintProperty("sahiplik-cizgi", p, v);
    if (h.getLayer("serit-dolgu")) h.setPaintProperty("serit-dolgu", "fill-color", seritRengi(renk, ["==", ["%", ["floor", ["/", ["get", "e"], 2]], 2], 1], this.sahiplikAcik));
  }

  // --- dış arayüz ------------------------------------------------------------------------------------

  hazir(): boolean {
    return this.harita.loaded() && !this.harita.isMoving() && this.harita.areTilesLoaded();
  }

  get sahiplikMercegi(): boolean {
    return this.sahiplikAcik;
  }

  izgaraVar(ilce: string | null): boolean {
    return !!ilce && !!seritUrl(ilce);
  }

  secimVarMi(): boolean {
    return this.secim.boyut > 0 || this.arsaSecili !== null || this.kamuSecili !== null;
  }

  secimTemizle(): void {
    this.secim.temizle();
    this.arsaSecili = null;
    this.kamuSecili = null;
    this.arsaVurguCiz();
    this.secimCiz();
  }

  /** Klavye: yapı yerleşiminde R, Enter, Esc. İşlendiyse true. */
  tusIsle(e: KeyboardEvent): boolean {
    return this.olcek?.tus(e) || (this.yerlesim?.tus(e) ?? false);
  }

  mercekSec(sahiplik: boolean): void {
    this.sahiplikAcik = sahiplik;
    void this.yuklendi.then(() => this.sahiplikBoya());
  }

  mulklerim(): { ilce: string; hucre: number }[] {
    const ben = this.baglanti.ben.id;
    const l: { ilce: string; hucre: number }[] = [];
    for (const [ilce, s] of this.tumSahiplik) {
      let n = 0;
      for (const h of s.hucreler.values()) if (h.sahip === ben) n++;
      if (n) l.push({ ilce, hucre: n });
    }
    return l;
  }

  /** Oyuncunun bu ilçedeki hücrelerine uç (Mülklerim araması). */
  mulkeUc(): void {
    const s = this.sahiplik;
    if (!s) return;
    let c: Sinir | null = null;
    for (const [id, h] of s.hucreler) {
      if (h.sahip !== this.baglanti.ben.id) continue;
      const x = idCoz(id);
      if (!x) continue;
      const b = hucreSiniri(x.x, x.y);
      c = c ? cerceveBirlestir(c, b) : b;
    }
    if (c) this.harita.fitBounds(sinirdanKutu(c), { padding: 80, maxZoom: 18, duration: hareketAzMi() ? 0 : 800 });
  }

  /** Harita gizlenince: ipucu, kart ve alt çubuk kapanır. */
  uyut(): void {
    this.yerlesim?.iptal();
    this.olcek?.iptal();
    this.varisAyarla(null);
    this.yerlesim?.menuAc(false);
    // Küre düzeyi: "Geri al" şeridi gizlenir (sayaç sürer; ilçeye dönülünce yeniden görünür)
    this.yerlesim?.gorunurluk(0);
    this.ipucuGizle();
    this.kart.hidden = true;
    this.alt.hidden = true;
  }

  async goster(hedef: HaritaDurumu, ilkAcilis: boolean): Promise<void> {
    await this.yuklendi;
    if (ilkAcilis) this.harita.resize();
    const h = this.harita;
    if (hedef.il && hedef.il !== this.il) {
      this.il = hedef.il;
      this.ilce = await ilceleriYukle(hedef.il);
      (h.getSource("ilceler") as GeoJSONSource).setData(this.ilce.fc);
      (h.getSource("ilce-sinir") as GeoJSONSource).setData(this.ilce.sinir ?? BOS);
      h.setFilter("il-secili", ["==", ["get", "kimlik"], hedef.il]);
      h.setFilter("ortu-il", ["!=", ["get", "kimlik"], hedef.il]);
    }
    if (hedef.ilce !== this.ilceKimlik) {
      this.ilceKimlik = hedef.ilce;
      this.secim.temizle();
      this.kartHucre = null;
      this.kart.hidden = true;
      this.izgara = null;
      this.sahiplik = null;
      this.arsaK = null;
      this.arsaHazir = null;
      this.arsaSecili = null;
      this.arsaUzerinde = null;
      this.kamuSecili = null;
      this.yerlesim?.iptal();
      this.olcek?.iptal();
      this.varisAyarla(null);
      h.setFilter("ilce-secili", ["==", ["get", "kimlik"], hedef.ilce ?? ""]);
      h.setFilter("ortu-ilce", hedef.ilce ? ["!=", ["get", "kimlik"], hedef.ilce] : ["==", ["get", "kimlik"], "__yok__"]);
      if (hedef.ilce && this.izgaraVar(hedef.ilce)) {
        this.baglanti.ilgi?.("harita", [hedef.ilce]);
        const [iz, sh] = await Promise.all([izgaraYukle(hedef.ilce), this.baglanti.sahiplikAl(hedef.ilce)]);
        this.izgara = iz;
        this.sahiplik = sh;
        if (sh) this.tumSahiplik.set(hedef.ilce, sh);
        this.seritKatmanlari();
        this.canliBaglan();
        void this.arsaHazirla();
      } else this.baglanti.ilgi?.("harita", []);
      this.sahiplikCiz();
      this.secimCiz();
      this.arsaCiz();
    }
    this.etiketleriKur();
    const kutu = hedef.duzey === 1 || !hedef.ilce ? this.ilCercevesi() : this.ilce?.cerceve.get(hedef.ilce);
    if (!kutu) return;
    const pad = Math.min(80, Math.round(Math.min(this.kap.clientWidth, this.kap.clientHeight) * 0.08));
    // Üstte kırıntı/arama kutusu var: üst boşluk onun altından başlar
    const gezgin = document.getElementById("harita-gezgin")?.getBoundingClientRect();
    const ust = gezgin ? Math.max(pad, Math.min(this.kap.clientHeight * 0.35, gezgin.bottom - this.kap.getBoundingClientRect().top + 8)) : pad + 60;
    const sure = hareketAzMi() || ilkAcilis ? 0 : 750;
    const bitti = new Promise<void>((coz) => h.once("moveend", () => coz()));
    h.fitBounds(sinirdanKutu(kutu), { padding: { top: ust, bottom: pad + 24, left: pad, right: pad }, maxZoom: hedef.duzey === 1 ? 11 : 14.2, duration: sure });
    await bitti;
    this.duzeyGuncelle();
  }

  private ilCercevesi(): Sinir | undefined {
    if (!this.ilce) return this.il ? this.s.iller.cerceve.get(this.il) : undefined;
    let c: Sinir | undefined;
    for (const b of this.ilce.cerceve.values()) c = c ? cerceveBirlestir(c, b) : b;
    return c;
  }

  private etiketleriKur(): void {
    for (const m of this.etiketler) m.remove();
    this.etiketler = [];
    if (!this.il) return;
    const il = this.s.hiyerarsi.iller.get(this.il);
    for (const k of il?.ilceler ?? []) {
      const c = this.s.hiyerarsi.ilceler.get(k);
      if (!c) continue;
      const e = document.createElement("div");
      e.className = "ilce-etiket" + (k === this.ilceKimlik ? " secili" : "");
      e.textContent = c.ad;
      e.dataset["ilce"] = k;
      e.setAttribute("aria-hidden", "true");
      this.etiketler.push(new maplibregl.Marker({ element: e, anchor: "center" }).setLngLat(c.merkez).addTo(this.harita));
    }
    this.etiketGorunurlugu();
  }

  /** İlçe etiketleri: L3'te gizli; çakışanlardan küçük ilçeninki gizlenir (büyük alan önce, seçili ilçe her zaman). */
  private etiketGorunurlugu(): void {
    const gizle = this.harita.getZoom() >= 13.2;
    const tutulan: [number, number, number, number][] = [];
    const sirali = [...this.etiketler].sort((a, b) => this.etiketOnceligi(b) - this.etiketOnceligi(a));
    for (const m of sirali) {
      const e = m.getElement();
      let goster = !gizle;
      if (goster) {
        const p = this.harita.project(m.getLngLat());
        const w = (e.textContent?.length ?? 4) * 7 + 6;
        const k: [number, number, number, number] = [p.x - w / 2, p.y - 9, p.x + w / 2, p.y + 9];
        goster = !tutulan.some((t) => k[0] < t[2] && k[2] > t[0] && k[1] < t[3] && k[3] > t[1]);
        if (goster) tutulan.push(k);
      }
      e.style.visibility = goster ? "visible" : "hidden";
    }
  }

  private etiketOnceligi(m: maplibregl.Marker): number {
    const k = m.getElement().dataset["ilce"] ?? "";
    return k === this.ilceKimlik ? Infinity : (this.s.hiyerarsi.ilceler.get(k)?.alanKm2 ?? 0);
  }

  // --- düzey ve çizim --------------------------------------------------------------------------------

  private duzeyGuncelle(): void {
    if (!this.ilceKimlik) {
      this.duzey = 1;
      this.alt.hidden = true;
      // İl düzeyinde yapı dolgusu ve etiketi çizilmez (ilçe adlarına binmesin); yapılar bir önceki ilçeden kalmış olabilir
      this.yapilariCiz();
      this.yerlesim?.gorunurluk(1);
      return;
    }
    const l3 = !!this.izgara && this.harita.getZoom() >= L3_ZOOM;
    const d: Duzey = l3 ? 3 : 2;
    if (d !== this.duzey) {
      this.duzey = d;
      this.s.duzeyDegisti(d);
    }
    this.kap.classList.toggle("harita-cizim-isaret", l3);
    this.izgaraCizgileri();
    this.arsaCiz();
    this.yapilariCiz();
    this.yerlesim?.gorunurluk(this.duzey);
    this.altCiz();
  }

  private izgaraCizgileri(): void {
    const src = this.harita.getSource("izgara") as GeoJSONSource | undefined;
    if (!src) return;
    const iz = this.izgara;
    if (!iz || this.harita.getZoom() < IZGARA_CIZGI_ZOOM) {
      src.setData(BOS);
      return;
    }
    const b = this.harita.getBounds();
    const x0 = Math.max(iz.x0, Math.floor(boylamdanX(b.getWest())));
    const x1 = Math.min(iz.x0 + iz.genislik, Math.ceil(boylamdanX(b.getEast())));
    const y0 = Math.max(iz.y0, Math.floor(enlemdenY(b.getNorth())));
    const y1 = Math.min(iz.y0 + iz.yukseklik, Math.ceil(enlemdenY(b.getSouth())));
    if (x1 <= x0 || y1 <= y0 || x1 - x0 + (y1 - y0) > 700) {
      src.setData(BOS);
      return;
    }
    const f: Feature<LineString>[] = [];
    const [bati, dogu] = [xtenBoylam(x0), xtenBoylam(x1)];
    const [kuzey, guney] = [ytenEnlem(y0), ytenEnlem(y1)];
    for (let x = x0; x <= x1; x++) f.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[xtenBoylam(x), kuzey], [xtenBoylam(x), guney]] } });
    for (let y = y0; y <= y1; y++) f.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[bati, ytenEnlem(y)], [dogu, ytenEnlem(y)]] } });
    src.setData({ type: "FeatureCollection", features: f });
  }

  private sahiplikCiz(): void {
    const src = this.harita.getSource("sahiplik") as GeoJSONSource | undefined;
    if (!src) return;
    const s = this.sahiplik;
    if (!s) {
      src.setData(BOS);
      this.yapilariCiz();
      this.ayrilmisCiz();
      return;
    }
    const ben = this.baglanti.ben.id;
    const f: Feature<Polygon>[] = [];
    for (const [id, h] of s.hucreler) {
      const c = idCoz(id);
      if (c) f.push(hucreCokgeni(c.x, c.y, { ben: h.sahip === ben ? 1 : 0, sahip: h.sahip, r: this.renkIndeksi(h.sahip), ...this.ayrilmisOzelligi(id) }));
    }
    src.setData({ type: "FeatureCollection", features: f });
    this.ayrilmisCiz();
    this.yapilariCiz();
  }

  /** Oyuncunun renk indeksi: bağdaştırıcı sunarsa sunucunun `renkIndeksi`, yoksa kimlikten kararlı karma. */
  private renkIndeksi(oyuncu: string): number {
    const b = this.baglanti as MulkBaglantisi & { renkIndeksi?: (o: string) => number | null };
    return b.renkIndeksi?.(oyuncu) ?? oyuncuRenkIndeksi(oyuncu);
  }

  private secimCiz(): void {
    const src = this.harita.getSource("secim") as GeoJSONSource | undefined;
    if (src) {
      const f: Feature<Polygon>[] = [];
      for (const id of this.secim.liste) {
        const c = idCoz(id);
        if (c) f.push(hucreCokgeni(c.x, c.y, this.ayrilmisOzelligi(id)));
      }
      src.setData({ type: "FeatureCollection", features: f });
    }
    this.altCiz();
  }

  private sayilar(): IlceSayilari | null {
    const s = this.sahiplik;
    if (!s) return null;
    let benim = 0;
    for (const h of s.hucreler.values()) if (h.sahip === this.baglanti.ben.id) benim++;
    return { uygun: s.uygun, satilmis: s.satilmis, benim, ...(s.ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis: s.ayrilmisSatilmis } : {}) };
  }

  /**
   * Oyuncunun bu ilçedeki ayrılmış hücre hakkı (yeni oyuncu ve katılım ilçesi kuralı; `fiyat.ts`). Bağdaştırıcı hakkı bildirmiyorsa
   * (sunucusuz kip) tanımsız: ayrılmış hücre bilinmez, hepsi normal sayılır.
   */
  private ayrilmisHakki(): AyrilmisHakki | undefined {
    const oz = this.baglanti.ozet?.() ?? null;
    const ilce = this.ilceKimlik;
    if (!oz || !ilce || oz.ayrilmisBitis === undefined) return undefined;
    const y = this.tablo.param.mulk?.yeniOyuncu;
    return ayrilmisHakki({ simZamani: oz.simZamani, ayrilmisBitis: oz.ayrilmisBitis, katilimIlcesi: oz.katilimIlcesi ?? null, ilce, yalnizKatilimIlcesi: y?.ayrilmisYalnizKatilimIlcesi === true, gun: y?.ayrilmisGun ?? 14 });
  }

  /** İlk-yapı indirimi (çekirdek `yapiPlani`): oran ve kalan hak; bağdaştırıcı bilmiyorsa tanımsız (indirim uygulanmaz). */
  ilkYapiIndirimi(): { ppm: number; kalan: number } | undefined {
    const kalan = this.baglanti.ozet?.()?.indirimliYapiKalan;
    const ppm = this.tablo.param.mulk?.yeniOyuncu.ilkYapiIndirimPpm;
    return kalan != null && ppm ? { ppm, kalan } : undefined;
  }

  /** Hücrenin ayrılmış olup olmadığı (liste biliniyorsa). */
  private ayrilmisMi(id: HucreId): boolean {
    return this.sahiplik?.ayrilmis?.has(id) ?? false;
  }

  /** GeoJSON özelliği: ayrılmış hücrede `ayrilmis: 1` (ayrılmış olmayanda alan hiç yazılmaz; boya `stil.ts`'te). */
  private ayrilmisOzelligi(id: HucreId): { ayrilmis?: 1 } {
    return this.ayrilmisMi(id) ? { ayrilmis: 1 } : {};
  }

  /**
   * Görünür kutudaki SATILMAMIŞ ayrılmış hücreler (kaynak `ayrilmis`; yalnız veri, boya `stil.ts`'te): her özellikte `ayrilmis: 1`.
   * Liste yalnız oyuncunun ayrılmış hakkı sürerken (katılım ilçesi) bilinir; bilinmiyorsa kaynak boştur.
   */
  private ayrilmisCiz(): void {
    if (!this.harita.getSource("sahiplik")) return; // stil henüz yüklenmedi
    if (!this.harita.getSource("ayrilmis")) this.harita.addSource("ayrilmis", { type: "geojson", data: BOS });
    const src = this.harita.getSource("ayrilmis") as GeoJSONSource;
    const s = this.sahiplik;
    if (!s?.ayrilmis || !this.izgara || this.harita.getZoom() < IZGARA_CIZGI_ZOOM) {
      src.setData(BOS);
      return;
    }
    const b = this.harita.getBounds();
    const [xa, xb, ya, yb] = [Math.floor(boylamdanX(b.getWest())), Math.ceil(boylamdanX(b.getEast())), Math.floor(enlemdenY(b.getNorth())), Math.ceil(enlemdenY(b.getSouth()))];
    const f: Feature<Polygon>[] = [];
    for (const id of s.ayrilmis) {
      if (s.hucreler.has(id)) continue;
      const c = idCoz(id);
      if (!c || c.x < xa || c.x > xb || c.y < ya || c.y > yb) continue;
      f.push(hucreCokgeni(c.x, c.y, { ayrilmis: 1 }));
      if (f.length >= 4000) break;
    }
    src.setData(f.length ? { type: "FeatureCollection", features: f } : BOS);
  }

  /** Tek hücrenin görünen fiyatı (tam ₺): ayrılmış hakkı olana taban fiyat, aksi hâlde eğri (çekirdek `hucreFiyatiMili`). */
  private hucreFiyatiGoster(id: HucreId, sinif: ArsaSinifi, sayi: IlceSayilari): number {
    const ayr = alimTuru(id, this.sahiplik?.ayrilmis, this.ayrilmisHakki()).tur === "ayrilmis";
    return Math.round(hucreFiyatiMili(sinif, { uygun: sayi.uygun, satilmis: sayi.satilmis, ...(sayi.ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis: sayi.ayrilmisSatilmis } : {}) }, 0, ayr) / 1000);
  }

  private benimKume(): Set<HucreId> {
    const k = new Set<HucreId>();
    for (const [id, h] of this.sahiplik?.hucreler ?? []) if (h.sahip === this.baglanti.ben.id) k.add(id);
    return k;
  }

  /** Hücrenin kamu grubu (sunucudan; hazır arsa kümesi varsa O(1) dizinle, yoksa bloklardan). */
  private kamuGrubu(x: number, y: number): KamuGrubuKaresi | null {
    return this.arsaK && this.arsaK.izgara === this.izgara ? kamuBilgisi(this.arsaK, x, y) : kamuGrubuBul(this.sahiplik?.kamu, x, y);
  }

  /** Hücre kamu arsasındaysa Türkçe ret nedeni (türüyle), değilse null. */
  private kamuHucre = (id: HucreId): string | null => {
    const c = idCoz(id);
    const g = c ? this.kamuGrubu(c.x, c.y) : null;
    return g ? kamuNedeni(g.tur) : null;
  };

  private sinifAl = (id: HucreId): ArsaSinifi => {
    const c = idCoz(id);
    return c && this.izgara ? arsaSinifi(durumAl(this.izgara, c.x, c.y)) : "kirsal";
  };

  /** Alt çubuk: hazır arsa seçiliyse arsa satın alma; hücre seçiliyse hücre satın alma; yoksa ipucu. */
  private altCiz(): void {
    const sayi = this.sayilar();
    if (this.duzey !== 3 || !this.ilceKimlik || this.altGizli) {
      this.alt.hidden = true;
      return;
    }
    if (!sayi) {
      // İlçe sunucunun dünyasında yok (ya da henüz yüklenmedi)
      this.alt.hidden = this.izgara === null;
      this.alt.innerHTML = `<span class="alt-ipucu">Bu ilçe sunucunun dünyasında yok: arsa alınamaz. Haritada gezebilirsin.</span>`;
      return;
    }
    this.alt.hidden = false;
    if (this.varis) return this.varisCiz(sayi);
    const coklu = `<button type="button" class="yalniz-dokunma" data-eylem="coklu" aria-pressed="${this.cokluSecim}">Çoklu seç</button>`;
    const aracDugme = `<button type="button" class="yalniz-dokunma" data-eylem="hucre-araci" aria-pressed="${this.hucreAraci}" title="Hücre hücre seçim (ileri düzey)">Hücre aracı</button>`;
    const yapiDugme = this.yerlesim ? `<button type="button" data-eylem="yapi-menu">Yapı kur</button>` : "";
    // 1) Hücre seçimi (ileri düzey araç: Shift ya da "Hücre aracı")
    if (this.secim.boyut > 0) return this.hucreBari(sayi, coklu, aracDugme);
    // 2) Kamu arsası (bilgi kartı; seçilemez, satın alınamaz)
    const ks = this.kamuSecili;
    if (ks) {
      const [x0, y0, x1, y1] = ks.blok;
      this.alt.innerHTML = `
        <span class="alt-sayi"><small>Kamu arsası</small><b data-alan="kamu-tur">${esc(KAMU_TUR_ADI[ks.grup.tur] ?? ks.grup.tur)}</b></span>
        <span class="alt-sayi"><small>Blok</small><b>${fmt((x1 - x0 + 1) * (y1 - y0 + 1))} hücre</b></span>
        <span class="alt-sayi"><small>Sahibi</small><b>${esc(kamuSahibiAdi(ks.grup.sahip))}</b></span>
        <span class="alt-ipucu">${esc(KAMU_ACIKLAMA[ks.grup.tur] ?? "")} Satışa ve yapı yerleşimine kapalı.</span>
        <div class="alt-dugmeler"><button type="button" data-eylem="temizle">Temizle</button></div>`;
      return;
    }
    // 3) Hazır arsa
    const a = this.arsaSecili;
    if (a) {
      const d = this.arsaDurumu(a);
      const siniflar = arsaSiniflari(a)
        .map(([k, n]) => `${SINIF_ADI[k]}${arsaSiniflari(a).length > 1 ? ` ${fmt(n)}` : ""}`)
        .join(" · ");
      if (d.durum === "bos") {
        const o = this.arsaFiyati(a, sayi);
        const sinir = o.engel;
        this.alt.innerHTML = `
          <span class="alt-sayi"><small>Hazır arsa</small><b data-alan="arsa-hucre">${fmt(a.hucreler.length)} hücre</b></span>
          <span class="alt-sayi"><small>Fiyat bölgesi</small><b data-alan="arsa-sinif">${esc(siniflar)}</b></span>
          <span class="alt-sayi alt-toplam"><small>Fiyat</small><b data-alan="arsa-toplam">${paraMili(o.mili, "yukari")}</b></span>
          <span class="alt-sayi"><small>Bu ilçede hücre sınırın</small><b>${fmt(o.benimSonra)} / ${fmt(ilceTavani(sayi.uygun))}</b></span>
          <div class="alt-dugmeler">${yapiDugme}<button type="button" data-eylem="temizle">Temizle</button><button type="button" class="birincil" data-eylem="arsa-al" ${sinir || this.satinAliniyor ? "disabled" : ""}>Satın al</button></div>
          <ul class="alt-uyari">${sinir ? `<li>${esc(sinir)}</li>` : ""}</ul>`;
      } else if (d.durum === "benim") {
        this.alt.innerHTML = `
          <span class="alt-sayi"><small>Senin arsan</small><b>${fmt(a.hucreler.length)} hücre</b></span>
          <span class="alt-sayi"><small>Fiyat bölgesi</small><b>${esc(siniflar)}</b></span>
          <span class="alt-ipucu" data-alan="arsa-durum">${esc(this.arsaYapiMetni(a))}</span>
          <div class="alt-dugmeler">${yapiDugme}<button type="button" data-eylem="temizle">Temizle</button></div>`;
      } else {
        this.alt.innerHTML = `
          <span class="alt-sayi"><small>Hazır arsa</small><b>${fmt(a.hucreler.length)} hücre</b></span>
          <span class="alt-ipucu">${d.durum === "kismen" ? "Bu arsanın bir kısmı satılmış; kalan hücreleri “Hücre aracı” (Shift) ile alabilirsin." : `Bu arsa ${esc(d.sahipler.join(", "))} tarafından alınmış.`}</span>
          <div class="alt-dugmeler">${aracDugme}<button type="button" data-eylem="temizle">Temizle</button></div>`;
      }
      return;
    }
    // 4) Boşta
    const hazirlaniyor = this.izgara && !this.arsaK ? " Arsalar hazırlanıyor…" : "";
    const ipucu = window.matchMedia("(pointer: coarse)").matches ? "Bir hazır arsaya dokun" : "Bir hazır arsaya tıkla";
    this.alt.innerHTML = `<span class="alt-ipucu">${ipucu} ya da “Yapı kur” ile yapıyı seçip yerleştir.${hazirlaniyor}</span>
      <span class="alt-sayi"><small>Bu ilçede hücre sınırın</small><b>${fmt(sayi.benim)} / ${fmt(ilceTavani(sayi.uygun))}</b></span>
      <div class="alt-dugmeler">${yapiDugme}${aracDugme}</div>`;
  }

  private hucreBari(sayi: IlceSayilari, coklu: string, aracDugme: string): void {
    const o = satinAlmaOzeti(this.secim.liste, this.sinifAl, sayi, this.benimKume());
    const sinifMetni = o.sinif
      ? SINIF_ADI[o.sinif]
      : (Object.entries(o.siniflar) as [ArsaSinifi, number][]).map(([k, n]) => `${SINIF_ADI[k]} ${fmt(n)}`).join(" · ");
    const uyari = o.engeller.map((m) => `<li>${esc(m)}</li>`).join("");
    this.alt.innerHTML = `
      <span class="alt-sayi"><small>Seçili</small><b data-alan="sayi">${fmt(o.sayi)} hücre</b></span>
      <span class="alt-sayi"><small>Fiyat bölgesi</small><b data-alan="sinif">${esc(sinifMetni)}</b></span>
      <span class="alt-sayi"><small>Hücre fiyatı</small><b>${o.hucreFiyati ? para(o.hucreFiyati) : "—"}</b></span>
      <span class="alt-sayi alt-toplam"><small>Toplam</small><b data-alan="toplam">${para(o.toplam)}</b></span>
      <span class="alt-sayi"><small>Bu ilçede hücre sınırın</small><b>${fmt(o.sinir.sonra)} / ${fmt(o.sinir.tavan)}</b></span>
      <div class="alt-dugmeler">
        ${aracDugme}${coklu}
        <button type="button" data-eylem="temizle">Temizle</button>
        <button type="button" class="birincil" data-eylem="satin-al" ${o.engeller.length || this.satinAliniyor ? "disabled" : ""}>${o.birlestir ? "Birleştir" : "Satın al"}</button>
      </div>
      <ul class="alt-uyari">${uyari}</ul>`;
  }

  private kartCiz(): void {
    const id = this.kartHucre;
    const c = id ? idCoz(id) : null;
    if (!id || !c || !this.izgara || this.duzey !== 3) {
      this.kart.hidden = true;
      return;
    }
    const d = durumAl(this.izgara, c.x, c.y);
    const sahip = this.sahiplik?.hucreler.get(id);
    const sayi = this.sayilar();
    const sinif = sahip?.sinif ?? arsaSinifi(d);
    const neden = engelNedeni(d);
    const ben = sahip?.sahip === this.baglanti.ben.id;
    const sahipMetni = sahip
      ? `<span class="sahip-isaret" style="background:${ben ? "var(--sen)" : `var(--oyuncu-${this.renkIndeksi(sahip.sahip)})`}"></span>${esc(ben ? "Sen" : this.baglanti.oyuncuAdi(sahip.sahip))}`
      : neden
        ? "Satılık değil"
        : "Sahipsiz";
    const deger = sahip ? (sahip.degerMili > 0 ? paraMili(sahip.degerMili, "asagi") : "—") : neden ? "—" : sayi ? para(this.hucreFiyatiGoster(id, sinif, sayi)) : "—";
    const ayrilmis = !sahip && !neden && this.ayrilmisMi(id) && this.ayrilmisHakki()?.var !== false;
    const doluluk = this.sahiplik && this.sahiplik.uygun > 0 ? yuzde((100 * this.sahiplik.satilmis) / this.sahiplik.uygun, 2) : "—";
    const ilceAd = this.ilceKimlik ? (this.s.hiyerarsi.ilceler.get(this.ilceKimlik)?.ad ?? "") : "";
    this.kart.hidden = false;
    this.kart.innerHTML = `
      <h3><span>Parsel ${esc(kisaAd(id))}</span><button type="button" data-eylem="kart-kapat" aria-label="Kartı kapat">${ikon("x", 18)}</button></h3>
      <dl>
        <dt>Sahip</dt><dd data-alan="sahip">${sahipMetni}</dd>
        <dt>Fiyat bölgesi</dt><dd data-alan="sinif">${neden ? esc(neden) : `${SINIF_ADI[sinif]} · ${ARAZI_ADLARI[durumSinifi(d)] ?? ""}`}</dd>
        <dt>${sahip ? "Değer" : "Fiyat"}</dt><dd data-alan="deger">${deger}</dd>
        ${ayrilmis ? `<dt>Ayrılmış</dt><dd data-alan="ayrilmis" data-ayrilmis="1">taban fiyat, katılımının ilk ${this.tablo.param.mulk?.yeniOyuncu.ayrilmisGun ?? 14} günü</dd>` : ""}
        <dt>${esc(ilceAd)}</dt><dd>${doluluk} dolu</dd>
      </dl>${this.s.yuruAc ? `<button type="button" class="kart-yuru" data-eylem="yuru" title="Sokak düzeyinde yürü (L4)">${ikon("footprints", 16)}Sokakta yürü</button>` : ""}`;
  }

  // --- hazır arsalar (F4) ----------------------------------------------------------------------------

  private arsaOnbellek = new Map<string, ArsaKumesi>();

  /** Izgaradan hazır arsaları türetir (ilçe başına bir kez; ana iş parçacığını ilk çizimden sonra meşgul eder, ~0,7 sn). */
  private arsaHazirla(): Promise<ArsaKumesi | null> {
    const iz = this.izgara;
    const ilce = this.ilceKimlik;
    if (!iz || !ilce) return Promise.resolve(null);
    const var_ = this.arsaOnbellek.get(ilce);
    if (var_) {
      this.arsaK = var_;
      this.arsaCiz();
      this.altCiz();
      return Promise.resolve(var_);
    }
    if (this.arsaHazir) return this.arsaHazir;
    this.arsaHazir = new Promise((coz) => {
      window.setTimeout(() => {
        if (iz !== this.izgara) return coz(null);
        // Kamu blokları sunucudan (sahiplikle birlikte gelir, dünya kurulurken donar): kamu hücreleri arsaya girmez
        const k = arsalariTuret(iz, this.sahiplik?.kamu ?? []);
        this.arsaOnbellek.set(ilce, k);
        this.arsaK = k;
        this.arsaCiz();
        this.altCiz();
        coz(k);
      }, 0);
    });
    return this.arsaHazir;
  }

  /**
   * Senin arsanın alt şerit metni: yapı ya da inşaat varsa durumu (A4: "Yapı kur" ipucu kalkar), yoksa ipucu.
   * Arsa hücrelerine değen yapılar sahiplik anlık görüntüsünden bulunur.
   */
  private arsaYapiMetni(a: Arsa): string {
    const hucreler = new Set<string>(a.hucreler);
    const burada = (this.sahiplik?.yapilar ?? []).filter((y) => y.hucreler.some((h) => hucreler.has(h)));
    if (burada.length === 0) return "Üzerine yapı kurmak için “Yapı kur”.";
    const ad = (tur: string | undefined): string => this.katalog.find((k) => k.id === tur)?.ad ?? "Yapı";
    const parca = burada.map((y) => `${ad(y.tur)} ${y.durum === "insaat" ? "inşa ediliyor" : "kurulu"}`);
    const m = parca.join(" · ");
    return `${m}.`;
  }

  /** Arsanın satış durumu (sahiplikten). */
  private arsaDurumu(a: Arsa): { durum: "bos" | "benim" | "kismen" | "baskasi"; sahipler: string[] } {
    const s = this.sahiplik;
    const ben = this.baglanti.ben.id;
    let benim = 0;
    const digerleri = new Set<string>();
    let sahipli = 0;
    for (const id of a.hucreler) {
      const h = s?.hucreler.get(id);
      if (!h) continue;
      sahipli++;
      if (h.sahip === ben) benim++;
      else digerleri.add(this.baglanti.oyuncuAdi(h.sahip));
    }
    const sahipler = [...digerleri];
    if (sahipli === 0) return { durum: "bos", sahipler };
    if (benim === a.hucreler.length) return { durum: "benim", sahipler };
    if (benim === 0 && sahipli === a.hucreler.length) return { durum: "baskasi", sahipler };
    return { durum: "kismen", sahipler };
  }

  /** Arsanın toplam fiyatı (çekirdekle aynı artımlı formül; ayrılmış hücre taban fiyattan) ve satın almayı engelleyen neden (`arsa.ts`). */
  private arsaFiyati(a: Arsa, sayi: IlceSayilari): { mili: number; adimlar: Array<{ sinif: ArsaSinifi; hucreler: HucreId[]; mili: number }>; engel: string | null; benimSonra: number } {
    const hak = this.ayrilmisHakki();
    return arsaFiyati({
      arsa: a,
      sinifAl: this.sinifAl,
      sayi,
      ...(this.sahiplik?.ayrilmis ? { ayrilmis: this.sahiplik.ayrilmis } : {}),
      ...(hak ? { hak } : {}),
      hazineMili: this.baglanti.ozet?.()?.hazineMili ?? null,
      para: (mili) => paraMili(mili, "yukari"),
    });
  }

  /** Görünür kutudaki arsa sınırları (z ≥ 14,8). */
  private arsaCiz(): void {
    const src = this.harita.getSource("arsalar") as GeoJSONSource | undefined;
    if (!src) return;
    const k = this.arsaK;
    if (!k || this.harita.getZoom() < L3_ZOOM - 0.2) {
      src.setData(BOS);
      this.ayrilmisCiz();
      return;
    }
    const b = this.harita.getBounds();
    const [xa, ya, xb, yb] = [Math.floor(boylamdanX(b.getWest())), Math.floor(enlemdenY(b.getNorth())), Math.ceil(boylamdanX(b.getEast())), Math.ceil(enlemdenY(b.getSouth()))];
    const kes = arsaSinirlari(k, xa, ya, xb, yb);
    src.setData(kes.length ? { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: kes } } : BOS);
    // Kamu arsaları: sakin doku (dikdörtgen bloklar; sunucudan)
    const kamu = this.harita.getSource("arsa-kamu") as GeoJSONSource | undefined;
    if (kamu) {
      const l = kamuBloklari(k, xa, ya, xb, yb);
      kamu.setData(l.length ? { type: "FeatureCollection", features: l.map(({ grup, blok }) => blokCokgeni(blok, { t: grup.tur })) } : BOS);
    }
    this.ayrilmisCiz();
  }

  private arsaVurguCiz(): void {
    const src = this.harita.getSource("arsa-vurgu") as GeoJSONSource | undefined;
    if (!src) return;
    // Yapı yerleşimi sürerken arsa vurgusu gizlenir (hayaletin mavi/turuncu renkleriyle karışmasın).
    if (this.yerlesim?.aktif || this.olcek?.aktif) {
      src.setData(BOS);
      return;
    }
    const f: Feature[] = [];
    const ekle = (a: Arsa | null, secili: number): void => {
      if (!a) return;
      for (const id of a.hucreler) {
        const c = idCoz(id);
        if (c) f.push(hucreCokgeni(c.x, c.y, { s: secili, ...this.ayrilmisOzelligi(id) }));
      }
      f.push({ type: "Feature", properties: { s: secili, ...(a.hucreler.some((id) => this.ayrilmisMi(id)) ? { ayrilmis: 1 } : {}) }, geometry: { type: "MultiLineString", coordinates: arsaKenarlari(a) } });
    };
    if (this.arsaUzerinde && this.arsaUzerinde !== this.arsaSecili) ekle(this.arsaUzerinde, 0);
    ekle(this.arsaSecili, 1);
    if (this.kamuSecili) f.push(blokCokgeni(this.kamuSecili.blok, { s: 1 }));
    src.setData({ type: "FeatureCollection", features: f });
  }

  /** Kamu bloğunu bilgi için gösterir (seçim değildir: satın alma ve yapı kurma yok). */
  private kamuSec(grup: KamuGrubuKaresi, x: number, y: number): void {
    const blok = grup.blok.find(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
    if (!blok) return;
    this.arsaSecili = null;
    this.kamuSecili = { grup, blok };
    this.secim.temizle();
    this.secimCiz();
    this.kartHucre = null;
    this.kart.hidden = true;
    this.arsaVurguCiz();
    this.altCiz();
  }

  /** Hazır arsayı seçer (alt çubuk satın alma/yapı kurma için); null seçimi kaldırır. */
  arsaSec(a: Arsa | null): void {
    this.arsaSecili = a;
    if (a) this.varis = null; // oyuncu bir arsa seçti: varış kartı biter (düğme birincilliği aşağıda `varisAyarla`dan)
    if (a) this.yerlesim?.birincilAyarla(true);
    if (a) this.kamuSecili = null;
    if (a) {
      this.secim.temizle();
      this.secimCiz();
      this.kartHucre = null;
      this.kart.hidden = true;
    }
    this.arsaVurguCiz();
    this.altCiz();
  }

  /** Tek tıkla hazır arsa satın alma: `parsel_al` (sınıf başına). */
  private async arsaAl(): Promise<void> {
    const a = this.arsaSecili;
    const sayi = this.sayilar();
    const ilce = this.ilceKimlik;
    if (!a || !sayi || !ilce || this.satinAliniyor) return;
    const o = this.arsaFiyati(a, sayi);
    if (o.engel) return;
    this.satinAliniyor = true;
    this.altCiz();
    try {
      const r = await parselZinciri(this.baglanti, ilce, o.adimlar);
      if (!r.hata) bildir(`Arsa satın alındı: ${fmt(r.alinan.length)} hücre, ${paraMili(r.odenenMili, "yukari")}.`, "tamam");
      else if (r.alinan.length > 0) bildir(`Arsa kısmen alındı (${fmt(r.alinan.length)} hücre): ${r.hata.mesaj}`, "hata");
      else bildir(`Arsa alınamadı: ${r.hata.mesaj}`, "hata");
    } catch (e) {
      bildir(`Olmadı: ${e instanceof Error ? e.message : String(e)}`, "hata");
    } finally {
      this.satinAliniyor = false;
      await this.sahiplikYenile();
    }
  }

  /** Sunucu/bağdaştırıcı değişince (kare, delta, bağlantı): sahipliği tazele, hazineyi ve yapıları yaz. */
  private canliBaglan(): void {
    if (this.canliBirak || !this.baglanti.dinle) {
      this.durumYaz();
      return;
    }
    this.canliBirak = this.baglanti.dinle(() => {
      if (this.canliBekliyor || this.kap.hidden) return;
      this.canliBekliyor = true;
      window.setTimeout(() => {
        this.canliBekliyor = false;
        void this.sahiplikYenile();
      }, 50);
    });
    // Hazine formülü ve inşaat aşamaları zamanla ilerler: iki saniyede bir tazele.
    this.durumZamanlayici = window.setInterval(() => this.durumYaz(), 2000);
    this.durumYaz();
  }

  private durumYaz(): void {
    const oz = this.baglanti.ozet?.() ?? null;
    if (this.kap.hidden || !oz) {
      this.hazineYazi.hidden = true;
    } else {
      const kopuk = oz.baglanti === "kopuk";
      this.hazineYazi.hidden = oz.hazineMili === null && !kopuk;
      this.hazineYazi.classList.toggle("kopuk", kopuk);
      this.hazineYazi.innerHTML = `${oz.hazineMili !== null ? `<span class="hz-etiket">Hazine</span> <b data-alan="hazine">${paraMili(oz.hazineMili)}</b>` : ""} <span class="hz-saat" data-alan="saat">${simSaatMetni(oz.simZamani / 3_600_000)}</span>${kopuk ? ` <span class="hz-kopuk">Bağlantı koptu, yeniden deneniyor…</span>` : ""}`;
    }
    const yet = oz?.yetisiyor ?? null;
    if (yet && !this.kap.hidden) {
      const yuz = Math.round(yet.ilerleme * 100);
      this.yetismeSeridi.innerHTML = `<span>Dünya yetişiyor: sunucu kapalıyken geçen süre işleniyor. Komutların kısa süre beklemesi normaldir.</span><span class="yt-cubuk" aria-hidden="true"><i style="width:${yuz}%"></i></span>`;
      this.yetismeSeridi.hidden = false;
    } else this.yetismeSeridi.hidden = true;
    if ((this.sahiplik?.yapilar ?? []).some((y) => y.durum === "insaat")) this.yapilariCiz();
  }

  /** Yapılar: hücre dolgusu aşamaya göre (Temel, İskele, Gövde, Tamam) + "Çiftlik · Gövde" etiketi. */
  /** Son çizilen yapı imzası (yapı, aşama, düzey, tema): değişmediyse kaynak ve etiketler yeniden kurulmaz. */
  private yapiImzasi = "";

  private yapilariCiz(zorla = false): void {
    const src = this.harita.getSource("yapilar") as GeoJSONSource | undefined;
    if (!src) return;
    // İl ve küre düzeyinde (ilçe seçili değil) yapı çizilmez: dolgu ve etiket yalnız ilçe/arsa düzeyinde (`gorunurluk.ts`)
    const cizim = yapiCizimi(this.ilceKimlik, this.duzey);
    const yapilar = cizim.dolgu ? (this.sahiplik?.yapilar ?? []) : [];
    const simdi = this.baglanti.ozet?.()?.simZamani ?? 0;
    const ben = this.baglanti.ben.id;
    const sure = (y: (typeof yapilar)[number]): number => (this.katalog.find((k) => k.id === y.tur)?.ilkGunSureSaat ?? 1) * 3_600_000;
    // Aşama ancak birkaç saatte bir değişir: iki saniyelik tazelemede aynıysa kaynak yeniden yüklenmez (harita boşta kalsın)
    const imza = `${cizim.etiket ? 1 : 0}|${ben}|${yapilar.map((y) => `${y.anahtar}:${y.sahip}:${y.tur ?? ""}:${y.hucreler.join(",")}:${yapiAsamasi(y, simdi, sure(y))}:${asinmaOzelligi(y.sahip, ben, y.asinmaPpm).w ?? 0}:${y.bitis === undefined ? 0 : 1}${cizim.etiket && y.bitis !== undefined && y.bitis > simdi ? `:${Math.ceil((y.bitis - simdi) / 60_000)}` : ""}`).join(";")}`; // etiketteki kalan süre dakikada bir tazelenir (B6)
    if (!zorla && imza === this.yapiImzasi) return;
    this.yapiImzasi = imza;
    for (const m of this.yapiEtiketleri) m.remove();
    this.yapiEtiketleri = [];
    if (yapilar.length === 0) {
      src.setData(BOS);
      return;
    }
    const f: Feature<Polygon>[] = [];
    const katmanRengi = (tur: string | undefined): string => {
      const k = yapiKatmani(tur);
      return renk(k ? `--katman-${k}` : "--murekkep-3");
    };
    for (const y of yapilar) {
      const a = yapiAsamasi(y, simdi, sure(y));
      let sx = 0;
      let sy = 0;
      for (const id of y.hucreler) {
        const c = idCoz(id);
        if (!c) continue;
        f.push(hucreCokgeni(c.x, c.y, { a, ben: y.sahip === ben ? 1 : 0, c: katmanRengi(y.tur), ...asinmaOzelligi(y.sahip, ben, y.asinmaPpm) }));
        sx += c.x + 0.5;
        sy += c.y + 0.5;
      }
      if (!cizim.etiket || y.hucreler.length === 0) continue;
      const e = document.createElement("div");
      e.className = `yapi-etiket asama${a}${y.sahip === ben ? " benim" : ""}`;
      e.style.setProperty("--kr", yapiRengiCss(y.tur));
      e.dataset["yapi"] = y.anahtar;
      e.setAttribute("aria-hidden", "true");
      const ad = y.tur ? (this.katalog.find((k) => k.id === y.tur)?.ad ?? y.tur) : "Yapı";
      const kalan = y.bitis !== undefined && y.bitis > simdi ? ` · ${kalanSureMetni(y.bitis - simdi)}` : ""; // B6: "Çiftlik · İskele · 7 dk"
      e.textContent = y.yukseltme ? `${ad} · Büyütme${kalan}` : a === 3 ? ad : `${ad} · ${y.bitis === undefined ? "İnşaat" : ASAMA_ADI[a]}${kalan}`;
      this.yapiEtiketleri.push(new maplibregl.Marker({ element: e, anchor: "center" }).setLngLat([xtenBoylam(sx / y.hucreler.length), ytenEnlem(sy / y.hucreler.length)]).addTo(this.harita));
    }
    src.setData({ type: "FeatureCollection", features: f });
  }

  // --- dış arayüz: Yerleş ekranı ve sınama kancaları --------------------------------------------------

  /** Hazır arsa kümesi (türetilmişse). */
  arsaKumesi(): ArsaKumesi | null {
    return this.arsaK;
  }

  /** Hazır arsalar hazır olunca çözülür (ilçe ızgarası yüklüyse). */
  arsalarHazir(): Promise<ArsaKumesi | null> {
    return this.arsaHazirla();
  }

  /** Yapı kataloğu (menü ve Yerleş önerileri). */
  yapiKatalogu(): readonly YapiTanimi[] {
    return this.katalog;
  }

  /** Dükkân kurulabilir mi: katalogda `dukkan` ek yapısı var ve yapı yerleşim kipi kurulu (dünyada G7 açık). */
  dukkanKurulabilir(): boolean {
    return this.yerlesim !== null && this.katalog.some((y) => y.id === "dukkan");
  }

  /**
   * D0 "Dükkân kur" ve Defter kartındaki ikincil düğme: yapı yerleşim kipini `dukkan` seçili açar (maliyet kartında dükkân türü seçimi D2). İlçe açık olmalıdır
   * (`mulk-panel.ts` önce ilçeyi açar). Başlayamazsa false.
   */
  dukkanKurBaslat(): boolean {
    return this.dukkanKurulabilir() && (this.yerlesim?.sec("dukkan") ?? false);
  }

  /** Yapı menüsünü açar (stoksuz dükkân rafında "Yapı kur" yönlendirmesi); menü düğmesi görünür değilse etkisiz. */
  yapiMenusuAc(): void {
    this.yerlesim?.menuAc(true);
  }

  /**
   * Yapı kurma kartı için dükkân bilgisi (D2 tür seçimi, D3 pencere satırı, sayaçlar): kare köprüden görünüme çevrilir; kare ya da dünyada dükkân yoksa tanımsız
   * (`dukkan` yapısı düz yapı kartıyla çıkar). Bu ilçedeki ve ilindeki dükkân sayısı kendi dükkânlarındır.
   */
  private dukkanKurBilgisi(): DukkanKurBilgisi | undefined {
    const stokMili = (mal: string): number => this.baglanti.isletme?.()?.mallar.find((x) => x.mal === mal)?.stokMili ?? 0;
    const kare = this.baglanti.dukkanKaresi?.() ?? null;
    const indirim = this.ilkYapiIndirimi();
    const kaynak = dukkanKaynagiKur({ kare: () => kare, ic: this.tablo, katalog: this.katalog, hazineMili: () => this.baglanti.ozet?.()?.hazineMili ?? null, stokMili, indirim: () => indirim });
    return dukkanKurBilgisi({
      ic: this.tablo,
      katalog: this.katalog,
      gorunum: kaynak.gorunum(),
      ilce: this.ilceKimlik,
      ilceIl: (i) => this.s.hiyerarsi.ilceler.get(i)?.il ?? null,
      stokMili,
      indirim,
      referans: referansFiyati(this.tablo, kare),
    });
  }

  /** Yapı menüsünde "Önerilen" rozeti (Yerleş açılış önerisi). */
  oneriYapi(id: string | null): void {
    this.yerlesim?.oneriAyarla(id);
  }

  /** Sınama kancası: yapı yerleşim kipi. */
  get yerlesimKipi(): YerlesimKipi | null {
    return this.yerlesim;
  }

  /** Sınama kancası: seçili hazır arsa. */
  seciliArsa(): Arsa | null {
    return this.arsaSecili;
  }

  /** Hazır arsaya uç ve seç: Yerleş ekranı onayından sonra. Arsa yoksa false. */
  async arsayaUc(a: Arsa): Promise<void> {
    this.arsaSec(a);
    const sinir: Sinir = [xtenBoylam(a.x0), ytenEnlem(a.y1 + 1), xtenBoylam(a.x1 + 1), ytenEnlem(a.y0)];
    const bitti = new Promise<void>((coz) => this.harita.once("moveend", () => coz()));
    const pad = Math.min(160, Math.round(Math.min(this.kap.clientWidth, this.kap.clientHeight) * 0.22));
    this.harita.fitBounds(sinirdanKutu(sinir), { padding: { top: pad + 40, bottom: pad + 60, left: pad, right: pad }, maxZoom: 17.1, duration: hareketAzMi() ? 0 : 1100 });
    await bitti;
    this.duzeyGuncelle();
  }

  /**
   * Yerleş ekranı varışı. Oyuncunun yurdu (kendi boş hücreleri) varsa harita yurda yaklaşır ve "Yurdun hazır" kartı açılır: birincil eylem
   * "Yurdunda kur" (ücretsiz), ikincil "Arsa satın al"; hazır arsa OTOMATİK SEÇİLMEZ. Yurdu yoksa önerilen hazır arsaya uçar ve seçer
   * (arsa almaktan başka yol yok). Yapı menüsünde açılış önerisinin yapısına "Önerilen" rozeti koyar. Varış ele alındıysa true.
   */
  async yerlesVarisi(acilis: ArsaTercihi, oneriYapi: string, merkez: [number, number]): Promise<boolean> {
    this.oneriYapi(oneriYapi);
    const k = await this.arsalarHazir();
    if (!k || !this.ilceKimlik) return false;
    const sh = await this.baglanti.sahiplikAl(this.ilceKimlik);
    const bos = yurtBosHucreler(sh, this.baglanti.ben.id);
    if (bos.length > 0) {
      this.varisAyarla({ acilis, oneriYapi, merkez, genislet: false });
      this.hucrelereYakinlas(bos);
      return true;
    }
    const c = noktadanHucre(merkez[0], merkez[1]);
    return (await this.onerilenArsayaGit(acilis, c.x, c.y, sh)) !== null;
  }

  /** Önerilen hazır arsaya (açılış önerisine uyan, boş, (cx, cy)'ye yakın) uçar ve seçer. Bütçe: hazinenin %40'ı (kalanı ilk yapıya). */
  private async onerilenArsayaGit(acilis: ArsaTercihi, cx: number, cy: number, sh: IlceSahipligi | null): Promise<Arsa | null> {
    const k = await this.arsalarHazir();
    if (!k) return null;
    const hazine = this.baglanti.ozet?.()?.hazineMili ?? null;
    const sayi = this.sayilar();
    const butce = hazine !== null && sayi ? { fiyat: (x: Arsa) => this.arsaFiyati(x, sayi).mili, tavanMili: hazine * 0.4 } : undefined;
    const a = onerilenArsa(k, (id) => sh?.hucreler.has(id) ?? false, cx, cy, acilis, butce);
    if (a) await this.arsayaUc(a);
    return a;
  }

  /** Varış kartını aç/kapat (tek birincil kuralı: açıkken üstteki "Yapı kur" düğmesi birincil olmaz). */
  private varisAyarla(v: typeof this.varis): void {
    this.varis = v;
    this.yerlesim?.birincilAyarla(v === null);
    this.altCiz();
  }

  /** Sınama kancası: varış kartı açık mı. */
  get varisKartiAcik(): boolean {
    return this.varis !== null;
  }

  private varisCiz(sayi: IlceSayilari): void {
    const v = this.varis;
    if (!v) return;
    if (v.genislet) {
      this.alt.innerHTML = `<div class="alt-dugmeler"><button type="button" data-eylem="varis-arsa">${esc(YURT_METIN.genislet)}</button></div>`;
      return;
    }
    const y = this.katalog.find((k) => k.id === v.oneriYapi);
    const yp = y ? this.yerlesim?.yurtDurumu(y) : undefined;
    const sigar = yp?.plan?.gecerli === true;
    const aciklama = sigar ? YURT_METIN.aciklama(sayi.benim) : (yp?.plan?.neden ?? yp?.neden ?? YURT_METIN.yerYok);
    this.alt.innerHTML = `
      <span class="alt-sayi"><small>${esc(YURT_METIN.baslik)}</small><b data-alan="yurt-hucre">${fmt(sayi.benim)} hücre</b></span>
      <span class="alt-ipucu" data-alan="yurt-aciklama">${esc(aciklama)}</span>
      <div class="alt-dugmeler"><button type="button" data-eylem="varis-arsa">${esc(YURT_METIN.ikincil)}</button><button type="button" class="birincil" data-eylem="yurt-kur" ${sigar && !this.yurtKuruluyor ? "" : "disabled"}>${esc(YURT_METIN.birincil)} <small>${esc(YURT_METIN.birincilNot)}</small></button></div>`;
  }

  /** "Yurdunda kur": önerilen yapı yurda yerleşir ve tek işlemde kurulur (arsa parası yok); sonra "Genişlet" önerisi. */
  private async yurtaKur(): Promise<void> {
    const v = this.varis;
    if (!v || v.genislet || this.yurtKuruluyor || !this.yerlesim) return;
    this.yurtKuruluyor = true;
    this.altCiz();
    try {
      const r = await this.yerlesim.yurdaKur(v.oneriYapi);
      if (r.tamam) this.varisAyarla({ ...v, genislet: true });
      else if (r.neden) bildir(r.neden, "hata");
    } finally {
      this.yurtKuruluyor = false;
      this.altCiz();
    }
  }

  /** "Arsa satın al" / "Genişlet": varış kartı biter; yurdun yanındaki (yoksa ilçe merkezindeki) önerilen hazır arsa seçilir. */
  private async varistaArsa(): Promise<void> {
    const v = this.varis;
    if (!v) return;
    const ben = this.baglanti.ben.id;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const [id, h] of this.sahiplik?.hucreler ?? []) {
      const c = h.sahip === ben ? idCoz(id) : null;
      if (c) {
        sx += c.x;
        sy += c.y;
        n++;
      }
    }
    const m = n > 0 ? { x: Math.round(sx / n), y: Math.round(sy / n) } : noktadanHucre(v.merkez[0], v.merkez[1]);
    this.varisAyarla(null);
    const a = await this.onerilenArsayaGit(v.acilis, m.x, m.y, this.sahiplik);
    if (!a) bildir("Bu ilçede boş hazır arsa kalmadı.", "bilgi");
  }

  /** Sınama kancası: bir hücrenin harita kabı içindeki ekran konumu. */
  hucreEkrani(id: HucreId): { x: number; y: number } | null {
    const c = idCoz(id);
    if (!c) return null;
    const p = this.harita.project(hucreMerkezi(c.x, c.y));
    return { x: p.x, y: p.y };
  }

  // --- ipucu ---------------------------------------------------------------------------------------

  private ipucuGoster(html: string, x: number, y: number, uyari = false, sure = 0): void {
    const e = this.ipucu;
    e.innerHTML = html;
    e.classList.toggle("uyari", uyari);
    e.hidden = false;
    const r = this.kap.getBoundingClientRect();
    const w = e.offsetWidth;
    const h = e.offsetHeight;
    const px = Math.min(r.width - w - 6, x + 14);
    const py = y + 18 + h > r.height ? y - h - 12 : y + 18;
    e.style.transform = `translate(${Math.max(6, px)}px, ${Math.max(6, py)}px)`;
    window.clearTimeout(this.ipucuZamanlayici);
    if (sure > 0) this.ipucuZamanlayici = window.setTimeout(() => this.ipucuGizle(), sure);
  }

  private ipucuGizle(): void {
    this.ipucu.hidden = true;
  }

  private hucreIpucu(x: number, y: number): { html: string; uyari: boolean; ayrilmis?: boolean } | null {
    if (!this.izgara) return null;
    const d = durumAl(this.izgara, x, y);
    const neden = engelNedeni(d);
    if (neden) return { html: `<b>Satın alınamaz</b> · ${esc(neden)}`, uyari: true };
    const id = hucreId(x, y);
    const kg = this.kamuGrubu(x, y);
    if (kg) return { html: `<b>Kamu arsası</b> · ${esc(KAMU_TUR_ADI[kg.tur] ?? kg.tur)} · satışa kapalı`, uyari: false };
    const sh = this.sahiplik?.hucreler.get(id);
    if (sh) {
      const ben = sh.sahip === this.baglanti.ben.id;
      return { html: ben ? "<b>Senin parselin</b>" : `<b>Sahibi:</b> ${esc(this.baglanti.oyuncuAdi(sh.sahip))}`, uyari: !ben };
    }
    const sayi = this.sayilar();
    const sinif = arsaSinifi(d);
    const fiyat = sayi ? this.hucreFiyatiGoster(id, sinif, sayi) : 0;
    const ayrilmis = this.ayrilmisMi(id) && this.ayrilmisHakki()?.var !== false;
    return { html: `<b>${SINIF_ADI[sinif]}</b> · ${esc(ARAZI_ADLARI[durumSinifi(d)] ?? "")} · ${para(fiyat)}${ayrilmis ? " · ayrılmış hücre: taban fiyat" : ""}`, uyari: false, ayrilmis };
  }

  /** Hazır arsa üzerinde ipucu: hücre sayısı, sınıf, fiyat ya da durum. */
  private arsaIpucu(a: Arsa): { html: string; uyari: boolean; ayrilmis?: boolean } {
    const d = this.arsaDurumu(a);
    const sinif = arsaSiniflari(a).map(([k]) => SINIF_ADI[k]).join(" · ");
    const bas = `<b>Hazır arsa</b> · ${fmt(a.hucreler.length)} hücre · ${esc(sinif)}`;
    if (d.durum === "benim") return { html: `${bas} · <b>senin</b>`, uyari: false };
    if (d.durum === "baskasi") return { html: `${bas} · sahibi ${esc(d.sahipler.join(", "))}`, uyari: true };
    if (d.durum === "kismen") return { html: `${bas} · kısmen satılmış`, uyari: true };
    const sayi = this.sayilar();
    const ayrilmis = this.ayrilmisHakki()?.var !== false && a.hucreler.some((id) => this.ayrilmisMi(id));
    return { html: `${bas}${sayi ? ` · ${paraMili(this.arsaFiyati(a, sayi).mili, "yukari")}` : ""}${ayrilmis ? " · ayrılmış hücre: taban fiyat" : ""}`, uyari: false, ayrilmis };
  }

  // --- olaylar --------------------------------------------------------------------------------------

  private secimBaglami(): SecimBaglami | null {
    if (!this.izgara) return null;
    const s = this.sahiplik;
    return {
      izgara: this.izgara,
      sahip: (id) => s?.hucreler.get(id)?.sahip ?? null,
      ben: this.baglanti.ben.id,
      ad: (k) => this.baglanti.oyuncuAdi(k),
      kamu: this.kamuHucre,
    };
  }

  private olaylar(): void {
    const h = this.harita;
    h.on("moveend", () => {
      this.etiketGorunurlugu();
      this.duzeyGuncelle();
    });
    h.on("moveend", () => this.arsaCiz());
    h.on("mousemove", (e) => this.uzerinde(e));
    h.on("mouseout", () => {
      this.ipucuGizle();
      this.uzerindeAyarla(null);
    });
    h.on("click", (e) => this.tikla(e));

    // Shift + sürükle: dikdörtgen seçim (MapLibre'nin kutu yakınlaşması kapalı)
    const tuval = h.getCanvasContainer();
    const konum = (ev: MouseEvent): { lng: number; lat: number } => {
      const r = tuval.getBoundingClientRect();
      return h.unproject([ev.clientX - r.left, ev.clientY - r.top]);
    };
    tuval.addEventListener(
      "mousedown",
      (ev) => {
        if (!(ev.shiftKey && ev.button === 0) || this.duzey !== 3 || !this.izgara) return;
        h.dragPan.disable();
        const p = konum(ev);
        const c = noktadanHucre(p.lng, p.lat);
        this.suruklenen = { x0: c.x, y0: c.y, x1: c.x, y1: c.y };
        const tasi = (m: MouseEvent): void => {
          if (!this.suruklenen) return;
          const q = konum(m);
          const d = noktadanHucre(q.lng, q.lat);
          this.suruklenen.x1 = d.x;
          this.suruklenen.y1 = d.y;
          this.dikdortgenCiz();
        };
        const birak = (m: MouseEvent): void => {
          window.removeEventListener("mousemove", tasi);
          window.removeEventListener("mouseup", birak);
          h.dragPan.enable();
          const s = this.suruklenen;
          this.suruklenen = null;
          (h.getSource("dikdortgen") as GeoJSONSource).setData(BOS);
          const b = this.secimBaglami();
          if (!s || !b || (s.x0 === s.x1 && s.y0 === s.y1)) return; // shift+tık: tıklama işleyicisi
          this.tiklamaYut = true;
          const r = this.secim.dikdortgen(b, s.x0, s.y0, s.x1, s.y1);
          this.secimCiz();
          const parca: string[] = [`${fmt(r.eklenen)} hücre eklendi`];
          if (r.atlanan) parca.push(`${fmt(r.atlanan)} uygunsuz hücre atlandı`);
          if (r.farkliSinif) parca.push(`${fmt(r.farkliSinif)} hücre farklı sınıftan (seçim tek sınıftan olmalı)`);
          if (r.kesildi) parca.push("en çok 72 hücre");
          const kr = this.kap.getBoundingClientRect();
          this.ipucuGoster(esc(parca.join(" · ")), m.clientX - kr.left, m.clientY - kr.top, r.atlanan > 0 || r.farkliSinif > 0 || r.kesildi, 3200);
        };
        window.addEventListener("mousemove", tasi);
        window.addEventListener("mouseup", birak);
      },
      true,
    );

    // Alt çubuk ve kart düğmeleri
    this.alt.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button[data-eylem]") as HTMLButtonElement | null;
      if (!b) return;
      const ey = b.dataset["eylem"];
      if (ey === "temizle") this.secimTemizle();
      else if (ey === "coklu") {
        this.cokluSecim = !this.cokluSecim;
        this.altCiz();
      } else if (ey === "hucre-araci") {
        this.hucreAraci = !this.hucreAraci;
        if (!this.hucreAraci) this.cokluSecim = false;
        this.arsaSec(null);
      } else if (ey === "yurt-kur") void this.yurtaKur();
      else if (ey === "varis-arsa") void this.varistaArsa();
      else if (ey === "yapi-menu") this.yerlesim?.menuAc(true);
      else if (ey === "arsa-al") void this.arsaAl();
      else if (ey === "satin-al") void this.satinAl();
    });
    this.kart.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("[data-eylem='yuru']")) {
        const c = this.kartHucre ? idCoz(this.kartHucre) : null;
        if (c) this.s.yuruAc?.(...hucreMerkezi(c.x, c.y));
        return;
      }
      if ((e.target as HTMLElement).closest("[data-eylem='kart-kapat']")) {
        this.kartHucre = null;
        this.kartCiz();
      }
    });
  }

  private dikdortgenCiz(): void {
    const s = this.suruklenen;
    if (!s) return;
    const [xa, xb] = [Math.min(s.x0, s.x1), Math.max(s.x0, s.x1) + 1];
    const [ya, yb] = [Math.min(s.y0, s.y1), Math.max(s.y0, s.y1) + 1];
    const b = xtenBoylam(xa);
    const d = xtenBoylam(xb);
    const k = ytenEnlem(ya);
    const g = ytenEnlem(yb);
    (this.harita.getSource("dikdortgen") as GeoJSONSource).setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[b, k], [d, k], [d, g], [b, g], [b, k]] },
    });
  }

  private uzerindeAyarla(k: string | null): void {
    if (k === this.uzerindeIlce) return;
    if (this.uzerindeIlce) this.harita.setFeatureState({ source: "ilceler", id: this.uzerindeIlce }, { uzerinde: false });
    this.uzerindeIlce = k;
    if (k) this.harita.setFeatureState({ source: "ilceler", id: k }, { uzerinde: true });
  }

  private uzerinde(e: MapMouseEvent): void {
    if (this.suruklenen) return;
    const p = e.point;
    if (this.duzey === 3 && this.izgara) {
      this.uzerindeAyarla(null);
      if (this.olcek?.aktif) return;
      if (this.yerlesim?.aktif) {
        this.yerlesim.uzerinde(e);
        return;
      }
      const c = noktadanHucre(e.lngLat.lng, e.lngLat.lat);
      const hucreModu = (e.originalEvent as MouseEvent).shiftKey || this.hucreAraci;
      if (!hucreModu && this.arsaK) {
        const a = hucredenArsa(this.arsaK, c.x, c.y);
        if (a !== this.arsaUzerinde) {
          this.arsaUzerinde = a;
          this.arsaVurguCiz();
        }
        const ip = a ? this.arsaIpucu(a) : null;
        if (ip) {
          this.ipucuGoster(ip.html, p.x, p.y, ip.uyari);
          return;
        }
      } else if (this.arsaUzerinde) {
        this.arsaUzerinde = null;
        this.arsaVurguCiz();
      }
      const ip = this.hucreIpucu(c.x, c.y);
      if (ip) this.ipucuGoster(ip.html, p.x, p.y, ip.uyari);
      else this.ipucuGizle();
      return;
    }
    const f = this.harita.queryRenderedFeatures(p, { layers: ["ilce-dolgu"] })[0];
    const k = (f?.properties["kimlik"] as string | undefined) ?? null;
    this.uzerindeAyarla(k && k !== this.ilceKimlik ? k : null);
    this.harita.getCanvas().style.cursor = k ? "pointer" : "";
    if (k) {
      const ad = this.s.hiyerarsi.ilceler.get(k)?.ad ?? "";
      const ek = this.izgaraVar(k) ? " · arsa ızgarası var" : "";
      this.ipucuGoster(`<b>${esc(ad)}</b>${ek}`, p.x, p.y);
    } else this.ipucuGizle();
  }

  private tikla(e: MapMouseEvent): void {
    if (this.tiklamaYut) {
      this.tiklamaYut = false;
      return;
    }
    const ev = e.originalEvent as MouseEvent;
    if (this.duzey === 3 && this.izgara) {
      if (this.olcek?.aktif) return; // hayalet otomatik: hücre seçimi yok
      if (this.yerlesim?.aktif) {
        this.yerlesim.tikla(e);
        return;
      }
      const b = this.secimBaglami();
      if (!b) return;
      const c = noktadanHucre(e.lngLat.lng, e.lngLat.lat);
      const id = hucreId(c.x, c.y);
      // Varsayılan: hazır arsa. Hücre ızgarası yalnız ileri düzey araçtır (Shift ya da "Hücre aracı").
      if (!ev.shiftKey && !this.hucreAraci) {
        const a = this.arsaK ? hucredenArsa(this.arsaK, c.x, c.y) : null;
        if (a) {
          this.arsaSec(a);
          return;
        }
        // Kamu arsası: seçilmez; bilgi kartı (tür, sahip, neden) alt çubukta
        const kg = this.kamuGrubu(c.x, c.y);
        if (kg) {
          this.kamuSec(kg, c.x, c.y);
          return;
        }
        const neden = secilemezNedeni(b, c.x, c.y);
        if (neden && !this.sahiplik?.hucreler.has(id)) this.ipucuGoster(`<b>Seçilemez</b> · ${esc(neden)}`, e.point.x, e.point.y, true, 2600);
        else if (this.sahiplik?.hucreler.has(id)) {
          this.kartHucre = id;
          this.kartCiz();
        } else this.ipucuGoster("Bu hücre hazır arsaların dışında kaldı: tek hücre için Shift + tık (ya da “Hücre aracı”).", e.point.x, e.point.y, false, 3200);
        return;
      }
      this.arsaSecili = null;
      this.kamuSecili = null;
      this.arsaVurguCiz();
      const coklu = ev.shiftKey || this.cokluSecim;
      const r = coklu ? this.secim.degistir(b, c.x, c.y) : this.secim.tek(b, c.x, c.y);
      this.kartHucre = id;
      if (!r.tamam) {
        this.ipucuGoster(`<b>Seçilemez</b> · ${esc(r.neden)}`, e.point.x, e.point.y, true, 2600);
        if (!this.sahiplik?.hucreler.has(id)) this.kartHucre = null;
      } else if (!this.secim.var(id) && this.secim.boyut !== 1) this.kartHucre = null;
      this.secimCiz();
      this.kartCiz();
      return;
    }
    const f = this.harita.queryRenderedFeatures(e.point, { layers: ["ilce-dolgu"] })[0];
    const k = f?.properties["kimlik"] as string | undefined;
    if (!k) return;
    if (k !== this.ilceKimlik) {
      this.s.ilceSec(k);
      return;
    }
    // Seçili ilçede tık: ızgara varsa tıklanan yere arsa düzeyine in
    if (this.izgara) this.harita.easeTo({ center: e.lngLat, zoom: 16.6, duration: hareketAzMi() ? 0 : 700 });
    else this.ipucuGoster("Bu ilçenin arsa ızgarası henüz yok", e.point.x, e.point.y, true, 2600);
  }

  private async satinAl(): Promise<void> {
    const sayi = this.sayilar();
    if (!sayi || !this.ilceKimlik || this.satinAliniyor) return;
    const o = satinAlmaOzeti(this.secim.liste, this.sinifAl, sayi, this.benimKume());
    if (o.engeller.length || !o.sinif) return;
    this.satinAliniyor = true;
    this.altCiz();
    const ilce = this.ilceKimlik;
    try {
      const r = await this.baglanti.parselAl({ tur: "parsel_al", ilce, hucreler: this.secim.liste, sinif: o.sinif });
      if (r.tamam) {
        bildir(`Parsel satın alındı: ${fmt(r.hucreler.length)} hücre, ${paraMili(r.toplamMili, "yukari")}.`, "tamam");
        this.secim.temizle();
        this.kartHucre = r.hucreler[0] ?? null;
        const sh = await this.baglanti.sahiplikAl(ilce);
        if (ilce === this.ilceKimlik) {
          this.sahiplik = sh;
          if (sh) this.tumSahiplik.set(ilce, sh);
          this.sahiplikCiz();
        }
      } else bildir(`Olmadı: ${r.mesaj}`, "hata");
    } catch (e) {
      bildir(`Olmadı: ${e instanceof Error ? e.message : String(e)}`, "hata");
    } finally {
      this.satinAliniyor = false;
      this.secimCiz();
      this.kartCiz();
    }
  }

  /** Sahipliği yeniden al ve çiz (ör. sokak yürüyüşünde satın alma sonrası haritaya dönünce). */
  async sahiplikYenile(): Promise<void> {
    const ilce = this.ilceKimlik;
    if (!ilce || !this.izgara) return;
    const sh = await this.baglanti.sahiplikAl(ilce);
    if (ilce !== this.ilceKimlik) return;
    this.sahiplik = sh;
    if (sh) this.tumSahiplik.set(ilce, sh);
    this.sahiplikCiz();
    this.kartCiz();
    this.arsaVurguCiz();
    this.altCiz();
    this.yerlesim?.tazele();
    this.olcek?.tazele();
    this.durumYaz();
  }

  /** Sınama kancası: ilçe ızgara çerçevesi (Playwright hücre seçimi için). */
  izgaraCercevesi(): Sinir | null {
    return this.izgara ? izgaraSiniri(this.izgara) : null;
  }

  /**
   * Sınama kancası: görünüm merkezine en yakın, `n` hücrelik yatay sıra hâlinde seçilebilir ve aynı sınıftan
   * hücreler; ekran (harita kabı) koordinatlarıyla. Bulunamazsa null.
   */
  sinamaUygunSira(n: number): { id: HucreId; x: number; y: number }[] | null {
    const b = this.secimBaglami();
    if (!b) return null;
    const m = this.harita.getCenter();
    const c = noktadanHucre(m.lng, m.lat);
    for (let r = 0; r < 60; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x0 = c.x + dx;
          const y = c.y + dy;
          const sinif = arsaSinifi(durumAl(b.izgara, x0, y));
          let tamam = true;
          for (let i = 0; i < n && tamam; i++) tamam = !secilemezNedeni(b, x0 + i, y) && arsaSinifi(durumAl(b.izgara, x0 + i, y)) === sinif;
          if (!tamam) continue;
          return Array.from({ length: n }, (_, i) => {
            const p = this.harita.project(hucreMerkezi(x0 + i, y));
            return { id: hucreId(x0 + i, y), x: p.x, y: p.y };
          });
        }
    return null;
  }

  /** Sınama kancası: görünüm merkezine en yakın satın alınamaz hücre (yol/su/askerî) ve ekran konumu. */
  sinamaEngelli(): { id: HucreId; x: number; y: number; neden: string } | null {
    if (!this.izgara) return null;
    const m = this.harita.getCenter();
    const c = noktadanHucre(m.lng, m.lat);
    for (let r = 0; r < 60; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const d = durumAl(this.izgara, c.x + dx, c.y + dy);
          const neden = engelNedeni(d);
          if (!neden || !(d & 1)) continue;
          const p = this.harita.project(hucreMerkezi(c.x + dx, c.y + dy));
          return { id: hucreId(c.x + dx, c.y + dy), x: p.x, y: p.y, neden };
        }
    return null;
  }

  /** Sınama kancası: harita nesnesi. */
  get ml(): MlHarita {
    return this.harita;
  }

  /** Sınama kancası: seçili hücreler. */
  seciliHucreler(): HucreId[] {
    return this.secim.liste;
  }
}

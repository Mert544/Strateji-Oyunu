/**
 * MapLibre görünümü (L1 il, L2 ilçe, L3 arsa). Bu modül ve maplibre-gl + pmtiles yalnız `import()` ile yüklenir.
 *
 * Temel harita yok: düz sakin zemin + il/ilçe sınırları (OSM, ODbL). İsteğe bağlı Protomaps altlığı
 * `?altlik=<pmtiles url>` ile açılır. L3'te arsa ızgarası S6'nın `seritler` PMTiles katmanından çizilir
 * (yalnız z15 karoları; MapLibre büyütür). Tıklanan hücre istemcide hesaplanır, uygunluk BHI1'den okunur.
 * Çizim durağandır: harita yalnız etkileşimde yeniden çizilir (MapLibre boşta 0 fps), sürekli animasyon yok.
 */
import maplibregl from "maplibre-gl";
import type { GeoJSONSource, LngLatBoundsLike, Map as MlHarita, MapMouseEvent, StyleSpecification } from "maplibre-gl";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css?inline";
import { Protocol } from "pmtiles";
import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import type { ArsaSinifi, HucreId } from "@bolge/cekirdek";
import icerikHam from "../../../veri/icerik/icerik.json";
import parametreHam from "../../../veri/icerik/parametreler.json";
import { bildir } from "../arayuz/bildirim";
import { esc, fmt, simSaatMetni, yuzde } from "../arayuz/bicim";
import { icerikTablosu } from "../komut/tablo";
import { arsaKenarlari, arsalariTuret, arsaSinirlari, arsaSiniflari, hucredenArsa, kamuAyari, kamuHucreleri, onerilenArsa, sinifGruplari } from "./arsa";
import type { Arsa, ArsaKumesi, ArsaTercihi } from "./arsa";
import { SahteBaglanti } from "./baglanti";
import type { IlceSahipligi, MulkBaglantisi } from "./baglanti";
import type { Duzey, HaritaDurumu } from "./denetci";
import { arsaSinifi, hucreFiyati, ilceTavani, parselFiyatiMili, SINIF_ADI, satinAlmaOzeti } from "./fiyat";
import type { IlceSayilari } from "./fiyat";
import { parselZinciri } from "./zincir";
import { ASAMA_ADI, yapiAsamasi, yapiKatalogu } from "./yapi";
import type { YapiTanimi } from "./yapi";
import { YerlesimKipi } from "./yerlesim";
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
import { ilceleriYukle, izgaraYukle, OSM_ATIF_HTML, seritUrl } from "./veri";
import type { Hiyerarsi, SinirKatmani } from "./veri";

export { baglantiKur } from "./baglanti-kur";
export { yerlesAc } from "../arayuz/yerles-ekrani";

export interface GorunumSecenekleri {
  hiyerarsi: Hiyerarsi;
  iller: SinirKatmani;
  /** Mülk bağdaştırıcısı; verilmezse bellek içi sahte sunucu (S4 gelene dek). */
  baglanti?: MulkBaglantisi;
  ilceSec: (ilce: string) => void;
  duzeyDegisti: (d: Duzey) => void;
  /** L4: hücre merkezinde sokak yürüyüşünü aç (parsel kartındaki "Sokakta yürü" düğmesi). */
  yuruAc?: (boylam: number, enlem: number) => void;
}

/** L3 (arsa ızgarası) bu yakınlaşmadan itibaren: seritler katmanı yalnız z15 karosu içerir. */
export const L3_ZOOM = 15;
/** Hücre kenar çizgileri bu yakınlaşmadan itibaren (hücre ~16 px). */
const IZGARA_CIZGI_ZOOM = 16;

const BOS: FeatureCollection = { type: "FeatureCollection", features: [] };

function renk(ad: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(ad).trim() || "#888";
}

function hareketAzMi(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hucreCokgeni(x: number, y: number, oz: Record<string, unknown> = {}): Feature<Polygon> {
  const [b, g, d, k] = hucreSiniri(x, y);
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
  private hucreAraci = false;
  private altGizli = false;
  private katalog: YapiTanimi[];
  private yerlesim: YerlesimKipi | null = null;
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
    this.katalog = yapiKatalogu(tablo);
    this.baglanti =
      s.baglanti ??
      new SahteBaglanti({
        izgaraAl: izgaraYukle,
        gecikme: 120,
        hazineMili: 50_000_000,
        yapiBilgisi: (tur) => {
          const y = this.katalog.find((k) => k.id === tur);
          return y ? { yuva: y.yuva, paraMili: y.paraMili, sureSaat: y.sureSaat } : null;
        },
      });
    if (!cssEklendi) {
      const st = document.createElement("style");
      st.textContent = maplibreCss;
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
        this.arsaVurguCiz();
        this.altCiz();
      },
    });
    this.yerlesim = y;
    void this.yuklendi.then(() => y.kur());
  }

  // --- stil ------------------------------------------------------------------------------------------

  private stil(): StyleSpecification {
    const altlik = new URLSearchParams(location.search).get("altlik");
    const st: StyleSpecification = {
      version: 8,
      sources: {
        iller: { type: "geojson", data: this.s.iller.fc, promoteId: "kimlik" },
        ilceler: { type: "geojson", data: BOS, promoteId: "kimlik" },
        sahiplik: { type: "geojson", data: BOS },
        secim: { type: "geojson", data: BOS },
        izgara: { type: "geojson", data: BOS },
        dikdortgen: { type: "geojson", data: BOS },
        arsalar: { type: "geojson", data: BOS },
        "arsa-kamu": { type: "geojson", data: BOS },
        "arsa-vurgu": { type: "geojson", data: BOS },
        yapilar: { type: "geojson", data: BOS },
      },
      layers: [{ id: "zemin", type: "background", paint: { "background-color": renk("--harita-zemin") } }],
    };
    st.layers.push(
      { id: "il-dolgu", type: "fill", source: "iller", paint: { "fill-color": renk("--harita-kara") } },
      { id: "ilce-dolgu", type: "fill", source: "ilceler", paint: { "fill-color": renk("--harita-ilce-vurgu"), "fill-opacity": ["case", ["boolean", ["feature-state", "uzerinde"], false], 1, 0] } },
    );
    if (altlik) {
      // İsteğe bağlı Protomaps altlığı (şema v4): yalnız su, yol ve bina; etiket yok (glyph gerekmez).
      st.sources["altlik"] = { type: "vector", url: "pmtiles://" + new URL(altlik, location.href).href };
      st.layers.push(
        { id: "altlik-su", type: "fill", source: "altlik", "source-layer": "water", paint: { "fill-color": renk("--harita-su") } },
        { id: "altlik-yol", type: "line", source: "altlik", "source-layer": "roads", minzoom: 11, paint: { "line-color": renk("--harita-il-cizgi"), "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 17, 3] } },
        { id: "altlik-bina", type: "fill", source: "altlik", "source-layer": "buildings", minzoom: 14, paint: { "fill-color": renk("--harita-engel"), "fill-opacity": 0.35 } },
      );
    }
    st.layers.push(
      { id: "il-cizgi", type: "line", source: "iller", paint: { "line-color": renk("--harita-il-cizgi"), "line-width": 1 } },
      { id: "ilce-cizgi", type: "line", source: "ilceler", paint: { "line-color": renk("--harita-ilce-cizgi"), "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.6, 12, 1.2] } },
      { id: "izgara-cizgi", type: "line", source: "izgara", minzoom: IZGARA_CIZGI_ZOOM, paint: { "line-color": renk("--harita-izgara"), "line-width": 0.6 } },
      { id: "sahiplik-dolgu", type: "fill", source: "sahiplik", minzoom: 13, paint: { "fill-color": ["case", ["==", ["get", "ben"], 1], renk("--harita-ben"), renk("--harita-baskasi")], "fill-opacity": ["case", ["==", ["get", "ben"], 1], 0.45, 0] } },
      { id: "sahiplik-cizgi", type: "line", source: "sahiplik", minzoom: 13, paint: { "line-color": ["case", ["==", ["get", "ben"], 1], renk("--harita-ben"), renk("--harita-baskasi")], "line-width": 1.2 } },
      { id: "arsa-kamu-dolgu", type: "fill", source: "arsa-kamu", minzoom: L3_ZOOM - 0.2, paint: { "fill-color": renk("--harita-kamu"), "fill-opacity": 0.55 } },
      { id: "arsa-cizgi", type: "line", source: "arsalar", minzoom: L3_ZOOM - 0.2, paint: { "line-color": renk("--harita-arsa"), "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.8, 18, 1.8] } },
      { id: "yapi-dolgu", type: "fill", source: "yapilar", minzoom: 13, paint: { "fill-color": ["match", ["get", "a"], 0, renk("--harita-asama0"), 1, renk("--harita-asama1"), 2, renk("--harita-asama2"), renk("--harita-asama3")], "fill-opacity": 0.82 } },
      { id: "yapi-cizgi", type: "line", source: "yapilar", minzoom: 13, paint: { "line-color": renk("--harita-yapi-cizgi"), "line-width": 1.6 } },
      { id: "arsa-vurgu-dolgu", type: "fill", source: "arsa-vurgu", paint: { "fill-color": renk("--harita-secim"), "fill-opacity": ["case", ["==", ["get", "s"], 1], 0.34, 0.2] } },
      { id: "arsa-vurgu-cizgi", type: "line", source: "arsa-vurgu", paint: { "line-color": renk("--harita-secim"), "line-width": ["case", ["==", ["get", "s"], 1], 3, 2] } },
      { id: "secim-dolgu", type: "fill", source: "secim", paint: { "fill-color": renk("--harita-secim"), "fill-opacity": 0.35 } },
      { id: "secim-cizgi", type: "line", source: "secim", paint: { "line-color": renk("--harita-secim"), "line-width": 2 } },
      { id: "dikdortgen-cizgi", type: "line", source: "dikdortgen", paint: { "line-color": renk("--harita-secim"), "line-width": 1.5, "line-dasharray": [2, 2] } },
      { id: "ilce-secili", type: "line", source: "ilceler", filter: ["==", ["get", "kimlik"], ""], paint: { "line-color": renk("--harita-secili-cizgi"), "line-width": 2.2 } },
      { id: "il-secili", type: "line", source: "iller", filter: ["==", ["get", "kimlik"], ""], paint: { "line-color": renk("--harita-secili-cizgi"), "line-width": 2 } },
    );
    return st;
  }

  /** Satın alınamaz hücreler için taralı desen (8×8, tema rengiyle). */
  private desenEkle(): void {
    const c = renk("--harita-engel");
    const m = /^#([0-9a-f]{6})$/i.exec(c);
    const v = m ? parseInt(m[1]!, 16) : 0x9aa0a8;
    const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    const data = new Uint8Array(8 * 8 * 4);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = (y * 8 + x) * 4;
        const cizgi = (x + y) % 8 < 2;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = cizgi ? 120 : 28;
      }
    if (this.harita.hasImage("tarali")) this.harita.updateImage("tarali", { width: 8, height: 8, data });
    else this.harita.addImage("tarali", { width: 8, height: 8, data });
  }

  private seritKatmanlari(): void {
    const ilce = this.ilceKimlik;
    const url = ilce ? seritUrl(ilce) : null;
    if (!url || this.seritYuklu === url) return;
    const h = this.harita;
    for (const id of ["serit-dolgu", "serit-engel"]) if (h.getLayer(id)) h.removeLayer(id);
    if (h.getSource("seritler")) h.removeSource("seritler");
    h.addSource("seritler", { type: "vector", url: "pmtiles://" + url });
    // Altlık varsa şeritler onun altında kalır (yollar ve binalar ızgaranın üstünde okunur)
    const once = h.getLayer("altlik-su") ? "altlik-su" : "izgara-cizgi";
    // Su biti: e = (durum & (yol|su|askerî|bina)) >> 1 -> su = ⌊e/2⌋ mod 2 (ifadelerde bit işlemi yok)
    const su: maplibregl.ExpressionSpecification = ["==", ["%", ["floor", ["/", ["get", "e"], 2]], 2], 1];
    h.addLayer(
      {
        id: "serit-dolgu",
        type: "fill",
        source: "seritler",
        "source-layer": "seritler",
        minzoom: L3_ZOOM - 0.01,
        paint: { "fill-color": this.seritRengi(su), "fill-antialias": false },
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
        paint: { "fill-pattern": "tarali" },
      },
      once,
    );
    this.seritYuklu = url;
  }

  private seritRengi(su: maplibregl.ExpressionSpecification): maplibregl.ExpressionSpecification | string {
    if (this.sahiplikAcik) return ["case", su, renk("--harita-su"), renk("--harita-mercek-soluk")];
    return [
      "case",
      su,
      renk("--harita-su"),
      ["match", ["get", "s"], 1, renk("--harita-tarla"), 2, renk("--harita-sanayi"), 3, renk("--harita-konut"), 4, renk("--harita-orman"), 5, renk("--harita-yapili"), renk("--harita-diger")],
    ];
  }

  temaUygula(): void {
    void this.yuklendi.then(() => {
      const h = this.harita;
      const ayar = (l: string, p: string, v: unknown): void => {
        if (h.getLayer(l)) h.setPaintProperty(l, p, v);
      };
      ayar("zemin", "background-color", renk("--harita-zemin"));
      ayar("il-dolgu", "fill-color", renk("--harita-kara"));
      ayar("ilce-dolgu", "fill-color", renk("--harita-ilce-vurgu"));
      ayar("il-cizgi", "line-color", renk("--harita-il-cizgi"));
      ayar("ilce-cizgi", "line-color", renk("--harita-ilce-cizgi"));
      ayar("izgara-cizgi", "line-color", renk("--harita-izgara"));
      ayar("ilce-secili", "line-color", renk("--harita-secili-cizgi"));
      ayar("il-secili", "line-color", renk("--harita-secili-cizgi"));
      ayar("arsa-cizgi", "line-color", renk("--harita-arsa"));
      ayar("arsa-kamu-dolgu", "fill-color", renk("--harita-kamu"));
      ayar("yapi-dolgu", "fill-color", ["match", ["get", "a"], 0, renk("--harita-asama0"), 1, renk("--harita-asama1"), 2, renk("--harita-asama2"), renk("--harita-asama3")]);
      ayar("yapi-cizgi", "line-color", renk("--harita-yapi-cizgi"));
      ayar("arsa-vurgu-dolgu", "fill-color", renk("--harita-secim"));
      ayar("arsa-vurgu-cizgi", "line-color", renk("--harita-secim"));
      this.yerlesim?.temaUygula();
      ayar("secim-dolgu", "fill-color", renk("--harita-secim"));
      ayar("secim-cizgi", "line-color", renk("--harita-secim"));
      ayar("dikdortgen-cizgi", "line-color", renk("--harita-secim"));
      this.sahiplikBoya();
      this.desenEkle();
    });
  }

  private sahiplikBoya(): void {
    const h = this.harita;
    if (!h.getLayer("sahiplik-dolgu")) return;
    const ben = renk("--harita-ben");
    const diger = renk("--harita-baskasi");
    h.setPaintProperty("sahiplik-dolgu", "fill-color", ["case", ["==", ["get", "ben"], 1], ben, diger]);
    h.setPaintProperty("sahiplik-dolgu", "fill-opacity", ["case", ["==", ["get", "ben"], 1], this.sahiplikAcik ? 0.9 : 0.45, this.sahiplikAcik ? 0.55 : 0]);
    h.setPaintProperty("sahiplik-cizgi", "line-color", ["case", ["==", ["get", "ben"], 1], ben, diger]);
    if (h.getLayer("serit-dolgu")) h.setPaintProperty("serit-dolgu", "fill-color", this.seritRengi(["==", ["%", ["floor", ["/", ["get", "e"], 2]], 2], 1]));
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
    return this.secim.boyut > 0 || this.arsaSecili !== null;
  }

  secimTemizle(): void {
    this.secim.temizle();
    this.arsaSecili = null;
    this.arsaVurguCiz();
    this.secimCiz();
  }

  /** Klavye: yapı yerleşiminde R, Enter, Esc. İşlendiyse true. */
  tusIsle(e: KeyboardEvent): boolean {
    return this.yerlesim?.tus(e) ?? false;
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
    this.yerlesim?.menuAc(false);
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
      h.setFilter("il-secili", ["==", ["get", "kimlik"], hedef.il]);
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
      this.yerlesim?.iptal();
      h.setFilter("ilce-secili", ["==", ["get", "kimlik"], hedef.ilce ?? ""]);
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
      return;
    }
    const ben = this.baglanti.ben.id;
    const f: Feature<Polygon>[] = [];
    for (const [id, h] of s.hucreler) {
      const c = idCoz(id);
      if (c) f.push(hucreCokgeni(c.x, c.y, { ben: h.sahip === ben ? 1 : 0, sahip: h.sahip }));
    }
    src.setData({ type: "FeatureCollection", features: f });
    this.yapilariCiz();
  }

  private secimCiz(): void {
    const src = this.harita.getSource("secim") as GeoJSONSource | undefined;
    if (src) {
      const f: Feature<Polygon>[] = [];
      for (const id of this.secim.liste) {
        const c = idCoz(id);
        if (c) f.push(hucreCokgeni(c.x, c.y));
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
    return { uygun: s.uygun, satilmis: s.satilmis, benim };
  }

  private benimKume(): Set<HucreId> {
    const k = new Set<HucreId>();
    for (const [id, h] of this.sahiplik?.hucreler ?? []) if (h.sahip === this.baglanti.ben.id) k.add(id);
    return k;
  }

  /** Hücre kamu arsasında mı? (hazır arsa kümesi türetilmediyse hayır) */
  private kamuHucre = (id: HucreId): boolean => {
    const c = idCoz(id);
    return !!c && !!this.arsaK && hucredenArsa(this.arsaK, c.x, c.y)?.kamu === true;
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
    const ilceAd = this.s.hiyerarsi.ilceler.get(this.ilceKimlik)?.ad ?? "";
    const coklu = `<button type="button" class="yalniz-dokunma" data-eylem="coklu" aria-pressed="${this.cokluSecim}">Çoklu seç</button>`;
    const aracDugme = `<button type="button" class="yalniz-dokunma" data-eylem="hucre-araci" aria-pressed="${this.hucreAraci}" title="Hücre hücre seçim (ileri düzey)">Hücre aracı</button>`;
    const yapiDugme = this.yerlesim ? `<button type="button" data-eylem="yapi-menu">Yapı kur</button>` : "";
    // 1) Hücre seçimi (ileri düzey araç: Shift ya da "Hücre aracı")
    if (this.secim.boyut > 0) return this.hucreBari(sayi, ilceAd, coklu, aracDugme);
    // 2) Hazır arsa
    const a = this.arsaSecili;
    if (a) {
      const d = this.arsaDurumu(a);
      const siniflar = arsaSiniflari(a)
        .map(([k, n]) => `${SINIF_ADI[k]}${arsaSiniflari(a).length > 1 ? ` ${fmt(n)}` : ""}`)
        .join(" · ");
      if (d.durum === "kamu") {
        this.alt.innerHTML = `
          <span class="alt-sayi"><small>Kamu arsası</small><b>${fmt(a.hucreler.length)} hücre</b></span>
          <span class="alt-ipucu">Meydan, pazar yeri, muhtarlık gibi ortak kullanım için ayrılmıştır: satışa ve yapı yerleşimine kapalı.</span>
          <div class="alt-dugmeler"><button type="button" data-eylem="temizle">Temizle</button></div>`;
      } else if (d.durum === "bos") {
        const o = this.arsaFiyati(a, sayi);
        const sinir = o.engel;
        this.alt.innerHTML = `
          <span class="alt-sayi"><small>Hazır arsa</small><b data-alan="arsa-hucre">${fmt(a.hucreler.length)} hücre</b></span>
          <span class="alt-sayi"><small>Sınıf</small><b data-alan="arsa-sinif">${esc(siniflar)}</b></span>
          <span class="alt-sayi alt-toplam"><small>Fiyat</small><b data-alan="arsa-toplam">${fmt(Math.ceil(o.mili / 1000))} ₺</b></span>
          <span class="alt-sayi"><small>${esc(ilceAd)} payın</small><b>${fmt(o.benimSonra)} / ${fmt(ilceTavani(sayi.uygun))}</b></span>
          <div class="alt-dugmeler">${yapiDugme}<button type="button" data-eylem="temizle">Temizle</button><button type="button" class="birincil" data-eylem="arsa-al" ${sinir || this.satinAliniyor ? "disabled" : ""}>Satın al</button></div>
          <ul class="alt-uyari">${sinir ? `<li>${esc(sinir)}</li>` : ""}</ul>`;
      } else if (d.durum === "benim") {
        this.alt.innerHTML = `
          <span class="alt-sayi"><small>Senin arsan</small><b>${fmt(a.hucreler.length)} hücre</b></span>
          <span class="alt-sayi"><small>Sınıf</small><b>${esc(siniflar)}</b></span>
          <span class="alt-ipucu">Üzerine yapı kurmak için “Yapı kur”.</span>
          <div class="alt-dugmeler">${yapiDugme}<button type="button" data-eylem="temizle">Temizle</button></div>`;
      } else {
        this.alt.innerHTML = `
          <span class="alt-sayi"><small>Hazır arsa</small><b>${fmt(a.hucreler.length)} hücre</b></span>
          <span class="alt-ipucu">${d.durum === "kismen" ? "Bu arsanın bir kısmı satılmış; kalan hücreleri “Hücre aracı” (Shift) ile alabilirsin." : `Bu arsa ${esc(d.sahipler.join(", "))} tarafından alınmış.`}</span>
          <div class="alt-dugmeler">${aracDugme}<button type="button" data-eylem="temizle">Temizle</button></div>`;
      }
      return;
    }
    // 3) Boşta
    const hazirlaniyor = this.izgara && !this.arsaK ? " Arsalar hazırlanıyor…" : "";
    const ipucu = window.matchMedia("(pointer: coarse)").matches ? "Bir hazır arsaya dokun" : "Bir hazır arsaya tıkla";
    this.alt.innerHTML = `<span class="alt-ipucu">${ipucu} ya da “Yapı kur” ile yapıyı seçip yerleştir.${hazirlaniyor}</span>
      <span class="alt-sayi"><small>${esc(ilceAd)} payın</small><b>${fmt(sayi.benim)} / ${fmt(ilceTavani(sayi.uygun))}</b></span>
      <div class="alt-dugmeler">${yapiDugme}${aracDugme}</div>`;
  }

  private hucreBari(sayi: IlceSayilari, ilceAd: string, coklu: string, aracDugme: string): void {
    const o = satinAlmaOzeti(this.secim.liste, this.sinifAl, sayi, this.benimKume());
    const sinifMetni = o.sinif
      ? SINIF_ADI[o.sinif]
      : (Object.entries(o.siniflar) as [ArsaSinifi, number][]).map(([k, n]) => `${SINIF_ADI[k]} ${fmt(n)}`).join(" · ");
    const uyari = o.engeller.map((m) => `<li>${esc(m)}</li>`).join("");
    this.alt.innerHTML = `
      <span class="alt-sayi"><small>Seçili</small><b data-alan="sayi">${fmt(o.sayi)} hücre</b></span>
      <span class="alt-sayi"><small>Sınıf</small><b data-alan="sinif">${esc(sinifMetni)}</b></span>
      <span class="alt-sayi"><small>Hücre fiyatı</small><b>${o.hucreFiyati ? `${fmt(o.hucreFiyati)} ₺` : "—"}</b></span>
      <span class="alt-sayi alt-toplam"><small>Toplam</small><b data-alan="toplam">${fmt(o.toplam)} ₺</b></span>
      <span class="alt-sayi"><small>${esc(ilceAd)} payın</small><b>${fmt(o.sinir.sonra)} / ${fmt(o.sinir.tavan)}</b></span>
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
      ? `<span class="sahip-isaret" style="background:${ben ? "var(--harita-ben)" : "var(--harita-baskasi)"}"></span>${esc(ben ? "Sen" : this.baglanti.oyuncuAdi(sahip.sahip))}`
      : neden
        ? "Satılık değil"
        : "Sahipsiz";
    const deger = sahip ? (sahip.degerMili > 0 ? `${fmt(sahip.degerMili / 1000)} ₺` : "—") : neden ? "—" : sayi ? `${fmt(hucreFiyati(sinif, sayi.satilmis, sayi.uygun))} ₺` : "—";
    const doluluk = this.sahiplik && this.sahiplik.uygun > 0 ? yuzde((100 * this.sahiplik.satilmis) / this.sahiplik.uygun, 2) : "—";
    const ilceAd = this.ilceKimlik ? (this.s.hiyerarsi.ilceler.get(this.ilceKimlik)?.ad ?? "") : "";
    this.kart.hidden = false;
    this.kart.innerHTML = `
      <h3><span>Parsel ${esc(kisaAd(id))}</span><button type="button" data-eylem="kart-kapat" aria-label="Kartı kapat">×</button></h3>
      <dl>
        <dt>Sahip</dt><dd data-alan="sahip">${sahipMetni}</dd>
        <dt>Sınıf</dt><dd data-alan="sinif">${neden ? esc(neden) : `${SINIF_ADI[sinif]} · ${ARAZI_ADLARI[durumSinifi(d)] ?? ""}`}</dd>
        <dt>${sahip ? "Değer" : "Fiyat"}</dt><dd data-alan="deger">${deger}</dd>
        <dt>${esc(ilceAd)}</dt><dd>${doluluk} dolu</dd>
      </dl>${this.s.yuruAc ? `<button type="button" class="kart-yuru" data-eylem="yuru" title="Sokak düzeyinde yürü (L4)">Sokakta yürü</button>` : ""}`;
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
        const k = arsalariTuret(iz, kamuAyari(location.search));
        this.arsaOnbellek.set(ilce, k);
        this.arsaK = k;
        this.arsaCiz();
        this.altCiz();
        coz(k);
      }, 0);
    });
    return this.arsaHazir;
  }

  /** Arsanın satış durumu (sahiplikten). */
  private arsaDurumu(a: Arsa): { durum: "bos" | "benim" | "kismen" | "baskasi" | "kamu"; sahipler: string[] } {
    if (a.kamu) return { durum: "kamu", sahipler: [] };
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

  /** Arsanın toplam fiyatı (çekirdekle aynı artımlı formül; sınıf başına adım) ve satın almayı engelleyen neden. */
  private arsaFiyati(a: Arsa, sayi: IlceSayilari): { mili: number; adimlar: Array<{ sinif: ArsaSinifi; hucreler: HucreId[]; mili: number }>; engel: string | null; benimSonra: number } {
    const adimlar: Array<{ sinif: ArsaSinifi; hucreler: HucreId[]; mili: number }> = [];
    let satilmis = sayi.satilmis;
    for (const g of sinifGruplari(a, this.sinifAl)) {
      adimlar.push({ sinif: g.sinif, hucreler: g.hucreler, mili: parselFiyatiMili(g.sinif, satilmis, sayi.uygun, g.hucreler.length) });
      satilmis += g.hucreler.length;
    }
    const mili = adimlar.reduce((t, x) => t + x.mili, 0);
    const sd = sayi.benim + a.hucreler.length;
    const tavan = ilceTavani(sayi.uygun);
    let engel: string | null = null;
    if (a.kamu) engel = "Kamu arsası: satışa kapalı";
    else if (sd > 72) engel = "İlçede en çok 72 hücren olabilir";
    else if (sd > tavan) engel = `İlçenin en çok %25'i senin olabilir (${fmt(tavan)} hücre)`;
    else {
      const hz = this.baglanti.ozet?.()?.hazineMili ?? null;
      if (hz !== null && mili > hz) engel = `Hazinede yeterli para yok (gereken ${fmt(Math.ceil(mili / 1000))} ₺)`;
    }
    return { mili, adimlar, engel, benimSonra: sd };
  }

  /** Görünür kutudaki arsa sınırları (z ≥ 14,8). */
  private arsaCiz(): void {
    const src = this.harita.getSource("arsalar") as GeoJSONSource | undefined;
    if (!src) return;
    const k = this.arsaK;
    if (!k || this.harita.getZoom() < L3_ZOOM - 0.2) {
      src.setData(BOS);
      return;
    }
    const b = this.harita.getBounds();
    const [xa, ya, xb, yb] = [Math.floor(boylamdanX(b.getWest())), Math.floor(enlemdenY(b.getNorth())), Math.ceil(boylamdanX(b.getEast())), Math.ceil(enlemdenY(b.getSouth()))];
    const kes = arsaSinirlari(k, xa, ya, xb, yb);
    src.setData(kes.length ? { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: kes } } : BOS);
    // Kamu arsaları: sakin nötr dolgu
    const kamu = this.harita.getSource("arsa-kamu") as GeoJSONSource | undefined;
    if (kamu) {
      const h = kes.length ? kamuHucreleri(k, xa, ya, xb, yb) : [];
      kamu.setData(h.length ? { type: "FeatureCollection", features: h.map(([x, y]) => hucreCokgeni(x, y)) } : BOS);
    }
  }

  private arsaVurguCiz(): void {
    const src = this.harita.getSource("arsa-vurgu") as GeoJSONSource | undefined;
    if (!src) return;
    // Yapı yerleşimi sürerken arsa vurgusu gizlenir (hayaletin mavi/turuncu renkleriyle karışmasın).
    if (this.yerlesim?.aktif) {
      src.setData(BOS);
      return;
    }
    const f: Feature[] = [];
    const ekle = (a: Arsa | null, secili: number): void => {
      if (!a) return;
      for (const id of a.hucreler) {
        const c = idCoz(id);
        if (c) f.push(hucreCokgeni(c.x, c.y, { s: secili }));
      }
      f.push({ type: "Feature", properties: { s: secili }, geometry: { type: "MultiLineString", coordinates: arsaKenarlari(a) } });
    };
    if (this.arsaUzerinde && this.arsaUzerinde !== this.arsaSecili) ekle(this.arsaUzerinde, 0);
    ekle(this.arsaSecili, 1);
    src.setData({ type: "FeatureCollection", features: f });
  }

  /** Hazır arsayı seçer (alt çubuk satın alma/yapı kurma için); null seçimi kaldırır. */
  arsaSec(a: Arsa | null): void {
    this.arsaSecili = a;
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
      if (!r.hata) bildir(`Arsa satın alındı: ${fmt(r.alinan.length)} hücre, ${fmt(r.odenenMili / 1000)} ₺.`, "tamam");
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
      this.hazineYazi.innerHTML = `${oz.hazineMili !== null ? `<span class="hz-etiket">Hazine</span> <b data-alan="hazine">${fmt(Math.floor(oz.hazineMili / 1000))} ₺</b>` : ""} <span class="hz-saat" data-alan="saat">${simSaatMetni(oz.simZamani / 3_600_000)}</span>${kopuk ? ` <span class="hz-kopuk">Bağlantı koptu, yeniden deneniyor…</span>` : ""}`;
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
  private yapilariCiz(): void {
    const src = this.harita.getSource("yapilar") as GeoJSONSource | undefined;
    if (!src) return;
    for (const m of this.yapiEtiketleri) m.remove();
    this.yapiEtiketleri = [];
    const yapilar = this.sahiplik?.yapilar ?? [];
    if (yapilar.length === 0) {
      src.setData(BOS);
      return;
    }
    const simdi = this.baglanti.ozet?.()?.simZamani ?? 0;
    const ben = this.baglanti.ben.id;
    const f: Feature<Polygon>[] = [];
    for (const y of yapilar) {
      const a = yapiAsamasi(y, simdi, (this.katalog.find((k) => k.id === y.tur)?.ilkGunSureSaat ?? 1) * 3_600_000);
      let sx = 0;
      let sy = 0;
      for (const id of y.hucreler) {
        const c = idCoz(id);
        if (!c) continue;
        f.push(hucreCokgeni(c.x, c.y, { a, ben: y.sahip === ben ? 1 : 0 }));
        sx += c.x + 0.5;
        sy += c.y + 0.5;
      }
      if (this.duzey < 3 || y.hucreler.length === 0) continue;
      const e = document.createElement("div");
      e.className = `yapi-etiket asama${a}${y.sahip === ben ? " benim" : ""}`;
      e.dataset["yapi"] = y.anahtar;
      e.setAttribute("aria-hidden", "true");
      const ad = y.tur ? (this.katalog.find((k) => k.id === y.tur)?.ad ?? y.tur) : "Yapı";
      e.textContent = a === 3 ? ad : `${ad} · ${y.bitis === undefined ? "İnşaat" : ASAMA_ADI[a]}`;
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
   * Yerleş ekranı varışı: ilçe açıkken önerilen hazır arsaya (açılış önerisine uyan, boş, merkeze yakın) uç ve seç; yapı
   * menüsünde açılış önerisinin yapısına "Önerilen" rozeti koy. Arsa bulunamazsa null.
   */
  async yerlesVarisi(acilis: ArsaTercihi, oneriYapi: string, merkez: [number, number]): Promise<Arsa | null> {
    this.oneriYapi(oneriYapi);
    const k = await this.arsalarHazir();
    if (!k || !this.ilceKimlik) return null;
    const sh = await this.baglanti.sahiplikAl(this.ilceKimlik);
    const c = noktadanHucre(merkez[0], merkez[1]);
    // Bütçe: hazinenin %40'ı (kalanı ilk yapıya); hazine bilinmiyorsa sınır yok. Arsa fiyatı çekirdek formülüyle.
    const hazine = this.baglanti.ozet?.()?.hazineMili ?? null;
    const sayi = this.sayilar();
    const butce = hazine !== null && sayi ? { fiyat: (x: Arsa) => this.arsaFiyati(x, sayi).mili, tavanMili: hazine * 0.4 } : undefined;
    const a = onerilenArsa(k, (id) => sh?.hucreler.has(id) ?? false, c.x, c.y, acilis, butce);
    if (a) await this.arsayaUc(a);
    return a;
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

  private hucreIpucu(x: number, y: number): { html: string; uyari: boolean } | null {
    if (!this.izgara) return null;
    const d = durumAl(this.izgara, x, y);
    const neden = engelNedeni(d);
    if (neden) return { html: `<b>Satın alınamaz</b> · ${esc(neden)}`, uyari: true };
    const id = hucreId(x, y);
    if (this.kamuHucre(id)) return { html: "<b>Kamu arsası</b> · satışa kapalı", uyari: false };
    const sh = this.sahiplik?.hucreler.get(id);
    if (sh) {
      const ben = sh.sahip === this.baglanti.ben.id;
      return { html: ben ? "<b>Senin parselin</b>" : `<b>Sahibi:</b> ${esc(this.baglanti.oyuncuAdi(sh.sahip))}`, uyari: !ben };
    }
    const sayi = this.sayilar();
    const sinif = arsaSinifi(d);
    const fiyat = sayi ? hucreFiyati(sinif, sayi.satilmis, sayi.uygun) : 0;
    return { html: `<b>${SINIF_ADI[sinif]}</b> · ${esc(ARAZI_ADLARI[durumSinifi(d)] ?? "")} · ${fmt(fiyat)} ₺`, uyari: false };
  }

  /** Hazır arsa üzerinde ipucu: hücre sayısı, sınıf, fiyat ya da durum. */
  private arsaIpucu(a: Arsa): { html: string; uyari: boolean } {
    const d = this.arsaDurumu(a);
    if (d.durum === "kamu") return { html: "<b>Kamu arsası</b> · meydan, pazar yeri, muhtarlık için · satışa kapalı", uyari: false };
    const sinif = arsaSiniflari(a).map(([k]) => SINIF_ADI[k]).join(" · ");
    const bas = `<b>Hazır arsa</b> · ${fmt(a.hucreler.length)} hücre · ${esc(sinif)}`;
    if (d.durum === "benim") return { html: `${bas} · <b>senin</b>`, uyari: false };
    if (d.durum === "baskasi") return { html: `${bas} · sahibi ${esc(d.sahipler.join(", "))}`, uyari: true };
    if (d.durum === "kismen") return { html: `${bas} · kısmen satılmış`, uyari: true };
    const sayi = this.sayilar();
    return { html: `${bas}${sayi ? ` · ${fmt(Math.ceil(this.arsaFiyati(a, sayi).mili / 1000))} ₺` : ""}`, uyari: false };
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
      } else if (ey === "yapi-menu") this.yerlesim?.menuAc(true);
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
        const neden = secilemezNedeni(b, c.x, c.y);
        if (neden && !this.sahiplik?.hucreler.has(id)) this.ipucuGoster(`<b>Seçilemez</b> · ${esc(neden)}`, e.point.x, e.point.y, true, 2600);
        else if (this.sahiplik?.hucreler.has(id)) {
          this.kartHucre = id;
          this.kartCiz();
        } else this.ipucuGoster("Bu hücre hazır arsaların dışında kaldı: tek hücre için Shift + tık (ya da “Hücre aracı”).", e.point.x, e.point.y, false, 3200);
        return;
      }
      this.arsaSecili = null;
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
    else this.ipucuGoster("Bu ilçenin arsa ızgarası henüz yok (örnek: Gebze)", e.point.x, e.point.y, true, 2600);
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
        bildir(`Parsel satın alındı: ${fmt(r.hucreler.length)} hücre, ${fmt(r.toplamMili / 1000)} ₺.`, "tamam");
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

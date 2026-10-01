/**
 * Harita stili (görsel kimlik §4): "Kâğıt ve Çini" kartografisi. Renkler tema belirteçlerinden (yalnız hex) okunur;
 * koyu tema yalnız farklı belirteç setidir. Saf: `renk(ad)` dışarıdan verilir (testte sabit tablo, tarayıcıda CSS).
 *
 * Katman sırası (aşağıdan yukarıya): deniz (zemin) → kıyı bandı (sığ su, bulanık) → komşu ülkeler → il karası →
 * [arsa mozaiği L3] → [isteğe bağlı Protomaps altlığı: arazi, su, bina, yol hiyerarşisi] → kıyı çizgisi, ilçe (kesik),
 * il (düz) sınırları → ızgara → kamu/sahiplik/arsa/yapı → odak örtüsü → vurgu ve seçim → seçili il/ilçe kenarı.
 * Büyük harf yok (MapLibre `text-transform`/`upcase` yerel dil bağımsız çalışır: "BILECIK" tuzağı).
 */
import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";

export type RenkOku = (ad: string) => string;
type Boya = Record<string, unknown>;

/** Arsa ızgarası (L3) bu yakınlaşmadan itibaren. */
export const L3_ZOOM = 15;
/** Hücre kenar çizgileri bu yakınlaşmadan itibaren (hücre ~16 px). */
export const IZGARA_CIZGI_ZOOM = 16;
/** Arsa mozaiğinin altına girdiği ilk çizgi katmanı (altlık yoksa). */
export const SERIT_ONCESI = "sinir-kiyi";

/**
 * Yol genişliği: Protomaps'in üstel 1,6 eğrisi. `ek` > 0 ise kasa (kenar) için z ≥ 13'te toplam +ek px (z ≤ 12'de eşit).
 * `zoom` ifadede yalnız en üstte olabildiğinden kasa ayrı dizi olarak üretilir.
 */
export function yolGenisligi(kademeler: ReadonlyArray<readonly [number, number]>, ek = 0): ExpressionSpecification {
  const d: number[] = [];
  for (const [z, w] of kademeler) d.push(z, Math.round((w + (z >= 13 ? ek : 0)) * 100) / 100);
  return ["interpolate", ["exponential", 1.6], ["zoom"], ...d] as unknown as ExpressionSpecification;
}

/** §4.4.1 yol hiyerarşisi (Protomaps `kind`): genişlik kademeleri, dolgu ve kasa belirteçleri. */
export const YOLLAR: ReadonlyArray<{ kind: string; min: number; kademe: ReadonlyArray<readonly [number, number]>; dolgu: string; kasa: string }> = [
  { kind: "minor_road", min: 13, kademe: [[13, 0.4], [14, 0.8], [16, 3], [18, 8]], dolgu: "--harita-yol-ara-dolgu", kasa: "--harita-yol-sokak-kasa" },
  { kind: "medium_road", min: 11, kademe: [[11, 0.3], [12, 0.5], [14, 1.6], [16, 4.5], [18, 11]], dolgu: "--harita-yol-ara-dolgu", kasa: "--harita-yol-ara-kasa" },
  { kind: "major_road", min: 9, kademe: [[9, 0.4], [10, 0.5], [12, 1.2], [14, 3], [16, 7], [18, 15]], dolgu: "--harita-yol-ana-dolgu", kasa: "--harita-yol-ana-kasa" },
  { kind: "highway", min: 6, kademe: [[6, 0.6], [7, 0.8], [10, 1.6], [12, 2.6], [14, 5], [16, 10], [18, 20]], dolgu: "--harita-yol-otoyol-dolgu", kasa: "--harita-yol-otoyol-kasa" },
];

const lin = (...d: number[]): ExpressionSpecification => ["interpolate", ["linear"], ["zoom"], ...d] as unknown as ExpressionSpecification;

/** Altlık (Protomaps v4 şeması) katmanları; yalnız `?altlik=` verildiğinde. */
export function altlikKatmanlari(r: RenkOku): LayerSpecification[] {
  const alan = (id: string, katman: string, turler: string[], renk: string, min = 6): LayerSpecification => ({
    id,
    type: "fill",
    source: "altlik",
    "source-layer": katman,
    minzoom: min,
    filter: ["in", ["get", "kind"], ["literal", turler]],
    paint: { "fill-color": r(renk), "fill-opacity": lin(min, 0, min + 3, 1) },
  });
  const l: LayerSpecification[] = [
    alan("altlik-orman", "landcover", ["forest", "wood"], "--harita-orman"),
    alan("altlik-tarim", "landcover", ["farmland"], "--harita-tarim"),
    alan("altlik-cayir", "landcover", ["grassland", "scrub"], "--harita-park-yesil"),
    alan("altlik-yerlesim", "landcover", ["urban_area"], "--harita-yerlesim"),
    alan("altlik-park", "landuse", ["park", "garden", "playground", "grass", "cemetery", "golf_course"], "--harita-park-yesil", 11),
    alan("altlik-sanayi", "landuse", ["industrial", "railway", "military"], "--harita-sanayi-alan", 11),
    alan("altlik-kum", "landuse", ["beach", "sand"], "--harita-kum-plaj", 11),
    alan("altlik-orman2", "landuse", ["forest", "wood", "nature_reserve"], "--harita-orman", 11),
    { id: "altlik-su", type: "fill", source: "altlik", "source-layer": "water", paint: { "fill-color": r("--harita-su") } },
    {
      id: "altlik-akarsu",
      type: "line",
      source: "altlik",
      "source-layer": "water",
      minzoom: 9,
      filter: ["in", ["get", "kind"], ["literal", ["river", "stream", "canal"]]],
      paint: { "line-color": r("--harita-su-derin"), "line-width": lin(9, 0.6, 14, 2.2) },
    },
    {
      id: "altlik-bina",
      type: "fill",
      source: "altlik",
      "source-layer": "buildings",
      minzoom: 14.5,
      paint: { "fill-color": r("--harita-bina"), "fill-opacity": lin(14.5, 0, 15.5, 1), "fill-outline-color": r("--harita-bina-kenar") },
    },
    {
      id: "altlik-patika",
      type: "line",
      source: "altlik",
      "source-layer": "roads",
      minzoom: 15,
      filter: ["==", ["get", "kind"], "path"],
      paint: { "line-color": r("--harita-patika"), "line-width": lin(15, 0.6, 16, 0.8, 18, 1.6), "line-dasharray": [2, 2] },
    },
    {
      id: "altlik-demiryolu",
      type: "line",
      source: "altlik",
      "source-layer": "roads",
      minzoom: 8,
      filter: ["==", ["get", "kind"], "rail"],
      paint: { "line-color": r("--harita-demiryolu"), "line-width": lin(8, 0.4, 16, 1.8), "line-dasharray": [3, 3], "line-opacity": 0.6 },
    },
  ];
  // Kasalar önce (tüm sınıflar), dolgular sonra: kavşaklarda kasa dolguyu kesmez.
  for (const y of YOLLAR)
    l.push({
      id: `altlik-yol-${y.kind}-kasa`,
      type: "line",
      source: "altlik",
      "source-layer": "roads",
      minzoom: y.min,
      filter: ["==", ["get", "kind"], y.kind],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": r(y.kasa), "line-width": yolGenisligi(y.kademe, 1.2) },
    });
  for (const y of YOLLAR)
    l.push({
      id: `altlik-yol-${y.kind}`,
      type: "line",
      source: "altlik",
      "source-layer": "roads",
      minzoom: y.min,
      filter: ["==", ["get", "kind"], y.kind],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": r(y.dolgu), "line-width": yolGenisligi(y.kademe) },
    });
  return l;
}

/** Zemin, kıyı bandı, komşu ülkeler ve il karası (arsa mozaiği ve altlık bunların üstüne gelir). */
export function zeminKatmanlari(r: RenkOku): LayerSpecification[] {
  return [
    { id: "zemin", type: "background", paint: { "background-color": r("--harita-su") } },
    {
      id: "kiyi-bandi",
      type: "line",
      source: "dunya",
      minzoom: 3,
      paint: { "line-color": r("--harita-sig-su-kiyi"), "line-width": lin(4, 4, 8, 12, 12, 22), "line-blur": lin(4, 3, 12, 10) },
    },
    {
      id: "kiyi-bandi-il",
      type: "line",
      source: "il-sinir",
      filter: ["==", ["get", "tur"], "dis"],
      paint: { "line-color": r("--harita-sig-su-kiyi"), "line-width": lin(4, 4, 8, 12, 12, 22, 16, 30), "line-blur": lin(4, 3, 12, 10, 16, 14) },
    },
    { id: "dis-kara", type: "fill", source: "dunya", paint: { "fill-color": r("--harita-dis-kara"), "fill-opacity": lin(9, 1, 11, 0.6) } },
    { id: "dis-kara-cizgi", type: "line", source: "dunya", paint: { "line-color": r("--harita-kiyi-cizgisi"), "line-width": lin(4, 0.5, 10, 0.9), "line-opacity": 0.75 } },
    { id: "il-dolgu", type: "fill", source: "iller", paint: { "fill-color": r("--harita-kara") } },
    {
      id: "ilce-dolgu",
      type: "fill",
      source: "ilceler",
      paint: { "fill-color": r("--murekkep"), "fill-opacity": ["case", ["boolean", ["feature-state", "uzerinde"], false], 0.05, 0] },
    },
  ];
}

/** Sınır hiyerarşisi desenle (§4.4.2): kıyı ince mavi-gri, il düz, ilçe kesik; ızgara. */
export function sinirKatmanlari(r: RenkOku): LayerSpecification[] {
  return [
    {
      id: SERIT_ONCESI,
      type: "line",
      source: "il-sinir",
      filter: ["==", ["get", "tur"], "dis"],
      paint: { "line-color": r("--harita-kiyi-cizgisi"), "line-width": lin(5, 0.6, 12, 1.2, 16, 1.6) },
    },
    {
      id: "sinir-ilce",
      type: "line",
      source: "ilce-sinir",
      minzoom: 7,
      filter: ["==", ["get", "tur"], "ic"],
      layout: { "line-join": "round" },
      paint: { "line-color": r("--harita-sinir-ilce"), "line-width": lin(8, 0.5, 12, 1, 15, 1.4), "line-dasharray": [4, 2] },
    },
    {
      id: "sinir-il",
      type: "line",
      source: "il-sinir",
      filter: ["==", ["get", "tur"], "ic"],
      layout: { "line-join": "round" },
      paint: { "line-color": r("--harita-sinir-il"), "line-width": lin(5, 0.8, 9, 1.2, 12, 1.6), "line-opacity": lin(13, 1, 14, 0.5) },
    },
    {
      id: "izgara-cizgi",
      type: "line",
      source: "izgara",
      minzoom: IZGARA_CIZGI_ZOOM,
      paint: { "line-color": r("--harita-izgara"), "line-width": 0.6, "line-opacity": Number(r("--harita-izgara-alfa")) || 0.18 },
    },
  ];
}

/** Sahiplik boyası (§3.7): Sen canlı, başkaları soluk; Sahiplik merceğinde başkaları tam renk + emblem kenarı. */
export function sahiplikBoyasi(r: RenkOku, mercek: boolean): { dolgu: Boya; cizgi: Boya } {
  const ton = (ek: string): ExpressionSpecification => {
    const m: unknown[] = ["match", ["get", "r"]];
    for (let i = 0; i < 12; i++) m.push(i, r(`--oyuncu-${i}${ek}`));
    m.push(r("--murekkep-3"));
    return m as ExpressionSpecification;
  };
  const ben = ["==", ["get", "ben"], 1];
  return {
    dolgu: {
      "fill-color": ["case", ben, r("--sen"), ton(mercek ? "" : "-soluk")],
      "fill-opacity": ["case", ben, mercek ? 0.5 : 0.42, mercek ? 0.5 : 0.55],
    },
    cizgi: {
      "line-color": ["case", ben, r("--sen"), ton(mercek ? "-kenar" : "-soluk")],
      "line-width": ["case", ben, 2, mercek ? 1.4 : 1],
      "line-opacity": ["case", ben, 1, mercek ? 1 : 0.8],
    },
  };
}

/** L3 arsa türü mozaiği (§4.3): su, tarla, sanayi, konut, orman, yapılı, diğer (= kara). Sahiplik merceğinde sakin. */
export function seritRengi(r: RenkOku, su: ExpressionSpecification, sahiplikMercegi: boolean): ExpressionSpecification | string {
  if (sahiplikMercegi) return ["case", su, r("--harita-su"), r("--harita-kara")] as ExpressionSpecification;
  return [
    "case",
    su,
    r("--harita-su"),
    ["match", ["get", "s"], 1, r("--arsa-tarla"), 2, r("--arsa-sanayi"), 3, r("--arsa-konut"), 4, r("--arsa-orman"), 5, r("--arsa-yapili"), r("--harita-kara")],
  ] as ExpressionSpecification;
}

/** Oyun katmanları: kamu, sahiplik, arsa sınırı, yapı, odak örtüsü, vurgu, seçim, seçili sınırlar. */
export function oyunKatmanlari(r: RenkOku, sahiplikMercegi: boolean): LayerSpecification[] {
  const sb = sahiplikBoyasi(r, sahiplikMercegi);
  return [
    // Kamu arsası: devlet tonu + seyrek nokta dokusu ("kamu-doku", gorunum.ts) + ince kenar; satılmaz, sakin
    { id: "arsa-kamu-dolgu", type: "fill", source: "arsa-kamu", minzoom: L3_ZOOM - 0.2, paint: { "fill-color": r("--katman-devlet-tint"), "fill-opacity": 0.9 } },
    { id: "arsa-kamu-doku", type: "fill", source: "arsa-kamu", minzoom: L3_ZOOM + 0.6, paint: { "fill-pattern": "kamu-doku", "fill-opacity": 0.8 } },
    {
      id: "arsa-kamu-cizgi",
      type: "line",
      source: "arsa-kamu",
      minzoom: L3_ZOOM - 0.2,
      layout: { "line-join": "miter" },
      paint: { "line-color": r("--katman-devlet"), "line-width": lin(15, 0.6, 18, 1.2), "line-opacity": 0.55 },
    },
    { id: "sahiplik-dolgu", type: "fill", source: "sahiplik", minzoom: 13, paint: sb.dolgu },
    { id: "sahiplik-cizgi", type: "line", source: "sahiplik", minzoom: 13, paint: sb.cizgi },
    {
      id: "arsa-cizgi",
      type: "line",
      source: "arsalar",
      minzoom: L3_ZOOM - 0.2,
      layout: { "line-join": "round" },
      paint: { "line-color": r("--murekkep-3"), "line-width": lin(15, 0.7, 18, 1.6), "line-opacity": 0.5 },
    },
    // Yapı: katman rengi (iş), aşamaya göre dolgu 0,25 / 0,45 / 0,65 / 1; inşaatta kesik, bitince düz kenar
    { id: "yapi-dolgu", type: "fill", source: "yapilar", minzoom: 13, paint: { "fill-color": ["get", "c"], "fill-opacity": ["match", ["get", "a"], 0, 0.25, 1, 0.45, 2, 0.65, 0.92] } },
    { id: "yapi-cizgi", type: "line", source: "yapilar", minzoom: 13, filter: [">=", ["get", "a"], 3], paint: { "line-color": r("--murekkep-2"), "line-width": 1.2, "line-opacity": 0.7 } },
    { id: "yapi-cizgi-insaat", type: "line", source: "yapilar", minzoom: 13, filter: ["<", ["get", "a"], 3], paint: { "line-color": r("--murekkep-2"), "line-width": 1.2, "line-dasharray": [2, 1.5] } },
    // Odak: seçili olmayan iller ve ilçeler kâğıt örtüyle soluklaşır
    { id: "ortu-il", type: "fill", source: "iller", filter: ["==", ["get", "kimlik"], "__yok__"], paint: { "fill-color": r("--harita-kara"), "fill-opacity": 0.55 } },
    { id: "ortu-ilce", type: "fill", source: "ilceler", filter: ["==", ["get", "kimlik"], "__yok__"], paint: { "fill-color": r("--harita-kara"), "fill-opacity": 0.45 } },
    // Hover ve seçim: nötr mürekkep (turuncu kalktı; Hardal oyuncu rengiyle karışmasın)
    { id: "arsa-vurgu-dolgu", type: "fill", source: "arsa-vurgu", paint: { "fill-color": r("--secim"), "fill-opacity": ["case", ["==", ["get", "s"], 1], 0.12, 0.07] } },
    {
      id: "arsa-vurgu-cizgi",
      type: "line",
      source: "arsa-vurgu",
      layout: { "line-join": "round" },
      paint: { "line-color": r("--secim"), "line-width": ["case", ["==", ["get", "s"], 1], 2.2, 1.5], "line-opacity": ["case", ["==", ["get", "s"], 1], 1, 0.6] },
    },
    { id: "secim-dolgu", type: "fill", source: "secim", paint: { "fill-color": r("--secim"), "fill-opacity": 0.12 } },
    { id: "secim-cizgi", type: "line", source: "secim", paint: { "line-color": r("--secim"), "line-width": 2 } },
    { id: "dikdortgen-cizgi", type: "line", source: "dikdortgen", paint: { "line-color": r("--secim"), "line-width": 1.5, "line-dasharray": [2, 2] } },
    { id: "ilce-secili", type: "line", source: "ilceler", filter: ["==", ["get", "kimlik"], ""], layout: { "line-join": "round" }, paint: { "line-color": r("--murekkep"), "line-width": lin(9, 1.4, 13, 1.8), "line-opacity": lin(12, 0.75, 16, 0.4) } },
    { id: "il-secili", type: "line", source: "iller", filter: ["==", ["get", "kimlik"], ""], layout: { "line-join": "round" }, paint: { "line-color": r("--murekkep"), "line-width": lin(5, 1.2, 10, 1.6), "line-opacity": lin(9, 0.7, 11, 0.35) } },
  ];
}

/** Bir katmanın boya özellikleri (tema değişince yeniden uygulanır). */
export function boyalar(l: LayerSpecification): Boya {
  return ((l as { paint?: Boya }).paint ?? {}) as Boya;
}

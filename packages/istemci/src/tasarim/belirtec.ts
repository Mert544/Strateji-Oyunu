/**
 * TASARIM BELİRTEÇLERİ: elle düzenlenen TEK kaynak ("Kâğıt ve Çini", docs/arastirma/gorsel-kimlik-ve-arayuz.md §3–§5).
 *
 * Renkler OKLCH üçlüsüdür ([L, C, H]); her belirteç [açık "Kâğıt", koyu "Arduvaz"] çifti taşır. CSS bu dosyadan
 * `scripts/belirtec-uret.ts` ile ÜRETİLİR (src/tasarim/tema.css) ve YALNIZ onaltılık (#rrggbb) yazılır: MapLibre
 * `oklch()` tanımaz, `hexRgb()` tanımadığını sessizce griye çevirir (§3.1). Saydamlık gereken JS okumalı belirteçler
 * ayrı bir `-alfa` sayısı taşır. Değiştirdikten sonra: `pnpm --filter @bolge/istemci tasarim` (test güncelliği denetler).
 *
 * Oyuncu renk sözleşmesi (§3.5, §8 karar 2): sunucu oyuncuya `renkIndeksi` (0–11) ve `paletSurumu` verir; hex saklanmaz.
 * Palet YALNIZ SONA EKLENİR, sıra değişmez (yeni renk = yeni indeks; sürüm artar).
 */
import type { Oklch } from "./renk";

/** [açık, koyu] */
export type Cift = readonly [Oklch, Oklch];

/** §3.2 nötr ölçek: açıkta sıcak kâğıt (H 85) + serin mürekkep (H 245); koyuda serin arduvaz + sıcak kırık beyaz. */
export const NOTR = {
  zemin: [[0.962, 0.009, 85], [0.192, 0.014, 244]],
  yuzey: [[0.986, 0.006, 85], [0.226, 0.014, 239]],
  "yuzey-2": [[0.94, 0.011, 90], [0.265, 0.017, 248]],
  "yuzey-3": [[0.914, 0.012, 80], [0.301, 0.017, 245]],
  "cizgi-ince": [[0.895, 0.012, 85], [0.32, 0.017, 245]],
  cizgi: [[0.834, 0.014, 82], [0.382, 0.018, 245]],
  "cizgi-guclu": [[0.621, 0.019, 243], [0.56, 0.02, 246]],
  "murekkep-4": [[0.721, 0.014, 244], [0.48, 0.016, 241]],
  "murekkep-3": [[0.521, 0.022, 243], [0.641, 0.019, 243]],
  "murekkep-2": [[0.454, 0.026, 246], [0.771, 0.016, 242]],
  murekkep: [[0.265, 0.026, 242], [0.944, 0.006, 75]],
} as const satisfies Record<string, Cift>;

/**
 * §3.3 aileler: `solid` (dolgu/ikon), `-ink` (metin: metin rengi DAİMA ink), `-tint` (zemin), `-cizgi` (kenar).
 * Birincil (çini) = eylem, bağlantı, odak, "Sen". İkincil (kiremit) = kutlama, Pazar (hata/uyarı için değil).
 */
export const AILE = {
  birincil: [[0.52, 0.089, 207], [0.719, 0.1, 207]],
  "birincil-ink": [[0.43, 0.074, 206], [0.801, 0.092, 207]],
  "birincil-tint": [[0.945, 0.029, 205], [0.285, 0.027, 207]],
  "birincil-cizgi": [[0.799, 0.06, 207], [0.451, 0.06, 206]],
  "birincil-hover": [[0.47, 0.084, 207], [0.76, 0.098, 207]],
  ikincil: [[0.52, 0.126, 48], [0.721, 0.125, 48]],
  "ikincil-ink": [[0.429, 0.115, 48], [0.8, 0.115, 48]],
  "ikincil-tint": [[0.944, 0.03, 46], [0.286, 0.035, 47]],
  "ikincil-cizgi": [[0.801, 0.075, 48], [0.451, 0.075, 48]],
  basari: [[0.521, 0.105, 158], [0.721, 0.106, 158]],
  "basari-ink": [[0.429, 0.096, 158], [0.8, 0.096, 158]],
  "basari-tint": [[0.944, 0.03, 158], [0.286, 0.03, 159]],
  "basari-cizgi": [[0.801, 0.064, 158], [0.45, 0.063, 158]],
  uyari: [[0.559, 0.115, 78], [0.78, 0.115, 78]],
  "uyari-ink": [[0.448, 0.094, 78], [0.821, 0.106, 78]],
  "uyari-tint": [[0.945, 0.033, 79], [0.285, 0.033, 78]],
  "uyari-cizgi": [[0.801, 0.069, 78], [0.449, 0.069, 78]],
  hata: [[0.52, 0.166, 25], [0.72, 0.165, 25]],
  "hata-ink": [[0.43, 0.152, 25], [0.8, 0.115, 25]],
  "hata-tint": [[0.945, 0.028, 23], [0.286, 0.045, 27]],
  "hata-cizgi": [[0.8, 0.098, 25], [0.45, 0.1, 25]],
  bilgi: [[0.52, 0.115, 250], [0.721, 0.115, 250]],
  "bilgi-ink": [[0.43, 0.106, 250], [0.8, 0.105, 250]],
  "bilgi-tint": [[0.946, 0.027, 250], [0.284, 0.033, 252]],
  "bilgi-cizgi": [[0.8, 0.069, 249], [0.45, 0.069, 250]],
} as const satisfies Record<string, Cift>;

/** §3.6 katman renkleri (solid / ink / tint). Oyuncu renginden bağımsız: sahip = oyuncu rengi, iş = katman rengi. */
export const KATMAN = {
  tarim: [[0.72, 0.113, 102], [0.834, 0.114, 97]],
  "tarim-ink": [[0.43, 0.09, 102], [0.799, 0.098, 97]],
  "tarim-tint": [[0.945, 0.03, 101], [0.284, 0.031, 97]],
  sanayi: [[0.601, 0.049, 257], [0.659, 0.051, 265]],
  "sanayi-ink": [[0.43, 0.044, 256], [0.801, 0.045, 266]],
  "sanayi-tint": [[0.944, 0.014, 258], [0.285, 0.014, 267]],
  lojistik: [[0.702, 0.084, 222], [0.823, 0.09, 224]],
  "lojistik-ink": [[0.431, 0.076, 222], [0.801, 0.081, 223]],
  "lojistik-tint": [[0.945, 0.023, 221], [0.285, 0.025, 222]],
  teknoloji: [[0.562, 0.147, 306], [0.747, 0.14, 307]],
  "teknoloji-ink": [[0.431, 0.098, 307], [0.8, 0.099, 307]],
  "teknoloji-tint": [[0.945, 0.031, 306], [0.285, 0.031, 307]],
  pazar: [[0.588, 0.111, 55], [0.72, 0.111, 46]],
  "pazar-ink": [[0.429, 0.099, 54], [0.8, 0.099, 46]],
  "pazar-tint": [[0.945, 0.031, 55], [0.284, 0.031, 45]],
  devlet: [[0.409, 0.111, 281], [0.591, 0.128, 278]],
  "devlet-ink": [[0.409, 0.111, 281], [0.8, 0.098, 278]],
  "devlet-tint": [[0.944, 0.027, 281], [0.285, 0.03, 276]],
  askeri: [[0.46, 0.094, 126], [0.6, 0.088, 120]],
  "askeri-ink": [[0.43, 0.085, 126], [0.801, 0.079, 120]],
  "askeri-tint": [[0.944, 0.025, 127], [0.285, 0.025, 121]],
} as const satisfies Record<string, Cift>;

export const KATMAN_ADLARI = ["tarim", "sanayi", "lojistik", "teknoloji", "pazar", "devlet", "askeri"] as const;
export type KatmanAdi = (typeof KATMAN_ADLARI)[number];

/** §3.6 sıralı rampalar (mercek dolguları): 5 kademe, açıkta açıktan koyuya, koyuda koyudan açığa. */
export const RAMPA: Record<KatmanAdi, readonly [Cift, Cift, Cift, Cift, Cift]> = {
  tarim: [
    [[0.94, 0.028, 100], [0.3, 0.029, 96]],
    [[0.85, 0.071, 102], [0.402, 0.072, 97]],
    [[0.74, 0.111, 102], [0.53, 0.109, 97]],
    [[0.61, 0.128, 102], [0.671, 0.131, 97]],
    [[0.459, 0.096, 102], [0.819, 0.12, 97]],
  ],
  sanayi: [
    [[0.941, 0.013, 256], [0.301, 0.012, 264]],
    [[0.85, 0.031, 256], [0.4, 0.031, 263]],
    [[0.739, 0.048, 258], [0.531, 0.049, 265]],
    [[0.611, 0.056, 257], [0.67, 0.058, 266]],
    [[0.459, 0.052, 257], [0.819, 0.054, 265]],
  ],
  lojistik: [
    [[0.941, 0.021, 223], [0.298, 0.023, 225]],
    [[0.849, 0.053, 222], [0.399, 0.057, 224]],
    [[0.74, 0.082, 222], [0.529, 0.088, 224]],
    [[0.611, 0.097, 222], [0.671, 0.103, 224]],
    [[0.46, 0.085, 222], [0.821, 0.095, 224]],
  ],
  teknoloji: [
    [[0.939, 0.031, 306], [0.301, 0.03, 307]],
    [[0.849, 0.077, 306], [0.4, 0.076, 306]],
    [[0.741, 0.118, 306], [0.53, 0.119, 307]],
    [[0.61, 0.141, 307], [0.67, 0.14, 307]],
    [[0.46, 0.129, 306], [0.819, 0.116, 307]],
  ],
  pazar: [
    [[0.941, 0.028, 55], [0.301, 0.028, 48]],
    [[0.85, 0.071, 55], [0.401, 0.071, 47]],
    [[0.74, 0.109, 55], [0.529, 0.109, 46]],
    [[0.61, 0.128, 54], [0.669, 0.127, 46]],
    [[0.46, 0.114, 55], [0.82, 0.109, 46]],
  ],
  devlet: [
    [[0.939, 0.028, 282], [0.299, 0.031, 279]],
    [[0.85, 0.071, 281], [0.401, 0.077, 278]],
    [[0.741, 0.108, 281], [0.53, 0.119, 278]],
    [[0.609, 0.127, 281], [0.67, 0.14, 277]],
    [[0.459, 0.118, 281], [0.82, 0.091, 277]],
  ],
  askeri: [
    [[0.939, 0.024, 125], [0.301, 0.023, 122]],
    [[0.849, 0.058, 126], [0.4, 0.055, 119]],
    [[0.741, 0.093, 126], [0.53, 0.086, 120]],
    [[0.611, 0.108, 126], [0.671, 0.101, 120]],
    [[0.459, 0.098, 126], [0.821, 0.093, 120]],
  ],
};

/** Oyuncu emblemleri (renk + şekil çifti): ilk altı dolu, sonraki altı aynı şeklin çerçeveli/halka hâli. */
export const EMBLEMLER = ["daire", "kare", "ucgen", "eskenar-dortgen", "besgen", "altigen"] as const;
export type Emblem = { sekil: (typeof EMBLEMLER)[number]; dolu: boolean };

export interface OyuncuRengi {
  /** ASCII kimlik (sabit; CSS ve kayıtlarda). */
  ad: string;
  /** Görünen Türkçe ad. */
  gorunen: string;
  /** Dolgu (yarı saydam çizilir). */
  dolgu: Cift;
  /** Kenar: dolgunun kara üstünde ≥3:1 kalan sürümü (ayrım kenarla garanti edilir). */
  kenar: Cift;
}

/** Palet sürümü (sunucu `paletSurumu`); yalnız sona ekleme yapılırsa artar. */
export const PALET_SURUMU = 1;

/**
 * §3.5 oyuncu renkleri: dizideki SIRA = sunucunun `renkIndeksi` (0–11). Tavlama benzetimiyle seçildi, elle düzeltilmedi.
 * Emblem = EMBLEMLER[i % 6], i ≥ 6 ise çerçeveli.
 */
export const OYUNCU: readonly OyuncuRengi[] = [
  { ad: "gul-kurusu", gorunen: "Gül kurusu", dolgu: [[0.539, 0.097, 11], [0.708, 0.098, 11]], kenar: [[0.501, 0.097, 12], [0.721, 0.097, 11]] },
  { ad: "kestane", gorunen: "Kestane", dolgu: [[0.429, 0.13, 41], [0.599, 0.13, 41]], kenar: [[0.429, 0.13, 41], [0.72, 0.13, 41]] },
  { ad: "hardal", gorunen: "Hardal", dolgu: [[0.614, 0.126, 72], [0.784, 0.126, 72]], kenar: [[0.499, 0.107, 72], [0.784, 0.126, 72]] },
  { ad: "fistik", gorunen: "Fıstık", dolgu: [[0.719, 0.13, 114], [0.86, 0.13, 115]], kenar: [[0.501, 0.113, 114], [0.86, 0.13, 115]] },
  { ad: "zeytin", gorunen: "Zeytin", dolgu: [[0.506, 0.107, 104], [0.676, 0.126, 103]], kenar: [[0.499, 0.105, 103], [0.721, 0.126, 103]] },
  { ad: "cam", gorunen: "Çam", dolgu: [[0.419, 0.054, 148], [0.591, 0.056, 148]], kenar: [[0.419, 0.054, 148], [0.72, 0.057, 148]] },
  { ad: "zumrut", gorunen: "Zümrüt", dolgu: [[0.626, 0.13, 159], [0.796, 0.131, 159]], kenar: [[0.499, 0.115, 159], [0.796, 0.131, 159]] },
  { ad: "kobalt", gorunen: "Kobalt", dolgu: [[0.46, 0.13, 258], [0.631, 0.13, 258]], kenar: [[0.46, 0.13, 258], [0.72, 0.13, 257]] },
  { ad: "gok", gorunen: "Gök", dolgu: [[0.721, 0.102, 246], [0.861, 0.073, 246]], kenar: [[0.501, 0.102, 246], [0.861, 0.073, 246]] },
  { ad: "eflatun", gorunen: "Eflatun", dolgu: [[0.613, 0.125, 301], [0.785, 0.124, 301]], kenar: [[0.501, 0.124, 301], [0.785, 0.124, 301]] },
  { ad: "patlican", gorunen: "Patlıcan", dolgu: [[0.42, 0.076, 319], [0.59, 0.075, 319]], kenar: [[0.42, 0.076, 319], [0.72, 0.075, 319]] },
  { ad: "nar-cicegi", gorunen: "Nar çiçeği", dolgu: [[0.718, 0.128, 2], [0.859, 0.081, 1]], kenar: [[0.499, 0.128, 1], [0.859, 0.081, 1]] },
];

export function emblem(renkIndeksi: number): Emblem {
  const i = ((renkIndeksi % 12) + 12) % 12;
  return { sekil: EMBLEMLER[i % 6] as Emblem["sekil"], dolu: i < 6 };
}

/** İzleme kipinde (kimse "Sen" değilken) dört devlet tam renkte: Kobalt, Hardal, Zümrüt, Nar çiçeği (§4.7). */
export const DEVLET_OYUNCU_INDEKSI = [7, 2, 6, 11] as const;

/** Soluk ton (varsayılan görünümde başkaları): kroma × 0,45, açıklık kara'ya %30 yaklaşır (§3.5). */
export const SOLUK = { kroma: 0.45, karaYakinlik: 0.3 } as const;

/** §3.7 rozetler: savaş > eksik girdi > boşta > bitti (şekil zorunlu: ⚔ ▲ ◯ ✓ Lucide çizgisiyle). */
export const ROZET = {
  savas: [[0.52, 0.166, 25], [0.72, 0.165, 25]],
  eksik: [[0.6, 0.124, 80], [0.78, 0.115, 78]],
  bosta: [[0.521, 0.022, 243], [0.641, 0.019, 243]],
  bitti: [[0.521, 0.105, 158], [0.721, 0.106, 158]],
} as const satisfies Record<string, Cift>;

/** §4.3 harita (L1–L3, MapLibre). `kara` = arsa "diğer", sokak zemini ve küre karası ile aynı (geçişte sıçrama yok). */
export const HARITA = {
  kara: [[0.952, 0.014, 89], [0.256, 0.012, 237]],
  "dis-kara": [[0.915, 0.01, 94], [0.215, 0.008, 240]],
  su: [[0.861, 0.036, 224], [0.199, 0.034, 236]],
  "su-derin": [[0.824, 0.039, 229], [0.174, 0.033, 238]],
  "sig-su-kiyi": [[0.894, 0.03, 224], [0.223, 0.036, 232]],
  "kiyi-cizgisi": [[0.74, 0.035, 226], [0.4, 0.03, 230]],
  orman: [[0.871, 0.051, 144], [0.285, 0.041, 152]],
  "park-yesil": [[0.905, 0.048, 140], [0.299, 0.039, 147]],
  tarim: [[0.918, 0.05, 102], [0.289, 0.033, 103]],
  yerlesim: [[0.928, 0.014, 74], [0.274, 0.009, 248]],
  "sanayi-alan": [[0.899, 0.012, 260], [0.265, 0.013, 273]],
  "kum-plaj": [[0.925, 0.04, 91], [0.299, 0.025, 87]],
  "kayalik-dag": [[0.905, 0.012, 80], [0.286, 0.008, 240]],
  bina: [[0.88, 0.021, 63], [0.314, 0.011, 248]],
  "bina-kenar": [[0.79, 0.025, 59], [0.386, 0.014, 244]],
  "yol-otoyol-dolgu": [[0.991, 0.004, 91], [0.471, 0.021, 81]],
  "yol-otoyol-kasa": [[0.746, 0.041, 66], [0.215, 0.012, 248]],
  "yol-ana-dolgu": [[0.994, 0.003, 85], [0.42, 0.011, 243]],
  "yol-ana-kasa": [[0.81, 0.025, 74], [0.215, 0.012, 248]],
  "yol-ara-dolgu": [[1, 0, 0], [0.38, 0.01, 242]],
  "yol-ara-kasa": [[0.866, 0.016, 83], [0.224, 0.012, 248]],
  "yol-sokak-kasa": [[0.89, 0.012, 80], [0.235, 0.012, 237]],
  patika: [[0.76, 0.03, 69], [0.47, 0.012, 239]],
  demiryolu: [[0.689, 0.012, 244], [0.479, 0.01, 248]],
  "sinir-ulke": [[0.56, 0.029, 21], [0.68, 0.04, 24]],
  "sinir-il": [[0.625, 0.027, 40], [0.59, 0.025, 45]],
  "sinir-ilce": [[0.74, 0.016, 81], [0.48, 0.016, 241]],
  "sinir-mahalle": [[0.8, 0.012, 80], [0.398, 0.013, 248]],
  "etiket-il": [[0.349, 0.026, 244], [0.901, 0.013, 87]],
  "etiket-ilce": [[0.429, 0.024, 246], [0.8, 0.014, 82]],
  "etiket-mahalle": [[0.501, 0.02, 243], [0.701, 0.015, 241]],
  "etiket-su": [[0.478, 0.07, 232], [0.701, 0.061, 231]],
  "etiket-yol": [[0.47, 0.02, 70], [0.659, 0.014, 244]],
  halo: [[0.986, 0.006, 85], [0.201, 0.011, 242]],
  izgara: [[0.546, 0.017, 245], [0.852, 0.008, 80]],
  "kabartma-golge": [[0.6, 0.035, 70], [0.117, 0.021, 241]],
  "kabartma-vurgu": [[0.994, 0.004, 91], [0.42, 0.02, 237]],
  "kabartma-yuzey": [[0.75, 0.019, 70], [0.081, 0.019, 242]],
} as const satisfies Record<string, Cift>;

/** §4.3 L3 arsa türü mozaiği (oyun bilgisi: L2 bağlam renklerinden bir kademe daha ayrışık). */
export const ARSA = {
  tarla: [[0.901, 0.057, 109], [0.341, 0.059, 112]],
  sanayi: [[0.9, 0.04, 279], [0.364, 0.038, 256]],
  konut: [[0.882, 0.033, 44], [0.387, 0.036, 53]],
  orman: [[0.817, 0.051, 151], [0.29, 0.057, 149]],
  yapili: [[0.763, 0.035, 73], [0.45, 0.029, 63]],
  engel: [[0.92, 0.013, 87], [0.215, 0.012, 248]],
  // B3 yeni oyunculara ayrılmış (satılmamış) hücre: mor-mavi ton (hue 250) kara, su, arsa türleri, "Sen" ve soluk oyuncu tonlarından
  // ayrışır (en küçük ΔE_OK × 100: normal ≈ 6, protan/deutan/tritan ≥ 5,3; taranan 360° × açıklık × kroma kümesinin en iyisi);
  // kenar çizgisi kara üstünde ≥ 3:1 ve ayrıca kesikli çizilir (renk tek başına anlam taşımaz).
  ayrilmis: [[0.8, 0.11, 250], [0.45, 0.11, 250]],
  "ayrilmis-kenar": [[0.5, 0.14, 250], [0.74, 0.12, 250]],
} as const satisfies Record<string, Cift>;

/** §4.7 küre (L0): uzay = kâğıt; kara ve okyanus haritayla AYNI değerler. */
export const SAHNE = {
  uzay: [[0.962, 0.009, 85], [0.192, 0.014, 244]],
  okyanus: [[0.861, 0.036, 224], [0.199, 0.034, 236]],
  "okyanus-derin": [[0.824, 0.039, 229], [0.174, 0.033, 238]],
  kara: [[0.952, 0.014, 89], [0.256, 0.012, 237]],
  "kara-2": [[0.934, 0.018, 89], [0.289, 0.015, 244]],
  kutup: [[0.976, 0.006, 223], [0.819, 0.01, 232]],
  atmosfer: [[0.8, 0.05, 225], [0.479, 0.071, 229]],
} as const satisfies Record<string, Cift>;

/** Küre sayısal ayarları [açık, koyu]: atmosfer halkası tek kenar ışığıdır; yıldız yok (sakin). */
export const SAHNE_SAYI = {
  "atmosfer-guc": [0.25, 0.35],
  yildiz: [0, 0],
  gece: [0.8, 0.5],
  "gece-bolge": [0.9, 0.7],
  aksam: [1, 1],
} as const satisfies Record<string, readonly [number, number]>;

/** §4.8 sokak sahnesi (L4). Zemin = harita karası; cephe tonları "mahalle dokusu", ayrım kenar ve gölgeyle. */
export const YURU = {
  gok: [[0.945, 0.012, 225], [0.215, 0.018, 240]],
  ufuk: [[0.93, 0.014, 85], [0.27, 0.014, 240]],
  "zemin-kara": [[0.949, 0.014, 89], [0.256, 0.012, 237]],
  asfalt: [[0.8, 0.007, 248], [0.33, 0.008, 240]],
  "asfalt-ana": [[0.765, 0.008, 248], [0.31, 0.008, 240]],
  "asfalt-otoyol": [[0.73, 0.009, 248], [0.295, 0.008, 240]],
  kaldirim: [[0.934, 0.01, 87], [0.36, 0.01, 92]],
  "kerb-cizgi": [[0.641, 0.016, 71], [0.481, 0.014, 240]],
  "yaya-yolu": [[0.916, 0.022, 81], [0.341, 0.016, 92]],
  patika: [[0.88, 0.03, 75], [0.36, 0.018, 80]],
  ray: [[0.68, 0.012, 60], [0.42, 0.01, 240]],
  su: [[0.82, 0.04, 224], [0.3, 0.035, 230]],
  cim: [[0.861, 0.071, 138], [0.329, 0.05, 145]],
  orman: [[0.8, 0.065, 145], [0.3, 0.045, 150]],
  tarla: [[0.9, 0.055, 105], [0.33, 0.04, 105]],
  kum: [[0.925, 0.04, 91], [0.34, 0.025, 87]],
  "sanayi-alan": [[0.9, 0.008, 250], [0.3, 0.01, 250]],
  "konut-alan": [[0.935, 0.014, 80], [0.285, 0.01, 240]],
  kurum: [[0.925, 0.018, 70], [0.3, 0.012, 60]],
  "fasad-krem": [[0.915, 0.03, 86], [0.559, 0.03, 82]],
  "fasad-badana": [[0.89, 0.06, 90], [0.541, 0.055, 91]],
  "fasad-pembe": [[0.869, 0.04, 50], [0.529, 0.04, 50]],
  "fasad-gri": [[0.88, 0.01, 82], [0.519, 0.009, 74]],
  "fasad-seftali": [[0.875, 0.05, 61], [0.529, 0.045, 62]],
  "fasad-ten": [[0.901, 0.025, 71], [0.539, 0.025, 69]],
  "cati-kiremit": [[0.641, 0.105, 45], [0.47, 0.09, 45]],
  "cati-koyu-kiremit": [[0.559, 0.095, 40], [0.41, 0.079, 41]],
  "cati-duz-beton": [[0.79, 0.011, 82], [0.45, 0.01, 248]],
  "cati-arduvaz": [[0.599, 0.019, 251], [0.438, 0.018, 251]],
  "sanayi-govde": [[0.86, 0.012, 248], [0.521, 0.012, 248]],
  "sanayi-cati": [[0.681, 0.019, 246], [0.401, 0.019, 248]],
  "agac-tepe": [[0.699, 0.08, 142], [0.421, 0.071, 150]],
  cam: [[0.62, 0.025, 235], [0.36, 0.02, 240]],
  "cam-aksam": [[0.62, 0.025, 235], [0.72, 0.09, 80]],
  vitrin: [[0.5, 0.02, 235], [0.62, 0.08, 75]],
  golge: [[0.33, 0.02, 245], [0.05, 0.01, 245]],
  kenar: [[0.58, 0.018, 65], [0.2, 0.012, 240]],
  tente: [[0.56, 0.09, 45], [0.46, 0.08, 45]],
  "tente-2": [[0.5, 0.06, 150], [0.42, 0.05, 150]],
  "tente-3": [[0.48, 0.07, 230], [0.42, 0.06, 230]],
  "giysi-alt": [[0.38, 0.02, 245], [0.42, 0.02, 245]],
  "giysi-ust": [[0.9, 0.012, 85], [0.82, 0.012, 85]],
  ten: [[0.78, 0.06, 55], [0.68, 0.06, 55]],
  "insaat-0": [[0.76, 0.01, 80], [0.44, 0.008, 240]],
  "insaat-1": [[0.66, 0.05, 70], [0.5, 0.045, 70]],
  "insaat-2": [[0.85, 0.012, 80], [0.5, 0.01, 240]],
  "insaat-3": [[0.9, 0.02, 75], [0.58, 0.012, 240]],
} as const satisfies Record<string, Cift>;

/** Sabit (temadan bağımsız olmayan ama renk olmayan) ölçekler §5.1–§5.6. */
export const OLCEK = {
  bosluk: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  yaricap: { sm: 6, md: 10, lg: 14, hap: 999 },
  /** px / satır yüksekliği px; en küçük metin 12,5 px (sahip notu: ≥12,5). */
  yazi: { xs: [12.5, 16], sm: [13, 20], md: [14.5, 20], lg: [16, 24], xl: [18, 26], "2xl": [22, 28], "3xl": [28, 34], "4xl": [40, 44] },
  sure: { anlik: 80, hizli: 120, orta: 200, yavas: 320, sahne: 700, "sahne-uzun": 1000, ortu: 240 },
  ease: { cikis: "cubic-bezier(0.16, 1, 0.3, 1)", giris: "cubic-bezier(0.7, 0, 0.84, 0)", standart: "cubic-bezier(0.4, 0, 0.2, 1)" },
  z: { harita: 0, hud: 10, panel: 20, popover: 30, modal: 40, toast: 50, ortu: 60 },
} as const;

/** Gölge (sıcak tonlu; açıkta kâğıt gölgesi, koyuda neredeyse siyah). Kenarlık VEYA gölge, ikisi birden değil. */
export const GOLGE = {
  "golge-1": ["0 1px 2px rgba(41, 31, 24, 0.08), 0 1px 1px rgba(41, 31, 24, 0.04)", "0 1px 2px rgba(0, 0, 1, 0.45)"],
  "golge-2": ["0 2px 4px rgba(41, 31, 24, 0.06), 0 8px 24px rgba(41, 31, 24, 0.1)", "0 2px 4px rgba(0, 0, 1, 0.35), 0 8px 24px rgba(0, 0, 1, 0.45)"],
  "golge-3": ["0 4px 8px rgba(41, 31, 24, 0.08), 0 24px 56px rgba(41, 31, 24, 0.16)", "0 4px 8px rgba(0, 0, 1, 0.4), 0 24px 56px rgba(0, 0, 1, 0.55)"],
} as const satisfies Record<string, readonly [string, string]>;

/** Yazı tipi yığını: Inter ayrı dosya (yalnız HTTP'de yüklenir), yedek sistem yığını. */
export const YAZI_AILESI = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

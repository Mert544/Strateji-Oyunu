/**
 * Yerleş ekranının saf mantığı (F4): önerilen ilçe adayları, skor ve açılış önerileri.
 *
 * "Mahallende ya da seçtiğin yerde başla." Açılış (Tarım, Sanayi, Pazar) bir SINIF DEĞİL, yalnız ÖNERİDİR: oyuncu istediği zaman
 * fabrika kurar, ticarete geçer, başka yöne döner; geçişin yalnız ekonomik maliyeti vardır (docs/12 §3, docs/arastirma/baslangic-ve-ustalik).
 *
 * Skor (docs/arastirma/baslangic-ve-ustalik.md §3.4):
 *   0,35·düşük doluluk + 0,25·imza-açılış uyumu + 0,20·bu dönemde etkin ürün + 0,10·kalan ayrılmış hücre + 0,10·çarşıya yakınlık.
 * İmza uyumu, dönem etkinliği ve çarşı yakınlığı küratörlü sabit değerlerdir (veri hattı `il-imza.json` üretince kalkacak).
 * Eklenen kural: arsa ızgarası olan ilçe oynanabilir olduğu için +0,5 (ızgarasız ilçe yalnız gezilebilir).
 * Sıralama ÖNCE taban hücreye bakar: ayrılmış (taban fiyatlı) hücresi açılışın ilk yapısının ayak izine yeten ilçeler öne
 * (`tabanYeter`); ölçüm botlarının ilçe seçimi de aynı kuralı kullanır (botlar/src/parsel.ts `ilceSec`).
 */

export type Acilis = "tarim" | "sanayi" | "pazar";

export interface AcilisBilgisi {
  /** Önerilen ilk yapı (yapı menüsünde "Önerilen" rozeti). Üç açılışta da ÇİFTLİK (P4 akışı): açılış yalnız ikinci adımı ve ilçe önerisini etkiler. */
  yapi: string;
}

/**
 * Açılış önerileri. Görünen ad ve cümleler metin tablolarındadır (`arayuz/yerles-metin.ts`, `tasarim/ilce-metin.ts`); yapının görünen adı
 * KATALOGDAN okunur (burada sabit ad yok).
 */
export const ACILIS: Readonly<Record<Acilis, AcilisBilgisi>> = {
  tarim: { yapi: "ciftlik" },
  sanayi: { yapi: "ciftlik" },
  pazar: { yapi: "ciftlik" },
};

export const ACILIS_SIRASI: readonly Acilis[] = ["tarim", "sanayi", "pazar"];

export interface YerlesAdayi {
  /** İlçe kimliği (OSM hiyerarşisi). */
  ilce: string;
  /** İmza ürünler (küratörlü; ikincil kaynak). */
  imza: string;
  acilis: Acilis;
  /** İmzanın önerilen açılışla uyumu (0–1). */
  uyum: number;
  /** Bu dönemde (1 Ekim) imzanın etkinliği (0–1). */
  donem: number;
  /** Çarşıya yakınlık (0–1). */
  carsi: number;
  /** "Neden" cümlesi. */
  neden: string;
}

/** Alfa-0 illeri (Kocaeli, Sakarya, Bursa) için küratörlü aday havuzu. */
export const YERLES_ADAYLARI: readonly YerlesAdayi[] = [
  { ilce: "tr_41_gebze", imza: "Otomotiv, rafineri, karton", acilis: "sanayi", uyum: 0.9, donem: 1, carsi: 0.9, neden: "Sanayi ilçesi; üretim zincirine yakın, çarşı canlı" },
  { ilce: "tr_41_kandira", imza: "Manda yoğurdu, karpuz; ormanlık kıyı", acilis: "tarim", uyum: 0.9, donem: 0.8, carsi: 0.4, neden: "Sakin kıyı; süt ve ekim için geniş arsa" },
  { ilce: "tr_16_gemlik", imza: "Gemlik zeytini, liman", acilis: "pazar", uyum: 0.9, donem: 1, carsi: 0.9, neden: "Liman ilçesi; zeytin hasadı bu dönemde" },
  { ilce: "tr_54_hendek", imza: "Mısır, fındık", acilis: "tarim", uyum: 0.8, donem: 0.7, carsi: 0.6, neden: "Ova; mısır hasadı bu dönemde" },
  { ilce: "tr_41_korfez", imza: "Rafineri, petrokimya", acilis: "sanayi", uyum: 0.8, donem: 1, carsi: 0.8, neden: "Körfez sanayisi; zincir sonradan genişler" },
  { ilce: "tr_16_inegol", imza: "Mobilya, kereste", acilis: "sanayi", uyum: 0.8, donem: 1, carsi: 0.7, neden: "Hafif sanayi; atölye tabanlı" },
];

/** Bir adayın o anki durumu (sunucudan ve veriden). */
export interface AdayDurumu {
  aday: YerlesAdayi;
  ad: string;
  il: string;
  /** Satılmış / uygun (0–1); sunucuda yoksa null. */
  doluluk: number | null;
  /**
   * Yeni oyunculara ayrılmış hücre sayısı (sunucunun `ayrilmisAdet`'i; bilinmiyorsa null). Protokol satılmış ayrılmış hücreyi
   * ayrıca vermez: sayı üst sınırdır (ayrılmış hücreler yalnız yeni oyunculara satıldığından erken dönemde fark küçüktür).
   */
  ayrilmis: number | null;
  /** Önerilen açılışın ilk yapısının ayak izi (hücre); bilinmiyorsa 1. */
  ayakIzi?: number;
  /** Arsa ızgarası var (oynanabilir). */
  izgara: boolean;
  /** Sunucunun dünyasında var mı (bilinmiyorsa null). */
  sunucuda: boolean | null;
}

/** Ayrılmış hücre ilk yapının ayak izine yetiyor mu? (bilinmiyorsa hayır: bilinen ve yeten ilçe öne geçer) */
export function tabanYeter(d: AdayDurumu): boolean {
  return d.ayrilmis !== null && d.ayrilmis >= (d.ayakIzi ?? 1);
}

/** "Ayrılmış arsa bol" eşiği (hücre; öneri, tek sabit). */
export const AYRILMIS_BOL_ESIGI = 100;

/**
 * Kartın ayrılmış hücre satırı (oyuncu dili, SAYI YOK): bilinmiyorsa null (satır yok); 0 → yok; ilk yapının ayak izine yetmiyorsa az;
 * yetiyorsa var, `AYRILMIS_BOL_ESIGI` ve üstü bol.
 */
export function ayrilmisDurumu(d: Pick<AdayDurumu, "ayrilmis" | "ayakIzi">): "bol" | "var" | "az" | "yok" | null {
  if (d.ayrilmis === null) return null;
  if (d.ayrilmis <= 0) return "yok";
  if (d.ayrilmis < (d.ayakIzi ?? 1)) return "az";
  return d.ayrilmis >= AYRILMIS_BOL_ESIGI ? "bol" : "var";
}

/** Kartın durum rozeti: ızgara yoksa "yakında" (zayıf; ızgara gelince kalkar), sunucuda yoksa "açık değil", aksi hâlde "hazır". */
export function durumRozeti(d: Pick<AdayDurumu, "izgara" | "sunucuda">): "hazir" | "izgara_yakinda" | "sunucuda_yok" {
  return !d.izgara ? "izgara_yakinda" : d.sunucuda === false ? "sunucuda_yok" : "hazir";
}

/** Yerleş skoru (0–1,5): formül yukarıda. */
export function yerlesSkoru(d: AdayDurumu): number {
  const dusukDoluluk = d.doluluk === null ? 0.5 : 1 - Math.min(1, Math.max(0, d.doluluk));
  const ayrilmis = d.ayrilmis === null ? 0.5 : d.ayrilmis > 0 ? 1 : 0;
  const temel = 0.35 * dusukDoluluk + 0.25 * d.aday.uyum + 0.2 * d.aday.donem + 0.1 * ayrilmis + 0.1 * d.aday.carsi;
  return temel + (d.izgara ? 0.5 : 0);
}

/**
 * En iyi `kac` aday (karar felci olmasın: 3). `kaydir` "başka ilçe öner" için sıradaki üçlüyü verir.
 * Çeşitlilik kuralı: doluluğu bilinen adaylar arasında en az biri yoğun (doluluk ≥ ortanca) ve en az biri sakin olsun.
 * Eşit skorda ilçe kimliği sırası (deterministik).
 */
export function yerlesOner(durumlar: readonly AdayDurumu[], kac = 3, kaydir = 0): AdayDurumu[] {
  const yeter = (d: AdayDurumu): number => (tabanYeter(d) ? 0 : 1);
  const sirali = [...durumlar].sort((a, b) => yeter(a) - yeter(b) || yerlesSkoru(b) - yerlesSkoru(a) || (a.aday.ilce < b.aday.ilce ? -1 : 1));
  if (sirali.length <= kac) return sirali;
  const bas = (kaydir * kac) % sirali.length;
  const dilim: AdayDurumu[] = [];
  for (let i = 0; i < kac; i++) dilim.push(sirali[(bas + i) % sirali.length]!);
  const bilinen = sirali.filter((d) => d.doluluk !== null);
  if (bilinen.length >= 2) {
    const dolular = bilinen.map((d) => d.doluluk!).sort((a, b) => a - b);
    const ortanca = dolular[Math.floor(dolular.length / 2)]!;
    const yogun = (d: AdayDurumu): boolean => d.doluluk !== null && d.doluluk >= ortanca;
    const sakin = (d: AdayDurumu): boolean => d.doluluk !== null && d.doluluk < ortanca;
    const degistir = (varMi: (d: AdayDurumu) => boolean, diger: (d: AdayDurumu) => boolean): void => {
      if (dilim.some(varMi)) return;
      const aday = sirali.find((d) => varMi(d) && !dilim.includes(d));
      if (!aday) return;
      // En düşük skorlu kartın yerine; ama öteki rolün tek temsilcisi çıkarılmaz, taban hücresi yeten kart yetmeyenle değişmez.
      for (let i = dilim.length - 1; i >= 0; i--) {
        const sonra = dilim.filter((_, j) => j !== i);
        if (diger(dilim[i]!) && !sonra.some(diger)) continue;
        if (yeter(aday) > yeter(dilim[i]!)) continue;
        dilim[i] = aday;
        return;
      }
    };
    degistir(yogun, sakin);
    degistir(sakin, yogun);
  }
  return dilim;
}

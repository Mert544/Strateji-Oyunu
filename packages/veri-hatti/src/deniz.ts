/**
 * Adım 5: limanlar ve deniz kenarları.
 *
 * - Limanlar: NE ports (+ yapılandırmada gerekçesiyle eklenen NE populated places yerleşimleri) bölge
 *   çokgenine atanır. Liman, bölgenin kıyı olması ve liman noktasının denize <= 80 km yakın olmasını ister
 *   (Galați gibi nehir limanı olan iç bölgeler liman sayılmaz).
 * - Deniz yolu: 0.04° (~4.4 km) kara/deniz ızgarasında (NE admin-0 ülke çokgenleri = kara) Dijkstra ile en kısa
 *   deniz mesafesi (km). İstanbul ve Çanakkale boğazları yapılandırmadaki çizgilerle ızgarada açılır.
 * - Kenar seçimi: deniz kenarları yalnızca ortak havzadaki limanlar arasında ve kara komşusu olmayan çiftler
 *   arasında kurulur. Her liman bölgesi havzasındaki en yakın k komşusuna bağlanır, sonra bağlılık en kısa
 *   kenarlarla tamamlanır. Karadeniz <-> Marmara <-> Ege bağlantısı yalnızca İstanbul ve Çanakkale
 *   bölgelerinden geçer (iki havzaya birden üyedirler).
 */
import { Izgara, denizMesafeleri, kutuKesisir, noktaCokgenMesafeKm, noktaCokgende, cokgenlerinKutusu, type Cokgen, type Kutu } from "./cografya";
import type { BirlesikBolge } from "./birlestir";
import type { Yapilandirma } from "./yapilandirma";
import type { Liman, Yerlesim } from "./ulke-verisi";
import { DENIZ } from "./kurallar";

export interface BolgeLimani {
  ad: string;
  kaynak: Liman["kaynak"];
  boylam: number;
  enlem: number;
  /** Ana deniz hücresi ve liman noktasının denize uzaklığı. */
  hucre: { i: number; j: number };
  denizeKm: number;
}

export interface KiyiSonucu {
  /** Kıyı olan bölgeler. */
  kiyi: Set<string>;
  /** bölge -> limanlar (kıyı ve denize yakın olanlar). */
  limanlar: Map<string, BolgeLimani[]>;
  /** Elenen limanlar ve nedeni (rapor için). */
  elenenler: Array<{ ad: string; neden: string }>;
}

export function izgaraKur(karaCokgenleri: readonly Cokgen[], yap: Yapilandirma, kutu: Kutu): Izgara {
  const izgara = new Izgara({ ...kutu, adim: DENIZ.izgaraAdimi });
  for (const c of karaCokgenleri) izgara.karaEkle(c);
  for (const g of yap.denizGecitleri) izgara.denizYoluAc(g.noktalar, DENIZ.bogazYaricapi);
  return izgara;
}

/** Bölgenin kıyı olup olmadığı: sınır köşelerinden en az 5'i (3x3 komşulukta) deniz hücresine komşu. */
export function kiyiBolgeleri(bolgeler: readonly BirlesikBolge[], izgara: Izgara): Set<string> {
  const kiyi = new Set<string>();
  for (const b of bolgeler) {
    let vurus = 0;
    for (const c of b.cokgenler) {
      for (const halka of c) {
        for (const [bo, en] of halka) {
          const [ci, cj] = izgara.hucreBul(bo, en);
          let deniz = false;
          for (let dj = -1; dj <= 1 && !deniz; dj++) for (let di = -1; di <= 1 && !deniz; di++) deniz = izgara.denizMi(ci + di, cj + dj);
          if (deniz) vurus++;
        }
      }
    }
    if (vurus >= 5) kiyi.add(b.id);
  }
  return kiyi;
}

/** Liman noktasını bölgeye atar: çokgen içinde, değilse 6 km içindeki en yakın bölge. */
function noktaBolgesi(bolgeler: readonly BirlesikBolge[], kutular: ReadonlyMap<string, Kutu>, b: number, e: number): string | null {
  const nokta: Kutu = { minB: b, maxB: b, minE: e, maxE: e };
  for (const r of bolgeler) {
    if (kutuKesisir(kutular.get(r.id) as Kutu, nokta) && r.cokgenler.some((c) => noktaCokgende(b, e, c))) return r.id;
  }
  let en = 6;
  let sahip: string | null = null;
  const genis: Kutu = { minB: b - 0.1, maxB: b + 0.1, minE: e - 0.1, maxE: e + 0.1 };
  for (const r of bolgeler) {
    if (!kutuKesisir(kutular.get(r.id) as Kutu, genis)) continue;
    for (const c of r.cokgenler) {
      const d = noktaCokgenMesafeKm(b, e, c);
      if (d < en) {
        en = d;
        sahip = r.id;
      }
    }
  }
  return sahip;
}

export function limanlariAta(
  bolgeler: readonly BirlesikBolge[],
  kiyi: ReadonlySet<string>,
  izgara: Izgara,
  neLimanlari: readonly Liman[],
  yerlesimler: readonly Yerlesim[],
  yap: Yapilandirma,
): KiyiSonucu {
  const kutular = new Map<string, Kutu>(bolgeler.map((b) => [b.id, cokgenlerinKutusu(b.cokgenler)]));
  const adaylar: Array<Liman & { bolgeHedef?: string }> = [...neLimanlari];
  for (const e of yap.ekLimanlar) {
    const y = yerlesimler.find((x) => x.ad === e.yer && x.ulke === e.ulke);
    if (y === undefined) throw new Error(`ekLimanlar: NE populated places'ta bulunamadi: ${e.yer} (${e.ulke})`);
    adaylar.push({ ad: y.ad, boylam: y.boylam, enlem: y.enlem, siralama: 99, kaynak: "ne_places", bolgeHedef: e.bolge });
  }
  const limanlar = new Map<string, BolgeLimani[]>();
  const elenenler: Array<{ ad: string; neden: string }> = [];
  // Aynı adlı yinelenen limanlar (ör. NE'de 3 Piraeus noktası) tek sayılır
  const goruldu = new Set<string>();
  adaylar.sort((x, y) => (x.siralama === y.siralama ? (x.ad < y.ad ? -1 : x.ad > y.ad ? 1 : x.boylam - y.boylam) : x.siralama - y.siralama));
  for (const l of adaylar) {
    if (goruldu.has(l.ad)) continue;
    const bolge = l.bolgeHedef ?? noktaBolgesi(bolgeler, kutular, l.boylam, l.enlem);
    if (bolge === null) continue; // dilim dışı
    goruldu.add(l.ad);
    if (!kiyi.has(bolge)) {
      elenenler.push({ ad: l.ad, neden: `bolge "${bolge}" kiyi degil (nehir limani)` });
      continue;
    }
    const hucre = izgara.enYakinDeniz(l.boylam, l.enlem, DENIZ.limanDenizeAzamiKm);
    if (hucre === null) {
      elenenler.push({ ad: l.ad, neden: `denize ${DENIZ.limanDenizeAzamiKm} km'den uzak` });
      continue;
    }
    (limanlar.get(bolge) ?? limanlar.set(bolge, []).get(bolge))?.push({
      ad: l.ad,
      kaynak: l.kaynak,
      boylam: l.boylam,
      enlem: l.enlem,
      hucre: { i: hucre.i, j: hucre.j },
      denizeKm: hucre.km,
    });
  }
  return { kiyi: new Set(kiyi), limanlar, elenenler };
}

export interface DenizAdayi {
  a: string;
  b: string;
  km: number;
}

/** Liman bölgeleri arası en kısa deniz mesafeleri (her iki yön aynı; bölgenin tüm limanları kaynak). */
export function denizMesafeTablosu(limanlar: ReadonlyMap<string, BolgeLimani[]>, izgara: Izgara): Map<string, Map<string, number>> {
  const kimlikler = [...limanlar.keys()].sort();
  const tablo = new Map<string, Map<string, number>>();
  for (const a of kimlikler) {
    const alan = denizMesafeleri(izgara, (limanlar.get(a) as BolgeLimani[]).map((l) => l.hucre));
    const satir = new Map<string, number>();
    for (const b of kimlikler) {
      if (a === b) continue;
      let en = Infinity;
      for (const l of limanlar.get(b) as BolgeLimani[]) en = Math.min(en, alan[izgara.indeks(l.hucre.i, l.hucre.j)] as number);
      satir.set(b, en);
    }
    tablo.set(a, satir);
  }
  return tablo;
}

/**
 * Deniz kenarlarını seçer. `karaKomsu` anahtarları "a|b" (a<b) kara kenarı olan çiftlerdir (aynı çifte ikinci kenar yasak).
 */
export function denizKenarlariSec(
  havzalar: ReadonlyMap<string, readonly string[]>,
  mesafe: ReadonlyMap<string, ReadonlyMap<string, number>>,
  karaKomsu: ReadonlySet<string>,
): DenizAdayi[] {
  const dugumler = [...mesafe.keys()].sort();
  const anahtar = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const adaylar: DenizAdayi[] = [];
  for (let x = 0; x < dugumler.length; x++) {
    for (let y = x + 1; y < dugumler.length; y++) {
      const a = dugumler[x] as string;
      const b = dugumler[y] as string;
      const ortak = (havzalar.get(a) ?? []).some((h) => (havzalar.get(b) ?? []).includes(h));
      const km = mesafe.get(a)?.get(b) ?? Infinity;
      if (!ortak || !Number.isFinite(km) || karaKomsu.has(anahtar(a, b))) continue;
      adaylar.push({ a, b, km });
    }
  }
  adaylar.sort((p, q) => p.km - q.km || (p.a < q.a ? -1 : p.a > q.a ? 1 : p.b < q.b ? -1 : 1));
  const secilen = new Map<string, DenizAdayi>();
  for (const d of dugumler) {
    const benim = adaylar.filter((k) => k.a === d || k.b === d).slice(0, DENIZ.enYakinKomsu);
    for (const k of benim) secilen.set(anahtar(k.a, k.b), k);
  }
  // Bağlılığı en kısa kenarlarla tamamla (birleşim-bulma)
  const ata = new Map<string, string>(dugumler.map((d) => [d, d]));
  const kok = (d: string): string => {
    let r = d;
    while (ata.get(r) !== r) r = ata.get(r) as string;
    ata.set(d, r);
    return r;
  };
  for (const k of secilen.values()) ata.set(kok(k.a), kok(k.b));
  for (const k of adaylar) {
    if (kok(k.a) !== kok(k.b)) {
      secilen.set(anahtar(k.a, k.b), k);
      ata.set(kok(k.a), kok(k.b));
    }
  }
  return [...secilen.values()].sort((p, q) => (p.a === q.a ? (p.b < q.b ? -1 : 1) : p.a < q.a ? -1 : 1));
}


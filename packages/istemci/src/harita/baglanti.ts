/**
 * Mülk bağdaştırıcısı: haritanın sunucuyla konuştuğu tek yer.
 *
 * Sunucu (S4, packages/sunucu) henüz yok; `SahteBaglanti` bellek içi sahiplik tutar ve sunucunun yapacağı
 * doğrulamayı taklit eder (hücre biçimi, ilçede ve satın alınabilir mi, çakışma, tek sınıf, bitişiklik,
 * ≤72 hücre / ≤%25 sınırı). Sunucu gelince aynı arayüzü uygulayan bir ağ bağdaştırıcısı yazılır; harita kodu değişmez.
 * Fiyat ve `t` istemcide hesaplanmaz: sunucu basar (burada sahte saat).
 */
import type { ArsaSinifi, HucreId, Mili, MulkKomutu, OyuncuId } from "@bolge/cekirdek";
import { arsaSinifi, bitisikMi, hucreFiyati, ILCE_HUCRE_SINIRI, ILCE_PAY_SINIRI } from "./fiyat";
import { durumAl, engelNedeni, hucreId, idCoz, izgaraSay } from "./hucre";
import type { Izgara } from "./hucre";

/** 1 ₺ = 1000 mili-₺ (çekirdekteki MILI; değer içe aktarımı ana yığına çekirdeği çekmesin diye kopya). */
const MILI = 1000;

export type ParselKomutu = Extract<MulkKomutu, { tur: "parsel_al" }>;

export type ParselHatasi =
  | "izgara_yok"
  | "bos_secim"
  | "gecersiz_hucre"
  | "uygunsuz"
  | "sahipli"
  | "sinif_uyusmuyor"
  | "bitisik_degil"
  | "hucre_siniri"
  | "pay_siniri"
  | "yinelenen";

export type ParselSonucu =
  | { tamam: true; hucreler: HucreId[]; toplamMili: Mili; t: number }
  | { tamam: false; hata: ParselHatasi; mesaj: string; hucre?: HucreId };

export interface HucreSahipligi {
  sahip: OyuncuId;
  sinif: ArsaSinifi;
  degerMili: Mili;
  alinma: number;
}

export interface IlceSahipligi {
  ilce: string;
  /** Hücre -> sahiplik (yalnız satılmış hücreler). */
  hucreler: Map<HucreId, HucreSahipligi>;
  /** Uygun (satın alınabilir, su değil) hücre sayısı: fiyat payının ve %25 sınırının paydası. */
  uygun: number;
  satilmis: number;
}

export interface Oyuncu {
  id: OyuncuId;
  ad: string;
}

/** Harita ile sunucu arasındaki sözleşme. */
export interface MulkBaglantisi {
  /** Bu istemcinin oyuncusu. */
  readonly ben: Oyuncu;
  /** Oyuncu kimliğinden görünen ad. */
  oyuncuAdi(id: OyuncuId): string;
  parselAl(komut: ParselKomutu): Promise<ParselSonucu>;
  sahiplikAl(ilce: string): Promise<IlceSahipligi | null>;
}

export interface SahteSecenekler {
  /** İlçenin uygunluk ızgarası (sunucu tarafında BHI1). Yoksa null. */
  izgaraAl: (ilce: string) => Promise<Izgara | null>;
  ben?: Oyuncu;
  /** Gerçekçi görünüm için ilçeye birkaç komşu parsel serp (deterministik). Varsayılan: true. */
  komsular?: boolean;
  /** Sahte saat (ms). */
  saat?: () => number;
  /** Yapay gecikme (ms). */
  gecikme?: number;
}

const MESAJ: Record<ParselHatasi, string> = {
  izgara_yok: "Bu ilçenin arsa ızgarası henüz yok",
  bos_secim: "Hücre seçilmedi",
  gecersiz_hucre: "Geçersiz hücre kimliği",
  uygunsuz: "Satın alınamaz hücre",
  sahipli: "Hücre başkasına ait",
  sinif_uyusmuyor: "Hücre sınıfı komuttakiyle uyuşmuyor",
  bitisik_degil: "Seçilen hücreler bitişik olmalı",
  hucre_siniri: `İlçede en çok ${ILCE_HUCRE_SINIRI} hücre`,
  pay_siniri: "İlçe payı sınırı aşılıyor",
  yinelenen: "Aynı hücre iki kez seçildi",
};

interface IlceKaydi {
  izgara: Izgara;
  sahiplik: IlceSahipligi;
}

const KOMSU_OYUNCULAR: Oyuncu[] = [
  { id: "bot-ayse", ad: "Ayşe Tarım" },
  { id: "bot-kerem", ad: "Kerem Lojistik" },
  { id: "bot-selin", ad: "Selin Yapı" },
];

/** Bellek içi sahte sunucu. */
export class SahteBaglanti implements MulkBaglantisi {
  readonly ben: Oyuncu;
  private ilceler = new Map<string, Promise<IlceKaydi | null>>();
  private adlar = new Map<OyuncuId, string>();

  constructor(private s: SahteSecenekler) {
    this.ben = s.ben ?? { id: "ben", ad: "Sen" };
    for (const o of [this.ben, ...KOMSU_OYUNCULAR]) this.adlar.set(o.id, o.ad);
  }

  oyuncuAdi(id: OyuncuId): string {
    return this.adlar.get(id) ?? id;
  }

  private saat(): number {
    return this.s.saat ? this.s.saat() : Date.now();
  }

  private async bekle(): Promise<void> {
    const g = this.s.gecikme ?? 0;
    if (g > 0) await new Promise((coz) => setTimeout(coz, g));
  }

  private kayit(ilce: string): Promise<IlceKaydi | null> {
    let p = this.ilceler.get(ilce);
    if (!p) {
      p = this.s.izgaraAl(ilce).then((izgara) => {
        if (!izgara) return null;
        const say = izgaraSay(izgara);
        const sahiplik: IlceSahipligi = { ilce, hucreler: new Map(), uygun: say.uygun, satilmis: 0 };
        const k: IlceKaydi = { izgara, sahiplik };
        if (this.s.komsular !== false) this.komsulariSerp(k);
        return k;
      });
      this.ilceler.set(ilce, p);
    }
    return p;
  }

  /** Izgara merkezine yakın uygun hücrelerde 3 küçük komşu parsel (3×3'e kadar). Deterministik. */
  private komsulariSerp(k: IlceKaydi): void {
    const iz = k.izgara;
    const cx = iz.x0 + Math.floor(iz.genislik / 2);
    const cy = iz.y0 + Math.floor(iz.yukseklik / 2);
    const ofset: Array<[number, number]> = [
      [-14, -6],
      [9, 4],
      [-3, 12],
    ];
    ofset.forEach(([ox, oy], i) => {
      const o = KOMSU_OYUNCULAR[i]!;
      for (let dy = 0; dy < 3; dy++)
        for (let dx = 0; dx < 3; dx++) {
          const x = cx + ox + dx;
          const y = cy + oy + dy;
          const d = durumAl(iz, x, y);
          if (engelNedeni(d)) continue;
          const sinif = arsaSinifi(d);
          k.sahiplik.hucreler.set(hucreId(x, y), { sahip: o.id, sinif, degerMili: hucreFiyati(sinif, 0, k.sahiplik.uygun) * MILI, alinma: 0 });
          k.sahiplik.satilmis++;
        }
    });
  }

  async sahiplikAl(ilce: string): Promise<IlceSahipligi | null> {
    await this.bekle();
    const k = await this.kayit(ilce);
    if (!k) return null;
    const s = k.sahiplik;
    // Kopya: çağıran tarafın değişikliği sahte sunucu durumunu bozmasın.
    return { ...s, hucreler: new Map(s.hucreler) };
  }

  async parselAl(komut: ParselKomutu): Promise<ParselSonucu> {
    await this.bekle();
    const k = await this.kayit(komut.ilce);
    const red = (hata: ParselHatasi, hucre?: HucreId): ParselSonucu => ({ tamam: false, hata, mesaj: MESAJ[hata], ...(hucre ? { hucre } : {}) });
    if (!k) return red("izgara_yok");
    if (komut.hucreler.length === 0) return red("bos_secim");
    const s = k.sahiplik;
    const gorulen = new Set<HucreId>();
    for (const id of komut.hucreler) {
      const h = idCoz(id);
      if (!h) return red("gecersiz_hucre", id);
      if (gorulen.has(id)) return red("yinelenen", id);
      gorulen.add(id);
      const d = durumAl(k.izgara, h.x, h.y);
      const neden = engelNedeni(d);
      if (neden) return { tamam: false, hata: "uygunsuz", mesaj: `${MESAJ.uygunsuz}: ${neden}`, hucre: id };
      if (s.hucreler.has(id)) return red("sahipli", id);
      if (arsaSinifi(d) !== komut.sinif) return red("sinif_uyusmuyor", id);
    }
    const benim = new Set<HucreId>();
    for (const [id, h] of s.hucreler) if (h.sahip === this.ben.id) benim.add(id);
    if (!bitisikMi(komut.hucreler, benim)) return red("bitisik_degil");
    const sonra = benim.size + komut.hucreler.length;
    if (sonra > ILCE_HUCRE_SINIRI) return red("hucre_siniri");
    if (sonra > Math.floor(ILCE_PAY_SINIRI * s.uygun)) return red("pay_siniri");
    // Fiyat satın almadan önceki paya göre (tüm parti için aynı çarpan).
    const birim = hucreFiyati(komut.sinif, s.satilmis, s.uygun) * MILI;
    const t = this.saat();
    for (const id of komut.hucreler) s.hucreler.set(id, { sahip: this.ben.id, sinif: komut.sinif, degerMili: birim, alinma: t });
    s.satilmis += komut.hucreler.length;
    return { tamam: true, hucreler: [...komut.hucreler], toplamMili: birim * komut.hucreler.length, t };
  }
}

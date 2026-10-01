/**
 * "Sen yokken" dönüş özeti (docs/arastirma/donus-deneyimi.md §5.2, en küçük hâl D1): sunum katmanı sözleşmesi. Sunucu çekirdek
 * durumunu YALNIZ okuyarak bir `DonusOzeti` üretir (saf işlev `@bolge/sunucu` `donus/ozet.ts`); istemci şablonu yazar.
 *
 * - METİN YOKTUR: yalnız şablon anahtarı (`DONUS_SABLON`), değerler ve tohum (KVKK: olgu saklanır, metin render anında).
 * - Zaman alanları SİM zamanıdır (ms, dünya epoch'undan; `hosgeldin.simZamani` ile aynı eksen).
 * - Para ve miktarlar çekirdeğin ham birimleridir (mili-para, mili-birim).
 * - "Sunucu kapalıydı" satırı yoktur (§5.1 kural 5): kapalı süre yalnız bir yokluk süresidir.
 */
import { z } from "zod";

/** Yokluk bantları (§2.2); K0 (< 1 sa) için özet üretilmez. Bant sınırları sunucuda parametredir (`DonusEsikleri`). */
export const DONUS_BANTLARI = ["K1", "K2", "K3", "K4", "K5", "K6", "K7"] as const;
export type DonusBandi = (typeof DONUS_BANTLARI)[number];

/** Özet blokları (§2.3): B2 biten işler, B3 gelenler. (B4–B6 sonraki dilimler.) */
export type DonusBlogu = "B2" | "B3" | "B4" | "B5" | "B6";

/**
 * Şablon anahtarları (metinler istemcide, D5). `degerler` sırası yanındaki yorumdadır.
 * - `bitti.insaat`: tek biten iş. degerler: [tesisTuruKimligi | ekYapiKimligi | "olcek" | "kenar" | "onarim", ilce ya da bolge kimligi ("" olabilir)]
 * - `bitti.insaat.cok`: aynı türden çok biten iş toplandı. degerler: [adet, tür, ilkYer, ikinciYer?]
 * - `gelen.siparis`: gelen sipariş (yer tutucu; şimdilik üretilmez). degerler: kayıt değerleri.
 */
export const DONUS_SABLON = {
  bittiInsaat: "donus.bitti.insaat",
  bittiInsaatCok: "donus.bitti.insaat.cok",
  gelenSiparis: "donus.gelen.siparis",
} as const;
export type DonusSablonu = (typeof DONUS_SABLON)[keyof typeof DONUS_SABLON];

/** Net sonuç kalemleri: `satis + gider + diger = hazineFarki` (birebir; `diger` artıktır). Mili-para, işaretli. */
export interface DonusKalemleri {
  /** Satış geliri: ihracatın değeri farkı. */
  satis: number;
  /** Giderler (≤ 0): ithalat bedeli, komisyon, liman primi farkları. */
  gider: number;
  /** Diğer: hazine farkından kalan (vergi, bakım, inşaat bedeli, sözleşme, kamu siparişi ...). */
  diger: number;
}

export interface DonusMaddesi {
  blok: DonusBlogu;
  sablon: DonusSablonu;
  /** Aynı olgu aynı varyant: `fnv1a32(oyuncu, olguAnahtari, sablon)`. */
  tohum: number;
  degerler: (string | number)[];
  git?: { bolge?: number; panel?: string };
  /** 0..PPM; büyük olan önce. */
  onem: number;
}

/** Öneri (§2.5): şimdilik her zaman `null`; öneri motoru rehber B1'den gelecek. */
export interface DonusOnerisi {
  kural: 1 | 2 | 3 | 4 | 5 | 6;
  sablon: string;
  degerler: (string | number)[];
  neden: { sablon: string; degerler: (string | number)[] };
  git: { bolge?: number; panel?: string };
}

export interface DonusOzeti {
  surum: 1;
  bant: DonusBandi;
  /** Özet aralığı (sim ms): `[baslangicT, bitisT]`; bitisT = özetin üretildiği an. */
  aralik: { baslangicT: number; bitisT: number };
  net: {
    /** `hazine(şimdi) − hazine(sonGörülen)` (mili-para; işaretli). */
    hazineFarki: number;
    kalemler: DonusKalemleri;
    /** Aralıkta en çok üretilen mallar (≤ 3, azalan; mili-birim). */
    uretim: { mal: string; miktar: number }[];
  };
  maddeler: DonusMaddesi[];
  oneri: DonusOnerisi | null;
}

const tam = z.number().int();
const deger = z.union([z.string(), z.number()]);

export const DonusOzetiSemasi = z.object({
  surum: z.literal(1),
  bant: z.enum(DONUS_BANTLARI),
  aralik: z.object({ baslangicT: tam, bitisT: tam }),
  net: z.object({
    hazineFarki: tam,
    kalemler: z.object({ satis: tam, gider: tam, diger: tam }),
    uretim: z.array(z.object({ mal: z.string(), miktar: tam })).max(3),
  }),
  maddeler: z.array(
    z.object({
      blok: z.enum(["B2", "B3", "B4", "B5", "B6"]),
      sablon: z.enum([DONUS_SABLON.bittiInsaat, DONUS_SABLON.bittiInsaatCok, DONUS_SABLON.gelenSiparis]),
      tohum: tam,
      degerler: z.array(deger),
      git: z.object({ bolge: tam.optional(), panel: z.string().optional() }).optional(),
      onem: tam,
    }),
  ),
  oneri: z
    .object({
      kural: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
      sablon: z.string(),
      degerler: z.array(deger),
      neden: z.object({ sablon: z.string(), degerler: z.array(deger) }),
      git: z.object({ bolge: tam.optional(), panel: z.string().optional() }),
    })
    .nullable(),
});

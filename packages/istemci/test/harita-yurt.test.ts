/**
 * Yurt önce (B2; saf) ve ilk-yapı indirimi önizlemesi: yurt = kendi boş hücreleri; ilk yapı yurda sığıyorsa arsa gerekmez; sığmıyorsa
 * Tasarım metinleriyle neden; indirim çekirdekle aynı (S tabanından sabit tutar; para ve malzeme); ölçek büyütme indirimsizdir.
 */
import { describe, expect, it } from "vitest";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import type { HucreSahipligi, IlceSahipligi } from "../src/harita/baglanti";
import { Bit, hucreId } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { olcekHedefi } from "../src/harita/olcek";
import { indirimliTutar, yapiKatalogu, yerlesimPlani } from "../src/harita/yapi";
import type { YerlesimBaglami } from "../src/harita/yapi";
import { YURT_METIN, yurtBosHucreler, yurtPlani } from "../src/harita/yurt";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const katalog = yapiKatalogu(ic);
const ciftlik = katalog.find((y) => y.id === "ciftlik")!;
const celikhane = katalog.find((y) => y.id === "celikhane")!; // 3 hücre
const KIRSAL = Bit.ICERIDE | (1 << 5);
const X0 = 5000;
const Y0 = 7000;
const id = (i: number, j: number): string => hucreId(X0 + i, Y0 + j);

function izgara(): Izgara {
  const durum = new Uint8Array(30 * 20).fill(KIRSAL);
  return { x0: X0, y0: Y0, genislik: 30, yukseklik: 20, durum };
}

/** Yurt: 3×2 blok (10..12, 10..11). */
const YURT = [id(10, 10), id(11, 10), id(12, 10), id(10, 11), id(11, 11), id(12, 11)];
function sahiplik(ek: Array<[string, Partial<HucreSahipligi> & { sahip: string }]> = [], yurt = YURT): IlceSahipligi {
  const m = new Map<string, HucreSahipligi>();
  for (const h of yurt) m.set(h, { sahip: "ben", sinif: "kirsal", degerMili: 0, alinma: 0 });
  for (const [k, v] of ek) m.set(k, { sinif: "kirsal", degerMili: 0, alinma: 0, ...v });
  return { ilce: "i", hucreler: m, uygun: 500, satilmis: m.size };
}
function baglam(sh: IlceSahipligi, ek: Partial<YerlesimBaglami> = {}): YerlesimBaglami {
  return { izgara: izgara(), sahiplik: sh, ben: "ben", ad: (s) => s, hazineMili: 50_000_000, surenInsaat: 0, ...ek };
}

describe("yurt: kendi boş hücreleri", () => {
  it("tesis, inşaat ve yapı taşıyan hücreler yurt sayılmaz; sıralı", () => {
    const sh = sahiplik([[id(13, 10), { sahip: "ali" }]]);
    sh.hucreler.get(id(10, 10))!.tesis = 3;
    sh.hucreler.get(id(11, 10))!.insaat = 4;
    sh.yapilar = [{ id: 9, anahtar: "i9", durum: "insaat", sahip: "ben", hucreler: [id(12, 10)] }];
    expect(yurtBosHucreler(sh, "ben")).toEqual([id(10, 11), id(11, 11), id(12, 11)].sort());
    expect(yurtBosHucreler(null, "ben")).toEqual([]);
  });
});

describe("yurtPlani: ilk yapı yurda sığar mı", () => {
  it("çiftlik (2 hücre) 3×2 yurda sığar: arsa gerekmez, geçerli, deterministik", () => {
    const y = yurtPlani(ciftlik, baglam(sahiplik()));
    expect(y.plan?.gecerli).toBe(true);
    expect(y.plan?.alinacak).toEqual([]);
    expect(y.plan?.parseller).toEqual([]);
    expect(y.plan?.arsaMili).toBe(0);
    expect(y.bos).toBe(6);
    expect(y.plan!.hucreler.every((h) => h.benim)).toBe(true);
    expect(yurtPlani(ciftlik, baglam(sahiplik()))).toEqual(y);
  });

  it("çelikhane (3 hücre) yatay ya da dikey sığar; yurt 2 boş hücreye inince sığmıyor metni", () => {
    expect(yurtPlani(celikhane, baglam(sahiplik())).plan?.gecerli).toBe(true);
    const iki = yurtPlani(celikhane, baglam(sahiplik([], [id(10, 10), id(11, 10)])));
    expect(iki.plan).toBeUndefined();
    expect(iki.bos).toBe(2);
    expect(iki.neden).toBe(YURT_METIN.sigmiyor("Çelikhane", 3, 2));
    expect(iki.neden).toBe("Çelikhane 3 hücre ister, yurdunda 2 boş hücre kaldı.");
  });

  it("boş hücre yeter ama şekil sığmıyor (kopuk hücreler): yer yok metni", () => {
    const y = yurtPlani(ciftlik, baglam(sahiplik([], [id(10, 10), id(12, 12), id(14, 10)])));
    expect(y.plan).toBeUndefined();
    expect(y.neden).toBe("Yurdunda bu yapıya yer yok. Yanındaki arsayı alarak genişletebilirsin.");
  });

  it("yurtta ilk yapıdan sonra kalan hücrelere ikinci yapı yerleşir; hazine yetmezse şekil sığan plan nedeniyle döner", () => {
    const ilk = yurtPlani(ciftlik, baglam(sahiplik()));
    const sh = sahiplik();
    for (const h of ilk.plan!.hucreler) sh.hucreler.get(h.id)!.insaat = 1;
    const ikinci = yurtPlani(ciftlik, baglam(sh));
    expect(ikinci.plan?.gecerli).toBe(true);
    expect(ikinci.bos).toBe(4);
    const fakir = yurtPlani(ciftlik, baglam(sahiplik(), { hazineMili: 1_000_000 }));
    expect(fakir.plan?.gecerli).toBe(false);
    expect(fakir.plan?.neden).toMatch(/^Hazinede yeterli para yok/);
  });

  it("Tasarım metinleri birebir", () => {
    expect(YURT_METIN.baslik).toBe("Yurdun hazır");
    expect(YURT_METIN.aciklama(6)).toBe("Yurdun hazır: 6 hücre, ücretsiz. İlk yapın buraya sığar.");
    expect(YURT_METIN.aciklamaYapi("Çiftlik", 2, 6)).toBe("Çiftlik 2 hücre ister; yurdunda 6 boş hücre var.");
    expect(YURT_METIN.birincil).toBe("Yurdunda kur");
    expect(YURT_METIN.birincilNot).toBe("");
    expect(YURT_METIN.ikincil).toBe("Arsa satın al");
    expect(YURT_METIN.genislet).toBe("Genişlet: yanındaki arsayı al");
  });
});

describe("ilk-yapı indirimi önizlemesi (çekirdek yapiPlani aynası)", () => {
  const ppm = 300_000;

  it("indirimliTutar: S tabanından sabit tutar; q·(1-ppm) aşağı", () => {
    expect(indirimliTutar(6_000_000, ppm)).toBe(4_200_000);
    expect(indirimliTutar(30_000, ppm)).toBe(21_000);
    expect(indirimliTutar(10_000, ppm)).toBe(7_000);
    expect(indirimliTutar(1_001, ppm)).toBe(700); // ⌊700,7⌋ aşağı
  });

  it("hak varken para ve malzeme indirimli; hak yoksa ya da bilinmiyorsa tam bedel", () => {
    const var_ = yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sahiplik(), { indirim: { ppm, kalan: 5 } }));
    expect(var_.indirimli).toBe(true);
    expect(var_.yapiMili).toBe(4_200_000);
    expect(var_.malzeme.map((m) => m.miktar)).toEqual([21_000, 7_000]);
    expect(var_.toplamMili).toBe(var_.arsaMili + 4_200_000);
    const yok = yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sahiplik(), { indirim: { ppm, kalan: 0 } }));
    expect(yok).toMatchObject({ indirimli: false, yapiMili: 6_000_000 });
    expect(yok.malzeme.map((m) => m.miktar)).toEqual([30_000, 10_000]);
    const bilinmiyor = yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sahiplik()));
    expect(bilinmiyor).toMatchObject({ indirimli: false, yapiMili: 6_000_000 });
    expect(yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sahiplik(), { indirim: { ppm: 0, kalan: 5 } })).indirimli).toBe(false);
  });

  it("indirimle hazine yetmezlik sınırı indirimli tutardan hesaplanır", () => {
    const p = yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sahiplik(), { hazineMili: 4_200_000, indirim: { ppm, kalan: 1 } }));
    expect(p.gecerli).toBe(true);
    expect(yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sahiplik(), { hazineMili: 4_199_999, indirim: { ppm, kalan: 1 } })).hazineYetmez).toBe(true);
  });

  it("ölçek büyütme bedeli indirimsizdir (çekirdekte de): S → M 9.000 ₺ indirim hakkından bağımsız", () => {
    const tesis = { tur: "ciftlik", olcek: 0 as const, hucreler: [id(1, 1), id(2, 1)] };
    expect(olcekHedefi(ic, tesis, 1)!.paraMili).toBe(9_000_000);
    expect(olcekHedefi(ic, tesis, 1)!.malzeme.map((m) => m.miktar)).toEqual([45_000, 15_000]);
  });
});

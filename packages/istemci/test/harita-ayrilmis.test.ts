/**
 * Ayrılmış hücre fiyatı (saf): çekirdek `hucreFiyatiMili` aynası (taban fiyat, eğriyi ilerletmez, normal hücre
 * `satilmis - ayrilmisSatilmis + k`), hak koşulları, hazır arsa / yapı yerleşimi / ölçek büyütme planlarında ayrılmış hücre.
 * Ayrılmış OLMAYAN hücrede davranış eskisiyle aynıdır (`parselFiyatiMili`).
 */
import { describe, expect, it } from "vitest";
import { hucreFiyatiMili as cekirdekHucreFiyati, parselToplamFiyatiMili as cekirdekToplam } from "@bolge/cekirdek";
import type { DerlenmisIcerik } from "@bolge/cekirdek";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { arsaFiyati } from "../src/harita/arsa";
import type { Arsa } from "../src/harita/arsa";
import type { HucreSahipligi, IlceSahipligi } from "../src/harita/baglanti";
import { alimTuru, ayrilmisHakki, hucreFiyatiMili, parselFiyatiMili, parselToplamFiyatiMili, TABAN_FIYAT } from "../src/harita/fiyat";
import { Bit, hucreId } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { ekHucrePlani, olcekPlani } from "../src/harita/olcek";
import type { OlcekTesisi } from "../src/harita/olcek";
import { yapiKatalogu, yerlesimPlani } from "../src/harita/yapi";
import type { YerlesimBaglami } from "../src/harita/yapi";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const KIRSAL = Bit.ICERIDE | (1 << 5);
const KASABA = Bit.ICERIDE | (2 << 5);
const X0 = 5000;
const Y0 = 7000;
const id = (i: number, j: number): string => hucreId(X0 + i, Y0 + j);

function izgara(f: (i: number, j: number) => number = () => KIRSAL): Izgara {
  const durum = new Uint8Array(30 * 20);
  for (let j = 0; j < 20; j++) for (let i = 0; i < 30; i++) durum[j * 30 + i] = f(i, j);
  return { x0: X0, y0: Y0, genislik: 30, yukseklik: 20, durum };
}

function sahiplik(opts: { ayrilmis?: string[]; ayrilmisSatilmis?: number; satilmis?: number; uygun?: number; hucreler?: Array<[string, Partial<HucreSahipligi> & { sahip: string }]> } = {}): IlceSahipligi {
  const m = new Map<string, HucreSahipligi>();
  for (const [k, v] of opts.hucreler ?? []) m.set(k, { sinif: "kirsal", degerMili: 0, alinma: 0, ...v });
  return {
    ilce: "i",
    hucreler: m,
    uygun: opts.uygun ?? 500,
    satilmis: opts.satilmis ?? m.size,
    ...(opts.ayrilmis ? { ayrilmis: new Set(opts.ayrilmis) } : {}),
    ...(opts.ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis: opts.ayrilmisSatilmis } : {}),
  };
}

const VAR = { var: true } as const;
const YOK = { var: false, neden: "Bu hücre yeni oyunculara ayrılmış (katılımlarının ilk 14 günü)" } as const;

describe("fiyat: çekirdek hucreFiyatiMili aynası", () => {
  // Çekirdek işlevi gerçek içerikle derlenmiş parametreyle çağırmak yerine aynı biçimde kurulmuş minimal içerik
  const fiyatParam = (paramHam as unknown as { mulk: { hucreFiyati: Record<string, number>; satisPayiCarpaniPpm: number } }).mulk;
  const kcIc = { mulk: { p: fiyatParam } } as unknown as DerlenmisIcerik;
  const durumlar = [
    { uygun: 500, satilmis: 0 },
    { uygun: 500, satilmis: 37, ayrilmisSatilmis: 5 },
    { uygun: 123, satilmis: 80, ayrilmisSatilmis: 30 },
    { uygun: 480, satilmis: 200, ayrilmisSatilmis: 200 },
  ];

  it("normal ve ayrılmış hücre, k. hücre: çekirdekle birebir (mili-₺)", () => {
    for (const sinif of ["kirsal", "kasaba", "sehir"] as const)
      for (const d of durumlar)
        for (let k = 0; k < 4; k++) {
          expect(hucreFiyatiMili(sinif, d, k, false), `${sinif} ${JSON.stringify(d)} k=${k}`).toBe(cekirdekHucreFiyati(kcIc, { uygunHucre: d.uygun, satilmisHucre: d.satilmis, ...(d.ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis: d.ayrilmisSatilmis } : {}) }, sinif, k, false));
          expect(hucreFiyatiMili(sinif, d, k, true)).toBe(cekirdekHucreFiyati(kcIc, { uygunHucre: d.uygun, satilmisHucre: d.satilmis, ...(d.ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis: d.ayrilmisSatilmis } : {}) }, sinif, k, true));
        }
  });

  it("parselToplamFiyatiMili: normal + ayrılmış toplamı çekirdekle aynı", () => {
    for (const d of durumlar)
      for (const [n, a] of [[3, 0], [0, 2], [2, 3], [4, 1]] as const)
        expect(parselToplamFiyatiMili("kasaba", d, n, a)).toBe(cekirdekToplam(kcIc, { uygunHucre: d.uygun, satilmisHucre: d.satilmis, ...(d.ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis: d.ayrilmisSatilmis } : {}) }, "kasaba", n, a));
  });

  it("ayrılmış hücre taban fiyat ve eğriyi ilerletmez; ayrılmış satılan eğriden düşer", () => {
    expect(hucreFiyatiMili("kirsal", { uygun: 100, satilmis: 50 }, 3, true)).toBe(TABAN_FIYAT.kirsal * 1000);
    // 10 satılmışın 4'ü para ile alınmış ayrılmış: normal eğri 6 satılmış gibi ilerler
    expect(hucreFiyatiMili("kirsal", { uygun: 100, satilmis: 10, ayrilmisSatilmis: 4 }, 0)).toBe(parselFiyatiMili("kirsal", 6, 100, 1));
  });

  it("ayrılmış olmayan hücrede eski davranış: parselFiyatiMili ile aynı", () => {
    for (const adet of [1, 2, 5]) expect(parselToplamFiyatiMili("sehir", { uygun: 300, satilmis: 41 }, adet, 0)).toBe(parselFiyatiMili("sehir", 41, 300, adet));
  });
});

describe("ayrılmış hücre hakkı", () => {
  const g = { simZamani: 100, ayrilmisBitis: 1000, katilimIlcesi: "i", ilce: "i", yalnizKatilimIlcesi: true, gun: 14 };

  it("yeni oyuncu ve katılım ilçesinde var", () => {
    expect(ayrilmisHakki(g)).toEqual({ var: true });
  });

  it("hak bitti ya da yok: yeni oyunculara ayrılmış", () => {
    expect(ayrilmisHakki({ ...g, simZamani: 1000 })).toEqual({ var: false, neden: "Bu hücre yeni oyunculara ayrılmış (katılımlarının ilk 14 günü)" });
    expect(ayrilmisHakki({ ...g, ayrilmisBitis: null })).toMatchObject({ var: false });
  });

  it("katılım ilçesi dışında (kural açıksa) yok; kural kapalıysa var", () => {
    expect(ayrilmisHakki({ ...g, ilce: "baska" })).toEqual({ var: false, neden: "Ayrılmış hücre yalnız katılım ilçende satılır" });
    expect(ayrilmisHakki({ ...g, ilce: "baska", yalnizKatilimIlcesi: false })).toEqual({ var: true });
  });

  it("alimTuru: liste yoksa normal; ayrılmış + hak = ayrılmış; hak yoksa yasak (neden)", () => {
    const ay = new Set(["a"]);
    expect(alimTuru("a", undefined, VAR)).toEqual({ tur: "normal" });
    expect(alimTuru("b", ay, VAR)).toEqual({ tur: "normal" });
    expect(alimTuru("a", ay, VAR)).toEqual({ tur: "ayrilmis" });
    expect(alimTuru("a", ay, undefined)).toEqual({ tur: "ayrilmis" });
    expect(alimTuru("a", ay, YOK)).toEqual({ tur: "yasak", neden: YOK.neden });
  });
});

describe("hazır arsa (arsaFiyati)", () => {
  const arsa = (hucreler: string[]): Arsa => ({ kimlik: "arsa:1:1", hucreler, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, siniflar: { kirsal: hucreler.length }, baskin: "kirsal", arazi: 1 });
  const para = (m: number): string => `${Math.ceil(m / 1000)}`;
  const hepsiKirsal = (): "kirsal" => "kirsal";

  it("ayrılmış hücre taban, normal hücre eğriden; her adım sayaçları ilerletir (sınıf başına adım)", () => {
    const a = arsa([id(1, 1), id(2, 1), id(3, 1)]);
    const sayi = { uygun: 500, satilmis: 20, ayrilmisSatilmis: 6, benim: 0 };
    const o = arsaFiyati({ arsa: a, sinifAl: hepsiKirsal, sayi, ayrilmis: new Set([id(2, 1)]), hak: VAR, hazineMili: null, para });
    expect(o.engel).toBeNull();
    expect(o.adimlar).toHaveLength(1);
    expect(o.adimlar[0]!.ayrilmis).toBe(1);
    expect(o.mili).toBe(parselToplamFiyatiMili("kirsal", sayi, 2, 1));
    // ayrılmışsız aynı arsa eski formülle
    const o2 = arsaFiyati({ arsa: a, sinifAl: hepsiKirsal, sayi: { uygun: 500, satilmis: 20, benim: 0 }, hazineMili: null, para });
    expect(o2.mili).toBe(parselFiyatiMili("kirsal", 20, 500, 3));
  });

  it("iki sınıf: ikinci adımın eğrisi birinci adımın ilerlettiği sayaçlardan", () => {
    const a = arsa([id(1, 1), id(2, 1), id(3, 1)]);
    const sinif = (h: string): "kirsal" | "kasaba" => (h === id(3, 1) ? "kasaba" : "kirsal");
    const sayi = { uygun: 500, satilmis: 20, ayrilmisSatilmis: 2, benim: 0 };
    const o = arsaFiyati({ arsa: a, sinifAl: sinif, sayi, ayrilmis: new Set([id(1, 1)]), hak: VAR, hazineMili: null, para });
    const bir = parselToplamFiyatiMili("kirsal", sayi, 1, 1);
    const iki = parselToplamFiyatiMili("kasaba", { uygun: 500, satilmis: 22, ayrilmisSatilmis: 3 }, 1, 0);
    expect(o.mili).toBe(bir + iki);
  });

  it("hakkı olmayan oyuncuya ayrılmış hücre içeren arsa kapalı (neden); olmayan arsa etkilenmez", () => {
    const a = arsa([id(1, 1), id(2, 1)]);
    const sayi = { uygun: 500, satilmis: 20, benim: 0 };
    const o = arsaFiyati({ arsa: a, sinifAl: hepsiKirsal, sayi, ayrilmis: new Set([id(2, 1)]), hak: YOK, hazineMili: null, para });
    expect(o.engel).toBe(YOK.neden);
    const temiz = arsaFiyati({ arsa: arsa([id(5, 5), id(6, 5)]), sinifAl: hepsiKirsal, sayi, ayrilmis: new Set([id(2, 1)]), hak: YOK, hazineMili: null, para });
    expect(temiz.engel).toBeNull();
  });

  it("sınırlar ve hazine eskisi gibi", () => {
    const a = arsa([id(1, 1), id(2, 1)]);
    expect(arsaFiyati({ arsa: a, sinifAl: hepsiKirsal, sayi: { uygun: 500, satilmis: 0, benim: 72 }, hazineMili: null, para }).engel).toBe("İlçede en çok 72 hücren olabilir");
    expect(arsaFiyati({ arsa: a, sinifAl: hepsiKirsal, sayi: { uygun: 6, satilmis: 0, benim: 0 }, hazineMili: null, para }).engel).toBe("İlçenin en çok %25'i senin olabilir (1 hücre)");
    const pahali = arsaFiyati({ arsa: a, sinifAl: hepsiKirsal, sayi: { uygun: 500, satilmis: 0, benim: 0 }, hazineMili: 1000, para });
    expect(pahali.engel).toMatch(/^Hazinede yeterli para yok \(gereken \d+\)$/);
  });
});

describe("yapı yerleşimi (yerlesimPlani)", () => {
  const ciftlik = yapiKatalogu(ic).find((y) => y.id === "ciftlik")!;
  function baglam(sh: IlceSahipligi, hak?: { var: true } | { var: false; neden: string }): YerlesimBaglami {
    return { izgara: izgara(), sahiplik: sh, ben: "ben", ad: (s) => s, hazineMili: 100_000_000, surenInsaat: 0, ...(hak ? { ayrilmisHakki: hak } : {}) };
  }

  it("bir ayrılmış, bir normal hücre: arsa = taban + eğri; adımda ayrilmis=1", () => {
    const sh = sahiplik({ ayrilmis: [id(10, 10)], ayrilmisSatilmis: 3, satilmis: 12 });
    const p = yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sh, VAR));
    expect(p.gecerli).toBe(true);
    expect(p.alinacak).toEqual([id(10, 10), id(11, 10)]);
    expect(p.parseller).toHaveLength(1);
    expect(p.parseller[0]).toMatchObject({ sinif: "kirsal", ayrilmis: 1 });
    expect(p.arsaMili).toBe(parselToplamFiyatiMili("kirsal", { uygun: 500, satilmis: 12, ayrilmisSatilmis: 3 }, 1, 1));
    expect(p.toplamMili).toBe(p.arsaMili + p.yapiMili);
  });

  it("hakkı olmayan oyuncuda ayrılmış hücre geçersiz (çekirdeğin reddi); ayrılmışsız yerleşim değişmez", () => {
    const sh = sahiplik({ ayrilmis: [id(10, 10)], satilmis: 12 });
    const p = yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sh, YOK));
    expect(p.gecerli).toBe(false);
    expect(p.neden).toBe(YOK.neden);
    const q = yerlesimPlani(ciftlik, X0 + 14, Y0 + 10, 0, baglam(sh, YOK));
    expect(q.gecerli).toBe(true);
    expect(q.arsaMili).toBe(parselFiyatiMili("kirsal", 12, 500, 2)); // eski formül
  });

  it("liste bilinmiyorsa (tanımsız) hepsi normal sayılır: eski davranış", () => {
    const p = yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, baglam(sahiplik({ satilmis: 12 })));
    expect(p.arsaMili).toBe(parselFiyatiMili("kirsal", 12, 500, 2));
  });

  it("iki sınıf: ikinci adımın sayaçları birincinin ilerlettiği değerler", () => {
    const iz = izgara((i) => (i >= 11 ? KASABA : KIRSAL));
    const sh = sahiplik({ ayrilmis: [id(10, 10)], satilmis: 12, ayrilmisSatilmis: 1 });
    const p = yerlesimPlani(ciftlik, X0 + 10, Y0 + 10, 0, { ...baglam(sh, VAR), izgara: iz });
    expect(p.parseller.map((x) => x.sinif)).toEqual(["kirsal", "kasaba"]);
    expect(p.parseller[0]!.mili).toBe(parselToplamFiyatiMili("kirsal", { uygun: 500, satilmis: 12, ayrilmisSatilmis: 1 }, 0, 1));
    expect(p.parseller[1]!.mili).toBe(parselToplamFiyatiMili("kasaba", { uygun: 500, satilmis: 13, ayrilmisSatilmis: 2 }, 1, 0));
  });
});

describe("ölçek büyütme (G2) ve ayrılmış hücre", () => {
  const TESIS: OlcekTesisi = { anahtar: "t7", id: 7, tur: "ciftlik", ad: "Çiftlik", hucreler: [id(10, 10), id(11, 10)], olcek: 0 };
  const tesisHucreleri: Array<[string, Partial<HucreSahipligi> & { sahip: string }]> = [
    [id(10, 10), { sahip: "ben", tesis: 7 }],
    [id(11, 10), { sahip: "ben", tesis: 7 }],
  ];
  /** Tesisin çevresi yol; yalnız (12,10) açık. */
  const dar = (): Izgara => izgara((i, j) => (i === 12 && j === 10 ? KIRSAL : i === 10 || i === 11 ? (j === 10 ? KIRSAL : Bit.ICERIDE | Bit.YOL) : Bit.ICERIDE | Bit.YOL));

  it("tek aday ayrılmış hücre: hakkı varsa taban fiyat; yoksa okunur neden", () => {
    const sh = sahiplik({ hucreler: tesisHucreleri, ayrilmis: [id(12, 10)], ayrilmisSatilmis: 2, satilmis: 9 });
    const var_ = ekHucrePlani({ tesis: TESIS, gereken: 1, izgara: dar(), sahiplik: sh, ben: "ben", ad: (s) => s, ayrilmisHakki: VAR });
    expect(var_).toEqual({ ekHucreler: [id(12, 10)], sinif: "kirsal", arsaMili: TABAN_FIYAT.kirsal * 1000 });
    const yok = ekHucrePlani({ tesis: TESIS, gereken: 1, izgara: dar(), sahiplik: sh, ben: "ben", ad: (s) => s, ayrilmisHakki: YOK });
    expect("neden" in yok).toBe(true);
    if ("neden" in yok) expect(yok.neden).toContain(YOK.neden);
  });

  it("olcekPlani: toplam = ayrılmış taban + yükseltme; ayrılmışsız hücre eski formül", () => {
    const sh = sahiplik({ hucreler: tesisHucreleri, ayrilmis: [id(12, 10)], satilmis: 9 });
    const p = olcekPlani({ ic, tesis: TESIS, hedef: 1, izgara: dar(), sahiplik: sh, ben: "ben", ad: (s) => s, hazineMili: 100_000_000, surenInsaat: 0, ayrilmisHakki: VAR });
    expect(p.gecerli).toBe(true);
    expect(p.arsaMili).toBe(TABAN_FIYAT.kirsal * 1000);
    expect(p.toplamMili).toBe(TABAN_FIYAT.kirsal * 1000 + 9_000_000);
    const normal = olcekPlani({ ic, tesis: TESIS, hedef: 1, izgara: dar(), sahiplik: sahiplik({ hucreler: tesisHucreleri, satilmis: 9 }), ben: "ben", ad: (s) => s, hazineMili: 100_000_000, surenInsaat: 0 });
    expect(normal.arsaMili).toBe(parselFiyatiMili("kirsal", 9, 500, 1));
  });
});

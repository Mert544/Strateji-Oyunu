/**
 * Ölçek büyütme planı (G2; saf): hedef bedeli çekirdekle aynı yuvarlama, ek hücre seçimi (kendi boşu önce, bitişiklik, tek
 * sınıf, kamu/engel/başkasının hücresi hariç, okunur neden, determinizm) ve tam plan (hazine, stok, sınırlar).
 */
import { describe, expect, it } from "vitest";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { SahteBaglanti } from "../src/harita/baglanti";
import type { HucreSahipligi, IlceSahipligi, IsletmeYapisi, YapiKaydi } from "../src/harita/baglanti";
import { bitisikMi, parselFiyatiMili } from "../src/harita/fiyat";
import { Bit, hucreId } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { carpBol, ekHucrePlani, mevcutOlcek, olcekAyakIzi, olcekBuyutulebilir, olcekHedefi, olcekHedefleri, olcekPlani, olcekTesisi } from "../src/harita/olcek";
import type { EkHucreGirdisi, OlcekGirdisi, OlcekTesisi } from "../src/harita/olcek";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);

const KIRSAL = Bit.ICERIDE | (1 << 5);
const KASABA = Bit.ICERIDE | (2 << 5);
const YOL = Bit.ICERIDE | Bit.YOL | (1 << 5);
const X0 = 5000;
const Y0 = 7000;
const G = 30;
const Y = 20;

type Alan = (i: number, j: number) => number;
function izgara(f: Alan = () => KIRSAL): Izgara {
  const durum = new Uint8Array(G * Y);
  for (let j = 0; j < Y; j++) for (let i = 0; i < G; i++) durum[j * G + i] = f(i, j);
  return { x0: X0, y0: Y0, genislik: G, yukseklik: Y, durum };
}
const id = (i: number, j: number): string => hucreId(X0 + i, Y0 + j);

/** Tesis (ciftlik, S): (10,10) ve (11,10). Not: ciftlik ayak izi [2, 3, 4]. */
const TESIS: OlcekTesisi = { anahtar: "t7", id: 7, tur: "ciftlik", ad: "Çiftlik", hucreler: [id(10, 10), id(11, 10)], olcek: 0 };

function sahiplik(ek: Array<[string, Partial<HucreSahipligi> & { sahip: string }]> = [], yapilar: YapiKaydi[] = [], uygun = 500, satilmis?: number): IlceSahipligi {
  const m = new Map<string, HucreSahipligi>();
  for (const h of TESIS.hucreler) m.set(h, { sahip: "ben", sinif: "kirsal", degerMili: 0, alinma: 0, tesis: 7 });
  for (const [k, v] of ek) m.set(k, { sinif: "kirsal", degerMili: 0, alinma: 0, ...v });
  return { ilce: "i", hucreler: m, uygun, satilmis: satilmis ?? m.size, yapilar };
}

function girdi(gereken: number, o: Partial<EkHucreGirdisi> = {}): EkHucreGirdisi {
  return { tesis: TESIS, gereken, izgara: izgara(), sahiplik: sahiplik(), ben: "ben", ad: (s) => (s === "ali" ? "Ali" : s), ...o };
}

describe("ölçek verisi", () => {
  it("ayak izi parametreden; ek yapı ve bilinmeyen tür ölçeklenemez", () => {
    expect(olcekAyakIzi(ic, "ciftlik")).toEqual([2, 3, 4]);
    expect(olcekAyakIzi(ic, "mera")).toEqual([3, 4, 5]);
    expect(olcekAyakIzi(ic, "ambar")).toBeNull();
    expect(olcekAyakIzi(ic, "yok_boyle_tur")).toBeNull();
  });

  it("ölçek: karede varsa o, yoksa ayak izinden (en büyük k)", () => {
    const izi = [2, 3, 4] as const;
    expect(mevcutOlcek(izi, 2)).toBe(0);
    expect(mevcutOlcek(izi, 3)).toBe(1);
    expect(mevcutOlcek(izi, 4)).toBe(2);
    expect(mevcutOlcek(izi, 5)).toBe(2);
    expect(mevcutOlcek(izi, 2, 1)).toBe(1); // karedeki değer üstün (eski dünyada M tesisi S ayak iziyle durabilir)
    expect(mevcutOlcek(izi, 4, 0)).toBe(0);
  });

  it("büyütülebilir tesis: yalnız biten, türü bilinen, ölçeklenebilir ve L olmayan", () => {
    const y = (o: Partial<YapiKaydi>): YapiKaydi => ({ id: 3, anahtar: "t3", durum: "tesis", sahip: "ben", hucreler: [id(1, 1), id(2, 1)], tur: "ciftlik", ...o });
    const ad = (t: string): string => (t === "ciftlik" ? "Çiftlik" : t);
    expect(olcekTesisi(ic, y({}), ad)).toMatchObject({ anahtar: "t3", id: 3, tur: "ciftlik", ad: "Çiftlik", olcek: 0 });
    expect(olcekTesisi(ic, y({ hucreler: [id(1, 1), id(2, 1), id(3, 1)] }), ad)?.olcek).toBe(1);
    expect(olcekTesisi(ic, y({ hucreler: [id(1, 1), id(2, 1), id(3, 1), id(4, 1)] }), ad)).toBeNull(); // L
    expect(olcekTesisi(ic, y({ durum: "insaat", anahtar: "i3" }), ad)).toBeNull();
    expect(olcekTesisi(ic, y({ tur: "ambar" }), ad)).toBeNull();
    expect(olcekTesisi(ic, y({ tur: undefined }), ad)).toBeNull();
  });
});

describe("hedef bedeli: çekirdekle aynı yuvarlama (tür inşa bedeli × insaPpm farkı, aşağı)", () => {
  it("çiftlik S → M ×1,5 · S → L ×3,5 · M → L ×2: para, malzeme, süre", () => {
    const sM = olcekHedefi(ic, TESIS, 1)!;
    expect(sM).toMatchObject({ olcek: 1, ad: "M", hucre: 3, ek: 1, paraMili: 9_000_000 });
    expect(sM.malzeme).toEqual([
      { id: "celik", ad: "Çelik", miktar: 45_000 },
      { id: "parca", ad: "Makine parçası", miktar: 15_000 },
    ]);
    expect(sM.sureSaat).toBe(2); // tür inşa süresi (4 sa; mülk kipi yapı süresi değil) × olcekYukseltmeSureCarpaniPpm 0,5
    expect(sM).not.toHaveProperty("ilkGunSureSaat"); // erken oyun süresi hedefte değil: protokol çarpanından (yapi-sure.ts)
    const sL = olcekHedefi(ic, TESIS, 2)!;
    expect(sL).toMatchObject({ ad: "L", hucre: 4, ek: 2, paraMili: 21_000_000 });
    expect(sL.malzeme.map((m) => m.miktar)).toEqual([105_000, 35_000]);
    const m: OlcekTesisi = { ...TESIS, hucreler: [...TESIS.hucreler, id(12, 10)], olcek: 1 };
    const mL = olcekHedefi(ic, m, 2)!;
    expect(mL).toMatchObject({ paraMili: 12_000_000, ek: 1 });
    expect(mL.malzeme.map((x) => x.miktar)).toEqual([60_000, 20_000]);
  });

  it("hedef zaten ya da küçükse null; hedefler listesi küçükten büyüğe", () => {
    expect(olcekHedefi(ic, TESIS, 1)).not.toBeNull();
    expect(olcekHedefi(ic, { ...TESIS, olcek: 1 }, 1)).toBeNull();
    expect(olcekHedefleri(ic, TESIS).map((h) => h.ad)).toEqual(["M", "L"]);
    expect(olcekHedefleri(ic, { ...TESIS, olcek: 1, hucreler: [...TESIS.hucreler, id(12, 10)] }).map((h) => h.ad)).toEqual(["L"]);
  });

  it("ek hücre gereği tesisin GERÇEK hücre sayısından (eski dünyada M tesisi S ayak iziyle durabilir)", () => {
    const eski: OlcekTesisi = { ...TESIS, olcek: 1 }; // M ama yalnız 2 hücre
    expect(olcekHedefi(ic, eski, 2)!.ek).toBe(2);
  });

  it("carpBol: güvenli aralıkta kayan nokta yok; taşmada BigInt", () => {
    expect(carpBol(6_000_000, 1_500_000, 1_000_000)).toBe(9_000_000);
    expect(carpBol(7, 1_500_000, 1_000_000)).toBe(10); // 10,5 → aşağı
    expect(carpBol(9_007_199_254_740_000, 3_500_000, 1_000_000)).toBe(31_525_197_391_590_000);
  });
});

describe("ekHucrePlani: hücre seçimi", () => {
  it("ek hücre gerekmiyorsa boş plan", () => {
    expect(ekHucrePlani(girdi(0))).toEqual({ ekHucreler: [], arsaMili: 0 });
  });

  it("sahipsiz bitişik hücre seçilir; arsa fiyatı fiyat.ts ile aynı (artımlı); sınıf döner", () => {
    const g = girdi(2);
    const p = ekHucrePlani(g);
    if ("neden" in p) throw new Error(p.neden);
    expect(p.ekHucreler).toHaveLength(2);
    expect(p.sinif).toBe("kirsal");
    expect(p.arsaMili).toBe(parselFiyatiMili("kirsal", g.sahiplik.satilmis, g.sahiplik.uygun, 2));
    expect(bitisikMi([...TESIS.hucreler, ...p.ekHucreler])).toBe(true);
  });

  it("oyuncunun BOŞ hücresi önce: sahipsiz ucuz olsa bile; arsa 0, sınıf yok", () => {
    const g = girdi(1, { sahiplik: sahiplik([[id(10, 11), { sahip: "ben" }]]) });
    const p = ekHucrePlani(g);
    expect(p).toEqual({ ekHucreler: [id(10, 11)], arsaMili: 0 });
  });

  it("kendi boşu ve sahipsiz karışırsa önce kendi boşu, kalanı sahipsizden", () => {
    const g = girdi(2, { sahiplik: sahiplik([[id(12, 10), { sahip: "ben" }]]) });
    const p = ekHucrePlani(g);
    if ("neden" in p) throw new Error(p.neden);
    expect(p.ekHucreler).toContain(id(12, 10));
    expect(p.ekHucreler).toHaveLength(2);
    expect(p.sinif).toBe("kirsal");
    expect(p.arsaMili).toBe(parselFiyatiMili("kirsal", g.sahiplik.satilmis, g.sahiplik.uygun, 1));
  });

  it("kendi hücresi tesis ya da inşaat taşıyorsa BOŞ sayılmaz", () => {
    const sh = sahiplik([
      [id(10, 11), { sahip: "ben", insaat: 9 }],
      [id(11, 11), { sahip: "ben", tesis: 4 }],
    ]);
    const p = ekHucrePlani(girdi(1, { sahiplik: sh }));
    if ("neden" in p) throw new Error(p.neden);
    expect(p.ekHucreler[0]).not.toBe(id(10, 11));
    expect(p.ekHucreler[0]).not.toBe(id(11, 11));
  });

  it("yapı kaydındaki hücre de boş sayılmaz (işaretsiz yapı hücresi)", () => {
    const yapilar: YapiKaydi[] = [{ id: 5, anahtar: "i5", durum: "insaat", sahip: "ben", hucreler: [id(10, 9)] }];
    const sh = sahiplik([[id(10, 9), { sahip: "ben" }]], yapilar);
    const p = ekHucrePlani(girdi(1, { sahiplik: sh }));
    if ("neden" in p) throw new Error(p.neden);
    expect(p.ekHucreler).not.toContain(id(10, 9));
  });

  it("karışık sınıftan kaçınır: sahipsizler tek sınıfta; en ucuz sınıf seçilir", () => {
    // Doğu (x ≥ 12) kasaba, batı (x ≤ 9) kırsal; her iki tarafta da yeterli yer var, kuzey ve güney yol (engel)
    const iz = izgara((i, j) => (j === 9 || j === 11 ? YOL : i >= 12 ? KASABA : KIRSAL));
    const p = ekHucrePlani(girdi(2, { izgara: iz }));
    if ("neden" in p) throw new Error(p.neden);
    expect(p.sinif).toBe("kirsal");
    expect(p.ekHucreler.every((h) => Number(h.split(":")[0]) < X0 + 10)).toBe(true);
    const kasabaFiyati = parselFiyatiMili("kasaba", 2, 500, 2);
    expect(p.arsaMili).toBeLessThan(kasabaFiyati);
  });

  it("tek sınıf gereksinimi: yalnız karışık tamamlanıyorsa okunur neden (bölünmüş sınıf)", () => {
    // Çevre yol; yalnız (12,10) kırsal ve (13,10) kasaba açık
    const iz = izgara((i, j) => (j === 10 && i === 12 ? KIRSAL : j === 10 && i === 13 ? KASABA : YOL));
    const p = ekHucrePlani(girdi(2, { izgara: iz }));
    expect(p).toMatchObject({ neden: expect.stringContaining("tek arsa sınıfından") });
  });

  it("kamu arsası, engel, başkasının hücresi hariç; hepsi kapalıysa nedenler okunur", () => {
    // Doğu: kamu; kuzey: yol; güney: Ali'nin hücresi; batı: yol
    const kamu = (h: string): string | null => (h === id(12, 10) ? "Kamu arsası (meydan): satılmaz" : null);
    const iz = izgara((i, j) => ((i === 9 && j === 10) || j === 9 ? YOL : KIRSAL));
    const sh = sahiplik([
      [id(10, 11), { sahip: "ali" }],
      [id(11, 11), { sahip: "ali" }],
    ]);
    const p = ekHucrePlani(girdi(1, { izgara: iz, sahiplik: sh, kamu }));
    expect("neden" in p).toBe(true);
    if (!("neden" in p)) return;
    expect(p.neden).toContain("1 bitişik uygun hücre bulunamadı");
    expect(p.neden).toMatch(/Yol tamponu/);
    expect(p.neden).toMatch(/Sahibi: Ali/);
    expect(p.neden).toMatch(/Kamu arsası/);
  });

  it("yalnız çapraz komşu varsa bitişik sayılmaz (kenar-bitişik)", () => {
    // Her kenar komşusu yol; yalnız çapraz (12,11) açık
    const iz = izgara((i, j) => (i === 12 && j === 11 ? KIRSAL : YOL));
    const p = ekHucrePlani(girdi(1, { izgara: iz }));
    expect("neden" in p).toBe(true);
  });

  it("ikinci hücre birinci seçilene bitişik olabilir (tesisle birlikte tek küme)", () => {
    // Tesisin çevresi yol, yalnız doğuda tek sıra: (12,10), (13,10)
    const iz = izgara((i, j) => (j === 10 && (i === 12 || i === 13) ? KIRSAL : YOL));
    const p = ekHucrePlani(girdi(2, { izgara: iz }));
    if ("neden" in p) throw new Error(p.neden);
    expect([...p.ekHucreler].sort()).toEqual([id(12, 10), id(13, 10)]);
    expect(bitisikMi([...TESIS.hucreler, ...p.ekHucreler])).toBe(true);
  });

  it("ilçe ızgarası dışı hücre seçilmez", () => {
    const iz = izgara((i) => (i <= 11 ? KIRSAL : 0)); // doğu ilçe dışı (ICERIDE yok)
    const p = ekHucrePlani(girdi(1, { izgara: iz }));
    if ("neden" in p) throw new Error(p.neden);
    expect(Number(p.ekHucreler[0]!.split(":")[0])).toBeLessThanOrEqual(X0 + 11);
  });

  it("determinizm: aynı girdi aynı çıktı; sahiplik ekleme sırası etkilemez; sonuç kimliğe göre sıralı", () => {
    const sira1: Array<[string, Partial<HucreSahipligi> & { sahip: string }]> = [
      [id(12, 10), { sahip: "ben" }],
      [id(9, 10), { sahip: "ben" }],
      [id(10, 12), { sahip: "ali" }],
    ];
    const a = ekHucrePlani(girdi(2, { sahiplik: sahiplik(sira1) }));
    const b = ekHucrePlani(girdi(2, { sahiplik: sahiplik(sira1) }));
    const c = ekHucrePlani(girdi(2, { sahiplik: sahiplik([...sira1].reverse()) }));
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    if ("neden" in a) throw new Error(a.neden);
    expect(a.ekHucreler).toEqual([...a.ekHucreler].sort());
    // eşit adaylarda kimlik sırası: iki kendi boşundan kimliği küçük olan
    const k = ekHucrePlani(girdi(1, { sahiplik: sahiplik([[id(12, 10), { sahip: "ben" }], [id(9, 10), { sahip: "ben" }]]) }));
    expect(k).toEqual({ ekHucreler: [id(12, 10) < id(9, 10) ? id(12, 10) : id(9, 10)], arsaMili: 0 });
  });
});

describe("olcekPlani: bedel ve sınırlar", () => {
  function plan(hedef: 1 | 2, o: Partial<OlcekGirdisi> = {}): ReturnType<typeof olcekPlani> {
    return olcekPlani({ ic, tesis: TESIS, hedef, izgara: izgara(), sahiplik: sahiplik(), ben: "ben", ad: (s) => s, hazineMili: 100_000_000, surenInsaat: 0, ...o });
  }

  it("S → M: 1 ek hücre; toplam = arsa + yükseltme parası; malzeme ayrı", () => {
    const p = plan(1);
    expect(p.gecerli).toBe(true);
    expect(p.neden).toBeNull();
    expect(p.ekHucreler).toHaveLength(1);
    expect(p.alinacak).toEqual(p.ekHucreler);
    expect(p.sinif).toBe("kirsal");
    expect(p.yapiMili).toBe(9_000_000);
    expect(p.arsaMili).toBe(parselFiyatiMili("kirsal", 2, 500, 1));
    expect(p.toplamMili).toBe(p.arsaMili + p.yapiMili);
    expect(p.hedef.malzeme.map((m) => m.miktar)).toEqual([45_000, 15_000]);
  });

  it("kendi boş hücresi yeterliyse arsa 0 ve alınacak yok", () => {
    const p = plan(1, { sahiplik: sahiplik([[id(12, 10), { sahip: "ben" }]]) });
    expect(p).toMatchObject({ gecerli: true, arsaMili: 0, alinacak: [], ekHucreler: [id(12, 10)], toplamMili: 9_000_000 });
    expect(p.sinif).toBeUndefined();
  });

  it("ek hücre gerekmiyorsa (eski dünya) ekHucreler boş", () => {
    const eski: OlcekTesisi = { ...TESIS, hucreler: [...TESIS.hucreler, id(12, 10)], olcek: 0 }; // S ama 3 hücre
    const p = plan(1, { tesis: eski });
    expect(p).toMatchObject({ gecerli: true, ekHucreler: [], arsaMili: 0, toplamMili: 9_000_000 });
  });

  it("hazine yetmezse neden (arsa + yükseltme toplamı), maliyet yine gösterilir", () => {
    const p = plan(1, { hazineMili: 9_000_000 });
    expect(p.gecerli).toBe(false);
    expect(p.neden).toMatch(/^Hazinede yeterli para yok \(gereken 10\.\d{3}\u00a0₺\)$/);
    expect(p.toplamMili).toBeGreaterThan(9_000_000);
  });

  it("hazine bilinmiyorsa kontrol atlanır; depoda malzeme yoksa neden", () => {
    expect(plan(1, { hazineMili: null }).gecerli).toBe(true);
    const yok = plan(1, { stok: (m) => (m === "celik" ? 10_000 : 1_000_000) });
    expect(yok).toMatchObject({ gecerli: false, neden: "Depoda yeterli çelik yok" });
    expect(plan(1, { stok: () => null }).gecerli).toBe(true);
    expect(plan(1, { stok: () => 1_000_000 }).gecerli).toBe(true);
  });

  it("eşzamanlı inşaat sınırı ve 72 hücre / %25 sınırı", () => {
    expect(plan(1, { surenInsaat: 2 })).toMatchObject({ gecerli: false, neden: "Aynı anda en çok 2 inşaat sürebilir" });
    expect(plan(1, { surenInsaat: 2, esZamanliInsaat: 3 }).gecerli).toBe(true);
    // uygun 8 hücre: %25 = 2; ben zaten 2 hücrede (tesis)
    const dar = plan(1, { sahiplik: sahiplik([], [], 8) });
    expect(dar.neden).toBe("İlçenin en çok %25'i senin olabilir (2 hücre)");
    // kendi boş hücresi tavana yeni hücre eklemez
    expect(plan(1, { sahiplik: sahiplik([[id(12, 10), { sahip: "ben" }]], [], 8) }).gecerli).toBe(true);
  });

  it("hedef ölçek geçersiz: zaten bu ölçekte; büyütülemeyen tür", () => {
    expect(plan(1, { tesis: { ...TESIS, olcek: 1 } })).toMatchObject({ gecerli: false, neden: "Tesis zaten bu ölçekte ya da daha büyük." });
    expect(plan(1, { tesis: { ...TESIS, tur: "ambar" } })).toMatchObject({ gecerli: false, neden: "Bu yapı büyütülemez." });
  });

  it("hücre bulunamazsa neden plana taşınır (maliyet yine hesaplı)", () => {
    const p = plan(1, { izgara: izgara(() => YOL) });
    expect(p.gecerli).toBe(false);
    expect(p.neden).toMatch(/bitişik uygun hücre bulunamadı/);
    expect(p.yapiMili).toBe(9_000_000);
    expect(p.ekHucreler).toEqual([]);
  });

  it("determinizm: aynı girdi aynı plan", () => {
    expect(plan(2)).toEqual(plan(2));
  });
});

describe("olcekBuyutulebilir: İşletmem satırında \"Büyüt\"", () => {
  const satir = (o: Partial<IsletmeYapisi> = {}): IsletmeYapisi => ({ anahtar: "t3", durum: "tesis", tur: "ciftlik", ilce: "i", hucre: 2, aktif: true, verimPpm: 1_000_000, ...o });

  it("biten, ilçesi ve hücre sayısı bilinen, ölçeklenebilir, L olmayan tesiste görünür", () => {
    expect(olcekBuyutulebilir(ic, satir(), [])).toBe(true);
    expect(olcekBuyutulebilir(ic, satir({ hucre: 3 }), [])).toBe(true); // M → L
    expect(olcekBuyutulebilir(ic, satir({ hucre: 4 }), [])).toBe(false); // L
    expect(olcekBuyutulebilir(ic, satir({ hucre: 2, olcek: 2 }), [])).toBe(false); // karedeki ölçek üstün
  });

  it("inşaat, ilçesiz/hücre sayısız satır, ek yapı ve süren büyütmesi olan tesiste görünmez", () => {
    expect(olcekBuyutulebilir(ic, satir({ durum: "insaat", anahtar: "i3" }), [])).toBe(false);
    expect(olcekBuyutulebilir(ic, satir({ ilce: undefined }), [])).toBe(false);
    expect(olcekBuyutulebilir(ic, satir({ hucre: undefined }), [])).toBe(false);
    expect(olcekBuyutulebilir(ic, satir({ tur: "ambar" }), [])).toBe(false);
    const buyuyor = satir({ anahtar: "i9", durum: "insaat", yukseltme: { tesis: 3, olcek: 1 } });
    expect(olcekBuyutulebilir(ic, satir(), [satir(), buyuyor])).toBe(false);
    // başka tesisin büyütmesi bunu etkilemez
    expect(olcekBuyutulebilir(ic, satir({ anahtar: "t4" }), [satir(), buyuyor])).toBe(true);
  });
});

describe("sahte bağdaştırıcı: ölçek büyütme (sunucusuz kip)", () => {
  const ILCE = "sahte_ilce";
  function kur(hazineMili = 100_000_000): { b: SahteBaglanti; ilerle: (saat: number) => void } {
    let simdi = Date.now();
    const b = new SahteBaglanti({
      izgaraAl: async () => izgara(),
      gecikme: 0,
      komsular: false,
      hazineMili,
      saat: () => simdi,
      simHizi: 3600, // 1 gerçek saniye = 1 sim saati
      yapiBilgisi: (tur) => (tur === "ciftlik" ? { yuva: 2, paraMili: 6_000_000, sureSaat: 2 } : null),
      olcekBilgisi: (tur, hedef, hucreSayisi) => {
        const izi = olcekAyakIzi(ic, tur);
        if (!izi) return null;
        const h = olcekHedefi(ic, { tur, olcek: mevcutOlcek(izi, hucreSayisi), hucreler: Array.from({ length: hucreSayisi }, () => "") }, hedef);
        return h ? { ek: h.ek, paraMili: h.paraMili, sureSaat: h.sureSaat } : null;
      },
    });
    return { b, ilerle: (saat) => (simdi += saat * 1000) };
  }
  const BOLGE = `il#${"ben"}`;

  it("S → M: arsa + büyütme tek işlemde; süren büyütme görünür; bitince tesis M ayak izi", async () => {
    const { b, ilerle } = kur();
    const cift = [id(10, 10), id(11, 10)];
    expect((await b.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: cift, sinif: "kirsal" })).tamam).toBe(true);
    expect((await b.tesisInsa({ tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: cift })).tamam).toBe(true);
    ilerle(10);
    let sh = (await b.sahiplikAl(ILCE))!;
    const kayit = sh.yapilar!.find((y) => y.durum === "tesis")!;
    const plan = olcekPlani({ ic, tesis: olcekTesisi(ic, kayit, () => "Çiftlik")!, hedef: 1, izgara: izgara(), sahiplik: sh, ben: "ben", ad: (x) => x, hazineMili: b.ozet().hazineMili, surenInsaat: 0 });
    expect(plan.gecerli).toBe(true);
    const hazineOnce = b.ozet().hazineMili!;
    const r = await b.olcekYukselt({ bolge: BOLGE, tesis: kayit.id, olcek: 1, ekHucreler: plan.ekHucreler, ...(plan.sinif ? { sinif: plan.sinif } : {}) });
    expect(r.tamam).toBe(true);
    expect(hazineOnce - b.ozet().hazineMili!).toBe(plan.toplamMili);
    // süren büyütme: işletmede ve sahiplikte satır; tesis hâlâ S
    expect(b.isletme().yapilar.find((y) => y.yukseltme)).toMatchObject({ durum: "insaat", tur: "ciftlik", hucre: 1, yukseltme: { tesis: kayit.id, olcek: 1 } });
    sh = (await b.sahiplikAl(ILCE))!;
    expect(sh.yapilar!.find((y) => y.yukseltme)).toMatchObject({ durum: "insaat", hucreler: plan.ekHucreler, yukseltme: { tesis: kayit.id, olcek: 1 } });
    expect(sh.yapilar!.find((y) => y.id === kayit.id)!.hucreler).toHaveLength(2);
    // ikinci istek: süren büyütme reddedilir
    expect(await b.olcekYukselt({ bolge: BOLGE, tesis: kayit.id, olcek: 2, ekHucreler: [], sinif: "kirsal" })).toMatchObject({ tamam: false });
    // biter: tesis M ayak izi (3 hücre), ölçek 1; büyütme satırı kalkar
    ilerle(10);
    sh = (await b.sahiplikAl(ILCE))!;
    const bitmis = sh.yapilar!.find((y) => y.id === kayit.id)!;
    expect(bitmis).toMatchObject({ durum: "tesis", olcek: 1 });
    expect(bitmis.hucreler).toHaveLength(3);
    expect(sh.yapilar!.some((y) => y.yukseltme)).toBe(false);
    expect(b.isletme().yapilar.find((y) => y.anahtar === `t${kayit.id}`)).toMatchObject({ olcek: 1, hucre: 3 });
    expect(olcekTesisi(ic, bitmis, () => "Çiftlik")!.olcek).toBe(1);
  });

  it("ek hücresiz, bitişik olmayan ve yetersiz hazineli istek reddedilir; hiçbir şey değişmez", async () => {
    const { b, ilerle } = kur(15_000_000);
    const cift = [id(10, 10), id(11, 10)];
    await b.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: cift, sinif: "kirsal" });
    await b.tesisInsa({ tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: cift });
    ilerle(10);
    const sh = (await b.sahiplikAl(ILCE))!;
    const tesis = sh.yapilar!.find((y) => y.durum === "tesis")!.id;
    const hazine = b.ozet().hazineMili;
    const hicbiri = (r: Awaited<ReturnType<typeof b.olcekYukselt>>, mesaj: RegExp): void => {
      expect(r.tamam).toBe(false);
      expect(r.tamam ? "" : r.mesaj).toMatch(mesaj);
      expect(b.ozet().hazineMili).toBe(hazine);
    };
    hicbiri(await b.olcekYukselt({ bolge: BOLGE, tesis, olcek: 1, ekHucreler: [] }), /1 ek hücre ister \(seçilen 0\)/);
    hicbiri(await b.olcekYukselt({ bolge: BOLGE, tesis, olcek: 1, ekHucreler: [id(20, 10)], sinif: "kirsal" }), /bitişik/);
    hicbiri(await b.olcekYukselt({ bolge: BOLGE, tesis, olcek: 1, ekHucreler: [id(12, 10)] }), /sınıfı belirtilmedi/);
    hicbiri(await b.olcekYukselt({ bolge: BOLGE, tesis, olcek: 1, ekHucreler: [id(12, 10)], sinif: "kirsal" }), /Hazinede yeterli para yok/);
    hicbiri(await b.olcekYukselt({ bolge: BOLGE, tesis: 99, olcek: 1, ekHucreler: [] }), /artık yok/);
    expect((await b.sahiplikAl(ILCE))!.yapilar!.some((y) => y.yukseltme)).toBe(false);
  });
});

/**
 * Yapı önce yerleşim (F4): katalog, ayak izi, yerleşim planı (geçerlilik + neden + maliyet), Türkçe hata çevirisi ve komut
 * zinciri (sahte bağdaştırıcıyla). Saf; DOM yok.
 */
import { describe, expect, it } from "vitest";
import { parselFiyati } from "@bolge/cekirdek";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { SahteBaglanti } from "../src/harita/baglanti";
import type { MulkBaglantisi } from "../src/harita/baglanti";
import type { HucreSahipligi, IlceSahipligi } from "../src/harita/baglanti";
import { parselFiyatiMili, TABAN_FIYAT } from "../src/harita/fiyat";
import { hataHucresi, mulkHatasiTurkce } from "../src/harita/hata-mulk";
import { Bit, hucreId } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { Secim } from "../src/harita/secim";
import type { SecimBaglami } from "../src/harita/secim";
import { ayakIzi, malzemeMetni, yapiKatalogu, yerlesimPlani } from "../src/harita/yapi";
import type { YapiTanimi, YerlesimBaglami, YerlesimPlani } from "../src/harita/yapi";
import { yerlesimiUygula } from "../src/harita/zincir";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const katalog = yapiKatalogu(ic);
const yapi = (id: string): YapiTanimi => katalog.find((y) => y.id === id)!;

const KIRSAL = Bit.ICERIDE | (1 << 5);
const KASABA = Bit.ICERIDE | (2 << 5);
const x0 = 5000;
const y0 = 7000;
function izgara(g = 30, y = 20, f?: (x: number, y: number) => number): Izgara {
  const durum = new Uint8Array(g * y);
  for (let j = 0; j < y; j++) for (let i = 0; i < g; i++) durum[j * g + i] = f ? f(i, j) : KIRSAL;
  return { x0, y0, genislik: g, yukseklik: y, durum };
}
const id = (i: number, j: number): string => hucreId(x0 + i, y0 + j);

function baglam(iz: Izgara, hucreler: Array<[string, Partial<HucreSahipligi> & { sahip: string }]> = [], ek: Partial<YerlesimBaglami> = {}): YerlesimBaglami {
  const m = new Map<string, HucreSahipligi>();
  for (const [k, v] of hucreler) m.set(k, { sinif: "kirsal", degerMili: 0, alinma: 0, ...v });
  const sahiplik: IlceSahipligi = { ilce: "i", hucreler: m, uygun: 500, satilmis: m.size };
  return { izgara: iz, sahiplik, ben: "ben", ad: (s) => (s === "ali" ? "Ali" : s), hazineMili: 50_000_000, surenInsaat: 0, ...ek };
}

describe("katalog", () => {
  it("mülk kipinde kurulabilir yapılar parametreden gelir; ek yapılar ayrı grupta", () => {
    const idler = katalog.map((y) => y.id);
    expect(idler).toContain("ciftlik");
    expect(idler).toContain("celikhane");
    expect(idler).not.toContain("rafineri"); // yapiYuva'da yok: mülk kipinde kurulamaz
    expect(yapi("ciftlik")).toMatchObject({ ad: "Çiftlik", grup: "Tarım", yuva: 2, paraMili: 6_000_000, sureSaat: 2, gerekliEtiket: "ova", gerekliRezerv: "tahil" });
    expect(yapi("celikhane").yuva).toBe(3);
    expect(yapi("sulama_kanali")).toMatchObject({ yuva: 1, gerekliTeknoloji: "sulama_sistemi" });
    expect(yapi("ciftlik").ilkGunSureSaat).toBeCloseTo(0.2, 5); // %10 erken oyun çarpanı
    expect(malzemeMetni(yapi("ciftlik"))).toBe("Çelik 30 · Makine parçası 10");
    const ek = katalog.filter((y) => y.ek);
    if (ek.length) expect(ek.every((y) => y.grup === "Kent ve altyapı" && y.yuva >= 1)).toBe(true);
  });
});

describe("ayak izi", () => {
  it("yuva 1-3, yatay/dikey, çapayı ortalar", () => {
    expect(ayakIzi(1, 0)).toEqual([[0, 0]]);
    expect(ayakIzi(1, 1)).toEqual([[0, 0]]);
    expect(ayakIzi(2, 0)).toEqual([[0, 0], [1, 0]]);
    expect(ayakIzi(2, 1)).toEqual([[0, 0], [0, 1]]);
    expect(ayakIzi(3, 0)).toEqual([[-1, 0], [0, 0], [1, 0]]);
    expect(ayakIzi(3, 3)).toEqual([[0, -1], [0, 0], [0, 1]]);
    expect(ayakIzi(3, -1)).toEqual([[0, -1], [0, 0], [0, 1]]);
    expect(ayakIzi(9, 0)).toHaveLength(3);
  });
});

describe("yerleşim planı", () => {
  it("boş arazi: iki hücre alınır, arsa + yapı bedeli artımlı fiyatla; geçerli", () => {
    const b = baglam(izgara());
    const p = yerlesimPlani(yapi("ciftlik"), 3, 3, 0, { ...b, izgara: izgara() }); // çapa mutlak koordinat verilmeli
    // çapa mutlak hücre koordinatıdır: ızgara dışı -> geçersiz
    expect(p.gecerli).toBe(false);
    expect(p.neden).toBe("İlçe sınırı dışında");
    const q = yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, b);
    expect(q.gecerli).toBe(true);
    expect(q.neden).toBeNull();
    expect(q.alinacak).toEqual([id(3, 3), id(4, 3)]);
    expect(q.parseller).toHaveLength(1);
    expect(q.parseller[0]).toMatchObject({ sinif: "kirsal", hucreler: [id(3, 3), id(4, 3)] });
    expect(q.arsaMili).toBe(parselFiyatiMili("kirsal", 0, 500, 2));
    expect(q.yapiMili).toBe(6_000_000);
    expect(q.toplamMili).toBe(q.arsaMili + 6_000_000);
    expect(q.hazineYetmez).toBe(false);
  });

  it("fiyat çekirdek parselFiyati ile birebir (artımlı, aşağı yuvarlama)", () => {
    for (const sinif of ["kirsal", "kasaba", "sehir"] as const) {
      for (const [satilmis, uygun, adet] of [[0, 81, 2], [7, 395, 3], [100, 485_856, 12], [1, 3, 1]] as const) {
        const taban = TABAN_FIYAT[sinif] * 1000;
        expect(parselFiyatiMili(sinif, satilmis, uygun, adet)).toBe(parselFiyati(taban, 2_000_000, satilmis, uygun, adet));
      }
    }
  });

  it("kendi boş hücren: arsa bedeli yok; başkasının, yapılı ve engelli hücre geçersiz (neden Türkçe)", () => {
    const iz = izgara(30, 20, (x, y) => (x === 10 && y === 5 ? KIRSAL | Bit.YOL : KIRSAL));
    const b = baglam(iz, [
      [id(3, 3), { sahip: "ben" }],
      [id(4, 3), { sahip: "ben" }],
      [id(6, 3), { sahip: "ali" }],
      [id(8, 3), { sahip: "ben", insaat: 7 }],
    ]);
    const kendi = yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, b);
    expect(kendi).toMatchObject({ gecerli: true, alinacak: [], parseller: [], arsaMili: 0, toplamMili: 6_000_000 });
    expect(kendi.hucreler.every((h) => h.benim)).toBe(true);
    // yarısı kendi, yarısı boş
    const yari = yerlesimPlani(yapi("ciftlik"), x0 + 4, y0 + 3, 0, b);
    expect(yari.alinacak).toEqual([id(5, 3)]);
    expect(yari.hucreler.map((h) => h.benim)).toEqual([true, false]);
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 5, y0 + 3, 0, b)).toMatchObject({ gecerli: false, neden: "Sahibi: Ali" });
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 8, y0 + 3, 0, b)).toMatchObject({ gecerli: false, neden: "Bu hücrede zaten yapı var" });
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 10, y0 + 5, 0, b)).toMatchObject({ gecerli: false, neden: "Yol tamponu" });
    // dönüş: dikeyde yol hücresine değmez
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 10, y0 + 3, 1, b)).toMatchObject({ gecerli: true });
  });

  it("karışık sınıf: arsa sınıf başına ayrı parsel_al adımı; sonraki adımın fiyatı öncekini sayar", () => {
    const iz = izgara(30, 20, (x) => (x >= 4 ? KASABA : KIRSAL));
    const p = yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, baglam(iz));
    expect(p.parseller.map((a) => [a.sinif, a.hucreler.length])).toEqual([["kirsal", 1], ["kasaba", 1]]);
    expect(p.parseller[0]!.mili).toBe(parselFiyatiMili("kirsal", 0, 500, 1));
    expect(p.parseller[1]!.mili).toBe(parselFiyatiMili("kasaba", 1, 500, 1));
    expect(p.arsaMili).toBe(p.parseller[0]!.mili + p.parseller[1]!.mili);
  });

  it("plan düzeyi nedenler: hücre/pay sınırı, eşzamanlı inşaat, hazine", () => {
    const iz = izgara();
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, baglam(iz, [], { surenInsaat: 2 })).neden).toBe("Aynı anda en çok 2 inşaat sürebilir");
    const yoksul = yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, baglam(iz, [], { hazineMili: 5_000_000 }));
    expect(yoksul).toMatchObject({ gecerli: false, hazineYetmez: true });
    expect(yoksul.neden).toMatch(/^Hazinede yeterli para yok \(gereken [\d.]+\u00a0₺\)$/);
    // hazine bilinmiyorsa (null) kontrol atlanır
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, baglam(iz, [], { hazineMili: null })).gecerli).toBe(true);
    // %25 payı: uygun 8 -> en çok 2 hücre; ben zaten 2 hücreli
    const kucuk = baglam(izgara(), [[id(0, 0), { sahip: "ben" }], [id(1, 0), { sahip: "ben" }]]);
    kucuk.sahiplik.uygun = 8;
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 5, y0 + 5, 0, kucuk).neden).toBe("İlçenin en çok %25'i senin olabilir (2 hücre)");
    // 72 hücre sınırı
    const dolu = new Map<string, HucreSahipligi>();
    for (let i = 0; i < 72; i++) dolu.set(id(i % 30, 10 + Math.floor(i / 30)), { sahip: "ben", sinif: "kirsal", degerMili: 0, alinma: 0 });
    const b72: YerlesimBaglami = { ...baglam(iz), sahiplik: { ilce: "i", hucreler: dolu, uygun: 100_000, satilmis: 72 } };
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, b72).neden).toBe("İlçede en çok 72 hücren olabilir");
  });

  it("kamu arsasındaki hücre yapıya ve satın almaya kapalı (neden: Kamu arsası); hücre seçimi de reddeder", () => {
    const iz = izgara();
    const kamu = new Set([id(4, 3)]);
    const b = baglam(iz, [], { kamu: (k) => (kamu.has(k) ? "Kamu arsası (Meydan): satışa kapalı" : null) });
    const p = yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, b);
    expect(p).toMatchObject({ gecerli: false, neden: "Kamu arsası (Meydan): satışa kapalı" });
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 6, y0 + 3, 0, b).gecerli).toBe(true);
    const s = new Secim();
    const sb: SecimBaglami = { izgara: iz, sahip: () => null, ben: "ben", ad: (x) => x, kamu: (k) => (kamu.has(k) ? "Kamu arsası (Meydan): satışa kapalı" : null) };
    expect(s.tek(sb, x0 + 4, y0 + 3)).toEqual({ tamam: false, neden: "Kamu arsası (Meydan): satışa kapalı" });
    expect(s.tek(sb, x0 + 5, y0 + 3)).toEqual({ tamam: true });
  });

  it("kamu: sahte bağdaştırıcı örnek blokları yayınlar, kamu hücresinde parsel_al ve yapi_yerlestir reddedilir; çeviri; Muhtarlık menüde yok", async () => {
    const iz = izgara(60, 60);
    const b = new SahteBaglanti({ izgaraAl: async () => iz, komsular: false, saat: () => 1, kamu: true, yapiBilgisi: () => ({ yuva: 1, paraMili: 0, sureSaat: 1 }) });
    const sh = (await b.sahiplikAl("i"))!;
    expect(sh.kamu?.length).toBeGreaterThan(0);
    expect(sh.uygun).toBe(60 * 60 - sh.kamuAdet!);
    const g = sh.kamu!.find((k) => k.tur === "hizmet")!;
    const [bx, by] = g.blok[0]!;
    const hucre = hucreId(bx, by);
    expect(await b.parselAl({ tur: "parsel_al", ilce: "i", hucreler: [hucre], sinif: "kirsal" })).toEqual({ tamam: false, hata: "kamu", mesaj: "Kamu arsası (İlçe merkezi): satışa kapalı", hucre });
    expect(await b.yapiYerlestir({ ilce: "i", tesisTuru: "ciftlik", hucreler: [hucre], sinif: "kirsal" })).toMatchObject({ tamam: false, hata: "kamu" });
    expect(mulkHatasiTurkce(`hucre kamu arsasi (satilmaz): ${hucre} (pazar, k:mahalle:x_1)`)).toBe("Bu hücre kamu arsası (Pazar yeri): satılmaz.");
    expect(mulkHatasiTurkce("muhtarlik kamu yapisidir (oyuncuya kapali)")).toBe("Bu yapı kamu yapısıdır: oyunculara kapalı.");
    expect(mulkHatasiTurkce("ayrilmis hucre yalniz katilim ilcesinde satilir (katilim ilcesi: yok): 1:2")).toBe("Ayrılmış hücre yalnız katılım ilçende satılır; bu ilçede normal hücre alabilirsin.");
    expect(mulkHatasiTurkce("ilcede gunluk ayrilmis satis tavani asildi: a (tavan 30, bugun 30, istenen 2)")).toBe("İlçenin bugünkü ayrılmış satış tavanı doldu (30 hücre); yarın yeniden açılır.");
    expect(katalog.some((y) => y.id === "muhtarlik")).toBe(false);
  });

  it("yapılar listesinden (yapilar) gelen hücre de dolu sayılır", () => {
    const b = baglam(izgara(), [[id(3, 3), { sahip: "ben" }], [id(4, 3), { sahip: "ben" }]]);
    b.sahiplik.yapilar = [{ id: 1, anahtar: "t1", durum: "tesis", sahip: "ben", hucreler: [id(4, 3)] }];
    expect(yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, b).neden).toBe("Bu hücrede zaten yapı var");
  });
});

describe("hata çevirisi", () => {
  it("çekirdek metinleri Türkçe cümleye çevrilir; tanınmayan ham metin cümleye gömülür", () => {
    const ad = (x: string): string => (x === "veli" ? "Veli" : x);
    expect(mulkHatasiTurkce("hucre zaten sahipli: 1:2 (veli)", ad)).toBe("Bir hücre az önce Veli tarafından alındı.");
    expect(mulkHatasiTurkce("yetersiz hazine (gereken 8005000)")).toBe("Hazinede yeterli para yok (gereken 8.005\u00a0₺).");
    expect(mulkHatasiTurkce("ilcenin en cok %25'i (20 hucre; mevcut 20)")).toBe("İlçenin en çok %25'i senin olabilir (20 hücre; şu an 20).");
    expect(mulkHatasiTurkce("il etiketi yetersiz: ova")).toBe('Bu ilde bu yapı kurulamaz: il "Ova" özelliği taşımıyor.');
    expect(mulkHatasiTurkce("ciftlik 2 hucre kaplar (verilen 1)")).toBe("Bu yapı 2 hücre kaplar (seçilen 1).");
    expect(mulkHatasiTurkce("hucre satin alinamaz (yol): 5:5")).toBe("Bu hücre satın alınamaz (yol tamponu).");
    expect(mulkHatasiTurkce("ayni anda en cok 2 insaat")).toBe("Aynı anda en çok 2 inşaat sürebilir; birinin bitmesini bekle.");
    expect(mulkHatasiTurkce("yetersiz stok: x#ali (mal indeksi 4)")).toContain("yeterli malzeme");
    expect(mulkHatasiTurkce("tuhaf bir hata")).toBe("Sunucu isteği reddetti: tuhaf bir hata");
    expect(hataHucresi("hucre zaten sahipli: 604800:381800 (veli)")).toBe("604800:381800");
    expect(hataHucresi("yetersiz hazine")).toBeUndefined();
  });
});

describe("komut yolu (sahte bağdaştırıcı)", () => {
  const yeni = (hazine = 50_000_000): SahteBaglanti =>
    new SahteBaglanti({
      izgaraAl: async () => izgara(),
      komsular: false,
      saat: () => 1000,
      hazineMili: hazine,
      yapiBilgisi: (t) => {
        const y = katalog.find((k) => k.id === t);
        return y ? { yuva: y.yuva, paraMili: y.paraMili, sureSaat: y.sureSaat } : null;
      },
    });
  /** Atomik komutu olmayan bağlantı (eski sunucu): arsa alan yerleşim yapılmaz. */
  const zincirli = (b: SahteBaglanti, sayac: { parsel: number; insa: number } = { parsel: 0, insa: 0 }): MulkBaglantisi => ({
    ben: b.ben,
    oyuncuAdi: (x) => b.oyuncuAdi(x),
    parselAl: (k) => (sayac.parsel++, b.parselAl(k)),
    sahiplikAl: (i) => b.sahiplikAl(i),
    tesisInsa: (k) => (sayac.insa++, b.tesisInsa(k)),
    ozet: () => b.ozet(),
  });
  const planYap = async (b: SahteBaglanti, id_: string, cx: number, cy: number, ek: Partial<YerlesimBaglami> = {}): Promise<YerlesimPlani> =>
    yerlesimPlani(yapi(id_), x0 + cx, y0 + cy, 0, baglam(izgara(), [], { sahiplik: (await b.sahiplikAl("i"))!, ...ek }));

  it("atomik: arsa + yapı TEK komutla; hazine düşer; inşaat süren yapı olarak görünür", async () => {
    const b = yeni();
    const plan = await planYap(b, "ciftlik", 3, 3);
    const r = await yerlesimiUygula(b, "i", plan);
    expect(r).toMatchObject({ tamam: true, yol: "atomik", gonderilen: 1, alinan: [id(3, 3), id(4, 3)] });
    expect(r.mesaj).toMatch(/^Çiftlik kuruluyor; bedel [\d.]+\s₺\.$/);
    expect(b.ozet().hazineMili).toBe(50_000_000 - plan.arsaMili - 6_000_000);
    const s = (await b.sahiplikAl("i"))!;
    expect(s.yapilar).toHaveLength(1);
    expect(s.yapilar![0]).toMatchObject({ durum: "insaat", tur: "ciftlik", hucreler: [id(3, 3), id(4, 3)] });
    expect(s.hucreler.get(id(3, 3))!.insaat).toBe(1);
    expect(b.ozet()).toMatchObject({ surenInsaat: 1, ilceHucre: [["i", 2]] });
  });

  it("atomik: başarısızsa hiçbir şey değişmez (hazine ve hücreler aynı); mesaj bunu söyler", async () => {
    const b = yeni(2_000_000); // arsa + yapı 8.000 ₺ > 2.000 ₺
    const plan = await planYap(b, "ciftlik", 3, 3, { hazineMili: null });
    const r = await yerlesimiUygula(b, "i", plan);
    expect(r).toMatchObject({ tamam: false, yol: "atomik", gonderilen: 1, alinan: [] });
    expect(r.mesaj).toBe("Çiftlik kurulamadı: Hazinede yeterli para yok. Hiçbir şey değişmedi.");
    expect(b.ozet()).toMatchObject({ hazineMili: 2_000_000, ilceHucre: [], surenInsaat: 0 });
    expect((await b.sahiplikAl("i"))!.hucreler.size).toBe(0);
  });

  it("karışık sınıfta da TEK atomik komut (siniflar): her hücre kendi sınıfında alınır, hazine düşüşü önizlemeyle aynı", async () => {
    const iz = izgara(30, 20, (x) => (x >= 4 ? KASABA : KIRSAL));
    const b = new SahteBaglanti({ izgaraAl: async () => iz, komsular: false, saat: () => 1, hazineMili: 50_000_000, yapiBilgisi: () => ({ yuva: 2, paraMili: 6_000_000, sureSaat: 2 }) });
    const plan = yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, baglam(iz, [], { sahiplik: (await b.sahiplikAl("i"))! }));
    expect(plan.parseller).toHaveLength(2);
    const r = await yerlesimiUygula(b, "i", plan);
    expect(r).toMatchObject({ tamam: true, yol: "atomik", gonderilen: 1 });
    const s = (await b.sahiplikAl("i"))!;
    expect(s.hucreler.get(id(3, 3))).toMatchObject({ sinif: "kirsal" });
    expect(s.hucreler.get(id(4, 3))).toMatchObject({ sinif: "kasaba" });
    expect(b.ozet().hazineMili).toBe(50_000_000 - plan.arsaMili - 6_000_000);
  });

  it("atomik komutu olmayan bağlantıda arsa alan yerleşim yapılmaz: hiç komut gitmez (yarım alım yok)", async () => {
    const b = yeni();
    const sayac = { parsel: 0, insa: 0 };
    const plan = yerlesimPlani(yapi("ciftlik"), x0 + 3, y0 + 3, 0, { ...baglam(izgara()), hazineMili: null });
    const r = await yerlesimiUygula(zincirli(b, sayac), "i", plan);
    expect(r).toMatchObject({ tamam: false, gonderilen: 0, alinan: [], neden: "desteklenmiyor" });
    expect(sayac).toEqual({ parsel: 0, insa: 0 });
    expect(b.ozet()).toMatchObject({ hazineMili: 50_000_000, ilceHucre: [] });
  });

  it("eşzamanlı inşaat sınırı: 3. yerleşim reddedilir ve arsa ALINMAZ (eski zincirdeki 'arsa sende kalır' yolu yok)", async () => {
    const b = yeni();
    expect((await yerlesimiUygula(b, "i", await planYap(b, "ciftlik", 3, 3))).tamam).toBe(true);
    expect((await yerlesimiUygula(b, "i", await planYap(b, "ahir", 3, 6))).tamam).toBe(true);
    const hazine = b.ozet().hazineMili;
    // üçüncü: istemci planı sınırı bilmiyormuş gibi (surenInsaat 0) gönderir; sahte sunucu reddeder
    const plan3 = await planYap(b, "ciftlik", 3, 9, { surenInsaat: 0 });
    expect(plan3.gecerli).toBe(true);
    const ucuncu = await yerlesimiUygula(b, "i", plan3);
    expect(ucuncu).toMatchObject({ tamam: false, asama: "insa", yol: "atomik", gonderilen: 1, alinan: [], odenenMili: 0 });
    expect(ucuncu.mesaj).toBe("Çiftlik kurulamadı: Aynı anda en çok 2 inşaat sürebilir. Hiçbir şey değişmedi.");
    expect(b.ozet().hazineMili).toBe(hazine);
    expect((await b.sahiplikAl("i"))!.hucreler.has(id(3, 9))).toBe(false);
  });

  it("geri al (sahte): inşaat kalkar, alınan hücreler bırakılır, ödenen para iade edilir", async () => {
    const b = yeni();
    const plan = await planYap(b, "ciftlik", 3, 3);
    const r = await yerlesimiUygula(b, "i", plan);
    expect(r.tamam).toBe(true);
    expect(b.ozet().hazineMili).toBeLessThan(50_000_000);
    const g = await b.yapiGeriAl({ ilce: "i", hucreler: plan.hucreler.map((h) => h.id), alinan: r.alinan });
    expect(g.tamam).toBe(true);
    expect(b.ozet()).toMatchObject({ hazineMili: 50_000_000, ilceHucre: [], surenInsaat: 0 });
    expect((await b.sahiplikAl("i"))).toMatchObject({ satilmis: 0, yapilar: [] });
    expect(await b.yapiGeriAl({ ilce: "i", hucreler: plan.hucreler.map((h) => h.id), alinan: [] })).toMatchObject({ tamam: false, hata: "yapi_yok" });
  });
});

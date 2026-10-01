/**
 * Harita (S8): arsa fiyatı, sahip olma sınırları (≤72 hücre, ≤%25), bitişiklik, seçim kuralları ve sahte
 * bağdaştırıcının doğrulaması (sınırlar, çakışma, uygunluk, sınıf).
 */
import { describe, expect, it } from "vitest";
import { SahteBaglanti } from "../src/harita/baglanti";
import type { ParselKomutu } from "../src/harita/baglanti";
import {
  arsaSinifi,
  bitisikMi,
  fiyatCarpani,
  hucreFiyati,
  ilceTavani,
  parselFiyatiMili,
  sahipliyeDegiyor,
  satinAlmaOzeti,
  sinirDenetle,
} from "../src/harita/fiyat";
import { Bit, hucreId } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { Secim, secilemezNedeni } from "../src/harita/secim";
import type { SecimBaglami } from "../src/harita/secim";

const KIRSAL = Bit.ICERIDE | (1 << 5); // tarla
const KASABA = Bit.ICERIDE | (2 << 5); // sanayi
const SEHIR = Bit.ICERIDE | (3 << 5); // konut

/** g×y ızgara: hepsi kırsal; (2,0) yol, (3,0) su, (4,0) askerî; (0,1) şehir, (1,1) kasaba. */
function izgara(g = 20, y = 20, ilk?: (x: number, y: number) => number): Izgara {
  const durum = new Uint8Array(g * y);
  for (let j = 0; j < y; j++) for (let i = 0; i < g; i++) durum[j * g + i] = ilk ? ilk(i, j) : KIRSAL;
  if (!ilk) {
    durum[2] = KIRSAL | Bit.YOL;
    durum[3] = Bit.ICERIDE | Bit.SU;
    durum[4] = KIRSAL | Bit.ASKERI;
    durum[g] = SEHIR;
    durum[g + 1] = KASABA;
  }
  return { x0: 1000, y0: 2000, genislik: g, yukseklik: y, durum };
}
const id = (i: number, j: number): string => hucreId(1000 + i, 2000 + j);

describe("fiyat", () => {
  it("taban fiyatlar ve çarpan (docs/11 §7.2 örneği)", () => {
    expect(hucreFiyati("kirsal", 0, 100)).toBe(1000);
    expect(hucreFiyati("kasaba", 0, 100)).toBe(2500);
    expect(hucreFiyati("sehir", 0, 100)).toBe(6500);
    // ilçenin %25'i satılmışsa kırsal hücre 1.000 × 1,5 = 1.500 ₺
    expect(hucreFiyati("kirsal", 25, 100)).toBe(1500);
    expect(fiyatCarpani(100, 100)).toBe(3);
    expect(fiyatCarpani(200, 100)).toBe(3);
    expect(fiyatCarpani(5, 0)).toBe(1);
  });

  it("arsa sınıfı eşlemesi (geçici)", () => {
    expect(arsaSinifi(KIRSAL)).toBe("kirsal");
    expect(arsaSinifi(Bit.ICERIDE | (4 << 5))).toBe("kirsal");
    expect(arsaSinifi(KASABA)).toBe("kasaba");
    expect(arsaSinifi(KIRSAL | Bit.BINA)).toBe("kasaba");
    expect(arsaSinifi(SEHIR)).toBe("sehir");
    expect(arsaSinifi(Bit.ICERIDE | (5 << 5))).toBe("sehir");
  });

  it("sınırlar: 72 hücre ve %25 (payda: uygun hücre)", () => {
    expect(ilceTavani(1_000_000)).toBe(72);
    expect(ilceTavani(100)).toBe(25);
    expect(sinirDenetle({ uygun: 1000, satilmis: 0, benim: 70 }, 2)).toMatchObject({ hucreAsimi: false, payAsimi: false, sonra: 72 });
    expect(sinirDenetle({ uygun: 1000, satilmis: 0, benim: 70 }, 3).hucreAsimi).toBe(true);
    expect(sinirDenetle({ uygun: 40, satilmis: 0, benim: 9 }, 2).payAsimi).toBe(true);
    expect(sinirDenetle({ uygun: 40, satilmis: 0, benim: 9 }, 1).payAsimi).toBe(false);
  });

  it("bitişiklik: kenar komşuluğu; sahip olunan hücre köprü olur", () => {
    expect(bitisikMi([])).toBe(true);
    expect(bitisikMi(["1:1", "2:1", "2:2"])).toBe(true);
    expect(bitisikMi(["1:1", "2:2"])).toBe(false); // yalnız köşe
    expect(bitisikMi(["1:1", "3:1"])).toBe(false);
    expect(bitisikMi(["1:1", "3:1"], new Set(["2:1"]))).toBe(true);
    expect(sahipliyeDegiyor(["1:1"], new Set(["1:2"]))).toBe(true);
    expect(sahipliyeDegiyor(["1:1"], new Set(["2:2"]))).toBe(false);
  });

  it("satın alma özeti: toplam, tek sınıf, engeller", () => {
    const sinif = (h: string): "kirsal" | "sehir" => (h === "9:9" ? "sehir" : "kirsal");
    const sayi = { uygun: 8_000, satilmis: 2_000, benim: 0 };
    const o = satinAlmaOzeti(["1:1", "2:1", "3:1"], sinif, sayi, new Set());
    expect(o).toMatchObject({ sayi: 3, sinif: "kirsal", hucreFiyati: 1500, toplam: 4500, bitisik: true, birlestir: false, engeller: [] });
    const karisik = satinAlmaOzeti(["1:1", "9:9"], sinif, sayi, new Set());
    expect(karisik.sinif).toBeNull();
    expect(karisik.engeller).toContain("Seçim tek sınıftan olmalı");
    expect(karisik.engeller).toContain("Seçilen hücreler bitişik olmalı");
    const fazla = satinAlmaOzeti(["1:1"], sinif, { ...sayi, benim: 72 }, new Set());
    expect(fazla.engeller).toContain("İlçede en çok 72 hücre");
    const pay = satinAlmaOzeti(["1:1"], sinif, { uygun: 8, satilmis: 2, benim: 2 }, new Set());
    expect(pay.engeller).toContain("İlçenin en çok %25'i");
    expect(satinAlmaOzeti(["1:1"], sinif, sayi, new Set(["1:2"])).birlestir).toBe(true);
    expect(satinAlmaOzeti([], sinif, sayi, new Set()).engeller).toEqual(["Hücre seçin"]);
  });
});

describe("seçim", () => {
  const iz = izgara();
  const sahipler = new Map<string, string>([[id(5, 5), "bot"], [id(6, 5), "ben"]]);
  const b: SecimBaglami = { izgara: iz, sahip: (h) => sahipler.get(h) ?? null, ben: "ben", ad: (s) => (s === "bot" ? "Ayşe Tarım" : s) };

  it("uygunsuz hücre seçilemez ve nedenini söyler", () => {
    expect(secilemezNedeni(b, 1002, 2000)).toBe("Yol tamponu");
    expect(secilemezNedeni(b, 1003, 2000)).toMatch(/^Su/);
    expect(secilemezNedeni(b, 1004, 2000)).toBe("Askerî alan");
    expect(secilemezNedeni(b, 999, 2000)).toBe("İlçe sınırı dışında");
    expect(secilemezNedeni(b, 1005, 2005)).toBe("Sahibi: Ayşe Tarım");
    expect(secilemezNedeni(b, 1006, 2005)).toBe("Zaten senin");
    expect(secilemezNedeni(b, 1000, 2000)).toBeNull();
  });

  it("tek tık değiştirir, shift+tık ekler/çıkarır", () => {
    const s = new Secim();
    expect(s.tek(b, 1000, 2000)).toEqual({ tamam: true });
    expect(s.tek(b, 1001, 2000)).toEqual({ tamam: true });
    expect(s.liste).toEqual([id(1, 0)]);
    expect(s.degistir(b, 1000, 2000).tamam).toBe(true);
    expect(s.boyut).toBe(2);
    expect(s.degistir(b, 1000, 2000).tamam).toBe(true);
    expect(s.liste).toEqual([id(1, 0)]);
    expect(s.degistir(b, 1002, 2000)).toEqual({ tamam: false, neden: "Yol tamponu" });
    expect(s.tek(b, 1001, 2000).tamam).toBe(true); // tekrar tık: kaldırır
    expect(s.boyut).toBe(0);
  });

  it("dikdörtgen uygunsuzları atlar ve 72'de keser", () => {
    const s = new Secim();
    const r = s.dikdortgen(b, 1000, 2000, 1004, 2000);
    expect(r).toEqual({ eklenen: 2, atlanan: 3, farkliSinif: 0, kesildi: false });
    const s2 = new Secim();
    const r2 = s2.dikdortgen(b, 1000, 2002, 1019, 2019);
    expect(s2.boyut).toBe(72);
    expect(r2.kesildi).toBe(true);
  });

  it("karışık sınıf: shift+tık reddedilir ve nedeni yazılır; dikdörtgen farklı sınıfı atlar", () => {
    const s = new Secim();
    expect(s.tek(b, 1000, 2002).tamam).toBe(true); // kırsal
    expect(s.degistir(b, 1000, 2001)).toEqual({ tamam: false, neden: "Seçim tek sınıftan olmalı (seçim: Kırsal, bu hücre: Şehir)" });
    expect(s.degistir(b, 1001, 2001)).toEqual({ tamam: false, neden: "Seçim tek sınıftan olmalı (seçim: Kırsal, bu hücre: Kasaba)" });
    expect(s.boyut).toBe(1);
    expect(s.sinif(b)).toBe("kirsal");
    // Satır 1: (0,1) şehir, (1,1) kasaba, (2..4,1) kırsal
    expect(s.dikdortgen(b, 1000, 2001, 1004, 2001)).toEqual({ eklenen: 3, atlanan: 0, farkliSinif: 2, kesildi: false });
    // Boş seçimde sınıf dikdörtgendeki ilk uygun hücreden gelir (şehir)
    const s2 = new Secim();
    expect(s2.dikdortgen(b, 1000, 2001, 1004, 2001)).toEqual({ eklenen: 1, atlanan: 0, farkliSinif: 4, kesildi: false });
    expect(s2.sinif(b)).toBe("sehir");
  });
});

describe("sahte bağdaştırıcı", () => {
  const yeni = (iz: Izgara = izgara()): SahteBaglanti =>
    new SahteBaglanti({ izgaraAl: async (ilce) => (ilce === "ilce_a" ? iz : null), komsular: false, saat: () => 42 });
  const komut = (hucreler: string[], sinif: ParselKomutu["sinif"] = "kirsal", ilce = "ilce_a"): ParselKomutu => ({ tur: "parsel_al", ilce, hucreler, sinif });

  it("geçerli satın alma sahipliğe yazılır; fiyat paya göre", async () => {
    const b = yeni();
    const s = await b.parselAl(komut([id(0, 2), id(1, 2)]));
    // Çekirdek `parselFiyati` gibi artımlı: 2. hücrenin payı 1/uygun (uygun 395 -> 1.000 × (1 + 2/395))
    const uygun = (await b.sahiplikAl("ilce_a"))!.uygun;
    expect(s).toEqual({ tamam: true, hucreler: [id(0, 2), id(1, 2)], toplamMili: parselFiyatiMili("kirsal", 0, uygun, 2), t: 42 });
    expect(parselFiyatiMili("kirsal", 0, uygun, 2)).toBeGreaterThan(2_000_000);
    const sh = await b.sahiplikAl("ilce_a");
    expect(sh?.satilmis).toBe(2);
    expect(sh?.hucreler.get(id(0, 2))).toMatchObject({ sahip: "ben", sinif: "kirsal", degerMili: 1_000_000, alinma: 42 });
    expect(sh?.hucreler.get(id(1, 2))?.degerMili).toBe(parselFiyatiMili("kirsal", 1, uygun, 1));
    // Kopya döner: dışarıdaki değişiklik sunucu durumunu bozmaz
    sh?.hucreler.clear();
    expect((await b.sahiplikAl("ilce_a"))?.hucreler.size).toBe(2);
  });

  it("çakışma, uygunluk, sınıf, biçim, yineleme, bitişiklik", async () => {
    const b = yeni();
    expect((await b.parselAl(komut([id(0, 3)]))).tamam).toBe(true);
    expect(await b.parselAl(komut([id(0, 3)]))).toMatchObject({ tamam: false, hata: "sahipli" });
    expect(await b.parselAl(komut([id(2, 0)]))).toMatchObject({ tamam: false, hata: "uygunsuz", mesaj: "Satın alınamaz hücre: Yol tamponu" });
    expect(await b.parselAl(komut([id(3, 0)]))).toMatchObject({ tamam: false, hata: "uygunsuz" });
    expect(await b.parselAl(komut([id(4, 0)]))).toMatchObject({ tamam: false, hata: "uygunsuz" });
    expect(await b.parselAl(komut([id(0, 1)]))).toMatchObject({ tamam: false, hata: "sinif_uyusmuyor" });
    expect((await b.parselAl(komut([id(0, 1)], "sehir"))).tamam).toBe(true);
    expect(await b.parselAl(komut(["abc"]))).toMatchObject({ tamam: false, hata: "gecersiz_hucre" });
    expect(await b.parselAl(komut([id(9, 9), id(9, 9)]))).toMatchObject({ tamam: false, hata: "yinelenen" });
    expect(await b.parselAl(komut([id(9, 9), id(11, 9)]))).toMatchObject({ tamam: false, hata: "bitisik_degil" });
    expect(await b.parselAl(komut([]))).toMatchObject({ tamam: false, hata: "bos_secim" });
    expect(await b.parselAl(komut([id(0, 5)], "kirsal", "ilce_yok"))).toMatchObject({ tamam: false, hata: "izgara_yok" });
    expect(await b.sahiplikAl("ilce_yok")).toBeNull();
  });

  it("72 hücre sınırı", async () => {
    const b = yeni();
    const sira = (j: number, n: number): string[] => Array.from({ length: n }, (_, i) => id(i, j));
    for (let j = 5; j < 8; j++) expect((await b.parselAl(komut(sira(j, 20)))).tamam).toBe(true); // 60
    expect((await b.parselAl(komut(sira(8, 12)))).tamam).toBe(true); // 72
    expect(await b.parselAl(komut([id(0, 9)]))).toMatchObject({ tamam: false, hata: "hucre_siniri" });
  });

  it("%25 pay sınırı (küçük ilçe)", async () => {
    const kucuk = izgara(4, 4, () => KIRSAL); // uygun 16 -> en çok 4
    const b = yeni(kucuk);
    expect(await b.parselAl(komut([id(0, 0), id(1, 0), id(2, 0), id(3, 0), id(3, 1)]))).toMatchObject({ tamam: false, hata: "pay_siniri" });
    expect((await b.parselAl(komut([id(0, 0), id(1, 0), id(2, 0), id(3, 0)]))).tamam).toBe(true);
    // Fiyat çarpanı artık 1 + 2·(4/16) = 1,5
    expect((await b.sahiplikAl("ilce_a"))?.satilmis).toBe(4);
  });

  it("komşu parselleri deterministik serpilir ve uygun hücrelerdedir", async () => {
    const iz = izgara(60, 60, () => KIRSAL);
    const a = new SahteBaglanti({ izgaraAl: async () => iz });
    const c = new SahteBaglanti({ izgaraAl: async () => iz });
    const sa = await a.sahiplikAl("x");
    const sc = await c.sahiplikAl("x");
    expect(sa?.hucreler.size).toBe(27);
    expect([...(sa?.hucreler.keys() ?? [])]).toEqual([...(sc?.hucreler.keys() ?? [])]);
    expect(a.oyuncuAdi("bot-ayse")).toBe("Ayşe Tarım");
  });
});

import { describe, expect, it } from "vitest";
import {
  DAKIKA_MS,
  Y_OLCUTLERI,
  ilkOlayOrani,
  y1IlkYapi,
  y2IlkSatis,
  y3IlkSozlesme,
  y5AcilisCesitliligi,
  y6YonDegistirme,
  uretenEmsal,
  y7UretimGeliri,
  yapiKatmani,
} from "../../src/parsel";

const SAAT = 60 * DAKIKA_MS;
const GUN = 24 * SAAT;

describe("Y tablosu", () => {
  it("Y1–Y10 tanımlı; insan testi işaretleri brifteki gibi; türetilemeyenler işaretli", () => {
    expect(Y_OLCUTLERI.map((y) => y.kod)).toEqual(["Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10"]);
    const insan = Y_OLCUTLERI.filter((y) => y.insanTesti).map((y) => y.kod);
    expect(insan).toEqual(["Y1", "Y2", "Y3", "Y4", "Y6", "Y8", "Y9", "Y10"]);
    expect(Y_OLCUTLERI.filter((y) => y.kaynak === "karma").map((y) => y.kod)).toEqual(["Y5", "Y7"]);
    expect(Y_OLCUTLERI.filter((y) => !y.turetilebilir).map((y) => y.kod)).toEqual(["Y3", "Y4", "Y8", "Y9", "Y10"]);
  });
});

describe("Y1 / Y2 ilk olay oranı (sınır değerler)", () => {
  const kayit = (sureMs: number | null, gozlem = 2 * GUN) => ({ katilmaMs: GUN, ilkMs: sureMs === null ? null : GUN + sureMs, gozlemSonuMs: GUN + gozlem });

  it("tam 10 dk geçer, 1 ms fazlası geçmez", () => {
    const r = ilkOlayOrani([kayit(10 * DAKIKA_MS), kayit(10 * DAKIKA_MS + 1)], 10 * DAKIKA_MS);
    expect(r).toMatchObject({ olculebilir: true, oranPpm: 500_000, esikiGecen: 1, olculenOyuncu: 2, olcumDisi: 0 });
  });

  it("olay yok + gözlem eşikten uzun: başarısız sayılır; gözlem eşikten kısa: ölçüm dışı", () => {
    const uzun = ilkOlayOrani([kayit(null, 10 * DAKIKA_MS)], 10 * DAKIKA_MS); // gözlem tam eşik kadar: ölçülür, başarısız
    expect(uzun).toMatchObject({ olculebilir: true, oranPpm: 0, olculenOyuncu: 1 });
    const kisa = ilkOlayOrani([kayit(null, 10 * DAKIKA_MS - 1), kayit(5 * DAKIKA_MS)], 10 * DAKIKA_MS);
    expect(kisa).toMatchObject({ olculebilir: true, oranPpm: 1_000_000, olculenOyuncu: 1, olcumDisi: 1 });
  });

  it("hiç ölçülemezse ölçülemez işareti (neden yazılı)", () => {
    expect(ilkOlayOrani([], 1)).toEqual({ olculebilir: false, neden: "oyuncu yok" });
    const r = ilkOlayOrani([kayit(null, 1)], 10 * DAKIKA_MS);
    expect(r.olculebilir).toBe(false);
  });

  it("medyan süre ve negatif süre hatası", () => {
    const r = ilkOlayOrani([kayit(DAKIKA_MS), kayit(3 * DAKIKA_MS), kayit(100 * DAKIKA_MS)], 10 * DAKIKA_MS);
    expect(r.olculebilir && r.medyanSureMs).toBe(3 * DAKIKA_MS);
    expect(() => ilkOlayOrani([{ katilmaMs: 10, ilkMs: 5, gozlemSonuMs: 100 }], 1)).toThrow(/once/);
  });

  it("Y1 hedefi ≥ %75: 3/4 geçer, 2/3 geçmez", () => {
    const iyi = y1IlkYapi([kayit(DAKIKA_MS), kayit(DAKIKA_MS), kayit(DAKIKA_MS), kayit(null)]);
    expect(iyi.hedefGecti).toBe(true);
    const kotu = y1IlkYapi([kayit(DAKIKA_MS), kayit(DAKIKA_MS), kayit(null)]);
    expect(kotu.hedefGecti).toBe(false);
    expect(y1IlkYapi([]).hedefGecti).toBeNull();
  });

  it("Y2: 60 dk (≥ %70) ve 10 dk (≥ %50) eşikleri ayrı; sınırlar", () => {
    const r = y2IlkSatis([kayit(10 * DAKIKA_MS), kayit(60 * DAKIKA_MS), kayit(60 * DAKIKA_MS + 1), kayit(null)]);
    expect(r.dk10).toMatchObject({ oranPpm: 250_000 });
    expect(r.dk60).toMatchObject({ oranPpm: 500_000 });
    expect(r.hedef60Gecti).toBe(false);
    expect(r.hedef10Gecti).toBe(false);
    // tam %70: 7/10
    const yedi = y2IlkSatis([...Array.from({ length: 7 }, () => kayit(30 * DAKIKA_MS)), ...Array.from({ length: 3 }, () => kayit(null))]);
    expect(yedi.hedef60Gecti).toBe(true);
  });

  it("Y3: çekirdekte sözleşme yok → ölçülemez; kayıt verilirse 24 sa eşiği", () => {
    const yok = y3IlkSozlesme(null);
    expect(yok.sonuc.olculebilir).toBe(false);
    expect(yok.hedefGecti).toBeNull();
    const var_ = y3IlkSozlesme([kayit(24 * SAAT), kayit(24 * SAAT + 1)]);
    expect(var_.sonuc).toMatchObject({ olculebilir: true, oranPpm: 500_000 });
    expect(var_.hedefGecti).toBe(true); // tam %50 hedefi tutar
  });
});

describe("Y5 açılış çeşitliliği", () => {
  const y = (...turler: string[]) => ({ katilmaMs: 0, yapilar: turler.map((tur, i) => ({ tur, zamanMs: i * SAAT })) });

  it("katman eşlemesi; bilinmeyen tür diger", () => {
    expect(yapiKatmani("ciftlik")).toBe("tarim");
    expect(yapiKatmani("hidro_santrali")).toBe("enerji");
    expect(yapiKatmani("cevher_madeni")).toBe("hammadde");
    expect(yapiKatmani("celikhane")).toBe("sanayi");
    expect(yapiKatmani("ticaret_ofisi")).toBe("hizmet");
    expect(yapiKatmani("uzay_istasyonu")).toBe("diger");
  });

  it("ikinci yapı dağılımı: tam %60 geçer, %60'ı aşan geçmez; hibrit oran", () => {
    // 5 oyuncu: ikinci yapı tarim ×3 (%60), hizmet ×2
    const tamAlti = y5AcilisCesitliligi([y("ciftlik", "ahir"), y("ciftlik", "mera"), y("hidro_santrali", "ciftlik"), y("ciftlik", "ticaret_ofisi"), y("ahir", "ambar")]);
    expect(tamAlti).toMatchObject({ olculebilir: true, enBuyukKatman: "tarim", enBuyukPayPpm: 600_000, hedefGecti: true, ikinciYapili: 5 });
    // hibrit: ilk iki yapısı farklı katmanda olan = hidro→ciftlik, ciftlik→ticaret, ahir→ambar = 3/5
    expect(tamAlti.olculebilir && tamAlti.hibritPayPpm).toBe(600_000);
    const asan = y5AcilisCesitliligi([y("ciftlik", "ahir"), y("ciftlik", "mera"), y("ciftlik", "ahir")]);
    expect(asan).toMatchObject({ enBuyukPayPpm: 1_000_000, hedefGecti: false });
  });

  it("24 saat penceresi: ikinci yapı 24 sa + 1 ms sonra ise sayılmaz; tek yapılı oyuncu hariç; hiç ikinci yok → ölçülemez", () => {
    const gec = { katilmaMs: 0, yapilar: [{ tur: "ciftlik", zamanMs: 0 }, { tur: "ahir", zamanMs: 24 * SAAT + 1 }] };
    expect(y5AcilisCesitliligi([gec]).olculebilir).toBe(false);
    const tam = { katilmaMs: 0, yapilar: [{ tur: "ciftlik", zamanMs: 0 }, { tur: "ahir", zamanMs: 24 * SAAT }] };
    expect(y5AcilisCesitliligi([tam]).olculebilir).toBe(true);
    expect(y5AcilisCesitliligi([y("ciftlik")]).olculebilir).toBe(false);
  });
});

describe("Y6 yön değiştirme", () => {
  it("7 gün içinde yön komutu: tam 7 gün sayılır, 1 ms fazlası sayılmaz; hedef ≥ %10", () => {
    const k = (t: number | null, gozlem = 30 * GUN) => ({ katilmaMs: 0, yonKomutlariMs: t === null ? [] : [t], gozlemSonuMs: gozlem });
    const r = y6YonDegistirme([k(7 * GUN), k(7 * GUN + 1), k(null), k(null), k(null), k(null), k(null), k(null), k(null), k(null)]);
    expect(r).toMatchObject({ olculebilir: true, yonDegistiren: 1, olculenOyuncu: 10, oranPpm: 100_000, hedefGecti: true });
    const dokuz = y6YonDegistirme([k(1), ...Array.from({ length: 10 }, () => k(null))]);
    expect(dokuz).toMatchObject({ oranPpm: 90_909, hedefGecti: false });
    expect(r.olculebilir && r.d7Farki.olculebilir).toBe(false);
  });

  it("7 günden az gözlenen ve yön değiştirmeyen ölçüm dışı; hepsi dışıysa ölçülemez", () => {
    const kisa = { katilmaMs: 0, yonKomutlariMs: [], gozlemSonuMs: 7 * GUN - 1 };
    expect(y6YonDegistirme([kisa]).olculebilir).toBe(false);
    const tam = { katilmaMs: 0, yonKomutlariMs: [], gozlemSonuMs: 7 * GUN };
    expect(y6YonDegistirme([tam]).olculebilir).toBe(true);
  });
});

describe("Y7 hibeden bağımsız net üretim geliri", () => {
  it("tam %50 sınırı: gelir = medyan/2 ulaşır, 1 eksik ulaşamaz (kesirsiz)", () => {
    // emsal [100, 200] -> medyan 150: eşik 75
    const r = y7UretimGeliri([{ gelir: 75, ilceGelirleri: [100, 200] }, { gelir: 74, ilceGelirleri: [100, 200] }]);
    expect(r).toMatchObject({ olculebilir: true, ulasan: 1, olculebilirOyuncu: 2, oyuncuPayiPpm: 500_000, hedefGecti: true });
    // tek uzunlukta emsal: [100] -> medyan 100: eşik 50
    expect(y7UretimGeliri([{ gelir: 50, ilceGelirleri: [100] }])).toMatchObject({ ulasan: 1 });
    expect(y7UretimGeliri([{ gelir: 49, ilceGelirleri: [100] }])).toMatchObject({ ulasan: 0, hedefGecti: false });
  });

  it("oyuncu payı hedefi: %50 tam geçer, altı geçmez", () => {
    const ok = { gelir: 100, ilceGelirleri: [100] };
    const kotu = { gelir: 1, ilceGelirleri: [100] };
    expect(y7UretimGeliri([ok, kotu])).toMatchObject({ oyuncuPayiPpm: 500_000, hedefGecti: true });
    expect(y7UretimGeliri([ok, kotu, kotu])).toMatchObject({ oyuncuPayiPpm: 333_333, hedefGecti: false });
  });

  it("negatif gelir ulaşamaz; emsal yok ya da medyan ≤ 0 ölçülemez", () => {
    expect(y7UretimGeliri([{ gelir: -5, ilceGelirleri: [100] }])).toMatchObject({ ulasan: 0 });
    expect(y7UretimGeliri([{ gelir: 5, ilceGelirleri: [] }]).olculebilir).toBe(false);
    expect(y7UretimGeliri([{ gelir: 5, ilceGelirleri: [0] }]).olculebilir).toBe(false);
    expect(y7UretimGeliri([{ gelir: 5, ilceGelirleri: [-4, 0] }]).olculebilir).toBe(false);
    const karisik = y7UretimGeliri([{ gelir: 5, ilceGelirleri: [] }, { gelir: 60, ilceGelirleri: [100] }]);
    expect(karisik).toMatchObject({ olcumDisi: 1, olculebilirOyuncu: 1, olguSayisi: 2 });
  });

  it("EMSAL KURALI: yalnız üreten (gelir > 0) emsal sayılır; 0 dışarıda, 1 içeride, negatif dışarıda", () => {
    expect(uretenEmsal([-5, 0, 1, 2])).toEqual([1, 2]);
    expect(uretenEmsal([0, 0])).toEqual([]);
    expect(() => uretenEmsal([1.5])).toThrow(/tamsayi/);
    // Üretimsiz emsaller medyanı aşağı çekmez: ham [0, 0, 0, 100] medyanı 0 olurdu (ölçülemez); üreten kümesi [100] -> medyan 100, eşik 50
    expect(y7UretimGeliri([{ gelir: 50, ilceGelirleri: [0, 0, 0, 100] }])).toMatchObject({ olculebilir: true, ulasan: 1 });
    expect(y7UretimGeliri([{ gelir: 49, ilceGelirleri: [0, 0, 0, 100] }])).toMatchObject({ olculebilir: true, ulasan: 0 });
    // Gelir 1 olan emsal içeride: tek emsal 1 -> medyan 1, eşik %50: gelir 1 ulaşır (1·2 ≥ 1)
    expect(y7UretimGeliri([{ gelir: 1, ilceGelirleri: [0, 1] }])).toMatchObject({ olculebilir: true, ulasan: 1 });
    // Gelir 0 olan emsal dışarıda: yalnız 0'lardan oluşan küme boş -> ölçülemez
    const r = y7UretimGeliri([{ gelir: 5, ilceGelirleri: [0] }]);
    expect(r).toEqual({ olculebilir: false, neden: "uretim yapan (geliri > 0) ilce emsali yok" });
  });

  it("tüm emsal üretimsizse sonuç ölçülemez (BELİRSİZ); bir olgu ölçülebilirse diğeri ölçüm dışı sayılır", () => {
    expect(y7UretimGeliri([{ gelir: 100, ilceGelirleri: [0, -3, 0] }]).olculebilir).toBe(false);
    const k = y7UretimGeliri([{ gelir: 100, ilceGelirleri: [0, 0] }, { gelir: 100, ilceGelirleri: [0, 100] }]);
    expect(k).toMatchObject({ olculebilir: true, olcumDisi: 1, olculebilirOyuncu: 1, ulasan: 1, olguSayisi: 2 });
  });

  it("büyük değerler taşmaz (BigInt karşılaştırma)", () => {
    const b = 4_000_000_000_000;
    expect(y7UretimGeliri([{ gelir: b / 2, ilceGelirleri: [b] }])).toMatchObject({ ulasan: 1 });
    expect(y7UretimGeliri([{ gelir: b / 2 - 1, ilceGelirleri: [b] }])).toMatchObject({ ulasan: 0 });
  });

  it("tamsayı dışı girdi reddedilir", () => {
    expect(() => y7UretimGeliri([{ gelir: 0.5, ilceGelirleri: [1] }])).toThrow(/tamsayi/);
  });
});

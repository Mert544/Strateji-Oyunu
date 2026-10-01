import { describe, expect, it } from "vitest";
import {
  H6_ACILIS_PENCERESI_MS,
  acilisKosuluOlgusu,
  acilisYapisiKuruldu,
  h6AcilisKosulu,
  tabanHucreYeter,
} from "../../src/parsel";

const GUN = 86_400_000;
const T = { ayrilmisBos: 3, ayakIzi: 3, yurtHucre: 6, katilmaMs: 10 * GUN, acilisYapiMs: [11 * GUN], gozlemSonuMs: 40 * GUN };

describe("H6 açılış koşulu (i): taban fiyatlı hücre ayak izine yeter (docs/12 §13)", () => {
  it("TAM SINIR: ayrılmış boş = ayak izi yeter; bir eksik yetmez; fazlası yeter", () => {
    expect(tabanHucreYeter(3, 3)).toBe(true);
    expect(tabanHucreYeter(2, 3)).toBe(false);
    expect(tabanHucreYeter(4, 3)).toBe(true);
    expect(tabanHucreYeter(0, 1)).toBe(false);
    expect(tabanHucreYeter(1, 1)).toBe(true);
  });

  it("yurt HARİÇ: olgu kararı yurda bakmaz; yurt dahil sayım yalnız bilgidir", () => {
    // ayrılmış boş 2 < ayak izi 3: koşul tutmaz; yurt (6) dahil sayılırsa 8 >= 3 tutardı (bilgi)
    const o = acilisKosuluOlgusu({ ...T, ayrilmisBos: 2 });
    expect(o.tabanYeter).toBe(false);
    expect(o.tabanYeterYurtDahil).toBe(true);
    expect(o.gecti).toBe(false);
    // Yurt dahil sayımın sınırı: ayrılmış boş + yurt = ayak izi yeter; bir eksik yetmez
    expect(acilisKosuluOlgusu({ ...T, ayrilmisBos: 0, yurtHucre: 3, ayakIzi: 3 }).tabanYeterYurtDahil).toBe(true);
    expect(acilisKosuluOlgusu({ ...T, ayrilmisBos: 0, yurtHucre: 2, ayakIzi: 3 }).tabanYeterYurtDahil).toBe(false);
  });

  it("girdi denetimi: tamsayı, negatif boş yok, ayak izi >= 1", () => {
    expect(() => tabanHucreYeter(-1, 1)).toThrow(/negatif/);
    expect(() => tabanHucreYeter(1, 0)).toThrow(/ayakIzi/);
    expect(() => tabanHucreYeter(1.5, 1)).toThrow(/tamsayi/);
    expect(() => acilisKosuluOlgusu({ ...T, yurtHucre: -1 })).toThrow(/yurtHucre/);
  });
});

describe("H6 açılış koşulu (ii): katılımdan sonra 14 günde açılış yapısı", () => {
  const k = 10 * GUN;
  const gozlem = 60 * GUN;

  it("pencere 14 gün; 14. gün (tam sınır) DAHİL, 15. gün DEĞİL", () => {
    expect(H6_ACILIS_PENCERESI_MS).toBe(14 * GUN);
    expect(acilisYapisiKuruldu(k, [k + 14 * GUN], gozlem)).toEqual({ kuruldu: true, ilkGecikmeMs: 14 * GUN });
    expect(acilisYapisiKuruldu(k, [k + 14 * GUN + 1], gozlem)).toEqual({ kuruldu: false, ilkGecikmeMs: null });
    expect(acilisYapisiKuruldu(k, [k + 15 * GUN], gozlem).kuruldu).toBe(false);
    expect(acilisYapisiKuruldu(k, [k + 13 * GUN + GUN - 1], gozlem).kuruldu).toBe(true); // 14. günün ilk anından önce
  });

  it("katılım anındaki yapı sayılır (gecikme 0); katılımdan ÖNCEKİ komut sayılmaz", () => {
    expect(acilisYapisiKuruldu(k, [k], gozlem)).toEqual({ kuruldu: true, ilkGecikmeMs: 0 });
    expect(acilisYapisiKuruldu(k, [k - 1], gozlem).kuruldu).toBe(false);
  });

  it("en erken pencere içi yapı seçilir; pencere dışı yapılar yok sayılır", () => {
    expect(acilisYapisiKuruldu(k, [k + 20 * GUN, k + 5 * GUN, k + 2 * GUN], gozlem)).toEqual({ kuruldu: true, ilkGecikmeMs: 2 * GUN });
  });

  it("pencere dolmadan yapı yoksa ÖLÇÜLEMEZ (null); gözlem tam 14 günü kapsıyorsa false", () => {
    expect(acilisYapisiKuruldu(k, [], k + 14 * GUN - 1).kuruldu).toBeNull();
    expect(acilisYapisiKuruldu(k, [], k + 14 * GUN).kuruldu).toBe(false);
    // Pencere dolmamış olsa da yapı varsa true
    expect(acilisYapisiKuruldu(k, [k + 3 * GUN], k + 4 * GUN).kuruldu).toBe(true);
  });

  it("tamsayı denetimi", () => {
    expect(() => acilisYapisiKuruldu(k, [1.5], gozlem)).toThrow(/tamsayi/);
  });
});

describe("H6 açılış koşulu: olgu ve toplu karar (karara yalnız (i) girer; (ii) bilgi, insan testi gerekli)", () => {
  it("olgu kararı = (i); (ii) tutmasa ya da ölçülemese de karar değişmez, yalnız bilgi alanı", () => {
    expect(acilisKosuluOlgusu(T).gecti).toBe(true);
    expect(acilisKosuluOlgusu({ ...T, ayrilmisBos: 2 }).gecti).toBe(false);
    // yapı 14. günde: (ii) evet; 15. günde: (ii) hayır — ikisinde de olgu kararı (i)'den gelir (geçti)
    const on4 = acilisKosuluOlgusu({ ...T, acilisYapiMs: [T.katilmaMs + 14 * GUN] });
    const on5 = acilisKosuluOlgusu({ ...T, acilisYapiMs: [T.katilmaMs + 15 * GUN] });
    expect([on4.yapiKuruldu, on4.gecti]).toEqual([true, true]);
    expect([on5.yapiKuruldu, on5.gecti]).toEqual([false, true]);
    const bilinmez = acilisKosuluOlgusu({ ...T, acilisYapiMs: [], gozlemSonuMs: T.katilmaMs + 2 * GUN });
    expect([bilinmez.yapiKuruldu, bilinmez.gecti]).toEqual([null, true]);
    // (i) tutmuyorsa (ii) iyi olsa da KALDI
    expect(acilisKosuluOlgusu({ ...T, ayrilmisBos: 2, acilisYapiMs: [T.katilmaMs] }).gecti).toBe(false);
  });

  it("toplu: TÜM olgular (i)'yi sağlarsa tutar; biri kalırsa KALDI; olgu yoksa ölçülemez; (ii) yalnız sayaç", () => {
    const iyi = acilisKosuluOlgusu(T);
    const yetmez = acilisKosuluOlgusu({ ...T, ayrilmisBos: 2 });
    const yapisiz = acilisKosuluOlgusu({ ...T, acilisYapiMs: [T.katilmaMs + 15 * GUN] });
    const bilinmez = acilisKosuluOlgusu({ ...T, acilisYapiMs: [], gozlemSonuMs: T.katilmaMs + 2 * GUN });
    expect(h6AcilisKosulu([iyi, iyi])).toMatchObject({ olculebilir: true, olguSayisi: 2, gecen: 2, hedefGecti: true, yapiKurulduSayisi: 2, yapiOlculenOlgu: 2 });
    expect(h6AcilisKosulu([iyi, yetmez])).toMatchObject({ gecen: 1, hedefGecti: false, tabanYeterYurtDahilSayisi: 2, yapiKurulduSayisi: 2 });
    expect(h6AcilisKosulu([iyi, yapisiz, bilinmez])).toMatchObject({ gecen: 3, hedefGecti: true, yapiKurulduSayisi: 1, yapiOlculenOlgu: 2 });
    expect(h6AcilisKosulu([])).toEqual({ olculebilir: false, neden: "geç katılan olgusu yok" });
  });
});

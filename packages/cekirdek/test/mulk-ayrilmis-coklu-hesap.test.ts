/**
 * Çok hesaplı alıcıya karşı iki ayrılmış hücre kuralı (P3b; docs/06 §15.1; baş lider kararı docs/12 §13), ikisi birlikte ve parametreli:
 *  1. ayrılmış hücre yalnız hesabın KATILIM ilçesinde (yurt ilçesi; yurtsuz katılımda `oyuncu_katil.ilce`; ikisi de yoksa alınamaz) ve katılımın ilk
 *     `ayrilmisGun` (14) gününde satılır; hesap başına 12 hücre tavanı aynen kalır;
 *  2. ilçe başına GÜNLÜK ayrılmış satış tavanı: ilçenin ayrılmış stokunun %10'u, en az 6 hücre; gün = sim günü (`floor(zaman / GUN)`).
 * `parsel_al` ve `yapi_yerlestir` aynı planlayıcıyı kullanır. Kural kapalıyken (parametre yok) eski davranış ve yeni alan yazılmaz.
 */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { SISTEM_OYUNCUSU } from "../src/motor";
import type { Simulasyon } from "../src/motor";
import { mulkOyuncuBul } from "../src/mulk";
import { dunyaCoz, dunyaSerilestir, SerilestirmeHatasi } from "../src/serilestir";
import { anlikHazine } from "../src/stok";
import { GUN, PPM } from "../src/tipler";
import type { CekirdekVeriPaketi, Komut } from "../src/tipler";
import { bitisikCift, mulkSim, mulkVeriTam, tamam, ver } from "./mulk-yardimci";

const F = parselFiksturuYukle("mini-6");
const OVA = "sn_m_ova_merkez";
const LIMAN = "sn_m_liman_merkez";

function veri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.yurtHucre = 0;
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.hibe = 5_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
    m.yeniOyuncu.ayrilmisHucrePpm = 500_000;
    m.ilcePayTavaniPpm = PPM;
    m.ilceHucreTavani = 72;
    m.esZamanliInsaat = 10;
    duzenle?.(v);
  });
}

function katil(s: Simulasyon, oyuncu: string, ilce?: string, t = s.dunya.zaman) {
  const komut: Komut = ilce === undefined ? { tur: "oyuncu_katil", oyuncu, bolgeler: [] } : { tur: "oyuncu_katil", oyuncu, bolgeler: [], ilce };
  return s.uygula({ t, oyuncu: SISTEM_OYUNCUSU, komut });
}

const ayr = (s: Simulasyon, ilce: string, ayrilmis = true, sinif: "kirsal" | "kasaba" | "sehir" = "kirsal"): string[] =>
  F.ilceler.find((c) => c.id === ilce)!.hucreler.filter((h) => h.uygun && h.sinif === sinif && s.ic.mulk!.ayrilmis.has(h.id) === ayrilmis).map((h) => h.id);
const al = (ilce: string, hucreler: string[], sinif: "kirsal" | "kasaba" | "sehir" = "kirsal"): Komut => ({ tur: "parsel_al", ilce, hucreler, sinif });
const ilce = (s: Simulasyon, id: string) => s.dunya.mulk!.ilceler.find((c) => c.id === id)!;

describe("1. katılım ilçesi ve katılımın ilk 14 günü", () => {
  it("yurtsuz katılımda katılım ilçesi `oyuncu_katil.ilce`; yurtlu katılımda yurt ilçesi; ilçesiz yurtsuz katılımda yok (ayrılmış alınamaz, serbest hücre alınır)", () => {
    const s = mulkSim([], veri((v) => (v.param.mulk!.yeniOyuncu.yurtHucre = 6)), 3);
    tamam(s, SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "yurtlu", bolgeler: [] });
    const yurtIlcesi = s.dunya.mulk!.hucreler.find((h) => h.sahip === "yurtlu")!.ilce;
    expect(mulkOyuncuBul(s.dunya, "yurtlu")!.katilimIlcesi).toBe(yurtIlcesi);
    const t = mulkSim([], veri(), 3);
    expect(katil(t, "a", OVA).tamam).toBe(true);
    expect(mulkOyuncuBul(t.dunya, "a")!.katilimIlcesi).toBe(OVA);
    expect(katil(t, "b").tamam).toBe(true);
    expect(mulkOyuncuBul(t.dunya, "b")!.katilimIlcesi).toBeUndefined();
    const r = ver(t, "b", al(OVA, ayr(t, OVA).slice(0, 1)));
    expect(r.tamam === false && r.hata).toMatch(/^ayrilmis hucre yalniz katilim ilcesinde satilir \(katilim ilcesi: yok\)/);
    tamam(t, "b", al(OVA, ayr(t, OVA, false).slice(0, 1))); // serbest hücre herkese açık
  });

  it("başka ilçede ret: katılım ilçesi OVA iken LIMAN'daki ayrılmış hücre alınamaz (serbest alınır); katılım ilçesinde alınır; hata katılım ilçesini söyler", () => {
    const s = mulkSim([], veri(), 3);
    katil(s, "a", OVA);
    const r = ver(s, "a", al(LIMAN, ayr(s, LIMAN).slice(0, 1)));
    expect(r.tamam === false && r.hata).toMatch(new RegExp(`^ayrilmis hucre yalniz katilim ilcesinde satilir \\(katilim ilcesi: ${OVA}\\)`));
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBeUndefined();
    tamam(s, "a", al(LIMAN, ayr(s, LIMAN, false).slice(0, 1)));
    tamam(s, "a", al(OVA, ayr(s, OVA).slice(0, 2)));
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBe(2);
  });

  it("14. gün sınırı: katılımdan 14 gün − 1 ms içinde ayrılmış hücre alınır, 14. günün başında alınamaz (serbest hücre alınır)", () => {
    const s = mulkSim([], veri(), 3);
    katil(s, "a", OVA, 0);
    const l = ayr(s, OVA);
    expect(ver(s, "a", al(OVA, [l[0]!]), 14 * GUN - 1).tamam).toBe(true);
    const r = ver(s, "a", al(OVA, [l[1]!]), 14 * GUN);
    expect(r.tamam === false && r.hata).toMatch(/^hucre yeni oyunculara ayrilmis \(katilimin ilk 14 gunu\)/);
    expect(ver(s, "a", al(OVA, ayr(s, OVA, false).slice(0, 1)), 14 * GUN).tamam).toBe(true);
  });

  it("hesap başına 12 ayrılmış hücre tavanı aynen kalır (günlük tavan 12'den büyükken de hesap tavanı bağlar)", () => {
    const s = mulkSim([], veri((v) => {
      v.param.mulk!.yeniOyuncu.ayrilmisIlceGunlukEnAz = 40; // günlük tavan gevşek: yalnız hesap tavanı bağlasın
      v.param.mulk!.yeniOyuncu.ayrilmisHucrePpm = PPM;
    }), 3);
    katil(s, "a", OVA);
    const l = ayr(s, OVA);
    tamam(s, "a", al(OVA, l.slice(0, 12)));
    const r = ver(s, "a", al(OVA, l.slice(12, 13)));
    expect(r.tamam === false && r.hata).toBe("hesap basina en cok 12 ayrilmis hucre (mevcut 12)");
  });
});

describe("2. ilçe başına günlük ayrılmış satış tavanı (ayrılmış stokun %10'u, en az 6)", () => {
  it("küçük ilçe: tavan = en az 6; tam sınır (6) kabul, +1 ret; sayaç ilçe durumunda, yalnız kullanılınca yazılır", () => {
    const s = mulkSim([], veri(), 3);
    for (const o of ["a", "b"]) katil(s, o, OVA, 0);
    const stok = s.ic.mulk!.ayrilmisIlceSayisi.get(OVA)!;
    expect(Math.floor(stok / 10)).toBeLessThan(6); // %10 < 6: alt sınır bağlar
    expect(ilce(s, OVA).ayrilmisGunluk).toBeUndefined();
    const l = ayr(s, OVA);
    tamam(s, "a", al(OVA, l.slice(0, 4)));
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: 4 });
    tamam(s, "b", al(OVA, l.slice(4, 6))); // başka hesap: aynı ilçe sayacı → tam 6
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: 6 });
    const r = ver(s, "a", al(OVA, l.slice(6, 7)));
    expect(r.tamam === false && r.hata).toBe(`ilcede gunluk ayrilmis satis tavani asildi: ${OVA} (tavan 6, bugun 6, istenen 1)`);
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: 6 });
    // başka ilçenin sayacı ayrı
    expect(ilce(s, LIMAN).ayrilmisGunluk).toBeUndefined();
  });

  it("büyük ayrılmış stok: tavan = floor(stok × %10) (en az 6'nın üstünde); tam sınır kabul, +1 ret", () => {
    const s = mulkSim([], veri((v) => (v.param.mulk!.yeniOyuncu.ayrilmisHucrePpm = PPM)), 3);
    const hesaplar = ["a", "b", "c", "d"];
    for (const o of hesaplar) katil(s, o, OVA, 0);
    const stok = s.ic.mulk!.ayrilmisIlceSayisi.get(OVA)!;
    const tavan = Math.floor(stok / 10);
    expect(tavan).toBeGreaterThan(6);
    const l = ayr(s, OVA);
    // hesap başına en çok 12: tavanı birkaç hesapla doldur
    let alinan = 0;
    for (const o of hesaplar) {
      const n = Math.min(12, tavan - alinan);
      if (n <= 0) break;
      tamam(s, o, al(OVA, l.slice(alinan, alinan + n)));
      alinan += n;
    }
    expect(alinan).toBe(tavan);
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: tavan });
    const r = ver(s, "d", al(OVA, l.slice(alinan, alinan + 1)));
    expect(r.tamam === false && r.hata).toBe(`ilcede gunluk ayrilmis satis tavani asildi: ${OVA} (tavan ${tavan}, bugun ${tavan}, istenen 1)`);
  });

  it("gün dönümü: tavan dolu iken gün sonunda (zaman = gün × GUN − 1) ret, ertesi günün başında (zaman = GUN) yeniden satış; sayaç yeni güne yazılır", () => {
    const s = mulkSim([], veri(), 3);
    katil(s, "a", OVA, 0);
    katil(s, "b", OVA, 0);
    const l = ayr(s, OVA);
    tamam(s, "a", al(OVA, l.slice(0, 6)), 1000);
    expect(ver(s, "b", al(OVA, l.slice(6, 7)), GUN - 1).tamam).toBe(false);
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: 6 });
    // gün 1: sayaç sıfırdan sayılır; yine en çok 6
    tamam(s, "b", al(OVA, l.slice(6, 12)), GUN);
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 1, adet: 6 });
    expect(ver(s, "a", al(OVA, l.slice(12, 13)), GUN + 5).tamam).toBe(false);
    // gün 2'nin başı: yeniden açılır (14 gün penceresi içinde)
    expect(ver(s, "a", al(OVA, l.slice(12, 13)), 2 * GUN).tamam).toBe(true);
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 2, adet: 1 });
  });

  it("parsel_birak günlük sayacı geri vermez (bırakıp yeniden almak tavanı aşmanın yolu değildir); serbest hücre satışları sayaca girmez; yurt (bedava) satış değildir", () => {
    const s = mulkSim([], veri((v) => (v.param.mulk!.yeniOyuncu.yurtHucre = 6)), 3);
    tamam(s, SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [] });
    const yurtIlcesi = mulkOyuncuBul(s.dunya, "a")!.katilimIlcesi!;
    expect(ilce(s, yurtIlcesi).ayrilmisGunluk).toBeUndefined(); // yurt sayaçta yok
    const serbest = ayr(s, yurtIlcesi, false).filter((id) => s.dunya.mulk!.hucreler.every((h) => h.id !== id));
    tamam(s, "a", al(yurtIlcesi, serbest.slice(0, 3)));
    expect(ilce(s, yurtIlcesi).ayrilmisGunluk).toBeUndefined();
    const bos = ayr(s, yurtIlcesi).filter((id) => s.dunya.mulk!.hucreler.every((h) => h.id !== id));
    tamam(s, "a", al(yurtIlcesi, bos.slice(0, 2)));
    tamam(s, "a", { tur: "parsel_birak", ilce: yurtIlcesi, hucreler: bos.slice(0, 2) });
    expect(ilce(s, yurtIlcesi).ayrilmisGunluk).toEqual({ gun: 0, adet: 2 });
  });
});

describe("atomiklik ve yapi_yerlestir", () => {
  it("tavanı aşan karma komut (ayrılmış + serbest) TAMAMEN reddedilir: hazine, hücreler, sayaçlar ve durum özeti değişmez", () => {
    const s = mulkSim([], veri(), 3);
    katil(s, "a", OVA, 0);
    const l = ayr(s, OVA);
    tamam(s, "a", al(OVA, l.slice(0, 5)));
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    const h0 = anlikHazine(s.dunya, "a");
    const r = ver(s, "a", al(OVA, [...l.slice(5, 7), ...ayr(s, OVA, false).slice(0, 3)].sort())); // 2 ayrılmış > kalan 1
    expect(r.tamam).toBe(false);
    expect(s.durumOzeti()).toBe(once);
    expect(anlikHazine(s.dunya, "a")).toBe(h0);
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: 5 });
    expect(s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a")).toHaveLength(5);
    // kalan 1 ayrılmış + serbest kabul
    tamam(s, "a", al(OVA, [l[5], ...ayr(s, OVA, false).slice(0, 3)].sort() as string[]));
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: 6 });
  });

  it("yapi_yerlestir aynı kurallara uyar: başka ilçede ret, günlük tavan (parsel_al ile ORTAK sayaç), katılım ilçesinde kabul", () => {
    const s = mulkSim([], veri(), 3);
    katil(s, "a", OVA, 0);
    const yerlestir = (hucreler: string[], i: string = OVA): Komut => ({ tur: "yapi_yerlestir", ilce: i, tesisTuru: "ciftlik", hucreler, sinif: "kirsal" });
    const lim = bitisikCift(ayr(s, LIMAN));
    const r1 = ver(s, "a", yerlestir([...lim], LIMAN));
    expect(r1.tamam === false && r1.hata).toMatch(/^ayrilmis hucre yalniz katilim ilcesinde satilir/);
    const cift = bitisikCift(ayr(s, OVA));
    tamam(s, "a", yerlestir([...cift]));
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: 2 });
    // parsel_al ile aynı sayaç: 4 daha → 6 (tam sınır); sonra yapi_yerlestir +2 ret
    const kalan = ayr(s, OVA).filter((id) => !cift.includes(id));
    tamam(s, "a", al(OVA, kalan.slice(0, 4)));
    expect(ilce(s, OVA).ayrilmisGunluk).toEqual({ gun: 0, adet: 6 });
    const kalan2 = ayr(s, OVA).filter((id) => s.dunya.mulk!.hucreler.every((h) => h.id !== id));
    const r2 = ver(s, "a", yerlestir([...bitisikCift(kalan2)]));
    expect(r2.tamam === false && r2.hata).toMatch(/^ilcede gunluk ayrilmis satis tavani asildi/);
  });
});

describe("parametreli: kural kapalıyken eski davranış, yeni alan yazılmaz; serileştirme", () => {
  it("üç parametre yokken: ilçe kısıtı ve günlük tavan yok; katilimIlcesi ve ayrilmisGunluk hiç yazılmaz", () => {
    const s = mulkSim([], veri((v) => {
      const y = v.param.mulk!.yeniOyuncu;
      delete y.ayrilmisYalnizKatilimIlcesi;
      delete y.ayrilmisIlceGunlukPpm;
      delete y.ayrilmisIlceGunlukEnAz;
    }), 3);
    katil(s, "a"); // ilçesiz, yurtsuz
    expect(mulkOyuncuBul(s.dunya, "a")!.katilimIlcesi).toBeUndefined();
    tamam(s, "a", al(LIMAN, ayr(s, LIMAN).slice(0, 7))); // başka ilçe ve 6'dan fazla: eski davranışta serbest (hesap tavanı 12 içinde)
    expect(ilce(s, LIMAN).ayrilmisGunluk).toBeUndefined();
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBe(7);
  });

  it("yalnız biri açıkken öteki uygulanmaz (parametreler bağımsızdır)", () => {
    const yalnizIlce = mulkSim([], veri((v) => {
      delete v.param.mulk!.yeniOyuncu.ayrilmisIlceGunlukPpm;
      delete v.param.mulk!.yeniOyuncu.ayrilmisIlceGunlukEnAz;
    }), 3);
    katil(yalnizIlce, "a", OVA);
    tamam(yalnizIlce, "a", al(OVA, ayr(yalnizIlce, OVA).slice(0, 9))); // günlük tavan yok
    const yalnizGunluk = mulkSim([], veri((v) => delete v.param.mulk!.yeniOyuncu.ayrilmisYalnizKatilimIlcesi), 3);
    katil(yalnizGunluk, "a");
    tamam(yalnizGunluk, "a", al(LIMAN, ayr(yalnizGunluk, LIMAN).slice(0, 4))); // ilçe kısıtı yok
    expect(ver(yalnizGunluk, "a", al(LIMAN, ayr(yalnizGunluk, LIMAN).slice(4, 8))).tamam).toBe(false); // günlük tavan 6 var (4+4 > 6)
  });

  it("serileştirme gidiş-dönüş: katilimIlcesi ve ilçe sayacı korunur; bozuk değer reddedilir", () => {
    const s = mulkSim([], veri(), 3);
    katil(s, "a", OVA);
    tamam(s, "a", al(OVA, ayr(s, OVA).slice(0, 3)));
    const metin = dunyaSerilestir(s.dunya);
    const d2 = dunyaCoz(metin);
    expect(dunyaSerilestir(d2)).toBe(metin);
    expect(mulkOyuncuBul(d2, "a")!.katilimIlcesi).toBe(OVA);
    expect(d2.mulk!.ilceler.find((c) => c.id === OVA)!.ayrilmisGunluk).toEqual({ gun: 0, adet: 3 });
    const boz = (f: (j: any) => void) => () => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const j = JSON.parse(metin);
      f(j);
      return dunyaCoz(JSON.stringify(j));
    };
    expect(boz((j) => (j.mulk.ilceler.find((c: { id: string }) => c.id === OVA).ayrilmisGunluk.adet = 0))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.mulk.ilceler.find((c: { id: string }) => c.id === OVA).ayrilmisGunluk.gun = -1))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.mulk.oyuncular[0].katilimIlcesi = 5))).toThrow(SerilestirmeHatasi);
  });
});

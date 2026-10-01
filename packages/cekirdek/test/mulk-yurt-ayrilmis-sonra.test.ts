/**
 * Yurt önce AYRILMIŞ DIŞINDAN (P3d; docs/06 §15.1; `mulk.yeniOyuncu.yurtAyrilmisSonra`): ayrılmış havuz geç gelenler içindir. Parametre açıkken yurt kümesi
 * önce ayrılmış olmayan hücrelerden kurulur; bağlı küme başka türlü kurulamıyorsa ayrılmış hücreler YEDEK olarak dahil edilir. Kamu hücreleri dışarıda kalır;
 * ilçe tercihi (doluluk sırası) değişmez; durum alanı eklenmez; parametre yokken eski davranış.
 */
import { describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU } from "../src/motor";
import type { Simulasyon } from "../src/motor";
import { kenarBitisikMi } from "../src/mulk/durum";
import { dunyaCoz, dunyaSerilestir } from "../src/serilestir";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { PPM } from "../src/tipler";
import { mulkSim, mulkVeriTam } from "./mulk-yardimci";

const OVA = "sn_m_ova_merkez";

function veri(ac: boolean | undefined, ayrilmisPpm: number, duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const y = v.param.mulk!.yeniOyuncu;
    y.yurtHucre = 6;
    y.ayrilmisHucrePpm = ayrilmisPpm;
    if (ac === undefined) delete y.yurtAyrilmisSonra;
    else y.yurtAyrilmisSonra = ac;
    duzenle?.(v);
  });
}

function katil(s: Simulasyon, oyuncu: string, ilce?: string) {
  return s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: ilce === undefined ? { tur: "oyuncu_katil", oyuncu, bolgeler: [] } : { tur: "oyuncu_katil", oyuncu, bolgeler: [], ilce } });
}
const yurt = (s: Simulasyon, o: string) => s.dunya.mulk!.hucreler.filter((h) => h.sahip === o).map((h) => h.id).sort();
const ayrilmisSayisi = (s: Simulasyon, o: string) => yurt(s, o).filter((id) => s.ic.mulk!.ayrilmis.has(id)).length;

describe("yurt önce ayrılmış dışından", () => {
  it("ayrılmamış hücre yeterliyken yurtta HİÇ ayrılmış hücre olmaz (kapalıyken aynı dünyada olur: test anlamlı)", () => {
    const kapali = mulkSim([], veri(false, 400_000), 5);
    katil(kapali, "a", OVA);
    expect(ayrilmisSayisi(kapali, "a")).toBeGreaterThan(0);
    const acik = mulkSim([], veri(true, 400_000), 5);
    expect(katil(acik, "a", OVA).tamam).toBe(true);
    expect(yurt(acik, "a")).toHaveLength(6);
    expect(ayrilmisSayisi(acik, "a")).toBe(0);
    expect(kenarBitisikMi(yurt(acik, "a"))).toBe(true);
    // kamu hücreleri dışarıda: kamu açık dünyada da (mulkVeriTam kamuyu kapatır; kamulu varyant)
  });

  it("yedek: ayrılmamış hücre bağlı küme kuramazsa ayrılmış hücreler dahil edilir ve küme bağlı kalır (tümü ayrılmış / %99 ayrılmış: ayrılmamış 1 hücre)", () => {
    for (const ppm of [PPM, 990_000]) {
      const s = mulkSim([], veri(true, ppm), 5);
      expect(katil(s, "a", OVA).tamam, `ppm ${ppm}`).toBe(true);
      expect(yurt(s, "a"), `ppm ${ppm}`).toHaveLength(6);
      expect(kenarBitisikMi(yurt(s, "a")), `ppm ${ppm}`).toBe(true);
      expect(ayrilmisSayisi(s, "a"), `ppm ${ppm}`).toBeGreaterThan(0);
      expect(mulkSimYurtIlcesi(s, "a")).toBe(OVA);
    }
  });

  it("parametre kapalı ya da yok: eski davranış (ayrılmış hücreler de verilebilir); ayrılmış hücre yokken açık ve kapalı AYNI yurdu verir", () => {
    const yok = mulkSim([], veri(undefined, 400_000), 5);
    const kapali = mulkSim([], veri(false, 400_000), 5);
    katil(yok, "a", OVA);
    katil(kapali, "a", OVA);
    expect(yurt(yok, "a")).toEqual(yurt(kapali, "a"));
    expect(ayrilmisSayisi(yok, "a")).toBeGreaterThan(0);
    // ayrılmış hücre yok: kural bir şey değiştirmez
    const a = mulkSim([], veri(true, 0), 5);
    const b = mulkSim([], veri(false, 0), 5);
    katil(a, "x", OVA);
    katil(b, "x", OVA);
    expect(yurt(a, "x")).toEqual(yurt(b, "x"));
    expect(a.durumOzeti()).toBe(b.durumOzeti());
  });

  it("ilçe tercihi (doluluk sırası) değişmez: ilçesiz katılımda açık ve kapalı aynı ilçeleri seçer", () => {
    const sec = (ac: boolean) => {
      const s = mulkSim([], veri(ac, 200_000), 5);
      for (const o of ["a", "b", "c"]) expect(katil(s, o).tamam).toBe(true);
      return ["a", "b", "c"].map((o) => mulkSimYurtIlcesi(s, o));
    };
    expect(sec(true)).toEqual(sec(false));
  });

  it("atomiklik: yurt verilemeyen ilçede katılım reddedilir ve dünya, özet hiç değişmez (kural açıkken de)", () => {
    const s = mulkSim([], veri(true, 400_000, (v) => (v.param.mulk!.yeniOyuncu.yurtHucre = 70)), 5);
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    const r = katil(s, "a", OVA);
    expect(r.tamam).toBe(false);
    expect(s.durumOzeti()).toBe(once);
    expect(s.dunya.oyuncular.some((o) => o.id === "a")).toBe(false);
    expect(s.dunya.mulk!.hucreler).toHaveLength(0);
  });

  it("durum alanı eklenmez ve serileştirme etkilenmez: ayrılmış hücre yokken açık/kapalı dünyaların alan kümeleri ve özeti aynı; ayrılmışlı dünyada yalnız MEVCUT isteğe bağlı alanlar; gidiş-dönüş aynı metin", () => {
    const izle = (ac: boolean, ppm: number) => {
      const s = mulkSim([], veri(ac, ppm), 5);
      katil(s, "a", OVA);
      const mo = s.dunya.mulk!.oyuncular[0]!;
      const metin = dunyaSerilestir(s.dunya);
      expect(dunyaSerilestir(dunyaCoz(metin))).toBe(metin);
      return { s, mo: Object.keys(mo).sort(), ilce: Object.keys(s.dunya.mulk!.ilceler[0]!).sort(), hucre: Object.keys(s.dunya.mulk!.hucreler[0]!).sort() };
    };
    const a = izle(true, 0);
    const b = izle(false, 0);
    expect({ mo: a.mo, ilce: a.ilce, hucre: a.hucre }).toEqual({ mo: b.mo, ilce: b.ilce, hucre: b.hucre });
    expect(a.s.durumOzeti()).toBe(b.s.durumOzeti());
    // ayrılmışlı dünyada anahtarlar yalnız bilinen alanlardır (yurt ayrılmış dışından: ayrilmisHucre hiç yazılmaz)
    const c = izle(true, 400_000);
    expect(c.mo).toEqual(a.mo);
    expect(c.ilce).toEqual(a.ilce);
    expect(c.s.dunya.mulk!.oyuncular[0]!.ayrilmisHucre).toBeUndefined();
    const kapali = izle(false, 400_000);
    expect(kapali.s.dunya.mulk!.oyuncular[0]!.ayrilmisHucre).toBeGreaterThan(0); // eski davranışta yurtla gelen mevcut sayaç
  });
});

function mulkSimYurtIlcesi(s: Simulasyon, o: string): string {
  return s.dunya.mulk!.hucreler.find((h) => h.sahip === o)!.ilce;
}

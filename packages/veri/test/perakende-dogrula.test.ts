/**
 * Node-only ek doğrulayıcı (`veri/src/perakende-dogrula.ts`; sartname §4.5 Katman 2): V13 çıkmaz mal (yan ürün kuralı ve genel uyarı), V14 `mulk.sebeke`,
 * V15 mülk kipi yöntem oran bandı (uyarı), V17 `mulk.yontemGecersizKilma`; Y8 uyarısı. G6-1: bugünkü veride hata yok; bloklar yokken sonuç değişmez.
 */
import { describe, expect, it } from "vitest";
import { CIKMAZ_MAL_HATA, YAN_URUN_KURALI_HATA, dogrulaPerakende, miniVeriyiYukle, varsayilanVeriyiYukle, veriUyarilari } from "../src/index";

const kopya = <T>(x: T): T => structuredClone(x);
const hatalar = (r: ReturnType<typeof dogrulaPerakende>): string => (r.gecerli ? "" : r.hatalar.join("\n"));

describe("dogrulaPerakende: bugünkü veri (JSON değişmedi)", () => {
  it("hata yok; sabitler: çıkmaz mal ve yan ürün kuralı bu dilimde uyarı; yan ürün uyarısı kepek için var (tüketici yöntem G6-3'te gelir)", () => {
    expect(CIKMAZ_MAL_HATA).toBe(false);
    expect(YAN_URUN_KURALI_HATA).toBe(false);
    const v = miniVeriyiYukle();
    const r = dogrulaPerakende(v);
    expect(r.gecerli).toBe(true);
    expect(r.uyarilar).toContain("icerik: yan urun alicisiz: kepek");
    // yükleyici de aynı doğrulamadan geçer; uyarılar okunabilir (varsayılan sessiz)
    expect(veriUyarilari()).toContain("icerik: yan urun alicisiz: kepek");
  });

  it("yan ürün kuralı HATA kipinde (G6-3 ile açılır) bugünkü veriyi reddeder; elektrik muaf, gubre yöntem girdisi ya da gübre dozu ile karşılanır", () => {
    const v = varsayilanVeriyiYukle();
    const r = dogrulaPerakende(v, { yanUrunHata: true });
    expect(hatalar(r)).toBe("icerik: yan urun alicisiz: kepek");
    expect(r.uyarilar.some((u) => u.includes("yan urun"))).toBe(false);
    expect(r.uyarilar.some((u) => u.includes("cikmaz mal: elektrik"))).toBe(false);
    // kepeği tüketen bir yöntem + pazar emilimi: kural karşılanır
    const w = kopya(v);
    w.icerik.yontemler.find((y) => y.id === "ahir_besi")!.girdiler["kepek"] = 1000;
    expect(dogrulaPerakende(w, { yanUrunHata: true }).gecerli).toBe(true);
    // pazar emilimi (N) yoksa yine alıcısız
    w.param.pazar.emilimSaat["kepek"] = 0;
    expect(hatalar(dogrulaPerakende(w, { yanUrunHata: true }))).toBe("icerik: yan urun alicisiz: kepek");
  });

  it("genel çıkmaz mal kuralı: uyarı; HATA kipinde (P1 kapısı) aynı iletiler hata olur", () => {
    const v = varsayilanVeriyiYukle();
    const u = dogrulaPerakende(v).uyarilar.filter((x) => x.startsWith("icerik: cikmaz mal: "));
    expect(u.length).toBeGreaterThan(0);
    for (const x of u) expect(x).toMatch(/^icerik: cikmaz mal: [a-z_]+ \(tuketici turu [01] < 2\)$/);
    const h = dogrulaPerakende(v, { cikmazMalHata: true });
    expect(h.gecerli).toBe(false);
    expect(hatalar(h)).toContain(u[0]);
  });

  it("blok yokken sonuç yalnız bu uyarılardır: sebeke, gecersizKilma ve mulkKipi kuralları sessiz", () => {
    const v = miniVeriyiYukle();
    expect(v.param.mulk?.sebeke).toBeUndefined();
    expect(dogrulaPerakende(v).uyarilar.every((u) => u.startsWith("icerik: "))).toBe(true);
  });
});

describe("V14: mulk.sebeke içerik çaprazı", () => {
  const sebekeli = () => {
    const v = miniVeriyiYukle();
    v.param.mulk!.sebeke = { surum: 1, mallar: [{ mal: "elektrik", tavanOraniPpm: 1_000_000 }, { mal: "yakit", tavanOraniPpm: 1_000_000 }], kasaPayiPpm: 120_000 };
    return v;
  };

  it("elektrik ve yakıt kayıtlı bugünkü içerik: hata yok", () => {
    expect(dogrulaPerakende(sebekeli()).gecerli).toBe(true);
  });

  it("bilinmeyen mal", () => {
    const v = sebekeli();
    v.param.mulk!.sebeke!.mallar.push({ mal: "olmayan_mal", tavanOraniPpm: 1_000_000 });
    expect(hatalar(dogrulaPerakende(v))).toContain("sebeke.mallar: bilinmeyen mal: olmayan_mal");
  });

  it("elektrik: depolanabilir ilan edilirse ya da elektrik girdili yöntem yoksa reddedilir", () => {
    const v = sebekeli();
    v.icerik.mallar.find((m) => m.id === "elektrik")!.depolanabilir = true;
    expect(hatalar(dogrulaPerakende(v))).toContain("sebeke.mallar.elektrik: elektrik mali depolanamaz olmali");
    const w = sebekeli();
    for (const y of w.icerik.yontemler) delete y.girdiler["elektrik"];
    expect(hatalar(dogrulaPerakende(w))).toContain("sebeke.mallar.elektrik: elektrik girdisi tasiyan yontem yok");
  });

  it("elektrik dışı mal depolanamazsa reddedilir; hiçbir yöntemin girdisinde yoksa uyarı (ölü kayıt)", () => {
    const v = sebekeli();
    v.icerik.mallar.find((m) => m.id === "yakit")!.depolanabilir = false;
    expect(hatalar(dogrulaPerakende(v))).toContain("sebeke.mallar.yakit: elektrik disindaki sebeke mali depolanabilir olmali");
    const w = sebekeli();
    w.param.mulk!.sebeke!.mallar.push({ mal: "muhimmat", tavanOraniPpm: 500_000 });
    for (const y of w.icerik.yontemler) delete y.girdiler["muhimmat"];
    const r = dogrulaPerakende(w);
    expect(r.gecerli).toBe(true);
    expect(r.uyarilar).toContain("sebeke.mallar.muhimmat: olu kayit (hicbir yontemin girdisinde yok)");
  });
});

describe("V15: mulkKipi yöntem çıktı/girdi değer oranı bandı [1,16; 1,48] (uyarı)", () => {
  it("bant içi sessiz, dışı uyarı; mulkKipi olmayan yöntem denetlenmez; taban fiyatla tamsayı", () => {
    const v = varsayilanVeriyiYukle();
    // sentetik mulkKipi yöntemi: girdi 1000 tahıl (taban a), çıktı b; oranı elle kur
    const y = v.icerik.yontemler.find((k) => k.id === "standart_gida_isleme")!;
    const taban = (m: string) => v.icerik.mallar.find((x) => x.id === m)!.tabanFiyat;
    const girdiDeger = Object.entries(y.girdiler).reduce((a, [m, q]) => a + q * taban(m), 0);
    const [cikti] = Object.keys(y.ciktilar);
    const ayarla = (yuzde: number): void => {
      y.ciktilar = { [cikti as string]: Math.floor((girdiDeger * yuzde) / 100 / taban(cikti as string)) };
    };
    // mulkKipi yok: denetlenmez (kaç olursa olsun)
    ayarla(300);
    expect(dogrulaPerakende(v).uyarilar.some((u) => u.includes("oran bandi disi"))).toBe(false);
    y.mulkKipi = true;
    ayarla(300);
    expect(dogrulaPerakende(v).uyarilar).toContain("icerik.yontemler.standart_gida_isleme: oran bandi disi");
    ayarla(120);
    expect(dogrulaPerakende(v).uyarilar.some((u) => u.includes("oran bandi disi"))).toBe(false);
    ayarla(110);
    expect(dogrulaPerakende(v).uyarilar).toContain("icerik.yontemler.standart_gida_isleme: oran bandi disi");
    ayarla(149);
    expect(dogrulaPerakende(v).uyarilar).toContain("icerik.yontemler.standart_gida_isleme: oran bandi disi");
    ayarla(147);
    expect(dogrulaPerakende(v).uyarilar.some((u) => u.includes("oran bandi disi"))).toBe(false);
    // uyarı hata değildir
    ayarla(300);
    expect(dogrulaPerakende(v).gecerli).toBe(true);
  });
});

describe("V17: mulk.yontemGecersizKilma anahtarları içerik yöntemleridir", () => {
  it("bilinmeyen yöntem reddedilir; bilinen (mulkKipi olmayan dahil) geçer", () => {
    const v = miniVeriyiYukle();
    v.param.mulk!.yontemGecersizKilma = { standart_gida_isleme: { ciktiPpm: 750_000 } };
    expect(dogrulaPerakende(v).gecerli).toBe(true);
    v.param.mulk!.yontemGecersizKilma["olmayan_yontem"] = { ciktiPpm: 1_000_000 };
    expect(hatalar(dogrulaPerakende(v))).toContain("yontemGecersizKilma: bilinmeyen yontem: olmayan_yontem");
  });
});

describe("Y8: tür başına yöntem sayısı > 10 uyarısı", () => {
  it("dogrulaPerakende uyarı olarak iletir (hata değil)", () => {
    const v = varsayilanVeriyiYukle();
    const t = v.icerik.tesisTurleri.find((x) => x.id === "ciftlik")!;
    t.yontemler = [...t.yontemler, ...Array.from({ length: 10 }, (_, i) => `ek_${i}`)];
    const r = dogrulaPerakende(v);
    expect(r.gecerli).toBe(true);
    expect(r.uyarilar.some((u) => u.startsWith("icerik.tesisTurleri.ciftlik: yontem sayisi > 10"))).toBe(true);
  });
});

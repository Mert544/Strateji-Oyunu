import { describe, expect, it } from "vitest";
import {
  PARSEL_H6_BASARI_ESIK_PPM,
  gecKatilanIkiBicim,
  h6ParselIkiBicim,
  hibeArindir,
  servetOrani,
  servetToplami,
  ucuzHucreAyrintisi,
  ucuzHucrePayi,
} from "../../src/parsel";

const HIBE_KIT = 100; // örnek: hibe + kit değeri

describe("H6 iki biçim: servet bileşenleri ve arındırma", () => {
  it("servet = hazine + stok + arazi + yapı; tamsayı denetimi", () => {
    expect(servetToplami({ hazine: 10, stok: 20, arazi: 0, yapi: 5 })).toBe(35);
    expect(() => servetToplami({ hazine: 1.5, stok: 0, arazi: 0, yapi: 0 })).toThrow(/tamsayi/);
  });

  it("arındırma: ham − (hibe + kit); sınırda 0; negatif olabilir", () => {
    expect(hibeArindir(300, 60, 40)).toBe(200);
    expect(hibeArindir(100, 60, 40)).toBe(0);
    expect(hibeArindir(99, 60, 40)).toBe(-1);
    expect(() => hibeArindir(1, 0.5, 0)).toThrow(/tamsayi/);
  });

  it("iki biçim: hibe iki tarafta da çıkarıldığından ulaşma karşılaştırması sınırda DEĞİŞMEZ (eşit paket)", () => {
    // Ham: 150 >= 150 (medyan 150) ulaşır; arındırılmış: 50 >= 50 ulaşır. Bir eksik: ikisi de ulaşamaz.
    const sinir = gecKatilanIkiBicim([{ servet: 150, ilceServetleri: [100, 200], hibeKitDegeri: HIBE_KIT }]);
    expect(sinir.ham.basariPpm).toBe(1_000_000);
    expect(sinir.arindirilmis.basariPpm).toBe(1_000_000);
    const alti = gecKatilanIkiBicim([{ servet: 149, ilceServetleri: [100, 200], hibeKitDegeri: HIBE_KIT }]);
    expect(alti.ham.basariPpm).toBe(0);
    expect(alti.arindirilmis.basariPpm).toBe(0);
  });

  it("emsal yoksa her iki biçim de ölçülemez (null)", () => {
    const r = gecKatilanIkiBicim([{ servet: 10, ilceServetleri: [], hibeKitDegeri: HIBE_KIT }]);
    expect(r.ham.basariPpm).toBeNull();
    expect(r.arindirilmis.basariPpm).toBeNull();
    expect(r.ham.olguSayisi).toBe(1);
  });

  it("DEĞİŞMEZLİK: ortak ofset (hibe + kit) altında medyana ulaşma karşılaştırması her sınırda aynı sonucu verir", () => {
    // Çift ve tek uzunlukta emsal; ofset küçük/büyük; sınır ±1.
    for (const emsal of [[100, 200], [100, 200, 400], [50]]) {
      for (const hibe of [0, 1, 100, 1_000]) {
        for (const servet of [24, 25, 26, 74, 75, 76, 149, 150, 151, 199, 200, 201]) {
          const r = gecKatilanIkiBicim([{ servet, ilceServetleri: emsal, hibeKitDegeri: hibe }]);
          expect(r.ham.basariPpm, `${servet}/${emsal.join(",")}/${hibe}`).toBe(r.arindirilmis.basariPpm);
        }
      }
    }
  });

  it("servet oranı: ham ve arındırılmış oran farklıdır (paket oranı şişirir); medyan ≤ 0 ya da negatif servet null", () => {
    // servet 300, emsal [200, 400] -> medyan 300 -> ham oran %100; ofset 100: (200)/(200) = %100 (tam medyanda ortak ofset oranı korumaz ama ≥ korunur)
    const a = servetOrani({ servet: 150, ilceServetleri: [100, 200], hibeKitDegeri: 50 });
    expect(a.hamPpm).toBe(1_000_000); // 150 / 150
    expect(a.arindirilmisPpm).toBe(1_000_000); // 100 / 100
    // medyanın üstünde: ham oran arındırılmışa göre DÜŞÜKTÜR (ofset paydadan oransal olarak daha az çıkar)
    const b = servetOrani({ servet: 300, ilceServetleri: [100, 200], hibeKitDegeri: 50 });
    expect(b.hamPpm).toBe(2_000_000); // 300 / 150
    expect(b.arindirilmisPpm).toBe(2_500_000); // 250 / 100
    // medyanın altında: ham oran arındırılmışa göre YÜKSEKTİR (paket altta kalanı olduğundan iyi gösterir)
    const c = servetOrani({ servet: 75, ilceServetleri: [100, 200], hibeKitDegeri: 50 });
    expect(c.hamPpm).toBe(500_000); // 75 / 150
    expect(c.arindirilmisPpm).toBe(250_000); // 25 / 100
    expect(c.hibePayiPpm).toBe(666_666); // 50 / 75
    // arındırılmış medyan ≤ 0: oran tanımsız
    expect(servetOrani({ servet: 300, ilceServetleri: [100, 200], hibeKitDegeri: 150 }).arindirilmisPpm).toBeNull(); // 150 - 150 = 0
    // servet arındırılınca negatif: oran null; ham servet ≤ 0: hibe payı null
    expect(servetOrani({ servet: 40, ilceServetleri: [100, 200], hibeKitDegeri: 50 }).arindirilmisPpm).toBeNull();
    expect(servetOrani({ servet: 0, ilceServetleri: [100], hibeKitDegeri: 5 }).hibePayiPpm).toBeNull();
    expect(servetOrani({ servet: 10, ilceServetleri: [], hibeKitDegeri: 5 }).hamPpm).toBeNull();
    // paket servetten büyükse pay %100'e kelepçelenir
    expect(servetOrani({ servet: 10, ilceServetleri: [10], hibeKitDegeri: 50 }).hibePayiPpm).toBe(1_000_000);
  });

  it("ucuz hücre ayrıntısı: ayrılmış hücre taban fiyatlı ve çarpandan muaf → çarpan > 2 ilçede de ucuz; genel ucuz yalnız çarpanı ≤ 2 ilçelerde", () => {
    const iki = [
      { uygunHucre: 100, satilmisHucre: 10, ayrilmisBos: 20 }, // çarpan 1,2: 90 satılmamış ucuz (20'si ayrılmış)
      { uygunHucre: 100, satilmisHucre: 60, ayrilmisBos: 20 }, // çarpan 2,2 > 2: yalnız ayrılmış 20 ucuz
    ];
    const r = ucuzHucreAyrintisi(iki);
    expect(r.ucuzHucre).toBe(110);
    expect(r.ayrilmisUcuz).toBe(40);
    expect(r.genelUcuz).toBe(70);
    expect(r.genelPayPpm).toBe(350_000); // 70 / 200
    expect(r.payPpm).toBe(550_000); // 110 / 200
    expect(() => ucuzHucreAyrintisi([{ uygunHucre: 10, satilmisHucre: 9, ayrilmisBos: 2 }])).toThrow(/tutarsiz/);
    expect(() => ucuzHucreAyrintisi([{ uygunHucre: 10, satilmisHucre: 0, ayrilmisBos: -1 }])).toThrow(/tutarsiz/);
  });

  it("ucuz hücre ayrıntısı: çarpan tam 2 sınırında genel hücre ucuz, bir fazlasında yalnız ayrılmış ucuz", () => {
    expect(ucuzHucreAyrintisi([{ uygunHucre: 100, satilmisHucre: 50, ayrilmisBos: 10 }]).genelUcuz).toBe(40);
    const asan = ucuzHucreAyrintisi([{ uygunHucre: 100, satilmisHucre: 51, ayrilmisBos: 10 }]);
    expect(asan.ayrilmisUcuz).toBe(10);
    expect(asan.genelUcuz).toBe(0);
  });

  it("P2: çarpan YALNIZ satılmış − ayrilmisSatilmis üzerinden ilerler (ayrılmış satışlar eğriyi ilerletmez); eski çağrılar (alan yok) aynı", () => {
    // 100 uygun, 60 satılmış: ayrılmış satış yoksa çarpan 2,2 (ucuz 0); 20'si ayrılmışsa normal satılmış 40 → çarpan 1,8 (ucuz 40)
    expect(ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 60 }]).ucuzHucre).toBe(0);
    expect(ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 60, ayrilmisSatilmis: 20 }]).ucuzHucre).toBe(40);
    // Sınır: normal satılmış tam 50 → çarpan 2,0 ucuz; 51 → ucuz değil
    expect(ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 70, ayrilmisSatilmis: 20 }]).ucuzHucre).toBe(30);
    expect(ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 71, ayrilmisSatilmis: 20 }]).ucuzHucre).toBe(0);
    // ayrilmisBos verilirse çarpan > 2 ilçede ayrılmış satılmamışlar ucuz kalır
    expect(ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 71, ayrilmisSatilmis: 20, ayrilmisBos: 7 }]).ucuzHucre).toBe(7);
    expect(() => ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 10, ayrilmisSatilmis: 11 }])).toThrow(/tutarsiz/);
    expect(() => ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 10, ayrilmisSatilmis: -1 }])).toThrow(/tutarsiz/);
  });

  it("karar kaynağı: hipotez kararı Y7 + ucuz hücreden gelir (birincil); servet yalnız ikincil bilgidir", () => {
    const olgu = { servet: 150, ilceServetleri: [100, 200], hibeKitDegeri: HIBE_KIT };
    const servetKotu = { ...olgu, servet: 149 }; // servet medyana ulaşmaz
    const ucuz = ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 0 }]);
    const iyiGelir = [{ gelir: 100, ilceGelirleri: [100] }];
    const kotuGelir = [{ gelir: 1, ilceGelirleri: [100] }];

    // Servet iyi + gelir iyi
    const a = h6ParselIkiBicim([olgu], ucuz, iyiGelir);
    expect(a.birincil.verdict).toBe("gecti");
    expect(a.birincil.kaynak).toBe("y7_gelir+ucuz_hucre");
    expect(a.birincil.ucuzHedef).toBe(true);
    expect(a.ikincil.ham.verdict).toBe("gecti");
    // Servet iyi ama gelir kötü: BİRİNCİL KALDI (T12 hibe şişkinliği senaryosu; servet kararı kurtarmaz)
    const b = h6ParselIkiBicim([olgu], ucuz, kotuGelir);
    expect(b.ikincil.ham.verdict).toBe("gecti");
    expect(b.birincil.verdict).toBe("kaldi");
    // Servet kötü ama gelir iyi: BİRİNCİL GEÇTİ (servet karara girmez)
    const c = h6ParselIkiBicim([servetKotu], ucuz, iyiGelir);
    expect(c.ikincil.ham.verdict).toBe("kaldi");
    expect(c.birincil.verdict).toBe("gecti");
    // Servet biçimleri ikincilde aynı karar
    for (const k of [a, b, c]) expect(k.ikincil.arindirilmisServet.verdict).toBe(k.ikincil.ham.verdict);
  });

  it("birincil karar emsal kuralı: tüm emsal üretimsizse BELİRSİZ (servet iyi olsa da); üreten emsal varsa karar verilir", () => {
    const olgu = { servet: 150, ilceServetleri: [100, 200], hibeKitDegeri: HIBE_KIT };
    const ucuz = ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 0 }]);
    expect(h6ParselIkiBicim([olgu], ucuz, [{ gelir: 1_000, ilceGelirleri: [0, 0, 0] }]).birincil.verdict).toBe("belirsiz");
    expect(h6ParselIkiBicim([olgu], ucuz, [{ gelir: 1_000, ilceGelirleri: [0, 0, 1_000] }]).birincil.verdict).toBe("gecti");
    expect(h6ParselIkiBicim([olgu], ucuz, [{ gelir: 1, ilceGelirleri: [0, 0, 1_000] }]).birincil.verdict).toBe("kaldi");
  });

  it("karar: Y7 sınırı (oyuncu payı %50) ve ucuz hücre koşulu birincilde; ölçülemeyen belirsiz", () => {
    const olgu = { servet: 150, ilceServetleri: [100, 200], hibeKitDegeri: HIBE_KIT };
    const ucuz = ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 0 }]);
    const ok = { gelir: 100, ilceGelirleri: [100] };
    const kotu = { gelir: 49, ilceGelirleri: [100] }; // medyanın %49'u
    const sinir = { gelir: 50, ilceGelirleri: [100] }; // tam %50
    expect(h6ParselIkiBicim([olgu, olgu], ucuz, [ok, kotu]).birincil.verdict).toBe("gecti"); // 1/2 = %50 tam eşik
    expect(h6ParselIkiBicim([olgu, olgu, olgu], ucuz, [ok, kotu, kotu]).birincil.verdict).toBe("kaldi"); // %33
    expect(h6ParselIkiBicim([olgu], ucuz, [sinir]).birincil.verdict).toBe("gecti");
    expect(h6ParselIkiBicim([olgu], ucuz, [kotu]).birincil.verdict).toBe("kaldi");
    // Ucuz hücre koşulu birincilde AYNEN: %20 tam eşik geçer, altı KALDI
    const tamEsik = ucuzHucrePayi([{ uygunHucre: 100, satilmisHucre: 80 }]); // çarpan 2,6: ucuz değil -> %0
    expect(h6ParselIkiBicim([olgu], tamEsik, [ok]).birincil).toMatchObject({ verdict: "kaldi", ucuzHedef: false });
    const yirmi = { payPpm: 200_000, ucuzHucre: 20, uygunHucre: 100 };
    expect(h6ParselIkiBicim([olgu], yirmi, [ok]).birincil).toMatchObject({ verdict: "gecti", ucuzHedef: true });
    expect(h6ParselIkiBicim([olgu], { ...yirmi, payPpm: 199_999 }, [ok]).birincil.verdict).toBe("kaldi");
    // Ölçülemeyen: emsal geliri yok -> belirsiz (servet iyi olsa da); uygun hücre 0 -> belirsiz
    expect(h6ParselIkiBicim([olgu], ucuz, [{ gelir: 5, ilceGelirleri: [] }]).birincil.verdict).toBe("belirsiz");
    expect(h6ParselIkiBicim([olgu], { payPpm: 0, ucuzHucre: 0, uygunHucre: 0 }, [ok]).birincil.verdict).toBe("belirsiz");
    // Y7 KALDI + ucuz koşul ölçülemez: KALDI baskındır (belirsiz değil)
    expect(h6ParselIkiBicim([olgu], { payPpm: 0, ucuzHucre: 0, uygunHucre: 0 }, [kotu]).birincil.verdict).toBe("kaldi");
    expect(h6ParselIkiBicim([], ucuz, []).birincil.verdict).toBe("belirsiz");
    expect(PARSEL_H6_BASARI_ESIK_PPM).toBe(500_000);
  });
});

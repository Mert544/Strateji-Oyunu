/**
 * Yerel pazar saf çekirdeği (G7a; şartname p4-p5-sartname.md §6.4-6.6, Ek B): çekim hesabı test vektörleri V1-V4 BİREBİR (şartname betiğiyle üretilmiş sabit değerler),
 * sıra bağımsızlığı ve üst sınır değişmezleri, talep Q (sınıf, bayram sınırları), etkin kademe ve gelir. Dünya durumuna bağlı değildir.
 */
import { describe, expect, it } from "vitest";
import {
  bayramCarpani,
  esnafAgirligi,
  etkinKademe,
  ilcePaylastir,
  ilceSinifiBaskin,
  talepTabani,
  yerelPazarHesapla,
  yerelSatisGeliri,
  yerelTalep,
  yuvaAgirligi,
} from "../src/perakende/yerelPazar";
import type { YerelCekimParametreleri, YerelDukkan, YerelIlce, YerelSatir } from "../src/perakende/yerelPazar";
import { GUN, PPM, SAAT } from "../src/tipler";

/** Ek B girdi birimleri: esnaf 1 120 000 / taban 250 000; çeşit katsayısı 250 000; S çekim çarpanı PPM. */
const P: YerelCekimParametreleri = { cesitKatsayiPpm: 250_000, esnaf: { fiyatPpm: 1_120_000, tabanPayPpm: 250_000 } };

function dukkan(ad: string, kasa: number, tamCesit: number, yuvalar: [string, number][]): YerelDukkan {
  return { dugum: 0, oyuncu: ad, ekYapi: 0, tamCesit, kasaMiliSaat: kasa, cekimCarpaniPpm: PPM, giderMiliSaat: 0, yuvalar: yuvalar.map(([mal, fiyatPpm]) => ({ mal, mevcut: true, fiyatPpm })) };
}
const ilce = (talep: Record<string, number>, dukkanlar: YerelDukkan[]): YerelIlce => ({ ilce: "i1", talep: Object.entries(talep).map(([mal, q]) => ({ mal, q })), dukkanlar });
const istek = (s: YerelSatir[], oyuncu: string, mal: string): number => s.filter((x) => x.oyuncu === oyuncu && x.mal === mal).reduce((a, x) => a + x.istek, 0);

describe("Ek B: çekim hesabı test vektörleri (şartname betiğiyle üretilmiş, birebir)", () => {
  it("V1 (kasa bağlayıcı değil; iki dükkân, tek mal): ağırlıklar w_A 1 125 000, w_B 964 504, w_esnaf 797 193; s_A 116 916, s_B 100 236", () => {
    // ağırlıklar (kare: 1 000 000 / 857 337 / 797 193; çeşit çarpanı 1 125 000: tamCesit 2, 1 dolu yuva)
    expect(yuvaAgirligi(1_000_000, 500_000, 250_000, PPM)).toBe(1_125_000);
    expect(yuvaAgirligi(1_080_000, 500_000, 250_000, PPM)).toBe(964_504);
    expect(esnafAgirligi(1_120_000)).toBe(797_193);
    const s = ilcePaylastir(P, ilce({ ekmek: 300_000 }, [dukkan("A", 900_000, 2, [["ekmek", 1_000_000]]), dukkan("B", 900_000, 2, [["ekmek", 1_080_000]])]));
    expect(istek(s, "A", "ekmek")).toBe(116_916); // 116 915 + kalan 1
    expect(istek(s, "B", "ekmek")).toBe(100_236);
    // ara değerler (şartname): esnafPay 276 160, esnaf 82 848, P 217 152
    expect(116_916 + 100_236).toBe(217_152);
    expect(300_000 - 82_848).toBe(217_152);
  });

  it("V2 (tek dükkân, kasa kırpması): w = 1 133 783; s_A = 90 000", () => {
    expect(yuvaAgirligi(1_050_000, PPM, 250_000, PPM)).toBe(1_133_783); // tamCesit 1, 1 dolu yuva: çeşit tam
    const s = ilcePaylastir(P, ilce({ ekmek: 300_000 }, [dukkan("A", 90_000, 1, [["ekmek", 1_050_000]])]));
    expect(istek(s, "A", "ekmek")).toBe(90_000);
  });

  it("V3 (su-doldurma: kasası dolan dükkânın payı diğerine kayar): s_A 50 000, s_B 90 000", () => {
    const s = ilcePaylastir(P, ilce({ ekmek: 300_000 }, [dukkan("A", 50_000, 1, [["ekmek", 1_050_000]]), dukkan("B", 90_000, 1, [["ekmek", 1_050_000]])]));
    expect(istek(s, "A", "ekmek")).toBe(50_000);
    expect(istek(s, "B", "ekmek")).toBe(90_000);
  });

  it("V4 (çok mal, dükkân başına toplam kasa): A ekmek 22 715 + gida 67 284; B ekmek 90 000", () => {
    const s = ilcePaylastir(
      P,
      ilce({ ekmek: 300_000, gida: 540_000 }, [
        dukkan("A", 90_000, 2, [
          ["ekmek", 1_050_000],
          ["gida", 1_050_000],
        ]),
        dukkan("B", 90_000, 2, [["ekmek", 950_000]]),
      ]),
    );
    expect(istek(s, "A", "ekmek")).toBe(22_715);
    expect(istek(s, "A", "gida")).toBe(67_284);
    expect(istek(s, "B", "ekmek")).toBe(90_000);
    expect(istek(s, "A", "ekmek") + istek(s, "A", "gida")).toBe(89_999); // <= 90 000
  });

  it("negatif kontrol: tek geçişli (su-dolduruzsuz) kırpma B'ye 110 983 verirdi; su-doldurma 146 789 verir (V3 vektörü bu farkı ayırt etmez, bu test eder)", () => {
    const iki = (kasaB: number) =>
      ilcePaylastir(P, ilce({ ekmek: 300_000 }, [dukkan("A", 50_000, 1, [["ekmek", 1_050_000]]), dukkan("B", kasaB, 1, [["ekmek", 1_050_000]])]));
    const kasasizPay = istek(ilcePaylastir(P, ilce({ ekmek: 300_000 }, [dukkan("A", 9e9, 1, [["ekmek", 1_050_000]]), dukkan("B", 9e9, 1, [["ekmek", 1_050_000]])])), "B", "ekmek");
    expect(kasasizPay).toBe(110_983); // A'nın kasası bağlayıcı değilken B'nin payı = tek geçişli kırpmanın B'ye vereceği
    const s = iki(500_000);
    expect(istek(s, "A", "ekmek")).toBe(50_000);
    expect(istek(s, "B", "ekmek")).toBe(146_789); // A'nın taşan talebi B'ye ve esnafa yeniden dağıtıldı
    expect(istek(s, "B", "ekmek")).toBeGreaterThan(kasasizPay);
  });
});

describe("değişmezler ve sıralama kuralları", () => {
  const karma: YerelIlce = ilce({ ekmek: 300_000, gida: 540_000, un: 80_000 }, [
    { ...dukkan("zeynep", 120_000, 3, [["ekmek", 1_050_000], ["gida", 950_000], ["un", 1_150_000]]), dugum: 3, ekYapi: 7 },
    { ...dukkan("ali", 60_000, 2, [["ekmek", 850_000], ["gida", 1_050_000]]), dugum: 1, ekYapi: 2 },
    { ...dukkan("ali", 500_000, 2, [["gida", 1_150_000], ["un", 950_000]]), dugum: 1, ekYapi: 10 },
    { ...dukkan("mehmet", 30_000, 1, [["ekmek", 1_050_000]]), dugum: 2, ekYapi: 0 },
  ]);

  it("sıra bağımsızlığı: dükkân, yuva-dışı talep ve ilçe girdi sırası değişince aynı sonuç; iki kez aynı sonuç", () => {
    const a = yerelPazarHesapla(P, [karma, { ...karma, ilce: "i0" }]);
    const b = yerelPazarHesapla(P, [{ ...karma, ilce: "i0", dukkanlar: [...karma.dukkanlar].reverse(), talep: [...karma.talep].reverse() }, { ...karma, dukkanlar: [...karma.dukkanlar].reverse() }]);
    expect(b).toEqual(a);
    expect(yerelPazarHesapla(P, [karma, { ...karma, ilce: "i0" }])).toEqual(a);
  });

  it("Σ s <= Q - floor(Q x tabanPay); dükkân toplamı <= kasa; satırlar (dugum, mal, ekYapi, yuva) sıralı; dugumIstek ve dugumGider tutarlı", () => {
    const r = yerelPazarHesapla(P, [karma]);
    for (const mal of ["ekmek", "gida", "un"]) {
      const q = (karma.talep.find((t) => t.mal === mal) as { q: number }).q;
      const top = r.satirlar.filter((s) => s.mal === mal).reduce((a, s) => a + s.istek, 0);
      expect(top, mal).toBeLessThanOrEqual(q - Math.floor((q * 250_000) / PPM));
    }
    for (const d of karma.dukkanlar) {
      const top = r.satirlar.filter((s) => s.oyuncu === d.oyuncu && s.ekYapi === d.ekYapi).reduce((a, s) => a + s.istek, 0);
      expect(top, `${d.oyuncu}/${d.ekYapi}`).toBeLessThanOrEqual(d.kasaMiliSaat);
    }
    const anahtar = (s: YerelSatir): string => [String(s.dugum).padStart(4, "0"), s.mal, String(s.ekYapi).padStart(4, "0"), String(s.yuva).padStart(4, "0")].join("|");
    expect(r.satirlar.map(anahtar)).toEqual(r.satirlar.map(anahtar).sort());
    for (const di of r.dugumIstek) expect(di.istek).toBe(r.satirlar.filter((s) => s.dugum === di.dugum && s.mal === di.mal).reduce((a, s) => a + s.istek, 0));
    expect(r.dugumGider).toEqual([{ dugum: 1, giderMiliSaat: 0 }, { dugum: 2, giderMiliSaat: 0 }, { dugum: 3, giderMiliSaat: 0 }]); // her düğüm yazılır (gider 0)
  });

  it("stoksuz ve boş yuva çekime girmez, payı diğerlerine kalır ve çeşit paydasında sayılmaz; yinelenen (oyuncu, ekYapi) reddedilir", () => {
    const tek = dukkan("A", 900_000, 2, [["ekmek", 1_050_000]]);
    const stoksuz: YerelDukkan = { ...dukkan("B", 900_000, 2, [["ekmek", 1_050_000]]), yuvalar: [{ mal: "ekmek", mevcut: false, fiyatPpm: 1_050_000 }, { fiyatPpm: 1_050_000, mevcut: true }] };
    const yalniz = ilcePaylastir(P, ilce({ ekmek: 300_000 }, [tek]));
    const ikili = ilcePaylastir(P, ilce({ ekmek: 300_000 }, [tek, stoksuz]));
    expect(istek(ikili, "B", "ekmek")).toBe(0);
    expect(ikili).toEqual(yalniz);
    expect(() => ilcePaylastir(P, ilce({ ekmek: 1 }, [tek, tek]))).toThrow(/yinelenen dukkan/);
  });

  it("dugumGider: girdideki tüm dükkânların gideri düğüm başına toplanır", () => {
    const d1 = { ...dukkan("A", 1, 1, []), dugum: 4, ekYapi: 1, giderMiliSaat: 2_500 };
    const d2 = { ...dukkan("A", 1, 1, []), dugum: 4, ekYapi: 2, giderMiliSaat: 1_500 };
    const d3 = { ...dukkan("B", 1, 1, []), dugum: 2, giderMiliSaat: 700 };
    expect(yerelPazarHesapla(P, [ilce({}, [d1, d2, d3])]).dugumGider).toEqual([{ dugum: 2, giderMiliSaat: 700 }, { dugum: 4, giderMiliSaat: 4_000 }]);
  });

  it("büyük sayı: Q ~ 1e9 x w ~ 1,1e6 ara çarpımı 2^53'ü aşsa da tam (BigInt yolu) ve üst sınır tutar", () => {
    const s = ilcePaylastir(P, ilce({ ekmek: 1_000_000_000 }, [dukkan("A", 2_000_000_000, 1, [["ekmek", 1_050_000]])]));
    const top = istek(s, "A", "ekmek");
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThanOrEqual(1_000_000_000 - 250_000_000);
  });
});

describe("talep Q (§6.5)", () => {
  it("ilçe sınıfı = baskın UYGUN hücre sınıfı; eşitlikte büyük sınıf; uygun hücre yoksa tüm hücreler", () => {
    expect(ilceSinifiBaskin({ kirsal: 10, kasaba: 4, sehir: 1 }, { kirsal: 99, kasaba: 99, sehir: 99 })).toBe("kirsal");
    expect(ilceSinifiBaskin({ kirsal: 5, kasaba: 5, sehir: 0 }, { kirsal: 0, kasaba: 0, sehir: 0 })).toBe("kasaba");
    expect(ilceSinifiBaskin({ kirsal: 3, kasaba: 3, sehir: 3 }, { kirsal: 0, kasaba: 0, sehir: 0 })).toBe("sehir");
    expect(ilceSinifiBaskin({ kirsal: 0, kasaba: 0, sehir: 0 }, { kirsal: 2, kasaba: 7, sehir: 1 })).toBe("kasaba");
    expect(ilceSinifiBaskin({ kirsal: 0, kasaba: 0, sehir: 0 }, { kirsal: 0, kasaba: 0, sehir: 0 })).toBe("kirsal");
  });

  it("taban = floor(talep1000Saat x yerelOlcek x nufus / 1000)", () => {
    expect(talepTabani(90, 50, 12_000)).toBe(54_000);
    expect(talepTabani(7, 50, 1_234)).toBe(Math.floor((7 * 50 * 1_234) / 1000));
  });

  it("bayram çarpanı sınırları: oncesi [B - Do, B - 1], sonrasi [B, B + Ds - 1]; dışı PPM; dalga yoksa PPM; boş liste bayram yok", () => {
    const d = { oncesiGun: 3, oncesiPpm: 1_300_000, sonrasiGun: 2, sonrasiPpm: 800_000 };
    const B = [40, 100];
    for (const [gun, beklenen] of [[36, PPM], [37, 1_300_000], [39, 1_300_000], [40, 800_000], [41, 800_000], [42, PPM], [96, PPM], [97, 1_300_000], [100, 800_000], [101, 800_000], [102, PPM]] as const) {
      expect(bayramCarpani(d, B, gun), `gun ${gun}`).toBe(beklenen);
    }
    expect(bayramCarpani(undefined, B, 39)).toBe(PPM);
    expect(bayramCarpani(d, [], 39)).toBe(PPM);
  });

  it("yerelTalep: floor(floor(taban x takvim / PPM) x bayram / PPM); tarım kapalıysa takvim yok; taban 0 ise 0; gün = floor(t / GUN)", () => {
    const takvim = [1_100_000, 900_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000];
    const d = { oncesiGun: 3, oncesiPpm: 1_300_000, sonrasiGun: 2, sonrasiPpm: 800_000 };
    expect(yerelTalep(54_001, takvim, 0, d, [40], 10 * GUN)).toBe(Math.floor((54_001 * 1_100_000) / PPM));
    expect(yerelTalep(54_001, takvim, 1, d, [40], 38 * GUN + 5 * SAAT)).toBe(Math.floor((Math.floor((54_001 * 900_000) / PPM) * 1_300_000) / PPM));
    expect(yerelTalep(54_001, takvim, null, d, [40], 40 * GUN)).toBe(Math.floor((54_001 * 800_000) / PPM));
    expect(yerelTalep(0, takvim, 0, d, [40], 40 * GUN)).toBe(0);
  });
});

describe("etkin kademe (§7.5b) ve gelir (§6.4 Adım 7)", () => {
  it("kampanya kademesindeki yuva: kampanya etkinken kampanya, bitince varsayılan; diğer kademe aynen; kampanya yoksa aynen", () => {
    const T = 100 * SAAT;
    expect(etkinKademe(0, 0, T + SAAT, 2, T)).toBe(0); // etkin
    expect(etkinKademe(0, 0, T, 2, T)).toBe(2); // bitis > t değil: bitti
    expect(etkinKademe(0, 0, undefined, 2, T)).toBe(2);
    expect(etkinKademe(3, 0, T + SAAT, 2, T)).toBe(3);
    expect(etkinKademe(0, undefined, T + SAAT, 2, T)).toBe(0); // kampanya kademesi tanımsız: kampanya yok
  });

  it("gelir = floor(floor(gercek x R / 1000) x fiyatPpm / PPM); gercek = floor(istek x frD / PPM); karşılanma tanımsızsa gercek = istek", () => {
    expect(yerelSatisGeliri(116_916, 1_050_000, 540_000, 600_000)).toEqual({ gercek: 70_149, brut: 37_880_460, gelir: 39_774_483 });
    expect(yerelSatisGeliri(116_916, 1_050_000, 540_000)).toEqual({ gercek: 116_916, brut: 63_134_640, gelir: 66_291_372 });
    expect(yerelSatisGeliri(0, 1_050_000, 540_000, 500_000).gelir).toBe(0);
  });
});

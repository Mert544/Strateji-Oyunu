/**
 * G7-1a: `mulk.perakende` şeması (biçim denetimi, `.strict()`), `MulkEkYapiTanimi.olcekHucre?` ve `dukkanTurleri` kimlik kilidi bağlantısı.
 * Hepsi isteğe bağlı ve no-op: blok ve alan yokken bugünkü veri aynen geçerlidir (hiçbir JSON değişmedi).
 */
import { describe, expect, it } from "vitest";
import { MINI_HARITA_SECENEKLERI, dogrulaKimlikKilidi, dogrulaParametreler, dogrulaPerakende, dogrulaVeriPaketi, miniVeriyiYukle, varsayilanVeriyiYukle } from "../src/index";
import { kopya, perakendeliPaket, perakendesizPaket } from "./perakende-g7-yardimci";

const hata = (r: { gecerli: boolean; hatalar?: string[] }): string => (r.gecerli ? "" : (r.hatalar ?? []).join("\n"));

describe("blok ve alan yokken: no-op", () => {
  it("perakende ve dukkan olmayan paket (bellekte; G7-4 JSON'a koyunca da geçerli): doğrulayıcılar eskisi gibi geçer, perakende kuralları sessiz", () => {
    for (const v of [perakendesizPaket(miniVeriyiYukle), perakendesizPaket(varsayilanVeriyiYukle)]) {
      expect(v.param.mulk?.perakende).toBeUndefined();
      expect(v.param.mulk?.ekYapilar?.["dukkan"]).toBeUndefined();
      expect(dogrulaVeriPaketi(v, v.harita.bolgeler.length < 30 ? MINI_HARITA_SECENEKLERI : {}).gecerli).toBe(true);
      expect(dogrulaKimlikKilidi(v).gecerli).toBe(true);
      const r = dogrulaPerakende(v);
      expect(r.gecerli).toBe(true);
      expect(r.uyarilar.filter((u) => u.startsWith("perakende"))).toEqual([]);
    }
  });
});

describe("geçerli perakende bloğu", () => {
  it("üç katmanın hepsinden geçer: şema (dogrulaParametreler), paket çaprazı, perakende doğrulayıcısı, kimlik kilidi; perakende uyarısı yok", () => {
    const v = perakendeliPaket();
    expect(hata(dogrulaParametreler(v.param, v.icerik))).toBe("");
    expect(hata(dogrulaVeriPaketi(v, MINI_HARITA_SECENEKLERI))).toBe("");
    const r = dogrulaPerakende(v);
    expect(hata(r)).toBe("");
    expect(r.uyarilar.filter((u) => u.startsWith("perakende"))).toEqual([]);
    expect(hata(dogrulaKimlikKilidi(v))).toBe("");
  });
});

describe("şema: biçim ve .strict() (kilit alanı şemada YOK, A0-17)", () => {
  // Şema bozma testleri bilinçli olarak tür dışı düzenleme yapar (geçersiz biçimler yazılabilmeli).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sema = (duzenle: (p: any) => void): string => {
    const v = perakendeliPaket();
    duzenle(v.param.mulk!.perakende);
    return hata(dogrulaParametreler(v.param, v.icerik));
  };

  it("her düzeyde bilinmeyen anahtar reddedilir (seviye, gerekliTeknoloji, oncekiTur ...): üst düzey, tür, ölçek, esnaf, talep, grup, bayram, marka", () => {
    expect(sema((p) => (p.ilceSeviyesi = 2))).toContain("ilceSeviyesi");
    expect(sema((p) => (p.dukkanTurleri[0].gerekliTeknoloji = "otomasyon"))).toContain("gerekliTeknoloji");
    expect(sema((p) => (p.dukkanTurleri[0].oncekiTur = "bakkal"))).toContain("oncekiTur");
    expect(sema((p) => (p.olcekler[1].yukseltmeSarti = 1))).toContain("yukseltmeSarti");
    expect(sema((p) => (p.esnaf.seviye = 1))).toContain("seviye");
    expect(sema((p) => (p.talep.seviye = 1))).toContain("seviye");
    expect(sema((p) => (p.talep.gruplar.gida.seviye = 1))).toContain("seviye");
    expect(sema((p) => (p.talep.gruplar.gida.bayram.seviye = 1))).toContain("seviye");
    expect(sema((p) => (p.marka.seviye = 1))).toContain("seviye");
  });

  it("tür ve değer denetimi: sürüm 1, ondalık yok, olcekler tam 3 satır, boş acikOlcekler, ölçek indeksi 0-2, ölçek satırı alanları", () => {
    expect(sema((p) => (p.surum = 2))).not.toBe("");
    expect(sema((p) => (p.cesitKatsayiPpm = 0.5))).toContain("tamsayi");
    expect(sema((p) => p.olcekler.pop())).not.toBe("");
    expect(sema((p) => p.olcekler.push(p.olcekler[0]))).not.toBe("");
    expect(sema((p) => (p.acikOlcekler = []))).toContain("acikOlcekler bos olamaz");
    expect(sema((p) => (p.acikOlcekler = [3]))).not.toBe("");
    expect(sema((p) => (p.dukkanTurleri[0].olcekAraligi = [0, 5]))).not.toBe("");
    expect(sema((p) => (p.olcekler[0].rafYuvasi = 0))).not.toBe("");
    expect(sema((p) => (p.olcekler[0].cekimCarpaniPpm = 0))).not.toBe("");
    expect(sema((p) => (p.fiyatBandiPpm = [700_000]))).not.toBe("");
    expect(sema((p) => (p.dukkanTurleri[0].id = "Bakkal"))).toContain("kimlik");
    expect(sema((p) => delete p.marka)).not.toBe("");
  });

  it("isteğe bağlı alanlar: kampanya üçlüsü olmadan da geçerli (kampanya kapalı); talep.bayram olmadan geçerli", () => {
    expect(sema((p) => {
      delete p.kampanyaKademesi;
      delete p.kampanyaGunlukEnFazlaSaat;
      delete p.kampanyaHaftalikEnFazlaGun;
    })).toBe("");
    expect(sema((p) => delete p.talep.gruplar.gida.bayram)).toBe("");
  });
});

describe("MulkEkYapiTanimi.olcekHucre? (§4.2)", () => {
  const ek = (olcekHucre: unknown, yuva = 1): string => {
    const v = perakendeliPaket((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = p.param.mulk!.ekYapilar!["dukkan"] as any;
      d.olcekHucre = olcekHucre;
      d.yuva = yuva;
    });
    return hata(dogrulaParametreler(v.param, v.icerik));
  };
  it("[1, 2, 3] ve [1, 1, 1] geçerli; yoksa geçerli (ölçeklenmez)", () => {
    expect(ek([1, 2, 3])).toBe("");
    expect(ek([1, 1, 1])).toBe("");
    expect(ek(undefined)).toBe("");
  });
  it("[0] yuvaya eşit olmalı, [1] >= [0], [2] >= [1], hepsi <= 5; üç elemanlı demet", () => {
    expect(ek([2, 2, 3])).toContain("olcekHucre[0]: S ayak izi yuva degerine (1) esit olmali");
    expect(ek([1, 3, 2])).toContain("olcekHucre[2]: L ayak izi M'den kucuk olamaz");
    expect(ek([1, 2, 6])).toContain("olcekHucre[2]: en cok 5 hucre olabilir");
    expect(ek([1, 2])).not.toBe("");
    expect(ek([1, 2, 3, 4])).not.toBe("");
    expect(ek([0, 1, 2])).not.toBe("");
  });
});

describe("dukkanTurleri kimlik kilidi bağlantısı (§3.5)", () => {
  const kilit = (duzenle: (v: ReturnType<typeof perakendeliPaket>) => void): string => hata(dogrulaKimlikKilidi(perakendeliPaket(duzenle)));
  it("listedeki türler geçer; listede olmayan tür kimliği ve mal ile kesişen kimlik reddedilir", () => {
    expect(kilit(() => undefined)).toBe("");
    expect(kilit((v) => (v.param.mulk!.perakende!.dukkanTurleri[0]!.id = "pasta_salonu"))).toContain("mulk.perakende.dukkanTurleri: kimlik listede yok");
    expect(kilit((v) => (v.param.mulk!.perakende!.dukkanTurleri[0]!.id = "gida"))).toContain("kimlik listede yok");
  });
  it("kimlik listesi yoksa kilit uygulanmaz (eski paketler)", () => {
    const v = kopya(perakendeliPaket((p) => (p.param.mulk!.perakende!.dukkanTurleri[0]!.id = "pasta_salonu")));
    delete (v as { kimlikListesi?: unknown }).kimlikListesi;
    expect(dogrulaKimlikKilidi(v).gecerli).toBe(true);
  });
});

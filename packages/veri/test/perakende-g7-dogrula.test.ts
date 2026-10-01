/**
 * G7-1a: `dogrulaPerakende` V1-V12 (sartname §4.5 Katman 2) ve V13'te rafın (H) tüketici sayılması. Her kural için geçerli temel PAKETTE tek bir bozma yapılır
 * ve yalnız o kuralın iletisi beklenir (temel geçerli olduğundan test kural-duyarlıdır). JSON değişmedi; paketler bellekte kurulur.
 */
import { describe, expect, it } from "vitest";
import { dogrulaPerakende } from "../src/index";
import type { MulkPerakendeParametreleri, VeriPaketi } from "../src/index";
import { perakendeliPaket, perakendesizPaket } from "./perakende-g7-yardimci";

type Duzen = (pr: MulkPerakendeParametreleri, v: VeriPaketi) => void;
function sonuc(duzenle: Duzen): { hata: string; uyari: string } {
  const v = perakendeliPaket((p) => duzenle(p.param.mulk!.perakende!, p));
  const r = dogrulaPerakende(v);
  return { hata: r.gecerli ? "" : r.hatalar.join("\n"), uyari: r.uyarilar.join("\n") };
}
const hata = (d: Duzen): string => sonuc(d).hata;

describe("temel paket geçerli (test duyarlılığının dayanağı)", () => {
  it("hata yok; perakende uyarısı yok", () => {
    const r = sonuc(() => undefined);
    expect(r.hata).toBe("");
    expect(r.uyari.split("\n").filter((u) => u.startsWith("perakende"))).toEqual([]);
  });
});

describe("V1: perakende ve ekYapilar.dukkan birlikte; yuva 1", () => {
  it("blok var dukkan yok; dukkan var blok yok; yuva 2", () => {
    expect(hata((_, p) => delete p.param.mulk!.ekYapilar!["dukkan"])).toBe("perakende: ekYapilar.dukkan ile birlikte tanimlanmali");
    expect(hata((_, p) => delete p.param.mulk!.perakende)).toBe("perakende: ekYapilar.dukkan ile birlikte tanimlanmali");
    expect(hata((_, p) => ((p.param.mulk!.ekYapilar!["dukkan"] as { yuva: number }).yuva = 2))).toContain("perakende: ekYapilar.dukkan.yuva 1 olmali");
  });
  it("ikisi de yoksa (bugünkü veri) sessiz", () => {
    expect(dogrulaPerakende(perakendesizPaket()).gecerli).toBe(true);
  });
});

describe("V2: dükkân türü kimlikleri tekil ve mal kimliğiyle kesişmez", () => {
  it("yinelenen tür; mal ile kesişen tür", () => {
    expect(hata((pr) => pr.dukkanTurleri.push({ ...(pr.dukkanTurleri[0] as object), id: "bakkal" } as never))).toContain("perakende.dukkanTurleri: yinelenen kimlik: bakkal");
    expect(hata((pr) => (pr.dukkanTurleri[1]!.id = "gida"))).toContain("perakende.dukkanTurleri: mal ile kesisiyor: gida");
  });
});

describe("V3: raf malları içerikte, depolanabilir, NPC pazar kaydı var", () => {
  it("bilinmeyen mal; depolanamaz mal (elektrik); pazar emilimi 0; pazar arzı 0", () => {
    expect(hata((pr) => pr.dukkanTurleri[1]!.mallar.push("yok_mal"))).toContain("perakende.dukkanTurleri.firin.mallar: bilinmeyen mal: yok_mal");
    expect(hata((pr) => pr.dukkanTurleri[1]!.mallar.push("elektrik"))).toContain("perakende.dukkanTurleri.firin.mallar: depolanamaz mal: elektrik");
    expect(hata((_, p) => (p.param.pazar.emilimSaat["sut"] = 0))).toContain("perakende.dukkanTurleri.bakkal.mallar: pazar kaydi yok: sut");
    expect(hata((_, p) => (p.param.pazar.arzSaat["sut"] = 0))).toContain("perakende.dukkanTurleri.bakkal.mallar: pazar kaydi yok: sut");
  });
});

describe("V4: çıkmaz raf yok (talep > 0 ve bir grupta)", () => {
  it("talep satırı yok; talep 0; grupta yok", () => {
    expect(hata((pr) => delete pr.talep.talep1000Saat["sut"])).toContain("perakende.talep: raf malinin talebi yok: sut");
    expect(hata((pr) => (pr.talep.talep1000Saat["sut"] = 0))).toContain("perakende.talep: raf malinin talebi yok: sut");
    expect(hata((pr) => (pr.talep.gruplar["gida"]!.mallar = pr.talep.gruplar["gida"]!.mallar.filter((m) => m !== "sut")))).toContain("perakende.talep: raf malinin talebi yok: sut");
  });
});

describe("V5: market ⊇ bakkal, supermarket ⊇ market (yalnız UYARI)", () => {
  it("market bakkalın malını taşımıyorsa uyarı (hata değil); kayıt yoksa sessiz", () => {
    const r = sonuc((pr) => pr.dukkanTurleri.push({ id: "market", ad: "Market", mallar: ["gida", "ekmek"], tamCesit: 2, olcekAraligi: [0] }));
    expect(r.uyari).toContain("perakende: mal listeleri ic ice degil: market");
    expect(r.hata).toBe("");
    expect(sonuc(() => undefined).uyari).not.toContain("ic ice degil");
  });
});

describe("V6: fiyat kademeleri ve kampanya parametreleri", () => {
  it("kesin artan değil; bant dışı; 3'ten az; varsayılan kademe aşıyor; alt > üst", () => {
    expect(hata((pr) => (pr.fiyatKademeleriPpm = [850_000, 850_000, 1_050_000, 1_150_000]))).toContain("perakende.fiyatKademeleriPpm[1]: kesin artan olmali");
    expect(hata((pr) => (pr.fiyatKademeleriPpm = [650_000, 950_000, 1_050_000, 1_150_000]))).toContain("perakende.fiyatKademeleriPpm[0]: fiyat bandi disinda");
    expect(hata((pr) => (pr.fiyatKademeleriPpm = [950_000, 1_450_000]))).toContain("perakende.fiyatKademeleriPpm: en az 3 kademe olmali");
    expect(hata((pr) => (pr.varsayilanFiyatKademesi = 4))).toContain("perakende.varsayilanFiyatKademesi: kademe sayisini (4) asamaz");
    expect(hata((pr) => (pr.fiyatBandiPpm = [1_400_000, 700_000]))).toContain("perakende.fiyatBandiPpm: alt sinir ust siniri asamaz");
  });
  it("kampanya kademesi 0 olmalı; günlük saat 0-24; haftalık gün 0-7; sınır 24 ve 7 geçerli; kampanya üçlüsü yoksa geçerli", () => {
    expect(hata((pr) => (pr.kampanyaKademesi = 1))).toContain("perakende.kampanyaKademesi: 0 olmali");
    expect(hata((pr) => (pr.kampanyaGunlukEnFazlaSaat = 25))).toContain("perakende.kampanyaGunlukEnFazlaSaat: 0 ile 24");
    expect(hata((pr) => (pr.kampanyaHaftalikEnFazlaGun = 8))).toContain("perakende.kampanyaHaftalikEnFazlaGun: 0 ile 7");
    expect(hata((pr) => { pr.kampanyaGunlukEnFazlaSaat = 24; pr.kampanyaHaftalikEnFazlaGun = 7; })).toBe("");
    expect(hata((pr) => { delete pr.kampanyaKademesi; delete pr.kampanyaGunlukEnFazlaSaat; delete pr.kampanyaHaftalikEnFazlaGun; })).toBe("");
  });
});

describe("V7: esnaf", () => {
  it("taban pay < 1 000 000; esnaf fiyatı bant içinde", () => {
    expect(hata((pr) => (pr.esnaf.tabanPayPpm = 1_000_000))).toContain("perakende.esnaf.tabanPayPpm");
    expect(hata((pr) => (pr.esnaf.tabanPayPpm = 999_999))).toBe("");
    expect(hata((pr) => (pr.esnaf.tabanPayPpm = 0))).toBe("");
    expect(hata((pr) => (pr.esnaf.fiyatPpm = 1_500_000))).toContain("perakende.esnaf.fiyatPpm: fiyat bandi disinda");
  });
});

describe("V8: tür başına denetimler ve açık ölçeklerle tutarlılık", () => {
  it("tamCesit mal sayısını aşıyor; yinelenen mal; boş ve yinelenen ölçek aralığı", () => {
    expect(hata((pr) => (pr.dukkanTurleri[1]!.tamCesit = 3))).toContain("perakende.dukkanTurleri.firin.tamCesit: mal sayisini (2) asamaz");
    expect(hata((pr) => pr.dukkanTurleri[1]!.mallar.push("ekmek"))).toContain("perakende.dukkanTurleri.firin.mallar: yinelenen mal: ekmek");
    expect(hata((pr) => (pr.dukkanTurleri[1]!.olcekAraligi = []))).toContain("perakende.dukkanTurleri.firin.olcekAraligi: bos olamaz");
    expect(hata((pr) => (pr.dukkanTurleri[1]!.olcekAraligi = [0, 0]))).toContain("perakende.dukkanTurleri.firin.olcekAraligi: yinelenen olcek");
  });
  it("açık ölçeği taşıyan tür yoksa hata; açık ölçekler tekil; tür M taşıyorsa ve M açıksa geçerli", () => {
    expect(hata((pr) => (pr.acikOlcekler = [0, 1]))).toContain("perakende.acikOlcekler: 1 olcegini tasiyan dukkan turu yok");
    expect(hata((pr) => (pr.acikOlcekler = [0, 0]))).toContain("perakende.acikOlcekler: yinelenen olcek");
    expect(hata((pr) => { pr.acikOlcekler = [0, 1]; pr.dukkanTurleri[0]!.olcekAraligi = [0, 1]; })).toBe("");
  });
});

describe("V9: talep (nüfus eşdeğeri, takvim, bayram)", () => {
  it("takvim 12 değer ve toplam tam 12 000 000", () => {
    expect(hata((pr) => (pr.talep.gruplar["tatli"]!.takvimPpm = Array.from({ length: 11 }, () => 1_000_000)))).toContain("perakende.talep.gruplar.tatli.takvimPpm: 12 deger olmali");
    expect(hata((pr) => (pr.talep.gruplar["tatli"]!.takvimPpm[0] = 1_000_001))).toContain("toplam tam 12000000 olmali (bulunan 12000001)");
  });
  it("bayram toplam sabit olmalı (öncesi x sapma + sonrası x sapma = 0)", () => {
    expect(hata((pr) => (pr.talep.gruplar["gida"]!.bayram!.sonrasiPpm = 790_000))).toContain("perakende.talep.gruplar.gida.bayram: toplam sabit degil (sapma -30000");
  });
  it("bayram günleri kesin artan ve komşu fark >= en büyük (öncesi + sonrası) pencere", () => {
    expect(hata((pr) => (pr.talep.bayramGunleri = [30, 10]))).toContain("perakende.talep.bayramGunleri[1]: kesin artan olmali");
    expect(hata((pr) => (pr.talep.bayramGunleri = [10, 10]))).toContain("kesin artan olmali");
    expect(hata((pr) => (pr.talep.bayramGunleri = [10, 15]))).toContain("komsu bayram farki en az 6 gun olmali (bulunan 5)");
    expect(hata((pr) => (pr.talep.bayramGunleri = [10, 16]))).toBe(""); // fark tam 6: geçerli
    expect(hata((pr) => (pr.talep.bayramGunleri = []))).toBe(""); // boş liste geçerli
  });
  it("her talep malı tam bir grupta; gruplardaki ve talepteki mallar içerikte", () => {
    expect(hata((pr) => pr.talep.gruplar["tatli"]!.mallar.push("sut"))).toContain("perakende.talep: mal tam bir grupta olmali: sut (2 grup)");
    expect(hata((pr) => (pr.talep.talep1000Saat["celik"] = 5_000))).toContain("perakende.talep: mal tam bir grupta olmali: celik (0 grup)");
    expect(hata((pr) => pr.talep.gruplar["tatli"]!.mallar.push("yok_mal"))).toContain("perakende.talep.gruplar.tatli.mallar: bilinmeyen mal: yok_mal");
    expect(hata((pr) => (pr.talep.talep1000Saat["yok_mal"] = 1))).toContain("perakende.talep.talep1000Saat: bilinmeyen mal: yok_mal");
  });
});

describe("V10: marka", () => {
  it("hesap başına en çok 1-3 marka", () => {
    expect(hata((pr) => (pr.marka.hesapBasinaEnFazla = 4))).toContain("perakende.marka.hesapBasinaEnFazla: 1 ile 3 arasinda olmali");
    expect(hata((pr) => (pr.marka.hesapBasinaEnFazla = 3))).toBe("");
    expect(hata((pr) => (pr.marka.hesapBasinaEnFazla = 1))).toBe("");
  });
});

describe("V11: kilitsizlik taraması (A0-17): şema dışı yoldan gelse bile yakalanır", () => {
  it("perakende ve ekYapilar.dukkan alt ağacında seviye/teknoloji/önkoşul anahtarı hata; mal ve grup kimlikleri anahtar olarak taranmaz", () => {
    expect(hata((pr) => ((pr as unknown as Record<string, unknown>)["ilceSeviyesi"] = 2))).toContain("perakende: kilit alani yasak: ilceSeviyesi");
    expect(hata((pr) => ((pr.dukkanTurleri[0] as unknown as Record<string, unknown>)["gerekliTeknoloji"] = "otomasyon"))).toContain("kilit alani yasak: dukkanTurleri.gerekliTeknoloji");
    expect(hata((_, p) => ((p.param.mulk!.ekYapilar!["dukkan"] as unknown as Record<string, unknown>)["yukseltmeSarti"] = 1))).toContain("kilit alani yasak: ekYapilar.dukkan.yukseltmeSarti");
    expect(hata((pr) => ((pr.olcekler[2] as unknown as Record<string, unknown>)["onkosul"] = "market"))).toContain("kilit alani yasak: olcekler.onkosul");
    // mal kimliği "teknoloji" içerse bile (veri anahtarı) ve grup adı "seviye_x" olsa bile bayrak çıkmaz
    expect(hata((pr) => { pr.talep.gruplar["seviye_grubu"] = { mallar: [], takvimPpm: Array.from({ length: 12 }, () => 1_000_000) }; })).toBe("");
  });
});

describe("V12: dukkan ek yapısı inşa malzemeleri içerikte ve depolanabilir", () => {
  it("bilinmeyen mal; depolanamaz mal", () => {
    expect(hata((_, p) => ((p.param.mulk!.ekYapilar!["dukkan"] as { insaMaliyeti: Record<string, number> }).insaMaliyeti["yok_mal"] = 5))).toContain('mulk.ekYapilar.dukkan.insaMaliyeti: bilinmeyen mal "yok_mal"');
    expect(hata((_, p) => ((p.param.mulk!.ekYapilar!["dukkan"] as { insaMaliyeti: Record<string, number> }).insaMaliyeti["elektrik"] = 5))).toContain('"elektrik" depolanamaz mal');
  });
});

describe("V13: raf (H) çıkmaz mal sayımında tüketici türüdür", () => {
  it("bloksuz veride tüketici türü 1 olan raf malları, bloklu pakette (rafta olduğu için) uyarıdan çıkar; blok eklemek başka uyarı üretmez", () => {
    const bloksuz = dogrulaPerakende(perakendesizPaket()).uyarilar.filter((u) => u.startsWith("icerik: cikmaz mal: "));
    const rafli = dogrulaPerakende(perakendeliPaket()).uyarilar.filter((u) => u.startsWith("icerik: cikmaz mal: "));
    const raf = ["gida", "ekmek", "un", "sut", "sut_urunu", "sekerleme"];
    for (const m of raf) {
      expect(bloksuz.some((u) => u.includes(`cikmaz mal: ${m} `)), `bloksuz ${m}`).toBe(true);
      expect(rafli.some((u) => u.includes(`cikmaz mal: ${m} `)), `raflı ${m}`).toBe(false);
    }
    expect(rafli.length).toBe(bloksuz.length - raf.length);
    // raf dışı hiçbir mal etkilenmedi
    expect(rafli).toEqual(bloksuz.filter((u) => !raf.some((m) => u.includes(`cikmaz mal: ${m} `))));
  });
});

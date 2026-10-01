/**
 * Yeni oyuncu paketi (H6, docs/11 §7.9; `parametreler.mulk.yeniOyuncu`), mini-6 parsel fikstürü: bedava yurt, ilk yapılarda
 * indirim, ayrılmış hücreler ve kalkan süresi. Hepsi mülk kipine özeldir; bölge kipi davranışı ayrı doğrulanır.
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { hucreBul, ilceBul, isletmeBul, mulkOyuncuBul } from "../src/mulk";
import { kenarBitisikMi } from "../src/mulk/durum";
import { yurtPlanla } from "../src/mulk/yurt";
import { anlikHazine, anlikMiktar, oyuncuBul } from "../src/stok";
import { DAKIKA, GUN, PPM } from "../src/tipler";
import type { Komut } from "../src/tipler";
import { bitisikCift, mulkSim, mulkVeriTam, tamam, ver } from "./mulk-yardimci";

const F = parselFiksturuYukle("mini-6");
const OVA = "sn_m_ova_merkez";
const BIN = 1_000_000;

function katil(s: Simulasyon, oyuncu: string, ilce?: string, t = s.dunya.zaman) {
  const komut: Komut = ilce === undefined ? { tur: "oyuncu_katil", oyuncu, bolgeler: [] } : { tur: "oyuncu_katil", oyuncu, bolgeler: [], ilce };
  return s.uygula({ t, oyuncu: SISTEM_OYUNCUSU, komut });
}

function yurtHucreleri(s: Simulasyon, oyuncu: string) {
  return s.dunya.mulk!.hucreler.filter((h) => h.sahip === oyuncu);
}

describe("bedava yurt (yurtHucre)", () => {
  it("katılımda 6 bitişik, uygun, sahipsiz hücre ücretsiz verilir; ilk işletme düğümü başlangıç kitiyle açılır", () => {
    const s = mulkSim(["a"], mulkVeriTam());
    const d = s.dunya;
    const hs = yurtHucreleri(s, "a");
    expect(hs).toHaveLength(6);
    expect(new Set(hs.map((h) => h.ilce)).size).toBe(1);
    expect(kenarBitisikMi(hs.map((h) => h.id))).toBe(true); // kenar-bitişik (4 komşuluk), yapı yerleşimiyle aynı kural
    for (const h of hs) {
      expect(s.ic.mulk!.hucreler.get(h.id)!.hucre.uygun).toBe(true);
      expect(h.degerMili).toBe(0);
      expect(h.sinif).toBe(s.ic.mulk!.hucreler.get(h.id)!.hucre.sinif);
    }
    // Para ödenmedi; arazi değeri 0 (vergi tabanına girmez); hücre sayacı ve ilçe satılmışı güncel.
    expect(anlikHazine(d, "a")).toBe(s.ic.mulk!.p.yeniOyuncu.hibe);
    const mo = mulkOyuncuBul(d, "a")!;
    expect(mo.araziDegeriMili).toBe(0);
    expect(mo.ilceHucre).toEqual([{ ilce: hs[0]!.ilce, hucre: 6 }]);
    expect(ilceBul(d, hs[0]!.ilce)!.satilmisHucre).toBe(6);
    // İlk işletme: yurdun ilinde, başlangıç kitiyle.
    const il = ilceBul(d, hs[0]!.ilce)!.il;
    const isl = isletmeBul(d, "a", il)!;
    expect(isl).toBeDefined();
    const b = d.bolgeler[isl.bolgeIndeksi]!;
    const celik = s.ic.malIndeks["celik"]!;
    expect(anlikMiktar(b.stoklar[celik]!, d.zaman)).toBe(s.ic.mulk!.p.yeniOyuncu.baslangicStok["celik"]);
  });

  it("ilçe seçimi deterministik: ilk Tarla kurulabilen illerden doluluğu en düşük ilçe; sonraki oyuncu dolu ilçeden kaçar", () => {
    const s = mulkSim(["a", "b", "c"], mulkVeriTam());
    const ilceOf = (o: string) => yurtHucreleri(s, o)[0]!.ilce;
    // Çöl ilinde ova yok: tercih dışı. Eşit dolulukta kimlik sırası: sn_m_ova_merkez, sn_m_ova_tasra, sn_m_sehir_merkez.
    expect([ilceOf("a"), ilceOf("b"), ilceOf("c")]).toEqual(["sn_m_ova_merkez", "sn_m_ova_tasra", "sn_m_sehir_merkez"]);
    // Aynı veri + aynı komutlar = aynı özet
    const t = mulkSim(["a", "b", "c"], mulkVeriTam());
    expect(t.durumOzeti()).toBe(s.durumOzeti());
  });

  it("katılım zamanı ve oyuncu sırası yurdu belirler: dolan ilçe ikinci oyuncu için seçilmez", () => {
    const s = mulkSim(["a"], mulkVeriTam());
    const ilk = yurtHucreleri(s, "a")[0]!.ilce;
    katil(s, "b");
    expect(yurtHucreleri(s, "b")[0]!.ilce).not.toBe(ilk);
    // Hiçbir hücre iki oyuncuda değil
    const ids = s.dunya.mulk!.hucreler.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("oyuncu_katil.ilce verilirse yurt orada verilir (çöl ilçesi dahil)", () => {
    const s = mulkSim([], mulkVeriTam());
    expect(katil(s, "a", "sn_m_col_merkez").tamam).toBe(true);
    expect(new Set(yurtHucreleri(s, "a").map((h) => h.ilce))).toEqual(new Set(["sn_m_col_merkez"]));
    expect(yurtHucreleri(s, "a")).toHaveLength(6);
    expect(isletmeBul(s.dunya, "a", "sn_m_col")).toBeDefined();
  });

  it("atomik: bilinmeyen ya da yurdu veremeyen ilçede katılım reddedilir, dünya değişmez", () => {
    const s = mulkSim([], mulkVeriTam());
    s.calistirKadar(0);
    const once = s.durumOzeti();
    expect(katil(s, "a", "yok_ilce")).toEqual({ tamam: false, hata: "bilinmeyen ilce: yok_ilce" });
    expect(s.durumOzeti()).toBe(once);
    // Yurt hücresi sayısı ilçenin %25 payını aşarsa (81 uygun -> 20) verilemez
    const k = mulkSim([], mulkVeriTam((v) => (v.param.mulk!.yeniOyuncu.yurtHucre = 30)));
    k.calistirKadar(0);
    const once2 = k.durumOzeti();
    const r = katil(k, "a", OVA);
    expect(r.tamam).toBe(false);
    expect(oyuncuBul(k.dunya, "a")).toBeUndefined();
    expect(k.durumOzeti()).toBe(once2);
    // Aynı veri, ilçe verilmeden: hiçbir ilçe veremez -> katılım yurtsuz sürer
    expect(katil(k, "b").tamam).toBe(true);
    expect(yurtHucreleri(k, "b")).toHaveLength(0);
    // ilçe verilmişse tür denetimi
    expect(katil(mulkSim([], mulkVeriTam()), "c", 5 as unknown as string).tamam).toBe(false);
  });

  it("yurtHucre = 0: yurt yok; ilçe verilse de katılım olur (ilçe geçerli olmalı)", () => {
    const s = mulkSim([], mulkVeriTam((v) => (v.param.mulk!.yeniOyuncu.yurtHucre = 0)));
    expect(katil(s, "a", OVA).tamam).toBe(true);
    expect(yurtHucreleri(s, "a")).toHaveLength(0);
    expect(katil(s, "b", "yok").tamam).toBe(false);
  });

  it("bölge kipinde ilçe verilemez", () => {
    const s = Simulasyon.olustur(miniVeriyiYukle(), 3);
    const r = s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"], ilce: OVA } });
    expect(r.tamam).toBe(false);
    expect(oyuncuBul(s.dunya, "a")).toBeUndefined();
  });

  it("yurtPlanla dünyayı değiştirmez; yurt hücrelerinde yapı kurulabilir ve ilk Tarla 12 dakikada biter", () => {
    const s = mulkSim(["a"], mulkVeriTam());
    s.calistirKadar(0);
    const once = s.durumOzeti();
    yurtPlanla(s.dunya, s.ic);
    expect(s.durumOzeti()).toBe(once);
    const hs = yurtHucreleri(s, "a");
    const ilce = hs[0]!.ilce;
    const ciftlik = bitisikCift(hs.map((h) => h.id));
    const t0 = s.dunya.zaman;
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce, tesisTuru: "ciftlik", hucreler: ciftlik });
    const ins = s.dunya.insaatlar[0]!;
    // 2 sa (yapiInsaSaati) × %10 erken oyun çarpanı = 12 dk
    expect(ins.bitis - t0).toBe(12 * DAKIKA);
    expect(hucreBul(s.dunya, ciftlik[0]!)!.insaat).toBe(ins.id);
  });
});

describe("ilk yapı indirimi (ilkYapiIndirimPpm, indirimliYapiSayisi)", () => {
  const veri = () =>
    mulkVeriTam((v) => {
      const m = v.param.mulk!;
      m.yeniOyuncu.hibe = 500 * BIN * 1000;
      m.yeniOyuncu.indirimliYapiSayisi = 2;
      m.esZamanliInsaat = 5;
    });

  function ciftlikMaliyeti(s: Simulasyon) {
    return s.ic.icerik.tesisTurleri.find((t) => t.id === "ciftlik")!;
  }

  it("ilk N yapı %30 indirimli (para ve malzeme), sonrası tam fiyat; iptalde indirim hakkı geri verilir", () => {
    const s = mulkSim(["a"], veri());
    const hs = yurtHucreleri(s, "a");
    const ilce = hs[0]!.ilce;
    const il = ilceBul(s.dunya, ilce)!.il;
    const b = s.dunya.bolgeler[isletmeBul(s.dunya, "a", il)!.bolgeIndeksi]!;
    const celik = s.ic.malIndeks["celik"]!;
    const tam = ciftlikMaliyeti(s);
    const ambar = s.ic.mulk!.ekYapilar.find((y) => y.id === "ambar")!;
    const indirimli = (x: number) => Math.floor((x * (PPM - 300_000)) / PPM);
    const olc = (tur: string, cells: string[]) => {
      const h0 = anlikHazine(s.dunya, "a");
      const c0 = anlikMiktar(b.stoklar[celik]!, s.dunya.zaman);
      tamam(s, "a", { tur: "tesis_insa_hucre", ilce, tesisTuru: tur, hucreler: cells });
      return { para: h0 - anlikHazine(s.dunya, "a"), celik: c0 - anlikMiktar(b.stoklar[celik]!, s.dunya.zaman) };
    };
    const ids = hs.map((h) => h.id);
    const cift = bitisikCift(ids);
    const tekler = ids.filter((i) => !cift.includes(i));
    const ambarCelik = ambar.insaMaliyeti.find(([m]) => m === celik)![1];
    expect(olc("ciftlik", cift)).toEqual({ para: indirimli(tam.insaParasi), celik: indirimli(tam.insaMaliyeti["celik"]!) });
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(1);
    // İptal: hak geri gelir ve ödenenin %50'si iade edilir
    const insId = s.dunya.insaatlar[0]!.id;
    const h1 = anlikHazine(s.dunya, "a");
    tamam(s, "a", { tur: "insaat_iptal", insaat: insId });
    expect(anlikHazine(s.dunya, "a") - h1).toBe(Math.floor((indirimli(tam.insaParasi) * 500_000) / PPM));
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBeUndefined();
    // Yeniden: 1. (çiftlik) ve 2. (ambar) yapı indirimli, 3. yapı tam fiyat
    expect(olc("ciftlik", cift).para).toBe(indirimli(tam.insaParasi));
    expect(olc("ambar", [tekler[0]!])).toEqual({ para: indirimli(ambar.insaParasi), celik: indirimli(ambarCelik) });
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(2);
    expect(olc("ambar", [tekler[1]!])).toEqual({ para: ambar.insaParasi, celik: ambarCelik });
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(2);
  });

  it("indirim ek yapılar için de sayılır; başarısız komut sayacı değiştirmez", () => {
    const s = mulkSim(["a"], veri());
    const hs = yurtHucreleri(s, "a");
    const ilce = hs[0]!.ilce;
    const ek = s.ic.mulk!.ekYapilar.find((y) => y.id === "ambar")!;
    const h0 = anlikHazine(s.dunya, "a");
    // yuva 1 olan ambar için 2 hücre -> başarısız; sayaç değişmez
    expect(ver(s, "a", { tur: "tesis_insa_hucre", ilce, tesisTuru: "ambar", hucreler: [hs[0]!.id, hs[1]!.id] }).tamam).toBe(false);
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBeUndefined();
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce, tesisTuru: "ambar", hucreler: [hs[0]!.id] });
    expect(h0 - anlikHazine(s.dunya, "a")).toBe(Math.floor((ek.insaParasi * (PPM - 300_000)) / PPM));
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(1);
  });

  it("ilkYapiIndirimPpm = 0 ya da indirimliYapiSayisi = 0: indirim yok", () => {
    for (const duzenle of [(m: { ilkYapiIndirimPpm: number; indirimliYapiSayisi: number }) => (m.ilkYapiIndirimPpm = 0), (m: { ilkYapiIndirimPpm: number; indirimliYapiSayisi: number }) => (m.indirimliYapiSayisi = 0)]) {
      const s = mulkSim(["a"], mulkVeriTam((v) => duzenle(v.param.mulk!.yeniOyuncu)));
      const hs = yurtHucreleri(s, "a");
      const h0 = anlikHazine(s.dunya, "a");
      tamam(s, "a", { tur: "tesis_insa_hucre", ilce: hs[0]!.ilce, tesisTuru: "ciftlik", hucreler: bitisikCift(hs.map((h) => h.id)) });
      expect(h0 - anlikHazine(s.dunya, "a")).toBe(s.ic.icerik.tesisTurleri.find((t) => t.id === "ciftlik")!.insaParasi);
      expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBeUndefined();
    }
  });
});

describe("ayrılmış hücreler (ayrilmisHucrePpm, ayrilmisGun)", () => {
  it("her ilçenin uygun hücrelerinin tam %20'si (aşağı yuvarlanır) karma sırasıyla ayrılır; derleme deterministik", () => {
    const s = mulkSim([], mulkVeriTam());
    const s2 = mulkSim([], mulkVeriTam());
    expect([...s.ic.mulk!.ayrilmis].sort()).toEqual([...s2.ic.mulk!.ayrilmis].sort());
    for (const c of F.ilceler) {
      const ayrilan = c.hucreler.filter((h) => s.ic.mulk!.ayrilmis.has(h.id));
      expect(ayrilan.every((h) => h.uygun)).toBe(true);
      expect(ayrilan.length).toBe(Math.floor((c.uygunHucre * 200_000) / PPM));
    }
    expect(mulkSim([], mulkVeriTam((v) => (v.param.mulk!.yeniOyuncu.ayrilmisHucrePpm = 0))).ic.mulk!.ayrilmis.size).toBe(0);
  });

  it("katılımının ilk 14 gününden sonra ayrılmış hücre alınamaz; yeni oyuncu alabilir; ayrılmamış hücre herkese açık", () => {
    const s = mulkSim([], mulkVeriTam((v) => {
      v.param.mulk!.yeniOyuncu.yurtHucre = 0;
      v.param.mulk!.yeniOyuncu.hibe = 1_000_000_000;
    }));
    const ayr = s.ic.mulk!;
    const ilce = F.ilceler.find((c) => c.id === "sn_m_dag_merkez")!;
    const uygun = ilce.hucreler.filter((h) => h.uygun && h.sinif === "kirsal");
    const ayrilmis = uygun.filter((h) => ayr.ayrilmis.has(h.id)).map((h) => h.id);
    const serbest = uygun.filter((h) => !ayr.ayrilmis.has(h.id)).map((h) => h.id);
    expect(ayrilmis.length).toBeGreaterThan(3);
    expect(katil(s, "eski", undefined, 0).tamam).toBe(true);
    expect(katil(s, "yeni", undefined, 10 * GUN).tamam).toBe(true);
    // 13. günün sonunda: eski oyuncu (13 gün) hâlâ yeni sayılır
    const al = (id: string): Komut => ({ tur: "parsel_al", ilce: ilce.id, hucreler: [id], sinif: "kirsal" });
    expect(ver(s, "eski", al(ayrilmis[0]!), 13 * GUN).tamam).toBe(true);
    // 14. günde (katılımdan tam 14 gün): artık eski; ayrılmış reddedilir, serbest hücre alınabilir
    const r = ver(s, "eski", al(ayrilmis[1]!), 14 * GUN);
    expect(r.tamam).toBe(false);
    expect((r as { hata: string }).hata).toContain("yeni oyunculara ayrilmis");
    expect(hucreBul(s.dunya, ayrilmis[1]!)).toBeUndefined();
    expect(ver(s, "eski", al(serbest[0]!), 14 * GUN).tamam).toBe(true);
    // 'yeni' katılımından 4 gün sonra (t = 14 gün): ayrılmış hücreyi alabilir
    expect(ver(s, "yeni", al(ayrilmis[1]!), 14 * GUN).tamam).toBe(true);
    expect(hucreBul(s.dunya, ayrilmis[1]!)!.sahip).toBe("yeni");
  });

  it("ayrilmisGun parametresi süreyi belirler", () => {
    const s = mulkSim([], mulkVeriTam((v) => {
      v.param.mulk!.yeniOyuncu.yurtHucre = 0;
      v.param.mulk!.yeniOyuncu.ayrilmisGun = 2;
    }));
    const ayrilmis = [...s.ic.mulk!.ayrilmis].filter((i) => s.ic.mulk!.hucreler.get(i)!.hucre.sinif === "kirsal" && s.ic.mulk!.hucreler.get(i)!.ilce === "sn_m_dag_merkez");
    katil(s, "a", undefined, 0);
    const al = (id: string): Komut => ({ tur: "parsel_al", ilce: "sn_m_dag_merkez", hucreler: [id], sinif: "kirsal" });
    expect(ver(s, "a", al(ayrilmis[0]!), 2 * GUN - 1).tamam).toBe(true);
    expect(ver(s, "a", al(ayrilmis[1]!), 2 * GUN).tamam).toBe(false);
  });

  it("yurt ayrılmış hücreleri de verebilir (kural yalnız satışa uygulanır)", () => {
    const s = mulkSim(["a"], mulkVeriTam((v) => (v.param.mulk!.yeniOyuncu.ayrilmisHucrePpm = PPM)));
    expect(s.ic.mulk!.ayrilmis.size).toBe(F.ilceler.reduce((t, c) => t + c.uygunHucre, 0));
    const hs = yurtHucreleri(s, "a");
    expect(hs).toHaveLength(6);
    expect(hs.every((h) => s.ic.mulk!.ayrilmis.has(h.id))).toBe(true);
  });
});

describe("yeni oyuncu kalkanı (kalkanGun)", () => {
  it("mülk kipi: korumaBitis = katılım + mulk.yeniOyuncu.kalkanGun (14 gün)", () => {
    const s = mulkSim([], mulkVeriTam());
    katil(s, "a", undefined, 3 * GUN);
    expect(s.ic.mulk!.p.yeniOyuncu.kalkanGun).toBe(14);
    expect(oyuncuBul(s.dunya, "a")!.korumaBitis).toBe(3 * GUN + 14 * GUN);
    // Parametre değişince kalkan değişir; askeri 7 gün mülk kipinde okunmaz
    const k = mulkSim([], mulkVeriTam((v) => (v.param.mulk!.yeniOyuncu.kalkanGun = 3)));
    katil(k, "a");
    expect(oyuncuBul(k.dunya, "a")!.korumaBitis).toBe(3 * GUN);
    const o = mulkSim([], mulkVeriTam((v) => {
      v.param.askeri.yeniOyuncuKorumasiGun = 30;
    }));
    katil(o, "a");
    expect(oyuncuBul(o.dunya, "a")!.korumaBitis).toBe(14 * GUN);
  });

  it("bölge kipi (parsel yok): kalkan hâlâ askeri.yeniOyuncuKorumasiGun (7 gün)", () => {
    const v = miniVeriyiYukle();
    expect(v.param.askeri.yeniOyuncuKorumasiGun).toBe(7);
    const s = Simulasyon.olustur(v, 3);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    expect(oyuncuBul(s.dunya, "a")!.korumaBitis).toBe(7 * GUN);
    expect(s.dunya.mulk).toBeUndefined();
  });
});

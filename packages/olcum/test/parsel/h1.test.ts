import { describe, expect, it } from "vitest";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { ilceSinifAnahtari, ilceSiniflari, portfoyAnahtari, portfoyCesitliligi } from "../../src/parsel";
import type { PortfoySkoru } from "../../src/parsel";

/** sınıf -> [portföy, skor] listesi. */
function skorlar(t: Record<string, Array<[string, number]>>): PortfoySkoru[] {
  return Object.entries(t).flatMap(([sinif, l]) => l.map(([portfoy, skor]) => ({ sinif, portfoy, skor })));
}

describe("H1 parsel: portfoy cesitliligi", () => {
  it("portfoy anahtari sirali ve tam 6 yuva", () => {
    expect(portfoyAnahtari([{ tur: "tarla", yuva: 2 }, { tur: "ahir", yuva: 2 }, { tur: "sulama", yuva: 1 }, { tur: "konut", yuva: 1 }])).toBe("ahir+konut+sulama+tarla");
    expect(() => portfoyAnahtari([{ tur: "tarla", yuva: 2 }])).toThrow(/toplam yuva 2/);
  });

  it("ilce sinifi: arsa sinifi + arazi onceligi; fiksturden", () => {
    expect(ilceSinifAnahtari("kirsal", ["ova", "kiyi"])).toBe("kirsal_kiyi");
    expect(ilceSinifAnahtari("sehir", ["dag"])).toBe("sehir_dag");
    expect(ilceSinifAnahtari("kasaba", [])).toBe("kasaba_diger");
    const s = ilceSiniflari(parselFiksturuYukle("mini-6"), miniVeriyiYukle().harita);
    expect(s["sn_m_sehir_merkez"]).toBe("sehir_kiyi");
    expect(s["sn_m_dag_tasra"]).toBe("kirsal_dag");
    expect(Object.keys(s)).toHaveLength(12);
  });

  it("tek portfoy her sinifta ilk 3'te -> kaldi; cesitli -> gecti", () => {
    const tekduze = skorlar({
      a: [["p", 10], ["q", 9], ["r", 8], ["s", 7]],
      b: [["p", 10], ["q", 1], ["r", 8], ["s", 7]],
      c: [["p", 10], ["q", 9], ["r", 1], ["s", 7]],
    });
    const k = portfoyCesitliligi(tekduze);
    expect(k.enYaygin).toEqual({ portfoy: "p", ilkUcSinif: 3, oranPpm: 1_000_000 });
    expect(k.verdict).toBe("kaldi");
    expect(k.enIyiler).toEqual({ a: ["p"], b: ["p"], c: ["p"] });
    expect(k.entropiPpm).toBe(0);
    expect(k.sabitPortfoyPismanligi).toEqual({ portfoy: "p", ortalamaPpm: 0 });

    const cesitli = skorlar({
      a: [["p", 10], ["q", 9], ["r", 8], ["s", 1], ["t", 0]],
      b: [["s", 10], ["t", 9], ["p", 8], ["q", 1], ["r", 0]],
      c: [["q", 10], ["r", 9], ["s", 8], ["t", 1], ["p", 0]],
      d: [["t", 10], ["p", 9], ["s", 1], ["q", 0], ["r", -5]],
    });
    const g = portfoyCesitliligi(cesitli);
    // p: a, b, d -> 3/4 = %75 > %70 -> kaldı; eşik tam sınırda değil, örnek bilinçli.
    expect(g.enYaygin).toEqual({ portfoy: "p", ilkUcSinif: 3, oranPpm: 750_000 });
    expect(g.verdict).toBe("kaldi");
    // Her portföy tam 2 sınıfta ilk 3'te (2/4 = %50) ve her sınıfın birincisi farklı.
    const dengeli = skorlar({
      a: [["p", 10], ["q", 9], ["r", 8], ["s", 1], ["t", 0], ["u", 0]],
      b: [["s", 10], ["t", 9], ["u", 8], ["p", 1], ["q", 0], ["r", 0]],
      c: [["u", 10], ["p", 9], ["s", 8], ["q", 1], ["r", 0], ["t", 0]],
      d: [["q", 10], ["r", 9], ["t", 8], ["p", 1], ["s", 0], ["u", 0]],
    });
    const g2 = portfoyCesitliligi(dengeli);
    expect(g2.enYaygin?.oranPpm).toBe(500_000);
    expect(g2.verdict).toBe("gecti");
    expect(g2.entropiPpm).toBe(1_000_000);
  });

  it("esitlik ve esikFark sirayi paylastirir; tek sinif belirsiz", () => {
    const s = skorlar({ a: [["p", 10], ["q", 10], ["r", 10], ["s", 10]], b: [["p", 10], ["q", 5], ["r", 4], ["s", 3]] });
    expect(portfoyCesitliligi(s).ilkUcSayisi).toEqual({ p: 2, q: 2, r: 2, s: 1 });
    expect(portfoyCesitliligi(s, { esikFark: 7 }).ilkUcSayisi).toEqual({ p: 2, q: 2, r: 2, s: 2 });
    expect(portfoyCesitliligi(skorlar({ a: [["p", 1]] })).verdict).toBe("belirsiz");
    expect(() => portfoyCesitliligi([...s, { sinif: "a", portfoy: "p", skor: 1 }])).toThrow(/yinelenen/);
  });

  it("sabit portfoy pismanligi: her sinifta olculenler arasinda en dusuk ortalama", () => {
    const s = skorlar({ a: [["p", 100], ["q", 50]], b: [["p", 50], ["q", 100], ["r", 1]] });
    // p: (0 + 500000)/2, q: (500000 + 0)/2 -> eşitlikte anahtar sırası (p); r her sınıfta yok.
    expect(portfoyCesitliligi(s).sabitPortfoyPismanligi).toEqual({ portfoy: "p", ortalamaPpm: 250_000 });
  });
});

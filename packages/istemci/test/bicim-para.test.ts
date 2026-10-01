/**
 * Tek para biçimi (sahip kararı T-1, docs/12 §14): "1.234 ₺". Simge sayının sonunda; sayı ile simge arası bölünmez boşluk
 * (U+00A0, satır sonunda ayrılmasınlar); eksi U+2212; işaretli "+1.234 ₺"; binlik ayırıcı nokta; ondalık yok.
 */
import { describe, expect, it } from "vitest";
import { EKSI, PARA_ARASI, PARA_SIMGESI, para, paraIsaretli, paraMili } from "../src/arayuz/bicim";

const NB = " ";

describe("para biçimi (T-1: 1.234 ₺)", () => {
  it("sembol sonda, binlik ayırıcı nokta, ondalık yok", () => {
    expect(para(0)).toBe(`0${NB}₺`);
    expect(para(999)).toBe(`999${NB}₺`);
    expect(para(1000)).toBe(`1.000${NB}₺`);
    expect(para(1234)).toBe(`1.234${NB}₺`);
    expect(para(1_234_567)).toBe(`1.234.567${NB}₺`);
    expect(para(12.4)).toBe(`12${NB}₺`);
  });

  it("ayırıcı bölünmez boşluk (U+00A0), düz boşluk değil; simge ₺ (U+20BA)", () => {
    expect(PARA_ARASI).toBe(" ");
    expect(PARA_SIMGESI).toBe("₺");
    expect(para(5)).not.toMatch(/ /); // düz boşluk yok
    expect(para(5)).toMatch(/^5 ₺$/);
    expect(/^₺/.test(para(5))).toBe(false); // simge önde değil
  });

  it("negatif: eksi U+2212 (tire değil), sayının önünde; işaretli: artı", () => {
    expect(EKSI).toBe("−");
    expect(para(-1234)).toBe(`−1.234${NB}₺`);
    expect(para(-1234)).not.toContain("-");
    expect(paraIsaretli(1_960_000)).toBe(`+1.960${NB}₺`);
    expect(paraIsaretli(-180_000)).toBe(`−180${NB}₺`);
    expect(paraIsaretli(0)).toBe(`0${NB}₺`);
    // yuvarlayınca sıfıra inen tutar işaret taşımaz
    expect(para(-0.2)).toBe(`0${NB}₺`);
    expect(paraIsaretli(400)).toBe(`0${NB}₺`);
    expect(paraIsaretli(-400)).toBe(`0${NB}₺`);
  });

  it("mili-para: yuvarlama çağıranda (varsayılan aşağı; maliyet 'yukarı'; ham tutar 'yakın')", () => {
    expect(paraMili(1_234_000)).toBe(`1.234${NB}₺`);
    expect(paraMili(1_234_999)).toBe(`1.234${NB}₺`); // aşağı
    expect(paraMili(1_234_001, "yukari")).toBe(`1.235${NB}₺`); // gereken tutar yukarı
    expect(paraMili(1_234_500, "yakin")).toBe(`1.235${NB}₺`);
    expect(paraMili(1_234_499, "yakin")).toBe(`1.234${NB}₺`);
    expect(paraMili(8_000_000)).toBe(`8.000${NB}₺`);
    expect(paraMili(-12_000)).toBe(`−12${NB}₺`);
    expect(paraMili(-12_500)).toBe(`−12${NB}₺`); // işaretten bağımsız aşağı = mutlak değerde aşağı
  });
});

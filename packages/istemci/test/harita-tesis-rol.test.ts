/** T-3: yöntemli tesislerin rol satırı (tek cümle; tablo kaydı yoksa satır yok). */
import { describe, expect, it } from "vitest";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { TESIS_ROL, tesisRolu } from "../src/harita/tesis-rol-metin";
import { seciciGorunur, yontemSecenekleri } from "../src/harita/yontem-secici";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const ham = icerikHam as unknown as { tesisTurleri: Array<{ id: string; yontemler: string[] }> };

describe("tesis rolü", () => {
  it("ahır ve çiftlik cümleleri (T3 son metin); Pazar büyük harfle", () => {
    expect(tesisRolu("ahir")).toBe("Tahılını gıdaya çevirir; dükkânının rafı için gıda buradan gelir, yan ürün olarak gübre de verir.");
    expect(tesisRolu("ciftlik")).toBe("Tarlada tahıl yetiştirir; Pazar'da satabilir, un ve ahır zincirine de verebilirsin.");
  });

  it("tabloda olmayan tür: null (yedek metin yok)", () => {
    expect(tesisRolu("dukkan")).toBeNull();
    expect(tesisRolu("rafineri")).toBeNull();
    expect(tesisRolu("")).toBeNull();
  });

  it("tablodaki her kayıt gerçek bir tesis türü ve yöntemli (seçici görünür); tek cümle, sayı yok, cümle başı büyük, sonu nokta", () => {
    for (const [anahtar, metin] of Object.entries(TESIS_ROL)) {
      const id = anahtar.replace("tesis.rol.", "");
      expect(ham.tesisTurleri.some((t) => t.id === id), id).toBe(true);
      expect(seciciGorunur(yontemSecenekleri(ic, id, { acik: () => true, sebeke: null })), `${id} yöntemli değil`).toBe(true);
      expect(metin).toMatch(/^[A-ZÇĞİÖŞÜ]/);
      expect(metin.endsWith(".")).toBe(true);
      expect(metin).not.toMatch(/\d/);
      expect(metin.length).toBeLessThanOrEqual(130);
      // büyük harf yalnız cümle başında ya da "Pazar"
      expect(metin.slice(1).match(/[A-ZÇĞİÖŞÜ]\w*/g) ?? []).toEqual(metin.includes("Pazar") ? ["Pazar"] : []);
    }
  });
});

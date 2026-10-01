import { describe, expect, it } from "vitest";
import { etkilesimSec } from "../src/yuru/etkilesim";

const temel = { durum: 1, satinAlinabilir: true, sahip: null, ben: "ben", insaat: false };

describe("yürüyüş: [E] etkileşim bağlamı", () => {
  it("ilçe dışında hap yok", () => {
    expect(etkilesimSec({ ...temel, durum: 0 })).toBeNull();
  });
  it("boş satın alınabilir hücre: satın al (fiyatla)", () => {
    expect(etkilesimSec({ ...temel, fiyat: "1.000 ₺" })).toEqual({ tur: "satin-al", etiket: "Satın al · 1.000 ₺" });
  });
  it("yol/su: parsel bilgisi", () => {
    expect(etkilesimSec({ ...temel, durum: 1 | 2, satinAlinabilir: false })!.tur).toBe("parsel");
  });
  it("kendi arsan: yapı kur; kendi yapın: yönet", () => {
    expect(etkilesimSec({ ...temel, sahip: "ben" })!.tur).toBe("kur");
    expect(etkilesimSec({ ...temel, sahip: "ben", insaat: true })!.tur).toBe("yonet");
  });
  it("başkasının parseli ya da yapısı: bilgi (sahip adıyla)", () => {
    expect(etkilesimSec({ ...temel, sahip: "bot", sahipAdi: "Ayşe Tarım", insaat: true })).toEqual({ tur: "bilgi", etiket: "Bilgi: Ayşe Tarım" });
  });
});

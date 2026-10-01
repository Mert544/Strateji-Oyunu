import { describe, expect, it } from "vitest";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { h2Kos, h3Kos } from "../src";
import { kararli, semaDogru } from "./olcum-yardimci";

describe("hipotez koşucuları (kısa sürüm)", () => {
  const tohumlar = [1];

  it("H2: 3 günlük kısa koşu şemaya uygundur ve determinizm", () => {
    const h = h2Kos({ tohumlar, kisa: true });
    semaDogru(h, "H2", 1);
    const gunler = (h.ayrinti["tohumlar"] as Array<{ gunler: unknown[] }>)[0]!.gunler;
    expect(gunler).toHaveLength(3);
    expect(kararli(h2Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
  });

  it("H3: müdahaleli ve temel koşu karşılaştırılır", () => {
    const h = h3Kos({ tohumlar, kisa: true });
    semaDogru(h, "H3", 1);
    const tablo = (h.ayrinti["degisimTablosuIlkTohum"] as unknown[]) ?? [];
    // Satır sayısı = içerikteki mal sayısı (tarım katmanı gübreyi ekledi).
    expect(tablo).toHaveLength(varsayilanVeriyiYukle().icerik.mallar.length);
    expect(kararli(h3Kos({ tohumlar, kisa: true }))).toBe(kararli(h));
  });
});

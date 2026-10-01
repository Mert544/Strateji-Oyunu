/**
 * Gerçek haritada H3 ve iklim seçeneğinin koşuya yansıması (`harita-iklim.test.ts`'in bölünmüş parçası; ortak yardımcılar
 * `harita-iklim-yardimci.ts`).
 */
import { describe, expect, it } from "vitest";
import { gercekVeriyiYukle } from "@bolge/veri";
import { h2Kos, h3Kos } from "../src";
import { baglamDogru, semaDogru } from "./harita-iklim-yardimci";

describe("gerçek haritada hipotez koşucuları (kısa sürüm)", () => {
  const tohumlar = [1];
  const gercek = { tohumlar, kisa: true, harita: "gercek", iklim: "hizli" } as const;

  it("H3: şemaya uygun; mal sayısı içerikten", () => {
    const h = h3Kos(gercek);
    semaDogru(h, "H3", 1);
    baglamDogru(h, "gercek", 53, "hizli", 12);
    expect(h.ayrinti["degisimTablosuIlkTohum"] as unknown[]).toHaveLength(gercekVeriyiYukle().icerik.mallar.length);
  }, 300_000);

  it("iklim seçeneği koşuya yansır: gunCarpani=12 ile gerçek takvimin durum izi farklıdır", () => {
    const hizli = h2Kos(gercek);
    const takvim = h2Kos({ ...gercek, iklim: "gercek" });
    baglamDogru(takvim, "gercek", 53, "gercek", 1);
    expect(hizli.tohumBasina[0]!.durumOzeti).not.toBe(takvim.tohumBasina[0]!.durumOzeti);
  }, 300_000);
});

/**
 * Hat deterministik mi: aynı girdi -> aynı çıktı (bayt bayt) ve repodaki çıktılar güncel mi.
 * Ham kaynaklar önbellekte (.onbellek) yoksa atlanır (ağ gerektirir: `pnpm harita:gercek` önce çalıştırılmalı).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { KAYNAKLAR } from "../src/kaynaklar";
import { onbellekYolu } from "../src/indir";
import { hatCalistir } from "../src/uret";
import { HARITA_DIZINI, HARITA_DOSYASI, RAPOR_DIZINI, SINIR_DOSYASI } from "../src/yollar";

const onbellekVar = KAYNAKLAR.every((k) => existsSync(onbellekYolu(k)));

describe.skipIf(!onbellekVar)("hat deterministik", () => {
  it(
    "iki kosu bayt bayt ayni cikti verir ve repodaki cikti dosyalariyla ayni",
    async () => {
      const a = await hatCalistir({ sessiz: true });
      const b = await hatCalistir({ sessiz: true });
      expect(b.haritaMetni).toBe(a.haritaMetni);
      expect(b.topoMetni).toBe(a.topoMetni);
      expect(b.raporMetni).toBe(a.raporMetni);
      // Repodaki çıktılar güncel (yapılandırma/kod değiştiyse `pnpm harita:gercek` yeniden çalıştırılmalı)
      expect(readFileSync(resolve(HARITA_DIZINI, HARITA_DOSYASI), "utf8")).toBe(a.haritaMetni);
      expect(readFileSync(resolve(HARITA_DIZINI, SINIR_DOSYASI), "utf8")).toBe(a.topoMetni);
      expect(readFileSync(resolve(RAPOR_DIZINI, "hat-raporu.json"), "utf8")).toBe(a.raporMetni);
    },
    300_000,
  );

  it("MRDS dogrulamasi: her cevher/bakir iddiasi kanitli ya da gerekceli muaf", async () => {
    const s = await hatCalistir({ sessiz: true });
    for (const [bolge, mallar] of Object.entries(s.rapor.mrds)) {
      for (const [mal, k] of Object.entries(mallar)) {
        expect(k.muaf || k.icerde + k.yakin > 0, `${bolge}/${mal}`).toBe(true);
      }
    }
  }, 300_000);
});

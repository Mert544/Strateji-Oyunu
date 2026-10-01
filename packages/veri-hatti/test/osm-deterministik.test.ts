/**
 * OSM il/ilçe hattı deterministik mi: aynı önbellek + yapılandırma -> bayt bayt aynı çıktı ve repodaki
 * odbl/ dosyaları güncel mi. Ham Overpass yanıtları önbellekte (.onbellek/osm) yoksa atlanır
 * (ağ gerektirir: önce `pnpm harita:osm`).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { idariHatCalistir, RAPOR_DOSYASI } from "../src/osm/idari";
import { osmKilitleriOku, osmOnbellekYolu } from "../src/osm/indir";
import { HIYERARSI_DOSYASI, ILCE_DIZINI, ILLER_DOSYASI, ODBL_DIZINI } from "../src/osm/ortak";
import { osmYapilandirmaOku } from "../src/osm/yapilandirma";

const kilit = osmKilitleriOku();
const ulkeler = osmYapilandirmaOku().ulkeler.filter((u) => kilit[u.kod] !== undefined);
const onbellekVar = ulkeler.length > 0 && ulkeler.every((u) => existsSync(osmOnbellekYolu(u)));

describe.skipIf(!onbellekVar)("OSM hatti deterministik", () => {
  it(
    "iki kosu bayt bayt ayni cikti verir ve repodaki odbl/ dosyalariyla ayni",
    async () => {
      const secenek = { sessiz: true, indirme: false, ulkeler: ulkeler.map((u) => u.kod) };
      const a = await idariHatCalistir(secenek);
      const b = await idariHatCalistir(secenek);
      expect(b.hiyerarsiMetni).toBe(a.hiyerarsiMetni);
      expect(b.illerMetni).toBe(a.illerMetni);
      expect(b.raporMetni).toBe(a.raporMetni);
      expect([...b.ilceMetinleri.keys()]).toEqual([...a.ilceMetinleri.keys()]);
      for (const [il, m] of a.ilceMetinleri) expect(b.ilceMetinleri.get(il), il).toBe(m);
      // Repodaki çıktılar güncel (kod/yapılandırma değiştiyse `pnpm harita:osm` yeniden çalıştırılmalı)
      expect(readFileSync(resolve(ODBL_DIZINI, HIYERARSI_DOSYASI), "utf8")).toBe(a.hiyerarsiMetni);
      expect(readFileSync(resolve(ODBL_DIZINI, ILLER_DOSYASI), "utf8")).toBe(a.illerMetni);
      expect(readFileSync(resolve(ODBL_DIZINI, RAPOR_DOSYASI), "utf8")).toBe(a.raporMetni);
      for (const [il, m] of a.ilceMetinleri) expect(readFileSync(resolve(ILCE_DIZINI, `${il}.topo.json`), "utf8"), il).toBe(m);
    },
    900_000,
  );
});

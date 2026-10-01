/**
 * Izgara çıktısı determinizmi ve BHI1 biçimi.
 * Gerçek veri testi, Gebze PMTiles özütü ve Overpass ilişkisi önbellekte (.onbellek) yoksa atlanır
 * (üretim: docs/arastirma/karo-ve-izgara-denemesi.md, "Yeniden üretim").
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { durumAl, ikiliCoz, ikiliKodla, onizlemePng, sikistir } from "../src/osm/izgara-cikti";
import { YerelPmtiles } from "../src/osm/izgara-pmtiles";
import { icerdeMaskesi, overpassHalkalari, type OverpassYaniti } from "../src/osm/izgara-sinir";
import { izgaraIstatistigi, izgaraUret } from "../src/osm/izgara-uret";
import { Bit, satinAlinabilir } from "../src/osm/izgara-uygunluk";
import { HARITA_DIZINI, ONBELLEK } from "../src/yollar";

describe("BHI1 ikili bicim", () => {
  const durum = Uint8Array.from({ length: 12 }, (_, i) => (i % 3 === 0 ? 0 : Bit.ICERIDE | (i << 5) | (i & Bit.YOL)));
  const bina = Uint8Array.from({ length: 12 }, (_, i) => i * 8);

  it("kodla/coz gidis-donus (1 ve 2 duzlem)", () => {
    const iz = { x0: 610_000, y0: 393_000, genislik: 4, yukseklik: 3, durum, binaYuzde: bina };
    const c = ikiliCoz(ikiliKodla(iz));
    expect(c).toEqual(iz);
    const tek = ikiliCoz(ikiliKodla({ ...iz, binaYuzde: undefined }));
    expect(tek.binaYuzde).toBeUndefined();
    expect(durumAl(c, 610_001, 393_000)).toBe(durum[1]);
    expect(durumAl(c, 609_999, 393_000)).toBe(0);
    expect(() => ikiliCoz(new Uint8Array(24))).toThrow(/BHI1/);
  });

  it("sikistirma ve onizleme bayt bayt ayni", () => {
    const t = ikiliKodla({ x0: 1, y0: 2, genislik: 4, yukseklik: 3, durum });
    expect(Buffer.from(sikistir(t)).equals(Buffer.from(sikistir(t)))).toBe(true);
    const p = onizlemePng(4, 3, durum);
    expect(Buffer.from(p.subarray(1, 4)).toString()).toBe("PNG");
    expect(Buffer.from(onizlemePng(4, 3, durum)).equals(Buffer.from(p))).toBe(true);
  });
});

const KARO = resolve(ONBELLEK, "karolar/gebze-z15.pmtiles");
const ILISKI = resolve(ONBELLEK, "osm/iliski-1211496.json");
const ORNEK = resolve(HARITA_DIZINI, "odbl/ornek/gebze-hucreler.bhi.gz");
const veriVar = existsSync(KARO) && existsSync(ILISKI);

describe.skipIf(!veriVar)("Gebze gercek veri", () => {
  it("PMTiles dizini tam okunur", () => {
    const a = new YerelPmtiles(KARO);
    expect(a.tumKarolar()).toHaveLength(a.baslik.numAddressedTiles);
    expect(a.metaveri()["version"]).toMatch(/^4\./);
    a.kapat();
  });

  it(
    "iki kosu bayt bayt ayni ve repodaki ornekle ayni",
    () => {
      const maske = icerdeMaskesi(overpassHalkalari(JSON.parse(readFileSync(ILISKI, "utf8")) as OverpassYaniti, 1211496));
      const uret = (): Uint8Array => {
        const a = new YerelPmtiles(KARO);
        const s = izgaraUret(a, maske);
        a.kapat();
        return sikistir(ikiliKodla({ ...maske, durum: s.durum, binaYuzde: s.binaYuzde }));
      };
      const b1 = uret();
      const b2 = uret();
      expect(Buffer.from(b2).equals(Buffer.from(b1))).toBe(true);
      if (existsSync(ORNEK)) expect(Buffer.from(readFileSync(ORNEK)).equals(Buffer.from(b1))).toBe(true);
      // Akıl sağlığı: ilçe ~419 km² -> ~500 bin hücre, çoğu satın alınabilir
      const ist = izgaraIstatistigi(ikiliCoz(new Uint8Array(gunzipSync(b1))).durum);
      expect(ist.toplam).toBeGreaterThan(450_000);
      expect(ist.toplam).toBeLessThan(560_000);
      expect(ist.satinAlinabilir / ist.toplam).toBeGreaterThan(0.6);
      // İçerideki her hücrede ICERIDE biti; satın alınabilirlik engel bitleriyle tutarlı
      expect(ist.satinAlinabilir + ist.engel.herhangi).toBe(ist.toplam);
      expect(satinAlinabilir(0)).toBe(false);
    },
    120_000,
  );
});

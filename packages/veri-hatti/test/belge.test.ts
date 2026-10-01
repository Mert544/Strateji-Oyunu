/**
 * DATA_SOURCES.md: üretilen tablolar güncel mi, zorunlu içerik (kaynaklar, lisans, atıf, politika) var mı.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KAYNAKLAR } from "../src/kaynaklar";
import { NUFUS_BLOK, REZERV_BLOK, blokIcerigi, nufusTablosu, raporuOku, rezervTablosu } from "../src/kaynakca";
import { yapilandirmaOku } from "../src/yapilandirma";
import { DATA_SOURCES_YOLU } from "../src/yollar";

const belge = readFileSync(DATA_SOURCES_YOLU, "utf8");
const yap = yapilandirmaOku();
const rapor = raporuOku();

describe("DATA_SOURCES.md", () => {
  it("rezerv ve nufus tablolari rapordan uretilenle ayni (guncel)", () => {
    expect(blokIcerigi(belge, REZERV_BLOK)).toBe(rezervTablosu(yap, rapor));
    expect(blokIcerigi(belge, NUFUS_BLOK)).toBe(nufusTablosu(yap, rapor));
  });

  it("her bolge rezerv ve nufus tablosunda bir satira sahip", () => {
    for (const b of yap.bolgeler) {
      const satir = `| \`${b.id}\` |`;
      expect(blokIcerigi(belge, REZERV_BLOK), b.id).toContain(satir);
      expect(blokIcerigi(belge, NUFUS_BLOK), b.id).toContain(satir);
    }
  });

  it("her kaynagin adi, lisansi ve URL dizini belgede", () => {
    for (const k of KAYNAKLAR) {
      expect(belge, k.kimlik).toContain(k.dosya.replace(/\.(geojson|zip)$/, ""));
    }
    expect(belge).toContain("Kamu malı");
    expect(belge).toContain("Made with Natural Earth");
    expect(belge).toContain("USGS");
  });

  it("yasaklı kaynaklar 'kullanilmayan' olarak anilir; sinir politikasi kararlari yazili", () => {
    for (const s of ["OpenStreetMap", "GADM", "FAOSTAT", "WorldClim", "UN Comtrade", "NGA World Port Index"]) expect(belge).toContain(s);
    expect(belge).toContain("Kırım");
    expect(belge).toContain("Sınır ve isim politikası");
    expect(belge).toContain("Devletler kurgusaldır");
  });
});

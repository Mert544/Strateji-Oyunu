/**
 * Arsa ızgarası manifesti (odbl/izgara/manifest.json): üretilmiş tek kayıt.
 *  - Şema, sıra, dosya bayt/sha256 ve BHI1 sayımları repodaki dosyalarla tutarlı.
 *  - İstemci (packages/istemci `bhiCoz`) ve sunucu/betik tarafı (`ilceIzgarasiOku`) aynı baytlardan aynı hücreleri okur.
 *  - Gerçek veri (karo özütü önbellekte varsa): ilçe iki kez üretilir, bayt bayt aynı ve repodaki dosyalarla aynı.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { bhiCoz } from "@bolge/veri";
import { izgaraSay } from "../../istemci/src/harita/hucre";
import { ilceNufusOku, ilceNufusu } from "../src/osm/ilce-nufus";
import { ikiliCoz } from "../src/osm/izgara-cikti";
import { YerelPmtiles } from "../src/osm/izgara-pmtiles";
import { PMTILES, TIPPECANOE } from "../src/osm/izgara-arac";
import { KARO_YAPISI, ilceBilgisi, ilceIzgarasiUret, karoOnbellekYolu } from "../src/osm/izgara-ilce";
import { IZGARA_MANIFEST_YOLU, ilceIzgarasiOku, manifestDosyalari, manifestOku, manifestiDogrula } from "../src/osm/izgara-manifest";
import { izgaraIstatistigi } from "../src/osm/izgara-uret";
import { VARSAYILAN_SECENEKLER } from "../src/osm/izgara-uygunluk";
import { ODBL_DIZINI } from "../src/osm/ortak";
import { ONBELLEK } from "../src/yollar";

const m = manifestOku();

describe("izgara manifesti", () => {
  it("Alfa-0 ilk dalga ilceleri var: Gemlik, Korfez (ve Gebze)", () => {
    const k = m.ilceler.map((i) => i.kimlik);
    expect(k).toEqual(expect.arrayContaining(["tr_16_gemlik", "tr_41_korfez", "tr_41_gebze"]));
    expect(k).toEqual([...k].sort());
  });

  it("kural ve kaynak surumleri uretim koduyla ayni (>= %50 yol/su, askeri her kesisim)", () => {
    expect(m.kural).toEqual({ ornek: VARSAYILAN_SECENEKLER.ornek, yolEsik: VARSAYILAN_SECENEKLER.yolEsik, suEsik: VARSAYILAN_SECENEKLER.suEsik, askeriEsik: VARSAYILAN_SECENEKLER.askeriEsik });
    expect(m.kural.yolEsik * 2).toBe(m.kural.ornek ** 2);
    expect(m.kural.suEsik * 2).toBe(m.kural.ornek ** 2);
    expect(m.kaynak.karo.yapi).toBe(KARO_YAPISI);
    for (const i of m.ilceler) expect(i.karo.yapi).toBe(KARO_YAPISI);
  });

  it("dosyalar bayt ve sha256 olarak manifestle ayni; yollar odbl/ altinda", () => {
    expect(manifestiDogrula(m)).toEqual([]);
    for (const d of manifestDosyalari(m)) {
      expect(d.yol.startsWith("/") || d.yol.includes("..")).toBe(false);
      expect(existsSync(resolve(ODBL_DIZINI, d.yol))).toBe(true);
    }
  });

  it("BHI1 baslik, cerceve, ham boyut ve hucre sayimlari manifestle tutarli", () => {
    for (const i of m.ilceler) {
      const ham = new Uint8Array(gunzipSync(readFileSync(resolve(ODBL_DIZINI, i.bhi.yol))));
      expect(ham.length, i.kimlik).toBe(i.bhi.hamBayt);
      const iz = ikiliCoz(ham);
      expect({ x0: iz.x0, y0: iz.y0, genislik: iz.genislik, yukseklik: iz.yukseklik }, i.kimlik).toEqual(i.cerceve);
      const st = izgaraIstatistigi(iz.durum);
      expect({ icerde: st.icerdeTum, su: st.suHucre, kara: st.toplam, uygun: st.satinAlinabilir, engelYol: st.engel.yol, engelAskeri: st.engel.askeri }, i.kimlik).toEqual(i.hucre);
      expect(i.hucre.icerde).toBe(i.hucre.su + i.hucre.kara);
      expect(i.hucre.uygun / i.hucre.kara, i.kimlik).toBeGreaterThan(0.9);
      expect(i.hucre.uygun, i.kimlik).toBeLessThanOrEqual(i.hucre.kara);
    }
  });

  it("istemci ve sunucu tarafi okuyucusu ayni baytlardan ayni hucreleri okur", () => {
    for (const i of m.ilceler) {
      const dosya = new Uint8Array(gunzipSync(readFileSync(resolve(ODBL_DIZINI, i.bhi.yol))));
      const istemci = bhiCoz(dosya);
      const sunucu = ilceIzgarasiOku(m, i.kimlik);
      expect(istemci.x0, i.kimlik).toBe(sunucu.x0);
      expect(istemci.y0).toBe(sunucu.y0);
      expect(istemci.genislik).toBe(sunucu.genislik);
      expect(istemci.yukseklik).toBe(sunucu.yukseklik);
      expect(Buffer.from(istemci.durum).equals(Buffer.from(sunucu.durum))).toBe(true);
      const say = izgaraSay(istemci);
      expect({ kota: say.kota, uygun: say.uygun }, i.kimlik).toEqual({ kota: i.hucre.kara, uygun: i.hucre.uygun });
    }
  });

  it("her ilcenin nufusu yapilandirma/ilce-nufus.json ile ayni (TUIK ADNKS 2025); Gemlik, Gebze, Korfez", () => {
    const v = ilceNufusOku();
    for (const i of m.ilceler) {
      expect(i.nufus, i.kimlik).toBeDefined();
      expect(i.nufus, i.kimlik).toBe(ilceNufusu(i.kimlik, v));
    }
    const nufus = Object.fromEntries(m.ilceler.map((i) => [i.kimlik, i.nufus]));
    expect(nufus).toEqual({ tr_16_gemlik: 124_400, tr_41_gebze: 414_960, tr_41_korfez: 183_077 });
  });

  it("manifest dosyasi kanonik (yeniden bicimlendirme ayni baytlari verir)", () => {
    const ham = readFileSync(IZGARA_MANIFEST_YOLU, "utf8");
    expect(ham).toBe(`${JSON.stringify(JSON.parse(ham), null, 2)}\n`);
    expect(ham.includes("\r")).toBe(false);
  });

  it("serit PMTiles ust verisi yerden/makineden bagimsiz (mutlak yol yok)", () => {
    for (const i of m.ilceler) {
      const a = new YerelPmtiles(resolve(ODBL_DIZINI, i.seritler.yol));
      const meta = JSON.stringify(a.metaveri());
      a.kapat();
      expect(meta, i.kimlik).not.toMatch(/\/(home|tmp|root|Users)\/|[A-Z]:\\/);
    }
  });
});

const hazir = (k: string): boolean => existsSync(karoOnbellekYolu(k)) && existsSync(resolve(ONBELLEK, "osm/idari-tr.json")) && existsSync(TIPPECANOE) && existsSync(PMTILES);

describe.each(["tr_16_gemlik", "tr_41_korfez", "tr_41_gebze"])("%s gercek veri (onbellek varsa)", (kimlik) => {
  it.skipIf(!hazir(kimlik))(
    "iki uretim bayt bayt ayni ve repodaki dosyalarla ayni",
    () => {
      const b = ilceBilgisi(kimlik);
      const bir = ilceIzgarasiUret(b);
      const ikinciDizin = resolve(ONBELLEK, "izgara", `${kimlik}-test-ikinci`);
      const iki = ilceIzgarasiUret(b, { hedef: ikinciDizin });
      rmSync(ikinciDizin, { recursive: true, force: true });
      expect(iki.bhiSha256).toBe(bir.bhiSha256);
      expect(iki.seritSha256).toBe(bir.seritSha256);
      const kayit = m.ilceler.find((i) => i.kimlik === kimlik)!;
      expect(bir.bhiSha256).toBe(kayit.bhi.sha256);
      expect(bir.seritSha256).toBe(kayit.seritler.sha256);
      expect(bir.karo.sha256).toBe(kayit.karo.sha256);
      expect(bir.eksikKaro).toBe(0);
      expect(bir.istatistik.satinAlinabilir).toBe(kayit.hucre.uygun);
    },
    240_000,
  );
});

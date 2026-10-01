/**
 * G6-4 / K-5 ve K-3(a): `mulk.yontemGecersizKilma` etkisizlik kanıtı ve blok yokken no-op (şartname §5.9, §13.1 K-3, K-5; §16.1).
 *
 * `ciktiPpm = 1 000 000` ve blok yok: mülk kipi tohumlu koşu 12 noktada AYNI `durumOzeti` (iki/üç veri kopyası); bölge kipinde 750 000 bile durumu
 * değiştirmez (`ic.mulk` tanımsız); mülk kipinde 750 000 `standart_gida_isleme` çıktısını ×0,75 yapar, girdi aynıdır (birim test).
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { kanonikSerilestir } from "../src/ozet";
import { carpBol } from "../src/sabit";
import { GUN, PPM } from "../src/tipler";
import { g6Dugum, g6Dunya, g6MulkKosusu, g6MulkVeri, g6Veri, mulkParam, ortakKomutluKos, p4Oncesi, G6Yerlestirici } from "./g6-yardimci";

function kilma(v: ReturnType<typeof g6MulkVeri>, deger: Record<string, { ciktiPpm: number }> | null): void {
  const m = mulkParam(v)!;
  if (deger === null) delete m["yontemGecersizKilma"];
  else m["yontemGecersizKilma"] = deger;
}

describe("K-3 (a) ve K-5: blok yokken / kapalıyken mülk kipi tohumlu koşu 12 noktada AYNI durumOzeti", () => {
  for (const tohum of [3, 17]) {
    it(`tohum ${tohum}: blok yok = ciktiPpm 1 000 000 = P4 öncesi içerik (yeni yöntemler veride duruyor ama kullanılmıyor; şebeke YOK)`, () => {
      const blokYok = g6MulkVeri({ sebeke: false, kilma: false });
      const kapali = g6MulkVeri({ sebeke: false, kilma: false }, (v) => kilma(v, { standart_gida_isleme: { ciktiPpm: PPM } }));
      const eski = p4Oncesi(blokYok);
      const adim = 120;
      const a = g6MulkKosusu(blokYok, tohum, adim);
      expect(a).toHaveLength(12);
      expect(g6MulkKosusu(kapali, tohum, adim)).toEqual(a);
      expect(g6MulkKosusu(eski, tohum, adim)).toEqual(a);
    }, 120_000);
  }

  it("blok yokken yeni durum alanları HİÇ yazılmaz (şebeke, yontem, ParaAkisi.sebeke ...)", () => {
    const s = g6Dunya({ veri: g6MulkVeri({ sebeke: false, kilma: false }), kur: (y) => y.yerlestir("gida_fabrikasi") });
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    const metin = kanonikSerilestir(s.dunya);
    expect(metin).not.toContain("sebeke");
    expect(metin).not.toContain("sebekeTuketim");
    expect(JSON.stringify(s.dunya.insaatlar)).not.toContain("yontem");
  });

  it("DUYARLILIK: şebeke açılınca mülk dünyası BİLEREK değişir (santralsiz elektrik girdili tesis verim kazanır): K-3 şebekesiz koşar", () => {
    const yok = g6Dunya({ veri: g6MulkVeri({ sebeke: false, kilma: false }), kur: (y) => y.yerlestir("gida_fabrikasi") });
    const var_ = g6Dunya({ veri: g6MulkVeri({ sebeke: true, kilma: false }), kur: (y) => y.yerlestir("gida_fabrikasi") });
    expect(g6Dugum(yok, "a").tesisler[0]!.verimPpm).toBe(0);
    expect(g6Dugum(var_, "a").tesisler[0]!.verimPpm).toBeGreaterThan(0);
    expect(yok.durumOzeti()).not.toBe(var_.durumOzeti());
  });
});

describe("K-5: bölge kipinde ciktiPpm 750 000 bile durumu değiştirmez (`ic.mulk` tanımsız)", () => {
  it("mini-6, 4 bot + bulanık komut, 3 gün: `standart_gida_isleme` 750 000 ile P4 öncesi aynı tam özet", () => {
    const g = g6Veri(miniVeriyiYukle());
    (mulkParam(g)!["yontemGecersizKilma"] as Record<string, { ciktiPpm: number }>)["standart_gida_isleme"] = { ciktiPpm: 750_000 };
    const eski = p4Oncesi(g);
    const kos = (veri: VeriPaketi) => ortakKomutluKos({ veri, bulanikVeri: eski, tohum: 3, sureMs: 3 * GUN }).durumOzeti();
    expect(kos(g)).toBe(kos(eski));
  }, 120_000);
});

describe("K-5: mülk kipinde ciktiPpm 750 000 çıktıyı ×0,75 yapar; girdi, bakım ve işçi aynı", () => {
  /** santralli tek `standart_gida_isleme` fabrikası: elektrik şebekeden bağımsız (şebeke kapalı). */
  function kos(ciktiPpm: number): { cikti: number; girdi: number } {
    const veri = g6MulkVeri({ sebeke: false }, (v) => kilma(v, { standart_gida_isleme: { ciktiPpm } }));
    const s = g6Dunya({
      veri,
      kur: (y: G6Yerlestirici) => {
        y.yerlestir("santral");
        y.yerlestir("gida_fabrikasi");
      },
    });
    const b = g6Dugum(s, "a");
    const gida = s.ic.malIndeks["gida"]!;
    const tahil = s.ic.malIndeks["tahil"]!;
    return { cikti: b.uretimOrani[gida]!, girdi: b.stoklar[tahil]!.yerelOran };
  }

  it("750 000: gıda üretim oranı = 1 000 000 koşusunun ×0,75'i (±1 yuvarlama), tahıl tüketimi AYNI", () => {
    const tam = kos(PPM);
    const dusuk = kos(750_000);
    expect(tam.cikti).toBeGreaterThan(0);
    expect(Math.abs(dusuk.cikti - carpBol(tam.cikti, 750_000, PPM))).toBeLessThanOrEqual(1);
    expect(dusuk.girdi).toBe(tam.girdi);
  });

  it("yalnız belirtilen yöntem etkilenir: başka yöntem (`degirmen`) için kilma yokken çıktısı değişmez", () => {
    const kosDegirmen = (kilmaDegeri: Record<string, { ciktiPpm: number }> | null) => {
      const veri = g6MulkVeri({ sebeke: false }, (v) => kilma(v, kilmaDegeri));
      const s = g6Dunya({
        veri,
        kur: (y: G6Yerlestirici) => {
          y.yerlestir("santral");
          y.yerlestir("gida_fabrikasi", "degirmen");
        },
      });
      return g6Dugum(s, "a").uretimOrani[s.ic.malIndeks["un"]!]!;
    };
    const taban = kosDegirmen(null);
    expect(taban).toBeGreaterThan(0);
    expect(kosDegirmen({ standart_gida_isleme: { ciktiPpm: 750_000 } })).toBe(taban);
    expect(Math.abs(kosDegirmen({ degirmen: { ciktiPpm: 500_000 } }) - carpBol(taban, 500_000, PPM))).toBeLessThanOrEqual(1);
  });
});


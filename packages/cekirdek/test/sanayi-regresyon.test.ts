/**
 * Sanayi (B2) regresyon kalkanı: sanayi KAPALIYKEN çekirdek Tarım v1 (B2 öncesi) davranışını BİREBİR verir.
 *
 * 1. Altın özetler: B2 öncesi kodla (git: Tarım v1 commit'i) üretilmiş durum özetleri; B2 sonrası kod, B2 öncesi veri
 *    (fikstur-b1: sanayi parametresi, elektrik malı, santral yok) ile aynı özetleri verir.
 * 2. Yeni içerikte sanayi parametresi silinince (yenilikleriKapat) elektrik girdileri, kirlilik, hidro bayrağı ve santral
 *    çıktısı etkisizdir: bunları içerikten tümüyle silmekle aynı özet.
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { GUN } from "../src/tipler";
import { b1Veri, senaryoOzetleri } from "./regresyon-senaryo";
import { sanayiAc, yenilikleriKapat } from "./yenilikler";

/** B2 öncesi kodla (Tarım v1 commit'i, 1f03d4c) üretilmiş altın özetler: 3., 7. ve 12. gün sonu. */
const ALTIN_TOHUM_5 = ["83a4a45a11022b52", "8444be2c7c7e6df0", "455383caeea1946b"];
const ALTIN_TOHUM_6 = ["7fbe6c6bbb502dda", "6ea6a025be72b17f", "5c7aae923be40097"];

describe("regresyon kalkanı: B2 öncesi veri + B2 sonrası kod = B2 öncesi özetler", () => {
  it("tohum 5 ve 6: 3., 7. ve 12. gün özetleri B2 öncesi kodla birebir aynıdır", () => {
    expect(senaryoOzetleri(b1Veri(), 5)).toEqual(ALTIN_TOHUM_5);
    expect(senaryoOzetleri(b1Veri(), 6)).toEqual(ALTIN_TOHUM_6);
  });

  it("fikstürde sanayi yoktur: elektrik malı, santral, sanayi parametresi bulunmaz", () => {
    const v = b1Veri();
    expect(v.param.sanayi).toBeUndefined();
    expect(v.icerik.mallar.some((m) => m.id === "elektrik")).toBe(false);
    expect(v.icerik.tesisTurleri.some((t) => t.id === "santral")).toBe(false);
    // tarım (B1) açık: kalkan yalnız sanayiyi sınar
    expect(v.param.iklim).toBeDefined();
  });

  it("kapalı dünyada sanayi alanları hiç yazılmaz", () => {
    const s = Simulasyon.olustur(b1Veri(), 5);
    s.calistirKadar(3 * GUN);
    for (const b of s.dunya.bolgeler) {
      expect(b.elektrik).toBeUndefined();
      expect(b.kirlilikPpm).toBeUndefined();
      expect(b.kesifSayisi).toBeUndefined();
      expect(b.bakimKarsilanmaPpm).toBeUndefined();
      for (const t of b.tesisler) {
        expect(t.olcek).toBeUndefined();
        expect(t.asinmaPpm).toBeUndefined();
        expect(t.onarimBitis).toBeUndefined();
      }
    }
    expect(s.dunya.kuyruk.some((o) => o.veri.tur === "sondaj_bitti")).toBe(false);
  });
});

describe("yeni içerikte sanayi kapalı: B2 veri alanları etkisizdir", () => {
  function kosu(duzenle?: (v: VeriPaketi) => void): string {
    const v = yenilikleriKapat(miniVeriyiYukle());
    duzenle?.(v);
    const s = Simulasyon.olustur(v, 11);
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman", "m_gecit", "m_dag", "m_sehir"] } });
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_col"] } });
    s.calistirKadar(1 * GUN);
    const r = s.uygula({ t: 1 * GUN, oyuncu: "a", komut: { tur: "tesis_insa", bolge: "m_gecit", tesisTuru: "komur_ocagi" } });
    expect(r.tamam).toBe(true);
    s.calistirKadar(8 * GUN);
    return s.durumOzeti();
  }

  it("elektrik girdisi, kirlilik, hidro bayrağı ve santral çıktısı silinse de özet aynı", () => {
    const tam = kosu();
    const temiz = kosu((v) => {
      for (const y of v.icerik.yontemler) {
        delete y.girdiler["elektrik"];
        delete y.ciktilar["elektrik"];
        delete y.kirlilikPpmSaat;
        delete y.hidro;
      }
    });
    expect(temiz).toBe(tam);
  });

  it("sanayi açıldığında özet değişir (kalkan kapalı modu açık moddan ayırır)", () => {
    const kapali = kosu();
    const acik = kosu((v) => sanayiAc(v));
    expect(acik).not.toBe(kapali);
  });
});

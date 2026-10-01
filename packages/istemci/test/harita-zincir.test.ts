/**
 * Yerleşim uygulama yolu (`yerlesimiUygula`): arsa + yapı HER durumda tek atomik `yapi_yerlestir` işlemidir; birden çok arsa sınıfında hücre başına
 * sınıf `siniflar` ile gider (K4 `yerlestir-cok-sinif`). Atomik komut yoksa arsa alan yerleşim yapılmaz (yarım alım yok); arsasız (yurt) inşaat edilir.
 */
import { describe, expect, it } from "vitest";
import type { MulkBaglantisi } from "../src/harita/baglanti";
import type { YerlesimPlani } from "../src/harita/yapi";
import { yerlesimiUygula } from "../src/harita/zincir";

const ILCE = "tr_41_gebze";

function plan(parseller: Array<{ sinif: "kirsal" | "kasaba" | "sehir"; hucreler: string[]; mili: number; ayrilmis?: number }>, ek: Partial<YerlesimPlani> = {}): YerlesimPlani {
  const hucreler = parseller.flatMap((p) => p.hucreler).map((id) => ({ id }));
  return {
    yapi: { id: "ahir", ad: "Ahır" },
    hucreler,
    alinacak: hucreler.map((h) => h.id),
    parseller,
    arsaMili: parseller.reduce((t, p) => t + p.mili, 0),
    yapiMili: 5_600_000,
    malzeme: [],
    indirimli: true,
    toplamMili: 0,
    hazineYetmez: false,
    gecerli: true,
    neden: null,
    ...ek,
  } as unknown as YerlesimPlani;
}

function sahteBaglanti(atomik: boolean): { b: MulkBaglantisi; komutlar: string[]; istekler: Array<{ sinif: string; siniflar?: string[]; hucreler: string[] }> } {
  const istekler: Array<{ sinif: string; siniflar?: string[]; hucreler: string[] }> = [];
  const komutlar: string[] = [];
  const b = {
    atomikYerlestirme: () => atomik,
    yapiYerlestir: async (i: { sinif: string; siniflar?: string[]; hucreler: string[] }) => {
      istekler.push(i);
      komutlar.push(`yapi_yerlestir:${i.sinif}:${i.hucreler.length}`);
      return { tamam: true, t: 1, hucreler: i.hucreler, toplamMili: 0 };
    },
    parselAl: async (k: { sinif: string; hucreler: string[] }) => {
      komutlar.push(`parsel_al:${k.sinif}:${k.hucreler.length}`);
      return { tamam: true, t: 1, hucreler: k.hucreler, toplamMili: 1_000_000 };
    },
    tesisInsa: async (k: { hucreler: string[] }) => {
      komutlar.push(`tesis_insa_hucre:${k.hucreler.length}`);
      return { tamam: true, t: 1 };
    },
  } as unknown as MulkBaglantisi;
  return { b, komutlar, istekler };
}

describe("yerlesimiUygula: atomik yalnız tek sınıfta", () => {
  it("tek sınıf: tek atomik komut", async () => {
    const { b, komutlar } = sahteBaglanti(true);
    const r = await yerlesimiUygula(b, ILCE, plan([{ sinif: "kasaba", hucreler: ["1:1", "2:1"], mili: 3_500_000 }]));
    expect(r).toMatchObject({ tamam: true, yol: "atomik", gonderilen: 1 });
    expect(komutlar).toEqual(["yapi_yerlestir:kasaba:2"]);
  });

  it("tek sınıf, ayrılmış hücre karışık: yine tek parsel, tek atomik komut (ayrılmış çekirdekte hücre başına ayrılır)", async () => {
    const { b, komutlar } = sahteBaglanti(true);
    const r = await yerlesimiUygula(b, ILCE, plan([{ sinif: "kirsal", hucreler: ["1:1", "2:1"], mili: 2_000_000, ayrilmis: 1 }]));
    expect(r).toMatchObject({ yol: "atomik", gonderilen: 1 });
    expect(komutlar).toEqual(["yapi_yerlestir:kirsal:2"]);
  });

  it("iki sınıf: yine TEK atomik komut; siniflar hücrelerle hizalı (sahip olunan hücre: ilk sınıf), parsel_al gönderilmez", async () => {
    const { b, komutlar, istekler } = sahteBaglanti(true);
    const p = plan([{ sinif: "kirsal", hucreler: ["2:1"], mili: 1_000_000 }, { sinif: "kasaba", hucreler: ["3:1"], mili: 2_000_000 }], {
      hucreler: [{ id: "1:1" }, { id: "2:1" }, { id: "3:1" }] as unknown as YerlesimPlani["hucreler"],
      alinacak: ["2:1", "3:1"],
    });
    const r = await yerlesimiUygula(b, ILCE, p);
    expect(r).toMatchObject({ tamam: true, yol: "atomik", gonderilen: 1, alinan: ["2:1", "3:1"] });
    expect(komutlar).toEqual(["yapi_yerlestir:kirsal:3"]);
    expect(istekler[0]).toMatchObject({ sinif: "kirsal", siniflar: ["kirsal", "kirsal", "kasaba"], hucreler: ["1:1", "2:1", "3:1"] });
  });

  it("tek sınıfta siniflar gönderilmez", async () => {
    const { b, istekler } = sahteBaglanti(true);
    await yerlesimiUygula(b, ILCE, plan([{ sinif: "kasaba", hucreler: ["1:1", "2:1"], mili: 3_500_000 }]));
    expect(istekler[0]).toBeDefined();
    expect("siniflar" in istekler[0]!).toBe(false);
  });

  it("yapı reddedilirse arsa alınmış sayılmaz: alinan boş, 'Hiçbir şey değişmedi' (yarım alım yolu yok)", async () => {
    const { b } = sahteBaglanti(true);
    (b as unknown as { yapiYerlestir: unknown }).yapiYerlestir = async () => ({ tamam: false, hata: "sunucu", mesaj: "Bu yapı 2 hücre kaplar (seçilen 1)." });
    const r = await yerlesimiUygula(b, ILCE, plan([{ sinif: "kirsal", hucreler: ["1:1", "2:1"], mili: 2_000_000 }]));
    expect(r).toMatchObject({ tamam: false, asama: "insa", yol: "atomik", alinan: [], odenenMili: 0, gonderilen: 1 });
    expect(r.mesaj).toBe("Ahır kurulamadı: Bu yapı 2 hücre kaplar (seçilen 1). Hiçbir şey değişmedi.");
  });

  it("atomik komut yoksa arsa alan yerleşim YAPILMAZ (hiç komut gitmez); arsasız yerleşim tesis_insa_hucre ile kurulur", async () => {
    const { b, komutlar } = sahteBaglanti(false);
    const r = await yerlesimiUygula(b, ILCE, plan([{ sinif: "kirsal", hucreler: ["1:1", "2:1"], mili: 2_000_000 }]));
    expect(r).toMatchObject({ tamam: false, gonderilen: 0, alinan: [], neden: "desteklenmiyor" });
    expect(komutlar).toEqual([]);
    const y = await yerlesimiUygula(b, ILCE, plan([], { hucreler: [{ id: "1:1" }, { id: "2:1" }] as unknown as YerlesimPlani["hucreler"], alinacak: [] }));
    expect(y).toMatchObject({ tamam: true, yol: "zincir", gonderilen: 1 });
    expect(komutlar).toEqual(["tesis_insa_hucre:2"]);
  });

  it("kendi hücresi (yurt): arsa adımı yok, tek komut", async () => {
    const { b, komutlar } = sahteBaglanti(true);
    const r = await yerlesimiUygula(b, ILCE, plan([], { hucreler: [{ id: "1:1" }, { id: "2:1" }] as unknown as YerlesimPlani["hucreler"], alinacak: [] }));
    expect(r).toMatchObject({ yol: "atomik", gonderilen: 1 });
    expect(komutlar).toEqual(["yapi_yerlestir:kirsal:2"]);
  });
});

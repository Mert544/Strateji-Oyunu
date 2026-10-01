/**
 * Yerleşim uygulama yolu (`yerlesimiUygula`): arsa + yapı tek atomik `yapi_yerlestir` işlemidir (tek sınıfta); komut yoksa (eski sunucu) zincir.
 * Çok sınıflı yerleşim `siniflar` ile aynı atomik komuta gidecek (K4 `yerlestir-cok-sinif` sonrası; ayrı commit).
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

function sahteBaglanti(atomik: boolean): { b: MulkBaglantisi; komutlar: string[] } {
  const komutlar: string[] = [];
  const b = {
    atomikYerlestirme: () => atomik,
    yapiYerlestir: async (i: { sinif: string; hucreler: string[] }) => {
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
  return { b, komutlar };
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

  it("atomik komut yoksa tek sınıf da zincirdir", async () => {
    const { b, komutlar } = sahteBaglanti(false);
    const r = await yerlesimiUygula(b, ILCE, plan([{ sinif: "kirsal", hucreler: ["1:1", "2:1"], mili: 2_000_000 }]));
    expect(r).toMatchObject({ yol: "zincir", gonderilen: 2 });
    expect(komutlar).toEqual(["parsel_al:kirsal:2", "tesis_insa_hucre:2"]);
  });

  it("kendi hücresi (yurt): arsa adımı yok, tek komut", async () => {
    const { b, komutlar } = sahteBaglanti(true);
    const r = await yerlesimiUygula(b, ILCE, plan([], { hucreler: [{ id: "1:1" }, { id: "2:1" }] as unknown as YerlesimPlani["hucreler"], alinacak: [] }));
    expect(r).toMatchObject({ yol: "atomik", gonderilen: 1 });
    expect(komutlar).toEqual(["yapi_yerlestir:kirsal:2"]);
  });
});

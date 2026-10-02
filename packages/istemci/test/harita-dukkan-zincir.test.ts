/** Dükkân kurulumu komut yolu (`zincir.ts`): tür komuta girer, türsüz gönderilmez, başka yapıda tür eklenmez. Saf; sahte bağdaştırıcı. */
import { describe, expect, it } from "vitest";
import type { MulkBaglantisi, YerlestirIstegi } from "../src/harita/baglanti";
import type { YerlesimPlani } from "../src/harita/yapi";
import { yerlesimiUygula } from "../src/harita/zincir";

const plan = (id: string, ad: string, alinacak: string[] = []): YerlesimPlani =>
  ({
    yapi: { id, ad },
    hucreler: [{ id: "1:1" }],
    alinacak,
    parseller: alinacak.length ? [{ sinif: "kirsal", hucreler: alinacak, mili: 1_000 }] : [],
    arsaMili: alinacak.length ? 1_000 : 0,
    yapiMili: 12_000_000,
  }) as unknown as YerlesimPlani;

function sahte(atomik: boolean) {
  const yerlestirilen: YerlestirIstegi[] = [];
  const insa: unknown[] = [];
  const b = {
    atomikYerlestirme: () => atomik,
    yapiYerlestir: async (i: YerlestirIstegi) => {
      yerlestirilen.push(i);
      return { tamam: true as const, t: 1 };
    },
    tesisInsa: async (k: unknown) => {
      insa.push(k);
      return { tamam: true as const, t: 1 };
    },
  } as unknown as MulkBaglantisi;
  return { b, yerlestirilen, insa };
}

describe("dükkân kurulum komutu", () => {
  it("atomik yol: dukkanTuru isteğe girer", async () => {
    const s = sahte(true);
    const r = await yerlesimiUygula(s.b, "ilce", plan("dukkan", "Dükkân", ["1:1"]), "bakkal");
    expect(r.tamam).toBe(true);
    expect(s.yerlestirilen[0]).toMatchObject({ tesisTuru: "dukkan", dukkanTuru: "bakkal" });
    expect(r.mesaj).toMatch(/^Dükkân kuruluyor: arsa 1 hücre/);
  });

  it("arsasız yol (atomik komut yok): tesis_insa_hucre komutuna dukkanTuru girer", async () => {
    const s = sahte(false);
    const r = await yerlesimiUygula(s.b, "ilce", plan("dukkan", "Dükkân"), "firin");
    expect(r.tamam).toBe(true);
    expect(s.insa[0]).toMatchObject({ tur: "tesis_insa_hucre", tesisTuru: "dukkan", dukkanTuru: "firin" });
  });

  it("tür seçilmemişse hiçbir komut gönderilmez; ret metni D2.tur_gerekli", async () => {
    const s = sahte(true);
    const r = await yerlesimiUygula(s.b, "ilce", plan("dukkan", "Dükkân"));
    expect(r.tamam).toBe(false);
    expect(r.gonderilen).toBe(0);
    expect(r.mesaj).toBe("Bir dükkân türü seç. Hiçbir şey değişmedi.");
    expect(s.yerlestirilen).toHaveLength(0);
    expect(s.insa).toHaveLength(0);
  });

  it("başka yapıda dukkanTuru eklenmez (verilse bile)", async () => {
    const s = sahte(true);
    await yerlesimiUygula(s.b, "ilce", plan("ciftlik", "Çiftlik"), "bakkal");
    expect(s.yerlestirilen[0]).not.toHaveProperty("dukkanTuru");
  });
});

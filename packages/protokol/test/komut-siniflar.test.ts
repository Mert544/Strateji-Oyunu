/**
 * `yapi_yerlestir.siniflar` (hücre başına arsa sınıfı; yalnız ekleme, isteğe bağlı): yeni alan geçer ve aynen döner, eski (alansız) komut aynen
 * kabul edilir, eski istemci şeması (dondurulmuş kopya) yeni komutu REDDETMEZ (alan atılır), geçersiz değerler reddedilir.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { KomutSemasi, istemciMesajiCoz } from "../src/index";

const temel = { tur: "yapi_yerlestir", ilce: "tr_41_gebze", tesisTuru: "ciftlik", hucreler: ["1:1", "2:1"], sinif: "kirsal" } as const;

/** Entegrasyon d13ba4a'daki `yapi_yerlestir` şemasının DONDURULMUŞ kopyası (siniflar alanı yok). */
const eskiYapiYerlestir = z.object({
  tur: z.literal("yapi_yerlestir"),
  ilce: z.string().min(1).max(64),
  tesisTuru: z.string().min(1).max(64),
  hucreler: z.array(z.string().min(1).max(64)).max(5),
  sinif: z.enum(["kirsal", "kasaba", "sehir"]),
  olcek: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  yontem: z.string().min(1).max(64).optional(),
});

describe("yapi_yerlestir siniflar (yalnız ekleme)", () => {
  it("alansız eski komut aynen kabul edilir ve aynen döner (alan eklenmez)", () => {
    expect(KomutSemasi.parse(temel)).toEqual(temel);
    expect("siniflar" in KomutSemasi.parse(temel)).toBe(false);
  });

  it("siniflar verilince kabul edilir ve aynen döner (olcek ve yontem ile birlikte de)", () => {
    const yeni = { ...temel, siniflar: ["kasaba", "kirsal"] };
    expect(KomutSemasi.parse(yeni)).toEqual(yeni);
    const tam = { ...yeni, olcek: 1, yontem: "degirmen" };
    expect(KomutSemasi.parse(tam)).toEqual(tam);
    const z = istemciMesajiCoz(JSON.stringify({ tur: "komut", anahtar: "k1", komut: yeni }));
    expect(z.tamam && z.mesaj.tur === "komut" && (z.mesaj.komut as { siniflar?: string[] }).siniflar).toEqual(["kasaba", "kirsal"]);
  });

  it("GERIYE UYUM: dondurulmuş eski şema yeni komutu reddetmez (siniflar sessizce atılır); eski komut eski şemada aynen geçer", () => {
    const yeni = JSON.parse(JSON.stringify({ ...temel, siniflar: ["kasaba", "kirsal"] })) as unknown;
    const r = eskiYapiYerlestir.safeParse(yeni);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual(temel);
    expect(eskiYapiYerlestir.parse(temel)).toEqual(temel);
    expect(KomutSemasi.parse(temel)).toEqual(eskiYapiYerlestir.parse(temel));
  });

  it("geçersiz değerler reddedilir: dizi olmayan, bilinmeyen sınıf, dizi olmayan öğe, 5'ten uzun", () => {
    for (const kotu of ["kirsal", null, 1, {}, ["saray"], [1], [null], ["kirsal", "kirsal", "kirsal", "kirsal", "kirsal", "kirsal"]]) {
      expect(KomutSemasi.safeParse({ ...temel, siniflar: kotu }).success, `siniflar=${JSON.stringify(kotu)}`).toBe(false);
    }
  });

  it("başka komutlara siniflar eklenmez: parsel_al ve tesis_insa_hucre'de fazla alan atılır", () => {
    expect("siniflar" in KomutSemasi.parse({ tur: "parsel_al", ilce: "i", hucreler: ["1:1"], sinif: "kirsal", siniflar: ["kirsal"] })).toBe(false);
    expect("siniflar" in KomutSemasi.parse({ tur: "tesis_insa_hucre", ilce: "i", tesisTuru: "t", hucreler: ["1:1"], siniflar: ["kirsal"] })).toBe(false);
  });
});

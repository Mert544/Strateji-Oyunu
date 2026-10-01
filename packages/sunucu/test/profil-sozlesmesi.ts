/**
 * Profil deposu sözleşmesi: bellek, dosya ve pg depoları AYNI davranışı verir (kısmi çapa yazımı, idempotans, ömür 30 sim-günü,
 * halka 200). Her çağrı ayrı bir depo (pg'de ayrı dünya) ister.
 */
import { expect } from "vitest";
import type { Depo, OzetKaydi } from "../src/depo/tipler";
import { OZET_KAYIT_OMRU_MS, OZET_KAYIT_TAVANI } from "../src/depo/tipler";

const kayit = (t: number, sira: number, tur: OzetKaydi["tur"] = "insaat_bitti"): OzetKaydi => ({ t, tur, ilce: "i", degerler: ["x", 1], sira });

export async function profilSozlesmesi(depo: Depo): Promise<void> {
  const p = depo.profil as NonNullable<Depo["profil"]>;
  expect(await p.capaOku("ali")).toBeNull();
  expect(await p.kayitOku("ali")).toEqual([]);
  // Çapa kısmi yazım: diğer alanlar korunur.
  const sg = { t: 5, hazine: 7, defter: { brutIhracat: 1, brutIthalat: 2, komisyon: 3, prim: 4 }, stok: { a: 1 }, uretim: { a: 2 } };
  await p.capaYaz("ali", { sonGorulen: sg });
  await p.capaYaz("ali", { ozetOkunduT: 9 });
  expect(await p.capaOku("ali")).toEqual({ sonGorulen: sg, ozetOkunduT: 9 });
  // İdempotans: aynı anahtar bir kez.
  expect(await p.kayitEkle("ali", [kayit(100, 1), kayit(100, 2), kayit(50, 1)], 100)).toBe(3);
  expect(await p.kayitEkle("ali", [kayit(100, 1), kayit(60, 1)], 100)).toBe(1);
  expect((await p.kayitOku("ali")).map((k) => [k.t, k.sira])).toEqual([[50, 1], [60, 1], [100, 1], [100, 2]]);
  // Başka oyuncu ayrı.
  expect(await p.kayitOku("veli")).toEqual([]);
  // Ömür: 30 sim-günden eski atılır.
  await p.kayitEkle("ali", [kayit(OZET_KAYIT_OMRU_MS + 200, 9)], OZET_KAYIT_OMRU_MS + 200);
  expect((await p.kayitOku("ali")).map((k) => k.t)).toEqual([OZET_KAYIT_OMRU_MS + 200]);
  // Halka: ≤ 200, en eski önce atılır.
  const cok = Array.from({ length: 260 }, (_, i) => kayit(OZET_KAYIT_OMRU_MS + 1000 + i, 100 + i));
  await p.kayitEkle("veli", cok, OZET_KAYIT_OMRU_MS + 2000);
  const l = await p.kayitOku("veli");
  expect(l).toHaveLength(OZET_KAYIT_TAVANI);
  expect(l[0]?.sira).toBe(160);
  expect(l.at(-1)?.sira).toBe(359);
  // Damgalar (Esnaf Defteri): (oyuncu, kavram) idempotent, ilk yazim kazanir; t'ye gore sirali; oyuncular ayri.
  expect(await p.damgaOku("ali")).toEqual([]);
  expect(await p.damgaEkle("ali", [{ kavram: "ilk_yapi", t: 7_200_000, kaynak: "odul" }, { kavram: "ilk_parsel", t: 3_600_000, kaynak: "damga" }])).toBe(2);
  expect(await p.damgaEkle("ali", [{ kavram: "ilk_yapi", t: 9_999, kaynak: "damga" }, { kavram: "ilk_uretim", t: 7_200_000, kaynak: "damga" }])).toBe(1);
  expect(await p.damgaOku("ali")).toEqual([
    { kavram: "ilk_parsel", t: 3_600_000, kaynak: "damga" },
    { kavram: "ilk_uretim", t: 7_200_000, kaynak: "damga" },
    { kavram: "ilk_yapi", t: 7_200_000, kaynak: "odul" },
  ]);
  expect(await p.damgaOku("veli")).toEqual([]);
  expect(await p.damgaEkle("ali", [])).toBe(0);
  await p.esitle();
}

/** Kamu arsası şeması (docs/06 §15.6): fikstürde `kamu` hücre işareti ve `mahalleler`, parametrede `mulk.kamu`. */
import { describe, expect, it } from "vitest";
import { ParametreSema, dogrulaParselFiksturu, miniVeriyiYukle, parselFiksturuYukle } from "../src/index";
import type { DogrulamaSonucu, ParselFiksturu } from "../src/index";

const kopya = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const hatalar = (s: DogrulamaSonucu): string[] => (s.gecerli ? [] : s.hatalar);
const ilk = (f: ParselFiksturu) => f.ilceler[0]!;

describe("fikstür: kamu işareti ve mahalleler", () => {
  it("işaretsiz fikstürler (mevcut dosyalar) geçerlidir; işaret ve mahalle isteğe bağlıdır", () => {
    expect(dogrulaParselFiksturu(parselFiksturuYukle("mini-6")).gecerli).toBe(true);
    const f = kopya(parselFiksturuYukle("mini-6"));
    const uygun = ilk(f).hucreler.filter((h) => h.uygun);
    uygun[0]!.kamu = "meydan";
    uygun[1]!.kamu = "hazine";
    ilk(f).mahalleler = [{ id: "mh_a", ad: "A", hucreler: [uygun[0]!.id, uygun[2]!.id] }];
    expect(hatalar(dogrulaParselFiksturu(f))).toEqual([]);
  });

  it("kamu işareti yalnız uygun hücrede; bilinmeyen tür şemadan geçmez", () => {
    const f = kopya(parselFiksturuYukle("mini-6"));
    const uygunDegil = ilk(f).hucreler.find((h) => !h.uygun)!;
    uygunDegil.kamu = "park";
    expect(hatalar(dogrulaParselFiksturu(f)).join("|")).toMatch(/kamu isaretli hucre .* uygun olmali/);
    const g = kopya(parselFiksturuYukle("mini-6"));
    (ilk(g).hucreler[0] as { kamu?: string }).kamu = "yok_tur";
    expect(dogrulaParselFiksturu(g).gecerli).toBe(false);
  });

  it("mahalle: ilçede olmayan hücre, bir hücre iki mahallede, yinelenen mahalle kimliği (ilçeler arası dahil), boş mahalle", () => {
    const f = kopya(parselFiksturuYukle("mini-6"));
    const [c0, c1] = f.ilceler as [ParselFiksturu["ilceler"][number], ParselFiksturu["ilceler"][number]];
    c0.mahalleler = [{ id: "mh_a", ad: "A", hucreler: [c1.hucreler[0]!.id] }];
    expect(hatalar(dogrulaParselFiksturu(f)).join("|")).toMatch(/ilcede olmayan hucre/);
    c0.mahalleler = [
      { id: "mh_a", ad: "A", hucreler: [c0.hucreler[0]!.id] },
      { id: "mh_b", ad: "B", hucreler: [c0.hucreler[0]!.id] },
    ];
    expect(hatalar(dogrulaParselFiksturu(f)).join("|")).toMatch(/birden cok mahallede/);
    c0.mahalleler = [{ id: "mh_a", ad: "A", hucreler: [c0.hucreler[0]!.id] }];
    c1.mahalleler = [{ id: "mh_a", ad: "A2", hucreler: [c1.hucreler[0]!.id] }];
    expect(hatalar(dogrulaParselFiksturu(f)).join("|")).toMatch(/yinelenen mahalle kimligi/);
    c1.mahalleler = [{ id: "mh_c", ad: "C", hucreler: [] }];
    expect(dogrulaParselFiksturu(f).gecerli).toBe(false);
  });
});

describe("parametre: mulk.kamu", () => {
  const ham = (): Record<string, unknown> => kopya(miniVeriyiYukle().param) as unknown as Record<string, unknown>;

  it("varsayılan parametreler kamu bloğunu taşır: paket 5+7+8, %4 hazine, merkez 10, kıyı 2", () => {
    const k = miniVeriyiYukle().param.mulk!.kamu!;
    expect(k.mahallePaketi).toEqual([
      { tur: "meydan", hucre: 5 },
      { tur: "pazar", hucre: 7 },
      { tur: "park", hucre: 8 },
    ]);
    expect([k.hazineRezerviPpm, k.ilceMerkeziHucre, k.kiyiDerinlik]).toEqual([40_000, 10, 2]);
    expect(k.oyuncuyaKapaliYapilar).toEqual(["muhtarlik"]);
  });

  it("blok isteğe bağlıdır (yoksa kamu kuralı kapalı); bilinmeyen alan, geçersiz tür ve ondalık sayı reddedilir", () => {
    const p = ham();
    delete (p.mulk as { kamu?: unknown }).kamu;
    expect(ParametreSema.safeParse(p).success).toBe(true);
    const a = ham();
    (a.mulk as { kamu: Record<string, unknown> }).kamu.fazla = 1;
    expect(ParametreSema.safeParse(a).success).toBe(false);
    const b = ham();
    (b.mulk as { kamu: { mahallePaketi: { tur: string }[] } }).kamu.mahallePaketi[0]!.tur = "yok";
    expect(ParametreSema.safeParse(b).success).toBe(false);
    const c = ham();
    (c.mulk as { kamu: { hazineRezerviPpm: number } }).kamu.hazineRezerviPpm = 0.5;
    expect(ParametreSema.safeParse(c).success).toBe(false);
    const d = ham();
    (d.mulk as { kamu: { hazineRezerviPpm: number } }).kamu.hazineRezerviPpm = 2_000_000;
    expect(ParametreSema.safeParse(d).success).toBe(false);
  });
});

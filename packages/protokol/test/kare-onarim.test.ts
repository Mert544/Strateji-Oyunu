/** O1: doğal aşınmış iki kendi tesisinde görülen teklif, gerçek ödeme ve onarım kuyruğu. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { DAKIKA, GUN, SAAT, genelOnarimGorunumu } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikHazine, anlikMiktar } from "../../cekirdek/src/stok";
import { bitisikGrup, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, KomutSemasi, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const TOHUM = 89, ILCE = "sn_m_col_merkez", BOLGE = "sn_m_col#a";
const dugum = (s: SimT) => s.dunya.bolgeler.find((b) => b.id === BOLGE)!;
const miktar = (s: SimT, mal: string) => anlikMiktar(dugum(s).stoklar[s.ic.malIndeks[mal]!]!, s.dunya.zaman);
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});
const gorunum = (s: SimT) => genelOnarimGorunumu(s.dunya, s.ic, "a", BOLGE)!;

function kur(): { s: SimT; v: CekirdekVeriPaketi } {
  const v = mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 500_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 500_000, parca: 2_000_000, gida: 2_000_000 };
    v.param.mulk!.kamuSiparis!.etkin = false;
  });
  const s = mulkSim(["a", "b"], v, TOHUM), f = parselFiksturuYukle("mini-6");
  for (const kume of [0, 1]) tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, sinif: "kirsal", tesisTuru: "silis_ocagi", hucreler: bitisikGrup(f, ILCE, "kirsal", 2, kume) });
  s.calistirKadar(Math.max(...s.dunya.insaatlar.map((i) => i.bitis)));
  tamam(s, "a", { tur: "bakim_duzeyi", duzey: 0, oncekiDuzey: 1 });
  s.calistirKadar(GUN + DAKIKA);
  expect(dugum(s).tesisler).toHaveLength(2);
  for (const t of dugum(s).tesisler) expect(t.asinmaPpm).toBeGreaterThan(0);
  tamam(s, "a", { tur: "tesis_durum", bolge: BOLGE, tesis: dugum(s).tesisler[1]!.id, aktif: false, oncekiAktif: true });
  s.calistirKadar(s.dunya.zaman);
  return { s, v };
}

function retDegismez(s: SimT, o: string, k: Komut, neden?: RegExp): void {
  s.calistirKadar(s.dunya.zaman);
  const once = dunyaSerilestir(s.dunya), gunluk = structuredClone(s.gunluk);
  const r = ver(s, o, k);
  expect(r.tamam).toBe(false);
  if (!r.tamam && neden) expect(r.hata).toMatch(neden);
  expect(dunyaSerilestir(s.dunya)).toBe(once);
  expect(s.gunluk).toEqual(gunluk);
}

function kopyala(s: SimT, v: CekirdekVeriPaketi): SimT {
  const x = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
  expect(x.durumOzeti()).toBe(s.durumOzeti());
  expect(x.dunya.kuyruk).toEqual(s.dunya.kuyruk);
  return x;
}

describe("O1 görülen genel onarım", () => {
  it("O1 doğal aşınma: frozen teklif iki own hedefi kapsar, paused da onarılır; para/mal birkez ödenir, gerçek duruş ve save/legacy/replay korunur", () => {
    const { s, v } = kur(), b = dugum(s), silis = s.ic.malIndeks.silis!;
    expect(b.uretimOrani[silis]).toBeGreaterThan(0);
    const quoteOncesi = dunyaSerilestir(s.dunya), q = gorunum(s).teklif!;
    expect(dunyaSerilestir(s.dunya)).toBe(quoteOncesi);
    expect(q.tesisler.map((t) => t.tesis)).toEqual(b.tesisler.map((t) => t.id));
    expect(q.paraMili).toBe(2_400_000);
    expect(q.mal).toEqual([["celik", 12_000], ["parca", 4_000]]);
    expect(q.durusMs).toBe(6 * SAAT);
    const k: Komut = { tur: "genel_onarim", bolge: BOLGE, gorulenTeklif: q };
    expect(KomutSemasi.parse(k)).toEqual(k);
    retDegismez(s, "b", k);
    retDegismez(s, "a", { ...k, gorulenTeklif: { ...q, paraMili: q.paraMili + 1 } }, /onarim teklifi degisti/);
    const bozuk = { ...k, gorulenTeklif: { ...q, mal: [["celik", -1]] } } as unknown as Komut;
    expect(KomutSemasi.safeParse(bozuk).success).toBe(false);
    retDegismez(s, "a", bozuk, /gecersiz onarim teklifi/);
    const oz = kare(s, "a").bolgeler.find((x) => x.id === BOLGE)!.ozel!;
    expect(oz.onarim).toEqual(gorunum(s));
    for (const o of ["b", null]) expect(kare(s, o).bolgeler.find((x) => x.id === BOLGE)!.ozel).toBeUndefined();
    const legacy = kopyala(s, v), hazine = anlikHazine(s.dunya, "a"), mal = q.mal.map(([m]) => [m, miktar(s, m)] as const);
    tamam(s, "a", k);
    tamam(legacy, "a", { tur: "genel_onarim", bolge: BOLGE });
    expect(hazine - anlikHazine(s.dunya, "a")).toBe(q.paraMili);
    for (const [m, once] of mal) expect(once - miktar(s, m)).toBe(q.mal.find(([id]) => id === m)![1]);
    s.calistirKadar(s.dunya.zaman); legacy.calistirKadar(legacy.dunya.zaman);
    expect(legacy.durumOzeti()).toBe(s.durumOzeti());
    const bitis = s.dunya.zaman + q.durusMs;
    expect(gorunum(s).suruyor).toEqual({ bitis, tesisler: q.tesisler.map((t) => t.tesis) });
    for (const t of b.tesisler) { expect(t.asinmaPpm).toBe(0); expect(t.onarimBitis).toBe(bitis); }
    expect(b.tesisler.map((t) => t.aktif)).toEqual([true, false]);
    expect(b.uretimOrani[silis]).toBe(0);
    retDegismez(s, "a", k, /onarim suruyor/);
    s.calistirKadar(s.dunya.zaman + SAAT); legacy.calistirKadar(s.dunya.zaman);
    const yuklenen = kopyala(s, v);
    for (const y of [s, legacy, yuklenen]) {
      y.calistirKadar(bitis - 1);
      expect(dugum(y).uretimOrani[silis]).toBe(0);
      y.calistirKadar(bitis);
      expect(dugum(y).uretimOrani[silis]).toBeGreaterThan(0);
      expect(dugum(y).tesisler.map((t) => t.aktif)).toEqual([true, false]);
      for (const t of dugum(y).tesisler) expect(t.onarimBitis).toBeUndefined();
      expect(gorunum(y).suruyor).toBeUndefined();
      expect(y.dunya.insaatlar.some((i) => i.tur === "onarim")).toBe(false);
    }
    expect(yuklenen.durumOzeti()).toBe(s.durumOzeti());
    expect(legacy.durumOzeti()).toBe(s.durumOzeti());
    const r = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk);
    r.calistirKadar(s.dunya.zaman);
    expect(r.durumOzeti()).toBe(s.durumOzeti());
    expect(IlgiKaresiSemasi.parse(kare(s, "a"))).toEqual(kare(s, "a"));
  });
});

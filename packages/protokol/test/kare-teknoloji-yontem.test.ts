/** T1–T2: gerçek araştırma→kendi tesisinin yöntemi, görülen bedel/yöntem ve eski çağrı. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { PPM, teknolojiYayilimiPpm } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikHazine } from "../../cekirdek/src/stok";
import { yontemAcikMi } from "../../cekirdek/src/teknoloji";
import { bitisikGrup, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, KomutSemasi, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const TOHUM = 73, ILCE = "sn_m_ova_merkez", TEK = "mekanize_tarim", ONCEKI = "geleneksel_tarim";
const dugum = (s: SimT, o = "a") => s.dunya.bolgeler.find((b) => b.id === `sn_m_ova#${o}`)!;
const tesis = (s: SimT, o = "a") => dugum(s, o).tesisler.find((t) => s.ic.tesisTurleri[t.tur]!.id === "ciftlik")!;
const oyuncu = (s: SimT, o = "a") => s.dunya.oyuncular.find((y) => y.id === o)!;
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});
const bedel = (s: SimT, o = "a") => Math.floor(s.ic.teknolojiler[s.ic.teknolojiIndeks[TEK]!]!.maliyet * teknolojiYayilimiPpm(s.dunya, s.baglam, o, s.ic.teknolojiIndeks[TEK]!) / PPM);
const degistir = (s: SimT, yontem = TEK, oncekiYontem: string | null = ONCEKI): Komut => ({ tur: "yontem_degistir", bolge: dugum(s).id, tesis: tesis(s).id, yontem, ...(oncekiYontem === null ? {} : { oncekiYontem }) });

function kur(): { s: SimT; v: CekirdekVeriPaketi } {
  const f = parselFiksturuYukle("mini-6");
  const v = mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 500_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 500_000, parca: 1_000_000, yakit: 500_000, gida: 100_000, tahil: 50_000 };
    v.param.mulk!.kamuSiparis!.etkin = false;
  });
  const s = mulkSim(["a", "b"], v, TOHUM);
  for (const [i, o] of ["a", "b"].entries()) {
    const hucreler = bitisikGrup(f, ILCE, "kirsal", 2, i);
    tamam(s, o, { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" });
    tamam(s, o, { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler });
  }
  s.calistirKadar(Math.max(...s.dunya.insaatlar.map((i) => i.bitis)));
  expect(s.ic.yontemler[tesis(s).yontem]!.id).toBe(ONCEKI);
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

describe("T1–T2 araştırmadan yöntem kararına", () => {
  it("gerçek araştırma bedeli bir kez düşer; kayıt ortasında yükleme, bitişte kilidin açılması ve açıkça onaylanan yöntem gerçek tesise yansır", () => {
    const { s, v } = kur(), ti = s.ic.teknolojiIndeks[TEK]!, yi = s.ic.yontemIndeks[TEK]!;
    expect(yontemAcikMi(s.dunya, s.baglam, "a", yi)).toBe(false);
    retDegismez(s, "a", degistir(s), /yontem acik degil/);
    const maliyet = bedel(s), hazine = anlikHazine(s.dunya, "a"), lavabo = s.dunya.mulk!.para!.lavabo.arastirma.n;
    tamam(s, "a", { tur: "arastir", teknoloji: TEK, maliyetMili: maliyet });
    expect(hazine - anlikHazine(s.dunya, "a")).toBe(maliyet);
    expect(s.dunya.mulk!.para!.lavabo.arastirma.n - lavabo).toBe(maliyet);
    const arastirma = oyuncu(s).arastirma!;
    expect(arastirma.teknoloji).toBe(ti);
    expect(s.dunya.kuyruk.some((o) => o.t === arastirma.bitis && o.veri.tur === "arastirma_bitti" && o.veri.oyuncu === "a")).toBe(true);
    expect(kare(s, "a").oyuncu!.arastirma).toEqual(arastirma);
    s.calistirKadar(Math.floor((s.dunya.zaman + arastirma.bitis) / 2));
    const x = kopyala(s, v);
    for (const y of [s, x]) {
      y.calistirKadar(arastirma.bitis - 1);
      expect(yontemAcikMi(y.dunya, y.baglam, "a", yi)).toBe(false);
      retDegismez(y, "a", degistir(y), /yontem acik degil/);
      y.calistirKadar(arastirma.bitis);
      expect(oyuncu(y).arastirma).toBeNull();
      expect(oyuncu(y).teknolojiler).toContain(ti);
      expect(oyuncu(y, "b").teknolojiler).not.toContain(ti);
      expect(yontemAcikMi(y.dunya, y.baglam, "a", yi)).toBe(true);
      expect(y.ic.yontemler[tesis(y).yontem]!.id).toBe(ONCEKI); // Açılması tesisi otomatik dönüştürmez.
      retDegismez(y, "b", degistir(y));
      const nakit = anlikHazine(y.dunya, "a"), aBedeli = y.dunya.mulk!.para!.lavabo.arastirma.n;
      tamam(y, "a", degistir(y));
      expect(anlikHazine(y.dunya, "a")).toBe(nakit); // Yöntem geçişi ücretsizdir.
      expect(tesis(y).yontem).toBe(yi);
      expect(y.dunya.mulk!.para!.lavabo.arastirma.n).toBe(aBedeli);
      retDegismez(y, "a", { tur: "arastir", teknoloji: TEK, maliyetMili: maliyet }, /zaten acik/);
      y.calistirKadar(y.dunya.zaman);
      expect(dugum(y).yakitTedariki!.tuketimMiliSaat).toBeGreaterThan(0);
      expect(dugum(y).uretimOrani[y.ic.malIndeks.tahil!]!).toBeGreaterThan(0);
      const ozel = kare(y, "a").bolgeler.find((b) => b.id === dugum(y).id)!.ozel!;
      expect(ozel.tesisler.find((t) => t[0] === tesis(y).id)![2]).toBe(yi);
      expect(kare(y, "b").bolgeler.find((b) => b.id === dugum(y).id)!.ozel).toBeUndefined();
      expect(kare(y, null).bolgeler.find((b) => b.id === dugum(y).id)!.ozel).toBeUndefined();
    }
    expect(x.durumOzeti()).toBe(s.durumOzeti());
    const r = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk);
    r.calistirKadar(s.dunya.zaman);
    expect(r.durumOzeti()).toBe(s.durumOzeti());
    expect(IlgiKaresiSemasi.parse(kare(s, "a"))).toEqual(kare(s, "a"));
  });

  it("gerçek yayılım sonrası eski görülen bedel ve önceki yöntem reddedilir; geçersiz guardlar saf reddir, eski alan taşımayan komut aynı davranır", () => {
    const { s, v } = kur(), eskiBedel = bedel(s);
    tamam(s, "b", { tur: "arastir", teknoloji: TEK }); // Eski istemci çağrısı hâlâ geçerli.
    s.calistirKadar(oyuncu(s, "b").arastirma!.bitis);
    const yeniBedel = bedel(s);
    expect(yeniBedel).toBeLessThan(eskiBedel);
    retDegismez(s, "a", { tur: "arastir", teknoloji: TEK, maliyetMili: eskiBedel }, /arastirma maliyeti degisti/);
    expect(KomutSemasi.safeParse({ tur: "arastir", teknoloji: TEK, maliyetMili: 0 }).success).toBe(true);
    retDegismez(s, "a", { tur: "arastir", teknoloji: TEK, maliyetMili: 0 }, /arastirma maliyeti degisti/); // Sıfır alanı yokluk sayılmaz.
    for (const kotu of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
      const k = { tur: "arastir", teknoloji: TEK, maliyetMili: kotu } as const;
      expect(KomutSemasi.safeParse(k).success).toBe(false);
      retDegismez(s, "a", k, /gecersiz arastirma maliyeti/);
    }
    expect(KomutSemasi.parse({ tur: "arastir", teknoloji: TEK, maliyetMili: yeniBedel })).toEqual({ tur: "arastir", teknoloji: TEK, maliyetMili: yeniBedel });
    expect(KomutSemasi.parse({ tur: "arastir", teknoloji: TEK })).toEqual({ tur: "arastir", teknoloji: TEK });
    const legacy = kopyala(s, v), hazine = anlikHazine(s.dunya, "a");
    tamam(s, "a", { tur: "arastir", teknoloji: TEK, maliyetMili: yeniBedel });
    tamam(legacy, "a", { tur: "arastir", teknoloji: TEK });
    expect(hazine - anlikHazine(s.dunya, "a")).toBe(yeniBedel);
    expect(legacy.durumOzeti()).toBe(s.durumOzeti());
    const bitis = oyuncu(s).arastirma!.bitis;
    s.calistirKadar(bitis); legacy.calistirKadar(bitis);
    for (const kotu of ["", null, 42]) {
      const k = { ...degistir(s), oncekiYontem: kotu } as unknown as Komut;
      expect(KomutSemasi.safeParse(k).success).toBe(false);
      retDegismez(s, "a", k, /gecersiz onceki yontem/);
    }
    tamam(s, "a", degistir(s));
    expect(KomutSemasi.parse(degistir(legacy, TEK, null))).not.toHaveProperty("oncekiYontem");
    tamam(legacy, "a", degistir(legacy, TEK, null));
    s.calistirKadar(bitis); legacy.calistirKadar(bitis);
    expect(legacy.durumOzeti()).toBe(s.durumOzeti());
    retDegismez(s, "a", degistir(s, ONCEKI, ONCEKI), /tesisin yontemi degisti/);
    const nakit = anlikHazine(s.dunya, "a");
    tamam(s, "a", degistir(s, ONCEKI, TEK));
    tamam(legacy, "a", degistir(legacy, ONCEKI, null));
    expect(anlikHazine(s.dunya, "a")).toBe(nakit);
    s.calistirKadar(bitis); legacy.calistirKadar(bitis);
    expect(s.ic.yontemler[tesis(s).yontem]!.id).toBe(ONCEKI);
    expect(legacy.durumOzeti()).toBe(s.durumOzeti());
    expect(KomutSemasi.parse({ tur: "yontem_degistir", bolge: dugum(s).id, tesis: tesis(s).id, yontem: TEK, oncekiYontem: ONCEKI })).toEqual(degistir(s));
  });
});

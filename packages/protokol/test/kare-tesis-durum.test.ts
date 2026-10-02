/** S3: gerçek üretim tesisini durdur/başlat, bakım ve görülen aktif durum koruması. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { DAKIKA } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikMiktar } from "../../cekirdek/src/stok";
import { bitisikGrup, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, KomutSemasi, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const TOHUM = 83, ILCE = "sn_m_ova_merkez", BOLGE = "sn_m_ova#a";
const dugum = (s: SimT) => s.dunya.bolgeler.find((b) => b.id === BOLGE)!;
const tesis = (s: SimT) => dugum(s).tesisler.find((t) => s.ic.yontemler[t.yontem]!.id === "ekmek_firini")!;
const stok = (s: SimT, mal: string) => dugum(s).stoklar[s.ic.malIndeks[mal]!]!;
const miktar = (s: SimT, mal: string) => anlikMiktar(stok(s, mal), s.dunya.zaman);
const komut = (s: SimT, aktif: boolean, oncekiAktif?: boolean): Komut => ({ tur: "tesis_durum", bolge: BOLGE, tesis: tesis(s).id, aktif, ...(oncekiAktif === undefined ? {} : { oncekiAktif }) });
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});

function kur(): { s: SimT; v: CekirdekVeriPaketi } {
  const v = mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 500_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 500_000, parca: 2_000_000, gida: 2_000_000, un: 2_000_000, yakit: 2_000_000 };
    v.param.mulk!.kamuSiparis!.etkin = false;
    v.param.nufus.tuketim1000Saat.yakit = 0;
    for (const m of v.icerik.mallar) if (["un", "parca", "yakit"].includes(m.id)) m.bozulmaPpmGun = 0;
  });
  const s = mulkSim(["a", "b"], v, TOHUM);
  tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, sinif: "kirsal", tesisTuru: "gida_fabrikasi", yontem: "ekmek_firini", hucreler: bitisikGrup(parselFiksturuYukle("mini-6"), ILCE, "kirsal", 2) });
  s.calistirKadar(Math.max(...s.dunya.insaatlar.map((i) => i.bitis)));
  s.calistirKadar(s.dunya.zaman);
  expect(tesis(s).aktif).toBe(true);
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

describe("S3 tesisin gerçek çalışma durumu", () => {
  it("durdur üretim ve un/yakıt girdisini keser, bakım sürer; yükleme sonrası başlat gerçek akışları geri getirir ve replay eşleşir", () => {
    const { s, v } = kur();
    const ciktiMal = Object.entries(s.ic.yontemler[tesis(s).yontem]!.ciktilar).find(([, q]) => q > 0)![0];
    const cikti = s.ic.malIndeks[ciktiMal]!;
    expect(ciktiMal).toBe("ekmek");
    expect(dugum(s).uretimOrani[cikti]).toBeGreaterThan(0);
    expect(stok(s, "un").yerelOran).toBeLessThan(0);
    expect(dugum(s).yakitTedariki!.tuketimMiliSaat).toBeGreaterThan(0);
    tamam(s, "a", komut(s, false, true));
    s.calistirKadar(s.dunya.zaman);
    expect(tesis(s).aktif).toBe(false);
    expect(dugum(s).uretimOrani[cikti]).toBe(0);
    expect(stok(s, "un").yerelOran).toBe(0);
    expect(dugum(s).yakitTedariki).toEqual({ mal: "yakit", tuketimMiliSaat: 0, stokMiliSaat: 0, sebekeMiliSaat: 0 });
    expect(stok(s, "parca").yerelOran).toBeLessThan(0);
    const once = { un: miktar(s, "un"), yakit: miktar(s, "yakit"), parca: miktar(s, "parca") };
    const x = kopyala(s, v), hedef = s.dunya.zaman + 20 * DAKIKA;
    for (const y of [s, x]) {
      y.calistirKadar(hedef);
      expect(miktar(y, "un")).toBe(once.un);
      expect(miktar(y, "yakit")).toBe(once.yakit);
      expect(miktar(y, "parca")).toBeLessThan(once.parca);
      const oz = kare(y, "a").bolgeler.find((b) => b.id === BOLGE)!.ozel!;
      expect(oz.tesisler.find((t) => t[0] === tesis(y).id)![3]).toBe(0);
      for (const o of ["b", null]) expect(kare(y, o).bolgeler.find((b) => b.id === BOLGE)!.ozel).toBeUndefined();
      tamam(y, "a", komut(y, true, false));
      y.calistirKadar(hedef);
      expect(tesis(y).aktif).toBe(true);
      expect(dugum(y).uretimOrani[cikti]).toBeGreaterThan(0);
      expect(stok(y, "un").yerelOran).toBeLessThan(0);
      expect(dugum(y).yakitTedariki!.tuketimMiliSaat).toBeGreaterThan(0);
      const un = miktar(y, "un"), yakit = miktar(y, "yakit");
      y.calistirKadar(hedef + 20 * DAKIKA);
      expect(miktar(y, "un")).toBeLessThan(un);
      expect(miktar(y, "yakit")).toBeLessThan(yakit);
    }
    expect(x.durumOzeti()).toBe(s.durumOzeti());
    const r = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk);
    r.calistirKadar(s.dunya.zaman);
    expect(r.durumOzeti()).toBe(s.durumOzeti());
    expect(IlgiKaresiSemasi.parse(kare(s, "a"))).toEqual(kare(s, "a"));
  });

  it("stale ve yabancı komut saf reddir; false şemada korunur, bozuk guard reddedilir ve guard taşımayan eski çağrı aynı davranır", () => {
    const { s, v } = kur();
    retDegismez(s, "b", komut(s, false, true));
    retDegismez(s, "a", komut(s, false, false), /tesisin calisma durumu degisti/);
    for (const kotu of [null, 0, "false"]) {
      const k = { ...komut(s, false), oncekiAktif: kotu } as unknown as Komut;
      expect(KomutSemasi.safeParse(k).success).toBe(false);
      retDegismez(s, "a", k, /gecersiz onceki aktif degeri/);
    }
    const x = kopyala(s, v);
    expect(KomutSemasi.parse(komut(s, false, true))).toEqual(komut(s, false, true));
    expect(KomutSemasi.parse(komut(s, false))).not.toHaveProperty("oncekiAktif");
    tamam(s, "a", komut(s, false, true));
    tamam(x, "a", komut(x, false));
    s.calistirKadar(s.dunya.zaman); x.calistirKadar(x.dunya.zaman);
    expect(x.durumOzeti()).toBe(s.durumOzeti());
    retDegismez(s, "a", komut(s, true, true), /tesisin calisma durumu degisti/);
    const baslat = komut(s, true, false);
    expect(KomutSemasi.parse(baslat)).toEqual(baslat);
    expect(baslat).toHaveProperty("oncekiAktif", false);
    tamam(s, "a", baslat);
    tamam(x, "a", komut(x, true));
    s.calistirKadar(s.dunya.zaman); x.calistirKadar(x.dunya.zaman);
    expect(x.durumOzeti()).toBe(s.durumOzeti());
  });
});

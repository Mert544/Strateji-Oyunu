/** L4: gerçek ortak kenar yükü, iki yön ve saf/sahip özel yol kanıtı. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { GUN, SAAT, lojistikYolGorunumu } from "@bolge/cekirdek";
import type { Akis, CekirdekVeriPaketi, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { bitisikGrup, hucreSec, ikinciIlEkle, mulkSim, mulkVeri, tamam } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, deltaUygula, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";

const OVA = "sn_m_ova#a", LIMAN = "sn_m_liman#a", LIMAN2 = "sn_m_liman2#a", HAVUZ = "sn_m_ova2#a";
const TOHUM = 71;
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});
const lojistik = (s: SimT, id = OVA, o = "a") => kare(s, o).bolgeler.find((b) => b.id === id)!.ozel!.lojistik!;
const kendi = (s: SimT, o = "a") => s.dunya.lojistik.akislar.filter((a) => a.sahip === o && a.oranSaat > 0 && s.dunya.bolgeler[a.kaynak]!.sahip === o && s.dunya.bolgeler[a.hedef]!.sahip === o);

function kur(): { s: SimT; v: CekirdekVeriPaketi } {
  const f = parselFiksturuYukle("mini-6");
  ikinciIlEkle(f, "sn_m_liman", "sn_m_liman2");
  ikinciIlEkle(f, "sn_m_ova", "sn_m_ova2", 20_000);
  const v = mulkVeri((x) => {
    x.parsel = f;
    x.param.mulk!.yeniOyuncu.hibe = 1_000_000_000;
    x.param.mulk!.yeniOyuncu.baslangicStok = { celik: 600_000, parca: 400_000, gida: 50_000, tahil: 50_000 };
    x.param.mulk!.esZamanliInsaat = 10;
    x.param.mulk!.kamuSiparis!.etkin = false;
    x.harita.kenarlar.find((k) => k.a === "m_ova" && k.b === "m_liman")!.kapasiteSaat = 2_000_000;
  });
  const s = mulkSim(["a", "b"], v, TOHUM);
  const tarlalar = [0, 1].map((k) => bitisikGrup(f, "sn_m_ova_merkez", "kirsal", 2, k));
  const fabrika = bitisikGrup(f, "sn_m_liman_merkez", "kirsal", 2);
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: tarlalar.flat(), sinif: "kirsal" });
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_liman_merkez", hucreler: fabrika, sinif: "kirsal" });
  for (const ilce of ["sn_m_liman2_merkez", "sn_m_ova2_merkez"]) tamam(s, "a", { tur: "parsel_al", ilce, hucreler: hucreSec(f, ilce, "kirsal", 1), sinif: "kirsal" });
  for (const hucreler of tarlalar) tamam(s, "a", { tur: "tesis_insa_hucre", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler });
  // Başlangıç kiti ilk ilde kalır; ikinci ildeki fabrika gerçek NPC ithalatıyla malzeme edinir.
  for (const [mal, oranSaat] of [["celik", 100_000], ["parca", 50_000]] as const) tamam(s, "a", { tur: "ticaret_emri", bolge: LIMAN, mal, yon: "ithalat", oranSaat });
  s.calistirKadar(2 * SAAT);
  for (const mal of ["celik", "parca"]) tamam(s, "a", { tur: "ticaret_emri", bolge: LIMAN, mal, yon: "ithalat", oranSaat: 0 });
  tamam(s, "a", { tur: "tesis_insa_hucre", ilce: "sn_m_liman_merkez", tesisTuru: "gida_fabrikasi", hucreler: fabrika });
  const bTarla = bitisikGrup(f, "sn_m_ova_merkez", "kirsal", 2, 3);
  tamam(s, "b", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: bTarla, sinif: "kirsal" });
  tamam(s, "b", { tur: "parsel_al", ilce: "sn_m_liman_merkez", hucreler: hucreSec(f, "sn_m_liman_merkez", "kirsal", 1, 5), sinif: "kirsal" });
  tamam(s, "b", { tur: "tesis_insa_hucre", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler: bTarla });
  for (const bolge of [LIMAN, LIMAN2]) tamam(s, "a", { tur: "ticaret_emri", bolge, mal: "tahil", yon: "ihracat", oranSaat: 30_000 });
  tamam(s, "a", { tur: "ticaret_emri", bolge: HAVUZ, mal: "tahil", yon: "ihracat", oranSaat: 10_000 });
  tamam(s, "a", { tur: "ticaret_emri", bolge: OVA, mal: "gida", yon: "ihracat", oranSaat: 30_000 });
  tamam(s, "b", { tur: "ticaret_emri", bolge: "sn_m_liman#b", mal: "tahil", yon: "ihracat", oranSaat: 30_000 });
  s.calistirKadar(3 * GUN);
  return { s, v };
}

function kopyala(s: SimT, v: CekirdekVeriPaketi): SimT {
  const x = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
  expect(x.durumOzeti()).toBe(s.durumOzeti());
  expect(x.dunya.kuyruk).toEqual(s.dunya.kuyruk);
  return x;
}

function safOku(s: SimT, o = "a") {
  const once = dunyaSerilestir(s.dunya), kuyruk = structuredClone(s.dunya.kuyruk), rng = structuredClone(s.dunya.rng);
  const g = lojistikYolGorunumu(s.dunya, s.ic, o);
  kare(s, o);
  expect(dunyaSerilestir(s.dunya)).toBe(once);
  expect(s.dunya.kuyruk).toEqual(kuyruk);
  expect(s.dunya.rng).toEqual(rng);
  return g;
}

/** Final fiziksel akışlardan bağımsız kenar toplamı; solver veya rota seçimi taklit edilmez. */
function kenarYuku(akislar: readonly Akis[], i: number): number {
  return akislar.reduce((n, a) => n + a.yol.filter((e) => e === i).length * a.oranSaat, 0);
}

describe("L4 sahip özel yol ve kapasite", () => {
  it("iki gerçek sevk ve ters yöndeki başka mal tek fiziksel kenarda pozitif toplanır; güncel kapasite eski planı kesmez ve delta güncellenir", () => {
    const { s } = kur(), a = kendi(s), b = kendi(s, "b");
    const ileri = a.filter((f) => s.dunya.bolgeler[f.kaynak]!.id === OVA && [LIMAN, LIMAN2].includes(s.dunya.bolgeler[f.hedef]!.id) && s.ic.mallar[f.mal]!.id === "tahil");
    expect(ileri).toHaveLength(2);
    const geri = a.find((f) => s.dunya.bolgeler[f.kaynak]!.id === LIMAN && s.dunya.bolgeler[f.hedef]!.id === OVA && s.ic.mallar[f.mal]!.id === "gida")!;
    expect(geri?.oranSaat).toBeGreaterThan(0);
    const i = ileri[0]!.yol[0]!;
    expect(ileri[1]!.yol).toContain(i);
    expect(geri.yol).toContain(i);
    expect(kenarYuku(b, i)).toBeGreaterThan(0);
    const g = safOku(s)!;
    expect(g.kenarlar.map((k) => k.indeks)).toEqual([...new Set(a.flatMap((f) => f.yol))].sort((a, b) => a - b));
    for (const k of g.kenarlar) {
      const gercek = s.dunya.kenarlar[k.indeks]!;
      expect(k).toEqual({ indeks: gercek.indeks, a: s.dunya.bolgeler[gercek.a]!.id, b: s.dunya.bolgeler[gercek.b]!.id, tur: gercek.tur, sureMs: gercek.sureMs, kapasiteMiliSaat: gercek.kapasiteSaat, kendiYukMiliSaat: kenarYuku(a, k.indeks) });
      expect(k.kendiYukMiliSaat).toBeLessThanOrEqual(k.kapasiteMiliSaat);
    }
    const satir = g.kenarlar.find((k) => k.indeks === i)!;
    expect(s.dunya.kenarlar[i]!.kullanilanSaat).toBe(kenarYuku(a, i) + kenarYuku(b, i));
    expect(satir.kendiYukMiliSaat).toBeLessThan(s.dunya.kenarlar[i]!.kullanilanSaat); // Yabancının yükü yayınlanmaz.
    for (const kaynak of [OVA, LIMAN]) {
      const wire = lojistik(s, kaynak), kaynakAkislari = a.filter((f) => s.dunya.bolgeler[f.kaynak]!.id === kaynak);
      const indeksler = [...new Set(kaynakAkislari.flatMap((f) => f.yol))].sort((a, b) => a - b);
      expect(wire.kenarlar).toEqual(g.kenarlar.filter((k) => indeksler.includes(k.indeks)));
      for (const f of kaynakAkislari) expect(wire.akislar.find((r) => r.hedef === s.dunya.bolgeler[f.hedef]!.id && r.mal === s.ic.mallar[f.mal]!.id)!.yol).toEqual(f.yol);
    }
    expect(lojistik(s, OVA).kenarlar!.find((k) => k.indeks === i)!.kendiYukMiliSaat).toBe(lojistik(s, LIMAN).kenarlar!.find((k) => k.indeks === i)!.kendiYukMiliSaat); // İki kaynakta aynı toplam kopyasıdır.
    const eski = kare(s, "a"), planZamani = s.dunya.lojistik.sonCozum;
    s.dunya.kenarlar[i]!.kapasiteSaat = Math.floor(satir.kendiYukMiliSaat / 2);
    s.dunya.lojistik.kirli = true; // Fiziksel kapasite yeni, mevcut sevk henüz yeniden çözülmedi.
    const yeniG = safOku(s)!;
    expect(yeniG.guncellemeBekliyor).toBe(true);
    expect(yeniG.kenarlar.find((k) => k.indeks === i)).toMatchObject({ kapasiteMiliSaat: s.dunya.kenarlar[i]!.kapasiteSaat, kendiYukMiliSaat: satir.kendiYukMiliSaat });
    expect(s.dunya.lojistik.sonCozum).toBe(planZamani);
    expect(kendi(s)).toEqual(a);
    const yeni = kare(s, "a");
    expect(deltaUygula(eski, kareFarki(eski, yeni))).toEqual(yeni);
    expect(IlgiKaresiSemasi.parse(yeni)).toEqual(yeni);
    s.dunya.lojistik.kirli = false;
    s.baglam.planla(s.dunya, s.dunya.zaman + 1, { tur: "cozum" });
    expect(safOku(s)!.guncellemeBekliyor).toBe(false); // Tek başına no-op kuyruk olayı bekleyen plan değildir.
  });

  it("gerçek havuz boş yoludur; eski metadata bilinmez kalır, geçersiz sahip yolu topluca bilinmez olur ve yabancı/sahte uçlar özel kanıt sızdırmaz", () => {
    const { s, v } = kur(), g = safOku(s)!;
    const havuz = kendi(s).find((f) => s.dunya.bolgeler[f.hedef]!.id === HAVUZ)!;
    expect(havuz).toBeDefined();
    expect(havuz.yol).toEqual([]);
    expect(havuz.sureMs).toBe(0);
    expect(lojistik(s).akislar.find((f) => f.hedef === HAVUZ)!.yol).toEqual([]);
    expect(lojistik(s, HAVUZ).kenarlar).toEqual([]);
    expect(lojistik(s, HAVUZ).guncellemeBekliyor).toBe(s.dunya.lojistik.kirli);
    expect(safOku(kopyala(s, v))).toEqual(g);
    const asil = kare(s, "a"), gercek = kendi(s).find((f) => f.yol.length > 0)!;
    const yabanci = s.dunya.bolgeler.find((b) => b.id === "sn_m_ova#b")!.indeks;
    const kamu = s.dunya.bolgeler.find((b) => b.sahip === null && b.merkez === undefined)!.indeks;
    const x = kopyala(s, v);
    for (const ekstra of [{ sahip: "b" }, { kaynak: yabanci }, { hedef: yabanci }, { kaynak: kamu }, { hedef: kamu }]) x.dunya.lojistik.akislar.push({ ...gercek, ...ekstra, yol: [...gercek.yol] });
    expect(safOku(x)).toEqual(g);
    expect(lojistik(x)).toEqual(lojistik(s));
    for (const o of ["b", null]) {
      const k = kare(s, o);
      expect(k.bolgeler.find((b) => b.id === OVA)!.ozel).toBeUndefined();
      expect(k.bolgeler.find((b) => b.id === LIMAN)!.ozel).toBeUndefined();
    }
    const bG = safOku(s, "b")!;
    for (const k of bG.kenarlar) expect(k.kendiYukMiliSaat).toBe(kenarYuku(kendi(s, "b"), k.indeks));
    const tumMallar = kopyala(s, v);
    tumMallar.dunya.lojistik.akislar.push({ ...gercek, mal: s.ic.malIndeks.elektrik!, oranSaat: 10_000, yol: [...gercek.yol] }); // Saf okuma sınırı: son plandaki geçerli depolanamaz mal da kapasite taşır.
    const tumG = safOku(tumMallar)!;
    for (const i of gercek.yol) expect(tumG.kenarlar.find((k) => k.indeks === i)!.kendiYukMiliSaat).toBe(g.kenarlar.find((k) => k.indeks === i)!.kendiYukMiliSaat + 10_000);
    expect(lojistik(tumMallar).akislar.some((f) => f.mal === "elektrik")).toBe(false); // Eski sevk özeti depolanabilir kapsamını korur.
    const eski = structuredClone(asil);
    for (const b of eski.bolgeler) if (b.ozel?.lojistik) {
      delete b.ozel.lojistik.kenarlar;
      delete b.ozel.lojistik.guncellemeBekliyor;
      for (const f of b.ozel.lojistik.akislar) delete f.yol;
    }
    expect(IlgiKaresiSemasi.parse(eski)).toEqual(eski);
    expect(eski.bolgeler.find((b) => b.id === OVA)!.ozel!.lojistik!.akislar.find((f) => f.hedef === HAVUZ)!.yol).toBeUndefined(); // Yokluk gerçek boş havuz değildir.
    for (const boz of [
      (f: Akis) => { f.yol = [s.dunya.kenarlar.length]; },
      (f: Akis) => { f.yol = []; f.sureMs = 0; },
      (f: Akis) => { f.sureMs += 1; },
      (f: Akis) => { f.oranSaat = -1; },
    ]) {
      const y = kopyala(s, v), f = y.dunya.lojistik.akislar.find((f) => f.sahip === "a" && f.yol.length > 0)!;
      boz(f);
      expect(safOku(y)).toBeUndefined();
      const wire = lojistik(y);
      expect(wire.kenarlar).toBeUndefined();
      expect(wire.guncellemeBekliyor).toBeUndefined();
      expect(wire.akislar.length).toBeGreaterThan(0); // Eski sevk özeti kaybolmaz.
      expect(wire.akislar.every((f) => f.yol === undefined)).toBe(true);
    }
  });
});

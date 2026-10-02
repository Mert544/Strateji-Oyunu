/** L2: gerçek rafineri, yakıt eşiği/ikmal önceliği ve izinli parametre göçü. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { DAKIKA, PPM, SAAT, ikmalTalebi, mulkOyuncuBul } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikHazine, anlikMiktar } from "../../cekirdek/src/stok";
import { bitisikGrup, mulkSim, mulkVeri, tamam } from "../../cekirdek/test/mulk-yardimci";
import { g6KorunumTutar } from "../../cekirdek/test/g6-yardimci";
import { IlgiKaresiSemasi, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const ILCE = "sn_m_ova_merkez";
const BOLGE = "sn_m_ova#a";
const TOHUM = 47;
const dugum = (s: SimT) => s.dunya.bolgeler.find((b) => b.id === BOLGE)!;
const miktar = (s: SimT, mal = "yakit") => anlikMiktar(dugum(s).stoklar[s.ic.malIndeks[mal]!]!, s.dunya.zaman);
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});
const ozel = (s: SimT) => kare(s, "a").bolgeler.find((b) => b.i === dugum(s).indeks)!.ozel!;

function ilkFark(a: unknown, b: unknown, yol = "$"): string {
  if (Object.is(a, b)) return "";
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    const aa = a as Record<string, unknown>, bb = b as Record<string, unknown>;
    for (const k of [...new Set([...Object.keys(aa), ...Object.keys(bb)])].sort()) {
      const fark = ilkFark(aa[k], bb[k], `${yol}.${k}`);
      if (fark) return fark;
    }
    return "";
  }
  return `${yol}: ${JSON.stringify(a)} / ${JSON.stringify(b)}`;
}

function veri(policy: boolean | "absent" = true, yakit = 0): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    const mal = v.param.mulk!.sebeke!.mallar.find((m) => m.mal === "yakit")!;
    if (policy === "absent") delete mal.stokOncelikli;
    else mal.stokOncelikli = policy;
    v.param.mulk!.esZamanliInsaat = 10;
    v.param.mulk!.yeniOyuncu.hibe = 5_000_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = {
      celik: 2_000_000, parca: 2_000_000, gida: 2_000_000, muhimmat: 2_000_000,
      un: 2_000_000, petrol: 2_000_000, yakit,
    };
    // İzole yakıt hesabı: stok bozulması/nüfus girdisi bu üç vakanın konusu değil.
    v.icerik.mallar.find((m) => m.id === "yakit")!.bozulmaPpmGun = 0;
    v.param.nufus.tuketim1000Saat.yakit = 0;
  });
}

function kur(v: CekirdekVeriPaketi, rafineri = false, ordu = false): SimT {
  const s = mulkSim(["a", "b"], v, TOHUM);
  const f = parselFiksturuYukle("mini-6");
  tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, sinif: "kirsal", tesisTuru: "gida_fabrikasi", yontem: "ekmek_firini", hucreler: bitisikGrup(f, ILCE, "kirsal", 2) });
  if (rafineri) {
    tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, sinif: "kirsal", tesisTuru: "rafineri", hucreler: bitisikGrup(f, ILCE, "kirsal", 2, 1) });
    tamam(s, "a", { tur: "ticaret_emri", bolge: BOLGE, mal: "petrol", yon: "ithalat", oranSaat: 10_000 });
  }
  if (ordu) tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, sinif: "kirsal", tesisTuru: "ordugah", hucreler: bitisikGrup(f, ILCE, "kirsal", 3, 4) });
  s.calistirKadar(Math.max(...s.dunya.insaatlar.map((x) => x.bitis)));
  return s;
}

function kopyala(v: CekirdekVeriPaketi, s: SimT): SimT {
  const x = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
  expect(x.durumOzeti()).toBe(s.durumOzeti());
  expect(x.dunya.kuyruk).toEqual(s.dunya.kuyruk); // Aynı kuralla yükleme yeni çözüm/eşik eklemez.
  return x;
}

/** Para defterini gerçek olay aralıklarındaki ödeme oranıyla karşılaştırır; tahsis motorunu taklit etmez. */
function bedelliIlerlet(s: SimT, hedef: number): void {
  s.calistirKadar(s.dunya.zaman);
  const once = g6KorunumTutar(s, "L2 aralık başı");
  let bedel = 0n;
  while (s.dunya.zaman < hedef) {
    const t = Math.min(hedef, ...s.dunya.kuyruk.map((o) => o.t));
    expect(t).toBeGreaterThan(s.dunya.zaman);
    bedel += BigInt(mulkOyuncuBul(s.dunya, "a")!.paraAkisi?.sebeke ?? 0) * BigInt(t - s.dunya.zaman);
    s.calistirKadar(t);
  }
  const sonra = g6KorunumTutar(s, "L2 aralık sonu");
  expect(sonra.lavaboSebeke + sonra.kasaSebeke - once.lavaboSebeke - once.kasaSebeke).toBe(bedel);
}

describe("L2 yakıtın gerçek stok ve şebeke payı", () => {
  it("gerçek rafineri petrolü yakıta çevirir; stok tam hızla tükenir, aynı eşikte şebeke ödenir ve snapshot/replay aynıdır", () => {
    const v = veri();
    const s = kur(v, true);
    expect(v.param.mulk!.sebeke!.mallar.find((m) => m.mal === "yakit")!.stokOncelikli).toBe(true);
    const b = dugum(s);
    const r = b.tesisler.find((t) => s.ic.tesisTurleri[t.tur]!.id === "rafineri")!;
    const firin = b.tesisler.find((t) => s.ic.yontemler[t.yontem]!.id === "ekmek_firini")!;
    expect(r.verimPpm).toBeGreaterThan(0);
    expect(firin.verimPpm).toBeGreaterThan(0);
    expect(b.uretimOrani[s.ic.malIndeks.yakit!]).toBeGreaterThan(0);
    expect(b.ticaretEmirleri.find((e) => e.mal === s.ic.malIndeks.petrol)!.gerceklesenSaat).toBeGreaterThan(0);
    const petrolOnce = miktar(s, "petrol");
    bedelliIlerlet(s, s.dunya.zaman + 5 * DAKIKA);
    expect(miktar(s, "petrol")).toBeLessThan(petrolOnce);
    const stokOnce = miktar(s);
    expect(stokOnce).toBeGreaterThan(0);
    tamam(s, "a", { tur: "tesis_durum", bolge: BOLGE, tesis: r.id, aktif: false });
    s.calistirKadar(s.dunya.zaman);
    const ted = b.yakitTedariki!;
    expect(ted).toMatchObject({ mal: "yakit", stokMiliSaat: ted.tuketimMiliSaat, sebekeMiliSaat: 0 });
    expect(ted.tuketimMiliSaat).toBeGreaterThan(0);
    expect(b.stoklar[s.ic.malIndeks.yakit!]!.yerelOran).toBe(-ted.stokMiliSaat); // Stok/4 saat kotası yok; fiziksel tüketim bir kez.
    const simdi = s.dunya.zaman;
    const esik = s.dunya.kuyruk.find((o) => o.veri.tur === "esik" && o.veri.bolge === b.indeks && o.veri.mal === s.ic.malIndeks.yakit && o.veri.surum === b.stoklar[s.ic.malIndeks.yakit!]!.surum)!;
    expect(esik).toBeDefined();
    expect(esik.t - simdi).toBeLessThan(SAAT);
    const x = kopyala(v, s);
    bedelliIlerlet(s, esik.t - 1);
    expect(miktar(s)).toBeGreaterThan(0);
    expect(b.yakitTedariki!.sebekeMiliSaat).toBe(0);
    bedelliIlerlet(s, esik.t);
    expect(miktar(s)).toBe(0);
    expect(s.dunya.lojistik.sonCozum).toBe(esik.t);
    expect(b.yakitTedariki!).toMatchObject({ stokMiliSaat: 0, sebekeMiliSaat: b.yakitTedariki!.tuketimMiliSaat });
    expect(b.yakitTedariki!.sebekeMiliSaat).toBeGreaterThan(0);
    const ko = ozel(s);
    expect(ko.yakitTedariki).toEqual(b.yakitTedariki);
    expect(ko.sebekeGiderleri!.find((g) => g.mal === "yakit")!.miktarMiliSaat).toBe(b.yakitTedariki!.sebekeMiliSaat);
    for (const o of ["b", null]) expect(kare(s, o).bolgeler.find((d) => d.i === b.indeks)!.ozel).toBeUndefined();
    expect(IlgiKaresiSemasi.parse(kare(s, "a"))).toEqual(kare(s, "a"));
    const hedef = esik.t + SAAT;
    bedelliIlerlet(s, hedef);
    x.calistirKadar(hedef);
    expect(dugum(x).stoklar).toEqual(b.stoklar);
    expect(miktar(x)).toBe(miktar(s));
    expect(anlikHazine(x.dunya, "a")).toBe(anlikHazine(s.dunya, "a"));
    expect(dugum(x).yakitTedariki).toEqual(b.yakitTedariki);
    g6KorunumTutar(x, "L2 yüklenen kol sonu"); // Aynı uzlaştıran test okuması: stok/nakit eşitlikleri bundan önce sınanır.
    expect(x.durumOzeti(), ilkFark(x.dunya, s.dunya)).toBe(s.durumOzeti());
    const oynat = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk);
    oynat.calistirKadar(hedef);
    expect(dugum(oynat).stoklar).toEqual(b.stoklar);
    expect(anlikHazine(oynat.dunya, "a")).toBe(anlikHazine(s.dunya, "a"));
    g6KorunumTutar(oynat, "L2 replay sonu");
    expect(oynat.durumOzeti()).toBe(s.durumOzeti());
    // Aktif kuralın gerçek sıfırı ile eski/eksik snapshot ayrıdır.
    tamam(s, "a", { tur: "tesis_durum", bolge: BOLGE, tesis: firin.id, aktif: false });
    s.calistirKadar(s.dunya.zaman);
    expect(ozel(s).yakitTedariki).toEqual({ mal: "yakit", tuketimMiliSaat: 0, stokMiliSaat: 0, sebekeMiliSaat: 0 });
    const eksik = kopyala(v, s);
    delete dugum(eksik).yakitTedariki;
    expect(ozel(eksik).yakitTedariki).toBeUndefined();
  });

  it("gerçek birliklerin ikmali kıt fiziksel yakıttan önce karşılanır; sanayi şebekesi ordu açığını satın almaz", () => {
    const v = veri();
    // Açık mevcut birlikle yakıt önceliğini izole et; gerçek üretim partisi yine motorla tamamlanır.
    v.icerik.birlikler.find((b) => b.id === "piyade_tumeni")!.ikmal = { yakit: 1000 };
    v.param.askeri.ikmalCarpaniPpm = PPM;
    const s = kur(v, false, true);
    tamam(s, "a", { tur: "birlik_uret", bolge: BOLGE, birlik: "piyade_tumeni", adet: 2 });
    s.calistirKadar(s.dunya.partiler[0]!.bitis);
    const b = dugum(s);
    const talep = ikmalTalebi(s.dunya, s.baglam, b.indeks)[s.ic.malIndeks.yakit!]!;
    expect(talep).toBe(2000);
    expect(b.ikmalKarsilanmaPpm).toBe(0);
    for (const oran of [talep / 2, talep + 2000, 0]) {
      tamam(s, "a", { tur: "ticaret_emri", bolge: BOLGE, mal: "yakit", yon: "ithalat", oranSaat: oran });
      s.calistirKadar((Math.floor(s.dunya.zaman / SAAT) + 1) * SAAT); // NPC emirleri gerçek saatlik pazar tikinde gerçekleşir.
      const gercek = b.ticaretEmirleri.find((e) => e.mal === s.ic.malIndeks.yakit)?.gerceklesenSaat ?? 0;
      const ted = b.yakitTedariki!;
      expect(gercek).toBe(oran);
      expect(miktar(s)).toBe(0);
      expect(b.ikmalKarsilanmaPpm).toBe(oran === 0 ? 0 : oran < talep ? PPM / 2 : PPM);
      expect(ted.stokMiliSaat).toBe(Math.max(0, gercek - talep));
      expect(ted.sebekeMiliSaat).toBe(ted.tuketimMiliSaat - ted.stokMiliSaat);
      expect(ted.tuketimMiliSaat).toBeGreaterThan(2000);
      expect(ozel(s).sebekeGiderleri!.find((g) => g.mal === "yakit")!.miktarMiliSaat).toBe(ted.sebekeMiliSaat);
      bedelliIlerlet(s, s.dunya.zaman + DAKIKA);
      expect(miktar(s)).toBe(0); // Şebeke fazladan depo yakıtı yaratmaz.
    }
  });

  it("absent/false eski dünyada eşdeğerdir; bölge kipini değiştirmez; kabul edilen parametre göçü iki yönde oranları yeniler", () => {
    const kapali = veri(false, 10_000);
    const eski = veri("absent", 10_000);
    const a = kur(kapali);
    const b = kur(eski);
    a.calistirKadar(a.dunya.zaman + DAKIKA);
    b.calistirKadar(b.dunya.zaman + DAKIKA);
    expect(dunyaSerilestir(a.dunya)).toBe(dunyaSerilestir(b.dunya));
    expect(miktar(a)).toBe(10_000);
    expect(dugum(a).yakitTedariki).toBeUndefined();
    expect(ozel(a).yakitTedariki).toBeUndefined();
    const acik = structuredClone(kapali);
    acik.param.mulk!.sebeke!.mallar.find((m) => m.mal === "yakit")!.stokOncelikli = true;
    const goruntu = anlikGoruntuOlustur(a, kuralSurumuHesapla(kapali));
    expect(() => Simulasyon.anlikGoruntudenYukle(acik, goruntu)).toThrow(/kural surumu/);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(acik, goruntu, [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(r.goc).toMatchObject({ kuralDegisti: true, yenidenIndekslendi: false });
    const yeni = r.sim;
    expect(miktar(yeni)).toBe(miktar(a)); // Eski oran kayıt anına kadar uzlaştırılır; yükleme tüketim yaratmaz.
    yeni.calistirKadar(yeni.dunya.zaman);
    expect(dugum(yeni).yakitTedariki!).toMatchObject({ stokMiliSaat: dugum(yeni).yakitTedariki!.tuketimMiliSaat, sebekeMiliSaat: 0 });
    expect(dugum(yeni).stoklar[yeni.ic.malIndeks.yakit!]!.yerelOran).toBeLessThan(0);
    yeni.calistirKadar(yeni.dunya.zaman + DAKIKA);
    const miktarOnce = miktar(yeni);
    const geri = Simulasyon.anlikGoruntudenYukleSonuclu(kapali, anlikGoruntuOlustur(yeni, kuralSurumuHesapla(acik)), [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(geri.goc).toMatchObject({ kuralDegisti: true, yenidenIndekslendi: false });
    geri.sim.calistirKadar(geri.sim.dunya.zaman);
    expect(dugum(geri.sim).yakitTedariki).toBeUndefined();
    expect(ozel(geri.sim).yakitTedariki).toBeUndefined();
    expect(dugum(geri.sim).stoklar[geri.sim.ic.malIndeks.yakit!]!.yerelOran).toBe(0);
    expect(ozel(geri.sim).sebekeGiderleri!.find((g) => g.mal === "yakit")!.miktarMiliSaat).toBeGreaterThan(0);
    geri.sim.calistirKadar(geri.sim.dunya.zaman + DAKIKA);
    expect(miktar(geri.sim)).toBe(miktarOnce);
    const bolgeKos = (v: CekirdekVeriPaketi) => {
      const vv = structuredClone(v);
      delete vv.parsel;
      const s = Simulasyon.olustur(vv, TOHUM);
      tamam(s, "sistem", { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman"] });
      s.calistirKadar(2 * SAAT);
      expect(s.dunya.bolgeler.every((b) => b.yakitTedariki === undefined)).toBe(true);
      return s;
    };
    expect(bolgeKos(acik).durumOzeti()).toBe(bolgeKos(kapali).durumOzeti());
  });
});

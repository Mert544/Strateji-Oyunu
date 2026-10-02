/** L3: gerçek iç sevk, kaynak hizmet bedeli, nakit eşiği ve güvenli kayıt/kare. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { DAKIKA, MILI, PPM, SAAT, mulkOyuncuBul } from "@bolge/cekirdek";
import type { Akis, CekirdekVeriPaketi, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaCoz, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikHazine, anlikMiktar, hazineEkle } from "../../cekirdek/src/stok";
import { sayacOlcekli } from "../../cekirdek/src/paraSayac";
import { g6KorunumTutar } from "../../cekirdek/test/g6-yardimci";
import { bitisikGrup, hucreSec, mulkSim, mulkVeri, tamam } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const KAYNAK = "sn_m_ova#a";
const HEDEF = "sn_m_liman#a";
const TOHUM = 53;
const kaynak = (s: SimT) => s.dunya.bolgeler.find((b) => b.id === KAYNAK)!;
const hedef = (s: SimT) => s.dunya.bolgeler.find((b) => b.id === HEDEF)!;
const akis = (s: SimT) => s.dunya.lojistik.akislar.find((a) => s.dunya.bolgeler[a.kaynak]!.id === KAYNAK && s.dunya.bolgeler[a.hedef]!.id === HEDEF)!;
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});
const lojistik = (s: SimT, id = KAYNAK) => kare(s, "a").bolgeler.find((b) => b.id === id)!.ozel!.lojistik!;
const yanmis = (s: SimT) => s.dunya.mulk!.para!.lavabo.tasima === undefined ? 0n : sayacOlcekli(s.dunya.mulk!.para!.lavabo.tasima!);

function veri(policy: boolean | "absent" | "canonical" = "canonical", tur: "kara" | "deniz" | "hava" = "kara", saat = 3): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 500_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 500_000, parca: 300_000, tahil: 50_000, gida: 300_000, yakit: 6000 };
    v.icerik.mallar.find((m) => m.id === "yakit")!.bozulmaPpmGun = 0;
    if (policy === "absent") delete v.param.lojistik.tasima;
    else if (policy !== "canonical") v.param.lojistik.tasima!.etkin = policy;
    const k = v.harita.kenarlar.find((k) => k.a === "m_ova" && k.b === "m_liman")!;
    k.tur = tur;
    k.sureSaat = saat;
  });
}

function kur(v: CekirdekVeriPaketi): SimT {
  const f = parselFiksturuYukle("mini-6");
  const s = mulkSim(["a", "b"], v, TOHUM);
  const hucreler = bitisikGrup(f, "sn_m_ova_merkez", "kirsal", 2);
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler, sinif: "kirsal" });
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_liman_merkez", hucreler: hucreSec(f, "sn_m_liman_merkez", "kirsal", 1), sinif: "kirsal" });
  tamam(s, "b", { tur: "parsel_al", ilce: "sn_m_gecit_merkez", hucreler: hucreSec(f, "sn_m_gecit_merkez", "kirsal", 1), sinif: "kirsal" });
  tamam(s, "a", { tur: "tesis_insa_hucre", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler });
  s.calistirKadar(s.dunya.insaatlar[0]!.bitis);
  tamam(s, "a", { tur: "ticaret_emri", bolge: HEDEF, mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
  s.calistirKadar(s.dunya.zaman + SAAT);
  expect(akis(s)?.oranSaat).toBeGreaterThan(0);
  return s;
}

/** Sözleşmenin tek rasyonel hesabı; gerçek rota/oran/fiyat girdileri kullanılır. */
function beklenen(s: SimT, a: Akis): number {
  const p = s.ic.param.lojistik.tasima!;
  const agirlik = a.yol.reduce((n, i) => n + BigInt(s.dunya.kenarlar[i]!.sureMs) * BigInt(p.turCarpaniPpm[s.dunya.kenarlar[i]!.tur]), 0n);
  return Number(BigInt(a.oranSaat) * agirlik * (BigInt(p.isletmeBirimMili) * BigInt(PPM) + BigInt(s.dunya.pazar.fiyat[s.ic.malIndeks.yakit!]!) * BigInt(p.yakitBirimPpm)) / (BigInt(MILI) * BigInt(SAAT) * BigInt(PPM) ** 2n));
}

function kopyala(v: CekirdekVeriPaketi, s: SimT): SimT {
  const x = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
  expect(x.dunya.kuyruk).toEqual(s.dunya.kuyruk);
  expect(x.durumOzeti()).toBe(s.durumOzeti());
  expect(akis(x).tasimaBedeliMiliSaat).toBe(akis(s).tasimaBedeliMiliSaat);
  return x;
}

/** Kayıpsız lavabo artışı gerçek saatlik oranların integraliyle aynı olmalı. */
function bedelliIlerlet(s: SimT, t: number): void {
  s.calistirKadar(s.dunya.zaman);
  g6KorunumTutar(s, "L3 başlangıç");
  const once = yanmis(s);
  let tutar = 0n;
  while (s.dunya.zaman < t) {
    const sonraki = Math.min(t, ...s.dunya.kuyruk.map((o) => o.t));
    expect(sonraki).toBeGreaterThan(s.dunya.zaman);
    tutar += BigInt(mulkOyuncuBul(s.dunya, "a")!.paraAkisi?.tasima ?? 0) * BigInt(sonraki - s.dunya.zaman);
    s.calistirKadar(sonraki);
  }
  g6KorunumTutar(s, "L3 son");
  expect(yanmis(s) - once).toBe(tutar);
}

describe("L3 iç taşıma hizmeti", () => {
  it("gerçek sevkte tür/süre ve canlı yakıt fiyatı uygulanır; sıfır sevk/varış ek ücret yaratmaz, nakit sıfırında ücretli sevk durur", () => {
    for (const [tur, sure] of [["kara", 3], ["deniz", 6], ["hava", 9]] as const) {
      const v = veri("canonical", tur, sure);
      const s = kur(v);
      const a = akis(s);
      expect(a.sureMs).toBe(sure * SAAT);
      expect(a.tasimaBedeliMiliSaat).toBe(beklenen(s, a));
      expect(a.tasimaBedeliMiliSaat).toBeGreaterThan(0);
      expect(kaynak(s).tasimaBedeliMiliSaat).toBe(a.tasimaBedeliMiliSaat);
      expect(hedef(s).tasimaBedeliMiliSaat).toBe(0);
      expect(mulkOyuncuBul(s.dunya, "a")!.paraAkisi!.tasima).toBe(a.tasimaBedeliMiliSaat);
      expect(lojistik(s).akislar[0]!.tasimaBedeliMiliSaat).toBe(a.tasimaBedeliMiliSaat);
      expect(lojistik(s).tasimaBedeliMiliSaat).toBe(a.tasimaBedeliMiliSaat);
      expect(anlikMiktar(kaynak(s).stoklar[s.ic.malIndeks.yakit!]!, s.dunya.zaman)).toBe(6000);
      const donmus = a.tasimaBedeliMiliSaat;
      // Kontrollü piyasa kotasyonu sınırı: ücret değişimi yeniden çözümden önce snapshot'a yansıtılmaz.
      s.dunya.pazar.fiyat[s.ic.malIndeks.yakit!]! *= 2;
      expect(a.tasimaBedeliMiliSaat).toBe(donmus);
      expect(akis(kopyala(v, s)).tasimaBedeliMiliSaat).toBe(donmus);
      tamam(s, "a", { tur: "vergi_ayarla", oranPpm: s.dunya.oyuncular[0]!.vergiPpm });
      s.calistirKadar(s.dunya.zaman);
      expect(akis(s).oranSaat).toBe(a.oranSaat);
      expect(akis(s).tasimaBedeliMiliSaat).toBe(beklenen(s, akis(s)));
      expect(akis(s).tasimaBedeliMiliSaat).toBeGreaterThan(donmus!);
      bedelliIlerlet(s, s.dunya.zaman + DAKIKA);
      const mal = s.ic.malIndeks.tahil!;
      const varis = Math.min(...s.dunya.kuyruk.filter((o) => o.veri.tur === "oran_delta" && o.veri.bolge === hedef(s).indeks && o.veri.mal === mal && o.veri.delta > 0).map((o) => o.t));
      s.calistirKadar(varis);
      expect(hedef(s).stoklar[mal]!.gelenOran).toBeGreaterThan(0);
      tamam(s, "a", { tur: "ticaret_emri", bolge: HEDEF, mal: "tahil", yon: "ihracat", oranSaat: 0 });
      s.calistirKadar(s.dunya.zaman);
      expect(akis(s)).toBeUndefined();
      expect(hedef(s).stoklar[mal]!.gelenOran).toBeGreaterThan(0);
      expect(lojistik(s).tasimaBedeliMiliSaat).toBe(0);
      expect(mulkOyuncuBul(s.dunya, "a")!.paraAkisi?.tasima).toBeUndefined();
      const yanmaOnce = yanmis(s);
      bedelliIlerlet(s, s.dunya.zaman + DAKIKA);
      expect(yanmis(s)).toBe(yanmaOnce);
    }

    // Büyük test tarifesi bütçe sınırını yakınlaştırır; gerçek sevk ve muhasebe aynı motor yolundadır.
    const pahali = veri();
    pahali.param.lojistik.tasima!.isletmeBirimMili = 100_000;
    const s = kur(pahali);
    const sahip = s.dunya.oyuncular.find((o) => o.id === "a")!;
    expect(sahip.hazine.yerelOran).toBeLessThan(0);
    expect(hazineEkle(s.dunya, "a", 100_000 - anlikHazine(s.dunya, "a"))).toBe(true); // Gerçek harcama lavabosuyla küçük bakiye fikstürü.
    tamam(s, "a", { tur: "vergi_ayarla", oranPpm: sahip.vergiPpm });
    s.calistirKadar(s.dunya.zaman);
    const esik = s.dunya.kuyruk.filter((o) => o.veri.tur === "tasima_hazine_esik" && o.veri.oyuncu === "a" && o.veri.surum === sahip.hazine.surum).sort((a, b) => a.t - b.t)[0]!;
    expect(esik.t - s.dunya.zaman).toBeLessThan(DAKIKA);
    const transit = s.dunya.kuyruk.filter((o) => o.veri.tur === "oran_delta" && o.veri.delta > 0);
    bedelliIlerlet(s, esik.t - 1);
    expect(anlikHazine(s.dunya, "a")).toBeGreaterThan(0);
    expect(akis(s)).toBeDefined();
    bedelliIlerlet(s, esik.t);
    expect(anlikHazine(s.dunya, "a")).toBe(0);
    expect(s.dunya.lojistik.sonCozum).toBe(esik.t);
    expect(akis(s)).toBeUndefined();
    expect(kaynak(s).tasimaBedeliMiliSaat).toBe(0);
    expect(transit.length).toBeGreaterThan(0);
    for (const o of transit) expect(s.dunya.kuyruk).toContainEqual(o); // Yeni sevk kapanır, yoldaki mal silinmez.

    const ucretsiz = veri();
    ucretsiz.param.lojistik.tasima!.turCarpaniPpm.kara = 0;
    const z = kur(ucretsiz);
    expect(hazineEkle(z.dunya, "a", -anlikHazine(z.dunya, "a"))).toBe(true);
    tamam(z, "a", { tur: "vergi_ayarla", oranPpm: z.dunya.oyuncular[0]!.vergiPpm });
    z.calistirKadar(z.dunya.zaman);
    expect(akis(z).oranSaat).toBeGreaterThan(0);
    expect(akis(z).tasimaBedeliMiliSaat).toBe(0); // Bakiye sıfırken ücretsiz fiziksel rota açık kalır.
  });

  it("aynı zamanın parçalara bölünmesi, aynı-t tekrar çözüm ve snapshot/replay stok/nakit/ücreti değiştirmez", () => {
    const v = veri();
    const s = kur(v);
    const x = kopyala(v, s);
    const hedefT = s.dunya.zaman + 4 * SAAT + 137;
    bedelliIlerlet(s, hedefT);
    for (let t = x.dunya.zaman; t < hedefT;) x.calistirKadar(t = Math.min(hedefT, t + 7 * DAKIKA + 19));
    expect(kaynak(x).stoklar).toEqual(kaynak(s).stoklar);
    expect(hedef(x).stoklar).toEqual(hedef(s).stoklar);
    expect(anlikHazine(x.dunya, "a")).toBe(anlikHazine(s.dunya, "a"));
    g6KorunumTutar(x, "L3 parçalı son"); // Her kola eşit uzlaştıran okuma, gerçek değer kontrollerinden sonra.
    expect(x.durumOzeti()).toBe(s.durumOzeti());
    const once = yanmis(s);
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(s.dunya.zaman);
    g6KorunumTutar(s, "L3 aynı-t çözüm");
    expect(yanmis(s)).toBe(once);
    const r = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk);
    r.calistirKadar(hedefT);
    r.baglam.kirlet(r.dunya);
    r.calistirKadar(r.dunya.zaman);
    expect(anlikHazine(r.dunya, "a")).toBe(anlikHazine(s.dunya, "a"));
    expect(kaynak(r).stoklar).toEqual(kaynak(s).stoklar);
    g6KorunumTutar(r, "L3 replay son");
    expect(r.durumOzeti()).toBe(s.durumOzeti());
  });

  it("eski/kapalı ve bölge kipi aynı kalır; kaynak/sahip sınırı korunur, kapatma göçü geçmişi saklayıp yeni gideri temizler", () => {
    const kapali = veri(false), eski = veri("absent");
    const a = kur(kapali), b = kur(eski);
    expect(dunyaSerilestir(a.dunya)).toBe(dunyaSerilestir(b.dunya));
    expect(akis(a).tasimaBedeliMiliSaat).toBeUndefined();
    expect(lojistik(a).tasimaBedeliMiliSaat).toBeUndefined();
    expect(a.dunya.mulk!.para!.lavabo.tasima).toBeUndefined();
    expect(a.dunya.kuyruk.some((o) => o.veri.tur === "tasima_hazine_esik")).toBe(false);
    const v = veri(), s = kur(v);
    const negatif = structuredClone(s.dunya);
    negatif.lojistik.akislar[0]!.tasimaBedeliMiliSaat = -1;
    expect(() => dunyaCoz(dunyaSerilestir(negatif))).toThrow(/tasimaBedeliMiliSaat/);
    const tutarsiz = structuredClone(s.dunya);
    tutarsiz.bolgeler[kaynak(s).indeks]!.tasimaBedeliMiliSaat! += 1;
    expect(() => dunyaCoz(dunyaSerilestir(tutarsiz))).toThrow(/tasimaBedeliMiliSaat/);
    const asil = kare(s, "a");
    for (const o of ["b", null]) {
      expect(kare(s, o).bolgeler.find((b) => b.id === KAYNAK)!.ozel).toBeUndefined();
      expect(kare(s, o).bolgeler.find((b) => b.id === HEDEF)!.ozel).toBeUndefined();
    }
    const yabanci = s.dunya.bolgeler.find((b) => b.id === "sn_m_gecit#b")!;
    expect(kare(s, "b").bolgeler.find((b) => b.i === yabanci.indeks)!.ozel!.lojistik!.tasimaBedeliMiliSaat).toBe(0);
    const x = kopyala(v, s), gercek = akis(x);
    x.dunya.lojistik.akislar.push({ ...gercek, sahip: "b" }, { ...gercek, kaynak: yabanci.indeks }, { ...gercek, hedef: yabanci.indeks });
    expect(lojistik(x)).toEqual(lojistik(s));
    delete kaynak(x).tasimaBedeliMiliSaat;
    expect(lojistik(x).tasimaBedeliMiliSaat).toBeUndefined(); // Eksik snapshot ekonomik sıfıra çevrilmez.
    const oldWire = structuredClone(asil);
    for (const b of oldWire.bolgeler) if (b.ozel?.lojistik) {
      delete b.ozel.lojistik.tasimaBedeliMiliSaat;
      for (const a of b.ozel.lojistik.akislar) delete a.tasimaBedeliMiliSaat;
    }
    expect(IlgiKaresiSemasi.parse(oldWire)).toEqual(oldWire);
    bedelliIlerlet(s, s.dunya.zaman + DAKIKA);
    const tarih = yanmis(s);
    expect(tarih).toBeGreaterThan(0n);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(kapali, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)), [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(r.goc).toMatchObject({ kuralDegisti: true, yenidenIndekslendi: false });
    expect(akis(r.sim).tasimaBedeliMiliSaat).toBeUndefined();
    expect(kaynak(r.sim).tasimaBedeliMiliSaat).toBeUndefined();
    expect(mulkOyuncuBul(r.sim.dunya, "a")!.paraAkisi?.tasima).toBeUndefined();
    expect(yanmis(r.sim)).toBe(tarih);
    expect(r.sim.dunya.kuyruk.some((o) => o.veri.tur === "tasima_hazine_esik")).toBe(false);
    bedelliIlerlet(r.sim, r.sim.dunya.zaman + DAKIKA);
    expect(yanmis(r.sim)).toBe(tarih);
    const bolgeKos = (v: CekirdekVeriPaketi) => {
      const vv = structuredClone(v);
      delete vv.parsel;
      const s = Simulasyon.olustur(vv, TOHUM);
      tamam(s, "sistem", { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman"] });
      s.calistirKadar(2 * SAAT);
      expect(s.dunya.lojistik.akislar.every((a) => a.tasimaBedeliMiliSaat === undefined)).toBe(true);
      expect(s.dunya.bolgeler.every((b) => b.tasimaBedeliMiliSaat === undefined)).toBe(true);
      return s.durumOzeti();
    };
    expect(bolgeKos(v)).toBe(bolgeKos(kapali));
  });
});

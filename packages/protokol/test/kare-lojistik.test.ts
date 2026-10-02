/** L1.2: sevk planı ile gecikmeli stok varışı ayrı, yalnız gerçek sahibine görünür. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { SAAT } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { bitisikGrup, hucreSec, mulkSim, mulkVeri, tamam } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, deltaUygula, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";

const KAYNAK = "sn_m_ova#a";
const HEDEF = "sn_m_liman#a";
const kare = (s: Simulasyon, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});
const ozel = (s: Simulasyon, id: string) => kare(s, "a").bolgeler.find((b) => b.id === id)!.ozel!;

function sevkKur() {
  const f = parselFiksturuYukle("mini-6");
  const s = mulkSim(["a", "b"], mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 500_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok.tahil = 50_000;
  }));
  const hucreler = bitisikGrup(f, "sn_m_ova_merkez", "kirsal", 2);
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler, sinif: "kirsal" });
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_liman_merkez", hucreler: hucreSec(f, "sn_m_liman_merkez", "kirsal", 1), sinif: "kirsal" });
  tamam(s, "b", { tur: "parsel_al", ilce: "sn_m_gecit_merkez", hucreler: hucreSec(f, "sn_m_gecit_merkez", "kirsal", 1), sinif: "kirsal" });
  tamam(s, "a", { tur: "tesis_insa_hucre", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler });
  s.calistirKadar(s.dunya.insaatlar[0]!.bitis);
  tamam(s, "a", { tur: "ticaret_emri", bolge: HEDEF, mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
  s.calistirKadar(s.dunya.zaman + SAAT);
  const mal = s.ic.malIndeks["tahil"]!;
  const akis = s.dunya.lojistik.akislar.find((a) => a.mal === mal && s.dunya.bolgeler[a.kaynak]!.id === KAYNAK && s.dunya.bolgeler[a.hedef]!.id === HEDEF);
  expect(akis).toBeDefined();
  return { s, mal, akis: akis! };
}

describe("L1.2 özel lojistik görünümü", () => {
  it("gerçek sevk kaynakta hemen görünür, hedefe gecikmeli gelir; sevk durunca yoldaki gelen oran bir süre devam eder", () => {
    const { s, mal, akis } = sevkKur();
    const ilk = kare(s, "a");
    expect(ozel(s, KAYNAK).lojistik).toEqual({ sonCozum: s.dunya.lojistik.sonCozum, akislar: [{
      mal: "tahil", kaynak: KAYNAK, hedef: HEDEF, oranMiliSaat: akis.oranSaat, sureMs: akis.sureMs,
    }] });
    expect(akis.sureMs).toBeGreaterThan(0);
    expect(akis.sureMs).toBe(akis.yol.reduce((n, i) => n + s.dunya.kenarlar[i]!.sureMs, 0));
    expect(ozel(s, HEDEF).lojistik!.akislar).toEqual([]);
    expect(ozel(s, HEDEF).gelenOran).toEqual([]);
    expect(s.dunya.bolgeler[akis.hedef]!.stoklar[mal]!.gelenOran).toBe(0);
    const teslimler = s.dunya.kuyruk.filter((o) => o.veri.tur === "oran_delta" && o.veri.bolge === akis.hedef && o.veri.mal === mal && o.veri.delta > 0);
    expect(teslimler.length).toBeGreaterThan(0);
    const ilkTeslim = Math.min(...teslimler.map((o) => o.t));
    expect(ilkTeslim).toBeGreaterThan(s.dunya.zaman);
    s.calistirKadar(ilkTeslim - 1);
    expect(ozel(s, HEDEF).gelenOran).toEqual([]);
    s.calistirKadar(ilkTeslim);
    const gelen = s.dunya.bolgeler[akis.hedef]!.stoklar[mal]!.gelenOran;
    expect(gelen).toBeGreaterThan(0);
    expect(ozel(s, HEDEF).gelenOran).toEqual([["tahil", gelen]]);
    const vardi = kare(s, "a");
    expect(deltaUygula(ilk, kareFarki(ilk, vardi))).toEqual(vardi);

    tamam(s, "a", { tur: "ticaret_emri", bolge: HEDEF, mal: "tahil", yon: "ihracat", oranSaat: 0 });
    s.calistirKadar(s.dunya.zaman);
    expect(ozel(s, KAYNAK).lojistik!.akislar).toEqual([]);
    expect(ozel(s, HEDEF).gelenOran).toEqual([["tahil", gelen]]);
    const kesilmeler = s.dunya.kuyruk.filter((o) => o.veri.tur === "oran_delta" && o.veri.bolge === akis.hedef && o.veri.mal === mal && o.veri.delta < 0);
    expect(kesilmeler.length).toBeGreaterThan(0);
    s.calistirKadar(Math.max(...s.dunya.kuyruk.filter((o) => o.veri.tur === "oran_delta" && o.veri.bolge === akis.hedef && o.veri.mal === mal).map((o) => o.t)));
    expect(ozel(s, HEDEF).gelenOran).toEqual([]);
    expect(IlgiKaresiSemasi.parse(kare(s, "a"))).toEqual(kare(s, "a"));
  });

  it("akış sahibine ek olarak gerçek iki ucun sahipliği ve mülk kapsamı doğrulanır; eski isteğe bağlı alan yokluğu kabul edilir", () => {
    const { s, akis } = sevkKur();
    const once = kare(s, "a");
    const yabanci = s.dunya.bolgeler.find((b) => b.id === "sn_m_gecit#b")!.indeks;
    const kamu = s.dunya.bolgeler.find((b) => b.sahip === null && b.merkez === undefined)!.indeks;
    // Bozuk kayıtlar okuma sınırında özel veri sızdırmamalı; ekonomi çözümü taklit edilmez.
    s.dunya.lojistik.akislar.push(
      { ...akis, sahip: "b" },
      { ...akis, kaynak: yabanci },
      { ...akis, hedef: yabanci },
      { ...akis, kaynak: kamu },
      { ...akis, hedef: kamu },
      { ...akis, mal: s.ic.malIndeks["elektrik"]! },
      { ...akis, oranSaat: 0 },
    );
    expect(ozel(s, KAYNAK).lojistik).toEqual(once.bolgeler.find((b) => b.id === KAYNAK)!.ozel!.lojistik);
    for (const o of ["b", null]) {
      const k = kare(s, o);
      expect(k.bolgeler.find((b) => b.id === KAYNAK)!.ozel).toBeUndefined();
      expect(k.bolgeler.find((b) => b.id === HEDEF)!.ozel).toBeUndefined();
    }
    const b = kare(s, "b").bolgeler.find((b) => b.i === yabanci)!.ozel!;
    expect(b.lojistik!.akislar).toEqual([]);
    expect(b.gelenOran).toEqual([]);
    for (const b of kare(s, "a").bolgeler) if (s.dunya.bolgeler[b.i]!.merkez === undefined) {
      expect(b.ozel?.lojistik).toBeUndefined();
      expect(b.ozel?.gelenOran).toBeUndefined();
    }
    const eski = structuredClone(once);
    for (const b of eski.bolgeler) if (b.ozel) { delete b.ozel.lojistik; delete b.ozel.gelenOran; }
    expect(IlgiKaresiSemasi.parse(eski)).toEqual(eski);
    const eskiOzel = IlgiKaresiSemasi.shape.bolgeler.element.shape.ozel.unwrap().omit({ lojistik: true, gelenOran: true });
    const sahip = once.bolgeler.find((b) => b.id === KAYNAK)!.ozel!;
    expect(eskiOzel.safeParse(sahip).success).toBe(true);
    expect(eskiOzel.parse(sahip)).not.toHaveProperty("lojistik");
    expect(eskiOzel.parse(sahip)).not.toHaveProperty("gelenOran");
  });
});

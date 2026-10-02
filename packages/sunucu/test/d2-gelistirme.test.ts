/** D2: gerçek içerikle dar göç ve üretim güvencesi; tarayıcı/kalıcılık provası değildir. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { ikmalTalebi } from "../../cekirdek/src/askeri";
import { Simulasyon } from "../../cekirdek/src/motor";
import { isletmeBul } from "../../cekirdek/src/mulk";
import { sayacOlcekli } from "../../cekirdek/src/paraSayac";
import { anlikGoruntuOlustur, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikMiktar } from "../../cekirdek/src/stok";
import { SAAT } from "../../cekirdek/src/tipler";
import { bitisikGrup, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";

const F = parselFiksturuYukle("mini-6");
const LIMAN_IL = "sn_m_liman";
const LIMAN = `${LIMAN_IL}_merkez`;
const BOLGE = `${LIMAN_IL}#a`;

function veri() {
  return mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 2_000_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = {
      celik: 5_000_000, parca: 5_000_000, gida: 5_000_000,
      yakit: 5_000_000, muhimmat: 5_000_000,
    };
  });
}

const dugum = (s: Simulasyon) => s.dunya.bolgeler[isletmeBul(s.dunya, "a", LIMAN_IL)!.bolgeIndeksi]!;

describe("D2 gerçek içerik", () => {
  it("yalnız-ekle balık göçü izin ister; eski stok korunur, yeni mal sıfır başlar ve üretilip NPC'ye satılır", () => {
    const yeni = veri();
    // Deney için güncel paketten yalnız balık dilimi çıkarılır; tarihsel üretim yedeği değildir.
    const eski = structuredClone(yeni);
    eski.icerik.mallar = eski.icerik.mallar.filter((m) => m.id !== "balik");
    eski.icerik.yontemler = eski.icerik.yontemler.filter((y) => y.id !== "kiyi_balikciligi");
    eski.icerik.tesisTurleri = eski.icerik.tesisTurleri.filter((t) => t.id !== "balikcilik");
    delete eski.param.pazar.emilimSaat["balik"];
    delete eski.param.pazar.arzSaat["balik"];
    delete eski.param.mulk!.yapiYuva["balikcilik"];
    delete eski.param.mulk!.yapiInsaSaati!["balikcilik"];
    delete eski.param.mulk!.olcekHucre["balikcilik"];
    const s0 = mulkSim(["a"], eski);
    const hucreler = bitisikGrup(F, LIMAN, "kirsal", 2);
    tamam(s0, "a", { tur: "parsel_al", ilce: LIMAN, hucreler, sinif: "kirsal" });
    const stok0 = anlikMiktar(dugum(s0).stoklar[s0.ic.malIndeks["celik"]!]!, s0.dunya.zaman);
    const goruntu = anlikGoruntuOlustur(s0, kuralSurumuHesapla(eski));
    expect(() => Simulasyon.anlikGoruntudenYukle(yeni, goruntu)).toThrow(/kural surumu uyusmuyor/);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(yeni, goruntu, [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(r.goc.yalnizEkle).toBe(true);
    expect(r.goc.ihlaller).toEqual([]);
    expect(r.goc.eklenen.mallar).toEqual(["balik"]);
    expect(r.goc.eklenen.tesisTurleri).toEqual(["balikcilik"]);
    expect(r.goc.eklenen.yontemler).toEqual(["kiyi_balikciligi"]);
    const s = r.sim;
    const b = dugum(s);
    const balik = s.ic.malIndeks["balik"]!;
    expect(anlikMiktar(b.stoklar[s.ic.malIndeks["celik"]!]!, s.dunya.zaman)).toBe(stok0);
    expect(b.stoklar[balik]).toMatchObject({ miktar: 0, yerelOran: 0, gelenOran: 0 });
    expect(b.uretimToplam[balik]).toBe(0);
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: LIMAN, tesisTuru: "balikcilik", hucreler });
    s.calistirKadar(s.dunya.insaatlar[0]!.bitis + 2 * SAAT);
    expect(b.uretimToplam[balik]).toBeGreaterThan(0);
    const gelir0 = sayacOlcekli(s.dunya.mulk!.para!.musluk.ihracatNpc);
    tamam(s, "a", { tur: "ticaret_emri", bolge: BOLGE, mal: "balik", yon: "ihracat", oranSaat: 100_000 });
    s.calistirKadar(s.dunya.zaman + 3 * SAAT);
    expect(b.ticaretEmirleri.find((e) => e.mal === balik)!.gerceklesenSaat).toBeGreaterThan(0);
    expect(sayacOlcekli(s.dunya.mulk!.para!.musluk.ihracatNpc)).toBeGreaterThan(gelir0);
  });

  it("mülk birliği bitmiş Ordugâh ister; maliyet düşer, kuyruk kapasite tüketir, birlik biter ve çeyrek ikmal alır", () => {
    const s = mulkSim(["a"], veri());
    const hucreler = bitisikGrup(F, LIMAN, "kirsal", 3);
    tamam(s, "a", { tur: "parsel_al", ilce: LIMAN, hucreler, sinif: "kirsal" });
    const uret = (adet: number) => ({ tur: "birlik_uret" as const, bolge: BOLGE, birlik: "piyade_tumeni", adet });
    expect(ver(s, "a", uret(1))).toEqual({ tamam: false, hata: `ordugah gerekli: ${BOLGE}` });
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: LIMAN, tesisTuru: "ordugah", hucreler });
    expect(ver(s, "a", uret(1))).toEqual({ tamam: false, hata: `ordugah gerekli: ${BOLGE}` });
    s.calistirKadar(s.dunya.insaatlar[0]!.bitis);
    const b = dugum(s);
    const piyade = s.ic.birlikIndeks["piyade_tumeni"]!;
    const muhimmat = s.ic.malIndeks["muhimmat"]!;
    const once = anlikMiktar(b.stoklar[muhimmat]!, s.dunya.zaman);
    tamam(s, "a", uret(12));
    expect(anlikMiktar(b.stoklar[muhimmat]!, s.dunya.zaman)).toBe(once - 12 * s.ic.birlikler[piyade]!.maliyet["muhimmat"]!);
    expect(b.birlikler[piyade]).toBe(0);
    expect(s.dunya.partiler).toHaveLength(1);
    expect(ver(s, "a", uret(1))).toEqual({ tamam: false, hata: "ordugah kapasitesi yetersiz: 12 + 1 > 12" });
    tamam(s, "a", { tur: "savunma_emri", bolge: BOLGE, durus: "savunma" });
    expect(b.savunma.durus).toBe("savunma");
    s.calistirKadar(s.dunya.partiler[0]!.bitis);
    expect(b.birlikler[piyade]).toBe(12);
    expect(s.dunya.partiler).toEqual([]);
    const bi = isletmeBul(s.dunya, "a", LIMAN_IL)!.bolgeIndeksi;
    const ikmal = ikmalTalebi(s.dunya, s.baglam, bi);
    for (const [mal, miktar] of Object.entries(s.ic.birlikler[piyade]!.ikmal)) {
      expect(ikmal[s.ic.malIndeks[mal]!]).toBe(12 * miktar / 4);
    }
    expect(ver(s, "a", uret(1)).tamam).toBe(false);
    // Dinamik işletme düğümüne savaş ilanı bu dilimde açılmaz.
    expect(ver(s, "a", { tur: "savas_ilan", saldiranBolge: BOLGE, hedefBolge: "m_ova" }).tamam).toBe(false);
  });
});

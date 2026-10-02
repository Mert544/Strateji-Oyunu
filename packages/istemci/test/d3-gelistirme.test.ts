/** D3 için iki ürün senaryosu: gerçek tekstil ekonomisi ve gerçek WS ordu komutları. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { isletmeBul } from "../../cekirdek/src/mulk";
import { sayacOlcekli } from "../../cekirdek/src/paraSayac";
import { anlikGoruntuOlustur, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikMiktar } from "../../cekirdek/src/stok";
import { bitisikGrup, mulkSim, mulkVeri, tamam } from "../../cekirdek/test/mulk-yardimci";
import { katil, testSunucusu, token } from "../../sunucu/test/yardimci";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { icerikTablosu } from "../src/komut/tablo";
import { birlikTeklifi, OrduPaneli } from "../src/harita/ordu-panel";

const F = parselFiksturuYukle("mini-6");
const DAG_IL = "sn_m_dag";
const DAG = `${DAG_IL}_merkez`;
const DAG_BOLGE = `${DAG_IL}#a`;
const YENI_MALLAR = ["yun", "iplik", "kumas", "hazir_giyim"];
const YENI_YONTEMLER = ["mera_koyun_yun", "yun_egirme", "kumas_dokuma", "konfeksiyon"];

function veri() {
  return mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 2_000_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = {
      celik: 5_000_000, parca: 5_000_000, gida: 5_000_000,
      yakit: 5_000_000, muhimmat: 5_000_000,
    };
  });
}

async function bekle(kosul: () => boolean): Promise<void> {
  const son = Date.now() + 4000;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("D3 karesi zamanında gelmedi");
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("D3 birleşik geliştirme", () => {
  it("D2 stok kimlikleri korunur; sıfır yeni stoktan koyun→yün→iplik→kumaş→giyim üretilir ve NPC satış geliri doğar", () => {
    const yeni = veri();
    // Güncel içerikten D3 dilimi çıkarılır; tarihsel canlı veritabanı yedeği değildir.
    const eski = structuredClone(yeni);
    eski.icerik.mallar = eski.icerik.mallar.filter((m) => !YENI_MALLAR.includes(m.id));
    eski.icerik.yontemler = eski.icerik.yontemler.filter((y) => !YENI_YONTEMLER.includes(y.id));
    eski.icerik.tesisTurleri = eski.icerik.tesisTurleri.filter((t) => t.id !== "hafif_sanayi");
    eski.icerik.tesisTurleri.find((t) => t.id === "mera")!.yontemler = ["mera_hayvancilik"];
    for (const id of YENI_MALLAR) {
      delete eski.param.pazar.emilimSaat[id];
      delete eski.param.pazar.arzSaat[id];
    }
    delete eski.param.mulk!.yapiYuva["hafif_sanayi"];
    delete eski.param.mulk!.yapiInsaSaati!["hafif_sanayi"];
    delete eski.param.mulk!.olcekHucre["hafif_sanayi"];
    const s0 = mulkSim(["a"], eski);
    const meraHucre = bitisikGrup(F, DAG, "kirsal", 3);
    const tekstilHucre = bitisikGrup(F, DAG, "kirsal", 2, 2);
    tamam(s0, "a", { tur: "parsel_al", ilce: DAG, hucreler: [...meraHucre, ...tekstilHucre], sinif: "kirsal" });
    const b0 = s0.dunya.bolgeler[isletmeBul(s0.dunya, "a", DAG_IL)!.bolgeIndeksi]!;
    const stoklar0 = b0.stoklar.map((x) => anlikMiktar(x, s0.dunya.zaman));
    const goruntu = anlikGoruntuOlustur(s0, kuralSurumuHesapla(eski));
    expect(() => Simulasyon.anlikGoruntudenYukle(yeni, goruntu)).toThrow(/kural surumu uyusmuyor/);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(yeni, goruntu, [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(r.goc.yalnizEkle).toBe(true);
    expect(r.goc.ihlaller).toEqual([]);
    expect(r.goc.eklenen.mallar).toEqual(YENI_MALLAR);
    expect(r.goc.eklenen.yontemler).toEqual(YENI_YONTEMLER);
    expect(r.goc.eklenen.tesisTurleri).toEqual(["hafif_sanayi"]);
    const s = r.sim;
    const b = s.dunya.bolgeler[isletmeBul(s.dunya, "a", DAG_IL)!.bolgeIndeksi]!;
    for (const m of eski.icerik.mallar) {
      expect(s.ic.malIndeks[m.id]).toBe(s0.ic.malIndeks[m.id]);
      expect(anlikMiktar(b.stoklar[s.ic.malIndeks[m.id]!]!, s.dunya.zaman)).toBe(stoklar0[s0.ic.malIndeks[m.id]!]);
    }
    for (const id of YENI_MALLAR) expect(b.stoklar[s.ic.malIndeks[id]!]).toMatchObject({ miktar: 0, yerelOran: 0, gelenOran: 0 });
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "mera", yontem: "mera_koyun_yun", hucreler: meraHucre });
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "hafif_sanayi", yontem: "yun_egirme", hucreler: tekstilHucre });
    s.calistirKadar(Math.max(...s.dunya.insaatlar.map((x) => x.bitis)) + 8 * SAAT);
    const tekstil = b.tesisler.find((t) => t.tur === s.ic.tesisTuruIndeks["hafif_sanayi"])!;
    expect(b.uretimToplam[s.ic.malIndeks["yun"]!]).toBeGreaterThan(0);
    expect(b.uretimToplam[s.ic.malIndeks["iplik"]!]).toBeGreaterThan(0);
    for (const [yontem, cikti] of [["kumas_dokuma", "kumas"], ["konfeksiyon", "hazir_giyim"]]) {
      tamam(s, "a", { tur: "yontem_degistir", bolge: DAG_BOLGE, tesis: tekstil.id, yontem: yontem! });
      s.calistirKadar(s.dunya.zaman + 4 * SAAT);
      expect(b.uretimToplam[s.ic.malIndeks[cikti!]!]).toBeGreaterThan(0);
    }
    const gelir0 = sayacOlcekli(s.dunya.mulk!.para!.musluk.ihracatNpc);
    tamam(s, "a", { tur: "ticaret_emri", bolge: DAG_BOLGE, mal: "hazir_giyim", yon: "ihracat", oranSaat: 10_000 });
    s.calistirKadar(s.dunya.zaman + 2 * SAAT);
    expect(b.ticaretEmirleri.find((e) => e.mal === s.ic.malIndeks["hazir_giyim"])!.gerceklesenSaat).toBeGreaterThan(0);
    expect(sayacOlcekli(s.dunya.mulk!.para!.musluk.ihracatNpc)).toBeGreaterThan(gelir0);
  });

  it("gerçek WS ordu ekranı kendi stokuyla üretir, duruşu saklar, kuyruğu tamamlar; yabancı komutlar reddedilir ve özel ordu verisi sızmaz", async () => {
    const v = veri();
    const ts = await testSunucusu({ veri: v });
    let b: WsBaglanti | undefined;
    try {
      const sistem = await ts.baglan(SISTEM_OYUNCUSU);
      await katil(sistem, "a", []);
      await katil(sistem, "b", []);
      b = await WsBaglanti.ac({ url: ts.url, token: token("a"), istemciKimligi: "d3-ordu" });
      const hucreler = bitisikGrup(F, DAG, "kirsal", 3);
      expect((await b.parselAl({ tur: "parsel_al", ilce: DAG, hucreler, sinif: "kirsal" })).tamam).toBe(true);
      await bekle(() => b!.orduDurumu()?.bolgeler.length === 1);
      expect((await b.orduKomutu({ tur: "birlik_uret", bolge: DAG_BOLGE, birlik: "piyade_tumeni", adet: 2 })).tamam).toBe(false);
      expect((await b.tesisInsa({ tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "ordugah", hucreler })).tamam).toBe(true);
      await sistem.zamanIlerlet(ts.yazar.sim.dunya.insaatlar[0]!.bitis);
      await b.zamanEsitle();
      await bekle(() => b!.orduDurumu()?.bolgeler[0]?.ordugahSayisi === 1);
      const yabanci = await ts.baglan("b");
      await yabanci.abone([DAG_BOLGE]);
      const sim = ts.yazar.sim;
      const dugum = sim.dunya.bolgeler[isletmeBul(sim.dunya, "a", DAG_IL)!.bolgeIndeksi]!;
      const stoklar = structuredClone(dugum.stoklar);
      for (const komut of [
        { tur: "birlik_uret", bolge: DAG_BOLGE, birlik: "piyade_tumeni", adet: 2 } as const,
        { tur: "savunma_emri", bolge: DAG_BOLGE, durus: "geri_cekil" } as const,
      ]) {
        const r = await yabanci.komut(`yabanci-${komut.tur}`, komut);
        expect(r.tur === "komutSonucu" && r.sonuc.tamam).toBe(false);
        expect(r.tur === "komutSonucu" && !r.sonuc.tamam && r.sonuc.hata).toMatch(/bolge oyuncunun degil/);
      }
      expect(dugum.stoklar).toEqual(stoklar);
      expect(sim.dunya.partiler).toEqual([]);
      expect(dugum.savunma.durus).toBe("normal");
      const ic = icerikTablosu(v.icerik, v.param);
      const panel = new OrduPaneli({ ic, durum: () => b!.orduDurumu(), komut: (k) => b!.orduKomutu(k), degisti: () => {} });
      const once = b.orduDurumu()!;
      const teklif = birlikTeklifi(ic.birlikler.find((x) => x.id === "piyade_tumeni")!, 2, once.erkenOyunPpm);
      await panel.uret(DAG_BOLGE, "piyade_tumeni", 2);
      await bekle(() => b!.orduDurumu()?.bolgeler[0]?.partiler.length === 1);
      const uretim = b.orduDurumu()!.bolgeler[0]!;
      expect(uretim.kapasite).toBe(12);
      expect(uretim.partiler[0]).toMatchObject({ birlik: "piyade_tumeni", adet: 2 });
      expect(uretim.birlikler.get("piyade_tumeni")).toBe(0);
      expect(uretim.partiler[0]!.bitis - once.simZamani).toBe(teklif.sureMs);
      for (const [mal, miktar] of teklif.maliyet) {
        const id = ic.mallar[mal]!.id;
        expect(once.bolgeler[0]!.stoklar.get(id)! - uretim.stoklar.get(id)!).toBe(miktar);
      }
      expect(yabanci.kare?.bolgeler.find((x) => x.id === DAG_BOLGE)?.ozel).toBeUndefined();
      expect(yabanci.kare?.oyuncu?.partiler).toEqual([]);
      await panel.durus(DAG_BOLGE, "savunma");
      await bekle(() => b!.orduDurumu()?.bolgeler[0]?.durus === "savunma");
      await bekle(() => yabanci.kare?.bolgeler.find((x) => x.id === DAG_BOLGE)?.genel.durus === 1);
      await sistem.zamanIlerlet(uretim.partiler[0]!.bitis);
      await b.zamanEsitle();
      await bekle(() => b!.orduDurumu()?.bolgeler[0]?.birlikler.get("piyade_tumeni") === 2);
      const hazir = b.orduDurumu()!.bolgeler[0]!;
      expect(hazir.partiler).toEqual([]);
      expect(hazir.durus).toBe("savunma");
      expect([...hazir.ikmalSaat!]).toEqual([["gida", 1000], ["muhimmat", 400]]);
      expect(panel.html()).toContain("Saatlik ikmal:");
      expect(yabanci.sorunlar).toEqual([]);
      expect(b.sunucuHatalari).toEqual([]);
    } finally {
      b?.kapat();
      await ts.kapat();
    }
  });
});

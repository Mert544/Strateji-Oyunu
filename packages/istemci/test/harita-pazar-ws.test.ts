/** Mevcut ticaret_emri: controller → WsBaglanti → gerçek sunucu → stok/gelir → iptal/ret. */
import { expect, it } from "vitest";
import { mulkOyuncuBul, SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { bitisikSatilabilir, katil, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { PazarSatPaneli } from "../src/harita/pazar-sat";
import { icerikTablosu } from "../src/komut/tablo";

async function bekle(kosul: () => boolean): Promise<void> {
  const son = Date.now() + 4000;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("Pazar karesi zamanında gelmedi");
    await new Promise((r) => setTimeout(r, 10));
  }
}

it("limansız mülkün doğru düğümünde satış stok azaltır/gelir getirir, 0 emri iptal eder, geçersiz komut durumu değiştirmez", async () => {
  const veri = mulkVerisi();
  veri.param.mulk!.yeniOyuncu.baslangicStok.tahil = 50_000;
  const ts = await testSunucusu({ veri });
  let a: WsBaglanti | undefined;
  try {
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", []);
    await y.zamanIlerlet(SAAT);
    a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "pazar-ali" });
    const ilce = "sn_m_ova_merkez";
    const hucreler = bitisikSatilabilir(ts.yazar.sim, ilce);
    expect((await a.parselAl({ tur: "parsel_al", ilce, hucreler, sinif: "kirsal" })).tamam).toBe(true);
    await a.sahiplikAl(ilce);
    await bekle(() => !!a!.isletme()?.pazar?.some((k) => k.mal === "tahil"));
    const kaynak = a.isletme()!.pazar!.find((k) => k.mal === "tahil")!;
    const dugum = ts.yazar.sim.dunya.bolgeler.find((b) => b.id === kaynak.bolge)!;
    expect(dugum.etiketler).not.toContain("liman");
    expect(kaynak.uygun).toBe(true);
    expect(kaynak.bolge).toBe("sn_m_ova#ali");
    const p = new PazarSatPaneli({ ic: icerikTablosu(veri.icerik, veri.param), isletme: () => a!.isletme(), malAdi: (m) => m, ilAdi: (il) => il, referans: () => undefined, kalkan: () => false, ilkSatisOdulu: () => null, ilkDukkanSatisi: () => false, komut: (i) => a!.ticaretEmri(i), degisti: () => {}, bildir: () => {} });
    const stokOnce = kaynak.stokMili;
    await p.eylem({ eylem: "ac", bolge: kaynak.bolge, mal: "tahil" });
    p.girdi("1");
    await p.eylem({ eylem: "ver" });
    expect(p.durum.acik).toBeNull();
    await bekle(() => a!.isletme()?.pazar?.find((k) => k.mal === "tahil")?.emirMili === 1000);
    await y.zamanIlerlet(2 * SAAT);
    await a.zamanEsitle();
    await bekle(() => a!.ozet()!.simZamani >= 2 * SAAT);
    expect(a.isletme()!.pazar!.find((k) => k.mal === "tahil")!.stokMili).toBeLessThan(stokOnce);
    // İlk saat sınırı emri gerçekleşen orana alır; gelir sonraki aralıkta birikir.
    expect(mulkOyuncuBul(ts.yazar.sim.dunya, "ali")!.paraAkisi!.ihracat).toBeGreaterThan(0);
    const hazineOnce = a.isletme()!.hazineMili!;
    await y.zamanIlerlet(3 * SAAT);
    await a.zamanEsitle();
    await bekle(() => a!.ozet()!.simZamani >= 3 * SAAT);
    expect(a.isletme()!.hazineMili).toBeGreaterThan(hazineOnce);
    await p.eylem({ eylem: "ac", bolge: p.durum.bolge ?? kaynak.bolge, mal: "tahil" });
    await p.eylem({ eylem: "birak" });
    expect(p.durum.acik).toBeNull();
    await bekle(() => a!.isletme()?.pazar?.find((k) => k.mal === "tahil")?.emirMili === 0);
    const stokIptal = a.isletme()!.pazar!.find((k) => k.mal === "tahil")!.stokMili;
    const mal = ts.yazar.sim.ic.malIndeks["tahil"]!;
    const kalanOran = dugum.stoklar[mal]!.yerelOran + dugum.stoklar[mal]!.gelenOran;
    expect(mulkOyuncuBul(ts.yazar.sim.dunya, "ali")!.paraAkisi!.ihracat).toBe(0);
    await y.zamanIlerlet(4 * SAAT);
    await a.zamanEsitle();
    await bekle(() => a!.ozet()!.simZamani >= 4 * SAAT);
    expect(a.isletme()!.pazar!.find((k) => k.mal === "tahil")!.stokMili).toBe(stokIptal + kalanOran); // normal stok gideri sürer, satış gideri kalkmıştır
    expect(dugum.ticaretEmirleri).toHaveLength(0);
    expect(await a.pazarSatis({ bolge: kaynak.bolge, mal: "yok", oranSaat: 1000 })).toMatchObject({ tamam: false, mesaj: "Bu mal bulunamadı." });
    expect(dugum.ticaretEmirleri).toHaveLength(0);
    const gunluk = (await ts.depo.gunluk.oku(0)).filter((g) => g.komut.tur === "ticaret_emri");
    expect(gunluk.map((g) => g.komut)).toEqual(expect.arrayContaining([
      { tur: "ticaret_emri", bolge: kaynak.bolge, mal: "tahil", yon: "ihracat", oranSaat: 1000 },
      { tur: "ticaret_emri", bolge: kaynak.bolge, mal: "tahil", yon: "ihracat", oranSaat: 0 },
    ]));
  } finally {
    a?.kapat();
    await ts.kapat();
  }
});

it("boş ikinci işletmeden ağ stoğuyla satış açılır; yabancı stok ağa katılmaz ve aynı düğümde iptal edilir", async () => {
  const veri = mulkVerisi();
  veri.param.mulk!.yeniOyuncu.baslangicStok.tahil = 50_000;
  // Bu senaryo ağ satışını sınar; katılım ilçesiyle sınırlı ayrılmış arsa seçimini değil.
  veri.param.mulk!.yeniOyuncu.ayrilmisHucrePpm = 0;
  const ts = await testSunucusu({ veri });
  let a: WsBaglanti | undefined;
  try {
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", []);
    await katil(y, "veli", []);
    await y.zamanIlerlet(SAAT);
    a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "pazar-ag-ali" });
    for (const ilce of ["sn_m_ova_merkez", "sn_m_liman_merkez"]) {
      const alim = await a.parselAl({ tur: "parsel_al", ilce, hucreler: bitisikSatilabilir(ts.yazar.sim, ilce), sinif: "kirsal" });
      expect(alim.tamam, `${ilce}: ${JSON.stringify(alim)}`).toBe(true);
      await a.sahiplikAl(ilce);
    }
    const veli = await ts.baglan("veli");
    const yabanciIlce = "sn_m_gecit_merkez";
    const yabanciParsel = await veli.komut("veli-parsel", { tur: "parsel_al", ilce: yabanciIlce, hucreler: bitisikSatilabilir(ts.yazar.sim, yabanciIlce), sinif: "kirsal" });
    expect(yabanciParsel.tur === "komutSonucu" && yabanciParsel.sonuc.tamam, JSON.stringify(yabanciParsel)).toBe(true);
    await a.sahiplikAl(yabanciIlce);
    const bosBolge = "sn_m_liman#ali";
    await bekle(() => a!.isletme()?.pazar?.some((k) => k.bolge === bosBolge && k.mal === "tahil") === true);
    const kaynak = a.isletme()!.pazar!.find((k) => k.bolge === bosBolge && k.mal === "tahil")!;
    const mal = ts.yazar.sim.ic.malIndeks["tahil"]!;
    const yabanci = ts.yazar.sim.dunya.bolgeler.find((b) => b.id === "sn_m_gecit#veli")!;
    expect(yabanci.stoklar[mal]!.miktar).toBe(50_000);
    expect(kaynak.stokMili).toBe(0); // Başlangıç kiti yalnız ilk işletmede; ikinci işletme boş.
    expect(kaynak.uretimMili).toBe(0);
    expect(kaynak.ag).toEqual({ stokMili: 50_000, uretimMili: 0, gelenMili: null });
    expect(a.isletme()!.pazar!.some((k) => k.bolge.endsWith("#veli"))).toBe(false);
    const p = new PazarSatPaneli({ ic: icerikTablosu(veri.icerik, veri.param), isletme: () => a!.isletme(), malAdi: (m) => m, ilAdi: (il) => il, referans: () => undefined, kalkan: () => false, ilkSatisOdulu: () => null, ilkDukkanSatisi: () => false, komut: (i) => a!.ticaretEmri(i), degisti: () => {}, bildir: () => {} });
    await p.eylem({ eylem: "ac", bolge: bosBolge, mal: "tahil" });
    p.girdi("1");
    await p.eylem({ eylem: "ver" });
    expect(p.durum.acik).toBeNull();
    const bosDugum = ts.yazar.sim.dunya.bolgeler.find((b) => b.id === bosBolge)!;
    expect(bosDugum.ticaretEmirleri).toEqual(expect.arrayContaining([expect.objectContaining({ mal, yon: "ihracat", oranSaat: 1000 })]));
    expect(ts.yazar.sim.dunya.bolgeler.find((b) => b.id === "sn_m_ova#ali")!.ticaretEmirleri).toHaveLength(0);
    await bekle(() => a!.isletme()?.pazar?.find((k) => k.bolge === bosBolge && k.mal === "tahil")?.emirMili === 1000);
    await p.eylem({ eylem: "ac", bolge: p.durum.bolge ?? kaynak.bolge, mal: "tahil" });
    await p.eylem({ eylem: "birak" });
    expect(p.durum.acik).toBeNull();
    expect(bosDugum.ticaretEmirleri).toHaveLength(0);
  } finally {
    a?.kapat();
    await ts.kapat();
  }
});

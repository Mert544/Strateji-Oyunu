/** D4: gerçek ithalat komutu ve kayıtlı dükkân satışının genel ilçe görünümü. */
import { describe, expect, it } from "vitest";
import { mulkOyuncuBul, PPM, SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { IlgiKaresiSemasi, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar } from "@bolge/protokol";
import { anlikMiktar } from "../../cekirdek/src/stok";
import { sayacOlcekli } from "../../cekirdek/src/paraSayac";
import { mulkSim } from "../../cekirdek/test/mulk-yardimci";
import { bolgeBul, dukkanEkle, perakendeVeri } from "../../cekirdek/test/perakende-yardimci";
import { bitisikSatilabilir, katil, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { TedarikPaneli } from "../src/harita/tedarik-panel";
import { ilceYasamGorunumuKur, ilceYasamHtml } from "../src/harita/ilce-yasam-panel";
import { icerikTablosu } from "../src/komut/tablo";

const OVA = "sn_m_ova_merkez";
const BOLGE = "sn_m_ova#ali";

async function bekle(kosul: () => boolean): Promise<void> {
  const son = Date.now() + 4000;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("D4 karesi zamanında gelmedi");
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("D4 birleşik geliştirme", () => {
  it("WS tedarik paneli gerçek ithalatla stok/NPC gideri oluşturur; dolu emir yuvasında günceller, 0 ile durdurur ve geçersiz komutları reddeder", async () => {
    const v = mulkVerisi();
    v.param.mulk!.yeniOyuncu.hibe = 5_000_000_000;
    v.param.mulk!.yeniOyuncu.ayrilmisHucrePpm = 0;
    v.param.mulk!.yeniOyuncu.baslangicStok.tahil = 0;
    v.param.mulk!.temelEmirYuvasi = 1;
    const ts = await testSunucusu({ veri: v });
    let a: WsBaglanti | undefined;
    try {
      const sistem = await ts.baglan(SISTEM_OYUNCUSU);
      await katil(sistem, "ali", []);
      await katil(sistem, "veli", []);
      a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "d4-tedarik" });
      expect((await a.parselAl({ tur: "parsel_al", ilce: OVA, hucreler: bitisikSatilabilir(ts.yazar.sim, OVA), sinif: "kirsal" })).tamam).toBe(true);
      await a.sahiplikAl(OVA);
      await bekle(() => a!.tedarikDurumu()?.bolgeler.some((b) => b.id === BOLGE) === true);
      const sim = ts.yazar.sim;
      const dugum = sim.dunya.bolgeler.find((b) => b.id === BOLGE)!;
      const mi = sim.ic.malIndeks["tahil"]!;
      const p = new TedarikPaneli({ ic: icerikTablosu(v.icerik, v.param), durum: () => a!.tedarikDurumu(), referans: () => undefined, komut: (k) => a!.tedarikKomutu(k), degisti: () => {} });
      expect(p.ac({ bolge: BOLGE, mal: "tahil" })).toBe(true);
      expect(a.tedarikDurumu()!.bolgeler[0]!.yeniEmirUygun).toBe(true);
      const npc0 = sayacOlcekli(sim.dunya.mulk!.para!.lavabo.ithalatNpc);
      await p.eylem({ eylem: "ver", oran: "1" });
      await bekle(() => a!.tedarikDurumu()?.bolgeler[0]?.emirler[0]?.oranSaat === 1000);
      expect(dugum.ticaretEmirleri).toEqual([expect.objectContaining({ mal: mi, yon: "ithalat", oranSaat: 1000 })]);
      expect(a.tedarikDurumu()!.bolgeler[0]!.yeniEmirUygun).toBe(false);
      // Kabul stok eklemez; saat başındaki çözüm gerçekleşen oranı belirler.
      expect(anlikMiktar(dugum.stoklar[mi]!, sim.dunya.zaman)).toBe(0);
      await sistem.zamanIlerlet(2 * SAAT);
      await a.zamanEsitle();
      await bekle(() => a!.tedarikDurumu()!.simZamani >= 2 * SAAT);
      expect(a.tedarikDurumu()!.bolgeler[0]!.emirler[0]!.gerceklesenSaat).toBeGreaterThan(0);
      expect(a.tedarikDurumu()!.bolgeler[0]!.stoklar.get("tahil")).toBeGreaterThan(0);
      expect(mulkOyuncuBul(sim.dunya, "ali")!.paraAkisi!.ithalat).toBeGreaterThan(0);
      expect(sayacOlcekli(sim.dunya.mulk!.para!.lavabo.ithalatNpc)).toBeGreaterThan(npc0);

      const once = structuredClone(dugum.ticaretEmirleri);
      expect((await a.tedarikKomutu({ bolge: BOLGE, mal: "gida", oranSaat: 1000 })).tamam).toBe(false);
      expect((await a.tedarikKomutu({ bolge: BOLGE, mal: "elektrik", oranSaat: 1000 })).tamam).toBe(false);
      const yabanci = await ts.baglan("veli");
      const ret = await yabanci.komut("d4-yabanci-ithalat", { tur: "ticaret_emri", bolge: BOLGE, mal: "tahil", yon: "ithalat", oranSaat: 3000 });
      expect(ret.tur === "komutSonucu" && ret.sonuc.tamam).toBe(false);
      expect(dugum.ticaretEmirleri).toEqual(once);
      expect(p.ac({ bolge: BOLGE, mal: "gida" })).toBe(true);
      await p.eylem({ eylem: "ver", oran: "1" });
      expect(p.html()).toContain("yuvalar");
      expect(dugum.ticaretEmirleri).toEqual(once);
      expect(p.ac({ bolge: BOLGE, mal: "tahil" })).toBe(true);
      await p.eylem({ eylem: "ver", oran: "2" });
      await bekle(() => a!.tedarikDurumu()?.bolgeler[0]?.emirler[0]?.oranSaat === 2000);
      expect(dugum.ticaretEmirleri).toHaveLength(1);
      const stok = anlikMiktar(dugum.stoklar[mi]!, sim.dunya.zaman);
      await p.eylem({ eylem: "durdur" });
      await bekle(() => a!.tedarikDurumu()?.bolgeler[0]?.emirler.length === 0);
      expect(dugum.ticaretEmirleri).toEqual([]);
      expect(mulkOyuncuBul(sim.dunya, "ali")!.paraAkisi!.ithalat).toBe(0);
      expect(anlikMiktar(dugum.stoklar[mi]!, sim.dunya.zaman)).toBe(stok);
      const npcSon = sayacOlcekli(sim.dunya.mulk!.para!.lavabo.ithalatNpc);
      await sistem.zamanIlerlet(3 * SAAT);
      await a.zamanEsitle();
      await bekle(() => a!.tedarikDurumu()!.simZamani >= 3 * SAAT);
      expect(sayacOlcekli(sim.dunya.mulk!.para!.lavabo.ithalatNpc)).toBe(npcSon);
      const gunluk = (await ts.depo.gunluk.oku(0)).filter((g) => g.oyuncu === "ali" && g.komut.tur === "ticaret_emri");
      expect(gunluk.map((g) => g.komut)).toEqual([
        { tur: "ticaret_emri", bolge: BOLGE, mal: "tahil", yon: "ithalat", oranSaat: 1000 },
        // Reddedilen komutlar da gerçek sunucu günlüğünde tutulur.
        { tur: "ticaret_emri", bolge: BOLGE, mal: "gida", yon: "ithalat", oranSaat: 1000 },
        { tur: "ticaret_emri", bolge: BOLGE, mal: "elektrik", yon: "ithalat", oranSaat: 1000 },
        { tur: "ticaret_emri", bolge: BOLGE, mal: "tahil", yon: "ithalat", oranSaat: 2000 },
        { tur: "ticaret_emri", bolge: BOLGE, mal: "tahil", yon: "ithalat", oranSaat: 0 },
      ]);
      expect(a.sunucuHatalari).toEqual([]);
    } finally {
      a?.kapat();
      await ts.kapat();
    }
  });

  it("ilçe görünümü yalnız aynı ilçenin gerçek raf satışlarını toplar, özel veriyi sızdırmaz ve eski isteğe bağlı alanları kabul eder", () => {
    const v = perakendeVeri((v) => {
      v.param.mulk!.yeniOyuncu.baslangicStok = { gida: 3_000_000, ekmek: 2_000_000, celik: 5_000_000, parca: 5_000_000 };
    });
    const s = mulkSim(["a", "b", "c"], v);
    // Mevcut yardımcı tamamlanmış dükkân durumunu kurar; satışlar gerçek çözümden gelir.
    const a = dukkanEkle(s, "a", [{ mal: "gida" }, { mal: "ekmek" }], "bakkal", 0, OVA);
    const b = dukkanEkle(s, "b", [{ mal: "gida" }], "bakkal", 0, OVA);
    const diger = dukkanEkle(s, "c", [{ mal: "gida" }], "bakkal", 0, "sn_m_liman_merkez");
    s.calistirKadar(2 * SAAT);
    const oran = (e: typeof a, mal: string) => e.dukkan!.raf.filter((y) => y.mal === mal).reduce((n, y) => n + (y.satisOran ?? 0), 0);
    expect(oran(a, "gida")).toBeGreaterThan(0);
    expect(oran(b, "gida")).toBeGreaterThan(0);
    expect(oran(diger, "gida")).toBeGreaterThan(0);
    const kare = (o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, ilceIlgisiKur(s, [OVA], o), {});
    const sahip = kare("a");
    const genel = kare(null);
    const y = genel.ilceler!.find((c) => c.id === OVA)!.yasam!;
    const gida = y.karsilanma!.find((x) => x.mal === "gida")!;
    expect(gida.satisMiliSaat).toBe(oran(a, "gida") + oran(b, "gida"));
    expect(gida.satisMiliSaat).toBeLessThan(oran(a, "gida") + oran(b, "gida") + oran(diger, "gida"));
    expect(gida.karsilanmaPpm).toBe(Math.min(PPM, Math.floor(gida.satisMiliSaat * PPM / gida.talepMiliSaat)));
    expect(y.karsilanma!.find((x) => x.mal === "ekmek")!.satisMiliSaat).toBe(oran(a, "ekmek"));
    expect(sahip.ilceler!.find((c) => c.id === OVA)!.yasam!.karsilanma).toEqual(y.karsilanma);
    expect(genel.oyuncu).toBeUndefined();
    expect(genel.bolgeler.every((b) => b.ozel === undefined)).toBe(true);
    const bi = s.dunya.bolgeler.indexOf(bolgeBul(s, "b"));
    expect(sahip.bolgeler.find((b) => b.i === bi)!.ozel).toBeUndefined();
    expect(Object.keys(gida).sort()).toEqual(["karsilanmaPpm", "mal", "satisMiliSaat", "talepMiliSaat"]);
    expect(IlgiKaresiSemasi.parse(genel)).toEqual(genel);
    const ad = { ilceAdi: (x: string) => x, ilAdi: (x: string) => x, malAdi: (x: string) => x };
    expect(ilceYasamHtml(ilceYasamGorunumuKur(genel, OVA), ad)).toContain("Kayıtlı satış");
    const eski = structuredClone(sahip);
    delete eski.ilceler![0]!.yasam!.karsilanma;
    for (const b of eski.bolgeler) if (b.ozel?.isletme) delete b.ozel.isletme.emirYuvasi;
    expect(IlgiKaresiSemasi.parse(eski)).toEqual(eski);
    const g = ilceYasamGorunumuKur(eski, OVA)!;
    expect(g.karsilanma).toBeUndefined();
    expect(ilceYasamHtml(g, ad)).toContain("Bilinmiyor");
  });
});

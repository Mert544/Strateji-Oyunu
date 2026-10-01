/**
 * G6: inşa komutlarındaki isteğe bağlı `yontem` alanı sunucu komut yolunda (ws -> protokol şeması -> yazar -> günlük -> çekirdek) ALANI KAYBETMEDEN taşınır.
 * Kanıtlar: ws'ten giden `yontem` inşaat kaydına ve günlüğe ulaşır; inşaat bitince tesis o yöntemle başlar; yöntemsiz komutta alan HİÇ yazılmaz (eski davranış);
 * bilinmeyen yöntem reddi çekirdek iletisiyle döner ve DURUMU DEĞİŞTİRMEZ; dize olmayan alan protokolde reddedilir (komut yazara ulaşmaz);
 * kurtarma (görüntü + günlük) ve günlüğün baştan oynatılması aynı özeti verir. Gerçek G6-3 içeriğiyle (`degirmen`).
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { testSunucusu } from "./yardimci";
import { DEGIRMEN, bitisikCiftler, yeniIcerikliMulkVerisi } from "./yontem-yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

const ILCE = "sn_m_ova_merkez";
const TOHUM = 3;

describe("yontem alani: ws -> gunluk -> cekirdek", () => {
  it("yontemli tesis_insa_hucre ve yapi_yerlestir: insaat kaydina ve gunluge ulasir; bitince tesis o yontemle baslar; yontemsizde alan yok", async () => {
    ts = await testSunucusu({ veri: yeniIcerikliMulkVerisi(), tohum: TOHUM });
    const yz = ts.yazar;
    const adm = await ts.baglan(SISTEM_OYUNCUSU);
    for (const o of ["ali", "veli"]) {
      const r = await adm.komut(`katil-${o}`, { tur: "oyuncu_katil", oyuncu: o, bolgeler: [], ilce: ILCE });
      expect(r.tur === "komutSonucu" && r.sonuc.tamam).toBe(true);
    }
    await adm.zamanIlerlet(SAAT);
    const ali = await ts.baglan("ali");
    const veli = await ts.baglan("veli");
    const [[h1, h2], cift] = bitisikCiftler(yz.sim, ILCE, 2) as [[string, string], [string, string]];
    // ali: ayri arsa alir, tesis_insa_hucre + yontem; veli: yapi_yerlestir (arsa+insa tek komut), yontemsiz.
    expect(((await ali.komut("p1", { tur: "parsel_al", ilce: ILCE, hucreler: [h1, h2], sinif: "kirsal" })) as { sonuc?: { tamam: boolean } }).sonuc?.tamam).toBe(true);
    const r1 = await ali.komut("i1", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: [h1, h2], yontem: DEGIRMEN });
    expect(r1.tur === "komutSonucu" && r1.sonuc.tamam, JSON.stringify(r1)).toBe(true);
    const ins = yz.sim.dunya.insaatlar.filter((i) => i.sahip === "ali");
    expect(ins).toHaveLength(1);
    expect(ins[0]?.yontem).toBe(DEGIRMEN);
    // Gunluk: komut alani kaybolmadan yazildi.
    const gunluk = await ts.depo.gunluk.oku(0);
    const kayit = gunluk.find((g) => g.anahtar === "i1");
    expect((kayit?.komut as { yontem?: string } | undefined)?.yontem).toBe(DEGIRMEN);
    // Yontemsiz komut: alan hic yazilmaz (insaat kaydi ve gunluk).
    const r2 = await veli.komut("i2", { tur: "yapi_yerlestir", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: cift, sinif: "kirsal" });
    expect(r2.tur === "komutSonucu" && r2.sonuc.tamam, JSON.stringify(r2)).toBe(true);
    const insV = yz.sim.dunya.insaatlar.find((i) => i.sahip === "veli");
    expect(insV).toBeDefined();
    expect("yontem" in (insV as object)).toBe(false);
    const kayitV = (await ts.depo.gunluk.oku(0)).find((g) => g.anahtar === "i2");
    expect("yontem" in (kayitV?.komut as object)).toBe(false);
    // Insaat bitince tesisler dogru yontemde.
    await adm.zamanIlerlet(2 * 24 * SAAT);
    const yontemler = (oyuncu: string): string[] => yz.sim.dunya.bolgeler.filter((b) => b.sahip === oyuncu && b.merkez !== undefined).flatMap((b) => b.tesisler.map((t) => yz.sim.ic.yontemler[t.yontem]?.id ?? "?"));
    expect(yontemler("ali")).toEqual([DEGIRMEN]);
    expect(yontemler("veli")).toEqual(["standart_gida_isleme"]); // yontemsiz: tur varsayilani
  }, 30_000);

  it("gecersiz yontem: bilinmeyen kimlik cekirdek iletisiyle reddedilir ve durumu degistirmez; dize olmayan alan protokolde reddedilir (yazara ulasmaz)", async () => {
    ts = await testSunucusu({ veri: yeniIcerikliMulkVerisi(), tohum: TOHUM });
    const yz = ts.yazar;
    const adm = await ts.baglan(SISTEM_OYUNCUSU);
    await adm.komut("katil-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE });
    await adm.zamanIlerlet(SAAT);
    const ali = await ts.baglan("ali");
    const [h1, h2] = bitisikCiftler(yz.sim, ILCE, 1)[0] as [string, string];
    await ali.komut("p1", { tur: "parsel_al", ilce: ILCE, hucreler: [h1, h2], sinif: "kirsal" });
    const once = yz.ozet().durumOzeti;
    const gunlukOnce = (await ts.depo.gunluk.oku(0)).length;
    const kotu = await ali.komut("i1", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: [h1, h2], yontem: "olmayan_yontem" });
    expect(kotu.tur === "komutSonucu" && !kotu.sonuc.tamam && kotu.sonuc.hata).toBe("bilinmeyen yontem: olmayan_yontem");
    expect(yz.sim.dunya.insaatlar).toHaveLength(0);
    expect(yz.ozet().durumOzeti).toBe(once);
    expect((await ts.depo.gunluk.oku(0)).length).toBe(gunlukOnce + 1); // basarisiz komut gunlukte (yazma-once-gunluk), sonucu ayni
    // Tur uyumsuz yontem: ayni yol.
    const uyumsuz = await ali.komut("i2", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: [h1, h2], yontem: DEGIRMEN });
    expect(uyumsuz.tur === "komutSonucu" && !uyumsuz.sonuc.tamam && uyumsuz.sonuc.hata).toBe(`yontem bu tesis turunde yok: ${DEGIRMEN}`);
    // Dize olmayan yontem: sema reddi, yazara ve gunluge ulasmaz.
    const sayi = (await ts.depo.gunluk.oku(0)).length;
    const b = ali.bekle((m) => m.tur === "hata");
    ali.gonder({ tur: "komut", anahtar: "i3", komut: { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: [h1, h2], yontem: 5 } });
    const h = await b;
    expect(h.tur === "hata" && h.kod).toBe("gecersiz_mesaj");
    expect((await ts.depo.gunluk.oku(0)).length).toBe(sayi);
    expect(yz.sim.dunya.insaatlar).toHaveLength(0);
  }, 30_000);

  it("kurtarma ve gunlugun bastan oynatilmasi: yontemli insaat ayni t'de ayni ozeti verir (tesis yontemi dahil)", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const ac = (): Promise<DunyaYazari> => DunyaYazari.ac({ veri: yeniIcerikliMulkVerisi(), tohum: TOHUM, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    const y = await ac();
    const gonder = async (o: string, anahtar: string, komut: Komut): Promise<void> => {
      const p = y.komutGonder(o, "test", anahtar, komut);
      await y.birTur();
      expect((await p).sonuc.tamam, anahtar).toBe(true);
    };
    await gonder(SISTEM_OYUNCUSU, "k1", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut);
    saat.ilerlet(SAAT);
    await y.birTur();
    const [h1, h2] = bitisikCiftler(y.sim, ILCE, 1)[0] as [string, string];
    await gonder("ali", "p1", { tur: "parsel_al", ilce: ILCE, hucreler: [h1, h2], sinif: "kirsal" });
    await gonder("ali", "i1", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: [h1, h2], yontem: DEGIRMEN });
    saat.ilerlet(3 * 24 * SAAT);
    await y.birTur();
    const t = y.sim.dunya.zaman;
    const canli = y.ozet().durumOzeti;
    expect(y.sim.dunya.bolgeler.flatMap((b) => b.tesisler).map((x) => y.sim.ic.yontemler[x.yontem]?.id)).toContain(DEGIRMEN);
    // 1) Gunlugun sifirdan oynatilmasi
    const yeni = Simulasyon.olustur(yeniIcerikliMulkVerisi(), TOHUM);
    for (const k of await depo.gunluk.oku(0)) yeni.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
    yeni.calistirKadar(t);
    expect(yeni.durumOzeti()).toBe(canli);
    // 2) Kurtarma (kill -9 benzeri: kapatmadan): goruntu + kalan gunluk
    const k = await ac();
    expect(k.sim.dunya.insaatlar.map((i) => i.yontem)).toEqual([DEGIRMEN]); // kurtarma son komut aninda: insaat gunlukten yeniden kuruldu, yontem korundu
    k.sim.calistirKadar(t);
    expect(k.sim.durumOzeti()).toBe(canli);
    expect(k.sim.dunya.bolgeler.flatMap((b) => b.tesisler).map((x) => k.sim.ic.yontemler[x.yontem]?.id)).toContain(DEGIRMEN);
    await k.kapat();
  }, 30_000);
});

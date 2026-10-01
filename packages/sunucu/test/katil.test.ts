/**
 * `katil {anahtar, ilce?}` istemci mesajı: oyuncu kendi katılımını yapar (mülk kipi). Oyuncu kimliği mesajdan değil
 * doğrulanmış kimlikten gelir; komut "sistem" olarak damgalanır. Bir kez katılınır; hız sınırı ve yetişme reddi uygulanır.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { GelistirmeKimligi } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { DuvarSaati, VARSAYILAN_DUNYA_EPOCH_MS } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import { SIR, kareBekle, mulkVerisi, testSunucusu, token } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

const ILCE = "sn_m_ova_merkez";

describe("katil mesaji", () => {
  it("oyuncu kendi katilimini yapar; sistem damgali oyuncu_katil gunluge girer; ikinci katilim reddedilir, ayni anahtar tekrar doner", async () => {
    ts = await testSunucusu({ veri: mulkVerisi() });
    const ali = await ts.baglan("ali");
    const r = await ali.katil("k1");
    expect(r.tur).toBe("komutSonucu");
    if (r.tur === "komutSonucu") {
      expect(r.sonuc.tamam).toBe(true);
      expect(r.komut).toEqual({ tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] });
      expect(r.tekrar).toBe(false);
    }
    expect(ts.yazar.sim.dunya.oyuncular.map((o) => o.id)).toEqual(["ali"]);
    const gunluk = await ts.depo.gunluk.oku(0);
    expect(gunluk).toHaveLength(1);
    expect(gunluk[0]).toMatchObject({ oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali" }, istemci: "katil:ali", anahtar: "k1" });

    const ikinci = await ali.katil("k2"); // yeni anahtar: cekirdegin hatasi
    expect(ikinci.tur === "komutSonucu" && !ikinci.sonuc.tamam && ikinci.sonuc.hata).toMatch(/zaten katilmis/);
    const ayni = await ali.katil("k1"); // ayni anahtar: ilk sonuc
    expect(ayni.tur === "komutSonucu" && ayni.tekrar && ayni.sonuc.tamam).toBe(true);
  });

  it("baskasi adina katilim olmaz: mesajdaki oyuncu alani yok sayilir; yonetici ve eski komut yolu degismez", async () => {
    ts = await testSunucusu({ veri: mulkVerisi() });
    const ali = await ts.baglan("ali");
    ali.gonder({ tur: "katil", anahtar: "x1", oyuncu: "veli", ilce: undefined });
    const r = await ali.bekle((m) => m.tur === "komutSonucu" && m.anahtar === "x1");
    expect(r.tur === "komutSonucu" && r.komut).toMatchObject({ oyuncu: "ali" });
    expect(ts.yazar.sim.dunya.oyuncular.map((o) => o.id)).toEqual(["ali"]);
    // `komut` yoluyla baskasini katmak hala yalniz yonetici.
    const veli = await ts.baglan("veli");
    const k = await ali.komut("x2", { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: [] });
    expect(k.tur === "hata" && k.kod).toBe("yetki");
    // Ayni anahtar ve ayni istemci kimligi baska oyuncuda carpismaz (kapsam oyuncuya ozel).
    const veli2 = await ts.baglan("veli", "istemci-ali");
    const rv = await veli2.katil("x1");
    expect(rv.tur === "komutSonucu" && rv.sonuc.tamam && !rv.tekrar).toBe(true);
    expect(ts.yazar.sim.dunya.oyuncular.map((o) => o.id)).toEqual(["ali", "veli"]);
    await veli.kapat();
    // Yonetici katil gondermez; kendi yolunu kullanir.
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    const ry = await y.katil("y1");
    expect(ry.tur === "hata" && ry.kod).toBe("yetki");
    const yk = await y.komut("y2", { tur: "oyuncu_katil", oyuncu: "ayse", bolgeler: [] });
    expect(yk.tur === "komutSonucu" && yk.sonuc.tamam).toBe(true);
  });

  it("ilce verilirse bedava yurt o ilcede verilir; gecersiz ilce basarisiz sonucla doner", async () => {
    const v = mulkVerisi();
    if (v.param.mulk) v.param.mulk.yeniOyuncu.yurtHucre = 4;
    ts = await testSunucusu({ veri: v });
    const ali = await ts.baglan("ali");
    await ali.abone([]);
    const bad = await (await ts.baglan("veli")).katil("v1", "yok_ilce");
    expect(bad.tur === "komutSonucu" && bad.sonuc.tamam).toBe(false);
    const r = await ali.katil("k1", ILCE);
    expect(r.tur === "komutSonucu" && r.sonuc.tamam).toBe(true);
    ali.gonder({ tur: "abone", ilceler: [ILCE] });
    await kareBekle(ali, () => (ali.kare?.oyuncu?.mulk?.ilceHucre ?? []).some(([i, n]) => i === ILCE && n > 0));
    expect(ts.yazar.sim.dunya.oyuncular.map((o) => o.id)).toEqual(["ali"]);
  });

  it("sistem_odul yalniz yonetici: oyuncudan yetki hatasi (tutar tasimaz komut)", async () => {
    ts = await testSunucusu({ veri: mulkVerisi() });
    const ali = await ts.baglan("ali");
    const r = await ali.komut("o1", { tur: "sistem_odul", oyuncu: "ali", kavram: "ilk_hasat" });
    expect(r.tur === "hata" && r.kod).toBe("yetki");
    expect((await ts.depo.gunluk.oku(0)).some((k) => k.anahtar === "o1")).toBe(false);
  });

  it("yalniz mulk kipinde gecerli: bolge kipinde gecersiz_mesaj", async () => {
    ts = await testSunucusu();
    const ali = await ts.baglan("ali");
    const r = await ali.katil("k1");
    expect(r.tur === "hata" && r.kod).toBe("gecersiz_mesaj");
    expect(ts.yazar.sim.dunya.oyuncular).toHaveLength(0);
  });

  it("hiz siniri uygulanir (yeni anahtar jeton harcar; reddedilen gunluge girmez)", async () => {
    ts = await testSunucusu({ veri: mulkVerisi(), hizSiniri: { kapasite: 1, saniyeBasina: 0.0001 } });
    const ali = await ts.baglan("ali");
    const r1 = await ali.katil("k1");
    expect(r1.tur).toBe("komutSonucu");
    const r2 = await ali.katil("k2");
    expect(r2.tur === "hata" && r2.kod).toBe("hiz_siniri");
    expect((await ts.depo.gunluk.oku(0)).map((k) => k.anahtar)).toEqual(["k1"]);
    const tekrar = await ali.katil("k1"); // islenmis anahtar jeton harcamaz
    expect(tekrar.tur === "komutSonucu" && tekrar.tekrar).toBe(true);
  });

  it("yetisirken 'yetisiyor' ile reddedilir; bitince ayni anahtarla katilir", async () => {
    let ms = VARSAYILAN_DUNYA_EPOCH_MS + SAAT;
    const depo = bellekDeposu();
    const ac = (ek: { kanca?: () => Promise<void> } = {}) =>
      DunyaYazari.ac({ veri: mulkVerisi(), tohum: 1, depo, saat: new DuvarSaati(1, { duvar: () => ms }), commitAraligiMs: 15, ilerlemeAraligiMs: 0, ...(ek.kanca ? { yetismeAdimKancasi: ek.kanca } : {}) });
    const y1 = await ac();
    while (y1.yetisiyor) await y1.birTur();
    await y1.kapat();
    ms += 3 * 24 * SAAT;
    let birak!: () => void;
    const kapi = new Promise<void>((c) => (birak = c));
    const y2 = await ac({ kanca: () => kapi });
    const sunucu = await sunucuBaslat({ yazar: y2, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0 });
    const ali = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("ali"), "ali-ist");
    try {
      expect(ali.hosgeldin?.yetisiyor).toBe(true);
      const bitis = ali.bekle((m) => m.tur === "durum" && !m.yetisiyor);
      const r = await ali.katil("k1");
      expect(r.tur === "hata" && r.kod).toBe("yetisiyor");
      expect(y2.sim.dunya.oyuncular).toHaveLength(0);
      birak();
      await bitis;
      const r2 = await ali.katil("k1");
      expect(r2.tur === "komutSonucu" && r2.sonuc.tamam).toBe(true);
      expect(y2.sim.dunya.oyuncular.map((o) => o.id)).toEqual(["ali"]);
    } finally {
      birak();
      await ali.kapat();
      await sunucu.kapat();
    }
  }, 30_000);
});

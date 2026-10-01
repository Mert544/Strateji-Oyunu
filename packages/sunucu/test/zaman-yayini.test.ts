/**
 * Periyodik `zaman` yayını (yalnız `t` değiştiğinde de istemci saati kaymasın) ve merhabadaki `kuralSurumu` kuralı.
 * Zaman yayını sahte duvar işlevi ve tur (`birTur`) ile sürülür; gerçek bekleme yoktur.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { GelistirmeKimligi } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { ElleSaat } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import type { CalisanSunucu } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import { SIR, testSunucusu, token, veri } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
let ek: { sunucu: CalisanSunucu; istemciler: SunucuIstemcisi[] } | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
  if (ek) {
    for (const i of ek.istemciler) await i.kapat();
    await ek.sunucu.kapat();
    ek = null;
  }
});

const yayinlar = (i: SunucuIstemcisi) => i.gelenler.filter((m) => m.tur === "zaman" && m.yayin === true);

describe("periyodik zaman yayini", () => {
  it("aralik dolunca yalniz kimligi dogrulanmis baglantilara gider; sim zamani guncel; zamanIste yaniti yayin degildir", async () => {
    let duvar = 1_000;
    const saat = new ElleSaat();
    const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo: bellekDeposu(), saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    const sunucu = await sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0, duvarMs: () => duvar, zamanYayinAraligiMs: 15_000 });
    const url = `ws://127.0.0.1:${sunucu.port}`;
    const ali = await SunucuIstemcisi.baglan(url, token("ali"), "ali-ist");
    const kimliksiz = await SunucuIstemcisi.baglan(url); // merhaba yok
    ek = { sunucu, istemciler: [ali, kimliksiz] };

    duvar += 14_999;
    await yazar.birTur();
    await ali.ozet(); // onceki mesajlar islendi
    expect(yayinlar(ali)).toHaveLength(0);

    saat.ilerlet(5 * SAAT);
    duvar += 1;
    const bekle = ali.bekle((m) => m.tur === "zaman" && m.yayin === true);
    await yazar.birTur();
    const m = await bekle;
    expect(m).toMatchObject({ tur: "zaman", yayin: true, simZamani: 5 * SAAT, hiz: 0, istemciGonderim: -1 });
    // Ayni aralikta ikinci yayin yok; sonraki aralikta yeniden.
    await yazar.birTur();
    await ali.ozet();
    expect(yayinlar(ali)).toHaveLength(1);
    duvar += 15_000;
    const bekle2 = ali.bekle((x) => x.tur === "zaman" && x.yayin === true);
    await yazar.birTur();
    await bekle2;
    expect(yayinlar(ali)).toHaveLength(2);
    // Merhabasiz baglanti hic zaman mesaji almaz (kisa bir yerlesme payi: olumsuz denetim).
    await new Promise((r) => setTimeout(r, 30));
    expect(kimliksiz.gelenler.filter((x) => x.tur === "zaman")).toHaveLength(0);
    // zamanIste yaniti yayin degildir.
    const yanit = ali.bekle((x) => x.tur === "zaman" && x.yayin === undefined);
    ali.gonder({ tur: "zamanIste", istemciGonderim: 123 });
    expect(await yanit).toMatchObject({ tur: "zaman", istemciGonderim: 123, simZamani: 5 * SAAT });
  });

  it("zamanYayinAraligiMs 0 yayini kapatir", async () => {
    let duvar = 0;
    const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo: bellekDeposu(), saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    const sunucu = await sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0, duvarMs: () => duvar, zamanYayinAraligiMs: 0 });
    const ali = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("ali"), "ali-ist");
    ek = { sunucu, istemciler: [ali] };
    duvar += 10 * 60_000;
    await yazar.birTur();
    await ali.ozet();
    expect(yayinlar(ali)).toHaveLength(0);
  });
});

describe("merhaba kuralSurumu: istemci gondermezse kabul, gonderip uyusmazsa kural_surumu hatasi", () => {
  it("gondermeyen istemci kabul edilir; hosgeldin'deki kuralSurumu baglayicidir", async () => {
    ts = await testSunucusu();
    const ist = await ts.baglan("ali"); // kuralSurumu gonderilmez
    expect(ist.hosgeldin?.kuralSurumu).toBe(ts.yazar.kuralSurumu);
    expect(ist.hosgeldin?.kuralSurumu).toMatch(/^k1-[0-9a-f]{16}$/);
    // Dogru deger gonderen de kabul edilir.
    const dogru = await SunucuIstemcisi.baglan(ts.url, token("veli"), "veli-ist", ts.yazar.kuralSurumu);
    ts.istemciler.push(dogru);
    expect(dogru.hosgeldin).not.toBeNull();
  });

  it("uyusmayan deger gonderen istemci kural_surumu hatasiyla reddedilir ve baglanti kapanir", async () => {
    ts = await testSunucusu();
    await expect(SunucuIstemcisi.baglan(ts.url, token("ali"), "ali-ist", "k1-0000000000000000")).rejects.toThrow(/kural_surumu/);
  });
});

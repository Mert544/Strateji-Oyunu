/**
 * "Sen yokken" WebSocket sözleşmesi: `hosgeldin.donusOzeti` (yetişme bitmiş, oyuncu, yokluk >= 1 sa, başka açık bağlantı yok),
 * yetişme sürerken bağlananlara `donusOzeti` mesajı (durum mesajından sonra), `ozetOkundu {t}` çapayı ilerletir, çıkışta
 * `sonGorulen` yazılır. Sahte saat; gerçek bekleme yok.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { GelistirmeKimligi } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { DuvarSaati, VARSAYILAN_DUNYA_EPOCH_MS } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import { KUZEY, SIR, katil, mulkVerisi, testSunucusu, token } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

/** Sunucu tarafının oyuncunun kapanışını (çıkış çapası) işlemesini bekler. */
async function baglantilarBosalsin(t: TestSunucusu): Promise<void> {
  for (let n = 0; n < 4000 && t.sunucu.baglantiSayisi > 1; n++) await new Promise((r) => setTimeout(r, 5));
  await t.yazar.profilBekle();
}

describe("donusOzeti WebSocket", () => {
  it("hosgeldin'de ozet; K0'da yok; ozetOkundu sonrasi yok; ikinci sekmede yok; yonetici icin hic yok", async () => {
    ts = await testSunucusu();
    const y = await ts.baglan(SISTEM_OYUNCUSU, "yonetici");
    await katil(y, "ali", KUZEY);
    // İlk giriş (çapa yok): özet yok.
    const c1 = await ts.baglan("ali", "ali-1");
    expect(c1.hosgeldin?.donusOzeti).toBeUndefined();
    await y.zamanIlerlet(2 * SAAT);
    const r = await c1.komut("v1", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ahir" }); // 36 dk: yokluk sırasında biter
    expect(r.tur === "komutSonucu" && r.sonuc.tamam).toBe(true);
    await c1.kapat(); // çıkış: sonGorulen
    await baglantilarBosalsin(ts);
    expect((await ts.yazar.donusOzeti("ali"))).toBeNull(); // yokluk yok (0 sa)

    await y.zamanIlerlet(10 * SAAT);
    const c2 = await ts.baglan("ali", "ali-2");
    const o = c2.hosgeldin?.donusOzeti;
    expect(o?.bant).toBe("K2");
    expect(o?.aralik.bitisT).toBe(10 * SAAT);
    expect(o?.net.kalemler.satis).toBeTypeOf("number");
    expect(o && o.net.kalemler.satis + o.net.kalemler.gider + o.net.kalemler.diger).toBe(o?.net.hazineFarki);
    expect(o?.oneri).toBeNull();
    expect(o?.maddeler.some((m) => m.blok === "B2" && m.sablon === "donus.bitti.insaat")).toBe(true);
    // Yönetici hosgeldin'inde özet yok.
    expect(y.hosgeldin?.donusOzeti).toBeUndefined();
    // İkinci sekme: oyuncunun başka açık bağlantısı var: özet yok.
    const c3 = await ts.baglan("ali", "ali-3");
    expect(c3.hosgeldin?.donusOzeti).toBeUndefined();
    // Özet okundu (sunucu çapayı o ana çeker); ardından çıkış-giriş: yokluk 0 -> özet yok.
    c2.gonder({ tur: "ozetOkundu", t: o?.aralik.bitisT ?? 0 });
    await c2.ozet(); // ozetOkundu işlendi (mesajlar bağlantı başına sırayla)
    await c2.kapat();
    await c3.kapat();
    await baglantilarBosalsin(ts);
    const c4 = await ts.baglan("ali", "ali-4");
    expect(c4.hosgeldin?.donusOzeti).toBeUndefined();
    const capa = await ts.depo.profil.capaOku("ali");
    expect(capa?.ozetOkunduT).toBe(10 * SAAT);
    expect(capa?.sonGorulen?.t).toBeGreaterThanOrEqual(10 * SAAT);
    // Yönetici ozetOkundu göndermesi etkisiz (hata değil).
    y.gonder({ tur: "ozetOkundu", t: 5 });
    await y.ozet();
    expect(await ts.depo.profil.capaOku(SISTEM_OYUNCUSU)).toBeNull();
  });

  it("yetisme surerken baglanan oyuncuya ozet yetisme bitince 'donusOzeti' mesajiyla gelir (durum mesajindan sonra)", async () => {
    let ms = VARSAYILAN_DUNYA_EPOCH_MS + 2 * SAAT;
    const depo = bellekDeposu();
    const ac = (ek: { kanca?: () => Promise<void> } = {}) =>
      DunyaYazari.ac({ veri: mulkVerisi(), tohum: 1, depo, saat: new DuvarSaati(1, { duvar: () => ms }), commitAraligiMs: 15, ilerlemeAraligiMs: 0, ...(ek.kanca ? { yetismeAdimKancasi: ek.kanca } : {}) });
    const y1 = await ac();
    while (y1.yetisiyor) await y1.birTur();
    const p = y1.komutGonder(SISTEM_OYUNCUSU, "t", "katil", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] });
    await y1.birTur();
    await p;
    ms += SAAT;
    await y1.birTur();
    await y1.cikis("ali");
    await y1.kapat(); // kapanış: çapa yazıldı
    ms += 3 * 24 * SAAT;

    let birak!: () => void;
    const kapi = new Promise<void>((c) => (birak = c));
    const y2 = await ac({ kanca: () => kapi });
    const sunucu = await sunucuBaslat({ yazar: y2, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0 });
    const ali = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("ali"), "ali-ist");
    try {
      expect(ali.hosgeldin?.yetisiyor).toBe(true);
      expect(ali.hosgeldin?.donusOzeti).toBeUndefined(); // yetişme bitmeden özet üretilmez
      const ozetMesaji = ali.bekle((m) => m.tur === "donusOzeti");
      birak();
      const m = await ozetMesaji;
      expect(m.tur).toBe("donusOzeti");
      if (m.tur === "donusOzeti") {
        expect(m.ozet.bant).toBe("K3"); // 3 gün
        expect(m.ozet.aralik.bitisT).toBe(ms - VARSAYILAN_DUNYA_EPOCH_MS);
        expect(m.ozet.oneri).toBeNull();
      }
      const iDurum = ali.gelenler.findIndex((x) => x.tur === "durum" && !x.yetisiyor);
      const iOzet = ali.gelenler.findIndex((x) => x.tur === "donusOzeti");
      expect(iDurum).toBeGreaterThanOrEqual(0);
      expect(iOzet).toBeGreaterThan(iDurum);
      expect(ali.gelenler.filter((x) => x.tur === "donusOzeti")).toHaveLength(1); // bir kez
    } finally {
      birak();
      await ali.kapat();
      await sunucu.kapat();
    }
  }, 30_000);
});

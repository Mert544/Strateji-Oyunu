/**
 * (d) Başarısız komutlar günlükte: yazma-önce-günlük düzeninde komut uygulanmadan önce yazılır, sonucu bilinmez;
 * bu yüzden başarısızlar da günlüğe girer. Bu test üç yolun aynı `durumOzeti`'ni verdiğini gösterir (aynı t'de):
 *   1. canlı yazar,
 *   2. TÜM günlüğün (başarısızlar dahil) baştan yeniden oynatılması: her kayıt canlıdakiyle AYNI sonucu (aynı hata
 *      metni) verir,
 *   3. yalnız başarılıların `Simulasyon.yenidenOynat` ile oynatılması + `calistirKadar(t)` (docs/06 §14 sözleşmesi).
 * Ek olarak kurtarma (görüntü + kalan günlük) ve sunucu botlarıyla periyodik görüntü.
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { Komut, KomutSonucu } from "@bolge/cekirdek";
import { botOlustur } from "@bolge/botlar";
import { bellekDeposu } from "../src/depo/bellek";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import type { KomutYaniti } from "../src/yazar";
import { GUNEY, KUZEY, veri } from "./yardimci";

const TOHUM = 7;

/** Çoğu başarısız, bir kısmı başarılı komut karışımı (deterministik). */
function komutlar(adim: number): Array<[string, Komut]> {
  return [
    ["ali", { tur: "tesis_insa", bolge: KUZEY[adim % 3] as string, tesisTuru: adim % 2 ? "ciftlik" : "gida_fabrikasi" }],
    ["ali", { tur: "tesis_insa", bolge: "m_dag", tesisTuru: "ciftlik" }], // yabancı bölge
    ["veli", { tur: "vergi_ayarla", oranPpm: 2_000_000 }], // aralık dışı
    ["veli", { tur: "vergi_ayarla", oranPpm: 100_000 + adim * 1000 }],
    ["veli", { tur: "arastir", teknoloji: "yok_teknoloji" }],
    ["ali", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade", adet: 1 }],
    ["veli", { tur: "ticaret_emri", bolge: "m_sehir", mal: "tahil", yon: "ihracat", oranSaat: 5_000 }],
    ["yabanci", { tur: "vergi_ayarla", oranPpm: 1 }], // bilinmeyen oyuncu
    ["ali", { tur: "savunma_emri", bolge: "m_gecit", durus: adim % 2 ? "savunma" : "normal" }],
  ];
}

async function kos(): Promise<{ yazar: DunyaYazari; depo: ReturnType<typeof bellekDeposu>; yanitlar: KomutYaniti[]; saat: ElleSaat }> {
  const depo = bellekDeposu();
  const saat = new ElleSaat();
  const yazar = await DunyaYazari.ac({
    veri: veri(),
    tohum: TOHUM,
    depo,
    saat,
    goruntuAraligiMs: 20 * SAAT,
    botlar: [{ bot: botOlustur("tuccar", "bot0", 1), bolgeler: [] }],
  });
  const yanitlar: KomutYaniti[] = [];
  const gonder = (o: string, k: Komut, a: string) => yazar.komutGonder(o, "test", a, k).then((y) => void yanitlar.push(y));
  const bekleyen: Promise<void>[] = [
    gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY }, "k1"),
    gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: ["m_dag", "m_sehir"] }, "k2"),
    gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "bot0", bolgeler: ["m_col"] }, "k3"),
  ];
  await yazar.birTur();
  for (let adim = 1; adim <= 16; adim++) {
    saat.ilerlet(adim * 3 * SAAT - 7 * 60_000);
    komutlar(adim).forEach(([o, k], i) => bekleyen.push(gonder(o, k, `a${adim}-${i}`)));
    await yazar.birTur();
    saat.ilerlet(adim * 3 * SAAT);
    await yazar.birTur();
    await yazar.birTur(); // bot komutları
  }
  await Promise.all(bekleyen);
  return { yazar, depo, yanitlar, saat };
}

describe("basarisiz komutlar gunlukte", () => {
  it("tum gunluk, yalniz basarililar ve canli dunya ayni t'de ayni ozeti verir", async () => {
    const { yazar, depo, yanitlar } = await kos();
    const T = yazar.sim.dunya.zaman;
    expect(T).toBe(48 * SAAT);
    const canli = yazar.sim.durumOzeti();
    const gunluk = await depo.gunluk.oku(0);
    expect(gunluk.map((k) => k.seq)).toEqual(gunluk.map((_, i) => i + 1));

    // 1. Tüm günlük (başarısızlar dahil): her kayıt canlıdakiyle aynı sonucu verir.
    const canliSonuc = new Map<number, KomutSonucu>();
    for (const y of yanitlar) canliSonuc.set(y.seq, y.sonuc);
    const tum = Simulasyon.olustur(veri(), TOHUM);
    const basarililar = [];
    let basarisiz = 0;
    for (const k of gunluk) {
      const r = tum.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
      const beklenen = canliSonuc.get(k.seq);
      if (beklenen) expect(r).toEqual(beklenen); // bot komutlarının yanıtını test tutmaz; yine de aynı yoldan geçer
      if (r.tamam) basarililar.push({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
      else basarisiz++;
    }
    expect(basarisiz).toBeGreaterThan(40);
    expect(basarililar.length).toBeGreaterThan(20);
    expect(gunluk.some((k) => k.oyuncu === "bot0")).toBe(true);
    tum.calistirKadar(T);
    expect(tum.durumOzeti()).toBe(canli);

    // 2. Yalnız başarılılar (çekirdeğin kendi günlüğü de budur).
    expect(basarililar).toEqual(yazar.sim.gunluk);
    const yalniz = Simulasyon.yenidenOynat(veri(), TOHUM, basarililar);
    yalniz.calistirKadar(T);
    expect(yalniz.durumOzeti()).toBe(canli);

    // 3. Kurtarma: son görüntü + kalan günlük (başarısızlar dahil tek tek uygulanır).
    const kurtarilan = await DunyaYazari.ac({ veri: veri(), tohum: 999, depo, saat: new ElleSaat() });
    expect(kurtarilan.kurtarma.goruntuSeq).not.toBeNull();
    expect(kurtarilan.kurtarma.goruntuSeq).toBeGreaterThan(0);
    expect(kurtarilan.kurtarma.kalanKayit).toBeGreaterThan(0);
    expect(kurtarilan.kurtarma.kalanBasarisiz).toBeGreaterThan(0);
    expect(kurtarilan.seq).toBe(yazar.seq);
    kurtarilan.sim.calistirKadar(T);
    expect(kurtarilan.sim.durumOzeti()).toBe(canli);
    // İdempotans tablosu da kurtarıldı (görüntüdeki kopya + kalan günlük): eski anahtar yeniden uygulanmaz.
    const tekrar = await kurtarilan.komutGonder("ali", "test", "a1-0", { tur: "vergi_ayarla", oranPpm: 1 });
    expect(tekrar.tekrar).toBe(true);
    const asil = yanitlar.find((y) => y.seq === tekrar.seq);
    expect(asil?.komut).toEqual(tekrar.komut);
  });

  it("gunluk yazilamazsa hicbir komut uygulanmaz ve yazar durur (fail-stop)", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat });
    const ozet0 = yazar.sim.durumOzeti();
    depo.gunluk.ekle = async () => {
      throw new Error("disk dolu");
    };
    let olumcul: Error | null = null;
    yazar.olumculHata((e) => (olumcul = e));
    const p = yazar.komutGonder(SISTEM_OYUNCUSU, "t", "x", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    await yazar.birTur();
    await expect(p).rejects.toThrow(/disk dolu/);
    expect(olumcul).not.toBeNull();
    expect(yazar.sim.durumOzeti()).toBe(ozet0);
    expect(yazar.seq).toBe(0);
    await expect(yazar.komutGonder("ali", "t", "y", { tur: "vergi_ayarla", oranPpm: 1 })).rejects.toThrow(/yazar durdu/);
  });

  it("kural surumu degisirse kurtarma reddedilir (donem siniri)", async () => {
    const depo = bellekDeposu();
    await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat: new ElleSaat() });
    const v = veri();
    v.param.ekonomi.varsayilanVergiPpm += 1;
    await expect(DunyaYazari.ac({ veri: v, tohum: 1, depo, saat: new ElleSaat() })).rejects.toThrow(/kural surumu/);
  });
});

void GUNEY;

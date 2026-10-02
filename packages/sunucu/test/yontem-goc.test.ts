/**
 * G6: kural sürümü göçü (`gocIzni` / CLI `--goc`) YÖNTEM sona eklemesiyle (docs/06 §14.2): eski görüntü, G6-3 içeriğinin (`degirmen`, `ekmek_firini`, `kepek_gubresi`,
 * `sut_kepekli`: yöntem listesinin SONU) yüklü olduğu içerikle açılır. Mülk kipi (yöntemler orada seçilir) ve bölge kipi (yöntem `mulkKipi` süzgeciyle seçilemez kalır).
 * Bayraksız açılış kural uyuşmazlığıyla durur; araya ekleme ve kaldırma reddedilir; göçten sonra mevcut tesis yöntemini korur, yeni yöntem seçilebilir, ikinci açılışta göç yoktur.
 * Eski içerik iki yolla gelir: (1) `g6Oncesi(içerik)` (yeni içerikten son dört yöntemin çıkarılması), (2) çekirdeğin DONDURULMUŞ gerçek eski görüntüsü
 * (`cekirdek/test/fikstur-goc/mulk-v2-g6oncesi.json`: G6 öncesi çekirdekle üretilmiş, 3 oyuncu, para defteri ve 7 kamu kasası; testin içinde bugünkü kodla üretilmez).
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, kuralSurumuHesapla } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, IcerikKimlikTablosu, Komut } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { ElleSaat } from "../src/saat";
import type { DunyaYazari } from "../src/yazar";
import { KAMU_KUCUK } from "../../cekirdek/test/kamu-yardimci";
import { mulkVeriTam } from "../../cekirdek/test/mulk-yardimci";
import { SEMA_SURUMU } from "../src/depo/tipler";
import { ac, komutlar } from "./goc-yardimci";
import { GUNEY, KUZEY, veri } from "./yardimci";
import { DEGIRMEN, FIRIN, YONTEM_KIMLIKLERI, bitisikCiftler, eskiIcerikliMulkVerisi, g6Oncesi, yeniIcerikliMulkVerisi } from "./yontem-yardimci";

const ILCE = "sn_m_ova_merkez";
const acik: DunyaYazari[] = [];
afterEach(async () => {
  for (const y of acik.splice(0)) await y.kapat().catch(() => undefined);
});

/** Eski (yöntemsiz) mülk içeriğiyle: ali katılır, parsel alır, varsayılan yöntemli gıda fabrikası kurar; 3 gün koşar; düzgün kapatır. */
async function eskiMulkDunyasi(depo = bellekDeposu()): Promise<{ depo: ReturnType<typeof bellekDeposu>; t: number; ozet: string; seq: number }> {
  const saat = new ElleSaat();
  const y = await ac(depo, eskiIcerikliMulkVerisi(), saat);
  let n = 0;
  const gonder = async (o: string, k: Komut): Promise<void> => {
    const p = y.komutGonder(o, "test", `m${n++}`, k);
    await y.birTur();
    const r = await p;
    expect(r.sonuc.tamam, JSON.stringify(k) + JSON.stringify(r.sonuc)).toBe(true);
  };
  await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut);
  saat.ilerlet(SAAT);
  await y.birTur();
  const [h] = bitisikCiftler(y.sim, ILCE, 1) as [string[]];
  await gonder("ali", { tur: "parsel_al", ilce: ILCE, hucreler: h, sinif: "kirsal" });
  await gonder("ali", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: h });
  saat.ilerlet(3 * 24 * SAAT);
  await y.birTur();
  const ozet = y.ozet();
  await y.kapat();
  return { depo, t: ozet.t, ozet: ozet.durumOzeti, seq: ozet.seq };
}

/** G6 oncesi icerikle (bolge kipi: `veri()` - G6-3 yontemleri) 30 sim-saat kosan, duzgun kapatilmis dunya (komutlar `goc-yardimci` ile ayni). */
async function eskiBolgeDunyasi(): Promise<{ depo: ReturnType<typeof bellekDeposu>; t: number; ozet: string; seq: number }> {
  const depo = bellekDeposu();
  const saat = new ElleSaat();
  const y = await ac(depo, g6Oncesi(veri()), saat);
  let n = 0;
  const gonder = async (o: string, k: Komut): Promise<void> => {
    const p = y.komutGonder(o, "test", `b${n++}`, k);
    await y.birTur();
    await p;
  };
  await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
  await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY });
  for (let adim = 1; adim <= 10; adim++) {
    saat.ilerlet(adim * 3 * SAAT);
    for (const [o, k] of komutlar(adim)) await gonder(o, k);
  }
  const ozet = y.ozet();
  await y.kapat();
  return { depo, t: ozet.t, ozet: ozet.durumOzeti, seq: ozet.seq };
}

const tesisYontemleri = (y: DunyaYazari): string[] => y.sim.dunya.bolgeler.filter((b) => b.sahip === "ali" && b.merkez !== undefined).flatMap((b) => b.tesisler).map((t) => y.sim.ic.yontemler[t.yontem]?.id ?? "?");

describe("yontem sona ekleme gocu: mulk kipi (G6 oncesi icerik = guncel icerik - 6 yontem)", () => {
  it("kural surumu degisir; bayraksiz acilis durur (eski icerikle acilis calisir); bayrakla goc: yalniz-ekle, eklenen yontemler listelenir, tesis yontemini korur, zaman/seq ayni", async () => {
    const e = await eskiMulkDunyasi();
    const eskiKural = kuralSurumuHesapla(eskiIcerikliMulkVerisi());
    const yeniKural = kuralSurumuHesapla(yeniIcerikliMulkVerisi());
    expect(yeniKural).not.toBe(eskiKural);
    await expect(ac(e.depo, yeniIcerikliMulkVerisi(), new ElleSaat())).rejects.toThrow(/kural surumu uyusmuyor/);
    const eski = await ac(e.depo, eskiIcerikliMulkVerisi(), new ElleSaat());
    expect(eski.kurtarma.durumOzeti).toBe(e.ozet);
    await eski.kapat();

    const y = await ac(e.depo, yeniIcerikliMulkVerisi(), new ElleSaat(), { gocIzni: true });
    acik.push(y);
    expect(y.kurtarma.goc).toMatchObject({ eskiKuralSurumu: eskiKural, yeniKuralSurumu: yeniKural, yalnizEkle: true, ihlalSayisi: 0 });
    expect(y.kurtarma.goc?.eklenen.yontemler).toEqual(YONTEM_KIMLIKLERI);
    expect(y.kurtarma.simZamani).toBe(e.t);
    expect(y.kurtarma.seq).toBe(e.seq);
    expect(y.kuralSurumu).toBe(yeniKural);
    expect(tesisYontemleri(y)).toEqual(["standart_gida_isleme"]); // mevcut tesis yontemini korudu (indeksler kaymadi)
    // Yeni yontemler dizinin SONUNDA.
    const eskiSayi = eskiIcerikliMulkVerisi().icerik.yontemler.length;
    expect(y.sim.ic.yontemIndeks[DEGIRMEN]).toBe(eskiSayi);
    expect(y.sim.ic.yontemIndeks[FIRIN]).toBe(eskiSayi + 1);
  });

  it("goc sonrasi yeni yontem SECILEBILIR (yontem_degistir) ve tesis o yontemle calisir; kapatinca ikinci acilis bayraksiz, goc yok, ayni ozet", async () => {
    const e = await eskiMulkDunyasi();
    const saat = new ElleSaat();
    const y = await ac(e.depo, yeniIcerikliMulkVerisi(), saat, { gocIzni: true });
    const dugum = y.sim.dunya.bolgeler.find((b) => b.sahip === "ali" && b.merkez !== undefined);
    const tesis = dugum?.tesisler[0];
    expect(tesis).toBeDefined();
    saat.ilerlet(e.t + 6 * SAAT);
    const p = y.komutGonder("ali", "test", "ydg", { tur: "yontem_degistir", bolge: dugum?.id as string, tesis: tesis?.id as number, yontem: DEGIRMEN });
    await y.birTur();
    expect((await p).sonuc.tamam).toBe(true);
    expect(tesisYontemleri(y)).toEqual([DEGIRMEN]);
    const ozet = y.ozet();
    await y.kapat();
    const y2 = await ac(e.depo, yeniIcerikliMulkVerisi(), new ElleSaat());
    acik.push(y2);
    expect(y2.kurtarma.goc).toBeNull();
    expect(y2.kurtarma.durumOzeti).toBe(ozet.durumOzeti);
    expect(tesisYontemleri(y2)).toEqual([DEGIRMEN]);
  });

  it("araya ekleme reddedilir (yalniz-ekle ihlali); yontem kaldirma (yeni icerikle yazilan dunya eski icerikle) reddedilir", async () => {
    const e = await eskiMulkDunyasi();
    const araya: CekirdekVeriPaketi = yeniIcerikliMulkVerisi();
    // Yeni yontemlerden birini (degirmen) listenin ORTASINA tasi: mevcut yontemlerin indeksi kayar.
    const i0 = araya.icerik.yontemler.findIndex((y) => y.id === DEGIRMEN);
    const y0 = araya.icerik.yontemler.splice(i0, 1)[0];
    expect(y0?.id).toBe(DEGIRMEN);
    araya.icerik.yontemler.splice(1, 0, y0 as NonNullable<typeof y0>);
    await expect(ac(e.depo, araya, new ElleSaat(), { gocIzni: true })).rejects.toThrow(/yalniz-ekle ihlali/);
    // Depo dokunulmadi: eski icerikle acilis ayni ozeti verir.
    const eski = await ac(e.depo, eskiIcerikliMulkVerisi(), new ElleSaat());
    expect(eski.kurtarma.durumOzeti).toBe(e.ozet);
    await eski.kapat();

    // Kaldirma: once goc, sonra (yeni kuralla yazilmis dunya) yontemsiz icerikle acma.
    const g = await ac(e.depo, yeniIcerikliMulkVerisi(), new ElleSaat(), { gocIzni: true });
    await g.kapat();
    await expect(ac(e.depo, eskiIcerikliMulkVerisi(), new ElleSaat(), { gocIzni: true })).rejects.toThrow(new RegExp(`kaldirilmis kimlik: ${DEGIRMEN}`));
  });
});

describe("yontem sona ekleme gocu: bolge kipi (mulkKipi suzgeci)", () => {
  it("eski bolge dunyasi goc eder (eklenen yontemler listede), ama mulkKipi yontemleri tur listesinde YOK: yontem_degistir reddedilir", async () => {
    const e = await eskiBolgeDunyasi();
    const yeni: CekirdekVeriPaketi = veri(); // guncel (G6-3) icerik; bolge kipi (parsel yok)
    expect(kuralSurumuHesapla(yeni)).not.toBe(kuralSurumuHesapla(g6Oncesi(veri())));
    await expect(ac(e.depo, yeni, new ElleSaat())).rejects.toThrow(/kural surumu uyusmuyor/);
    const saat = new ElleSaat();
    const y = await ac(e.depo, yeni, saat, { gocIzni: true });
    acik.push(y);
    expect(y.kurtarma.goc).toMatchObject({ yalnizEkle: true, ihlalSayisi: 0 });
    expect(y.kurtarma.goc?.eklenen.yontemler).toEqual(YONTEM_KIMLIKLERI);
    const gida = y.sim.ic.tesisTurleri[y.sim.ic.tesisTuruIndeks["gida_fabrikasi"] as number];
    expect(gida?.yontemler).toEqual(["standart_gida_isleme"]); // iki yontem suzuldu (tur listesinde kimlik dizisi)
    // Bolge kipinde secilemez (komut reddi, durum degismez).
    const dugum = y.sim.dunya.bolgeler.find((b) => b.sahip === "ali" && b.tesisler.some((t) => t.tur === y.sim.ic.tesisTuruIndeks["gida_fabrikasi"]));
    const tesis = dugum?.tesisler.find((t) => t.tur === y.sim.ic.tesisTuruIndeks["gida_fabrikasi"]);
    expect(tesis).toBeDefined();
    saat.ilerlet(e.t + 6 * SAAT);
    const p = y.komutGonder("ali", "test", "ydg", { tur: "yontem_degistir", bolge: dugum?.id as string, tesis: tesis?.id as number, yontem: DEGIRMEN });
    await y.birTur();
    const r = await p;
    expect(r.sonuc.tamam).toBe(false);
    expect(r.sonuc.tamam === false && r.sonuc.hata).toBe(`yontem bu tesis turunde yok: ${DEGIRMEN}`);
    expect(y.sim.dunya.bolgeler.flatMap((b) => b.tesisler).every((t) => y.sim.ic.yontemler[t.yontem]?.id !== DEGIRMEN)).toBe(true);
  });
});

describe("G6 oncesi DONDURULMUS mulk goruntusu (gercek eski cekirdek ciktisi; para defteri + 7 kamu kasasi)", () => {
  const dizin = new URL("../../cekirdek/test/fikstur-goc/", import.meta.url);
  const metin = readFileSync(new URL("mulk-v2-g6oncesi.json", dizin), "utf8");
  const ust = JSON.parse(readFileSync(new URL("mulk-v2-g6oncesi.ust.json", dizin), "utf8")) as { kural: string; ozet: string; zaman: number; kasaSayisi: number; tablo: IcerikKimlikTablosu };
  /** Uretici (`uret-mulk-v2.ts`) ile ayni veri paketi, ama GUNCEL (G6-3) icerikle. */
  const guncel = (): CekirdekVeriPaketi =>
    mulkVeriTam((x) => {
      const m = x.param.mulk;
      if (!m) throw new Error("mulk parametresi yok");
      m.yeniOyuncu.hibe = 2_000_000_000;
      m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000, tahil: 200_000 };
      m.yeniOyuncu.indirimliYapiSayisi = 0;
      m.yeniOyuncu.ayrilmisHucrePpm = 0;
      m.esZamanliInsaat = 10;
      m.araziVergisiHaftalikPpm = 100_000;
      m.kamu = structuredClone(KAMU_KUCUK);
    });
  const depoKur = (): ReturnType<typeof bellekDeposu> => {
    const d = bellekDeposu();
    void d.goruntu.kaydet({ seq: 0, simZamani: ust.zaman, kuralSurumu: ust.kural, semaSurumu: SEMA_SURUMU, durumOzeti: ust.ozet, metin, ek: { tohum: 7, idempotans: [] } });
    return d;
  };

  it("gercek kural surumu degisti (G6-3): bayraksiz acilis kural uyusmuyor; gocIzni + eski tablo ile yalniz-ekle goc, 6 yeni yontem (G6-3 dortlusu + G8-1 ikilisi), para defteri ve kasalar yerinde, ozet denetimi gecti", async () => {
    expect(kuralSurumuHesapla(guncel())).not.toBe(ust.kural);
    await expect(ac(depoKur(), guncel(), new ElleSaat())).rejects.toThrow(/kural surumu uyusmuyor/);
    const depo = depoKur();
    const y = await ac(depo, guncel(), new ElleSaat(), { gocIzni: true, gocEskiTablo: ust.tablo });
    acik.push(y);
    expect(y.kurtarma.goc).toMatchObject({ eskiKuralSurumu: ust.kural, yalnizEkle: true, ihlalSayisi: 0 });
    expect(y.kurtarma.goc?.eklenen.yontemler).toEqual(YONTEM_KIMLIKLERI);
    expect(y.kurtarma.simZamani).toBe(ust.zaman);
    expect(y.sim.dunya.mulk?.para?.kasalar).toHaveLength(ust.kasaSayisi);
    expect((y.sim.dunya.mulk?.para?.musluk.hibe.n ?? 0) > 0).toBe(true);
    // Yeni yontemler yontem dizisinin SONUNDA (eski tablo uzunlugundan baslar); eski kimlikler yerinde.
    ust.tablo.yontemler.forEach((id, i) => expect(y.sim.ic.yontemler[i]?.id, `yontem ${i}`).toBe(id));
    YONTEM_KIMLIKLERI.forEach((id, i) => expect(y.sim.ic.yontemIndeks[id]).toBe(ust.tablo.yontemler.length + i));
    // Eski dunyanin cifligi yontemini korudu; yeni yontem turde olmadigi icin cifte secilemez (yontem biliniyor, tur listesinde yok).
    const ciftlikDugumu = y.sim.dunya.bolgeler.find((b) => b.merkez !== undefined && b.tesisler.some((t) => y.sim.ic.tesisTurleri[t.tur]?.id === "ciftlik"));
    const ciftlik = ciftlikDugumu?.tesisler.find((t) => y.sim.ic.tesisTurleri[t.tur]?.id === "ciftlik");
    expect(ciftlik).toBeDefined();
    expect(["geleneksel_tarim", "mekanize_tarim"]).toContain(y.sim.ic.yontemler[ciftlik?.yontem as number]?.id);
    const sahip = ciftlikDugumu?.sahip as string;
    const p = y.komutGonder(sahip, "test", "yd1", { tur: "yontem_degistir", bolge: ciftlikDugumu?.id as string, tesis: ciftlik?.id as number, yontem: DEGIRMEN });
    await y.birTur();
    const r = await p;
    expect(r.sonuc).toEqual({ tamam: false, hata: `yontem bu tesis turunde yok: ${DEGIRMEN}` });
    // Gocten sonra kapatinca ikinci acilis bayraksiz ve gocsuz.
    const ozet = y.ozet();
    await y.kapat();
    acik.length = 0;
    const y2 = await ac(depo, guncel(), new ElleSaat());
    acik.push(y2);
    expect(y2.kurtarma.goc).toBeNull();
    expect(y2.kurtarma.durumOzeti).toBe(ozet.durumOzeti);
  });
});

/**
 * "Sen yokken" en küçük dilim (docs/arastirma/donus-deneyimi.md §5, D1-D3; docs/12 Y-37), sunucu tarafı.
 * §5.6: Test 1 (sunum kapalıyken `durumOzeti` aynı), Test 2 (net sonuç = hazine farkı birebir), Test 3 (aynı girdi aynı özet, golden),
 * Test 8 (sunucu 1/8/48 saat kapalı kalıp yetişince özet kesintisiz çalışan sunucudakiyle aynı; kill -9 sonrası çift kayıt yok).
 * Hepsi sahte duvar saatiyle koşar (gerçek bekleme yok).
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikMiktar } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { DonusOzetiSemasi } from "@bolge/protokol";
import type { DonusOzeti } from "@bolge/protokol";
import { bellekDeposu } from "../src/depo/bellek";
import { dosyaDeposu } from "../src/depo/dosya";
import type { Depo, OzetKaydi } from "../src/depo/tipler";
import { OZET_KAYIT_TAVANI } from "../src/depo/tipler";
import { oyuncuAnligi } from "../src/donus/anlik";
import { donusBandi, donusOzeti } from "../src/donus/ozet";
import { DuvarSaati, ElleSaat, VARSAYILAN_DUNYA_EPOCH_MS } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import type { YazarSecenekleri } from "../src/yazar";
import { GUNEY, KUZEY, veri } from "./yardimci";
import { profilSozlesmesi } from "./profil-sozlesmesi";

const E = VARSAYILAN_DUNYA_EPOCH_MS;
const GUN = 24 * SAAT;
const TOHUM = 4;

// --- Test 3: saf işlev, golden ----------------------------------------------------------------------------------------

describe("donusOzeti (saf) - Test 3: ayni girdi ayni ozet (golden)", () => {
  const H = SAAT;
  const girdi = () => ({
    oyuncu: "ali",
    simdi: 30 * H,
    anlik: { t: 30 * H, hazine: 3_000_000, defter: { brutIhracat: 700_000, brutIthalat: 60_000, komisyon: 4_000, prim: 2_500 }, stok: {}, uretim: { tahil: 305_000, gida: 51_000, demir: 9_000, kolye: 1_000, sabit: 7 } },
    capa: { sonGorulen: { t: 20 * H, hazine: 1_000_000, defter: { brutIhracat: 100_000, brutIthalat: 20_000, komisyon: 1_000, prim: 500 }, stok: {}, uretim: { tahil: 5_000, gida: 1_000, sabit: 7 } } },
    kayitlar: [
      { t: 25 * H, tur: "insaat_bitti", ilce: "ilceA", degerler: ["ciftlik", 2], sira: 11 },
      { t: 22 * H, tur: "insaat_bitti", ilce: "ilceB", degerler: ["ciftlik", 3], sira: 12 },
      { t: 28 * H, tur: "insaat_bitti", ilce: "ilceA", degerler: ["ciftlik", 2], sira: 13 },
      { t: 21 * H, tur: "insaat_bitti", ilce: "ilceC", degerler: ["gida_fabrikasi", 5], sira: 14 },
      { t: 19 * H, tur: "insaat_bitti", ilce: "eski", degerler: ["ahir", 1], sira: 15 }, // aralıktan önce
      { t: 20 * H, tur: "insaat_bitti", ilce: "sinir", degerler: ["ahir", 1], sira: 16 }, // t = başlangıç: dışarıda (t > başlangıç)
      { t: 31 * H, tur: "insaat_bitti", ilce: "gelecek", degerler: ["ahir", 1], sira: 17 }, // şimdiden sonra
      { t: 24 * H, tur: "satis_toplami", ilce: "", degerler: [1, 2, 3, 4], sira: 0 }, // madde değil (net kümülatiften gelir)
    ] as OzetKaydi[],
  });

  const BEKLENEN: DonusOzeti = {
    surum: 1,
    bant: "K2",
    aralik: { baslangicT: 20 * H, bitisT: 30 * H },
    net: {
      hazineFarki: 2_000_000,
      // satis = ihracat farkı 600 000; gider = -(ithalat 40 000 + komisyon 3 000 + prim 2 000); diger = artık
      kalemler: { satis: 600_000, gider: -45_000, diger: 1_445_000 },
      uretim: [
        { mal: "tahil", miktar: 300_000 },
        { mal: "gida", miktar: 50_000 },
        { mal: "demir", miktar: 9_000 },
      ],
    },
    maddeler: [
      { blok: "B2", sablon: "donus.bitti.insaat.cok", tohum: 1545635835, degerler: [3, "ciftlik", "ilceB", "ilceA"], git: { bolge: 3 }, onem: 750_000 },
      { blok: "B2", sablon: "donus.bitti.insaat", tohum: 4252231440, degerler: ["gida_fabrikasi", "ilceC"], git: { bolge: 5 }, onem: 600_000 },
    ],
    oneri: null,
  };

  it("golden: elle dogrulanmis ciktiyla birebir; sema gecerli; oneri null; metin yok", () => {
    const o = donusOzeti(girdi());
    expect(o).toEqual(BEKLENEN);
    expect(DonusOzetiSemasi.parse(o)).toEqual(BEKLENEN);
    expect(o?.net.kalemler.satis).toBe(600_000);
    expect(o && o.net.kalemler.satis + o.net.kalemler.gider + o.net.kalemler.diger).toBe(o?.net.hazineFarki);
  });

  it("ayni girdi ayni ozet: tekrar, kayit sirasi ve girdinin kopyasi onemsiz; girdi degismez", () => {
    const g = girdi();
    const once = JSON.stringify(g);
    const a = donusOzeti(g);
    expect(JSON.stringify(g)).toBe(once); // girdi değişmez
    const ters = { ...girdi(), kayitlar: [...girdi().kayitlar].reverse() };
    expect(donusOzeti(ters)).toEqual(a);
    expect(donusOzeti(girdi())).toEqual(a);
    expect(JSON.stringify(donusOzeti(girdi()))).toBe(JSON.stringify(a));
  });

  it("bantlar parametre; K0 ve capasiz (ilk giris) ozet yok; ozetOkunduT araligi baslatir", () => {
    const e = { k1: 10, k2: 20, k3: 30, k4: 40, k5: 50, k6: 60, k7: 70 };
    expect([5, 10, 19, 20, 30, 40, 50, 60, 70, 1000].map((y) => donusBandi(y, e))).toEqual([null, "K1", "K1", "K2", "K3", "K4", "K5", "K6", "K7", "K7"]);
    expect(donusBandi(SAAT - 1)).toBeNull();
    expect(donusBandi(SAAT)).toBe("K1");
    expect(donusBandi(6 * SAAT)).toBe("K2");
    expect(donusBandi(2 * GUN)).toBe("K3");
    expect(donusBandi(7 * GUN)).toBe("K4");
    expect(donusBandi(14 * GUN)).toBe("K5");
    expect(donusBandi(45 * GUN)).toBe("K6");
    expect(donusBandi(90 * GUN)).toBe("K7");
    expect(donusOzeti({ ...girdi(), capa: null })).toBeNull();
    expect(donusOzeti({ ...girdi(), capa: { ...girdi().capa, ozetOkunduT: 29.5 * H } })).toBeNull(); // 30 dk: K0
    const okundu = donusOzeti({ ...girdi(), capa: { ...girdi().capa, ozetOkunduT: 26 * H } });
    expect(okundu?.aralik.baslangicT).toBe(26 * H);
    expect(okundu?.bant).toBe("K1");
    expect(okundu?.maddeler.map((m) => m.degerler[0])).toEqual(["ciftlik"]); // yalnız 28 sa kaydı (t > 26)
    expect(donusOzeti({ ...girdi(), esikler: e })?.bant).toBe("K7"); // 10 sa >= k7(70 ms)
  });
});

// --- Test 2: mutabakat ---------------------------------------------------------------------------------------------------

describe("Test 2 (mutabakat): net sonuc = hazine farki birebir (1/6/24/168 sa yokluk)", () => {
  for (const sa of [1, 6, 24, 168]) {
    it(`${sa} sa: hazineFarki = hazine(simdi) - hazine(sonGorulen); kalemler toplami = hazineFarki; uretim pozitif farklar`, () => {
      const sim = Simulasyon.olustur(veri(), TOHUM);
      sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY } });
      sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY } });
      for (const [i, k] of komutlar().entries()) sim.uygula({ t: (i + 1) * 20 * 60_000, oyuncu: "ali", komut: k });
      sim.calistirKadar(6 * SAAT);
      const sg = oyuncuAnligi(sim, "ali");
      expect(sg).not.toBeNull();
      sim.calistirKadar(6 * SAAT + sa * SAAT);
      const an = oyuncuAnligi(sim, "ali");
      expect(an?.t).toBe(6 * SAAT + sa * SAAT);
      const ozet = donusOzeti({ oyuncu: "ali", simdi: an?.t ?? 0, anlik: an as NonNullable<typeof an>, capa: { sonGorulen: sg as NonNullable<typeof sg> }, kayitlar: [] });
      expect(ozet).not.toBeNull();
      const beklenenFark = anlikMiktar(sim.dunya.oyuncular.find((o) => o.id === "ali")!.hazine, sim.dunya.zaman) - (sg?.hazine ?? 0);
      expect(ozet?.net.hazineFarki).toBe(beklenenFark); // birebir
      expect(an?.hazine).toBe(anlikMiktar(sim.dunya.oyuncular.find((o) => o.id === "ali")!.hazine, sim.dunya.zaman));
      const k = ozet?.net.kalemler;
      expect((k?.satis ?? 0) + (k?.gider ?? 0) + (k?.diger ?? 0)).toBe(ozet?.net.hazineFarki);
      for (const u of ozet?.net.uretim ?? []) expect(u.miktar).toBeGreaterThan(0);
      expect((ozet?.net.uretim.length ?? 9) <= 3).toBe(true);
    });
  }

  it("anlik cekirdegi degistirmez: durumOzeti ayni", () => {
    const sim = Simulasyon.olustur(veri(), TOHUM);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY } });
    sim.calistirKadar(2 * SAAT);
    const once = sim.durumOzeti();
    oyuncuAnligi(sim, "ali");
    oyuncuAnligi(sim, "ali");
    expect(sim.durumOzeti()).toBe(once);
  });
});

function komutlar(): Komut[] {
  return [
    { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" },
    { tur: "ticaret_emri", bolge: "m_liman", mal: "tahil", yon: "ihracat", oranSaat: 5_000 },
    { tur: "tesis_insa", bolge: "m_gecit", tesisTuru: "gida_fabrikasi" },
    { tur: "vergi_ayarla", oranPpm: 90_000 },
  ];
}

// --- Test 1: sunum kapalıyken durumOzeti aynı ----------------------------------------------------------------------------

class SahteDuvar {
  constructor(public ms: number) {}
  readonly oku = (): number => this.ms;
}

async function yazarAc(depo: Depo, duvar: SahteDuvar, ek: Partial<YazarSecenekleri> = {}): Promise<DunyaYazari> {
  return DunyaYazari.ac({ veri: veri(), tohum: TOHUM, depo, saat: new DuvarSaati(1, { duvar: duvar.oku }), commitAraligiMs: 15, goruntuAraligiMs: 1e12, ...ek });
}

async function yetis(y: DunyaYazari): Promise<void> {
  let n = 0;
  while (y.yetisiyor) {
    await y.birTur();
    if (++n > 100_000) throw new Error("yetisme bitmiyor");
  }
}

async function komutla(y: DunyaYazari, oyuncu: string, anahtar: string, komut: Komut): Promise<void> {
  const p = y.komutGonder(oyuncu, "test", anahtar, komut);
  await y.birTur();
  await p;
}

/** İnsan oyuncuları katar ve ali'nin işlerini başlatır (inşaat + ihracat emri). */
async function ilkAdimlar(y: DunyaYazari, duvar: SahteDuvar): Promise<void> {
  await komutla(y, SISTEM_OYUNCUSU, "katil-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
  await komutla(y, SISTEM_OYUNCUSU, "katil-veli", { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY });
  duvar.ms += SAAT;
  await y.birTur();
  for (const [i, k] of komutlar().entries()) await komutla(y, "ali", `i${i}`, k);
}

describe("Test 1 (sunum kapali): ozet katmani kapaliyken durumOzeti ayni", () => {
  it("donus acik ve kapali iki yazar ayni komutlarla her kontrol noktasinda ayni durumOzeti (gun sinirlari dahil)", async () => {
    const hepsi: string[][] = [];
    for (const acik of [true, false]) {
      const duvar = new SahteDuvar(E + 2 * SAAT);
      const y = await yazarAc(bellekDeposu(), duvar, acik ? {} : { donus: false });
      expect(y.donusAcik).toBe(acik);
      await yetis(y);
      await ilkAdimlar(y, duvar);
      const noktalar: string[] = [];
      for (let sa = 1; sa <= 60; sa++) {
        duvar.ms += SAAT;
        if (sa === 20) await komutla(y, "veli", "v1", { tur: "tesis_insa", bolge: "m_sehir", tesisTuru: "ciftlik" });
        else await y.birTur();
        if (sa % 6 === 0) noktalar.push(`${y.ozet().t}:${y.ozet().seq}:${y.ozet().durumOzeti}`);
      }
      hepsi.push(noktalar);
      await y.kapat();
    }
    expect(hepsi[0]).toEqual(hepsi[1]);
    expect(hepsi[0]?.length).toBe(10);
  }, 120_000);
});

// --- Test 8: yetişme, dünya kapalıyken akar -----------------------------------------------------------------------------

async function kayitlar(depo: Depo, o: string): Promise<OzetKaydi[]> {
  return (await depo.profil?.kayitOku(o)) ?? [];
}

describe("Test 8 (yetisme): sunucu 1/8/48 saat kapali kalinca oyuncunun ozeti kesintisiz sunucudakiyle ayni", () => {
  for (const kapaliSaat of [1, 8, 48]) {
    it(`${kapaliSaat} sa kapali: ozet ve ozet kayitlari birebir ayni; cift kayit yok`, async () => {
      const calistir = async (kapat: boolean): Promise<{ ozet: DonusOzeti | null; kayit: OzetKaydi[]; depo: Depo }> => {
        const duvar = new SahteDuvar(E + 2 * SAAT);
        const depo = bellekDeposu();
        let y = await yazarAc(depo, duvar);
        await yetis(y);
        await ilkAdimlar(y, duvar);
        duvar.ms += SAAT; // ali bir saat daha oynar
        await y.birTur();
        await komutla(y, "ali", "son", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ahir" }); // 36 dk sürer: yokluk sırasında biter
        await y.cikis("ali"); // oyuncu çıkar: sonGorulen
        await y.profilBekle();
        if (kapat) {
          await y.kapat();
          duvar.ms += kapaliSaat * SAAT;
          y = await yazarAc(depo, duvar);
          expect(y.yetisiyor).toBe(true);
          expect(await y.donusOzeti("ali")).toBeNull(); // yetişme bitmeden özet üretilmez
          await yetis(y);
        } else {
          for (let h = 0; h < kapaliSaat; h++) {
            duvar.ms += SAAT;
            await y.birTur();
          }
        }
        expect(y.sim.dunya.zaman).toBe(duvar.ms - E);
        const ozet = await y.donusOzeti("ali");
        const kayit = await kayitlar(depo, "ali");
        await y.kapat();
        return { ozet, kayit, depo };
      };
      const kesintisiz = await calistir(false);
      const kapali = await calistir(true);
      expect(kapali.ozet).not.toBeNull();
      expect(kapali.ozet).toEqual(kesintisiz.ozet);
      expect(kapali.kayit).toEqual(kesintisiz.kayit);
      expect(DonusOzetiSemasi.parse(kapali.ozet)).toEqual(kapali.ozet);
      // Çift kayıt yok: anahtarlar benzersiz.
      const anahtarlar = kapali.kayit.map((k) => `${k.tur}|${k.t}|${k.sira}`);
      expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
      // Yokluk bandı: 1 sa + kapalı süre.
      expect(kapali.ozet?.bant).toBe(donusBandi((kapaliSaat + 1) * SAAT));
      // Biten inşaat(lar) özette: kayıt zamanı olayın sim zamanıdır (yazılma zamanı değil), aralık içinde.
      expect(kapali.kayit.some((k) => k.tur === "insaat_bitti")).toBe(true);
      for (const k of kapali.kayit) expect(k.t).toBeLessThanOrEqual((kapali.ozet?.aralik.bitisT ?? 0));
      expect(kapali.ozet?.maddeler.some((m) => m.blok === "B2")).toBe(true);
      // 48 sa: iki gün sınırı geçti; satış toplamı kayıtları (kümülatif) iki dünyada da aynı.
      if (kapaliSaat === 48) expect(kapali.kayit.filter((k) => k.tur === "satis_toplami").length).toBeGreaterThanOrEqual(1);
      // Net sonuç = hazine farkı (kümülatif sayaç farkı), kalemler toplamı birebir.
      const k = kapali.ozet?.net;
      expect((k?.kalemler.satis ?? 0) + (k?.kalemler.gider ?? 0) + (k?.kalemler.diger ?? 0)).toBe(k?.hazineFarki);
    }, 120_000);
  }

  it("kill -9 (kapat cagrilmaz): yeniden aciliste gunluk oynatmasi cift kayit uretmez; kayitlar kesintisiz kosuyla ayni", async () => {
    const kosu = async (carpma: boolean): Promise<OzetKaydi[]> => {
      const duvar = new SahteDuvar(E + 2 * SAAT);
      const depo = bellekDeposu();
      let y = await yazarAc(depo, duvar);
      await yetis(y);
      await ilkAdimlar(y, duvar);
      for (let h = 0; h < 30; h++) {
        duvar.ms += SAAT;
        if (h === 10) await komutla(y, "ali", "ek1", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "gida_fabrikasi" });
        else await y.birTur();
      }
      if (carpma) {
        // Çöküş: kapanış görüntüsü ve kuyruk boşaltma YOK; açılış görüntüsü + günlük kuyruğu kalır.
        y = await yazarAc(depo, duvar);
        expect(y.kurtarma.kalanKayit).toBeGreaterThan(0);
        await yetis(y);
      }
      for (let h = 0; h < 12; h++) {
        duvar.ms += SAAT;
        await y.birTur();
      }
      await y.profilBekle();
      const l = await kayitlar(depo, "ali");
      await y.kapat();
      return l;
    };
    const temiz = await kosu(false);
    const carpan = await kosu(true);
    expect(carpan).toEqual(temiz);
    expect(temiz.filter((k) => k.tur === "insaat_bitti").length).toBeGreaterThanOrEqual(2);
    expect(new Set(carpan.map((k) => `${k.tur}|${k.t}|${k.sira}`)).size).toBe(carpan.length);
  }, 120_000);
});

// --- dosya deposu: kalıcılık, kill -9 --------------------------------------------------------------------------------------

const dizinler: string[] = [];
afterEach(async () => {
  for (const d of dizinler.splice(0)) await rm(d, { recursive: true, force: true });
});

describe("profil deposu sozlesmesi (bellek ve dosya)", () => {
  it("bellek", async () => {
    await profilSozlesmesi(bellekDeposu());
  });

  it("dosya: sozlesme + yeniden acilista kalicilik + yarim son satir atilir + siklastirma", async () => {
    const dizin = await mkdtemp(join(tmpdir(), "bolge-profil-"));
    dizinler.push(dizin);
    const d = await dosyaDeposu(dizin);
    await profilSozlesmesi(d);
    await d.gunluk.kapat();
    await d.profil?.kapat();
    // Yeniden açılış: kalıcı. Sonuna yarım bir satır eklenmiş (çökme).
    const { appendFile } = await import("node:fs/promises");
    await appendFile(join(dizin, "profil.jsonl"), '{"o":"ali","c":{"ozetOku');
    const d2 = await dosyaDeposu(dizin);
    expect((await d2.profil?.capaOku("ali"))?.ozetOkunduT).toBe(9);
    expect((await d2.profil?.kayitOku("veli"))?.length).toBe(OZET_KAYIT_TAVANI);
    expect((await d2.profil?.kayitOku("ali"))?.length).toBeGreaterThan(0);
    // Yarım satır sıkıştırmayla temizlendi: yeni yazım temiz satıra gider ve yeniden açılışta okunur.
    await d2.profil?.capaYaz("veli", { ozetOkunduT: 3 });
    await d2.gunluk.kapat();
    await d2.profil?.kapat();
    const d3 = await dosyaDeposu(dizin);
    expect(await d3.profil?.capaOku("veli")).toEqual({ ozetOkunduT: 3 });
    await d3.gunluk.kapat();
    await d3.profil?.kapat();
  });

  it("dosya deposuyla yazar: kill -9 benzeri kapanis sonrasi yeniden acilista kayitlar cift olmaz", async () => {
    const dizin = await mkdtemp(join(tmpdir(), "bolge-donus-"));
    dizinler.push(dizin);
    const duvar = new SahteDuvar(E + 2 * SAAT);
    let depo = await dosyaDeposu(dizin);
    let y = await yazarAc(depo, duvar);
    await yetis(y);
    await ilkAdimlar(y, duvar);
    for (let h = 0; h < 24; h++) {
      duvar.ms += SAAT;
      await y.birTur();
    }
    await y.profilBekle();
    const once = await kayitlar(depo, "ali");
    expect(once.some((k) => k.tur === "insaat_bitti")).toBe(true);
    // Çöküş: yazar kapatılmaz (kapanış görüntüsü yok); yalnız kilit ve tutamaçlar bırakılır.
    await depo.profil?.kapat();
    await depo.gunluk.kapat();
    depo = await dosyaDeposu(dizin);
    y = await yazarAc(depo, duvar);
    await yetis(y);
    await y.profilBekle();
    const sonra = await kayitlar(depo, "ali");
    expect(sonra).toEqual(once);
    expect(new Set(sonra.map((k) => `${k.tur}|${k.t}|${k.sira}`)).size).toBe(sonra.length);
    await y.kapat();
  }, 60_000);
});

// --- Elle saat: çapalar ve ozetOkundu ----------------------------------------------------------------------------------

describe("capalar: cikis, ozetOkundu, kirli cikis yedegi", () => {
  async function ilerle(y: DunyaYazari, saat: ElleSaat, t: number): Promise<void> {
    saat.ilerlet(t);
    for (let n = 0; y.sim.dunya.zaman < t && n < 1000; n++) await y.birTur();
  }

  async function elleDunya(): Promise<{ y: DunyaYazari; saat: ElleSaat; depo: ReturnType<typeof bellekDeposu> }> {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: veri(), tohum: TOHUM, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    await komutla(y, SISTEM_OYUNCUSU, "k1", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    return { y, saat, depo };
  }

  it("capa yoksa (ilk giris) ozet yok; cikis sonGorulen yazar; K0 ozet yok; 6 saat sonra K2; ozetOkundu araligi ileri alir", async () => {
    const { y, saat, depo } = await elleDunya();
    expect(await y.donusOzeti("ali")).toBeNull(); // çapa yok
    await ilerle(y, saat, 2 * SAAT);
    await y.cikis("ali");
    await y.profilBekle();
    const c = await depo.profil.capaOku("ali");
    expect(c?.sonGorulen?.t).toBe(2 * SAAT);
    expect(c?.sonGorulen?.hazine).toBeGreaterThan(0);
    await ilerle(y, saat, 2 * SAAT + 30 * 60_000);
    expect(await y.donusOzeti("ali")).toBeNull(); // 30 dk: K0
    await ilerle(y, saat, 10 * SAAT);
    const o = await y.donusOzeti("ali");
    expect(o?.bant).toBe("K2");
    expect(o?.aralik).toEqual({ baslangicT: 2 * SAAT, bitisT: 10 * SAAT });
    // Özet okundu: aralık o ana taşınır, sonGorulen o ana çekilir; yeniden istenince K0 (yenileme).
    await y.ozetOkundu("ali", 10 * SAAT);
    await y.profilBekle();
    expect((await depo.profil.capaOku("ali"))?.ozetOkunduT).toBe(10 * SAAT);
    expect((await depo.profil.capaOku("ali"))?.sonGorulen?.t).toBe(10 * SAAT);
    expect(await y.donusOzeti("ali")).toBeNull();
    // Geleceğe (şimdiden ileri) işaret edilen t kırpılır; geriye giden ozetOkunduT'yi azaltmaz.
    await y.ozetOkundu("ali", 999 * SAAT);
    await y.ozetOkundu("ali", 1);
    await y.profilBekle();
    expect((await depo.profil.capaOku("ali"))?.ozetOkunduT).toBe(10 * SAAT);
    // Bilinmeyen oyuncu / bot: sessizce yok.
    expect(await y.donusOzeti("yok")).toBeNull();
    await y.cikis("yok");
    await y.kapat();
  });

  it("kirli cikis yedegi: cikis calismadan sunucu cokse bile komut veren oyuncunun capasi son kabul edilen komuttan sonraki durumdur", async () => {
    const { y, saat, depo } = await elleDunya();
    await ilerle(y, saat, 3 * SAAT);
    await komutla(y, "ali", "c1", { tur: "vergi_ayarla", oranPpm: 91_000 });
    await y.profilBekle();
    const c = await depo.profil.capaOku("ali");
    expect(c?.sonGorulen?.t).toBeGreaterThanOrEqual(3 * SAAT);
    // Çöküş sonrası yeniden açılış: çapa yerinde; 10 saat sonra özet gelir ve aralık çapadan başlar (aşırı kapsama yönünde).
    const y2 = await DunyaYazari.ac({ veri: veri(), tohum: TOHUM, depo, saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    expect(y2.kurtarma.kalanKayit).toBeGreaterThan(0);
    const ozet0 = await y2.donusOzeti("ali");
    expect(ozet0).toBeNull(); // yokluk yok (dünya zamanı çapada)
    expect((await depo.profil.capaOku("ali"))?.sonGorulen?.t).toBeGreaterThanOrEqual(3 * SAAT);
    await y2.kapat();
  });

  it("donus kapali (donus:false) ya da profilsiz depoda ozet/cikis sessizce yok; profilsiz depoda uyari", async () => {
    const depo = bellekDeposu();
    const y = await DunyaYazari.ac({ veri: veri(), tohum: TOHUM, depo, saat: new ElleSaat(), commitAraligiMs: 15, donus: false });
    expect(y.donusAcik).toBe(false);
    expect(await y.donusOzeti("ali")).toBeNull();
    await y.cikis("ali");
    await y.ozetOkundu("ali", 1);
    await y.kapat();
    const { profil: _profil, ...profilsiz } = bellekDeposu();
    const gelen: string[] = [];
    const y2 = await DunyaYazari.ac({ veri: veri(), tohum: TOHUM, depo: profilsiz, saat: new ElleSaat(), commitAraligiMs: 15 });
    y2.uyari((m) => gelen.push(m));
    expect(y2.donusAcik).toBe(false);
    expect(y2.kurtarma.uyarilar.some((m) => /profil/.test(m))).toBe(true);
    expect(gelen.some((m) => /profil/.test(m))).toBe(true);
    await y2.kapat();
  });
});

/**
 * Defter P4/P5 dedektörü: `ilk_ekmek`, `ilk_pencere` (ızgara kavramı) ve `ilk_raf`, `ilk_cam` (damga); etkin kuralı (`kavramEtkin`).
 * - `ilk_ekmek`: gerçek G6-3 içeriğiyle (değirmen -> fırın) ÜRETİMLE tetiklenir; girdisiz fırın tetiklemez.
 * - `ilk_pencere`: pencere ÜRETİMİYLE tetiklenir; başlangıç kitindeki pencere (`baslangicStok.pencere`, G7 yaması) STOKtur, tetiklemez.
 * - `ilk_raf`: dükkânın bir raf yuvasında mal SEÇİLİ olunca (stok ve satış şartı yok); `ilk_cam`: cam üretimi.
 * - Etkin: kural `@bolge/protokol` `kavramEtkin`'dedir, sunucu sarmalayıcısı `etkin.ts` içerikten girdiyi kurar; tetikleyici yöntem/dükkân içerikte yoksa kavram etkin değil (gerçek içerik bugün: ekmek var; pencere, cam, dükkân yok).
 * G8-1 verisi (`odul.kavramlar` +2, pencere/cam yöntemleri) gelene kadar FİKSTÜR içerik kullanılır (testte bellekte eklenir; JSON değişmez); gerçek içerik testi G8-1 sonrası.
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut } from "@bolge/cekirdek";
import { mulkSim } from "../../cekirdek/test/mulk-yardimci";
import { dukkanEkle, dukkanlariSil, perakendeVeri } from "../../cekirdek/test/perakende-yardimci";
import { bellekDeposu } from "../src/depo/bellek";
import { DAMGA_IZGARA_KAVRAMLARI, ODUL_IZGARA_KAVRAMLARI, damgaSaglandi, ilkRaf, kavramSaglandi, oyuncuDugumleri } from "../src/odul/dedektor";
import { kavramEtkin } from "../src/odul/etkin";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { mulkVerisi } from "./yardimci";
import { DEGIRMEN, FIRIN, bitisikCiftler, bolMulk } from "./yontem-yardimci";

const ILCE = "sn_m_ova_merkez";
const GUN = 24 * SAAT;

const oyuncu = (s: Simulasyon, id: string) => {
  const o = s.dunya.oyuncular.find((x) => x.id === id);
  if (!o) throw new Error("oyuncu yok: " + id);
  return o;
};
const kavram = (s: Simulasyon, k: string, id = "ali"): boolean => kavramSaglandi(s.ic, s.dunya, oyuncu(s, id), k, s.dunya.zaman);
const damga = (s: Simulasyon, k: string, id = "ali"): boolean => damgaSaglandi(s.ic, s.dunya, id, k, s.dunya.zaman);

/** Fikstür: yönteme `pencere`/`cam` ÇIKTI veren bir yöntem eklenir (G8 yönteminin yerine; yalnız bellekte). */
function pencereCamYontemi(v: CekirdekVeriPaketi): void {
  const ornek = v.icerik.yontemler.find((y) => y.id === "ekmek_firini");
  if (!ornek) throw new Error("fikstür: ekmek_firini yok");
  v.icerik.yontemler.push({ ...structuredClone(ornek), id: "fix_pencere", ad: "Fikstür pencere", girdiler: { celik: 24_000 }, ciktilar: { pencere: 1_000 } });
  v.icerik.yontemler.push({ ...structuredClone(ornek), id: "fix_cam", ad: "Fikstür cam", girdiler: { yakit: 20_000 }, ciktilar: { cam: 32_000 } });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// ilk_ekmek: gerçek G6-3 içeriği
// ---------------------------------------------------------------------------------------------------------------------------------------------
describe("ilk_ekmek: ekmek ÜRETİMİYLE tetiklenir (gerçek G6-3 içeriği)", () => {
  function kur(tahilStok: number): Simulasyon {
    const v = bolMulk(mulkVerisi(), (x) => {
      const m = x.param.mulk;
      if (m) m.yeniOyuncu.baslangicStok = { ...m.yeniOyuncu.baslangicStok, tahil: tahilStok, un: 0 };
    });
    const sim = Simulasyon.olustur(v, 11);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut });
    return sim;
  }
  function insa(sim: Simulasyon, hucreler: string[], tesisTuru: string, yontem: string): void {
    const a = sim.uygula({ t: sim.dunya.zaman, oyuncu: "ali", komut: { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" } });
    expect(a.tamam, JSON.stringify(a)).toBe(true);
    const b = sim.uygula({ t: sim.dunya.zaman, oyuncu: "ali", komut: { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru, hucreler, yontem } as Komut });
    expect(b.tamam, JSON.stringify(b)).toBe(true);
  }

  it("izgara kavramı; sıra Defter kritik yolunda (isleme, ekmek, zincir)", () => {
    const l = ODUL_IZGARA_KAVRAMLARI as readonly string[];
    expect(l.indexOf("ilk_ekmek")).toBe(l.indexOf("ilk_isleme") + 1);
    expect(l.indexOf("ilk_pencere")).toBe(l.indexOf("ilk_dukkan") + 1);
    expect(DAMGA_IZGARA_KAVRAMLARI).toEqual(["ilk_uretim", "ilk_raf", "ilk_cam"]);
  });

  it("girdisiz fırın (un yok) tetiklemez; değirmen+fırın zinciri ekmek üretince tetikler; dedektör durumu DEĞİŞTİRMEZ", () => {
    // Fırın tek başına, tahıl/un stoğu yok: ekmek üretilmez.
    const a = kur(0);
    const [g] = bitisikCiftler(a, ILCE, 1) as [string[]];
    a.calistirKadar(SAAT);
    insa(a, g, "gida_fabrikasi", FIRIN);
    a.calistirKadar(a.dunya.zaman + 3 * GUN);
    expect(kavram(a, "ilk_ekmek")).toBe(false);
    // Değirmen + fırın, tahıl stoklu: ekmek üretilir.
    const s = kur(50_000_000);
    const [g1, g2] = bitisikCiftler(s, ILCE, 2) as [string[], string[]];
    s.calistirKadar(SAAT);
    insa(s, g1, "gida_fabrikasi", DEGIRMEN);
    expect(kavram(s, "ilk_ekmek")).toBe(false); // yapı bitişi/değirmen tetiklemez
    insa(s, g2, "gida_fabrikasi", FIRIN);
    s.calistirKadar(s.dunya.zaman + 4 * GUN);
    const once = s.durumOzeti();
    expect(kavram(s, "ilk_ekmek")).toBe(true);
    expect(s.durumOzeti()).toBe(once);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// ilk_pencere / ilk_cam: üretim (fikstür içerik)
// ---------------------------------------------------------------------------------------------------------------------------------------------
describe("ilk_pencere ve ilk_cam: üretimle; başlangıç kiti pencere STOKu tetiklemez (fikstür içerik)", () => {
  function kur(): Simulasyon {
    const v = perakendeVeri((x) => {
      pencereCamYontemi(x);
      const m = x.param.mulk;
      if (m) m.yeniOyuncu.baslangicStok = { ...m.yeniOyuncu.baslangicStok, pencere: 3_000 }; // G7 kiti: 3 pencere
    });
    const sim = mulkSim(["ali", "veli"], v); // yeni oyuncu paketi: yurt + işletme düğümü + başlangıç stoku
    sim.calistirKadar(3 * GUN);
    return sim;
  }

  it("kitteki 3 pencere (stok) ilk_pencere TETİKLEMEZ, günler geçse de; üretim sayacı sıfır; cam da tetiklemez", () => {
    const s = kur();
    const pi = s.ic.malIndeks["pencere"] as number;
    const dugumler = oyuncuDugumleri(s.dunya, "ali");
    expect(dugumler.length).toBeGreaterThan(0);
    const stok = dugumler.reduce((n, b) => n + (b.stoklar[pi]?.miktar ?? 0), 0);
    expect(stok).toBeGreaterThanOrEqual(3_000); // kit gerçekten stokta
    expect(dugumler.every((b) => (b.uretimToplam[pi] ?? 0) === 0)).toBe(true);
    expect(kavram(s, "ilk_pencere")).toBe(false);
    expect(damga(s, "ilk_cam")).toBe(false);
  });

  it("pencere üretimi (kümülatif sayaç) tetikler; cam üretimi ilk_cam damgasını; başkasının üretimi sayılmaz; tembel oran da", () => {
    const s = kur();
    const pi = s.ic.malIndeks["pencere"] as number;
    const ci = s.ic.malIndeks["cam"] as number;
    const b = oyuncuDugumleri(s.dunya, "ali")[0]!;
    b.uretimToplam[pi] = 1_000;
    expect(kavram(s, "ilk_pencere")).toBe(true);
    expect(kavram(s, "ilk_pencere", "veli")).toBe(false);
    expect(damga(s, "ilk_cam")).toBe(false); // pencere camın damgasını açmaz
    // Tembel: sayaç 0 ama oran > 0 ve geçmişte t0.
    b.uretimToplam[pi] = 0;
    b.uretimToplam[ci] = 0;
    b.uretimOrani[ci] = 8_000;
    b.uretimT0 = s.dunya.zaman - SAAT;
    expect(damga(s, "ilk_cam")).toBe(true);
    expect(damga(s, "ilk_cam", "veli")).toBe(false);
    expect(kavram(s, "ilk_pencere")).toBe(false);
  });

  it("içerikte pencere/cam malı yoksa dedektör false döner (malIndeks yok), hata atmaz", () => {
    const v = bolMulk(mulkVerisi());
    const sim = Simulasyon.olustur(v, 5);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut });
    sim.ic.malIndeks["pencere"] = undefined as unknown as number;
    expect(kavram(sim, "ilk_pencere")).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// ilk_raf: dükkân rafında mal seçili
// ---------------------------------------------------------------------------------------------------------------------------------------------
describe("ilk_raf damgası: en az bir yuvada mal SEÇİLİ (stok ve satış şartı yok)", () => {
  const kur = (): Simulasyon => {
    const s = mulkSim(["a", "b"], perakendeVeri());
    s.calistirKadar(12 * SAAT);
    return s;
  };

  it("dükkân yok / boş raf tetiklemez; stoksuz bile olsa mal seçiliyse tetikler; boş dize mal sayılmaz; başkasının dükkânı sayılmaz; yıkımla koşul düşer", () => {
    const s = kur();
    expect(ilkRaf(s.dunya, "a")).toBe(false);
    dukkanEkle(s, "a", [{}]);
    expect(ilkRaf(s.dunya, "a")).toBe(false); // tamamlanmış ama boş raf
    dukkanlariSil(s);
    const e = dukkanEkle(s, "a", [{ mal: "" }]);
    expect(e.dukkan?.raf.some((y) => y.mal === "")).toBe(true);
    expect(damga(s, "ilk_raf", "a")).toBe(false);
    dukkanlariSil(s);
    dukkanEkle(s, "a", [{ mal: "ekmek" }]); // a'nın ekmek stoğu yok: stoksuz, satış yok
    expect(ilkRaf(s.dunya, "a")).toBe(true);
    expect(damga(s, "ilk_raf", "a")).toBe(true);
    expect(damga(s, "ilk_raf", "b")).toBe(false);
    expect(s.dunya.mulk?.oyuncular.find((x) => x.id === "a")?.dukkanGeliri?.n ?? 0).toBe(0); // satış şartı aranmadı
    dukkanlariSil(s);
    expect(ilkRaf(s.dunya, "a")).toBe(false);
  });

  it("ikinci yuvada mal seçili de yeter (yuva sırası önemsiz); dedektör durumu değiştirmez", () => {
    const s = kur();
    dukkanEkle(s, "a", [{}, { mal: "gida" }], "bakkal", 1);
    const once = s.durumOzeti();
    expect(ilkRaf(s.dunya, "a")).toBe(true);
    expect(s.durumOzeti()).toBe(once);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Etkin kuralı
// ---------------------------------------------------------------------------------------------------------------------------------------------
describe("kavramEtkin: tetikleyici tesis/yöntem/dükkân içerikte yoksa kavram etkin değil", () => {
  it("gerçek içerik (bugün): ekmek fırını var -> ilk_ekmek etkin; pencere/cam yöntemi ve dükkân yok -> ilk_pencere, ilk_cam, ilk_dukkan, ilk_raf etkin değil; yer tutucu ve diğerleri", () => {
    const s = Simulasyon.olustur(bolMulk(mulkVerisi()), 1);
    expect(kavramEtkin(s.ic, "ilk_ekmek")).toBe(true);
    expect(kavramEtkin(s.ic, "ilk_pencere")).toBe(false);
    expect(kavramEtkin(s.ic, "ilk_cam")).toBe(false);
    expect(kavramEtkin(s.ic, "ilk_dukkan")).toBe(false);
    expect(kavramEtkin(s.ic, "ilk_raf")).toBe(false);
    expect(kavramEtkin(s.ic, "ilk_sozlesme")).toBe(false);
    for (const k of ["ilk_yapi", "ilk_satis", "ilk_isleme", "zincir_kapandi", "ikinci_ilce", "ilk_arastirma"]) expect(kavramEtkin(s.ic, k), k).toBe(true);
  });

  it("pencere/cam yöntemi içeriğe girince etkin; dükkân (mulk.perakende) tanımlanınca ilk_dukkan ve ilk_raf etkin; yöntem çıkarılınca (ekmek) etkin değil", () => {
    const v = bolMulk(mulkVerisi(), pencereCamYontemi);
    const s = Simulasyon.olustur(v, 1);
    expect(kavramEtkin(s.ic, "ilk_pencere")).toBe(true);
    expect(kavramEtkin(s.ic, "ilk_cam")).toBe(true);
    const p = Simulasyon.olustur(perakendeVeri(), 1);
    expect(kavramEtkin(p.ic, "ilk_dukkan")).toBe(true);
    expect(kavramEtkin(p.ic, "ilk_raf")).toBe(true);
    const e = mulkVerisi();
    e.icerik.yontemler = e.icerik.yontemler.filter((y) => y.id !== "ekmek_firini");
    for (const t of e.icerik.tesisTurleri) t.yontemler = t.yontemler.filter((y) => y !== "ekmek_firini");
    expect(kavramEtkin(Simulasyon.olustur(bolMulk(e), 1).ic, "ilk_ekmek")).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Yazar: ödül, damga ve Defter etkin bayrağı (fikstür ödül tablosu)
// ---------------------------------------------------------------------------------------------------------------------------------------------
describe("yazar: ilk_ekmek/ilk_pencere ödülü ve ilk_raf/ilk_cam damgası (fikstür odul tablosu)", () => {
  it("kitteki pencere ödül vermez; üretim sayacı ödülü (ekmek 5, parça 8) bir kez, damgalar profile; Defter etkin bayrağı içerik kuralına göre", async () => {
    const v = perakendeVeri((x) => {
      pencereCamYontemi(x);
      const m = x.param.mulk;
      if (m) m.yeniOyuncu.baslangicStok = { ...m.yeniOyuncu.baslangicStok, pencere: 3_000 };
      const t = x.param.odul;
      if (!t) throw new Error("odul tablosu yok");
      t.kavramlar["ilk_ekmek"] = { mal: { ekmek: 5_000 } };
      t.kavramlar["ilk_pencere"] = { mal: { parca: 8_000 } };
    });
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: v, tohum: 7, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
    const p = y.komutGonder("sistem", "test", "k1", { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [] });
    await y.birTur();
    expect((await p).sonuc.tamam).toBe(true);
    let simdi = 0;
    const ilerlet = async (n: number): Promise<void> => {
      for (let i = 0; i < n; i++) {
        simdi += SAAT; // ElleSaat.ilerlet MUTLAK sim ms alır
        saat.ilerlet(simdi);
        await y.birTur();
      }
    };
    const odulSayisi = async (k: string): Promise<number> => (await depo.gunluk.oku(0)).filter((g) => g.anahtar === `odul:a:${k}`).length;
    const damgalar = async (): Promise<string[]> => ((await depo.profil?.damgaOku("a")) ?? []).filter((d) => d.kaynak === "damga").map((d) => d.kavram);
    await ilerlet(4);
    const sim = y.sim as Simulasyon;
    // Defter etkin bayrakları: fırın yöntemi, pencere yöntemi (fikstür) ve dükkân içerikte var; ilk_sozlesme yer tutucu.
    const d0 = await y.defter("a");
    const etkin = (k: string): boolean | undefined => d0?.siradaki.find((x) => x.kavram === k)?.etkin;
    expect(etkin("ilk_ekmek")).toBe(true);
    expect(etkin("ilk_pencere")).toBe(true);
    expect(etkin("ilk_dukkan")).toBe(true);
    expect(etkin("ilk_sozlesme")).toBe(false);
    expect(d0?.siradaki.find((x) => x.kavram === "ilk_pencere")?.odul).toEqual({ mal: { parca: 8_000 }, degerMili: expect.any(Number) });
    // Kit pencere stoğu: ödül yok.
    expect(await odulSayisi("ilk_pencere")).toBe(0);
    expect(await odulSayisi("ilk_ekmek")).toBe(0);
    // Raf: dükkân + mal seçili (stoksuz) -> ilk_raf damgası; ödül yok (damga).
    dukkanEkle(sim, "a", [{ mal: "ekmek" }]);
    await ilerlet(2);
    expect(await damgalar()).toContain("ilk_raf");
    expect(await damgalar()).not.toContain("ilk_cam");
    // Üretim sayaçları: ekmek, pencere, cam.
    const b = oyuncuDugumleri(sim.dunya, "a")[0]!;
    for (const m of ["ekmek", "pencere", "cam"]) b.uretimToplam[sim.ic.malIndeks[m] as number] = 1_000;
    await ilerlet(2);
    expect(await odulSayisi("ilk_ekmek")).toBe(1);
    expect(await odulSayisi("ilk_pencere")).toBe(1);
    expect(await damgalar()).toContain("ilk_cam");
    expect(await odulSayisi("ilk_cam")).toBe(0); // damga: çekirdek ödülü yok
    const kayit = (await depo.gunluk.oku(0)).find((g) => g.anahtar === "odul:a:ilk_pencere");
    expect(kayit?.komut).toEqual({ tur: "sistem_odul", oyuncu: "a", kavram: "ilk_pencere" });
    expect(oyuncu(sim, "a").alinanOdul).toEqual(expect.arrayContaining(["ilk_ekmek", "ilk_pencere"]));
    // Tekrar: bir kez.
    await ilerlet(3);
    expect(await odulSayisi("ilk_ekmek")).toBe(1);
    expect(await odulSayisi("ilk_pencere")).toBe(1);
    const d = await y.defter("a");
    expect(d?.kazanilan.filter((k) => k.tur === "damga").map((k) => k.kavram)).toEqual(expect.arrayContaining(["ilk_raf", "ilk_cam"]));
    expect(d?.kazanilan.filter((k) => k.tur === "odul").map((k) => k.kavram)).toEqual(expect.arrayContaining(["ilk_ekmek", "ilk_pencere"]));
    await y.kapat();
  }, 60_000);

  it("gerçek içerikte odul tablosu henüz ilk_ekmek/ilk_pencere taşımaz: Defter ve dedektör bozulmaz (ilk_ekmek ödülü tablo gelince açılır)", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: perakendeVeri(), tohum: 7, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
    const p = y.komutGonder("sistem", "test", "k1", { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [] });
    await y.birTur();
    expect((await p).sonuc.tamam).toBe(true);
    const sim = y.sim as Simulasyon;
    const tablo = sim.ic.param.odul?.kavramlar ?? {};
    if (tablo["ilk_ekmek"] === undefined) {
      const d = await y.defter("a");
      expect(d?.siradaki.some((x) => x.kavram === "ilk_ekmek" || x.kavram === "ilk_pencere")).toBe(false); // tabloda yok: Defter'e girmez
    }
    await y.kapat();
  }, 60_000);
});

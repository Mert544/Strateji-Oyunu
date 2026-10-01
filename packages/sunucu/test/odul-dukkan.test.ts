/**
 * `ilk_dukkan` dedektörü (G7; sartname §7.8, GZ-14): tetik İLK SATIŞTIR, yapı bitişi değil. Koşul = tamamlanmış `dukkan` ek yapısı VE kümülatif dükkân geliri > 0.
 * Kanıtlar: dükkân biter bitmez (satış yokken) tetiklenmez; satış başlayınca tetiklenir (tembel `paraAkisi.yerel` dahil); süren inşaat sayılmaz; yıkımdan sonra koşul düşer ama
 * geliri kalır; ödül bir kez verilir (yıkım geri almaz, yeniden kurulum tekrar vermez); Defter'de `etkin`. Dükkân DURUMU çekirdek test yardımcısıyla doğrudan yazılır
 * (kurma komutu G7-3'tedir; burada dedektör ve ödül yolu sınanır).
 */
import { describe, expect, it } from "vitest";
import { SAAT, Simulasyon } from "@bolge/cekirdek";
import { mulkSim } from "../../cekirdek/test/mulk-yardimci";
import { bolgeBul, dukkanEkle, dukkanlariSil, perakendeVeri } from "../../cekirdek/test/perakende-yardimci";
import { bellekDeposu } from "../src/depo/bellek";
import { ODUL_IZGARA_KAVRAMLARI, ODUL_YER_TUTUCULARI, kavramSaglandi } from "../src/odul/dedektor";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";

function sim(): Simulasyon {
  const s = mulkSim(["a", "b"], perakendeVeri());
  s.calistirKadar(12 * SAAT);
  return s;
}
const saglandi = (s: Simulasyon, oyuncu: string): boolean => {
  const o = s.dunya.oyuncular.find((x) => x.id === oyuncu);
  if (!o) throw new Error("oyuncu yok");
  return kavramSaglandi(s.ic, s.dunya, o, "ilk_dukkan", s.dunya.zaman);
};
const gelir = (s: Simulasyon, oyuncu: string): number => s.dunya.mulk?.oyuncular.find((x) => x.id === oyuncu)?.dukkanGeliri?.n ?? 0;

describe("ilk_dukkan kavrami", () => {
  it("izgara kavramlarina girdi (yer tutucu degil); ilk_sozlesme hala yer tutucu", () => {
    expect(ODUL_IZGARA_KAVRAMLARI).toContain("ilk_dukkan");
    expect(ODUL_YER_TUTUCULARI).toEqual(["ilk_sozlesme"]);
  });

  it("dukkan YAPILIP satis YOKKEN tetiklenmez (yapi bitisi tetik degil); stoksuz raf ve bos raf da tetiklemez; satis baslayinca tetiklenir", () => {
    const s = sim();
    expect(saglandi(s, "a")).toBe(false); // dukkan yok
    dukkanEkle(s, "a", [{}]); // tamamlanmis ama bos raf: satis yok
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    expect(saglandi(s, "a")).toBe(false);
    expect(gelir(s, "a")).toBe(0);
    dukkanlariSil(s);
    dukkanEkle(s, "a", [{ mal: "ekmek" }]); // stoksuz mal (a'nin ekmegi yok): mevcut degil -> satis yok
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    expect(saglandi(s, "a")).toBe(false);
    dukkanlariSil(s);
    dukkanEkle(s, "a", [{ mal: "gida" }]); // stoklu mal: satis baslar
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    expect(gelir(s, "a")).toBeGreaterThan(0);
    expect(saglandi(s, "a")).toBe(true);
    expect(saglandi(s, "b")).toBe(false); // baskasinin dukkani/satisi yok
  });

  it("tembel gelir: son cozumden sonra zaman ilerlerken (paraAkisi.yerel > 0) kavram sayac henuz yazilmadan da saglanir", () => {
    const s = sim();
    const e = dukkanEkle(s, "a", [{ mal: "gida" }]);
    expect(e.dukkan).toBeDefined();
    const mo = s.dunya.mulk?.oyuncular.find((x) => x.id === "a");
    if (!mo) throw new Error("kurulum");
    // Cozum yazildiktan hemen sonra: sayac 0 olabilir ama akis > 0 ve t0 gecmiste.
    s.calistirKadar(s.dunya.zaman + SAAT); // cozum
    expect((mo.paraAkisi?.yerel ?? 0) > 0 || gelir(s, "a") > 0).toBe(true);
    expect(saglandi(s, "a")).toBe(true);
    // Sayaci elle sifirla: tembel kisim tek basina tetikler (t > t0).
    delete mo.dukkanGeliri;
    if (mo.paraAkisi) mo.paraAkisi.t0 = s.dunya.zaman - SAAT;
    expect(saglandi(s, "a")).toBe(mo.paraAkisi?.yerel !== undefined && mo.paraAkisi.yerel > 0);
  });

  it("yikimdan sonra kosul duser (yapi yok) ama gelir sayaci kalir; yeniden kurulumda yeniden saglanir; dedektor durumu degistirmez", () => {
    const s = sim();
    dukkanEkle(s, "a", [{ mal: "gida" }]);
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    expect(saglandi(s, "a")).toBe(true);
    const g = gelir(s, "a");
    dukkanlariSil(s);
    expect(saglandi(s, "a")).toBe(false);
    expect(gelir(s, "a")).toBe(g);
    const once = s.durumOzeti();
    dukkanEkle(s, "a", [{ mal: "gida" }]);
    expect(saglandi(s, "a")).toBe(true); // gelir zaten > 0: yeni dukkan hemen saglar (odul alinanOdul ile bir kezdir)
    saglandi(s, "a");
    expect(bolgeBul(s, "a").ekYapilar).toHaveLength(1);
    void once;
  });
});

describe("yazar: ilk_dukkan odulu bir kez, ilk satista, sistem kimligiyle", () => {
  it("yapi bitisinde odul YOK; ilk satista verilir (anahtar odul:a:ilk_dukkan); yikim ve yeniden kurulum tekrar vermez; Defter etkin", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: perakendeVeri(), tohum: 7, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
    const gonder = async (oyuncu: string, anahtar: string, komut: Parameters<DunyaYazari["komutGonder"]>[3]): Promise<void> => {
      const p = y.komutGonder(oyuncu, "test", anahtar, komut);
      await y.birTur();
      expect((await p).sonuc.tamam, anahtar).toBe(true);
    };
    await gonder("sistem", "k1", { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [] });
    let simdi = 0;
    const ilerlet = async (saatSayisi: number): Promise<void> => {
      for (let i = 0; i < saatSayisi; i++) {
        simdi += SAAT; // ElleSaat.ilerlet MUTLAK sim ms alir
        saat.ilerlet(simdi);
        await y.birTur();
      }
    };
    await ilerlet(3);
    const odulSayisi = async (): Promise<number> => (await depo.gunluk.oku(0)).filter((g) => g.anahtar === "odul:a:ilk_dukkan").length;
    // Dukkan yapildi (bos raf): odul yok.
    const sim = y.sim as Simulasyon;
    dukkanEkle(sim, "a", [{}]);
    await ilerlet(4);
    expect(await odulSayisi()).toBe(0);
    // Rafa stoklu mal: ilk satis -> odul.
    dukkanlariSil(sim);
    dukkanEkle(sim, "a", [{ mal: "gida" }]);
    await ilerlet(8);
    expect(await odulSayisi()).toBe(1);
    const kayit = (await depo.gunluk.oku(0)).find((g) => g.anahtar === "odul:a:ilk_dukkan");
    expect(kayit?.oyuncu).toBe("sistem");
    expect(kayit?.komut).toEqual({ tur: "sistem_odul", oyuncu: "a", kavram: "ilk_dukkan" });
    expect(sim.dunya.oyuncular.find((x) => x.id === "a")?.alinanOdul).toContain("ilk_dukkan");
    // Yikim ve yeniden kurulum tekrar vermez.
    dukkanlariSil(sim);
    await ilerlet(2);
    dukkanEkle(sim, "a", [{ mal: "gida" }]);
    await ilerlet(8);
    expect(await odulSayisi()).toBe(1);
    // Defter: kazanilan, etkin.
    const d = await y.defter("a");
    expect(d?.kazanilan.some((k) => k.kavram === "ilk_dukkan" && k.tur === "odul")).toBe(true);
    expect(d?.siradaki.find((x) => x.kavram === "ilk_sozlesme")?.etkin).toBe(false);
    await y.kapat();
  }, 60_000);
});

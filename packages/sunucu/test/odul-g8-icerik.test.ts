/**
 * Defter P4/P5 dedektörü GERÇEK G8-1 içeriğiyle (`veri/icerik`: `cam_firini`, `celik_dograma`, odul.kavramlar ilk_ekmek + ilk_pencere, kit pencere 3000): fikstür yok.
 * - Etkin kuralı içerikten türetilir; G8 verisiyle ilk_pencere ve ilk_cam artık etkin.
 * - Dedektör ÜRETİMLE tetiklenir: kit penceresi (`baslangicStok.pencere`) ilk_pencere'yi tetiklemez; cam fırını üretince ilk_cam damgası; çelik doğrama pencere üretince ilk_pencere.
 * - Ödül tablosu gerçek: ilk_ekmek 5 ekmek, ilk_pencere 8 parça; Defter siradaki bunları etkin gösterir; yazar üretim sayacıyla ödülü bir kez verir.
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon, odulDegeri } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut } from "@bolge/cekirdek";
import { kavramEtkin as protokolKavramEtkin } from "@bolge/protokol";
import { bellekDeposu } from "../src/depo/bellek";
import { damgaSaglandi, kavramSaglandi, oyuncuDugumleri } from "../src/odul/dedektor";
import { kavramEtkin } from "../src/odul/etkin";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { mulkVerisi } from "./yardimci";
import { bitisikCiftler, bolMulk } from "./yontem-yardimci";

const ILCE = "sn_m_ova_merkez";
const GUN = 24 * SAAT;

/** Gerçek G8 içeriği; kitte silis eklenir (cam fırınının girdisi; kit yalnız celik/parca/gida/pencere taşır): içerik DEĞİL, test girdisi. */
function veri(silis = 200_000_000, yurt = 0): CekirdekVeriPaketi {
  const kit = mulkVerisi().param.mulk?.yeniOyuncu.baslangicStok ?? {}; // GERÇEK kit (G7: pencere 3000); bolMulk bol celik/parca ile değiştirir, pencereyi korumak için geri eklenir
  return bolMulk(mulkVerisi(), (x) => {
    const m = x.param.mulk;
    if (m) {
      m.yeniOyuncu.baslangicStok = { ...m.yeniOyuncu.baslangicStok, pencere: kit["pencere"] ?? 0, silis };
      if (yurt > 0) m.yeniOyuncu.yurtHucre = yurt; // yazar testinde işletme düğümü yurtla gelsin
    }
  });
}

function kur(silis?: number): Simulasyon {
  const sim = Simulasyon.olustur(veri(silis), 21);
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut });
  return sim;
}

function tamam(sim: Simulasyon, komut: Komut): void {
  const r = sim.uygula({ t: sim.dunya.zaman, oyuncu: "ali", komut });
  expect(r.tamam, JSON.stringify(komut) + " -> " + JSON.stringify(r)).toBe(true);
}

function insa(sim: Simulasyon, hucreler: string[], yontem: string): void {
  tamam(sim, { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" });
  tamam(sim, { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "parca_fabrikasi", hucreler, yontem } as Komut);
}

const oyuncu = (s: Simulasyon) => s.dunya.oyuncular.find((x) => x.id === "ali")!;
const kavram = (s: Simulasyon, k: string): boolean => kavramSaglandi(s.ic, s.dunya, oyuncu(s), k, s.dunya.zaman);
const damga = (s: Simulasyon, k: string): boolean => damgaSaglandi(s.ic, s.dunya, "ali", k, s.dunya.zaman);
const uretim = (s: Simulasyon, mal: string): number => {
  const mi = s.ic.malIndeks[mal] as number;
  return oyuncuDugumleri(s.dunya, "ali").reduce((n, b) => n + (b.uretimToplam[mi] ?? 0), 0);
};

describe("G8-1 gerçek içeriği: etkin kuralı ve ödül tablosu", () => {
  it("pencere ve cam yöntemi içerikte var -> ilk_pencere, ilk_cam, ilk_ekmek, ilk_dukkan, ilk_raf etkin; beklenti içerikten türetilir; ödül satırları gerçek tabloda", () => {
    const v = veri();
    const s = Simulasyon.olustur(v, 1);
    const girdi = { yontemCiktilari: v.icerik.yontemler.flatMap((y) => Object.keys(y.ciktilar)), perakende: v.param.mulk?.perakende !== undefined };
    for (const k of ["ilk_yapi", "ilk_satis", "ilk_isleme", "ilk_ekmek", "zincir_kapandi", "ilk_dukkan", "ilk_pencere", "ilk_cam", "ilk_raf", "ilk_sozlesme", "ikinci_ilce", "ilk_arastirma"]) {
      expect(kavramEtkin(s.ic, k), k).toBe(protokolKavramEtkin(girdi, k));
    }
    for (const k of ["ilk_ekmek", "ilk_pencere", "ilk_cam", "ilk_dukkan", "ilk_raf"]) expect(kavramEtkin(s.ic, k), k).toBe(true); // G8 verisi geldi
    expect(kavramEtkin(s.ic, "ilk_sozlesme")).toBe(false);
    const tablo = s.ic.param.odul?.kavramlar ?? {};
    expect(tablo["ilk_ekmek"]).toEqual({ mal: { ekmek: 5_000 } });
    expect(tablo["ilk_pencere"]).toEqual({ mal: { parca: 8_000 } });
    expect(tablo["ilk_cam"]).toBeUndefined(); // damga: çekirdek ödül tablosuna girmez
    expect(tablo["ilk_raf"]).toBeUndefined();
    expect(odulDegeri(s.ic, "ilk_ekmek")).toBeGreaterThan(0);
    expect(odulDegeri(s.ic, "ilk_pencere")).toBeGreaterThan(0);
    expect(odulDegeri(s.ic, "ilk_cam")).toBeUndefined();
  });
});

describe("G8-1 gerçek içeriği: dedektör ÜRETİMLE tetiklenir", () => {
  it("kit penceresi (3 pencere stokta) ilk_pencere TETİKLEMEZ, günler geçse de; cam fırını cam üretince ilk_cam damgası; çelik doğrama pencere üretince ilk_pencere", () => {
    const s = kur();
    expect(mulkVerisi().param.mulk?.yeniOyuncu.baslangicStok["pencere"]).toBe(3_000); // G7 kiti
    const pi = s.ic.malIndeks["pencere"] as number;
    const stok = (): number => oyuncuDugumleri(s.dunya, "ali").reduce((n, b) => n + (b.stoklar[pi]?.miktar ?? 0), 0);
    s.calistirKadar(SAAT);
    // Kit: yeni oyuncu paketi pencereyi stoka koyar (üretim sayacına DEĞİL).
    const [g1, g2] = bitisikCiftler(s, ILCE, 2) as [string[], string[]];
    insa(s, g1, "cam_firini");
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    expect(damga(s, "ilk_cam")).toBe(true); // gerçek cam üretimi
    expect(uretim(s, "cam")).toBeGreaterThan(0);
    expect(kavram(s, "ilk_pencere")).toBe(false); // kit stoku var ama pencere ÜRETİLMEDİ
    expect(stok()).toBeGreaterThanOrEqual(3_000); // gerçek kit pencere stoğu hâlâ yerinde
    expect(uretim(s, "pencere")).toBe(0);
    insa(s, g2, "celik_dograma");
    s.calistirKadar(s.dunya.zaman + 3 * GUN);
    expect(uretim(s, "pencere")).toBeGreaterThan(0);
    expect(kavram(s, "ilk_pencere")).toBe(true);
  });

  it("cam fırını kurulu ama girdisiz (silis yok) üretmez: ilk_cam tetiklemez", () => {
    const s = kur(0);
    s.calistirKadar(SAAT);
    const [g1] = bitisikCiftler(s, ILCE, 1) as [string[]];
    insa(s, g1, "cam_firini");
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    expect(uretim(s, "cam")).toBe(0);
    expect(damga(s, "ilk_cam")).toBe(false);
  });
});

describe("G8-1 gerçek içeriği: yazar (ödül ve damga)", () => {
  it("Defter siradaki ilk_ekmek ve ilk_pencere'yi etkin gösterir; üretim sayacı ödülü bir kez verir (ekmek 5, parça 8) ve ilk_cam damgası profile yazılır; kit pencere ödül vermez", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: veri(200_000_000, 6), tohum: 7, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
    const p = y.komutGonder("sistem", "test", "k1", { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: ILCE });
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
    await ilerlet(4);
    const d0 = await y.defter("a");
    const etkin = (k: string): boolean | undefined => d0?.siradaki.find((x) => x.kavram === k)?.etkin;
    expect(etkin("ilk_ekmek")).toBe(true);
    expect(etkin("ilk_pencere")).toBe(true);
    expect(d0?.siradaki.find((x) => x.kavram === "ilk_ekmek")?.odul).toMatchObject({ mal: { ekmek: 5_000 } });
    expect(d0?.siradaki.find((x) => x.kavram === "ilk_pencere")?.odul).toMatchObject({ mal: { parca: 8_000 } });
    expect(await odulSayisi("ilk_pencere")).toBe(0); // kit penceresi stokta
    const sim = y.sim as Simulasyon;
    const b = oyuncuDugumleri(sim.dunya, "a")[0]!;
    for (const m of ["ekmek", "pencere", "cam"]) b.uretimToplam[sim.ic.malIndeks[m] as number] = 1_000;
    await ilerlet(2);
    expect(await odulSayisi("ilk_ekmek")).toBe(1);
    expect(await odulSayisi("ilk_pencere")).toBe(1);
    const damgalar = ((await depo.profil?.damgaOku("a")) ?? []).filter((x) => x.kaynak === "damga").map((x) => x.kavram);
    expect(damgalar).toContain("ilk_cam");
    await ilerlet(3);
    expect(await odulSayisi("ilk_ekmek")).toBe(1);
    expect(await odulSayisi("ilk_pencere")).toBe(1);
    await y.kapat();
  }, 60_000);
});

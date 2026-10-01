/**
 * Mülk kipinde birkaç gün koşan yazar: periyodik ve elle anlık görüntü alımı paylaşılan referans hatası vermez
 * (eski `paylasimiKir` geçici çözümü kaldırıldı; çekirdek akış yollarını artık kopyalıyor, S3 `lojistik-paylasim`).
 * Görüntüden kurtarılan dünya canlı dünyayla aynı t'de aynı özeti verir.
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { bitisikSatilabilir, mulkVerisi } from "./yardimci";

const ILCE = "sn_m_ova_merkez";

describe("mulk kipi: gorunum alimi", () => {
  it("5 gun kosan yazarda periyodik ve elle goruntu alimi hata vermez; kurtarilan dunya ayni ozeti verir", async () => {
    const veri = () => {
      const v = mulkVerisi();
      if (v.param.mulk) v.param.mulk.yeniOyuncu.hibe = 500_000_000;
      return v;
    };
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 12 * SAAT });
    const uyarilar: string[] = [];
    yazar.uyari((m) => uyarilar.push(m));
    let n = 0;
    const gonder = async (oyuncu: string, komut: Komut): Promise<boolean> => {
      const p = yazar.komutGonder(oyuncu, "test", `k${n++}`, komut);
      await yazar.birTur();
      return (await p).sonuc.tamam;
    };
    expect(await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] })).toBe(true);
    saat.ilerlet(SAAT);
    await yazar.birTur();
    // Hücreler: kamu olmayan bitişik iki kırsal hücre.
    const hucreler = bitisikSatilabilir(yazar.sim, ILCE);
    expect(await gonder("ali", { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" })).toBe(true);
    expect(await gonder("ali", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler })).toBe(true);
    await gonder("ali", { tur: "ticaret_emri", bolge: "sn_m_ova#ali", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    for (let saatNo = 1; saatNo <= 5 * 24; saatNo++) {
      saat.ilerlet(saatNo * SAAT + SAAT);
      await yazar.birTur();
    }
    expect(yazar.sim.dunya.zaman).toBeGreaterThanOrEqual(5 * 24 * SAAT);
    await yazar.goruntuAl(); // elle de alinabilir
    expect(yazar.sonGoruntuHatasi).toBeNull();
    expect(uyarilar).toEqual([]);
    expect(depo.goruntu.sayi).toBeGreaterThan(5); // acilis + periyodik (12 sa'te bir) + elle
    const t = yazar.sim.dunya.zaman;
    const ozet = yazar.ozet();
    await yazar.kapat();
    const k = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat: new ElleSaat(), commitAraligiMs: 15 });
    expect(k.kurtarma.simZamani).toBe(t);
    expect(k.ozet().durumOzeti).toBe(ozet.durumOzeti);
  }, 60_000);
});

/**
 * G6 (sartname §5.9, K-5): `mulk.yontemGecersizKilma` yedek yolu, varsayılan KAPALI. Kapalıyken (blok yok ya da `ciktiPpm = 1 000 000`) mülk kipi koşusu bayt bayt aynıdır;
 * `750 000` mülk kipinde çıktıyı ×0,75 yapar, GİRDİYE dokunmaz; bölge kipinde etkisizdir. NEGATİF KONTROL: kilma etkin olunca özet DEĞİŞİR (kanıt farkı yakalar).
 */
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { Simulasyon } from "../src/motor";
import { anlikMiktar } from "../src/stok";
import { PPM, SAAT } from "../src/tipler";
import type { BolgeDurumu, CekirdekVeriPaketi, Stok } from "../src/tipler";
import { bitisikGrup, mulkSim, tamam } from "./mulk-yardimci";
import { parselFiksturuYukle } from "@bolge/veri";
import { DEGIRMEN_T, yontemliBolgeVeri, yontemliMulkVeri } from "./yontem-yardimci";

const F = parselFiksturuYukle("mini-6");
const ILCE = "sn_m_ova_merkez";
const GIDA = "standart_gida_isleme";

/** `standart_gida_isleme` elektriksiz (santral/şebeke gerekmesin): girdi yalnız tahıl; çıktı gida. */
function veri(kilma?: number | null): CekirdekVeriPaketi {
  return yontemliMulkVeri((v) => {
    const y = v.icerik.yontemler.find((k) => k.id === GIDA)!;
    delete y.girdiler["elektrik"];
    if (kilma !== undefined && kilma !== null) v.param.mulk!.yontemGecersizKilma = { [GIDA]: { ciktiPpm: kilma } };
  });
}

/** `a` oyuncusu bir gida_fabrikasi (varsayılan yöntem) kurar ve 48 saat çalıştırır; (gida stoğu, tahıl stoğu, durumOzeti) döner. */
function kos(v: CekirdekVeriPaketi): { gida: number; tahil: number; ozet: string; sim: Simulasyon } {
  const s = mulkSim(["a"], v);
  tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: bitisikGrup(F, ILCE, "kirsal", 2, 0), sinif: "kirsal" });
  s.calistirKadar(s.dunya.zaman + 24 * SAAT); // inşa biter
  const b = s.dunya.bolgeler.find((x) => x.merkez !== undefined && x.sahip === "a")!;
  const stok = (mal: string): number => anlikMiktar((s.dunya.bolgeler[b.indeks] as BolgeDurumu).stoklar[s.ic.malIndeks[mal] as number] as Stok, s.dunya.zaman);
  const uretim = (mal: string): number => (s.dunya.bolgeler[b.indeks] as BolgeDurumu).uretimToplam[s.ic.malIndeks[mal] as number] as number;
  const gida0 = uretim("gida"); // toplam ÜRETİM sayacı (depo kapasitesi ve tüketim etkisiz)
  const tahil0 = stok("tahil");
  s.calistirKadar(s.dunya.zaman + 48 * SAAT);
  return { gida: uretim("gida") - gida0, tahil: tahil0 - stok("tahil"), ozet: s.durumOzeti(), sim: s };
}

describe("yontemGecersizKilma (mülk kipi)", () => {
  it("kapalı: blok yok = ciktiPpm 1 000 000 (özet bayt bayt aynı); koşu gerçekten üretiyor (test anlamlı)", () => {
    const a = kos(veri());
    const b = kos(veri(PPM));
    expect(a.gida).toBeGreaterThan(0);
    expect(a.tahil).toBeGreaterThan(0);
    expect(b.ozet).toBe(a.ozet);
    expect(b.sim.ic.mulk!.yontemCiktiPpm).toBeUndefined();
  });

  it("ciktiPpm 750 000: çıktı ×0,75, GİRDİ aynı; özet DEĞİŞİR (negatif kontrol: kilma etkili)", () => {
    const acik = kos(veri());
    const kilma = kos(veri(750_000));
    expect(kilma.sim.ic.mulk!.yontemCiktiPpm).toEqual({ [kilma.sim.ic.yontemIndeks[GIDA] as number]: 750_000 });
    expect(kilma.tahil).toBe(acik.tahil); // girdi tüketimi aynı
    expect(kilma.ozet).not.toBe(acik.ozet);
    // çıktı oranı 0,75 (saatlik tamsayı yuvarlama payıyla)
    expect(Math.abs(kilma.gida * 4 - acik.gida * 3)).toBeLessThanOrEqual(acik.gida * 0.005);
    expect(kilma.gida).toBeLessThan(acik.gida);
  });

  it("ciktiPpm 1 500 000: çıktı ×1,5 (üst sınır yönü de çalışır)", () => {
    const acik = kos(veri());
    const k = kos(veri(1_500_000));
    expect(Math.abs(k.gida * 2 - acik.gida * 3)).toBeLessThanOrEqual(acik.gida * 0.005);
  });

  it("yalnız kilma tablosundaki yöntem etkilenir: başka yöntemin satırı bu yöntemin çıktısını değiştirmez", () => {
    const acik = kos(veri());
    const baska = kos(yontemliMulkVeri((v) => {
      const y = v.icerik.yontemler.find((k) => k.id === GIDA)!;
      delete y.girdiler["elektrik"];
      v.param.mulk!.yontemGecersizKilma = { [DEGIRMEN_T]: { ciktiPpm: 500_000 } };
    }));
    expect(baska.ozet).toBe(acik.ozet);
  });

  it("bölge kipinde (parsel yok) blok okunmaz: ic.mulk tanımsız; 750 000 bile durumOzeti'ni değiştirmez", () => {
    const v = yontemliBolgeVeri();
    v.param.mulk!.yontemGecersizKilma = { [GIDA]: { ciktiPpm: 750_000 } };
    expect(icerikDerle(v).mulk).toBeUndefined();
    const a = Simulasyon.olustur(yontemliBolgeVeri(), 3);
    const b = Simulasyon.olustur(v, 3);
    for (const s of [a, b]) {
      s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "x", bolgeler: ["m_ova"] } });
      s.calistirKadar(48 * SAAT);
    }
    expect(b.durumOzeti()).toBe(a.durumOzeti());
  });
});

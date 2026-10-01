/**
 * G6-1: `mulk.yontemGecersizKilma` derlemesi (sartname §5.9) ve veri/çekirdek sabit uyumu. Çekirdeğin ÇIKTI yolu G6-2'dedir (`yontem-gecersiz-kilma.test.ts`);
 * burada yalnız: tablo yalnız `ciktiPpm !== PPM` satırlarından kurulur, hepsi PPM ise ya da blok yoksa alan OLUŞMAZ ve KAPALI blok `durumOzeti`'ni değiştirmez.
 */
import { MULK_ENCOK_AYAK_IZI } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { KOMUT_SEMASI } from "../src/komutSemasi";
import { ENCOK_AYAK_IZI } from "../src/mulk/komut";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { GUN, PPM } from "../src/tipler";
import { mulkVeri } from "./mulk-yardimci";

const GIDA = "standart_gida_isleme";

describe("yontemCiktiPpm derlemesi", () => {
  it("blok yok ya da hepsi PPM (kapalı): alan OLUŞMAZ", () => {
    expect(icerikDerle(mulkVeri()).mulk!.yontemCiktiPpm).toBeUndefined();
    const kapali = mulkVeri((v) => {
      v.param.mulk!.yontemGecersizKilma = { [GIDA]: { ciktiPpm: PPM } };
    });
    expect(icerikDerle(kapali).mulk!.yontemCiktiPpm).toBeUndefined();
  });

  it("yalnız ciktiPpm !== PPM satırları tablolanır (yöntem indeksiyle); PPM satırı tabloya girmez", () => {
    const v = mulkVeri((x) => {
      x.param.mulk!.yontemGecersizKilma = { [GIDA]: { ciktiPpm: 750_000 }, mekanize_tarim: { ciktiPpm: PPM }, derin_komur: { ciktiPpm: 2_000_000 } };
    });
    const ic = icerikDerle(v);
    expect(ic.mulk!.yontemCiktiPpm).toEqual({ [ic.yontemIndeks[GIDA] as number]: 750_000, [ic.yontemIndeks["derin_komur"] as number]: 2_000_000 });
  });

  it("bilinmeyen yöntem ve aralık dışı değer derleme hatasıdır (veri doğrulayıcısını atlayan paket)", () => {
    expect(() => icerikDerle(mulkVeri((x) => (x.param.mulk!.yontemGecersizKilma = { olmayan: { ciktiPpm: 750_000 } })))).toThrow(/mulk\.yontemGecersizKilma bilinmeyen yontem: olmayan/);
    for (const kotu of [0, -1, 2_000_001, 750_000.5]) {
      expect(() => icerikDerle(mulkVeri((x) => (x.param.mulk!.yontemGecersizKilma = { [GIDA]: { ciktiPpm: kotu } }))), String(kotu)).toThrow(/ciktiPpm/);
    }
  });

  it("bölge kipinde (parsel yok) blok okunmaz: ic.mulk tanımsız", () => {
    const v = mulkVeri((x) => (x.param.mulk!.yontemGecersizKilma = { [GIDA]: { ciktiPpm: 750_000 } }));
    delete v.parsel;
    expect(icerikDerle(v).mulk).toBeUndefined();
  });

  it("KAPALI blok (ciktiPpm: PPM) durumOzeti'ni değiştirmez: blok yok = kapalı blok (oyunculu, 3 gün); NEGATİF KONTROL: karşılaştırma dünya farkını yakalar", () => {
    const kos = (duzenle?: (v: ReturnType<typeof mulkVeri>) => void, oyuncu = "a"): Simulasyon => {
      const s = Simulasyon.olustur(mulkVeri(duzenle), 5);
      expect(s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu, bolgeler: [] } }).tamam).toBe(true);
      return s;
    };
    const a = kos();
    const b = kos((x) => (x.param.mulk!.yontemGecersizKilma = { [GIDA]: { ciktiPpm: PPM } }));
    const c = kos(undefined, "baska_oyuncu"); // farklı dünya: kanıt bunu yakalayabilmeli
    for (let g = 1; g <= 3; g++) {
      a.calistirKadar(g * GUN);
      b.calistirKadar(g * GUN);
      c.calistirKadar(g * GUN);
      expect(b.durumOzeti(), `gun ${g}`).toBe(a.durumOzeti());
      expect(c.durumOzeti(), `gun ${g} (negatif kontrol)`).not.toBe(a.durumOzeti());
    }
  });
});

describe("veri ve çekirdek sabitleri / komut alanı", () => {
  it("MULK_ENCOK_AYAK_IZI (veri doğrulayıcı) = ENCOK_AYAK_IZI (çekirdek komut sınırı)", () => {
    expect(MULK_ENCOK_AYAK_IZI).toBe(ENCOK_AYAK_IZI);
  });

  it("KOMUT_SEMASI: iki inşa komutunda isteğe bağlı yontem alanı kimlik türünde; miktar/oran/adet değil", () => {
    expect(KOMUT_SEMASI.tesis_insa_hucre.alanlar).toMatchObject({ yontem: "kimlik" });
    expect(KOMUT_SEMASI.yapi_yerlestir.alanlar).toMatchObject({ yontem: "kimlik" });
  });
});

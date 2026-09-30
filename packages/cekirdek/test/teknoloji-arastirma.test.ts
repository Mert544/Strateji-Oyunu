/** Teknoloji alt sistemi testleri: araştırma akışı ve açıklık fonksiyonları (ekonomi/lojistik sahte). */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/ekonomi", () => ({ saatlikTik: vi.fn(), insaatBitti: vi.fn(), ekonomiKomutu: vi.fn() }));
vi.mock("../src/lojistik/cozum", () => ({ lojistikCoz: vi.fn(), lojistikKomutu: vi.fn() }));

import { miniVeriyiYukle } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { anlikHazine, oyuncuBul } from "../src/stok";
import { birlikAcikMi, tesisTuruAcikMi, yontemAcikMi } from "../src/teknoloji";
import { GUN } from "../src/tipler";
import type { Komut } from "../src/tipler";
import { yenilikleriKapat } from "./yenilikler";

function kur(tohum = 1): Simulasyon {
  const s = Simulasyon.olustur(yenilikleriKapat(miniVeriyiYukle()), tohum);
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_liman"] } });
  // Bol para: sahte ekonomi hazineyi değiştirmez.
  for (const o of s.dunya.oyuncular) o.hazine.miktar = 1_000_000_000;
  return s;
}

function arastir(s: Simulasyon, t: number, teknoloji: string, oyuncu = "a") {
  const komut: Komut = { tur: "arastir", teknoloji };
  return s.uygula({ t, oyuncu, komut });
}

describe("arastir", () => {
  it("on kosulsuz arastirma: maliyet duser, bitis planlanir, sure sonunda acilir", () => {
    const s = kur();
    const ic = s.ic;
    const tek = ic.teknolojiler[ic.teknolojiIndeks["mekanize_tarim"] as number]!;
    const once = anlikHazine(s.dunya, "a");
    expect(arastir(s, 1000, "mekanize_tarim")).toEqual({ tamam: true });
    const o = oyuncuBul(s.dunya, "a")!;
    expect(anlikHazine(s.dunya, "a")).toBe(once - tek.maliyet);
    expect(o.arastirma).toEqual({ teknoloji: ic.teknolojiIndeks["mekanize_tarim"], bitis: 1000 + tek.sureGun * GUN });
    expect(o.teknolojiler).toEqual([]);
    // Bitişten bir ms önce henüz açılmamış
    s.calistirKadar(1000 + tek.sureGun * GUN - 1);
    expect(o.teknolojiler).toEqual([]);
    s.calistirKadar(1000 + tek.sureGun * GUN);
    expect(o.teknolojiler).toEqual([ic.teknolojiIndeks["mekanize_tarim"]]);
    expect(o.arastirma).toBeNull();
    // Diğer oyuncu etkilenmez
    expect(oyuncuBul(s.dunya, "b")!.teknolojiler).toEqual([]);
  });

  it("on kosul eksikse reddedilir ve hazine degismez", () => {
    const s = kur();
    const once = anlikHazine(s.dunya, "a");
    const r = arastir(s, 0, "otomasyon");
    expect(r.tamam).toBe(false);
    expect(anlikHazine(s.dunya, "a")).toBe(once);
    expect(oyuncuBul(s.dunya, "a")!.arastirma).toBeNull();
  });

  it("devam eden arastirma varken ikinci arastirma reddedilir", () => {
    const s = kur();
    expect(arastir(s, 0, "mekanize_tarim").tamam).toBe(true);
    const once = anlikHazine(s.dunya, "a");
    const r = arastir(s, 1000, "derin_madencilik");
    expect(r.tamam).toBe(false);
    expect(anlikHazine(s.dunya, "a")).toBe(once);
  });

  it("para yetersizse reddedilir; acik teknoloji tekrar arastirilamaz; bilinmeyen teknoloji reddedilir", () => {
    const s = kur();
    const o = oyuncuBul(s.dunya, "a")!;
    o.hazine.miktar = 1000;
    expect(arastir(s, 0, "mekanize_tarim").tamam).toBe(false);
    expect(o.hazine.miktar).toBe(1000);
    expect(o.arastirma).toBeNull();
    expect(arastir(s, 0, "yok_boyle_teknoloji").tamam).toBe(false);

    o.hazine.miktar = 1_000_000_000;
    expect(arastir(s, 0, "mekanize_tarim").tamam).toBe(true);
    s.calistirKadar(3 * GUN);
    expect(arastir(s, 3 * GUN, "mekanize_tarim").tamam).toBe(false);
  });

  it("zincir: on kosul acilinca sonraki arastirilir; kararlar siralı ve tekrarsiz eklenir", () => {
    const s = kur();
    const ic = s.ic;
    let t = 0;
    for (const id of ["mekanize_tarim", "otomasyon", "konteyner_limani"]) {
      expect(arastir(s, t, id).tamam, id).toBe(true);
      const sure = ic.teknolojiler[ic.teknolojiIndeks[id] as number]!.sureGun * GUN;
      t += sure;
      s.calistirKadar(t);
    }
    const o = oyuncuBul(s.dunya, "a")!;
    expect(o.teknolojiler).toEqual(
      ["mekanize_tarim", "otomasyon", "konteyner_limani"].map((id) => ic.teknolojiIndeks[id] as number).sort((x, y) => x - y),
    );
    expect(o.kararlar).toEqual(["deniz_kenar_gelistir"]);
    expect(o.arastirma).toBeNull();
  });

  it("arastirmaBitti eskimis/yinelenen olayda zarar vermez", () => {
    const s = kur();
    expect(arastir(s, 0, "mekanize_tarim").tamam).toBe(true);
    s.calistirKadar(3 * GUN);
    s.baglam.planla(s.dunya, s.dunya.zaman, { tur: "arastirma_bitti", oyuncu: "a" });
    s.calistirKadar(s.dunya.zaman);
    expect(oyuncuBul(s.dunya, "a")!.teknolojiler).toHaveLength(1);
    expect(oyuncuBul(s.dunya, "a")!.arastirma).toBeNull();
  });

  it("ayni tohum ve komutlar: ayni durum ozeti", () => {
    const calistir = () => {
      const s = kur(7);
      arastir(s, 100, "mekanize_tarim");
      arastir(s, 100, "derin_madencilik", "b");
      s.calistirKadar(10 * GUN);
      return s.durumOzeti();
    };
    expect(calistir()).toBe(calistir());
  });
});

describe("acik mi fonksiyonlari", () => {
  it("yontemAcikMi: teknolojisiz yontem herkese acik, teknolojili yontem oyuncu teknolojiyi acinca acilir, null oyuncu icin kapali", () => {
    const s = kur();
    const ic = s.ic;
    const d = s.dunya;
    const ctx = s.baglam;
    const mekanize = ic.yontemIndeks["mekanize_tarim"] as number;
    const temel = ic.yontemler.findIndex((y) => y.gerekliTeknoloji === undefined);
    expect(temel).toBeGreaterThanOrEqual(0);
    expect(yontemAcikMi(d, ctx, "a", temel)).toBe(true);
    expect(yontemAcikMi(d, ctx, null, temel)).toBe(true);
    expect(yontemAcikMi(d, ctx, "a", mekanize)).toBe(false);
    expect(yontemAcikMi(d, ctx, null, mekanize)).toBe(false);
    expect(yontemAcikMi(d, ctx, "yok", mekanize)).toBe(false);
    expect(yontemAcikMi(d, ctx, "a", 9999)).toBe(false);

    arastir(s, 0, "mekanize_tarim");
    s.calistirKadar(3 * GUN);
    expect(yontemAcikMi(d, ctx, "a", mekanize)).toBe(true);
    expect(yontemAcikMi(d, ctx, "b", mekanize)).toBe(false);
  });

  it("birlikAcikMi: zirhli tumen mekanize_ordu ister; tesisTuruAcikMi: teknolojisiz turler acik", () => {
    const s = kur();
    const ic = s.ic;
    const d = s.dunya;
    const ctx = s.baglam;
    const piyade = ic.birlikIndeks["piyade_tumeni"] as number;
    const zirhli = ic.birlikIndeks["zirhli_tumen"] as number;
    expect(birlikAcikMi(d, ctx, "a", piyade)).toBe(true);
    expect(birlikAcikMi(d, ctx, "a", zirhli)).toBe(false);
    oyuncuBul(d, "a")!.teknolojiler.push(ic.teknolojiIndeks["mekanize_ordu"] as number);
    expect(birlikAcikMi(d, ctx, "a", zirhli)).toBe(true);
    expect(birlikAcikMi(d, ctx, "b", zirhli)).toBe(false);
    for (let i = 0; i < ic.tesisTurleri.length; i++) {
      const gerekli = ic.tesisTurleri[i]!.gerekliTeknoloji;
      expect(tesisTuruAcikMi(d, ctx, "a", i)).toBe(gerekli === undefined);
    }
  });

  it("tesisTuruAcikMi: gerekliTeknoloji tanimli tur icin teknoloji sahibiyse acik", () => {
    const s = kur();
    const ic = s.ic;
    // Sözleşme testi: içeriğe geçici bir gereksinim eklenir (ic salt okunur ama yalnızca bu test örneğinde).
    ic.tesisTurleri[0]!.gerekliTeknoloji = "mekanize_tarim";
    expect(tesisTuruAcikMi(s.dunya, s.baglam, "a", 0)).toBe(false);
    oyuncuBul(s.dunya, "a")!.teknolojiler.push(ic.teknolojiIndeks["mekanize_tarim"] as number);
    expect(tesisTuruAcikMi(s.dunya, s.baglam, "a", 0)).toBe(true);
  });
});

/**
 * Yeniden oynatma doğruluğu (F1): sunucu YALNIZ başarılı komutları günlüğe yazar. Başarılı + başarısız karışık
 * komutlarla (4 bot + bulanık komutlar) koşulan dünyanın son özeti, yalnız başarılı komutların `yenidenOynat` +
 * aynı `calistirKadar(son t)` sonucuyla birebir aynı olmalıdır. Ayrıca başarısız komut ANINDA da özet değişmemelidir
 * (başarısız komut yalnız zamanı ilerletir; durum temsiline dokunmaz).
 */
import { gercekVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { anlikHazine, hazineEkle, oyuncuBul } from "../src/stok";
import { GUN, SAAT } from "../src/tipler";
import { kucukVeri } from "./fikstur";
import { senaryoKos } from "./serilestir-yardimci";

const HARITALAR: [string, () => VeriPaketi][] = [
  ["sentetik-50", varsayilanVeriyiYukle],
  ["gercek harita", gercekVeriyiYukle],
];

describe("yeniden oynatma: yalniz basarili komutlar", () => {
  for (const [ad, yukle] of HARITALAR) {
    it(`${ad}, 4 bot + bulanik komutlar, 10 gun: son ozet = yenidenOynat(basarililar) ozeti`, () => {
      const sure = 10 * GUN;
      const sonuc = senaryoKos({ veri: yukle(), tohum: 1, sureMs: sure });
      // Karışık olmalı: hem başarılı hem başarısız komut var
      expect(sonuc.basarili).toBeGreaterThan(100);
      expect(sonuc.basarisiz).toBeGreaterThan(50);
      const basarililar = sonuc.adimlar.filter((a) => a.tamam).map((a) => a.k);
      expect(sonuc.sim.gunluk).toEqual(basarililar);

      const r = Simulasyon.yenidenOynat(yukle(), 1, basarililar);
      r.calistirKadar(sure);
      expect(r.dunya.zaman).toBe(sonuc.sim.dunya.zaman);
      expect(r.durumOzeti()).toBe(sonuc.sim.durumOzeti());
    }, 180_000);
  }
});

describe("basarisiz komut yan etkisizdir (ara ozet de esit)", () => {
  // Pahalı (komut başına iki tam özet): kısa koşu, yoğun bulanık komut.
  for (const [ad, yukle, bulanikAdet] of [
    ["sentetik-50", varsayilanVeriyiYukle, 14],
    ["gercek harita", gercekVeriyiYukle, 10],
  ] as const) {
    it(`${ad}, 1 gun: her basarisiz komuttan once ve sonra ozet ayni`, () => {
      const sonuc = senaryoKos({ veri: yukle(), tohum: 2, sureMs: GUN, bulanikAdet, yanEtkiDenetimi: true });
      expect(sonuc.denetlenen).toBeGreaterThan(20);
      expect(sonuc.yanEtkiler).toEqual([]);
    }, 180_000);
  }

  it("ara noktalarda da: her karar aninda canli ozet = basarililarin yeniden oynatilmis ozeti", () => {
    const anlar: { n: number; t: number; ozet: string }[] = [];
    const sonuc = senaryoKos({
      veri: varsayilanVeriyiYukle(),
      tohum: 3,
      sureMs: 3 * GUN,
      bulanikAdet: 10,
      kararAni: (sim, t) => anlar.push({ n: sim.gunluk.length, t, ozet: sim.durumOzeti() }),
    });
    const gunluk = sonuc.sim.gunluk;
    const r = Simulasyon.olustur(varsayilanVeriyiYukle(), 3);
    let i = 0;
    for (const a of anlar) {
      for (; i < a.n; i++) expect(r.uygula(gunluk[i]!).tamam).toBe(true);
      r.calistirKadar(a.t);
      expect(r.durumOzeti(), `t=${a.t / SAAT} sa`).toBe(a.ozet);
    }
  }, 180_000);

  it("hazineEkle: yetersiz hazinede hazinenin temsiline (miktar/t0/artik) dokunmaz", () => {
    const s = Simulasyon.olustur(kucukVeri(), 1);
    expect(s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "p1", bolgeler: ["ova"] } }).tamam).toBe(true);
    const o = oyuncuBul(s.dunya, "p1")!;
    s.calistirKadar(5 * SAAT + 17);
    o.hazine.yerelOran = 1_234_567; // son tıktan beri tembel birikim: uzlaştırma temsili (miktar/t0/artik) değiştirirdi
    expect(o.hazine.t0).toBeLessThan(s.dunya.zaman);
    const once = structuredClone(o.hazine);
    const anlik = anlikHazine(s.dunya, "p1");
    expect(hazineEkle(s.dunya, "p1", -(anlik + 1))).toBe(false);
    expect(o.hazine).toEqual(once);
    // Tam yetecek kadar: başarılı ve uzlaştırılmış
    expect(hazineEkle(s.dunya, "p1", -anlik)).toBe(true);
    expect(o.hazine.miktar).toBe(0);
    expect(o.hazine.t0).toBe(s.dunya.zaman);
  });
});

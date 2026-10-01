/**
 * Başarısız komut yan etkisizdir (F1): başarısız komut ANINDA da özet değişmemelidir (başarısız komut yalnız zamanı ilerletir;
 * durum temsiline dokunmaz). (Eski `serilestir-yeniden-oynatma.test.ts`'in ikinci betimlemesi; birinci betimleme
 * `serilestir-yeniden-oynatma-{sentetik,gercek}.test.ts` dosyalarındadır.)
 */
import { gercekVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { anlikHazine, hazineEkle, oyuncuBul } from "../src/stok";
import { GUN, SAAT } from "../src/tipler";
import { kucukVeri } from "./fikstur";
import { senaryoKos } from "./serilestir-yardimci";

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

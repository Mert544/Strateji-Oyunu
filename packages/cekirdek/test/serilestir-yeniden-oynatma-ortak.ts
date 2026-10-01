/**
 * `serilestir-yeniden-oynatma-*.test.ts` dosyalarının ortak hazırlığı (eski `serilestir-yeniden-oynatma.test.ts` bölündü;
 * paralel koşsunlar diye). Test içeriği, adları ve beklenen değerler bölmeden ÖNCEKİYLE birebir aynıdır; yalnız yer değişti.
 */
import type { VeriPaketi } from "@bolge/veri";
import { expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { GUN } from "../src/tipler";
import { senaryoKos } from "./serilestir-yardimci";

/** "yeniden oynatma: yalniz basarili komutlar" betimlemesi içinde, tek harita için tek test kaydeder. */
export function basariliYenidenOynatmaTesti(ad: string, yukle: () => VeriPaketi): void {
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

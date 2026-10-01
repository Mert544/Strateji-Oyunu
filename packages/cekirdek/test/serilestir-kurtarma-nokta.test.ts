/**
 * Serileştir -> çöz -> yükle (F1): rastgele noktalarda alınan anlık görüntüden yüklenen simülasyon, orijinalle aynı
 * komutlarla ilerleyince aynı özeti verir. (Eski `serilestir-kurtarma.test.ts`'in birinci betimlemesi; kill -9 benzetimi
 * `serilestir-kurtarma-kill9-*.test.ts` dosyalarındadır. Ortak hazırlık: `serilestir-kurtarma-ortak.ts`.)
 */
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { dunyaCoz, dunyaSerilestir } from "../src/serilestir";
import { GUN } from "../src/tipler";
import { kayit, noktalar } from "./serilestir-kurtarma-ortak";
import type { Adim } from "./serilestir-yardimci";

describe("serilestir -> coz -> yukle: 20 rastgele nokta", () => {
  it("sentetik-50, 4 bot + bulanik komutlar, 4 gun: her noktada yuklenen = orijinal (sonraki noktaya ve sona kadar)", () => {
    const sure = 4 * GUN;
    const adimlar = kayit(varsayilanVeriyiYukle, 7, 4);
    const nk = noktalar(7, adimlar.length, 20);
    const a = Simulasyon.olustur(varsayilanVeriyiYukle(), 7);
    let yuklenen: Simulasyon | null = null;
    let basarisizSayisi = 0;
    for (let i = 0; i < adimlar.length; i++) {
      if (nk.includes(i)) {
        if (yuklenen !== null) expect(yuklenen.durumOzeti(), `adim ${i}`).toBe(a.durumOzeti());
        // Ara bir anda (bekleyen olaylar işlenmeden, kuyruk dolu) görüntü: metin -> çöz -> yükle
        const metin = dunyaSerilestir(a.dunya);
        const d = dunyaCoz(metin);
        expect(dunyaSerilestir(d)).toBe(metin);
        yuklenen = Simulasyon.yukle(varsayilanVeriyiYukle(), d, a.gunluk);
        expect(yuklenen.durumOzeti()).toBe(a.durumOzeti());
        expect(yuklenen.gunluk).toEqual(a.gunluk);
      }
      const k = (adimlar[i] as Adim).k;
      const ra = a.uygula(k);
      expect(ra.tamam).toBe((adimlar[i] as Adim).tamam);
      if (!ra.tamam) basarisizSayisi++;
      if (yuklenen !== null) {
        const ry = yuklenen.uygula(k);
        expect(ry).toEqual(ra);
      }
    }
    a.calistirKadar(sure);
    yuklenen!.calistirKadar(sure);
    expect(yuklenen!.durumOzeti()).toBe(a.durumOzeti());
    expect(yuklenen!.gunluk).toEqual(a.gunluk);
    expect(basarisizSayisi).toBeGreaterThan(20);
  }, 180_000);
});

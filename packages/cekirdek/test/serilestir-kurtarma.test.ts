/**
 * Serileştir -> çöz -> yükle (F1): rastgele noktalarda alınan anlık görüntüden yüklenen simülasyon, orijinalle aynı
 * komutlarla ilerleyince aynı özeti verir; kill -9 benzetimi: son anlık görüntü + komut günlüğünün kalanı ile kurtarılan
 * dünya kesintisiz koşuyla birebir aynıdır.
 */
import { gercekVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { aralik, prngOlustur } from "../src/prng";
import { anlikGoruntuCoz, anlikGoruntuOlustur, dunyaCoz, dunyaSerilestir, kuralSurumuHesapla } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { DamgaliKomut } from "../src/tipler";
import type { Adim } from "./serilestir-yardimci";
import { senaryoKos } from "./serilestir-yardimci";

/** Senaryonun komut akışı (başarılı + başarısız) bir kez kaydedilir; sonra botsuz, aynen yeniden uygulanır. */
function kayit(veri: () => VeriPaketi, tohum: number, gun: number): Adim[] {
  return senaryoKos({ veri: veri(), tohum, sureMs: gun * GUN, bulanikAdet: 6 }).adimlar;
}

/** n farklı adım indeksi (artan), [1, adet) aralığında. */
function noktalar(tohum: number, adet: number, n: number): number[] {
  const r = prngOlustur(tohum, "serilestir-noktalar");
  const s = new Set<number>();
  while (s.size < n) s.add(1 + aralik(r, adet - 1));
  return [...s].sort((a, b) => a - b);
}

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

describe("kill -9 benzetimi: anlik goruntu + gunluk kalani = kesintisiz kosu", () => {
  for (const [ad, yukle, gun, cokme] of [
    ["sentetik-50", varsayilanVeriyiYukle, 4, 3],
    ["gercek harita", gercekVeriyiYukle, 3, 2],
  ] as const) {
    it(`${ad}, ${gun} gun, ${cokme} cokme noktasi, 12 saatte bir anlik goruntu`, () => {
      const sure = gun * GUN;
      const adimlar = kayit(yukle, 11, gun);
      const kural = kuralSurumuHesapla(yukle());
      const cokmeler = noktalar(11, adimlar.length, cokme);

      // "Sunucu": canlı sim; kalıcı depo = başarılı komut günlüğü (sim.gunluk) + periyodik anlık görüntüler.
      const canli = Simulasyon.olustur(yukle(), 11);
      let goruntu = { metin: anlikGoruntuOlustur(canli, kural), gunlukUzunlugu: 0 };
      let sonrakiGoruntu = 12 * SAAT;
      const kurtarilanlar: Simulasyon[] = [];
      for (let i = 0; i < adimlar.length; i++) {
        const k = (adimlar[i] as Adim).k;
        if (k.t >= sonrakiGoruntu) {
          canli.calistirKadar(sonrakiGoruntu);
          goruntu = { metin: anlikGoruntuOlustur(canli, kural), gunlukUzunlugu: canli.gunluk.length };
          sonrakiGoruntu += 12 * SAAT;
        }
        canli.uygula(k);
        for (const s of kurtarilanlar) s.uygula(k);
        if (cokmeler.includes(i)) {
          // kill -9: bellekteki durum kaybolur. Son görüntü + görüntüden sonra kaydedilmiş başarılı komutlarla kurtar.
          const kalan: DamgaliKomut[] = canli.gunluk.slice(goruntu.gunlukUzunlugu);
          const s = Simulasyon.anlikGoruntudenYukle(yukle(), goruntu.metin, kalan);
          // Çökme anı: canlı dünya başarısız son komutlarla zamanı ilerletmiş olabilir; ikisi de aynı ana getirilir
          // (aynı t'de bekleyen çözüm olayları ikisinde de işlenir; canlı için zararsızdır, zaten işlenecekti).
          canli.calistirKadar(canli.dunya.zaman);
          s.calistirKadar(canli.dunya.zaman);
          expect(s.durumOzeti(), `cokme adim ${i}`).toBe(canli.durumOzeti());
          expect(s.gunluk).toEqual(kalan);
          kurtarilanlar.push(s);
        }
      }
      canli.calistirKadar(sure);
      expect(kurtarilanlar.length).toBe(cokme);
      for (const s of kurtarilanlar) {
        s.calistirKadar(sure);
        expect(s.durumOzeti()).toBe(canli.durumOzeti());
      }
      // Görüntünün kendisi de geçerli ve kural sürümüyle eşleşiyor
      const g = anlikGoruntuCoz(goruntu.metin, kural);
      expect(g.kuralSurumu).toBe(kural);
    }, 180_000);
  }
});

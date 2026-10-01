/**
 * `serilestir-kurtarma-*.test.ts` dosyalarının ortak hazırlığı (eski `serilestir-kurtarma.test.ts` bölündü; paralel koşsunlar diye).
 * Test içeriği, adları ve beklenen değerler bölmeden ÖNCEKİYLE birebir aynıdır; yalnız yer değişti.
 */
import type { VeriPaketi } from "@bolge/veri";
import { expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { aralik, prngOlustur } from "../src/prng";
import { anlikGoruntuCoz, anlikGoruntuOlustur, kuralSurumuHesapla } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { DamgaliKomut } from "../src/tipler";
import type { Adim } from "./serilestir-yardimci";
import { senaryoKos } from "./serilestir-yardimci";

/** Senaryonun komut akışı (başarılı + başarısız) bir kez kaydedilir; sonra botsuz, aynen yeniden uygulanır. */
export function kayit(veri: () => VeriPaketi, tohum: number, gun: number): Adim[] {
  return senaryoKos({ veri: veri(), tohum, sureMs: gun * GUN, bulanikAdet: 6 }).adimlar;
}

/** n farklı adım indeksi (artan), [1, adet) aralığında. */
export function noktalar(tohum: number, adet: number, n: number): number[] {
  const r = prngOlustur(tohum, "serilestir-noktalar");
  const s = new Set<number>();
  while (s.size < n) s.add(1 + aralik(r, adet - 1));
  return [...s].sort((a, b) => a - b);
}

/** "kill -9 benzetimi" betimlemesi (describe) içinde, tek harita için tek test kaydeder. */
export function killDokuzTesti(ad: string, yukle: () => VeriPaketi, gun: number, cokme: number): void {
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

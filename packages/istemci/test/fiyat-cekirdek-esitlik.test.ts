/**
 * Arsa fiyatı: istemci kopyası (`harita/fiyat.ts`) ↔ çekirdek (`parselFiyati`, `hucreFiyatiMili`, `parselToplamFiyatiMili`) EŞİTLİĞİ (G7-4, şartname §9.4).
 * Çekirdek istemci paketine girmez; fiyat formülü bilinçli kopyadır, bu test onu çekirdeğe bağlar. Aynı girdi tablosu iki tarafta BİREBİR sonuç vermeli:
 * her hücre tam liraya YUKARI yuvarlanır (1 000 mili), çok hücreli toplam = Σ hücre, ayrılmış (taban) hücre, tam lira gösterimi (`hucreFiyati`).
 * Çekirdek kaynağı değişirse bu test kırılır; kopya elle güncellenmeden geçmez.
 */
import { describe, expect, it } from "vitest";
import { hucreFiyatiMili as cekirdekHucre, parselFiyati as cekirdekParsel, parselToplamFiyatiMili as cekirdekToplam } from "@bolge/cekirdek";
import type { ArsaSinifi, DerlenmisIcerik } from "@bolge/cekirdek";
import paramHam from "../../veri/icerik/parametreler.json";
import { hucreFiyati, hucreFiyatiMili, parselFiyatiMili, parselToplamFiyatiMili, TABAN_FIYAT } from "../src/harita/fiyat";

const PPM = 1_000_000;
const mulk = (paramHam as unknown as { mulk: { hucreFiyati: Record<ArsaSinifi, number>; satisPayiCarpaniPpm: number } }).mulk;
/** Çekirdek `hucreFiyatiMili` yalnız `ic.mulk.p` fiyat parametrelerini okur. */
const kcIc = { mulk: { p: { hucreFiyati: mulk.hucreFiyati, satisPayiCarpaniPpm: mulk.satisPayiCarpaniPpm } } } as unknown as DerlenmisIcerik;
const SINIFLAR: ArsaSinifi[] = ["kirsal", "kasaba", "sehir"];
/** Girdi tablosu: uygun hücre sayıları (1 000'in katı olmayan sonuç üretenler dahil: 81, 83, 97, 1 000; tam kat verenler: 100, 1 000) ve satılmış sayıları. */
const UYGUN = [1, 7, 81, 83, 90, 97, 100, 997, 1000, 5555];
const SATILMIS = [0, 1, 2, 3, 10, 24, 25, 50];

describe("istemci kopyası = çekirdek (aynı tablo, birebir)", () => {
  it("sabitler: istemci TABAN_FIYAT x 1 000 = çekirdek hucreFiyati; çarpan 2 000 000", () => {
    for (const s of SINIFLAR) expect(TABAN_FIYAT[s] * 1000, s).toBe(mulk.hucreFiyati[s]);
    expect(mulk.satisPayiCarpaniPpm).toBe(2_000_000);
  });

  it("parselFiyatiMili = çekirdek parselFiyati: sınıf x uygun x satılmış x adet (1..6); her hücre 1 000'in katı", () => {
    let kontrol = 0;
    let katDegil = 0;
    for (const sinif of SINIFLAR) {
      for (const uygun of UYGUN) {
        for (const satilmis of SATILMIS) {
          if (satilmis > uygun) continue;
          for (let adet = 1; adet <= 6; adet++) {
            const c = cekirdekParsel(mulk.hucreFiyati[sinif], mulk.satisPayiCarpaniPpm, satilmis, uygun, adet);
            expect(parselFiyatiMili(sinif, satilmis, uygun, adet), `${sinif} uygun=${uygun} satilmis=${satilmis} adet=${adet}`).toBe(c);
            expect(c % 1000).toBe(0);
            kontrol++;
            // yuvarlamasız (floor) sürüm 1 000'in katı değilse tablo YUKARI yuvarlamayı gerçekten sınıyor
            let ham = 0;
            for (let k = 0; k < adet; k++) ham += Math.floor((mulk.hucreFiyati[sinif] * (PPM + Math.floor((mulk.satisPayiCarpaniPpm * (satilmis + k)) / uygun))) / PPM);
            if (ham % 1000 !== 0) katDegil++;
          }
        }
      }
    }
    expect(kontrol).toBeGreaterThan(500);
    expect(katDegil, "tablo ceil davranışını gerçekten sınıyor (floor sürümü çoğu satırda 1 000'in katı değil)").toBeGreaterThan(100);
  });

  it("hucreFiyatiMili ve parselToplamFiyatiMili: normal, ayrılmış (taban) ve karma; çekirdekle birebir", () => {
    for (const sinif of SINIFLAR) {
      for (const uygun of [81, 90, 1000]) {
        for (const [satilmis, ayrilmisSatilmis] of [[0, undefined], [10, undefined], [10, 4], [30, 30]] as const) {
          const d = { uygun, satilmis, ...(ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis } : {}) };
          const cd = { uygunHucre: uygun, satilmisHucre: satilmis, ...(ayrilmisSatilmis !== undefined ? { ayrilmisSatilmis } : {}) };
          for (let k = 0; k < 5; k++) {
            expect(hucreFiyatiMili(sinif, d, k, false)).toBe(cekirdekHucre(kcIc, cd, sinif, k, false));
            expect(hucreFiyatiMili(sinif, d, k, true)).toBe(cekirdekHucre(kcIc, cd, sinif, k, true));
          }
          for (const [n, a] of [[3, 0], [0, 2], [4, 3], [6, 6]] as const) expect(parselToplamFiyatiMili(sinif, d, n, a)).toBe(cekirdekToplam(kcIc, cd, sinif, n, a));
        }
      }
    }
  });

  it("hucreFiyati (tam ₺) = çekirdek tek hücre / 1 000: Math.round farkı kalktı; ₺ gösterimi tamsayı", () => {
    for (const sinif of SINIFLAR) {
      for (const uygun of UYGUN) {
        for (const satilmis of SATILMIS) {
          if (satilmis > uygun) continue;
          const mili = cekirdekHucre(kcIc, { uygunHucre: uygun, satilmisHucre: satilmis }, sinif, 0, false);
          expect(hucreFiyati(sinif, satilmis, uygun)).toBe(mili / 1000);
          expect(Number.isInteger(hucreFiyati(sinif, satilmis, uygun))).toBe(true);
        }
      }
    }
  });

  it("ceil sınır satırları (elle): 1 024 691 -> 1 025 000 (kırsal, 1/81); tam kat (1 000 000, 0 satılmış) değişmez; ayrılmış taban 2 500 000", () => {
    expect(parselFiyatiMili("kirsal", 1, 81, 1)).toBe(1_025_000);
    expect(cekirdekParsel(1_000_000, 2_000_000, 1, 81, 1)).toBe(1_025_000);
    expect(parselFiyatiMili("kirsal", 0, 81, 1)).toBe(1_000_000);
    expect(hucreFiyatiMili("kasaba", { uygun: 81, satilmis: 3 }, 0, true)).toBe(2_500_000);
    expect(hucreFiyati("kirsal", 1, 81)).toBe(1025);
  });
});

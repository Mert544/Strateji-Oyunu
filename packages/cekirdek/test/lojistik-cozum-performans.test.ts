/**
 * Lojistik çözüm performansı: sentetik-50 haritasında 4 oyuncu.
 * Süre sınırları yumuşaktır (makineye bağlı); gerçek süre konsola yazılır.
 */
import { describe, expect, it } from "vitest";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { lojistikCoz } from "../src/lojistik/cozum";
import { anlikHazine, anlikMiktar } from "../src/stok";
import { GUN } from "../src/tipler";

function dortOyunculuDunya(): Simulasyon {
  const veri = varsayilanVeriyiYukle();
  const s = Simulasyon.olustur(veri, 7);
  for (const devlet of ["askan", "belora", "carvan", "dorsa"]) {
    const r = s.uygula({
      t: 0,
      oyuncu: "sistem",
      komut: { tur: "oyuncu_katil", oyuncu: devlet, bolgeler: veri.harita.bolgeler.filter((b) => b.devlet === devlet).map((b) => b.id) },
    });
    expect(r).toEqual({ tamam: true });
  }
  return s;
}

describe("lojistik cozum performansi (sentetik-50, 4 oyuncu)", () => {
  it("tek cozum < 5 ms (ortalama, isinmadan sonra)", () => {
    const s = dortOyunculuDunya();
    s.calistirKadar(2 * GUN);
    const N = 200;
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) lojistikCoz(s.dunya, s.baglam);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
    console.log(`tek cozum ortalama (MCF onbellegi sicak): ${ms.toFixed(3)} ms`);
    expect(ms).toBeLessThan(5);
  });

  it("30 gunluk kosu: yumusak sure siniri, stok negatif degil, fiyatlar aralikta", () => {
    const s = dortOyunculuDunya();
    const t0 = process.hrtime.bigint();
    for (let g = 1; g <= 30; g++) {
      s.calistirKadar(g * GUN);
      if (g % 5 === 0) {
        for (const b of s.dunya.bolgeler) {
          for (const st of b.stoklar) expect(anlikMiktar(st, s.dunya.zaman)).toBeGreaterThanOrEqual(0);
        }
      }
    }
    const sn = Number(process.hrtime.bigint() - t0) / 1e9;
    const cozum = s.dunya.lojistik.cozumSayisi;
    console.log(`30 gun: ${sn.toFixed(2)} sn, cozum sayisi ${cozum}, cozum basina ${((sn * 1000) / cozum).toFixed(2)} ms, kuyruk ${s.dunya.kuyruk.length}`);
    expect(sn).toBeLessThan(10);
    expect((sn * 1000) / cozum).toBeLessThan(5);
    s.dunya.pazar.fiyat.forEach((f, m) => {
      const taban = s.ic.mallar[m]!.tabanFiyat;
      expect(f).toBeGreaterThanOrEqual(Math.floor(taban / 4));
      expect(f).toBeLessThanOrEqual(Math.floor((taban * 7) / 4));
    });
    // Pasif oyuncular (ticaret emri yok) para lavabolarını (tesis işletme gideri) vergiyle karşılayamayabilir:
    // hazine 0'a inebilir ama asla negatif olmaz.
    for (const o of s.dunya.oyuncular) expect(anlikHazine(s.dunya, o.id)).toBeGreaterThanOrEqual(0);
  });
});

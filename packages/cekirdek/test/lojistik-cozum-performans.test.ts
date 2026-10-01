/**
 * Lojistik çözüm performansı: sentetik-50 haritasında 4 oyuncu.
 * Süre sınırları yumuşaktır (makineye bağlı); gerçek süre konsola yazılır.
 *
 * SÜRE ÖLÇÜSÜ: DUVAR SAATİ DEĞİL, çağıran iş parçacığının CPU süresi (`process.threadCpuUsage`; yoksa `process.cpuUsage`: vitest her test dosyasını ayrı
 * süreçte (forks) koşturduğundan eşdeğer). Gerekçe: ağaçta başka ajanların/testlerin aynı anda koşturduğu yük altında (yük ortalaması 4 çekirdekte 18)
 * duvar saati 2-3 kat şişer ve sınır yanlış kırılır (P2 öncesi 48ea528 de aynı yük altında kırılıyordu: gerileme değil, ölçü sorunu). CPU süresi
 * çizelgeleme beklemesini saymaz. (Alternatif `os.loadavg` ile ölçeklemek yükü TAHMİN eder, test kodunu sürüme ve makineye bağlar ve gerçek
 * gerilemeyi maskeler; seçilmedi.) Doğruluk denetimleri (stok negatif değil, fiyat aralığı, hazine ≥ 0, çözüm sayısı) aynen kalır; test atlanmaz.
 */
import { describe, expect, it } from "vitest";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { lojistikCoz } from "../src/lojistik/cozum";
import { anlikHazine, anlikMiktar } from "../src/stok";
import { GUN } from "../src/tipler";

/** Çağıran iş parçacığının şimdiye dek harcadığı CPU süresi (ms: kullanıcı + sistem). */
function cpuMs(): number {
  const u = typeof process.threadCpuUsage === "function" ? process.threadCpuUsage() : process.cpuUsage();
  return (u.user + u.system) / 1000;
}

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
    const t0 = cpuMs();
    const d0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) lojistikCoz(s.dunya, s.baglam);
    const ms = (cpuMs() - t0) / N;
    const duvarMs = Number(process.hrtime.bigint() - d0) / 1e6 / N;
    console.log(`tek cozum ortalama (MCF onbellegi sicak): CPU ${ms.toFixed(3)} ms (duvar ${duvarMs.toFixed(3)} ms)`);
    expect(ms).toBeLessThan(5);
  });

  it("30 gunluk kosu: yumusak sure siniri, stok negatif degil, fiyatlar aralikta", () => {
    const s = dortOyunculuDunya();
    const t0 = cpuMs();
    const d0 = process.hrtime.bigint();
    for (let g = 1; g <= 30; g++) {
      s.calistirKadar(g * GUN);
      if (g % 5 === 0) {
        for (const b of s.dunya.bolgeler) {
          for (const st of b.stoklar) expect(anlikMiktar(st, s.dunya.zaman)).toBeGreaterThanOrEqual(0);
        }
      }
    }
    const sn = (cpuMs() - t0) / 1000;
    const duvarSn = Number(process.hrtime.bigint() - d0) / 1e9;
    const cozum = s.dunya.lojistik.cozumSayisi;
    console.log(`30 gun: CPU ${sn.toFixed(2)} sn (duvar ${duvarSn.toFixed(2)} sn), cozum sayisi ${cozum}, cozum basina ${((sn * 1000) / cozum).toFixed(2)} ms CPU, kuyruk ${s.dunya.kuyruk.length}`);
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

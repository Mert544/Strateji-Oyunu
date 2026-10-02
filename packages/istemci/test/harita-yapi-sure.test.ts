/**
 * Yapı süresi gösterimi (T-4): erken oyun çarpanı TEK kaynaktan (protokol formülü), çekirdeğin `sureCarpaniPpm`'i ile her zamanda eşit; kart "şimdi kursan" süresini yazar
 * ("Süre 4 sa" yanılgısı: kart normal süreyi, harita etiketi 24 dk yazıyordu).
 */
import { SAAT, sureCarpaniPpm } from "@bolge/cekirdek";
import type { Baglam, Dunya } from "@bolge/cekirdek";
import { describe, expect, it } from "vitest";
import { mulkMetni } from "../src/harita/mulk-metin";
import { sureCarpani, yapiSureHtml, yapiSuresi } from "../src/harita/yapi-sure";

const PPM = 1_000_000;
/** Çekirdek parametresi (veri/parametreler.json erkenOyun): %10, 24 sa sabit, 168. saate kadar doğrusal. */
const E = { baslangicCarpaniPpm: 100_000, sabitSaat: 24, bitisSaat: 168 };
const KATILMA = 5 * SAAT;
const FORMUL: [number, number, number, number] = [KATILMA, E.baslangicCarpaniPpm, E.sabitSaat * SAAT, E.bitisSaat * SAAT];

function cekirdek(t: number): number {
  const d = { zaman: t, oyuncular: [{ id: "esra", katilmaZamani: KATILMA }] } as unknown as Dunya;
  const ctx = { ic: { param: { erkenOyun: E } } } as unknown as Baglam;
  return sureCarpaniPpm(d, ctx, "esra");
}

describe("sureCarpani: protokol formülü = çekirdek eğrisi", () => {
  it("katılımdan 0, 24 sa (sabit), 24 sa'ten sonra, 96, 168 sa ve sonrası: çekirdekle birebir", () => {
    for (const saat of [0, 1, 12, 24, 24.5, 48, 96, 150, 167, 168, 200, 1000]) {
      const t = KATILMA + saat * SAAT;
      expect(sureCarpani(FORMUL, t) * PPM, `${saat} sa`).toBeCloseTo(cekirdek(t), 6);
    }
  });

  it("24 sa öncesi %10, arası doğrusal (96. saatte 0,55), 168. saatten sonra 1", () => {
    expect(sureCarpani(FORMUL, KATILMA)).toBeCloseTo(0.1, 9);
    expect(sureCarpani(FORMUL, KATILMA + 24 * SAAT)).toBeCloseTo(0.1, 9);
    expect(sureCarpani(FORMUL, KATILMA + 96 * SAAT)).toBeCloseTo(0.55, 6);
    expect(sureCarpani(FORMUL, KATILMA + 168 * SAAT)).toBe(1);
    expect(sureCarpani(FORMUL, KATILMA + 400 * SAAT)).toBe(1);
  });

  it("katılımdan önceki zaman (saat kayması) ve formül yok: güvenli", () => {
    expect(sureCarpani(FORMUL, 0)).toBeCloseTo(0.1, 9);
    expect(sureCarpani(undefined, 123456)).toBe(1);
  });
});

describe("yapiSuresi: şimdi kurulursa süre", () => {
  it("4 sa yapı: ilk 24 saatte 24 dk, 96. saatte ≈ 2,2 sa, 168. saatten sonra 4 sa (hız yok)", () => {
    const s0 = yapiSuresi(4, sureCarpani(FORMUL, KATILMA + 2 * SAAT));
    expect(s0.simdi).toBeCloseTo(0.4, 9);
    expect(s0.hizli).toBe(true);
    const s96 = yapiSuresi(4, sureCarpani(FORMUL, KATILMA + 96 * SAAT));
    expect(s96.simdi).toBeCloseTo(2.2, 6);
    expect(s96.hizli).toBe(true);
    const s168 = yapiSuresi(4, sureCarpani(FORMUL, KATILMA + 170 * SAAT));
    expect(s168).toEqual({ normal: 4, simdi: 4, hizli: false });
  });

  it("gerçek süre en az 1 dakika; normal süre 1 dakikadan kısaysa normal süre (çekirdek carpliSure)", () => {
    expect(yapiSuresi(0.05, 0.1).simdi).toBeCloseTo(1 / 60, 9); // 3 dk × 0,1 = 18 sn → 1 dk
    expect(yapiSuresi(1 / 120, 0.1).simdi).toBeCloseTo(1 / 120, 9); // 30 sn: bundan kısaltılmaz
  });

  it("çarpan 1 ya da verilmedi: hız yok", () => {
    expect(yapiSuresi(2).hizli).toBe(false);
    expect(yapiSuresi(2, 1).hizli).toBe(false);
  });
});

describe("yapiSureHtml: kart metni", () => {
  it("hız varken 'yeni oyuncu hızı; normalde' (ilk gün sabiti yok)", () => {
    const m = yapiSureHtml(yapiSuresi(4, 0.1));
    expect(m).toBe("24 dk (yeni oyuncu hızı; normalde 4 sa)");
    expect(m).not.toMatch(/ilk gün/);
  });

  it("hız yokken yalnız süre (parantez yok)", () => {
    expect(yapiSureHtml(yapiSuresi(4, 1))).toBe("4 sa");
    expect(yapiSureHtml(yapiSuresi(4))).not.toContain("(");
  });

  it("sözlük anahtarı yer tutucuları", () => {
    expect(mulkMetni("yapi.satir_sure_hizli", { sure: "24 dk", normal: "4 sa" })).toBe("24 dk (yeni oyuncu hızı; normalde 4 sa)");
  });
});

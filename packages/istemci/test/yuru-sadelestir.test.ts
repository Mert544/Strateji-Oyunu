import { describe, expect, it } from "vitest";
import { sadelestir } from "../scripts/yuru-sadelestir";

/** n×n karelik düz ızgara (x, z; y = 0): 2·n² üçgen. */
function izgara(n: number): { konum: number[]; indeks: number[] } {
  const konum: number[] = [];
  const indeks: number[] = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) konum.push(i, 0, j);
  const v = (i: number, j: number): number => j * (n + 1) + i;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      indeks.push(v(i, j), v(i, j + 1), v(i + 1, j));
      indeks.push(v(i + 1, j), v(i, j + 1), v(i + 1, j + 1));
    }
  return { konum, indeks };
}

describe("yürüyüş: ağ sadeleştirme (dörtlü hata)", () => {
  it("düz ızgara hata vermeden hedefe iner; sınır köşeleri ve yüz yönü korunur", () => {
    const { konum, indeks } = izgara(12); // 288 üçgen
    const r = sadelestir(konum, indeks, { hedef: 40 });
    expect(r.indeks.length / 3).toBeLessThanOrEqual(60);
    expect(r.indeks.length / 3).toBeLessThan(288);
    expect(r.sonHata).toBeLessThan(1e-9); // düz yüzeyde kayıp yok
    // Dış sınır köşeleri (kare çevresi) silinmez
    const kalan = new Set(r.indeks);
    for (const [x, z] of [[0, 0], [12, 0], [0, 12], [12, 12]] as const) expect(kalan.has(z * 13 + x)).toBe(true);
    // Hepsi yukarı bakar (başta (a, b, c) için ters sarım üretmişiz; yön tutarlı kalmalı)
    let isaret = 0;
    for (let f = 0; f < r.indeks.length; f += 3) {
      const [a, b, c] = [r.indeks[f]!, r.indeks[f + 1]!, r.indeks[f + 2]!];
      const ux = konum[b * 3]! - konum[a * 3]!;
      const uz = konum[b * 3 + 2]! - konum[a * 3 + 2]!;
      const vx = konum[c * 3]! - konum[a * 3]!;
      const vz = konum[c * 3 + 2]! - konum[a * 3 + 2]!;
      const y = uz * vx - ux * vz;
      expect(Math.abs(y)).toBeGreaterThan(1e-9);
      isaret += Math.sign(y);
    }
    expect(Math.abs(isaret)).toBe(r.indeks.length / 3);
  });

  it("kıvrımlı yüzeyde çökertme düz bölgeden başlar (hata düşük kalır) ve ek maliyet gözetilir", () => {
    // Orta şerit yükseltilmiş: kıvrım çizgisindeki köşeler en son çökertilmeli
    const n = 10;
    const { konum, indeks } = izgara(n);
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) if (i === 5) konum[(j * (n + 1) + i) * 3 + 1] = 3;
    const r = sadelestir(konum, indeks, { hedef: 60 });
    const kalan = new Set(r.indeks);
    // Kıvrım çizgisi (iki sınır köşesi arasındaki kenar) korunur; düz bölgeler kayıpsız çökertilir
    const tepe = [...kalan].filter((v) => konum[v * 3 + 1]! === 3).length;
    expect(tepe).toBeGreaterThanOrEqual(2);
    expect(r.sonHata).toBeLessThan(1e-6);
    // Ek maliyet verilirse sonuç yine geçerli bir ağdır
    const r2 = sadelestir(konum, indeks, { hedef: 60, ekMaliyet: (u, v) => (u + v) * 1e-6 });
    expect(r2.indeks.length % 3).toBe(0);
    expect(r2.indeks.length / 3).toBeLessThanOrEqual(100);
  });
});

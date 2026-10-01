/** BK-2: mülk işaretlerinin ekran uzayında kümelenmesi (saf; GL yok). */
import { describe, expect, it } from "vitest";
import { isaretleriKumele, KUME_ESIGI_PX } from "../src/kure/mulk-kipi";
import type { Vek3 } from "../src/kure/matematik";

/** Basit ekran modeli: x ve y doğrudan piksel (z < 0: arka yüz). */
const ekran = (p: Vek3): [number, number] | null => (p[2] < 0 ? null : [p[0], p[1]]);

describe("mülk işareti kümeleme", () => {
  it("eşikten yakın iki nokta tek işarette birleşir (sayı 2, konum birim vektör); uzak olanlar ayrı kalır", () => {
    const k = isaretleriKumele([[100, 100, 1], [110, 100, 1], [300, 300, 1]], ekran);
    expect(k.map((m) => m.sayi)).toEqual([2, 1]);
    expect(Math.hypot(...(k[0]!.p as Vek3))).toBeCloseTo(1, 6);
    expect(k[1]!.p).toEqual([300, 300, 1]);
  });
  it("eşik sınırında birleşmez; hemen altında birleşir", () => {
    expect(isaretleriKumele([[0, 0, 1], [KUME_ESIGI_PX, 0, 1]], ekran)).toHaveLength(2);
    expect(isaretleriKumele([[0, 0, 1], [KUME_ESIGI_PX - 0.5, 0, 1]], ekran)).toHaveLength(1);
  });
  it("yakınlaşınca (noktalar ekranda açılınca) küme çözülür", () => {
    const n: Vek3[] = [[0, 0, 1], [10, 0, 1], [20, 0, 1]];
    expect(isaretleriKumele(n, ekran).map((m) => m.sayi)).toEqual([2, 1]);
    expect(isaretleriKumele(n, (p) => [p[0] * 4, p[1]]).map((m) => m.sayi)).toEqual([1, 1, 1]);
  });
  it("kürenin arka yüzündeki noktalar kümelenmez ve kaybolmaz; sonuç deterministik", () => {
    const n: Vek3[] = [[0, 0, -1], [1, 0, -1], [5, 5, 1]];
    const k = isaretleriKumele(n, ekran);
    expect(k.map((m) => m.sayi)).toEqual([1, 1, 1]);
    expect(isaretleriKumele(n, ekran)).toEqual(k);
    expect(isaretleriKumele([], ekran)).toEqual([]);
  });
});

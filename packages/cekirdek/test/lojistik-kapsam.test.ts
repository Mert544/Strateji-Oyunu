import { describe, expect, it } from "vitest";
import { aciklikNedeni, cokKaynakliDijkstra, karsilanmaPpm, type AciklikGirdisi } from "../src/lojistik/kapsam";
import type { GrafKenari } from "../src/lojistik/graf";

function prng(tohum: number): () => number {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const aralik = (r: () => number, alt: number, ust: number): number => alt + Math.floor(r() * (ust - alt + 1));

/** Floyd-Warshall: tüm çiftler en kısa mesafe (yönsüz), ulaşılamaz = Infinity. */
function floydWarshall(n: number, kenarlar: GrafKenari[], uygun: (i: number) => boolean): number[][] {
  const d: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  kenarlar.forEach((k, i) => {
    if (!uygun(i) || k.u === k.v) return;
    d[k.u]![k.v] = Math.min(d[k.u]![k.v]!, k.maliyet);
    d[k.v]![k.u] = Math.min(d[k.v]![k.u]!, k.maliyet);
  });
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) if (d[i]![k]! + d[k]![j]! < d[i]![j]!) d[i]![j] = d[i]![k]! + d[k]![j]!;
  return d;
}

describe("cokKaynakliDijkstra", () => {
  it("el ile: iki kaynaklı zincir", () => {
    // 0 -(4)- 1 -(3)- 2 -(5)- 3 ; kaynaklar 0 ve 3
    const k: GrafKenari[] = [
      { u: 0, v: 1, kapasite: 1, maliyet: 4 },
      { u: 1, v: 2, kapasite: 1, maliyet: 3 },
      { u: 2, v: 3, kapasite: 1, maliyet: 5 },
    ];
    const s = cokKaynakliDijkstra(4, k, [0, 3]);
    expect(s.mesafe).toEqual([0, 4, 5, 0]);
    expect(s.onceki).toEqual([-1, 0, 2, -1]);
  });

  it("ulaşılamaz düğüm -1; kaynaksız çağrı hep -1", () => {
    const k: GrafKenari[] = [{ u: 0, v: 1, kapasite: 1, maliyet: 2 }];
    expect(cokKaynakliDijkstra(3, k, [0]).mesafe).toEqual([0, 2, -1]);
    expect(cokKaynakliDijkstra(3, k, []).mesafe).toEqual([-1, -1, -1]);
    expect(cokKaynakliDijkstra(3, k, [0]).onceki).toEqual([-1, 0, -1]);
  });

  it("kapasiteliMi süzgeci dolu kenarları atlar", () => {
    const k: GrafKenari[] = [
      { u: 0, v: 1, kapasite: 1, maliyet: 1 },
      { u: 1, v: 2, kapasite: 1, maliyet: 1 },
      { u: 0, v: 2, kapasite: 1, maliyet: 10 },
    ];
    expect(cokKaynakliDijkstra(3, k, [0]).mesafe).toEqual([0, 1, 2]);
    const s = cokKaynakliDijkstra(3, k, [0], { kapasiteliMi: (i) => i !== 1 });
    expect(s.mesafe).toEqual([0, 1, 10]);
    expect(s.onceki).toEqual([-1, 0, 2]);
  });

  it("eşit mesafede düşük kenar indeksi (ilk bulunan) kalır", () => {
    const k: GrafKenari[] = [
      { u: 0, v: 1, kapasite: 1, maliyet: 5 },
      { u: 0, v: 1, kapasite: 1, maliyet: 5 },
    ];
    expect(cokKaynakliDijkstra(2, k, [0]).onceki).toEqual([-1, 0]);
  });

  it("300 rastgele graf: Floyd-Warshall ile aynı (kapasite süzgeçli ve süzgeçsiz), onceki tutarlı, deterministik", () => {
    const r = prng(555);
    for (let t = 0; t < 300; t++) {
      const n = aralik(r, 1, 12);
      const m = aralik(r, 0, 25);
      const kenarlar: GrafKenari[] = [];
      for (let i = 0; i < m; i++) {
        kenarlar.push({ u: aralik(r, 0, n - 1), v: aralik(r, 0, n - 1), kapasite: aralik(r, 0, 3), maliyet: aralik(r, 1, 20) });
      }
      const ks: number[] = [];
      const ksSayi = aralik(r, 0, 3);
      for (let i = 0; i < ksSayi; i++) ks.push(aralik(r, 0, n - 1));
      for (const sure of [false, true]) {
        const uygun = (i: number): boolean => (sure ? kenarlar[i]!.kapasite > 0 : true);
        const sonuc = cokKaynakliDijkstra(n, kenarlar, ks, sure ? { kapasiteliMi: uygun } : undefined);
        const fw = floydWarshall(n, kenarlar, uygun);
        for (let v = 0; v < n; v++) {
          let en = Infinity;
          for (const s of ks) en = Math.min(en, fw[s]![v]!);
          expect(sonuc.mesafe[v]).toBe(en === Infinity ? -1 : en);
          const e = sonuc.onceki[v]!;
          if (sonuc.mesafe[v]! > 0) {
            // Gelinen kenar uygun, uçlarından biri v ve öbür uçtaki mesafe + maliyet = mesafe
            expect(e).toBeGreaterThanOrEqual(0);
            expect(uygun(e)).toBe(true);
            const k = kenarlar[e]!;
            const oncekiDugum = k.u === v ? k.v : k.v === v ? k.u : -1;
            expect(oncekiDugum).toBeGreaterThanOrEqual(0);
            expect(sonuc.mesafe[oncekiDugum]! + k.maliyet).toBe(sonuc.mesafe[v]);
          } else {
            expect(e).toBe(-1);
          }
        }
        expect(cokKaynakliDijkstra(n, kenarlar, ks, sure ? { kapasiteliMi: uygun } : undefined)).toEqual(sonuc);
      }
    }
  });
});

describe("karsilanmaPpm", () => {
  it("sınır değerleri ve aşağı yuvarlama", () => {
    expect(karsilanmaPpm(0, 0)).toBe(1_000_000);
    expect(karsilanmaPpm(100, 0)).toBe(0);
    expect(karsilanmaPpm(100, 100)).toBe(1_000_000);
    expect(karsilanmaPpm(100, 150)).toBe(1_000_000);
    expect(karsilanmaPpm(3, 1)).toBe(333_333);
    expect(karsilanmaPpm(1_000_000_000_000_000, 500_000_000_000_000)).toBe(500_000);
  });
});

describe("aciklikNedeni", () => {
  const SAAT = 3_600_000;
  const temel: AciklikGirdisi = {
    talep: 1000,
    karsilanan: 0,
    arzVarMi: true,
    mesafe: 10 * SAAT,
    mesafeKapasiteliKenarlarla: -1,
    mesafeEsigiMs: 72 * SAAT,
  };
  const n = (d: Partial<AciklikGirdisi>): string => aciklikNedeni({ ...temel, ...d });

  it("karşılanma >= %99 -> yok (diğer alanlardan bağımsız)", () => {
    expect(n({ karsilanan: 990 })).toBe("yok");
    expect(n({ karsilanan: 1000, arzVarMi: false, mesafe: -1 })).toBe("yok");
    expect(n({ talep: 0 })).toBe("yok");
    expect(n({ karsilanan: 989 })).not.toBe("yok");
  });
  it("hiç arz yok -> girdi_eksik (erişimden önce)", () => {
    expect(n({ arzVarMi: false })).toBe("girdi_eksik");
    expect(n({ arzVarMi: false, mesafe: -1 })).toBe("girdi_eksik");
  });
  it("ulaşılamaz -> erisim_yok", () => {
    expect(n({ mesafe: -1 })).toBe("erisim_yok");
  });
  it("mesafe > eşik -> mesafe; eşikte tam eşitlik kapasiteye düşer", () => {
    expect(n({ mesafe: 72 * SAAT + 1 })).toBe("mesafe");
    expect(n({ mesafe: 72 * SAAT })).toBe("kapasite");
  });
  it("aksi halde -> kapasite", () => {
    expect(n({ karsilanan: 500 })).toBe("kapasite");
    expect(n({ mesafeKapasiteliKenarlarla: 20 * SAAT })).toBe("kapasite");
  });
});

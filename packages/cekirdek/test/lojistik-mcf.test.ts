import { describe, expect, it } from "vitest";
import { kalanKapasite, minMaliyetAkis, type DugumMiktar, type McfSonucu } from "../src/lojistik/mcf";
import type { GrafKenari } from "../src/lojistik/graf";

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** Tohumlu PRNG (mulberry32); yalnızca testte. */
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

function aralik(r: () => number, alt: number, ust: number): number {
  return alt + Math.floor(r() * (ust - alt + 1));
}

function kenar(u: number, v: number, kapasite: number, maliyet: number): GrafKenari {
  return { u, v, kapasite, maliyet };
}

/** Edmonds-Karp: yönsüz kenarlar iki yönlü yay (her biri kapasite c); S->kaynak, hedef->T. */
function maksAkisEK(n: number, kenarlar: GrafKenari[], kaynaklar: DugumMiktar[], hedefler: DugumMiktar[]): number {
  const S = n;
  const T = n + 1;
  const N = n + 2;
  const cap: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  for (const k of kenarlar) {
    if (k.u === k.v) continue;
    cap[k.u]![k.v]! += k.kapasite;
    cap[k.v]![k.u]! += k.kapasite;
  }
  for (const s of kaynaklar) if (s.miktar > 0) cap[S]![s.dugum]! += s.miktar;
  for (const h of hedefler) if (h.miktar > 0) cap[h.dugum]![T]! += h.miktar;
  let akis = 0;
  for (;;) {
    const onceki = new Array<number>(N).fill(-1);
    onceki[S] = S;
    const kuyruk = [S];
    for (let q = 0; q < kuyruk.length && onceki[T] === -1; q++) {
      const x = kuyruk[q]!;
      for (let y = 0; y < N; y++) {
        if (onceki[y] === -1 && cap[x]![y]! > 0) {
          onceki[y] = x;
          kuyruk.push(y);
        }
      }
    }
    if (onceki[T] === -1) return akis;
    let dar = Infinity;
    for (let y = T; y !== S; y = onceki[y]!) dar = Math.min(dar, cap[onceki[y]!]![y]!);
    for (let y = T; y !== S; y = onceki[y]!) {
      cap[onceki[y]!]![y]! -= dar;
      cap[y]![onceki[y]!]! += dar;
    }
    akis += dar;
  }
}

/** Artık grafta (net akış f ile) negatif maliyetli döngü var mı (Bellman-Ford). */
function negatifDonguVar(n: number, kenarlar: GrafKenari[], f: number[]): boolean {
  const yaylar: { a: number; b: number; w: number }[] = [];
  kenarlar.forEach((k, i) => {
    if (k.u === k.v) return;
    const fi = f[i]!;
    // u->v: f<0 ise iptal yayı (-w), aksi halde f<c ise +w
    if (fi < 0) yaylar.push({ a: k.u, b: k.v, w: -k.maliyet });
    else if (fi < k.kapasite) yaylar.push({ a: k.u, b: k.v, w: k.maliyet });
    if (fi > 0) yaylar.push({ a: k.v, b: k.u, w: -k.maliyet });
    else if (-fi < k.kapasite) yaylar.push({ a: k.v, b: k.u, w: k.maliyet });
    // f<0 iken iptal yayına ek olarak ilerleme yayı da var (aynı yönde daha pahalı); negatif döngüye etkisi yok.
  });
  const d = new Array<number>(n).fill(0);
  for (let tur = 0; tur < n; tur++) {
    let degisti = false;
    for (const y of yaylar) {
      if (d[y.a]! + y.w < d[y.b]!) {
        d[y.b] = d[y.a]! + y.w;
        degisti = true;
      }
    }
    if (!degisti) return false;
  }
  return true;
}

function topla(girdi: DugumMiktar[], n: number): number[] {
  const t = new Array<number>(n).fill(0);
  for (const g of girdi) if (g.miktar > 0) t[g.dugum]! += g.miktar;
  return t;
}

/** Sonucun tüm içsel tutarlılık koşullarını denetler; maksAkis verilirse onunla da karşılaştırır. */
function sonucuDogrula(
  n: number,
  kenarlar: GrafKenari[],
  kaynaklar: DugumMiktar[],
  hedefler: DugumMiktar[],
  s: McfSonucu,
  maksAkis: number,
): void {
  const m = kenarlar.length;
  expect(s.kenarAkisi).toHaveLength(m);
  // Kapasite
  for (let i = 0; i < m; i++) {
    expect(Math.abs(s.kenarAkisi[i]!)).toBeLessThanOrEqual(kenarlar[i]!.kapasite);
    if (kenarlar[i]!.u === kenarlar[i]!.v) expect(s.kenarAkisi[i]).toBe(0);
  }
  // Toplam akış = maks akış
  expect(s.toplamAkis).toBe(maksAkis);
  // Yol toplamları
  const arz = topla(kaynaklar, n);
  const talep = topla(hedefler, n);
  const gonder = new Array<number>(n).fill(0);
  const al = new Array<number>(n).fill(0);
  let yolToplam = 0;
  let yolMaliyet = 0;
  const yolAkisi = new Array<number>(m).fill(0);
  for (const y of s.yollar) {
    expect(y.miktar).toBeGreaterThan(0);
    gonder[y.kaynak]! += y.miktar;
    al[y.hedef]! += y.miktar;
    yolToplam += y.miktar;
    // Yürüyüş geçerli mi, süre doğru mu
    let x = y.kaynak;
    let sure = 0;
    for (const e of y.kenarlar) {
      const k = kenarlar[e]!;
      expect(x === k.u || x === k.v).toBe(true);
      const ileri = x === k.u;
      yolAkisi[e]! += ileri ? y.miktar : -y.miktar;
      x = ileri ? k.v : k.u;
      sure += k.maliyet;
    }
    expect(x).toBe(y.hedef);
    expect(y.sureMs).toBe(sure);
    yolMaliyet += y.miktar * sure;
    if (y.kaynak === y.hedef) expect(y.kenarlar).toEqual([]);
  }
  expect(yolToplam).toBe(s.toplamAkis);
  for (let v = 0; v < n; v++) {
    expect(gonder[v]!).toBeLessThanOrEqual(arz[v]!);
    expect(al[v]!).toBeLessThanOrEqual(talep[v]!);
  }
  // Yol ayrıştırması kenar akışını tam yeniden üretir
  expect(yolAkisi).toEqual(s.kenarAkisi);
  // Akış korunumu: düğümde kenarlardan net çıkış = gönderilen - alınan
  const net = new Array<number>(n).fill(0);
  kenarlar.forEach((k, i) => {
    if (k.u === k.v) return;
    net[k.u]! += s.kenarAkisi[i]!;
    net[k.v]! -= s.kenarAkisi[i]!;
  });
  for (let v = 0; v < n; v++) expect(net[v]).toBe(gonder[v]! - al[v]!);
  // Maliyet
  let c = 0;
  kenarlar.forEach((k, i) => {
    if (k.u !== k.v) c += k.maliyet * Math.abs(s.kenarAkisi[i]!);
  });
  expect(s.toplamMaliyet).toBe(c);
  expect(yolMaliyet).toBe(s.toplamMaliyet);
  // Optimallik: artık grafta negatif döngü yok
  expect(negatifDonguVar(n, kenarlar, s.kenarAkisi)).toBe(false);
}

interface RastgeleGirdi {
  n: number;
  kenarlar: GrafKenari[];
  kaynaklar: DugumMiktar[];
  hedefler: DugumMiktar[];
}

function rastgeleGirdi(r: () => number, ayrikUclar: boolean): RastgeleGirdi {
  const n = ayrikUclar ? 4 : aralik(r, 2, 10);
  const m = ayrikUclar ? aralik(r, 2, 5) : aralik(r, 1, 24);
  const kenarlar: GrafKenari[] = [];
  for (let i = 0; i < m; i++) {
    const u = aralik(r, 0, n - 1);
    let v = aralik(r, 0, n - 1);
    if (ayrikUclar && u === v) v = (u + 1) % n;
    if (!ayrikUclar && r() < 0.05) v = u; // ara sıra kendi kendine döngü
    kenarlar.push(kenar(u, v, ayrikUclar ? aralik(r, 0, 3) : aralik(r, 0, 6), aralik(r, 0, 9)));
  }
  const kaynaklar: DugumMiktar[] = [];
  const hedefler: DugumMiktar[] = [];
  if (ayrikUclar) {
    // 4 düğüm: {0,1} kaynak adayı, {2,3} hedef adayı (kaynak/hedef düğümleri ayrık)
    for (const d of [0, 1]) if (r() < 0.8) kaynaklar.push({ dugum: d, miktar: aralik(r, 1, 4) });
    for (const d of [2, 3]) if (r() < 0.8) hedefler.push({ dugum: d, miktar: aralik(r, 1, 4) });
  } else {
    const ks = aralik(r, 1, 3);
    const hs = aralik(r, 1, 3);
    for (let i = 0; i < ks; i++) kaynaklar.push({ dugum: aralik(r, 0, n - 1), miktar: aralik(r, 0, 8) });
    for (let i = 0; i < hs; i++) hedefler.push({ dugum: aralik(r, 0, n - 1), miktar: aralik(r, 0, 8) });
  }
  return { n, kenarlar, kaynaklar, hedefler };
}

// ---------------------------------------------------------------------------
// El ile hesaplanmış küçük graflar
// ---------------------------------------------------------------------------

describe("minMaliyetAkis: el ile hesaplanmış örnekler", () => {
  it("paralel yollar: ucuz yol dolunca pahalı yol kullanılır", () => {
    // 0-1-3 (maliyet 10+10, kapasite 5), 0-2-3 (30+30, kapasite 5)
    const k = [kenar(0, 1, 5, 10), kenar(1, 3, 5, 10), kenar(0, 2, 5, 30), kenar(2, 3, 5, 30)];
    const s = minMaliyetAkis(4, k, [{ dugum: 0, miktar: 8 }], [{ dugum: 3, miktar: 8 }]);
    expect(s.toplamAkis).toBe(8);
    expect(s.toplamMaliyet).toBe(5 * 20 + 3 * 60);
    expect(s.kenarAkisi).toEqual([5, 5, 3, 3]);
    expect(s.yollar).toEqual([
      { kaynak: 0, hedef: 3, kenarlar: [0, 1], miktar: 5, sureMs: 20 },
      { kaynak: 0, hedef: 3, kenarlar: [2, 3], miktar: 3, sureMs: 60 },
    ]);
  });

  it("darboğaz kenar: akış en dar kenarla sınırlanır", () => {
    const k = [kenar(0, 1, 10, 1), kenar(1, 2, 3, 1)];
    const s = minMaliyetAkis(3, k, [{ dugum: 0, miktar: 10 }], [{ dugum: 2, miktar: 10 }]);
    expect(s.toplamAkis).toBe(3);
    expect(s.toplamMaliyet).toBe(6);
    expect(s.kenarAkisi).toEqual([3, 3]);
    expect(s.yollar).toEqual([{ kaynak: 0, hedef: 2, kenarlar: [0, 1], miktar: 3, sureMs: 2 }]);
  });

  it("yerel eşleşme: aynı düğümde arz ve talep önce yerelde eşleşir", () => {
    const k = [kenar(0, 1, 10, 7)];
    const s = minMaliyetAkis(
      2,
      k,
      [{ dugum: 0, miktar: 5 }],
      [{ dugum: 0, miktar: 3 }, { dugum: 1, miktar: 4 }],
    );
    expect(s.toplamAkis).toBe(5);
    expect(s.toplamMaliyet).toBe(14);
    expect(s.kenarAkisi).toEqual([2]);
    expect(s.yollar).toEqual([
      { kaynak: 0, hedef: 0, kenarlar: [], miktar: 3, sureMs: 0 },
      { kaynak: 0, hedef: 1, kenarlar: [0], miktar: 2, sureMs: 7 },
    ]);
  });

  it("yalnızca yerel eşleşme: kenar yok, maliyet 0", () => {
    const s = minMaliyetAkis(1, [], [{ dugum: 0, miktar: 9 }], [{ dugum: 0, miktar: 4 }]);
    expect(s.toplamAkis).toBe(4);
    expect(s.toplamMaliyet).toBe(0);
    expect(s.yollar).toEqual([{ kaynak: 0, hedef: 0, kenarlar: [], miktar: 4, sureMs: 0 }]);
  });

  it("arz > talep: talep kadar taşınır", () => {
    const k = [kenar(0, 1, 100, 5)];
    const s = minMaliyetAkis(2, k, [{ dugum: 0, miktar: 10 }], [{ dugum: 1, miktar: 4 }]);
    expect(s.toplamAkis).toBe(4);
    expect(s.kenarAkisi).toEqual([4]);
    expect(s.toplamMaliyet).toBe(20);
  });

  it("talep > arz: arz kadar taşınır", () => {
    const k = [kenar(0, 1, 100, 5)];
    const s = minMaliyetAkis(2, k, [{ dugum: 0, miktar: 4 }], [{ dugum: 1, miktar: 10 }]);
    expect(s.toplamAkis).toBe(4);
    expect(s.yollar).toEqual([{ kaynak: 0, hedef: 1, kenarlar: [0], miktar: 4, sureMs: 5 }]);
  });

  it("ulaşılamaz hedef: akış 0, yol yok", () => {
    const k = [kenar(0, 1, 100, 5)];
    const s = minMaliyetAkis(3, k, [{ dugum: 0, miktar: 4 }], [{ dugum: 2, miktar: 4 }]);
    expect(s).toEqual({ toplamAkis: 0, toplamMaliyet: 0, kenarAkisi: [0], yollar: [] });
  });

  it("ters yönlü kenar: u->v pozitif, v->u negatif işaretli akış", () => {
    const k = [kenar(0, 1, 10, 3)];
    const s = minMaliyetAkis(2, k, [{ dugum: 1, miktar: 4 }], [{ dugum: 0, miktar: 4 }]);
    expect(s.kenarAkisi).toEqual([-4]);
    expect(s.yollar).toEqual([{ kaynak: 1, hedef: 0, kenarlar: [0], miktar: 4, sureMs: 3 }]);
  });

  it("karşıt yönlü talepler ortak kenarda birbirini götürür (net akış 0)", () => {
    // 0-1 kenarı (kapasite 5) ortak; 0->2 ve 1->3 uçları doğrudan ucuz kenarlarla bağlı.
    const k = [kenar(0, 1, 5, 1), kenar(0, 2, 100, 1), kenar(1, 3, 100, 1), kenar(1, 2, 100, 50), kenar(0, 3, 100, 50)];
    const s = minMaliyetAkis(4, k, [{ dugum: 0, miktar: 4 }, { dugum: 1, miktar: 4 }], [{ dugum: 3, miktar: 4 }, { dugum: 2, miktar: 4 }]);
    expect(s.toplamAkis).toBe(8);
    expect(s.kenarAkisi).toEqual([0, 4, 4, 0, 0]);
    expect(s.toplamMaliyet).toBe(8);
  });

  it("aynı düğümdeki birden çok kaynak girdisi toplanır", () => {
    const k = [kenar(0, 1, 100, 2)];
    const s = minMaliyetAkis(
      2,
      k,
      [{ dugum: 0, miktar: 3 }, { dugum: 0, miktar: 4 }],
      [{ dugum: 1, miktar: 100 }],
    );
    expect(s.toplamAkis).toBe(7);
    expect(s.yollar).toEqual([{ kaynak: 0, hedef: 1, kenarlar: [0], miktar: 7, sureMs: 2 }]);
  });

  it("miktarı 0 veya negatif girdiler yok sayılır; boş girdi boş sonuç verir", () => {
    const k = [kenar(0, 1, 5, 2)];
    const s = minMaliyetAkis(2, k, [{ dugum: 0, miktar: 0 }], [{ dugum: 1, miktar: -3 }]);
    expect(s).toEqual({ toplamAkis: 0, toplamMaliyet: 0, kenarAkisi: [0], yollar: [] });
    expect(minMaliyetAkis(0, [], [], [])).toEqual({ toplamAkis: 0, toplamMaliyet: 0, kenarAkisi: [], yollar: [] });
  });

  it("kapasitesi 0 olan kenar kullanılmaz; kendi kendine döngü akış taşımaz", () => {
    const k = [kenar(0, 1, 0, 1), kenar(1, 1, 50, 1), kenar(0, 2, 5, 9), kenar(2, 1, 5, 9)];
    const s = minMaliyetAkis(3, k, [{ dugum: 0, miktar: 3 }], [{ dugum: 1, miktar: 3 }]);
    expect(s.kenarAkisi).toEqual([0, 0, 3, 3]);
    expect(s.toplamMaliyet).toBe(54);
  });

  it("geçersiz girdide RangeError fırlatır", () => {
    expect(() => minMaliyetAkis(2, [kenar(0, 5, 1, 1)], [], [])).toThrow(RangeError);
    expect(() => minMaliyetAkis(2, [kenar(0, 1, 1, -1)], [], [])).toThrow(RangeError);
    expect(() => minMaliyetAkis(2, [], [{ dugum: 9, miktar: 1 }], [])).toThrow(RangeError);
  });

  it("artık ağda iptal gerektiren durum (ardışık en kısa yol yönlendirmesi)", () => {
    // Klasik: ilk en kısa yol (0-1-2-3) sonradan kısmen geri alınmalı.
    //   0-1 (1,c1) 1-2 (1,c1) 2-3 (1,c1)  ve  0-2 (1,c2) 1-3 (1,c2)
    const k = [kenar(0, 1, 1, 1), kenar(1, 2, 1, 1), kenar(2, 3, 1, 1), kenar(0, 2, 1, 2), kenar(1, 3, 1, 2)];
    const s = minMaliyetAkis(4, k, [{ dugum: 0, miktar: 2 }], [{ dugum: 3, miktar: 2 }]);
    expect(s.toplamAkis).toBe(2);
    // İki birim: 0-1-3 (3) ve 0-2-3 (3) = 6; ilk yol 0-1-2-3 (3) + ikinci artırım iptalle aynı 6'ya varır
    expect(s.toplamMaliyet).toBe(6);
    expect(s.kenarAkisi).toEqual([1, 0, 1, 1, 1]);
  });
});

describe("kalanKapasite", () => {
  it("|f| kadar düşer, 0'ın altına inmez", () => {
    const k = [kenar(0, 1, 10, 1), kenar(1, 2, 5, 1), kenar(2, 3, 4, 1)];
    expect(kalanKapasite(k, [3, -5, 0])).toEqual([7, 0, 4]);
    expect(kalanKapasite(k, [99, 0, 0])).toEqual([0, 5, 4]);
  });
});

// ---------------------------------------------------------------------------
// Özellik testleri
// ---------------------------------------------------------------------------

describe("minMaliyetAkis: rastgele graflarda özellik testleri", () => {
  it("200 rastgele graf: kapasite, korunum, maks-akış, yol ayrıştırma, optimallik (negatif döngü yok)", () => {
    const r = prng(12345);
    for (let t = 0; t < 200; t++) {
      const g = rastgeleGirdi(r, false);
      const s = minMaliyetAkis(g.n, g.kenarlar, g.kaynaklar, g.hedefler);
      const mk = maksAkisEK(g.n, g.kenarlar, g.kaynaklar, g.hedefler);
      sonucuDogrula(g.n, g.kenarlar, g.kaynaklar, g.hedefler, s, mk);
    }
  });

  it("kaba kuvvet: 4 düğümlü graflarda tüm tamsayı akış vektörleri içinde minimum maliyet", () => {
    const r = prng(777);
    let sinanan = 0;
    for (let t = 0; t < 60; t++) {
      const g = rastgeleGirdi(r, true);
      const s = minMaliyetAkis(g.n, g.kenarlar, g.kaynaklar, g.hedefler);
      const mk = maksAkisEK(g.n, g.kenarlar, g.kaynaklar, g.hedefler);
      sonucuDogrula(g.n, g.kenarlar, g.kaynaklar, g.hedefler, s, mk);

      const arz = topla(g.kaynaklar, g.n);
      const talep = topla(g.hedefler, g.n);
      const m = g.kenarlar.length;
      const f = new Array<number>(m).fill(0);
      let enIyi = Infinity;
      const gez = (i: number): void => {
        if (i === m) {
          const net = new Array<number>(g.n).fill(0);
          g.kenarlar.forEach((k, j) => {
            net[k.u]! += f[j]!;
            net[k.v]! -= f[j]!;
          });
          let toplam = 0;
          for (let v = 0; v < g.n; v++) {
            if (arz[v]! > 0) {
              if (net[v]! < 0 || net[v]! > arz[v]!) return;
              toplam += net[v]!;
            } else if (talep[v]! > 0) {
              if (net[v]! > 0 || -net[v]! > talep[v]!) return;
            } else if (net[v] !== 0) return;
          }
          if (toplam !== mk) return;
          let c = 0;
          g.kenarlar.forEach((k, j) => (c += k.maliyet * Math.abs(f[j]!)));
          if (c < enIyi) enIyi = c;
          return;
        }
        const cap = g.kenarlar[i]!.kapasite;
        for (let x = -cap; x <= cap; x++) {
          f[i] = x;
          gez(i + 1);
        }
        f[i] = 0;
      };
      gez(0);
      expect(enIyi).not.toBe(Infinity); // en az bir geçerli akış var (mk kadar)
      expect(s.toplamMaliyet).toBe(enIyi);
      sinanan++;
    }
    expect(sinanan).toBe(60);
  });

  it("determinizm: aynı girdi iki kez aynı çıktıyı verir (derin eşitlik) ve girdi değişmez", () => {
    const r = prng(99);
    for (let t = 0; t < 50; t++) {
      const g = rastgeleGirdi(r, false);
      const kopya = JSON.stringify(g);
      const a = minMaliyetAkis(g.n, g.kenarlar, g.kaynaklar, g.hedefler);
      const b = minMaliyetAkis(g.n, g.kenarlar, g.kaynaklar, g.hedefler);
      expect(b).toEqual(a);
      expect(JSON.stringify(g)).toBe(kopya);
    }
  });

  it("kalanKapasite sonraki mal için geçerli ağ üretir (ardışık mallar kapasiteyi aşmaz)", () => {
    const r = prng(4242);
    for (let t = 0; t < 50; t++) {
      const g = rastgeleGirdi(r, false);
      const s1 = minMaliyetAkis(g.n, g.kenarlar, g.kaynaklar, g.hedefler);
      const kalan = kalanKapasite(g.kenarlar, s1.kenarAkisi);
      const k2 = g.kenarlar.map((k, i) => ({ ...k, kapasite: kalan[i]! }));
      const s2 = minMaliyetAkis(g.n, k2, g.kaynaklar, g.hedefler);
      for (let i = 0; i < g.kenarlar.length; i++) {
        expect(Math.abs(s1.kenarAkisi[i]!) + Math.abs(s2.kenarAkisi[i]!)).toBeLessThanOrEqual(g.kenarlar[i]!.kapasite);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Performans
// ---------------------------------------------------------------------------

describe("minMaliyetAkis: performans", () => {
  it("60 düğüm, 200 kenar, 20 kaynak, 20 hedef: ortalama çözüm süresi sınırın altında", () => {
    const r = prng(2024);
    const n = 60;
    const kenarlar: GrafKenari[] = [];
    // Bağlantılı omurga + rastgele ek kenarlar
    for (let v = 1; v < n; v++) kenarlar.push(kenar(aralik(r, 0, v - 1), v, aralik(r, 500, 4000), aralik(r, 1000, 3_600_000)));
    while (kenarlar.length < 200) {
      const u = aralik(r, 0, n - 1);
      const v = aralik(r, 0, n - 1);
      if (u !== v) kenarlar.push(kenar(u, v, aralik(r, 500, 4000), aralik(r, 1000, 3_600_000)));
    }
    const kaynaklar: DugumMiktar[] = [];
    const hedefler: DugumMiktar[] = [];
    for (let i = 0; i < 20; i++) kaynaklar.push({ dugum: i * 3, miktar: aralik(r, 500, 3000) });
    for (let i = 0; i < 20; i++) hedefler.push({ dugum: i * 3 + 1, miktar: aralik(r, 500, 3000) });

    const ilk = minMaliyetAkis(n, kenarlar, kaynaklar, hedefler); // ısınma + doğrulama
    sonucuDogrula(n, kenarlar, kaynaklar, hedefler, ilk, maksAkisEK(n, kenarlar, kaynaklar, hedefler));

    const TEKRAR = 100;
    const t0 = performance.now();
    for (let i = 0; i < TEKRAR; i++) minMaliyetAkis(n, kenarlar, kaynaklar, hedefler);
    const ortalamaMs = (performance.now() - t0) / TEKRAR;
    console.log(`[performans] minMaliyetAkis 60 dugum / 200 kenar / 20+20: ortalama ${ortalamaMs.toFixed(3)} ms (akis=${ilk.toplamAkis}, yol=${ilk.yollar.length})`);
    expect(ortalamaMs).toBeLessThan(50);
  });
});

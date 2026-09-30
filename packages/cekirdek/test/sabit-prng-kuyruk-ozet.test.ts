import { describe, expect, it } from "vitest";
import { carpBol, carpBolTavan, kelepce, ppmUygula, tabanBol, tamsayiKarekok } from "../src/sabit";
import { aralik, fnv1a32, prngOlustur, sonraki } from "../src/prng";
import { kuyrukBas, kuyrukCikar, kuyrukEkle } from "../src/kuyruk";
import { durumOzeti, fnv1a64, kanonikSerilestir } from "../src/ozet";
import type { Olay } from "../src/tipler";

describe("sabit", () => {
  it("carpBol pozitif ve negatif icin matematiksel floor", () => {
    expect(carpBol(7, 3, 2)).toBe(10);
    expect(carpBol(-7, 3, 2)).toBe(-11);
    expect(carpBol(7, -3, 2)).toBe(-11);
    expect(carpBol(-7, -3, 2)).toBe(10);
    expect(carpBol(-6, 1, 3)).toBe(-2);
    expect(carpBol(0, 5, 3)).toBe(0);
    expect(carpBol(1, 1, 1_000_000)).toBe(0);
    expect(carpBol(-1, 1, 1_000_000)).toBe(-1);
  });

  it("carpBol buyuk ara carpimda BigInt ile dogru", () => {
    const a = 9_007_199_254_740_000;
    expect(carpBol(a, 1_000_000, 1_000_000)).toBe(a);
    expect(carpBol(a, 3, 2)).toBe(Number((BigInt(a) * 3n) / 2n));
    expect(carpBol(-a, 3, 2)).toBe(-Number((BigInt(a) * 3n + 1n) / 2n));
    expect(carpBol(3_000_000_000_000, 4_000_000_000_000, 7_000_000_000_000)).toBe(
      Number((3_000_000_000_000n * 4_000_000_000_000n) / 7_000_000_000_000n),
    );
  });

  it("carpBol rastgele degerlerde BigInt referansiyla ayni", () => {
    const d = prngOlustur(1, "test");
    for (let i = 0; i < 2000; i++) {
      const a = (aralik(d, 2_000_000_000) - 1_000_000_000) * (aralik(d, 1000) + 1);
      const b = aralik(d, 4_000_000_000) - 2_000_000_000;
      const c = aralik(d, 3_600_000) + 1;
      const x = BigInt(a) * BigInt(b);
      let q = x / BigInt(c);
      if (x % BigInt(c) !== 0n && x < 0n) q -= 1n;
      expect(carpBol(a, b, c)).toBe(Number(q));
    }
  });

  it("carpBol bolen <= 0 icin hata", () => {
    expect(() => carpBol(1, 1, 0)).toThrow();
  });

  it("carpBolTavan ve tabanBol", () => {
    expect(carpBolTavan(7, 3, 2)).toBe(11);
    expect(carpBolTavan(-7, 3, 2)).toBe(-10);
    expect(carpBolTavan(6, 1, 3)).toBe(2);
    expect(tabanBol(-1, 3)).toBe(-1);
    expect(tabanBol(9, 3)).toBe(3);
  });

  it("tamsayiKarekok tam", () => {
    expect(tamsayiKarekok(0)).toBe(0);
    expect(tamsayiKarekok(1)).toBe(1);
    expect(tamsayiKarekok(2)).toBe(1);
    expect(tamsayiKarekok(3)).toBe(1);
    expect(tamsayiKarekok(4)).toBe(2);
    expect(tamsayiKarekok(99)).toBe(9);
    expect(tamsayiKarekok(100)).toBe(10);
    expect(tamsayiKarekok(2 ** 52)).toBe(2 ** 26);
    expect(tamsayiKarekok(Number.MAX_SAFE_INTEGER)).toBe(94906265);
    for (const r of [1, 7, 12345, 94906265, 67108864]) {
      expect(tamsayiKarekok(r * r)).toBe(r);
      expect(tamsayiKarekok(r * r - 1)).toBe(r - 1);
      expect(tamsayiKarekok(r * r + 1)).toBe(r);
    }
    expect(() => tamsayiKarekok(-1)).toThrow();
  });

  it("kelepce ve ppmUygula", () => {
    expect(kelepce(5, 0, 3)).toBe(3);
    expect(kelepce(-5, 0, 3)).toBe(0);
    expect(kelepce(2, 0, 3)).toBe(2);
    expect(ppmUygula(1_000_000, 250_000)).toBe(250_000);
    expect(ppmUygula(3, 333_333)).toBe(0);
    expect(ppmUygula(-3, 500_000)).toBe(-2);
  });
});

describe("prng", () => {
  it("ayni tohum ve akis ayni diziyi verir", () => {
    const a = prngOlustur(42, "ekonomi");
    const b = prngOlustur(42, "ekonomi");
    expect(a).toEqual(b);
    for (let i = 0; i < 100; i++) expect(sonraki(a)).toBe(sonraki(b));
  });

  it("farkli tohum veya akis farkli durum verir", () => {
    expect(prngOlustur(1, "ekonomi")).not.toEqual(prngOlustur(2, "ekonomi"));
    expect(prngOlustur(1, "ekonomi")).not.toEqual(prngOlustur(1, "pazar"));
  });

  it("ciktilar uint32 ve durum yerinde degisir", () => {
    const d = prngOlustur(7, "olay");
    const once = [...d];
    const x = sonraki(d);
    expect(Number.isInteger(x) && x >= 0 && x < 2 ** 32).toBe(true);
    expect(d).not.toEqual(once);
    for (const v of d) expect(v >>> 0).toBe(v);
  });

  it("sfc32 bilinen cikti (regresyon)", () => {
    const d: [number, number, number, number] = [1, 2, 3, 4];
    const cikti = Array.from({ length: 5 }, () => sonraki(d));
    // Referans uygulama (bryc/sfc32, tamsayi cikti) ile el ile dogrulanmis degerler
    let [a, b, c, dd] = [1, 2, 3, 4];
    const ref: number[] = [];
    for (let i = 0; i < 5; i++) {
      a |= 0; b |= 0; c |= 0; dd |= 0;
      const t = (((a + b) | 0) + dd) | 0;
      dd = (dd + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      ref.push(t >>> 0);
    }
    expect(cikti).toEqual(ref);
  });

  it("aralik [0,n) ve kabaca duzgun", () => {
    const d = prngOlustur(3, "savas");
    const sayac = new Array<number>(6).fill(0);
    for (let i = 0; i < 6000; i++) {
      const x = aralik(d, 6);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(6);
      (sayac[x] as number)++;
    }
    for (const s of sayac) {
      expect(s).toBeGreaterThan(800);
      expect(s).toBeLessThan(1200);
    }
    expect(aralik(d, 1)).toBe(0);
    expect(() => aralik(d, 0)).toThrow();
    expect(() => aralik(d, 1.5)).toThrow();
  });

  it("aralik buyuk n icin reddetme ile sapmasiz (ust yari dahil)", () => {
    const d = prngOlustur(9, "pazar");
    const n = 3_000_000_000; // 2^32'nin yarisindan buyuk: ret orani yuksek
    let ustte = 0;
    for (let i = 0; i < 2000; i++) {
      const x = aralik(d, n);
      expect(x).toBeLessThan(n);
      if (x >= n / 2) ustte++;
    }
    expect(ustte).toBeGreaterThan(850);
    expect(ustte).toBeLessThan(1150);
  });

  it("fnv1a32 bilinen degerler", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });
});

function olay(t: number, oncelik: number, sira: number): Olay {
  return { t, oncelik, sira, veri: { tur: "cozum" } };
}

describe("kuyruk", () => {
  it("(t, oncelik, sira) sirasiyla cikar", () => {
    const k: Olay[] = [];
    const girdi = [olay(5, 9, 0), olay(5, 1, 1), olay(3, 9, 2), olay(5, 1, 3), olay(1, 5, 4), olay(5, 9, 5)];
    for (const o of girdi) kuyrukEkle(k, o);
    expect(kuyrukBas(k)).toBe(girdi[4]);
    const cikan: Olay[] = [];
    for (let o = kuyrukCikar(k); o; o = kuyrukCikar(k)) cikan.push(o);
    expect(cikan.map((o) => o.sira)).toEqual([4, 2, 1, 3, 0, 5]);
    expect(kuyrukCikar(k)).toBeUndefined();
    expect(kuyrukBas(k)).toBeUndefined();
  });

  it("rastgele ekleme/cikarma siralama ozelligini korur", () => {
    const k: Olay[] = [];
    const d = prngOlustur(5, "olay");
    let sira = 0;
    const cikan: Olay[] = [];
    for (let i = 0; i < 3000; i++) {
      if (aralik(d, 3) > 0 || k.length === 0) {
        kuyrukEkle(k, olay(aralik(d, 50), aralik(d, 4), sira++));
      } else {
        cikan.push(kuyrukCikar(k) as Olay);
      }
    }
    while (k.length) cikan.push(kuyrukCikar(k) as Olay);
    // Her cikarma, o anda kuyrukta olanlarin en kucugudur; toplamda tum olaylar cikmis olmali
    expect(cikan.length).toBe(sira);
    // Bos kuyruktan toplu bosaltma tamamen sirali olmali
    const k2: Olay[] = [];
    for (let i = 0; i < 500; i++) kuyrukEkle(k2, olay(aralik(d, 20), aralik(d, 3), i));
    let onceki: Olay | undefined;
    for (let o = kuyrukCikar(k2); o; o = kuyrukCikar(k2)) {
      if (onceki) {
        const kucuk = onceki.t < o.t || (onceki.t === o.t && (onceki.oncelik < o.oncelik || (onceki.oncelik === o.oncelik && onceki.sira < o.sira)));
        expect(kucuk).toBe(true);
      }
      onceki = o;
    }
  });
});

describe("ozet", () => {
  it("anahtar sirasindan bagimsiz kanonik serilestirme", () => {
    expect(kanonikSerilestir({ b: 1, a: [1, null, true, "x\"y"], c: { z: 0, y: -5 } })).toBe(
      kanonikSerilestir({ c: { y: -5, z: 0 }, a: [1, null, true, "x\"y"], b: 1 }),
    );
    expect(kanonikSerilestir({ b: 1, a: [2] })).toBe('{"a":[2],"b":1}');
    expect(kanonikSerilestir(-0)).toBe("0");
  });

  it("tamsayi olmayan sayiyi reddeder", () => {
    expect(() => kanonikSerilestir({ a: [1, 1.5] })).toThrow(/\$\.a\[1\]/);
    expect(() => kanonikSerilestir({ a: Number.NaN })).toThrow();
  });

  it("fnv1a64 bilinen test vektorleri", () => {
    expect(fnv1a64("")).toBe("cbf29ce484222325");
    expect(fnv1a64("a")).toBe("af63dc4c8601ec8c");
    expect(fnv1a64("foobar")).toBe("85944171f73967e8");
  });

  it("fnv1a64 BigInt referansiyla uzun/Unicode girdilerde ayni", () => {
    const ref = (s: string): string => {
      let h = 0xcbf29ce484222325n;
      for (const b of new TextEncoder().encode(s)) {
        h ^= BigInt(b);
        h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
      }
      return h.toString(16).padStart(16, "0");
    };
    const d = prngOlustur(11, "olay");
    let s = "";
    for (let i = 0; i < 3000; i++) s += String.fromCharCode(32 + aralik(d, 600));
    expect(fnv1a64(s)).toBe(ref(s));
    expect(fnv1a64("çğıöşü €😀")).toBe(ref("çğıöşü €😀"));
  });

  it("durumOzeti 16 hane onaltilik ve degisiklige duyarli", () => {
    // Dunya tipi yerine duz veri: durumOzeti yalnizca serilestirir
    const d = { zaman: 5, x: [1, 2, 3] } as never;
    const a = durumOzeti(d);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(durumOzeti({ zaman: 5, x: [1, 2, 4] } as never)).not.toBe(a);
    expect(durumOzeti({ x: [1, 2, 3], zaman: 5 } as never)).toBe(a);
  });
});

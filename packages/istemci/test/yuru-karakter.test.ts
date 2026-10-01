import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { animasyonDokusu, deriKonumu, karakterCoz, kareIndeksi, kareKaristir } from "../src/yuru/karakter-veri";
import { HIZ } from "../src/yuru/kontrol";

const DOSYA = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "yuru", "varlik", "karakter.ykr");

describe("yürüyüş: pişirilmiş karakter (Quaternius UAL, CC0)", () => {
  const b = readFileSync(DOSYA);
  const v = karakterCoz(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);

  it("başlık ve diziler tutarlı", () => {
    expect(v.kose).toBeGreaterThan(1000);
    expect(v.kose).toBeLessThan(65536);
    expect(v.kemik).toBeLessThanOrEqual(64);
    expect(v.indeks.length % 3).toBe(0);
    for (const i of v.indeks) expect(i).toBeLessThan(v.kose);
    for (let i = 0; i < v.kose; i++) {
      const w = v.agirlik[i * 4]! + v.agirlik[i * 4 + 1]! + v.agirlik[i * 4 + 2]! + v.agirlik[i * 4 + 3]!;
      expect(w).toBe(255);
      for (let q = 0; q < 4; q++) expect(v.kemikIndeks[i * 4 + q]!).toBeLessThan(v.kemik);
    }
    expect(v.animasyonlar.map((a) => a.ad)).toEqual(["dur", "yuru", "kos", "depar", "zipla"]);
    expect(v.animasyonlar[0]!.kare).toBe(1);
  });

  it("durma pozunda ayak tabanı y = 0, boy ~1,8 m, yüz +z", () => {
    const m = new Float32Array(v.kemik * 12);
    kareKaristir(v, v.animasyonlar[0]!, 0, m);
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let i = 0; i < v.kose; i++) {
      const [, y] = deriKonumu(v, m, i);
      yMin = Math.min(yMin, y);
      yMax = Math.max(yMax, y);
    }
    expect(Math.abs(yMin)).toBeLessThan(0.01);
    expect(yMax).toBeGreaterThan(1.6);
    expect(yMax).toBeLessThan(2);
  });

  it("yürüme döngüsü sarar ve kareler arası karışım süreklidir", () => {
    const a = v.animasyonlar[1]!;
    const m0 = new Float32Array(v.kemik * 12);
    const m1 = new Float32Array(v.kemik * 12);
    kareKaristir(v, a, 0, m0);
    kareKaristir(v, a, a.sure, m1);
    for (let i = 0; i < m0.length; i++) expect(m1[i]).toBeCloseTo(m0[i]!, 5);
    const ma = new Float32Array(v.kemik * 12);
    kareKaristir(v, a, a.sure * 0.25, ma);
    const mb = new Float32Array(v.kemik * 12);
    kareKaristir(v, a, a.sure * 0.25 + 1e-4, mb);
    for (let i = 0; i < ma.length; i++) expect(Math.abs(mb[i]! - ma[i]!)).toBeLessThan(0.01);
    expect(a.hiz).toBeGreaterThan(0.5);
    expect(v.animasyonlar[2]!.hiz).toBeGreaterThan(a.hiz);
  });

  it("animasyon dokusu: satır = kare, kemik başına 3 texel; kare indeksi karışımla aynı", () => {
    const d = animasyonDokusu(v);
    expect(d.genislik).toBe(v.kemik * 3);
    expect(d.yukseklik).toBe(v.animasyonlar.reduce((s, a) => s + a.kare, 0));
    const a = v.animasyonlar[2]!;
    const t = a.sure * 0.4;
    const [f0, f1, u] = kareIndeksi(a, t);
    const m = new Float32Array(v.kemik * 12);
    kareKaristir(v, a, t, m);
    for (let i = 0; i < v.kemik * 12; i++) {
      const doku = d.veri[f0 * d.genislik * 4 + i]! * (1 - u) + d.veri[f1 * d.genislik * 4 + i]! * u;
      expect(doku).toBeCloseTo(m[i]!, 5);
    }
    expect(kareIndeksi(v.animasyonlar[0]!, 5)).toEqual([0, 0, 0]);
  });
});

describe("yürüyüş: karakter varyantı (düşük poligon, boyut bütçesi)", () => {
  const b = readFileSync(DOSYA);
  const v = karakterCoz(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);

  it("üçgen ≤ 4.500, kemik ≤ 24 (parmaklar ele, ayak parmakları ayağa katılı)", () => {
    expect(v.indeks.length / 3).toBeLessThanOrEqual(4500);
    expect(v.indeks.length / 3).toBeGreaterThan(2500);
    expect(v.kemik).toBeLessThanOrEqual(24);
  });

  it("dosya boyutu: gzip ≤ 120 KB (önceki 204 KB'ın %40 altı)", () => {
    expect(gzipSync(b, { level: 9 }).length).toBeLessThanOrEqual(120 * 1024);
  });

  it("oynatma oranı: yürü 4, koş 7, depar 10 m/s hızlarında ~1,6–2,1×", () => {
    const hizlar: [string, number][] = [
      ["yuru", HIZ.yuru],
      ["kos", HIZ.kos],
      ["depar", HIZ.depar],
    ];
    for (const [ad, hiz] of hizlar) {
      const a = v.animasyonlar.find((x) => x.ad === ad)!;
      expect(hiz / a.hiz).toBeGreaterThan(1.6);
      expect(hiz / a.hiz).toBeLessThan(2.1);
    }
  });

  it("deri giydirilmiş sınırlayıcı kutu her animasyon karesinde makul (kemik katılımı şekli bozmaz)", () => {
    const m = new Float32Array(v.kemik * 12);
    for (const a of v.animasyonlar) {
      for (let k = 0; k < a.kare; k++) {
        kareKaristir(v, a, a.sure ? (k / a.kare) * a.sure : 0, m);
        let yMax = -Infinity;
        let yMin = Infinity;
        let r = 0;
        for (let i = 0; i < v.kose; i += 7) {
          const [x, y, z] = deriKonumu(v, m, i);
          yMax = Math.max(yMax, y);
          yMin = Math.min(yMin, y);
          r = Math.max(r, Math.hypot(x, z));
        }
        expect(yMax).toBeLessThan(2.3);
        expect(yMin).toBeGreaterThan(-0.35);
        expect(r).toBeLessThan(1.4);
      }
    }
  });
});

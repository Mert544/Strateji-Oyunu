/**
 * Harita (S8): z20 hücre matematiği, "x:y" <-> 40 bit quadkey dönüşümü, BHI1 çözümü (gerçek Gebze örneği).
 * Formüller veri hattındaki (packages/veri-hatti/src/osm/izgara-geometri.ts) ile birebir aynı olmalı.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import * as vh from "../../veri-hatti/src/osm/izgara-geometri";
import {
  Bit,
  bhiCoz,
  durumAl,
  engelNedeni,
  hucreId,
  hucreKenariMetre,
  hucreMerkezi,
  hucreSiniri,
  idCoz,
  idtenQuadkey,
  izgaraSay,
  kisaAd,
  noktadanHucre,
  quadkey,
  quadkeyCoz,
  quadkeydenId,
  quadkeyTamsayi,
  satinAlinabilir,
  tamsayidanHucre,
} from "../src/harita/hucre";
import { gzipAc } from "../src/harita/veri";

const ORNEK = resolve(dirname(fileURLToPath(import.meta.url)), "../../veri/haritalar/odbl/ornek");

describe("z20 hücre matematiği", () => {
  it("Gebze'deki bir nokta veri hattıyla aynı hücreye düşer", () => {
    const h = noktadanHucre(29.4307, 40.8027);
    expect(h).toEqual(vh.noktadanHucre(29.4307, 40.8027));
    expect(h.x).toBeGreaterThan(609744);
    expect(hucreSiniri(h.x, h.y)).toEqual(vh.hucreSiniri(h.x, h.y));
    expect(hucreMerkezi(h.x, h.y)).toEqual(vh.hucreMerkezi(h.x, h.y));
    expect(hucreKenariMetre(h.y)).toBeCloseTo(vh.hucreKenariMetre(h.y), 9);
    expect(hucreKenariMetre(h.y)).toBeGreaterThan(28);
    expect(hucreKenariMetre(h.y)).toBeLessThan(30);
  });

  it("hücre merkezi yine aynı hücreye düşer; sınır kuzey > güney, doğu > batı", () => {
    for (const [lon, lat] of [
      [29.43, 40.8],
      [-73.98, 40.75],
      [151.2, -33.86],
      [0.0001, 0.0001],
    ] as const) {
      const h = noktadanHucre(lon, lat);
      const [mx, my] = hucreMerkezi(h.x, h.y);
      expect(noktadanHucre(mx, my)).toEqual(h);
      const [b, g, d, k] = hucreSiniri(h.x, h.y);
      expect(k).toBeGreaterThan(g);
      expect(d).toBeGreaterThan(b);
    }
  });
});

describe("hücre kimliği: x:y <-> quadkey", () => {
  it("x:y biçimi ve aralık denetimi", () => {
    expect(hucreId(609744, 392968)).toBe("609744:392968");
    expect(idCoz("609744:392968")).toEqual({ x: 609744, y: 392968 });
    expect(idCoz("1048576:0")).toBeNull();
    expect(idCoz("-1:5")).toBeNull();
    expect(idCoz("12:ab")).toBeNull();
    expect(idCoz("12:34:56")).toBeNull();
  });

  it("40 bit tamsayı veri hattının hucreKimligi ile aynı ve gidiş-dönüş kayıpsız", () => {
    const ornekler: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [0, 1],
      [609744, 392968],
      [610950, 394044],
      [2 ** 20 - 1, 2 ** 20 - 1],
      [123456, 987654],
    ];
    for (const [x, y] of ornekler) {
      const k = quadkeyTamsayi(x, y);
      expect(k).toBe(vh.hucreKimligi(x, y));
      expect(k).toBeLessThan(2 ** 40);
      expect(tamsayidanHucre(k)).toEqual({ x, y });
      expect(quadkeydenId(k)).toBe(`${x}:${y}`);
      expect(idtenQuadkey(`${x}:${y}`)).toBe(k);
      expect(quadkey(x, y)).toBe(vh.quadkey(x, y));
      expect(quadkeyCoz(quadkey(x, y))).toEqual({ x, y, z: 20 });
    }
    expect(quadkeyTamsayi(2 ** 20 - 1, 2 ** 20 - 1)).toBe(2 ** 40 - 1);
  });

  it("aynı z15 karodaki 1024 hücre ardışık aralıkta (k / 1024 = z15 ebeveyn)", () => {
    const x = 609744 + 7;
    const y = 392968 + 3;
    const k = quadkeyTamsayi(x, y);
    const ebeveyn = Math.floor(k / 1024);
    expect(quadkeyTamsayi((x >>> 5) << 5, (y >>> 5) << 5)).toBe(ebeveyn * 1024);
  });

  it("geçersiz girdiler hata verir", () => {
    expect(() => tamsayidanHucre(-1)).toThrow();
    expect(() => tamsayidanHucre(2 ** 40)).toThrow();
    expect(() => quadkeyCoz("0124")).toThrow();
    expect(() => idtenQuadkey("x")).toThrow();
  });

  it("kısa ad kararlı ve # ile başlar", () => {
    expect(kisaAd("609744:392968")).toMatch(/^#[0-9A-F]{1,5}$/);
    expect(kisaAd("609744:392968")).toBe(kisaAd("609744:392968"));
    expect(kisaAd("609744:392968")).not.toBe(kisaAd("609745:392968"));
  });
});

describe("BHI1", () => {
  it("sentetik ızgara çözülür; çerçeve dışı 0", () => {
    const t = new Uint8Array(24 + 6);
    const v = new DataView(t.buffer);
    "BHI1".split("").forEach((c, i) => (t[i] = c.charCodeAt(0)));
    v.setUint8(4, 20);
    v.setUint8(5, 1);
    v.setUint16(6, 1, true);
    v.setUint32(8, 100, true);
    v.setUint32(12, 200, true);
    v.setUint32(16, 3, true);
    v.setUint32(20, 2, true);
    t.set([1, 1 | Bit.YOL, 1 | Bit.SU, 0, 1 | (3 << 5), 1 | Bit.ASKERI], 24);
    const iz = bhiCoz(t);
    expect(iz).toMatchObject({ x0: 100, y0: 200, genislik: 3, yukseklik: 2 });
    expect(durumAl(iz, 100, 200)).toBe(1);
    expect(durumAl(iz, 99, 200)).toBe(0);
    expect(durumAl(iz, 101, 201)).toBe(1 | (3 << 5));
    expect(engelNedeni(durumAl(iz, 101, 200))).toBe("Yol tamponu");
    expect(engelNedeni(durumAl(iz, 102, 200))).toMatch(/^Su/);
    expect(engelNedeni(durumAl(iz, 102, 201))).toBe("Askerî alan");
    expect(engelNedeni(durumAl(iz, 100, 201))).toBe("İlçe sınırı dışında");
    expect(izgaraSay(iz)).toEqual({ kota: 4, uygun: 2 });
    expect(() => bhiCoz(t.subarray(0, 28))).toThrow();
  });

  it("gerçek Gebze örneği: ölçüm dosyasındaki sayılarla tutarlı", async () => {
    const gz = new Uint8Array(readFileSync(resolve(ORNEK, "gebze-hucreler.bhi.gz")));
    const ham = await gzipAc(gz);
    expect(Buffer.from(ham).equals(gunzipSync(gz))).toBe(true);
    const iz = bhiCoz(ham);
    const olcum = JSON.parse(readFileSync(resolve(ORNEK, "gebze-olcum.json"), "utf8")) as {
      izgara: { cerceve: { x0: number; y0: number; genislik: number; yukseklik: number }; istatistik: { icerdeTum?: number; toplam: number; satinAlinabilir: number } };
    };
    expect(iz).toMatchObject(olcum.izgara.cerceve);
    let icerde = 0;
    let uygun = 0;
    for (const d of iz.durum) {
      if (d & Bit.ICERIDE) icerde++;
      if (satinAlinabilir(d)) uygun++;
    }
    const ist = olcum.izgara.istatistik;
    // S6 sonrası: "toplam" su hücrelerini saymaz (kota paydası), "icerdeTum" sayar.
    if (ist.icerdeTum !== undefined) {
      expect(icerde).toBe(ist.icerdeTum);
      expect(izgaraSay(iz).kota).toBe(ist.toplam);
    } else expect(icerde).toBe(ist.toplam);
    expect(uygun).toBe(ist.satinAlinabilir);
    expect(izgaraSay(iz).uygun).toBe(ist.satinAlinabilir);
  });

  it("gzipAc sıkıştırılmamış veriyi olduğu gibi döndürür", async () => {
    const t = new Uint8Array([66, 72, 73, 49]);
    expect(await gzipAc(t)).toBe(t);
    expect([...(await gzipAc(new Uint8Array(gzipSync(Buffer.from(t)))))]).toEqual([...t]);
  });
});

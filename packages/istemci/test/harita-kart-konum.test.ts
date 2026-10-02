/** Yapı kartı konumu (saf): hedef hücre alt yarıdaysa "ust", üst yarıdaysa (ya da hedef yokken) varsayılan alt. */
import { describe, expect, it } from "vitest";
import { kartKonumu, kartYerlesimi } from "../src/harita/kart-durum";
import type { KartOlcusu } from "../src/harita/kart-durum";

describe("kartKonumu", () => {
  it("alt yarı → ust", () => {
    expect(kartKonumu(600, 900)).toBe("ust");
    expect(kartKonumu(899, 900)).toBe("ust");
    expect(kartKonumu(451, 900)).toBe("ust");
  });

  it("üst yarı (orta çizgi dahil) → yok", () => {
    expect(kartKonumu(100, 900)).toBeNull();
    expect(kartKonumu(450, 900)).toBeNull();
    expect(kartKonumu(0, 900)).toBeNull();
  });

  it("hedef yok ya da kap yüksekliği bilinmiyor → yok", () => {
    expect(kartKonumu(null, 900)).toBeNull();
    expect(kartKonumu(600, 0)).toBeNull();
  });

  it("telefon (844): alt yarı üste alır", () => {
    expect(kartKonumu(500, 844)).toBe("ust");
    expect(kartKonumu(300, 844)).toBeNull();
  });
});

/** Masaüstü (900): üst HUD altı 72, alt kenar payı 36; hücre ~73 px (yarısı 36,5). */
const olcu = (kartYukseklik: number, ek: Partial<KartOlcusu> = {}): KartOlcusu => ({ kartYukseklik, kapYukseklik: 900, ustPx: 72, altPx: 36, hedefYari: 36.5, ...ek });

/** Seçilen konum ve sınırla kartın kapladığı dikey aralık. */
function kartAraligi(r: ReturnType<typeof kartYerlesimi>, o: KartOlcusu): [number, number] {
  const h = Math.min(o.kartYukseklik, r.enYuksek ?? o.kartYukseklik);
  return r.konum === "ust" ? [o.ustPx, o.ustPx + h] : [o.kapYukseklik - o.altPx - h, o.kapYukseklik - o.altPx];
}

describe("kartYerlesimi (kartın ölçülen yüksekliği)", () => {
  it("uzun Ahır kartı + ekran ortasındaki hedef (487): iki konum da örter → açık alanı büyük taraf, kart sınırlanır, hedef görünür", () => {
    const o = olcu(418);
    const r = kartYerlesimi(487, o);
    expect(r.konum).toBe("ust");
    expect(r.enYuksek).toBe(370);
    const [bas, son] = kartAraligi(r, o);
    expect(bas).toBe(72);
    expect(son).toBeLessThanOrEqual(487 - 36.5 - 8);
  });

  it("hedef aşağıda: üst konum örtmez → üst, sınır yok", () => {
    expect(kartYerlesimi(800, olcu(418))).toEqual({ konum: "ust", enYuksek: null });
  });

  it("hedef yukarıda: alt konum örtmez → alt (üst kart hedefi örterdi), sınır yok", () => {
    expect(kartYerlesimi(150, olcu(418))).toEqual({ konum: null, enYuksek: null });
  });

  it("kısa kart: iki konum da açık → eski kural (alt yarı → üst, üst yarı → alt)", () => {
    expect(kartYerlesimi(600, olcu(200))).toEqual({ konum: "ust", enYuksek: null });
    expect(kartYerlesimi(300, olcu(200))).toEqual({ konum: null, enYuksek: null });
    expect(kartYerlesimi(450, olcu(200))).toEqual({ konum: null, enYuksek: null });
  });

  it("çok uzun kart, hedef üstte (300): altın altındaki alan büyük → alt konum, kart hedefin altına sınırlanır", () => {
    const o = olcu(600);
    const r = kartYerlesimi(300, o);
    expect(r).toEqual({ konum: null, enYuksek: 519 });
    expect(kartAraligi(r, o)[0]).toBeGreaterThanOrEqual(300 + 36.5 + 8);
  });

  it("alan çok dar: kart en az 140 px kalır (hedef yine açık alan büyük taraftadır)", () => {
    const r = kartYerlesimi(200, olcu(380, { kapYukseklik: 400 }));
    expect(r.enYuksek).toBe(140);
  });

  it("hedef yok ya da kap/kart ölçüsü yok → eski kural, sınır yok", () => {
    expect(kartYerlesimi(null, olcu(418))).toEqual({ konum: null, enYuksek: null });
    expect(kartYerlesimi(600, olcu(0))).toEqual({ konum: "ust", enYuksek: null });
    expect(kartYerlesimi(600, olcu(418, { kapYukseklik: 0 }))).toEqual({ konum: null, enYuksek: null });
  });

  it("tarama: 900 px kapta her hedef konumunda kart (sınırlıysa sınırıyla) hedef hücreyi örtmez", () => {
    for (const h of [200, 300, 418, 500, 600]) {
      for (let y = 60; y <= 850; y += 5) {
        const o = olcu(h);
        const r = kartYerlesimi(y, o);
        const [bas, son] = kartAraligi(r, o);
        const orter = y - 36.5 < son && y + 36.5 > bas;
        expect(orter, `kart ${h}, hedef ${y}`).toBe(false);
      }
    }
  });

  it("telefon (844, üst 64, alt 32): uzun kart + orta hedef de örtmez", () => {
    const o = olcu(500, { kapYukseklik: 844, ustPx: 64, altPx: 32 });
    for (let y = 100; y <= 760; y += 20) {
      const r = kartYerlesimi(y, o);
      const [bas, son] = kartAraligi(r, o);
      expect(y - 36.5 < son && y + 36.5 > bas, `hedef ${y}`).toBe(false);
    }
  });

  // T3 kart-ortme-kapsam.md: kart x cihaz tablosu (hücre ~84 px kare ölçüsü; yarısı 42). Her satır: H, ustPx, altPx, kart yüksekliği.
  const T3: Array<[string, number, number, number, number]> = [
    ["Çiftlik 2 yöntem masaüstü (~400)", 900, 72, 36, 400],
    ["Ahır 3 yöntem masaüstü (~430)", 900, 72, 36, 430],
    ["Parça fabrikası 4 yöntem masaüstü (~510)", 900, 72, 36, 510],
    ["masaüstü tavanı (540)", 900, 72, 36, 540],
    ["Dükkân D3 masaüstü (716)", 900, 72, 36, 716],
    ["Dükkân D3 masaüstü ölçülü (727)", 900, 72, 36, 727],
    ["telefon 390x844 tavan (464)", 844, 64, 32, 464],
    ["telefon 390x844 yöntem kartı (500, tavan öncesi doğal)", 844, 64, 32, 500],
    ["telefon 360x640 tavan (352)", 640, 64, 32, 352],
    ["telefon 360x640 doğal 464", 640, 64, 32, 464],
  ];
  it.each(T3)("T3 tablosu: %s: hedef ekran boyunca (hücre 84 px) kart örtmez ya da yeterli açık alanda sınırlanır", (_ad, kap, ustPx, altPx, h) => {
    for (let y = 60; y <= kap - 60; y += 4) {
      const o = olcu(h, { kapYukseklik: kap, ustPx, altPx, hedefYari: 42 });
      const r = kartYerlesimi(y, o);
      const [bas, son] = kartAraligi(r, o);
      const orter = y - 42 < son && y + 42 > bas;
      // Alan 140 px'in altına inen uç bölgeler (hedef ekran kenarında; açık taraf zaten karşıda) için en az 140 kuralı geçerlidir: yalnız o durumda örtmeye izin
      const sinirAlti = r.enYuksek === 140;
      expect(orter && !sinirAlti, `${_ad}: hedef ${y} → ${JSON.stringify(r)}`).toBe(false);
    }
  });

  it("T3: %44 ölü bandı (iki konumda da örten h): ortadaki hedefte kart sınırlanır, sınırsız kalmaz", () => {
    for (const [kap, ustPx, altPx] of [[900, 72, 36], [844, 64, 32]] as const) {
      const h = Math.ceil(0.46 * kap); // eşiğin üstü: 414 / 389
      const r = kartYerlesimi(kap / 2, olcu(h, { kapYukseklik: kap, ustPx, altPx, hedefYari: 42 }));
      expect(r.enYuksek, `H ${kap}`).not.toBeNull();
      expect(r.enYuksek!).toBeLessThan(h);
    }
  });
});


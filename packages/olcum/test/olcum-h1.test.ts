import { describe, expect, it } from "vitest";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { H1_ISLETIMSEL_TANIM, odakKumesi, h1Kos } from "../src";
import { kararli, semaDogru } from "./olcum-yardimci";

describe("hipotez koşucuları (kısa sürüm)", () => {
  const tohumlar = [1];

  it("H1 v0.2: pasif referans, eklenen değer, bölge+liman odağı (devlet başına 1 bölge × 3 sabit önayar + dengeli × 1 gün)", () => {
    const veri = varsayilanVeriyiYukle();
    const h = h1Kos({ tohumlar, kisa: true, veri });
    semaDogru(h, "H1", 1);
    expect(h.parametreler["bolgeSayisi"]).toBe(veri.harita.devletler.length);
    expect(h.parametreler["onayarSayisi"]).toBe(3);
    expect(h.parametreler["referansOnayar"]).toBe("dengeli");
    expect(h.parametreler["odakKurulumu"]).toBe("bolge+liman");
    expect(String(h.parametreler["pasifReferans"])).toContain("evet");
    const ay = h.ayrinti as {
      onayarlar: Array<{ ad: string }>;
      referans: { ad: string };
      turTablosu: Array<{ hicbiriPayi: number }>;
      isletimselTanim: string[];
      bilgiGostergeleri: Record<string, { saglandi: boolean }>;
      bolgeTablosuIlkTohum: Array<{ bolge: string; kume: string[]; pasifSkor: number; esik: number; ekDegerler: Record<string, number>; bilesenler: Record<string, Record<string, number>>; referans: { ekDeger: number } | null }>;
    };
    expect(ay.isletimselTanim).toEqual([...H1_ISLETIMSEL_TANIM]);
    // dengeli sıralamada DEĞİL, yalnızca referans olarak
    expect(ay.onayarlar.map((o) => o.ad)).not.toContain("dengeli");
    expect(ay.referans.ad).toBe("dengeli");
    expect(ay.turTablosu.length).toBeGreaterThan(0);
    expect(Object.keys(ay.bilgiGostergeleri).sort()).toEqual(["normalizeEntropi", "regret", "turBasinaFarkliEnIyi"]);
    for (const b of ay.bolgeTablosuIlkTohum) {
      // odak kümesi: bölge (+ limansa yalnız o; değilse en yakın liman)
      const tan = veri.harita.bolgeler.find((x) => x.id === b.bolge)!;
      expect(b.kume[0]).toBe(b.bolge);
      expect(b.kume).toEqual(odakKumesi(veri.harita, b.bolge, "bolge_liman"));
      expect(b.kume.length).toBe(tan.etiketler.includes("liman") ? 1 : 2);
      expect(b.esik).toBeGreaterThanOrEqual(10_000);
      expect(Object.keys(b.ekDegerler)).not.toContain("dengeli");
      expect(b.referans).not.toBeNull();
      // eklenen değer = bileşenlerin toplamı (hazine + stok + yatırım)
      for (const [ad, bl] of Object.entries(b.bilesenler)) {
        expect(bl["skor"]).toBeCloseTo((bl["hazine"] as number) + (bl["stok"] as number) + (bl["yatirim"] as number), 0);
        expect(b.ekDegerler[ad]).toBeCloseTo(bl["skor"] as number, 0);
      }
    }
    const oz = h.tohumBasina[0]!.ozet as { anlamliIlkUcOrani: Record<string, number>; enIyiOnayarPayi: Record<string, number>; hicbiriAnlamliDegil: number; anlamliBolge: number };
    expect(Object.keys(oz.anlamliIlkUcOrani)).not.toContain("dengeli");
    expect(oz.anlamliBolge + oz.hicbiriAnlamliDegil).toBe(veri.harita.devletler.length);
    // en iyi payı: anlamlı bölge başına toplam 1
    expect(Object.values(oz.enIyiOnayarPayi).reduce((t, x) => t + x, 0)).toBeCloseTo(oz.anlamliBolge / veri.harita.devletler.length, 3);
    expect(kararli(h1Kos({ tohumlar, kisa: true, veri }))).toBe(kararli(h));
  }, 180_000);
});

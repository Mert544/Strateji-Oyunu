/**
 * "Sen yokken" dönüş ekranı (saf): şablondan Türkçe metin (tohumlu varyant), en çok 8 satır, boş özette ekran yok, yasaklı kalıp
 * yok ("kaçırdın", "acele" ...), "sunucu kapalıydı" yok, K5+ "girmen yeter".
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DONUS_SABLON } from "@bolge/protokol";
import type { DonusOzeti } from "@bolge/protokol";
import { DONUS_EN_COK_SATIR, DONUS_METINLERI, DONUS_ORNEGI, donusBosMu, donusHtml, donusSatirlari, maddeMetni } from "../src/harita/donus-ekrani";
import type { DonusAdlari } from "../src/harita/donus-ekrani";

const ad: DonusAdlari = {
  yapi: (t) => ({ ahir: "Ahır", ciftlik: "Çiftlik" })[t] ?? t,
  mal: (m) => ({ tahil: "Tahıl", gida: "Gıda" })[m] ?? m,
  yer: (k) => ({ tr_41_gebze: "Gebze", tr_41_kandira: "Kandıra" })[k] ?? "",
};

describe("dönüş ekranı", () => {
  it("şablon + tohum: aynı olgu aynı cümle; yer adı ve toplu madde", () => {
    const m = DONUS_ORNEGI.maddeler[0]!;
    expect(maddeMetni(m, ad)).toBe(maddeMetni({ ...m }, ad));
    expect(maddeMetni(m, ad)).toMatch(/^Gebze: Ahır (bitti|tamamlandı|hazır)/);
    expect(maddeMetni(DONUS_ORNEGI.maddeler[1]!, ad)).toMatch(/^2 Çiftlik (bitti|tamamlandı) \(Gebze, Kandıra\)/);
    expect(maddeMetni({ ...m, degerler: ["olcek", ""] }, ad)).toMatch(/^Ölçek büyütme/);
  });

  it("net sonuç işaretli, üretim, en çok 8 satır; Git yalnız ilçede; K5+ girmen yeter", () => {
    const s = donusSatirlari(DONUS_ORNEGI, ad);
    expect(s[0]!.html).toContain("+₺1.960");
    expect(s[0]!.html).toContain("giderler −₺180");
    expect(s[1]!.html).toBe("Üretimden çıkanlar: Tahıl 220 · Gıda 60");
    expect(s[2]!.git).toBe("tr_41_gebze");
    const cok: DonusOzeti = { ...DONUS_ORNEGI, maddeler: Array.from({ length: 20 }, (_, i) => ({ ...DONUS_ORNEGI.maddeler[0]!, tohum: i, onem: i })) };
    expect(donusSatirlari(cok, ad)).toHaveLength(DONUS_EN_COK_SATIR);
    const h = donusHtml(DONUS_ORNEGI, ad, Date.parse("2026-09-30T21:00:00Z"));
    expect(h).toContain("Sen yokken");
    expect(h).toContain("14 sa aradan sonra");
    expect(h).toContain("İyi günler · 1 Ekim 2026 Perşembe");
    expect(h.match(/data-dn="devam"/g)).toHaveLength(1);
    expect(donusHtml({ ...DONUS_ORNEGI, bant: "K5" }, ad)).toContain("girmen yeter");
    expect(donusHtml(DONUS_ORNEGI, ad, undefined, () => false)).not.toContain("data-dn-git");
  });

  it("boş özette ekran açılmaz", () => {
    expect(donusBosMu({ ...DONUS_ORNEGI, net: { hazineFarki: 0, kalemler: { satis: 0, gider: 0, diger: 0 }, uretim: [] }, maddeler: [] })).toBe(true);
    expect(donusBosMu(DONUS_ORNEGI)).toBe(false);
  });

  it("yasaklı kalıp yok (yargı, baskı, büyük harfli sözcük); 'sunucu kapalıydı' yok; her şablonun metni var", () => {
    const kaynak = readFileSync(new URL("../src/harita/donus-ekrani.ts", import.meta.url), "utf8");
    const metinler = [...Object.values(DONUS_METINLERI).flat(), ...[...kaynak.matchAll(/"([^"\n]*[a-zçğıöşü][^"\n]*)"/g)].map((m) => m[1]!)];
    const yasak = [/kaçırdın/i, /kaybettin/i, /geç kaldın/i, /son şans/i, /acele/i, /sadece .* saat/i, /seni özledik/i, /neredesin/i, /\bhemen\b/i, /fırsatı kaçırma/i, /yapmazsan/i, /kaybedeceksin/i, /sunucu kapalı/i];
    for (const m of metinler) for (const y of yasak) expect(m, m).not.toMatch(y);
    for (const m of Object.values(DONUS_METINLERI).flat()) expect(m).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,}\b/);
    for (const s of Object.values(DONUS_SABLON)) expect(DONUS_METINLERI[s]?.length ?? 0).toBeGreaterThan(0);
  });
});

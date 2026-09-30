import { describe, expect, it } from "vitest";
import { kosuyuDisariAktar, raporOzetle, sayfaUret, NEDEN_KODLARI } from "../src";
import type { KosuVerisi } from "../src";

// Tek bir kısa koşu tüm testlerde paylaşılır.
let onbellek: KosuVerisi | null = null;
function kosu(): KosuVerisi {
  onbellek ??= kosuyuDisariAktar({ gun: 1, tohum: 1 });
  return onbellek;
}

describe("disari aktarma", () => {
  it("1 günlük koşu her 6 saatte bir kare üretir (t=0 dahil 5 kare)", () => {
    const v = kosu();
    expect(v.surum).toBe(1);
    expect(v.kareler.map((k) => k.saat)).toEqual([0, 6, 12, 18, 24]);
    expect(v.dizin.bolgeler).toHaveLength(50);
    expect(v.dizin.devletler).toHaveLength(4);
    expect(v.dizin.oyuncular.map((o) => o.arketip)).toEqual(["sanayici", "tuccar", "lojistikci", "militarist"]);
  });

  it("kareler şemaya uygundur (uzunluklar, aralıklar, tamsayılar)", () => {
    const v = kosu();
    const nb = v.dizin.bolgeler.length;
    const nm = v.dizin.mallar.length;
    const nk = v.dizin.kenarlar.length;
    for (const k of v.kareler) {
      expect(k.bolgeler).toHaveLength(nb);
      expect(k.kenarlar).toHaveLength(nk);
      expect(k.fiyat).toHaveLength(nm);
      expect(k.hazine).toHaveLength(4);
      for (const b of k.bolgeler) {
        expect(b.stok).toHaveLength(nm);
        expect(b.uretim).toHaveLength(nm);
        expect(Number.isInteger(b.nufus)).toBe(true);
        expect(b.sahip).toBeGreaterThanOrEqual(-1);
        expect(b.sahip).toBeLessThan(4);
        expect(b.gida).toBeGreaterThanOrEqual(0);
        expect(b.gida).toBeLessThanOrEqual(100);
        for (const s of b.stok) expect(Number.isInteger(s) && s >= 0).toBe(true);
        for (const t of b.tesis) expect(t).toHaveLength(5);
      }
      for (const [kap, kul, ask] of k.kenarlar) {
        expect(kap).toBeGreaterThan(0);
        expect(kul).toBeGreaterThanOrEqual(0);
        expect(kul).toBeLessThanOrEqual(kap + 0.1);
        expect(ask).toBeLessThanOrEqual(kul + 0.1);
      }
      // yalnızca sıfır olmayan akışlar; yol kenarları geçerli
      for (const [mal, oran, kaynak, hedef, yol, sahip] of k.akislar) {
        expect(oran).toBeGreaterThan(0);
        expect(mal).toBeLessThan(nm);
        expect(kaynak).not.toBe(hedef);
        expect(hedef).toBeLessThan(nb);
        expect(sahip).toBeGreaterThanOrEqual(0);
        for (const e of yol) expect(e).toBeLessThan(nk);
      }
      // kapsam: yalnızca tam karşılanmayan hücreler
      for (const [b, m, pct, kod, sure] of k.kapsam) {
        expect(b).toBeLessThan(nb);
        expect(m).toBeLessThan(nm);
        expect(pct).toBeLessThan(100);
        expect(kod).toBeLessThan(NEDEN_KODLARI.length);
        expect(sure).toBeGreaterThanOrEqual(-1);
      }
    }
  });

  it("koşu ilerledikçe üretim ve akış oluşur; veri JSON olarak küçük kalır", () => {
    const v = kosu();
    const son = v.kareler[v.kareler.length - 1]!;
    expect(son.akislar.length).toBeGreaterThan(0);
    expect(son.bolgeler.some((b) => b.uretim.some((u) => u > 0))).toBe(true);
    expect(JSON.stringify(v).length).toBeLessThan(400_000);
  });
});

describe("sayfa", () => {
  it("geçerli HTML iskeleti ve gömülü veri üretir; harici bağımlılık yoktur", () => {
    const v = kosu();
    const html = sayfaUret({ veri: v });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<html lang="tr">');
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain("<title>Simülasyon İzleyici</title>");
    expect(html).toContain("Bölge Stratejisi — Simülasyon İzleyici");
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain('id="zaman"');
    expect(html).toContain('id="harita"');
    expect(html).toContain('id="mal-secici"');
    // yer tutucular kalmamalı
    expect(html).not.toMatch(/@@[A-Z_]+@@/);
    expect(html).not.toContain("/*@@");
    // harici kaynak yok
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+href=/i);
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    // veri gömülü ve geri okunabilir
    const m = /<script type="application\/json" id="veri-json">([\s\S]*?)<\/script>/.exec(html);
    expect(m).not.toBeNull();
    const geri = JSON.parse(m![1] as string) as KosuVerisi;
    expect(geri.kareler).toHaveLength(v.kareler.length);
    expect(geri.dizin.bolgeler[0]!.id).toBe(v.dizin.bolgeler[0]!.id);
    // rapor verilmediyse bölüm gizli
    expect(html).not.toContain('id="rapor-bolumu"');
    expect(html).not.toContain('id="rapor-json"');
  });

  it("rapor verilince hipotez bölümü ve gömülü rapor eklenir", () => {
    const rapor = raporOzetle(
      {
        tohumlar: [1],
        hizli: false,
        hipotezler: [
          {
            kimlik: "H1",
            hipotez: "<b>deneme</b> </script>",
            olcum: { ad: "x", deger: 0.5, birim: "oran" },
            esik: { aciklama: "e" },
            verdict: "gecti",
            tohumBasariOrani: 1,
            tohumBasina: [{ tohum: 1, olcum: 0.5, verdict: "gecti" }],
          },
        ],
      },
      "deneme.json",
    );
    expect(rapor).not.toBeNull();
    const html = sayfaUret({ veri: kosu(), rapor });
    expect(html).toContain('id="rapor-bolumu"');
    const m = /<script type="application\/json" id="rapor-json">([\s\S]*?)<\/script>/.exec(html);
    expect(m).not.toBeNull();
    const geri = JSON.parse(m![1] as string) as { hipotezler: Array<{ hipotez: string }> };
    // "</script>" gömülü JSON'u erken kapatmamalı
    expect(geri.hipotezler[0]!.hipotez).toBe("<b>deneme</b> </script>");
  });

  it("raporOzetle tanınmayan biçimde null döner", () => {
    expect(raporOzetle({}, "x")).toBeNull();
    expect(raporOzetle(null, "x")).toBeNull();
    expect(raporOzetle({ hipotezler: [] }, "x")).toBeNull();
  });
});

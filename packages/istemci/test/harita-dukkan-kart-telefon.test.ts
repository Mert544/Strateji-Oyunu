/**
 * Telefonda yapı/dükkân kartı (CSS sözleşmesi; DOM ve tarayıcı yok): kartın yüksekliği tavanlı (haritanın görünür kalması ve Kur/Vazgeç'in ekran içinde olması), kayan kartta
 * düğmeler yapışık. Kural tek kaynakta: `harita-yigin.css` (T1 7212b08; tüm yapı kartları, dükkân dahil; K1 5c5fdf8 dükkân kuralının yerini aldı). Geometri 390×844 için sayılır.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { kartKonumu } from "../src/harita/kart-durum";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "harita", "harita-yigin.css"), "utf8");
const telefon = css.slice(css.lastIndexOf("/* Telefon kareleri (dükkân akışı, 390 px)"));

describe("telefonda yapı ve dükkân kartı", () => {
  it("tavan 55vh, kart içinde kayar; dükkân maliyet adımının Kur/Vazgeç'i yapışık", () => {
    expect(telefon).toContain("@media (max-width: 820px) {");
    expect(telefon).toContain("#yapi-kart { max-height: 55vh; max-height: 55dvh; overflow-y: auto;");
    expect(telefon).toContain("#yapi-kart .dk-maliyet > .yk-dugmeler:last-child");
    expect(telefon).toContain("position: sticky; bottom:");
  });

  it("kart üstteyken (top 64) tavan alt kenara taşmaz: 55vh + 64 + 32 <= ekran (390x844 ve 360x640)", () => {
    for (const H of [844, 640]) expect(Math.floor(0.55 * H) + 64 + 32).toBeLessThanOrEqual(H);
  });

  it("390×844: tavanlı kart ekranın %55'ini aşmaz; alt konumda üst yarı (hedef) görünür, üst konumda alt yarı görünür", () => {
    const H = 844;
    const kart = Math.floor(0.55 * H); // 464 px
    expect(kartKonumu(120, H)).toBeNull();
    expect(120).toBeLessThan(H - 32 - kart); // alt konum: kart [348, 812]
    expect(kartKonumu(700, H)).toBe("ust");
    expect(700).toBeGreaterThan(64 + kart); // üst konum: kart [64, 528]
  });
});

describe("sınırlanan kart (ekran genişliğinden bağımsız)", () => {
  const sinirli = css.slice(css.lastIndexOf("/* Sınırlanan kart"));
  const yerlesim = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "harita", "yerlesim.ts"), "utf8");

  it("sınırlı kartta eylem satırı (Kur/Vazgeç) yapışık: medya sorgusuz kural, hem standart hem dükkân maliyet adımı", () => {
    expect(sinirli).toContain('#yapi-kart[data-sinirli] > .yk-dugmeler:last-child');
    expect(sinirli).toContain('#yapi-kart[data-sinirli] .dk-maliyet > .yk-dugmeler:last-child');
    expect(sinirli).toContain("position: sticky; bottom:");
    expect(sinirli).not.toContain("@media");
  });

  it("yerlesim.ts kartı sınırlarken data-sinirli koyar, sınır kalkınca siler", () => {
    expect(yerlesim).toContain('this.kart.dataset["sinirli"] = "1"');
    expect(yerlesim).toContain('delete this.kart.dataset["sinirli"]');
  });
});

describe("masaüstü dükkân D3 kartı tavanı", () => {
  const dukkanCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "harita", "dukkan-panel.css"), "utf8");

  it("tavan %60 ile bildirim payı tavanının küçüğü; kart içinde kayar, Kur/Vazgeç yapışık", () => {
    expect(dukkanCss).toContain("#yapi-kart:has(.dk-maliyet) { max-height: min(60%, calc(100% - 36px - 148px)); overflow-y: auto;");
    expect(dukkanCss).toMatch(/#yapi-kart:has\(\.dk-maliyet\) \.dk-maliyet > \.yk-dugmeler \{\s+position: sticky;/);
    // 900 px yükseklikte: %60 = 540 (eski tavan 716'ydı)
    expect(Math.min(0.6 * 900, 900 - 36 - 148)).toBe(540);
  });
});


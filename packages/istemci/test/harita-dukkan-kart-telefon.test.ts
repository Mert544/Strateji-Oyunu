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

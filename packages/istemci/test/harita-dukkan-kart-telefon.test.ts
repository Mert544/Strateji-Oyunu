/**
 * Telefonda dükkân yapı kartı (CSS sözleşmesi; DOM ve tarayıcı yok): kartın yüksekliği tavanlı (haritanın görünür kalması ve Kur/Vazgeç'in ekran içinde olması),
 * kayan kartta düğmeler yapışık, kart üstteyken tavan alt kenara taşmaz. Geometri 390×844 için sayılır.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { kartKonumu } from "../src/harita/kart-durum";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "harita", "dukkan-panel.css"), "utf8");
const telefon = css.slice(css.lastIndexOf("@media (max-width: 820px) {\n  #yapi-kart:has(:is(.dk-tur-liste, .dk-maliyet))"));

describe("telefonda dükkân kartı", () => {
  it("tür seçimi ve maliyet adımında tavan 55vh, kart içinde kayar, düğmeler yapışık", () => {
    expect(telefon).toMatch(/#yapi-kart:has\(:is\(\.dk-tur-liste, \.dk-maliyet\)\) \{ max-height: 55vh; overflow-y: auto;/);
    expect(telefon).toMatch(/\.yk-dugmeler \{\s*position: sticky; bottom:/);
  });

  it("kart üstteyken tavan alt kenara taşmaz (top 64 + alt pay 32)", () => {
    expect(telefon).toMatch(/\[data-konum="ust"\]:has\(:is\(\.dk-tur-liste, \.dk-maliyet\)\) \{ max-height: min\(55vh, calc\(100% - 64px - 32px\)\); \}/);
  });

  it("390×844: tavanlı kart ekranın %55'ini aşmaz; alt konumda üst yarı (hedef) görünür, üst konumda alt yarı görünür", () => {
    const H = 844;
    const kart = Math.floor(0.55 * H); // 464 px
    // alt konum: kart [H-32-kart, H-32] = [348, 812]; hedef y=120 (üst yarı) açıkta
    expect(kartKonumu(120, H)).toBeNull();
    expect(120).toBeLessThan(H - 32 - kart);
    // üst konum: kart [64, 64+kart] = [64, 528]; hedef y=700 (alt yarı) açıkta, düğmeler kart içinde ve ekran içinde
    expect(kartKonumu(700, H)).toBe("ust");
    expect(700).toBeGreaterThan(64 + kart);
    expect(64 + kart).toBeLessThanOrEqual(H - 32);
  });
});

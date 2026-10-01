/** Telefonda üst çubuk düğmeleri 44 × 44 px (dokunma hedefi); dar telefonda çubuk tek satır kalır (kuralların varlığı; yerleşim ekran görüntüsüyle). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "arayuz", "stil.css"), "utf8");

describe("üst çubuk dokunma hedefi", () => {
  it("≤ 480 px'te üst çubuk simge düğmeleri 44 px (40 px kuralı kalmadı)", () => {
    expect(css).toMatch(/#ust \.ikon-dugme \{ width: 44px; height: 44px; \}/);
    expect(css).not.toMatch(/#ust \.ikon-dugme \{ width: 40px/);
  });
  it("≤ 380 px'te boşluklar kısılır ve hasat yüzdesi gizlenir (3 × 44 px sığsın)", () => {
    const m = /@media \(max-width: 380px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(m).toMatch(/#ust \{ gap: 4px; \}/);
    expect(m).toMatch(/\.hasat-deger \{ display: none; \}/);
  });
});

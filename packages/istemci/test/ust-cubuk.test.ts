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

describe("ilk dükkân önerisi CSS (D. Ek)", () => {
  const dk = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "harita", "dukkan-panel.css"), "utf8");
  const mp = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "harita", "mulk-panel.css"), "utf8");
  it("kart, kapat düğmesi 44 px ve stok satırı durumları tanımlı", () => {
    expect(dk).toMatch(/\.dk-oneri \{/);
    expect(dk).toMatch(/\.dk-oneri-kapat \{[^}]*width: 44px; height: 44px/);
    expect(dk).toMatch(/\.dk-stok\[data-durum="eksik"\]/);
    expect(dk).toMatch(/\.dk-oneri\[data-durum="kapali"\] \{ display: none; \}/);
  });
  it("İşletmem düğmesinde öneri noktası --birincil (yuzey üstünde ≥ 4,5:1, tasarim.test çifti)", () => {
    expect(mp).toMatch(/\.isletme-dugme\[data-oneri="1"\]::after \{[^}]*background: var\(--birincil\)/);
  });
});

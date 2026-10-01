/**
 * İçerik açıklama ve ipucu metinleri: kimlikler kimlik listesinde, her metin tek cümle (≤ 170 karakter), nokta ile biter,
 * büyük harfli sözcük ve para tutarı yok.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ICERIK_METIN, icerikMetni } from "../src/tasarim/icerik-metin";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "veri", "icerik");
interface Liste {
  mallar: Array<{ id: string }>;
  yapilar: { tesisTurleri: Array<{ id: string }>; ekYapilar: Array<{ id: string }>; kamuYapilari: Array<{ id: string }> };
  dukkanTurleri: Array<{ id: string }>;
}
const liste = JSON.parse(readFileSync(join(KOK, "kimlik-listesi.json"), "utf8")) as Liste;
const ids = (l: Array<{ id: string }>): Set<string> => new Set(l.map((x) => x.id));

describe("içerik metinleri", () => {
  it("mal, yapı ve dükkân kimlikleri kimlik listesinde", () => {
    const mal = ids(liste.mallar);
    const yapi = new Set([...ids(liste.yapilar.tesisTurleri), ...ids(liste.yapilar.ekYapilar), ...ids(liste.yapilar.kamuYapilari)]);
    const dukkan = ids(liste.dukkanTurleri);
    for (const k of Object.keys(ICERIK_METIN.mal)) expect(mal.has(k), `mal ${k}`).toBe(true);
    for (const k of Object.keys(ICERIK_METIN.yapi)) expect(yapi.has(k), `yapı ${k}`).toBe(true);
    for (const k of Object.keys(ICERIK_METIN.dukkan)) expect(dukkan.has(k), `dükkân ${k}`).toBe(true);
  });

  it("her metin kısa, noktayla biten, büyük harfli sözcüksüz ve tutarsız", () => {
    for (const [tur, tablo] of Object.entries(ICERIK_METIN))
      for (const [k, m] of Object.entries(tablo))
        for (const [alan, t] of Object.entries(m)) {
          const ad = `${tur}.${k}.${alan}`;
          expect(t.length, ad).toBeLessThanOrEqual(170);
          expect(t, ad).toMatch(/[.!?]$/);
          expect(t, ad).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,}\b/);
          expect(t, ad).not.toMatch(/₺\s*\d|\d\s*₺/);
          expect(t.charAt(0), ad).toBe(t.charAt(0).toLocaleUpperCase("tr"));
        }
  });

  it("icerikMetni bilinmeyen kimlikte undefined verir", () => {
    expect(icerikMetni("mal", "tahil")?.aciklama).toMatch(/ham madde/);
    expect(icerikMetni("mal", "yok_boyle_mal")).toBeUndefined();
  });
});

/**
 * Yerleş ilçe kartı (sözleşme "H. Ek"; saf dizge): satır sırası (ad, neden, bilinen yanı, açılış, doluluk, ayrılmış, rozet), satırı olmayan
 * veri için satırın HİÇ yazılmaması, ayrılmış hücre dört durumu (sayı yok), rozet, doluluk çubuğu %0, açılışta Çiftlik ve metin tablosu kuralları.
 */
import { describe, expect, it } from "vitest";
import { yerlesKartiHtml } from "../src/arayuz/yerles-ekrani";
import { YERLES_METIN, yerlesMetni, yerlesMetniHtml } from "../src/arayuz/yerles-metin";
import { ILCE_METIN } from "../src/tasarim/ilce-metin";
import { ACILIS, ACILIS_SIRASI, AYRILMIS_BOL_ESIGI, ayrilmisDurumu, durumRozeti, YERLES_ADAYLARI } from "../src/harita/yerles";
import type { AdayDurumu } from "../src/harita/yerles";

const BUYUK_SOZCUK = /\b[A-ZÇĞİÖŞÜ]{2,}\b/;
const durum = (ilce: string, ek: Partial<AdayDurumu> = {}): AdayDurumu => ({
  aday: YERLES_ADAYLARI.find((a) => a.ilce === ilce)!,
  ad: "Gebze",
  il: "Kocaeli",
  doluluk: 0.12,
  ayrilmis: 40,
  ayakIzi: 2,
  izgara: true,
  sunucuda: true,
  ...ek,
});
const metinOnly = (h: string): string => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("açılış: üç açılışta da önerilen ilk yapı çiftlik", () => {
  it("ACILIS yalnız yapı taşır (ad ve özet metin tablolarında); hepsi çiftlik", () => {
    for (const a of ACILIS_SIRASI) expect(ACILIS[a], a).toEqual({ yapi: "ciftlik" });
  });

  it("aday ilçelerin hepsi sözlükte (neden ve bilinen yanı satırı boş kalmaz)", () => {
    for (const a of YERLES_ADAYLARI) expect(ILCE_METIN[a.ilce], a.ilce).toBeDefined();
  });
});

describe("ayrılmış hücre ve rozet", () => {
  it("dört durum, SAYI YOK: bilinmiyor → satır yok; 0 → yok; ayak izinden az → az; yeten → var; ≥ eşik → bol", () => {
    expect(ayrilmisDurumu({ ayrilmis: null, ayakIzi: 2 })).toBeNull();
    expect(ayrilmisDurumu({ ayrilmis: 0, ayakIzi: 2 })).toBe("yok");
    expect(ayrilmisDurumu({ ayrilmis: 1, ayakIzi: 2 })).toBe("az");
    expect(ayrilmisDurumu({ ayrilmis: 2, ayakIzi: 2 })).toBe("var");
    expect(ayrilmisDurumu({ ayrilmis: AYRILMIS_BOL_ESIGI - 1, ayakIzi: 2 })).toBe("var");
    expect(ayrilmisDurumu({ ayrilmis: AYRILMIS_BOL_ESIGI, ayakIzi: 2 })).toBe("bol");
    expect(ayrilmisDurumu({ ayrilmis: 5 })).toBe("var"); // ayak izi bilinmiyorsa 1
    expect(AYRILMIS_BOL_ESIGI).toBe(100);
  });

  it("rozet: ızgara yoksa yakında, sunucuda yoksa açık değil, aksi hâlde hazır", () => {
    expect(durumRozeti({ izgara: false, sunucuda: true })).toBe("izgara_yakinda");
    expect(durumRozeti({ izgara: false, sunucuda: false })).toBe("izgara_yakinda");
    expect(durumRozeti({ izgara: true, sunucuda: false })).toBe("sunucuda_yok");
    expect(durumRozeti({ izgara: true, sunucuda: null })).toBe("hazir");
    expect(durumRozeti({ izgara: true, sunucuda: true })).toBe("hazir");
  });
});

describe("kart HTML", () => {
  it("satır sırası: ad, neden, bilinen yanı, açılış, doluluk, ayrılmış, rozet", () => {
    const h = yerlesKartiHtml(durum("tr_41_gebze"), true);
    const sira = ["yr-ad", "yr-neden", "yr-imza", "yr-onerilen", "yr-doluluk", "yr-ayrilmis", "yr-durum"].map((s) => h.indexOf(`class="${s}`));
    expect(sira.every((i) => i >= 0), sira.join()).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
    expect(h).toContain('role="radio" aria-checked="true" data-ilce="tr_41_gebze"');
    expect(h).toContain("Kocaeli&#39;nin en kalabalık ilçesi; sanayi için iyi bir yer.");
    expect(h).toContain("Bilinen yanı: Gebze bayram çöreği");
    expect(h).toContain("Açılış önerisi: <b>Sanayi</b>");
    expect(h).toContain("Çiftlikle başla; sonra parça fabrikası kur, çelikten makine parçası üret.");
    expect(h).toContain("<b>%12</b> dolu");
    expect(h).toContain("Yeni oyunculara ayrılmış arsa var");
    expect(h).toContain('<span class="yr-durum iyi">Hazır arsalar var</span>');
  });

  it("eski dil yok: 'İmza', hücre sayısı, 'ilk ... için yeter', 'sunucu'", () => {
    const t = metinOnly(yerlesKartiHtml(durum("tr_41_gebze", { ayrilmis: 4000, sunucuda: false }), false));
    for (const eski of ["İmza", "için yeter", "sunucuda", "4.000", "4000", "hücre yeni oyunculara"]) expect(t.includes(eski), eski).toBe(false);
    expect(t).toContain("Bu ilçe henüz açık değil");
  });

  it("satırı olmayan veri hiç yazılmaz: ızgarasız ilçede doluluk, bilinmeyen ayrılmışta ayrılmış, sözlükte olmayanda neden ve bilinen yanı", () => {
    const g = yerlesKartiHtml(durum("tr_41_gebze", { izgara: false, ayrilmis: null }), false);
    expect(g).not.toContain("yr-doluluk");
    expect(g).not.toContain("yr-ayrilmis");
    expect(g).not.toContain("Doluluk bilinmiyor");
    expect(g).toContain('<span class="yr-durum zayif">Arsa ızgarası yakında: yalnız gezebilirsin</span>');
    // sözlükte olmayan ilçe (yedek aday): neden ve bilinen yanı satırı yok, eski küratörlü cümle kullanılmaz
    const aday = { ...YERLES_ADAYLARI[0]!, ilce: "tr_00_olmayan", neden: "ESKI KURATORLU NEDEN", imza: "ESKI IMZA" };
    const y = yerlesKartiHtml({ ...durum("tr_41_gebze"), aday }, false);
    expect(y).not.toContain("yr-neden");
    expect(y).not.toContain("yr-imza");
    expect(y).not.toContain("ESKI");
    // ızgara var, doluluk bilinmiyor
    expect(yerlesKartiHtml(durum("tr_41_gebze", { doluluk: null }), false)).toContain('<span class="yr-doluluk yok">Doluluk bilinmiyor</span>');
  });

  it("doluluk çubuğu: %0'da genişlik 0, küçük dolulukta en az %2", () => {
    expect(yerlesKartiHtml(durum("tr_41_gebze", { doluluk: 0 }), false)).toContain('<i style="width:0%"></i>');
    expect(yerlesKartiHtml(durum("tr_41_gebze", { doluluk: 0.004 }), false)).toContain('<i style="width:2%"></i>');
    expect(yerlesKartiHtml(durum("tr_41_gebze", { doluluk: 0.5 }), false)).toContain('<i style="width:50%"></i>');
  });

  it("dükkân düzeyi: G7 açıkken neden ve açılış cümlesi dükkânlı sürüm; G6'da dükkân sözü yok", () => {
    const g6 = metinOnly(yerlesKartiHtml(durum("tr_41_gebze", { aday: { ...YERLES_ADAYLARI.find((a) => a.ilce === "tr_41_gebze")!, acilis: "pazar" } }), false));
    expect(g6.toLowerCase().includes("dükkân")).toBe(false);
    const g7 = yerlesKartiHtml(durum("tr_41_darica", { aday: { ...YERLES_ADAYLARI[0]!, ilce: "tr_41_darica", acilis: "pazar" } }), false, { g7: true });
    expect(g7).toContain("dükkân");
  });

  it("kaçış: ilçe adı ve il HTML olarak güvenli", () => {
    const h = yerlesKartiHtml(durum("tr_41_gebze", { ad: '<img onerror="x">', il: "&il" }), false);
    expect(h).not.toContain("<img");
    expect(h).toContain("&lt;img");
    expect(h).toContain("&amp;il");
  });
});

describe("metin tablosu", () => {
  it("anahtarlar yerles.*; büyük harfli sözcük, ₺ ve TL yok; yer tutucular doldurulur", () => {
    for (const [k, v] of Object.entries(YERLES_METIN)) {
      expect(k.startsWith("yerles."), k).toBe(true);
      expect(BUYUK_SOZCUK.test(v), `${k}: ${v}`).toBe(false);
      expect(/₺|\bTL\b/.test(v), k).toBe(false);
    }
    expect(yerlesMetni("yerles.kart.acilis", { ad: "Tarım" })).toBe("Açılış önerisi: Tarım");
    expect(yerlesMetni("yerles.acilis.not", { ad: "Sanayi", cumle: "Çiftlikle başla." })).toBe("Bu yalnız bir öneri; istediğin zaman başka yöne dönebilirsin.");
    expect(yerlesMetniHtml("yerles.acilis.not", { ad: "<b>Sanayi</b>", cumle: "x" })).toBe("Bu yalnız bir öneri; istediğin zaman başka yöne dönebilirsin.");
    expect(yerlesMetniHtml("yerles.kart.acilis", { ad: "<b>&</b>" })).toBe("Açılış önerisi: <b>&</b>");
  });
});

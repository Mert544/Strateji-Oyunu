import { describe, expect, it } from "vitest";
import { DUKKAN_METIN, DUKKAN_RET_ANAHTARI, dukkanMetni } from "../src/harita/dukkan-metin";
import type { DukkanMetinAnahtari } from "../src/harita/dukkan-metin";

const anahtarlar = Object.keys(DUKKAN_METIN) as DukkanMetinAnahtari[];

describe("dükkân metin tablosu (T1 son tablosu, A1 anahtarları)", () => {
  it("D0, D1, D5, D8 ve Defter üst kartı anahtarları var", () => {
    for (const a of [
      "dukkan.D0.oneri_baslik",
      "dukkan.D0.oneri_govde",
      "dukkan.D0.oneri_dugme",
      "dukkan.D0.oneri_kapat",
      "dukkan.D0.oneri_not",
      "dukkan.D0.oneri_isaret_etiket",
      "dukkan.D1.isletmem_bos",
      "dukkan.D1.satir_insaat",
      "dukkan.D5.yuva_stoksuz",
      "dukkan.D5.yuva_bekleme",
      "dukkan.D8.ilk_satis",
      "dukkan.D3.pencere_yeter",
      "defter.ust.baslik",
      "defter.ust.atla",
      "defter.ust.atla_etiket",
    ] as const)
      expect(DUKKAN_METIN[a], a).toBeTruthy();
    expect(anahtarlar.length).toBeGreaterThan(150);
  });

  it("büyük harfli sözcük yok (cümle başı ve ad harfleri hariç); yer tutucu adları ASCII küçük harf", () => {
    for (const a of anahtarlar) {
      const m = DUKKAN_METIN[a];
      expect(/\b[A-ZÇĞİÖŞÜ]{2,}\b/.test(m), `${a}: ${m}`).toBe(false);
      for (const y of m.match(/\{[^}]*\}/g) ?? []) expect(y, `${a}: ${y}`).toMatch(/^\{[a-z_]+\}$/);
    }
  });

  it("şablonda ₺ yok: para yer tutucunun değeridir (para()/paraMili() çıktısı)", () => {
    for (const a of anahtarlar) expect(DUKKAN_METIN[a].includes("₺"), a).toBe(false);
  });

  it("yer tutucular tek yerde doldurulur; verilmeyen olduğu gibi kalır", () => {
    expect(dukkanMetni("dukkan.D2.ilce_sayac", { n: 1, ilce_enfazla: 2 })).toBe("Bu ilçede dükkânın: 1 / 2");
    expect(dukkanMetni("dukkan.D1.satir_insaat", { kalan: "40 dk" })).toBe("İnşa sürüyor · 40 dk");
    expect(dukkanMetni("dukkan.D2.ilce_sayac")).toBe("Bu ilçede dükkânın: {n} / {ilce_enfazla}");
  });

  it("ret kodları anahtara çevrilir (belirsiz DUK-19 yok: üç ileti bağlama göre seçilir)", () => {
    expect(DUKKAN_RET_ANAHTARI["DUK-18"]).toBe("dukkan.D5.degisim_cok_sik");
    expect(DUKKAN_RET_ANAHTARI["DUK-00"]).toBe("dukkan.D1.kapali");
    expect(DUKKAN_RET_ANAHTARI["MRK-12"]).toBe("dukkan.D7.ad_yasakli");
    expect(DUKKAN_RET_ANAHTARI["MRK-10"]).toBe("dukkan.D7.simge_renk");
    expect(DUKKAN_RET_ANAHTARI["DUK-19"]).toBeUndefined();
    for (const a of Object.values(DUKKAN_RET_ANAHTARI)) expect(DUKKAN_METIN[a], a).toBeTruthy();
  });

  it("T1 kararları: boş raf notu, kısa yuva nedenleri, Defter kartı başlığı", () => {
    expect(DUKKAN_METIN["dukkan.D0.oneri_not"]).toBe("Başlangıç gıdanı rafın için sakla.");
    expect(DUKKAN_METIN["dukkan.D5.yuva_stoksuz"]).toBe("stoğun yok");
    expect(DUKKAN_METIN["dukkan.D5.yuva_kampanya_bitti"]).toBe("kampanya bitti");
    expect(DUKKAN_METIN["defter.ust.baslik"]).toBe("Sıradaki adım");
  });
});

/**
 * Bekleyen odak (P13 f4:714): kabuk çizimi erteleyebilir (fareyle basılıyken `icerikCiz` bekler); hedef öğe eylem döndüğünde DOM'da yoktur. Odak ertelenen çizimden SONRA, çizim yapıldığı anda verilir;
 * bir kez verilir; hedef yokken bekler; süre dolunca unutulur. DOM yok: sahte kök (seçici -> öğe) ve sahte saat.
 */
import { describe, expect, it } from "vitest";
import { BekleyenOdak } from "../src/harita/bekleyen-odak";

function dunya() {
  let t = 0;
  const dom = new Map<string, { odak: number; ad: string }>();
  const kok = { querySelector: (q: string) => { const e = dom.get(q); return e ? { focus: () => void e.odak++ } : null; } };
  const kur = (omur?: number) => new BekleyenOdak(() => t, omur);
  return { dom, kok, kur, ilerle: (ms: number) => void (t += ms) };
}

describe("BekleyenOdak", () => {
  it("ertelenen çizim: istek yazılır, çizim ertelenirken (hedef DOM'da yok) odak verilmez; çizim yapılınca o anda verilir", () => {
    const w = dunya();
    const o = w.kur();
    o.iste("#pz-oran", w.kok); // fareyle tıklandı: eylem döndü, kabuk çizimi erteledi, alan yok
    expect(o.bekliyor).toBe(true);
    // ertelenmiş çizim yokken (cizildi çağrılmaz) hiçbir şey olmaz; hedef henüz yoksa çizim gelse bile bekler
    o.cizildi(w.kok);
    expect(o.bekliyor).toBe(true);
    // pointerup sonrası çizim yapıldı: alan DOM'da
    w.dom.set("#pz-oran", { odak: 0, ad: "alan" });
    o.cizildi(w.kok);
    expect(w.dom.get("#pz-oran")!.odak).toBe(1);
    expect(o.bekliyor).toBe(false);
  });

  it("bir kez verilir: sonraki çizimler odağı yeniden çalmaz", () => {
    const w = dunya();
    const o = w.kur();
    w.dom.set("#pz-oran", { odak: 0, ad: "alan" });
    o.iste("#pz-oran");
    o.cizildi(w.kok);
    o.cizildi(w.kok);
    o.cizildi(w.kok);
    expect(w.dom.get("#pz-oran")!.odak).toBe(1);
  });

  it("hedef zaten DOM'daysa hemen denenir, ama istek çizim görene kadar kalır (eski düğüm yeniden kurulabilir: hızlı seçim)", () => {
    const w = dunya();
    const o = w.kur();
    const eski = { odak: 0, ad: "eski" };
    w.dom.set("#pz-oran", eski);
    o.iste("#pz-oran", w.kok);
    expect(eski.odak).toBe(1);
    expect(o.bekliyor).toBe(true);
    const yeni = { odak: 0, ad: "yeni" }; // ertelenen çizim alanı yeniden kurdu
    w.dom.set("#pz-oran", yeni);
    o.cizildi(w.kok);
    expect(yeni.odak).toBe(1);
    expect(o.bekliyor).toBe(false);
  });

  it("süre dolunca istek unutulur (oyuncu başka yere geçmiş olabilir: odak çalınmaz); iptal de unutturur", () => {
    const w = dunya();
    const o = w.kur(3000);
    o.iste("#pz-oran");
    w.ilerle(3001);
    w.dom.set("#pz-oran", { odak: 0, ad: "alan" });
    o.cizildi(w.kok);
    expect(w.dom.get("#pz-oran")!.odak).toBe(0);
    expect(o.bekliyor).toBe(false);
    const p = w.kur();
    p.iste("#pz-oran");
    p.iptal();
    p.cizildi(w.kok);
    expect(w.dom.get("#pz-oran")!.odak).toBe(0);
  });

  it("yeni istek öncekinin yerine geçer (form kapanınca satır düğmesi)", () => {
    const w = dunya();
    const o = w.kur();
    o.iste("#pz-oran");
    o.iste('[data-eylem="pazar-ac"][data-mal="tahil"]');
    w.dom.set("#pz-oran", { odak: 0, ad: "alan" });
    w.dom.set('[data-eylem="pazar-ac"][data-mal="tahil"]', { odak: 0, ad: "dugme" });
    o.cizildi(w.kok);
    expect(w.dom.get("#pz-oran")!.odak).toBe(0);
    expect(w.dom.get('[data-eylem="pazar-ac"][data-mal="tahil"]')!.odak).toBe(1);
  });

  it("negatif kontrol: eski davranış (hemen dene, bir daha deneme) ertelenen çizimde odağı kaybeder", () => {
    const w = dunya();
    const hemen = (q: string): void => void w.kok.querySelector(q)?.focus(); // setTimeout(focus, 0) eşdeğeri: çizim ertelenmişken hedef yok
    hemen("#pz-oran");
    w.dom.set("#pz-oran", { odak: 0, ad: "alan" }); // çizim sonradan yapıldı
    expect(w.dom.get("#pz-oran")!.odak).toBe(0);
  });
});

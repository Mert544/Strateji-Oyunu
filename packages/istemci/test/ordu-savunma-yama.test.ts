/** Tam çizim ertelenince mevcut DOM düğümlerinde kart/duruş yamalanır; form korunur. */
import { afterEach, expect, it, vi } from "vitest";
import { miniVeriyiYukle } from "@bolge/veri";
import { icerikTablosu } from "../src/komut/tablo";
import { OrduPaneli } from "../src/harita/ordu-panel";
import type { OrduBolgesi } from "../src/harita/ordu-panel";

afterEach(() => vi.unstubAllGlobals());

it("odaktaki üretim girdisini korurken sunucunun kartı ve duruşu yenilenir; tam/yarım ikmal %100/%50 görünür", () => {
  // Mevcut BekleyenOdak testleri gibi yalnız kullanılan DOM yüzeyleri sağlanır; tarayıcı kanıtı değildir.
  const input = { value: "12", selectionStart: 1, selectionEnd: 2, focus: vi.fn() };
  const belge = { activeElement: input };
  vi.stubGlobal("document", belge);
  const slot = { innerHTML: "" };
  const hamDeger = { textContent: "100" };
  const ham = { hidden: false, querySelector: (q: string) => q === "dd" ? hamDeger : null };
  const ikmal = { hidden: false, innerHTML: "" };
  const uyari = { innerHTML: "" };
  const dugmeler = ["normal", "savunma", "geri_cekil"].map((durus) => ({
    dataset: { durus }, disabled: false, aria: "false",
    setAttribute(k: string, v: string) { if (k === "aria-pressed") this.aria = v; },
  }));
  const elemanlar = new Map<string, unknown>([
    ["[data-ordu-savunma]", slot], ["[data-ordu-ham-fallback]", ham],
    ["[data-ordu-ikmal-fallback]", ikmal], ["[data-ordu-ikmal-uyari]", uyari],
    ["input[data-ordu-adet]", input],
  ]);
  const panel = {
    dataset: { orduBolge: "sn_m_ova#a" },
    // Tam panel çizimi formu kaybettirir; bu yama köke innerHTML yazmamalıdır.
    set innerHTML(_: string) { throw new Error("Ordu yaması tüm paneli yeniden çizdi"); },
    querySelector: (q: string) => elemanlar.get(q) ?? null,
    querySelectorAll: (q: string) => q === "button[data-ordu-eylem='durus']" ? dugmeler : [],
  };
  const kok = { querySelectorAll: (q: string) => q === "[data-ordu-bolge]" ? [panel] : [] } as unknown as ParentNode;
  const b: OrduBolgesi = {
    id: "sn_m_ova#a", ad: "Ova", birlikler: new Map([["piyade_tumeni", 1]]), stoklar: new Map(), kapasite: 12,
    ordugahSayisi: 1, ikmalPpm: 1_000_000, durus: "normal", partiler: [],
  };
  const veri = miniVeriyiYukle();
  const p = new OrduPaneli({ ic: icerikTablosu(veri.icerik, veri.param), durum: () => ({ simZamani: 0, erkenOyunPpm: 1_000_000, teknolojiler: new Set(), bolgeler: [b] }), komut: async () => ({ tamam: true }), degisti: () => {} });
  expect(p.yamala(kok)).toBe(true);
  expect(slot.innerHTML).toContain("bilinmiyor");
  b.savunma = { hamGuc: 100, ikmalPpm: 1_000_000, araziPpm: 1_000_000, durusPpm: 1_000_000, guc: 777 };
  // Toplam istemcide yeniden hesaplanmaz; çarpanlardan çıkmayacak değer doğrudan gösterilir.
  expect(p.yamala(kok)).toBe(true);
  expect(slot.innerHTML).toContain("<dd>777</dd>");
  expect(slot.innerHTML).toContain("%100");
  expect(ham.hidden).toBe(true);
  expect(ikmal.hidden).toBe(true);
  b.durus = "savunma";
  b.savunma = { ...b.savunma, ikmalPpm: 500_000, durusPpm: 1_300_000, guc: 65 };
  expect(p.yamala(kok)).toBe(true);
  expect(slot.innerHTML).toContain("%50");
  expect(slot.innerHTML).toContain("<dd>65</dd>");
  expect(dugmeler.map((d) => [d.dataset.durus, d.aria, d.disabled])).toEqual([
    ["normal", "false", false], ["savunma", "true", true], ["geri_cekil", "false", false],
  ]);
  expect(uyari.innerHTML).toContain("İkmal eksik");
  b.durus = "geri_cekil";
  b.savunma = { ...b.savunma, durusPpm: 0, guc: 0 };
  expect(p.yamala(kok)).toBe(true);
  expect(slot.innerHTML).toContain("<dd>0</dd>");
  expect(dugmeler[2]).toMatchObject({ aria: "true", disabled: true });
  expect(belge.activeElement).toBe(input);
  expect(input).toMatchObject({ value: "12", selectionStart: 1, selectionEnd: 2 });
  expect(input.focus).not.toHaveBeenCalled();
});

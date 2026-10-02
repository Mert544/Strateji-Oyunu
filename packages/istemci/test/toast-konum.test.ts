/** Toast konumu (B-tost): telefonda toast açık kartların, alt sayfanın ve "geri alma" şeridinin üstüne oturur, örtüşme olmaz. DOM yok: küçük sahte belge. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOAST_ARALIK, toastAlt } from "../src/tasarim/toast-konum";

interface Kutu { top: number; bottom: number; left: number; right: number; height: number; width: number }
const kutu = (top: number, bottom: number, left = 0, right = 390): Kutu => ({ top, bottom, left, right, height: bottom - top, width: right - left });
interface SahteEleman { kutu: Kutu; hidden?: boolean }

function belge(elemanlar: Record<string, SahteEleman>, siniflar: string[], masaustu = false): HTMLElement {
  const eleman = (e: SahteEleman): unknown => ({ hidden: e.hidden ?? false, getBoundingClientRect: () => e.kutu });
  vi.stubGlobal("document", {
    body: { classList: { contains: (c: string) => siniflar.includes(c) } },
    querySelector: (sec: string) => (elemanlar[sec] ? eleman(elemanlar[sec]) : null),
  });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: masaustu }) });
  vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
  // kapsayıcı: ekran 844 yüksek, toast tek satır
  return { offsetParent: { getBoundingClientRect: () => kutu(0, 844) }, getBoundingClientRect: () => kutu(700, 744, 12, 378) } as unknown as HTMLElement;
}

afterEach(() => vi.unstubAllGlobals());

describe("toast konumu (telefon)", () => {
  it("engel yoksa varsayılan (null)", () => {
    expect(toastAlt(belge({}, []))).toBeNull();
  });
  it("açık alt sayfa: toast sayfanın 12 px üstünde", () => {
    const k = belge({ "#panel": { kutu: kutu(320, 844) } }, ["isletme-acik"]);
    expect(toastAlt(k)).toBe(844 - 320 + TOAST_ARALIK);
  });
  it("geri alma şeridi alt sayfanın üstündeyse toast şeridin 12 px üstüne oturur, şeride binmez", () => {
    const k = belge({ "#panel": { kutu: kutu(320, 844) }, "#yapi-geri": { kutu: kutu(246, 306, 8, 382) } }, ["isletme-acik"]);
    expect(toastAlt(k)).toBe(844 - 246 + TOAST_ARALIK);
  });
  it("şerit gizliyse (hidden) yalnız alt sayfa sayılır", () => {
    const k = belge({ "#panel": { kutu: kutu(320, 844) }, "#yapi-geri": { kutu: kutu(246, 306), hidden: true } }, ["isletme-acik"]);
    expect(toastAlt(k)).toBe(844 - 320 + TOAST_ARALIK);
  });
  it("masaüstünde şerit sayılmaz (toast sabit köşede)", () => {
    expect(toastAlt(belge({ "#yapi-geri": { kutu: kutu(246, 306) } }, [], true))).toBeNull();
  });
});

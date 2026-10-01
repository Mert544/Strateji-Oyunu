/**
 * Maliyet kartı erişilebilirliği (T1 erişim turu 1, 2; tek birincil kuralı): kapalı onay düğmesi `aria-disabled` + neden bağı, kalıcı
 * `role=status` neden bölgesi (yalnız metin değişince yazılır), "Yapı kur" düğmesinin basılı sayılması. DOM yok: küçük sahte öğe.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { dugmeBasili, KartDurumu, kapaliDugmeOznitelikleri, NEDEN_KIMLIGI } from "../src/harita/kart-durum";

class SahteOge {
  id = "";
  className = "";
  hidden = false;
  dataset: Record<string, string> = {};
  oznitelik = new Map<string, string>();
  yazimlar = 0;
  kaldirildi = 0;
  degisen: SahteOge | null = null;
  private metin = "";
  get textContent(): string {
    return this.metin;
  }
  set textContent(v: string) {
    this.metin = v;
    this.yazimlar++;
  }
  setAttribute(a: string, v: string): void {
    this.oznitelik.set(a, v);
  }
  remove(): void {
    this.kaldirildi++;
  }
}

afterEach(() => vi.unstubAllGlobals());

function kur(): KartDurumu {
  vi.stubGlobal("document", { createElement: () => new SahteOge() });
  return new KartDurumu();
}

describe("kalıcı durum bölgesi", () => {
  it("tek role=status bölgesi, kimlikli, başta gizli", () => {
    const k = kur();
    const el = k.el as unknown as SahteOge;
    expect(el.id).toBe(NEDEN_KIMLIGI);
    expect(el.oznitelik.get("role")).toBe("status");
    expect(el.oznitelik.get("aria-live")).toBe("polite");
    expect(el.className).toBe("yk-uyari");
    expect(el.hidden).toBe(true);
  });

  it("metin YALNIZ değişince yazılır (aynı neden kart yenilemesinde yeniden okunmaz); boşsa gizlenir", () => {
    const k = kur();
    const el = k.el as unknown as SahteOge;
    k.yaz("Aynı anda en çok 2 inşaat sürebilir");
    expect(el.textContent).toBe("Aynı anda en çok 2 inşaat sürebilir");
    expect(el.hidden).toBe(false);
    const n = el.yazimlar;
    for (let i = 0; i < 5; i++) k.yaz("Aynı anda en çok 2 inşaat sürebilir");
    expect(el.yazimlar).toBe(n);
    k.yaz("Hazinede yeterli para yok");
    expect(el.yazimlar).toBe(n + 1);
    k.yaz(null);
    expect(el.textContent).toBe("");
    expect(el.hidden).toBe(true);
  });

  it("yerleştirme: yuva varsa öğe yuvanın yerine geçer, yoksa DOM'dan ayrılır", () => {
    const k = kur();
    const yuva = { replaceWith: vi.fn() };
    k.yerlestir({ querySelector: (s: string) => (s === "[data-yk-neden-yer]" ? yuva : null) } as unknown as HTMLElement);
    expect(yuva.replaceWith).toHaveBeenCalledWith(k.el);
    k.yerlestir({ querySelector: () => null } as unknown as HTMLElement);
    expect((k.el as unknown as SahteOge).kaldirildi).toBe(1);
  });
});

describe("kapalı onay düğmesi ve basılı düğme", () => {
  it("hazırsa öznitelik yok; değilse aria-disabled (disabled DEĞİL) ve neden varsa aria-describedby", () => {
    expect(kapaliDugmeOznitelikleri(true, true)).toBe("");
    expect(kapaliDugmeOznitelikleri(false, true)).toBe(`aria-disabled="true" aria-describedby="${NEDEN_KIMLIGI}"`);
    expect(kapaliDugmeOznitelikleri(false, false)).toBe('aria-disabled="true"');
    expect(kapaliDugmeOznitelikleri(false, true)).not.toContain(" disabled");
  });

  it("'Yapı kur' basılı: yapı kartı ya da arsa şeridi açıkken; ikisi de kapalıysa değil (ekranda tek dolu birincil)", () => {
    expect(dugmeBasili(true, false)).toBe(true);
    expect(dugmeBasili(false, true)).toBe(true);
    expect(dugmeBasili(true, true)).toBe(true);
    expect(dugmeBasili(false, false)).toBe(false);
  });
});

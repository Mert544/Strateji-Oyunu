/** G6/G8: L3 yöntem simgesi (sahte GeoJSON özellikleriyle) ve yöntem eşlemeleri. */
import { describe, expect, it } from "vitest";
import { yontemSimgeKatmani } from "../src/harita/stil";
import { YONTEM_SIMGELERI, yontemSimgesi } from "../src/tasarim/yontem";
import { SILUETLI_YONTEMLER } from "../src/yuru/siluet";

/** Katı değerlendirici (get, has, all, >=, concat): olmayan alanı `get` ile okumak HATA. */
function degerle(e: unknown, o: Record<string, unknown>): unknown {
  if (!Array.isArray(e)) return e;
  const [op, ...a] = e as [string, ...unknown[]];
  switch (op) {
    case "get": {
      if (!((a[0] as string) in o)) throw new Error(`olmayan alan okundu: ${a[0] as string}`);
      return o[a[0] as string];
    }
    case "has": return (a[0] as string) in o;
    case "all": return a.every((x) => degerle(x, o));
    case ">=": return (degerle(a[0], o) as number) >= (degerle(a[1], o) as number);
    case "concat": return a.map((x) => String(degerle(x, o))).join("");
    default: throw new Error(`desteklenmeyen işlem: ${op}`);
  }
}

describe("yöntem simgeleri", () => {
  it("silüetli her yöntemin simgesi var; eşlemesiz yöntem null", () => {
    for (const y of SILUETLI_YONTEMLER) expect(yontemSimgesi(y), y).toBeTruthy();
    expect(Object.keys(YONTEM_SIMGELERI).sort()).toEqual([...SILUETLI_YONTEMLER].sort());
    expect(yontemSimgesi("standart_gida_isleme")).toBeNull();
  });
  it("katman: yalnız yöntemi bilinen bitmiş yapıda; başkasının yapısında (y yok) hata vermez ve çizilmez", () => {
    const k = yontemSimgeKatmani(() => "#000000") as unknown as { filter: unknown; layout: Record<string, unknown> };
    const baskasi = { c: "#123456", a: 3 }; // `y` hiç yok
    const benimInsaat = { c: "#123456", a: 1, y: "degirmen" };
    const benim = { c: "#123456", a: 3, y: "ekmek_firini" };
    expect(degerle(k.filter, baskasi)).toBe(false);
    expect(degerle(k.filter, benimInsaat)).toBe(false);
    expect(degerle(k.filter, benim)).toBe(true);
    expect(degerle(k.layout["icon-image"], benim)).toBe("yontem-ekmek_firini");
  });
});

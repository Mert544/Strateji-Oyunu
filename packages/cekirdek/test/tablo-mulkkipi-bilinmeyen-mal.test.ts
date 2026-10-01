/**
 * G6-3: `icerikTablosu` (ekonomi/tablo.ts) `mulkKipi` yöntemi içerikte olmayan bir mala başvuruyorsa (dondurulmuş eski içerik: P3 öncesi 14 mal) satırını BOŞ kurar;
 * kısmi satır yoktur. `mulkKipi` olmayan yöntemde bilinmeyen mal eskisi gibi hata verir (negatif kontrol). Gerçek veride bilinmeyen mal `dogrulaIcerik`te reddedilir.
 */
import { miniVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { icerikTablosu } from "../src/ekonomi/tablo";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { mulkVeriTam } from "./mulk-yardimci";

/** `gida_fabrikasi` listesinin sonuna, içerikte olmayan `yok_mal`a başvuran bir yöntem ekler (`mulkKipi` ya da bayraksız). */
function bilinmeyenMalli(v: CekirdekVeriPaketi, mulkKipi: boolean): string {
  const id = mulkKipi ? "yok_malli_mulk" : "yok_malli_bayraksiz";
  const y = structuredClone(v.icerik.yontemler.find((k) => k.id === "standart_gida_isleme")!);
  y.id = id;
  y.ad = id;
  y.ciktilar = { gida: 100_000, yok_mal: 50_000 };
  y.girdiler = { tahil: 100_000 };
  if (mulkKipi) y.mulkKipi = true;
  v.icerik.yontemler.push(y);
  v.icerik.tesisTurleri.find((t) => t.id === "gida_fabrikasi")!.yontemler.push(id);
  return id;
}

describe("icerikTablosu: mulkKipi yöntemi + içerikte olmayan mal", () => {
  it("bölge kipi: derleme geçer; yöntemin satırı BOŞ (girdi, çıktı, bakım yok; kısmi satır yok); diğer yöntemler etkilenmez", () => {
    const v = miniVeriyiYukle() as CekirdekVeriPaketi;
    const id = bilinmeyenMalli(v, true);
    const ic = icerikDerle(v);
    expect(ic.mulk).toBeUndefined();
    const t = icerikTablosu(ic);
    expect(t.yontem[ic.yontemIndeks[id] as number]).toEqual({ girdi: [], cikti: [], bakim: [], isci: 0, rezerv: -1 });
    const gida = t.yontem[ic.yontemIndeks["standart_gida_isleme"] as number]!;
    expect(gida.girdi.length).toBeGreaterThan(0);
    expect(gida.cikti.length).toBeGreaterThan(0);
  });

  it("mülk kipi: dondurulmuş eski içerikte aynı (mulkKipi + bilinmeyen mal) satır BOŞ; gerçek içerikte mulkKipi yöntemler (degirmen) dolu satırdır", () => {
    const v = mulkVeriTam((x) => void bilinmeyenMalli(x, true));
    const ic = icerikDerle(v);
    expect(ic.mulk).toBeDefined();
    const t = icerikTablosu(ic);
    expect(t.yontem[ic.yontemIndeks["yok_malli_mulk"] as number]).toEqual({ girdi: [], cikti: [], bakim: [], isci: 0, rezerv: -1 });
    const degirmen = t.yontem[ic.yontemIndeks["degirmen"] as number]!;
    expect(degirmen.girdi.length).toBeGreaterThan(0); // içerikte olan mallar: satır normal kurulur
    expect(degirmen.cikti.length).toBe(2);
  });

  it("NEGATİF KONTROL: mulkKipi OLMAYAN yöntemde bilinmeyen mal eskisi gibi hata verir (iki kipte de)", () => {
    const b = miniVeriyiYukle() as CekirdekVeriPaketi;
    bilinmeyenMalli(b, false);
    expect(() => icerikTablosu(icerikDerle(b))).toThrow("ekonomi tablosu: bilinmeyen mal: yok_mal");
    const m = mulkVeriTam((x) => void bilinmeyenMalli(x, false));
    expect(() => icerikTablosu(icerikDerle(m))).toThrow("ekonomi tablosu: bilinmeyen mal: yok_mal");
  });
});

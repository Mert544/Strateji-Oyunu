/**
 * Kare: sahibine sebeke alimi (`ozel.sebeke`, isteğe bagli nesne alani, demetler buyumez; G6 sebeke, G9 faturasi icin; sartname 10.2). `[mal, mili-birim/saat]`: once elektrik
 * (`b.elektrik.sebekeMili`), sonra stoksuz tuketim (`b.sebekeTuketim`, mal sirali); yalniz > 0. Sebekesiz dunyada kare ESKI KARE ile bire bir ayni; yalniz sahibine; delta; eski sema.
 */
import { describe, expect, it } from "vitest";
import { SAAT } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { mulkSim, mulkVeriTam } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, KareDeltasiSemasi, deltaUygula, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";
import type { IlgiKaresi } from "../src/index";

function dunya(sebekeBlogu: boolean): Simulasyon {
  const v = mulkVeriTam((x) => {
    if (sebekeBlogu && x.param.mulk) x.param.mulk.sebeke = { surum: 1, mallar: [{ mal: "elektrik", tavanOraniPpm: 1_000_000 }, { mal: "yakit", tavanOraniPpm: 1_000_000 }], kasaPayiPpm: 120_000 };
  });
  const s = mulkSim(["a", "b"], v);
  s.calistirKadar(6 * SAAT);
  return s;
}
const isletme = (s: Simulasyon, o: string) => s.dunya.bolgeler.find((b) => b.merkez !== undefined && b.sahip === o) ?? (() => { throw new Error("isletme yok"); })();
const kare = (s: Simulasyon, o: string | null): IlgiKaresi => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});
const ozel = (k: IlgiKaresi, s: Simulasyon, o: string) => k.bolgeler.find((b) => b.i === s.dunya.bolgeler.indexOf(isletme(s, o)))?.ozel;

function elektrikYaz(s: Simulasyon, o: string, sebekeMili?: number): void {
  const b = isletme(s, o);
  b.elektrik = { uretimMili: 0, talepMili: 9_000, karsilanmaPpm: 1_000_000, haneKarsilanmaPpm: 1_000_000, yukPpm: 0, ...(sebekeMili !== undefined ? { sebekeMili } : {}) };
}

describe("ozel.sebeke (yalniz ekleme, istege bagli)", () => {
  it("sebekesiz dunyada ve sebeke alimi yokken alan HIC yazilmaz (kare eski kareyle ayni anahtar kumesi); sebeke blogu var ama alim yok da yok", () => {
    for (const blok of [false, true]) {
      const s = dunya(blok);
      for (const o of ["a", "b", null]) {
        const k = kare(s, o);
        expect(JSON.stringify(k), `blok=${blok} oyuncu=${o}`).not.toContain('"sebeke"');
        expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
      }
    }
    // elektrik durumu var ama sebeke 0: yazilmaz
    const s = dunya(true);
    elektrikYaz(s, "a");
    expect(JSON.stringify(kare(s, "a"))).not.toContain('"sebeke"');
  });

  it("elektrik once, sonra stoksuz mallar mal sirali; yalniz > 0; demetler [mal, mili] (2 oge); mal kimligi veri paketinden", () => {
    const s = dunya(true);
    elektrikYaz(s, "a", 7_000);
    isletme(s, "a").sebekeTuketim = { yakit: 3_000, komur: 0, abc: 1_500 };
    const o = ozel(kare(s, "a"), s, "a");
    expect(o?.sebeke).toEqual([["elektrik", 7_000], ["abc", 1_500], ["yakit", 3_000]]); // komur 0: yazilmaz
    for (const d of o?.sebeke ?? []) expect(d).toHaveLength(2);
    // Yalniz stoksuz (elektrik yok).
    const t = dunya(true);
    isletme(t, "a").sebekeTuketim = { yakit: 2_000 };
    expect(ozel(kare(t, "a"), t, "a")?.sebeke).toEqual([["yakit", 2_000]]);
  });

  it("YALNIZ sahibine: baska oyuncu ve izleyici ozel veriyi (sebeke dahil) gormez", () => {
    const s = dunya(true);
    elektrikYaz(s, "a", 7_000);
    expect(ozel(kare(s, "b"), s, "a")).toBeUndefined();
    expect(ozel(kare(s, null), s, "a")).toBeUndefined();
    for (const o of ["b", null]) expect(JSON.stringify(kare(s, o)), `oyuncu=${o}`).not.toContain('"sebeke"');
  });

  it("delta: alim baslayinca/bitince/degisince deltaUygula(a, kareFarki(a, b)) = b; delta semasi gecerli", () => {
    const s = dunya(true);
    const once = kare(s, "a");
    elektrikYaz(s, "a", 7_000);
    const iki = kare(s, "a");
    for (const [x, y] of [[once, iki]] as const) {
      const d = kareFarki(x, y);
      expect(KareDeltasiSemasi.parse(d)).toEqual(d);
      expect(deltaUygula(x, d)).toEqual(y);
    }
    isletme(s, "a").elektrik!.sebekeMili = 9_000;
    const uc = kare(s, "a");
    expect(deltaUygula(iki, kareFarki(iki, uc))).toEqual(uc);
    delete isletme(s, "a").elektrik!.sebekeMili;
    const dort = kare(s, "a");
    expect(JSON.stringify(dort)).not.toContain('"sebeke"');
    expect(deltaUygula(uc, kareFarki(uc, dort))).toEqual(dort);
  });

  it("DONDURULMUS eski sema (sebeke'yi bilmeyen; z.object bilinmeyen anahtari atar, z.tuple fazla ogeyi reddeder) yeni kareyi kabul eder ve alani atar; bicim denetlenir", () => {
    const s = dunya(true);
    elektrikYaz(s, "a", 7_000);
    isletme(s, "a").sebekeTuketim = { yakit: 3_000 };
    const k = JSON.parse(JSON.stringify(kare(s, "a"))) as IlgiKaresi;
    expect(JSON.stringify(k)).toContain('"sebeke"');
    const eskiOzel = IlgiKaresiSemasi.shape.bolgeler.element.shape.ozel.unwrap().omit({ sebeke: true });
    for (const b of k.bolgeler) {
      if (!b.ozel) continue;
      const r = eskiOzel.safeParse(b.ozel);
      expect(r.success).toBe(true);
      if (r.success) expect(JSON.stringify(r.data)).not.toContain("sebeke");
    }
    const kotu = (duz: (c: IlgiKaresi) => void): boolean => {
      const c = structuredClone(k);
      duz(c);
      return IlgiKaresiSemasi.safeParse(c).success;
    };
    const hedef = (c: IlgiKaresi) => c.bolgeler.find((b) => b.ozel?.sebeke)?.ozel as NonNullable<IlgiKaresi["bolgeler"][number]["ozel"]>;
    expect(kotu(() => undefined)).toBe(true);
    expect(kotu((c) => { (hedef(c).sebeke?.[0] as unknown[]).push(1); })).toBe(false); // demete oge eklenemez
    expect(kotu((c) => { (hedef(c).sebeke?.[0] as unknown[])[1] = 1.5; })).toBe(false);
    expect(kotu((c) => { (hedef(c).sebeke?.[0] as unknown[])[0] = 5; })).toBe(false);
  });
});

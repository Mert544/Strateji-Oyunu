/**
 * Kare: tesis aşınması (`ozel.tesisAsinma`, isteğe bağlı alan, demetler büyümez; tesisOlcek kalıbı). Yalnız aşınması > 0 olan tesisler `[id, asinmaPpm]`; aşınmasız
 * dünyada kare ESKİ KARE ile bire bir aynıdır (alan yazılmaz); yalnız sahibine gider. Eski (dondurulmuş) şema yeni kareyi yine ayrıştırır.
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import { z } from "zod";
import { IlgiKaresiSemasi, KareDeltasiSemasi, deltaUygula, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";

function kurulum(): Simulasyon {
  const veri = miniVeriyiYukle();
  const sim = Simulasyon.olustur(veri, 5);
  const kuzey = veri.harita.bolgeler.filter((b) => b.devlet === "kuzey").map((b) => b.id);
  const guney = veri.harita.bolgeler.filter((b) => b.devlet === "guney").map((b) => b.id);
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: kuzey } });
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: guney } });
  sim.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" } });
  sim.calistirKadar(5 * SAAT);
  return sim;
}

describe("ozel.tesisAsinma (yalniz ekleme, istege bagli nesne alani)", () => {
  it("asinmasiz dunyada alan HIC yazilmaz (kare eski kareyle ayni anahtar kumesi); demetler 6 ogeli", () => {
    const sim = kurulum();
    const k = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0, 1, 2], "ali"), "ali");
    const tesisSayisi = k.bolgeler.reduce((n, b) => n + (b.ozel?.tesisler.length ?? 0), 0);
    expect(tesisSayisi).toBeGreaterThan(0);
    expect(sim.dunya.bolgeler.flatMap((b) => b.tesisler).every((t) => (t.asinmaPpm ?? 0) === 0)).toBe(true); // 5 saatte asinma yok
    for (const b of k.bolgeler) {
      expect(b.ozel !== undefined && "tesisAsinma" in b.ozel, `bolge ${b.i}`).toBe(false);
      for (const t of b.ozel?.tesisler ?? []) expect(t).toHaveLength(6);
    }
    expect(JSON.stringify(k)).not.toContain("tesisAsinma");
    expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
  });

  it("yalniz asinmasi > 0 olan tesisler listelenir ([id, asinmaPpm]); yalniz sahibine; delta ile tasinir; asinma sifirlaninca alan kaybolur", () => {
    const sim = kurulum();
    const ilgi = ilgiAlaniKur(sim, [0, 1, 2], "ali");
    const once = ilgiKaresiCikar(sim, ilgi, "ali");
    const t0 = sim.dunya.bolgeler[0]?.tesisler[0];
    const t1 = sim.dunya.bolgeler[1]?.tesisler[0];
    const t2 = sim.dunya.bolgeler[2]?.tesisler[0];
    expect(t0 && t1 && t2).toBeTruthy();
    if (!t0 || !t1 || !t2) return;
    t0.asinmaPpm = 120_000;
    t1.asinmaPpm = 1_000_000; // tavan
    t2.asinmaPpm = 0; // acik sifir: listelenmez
    const sonra = ilgiKaresiCikar(sim, ilgi, "ali");
    expect(sonra.bolgeler[0]?.ozel?.tesisAsinma).toEqual([[t0.id, 120_000]]);
    expect(sonra.bolgeler[1]?.ozel?.tesisAsinma).toEqual([[t1.id, 1_000_000]]);
    expect(sonra.bolgeler[2]?.ozel !== undefined && "tesisAsinma" in (sonra.bolgeler[2]?.ozel ?? {})).toBe(false);
    for (const b of sonra.bolgeler) for (const t of b.ozel?.tesisler ?? []) expect(t).toHaveLength(6); // demete oge EKLENMEDI
    // Yalniz sahibine: izleyici ve baska oyuncu gormez.
    expect(JSON.stringify(ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0, 1, 2], null), null))).not.toContain("tesisAsinma");
    expect(JSON.stringify(ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0, 1, 2], "veli"), "veli"))).not.toContain("tesisAsinma");
    expect(IlgiKaresiSemasi.parse(sonra)).toEqual(sonra);
    // Delta ile tasinir ve asinma onarilinca (0) alan geri kaybolur.
    const d = kareFarki(once, sonra);
    expect(KareDeltasiSemasi.parse(d)).toEqual(d);
    expect(deltaUygula(once, d)).toEqual(sonra);
    t0.asinmaPpm = 0;
    t1.asinmaPpm = 0;
    const onarilmis = ilgiKaresiCikar(sim, ilgi, "ali");
    expect(JSON.stringify(onarilmis)).not.toContain("tesisAsinma");
    expect(deltaUygula(sonra, kareFarki(sonra, onarilmis))).toEqual(onarilmis);
    // Karsit kanit: asinma ayni kareyi baska kullanmaz; olcek ve asinma birlikte gelebilir.
    t0.asinmaPpm = 5;
    t0.olcek = 2;
    const ikisi = ilgiKaresiCikar(sim, ilgi, "ali");
    expect(ikisi.bolgeler[0]?.ozel?.tesisOlcek).toEqual([[t0.id, 2]]);
    expect(ikisi.bolgeler[0]?.ozel?.tesisAsinma).toEqual([[t0.id, 5]]);
  });

  it("sema: bicim denetlenir (ondalik, dize, eksik eleman reddedilir)", () => {
    const sim = kurulum();
    const t0 = sim.dunya.bolgeler[0]?.tesisler[0];
    if (!t0) throw new Error("tesis yok");
    t0.asinmaPpm = 10;
    const k = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0], "ali"), "ali");
    for (const kotu of [[[t0.id, 1.5]], [[t0.id, "10"]], [[t0.id]], [[t0.id, 10, 3]]]) {
      const c = structuredClone(k);
      (c.bolgeler[0]?.ozel as { tesisAsinma?: unknown }).tesisAsinma = kotu;
      expect(IlgiKaresiSemasi.safeParse(c).success, JSON.stringify(kotu)).toBe(false);
    }
  });

  it("GERIYE UYUM: DONDURULMUS eski bolge karesi semasi (tesisAsinma ve tesisOlcek'ten ONCEKI; z.object bilinmeyen anahtari atar, z.tuple fazla ogeyi reddeder) yeni karesini kabul eder ve alani atar; demete oge eklenirse bu test kirilir", () => {
    const tam = z.number().int();
    const eskiBolge = z.object({
      i: tam,
      id: z.string(),
      genel: z.object({
        sahip: z.string().nullable(),
        nufus: tam,
        tesisler: z.array(z.tuple([tam, z.union([z.literal(0), z.literal(1)])])),
        durus: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      }),
      ozel: z
        .object({
          stoklar: z.array(z.tuple([tam, tam, tam, tam, tam])),
          uretimOrani: z.array(tam),
          tesisler: z.array(z.tuple([tam, tam, tam, z.union([z.literal(0), z.literal(1)]), tam, tam])),
          emirler: z.array(z.tuple([tam, z.union([z.literal(0), z.literal(1)]), tam, tam])),
          birlikler: z.array(tam),
          gidaPpm: tam,
          ikmalPpm: tam,
          rezervKalan: z.array(tam),
        })
        .optional(),
    });
    const sim = kurulum();
    const t = sim.dunya.bolgeler[0]?.tesisler[0];
    if (t) t.asinmaPpm = 250_000;
    const kare = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0, 1, 2], "ali"), "ali");
    expect(kare.bolgeler[0]?.ozel?.tesisAsinma).toBeDefined();
    const agdaki = JSON.parse(JSON.stringify(kare)) as { bolgeler: unknown[] };
    for (const b of agdaki.bolgeler) {
      const r = eskiBolge.safeParse(b);
      expect(r.success, JSON.stringify(r)).toBe(true);
      if (r.success) expect(JSON.stringify(r.data)).not.toContain("tesisAsinma");
    }
  });
});

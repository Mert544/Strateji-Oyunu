/**
 * Kare: sahibine işletme düğümü bilgileri (`ozel.isletme.ihrNetPpm`, isteğe bağlı NESNE alanı; demet büyümez): düğümün ETKİN ihracat net çarpanı (tamsayı ppm) = çekirdek
 * `ticaretNakitCarpanlari(...).ihracatPpm` (makas x (1 - liman primi) x (1 - komisyon); yeni oyuncu kalkanında komisyon 0; Ticaret ofisi indirimi dahil). Değerler SABİT YAZILMAZ,
 * çekirdekten türetilir; iki vaka: kalkanda (komisyon 0, prim yine var) ve kalkan sonrası (komisyon). Alan yalnız sahibine, yalnız mülk işletme düğümünde ve çözüm bağlamı varken yazılır;
 * eski kare/eski şema/eski istemci davranışı değişmez; delta.
 */
import { describe, expect, it } from "vitest";
import { PPM, SISTEM_OYUNCUSU, carpBol, ihracatKirilimi, pazarTablosu, ticaretCarpanlari, ticaretNakitCarpanlari } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { mulkSim, mulkVeriTam } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, KareDeltasiSemasi, deltaUygula, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";
import type { IlgiKaresi } from "../src/index";

/** Limanlı bir şehir merkezi (prim = 20 sa x limanPrimPpmSaat, tavana kadar) ve limansız ova: iki düğümde iki ayrı prim. */
function dunya(): Simulasyon {
  const v = mulkVeriTam((x) => {
    const b = x.harita.bolgeler.find((y) => y.id === "m_sehir")!;
    b.etiketler.push("liman");
    b.liman = { dunyaKapisi: false, dunyaMesafeSaat: 20, kapasiteSinifi: 1 };
  });
  const s = mulkSim([], v);
  s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_ova_merkez" } });
  s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: [], ilce: "sn_m_sehir_merkez" } });
  return s;
}

const isletme = (s: Simulasyon, o: string) => s.dunya.bolgeler.find((b) => b.merkez !== undefined && b.sahip === o) ?? (() => { throw new Error("isletme yok"); })();
const oyuncuDurumu = (s: Simulasyon, o: string) => s.dunya.oyuncular.find((x) => x.id === o)!;
const kare = (s: Simulasyon, o: string | null): IlgiKaresi => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});
const ozel = (k: IlgiKaresi, s: Simulasyon, o: string) => k.bolgeler.find((b) => b.i === s.dunya.bolgeler.indexOf(isletme(s, o)))?.ozel;

/** Çekirdekten beklenen düğüm değeri (kalkan durumunu çekirdek kendisi okur). */
function beklenen(s: Simulasyon, o: string): number {
  const b = isletme(s, o);
  return ticaretNakitCarpanlari(s.dunya, s.baglam, oyuncuDurumu(s, o), b.merkez as number, b).ihracatPpm;
}

describe("ozel.isletme.ihrNetPpm (yalniz ekleme, istege bagli nesne alani)", () => {
  it("kalkanda: komisyon 0, prim yine var; deger cekirdekten (makas x (1 - prim)); iki dugumde iki ayri prim", () => {
    const s = dunya();
    s.calistirKadar(2 * 3_600_000);
    const pz = pazarTablosu(s.ic)!;
    for (const o of ["a", "b"]) {
      const b = isletme(s, o);
      expect(s.dunya.zaman, o).toBeLessThan(oyuncuDurumu(s, o).korumaBitis); // kalkanda
      const c = ticaretCarpanlari(s.dunya, s.baglam, oyuncuDurumu(s, o), b.merkez as number, b);
      expect(c.komisyonPpm).toBe(0);
      const alan = ozel(kare(s, o), s, o)?.isletme?.ihrNetPpm;
      expect(alan, o).toBe(beklenen(s, o));
      expect(Number.isInteger(alan)).toBe(true);
      expect(alan).toBe(ihracatKirilimi(PPM, c).nakit); // ihracatKirilimi(PPM).nakit
      // Bagimsiz aritmetik: makas x (1 - prim) (komisyon yok; ihracat vergisi nakit carpana girmez)
      expect(alan).toBe(carpBol(c.ihracatMakasPpm, PPM - c.primPpm, PPM));
    }
    const prim = (o: string) => pazarTablosu(s.ic)!.limanPrimPpm[isletme(s, o).merkez as number] ?? 0;
    expect(prim("a")).toBe(0); // limansiz ova
    expect(prim("b")).toBeGreaterThan(0); // limanli sehir
    expect(pz.p.islemKomisyonuPpm).toBeGreaterThan(0); // fixture komisyonlu (kalkan sonrasi vaka anlamli)
    expect(ozel(kare(s, "b"), s, "b")!.isletme!.ihrNetPpm).toBeLessThan(ozel(kare(s, "a"), s, "a")!.isletme!.ihrNetPpm); // prim dugume bagli
  });

  it("kalkan sonrasi: komisyon uygulanir (deger kalkandakinden kucuk); yine cekirdekten; kalkan bitince alan degisir ve delta gecerlidir", () => {
    const s = dunya();
    s.calistirKadar(2 * 3_600_000);
    const once = kare(s, "b");
    const oncekiDeger = ozel(once, s, "b")!.isletme!.ihrNetPpm;
    s.calistirKadar(oyuncuDurumu(s, "b").korumaBitis + 3_600_000);
    expect(s.dunya.zaman).toBeGreaterThanOrEqual(oyuncuDurumu(s, "b").korumaBitis);
    const b = isletme(s, "b");
    const c = ticaretCarpanlari(s.dunya, s.baglam, oyuncuDurumu(s, "b"), b.merkez as number, b);
    expect(c.komisyonPpm).toBe(pazarTablosu(s.ic)!.p.islemKomisyonuPpm);
    const sonra = kare(s, "b");
    const alan = ozel(sonra, s, "b")!.isletme!.ihrNetPpm;
    expect(alan).toBe(beklenen(s, "b"));
    expect(alan).toBe(carpBol(carpBol(c.ihracatMakasPpm, PPM - c.primPpm, PPM), PPM - c.komisyonPpm, PPM)); // makas x (1 - prim) x (1 - komisyon), sira: v1, v2, v4 (+-1 sira farki degil: ayni sira)
    expect(alan).toBeLessThan(oncekiDeger);
    expect(Math.abs(oncekiDeger - alan)).toBeLessThanOrEqual(Math.ceil(oncekiDeger * c.komisyonPpm / PPM) + 1);
    // Delta: alan degisince kareFarki/deltaUygula tutarli, delta semasi gecerli
    const d = kareFarki(once, sonra);
    expect(KareDeltasiSemasi.parse(d)).toEqual(d);
    expect(deltaUygula(once, d)).toEqual(sonra);
    // Ticaret ofisi indirimi cekirdekte nakit carpana dahildir: alan her zaman cekirdegin degeridir (kopya yok; yukaridaki beklenen() cekirdegi cagirir)
  });

  it("YALNIZ sahibine ve yalniz mulk isletme dugumunde: baskasi ve izleyici gormez; harita bolgeleri (merkez yok) alan tasimaz; baglamsiz kaynakta (eski cagri) yazilmaz", () => {
    const s = dunya();
    s.calistirKadar(3_600_000);
    expect(ozel(kare(s, "b"), s, "a")).toBeUndefined();
    expect(ozel(kare(s, null), s, "a")).toBeUndefined();
    expect(JSON.stringify(kare(s, null))).not.toContain("ihrNetPpm"); // izleyici hic gormez
    expect(JSON.stringify(kare(s, "b")).split("ihrNetPpm").length - 1).toBe(1); // b yalniz kendi dugumunu gorur (a'nin degerini degil)
    const ka = kare(s, "a");
    for (const b of ka.bolgeler) if (b.ozel?.isletme !== undefined) expect(s.dunya.bolgeler[b.i]?.merkez, b.id).toBeDefined(); // yalniz mulk isletme dugumu
    expect(ka.bolgeler.filter((b) => b.ozel?.isletme !== undefined)).toHaveLength(1); // a'nin tek dugumu
    // Cozum baglami yok: alan yazilmaz (sebeke/dukkan alanlariyla ayni kural); kare gecerli
    const baglamsiz = ilgiKaresiCikar({ dunya: s.dunya, ic: s.ic }, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), "a"), "a", [], {});
    expect(JSON.stringify(baglamsiz)).not.toContain("isletme");
    expect(IlgiKaresiSemasi.parse(baglamsiz)).toEqual(baglamsiz);
  });

  it("DONDURULMUS eski sema (isletme'yi bilmeyen; z.object bilinmeyen anahtari atar) yeni kareyi kabul eder ve alani atar; yeni sema bicimi denetler", () => {
    const s = dunya();
    s.calistirKadar(3_600_000);
    const k = JSON.parse(JSON.stringify(kare(s, "a"))) as IlgiKaresi;
    expect(JSON.stringify(k)).toContain('"ihrNetPpm"');
    expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
    const eskiOzel = IlgiKaresiSemasi.shape.bolgeler.element.shape.ozel.unwrap().omit({ isletme: true });
    for (const b of k.bolgeler) {
      if (!b.ozel) continue;
      const r = eskiOzel.safeParse(b.ozel);
      expect(r.success).toBe(true);
      if (r.success) expect(JSON.stringify(r.data)).not.toContain("isletme");
    }
    const kotu = (duz: (c: IlgiKaresi) => void): boolean => {
      const c = structuredClone(k);
      duz(c);
      return IlgiKaresiSemasi.safeParse(c).success;
    };
    const hedef = (c: IlgiKaresi) => c.bolgeler.find((b) => b.ozel?.isletme)?.ozel as NonNullable<IlgiKaresi["bolgeler"][number]["ozel"]>;
    expect(kotu(() => undefined)).toBe(true);
    expect(kotu((c) => { (hedef(c).isletme as { ihrNetPpm: number }).ihrNetPpm = 1.5; })).toBe(false); // tamsayi ppm
    expect(kotu((c) => { (hedef(c).isletme as unknown as { ihrNetPpm: string }).ihrNetPpm = "x"; })).toBe(false);
    expect(kotu((c) => { delete (hedef(c) as { isletme?: unknown }).isletme; })).toBe(true); // alan yoksa gecerli (eski sunucu)
  });
});

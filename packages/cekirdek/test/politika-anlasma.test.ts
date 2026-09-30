/** Politika alt sistemi testleri: anlaşmalar, yaptırımlar, kenar erişimi, pazar çarpanları (ekonomi/lojistik sahte). */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/ekonomi", () => ({ saatlikTik: vi.fn(), insaatBitti: vi.fn(), ekonomiKomutu: vi.fn() }));
vi.mock("../src/lojistik/cozum", () => ({ lojistikCoz: vi.fn(), lojistikKomutu: vi.fn() }));

import { miniVeriyiYukle } from "@bolge/veri";
import type { AnlasmaTuru } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { kenarKullanilabilirMi, pazarCarpanlari } from "../src/politika";
import type { DamgaliKomut, Komut } from "../src/tipler";

/** Mini harita: a = m_ova, b = m_liman (komşu), c = m_dag (b ile değil; m_gecit sahipsiz). */
function kur(tohum = 1): Simulasyon {
  const s = Simulasyon.olustur(miniVeriyiYukle(), tohum);
  const katil = (o: string, bolgeler: string[]) =>
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler } });
  katil("a", ["m_ova"]);
  katil("b", ["m_liman"]);
  katil("c", ["m_dag"]);
  return s;
}

function uygula(s: Simulasyon, oyuncu: string, komut: Komut, t = s.dunya.zaman) {
  return s.uygula({ t, oyuncu, komut } satisfies DamgaliKomut);
}
const teklif = (s: Simulasyon, oyuncu: string, karsi: string, anlasma: AnlasmaTuru) =>
  uygula(s, oyuncu, { tur: "anlasma_teklif", karsi, anlasma });

function kenarIndeksi(s: Simulasyon, a: string, b: string): number {
  const ai = s.ic.bolgeIndeks[a] as number;
  const bi = s.ic.bolgeIndeks[b] as number;
  const k = s.dunya.kenarlar.findIndex((e) => (e.a === ai && e.b === bi) || (e.a === bi && e.b === ai));
  expect(k).toBeGreaterThanOrEqual(0);
  return k;
}

describe("anlasma_teklif / anlasma_feshet", () => {
  it("tek tarafli teklif aktif degil, cift tarafli aktif olur; taraflar siralidir", () => {
    const s = kur();
    expect(teklif(s, "b", "a", "ticaret").tamam).toBe(true);
    expect(s.dunya.anlasmalar).toEqual([{ tur: "ticaret", taraflar: ["a", "b"], teklifler: ["b"], aktif: false }]);
    // Yinelenen teklif zarar vermez
    expect(teklif(s, "b", "a", "ticaret").tamam).toBe(true);
    expect(s.dunya.anlasmalar[0]!.teklifler).toEqual(["b"]);
    expect(teklif(s, "a", "b", "ticaret").tamam).toBe(true);
    expect(s.dunya.anlasmalar).toEqual([{ tur: "ticaret", taraflar: ["a", "b"], teklifler: ["a", "b"], aktif: true }]);
  });

  it("gecersiz teklifler reddedilir", () => {
    const s = kur();
    expect(teklif(s, "a", "a", "ticaret").tamam).toBe(false);
    expect(teklif(s, "a", "yok", "ticaret").tamam).toBe(false);
    expect(s.dunya.anlasmalar).toEqual([]);
    expect(uygula(s, "a", { tur: "anlasma_feshet", karsi: "b", anlasma: "ticaret" }).tamam).toBe(false);
  });

  it("farkli turler ayri kayit; fesih kaydi siler", () => {
    const s = kur();
    teklif(s, "a", "b", "ticaret");
    teklif(s, "b", "a", "ticaret");
    teklif(s, "a", "b", "ortak_altyapi");
    expect(s.dunya.anlasmalar.map((x) => [x.tur, x.aktif])).toEqual([
      ["ortak_altyapi", false],
      ["ticaret", true],
    ]);
    expect(uygula(s, "b", { tur: "anlasma_feshet", karsi: "a", anlasma: "ticaret" }).tamam).toBe(true);
    expect(s.dunya.anlasmalar.map((x) => x.tur)).toEqual(["ortak_altyapi"]);
    // Fesih sonrası yeniden aktif olması için iki yeni teklif gerekir
    teklif(s, "a", "b", "ticaret");
    expect(s.dunya.anlasmalar.find((x) => x.tur === "ticaret")!.aktif).toBe(false);
  });

  it("fesih lojistigi kirletir", () => {
    const s = kur();
    teklif(s, "a", "b", "ticaret");
    teklif(s, "b", "a", "ticaret");
    s.calistirKadar(10);
    expect(s.dunya.lojistik.kirli).toBe(false);
    uygula(s, "a", { tur: "anlasma_feshet", karsi: "b", anlasma: "ticaret" });
    expect(s.dunya.lojistik.kirli).toBe(true);
  });
});

describe("kenarKullanilabilirMi", () => {
  it("kendi iki ucu sahibi olan kenar; sahipsiz ve yabanci uc kapali", () => {
    const s = kur();
    const d = s.dunya;
    const ctx = s.baglam;
    // a sadece m_ova sahibi: m_ova-m_liman kenarının bir ucu b'de
    const ovaLiman = kenarIndeksi(s, "m_ova", "m_liman");
    expect(kenarKullanilabilirMi(d, ctx, "a", ovaLiman)).toBe(false);
    // m_ova - m_gecit: m_gecit sahipsiz
    const ovaGecit = kenarIndeksi(s, "m_ova", "m_gecit");
    expect(kenarKullanilabilirMi(d, ctx, "a", ovaGecit)).toBe(false);
    expect(kenarKullanilabilirMi(d, ctx, "a", 999)).toBe(false);
    // Bir oyuncu iki komşu bölgeyi alırsa kenar açılır
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_gecit"] } });
    expect(kenarKullanilabilirMi(d, ctx, "a", ovaGecit)).toBe(true);
    expect(kenarKullanilabilirMi(d, ctx, "b", ovaGecit)).toBe(false);
  });

  it("ortak_altyapi ile partnerin kenari kullanilabilir, fesihle kapanir; tek tarafli teklif yetmez", () => {
    const s = kur();
    const d = s.dunya;
    const ctx = s.baglam;
    const ovaLiman = kenarIndeksi(s, "m_ova", "m_liman");
    teklif(s, "a", "b", "ortak_altyapi");
    expect(kenarKullanilabilirMi(d, ctx, "a", ovaLiman)).toBe(false);
    teklif(s, "b", "a", "ortak_altyapi");
    expect(kenarKullanilabilirMi(d, ctx, "a", ovaLiman)).toBe(true);
    expect(kenarKullanilabilirMi(d, ctx, "b", ovaLiman)).toBe(true);
    // Üçüncü oyuncu yararlanamaz; ticaret anlaşması erişim vermez
    expect(kenarKullanilabilirMi(d, ctx, "c", ovaLiman)).toBe(false);
    uygula(s, "a", { tur: "anlasma_feshet", karsi: "b", anlasma: "ortak_altyapi" });
    expect(kenarKullanilabilirMi(d, ctx, "a", ovaLiman)).toBe(false);
    expect(kenarKullanilabilirMi(d, ctx, "b", ovaLiman)).toBe(false);
    teklif(s, "a", "b", "ticaret");
    teklif(s, "b", "a", "ticaret");
    expect(kenarKullanilabilirMi(d, ctx, "a", ovaLiman)).toBe(false);
  });

  it("sahipsiz ucu olan kenar ortak altyapi ile de kapali", () => {
    const s = kur();
    teklif(s, "a", "b", "ortak_altyapi");
    teklif(s, "b", "a", "ortak_altyapi");
    const ovaGecit = kenarIndeksi(s, "m_ova", "m_gecit");
    expect(kenarKullanilabilirMi(s.dunya, s.baglam, "a", ovaGecit)).toBe(false);
  });
});

describe("yaptirim ve pazarCarpanlari", () => {
  it("varsayilan -> ticaret anlasmasi -> yaptirim onceligi", () => {
    const s = kur();
    const d = s.dunya;
    const ctx = s.baglam;
    const p = s.ic.param.pazar;
    expect(pazarCarpanlari(d, ctx, "a")).toEqual({ ithalatPpm: p.ithalatCarpaniPpm, ihracatPpm: p.ihracatCarpaniPpm });

    teklif(s, "a", "b", "ticaret");
    expect(pazarCarpanlari(d, ctx, "a")).toEqual({ ithalatPpm: p.ithalatCarpaniPpm, ihracatPpm: p.ihracatCarpaniPpm });
    teklif(s, "b", "a", "ticaret");
    const anlasma = { ithalatPpm: p.anlasmaIthalatCarpaniPpm, ihracatPpm: p.anlasmaIhracatCarpaniPpm };
    expect(pazarCarpanlari(d, ctx, "a")).toEqual(anlasma);
    expect(pazarCarpanlari(d, ctx, "b")).toEqual(anlasma);
    expect(pazarCarpanlari(d, ctx, "c")).toEqual({ ithalatPpm: p.ithalatCarpaniPpm, ihracatPpm: p.ihracatCarpaniPpm });

    // c, a'ya yaptırım uygular: yalnızca hedef etkilenir ve anlaşmadan önceliklidir
    expect(uygula(s, "c", { tur: "yaptirim", hedef: "a", aktif: true }).tamam).toBe(true);
    const yaptirim = { ithalatPpm: p.yaptirimIthalatCarpaniPpm, ihracatPpm: p.yaptirimIhracatCarpaniPpm };
    expect(pazarCarpanlari(d, ctx, "a")).toEqual(yaptirim);
    expect(pazarCarpanlari(d, ctx, "b")).toEqual(anlasma);
    expect(pazarCarpanlari(d, ctx, "c")).toEqual({ ithalatPpm: p.ithalatCarpaniPpm, ihracatPpm: p.ihracatCarpaniPpm });

    // Yaptırım kalkınca anlaşma çarpanı geri gelir
    uygula(s, "c", { tur: "yaptirim", hedef: "a", aktif: false });
    expect(pazarCarpanlari(d, ctx, "a")).toEqual(anlasma);
  });

  it("yaptirim tekrarsiz, siralı; kendine ve bilinmeyen hedefe reddedilir; olmayan yaptirimi kaldirmak zararsiz", () => {
    const s = kur();
    expect(uygula(s, "c", { tur: "yaptirim", hedef: "b", aktif: true }).tamam).toBe(true);
    expect(uygula(s, "c", { tur: "yaptirim", hedef: "b", aktif: true }).tamam).toBe(true);
    expect(uygula(s, "b", { tur: "yaptirim", hedef: "a", aktif: true }).tamam).toBe(true);
    expect(uygula(s, "a", { tur: "yaptirim", hedef: "c", aktif: true }).tamam).toBe(true);
    expect(s.dunya.yaptirimlar).toEqual([
      { uygulayan: "a", hedef: "c" },
      { uygulayan: "b", hedef: "a" },
      { uygulayan: "c", hedef: "b" },
    ]);
    expect(uygula(s, "a", { tur: "yaptirim", hedef: "a", aktif: true }).tamam).toBe(false);
    expect(uygula(s, "a", { tur: "yaptirim", hedef: "yok", aktif: true }).tamam).toBe(false);
    expect(uygula(s, "a", { tur: "yaptirim", hedef: "b", aktif: false }).tamam).toBe(true);
    expect(s.dunya.yaptirimlar).toHaveLength(3);
  });
});

describe("determinizm ve siralilik", () => {
  const komutlar: [string, Komut][] = [
    ["c", { tur: "anlasma_teklif", karsi: "a", anlasma: "ticaret" }],
    ["b", { tur: "anlasma_teklif", karsi: "c", anlasma: "ortak_altyapi" }],
    ["a", { tur: "anlasma_teklif", karsi: "b", anlasma: "ticaret" }],
    ["a", { tur: "anlasma_teklif", karsi: "c", anlasma: "ticaret" }],
    ["c", { tur: "yaptirim", hedef: "b", aktif: true }],
    ["a", { tur: "yaptirim", hedef: "b", aktif: true }],
    ["b", { tur: "anlasma_teklif", karsi: "a", anlasma: "ticaret" }],
  ];

  it("teklif/yaptirim sirasi anlasmalar ve yaptirimlar dizisinin icerigini ve sirasini degistirmez", () => {
    const ileri = kur();
    for (const [o, k] of komutlar) uygula(ileri, o, k);
    const geri = kur();
    for (const [o, k] of [...komutlar].reverse()) uygula(geri, o, k);
    expect(geri.dunya.anlasmalar).toEqual(ileri.dunya.anlasmalar);
    expect(geri.dunya.yaptirimlar).toEqual(ileri.dunya.yaptirimlar);
    const anahtarlar = ileri.dunya.anlasmalar.map((x) => `${x.taraflar[0]}|${x.taraflar[1]}|${x.tur}`);
    expect(anahtarlar).toEqual([...anahtarlar].sort());
  });

  it("gunlukten yeniden oynatma ayni durum ozetini verir", () => {
    const s = kur(3);
    for (const [o, k] of komutlar) uygula(s, o, k, s.dunya.zaman + 1000);
    s.calistirKadar(10_000_000);
    const y = Simulasyon.yenidenOynat(miniVeriyiYukle(), 3, s.gunluk);
    y.calistirKadar(10_000_000);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
  });
});

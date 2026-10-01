/**
 * G6-4 / G6 kabul ölçütü madde 2 (şartname §5.7): mülk kipinde, SANTRALSİZ yeni oyuncu: Tarla → değirmen → fırın zinciri kısa bir testte `ekmek`
 * üretir (`verimPpm > 0`; fırın için yakıt ticaret emri VERİLMEDEN), NPC pazara satar; şebeke bedeli (elektrik + yakıt) defterde (lavabo + kasa
 * girişi) ve korunum eşitliği tam.
 */
import { describe, expect, it } from "vitest";
import { sayacOlcekli } from "../src/paraSayac";
import { anlikMiktar } from "../src/stok";
import { GUN } from "../src/tipler";
import { g6Bolge, g6Dugum, g6Dunya, g6KorunumTutar, g6MulkVeri, g6Tesis } from "./g6-yardimci";
import { tamam } from "./mulk-yardimci";

describe("ekmek zinciri: Tarla → değirmen → fırın (santralsiz, yakıt emri yok)", () => {
  const veri = g6MulkVeri({}, (v) => {
    // zincir gerçekten TARLADAN beslenir: başlangıç tahıl/un kiti yok
    const bs = v.param.mulk!.yeniOyuncu.baslangicStok;
    delete bs["tahil"];
    delete bs["un"];
  });
  const s = g6Dunya({
    veri,
    bekleMs: 0,
    kur: (y) => {
      y.yerlestir("ciftlik");
      y.yerlestir("gida_fabrikasi", "degirmen");
      y.yerlestir("gida_fabrikasi", "ekmek_firini");
    },
  });
  const ekmek = () => s.ic.malIndeks["ekmek"]!;

  it("4 günde ekmek üretilir; üç tesisin hepsi çalışır (verim > 0); santral yok; yakıt ticaret emri yok", () => {
    tamam(s, "a", { tur: "ticaret_emri", bolge: g6Bolge(s, "a"), mal: "ekmek", yon: "ihracat", oranSaat: 100_000 });
    s.calistirKadar(s.dunya.zaman + 4 * GUN);
    const b = g6Dugum(s, "a");
    expect(b.tesisler.some((t) => s.ic.tesisTurleri[t.tur]!.id === "santral")).toBe(false);
    expect(g6Tesis(s, "a", "degirmen").verimPpm).toBeGreaterThan(0);
    expect(g6Tesis(s, "a", "ekmek_firini").verimPpm).toBeGreaterThan(0);
    expect(b.uretimToplam[ekmek()]).toBeGreaterThan(0);
    expect(b.ticaretEmirleri.some((e) => e.mal === s.ic.malIndeks["yakit"])).toBe(false);
    expect(anlikMiktar(b.stoklar[s.ic.malIndeks["yakit"]!]!, s.dunya.zaman)).toBe(0);
  });

  it("NPC pazara satar (ihracat gelir) ve şebeke bedeli defterde: lavabo.sebeke + kasa.giris.sebeke > 0; korunum tam", () => {
    const p = s.dunya.mulk!.para!;
    expect(sayacOlcekli(p.musluk.ihracatNpc)).toBeGreaterThan(0n);
    const k = g6KorunumTutar(s, "zincir");
    expect(k.lavaboSebeke).toBeGreaterThan(0n);
    expect(k.kasaSebeke).toBeGreaterThan(0n);
  });
});

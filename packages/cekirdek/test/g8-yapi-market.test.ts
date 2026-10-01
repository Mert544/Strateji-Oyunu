/**
 * G8-2 (sartname §8.1-§8.4, §16.2): `yapi_market` dükkânı pencere, çelik, cam, parçayı YALNIZ NPC hane talebine satar (G7a kanalı); oyuncu-alıcı (toplu alım) yoktur. Pencere hattı mülk
 * kipinde SANTRALSİZ çalışır (elektrik ve yakıt şebekeden): silis → cam fırını → çelik doğrama → pencere; pencere `yapi_market` rafında satılır ve `yerelNpc` > 0 olur.
 * Dükkân durumu doğrudan yazılır (kurulum komutu G7-3'tedir); yöntemler ve tür G8-1 verisi gelmeden bellekte eklenir (`g8-yardimci.ts`).
 */
import { describe, expect, it } from "vitest";
import { KOMUT_SEMASI } from "../src/komutSemasi";
import { paraUzlastir } from "../src/mulk/kasa";
import { yerelPazarGorunumu } from "../src/mulk/perakende";
import { sayacOlcekli } from "../src/paraSayac";
import { anlikHazine } from "../src/stok";
import { GUN } from "../src/tipler";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { g6Dugum, g6Dunya, g6KorunumTutar, g6Tesis } from "./g6-yardimci";
import { g8MulkVeri } from "./g8-yardimci";
import { dukkanEkle, dukkanlar } from "./perakende-yardimci";

const ILCE = "sn_m_ova_merkez";

function veri(): CekirdekVeriPaketi {
  return g8MulkVeri({}, (v) => {
    // zincir girdileri: silis (cam), çelik ve parça (doğrama) başlangıç kitinde; elektrik ve yakıt şebekeden (santral YOK)
    Object.assign(v.param.mulk!.yeniOyuncu.baslangicStok, { silis: 10_000_000, celik: 10_000_000, parca: 10_000_000 });
  });
}

/** `a`: santralsiz cam fırını + çelik doğrama + `yapi_market` (pencere, çelik, cam, parça raflı); `b`: yalnız hibeli, hiçbir yapısı yok. */
function kur(dukkan: boolean) {
  const s = g6Dunya({
    veri: veri(),
    oyuncular: ["a", "b"],
    bekleMs: 0,
    kur: (y, o) => {
      if (o !== "a") return;
      y.yerlestir("parca_fabrikasi", "cam_firini");
      y.yerlestir("parca_fabrikasi", "celik_dograma");
    },
  });
  if (dukkan) dukkanEkle(s, "a", [{ mal: "pencere" }, { mal: "celik" }, { mal: "cam" }, { mal: "parca" }], "yapi_market", 0, ILCE);
  return s;
}

describe("santralsiz pencere hattı + yapı market", () => {
  const s = kur(true);
  s.calistirKadar(s.dunya.zaman + 3 * GUN);

  it("santral yok; cam fırını ve çelik doğrama çalışır (verim > 0); cam ve pencere ÜRETİLİR; şebeke bedeli defterde", () => {
    const b = g6Dugum(s, "a");
    expect(b.tesisler.some((t) => s.ic.tesisTurleri[t.tur]!.id === "santral")).toBe(false);
    expect(g6Tesis(s, "a", "cam_firini").verimPpm).toBeGreaterThan(0);
    expect(g6Tesis(s, "a", "celik_dograma").verimPpm).toBeGreaterThan(0);
    expect(b.uretimToplam[s.ic.malIndeks["cam"]!]).toBeGreaterThan(0);
    expect(b.uretimToplam[s.ic.malIndeks["pencere"]!]).toBeGreaterThan(0);
    const k = g6KorunumTutar(s, "g8-zincir");
    expect(k.lavaboSebeke).toBeGreaterThan(0n);
    expect(k.kasaSebeke).toBeGreaterThan(0n);
  });

  it("yapı market rafında pencere (ve diğer yapı malları) NPC hane talebine satılır: yuva satış sayacı > 0, musluk.yerelNpc ve dukkanGeliri > 0, korunum tam", () => {
    paraUzlastir(s.dunya, s.ic);
    const raf = dukkanlar(s)[0]!.e.dukkan!.raf;
    const satis = (mal: string) => raf.find((y) => y.mal === mal)!.satis?.n ?? 0;
    expect(satis("pencere")).toBeGreaterThan(0);
    expect(satis("celik") + satis("cam") + satis("parca")).toBeGreaterThan(0);
    const p = s.dunya.mulk!.para!;
    expect(sayacOlcekli(p.musluk.yerelNpc!)).toBeGreaterThan(0n);
    expect(sayacOlcekli(s.dunya.mulk!.oyuncular.find((o) => o.id === "a")!.dukkanGeliri!)).toBe(sayacOlcekli(p.musluk.yerelNpc!));
    g6KorunumTutar(s, "g8-yapi-market");
    // talep satırı yalnız yapı mallarında: görünüm API'sinde dört yuvanın dördünde de Q > 0 (yapı grubu)
    const g = yerelPazarGorunumu(s.dunya, s.baglam, "a")[0]!;
    expect(g.yuvalar.slice(0, 4).map((y) => y.mal)).toEqual(["pencere", "celik", "cam", "parca"]);
    for (const y of g.yuvalar.slice(0, 4)) expect(y.q).toBeGreaterThan(0);
    for (const y of g.yuvalar.slice(4)) expect(y.mal).toBeUndefined(); // S: 6 yuva, ikisi boş
  });

  it("yapı market satışı üretilen + eldeki stoktan fazla olamaz (pencere): satılan pencere <= üretilen pencere + başlangıç stoku", () => {
    paraUzlastir(s.dunya, s.ic);
    const raf = dukkanlar(s)[0]!.e.dukkan!.raf.find((y) => y.mal === "pencere")!;
    const b = g6Dugum(s, "a");
    const pm = s.ic.malIndeks["pencere"]!;
    expect(raf.satis!.n).toBeLessThanOrEqual(b.uretimToplam[pm]! + 1_000_000);
  });
});

describe("oyuncu-alıcı YOK (toplu alım yok): para yalnız NPC talebinden gelir", () => {
  it("komut kümesinde dükkândan satın alma komutu yok (yalnız raf, fiyat, marka, yık); hiçbir komutun alıcı/oyuncu hedef alanı yok", () => {
    const dukkanKomutlari = Object.keys(KOMUT_SEMASI).filter((k) => /dukkan|market|satin|alim/.test(k)).sort();
    expect(dukkanKomutlari).toEqual(["dukkan_fiyat", "dukkan_marka", "dukkan_raf", "dukkan_yik"]);
    for (const k of dukkanKomutlari) expect(Object.keys((KOMUT_SEMASI as Record<string, { alanlar: Record<string, unknown> }>)[k]!.alanlar)).not.toContain("alici");
  });

  it("dükkânlı ve dükkânsız koşuda başka oyuncunun (b) hazinesi AYNI: dükkân geliri oyuncular arası akış değildir; a'nın gelirinin tamamı musluk.yerelNpc (ihracat emri yok -> ihracatNpc 0)", () => {
    const a = kur(true);
    const b = kur(false);
    a.calistirKadar(a.dunya.zaman + 3 * GUN);
    b.calistirKadar(b.dunya.zaman + 3 * GUN);
    expect(anlikHazine(a.dunya, "b")).toBe(anlikHazine(b.dunya, "b"));
    paraUzlastir(a.dunya, a.ic);
    expect(sayacOlcekli(a.dunya.mulk!.para!.musluk.ihracatNpc)).toBe(0n);
    expect(sayacOlcekli(a.dunya.mulk!.para!.musluk.yerelNpc!)).toBeGreaterThan(0n);
    // negatif kontrol: dükkânsız koşuda yerel gelir yok ve a'nın hazinesi daha düşük
    paraUzlastir(b.dunya, b.ic);
    expect(b.dunya.mulk!.para!.musluk.yerelNpc).toBeUndefined();
    expect(anlikHazine(a.dunya, "a")).toBeGreaterThan(anlikHazine(b.dunya, "a"));
  });
});

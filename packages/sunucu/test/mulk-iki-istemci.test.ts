/**
 * Mülk kipi (S3, mini-6 parsel fikstürü) uçtan uca: iki istemci aynı ilçeye abone; biri `parsel_al` gönderir, ikisi de
 * hücre sahipliğini görür. Oyuncunun işletme düğümü ve arazi kaydı yalnız kendisine; il aboneliği ilin ilçelerini ve
 * merkez bölgesini getirir; görüntü + günlük kuyruğuyla kurtarma aynı t'de aynı özeti verir.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { IlgiKaresi } from "@bolge/protokol";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { kareBekle, katil, mulkVerisi, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

const ILCE = "sn_m_ova_merkez";
const H1 = "604800:381800";
const H2 = "604801:381800";

function hucreler(k: IlgiKaresi | null): unknown {
  return k?.ilceler?.find((c) => c.id === ILCE)?.hucreler;
}

describe("mulk kipi: iki istemci", () => {
  it("parsel_al iki karede de gorunur; isletme ve arazi kaydi yalniz sahibine; ozet esit; kurtarma", async () => {
    ts = await testSunucusu({ veri: mulkVerisi() });
    expect(ts.yazar.sim.dunya.mulk).toBeDefined();
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", []);
    await katil(y, "veli", []);
    const a = await ts.baglan("ali");
    const b = await ts.baglan("veli");
    const ka = await a.abone([]);
    expect(ka.ilceIlgisi).toEqual([]);
    a.gonder({ tur: "abone", ilceler: [ILCE] });
    b.gonder({ tur: "abone", ilceler: [ILCE] });
    await kareBekle(a, () => a.kare?.ilceler?.length === 1);
    await kareBekle(b, () => b.kare?.ilceler?.length === 1);
    expect(hucreler(a.kare)).toEqual([]);

    await y.zamanIlerlet(SAAT);
    const r = await a.komut("p1", { tur: "parsel_al", ilce: ILCE, hucreler: [H1, H2], sinif: "kirsal" });
    expect(r.tur === "komutSonucu" && r.sonuc.tamam).toBe(true);
    const sahiplik = (k: IlgiKaresi | null) => (hucreler(k) as Array<[string, string]> | undefined)?.map((h) => `${h[0]}=${h[1]}`).join(",");
    await kareBekle(a, () => sahiplik(a.kare) === `${H1}=ali,${H2}=ali`);
    await kareBekle(b, () => sahiplik(b.kare) === `${H1}=ali,${H2}=ali`);
    expect(b.kare?.ilceler?.[0]?.satilmisHucre).toBe(2);
    expect(a.kare?.ilceler).toEqual(b.kare?.ilceler);

    // Sahiplenilmiş hücre ikinci kez alınamaz (çekirdek kuralı; başarısız komut günlükte ama durumu değiştirmez).
    const rb = await b.komut("p2", { tur: "parsel_al", ilce: ILCE, hucreler: [H1], sinif: "kirsal" });
    expect(rb.tur === "komutSonucu" && !rb.sonuc.tamam).toBe(true);

    // İşletme düğümü (ali'nin) ve arazi kaydı: yalnız ali'de, özel veriyle.
    const isletme = ts.yazar.sim.dunya.bolgeler.find((x) => x.sahip === "ali");
    expect(isletme?.id).toBe("sn_m_ova#ali");
    await kareBekle(a, () => a.kare?.bolgeler.some((x) => x.id === "sn_m_ova#ali" && x.ozel !== undefined) === true);
    expect(a.kare?.oyuncu?.mulk?.araziDegeriMili).toBeGreaterThan(0);
    expect(a.kare?.oyuncu?.mulk?.ilceHucre).toEqual([[ILCE, 2]]);
    expect(b.kare?.bolgeler.some((x) => x.id === "sn_m_ova#ali")).toBe(false);
    expect(b.kare?.oyuncu?.mulk?.ilceHucre).toEqual([]);

    // Hücreli inşaat: herkes hücre üzerindeki inşaatı görür.
    const ri = await a.komut("i1", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: [H1, H2] });
    expect(ri.tur === "komutSonucu" && ri.sonuc.tamam).toBe(true);
    const insaatVar = (k: IlgiKaresi | null) => (hucreler(k) as Array<[string, string, string, number, number]> | undefined)?.every((h) => h[4] >= 0) === true;
    await kareBekle(b, () => insaatVar(b.kare));

    // İl aboneliği: ilin ilçeleri + merkez bölge (genel veri).
    const c = await ts.baglan("izleyici");
    c.gonder({ tur: "abone", iller: ["sn_m_ova"] });
    const kc = await c.bekle((m) => m.tur === "kare" || m.tur === "hata");
    expect(kc.tur).toBe("kare");
    if (kc.tur === "kare") {
      expect(kc.ilceIlgisi).toEqual(["sn_m_ova_merkez", "sn_m_ova_tasra"]);
      expect(kc.kare.bolgeler.map((x) => x.id)).toEqual(["m_ova"]);
    }
    c.gonder({ tur: "abone", ilceler: ["yok_ilce"] });
    const h = await c.bekle((m) => m.tur === "hata");
    expect(h.tur === "hata" && h.kod).toBe("gecersiz_ilgi");

    const oz = await y.zamanIlerlet(6 * SAAT);
    const [oa, ob] = await Promise.all([a.ozet(), b.ozet()]);
    expect(oa.durumOzeti).toBe(ob.durumOzeti);
    expect(oa.durumOzeti).toBe(oz.durumOzeti);
    expect(a.sorunlar).toEqual([]);
    expect(b.sorunlar).toEqual([]);

    // Kurtarma (mülk kipi): açılış görüntüsü + bütün günlük → aynı t'de aynı özet.
    const k = await DunyaYazari.ac({ veri: mulkVerisi(), tohum: 1, depo: ts.depo, saat: new ElleSaat() });
    expect(k.kurtarma.kalanKayit).toBeGreaterThan(0);
    k.sim.calistirKadar(6 * SAAT);
    expect(k.ozet().durumOzeti).toBe(oz.durumOzeti);
  });
});

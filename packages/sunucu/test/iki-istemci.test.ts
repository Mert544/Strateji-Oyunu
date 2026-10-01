/**
 * (c) İki WebSocket istemcisi aynı dünyayı görür: biri komut gönderir; ikisinin karesinde aynı genel sonuç ve aynı
 * `durumOzeti`. Özel veri (stok formülü, hazine) yalnız sahibine gider; formülden ara değer canlı dünyayla aynıdır.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, anlikMiktar } from "@bolge/cekirdek";
import { stokAraDeger } from "@bolge/protokol";
import type { IlgiKaresi } from "@bolge/protokol";
import { GUNEY, KUZEY, TUM_BOLGELER, kareBekle, katil, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

function genel(k: IlgiKaresi | null): unknown {
  return k?.bolgeler.map((b) => ({ i: b.i, genel: b.genel }));
}

describe("iki istemci", () => {
  it("komut sonucu iki karede de gorunur; durumOzeti esit; ozel veri yalniz sahibine", async () => {
    ts = await testSunucusu();
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", KUZEY);
    await katil(y, "veli", GUNEY);
    const a = await ts.baglan("ali");
    const b = await ts.baglan("veli");
    const ka = await a.abone(TUM_BOLGELER);
    const kb = await b.abone(TUM_BOLGELER);
    expect(ka.ilgi).toEqual([0, 1, 2, 3, 4, 5]);
    expect(genel(a.kare)).toEqual(genel(b.kare));

    const ova = ts.yazar.sim.ic.bolgeIndeks["m_ova"] as number;
    // Anında görünen genel etki: savunma duruşu.
    const r1 = await a.komut("s1", { tur: "savunma_emri", bolge: "m_ova", durus: "savunma" });
    expect(r1.tur === "komutSonucu" && r1.sonuc.tamam).toBe(true);
    const durus = (k: IlgiKaresi | null) => k?.bolgeler.find((x) => x.i === ova)?.genel.durus;
    await kareBekle(a, () => durus(a.kare) === 1);
    await kareBekle(b, () => durus(b.kare) === 1);

    // Zamanla görünen etki: inşaat biter, tesis siluet olarak herkese görünür.
    const tesis0 = ts.yazar.sim.dunya.bolgeler[ova]?.tesisler.length ?? 0;
    const r2 = await a.komut("t1", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
    expect(r2.tur === "komutSonucu" && r2.sonuc.tamam).toBe(true);
    const oz = await y.zamanIlerlet(6 * SAAT);
    const tesisSayisi = (k: IlgiKaresi | null) => k?.bolgeler.find((x) => x.i === ova)?.genel.tesisler.length;
    expect(ts.yazar.sim.dunya.bolgeler[ova]?.tesisler.length).toBe(tesis0 + 1);
    await kareBekle(a, () => tesisSayisi(a.kare) === tesis0 + 1);
    await kareBekle(b, () => tesisSayisi(b.kare) === tesis0 + 1);
    expect(genel(a.kare)).toEqual(genel(b.kare));

    // Aynı dünya: iki istemcinin istediği özet aynı (ve yöneticinin zamanIlerlet yanıtıyla aynı).
    const [oa, ob] = await Promise.all([a.ozet(), b.ozet()]);
    expect(oa.durumOzeti).toBe(ob.durumOzeti);
    expect(oa.t).toBe(6 * SAAT);
    expect(oa.durumOzeti).toBe(oz.durumOzeti);
    expect(oa.durumOzeti).toBe(ts.yazar.sim.durumOzeti());

    // Özel veri: ali yalnız kendi bölgelerinin özelini ve kendi hazinesini görür; veli ali'nin özelini görmez.
    const ozelA = a.kare?.bolgeler.filter((x) => x.ozel).map((x) => x.i);
    const ozelB = b.kare?.bolgeler.filter((x) => x.ozel).map((x) => x.i);
    expect(ozelA).toEqual([0, 1, 2]);
    expect(ozelB).toEqual([3, 4, 5]);
    expect(a.kare?.oyuncu?.id).toBe("ali");
    expect(b.kare?.oyuncu?.id).toBe("veli");
    // Yönetici abone olmadıysa kare almaz; abone olunca yalnız genel veri.
    const ky = await y.abone(TUM_BOLGELER);
    expect(ky.kare.bolgeler.every((x) => x.ozel === undefined) && ky.kare.oyuncu === undefined).toBe(true);

    // Formülden ara değer = canlı dünyanın anlık değeri (daha ileri bir t'de; oran değişmediği sürece).
    const d = ts.yazar.sim.dunya;
    const ileri = d.zaman + 17 * 60_000;
    for (const x of a.kare?.bolgeler ?? []) {
      x.ozel?.stoklar.forEach((f, m) => {
        const s = d.bolgeler[x.i]?.stoklar[m];
        if (s) expect(stokAraDeger(f, ileri)).toBe(anlikMiktar(s, ileri));
      });
    }
    const hz = d.oyuncular.find((o) => o.id === "ali")?.hazine;
    if (hz && a.kare?.oyuncu) expect(stokAraDeger(a.kare.oyuncu.hazine, ileri)).toBe(anlikMiktar(hz, ileri));

    // Delta zinciri hiç kopmadı; tüm sunucu mesajları şemaya uydu.
    expect(a.sorunlar).toEqual([]);
    expect(b.sorunlar).toEqual([]);
    expect(kb.rev).toBe(1);
    expect(b.rev).toBeGreaterThan(1);
  });

  it("ilgi alani: yalniz abone olunan + kendi bolgeler; bilinmeyen bolge ve il reddedilir", async () => {
    ts = await testSunucusu();
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", KUZEY);
    const a = await ts.baglan("ali");
    const k = await a.abone(["m_sehir"]);
    expect(k.ilgi).toEqual([0, 1, 2, 5]);
    expect(k.kare.bolgeler.find((x) => x.i === 5)?.ozel).toBeUndefined();
    await expect(a.abone(["yok_bolge"])).rejects.toThrow(/bilinmeyen bolge/);
    a.gonder({ tur: "abone", iller: ["41"] });
    const h = await a.bekle((m) => m.tur === "hata");
    expect(h.tur === "hata" && h.kod).toBe("gecersiz_ilgi");
  });
});

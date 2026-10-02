/**
 * Defter GÖSTERİM sırası (`DEFTER_GOSTERIM_SIRASI`): çiftlik → Pazar'da sat → dükkân → ham malı işle → ekmek → zincir → pencere. `DEFTER_ODUL_SIRASI` (ve onu pinleyen donmuş testler),
 * `DefterSemasi` ve ödül kazanımı DEĞİŞMEZ: gösterim sırası eskisinin PERMÜTASYONUDUR (eksik/fazla kavram yok); eski istemci `siradaki`yi sunucunun yazdığı sırayla çizer.
 */
import { describe, expect, it } from "vitest";
import { DEFTER_DAMGALARI, DEFTER_GOSTERIM_SIRASI, DEFTER_ODUL_SIRASI, DefterSemasi, defterSablonu, sunucuMesajiCoz } from "../src";

describe("DEFTER_GOSTERIM_SIRASI", () => {
  it("DEFTER_ODUL_SIRASI'nin permutasyonu: ayni kavramlar, eksik ya da fazla yok, tekrar yok; ODUL_SIRASI bicimi degismedi", () => {
    expect([...DEFTER_GOSTERIM_SIRASI].sort()).toEqual([...DEFTER_ODUL_SIRASI].sort());
    expect(new Set(DEFTER_GOSTERIM_SIRASI).size).toBe(DEFTER_GOSTERIM_SIRASI.length);
    expect(DEFTER_GOSTERIM_SIRASI).toHaveLength(DEFTER_ODUL_SIRASI.length);
    expect(DEFTER_ODUL_SIRASI).toEqual(["ilk_yapi", "ilk_satis", "ilk_isleme", "ilk_ekmek", "zincir_kapandi", "ilk_dukkan", "ilk_pencere", "ilk_sozlesme", "ikinci_ilce", "ilk_arastirma"]); // donmus sira
    for (const d of DEFTER_DAMGALARI) expect((DEFTER_GOSTERIM_SIRASI as readonly string[]).includes(d)).toBe(false); // damgalar odul sirasina girmez
  });

  it("A1 ilk saat akisi: ciftlik, Pazar'da sat, dukkan, ham mali isle, ekmek, zincir, pencere; kalanlar eski goreli sirada", () => {
    const g = [...DEFTER_GOSTERIM_SIRASI] as string[];
    expect(g.slice(0, 7)).toEqual(["ilk_yapi", "ilk_satis", "ilk_dukkan", "ilk_isleme", "ilk_ekmek", "zincir_kapandi", "ilk_pencere"]);
    expect(g.indexOf("ilk_dukkan")).toBeLessThan(g.indexOf("ilk_isleme")); // isleme dukkandan SONRA
    // Degismeyen kavramlarin goreli sirasi eskisiyle ayni (sozlesme, ikinci ilce, arastirma sonda)
    const kalan = (l: readonly string[]) => l.filter((k) => ["ilk_sozlesme", "ikinci_ilce", "ilk_arastirma"].includes(k));
    expect(kalan(g)).toEqual(kalan(DEFTER_ODUL_SIRASI));
    expect(g.slice(7)).toEqual(["ilk_sozlesme", "ikinci_ilce", "ilk_arastirma"]);
  });

  it("eski istemci uyumu: siradaki yeni sirayla da AYNI sema ile gecerli; sema siralama dayatmaz (sunucunun sirasi aynen gelir)", () => {
    const siradaki = DEFTER_GOSTERIM_SIRASI.map((k) => ({ kavram: k, sablon: defterSablonu(k), etkin: true, odul: { paraMili: 1, degerMili: 1 } }));
    const yuk = { tur: "defter", kazanilan: [], siradaki, toplamOdulMili: 0, tavanMili: 8_000_000 };
    const { tur: _t, ...govde } = yuk; // DefterSemasi mesaj govdesidir (tur yok); tum mesaj asagida sunucuMesajiCoz'dan gecer
    expect(DefterSemasi.safeParse(govde).success).toBe(true);
    const c = sunucuMesajiCoz(JSON.stringify(yuk));
    expect(c.tamam).toBe(true);
    expect(c.tamam && c.mesaj.tur === "defter" ? c.mesaj.siradaki.map((s) => s.kavram) : null).toEqual([...DEFTER_GOSTERIM_SIRASI]); // sira korunur (istemci yeniden siralamaz)
    // Eski (donmus) siradaki da gecerli
    expect(DefterSemasi.safeParse({ ...govde, siradaki: DEFTER_ODUL_SIRASI.map((k) => ({ kavram: k, sablon: defterSablonu(k), etkin: true, odul: { paraMili: 1, degerMili: 1 } })) }).success).toBe(true);
  });
});

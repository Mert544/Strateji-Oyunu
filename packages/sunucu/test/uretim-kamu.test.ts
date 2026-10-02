/**
 * ÜRETİM yapılandırması, gerçek arsa ızgarası (Gebze, Gemlik, Körfez; WS düzeyi): KAMU ARSASI komutla reddedilir (K6) ve ilçe tavanına sayılmaz.
 *  - her ilçede, her kamu TÜRÜNDEN (mahalle paketi, ilçe merkezi, kıyı şeridi, hazine rezervi...) bir hücre: `parsel_al` ve `yapi_yerlestir` (dükkân) `hucre kamu arsasi (satilmaz): <hücre> (<tür>, <sahip>)` ile
 *    reddedilir; ret dünyayı değiştirmez (özet, hazine, ilçe satılmışı, oyuncunun ilçe hücre sayacı aynı);
 *  - kamu hücreleri `uygunHucre`'den düşülmüştür (72 / %25 tavanının paydası): `ilce.uygunHucre = fikstür uygun - kamu hücre sayısı`;
 *  - yeniden oynatma: başarılı komutlar günlükten oynatılınca özet canlı dünyayla AYNI (reddedilen komut günlüğe girmez).
 */
import { afterEach, describe, expect, it } from "vitest";
import { Simulasyon, kamuHucreleri } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";
import { ILCELER, MANIFEST_VAR, ilceyeKatil, uretimVerisi } from "./uretim-yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

describe.skipIf(!MANIFEST_VAR)("üretim yapılandırması: kamu arsası gerçek ızgarada (WS)", () => {
  it("K6: üç ilçede her kamu türünden hücre `parsel_al` ve `yapi_yerlestir` ile reddedilir; dünya değişmez; kamu uygunHucre'den düşülmüş; oynatma özeti eşit", async () => {
    const veri = uretimVerisi();
    ts = await testSunucusu({ veri });
    const sim = ts.yazar.sim;
    const sonuclar: string[] = [];
    for (const ilce of ILCELER) {
      const oyuncu = `kamu_${ilce}`;
      const { ist } = await ilceyeKatil(ts, oyuncu, ilce);
      const gruplar = kamuHucreleri(sim.dunya, ilce);
      expect(gruplar.length, `${ilce}: kamu grupları`).toBeGreaterThan(0);
      // ilçe başına her kamu TÜRÜNDEN bir hücre
      const turler = new Map<string, { hucre: string; sahip: string }>();
      for (const g of gruplar) if (!turler.has(g.tur) && g.hucreler.length > 0) turler.set(g.tur, { hucre: g.hucreler[0] as string, sahip: g.sahip });
      expect(turler.size, `${ilce}: kamu türü`).toBeGreaterThanOrEqual(2);
      const ilceDurumu = (): { satilmisHucre: number; uygunHucre: number } => sim.dunya.mulk!.ilceler.find((c) => c.id === ilce)!;
      let n = 0;
      for (const [tur, { hucre, sahip }] of turler) {
        sim.calistirKadar(sim.dunya.zaman);
        const once = sim.durumOzeti();
        const hazine = sim.dunya.oyuncular.find((o) => o.id === oyuncu)!.hazine.miktar;
        const satilmis = ilceDurumu().satilmisHucre;
        const sayac = sim.dunya.mulk!.oyuncular.find((o) => o.id === oyuncu)!.ilceHucre;
        const beklenen = `hucre kamu arsasi (satilmaz): ${hucre} (${tur}, ${sahip})`;
        for (const komut of [
          { tur: "parsel_al", ilce, hucreler: [hucre], sinif: "kirsal" },
          { tur: "yapi_yerlestir", ilce, tesisTuru: "dukkan", dukkanTuru: "bakkal", hucreler: [hucre], sinif: "kirsal" },
        ] as Komut[]) {
          const r = await ist.komut(`kamu-${ilce}-${tur}-${n++}`, komut);
          expect(r.tur, `${ilce}/${tur}/${komut.tur}`).toBe("komutSonucu");
          if (r.tur === "komutSonucu") {
            expect(r.sonuc.tamam, `${ilce}/${tur}/${komut.tur}: reddedilmeliydi`).toBe(false);
            expect((r.sonuc as { hata: string }).hata, `${ilce}/${tur}/${komut.tur}`).toBe(beklenen);
          }
        }
        // ret dünyayı değiştirmez; kamu hücresi hiçbir sayaca girmez (72 / %25 tavanı)
        sim.calistirKadar(sim.dunya.zaman);
        expect(sim.durumOzeti(), `${ilce}/${tur}: özet`).toBe(once);
        expect(sim.dunya.oyuncular.find((o) => o.id === oyuncu)!.hazine.miktar).toBe(hazine);
        expect(ilceDurumu().satilmisHucre).toBe(satilmis);
        expect(sim.dunya.mulk!.oyuncular.find((o) => o.id === oyuncu)!.ilceHucre).toEqual(sayac);
        expect(sim.dunya.mulk!.hucreler.some((h) => h.id === hucre)).toBe(false);
        sonuclar.push(`${ilce}/${tur}`);
      }
      // kamu hücreleri uygunHucre'den düşülmüş (tavan paydası): fikstür uygun - kamu hücre sayısı
      const kamuSayisi = gruplar.reduce((t, g) => t + g.hucreler.length, 0);
      const fikstur = sim.ic.mulk!.ilceler.get(ilce)!;
      expect(ilceDurumu().uygunHucre, `${ilce}: uygunHucre`).toBe(fikstur.uygunHucre - kamuSayisi);
      expect(kamuSayisi).toBeGreaterThan(0);
    }
    expect(sonuclar.length).toBeGreaterThanOrEqual(6); // 3 ilçe x en az 2 kamu türü
    // yeniden oynatma: başarılı komutlar (katılımlar) günlükten oynatılır; reddedilenler günlükte yok
    sim.calistirKadar(sim.dunya.zaman);
    expect(sim.gunluk.every((g) => g.komut.tur === "oyuncu_katil")).toBe(true);
    const oynat = Simulasyon.yenidenOynat(uretimVerisi(), 1, sim.gunluk);
    oynat.calistirKadar(sim.dunya.zaman);
    expect(oynat.durumOzeti()).toBe(sim.durumOzeti());
  }, 300_000);
});

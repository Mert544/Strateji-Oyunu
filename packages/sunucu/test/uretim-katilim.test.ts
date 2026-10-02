/**
 * ÜRETİM yapılandırması (gerçek harita + gerçek arsa ızgarası manifesti: Gemlik, Gebze, Körfez; WS düzeyi): yurtlu katılım üç ilçede.
 * `f4-uctan-uca --uretim` tarayıcı koşusunun sunucu tarafı kanıtı (Playwright'sız): oyuncu kendi `katil {ilce}` mesajını gönderir, bedava yurt (yeni oyuncu paketi) o ilçede verilir:
 * sahip, ilçe, hücre sayısı (`yurtHucre`), bedel 0, kamu arsası değil, kenar-bitişik tek küme; işletme düğümü açılır; oyuncu karesi `katilimIlcesi` taşır; başka ilçe/oyuncu sızmaz.
 * Ağır olduğu için (Gebze > 500 bin hücre) `izgara-gercek.test.ts` katılımı koşmaz; burada tek sunucu, üç katılım.
 */
import { afterEach, describe, expect, it } from "vitest";
import { hucreXY, kenarBitisikMi } from "@bolge/cekirdek";
import { kareBekle, kamuKumesi, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";
import { ILCELER, MANIFEST_VAR, ilceyeKatil, uretimVerisi } from "./uretim-yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

describe.skipIf(!MANIFEST_VAR)("üretim yapılandırması: gerçek ızgarada yurtlu katılım (WS)", () => {
  it("üç ilçe: oyuncu katil {ilce} -> bedava yurt o ilçede (6 hücre, bedel 0, kamu değil, bitişik), işletme düğümü, katilimIlcesi yalnız sahibinde", async () => {
    const veri = uretimVerisi();
    const yurtHucre = veri.param.mulk?.yeniOyuncu.yurtHucre ?? 0;
    expect(yurtHucre).toBeGreaterThan(0); // yurtlu katılım: üretim paketinde bedava yurt AÇIK
    ts = await testSunucusu({ veri });
    const oyuncular = ILCELER.map((ilce, i) => ({ ilce, id: `oyuncu_${i}` }));
    const istemciler = new Map<string, Awaited<ReturnType<TestSunucusu["baglan"]>>>();
    for (const { ilce, id } of oyuncular) {
      const ist = await ts.baglan(id);
      istemciler.set(id, ist);
      const r = await ist.katil(`katil-${id}`, ilce);
      expect(r.tur, `${ilce}: ${JSON.stringify(r)}`).toBe("komutSonucu");
      if (r.tur === "komutSonucu") {
        expect(r.sonuc.tamam, `${ilce}: ${JSON.stringify(r.sonuc)}`).toBe(true);
        expect(r.komut).toEqual({ tur: "oyuncu_katil", oyuncu: id, bolgeler: [], ilce });
      }
    }
    const dunya = ts.yazar.sim.dunya;
    for (const { ilce, id } of oyuncular) {
      const hucreler = (dunya.mulk?.hucreler ?? []).filter((h) => h.sahip === id);
      expect(hucreler, `${ilce}: yurt hücre sayısı`).toHaveLength(yurtHucre);
      for (const h of hucreler) {
        expect(h.ilce, `${ilce}: yurt ilçede`).toBe(ilce);
        expect(h.degerMili, "yurt bedava").toBe(0);
        expect(kamuKumesi(ts.yazar.sim, ilce).has(h.id), `${h.id} kamu arsası değil`).toBe(false);
      }
      const xy = hucreler.map((h) => hucreXY(h.id));
      expect(kenarBitisikMi(hucreler.map((h) => h.id)), `${ilce}: yurt kenar-bitişik tek küme`).toBe(true);
      expect(xy.every((p) => Number.isInteger(p[0]) && Number.isInteger(p[1]))).toBe(true);
      const mo = dunya.mulk?.oyuncular.find((o) => o.id === id);
      expect(mo?.katilimIlcesi).toBe(ilce);
      expect(mo?.araziDegeriMili).toBe(0);
      expect(dunya.mulk?.isletmeler.some((x) => x.oyuncu === id)).toBe(true);
    }
    // oyuncu karesi: katılım ilçesi yalnız sahibinde; başkasınınki sızmaz
    for (const { ilce, id } of oyuncular) {
      const ist = istemciler.get(id)!;
      const k = await ist.abone([]);
      await kareBekle(ist, () => ist.kare?.oyuncu?.mulk !== undefined);
      expect(k.kare.oyuncu?.mulk?.katilimIlcesi, id).toBe(ilce);
      const ham = JSON.stringify(ist.gelenler);
      for (const { ilce: baska } of oyuncular) if (baska !== ilce) expect(ham, `${id}: ${baska} sızmamalı`).not.toContain(`"katilimIlcesi":"${baska}"`);
    }
  }, 300_000);
  it("K2: 20 ardışık katılım (üç ilçeye dağıtılmış 7 / 7 / 6): ret 0, katılım isteği zaman aşımına girmez, her yurt 6 bitişik hücre ve hiçbir hücre iki oyuncuda değil; süre raporlu", async () => {
    const veri = uretimVerisi();
    const yurtHucre = veri.param.mulk?.yeniOyuncu.yurtHucre ?? 0;
    ts = await testSunucusu({ veri });
    const sureler: Record<string, number[]> = { tr_41_gebze: [], tr_16_gemlik: [], tr_41_korfez: [] };
    const sahipler: { id: string; ilce: string }[] = [];
    for (let i = 0; i < 20; i++) {
      const ilce = ILCELER[i % 3] as string;
      const id = `k2_${i}`;
      const { sureMs } = await ilceyeKatil(ts, id, ilce); // reddedilirse Error: ret 0
      (sureler[ilce] as number[]).push(sureMs);
      sahipler.push({ id, ilce });
    }
    const dunya = ts.yazar.sim.dunya;
    const kullanilan = new Set<string>();
    for (const { id, ilce } of sahipler) {
      const hucreler = (dunya.mulk?.hucreler ?? []).filter((h) => h.sahip === id);
      expect(hucreler, `${id}/${ilce}`).toHaveLength(yurtHucre);
      expect(kenarBitisikMi(hucreler.map((h) => h.id)), `${id}: bitişik`).toBe(true);
      for (const h of hucreler) {
        expect(h.ilce).toBe(ilce);
        expect(kullanilan.has(h.id), `${h.id} iki oyuncuda`).toBe(false);
        kullanilan.add(h.id);
      }
    }
    expect(kullanilan.size).toBe(20 * yurtHucre);
    // Süre raporu (ilçe başına en az / medyan / en çok, ms): katılım isteği zaman aşımına (varsayılan 10 sn bekleme) girmedi; üst sınır 20 sn.
    const rapor = Object.entries(sureler).map(([ilce, l]) => {
      const sirali = [...l].sort((a, b) => a - b);
      return `${ilce}: n=${l.length} en az ${sirali[0]} / medyan ${sirali[Math.floor(sirali.length / 2)]} / en çok ${sirali[sirali.length - 1]} ms`;
    });
    console.log(`K2 katılım süresi (WS, tek sunucu, ardışık): ${rapor.join(" | ")}`);
    for (const l of Object.values(sureler)) for (const ms of l) expect(ms).toBeLessThan(20_000);
  }, 600_000);
});

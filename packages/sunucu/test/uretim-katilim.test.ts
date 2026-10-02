/**
 * ÜRETİM yapılandırması (gerçek harita + gerçek arsa ızgarası manifesti: Gemlik, Gebze, Körfez; WS düzeyi): yurtlu katılım üç ilçede.
 * `f4-uctan-uca --uretim` tarayıcı koşusunun sunucu tarafı kanıtı (Playwright'sız): oyuncu kendi `katil {ilce}` mesajını gönderir, bedava yurt (yeni oyuncu paketi) o ilçede verilir:
 * sahip, ilçe, hücre sayısı (`yurtHucre`), bedel 0, kamu arsası değil, kenar-bitişik tek küme; işletme düğümü açılır; oyuncu karesi `katilimIlcesi` taşır; başka ilçe/oyuncu sızmaz.
 * Ağır olduğu için (Gebze > 500 bin hücre) `izgara-gercek.test.ts` katılımı koşmaz; burada tek sunucu, üç katılım.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { hucreXY, kenarBitisikMi } from "@bolge/cekirdek";
import { gercekVeriyiYukle } from "@bolge/veri";
import { hiyerarsiOku, izgaraGirdisiKur, izgaraManifestiOku, izgaralariYukle, izgarayiVeriyeBagla, varsayilanIzgaraBagimliliklari, varsayilanIzgaraKoku } from "../src/izgara/manifest";
import { kareBekle, kamuKumesi, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

const MANIFEST = fileURLToPath(new URL("../../veri/haritalar/odbl/izgara/manifest.json", import.meta.url));
const ILCELER = ["tr_41_gebze", "tr_16_gemlik", "tr_41_korfez"] as const;

/** CLI'nin `--izgara-manifest` kurulumunun aynısı (`f4-sunucu.ts manifestVerisi` ile aynı): gerçek veri paketi + manifesttteki bütün ilçeler. */
function uretimVerisi(): CekirdekVeriPaketi {
  const kok = varsayilanIzgaraKoku(MANIFEST);
  const yuklenen = izgaralariYukle(izgaraManifestiOku(MANIFEST), kok, varsayilanIzgaraBagimliliklari);
  const veri = gercekVeriyiYukle();
  izgarayiVeriyeBagla(veri, izgaraGirdisiKur(yuklenen, { ad: "izgara-manifest", harita: veri.harita.ad, hiyerarsi: hiyerarsiOku(`${kok}/hiyerarsi.json`), haritaBolgeleri: new Set(veri.harita.bolgeler.map((b) => b.id)) }));
  return veri;
}

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

describe.skipIf(!existsSync(MANIFEST))("üretim yapılandırması: gerçek ızgarada yurtlu katılım (WS)", () => {
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
});

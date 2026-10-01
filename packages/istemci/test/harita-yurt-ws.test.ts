/**
 * Yurt önce + ilk-yapı indirimi GERÇEK sunucuya karşı: taze oyuncu katılım ilçesinde bedava yurtla başlar; ilk Çiftliğini yurdunda
 * (kendi boş hücreleri) kurar: arsa parası düşmez, önizlenen bedel (indirimli 4.200 ₺) gerçek hazine düşüşüne birebir eşittir.
 * İndirim AÇIK: ilk iki yapı indirimli, üçüncüde indirim yok; önizleme her seferinde gerçek bedele eşit.
 */
import { afterEach, describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { Bit } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { yapiKatalogu } from "../src/harita/yapi";
import type { YerlesimBaglami } from "../src/harita/yapi";
import { yurtBosHucreler, yurtPlani } from "../src/harita/yurt";
import { yerlesimiUygula } from "../src/harita/zincir";

const ILCE = "sn_m_ova_merkez";
const fiks = parselFiksturuYukle("mini-6").ilceler.find((c) => c.id === ILCE)!;
const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const ciftlik = yapiKatalogu(ic).find((y) => y.id === "ciftlik")!;

let ts: TestSunucusu | null = null;
const acilanlar: WsBaglanti[] = [];
afterEach(async () => {
  for (const b of acilanlar.splice(0)) b.kapat();
  await ts?.kapat();
  ts = null;
});

async function bekle(kosul: () => boolean | Promise<boolean>, ms = 10_000): Promise<void> {
  const son = Date.now() + ms;
  while (!(await kosul())) {
    if (Date.now() > son) throw new Error("koşul zamanında sağlanmadı");
    await new Promise((c) => setTimeout(c, 15));
  }
}

function fiksturIzgarasi(): Izgara {
  const xy = (id: string): [number, number] => id.split(":").map(Number) as [number, number];
  const hucreler = fiks.hucreler.map((h) => ({ h, c: xy(h.id) }));
  const x0 = Math.min(...hucreler.map((k) => k.c[0]));
  const y0 = Math.min(...hucreler.map((k) => k.c[1]));
  const genislik = Math.max(...hucreler.map((k) => k.c[0])) - x0 + 1;
  const yukseklik = Math.max(...hucreler.map((k) => k.c[1])) - y0 + 1;
  const durum = new Uint8Array(genislik * yukseklik);
  const sinifBit = { kirsal: 1 << 5, kasaba: 2 << 5, sehir: 3 << 5 } as const;
  for (const { h, c } of hucreler) {
    let d: number = Bit.ICERIDE | sinifBit[h.sinif];
    if (h.engel === "su") d |= Bit.SU;
    else if (h.engel === "askeri") d |= Bit.ASKERI;
    else if (h.engel === "yol") d |= Bit.YOL;
    durum[(c[1] - y0) * genislik + (c[0] - x0)] = d;
  }
  return { x0, y0, genislik, yukseklik, durum };
}

describe("yurt önce: gerçek sunucu", () => {
  it("ilk Çiftlik yurtta (arsa parası yok), indirimli önizleme = gerçek düşüş; 3. yapıda indirim yok, yine eşit", async () => {
    const v = mulkVerisi();
    v.param.mulk!.yeniOyuncu.yurtHucre = 6; // bedava yurt açık
    v.param.mulk!.yeniOyuncu.indirimliYapiSayisi = 2; // ilk iki yapı indirimli
    v.param.mulk!.yeniOyuncu.baslangicStok["parca"] = 400_000; // çiftlikler bakım için parça tüketir: üçüncü yapıya yetsin
    const ppm = v.param.mulk!.yeniOyuncu.ilkYapiIndirimPpm;
    expect(ppm).toBe(300_000);
    ts = await testSunucusu({ veri: v });
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    const a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "t-ali", geriCekilmeMs: { ilk: 30, en: 100 } });
    acilanlar.push(a);
    expect((await a.katil(ILCE)).tamam).toBe(true);
    await bekle(() => a.ozet()?.indirimliYapiKalan === 2);
    const iz = fiksturIzgarasi();
    const hazine = (): number => a.ozet()!.hazineMili!;

    const bag = async (): Promise<YerlesimBaglami> => {
      const sh = (await a.sahiplikAl(ILCE))!;
      const oz = a.ozet()!;
      return { izgara: iz, sahiplik: sh, ben: "ali", ad: (s) => s, hazineMili: oz.hazineMili, surenInsaat: oz.surenInsaat, ...(oz.indirimliYapiKalan != null ? { indirim: { ppm, kalan: oz.indirimliYapiKalan } } : {}) };
    };

    const sh0 = (await a.sahiplikAl(ILCE))!;
    expect(yurtBosHucreler(sh0, "ali")).toHaveLength(6);

    // 1. yapı: yurtta, indirimli
    const b1 = await bag();
    const y1 = yurtPlani(ciftlik, b1);
    expect(y1.plan?.gecerli, y1.plan?.neden ?? y1.neden).toBe(true);
    expect(y1.plan).toMatchObject({ indirimli: true, yapiMili: 4_200_000, arsaMili: 0, alinacak: [], parseller: [], toplamMili: 4_200_000 });
    let once = hazine();
    const r1 = await yerlesimiUygula(a, ILCE, y1.plan!);
    expect(r1.tamam, r1.mesaj).toBe(true);
    expect(r1.alinan).toEqual([]);
    await bekle(() => a.ozet()!.surenInsaat === 1);
    expect(once - hazine()).toBe(4_200_000);
    expect(hazine()).toBe(50_000_000 - 4_200_000);
    await bekle(() => a.ozet()?.indirimliYapiKalan === 1);

    // 2. yapı: yurtta, hâlâ indirimli
    const b2 = await bag();
    const y2 = yurtPlani(ciftlik, b2);
    expect(y2.bos).toBe(4);
    expect(y2.plan?.gecerli, y2.plan?.neden ?? y2.neden).toBe(true);
    expect(y2.plan).toMatchObject({ indirimli: true, yapiMili: 4_200_000, arsaMili: 0 });
    once = hazine();
    expect((await yerlesimiUygula(a, ILCE, y2.plan!)).tamam).toBe(true);
    await bekle(() => a.ozet()!.surenInsaat === 2);
    expect(once - hazine()).toBe(4_200_000);
    await bekle(() => a.ozet()?.indirimliYapiKalan === 0);

    // inşaatlar biter; 3. yapı: indirim yok (6.000 ₺), önizleme yine gerçek bedele eşit
    await y.zamanIlerlet(ts.yazar.sim.dunya.zaman + 24 * SAAT);
    await bekle(() => a.ozet()!.surenInsaat === 0 && a.ozet()!.simZamani >= ts!.yazar.sim.dunya.zaman);
    const b3 = await bag();
    const y3 = yurtPlani(ciftlik, b3);
    expect(y3.plan?.gecerli, y3.plan?.neden ?? y3.neden).toBe(true);
    expect(y3.plan).toMatchObject({ indirimli: false, yapiMili: 6_000_000, arsaMili: 0 });
    once = hazine();
    const r3 = await yerlesimiUygula(a, ILCE, y3.plan!);
    expect(r3.tamam, r3.mesaj).toBe(true);
    await bekle(() => a.ozet()!.surenInsaat === 1);
    expect(once - hazine()).toBe(6_000_000);
    expect(a.sunucuHatalari).toEqual([]);
  });
});

/** Yürüyüş için gerçek yapılar: saf eşleme (`yapilardanInsaatlar`) ve GERÇEK sunucuya karşı `insaatlarAl` (kendi tesisin, dükkân ve markası, başkasının yapısı görünür). */
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
import type { YapiKaydi } from "../src/harita/baglanti";
import { Bit } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { yapiKatalogu } from "../src/harita/yapi";
import type { YerlesimBaglami } from "../src/harita/yapi";
import { yapilardanInsaatlar } from "../src/harita/yapi-yuruyus";
import { yurtPlani } from "../src/harita/yurt";
import { yerlesimiUygula } from "../src/harita/zincir";

const SA = 3_600_000;

describe("yapilardanInsaatlar (saf)", () => {
  const y = (o: Partial<YapiKaydi>): YapiKaydi => ({ id: 1, anahtar: "t1", durum: "tesis", sahip: "ali", hucreler: ["10:10", "11:10"], ...o });
  const g = (yapilar: YapiKaydi[], dukkan: (id: number) => { tur: string; markaRenk?: number } | undefined = () => undefined) => yapilardanInsaatlar({ yapilar, simdi: 10 * SA, dukkan });

  it("biten tesis: hücre başına Tamam (3); yöntem silüet için; dükkân gövde yerine dükkân (tür, marka rengi); markasızda renk yok", () => {
    expect(g([y({ yontem: "degirmen" })])).toEqual([
      { hucre: "10:10", asama: 3, yontem: "degirmen" },
      { hucre: "11:10", asama: 3, yontem: "degirmen" },
    ]);
    const d = g([y({ id: 5, hucreler: ["1:1"], yontem: "degirmen" })], (id) => (id === 5 ? { tur: "bakkal", markaRenk: 4 } : undefined));
    expect(d).toEqual([{ hucre: "1:1", asama: 3, dukkan: { tur: "bakkal", markaRenk: 4 } }]);
    expect(g([y({ id: 6, hucreler: ["2:2"] })], () => ({ tur: "firin" }))[0]).toEqual({ hucre: "2:2", asama: 3, dukkan: { tur: "firin" } });
  });

  it("süren inşaat: aşama süreden (başlangıç, bitiş), Tamam değil; dükkân ve yöntem yazılmaz", () => {
    const l = g([y({ id: 7, anahtar: "i7", durum: "insaat", hucreler: ["3:3"], baslangic: 9 * SA, bitis: 12 * SA, yontem: "degirmen" })], () => ({ tur: "bakkal" }));
    expect(l).toEqual([{ hucre: "3:3", asama: 1 }]); // 10. saat: 1/3 -> İskele
    expect(g([y({ id: 8, anahtar: "i8", durum: "insaat", hucreler: ["4:4"], baslangic: 9.9 * SA, bitis: 12 * SA })])[0]!.asama).toBe(0);
    expect(g([y({ id: 9, anahtar: "i9", durum: "insaat", hucreler: ["5:5"], baslangic: 8 * SA, bitis: 10.5 * SA })])[0]!.asama).toBe(2);
  });

  it("tabelası bilinmeyen dükkân (hücre türü dukkan): dükkân olarak, tür boş, marka rengi yok", () => {
    expect(g([y({ id: 3, hucreler: ["7:7"], tur: "dukkan" })])).toEqual([{ hucre: "7:7", asama: 3, dukkan: { tur: "" } }]);
  });

  it("yapı yoksa boş; ornek bayrağı yazılmaz (gerçek veri)", () => {
    expect(g([])).toEqual([]);
    expect(g([y({})]).some((x) => x.ornek)).toBe(false);
  });
});

// --- gerçek sunucu -------------------------------------------------------------------------------------------------------------------------------------------------

const ILCE = "sn_m_ova_merkez";
const fiks = parselFiksturuYukle("mini-6").ilceler.find((c) => c.id === ILCE)!;
const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const ciftlik = yapiKatalogu(ic).find((k) => k.id === "ciftlik")!;

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
    if (Date.now() > son) throw new Error("kosul zamaninda saglanmadi");
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

describe("insaatlarAl: gerçek sunucu", () => {
  it("kendi Çiftlik ve dükkânın inşaatta aşamalı, bitince Tamam: tesisin yöntemi, dükkân türü ve marka rengi; başkası yapıları görür (dükkân markasız, yöntemsiz)", async () => {
    const v = mulkVerisi();
    v.param.mulk!.yeniOyuncu.yurtHucre = 6;
    v.param.mulk!.yeniOyuncu.indirimliYapiSayisi = 2;
    ts = await testSunucusu({ veri: v });
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    const a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "t-ali", geriCekilmeMs: { ilk: 30, en: 100 } });
    const veli = await WsBaglanti.ac({ url: ts.url, token: token("veli"), istemciKimligi: "t-veli", geriCekilmeMs: { ilk: 30, en: 100 } });
    acilanlar.push(a, veli);
    expect((await a.katil(ILCE)).tamam).toBe(true);
    await bekle(() => a.ozet()?.indirimliYapiKalan === 2);
    const iz = fiksturIzgarasi();
    const baglam = async (): Promise<YerlesimBaglami> => {
      const sh = (await a.sahiplikAl(ILCE))!;
      const oz = a.ozet()!;
      return { izgara: iz, sahiplik: sh, ben: "ali", ad: (s) => s, hazineMili: oz.hazineMili, surenInsaat: oz.surenInsaat, indirim: { ppm: v.param.mulk!.yeniOyuncu.ilkYapiIndirimPpm, kalan: oz.indirimliYapiKalan ?? 0 } };
    };

    // Çiftlik yurtta
    const yp = yurtPlani(ciftlik, await baglam());
    expect(yp.plan?.gecerli, yp.plan?.neden ?? yp.neden).toBe(true);
    expect((await yerlesimiUygula(a, ILCE, yp.plan!)).tamam).toBe(true);
    const ciftlikHucreler = yp.plan!.hucreler.map((h) => h.id);
    await bekle(() => a.ozet()!.surenInsaat === 1);

    // Dükkân (1 hücre) yurdun boş hücresinde
    const sh0 = (await a.sahiplikAl(ILCE))!;
    const bos = [...sh0.hucreler].filter(([id, h]) => h.sahip === "ali" && h.tesis === undefined && h.insaat === undefined && !ciftlikHucreler.includes(id)).map(([id]) => id);
    expect(bos.length).toBeGreaterThanOrEqual(1);
    const dk = await a.tesisInsa({ tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "dukkan", hucreler: [bos[0]!], dukkanTuru: "bakkal" } as never);
    expect(dk.tamam, dk.tamam ? "" : dk.mesaj).toBe(true);
    await bekle(() => a.ozet()!.surenInsaat === 2);

    // İnşaatta: her iki yapının hücreleri Tamam değil, dükkân görünümü yok
    const insada = await a.insaatlarAl(ILCE);
    for (const h of [...ciftlikHucreler, bos[0]!]) {
      const b = insada.find((x) => x.hucre === h);
      expect(b, h).toBeDefined();
      expect(b!.asama, h).toBeLessThan(3);
      expect(b!.dukkan).toBeUndefined();
      expect(b!.ornek).toBeUndefined();
    }

    // İnşaatlar biter
    await y.zamanIlerlet(ts.yazar.sim.dunya.zaman + 24 * SAAT);
    await bekle(() => a.ozet()!.surenInsaat === 0 && a.ozet()!.simZamani >= ts!.yazar.sim.dunya.zaman);
    const sh1 = (await a.sahiplikAl(ILCE))!;
    const dukkanTesis = sh1.hucreler.get(bos[0]!)!.tesis!;
    // Marka: tanımla ve dükkâna ver
    expect((await a.dukkanKomutu!({ tur: "marka_tanimla", marka: 0, ad: "bereket", simge: 1, renk: 3 })).tamam).toBe(true);
    expect((await a.dukkanKomutu!({ tur: "dukkan_marka", dukkan: dukkanTesis, marka: 0 })).tamam).toBe(true);
    await bekle(async () => (await a.insaatlarAl(ILCE)).find((x) => x.hucre === bos[0]!)?.dukkan?.markaRenk === 3);

    const biten = await a.insaatlarAl(ILCE);
    for (const h of ciftlikHucreler) {
      const b = biten.find((x) => x.hucre === h)!;
      expect(b.asama).toBe(3);
      expect(b.yontem, "kendi tesisinin yöntemi (silüet için)").toBe("geleneksel_tarim");
    }
    expect(biten.find((x) => x.hucre === bos[0]!)).toEqual({ hucre: bos[0], asama: 3, dukkan: { tur: "bakkal", markaRenk: 3 } });

    // Başkası (veli) aynı ilçeyi izler: ali'nin yapılarını Tamam görür; hücre türü herkese açık (dükkân), tabela ilgi alanındaki işletme düğümlerinde, tesis yöntemi yalnız sahibine
    expect((await veli.katil(ILCE)).tamam).toBe(true);
    veli.ilgi?.("test", [ILCE]);
    await bekle(async () => (await veli.insaatlarAl(ILCE)).find((x) => x.hucre === bos[0]!)?.asama === 3);
    const gorulen = await veli.insaatlarAl(ILCE);
    // tabela (tür, marka) veli'nin ilgi alanında değil: dükkân yine dükkân olarak (hücre türünden), markasız
    expect(gorulen.find((x) => x.hucre === bos[0]!)).toEqual({ hucre: bos[0], asama: 3, dukkan: { tur: "" } });
    for (const h of ciftlikHucreler) expect(gorulen.find((x) => x.hucre === h)).toEqual({ hucre: h, asama: 3 });
    expect(a.sunucuHatalari).toEqual([]);
  }, 60_000);
});

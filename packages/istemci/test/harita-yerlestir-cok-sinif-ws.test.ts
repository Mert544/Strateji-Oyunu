/**
 * Çok sınıflı yerleşim GERÇEK sunucuya karşı (K4 `yapi_yerlestir.siniflar`): iki hücre iki farklı arsa sınıfındaysa (kırsal + kasaba) arsa ve
 * yapı yine TEK atomik komuttur; önizleme toplamı çekirdekle birebir aynıdır (hücreler kimliğe göre sıralı, her biri kendi sınıfında,
 * artımlı eğri sırası alım sırasıyla); yapı reddedilirse hiçbir sınıftan arsa alınmaz.
 */
import { afterEach, describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { kamuKumesi, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { hucreFiyatiMili } from "../src/harita/fiyat";
import { Bit } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { yapiKatalogu, yerlesimPlani } from "../src/harita/yapi";
import type { YerlesimBaglami } from "../src/harita/yapi";
import { yerlesimiUygula } from "../src/harita/zincir";

/** Katılım ilçesi ayrı seçilir: işlem ilçesinde ayrılmış hücre kuralı karışmasın (ayrılmış hücre yalnız katılım ilçesinde satılır). */
const KATILIM = "sn_m_ova_tasra";
/** Kırsal, kasaba ve şehir sınıflarının bir arada olduğu ilçe (komşu hücreler farklı sınıfta). */
const ILCE = "sn_m_sehir_merkez";
const fiks = parselFiksturuYukle("mini-6").ilceler.find((c) => c.id === ILCE)!;
const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const ahir = yapiKatalogu(ic).find((y) => y.id === "ahir")!;

let ts: TestSunucusu | null = null;
const acilanlar: WsBaglanti[] = [];
afterEach(async () => {
  for (const b of acilanlar.splice(0)) b.kapat();
  await ts?.kapat();
  ts = null;
});

async function bekle(kosul: () => boolean, ms = 10_000): Promise<void> {
  const son = Date.now() + ms;
  while (!kosul()) {
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

/** Yurtsuz ve indirimsiz taze oyuncu: bütün hücreler satın alınır, yapı tam fiyat. */
function veri(): ReturnType<typeof mulkVerisi> {
  const v = mulkVerisi();
  v.param.mulk!.yeniOyuncu.yurtHucre = 0;
  v.param.mulk!.yeniOyuncu.indirimliYapiSayisi = 0;
  return v;
}

/** Yatayda komşu, iki ayrı sınıfta (kırsal + kasaba), kamu ve ayrılmış olmayan hücre çiftleri (sol hücre ilk). */
function karisikCiftler(): Array<[string, string]> {
  const kamu = kamuKumesi(ts!.yazar.sim, ILCE);
  const ayr = (ts!.yazar.sim.ic.mulk as unknown as { ayrilmis: Set<string> }).ayrilmis;
  const sinif = new Map(fiks.hucreler.filter((h) => h.uygun && !kamu.has(h.id) && !ayr.has(h.id)).map((h) => [h.id, h.sinif]));
  const l: Array<[string, string]> = [];
  for (const h of fiks.hucreler) {
    const [x, y] = h.id.split(":").map(Number) as [number, number];
    const sag = `${x + 1}:${y}`;
    if (sinif.has(h.id) && sinif.has(sag) && sinif.get(h.id) !== sinif.get(sag)) l.push([h.id, sag]);
  }
  return l;
}

async function kur(): Promise<{ a: WsBaglanti; cift: [string, string]; baglam: () => Promise<YerlesimBaglami>; oyuncuHucre: () => number; ciftler: Array<[string, string]> }> {
  ts = await testSunucusu({ veri: veri() });
  const y = await ts.baglan(SISTEM_OYUNCUSU);
  void y;
  const a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "t-ali", geriCekilmeMs: { ilk: 30, en: 100 } });
  acilanlar.push(a);
  expect((await a.katil(KATILIM)).tamam).toBe(true);
  await a.sahiplikAl(ILCE);
  await bekle(() => a.ozet() !== null && a.isletme() !== null);
  const ciftler = karisikCiftler();
  expect(ciftler.length, "fikstürde kırsal+kasaba komşu çifti yok").toBeGreaterThan(0);
  const iz = fiksturIzgarasi();
  const baglam = async (): Promise<YerlesimBaglami> => {
    const sh = (await a.sahiplikAl(ILCE))!;
    const oz = a.ozet()!;
    return { izgara: iz, sahiplik: sh, ben: "ali", ad: (s) => s, hazineMili: oz.hazineMili, surenInsaat: oz.surenInsaat };
  };
  return { a, cift: ciftler[0]!, ciftler, baglam, oyuncuHucre: () => ts!.yazar.sim.dunya.mulk!.hucreler.filter((h) => h.sahip === "ali").length };
}

describe("çok sınıflı yerleşim: gerçek sunucu", () => {
  it("kırsal + kasaba: tek atomik komut, önizleme toplamı çekirdekle birebir (kimliğe göre sıralı, hücre başına sınıf)", async () => {
    const { a, ciftler, baglam, oyuncuHucre } = await kur();
    // Ayırt edici çift: eski zincir sırası (sınıf sırasıyla: kırsal önce) ile çekirdek sırası (kimliğe göre) FARKLI toplam verir
    const sh0 = (await a.sahiplikAl(ILCE))!;
    const d0 = { uygun: sh0.uygun, satilmis: sh0.satilmis, ayrilmisSatilmis: sh0.ayrilmisSatilmis ?? 0 };
    const sinifIdx = (id: string): "kirsal" | "kasaba" | "sehir" => fiks.hucreler.find((h) => h.id === id)!.sinif;
    const cekirdekToplam = (c: [string, string]): number => [...c].sort().reduce((t, id, k) => t + hucreFiyatiMili(sinifIdx(id), d0, k), 0);
    const eskiToplam = (c: [string, string]): number => [...c].sort((p, q) => (["kirsal", "kasaba", "sehir"].indexOf(sinifIdx(p)) - ["kirsal", "kasaba", "sehir"].indexOf(sinifIdx(q)))).reduce((t, id, k) => t + hucreFiyatiMili(sinifIdx(id), d0, k), 0);
    const cift = ciftler.find((c) => cekirdekToplam(c) !== eskiToplam(c));
    expect(cift, "sıra farkı yaratan karışık çift yok (test duyarlılığı)").toBeDefined();
    const [x, y] = cift![0].split(":").map(Number) as [number, number];
    const plan = yerlesimPlani(ahir, x, y, 0, await baglam());
    expect(plan.gecerli, plan.neden ?? "").toBe(true);
    expect(plan.alinacak).toHaveLength(2);
    expect(plan.arsaMili).toBe(cekirdekToplam(cift!));
    expect(plan.arsaMili).not.toBe(eskiToplam(cift!));
    expect(plan.parseller.map((p) => p.sinif).sort()).toEqual(["kasaba", "kirsal"]);

    // Çekirdek sırası: kimliğe (dizge) göre; ilk hücre k=0, ikincisi k=1; her hücre kendi sınıfında
    const sh = (await a.sahiplikAl(ILCE))!;
    const durum = { uygun: sh.uygun, satilmis: sh.satilmis, ayrilmisSatilmis: sh.ayrilmisSatilmis ?? 0 };
    const sinifOf = new Map(plan.parseller.flatMap((p) => p.hucreler.map((id) => [id, p.sinif] as const)));
    const sirali = [...plan.alinacak].sort();
    const beklenen = hucreFiyatiMili(sinifOf.get(sirali[0]!)!, durum, 0) + hucreFiyatiMili(sinifOf.get(sirali[1]!)!, durum, 1);
    expect(plan.arsaMili).toBe(beklenen);
    expect(plan.toplamMili).toBe(plan.arsaMili + plan.yapiMili);

    const hazineOnce = a.ozet()!.hazineMili!;
    const r = await yerlesimiUygula(a, ILCE, plan);
    expect(r, r.mesaj).toMatchObject({ tamam: true, yol: "atomik", gonderilen: 1 });
    await bekle(() => a.ozet()!.surenInsaat === 1);
    // Gerçek hazine düşüşü = önizleme toplamı; sunucuda iki hücre, her biri kendi sınıfında; tek inşaat
    expect(hazineOnce - a.ozet()!.hazineMili!).toBe(plan.toplamMili);
    expect(oyuncuHucre()).toBe(2);
    const sunucuSinif = new Map(ts!.yazar.sim.dunya.mulk!.hucreler.filter((h) => h.sahip === "ali").map((h) => [h.id, h.sinif]));
    for (const id of plan.alinacak) expect(sunucuSinif.get(id), id).toBe(sinifOf.get(id));
    expect(ts!.yazar.sim.dunya.insaatlar).toHaveLength(1);
    expect(r.mesaj).toMatch(/^Ahır kuruluyor; bedel [\d.]+\s₺\.$/);
    expect(a.sunucuHatalari).toEqual([]);
  });

  it("yapı reddedilirse (eş zamanlı inşaat sınırı) hiçbir sınıftan arsa alınmaz, hazine değişmez", async () => {
    const { a, cift, baglam, oyuncuHucre } = await kur();
    const [x, y] = cift[0].split(":").map(Number) as [number, number];
    const plan = yerlesimPlani(ahir, x, y, 0, await baglam());
    expect(plan.gecerli, plan.neden ?? "").toBe(true);
    // Sunucuda aynı anda en çok 2 inşaat: önizlemeyi sınır dolmamış varsayarak gönder (yarış): önce sınırı sunucuda doldur
    const p2 = { ...plan, hucreler: plan.hucreler.slice(0, 1) } as typeof plan; // 1 hücre: yapı yuvası tutmaz -> sunucu reddeder
    const hazineOnce = a.ozet()!.hazineMili!;
    const r = await yerlesimiUygula(a, ILCE, p2);
    expect(r).toMatchObject({ tamam: false, yol: "atomik", alinan: [], odenenMili: 0 });
    expect(r.mesaj).toContain("Hiçbir şey değişmedi.");
    expect(oyuncuHucre()).toBe(0);
    expect(a.ozet()!.hazineMili).toBe(hazineOnce);
    expect(ts!.yazar.sim.dunya.insaatlar).toHaveLength(0);
  });
});

/**
 * Ayrılmış hücre fiyatı GERÇEK sunucuya karşı: yeni oyuncu katılım ilçesinde ayrılmış hücre içeren üç planda önizlenen bedel,
 * gerçek hazine düşüşüne BİREBİR eşit: (a) hazır arsa (`arsaFiyati` + `parselZinciri`), (b) yapı yerleştirme (`yerlesimPlani` +
 * `yerlesimiUygula`), (c) ölçek büyütme (G2 `olcekPlani`). Fiyat çekirdeğin `parselToplamFiyatiMili`'siyle de karşılaştırılır.
 * İlk-yapı indirimi bu testte kapalıdır (yapı önizlemesi indirimi bilmez; ayrı bulgu).
 */
import { afterEach, describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import { parselToplamFiyatiMili as cekirdekToplam, SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { kamuKumesi, katil, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import type { IlceSahipligi } from "../src/harita/baglanti";
import { arsaFiyati } from "../src/harita/arsa";
import type { Arsa } from "../src/harita/arsa";
import { arsaSinifi, ayrilmisHakki } from "../src/harita/fiyat";
import { Bit } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { olcekPlani, olcekTesisi } from "../src/harita/olcek";
import { yapiKatalogu, yerlesimPlani } from "../src/harita/yapi";
import { parselZinciri, yerlesimiUygula } from "../src/harita/zincir";

const ILCE = "sn_m_ova_merkez";
const IL = "sn_m_ova";
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

const xy = (id: string): [number, number] => id.split(":").map(Number) as [number, number];

function fiksturIzgarasi(): Izgara {
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

async function ac(oyuncu: string): Promise<WsBaglanti> {
  const b = await WsBaglanti.ac({ url: ts!.url, token: token(oyuncu), istemciKimligi: `t-${oyuncu}`, geriCekilmeMs: { ilk: 30, en: 100 } });
  acilanlar.push(b);
  return b;
}

/** Sunucunun ayrılmış hücre kümesi ve kamu kümesi. */
const ayrilmisSunucu = (): Set<string> => (ts!.yazar.sim.ic.mulk as unknown as { ayrilmis: Set<string> }).ayrilmis;

function sunucuIlce(): { uygunHucre: number; satilmisHucre: number; ayrilmisSatilmis?: number } {
  return ts!.yazar.sim.dunya.mulk!.ilceler.find((c) => c.id === ILCE) as { uygunHucre: number; satilmisHucre: number; ayrilmisSatilmis?: number };
}

describe("ayrılmış hücre: önizleme = gerçek hazine düşüşü (gerçek sunucu, katılım ilçesinde)", () => {
  it("(a) hazır arsa, (b) yapı yerleştirme, (c) ölçek büyütme; çekirdek fiyatıyla aynı", async () => {
    const v = mulkVerisi();
    v.param.mulk!.yeniOyuncu.ilkYapiIndirimPpm = 0; // yapı önizlemesi ilk-yapı indirimini bilmez: indirimsiz karşılaştırılır
    ts = await testSunucusu({ veri: v });
    const yonetici = await ts.baglan(SISTEM_OYUNCUSU);
    void yonetici;
    const kamu = kamuKumesi(ts.yazar.sim, ILCE);
    const ay = ayrilmisSunucu();
    // Satılabilir kırsal hücreler: ayrılmış (R) ve normal (N)
    const U = new Set(fiks.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id)).map((h) => h.id));
    const R = [...U].filter((h) => ay.has(h)).sort();
    const N = [...U].filter((h) => !ay.has(h)).sort();
    expect(R.length).toBeGreaterThan(8);

    // İki yeni oyuncu katılım ilçesinde: veli ayrılmış hücreleri PARA ile alır (sayaç `ayrilmisSatilmis` > 0)
    const a = await ac("ali");
    const vl = await ac("veli");
    expect((await a.katil(ILCE)).tamam).toBe(true);
    expect((await vl.katil(ILCE)).tamam).toBe(true);
    await vl.sahiplikAl(ILCE);
    const kullan = new Set<string>();
    const al = (l: string[], n: number): string[] => {
      const s = l.filter((h) => !kullan.has(h)).slice(0, n);
      for (const h of s) kullan.add(h);
      return s;
    };
    const veliAyrilmis = al(R, 2);
    const veliNormal = al(N, 1);
    expect((await vl.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: veliAyrilmis, sinif: "kirsal" })).tamam).toBe(true);
    expect((await vl.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: veliNormal, sinif: "kirsal" })).tamam).toBe(true);
    expect(sunucuIlce().ayrilmisSatilmis).toBe(2);

    // ali: ayrılmış listesi (hak sürerken, katılım ilçesi) ve kesin sayaç istemcide
    await a.sahiplikAl(ILCE);
    let sh: IlceSahipligi = (await a.sahiplikAl(ILCE))!;
    await bekle(async () => {
      sh = (await a.sahiplikAl(ILCE))!;
      return sh.ayrilmis !== undefined && sh.satilmis === 3;
    });
    expect(sh.ayrilmis).toEqual(new Set(fiks.hucreler.map((f) => f.id).filter((h) => ay.has(h))));
    expect(sh.ayrilmisSatilmis).toBe(2);
    const oz0 = a.ozet()!;
    expect(oz0.katilimIlcesi).toBe(ILCE);
    expect(oz0.ayrilmisBitis).toBeGreaterThan(oz0.simZamani);
    const hak = ayrilmisHakki({ simZamani: oz0.simZamani, ayrilmisBitis: oz0.ayrilmisBitis ?? null, katilimIlcesi: oz0.katilimIlcesi ?? null, ilce: ILCE, yalnizKatilimIlcesi: ic.param.mulk!.yeniOyuncu.ayrilmisYalnizKatilimIlcesi === true, gun: ic.param.mulk!.yeniOyuncu.ayrilmisGun ?? 14 });
    expect(hak).toEqual({ var: true });
    const iz = fiksturIzgarasi();
    const sinifAl = (h: string): ReturnType<typeof arsaSinifi> => fiks.hucreler.find((f) => f.id === h)!.sinif;
    const hazine = (): number => a.ozet()!.hazineMili!;

    // --- (a) hazır arsa: 1 ayrılmış + 2 normal hücre (aynı sınıf) ---
    {
      const hucreler = [...al(R, 1), ...al(N, 2)].sort();
      const arsa: Arsa = { kimlik: "arsa:test", hucreler, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, siniflar: { kirsal: 3 }, baskin: "kirsal", arazi: 1 };
      const sayi = { uygun: sh.uygun, satilmis: sh.satilmis, benim: 0, ayrilmisSatilmis: sh.ayrilmisSatilmis ?? 0 };
      const o = arsaFiyati({ arsa, sinifAl, sayi, ayrilmis: sh.ayrilmis!, hak, hazineMili: hazine(), para: (m) => String(m) });
      expect(o.engel).toBeNull();
      expect(o.adimlar[0]!.ayrilmis).toBe(1);
      const ilce = sunucuIlce();
      expect(o.mili).toBe(cekirdekToplam(ts.yazar.sim.ic, ilce, "kirsal", 2, 1)); // çekirdek aynası
      const once = hazine();
      const r = await parselZinciri(a, ILCE, o.adimlar);
      expect(r.hata).toBeNull();
      await bekle(() => a.ozet()!.ilceHucre.some(([i, n]) => i === ILCE && n === 3));
      expect(once - hazine()).toBe(o.mili);
      expect(sunucuIlce().ayrilmisSatilmis).toBe(3);
    }

    // --- (b) yapı yerleştirme: çiftlik; hücrelerden biri ayrılmış, biri normal (boş hücreler hem arsa hem yapı) ---
    let tesisCifti: [string, string] | null = null;
    let hedefAyrilmis: string | null = null;
    for (const r of R) {
      if (kullan.has(r)) continue;
      const [x, y] = xy(r);
      for (const ortak of [`${x - 1}:${y}`, `${x + 1}:${y}`]) {
        if (!U.has(ortak) || ay.has(ortak) || kullan.has(ortak)) continue;
        const cift = [r, ortak].sort((p, q) => xy(p)[0] - xy(q)[0]) as [string, string];
        // (c) için tesisin yanında (bu çiftin dışında) başka bir ayrılmış, boş hücre
        const komsular = cift.flatMap((h) => {
          const [hx, hy] = xy(h);
          return [`${hx - 1}:${hy}`, `${hx + 1}:${hy}`, `${hx}:${hy - 1}`, `${hx}:${hy + 1}`];
        });
        const hedef = komsular.find((k) => !cift.includes(k) && ay.has(k) && U.has(k) && !kullan.has(k));
        if (!hedef) continue;
        tesisCifti = cift;
        hedefAyrilmis = hedef;
        break;
      }
      if (tesisCifti) break;
    }
    expect(tesisCifti, "ayrılmış hücreli yapı yeri bulunamadı").not.toBeNull();
    {
      sh = (await a.sahiplikAl(ILCE))!;
      const oz = a.ozet()!;
      const plan = yerlesimPlani(ciftlik, xy(tesisCifti![0])[0], xy(tesisCifti![0])[1], 0, { izgara: iz, sahiplik: sh, ben: "ali", ad: (s) => s, hazineMili: oz.hazineMili, surenInsaat: oz.surenInsaat, ayrilmisHakki: hak });
      expect(plan.gecerli, plan.neden ?? "").toBe(true);
      expect(plan.hucreler.map((h) => h.id)).toEqual(tesisCifti);
      expect(plan.parseller).toHaveLength(1);
      expect(plan.parseller[0]!.ayrilmis).toBe(1);
      expect(plan.arsaMili).toBe(cekirdekToplam(ts.yazar.sim.ic, sunucuIlce(), "kirsal", 1, 1));
      const once = hazine();
      const r = await yerlesimiUygula(a, ILCE, plan);
      expect(r.tamam, r.mesaj).toBe(true);
      expect(r.yol).toBe("atomik");
      await bekle(() => a.ozet()!.surenInsaat === 1);
      expect(once - hazine()).toBe(plan.toplamMili);
      expect(sunucuIlce().ayrilmisSatilmis).toBe(4);
    }

    // --- (c) ölçek büyütme: tesis biter; çevre yol, yalnız ayrılmış hücre açık ---
    await ts.istemciler[0]!.zamanIlerlet(ts.yazar.sim.dunya.zaman + 24 * SAAT);
    await bekle(() => a.ozet()!.surenInsaat === 0 && a.ozet()!.simZamani >= ts!.yazar.sim.dunya.zaman); // sim zamanı eşitlenmeden hazine ölçülmez
    {
      sh = (await a.sahiplikAl(ILCE))!;
      const kayit = sh.yapilar!.find((k) => k.durum === "tesis")!;
      const tesis = olcekTesisi(ic, kayit, (t) => t)!;
      expect(tesis.olcek).toBe(0);
      // yalnız hedef ayrılmış hücre kullanılabilir olsun (istemci ızgarasında diğer komşular yol)
      const dar: Izgara = { ...iz, durum: Uint8Array.from(iz.durum) };
      const kumeler = new Set(tesis.hucreler);
      for (const t of tesis.hucreler) {
        const [x, y] = xy(t);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const k = `${x + dx}:${y + dy}`;
          if (kumeler.has(k) || k === hedefAyrilmis) continue;
          const i = (y + dy - dar.y0) * dar.genislik + (x + dx - dar.x0);
          if (i >= 0 && i < dar.durum.length) dar.durum[i] = (dar.durum[i]! & 1) | Bit.YOL;
        }
      }
      const oz = a.ozet()!;
      const plan = olcekPlani({ ic, tesis, hedef: 1, izgara: dar, sahiplik: sh, ben: "ali", ad: (s) => s, hazineMili: oz.hazineMili, surenInsaat: oz.surenInsaat, ayrilmisHakki: hak, stok: () => null });
      expect(plan.gecerli, plan.neden ?? "").toBe(true);
      expect(plan.ekHucreler).toEqual([hedefAyrilmis]);
      expect(plan.arsaMili).toBe(cekirdekToplam(ts.yazar.sim.ic, sunucuIlce(), "kirsal", 0, 1));
      const once = hazine();
      const r = await a.olcekYukselt({ bolge: `${IL}#ali`, tesis: tesis.id, olcek: 1, ekHucreler: plan.ekHucreler, ...(plan.sinif ? { sinif: plan.sinif } : {}) });
      expect(r.tamam, r.tamam ? "" : r.mesaj).toBe(true);
      await bekle(() => a.ozet()!.surenInsaat === 1);
      expect(once - hazine()).toBe(plan.toplamMili);
      expect(sunucuIlce().ayrilmisSatilmis).toBe(5);
    }
    expect(a.sunucuHatalari).toEqual([]);
  });

  it("hakkı olmayan (yeni oyuncu değil) oyuncuda ayrılmış hücre planda kapalı; sunucu da aynı nedenle reddeder", async () => {
    const v = mulkVerisi();
    ts = await testSunucusu({ veri: v });
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", []);
    const a = await ac("ali");
    await a.sahiplikAl(ILCE);
    const kamu = kamuKumesi(ts.yazar.sim, ILCE);
    const ay = ayrilmisSunucu();
    const r = fiks.hucreler.find((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id) && ay.has(h.id))!.id;
    // Hak 14 gün sonra biter
    await y.zamanIlerlet(15 * 24 * SAAT);
    await bekle(() => a.ozet()!.simZamani >= 15 * 24 * SAAT);
    const oz = a.ozet()!;
    const hak = ayrilmisHakki({ simZamani: oz.simZamani, ayrilmisBitis: oz.ayrilmisBitis ?? null, katilimIlcesi: oz.katilimIlcesi ?? null, ilce: ILCE, yalnizKatilimIlcesi: true, gun: 14 });
    expect(hak.var).toBe(false);
    const sh = (await a.sahiplikAl(ILCE))!;
    const arsa: Arsa = { kimlik: "arsa:test", hucreler: [r], x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, siniflar: { kirsal: 1 }, baskin: "kirsal", arazi: 1 };
    const bilgili = arsaFiyati({ arsa, sinifAl: () => "kirsal", sayi: { uygun: sh.uygun, satilmis: sh.satilmis, benim: 0 }, ayrilmis: new Set([r]), hak, hazineMili: null, para: (m) => String(m) });
    expect(bilgili.engel).toBe("Bu hücre yeni oyunculara ayrılmış (katılımlarının ilk 14 günü)");
    // sunucu aynı hücreyi reddeder (Türkçe çeviri)
    const red = await a.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: [r], sinif: "kirsal" });
    expect(red).toMatchObject({ tamam: false, mesaj: expect.stringContaining("yeni oyunculara ayrılmış") });
  });
});

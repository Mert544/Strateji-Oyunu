/**
 * Gerçek arsa ızgaraları (Gebze, Gemlik, Körfez; `odbl/izgara/manifest.json`) GERÇEK sunucuya karşı: üç ilçede de oyuncu katılır, istemci planlayıcısıyla bir arsa
 * seçer ve atomik `yapi_yerlestir` ile (arsa alımı + ilk yapı) kurar; önizlenen toplam bedel gerçek hazine düşüşüne birebir eşittir.
 * Sunucu dünyası CLI ile aynı kurulur (`izgara/manifest.ts`: manifest → BHI1 → veri). Ağır: Gebze 500 binden fazla hücre; tek dosya koşulur.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { gercekVeriyiYukle } from "@bolge/veri";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import { hiyerarsiOku, izgaraGirdisiKur, izgaraManifestiOku, izgaralariYukle, izgarayiVeriyeBagla, varsayilanIzgaraBagimliliklari, varsayilanIzgaraKoku } from "../../sunucu/src/izgara/manifest";
import { testSunucusu, token } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { Bit, bhiCoz, hucreId } from "../src/harita/hucre";
import { kamuGrubuBul, kamuNedeni } from "../src/harita/kamu";
import type { Izgara } from "../src/harita/hucre";
import { izgaraVarMi } from "../src/harita/veri";
import { yapiKatalogu, yerlesimPlani } from "../src/harita/yapi";
import type { YerlesimBaglami, YerlesimPlani } from "../src/harita/yapi";
import { yerlesimiUygula } from "../src/harita/zincir";

const MANIFEST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "veri", "haritalar", "odbl", "izgara", "manifest.json");
const ILCELER = ["tr_16_gemlik", "tr_41_gebze", "tr_41_korfez"] as const;
const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const ciftlik = yapiKatalogu(ic).find((y) => y.id === "ciftlik")!;

function sunucuVerisi(): CekirdekVeriPaketi {
  const kok = varsayilanIzgaraKoku(MANIFEST);
  const manifest = izgaraManifestiOku(MANIFEST);
  const yuklenen = izgaralariYukle(manifest, kok, varsayilanIzgaraBagimliliklari);
  const veri: CekirdekVeriPaketi = gercekVeriyiYukle();
  if (veri.param.mulk === undefined) throw new Error("gercek veri paketinde param.mulk yok");
  veri.param.mulk.yeniOyuncu.yurtHucre = 0; // yurt aramasi (agir) kapali; arsa alimi + ilk yapi sinanir
  izgarayiVeriyeBagla(veri, izgaraGirdisiKur(yuklenen, { ad: "izgara-manifest", harita: veri.harita.ad, hiyerarsi: hiyerarsiOku(join(kok, "hiyerarsi.json")), haritaBolgeleri: new Set(veri.harita.bolgeler.map((b) => b.id)) }));
  return veri;
}

function istemciIzgarasi(ilce: string): Izgara {
  const m = JSON.parse(readFileSync(MANIFEST, "utf8")) as { ilceler: Array<{ kimlik: string; bhi: { yol: string } }> };
  const yol = join(dirname(dirname(MANIFEST)), m.ilceler.find((i) => i.kimlik === ilce)!.bhi.yol);
  return bhiCoz(new Uint8Array(gunzipSync(readFileSync(yol))));
}

async function bekle(kosul: () => boolean | Promise<boolean>, ms = 15_000): Promise<void> {
  const son = Date.now() + ms;
  while (!(await kosul())) {
    if (Date.now() > son) throw new Error("kosul zamaninda saglanmadi");
    await new Promise((c) => setTimeout(c, 20));
  }
}

let ts: TestSunucusu | null = null;
const acilanlar: WsBaglanti[] = [];
beforeAll(async () => {
  if (existsSync(MANIFEST)) ts = await testSunucusu({ veri: sunucuVerisi() });
}, 240_000);
afterAll(async () => {
  for (const b of acilanlar.splice(0)) b.kapat();
  await ts?.kapat();
}, 60_000);

describe.skipIf(!existsSync(MANIFEST))("gerçek ızgaralı üç ilçede yerleşim (gerçek sunucu)", () => {
  it("istemci üç ilçeyi de ızgaralı bilir (Yerleş kartı rozeti 'hazır' olur)", () => {
    for (const i of ILCELER) expect(izgaraVarMi(i), i).toBe(true);
  });

  for (const ilce of ILCELER) {
    it(`${ilce}: katılım, planlayıcıyla geçerli arsa, atomik arsa alımı + Çiftlik; önizleme = gerçek hazine düşüşü`, async () => {
      const oyuncu = `o_${ilce.slice(3)}`;
      const a = await WsBaglanti.ac({ url: ts!.url, token: token(oyuncu), istemciKimligi: `t-${oyuncu}`, geriCekilmeMs: { ilk: 30, en: 100 } });
      acilanlar.push(a);
      expect((await a.katil(ilce)).tamam).toBe(true);
      await bekle(() => a.ozet() !== null && a.ozet()!.hazineMili !== null);
      const iz = istemciIzgarasi(ilce);
      a.ilgi?.("izgara-testi", [ilce]);
      await bekle(async () => ((await a.sahiplikAl(ilce))?.kamu?.length ?? 0) > 0 || ilce === "tr_41_gebze");
      const sh = (await a.sahiplikAl(ilce))!;
      const oz = a.ozet()!;
      // Kamu arsası (kıyı şeridi, meydan...) satılmaz: planlayıcıya sunucunun yayınladığı bloklardan verilir (gerçek istemcideki `kamuHucre` ile aynı)
      const kamu = (id: string): string | null => {
        const [x, y] = id.split(":").map(Number) as [number, number];
        const g = kamuGrubuBul(sh.kamu, x, y);
        return g ? kamuNedeni(g.tur) : null;
      };
      const ppm = ic.param.mulk!.yeniOyuncu.ilkYapiIndirimPpm;
      const baglam: YerlesimBaglami = { izgara: iz, sahiplik: sh, ben: oyuncu, ad: (s) => s, hazineMili: oz.hazineMili, surenInsaat: oz.surenInsaat, kamu, ...(oz.indirimliYapiKalan != null ? { indirim: { ppm, kalan: oz.indirimliYapiKalan } } : {}) };
      // Çerçevenin ortasından başlayıp geçerli ilk yeri bul (planlayıcı: engel, kamu, sahiplik, ayrılmış hak, sınır, hazine)
      let plan: YerlesimPlani | null = null;
      const orta = Math.floor((iz.genislik * iz.yukseklik) / 2);
      for (let k = 0; k < iz.durum.length && plan === null; k++) {
        const i = (orta + k) % iz.durum.length;
        if (!(iz.durum[i]! & Bit.ICERIDE)) continue;
        const p = yerlesimPlani(ciftlik, iz.x0 + (i % iz.genislik), iz.y0 + Math.floor(i / iz.genislik), 0, baglam);
        if (p.gecerli) plan = p;
      }
      expect(plan, `${ilce}: gecerli yer bulunamadi`).not.toBeNull();
      const p = plan!;
      expect(p.alinacak.length).toBeGreaterThan(0); // yurtsuz: arsa alimi da var
      const once = a.ozet()!.hazineMili!;
      const r = await yerlesimiUygula(a, ilce, p);
      expect(r.tamam, r.mesaj).toBe(true);
      expect(r.yol).toBe("atomik");
      await bekle(() => a.ozet()!.surenInsaat === 1);
      expect(once - a.ozet()!.hazineMili!).toBe(p.toplamMili);
      const sh2 = (await a.sahiplikAl(ilce))!;
      for (const h of p.hucreler) expect(sh2.hucreler.get(h.id)?.sahip, hucreId(Number(h.id.split(":")[0]), Number(h.id.split(":")[1]))).toBe(oyuncu);
      expect(a.sunucuHatalari).toEqual([]);
    }, 180_000);
  }
});

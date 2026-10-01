/**
 * Uygulama dilimleme: büyük komut toplusu uygulanırken olay döngüsüne nefes verilir. Dilimleme sonuçları, sırayı, seq'i ve
 * `durumOzeti`ni DEĞİŞTİRMEZ (günlük toplu yazılır, uygulama sırası aynı); yalnız önceki komutların yanıtları toplunun sonunu beklemez.
 */
import { describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { Komut, KomutSonucu } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { mulkVerisi } from "./yardimci";

async function kos(dilimMs: number): Promise<{ ozet: string; seq: number; sonuclar: KomutSonucu[]; sira: string[] }> {
  const v = mulkVerisi();
  if (v.param.mulk) v.param.mulk.yeniOyuncu.hibe = 500_000_000;
  const y = await DunyaYazari.ac({ veri: v, tohum: 3, depo: bellekDeposu(), saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12, uygulamaDilimiMs: dilimMs });
  const hepsi: Array<Promise<{ seq: number; sonuc: KomutSonucu }>> = [];
  const sira: string[] = [];
  hepsi.push(y.komutGonder(SISTEM_OYUNCUSU, "t", "k0", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] } satisfies Komut));
  for (let i = 1; i <= 40; i++) hepsi.push(y.komutGonder("ali", "t", `k${i}`, { tur: "vergi_ayarla", oranPpm: 10_000 + i * 1000 }));
  hepsi.forEach((p, i) => void p.then(() => sira.push(`k${i}`)));
  await y.birTur();
  const yanit = await Promise.all(hepsi);
  return { ozet: y.ozet().durumOzeti, seq: y.seq, sonuclar: yanit.map((r) => r.sonuc), sira };
}

describe("uygulama dilimleme", () => {
  it("dilimleme (cok kucuk dilim) ve dilimsiz kosu ayni sonuc, seq ve durumOzeti verir; yanit sirasi komut sirasi", async () => {
    const a = await kos(0);
    const b = await kos(0.0001);
    expect(b.seq).toBe(a.seq);
    expect(b.seq).toBe(41);
    expect(b.ozet).toBe(a.ozet);
    expect(b.sonuclar).toEqual(a.sonuclar);
    expect(b.sira).toEqual(a.sira);
  });

  it("dilimli kosuda ilk komutun yaniti toplunun bitisinden ONCE gelir (nefes noktasi)", async () => {
    const v = mulkVerisi();
    const y = await DunyaYazari.ac({ veri: v, tohum: 3, depo: bellekDeposu(), saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12, uygulamaDilimiMs: 0.0001 });
    const p0 = y.komutGonder(SISTEM_OYUNCUSU, "t", "a0", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] });
    const diger = Array.from({ length: 30 }, (_, i) => y.komutGonder("ali", "t", `a${i + 1}`, { tur: "vergi_ayarla", oranPpm: 20_000 + i }));
    let ilkGeldi = false;
    void p0.then(() => {
      ilkGeldi = true;
    });
    let sonSirada = false;
    void diger[29]!.then(() => {
      sonSirada = true;
    });
    let ilkGeldiyken = false;
    const tur = y.birTur().then(() => undefined);
    // Toplunun ortasında (son komut henüz yanıtlanmadan) ilk yanıt görülmüş olmalı.
    for (let i = 0; i < 200 && !sonSirada; i++) {
      await new Promise<void>((r) => setImmediate(r));
      if (ilkGeldi && !sonSirada) ilkGeldiyken = true;
    }
    await tur;
    await Promise.all(diger);
    expect(ilkGeldiyken).toBe(true);
  });
});

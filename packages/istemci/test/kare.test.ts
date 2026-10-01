/**
 * İşçideki kareAl/dizinKur, izleyicinin kareAl'ı ile birebir aynı çıktıyı vermeli (uyarlanmış kopya).
 * Mini haritada birkaç günlük koşu yapılır; kare JSON olarak serileştirilebilir ve küçüktür.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon, SAAT, GUN } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import type { ArketipAdi } from "@bolge/botlar";
import { miniVeriyiYukle } from "@bolge/veri";
import { kareAl as izleyiciKareAl } from "../../izleyici/src/disari-aktar";
import { dizinKur, kareAl } from "../src/isci/kare";

describe("işçi kare çıkarımı", () => {
  const veri = miniVeriyiYukle();
  const botlar: ArketipAdi[] = ["sanayici", "tuccar"];
  const devletler = veri.harita.devletler.slice(0, 2);
  const oyuncular = devletler.map((d, i) => ({
    id: `o${i}`,
    bolgeler: veri.harita.bolgeler.filter((b) => b.devlet === d.id).map((b) => b.id),
    bot: botOlustur(botlar[i] as ArketipAdi, `o${i}`, 1),
    katilmaMs: 0,
  }));

  it("izleyici ile aynı kare; dizin tutarlı; JSON'a serileştirilebilir", () => {
    const sim = Simulasyon.olustur(veri, 1);
    kos({ veri, tohum: 1, oyuncular, sureMs: 3 * GUN, sim });
    const idler = oyuncular.map((o) => o.id);
    const k = kareAl(sim, idler);
    expect(k).toEqual(izleyiciKareAl(sim, idler));
    expect(k.saat).toBe(72);
    expect(JSON.parse(JSON.stringify(k))).toEqual(k);
    const d = dizinKur(sim, botlar);
    expect(d.bolgeler.length).toBe(k.bolgeler.length);
    expect(d.kenarlar.length).toBe(k.kenarlar.length);
    expect(d.mallar.length).toBe(k.fiyat.length);
    expect(d.oyuncular.map((o) => o.arketip)).toEqual(botlar);
  });

  it("koşu parça parça (saat saat) sürülse de gözlemler tek seferlik koşuyla aynı", () => {
    const tek = Simulasyon.olustur(veri, 1);
    const gozTek: number[] = [];
    kos({ veri, tohum: 1, oyuncular: oyuncular.map((o) => ({ ...o, bot: botOlustur(botlar[oyuncular.indexOf(o)] as ArketipAdi, o.id, 1) })), sureMs: 2 * GUN, sim: tek, gozlemAraligiMs: SAAT, gozlem: (_s, t) => gozTek.push(t / SAAT) });
    const parca = Simulasyon.olustur(veri, 1);
    const os = oyuncular.map((o, i) => ({ ...o, bot: botOlustur(botlar[i] as ArketipAdi, o.id, 1) }));
    for (let h = 1; h <= 48; h++) kos({ veri, tohum: 1, oyuncular: os, sureMs: h * SAAT, sim: parca });
    expect(parca.durumOzeti()).toBe(tek.durumOzeti());
    expect(gozTek.length).toBeGreaterThan(40);
  });
});

/**
 * İşçideki kareAl/dizinKur, izleyicinin kareAl'ı ile birebir aynı çıktıyı vermeli (uyarlanmış kopya).
 * Mini haritada birkaç günlük koşu yapılır; kare JSON olarak serileştirilebilir ve küçüktür.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Simulasyon, SAAT, GUN, PPM } from "@bolge/cekirdek";
import type { IklimOlayi } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import type { ArketipAdi } from "@bolge/botlar";
import { gercekVeriyiYukle, miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { kareAl as izleyiciKareAl } from "../../izleyici/src/disari-aktar";
import { dizinKur, kareAl } from "../src/isci/kare";
import { hataMetni, veriPaketiniHazirla } from "../src/isci/veri-hazirla";
import type { Kare } from "../src/veri/kare-tipleri";

/** İzleyici kareAl'ı tarım/iklim alanlarını bilmez; eşdeğerlik karşılaştırması bu eklenen alanlar atılarak yapılır. */
function tarimsiz(k: Kare): Kare {
  const { iklim: _iklim, ...geri } = k;
  return { ...geri, bolgeler: k.bolgeler.map(({ tarim: _tarim, ...b }) => b) };
}

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
    expect(tarimsiz(k)).toEqual(izleyiciKareAl(sim, idler));
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

  it("tarım: dizin içerikten okunur (ürün, olay türü, iklim tipi, gübre malı) ve kare tarım alanlarını taşır", () => {
    const sim = Simulasyon.olustur(veri, 1);
    kos({ veri, tohum: 1, oyuncular, sureMs: 2 * GUN, sim });
    const d = dizinKur(sim, botlar);
    const t = d.tarim;
    expect(t).toBeDefined();
    if (!t) return;
    expect(t.urunler.map((u) => u.id)).toEqual((veri.icerik.tarimUrunleri ?? []).map((u) => u.id));
    expect(t.olayTurleri).toEqual(Object.keys(veri.param.iklim?.olaylar ?? {}));
    expect(t.iklimTipleri).toEqual(Object.keys(veri.param.iklim?.hasatEgrisiPpm ?? {}));
    expect(d.mallar[t.gubreMal]?.id).toBe("gubre");
    expect(t.ayGunleri.reduce((a, b) => a + b, 0)).toBe(365);
    expect(t.hasatAylik).toHaveLength(12);
    expect(t.hasatTipleri).toHaveLength(t.iklimTipleri.length);
    expect(t.bolgeler).toHaveLength(d.bolgeler.length);
    // dizin ve kare JSON'a serileştirilebilir (yapısal kopya işçi -> ana iş parçacığı)
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
    const k = kareAl(sim, oyuncular.map((o) => o.id));
    expect(JSON.parse(JSON.stringify(k))).toEqual(k);
    k.bolgeler.forEach((b, i) => {
      expect(b.tarim !== undefined).toBe(t.bolgeler[i] !== null);
      if (b.tarim) {
        expect(b.tarim[0]).toBeGreaterThan(0);
        expect(b.tarim[5]).toHaveLength(t.urunler.length);
        expect(b.tarim[5].reduce((a, c) => a + c, 0)).toBe(100);
      }
    });
    expect(k.iklim).toBeDefined();
  });

  it("tarım: etkin ve uyarıdaki olaylar sim-saate ve türü dizin indeksine çevrilir", () => {
    const sim = Simulasyon.olustur(veri, 1);
    const iklim = sim.dunya.iklim;
    expect(iklim).toBeDefined();
    if (!iklim) return;
    const olay: IklimOlayi = {
      id: 7,
      tur: "sel",
      merkez: 1,
      uyari: 5 * SAAT,
      etkiBaslangic: 29 * SAAT,
      bitis: 100 * SAAT,
      siddetPpm: 400_000,
      etki: [{ bolge: 0, siddetPpm: 200_000 }, { bolge: 1, siddetPpm: 400_000 }],
    };
    iklim.olaylar.push(olay);
    const d = dizinKur(sim, botlar);
    const k = kareAl(sim, oyuncular.map((o) => o.id));
    const o = k.iklim?.olaylar[0];
    expect(o).toEqual({ id: 7, tur: d.tarim?.olayTurleri.indexOf("sel"), merkez: 1, uyari: 5, baslangic: 29, bitis: 100, siddet: 40, etki: [[0, 20], [1, 40]] });
    expect(Math.round((400_000 * 100) / PPM)).toBe(40);
  });
});

describe("işçi veri hazırlığı (Node yükleyicisiyle aynı davranış)", () => {
  const HAM = (yol: string): unknown => JSON.parse(readFileSync(new URL(`../../veri/${yol}`, import.meta.url), "utf8"));
  const hamPaket = (): VeriPaketi => ({
    harita: HAM("haritalar/gercek-karadeniz.json"),
    icerik: HAM("icerik/icerik.json"),
    param: HAM("icerik/parametreler.json"),
  } as VeriPaketi);

  it("gerçek haritada tarım alanları türetilir ve Node yükleyicisindeki sonuçla birebir aynıdır", () => {
    const ham = hamPaket();
    expect(ham.harita.bolgeler.every((b) => b.tarim === undefined)).toBe(true); // JSON'da yok
    const sonuc = veriPaketiniHazirla(ham);
    expect(sonuc.tamam).toBe(true);
    if (!sonuc.tamam) return;
    expect(sonuc.doldurulan).toBeGreaterThan(30);
    const node = gercekVeriyiYukle();
    expect(ham.harita.bolgeler.map((b) => b.tarim)).toEqual(node.harita.bolgeler.map((b) => b.tarim));
  });

  it("hazırlanan paketle kurulan simülasyon Node'dakiyle aynı özeti verir", () => {
    const ham = hamPaket();
    veriPaketiniHazirla(ham);
    const a = Simulasyon.olustur(ham, 3);
    const b = Simulasyon.olustur(gercekVeriyiYukle(), 3);
    a.calistirKadar(10 * GUN);
    b.calistirKadar(10 * GUN);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    expect(a.dunya.bolgeler.some((x) => x.tarim !== undefined)).toBe(true);
  });

  it("geçersiz paket hata listesiyle reddedilir; hata metni kısaltılır", () => {
    const ham = hamPaket();
    ham.icerik.mallar = ham.icerik.mallar.filter((m) => m.id !== "tahil");
    const sonuc = veriPaketiniHazirla(ham);
    expect(sonuc.tamam).toBe(false);
    if (sonuc.tamam) return;
    expect(sonuc.hatalar.length).toBeGreaterThan(0);
    const m = hataMetni(["a", "b", "c"], 2);
    expect(m).toContain("3 hata");
    expect(m).toContain("… ve 1 hata daha");
  });
});

/**
 * G6 ÖNCESİ para defterli mülk görüntüsü (`fikstur-goc/mulk-v2-g6oncesi.json`; üretici ve yeniden üretim: `fikstur-goc/uret-mulk-v2.ts`, commit 7553b55).
 * Göç ve korunum testlerinin "eski görüntü" girdisidir: eski çekirdekle üretilip dondurulmuştur (testin içinde bugünkü kodla üretilmez).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { IcerikKimlikTablosu } from "../src/goc";
import { Simulasyon } from "../src/motor";
import { anlikGoruntuCoz, kuralSurumuHesapla } from "../src/serilestir";
import { KAMU_KUCUK } from "./kamu-yardimci";
import { mulkVeriTam } from "./mulk-yardimci";

const FIKSTUR = new URL("./fikstur-goc/", import.meta.url);
const oku = (ad: string): string => readFileSync(new URL(ad, FIKSTUR), "utf8");

/** Üreticideki (`uret-mulk-v2.ts`) veri paketi. */
function veriKur() {
  return mulkVeriTam((x) => {
    const m = x.param.mulk!;
    m.yeniOyuncu.hibe = 2_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000, tahil: 200_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.esZamanliInsaat = 10;
    m.araziVergisiHaftalikPpm = 100_000;
    m.kamu = structuredClone(KAMU_KUCUK);
  });
}

describe("G6 öncesi para defterli mülk görüntüsü (dondurulmuş)", () => {
  const metin = oku("mulk-v2-g6oncesi.json");
  const ust = JSON.parse(oku("mulk-v2-g6oncesi.ust.json")) as { kural: string; ozet: string; zaman: number; kasaSayisi: number; tablo: IcerikKimlikTablosu };

  it("bugünkü kodla yüklenir, para defteri ve kamu kasaları yerinde, durumOzeti fikstürdeki özetle BİREBİR aynı; bozulmuş görüntü reddedilir", () => {
    // zarf: sürüm 2, özet yazıldığı gibi
    const g = anlikGoruntuCoz(metin);
    expect(g.surum).toBe(2);
    expect(g.durumOzeti).toBe(ust.ozet);
    expect(g.kuralSurumu).toBe(ust.kural);
    // fikstür gerçekten para defterli: musluk, lavabo ve kamu kasaları dolu (boş fikstür hiçbir şeyi sınamazdı)
    const zarf = JSON.parse(metin) as { dunya: { mulk: { para: { musluk: Record<string, { n: number }>; lavabo: Record<string, { n: number }>; kasalar: unknown[] } } } };
    const p = zarf.dunya.mulk.para;
    expect(p.kasalar).toHaveLength(ust.kasaSayisi);
    expect(p.kasalar.length).toBeGreaterThanOrEqual(5);
    expect(p.musluk["hibe"]!.n).toBeGreaterThan(0);
    expect(p.musluk["ihracatNpc"]!.n).toBeGreaterThan(0);
    expect(p.lavabo["arsa"]!.n).toBeGreaterThan(0);
    expect(p.lavabo["ithalatNpc"]!.n).toBeGreaterThan(0);
    // yükleme (içerik ve kural fikstürden bu yana değişmediyse göçsüz, özet birebir; değiştiyse özgün özet yine doğrulanır)
    const veri = veriKur();
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(veri, metin, [], { gocIzni: true, eskiTablo: ust.tablo });
    expect(r.goc.eskiDurumOzeti).toBe(ust.ozet);
    expect(r.sim.dunya.zaman).toBe(ust.zaman);
    expect(r.sim.dunya.mulk!.para!.kasalar).toHaveLength(ust.kasaSayisi);
    if (kuralSurumuHesapla(veri) === ust.kural && !r.goc.yenidenIndekslendi) expect(r.sim.durumOzeti()).toBe(ust.ozet);
    // negatif kontrol: para defterinde tek bir sayaç değişirse (özet doğrulaması) yükleme reddedilir
    const bozuk = metin.replace(`"hibe":{"a":`, `"hibe":{"a":1`);
    expect(bozuk).not.toBe(metin);
    expect(() => Simulasyon.anlikGoruntudenYukleSonuclu(veri, bozuk, [], { gocIzni: true, eskiTablo: ust.tablo })).toThrow();
  });
});

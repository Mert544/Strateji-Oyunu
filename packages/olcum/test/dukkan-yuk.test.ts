/**
 * Dükkân yükü ölçüm yardımcıları (bench/dukkan-cozum-p95.ts): yüzdelik, dükkân sayısı ve dünyaya dükkân yazma (mini-6 dünyasında küçük senaryo; ölçümün kendisi bench'tedir).
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { parselBotuOlustur } from "@bolge/botlar";
import { perakendeBlogu } from "../../veri/test/perakende-g7-yardimci";
import { dukkanSayisi, dukkanlariEkle, oyuncuDukkanSayisi, sureOzeti, yuzdelik } from "../src/dukkan-yuk";

function veri(): ReturnType<typeof miniVeriyiYukle> & { parsel: ReturnType<typeof parselFiksturuYukle> } {
  const v = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
  const mulk = v.param.mulk!;
  mulk.ekYapilar = { ...(mulk.ekYapilar ?? {}), dukkan: { ad: "Dukkan", yuva: 1, insaSaati: 4, insaParasi: 6_000_000, insaMaliyeti: { celik: 20_000, parca: 8_000 }, enFazlaIlBasina: 6, olcekHucre: [1, 2, 3] } };
  const pr = perakendeBlogu();
  pr.olcekler[0].rafYuvasi = 4;
  mulk.perakende = pr;
  return v;
}

describe("dükkân yükü yardımcıları", () => {
  it("yüzdelik: en yakın sıra; boş dizide 0; özet", () => {
    const s = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(yuzdelik(s, 50)).toBe(50);
    expect(yuzdelik(s, 95)).toBe(95);
    expect(yuzdelik(s, 99)).toBe(99);
    expect(yuzdelik(s, 100)).toBe(100);
    expect(yuzdelik([], 95)).toBe(0);
    expect(yuzdelik([7], 95)).toBe(7);
    const o = sureOzeti([5, 1, 3, 2, 4]);
    expect(o).toEqual({ n: 5, ort: 3, p50: 3, p95: 5, p99: 5, max: 5 });
  });

  it("oyuncu başına dükkân: 1 ya da 2, ortalama 1,5", () => {
    const l = Array.from({ length: 100 }, (_, i) => oyuncuDukkanSayisi(i));
    expect(new Set(l)).toEqual(new Set([1, 2]));
    expect(l.reduce((a, x) => a + x, 0) / l.length).toBe(1.5);
  });

  it("dukkanlariEkle: işletmesi olan oyunculara sırayla 2/1 dükkân, 4 yuva, bol stok; ikinci çağrı yeni eklemez; çözüm çalışır", () => {
    const sim = Simulasyon.olustur(veri(), 3);
    const bot = (id: string) => parselBotuOlustur("ciftci", id);
    for (const id of ["a", "b"]) {
      const b = bot(id);
      sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: id, bolgeler: [], ...(b.katilimIlcesi(sim) === undefined ? {} : { ilce: b.katilimIlcesi(sim) as string }) } });
      for (const k of b.karar(sim)) sim.uygula({ t: 0, oyuncu: id, komut: k });
    }
    sim.calistirKadar(1 * GUN);
    const eklenen = dukkanlariEkle(sim);
    expect(eklenen).toBe(3); // a (sıra 0) -> 2, b (sıra 1) -> 1
    expect(dukkanSayisi(sim)).toBe(3);
    const dukkanlar = sim.dunya.bolgeler.flatMap((b) => (b.ekYapilar ?? []).filter((e) => e.dukkan !== undefined));
    for (const e of dukkanlar) {
      expect(e.dukkan!.raf).toHaveLength(4);
      expect(e.dukkan!.raf.map((r) => r.mal)).toEqual(["gida", "ekmek", "un", "sut"]);
    }
    expect(new Set(dukkanlar.map((e) => e.id)).size).toBe(3); // benzersiz kimlik
    expect(dukkanlariEkle(sim)).toBe(0);
    expect(() => sim.calistirKadar(1 * GUN + 6 * SAAT)).not.toThrow(); // dükkânlı çözüm koşar
  });

  it("perakende bloğu yoksa açık hata", () => {
    const sim = Simulasyon.olustur({ ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") }, 1);
    expect(() => dukkanlariEkle(sim)).toThrow(/perakende/);
  });
});

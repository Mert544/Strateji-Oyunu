import { describe, expect, it } from "vitest";
import { GUN, SAAT, Simulasyon, durumOzeti } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import { ARKETIPLER, ONAYARLAR, botOlustur, kos, onayarBul } from "../src";
import type { ArketipAdi, KosuOyuncusu } from "../src";

const KUZEY = ["m_ova", "m_liman", "m_gecit"];
const GUNEY = ["m_dag", "m_col", "m_sehir"];

function ikiOyuncu(a: ArketipAdi, b: ArketipAdi, tohum = 1): KosuOyuncusu[] {
  return [
    { id: "a", bolgeler: KUZEY, bot: botOlustur(a, "a", tohum), katilmaMs: 0 },
    { id: "b", bolgeler: GUNEY, bot: botOlustur(b, "b", tohum), katilmaMs: 0 },
  ];
}

describe("botlar", () => {
  it("botOlustur her arketip için doğru arketip ve oyuncu ile bot verir", () => {
    for (const a of ARKETIPLER) {
      const b = botOlustur(a, "x", 3);
      expect(b.arketip).toBe(a);
      expect(b.oyuncu).toBe("x");
    }
  });

  it("mini haritada 3 günlük koşuda başarısız komut oranı düşüktür (< %30) ve komut verilir", () => {
    const cifter: Array<[ArketipAdi, ArketipAdi]> = [
      ["sanayici", "tuccar"],
      ["lojistikci", "militarist"],
    ];
    for (const [a, b] of cifter) {
      const r = kos({ veri: miniVeriyiYukle(), tohum: 1, oyuncular: ikiOyuncu(a, b), sureMs: 3 * GUN });
      for (const id of ["a", "b"]) {
        const ok = r.komutSayisi[id] ?? 0;
        const hata = r.basarisizSayisi[id] ?? 0;
        expect(ok).toBeGreaterThan(0);
        expect(hata / Math.max(1, ok + hata)).toBeLessThan(0.3);
      }
    }
  });

  it("kur_ve_unut yalnızca ilk çağrıda komut verir", () => {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
    sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: KUZEY } });
    sim.calistirKadar(0);
    const bot = botOlustur("kur_ve_unut", "a", 1);
    const ilk = bot.karar(sim);
    expect(ilk.length).toBeGreaterThan(0);
    sim.calistirKadar(2 * GUN);
    expect(bot.karar(sim)).toEqual([]);
    sim.calistirKadar(5 * GUN);
    expect(bot.karar(sim)).toEqual([]);
  });

  it("pasif hiç komut vermez", () => {
    const r = kos({ veri: miniVeriyiYukle(), tohum: 1, oyuncular: ikiOyuncu("pasif", "sanayici"), sureMs: 2 * GUN });
    expect(r.komutSayisi["a"]).toBe(0);
    expect(r.basarisizSayisi["a"]).toBe(0);
    expect(r.komutSayisi["b"]).toBeGreaterThan(0);
  });

  it("deterministik: aynı tohum aynı durumOzeti, farklı dünya tohumu farklı", () => {
    const calistir = (tohum: number): string =>
      kos({ veri: miniVeriyiYukle(), tohum, oyuncular: ikiOyuncu("tuccar", "militarist", tohum), sureMs: 3 * GUN }).sim.durumOzeti();
    expect(calistir(7)).toBe(calistir(7));
    expect(calistir(7)).not.toBe(calistir(8));
  });

  it("karar asıl simülasyonu değiştirmez", () => {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
    sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: KUZEY } });
    sim.calistirKadar(SAAT);
    const once = durumOzeti(sim.dunya);
    for (const a of ARKETIPLER) botOlustur(a, "a", 1).karar(sim);
    expect(durumOzeti(sim.dunya)).toBe(once);
  });

  it("koşucu: geç katılan oyuncu katilmaMs anında katılır ve karar verir", () => {
    const oyuncular = ikiOyuncu("sanayici", "sanayici");
    (oyuncular[1] as KosuOyuncusu).katilmaMs = GUN;
    const r = kos({ veri: miniVeriyiYukle(), tohum: 1, oyuncular, sureMs: 2 * GUN });
    const b = r.sim.dunya.oyuncular.find((o) => o.id === "b");
    expect(b?.katilmaZamani).toBe(GUN);
    expect(r.komutSayisi["b"]).toBeGreaterThan(0);
  });

  it("koşucu: aynı karar anında bot sırası k mod n kaydırmayla döner (deterministik)", () => {
    const sira: string[] = [];
    const izleyici = (id: string): KosuOyuncusu["bot"] => ({
      oyuncu: id,
      arketip: "pasif",
      karar: (sim) => {
        sira.push(`${Math.floor(sim.dunya.zaman / (6 * SAAT))}:${id}`);
        return [];
      },
    });
    const oyuncular: KosuOyuncusu[] = [
      { id: "a", bolgeler: KUZEY, bot: izleyici("a"), katilmaMs: 0 },
      { id: "b", bolgeler: GUNEY, bot: izleyici("b"), katilmaMs: 0 },
    ];
    kos({ veri: miniVeriyiYukle(), tohum: 1, oyuncular, sureMs: 18 * SAAT });
    // karar anları 0, 6, 12 saat: k=0 a,b; k=1 b,a; k=2 a,b
    expect(sira).toEqual(["0:a", "0:b", "1:b", "1:a", "2:a", "2:b"]);
  });

  it("koşucu: gözlem geri çağrısı aralıkta ve bitişte çağrılır", () => {
    const an: number[] = [];
    kos({ veri: miniVeriyiYukle(), tohum: 1, oyuncular: ikiOyuncu("pasif", "pasif"), sureMs: GUN, gozlemAraligiMs: 8 * SAAT, gozlem: (_s, t) => an.push(t) });
    expect(an).toEqual([0, 8 * SAAT, 16 * SAAT, 24 * SAAT]);
  });
});

describe("önayarlar", () => {
  it("8 önayar vardır ve ad ile bulunur", () => {
    expect(ONAYARLAR.length).toBe(8);
    expect(onayarBul("dengeli").ad).toBe("dengeli");
    expect(() => onayarBul("yok")).toThrow();
  });

  it("her önayar tek bölgeli oyuncuda geçerli komut üretir (başarısız oranı düşük)", () => {
    for (const o of ONAYARLAR) {
      const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
      sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_sehir"] } });
      let ok = 0;
      let hata = 0;
      for (let g = 0; g < 2; g++) {
        sim.calistirKadar(g * GUN);
        for (const k of o.uygula(sim, "a")) {
          if (sim.uygula({ t: g * GUN, oyuncu: "a", komut: k }).tamam) ok++;
          else hata++;
        }
      }
      expect(hata).toBeLessThanOrEqual(Math.ceil(0.3 * (ok + hata)));
    }
  });
});

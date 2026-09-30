import { describe, expect, it } from "vitest";
import { GUN, SAAT, Simulasyon, durumOzeti } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import {
  ARKETIPLER,
  Bakis,
  H1_ONAYARLARI,
  H1_ONAYAR_TANIMLARI,
  HAM_CIKARIM_TURLERI,
  ONAYARLAR,
  PASIF_ONAYAR,
  botOlustur,
  ihracatFiyatCarpani,
  ithalatFiyatCarpani,
  korumaKalan,
  kos,
  onayarBul,
  onayarYetenekleri,
  savasAdaylari,
  ticaretAdaylari,
  toplamGuc,
} from "../src";
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
    for (const o of [...ONAYARLAR, ...H1_ONAYARLARI]) {
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

describe("H1 v0.2 önayar kümesi", () => {
  it("v0.1 ile aynı adları taşır; `dengeli` dışındakiler ortak ham tabanını içerir", () => {
    expect(H1_ONAYARLARI.map((o) => o.ad)).toEqual(ONAYARLAR.map((o) => o.ad));
    for (const t of H1_ONAYAR_TANIMLARI) {
      const y = onayarYetenekleri(t);
      if (t.ad === "dengeli") continue;
      expect(t.taban).toBe(true);
      for (const tur of HAM_CIKARIM_TURLERI) expect(y.has(`tur:${tur}`)).toBe(true);
    }
  });

  it("hiçbir önayar diğerinin üst kümesi değildir (ihracatci yalnızca ticaret temasıdır)", () => {
    const sabit = H1_ONAYAR_TANIMLARI.filter((t) => t.ad !== "dengeli").map((t) => ({ ad: t.ad, y: onayarYetenekleri(t) }));
    for (const a of sabit) {
      for (const b of sabit) {
        if (a.ad === b.ad) continue;
        const ustKume = [...b.y].every((x) => a.y.has(x));
        expect(ustKume, `${a.ad} ${b.ad}'nin üst kümesi`).toBe(false);
      }
    }
    // v0.1 kümesinde ihracatci ham çıkarımın üst kümesiydi; v0.2'de tema türü yok: yalnız ham taban + ticaret + vergi
    const ihr = H1_ONAYAR_TANIMLARI.find((t) => t.ad === "ihracatci")!;
    expect([...onayarYetenekleri(ihr)].filter((x) => x.startsWith("tur:") && !HAM_CIKARIM_TURLERI.includes(x.slice(4)))).toEqual([]);
    expect(ihr.yontemler).toBeUndefined();
    expect(ihr.teknolojiler).toBeUndefined();
    expect(ihr.kenar).toBeUndefined();
    expect(ihr.askeri).toBeUndefined();
  });

  it("ortak taban: tematik önayar ham tesis adayını da üretir (aynı bölgede ihracatci ile aynı ham inşa)", () => {
    const uret = (ad: string): string[] => {
      const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
      sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_dag", "m_col"] } });
      return (H1_ONAYARLARI.find((o) => o.ad === ad) as (typeof H1_ONAYARLARI)[number])
        .uygula(sim, "a")
        .flatMap((k) => (k.tur === "tesis_insa" && HAM_CIKARIM_TURLERI.includes(k.tesisTuru) ? [`${k.bolge}:${k.tesisTuru}`] : []))
        .sort();
    };
    const ihr = uret("ihracatci");
    expect(ihr.length).toBeGreaterThan(0);
    // elektronik teması da aynı ham tabanı içerir (bakır/silis/cevher ortak)
    for (const x of ihr) expect(uret("elektronik")).toContain(x);
  });

  it("pasif önayar komut üretmez", () => {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
    sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_sehir"] } });
    expect(PASIF_ONAYAR.uygula(sim, "a")).toEqual([]);
  });
});

/** Mini haritada "a" oyuncusu (kuzey) katılmış; elektronik stokları/fiyatı testten elle kurulabilir. */
function ticaretKur(): { sim: Simulasyon; mal: number; taban: number; stokAyarla: (bolge: string, birim: number) => void; fiyatAyarla: (oran: number) => void } {
  const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
  sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: KUZEY } });
  sim.calistirKadar(2 * SAAT);
  const d = sim.dunya;
  const mal = sim.ic.malIndeks["elektronik"] as number;
  const taban = (sim.ic.mallar[mal] as { tabanFiyat: number }).tabanFiyat;
  const stokAyarla = (bolge: string, birim: number): void => {
    const s = d.bolgeler.find((b) => b.id === bolge)!.stoklar[mal]!;
    s.miktar = birim * 1000;
    s.t0 = d.zaman;
    s.yerelOran = 0;
    s.gelenOran = 0;
    s.artik = 0;
  };
  for (const b of d.bolgeler) if (b.sahip === "a") stokAyarla(b.id, 0);
  return { sim, mal, taban, stokAyarla, fiyatAyarla: (oran) => void (d.pazar.fiyat[mal] = Math.round(taban * oran)) };
}

function emirOrani(sim: Simulasyon, yon: "ihracat" | "ithalat"): number {
  const c = ticaretAdaylari(new Bakis(sim, "a"), { ihracatEsigi: 0.03 }).find(
    (a) => a.komut.tur === "ticaret_emri" && a.komut.mal === "elektronik" && a.komut.yon === yon && a.komut.oranSaat > 0,
  );
  return c && c.komut.tur === "ticaret_emri" ? c.komut.oranSaat : 0;
}

describe("fiyat ve depo duyarlı ticaret (v0.2.1)", () => {
  it("fiyat çarpanları tekdüzedir: ihracat taban altında azalır, ithalat pahalandıkça azalır", () => {
    expect(ihracatFiyatCarpani(1.2)).toBe(1);
    expect(ihracatFiyatCarpani(0.5)).toBe(0);
    expect(ihracatFiyatCarpani(0.75)).toBeGreaterThan(ihracatFiyatCarpani(0.65));
    expect(ihracatFiyatCarpani(0.85)).toBeGreaterThan(ihracatFiyatCarpani(0.75));
    expect(ithalatFiyatCarpani(0.8)).toBe(1);
    expect(ithalatFiyatCarpani(1.3)).toBeLessThan(ithalatFiyatCarpani(1.1));
    expect(ithalatFiyatCarpani(3)).toBeGreaterThanOrEqual(0.3);
  });

  it("ihracat oranı fiyat/taban düştükçe azalır ve taban oranı 0.55 altında durur", () => {
    const k = ticaretKur();
    k.stokAyarla("m_liman", 6000); // toplam doluluk %20 (acil değil)
    const oran = (f: number): number => {
      k.fiyatAyarla(f);
      return emirOrani(k.sim, "ihracat");
    };
    const tam = oran(1.0);
    const dusuk = oran(0.8);
    const cokDusuk = oran(0.6);
    expect(tam).toBeGreaterThan(0);
    expect(dusuk).toBeLessThan(tam);
    expect(cokDusuk).toBeLessThan(dusuk);
    expect(oran(0.5)).toBe(0);
  });

  it("depo %70 üstüyse ihracat artar ve düşük fiyatta bile sürer; ithalat kesilir", () => {
    const k = ticaretKur();
    k.stokAyarla("m_liman", 6000);
    k.fiyatAyarla(1.0);
    const normal = emirOrani(k.sim, "ihracat");
    k.stokAyarla("m_liman", 9000); // depo %90 dolu
    const acil = emirOrani(k.sim, "ihracat");
    expect(acil).toBeGreaterThan(normal);
    k.fiyatAyarla(0.4);
    expect(emirOrani(k.sim, "ihracat")).toBeGreaterThan(0);
  });

  it("ithalat pahalandıkça azalır, dolu depolu limanda hiç başlamaz", () => {
    const k = ticaretKur();
    const d = k.sim.dunya;
    d.oyuncular.find((o) => o.id === "a")!.hazine.miktar *= 1000;
    d.bolgeler.find((b) => b.id === "m_ova")!.stoklar[k.mal]!.yerelOran = -30000; // net açık
    k.fiyatAyarla(1.0);
    const normal = emirOrani(k.sim, "ithalat");
    k.fiyatAyarla(1.6);
    const pahali = emirOrani(k.sim, "ithalat");
    expect(normal).toBeGreaterThan(0);
    expect(pahali).toBeGreaterThan(0);
    expect(pahali).toBeLessThan(normal);
    k.fiyatAyarla(1.0);
    k.stokAyarla("m_liman", 8000); // liman deposu dolu: aynı malı ithal etmenin anlamı yok
    expect(emirOrani(k.sim, "ithalat")).toBe(0);
  });

  it("deterministik: aynı durumda aynı ticaret adayları", () => {
    const k = ticaretKur();
    k.stokAyarla("m_liman", 6000);
    k.fiyatAyarla(0.9);
    const a = JSON.stringify(ticaretAdaylari(new Bakis(k.sim, "a")));
    const b = JSON.stringify(ticaretAdaylari(new Bakis(k.sim, "a")));
    expect(a).toBe(b);
  });
});

describe("militarist: yeni oyuncu koruması ve erken hazırlık (v0.2.1)", () => {
  function savasKur(): Simulasyon {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 1);
    sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: KUZEY } });
    sim.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: GUNEY } });
    sim.calistirKadar(0);
    return sim;
  }

  it("koruma süresince savaş ilanı adayı üretilmez, korumanın bittiği anda üretilir ve çekirdek kabul eder", () => {
    const sim = savasKur();
    sim.calistirKadar(7 * GUN - 1);
    const b1 = new Bakis(sim, "a");
    expect(korumaKalan(b1, "b")).toBeGreaterThan(0);
    expect(savasAdaylari(b1, 0)).toEqual([]);
    sim.calistirKadar(7 * GUN);
    const b2 = new Bakis(sim, "a");
    expect(korumaKalan(b2, "b")).toBe(0);
    const adaylar = savasAdaylari(b2, 0);
    expect(adaylar.length).toBe(1);
    const r = sim.uygula({ t: 7 * GUN, oyuncu: "a", komut: adaylar[0]!.komut });
    expect(r.tamam).toBe(true);
    // Hedefte bitmemiş savaş varken (ve saldıran bölge meşgulken) aynı ilan yeniden önerilmez.
    expect(savasAdaylari(new Bakis(sim, "a"), 0)).toEqual([]);
  });

  it("30 günlük koşuda savaş ilanı komutu hiç reddedilmez; ilk ilan korumanın bittiği 7. günden önce gelmez", () => {
    for (const [a, b] of [
      ["militarist", "sanayici"],
      ["militarist", "militarist"],
    ] as Array<[ArketipAdi, ArketipAdi]>) {
      const r = kos({ veri: miniVeriyiYukle(), tohum: 1, oyuncular: ikiOyuncu(a, b), sureMs: 30 * GUN });
      expect(Object.keys(r.basarisizNedenleri).filter((n) => n.startsWith("savas_ilan"))).toEqual([]);
      const savaslar = r.sim.dunya.savaslar;
      expect(savaslar.length).toBeGreaterThan(0);
      const ilk = Math.min(...savaslar.map((s) => s.ilan));
      expect(ilk).toBeGreaterThanOrEqual(7 * GUN);
      // Koruma biter bitmez (en geç bir karar aralığı içinde) ilk ilan verilir.
      expect(ilk).toBeLessThanOrEqual(7 * GUN + 6 * SAAT);
    }
  });

  it("koruma bitmeden hazırlık: 7. günden önce mühimmat fabrikası kurulur ve ordu büyür", () => {
    const r = kos({ veri: miniVeriyiYukle(), tohum: 1, oyuncular: ikiOyuncu("militarist", "pasif"), sureMs: 7 * GUN - SAAT });
    const sim = r.sim;
    const fab = sim.ic.tesisTuruIndeks["muhimmat_fabrikasi"] as number;
    const fabrikaVar =
      sim.dunya.bolgeler.some((b) => b.sahip === "a" && b.tesisler.some((t) => t.tur === fab)) ||
      sim.dunya.insaatlar.some((i) => i.sahip === "a" && i.tur === "tesis" && i.hedef === fab);
    expect(fabrikaVar).toBe(true);
    expect(toplamGuc(sim, "a")).toBeGreaterThan(300); // başlangıç: 3 piyade tümeni
    expect(sim.dunya.savaslar.length).toBe(0);
  });
});

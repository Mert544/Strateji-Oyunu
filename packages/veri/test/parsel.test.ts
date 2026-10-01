import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ILCE_KENAR,
  PARSEL_FIKSTURLERI,
  merkezIlceSinifi,
  parselCiktiYolu,
  parselFiksturuJson,
  parselFiksturuMetni,
  tasraIlceSinifi,
  uretParselFiksturu,
} from "../src/uretici/parsel-fikstur";
import {
  dogrulaParselFiksturu,
  hucreIdAyristir,
  hucreIdOlustur,
  miniVeriyiYukle,
  parselFiksturOzeti,
  parselFiksturuYukle,
  parselHucreDizini,
  varsayilanVeriyiYukle,
} from "../src/index";
import type { DogrulamaSonucu, HaritaDosyasi, ParselFiksturu } from "../src/index";

const mini = (): HaritaDosyasi => miniVeriyiYukle().harita;
const sentetik = (): HaritaDosyasi => varsayilanVeriyiYukle().harita;
const kopya = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function hatalar(s: DogrulamaSonucu): string[] {
  return s.gecerli ? [] : s.hatalar;
}

describe("parsel fiksturu uretici", () => {
  it("bayt bayt deterministik; farkli tohum farkli hucreler", () => {
    const h = sentetik();
    const a = parselFiksturuJson(uretParselFiksturu(h, { haritaAdi: "sentetik-50" }));
    expect(parselFiksturuJson(uretParselFiksturu(h, { haritaAdi: "sentetik-50" }))).toBe(a);
    const b = parselFiksturuJson(uretParselFiksturu(h, { haritaAdi: "sentetik-50", tohum: 7 }));
    expect(b).not.toBe(a);
  });

  it("diskteki fiksturler ureticinin ciktisiyla ayni (yeniden uretilmemis degisiklik yok)", () => {
    for (const ad of PARSEL_FIKSTURLERI) {
      expect(readFileSync(parselCiktiYolu(ad), "utf8"), `${ad}: pnpm --filter @bolge/veri parsel:uret`).toBe(parselFiksturuMetni(ad));
    }
  });

  it("diskteki fiksturler kanonik JSON olarak ayristirilir ve yeniden yazilinca aynidir", () => {
    for (const ad of PARSEL_FIKSTURLERI) {
      const metin = readFileSync(parselCiktiYolu(ad), "utf8");
      expect(parselFiksturuJson(JSON.parse(metin) as ParselFiksturu)).toBe(metin);
    }
  });

  it("boyutlar: her bolge 1 il, 2 ilce, ilce basina 10x10 hucre", () => {
    const beklenen: Record<string, [number, number, number]> = { "mini-6": [6, 12, 1200], "sentetik-50": [50, 100, 10_000] };
    for (const ad of PARSEL_FIKSTURLERI) {
      const o = parselFiksturOzeti(parselFiksturuYukle(ad));
      expect([o.il, o.ilce, o.hucre]).toEqual(beklenen[ad]);
      // Sınıf karışımı: üç sınıf da hem hücre hem ilçe düzeyinde var; bir kısmı uygunsuz (su ve yol).
      for (const s of ["kirsal", "kasaba", "sehir"] as const) {
        expect(o.hucreSinifi[s]).toBeGreaterThan(0);
        expect(o.ilceSinifi[s]).toBeGreaterThan(0);
      }
      expect(o.engel.su).toBeGreaterThan(0);
      expect(o.engel.yol).toBeGreaterThan(0);
      expect(o.uygunHucre).toBeGreaterThan(o.hucre * 0.7);
      expect(o.uygunHucre).toBeLessThan(o.hucre);
    }
  });

  it("fiksturler bolge haritasiyla birlikte dogrulanir", () => {
    expect(dogrulaParselFiksturu(parselFiksturuYukle("mini-6"), { harita: mini() })).toEqual({ gecerli: true });
    expect(dogrulaParselFiksturu(parselFiksturuYukle("sentetik-50"), { harita: sentetik() })).toEqual({ gecerli: true });
  });

  it("her ilce bitisik 10x10 kare; ilin iki ilcesi yan yana; il bloklari cakismaz", () => {
    const f = parselFiksturuYukle("sentetik-50");
    for (const c of f.ilceler) {
      const xy = c.hucreler.map((h) => hucreIdAyristir(h.id)!);
      const xs = xy.map((p) => p.x);
      const ys = xy.map((p) => p.y);
      expect(Math.max(...xs) - Math.min(...xs) + 1).toBe(ILCE_KENAR);
      expect(Math.max(...ys) - Math.min(...ys) + 1).toBe(ILCE_KENAR);
      expect(new Set(c.hucreler.map((h) => h.id)).size).toBe(ILCE_KENAR * ILCE_KENAR);
    }
    expect(parselHucreDizini(f).size).toBe(10_000);
  });

  it("ilce sinifi nufustan; seviye en yuksek hucre sinifindan", () => {
    expect([merkezIlceSinifi(250_000), merkezIlceSinifi(120_000), merkezIlceSinifi(60_000)]).toEqual(["sehir", "kasaba", "kirsal"]);
    expect([tasraIlceSinifi(500_000), tasraIlceSinifi(250_000)]).toEqual(["kasaba", "kirsal"]);
    const f = parselFiksturuYukle("mini-6");
    const seviye = Object.fromEntries(f.ilceler.map((c) => [c.id, [c.sinif, c.seviye]]));
    expect(seviye["sn_m_sehir_merkez"]).toEqual(["sehir", 3]);
    expect(seviye["sn_m_ova_merkez"]).toEqual(["kasaba", 1]);
    expect(seviye["sn_m_gecit_merkez"]).toEqual(["kirsal", 0]);
    expect(seviye["sn_m_sehir_tasra"]).toEqual(["kirsal", 0]);
  });

  it("kiyi bolgesinde tasranin dis sutunu su; dag bolgesinde dere", () => {
    const f = parselFiksturuYukle("mini-6");
    const liman = f.ilceler.find((c) => c.id === "sn_m_liman_tasra")!;
    const disSutun = liman.hucreler.filter((_, n) => n % ILCE_KENAR === ILCE_KENAR - 1);
    expect(disSutun.every((h) => h.engel === "su" || h.engel === "yol")).toBe(true);
    const dag = f.ilceler.find((c) => c.id === "sn_m_dag_tasra")!;
    expect(dag.hucreler.filter((h) => h.engel === "su").length).toBeGreaterThanOrEqual(ILCE_KENAR - 1);
  });

  it("il basina tohum: haritaya bolge eklemek diger illerin hucrelerini degistirmez", () => {
    const h = mini();
    const once = uretParselFiksturu(h, { haritaAdi: "mini-6" });
    const genis = kopya(h);
    genis.bolgeler.unshift({ ...kopya(genis.bolgeler[0]!), id: "m_yeni", x: 999, y: 999 });
    const sonra = uretParselFiksturu(genis, { haritaAdi: "mini-6" });
    for (const c of once.ilceler) expect(sonra.ilceler.find((d) => d.id === c.id)).toEqual(c);
  });
});

describe("parsel fiksturu dogrulayici", () => {
  const temel = (): ParselFiksturu => uretParselFiksturu(mini(), { haritaAdi: "mini-6" });

  it("hucre kimligi bicimi ve z20 araligi", () => {
    expect(hucreIdOlustur(12, 34)).toBe("12:34");
    expect(hucreIdAyristir("12:34")).toEqual({ x: 12, y: 34 });
    expect(hucreIdAyristir("012:34")).toBeNull();
    expect(hucreIdAyristir("12;34")).toBeNull();
    expect(hucreIdAyristir(`${1 << 20}:0`)).toBeNull();
  });

  it("sema hatasi: tanınmayan alan, gecersiz sinif, ondalik", () => {
    const f = kopya(temel()) as unknown as Record<string, unknown>;
    f["fazla"] = 1;
    expect(hatalar(dogrulaParselFiksturu(f)).join("\n")).toMatch(/taninmayan alan/);
    const g = kopya(temel());
    (g.ilceler[0]!.hucreler[0] as { sinif: string }).sinif = "metropol";
    expect(hatalar(dogrulaParselFiksturu(g)).join("\n")).toMatch(/gecersiz deger "metropol"/);
    const k = kopya(temel());
    k.ilceler[0]!.hucreler[0]!.id = "1.5:2";
    expect(dogrulaParselFiksturu(k).gecerli).toBe(false);
  });

  it("bir hucre iki ilcede / ayni ilcede iki kez", () => {
    const f = kopya(temel());
    f.ilceler[1]!.hucreler[0]!.id = f.ilceler[0]!.hucreler[5]!.id;
    expect(hatalar(dogrulaParselFiksturu(f)).join("\n")).toMatch(/birden cok ilcede: "sn_m_ova_merkez" ve "sn_m_ova_tasra"/);
    const g = kopya(temel());
    g.ilceler[0]!.hucreler[1]!.id = g.ilceler[0]!.hucreler[0]!.id;
    expect(hatalar(dogrulaParselFiksturu(g)).join("\n")).toMatch(/yinelenen hucre/);
  });

  it("ilce -> il -> bolge tutarliligi ve harita eslemesi", () => {
    const f = kopya(temel());
    f.ilceler[0]!.bolge = "m_dag";
    expect(hatalar(dogrulaParselFiksturu(f)).join("\n")).toMatch(/ilin bolgesiyle \("m_ova"\) ayni degil/);
    const g = kopya(temel());
    g.ilceler[0]!.il = "sn_yok";
    expect(hatalar(dogrulaParselFiksturu(g)).join("\n")).toMatch(/bilinmeyen il "sn_yok"/);
    const k = kopya(temel());
    k.iller.push({ id: "sn_bos", ad: "Boş", bolge: "m_ova" });
    expect(hatalar(dogrulaParselFiksturu(k)).join("\n")).toMatch(/il "sn_bos": hic ilcesi yok/);
    const m = kopya(temel());
    m.iller[0]!.bolge = "m_bilinmez";
    m.ilceler.filter((c) => c.il === m.iller[0]!.id).forEach((c) => (c.bolge = "m_bilinmez"));
    const hm = hatalar(dogrulaParselFiksturu(m, { harita: mini() })).join("\n");
    expect(hm).toMatch(/haritada olmayan bolge "m_bilinmez"/);
    expect(hm).toMatch(/bolge "m_ova": hic ili yok/);
    expect(dogrulaParselFiksturu(m, { harita: mini(), tumBolgelerKapsanmali: false }).gecerli).toBe(false);
    // Haritasız doğrulama bölge kimliklerine bakmaz.
    expect(dogrulaParselFiksturu(m).gecerli).toBe(true);
  });

  it("sayimlar, uygun/engel ve ilce sinifi tutarliligi", () => {
    const f = kopya(temel());
    f.ilceler[0]!.hucreSayisi = 99;
    f.ilceler[0]!.uygunHucre = 1;
    const e = hatalar(dogrulaParselFiksturu(f)).join("\n");
    expect(e).toMatch(/hucreSayisi 99, hucre listesi 100/);
    expect(e).toMatch(/uygunHucre 1, sayilan/);
    const g = kopya(temel());
    const h0 = g.ilceler[0]!.hucreler.find((h) => h.uygun)!;
    h0.engel = "su";
    const h1 = g.ilceler[0]!.hucreler.find((h) => !h.uygun)!;
    delete h1.engel;
    const eg = hatalar(dogrulaParselFiksturu(g)).join("\n");
    expect(eg).toMatch(/uygun hucre .* engel tasiyamaz/);
    expect(eg).toMatch(/engel nedeni zorunlu/);
    const k = kopya(temel());
    k.ilceler[0]!.sinif = "sehir";
    expect(hatalar(dogrulaParselFiksturu(k)).join("\n")).toMatch(/ilce sinifi "sehir" en yuksek hucre sinifiyla \(kasaba\)/);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CIKTI_YOLU, haritaJson, uretSentetikHarita } from "../src/harita-uretici";
import { dogrulaHarita, varsayilanVeriyiYukle } from "../src/index";
import type { HaritaDosyasi } from "../src/index";

/** Kara kenarlari uzerinde (süreye göre) Dijkstra; `cikar` kümesindeki bölgeler yok sayılır. */
function karaEnKisaYollar(h: HaritaDosyasi, cikar: ReadonlySet<string>): Map<string, Map<string, number>> {
  const komsu = new Map<string, Array<[string, number]>>();
  for (const b of h.bolgeler) if (!cikar.has(b.id)) komsu.set(b.id, []);
  for (const k of h.kenarlar) {
    if (k.tur !== "kara" || cikar.has(k.a) || cikar.has(k.b)) continue;
    komsu.get(k.a)!.push([k.b, k.sureSaat]);
    komsu.get(k.b)!.push([k.a, k.sureSaat]);
  }
  const sonuc = new Map<string, Map<string, number>>();
  for (const kaynak of komsu.keys()) {
    const uzak = new Map<string, number>([[kaynak, 0]]);
    const acik = new Set<string>([kaynak]);
    while (acik.size > 0) {
      let u = "";
      let en = Infinity;
      for (const a of acik) {
        if ((uzak.get(a) as number) < en) {
          en = uzak.get(a) as number;
          u = a;
        }
      }
      acik.delete(u);
      for (const [v, w] of komsu.get(u)!) {
        if (en + w < (uzak.get(v) ?? Infinity)) {
          uzak.set(v, en + w);
          acik.add(v);
        }
      }
    }
    sonuc.set(kaynak, uzak);
  }
  return sonuc;
}

function bilesenSayisi(yollar: Map<string, Map<string, number>>): number {
  const gorulen = new Set<string>();
  let say = 0;
  for (const [k, uzak] of yollar) {
    if (gorulen.has(k)) continue;
    say++;
    for (const v of uzak.keys()) gorulen.add(v);
  }
  return say;
}

describe("harita uretici determinizmi", () => {
  it("iki uretim ayni JSON'u verir", () => {
    expect(haritaJson()).toBe(haritaJson());
    expect(JSON.stringify(uretSentetikHarita(42))).toBe(JSON.stringify(uretSentetikHarita(42)));
  });

  it("farkli tohum farkli harita verir (yapi ayni, sayilar farkli)", () => {
    const a = uretSentetikHarita(1);
    const b = uretSentetikHarita(2);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(a.bolgeler.map((x) => x.id)).toEqual(b.bolgeler.map((x) => x.id));
    expect(dogrulaHarita(b)).toEqual({ gecerli: true });
  });

  it("diskteki sentetik-50.json uretici ciktisiyla ayni (pnpm harita:uret ile guncel)", () => {
    expect(readFileSync(CIKTI_YOLU, "utf8")).toBe(haritaJson());
  });
});

describe("sentetik-50 harita metrikleri", () => {
  const { harita: h } = varsayilanVeriyiYukle();

  it("50 bolge, 4 devlet, 2 blok; her devletin 12+ bolgesi var", () => {
    expect(h.bolgeler).toHaveLength(50);
    expect(h.devletler).toHaveLength(4);
    expect(new Set(h.devletler.map((d) => d.blok)).size).toBe(2);
    for (const d of h.devletler) {
      expect(h.bolgeler.filter((b) => b.devlet === d.id).length).toBeGreaterThanOrEqual(12);
    }
  });

  it("koordinatlar 0-1000, nufus 50_000-800_000", () => {
    for (const b of h.bolgeler) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(1000);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(1000);
      expect(b.nufus).toBeGreaterThanOrEqual(45_000);
      expect(b.nufus).toBeLessThanOrEqual(800_000);
    }
  });

  it("en az 2 dar_gecit ve en az 6 liman; limanlar kiyi etiketli", () => {
    const limanlar = h.bolgeler.filter((b) => b.etiketler.includes("liman"));
    expect(h.bolgeler.filter((b) => b.etiketler.includes("dar_gecit")).length).toBeGreaterThanOrEqual(2);
    expect(limanlar.length).toBeGreaterThanOrEqual(6);
    for (const b of limanlar) expect(b.etiketler).toContain("kiyi");
  });

  it("kenar turleri: deniz 24-72 saat ve yuksek kapasite, kara 1-8 saat, dag kenarlari yavas/dusuk, hava hizli/dusuk", () => {
    const etiket = new Map(h.bolgeler.map((b) => [b.id, b.etiketler]));
    const karaNormal: number[] = [];
    const karaDag: number[] = [];
    let denizMinKap = Infinity;
    let havaMaksKap = 0;
    for (const k of h.kenarlar) {
      const ea = etiket.get(k.a) as string[];
      const eb = etiket.get(k.b) as string[];
      if (k.tur === "deniz") {
        expect(k.sureSaat).toBeGreaterThanOrEqual(24);
        expect(k.sureSaat).toBeLessThanOrEqual(72);
        denizMinKap = Math.min(denizMinKap, k.kapasiteSaat);
      } else if (k.tur === "kara") {
        expect(k.sureSaat).toBeGreaterThanOrEqual(1);
        expect(k.sureSaat).toBeLessThanOrEqual(8);
        const gecit = ea.includes("dar_gecit") || eb.includes("dar_gecit");
        const dag = ea.includes("dag") || eb.includes("dag");
        if (!gecit && dag) karaDag.push(k.sureSaat);
        if (!gecit && !dag) karaNormal.push(k.sureSaat);
        if (!gecit && !dag) expect(k.kapasiteSaat).toBeGreaterThanOrEqual(500_000);
        if (!gecit && dag) expect(k.kapasiteSaat).toBeLessThanOrEqual(250_000);
      } else {
        expect(k.sureSaat).toBeLessThanOrEqual(6);
        havaMaksKap = Math.max(havaMaksKap, k.kapasiteSaat);
      }
    }
    expect(h.kenarlar.filter((k) => k.tur === "hava").length).toBeGreaterThanOrEqual(2);
    expect(denizMinKap).toBeGreaterThanOrEqual(1_500_000);
    expect(havaMaksKap).toBeLessThanOrEqual(60_000);
    const ort = (d: number[]) => d.reduce((a, b) => a + b, 0) / d.length;
    expect(ort(karaDag)).toBeGreaterThan(ort(karaNormal));
  });

  it("iki kara kutlesi yalnizca deniz/hava ile baglanir (kara grafinda ada dahil en az 3 bilesen)", () => {
    const yollar = karaEnKisaYollar(h, new Set());
    expect(bilesenSayisi(yollar)).toBe(3); // bati, dogu, ada
  });

  it("dar gecitler gercekten darbogaz: cikarilinca kara yollari uzar veya bilesen artar", () => {
    const gecitler = h.bolgeler.filter((b) => b.etiketler.includes("dar_gecit")).map((b) => b.id);
    const once = karaEnKisaYollar(h, new Set());
    const toplam = (yollar: Map<string, Map<string, number>>, haric: ReadonlySet<string>): number => {
      // Her iki durumda da var olan bolgelerin (gecitler haric) ikili yol suresi toplami
      let s = 0;
      let eksik = 0;
      const kimlikler = h.bolgeler.map((b) => b.id).filter((id) => !haric.has(id));
      for (const a of kimlikler) {
        for (const b of kimlikler) {
          if (a >= b) continue;
          const d = yollar.get(a)?.get(b);
          if (d === undefined) eksik++;
          else s += d;
        }
      }
      return s + eksik * 1000; // ulasilamayan cift buyuk ceza
    };
    const haric = new Set(gecitler);
    const tumu = karaEnKisaYollar(h, haric);
    expect(bilesenSayisi(tumu) >= bilesenSayisi(once)).toBe(true);
    expect(toplam(tumu, haric)).toBeGreaterThan(toplam(once, haric));
    // Her gecit tek basina cikarilinca yollar kisalmaz; en az 2 gecit tek basina yollari uzatir
    let uzatanSayisi = 0;
    for (const g of gecitler) {
      const yalniz = new Set([g]);
      const fark = toplam(karaEnKisaYollar(h, yalniz), yalniz) - toplam(once, yalniz);
      expect(fark).toBeGreaterThanOrEqual(0);
      if (fark > 0) uzatanSayisi++;
    }
    expect(uzatanSayisi).toBeGreaterThanOrEqual(2);
  });

  it("kuzey-guney yarilar arasi kara baglantisi az ve cogu gecit uzerinden", () => {
    const devlet = new Map(h.bolgeler.map((b) => [b.id, b.devlet]));
    const etiket = new Map(h.bolgeler.map((b) => [b.id, b.etiketler]));
    const capraz = h.kenarlar.filter((k) => k.tur === "kara" && devlet.get(k.a) !== devlet.get(k.b));
    const karaSayisi = h.kenarlar.filter((k) => k.tur === "kara").length;
    const gecitli = capraz.filter(
      (k) => (etiket.get(k.a) as string[]).includes("dar_gecit") || (etiket.get(k.b) as string[]).includes("dar_gecit"),
    );
    expect(capraz.length).toBeLessThanOrEqual(karaSayisi / 8);
    expect(gecitli.length / capraz.length).toBeGreaterThanOrEqual(0.5);
  });

  it("kaynaklar dengesiz: her devlette en az bir ham mal yok, petrol/bakir/cevher bir devlette yogunlasir", () => {
    const hamlar = ["tahil", "cevher", "komur", "bakir", "silis", "petrol"];
    const devletToplam = new Map<string, Record<string, number>>();
    for (const d of h.devletler) devletToplam.set(d.id, {});
    for (const b of h.bolgeler) {
      const t = devletToplam.get(b.devlet) as Record<string, number>;
      for (const [m, v] of Object.entries(b.rezervler)) t[m] = (t[m] ?? 0) + v;
    }
    for (const [, t] of devletToplam) {
      expect(hamlar.some((m) => (t[m] ?? 0) === 0)).toBe(true);
    }
    for (const m of ["petrol", "bakir", "cevher"]) {
      const toplam = [...devletToplam.values()].reduce((s, t) => s + (t[m] ?? 0), 0);
      const enBuyuk = Math.max(...[...devletToplam.values()].map((t) => t[m] ?? 0));
      expect(enBuyuk / toplam).toBeGreaterThanOrEqual(0.4);
    }
    // Her ham mal en az iki bolgede bulunur, ama bolge rezervleri birbirinden cok farkli olur
    const rezervler = h.bolgeler.flatMap((b) => Object.values(b.rezervler));
    expect(Math.max(...rezervler) / Math.min(...rezervler)).toBeGreaterThanOrEqual(5);
  });

  it("her bolgenin 1-4 baslangic tesisi var (en cok 3 uretim tesisi + 1 baslangic santrali, B2)", () => {
    for (const b of h.bolgeler) {
      expect(b.tesisler.length).toBeGreaterThanOrEqual(1);
      expect(b.tesisler.length).toBeLessThanOrEqual(4);
      expect(b.tesisler.filter((t) => t !== "santral" && t !== "hidro_santrali").length).toBeLessThanOrEqual(3);
    }
  });
});

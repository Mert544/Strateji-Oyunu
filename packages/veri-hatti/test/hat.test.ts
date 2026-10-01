/**
 * Üretilen gerçek harita çıktılarının (packages/veri/haritalar/gercek-*) kalite ve kısıt testleri.
 * Yalnızca repodaki çıktıları ve yapılandırmayı okur (ağ/önbellek gerekmez).
 */
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { feature } from "topojson-client";
import { dogrulaVeriPaketi, gercekVeriyiYukle, type HaritaDosyasi } from "@bolge/veri";
import { noktaCokgende, cokgenleriAl } from "../src/cografya";
import { yapilandirmaDogrula, yapilandirmaOku } from "../src/yapilandirma";
import { HARITA_DIZINI, HARITA_DOSYASI, SINIR_DOSYASI } from "../src/yollar";
import { DENIZ, KARA_KURALLARI, NUFUS } from "../src/kurallar";

const yap = yapilandirmaOku();
const paket = gercekVeriyiYukle();
const harita: HaritaDosyasi = paket.harita;
const topoYolu = resolve(HARITA_DIZINI, SINIR_DOSYASI);
const topo = JSON.parse(readFileSync(topoYolu, "utf8")) as Parameters<typeof feature>[0] & { objects: Record<string, never> };

const kita = new Map(yap.bolgeler.map((b) => [b.id, b.kita]));
const bogazlar = new Set(["istanbul", "canakkale"]);

/** Verilen kenar türlerinde, `cikar` bölgeleri olmadan bağlı bileşenler. */
function bilesenler(turler: readonly string[], cikar: ReadonlySet<string> = new Set()): string[][] {
  const komsu = new Map<string, string[]>();
  for (const b of harita.bolgeler) if (!cikar.has(b.id)) komsu.set(b.id, []);
  for (const k of harita.kenarlar) {
    if (!turler.includes(k.tur) || cikar.has(k.a) || cikar.has(k.b)) continue;
    komsu.get(k.a)?.push(k.b);
    komsu.get(k.b)?.push(k.a);
  }
  const goruldu = new Set<string>();
  const sonuc: string[][] = [];
  for (const b of komsu.keys()) {
    if (goruldu.has(b)) continue;
    const grup: string[] = [];
    const yigin = [b];
    goruldu.add(b);
    while (yigin.length > 0) {
      const u = yigin.pop() as string;
      grup.push(u);
      for (const v of komsu.get(u) ?? []) {
        if (goruldu.has(v)) continue;
        goruldu.add(v);
        yigin.push(v);
      }
    }
    sonuc.push(grup);
  }
  return sonuc;
}

describe("gercek harita: sozlesme ve dogrulama", () => {
  it("yapilandirma kendi icinde tutarli", () => {
    expect(yapilandirmaDogrula(yap)).toEqual([]);
  });

  it("dogrulaVeriPaketi'nden gecer (varsayilan aralik ve icerik/parametrelerle)", () => {
    const s = dogrulaVeriPaketi(paket);
    expect(s).toEqual({ gecerli: true });
  });

  it("bolge sayisi 40-55, 4 devlet / 2 blok, kimlikler ASCII", () => {
    expect(harita.bolgeler.length).toBeGreaterThanOrEqual(40);
    expect(harita.bolgeler.length).toBeLessThanOrEqual(55);
    expect(harita.devletler).toHaveLength(4);
    expect(new Set(harita.devletler.map((d) => d.blok)).size).toBe(2);
    for (const b of harita.bolgeler) expect(b.id).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("devlet ve blok adlari gercek ulke/ittifak adi degil (nötr kurgusal adlar)", () => {
    const yasak = /t[uü]rk|yunan|bulgar|romen|ukrayna|rus|g[uü]rc|s[ıi]rp|arnavut|makedon|moldov|nato|avrupa|\bab\b|varşova/i;
    for (const d of harita.devletler) {
      expect(d.ad).not.toMatch(yasak);
      expect(d.blok).not.toMatch(yasak);
    }
  });

  it("her bolgenin konumu var ve kendi sinir cokgeninin icinde", () => {
    const fc = feature(topo, (topo as unknown as { objects: Record<string, never> }).objects["bolgeler"] as never) as unknown as {
      features: Array<{ properties: { id: string }; geometry: { type: string; coordinates: unknown } }>;
    };
    const geo = new Map(fc.features.map((f) => [f.properties.id, f.geometry]));
    for (const b of harita.bolgeler) {
      expect(b.konum, b.id).toBeDefined();
      const g = geo.get(b.id);
      expect(g, `sinir geometrisi: ${b.id}`).toBeDefined();
      const icerde = cokgenleriAl(g as never).some((c) => noktaCokgende((b.konum!.boylamMikro) / 1e6, (b.konum!.enlemMikro) / 1e6, c));
      expect(icerde, `konum cokgenin icinde: ${b.id}`).toBe(true);
    }
  });

  it("x/y 0-1000 tamsayi; nufus 50k-800k; rezervler sentetik olcekte", () => {
    for (const b of harita.bolgeler) {
      expect(Number.isInteger(b.x) && b.x >= 0 && b.x <= 1000).toBe(true);
      expect(Number.isInteger(b.y) && b.y >= 0 && b.y <= 1000).toBe(true);
      expect(b.nufus).toBeGreaterThanOrEqual(NUFUS.min);
      expect(b.nufus).toBeLessThanOrEqual(NUFUS.maks);
      for (const v of Object.values(b.rezervler)) {
        expect(v).toBeGreaterThanOrEqual(50_000_000);
        expect(v).toBeLessThanOrEqual(1_200_000_000);
      }
      expect(b.tesisler.length).toBeGreaterThanOrEqual(1);
      expect(b.tesisler.length).toBeLessThanOrEqual(3);
    }
    const nufuslar = harita.bolgeler.map((b) => b.nufus);
    expect(Math.min(...nufuslar)).toBe(NUFUS.min);
    expect(Math.max(...nufuslar)).toBe(NUFUS.maks);
  });

  it("atif satirlari dolu ve Natural Earth ile USGS'yi anar", () => {
    const atif = (harita.atif ?? []).join("\n");
    expect(atif).toContain("Natural Earth");
    expect(atif).toContain("USGS");
    expect(harita.sinirDosyasi).toBe(SINIR_DOSYASI);
  });
});

describe("gercek harita: sinir dosyasi", () => {
  it("TopoJSON boyutu <= 300 KB", () => {
    expect(statSync(topoYolu).size).toBeLessThanOrEqual(300 * 1024);
  });

  it('"bolgeler" nesnesi: her geometri properties.id tasir ve bolgelerle birebir ortusur', () => {
    const nesne = (topo as unknown as { objects: { bolgeler: { geometries: Array<{ properties?: { id?: string }; arcs?: unknown[] }> } } }).objects.bolgeler;
    const kimlikler = nesne.geometries.map((g) => g.properties?.id);
    expect([...kimlikler].sort()).toEqual(harita.bolgeler.map((b) => b.id).sort());
    for (const g of nesne.geometries) expect((g.arcs ?? []).length).toBeGreaterThan(0);
  });

  it("gercekVeriyiYukle sinir dosyasi ve bolge eslesmesini kendisi de denetler", () => {
    expect(() => gercekVeriyiYukle("yok-boyle-harita")).toThrow();
    expect(() => gercekVeriyiYukle("../etc")).toThrow();
    expect(HARITA_DOSYASI).toBe("gercek-karadeniz.json");
  });
});

describe("gercek harita: bogazlar ve dar gecitler", () => {
  it("Istanbul ve Canakkale 'dar_gecit' etiketli; ayrica en az 2 dag gecidi", () => {
    const gecitler = harita.bolgeler.filter((b) => b.etiketler.includes("dar_gecit")).map((b) => b.id);
    for (const b of bogazlar) expect(gecitler).toContain(b);
    expect(gecitler.filter((g) => !bogazlar.has(g)).length).toBeGreaterThanOrEqual(2);
    expect(gecitler).toContain("sipka"); // Balkan Dağları
    expect(gecitler).toContain("kafkas_gecidi"); // Kafkasya
  });

  it("Avrupa-Asya kara yolu yalnizca Istanbul ve Canakkale bolgelerinden gecer", () => {
    // 1) Dogrudan Avrupa-Asya kara kenari yok
    for (const k of harita.kenarlar.filter((x) => x.tur === "kara")) {
      const ab = [kita.get(k.a), kita.get(k.b)];
      if (ab.includes("avrupa") && ab.includes("asya")) throw new Error(`dogrudan kita gecisi: ${k.a} - ${k.b}`);
    }
    // 2) Bogazlar olmadan kara grafiginde her bilesen tek kitadadir
    for (const grup of bilesenler(["kara"], bogazlar)) {
      const kitalar = new Set(grup.map((g) => kita.get(g)));
      expect(kitalar.size, `karma kita bileseni: ${grup.join(",")}`).toBe(1);
    }
    // 3) Bogazlarin her biri iki kitayi da kara ile baglar
    for (const bogaz of bogazlar) {
      const komsular = harita.kenarlar
        .filter((k) => k.tur === "kara" && (k.a === bogaz || k.b === bogaz))
        .map((k) => (k.a === bogaz ? k.b : k.a));
      const kitalar = new Set(komsular.map((g) => kita.get(g)));
      expect(kitalar.has("avrupa"), `${bogaz}: Avrupa komsusu`).toBe(true);
      expect(kitalar.has("asya"), `${bogaz}: Asya komsusu`).toBe(true);
    }
    // 4) Avrupa'da da Asya'da da en az birkac bolge var (bos kisit degil)
    expect(harita.bolgeler.filter((b) => kita.get(b.id) === "avrupa").length).toBeGreaterThan(10);
    expect(harita.bolgeler.filter((b) => kita.get(b.id) === "asya").length).toBeGreaterThan(10);
  });

  it("Karadeniz deniz agi ile Ege/Akdeniz deniz agi yalnizca Istanbul ve Canakkale uzerinden baglanir", () => {
    const havza = new Map(yap.bolgeler.map((b) => [b.id, b.havzalar]));
    const denizBolgeleri = new Set(harita.kenarlar.filter((k) => k.tur === "deniz").flatMap((k) => [k.a, k.b]));
    const gruplar = bilesenler(["deniz"], bogazlar).filter((g) => g.some((r) => denizBolgeleri.has(r)));
    const karadenizGrubu = gruplar.find((g) => g.includes("varna")) as string[];
    const egeGrubu = gruplar.find((g) => g.includes("selanik")) as string[];
    expect(karadenizGrubu).toBeDefined();
    expect(egeGrubu).toBeDefined();
    expect(karadenizGrubu).not.toBe(egeGrubu);
    // Karadeniz grubunda ege/akdeniz'e ait tek havza uyesi yok (yalnizca bogaz bolgeleri karisik)
    for (const r of karadenizGrubu) {
      expect((havza.get(r) ?? []).every((h) => h === "karadeniz")).toBe(true);
    }
  });

  it("gecit bolgelerine bagli kara kenarlari dar (gecit sinifi) kapasitelidir", () => {
    const gecitKurali = KARA_KURALLARI.gecit;
    const gecitler = new Set(harita.bolgeler.filter((b) => b.etiketler.includes("dar_gecit")).map((b) => b.id));
    const kenarlar = harita.kenarlar.filter((k) => k.tur === "kara" && (gecitler.has(k.a) || gecitler.has(k.b)));
    expect(kenarlar.length).toBeGreaterThanOrEqual(8);
    for (const k of kenarlar) {
      expect(k.kapasiteSaat).toBeGreaterThanOrEqual(gecitKurali.kapasiteMin);
      expect(k.kapasiteSaat).toBeLessThanOrEqual(gecitKurali.kapasiteMaks);
      expect(k.sureSaat).toBeGreaterThanOrEqual(gecitKurali.sureMin);
    }
  });

  it("Balkan Dağları kuşağını Şipka dışında geçen doğrudan kara kenarı yok", () => {
    const yasak = new Set(yap.kaldirilanKaraKenarlari.map((k) => (k.a < k.b ? `${k.a}|${k.b}` : `${k.b}|${k.a}`)));
    expect(yasak.size).toBeGreaterThanOrEqual(5);
    for (const k of harita.kenarlar) expect(yasak.has(k.a < k.b ? `${k.a}|${k.b}` : `${k.b}|${k.a}`), `${k.a}-${k.b}`).toBe(false);
  });
});

describe("gercek harita: kenarlar ve limanlar", () => {
  it("kenar kapasite ve sureleri sentetik haritadaki aralikta", () => {
    for (const k of harita.kenarlar) {
      if (k.tur === "kara") {
        expect(k.kapasiteSaat).toBeGreaterThanOrEqual(140_000);
        expect(k.kapasiteSaat).toBeLessThanOrEqual(760_000);
        expect(k.sureSaat).toBeGreaterThanOrEqual(1);
        expect(k.sureSaat).toBeLessThanOrEqual(10);
      } else if (k.tur === "deniz") {
        expect(k.kapasiteSaat).toBeGreaterThanOrEqual(DENIZ.kapasiteMin);
        expect(k.kapasiteSaat).toBeLessThanOrEqual(DENIZ.kapasiteMaks);
        expect(k.sureSaat).toBeGreaterThanOrEqual(DENIZ.sureMin);
        expect(k.sureSaat).toBeLessThanOrEqual(DENIZ.sureMaks);
      } else {
        expect(k.kapasiteSaat).toBeLessThanOrEqual(55_000);
      }
    }
  });

  it("deniz kenarlari yalnizca liman bolgeleri arasinda; liman bolgesi kiyi; en az 15 liman", () => {
    const liman = new Set(harita.bolgeler.filter((b) => b.etiketler.includes("liman")).map((b) => b.id));
    expect(liman.size).toBeGreaterThanOrEqual(15);
    for (const b of harita.bolgeler.filter((x) => x.etiketler.includes("liman"))) expect(b.etiketler).toContain("kiyi");
    for (const k of harita.kenarlar.filter((x) => x.tur === "deniz")) {
      expect(liman.has(k.a) && liman.has(k.b), `${k.a}-${k.b}`).toBe(true);
    }
    // Her liman bolgesinin en az bir deniz kenari var
    const denizde = new Set(harita.kenarlar.filter((k) => k.tur === "deniz").flatMap((k) => [k.a, k.b]));
    for (const l of liman) expect(denizde.has(l), `deniz kenari: ${l}`).toBe(true);
  });

  it("deniz suresi gercek deniz mesafesi/hiz ile tutarli (Istanbul - Canakkale ~ 10-14 saat)", () => {
    const k = harita.kenarlar.find((x) => x.tur === "deniz" && x.a === "canakkale" && x.b === "istanbul");
    expect(k).toBeDefined();
    expect(k!.sureSaat).toBeGreaterThanOrEqual(8);
    expect(k!.sureSaat).toBeLessThanOrEqual(16);
  });

  it("liman listesi Natural Earth ports'tan gelir; eklenenler yapilandirmada gerekcelidir", () => {
    const rapor = JSON.parse(readFileSync(resolve(__dirname, "../rapor/hat-raporu.json"), "utf8")) as { limanlar: Record<string, string[]> };
    const tum = Object.values(rapor.limanlar).flat();
    const ne = tum.filter((x) => x.endsWith("(ne_ports)"));
    const ek = tum.filter((x) => x.endsWith("(ne_places)"));
    expect(ne.length).toBeGreaterThanOrEqual(20);
    expect(ek.length).toBe(yap.ekLimanlar.length);
    for (const e of yap.ekLimanlar) expect(e.neden.length).toBeGreaterThan(10);
  });
});

describe("gercek harita: kaynak dengesizligi", () => {
  it("her devletin zinciri tek basina eksik (bir malda <= %10) ve bir malda baskin (>= %33)", () => {
    const toplam: Record<string, number> = {};
    const devlet: Record<string, Record<string, number>> = {};
    for (const b of harita.bolgeler) {
      for (const [mal, v] of Object.entries(b.rezervler)) {
        toplam[mal] = (toplam[mal] ?? 0) + v;
        const d = (devlet[b.devlet] ??= {});
        d[mal] = (d[mal] ?? 0) + v;
      }
    }
    const mallar = ["tahil", "cevher", "komur", "bakir", "silis", "petrol"];
    for (const d of harita.devletler) {
      const pay = (mal: string): number => ((devlet[d.id]?.[mal] ?? 0) / (toplam[mal] ?? 1));
      expect(mallar.some((m) => pay(m) <= 0.1), `${d.id}: kit mal`).toBe(true);
      expect(mallar.some((m) => pay(m) >= 0.33), `${d.id}: baskin mal`).toBe(true);
    }
  });

  it("her ham mal en az 3 bolgede bulunur", () => {
    for (const mal of ["tahil", "cevher", "komur", "bakir", "silis", "petrol"]) {
      expect(harita.bolgeler.filter((b) => (b.rezervler[mal] ?? 0) > 0).length, mal).toBeGreaterThanOrEqual(3);
    }
  });

  it("tarim (ciftlik) yalnizca 'ova' bolgelerinde; her bolgede 1-3 baslangic tesisi", () => {
    for (const b of harita.bolgeler) {
      if (b.tesisler.includes("ciftlik")) expect(b.etiketler, b.id).toContain("ova");
    }
  });
});

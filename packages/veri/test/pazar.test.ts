/**
 * Pazar katmanı (B3) veri sözleşmesi: pazar v1 parametreleri (ya hiçbiri ya hepsi, makas-çarpan tutarlılığı, kıtlık sırası ve %30 tavanı),
 * liman tanımı (şema ve kuralları), liman türetme (dünya kapıları, kapıya deniz mesafesi), sentetik harita dosyasıyla tutarlılık,
 * kapalı mod uyumu (B3 öncesi parametre dosyası yüklenir).
 */
import { describe, expect, it } from "vitest";
import {
  dogrulaHarita,
  dogrulaParametreler,
  dogrulaVeriPaketi,
  gercekVeriyiYukle,
  limanTanimlariTuret,
  limanlariTamamla,
  miniVeriyiYukle,
  varsayilanVeriyiYukle,
  ULASILAMAYAN_LIMAN_MESAFESI_SAAT,
} from "../src/index";
import type { DogrulamaSonucu, HaritaDosyasi, Parametreler } from "../src/index";
import { uretSentetikHarita } from "../src/harita-uretici";

function hatalar(s: DogrulamaSonucu): string[] {
  return s.gecerli ? [] : s.hatalar;
}

const temel = () => varsayilanVeriyiYukle();

function param(duzenle: (p: Parametreler) => void): DogrulamaSonucu {
  const v = temel();
  duzenle(v.param);
  return dogrulaParametreler(v.param, v.icerik);
}

describe("varsayılan parametreler pazar v1 açıktır (docs/08 §5.5)", () => {
  it("makas, prim, komisyon, kıtlık ve tarife değerleri; eski çarpanlar makasla tutarlı; paket geçerli", () => {
    const v = temel();
    const p = v.param.pazar;
    expect(p.makasPpm).toBe(200_000);
    expect(p.anlasmaMakasPpm).toBe(100_000);
    expect(p.yaptirimMakasPpm).toBe(600_000);
    expect(p.limanPrimPpmSaat).toBe(2500);
    expect(p.limanPrimTavaniPpm).toBe(150_000);
    expect(p.islemKomisyonuPpm).toBe(10_000);
    expect(p.npcLikiditeTabanOyuncu).toBe(4);
    expect(p.kitlik).toEqual({ esikPpm: [900_000, 700_000, 500_000], cezaPpm: [50_000, 150_000, 300_000], toparlanmaSaat: 24 });
    expect(p.tarife).toEqual({ ithalatPpm: [0, 100_000, 200_000], ihracatVergisiPpm: [0, 50_000, 100_000] });
    expect(p.ithalatCarpaniPpm).toBe(1_000_000 + p.makasPpm! / 2);
    expect(p.ihracatCarpaniPpm).toBe(1_000_000 - p.makasPpm! / 2);
    expect(v.param.surum).toBe(1);
    expect(dogrulaVeriPaketi(v)).toEqual({ gecerli: true });
  });
});

describe("pazar parametreleri doğrulaması", () => {
  it("B3 öncesi dosya (hiçbir B3 alanı yok) hâlâ geçerli: pazar v1 kapalı", () => {
    const s = param((p) => {
      for (const a of ["makasPpm", "anlasmaMakasPpm", "yaptirimMakasPpm", "limanPrimPpmSaat", "limanPrimTavaniPpm", "islemKomisyonuPpm", "npcLikiditeTabanOyuncu", "kitlik", "tarife"] as const) {
        delete p.pazar[a];
      }
    });
    expect(s).toEqual({ gecerli: true });
  });

  it("ya hiçbiri ya hepsi: tek bir B3 alanı eksikse hata", () => {
    const s = param((p) => { delete p.pazar.kitlik; });
    expect(hatalar(s).some((h) => h.includes("ya hic ya hepsi") && h.includes("kitlik"))).toBe(true);
  });

  it("eski çarpan alanları makasla tutarsızsa hata", () => {
    expect(hatalar(param((p) => { p.pazar.ithalatCarpaniPpm = 1_120_000; })).some((h) => h.includes("ithalatCarpaniPpm") && h.includes("tutarsiz"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.yaptirimIhracatCarpaniPpm = 800_000; })).some((h) => h.includes("yaptirimIhracatCarpaniPpm"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.makasPpm = 300_000; })).length).toBeGreaterThan(0); // çarpanlar artık tutarsız
  });

  it("makas sırası: anlaşma makası <= makas <= yaptırım makası; makas çift sayı", () => {
    expect(hatalar(param((p) => { p.pazar.anlasmaMakasPpm = 300_000; p.pazar.anlasmaIthalatCarpaniPpm = 1_150_000; p.pazar.anlasmaIhracatCarpaniPpm = 850_000; })).some((h) => h.includes("anlasmaMakasPpm"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.yaptirimMakasPpm = 100_000; p.pazar.yaptirimIthalatCarpaniPpm = 1_050_000; p.pazar.yaptirimIhracatCarpaniPpm = 950_000; })).some((h) => h.includes("yaptirimMakasPpm"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.makasPpm = 200_001; })).some((h) => h.includes("makasPpm") && h.includes("cift"))).toBe(true);
  });

  it("kıtlık: eşikler azalan, cezalar artan, en çok %30; toparlanma >= 1", () => {
    expect(hatalar(param((p) => { p.pazar.kitlik!.esikPpm = [700_000, 900_000, 500_000]; })).some((h) => h.includes("esikPpm"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.kitlik!.cezaPpm = [150_000, 50_000, 300_000]; })).some((h) => h.includes("cezaPpm"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.kitlik!.cezaPpm = [50_000, 150_000, 400_000]; })).some((h) => h.includes("300000"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.kitlik!.toparlanmaSaat = 0; })).length).toBeGreaterThan(0);
  });

  it("tarife: varsayılan kademe 0 olmalı; prim tavanı ve komisyon üst sınırları", () => {
    expect(hatalar(param((p) => { p.pazar.tarife!.ithalatPpm = [50_000, 100_000]; })).some((h) => h.includes("ithalatPpm[0]"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.tarife!.ihracatVergisiPpm = []; })).length).toBeGreaterThan(0);
    expect(hatalar(param((p) => { p.pazar.limanPrimTavaniPpm = 600_000; })).some((h) => h.includes("limanPrimTavaniPpm"))).toBe(true);
    expect(hatalar(param((p) => { p.pazar.islemKomisyonuPpm = 300_000; })).some((h) => h.includes("islemKomisyonuPpm"))).toBe(true);
  });

  it("şema: tamsayı olmayan değer ve tanınmayan alan reddedilir", () => {
    expect(hatalar(param((p) => { (p.pazar as unknown as Record<string, unknown>)["limanPrimPpmSaat"] = 2500.5; })).length).toBeGreaterThan(0);
    expect(hatalar(param((p) => { (p.pazar as unknown as Record<string, unknown>)["bilinmeyen"] = 1; })).some((h) => h.includes("bilinmeyen"))).toBe(true);
  });
});

describe("liman tanımı (harita) doğrulaması", () => {
  it("liman tanımı yalnız liman etiketli bölgede; kapıda mesafe 0, kapı değilse >= 1", () => {
    const h = (duzenle: (x: HaritaDosyasi) => void): string[] => {
      const v = temel();
      duzenle(v.harita);
      return hatalar(dogrulaHarita(v.harita));
    };
    const limansiz = (x: HaritaDosyasi) => x.bolgeler.find((b) => !b.etiketler.includes("liman"))!;
    const liman = (x: HaritaDosyasi) => x.bolgeler.find((b) => b.etiketler.includes("liman") && b.liman?.dunyaKapisi === false)!;
    expect(h((x) => { limansiz(x).liman = { dunyaKapisi: true, dunyaMesafeSaat: 0, kapasiteSinifi: 1 }; }).some((e) => e.includes("etiketli bolgede"))).toBe(true);
    expect(h((x) => { x.bolgeler.find((b) => b.liman?.dunyaKapisi === true)!.liman!.dunyaMesafeSaat = 5; }).some((e) => e.includes("dunya kapisinda 0"))).toBe(true);
    expect(h((x) => { liman(x).liman!.dunyaMesafeSaat = 0; }).some((e) => e.includes("en az 1 saat"))).toBe(true);
    expect(h((x) => { liman(x).liman!.kapasiteSinifi = 5; }).length).toBeGreaterThan(0);
    expect(h(() => undefined)).toEqual([]);
  });
});

describe("liman türetme (dünya kapıları ve kapıya deniz mesafesi)", () => {
  /** Deniz kenarları üzerinde (sureSaat) çok kaynaklı Dijkstra: bağımsız doğrulama. */
  function denizMesafeleri(h: HaritaDosyasi, kaynaklar: string[]): Map<string, number> {
    const uzak = new Map<string, number>(kaynaklar.map((k) => [k, 0]));
    const acik = new Set(kaynaklar);
    while (acik.size > 0) {
      let u = "";
      let en = Infinity;
      for (const a of acik) if ((uzak.get(a) as number) < en || ((uzak.get(a) as number) === en && a < u)) { en = uzak.get(a) as number; u = a; }
      acik.delete(u);
      for (const k of h.kenarlar) {
        if (k.tur !== "deniz") continue;
        const v = k.a === u ? k.b : k.b === u ? k.a : null;
        if (v !== null && en + k.sureSaat < (uzak.get(v) ?? Infinity)) {
          uzak.set(v, en + k.sureSaat);
          acik.add(v);
        }
      }
    }
    return uzak;
  }

  it("sentetik harita: dosyadaki liman tanımları, üreticinin türetmesiyle ve çıplak haritadan türetmeyle aynı", () => {
    const v = temel();
    const cıplak = uretSentetikHarita();
    for (const b of cıplak.bolgeler) delete b.liman;
    const turet = limanTanimlariTuret(cıplak);
    const limanlar = v.harita.bolgeler.filter((b) => b.etiketler.includes("liman"));
    expect(limanlar.length).toBe(9);
    expect(turet.size).toBe(9);
    for (const b of limanlar) {
      expect(b.liman).toBeDefined();
      expect(b.liman).toEqual(turet.get(b.id));
    }
    // limansız bölgede tanım yok
    expect(v.harita.bolgeler.filter((b) => b.liman !== undefined).length).toBe(9);
  });

  it("sentetik: 3-4 dünya kapısı, her deniz bileşeninde en az bir kapı, mesafe = bağımsız Dijkstra", () => {
    const h = temel().harita;
    const kapilar = h.bolgeler.filter((b) => b.liman?.dunyaKapisi === true).map((b) => b.id);
    expect(kapilar.length).toBeGreaterThanOrEqual(2);
    expect(kapilar.length).toBeLessThanOrEqual(4);
    const uzak = denizMesafeleri(h, kapilar);
    for (const b of h.bolgeler.filter((x) => x.liman !== undefined)) {
      const l = b.liman!;
      expect(l.dunyaMesafeSaat).toBe(l.dunyaKapisi ? 0 : (uzak.get(b.id) ?? ULASILAMAYAN_LIMAN_MESAFESI_SAAT));
      expect(l.kapasiteSinifi).toBeGreaterThanOrEqual(1);
      expect(l.kapasiteSinifi).toBeLessThanOrEqual(4);
    }
    // sentetik: iki deniz bileşeninin ikisinde de kapı var (kapısız bileşen kendi kapısını kazanır)
    expect(kapilar).toContain("hilal_adasi"); // en çok bağlı (4 deniz kenarı)
    expect([...uzak.keys()].filter((k) => h.bolgeler.find((b) => b.id === k)!.etiketler.includes("liman")).length).toBe(9);
  });

  it("gerçek harita (boru hattı liman alanı üretmez): yükleyici türetir; 4 kapı, her liman bir kapıya ulaşır", () => {
    const v = gercekVeriyiYukle();
    const limanlar = v.harita.bolgeler.filter((b) => b.etiketler.includes("liman"));
    expect(limanlar.length).toBe(27);
    expect(limanlar.every((b) => b.liman !== undefined)).toBe(true);
    const kapilar = limanlar.filter((b) => b.liman!.dunyaKapisi).map((b) => b.id);
    expect(kapilar).toEqual(["girit", "ege_adalari", "istanbul", "canakkale"]);
    const uzak = denizMesafeleri(v.harita, kapilar);
    for (const b of limanlar) expect(b.liman!.dunyaMesafeSaat).toBe(uzak.get(b.id));
    // Karadeniz'in doğusu uzak (prim tavanına yakın), Boğaz'a yakın liman yakın
    const mesafe = (id: string) => v.harita.bolgeler.find((b) => b.id === id)!.liman!.dunyaMesafeSaat;
    expect(mesafe("kastamonu")).toBeGreaterThan(mesafe("varna"));
    expect(mesafe("istanbul")).toBe(0);
  });

  it("deterministik: iki türetme aynı; eksik tanım doldurulur, mevcut tanıma dokunulmaz; pazar kapalıysa doldurma yok", () => {
    const h = uretSentetikHarita();
    for (const b of h.bolgeler) delete b.liman;
    expect([...limanTanimlariTuret(h)]).toEqual([...limanTanimlariTuret(h)]);
    const paket = { harita: h, icerik: temel().icerik, param: temel().param };
    expect(limanlariTamamla(paket)).toBe(9);
    expect(limanlariTamamla(paket)).toBe(0); // zaten dolu
    const kapali = { harita: uretSentetikHarita(), icerik: temel().icerik, param: temel().param };
    for (const b of kapali.harita.bolgeler) delete b.liman;
    delete kapali.param.pazar.makasPpm;
    expect(limanlariTamamla(kapali)).toBe(0);
    expect(kapali.harita.bolgeler.some((b) => b.liman !== undefined)).toBe(false);
  });

  it("özel durumlar: tek limanlı harita kapı; yalıtılmış (deniz kenarsız) liman 72 saat", () => {
    const mini = miniVeriyiYukle();
    expect(mini.harita.bolgeler.find((b) => b.id === "m_liman")!.liman).toEqual({ dunyaKapisi: true, dunyaMesafeSaat: 0, kapasiteSinifi: 1 });
    // yalıtılmış liman: m_sehir'e liman etiketi ver ama deniz kenarını kaldır
    const h: HaritaDosyasi = structuredClone(mini.harita);
    h.kenarlar = h.kenarlar.filter((k) => k.tur !== "deniz");
    for (const b of h.bolgeler) delete b.liman;
    h.bolgeler.find((b) => b.id === "m_sehir")!.etiketler.push("liman");
    const t = limanTanimlariTuret(h);
    // iki yalıtılmış liman: kimliği küçük olan kapı sayılır (tek kapı), diğeri ulaşılamaz (72 saat)
    expect(t.get("m_liman")).toEqual({ dunyaKapisi: true, dunyaMesafeSaat: 0, kapasiteSinifi: 1 });
    expect(t.get("m_sehir")).toEqual({ dunyaKapisi: false, dunyaMesafeSaat: ULASILAMAYAN_LIMAN_MESAFESI_SAAT, kapasiteSinifi: 1 });
  });

  it("liman tanımı olmayan eski (B3 öncesi) harita dosyası yüklenir: sentetik-50 bütünüyle şemaya uyar", () => {
    const h = JSON.parse(JSON.stringify(temel().harita)) as HaritaDosyasi;
    for (const b of h.bolgeler) delete b.liman;
    expect(dogrulaHarita(h)).toEqual({ gecerli: true });
  });
});

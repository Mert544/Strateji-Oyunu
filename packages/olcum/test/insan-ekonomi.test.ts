/**
 * Alfa-0 ekonomi izleme (A2 alfa0-ekonomi-izleme, O2-1/O2-2/O2-3 ve E1–E10): günlük oynatmanın `ekonomi` bölümü. Beklenenler dünyadan BAĞIMSIZ okunur
 * (fikstür koşarken günlük örnekleri ayrıca alınır); çıkarma bunlarla eşleşmeli. Çıktıda oyuncu kimliği olmaz.
 */
import { describe, expect, it } from "vitest";
import { GUN, MILI, SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikHazine, kasaBakiyesi, yurtPlanla } from "@bolge/cekirdek";
import type { Dunya, Komut, ParaSayaci } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { parselBotuOlustur } from "@bolge/botlar";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { EKONOMI_ESIKLERI, SERMAYE_KOMUTLARI, cikar, dukkanKurulusuOku } from "../src";
import type { CikarmaGunlukKaydi } from "../src";

const veri = (): CekirdekVeriPaketi => ({ ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") });
const TEST_OYUNCU = "ayse_demir";
const KATILMA = 1 * GUN;
const BITIS = 16 * GUN;

const say = (s: ParaSayaci): number => Math.floor(s.n + s.a / SAAT);

interface Ornek {
  t: number;
  hazine: Map<string, number>;
  musluk: Record<string, number>;
  lavabo: Record<string, number>;
  kasaGiris: number;
  kasaBakiye: number;
  fiyatOrani: number[];
}

/** Üç bot + test oyuncusu; her komut günlüğe girer (sunucu gibi); gün sınırlarında bağımsız örnek alınır. */
function fikstur(): { gunluk: CikarmaGunlukKaydi[]; ornekler: Ornek[]; sermaye: Map<string, Array<{ t: number; tutar: number }>>; sim: Simulasyon } {
  const v = veri();
  const sim = Simulasyon.olustur(v, 1);
  const gunluk: CikarmaGunlukKaydi[] = [];
  const kaydet = (t: number, oyuncu: string, komut: Komut): boolean => {
    const r = sim.uygula({ t, oyuncu, komut });
    gunluk.push({ seq: gunluk.length + 1, t, oyuncu, komut: structuredClone(komut) });
    return r.tamam;
  };
  const katil = (t: number, oyuncu: string): void => {
    sim.calistirKadar(t);
    const plan = yurtPlanla(sim.dunya, sim.ic);
    const ilce = plan !== null && typeof plan !== "string" ? plan.ilce : undefined;
    kaydet(t, SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu, bolgeler: [], ...(ilce !== undefined ? { ilce } : {}) });
  };
  const botlar = [
    { id: "ali", bot: parselBotuOlustur("ciftci", "ali") },
    { id: "veli", bot: parselBotuOlustur("sanayici", "veli") },
    { id: TEST_OYUNCU, bot: parselBotuOlustur("ciftci", TEST_OYUNCU) },
  ];
  const ornekler: Ornek[] = [];
  const sermaye = new Map<string, Array<{ t: number; tutar: number }>>();
  const orneklem = (): void => {
    const d: Dunya = sim.dunya;
    const p = d.mulk!.para!;
    ornekler.push({
      t: d.zaman,
      hazine: new Map(d.oyuncular.map((o) => [o.id, anlikHazine(d, o.id)] as const)),
      musluk: Object.fromEntries(Object.entries(p.musluk).map(([k, s]) => [k, say(s as ParaSayaci)])),
      lavabo: Object.fromEntries(Object.entries(p.lavabo).map(([k, s]) => [k, say(s as ParaSayaci)])),
      kasaGiris: p.kasalar.reduce((a, k) => a + Object.values(k.giris).reduce((b, s) => b + say(s as ParaSayaci), 0), 0),
      kasaBakiye: p.kasalar.reduce((a, k) => a + kasaBakiyesi(k), 0),
      fiyatOrani: sim.ic.mallar.map((m, mi) => (d.pazar.fiyat[mi] as number) / m.tabanFiyat),
    });
  };
  for (let t = 0; t <= BITIS; t += 6 * SAAT) {
    sim.calistirKadar(t);
    if (t % GUN === 0) orneklem(); // komutlardan ÖNCE (çıkarma da gün sınırında komutlardan önce örnekler)
    if (t === 0) {
      katil(t, "ali");
      katil(t, "veli");
    }
    if (t === KATILMA) katil(t, TEST_OYUNCU);
    for (const b of botlar) {
      if (b.id === TEST_OYUNCU && t < KATILMA) continue;
      if (!sim.dunya.oyuncular.some((o) => o.id === b.id)) continue;
      for (const komut of b.bot.karar(sim)) {
        const once = anlikHazine(sim.dunya, b.id);
        if (kaydet(t, b.id, komut) && SERMAYE_KOMUTLARI.has(komut.tur)) {
          const l = sermaye.get(b.id) ?? [];
          l.push({ t, tutar: once - anlikHazine(sim.dunya, b.id) });
          sermaye.set(b.id, l);
        }
      }
    }
  }
  sim.calistirKadar(BITIS);
  return { gunluk, ornekler, sermaye, sim };
}

const OYUNCULAR = [{ id: TEST_OYUNCU, kod: "K1" }];
const f = ((): (() => ReturnType<typeof fikstur>) => {
  let onbellek: ReturnType<typeof fikstur> | null = null;
  return () => (onbellek ??= fikstur());
})();

describe("alfa-0 ekonomi izleme: günlük oynatma ekonomi bölümü", () => {
  it("seçenek kapalıyken çıktıda ekonomi alanı yoktur; açıkken çıktı oyuncu kimliği taşımaz ve bayt bayt deterministiktir", () => {
    const { gunluk } = f();
    const kapali = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS });
    expect("ekonomi" in kapali).toBe(false);
    const a = JSON.stringify(cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS, ekonomi: true }), null, 2);
    const b = JSON.stringify(cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS, ekonomi: true }), null, 2);
    expect(a).toBe(b);
    for (const yasak of [TEST_OYUNCU, "ayse", '"ali"', '"veli"']) expect(a).not.toContain(yasak);
    // Ekonomi açmak diğer alanları değiştirmez.
    const acik = JSON.parse(a) as { ekonomi: unknown; katilimcilar: unknown; test: unknown };
    expect(JSON.stringify(acik.katilimcilar)).toBe(JSON.stringify(kapali.katilimcilar));
    expect(JSON.stringify(acik.test)).toBe(JSON.stringify(kapali.test));
  });

  it("günlük örnekler gün sınırlarındadır (0..16 gün); oyuncu sayıları bot ve insan ayrı", () => {
    const { gunluk } = f();
    const e = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS, ekonomi: true }).ekonomi!;
    expect(e.gunluk.map((x) => x.tMs)).toEqual(Array.from({ length: 17 }, (_, i) => i * GUN));
    expect(e.gunluk[0]!.oyuncuSayisi).toEqual({ insan: 0, diger: 0 }); // t = 0, katılımlardan önce
    expect(e.gunluk.at(-1)!.oyuncuSayisi).toEqual({ insan: 1, diger: 2 });
  });

  it("E1 R ve E3 ZP8: 7 günlük sayaç farkları dünyadan bağımsız okunanla eşleşir; durum bandı eşik tablosundan", () => {
    const { gunluk, ornekler } = f();
    const e = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS, ekonomi: true }).ekonomi!;
    const son = ornekler.at(-1)!;
    const bas = ornekler.find((x) => x.t === son.t - 7 * GUN)!;
    const fark = (k: "musluk" | "lavabo", adlar: string[]): number => adlar.reduce((a, ad) => a + (son[k][ad] ?? 0) - (bas[k][ad] ?? 0), 0);
    const lavabo = fark("lavabo", ["isletme", "sebeke", "araziVergisi", "harcama", "arsa"]);
    const ihracat = fark("musluk", ["ihracatNpc"]) + fark("musluk", ["yerelNpc"]);
    const ithalat = fark("lavabo", ["ithalatNpc"]);
    const e1 = e.metrikler["E1"]!;
    expect(e1["lavaboMili"]).toBe(lavabo);
    expect(e1["ihracatMili"]).toBe(ihracat);
    expect(e1["ithalatMili"]).toBe(ithalat);
    expect(e1["R"]).toBe(ihracat - ithalat > 0 ? lavabo / (ihracat - ithalat) : null);
    expect(e1["Rkasa"]).toBe(ihracat - ithalat > 0 ? (lavabo + (son.kasaGiris - bas.kasaGiris)) / (ihracat - ithalat) : null);
    // Dünyada 3 oyuncu (< 5): durum verilmez
    expect(e1.durum).toBe("olculmedi");
    expect(e.metrikler["E3"]!["zp8"]).toBe(0); // yerelNpc yok (G7a öncesi)
    expect(e.metrikler["E3"]!.durum).toBe("olculmedi");
  });

  it("E2 r: hazine farkı + sermaye komutu tutarı (7 gün); gruplar ayrı; insan grubu tek oyuncu → durum ölçülmedi, değer yine yazılır", () => {
    const { gunluk, ornekler, sermaye } = f();
    const e = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS, ekonomi: true }).ekonomi!;
    const son = ornekler.at(-1)!;
    const bas = ornekler.find((x) => x.t === son.t - 7 * GUN)!;
    const r = (id: string): number | null => {
      const yat = (sermaye.get(id) ?? []).filter((x) => x.t > bas.t && x.t <= son.t).reduce((a, x) => a + x.tutar, 0);
      const net = (son.hazine.get(id) as number) - (bas.hazine.get(id) as number) + yat;
      return net > 0 ? yat / net : null;
    };
    const gruplar = e.metrikler["E2"]!["gruplar"] as Record<string, { durum: string; medyan: number | null; oyuncu: number }>;
    const beklenenInsan = r(TEST_OYUNCU);
    expect(gruplar["insan"]!.oyuncu).toBe(beklenenInsan === null ? 0 : 1);
    if (beklenenInsan !== null) expect(gruplar["insan"]!.medyan).toBeCloseTo(beklenenInsan, 5);
    expect(gruplar["insan"]!.durum).toBe("olculmedi");
    const digerler = ["ali", "veli"].map(r).filter((x): x is number => x !== null);
    expect(gruplar["diger"]!.oyuncu).toBe(digerler.length);
  });

  it("E8 fiyat sınırı: son örnekteki sınırda mallar bağımsız fiyat/taban oranından; E7 kasa birikimi 28 günlük pencere yoksa ölçülmedi", () => {
    const { gunluk, ornekler } = f();
    const e = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS, ekonomi: true }).ekonomi!;
    const son = ornekler.at(-1)!;
    const sim = f().sim;
    const alt = sim.ic.mallar.filter((_, i) => (son.fiyatOrani[i] as number) <= EKONOMI_ESIKLERI.fiyatSiniri.alt).map((m) => m.id);
    const ust = sim.ic.mallar.filter((_, i) => (son.fiyatOrani[i] as number) >= EKONOMI_ESIKLERI.fiyatSiniri.ust).map((m) => m.id);
    expect(e.metrikler["E8"]!["alt"]).toEqual(alt);
    expect(e.metrikler["E8"]!["ust"]).toEqual(ust);
    expect(e.metrikler["E8"]!["sinirdaMalSayisi"]).toBe(alt.length + ust.length);
    expect(e.metrikler["E7"]!.durum).toBe("olculmedi"); // 16 gün < 28
  });

  it("E10 ödül ortalaması, E9 aşınma (oyuncu yaşı 14. gün), E5/E4/E6 ölçülemeyenler nedeniyle", () => {
    const { gunluk, ornekler } = f();
    const e = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS, ekonomi: true }).ekonomi!;
    const son = ornekler.at(-1)!;
    const odul = son.musluk["odul"] ?? 0;
    expect(e.metrikler["E10"]!["toplamOdulMili"]).toBe(odul);
    expect(e.metrikler["E10"]!["oyuncuBasiOdulTl"]).toBe(odul / 3 / MILI);
    const e9 = (e.metrikler["E9"]!["gruplar"] as Record<string, { gun14: { oyuncu: number }; gun45: { oyuncu: number } }>)["diger"]!;
    expect(e9.gun14.oyuncu).toBeGreaterThanOrEqual(1); // tesisi olan yerleşikler 14. günde örneklenir (16 gün gözlem); tesisi olmayan oyuncu aşınma örneği vermez
    expect(e9.gun14.oyuncu).toBeLessThanOrEqual(2);
    expect(e9.gun45.oyuncu).toBe(0);
    expect(e.metrikler["E5"]!.durum).toBe("olculmedi");
    const e4 = (e.metrikler["E4"]!["gruplar"] as Record<string, { durum: string; kuran: number }>)["diger"]!;
    expect(e4.kuran).toBe(0); // dükkân çekirdekte henüz yok
    const e6 = (e.metrikler["E6"]!["gruplar"] as Record<string, { durum: string; fabrikaKuran: number }>)["diger"]!;
    expect(e6.fabrikaKuran).toBe(0); // botlar gıda fabrikası kurmaz (G6 önayarı öncesi)
    expect(e6.durum).toBe("olculmedi");
  });
});

describe("alfa-0: O2-1 sermaye komutları ve O2-2 dükkân kuruluşu", () => {
  it("SERMAYE_KOMUTLARI ölçek yükseltme ve kenar geliştirmeyi içerir", () => {
    for (const k of ["parsel_al", "yapi_yerlestir", "tesis_insa_hucre", "tesis_olcek_yukselt", "kenar_gelistir"]) expect(SERMAYE_KOMUTLARI.has(k), k).toBe(true);
    expect(SERMAYE_KOMUTLARI.has("genel_onarim")).toBe(false); // bakım yatırım değildir (A2 §2)
  });

  it("dukkanKurulusuOku: ek yapının DukkanDurumu.kurulus alanını okur (en erken); alan ya da dükkân yoksa null", () => {
    const d = {
      mulk: { isletmeler: [{ oyuncu: "a", bolgeIndeksi: 0 }, { oyuncu: "a", bolgeIndeksi: 1 }, { oyuncu: "b", bolgeIndeksi: 2 }] },
      bolgeler: [{ ekYapilar: [{ tur: "ambar" }, { tur: "dukkan", dukkan: { baslangic: 5, kurulus: 70 } }] }, { ekYapilar: [{ tur: "dukkan", dukkan: { baslangic: 3, kurulus: 40 } }] }, { ekYapilar: [{ tur: "ambar" }] }],
    } as unknown as Dunya;
    expect(dukkanKurulusuOku(d, "a")).toBe(40);
    expect(dukkanKurulusuOku(d, "b")).toBeNull();
    expect(dukkanKurulusuOku({ bolgeler: [] } as unknown as Dunya, "a")).toBeNull();
  });

  it("çıktıda dukkan (kuruluş) ve dukkanKomutu alanları vardır; dükkân çekirdekte yokken ikisi de null", () => {
    const { gunluk } = f();
    const c = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: BITIS });
    expect(c.katilimcilar[0]!.dukkan).toBeNull();
    expect(c.katilimcilar[0]!.dukkanKomutu).toBeNull();
  });
});
